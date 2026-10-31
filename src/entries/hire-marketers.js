import { initFirebase } from '../services/firebase.js';
import '../services/sessionNav.js';
import { esc, rateLabel, yearsLabel } from '../services/marketerFormat.js';
import { api } from '../services/api.js';
import '../styles/main.css';

initFirebase();

function getParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

function syncActiveTag(specialty) {
  document.querySelectorAll('#specialty-filter [data-specialty]').forEach(el => {
    el.classList.toggle('active', (el.dataset.specialty || '') === specialty);
  });
}

async function load() {
  const specialty = getParam('specialty') || '';
  syncActiveTag(specialty);
  try {
    const { data } = await api('/api/marketers' + (specialty ? '?specialty=' + encodeURIComponent(specialty) : ''));
    const list = document.getElementById('marketers-list');
    const empty = document.getElementById('marketers-empty');
    if (!list) return;
    if (!data.profiles || data.profiles.length === 0) {
      list.innerHTML = '';
      if (empty) empty.style.display = 'block';
      return;
    }
    if (empty) empty.style.display = 'none';
    list.innerHTML = data.profiles.map(p => {
      const href = '/marketer-profile.html?id=' + encodeURIComponent(p.id);
      const years = yearsLabel(p);
      return `
      <article class="card marketer-card">
        <div class="marketer-top">
          ${p.avatar ? `<img class="avatar avatar-lg" src="${esc(p.avatar)}" alt="${esc(p.fullName)}" loading="lazy">` : ''}
          <div class="marketer-head">
            <div class="meta-row">
              <h3 class="media-title" style="font-size:1.5rem;">${esc(p.fullName)}</h3>
              ${p.verified ? '<span class="pill">✓ Verified</span>' : '<span class="pill">Unverified</span>'}
            </div>
            <p class="role-line">${esc(p.role || (p.specialties||[])[0] || 'Marketer')}</p>
          </div>
        </div>
        <p class="meta-muted marketer-bio">${esc(p.bio)}</p>
        <div class="tag-bar">
          ${years ? `<span class="pill">${years}</span>` : ''}
          <span class="pill">${esc(rateLabel(p))}</span>
          ${(p.specialties||[]).slice(0,3).map(s=>`<span class="tag">${esc(s)}</span>`).join('')}
        </div>
        <div class="card-actions">
          <a href="${href}" class="btn btn-sm">View Profile</a>
          <a href="${href}#inquiry-form" class="btn ghost btn-sm">Inquire</a>
          <span class="meta-muted" style="margin-left:auto;">${Number(p.completionScore)||0}% complete</span>
        </div>
      </article>`;
    }).join('');
  } catch(e) {
    const empty = document.getElementById('marketers-empty');
    if (empty) empty.style.display = 'block';
  }
}
load();
