import type { LatLng } from './delivery'

/** Baca lokasi HP. Pesan galat dalam bahasa sehari-hari. */
export function readCurrentLocation(): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('HP ini tidak bisa membaca lokasi. Isi titik lokasi manual.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => reject(new Error('Lokasi tidak bisa dibaca. Izinkan akses lokasi, atau isi manual.')),
      { enableHighAccuracy: true, timeout: 15000 },
    )
  })
}

/** "-7,5735" atau "-7.5735" → angka; kosong → null; tidak valid → NaN. */
export function parseCoord(value: string): number | null {
  const v = value.trim().replace(',', '.')
  if (!v) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : Number.NaN
}

export function isValidLatLng(lat: number | null, lng: number | null): boolean {
  return (
    lat !== null && lng !== null && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
  )
}
