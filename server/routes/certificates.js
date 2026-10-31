const express = require('express');
const router = express.Router();
const { getAdmin } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

function generateCertId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

router.get('/', async (req, res) => {
  try {
    const db = getAdmin().firestore();
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    const profile = userDoc.exists ? userDoc.data() : {};
    const snap = await db.collection('certificates').where('uid', '==', req.user.uid).get();
    const items = [];
    snap.forEach(d => items.push({ id: d.id, ...d.data() }));
    res.json({ items, displayName: profile.displayName || profile.fullName });
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
});

router.post('/issue', async (req, res) => {
  try {
    const db = getAdmin().firestore();
    const { courseId, courseTitle, instructorName } = req.body;
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    const profile = userDoc.exists ? userDoc.data() : {};
    let certificateId;
    let exists = true;
    while (exists) {
      certificateId = generateCertId();
      const check = await db.collection('certificates').doc(certificateId).get();
      exists = check.exists;
    }
    await db.collection('certificates').doc(certificateId).set({
      certificateId,
      uid: req.user.uid,
      memberDisplayName: profile.displayName || profile.fullName || '',
      courseTitle,
      courseId,
      completionTimestamp: getAdmin().firestore.FieldValue.serverTimestamp(),
      instructorName: instructorName || 'Marketers Club'
    });
    res.json({ certificateId });
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
});

module.exports = router;
