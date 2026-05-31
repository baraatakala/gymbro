import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Modal } from '../ui/Modal'
import {
  calculateDayStats,
  filterRecordsForSection,
  getExerciseTrend,
  getSectionVolumeTrend,
  mergePersonalRecordSources,
  sortPersonalRecords,
  type RecordSortKey,
  type TrendMetric,
} from '../../lib/analytics'
import { generateInsights } from '../../lib/progressInsights'
import { collapseSessionsByDay, sessionsHaveLoggedData, sessionsTodayOnly } from '../../lib/sessionMerge'
import { isCardioSection } from '../../lib/sectionUtils'
import { DEFAULT_REPS_PER_SET, type PersonalRecord, type WorkoutSession } from '../../types/workout'
import { ExportBar, type ExportFormat } from './ExportBar'
import { TrainingCalendar } from './TrainingCalendar'

const ProgressTrendChart = lazy(() => import('./ProgressTrendChart'))

type Tab = 'overview' | 'trends' | 'records' | 'insights'

interface ProgressModalProps {
  open: boolean
  onClose: () => void
  day: string
  sessions: WorkoutSession[]
  sessionsLoading?: boolean
  cloudRecords?: PersonalRecord[]
  sectionExerciseNames?: string[]
  savedTodayCount?: number
  onReloadSessions?: () => Promise<void>
  onExport?: (format: ExportFormat) => void
  exporting?: boolean
  trainingCalendarDates?: string[]
  onOpenHabits?: () => void
}

export function ProgressModal({
  open,
  onClose,
  day,
  sessions,
  sessionsLoading: _sessionsLoading = false,
  cloudRecords = [],
  sectionExerciseNames = [],
  savedTodayCount = 0,
  onReloadSessions,
  onExport,
  exporting = false,
  trainingCalendarDates = [],
  onOpenHabits,
}: ProgressModalProps) {
  const [tab, setTab] = useState<Tab>('overview')
  const [refreshing, setRefreshing] = useState(false)
  const reloadAttemptedRef = useRef<string | null>(null)
  const sessionSnapshotRef = useRef({ length: 0, hasData: false })
  const cardio = isCardioSection(day)

  const collapsedSessions = useMemo(() => collapseSessionsByDay(sessions), [sessions])
  const todaySessions = useMemo(() => sessionsTodayOnly(sessions), [sessions])

  const displaySessions = collapsedSessions

  const hasSessionData = sessionsHaveLoggedData(sessions)
  sessionSnapshotRef.current = {
    length: sessions.length,
    hasData: hasSessionData,
  }
  // Only show spinner during this modal's own reload — not parent section overlay loading
  const loading = refreshing

  const todayStats = useMemo(
    () => calculateDayStats(todaySessions, { cardio }),
    [todaySessions, cardio],
  )
  const stats = useMemo(
    () => calculateDayStats(collapsedSessions, { cardio }),
    [collapsedSessions, cardio],
  )
  const [recordSort, setRecordSort] = useState<RecordSortKey>('weight')
  const [recordFilter, setRecordFilter] = useState('')
  const [trendMetric, setTrendMetric] = useState<TrendMetric>(cardio ? 'avg' : 'max')
  const [trendScope, setTrendScope] = useState<'exercise' | 'section'>('exercise')

  const mergedRecords = useMemo(
    () => mergePersonalRecordSources(cloudRecords, collapsedSessions),
    [cloudRecords, collapsedSessions],
  )

  const sectionRecords = useMemo(
    () => filterRecordsForSection(mergedRecords, sectionExerciseNames),
    [mergedRecords, sectionExerciseNames],
  )

  const records = useMemo(() => {
    const sorted = sortPersonalRecords(sectionRecords, recordSort)
    const q = recordFilter.trim().toLowerCase()
    if (!q) return sorted
    return sorted.filter((r) => r.exercise.toLowerCase().includes(q))
  }, [sectionRecords, recordSort, recordFilter])

  const otherSectionRecords = useMemo(() => {
    if (sectionExerciseNames.length === 0) return []
    const names = new Set(sectionExerciseNames.map((n) => n.toLowerCase()))
    return mergedRecords.filter((r) => !names.has(r.exercise.toLowerCase()))
  }, [mergedRecords, sectionExerciseNames])

  const insights = useMemo(() => {
    if (!open || tab !== 'insights') return []
    return generateInsights(collapsedSessions, {
      cardio,
      savedToday: savedTodayCount,
      totalExercises: sectionExerciseNames.length,
      sectionExerciseNames,
      sectionLabel: day,
      cloudRecords,
    })
  }, [open, tab, collapsedSessions, cardio, savedTodayCount, sectionExerciseNames, day, cloudRecords])

  useEffect(() => {
    if (!open) {
      reloadAttemptedRef.current = null
      return
    }
    setTab('overview')
    if (!onReloadSessions) return

    const { length: sessionCount, hasData } = sessionSnapshotRef.current
    if (sessionCount > 0 && hasData) return

    const reloadKey = `${day}:${sessionCount}:${hasData}`
    if (reloadAttemptedRef.current === reloadKey) return
    reloadAttemptedRef.current = reloadKey

    let cancelled = false
    void (async () => {
      setRefreshing(true)
      try {
        await onReloadSessions()
      } finally {
        if (!cancelled) setRefreshing(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [open, day, onReloadSessions])

  const exerciseNames = useMemo(() => {
    const names = new Set<string>()
    for (const s of sessions) {
      Object.keys(s.exercises ?? {}).forEach((e) => names.add(e))
      if (s.exerciseSets) Object.keys(s.exerciseSets).forEach((e) => names.add(e))
    }
    if (names.size === 0 && sectionExerciseNames.length > 0) {
      sectionExerciseNames.forEach((n) => names.add(n))
    }
    return [...names].sort()
  }, [sessions, sectionExerciseNames])

  const [chartExercise, setChartExercise] = useState('')
  const activeExercise = chartExercise || exerciseNames[0] || ''

  useEffect(() => {
    setTrendMetric(cardio ? 'avg' : 'max')
  }, [cardio, day])

  const exerciseTrend = useMemo(() => {
    if (!activeExercise || tab !== 'trends' || trendScope !== 'exercise') return []
    return getExerciseTrend(collapsedSessions, activeExercise, { cardio, metric: trendMetric })
  }, [collapsedSessions, activeExercise, tab, trendScope, cardio, trendMetric])

  const sectionVolumeTrend = useMemo(() => {
    if (tab !== 'trends' || trendScope !== 'section' || cardio) return []
    return getSectionVolumeTrend(collapsedSessions)
  }, [collapsedSessions, tab, trendScope, cardio])

  const trendChart = trendScope === 'section' ? sectionVolumeTrend : exerciseTrend
  const trendChartLabel =
    trendScope === 'section'
      ? `${day} total volume (kg)`
      : `${activeExercise} — ${
          trendMetric === 'max' ? 'best set' : trendMetric === 'volume' ? 'volume' : 'avg'
        } (${cardio ? 'min' : 'kg'})`

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'trends', label: 'Trends' },
    { id: 'records', label: 'Records' },
    { id: 'insights', label: 'Insights' },
  ]

  const formatRecordWeight = (weight: number, setLabel: string) => {
    if (cardio) return `${weight} min`
    if (setLabel.includes('reps')) return `${weight} kg`
    return `${weight} kg`
  }

  return (
    <Modal open={open} onClose={onClose} title={`${day} — Progress`} wide>
      {onOpenHabits && (
        <p className="mb-4 text-sm text-slate-500">
          Section stats below. For gym visits, streaks, and time in gym across all days, open{' '}
          <button
            type="button"
            onClick={onOpenHabits}
            className="font-medium text-cyan-400 underline hover:text-cyan-300"
          >
            Training habits & attendance
          </button>
          .
        </p>
      )}
      <div className="mb-5 flex gap-1 overflow-x-auto rounded-xl bg-slate-950 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === t.id
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-700 py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <p className="text-sm text-slate-400">Loading {day} stats…</p>
        </div>
      ) : (
        <>
          {!hasSessionData && tab !== 'records' && (
            <div className="mb-6 rounded-xl border border-dashed border-slate-700 bg-slate-950/50 px-6 py-10 text-center">
              <p className="text-3xl">📊</p>
              <p className="mt-3 font-medium text-slate-200">
                {savedTodayCount > 0
                  ? `${savedTodayCount} exercise${savedTodayCount !== 1 ? 's' : ''} saved today — loading history…`
                  : `No workouts logged for ${day} yet`}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                {savedTodayCount > 0 ? (
                  <>
                    If stats stay empty, use <span className="text-emerald-400">Retry connection</span>{' '}
                    on the main screen or sidebar <span className="text-emerald-400">Sync all to cloud</span>.
                  </>
                ) : (
                  <>
                    Expand an exercise below, enter your sets, and tap{' '}
                    <span className="text-emerald-400">Save</span>. Stats and trends appear here
                    after your first save.
                  </>
                )}
              </p>
              {records.length > 0 && (
                <p className="mt-3 text-xs text-slate-500">
                  You have {records.length} personal record{records.length !== 1 ? 's' : ''} on{' '}
                  {day} — open the{' '}
                  <button type="button" className="text-emerald-400 underline" onClick={() => setTab('records')}>Records</button> tab.
                </p>
              )}
              {records.length === 0 && otherSectionRecords.length > 0 && (
                <p className="mt-3 text-xs text-slate-500">
                  You have {otherSectionRecords.length} PR
                  {otherSectionRecords.length !== 1 ? 's' : ''} on other sections (e.g.{' '}
                  {otherSectionRecords[0]?.exercise}
                  ) — not shown here. Open that section&apos;s progress for details.
                </p>
              )}
            </div>
          )}

          {(hasSessionData || tab === 'records' || tab === 'insights') && (
            <>
              {tab === 'overview' && hasSessionData && (
                <div className="space-y-6">
                  {todayStats.setCount > 0 && (
                    <>
                      <p className="text-xs font-semibold uppercase tracking-wider text-emerald-500/90">
                        Today
                      </p>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <StatCard label="Sets" value={String(todayStats.setCount)} />
                        <StatCard
                          label={cardio ? 'Avg duration' : 'Avg weight'}
                          value={cardio ? `${todayStats.avgWeight} min` : `${todayStats.avgWeight} kg`}
                        />
                        <StatCard
                          label={cardio ? 'Minutes' : 'Volume'}
                          value={
                            cardio
                              ? `${todayStats.totalVolume.toLocaleString()} min`
                              : `${todayStats.totalVolume.toLocaleString()} kg`
                          }
                        />
                      </div>
                    </>
                  )}
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    All time · {day}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard label="Session days" value={String(stats.totalSessions)} />
                    <StatCard
                      label={cardio ? 'Avg duration' : 'Avg weight'}
                      value={cardio ? `${stats.avgWeight} min` : `${stats.avgWeight} kg`}
                    />
                    <StatCard
                      label={cardio ? 'Total minutes' : 'Total volume'}
                      value={
                        cardio
                          ? `${stats.totalVolume.toLocaleString()} min`
                          : `${stats.totalVolume.toLocaleString()} kg`
                      }
                      hint={cardio ? undefined : `${DEFAULT_REPS_PER_SET} reps/set`}
                    />
                    <StatCard
                      label="Improvement"
                      value={
                        cardio || stats.improvement === null
                          ? '—'
                          : `${stats.improvement > 0 ? '+' : ''}${stats.improvement}%`
                      }
                      hint={cardio ? undefined : 'First vs latest session'}
                    />
                  </div>

                  <section>
                    <h3 className="mb-3 text-sm font-semibold text-slate-300">Recent sessions</h3>
                    <ul className="space-y-2">
                      {displaySessions.slice(0, 8).map((s) => (
                        <li
                          key={s.id ?? s.key}
                          className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3 text-sm"
                        >
                          <span className="text-slate-300">
                            {s.saveDate ?? new Date(s.timestamp).toLocaleDateString('en-GB')}
                            {s.saveTime && ` · ${s.saveTime}`}
                          </span>
                          <span className="text-slate-500">
                            {countLoggedExercises(s)} exercise
                            {countLoggedExercises(s) !== 1 ? 's' : ''}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>

                  <TrainingCalendar trainedDates={trainingCalendarDates} />
                </div>
              )}

              {tab === 'overview' && !hasSessionData && trainingCalendarDates.length > 0 && (
                <div className="mt-6">
                  <TrainingCalendar trainedDates={trainingCalendarDates} />
                </div>
              )}

              {tab === 'trends' && (
                <div className="space-y-4">
                  {!hasSessionData ? (
                    <p className="text-center text-sm text-slate-500">
                      Log at least one workout on {day} to see trends.
                    </p>
                  ) : exerciseNames.length > 0 || trendScope === 'section' ? (
                    <>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setTrendScope('exercise')}
                          className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                            trendScope === 'exercise'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          Per exercise
                        </button>
                        {!cardio && (
                          <button
                            type="button"
                            onClick={() => setTrendScope('section')}
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                              trendScope === 'section'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            Section volume
                          </button>
                        )}
                      </div>
                      {trendScope === 'exercise' && (
                        <>
                          <label className="block text-sm text-slate-400">
                            Exercise
                            <select
                              value={activeExercise}
                              onChange={(e) => setChartExercise(e.target.value)}
                              className="input-field mt-1 w-full py-2 text-sm"
                            >
                              {exerciseNames.map((name) => (
                                <option key={name} value={name}>
                                  {name}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="block text-sm text-slate-400">
                            Metric
                            <select
                              value={trendMetric}
                              onChange={(e) => setTrendMetric(e.target.value as TrendMetric)}
                              className="input-field mt-1 w-full py-2 text-sm"
                            >
                              <option value="max">
                                {cardio ? 'Longest (max min)' : 'Heaviest set (max kg)'}
                              </option>
                              <option value="avg">
                                {cardio ? 'Average minutes' : 'Average weight'}
                              </option>
                              {!cardio && <option value="volume">Set volume (kg)</option>}
                            </select>
                          </label>
                        </>
                      )}
                      {trendChart.length >= 2 ? (
                        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                          <Suspense
                            fallback={
                              <p className="py-8 text-center text-sm text-slate-500">
                                Loading chart…
                              </p>
                            }
                          >
                            <ProgressTrendChart
                              labels={trendChart.map((t) => t.date)}
                              values={trendChart.map((t) =>
                                trendScope === 'section'
                                  ? (t as { volume: number }).volume
                                  : (t as { value: number }).value,
                              )}
                              datasetLabel={trendChartLabel}
                            />
                          </Suspense>
                        </div>
                      ) : trendChart.length === 1 ? (
                        <div className="rounded-xl border border-slate-800 bg-slate-950/50 px-6 py-8 text-center">
                          <p className="text-3xl font-bold text-emerald-400">
                            {trendScope === 'section'
                              ? (trendChart[0] as { volume: number }).volume
                              : (trendChart[0] as { value: number }).value}{' '}
                            {trendScope === 'section' || trendMetric === 'volume' ? 'kg' : cardio ? 'min' : 'kg'}
                          </p>
                          <p className="mt-2 text-sm text-slate-400">{trendChart[0].date}</p>
                          <p className="mt-3 text-xs text-slate-500">
                            One session day logged. Train again on another day to see a trend
                            line.
                          </p>
                        </div>
                      ) : (
                        <p className="text-center text-sm text-slate-500">
                          {trendScope === 'section'
                            ? `No volume history for ${day} yet.`
                            : `No history for ${activeExercise} on ${day} yet.`}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-slate-500">No exercise data.</p>
                  )}
                </div>
              )}

              {tab === 'records' && (
                <div className="space-y-4">
                  {sectionRecords.length > 0 && (
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        type="search"
                        value={recordFilter}
                        onChange={(e) => setRecordFilter(e.target.value)}
                        placeholder="Filter exercises…"
                        className="input-field flex-1 py-2 text-sm"
                      />
                      <select
                        value={recordSort}
                        onChange={(e) => setRecordSort(e.target.value as RecordSortKey)}
                        className="input-field py-2 text-sm sm:w-40"
                        aria-label="Sort records"
                      >
                        <option value="weight">Heaviest first</option>
                        <option value="date">Newest first</option>
                        <option value="name">A–Z</option>
                      </select>
                    </div>
                  )}
                  {records.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-slate-700 py-10 text-center text-sm text-slate-500">
                      No personal records yet. Save a set with a new max weight to earn a PR.
                    </p>
                  ) : (
                    <>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <StatCard
                          label="Personal records"
                          value={String(sectionRecords.length)}
                        />
                        <StatCard
                          label={cardio ? 'Longest' : 'Heaviest single'}
                          value={
                            records[0]
                              ? formatRecordWeight(records[0].weight, records[0].set)
                              : '—'
                          }
                        />
                        <StatCard
                          label="PRs this month"
                          value={String(
                            sectionRecords.filter((r) => {
                              const d = new Date(r.date)
                              const now = new Date()
                              return (
                                d.getMonth() === now.getMonth() &&
                                d.getFullYear() === now.getFullYear()
                              )
                            }).length,
                          )}
                        />
                      </div>
                      <ul className="space-y-2">
                        {records.map((r, i) => (
                          <li
                            key={`${r.exercise}-${r.date}-${i}`}
                            className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3"
                          >
                            <div>
                              <p className="font-medium text-white">{r.exercise}</p>
                              <p className="text-xs text-slate-500">{r.set}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-emerald-400">
                                {formatRecordWeight(r.weight, r.set)}
                              </p>
                              <p className="text-xs text-slate-500">
                                {new Date(r.date).toLocaleDateString('en-GB')}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              )}

              {tab === 'insights' && (
                <ul className="space-y-3">
                  {insights.map((item, i) => (
                    <li
                      key={i}
                      className={`rounded-xl border px-4 py-3 ${
                        item.tone === 'positive'
                          ? 'border-emerald-800/50 bg-emerald-950/30'
                          : item.tone === 'warning'
                            ? 'border-amber-800/50 bg-amber-950/30'
                            : 'border-slate-800 bg-slate-950/50'
                      }`}
                    >
                      <p className="font-medium text-white">
                        {item.icon} {item.title}
                      </p>
                      <p className="mt-1 text-sm text-slate-400">{item.message}</p>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </>
      )}

      {onExport && !loading && (
        <ExportBar onExport={onExport} exporting={exporting} />
      )}
    </Modal>
  )
}

function countLoggedExercises(session: WorkoutSession): number {
  const names = new Set<string>()
  Object.keys(session.exercises ?? {}).forEach((n) => names.add(n))
  if (session.exerciseSets) Object.keys(session.exerciseSets).forEach((n) => names.add(n))
  return names.size
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  )
}
