import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { EmptyState } from '../../components/EmptyState'
import { ErrorState } from '../../components/ErrorState'
import { TextArea } from '../../components/Input'
import { Loading } from '../../components/Loading'
import { OrderCard } from '../../components/OrderCard'
import { OrderStatusBadge } from '../../components/OrderStatusBadge'
import { StatusTimeline } from '../../components/StatusTimeline'
import { useAuth } from '../../context/auth'
import { api, errorMessage, getMyOrder } from '../../lib/api'
import {
  closingReason,
  COD_PAYMENT_NOTE,
  formatDateTime,
  formatRupiah,
  PAYMENT_METHOD_LABEL,
  paymentStatusLabel,
} from '../../lib/format'
import { allowedNextStatuses, canCancel, FINAL_STATUSES, type Actor } from '../../lib/orderRules'
import type { Order, OrderStatus } from '../../lib/types'
import { useAsync } from '../../lib/useAsync'

type Filter = 'new' | 'process' | 'ready' | 'all'
const FILTERS: { value: Filter; label: string; statuses: OrderStatus[] | null }[] = [
  { value: 'new', label: 'Baru', statuses: ['pending_seller'] },
  { value: 'process', label: 'Diproses', statuses: ['accepted', 'preparing'] },
  { value: 'ready', label: 'Di kurir', statuses: ['ready_for_pickup', 'picked_up', 'delivered'] },
  { value: 'all', label: 'Semua', statuses: null },
]

const NEXT_LABEL: Partial<Record<OrderStatus, string>> = {
  accepted: 'Terima pesanan',
  preparing: 'Mulai siapkan',
  ready_for_pickup: 'Tandai siap diambil',
}

export default function SellerOrders() {
  const [params, setParams] = useSearchParams()
  const orderId = params.get('order')
  if (orderId) return <SellerOrderDetail orderId={orderId} onBack={() => setParams({}, { replace: false })} />

  const filter = (FILTERS.find((f) => f.value === params.get('filter')) ?? FILTERS[0]).value
  return <SellerOrderList filter={filter} onFilter={(f) => setParams(f === 'new' ? {} : { filter: f }, { replace: true })} />
}

function SellerOrderList({ filter, onFilter }: { filter: Filter; onFilter: (f: Filter) => void }) {
  // Satu halaman 100 pesanan terbaru; cukup untuk satu warung desa.
  const data = useAsync(() => api.listMyOrders({ limit: 100 }), 'seller-orders')
  const current = FILTERS.find((f) => f.value === filter)!

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold leading-tight">Pesanan Masuk</h1>
        <Button variant="ghost" onClick={data.reload}>
          Muat ulang
        </Button>
      </div>

      <div role="tablist" aria-label="Saring pesanan" className="grid grid-cols-4 gap-2">
        {FILTERS.map((f) => {
          const n = f.statuses ? (data.data?.items.filter((o) => f.statuses!.includes(o.order_status)).length ?? 0) : null
          return (
            <button
              key={f.value}
              role="tab"
              aria-selected={filter === f.value}
              onClick={() => onFilter(f.value)}
              className={`min-h-12 rounded-xl border-2 px-1 text-base font-semibold ${
                filter === f.value ? 'border-soga bg-soga text-white' : 'border-line bg-white text-ink'
              }`}
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
      {data.data && (() => {
        const list = data.data.items.filter((o) => !current.statuses || current.statuses.includes(o.order_status))
        if (list.length === 0) return <EmptyState icon="receipt" title="Tidak ada pesanan di sini" />
        return (
          <ul className="space-y-3">
            {list.map((o) => (
              <li key={o.order_id}>
                <OrderCard order={o} to={`/seller/orders?order=${o.order_id}`} />
              </li>
            ))}
          </ul>
        )
      })()}
    </div>
  )
}

function SellerOrderDetail({ orderId, onBack }: { orderId: string; onBack: () => void }) {
  const { user } = useAuth()
  const data = useAsync(async () => {
    const order = await getMyOrder(orderId)
    return order ? { order, history: await api.listOrderHistory(orderId) } : null
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
        <Button onClick={onBack}>Kembali ke daftar</Button>
      </EmptyState>
    )
  }
  const { order, history } = data.data
  const reason = closingReason(history, order.order_status)

  return (
    <div className="space-y-5">
      <Link to="/seller/orders" className="inline-flex min-h-12 items-center text-base font-semibold text-soga underline">
        ← Semua pesanan
      </Link>
      <section className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold leading-tight">{order.order_code}</h1>
          <OrderStatusBadge status={order.order_status} driverId={order.driver_id} />
        </div>
        <p className="text-base text-ink/80">Masuk {formatDateTime(order.created_at)}</p>
        {reason && (
          <Card className="border-terra">
            <p className="text-base">
              <span className="font-bold">{order.order_status === 'rejected' ? 'Alasan ditolak' : 'Alasan dibatalkan'}:</span> {reason}
            </p>
          </Card>
        )}
      </section>

      <Card className="space-y-2">
        <h2 className="text-lg font-bold">Yang dipesan</h2>
        <ul className="space-y-1 text-base">
          {order.items.map((i, idx) => (
            <li key={`${i.product_id}-${idx}`} className="flex justify-between gap-3">
              <span>
                <span className="font-bold">{i.quantity}×</span> {i.name}
              </span>
              <span>{formatRupiah(i.line_total)}</span>
            </li>
          ))}
        </ul>
        {order.delivery_note && (
          <p className="border-t border-line pt-2 text-base">
            <span className="font-bold">Catatan pembeli:</span> {order.delivery_note}
          </p>
        )}
        <div className="space-y-1 border-t border-line pt-2 text-base">
          <div className="flex justify-between">
            <span>Harga menu</span>
            <span className="font-bold">{formatRupiah(order.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Ongkir (untuk kurir)</span>
            <span>{formatRupiah(order.delivery_fee)}</span>
          </div>
          <div className="flex justify-between">
            <span>Total dibayar pembeli</span>
            <span>{formatRupiah(order.total)}</span>
          </div>
        </div>
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

      <Card className="space-y-1 text-base">
        <h2 className="text-lg font-bold">Diantar ke</h2>
        <p>{order.delivery_address}</p>
      </Card>

      <SellerActions order={order} actor={{ userId: user.id, role: user.role }} onChanged={data.reload} />

      <section className="space-y-3" aria-labelledby="timeline-title">
        <h2 id="timeline-title" className="text-xl font-bold">
          Perjalanan pesanan
        </h2>
        <StatusTimeline history={history} />
      </section>
    </div>
  )
}

type Mode = { kind: 'idle' } | { kind: 'reject' } | { kind: 'cancel' }

function SellerActions({ order, actor, onChanged }: { order: Order; actor: Actor; onChanged: () => void }) {
  const [mode, setMode] = useState<Mode>({ kind: 'idle' })
  const [busy, setBusy] = useState<OrderStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  // list_my_orders hanya mengembalikan pesanan warung sendiri, jadi pemilik = penjual yang masuk.
  const ref = { ...order, store_owner_id: actor.userId }
  const next = allowedNextStatuses(ref, actor)
  const forward = next.filter((s) => s !== 'rejected')
  const canReject = next.includes('rejected')
  // Di 'Menunggu Penjual' pilihannya "Tolak" (wajib alasan), bukan "Batalkan".
  const canCancelHere = canCancel(ref, actor) && order.order_status !== 'pending_seller'
  const isFinal = FINAL_STATUSES.includes(order.order_status)

  async function change(status: OrderStatus, note?: string) {
    if (busy) return
    setBusy(status)
    setError(null)
    try {
      await api.changeOrderStatus(order.order_id, status, note ?? null)
      setMode({ kind: 'idle' })
      onChanged()
    } catch (err) {
      setError(errorMessage(err))
      setBusy(null)
    }
  }

  if (isFinal) return null

  if (forward.length === 0 && !canReject && !canCancelHere) {
    return (
      <Card className="text-base">
        <p className="font-semibold">
          {order.order_status === 'ready_for_pickup'
            ? 'Pesanan siap. Tunggu kurir mengambilnya.'
            : 'Pesanan sedang di tangan kurir.'}
        </p>
        <p className="text-ink/80">Setelah siap diambil, pesanan tidak bisa dibatalkan dari warung. Hubungi admin bila ada masalah.</p>
      </Card>
    )
  }

  return (
    <section className="space-y-3" aria-label="Tindakan">
      {error && (
        <ErrorState message={error}>
          <Button variant="secondary" onClick={onChanged}>
            Muat ulang status
          </Button>
        </ErrorState>
      )}

      {mode.kind === 'idle' && (
        <>
          {forward.map((s) => (
            <Button key={s} fullWidth onClick={() => change(s)} loading={busy === s} disabled={busy !== null}>
              {NEXT_LABEL[s] ?? s}
            </Button>
          ))}
          {canReject && (
            <Button variant="secondary" fullWidth onClick={() => setMode({ kind: 'reject' })} disabled={busy !== null}>
              Tolak pesanan
            </Button>
          )}
          {canCancelHere && (
            <Button variant="ghost" fullWidth onClick={() => setMode({ kind: 'cancel' })} disabled={busy !== null}>
              Batalkan pesanan
            </Button>
          )}
        </>
      )}

      {mode.kind !== 'idle' && (
        <ReasonForm
          title={mode.kind === 'reject' ? 'Tolak pesanan ini?' : 'Batalkan pesanan ini?'}
          label={mode.kind === 'reject' ? 'Alasan menolak (wajib, terlihat oleh pembeli)' : 'Alasan membatalkan (wajib, terlihat oleh pembeli)'}
          placeholder={mode.kind === 'reject' ? 'Contoh: bahan sedang habis' : 'Contoh: kompor rusak, tidak bisa masak'}
          confirmText={mode.kind === 'reject' ? 'Ya, tolak' : 'Ya, batalkan'}
          busy={busy !== null}
          onCancel={() => setMode({ kind: 'idle' })}
          onSubmit={(reason) => change(mode.kind === 'reject' ? 'rejected' : 'cancelled', reason)}
        />
      )}
    </section>
  )
}

const REASON_MAX = 500

function ReasonForm(props: {
  title: string
  label: string
  placeholder: string
  confirmText: string
  busy: boolean
  onCancel: () => void
  onSubmit: (reason: string) => void
}) {
  const [reason, setReason] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)

  function submit(e: FormEvent) {
    e.preventDefault()
    const text = reason.trim()
    if (!text) return setFieldError('Alasan wajib diisi.')
    if (text.length > REASON_MAX) return setFieldError(`Alasan maksimal ${REASON_MAX} huruf.`)
    setFieldError(null)
    props.onSubmit(text)
  }

  return (
    <Card>
      <form onSubmit={submit} noValidate className="space-y-3">
        <h2 className="text-lg font-bold">{props.title}</h2>
        <TextArea
          label={props.label}
          maxLength={REASON_MAX}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          error={fieldError}
          placeholder={props.placeholder}
        />
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={props.onCancel} disabled={props.busy}>
            Kembali
          </Button>
          <Button type="submit" className="flex-1" loading={props.busy} loadingText="Menyimpan...">
            {props.confirmText}
          </Button>
        </div>
      </form>
    </Card>
  )
}
