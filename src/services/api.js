// One data layer for every page.
//
// On localhost the pages talk to the Express server in server/ (with its seed-backed dev store).
// On the live site there is no server: each /api route below runs in the browser against
// Firestore, and firestore.rules decides what each user may read or write.
//
// Every call returns { ok, status, data } with the same shapes the Express routes return, so
// pages do not care which backend answered. Force a backend with ?backend=firestore or
// ?backend=server (remembered for the browser tab).
import { initFirebase } from './firebase.js';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import {
  collection, collectionGroup, doc, getDoc, getDocs, query, where,
  setDoc, updateDoc, addDoc, deleteDoc, arrayUnion, increment, serverTimestamp
} from 'firebase/firestore';
import memberRules from '../../shared/memberRules.js';

const { cleanProfile, publicProfile, cleanListing, listingFromProfile, publicListing, calcCompletionScore, SPECIALTIES, str } = memberRules;

const { db } = initFirebase();
const auth = getAuth();

/* ---------- backend choice ---------- */

function useServer() {
  let pref = null;
  try {
    const fromUrl = new URLSearchParams(location.search).get('backend');
    if (fromUrl) sessionStorage.setItem('mc-backend', fromUrl);
    pref = sessionStorage.getItem('mc-backend');
  } catch (e) {}
  if (pref === 'firestore') return false;
  if (pref === 'server') return true;
  return ['localhost', '127.0.0.1'].includes(location.hostname);
}
export const usingServer = useServer();

// Resolves with the signed-in user (or null) once Firebase has restored the session.
let authReady;
export function whenAuthReady() {
  if (!authReady) {
    authReady = new Promise(resolve => {
      let done = false;
      const finish = user => { if (!done) { done = true; resolve(user); } };
      onAuthStateChanged(auth, finish);
      setTimeout(() => finish(auth.currentUser), 3000);
    });
  }
  return authReady;
}

export async function api(path, { method = 'GET', body } = {}) {
  return usingServer ? viaServer(path, method, body) : viaFirestore(path, method, body);
}

async function viaServer(path, method, body) {
  const user = auth.currentUser;
  const headers = { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) };
  if (user) headers.Authorization = 'Bearer ' + await user.getIdToken();
  try {
    const res = await fetch(path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    return { ok: false, status: 0, data: { error: 'network_error' } };
  }
}

/* ---------- Firestore routes (live site) ---------- */

const reply = (status, data) => ({ ok: status >= 200 && status < 300, status, data });
const nowIso = () => new Date().toISOString();
const time = v => (v ? new Date(v.toDate ? v.toDate() : v).getTime() || 0 : 0);
const rows = snap => snap.docs.map(d => ({ id: d.id, ...d.data() }));
const dedupe = items => { const seen = new Set(); return items.filter(i => !seen.has(i.id) && seen.add(i.id)); };

class HttpError extends Error {
  constructor(status, data) { super(data.error); this.status = status; this.data = data; }
}
const fail = (status, error, extra = {}) => { throw new HttpError(status, { error, ...extra }); };

function signedIn(ctx) {
  if (!ctx.user) fail(401, 'unauthorized');
  return ctx.user;
}

async function isAdmin(ctx) {
  if (!ctx.user) return false;
  if (ctx.admin === undefined) {
    try { ctx.admin = (await getDoc(doc(db, 'admins', ctx.user.uid))).exists(); } catch (e) { ctx.admin = false; }
  }
  return ctx.admin;
}
async function requireAdmin(ctx) {
  signedIn(ctx);
  if (!(await isAdmin(ctx))) fail(403, 'forbidden');
}

// Same idea as server/lib/marketerLinks.js: content stores a marketer id plus a fallback
// name and photo; the current listing wins when there is one.
let listedCache;
function listedMarketers() {
  if (!listedCache) {
    listedCache = getDocs(query(collection(db, 'marketer_profiles'), where('status', '==', 'approved')))
      .then(rows).catch(() => []);
  }
  return listedCache;
}
const AUTHOR = { id: 'authorId', name: 'author', avatar: 'authorAvatar' };
const SPEAKER = { id: 'speakerId', name: 'speaker', alsoName: ['hostName'], avatar: 'speakerAvatar' };
async function attachMarketers(items, fields) {
  const list = await listedMarketers();
  const byId = new Map(list.map(m => [m.id, m]));
  const byName = new Map(list.filter(m => m.fullName).map(m => [m.fullName.trim().toLowerCase(), m]));
  const nameKeys = [fields.name, ...(fields.alsoName || [])];
  return items.map(item => {
    let m = item[fields.id] && byId.get(item[fields.id]);
    if (!m) {
      const name = nameKeys.map(k => item[k]).find(Boolean);
      m = name && byName.get(String(name).trim().toLowerCase());
    }
    if (!m) return item;
    const out = { ...item, [fields.id]: m.id, [fields.avatar]: m.avatar || item[fields.avatar] || '' };
    for (const k of nameKeys) out[k] = m.fullName;
    return out;
  });
}

async function userDoc(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
}

const ROUTES = [];
const route = (method, pattern, handler) => {
  const keys = [];
  const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$');
  ROUTES.push({ method, re, keys, handler });
};

async function viaFirestore(path, method, body) {
  const url = new URL(path, location.origin);
  const match = ROUTES.map(r => ({ r, m: r.method === method && r.re.exec(url.pathname) })).find(x => x.m);
  if (!match) return reply(404, { error: 'not_found' });
  const params = {};
  match.r.keys.forEach((k, i) => { params[k] = decodeURIComponent(match.m[i + 1]); });
  const ctx = { params, query: Object.fromEntries(url.searchParams), body: body || {}, user: await whenAuthReady() };
  try {
    return reply(200, await match.r.handler(ctx));
  } catch (e) {
    if (e instanceof HttpError) return reply(e.status, e.data);
    if (e && e.code === 'permission-denied') return reply(ctx.user ? 403 : 401, { error: 'forbidden' });
    if (e && e.code === 'unauthenticated') return reply(401, { error: 'unauthorized' });
    console.error(path, e);
    return reply(500, { error: 'server_error' });
  }
}

/* Articles */

route('GET', '/api/articles', async ({ query: q }) => {
  let articles = rows(await getDocs(query(collection(db, 'articles'), where('status', '==', 'published'))));
  if (q.tag) articles = articles.filter(a => Array.isArray(a.tags) && a.tags.includes(q.tag));
  articles.sort((a, b) => time(b.publishedAt) - time(a.publishedAt));
  return { articles: await attachMarketers(articles, AUTHOR) };
});

route('POST', '/api/articles', async ctx => {
  await requireAdmin(ctx);
  const b = ctx.body;
  const me = (await userDoc(ctx.user.uid)) || {};
  const ref = await addDoc(collection(db, 'articles'), {
    title: str(b.title, 200), excerpt: str(b.excerpt, 500), content: str(b.content, 50000),
    category: str(b.category, 80), readTime: str(b.readTime, 40), coverImage: str(b.coverImage, 1000),
    tags: (Array.isArray(b.tags) ? b.tags : []).map(t => str(t, 40)).filter(Boolean).slice(0, 10),
    authorId: ctx.user.uid, author: me.fullName || '', authorAvatar: me.avatar || '',
    status: 'published', publishedAt: nowIso()
  });
  return { ok: true, id: ref.id };
});

/* Events */

route('GET', '/api/events', async ({ query: q }) => {
  let events = rows(await getDocs(query(collection(db, 'events'), where('status', '==', 'approved'))));
  const now = new Date();
  const when = e => (e.date ? new Date(e.date + 'T' + (e.time || '00:00')) : now);
  if (q.tab === 'past') events = events.filter(e => when(e) < now).sort((a, b) => new Date(b.date) - new Date(a.date));
  else if (q.tab === 'upcoming') events = events.filter(e => when(e) >= now).sort((a, b) => new Date(a.date) - new Date(b.date));
  else events.sort((a, b) => new Date(a.date) - new Date(b.date));
  return { events: await attachMarketers(events, SPEAKER) };
});

const EVENT_FIELDS = ['title', 'hostName', 'date', 'time', 'timezone', 'meetingLink', 'venueLocation', 'description', 'city', 'eventType'];
route('POST', '/api/events/submit', async ctx => {
  const user = signedIn(ctx);
  const event = { status: 'pending', submittedBy: user.uid, createdAt: nowIso() };
  for (const k of EVENT_FIELDS) if (ctx.body[k] !== undefined) event[k] = str(ctx.body[k], k === 'description' ? 3000 : 300);
  event.categoryTags = (Array.isArray(ctx.body.categoryTags) ? ctx.body.categoryTags : []).map(t => str(t, 40)).filter(Boolean).slice(0, 10);
  if (ctx.body.capacity) event.capacity = Math.max(0, Math.min(100000, Number(ctx.body.capacity) || 0));
  const ref = await addDoc(collection(db, 'events'), event);
  return { ok: true, id: ref.id, status: 'pending' };
});

route('GET', '/api/events/admin/pending', async ctx => {
  await requireAdmin(ctx);
  const events = rows(await getDocs(query(collection(db, 'events'), where('status', '==', 'pending'))));
  return { events: await attachMarketers(events, SPEAKER) };
});

for (const action of ['approve', 'reject']) {
  route('POST', `/api/events/:id/${action}`, async ctx => {
    await requireAdmin(ctx);
    await updateDoc(doc(db, 'events', ctx.params.id), { status: action === 'approve' ? 'approved' : 'rejected', approvedBy: ctx.user.uid });
    return { ok: true };
  });
}

/* Newsletter */

route('GET', '/api/newsletter/issues', async ({ query: q }) => {
  let issues = rows(await getDocs(collection(db, 'newsletter_issues')));
  if (q.tag) issues = issues.filter(n => Array.isArray(n.tags) && n.tags.includes(q.tag));
  issues.sort((a, b) => time(b.publishedAt || b.sentAt) - time(a.publishedAt || a.sentAt));
  return { issues: await attachMarketers(issues, AUTHOR) };
});

route('POST', '/api/newsletter/subscribe', async ({ body }) => {
  const email = str(body.email, 200).toLowerCase();
  if (!/^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/.test(email)) fail(400, 'email_required');
  try {
    await setDoc(doc(db, 'newsletter_subsribers', email), { email, subscribedAt: nowIso() });
  } catch (e) {
    // Rules allow create only; an existing subscription is not an error for the visitor.
    if (e.code !== 'permission-denied') throw e;
  }
  return { ok: true };
});

// Door 2: the contact form drops the message into customer_messages (create
// only, see firestore.rules). The CCO's Triage Agent picks it up with
// `npm run triage` in ~/.hubsy, writes the verdict onto the customer record and
// chooses the reply draft shown in the admin Contact triage panel.
route('POST', '/api/contact', async ({ body }) => {
  const email = str(body.email, 200).toLowerCase();
  const message = str(body.message, 4000);
  if (!/^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/.test(email)) fail(400, 'email_required');
  if (!message) fail(400, 'message_required');
  const entry = { source: 'contact_form', email, message, receivedAt: serverTimestamp() };
  const name = str(body.name, 120);
  const businessName = str(body.businessName, 160);
  if (name) entry.name = name;
  if (businessName) entry.businessName = businessName;
  await addDoc(collection(db, 'customer_messages'), entry);
  return { ok: true };
});

// Contact triage panel (admin dashboard): what triage decided for each message
// and the reply it chose. Replies are drafts until an admin approves them; the
// CMO's Email Writer sends approved ones (~/.hubsy/.agent/email-writer).
const SENDABLE_REPLIES = ['billing-note', 'thank-you'];

route('GET', '/api/contact/admin/triage', async ctx => {
  await requireAdmin(ctx);
  const snap = await getDocs(query(collection(db, 'customer_messages'), where('source', '==', 'contact_form')));
  const items = rows(snap)
    .map(m => ({ ...m, receivedAt: m.receivedAt && m.receivedAt.toDate ? m.receivedAt.toDate().toISOString() : m.receivedAt }))
    .sort((a, b) => String(b.receivedAt || '').localeCompare(String(a.receivedAt || ''))).slice(0, 100);
  return { items };
});

route('POST', '/api/contact/admin/triage/:id/:action', async ctx => {
  await requireAdmin(ctx);
  const ref = doc(db, 'customer_messages', ctx.params.id);
  const snap = await getDoc(ref);
  if (!snap.exists()) fail(404, 'not_found');
  const reply = snap.data().reply || {};
  const action = ctx.params.action;
  if (action === 'approve') {
    if (reply.status !== 'draft' || !SENDABLE_REPLIES.includes(reply.type)) fail(409, 'not_approvable');
    await updateDoc(ref, { 'reply.status': 'approved', 'reply.approvedAt': nowIso(), 'reply.approvedBy': ctx.user.uid });
  } else if (action === 'skip') {
    if (!['draft', 'approved'].includes(reply.status)) fail(409, 'not_skippable');
    await updateDoc(ref, { 'reply.status': 'skipped' });
  } else if (action === 'wrong' || action === 'right') {
    await updateDoc(ref, { review: { verdict: action, by: ctx.user.uid, at: nowIso() } });
  } else {
    fail(400, 'unknown_action');
  }
  return { ok: true };
});

route('POST', '/api/newsletter/issues', async ctx => {
  await requireAdmin(ctx);
  const b = ctx.body;
  const ref = await addDoc(collection(db, 'newsletter_issues'), {
    title: str(b.title, 200), preview: str(b.preview, 1000), coverImage: str(b.coverImage, 1000),
    issueNumber: Number(b.issueNumber) || null,
    tips: (Array.isArray(b.tips) ? b.tips : []).map(t => str(t, 500)).filter(Boolean).slice(0, 20),
    tags: (Array.isArray(b.tags) ? b.tags : []).map(t => str(t, 40)).filter(Boolean).slice(0, 10),
    publishedAt: nowIso()
  });
  return { ok: true, id: ref.id };
});

/* Hire Marketers */

const listingSort = (a, b) => {
  if (b.verified !== a.verified) return (b.verified ? 1 : 0) - (a.verified ? 1 : 0);
  if (b.completionScore !== a.completionScore) return b.completionScore - a.completionScore;
  return time(b.lastActivityAt) - time(a.lastActivityAt);
};

route('GET', '/api/marketers', async ({ query: q }) => {
  let profiles = (await listedMarketers()).map(p => ({ ...p, completionScore: p.completionScore || calcCompletionScore(p) }));
  if (q.specialty) profiles = profiles.filter(p => Array.isArray(p.specialties) && p.specialties.includes(q.specialty));
  return { profiles: profiles.sort(listingSort) };
});

async function loadFeatured(marketerId) {
  const [articles, events] = await Promise.all([
    getDocs(query(collection(db, 'articles'), where('authorId', '==', marketerId), where('status', '==', 'published'))).then(rows),
    getDocs(query(collection(db, 'events'), where('speakerId', '==', marketerId), where('status', '==', 'approved'))).then(rows)
  ]);
  return {
    articles: articles.sort((a, b) => time(b.publishedAt) - time(a.publishedAt))
      .map(a => ({ id: a.id, title: a.title, excerpt: a.excerpt, coverImage: a.coverImage, category: a.category, readTime: a.readTime })),
    events: events.sort((a, b) => time(b.date) - time(a.date))
      .map(e => ({ id: e.id, title: e.title, posterImage: e.posterImage, eventType: e.eventType, city: e.city, date: e.date, time: e.time, timezone: e.timezone }))
  };
}

route('GET', '/api/marketers/:id', async ctx => {
  let snap;
  try { snap = await getDoc(doc(db, 'marketer_profiles', ctx.params.id)); } catch (e) { fail(404, 'not_found'); }
  if (!snap.exists() || (snap.data().status && snap.data().status !== 'approved')) fail(404, 'not_found');
  const profile = { id: snap.id, ...snap.data() };
  profile.completionScore = profile.completionScore || calcCompletionScore(profile);
  // Contact emails are only readable by signed-in members (marketer_private).
  if (ctx.user) {
    try {
      const priv = await getDoc(doc(db, 'marketer_private', ctx.params.id));
      if (priv.exists()) profile.email = priv.data().email || '';
    } catch (e) {}
  }
  profile.featured = await loadFeatured(ctx.params.id);
  return { profile };
});

route('GET', '/api/marketers/admin/pending', async ctx => {
  await requireAdmin(ctx);
  const listings = rows(await getDocs(query(collection(db, 'marketer_profiles'), where('status', '==', 'pending'))))
    .map(p => ({ id: p.id, fullName: p.fullName, role: p.role, specialties: p.specialties || [], avatar: p.avatar || '', submittedAt: p.submittedAt || '' }));
  return { listings };
});

for (const action of ['approve', 'reject']) {
  route('POST', `/api/marketers/:id/${action}`, async ctx => {
    await requireAdmin(ctx);
    const ref = doc(db, 'marketer_profiles', ctx.params.id);
    const snap = await getDoc(ref);
    if (!snap.exists() || snap.data().status !== 'pending') fail(404, 'not_found');
    const status = action === 'approve' ? 'approved' : 'rejected';
    await updateDoc(ref, { status, reviewedBy: ctx.user.uid, reviewedAt: nowIso() });
    return { ok: true, status };
  });
}

route('POST', '/api/marketers/:id/inquiry', async ctx => {
  const user = signedIn(ctx);
  const ref = await addDoc(collection(db, 'contact_inquiries'), {
    marketerId: ctx.params.id, fromUid: user.uid, fromEmail: user.email || '',
    message: str(ctx.body.message, 5000), createdAt: nowIso()
  });
  return { ok: true, id: ref.id };
});

/* Forum */

route('GET', '/api/forum/discussions', async ctx => {
  signedIn(ctx);
  const items = rows(await getDocs(collection(db, 'discussions'))).sort((a, b) => time(b.createdAt) - time(a.createdAt));
  return { items: await attachMarketers(items, AUTHOR) };
});

route('POST', '/api/forum/discussions', async ctx => {
  const user = signedIn(ctx);
  if (!user.emailVerified) fail(403, 'email_not_verified');
  const me = (await userDoc(user.uid)) || {};
  const ref = await addDoc(collection(db, 'discussions'), {
    authorUid: user.uid, authorId: user.uid, author: me.fullName || user.displayName || '', authorAvatar: me.avatar || '',
    title: str(ctx.body.title, 200), content: str(ctx.body.content, 5000),
    tags: (Array.isArray(ctx.body.tags) ? ctx.body.tags : []).map(t => str(t, 40)).filter(Boolean).slice(0, 5),
    commentCount: 0, createdAt: nowIso()
  });
  return { id: ref.id };
});

route('GET', '/api/forum/discussions/:id/comments', async ctx => {
  signedIn(ctx);
  const items = rows(await getDocs(collection(db, 'discussions', ctx.params.id, 'comments')))
    .sort((a, b) => time(a.createdAt) - time(b.createdAt));
  return { items };
});

route('POST', '/api/forum/discussions/:id/comments', async ctx => {
  const user = signedIn(ctx);
  if (!user.emailVerified) fail(403, 'email_not_verified');
  const me = (await userDoc(user.uid)) || {};
  const ref = await addDoc(collection(db, 'discussions', ctx.params.id, 'comments'), {
    discussionId: ctx.params.id, authorUid: user.uid, authorId: user.uid, author: me.fullName || '',
    content: str(ctx.body.content, 5000), createdAt: nowIso()
  });
  await updateDoc(doc(db, 'discussions', ctx.params.id), { commentCount: increment(1) });
  return { id: ref.id };
});

/* Members-only libraries */

route('GET', '/api/mentors', async ctx => {
  signedIn(ctx);
  return { items: rows(await getDocs(collection(db, 'mentors'))) };
});

route('GET', '/api/resources', async ctx => {
  signedIn(ctx);
  return { items: rows(await getDocs(collection(db, 'resources'))) };
});

route('POST', '/api/resources/:id/download', async ctx => {
  const user = signedIn(ctx);
  const snap = await getDoc(doc(db, 'resources', ctx.params.id));
  if (!snap.exists()) fail(404, 'not_found');
  const resource = snap.data();
  const me = (await userDoc(user.uid)) || {};
  if (resource.tier === 'pro' && me.membershipTier !== 'pro') {
    fail(403, 'pro_required', { message: 'Pro templates stay locked. Please contact administrators.' });
  }
  return { fileUrl: resource.fileUrl };
});

route('GET', '/api/certificates', async ctx => {
  const user = signedIn(ctx);
  const items = rows(await getDocs(query(collection(db, 'certificates'), where('uid', '==', user.uid))));
  const me = (await userDoc(user.uid)) || {};
  return { items, displayName: me.displayName || me.fullName };
});

/* Users */

route('GET', '/api/users/me', async ctx => {
  const user = signedIn(ctx);
  return { profile: await userDoc(user.uid) };
});

route('POST', '/api/users/onboarding', async ctx => {
  const user = signedIn(ctx);
  const b = ctx.body;
  const fields = {};
  for (const k of ['fullName', 'email', 'currentRole', 'yearsExperience', 'primaryGoal', 'targetSkill', 'portfolioUrl', 'referralSource']) {
    if (b[k] !== undefined) fields[k] = str(String(b[k]), 300);
  }
  fields.displayName = fields.fullName || '';
  const ref = doc(db, 'users', user.uid);
  if ((await getDoc(ref)).exists()) {
    await setDoc(ref, fields, { merge: true });
  } else {
    await setDoc(ref, { ...fields, uid: user.uid, role: 'member', membershipTier: 'free', savedArticles: [], savedEvents: [], createdAt: nowIso() });
  }
  return { ok: true };
});

route('POST', '/api/users/save', async ctx => {
  const user = signedIn(ctx);
  const { type, id } = ctx.body;
  if (type !== 'articles' && type !== 'events') fail(400, 'invalid_type');
  await setDoc(doc(db, 'users', user.uid), { [type === 'articles' ? 'savedArticles' : 'savedEvents']: arrayUnion(str(id, 100)) }, { merge: true });
  return { ok: true };
});

route('GET', '/api/users/saved', async ctx => {
  const user = signedIn(ctx);
  const me = (await userDoc(user.uid)) || {};
  return { savedArticles: me.savedArticles || [], savedEvents: me.savedEvents || [] };
});

/* Member profile */

async function profileContent(uid) {
  const safe = p => p.catch(() => []);
  const [articles, hosted, submitted, startedById, startedByUid, replies] = await Promise.all([
    safe(getDocs(query(collection(db, 'articles'), where('authorId', '==', uid))).then(rows)),
    safe(getDocs(query(collection(db, 'events'), where('speakerId', '==', uid), where('status', '==', 'approved'))).then(rows)),
    safe(getDocs(query(collection(db, 'events'), where('submittedBy', '==', uid))).then(rows)),
    safe(getDocs(query(collection(db, 'discussions'), where('authorId', '==', uid))).then(rows)),
    safe(getDocs(query(collection(db, 'discussions'), where('authorUid', '==', uid))).then(rows)),
    safe(getDocs(query(collectionGroup(db, 'comments'), where('authorUid', '==', uid)))
      .then(s => s.docs.map(d => ({ id: d.id, ...d.data(), discussionId: d.data().discussionId || d.ref.parent.parent.id }))))
  ]);
  const threadIds = [...new Set(replies.map(r => r.discussionId).filter(Boolean))];
  const titles = {};
  await Promise.all(threadIds.map(async id => {
    try { const d = await getDoc(doc(db, 'discussions', id)); if (d.exists()) titles[id] = d.data().title; } catch (e) {}
  }));
  return {
    articles: articles.filter(a => a.status === 'published').sort((a, b) => time(b.publishedAt) - time(a.publishedAt))
      .map(a => ({ id: a.id, title: a.title, excerpt: a.excerpt, coverImage: a.coverImage, category: a.category, readTime: a.readTime, publishedAt: a.publishedAt })),
    events: dedupe([...hosted, ...submitted]).sort((a, b) => time(b.date) - time(a.date))
      .map(e => ({ id: e.id, title: e.title, description: e.description, posterImage: e.posterImage, eventType: e.eventType, city: e.city, date: e.date, time: e.time, timezone: e.timezone, capacity: e.capacity, status: e.status })),
    discussions: dedupe([...startedById, ...startedByUid]).sort((a, b) => time(b.createdAt) - time(a.createdAt))
      .map(d => ({ id: d.id, title: d.title, content: d.content, tags: d.tags || [], commentCount: d.commentCount || 0, createdAt: d.createdAt })),
    replies: replies.sort((a, b) => time(b.createdAt) - time(a.createdAt))
      .map(r => ({ id: r.id, content: r.content, createdAt: r.createdAt, discussionId: r.discussionId, discussionTitle: titles[r.discussionId] || 'a discussion' }))
  };
}

// Keep the directory listing's name, photo, bio and links in step with the profile.
async function syncListing(uid) {
  const ref = doc(db, 'marketer_profiles', uid);
  let listing;
  try { listing = await getDoc(ref); } catch (e) { return; }
  if (!listing.exists()) return;
  const me = await userDoc(uid);
  if (me) await updateDoc(ref, { ...listingFromProfile(me), lastActivityAt: nowIso() });
}

route('GET', '/api/profile/me', async ctx => {
  const user = signedIn(ctx);
  const me = await userDoc(user.uid);
  if (!me) return { profile: null, demo: false };
  return { profile: publicProfile(user.uid, me), content: await profileContent(user.uid), demo: false };
});

route('PUT', '/api/profile/me', async ctx => {
  const user = signedIn(ctx);
  const { data, errors } = cleanProfile(ctx.body || {});
  if (errors) fail(400, 'invalid', { fields: errors });
  await setDoc(doc(db, 'users', user.uid), { ...data, updatedAt: nowIso() }, { merge: true });
  await syncListing(user.uid);
  return { profile: publicProfile(user.uid, await userDoc(user.uid)) };
});

// No file storage on the free plan: the browser already square-crops and shrinks the photo,
// so it is stored on the profile as a small data URL (firestore.rules caps the size).
const MAX_AVATAR_CHARS = 400000;
route('POST', '/api/profile/me/avatar', async ctx => {
  const user = signedIn(ctx);
  const dataUrl = (ctx.body && ctx.body.dataUrl) || '';
  if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(dataUrl)) fail(400, 'invalid_image');
  if (dataUrl.length > MAX_AVATAR_CHARS) fail(413, 'image_too_large');
  await setDoc(doc(db, 'users', user.uid), { avatar: dataUrl }, { merge: true });
  await syncListing(user.uid);
  return { avatar: dataUrl };
});

async function readListing(uid) {
  let snap;
  try { snap = await getDoc(doc(db, 'marketer_profiles', uid)); } catch (e) { return null; }
  if (!snap.exists()) return null;
  const listing = snap.data();
  try {
    const priv = await getDoc(doc(db, 'marketer_private', uid));
    if (priv.exists()) listing.email = priv.data().email || '';
  } catch (e) {}
  return listing;
}

route('GET', '/api/profile/me/listing', async ctx => {
  const user = signedIn(ctx);
  return { listing: publicListing(await readListing(user.uid)), specialties: SPECIALTIES };
});

route('PUT', '/api/profile/me/listing', async ctx => {
  const user = signedIn(ctx);
  const { data, errors } = cleanListing(ctx.body || {});
  if (errors) fail(400, 'invalid', { fields: errors });
  const me = await userDoc(user.uid);
  if (!me) fail(404, 'profile_required');
  const prev = await readListing(user.uid);
  const now = nowIso();
  // Same review flow as the server: new listings wait for an admin, approved listings stay
  // live when edited, and a rejected listing goes back into review when changed.
  const status = prev && (prev.status || 'approved') === 'approved' ? 'approved' : 'pending';
  const { email, ...publicFields } = data;
  const fields = {
    ...publicFields, ...listingFromProfile(me),
    id: user.uid, memberUid: user.uid, source: 'member', status,
    verified: prev ? !!prev.verified : false,
    lastActivityAt: now,
    ...(status === 'pending' ? { submittedAt: now } : {}),
    ...(prev ? {} : { createdAt: now })
  };
  await setDoc(doc(db, 'marketer_profiles', user.uid), fields, { merge: true });
  await setDoc(doc(db, 'marketer_private', user.uid), { email });
  listedCache = null;
  return { listing: publicListing({ ...fields, email }) };
});

route('DELETE', '/api/profile/me/listing', async ctx => {
  const user = signedIn(ctx);
  await deleteDoc(doc(db, 'marketer_profiles', user.uid));
  await deleteDoc(doc(db, 'marketer_private', user.uid)).catch(() => {});
  listedCache = null;
  return { listing: null };
});

/* AI Growth Tools need a server to keep the OpenAI key secret. */

route('POST', '/api/tools/jobs', async () => fail(503, 'tools_unavailable'));
