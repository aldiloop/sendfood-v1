import { buildTimeline, formatDateTime } from '../lib/format'
import type { OrderStatusHistory } from '../lib/types'

/** Timeline status (R3.8). Catatan sistem disaring oleh buildTimeline(). */
export function StatusTimeline({ history }: { history: readonly OrderStatusHistory[] }) {
  const entries = buildTimeline(history)
  if (entries.length === 0) return <p className="text-base text-ink/80">Riwayat status belum tersedia.</p>
  return (
    <ol className="space-y-0">
      {entries.map((e, i) => {
        const last = i === entries.length - 1
        return (
          <li key={`${e.at}-${i}`} className="relative flex gap-3 pb-4 last:pb-0">
            {!last && <span aria-hidden className="absolute top-5 left-[9px] h-full w-0.5 bg-line" />}
            <span
              aria-hidden
              className={`relative mt-1 size-5 shrink-0 rounded-full border-2 ${last ? 'border-soga bg-soga' : 'border-soga bg-cream'}`}
            />
            <div>
              <p className={`text-base ${last ? 'font-bold' : 'font-semibold'}`}>{e.label}</p>
              <p className="text-base text-ink/75">{formatDateTime(e.at)}</p>
              {e.reason && <p className="text-base">Catatan: {e.reason}</p>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
