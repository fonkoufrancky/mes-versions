const mysql = require('mysql2/promise');

function getEnv(name, fallback) {
  const v = process.env[name];
  if (v === undefined || v === '') return fallback;
  return v;
}

function getPool() {
  const host = getEnv('DB_HOST', '127.0.0.1');
  const user = getEnv('DB_USER', 'root');
  const password = getEnv('DB_PASS', '');
  const database = getEnv('DB_NAME', 'km_root_solutions');

  return mysql.createPool({
    host,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
}

async function ensureDbAndTables() {
  const host = getEnv('DB_HOST', '127.0.0.1');
  const user = getEnv('DB_USER', 'root');
  const password = getEnv('DB_PASS', '');
  const database = getEnv('DB_NAME', 'km_root_solutions');

  // Connect without database first (create db if needed)
  const tmp = mysql.createConnection({
    host,
    user,
    password,
    multipleStatements: true
  });

  await tmp.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
  await tmp.end();

  const pool = getPool();

  // Minimal schema needed for the current app: devis + users + settings + devis status updates.
  // We include counters are unnecessary in SQL (AUTO_INCREMENT used), so the app layer will not rely on counters.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(190) NOT NULL UNIQUE,
      name VARCHAR(190) NOT NULL,
      role VARCHAR(64) NOT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'active',
      passwordHash VARCHAR(255) NOT NULL,
      createdAt VARCHAR(64) NOT NULL
    ) ENGINE=InnoDB;

    CREATE TABLE IF NOT EXISTS devis (
      id INT AUTO_INCREMENT PRIMARY KEY,
      fullName VARCHAR(190) NOT NULL,
      email VARCHAR(190) NOT NULL,
      phone VARCHAR(64) NOT NULL DEFAULT '',
      company VARCHAR(190) NOT NULL DEFAULT '',
      service VARCHAR(190) NOT NULL,
      budget VARCHAR(64) NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      desiredTime VARCHAR(190) NOT NULL DEFAULT '',
      status ENUM('pending','accepted','rejected') NOT NULL DEFAULT 'pending',
      dateISO VARCHAR(64) NOT NULL,
      createdAt VARCHAR(64) NOT NULL
    ) ENGINE=InnoDB;

    CREATE TABLE IF NOT EXISTS settings (
      id INT PRIMARY KEY,
      companyName VARCHAR(190) NOT NULL,
      contactEmail VARCHAR(190) NOT NULL,
      phone VARCHAR(64) NOT NULL,
      address VARCHAR(255) NOT NULL,
      slogan VARCHAR(255) NOT NULL
    ) ENGINE=InnoDB;
  `);

  // Ensure singleton settings row
  const [rows] = await pool.query('SELECT id FROM settings WHERE id = 1');
  if (rows.length === 0) {
    const companyName = getEnv('SET_COMPANY_NAME', 'KM Root Solutions');
    const contactEmail = getEnv('SET_CONTACT_EMAIL', 'info@kmroot.com');
    const phone = getEnv('SET_PHONE', '+32 2 123 45 67');
    const address = getEnv('SET_ADDRESS', "Chaussée d'Alsemberg 270, 1420 Braine-l'Alleud");
    const slogan = getEnv('SET_SLOGAN', 'Excellence technique et services intégrés');

    await pool.query(
      'INSERT INTO settings (id, companyName, contactEmail, phone, address, slogan) VALUES (1, ?, ?, ?, ?, ?)',
      [companyName, contactEmail, phone, address, slogan]
    );
  }

  await pool.end();
}

module.exports = { getPool, ensureDbAndTables };

