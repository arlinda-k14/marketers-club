import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

// MOCK DATA — fictional content only. Never run against production data.
const __dirname = dirname(fileURLToPath(import.meta.url));
const seed = JSON.parse(readFileSync(join(__dirname, '..', 'seed', 'mock-data.json'), 'utf8'));

console.log('MOCK DATA — fictional content only');

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || '',
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'marketers-club',
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.VITE_FIREBASE_APP_ID || ''
};

async function seedAll() {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    for (const m of seed.marketers || []) await setDoc(doc(db, 'marketer_profiles', m.id), m);
    for (const e of seed.events || []) await setDoc(doc(db, 'events', e.id), e);
    for (const a of seed.articles || []) await setDoc(doc(db, 'articles', a.id), a);
    for (const n of seed.newsletterIssues || []) await setDoc(doc(db, 'newsletter_issues', n.id), n);
    for (const d of seed.discussions || []) await setDoc(doc(db, 'discussions', d.id), d);
    for (const c of seed.comments || []) await setDoc(doc(db, 'discussions', c.discussionId, 'comments', c.id), c);
    for (const u of seed.users || []) await setDoc(doc(db, 'users', u.uid), u);
    for (const r of seed.resources || []) await setDoc(doc(db, 'resources', r.id), r);
    console.log('Seeded mock data');
  } catch (e) {
    console.log('Seed skipped:', e.message);
  }
}

seedAll();
