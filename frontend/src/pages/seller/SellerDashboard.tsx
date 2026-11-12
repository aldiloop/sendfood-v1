import { Button } from '../../components/Button'
import { BatikStrip } from '../../components/BatikStrip'
import { Card } from '../../components/Card'
import { EmptyState } from '../../components/EmptyState'
import { ErrorState } from '../../components/ErrorState'
import { Icon } from '../../components/Icon'
import { LinkButton } from '../../components/LinkButton'
import { Loading } from '../../components/Loading'
import { OrderCard } from '../../components/OrderCard'
import { OpenBadge } from '../../components/StoreCard'
import { listMyOrdersSince, seller } from '../../lib/api'
import { BASE_FEE, effectiveRadiusKm } from '../../lib/delivery'
import { formatRupiah } from '../../lib/format'
import { formatHours, startOfTodayWib } from '../../lib/hours'
import type { OrderStatus } from '../../lib/types'
import { useAsync } from '../../lib/useAsync'

const IN_PROCESS: OrderStatus[] = ['accepted', 'preparing']
const WITH_COURIER: OrderStatus[] = ['ready_for_pickup', 'picked_up', 'delivered']

export default function SellerDashboard() {
  const data = useAsync(async () => {
    const store = await seller.getMyStore()
    const today = store ? await listMyOrdersSince(startOfTodayWib()) : []
    return { store, today }
  }, 'seller-dashboard')

  if (data.loading) return <Loading text="Memuat ringkasan..." />
  if (data.error) {
    return (
      <ErrorState message={data.error}>
        <Button variant="secondary" onClick={data.reload}>
          Coba lagi
        </Button>
      </ErrorState>
    )
  }
  const store = data.data?.store
  if (!store) {
    return (
      <EmptyState icon="store" title="Akun ini belum punya warung">
        <p>Hubungi admin desa untuk mendaftarkan warungmu.</p>
      </EmptyState>
    )
  }

  const today = data.data?.today ?? []
  const count = (statuses: OrderStatus[]) => today.filter((o) => statuses.includes(o.order_status)).length
  const waiting = today.filter((o) => o.order_status === 'pending_seller')
  const completed = today.filter((o) => o.order_status === 'completed')
  // Nilai menu dari pesanan selesai (tanpa ongkir). Bukan uang yang pasti sudah diterima.
  const completedValue = completed.reduce((s, o) => s + o.subtotal, 0)

  const stats: { label: string; value: number }[] = [
    { label: 'Pesanan baru', value: waiting.length },
    { label: 'Sedang diproses', value: count(IN_PROCESS) },
    { label: 'Di kurir', value: count(WITH_COURIER) },
    { label: 'Selesai', value: completed.length },
    { label: 'Batal / ditolak', value: count(['cancelled', 'rejected']) },
  ]

  return (
    <div className="space-y-5">
      <Card className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold leading-tight">{store.name}</h1>
          <OpenBadge store={store} />
        </div>
        {!store.is_active && (
          <p className="text-base font-semibold text-terra">Warung belum aktif, jadi belum tampil ke pembeli. Hubungi admin.</p>
        )}
        <ul className="space-y-1 text-base">
          <li className="flex gap-2">
            <Icon name="clock" size={20} className="mt-0.5 shrink-0 text-terra" /> {formatHours(store.opening_hours)}
          </li>
          <li className="flex gap-2">
            <Icon name="truck" size={20} className="mt-0.5 shrink-0 text-terra" />
            Ongkir mulai {formatRupiah(BASE_FEE)} · antar sampai {effectiveRadiusKm(store.service_radius_km).toLocaleString('id-ID')} km
          </li>
        </ul>
      </Card>
      <BatikStrip className="-mt-3 rounded-full" />

      <section className="space-y-3" aria-labelledby="hari-ini">
        <h2 id="hari-ini" className="text-xl font-bold">
          Hari ini
        </h2>
        <dl className="grid grid-cols-2 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="card p-3">
              <dt className="text-base text-ink/80">{s.label}</dt>
              <dd className="text-2xl font-bold">{s.value}</dd>
            </div>
          ))}
          <div className="col-span-2 card p-3">
            <dt className="text-base text-ink/80">Nilai menu pesanan selesai</dt>
            <dd className="text-2xl font-bold">{formatRupiah(completedValue)}</dd>
            <dd className="text-base text-ink/75">Dibayar tunai ke kurir (COD), di luar ongkir.</dd>
          </div>
        </dl>
      </section>

      <section className="space-y-3" aria-labelledby="perlu-dicek">
        <h2 id="perlu-dicek" className="text-xl font-bold">
          Perlu dicek sekarang
        </h2>
        {waiting.length === 0 ? (
          <p className="text-base text-ink/80">Belum ada pesanan baru.</p>
        ) : (
          waiting.map((o) => <OrderCard key={o.order_id} order={o} to={`/seller/orders?order=${o.order_id}`} />)
        )}
        <LinkButton to="/seller/orders" fullWidth>
          Lihat semua pesanan
        </LinkButton>
      </section>
    </div>
  )
}
