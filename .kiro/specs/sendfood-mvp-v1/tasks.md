# Tasks — Send Food v1 MVP

Kerjakan berurutan. Setiap tahap: implementasi → `npm run build` →
`npm run lint` → verifikasi manual di mode demo. Jangan lanjut ke
tahap berikut bila tahap berjalan gagal build atau ada aturan bisnis
yang dilanggar.

- [ ] 1. Scaffold
  - [ ] 1.1 Vite + React + TypeScript + Tailwind v4, React Router,
    Supabase JS, vite-plugin-pwa.
  - [ ] 1.2 Struktur folder sesuai design.md; `.env.example`
    (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
  - [ ] 1.3 `supabase.ts`: client hanya bila env valid; `isMockMode`
    bila tidak.
  - [ ] 1.4 Layout dasar: lebar maks 480px, Header sticky,
    BottomNav per peran, halaman 404.

- [ ] 2. Fondasi data dan format
  - [ ] 2.1 `lib/mock.ts`: data contoh pengguna, warung, produk, pesanan.
  - [ ] 2.2 `lib/format.ts`: label status pesanan/bayar, format rupiah,
    format jarak.
  - [ ] 2.3 `lib/delivery.ts`: Haversine + rumus ongkir + radius 5 km;
    uji 23 kasus (2.350 m = Rp4.800).
  - [ ] 2.4 `lib/api.ts`: adapter mode demo (localStorage) + mode live
    (RPC: list_stores, search_products, list_my_orders,
    create_order + p_idempotency_key, change_order_status,
    assign_order_driver).

- [ ] 3. Auth dan konteks
  - [ ] 3.1 `AuthContext`: daftar/masuk Supabase Auth + login demo
    4 peran + RoleGuard per rute.
  - [ ] 3.2 `CartContext`: keranjang tersimpan di localStorage.
  - [ ] 3.3 Halaman Login, Register, Profil (+ alamat tersimpan).

- [ ] 4. Pelanggan
  - [ ] 4.1 Home: hero, pencarian, Makanan Populer, Daftar Warung Aktif.
  - [ ] 4.2 Search: filter + urutan.
  - [ ] 4.3 StoreDetail: menu + tambah ke keranjang.
  - [ ] 4.4 Cart: ubah jumlah, ringkasan biaya.
  - [ ] 4.5 Checkout: alamat + catatan + koordinat, estimasi ongkir
    "perkiraan" + peringatan di luar radius; kirim pesanan TANPA ongkir
    lewat `placeOrder()` (satu kunci idempotency per percobaan; tombol
    nonaktif selama mengirim).
  - [ ] 4.6 Layar pesanan berhasil (kode, COD, status bayar, total,
    + "Bayar tunai ke kurir saat pesanan diterima.").
  - [ ] 4.7 Orders + OrderDetail: timeline status, tombol batal hanya
    dari `pending_seller` (alasan wajib), penjelas COD di detail.

- [ ] 5. Penjual
  - [ ] 5.1 Dashboard: ringkasan hari ini + info warung.
  - [ ] 5.2 Products: tambah/edit produk (nama, harga, deskripsi,
    toggle "Tersedia"). TANPA field jumlah stok (backend hanya punya
    `is_available`).
  - [ ] 5.3 Orders: terima/tolak (tolak wajib alasan), ubah status
    sampai `ready_for_pickup`; batal per aturan aktor (alasan wajib).
  - [ ] 5.4 StoreProfile: edit warung + kartu Konfigurasi Pengantaran
    read-only (ongkir otomatis dari jarak, radius maks 5 km).

- [ ] 6. Kurir
  - [ ] 6.1 Dashboard: tugas aktif hari ini.
  - [ ] 6.2 Tasks + TaskDetail: tombol "Tandai Pesanan Selesai"
    (hanya kurir bertugas).
  - [ ] 6.3 History: riwayat pengantaran.

- [ ] 7. Admin
  - [ ] 7.1 Dashboard: metrik hari ini.
  - [ ] 7.2 Orders: semua pesanan, batal dari status mana pun yang
    belum selesai (alasan wajib), tugaskan driver (hanya admin).
  - [ ] 7.3 Orders: override "tandai selesai" HANYA dari `delivered`
    (Sudah Sampai), dengan alasan wajib.
  - [ ] 7.4 Stores + Users: daftar warung dan direktori warga.

- [ ] 8. Tema Batik Sogan Solo
  - [ ] 8.1 Token warna di `index.css` + kelas komponen
    (btn-primary/secondary/ghost, card, input, badge).
  - [ ] 8.2 `BatikStrip` (SVG Kawung + Parang) di titik aksen yang
    ditentukan design.md; hapus semua `bg-gradient` dan
    `backdrop-blur`.
  - [ ] 8.3 `Icon.tsx`: 19 ikon SVG; pastikan 0 emoji di seluruh UI.

- [ ] 9. Verifikasi akhir
  - [ ] 9.1 `npm run build` lolos; `npm run lint` 0 error.
  - [ ] 9.2 Smoke test 24/24 rute HTTP 200 (23 rute + 404, vite preview)
    + 6/6 aset PWA.
  - [ ] 9.3 Uji klik mode demo: pesan → bayar COD → terima → siapkan
    → tugaskan → antar → selesai; batal per aktor.
  - [ ] 9.4 Cek akhir: tanpa transfer manual, tanpa UI rating,
    payment_status tampil apa adanya, tidak ada service_role key.
