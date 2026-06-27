const express = require('express');

const { requireAuth } = require('../middleware/auth');
const { list } = require('../lib/db');

const router = express.Router();

function monthKey(d) {
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

router.get('/kpis', requireAuth, (req, res) => {
  const services = list('services');
  const devis = list('devis');
  const realisations = list('realisations');
  const users = list('users');

  res.json({
    kpis: {
      servicesTotal: services.length,
      devisTotal: devis.length,
      projetsTotal: realisations.length,
      clientsTotal: users.filter((u) => u.role === 'client').length || Math.min(320, users.length * 2 + 320) // fallback demo
    }
  });
});

router.get('/devis-last-months', requireAuth, (req, res) => {
  const devis = list('devis');

  // last 6 months labels
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleString('fr-FR', { month: 'short' })
    });
  }

  const counts = months.map((m) => ({ label: m.label, value: 0 }));

  devis.forEach((x) => {
    const key = monthKey(x.dateISO);
    const idx = months.findIndex((m) => m.key === key);
    if (idx !== -1) counts[idx].value++;
  });

  res.json({ series: counts });
});

router.get('/devis-last', requireAuth, (req, res) => {
  const devis = list('devis');
  const sorted = [...devis].sort((a, b) => new Date(b.dateISO) - new Date(a.dateISO)).slice(0, 5);
  res.json({ items: sorted });
});

module.exports = router;

