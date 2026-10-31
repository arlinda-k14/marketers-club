const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { getAdmin, verifyToken } = require('../middleware/auth');
const { isDev, persistUser, persistMarketer } = require('../lib/devSeed');
const { claimSeededProfile, DEMO_UID } = require('../lib/memberIdentity');
const { cleanProfile, publicProfile, cleanListing, listingFromProfile, publicListing, SPECIALTIES } = require('../../shared/memberRules');

const MEMBER_IMG_DIRS = ['public', 'dist'].map(d => path.join(__dirname, '..', '..', d, 'assets', 'images', 'members'));

// Signed-in members get their own profile. In dev, a request with no token gets the demo member.
function memberAuth(req, res, next) {
  if (req.headers.authorization) {
    return verifyToken(req, res, () => claimSeededProfile(req).catch(() => {}).then(() => next()));
  }
  if (isDev()) {
    req.user = { uid: DEMO_UID, demo: true };
    return next();
  }
  return res.status(401).json({ error: 'unauthorized' });
}

router.use(memberAuth);

async function findBy(query) {
  try {
    const snap = await query.get();
    const out = [];
    snap.forEach(doc => {
      const data = doc.data ? doc.data() : doc;
      out.push({ id: doc.id || data.id, _ref: doc.ref, ...data });
    });
    return out;
  } catch (e) {
    return [];
  }
}

function dedupe(items) {
  const seen = new Set();
  return items.filter(i => !seen.has(i.id) && seen.add(i.id));
}

const time = v => (v ? new Date(v.toDate ? v.toDate() : v).getTime() || 0 : 0);

async function loadContent(db, uid) {
  const [articles, hosted, submitted, startedById, startedByUid, replies] = await Promise.all([
    findBy(db.collection('articles').where('authorId', '==', uid)),
    findBy(db.collection('events').where('speakerId', '==', uid)),
    findBy(db.collection('events').where('submittedBy', '==', uid)),
    findBy(db.collection('discussions').where('authorId', '==', uid)),
    findBy(db.collection('discussions').where('authorUid', '==', uid)),
    findBy(db.collectionGroup('comments').where('authorUid', '==', uid))
  ]);

  // Replies need the title of the thread they were posted in.
  const threadIds = [...new Set(replies.map(r => r.discussionId || (r._ref && r._ref.parent.parent.id)).filter(Boolean))];
  const threads = await Promise.all(threadIds.map(id => db.collection('discussions').doc(id).get().catch(() => null)));
  const titles = {};
  threads.forEach((d, i) => { if (d && d.exists) titles[threadIds[i]] = d.data().title; });

  return {
    articles: articles
      .filter(a => a.status === 'published')
      .sort((a, b) => time(b.publishedAt) - time(a.publishedAt))
      .map(a => ({ id: a.id, title: a.title, excerpt: a.excerpt, coverImage: a.coverImage, category: a.category, readTime: a.readTime, publishedAt: a.publishedAt })),
    events: dedupe([...hosted, ...submitted])
      .sort((a, b) => time(b.date) - time(a.date))
      .map(e => ({ id: e.id, title: e.title, description: e.description, posterImage: e.posterImage, eventType: e.eventType, city: e.city, date: e.date, time: e.time, timezone: e.timezone, capacity: e.capacity, status: e.status })),
    discussions: dedupe([...startedById, ...startedByUid])
      .sort((a, b) => time(b.createdAt) - time(a.createdAt))
      .map(d => ({ id: d.id, title: d.title, content: d.content, tags: d.tags || [], commentCount: d.commentCount || 0, createdAt: d.createdAt })),
    replies: replies
      .sort((a, b) => time(b.createdAt) - time(a.createdAt))
      .map(r => {
        const discussionId = r.discussionId || (r._ref && r._ref.parent.parent.id);
        return { id: r.id, content: r.content, createdAt: r.createdAt, discussionId, discussionTitle: titles[discussionId] || 'a discussion' };
      })
  };
}

/* ---------- Hire Marketers listing ---------- */

async function syncListing(db, uid) {
  const ref = db.collection('marketer_profiles').doc(uid);
  const [listing, user] = await Promise.all([ref.get(), db.collection('users').doc(uid).get()]);
  if (!listing.exists || !user.exists) return;
  const fields = { ...listingFromProfile(user.data()), lastActivityAt: new Date().toISOString() };
  await ref.set(fields, { merge: true });
  persistMarketer(uid, fields);
}

router.get('/me/listing', async (req, res) => {
  try {
    const doc = await getAdmin().firestore().collection('marketer_profiles').doc(req.user.uid).get();
    res.json({ listing: doc.exists ? publicListing(doc.data()) : null, specialties: SPECIALTIES });
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
});

router.put('/me/listing', async (req, res) => {
  try {
    const { data, errors } = cleanListing(req.body || {});
    if (errors) return res.status(400).json({ error: 'invalid', fields: errors });
    const db = getAdmin().firestore();
    const user = await db.collection('users').doc(req.user.uid).get();
    if (!user.exists) return res.status(404).json({ error: 'profile_required' });
    const ref = db.collection('marketer_profiles').doc(req.user.uid);
    const existing = await ref.get();
    const now = new Date().toISOString();
    // New listings wait for an admin. Edits to an approved listing stay live; a rejected
    // listing goes back into review when it is changed.
    const prev = existing.exists ? existing.data() : null;
    const status = prev && (prev.status || 'approved') === 'approved' ? 'approved' : 'pending';
    const fields = {
      ...data, ...listingFromProfile(user.data()),
      id: req.user.uid, memberUid: req.user.uid, source: 'member', status,
      verified: prev ? !!prev.verified : false,
      lastActivityAt: now,
      ...(status === 'pending' ? { submittedAt: now } : {}),
      ...(prev ? {} : { createdAt: now })
    };
    await ref.set(fields, { merge: true });
    persistMarketer(req.user.uid, fields);
    res.json({ listing: publicListing(fields) });
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
});

router.delete('/me/listing', async (req, res) => {
  try {
    await getAdmin().firestore().collection('marketer_profiles').doc(req.user.uid).delete();
    persistMarketer(req.user.uid, null);
    res.json({ listing: null });
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
});

router.get('/me', async (req, res) => {
  try {
    const db = getAdmin().firestore();
    const doc = await db.collection('users').doc(req.user.uid).get();
    if (!doc.exists) return res.json({ profile: null, demo: !!req.user.demo });
    const content = await loadContent(db, req.user.uid);
    res.json({ profile: publicProfile(req.user.uid, doc.data()), content, demo: !!req.user.demo });
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
});

router.put('/me', async (req, res) => {
  try {
    const { data, errors } = cleanProfile(req.body || {});
    if (errors) return res.status(400).json({ error: 'invalid', fields: errors });
    const db = getAdmin().firestore();
    const ref = db.collection('users').doc(req.user.uid);
    await ref.set({ ...data, updatedAt: new Date().toISOString() }, { merge: true });
    persistUser(req.user.uid, data);
    await syncListing(db, req.user.uid);
    const doc = await ref.get();
    res.json({ profile: publicProfile(req.user.uid, doc.data()) });
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
});

const IMAGE_TYPES = {
  jpeg: { ext: 'jpg', magic: [0xff, 0xd8, 0xff] },
  png: { ext: 'png', magic: [0x89, 0x50, 0x4e, 0x47] },
  webp: { ext: 'webp', magic: [0x52, 0x49, 0x46, 0x46] }
};

// Avatar upload as a data URL (the browser resizes it first). Stored as a file under
// /assets/images/members in dev; production would need Firebase Storage instead.
router.post('/me/avatar', async (req, res) => {
  try {
    if (!isDev()) return res.status(501).json({ error: 'avatar_upload_not_configured' });
    const m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec((req.body && req.body.dataUrl) || '');
    if (!m) return res.status(400).json({ error: 'invalid_image' });
    const type = IMAGE_TYPES[m[1]];
    const buf = Buffer.from(m[2], 'base64');
    if (buf.length > 2 * 1024 * 1024) return res.status(413).json({ error: 'image_too_large' });
    if (!type.magic.every((b, i) => buf[i] === b)) return res.status(400).json({ error: 'invalid_image' });

    const safeUid = String(req.user.uid).toLowerCase().replace(/[^a-z0-9_-]/g, '-').slice(0, 64);
    const fileName = `${safeUid}-${Date.now()}.${type.ext}`;
    for (const dir of MEMBER_IMG_DIRS) {
      fs.mkdirSync(dir, { recursive: true });
      // Replace this member's previous upload rather than piling files up.
      for (const f of fs.readdirSync(dir)) if (f.startsWith(safeUid + '-')) fs.unlinkSync(path.join(dir, f));
      fs.writeFileSync(path.join(dir, fileName), buf);
    }
    const avatar = `/assets/images/members/${fileName}`;
    const db = getAdmin().firestore();
    await db.collection('users').doc(req.user.uid).set({ avatar }, { merge: true });
    persistUser(req.user.uid, { avatar });
    await syncListing(db, req.user.uid);
    res.json({ avatar });
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
});

module.exports = router;
