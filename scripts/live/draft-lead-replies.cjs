// Drafts one email reply per new lead from the live Firestore: new members (users) and
// messages sent to marketers (contact_inquiries). Read-only against Firestore. Nothing is sent:
// each draft is a Markdown file in drafts/lead-replies/<date>/ for Arlinda to review and send by hand.
// A lead counts as new until it has been drafted once (tracked in drafts/lead-replies/state.json).
//   npm run leads:draft                        (drafts new leads)
//   npm run leads:draft -- --dry-run           (lists new leads, writes nothing)
//   npm run leads:draft -- --all               (redrafts every lead, ignoring state)
//   npm run leads:draft -- --from-file x.json  (uses {users, contact_inquiries, marketer_profiles,
//                                               marketer_private} from a local file, no Firestore)
const fs = require('fs');
const path = require('path');
const accessToken = require('./firebase-cli-token.cjs');
const PROJECT = 'marketers-club';
const ROOT = `projects/${PROJECT}/databases/(default)/documents`;
const SITE = 'https://marketers-club.web.app';
const OUT = path.join(__dirname, '..', '..', 'drafts', 'lead-replies');
const STATE = path.join(OUT, 'state.json');
const seedPath = path.join(__dirname, '..', '..', 'seed', 'mock-data.json');
const realUid = 'muuXirsF59RVtALwSdGswTj0Lqo2'; // Arlinda's own account, never a lead

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const all = args.includes('--all');
const fromFile = args.includes('--from-file') ? args[args.indexOf('--from-file') + 1] : null;

const fromValue = v => {
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('nullValue' in v) return null;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromValue);
  if ('mapValue' in v) return fromFields(v.mapValue.fields || {});
  return null;
};
const fromFields = f => Object.fromEntries(Object.entries(f).map(([k, x]) => [k, fromValue(x)]));
const fromDoc = d => ({ id: d.name.split('/').pop(), ...fromFields(d.fields || {}) });

async function firestoreSource() {
  const token = await accessToken();
  const get = async url => {
    const res = await fetch(`https://firestore.googleapis.com/v1/${ROOT}/${url}`, { headers: { Authorization: 'Bearer ' + token } });
    if (res.status === 404) return null;
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data).slice(0, 400));
    return data;
  };
  const list = async collection => {
    const out = [];
    let pageToken = '';
    do {
      const data = await get(`${collection}?pageSize=300${pageToken ? '&pageToken=' + encodeURIComponent(pageToken) : ''}`);
      out.push(...((data && data.documents) || []).map(fromDoc));
      pageToken = data && data.nextPageToken;
    } while (pageToken);
    return out;
  };
  const one = async p => { const d = await get(p); return d ? fromDoc(d) : null; };
  return {
    users: await list('users'),
    inquiries: await list('contact_inquiries'),
    marketer: id => one(`marketer_profiles/${encodeURIComponent(id)}`),
    marketerEmail: async id => ((await one(`marketer_private/${encodeURIComponent(id)}`)) || {}).email || null
  };
}

function fileSource(file) {
  const d = JSON.parse(fs.readFileSync(file, 'utf8'));
  const byId = rows => Object.fromEntries((rows || []).map(r => [r.id, r]));
  const profiles = byId(d.marketer_profiles);
  const priv = byId(d.marketer_private);
  return {
    users: (d.users || []).map(u => ({ id: u.uid || u.id, ...u })),
    inquiries: d.contact_inquiries || [],
    marketer: async id => profiles[id] || null,
    marketerEmail: async id => (priv[id] || {}).email || null
  };
}

const clean = s => String(s || '').replace(/\s+/g, ' ').trim();
const firstName = s => clean(s).split(' ')[0] || '';

function memberDraft(u) {
  const name = firstName(u.fullName || u.displayName);
  const role = clean(u.currentRole);
  const goal = clean(u.primaryGoal);
  const skill = clean(u.targetSkill);
  const intro = [
    role && `You told us you work as ${role}.`,
    goal && `Your main goal is "${goal}".`,
    skill && `The skill you want to build next is ${skill}.`
  ].filter(Boolean).join(' ');
  return {
    to: clean(u.email),
    subject: name ? `Welcome to Marketers Club, ${name}` : 'Welcome to Marketers Club',
    body: [
      `Hi${name ? ' ' + name : ''},`,
      `Thanks for joining Marketers Club. ${intro}`.trim(),
      'A good first step is the resource library. It has templates and worksheets you can use in your work this week.',
      `Start here: ${SITE}/resources.html`,
      'Arlinda Kaloshi\nMarketers Club'
    ].join('\n\n')
  };
}

function inquiryDraft(q, marketerName, marketerEmail) {
  const who = marketerName || '[Confirm marketer name]';
  const short = marketerName ? firstName(marketerName) : who;
  return {
    to: clean(q.fromEmail),
    subject: `Your message to ${who}`,
    body: [
      'Hi,',
      `Thanks for contacting ${who} through Marketers Club. I've passed your message on, and ${short} will reply to you directly.`,
      'Your message:\n\n> ' + (clean(q.message) || '(empty message)'),
      `You can browse other marketers here: ${SITE}/hire-marketers.html`,
      'Arlinda Kaloshi\nMarketers Club'
    ].join('\n\n'),
    note: marketerEmail
      ? `Before sending: forward the message to ${who} at ${marketerEmail}.`
      : `Before sending: no contact email on file for marketer ${q.marketerId}. Find it before you promise a reply.`
  };
}

function render(lead, draft) {
  const lines = [
    '---',
    'status: draft (not sent)',
    `lead: ${lead.key}`,
    `lead_created: ${lead.createdAt || 'unknown'}`,
    `drafted: ${new Date().toISOString()}`,
    '---',
    '',
    `**To:** ${draft.to || '[Missing email: check Firebase Auth]'}`,
    `**Subject:** ${draft.subject}`,
    '',
    draft.body,
    ''
  ];
  if (draft.note) lines.push('---', '', `_Internal note, do not send: ${draft.note}_`, '');
  return lines.join('\n');
}

(async () => {
  const src = fromFile ? fileSource(fromFile) : await firestoreSource();
  const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  const skip = new Set([realUid, ...(seed.users || []).map(u => u.uid)]);
  const state = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : { drafted: {} };

  const leads = [
    ...src.users.filter(u => !skip.has(u.id) && !u.seeded && !String(u.id).startsWith('_'))
      .map(u => ({ key: `users/${u.id}`, createdAt: u.createdAt, row: u })),
    ...src.inquiries.filter(q => q.fromUid !== realUid && !String(q.id).startsWith('_'))
      .map(q => ({ key: `contact_inquiries/${q.id}`, createdAt: q.createdAt, row: q }))
  ].filter(l => all || !state.drafted[l.key]);

  console.log(`${leads.length} new lead(s)`);
  if (!leads.length) return;
  const day = new Date().toISOString().slice(0, 10);
  const dir = path.join(OUT, day);
  for (const lead of leads) {
    let draft;
    if (lead.key.startsWith('users/')) {
      draft = memberDraft(lead.row);
    } else {
      const m = await src.marketer(lead.row.marketerId);
      draft = inquiryDraft(lead.row, m && clean(m.fullName), await src.marketerEmail(lead.row.marketerId));
    }
    const file = path.join(dir, lead.key.replace('/', '-').replace(/[^\w.-]/g, '_') + '.md');
    console.log(`${dryRun ? 'would draft' : 'drafted'}: ${path.relative(process.cwd(), file)}  (to ${draft.to || 'missing email'})`);
    if (dryRun) continue;
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, render(lead, draft));
    state.drafted[lead.key] = new Date().toISOString();
  }
  if (!dryRun) fs.writeFileSync(STATE, JSON.stringify(state, null, 2) + '\n');
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
