import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '../context/auth'
import { ROLE_HOME, type Role } from '../lib/roles'
import { Loading } from './Loading'

/**
 * Penjaga rute (R2.3). Peran berasal dari AuthContext (server di mode live).
 * Ini hanya untuk navigasi; data tetap dilindungi RLS/RPC di server.
 * - belum masuk → /login?next=<halaman ini>
 * - peran lain → halaman awal perannya sendiri
 */
export function RoleGuard({ allow }: { allow: readonly Role[] }) {
  const { status, user } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <Loading text="Memeriksa akun..." />
  if (!user) {
    const next = location.pathname + location.search
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />
  }
  if (!allow.includes(user.role)) return <Navigate to={ROLE_HOME[user.role]} replace />
  return <Outlet />
}
