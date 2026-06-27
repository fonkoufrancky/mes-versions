require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');

const { initDb } = require('./lib/db');
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const crudRoutes = require('./routes/crud');

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));

app.get('/health', (req, res) => res.json({ ok: true }));

app.use(express.static(path.join(__dirname, '..')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api', crudRoutes);

const port = process.env.PORT || 3001;
const host = process.env.HOST || '0.0.0.0';

initDb()
  .then(() => {
    app.listen(port, host, () => {
      console.log(`[server] Listening on http://${host}:${port}`);
    });
  })
  .catch((err) => {
    console.error('[server] Failed to init db:', err);
    process.exit(1);
  });

