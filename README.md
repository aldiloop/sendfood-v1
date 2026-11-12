# Send Food v1

Pesan-antar makanan untuk satu desa. Pembeli memesan dari warung tetangga,
warung memasak, kurir desa mengantar, dan pembeli membayar tunai di tempat
(COD). Aplikasinya web (PWA) yang bisa dipasang ke layar utama HP, bukan APK.

Dibangun ulang dari nol di Kiro untuk Kiroween 2026. Spesifikasi, aturan
produk, dan hook Kiro ada di folder [`.kiro/`](.kiro).

## Siapa memakai apa

| Peran | Yang bisa dilakukan |
|---|---|
| Pelanggan | Cari warung dan menu, isi keranjang (satu warung), pesan dengan alamat dan titik lokasi, lihat perkiraan ongkir, pantau status, batalkan selama penjual belum menerima (wajib alasan), simpan alamat |
| Penjual | Ringkasan hari ini, terima atau tolak pesanan (tolak wajib alasan), siapkan sampai "Siap Diambil", batalkan sebelum siap diambil (wajib alasan), kelola menu dengan tombol "Tersedia", ubah profil warung |
| Kurir | Lihat tugas yang ditugaskan, ambil di warung, tandai sudah sampai, tandai selesai, riwayat antar |
| Admin | Ringkasan hari ini, semua pesanan, tugaskan atau ganti kurir, batalkan pesanan yang belum final (wajib alasan), override "selesai" dari "Sudah Sampai" (wajib alasan), aktif/nonaktifkan warung, direktori warga |

## Aturan bisnis yang ditegakkan

- **Ongkir** dihitung server dari jarak garis lurus (Haversine, R bumi
  6.371.008,8 m): sampai 1 km Rp2.000, lalu Rp200 tiap 100 m berikutnya
  (dibulatkan ke atas). Contoh: 2.350 m = Rp4.800. Radius layanan maksimal
  5 km. Checkout hanya menampilkan **perkiraan** dan tidak pernah mengirim
  ongkir atau harga ke server.
- **Klik ganda tidak membuat pesanan dobel:** setiap percobaan checkout
  memakai satu kunci idempotency yang dipakai ulang saat mencoba lagi.
- **Batal per peran:** pelanggan hanya dari "Menunggu Penjual"; penjual dari
  "Menunggu Penjual", "Diterima", "Disiapkan"; admin dari status yang belum
  final. Semua wajib alasan.
- **Selesai** hanya oleh kurir yang bertugas. Admin boleh override hanya dari
  "Sudah Sampai" dan wajib alasan.
- **Pembayaran hanya COD.** Status bayar tampil apa adanya ("Belum Dibayar"
  sampai pencatatan uang tunai diaktifkan), tidak pernah diklaim "lunas".
- **Keamanan:** frontend hanya memakai publishable/anon key. Build berhenti
  bila ada service_role/secret key di variabel `VITE_*`.

Rincian lengkap: [`requirements.md`](.kiro/specs/sendfood-mvp-v1/requirements.md)
dan [`design.md`](.kiro/specs/sendfood-mvp-v1/design.md).

## Teknologi

- React 19, TypeScript, Vite 8, Tailwind CSS v4, React Router 8
- `vite-plugin-pwa` (manifest, ikon, service worker)
- Supabase (Postgres, Auth, RLS, RPC) sebagai backend. Backend dan migrasinya
  dikelola terpisah; aplikasi ini memakai kontrak RPC yang sudah ada:
  `list_stores`, `search_products`, `list_my_orders`, `create_order`,
  `change_order_status`, `assign_order_driver`, `admin_set_store_active`.
- Tema visual Batik Sogan Solo: krem, coklat tua, Soga, Terracotta; emas hanya
  untuk garis motif Kawung/Parang. Teks minimal 16px, tombol minimal 48px.

## Menjalankan

```bash
cd frontend
npm install
npm run dev            # server pengembangan
npm run build          # tsc + vite build (+ service worker PWA)
npm run lint           # oxlint, target 0 error 0 peringatan
npm run smoke          # setelah build: 24 rute + 6 aset PWA harus HTTP 200
npm run test:delivery  # 23 kasus rumus ongkir (2.350 m = Rp4.800)
```

### Mode demo dan mode live

- **Tanpa `.env` yang valid**, aplikasi berjalan dalam **Mode demo (data
  contoh)**: desa contoh tersimpan di localStorage HP itu, dan halaman Masuk
  menyediakan satu tombol per peran.
- **Mode live:** salin `frontend/.env.example` menjadi `frontend/.env`, lalu
  isi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` dengan **publishable
  key** (`sb_publishable_...`). Legacy anon JWT sudah dimatikan di staging.
  File `.env` tidak boleh di-commit.

Daftar uji mode live dan perbedaan demo/live:
[`docs/live-test-checklist.md`](docs/live-test-checklist.md).

## Struktur

```text
.kiro/
  specs/sendfood-mvp-v1/   requirements, design, tasks
  steering/product.md      prinsip produk
  hooks/                   hook Kiro (lint, uji ongkir, tinjau aturan bisnis, cegah secret key)
docs/                      daftar uji live
frontend/
  scripts/                 smoke test, uji ongkir
  src/
    components/            komponen UI (Button, Card, BatikStrip, Icon, ...)
    context/               AuthContext, CartContext
    lib/                   api (adapter demo + live), delivery, format, orderRules, ...
    pages/                 halaman pelanggan, seller/, driver/, admin/
```

## Status

- Task 1–8 selesai dan diverifikasi di mode demo (build, lint, smoke, uji klik
  semua peran).
- Task 9: verifikasi mode demo lolos; **uji mode live belum dijalankan**
  karena lingkungan build tidak bisa menjangkau Supabase.
- Belum dibuat: status otomatis (polling), pilih lokasi di peta, admin
  mengubah radius/lokasi warung, klaim pesanan oleh kurir, notifikasi, bukti
  antar.
