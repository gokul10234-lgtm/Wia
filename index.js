require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/trainers', require('./routes/trainers'));
app.use('/api/fees', require('./routes/fees'));
app.use('/api/schedule', require('./routes/schedule'));
app.use('/api/students', require('./routes/students'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/upload', require('./routes/upload'));

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use(express.static(path.join(__dirname, '..', 'public')));

// Any unknown non-API route falls back to the login page.
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, '..', 'public', 'login.html'));
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Unexpected server error.' });
});

const PORT = process.env.PORT || 4000;

db.init()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Westford Sports - Indian Academy server running on http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('Failed to initialize the database (check TURSO_DATABASE_URL / TURSO_AUTH_TOKEN in .env):', err);
    process.exit(1);
  });
