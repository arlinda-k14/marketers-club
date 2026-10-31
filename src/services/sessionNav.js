// Public pages link to sign-in ("Member Login", "Join the Community", "Get Started").
// Firebase keeps members signed in on this browser, so once we know someone is signed in,
// point those links at the dashboard instead of asking them to log in again.
import { initFirebase } from './firebase.js';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

initFirebase();

onAuthStateChanged(getAuth(), user => {
  if (!user) return;
  document.querySelectorAll('a[href^="/sign-in.html"]').forEach(a => {
    a.href = '/dashboard.html';
    a.textContent = a.closest('.nav-links') ? 'Dashboard' : 'Go to your dashboard';
  });
});
