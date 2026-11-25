const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { sign, auth } = require('../middleware');

const pub = u => ({ id: u.id, name: u.name, email: u.email, role: u.role });
const emailOk = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

router.post('/register', (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name?.trim() || !emailOk(email) || typeof password !== 'string' || password.length < 8)
    return res.status(400).json({ error: 'Nama, email valid, dan password minimal 8 karakter wajib diisi.' });
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email.toLowerCase()))
    return res.status(409).json({ error: 'Email sudah terdaftar.' });
  const r = db.prepare('INSERT INTO users(name,email,password_hash) VALUES (?,?,?)')
    .run(name.trim(), email.toLowerCase(), bcrypt.hashSync(password, 10));
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(r.lastInsertRowid);
  res.status(201).json({ token: sign(u), user: pub(u) });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  const u = typeof email === 'string' && db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!u || typeof password !== 'string' || !bcrypt.compareSync(password, u.password_hash))
    return res.status(401).json({ error: 'Email atau password salah.' });
  res.json({ token: sign(u), user: pub(u) });
});

router.get('/me', auth, (req, res) => {
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  u ? res.json(pub(u)) : res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
});
module.exports = router;
