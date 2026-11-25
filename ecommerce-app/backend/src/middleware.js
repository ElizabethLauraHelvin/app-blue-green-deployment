const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET;

const sign = u => jwt.sign({ id: u.id, role: u.role }, SECRET, { expiresIn: '7d' });

function auth(req, res, next) {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) return res.status(401).json({ error: 'Silakan login terlebih dahulu.' });
  try { req.user = jwt.verify(h.slice(7), SECRET); next(); }
  catch { res.status(401).json({ error: 'Sesi berakhir, silakan login ulang.' }); }
}
const admin = (req, res, next) =>
  req.user?.role === 'admin' ? next() : res.status(403).json({ error: 'Akses khusus admin.' });

module.exports = { sign, auth, admin };
