import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { ErrorState } from '../components/ErrorState'
import { Icon } from '../components/Icon'
import { Input, TextArea } from '../components/Input'
import { Loading } from '../components/Loading'
import { useAuth } from '../context/auth'
import { account, ApiError, errorMessage, resetDemoData, validateAddress, type AddressInput } from '../lib/api'
import { ROLE_LABEL } from '../lib/roles'
import type { CustomerAddress } from '../lib/types'

export default function Profile() {
  const { user, mode, signOut } = useAuth()
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)

  // RoleGuard menjamin user ada.
  if (!user) return null

  async function onSignOut() {
    setSigningOut(true)
    await signOut()
    navigate('/', { replace: true })
  }

  return (
    <section className="space-y-5">
      <h1 className="text-2xl font-bold leading-tight">Akun Saya</h1>

      <Card className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-full bg-line text-soga">
            <Icon name="user" />
          </span>
          <div>
            <p className="text-lg font-bold">{user.full_name || 'Tanpa nama'}</p>
            <p className="text-base text-ink/80">{ROLE_LABEL[user.role]}</p>
          </div>
        </div>
        <dl className="space-y-1 pt-2 text-base">
          {user.email && (
            <div className="flex gap-2">
              <dt className="w-24 shrink-0 text-ink/75">Email</dt>
              <dd className="break-all">{user.email}</dd>
            </div>
          )}
          <div className="flex gap-2">
            <dt className="w-24 shrink-0 text-ink/75">Nomor HP</dt>
            <dd>{user.phone || 'Belum diisi'}</dd>
          </div>
        </dl>
      </Card>

      {user.role === 'customer' && <SavedAddresses />}

      <div className="space-y-3">
        <Button variant="secondary" fullWidth onClick={onSignOut} loading={signingOut} loadingText="Sedang keluar...">
          Keluar
        </Button>
        {mode === 'demo' && <DemoReset />}
      </div>
    </section>
  )
}

function DemoReset() {
  const { refresh } = useAuth()
  const [confirming, setConfirming] = useState(false)
  if (!confirming) {
    return (
      <Button variant="ghost" fullWidth onClick={() => setConfirming(true)}>
        Atur ulang data contoh
      </Button>
    )
  }
  return (
    <Card className="space-y-3">
      <p className="text-base">Semua pesanan, menu, dan alamat contoh kembali seperti awal. Lanjutkan?</p>
      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={() => setConfirming(false)}>
          Batal
        </Button>
        <Button
          className="flex-1"
          onClick={() => {
            resetDemoData()
            setConfirming(false)
            void refresh()
          }}
        >
          Ya, atur ulang
        </Button>
      </div>
    </Card>
  )
}

function SavedAddresses() {
  const [addresses, setAddresses] = useState<CustomerAddress[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let alive = true
    account.listAddresses().then(
      (list) => alive && setAddresses(list),
      (err: unknown) => alive && setLoadError(errorMessage(err)),
    )
    return () => {
      alive = false
    }
  }, [reloadKey])

  const load = () => {
    setLoadError(null)
    setReloadKey((k) => k + 1)
  }

  return (
    <section className="space-y-3" aria-labelledby="alamat-title">
      <h2 id="alamat-title" className="text-xl font-bold">
        Alamat Tersimpan
      </h2>

      {loadError && (
        <ErrorState message={loadError}>
          <Button variant="secondary" onClick={load}>
            Coba lagi
          </Button>
        </ErrorState>
      )}
      {!addresses && !loadError && <Loading text="Memuat alamat..." />}

      {addresses && addresses.length === 0 && !adding && (
        <p className="text-base text-ink/80">Belum ada alamat. Simpan alamat supaya pesan berikutnya lebih cepat.</p>
      )}

      {addresses?.map((a) => (
        <AddressCard key={a.id} address={a} onDeleted={() => setAddresses((list) => list?.filter((x) => x.id !== a.id) ?? null)} />
      ))}

      {addresses && !adding && addresses.length < 10 && (
        <Button fullWidth onClick={() => setAdding(true)}>
          Tambah alamat
        </Button>
      )}
      {addresses && addresses.length >= 10 && (
        <p className="text-base text-ink/80">Sudah 10 alamat (batas maksimal). Hapus salah satu untuk menambah.</p>
      )}

      {adding && (
        <AddressForm
          onCancel={() => setAdding(false)}
          onSaved={(a) => {
            setAddresses((list) => [...(list ?? []), a])
            setAdding(false)
          }}
        />
      )}
    </section>
  )
}

function AddressCard({ address, onDeleted }: { address: CustomerAddress; onDeleted: () => void }) {
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onDelete() {
    setBusy(true)
    setError(null)
    try {
      await account.deleteAddress(address.id)
      onDeleted()
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <Card className="space-y-2">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-terra">
          <Icon name="pin" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold">{address.label}</p>
          <p className="text-base">{address.address}</p>
          {address.note && <p className="text-base text-ink/75">Patokan: {address.note}</p>}
          <p className="text-base text-ink/75">
            {address.latitude !== null && address.longitude !== null ? 'Titik lokasi tersimpan' : 'Belum ada titik lokasi'}
          </p>
        </div>
      </div>
      {error && <ErrorState message={error} />}
      {confirming ? (
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setConfirming(false)} disabled={busy}>
            Batal
          </Button>
          <Button className="flex-1" onClick={onDelete} loading={busy} loadingText="Menghapus...">
            Ya, hapus
          </Button>
        </div>
      ) : (
        <Button variant="ghost" onClick={() => setConfirming(true)} aria-label={`Hapus alamat ${address.label}`}>
          Hapus
        </Button>
      )}
    </Card>
  )
}

function parseCoord(value: string): number | null {
  const v = value.trim().replace(',', '.')
  if (!v) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : Number.NaN
}

function AddressForm({ onCancel, onSaved }: { onCancel: () => void; onSaved: (a: CustomerAddress) => void }) {
  const [label, setLabel] = useState('')
  const [address, setAddress] = useState('')
  const [note, setNote] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function readMyLocation() {
    if (!('geolocation' in navigator)) {
      setError('HP ini tidak bisa membaca lokasi. Isi titik lokasi manual, atau lewati.')
      return
    }
    setLocating(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6))
        setLng(pos.coords.longitude.toFixed(6))
        setLocating(false)
      },
      () => {
        setError('Lokasi tidak bisa dibaca. Izinkan akses lokasi, atau isi manual.')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 15000 },
    )
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    const input: AddressInput = { label, address, note, latitude: parseCoord(lat), longitude: parseCoord(lng) }
    const problem = validateAddress(input)
    if (problem) {
      setError(new ApiError(problem).message)
      return
    }
    setBusy(true)
    setError(null)
    try {
      onSaved(await account.addAddress(input))
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <Card>
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <h3 className="text-lg font-bold">Alamat baru</h3>
        {error && <ErrorState message={error} />}
        <Input label="Nama alamat" placeholder="Contoh: Rumah" maxLength={60} value={label} onChange={(e) => setLabel(e.target.value)} />
        <TextArea
          label="Alamat lengkap"
          placeholder="Jalan, nomor rumah, RT/RW"
          maxLength={1500}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
        <Input
          label="Patokan (boleh dikosongkan)"
          placeholder="Contoh: pagar hijau dekat mushola"
          maxLength={1000}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <div className="space-y-2">
          <p className="text-base font-semibold">Titik lokasi (untuk perkiraan ongkir)</p>
          <Button variant="secondary" fullWidth onClick={readMyLocation} loading={locating} loadingText="Membaca lokasi...">
            <Icon name="pin" /> Pakai lokasi saya sekarang
          </Button>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Lintang" inputMode="decimal" placeholder="-7.5735" value={lat} onChange={(e) => setLat(e.target.value)} />
            <Input label="Bujur" inputMode="decimal" placeholder="110.8180" value={lng} onChange={(e) => setLng(e.target.value)} />
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onCancel} disabled={busy}>
            Batal
          </Button>
          <Button type="submit" className="flex-1" loading={busy} loadingText="Menyimpan...">
            Simpan
          </Button>
        </div>
      </form>
    </Card>
  )
}
