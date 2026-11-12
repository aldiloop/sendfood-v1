# Requirements — Send Food v1 MVP

PWA pesan-antar makanan satu desa. 4 peran: pelanggan, penjual, kurir,
admin. Bahasa antarmuka: Bahasa Indonesia sehari-hari.

## 1. Platform dan akses

- R1.1: Aplikasi adalah web app (PWA), mobile-first, lebar konten maks
  480px. Bukan APK.
- R1.2: Aplikasi dapat dipasang ke layar utama HP (manifest + ikon +
  service worker).
- R1.3: Tanpa file `.env` yang valid, aplikasi jalan dalam mode demo
  dengan data contoh dan menampilkan badge "Mode demo (data contoh)".
- R1.4: Dengan `.env` berisi `VITE_SUPABASE_URL` dan
  `VITE_SUPABASE_ANON_KEY` yang valid, aplikasi memakai Supabase live.
- R1.5: Frontend TIDAK PERNAH memakai service_role key.

## 2. Autentikasi dan peran

- R2.1: Pengguna bisa daftar dan masuk (email + kata sandi, Supabase Auth).
- R2.2: Ada login demo per peran (pelanggan, penjual, kurir, admin) untuk
  pengujian tanpa akun.
- R2.3: Rute `/seller/*` hanya untuk penjual, `/driver/*` hanya untuk
  kurir, `/admin/*` hanya untuk admin; peran lain dialihkan.
- R2.4: Profil pengguna menampilkan data akun dan alamat tersimpan
  (tambah dan hapus alamat).

## 3. Pelanggan

- R3.1: Beranda menampilkan hero sambutan, pencarian warung/menu,
  Makanan Populer, dan Daftar Warung Aktif (nama, alamat, jam, badge
  Buka/Tutup, ongkir mulai Rp2.000, radius).
- R3.2: Pencarian bisa memfilter dan mengurutkan hasil (nama, terdekat,
  terjauh, termurah, termahal). TIDAK ada urutan "ongkir": RPC
  mengurutkannya dengan tarif lama tersimpan yang sudah tidak dipakai.
- R3.3: Detail warung menampilkan menu; pelanggan bisa menambah item ke
  keranjang.
- R3.4: Keranjang tersimpan di localStorage dan tetap ada setelah
  checkout gagal atau halaman dimuat ulang.
- R3.5: Checkout meminta alamat, catatan, dan koordinat lokasi;
  menampilkan estimasi ongkir dari jarak dengan label "perkiraan" dan
  peringatan bila di luar radius 5 km.
- R3.6: Checkout TIDAK mengirim ongkir ke server — ongkir ditetapkan
  server saat order dibuat.
- R3.7: Setelah pesan dibuat, tampil layar sukses berisi kode pesanan,
  metode COD, status bayar, dan total, ditambah kalimat penjelas
  "Bayar tunai ke kurir saat pesanan diterima."
- R3.8: Daftar pesanan dan detail pesanan menampilkan timeline status.
  Detail pesanan juga menampilkan kalimat penjelas COD di atas.
- R3.9: Pelanggan bisa membatalkan pesanan HANYA dari status
  `pending_seller`, dengan alasan wajib.

## 4. Penjual

- R4.1: Dashboard menampilkan ringkasan pesanan hari ini dan info warung
  (ongkir mulai Rp2.000, radius).
- R4.2: Penjual bisa tambah dan edit produk (nama, harga, deskripsi,
  dan toggle "Tersedia"). Backend tidak punya kolom stok (hanya
  `is_available`), jadi TIDAK ada field jumlah stok dan frontend tidak
  boleh membuat stok palsu.
- R4.3: Penjual bisa menerima dan menolak pesanan (tolak wajib alasan),
  serta mengubah status pesanan sampai `ready_for_pickup`
  (Diterima → Disiapkan → Siap Diambil), sesuai backend.
- R4.4: Profil warung bisa diedit (nama, deskripsi, alamat, telepon).
- R4.5: Kartu "Konfigurasi Pengantaran" bersifat read-only dan
  menampilkan ongkir otomatis dari jarak (bukan tarif tersimpan),
  radius layanan (maks 5 km), dan koordinat warung.

## 5. Kurir

- R5.1: Dashboard menampilkan tugas aktif hari ini.
- R5.2: Daftar dan detail tugas menampilkan alamat, item, dan total.
- R5.3: Kurir bertugas bisa menandai pesanan selesai dari detail tugas.
- R5.4: Riwayat menampilkan pengantaran yang sudah selesai.

## 6. Admin

- R6.1: Dashboard menampilkan metrik operasional hari ini.
- R6.2: Admin melihat semua pesanan, bisa membatalkan dari status mana
  pun yang belum selesai (alasan wajib), dan menugaskan driver
  (hanya admin yang bisa menugaskan).
- R6.3: Admin bisa menandai pesanan selesai sebagai override HANYA dari
  status `delivered` (Sudah Sampai), dengan alasan wajib. Admin tidak
  menjalankan tahap penjual/kurir (terima, siapkan, ambil, sampai).
- R6.4: Admin melihat direktori warga dan daftar warung.

## 7. Aturan bisnis (wajib sama persis dengan backend)

- R7.1: Rumus ongkir — jarak ≤1.000 m = Rp2.000 flat; di atasnya
  Rp2.000 + Rp200 per 100 m kelebihan, dibulatkan ke atas.
  Contoh acuan yang HARUS benar: 2.350 m = Rp4.800.
- R7.2: Jarak dihitung dengan Haversine (R bumi 6.371.008,8 m).
- R7.3: Radius layanan maksimum 5 km.
- R7.4: Pembatalan per aktor — pelanggan hanya dari `pending_seller`;
  toko dari `pending_seller`/`accepted`/`preparing`; admin dari status
  mana pun yang belum selesai. Alasan batal wajib di semua form.
- R7.5: Pesanan selesai HANYA oleh kurir bertugas; admin boleh override
  HANYA dari `delivered` dengan alasan wajib. Frontend menegakkan ini
  di frontend dan, sejak migrasi 20261112000002, juga di backend
  (`completion_reason_required`; batal dari status akhir ditolak server).
- R7.6: Pembayaran HANYA COD. Transfer manual tertutup — jangan
  tampilkan sebagai opsi. Tanpa UI rating.
- R7.7: Status bayar tampil apa adanya (Belum Dibayar / Menunggu
  Verifikasi / Terverifikasi / Gagal) — jangan pernah diklaim "lunas"
  bila statusnya bukan Terverifikasi. Pencatatan uang COD di backend
  masih mati, jadi pesanan selesai tetap "Belum Dibayar"; tampilkan
  penjelas "Bayar tunai ke kurir saat pesanan diterima."
- R7.8: `create_order` selalu mengirim `p_idempotency_key` agar klik
  ganda tidak membuat pesanan duplikat. Kunci dibuat SEKALI per
  percobaan checkout (disimpan bersama sidik keranjang) dan dipakai
  ulang saat coba lagi; diganti hanya bila isi keranjang berubah atau
  setelah berhasil. Checkout memakai `placeOrder()` di `lib/api.ts`.
- R7.9: Alur status pesanan (enum backend): `pending_seller` (Menunggu
  Penjual) → `accepted` (Diterima) → `preparing` (Disiapkan) →
  `ready_for_pickup` (Siap Diambil; tampil "Ditugaskan" bila sudah ada
  kurir) → `picked_up` (Diantar) → `delivered` (Sudah Sampai) →
  `completed` (Selesai). Jalur akhir lain: `rejected` (Ditolak Penjual,
  dari `pending_seller`) dan `cancelled` (Dibatalkan). Penugasan kurir
  mengisi `driver_id`, bukan status tersendiri.

## 8. Desain

- R8.1: Tema Batik Sogan Solo (lihat design.md): krem, coklat tua,
  Soga, Terracotta; emas HANYA garis dekoratif.
- R8.2: Tanpa gradient ungu/biru, tanpa glassmorphism, tanpa emoji
  sebagai ikon UI (ikon SVG satu gaya).
- R8.3: Teks isi minimal 16px, tombol minimal 48px, kontras teks
  memenuhi WCAG AA (4.5:1).
- R8.4: Copy Bahasa Indonesia sehari-hari; satu aksi utama per layar;
  konten aman untuk usia 13+.

## 9. Backend (kontrak yang dipakai)

- R9.1: Katalog dan riwayat lewat RPC Supabase (`list_stores`,
  `search_products`, `list_my_orders`) dengan pagination, bukan baca
  tabel langsung.
- R9.2: Pesanan lewat RPC `create_order`, `change_order_status`,
  `assign_order_driver`.
- R9.3: Skema, migrasi, dan RPC backend sudah ada di repo lama
  `aldiloop/sendfood` (branch `backend-mvp-hardening`) dan live di
  staging — rebuild ini memakai kontrak itu, bukan membuat backend
  baru dari nol.
