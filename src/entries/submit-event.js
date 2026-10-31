import { initFirebase } from '../services/firebase.js';
import '../services/sessionNav.js';
import { api, whenAuthReady } from '../services/api.js';
import '../styles/main.css';

initFirebase();

document.getElementById('submit-event-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const user = await whenAuthReady();
  if (!user) {
    window.location.href = '/sign-in.html?returnTo=/submit-event.html';
    return;
  }
  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData);
  if (data.categoryTags) {
    data.categoryTags = data.categoryTags.split(',').map(s=>s.trim()).filter(Boolean);
  }
  if (data.capacity) data.capacity = Number(data.capacity);
  try {
    const res = await api('/api/events/submit', { method: 'POST', body: data });
    const status = document.getElementById('submit-status');
    if (res.ok) {
      status.textContent = 'Event submitted. Pending approval.';
    } else {
      status.textContent = 'Error submitting event.';
    }
  } catch(err) {
    document.getElementById('submit-status').textContent = 'Error: ' + err.message;
  }
});
