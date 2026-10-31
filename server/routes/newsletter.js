const express = require('express');
const router = express.Router();
const { getAdmin } = require('../middleware/auth');
const { attachMarketers, AUTHOR } = require('../lib/marketerLinks');

function isAdmin(req) {
  return req.user && req.user.role === 'admin';
}

router.get('/issues', async (req, res) => {
  try {
    const db = getAdmin().firestore();
    const { tag } = req.query;
    let query = db.collection('newsletter_issues');
    if (tag) {
      query = query.where('tags', 'array-contains', tag);
    }
    const snap = await query.get();
    let issues = [];
    snap.forEach(doc => issues.push({ id: doc.id, ...doc.data() }));
    if (tag) issues = issues.filter(n => Array.isArray(n.tags) && n.tags.includes(tag));
    issues = issues.sort((a, b) => new Date(b.publishedAt || b.sentAt) - new Date(a.publishedAt || a.sentAt));
    issues = await attachMarketers(db, issues, AUTHOR);
    res.json({ issues });
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
});

router.post('/subscribe', async (req, res) => {
  try {
    const db = getAdmin().firestore();
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'email_required' });
    await db.collection('newsletter_subsribers').doc(email).set({ email, subscribedAt: getAdmin().firestore.FieldValue.serverTimestamp() }, { merge: true });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
});

router.post('/issues', async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ error: 'forbidden' });
    const db = getAdmin().firestore();
    const issue = {
      ...req.body,
      publishedAt: getAdmin().firestore.FieldValue.serverTimestamp()
    };
    const ref = await db.collection('newsletter_issues').add(issue);
    res.json({ ok: true, id: ref.id });
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
});

module.exports = router;
