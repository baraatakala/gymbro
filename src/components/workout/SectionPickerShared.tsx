import type { WorkoutDayPlan } from '../../types/plan'

export function filterDays(days: WorkoutDayPlan[], search: string) {
  const q = search.trim().toLowerCase()
  if (!q) return days
  return days.filter((d) => d.name.toLowerCase().includes(q))
}

export function SectionTabButton({
  day,
  isActive,
  onSelect,
  compact = false,
}: {
  day: WorkoutDayPlan
  isActive: boolean
  onSelect: () => void
  compact?: boolean
}) {
  const isEmpty = day.exercises.length === 0
  return (
    <button
      type="button"
      onClick={onSelect}
      className={
        compact
          ? `w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
              isActive
                ? 'bg-emerald-600 text-white shadow-md'
                : isEmpty
                  ? 'border border-amber-800/40 bg-amber-950/25 text-amber-200 hover:bg-amber-950/40'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
            }`
          : `section-tab ${
              isActive
                ? 'section-tab-active'
                : isEmpty
                  ? 'border border-amber-700/50 bg-amber-950/30 text-amber-200 hover:bg-amber-950/50'
                  : 'section-tab-idle'
            }`
      }
    >
      <span className="flex items-center justify-between gap-2">
        <span className="truncate">{day.name}</span>
        <span className={`shrink-0 text-xs ${isActive ? 'opacity-90' : 'opacity-55'}`}>
          {day.exercises.length}
        </span>
      </span>
    </button>
  )
}
