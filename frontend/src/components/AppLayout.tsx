import { Outlet, useLocation } from 'react-router'
import { useAuth } from '../context/auth'
import { BottomNav } from './BottomNav'
import { Header } from './Header'

/** Rute tanpa menu bawah (form penuh layar). */
const NO_NAV = ['/login', '/register']

export function AppLayout() {
  const { pathname } = useLocation()
  const { user } = useAuth()
  const showNav = !NO_NAV.includes(pathname)
  // Menu mengikuti peran akun yang masuk; tamu melihat menu pelanggan.
  const navRole = user?.role ?? 'customer'

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
