const router = require('express').Router();
const db = require('../db');
const fs = require('fs'), path = require('path'), crypto = require('crypto'), multer = require('multer');
const UP = process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads');
fs.mkdirSync(UP, { recursive: true });
const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
const upload = multer({
  storage: multer.diskStorage({ destination: UP, filename: (r, f, cb) => cb(null, crypto.randomBytes(12).toString('hex') + EXT[f.mimetype]) }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (r, f, cb) => cb(EXT[f.mimetype] ? null : new Error('Format harus JPG, PNG, atau WebP.'), !!EXT[f.mimetype]),
});
const { auth, admin } = require('../middleware');

function clean(b) {
  const p = { name: String(b.name || '').trim(), description: String(b.description || ''),
    price: Number(b.price), stock: Number(b.stock), category: String(b.category || 'Lainnya'), image: String(b.image || '📦') };
  if (!p.name || !Number.isInteger(p.price) || p.price < 0 || !Number.isInteger(p.stock) || p.stock < 0) return null;
  return p;
}

router.get('/', (req, res) => {
  const { q = '', category = '', sort = 'new' } = req.query;
  const page = Math.max(1, parseInt(req.query.page) || 1), limit = Math.min(50, parseInt(req.query.limit) || 12);
  const order = { new: 'id DESC', cheap: 'price ASC', expensive: 'price DESC' }[sort] || 'id DESC';
  const where = 'WHERE (name LIKE @q OR description LIKE @q) AND (@c = \'\' OR category = @c)';
  const params = { q: `%${q}%`, c: category };
  const total = db.prepare(`SELECT COUNT(*) n FROM products ${where}`).get(params).n;
  const items = db.prepare(`SELECT * FROM products ${where} ORDER BY ${order} LIMIT @l OFFSET @o`)
    .all({ ...params, l: limit, o: (page - 1) * limit });
  const categories = db.prepare('SELECT DISTINCT category FROM products ORDER BY category').all().map(r => r.category);
  res.json({ items, total, page, pages: Math.ceil(total / limit), categories });
});

router.get('/:id', (req, res) => {
  const p = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  p ? res.json(p) : res.status(404).json({ error: 'Produk tidak ditemukan.' });
});

router.post('/', auth, admin, (req, res) => {
  const p = clean(req.body || {});
  if (!p) return res.status(400).json({ error: 'Data produk tidak valid.' });
  const r = db.prepare('INSERT INTO products(name,description,price,stock,category,image) VALUES (@name,@description,@price,@stock,@category,@image)').run(p);
  res.status(201).json({ id: r.lastInsertRowid, ...p });
});

router.put('/:id', auth, admin, (req, res) => {
  const p = clean(req.body || {});
  if (!p) return res.status(400).json({ error: 'Data produk tidak valid.' });
  const r = db.prepare('UPDATE products SET name=@name,description=@description,price=@price,stock=@stock,category=@category,image=@image WHERE id=@id').run({ ...p, id: req.params.id });
  r.changes ? res.json({ id: +req.params.id, ...p }) : res.status(404).json({ error: 'Produk tidak ditemukan.' });
});

router.delete('/:id', auth, admin, (req, res) => {
  try {
    const r = db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
    r.changes ? res.status(204).end() : res.status(404).json({ error: 'Produk tidak ditemukan.' });
  } catch { res.status(409).json({ error: 'Produk sudah pernah dipesan; set stok ke 0 saja.' }); }
});
// Upload foto produk (admin). Maks 2 MB, JPG/PNG/WebP.
router.post('/:id/image', auth, admin, (req, res) => {
  upload.single('image')(req, res, err => {
    if (err) return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'Ukuran foto maksimal 2 MB.' : err.message });
    if (!req.file) return res.status(400).json({ error: 'Pilih file foto terlebih dahulu.' });
    const old = db.prepare('SELECT image FROM products WHERE id = ?').get(req.params.id);
    if (!old) { fs.unlink(req.file.path, () => {}); return res.status(404).json({ error: 'Produk tidak ditemukan.' }); }
    if (old.image?.startsWith('/uploads/')) fs.unlink(path.join(UP, path.basename(old.image)), () => {});
    const url = '/uploads/' + req.file.filename;
    db.prepare('UPDATE products SET image = ? WHERE id = ?').run(url, req.params.id);
    res.json({ image: url });
  });
});
module.exports = router;
