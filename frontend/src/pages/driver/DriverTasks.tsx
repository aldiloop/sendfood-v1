import { Button } from '../../components/Button'
import { EmptyState } from '../../components/EmptyState'
import { ErrorState } from '../../components/ErrorState'
import { Loading } from '../../components/Loading'
import { OrderCard } from '../../components/OrderCard'
import { useAuth } from '../../context/auth'
import { api } from '../../lib/api'
import { useAsync } from '../../lib/useAsync'
import { isMyActiveTask, sortTasks } from './driverShared'

const GROUPS = [
  { status: 'delivered', title: 'Sudah sampai, tunggu diselesaikan' },
  { status: 'picked_up', title: 'Sedang diantar' },
  { status: 'ready_for_pickup', title: 'Ambil di warung' },
] as const

export default function DriverTasks() {
  const { user } = useAuth()
  const data = useAsync(() => api.listMyOrders({ limit: 100 }), 'driver-tasks')

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
  const active = sortTasks((data.data?.items ?? []).filter((o) => isMyActiveTask(o, user.id)))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold leading-tight">Tugas Antar</h1>
        <Button variant="ghost" onClick={data.reload}>
          Muat ulang
        </Button>
      </div>
      {active.length === 0 && (
        <EmptyState icon="truck" title="Belum ada tugas">
          <p>Tugas muncul di sini setelah admin menugaskan pesanan kepadamu.</p>
        </EmptyState>
      )}
      {GROUPS.map((g) => {
        const list = active.filter((o) => o.order_status === g.status)
        if (list.length === 0) return null
        return (
          <section key={g.status} className="space-y-3" aria-label={g.title}>
            <h2 className="text-xl font-bold">
              {g.title} ({list.length})
            </h2>
            {list.map((o) => (
              <OrderCard key={o.order_id} order={o} to={`/driver/tasks/${o.order_id}`} />
            ))}
          </section>
        )
      })}
    </div>
  )
}
