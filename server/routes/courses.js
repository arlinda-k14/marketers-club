const express = require('express');
const router = express.Router();
const { getAdmin } = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const db = getAdmin().firestore();
    const snap = await db.collection('courses').get();
    const items = [];
    snap.forEach(d => items.push({ id: d.id, ...d.data() }));
    res.json({ items });
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
});

module.exports = router;
