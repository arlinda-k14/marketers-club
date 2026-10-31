const express = require('express');
const router = express.Router();
const { getAdmin, verifyToken } = require('../middleware/auth');
const { attachMarketers, SPEAKER } = require('../lib/marketerLinks');

function isAdmin(req) {
  return req.user && req.user.role === 'admin';
}

router.get('/', async (req, res) => {
  try {
    const db = getAdmin().firestore();
    const { tab } = req.query;
    const now = new Date();
    let snap;
    try {
      snap = await db.collection('events').where('status', '==', 'approved').get();
    } catch (e) {
      snap = await db.collection('events').get();
    }
    let events = [];
    if (snap && snap.forEach) {
      snap.forEach(doc => {
        const data = doc.data ? doc.data() : doc;
        events.push({ id: doc.id || data.id, ...data });
      });
    }
    events = events.filter(e => e.status === 'approved');
    if (tab === 'past') {
      events = events.filter(e => {
        const d = e.date ? new Date(e.date + 'T' + (e.time || '00:00')) : now;
        return d < now;
      }).sort((a,b) => new Date(b.date) - new Date(a.date));
    } else if (tab === 'upcoming') {
      events = events.filter(e => {
        const d = e.date ? new Date(e.date + 'T' + (e.time || '00:00')) : now;
        return d >= now;
      }).sort((a,b) => new Date(a.date) - new Date(b.date));
    } else {
      events = events.sort((a,b) => new Date(a.date) - new Date(b.date));
    }
    events = await attachMarketers(db, events, SPEAKER);
    res.json({ events });
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
});

router.post('/submit', verifyToken, async (req, res) => {
  try {
    const db = getAdmin().firestore();
    const data = req.body;
    const event = {
      ...data,
      status: 'pending',
      submittedBy: req.user.uid,
      createdAt: getAdmin().firestore.FieldValue.serverTimestamp()
    };
    const ref = await db.collection('events').add(event);
    res.json({ ok: true, id: ref.id, status: 'pending' });
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
});

router.post('/:id/approve', verifyToken, async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ error: 'forbidden' });
    const db = getAdmin().firestore();
    await db.collection('events').doc(req.params.id).update({ status: 'approved', approvedBy: req.user.uid });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
});

router.post('/:id/reject', verifyToken, async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ error: 'forbidden' });
    const db = getAdmin().firestore();
    await db.collection('events').doc(req.params.id).update({ status: 'rejected', approvedBy: req.user.uid });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
});

router.get('/admin/pending', verifyToken, async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ error: 'forbidden' });
    const db = getAdmin().firestore();
    const snap = await db.collection('events').where('status', '==', 'pending').get();
    let events = [];
    snap.forEach(doc => events.push({ id: doc.id, ...doc.data() }));
    events = await attachMarketers(db, events, SPEAKER);
    res.json({ events });
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
});

module.exports = router;
