import type { OrderStatus, PaymentMethod, PaymentStatus } from './types'

export { formatDistance } from './delivery'

/** Label status pesanan (enum backend → bahasa sehari-hari). */
export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending_seller: 'Menunggu Penjual',
  accepted: 'Diterima',
  rejected: 'Ditolak Penjual',
  preparing: 'Disiapkan',
  ready_for_pickup: 'Siap Diambil',
  picked_up: 'Diantar',
  delivered: 'Sudah Sampai',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
}

/**
 * Label untuk ditampilkan ke pengguna. Backend tidak punya status "ditugaskan";
 * kurir ditugaskan lewat kolom driver_id. Jadi pesanan siap diambil yang sudah
 * punya kurir ditampilkan sebagai "Ditugaskan".
 */
export function orderStatusLabel(status: OrderStatus, driverId?: string | null): string {
  if (status === 'ready_for_pickup' && driverId) return 'Ditugaskan'
  return ORDER_STATUS_LABEL[status] ?? status
}

/** Status bayar apa adanya. Hanya 'verified' yang berarti uang sudah diterima. */
export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  unpaid: 'Belum Dibayar',
  pending_verification: 'Menunggu Verifikasi',
  verified: 'Terverifikasi',
  failed: 'Gagal',
}

export function paymentStatusLabel(status: PaymentStatus): string {
  return PAYMENT_STATUS_LABEL[status] ?? status
}

/**
 * Label metode bayar untuk MENAMPILKAN data. Bukan daftar pilihan:
 * checkout hanya punya COD.
 */
export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  cod: 'Bayar di Tempat (COD)',
  manual_transfer: 'Transfer manual',
}

/** "Rp4.800", "Rp125.000". Dibulatkan ke rupiah terdekat. */
export function formatRupiah(amount: number): string {
  if (!Number.isFinite(amount)) return '-'
  const abs = Math.round(Math.abs(amount)).toLocaleString('id-ID', { maximumFractionDigits: 0 })
  return `${amount < 0 ? '-' : ''}Rp${abs}`
}

/** "12 Nov 2026, 14.05" */
export function formatDateTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** "14.05" */
export function formatTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}
