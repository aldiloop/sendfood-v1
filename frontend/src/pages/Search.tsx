import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import { Button } from '../components/Button'
import { EmptyState } from '../components/EmptyState'
import { ErrorState } from '../components/ErrorState'
import { Input } from '../components/Input'
import { Loading } from '../components/Loading'
import { ProductCard } from '../components/ProductCard'
import { StoreCard } from '../components/StoreCard'
import { api, errorMessage } from '../lib/api'
import type { LatLng } from '../lib/delivery'
import { readCurrentLocation } from '../lib/geo'
import type { Page, ProductListItem, ProductSort, StoreListItem, StoreSort } from '../lib/types'
import { useAsync } from '../lib/useAsync'

type Tab = 'menu' | 'warung'
const PAGE = 20

/** Urutan yang ditawarkan. Tidak ada "ongkir" (lihat R3.2). */
const PRODUCT_SORTS: { value: ProductSort; label: string }[] = [
  { value: 'name', label: 'Nama (A–Z)' },
  { value: 'cheapest', label: 'Harga termurah' },
  { value: 'priciest', label: 'Harga termahal' },
  { value: 'nearest', label: 'Terdekat' },
  { value: 'farthest', label: 'Terjauh' },
]
const STORE_SORTS: { value: StoreSort; label: string }[] = [
  { value: 'name', label: 'Nama (A–Z)' },
  { value: 'nearest', label: 'Terdekat' },
  { value: 'farthest', label: 'Terjauh' },
]

const needsLocation = (sort: string) => sort === 'nearest' || sort === 'farthest'

function toPrice(v: string | null): number | undefined {
  if (!v) return undefined
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : undefined
}

export default function Search() {
  const [params, setParams] = useSearchParams()
  const tab: Tab = params.get('tab') === 'warung' ? 'warung' : 'menu'
  const q = params.get('q') ?? ''
  const sortOptions = tab === 'menu' ? PRODUCT_SORTS : STORE_SORTS
  const sortParam = params.get('sort') ?? 'name'
  const sort = sortOptions.some((o) => o.value === sortParam) ? sortParam : 'name'
  const minPrice = toPrice(params.get('min'))
  const maxPrice = toPrice(params.get('max'))

  const [draftQ, setDraftQ] = useState(q)
  const [draftMin, setDraftMin] = useState(params.get('min') ?? '')
  const [draftMax, setDraftMax] = useState(params.get('max') ?? '')
  const [location, setLocation] = useState<LatLng | null>(null)
  const [locError, setLocError] = useState<string | null>(null)
  const [locating, setLocating] = useState(false)

  const waitingForLocation = needsLocation(sort) && !location
  const key = JSON.stringify({ tab, q, sort, minPrice, maxPrice, location, waitingForLocation })

  const first = useAsync<Page<ProductListItem> | Page<StoreListItem> | null>(() => {
    if (waitingForLocation) return Promise.resolve(null)
    const common = { query: q || undefined, lat: location?.lat, lng: location?.lng, limit: PAGE, offset: 0 }
    return tab === 'menu'
      ? api.searchProducts({ ...common, sort: sort as ProductSort, minPrice, maxPrice })
      : api.listStores({ ...common, sort: sort as StoreSort })
  }, key)

  // Halaman berikutnya ("Muat lagi"), milik key pencarian saat ini saja.
  const [more, setMore] = useState<{ key: string; items: (ProductListItem | StoreListItem)[]; hasMore: boolean } | null>(null)
  const [moreError, setMoreError] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const extra = more?.key === key ? more : null
  const items = [...(first.data?.items ?? []), ...(extra?.items ?? [])]
  const hasMore = extra ? extra.hasMore : (first.data?.hasMore ?? false)

  function update(patch: Record<string, string | null>) {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === '') next.delete(k)
      else next.set(k, v)
    }
    setParams(next, { replace: true })
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    update({ q: draftQ.trim(), min: tab === 'menu' ? draftMin.trim() : null, max: tab === 'menu' ? draftMax.trim() : null })
  }

  async function askLocation() {
    setLocating(true)
    setLocError(null)
    try {
      setLocation(await readCurrentLocation())
    } catch (err) {
      setLocError(err instanceof Error ? err.message : 'Lokasi tidak bisa dibaca.')
    } finally {
      setLocating(false)
    }
  }

  async function loadMore() {
    setLoadingMore(true)
    setMoreError(null)
    const offset = items.length
    const common = { query: q || undefined, lat: location?.lat, lng: location?.lng, limit: PAGE, offset }
    try {
      const page =
        tab === 'menu'
          ? await api.searchProducts({ ...common, sort: sort as ProductSort, minPrice, maxPrice })
          : await api.listStores({ ...common, sort: sort as StoreSort })
      setMore({ key, items: [...(extra?.items ?? []), ...page.items], hasMore: page.hasMore })
    } catch (err) {
      setMoreError(errorMessage(err))
    } finally {
      setLoadingMore(false)
    }
  }

  const priceRangeInvalid = minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold leading-tight">Cari Warung dan Menu</h1>

      <div role="tablist" aria-label="Jenis pencarian" className="grid grid-cols-2 gap-2">
        {(['menu', 'warung'] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => update({ tab: t === 'menu' ? null : t, sort: null, min: null, max: null })}
            className={`min-h-12 rounded-xl border-2 text-base font-semibold ${
              tab === t ? 'border-soga bg-soga text-white' : 'border-line bg-white text-ink'
            }`}
          >
            {t === 'menu' ? 'Menu' : 'Warung'}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} role="search" className="space-y-3">
        <Input
          label={tab === 'menu' ? 'Nama menu atau warung' : 'Nama atau alamat warung'}
          type="search"
          value={draftQ}
          onChange={(e) => setDraftQ(e.target.value)}
        />
        {tab === 'menu' && (
          <div className="grid grid-cols-2 gap-3">
            <Input label="Harga dari (Rp)" inputMode="numeric" value={draftMin} onChange={(e) => setDraftMin(e.target.value.replace(/\D/g, ''))} />
            <Input label="Sampai (Rp)" inputMode="numeric" value={draftMax} onChange={(e) => setDraftMax(e.target.value.replace(/\D/g, ''))} />
          </div>
        )}
        <Button type="submit" fullWidth>
          Cari
        </Button>
      </form>

      <div>
        <label htmlFor="sort" className="mb-1 block text-base font-semibold">
          Urutkan
        </label>
        <select
          id="sort"
          value={sort}
          onChange={(e) => update({ sort: e.target.value === 'name' ? null : e.target.value })}
          className="min-h-12 w-full rounded-xl border-2 border-line bg-white px-4 text-base"
        >
          {sortOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {needsLocation(sort) && (
        <div className="space-y-2">
          <Button variant="secondary" fullWidth onClick={askLocation} loading={locating} loadingText="Membaca lokasi...">
            {location ? 'Perbarui lokasi saya' : 'Pakai lokasi saya untuk urutan jarak'}
          </Button>
          {locError && <ErrorState message={locError} />}
        </div>
      )}

      <section aria-live="polite" className="space-y-3">
        {priceRangeInvalid && <ErrorState message="Harga 'dari' lebih besar dari 'sampai'." />}
        {waitingForLocation && !priceRangeInvalid && (
          <p className="text-base text-ink/80">Izinkan lokasi supaya hasil bisa diurutkan dari jarak.</p>
        )}
        {first.loading && <Loading text="Mencari..." />}
        {first.error && !priceRangeInvalid && (
          <ErrorState message={first.error}>
            <Button variant="secondary" onClick={first.reload}>
              Coba lagi
            </Button>
          </ErrorState>
        )}
        {first.data && items.length === 0 && (
          <EmptyState icon="search" title="Tidak ada yang cocok">
            <p>Coba kata lain, atau hapus batas harga.</p>
          </EmptyState>
        )}
        {tab === 'menu'
          ? (items as ProductListItem[]).map((p) => (
              <ProductCard key={p.id} name={p.name} description={p.description} price={p.price} store={{ id: p.store_id, name: p.store_name }} />
            ))
          : (items as StoreListItem[]).map((s) => <StoreCard key={s.id} store={s} />)}
        {moreError && <ErrorState message={moreError} />}
        {hasMore && (
          <Button variant="secondary" fullWidth onClick={loadMore} loading={loadingMore} loadingText="Memuat...">
            Muat lagi
          </Button>
        )}
      </section>
    </div>
  )
}
