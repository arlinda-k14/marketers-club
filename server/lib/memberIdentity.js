// Dev only: lets a signed-in local account use the seeded member record in seed/mock-data.json,
// so the profile and dashboard survive server restarts (the dev store is rebuilt from the seed).
const { getAdmin } = require('../middleware/auth');
const { isDev } = require('./devSeed');

// The local demo member shown when nobody is signed in.
const DEMO_UID = 'arlinda-kaloshi';

// In dev, a seeded member record (seed/mock-data.json `users`) is claimed by the signed-in
// account with the same email, so the demo profile and its content show for that account.
// The email can come from the token or from the member's own onboarding record (auth.js's dev
// shortcut signs every local browser in as `dev-user` with a placeholder email).
async function claimSeededProfile(req) {
  if (!isDev() || !req.user) return;
  const db = getAdmin().firestore();
  const own = await db.collection('users').doc(req.user.uid).get();
  if (own.exists && own.data().seeded) return;
  const emails = [req.user.email, own.exists && own.data().email].filter(Boolean);
  for (const email of emails) {
    const snap = await db.collection('users').where('email', '==', email).get();
    let match = null;
    snap.forEach(doc => {
      const data = doc.data ? doc.data() : doc;
      if (data.seeded && doc.id !== req.user.uid) match = doc.id;
    });
    if (match) { req.user.uid = match; return; }
  }
  // The shared local test account with no onboarding record yet acts as the demo member, so
  // profile edits and saves land on the profile it is shown. Onboarding is the exception: it
  // creates that account's own record, for testing the new-member flow.
  const onboarding = req.originalUrl.split('?')[0].endsWith('/onboarding');
  if (req.user.uid === 'dev-user' && !own.exists && !onboarding) req.user.uid = DEMO_UID;
}

// Express middleware form, for routes behind verifyToken.
function claimSeededProfileMiddleware(req, res, next) {
  claimSeededProfile(req).catch(() => {}).then(() => next());
}

module.exports = { claimSeededProfile, claimSeededProfileMiddleware, DEMO_UID };
