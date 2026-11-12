import { Link } from 'react-router'
import { isMockMode } from '../lib/supabase'

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-cream">
      <div className="flex min-h-14 items-center justify-between gap-3 px-4 py-1">
        <Link
          to="/"
          className="flex min-h-12 items-center gap-2 rounded-lg text-lg font-bold text-soga"
        >
          <img src="/logo.svg" alt="" width={32} height={32} className="rounded-md" />
          <span>Send Food</span>
        </Link>
        {isMockMode && (
          <span className="rounded-full border border-terra px-3 py-1 text-sm font-semibold text-terra">
            Mode demo (data contoh)
          </span>
        )}
      </div>
    </header>
  )
}
