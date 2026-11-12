import { useState, type FormEvent } from 'react'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { EmptyState } from '../../components/EmptyState'
import { ErrorState } from '../../components/ErrorState'
import { Icon } from '../../components/Icon'
import { Input, TextArea } from '../../components/Input'
import { Loading } from '../../components/Loading'
import { ApiError, errorMessage, seller, validateStoreProfile, type MyStore } from '../../lib/api'
import { BASE_DISTANCE_M, BASE_FEE, effectiveRadiusKm, STEP_DISTANCE_M, STEP_FEE } from '../../lib/delivery'
import { formatRupiah } from '../../lib/format'
import { formatHours } from '../../lib/hours'
import { useAsync } from '../../lib/useAsync'

export default function SellerStoreProfile() {
  const data = useAsync(() => seller.getMyStore(), 'seller-store')
  const [savedStore, setSavedStore] = useState<MyStore | null>(null)

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
  const store = savedStore ?? data.data
  if (!store) {
    return (
      <EmptyState icon="store" title="Akun ini belum punya warung">
        <p>Hubungi admin desa untuk mendaftarkan warungmu.</p>
      </EmptyState>
    )
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold leading-tight">Profil Warung</h1>
      <StoreForm key={store.id} store={store} onSaved={setSavedStore} />
      <DeliveryConfigCard store={store} />
    </div>
  )
}

function StoreForm({ store, onSaved }: { store: MyStore; onSaved: (s: MyStore) => void }) {
  const [name, setName] = useState(store.name)
  const [description, setDescription] = useState(store.description ?? '')
  const [address, setAddress] = useState(store.address)
  const [phone, setPhone] = useState(store.phone ?? '')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    const input = { name, description, address, phone }
    const problem = validateStoreProfile(input)
    if (problem) {
      setError(new ApiError(problem).message)
      setDone(false)
      return
    }
    setBusy(true)
    setError(null)
    setDone(false)
    try {
      onSaved(await seller.updateMyStore(input))
      setDone(true)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <form onSubmit={submit} noValidate className="space-y-4">
        {error && <ErrorState message={error} />}
        {done && (
          <p role="status" className="flex items-center gap-2 text-base font-semibold text-leaf">
            <Icon name="check" /> Profil warung tersimpan.
          </p>
        )}
        <Input label="Nama warung" maxLength={160} value={name} onChange={(e) => setName(e.target.value)} />
        <TextArea label="Deskripsi (boleh dikosongkan)" maxLength={1000} value={description} onChange={(e) => setDescription(e.target.value)} />
        <TextArea label="Alamat warung" maxLength={1000} value={address} onChange={(e) => setAddress(e.target.value)} />
        <Input label="Nomor telepon (boleh dikosongkan)" type="tel" inputMode="tel" maxLength={40} value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Button type="submit" fullWidth loading={busy} loadingText="Menyimpan...">
          Simpan profil
        </Button>
      </form>
    </Card>
  )
}

/** R4.5: hanya tampilan. Ongkir dihitung dari jarak, bukan tarif tersimpan. */
function DeliveryConfigCard({ store }: { store: MyStore }) {
  const radius = effectiveRadiusKm(store.service_radius_km)
  const hasPin = store.latitude !== null && store.longitude !== null
  return (
    <Card className="space-y-3" aria-labelledby="delivery-title">
      <div className="flex items-center gap-2">
        <Icon name="lock" className="text-terra" />
        <h2 id="delivery-title" className="text-lg font-bold">
          Konfigurasi Pengantaran
        </h2>
      </div>
      <p className="text-base text-ink/80">Bagian ini diatur admin dan tidak bisa diubah dari warung.</p>
      <dl className="space-y-2 text-base">
        <div>
          <dt className="font-semibold">Ongkir</dt>
          <dd>
            Otomatis dari jarak: {formatRupiah(BASE_FEE)} sampai {BASE_DISTANCE_M / 1000} km, lalu tambah {formatRupiah(STEP_FEE)} tiap{' '}
            {STEP_DISTANCE_M} m. Contoh: 2,35 km = Rp4.800.
          </dd>
        </div>
        <div>
          <dt className="font-semibold">Radius layanan</dt>
          <dd>{radius > 0 ? `${radius.toLocaleString('id-ID')} km (maksimal 5 km)` : 'Belum diatur, warung belum bisa mengantar'}</dd>
        </div>
        <div>
          <dt className="font-semibold">Titik lokasi warung</dt>
          <dd>{hasPin ? `${store.latitude!.toFixed(6)}, ${store.longitude!.toFixed(6)}` : 'Belum diatur'}</dd>
        </div>
        <div>
          <dt className="font-semibold">Jam buka</dt>
          <dd>{formatHours(store.opening_hours)}</dd>
        </div>
      </dl>
    </Card>
  )
}
