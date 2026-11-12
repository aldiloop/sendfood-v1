import { useId } from 'react'

/**
 * Strip batik tipis (12px): Kawung di tengah sebagai motif utama, Parang di kedua ujung
 * sebagai aksen. Garis emas di atas Soga. SVG inline, tanpa gambar luar.
 *
 * Hanya aksen: berdiri sendiri sebagai pembatas, TIDAK pernah dipasang di belakang
 * teks, harga, tombol, atau form. Dekoratif sehingga disembunyikan dari pembaca layar.
 */
export function BatikStrip({ className = '' }: { className?: string }) {
  // useId berisi ":" yang merusak url(#...); bersihkan supaya id aman.
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const kawung = `kawung-${uid}`
  const parang = `parang-${uid}`

  return (
    <div aria-hidden="true" role="presentation" className={`flex h-3 w-full overflow-hidden bg-soga text-gold ${className}`}>
      <svg width="36" height="12" className="shrink-0" focusable="false">
        <defs>
          <pattern id={parang} width="9" height="12" patternUnits="userSpaceOnUse">
            {/* Parang: pita miring dengan lengkung, berulang. */}
            <path d="M-1 13 C 2 9, 2 5, 5 3 S 9 -1, 10 -1" fill="none" stroke="currentColor" strokeWidth="1.1" />
            <circle cx="4.5" cy="7.5" r="0.9" fill="currentColor" />
          </pattern>
        </defs>
        <rect width="36" height="12" fill={`url(#${parang})`} />
      </svg>

      <svg height="12" className="min-w-0 flex-1" preserveAspectRatio="none" focusable="false">
        <defs>
          <pattern id={kawung} width="12" height="12" patternUnits="userSpaceOnUse">
            {/* Kawung: empat kelopak lonjong mengarah ke titik tengah. */}
            <g fill="none" stroke="currentColor" strokeWidth="0.9">
              <ellipse cx="3.2" cy="3.2" rx="2.7" ry="1.35" transform="rotate(45 3.2 3.2)" />
              <ellipse cx="8.8" cy="3.2" rx="2.7" ry="1.35" transform="rotate(-45 8.8 3.2)" />
              <ellipse cx="3.2" cy="8.8" rx="2.7" ry="1.35" transform="rotate(-45 3.2 8.8)" />
              <ellipse cx="8.8" cy="8.8" rx="2.7" ry="1.35" transform="rotate(45 8.8 8.8)" />
            </g>
            <circle cx="6" cy="6" r="0.8" fill="currentColor" />
          </pattern>
        </defs>
        <rect width="100%" height="12" fill={`url(#${kawung})`} />
      </svg>

      <svg width="36" height="12" className="shrink-0 -scale-x-100" focusable="false">
        <rect width="36" height="12" fill={`url(#${parang})`} />
      </svg>
    </div>
  )
}
