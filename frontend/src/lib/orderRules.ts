import type { Role } from './roles'
import type { OrderStatus } from './types'

/**
 * Cermin aturan backend (change_order_status, assign_order_driver, ops_policy di staging).
 * Server tetap penentu akhir; modul ini dipakai mode demo dan untuk menentukan
 * tombol mana yang tampil di UI.
 */

/** ops_policy.cancellation_allowed_statuses (pelanggan). */
export const CUSTOMER_CANCEL_STATUSES: readonly OrderStatus[] = ['pending_seller']
/** ops_policy.cancellation_allowed_statuses_seller. */
export const SELLER_CANCEL_STATUSES: readonly OrderStatus[] = ['pending_seller', 'accepted', 'preparing']
/** Status akhir: tidak bisa dibatalkan atau diubah lagi. */
export const FINAL_STATUSES: readonly OrderStatus[] = ['completed', 'cancelled', 'rejected']
/** assign_order_driver: penugasan hanya sebelum diambil kurir. */
export const ASSIGNABLE_STATUSES: readonly OrderStatus[] = ['accepted', 'preparing', 'ready_for_pickup']

/** Transisi maju yang sah (selain 'cancelled'). */
const NEXT: Partial<Record<OrderStatus, readonly OrderStatus[]>> = {
  pending_seller: ['accepted', 'rejected'],
  accepted: ['preparing'],
  preparing: ['ready_for_pickup'],
  ready_for_pickup: ['picked_up'],
  picked_up: ['delivered'],
  delivered: ['completed'],
}

export type Actor = {
  userId: string
  role: Role
}

export type OrderRef = {
  order_status: OrderStatus
  customer_id: string
  driver_id: string | null
  /** Pemilik warung pesanan ini. */
  store_owner_id: string
}

/** Status tujuan yang wajib disertai alasan. */
export function reasonRequired(next: OrderStatus, actor: Actor): boolean {
  if (next === 'cancelled' || next === 'rejected') return true
  // Override admin "tandai selesai": alasan wajib (aturan produk R6.3).
  return next === 'completed' && actor.role === 'admin'
}

export function canCancel(order: OrderRef, actor: Actor): boolean {
  const s = order.order_status
  switch (actor.role) {
    case 'customer':
      return order.customer_id === actor.userId && CUSTOMER_CANCEL_STATUSES.includes(s)
    case 'seller':
      return order.store_owner_id === actor.userId && SELLER_CANCEL_STATUSES.includes(s)
    case 'admin':
      // R7.4: admin dari status mana pun yang belum selesai.
      return !FINAL_STATUSES.includes(s)
    default:
      return false
  }
}

/** Status maju yang boleh dipilih aktor ini (tanpa 'cancelled'). */
export function allowedNextStatuses(order: OrderRef, actor: Actor): OrderStatus[] {
  const s = order.order_status
  const candidates = NEXT[s] ?? []
  return candidates.filter((next) => {
    if (next === 'picked_up' && !order.driver_id) return false
    switch (actor.role) {
      case 'admin':
        return true
      case 'seller':
        return (
          order.store_owner_id === actor.userId &&
          (s === 'pending_seller' || s === 'accepted' || s === 'preparing')
        )
      case 'driver':
        // ops_policy.completion_actor = 'driver': hanya kurir bertugas yang menyelesaikan.
        return order.driver_id === actor.userId && (s === 'ready_for_pickup' || s === 'picked_up' || s === 'delivered')
      default:
        return false
    }
  })
}

export function canAssignDriver(order: OrderRef, actor: Actor): boolean {
  return actor.role === 'admin' && ASSIGNABLE_STATUSES.includes(order.order_status)
}

/**
 * Validasi perubahan status. Mengembalikan kode galat yang sama dengan backend,
 * atau null bila boleh.
 */
export function checkStatusChange(
  order: OrderRef,
  actor: Actor,
  next: OrderStatus,
  note: string | null | undefined,
): string | null {
  const hasNote = Boolean(note && note.trim())
  if (note && note.length > 500) return 'status_note_too_long'

  if (next === 'cancelled') {
    if (!canCancel(order, actor)) return 'status_transition_not_allowed'
    if (!hasNote) return 'cancellation_reason_required'
    return null
  }
  if (next === 'rejected' && !hasNote) return 'rejection_reason_required'
  if (!(NEXT[order.order_status] ?? []).includes(next)) return 'status_transition_not_allowed'
  if (next === 'picked_up' && !order.driver_id) return 'driver_not_assigned'
  if (!allowedNextStatuses(order, actor).includes(next)) return 'status_transition_not_allowed'
  if (reasonRequired(next, actor) && !hasNote) return 'override_reason_required'
  return null
}
