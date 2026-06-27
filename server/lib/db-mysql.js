const bcrypt = require('bcryptjs');
const { getPool, ensureDbAndTables } = require('./mysql');
const { seedIfEmpty } = require('./seed');

// This file provides the same functions interface as server/lib/db.js
// for the parts needed by the current routes.

async function initDb() {
  await ensureDbAndTables();

  // Seed admin + demo content into MySQL when users table is empty.
  const pool = getPool();
  try {
    const [countRows] = await pool.query('SELECT COUNT(*) AS c FROM users');
    const count = (countRows && countRows[0] && countRows[0].c) ? countRows[0].c : 0;
    if (count > 0) return;

    // Reuse seed generator for demo values
    const db = {
      users: [],
      devis: [],
      services: [],
      realisations: [],
      blog_posts: [],
      gallery_images: [],
      counters: {},
      settings: {
        companyName: 'KM Root Solutions',
        contactEmail: 'info@kmroot.com',
        phone: '+32 2 123 45 67',
        address: "Chaussée d'Alsemberg 270, 1420 Braine-l'Alleud",
        slogan: 'Excellence technique et services intégrés'
      }
    };

    // seedIfEmpty expects db shape with arrays and counters
    await seedIfEmpty(db);

    // Insert users
    for (const u of db.users || []) {
      await pool.query(
        'INSERT INTO users (id, email, name, role, status, passwordHash, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [u.id, u.email, u.name, u.role, u.status, u.passwordHash, u.createdAt]
      );
    }

    // Insert devis
    for (const d of db.devis || []) {
      await pool.query(
        'INSERT INTO devis (id, fullName, email, phone, company, service, budget, description, desiredTime, status, dateISO, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          d.id,
          d.fullName,
          d.email,
          d.phone || '',
          d.company || '',
          d.service,
          d.budget,
          d.description || '',
          d.desiredTime || '',
          d.status || 'pending',
          d.dateISO,
          d.createdAt
        ]
      );
    }
  } finally {
    await pool.end();
  }
}

async function list(table) {
  const pool = getPool();
  try {
    if (table === 'devis') {
      const [rows] = await pool.query('SELECT * FROM devis ORDER BY id DESC');
      return rows.map((r) => ({
        id: r.id,
        fullName: r.fullName,
        email: r.email,
        phone: r.phone,
        company: r.company,
        service: r.service,
        budget: r.budget,
        description: r.description,
        desiredTime: r.desiredTime,
        status: r.status,
        dateISO: r.dateISO,
        createdAt: r.createdAt
      }));
    }

    if (table === 'users') {
      const [rows] = await pool.query('SELECT id, email, name, role, status, createdAt FROM users');
      return rows.map((r) => ({ id: r.id, email: r.email, name: r.name, role: r.role, status: r.status, createdAt: r.createdAt }));
    }

    if (table === 'settings') {
      const [rows] = await pool.query('SELECT * FROM settings WHERE id = 1');
      if (!rows[0]) return {};
      return {
        companyName: rows[0].companyName,
        contactEmail: rows[0].contactEmail,
        phone: rows[0].phone,
        address: rows[0].address,
        slogan: rows[0].slogan
      };
    }

    // For other tables (services/realisations/etc), keep old JSON approach.
    // This keeps the migration incremental.
    // eslint-disable-next-line global-require
    const jsonDb = require('./db');
    return jsonDb.list(table);
  } finally {
    await pool.end();
  }
}

function get() {
  throw new Error('Not implemented');
}

async function insert(table, row) {
  const pool = getPool();
  try {
    if (table === 'devis') {
      const { fullName, email, phone, company, service, budget, description, desiredTime, status, dateISO, createdAt } = row;
      const [result] = await pool.query(
        'INSERT INTO devis (fullName, email, phone, company, service, budget, description, desiredTime, status, dateISO, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [fullName, email, phone || '', company || '', service, budget, description || '', desiredTime || '', status || 'pending', dateISO, createdAt]
      );
      return { ...row, id: result.insertId };
    }

    // fallback to JSON
    // eslint-disable-next-line global-require
    const jsonDb = require('./db');
    return jsonDb.insert(table, row);
  } finally {
    await pool.end();
  }
}

async function update(table, id, patch) {
  const pool = getPool();
  try {
    if (table === 'devis') {
      const status = patch.status;
      const [result] = await pool.query('UPDATE devis SET status = ? WHERE id = ?', [status, id]);
      if (result.affectedRows === 0) return null;
      const [rows] = await pool.query('SELECT * FROM devis WHERE id = ?', [id]);
      return rows[0]
        ? {
            id: rows[0].id,
            fullName: rows[0].fullName,
            email: rows[0].email,
            phone: rows[0].phone,
            company: rows[0].company,
            service: rows[0].service,
            budget: rows[0].budget,
            description: rows[0].description,
            desiredTime: rows[0].desiredTime,
            status: rows[0].status,
            dateISO: rows[0].dateISO,
            createdAt: rows[0].createdAt
          }
        : null;
    }

    // fallback to JSON
    // eslint-disable-next-line global-require
    const jsonDb = require('./db');
    return jsonDb.update(table, id, patch);
  } finally {
    await pool.end();
  }
}

async function remove() {
  throw new Error('Not implemented');
}

async function nextId() {
  // Only JSON uses nextId. With MySQL AUTO_INCREMENT, we don’t need it.
  const jsonDb = require('./db');
  return jsonDb.nextId(arguments[0]);
}

module.exports = {
  initDb,
  list,
  get,
  insert,
  update,
  remove,
  nextId
};

