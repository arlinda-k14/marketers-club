const express = require('express');
const router = express.Router();
const { getAdmin, verifyToken } = require('../middleware/auth');
const { str } = require('../../shared/memberRules');

// Door 2 for local dev. The live site posts to the Marketers Club Netlify function
// instead (src/services/api.js), which also runs triage; here the message is only stored.
router.post('/', async (req, res) => {
  try {
    const body = req.body || {};
    const email = str(body.email, 200).toLowerCase();
    const message = str(body.message, 4000);
    if (!/^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/.test(email)) return res.status(400).json({ error: 'email_required' });
    if (!message) return res.status(400).json({ error: 'message_required' });
    const entry = { source: 'contact_form', email, message, receivedAt: new Date().toISOString() };
    const name = str(body.name, 120);
    const businessName = str(body.businessName, 160);
    if (name) entry.name = name;
    if (businessName) entry.businessName = businessName;
    await getAdmin().firestore().collection('customer_messages').add(entry);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
});

// Contact triage panel, same shapes as the Firestore routes in src/services/api.js.
const SENDABLE_REPLIES = ['billing-note', 'thank-you'];
const isAdmin = req => req.user && req.user.role === 'admin';

router.get('/admin/triage', verifyToken, async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ error: 'forbidden' });
    const snap = await getAdmin().firestore().collection('customer_messages').where('source', '==', 'contact_form').get();
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => String(b.receivedAt || '').localeCompare(String(a.receivedAt || ''))).slice(0, 100);
    res.json({ items });
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
});

router.post('/admin/triage/:id/:action', verifyToken, async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ error: 'forbidden' });
    const ref = getAdmin().firestore().collection('customer_messages').doc(req.params.id);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'not_found' });
    const reply = snap.data().reply || {};
    const now = new Date().toISOString();
    const { action } = req.params;
    if (action === 'approve') {
      if (reply.status !== 'draft' || !SENDABLE_REPLIES.includes(reply.type)) return res.status(409).json({ error: 'not_approvable' });
      await ref.update({ 'reply.status': 'approved', 'reply.approvedAt': now, 'reply.approvedBy': req.user.uid });
    } else if (action === 'skip') {
      if (!['draft', 'approved'].includes(reply.status)) return res.status(409).json({ error: 'not_skippable' });
      await ref.update({ 'reply.status': 'skipped' });
    } else if (action === 'wrong' || action === 'right') {
      await ref.update({ review: { verdict: action, by: req.user.uid, at: now } });
    } else {
      return res.status(400).json({ error: 'unknown_action' });
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
});

module.exports = router;
