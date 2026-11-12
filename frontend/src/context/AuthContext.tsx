import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { account, errorMessage, type SignUpInput } from '../lib/api'
import type { Role } from '../lib/roles'
import type { Profile } from '../lib/types'
import { AuthContext, type AuthValue } from './auth'

/**
 * Sumber kebenaran peran:
 * - live: baris `profiles` yang dibaca dari server (lib/api.ts → account.getCurrentUser);
 * - demo: akun contoh di data demo (hanya mode demo).
 * Tidak ada peran yang diambil dari URL, query, atau localStorage di mode live.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'ready'>('loading')
  const [user, setUser] = useState<Profile | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Hanya hasil permintaan terakhir yang dipakai (hindari respons lama menimpa yang baru).
  const requestId = useRef(0)

  const refresh = useCallback((): Promise<void> => {
    const id = ++requestId.current
    return account.getCurrentUser().then(
      (profile) => {
        if (id !== requestId.current) return
        setUser(profile)
        setError(null)
        setStatus('ready')
      },
      (err: unknown) => {
        if (id !== requestId.current) return
        setUser(null)
        setError(errorMessage(err))
        setStatus('ready')
      },
    )
  }, [])

  useEffect(() => {
    void refresh()
    return account.onChange(() => void refresh())
  }, [refresh])

  const signIn = useCallback(
    async (email: string, password: string) => {
      const profile = await account.signIn(email, password)
      await refresh()
      return profile
    },
    [refresh],
  )

  const signUp = useCallback(
    async (input: SignUpInput) => {
      const result = await account.signUp(input)
      await refresh()
      return result
    },
    [refresh],
  )

  const signOut = useCallback(async () => {
    await account.signOut()
    await refresh()
  }, [refresh])

  const demoSignIn = useCallback(
    async (role: Role) => {
      const profile = await account.demoSignIn(role)
      await refresh()
      return profile
    },
    [refresh],
  )

  const value = useMemo<AuthValue>(
    () => ({ status, user, error, mode: account.mode, signIn, signUp, signOut, demoSignIn, refresh }),
    [status, user, error, signIn, signUp, signOut, demoSignIn, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
