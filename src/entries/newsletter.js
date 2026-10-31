import { initFirebase } from '../services/firebase.js';
import '../services/sessionNav.js';
import { api } from '../services/api.js';
import '../styles/main.css';

initFirebase();

function getParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

function fmtDate(v) {
  if (!v) return '';
  const d = new Date(v);
  if (isNaN(d)) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function syncActiveTag(tag) {
  document.querySelectorAll('#newsletter-tags [data-tag]').forEach(el => {
    el.classList.toggle('active', (el.dataset.tag || '') === tag);
  });
}

async function load() {
  const tag = getParam('tag') || '';
  syncActiveTag(tag);
  try {
    const { data } = await api('/api/newsletter/issues' + (tag ? '?tag=' + encodeURIComponent(tag) : ''));
    const list = document.getElementById('newsletter-list');
    if (!list) return;
    list.innerHTML = (data.issues||[]).map(n => `
      <article class="card media-card">
        ${n.coverImage ? `<div class="media-cover media-cover-wide"><img src="${n.coverImage}" alt="${n.title||'Newsletter issue'}" loading="lazy"></div>` : ''}
        <div class="media-body">
          <div class="meta-row">
            <span class="pill">Issue #${n.issueNumber}</span>
            <span class="meta-muted">Sent ${fmtDate(n.sentAt || n.publishedAt)}</span>
          </div>
          <h3 class="media-title">${n.title || 'Quick Tips'}</h3>
          ${n.author ? `<div class="byline">${n.authorAvatar ? `<img class="avatar avatar-sm" src="${n.authorAvatar}" alt="${n.author}" loading="lazy">` : ''}<span>Curated by ${n.author}</span></div>` : ''}
          <p class="meta-muted">${n.preview||''}</p>
          <ul class="tips-list">${(n.tips||[]).map(t=>`<li>${t}</li>`).join('')}</ul>
          <div class="tag-bar">${(n.tags||[]).map(t=>`<span class="tag">${t}</span>`).join('')}</div>
        </div>
      </article>`).join('') || '<div class="status-panel"><h3>No issues yet</h3></div>';
  } catch(e) {
    const list = document.getElementById('newsletter-list');
    if (list) list.innerHTML = '<div class="status-panel"><h3>Could not load issues</h3></div>';
  }
}
load();

document.getElementById('newsletter-signup')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const email = formData.get('email');
  try {
    const res = await api('/api/newsletter/subscribe', { method: 'POST', body: { email } });
    const status = document.getElementById('newsletter-status');
    if (res.ok) status.textContent = 'Subscribed.';
    else status.textContent = 'Error subscribing.';
  } catch(err) {
    document.getElementById('newsletter-status').textContent = 'Error: ' + err.message;
  }
});
