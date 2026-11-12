// Smoke test: jalankan `vite preview` atas dist/, cek semua rute + aset PWA, lalu tutup.
// Pakai: npm run build && npm run smoke
import { preview } from 'vite'

const ROUTES = [
  '/',
  '/search',
  '/stores/1',
  '/cart',
  '/checkout',
  '/orders',
  '/orders/1',
  '/orders/1/success',
  '/login',
  '/register',
  '/profile',
  '/seller',
  '/seller/products',
  '/seller/orders',
  '/seller/store',
  '/driver',
  '/driver/tasks',
  '/driver/tasks/1',
  '/driver/history',
  '/admin',
  '/admin/orders',
  '/admin/stores',
  '/admin/users',
  '/rute-yang-tidak-ada', // 404 ditangani SPA, tetap HTTP 200
]

const ASSETS = [
  '/manifest.webmanifest',
  '/sw.js',
  '/registerSW.js',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/maskable-icon-512x512.png',
]

const server = await preview({ preview: { port: 4173, strictPort: false }, logLevel: 'silent' })
const base = server.resolvedUrls.local[0].replace(/\/$/, '')

let failed = 0
async function check(path) {
  const res = await fetch(base + path)
  const ok = res.status === 200
  if (!ok) failed++
  console.log(`${ok ? 'OK  ' : 'GAGAL'} ${res.status} ${path}`)
}

for (const p of ROUTES) await check(p)
const routeFailed = failed
console.log(`Rute: ${ROUTES.length - routeFailed}/${ROUTES.length} HTTP 200`)
for (const p of ASSETS) await check(p)
console.log(`Aset PWA: ${ASSETS.length - (failed - routeFailed)}/${ASSETS.length} HTTP 200`)

await server.close()
process.exit(failed ? 1 : 0)
