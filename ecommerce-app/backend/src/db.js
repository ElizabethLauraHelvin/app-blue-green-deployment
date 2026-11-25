const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const db = new Database(process.env.DB_FILE || path.join(__dirname, '..', 'shop.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users(
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'customer' CHECK(role IN ('customer','admin')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS products(
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, description TEXT DEFAULT '',
  price INTEGER NOT NULL CHECK(price >= 0), stock INTEGER NOT NULL DEFAULT 0 CHECK(stock >= 0),
  category TEXT DEFAULT 'Lainnya', image TEXT DEFAULT '📦', created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS orders(
  id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id),
  total INTEGER NOT NULL, address TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','paid','shipped','completed','cancelled')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS order_items(
  id INTEGER PRIMARY KEY, order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id), name TEXT NOT NULL,
  price INTEGER NOT NULL, qty INTEGER NOT NULL CHECK(qty > 0));
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_items_order ON order_items(order_id);
`);

if (!db.prepare('SELECT 1 FROM users LIMIT 1').get()) {
  db.prepare('INSERT INTO users(name,email,password_hash,role) VALUES (?,?,?,?)')
    .run('Admin', 'admin@toko.local', bcrypt.hashSync('Admin123!', 10), 'admin');
  const ins = db.prepare('INSERT INTO products(name,description,price,stock,category,image) VALUES (?,?,?,?,?,?)');
  const seed = [
    ['Kopi Gayo 250g', 'Biji kopi arabika Aceh Gayo, roasting medium.', 85000, 40, 'Makanan', '☕'],
    ['Teh Melati Premium', 'Teh melati wangi, isi 25 kantong.', 32000, 80, 'Makanan', '🍵'],
    ['Batik Tulis Pria', 'Kemeja batik tulis katun, ukuran M-XL.', 325000, 15, 'Fashion', '👔'],
    ['Tas Anyaman Rotan', 'Tas tangan rotan buatan pengrajin Jawa.', 189000, 22, 'Fashion', '👜'],
    ['Headphone Nirkabel', 'Bluetooth 5.3, baterai 40 jam.', 459000, 30, 'Elektronik', '🎧'],
    ['Lampu Meja LED', 'Tiga mode cahaya, port USB-C.', 149000, 50, 'Elektronik', '💡'],
    ['Buku Catatan Kulit', 'Notebook A5 sampul kulit, 200 halaman.', 79000, 60, 'Rumah', '📓'],
    ['Gelas Keramik Set 4', 'Gelas keramik glasir, aman microwave.', 120000, 35, 'Rumah', '🍶'],
  ];
  db.transaction(() => seed.forEach(s => ins.run(...s)))();
}
module.exports = db;
