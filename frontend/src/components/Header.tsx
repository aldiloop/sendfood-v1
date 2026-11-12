import { Link } from 'react-router'
import { isMockMode } from '../lib/supabase'
import { BatikStrip } from './BatikStrip'

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-cream">
      {/* Strip global: aksen tipis di atas header, terpisah dari teks. */}
      <BatikStrip />
      <div className="flex min-h-14 flex-wrap items-center justify-between gap-x-3 px-4 py-1">
        <Link to="/" className="flex min-h-12 shrink-0 items-center gap-2 rounded-lg text-lg font-bold text-soga">
          <img src="/logo.svg" alt="" width={32} height={32} className="rounded-md" />
          <span>Send Food</span>
        </Link>
        {/* Badge utuh satu baris; bila tidak muat di samping logo, turun ke baris sendiri. */}
        {isMockMode && <span className="badge mb-1 border-terra bg-white text-terra">Mode demo (data contoh)</span>}
      </div>
    </header>
  )
}
