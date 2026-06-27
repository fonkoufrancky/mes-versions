const jwt = require('jsonwebtoken');
const { list } = require('../lib/db');

function requireAuth(req, res, next) {
  const hdr = req.headers['authorization'] || '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice('Bearer '.length) : null;
  if (!token) return res.status(401).json({ error: 'missing_token' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
    req.user = payload;
    return next();
  } catch (e) {
    return res.status(401).json({ error: 'invalid_token' });
  }
}

function requireRole(roles = []) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'unauthorized' });
    const ok = roles.includes(req.user.role) || (roles.includes('admin') && ['super_admin', 'editor'].includes(req.user.role));
    if (!ok) return res.status(403).json({ error: 'forbidden' });
    next();
  };
}

module.exports = { requireAuth, requireRole };

