/**
 * Ongkir dan jarak. Harus sama persis dengan backend (create_order):
 * - koordinat dibulatkan 6 desimal,
 * - jarak Haversine dengan R bumi 6.371.008,8 m, dibulatkan ke meter terdekat,
 * - ≤1.000 m = Rp2.000; di atasnya Rp2.000 + Rp200 per 100 m kelebihan (dibulatkan ke atas).
 *
 * Hasil di frontend HANYA perkiraan untuk ditampilkan. Ongkir resmi ditetapkan server
 * saat pesanan dibuat dan tidak pernah dikirim dari checkout.
 *
 * File ini sengaja tanpa import supaya bisa diuji langsung dengan Node.
 */

export const EARTH_RADIUS_M = 6_371_008.8
export const BASE_FEE = 2_000
export const BASE_DISTANCE_M = 1_000
export const STEP_DISTANCE_M = 100
export const STEP_FEE = 200
export const MAX_RADIUS_M = 5_000

export type LatLng = { lat: number; lng: number }

const toRad = (deg: number) => (deg * Math.PI) / 180

/** Pembulatan koordinat seperti server: round(x, 6). */
export function roundCoord(value: number): number {
  return Math.round(value * 1e6) / 1e6
}

/** Jarak garis lurus dalam meter (Haversine). */
export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  // Jepit ke [0, 1] supaya galat pembulatan tidak membuat asin() NaN.
  const clamped = Math.min(1, Math.max(0, a))
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(clamped))
}

/**
 * Ongkir dari jarak (meter). Jarak dibulatkan ke meter terdekat dulu,
 * sama seperti server sebelum memanggil delivery_fee_for_distance.
 */
export function calculateDeliveryFee(meters: number): number {
  if (!Number.isFinite(meters) || meters < 0) {
    throw new RangeError('Jarak tidak valid')
  }
  const m = Math.round(meters)
  if (m <= BASE_DISTANCE_M) return BASE_FEE
  return BASE_FEE + Math.ceil((m - BASE_DISTANCE_M) / STEP_DISTANCE_M) * STEP_FEE
}

/** true bila jarak masih dalam radius layanan maksimum (5 km). */
export function isWithinMaxRadius(meters: number): boolean {
  return Number.isFinite(meters) && meters >= 0 && meters <= MAX_RADIUS_M
}

export type DeliveryEstimate = {
  /** Jarak dibulatkan ke meter, seperti server. */
  meters: number
  fee: number
  /** Dalam radius warung (dibatasi maksimum 5 km). */
  withinRadius: boolean
}

/**
 * Perkiraan ongkir dari warung ke pembeli.
 * @param radiusKm radius layanan warung; dibatasi maksimum 5 km.
 */
export function estimateDeliveryFee(from: LatLng, to: LatLng, radiusKm = MAX_RADIUS_M / 1000): DeliveryEstimate {
  const meters = Math.round(
    haversineMeters(roundCoord(from.lat), roundCoord(from.lng), roundCoord(to.lat), roundCoord(to.lng)),
  )
  const radiusM = Math.min(Math.max(radiusKm, 0) * 1000, MAX_RADIUS_M)
  return {
    meters,
    fee: calculateDeliveryFee(meters),
    withinRadius: radiusM > 0 && meters <= radiusM,
  }
}

/** "850 m", "1,5 km", "2,35 km". */
export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) return '-'
  if (meters < 1000) return `${Math.round(meters)} m`
  const km = meters / 1000
  return `${km.toLocaleString('id-ID', { maximumFractionDigits: 2 })} km`
}

/** Radius layanan efektif warung (km): radius tersimpan, dibatasi maksimum 5 km (R7.3). */
export function effectiveRadiusKm(radiusKm: number | null | undefined): number {
  return Math.min(Math.max(radiusKm ?? 0, 0), MAX_RADIUS_M / 1000)
}
