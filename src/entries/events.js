import { initFirebase } from '../services/firebase.js';
import '../services/sessionNav.js';
import { api } from '../services/api.js';
import { esc, safeUrl } from '../services/marketerFormat.js';
import '../styles/main.css';

initFirebase();

let currentTab = 'upcoming';

function fmtDate(v) {
  if (!v) return '';
  const d = new Date(v + 'T00:00:00');
  if (isNaN(d)) return v;
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function render(events) {
  const list = document.getElementById('events-list');
  const empty = document.getElementById('events-empty');
  if (!list) return;
  if (!events || events.length === 0) {
    list.innerHTML = '';
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';
  list.innerHTML = events.map(e => {
    const past = currentTab === 'past';
    const links = [];
    if (past && e.recordingUrl) links.push(`<a class="btn ghost btn-sm" href="${esc(safeUrl(e.recordingUrl))}">Watch recording</a>`);
    if (past && e.slidesUrl) links.push(`<a class="btn ghost btn-sm" href="${esc(safeUrl(e.slidesUrl))}">View slides</a>`);
    return `<article class="card poster-card">
      ${e.posterImage ? `<div class="poster-cover"><img src="${esc(e.posterImage)}" alt="${esc(e.title)}" loading="lazy"><div class="poster-tags"><span class="pill frosted">📍 ${esc(e.city||'ONLINE')}</span><span class="pill frosted">🏷️ ${esc(e.eventType||(past?'PAST SESSION':'WORKSHOP'))}</span></div></div>` : ''}
      <div class="media-body">
        <div class="meta-row">
          <span class="pill">${esc(fmtDate(e.date))} · ${esc(e.time)} ${esc(e.timezone)}</span>
          ${e.capacity ? `<span class="meta-muted">${esc(e.capacity)} seats</span>` : ''}
        </div>
        <h3 class="media-title">${esc(e.title)}</h3>
        <div class="byline">
          ${e.speakerAvatar ? `<img class="avatar avatar-sm" src="${esc(e.speakerAvatar)}" alt="${esc(e.speaker||e.hostName)}" loading="lazy">` : ''}
          <span>Hosted by ${esc(e.speaker||e.hostName)}</span>
        </div>
        <p class="meta-muted">${esc(e.description)}</p>
        ${(e.agenda&&e.agenda.length)?`<ul class="tips-list">${e.agenda.map(a=>`<li>${esc(a)}</li>`).join('')}</ul>`:''}
        <div class="tag-bar">${(e.categoryTags||[]).map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div>
        ${links.length?`<div class="card-actions">${links.join('')}</div>`:''}
      </div>
    </article>`;
  }).join('');
}

async function load(tab) {
  currentTab = tab;
  try {
    const { data } = await api('/api/events?tab=' + tab);
    render(data.events || []);
  } catch(e) {
    render([]);
  }
}

document.getElementById('tab-upcoming')?.addEventListener('click', () => {
  document.getElementById('tab-upcoming').className = 'btn btn-sm';
  document.getElementById('tab-past').className = 'btn ghost btn-sm';
  load('upcoming');
});
document.getElementById('tab-past')?.addEventListener('click', () => {
  document.getElementById('tab-past').className = 'btn btn-sm';
  document.getElementById('tab-upcoming').className = 'btn ghost btn-sm';
  load('past');
});

load('upcoming');
