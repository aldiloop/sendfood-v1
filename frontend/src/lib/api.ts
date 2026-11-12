import { estimateDeliveryFee, haversineMeters, roundCoord } from './delivery'
import { createSeed, type DemoData } from './mock'
import { checkStatusChange, ASSIGNABLE_STATUSES, type Actor } from './orderRules'
import { isMockMode, supabase } from './supabase'
import type {
  CreateOrderInput,
  CreateOrderResult,
  OpeningHours,
  Order,
  OrderItem,
  OrderStatus,
  Page,
  PaymentMethod,
  PaymentStatus,
  ProductListItem,
  ProductSort,
  Profile,
  StoreListItem,
  StoreSort,
} from './types'

/* ------------------------------------------------------------------ */
/* Galat                                                               */
/* ------------------------------------------------------------------ */

/** Kode galat = pesan `raise exception` dari backend (P0001), plus beberapa kode lokal. */
const ERROR_MESSAGES: Record<string, string> = {
  authentication_required: 'Silakan masuk dulu.',
  customer_role_required: 'Hanya akun pelanggan yang bisa memesan.',
  manual_transfer_not_configured: 'Pembayaran hanya bisa bayar di tempat (COD).',
  invalid_idempotency_key: 'Terjadi kesalahan teknis. Coba lagi.',
  idempotency_key_conflict: 'Isi keranjang berubah. Tekan pesan sekali lagi.',
  items_must_be_array: 'Isi keranjang tidak valid.',
  item_count_out_of_range: 'Isi keranjang tidak valid.',
  invalid_order_item: 'Isi keranjang tidak valid.',
  duplicate_product_in_items: 'Ada menu yang dobel di keranjang.',
  delivery_address_required: 'Alamat antar wajib diisi.',
  delivery_note_too_long: 'Catatan terlalu panjang (maksimal 1.000 huruf).',
  valid_delivery_coordinates_required: 'Lokasi antar belum ditentukan.',
  store_not_available: 'Warung sedang tidak aktif.',
  store_delivery_not_configured: 'Warung ini belum bisa mengantar.',
  outside_store_service_radius: 'Lokasimu di luar jangkauan antar warung ini.',
  product_unavailable_or_wrong_store: 'Ada menu yang sudah habis atau tidak tersedia.',
  invalid_product_price: 'Harga menu belum lengkap. Coba lagi nanti.',
  order_subtotal_unavailable: 'Harga menu belum lengkap. Coba lagi nanti.',
  order_not_found: 'Pesanan tidak ditemukan.',
  status_transition_not_allowed: 'Status pesanan tidak bisa diubah ke tahap itu.',
  cancellation_policy_not_configured: 'Pembatalan sedang tidak bisa dilakukan.',
  cancellation_reason_required: 'Tulis alasan pembatalan.',
  rejection_reason_required: 'Tulis alasan menolak pesanan.',
  override_reason_required: 'Tulis alasan untuk tindakan admin ini.',
  completion_policy_not_configured: 'Penyelesaian pesanan sedang tidak bisa dilakukan.',
  driver_not_assigned: 'Pesanan belum punya kurir.',
  status_note_too_long: 'Alasan terlalu panjang (maksimal 500 huruf).',
  admin_role_required: 'Hanya admin yang bisa melakukan ini.',
  driver_profile_required: 'Akun yang dipilih bukan kurir.',
  order_not_assignable: 'Kurir hanya bisa ditugaskan sebelum pesanan diambil.',
  invalid_pagination: 'Permintaan halaman tidak valid.',
  invalid_price_range: 'Rentang harga tidak valid.',
  network: 'Koneksi bermasalah. Periksa internet lalu coba lagi.',
  unknown: 'Terjadi kesalahan. Coba lagi.',
}

export class ApiError extends Error {
  readonly code: string
  constructor(code: string) {
    super(ERROR_MESSAGES[code] ?? ERROR_MESSAGES.unknown)
    this.name = 'ApiError'
    this.code = code
  }
}

/** Pesan ramah untuk galat apa pun. */
export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message
  return ERROR_MESSAGES.unknown
}

function toApiError(error: { message?: string; code?: string } | null | undefined): ApiError {
  const msg = (error?.message ?? '').trim()
  if (msg in ERROR_MESSAGES) return new ApiError(msg)
  if (/fetch|network|timeout/i.test(msg)) return new ApiError('network')
  return new ApiError('unknown')
}

/* ------------------------------------------------------------------ */
/* Idempotency                                                         */
/* ------------------------------------------------------------------ */

/** Format yang diterima backend: ^[A-Za-z0-9_.:-]{8,100}$ */
const IDEMPOTENCY_KEY_RE = /^[A-Za-z0-9_.:-]{8,100}$/

function randomHex(bytes: number): string {
  // getRandomValues tersedia juga di konteks non-HTTPS (beda dengan randomUUID).
  const buf = new Uint8Array(bytes)
  crypto.getRandomValues(buf)
  return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('')
}

/** Kunci baru per percobaan pesan. Simpan dan pakai ulang saat mencoba lagi dengan keranjang yang sama. */
export function newIdempotencyKey(): string {
  return `sf-${randomHex(16)}`
}

/* ------------------------------------------------------------------ */
/* Kontrak adapter                                                     */
/* ------------------------------------------------------------------ */

export type PageParams = { limit?: number; offset?: number }

export type ListStoresParams = PageParams & {
  query?: string
  lat?: number
  lng?: number
  sort?: StoreSort
}

export type SearchProductsParams = PageParams & {
  query?: string
  storeId?: string
  minPrice?: number
  maxPrice?: number
  lat?: number
  lng?: number
  sort?: ProductSort
}

export type ListMyOrdersParams = PageParams & { status?: OrderStatus }

export type Api = {
  mode: 'live' | 'demo'
  listStores(params?: ListStoresParams): Promise<Page<StoreListItem>>
  searchProducts(params?: SearchProductsParams): Promise<Page<ProductListItem>>
  /** Pesanan yang terlihat oleh pengguna yang login (pelanggan/penjual/kurir/admin). */
  listMyOrders(params?: ListMyOrdersParams): Promise<Page<Order>>
  /** Tidak menerima ongkir; server yang menghitung. Selalu mengirim p_idempotency_key. */
  createOrder(input: CreateOrderInput): Promise<CreateOrderResult>
  changeOrderStatus(orderId: string, newStatus: OrderStatus, note?: string | null): Promise<OrderStatus>
  /** Hanya admin. */
  assignOrderDriver(orderId: string, driverId: string): Promise<string>
}

const DEFAULT_LIMIT = 20

function pageArgs(params: PageParams | undefined): { limit: number; offset: number } {
  const limit = params?.limit ?? DEFAULT_LIMIT
  const offset = params?.offset ?? 0
  if (!Number.isInteger(limit) || limit < 1 || limit > 100 || !Number.isInteger(offset) || offset < 0) {
    throw new ApiError('invalid_pagination')
  }
  return { limit, offset }
}

function toPage<T>(items: T[], limit: number, offset: number): Page<T> {
  return { items, limit, offset, hasMore: items.length === limit }
}

/** Validasi lokal yang sama untuk kedua mode, sebelum menyentuh server. */
function assertCreateOrderInput(input: CreateOrderInput): void {
  if (!IDEMPOTENCY_KEY_RE.test(input.idempotencyKey ?? '')) throw new ApiError('invalid_idempotency_key')
  if (!Array.isArray(input.items) || input.items.length === 0) throw new ApiError('item_count_out_of_range')
  if (!input.deliveryAddress?.trim()) throw new ApiError('delivery_address_required')
  if (!Number.isFinite(input.deliveryLatitude) || !Number.isFinite(input.deliveryLongitude)) {
    throw new ApiError('valid_delivery_coordinates_required')
  }
}

/* ------------------------------------------------------------------ */
/* Mode live (Supabase RPC)                                            */
/* ------------------------------------------------------------------ */

type Row = Record<string, unknown>

const num = (v: unknown): number => (typeof v === 'number' ? v : Number(v ?? 0))
const numOrNull = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v))
const strOrNull = (v: unknown): string | null => (v === null || v === undefined ? null : String(v))
const boolOrNull = (v: unknown): boolean | null => (v === null || v === undefined ? null : Boolean(v))

function parseOpeningHours(v: unknown): OpeningHours | null {
  if (v && typeof v === 'object' && 'open' in v && 'close' in v) {
    const { open, close } = v as Record<string, unknown>
    if (typeof open === 'string' && typeof close === 'string') return { open, close }
  }
  return null
}

function mapStoreRow(r: Row): StoreListItem {
  return {
    id: String(r.id),
    name: String(r.name),
    description: strOrNull(r.description),
    address: String(r.address),
    latitude: numOrNull(r.latitude),
    longitude: numOrNull(r.longitude),
    phone: strOrNull(r.phone),
    image_url: strOrNull(r.image_url),
    opening_hours: parseOpeningHours(r.opening_hours),
    service_radius_km: numOrNull(r.service_radius_km),
    // Kolom delivery_fee warung sengaja diabaikan: ongkir dihitung dari jarak.
    distance_km: numOrNull(r.distance_km),
    within_service_radius: boolOrNull(r.within_service_radius),
  }
}

function mapProductRow(r: Row): ProductListItem {
  return {
    id: String(r.id),
    store_id: String(r.store_id),
    store_name: String(r.store_name),
    name: String(r.name),
    description: strOrNull(r.description),
    price: num(r.price),
    image_url: strOrNull(r.image_url),
    service_radius_km: numOrNull(r.service_radius_km),
    distance_km: numOrNull(r.distance_km),
    within_service_radius: boolOrNull(r.within_service_radius),
  }
}

function mapOrderRow(r: Row): Order {
  const items = Array.isArray(r.items) ? (r.items as Row[]) : []
  return {
    order_id: String(r.order_id),
    order_code: String(r.order_code),
    store_id: String(r.store_id),
    store_name: String(r.store_name),
    customer_id: String(r.customer_id),
    driver_id: strOrNull(r.driver_id),
    delivery_address: String(r.delivery_address),
    delivery_latitude: numOrNull(r.delivery_latitude),
    delivery_longitude: numOrNull(r.delivery_longitude),
    delivery_note: strOrNull(r.delivery_note),
    subtotal: num(r.subtotal),
    delivery_fee: num(r.delivery_fee),
    total: num(r.total),
    payment_method: r.payment_method as PaymentMethod,
    payment_status: r.payment_status as PaymentStatus,
    order_status: r.order_status as OrderStatus,
    created_at: String(r.created_at),
    items: items.map(
      (i): OrderItem => ({
        product_id: strOrNull(i.product_id),
        name: String(i.name),
        unit_price: num(i.unit_price),
        quantity: num(i.quantity),
        line_total: num(i.line_total),
      }),
    ),
  }
}

async function rpc(fn: string, args: Record<string, unknown>): Promise<unknown> {
  if (!supabase) throw new ApiError('unknown')
  let result
  try {
    result = await supabase.rpc(fn, args)
  } catch {
    throw new ApiError('network')
  }
  if (result.error) throw toApiError(result.error)
  return result.data
}

const rows = (data: unknown): Row[] => (Array.isArray(data) ? (data as Row[]) : [])

const liveApi: Api = {
  mode: 'live',

  async listStores(params) {
    const { limit, offset } = pageArgs(params)
    const data = await rpc('list_stores', {
      p_query: params?.query?.trim() || null,
      p_latitude: params?.lat ?? null,
      p_longitude: params?.lng ?? null,
      p_sort: params?.sort ?? 'name',
      p_limit: limit,
      p_offset: offset,
    })
    return toPage(rows(data).map(mapStoreRow), limit, offset)
  },

  async searchProducts(params) {
    const { limit, offset } = pageArgs(params)
    const data = await rpc('search_products', {
      p_query: params?.query?.trim() || null,
      p_store_id: params?.storeId ?? null,
      p_min_price: params?.minPrice ?? null,
      p_max_price: params?.maxPrice ?? null,
      p_latitude: params?.lat ?? null,
      p_longitude: params?.lng ?? null,
      p_sort: params?.sort ?? 'name',
      p_limit: limit,
      p_offset: offset,
    })
    return toPage(rows(data).map(mapProductRow), limit, offset)
  },

  async listMyOrders(params) {
    const { limit, offset } = pageArgs(params)
    const data = await rpc('list_my_orders', {
      p_status: params?.status ?? null,
      p_limit: limit,
      p_offset: offset,
    })
    return toPage(rows(data).map(mapOrderRow), limit, offset)
  },

  async createOrder(input) {
    assertCreateOrderInput(input)
    const data = await rpc('create_order', {
      p_store_id: input.storeId,
      p_items: input.items.map((i) => ({ product_id: i.productId, quantity: i.quantity })),
      p_delivery_address: input.deliveryAddress.trim(),
      p_delivery_latitude: input.deliveryLatitude,
      p_delivery_longitude: input.deliveryLongitude,
      p_delivery_note: input.deliveryNote?.trim() || null,
      p_payment_method: 'cod',
      p_idempotency_key: input.idempotencyKey,
    })
    const r = rows(data)[0]
    if (!r) throw new ApiError('unknown')
    return {
      order_id: String(r.order_id),
      order_code: String(r.order_code),
      subtotal: num(r.subtotal),
      delivery_fee: num(r.delivery_fee),
      total: num(r.total),
      payment_method: r.payment_method as PaymentMethod,
      payment_status: r.payment_status as PaymentStatus,
      order_status: r.order_status as OrderStatus,
    }
  },

  async changeOrderStatus(orderId, newStatus, note) {
    const trimmed = note?.trim() || null
    if (newStatus === 'cancelled' && !trimmed) throw new ApiError('cancellation_reason_required')
    if (newStatus === 'rejected' && !trimmed) throw new ApiError('rejection_reason_required')
    const data = await rpc('change_order_status', {
      p_order_id: orderId,
      p_new_status: newStatus,
      p_note: trimmed,
    })
    return data as OrderStatus
  },

  async assignOrderDriver(orderId, driverId) {
    const data = await rpc('assign_order_driver', { p_order_id: orderId, p_driver_id: driverId })
    return String(data)
  },
}

/* ------------------------------------------------------------------ */
/* Mode demo (localStorage)                                            */
/* ------------------------------------------------------------------ */

const DEMO_DATA_KEY = 'sendfood.demo.v1'
const DEMO_USER_KEY = 'sendfood.demo.user'

/** Kunci idempotency demo per pelanggan → order_id. */
type DemoStore = DemoData & { idempotency: Record<string, string> }

let demoCache: DemoStore | null = null

function loadDemo(): DemoStore {
  if (demoCache) return demoCache
  try {
    const raw = localStorage.getItem(DEMO_DATA_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as DemoStore
      if (parsed?.version === 1 && Array.isArray(parsed.orders)) {
        demoCache = { ...parsed, idempotency: parsed.idempotency ?? {} }
        return demoCache
      }
    }
  } catch {
    // Data rusak: buat ulang dari awal.
  }
  demoCache = { ...createSeed(), idempotency: {} }
  saveDemo()
  return demoCache
}

function saveDemo(): void {
  if (!demoCache) return
  try {
    localStorage.setItem(DEMO_DATA_KEY, JSON.stringify(demoCache))
  } catch {
    // Penyimpanan penuh/diblokir: data tetap ada selama tab terbuka.
  }
}

/** Kembalikan data demo ke kondisi awal. */
export function resetDemoData(): void {
  demoCache = { ...createSeed(), idempotency: {} }
  saveDemo()
}

export function getDemoUserId(): string | null {
  try {
    return localStorage.getItem(DEMO_USER_KEY)
  } catch {
    return null
  }
}

export function setDemoUserId(userId: string | null): void {
  try {
    if (userId) localStorage.setItem(DEMO_USER_KEY, userId)
    else localStorage.removeItem(DEMO_USER_KEY)
  } catch {
    // Abaikan: login demo hanya bertahan selama tab terbuka.
  }
}

function demoActor(): { actor: Actor; profile: Profile } {
  const id = getDemoUserId()
  const profile = id ? loadDemo().profiles.find((p) => p.id === id) : undefined
  if (!profile) throw new ApiError('authentication_required')
  return { actor: { userId: profile.id, role: profile.role }, profile }
}

/** Jeda kecil supaya tampilan loading juga teruji di mode demo. */
const delay = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms))

const matches = (q: string, ...fields: (string | null)[]) =>
  fields.some((f) => f?.toLowerCase().includes(q.toLowerCase()))

/** Jarak km dari pembeli ke warung, null bila koordinat tidak lengkap. */
function distanceKm(
  store: { latitude: number | null; longitude: number | null },
  lat?: number,
  lng?: number,
): number | null {
  if (lat === undefined || lng === undefined || store.latitude === null || store.longitude === null) return null
  return haversineMeters(store.latitude, store.longitude, lat, lng) / 1000
}

function sortBy<T>(list: T[], key: (x: T) => number | string | null, dir: 1 | -1): T[] {
  return [...list].sort((a, b) => {
    const ka = key(a)
    const kb = key(b)
    if (ka === null && kb === null) return 0
    if (ka === null) return 1 // nulls last
    if (kb === null) return -1
    return ka < kb ? -dir : ka > kb ? dir : 0
  })
}

function randomOrderCode(): string {
  return `SF-${randomHex(5).toUpperCase()}`
}

const demoApi: Api = {
  mode: 'demo',

  async listStores(params) {
    await delay()
    const { limit, offset } = pageArgs(params)
    const db = loadDemo()
    const q = params?.query?.trim()
    let list: StoreListItem[] = db.stores
      .filter((s) => s.is_active && (!q || matches(q, s.name, s.description, s.address)))
      .map((s) => {
        const dist = distanceKm(s, params?.lat, params?.lng)
        return {
          id: s.id,
          name: s.name,
          description: s.description,
          address: s.address,
          latitude: s.latitude,
          longitude: s.longitude,
          phone: s.phone,
          image_url: s.image_url,
          opening_hours: s.opening_hours,
          service_radius_km: s.service_radius_km,
          distance_km: dist,
          within_service_radius: dist === null ? null : dist <= (s.service_radius_km ?? 0),
        }
      })
    const sort = params?.sort ?? 'name'
    if (sort === 'nearest') list = sortBy(list, (s) => s.distance_km, 1)
    else if (sort === 'farthest') list = sortBy(list, (s) => s.distance_km, -1)
    else list = sortBy(list, (s) => s.name.toLowerCase(), 1)
    return toPage(list.slice(offset, offset + limit), limit, offset)
  },

  async searchProducts(params) {
    await delay()
    const { limit, offset } = pageArgs(params)
    const { minPrice, maxPrice } = params ?? {}
    if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
      throw new ApiError('invalid_price_range')
    }
    const db = loadDemo()
    const q = params?.query?.trim()
    let list: ProductListItem[] = []
    for (const p of db.products) {
      const s = db.stores.find((x) => x.id === p.store_id)
      if (!s || !s.is_active || !p.is_available) continue
      if (params?.storeId && p.store_id !== params.storeId) continue
      if (q && !matches(q, p.name, p.description, s.name)) continue
      if (minPrice !== undefined && p.price < minPrice) continue
      if (maxPrice !== undefined && p.price > maxPrice) continue
      const dist = distanceKm(s, params?.lat, params?.lng)
      list.push({
        id: p.id,
        store_id: p.store_id,
        store_name: s.name,
        name: p.name,
        description: p.description,
        price: p.price,
        image_url: p.image_url,
        service_radius_km: s.service_radius_km,
        distance_km: dist,
        within_service_radius: dist === null ? null : dist <= (s.service_radius_km ?? 0),
      })
    }
    switch (params?.sort ?? 'name') {
      case 'nearest':
        list = sortBy(list, (x) => x.distance_km, 1)
        break
      case 'farthest':
        list = sortBy(list, (x) => x.distance_km, -1)
        break
      case 'cheapest':
        list = sortBy(list, (x) => x.price, 1)
        break
      case 'priciest':
        list = sortBy(list, (x) => x.price, -1)
        break
      default:
        list = sortBy(list, (x) => x.name.toLowerCase(), 1)
    }
    return toPage(list.slice(offset, offset + limit), limit, offset)
  },

  async listMyOrders(params) {
    await delay()
    const { limit, offset } = pageArgs(params)
    const { actor } = demoActor()
    const db = loadDemo()
    const ownerOf = (storeId: string) => db.stores.find((s) => s.id === storeId)?.owner_id
    const visible = db.orders.filter((o) => {
      if (params?.status && o.order_status !== params.status) return false
      switch (actor.role) {
        case 'customer':
          return o.customer_id === actor.userId
        case 'seller':
          return ownerOf(o.store_id) === actor.userId
        case 'driver':
          return o.driver_id === actor.userId
        case 'admin':
          return true
      }
    })
    const sorted = [...visible].sort((a, b) => b.created_at.localeCompare(a.created_at))
    return toPage(structuredClone(sorted.slice(offset, offset + limit)), limit, offset)
  },

  async createOrder(input) {
    await delay(300)
    const { actor } = demoActor()
    if (actor.role !== 'customer') throw new ApiError('customer_role_required')
    assertCreateOrderInput(input)
    const db = loadDemo()

    // Klik ganda / coba ulang: kunci yang sama mengembalikan pesanan yang sama.
    const idemKey = `${actor.userId}:${input.idempotencyKey}`
    const existingId = db.idempotency[idemKey]
    if (existingId) {
      const existing = db.orders.find((o) => o.order_id === existingId)
      if (existing) {
        const same =
          existing.store_id === input.storeId &&
          existing.items.length === input.items.length &&
          input.items.every((i) =>
            existing.items.some((e) => e.product_id === i.productId && e.quantity === i.quantity),
          )
        if (!same) throw new ApiError('idempotency_key_conflict')
        return {
          order_id: existing.order_id,
          order_code: existing.order_code,
          subtotal: existing.subtotal,
          delivery_fee: existing.delivery_fee,
          total: existing.total,
          payment_method: existing.payment_method,
          payment_status: existing.payment_status,
          order_status: existing.order_status,
        }
      }
    }

    if (input.items.length > 50) throw new ApiError('item_count_out_of_range')
    const address = input.deliveryAddress.trim()
    if (address.length > 1500) throw new ApiError('delivery_address_required')
    const note = input.deliveryNote?.trim() || null
    if (note && note.length > 1000) throw new ApiError('delivery_note_too_long')
    const lat = roundCoord(input.deliveryLatitude)
    const lng = roundCoord(input.deliveryLongitude)
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) throw new ApiError('valid_delivery_coordinates_required')

    const store = db.stores.find((s) => s.id === input.storeId && s.is_active)
    if (!store) throw new ApiError('store_not_available')
    if (!store.service_radius_km || store.service_radius_km <= 0 || store.latitude === null || store.longitude === null) {
      throw new ApiError('store_delivery_not_configured')
    }
    const estimate = estimateDeliveryFee(
      { lat: store.latitude, lng: store.longitude },
      { lat, lng },
      store.service_radius_km,
    )
    if (!estimate.withinRadius) throw new ApiError('outside_store_service_radius')

    const seen = new Set<string>()
    const items: OrderItem[] = []
    for (const i of input.items) {
      if (!i.productId || !Number.isInteger(i.quantity) || i.quantity < 1 || i.quantity > 99) {
        throw new ApiError('invalid_order_item')
      }
      if (seen.has(i.productId)) throw new ApiError('duplicate_product_in_items')
      seen.add(i.productId)
      const p = db.products.find((x) => x.id === i.productId)
      if (!p || p.store_id !== store.id || !p.is_available) throw new ApiError('product_unavailable_or_wrong_store')
      items.push({
        product_id: p.id,
        name: p.name,
        unit_price: p.price,
        quantity: i.quantity,
        line_total: p.price * i.quantity,
      })
    }

    const subtotal = items.reduce((sum, i) => sum + i.line_total, 0)
    const order: Order = {
      order_id: `ord-${randomHex(8)}`,
      order_code: randomOrderCode(),
      store_id: store.id,
      store_name: store.name,
      customer_id: actor.userId,
      driver_id: null,
      delivery_address: address,
      delivery_latitude: lat,
      delivery_longitude: lng,
      delivery_note: note,
      subtotal,
      // Ditetapkan "server" (adapter), bukan dari input checkout.
      delivery_fee: estimate.fee,
      total: subtotal + estimate.fee,
      payment_method: 'cod',
      payment_status: 'unpaid',
      order_status: 'pending_seller',
      created_at: new Date().toISOString(),
      items,
    }
    db.orders.push(order)
    db.history.push({
      order_id: order.order_id,
      old_status: null,
      new_status: 'pending_seller',
      changed_by: actor.userId,
      note: null,
      created_at: order.created_at,
    })
    db.idempotency[idemKey] = order.order_id
    saveDemo()
    return {
      order_id: order.order_id,
      order_code: order.order_code,
      subtotal: order.subtotal,
      delivery_fee: order.delivery_fee,
      total: order.total,
      payment_method: order.payment_method,
      payment_status: order.payment_status,
      order_status: order.order_status,
    }
  },

  async changeOrderStatus(orderId, newStatus, note) {
    await delay()
    const { actor } = demoActor()
    const db = loadDemo()
    const order = db.orders.find((o) => o.order_id === orderId)
    if (!order) throw new ApiError('order_not_found')
    const ownerId = db.stores.find((s) => s.id === order.store_id)?.owner_id ?? ''
    const problem = checkStatusChange({ ...order, store_owner_id: ownerId }, actor, newStatus, note)
    if (problem) throw new ApiError(problem)

    const old = order.order_status
    order.order_status = newStatus
    db.history.push({
      order_id: orderId,
      old_status: old,
      new_status: newStatus,
      changed_by: actor.userId,
      note: note?.trim() || null,
      created_at: new Date().toISOString(),
    })
    saveDemo()
    return newStatus
  },

  async assignOrderDriver(orderId, driverId) {
    await delay()
    const { actor } = demoActor()
    if (actor.role !== 'admin') throw new ApiError('admin_role_required')
    const db = loadDemo()
    if (!db.profiles.some((p) => p.id === driverId && p.role === 'driver')) {
      throw new ApiError('driver_profile_required')
    }
    const order = db.orders.find((o) => o.order_id === orderId)
    if (!order) throw new ApiError('order_not_found')
    if (!ASSIGNABLE_STATUSES.includes(order.order_status)) throw new ApiError('order_not_assignable')
    if (order.driver_id === driverId) return driverId

    const previous = order.driver_id
    order.driver_id = driverId
    db.history.push({
      order_id: orderId,
      old_status: order.order_status,
      new_status: order.order_status,
      changed_by: actor.userId,
      note: previous ? `driver_reassigned:${previous}->${driverId}` : `driver_assigned:${driverId}`,
      created_at: new Date().toISOString(),
    })
    saveDemo()
    return driverId
  },
}

/** Adapter aktif: Supabase live bila env valid, data contoh bila tidak. */
export const api: Api = isMockMode ? demoApi : liveApi
