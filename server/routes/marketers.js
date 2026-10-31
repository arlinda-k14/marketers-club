const express = require('express');
const router = express.Router();
const { getAdmin, verifyToken } = require('../middleware/auth');
const { persistMarketer } = require('../lib/devSeed');
const { calcCompletionScore } = require('../../shared/memberRules');

// Seeded marketers have no status; member listings start as 'pending' until an admin approves.
const isListed = p => !p.status || p.status === 'approved';
const isAdmin = req => req.user && req.user.role === 'admin';

async function findBy(db, collection, field, value) {
  try {
    const snap = await db.collection(collection).where(field, '==', value).get();
    const out = [];
    snap.forEach(doc => {
      const data = doc.data ? doc.data() : doc;
      out.push({ id: doc.id || data.id, ...data });
    });
    return out;
  } catch (e) {
    return [];
  }
}

// Featured work is derived on read from the articles a marketer wrote and the events they
// host, so a new article, a new event or a changed cover shows up without editing the profile.
async function loadFeatured(db, marketerId) {
  const [articles, events] = await Promise.all([
    findBy(db, 'articles', 'authorId', marketerId),
    findBy(db, 'events', 'speakerId', marketerId)
  ]);
  const time = v => (v ? new Date(v).getTime() || 0 : 0);
  return {
    articles: articles
      .filter(a => a.status === 'published')
      .sort((a, b) => time(b.publishedAt) - time(a.publishedAt))
      .map(a => ({ id: a.id, title: a.title, excerpt: a.excerpt, coverImage: a.coverImage, category: a.category, readTime: a.readTime })),
    events: events
      .filter(e => e.status === 'approved')
      .sort((a, b) => time(b.date) - time(a.date))
      .map(e => ({ id: e.id, title: e.title, posterImage: e.posterImage, eventType: e.eventType, city: e.city, date: e.date, time: e.time, timezone: e.timezone }))
  };
}

router.get('/', async (req, res) => {
  try {
    const db = getAdmin().firestore();
    const { specialty } = req.query;
    let snap;
    try {
      let query = db.collection('marketer_profiles');
      if (specialty) {
        query = query.where('specialties', 'array-contains', specialty);
      }
      snap = await query.get();
    } catch (e) {
      snap = await db.collection('marketer_profiles').get();
    }
    let profiles = [];
    if (snap && snap.forEach) {
      snap.forEach(doc => {
        const data = doc.data ? doc.data() : doc;
        if (!isListed(data)) return;
        const { email, ...listing } = data;
        profiles.push({ id: doc.id || data.id, ...listing, completionScore: data.completionScore || calcCompletionScore(data) });
      });
    }
    if (specialty) {
      profiles = profiles.filter(p => Array.isArray(p.specialties) && p.specialties.includes(specialty));
    }
    profiles.sort((a, b) => {
      if (b.verified !== a.verified) return (b.verified ? 1 : 0) - (a.verified ? 1 : 0);
      if (b.completionScore !== a.completionScore) return b.completionScore - a.completionScore;
      const ta = a.lastActivityAt?.toDate ? a.lastActivityAt.toDate().getTime() : (a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0);
      const tb = b.lastActivityAt?.toDate ? b.lastActivityAt.toDate().getTime() : (b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0);
      return tb - ta;
    });
    res.json({ profiles });
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const db = getAdmin().firestore();
    const doc = await db.collection('marketer_profiles').doc(req.params.id).get();
    if (!doc.exists || !isListed(doc.data())) return res.status(404).json({ error: 'not_found' });
    const profile = { id: doc.id, ...doc.data() };
    // Contact emails are for signed-in members only.
    if (!req.headers.authorization) delete profile.email;
    profile.featured = await loadFeatured(db, profile.id);
    res.json({ profile });
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
});

// Admin review of member listings for the Hire Marketers directory.
router.get('/admin/pending', verifyToken, async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ error: 'forbidden' });
    const db = getAdmin().firestore();
    const listings = (await findBy(db, 'marketer_profiles', 'status', 'pending'))
      .map(p => ({ id: p.id, fullName: p.fullName, role: p.role, specialties: p.specialties || [], avatar: p.avatar || '', submittedAt: p.submittedAt || '' }));
    res.json({ listings });
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
});

async function review(req, res, status) {
  try {
    if (!isAdmin(req)) return res.status(403).json({ error: 'forbidden' });
    const db = getAdmin().firestore();
    const ref = db.collection('marketer_profiles').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists || doc.data().status !== 'pending') return res.status(404).json({ error: 'not_found' });
    const fields = { status, reviewedBy: req.user.uid, reviewedAt: new Date().toISOString() };
    await ref.set(fields, { merge: true });
    persistMarketer(req.params.id, fields);
    res.json({ ok: true, status });
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
}
router.post('/:id/approve', verifyToken, (req, res) => review(req, res, 'approved'));
router.post('/:id/reject', verifyToken, (req, res) => review(req, res, 'rejected'));

router.post('/:id/inquiry', verifyToken, async (req, res) => {
  try {
    const db = getAdmin().firestore();
    const { message } = req.body;
    const inquiry = {
      marketerId: req.params.id,
      fromUid: req.user.uid,
      fromEmail: req.user.email,
      message: message || '',
      createdAt: getAdmin().firestore.FieldValue.serverTimestamp()
    };
    const ref = await db.collection('contact_inquiries').add(inquiry);
    // Email alert placeholder (no real sending per requirements)
    console.log(`[EMAIL ALERT] Inquiry to ${req.params.id} from ${req.user.email}: ${message}`);
    res.json({ ok: true, id: ref.id });
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
});

module.exports = router;
