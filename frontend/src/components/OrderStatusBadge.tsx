import { orderStatusLabel } from '../lib/format'
import type { OrderStatus } from '../lib/types'
import { Badge, type BadgeTone } from './Badge'

const TONE: Record<OrderStatus, BadgeTone> = {
  pending_seller: 'warning',
  accepted: 'info',
  preparing: 'info',
  ready_for_pickup: 'info',
  picked_up: 'info',
  delivered: 'info',
  completed: 'success',
  rejected: 'danger',
  cancelled: 'danger',
}

export function OrderStatusBadge({ status, driverId }: { status: OrderStatus; driverId?: string | null }) {
  return <Badge tone={TONE[status]}>{orderStatusLabel(status, driverId)}</Badge>
}
