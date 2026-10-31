// Short-lived Google access token from the Firebase CLI's saved login (run `firebase login` first).
// Uses the CLI's public OAuth client, so no service-account key is needed. Nothing is written to disk.
const fs = require('fs');
const os = require('os');
const path = require('path');

module.exports = async function accessToken() {
  const file = path.join(os.homedir(), '.config/configstore/firebase-tools.json');
  const store = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!store.tokens || !store.tokens.refresh_token) throw new Error('Run `firebase login` first.');
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com',
      client_secret: 'j9iVZfS8kkCEFUPaAeJV0sAi',
      refresh_token: store.tokens.refresh_token,
      grant_type: 'refresh_token'
    })
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('Firebase login expired. Run `firebase login --reauth`.');
  return data.access_token;
};
