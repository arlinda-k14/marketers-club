import { initFirebase } from '../services/firebase.js';
import { api, whenAuthReady } from '../services/api.js';
import { esc, safeUrl } from '../services/marketerFormat.js';
import '../styles/main.css';

initFirebase();

async function loadMentors() {
  const user = await whenAuthReady();
  if (!user) {
    window.location.href = '/sign-in.html?returnTo=/mentors.html';
    return;
  }
  const { data } = await api('/api/mentors');
  const container = document.getElementById('mentors');
  container.innerHTML = '';
  for (const m of data.items || []) {
    const card = document.createElement('div');
    card.className = 'card';
    const booking = safeUrl(m.bookingUrl);
    card.innerHTML = `
      <h3>${esc(m.mentorName)} <span style="font-size: 0.7rem; color: var(--text-muted);">[SUGGESTION]</span></h3>
      <p style="color: var(--text-muted);">${esc(m.title)} at ${esc(m.company)}</p>
      <p>${esc(m.bio)}</p>
      <p><strong>Specialties:</strong> ${esc((m.specialties || []).join(', '))}</p>
      <p>Availability: ${m.availability ? 'Available' : 'Not Available'}</p>
      ${booking ? `<a href="${esc(booking)}" target="_blank" rel="noopener noreferrer" class="btn btn-sm">Book</a>` : ''}
    `;
    container.appendChild(card);
  }
  if (!(data.items || []).length) container.innerHTML = '<p style="color:var(--text-muted);">No mentors listed yet.</p>';
}

loadMentors();
