import { useEffect, useRef, type ReactNode } from 'react'
import { Button } from './Button'

type ConfirmBoxProps = {
  title: string
  children?: ReactNode
  confirmText: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  busy?: boolean
}

/** Konfirmasi di tempat (bukan pop-up browser). Fokus pindah ke judul supaya terbaca. */
export function ConfirmBox({ title, children, confirmText, cancelText = 'Batal', onConfirm, onCancel, busy }: ConfirmBoxProps) {
  const ref = useRef<HTMLHeadingElement>(null)
  useEffect(() => ref.current?.focus(), [])
  return (
    <div role="alertdialog" aria-labelledby="confirm-title" className="card space-y-3 border-2 border-soga">
      <h2 id="confirm-title" ref={ref} tabIndex={-1} className="text-lg font-bold">
        {title}
      </h2>
      {children && <div className="text-base">{children}</div>}
      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={onCancel} disabled={busy}>
          {cancelText}
        </Button>
        <Button className="flex-1" onClick={onConfirm} loading={busy}>
          {confirmText}
        </Button>
      </div>
    </div>
  )
}
