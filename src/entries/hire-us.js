// Hire Us: the 8-field proposal intake for the Session 10 client delivery
// pipeline. Writes straight to Firestore `contacts` (create only, see
// firestore.rules), with the same keys as the CSO's submission.json in
// ~/.hubsy/.agent/cso-agent, so a request goes into `delivery.py profile` as is.
import { initFirebase } from '../services/firebase.js';
import '../services/sessionNav.js';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import '../styles/main.css';

const { db } = initFirebase();

const FIELDS = ['full_name', 'business_name', 'email', 'need', 'industry', 'budget', 'timeline', 'bottleneck'];
const LIMITS = { full_name: 120, business_name: 160, email: 200, industry: 120, bottleneck: 500 };
const EMAIL = /^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/;

const form = document.getElementById('hire-form');
const status = document.getElementById('hire-status');

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const entry = {};
  for (const key of FIELDS) {
    const value = form.elements[key].value.trim();
    entry[key] = LIMITS[key] ? value.slice(0, LIMITS[key]) : value;
  }
  entry.email = entry.email.toLowerCase();

  const missing = FIELDS.filter(k => !entry[k]);
  FIELDS.forEach(k => form.elements[k].setAttribute('aria-invalid', String(missing.includes(k))));
  if (missing.length || !EMAIL.test(entry.email)) {
    status.textContent = !EMAIL.test(entry.email) && entry.email
      ? 'Please check your email address.'
      : 'Please fill in all eight fields.';
    form.elements[missing[0] || 'email']?.focus();
    return;
  }

  const button = form.querySelector('button');
  button.disabled = true;
  status.textContent = 'Sending…';
  try {
    await addDoc(collection(db, 'contacts'), {
      ...entry,
      source: 'hire_us_form',
      status: 'new',
      createdAt: serverTimestamp(),
    });
    const first = entry.full_name.split(/\s+/)[0];
    document.getElementById('hire-done-title').textContent = `Thanks, ${first}, we've got it.`;
    form.style.display = 'none';
    const done = document.getElementById('hire-done');
    done.style.display = 'block';
    done.focus();
  } catch (err) {
    button.disabled = false;
    status.textContent = 'That did not go through. Please try again in a moment.';
  }
});
