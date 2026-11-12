import { useState, type FormEvent } from 'react'
import { useParams } from 'react-router'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { ErrorState } from '../components/ErrorState'
import { TextArea } from '../components/Input'
import { LinkButton } from '../components/LinkButton'
import { Loading } from '../components/Loading'
import { OrderStatusBadge } from '../components/OrderStatusBadge'
import { StatusTimeline } from '../components/StatusTimeline'
import { useAuth } from '../context/auth'
import { api, ApiError, errorMessage, getMyOrder, getStore } from '../lib/api'
import {
  closingReason,
  COD_PAYMENT_NOTE,
  formatDateTime,
  formatRupiah,
  PAYMENT_METHOD_LABEL,
  paymentStatusLabel,
} from '../lib/format'
import { canCancel } from '../lib/orderRules'
import { useAsync } from '../lib/useAsync'

const REASON_MAX = 500

export default function OrderDetail() {
  const { orderId = '' } = useParams()
  const { user } = useAuth()

  const data = useAsync(async () => {
    const order = await getMyOrder(orderId)
    if (!order) return null
    const [history, store] = await Promise.all([
      api.listOrderHistory(orderId),
      // Nomor warung hanya pelengkap; gagal dibaca tidak menggagalkan halaman.
      getStore(order.store_id).catch(() => null),
    ])
    return { order, history, store }
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
        <LinkButton to="/orders">Lihat pesanan saya</LinkButton>
      </EmptyState>
    )
  }

  const { order, history, store } = data.data
  const reason = closingReason(history, order.order_status)
  // Pelanggan: hanya dari pending_seller (R3.9). store_owner_id tidak dipakai untuk peran pelanggan.
  const cancellable = canCancel({ ...order, store_owner_id: '' }, { userId: user.id, role: user.role })

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold leading-tight">Detail Pesanan</h1>
          <OrderStatusBadge status={order.order_status} driverId={order.driver_id} />
        </div>
        <p className="text-base text-ink/80">
          {order.order_code} · {formatDateTime(order.created_at)}
        </p>
        {reason && (
          <Card className="border-terra">
            <p className="text-base">
              <span className="font-bold">{order.order_status === 'rejected' ? 'Alasan ditolak' : 'Alasan dibatalkan'}:</span> {reason}
            </p>
          </Card>
        )}
      </section>

      <Card className="space-y-2">
        <h2 className="text-lg font-bold">{order.store_name}</h2>
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
        <p className="pt-1 font-semibold">{COD_PAYMENT_NOTE}</p>
      </Card>

      <Card className="space-y-1 text-base">
        <h2 className="text-lg font-bold">Diantar ke</h2>
        <p>{order.delivery_address}</p>
        {order.delivery_note && <p className="text-ink/80">Catatan: {order.delivery_note}</p>}
      </Card>

      <section className="space-y-3" aria-labelledby="timeline-title">
        <div className="flex items-center justify-between gap-3">
          <h2 id="timeline-title" className="text-xl font-bold">
            Perjalanan pesanan
          </h2>
          <Button variant="ghost" onClick={data.reload}>
            Muat ulang
          </Button>
        </div>
        <StatusTimeline history={history} />
      </section>

      {cancellable && <CancelForm orderId={order.order_id} storePhone={store?.phone ?? null} onDone={data.reload} />}
    </div>
  )
}

function CancelForm({ orderId, storePhone, onDone }: { orderId: string; storePhone: string | null; onDone: () => void }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [error, setError] = useState<{ message: string; tooLate: boolean } | null>(null)
  const [busy, setBusy] = useState(false)

  if (!open) {
    return (
      <Button variant="secondary" fullWidth onClick={() => setOpen(true)}>
        Batalkan pesanan
      </Button>
    )
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    const text = reason.trim()
    if (!text) {
      setFieldError('Tulis alasan pembatalan.')
      return
    }
    if (text.length > REASON_MAX) {
      setFieldError(`Alasan maksimal ${REASON_MAX} huruf.`)
      return
    }
    setFieldError(null)
    setBusy(true)
    setError(null)
    try {
      await api.changeOrderStatus(orderId, 'cancelled', text)
      onDone()
    } catch (err) {
      setError({ message: errorMessage(err), tooLate: err instanceof ApiError && err.code === 'cancel_too_late' })
      setBusy(false)
    }
  }

  return (
    <Card>
      <form onSubmit={onSubmit} noValidate className="space-y-3">
        <h2 className="text-lg font-bold">Batalkan pesanan?</h2>
        <p className="text-base">Pesanan hanya bisa dibatalkan selama penjual belum menerimanya.</p>
        <TextArea
          label="Alasan pembatalan (wajib)"
          maxLength={REASON_MAX}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          error={fieldError}
          placeholder="Contoh: salah pilih menu"
        />
        {error && (
          <ErrorState message={error.message}>
            {error.tooLate && (
              <div className="flex flex-col gap-3">
                <Button variant="secondary" onClick={onDone}>
                  Muat ulang status
                </Button>
                {storePhone && (
                  <a
                    href={`tel:${storePhone.replace(/[^\d+]/g, '')}`}
                    className="btn-secondary"
                  >
                    Telepon warung ({storePhone})
                  </a>
                )}
              </div>
            )}
          </ErrorState>
        )}
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setOpen(false)} disabled={busy}>
            Tidak jadi
          </Button>
          <Button type="submit" className="flex-1" loading={busy} loadingText="Membatalkan...">
            Ya, batalkan
          </Button>
        </div>
      </form>
    </Card>
  )
}
