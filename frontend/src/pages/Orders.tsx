import { useState } from 'react'
import { Button } from '../components/Button'
import { EmptyState } from '../components/EmptyState'
import { ErrorState } from '../components/ErrorState'
import { LinkButton } from '../components/LinkButton'
import { Loading } from '../components/Loading'
import { OrderCard } from '../components/OrderCard'
import { api, errorMessage } from '../lib/api'
import type { Order } from '../lib/types'
import { useAsync } from '../lib/useAsync'

const PAGE = 20
const ACTIVE = new Set(['pending_seller', 'accepted', 'preparing', 'ready_for_pickup', 'picked_up', 'delivered'])

export default function Orders() {
  const first = useAsync(() => api.listMyOrders({ limit: PAGE, offset: 0 }), 'orders')
  const [extra, setExtra] = useState<{ items: Order[]; hasMore: boolean } | null>(null)
  const [moreError, setMoreError] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)

  if (first.loading) return <Loading text="Memuat pesanan..." />
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
  // Halaman berikutnya bisa tumpang-tindih bila ada pesanan baru; buang yang dobel.
  const orders = all.filter((o, i) => all.findIndex((x) => x.order_id === o.order_id) === i)
  const hasMore = extra ? extra.hasMore : (first.data?.hasMore ?? false)
  const active = orders.filter((o) => ACTIVE.has(o.order_status))
  const done = orders.filter((o) => !ACTIVE.has(o.order_status))

  async function loadMore() {
    setLoadingMore(true)
    setMoreError(null)
    try {
      const page = await api.listMyOrders({ limit: PAGE, offset: all.length })
      setExtra({ items: [...(extra?.items ?? []), ...page.items], hasMore: page.hasMore })
    } catch (err) {
      setMoreError(errorMessage(err))
    } finally {
      setLoadingMore(false)
    }
  }

  if (orders.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold leading-tight">Pesanan Saya</h1>
        <EmptyState icon="receipt" title="Belum ada pesanan">
          <LinkButton to="/">Cari makanan</LinkButton>
        </EmptyState>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold leading-tight">Pesanan Saya</h1>
        <Button
          variant="ghost"
          onClick={() => {
            setExtra(null)
            first.reload()
          }}
        >
          Muat ulang
        </Button>
      </div>
      {active.length > 0 && (
        <section className="space-y-3" aria-labelledby="aktif">
          <h2 id="aktif" className="text-xl font-bold">
            Sedang berjalan
          </h2>
          {active.map((o) => (
            <OrderCard key={o.order_id} order={o} to={`/orders/${o.order_id}`} />
          ))}
        </section>
      )}
      {done.length > 0 && (
        <section className="space-y-3" aria-labelledby="riwayat">
          <h2 id="riwayat" className="text-xl font-bold">
            Riwayat
          </h2>
          {done.map((o) => (
            <OrderCard key={o.order_id} order={o} to={`/orders/${o.order_id}`} />
          ))}
        </section>
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
