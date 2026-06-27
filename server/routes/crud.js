const express = require('express');

const { requireAuth, requireRole } = require('../middleware/auth');
const { list, get, insert, update, remove, nextId } = require('../lib/db');

const router = express.Router();

// Map resource -> db table
const resources = {
  services: { table: 'services', idCounter: 'serviceId' },
  realisations: { table: 'realisations', idCounter: 'realisationId' },
  devis: { table: 'devis', idCounter: 'devisId' },
  blog: { table: 'blog_posts', idCounter: 'blogId' },
  gallery: { table: 'gallery_images', idCounter: 'galleryId' },
  users: { table: 'users', idCounter: 'userId' },
  settings: { table: 'settings', idCounter: null, singleton: true }
};

function pick(obj, keys) {
  const out = {};
  keys.forEach((k) => {
    if (obj[k] !== undefined) out[k] = obj[k];
  });
  return out;
}

// Lister
router.get('/services', requireAuth, (req, res) => {
  res.json({ items: list('services') });
});

router.get('/realisations', requireAuth, (req, res) => {
  res.json({ items: list('realisations') });
});

router.get('/devis', requireAuth, (req, res) => {
  res.json({ items: list('devis') });
});

router.get('/blog', requireAuth, (req, res) => {
  res.json({ items: list('blog_posts') });
});

router.get('/gallery', requireAuth, (req, res) => {
  res.json({ items: list('gallery_images') });
});

router.get('/users', requireAuth, (req, res) => {
  res.json({ items: list('users').map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, status: u.status })) });
});

router.get('/settings', requireAuth, (req, res) => {
  const db = require('../lib/db');
  // simplistic singleton read
  const fs = require('fs');
  const path = require('path');
  const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'db.json');
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  const parsed = JSON.parse(raw);
  res.json({ settings: parsed.settings });
});

// Create/update/delete helpers
function requireAdmin(req, res, next) {
  // only allow editors and super_admin
  if (!req.user) return res.status(401).json({ error: 'unauthorized' });
  if (!['super_admin', 'editor'].includes(req.user.role)) return res.status(403).json({ error: 'forbidden' });
  next();
}

// POST /services
router.post('/services', requireAuth, requireAdmin, (req, res) => {
  const { name, category, status } = req.body || {};
  if (!name || !category) return res.status(400).json({ error: 'missing_name_or_category' });
  const id = nextId('serviceId');
  const row = { id, name, category, status: status || 'active', createdAt: new Date().toISOString() };
  insert('services', row);
  res.json({ item: row });
});

router.put('/services/:id', requireAuth, requireAdmin, (req, res) => {
  const id = req.params.id;
  const patch = pick(req.body || {}, ['name', 'category', 'status']);
  const row = update('services', id, patch);
  if (!row) return res.status(404).json({ error: 'not_found' });
  res.json({ item: row });
});

router.delete('/services/:id', requireAuth, requireAdmin, (req, res) => {
  const ok = remove('services', req.params.id);
  res.json({ ok });
});

// Réalisations
router.post('/realisations', requireAuth, requireAdmin, (req, res) => {
  const { title, category, dateLabel, imageUrl } = req.body || {};
  if (!title || !category) return res.status(400).json({ error: 'missing_title_or_category' });
  const id = nextId('realisationId');
  const row = { id, title, category, dateLabel: dateLabel || '', imageUrl: imageUrl || '', createdAt: new Date().toISOString() };
  insert('realisations', row);
  res.json({ item: row });
});

router.put('/realisations/:id', requireAuth, requireAdmin, (req, res) => {
  const patch = pick(req.body || {}, ['title', 'category', 'dateLabel', 'imageUrl']);
  const row = update('realisations', req.params.id, patch);
  if (!row) return res.status(404).json({ error: 'not_found' });
  res.json({ item: row });
});

router.delete('/realisations/:id', requireAuth, requireAdmin, (req, res) => {
  const ok = remove('realisations', req.params.id);
  res.json({ ok });
});

// Blog
router.post('/blog', requireAuth, requireAdmin, (req, res) => {
  const { title, category, dateLabel, content } = req.body || {};
  if (!title || !category) return res.status(400).json({ error: 'missing_title_or_category' });
  const id = nextId('blogId');
  const row = { id, title, category, dateLabel: dateLabel || '', content: content || '', createdAt: new Date().toISOString() };
  insert('blog_posts', row);
  res.json({ item: row });
});

router.put('/blog/:id', requireAuth, requireAdmin, (req, res) => {
  const patch = pick(req.body || {}, ['title', 'category', 'dateLabel', 'content']);
  const row = update('blog_posts', req.params.id, patch);
  if (!row) return res.status(404).json({ error: 'not_found' });
  res.json({ item: row });
});

router.delete('/blog/:id', requireAuth, requireAdmin, (req, res) => {
  const ok = remove('blog_posts', req.params.id);
  res.json({ ok });
});

// Gallery
router.post('/gallery', requireAuth, requireAdmin, (req, res) => {
  const { imageUrl } = req.body || {};
  if (!imageUrl) return res.status(400).json({ error: 'missing_imageUrl' });
  const id = nextId('galleryId');
  const row = { id, imageUrl, createdAt: new Date().toISOString() };
  insert('gallery_images', row);
  res.json({ item: row });
});

router.delete('/gallery/:id', requireAuth, requireAdmin, (req, res) => {
  const ok = remove('gallery_images', req.params.id);
  res.json({ ok });
});

// Settings
router.put('/settings', requireAuth, requireAdmin, (req, res) => {
  const fs = require('fs');
  const path = require('path');
  const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'db.json');
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  const parsed = JSON.parse(raw);

  parsed.settings = {
    ...parsed.settings,
    ...pick(req.body || {}, ['companyName', 'contactEmail', 'phone', 'address', 'slogan'])
  };

  fs.writeFileSync(DATA_FILE, JSON.stringify(parsed, null, 2), 'utf8');
  res.json({ settings: parsed.settings });
});

// Devis list / status update (admin)
router.put('/devis/:id', requireAuth, requireAdmin, (req, res) => {
  const patch = pick(req.body || {}, ['status']);
  const row = update('devis', req.params.id, patch);
  if (!row) return res.status(404).json({ error: 'not_found' });
  res.json({ item: row });
});

module.exports = router;

