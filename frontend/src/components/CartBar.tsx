import { Link } from 'react-router'
import { useCart } from '../context/cart'
import { formatRupiah } from '../lib/format'
import { Icon } from './Icon'

/** Ringkasan keranjang yang menempel di atas menu bawah. */
export function CartBar() {
  const cart = useCart()
  if (cart.count === 0) return null
  return (
    <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 mx-auto max-w-[480px] px-4 pb-2">
      <Link
        to="/cart"
        className="flex min-h-14 items-center justify-between gap-3 rounded-xl bg-soga px-4 text-base font-semibold text-white"
      >
        <span className="flex items-center gap-2">
          <Icon name="basket" /> {cart.count} item · {cart.storeName}
        </span>
        <span>{formatRupiah(cart.subtotal)}</span>
      </Link>
    </div>
  )
}
