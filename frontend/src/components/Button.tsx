import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost'

const VARIANT: Record<Variant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
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
      className={[VARIANT[variant], fullWidth ? 'w-full' : '', className].join(' ')}
      {...rest}
    >
      {loading ? loadingText : children}
    </button>
  )
}
