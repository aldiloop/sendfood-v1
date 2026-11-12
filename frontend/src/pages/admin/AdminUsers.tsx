import { useState } from 'react'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { EmptyState } from '../../components/EmptyState'
import { ErrorState } from '../../components/ErrorState'
import { Input } from '../../components/Input'
import { Loading } from '../../components/Loading'
import { admin } from '../../lib/api'
import { ALL_ROLES, ROLE_LABEL, type Role } from '../../lib/roles'
import { useAsync } from '../../lib/useAsync'

/** R6.4: direktori warga. Hanya baca: peran diatur di server, bukan dari aplikasi. */
export default function AdminUsers() {
  const data = useAsync(() => admin.listUsers(), 'admin-users')
  const [role, setRole] = useState<Role | 'all'>('all')
  const [q, setQ] = useState('')

  if (data.loading) return <Loading text="Memuat warga..." />
  if (data.error || !data.data) {
    return (
      <ErrorState message={data.error ?? 'Data tidak tersedia.'}>
        <Button variant="secondary" onClick={data.reload}>
          Coba lagi
        </Button>
      </ErrorState>
    )
  }

  const users = data.data
  const term = q.trim().toLowerCase()
  const list = users
    .filter((u) => role === 'all' || u.role === role)
    .filter((u) => !term || u.full_name.toLowerCase().includes(term) || (u.phone ?? '').includes(term))
    .sort((a, b) => a.full_name.localeCompare(b.full_name, 'id'))

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold leading-tight">Direktori Warga</h1>
        <p className="text-base text-ink/80">
          {users.length} akun. Peran akun diatur pengelola server, tidak bisa diubah dari aplikasi.
        </p>
      </div>

      <div role="tablist" aria-label="Saring peran" className="grid grid-cols-3 gap-2">
        {(['all', ...ALL_ROLES] as const).map((r) => {
          const n = r === 'all' ? users.length : users.filter((u) => u.role === r).length
          return (
            <button
              key={r}
              role="tab"
              aria-selected={role === r}
              onClick={() => setRole(r)}
              className="tab"
            >
              {r === 'all' ? 'Semua' : ROLE_LABEL[r]} ({n})
            </button>
          )
        })}
      </div>

      <Input label="Cari nama atau nomor HP" type="search" value={q} onChange={(e) => setQ(e.target.value)} />

      {list.length === 0 ? (
        <EmptyState icon="users" title="Tidak ada yang cocok" />
      ) : (
        <ul className="card divide-y divide-line p-0">
          {list.map((u) => (
            <li key={u.id} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="text-base font-bold">{u.full_name || 'Tanpa nama'}</p>
                <p className="text-base text-ink/80">
                  {u.phone ? (
                    <a href={`tel:${u.phone.replace(/[^\d+]/g, '')}`} className="link font-normal">
                      {u.phone}
                    </a>
                  ) : (
                    'Nomor HP belum diisi'
                  )}
                </p>
              </div>
              <Badge tone={u.role === 'admin' ? 'info' : 'neutral'}>{ROLE_LABEL[u.role]}</Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
