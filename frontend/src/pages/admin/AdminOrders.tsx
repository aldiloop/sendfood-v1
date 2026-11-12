import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { EmptyState } from '../../components/EmptyState'
import { ErrorState } from '../../components/ErrorState'
import { Loading } from '../../components/Loading'
import { OrderCard } from '../../components/OrderCard'
import { OrderStatusBadge } from '../../components/OrderStatusBadge'
import { ReasonForm } from '../../components/ReasonForm'
import { StatusTimeline } from '../../components/StatusTimeline'
import { useAuth } from '../../context/auth'
import { admin, api, errorMessage, getMyOrder, type DirectoryUser } from '../../lib/api'
import {
  closingReason,
  COD_PAYMENT_NOTE,
  formatDateTime,
  formatRupiah,
  PAYMENT_METHOD_LABEL,
  paymentStatusLabel,
} from '../../lib/format'
import { allowedNextStatuses, canAssignDriver, canCancel, type Actor } from '../../lib/orderRules'
import type { Order } from '../../lib/types'
import { useAsync } from '../../lib/useAsync'
import { awaitingCompletion, isRunning, needsDriver } from './adminShared'

type Filter = 'driver' | 'running' | 'arrived' | 'all'
const FILTERS: { value: Filter; label: string; match: (o: Order) => boolean }[] = [
  { value: 'driver', label: 'Perlu kurir', match: needsDriver },
  { value: 'running', label: 'Berjalan', match: isRunning },
  { value: 'arrived', label: 'Sampai', match: awaitingCompletion },
  { value: 'all', label: 'Semua', match: () => true },
]

export default function AdminOrders() {
  const [params, setParams] = useSearchParams()
  const orderId = params.get('order')
  if (orderId) return <AdminOrderDetail orderId={orderId} />
  const filter = (FILTERS.find((f) => f.value === params.get('filter')) ?? FILTERS[0]).value
  return <AdminOrderList filter={filter} onFilter={(f) => setParams(f === 'driver' ? {} : { filter: f }, { replace: true })} />
}

function AdminOrderList({ filter, onFilter }: { filter: Filter; onFilter: (f: Filter) => void }) {
  // 100 pesanan terbaru dari semua warung.
  const data = useAsync(() => api.listMyOrders({ limit: 100 }), 'admin-orders')
  const current = FILTERS.find((f) => f.value === filter)!

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold leading-tight">Semua Pesanan</h1>
        <Button variant="ghost" onClick={data.reload}>
          Muat ulang
        </Button>
      </div>
      <div role="tablist" aria-label="Saring pesanan" className="grid grid-cols-2 gap-2">
        {FILTERS.map((f) => {
          const n = f.value === 'all' ? null : (data.data?.items.filter(f.match).length ?? 0)
          return (
            <button
              key={f.value}
              role="tab"
              aria-selected={filter === f.value}
              onClick={() => onFilter(f.value)}
              className="tab"
            >
              {f.label}
              {n ? ` (${n})` : ''}
            </button>
          )
        })}
      </div>
      {data.loading && <Loading text="Memuat pesanan..." />}
      {data.error && (
        <ErrorState message={data.error}>
          <Button variant="secondary" onClick={data.reload}>
            Coba lagi
          </Button>
        </ErrorState>
      )}
      {data.data &&
        (() => {
          const list = data.data.items.filter(current.match)
          if (list.length === 0) return <EmptyState icon="receipt" title="Tidak ada pesanan di sini" />
          return (
            <ul className="space-y-3">
              {list.map((o) => (
                <li key={o.order_id}>
                  <OrderCard order={o} to={`/admin/orders?order=${o.order_id}`} />
                </li>
              ))}
            </ul>
          )
        })()}
    </div>
  )
}

function AdminOrderDetail({ orderId }: { orderId: string }) {
  const { user } = useAuth()
  const data = useAsync(async () => {
    const order = await getMyOrder(orderId)
    if (!order) return null
    const [history, users] = await Promise.all([api.listOrderHistory(orderId), admin.listUsers()])
    return { order, history, users }
  }, orderId)

  if (data.loading) return <Loading text="Memuat pesanan..." />
  if (data.error) {
    return (
      <ErrorState message={data.error}>
        <Button variant="secondary" onClick={data.reload}>
          Coba lagi
        </Button>
      </ErrorState>
    )
  }
  if (!data.data || !user) {
    return (
      <EmptyState icon="receipt" title="Pesanan tidak ditemukan">
        <Link to="/admin/orders" className="font-semibold text-soga underline">
          Kembali ke daftar
        </Link>
      </EmptyState>
    )
  }

  const { order, history, users } = data.data
  const byId = (id: string | null) => (id ? users.find((u) => u.id === id) : undefined)
  const customer = byId(order.customer_id)
  const driver = byId(order.driver_id)
  const drivers = users.filter((u) => u.role === 'driver')
  const reason = closingReason(history, order.order_status)

  return (
    <div className="space-y-5">
      <Link to="/admin/orders" className="link">
        ← Semua pesanan
      </Link>
      <section className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold leading-tight">{order.order_code}</h1>
          <OrderStatusBadge status={order.order_status} driverId={order.driver_id} />
        </div>
        <p className="text-base text-ink/80">
          {order.store_name} · {formatDateTime(order.created_at)}
        </p>
        {reason && (
          <Card className="border-terra">
            <p className="text-base">
              <span className="font-bold">{order.order_status === 'rejected' ? 'Alasan ditolak' : 'Alasan dibatalkan'}:</span> {reason}
            </p>
          </Card>
        )}
      </section>

      <Card className="space-y-1 text-base">
        <h2 className="text-lg font-bold">Orang</h2>
        <p>
          <span className="text-ink/75">Pembeli:</span> {customer?.full_name || 'Tidak diketahui'}
          {customer?.phone && (
            <>
              {' · '}
              <a href={`tel:${customer.phone.replace(/[^\d+]/g, '')}`} className="font-semibold text-soga underline">
                {customer.phone}
              </a>
            </>
          )}
        </p>
        <p>
          <span className="text-ink/75">Kurir:</span> {driver ? `${driver.full_name}${driver.phone ? ` · ${driver.phone}` : ''}` : 'Belum ditugaskan'}
        </p>
      </Card>

      <Card className="space-y-2">
        <h2 className="text-lg font-bold">Isi pesanan</h2>
        <ul className="space-y-1 text-base">
          {order.items.map((i, idx) => (
            <li key={`${i.product_id}-${idx}`} className="flex justify-between gap-3">
              <span>
                {i.quantity}× {i.name}
              </span>
              <span>{formatRupiah(i.line_total)}</span>
            </li>
          ))}
        </ul>
        <div className="space-y-1 border-t border-line pt-2 text-base">
          <div className="flex justify-between">
            <span>Harga menu</span>
            <span>{formatRupiah(order.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Ongkir</span>
            <span>{formatRupiah(order.delivery_fee)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span>{formatRupiah(order.total)}</span>
          </div>
        </div>
        <p className="border-t border-line pt-2 text-base">
          <span className="font-bold">Antar ke:</span> {order.delivery_address}
          {order.delivery_note && <span className="block text-ink/80">Catatan: {order.delivery_note}</span>}
        </p>
      </Card>

      <Card className="space-y-1 text-base">
        <div className="flex justify-between gap-3">
          <span>Cara bayar</span>
          <span className="text-right">{PAYMENT_METHOD_LABEL[order.payment_method]}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span>Status bayar</span>
          <span className="font-semibold">{paymentStatusLabel(order.payment_status)}</span>
        </div>
        <p className="pt-1">{COD_PAYMENT_NOTE}</p>
      </Card>

      <AdminActions order={order} drivers={drivers} actor={{ userId: user.id, role: user.role }} onChanged={data.reload} />

      <section className="space-y-3" aria-labelledby="timeline-title">
        <h2 id="timeline-title" className="text-xl font-bold">
          Perjalanan pesanan
        </h2>
        <StatusTimeline history={history} />
      </section>
    </div>
  )
}

type Mode = 'idle' | 'cancel' | 'complete'

function AdminActions({ order, drivers, actor, onChanged }: { order: Order; drivers: DirectoryUser[]; actor: Actor; onChanged: () => void }) {
  const [mode, setMode] = useState<Mode>('idle')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pickedDriver, setPickedDriver] = useState<string>('')

  const ref = { ...order, store_owner_id: '' }
  const assignable = canAssignDriver(ref, actor)
  // Admin: satu-satunya langkah maju = override "selesai" dari delivered (orderRules).
  const canComplete = allowedNextStatuses(ref, actor).includes('completed')
  const cancellable = canCancel(ref, actor)
  if (!assignable && !canComplete && !cancellable) return null

  const otherDrivers = drivers.filter((d) => d.id !== order.driver_id)
  const selected = pickedDriver && otherDrivers.some((d) => d.id === pickedDriver) ? pickedDriver : ''

  async function run(fn: () => Promise<unknown>) {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await fn()
      setMode('idle')
      setPickedDriver('')
      onChanged()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="space-y-3" aria-label="Tindakan admin">
      {error && (
        <ErrorState message={error}>
          <Button variant="secondary" onClick={onChanged}>
            Muat ulang status
          </Button>
        </ErrorState>
      )}

      {assignable && mode === 'idle' && (
        <Card className="space-y-3">
          <h2 className="text-lg font-bold">{order.driver_id ? 'Ganti kurir' : 'Tugaskan kurir'}</h2>
          {otherDrivers.length === 0 ? (
            <p className="text-base text-ink/80">{drivers.length ? 'Tidak ada kurir lain.' : 'Belum ada akun kurir terdaftar.'}</p>
          ) : (
            <>
              <div>
                <label htmlFor="driver" className="mb-1 block text-base font-semibold">
                  Pilih kurir
                </label>
                <select
                  id="driver"
                  value={selected}
                  onChange={(e) => setPickedDriver(e.target.value)}
                  className="input"
                >
                  <option value="">Pilih...</option>
                  {otherDrivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.full_name || 'Tanpa nama'}
                      {d.phone ? ` · ${d.phone}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                fullWidth
                disabled={!selected}
                loading={busy}
                loadingText="Menugaskan..."
                onClick={() => run(() => api.assignOrderDriver(order.order_id, selected))}
              >
                {order.driver_id ? 'Ganti ke kurir ini' : 'Tugaskan'}
              </Button>
            </>
          )}
        </Card>
      )}

      {mode === 'idle' && canComplete && (
        <Button variant="secondary" fullWidth onClick={() => setMode('complete')} disabled={busy}>
          Tandai selesai (override admin)
        </Button>
      )}
      {mode === 'idle' && cancellable && (
        <Button variant="ghost" fullWidth onClick={() => setMode('cancel')} disabled={busy}>
          Batalkan pesanan
        </Button>
      )}

      {mode === 'complete' && (
        <ReasonForm
          title="Tandai pesanan selesai?"
          description="Biasanya kurir yang menyelesaikan. Pakai ini hanya bila kurir tidak bisa menekannya. Status bayar tidak berubah."
          label="Alasan override (wajib, tercatat di riwayat)"
          placeholder="Contoh: HP kurir mati, pembeli sudah konfirmasi lewat telepon"
          confirmText="Ya, selesai"
          busy={busy}
          onCancel={() => setMode('idle')}
          onSubmit={(reason) => run(() => api.changeOrderStatus(order.order_id, 'completed', reason))}
        />
      )}
      {mode === 'cancel' && (
        <ReasonForm
          title="Batalkan pesanan ini?"
          description="Pembeli, warung, dan kurir akan melihat alasannya."
          label="Alasan membatalkan (wajib)"
          placeholder="Contoh: pembeli tidak bisa dihubungi"
          confirmText="Ya, batalkan"
          busy={busy}
          onCancel={() => setMode('idle')}
          onSubmit={(reason) => run(() => api.changeOrderStatus(order.order_id, 'cancelled', reason))}
        />
      )}
    </section>
  )
}
