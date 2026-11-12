import type { ReactNode } from 'react'

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info'

/** Semua kombinasi warna teks/latar memenuhi kontras AA di ukuran 16px. */
const TONE: Record<BadgeTone, string> = {
  neutral: 'border-line bg-cream text-ink',
  success: 'border-leaf bg-white text-leaf',
  warning: 'border-terra bg-white text-terra',
  danger: 'border-ink bg-ink text-white',
  info: 'border-soga bg-soga text-white',
}

export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-0.5 text-base font-semibold ${TONE[tone]}`}>
      {children}
    </span>
  )
}
