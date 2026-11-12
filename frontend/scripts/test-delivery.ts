// Uji rumus ongkir + jarak (23 kasus). Jalankan: npm run test:delivery
// Node menjalankan file .ts ini langsung (type stripping), tanpa dependensi tambahan.
import {
  calculateDeliveryFee,
  estimateDeliveryFee,
  formatDistance,
  haversineMeters,
  isWithinMaxRadius,
} from '../src/lib/delivery.ts'

type Case = { name: string; run: () => unknown; expect: unknown }

const fee = (m: number): Case => ({
  name: `ongkir ${m} m`,
  run: () => calculateDeliveryFee(m),
  // Nilai acuan ditulis tangan (bukan dihitung ulang dengan rumus yang sama).
  expect: FEE_TABLE[m],
})

const FEE_TABLE: Record<number, number> = {
  0: 2000,
  500: 2000,
  999: 2000,
  1000: 2000,
  1001: 2200,
  1100: 2200,
  1101: 2400,
  1200: 2400,
  1999: 4000,
  2000: 4000,
  2001: 4200,
  2350: 4800, // acuan wajib
  2500: 5000,
  3000: 6000,
  3333: 6800,
  4000: 8000,
  4999: 10000,
  5000: 10000,
}

// Titik acuan: 0,01° lintang ≈ 1.111,95 m dengan R = 6.371.008,8 m.
const A = { lat: -7.5755, lng: 110.8243 }
const B = { lat: -7.5655, lng: 110.8243 }

const cases: Case[] = [
  ...Object.keys(FEE_TABLE).map((m) => fee(Number(m))),
  { name: 'jarak negatif ditolak', run: () => throws(() => calculateDeliveryFee(-1)), expect: true },
  { name: 'haversine titik sama = 0 m', run: () => haversineMeters(A.lat, A.lng, A.lat, A.lng), expect: 0 },
  {
    name: 'estimasi 0,01° lintang = 1.112 m, Rp2.400, dalam radius',
    run: () => estimateDeliveryFee(A, B),
    expect: { meters: 1112, fee: 2400, withinRadius: true },
  },
  { name: 'radius 5.000 m masih boleh', run: () => isWithinMaxRadius(5000), expect: true },
  { name: 'radius 5.001 m di luar', run: () => isWithinMaxRadius(5001), expect: false },
]

function throws(fn: () => unknown): boolean {
  try {
    fn()
    return false
  } catch {
    return true
  }
}

let failed = 0
for (const c of cases) {
  const got = c.run()
  const ok = JSON.stringify(got) === JSON.stringify(c.expect)
  if (!ok) failed++
  console.log(`${ok ? 'OK   ' : 'GAGAL'} ${c.name} → ${JSON.stringify(got)}${ok ? '' : ` (harusnya ${JSON.stringify(c.expect)})`}`)
}
console.log(`format: ${formatDistance(2350)} · ${formatDistance(850)} · ${formatDistance(1500)}`)
console.log(`Hasil: ${cases.length - failed}/${cases.length} lolos`)
process.exit(failed || cases.length !== 23 ? 1 : 0)
