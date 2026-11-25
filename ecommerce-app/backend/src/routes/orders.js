const router = require('express').Router();
const db = require('../db');
const { auth, admin } = require('../middleware');

// Harga & stok selalu dihitung ulang di server dalam satu transaksi atomik.
const checkout = db.transaction((userId, address, items) => {
  let total = 0; const lines = [];
  for (const { productId, qty } of items) {
    const p = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
    if (!p) throw { status: 404, error: `Produk #${productId} tidak ditemukan.` };
    if (p.stock < qty) throw { status: 409, error: `Stok "${p.name}" tidak cukup (sisa ${p.stock}).` };
    db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(qty, p.id);
    total += p.price * qty; lines.push([p.id, p.name, p.price, qty]);
  }
  const o = db.prepare('INSERT INTO orders(user_id,total,address) VALUES (?,?,?)').run(userId, total, address);
  const ins = db.prepare('INSERT INTO order_items(order_id,product_id,name,price,qty) VALUES (?,?,?,?,?)');
  lines.forEach(l => ins.run(o.lastInsertRowid, ...l));
  return o.lastInsertRowid;
});

const withItems = o => ({ ...o, items: db.prepare('SELECT product_id,name,price,qty FROM order_items WHERE order_id = ?').all(o.id) });

router.post('/', auth, (req, res) => {
  const { items, address } = req.body || {};
  if (!address?.trim() || !Array.isArray(items) || !items.length || items.length > 50 ||
      !items.every(i => Number.isInteger(i.productId) && Number.isInteger(i.qty) && i.qty > 0 && i.qty <= 99))
    return res.status(400).json({ error: 'Alamat dan keranjang wajib diisi dengan benar.' });
  try {
    const id = checkout(req.user.id, address.trim(), items);
    res.status(201).json(withItems(db.prepare('SELECT * FROM orders WHERE id = ?').get(id)));
  } catch (e) { e.status ? res.status(e.status).json({ error: e.error }) : (console.error(e), res.status(500).json({ error: 'Gagal memproses pesanan.' })); }
});

router.get('/', auth, (req, res) => {
  const rows = req.user.role === 'admin' && req.query.all
    ? db.prepare('SELECT * FROM orders ORDER BY id DESC').all()
    : db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC').all(req.user.id);
  res.json(rows.map(withItems));
});

router.patch('/:id/status', auth, admin, (req, res) => {
  const ok = ['pending', 'paid', 'shipped', 'completed', 'cancelled'];
  if (!ok.includes(req.body?.status)) return res.status(400).json({ error: 'Status tidak valid.' });
  const r = db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(req.body.status, req.params.id);
  r.changes ? res.json({ ok: true }) : res.status(404).json({ error: 'Pesanan tidak ditemukan.' });
});
module.exports = router;
