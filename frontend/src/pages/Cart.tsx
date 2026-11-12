import { useState } from 'react'
import { Link } from 'react-router'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { ConfirmBox } from '../components/ConfirmBox'
import { EmptyState } from '../components/EmptyState'
import { LinkButton } from '../components/LinkButton'
import { MAX_QUANTITY } from '../context/CartContext'
import { useCart } from '../context/cart'
import { BASE_FEE } from '../lib/delivery'
import { formatRupiah } from '../lib/format'

export default function Cart() {
  const cart = useCart()
  const [confirmClear, setConfirmClear] = useState(false)

  if (cart.items.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold leading-tight">Keranjang</h1>
        <EmptyState icon="basket" title="Keranjangmu masih kosong">
          <p>Pilih warung, lalu tambahkan menu yang kamu mau.</p>
          <LinkButton to="/">Lihat warung</LinkButton>
        </EmptyState>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold leading-tight">Keranjang</h1>
        <p className="text-base text-ink/80">
          Dari{' '}
          <Link to={`/stores/${cart.storeId}`} className="font-semibold text-soga underline">
            {cart.storeName}
          </Link>
        </p>
      </div>

      <ul className="space-y-3">
        {cart.items.map((item) => (
          <li key={item.productId}>
            <Card className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <p className="text-base font-bold">{item.name}</p>
                <p className="text-base font-bold">{formatRupiah(item.price * item.quantity)}</p>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2" role="group" aria-label={`Jumlah ${item.name}`}>
                  <Button
                    variant="secondary"
                    className="w-12 px-0"
                    onClick={() => cart.setQuantity(item.productId, item.quantity - 1)}
                    aria-label={item.quantity === 1 ? `Hapus ${item.name}` : `Kurangi ${item.name}`}
                  >
                    −
                  </Button>
                  <span className="min-w-8 text-center text-lg font-bold" aria-live="polite">
                    {item.quantity}
                  </span>
                  <Button
                    variant="secondary"
                    className="w-12 px-0"
                    onClick={() => cart.setQuantity(item.productId, item.quantity + 1)}
                    disabled={item.quantity >= MAX_QUANTITY}
                    aria-label={`Tambah ${item.name}`}
                  >
                    +
                  </Button>
                </div>
                <Button variant="ghost" onClick={() => cart.remove(item.productId)} aria-label={`Hapus ${item.name} dari keranjang`}>
                  Hapus
                </Button>
              </div>
            </Card>
          </li>
        ))}
      </ul>

      <Card className="space-y-2 text-base">
        <div className="flex justify-between">
          <span>Harga menu</span>
          <span className="font-semibold">{formatRupiah(cart.subtotal)}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span>Ongkir</span>
          <span className="text-right">Dihitung dari jarak, mulai {formatRupiah(BASE_FEE)}</span>
        </div>
        <p className="text-ink/75">Total pasti tampil setelah pesanan dibuat. Bayar tunai di tempat (COD).</p>
      </Card>

      <LinkButton to="/checkout" fullWidth>
        Lanjut pesan
      </LinkButton>

      {confirmClear ? (
        <ConfirmBox title="Kosongkan keranjang?" confirmText="Ya, kosongkan" onCancel={() => setConfirmClear(false)} onConfirm={() => { cart.clear(); setConfirmClear(false) }}>
          Semua menu di keranjang akan dihapus.
        </ConfirmBox>
      ) : (
        <Button variant="ghost" fullWidth onClick={() => setConfirmClear(true)}>
          Kosongkan keranjang
        </Button>
      )}
    </div>
  )
}
