export function Loading({ text = 'Memuat...' }: { text?: string }) {
  return (
    <p role="status" className="py-8 text-center text-base text-ink/80">
      {text}
    </p>
  )
}
