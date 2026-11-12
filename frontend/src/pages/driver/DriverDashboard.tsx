import { Button } from '../../components/Button'
import { BatikStrip } from '../../components/BatikStrip'
import { Card } from '../../components/Card'
import { EmptyState } from '../../components/EmptyState'
import { ErrorState } from '../../components/ErrorState'
import { LinkButton } from '../../components/LinkButton'
import { Loading } from '../../components/Loading'
import { OrderCard } from '../../components/OrderCard'
import { useAuth } from '../../context/auth'
import { api } from '../../lib/api'
import { formatRupiah } from '../../lib/format'
import { startOfTodayWib } from '../../lib/hours'
import { useAsync } from '../../lib/useAsync'
import { isMyActiveTask, sortTasks } from './driverShared'

export default function DriverDashboard() {
  const { user } = useAuth()
  // 100 penugasan terbaru: cukup untuk tugas aktif + selesai hari ini.
  const data = useAsync(() => api.listMyOrders({ limit: 100 }), 'driver-dashboard')

  if (!user) return null
  if (data.loading) return <Loading text="Memuat tugas..." />
  if (data.error) {
    return (
      <ErrorState message={data.error}>
        <Button variant="secondary" onClick={data.reload}>
          Coba lagi
        </Button>
      </ErrorState>
    )
  }

  const orders = data.data?.items ?? []
  const active = sortTasks(orders.filter((o) => isMyActiveTask(o, user.id)))
  const since = startOfTodayWib()
  const doneToday = orders.filter((o) => o.order_status === 'completed' && new Date(o.created_at) >= since)
  const toCollect = active.reduce((s, o) => s + o.total, 0)
  const firstName = user.full_name.split(' ')[0]

  return (
    <div className="space-y-5">
      <Card className="space-y-1">
        <h1 className="text-2xl font-bold leading-tight">{firstName ? `Halo, ${firstName}` : 'Ringkasan Kurir'}</h1>
        <p className="text-base text-ink/80">Ambil pesanan di warung, antar ke pembeli, lalu tagih tunai.</p>
      </Card>
      <BatikStrip className="-mt-3 rounded-full" />

      <dl className="grid grid-cols-2 gap-3">
        <div className="card p-3">
          <dt className="text-base text-ink/80">Tugas aktif</dt>
          <dd className="text-2xl font-bold">{active.length}</dd>
        </div>
        <div className="card p-3">
          <dt className="text-base text-ink/80">Selesai hari ini</dt>
          <dd className="text-2xl font-bold">{doneToday.length}</dd>
        </div>
        <div className="col-span-2 card p-3">
          <dt className="text-base text-ink/80">Total tunai yang perlu ditagih</dt>
          <dd className="text-2xl font-bold">{formatRupiah(toCollect)}</dd>
          <dd className="text-base text-ink/75">Dari tugas yang masih berjalan, termasuk ongkir.</dd>
        </div>
      </dl>

      <section className="space-y-3" aria-labelledby="aktif">
        <div className="flex items-center justify-between gap-3">
          <h2 id="aktif" className="text-xl font-bold">
            Tugas aktif
          </h2>
          <Button variant="ghost" onClick={data.reload}>
            Muat ulang
          </Button>
        </div>
        {active.length === 0 ? (
          <EmptyState icon="truck" title="Belum ada tugas">
            <p>Tugas muncul di sini setelah admin menugaskan pesanan kepadamu.</p>
          </EmptyState>
        ) : (
          active.slice(0, 3).map((o) => <OrderCard key={o.order_id} order={o} to={`/driver/tasks/${o.order_id}`} />)
        )}
        {active.length > 3 && (
          <LinkButton to="/driver/tasks" variant="secondary" fullWidth>
            Lihat semua tugas ({active.length})
          </LinkButton>
        )}
      </section>
    </div>
  )
}
