import { useState } from 'react'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { ConfirmBox } from '../../components/ConfirmBox'
import { EmptyState } from '../../components/EmptyState'
import { ErrorState } from '../../components/ErrorState'
import { Loading } from '../../components/Loading'
import { admin, errorMessage, type DirectoryUser, type MyStore } from '../../lib/api'
import { effectiveRadiusKm } from '../../lib/delivery'
import { formatHours } from '../../lib/hours'
import { useAsync } from '../../lib/useAsync'

export default function AdminStores() {
  const data = useAsync(async () => {
    const [stores, users] = await Promise.all([admin.listAllStores(), admin.listUsers()])
    return { stores, users }
  }, 'admin-stores')
  const [changed, setChanged] = useState<Record<string, boolean>>({})

  if (data.loading) return <Loading text="Memuat warung..." />
  if (data.error || !data.data) {
    return (
      <ErrorState message={data.error ?? 'Data tidak tersedia.'}>
        <Button variant="secondary" onClick={data.reload}>
          Coba lagi
        </Button>
      </ErrorState>
    )
  }
  const stores = data.data.stores.map((s) => (s.id in changed ? { ...s, is_active: changed[s.id] } : s))
  const ownerOf = (s: MyStore) => data.data!.users.find((u) => u.id === s.owner_id)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold leading-tight">Daftar Warung</h1>
        <p className="text-base text-ink/80">
          {stores.filter((s) => s.is_active).length} aktif dari {stores.length} warung. Hanya warung aktif yang tampil ke pembeli.
        </p>
      </div>
      {stores.length === 0 && <EmptyState icon="store" title="Belum ada warung" />}
      <ul className="space-y-3">
        {stores.map((s) => (
          <li key={s.id}>
            <StoreRow store={s} owner={ownerOf(s)} onChanged={(active) => setChanged((c) => ({ ...c, [s.id]: active }))} />
          </li>
        ))}
      </ul>
    </div>
  )
}

function StoreRow({ store, owner, onChanged }: { store: MyStore; owner?: DirectoryUser; onChanged: (active: boolean) => void }) {
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const radius = effectiveRadiusKm(store.service_radius_km)
  const hasPin = store.latitude !== null && store.longitude !== null
  const canDeliver = radius > 0 && hasPin

  async function toggle() {
    setBusy(true)
    setError(null)
    try {
      onChanged(await admin.setStoreActive(store.id, !store.is_active))
      setConfirming(false)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="space-y-2">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-bold leading-tight">{store.name}</h2>
        {store.is_active ? <Badge tone="success">Aktif</Badge> : <Badge tone="warning">Nonaktif</Badge>}
      </div>
      <ul className="space-y-1 text-base">
        <li>{store.address}</li>
        <li>
          <span className="text-ink/75">Pemilik:</span> {owner?.full_name || 'Tidak diketahui'}
          {store.phone && ` · ${store.phone}`}
        </li>
        <li>
          <span className="text-ink/75">Jam:</span> {formatHours(store.opening_hours)}
        </li>
        <li>
          <span className="text-ink/75">Antar:</span>{' '}
          {canDeliver ? `sampai ${radius.toLocaleString('id-ID')} km` : 'belum bisa (radius atau titik lokasi belum diatur)'}
        </li>
      </ul>
      {error && <ErrorState message={error} />}
      {confirming ? (
        <ConfirmBox
          title={store.is_active ? 'Nonaktifkan warung ini?' : 'Aktifkan warung ini?'}
          confirmText={store.is_active ? 'Ya, nonaktifkan' : 'Ya, aktifkan'}
          busy={busy}
          onCancel={() => setConfirming(false)}
          onConfirm={toggle}
        >
          {store.is_active
            ? 'Warung hilang dari daftar pembeli. Pesanan yang sudah masuk tetap berjalan.'
            : canDeliver
              ? 'Warung akan tampil ke pembeli.'
              : 'Warung akan tampil, tapi pembeli belum bisa memesan sampai radius dan titik lokasi diatur.'}
        </ConfirmBox>
      ) : (
        <Button variant="secondary" fullWidth onClick={() => setConfirming(true)}>
          {store.is_active ? 'Nonaktifkan' : 'Aktifkan'}
        </Button>
      )}
    </Card>
  )
}
