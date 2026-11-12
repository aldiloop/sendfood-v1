import { createContext, useContext } from 'react'
import type { SignUpInput, SignUpResult } from '../lib/api'
import type { Role } from '../lib/roles'
import type { Profile } from '../lib/types'

export type AuthValue = {
  /** 'loading' sampai status masuk pertama kali diketahui. */
  status: 'loading' | 'ready'
  user: Profile | null
  /** Galat saat membaca akun (mis. profil tidak bisa dibaca). */
  error: string | null
  mode: 'live' | 'demo'
  signIn(email: string, password: string): Promise<Profile>
  signUp(input: SignUpInput): Promise<SignUpResult>
  signOut(): Promise<void>
  demoSignIn(role: Role): Promise<Profile>
  refresh(): Promise<void>
}

export const AuthContext = createContext<AuthValue | null>(null)

export function useAuth(): AuthValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth harus dipakai di dalam <AuthProvider>')
  return value
}
