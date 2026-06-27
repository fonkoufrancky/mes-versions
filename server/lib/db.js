const fs = require('fs');
const path = require('path');
// nanoid v5 is ESM-only in many setups; load it dynamically to keep CommonJS.
let nanoid;
async function loadNanoid() {
  if (nanoid) return nanoid;
  // eslint-disable-next-line no-undef
  const mod = await import('nanoid');
  nanoid = mod.nanoid;
  return nanoid;
}

const { seedIfEmpty } = require('./seed');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const DEFAULT_DB = {
  meta: { version: 1, createdAt: new Date().toISOString() },
  users: [],
  services: [],
  realisations: [],
  devis: [],
  blog_posts: [],
  gallery_images: [],
  settings: {
    companyName: 'KM Root Solutions',
    contactEmail: 'info@kmroot.com',
    phone: '+32 2 123 45 67',
    address: "Chaussée d'Alsemberg 270, 1420 Braine-l'Alleud",
    slogan: 'Excellence technique et services intégrés'
  },
  counters: {
    serviceId: 0,
    realisationId: 0,
    blogId: 0,
    galleryId: 0,
    devisId: 0
  }
};

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function readDb() {
  ensureDir(DATA_DIR);
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2), 'utf8');
  }
  const raw = fs.readFileSync(DB_FILE, 'utf8');
  return JSON.parse(raw);
}

function writeDb(db) {
  ensureDir(DATA_DIR);
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
}

async function initDb() {
  const db = readDb();
  // Seed initial data (admin + demo rows) if empty
  await seedIfEmpty(db);
  writeDb(db);
}

function list(table) {
  const db = readDb();
  return db[table] || [];
}

function get(table, id) {
  const db = readDb();
  return (db[table] || []).find((x) => String(x.id) === String(id)) || null;
}

function insert(table, row) {
  const db = readDb();
  db[table] = db[table] || [];
  db[table].push(row);
  writeDb(db);
  return row;
}

function update(table, id, patch) {
  const db = readDb();
  db[table] = db[table] || [];
  const idx = db[table].findIndex((x) => String(x.id) === String(id));
  if (idx === -1) return null;
  db[table][idx] = { ...db[table][idx], ...patch };
  writeDb(db);
  return db[table][idx];
}

function remove(table, id) {
  const db = readDb();
  db[table] = db[table] || [];
  const before = db[table].length;
  db[table] = db[table].filter((x) => String(x.id) !== String(id));
  const removed = db[table].length !== before;
  if (removed) writeDb(db);
  return removed;
}

function nextId(counterKey) {
  const db = readDb();
  db.counters = db.counters || {};
  db.counters[counterKey] = (db.counters[counterKey] || 0) + 1;
  const n = db.counters[counterKey];
  writeDb(db);
  return n;
}

async function nanoidWrapper(...args) {
  const fn = await loadNanoid();
  return fn(...args);
}

module.exports = {

  initDb,
  list,
  get,
  insert,
  update,
  remove,
  nextId,
  nanoid: nanoidWrapper
};



