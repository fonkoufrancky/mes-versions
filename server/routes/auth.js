const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { list } = require('../lib/db');
const { nanoid } = require('../lib/db');

const router = express.Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'missing_email_or_password' });

  const users = list('users');
  const user = users.find((u) => String(u.email).toLowerCase() === String(email).toLowerCase());
  if (!user) return res.status(401).json({ error: 'invalid_credentials' });

  const ok = await bcrypt.compare(String(password), user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'invalid_credentials' });

  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'dev_secret',
    { expiresIn: '8h' }
  );

  return res.json({ token });
});

module.exports = router;

