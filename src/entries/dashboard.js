import { initFirebase } from '../services/firebase.js';
import { api, whenAuthReady } from '../services/api.js';
import '../styles/main.css';

initFirebase();

const $ = id => document.getElementById(id);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function parseDate(v) {
  if (!v) return null;
  const d = new Date(typeof v === 'string' && !v.includes('T') ? v + 'T00:00:00' : v);
  return isNaN(d) ? null : d;
}

function fmtDate(v, opts = { month: 'short', day: 'numeric', year: 'numeric' }) {
  const d = parseDate(v);
  return d ? d.toLocaleDateString('en-US', opts) : '';
}

function initials(name) {
  return (name || '').split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('') || 'MC';
}

function avatar(src, name, cls = 'avatar avatar-sm') {
  return src
    ? `<img class="${cls}" src="${esc(src)}" alt="" loading="lazy">`
    : `<span class="${cls} mh-avatar-fallback" aria-hidden="true">${esc(initials(name))}</span>`;
}

function note(text) {
  return `<div class="status-panel mh-note"><p class="meta-muted">${text}</p></div>`;
}

let toastTimer;
function toast(message) {
  const el = $('mh-toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}

/* ---------- hero ---------- */

function renderHero(p) {
  const hour = new Date().getHours();
  $('mh-greeting').textContent = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const first = (p.fullName || '').split(/\s+/)[0];
  $('mh-title').textContent = first ? `Welcome back, ${first}` : 'Welcome back';
  const tiers = { founding: 'Founding Member', pro: 'Pro Member', free: 'Free Member' };
  const tier = tiers[p.membershipTier] || '';
  $('mh-tier').textContent = tier;
  $('mh-tier').hidden = !tier;
  $('mh-tier').dataset.tier = p.membershipTier || '';
  const img = $('mh-avatar');
  $('mh-initials').textContent = initials(p.fullName);
  if (p.avatar) {
    img.src = p.avatar;
    img.hidden = false;
    $('mh-initials').hidden = true;
  }
}

/* ---------- events + calendar file ---------- */

// Offsets for the timezone labels events use; unknown labels fall back to a floating local time.
const TZ_OFFSETS = { GMT: 0, UTC: 0, BST: 1, CET: 1, CEST: 2, EET: 2, EEST: 3, EST: -5, EDT: -4, CST: -6, CDT: -5, PST: -8, PDT: -7, AEST: 10, AEDT: 11 };

function icsDate(e, addMinutes = 0) {
  const [y, mo, d] = (e.date || '').split('-').map(Number);
  const [h, mi] = (e.time || '09:00').split(':').map(Number);
  const offset = TZ_OFFSETS[(e.timezone || '').toUpperCase()];
  const pad = n => String(n).padStart(2, '0');
  if (offset === undefined) {
    const local = new Date(y, mo - 1, d, h, mi + addMinutes);
    return { value: `${local.getFullYear()}${pad(local.getMonth() + 1)}${pad(local.getDate())}T${pad(local.getHours())}${pad(local.getMinutes())}00`, utc: false };
  }
  const utc = new Date(Date.UTC(y, mo - 1, d, h - offset, mi + addMinutes));
  return { value: `${utc.getUTCFullYear()}${pad(utc.getUTCMonth() + 1)}${pad(utc.getUTCDate())}T${pad(utc.getUTCHours())}${pad(utc.getUTCMinutes())}00Z`, utc: true };
}

function icsText(v) {
  return String(v || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');
}

function downloadIcs(e) {
  const start = icsDate(e);
  const end = icsDate(e, 90);
  const location = e.meetingLink || e.venueLocation || (e.city && e.city !== 'ONLINE' ? e.city : 'Online');
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Marketers Club//Events//EN', 'BEGIN:VEVENT',
    `UID:${e.id}@marketers-club`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`,
    `DTSTART:${start.value}`, `DTEND:${end.value}`,
    `SUMMARY:${icsText(e.title)}`,
    `DESCRIPTION:${icsText([e.description, e.speaker ? 'Hosted by ' + e.speaker : ''].filter(Boolean).join('\n\n'))}`,
    `LOCATION:${icsText(location)}`,
    `URL:${location.startsWith('http') ? location : window.location.origin + '/events.html'}`,
    'END:VEVENT', 'END:VCALENDAR'
  ].join('\r\n');
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(e.title || 'event').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Calendar file downloaded.');
}

let upcomingEvents = [];

function renderEvents(events) {
  upcomingEvents = events.slice(0, 3);
  $('mh-events').innerHTML = upcomingEvents.map((e, i) => {
    const d = parseDate(e.date);
    return `
    <article class="card mh-event">
      ${e.posterImage ? `<div class="mh-event-cover"><img src="${esc(e.posterImage)}" alt="" loading="lazy"><span class="pill frosted">${esc(e.eventType || 'Workshop')}</span></div>` : ''}
      <div class="mh-event-body">
        <div class="mh-event-top">
          <div class="mh-date" aria-hidden="true">
            <span class="mh-date-day">${d ? d.getDate() : ''}</span>
            <span class="mh-date-month">${d ? d.toLocaleDateString('en-US', { month: 'short' }) : ''}</span>
          </div>
          <div>
            <h3 class="mh-card-title">${esc(e.title)}</h3>
            <p class="mh-meta">${esc(fmtDate(e.date, { weekday: 'short', month: 'short', day: 'numeric' }))}${e.time ? ' · ' + esc(e.time) + ' ' + esc(e.timezone || '') : ''} · ${esc(e.city || 'Online')}</p>
          </div>
        </div>
        <div class="byline">${avatar(e.speakerAvatar, e.speaker)}<span>Hosted by ${esc(e.speaker || e.hostName || 'Marketers Club')}</span></div>
        <div class="mh-card-actions">
          <button type="button" class="btn btn-ink btn-sm" data-ics="${i}">Add to calendar<span class="visually-hidden">: ${esc(e.title)}</span></button>
          <a class="btn ghost btn-sm" href="/events.html">Details<span class="visually-hidden"> for ${esc(e.title)}</span></a>
        </div>
      </div>
    </article>`;
  }).join('') || note('No upcoming events right now. <a href="/submit-event.html">Host one</a>.');
}

/* ---------- articles ---------- */

function renderArticles(articles) {
  $('mh-articles').innerHTML = articles.slice(0, 2).map(a => `
    <article class="card mh-article">
      ${a.coverImage ? `<div class="mh-article-cover"><img src="${esc(a.coverImage)}" alt="" loading="lazy"></div>` : ''}
      <div class="mh-article-body">
        <div class="meta-row">
          <span class="pill">${esc(a.category || 'Editorial')}</span>
          <span class="mh-meta">${esc(a.readTime || '')}</span>
        </div>
        <h3 class="mh-card-title"><a href="/blog.html">${esc(a.title)}</a></h3>
        <p class="meta-muted mh-snippet">${esc(a.excerpt || '')}</p>
        <div class="byline">${avatar(a.authorAvatar, a.author)}<span>By ${esc(a.author || 'Marketers Club')} · ${esc(fmtDate(a.publishedAt, { month: 'short', day: 'numeric' }))}</span></div>
      </div>
    </article>`).join('') || note('No articles published yet.');
}

/* ---------- forum ---------- */

function renderForum(result) {
  if (result.status === 401) {
    $('mh-forum').innerHTML = `<li>${note('<a href="/sign-in.html?returnTo=/dashboard.html">Sign in</a> to see what members are discussing.')}</li>`;
    return;
  }
  // "Trending": most replies first, newest first on a tie.
  const threads = ((result.ok && result.data.items) || [])
    .slice()
    .sort((a, b) => (b.commentCount || 0) - (a.commentCount || 0) || (parseDate(b.createdAt) - parseDate(a.createdAt)))
    .slice(0, 4);
  $('mh-forum').innerHTML = threads.map(t => `
    <li class="mh-thread">
      ${(t.tags || []).length ? `<div class="mh-thread-tags">${t.tags.slice(0, 2).map(tag => `<span class="tag">${esc(tag)}</span>`).join('')}</div>` : ''}
      <a class="mh-thread-title" href="/forum.html">${esc(t.title)}</a>
      <div class="mh-thread-meta">
        <span class="byline">${avatar(t.authorAvatar, t.author)}<span>${esc(t.author || 'Member')}</span></span>
        <span class="mh-meta">${t.commentCount || 0} ${t.commentCount === 1 ? 'reply' : 'replies'}</span>
      </div>
      <a class="mh-join" href="/forum.html">Join the discussion<span class="visually-hidden">: ${esc(t.title)}</span> →</a>
    </li>`).join('') || `<li>${note('No discussions yet. <a href="/forum.html">Start the first one</a>.')}</li>`;
}

/* ---------- toolkit + saved ---------- */

function renderToolkit(resourcesResult, savedResult) {
  const resources = (resourcesResult.ok && resourcesResult.data.items) || [];
  const count = cat => resources.filter(r => r.category === cat).length;
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
  const tools = [
    { title: 'Growth Playbooks', text: 'Worksheets for planning, launching and stopping campaigns.', href: '/resources.html', meta: plural(count('Growth Playbooks'), 'playbook'), cta: 'Open playbooks' },
    { title: 'Notion Templates', text: 'Content calendars and planning databases you can import.', href: '/resources.html', meta: plural(count('Notion Templates'), 'template'), cta: 'Open templates' },
    { title: 'Hiring Pipeline', text: 'Browse ranked marketer profiles and send an inquiry.', href: '/hire-marketers.html', meta: 'Directory', cta: 'Find marketers' },
    { title: 'Salary Guide', text: 'Pay ranges by role and region, sourced before we publish them.', href: '', meta: 'Coming soon', cta: '' }
  ];
  $('mh-toolkit').innerHTML = tools.map(t => t.href ? `
    <a class="card mh-tool" href="${t.href}">
      <span class="mh-tool-meta">${esc(t.meta)}</span>
      <h3 class="mh-card-title">${esc(t.title)}</h3>
      <p class="meta-muted">${esc(t.text)}</p>
      <span class="mh-join">${esc(t.cta)} →</span>
    </a>` : `
    <div class="card mh-tool is-soon" aria-disabled="true">
      <span class="mh-tool-meta">${esc(t.meta)}</span>
      <h3 class="mh-card-title">${esc(t.title)}</h3>
      <p class="meta-muted">${esc(t.text)}</p>
    </div>`).join('');

  if (savedResult.status === 401) { $('mh-saved').innerHTML = ''; return; }
  const saved = (savedResult.ok && savedResult.data) || {};
  const a = (saved.savedArticles || []).length;
  const e = (saved.savedEvents || []).length;
  $('mh-saved').innerHTML = `
    <div class="mh-saved-inner">
      <div>
        <h3 class="mh-saved-title">Saved for later</h3>
        <p class="meta-muted">${a || e ? `${plural(a, 'article')} and ${plural(e, 'event')} saved.` : 'Nothing saved yet. Save articles and events to find them here.'}</p>
      </div>
      <a class="btn ghost btn-sm" href="/saved-resources.html">View saved</a>
    </div>`;
}

/* ---------- boot ---------- */

async function load() {
  const me = await api('/api/profile/me');
  if (me.status === 401) { window.location.href = '/sign-in.html?returnTo=/dashboard.html'; return; }
  if (me.ok && !me.data.profile) { window.location.href = '/onboarding.html'; return; }
  if (me.ok) renderHero(me.data.profile);

  const [events, articles, forum, resources, saved] = await Promise.all([
    api('/api/events?tab=upcoming'),
    api('/api/articles'),
    api('/api/forum/discussions'),
    api('/api/resources'),
    api('/api/users/saved')
  ]);
  if (events.ok) renderEvents(events.data.events || []); else $('mh-events').innerHTML = note('Events could not load. Refresh to try again.');
  if (articles.ok) renderArticles(articles.data.articles || []); else $('mh-articles').innerHTML = note('Articles could not load. Refresh to try again.');
  renderForum(forum);
  renderToolkit(resources, saved);
  $('mh-root').setAttribute('aria-busy', 'false');
}

$('mh-events').addEventListener('click', e => {
  const btn = e.target.closest('[data-ics]');
  if (btn) downloadIcs(upcomingEvents[Number(btn.dataset.ics)]);
});

whenAuthReady().then(() => load()).catch(() => toast('Some of your dashboard could not load.'));
