import type { ReactNode } from 'react'

/** Pesan galat yang dibacakan pembaca layar. */
export function ErrorState({ message, children }: { message: string; children?: ReactNode }) {
  return (
    <div role="alert" className="rounded-xl border-2 border-terra bg-white p-4 text-base">
      <p className="font-semibold text-terra">{message}</p>
      {children && <div className="mt-3">{children}</div>}
    </div>
  )
}
