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

export const ALL_ROLES: readonly Role[] = ['customer', 'seller', 'driver', 'admin']

/**
 * Tujuan setelah masuk (?next=). Hanya jalur internal aplikasi, supaya tautan
 * seperti /login?next=//situs-lain tidak bisa membawa pengguna keluar (open redirect).
 */
export function safeNextPath(next: string | null): string | null {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return null
  if (/^\/(login|register)(\/|\?|#|$)/.test(next)) return null
  return next
}
