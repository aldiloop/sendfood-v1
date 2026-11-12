import { Button } from '../../components/Button'
import { BatikStrip } from '../../components/BatikStrip'
import { Card } from '../../components/Card'
import { ErrorState } from '../../components/ErrorState'
import { LinkButton } from '../../components/LinkButton'
import { Loading } from '../../components/Loading'
import { OrderCard } from '../../components/OrderCard'
import { admin, listMyOrdersSince } from '../../lib/api'
import { formatRupiah } from '../../lib/format'
import { startOfTodayWib } from '../../lib/hours'
import { useAsync } from '../../lib/useAsync'
import { awaitingCompletion, needsDriver } from './adminShared'

export default function AdminDashboard() {
  const data = useAsync(async () => {
    const [today, stores, drivers] = await Promise.all([
      listMyOrdersSince(startOfTodayWib()),
      admin.listAllStores(),
      admin.listDrivers(),
    ])
    return { today, stores, drivers }
  }, 'admin-dashboard')

  if (data.loading) return <Loading text="Memuat ringkasan..." />
  if (data.error || !data.data) {
    return (
      <ErrorState message={data.error ?? 'Data tidak tersedia.'}>
        <Button variant="secondary" onClick={data.reload}>
          Coba lagi
        </Button>
      </ErrorState>
    )
  }

  const { today, stores, drivers } = data.data
  const by = (s: string) => today.filter((o) => o.order_status === s).length
  const completed = today.filter((o) => o.order_status === 'completed')
  const waitingDriver = today.filter(needsDriver)
  const waitingDone = today.filter(awaitingCompletion)

  const metrics: { label: string; value: string | number }[] = [
    { label: 'Pesanan hari ini', value: today.length },
    { label: 'Menunggu penjual', value: by('pending_seller') },
    { label: 'Perlu kurir', value: waitingDriver.length },
    { label: 'Sedang diantar', value: by('picked_up') },
    { label: 'Sudah sampai', value: waitingDone.length },
    { label: 'Selesai', value: completed.length },
    { label: 'Batal / ditolak', value: by('cancelled') + by('rejected') },
    { label: 'Warung aktif', value: `${stores.filter((s) => s.is_active).length}/${stores.length}` },
  ]

  return (
    <div className="space-y-5">
      <Card className="space-y-1">
        <h1 className="text-2xl font-bold leading-tight">Ringkasan Hari Ini</h1>
        <p className="text-base text-ink/80">{drivers.length} kurir terdaftar. Angka dihitung dari pesanan yang masuk hari ini (WIB).</p>
      </Card>
      <BatikStrip className="-mt-3 rounded-full" />

      <dl className="grid grid-cols-2 gap-3">
        {metrics.map((m) => (
          <div key={m.label} className="card p-3">
            <dt className="text-base text-ink/80">{m.label}</dt>
            <dd className="text-2xl font-bold">{m.value}</dd>
          </div>
        ))}
        <div className="col-span-2 card p-3">
          <dt className="text-base text-ink/80">Nilai pesanan selesai</dt>
          <dd className="text-2xl font-bold">{formatRupiah(completed.reduce((s, o) => s + o.total, 0))}</dd>
          <dd className="text-base text-ink/75">
            Menu {formatRupiah(completed.reduce((s, o) => s + o.subtotal, 0))} + ongkir{' '}
            {formatRupiah(completed.reduce((s, o) => s + o.delivery_fee, 0))}. Dibayar tunai (COD); pencatatan uang belum aktif.
          </dd>
        </div>
      </dl>

      {waitingDriver.length > 0 && (
        <section className="space-y-3" aria-labelledby="perlu-kurir">
          <h2 id="perlu-kurir" className="text-xl font-bold">
            Perlu ditugaskan kurir
          </h2>
          {waitingDriver.map((o) => (
            <OrderCard key={o.order_id} order={o} to={`/admin/orders?order=${o.order_id}`} />
          ))}
        </section>
      )}

      <LinkButton to="/admin/orders" fullWidth>
        Lihat semua pesanan
      </LinkButton>
    </div>
  )
}
