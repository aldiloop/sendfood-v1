import { useId, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react'

type FieldBase = {
  label: string
  hint?: string
  error?: string | null
}

const control =
  'block w-full rounded-xl border-2 bg-white px-4 py-3 text-base text-ink placeholder:text-ink/55 min-h-12'

function describedBy(id: string, hint?: string, error?: string | null) {
  return [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined
}

function Extra({ id, hint, error }: { id: string; hint?: string; error?: string | null }) {
  return (
    <>
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-base text-ink/75">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-base font-semibold text-terra">
          {error}
        </p>
      )}
    </>
  )
}

export function Input({ label, hint, error, className = '', ...rest }: FieldBase & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId()
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-base font-semibold">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={`${control} ${error ? 'border-terra' : 'border-line focus:border-soga'}`}
        {...rest}
      />
      <Extra id={id} hint={hint} error={error} />
    </div>
  )
}

export function TextArea({
  label,
  hint,
  error,
  className = '',
  ...rest
}: FieldBase & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId()
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-base font-semibold">
        {label}
      </label>
      <textarea
        id={id}
        rows={3}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={`${control} ${error ? 'border-terra' : 'border-line focus:border-soga'}`}
        {...rest}
      />
      <Extra id={id} hint={hint} error={error} />
    </div>
  )
}
