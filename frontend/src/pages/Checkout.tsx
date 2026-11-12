import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { ErrorState } from '../components/ErrorState'
import { Icon } from '../components/Icon'
import { Input, TextArea } from '../components/Input'
import { LinkButton } from '../components/LinkButton'
import { Loading } from '../components/Loading'
import { useCart } from '../context/cart'
import { account, api, ApiError, errorMessage, getStore, placeOrder } from '../lib/api'
import { effectiveRadiusKm, estimateDeliveryFee, formatDistance, type LatLng } from '../lib/delivery'
import { COD_PAYMENT_NOTE, formatRupiah, PAYMENT_METHOD_LABEL } from '../lib/format'
import { isValidLatLng, parseCoord, readCurrentLocation } from '../lib/geo'
import { openState } from '../lib/hours'
import type { CustomerAddress } from '../lib/types'
import { useAsync } from '../lib/useAsync'

const NEW = 'new'

export default function Checkout() {
  const cart = useCart()
  const navigate = useNavigate()

  const data = useAsync(async () => {
    if (!cart.storeId) return null
    const [store, menu, addresses] = await Promise.all([
      getStore(cart.storeId),
      api.searchProducts({ storeId: cart.storeId, limit: 100 }),
      account.listAddresses(),
    ])
    return { store, menu: menu.items, addresses }
  }, cart.storeId ?? 'none')

  const [choice, setChoice] = useState<string | null>(null)
  const [address, setAddress] = useState('')
  const [note, setNote] = useState('')
  const [pinLat, setPinLat] = useState('')
  const [pinLng, setPinLng] = useState('')
  const [locating, setLocating] = useState(false)
  const [locError, setLocError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  if (cart.items.length === 0 || !cart.storeId) {
    return (
      <EmptyState icon="basket" title="Keranjangmu kosong">
        <LinkButton to="/">Lihat warung</LinkButton>
      </EmptyState>
    )
  }
  if (data.loading) return <Loading text="Menyiapkan pesanan..." />
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
      <ErrorState message="Warung ini sedang tidak aktif, jadi belum bisa dipesan.">
        <LinkButton to="/cart" variant="secondary">
          Kembali ke keranjang
        </LinkButton>
      </ErrorState>
    )
  }

  const menu = data.data?.menu ?? []
  const addresses = data.data?.addresses ?? []
  const selectedId = choice ?? addresses[0]?.id ?? NEW
  const saved: CustomerAddress | undefined = addresses.find((a) => a.id === selectedId)

  // Harga dan ketersediaan terbaru dari server (harga di keranjang bisa sudah berubah).
  const lines = cart.items.map((item) => {
    const current = menu.find((p) => p.id === item.productId)
    return { item, current, price: current?.price ?? item.price }
  })
  const unavailable = lines.filter((l) => !l.current)
  const priceChanged = lines.some((l) => l.current && l.current.price !== l.item.price)
  const subtotal = lines.reduce((s, l) => s + (l.current ? l.price * l.item.quantity : 0), 0)

  // Titik antar: dari alamat tersimpan bila ada, selain itu dari "pakai lokasi" / isian manual.
  const savedPin = saved && isValidLatLng(saved.latitude, saved.longitude) ? { lat: saved.latitude!, lng: saved.longitude! } : null
  const manualLat = parseCoord(pinLat)
  const manualLng = parseCoord(pinLng)
  const manualPin = isValidLatLng(manualLat, manualLng) ? { lat: manualLat!, lng: manualLng! } : null
  const pin: LatLng | null = savedPin ?? manualPin
  const needsPinInput = !savedPin
  const deliveryAddress = saved ? saved.address : address.trim()
  const deliveryNote = [saved?.note?.trim() ? `Patokan: ${saved.note.trim()}` : '', note.trim()].filter(Boolean).join(' · ')

  const storeHasPin = store.latitude !== null && store.longitude !== null
  const estimate =
    pin && storeHasPin
      ? estimateDeliveryFee({ lat: store.latitude!, lng: store.longitude! }, pin, effectiveRadiusKm(store.service_radius_km))
      : null
  const closed = openState(store.opening_hours) === 'closed'

  const blocker = closed
    ? 'Warung sedang tutup. Coba pesan lagi saat warung buka.'
    : unavailable.length
      ? 'Ada menu yang sudah tidak tersedia. Hapus dulu dari keranjang.'
      : !storeHasPin
        ? 'Warung ini belum bisa mengantar (lokasi warung belum diatur).'
        : !deliveryAddress
          ? 'Isi alamat antar dulu.'
          : !pin
            ? 'Tentukan titik lokasi antar dulu.'
            : estimate && !estimate.withinRadius
              ? 'Lokasimu di luar jangkauan antar warung ini.'
              : deliveryNote.length > 1000
                ? 'Catatan terlalu panjang (maksimal 1.000 huruf).'
                : null

  async function askLocation() {
    setLocating(true)
    setLocError(null)
    try {
      const here = await readCurrentLocation()
      setPinLat(here.lat.toFixed(6))
      setPinLng(here.lng.toFixed(6))
    } catch (err) {
      setLocError(err instanceof Error ? err.message : 'Lokasi tidak bisa dibaca.')
    } finally {
      setLocating(false)
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (submitting || blocker || !pin || !cart.storeId) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      // Tanpa ongkir/harga: server menghitung semuanya. Kunci idempotency dikelola placeOrder().
      const result = await placeOrder({
        storeId: cart.storeId,
        items: cart.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        deliveryAddress,
        deliveryLatitude: pin.lat,
        deliveryLongitude: pin.lng,
        deliveryNote: deliveryNote || null,
      })
      cart.clear()
      navigate(`/orders/${result.order_id}/success`, { replace: true, state: { result, storeName: store?.name } })
    } catch (err) {
      // Keranjang TIDAK dikosongkan (R3.4); tekan lagi memakai kunci yang sama.
      setSubmitError(errorMessage(err))
      if (err instanceof ApiError && err.code === 'product_unavailable_or_wrong_store') data.reload()
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <h1 className="text-2xl font-bold leading-tight">Pesan Sekarang</h1>

      <Card className="space-y-2">
        <p className="text-base font-bold">{store.name}</p>
        <ul className="space-y-1 text-base">
          {lines.map(({ item, current, price }) => (
            <li key={item.productId} className="flex justify-between gap-3">
              <span className={current ? '' : 'text-terra line-through'}>
                {item.quantity}× {item.name}
              </span>
              <span>{current ? formatRupiah(price * item.quantity) : 'Tidak tersedia'}</span>
            </li>
          ))}
        </ul>
        {unavailable.length > 0 && (
          <Link to="/cart" className="link">
            Ubah keranjang
          </Link>
        )}
        {priceChanged && <p className="text-base text-terra">Ada harga menu yang berubah. Harga di atas sudah yang terbaru.</p>}
      </Card>

      <fieldset className="space-y-3">
        <legend className="text-xl font-bold">Antar ke mana?</legend>
        {addresses.map((a) => (
          <label key={a.id} className="choice items-start">
            <input type="radio" name="addr" className="mt-1 size-5 accent-soga" checked={selectedId === a.id} onChange={() => setChoice(a.id)} />
            <span className="text-base">
              <span className="block font-bold">{a.label}</span>
              {a.address}
            </span>
          </label>
        ))}
        <label className="choice">
          <input type="radio" name="addr" className="size-5 accent-soga" checked={selectedId === NEW} onChange={() => setChoice(NEW)} />
          <span className="text-base font-bold">{addresses.length ? 'Alamat lain' : 'Tulis alamat'}</span>
        </label>

        {selectedId === NEW && (
          <TextArea label="Alamat lengkap" placeholder="Jalan, nomor rumah, RT/RW, patokan" maxLength={1500} value={address} onChange={(e) => setAddress(e.target.value)} />
        )}

        {needsPinInput && (
          <div className="space-y-2">
            <p className="text-base font-semibold">Titik lokasi antar</p>
            {saved && <p className="text-base text-ink/80">Alamat ini belum punya titik lokasi.</p>}
            <Button variant="secondary" fullWidth onClick={askLocation} loading={locating} loadingText="Membaca lokasi...">
              <Icon name="pin" /> Pakai lokasi saya sekarang
            </Button>
            {locError && <ErrorState message={locError} />}
            <div className="grid grid-cols-2 gap-3">
              <Input label="Lintang" inputMode="decimal" placeholder="-7.5735" value={pinLat} onChange={(e) => setPinLat(e.target.value)} />
              <Input label="Bujur" inputMode="decimal" placeholder="110.8180" value={pinLng} onChange={(e) => setPinLng(e.target.value)} />
            </div>
          </div>
        )}

        <TextArea
          label="Catatan untuk warung/kurir (boleh dikosongkan)"
          placeholder="Contoh: sambalnya dipisah"
          maxLength={900}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </fieldset>

      <Card className="space-y-2 text-base">
        <div className="flex justify-between">
          <span>Harga menu</span>
          <span className="font-semibold">{formatRupiah(subtotal)}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span>Ongkir (perkiraan)</span>
          <span className="text-right font-semibold">
            {estimate ? `${formatRupiah(estimate.fee)} · ${formatDistance(estimate.meters)}` : 'Tentukan lokasi dulu'}
          </span>
        </div>
        <div className="flex justify-between border-t border-line pt-2 text-lg font-bold">
          <span>Total (perkiraan)</span>
          <span>{estimate ? formatRupiah(subtotal + estimate.fee) : '-'}</span>
        </div>
        <p className="text-ink/80">Ongkir dan total pasti ditetapkan server saat pesanan dibuat, dari jarak warung ke titik lokasimu.</p>
        {estimate && !estimate.withinRadius && (
          <p className="font-semibold text-terra">
            Jarak {formatDistance(estimate.meters)} melebihi jangkauan antar warung ini (
            {effectiveRadiusKm(store.service_radius_km).toLocaleString('id-ID')} km).
          </p>
        )}
      </Card>

      <Card className="space-y-1 text-base">
        <p className="font-bold">Cara bayar: {PAYMENT_METHOD_LABEL.cod}</p>
        <p>{COD_PAYMENT_NOTE}</p>
      </Card>

      {submitError && <ErrorState message={submitError} />}
      {blocker && <p className="text-base font-semibold text-terra">{blocker}</p>}

      <Button type="submit" fullWidth disabled={Boolean(blocker)} loading={submitting} loadingText="Mengirim pesanan...">
        Pesan sekarang
      </Button>
    </form>
  )
}
