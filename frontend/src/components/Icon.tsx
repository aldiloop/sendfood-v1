import type { SVGProps } from 'react'

/** Satu set ikon garis (24×24, stroke 2). Dipakai sebagai pengganti emoji. */
const PATHS = {
  pin: (
    <>
      <path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12Z" />
      <circle cx="12" cy="9" r="2.5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  truck: (
    <>
      <path d="M3 6h11v10H3z" />
      <path d="M14 10h4l3 3v3h-7" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
    </>
  ),
  leaf: (
    <>
      <path d="M5 19c0-8 5-13 15-14-1 10-6 15-14 15" />
      <path d="M5 19 13 11" />
    </>
  ),
  home: (
    <>
      <path d="m3 11 9-7 9 7" />
      <path d="M5 10v10h14V10" />
      <path d="M10 20v-6h4v6" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </>
  ),
  basket: (
    <>
      <path d="M3 10h18l-2 10H5z" />
      <path d="m8 10 4-6 4 6" />
      <path d="M9 14v3M15 14v3" />
    </>
  ),
  receipt: (
    <>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
      <path d="M9 8h6M9 12h6M9 16h3" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
    </>
  ),
  store: (
    <>
      <path d="M4 9 5 4h14l1 5" />
      <path d="M4 9a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0" />
      <path d="M5 11v9h14v-9" />
      <path d="M10 20v-5h4v5" />
    </>
  ),
  bowl: (
    <>
      <path d="M3 11h18a9 9 0 0 1-18 0Z" />
      <path d="M9 21h6" />
      <path d="M9 7c0-1.5 1-1.5 1-3M14 7c0-1.5 1-1.5 1-3" />
    </>
  ),
  box: (
    <>
      <path d="m3 7 9-4 9 4v10l-9 4-9-4z" />
      <path d="m3 7 9 4 9-4M12 11v10" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  list: (
    <>
      <path d="M9 6h12M9 12h12M9 18h12" />
      <path d="M4 6h1M4 12h1M4 18h1" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5" />
      <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c2.4.6 4 2.4 4 5.2" />
    </>
  ),
  check: <path d="m4 12 5 5L20 6" />,
  lock: (
    <>
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  ),
  phone: (
    <path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2Z" />
  ),
} as const

export type IconName = keyof typeof PATHS

type IconProps = Omit<SVGProps<SVGSVGElement>, 'name'> & {
  name: IconName
  size?: number
  /** Isi bila ikon berdiri sendiri (tanpa teks). Bila kosong, ikon dianggap dekoratif. */
  label?: string
}

export function Icon({ name, size = 24, label, ...rest }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  )
}
