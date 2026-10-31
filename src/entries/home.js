import { initFirebase } from '../services/firebase.js';
import '../services/sessionNav.js';
import { esc } from '../services/marketerFormat.js';
import { api } from '../services/api.js';
import '../styles/main.css';

initFirebase();

function fmtDate(v) {
  if (!v) return '';
  const s = typeof v === 'string' ? v : '';
  if (!s) return '';
  const d = new Date(s.includes('T') ? s : s + 'T00:00:00');
  if (isNaN(d)) return s;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function articleCard(a) {
  return `<article class="card media-card">
    ${a.coverImage ? `<div class="media-cover media-cover-article"><img src="${a.coverImage}" alt="${a.title}" loading="lazy"></div>` : ''}
    <div class="media-body">
      <div class="meta-row"><span class="pill">${a.category}</span><span class="meta-muted">${a.readTime||''}</span></div>
      <h3 class="media-title">${a.title}</h3>
      <p class="meta-muted">${a.excerpt||''}</p>
      <div class="byline">${a.authorAvatar?`<img class="avatar avatar-sm" src="${a.authorAvatar}" alt="${a.author}" loading="lazy">`:''}<span>By ${a.author}</span></div>
    </div>
  </article>`;
}

function eventCard(e) {
  return `<article class="card poster-card">
    ${e.posterImage ? `<div class="poster-cover"><img src="${esc(e.posterImage)}" alt="${esc(e.title)}" loading="lazy"><div class="poster-tags"><span class="pill frosted">📍 ${esc(e.city||'ONLINE')}</span><span class="pill frosted">🏷️ ${esc(e.eventType||'WORKSHOP')}</span></div></div>` : ''}
    <div class="media-body">
      <div class="meta-row"><span class="pill">${fmtDate(e.date)}</span><span class="meta-muted">${esc(e.time)} ${esc(e.timezone)}</span></div>
      <h3 class="media-title">${esc(e.title)}</h3>
      <div class="byline">${e.speakerAvatar?`<img class="avatar avatar-sm" src="${esc(e.speakerAvatar)}" alt="${esc(e.speaker)}">`:''}<span>${esc(e.speaker||e.hostName)}</span></div>
    </div>
  </article>`;
}

function issueCard(n) {
  return `<article class="card media-card">
    ${n.coverImage?`<div class="media-cover"><img src="${n.coverImage}" alt="${n.title}" loading="lazy"></div>`:''}
    <div class="media-body">
      <div class="meta-row"><span class="pill">Issue #${n.issueNumber}</span></div>
      <h3 class="media-title">${n.title||'Quick Tips'}</h3>
      <p class="meta-muted">${n.preview||''}</p>
      ${n.author?`<div class="byline">${n.authorAvatar?`<img class="avatar avatar-sm" src="${n.authorAvatar}" alt="${n.author}" loading="lazy">`:''}<span>Curated by ${n.author}</span></div>`:''}
    </div>
  </article>`;
}

async function load() {
  try {
    const [up, art, news] = await Promise.all([
      api('/api/events?tab=upcoming').then(r => r.data),
      api('/api/articles').then(r => r.data),
      api('/api/newsletter/issues').then(r => r.data)
    ]);
    const upEl = document.getElementById('home-upcoming');
    if (upEl) upEl.innerHTML = (up.events||[]).slice(0,3).map(eventCard).join('') || '<div class="status-panel"><p>No upcoming events</p></div>';
    const artEl = document.getElementById('home-blog');
    if (artEl) artEl.innerHTML = (art.articles||[]).slice(0,3).map(articleCard).join('') || '<div class="status-panel"><p>No articles</p></div>';
    const newsEl = document.getElementById('home-newsletter');
    if (newsEl) newsEl.innerHTML = (news.issues||[]).slice(0,3).map(issueCard).join('') || '<div class="status-panel"><p>No issues</p></div>';
  } catch(e) {}
}
load();

// Door 2: contact form -> customer_messages, triaged by the CCO's Triage Agent.
document.getElementById('contact-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const status = document.getElementById('contact-status');
  const body = Object.fromEntries(['name', 'businessName', 'email', 'message'].map(k => [k, form.elements[k].value.trim()]));
  if (!body.name || !body.message || !/^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/.test(body.email)) {
    status.textContent = 'Please add your name, a valid email and a short message.';
    return;
  }
  const button = form.querySelector('button');
  button.disabled = true;
  status.textContent = 'Sending…';
  const res = await api('/api/contact', { method: 'POST', body });
  button.disabled = false;
  if (res.ok) {
    form.reset();
    status.textContent = "Thanks, we've got it. We'll reply by email.";
  } else {
    status.textContent = 'That did not go through. Please try again in a moment.';
  }
});
