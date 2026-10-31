import { initFirebase } from '../services/firebase.js';
import { api, whenAuthReady } from '../services/api.js';
import { esc, safeUrl } from '../services/marketerFormat.js';
import '../styles/main.css';

initFirebase();

async function loadResources() {
  const user = await whenAuthReady();
  if (!user) {
    window.location.href = '/sign-in.html?returnTo=/resources.html';
    return;
  }
  const { data } = await api('/api/resources');
  const container = document.getElementById('resources');
  container.innerHTML = '';
  for (const r of data.items || []) {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <h3>${esc(r.title)}</h3>
      <p style="color: var(--text-muted);">${esc(r.category)} • ${esc(r.type)}</p>
      ${r.description ? `<p class="meta-muted">${esc(r.description)}</p>` : ''}
      ${r.tier === 'pro' ? '<p style="color: var(--coral); font-weight: 600;">PRO - Contact administrators to unlock</p>' : ''}
      <button class="btn btn-sm">Download</button>
    `;
    card.querySelector('button').addEventListener('click', async () => {
      const res = await api(`/api/resources/${encodeURIComponent(r.id)}/download`, { method: 'POST', body: {} });
      if (res.status === 403) {
        alert('Pro templates stay locked. Please contact administrators.');
        return;
      }
      const url = res.data.fileUrl && (res.data.fileUrl.startsWith('/') ? res.data.fileUrl : safeUrl(res.data.fileUrl));
      if (url) window.open(url, '_blank', 'noopener');
    });
    container.appendChild(card);
  }
}

loadResources();
