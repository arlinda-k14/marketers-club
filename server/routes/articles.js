const express = require('express');
const router = express.Router();
const { getAdmin } = require('../middleware/auth');
const { attachMarketers, AUTHOR } = require('../lib/marketerLinks');

function isAdminOrContributor(req) {
  return req.user && (req.user.role === 'admin');
}

router.get('/', async (req, res) => {
  try {
    const db = getAdmin().firestore();
    const { tag } = req.query;
    let query = db.collection('articles').where('status', '==', 'published');
    if (tag) {
      query = query.where('tags', 'array-contains', tag);
    }
    const snap = await query.get();
    let articles = [];
    snap.forEach(doc => articles.push({ id: doc.id, ...doc.data() }));
    if (tag) articles = articles.filter(a => Array.isArray(a.tags) && a.tags.includes(tag));
    articles = articles
      .filter(a => a.status === 'published')
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    articles = await attachMarketers(db, articles, AUTHOR);
    res.json({ articles });
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const db = getAdmin().firestore();
    const doc = await db.collection('articles').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'not_found' });
    const [article] = await attachMarketers(db, [{ id: doc.id, ...doc.data() }], AUTHOR);
    res.json({ article });
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
});

router.post('/', async (req, res) => {
  try {
    if (!isAdminOrContributor(req)) return res.status(403).json({ error: 'forbidden' });
    const db = getAdmin().firestore();
    const article = {
      ...req.body,
      authorId: req.user.uid,
      authorRole: req.user.role,
      status: 'published',
      publishedAt: getAdmin().firestore.FieldValue.serverTimestamp()
    };
    const ref = await db.collection('articles').add(article);
    res.json({ ok: true, id: ref.id });
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
});

module.exports = router;
