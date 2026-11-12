# Live test checklist (Supabase staging)

This test must run from a machine whose network can reach
`https://udizfphgicnavqrlyuaf.supabase.co`. The Kiro sandbox used to build the
app blocks `*.supabase.co`, so **none of the steps below have been run from the
sandbox**. Mark each step with the date, tester and result.

## Setup

```bash
cd frontend
cp .env.example .env   # fill VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY (sb_publishable_...)
npm install
npm run dev            # open the printed URL on a phone-sized window (390 px)
```

Check: the header must NOT show "Mode demo (data contoh)". If it does, the
`.env` is not valid and you are testing demo mode.

Accounts you need:
- a new email you control (for sign-up as customer);
- the staging seller, driver and admin test accounts (credentials from the
  backend owner; not stored in this repo).

Staging shops are near `-7.4765, 111.7908`. Delivery points must be within
5 km of the shop, so type a nearby point at checkout, e.g. `-7.4790, 111.7930`.

## Steps

| # | Role | Action | Expected | Result |
|---|---|---|---|---|
| 1 | Guest | Open `/register`, sign up with the new email | "Cek emailmu" if email confirmation is on, otherwise logged in as Pelanggan | |
| 2 | Customer | Confirm email, log in at `/login` | Lands on Beranda, greeting shows the name | |
| 3 | Customer | Akun → Tambah alamat with a point near the shop | Address saved and still there after reload | |
| 4 | Customer | Beranda → Warung Contoh SendFood → add 2 items → Keranjang → Lanjut pesan | Checkout shows "Ongkir (perkiraan)" and "Total (perkiraan)" | |
| 5 | Customer | Tap "Pesan sekarang" twice quickly | Exactly one order (check Pesanan Saya); success screen shows code, COD, "Belum Dibayar", total | |
| 6 | Customer | Compare success total with checkout estimate | Same fee and total (server uses the same formula) | |
| 7 | Seller | Log in, Pesanan → Baru | The new order is there (after "Muat ulang") | |
| 8 | Seller | Terima → Mulai siapkan → Tandai siap diambil | Each step succeeds; no more buttons after "Siap Diambil" | |
| 9 | Admin | Pesanan → Perlu kurir → open order → Tugaskan the driver | Badge "Ditugaskan", timeline "Kurir ditugaskan" | |
| 10 | Driver | Tugas → open order → ambil → sampai → Tandai Pesanan Selesai → Ya | Status "Selesai", payment still "Belum Dibayar" | |
| 11 | Customer | Open the order detail | Full timeline Menunggu Penjual … Selesai; no cancel button | |
| 12 | Customer | New order → Batalkan without reason, then with reason | First refused, second cancelled with reason shown | |
| 13 | Seller | New order → Tolak without reason, then with reason | First refused, second "Ditolak Penjual" with reason | |
| 14 | Admin | Order in "Sudah Sampai" → Tandai selesai (override) without reason | Refused by the app (server also returns `completion_reason_required`) | |
| 15 | Admin | Try to cancel a completed order | No cancel button (server also forbids it) | |
| 16 | Seller | Menu → Tambah, Ubah harga, Tandai habis; reload after the form closes | Changes persist; customer no longer sees the sold-out item | |
| 17 | Admin | Warung → Nonaktifkan one shop | Shop disappears from Beranda for customers | |

## Known differences between demo mode and live mode

Found by reading the code. Each one should be confirmed during the live test.

| Area | Demo mode | Live mode |
|---|---|---|
| Login | One button per role (sample accounts) | Email + password; staff roles are set on the server only |
| Sign-up | Disabled with an explanation | Supabase Auth; may require email confirmation |
| Data | Sample village in this phone's localStorage, shared by all roles on the device | Supabase staging, protected by RLS |
| Opening hours | Sample shops have hours, so Buka/Tutup badges and the closed-shop block appear | Staging shops have no hours: no badge and never blocked |
| Shop locations | Around Solo (-7.57, 110.82) | Around -7.48, 111.79 |
| Delivery fee | Computed by the demo adapter with the same formula | Computed by `create_order` on the server |
| Error codes | Demo returns `status_transition_not_allowed` / `override_reason_required` | Server returns `cancel_from_terminal_status_not_allowed` / `completion_reason_required` (both shown with friendly text) |
| Store activation | Changes demo data | RPC `admin_set_store_active`, written to the audit log |
| Saving speed | Fixed 150 ms delay; reloading within that time loses the change | Real network; the server may finish a save even if the page reloads |
| Courier claiming / push | Not built | RPCs exist on staging (`claim_order`, `list_claimable_orders`, push subscriptions) but the app does not use them yet |
