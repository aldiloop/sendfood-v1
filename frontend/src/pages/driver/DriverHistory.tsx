import { useState } from 'react'
import { Button } from '../../components/Button'
import { EmptyState } from '../../components/EmptyState'
import { ErrorState } from '../../components/ErrorState'
import { Loading } from '../../components/Loading'
import { OrderCard } from '../../components/OrderCard'
import { api, errorMessage } from '../../lib/api'
import { formatRupiah } from '../../lib/format'
import type { Order } from '../../lib/types'
import { useAsync } from '../../lib/useAsync'

const PAGE = 20

/** R5.4: pengantaran yang sudah selesai, terbaru dulu. */
export default function DriverHistory() {
  const first = useAsync(() => api.listMyOrders({ status: 'completed', limit: PAGE }), 'driver-history')
  const [extra, setExtra] = useState<{ items: Order[]; hasMore: boolean } | null>(null)
  const [moreError, setMoreError] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)

  if (first.loading) return <Loading text="Memuat riwayat..." />
  if (first.error) {
    return (
      <ErrorState message={first.error}>
        <Button variant="secondary" onClick={first.reload}>
          Coba lagi
        </Button>
      </ErrorState>
    )
  }

  const all = [...(first.data?.items ?? []), ...(extra?.items ?? [])]
  const orders = all.filter((o, i) => all.findIndex((x) => x.order_id === o.order_id) === i)
  const hasMore = extra ? extra.hasMore : (first.data?.hasMore ?? false)

  async function loadMore() {
    setLoadingMore(true)
    setMoreError(null)
    try {
      const page = await api.listMyOrders({ status: 'completed', limit: PAGE, offset: all.length })
      setExtra({ items: [...(extra?.items ?? []), ...page.items], hasMore: page.hasMore })
    } catch (err) {
      setMoreError(errorMessage(err))
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold leading-tight">Riwayat Antar</h1>
      {orders.length === 0 ? (
        <EmptyState icon="list" title="Belum ada pengantaran selesai" />
      ) : (
        <>
          <p className="text-base text-ink/80">
            {orders.length} pengantaran ditampilkan · ongkir {formatRupiah(orders.reduce((s, o) => s + o.delivery_fee, 0))}
          </p>
          <ul className="space-y-3">
            {orders.map((o) => (
              <li key={o.order_id}>
                <OrderCard order={o} to={`/driver/tasks/${o.order_id}`} />
              </li>
            ))}
          </ul>
        </>
      )}
      {moreError && <ErrorState message={moreError} />}
      {hasMore && (
        <Button variant="secondary" fullWidth onClick={loadMore} loading={loadingMore} loadingText="Memuat...">
          Muat lagi
        </Button>
      )}
    </div>
  )
}
