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

  return (
    <div className="glass-panel mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-xs sm:text-sm">
      <span className="inline-flex items-center gap-1.5 text-slate-400">
        <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
        <strong className="text-emerald-400">{dataLabel}</strong>
      </span>
      {libraryExercises > 0 && (
        <span className="text-slate-500">
          Library · {libraryExercises} ex · {libraryMuscles} groups
        </span>
      )}
      {sectionCount > 0 && activeSection && (
        <span className="text-slate-500">
          {sectionCount} sections · <span className="text-slate-300">{activeExerciseCount}</span>{' '}
          on <span className="text-white">{activeSection}</span>
        </span>
      )}
      {totalPlanExercises > 0 && savedTodayCount > 0 && (
        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-400">
          Today {savedTodayCount}/{totalPlanExercises}
          {progressPct >= 100 ? ' ✓' : ` · ${progressPct}%`}
        </span>
      )}
      {emptySections > 0 && (
        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-400">
          {emptySections} empty
        </span>
      )}
      <span className="ml-auto flex flex-wrap items-center gap-2">
        {trainingStreak > 0 && (
          <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-emerald-400">
            {trainingStreak}-day streak
          </span>
        )}
        {trainingDays > 0 && (
          <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-slate-300">
            {trainingDays} training day{trainingDays !== 1 ? 's' : ''}
          </span>
        )}
        {prCount > 0 && (
          <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 font-medium text-emerald-400">
            {prCount} PR{prCount !== 1 ? 's' : ''}
          </span>
        )}
      </span>
    </div>
  )
}
