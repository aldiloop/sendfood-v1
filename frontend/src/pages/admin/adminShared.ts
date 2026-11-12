import type { Order, OrderStatus } from '../../lib/types'

/** Pesanan yang bisa/perlu diberi kurir (sama dengan ASSIGNABLE_STATUSES) dan belum punya kurir. */
export function needsDriver(o: Order): boolean {
  return (['accepted', 'preparing', 'ready_for_pickup'] as OrderStatus[]).includes(o.order_status) && !o.driver_id
}

/** Sudah sampai tapi belum diselesaikan kurir: kandidat override admin. */
export const awaitingCompletion = (o: Order) => o.order_status === 'delivered'

export const isRunning = (o: Order) =>
  (['pending_seller', 'accepted', 'preparing', 'ready_for_pickup', 'picked_up', 'delivered'] as OrderStatus[]).includes(o.order_status)
