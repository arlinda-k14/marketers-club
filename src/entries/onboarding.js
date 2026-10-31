import { initFirebase } from '../services/firebase.js';
import { api, whenAuthReady } from '../services/api.js';
import '../styles/main.css';

initFirebase();

async function submitOnboarding(data) {
  try {
    const res = await api('/api/users/onboarding', { method: 'POST', body: data });
    if (res.ok) {
      window.location.href = '/dashboard.html';
      return;
    }
    alert('Error submitting onboarding: ' + res.status);
  } catch (e) {
    alert('Error: ' + e.message);
  }
}

document.getElementById('onboardingForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData);
  
  const user = await whenAuthReady();
  if (!user) {
    window.location.href = '/sign-in.html?returnTo=/onboarding.html';
    return;
  }
  await submitOnboarding(data);
});
