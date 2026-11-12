import { useState } from 'react'
import { useParams } from 'react-router'
import { Button } from '../components/Button'
import { CartBar } from '../components/CartBar'
import { ConfirmBox } from '../components/ConfirmBox'
import { EmptyState } from '../components/EmptyState'
import { ErrorState } from '../components/ErrorState'
import { Icon } from '../components/Icon'
import { LinkButton } from '../components/LinkButton'
import { Loading } from '../components/Loading'
import { ProductCard } from '../components/ProductCard'
import { OpenBadge } from '../components/StoreCard'
import { useCart, type CartProduct } from '../context/cart'
import { api, getStore } from '../lib/api'
import { BASE_FEE, effectiveRadiusKm } from '../lib/delivery'
import { formatRupiah } from '../lib/format'
import { formatHours, openState } from '../lib/hours'
import { useAsync } from '../lib/useAsync'

export default function StoreDetail() {
  const { storeId = '' } = useParams()
  const cart = useCart()
  const [pending, setPending] = useState<CartProduct | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const data = useAsync(async () => {
    const [store, menu] = await Promise.all([getStore(storeId), api.searchProducts({ storeId, limit: 100 })])
    return { store, menu: menu.items }
  }, storeId)

  if (data.loading) return <Loading text="Memuat warung..." />
  if (data.error) {
    return (
      <ErrorState message={data.error}>
        <Button variant="secondary" onClick={data.reload}>
          Coba lagi
        </Button>
      </ErrorState>
    )
  }
  const store = data.data?.store
  if (!store) {
    return (
      <EmptyState icon="store" title="Warung tidak ditemukan">
        <p>Mungkin warung ini sedang tidak aktif.</p>
        <LinkButton to="/">Kembali ke Beranda</LinkButton>
      </EmptyState>
    )
  }
  const menu = data.data?.menu ?? []
  const closed = openState(store.opening_hours) === 'closed'

  function onAdd(product: CartProduct) {
    const result = cart.add(product)
    if (result === 'other_store') setPending(product)
    else if (result === 'limit') setNotice('Keranjang sudah penuh (50 jenis menu).')
    else setNotice(null)
  }

  return (
    <div className="space-y-5 pb-16">
      <section className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold leading-tight">{store.name}</h1>
          <OpenBadge store={store} />
        </div>
        {store.description && <p className="text-base text-ink/85">{store.description}</p>}
        <ul className="space-y-1 text-base">
          <li className="flex gap-2">
            <Icon name="pin" size={20} className="mt-0.5 shrink-0 text-terra" /> {store.address}
          </li>
          <li className="flex gap-2">
            <Icon name="clock" size={20} className="mt-0.5 shrink-0 text-terra" /> {formatHours(store.opening_hours)}
          </li>
          <li className="flex gap-2">
            <Icon name="truck" size={20} className="mt-0.5 shrink-0 text-terra" />
            Ongkir mulai {formatRupiah(BASE_FEE)}, dihitung dari jarak · antar sampai{' '}
            {effectiveRadiusKm(store.service_radius_km).toLocaleString('id-ID')} km
          </li>
          {store.phone && (
            <li className="flex gap-2">
              <Icon name="phone" size={20} className="mt-0.5 shrink-0 text-terra" />
              <a href={`tel:${store.phone.replace(/[^\d+]/g, '')}`} className="link">
                {store.phone}
              </a>
            </li>
          )}
        </ul>
        {closed && (
          <p className="text-base font-semibold text-terra">Warung sedang tutup. Kamu bisa lihat menu, tapi belum bisa pesan.</p>
        )}
      </section>

      {pending && (
        <ConfirmBox
          title="Ganti isi keranjang?"
          confirmText="Ganti keranjang"
          onCancel={() => setPending(null)}
          onConfirm={() => {
            cart.replaceWith(pending)
            setPending(null)
          }}
        >
          Keranjangmu berisi menu dari <strong>{cart.storeName}</strong>. Satu pesanan hanya bisa dari satu warung. Kosongkan
          keranjang lalu isi dengan {pending.name} dari {pending.store_name}?
        </ConfirmBox>
      )}
      {notice && <ErrorState message={notice} />}

      <section className="space-y-3" aria-labelledby="menu-title">
        <h2 id="menu-title" className="text-xl font-bold">
          Menu
        </h2>
        {menu.length === 0 && <p className="text-base text-ink/80">Belum ada menu yang tersedia saat ini.</p>}
        {menu.map((p) => {
          const inCart = cart.storeId === store.id ? (cart.items.find((i) => i.productId === p.id)?.quantity ?? 0) : 0
          return (
            <ProductCard
              key={p.id}
              name={p.name}
              description={p.description}
              price={p.price}
              inCart={inCart}
              onAdd={() => onAdd({ id: p.id, name: p.name, price: p.price, store_id: store.id, store_name: store.name })}
            />
          )
        })}
      </section>

      <CartBar />
    </div>
  )
}
