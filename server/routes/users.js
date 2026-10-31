const express = require('express');
const router = express.Router();
const { getAdmin } = require('../middleware/auth');

router.get('/me', async (req, res) => {
  try {
    const db = getAdmin().firestore();
    const doc = await db.collection('users').doc(req.user.uid).get();
    res.json({ profile: doc.exists ? doc.data() : null });
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
});

router.post('/onboarding', async (req, res) => {
  try {
    const db = getAdmin().firestore();
    const { fullName, email, currentRole, yearsExperience, primaryGoal, targetSkill, portfolioUrl, referralSource } = req.body;
    const data = {
      fullName, email, currentRole, yearsExperience, primaryGoal, targetSkill, portfolioUrl, referralSource,
      uid: req.user.uid,
      displayName: fullName,
      role: 'member',
      membershipTier: 'free',
      savedArticles: [],
      savedEvents: [],
      createdAt: getAdmin().firestore.FieldValue.serverTimestamp()
    };
    await db.collection('users').doc(req.user.uid).set(data, { merge: true });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
});

router.post('/save', async (req, res) => {
  try {
    const db = getAdmin().firestore();
    const { type, id } = req.body; // type: articles or events
    if (type !== 'articles' && type !== 'events') return res.status(400).json({ error: 'invalid_type' });
    const field = type === 'articles' ? 'savedArticles' : 'savedEvents';
    await db.collection('users').doc(req.user.uid).set({
      [field]: getAdmin().firestore.FieldValue.arrayUnion(id)
    }, { merge: true });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
});

router.get('/saved', async (req, res) => {
  try {
    const db = getAdmin().firestore();
    const doc = await db.collection('users').doc(req.user.uid).get();
    const data = doc.exists ? doc.data() : {};
    res.json({ savedArticles: data.savedArticles || [], savedEvents: data.savedEvents || [] });
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
});

module.exports = router;
