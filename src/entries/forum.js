import { initFirebase } from '../services/firebase.js';
import { getAuth } from 'firebase/auth';
import { api, whenAuthReady } from '../services/api.js';
import { esc } from '../services/marketerFormat.js';
import '../styles/main.css';

initFirebase();
const auth = getAuth();

async function loadDiscussions() {
  const user = await whenAuthReady();
  if (!user) {
    window.location.href = '/sign-in.html?returnTo=/forum.html';
    return;
  }
  const { data } = await api('/api/forum/discussions');
  const container = document.getElementById('discussions');
  container.innerHTML = '';
  for (const d of data.items || []) {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.marginBottom = '1rem';
    card.innerHTML = `<h3>${esc(d.title)}</h3>
      ${d.author ? `<div class="byline">${d.authorAvatar ? `<img class="avatar avatar-sm" src="${esc(d.authorAvatar)}" alt="${esc(d.author)}" loading="lazy">` : ''}<span>${esc(d.author)}</span></div>` : ''}
      <p>${esc(d.content)}</p><small>${Number(d.commentCount) || 0} comments</small>`;
    container.appendChild(card);
  }
}

document.getElementById('discForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const user = auth.currentUser;
  if (!user) return;
  if (!user.emailVerified) {
    alert('Unverified accounts can only read. Please verify your email.');
    return;
  }
  const res = await api('/api/forum/discussions', {
    method: 'POST',
    body: { title: document.getElementById('discTitle').value, content: document.getElementById('discContent').value }
  });
  if (res.status === 403) {
    alert('Unverified accounts can only read.');
    return;
  }
  if (res.ok) {
    document.getElementById('discForm').reset();
    loadDiscussions();
  }
});

loadDiscussions();
