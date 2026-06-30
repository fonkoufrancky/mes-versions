const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { list, insert, nextId } = require('../lib/db');

const router = express.Router();

function signUserToken(user) {
  return jwt.sign(
    { userId: user.id, name: user.name, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'dev_secret',
    { expiresIn: '8h' }
  );
}

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: 'missing_required_fields' });

  const users = list('users');
  const exists = users.some((u) => String(u.email).toLowerCase() === String(email).toLowerCase());
  if (exists) return res.status(409).json({ error: 'email_exists' });

  const passwordHash = await bcrypt.hash(String(password), 10);
  const user = insert('users', {
    id: nextId('userId'),
    name: String(name).trim(),
    email: String(email).trim().toLowerCase(),
    role: 'client',
    status: 'active',
    passwordHash,
    createdAt: new Date().toISOString()
  });

  const token = signUserToken(user);
  return res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'missing_email_or_password' });

  const users = list('users');
  const user = users.find((u) => String(u.email).toLowerCase() === String(email).toLowerCase());
  if (!user) return res.status(401).json({ error: 'invalid_credentials' });

  const ok = await bcrypt.compare(String(password), user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'invalid_credentials' });

  const token = signUserToken(user);
  return res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

module.exports = router;

