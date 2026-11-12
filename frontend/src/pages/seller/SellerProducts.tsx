import { useState, type FormEvent } from 'react'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { EmptyState } from '../../components/EmptyState'
import { ErrorState } from '../../components/ErrorState'
import { Input, TextArea } from '../../components/Input'
import { Loading } from '../../components/Loading'
import { ApiError, errorMessage, PRODUCT_PRICE_MAX, seller, validateProduct, type ProductInput } from '../../lib/api'
import { formatRupiah } from '../../lib/format'
import type { Product } from '../../lib/types'
import { useAsync } from '../../lib/useAsync'

export default function SellerProducts() {
  const data = useAsync(async () => {
    const store = await seller.getMyStore()
    return { store, products: store ? await seller.listMyProducts() : [] }
  }, 'seller-products')
  // Perubahan lokal setelah simpan, supaya tidak perlu memuat ulang seluruh daftar.
  const [edits, setEdits] = useState<Record<string, Product>>({})
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  if (data.loading) return <Loading text="Memuat menu..." />
  if (data.error) {
    return (
      <ErrorState message={data.error}>
        <Button variant="secondary" onClick={data.reload}>
          Coba lagi
        </Button>
      </ErrorState>
    )
  }
  if (!data.data?.store) {
    return (
      <EmptyState icon="store" title="Akun ini belum punya warung">
        <p>Hubungi admin desa untuk mendaftarkan warungmu.</p>
      </EmptyState>
    )
  }

  const base = data.data.products
  const merged = [...base.map((p) => edits[p.id] ?? p), ...Object.values(edits).filter((p) => !base.some((b) => b.id === p.id))]
  const products = merged.sort((a, b) => a.name.localeCompare(b.name, 'id'))
  const saved = (p: Product) => setEdits((e) => ({ ...e, [p.id]: p }))

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold leading-tight">Menu Warung Saya</h1>
        <p className="text-base text-ink/80">Matikan "Tersedia" bila menu sedang habis. Pembeli tidak akan bisa memesannya.</p>
      </div>

      {adding ? (
        <ProductForm
          title="Menu baru"
          onCancel={() => setAdding(false)}
          onSubmit={async (input) => {
            const p = await seller.addProduct(input)
            saved(p)
            setAdding(false)
          }}
        />
      ) : (
        <Button fullWidth onClick={() => setAdding(true)}>
          Tambah menu
        </Button>
      )}

      {products.length === 0 && <EmptyState icon="bowl" title="Belum ada menu" />}

      <ul className="space-y-3">
        {products.map((p) => (
          <li key={p.id}>
            {editingId === p.id ? (
              <ProductForm
                title={`Ubah ${p.name}`}
                initial={p}
                onCancel={() => setEditingId(null)}
                onSubmit={async (input) => {
                  saved(await seller.updateProduct(p.id, input))
                  setEditingId(null)
                }}
              />
            ) : (
              <ProductRow product={p} onEdit={() => setEditingId(p.id)} onSaved={saved} />
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function ProductRow({ product, onEdit, onSaved }: { product: Product; onEdit: () => void; onSaved: (p: Product) => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function toggle() {
    setBusy(true)
    setError(null)
    try {
      onSaved(
        await seller.updateProduct(product.id, {
          name: product.name,
          description: product.description,
          price: product.price,
          is_available: !product.is_available,
        }),
      )
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-bold">{product.name}</p>
          {product.description && <p className="text-base text-ink/80">{product.description}</p>}
          <p className="text-lg font-bold">{formatRupiah(product.price)}</p>
        </div>
        {product.is_available ? <Badge tone="success">Tersedia</Badge> : <Badge tone="warning">Habis</Badge>}
      </div>
      {error && <ErrorState message={error} />}
      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={onEdit} disabled={busy}>
          Ubah
        </Button>
        <Button
          variant="secondary"
          className="flex-1"
          onClick={toggle}
          loading={busy}
          loadingText="Menyimpan..."
          role="switch"
          aria-checked={product.is_available}
          aria-label={`Tersedia: ${product.name}`}
        >
          {product.is_available ? 'Tandai habis' : 'Tandai tersedia'}
        </Button>
      </div>
    </Card>
  )
}

function ProductForm({
  title,
  initial,
  onSubmit,
  onCancel,
}: {
  title: string
  initial?: Product
  onSubmit: (input: ProductInput) => Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [price, setPrice] = useState(initial ? String(initial.price) : '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [available, setAvailable] = useState(initial?.is_available ?? true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    const input: ProductInput = { name, description, price: price ? Number(price) : Number.NaN, is_available: available }
    const problem = validateProduct(input)
    if (problem) {
      setError(new ApiError(problem).message)
      return
    }
    setBusy(true)
    setError(null)
    try {
      await onSubmit(input)
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <Card>
      <form onSubmit={submit} noValidate className="space-y-4">
        <h2 className="text-lg font-bold">{title}</h2>
        {error && <ErrorState message={error} />}
        <Input label="Nama menu" maxLength={160} value={name} onChange={(e) => setName(e.target.value)} />
        <Input
          label="Harga (Rp)"
          inputMode="numeric"
          value={price}
          onChange={(e) => setPrice(e.target.value.replace(/\D/g, '').slice(0, String(PRODUCT_PRICE_MAX).length))}
          hint={price ? formatRupiah(Number(price)) : 'Contoh: 10000'}
        />
        <TextArea label="Deskripsi (boleh dikosongkan)" maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} />
        <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border-2 border-line bg-white px-3">
          <input type="checkbox" className="size-6 accent-soga" checked={available} onChange={(e) => setAvailable(e.target.checked)} />
          <span className="text-base font-semibold">Tersedia (bisa dipesan)</span>
        </label>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onCancel} disabled={busy}>
            Batal
          </Button>
          <Button type="submit" className="flex-1" loading={busy} loadingText="Menyimpan...">
            Simpan
          </Button>
        </div>
      </form>
    </Card>
  )
}
