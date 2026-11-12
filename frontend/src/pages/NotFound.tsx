import { Link } from 'react-router'

export default function NotFound() {
  return (
    <section className="space-y-4 py-8 text-center">
      <p className="text-base font-semibold text-terra">Halaman tidak ditemukan</p>
      <h1 className="text-2xl font-bold leading-tight">Maaf, halaman ini tidak ada</h1>
      <p className="text-base text-ink/80">
        Mungkin alamatnya salah ketik, atau halamannya sudah dipindah.
      </p>
      <Link
        to="/"
        className="inline-flex min-h-12 items-center justify-center rounded-xl bg-soga px-6 text-base font-semibold text-white"
      >
        Kembali ke Beranda
      </Link>
    </section>
  )
}
