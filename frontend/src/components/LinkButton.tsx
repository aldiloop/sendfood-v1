import { Link, type LinkProps } from 'react-router'

type Variant = 'primary' | 'secondary'

/** Tautan yang tampil seperti tombol (min 48px). */
export function LinkButton({
  variant = 'primary',
  fullWidth = false,
  className = '',
  ...rest
}: LinkProps & { variant?: Variant; fullWidth?: boolean }) {
  return (
    <Link
      className={[variant === 'primary' ? 'btn-primary' : 'btn-secondary', fullWidth ? 'w-full' : '', className].join(' ')}
      {...rest}
    />
  )
}
