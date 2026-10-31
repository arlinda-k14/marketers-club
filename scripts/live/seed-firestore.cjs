// One-time: copies seed/mock-data.json into the live Firestore database.
// The demo member id 'arlinda-kaloshi' becomes Arlinda's real sign-in uid, contact emails move to
// the members-only marketer_private collection, and Arlinda is added to /admins.
// Refuses to run if the live database already has listings, so it never overwrites live edits.
//   npm run seed:live            (writes)
//   npm run seed:live -- --dry-run   (shows what it would write)
const fs = require('fs');
const path = require('path');
const accessToken = require('./firebase-cli-token.cjs');
const PROJECT = 'marketers-club';
const ROOT = `projects/${PROJECT}/databases/(default)/documents`;
const seedPath = path.join(__dirname, '..', '..', 'seed', 'mock-data.json');
const realUid = 'muuXirsF59RVtALwSdGswTj0Lqo2'; // arlinda@creativehubkos.com (Firebase Auth uid, not a secret)
const dryRun = process.argv.includes('--dry-run');
const DEMO = 'arlinda-kaloshi';

const swap = v => Array.isArray(v) ? v.map(swap)
  : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, swap(x)]))
  : v === DEMO ? realUid : v;

const toValue = v => {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toValue) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, toValue(x)])) } };
};

const seed = swap(JSON.parse(fs.readFileSync(seedPath, 'utf8')));
const docs = [];
const put = (path, data) => docs.push({ path, data });

for (const m of seed.marketers || []) {
  const { email, ...listing } = m;
  put(`marketer_profiles/${m.id}`, { ...listing, status: listing.status || 'approved' });
  if (email) put(`marketer_private/${m.id}`, { email });
}
for (const a of seed.articles || []) put(`articles/${a.id}`, a);
for (const e of seed.events || []) put(`events/${e.id}`, e);
for (const n of seed.newsletterIssues || []) put(`newsletter_issues/${n.id}`, n);
for (const d of seed.discussions || []) put(`discussions/${d.id}`, d);
for (const c of seed.comments || []) put(`discussions/${c.discussionId}/comments/${c.id}`, c);
for (const r of seed.resources || []) put(`resources/${r.id}`, r);
for (const u of seed.users || []) {
  const { seeded, ...user } = u;
  put(`users/${u.uid}`, user);
}
put(`admins/${realUid}`, { role: 'admin', grantedAt: new Date().toISOString() });

(async () => {
  const counts = {};
  docs.forEach(d => { const c = d.path.split('/').slice(-2, -1)[0]; counts[c] = (counts[c] || 0) + 1; });
  console.log('documents to write:', counts);
  if (docs.some(d => JSON.stringify(d.data).includes(DEMO + '"'))) throw new Error('demo id left in data');
  if (dryRun) return;
  const token = await accessToken();
  const existing = await fetch(`https://firestore.googleapis.com/v1/${ROOT}/marketer_profiles?pageSize=1`, { headers: { Authorization: 'Bearer ' + token } }).then(r => r.json());
  if ((existing.documents || []).length && !process.argv.includes('--force')) {
    throw new Error('The live database already has listings. Not overwriting (use --force to replace them).');
  }
  const writes = docs.map(d => ({ update: { name: `${ROOT}/${d.path}`, fields: toValue(d.data).mapValue.fields } }));
  const res = await fetch(`https://firestore.googleapis.com/v1/${ROOT}:commit`, {
    method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ writes })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data).slice(0, 800));
  console.log('committed', (data.writeResults || []).length, 'writes at', data.commitTime);
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
