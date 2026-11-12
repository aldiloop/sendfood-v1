import type { OrderStatus, OrderStatusHistory, PaymentMethod, PaymentStatus } from './types'

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
 * Penjelas status bayar COD. Pencatatan uang COD di backend masih mati, jadi status
 * tetap "Belum Dibayar" walau pesanan selesai; kalimat ini mencegah salah paham.
 * Wajib tampil di layar pesanan berhasil dan detail pesanan.
 */
export const COD_PAYMENT_NOTE = 'Bayar tunai ke kurir saat pesanan diterima.'

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

/** "12 Nov 2026, 14.05" (WIB, sama dengan jam buka warung) */
export function formatDateTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
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
  return date.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' })
}

/* ------------------------------------------------------------------ */
/* Riwayat status → timeline                                           */
/* ------------------------------------------------------------------ */

export type TimelineEntry = {
  at: string
  label: string
  /** Alasan/catatan yang ditulis pengguna. Null untuk catatan sistem. */
  reason: string | null
}

/** Baris penugasan kurir: status tidak berubah, catatan berisi kode sistem (memuat ID). */
function isSystemRow(h: OrderStatusHistory): boolean {
  return h.old_status === h.new_status && /^driver_(re)?assigned:/.test(h.note ?? '')
}

/**
 * Timeline untuk ditampilkan. Catatan sistem (driver_assigned:<uuid>) tidak pernah
 * ditampilkan mentah; diganti label "Kurir ditugaskan"/"Kurir diganti".
 */
export function buildTimeline(history: readonly OrderStatusHistory[]): TimelineEntry[] {
  return [...history]
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((h) => {
      if (isSystemRow(h)) {
        return {
          at: h.created_at,
          label: h.note?.startsWith('driver_reassigned:') ? 'Kurir diganti' : 'Kurir ditugaskan',
          reason: null,
        }
      }
      return { at: h.created_at, label: ORDER_STATUS_LABEL[h.new_status] ?? h.new_status, reason: h.note?.trim() || null }
    })
}

/**
 * Alasan batal/tolak pesanan. Dicari dari baris yang MEMINDAHKAN pesanan ke status itu,
 * bukan dari "catatan terakhir", supaya baris lain sesudahnya (mis. catatan sistem)
 * tidak bisa menutupi alasan yang ditulis pelanggan/penjual/admin.
 */
export function closingReason(history: readonly OrderStatusHistory[], status: OrderStatus): string | null {
  if (status !== 'cancelled' && status !== 'rejected') return null
  const row = [...history]
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .find((h) => h.new_status === status && h.old_status !== status)
  return row?.note?.trim() || null
}
