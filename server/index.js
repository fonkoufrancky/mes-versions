require('dotenv').config();

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

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api', crudRoutes);

const port = process.env.PORT || 3001;

initDb()
  .then(() => {
    app.listen(port, () => {
      console.log(`[server] Listening on http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error('[server] Failed to init db:', err);
    process.exit(1);
  });

