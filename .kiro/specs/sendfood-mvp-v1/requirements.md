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
  Menu Pilihan (dulu "Makanan Populer"; belum memakai data popularitas),
  dan Daftar Warung Aktif (nama, alamat, jam, badge
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
  HANYA dari `delivered` dengan alasan wajib. Aturan ini ditegakkan di
  frontend dan, sejak migrasi 20261112000002, juga di backend
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

## 10. Keputusan pemilik (12 Nov 2026, setelah Task 8)

- R10.1: Warung tutup menurut jam buka: aplikasi memberi peringatan,
  server yang menegakkan (menolak pesanan). Sampai server menolak,
  checkout tetap diblokir di aplikasi.
- R10.2: "Makanan Populer" diganti "Menu Pilihan" sampai ada data
  popularitas sungguhan.
- R10.3: Nomor HP pembeli dibagikan ke kurir HANYA setelah kurir
  ditugaskan ke pesanan itu (perlu dukungan backend).
- R10.4: Status otomatis: polling tiap 20–30 detik; Realtime nanti.
- R10.5: Klaim pesanan oleh kurir boleh; admin tetap boleh menimpa
  (menugaskan ulang).
- R10.6: Bukti antar dibuat setelah MVP.
- R10.7: Masuk dengan Google (OAuth) — desain, BELUM dibangun. Dijadwalkan
  setelah pemilihan lokasi di peta, setelah Google Cloud milik pemilik siap.
  - R10.7.1 (keputusan pemilik 12 Nov 2026, 17:39 WIB): **admin TIDAK boleh
    memakai Google.** Admin hanya masuk dengan email + kata sandi. Penjual,
    kurir, dan pelanggan boleh memakai Google.
    - Tombol "Masuk dengan Google" tidak boleh tampil di alur masuk admin.
      Karena halaman Masuk dipakai bersama, alur admin perlu jalan masuk
      sendiri tanpa tombol Google (bentuknya diputuskan saat dibangun).
    - Penolakan WAJIB ditegakkan di server, bukan hanya disembunyikan di UI:
      sesi dari login Google untuk akun berperan admin harus ditolak, dan
      tidak boleh mendapat hak admin di RPC/RLS. Ini juga berlaku bila akun
      admin punya identitas Google yang tertaut lewat email yang sama.
      Mekanisme di backend (mis. Supabase Auth Hook saat token dibuat, atau
      cek metode login di `current_app_role()`) diputuskan oleh backend.
  - R10.7.2 Pihak ketiga (disiapkan pemilik): proyek Google Cloud, OAuth
    consent screen (nama aplikasi, logo, email dukungan, URL kebijakan
    privasi), dan OAuth client tipe Web. Redirect URI yang diizinkan:
    `https://udizfphgicnavqrlyuaf.supabase.co/auth/v1/callback`.
  - R10.7.3 Backend: aktifkan provider Google di Supabase Auth dengan client
    ID dan client secret. Secret hanya di server, tidak pernah di `VITE_*`.
    Tambahkan URL aplikasi (domain produksi, preview, localhost) ke daftar
    redirect yang diizinkan. Trigger pendaftaran tetap membuat profil
    `customer`; peran lain tetap hanya diatur server.
  - R10.7.4 Frontend: tombol "Masuk dengan Google" di halaman Masuk dan
    Daftar memakai `supabase.auth.signInWithOAuth({ provider: 'google' })`.
    Tombol disembunyikan di mode demo dan di alur admin (R10.7.1).
  - R10.7.5 Frontend: rute callback yang menyelesaikan sesi lalu kembali ke
    `?next=` dengan pemeriksaan jalur aman yang sama (`safeNextPath`, hanya
    jalur internal). Rute ini menambah entri smoke test.
  - R10.7.6 Frontend: langkah "Lengkapi nomor HP" setelah login Google
    pertama, karena Google tidak memberi nomor HP.
  - R10.7.7 Email yang sama: Supabase menautkan identitas dengan alamat
    email yang sama ke satu pengguna, jadi akun email + kata sandi dan akun
    Google dengan email yang sama menjadi satu akun dengan peran yang sama.
    - Risiko: seseorang mendaftar dengan email orang lain lalu tidak
      mengonfirmasinya; saat pemilik email asli masuk dengan Google,
      identitasnya bisa tertaut ke akun milik penyerang. Temuan keamanan
      tahun ini (ANT-2026-7WJV60DR) menggambarkan penautan berdasarkan
      email tanpa memeriksa verifikasi.
    - Wajib: "Confirm email" tetap aktif untuk pendaftaran email, pastikan
      versi Supabase Auth di staging/produksi sudah berisi perbaikan, dan
      hapus akun yang lama tidak dikonfirmasi.
  - R10.7.8 Pilihan peran saat mendaftar — DIPUTUSKAN pemilik (12 Nov 2026,
    17:45 WIB; sebelumnya pertanyaan terbuka). Desain, BELUM dibangun.
    - Halaman Daftar menawarkan tiga pilihan peran: Pelanggan, Penjual,
      Kurir.
    - Pelanggan langsung aktif.
    - Pendaftar yang memilih Penjual atau Kurir berstatus MENUNGGU
      PERSETUJUAN ADMIN. Sebelum admin menyetujui, mereka tidak bisa
      berjualan atau mengantar.
    - Admin TIDAK PERNAH bisa dipilih saat mendaftar. Peran admin hanya
      berasal dari server.
    - Pilihan peran dari aplikasi hanya berupa permintaan. Server yang
      menetapkan peran dan menegakkan status menunggu persetujuan; pendaftar
      yang belum disetujui tidak boleh mendapat hak penjual/kurir di RPC/RLS.
    - Detail teknis (cara menyimpan permintaan peran, layar persetujuan
      admin, dan perlakuan pendaftar lewat Google) dirancang saat dibangun.
