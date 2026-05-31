import { getSectionMeta } from '../../lib/sectionUtils'

interface WorkoutDockProps {
  sectionName: string
  savedCount: number
  totalExercises: number
  workoutTime: string
  restTime: string
  isResting: boolean
  onFinish: () => void
  onAddExercise: () => void
  onOpenAnalytics: () => void
}

export function WorkoutDock({
  sectionName,
  savedCount,
  totalExercises,
  workoutTime,
  restTime,
  isResting,
  onFinish,
  onAddExercise,
  onOpenAnalytics,
}: WorkoutDockProps) {
  if (totalExercises === 0) return null

  const meta = getSectionMeta(sectionName)
  const pct = totalExercises > 0 ? Math.round((savedCount / totalExercises) * 100) : 0
  const complete = savedCount >= totalExercises && totalExercises > 0
  const circumference = 2 * Math.PI * 18
  const offset = circumference - (pct / 100) * circumference

  return (
    <div className="workout-dock lg:hidden">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
        <div className="relative flex h-11 w-11 shrink-0 items-center justify-center">
          <svg className="h-11 w-11 -rotate-90" viewBox="0 0 44 44" aria-hidden>
            <circle
              cx="22"
              cy="22"
              r="18"
              fill="none"
              className="stroke-slate-800"
              strokeWidth="4"
            />
            <circle
              cx="22"
              cy="22"
              r="18"
              fill="none"
              className={`${meta.ringClass} transition-all duration-500`}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>
          <span className="absolute text-[10px] font-bold text-white">
            {savedCount}/{totalExercises}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">
            {meta.emoji} {sectionName}
          </p>
          <p className="text-xs text-slate-500">
            {isResting ? (
              <span className="text-amber-400">Rest {restTime}</span>
            ) : (
              <>Workout {workoutTime}</>
            )}
          </p>
        </div>

        <div className="flex shrink-0 gap-1.5">
          <button
            type="button"
            onClick={onOpenAnalytics}
            className="rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-2 text-xs text-slate-300"
            aria-label="Analytics"
          >
            📊
          </button>
          <button
            type="button"
            onClick={onAddExercise}
            className="rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-2 text-xs text-slate-300"
            aria-label="Add exercise"
          >
            +
          </button>
          <button
            type="button"
            onClick={onFinish}
            className={`rounded-xl px-3 py-2 text-xs font-semibold text-white ${
              complete
                ? 'bg-emerald-500 shadow-lg shadow-emerald-900/50'
                : 'bg-emerald-700 hover:bg-emerald-600'
            }`}
          >
            {complete ? 'Done ✓' : 'Finish'}
          </button>
        </div>
      </div>
    </div>
  )
}
