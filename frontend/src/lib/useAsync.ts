import { useEffect, useRef, useState } from 'react'
import { errorMessage } from './api'

type State<T> = { key: string | null; data?: T; error?: string }

/**
 * Muat data untuk `key`. Hasil hanya dipakai bila masih milik key terakhir
 * (respons lama tidak menimpa yang baru). `reload()` memuat ulang key yang sama.
 */
export function useAsync<T>(load: () => Promise<T>, key: string) {
  const loadRef = useRef(load)
  useEffect(() => {
    loadRef.current = load
  })
  const [nonce, setNonce] = useState(0)
  const [state, setState] = useState<State<T>>({ key: null })
  const fullKey = `${key}#${nonce}`

  useEffect(() => {
    let alive = true
    loadRef.current().then(
      (data) => alive && setState({ key: fullKey, data }),
      (err: unknown) => alive && setState({ key: fullKey, error: errorMessage(err) }),
    )
    return () => {
      alive = false
    }
  }, [fullKey])

  const ready = state.key === fullKey
  return {
    data: ready ? state.data : undefined,
    error: ready ? (state.error ?? null) : null,
    loading: !ready,
    reload: () => setNonce((n) => n + 1),
  }
}
