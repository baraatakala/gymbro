import { useCallback, useEffect, useMemo, useState } from 'react'
import { ProgressModal } from './components/analytics/ProgressModal'
import { Header } from './components/layout/Header'
import { StatusStrip } from './components/layout/StatusStrip'
import { Sidebar } from './components/layout/Sidebar'
import { Toast } from './components/ui/Toast'
import { LoadingSkeleton } from './components/ui/LoadingSkeleton'
import { FeatureExplorer } from './components/roadmap/FeatureExplorer'
import { DayManager } from './components/workout/DayManager'
import { ExerciseCard } from './components/workout/ExerciseCard'
import { ExerciseLibraryModal } from './components/workout/ExerciseLibraryModal'
import { QuickAddExercise } from './components/workout/QuickAddExercise'
import { ExerciseListToolbar } from './components/workout/ExerciseListToolbar'
import { SetupBanner } from './components/workout/SetupBanner'
import { SectionHero } from './components/workout/SectionHero'
import { WorkoutDock } from './components/workout/WorkoutDock'
import { SectionStatsBar } from './components/workout/SectionStatsBar'
import { calculateDayStats, compareToLast } from './lib/analytics'
import { sessionHasLoggedExercises, sessionsLookCorrupt } from './lib/sessionMerge'
import { DataRepairBanner } from './components/workout/DataRepairBanner'
import { hasLocalWorkoutData } from './lib/supabaseSessions'
import {
  collapseSessionsByDay,
  exercisesLoggedToday,
  mergePreviousSessionForPrefill,
  mergeSessionsForPrefill,
  sessionsTodayOnly,
} from './lib/sessionMerge'
import { isCardioSection } from './lib/sectionUtils'
import { computeTrainingStreak } from './lib/trainingCalendar'
import type { SetEntry } from './types/workout'
import { useWorkoutData } from './hooks/useWorkoutData'
import { useSupabase } from './hooks/useSupabase'
import { useTimer } from './hooks/useTimer'
import { useToast } from './hooks/useToast'
import type { ExportFormat } from './components/analytics/ExportBar'

export default function App() {
  const [dayName, setDayName] = useState('Chest')
  const [activeDayId, setActiveDayId] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [analyticsOpen, setAnalyticsOpen] = useState(false)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [roadmapOpen, setRoadmapOpen] = useState(false)
  const [quoteIndex, setQuoteIndex] = useState(0)
  const [savedExercises, setSavedExercises] = useState<Set<string>>(new Set())
  const [savingExercise, setSavingExercise] = useState<string | null>(null)
  const [prefillKey, setPrefillKey] = useState(0)
  const [expandSignal, setExpandSignal] = useState(0)
  const [expandMode, setExpandMode] = useState<'expand' | 'collapse'>('expand')
  const [exporting, setExporting] = useState(false)

  const { toast, show } = useToast()
  const timer = useTimer()
  const cloud = useSupabase()
  const workout = useWorkoutData(activeDayId, dayName)

  const activeDay = workout.activeDay
  const sectionName = workout.sectionName
  const planExercises = activeDay?.exercises ?? []
  const mergedLastSession = useMemo(
    () => mergeSessionsForPrefill(workout.sessions),
    [workout.sessions],
  )
  const previousSession = useMemo(
    () => mergePreviousSessionForPrefill(workout.sessions),
    [workout.sessions],
  )
  const cardioMode = isCardioSection(sectionName)
  const collapsedSessions = useMemo(
    () => collapseSessionsByDay(workout.sessions),
    [workout.sessions],
  )
  const todaySessions = useMemo(
    () => sessionsTodayOnly(workout.sessions),
    [workout.sessions],
  )
  const todayStats = useMemo(
    () => calculateDayStats(todaySessions, { cardio: cardioMode }),
    [todaySessions, cardioMode],
  )
  const allTimeStats = useMemo(
    () => calculateDayStats(collapsedSessions, { cardio: cardioMode }),
    [collapsedSessions, cardioMode],
  )
  const loggedToday = useMemo(
    () => exercisesLoggedToday(workout.sessions),
    [workout.sessions],
  )
  const savedCount = useMemo(() => {
    if (planExercises.length === 0) return 0
    let n = 0
    for (const ex of planExercises) {
      if (savedExercises.has(ex.name) || loggedToday.has(ex.name)) n++
    }
    return n
  }, [planExercises, savedExercises, loggedToday])

  const sectionRecords = useMemo(() => {
    const names = new Set(planExercises.map((e) => e.name.toLowerCase()))
    if (names.size === 0) return workout.records
    return workout.records.filter((r) => names.has(r.exercise.toLowerCase()))
  }, [planExercises, workout.records])

  const trainingStreak = useMemo(
    () => computeTrainingStreak(workout.trainingCalendarDates).current,
    [workout.trainingCalendarDates],
  )

  const { syncMessage, clearSyncMessage } = workout

  useEffect(() => {
    if (!syncMessage) return
    show(syncMessage, 'success')
    clearSyncMessage()
  }, [syncMessage, clearSyncMessage, show])

  useEffect(() => {
    if (workout.plan.days.length === 0) return
    const match = workout.plan.days.find((d) => d.id === activeDayId || d.name === dayName)
    if (!match) {
      const first = workout.plan.days[0]
      setActiveDayId(first.id)
      setDayName(first.name)
    } else if (!activeDayId) {
      setActiveDayId(match.id)
    }
  }, [workout.plan.days, activeDayId, dayName])

  useEffect(() => {
    if (workout.sessionsLoading) return
    setSavedExercises((prev) => {
      const next = new Set(prev)
      loggedToday.forEach((n) => next.add(n))
      return next
    })
  }, [activeDayId, loggedToday, workout.sessionsLoading])

  const selectDay = useCallback((id: string, name: string) => {
    setActiveDayId(id)
    setDayName(name)
    setSavedExercises(new Set())
    setQuoteIndex((i) => i + 1)
    setPrefillKey((k) => k + 1)
  }, [])

  const saveExercise = useCallback(
    async (exerciseName: string, sets: SetEntry[]) => {
      timer.startWorkout()
      setSavingExercise(exerciseName)
      try {
        const result = await workout.saveExercise(exerciseName, sets)
        setSavedExercises((prev) => new Set(prev).add(exerciseName))
        const comparison = compareToLast(
          exerciseName,
          sets.map((s) => s.weight),
          previousSession?.exercises[exerciseName],
          previousSession?.exerciseSets?.[exerciseName],
          { cardio: cardioMode },
        )
        const time = new Date().toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })
        show(
          result.prHit && result.prMessage
            ? `${result.prMessage} · ${time}`
            : cardioMode
              ? `Saved ${time} ${comparison}`.trim()
              : `Saved ${time} ${comparison}`.trim(),
          'success',
        )
      } catch (e) {
        show(e instanceof Error ? e.message : 'Save failed', 'error')
        throw e
      } finally {
        setSavingExercise(null)
      }
    },
    [cardioMode, previousSession, show, timer, workout],
  )

  const handleInitPlan = async () => {
    try {
      const plan = await workout.resetPlan()
      const first = plan.days[0]
      if (first) selectDay(first.id, first.name)
      show(`Loaded ${plan.days.length} sections from library`, 'success')
    } catch (e) {
      show(e instanceof Error ? e.message : 'Setup failed', 'error')
    }
  }

  const handleExport = useCallback(
    async (format: ExportFormat) => {
      setExporting(true)
      try {
        const {
          buildGymBroExport,
          downloadTextFile,
          exportBundleToJson,
          exportBundleToSetsCsv,
          exportRecordsToCsv,
        } = await import('./lib/exportReport')
        const bundle = await buildGymBroExport(
          workout.plan,
          workout.records,
          workout.sessions,
          sectionName,
        )
        const stamp = new Date().toISOString().slice(0, 10)
        if (format === 'json') {
          downloadTextFile(
            exportBundleToJson(bundle),
            `gymbro-backup-${stamp}.json`,
            'application/json',
          )
          show(
            `Exported ${bundle.totals.sectionCount} sections · ${bundle.totals.sessionDays} session days`,
            'success',
          )
        } else if (format === 'csv-sets') {
          downloadTextFile(
            exportBundleToSetsCsv(bundle),
            `gymbro-sets-${stamp}.csv`,
            'text/csv',
          )
          show(`Sets CSV exported (${bundle.totals.totalSets} sets)`, 'success')
        } else {
          downloadTextFile(
            exportRecordsToCsv(bundle.personalRecords),
            `gymbro-prs-${stamp}.csv`,
            'text/csv',
          )
          show(`PRs CSV exported (${bundle.personalRecords.length} records)`, 'success')
        }
      } catch (e) {
        show(e instanceof Error ? e.message : 'Export failed', 'error')
      } finally {
        setExporting(false)
      }
    },
    [workout.plan, workout.records, workout.sessions, sectionName, show],
  )

  const handleFinishWorkout = async () => {
    if (savedCount === 0) {
      show('Log at least one exercise before finishing', 'error')
      return
    }
    const unit = cardioMode ? 'intervals' : 'exercises'
    try {
      const finished = await workout.finishWorkout()
      if (!finished) {
        show(
          workout.dataSource === 'supabase'
            ? 'No session found for today — save at least one set before finishing'
            : 'Cloud sync is off — finish was not saved to the server',
          'error',
        )
        return
      }
      if (savedCount >= planExercises.length) {
        show(`🎉 ${sectionName} complete — all ${planExercises.length} ${unit} logged!`, 'success')
      } else {
        show(
          `${sectionName} wrapped — ${savedCount}/${planExercises.length} ${unit} saved today`,
          'success',
        )
      }
    } catch (e) {
      show(e instanceof Error ? e.message : 'Could not finish workout', 'error')
    }
  }

  const dataSourceLabel =
    workout.dataSource === 'supabase'
      ? 'Cloud sync on'
      : workout.dataSource === 'loading'
        ? 'Connecting…'
        : workout.dataSource === 'local'
          ? 'Local save (sync when online)'
          : 'Offline'

  const hasPlan = !workout.isInitialLoading && workout.plan.days.length > 0

  return (
    <div className="page-shell">
      <Header quoteIndex={quoteIndex} />

      <StatusStrip
        dataLabel={dataSourceLabel}
        libraryExercises={workout.libraryStats.exercises}
        libraryMuscles={workout.libraryStats.muscles}
        sectionCount={workout.plan.days.length}
        activeSection={hasPlan ? sectionName : undefined}
        activeExerciseCount={planExercises.length}
        emptySections={workout.emptySectionCount}
        prCount={workout.records.length}
        trainingDays={workout.trainingDays}
        trainingStreak={trainingStreak}
        savedTodayCount={savedCount}
        totalPlanExercises={planExercises.length}
      />

      {hasPlan &&
        planExercises.length > 0 &&
        !sessionsLookCorrupt(workout.sessions) &&
        allTimeStats.totalSessions === 0 &&
        !workout.sessions.some(sessionHasLoggedExercises) && (
          <div className="glass-panel mb-4 border-emerald-500/20 bg-emerald-950/20 px-4 py-3.5 text-sm text-slate-300">
            <p>
              <span className="font-medium text-slate-200">Getting started on {sectionName}:</span>{' '}
              expand any exercise below, enter your sets, and tap <span className="text-emerald-400">Save</span>.
              Stats and streaks update automatically.
            </p>
          </div>
        )}

      {sessionsLookCorrupt(workout.sessions) && (
        <DataRepairBanner
          sectionName={sectionName}
          repairing={workout.repairing}
          hasLocalBackup={hasLocalWorkoutData()}
          onRepair={async () => {
            try {
              const report = await workout.repairIntegrity(sectionName)
              show(report.message, report.ok ? 'success' : 'error')
            } catch (e) {
              show(e instanceof Error ? e.message : 'Repair failed', 'error')
            }
          }}
        />
      )}

      {workout.error && workout.plan.days.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-900/50 bg-red-950/40 px-4 py-2 text-sm text-red-300">
          <p className="min-w-0 flex-1">{workout.error}</p>
          <button
            type="button"
            className="btn-secondary shrink-0 py-1.5 text-xs"
            onClick={() => void workout.refresh()}
          >
            Retry connection
          </button>
        </div>
      )}

      {workout.isInitialLoading && <LoadingSkeleton lines={4} />}

      {!workout.isInitialLoading && workout.plan.days.length === 0 && (
        <SetupBanner
          loading={workout.busy}
          error={workout.error}
          errorCode={workout.errorCode}
          libraryExercises={workout.libraryStats.exercises}
          libraryMuscles={workout.libraryStats.muscles}
          onInitialize={handleInitPlan}
          onRetry={() => void workout.refresh()}
        />
      )}

      {hasPlan && activeDay && (
        <DayManager
          days={workout.plan.days}
          activeDayId={activeDayId || activeDay.id}
          activeDayName={sectionName}
          resetting={workout.busy}
          onSelectDay={selectDay}
          onAddDay={async (name) => {
            try {
              const d = await workout.addDay(name)
              selectDay(d.id, d.name)
              show(`Section "${name}" created`, 'success')
            } catch (e) {
              show(e instanceof Error ? e.message : 'Failed', 'error')
            }
          }}
          onRenameDay={async (id, name) => {
            try {
              await workout.renameDay(id, name)
              setDayName(name)
              show('Section renamed', 'success')
            } catch (e) {
              show(e instanceof Error ? e.message : 'Failed', 'error')
            }
          }}
          onDeleteDay={async (id) => {
            try {
              const first = await workout.removeDay(id)
              if (first) selectDay(first.id, first.name)
              show('Section deleted', 'success')
            } catch (e) {
              show(e instanceof Error ? e.message : 'Failed', 'error')
            }
          }}
          onResetPlan={async () => {
            if (
              !window.confirm(
                'Replace your program with the default 14 sections?\n\nSaved workout history and PRs are kept — only the exercise list per section changes.',
              )
            ) {
              return
            }
            await handleInitPlan()
          }}
          onRepairEmpty={async () => {
            try {
              await workout.repairEmpty()
              show('Empty sections filled from library', 'success')
            } catch (e) {
              show(e instanceof Error ? e.message : 'Repair failed', 'error')
            }
          }}
          repairing={workout.busy}
        />
      )}

      {hasPlan && (
        <>
          {planExercises.length === 0 ? (
            <SectionStatsBar
              sectionName={sectionName}
              cardioMode={cardioMode}
              totalSessions={allTimeStats.totalSessions}
              avgWeight={allTimeStats.avgWeight}
              totalVolume={allTimeStats.totalVolume}
              improvement={allTimeStats.improvement}
              savedCount={savedCount}
              totalExercises={0}
              onOpenAnalytics={() => setAnalyticsOpen(true)}
            />
          ) : (
            <SectionHero
              sectionName={sectionName}
              exerciseCount={planExercises.length}
              savedCount={savedCount}
            />
          )}

          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button type="button" onClick={() => setLibraryOpen(true)} className="btn-primary w-full sm:w-auto">
              + From library ({workout.libraryStats.exercises || '…'})
            </button>
            {mergedLastSession && (
              <button
                type="button"
                onClick={() => {
                  setPrefillKey((k) => k + 1)
                  show(
                    cardioMode
                      ? 'Last cardio durations loaded'
                      : 'Last workout weights loaded',
                    'info',
                  )
                }}
                className="btn-secondary"
              >
                Load last session
              </button>
            )}
            {planExercises.length > 0 && (
              <button
                type="button"
                onClick={handleFinishWorkout}
                className="btn-secondary lg:hidden"
              >
                Finish workout
              </button>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_min(360px,32%)] lg:items-start lg:gap-8">
            <main className="relative space-y-4" key={`${activeDayId}-${prefillKey}`}>
              {workout.sessionsLoading && (
                <div className="pointer-events-none absolute inset-0 z-10 flex items-start justify-center rounded-2xl bg-slate-950/50 pt-12 backdrop-blur-[2px]">
                  <span className="glass-panel px-4 py-2 text-sm text-slate-300">
                    Loading {sectionName}…
                  </span>
                </div>
              )}
              {planExercises.length === 0 ? (
                <div className="glass-panel border-dashed border-amber-800/40 bg-amber-950/10 py-14 text-center">
                  <p className="text-4xl">📋</p>
                  <p className="mt-3 text-slate-300">No exercises in “{sectionName}”</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Pick from the library or add a custom name
                  </p>
                  <button
                    type="button"
                    onClick={() => setLibraryOpen(true)}
                    className="btn-primary mt-5"
                  >
                    Browse library
                  </button>
                </div>
              ) : (
                <>
                  <ExerciseListToolbar
                    exerciseCount={planExercises.length}
                    savedCount={savedCount}
                    onExpandAll={() => {
                      setExpandMode('expand')
                      setExpandSignal((n) => n + 1)
                    }}
                    onCollapseAll={() => {
                      setExpandMode('collapse')
                      setExpandSignal((n) => n + 1)
                    }}
                  />
                  {planExercises.map((ex, index) => (
                    <ExerciseCard
                      key={ex.id}
                      planExerciseId={ex.id}
                      name={ex.name}
                      logMode={cardioMode ? 'cardio' : 'strength'}
                      expandSignal={expandSignal}
                      expandMode={expandMode}
                      lastSets={mergedLastSession?.exercises[ex.name]}
                      lastEntries={mergedLastSession?.exerciseSets?.[ex.name]}
                      saved={savedExercises.has(ex.name) || loggedToday.has(ex.name)}
                      saving={savingExercise === ex.name}
                      canMoveUp={index > 0}
                      canMoveDown={index < planExercises.length - 1}
                      onMoveUp={async () => {
                        try {
                          await workout.moveExercise(ex.id, 'up')
                        } catch (e) {
                          show(e instanceof Error ? e.message : 'Reorder failed', 'error')
                        }
                      }}
                      onMoveDown={async () => {
                        try {
                          await workout.moveExercise(ex.id, 'down')
                        } catch (e) {
                          show(e instanceof Error ? e.message : 'Reorder failed', 'error')
                        }
                      }}
                      onSave={(sets) => saveExercise(ex.name, sets)}
                      onRename={async (n) => {
                        try {
                          const prev = ex.name
                          await workout.renameExercise(ex.id, n)
                          setSavedExercises((saved) => {
                            if (!saved.has(prev)) return saved
                            const next = new Set(saved)
                            next.delete(prev)
                            next.add(n)
                            return next
                          })
                          show('Exercise renamed', 'success')
                        } catch (e) {
                          show(e instanceof Error ? e.message : 'Rename failed', 'error')
                        }
                      }}
                      onRemove={async () => {
                        try {
                          await workout.removeExercise(ex.id)
                          setSavedExercises((prev) => {
                            const next = new Set(prev)
                            next.delete(ex.name)
                            return next
                          })
                          show('Exercise removed', 'success')
                        } catch (e) {
                          show(e instanceof Error ? e.message : 'Remove failed', 'error')
                        }
                      }}
                      onError={(msg) => show(msg, 'error')}
                      onStartRest={(sec) => timer.startRest(sec)}
                    />
                  ))}
                </>
              )}
              <QuickAddExercise
                onAdd={async (name) => {
                  try {
                    await workout.addExerciseToActiveDay(name)
                    show(`Added ${name}`, 'success')
                  } catch (e) {
                    show(e instanceof Error ? e.message : 'Failed', 'error')
                  }
                }}
              />
            </main>

            <aside className="hidden lg:block">
              <div className="sticky top-6 space-y-4">
                <div className="glass-panel-strong p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Today · {sectionName}
                  </p>
                  {savedCount === 0 && (
                    <p className="mt-2 text-xs text-slate-500">
                      Save an exercise below to start tracking today.
                    </p>
                  )}
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <MiniStat
                      label="Sets logged"
                      value={String(todayStats.setCount)}
                    />
                    <MiniStat
                      label={cardioMode ? 'Avg min/set' : 'Avg kg/set'}
                      value={todayStats.setCount > 0 ? String(todayStats.avgWeight) : '—'}
                    />
                    <MiniStat
                      label={cardioMode ? 'Minutes' : 'Volume'}
                      value={
                        todayStats.setCount > 0
                          ? todayStats.totalVolume.toLocaleString()
                          : '—'
                      }
                      sub={cardioMode || todayStats.setCount === 0 ? '' : 'kg'}
                    />
                    <MiniStat
                      label="Exercises"
                      value={`${savedCount}/${planExercises.length}`}
                    />
                  </div>
                  <p className="mt-3 text-xs text-slate-600">
                    {workout.trainingDays > 0 && (
                      <span>
                        {workout.trainingDays} training day
                        {workout.trainingDays !== 1 ? 's' : ''} logged
                      </span>
                    )}
                    {allTimeStats.totalSessions > 0 && (
                      <span>
                        {workout.trainingDays > 0 ? ' · ' : ''}
                        {allTimeStats.totalSessions} day
                        {allTimeStats.totalSessions !== 1 ? 's' : ''} with logged work on {sectionName}
                        {!cardioMode && allTimeStats.improvement !== null && (
                          <>
                            {' '}
                            ·{' '}
                            <span
                              className={
                                allTimeStats.improvement >= 0
                                  ? 'text-emerald-500'
                                  : 'text-amber-500'
                              }
                            >
                              {allTimeStats.improvement > 0 ? '+' : ''}
                              {allTimeStats.improvement}% vs first
                            </span>
                          </>
                        )}
                      </span>
                    )}
                  </p>
                  {savedCount > 0 && savedCount < planExercises.length && (
                    <p className="mt-3 text-center text-xs text-amber-400/90">
                      {planExercises.length - savedCount} left to log today
                    </p>
                  )}
                  {savedCount === planExercises.length && planExercises.length > 0 && (
                    <p className="mt-3 text-center text-xs font-medium text-emerald-400">
                      ✓ Section complete for today
                    </p>
                  )}
                  <button
                    type="button"
                    disabled={workout.sessionsLoading}
                    onClick={() => setAnalyticsOpen(true)}
                    className="btn-primary mt-4 w-full disabled:opacity-60"
                  >
                    {workout.sessionsLoading ? 'Loading stats…' : 'Open analytics'}
                  </button>
                  <button
                    type="button"
                    onClick={handleFinishWorkout}
                    className="btn-secondary mt-2 w-full"
                  >
                    Finish workout
                  </button>
                </div>
                {sectionRecords.length > 0 && (
                  <div className="glass-panel p-4">
                    <p className="text-xs font-semibold text-slate-500">
                      Top PRs · {sectionName}
                    </p>
                    <ul className="mt-2 space-y-1 text-sm">
                      {sectionRecords.slice(0, 3).map((r) => (
                        <li key={r.exercise} className="flex justify-between text-slate-300">
                          <span className="truncate">{r.exercise}</span>
                          <span className="text-emerald-400">
                            {formatPrWeight(r.weight, r.reps)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </aside>
          </div>
        </>
      )}

      {hasPlan && planExercises.length > 0 && (
        <WorkoutDock
          sectionName={sectionName}
          savedCount={savedCount}
          totalExercises={planExercises.length}
          workoutTime={timer.workoutLabel}
          restTime={timer.restLabel}
          isResting={timer.isResting}
          onFinish={handleFinishWorkout}
          onAddExercise={() => setLibraryOpen(true)}
          onOpenAnalytics={() => setAnalyticsOpen(true)}
        />
      )}

      <Sidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((v) => !v)}
        currentDay={sectionName}
        exerciseCount={planExercises.length}
        workoutTime={timer.workoutLabel}
        restTime={timer.restLabel}
        isResting={timer.isResting}
        cloudStatus={cloud.status}
        cloudMessage={cloud.message}
        cloudSyncing={cloud.syncing}
        onSyncCloud={async () => {
          const r = await cloud.syncToCloud()
          show(r.message, r.ok ? 'success' : 'error')
          await workout.refresh()
          try {
            const report = await workout.repairIntegrity(sectionName)
            if (report.localSynced > 0 || report.zombiesRemoved > 0) {
              show(report.message, report.ok ? 'success' : 'info')
            }
          } catch {
            /* refresh already surfaced error */
          }
        }}
        onStartRest={() => timer.startRest(90)}
        onStopRest={timer.stopRest}
        onLoadLast={() => {
          if (!mergedLastSession) {
            show('No sessions yet for this section', 'error')
            return
          }
          setPrefillKey((k) => k + 1)
          show('Loaded from your recent sessions', 'info')
        }}
        onReset={() => {
          if (
            !window.confirm(
              'Clear all saved workouts and PRs from cloud? Your program stays intact.',
            )
          ) {
            return
          }
          void workout
            .resetAll()
            .then(() => {
              setSavedExercises(new Set())
              show('Workout history cleared', 'success')
            })
            .catch((e) =>
              show(e instanceof Error ? e.message : 'Reset failed', 'error'),
            )
        }}
        onAnalytics={() => {
          setAnalyticsOpen(true)
          setSidebarOpen(false)
        }}
        onExport={(format) => {
          void handleExport(format)
        }}
        onAddExercise={() => setLibraryOpen(true)}
        onBrowseLibrary={() => setLibraryOpen(true)}
        onOpenRoadmap={() => {
          setRoadmapOpen(true)
          setSidebarOpen(false)
        }}
        trainingCalendarDates={workout.trainingCalendarDates}
      />

      <ProgressModal
        open={analyticsOpen}
        onClose={() => setAnalyticsOpen(false)}
        day={sectionName}
        sessions={workout.sessions}
        sessionsLoading={workout.sessionsLoading}
        cloudRecords={workout.records}
        sectionExerciseNames={planExercises.map((e) => e.name)}
        savedTodayCount={savedCount}
        onReloadSessions={workout.reloadSessions}
        onExport={handleExport}
        exporting={exporting}
        trainingCalendarDates={workout.trainingCalendarDates}
      />

      <ExerciseLibraryModal
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        sectionLabel={sectionName}
        existingNames={planExercises.map((e) => e.name)}
        onPick={async (name, _mg, exerciseId) => {
          try {
            await workout.addExerciseToActiveDay(name, exerciseId)
            show(`Added ${name} to ${sectionName}`, 'success')
          } catch (e) {
            show(e instanceof Error ? e.message : 'Failed', 'error')
          }
        }}
      />

      <FeatureExplorer open={roadmapOpen} onClose={() => setRoadmapOpen(false)} />

      {toast && <Toast message={toast.message} tone={toast.tone} />}
    </div>
  )
}

function formatPrWeight(weight: number, reps?: number): string {
  if (reps && reps > 1) return `${weight} kg × ${reps}`
  return `${weight} kg`
}

function MiniStat({
  label,
  value,
  sub,
}: {
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-950/50 p-3 ring-1 ring-white/5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums text-white">
        {value}
        {sub ? <span className="ml-1 text-xs text-slate-500">{sub}</span> : null}
      </p>
    </div>
  )
}
