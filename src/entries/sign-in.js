import { initFirebase } from '../services/firebase.js';
import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword } from 'firebase/auth';
import '../styles/main.css';

initFirebase();
const auth = getAuth();

const params = new URLSearchParams(window.location.search);
// Only follow returnTo within this site, never to another domain.
const requested = params.get('returnTo') || '';
const returnTo = /^\/(?!\/)/.test(requested) && !requested.includes('\\') ? requested : '/dashboard.html';

// Already signed in on this browser: skip the form.
onAuthStateChanged(auth, user => {
  if (user) window.location.replace(returnTo);
});

document.getElementById('googleSignIn')?.addEventListener('click', async () => {
  try {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
    window.location.href = returnTo;
  } catch (e) {
    alert('Error: ' + e.message);
  }
});

document.getElementById('emailForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
    window.location.href = returnTo;
  } catch (e) {
    alert('Error: ' + e.message);
  }
});
