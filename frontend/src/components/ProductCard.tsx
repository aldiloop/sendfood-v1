import { Link } from 'react-router'
import { formatRupiah } from '../lib/format'
import { Button } from './Button'
import { Icon } from './Icon'

type ProductCardProps = {
  name: string
  description: string | null
  price: number
  /** Tampilkan nama warung + tautan (di hasil cari / beranda). */
  store?: { id: string; name: string }
  inCart?: number
  onAdd?: () => void
}

export function ProductCard({ name, description, price, store, inCart = 0, onAdd }: ProductCardProps) {
  return (
    <div className="card flex items-start gap-3">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-line text-soga">
        <Icon name="bowl" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-base font-bold">{name}</p>
        {description && <p className="text-base text-ink/80">{description}</p>}
        {store && (
          <Link to={`/stores/${store.id}`} className="link">
            {store.name}
          </Link>
        )}
        <p className="mt-1 text-lg font-bold">{formatRupiah(price)}</p>
      </div>
      {onAdd && (
        <Button variant={inCart ? 'secondary' : 'primary'} onClick={onAdd} aria-label={`Tambah ${name} ke keranjang`}>
          {inCart ? `+1 (${inCart})` : 'Tambah'}
        </Button>
      )}
    </div>
  )
}
