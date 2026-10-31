if (!global.__mockStore) global.__mockStore = new Map();
const store = global.__mockStore;

// MOCK DATA — fictional content seeded in dev for every section.
function hydrateSeed() {
  if (store.size) return;
  try {
    const seed = require('../../seed/mock-data.json');
    for (const m of seed.marketers || []) store.set('marketer_profiles/' + m.id, m);
    for (const e of seed.events || []) store.set('events/' + e.id, e);
    for (const a of seed.articles || []) store.set('articles/' + a.id, a);
    for (const n of seed.newsletterIssues || []) store.set('newsletter_issues/' + n.id, n);
    for (const d of seed.discussions || []) store.set('discussions/' + d.id, d);
    for (const c of seed.comments || []) store.set('discussions/' + c.discussionId + '/comments/' + c.id, c);
    for (const u of seed.users || []) store.set('users/' + u.uid, u);
    for (const r of seed.resources || []) store.set('resources/' + r.id, r);
  } catch (e) {
    // seed is optional
  }
}
hydrateSeed();

class MockDoc {
  constructor(collectionName, id) {
    this.collectionName = collectionName;
    this.id = id;
  }
  async get() {
    const key = `${this.collectionName}/${this.id}`;
    const data = store.get(key);
    return {
      exists: !!data,
      data: () => data,
      id: this.id
    };
  }
  async set(data, options = {}) {
    const key = `${this.collectionName}/${this.id}`;
    if (options && options.merge && store.has(key)) {
      store.set(key, { ...store.get(key), ...data });
    } else {
      store.set(key, data);
    }
    return { writeTime: new Date() };
  }
  collection(name) {
    return new MockCollection(`${this.collectionName}/${this.id}/${name}`);
  }
  async delete() {
    store.delete(`${this.collectionName}/${this.id}`);
    return { writeTime: new Date() };
  }
  async update(data) {
    const key = `${this.collectionName}/${this.id}`;
    const existing = store.get(key) || {};
    store.set(key, { ...existing, ...data });
    return { writeTime: new Date() };
  }
}

class MockQuerySnapshot {
  constructor(docs) {
    this.docs = docs;
  }
  forEach(fn) {
    this.docs.forEach(fn);
  }
  get size() {
    return this.docs.length;
  }
}

class MockCollection {
  constructor(name) {
    this.name = name;
  }
  doc(id) {
    if (id) return new MockDoc(this.name, id);
    const newId = Math.random().toString(36).substr(2, 9);
    return new MockDoc(this.name, newId);
  }
  async add(data) {
    const newId = Math.random().toString(36).substr(2, 9);
    const key = `${this.name}/${newId}`;
    store.set(key, data);
    return { id: newId };
  }
  // Direct children only, so `discussions` does not also return `discussions/d1/comments/c1`.
  childId(key) {
    if (!key.startsWith(this.name + '/')) return null;
    const rest = key.slice(this.name.length + 1);
    return rest && !rest.includes('/') ? rest : null;
  }
  async get() {
    const docs = [];
    for (const [key, value] of store.entries()) {
      const id = this.childId(key);
      if (id) docs.push({ id, data: () => value, exists: true });
    }
    return new MockQuerySnapshot(docs);
  }
  where(field, op, queryValue) {
    // Supports a single where clause (enough for the local mock store)
    const self = this;
    return {
      where: () => self,
      orderBy: () => self,
      async get() {
        const docs = [];
        for (const [key, docData] of store.entries()) {
          if (!self.childId(key)) continue;
          let match = false;
          if (op === '==') {
            match = docData[field] === queryValue;
          } else if (op === 'array-contains') {
            match = Array.isArray(docData[field]) && docData[field].includes(queryValue);
          } else if (op === '!=') {
            match = docData[field] !== queryValue;
          }
          if (match) {
            const id = self.childId(key);
            docs.push({ id, data: () => docData, exists: true });
          }
        }
        return new MockQuerySnapshot(docs);
      }
    };
  }
  orderBy(field, direction) {
    return this;
  }
}

class MockFirestore {
  collection(name) {
    return new MockCollection(name);
  }
  // Every collection called `name` at any depth, e.g. all `comments` under all discussions.
  collectionGroup(name) {
    const run = (filter) => {
      const docs = [];
      for (const [key, value] of store.entries()) {
        const parts = key.split('/');
        if (parts.length < 2 || parts[parts.length - 2] !== name) continue;
        if (filter && value[filter.field] !== filter.value) continue;
        docs.push({ id: parts[parts.length - 1], path: key, data: () => value, exists: true });
      }
      return new MockQuerySnapshot(docs);
    };
    return {
      where: (field, op, value) => ({ async get() { return run({ field, value }); } }),
      async get() { return run(null); }
    };
  }
  FieldValue = {
    serverTimestamp: () => new Date(),
    arrayUnion: (...args) => args,
    increment: (n) => n
  };
}

module.exports = { MockFirestore, store, hydrateSeed };
