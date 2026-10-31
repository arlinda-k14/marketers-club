const express = require('express');
const router = express.Router();
const { getAdmin } = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const db = getAdmin().firestore();
    const snap = await db.collection('resources').get();
    const items = [];
    snap.forEach(d => items.push({ id: d.id, ...d.data() }));
    res.json({ items });
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
});

router.post('/:id/download', async (req, res) => {
  try {
    const db = getAdmin().firestore();
    const [userDoc, resDoc] = await Promise.all([
      db.collection('users').doc(req.user.uid).get(),
      db.collection('resources').doc(req.params.id).get()
    ]);
    if (!resDoc.exists) return res.status(404).json({ error: 'not_found' });
    const resource = resDoc.data();
    const profile = userDoc.exists ? userDoc.data() : {};
    if (resource.tier === 'pro' && profile.membershipTier !== 'pro') {
      return res.status(403).json({ error: 'pro_required', message: 'Pro templates stay locked. Please contact administrators.' });
    }
    await resDoc.ref.update({ downloadCount: getAdmin().firestore.FieldValue.increment(1) });
    res.json({ fileUrl: resource.fileUrl });
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
});

module.exports = router;
