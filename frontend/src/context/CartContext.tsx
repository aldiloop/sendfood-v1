import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useAuth } from './auth'
import { CartContext, type AddResult, type CartItem, type CartProduct, type CartState, type CartValue } from './cart'

const CART_KEY = 'sendfood.cart.v1'
/** Sama dengan batas backend: quantity 1..99. */
export const MAX_QUANTITY = 99
/** Batas jenis menu per pesanan (dijaga juga oleh server: item_count_out_of_range). */
export const MAX_LINES = 50

const EMPTY: CartState = { storeId: null, storeName: null, items: [], ownerId: null }

function isItem(x: unknown): x is CartItem {
  if (!x || typeof x !== 'object') return false
  const i = x as Record<string, unknown>
  return (
    typeof i.productId === 'string' &&
    typeof i.name === 'string' &&
    typeof i.price === 'number' &&
    Number.isFinite(i.price) &&
    i.price >= 0 &&
    Number.isInteger(i.quantity) &&
    (i.quantity as number) >= 1 &&
    (i.quantity as number) <= MAX_QUANTITY
  )
}

/** Baca keranjang dari localStorage; data rusak dibuang, bukan dipercaya. */
function readCart(): CartState {
  try {
    const raw = localStorage.getItem(CART_KEY)
    if (!raw) return EMPTY
    const c = JSON.parse(raw) as Record<string, unknown>
    const items = Array.isArray(c.items) ? c.items.filter(isItem).slice(0, MAX_LINES) : []
    if (items.length === 0 || typeof c.storeId !== 'string') return { ...EMPTY, ownerId: strOrNull(c.ownerId) }
    return {
      storeId: c.storeId,
      storeName: strOrNull(c.storeName),
      items,
      ownerId: strOrNull(c.ownerId),
    }
  } catch {
    return EMPTY
  }
}

const strOrNull = (v: unknown) => (typeof v === 'string' ? v : null)

function writeCart(cart: CartState): void {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart))
  } catch {
    // Penyimpanan penuh/diblokir: keranjang tetap ada selama tab terbuka.
  }
}

const clampQty = (q: number) => Math.min(MAX_QUANTITY, Math.max(0, Math.floor(q)))

export function CartProvider({ children }: { children: ReactNode }) {
  const { status, user } = useAuth()
  const [cart, setCart] = useState<CartState>(readCart)

  // Simpan setiap perubahan (R3.4: tetap ada setelah muat ulang / checkout gagal).
  useEffect(() => writeCart(cart), [cart])

  // Sinkron dengan tab lain.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === CART_KEY || e.key === null) setCart(readCart())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // HP bisa dipakai bergantian: keranjang milik akun lain tidak boleh terbawa.
  // Disesuaikan saat render (bukan di effect) supaya keranjang lama tidak sempat tampil.
  const userId = user?.id ?? null
  if (status === 'ready') {
    if (cart.ownerId && cart.ownerId !== userId) setCart({ ...EMPTY, ownerId: userId })
    else if (!cart.ownerId && userId) setCart({ ...cart, ownerId: userId })
  }

  // Salinan terbaru untuk menghitung hasil `add` secara sinkron (updater setState bisa ditunda).
  const cartRef = useRef(cart)
  useEffect(() => {
    cartRef.current = cart
  }, [cart])

  const add = useCallback((product: CartProduct, quantity = 1): AddResult => {
    const c = cartRef.current
    if (c.storeId && c.storeId !== product.store_id && c.items.length > 0) return 'other_store'
    const existing = c.items.find((i) => i.productId === product.id)
    if (!existing && c.items.length >= MAX_LINES) return 'limit'
    const items = existing
      ? c.items.map((i) => (i.productId === product.id ? { ...i, quantity: clampQty(i.quantity + quantity) || 1 } : i))
      : [...c.items, { productId: product.id, name: product.name, price: product.price, quantity: clampQty(quantity) || 1 }]
    const next = { ...c, storeId: product.store_id, storeName: product.store_name, items }
    cartRef.current = next
    setCart(next)
    return 'added'
  }, [])

  const replaceWith = useCallback((product: CartProduct, quantity = 1) => {
    setCart((c) => ({
      ownerId: c.ownerId,
      storeId: product.store_id,
      storeName: product.store_name,
      items: [{ productId: product.id, name: product.name, price: product.price, quantity: clampQty(quantity) || 1 }],
    }))
  }, [])

  const setQuantity = useCallback((productId: string, quantity: number) => {
    setCart((c) => {
      const q = clampQty(quantity)
      const items =
        q === 0 ? c.items.filter((i) => i.productId !== productId) : c.items.map((i) => (i.productId === productId ? { ...i, quantity: q } : i))
      return items.length ? { ...c, items } : { ...EMPTY, ownerId: c.ownerId }
    })
  }, [])

  const remove = useCallback((productId: string) => setQuantity(productId, 0), [setQuantity])
  const clear = useCallback(() => setCart((c) => ({ ...EMPTY, ownerId: c.ownerId })), [])

  const value = useMemo<CartValue>(
    () => ({
      ...cart,
      count: cart.items.reduce((n, i) => n + i.quantity, 0),
      subtotal: cart.items.reduce((s, i) => s + i.price * i.quantity, 0),
      add,
      replaceWith,
      setQuantity,
      remove,
      clear,
    }),
    [cart, add, replaceWith, setQuantity, remove, clear],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
