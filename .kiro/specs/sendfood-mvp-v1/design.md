# Design — Send Food v1 MVP

## Arsitektur

- **Frontend:** React 19 + Vite + TypeScript + Tailwind v4, React Router.
- **Backend:** Supabase (Postgres + Auth + RLS + RPC). Frontend hanya
  memakai anon key; semua aturan sensitif ditegakkan server.
- **Struktur frontend:**

```text
frontend/
  src/
    main.tsx  App.tsx  index.css
    components/   # Badge, Button, Card, Input, Header, BottomNav,
                  #   ProductCard, OrderCard, StatusTimeline,
                  #   EmptyState, ErrorState, Loading, Icon, BatikStrip
    context/      # AuthContext, CartContext
    lib/          # api.ts, delivery.ts, format.ts, mock.ts, supabase.ts
    pages/        # 22 halaman (lihat tasks.md)
```

## Adapter data (`lib/api.ts`)

Satu lapisan adapter dengan dua mode:

- **Live:** Supabase client dari `VITE_SUPABASE_URL` +
  `VITE_SUPABASE_ANON_KEY`; katalog/riwayat via RPC
  (`list_stores`, `search_products`, `list_my_orders` + pagination);
  pesanan via `create_order` (selalu kirim `p_idempotency_key`),
  `change_order_status`, `assign_order_driver`.
- **Demo:** data contoh di `lib/mock.ts` (pengguna, warung, produk,
  pesanan) yang dipersist ke localStorage, supaya perubahan demo
  (tambah produk, ubah status) tetap tersimpan selama sesi.

Mode demo aktif bila `supabase.ts` menilai env tidak valid
(URL/anon key kosong atau masih nilai contoh).

## Ongkir (`lib/delivery.ts`)

```ts
haversineMeters(lat1, lon1, lat2, lon2)   // R = 6.371.008,8 m
calculateDeliveryFee(meters)              // ≤1000 → 2000;
                                          // else 2000 + ceil((m-1000)/100)*200
estimateDeliveryFee(from, to)             // { meters, fee, withinRadius }
isWithinMaxRadius(meters)                 // meters ≤ 5000
formatDistance(meters)                    // "2,35 km"
```

Verifikasi: 2.350 m HARUS menghasilkan Rp4.800. Checkout menampilkan
hasil fungsi ini sebagai "perkiraan" dan TIDAK mengirimkannya ke server.

## Status

- Pesanan: `pending_seller` (Menunggu Penjual), `accepted` (Diterima),
  `preparing` (Disiapkan), `ready_for_pickup` (Siap Diambil),
  `assigned` (Ditugaskan), `on_delivery` (Diantar),
  `completed` (Selesai), `cancelled` (Dibatalkan).
- Bayar: Belum Dibayar / Menunggu Verifikasi / Terverifikasi / Gagal.
- Aturan batal dan selesai per aktor: lihat requirements R7.4–R7.5.
  Semua form batal dan semua override admin wajib meminta alasan.

## Desain visual — Batik Sogan Solo

- **Palet (solid, tanpa gradient):**
  - Latar krem `#FFF9EE`, teks coklat tua `#3A2415` (kontras 13,88).
  - Tombol utama Soga `#6B3A2A` (putih di atasnya 9,28).
  - Aksen Terracotta `#A85C3B` (di krem 4,70).
  - Emas `#B9975B` HANYA garis/dekorasi (kontras 2,62 — gagal AA,
    jangan pernah untuk teks).
  - Sukses hijau daun `#2F6B3A`.
- **Token:** CSS variables + Tailwind `@theme` di `index.css`
  (skala `primary-*` = Soga, `accent-*` = Terracotta, plus
  `cream/ink/soga/terra/gold/leaf`). Kelas komponen: `.btn-primary`,
  `.btn-secondary`, `.btn-ghost`, `.card`, `.input`, `.badge`.
- **Motif:** komponen `BatikStrip` — SVG Kawung (utama) + Parang
  (aksen), garis emas di atas Soga, tinggi 12px, inline tanpa gambar
  luar. Dipakai HANYA sebagai aksen tipis: strip global di atas
  header, bawah hero Home, pembatas Home, atas layar pesanan berhasil,
  atas Login, bawah kartu hero dashboard penjual/kurir/admin.
  JANGAN di belakang teks, harga, tombol, atau form.
- **Ikon:** satu set ikon SVG garis di `components/Icon.tsx`
  (pin, clock, truck, leaf, home, search, basket, receipt, user,
  store, bowl, box, settings, shield, list, users, check, lock,
  phone). Nol emoji di UI. Simbol tipografi ✓/✕ boleh.
- **Aksesibilitas:** teks isi min 16px, tombol min 48px, kontras AA,
  hierarki jelas, satu aksi utama per layar, ringan di HP murah.

## Pengujian

- `npm run build` harus lolos (tsc + vite build).
- `npm run lint` 0 error.
- Smoke test: vite preview + curl 23 entri rute (22 rute + 404),
  semua HTTP 200.
- Uji rumus ongkir: 23 kasus, termasuk 2.350 m = Rp4.800.
