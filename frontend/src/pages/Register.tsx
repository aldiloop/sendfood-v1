import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { ErrorState } from '../components/ErrorState'
import { Input } from '../components/Input'
import { Loading } from '../components/Loading'
import { useAuth } from '../context/auth'
import { errorMessage, isValidEmail, MIN_PASSWORD_LENGTH } from '../lib/api'
import { ROLE_HOME, safeNextPath } from '../lib/roles'

type Errors = Partial<Record<'fullName' | 'phone' | 'email' | 'password', string>>

export default function Register() {
  const { status, user, mode, signUp } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = safeNextPath(params.get('next'))

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)

  if (status === 'loading') return <Loading text="Memeriksa akun..." />
  if (user && !busy) return <Navigate to={next ?? ROLE_HOME[user.role]} replace />

  if (mode === 'demo') {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-bold leading-tight">Daftar Akun</h1>
        <Card className="space-y-3">
          <p className="text-base">
            Pendaftaran butuh server. Di mode demo, pakai akun contoh yang sudah tersedia.
          </p>
          <Link
            to="/login"
            className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-soga px-5 text-base font-semibold text-white"
          >
            Pakai akun contoh
          </Link>
        </Card>
      </section>
    )
  }

  if (sentTo) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-bold leading-tight">Cek emailmu</h1>
        <Card className="space-y-3">
          <p className="text-base">
            Kami mengirim tautan konfirmasi ke <strong>{sentTo}</strong>. Buka tautan itu, lalu masuk.
          </p>
          <Link
            to="/login"
            className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-soga px-5 text-base font-semibold text-white"
          >
            Ke halaman Masuk
          </Link>
        </Card>
      </section>
    )
  }

  function validate(): Errors {
    const e: Errors = {}
    const name = fullName.trim()
    if (name.length < 2 || name.length > 160) e.fullName = 'Tulis nama lengkap (2–160 huruf).'
    if (phone.trim() && !/^[0-9+\-\s]{8,20}$/.test(phone.trim())) e.phone = 'Nomor HP hanya angka, contoh 0812-3456-7890.'
    if (!isValidEmail(email)) e.email = 'Tulis email yang benar, contoh: nama@email.com'
    if (password.length < MIN_PASSWORD_LENGTH) e.password = `Kata sandi minimal ${MIN_PASSWORD_LENGTH} huruf/angka.`
    return e
  }

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault()
    if (busy) return
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length) return
    setBusy(true)
    setError(null)
    try {
      // Akun baru selalu pelanggan (ditetapkan server). Peran lain diatur admin.
      const result = await signUp({ fullName, phone, email, password })
      if (result.needsEmailConfirm || !result.profile) {
        setSentTo(email.trim())
        setBusy(false)
        return
      }
      navigate(next ?? ROLE_HOME[result.profile.role], { replace: true })
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold leading-tight">Daftar Akun</h1>
        <p className="mt-1 text-base text-ink/80">Akun baru bisa langsung memesan. Bayarnya di tempat (COD).</p>
      </div>

      {error && <ErrorState message={error} />}

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Input label="Nama lengkap" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} error={errors.fullName} />
        <Input
          label="Nomor HP (boleh dikosongkan)"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          error={errors.phone}
          hint="Dipakai kurir untuk menghubungimu."
        />
        <Input
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
        />
        <Input
          label="Kata sandi"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          hint={`Minimal ${MIN_PASSWORD_LENGTH} huruf/angka.`}
        />
        <Button type="submit" fullWidth loading={busy} loadingText="Sedang mendaftar...">
          Daftar
        </Button>
        <p className="text-center text-base">
          Sudah punya akun?{' '}
          <Link to={next ? `/login?next=${encodeURIComponent(next)}` : '/login'} className="font-semibold text-soga underline">
            Masuk
          </Link>
        </p>
      </form>
    </section>
  )
}
