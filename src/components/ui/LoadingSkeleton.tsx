export function LoadingSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="animate-pulse space-y-3 rounded-2xl border border-slate-800 bg-slate-950/40 p-6">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 rounded-lg bg-slate-800"
          style={{ width: `${85 - i * 12}%` }}
        />
      ))}
    </div>
  )
}
