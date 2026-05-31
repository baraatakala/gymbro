import type { ReactNode } from 'react'
import type { AppView } from './AppViewNav'
import { TrainingCalendar } from '../analytics/TrainingCalendar'

interface SidebarProps {
  open: boolean
  onToggle: () => void
  currentDay: string
  exerciseCount: number
  workoutTime: string
  restTime: string
  isResting: boolean
  onStartRest: () => void
  onStopRest: () => void
  onLoadLast: () => void
  onReset: () => void
  onAnalytics: () => void
  appView?: AppView
  onNavigate?: (view: AppView) => void
  onExport: (format: 'json' | 'csv-sets' | 'csv-records') => void
  onAddExercise: () => void
  onBrowseLibrary: () => void
  onOpenRoadmap: () => void
  cloudStatus: 'idle' | 'checking' | 'connected' | 'error' | 'disabled'
  cloudMessage: string
  cloudSyncing: boolean
  onSyncCloud: () => void
  trainingCalendarDates?: string[]
}

export function Sidebar({
  open,
  onToggle,
  currentDay,
  exerciseCount,
  workoutTime,
  restTime,
  isResting,
  onStartRest,
  onStopRest,
  onLoadLast,
  onReset,
  onAnalytics,
  appView = 'workout',
  onNavigate,
  onExport,
  onAddExercise,
  onBrowseLibrary,
  onOpenRoadmap,
  cloudStatus,
  cloudMessage,
  cloudSyncing,
  onSyncCloud,
  trainingCalendarDates = [],
}: SidebarProps) {
  const cloudDot =
    cloudStatus === 'connected'
      ? 'bg-emerald-400'
      : cloudStatus === 'error'
        ? 'bg-red-400'
        : cloudStatus === 'checking'
          ? 'bg-amber-400 animate-pulse'
          : 'bg-slate-500'
  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        className="fab-settings"
        aria-label={open ? 'Close panel' : 'Open panel'}
      >
        {open ? '✕' : '⚙'}
      </button>

      <aside
        className={`fixed right-0 top-0 z-30 flex h-full w-[min(360px,92vw)] flex-col border-l border-slate-700/60 bg-slate-900/95 shadow-2xl backdrop-blur-xl transition-transform duration-300 ease-out ${open ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="border-b border-slate-800/80 bg-slate-950/50 px-5 py-4">
          <h2 className="text-base font-bold text-white">Control panel</h2>
          <p className="mt-1 text-xs text-slate-400">{currentDay} · {exerciseCount} exercises</p>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          {onNavigate && (
            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Navigate
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <SidebarBtn
                  onClick={() => onNavigate('workout')}
                  variant={appView === 'workout' ? 'primary' : 'default'}
                >
                  Workout
                </SidebarBtn>
                <SidebarBtn
                  onClick={() => onNavigate('insights')}
                  variant={appView === 'insights' ? 'primary' : 'default'}
                >
                  Insights
                </SidebarBtn>
              </div>
            </section>
          )}

          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Timer
            </h3>
            <div className="rounded-xl border border-slate-800/80 bg-slate-950/80 p-4 text-sm">
              <div className="flex justify-between text-slate-300">
                <span>Workout</span>
                <span className="font-mono font-medium text-white">{workoutTime}</span>
              </div>
              <div className="mt-2 flex justify-between text-slate-300">
                <span>Rest</span>
                <span
                  className={`font-mono font-medium ${isResting ? 'text-amber-400' : 'text-white'}`}
                >
                  {restTime}
                </span>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={onStartRest}
                className="flex-1 rounded-lg bg-amber-500/20 py-2 text-sm font-medium text-amber-300 hover:bg-amber-500/30"
              >
                Start rest
              </button>
              <button
                type="button"
                onClick={onStopRest}
                className="flex-1 rounded-lg bg-slate-800 py-2 text-sm text-slate-300 hover:bg-slate-700"
              >
                Stop
              </button>
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Workout
            </h3>
            <div className="space-y-2">
              <SidebarBtn onClick={onAddExercise} variant="primary">
                Add exercise
              </SidebarBtn>
              <SidebarBtn onClick={onBrowseLibrary}>Browse exercise library</SidebarBtn>
              <SidebarBtn onClick={onOpenRoadmap}>Roadmap & workflow</SidebarBtn>
              <SidebarBtn onClick={onLoadLast}>Load last session</SidebarBtn>
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Activity
            </h3>
            {trainingCalendarDates.length > 0 ? (
              <TrainingCalendar trainedDates={trainingCalendarDates} />
            ) : (
              <p className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs leading-relaxed text-slate-500">
                Save at least one exercise to start your training calendar and streak.
              </p>
            )}
          </section>

          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Cloud (Supabase)
            </h3>
            <div className="mb-3 rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${cloudDot}`} />
                <span className="font-medium text-slate-300 capitalize">{cloudStatus}</span>
              </div>
              {cloudMessage && <p className="mt-2 leading-relaxed">{cloudMessage}</p>}
            </div>
            <SidebarBtn onClick={onSyncCloud} disabled={cloudSyncing || cloudStatus === 'disabled'}>
              {cloudSyncing ? 'Syncing…' : 'Sync all to cloud'}
            </SidebarBtn>
          </section>

          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Data
            </h3>
            <div className="space-y-2">
              <SidebarBtn onClick={onAnalytics} variant="primary">
                Section progress
              </SidebarBtn>
              <SidebarBtn onClick={() => onExport('json')}>Export full backup (JSON)</SidebarBtn>
              <SidebarBtn onClick={() => onExport('csv-sets')}>Export sets (CSV)</SidebarBtn>
              <SidebarBtn onClick={() => onExport('csv-records')}>Export PRs (CSV)</SidebarBtn>
              <SidebarBtn onClick={onReset} variant="danger">
                Reset all workouts
              </SidebarBtn>
            </div>
          </section>
        </div>
      </aside>

      {open && (
        <button
          type="button"
          className="fixed inset-0 z-20 bg-slate-950/70 backdrop-blur-sm transition-opacity"
          onClick={onToggle}
          aria-label="Close overlay"
        />
      )}
    </>
  )
}

function SidebarBtn({
  children,
  onClick,
  variant = 'default',
  disabled = false,
}: {
  children: ReactNode
  onClick: () => void
  variant?: 'default' | 'primary' | 'danger'
  disabled?: boolean
}) {
  const styles = {
    default: 'bg-slate-800 text-slate-200 hover:bg-slate-700',
    primary: 'bg-emerald-600/90 text-white hover:bg-emerald-500',
    danger: 'bg-red-950/80 text-red-300 hover:bg-red-900/80 border border-red-900/50',
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-xl px-4 py-2.5 text-left text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]}`}
    >
      {children}
    </button>
  )
}
