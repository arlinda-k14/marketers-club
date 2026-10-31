require('dotenv').config();
const express = require('express');
const router = express.Router();
const { getAdmin } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const FREE_TOOL_RUNS_PER_MONTH = parseInt(process.env.FREE_TOOL_RUNS_PER_MONTH || '', 10);
if (isNaN(FREE_TOOL_RUNS_PER_MONTH)) {
  console.error('FREE_TOOL_RUNS_PER_MONTH must be set');
  process.exit(1);
}

router.post('/jobs', async (req, res) => {
  try {
    const db = getAdmin().firestore();
    const { type, input } = req.body;
    const userRef = db.collection('users').doc(req.user.uid);
    const userDoc = await userRef.get();
    const profile = userDoc.exists ? userDoc.data() : {};
    const now = new Date();
    const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth()+1).padStart(2,'0')}`;
    
    let toolUsage = profile.toolUsage || {};
    if (toolUsage.monthKey !== monthKey) {
      toolUsage = { monthKey, count: 0 };
    }
    
    if (profile.membershipTier !== 'pro') {
      if ((toolUsage.count || 0) >= FREE_TOOL_RUNS_PER_MONTH) {
        return res.status(403).json({ error: 'limit_reached' });
      }
    }
    
    const jobId = uuidv4();
    await db.collection('jobs').doc(jobId).set({
      jobId,
      type,
      input,
      status: 'pending',
      ownerUid: req.user.uid,
      createdAt: getAdmin().firestore.FieldValue.serverTimestamp(),
      updatedAt: getAdmin().firestore.FieldValue.serverTimestamp()
    });
    
    toolUsage.count = (toolUsage.count || 0) + 1;
    await userRef.set({ toolUsage }, { merge: true });
    
    setTimeout(async () => {
      try {
        const { generateOutput } = require('../workers/toolsWorker');
        const result = await generateOutput(type, input);
        await db.collection('jobs').doc(jobId).update({
          status: 'completed',
          result,
          updatedAt: getAdmin().firestore.FieldValue.serverTimestamp()
        });
      } catch (err) {
        await db.collection('jobs').doc(jobId).update({
          status: 'failed',
          error: err.message,
          updatedAt: getAdmin().firestore.FieldValue.serverTimestamp()
        });
      }
    }, 100);
    
    res.json({ jobId });
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
});

router.get('/jobs/:id', async (req, res) => {
  try {
    const db = getAdmin().firestore();
    const doc = await db.collection('jobs').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'not_found' });
    const data = doc.data();
    if (data.ownerUid !== req.user.uid) return res.status(403).json({ error: 'forbidden' });
    res.json({ job: data });
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
});

module.exports = router;
