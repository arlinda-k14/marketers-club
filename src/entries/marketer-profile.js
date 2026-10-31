import { initFirebase } from '../services/firebase.js';
import '../services/sessionNav.js';
import { esc, rateLabel, safeUrl } from '../services/marketerFormat.js';
import { api, whenAuthReady } from '../services/api.js';
import { getAuth } from 'firebase/auth';
import '../styles/main.css';

initFirebase();
const auth = getAuth();

function getParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

function fmtDate(s) {
  if (!s) return '';
  const d = new Date(s.includes('T') ? s : s + 'T00:00:00');
  if (isNaN(d)) return s;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

async function load() {
  const id = getParam('id');
  if (!id) {
    document.getElementById('profile-header').innerHTML = '<div class="status-panel"><h3>Profile not found</h3></div>';
    return;
  }
  try {
    const user = await whenAuthReady();
    const res = await api('/api/marketers/' + encodeURIComponent(id));
    if (!res.ok) {
      document.getElementById('profile-header').innerHTML = '<div class="status-panel"><h3>Profile not found</h3><p class="meta-muted">This marketer is not listed in the directory.</p></div>';
      return;
    }
    const p = res.data.profile || {};
    document.getElementById('profile-header').innerHTML = `
      <div class="profile-hero">
        ${p.avatar ? `<img class="avatar avatar-xl" src="${esc(p.avatar)}" alt="${esc(p.fullName)}" loading="lazy">` : ''}
        <div style="display:flex;flex-direction:column;gap:.8rem;">
          <div class="meta-row">
            ${p.verified ? '<span class="pill">✓ Verified</span>' : '<span class="pill">Unverified</span>'}
            <span class="meta-muted">${Number(p.completionScore)||0}% profile complete</span>
          </div>
          <h1 style="margin:0;">${esc(p.fullName)}</h1>
          <p class="role-line" style="font-size:1.15rem;">${esc(p.role)}</p>
        </div>
      </div>`;
    document.getElementById('profile-bio').textContent = p.bio || '';
    const exp = document.getElementById('profile-exp');
    if (p.yearsExperience == null || p.yearsExperience === '') exp.parentElement.hidden = true;
    else exp.textContent = p.yearsExperience;
    document.getElementById('profile-rate').textContent = rateLabel(p);
    document.getElementById('profile-specs').textContent = (p.specialties||[]).join(', ');
    const links = document.getElementById('profile-links');
    let html = '';
    const link = u => { const href = safeUrl(u); return href ? `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(u)}</a>` : ''; };
    if (safeUrl(p.website)) html += `<div><strong>Website:</strong> ${link(p.website)}</div>`;
    if (safeUrl(p.linkedin)) html += `<div><strong>LinkedIn:</strong> ${link(p.linkedin)}</div>`;
    const portfolio = (p.portfolioLinks||[]).filter(safeUrl);
    if (portfolio.length) html += `<div><strong>Portfolio:</strong> ${portfolio.map(link).join(', ')}</div>`;
    links.innerHTML = html;

    const articles = (p.featured && p.featured.articles) || [];
    const events = (p.featured && p.featured.events) || [];
    if (articles.length) {
      document.getElementById('profile-featured-articles').innerHTML = articles.map(a => `
        <a class="card media-card" href="/blog.html" style="color: inherit; text-decoration: none;">
          ${a.coverImage ? `<div class="media-cover media-cover-article"><img src="${esc(a.coverImage)}" alt="${esc(a.title)}" loading="lazy"></div>` : ''}
          <div class="media-body">
            <div class="meta-row">
              <span class="pill">${esc(a.category||'Editorial')}</span>
              <span class="meta-muted">${esc(a.readTime)}</span>
            </div>
            <h3 class="media-title">${esc(a.title)}</h3>
            <p class="meta-muted">${esc(a.excerpt)}</p>
          </div>
        </a>`).join('');
      document.getElementById('profile-featured-articles-group').style.display = 'block';
    }
    if (events.length) {
      const today = new Date().toISOString().slice(0, 10);
      document.getElementById('profile-featured-events').innerHTML = events.map(e => {
        const past = e.date && e.date < today;
        return `
        <a class="card poster-card" href="/events.html" style="color: inherit; text-decoration: none;">
          ${e.posterImage ? `<div class="poster-cover"><img src="${esc(e.posterImage)}" alt="${esc(e.title)}" loading="lazy"><div class="poster-tags"><span class="pill frosted">📍 ${esc(e.city||'ONLINE')}</span><span class="pill frosted">🏷️ ${past ? 'PAST SESSION' : esc(e.eventType||'WORKSHOP')}</span></div></div>` : ''}
          <div class="media-body">
            <div class="meta-row">
              <span class="pill">${esc(fmtDate(e.date))} · ${esc(e.time)} ${esc(e.timezone)}</span>
            </div>
            <h3 class="media-title">${esc(e.title)}</h3>
          </div>
        </a>`;
      }).join('');
      document.getElementById('profile-featured-events-group').style.display = 'block';
    }
    if (articles.length || events.length) {
      document.getElementById('profile-featured').style.display = 'block';
    }

    if (user) {
      document.getElementById('profile-gate').style.display = 'none';
      document.getElementById('profile-contact').style.display = 'block';
      document.getElementById('profile-email').textContent = p.email || '';
    } else {
      document.getElementById('profile-contact-note').textContent = "Direct contact email and inquiries require free account registration.";
    }

    document.getElementById('inquiry-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const user = auth.currentUser;
      if (!user) {
        window.location.href = '/sign-in.html?returnTo=' + encodeURIComponent(window.location.pathname + window.location.search);
        return;
      }
      try {
        const formData = new FormData(e.target);
        const res = await api('/api/marketers/' + encodeURIComponent(id) + '/inquiry', { method: 'POST', body: { message: formData.get('message') } });
        const status = document.getElementById('inquiry-status');
        status.textContent = res.ok ? 'Inquiry sent. The marketer has been notified.' : 'Error sending inquiry.';
      } catch(err) {
        document.getElementById('inquiry-status').textContent = 'Error: ' + err.message;
      }
    });
  } catch(e) {}
}
load();
