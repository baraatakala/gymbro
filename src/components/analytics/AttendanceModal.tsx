import { useCallback, useEffect, useMemo, useState } from 'react'
import { Modal } from '../ui/Modal'
import { AttendanceBars } from './AttendanceBars'
import {
  buildAttendanceReport,
  defaultDateRange,
  normalizeDateRange,
  toIsoDate,
} from '../../lib/attendanceAnalytics'
import { getWeeklyTargetDays, setWeeklyTargetDays } from '../../lib/attendancePrefs'
import { loadAttendanceDataset } from '../../lib/supabaseAttendance'
import type { AttendanceReport } from '../../types/attendance'
import { TrainingCalendar } from './TrainingCalendar'

interface AttendanceModalProps {
  open: boolean
  onClose: () => void
  planSections: string[]
  trainingCalendarDates?: string[]
}

type Preset = '30' | '90' | '180' | '365' | 'custom'
type SectionSort = 'visits' | 'time' | 'name'
type HabitsTab = 'overview' | 'sections' | 'patterns' | 'calendar'

const FEATURE_COVERAGE = [
  'Gym visits in date range',
  'Avg time in gym (check-in → last set / finish)',
  'Longest & current streak',
  '% weeks hitting weekly target',
  'Check-in → first set',
  'Section / muscle-day frequency & time',
  'Weekday pattern & least active day',
  'Sections skipped in range',
  'Best hour to start',
  'Long rest between sets',
  'Training calendar heatmap',
] as const

export function AttendanceModal({
  open,
  onClose,
  planSections,
  trainingCalendarDates = [],
}: AttendanceModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [trainedDates, setTrainedDates] = useState<string[]>(trainingCalendarDates)
  const [sessions, setSessions] = useState<Awaited<ReturnType<typeof loadAttendanceDataset>>['sessions']>([])
  const [range, setRange] = useState(defaultDateRange)
  const [preset, setPreset] = useState<Preset>('90')
  const [weeklyTarget, setWeeklyTarget] = useState(getWeeklyTargetDays())
  const [sectionFilter, setSectionFilter] = useState('')
  const [sectionSort, setSectionSort] = useState<SectionSort>('visits')
  const [tab, setTab] = useState<HabitsTab>('overview')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await loadAttendanceDataset(400)
      setTrainedDates(data.trainedDates.length > 0 ? data.trainedDates : trainingCalendarDates)
      setSessions(data.sessions)
    } catch (e) {
      setSessions([])
      setError(e instanceof Error ? e.message : 'Could not load attendance data')
    } finally {
      setLoading(false)
    }
  }, [trainingCalendarDates])

  useEffect(() => {
    if (!open) return
    setTab('overview')
    setWeeklyTarget(getWeeklyTargetDays())
    void loadData()
  }, [open, loadData])

  const applyPreset = (p: Preset) => {
    setPreset(p)
    const to = new Date()
    const from = new Date()
    if (p === 'custom') return
    const days = p === '30' ? 29 : p === '90' ? 89 : p === '180' ? 179 : 364
    from.setDate(from.getDate() - days)
    setRange({ from: toIsoDate(from), to: toIsoDate(to) })
  }

  const effectiveRange = useMemo(() => normalizeDateRange(range), [range])

  const report: AttendanceReport | null = useMemo(() => {
    if (!open || loading) return null
    return buildAttendanceReport(trainedDates, sessions, effectiveRange, {
      weeklyTargetDays: weeklyTarget,
      planSections,
    })
  }, [open, loading, trainedDates, sessions, effectiveRange, weeklyTarget, planSections])

  const filteredSections = useMemo(() => {
    if (!report) return []
    const q = sectionFilter.trim().toLowerCase()
    let list = report.sectionVisitCounts
    if (q) list = list.filter((s) => s.section.toLowerCase().includes(q))
    if (sectionSort === 'name') {
      return [...list].sort((a, b) => a.section.localeCompare(b.section))
    }
    if (sectionSort === 'time') {
      return [...list].sort((a, b) => b.avgMinutes - a.avgMinutes)
    }
    return list
  }, [report, sectionFilter, sectionSort])

  const saveTarget = (n: number) => {
    setWeeklyTargetDays(n)
    setWeeklyTarget(n)
  }

  const todayIso = toIsoDate(new Date())

  const tabs: { id: HabitsTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'sections', label: 'Sections' },
    { id: 'patterns', label: 'Patterns' },
    { id: 'calendar', label: 'Calendar' },
  ]

  return (
    <Modal open={open} onClose={onClose} title="Training habits & attendance" wide>
      <details className="mb-4 rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3 text-sm">
        <summary className="cursor-pointer font-medium text-slate-300">
          What&apos;s included ({FEATURE_COVERAGE.length} metrics)
        </summary>
        <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-slate-500">
          {FEATURE_COVERAGE.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </details>

      <p className="mb-4 text-sm text-slate-400">
        Check-in when you <strong className="text-slate-300">open a section</strong>; check-out on{' '}
        <strong className="text-slate-300">Finish workout</strong>. Scroll tabs below for section
        and weekday breakdowns.
      </p>

      <div className="mb-5 flex flex-wrap gap-2">
        {(
          [
            ['30', '30 days'],
            ['90', '90 days'],
            ['180', '6 months'],
            ['365', '1 year'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => applyPreset(id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
              preset === id ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
            }`}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => void loadData()}
          disabled={loading}
          className="btn-ghost ml-auto py-1.5 text-xs disabled:opacity-50"
        >
          {loading ? 'Refreshing…' : '↻ Refresh'}
        </button>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm text-slate-400">
          From
          <input
            type="date"
            max={range.to || todayIso}
            value={range.from}
            onChange={(e) => {
              setPreset('custom')
              setRange((r) => ({ ...r, from: e.target.value }))
            }}
            className="input-field mt-1 w-full py-2 text-sm"
          />
        </label>
        <label className="text-sm text-slate-400">
          To
          <input
            type="date"
            min={range.from}
            max={todayIso}
            value={range.to}
            onChange={(e) => {
              setPreset('custom')
              setRange((r) => ({ ...r, to: e.target.value }))
            }}
            className="input-field mt-1 w-full py-2 text-sm"
          />
        </label>
      </div>

      <label className="mb-4 flex flex-wrap items-center gap-3 text-sm text-slate-400">
        Weekly gym target (days)
        <select
          value={weeklyTarget}
          onChange={(e) => saveTarget(parseInt(e.target.value, 10))}
          className="input-field py-2 text-sm"
          aria-label="Weekly gym target"
        >
          {[2, 3, 4, 5, 6, 7].map((n) => (
            <option key={n} value={n}>
              {n} days / week
            </option>
          ))}
        </select>
      </label>

      {report && !loading && !error && (
        <div className="mb-5 flex gap-1 overflow-x-auto rounded-xl bg-slate-950 p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold sm:text-sm ${
                tab === t.id ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <p className="text-sm text-slate-500">Loading attendance data…</p>
        </div>
      )}

      {error && !loading && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-950/40 px-4 py-3">
          <p className="text-sm text-red-200">{error}</p>
          <button type="button" onClick={() => void loadData()} className="btn-secondary mt-3 text-xs">
            Retry
          </button>
        </div>
      )}

      {report && !loading && !error && report.gymVisits === 0 && (
        <div className="mb-6 rounded-xl border border-dashed border-slate-700 px-6 py-10 text-center text-sm text-slate-500">
          <p className="text-3xl">📅</p>
          <p className="mt-3 text-slate-300">No gym days in this range yet.</p>
          <p className="mt-2">Save exercises and use Finish workout — stats appear after your first logged day.</p>
        </div>
      )}

      {report && !loading && !error && (
        <div className="space-y-8">
          <p className="text-xs text-slate-600">
            {report.range.from} → {report.range.to}
            {range.from !== report.range.from || range.to !== report.range.to ? ' (adjusted)' : ''}
          </p>

          {(tab === 'overview' || report.gymVisits === 0) && (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard label="Gym visits" value={String(report.gymVisits)} sub={`${report.gymVisitsPerWeek}/wk`} />
                <MetricCard
                  label="Avg time in gym"
                  value={report.avgSessionMinutes !== null ? `${report.avgSessionMinutes} min` : '—'}
                  sub={report.gymVisits < 2 ? 'Est. improves with more days' : undefined}
                />
                <MetricCard label="Longest streak" value={`${report.longestStreak} days`} sub={`Now ${report.currentStreak}d`} />
                <MetricCard
                  label="Weeks on target"
                  value={`${report.weeksHitTargetPct}%`}
                  sub={`${report.weeklyTargetDays}d/wk goal`}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <MetricCard
                  label="Check-in → first set"
                  value={
                    report.avgCheckInToFirstSetMinutes !== null
                      ? report.avgCheckInToFirstSetMinutes === 0
                        ? '< 1 min'
                        : `${report.avgCheckInToFirstSetMinutes} min`
                      : '—'
                  }
                  sub="Open section before first save"
                />
                <MetricCard
                  label="Best time to start"
                  value={report.bestHourToTrain?.label ?? '—'}
                  sub={
                    report.bestHourToTrain
                      ? `${report.bestHourToTrain.sessionDays} session day(s)`
                      : 'Need more logged days'
                  }
                />
              </div>

              {report.neglectedSections.length > 0 && (
                <div className="rounded-xl border border-amber-800/40 bg-amber-950/25 px-4 py-3 text-sm">
                  <p className="font-medium text-amber-200">Sections not trained in range</p>
                  <p className="mt-1 text-amber-100/80">
                    {report.neglectedSections.length <= 8
                      ? report.neglectedSections.join(' · ')
                      : `${report.neglectedSections.slice(0, 8).join(' · ')} +${report.neglectedSections.length - 8} more`}
                  </p>
                </div>
              )}

              <section>
                <h3 className="mb-3 text-sm font-semibold text-slate-300">Insights</h3>
                <ul className="space-y-2">
                  {report.insights.map((item, i) => (
                    <li
                      key={i}
                      className={`rounded-xl border px-4 py-3 text-sm ${
                        item.tone === 'positive'
                          ? 'border-emerald-800/50 bg-emerald-950/30'
                          : item.tone === 'warning'
                            ? 'border-amber-800/50 bg-amber-950/30'
                            : 'border-slate-800 bg-slate-950/50'
                      }`}
                    >
                      <span className="font-medium text-white">
                        {item.icon} {item.title}
                      </span>
                      <p className="mt-1 text-slate-400">{item.message}</p>
                    </li>
                  ))}
                </ul>
              </section>
            </>
          )}

          {tab === 'sections' && report.gymVisits > 0 && (
            <section className="space-y-6">
              <div>
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-sm font-semibold text-slate-300">Section frequency & time</h3>
                  <div className="flex gap-2">
                    <input
                      type="search"
                      value={sectionFilter}
                      onChange={(e) => setSectionFilter(e.target.value)}
                      placeholder="Filter…"
                      className="input-field w-full py-1.5 text-xs sm:w-36"
                    />
                    <select
                      value={sectionSort}
                      onChange={(e) => setSectionSort(e.target.value as SectionSort)}
                      className="input-field py-1.5 text-xs"
                    >
                      <option value="visits">Most visits</option>
                      <option value="time">Longest avg</option>
                      <option value="name">A–Z</option>
                    </select>
                  </div>
                </div>
                {filteredSections.length === 0 ? (
                  <p className="text-sm text-slate-500">No section logs in this range.</p>
                ) : (
                  <>
                    <AttendanceBars
                      items={filteredSections.map((s) => ({
                        label: s.section,
                        value: s.visits,
                      }))}
                      unit=" visits"
                    />
                    <ul className="mt-4 space-y-2">
                      {filteredSections.map((s) => (
                        <li
                          key={s.section}
                          className="flex justify-between rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-2.5 text-sm"
                        >
                          <span className="text-white">{s.section}</span>
                          <span className="text-slate-400">
                            {s.visits} visit{s.visits !== 1 ? 's' : ''}
                            {s.avgMinutes > 0 && ` · ~${s.avgMinutes} min avg`}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
              {report.sectionTimeMinutes.length > 0 && (
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-slate-300">Total time by section</h3>
                  <AttendanceBars
                    items={report.sectionTimeMinutes.slice(0, 10).map((s) => ({
                      label: s.section,
                      value: s.totalMinutes,
                    }))}
                    unit=" min"
                  />
                </div>
              )}
            </section>
          )}

          {tab === 'patterns' && (
            <section className="space-y-6">
              <div>
                <h3 className="mb-3 text-sm font-semibold text-slate-300">Weekday pattern</h3>
                <AttendanceBars
                  items={report.weekdayVisits.map((w) => ({
                    label: w.weekday,
                    value: w.count,
                    highlight: w.weekday === report.mostSkippedWeekday && w.count > 0,
                  }))}
                  unit=" days"
                />
                {report.mostSkippedWeekday && (
                  <p className="mt-2 text-xs text-amber-400/90">
                    Least active weekday in range: {report.mostSkippedWeekday}
                  </p>
                )}
              </div>

              <div>
                <h3 className="mb-3 text-sm font-semibold text-slate-300">Longest rest between sets</h3>
                {report.longRestExercises.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-700 px-4 py-6 text-sm text-slate-500">
                    Save sets on different timestamps or use the rest timer after each save — rest
                    stats appear after 2+ gaps per exercise.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {report.longRestExercises.map((r) => (
                      <li
                        key={r.exercise}
                        className="flex justify-between rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-2.5 text-sm"
                      >
                        <span className="text-white">{r.exercise}</span>
                        <span className="text-slate-400">
                          ~{Math.round(r.medianRestSec / 60)} min median ({r.samples} gaps)
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          )}

          {tab === 'calendar' && (
            <section>
              <h3 className="mb-3 text-sm font-semibold text-slate-300">Training calendar</h3>
              <TrainingCalendar trainedDates={trainedDates} />
            </section>
          )}
        </div>
      )}
    </Modal>
  )
}

function MetricCard({
  label,
  value,
  sub,
}: {
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  )
}
