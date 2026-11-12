import { estimateDeliveryFee, haversineMeters, roundCoord } from './delivery'
import { createSeed, DEMO_ACCOUNTS, type DemoData } from './mock'
import { checkStatusChange, checkStatusChangeByRole, ASSIGNABLE_STATUSES, type Actor } from './orderRules'
import { ALL_ROLES, type Role } from './roles'
import { isMockMode, supabase } from './supabase'
import type {
  CreateOrderInput,
  CreateOrderResult,
  OpeningHours,
  Order,
  OrderItem,
  OrderStatus,
  OrderStatusHistory,
  CustomerAddress,
  Page,
  PaymentMethod,
  PaymentStatus,
  Product,
  ProductListItem,
  ProductSort,
  Profile,
  Store,
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
  cancel_too_late:
    'Pesanan ini sudah tidak bisa dibatalkan karena statusnya baru saja berubah. Muat ulang untuk melihat status terbaru, lalu hubungi warung bila perlu.',
  // Akun
  invalid_credentials: 'Email atau kata sandi salah.',
  email_not_confirmed: 'Email belum dikonfirmasi. Buka tautan yang kami kirim ke emailmu.',
  user_already_exists: 'Email ini sudah terdaftar. Silakan masuk.',
  weak_password: 'Kata sandi terlalu lemah. Pakai minimal 8 huruf/angka.',
  rate_limited: 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.',
  signup_disabled: 'Pendaftaran sedang ditutup.',
  profile_unavailable: 'Data akun tidak bisa dibaca. Coba masuk lagi.',
  demo_only: 'Fitur ini hanya ada di mode demo.',
  live_only: 'Di mode demo, pakai akun contoh di halaman Masuk.',
  // Alamat
  address_customer_only: 'Hanya akun pelanggan yang bisa menyimpan alamat.',
  address_limit_reached: 'Alamat tersimpan sudah 10. Hapus salah satu dulu.',
  address_label_invalid: 'Nama alamat wajib diisi (maksimal 60 huruf).',
  address_text_invalid: 'Alamat wajib diisi (maksimal 1.500 huruf).',
  address_note_too_long: 'Patokan terlalu panjang (maksimal 1.000 huruf).',
  address_coordinates_invalid: 'Titik lokasi tidak valid.',
  address_not_found: 'Alamat tidak ditemukan.',
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

/**
 * Kunci mentah. Jangan dipanggil langsung dari tombol checkout:
 * pakai `placeOrder()` / `getCheckoutAttemptKey()` supaya kunci dipakai ulang saat coba lagi.
 */
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
  /** Riwayat status satu pesanan (termasuk alasan batal/tolak), urut lama → baru. */
  listOrderHistory(orderId: string): Promise<OrderStatusHistory[]>
}

/**
 * Pembatalan yang ditolak karena status sudah berubah (mis. penjual menerima lebih dulu)
 * diberi pesan khusus, supaya pengguna tahu alasannya TIDAK tercatat dan harus
 * menghubungi warung/admin, bukan sekadar "tidak bisa diubah".
 */
function explainCancelFailure(err: unknown, newStatus: OrderStatus): unknown {
  if (
    newStatus === 'cancelled' &&
    err instanceof ApiError &&
    (err.code === 'status_transition_not_allowed' || err.code === 'cancel_from_terminal_status_not_allowed')
  ) {
    return new ApiError('cancel_too_late')
  }
  return err
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

/**
 * Urutan yang boleh dikirim. 'delivery_fee' sengaja TIDAK ada: RPC mengurutkannya
 * dengan tarif lama yang tersimpan, bukan ongkir dari jarak. Nilai lain jatuh ke 'name'.
 */
const STORE_SORTS: readonly StoreSort[] = ['name', 'nearest', 'farthest']
const PRODUCT_SORTS: readonly ProductSort[] = ['name', 'nearest', 'farthest', 'cheapest', 'priciest']

function safeSort<T extends string>(value: string | undefined, allowed: readonly T[]): T {
  return allowed.includes(value as T) ? (value as T) : allowed[0]
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

/**
 * Peran pengguna live, diisi AuthContext (Task 3) dari profil yang dibaca dari SERVER
 * (bukan localStorage). Hanya untuk pengecekan sisi klien; RLS/RPC tetap penentu.
 */
let liveSessionRole: Role | null = null

export function setSessionRole(role: Role | null): void {
  liveSessionRole = role
}

const liveApi: Api = {
  mode: 'live',

  async listStores(params) {
    const { limit, offset } = pageArgs(params)
    const data = await rpc('list_stores', {
      p_query: params?.query?.trim() || null,
      p_latitude: params?.lat ?? null,
      p_longitude: params?.lng ?? null,
      p_sort: safeSort(params?.sort, STORE_SORTS),
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
      p_sort: safeSort(params?.sort, PRODUCT_SORTS),
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
    // Pengecekan klien sebelum RPC; server juga mewajibkan alasan (completion_reason_required).
    const problem = checkStatusChangeByRole(liveSessionRole, newStatus, trimmed)
    if (problem) throw new ApiError(problem)
    try {
      const data = await rpc('change_order_status', {
        p_order_id: orderId,
        p_new_status: newStatus,
        p_note: trimmed,
      })
      return data as OrderStatus
    } catch (err) {
      throw explainCancelFailure(err, newStatus)
    }
  },

  async assignOrderDriver(orderId, driverId) {
    const data = await rpc('assign_order_driver', { p_order_id: orderId, p_driver_id: driverId })
    return String(data)
  },

  async listOrderHistory(orderId) {
    if (!supabase) throw new ApiError('unknown')
    // Tabel dibaca langsung: RLS order_status_history_participant_read hanya
    // mengizinkan pelanggan, penjual, kurir bertugas, dan admin pesanan ini.
    const { data, error } = await supabase
      .from('order_status_history')
      .select('order_id, old_status, new_status, changed_by, note, created_at')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true })
    if (error) throw toApiError(error)
    return rows(data).map(
      (r): OrderStatusHistory => ({
        order_id: String(r.order_id),
        old_status: (r.old_status as OrderStatus | null) ?? null,
        new_status: r.new_status as OrderStatus,
        changed_by: strOrNull(r.changed_by),
        note: strOrNull(r.note),
        created_at: String(r.created_at),
      }),
    )
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
  notifyDemo()
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
    const sort = safeSort(params?.sort, STORE_SORTS)
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
    switch (safeSort(params?.sort, PRODUCT_SORTS)) {
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
    if (problem) throw explainCancelFailure(new ApiError(problem), newStatus)

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

  async listOrderHistory(orderId) {
    await delay()
    const { actor } = demoActor()
    const db = loadDemo()
    const order = db.orders.find((o) => o.order_id === orderId)
    const ownerId = order ? db.stores.find((s) => s.id === order.store_id)?.owner_id : undefined
    // Sama dengan RLS participant_read: pelanggan, pemilik warung, kurir bertugas, admin.
    const visible =
      order &&
      (actor.role === 'admin' ||
        order.customer_id === actor.userId ||
        order.driver_id === actor.userId ||
        ownerId === actor.userId)
    if (!visible) return []
    return structuredClone(
      db.history.filter((h) => h.order_id === orderId).sort((a, b) => a.created_at.localeCompare(b.created_at)),
    )
  },
}

/** Adapter aktif: Supabase live bila env valid, data contoh bila tidak. */
export const api: Api = isMockMode ? demoApi : liveApi

/* ------------------------------------------------------------------ */
/* Percobaan checkout (R7.8)                                           */
/* ------------------------------------------------------------------ */

/*
 * Satu kunci idempotency per PERCOBAAN checkout, bukan per tekan tombol:
 * - kunci disimpan di localStorage bersama "sidik" keranjang (warung + menu + jumlah),
 *   jadi coba ulang setelah gagal jaringan / muat ulang halaman memakai kunci yang sama;
 * - kunci diganti hanya bila isi keranjang berubah, atau setelah pesanan berhasil;
 * - alamat/catatan/pin TIDAK masuk sidik: bila percobaan pertama ternyata sudah masuk
 *   server, coba ulang mengembalikan pesanan yang sama (tidak dobel) walau alamat diedit.
 *   Pesanan yang tampil selalu data server, jadi alamat yang benar tetap terlihat.
 */

const CHECKOUT_ATTEMPT_KEY = 'sendfood.checkout.attempt'

type CheckoutAttempt = { fingerprint: string; key: string }

export type PlaceOrderInput = Omit<CreateOrderInput, 'idempotencyKey'>

/** Sidik keranjang: sama dengan yang dibandingkan server (produk + jumlah) plus warung. */
function cartFingerprint(input: Pick<CreateOrderInput, 'storeId' | 'items'>): string {
  const items = [...input.items]
    .map((i) => `${i.productId}x${i.quantity}`)
    .sort()
    .join(',')
  return `${input.storeId}|${items}`
}

function readAttempt(): CheckoutAttempt | null {
  try {
    const raw = localStorage.getItem(CHECKOUT_ATTEMPT_KEY)
    const parsed = raw ? (JSON.parse(raw) as CheckoutAttempt) : null
    return parsed && typeof parsed.key === 'string' && IDEMPOTENCY_KEY_RE.test(parsed.key) ? parsed : null
  } catch {
    return null
  }
}

let memoryAttempt: CheckoutAttempt | null = null

/** Ambil kunci percobaan untuk keranjang ini; buat baru hanya bila belum ada atau keranjang berubah. */
export function getCheckoutAttemptKey(input: Pick<CreateOrderInput, 'storeId' | 'items'>): string {
  const fingerprint = cartFingerprint(input)
  const current = readAttempt() ?? memoryAttempt
  if (current && current.fingerprint === fingerprint) return current.key
  const next: CheckoutAttempt = { fingerprint, key: newIdempotencyKey() }
  memoryAttempt = next
  try {
    localStorage.setItem(CHECKOUT_ATTEMPT_KEY, JSON.stringify(next))
  } catch {
    // Tetap aman selama tab terbuka (memoryAttempt).
  }
  return next.key
}

/** Lupakan percobaan (setelah berhasil, atau saat keluar akun). */
export function clearCheckoutAttempt(): void {
  memoryAttempt = null
  try {
    localStorage.removeItem(CHECKOUT_ATTEMPT_KEY)
  } catch {
    // abaikan
  }
}

const inflight = new Map<string, Promise<CreateOrderResult>>()

/**
 * Pakai ini dari tombol "Pesan Sekarang" (Task 4).
 * Klik ganda saat request masih berjalan mendapat promise yang sama;
 * coba ulang setelah gagal memakai kunci yang sama.
 */
export function placeOrder(input: PlaceOrderInput): Promise<CreateOrderResult> {
  const key = getCheckoutAttemptKey(input)
  const running = inflight.get(key)
  if (running) return running

  const promise = api
    .createOrder({ ...input, idempotencyKey: key })
    .then((result) => {
      clearCheckoutAttempt()
      return result
    })
    .catch((err: unknown) => {
      // Kunci dipakai server untuk isi lain: mulai percobaan baru pada tekan berikutnya.
      if (err instanceof ApiError && err.code === 'idempotency_key_conflict') clearCheckoutAttempt()
      throw err
    })
    .finally(() => {
      inflight.delete(key)
    })
  inflight.set(key, promise)
  return promise
}

/* ------------------------------------------------------------------ */
/* Akun: masuk/daftar, profil, alamat tersimpan (R2.1–R2.4)            */
/* ------------------------------------------------------------------ */

export type SignUpInput = {
  fullName: string
  phone?: string
  email: string
  password: string
}

export type SignUpResult = {
  /** null bila server meminta konfirmasi email dulu. */
  profile: Profile | null
  needsEmailConfirm: boolean
}

export type AddressInput = {
  label: string
  address: string
  latitude: number | null
  longitude: number | null
  note?: string | null
}

export type AccountApi = {
  mode: 'live' | 'demo'
  /** Pengguna yang sedang masuk. Peran live SELALU dari tabel profiles di server. */
  getCurrentUser(): Promise<Profile | null>
  /** Dipanggil saat status masuk berubah (tab ini atau tab lain). Mengembalikan fungsi berhenti. */
  onChange(callback: () => void): () => void
  signIn(email: string, password: string): Promise<Profile>
  signUp(input: SignUpInput): Promise<SignUpResult>
  signOut(): Promise<void>
  /** Hanya mode demo: masuk sebagai akun contoh. Mode live menolak. */
  demoSignIn(role: Role): Promise<Profile>
  listAddresses(): Promise<CustomerAddress[]>
  addAddress(input: AddressInput): Promise<CustomerAddress>
  deleteAddress(id: string): Promise<void>
}

export const MIN_PASSWORD_LENGTH = 8
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Batas yang sama dengan constraint tabel customer_addresses. */
export function validateAddress(input: AddressInput): string | null {
  const label = input.label.trim()
  const address = input.address.trim()
  const note = input.note?.trim() ?? ''
  if (label.length < 1 || label.length > 60) return 'address_label_invalid'
  if (address.length < 1 || address.length > 1500) return 'address_text_invalid'
  if (note.length > 1000) return 'address_note_too_long'
  const { latitude: lat, longitude: lng } = input
  if ((lat === null) !== (lng === null)) return 'address_coordinates_invalid'
  if (lat !== null && lng !== null) {
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return 'address_coordinates_invalid'
    }
  }
  return null
}

function normalizeAddress(input: AddressInput) {
  return {
    label: input.label.trim(),
    address: input.address.trim(),
    latitude: input.latitude === null ? null : roundCoord(input.latitude),
    longitude: input.longitude === null ? null : roundCoord(input.longitude),
    note: input.note?.trim() || null,
  }
}

/** Galat Supabase Auth → kode galat aplikasi. */
function toAuthError(error: { code?: string; message?: string; status?: number } | null): ApiError {
  const code = error?.code ?? ''
  const msg = error?.message ?? ''
  if (code === 'invalid_credentials' || /invalid login credentials/i.test(msg)) return new ApiError('invalid_credentials')
  if (code === 'email_not_confirmed') return new ApiError('email_not_confirmed')
  if (code === 'user_already_exists' || code === 'email_exists') return new ApiError('user_already_exists')
  if (code === 'weak_password') return new ApiError('weak_password')
  if (code.startsWith('over_') || error?.status === 429) return new ApiError('rate_limited')
  if (code === 'signup_disabled') return new ApiError('signup_disabled')
  if (/fetch|network/i.test(msg)) return new ApiError('network')
  return new ApiError('unknown')
}

/** Dipanggil saat keluar akun: lupakan data sesi yang tersimpan di HP. */
function forgetSessionData(): void {
  setSessionRole(null)
  clearCheckoutAttempt()
}

const liveAccount: AccountApi = {
  mode: 'live',

  async getCurrentUser() {
    if (!supabase) return null
    // getUser() memvalidasi token ke server (bukan sekadar membaca token lokal).
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user) {
      setSessionRole(null)
      return null
    }
    const { data: row, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, phone, role')
      .eq('id', data.user.id)
      .maybeSingle()
    if (profileError || !row || !ALL_ROLES.includes(row.role as Role)) {
      // Gagal-tertutup: tanpa profil dari server, tidak ada peran.
      setSessionRole(null)
      throw new ApiError('profile_unavailable')
    }
    const profile: Profile = {
      id: String(row.id),
      full_name: String(row.full_name ?? ''),
      phone: strOrNull(row.phone),
      role: row.role as Role,
      email: data.user.email ?? undefined,
    }
    setSessionRole(profile.role)
    return profile
  },

  onChange(callback) {
    if (!supabase) return () => {}
    const { data } = supabase.auth.onAuthStateChange(() => {
      // Jangan memanggil Supabase langsung di dalam callback ini (bisa macet); tunda sebentar.
      setTimeout(callback, 0)
    })
    return () => data.subscription.unsubscribe()
  },

  async signIn(email, password) {
    if (!supabase) throw new ApiError('unknown')
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) throw toAuthError(error)
    const profile = await liveAccount.getCurrentUser()
    if (!profile) throw new ApiError('profile_unavailable')
    return profile
  },

  async signUp(input) {
    if (!supabase) throw new ApiError('unknown')
    // Peran TIDAK dikirim: trigger handle_new_auth_user selalu membuat profil 'customer'.
    const { data, error } = await supabase.auth.signUp({
      email: input.email.trim(),
      password: input.password,
      options: {
        data: { full_name: input.fullName.trim(), phone: input.phone?.trim() || null },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    })
    if (error) throw toAuthError(error)
    // Bila konfirmasi email aktif, Supabase mengembalikan user tanpa identitas untuk email yang sudah ada.
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      throw new ApiError('user_already_exists')
    }
    if (!data.session) return { profile: null, needsEmailConfirm: true }
    return { profile: await liveAccount.getCurrentUser(), needsEmailConfirm: false }
  },

  async signOut() {
    forgetSessionData()
    if (supabase) await supabase.auth.signOut()
  },

  async demoSignIn() {
    throw new ApiError('demo_only')
  },

  async listAddresses() {
    if (!supabase) throw new ApiError('unknown')
    const { data, error } = await supabase
      .from('customer_addresses')
      .select('id, customer_id, label, address, latitude, longitude, note')
      .order('created_at', { ascending: true })
    if (error) throw toApiError(error)
    return rows(data).map(mapAddressRow)
  },

  async addAddress(input) {
    if (!supabase) throw new ApiError('unknown')
    const problem = validateAddress(input)
    if (problem) throw new ApiError(problem)
    if (liveSessionRole !== 'customer') throw new ApiError('address_customer_only')
    // customer_id diisi server (default auth.uid()); kolom ini memang tidak boleh dikirim.
    const { data, error } = await supabase
      .from('customer_addresses')
      .insert(normalizeAddress(input))
      .select('id, customer_id, label, address, latitude, longitude, note')
      .single()
    if (error) {
      if (error.code === '42501') throw new ApiError('address_customer_only')
      throw toApiError(error)
    }
    return mapAddressRow(data as Row)
  },

  async deleteAddress(id) {
    if (!supabase) throw new ApiError('unknown')
    const { data, error } = await supabase.from('customer_addresses').delete().eq('id', id).select('id')
    if (error) throw toApiError(error)
    if (rows(data).length === 0) throw new ApiError('address_not_found')
  },
}

function mapAddressRow(r: Row): CustomerAddress {
  return {
    id: String(r.id),
    customer_id: String(r.customer_id),
    label: String(r.label),
    address: String(r.address),
    latitude: numOrNull(r.latitude),
    longitude: numOrNull(r.longitude),
    note: strOrNull(r.note),
  }
}

const demoListeners = new Set<() => void>()
const notifyDemo = () => demoListeners.forEach((cb) => cb())

const demoAccount: AccountApi = {
  mode: 'demo',

  async getCurrentUser() {
    const id = getDemoUserId()
    const profile = id ? loadDemo().profiles.find((p) => p.id === id) : undefined
    return profile ? structuredClone(profile) : null
  },

  onChange(callback) {
    demoListeners.add(callback)
    const onStorage = (e: StorageEvent) => {
      if (e.key === DEMO_USER_KEY || e.key === DEMO_DATA_KEY || e.key === null) {
        demoCache = null // tab lain mengubah data: baca ulang
        callback()
      }
    }
    window.addEventListener('storage', onStorage)
    return () => {
      demoListeners.delete(callback)
      window.removeEventListener('storage', onStorage)
    }
  },

  async signIn() {
    throw new ApiError('live_only')
  },

  async signUp() {
    throw new ApiError('live_only')
  },

  async signOut() {
    forgetSessionData()
    setDemoUserId(null)
    notifyDemo()
  },

  async demoSignIn(role) {
    await delay()
    const id = DEMO_ACCOUNTS[role]
    const profile = loadDemo().profiles.find((p) => p.id === id)
    if (!profile) throw new ApiError('unknown')
    // Ganti akun = ganti orang: jangan bawa percobaan checkout akun sebelumnya.
    clearCheckoutAttempt()
    setDemoUserId(id)
    notifyDemo()
    return structuredClone(profile)
  },

  async listAddresses() {
    await delay()
    const { actor } = demoActor()
    return structuredClone(loadDemo().addresses.filter((a) => a.customer_id === actor.userId))
  },

  async addAddress(input) {
    await delay()
    const { actor } = demoActor()
    const problem = validateAddress(input)
    if (problem) throw new ApiError(problem)
    if (actor.role !== 'customer') throw new ApiError('address_customer_only')
    const db = loadDemo()
    if (db.addresses.filter((a) => a.customer_id === actor.userId).length >= 10) {
      throw new ApiError('address_limit_reached')
    }
    const address: CustomerAddress = {
      id: `addr-${randomHex(6)}`,
      customer_id: actor.userId,
      ...normalizeAddress(input),
    }
    db.addresses.push(address)
    saveDemo()
    return structuredClone(address)
  },

  async deleteAddress(id) {
    await delay()
    const { actor } = demoActor()
    const db = loadDemo()
    const index = db.addresses.findIndex((a) => a.id === id && a.customer_id === actor.userId)
    if (index < 0) throw new ApiError('address_not_found')
    db.addresses.splice(index, 1)
    saveDemo()
  },
}

/** Adapter akun aktif (pasangan `api`). */
export const account: AccountApi = isMockMode ? demoAccount : liveAccount

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim())
}

/* ------------------------------------------------------------------ */
/* Pencarian satu warung / satu pesanan                                */
/* ------------------------------------------------------------------ */

/*
 * Kontrak RPC belum punya "ambil satu warung" atau "ambil satu pesanan", dan aplikasi
 * tidak membaca tabel katalog/riwayat langsung (R9.1). Jadi keduanya mencari lewat
 * list_stores / list_my_orders per halaman (100 baris), dengan batas halaman supaya
 * tidak berputar tanpa akhir. Cukup untuk skala satu desa.
 */
const LOOKUP_PAGE = 100
const LOOKUP_MAX_PAGES = 10

export async function getStore(storeId: string): Promise<StoreListItem | null> {
  for (let page = 0; page < LOOKUP_MAX_PAGES; page++) {
    const res = await api.listStores({ limit: LOOKUP_PAGE, offset: page * LOOKUP_PAGE })
    const found = res.items.find((s) => s.id === storeId)
    if (found) return found
    if (!res.hasMore) return null
  }
  return null
}

export async function getMyOrder(orderId: string): Promise<Order | null> {
  for (let page = 0; page < LOOKUP_MAX_PAGES; page++) {
    const res = await api.listMyOrders({ limit: LOOKUP_PAGE, offset: page * LOOKUP_PAGE })
    const found = res.items.find((o) => o.order_id === orderId)
    if (found) return found
    if (!res.hasMore) return null
  }
  return null
}

/* ------------------------------------------------------------------ */
/* Penjual: warung sendiri + menu (R4.2, R4.4)                         */
/* ------------------------------------------------------------------ */

/*
 * Tidak ada RPC khusus penjual, jadi warung & menu milik sendiri dibaca/ditulis
 * langsung ke tabel. Server membatasi lewat RLS (owner_id = auth.uid(), peran seller),
 * hak kolom (hanya nama/deskripsi/alamat/telepon/jam/foto; menu: nama/harga/deskripsi/
 * is_available), dan trigger guard_store_update (radius, ongkir, status aktif, pemilik
 * tidak bisa diubah penjual; titik lokasi terkunci selama warung aktif).
 * Tidak ada kolom stok: ketersediaan hanya is_available ("Tersedia").
 */

export type MyStore = Store

export type StoreProfileInput = {
  name: string
  description: string | null
  address: string
  phone: string | null
}

export type ProductInput = {
  name: string
  description: string | null
  price: number
  is_available: boolean
}

export const PRODUCT_PRICE_MAX = 10_000_000

Object.assign(ERROR_MESSAGES, {
  seller_role_required: 'Hanya akun penjual yang bisa mengubah warung dan menu.',
  store_not_found_for_seller: 'Akun ini belum punya warung. Hubungi admin.',
  store_name_invalid: 'Nama warung wajib diisi (maksimal 160 huruf).',
  store_address_invalid: 'Alamat warung wajib diisi (maksimal 1.000 huruf).',
  store_description_too_long: 'Deskripsi warung maksimal 1.000 huruf.',
  store_phone_invalid: 'Nomor telepon hanya angka, contoh 0812-3456-7890.',
  store_operational_field_forbidden: 'Radius, ongkir, dan status aktif hanya bisa diubah admin.',
  store_location_locked: 'Titik lokasi warung aktif dikunci. Hubungi admin untuk memindahkannya.',
  product_name_invalid: 'Nama menu wajib diisi (maksimal 160 huruf).',
  product_description_too_long: 'Deskripsi menu maksimal 500 huruf.',
  product_price_invalid: 'Harga wajib angka bulat, Rp1 sampai Rp10.000.000.',
  product_not_found: 'Menu tidak ditemukan.',
} satisfies Record<string, string>)

export function validateStoreProfile(input: StoreProfileInput): string | null {
  const name = input.name.trim()
  const address = input.address.trim()
  if (name.length < 1 || name.length > 160) return 'store_name_invalid'
  if (address.length < 1 || address.length > 1000) return 'store_address_invalid'
  if ((input.description?.trim().length ?? 0) > 1000) return 'store_description_too_long'
  const phone = input.phone?.trim() ?? ''
  if (phone && !/^[0-9+\-\s]{6,40}$/.test(phone)) return 'store_phone_invalid'
  return null
}

export function validateProduct(input: ProductInput): string | null {
  const name = input.name.trim()
  if (name.length < 1 || name.length > 160) return 'product_name_invalid'
  if ((input.description?.trim().length ?? 0) > 500) return 'product_description_too_long'
  if (!Number.isInteger(input.price) || input.price < 1 || input.price > PRODUCT_PRICE_MAX) return 'product_price_invalid'
  return null
}

const normStore = (i: StoreProfileInput) => ({
  name: i.name.trim(),
  description: i.description?.trim() || null,
  address: i.address.trim(),
  phone: i.phone?.trim() || null,
})

const normProduct = (i: ProductInput) => ({
  name: i.name.trim(),
  description: i.description?.trim() || null,
  price: i.price,
  is_available: i.is_available,
})

export type SellerApi = {
  /** Warung milik penjual yang masuk; null bila belum punya. */
  getMyStore(): Promise<MyStore | null>
  updateMyStore(input: StoreProfileInput): Promise<MyStore>
  /** Semua menu warung sendiri, termasuk yang tidak tersedia. */
  listMyProducts(): Promise<Product[]>
  addProduct(input: ProductInput): Promise<Product>
  updateProduct(id: string, input: ProductInput): Promise<Product>
}

const STORE_COLS = 'id, owner_id, name, description, address, latitude, longitude, phone, image_url, opening_hours, is_active, service_radius_km'
const PRODUCT_COLS = 'id, store_id, name, description, price, image_url, is_available'

function mapStore(r: Row): MyStore {
  return {
    id: String(r.id),
    owner_id: String(r.owner_id),
    name: String(r.name),
    description: strOrNull(r.description),
    address: String(r.address),
    latitude: numOrNull(r.latitude),
    longitude: numOrNull(r.longitude),
    phone: strOrNull(r.phone),
    image_url: strOrNull(r.image_url),
    opening_hours: parseOpeningHours(r.opening_hours),
    is_active: Boolean(r.is_active),
    service_radius_km: numOrNull(r.service_radius_km),
  }
}

function mapProduct(r: Row): Product {
  return {
    id: String(r.id),
    store_id: String(r.store_id),
    name: String(r.name),
    description: strOrNull(r.description),
    price: num(r.price),
    image_url: strOrNull(r.image_url),
    is_available: Boolean(r.is_available),
  }
}

function tableError(error: { code?: string; message?: string }): ApiError {
  if (error.code === '42501') return new ApiError('seller_role_required')
  return toApiError(error)
}

async function liveUserId(): Promise<string> {
  if (!supabase) throw new ApiError('unknown')
  const { data } = await supabase.auth.getUser()
  if (!data.user) throw new ApiError('authentication_required')
  return data.user.id
}

const liveSeller: SellerApi = {
  async getMyStore() {
    if (!supabase) throw new ApiError('unknown')
    if (liveSessionRole !== 'seller') throw new ApiError('seller_role_required')
    const uid = await liveUserId()
    const { data, error } = await supabase.from('stores').select(STORE_COLS).eq('owner_id', uid).order('created_at').limit(1)
    if (error) throw tableError(error)
    const r = rows(data)[0]
    return r ? mapStore(r) : null
  },

  async updateMyStore(input) {
    if (!supabase) throw new ApiError('unknown')
    const problem = validateStoreProfile(input)
    if (problem) throw new ApiError(problem)
    const store = await liveSeller.getMyStore()
    if (!store) throw new ApiError('store_not_found_for_seller')
    // Hanya kolom profil: kolom operasional tidak pernah dikirim.
    const { data, error } = await supabase.from('stores').update(normStore(input)).eq('id', store.id).select(STORE_COLS).single()
    if (error) throw tableError(error)
    return mapStore(data as Row)
  },

  async listMyProducts() {
    if (!supabase) throw new ApiError('unknown')
    const store = await liveSeller.getMyStore()
    if (!store) throw new ApiError('store_not_found_for_seller')
    const { data, error } = await supabase.from('products').select(PRODUCT_COLS).eq('store_id', store.id).order('name')
    if (error) throw tableError(error)
    return rows(data).map(mapProduct)
  },

  async addProduct(input) {
    if (!supabase) throw new ApiError('unknown')
    const problem = validateProduct(input)
    if (problem) throw new ApiError(problem)
    const store = await liveSeller.getMyStore()
    if (!store) throw new ApiError('store_not_found_for_seller')
    const { data, error } = await supabase
      .from('products')
      .insert({ ...normProduct(input), store_id: store.id })
      .select(PRODUCT_COLS)
      .single()
    if (error) throw tableError(error)
    return mapProduct(data as Row)
  },

  async updateProduct(id, input) {
    if (!supabase) throw new ApiError('unknown')
    const problem = validateProduct(input)
    if (problem) throw new ApiError(problem)
    const { data, error } = await supabase.from('products').update(normProduct(input)).eq('id', id).select(PRODUCT_COLS)
    if (error) throw tableError(error)
    const r = rows(data)[0]
    // RLS menyaring baris milik warung lain: 0 baris = bukan milik penjual ini.
    if (!r) throw new ApiError('product_not_found')
    return mapProduct(r)
  },
}

function demoSellerStore(): { db: DemoStore; store: Store } {
  const { actor } = demoActor()
  if (actor.role !== 'seller') throw new ApiError('seller_role_required')
  const db = loadDemo()
  const store = db.stores.find((s) => s.owner_id === actor.userId)
  if (!store) throw new ApiError('store_not_found_for_seller')
  return { db, store }
}

const demoSeller: SellerApi = {
  async getMyStore() {
    await delay()
    const { actor } = demoActor()
    if (actor.role !== 'seller') throw new ApiError('seller_role_required')
    const store = loadDemo().stores.find((s) => s.owner_id === actor.userId)
    return store ? structuredClone(store) : null
  },

  async updateMyStore(input) {
    await delay()
    const problem = validateStoreProfile(input)
    if (problem) throw new ApiError(problem)
    const { db, store } = demoSellerStore()
    Object.assign(store, normStore(input))
    // Nama warung tersalin di pesanan (seperti store_name dari server).
    for (const o of db.orders) if (o.store_id === store.id) o.store_name = store.name
    saveDemo()
    return structuredClone(store)
  },

  async listMyProducts() {
    await delay()
    const { db, store } = demoSellerStore()
    return structuredClone(db.products.filter((p) => p.store_id === store.id).sort((a, b) => a.name.localeCompare(b.name)))
  },

  async addProduct(input) {
    await delay()
    const problem = validateProduct(input)
    if (problem) throw new ApiError(problem)
    const { db, store } = demoSellerStore()
    const product: Product = { id: `prd-${randomHex(6)}`, store_id: store.id, image_url: null, ...normProduct(input) }
    db.products.push(product)
    saveDemo()
    return structuredClone(product)
  },

  async updateProduct(id, input) {
    await delay()
    const problem = validateProduct(input)
    if (problem) throw new ApiError(problem)
    const { db, store } = demoSellerStore()
    const product = db.products.find((p) => p.id === id && p.store_id === store.id)
    if (!product) throw new ApiError('product_not_found')
    Object.assign(product, normProduct(input))
    saveDemo()
    return structuredClone(product)
  },
}

export const seller: SellerApi = isMockMode ? demoSeller : liveSeller

/**
 * Semua pesanan yang terlihat oleh pengguna ini sejak `since` (untuk ringkasan hari ini).
 * list_my_orders urut terbaru dulu, jadi berhenti begitu ketemu pesanan yang lebih lama.
 */
export async function listMyOrdersSince(since: Date): Promise<Order[]> {
  const out: Order[] = []
  for (let page = 0; page < LOOKUP_MAX_PAGES; page++) {
    const res = await api.listMyOrders({ limit: LOOKUP_PAGE, offset: page * LOOKUP_PAGE })
    for (const o of res.items) {
      if (new Date(o.created_at) < since) return out
      if (!out.some((x) => x.order_id === o.order_id)) out.push(o)
    }
    if (!res.hasMore) return out
  }
  return out
}

/* ------------------------------------------------------------------ */
/* Admin: direktori, warung, kurir (R6.2, R6.4)                        */
/* ------------------------------------------------------------------ */

/*
 * Pesanan semua warung: list_my_orders (admin melihat semua).
 * Penugasan kurir: HANYA RPC assign_order_driver (server memeriksa peran admin dan
 * bahwa target berprofil driver). Status: change_order_status (server mewajibkan alasan
 * override "selesai" dan menolak batal dari status akhir sejak migrasi 20261112000002).
 * Profil & warung dibaca langsung (RLS: admin boleh membaca semua). Aktif/nonaktif warung
 * lewat RPC admin_set_store_active (tercatat di admin_audit_log).
 * Peran pengguna TIDAK bisa diubah dari frontend (provision_set_user_role khusus server).
 */

export type DirectoryUser = Profile & { created_at: string | null }

Object.assign(ERROR_MESSAGES, {
  completion_reason_required: 'Tulis alasan untuk menandai pesanan selesai.',
  cancel_from_terminal_status_not_allowed: 'Pesanan yang sudah selesai, dibatalkan, atau ditolak tidak bisa dibatalkan.',
  store_not_found: 'Warung tidak ditemukan.',
} satisfies Record<string, string>)

export type AdminApi = {
  listUsers(): Promise<DirectoryUser[]>
  listDrivers(): Promise<DirectoryUser[]>
  listAllStores(): Promise<MyStore[]>
  setStoreActive(storeId: string, active: boolean): Promise<boolean>
}

const PROFILE_COLS = 'id, full_name, phone, role, created_at'
const DIRECTORY_LIMIT = 500

function mapDirectoryUser(r: Row): DirectoryUser {
  return {
    id: String(r.id),
    full_name: String(r.full_name ?? ''),
    phone: strOrNull(r.phone),
    role: ALL_ROLES.includes(r.role as Role) ? (r.role as Role) : 'customer',
    created_at: strOrNull(r.created_at),
  }
}

function assertAdminLive(): void {
  if (liveSessionRole !== 'admin') throw new ApiError('admin_role_required')
}

const liveAdmin: AdminApi = {
  async listUsers() {
    if (!supabase) throw new ApiError('unknown')
    assertAdminLive()
    const { data, error } = await supabase.from('profiles').select(PROFILE_COLS).order('created_at').limit(DIRECTORY_LIMIT)
    if (error) throw toApiError(error)
    return rows(data).map(mapDirectoryUser)
  },

  async listDrivers() {
    if (!supabase) throw new ApiError('unknown')
    assertAdminLive()
    const { data, error } = await supabase.from('profiles').select(PROFILE_COLS).eq('role', 'driver').order('full_name')
    if (error) throw toApiError(error)
    return rows(data).map(mapDirectoryUser)
  },

  async listAllStores() {
    if (!supabase) throw new ApiError('unknown')
    assertAdminLive()
    const { data, error } = await supabase.from('stores').select(STORE_COLS).order('name').limit(DIRECTORY_LIMIT)
    if (error) throw toApiError(error)
    return rows(data).map(mapStore)
  },

  async setStoreActive(storeId, active) {
    assertAdminLive()
    return Boolean(await rpc('admin_set_store_active', { p_store_id: storeId, p_active: active }))
  },
}

function demoAdminDb(): DemoStore {
  const { actor } = demoActor()
  if (actor.role !== 'admin') throw new ApiError('admin_role_required')
  return loadDemo()
}

const demoAdmin: AdminApi = {
  async listUsers() {
    await delay()
    return demoAdminDb().profiles.map((p) => ({ ...structuredClone(p), created_at: null }))
  },
  async listDrivers() {
    await delay()
    return demoAdminDb()
      .profiles.filter((p) => p.role === 'driver')
      .map((p) => ({ ...structuredClone(p), created_at: null }))
  },
  async listAllStores() {
    await delay()
    return structuredClone(demoAdminDb().stores).sort((a, b) => a.name.localeCompare(b.name, 'id'))
  },
  async setStoreActive(storeId, active) {
    await delay()
    const db = demoAdminDb()
    const store = db.stores.find((s) => s.id === storeId)
    if (!store) throw new ApiError('store_not_found')
    store.is_active = active
    saveDemo()
    return active
  },
}

export const admin: AdminApi = isMockMode ? demoAdmin : liveAdmin
