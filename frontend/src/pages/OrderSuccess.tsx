import { useLocation, useParams } from 'react-router'
import { BatikStrip } from '../components/BatikStrip'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { ErrorState } from '../components/ErrorState'
import { Icon } from '../components/Icon'
import { LinkButton } from '../components/LinkButton'
import { Loading } from '../components/Loading'
import { getMyOrder } from '../lib/api'
import { COD_PAYMENT_NOTE, formatRupiah, PAYMENT_METHOD_LABEL, paymentStatusLabel } from '../lib/format'
import type { CreateOrderResult } from '../lib/types'
import { useAsync } from '../lib/useAsync'

type NavState = { result?: CreateOrderResult; storeName?: string } | null

export default function OrderSuccess() {
  const { orderId = '' } = useParams()
  const navState = useLocation().state as NavState
  // Hasil create_order dipakai hanya bila milik pesanan ini; selain itu (mis. muat ulang) baca dari server.
  const fromCheckout = navState?.result?.order_id === orderId ? navState.result : undefined
  const fetched = useAsync(() => (fromCheckout ? Promise.resolve(null) : getMyOrder(orderId)), `${orderId}:${fromCheckout ? 'nav' : 'fetch'}`)

  if (!fromCheckout && fetched.loading) return <Loading text="Memuat pesanan..." />
  if (!fromCheckout && fetched.error) {
    return (
      <ErrorState message={fetched.error}>
        <Button variant="secondary" onClick={fetched.reload}>
          Coba lagi
        </Button>
      </ErrorState>
    )
  }
  const order = fromCheckout ?? fetched.data
  if (!order) {
    return (
      <EmptyState icon="receipt" title="Pesanan tidak ditemukan">
        <LinkButton to="/orders">Lihat pesanan saya</LinkButton>
      </EmptyState>
    )
  }
  const storeName = fromCheckout ? navState?.storeName : fetched.data?.store_name

  return (
    <div className="space-y-5">
      <BatikStrip className="rounded-full" />
      <section className="space-y-2 text-center">
        <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-leaf text-white">
          <Icon name="check" size={32} />
        </span>
        <h1 className="text-2xl font-bold leading-tight">Pesanan Berhasil Dibuat</h1>
        <p className="text-base text-ink/85">
          {storeName ? `${storeName} akan segera mengecek pesananmu.` : 'Warung akan segera mengecek pesananmu.'}
        </p>
      </section>

      <Card className="space-y-2 text-base">
        <div className="flex justify-between gap-3">
          <span>Kode pesanan</span>
          <span className="font-bold tracking-wide">{order.order_code}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span>Harga menu</span>
          <span>{formatRupiah(order.subtotal)}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span>Ongkir</span>
          <span>{formatRupiah(order.delivery_fee)}</span>
        </div>
        <div className="flex justify-between gap-3 border-t border-line pt-2 text-lg font-bold">
          <span>Total</span>
          <span>{formatRupiah(order.total)}</span>
        </div>
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

      <LinkButton to={`/orders/${orderId}`} fullWidth>
        Lihat status pesanan
      </LinkButton>
      <LinkButton to="/" variant="secondary" fullWidth>
        Kembali ke Beranda
      </LinkButton>
    </div>
  )
}
