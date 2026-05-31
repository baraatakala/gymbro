interface SectionStatsBarProps {
  sectionName: string
  cardioMode: boolean
  totalSessions: number
  avgWeight: number
  totalVolume: number
  improvement: number | null
  savedCount: number
  totalExercises: number
  onOpenAnalytics: () => void
}

export function SectionStatsBar({
  sectionName,
  cardioMode,
  totalSessions,
  avgWeight,
  totalVolume,
  improvement,
  savedCount,
  totalExercises,
  onOpenAnalytics,
}: SectionStatsBarProps) {
  const progress =
    totalExercises > 0 ? Math.round((savedCount / totalExercises) * 100) : 0

  const volumeLabel =
    totalVolume > 999 ? `${(totalVolume / 1000).toFixed(1)}k` : String(totalVolume)

  const trendLabel =
    improvement === null ? '—' : `${improvement > 0 ? '+' : ''}${improvement}%`

  return (
    <div className="mb-4 rounded-2xl border border-slate-800 bg-slate-950/80 p-4 lg:hidden">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {sectionName}
          {cardioMode ? (
            <span className="ml-1 normal-case text-cyan-500/90">· cardio</span>
          ) : null}
        </p>
        <button
          type="button"
          onClick={onOpenAnalytics}
          className="shrink-0 rounded-lg bg-emerald-600/90 px-3 py-1.5 text-xs font-semibold text-white"
        >
          Analytics
        </button>
      </div>

      {totalExercises > 0 ? (
        <div className="mb-3">
          <div className="mb-1 flex justify-between text-xs text-slate-500">
            <span>
              Today: {savedCount}/{totalExercises} logged
            </span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-4 gap-2 text-center">
        <StatCell label="Days" value={String(totalSessions)} />
        <StatCell label={cardioMode ? 'Avg min' : 'Avg kg'} value={String(avgWeight)} />
        <StatCell label={cardioMode ? 'Min' : 'Vol'} value={volumeLabel} />
        <StatCell
          label="Trend"
          value={trendLabel}
          highlight={improvement !== null && improvement > 0}
        />
      </div>
      <p className="mt-2 text-center text-[10px] text-slate-600">All-time stats</p>
    </div>
  )
}

function StatCell({
  label,
  value,
  highlight = false,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  const valueClass = highlight ? 'text-emerald-400' : 'text-white'

  return (
    <div className="rounded-lg bg-slate-900/50 px-1 py-2">
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-0.5 text-sm font-bold ${valueClass}`}>{value}</p>
    </div>
  )
}
