import { formatSessionTime, sessionElapsedMinutes } from '../../lib/checkIn'
import { formatVisitDuration } from '../../lib/attendanceAnalytics'
import { getSectionMeta } from '../../lib/sectionUtils'

interface WorkoutSessionBarProps {
  sectionName: string
  checkInAt?: string
  checkOutAt?: string
  sessionComplete?: boolean
  workoutTime: string
  restTime: string
  isResting: boolean
  savedCount: number
  totalExercises: number
  onFinish: () => void
  onShowWorkflow: () => void
  /** Insights-style active visit (set-based), when session ended */
  activeVisitMinutes?: number | null
}

export function WorkoutSessionBar({
  sectionName,
  checkInAt,
  checkOutAt,
  sessionComplete,
  workoutTime,
  restTime,
  isResting,
  savedCount,
  totalExercises,
  onFinish,
  onShowWorkflow,
  activeVisitMinutes,
}: WorkoutSessionBarProps) {
  if (totalExercises === 0) return null

  const meta = getSectionMeta(sectionName)
  const canFinish = savedCount > 0 && !sessionComplete
  const pct = Math.round((savedCount / totalExercises) * 100)
  const clockVisitMin = sessionElapsedMinutes(checkInAt, checkOutAt)
  const visitLabel =
    sessionComplete && activeVisitMinutes != null && activeVisitMinutes > 0
      ? formatVisitDuration(activeVisitMinutes)
      : sessionComplete && clockVisitMin != null
        ? formatVisitDuration(clockVisitMin)
        : null

  const circumference = 2 * Math.PI * 20
  const offset = circumference - (pct / 100) * circumference

  return (
    <div className="mb-4 hidden rounded-2xl border border-emerald-900/50 bg-gradient-to-r from-slate-950 via-slate-900/90 to-slate-950 p-4 lg:block">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex min-w-[10rem] items-center gap-3">
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center">
            <svg className="h-11 w-11 -rotate-90" viewBox="0 0 44 44" aria-hidden>
              <circle cx="22" cy="22" r="20" fill="none" className="stroke-slate-800" strokeWidth="3" />
              <circle
                cx="22"
                cy="22"
                r="20"
                fill="none"
                className={meta.ringClass}
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
              />
            </svg>
            <span className="absolute text-[10px] font-bold tabular-nums text-white">{pct}%</span>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-500/90">
              Gym session
            </p>
            <p className="text-base font-semibold text-white">
              {meta.emoji} {sectionName}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-6 text-sm">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-slate-500">Check-in</p>
            <p className="font-mono font-medium text-emerald-300">
              {formatSessionTime(checkInAt)}
            </p>
            <p className="text-[10px] text-slate-500">Pick a section or save a set</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-slate-500">Check-out</p>
            <p className="font-mono font-medium text-slate-200">
              {sessionComplete ? formatSessionTime(checkOutAt) : '—'}
            </p>
            <p className="text-[10px] text-slate-500">End session when you leave</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-slate-500">
              {sessionComplete ? 'Active time' : 'Timer'}
            </p>
            <p className="font-mono font-medium text-white">
              {sessionComplete && visitLabel ? (
                <span className="text-emerald-300" title="Based on sets logged, not clock while app was open">
                  {visitLabel}
                </span>
              ) : isResting ? (
                <span className="text-amber-400">Rest {restTime}</span>
              ) : (
                workoutTime
              )}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-slate-500">Progress</p>
            <p className="font-medium text-white">
              {savedCount}/{totalExercises} <span className="text-slate-500">({pct}%)</span>
            </p>
          </div>
        </div>

        <div className="ml-auto flex shrink-0 flex-wrap items-center gap-2">
          <button type="button" onClick={onShowWorkflow} className="btn-secondary text-xs">
            How it works
          </button>
          {sessionComplete ? (
            <span className="rounded-xl border border-emerald-800/60 bg-emerald-950/40 px-4 py-2 text-sm font-semibold text-emerald-300">
              Session ended ✓
            </span>
          ) : (
            <button
              type="button"
              onClick={onFinish}
              disabled={!canFinish}
              className="btn-primary disabled:cursor-not-allowed disabled:opacity-40"
            >
              End session (check-out)
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
