// Marketer profiles are the source of truth for a person's name and photo.
// Articles, events, newsletter issues and discussions only store a marketer id
// (plus a denormalised name/avatar as a fallback), and are resolved here on read
// so a profile change shows up everywhere without touching the content docs.

async function loadMarketers(db) {
  const snap = await db.collection('marketer_profiles').get();
  const byId = new Map();
  const byName = new Map();
  snap.forEach(doc => {
    const data = doc.data ? doc.data() : doc;
    const m = { id: doc.id || data.id, ...data };
    byId.set(m.id, m);
    if (m.fullName) byName.set(m.fullName.trim().toLowerCase(), m);
  });
  return { byId, byName };
}

// fields: { id, name, avatar } plus optional extra name fields to keep in sync
// (events store the person under both hostName and speaker).
function resolve(item, index, fields) {
  const nameKeys = [fields.name, ...(fields.alsoName || [])];
  let m = item[fields.id] && index.byId.get(item[fields.id]);
  if (!m) {
    // Legacy or user-submitted docs without an id: match on the stored name.
    const name = nameKeys.map(k => item[k]).find(Boolean);
    m = name && index.byName.get(String(name).trim().toLowerCase());
  }
  if (!m) return item;
  const out = { ...item, [fields.id]: m.id, [fields.avatar]: m.avatar || item[fields.avatar] || '' };
  for (const k of nameKeys) out[k] = m.fullName;
  return out;
}

// Members without a marketer profile (keyed by uid in `users`) also author articles, host events
// and post in the forum. Look up only the ids we are missing, and copy only name and photo.
async function addMembers(db, index, ids) {
  const missing = [...new Set(ids.filter(id => id && !index.byId.has(id)))];
  const docs = await Promise.all(missing.map(id => db.collection('users').doc(id).get().catch(() => null)));
  docs.forEach((doc, i) => {
    if (!doc || !doc.exists) return;
    const u = doc.data();
    const fullName = u.fullName || u.displayName;
    if (fullName) index.byId.set(missing[i], { id: missing[i], fullName, avatar: u.avatar || '' });
  });
}

async function attachMarketers(db, items, fields) {
  if (!items.length) return items;
  try {
    const index = await loadMarketers(db);
    await addMembers(db, index, items.map(item => item[fields.id]));
    return items.map(item => resolve(item, index, fields));
  } catch (e) {
    return items;
  }
}

const AUTHOR = { id: 'authorId', name: 'author', avatar: 'authorAvatar' };
const SPEAKER = { id: 'speakerId', name: 'speaker', alsoName: ['hostName'], avatar: 'speakerAvatar' };

module.exports = { attachMarketers, AUTHOR, SPEAKER };
