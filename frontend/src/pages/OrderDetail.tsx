import { PagePlaceholder } from '../components/PagePlaceholder'
import { COD_PAYMENT_NOTE } from '../lib/format'

export default function OrderDetail() {
  return (
    <>
      <PagePlaceholder title="Detail Pesanan" />
      <p className="mt-2 text-base">{COD_PAYMENT_NOTE}</p>
    </>
  )
}
