export type Role = 'customer' | 'seller' | 'driver' | 'admin'

export const ROLE_LABEL: Record<Role, string> = {
  customer: 'Pelanggan',
  seller: 'Penjual',
  driver: 'Kurir',
  admin: 'Admin',
}

/** Halaman awal tiap peran. */
export const ROLE_HOME: Record<Role, string> = {
  customer: '/',
  seller: '/seller',
  driver: '/driver',
  admin: '/admin',
}

/** Peran pemilik area rute. Rute pelanggan/umum mengembalikan null. */
export function areaRole(pathname: string): Exclude<Role, 'customer'> | null {
  if (pathname === '/seller' || pathname.startsWith('/seller/')) return 'seller'
  if (pathname === '/driver' || pathname.startsWith('/driver/')) return 'driver'
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return 'admin'
  return null
}
