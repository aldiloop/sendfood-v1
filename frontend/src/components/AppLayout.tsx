import { Outlet, useLocation } from 'react-router'
import { areaRole } from '../lib/roles'
import { BottomNav } from './BottomNav'
import { Header } from './Header'

/** Rute tanpa menu bawah (form penuh layar). */
const NO_NAV = ['/login', '/register']

export function AppLayout() {
  const { pathname } = useLocation()
  const showNav = !NO_NAV.includes(pathname)
  // Sementara peran menu diambil dari area rute; Task 3 menggantinya dengan peran login.
  const navRole = areaRole(pathname) ?? 'customer'

  return (
    <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col bg-cream">
      <Header />
      <main className={['flex-1 px-4 py-4', showNav ? 'pb-24' : ''].join(' ')}>
        <Outlet />
      </main>
      {showNav && <BottomNav role={navRole} />}
    </div>
  )
}
