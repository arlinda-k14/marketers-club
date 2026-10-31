// Dev only: write member edits back to seed/mock-data.json so they survive a server restart
// (the mock store is rebuilt from the seed file on start). Never runs in production.
const fs = require('fs');
const path = require('path');

const SEED_PATH = path.join(__dirname, '..', '..', 'seed', 'mock-data.json');

function isDev() {
  return process.env.NODE_ENV !== 'production';
}

// Merge `fields` into the record with `idKey === id` in seed[listKey], or remove it when
// fields is null.
function persistRecord(listKey, idKey, id, fields) {
  if (!isDev()) return false;
  const seed = JSON.parse(fs.readFileSync(SEED_PATH, 'utf8'));
  const list = Array.isArray(seed[listKey]) ? seed[listKey] : [];
  const i = list.findIndex(r => r[idKey] === id);
  if (fields === null) {
    if (i < 0) return false;
    list.splice(i, 1);
  } else {
    const next = { ...(i >= 0 ? list[i] : {}), ...fields, [idKey]: id };
    if (i >= 0) list[i] = next; else list.push(next);
  }
  seed[listKey] = list;
  // Write to a temp file and rename, so a crash mid-write cannot corrupt the seed.
  const tmp = SEED_PATH + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(seed, null, 2) + '\n');
  fs.renameSync(tmp, SEED_PATH);
  return true;
}

const persistUser = (uid, fields) => persistRecord('users', 'uid', uid, fields);
const persistMarketer = (id, fields) => persistRecord('marketers', 'id', id, fields);

module.exports = { isDev, persistUser, persistMarketer };
