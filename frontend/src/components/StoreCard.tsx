import { Link } from 'react-router'
import { BASE_FEE, effectiveRadiusKm } from '../lib/delivery'
import { formatDistance, formatRupiah } from '../lib/format'
import { formatHours, openState } from '../lib/hours'
import type { StoreListItem } from '../lib/types'
import { Badge } from './Badge'
import { Icon } from './Icon'

export function OpenBadge({ store }: { store: Pick<StoreListItem, 'opening_hours'> }) {
  const state = openState(store.opening_hours)
  if (state === 'open') return <Badge tone="success">Buka</Badge>
  if (state === 'closed') return <Badge tone="warning">Tutup</Badge>
  return null
}

/** Kartu warung untuk Beranda dan Cari (R3.1). */
export function StoreCard({ store }: { store: StoreListItem }) {
  const radius = effectiveRadiusKm(store.service_radius_km)
  return (
    <Link
      to={`/stores/${store.id}`}
      className="card-link"
      aria-label={`${store.name}, lihat menu`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-bold leading-tight">{store.name}</h3>
        <OpenBadge store={store} />
      </div>
      <ul className="mt-2 space-y-1 text-base text-ink/85">
        <li className="flex gap-2">
          <Icon name="pin" size={20} className="mt-0.5 shrink-0 text-terra" />
          <span>
            {store.address}
            {store.distance_km !== null && ` · ${formatDistance(store.distance_km * 1000)}`}
          </span>
        </li>
        <li className="flex gap-2">
          <Icon name="clock" size={20} className="mt-0.5 shrink-0 text-terra" />
          <span>{formatHours(store.opening_hours)}</span>
        </li>
        <li className="flex gap-2">
          <Icon name="truck" size={20} className="mt-0.5 shrink-0 text-terra" />
          <span>
            Ongkir mulai {formatRupiah(BASE_FEE)} · antar sampai {radius.toLocaleString('id-ID')} km
          </span>
        </li>
      </ul>
      {store.within_service_radius === false && (
        <p className="mt-2 text-base font-semibold text-terra">Lokasimu di luar jangkauan antar warung ini.</p>
      )}
    </Link>
  )
}
