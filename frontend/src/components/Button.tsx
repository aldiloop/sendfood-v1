import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost'

const VARIANT: Record<Variant, string> = {
  primary: 'bg-soga text-white hover:bg-ink disabled:bg-soga/60',
  secondary: 'border-2 border-soga bg-cream text-soga hover:bg-line disabled:opacity-60',
  ghost: 'text-soga underline-offset-4 hover:underline disabled:opacity-60',
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  /** Tampilkan teks proses dan nonaktifkan tombol (cegah klik ganda). */
  loading?: boolean
  loadingText?: string
  fullWidth?: boolean
}

export function Button({
  variant = 'primary',
  loading = false,
  loadingText = 'Sebentar...',
  fullWidth = false,
  className = '',
  disabled,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={[
        'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-base font-semibold',
        'disabled:cursor-not-allowed',
        VARIANT[variant],
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {loading ? loadingText : children}
    </button>
  )
}
