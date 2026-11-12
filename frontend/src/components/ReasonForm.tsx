import { useState, type FormEvent } from 'react'
import { Button } from './Button'
import { Card } from './Card'
import { TextArea } from './Input'

/** Batas p_note di change_order_status. */
export const REASON_MAX = 500

/** Form alasan wajib (tolak, batal, override admin). Kosong atau hanya spasi ditolak. */
export function ReasonForm(props: {
  title: string
  label: string
  placeholder: string
  confirmText: string
  busy: boolean
  description?: string
  onCancel: () => void
  onSubmit: (reason: string) => void
}) {
  const [reason, setReason] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)

  function submit(e: FormEvent) {
    e.preventDefault()
    if (props.busy) return
    const text = reason.trim()
    if (!text) return setFieldError('Alasan wajib diisi.')
    if (text.length > REASON_MAX) return setFieldError(`Alasan maksimal ${REASON_MAX} huruf.`)
    setFieldError(null)
    props.onSubmit(text)
  }

  return (
    <Card>
      <form onSubmit={submit} noValidate className="space-y-3">
        <h2 className="text-lg font-bold">{props.title}</h2>
        {props.description && <p className="text-base">{props.description}</p>}
        <TextArea
          label={props.label}
          maxLength={REASON_MAX}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          error={fieldError}
          placeholder={props.placeholder}
        />
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={props.onCancel} disabled={props.busy}>
            Kembali
          </Button>
          <Button type="submit" className="flex-1" loading={props.busy} loadingText="Menyimpan...">
            {props.confirmText}
          </Button>
        </div>
      </form>
    </Card>
  )
}
