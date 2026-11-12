import { estimateDeliveryFee } from './delivery'
import type { Role } from './roles'
import type {
  CustomerAddress,
  Order,
  OrderItem,
  OrderStatus,
  OrderStatusHistory,
  Product,
  Profile,
  Store,
} from './types'

/**
 * Data contoh untuk mode demo: satu desa fiktif (Desa Kawung Asri) di sekitar Solo.
 * Semua nama, alamat, dan nomor telepon fiktif.
 */

export type DemoData = {
  version: 1
  profiles: Profile[]
  addresses: CustomerAddress[]
  stores: Store[]
  products: Product[]
  orders: Order[]
  history: OrderStatusHistory[]
}

export const DEMO_ACCOUNTS: Record<Role, string> = {
  customer: 'u-pelanggan',
  seller: 'u-penjual',
  driver: 'u-kurir',
  admin: 'u-admin',
}

const profiles: Profile[] = [
  { id: 'u-pelanggan', full_name: 'Sari Wulandari', phone: '0812-0000-1001', role: 'customer', email: 'pelanggan@demo.sendfood' },
  { id: 'u-pelanggan-2', full_name: 'Budi Santoso', phone: '0812-0000-1002', role: 'customer' },
  { id: 'u-penjual', full_name: 'Joko Susilo', phone: '0812-0000-2001', role: 'seller', email: 'penjual@demo.sendfood' },
  { id: 'u-penjual-2', full_name: 'Tini Rahayu', phone: '0812-0000-2002', role: 'seller' },
  { id: 'u-penjual-3', full_name: 'Bayu Nugroho', phone: '0812-0000-2003', role: 'seller' },
  { id: 'u-kurir', full_name: 'Andi Pratama', phone: '0812-0000-3001', role: 'driver', email: 'kurir@demo.sendfood' },
  { id: 'u-kurir-2', full_name: 'Dimas Saputra', phone: '0812-0000-3002', role: 'driver' },
  { id: 'u-admin', full_name: 'Rina Kusuma', phone: '0812-0000-4001', role: 'admin', email: 'admin@demo.sendfood' },
]

const addresses: CustomerAddress[] = [
  {
    id: 'addr-sari-rumah',
    customer_id: 'u-pelanggan',
    label: 'Rumah',
    address: 'Jl. Melati No. 12, RT 01/RW 02, Desa Kawung Asri',
    latitude: -7.5735,
    longitude: 110.818,
    note: 'Pagar hijau, sebelah mushola',
  },
  {
    id: 'addr-sari-simbah',
    customer_id: 'u-pelanggan',
    label: 'Rumah Simbah',
    address: 'Jl. Kenanga No. 4, RT 04/RW 03, Desa Kawung Asri',
    latitude: -7.58,
    longitude: 110.83,
    note: null,
  },
  {
    id: 'addr-budi-rumah',
    customer_id: 'u-pelanggan-2',
    label: 'Rumah',
    address: 'Gang Mawar No. 7, RT 03/RW 01, Desa Kawung Asri',
    latitude: -7.568,
    longitude: 110.835,
    note: null,
  },
]

const stores: Store[] = [
  {
    id: 'store-soto',
    owner_id: 'u-penjual',
    name: 'Warung Soto Pak Joko',
    description: 'Soto ayam dan soto daging kuah bening khas Solo.',
    address: 'Jl. Kawung No. 3, RT 02/RW 01, Desa Kawung Asri',
    latitude: -7.5712,
    longitude: 110.8215,
    phone: '0812-0000-2001',
    image_url: null,
    opening_hours: { open: '06:00', close: '14:00' },
    is_active: true,
    service_radius_km: 5,
  },
  {
    id: 'store-pecel',
    owner_id: 'u-penjual-2',
    name: 'Warung Pecel Bu Tini',
    description: 'Nasi pecel sambel kacang, rempeyek renyah.',
    address: 'Gang Parang No. 8, RT 05/RW 02, Desa Kawung Asri',
    latitude: -7.565,
    longitude: 110.826,
    phone: '0812-0000-2002',
    image_url: null,
    opening_hours: { open: '07:00', close: '20:00' },
    is_active: true,
    service_radius_km: 4,
  },
  {
    id: 'store-angkringan',
    owner_id: 'u-penjual-3',
    name: 'Angkringan Mas Bayu',
    description: 'Nasi kucing, sate-satean, dan wedang hangat.',
    address: 'Dekat Pos Ronda RW 03, Desa Kawung Asri',
    latitude: -7.576,
    longitude: 110.829,
    phone: '0812-0000-2003',
    image_url: null,
    opening_hours: { open: '16:00', close: '23:30' },
    is_active: true,
    service_radius_km: 3,
  },
]

const p = (id: string, store_id: string, name: string, price: number, description: string | null, is_available = true): Product => ({
  id,
  store_id,
  name,
  description,
  price,
  image_url: null,
  is_available,
})

const products: Product[] = [
  p('prd-soto-ayam', 'store-soto', 'Soto Ayam', 10000, 'Nasi, suwiran ayam, tauge, kuah bening.'),
  p('prd-soto-daging', 'store-soto', 'Soto Daging', 15000, 'Irisan daging sapi, kuah bening.'),
  p('prd-mendoan', 'store-soto', 'Tempe Mendoan', 2000, 'Per potong.'),
  p('prd-es-teh', 'store-soto', 'Es Teh Manis', 3000, null),
  p('prd-pecel', 'store-pecel', 'Nasi Pecel', 8000, 'Sayur rebus, sambel kacang, rempeyek.'),
  p('prd-pecel-telur', 'store-pecel', 'Nasi Pecel Telur', 11000, 'Nasi pecel dengan telur ceplok.'),
  p('prd-rempeyek', 'store-pecel', 'Rempeyek Kacang', 2000, 'Per keping.'),
  p('prd-es-jeruk', 'store-pecel', 'Es Jeruk', 4000, null, false),
  p('prd-nasi-kucing', 'store-angkringan', 'Nasi Kucing', 3000, 'Nasi sambal teri, bungkus daun pisang.'),
  p('prd-sate-usus', 'store-angkringan', 'Sate Usus', 2000, 'Per tusuk.'),
  p('prd-gorengan', 'store-angkringan', 'Gorengan', 1000, 'Bakwan, tahu isi, atau pisang.'),
  p('prd-wedang-jahe', 'store-angkringan', 'Wedang Jahe', 4000, null),
]

type SeedOrder = {
  id: string
  code: string
  customerId: string
  addressId: string
  storeId: string
  items: [productId: string, qty: number][]
  /** Urutan status yang sudah dilalui, dari awal. */
  path: OrderStatus[]
  driverId: string | null
  minutesAgo: number
  /** Catatan untuk langkah terakhir (alasan batal/tolak). */
  lastNote?: string
  lastBy?: string
}

const seedOrders: SeedOrder[] = [
  {
    id: 'ord-1001',
    code: 'SF-DEMO1001',
    customerId: 'u-pelanggan',
    addressId: 'addr-sari-rumah',
    storeId: 'store-soto',
    items: [['prd-soto-ayam', 2], ['prd-es-teh', 2]],
    path: ['pending_seller'],
    driverId: null,
    minutesAgo: 8,
  },
  {
    id: 'ord-1002',
    code: 'SF-DEMO1002',
    customerId: 'u-pelanggan-2',
    addressId: 'addr-budi-rumah',
    storeId: 'store-soto',
    items: [['prd-soto-daging', 1], ['prd-mendoan', 3]],
    path: ['pending_seller', 'accepted', 'preparing'],
    driverId: null,
    minutesAgo: 25,
  },
  {
    id: 'ord-1003',
    code: 'SF-DEMO1003',
    customerId: 'u-pelanggan',
    addressId: 'addr-sari-rumah',
    storeId: 'store-pecel',
    items: [['prd-pecel-telur', 1], ['prd-rempeyek', 2]],
    path: ['pending_seller', 'accepted', 'preparing', 'ready_for_pickup'],
    driverId: 'u-kurir',
    minutesAgo: 45,
  },
  {
    id: 'ord-1004',
    code: 'SF-DEMO1004',
    customerId: 'u-pelanggan-2',
    addressId: 'addr-budi-rumah',
    storeId: 'store-pecel',
    items: [['prd-pecel', 2]],
    path: ['pending_seller', 'accepted', 'preparing', 'ready_for_pickup', 'picked_up'],
    driverId: 'u-kurir',
    minutesAgo: 70,
  },
  {
    id: 'ord-1005',
    code: 'SF-DEMO1005',
    customerId: 'u-pelanggan',
    addressId: 'addr-sari-simbah',
    storeId: 'store-soto',
    items: [['prd-soto-ayam', 1], ['prd-mendoan', 2], ['prd-es-teh', 1]],
    path: ['pending_seller', 'accepted', 'preparing', 'ready_for_pickup', 'picked_up', 'delivered', 'completed'],
    driverId: 'u-kurir',
    minutesAgo: 150,
    lastBy: 'u-kurir',
  },
  {
    id: 'ord-1006',
    code: 'SF-DEMO1006',
    customerId: 'u-pelanggan-2',
    addressId: 'addr-budi-rumah',
    storeId: 'store-angkringan',
    items: [['prd-nasi-kucing', 3], ['prd-sate-usus', 4], ['prd-wedang-jahe', 1]],
    path: ['pending_seller', 'accepted', 'preparing', 'ready_for_pickup', 'picked_up', 'delivered', 'completed'],
    driverId: 'u-kurir-2',
    minutesAgo: 60 * 26,
    lastBy: 'u-kurir-2',
  },
  {
    id: 'ord-1007',
    code: 'SF-DEMO1007',
    customerId: 'u-pelanggan-2',
    addressId: 'addr-budi-rumah',
    storeId: 'store-soto',
    items: [['prd-soto-ayam', 1]],
    path: ['pending_seller', 'cancelled'],
    driverId: null,
    minutesAgo: 120,
    lastNote: 'Salah pilih menu, mau pesan ulang.',
    lastBy: 'u-pelanggan-2',
  },
]

/** Siapa yang biasanya memindahkan pesanan KE status ini. */
function actorFor(status: OrderStatus, o: SeedOrder, ownerId: string): string {
  switch (status) {
    case 'pending_seller':
      return o.customerId
    case 'accepted':
    case 'rejected':
    case 'preparing':
    case 'ready_for_pickup':
      return ownerId
    case 'picked_up':
    case 'delivered':
    case 'completed':
      return o.driverId ?? 'u-admin'
    default:
      return o.lastBy ?? 'u-admin'
  }
}

/** Buat data demo baru. Waktu pesanan relatif terhadap `now` supaya selalu "hari ini". */
export function createSeed(now: Date = new Date()): DemoData {
  const orders: Order[] = []
  const history: OrderStatusHistory[] = []

  for (const o of seedOrders) {
    const store = stores.find((s) => s.id === o.storeId)!
    const addr = addresses.find((a) => a.id === o.addressId)!
    const items: OrderItem[] = o.items.map(([productId, quantity]) => {
      const prod = products.find((x) => x.id === productId)!
      return {
        product_id: prod.id,
        name: prod.name,
        unit_price: prod.price,
        quantity,
        line_total: prod.price * quantity,
      }
    })
    const subtotal = items.reduce((sum, i) => sum + i.line_total, 0)
    const { fee } = estimateDeliveryFee(
      { lat: store.latitude!, lng: store.longitude! },
      { lat: addr.latitude!, lng: addr.longitude! },
      store.service_radius_km ?? 0,
    )
    const createdAt = new Date(now.getTime() - o.minutesAgo * 60_000)

    orders.push({
      order_id: o.id,
      order_code: o.code,
      store_id: store.id,
      store_name: store.name,
      customer_id: o.customerId,
      driver_id: o.driverId,
      delivery_address: addr.address,
      delivery_latitude: addr.latitude,
      delivery_longitude: addr.longitude,
      delivery_note: addr.note,
      subtotal,
      delivery_fee: fee,
      total: subtotal + fee,
      payment_method: 'cod',
      // Pencatatan uang COD belum diaktifkan di backend (ops_policy), jadi tetap "Belum Dibayar".
      payment_status: 'unpaid',
      order_status: o.path[o.path.length - 1],
      created_at: createdAt.toISOString(),
      items,
    })

    o.path.forEach((status, i) => {
      const isLast = i === o.path.length - 1
      history.push({
        order_id: o.id,
        old_status: i === 0 ? null : o.path[i - 1],
        new_status: status,
        changed_by: isLast && o.lastBy ? o.lastBy : actorFor(status, o, store.owner_id),
        note: isLast ? (o.lastNote ?? null) : null,
        // Tiap langkah berjarak 5 menit dari waktu pesan.
        created_at: new Date(createdAt.getTime() + i * 5 * 60_000).toISOString(),
      })
      // Penugasan kurir oleh admin: status tidak berubah, dicatat seperti assign_order_driver.
      if (status === 'ready_for_pickup' && o.driverId) {
        history.push({
          order_id: o.id,
          old_status: status,
          new_status: status,
          changed_by: DEMO_ACCOUNTS.admin,
          note: `driver_assigned:${o.driverId}`,
          created_at: new Date(createdAt.getTime() + i * 5 * 60_000 + 2 * 60_000).toISOString(),
        })
      }
    })
  }

  return {
    version: 1,
    profiles: structuredClone(profiles),
    addresses: structuredClone(addresses),
    stores: structuredClone(stores),
    products: structuredClone(products),
    orders,
    history,
  }
}
