import { initFirebase } from '../services/firebase.js';
import '../services/sessionNav.js';
import { api, whenAuthReady } from '../services/api.js';
import '../styles/main.css';

initFirebase();

document.getElementById('article-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const user = await whenAuthReady();
  if (!user) { window.location.href = '/sign-in.html?returnTo=/admin-panel.html'; return; }
  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData);
  if (data.tags) data.tags = data.tags.split(',').map(s=>s.trim()).filter(Boolean);
  try {
    const res = await api('/api/articles', { method: 'POST', body: data });
    document.getElementById('article-status').textContent = res.ok ? 'Article published.' : (res.status === 403 ? 'Only admins can publish.' : 'Error publishing.');
  } catch(err) {
    document.getElementById('article-status').textContent = 'Error: ' + err.message;
  }
});

document.getElementById('newsletter-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const user = await whenAuthReady();
  if (!user) { window.location.href = '/sign-in.html?returnTo=/admin-panel.html'; return; }
  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData);
  if (data.tags) data.tags = data.tags.split(',').map(s=>s.trim()).filter(Boolean);
  if (data.tips) data.tips = data.tips.split('\n').map(s=>s.trim()).filter(Boolean);
  if (data.issueNumber) data.issueNumber = Number(data.issueNumber);
  try {
    const res = await api('/api/newsletter/issues', { method: 'POST', body: data });
    document.getElementById('newsletter-pub-status').textContent = res.ok ? 'Issue published.' : (res.status === 403 ? 'Only admins can publish.' : 'Error publishing.');
  } catch(err) {
    document.getElementById('newsletter-pub-status').textContent = 'Error: ' + err.message;
  }
});
