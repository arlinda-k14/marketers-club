import { initFirebase } from '../services/firebase.js';
import '../services/sessionNav.js';
import { api } from '../services/api.js';
import '../styles/main.css';

initFirebase();

function getParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

function syncActiveTag(tag) {
  document.querySelectorAll('#blog-tags [data-tag]').forEach(el => {
    el.classList.toggle('active', (el.dataset.tag || '') === tag);
  });
}

async function load() {
  const tag = getParam('tag') || '';
  syncActiveTag(tag);
  try {
    const { data } = await api('/api/articles' + (tag ? '?tag=' + encodeURIComponent(tag) : ''));
    const list = document.getElementById('blog-list');
    if (!list) return;
    list.innerHTML = (data.articles||[]).map(a => `
      <article class="card media-card">
        ${a.coverImage ? `<div class="media-cover media-cover-article"><img src="${a.coverImage}" alt="${a.title}" loading="lazy"></div>` : ''}
        <div class="media-body">
          <div class="meta-row">
            <span class="pill">${a.category||'Editorial'}</span>
            <span class="meta-muted">${a.readTime||'5 min read'}</span>
          </div>
          <h3 class="media-title">${a.title}</h3>
          <p class="meta-muted">${a.excerpt||''}</p>
          <div class="byline">
            ${a.authorAvatar ? `<img class="avatar avatar-sm" src="${a.authorAvatar}" alt="${a.author}" loading="lazy">` : ''}
            <span>By ${a.author||'Marketers Club'}</span>
          </div>
          <div class="tag-bar">${(a.tags||[]).map(t=>`<span class="tag">${t}</span>`).join('')}</div>
        </div>
      </article>`).join('') || '<div class="status-panel"><h3>No articles yet</h3><p class="meta-muted">Try a different tag.</p></div>';
  } catch(e) {
    const list = document.getElementById('blog-list');
    if (list) list.innerHTML = '<div class="status-panel"><h3>Could not load articles</h3></div>';
  }
}
load();
