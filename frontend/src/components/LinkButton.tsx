import { Link, type LinkProps } from 'react-router'

type Variant = 'primary' | 'secondary'

const VARIANT: Record<Variant, string> = {
  primary: 'bg-soga text-white hover:bg-ink',
  secondary: 'border-2 border-soga bg-cream text-soga hover:bg-line',
}

/** Tautan yang tampil seperti tombol (min 48px). */
export function LinkButton({
  variant = 'primary',
  fullWidth = false,
  className = '',
  ...rest
}: LinkProps & { variant?: Variant; fullWidth?: boolean }) {
  return (
    <Link
      className={[
        'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-base font-semibold',
        VARIANT[variant],
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
      {...rest}
    />
  )
}
