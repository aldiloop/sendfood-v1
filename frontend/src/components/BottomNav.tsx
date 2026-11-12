import { NavLink } from 'react-router'
import type { Role } from '../lib/roles'
import { Icon, type IconName } from './Icon'

type NavItem = { to: string; label: string; icon: IconName; end?: boolean }

const NAV: Record<Role, NavItem[]> = {
  customer: [
    { to: '/', label: 'Beranda', icon: 'home', end: true },
    { to: '/search', label: 'Cari', icon: 'search' },
    { to: '/cart', label: 'Keranjang', icon: 'basket' },
    { to: '/orders', label: 'Pesanan', icon: 'receipt' },
    { to: '/profile', label: 'Akun', icon: 'user' },
  ],
  seller: [
    { to: '/seller', label: 'Ringkasan', icon: 'home', end: true },
    { to: '/seller/orders', label: 'Pesanan', icon: 'receipt' },
    { to: '/seller/products', label: 'Menu', icon: 'bowl' },
    { to: '/seller/store', label: 'Warung', icon: 'store' },
    { to: '/profile', label: 'Akun', icon: 'user' },
  ],
  driver: [
    { to: '/driver', label: 'Ringkasan', icon: 'home', end: true },
    { to: '/driver/tasks', label: 'Tugas', icon: 'truck' },
    { to: '/driver/history', label: 'Riwayat', icon: 'list' },
    { to: '/profile', label: 'Akun', icon: 'user' },
  ],
  admin: [
    { to: '/admin', label: 'Ringkasan', icon: 'home', end: true },
    { to: '/admin/orders', label: 'Pesanan', icon: 'receipt' },
    { to: '/admin/stores', label: 'Warung', icon: 'store' },
    { to: '/admin/users', label: 'Warga', icon: 'users' },
    { to: '/profile', label: 'Akun', icon: 'user' },
  ],
}

export function BottomNav({ role }: { role: Role }) {
  return (
    <nav
      aria-label="Menu utama"
      className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-[480px] border-t border-line bg-cream pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="flex">
        {NAV[role].map((item) => (
          <li key={item.to} className="flex-1">
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                [
                  'flex min-h-16 flex-col items-center justify-center gap-0.5 text-sm font-medium',
                  isActive ? 'text-soga' : 'text-ink/75',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  <Icon name={item.icon} size={24} strokeWidth={isActive ? 2.4 : 2} />
                  <span className={isActive ? 'font-bold' : undefined}>{item.label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
