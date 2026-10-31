import { initFirebase } from '../services/firebase.js';
import '../services/sessionNav.js';
import { api, whenAuthReady } from '../services/api.js';
import { esc } from '../services/marketerFormat.js';
import '../styles/main.css';

initFirebase();

const empty = text => `<p style="color:var(--text-muted);">${text}</p>`;
const row = (title, sub, kind, id) => `
  <div style="display:flex;flex-direction:column;gap:.6rem;padding:.8rem 0;border-bottom:1px solid var(--line);">
    <div><strong>${esc(title)}</strong>${sub ? ' · ' + esc(sub) : ''}</div>
    <div style="display:flex;gap:.6rem;">
      <button class="btn btn-sm" data-kind="${kind}" data-action="approve" data-id="${esc(id)}">Approve</button>
      <button class="btn ghost btn-sm" data-kind="${kind}" data-action="reject" data-id="${esc(id)}">Reject</button>
    </div>
  </div>`;

const get = path => api(path);

async function loadEvents() {
  const el = document.getElementById('pending-events');
  const { ok, status, data } = await get('/api/events/admin/pending');
  if (!ok) { el.innerHTML = empty(status === 403 ? 'Admins only.' : 'Could not load pending events.'); return; }
  el.innerHTML = (data.events || []).map(e => row(e.title, e.hostName, 'events', e.id)).join('') || empty('No pending events');
}

async function loadListings() {
  const el = document.getElementById('pending-listings');
  const { ok, status, data } = await get('/api/marketers/admin/pending');
  if (!ok) { el.innerHTML = empty(status === 403 ? 'Admins only.' : 'Could not load pending listings.'); return; }
  el.innerHTML = (data.listings || []).map(l => row(l.fullName, [l.role, (l.specialties || []).join(', ')].filter(Boolean).join(' · '), 'marketers', l.id)).join('')
    || empty('No pending listings');
}

/* Contact triage: one row per contact-form message. */
const KIND = { new_business: 'New business', support: 'Support', billing: 'Billing / money', partnership_press: 'Partnership / press', spam: 'Spam', unclear: 'Unclear' };
const OWNER = { cso: 'CSO', cco: 'CCO', cmo: 'CMO', arlinda: 'You' };
const REPLY = {
  cso: 'CSO writes the reply (delivery pipeline)',
  cco: "CCO's Support Agent drafts the answer",
  'billing-note': 'Short note: you will come back to them yourself',
  'thank-you': 'Plain thank-you',
  none: 'No reply (spam)'
};
const STATUS = { draft: 'Draft, waiting for your approval', approved: 'Approved, waiting to be sent', sent: 'Sent', skipped: 'Not sending', waiting: 'With the owning agent', none: '' };
const when = v => (v ? new Date(v).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');
const btn = (id, action, label, ghost) =>
  `<button class="btn btn-sm${ghost ? ' ghost' : ''}" data-kind="contact" data-action="${action}" data-id="${esc(id)}">${label}</button>`;

function triageRow(m) {
  const t = m.triage;
  const r = m.reply;
  const verdict = !t
    ? '<em>Waiting for triage</em>'
    : `<strong>${esc(KIND[t.category] || t.category)}</strong> · urgency ${esc(t.urgency)} · owner ${esc(OWNER[t.owner] || 'nobody')}`
      + (t.status === 'failed' ? ' · <strong>triage failed</strong>' : '')
      + `<br><span style="color:var(--text-muted);">${t.want ? 'Wants: ' + esc(t.want) : 'Could not tell what they want' + (t.unclearReason ? ': ' + esc(t.unclearReason) : '')}</span>`
      + (t.urgencyReason ? `<br><span style="color:var(--text-muted);">Why: ${esc(t.urgencyReason)}</span>` : '');
  const reply = !r ? '' : `<div style="margin-top:.4rem;"><strong>Reply:</strong> ${esc(REPLY[r.type] || r.type)}${STATUS[r.status] ? ' · ' + esc(STATUS[r.status]) : ''}${r.note ? `<br><span style="color:var(--text-muted);">${esc(r.note)}</span>` : ''}${r.error ? `<br><span style="color:#B42318;">Send failed: ${esc(r.error)}</span>` : ''}</div>`
    + (r.body ? `<pre style="white-space:pre-wrap;font:inherit;background:rgba(0,0,0,.03);padding:.6rem .8rem;border-radius:var(--r-sm);margin:.4rem 0 0;">${esc(r.body)}</pre>` : '');
  const actions = [];
  if (r && r.status === 'draft' && r.body) actions.push(btn(m.id, 'approve', 'Approve reply'));
  if (r && ['draft', 'approved'].includes(r.status)) actions.push(btn(m.id, 'skip', "Don't send", true));
  if (t) {
    if (m.review && m.review.verdict === 'wrong') actions.push('<span style="color:#B42318;align-self:center;">Marked: triage was wrong</span>', btn(m.id, 'right', 'Undo', true));
    else if (m.review && m.review.verdict === 'right') actions.push('<span style="color:var(--text-muted);align-self:center;">Marked: triage was right</span>', btn(m.id, 'wrong', 'Triage was wrong', true));
    else actions.push(btn(m.id, 'right', 'Triage was right', true), btn(m.id, 'wrong', 'Triage was wrong', true));
  }
  return `<div style="display:flex;flex-direction:column;gap:.4rem;padding:1rem 0;border-bottom:1px solid var(--line);">
    <div><strong>${esc(m.name || m.email)}</strong>${m.name ? ' · ' + esc(m.email) : ''}${m.businessName ? ' · ' + esc(m.businessName) : ''} <span style="color:var(--text-muted);">· ${esc(when(m.receivedAt))}</span></div>
    <blockquote style="margin:0;padding-left:.8rem;border-left:3px solid var(--line-strong);">${esc(m.message)}</blockquote>
    <div>${verdict}</div>${reply}
    ${actions.length ? `<div style="display:flex;flex-wrap:wrap;gap:.6rem;margin-top:.3rem;">${actions.join('')}</div>` : ''}
  </div>`;
}

async function loadContactTriage() {
  const el = document.getElementById('contact-triage');
  const { ok, status, data } = await get('/api/contact/admin/triage');
  if (!ok) { el.innerHTML = empty(status === 403 ? 'Admins only.' : 'Could not load contact messages.'); return; }
  el.innerHTML = (data.items || []).map(triageRow).join('') || empty('No contact messages yet');
}

document.addEventListener('click', async e => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  btn.disabled = true;
  if (btn.dataset.kind === 'contact') {
    await api(`/api/contact/admin/triage/${encodeURIComponent(btn.dataset.id)}/${btn.dataset.action}`, { method: 'POST', body: {} });
    loadContactTriage();
    return;
  }
  await api(`/api/${btn.dataset.kind}/${encodeURIComponent(btn.dataset.id)}/${btn.dataset.action}`, { method: 'POST', body: {} });
  btn.dataset.kind === 'events' ? loadEvents() : loadListings();
});

whenAuthReady().then(user => {
  if (!user) { window.location.href = '/sign-in.html?returnTo=/admin-dashboard.html'; return; }
  loadEvents().catch(() => {});
  loadListings().catch(() => {});
  loadContactTriage().catch(() => {});
});
