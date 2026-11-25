# Pasar Nusa — Frontend & Backend terpisah

```
toko/
├── backend/    API Node.js + Express + SQLite   → image: toko-backend  (port 3000)
│   ├── src/ (index.js, db.js, middleware.js, routes/)
│   ├── Dockerfile · package.json · .env.example
├── frontend/   HTML/CSS/JS statis + nginx        → image: toko-frontend (port 80)
│   ├── index.html, admin.html, app.js, admin.js, style.css
│   ├── nginx.conf (proxy /api dan /uploads ke backend) · Dockerfile
└── docker-compose.yml
```

## Jalankan semuanya (docker compose)
```bash
cp .env.example .env      # ganti JWT_SECRET dengan string acak panjang (mis. `openssl rand -hex 32`)
docker compose up -d --build
```
Buka http://localhost:8080 · admin: http://localhost:8080/admin.html
Akun admin awal: `admin@toko.local` / `Admin123!` (segera ganti).

## Build image terpisah
```bash
docker build -t toko-backend  ./backend
docker build -t toko-frontend ./frontend
```
Jalankan manual (frontend mencari backend dengan nama host `backend`, jadi beri alias itu di network yang sama):
```bash
docker network create toko-net
docker run -d --name backend --network toko-net --network-alias backend \
  -e JWT_SECRET=isi-rahasia-panjang -v shop-data:/data toko-backend
docker run -d --name frontend --network toko-net -p 8080:80 toko-frontend
```
Data (database `shop.db` dan foto produk) ada di volume `/data` pada container backend — jangan dihapus.
Jika backend ada di host lain, ubah `proxy_pass` di `frontend/nginx.conf`.

## Tanpa Docker (backend saja)
```bash
cd backend && npm install && cp .env.example .env && npm start   # API di :3000
```

## API
| Method | Endpoint | Akses |
|---|---|---|
| POST | /api/auth/register, /api/auth/login | publik |
| GET | /api/auth/me | login |
| GET | /api/products?q=&category=&sort=&page= | publik |
| POST/PUT/DELETE | /api/products[/:id] | admin |
| POST | /api/products/:id/image (multipart `image`, maks 2 MB) | admin |
| POST | /api/orders `{items:[{productId,qty}],address}` | login |
| GET | /api/orders (admin: `?all=1`) | login |
| PATCH | /api/orders/:id/status | admin |
| GET | /api/health | publik |
