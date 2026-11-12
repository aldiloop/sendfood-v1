# sendfood-v1
Send Food v1 — village food delivery. Mobile-first PWA (customer, seller, driver, admin) with Supabase backend. Rebuilt from scratch in Kiro for Kiroween 2026.

## Menjalankan

```bash
cd frontend
npm install
npm run dev        # server pengembangan
npm run build      # tsc + vite build (+ service worker PWA)
npm run lint       # oxlint
npm run smoke      # cek semua rute HTTP 200 (jalankan setelah build)
```

Tanpa `.env`, aplikasi berjalan dalam **Mode demo (data contoh)**.
Untuk Supabase live, salin `frontend/.env.example` menjadi `frontend/.env`
lalu isi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`.
Jangan pernah memakai service_role key di frontend; aplikasi menolaknya.
