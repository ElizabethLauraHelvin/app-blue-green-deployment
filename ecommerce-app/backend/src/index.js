require('dotenv').config();
if (!process.env.JWT_SECRET) { console.error('JWT_SECRET belum diset. Salin .env.example ke .env.'); process.exit(1); }
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const app = express();
app.set('trust proxy', 1); 
app.use(helmet());
app.use(express.json({ limit: '100kb' }));
app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 50, standardHeaders: true }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }));
app.use((req, res) => res.status(404).json({ error: 'Endpoint tidak ditemukan.' }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.status ? 'Permintaan tidak valid.' : 'Terjadi kesalahan server.' });
});

const port = process.env.PORT || 3000;
if (require.main === module) app.listen(port, () => console.log(`Backend berjalan di port ${port}`));
module.exports = app;
