const express = require('express');
const router = express.Router();
const { getAdmin } = require('../middleware/auth');
const { attachMarketers, AUTHOR } = require('../lib/marketerLinks');

router.get('/discussions', async (req, res) => {
  try {
    const db = getAdmin().firestore();
    const snap = await db.collection('discussions').orderBy('createdAt', 'desc').get();
    let items = [];
    snap.forEach(d => items.push({ id: d.id, ...d.data() }));
    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    items = await attachMarketers(db, items, AUTHOR);
    res.json({ items });
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
});

router.post('/discussions', async (req, res) => {
  try {
    if (!req.user.email_verified) {
      return res.status(403).json({ error: 'email_not_verified' });
    }
    const db = getAdmin().firestore();
    const { title, content, tags } = req.body;
    const ref = db.collection('discussions').doc();
    await ref.set({
      id: ref.id,
      authorUid: req.user.uid,
      // Members with a marketer profile keyed by uid get its name/photo on read.
      authorId: req.user.uid,
      author: req.user.name || '',
      title,
      content,
      tags: tags || [],
      commentCount: 0,
      createdAt: getAdmin().firestore.FieldValue.serverTimestamp()
    });
    res.json({ id: ref.id });
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
});

router.get('/discussions/:id/comments', async (req, res) => {
  try {
    const db = getAdmin().firestore();
    const snap = await db.collection('discussions').doc(req.params.id).collection('comments').orderBy('createdAt', 'asc').get();
    const items = [];
    snap.forEach(d => items.push({ id: d.id, ...d.data() }));
    res.json({ items });
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
});

router.post('/discussions/:id/comments', async (req, res) => {
  try {
    if (!req.user.email_verified) {
      return res.status(403).json({ error: 'email_not_verified' });
    }
    const db = getAdmin().firestore();
    const { content } = req.body;
    const discRef = db.collection('discussions').doc(req.params.id);
    const commRef = discRef.collection('comments').doc();
    await commRef.set({
      id: commRef.id,
      discussionId: req.params.id,
      authorUid: req.user.uid,
      authorId: req.user.uid,
      content,
      createdAt: getAdmin().firestore.FieldValue.serverTimestamp()
    });
    await discRef.update({ commentCount: getAdmin().firestore.FieldValue.increment(1) });
    res.json({ id: commRef.id });
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
});

module.exports = router;
