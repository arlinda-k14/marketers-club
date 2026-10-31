const express = require('express');
const router = express.Router();
const { getAdmin } = require('../middleware/auth');

router.get('/:courseId', async (req, res) => {
  try {
    const db = getAdmin().firestore();
    const doc = await db.collection('users').doc(req.user.uid).collection('enrollments').doc(req.params.courseId).get();
    res.json({ enrollment: doc.exists ? doc.data() : { completedLessonIds: [], percent: 0 } });
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
});

router.post('/:courseId/complete-lesson', async (req, res) => {
  try {
    const db = getAdmin().firestore();
    const { lessonId, totalLessons } = req.body;
    const ref = db.collection('users').doc(req.user.uid).collection('enrollments').doc(req.params.courseId);
    const doc = await ref.get();
    const data = doc.exists ? doc.data() : { completedLessonIds: [], percent: 0 };
    const completed = Array.isArray(data.completedLessonIds) ? data.completedLessonIds : [];
    if (!completed.includes(lessonId)) {
      completed.push(lessonId);
    }
    const total = typeof totalLessons === 'number' && totalLessons > 0 ? totalLessons : 1;
    const percent = Math.min(100, Math.round((completed.length / total) * 100));
    await ref.set({ completedLessonIds: completed, percent }, { merge: true });
    res.json({ completedLessonIds: completed, percent });
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
});

module.exports = router;
