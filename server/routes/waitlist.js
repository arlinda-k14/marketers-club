const express = require('express');
const router = express.Router();
const { getAdmin } = require('../middleware/auth');

router.post('/:courseId', async (req, res) => {
  try {
    const db = getAdmin().firestore();
    const { email } = req.body;
    const ref = db.collection('courseWaitlist').doc(req.params.courseId);
    await ref.set({
      courseId: req.params.courseId,
      uids: getAdmin().firestore.FieldValue.arrayUnion(req.user.uid),
      emails: getAdmin().firestore.FieldValue.arrayUnion(email || req.user.email)
    }, { merge: true });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
});

module.exports = router;
