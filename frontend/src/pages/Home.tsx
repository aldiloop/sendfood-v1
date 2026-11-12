import { useState, type FormEvent } from 'react'
import { BatikStrip } from '../components/BatikStrip'
import { useNavigate } from 'react-router'
import { Button } from '../components/Button'
import { EmptyState } from '../components/EmptyState'
import { ErrorState } from '../components/ErrorState'
import { Icon } from '../components/Icon'
import { Loading } from '../components/Loading'
import { ProductCard } from '../components/ProductCard'
import { StoreCard } from '../components/StoreCard'
import { useAuth } from '../context/auth'
import { api } from '../lib/api'
import { useAsync } from '../lib/useAsync'

// "Menu Pilihan" (keputusan pemilik 12 Nov): belum ada data popularitas, jadi tidak diberi label "populer".
const PICKS_LIMIT = 6

export default function Home() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [q, setQ] = useState('')

  const stores = useAsync(() => api.listStores({ sort: 'name', limit: 20 }), 'home-stores')
  const products = useAsync(() => api.searchProducts({ sort: 'name', limit: PICKS_LIMIT }), 'home-picks')

  function onSearch(e: FormEvent) {
    e.preventDefault()
    const term = q.trim()
    navigate(term ? `/search?q=${encodeURIComponent(term)}` : '/search')
  }

  const firstName = user?.full_name?.split(' ')[0]

  return (
    <div className="space-y-7">
      <section className="space-y-3">
        <h1 className="text-2xl font-bold leading-tight">
          {firstName ? `Halo, ${firstName}! Mau makan apa hari ini?` : 'Mau makan apa hari ini?'}
        </h1>
        <p className="text-base text-ink/80">Pesan dari warung tetangga, diantar kurir desa. Bayar tunai di tempat.</p>
        <form onSubmit={onSearch} role="search" className="flex gap-2">
          <label htmlFor="home-q" className="sr-only">
            Cari warung atau menu
          </label>
          <input
            id="home-q"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari soto, pecel, warung..."
            className="input min-w-0 flex-1"
          />
          <Button type="submit" aria-label="Cari">
            <Icon name="search" />
          </Button>
        </form>
      </section>

      <BatikStrip className="rounded-full" />

      <section className="space-y-3" aria-labelledby="picks-title">
        <h2 id="picks-title" className="text-xl font-bold">
          Menu Pilihan
        </h2>
        {products.loading && <Loading text="Memuat menu..." />}
        {products.error && (
          <ErrorState message={products.error}>
            <Button variant="secondary" onClick={products.reload}>
              Coba lagi
            </Button>
          </ErrorState>
        )}
        {products.data?.items.length === 0 && <p className="text-base text-ink/80">Belum ada menu yang tersedia.</p>}
        {products.data?.items.map((p) => (
          <ProductCard
            key={p.id}
            name={p.name}
            description={p.description}
            price={p.price}
            store={{ id: p.store_id, name: p.store_name }}
          />
        ))}
      </section>

      <BatikStrip className="rounded-full" />

      <section className="space-y-3" aria-labelledby="stores-title">
        <h2 id="stores-title" className="text-xl font-bold">
          Daftar Warung Aktif
        </h2>
        {stores.loading && <Loading text="Memuat warung..." />}
        {stores.error && (
          <ErrorState message={stores.error}>
            <Button variant="secondary" onClick={stores.reload}>
              Coba lagi
            </Button>
          </ErrorState>
        )}
        {stores.data?.items.length === 0 && (
          <EmptyState icon="store" title="Belum ada warung yang buka di aplikasi" />
        )}
        {stores.data?.items.map((s) => <StoreCard key={s.id} store={s} />)}
      </section>
    </div>
  )
}
