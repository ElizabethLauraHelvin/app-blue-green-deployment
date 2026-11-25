const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let token; try { token = JSON.parse(localStorage.getItem('token')); } catch {}
const msg = t => { $('#msg').textContent = t; };
const H = j => ({ ...(j && { 'Content-Type': 'application/json' }), Authorization: 'Bearer ' + token });
const thumb = p => /^(\/|https?:)/.test(p.image) ? `<img class="th" src="${esc(p.image)}" alt="">` : `<div class="th">${esc(p.image)}</div>`;

async function load() {
  if (!token) return msg('Masuk sebagai admin di halaman toko terlebih dahulu (admin@toko.local).');
  const d = await (await fetch('/api/products?limit=50')).json();
  $('#rows').innerHTML = d.items.map(p => `<tr data-id="${p.id}">
    <td>${thumb(p)}</td><td><strong>${esc(p.name)}</strong><br><input type="file" accept="image/jpeg,image/png,image/webp" aria-label="Foto ${esc(p.name)}"></td>
    <td><input type="number" min="0" name="price" value="${p.price}"></td><td><input type="number" min="0" name="stock" value="${p.stock}"></td>
    <td><button class="primary">Simpan</button></td></tr>`).join('');
}
$('#rows').addEventListener('click', async e => {
  const tr = e.target.closest('tr'); if (!e.target.matches('button') || !tr) return;
  const id = tr.dataset.id; msg('');
  try {
    const cur = await (await fetch('/api/products/' + id)).json();
    let r = await fetch('/api/products/' + id, { method: 'PUT', headers: H(true), body: JSON.stringify({ ...cur, price: +tr.querySelector('[name=price]').value, stock: +tr.querySelector('[name=stock]').value }) });
    if (!r.ok) throw new Error((await r.json()).error);
    const f = tr.querySelector('input[type=file]').files[0];
    if (f) { const fd = new FormData(); fd.append('image', f);
      r = await fetch(`/api/products/${id}/image`, { method: 'POST', headers: H(false), body: fd });
      if (!r.ok) throw new Error((await r.json()).error); }
    msg('Tersimpan.'); load();
  } catch (err) { msg(err.message); }
});
load();
