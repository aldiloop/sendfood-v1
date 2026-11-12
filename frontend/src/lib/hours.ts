import type { OpeningHours } from './types'

/** Jam buka warung selalu waktu desa (WIB), bukan zona waktu HP pembeli. */
const TIME_ZONE = 'Asia/Jakarta'

export type OpenState = 'open' | 'closed' | 'unknown'

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/

function toMinutes(hhmm: string): number | null {
  const m = HHMM.exec(hhmm)
  return m ? Number(m[1]) * 60 + Number(m[2]) : null
}

/** Menit sejak tengah malam, WIB. */
function nowMinutesWib(now: Date): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0)
  return get('hour') * 60 + get('minute')
}

/**
 * Buka/Tutup dari jam buka. 'unknown' bila jam belum diatur atau formatnya tidak dikenal:
 * jangan menebak "Tutup" (pesanan tetap bisa ditolak penjual).
 * Mendukung jam lewat tengah malam (mis. 16:00–01:00).
 */
export function openState(hours: OpeningHours | null, now: Date = new Date()): OpenState {
  if (!hours) return 'unknown'
  const open = toMinutes(hours.open)
  const close = toMinutes(hours.close)
  if (open === null || close === null || open === close) return 'unknown'
  const t = nowMinutesWib(now)
  const isOpen = open < close ? t >= open && t < close : t >= open || t < close
  return isOpen ? 'open' : 'closed'
}

/** "06.00–14.00 WIB" atau "Jam buka belum diatur". */
export function formatHours(hours: OpeningHours | null): string {
  if (!hours || toMinutes(hours.open) === null || toMinutes(hours.close) === null) return 'Jam buka belum diatur'
  return `${hours.open.replace(':', '.')}–${hours.close.replace(':', '.')} WIB`
}
