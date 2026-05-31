interface StatusStripProps {
  dataLabel: string
  libraryExercises?: number
  libraryMuscles?: number
  sectionCount?: number
  activeSection?: string
  activeExerciseCount?: number
  emptySections?: number
  prCount?: number
  trainingDays?: number
  trainingStreak?: number
  savedTodayCount?: number
  totalPlanExercises?: number
}

export function StatusStrip({
  dataLabel,
  libraryExercises = 0,
  libraryMuscles = 0,
  sectionCount = 0,
  activeSection,
  activeExerciseCount = 0,
  emptySections = 0,
  prCount = 0,
  trainingDays = 0,
  trainingStreak = 0,
  savedTodayCount = 0,
  totalPlanExercises = 0,
}: StatusStripProps) {
  const progressPct =
    totalPlanExercises > 0
      ? Math.round((savedTodayCount / totalPlanExercises) * 100)
      : 0

  const connected = dataLabel.toLowerCase().includes('cloud sync')

  return (
    <div className="glass-panel mb-5 overflow-hidden p-0 sm:mb-6">
      <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-2 sm:py-3.5">
        <span className="chip border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
          <span
            className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]' : 'bg-slate-500'}`}
          />
          {dataLabel}
        </span>

        <div className="flex flex-wrap gap-2 text-xs text-slate-500 sm:text-sm">
          {libraryExercises > 0 && (
            <span className="chip border-slate-700/80 bg-slate-800/50 text-slate-400">
              {libraryExercises} exercises · {libraryMuscles} groups
            </span>
          )}
          {sectionCount > 0 && activeSection && (
            <span className="chip border-slate-700/80 bg-slate-800/50 text-slate-400">
              <span className="text-slate-200">{activeExerciseCount}</span> on{' '}
              <span className="font-medium text-white">{activeSection}</span>
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2 sm:ml-auto">
          {totalPlanExercises > 0 && savedTodayCount > 0 && (
            <span className="chip border-emerald-500/35 bg-emerald-500/15 text-emerald-300">
              Today {savedTodayCount}/{totalPlanExercises}
              {progressPct >= 100 ? ' ✓' : ` · ${progressPct}%`}
            </span>
          )}
          {trainingStreak > 0 && (
            <span className="chip border-amber-500/30 bg-amber-500/10 text-amber-300">
              🔥 {trainingStreak}-day streak
            </span>
          )}
          {emptySections > 0 && (
            <span className="chip border-amber-600/40 bg-amber-950/40 text-amber-400">
              {emptySections} empty
            </span>
          )}
          {prCount > 0 && (
            <span className="chip border-emerald-500/25 bg-slate-800/60 text-emerald-400">
              {prCount} PR{prCount !== 1 ? 's' : ''}
            </span>
          )}
          {trainingDays > 0 && (
            <span className="chip border-slate-600/60 bg-slate-800/40 text-slate-400">
              {trainingDays} day{trainingDays !== 1 ? 's' : ''} logged
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
