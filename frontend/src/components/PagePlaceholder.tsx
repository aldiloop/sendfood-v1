/** Penanda sementara untuk halaman yang belum dikerjakan (dihapus setelah Task 7). */
export function PagePlaceholder({ title }: { title: string }) {
  return (
    <section className="space-y-2">
      <h1 className="text-2xl font-bold leading-tight">{title}</h1>
      <p className="text-base text-ink/80">Halaman ini sedang dibuat.</p>
    </section>
  )
}
