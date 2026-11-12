import type { Order, OrderStatus } from '../../lib/types'

/** Tugas kurir yang masih berjalan (sudah ditugaskan, belum selesai). */
export const ACTIVE_TASK_STATUSES: readonly OrderStatus[] = ['ready_for_pickup', 'picked_up', 'delivered']

/**
 * list_my_orders untuk kurir sudah disaring server (driver_id = kurir ini).
 * Saringan di sini hanya pengaman tambahan bila data berubah di tengah jalan.
 */
export function isMyActiveTask(order: Order, driverId: string): boolean {
  return order.driver_id === driverId && ACTIVE_TASK_STATUSES.includes(order.order_status)
}

/** Urutan kerja: yang sudah di jalan dulu, lalu yang menunggu diambil; lama ke baru. */
export function sortTasks(list: Order[]): Order[] {
  const rank: Partial<Record<OrderStatus, number>> = { delivered: 0, picked_up: 1, ready_for_pickup: 2 }
  return [...list].sort((a, b) => (rank[a.order_status] ?? 9) - (rank[b.order_status] ?? 9) || a.created_at.localeCompare(b.created_at))
}
