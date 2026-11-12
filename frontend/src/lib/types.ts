import type { Role } from './roles'

/**
 * Tipe domain mengikuti kontrak RPC Supabase di staging
 * (enum public.order_status, public.payment_status, public.payment_method).
 */
export type OrderStatus =
  | 'pending_seller'
  | 'accepted'
  | 'rejected'
  | 'preparing'
  | 'ready_for_pickup'
  | 'picked_up'
  | 'delivered'
  | 'completed'
  | 'cancelled'

export type PaymentStatus = 'unpaid' | 'pending_verification' | 'verified' | 'failed'

/**
 * Enum backend juga punya 'manual_transfer', tetapi metode itu ditutup.
 * Frontend hanya pernah MENGIRIM 'cod'; nilai lain hanya mungkin terbaca dari data lama.
 */
export type PaymentMethod = 'cod' | 'manual_transfer'

export type Profile = {
  id: string
  full_name: string
  phone: string | null
  role: Role
  /** Hanya ada di mode demo (login demo). */
  email?: string
}

export type CustomerAddress = {
  id: string
  customer_id: string
  label: string
  address: string
  latitude: number | null
  longitude: number | null
  note: string | null
}

/** Jam buka sederhana "HH:MM" waktu setempat. */
export type OpeningHours = { open: string; close: string }

export type Store = {
  id: string
  owner_id: string
  name: string
  description: string | null
  address: string
  latitude: number | null
  longitude: number | null
  phone: string | null
  image_url: string | null
  opening_hours: OpeningHours | null
  is_active: boolean
  service_radius_km: number | null
}

/** Baris hasil RPC list_stores. */
export type StoreListItem = Omit<Store, 'owner_id' | 'is_active'> & {
  /** Null bila koordinat pembeli tidak dikirim. */
  distance_km: number | null
  within_service_radius: boolean | null
}

export type Product = {
  id: string
  store_id: string
  name: string
  description: string | null
  price: number
  image_url: string | null
  is_available: boolean
}

/** Baris hasil RPC search_products. */
export type ProductListItem = Omit<Product, 'is_available'> & {
  store_name: string
  service_radius_km: number | null
  distance_km: number | null
  within_service_radius: boolean | null
}

export type OrderItem = {
  product_id: string | null
  name: string
  unit_price: number
  quantity: number
  line_total: number
}

/** Baris hasil RPC list_my_orders. */
export type Order = {
  order_id: string
  order_code: string
  store_id: string
  store_name: string
  customer_id: string
  driver_id: string | null
  delivery_address: string
  delivery_latitude: number | null
  delivery_longitude: number | null
  delivery_note: string | null
  subtotal: number
  delivery_fee: number
  total: number
  payment_method: PaymentMethod
  payment_status: PaymentStatus
  order_status: OrderStatus
  created_at: string
  items: OrderItem[]
}

export type OrderStatusHistory = {
  order_id: string
  old_status: OrderStatus | null
  new_status: OrderStatus
  changed_by: string | null
  note: string | null
  created_at: string
}

/**
 * Input create_order. Sengaja TIDAK ada field ongkir/subtotal/total:
 * semua harga dihitung server.
 */
export type CreateOrderInput = {
  storeId: string
  items: { productId: string; quantity: number }[]
  deliveryAddress: string
  deliveryLatitude: number
  deliveryLongitude: number
  deliveryNote?: string | null
  /** Wajib. Kunci yang sama untuk percobaan ulang keranjang yang sama. */
  idempotencyKey: string
}

/** Baris hasil RPC create_order. */
export type CreateOrderResult = {
  order_id: string
  order_code: string
  subtotal: number
  delivery_fee: number
  total: number
  payment_method: PaymentMethod
  payment_status: PaymentStatus
  order_status: OrderStatus
}

export type Page<T> = {
  items: T[]
  limit: number
  offset: number
  /** true bila kemungkinan masih ada halaman berikutnya. */
  hasMore: boolean
}

export type StoreSort = 'name' | 'nearest' | 'farthest' | 'delivery_fee'
export type ProductSort = 'name' | 'nearest' | 'farthest' | 'cheapest' | 'priciest' | 'delivery_fee'
