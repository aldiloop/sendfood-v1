import { PagePlaceholder } from '../components/PagePlaceholder'
import { COD_PAYMENT_NOTE } from '../lib/format'

export default function OrderSuccess() {
  return (
    <>
      <PagePlaceholder title="Pesanan Berhasil Dibuat" />
      <p className="mt-2 text-base">{COD_PAYMENT_NOTE}</p>
    </>
  )
}
