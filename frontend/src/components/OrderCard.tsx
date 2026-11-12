import { Link } from 'react-router'
import { formatDateTime, formatRupiah } from '../lib/format'
import type { Order } from '../lib/types'
import { OrderStatusBadge } from './OrderStatusBadge'

export function OrderCard({ order, to }: { order: Order; to: string }) {
  const count = order.items.reduce((n, i) => n + i.quantity, 0)
  return (
    <Link to={to} className="block rounded-2xl border border-line bg-white p-4 hover:border-soga">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-bold">{order.store_name}</p>
          <p className="text-base text-ink/75">
            {order.order_code} · {formatDateTime(order.created_at)}
          </p>
        </div>
        <OrderStatusBadge status={order.order_status} driverId={order.driver_id} />
      </div>
      <p className="mt-2 text-base">
        {count} item · <span className="font-bold">{formatRupiah(order.total)}</span>
      </p>
    </Link>
  )
}
