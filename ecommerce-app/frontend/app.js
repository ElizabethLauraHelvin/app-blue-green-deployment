const $ = s => document.querySelector(s);
const rp = n => 'Rp' + Number(n).toLocaleString('id-ID');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = { get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } }, set: (k, v) => localStorage.setItem(k, JSON.stringify(v)) };

let token = store.get('token', null), user = store.get('user', null), cart = store.get('cart', {}), products = {};
const state = { q: '', category: '', sort: 'new', page: 1 };

async function api(path, opts = {}) {
  const r = await fetch('/api' + path, { ...opts, headers: { 'Content-Type': 'application/json', ...(token && { Authorization: 'Bearer ' + token }) }, body: opts.body && JSON.stringify(opts.body) });
  const data = r.status === 204 ? null : await r.json().catch(() => ({}));
  if (!r.ok) { if (r.status === 401 && token) logout(); throw new Error(data?.error || 'Terjadi kesalahan.'); }
  return data;
}
function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2500); }

const pic = p => /^(\/|https?:)/.test(p.image || '') ? `<img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy">` : `<span aria-hidden="true">${esc(p.image)}</span>`;
// ---- Katalog
async function loadProducts() {
  const qs = new URLSearchParams({ q: state.q, category: state.category, sort: state.sort, page: state.page });
  const d = await api('/products?' + qs);
  d.items.forEach(p => products[p.id] = p);
  $('#cats').innerHTML = ['', ...d.categories].map(c => `<button role="tab" data-c="${esc(c)}" aria-selected="${c === state.category}">${c || 'Semua'}</button>`).join('');
  $('#grid').innerHTML = d.items.length ? d.items.map(p => `
    <article class="card"><div class="img">${pic(p)}</div><div class="body">
      <h3>${esc(p.name)}</h3><p>${esc(p.description)}</p><span class="price">${rp(p.price)}</span>
      <span class="stock">${p.stock ? 'Stok ' + p.stock : 'Stok habis'}</span>
      <button class="primary" data-add="${p.id}" ${p.stock ? '' : 'disabled'}>Tambah ke keranjang</button></div></article>`).join('')
    : '<p class="empty">Tidak ada produk yang cocok. Coba kata kunci atau kategori lain.</p>';
  $('#pager').innerHTML = d.pages > 1 ? Array.from({ length: d.pages }, (_, i) => `<button data-p="${i + 1}" ${i + 1 === d.page ? 'aria-current="true"' : ''}>${i + 1}</button>`).join('') : '';
}

// ---- Keranjang
const saveCart = () => { store.set('cart', cart); renderCart(); };
function renderCart() {
  const ids = Object.keys(cart).filter(id => products[id]);
  $('#cartCount').textContent = Object.values(cart).reduce((a, b) => a + b, 0);
  $('#cartItems').innerHTML = ids.length ? ids.map(id => { const p = products[id]; return `
    <div class="line"><span class="e">${pic(p)}</span><div><strong>${esc(p.name)}</strong><br>${rp(p.price)}</div>
    <div class="qty"><button data-dec="${id}" aria-label="Kurangi">−</button>${cart[id]}<button data-inc="${id}" aria-label="Tambah">+</button></div></div>`; }).join('')
    : '<p class="empty">Keranjang masih kosong. Pilih produk untuk mulai belanja.</p>';
  $('#cartTotal').innerHTML = `<span>Total</span><span>${rp(ids.reduce((s, id) => s + products[id].price * cart[id], 0))}</span>`;
  $('#checkout button').disabled = !ids.length;
}
function change(id, d) {
  const p = products[id]; const n = (cart[id] || 0) + d;
  if (n <= 0) delete cart[id]; else if (n > p.stock) return toast('Stok tidak cukup.'); else cart[id] = n;
  saveCart();
}

// ---- Auth
let mode = 'login';
function setMode(m) {
  mode = m; $('#authTitle').textContent = m === 'login' ? 'Masuk' : 'Daftar akun';
  $('#nameRow').hidden = m === 'login'; $('#authSwitch').textContent = m === 'login' ? 'Belum punya akun? Daftar' : 'Sudah punya akun? Masuk';
  $('#authErr').textContent = '';
}
function renderAuth() { $('#btnAuth').textContent = user ? `Keluar (${user.name})` : 'Masuk'; $('#btnOrders').hidden = !user; }
function logout() { token = user = null; localStorage.removeItem('token'); localStorage.removeItem('user'); renderAuth(); }

// ---- Event
document.addEventListener('click', async e => {
  const t = e.target.closest('button'); if (!t) return;
  const d = t.dataset;
  if (d.add) { change(d.add, 1); toast('Ditambahkan ke keranjang'); }
  else if (d.inc) change(d.inc, 1); else if (d.dec) change(d.dec, -1);
  else if (d.c !== undefined) { state.category = d.c; state.page = 1; loadProducts(); }
  else if (d.p) { state.page = +d.p; loadProducts(); scrollTo(0, 0); }
  else if ('close' in d) { t.closest('dialog')?.close(); if (t.closest('#cart')) $('#cart').hidden = true; }
});
$('#btnCart').onclick = () => { $('#cart').hidden = false; renderCart(); };
$('#btnAuth').onclick = () => user ? (logout(), toast('Anda sudah keluar.')) : ($('#authDlg').showModal(), setMode('login'));
$('#authSwitch').onclick = () => setMode(mode === 'login' ? 'register' : 'login');
$('#authForm').onsubmit = async e => {
  e.preventDefault();
  try {
    const body = Object.fromEntries(new FormData(e.target));
    const d = await api('/auth/' + mode, { method: 'POST', body });
    token = d.token; user = d.user; store.set('token', token); store.set('user', user);
    $('#authDlg').close(); e.target.reset(); renderAuth(); toast('Selamat datang, ' + user.name);
  } catch (err) { $('#authErr').textContent = err.message; }
};
$('#checkout').onsubmit = async e => {
  e.preventDefault();
  if (!user) { $('#cart').hidden = true; $('#authDlg').showModal(); return toast('Masuk dulu untuk membuat pesanan.'); }
  try {
    const items = Object.entries(cart).map(([productId, qty]) => ({ productId: +productId, qty }));
    const o = await api('/orders', { method: 'POST', body: { items, address: new FormData(e.target).get('address') } });
    cart = {}; saveCart(); e.target.reset(); $('#cart').hidden = true; toast(`Pesanan #${o.id} berhasil dibuat.`); loadProducts();
  } catch (err) { toast(err.message); }
};
$('#btnOrders').onclick = async () => {
  try {
    const os = await api('/orders');
    $('#ordList').innerHTML = os.length ? os.map(o => `<div class="ord"><strong>Pesanan #${o.id}</strong> <span class="badge">${esc(o.status)}</span><br>
      ${o.items.map(i => `${esc(i.name)} × ${i.qty}`).join('<br>')}<br><strong>${rp(o.total)}</strong></div>`).join('') : '<p class="empty">Belum ada pesanan.</p>';
    $('#ordDlg').showModal();
  } catch (err) { toast(err.message); }
};
let timer; $('#q').oninput = e => { clearTimeout(timer); timer = setTimeout(() => { state.q = e.target.value; state.page = 1; loadProducts(); }, 300); };
$('#sort').onchange = e => { state.sort = e.target.value; state.page = 1; loadProducts(); };

renderAuth();
loadProducts().then(async () => {
  // muat produk di keranjang yang belum ada di halaman aktif
  for (const id of Object.keys(cart)) if (!products[id]) { try { products[id] = await api('/products/' + id); } catch { delete cart[id]; } }
  saveCart();
}).catch(err => toast(err.message));
