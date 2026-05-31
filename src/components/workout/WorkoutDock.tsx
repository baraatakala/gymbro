import { getSectionMeta } from '../../lib/sectionUtils'

interface WorkoutDockProps {
  sectionName: string
  savedCount: number
  totalExercises: number
  sessionComplete?: boolean
  workoutInProgress?: boolean
  workoutTime: string
  restTime: string
  isResting: boolean
  onStartWorkout: () => void
  onFinish: () => void
  onAddExercise: () => void
  onOpenAnalytics: () => void
}

export function WorkoutDock({
  sectionName,
  savedCount,
  totalExercises,
  sessionComplete = false,
  workoutInProgress = false,
  workoutTime,
  restTime,
  isResting,
  onStartWorkout,
  onFinish,
  onAddExercise,
  onOpenAnalytics,
}: WorkoutDockProps) {
  if (totalExercises === 0) return null

  const meta = getSectionMeta(sectionName)
  const pct = totalExercises > 0 ? Math.round((savedCount / totalExercises) * 100) : 0
  const complete = savedCount >= totalExercises && totalExercises > 0
  const canFinish = savedCount > 0 && !sessionComplete
  const circumference = 2 * Math.PI * 18
  const offset = circumference - (pct / 100) * circumference

  const primaryLabel = sessionComplete
    ? 'Session ended ✓'
    : workoutInProgress
      ? complete
        ? 'End workout — section complete'
        : canFinish
          ? 'End workout'
          : 'Save a set to end'
      : 'Start workout'

  const primaryAction = sessionComplete
    ? undefined
    : workoutInProgress
      ? onFinish
      : onStartWorkout

  const primaryDisabled = sessionComplete || (workoutInProgress && !canFinish)

  return (
    <div className="workout-dock lg:hidden" role="region" aria-label="Active workout">
      <div className="workout-dock-inner">
        <div className="flex items-center gap-3">
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center">
            <svg className="h-11 w-11 -rotate-90" viewBox="0 0 44 44" aria-hidden>
              <circle cx="22" cy="22" r="18" fill="none" className="stroke-slate-800" strokeWidth="4" />
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
            <span className="absolute text-[10px] font-bold tabular-nums text-white">{pct}%</span>
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">
              {meta.emoji} {sectionName}
            </p>
            <p className="text-xs text-slate-400">
              {savedCount}/{totalExercises} saved
              <span className="mx-1 text-slate-600">·</span>
              {workoutInProgress ? (
                isResting ? (
                  <span className="font-medium text-amber-400">Rest {restTime}</span>
                ) : (
                  <span className="text-slate-300">{workoutTime}</span>
                )
              ) : (
                <span className="text-slate-500">Tap Start when you arrive</span>
              )}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={primaryAction}
          disabled={primaryDisabled}
          className={`workout-dock-primary w-full ${
            sessionComplete ? 'workout-dock-primary--done' : ''
          }`}
        >
          {primaryLabel}
        </button>

        <div className="flex justify-center gap-2">
          <button
            type="button"
            onClick={onOpenAnalytics}
            className="workout-dock-secondary"
            aria-label="Section progress"
          >
            Progress
          </button>
          <button
            type="button"
            onClick={onAddExercise}
            className="workout-dock-secondary"
            aria-label="Add exercise"
          >
            + Exercise
          </button>
        </div>
      </div>
    </div>
  )
}
