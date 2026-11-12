import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { ConfirmBox } from '../../components/ConfirmBox'
import { EmptyState } from '../../components/EmptyState'
import { ErrorState } from '../../components/ErrorState'
import { Icon } from '../../components/Icon'
import { LinkButton } from '../../components/LinkButton'
import { Loading } from '../../components/Loading'
import { OrderStatusBadge } from '../../components/OrderStatusBadge'
import { StatusTimeline } from '../../components/StatusTimeline'
import { useAuth } from '../../context/auth'
import { api, errorMessage, getMyOrder, getStore } from '../../lib/api'
import {
  closingReason,
  COD_PAYMENT_NOTE,
  formatDateTime,
  formatRupiah,
  PAYMENT_METHOD_LABEL,
  paymentStatusLabel,
} from '../../lib/format'
import { allowedNextStatuses, type Actor } from '../../lib/orderRules'
import type { Order, OrderStatus } from '../../lib/types'
import { useAsync } from '../../lib/useAsync'

const STEP: Partial<Record<OrderStatus, { label: string; hint: string }>> = {
  picked_up: { label: 'Pesanan sudah saya ambil', hint: 'Tekan setelah pesanan diterima dari warung.' },
  delivered: { label: 'Tandai sudah sampai', hint: 'Tekan setelah tiba di alamat pembeli.' },
  completed: { label: 'Tandai Pesanan Selesai', hint: 'Tekan setelah pesanan diserahkan dan dibayar tunai.' },
}

const tel = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`
const mapUrl = (lat: number, lng: number) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`

export default function DriverTaskDetail() {
  const { orderId = '' } = useParams()
  const { user } = useAuth()

  const data = useAsync(async () => {
    // Hanya pesanan yang ditugaskan ke kurir ini yang dikembalikan server.
    const order = await getMyOrder(orderId)
    if (!order) return null
    const [history, store] = await Promise.all([api.listOrderHistory(orderId), getStore(order.store_id).catch(() => null)])
    return { order, history, store }
  }, orderId)

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
  // Pesanan kurir lain atau yang bukan tugasnya: tidak ditampilkan sama sekali.
  if (!data.data || !user || data.data.order.driver_id !== user.id) {
    return (
      <EmptyState icon="truck" title="Tugas tidak ditemukan">
        <p>Mungkin tugas ini sudah dipindah ke kurir lain.</p>
        <LinkButton to="/driver/tasks">Lihat tugas saya</LinkButton>
      </EmptyState>
    )
  }

  const { order, history, store } = data.data
  const reason = closingReason(history, order.order_status)
  const hasDropPin = order.delivery_latitude !== null && order.delivery_longitude !== null
  const hasStorePin = store && store.latitude !== null && store.longitude !== null

  return (
    <div className="space-y-5">
      <Link to="/driver/tasks" className="link">
        ← Semua tugas
      </Link>

      <section className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold leading-tight">{order.order_code}</h1>
          <OrderStatusBadge status={order.order_status} driverId={order.driver_id} />
        </div>
        <p className="text-base text-ink/80">Dipesan {formatDateTime(order.created_at)}</p>
        {reason && (
          <Card className="border-terra">
            <p className="text-base">
              <span className="font-bold">{order.order_status === 'rejected' ? 'Alasan ditolak' : 'Alasan dibatalkan'}:</span> {reason}
            </p>
            <p className="text-base text-ink/80">Tugas ini tidak perlu diantar lagi.</p>
          </Card>
        )}
      </section>

      <Card className="space-y-2 text-base">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Icon name="store" className="text-terra" /> Ambil di
        </h2>
        <p className="font-semibold">{order.store_name}</p>
        {store && <p>{store.address}</p>}
        <div className="flex flex-wrap gap-3">
          {store?.phone && (
            <a href={tel(store.phone)} className="link">
              <Icon name="phone" size={20} /> {store.phone}
            </a>
          )}
          {hasStorePin && (
            <a
              href={mapUrl(store.latitude!, store.longitude!)}
              target="_blank"
              rel="noopener noreferrer"
              className="link"
            >
              <Icon name="pin" size={20} /> Buka peta warung
            </a>
          )}
        </div>
      </Card>

      <Card className="space-y-2 text-base">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Icon name="home" className="text-terra" /> Antar ke
        </h2>
        <p>{order.delivery_address}</p>
        {order.delivery_note && <p className="text-ink/85">Catatan: {order.delivery_note}</p>}
        {hasDropPin && (
          <a
            href={mapUrl(order.delivery_latitude!, order.delivery_longitude!)}
            target="_blank"
            rel="noopener noreferrer"
            className="link"
          >
            <Icon name="pin" size={20} /> Buka peta tujuan
          </a>
        )}
      </Card>

      <Card className="space-y-2">
        <h2 className="text-lg font-bold">Isi pesanan</h2>
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
            <span>Tagih tunai</span>
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

      <DriverActions order={order} actor={{ userId: user.id, role: user.role }} onChanged={data.reload} />

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
    </div>
  )
}

function DriverActions({ order, actor, onChanged }: { order: Order; actor: Actor; onChanged: () => void }) {
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // store_owner_id tidak dipakai untuk peran kurir.
  const next = allowedNextStatuses({ ...order, store_owner_id: '' }, actor)[0]
  if (!next) return null
  const step = STEP[next]
  if (!step) return null

  async function go() {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await api.changeOrderStatus(order.order_id, next)
      setConfirming(false)
      onChanged()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
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
      {next === 'completed' && confirming ? (
        <ConfirmBox
          title="Selesaikan pesanan ini?"
          confirmText="Ya, selesai"
          cancelText="Belum"
          busy={busy}
          onCancel={() => setConfirming(false)}
          onConfirm={go}
        >
          <p>
            Pastikan pesanan sudah diserahkan ke pembeli dan uang tunai <strong>{formatRupiah(order.total)}</strong> sudah diterima.
          </p>
          <p className="mt-2 text-ink/80">
            Status bayar di aplikasi tetap "{paymentStatusLabel(order.payment_status)}" karena pencatatan uang tunai belum aktif.
          </p>
        </ConfirmBox>
      ) : (
        <>
          <Button fullWidth onClick={next === 'completed' ? () => setConfirming(true) : go} loading={busy}>
            {step.label}
          </Button>
          <p className="text-base text-ink/80">{step.hint}</p>
        </>
      )}
    </section>
  )
}
