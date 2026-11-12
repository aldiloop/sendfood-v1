import { useState, type FormEvent } from 'react'
import { BatikStrip } from '../components/BatikStrip'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { ErrorState } from '../components/ErrorState'
import { Input } from '../components/Input'
import { Loading } from '../components/Loading'
import { useAuth } from '../context/auth'
import { errorMessage, isValidEmail } from '../lib/api'
import { ALL_ROLES, ROLE_HOME, ROLE_LABEL, safeNextPath, type Role } from '../lib/roles'

const DEMO_ROLE_HINT: Record<Role, string> = {
  customer: 'Pesan makanan dari warung',
  seller: 'Terima dan siapkan pesanan',
  driver: 'Antar pesanan ke pembeli',
  admin: 'Atur pesanan dan kurir',
}

export default function Login() {
  const { status, user, mode, signIn, demoSignIn, error: authError } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = safeNextPath(params.get('next'))

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<Role | 'email' | null>(null)

  if (status === 'loading') return <Loading text="Memeriksa akun..." />
  if (user && !busy) return <Navigate to={next ?? ROLE_HOME[user.role]} replace />

  const goAfterLogin = (role: Role) => navigate(next ?? ROLE_HOME[role], { replace: true })

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    const errs: typeof fieldErrors = {}
    if (!isValidEmail(email)) errs.email = 'Tulis email yang benar, contoh: nama@email.com'
    if (!password) errs.password = 'Kata sandi wajib diisi.'
    setFieldErrors(errs)
    if (errs.email || errs.password) return
    setBusy('email')
    setError(null)
    try {
      const profile = await signIn(email, password)
      goAfterLogin(profile.role)
    } catch (err) {
      setError(errorMessage(err))
      setBusy(null)
    }
  }

  async function onDemo(role: Role) {
    if (busy) return
    setBusy(role)
    setError(null)
    try {
      const profile = await demoSignIn(role)
      goAfterLogin(profile.role)
    } catch (err) {
      setError(errorMessage(err))
      setBusy(null)
    }
  }

  return (
    <section className="space-y-5">
      <BatikStrip className="rounded-full" />
      <div>
        <h1 className="text-2xl font-bold leading-tight">Masuk</h1>
        <p className="mt-1 text-base text-ink/80">
          {mode === 'demo'
            ? 'Ini mode demo. Pilih peran untuk mencoba aplikasi dengan data contoh.'
            : 'Masuk untuk memesan dan melihat pesananmu.'}
        </p>
      </div>

      {(error || authError) && <ErrorState message={error ?? authError ?? ''} />}

      {mode === 'demo' ? (
        <div className="space-y-3">
          {ALL_ROLES.map((role) => (
            <Card key={role} className="flex items-center justify-between gap-3">
              <div>
                <p className="text-base font-bold">{ROLE_LABEL[role]}</p>
                <p className="text-base text-ink/75">{DEMO_ROLE_HINT[role]}</p>
              </div>
              <Button
                variant={role === 'customer' ? 'primary' : 'secondary'}
                onClick={() => onDemo(role)}
                loading={busy === role}
                disabled={busy !== null}
                aria-label={`Masuk sebagai ${ROLE_LABEL[role]}`}
              >
                Masuk
              </Button>
            </Card>
          ))}
          <p className="text-base text-ink/75">
            Data contoh hanya tersimpan di HP ini. Tidak ada pesanan sungguhan yang dikirim.
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldErrors.email}
          />
          <Input
            label="Kata sandi"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldErrors.password}
          />
          <Button type="submit" fullWidth loading={busy === 'email'} loadingText="Sedang masuk...">
            Masuk
          </Button>
          <p className="text-center text-base">
            Belum punya akun?{' '}
            <Link to={next ? `/register?next=${encodeURIComponent(next)}` : '/register'} className="font-semibold text-soga underline">
              Daftar di sini
            </Link>
          </p>
        </form>
      )}
    </section>
  )
}
