import { createContext, useContext } from 'react'

/** Harga di keranjang hanya untuk tampilan; total resmi dihitung server saat pesan. */
export type CartItem = {
  productId: string
  name: string
  price: number
  quantity: number
}

export type CartState = {
  /** Keranjang hanya berisi menu dari SATU warung (create_order menerima satu warung). */
  storeId: string | null
  storeName: string | null
  items: CartItem[]
  /** Pemilik keranjang; keranjang dikosongkan bila akun yang masuk berganti. */
  ownerId: string | null
}

export type CartProduct = {
  id: string
  name: string
  price: number
  store_id: string
  store_name: string
}

export type AddResult = 'added' | 'other_store' | 'limit'

export type CartValue = CartState & {
  count: number
  /** Subtotal perkiraan dari harga yang tampil. */
  subtotal: number
  add(product: CartProduct, quantity?: number): AddResult
  /** Kosongkan keranjang lalu isi dengan menu dari warung lain. */
  replaceWith(product: CartProduct, quantity?: number): void
  setQuantity(productId: string, quantity: number): void
  remove(productId: string): void
  clear(): void
}

export const CartContext = createContext<CartValue | null>(null)

export function useCart(): CartValue {
  const value = useContext(CartContext)
  if (!value) throw new Error('useCart harus dipakai di dalam <CartProvider>')
  return value
}
