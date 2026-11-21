export default function Loading() {
  return (
    <div className="mx-auto max-w-2xl space-y-3 px-4 pt-20">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-24 animate-pulse rounded-2xl bg-surface2" />
      ))}
    </div>
  )
}
