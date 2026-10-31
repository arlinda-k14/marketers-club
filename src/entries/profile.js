import { initFirebase } from '../services/firebase.js';
import { api, whenAuthReady } from '../services/api.js';
import '../styles/main.css';

initFirebase();

const $ = id => document.getElementById(id);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const LINK_LABELS = { website: 'Website', github: 'GitHub', linkedin: 'LinkedIn', newsletter: 'Newsletter' };
const QUAL_LABELS = { degree: 'Degree', certification: 'Certification', role: 'Leadership role' };
const MAX_SKILLS = 20;

let currentUser = null;
let saved = null;      // profile as last saved on the server
let skills = [];       // skills in the edit form
let quals = [];        // qualifications in the edit form

/* ---------- helpers ---------- */

function fmtDate(v, withYear = true) {
  if (!v) return '';
  const d = new Date(typeof v === 'string' && !v.includes('T') ? v + 'T00:00:00' : v);
  if (isNaN(d)) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(withYear ? { year: 'numeric' } : {}) });
}

function initials(name) {
  return (name || '').split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('') || 'MC';
}

let toastTimer;
function toast(message, kind = 'ok') {
  const el = $('mp-toast');
  el.textContent = message;
  el.dataset.kind = kind;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
}

/* ---------- header card ---------- */

function renderAvatar(src, name) {
  const img = $('mp-avatar-img');
  $('mp-avatar-initials').textContent = initials(name);
  if (src) {
    img.src = src;
    img.alt = name ? `${name}'s profile photo` : 'Profile photo';
    img.hidden = false;
  } else {
    img.removeAttribute('src');
    img.hidden = true;
  }
}

function renderHero(p) {
  $('mp-name').textContent = p.fullName || 'Your profile';
  $('mp-role').textContent = p.currentRole || '';
  $('mp-role').hidden = !p.currentRole;
  $('mp-bio').textContent = p.bio || 'Add a short bio so people know what you work on.';
  $('mp-bio').classList.toggle('is-empty', !p.bio);
  renderAvatar(p.avatar, p.fullName);

  $('mp-skills').innerHTML = (p.skills || []).map(s => `<li class="mp-pill">${esc(s)}</li>`).join('');
  $('mp-links').innerHTML = Object.entries(p.links || {})
    .filter(([, url]) => url)
    .map(([key, url]) => `<li><a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${LINK_LABELS[key] || key}<span class="visually-hidden"> (opens in a new tab)</span></a></li>`)
    .join('');
}

/* ---------- edit form ---------- */

function fillForm(p) {
  $('f-fullName').value = p.fullName || '';
  $('f-currentRole').value = p.currentRole || '';
  $('f-bio').value = p.bio || '';
  for (const key of Object.keys(LINK_LABELS)) $('f-' + key).value = (p.links && p.links[key]) || '';
  skills = [...(p.skills || [])];
  quals = (p.qualifications || []).map(q => ({ ...q }));
  renderSkills();
  renderQuals();
  updateBioCount();
  clearErrors();
}

function updateBioCount() {
  const n = $('f-bio').value.length;
  $('f-bio-count').textContent = `${n} of 1200 characters`;
}

function renderSkills() {
  $('mp-skill-list').innerHTML = skills.map((s, i) => `
    <li class="mp-pill">
      <span>${esc(s)}</span>
      <button type="button" class="mp-pill-remove" data-index="${i}" aria-label="Remove ${esc(s)}">×</button>
    </li>`).join('');
  $('f-skill').disabled = skills.length >= MAX_SKILLS;
  $('f-skill').placeholder = skills.length >= MAX_SKILLS ? 'Skill limit reached' : 'Add a skill';
}

function addSkill(raw) {
  const value = raw.replace(/,/g, '').trim().slice(0, 40);
  if (!value) return;
  if (skills.some(s => s.toLowerCase() === value.toLowerCase())) {
    toast(`${value} is already in your skills.`, 'info');
    return;
  }
  if (skills.length >= MAX_SKILLS) return;
  skills.push(value);
  renderSkills();
}

function renderQuals() {
  const list = $('mp-quals');
  if (!quals.length) {
    list.innerHTML = '<li class="mp-hint">No qualifications yet.</li>';
    return;
  }
  list.innerHTML = quals.map((q, i) => `
    <li class="mp-qual-row" data-index="${i}">
      <div class="form-group">
        <label for="q-type-${i}">Type</label>
        <select id="q-type-${i}" data-field="type">
          ${Object.entries(QUAL_LABELS).map(([v, l]) => `<option value="${v}"${q.type === v ? ' selected' : ''}>${l}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label for="q-title-${i}">Title</label>
        <input id="q-title-${i}" data-field="title" type="text" maxlength="120" value="${esc(q.title)}">
      </div>
      <div class="form-group">
        <label for="q-org-${i}">Organization</label>
        <input id="q-org-${i}" data-field="organization" type="text" maxlength="120" value="${esc(q.organization)}">
      </div>
      <div class="form-group">
        <label for="q-period-${i}">Years</label>
        <input id="q-period-${i}" data-field="period" type="text" maxlength="40" value="${esc(q.period)}" placeholder="e.g. 2021 to 2022">
      </div>
      <button type="button" class="btn ghost btn-sm mp-qual-remove" data-index="${i}" aria-label="Remove ${esc(q.title || 'qualification')}">Remove</button>
    </li>`).join('');
}

function clearErrors() {
  document.querySelectorAll('.mp-error').forEach(el => { el.textContent = ''; });
  document.querySelectorAll('#mp-form [aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
}

function showErrors(fields) {
  let first = null;
  for (const [name, message] of Object.entries(fields || {})) {
    const input = document.querySelector(`#mp-form [name="${name}"]`);
    const err = $('err-' + name);
    if (err) err.textContent = message;
    if (input) {
      input.setAttribute('aria-invalid', 'true');
      first = first || input;
    }
  }
  if (first) first.focus();
}

function readForm() {
  const links = {};
  for (const key of Object.keys(LINK_LABELS)) links[key] = $('f-' + key).value.trim();
  return {
    fullName: $('f-fullName').value.trim(),
    currentRole: $('f-currentRole').value.trim(),
    bio: $('f-bio').value.trim(),
    skills,
    qualifications: quals.filter(q => (q.title || '').trim()),
    links
  };
}

function setEditing(open) {
  $('mp-edit').hidden = !open;
  $('mp-edit-toggle').setAttribute('aria-expanded', String(open));
  $('mp-edit-toggle').textContent = open ? 'Close editor' : 'Edit profile';
  if (open) $('f-fullName').focus();
}

async function save(e) {
  e.preventDefault();
  clearErrors();
  const btn = $('mp-save');
  btn.disabled = true;
  btn.textContent = 'Saving…';
  try {
    const { ok, status, data } = await api('/api/profile/me', { method: 'PUT', body: readForm() });
    if (ok) {
      saved = { ...saved, ...data.profile };
      renderHero(saved);
      fillForm(saved);
      toast('Profile saved.');
    } else if (status === 400) {
      showErrors(data.fields);
      toast('Some fields need a fix before saving.', 'error');
    } else {
      toast('Could not save your profile. Try again.', 'error');
    }
  } catch (err) {
    toast('Could not reach the server. Try again.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save changes';
  }
}

/* ---------- avatar upload ---------- */

// Square-crop and shrink in the browser so the upload stays small.
function toSquareJpeg(file, size = 512) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const side = Math.min(img.naturalWidth, img.naturalHeight);
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = Math.min(size, side);
      canvas.getContext('2d').drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.88));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('unreadable')); };
    img.src = url;
  });
}

async function onAvatarChosen(e) {
  const file = e.target.files && e.target.files[0];
  e.target.value = '';
  if (!file) return;
  const status = $('mp-avatar-status');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    status.textContent = 'Use a JPG, PNG or WebP image.';
    return;
  }
  if (file.size > 15 * 1024 * 1024) {
    status.textContent = 'That image is over 15 MB. Pick a smaller one.';
    return;
  }
  const previous = saved.avatar;
  try {
    const dataUrl = await toSquareJpeg(file);
    renderAvatar(dataUrl, saved.fullName);
    status.textContent = 'Uploading…';
    const { ok, data } = await api('/api/profile/me/avatar', { method: 'POST', body: { dataUrl } });
    if (!ok) throw new Error(data.error || 'upload_failed');
    saved.avatar = data.avatar;
    renderAvatar(saved.avatar, saved.fullName);
    status.textContent = '';
    toast('Profile photo updated.');
  } catch (err) {
    renderAvatar(previous, saved.fullName);
    status.textContent = err.message === 'avatar_upload_not_configured'
      ? 'Photo upload is not set up on this server yet.'
      : 'That photo could not be uploaded. Try another image.';
  }
}

/* ---------- content hub ---------- */

function emptyState(text) {
  return `<div class="status-panel mp-empty"><p class="meta-muted">${esc(text)}</p></div>`;
}

function renderArticles(items) {
  $('articles-summary').textContent = items.length === 1 ? '1 published article' : `${items.length} published articles`;
  $('articles-list').innerHTML = items.map(a => `
    <article class="card mp-article">
      ${a.coverImage ? `<div class="mp-article-cover"><img src="${esc(a.coverImage)}" alt="" loading="lazy"></div>` : ''}
      <div class="mp-article-body">
        <span class="pill">${esc(a.category || 'Editorial')}</span>
        <h3 class="media-title">${esc(a.title)}</h3>
        <p class="mp-meta">${esc(fmtDate(a.publishedAt))}${a.readTime ? ' · ' + esc(a.readTime) : ''}</p>
        <p class="meta-muted">${esc(a.excerpt || '')}</p>
      </div>
    </article>`).join('') || emptyState('No published articles yet. Your first one will show up here.');
}

function eventCard(e, today) {
  const past = e.date && e.date < today;
  const status = e.status !== 'approved'
    ? (e.status === 'pending' ? 'Pending review' : 'Not approved')
    : (past ? 'Past session' : 'Upcoming');
  return `
    <article class="card poster-card mp-event">
      ${e.posterImage ? `<div class="poster-cover"><img src="${esc(e.posterImage)}" alt="" loading="lazy"><div class="poster-tags"><span class="pill frosted">📍 ${esc(e.city || 'ONLINE')}</span><span class="pill frosted">${esc(e.eventType || 'WORKSHOP')}</span></div></div>` : ''}
      <div class="media-body">
        <div class="meta-row">
          <span class="pill">${esc(fmtDate(e.date))}${e.time ? ' · ' + esc(e.time) + ' ' + esc(e.timezone || '') : ''}</span>
          <span class="mp-status" data-status="${past ? 'past' : esc(e.status)}">${status}</span>
        </div>
        <h3 class="media-title">${esc(e.title)}</h3>
        <p class="meta-muted">${esc(e.description || '')}</p>
        ${e.capacity ? `<p class="mp-meta">${esc(e.capacity)} seats</p>` : ''}
      </div>
    </article>`;
}

function renderEvents(items) {
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = items.filter(e => !(e.date && e.date < today)).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const past = items.filter(e => e.date && e.date < today);
  $('events-summary').textContent = `${upcoming.length} upcoming · ${past.length} past`;
  const group = (title, list) => list.length ? `
    <h3 class="mp-subhead">${title}</h3>
    <div class="grid grid-2 mp-event-grid">${list.map(e => eventCard(e, today)).join('')}</div>` : '';
  $('events-list').innerHTML = (group('Upcoming', upcoming) + group('Past sessions', past))
    || emptyState('You have not hosted a workshop or event yet.');
}

function renderCommunity(discussions, replies) {
  $('community-summary').textContent = `${discussions.length} ${discussions.length === 1 ? 'discussion' : 'discussions'} started · ${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}`;
  $('discussions-list').innerHTML = discussions.map(d => `
    <li class="mp-feed-item">
      <a class="mp-feed-title" href="/forum.html">${esc(d.title)}</a>
      <p class="meta-muted">${esc(d.content || '')}</p>
      <p class="mp-meta">${esc(fmtDate(d.createdAt))} · ${d.commentCount} ${d.commentCount === 1 ? 'reply' : 'replies'}</p>
      ${(d.tags || []).length ? `<div class="tag-bar">${d.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}
    </li>`).join('') || '<li class="mp-hint">No discussions started yet.</li>';
  $('replies-list').innerHTML = replies.map(r => `
    <li class="mp-feed-item">
      <blockquote class="mp-quote">${esc(r.content || '')}</blockquote>
      <p class="mp-meta">On <a href="/forum.html">${esc(r.discussionTitle)}</a> · ${esc(fmtDate(r.createdAt))}</p>
    </li>`).join('') || '<li class="mp-hint">No replies yet.</li>';
}

function renderContent(c) {
  const articles = c.articles || [];
  const events = c.events || [];
  const discussions = c.discussions || [];
  const replies = c.replies || [];
  renderArticles(articles);
  renderEvents(events);
  renderCommunity(discussions, replies);
  $('count-articles').textContent = articles.length;
  $('count-events').textContent = events.length;
  $('count-community').textContent = discussions.length + replies.length;
  $('mp-stat-articles').textContent = articles.length;
  $('mp-stat-events').textContent = events.length;
  $('mp-stat-posts').textContent = discussions.length + replies.length;
}

/* ---------- tabs ---------- */

const TABS = ['articles', 'events', 'community'];

function selectTab(name, focus = false) {
  for (const t of TABS) {
    const tab = $('tab-' + t);
    const on = t === name;
    tab.setAttribute('aria-selected', String(on));
    tab.tabIndex = on ? 0 : -1;
    $('panel-' + t).hidden = !on;
    if (on && focus) tab.focus();
  }
  history.replaceState(null, '', '#' + name);
}

function initTabs() {
  for (const t of TABS) $('tab-' + t).addEventListener('click', () => selectTab(t));
  document.querySelector('.mp-tabs').addEventListener('keydown', e => {
    const i = TABS.findIndex(t => $('tab-' + t).getAttribute('aria-selected') === 'true');
    const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: TABS.length - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    selectTab(TABS[(next + TABS.length) % TABS.length], true);
  });
  const fromHash = location.hash.slice(1);
  if (TABS.includes(fromHash)) selectTab(fromHash);
}

/* ---------- certificates (signed-in members) ---------- */

async function loadCertificates() {
  if (!currentUser) return;
  const { ok, data } = await api('/api/certificates');
  const items = (ok && data.items) || [];
  if (!items.length) return;
  $('certificates').innerHTML = items.map(cert => `
    <div class="card">
      <h3>${esc(cert.courseTitle)}</h3>
      <p><strong>${esc(cert.memberDisplayName)}</strong></p>
      <p>Certificate ID: ${esc(cert.certificateId)}</p>
      <p>Instructor: ${esc(cert.instructorName)}</p>
    </div>`).join('');
  $('mp-certs').hidden = false;
}

/* ---------- Hire Marketers listing ---------- */

const LISTING_STATUS = {
  none: { label: 'Not listed', save: 'Submit for review', note: 'New listings are reviewed by an admin before they appear in the directory.' },
  pending: { label: 'Pending review', save: 'Update submission', note: 'An admin is reviewing your listing. You can still edit it.' },
  approved: { label: 'Listed', save: 'Save listing', note: 'You are listed in Hire Marketers. Changes show up right away.' },
  rejected: { label: 'Not approved', save: 'Resubmit for review', note: 'Your listing was not approved. Update it and resubmit, or contact an admin.' }
};
const MAX_SPECIALTIES = 6;
let listing = null;

function renderListing(l, specialties) {
  listing = l;
  const state = l ? l.status : 'none';
  const meta = LISTING_STATUS[state] || LISTING_STATUS.none;
  const badge = $('mp-listing-status');
  badge.textContent = meta.label;
  badge.dataset.status = state;
  $('mp-listing-note').textContent = `Your name, photo, bio and links come from your profile above. ${meta.note}`;
  $('mp-listing-save').textContent = meta.save;
  $('mp-listing-remove').hidden = !l;
  const view = $('mp-listing-view');
  view.hidden = state !== 'approved';
  view.href = '/marketer-profile.html?id=' + encodeURIComponent(saved.uid);

  const chosen = new Set((l && l.specialties) || []);
  $('l-specialties').innerHTML = specialties.map((sp, i) => `
    <label class="mp-check" for="l-sp-${i}">
      <input type="checkbox" id="l-sp-${i}" value="${esc(sp)}"${chosen.has(sp) ? ' checked' : ''}>
      <span>${esc(sp)}</span>
    </label>`).join('');
  limitSpecialties();
  $('l-role').value = (l && l.role) || saved.currentRole || '';
  $('l-years').value = l && l.yearsExperience != null ? l.yearsExperience : '';
  $('l-rateMin').value = l && l.rateMin != null ? l.rateMin : '';
  $('l-rateMax').value = l && l.rateMax != null ? l.rateMax : '';
  $('l-rateType').value = (l && l.rateType) || 'hourly';
  $('l-email').value = (l && l.email) || saved.email || '';
  clearListingErrors();
}

function limitSpecialties() {
  const boxes = [...document.querySelectorAll('#l-specialties input')];
  const full = boxes.filter(b => b.checked).length >= MAX_SPECIALTIES;
  boxes.forEach(b => { b.disabled = full && !b.checked; });
}

function clearListingErrors() {
  document.querySelectorAll('#mp-listing-form .mp-error').forEach(el => { el.textContent = ''; });
  document.querySelectorAll('#mp-listing-form [aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
}

function showListingErrors(fields) {
  let first = null;
  for (const [name, message] of Object.entries(fields || {})) {
    const err = $('err-' + name);
    if (err) err.textContent = message;
    const input = name === 'specialties'
      ? document.querySelector('#l-specialties input')
      : document.querySelector(`#mp-listing-form [name="${name}"]`);
    if (input) {
      if (name !== 'specialties') input.setAttribute('aria-invalid', 'true');
      first = first || input;
    }
  }
  if (first) first.focus();
}

async function saveListing(e) {
  e.preventDefault();
  clearListingErrors();
  const btn = $('mp-listing-save');
  const label = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Saving…';
  const body = {
    role: $('l-role').value.trim(),
    specialties: [...document.querySelectorAll('#l-specialties input:checked')].map(b => b.value),
    yearsExperience: $('l-years').value,
    rateMin: $('l-rateMin').value,
    rateMax: $('l-rateMax').value,
    rateType: $('l-rateType').value,
    email: $('l-email').value.trim()
  };
  try {
    const { ok, status, data } = await api('/api/profile/me/listing', { method: 'PUT', body });
    if (ok) {
      renderListing(data.listing, listingSpecialties);
      toast(data.listing.status === 'approved' ? 'Listing saved.' : 'Listing submitted for review.');
    } else if (status === 400) {
      showListingErrors(data.fields);
      toast('Some listing fields need a fix.', 'error');
      btn.textContent = label;
    } else {
      toast('Could not save your listing. Try again.', 'error');
      btn.textContent = label;
    }
  } catch (err) {
    toast('Could not reach the server. Try again.', 'error');
    btn.textContent = label;
  } finally {
    btn.disabled = false;
  }
}

async function removeListing() {
  if (!window.confirm('Remove your profile from the Hire Marketers directory?')) return;
  const { ok } = await api('/api/profile/me/listing', { method: 'DELETE' });
  if (ok) {
    renderListing(null, listingSpecialties);
    toast('Listing removed.');
    $('mp-listing-save').focus();
  } else {
    toast('Could not remove your listing. Try again.', 'error');
  }
}

let listingSpecialties = [];
async function loadListing() {
  const { ok, data } = await api('/api/profile/me/listing');
  if (!ok) { $('listing').hidden = true; return; }
  listingSpecialties = data.specialties || [];
  renderListing(data.listing, listingSpecialties);
  if (location.hash === '#listing') $('listing').scrollIntoView({ block: 'start' });
}

/* ---------- boot ---------- */

function wireEvents() {
  $('mp-edit-toggle').addEventListener('click', () => setEditing($('mp-edit').hidden));
  $('mp-form').addEventListener('submit', save);
  $('mp-cancel').addEventListener('click', () => { fillForm(saved); toast('Changes discarded.', 'info'); });
  $('f-bio').addEventListener('input', updateBioCount);
  $('mp-avatar-input').addEventListener('change', onAvatarChosen);
  $('mp-listing-form').addEventListener('submit', saveListing);
  $('mp-listing-remove').addEventListener('click', removeListing);
  $('l-specialties').addEventListener('change', limitSpecialties);

  const skillInput = $('f-skill');
  skillInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addSkill(skillInput.value);
      skillInput.value = '';
    } else if (e.key === 'Backspace' && !skillInput.value && skills.length) {
      skills.pop();
      renderSkills();
    }
  });
  skillInput.addEventListener('blur', () => { if (skillInput.value.trim()) { addSkill(skillInput.value); skillInput.value = ''; } });
  $('mp-skill-list').addEventListener('click', e => {
    const btn = e.target.closest('.mp-pill-remove');
    if (!btn) return;
    skills.splice(Number(btn.dataset.index), 1);
    renderSkills();
    skillInput.focus();
  });

  $('mp-add-qual').addEventListener('click', () => {
    quals.push({ type: 'certification', title: '', organization: '', period: '' });
    renderQuals();
    $(`q-title-${quals.length - 1}`).focus();
  });
  $('mp-quals').addEventListener('input', e => {
    const row = e.target.closest('.mp-qual-row');
    if (row && e.target.dataset.field) quals[Number(row.dataset.index)][e.target.dataset.field] = e.target.value;
  });
  $('mp-quals').addEventListener('click', e => {
    const btn = e.target.closest('.mp-qual-remove');
    if (!btn) return;
    quals.splice(Number(btn.dataset.index), 1);
    renderQuals();
    $('mp-add-qual').focus();
  });
}

async function load() {
  const { ok, status, data } = await api('/api/profile/me');
  if (status === 401) {
    window.location.href = '/sign-in.html?returnTo=/profile.html';
    return;
  }
  if (!ok) {
    $('mp-name').textContent = 'Could not load your profile';
    $('mp-bio').textContent = 'Refresh the page to try again.';
    return;
  }
  if (!data.profile) {
    window.location.href = '/onboarding.html';
    return;
  }
  saved = data.profile;
  $('mp-demo-note').hidden = !data.demo;
  renderHero(saved);
  fillForm(saved);
  renderContent(data.content || {});
  $('mp-root').setAttribute('aria-busy', 'false');
  loadListing().catch(() => { $('listing').hidden = true; });
  loadCertificates().catch(() => {});
}

wireEvents();
initTabs();
whenAuthReady().then(user => {
  currentUser = user;
  return load();
}).catch(() => toast('Could not load your profile.', 'error'));
