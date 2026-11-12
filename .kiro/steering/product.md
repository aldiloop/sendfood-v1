# Send Food v1

Send Food adalah PWA pesan-antar makanan untuk satu desa. Pengguna:
pelanggan yang memesan, penjual (warung) yang memasak, kurir yang
mengantar, admin yang mengatur. Pembayaran hanya COD.

## Prinsip produk

- Mudah untuk semua kalangan usia 13+: satu aksi utama per layar,
  copy Bahasa Indonesia sehari-hari, teks besar, tombol besar.
- Jujur: status bayar tampil apa adanya; ongkir dihitung server dari
  jarak, bukan ditebak di layar checkout.
- Murah dan ringan: Rp0, jalan di HP murah, tanpa APK dan tanpa
  payment gateway.

## Prinsip teknis

- Web (PWA), bukan APK. Backend Supabase; frontend tidak pernah
  memegang service_role key.
- Aturan bisnis yang menyangkut uang dan status ditegakkan server;
  UI hanya menampilkan dan meminta alasan bila perlu.
- Mode demo tanpa `.env` supaya aplikasi selalu bisa dicoba.
