import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const rawUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').trim()
const rawKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim()

/** Nilai contoh dari .env.example — dianggap belum diisi. */
const PLACEHOLDER_HINTS = ['your-project', 'your-anon-key', 'your-key', 'xxxx', 'example', 'changeme']

function looksLikePlaceholder(value: string): boolean {
  const v = value.toLowerCase()
  return PLACEHOLDER_HINTS.some((hint) => v.includes(hint))
}

function isValidUrl(value: string): boolean {
  if (!value || looksLikePlaceholder(value)) return false
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.hostname === 'localhost' || url.hostname === '127.0.0.1'
  } catch {
    return false
  }
}

/** Baca klaim `role` dari JWT tanpa verifikasi (hanya untuk menolak key berbahaya). */
function jwtRole(token: string): string | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
    const payload = JSON.parse(atob(padded)) as { role?: unknown }
    return typeof payload.role === 'string' ? payload.role : null
  } catch {
    return null
  }
}

/**
 * R1.5: frontend tidak boleh memakai service_role / secret key.
 * Key seperti itu ditolak dan aplikasi jatuh ke mode demo.
 */
function isForbiddenKey(key: string): boolean {
  if (key.startsWith('sb_secret_')) return true
  return jwtRole(key) === 'service_role'
}

function isValidAnonKey(key: string): boolean {
  if (!key || looksLikePlaceholder(key)) return false
  if (isForbiddenKey(key)) return false
  // Legacy anon key (JWT) atau publishable key baru.
  return jwtRole(key) === 'anon' || key.startsWith('sb_publishable_')
}

if (rawKey && isForbiddenKey(rawKey)) {
  console.error(
    '[Send Food] VITE_SUPABASE_ANON_KEY berisi service_role/secret key. ' +
      'Key ini ditolak. Pakai anon/publishable key saja.',
  )
}

const envValid = isValidUrl(rawUrl) && isValidAnonKey(rawKey)

/** true bila env tidak valid: aplikasi memakai data contoh (lib/mock.ts). */
export const isMockMode = !envValid

/** Client Supabase; null di mode demo. */
export const supabase: SupabaseClient | null = envValid
  ? createClient(rawUrl, rawKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null
