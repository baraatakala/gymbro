import { useCallback, useEffect, useMemo, useState } from 'react'
import { Modal } from '../ui/Modal'
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

  return (
    <Modal open={open} onClose={onClose} title="Training habits & attendance" wide>
      <p className="mb-4 text-sm text-slate-400">
        Gym visits, duration, streaks, and rest patterns from your calendar and logged sets.
        Check-in when you open a section; check-out on <strong className="text-slate-300">Finish workout</strong>.
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

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
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

      <label className="mb-6 flex flex-wrap items-center gap-3 text-sm text-slate-400">
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
            Showing {report.range.from} → {report.range.to}
            {range.from !== report.range.from || range.to !== report.range.to
              ? ' (adjusted)'
              : ''}
          </p>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Gym visits" value={String(report.gymVisits)} sub={`${report.gymVisitsPerWeek}/wk`} />
            <MetricCard
              label="Avg time in gym"
              value={report.avgSessionMinutes !== null ? `${report.avgSessionMinutes} min` : '—'}
            />
            <MetricCard label="Longest streak" value={`${report.longestStreak} days`} />
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
                  ? `${report.avgCheckInToFirstSetMinutes} min`
                  : '—'
              }
              sub="Warm-up / setup time"
            />
            <MetricCard
              label="Best time to start"
              value={report.bestHourToTrain?.label ?? '—'}
              sub={
                report.bestHourToTrain
                  ? `${report.bestHourToTrain.sessionDays} session days`
                  : 'Log more workouts'
              }
            />
          </div>

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

          <section>
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-sm font-semibold text-slate-300">Section frequency</h3>
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
                  aria-label="Sort sections"
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
              <ul className="space-y-2">
                {filteredSections.map((s) => (
                  <li
                    key={s.section}
                    className="flex justify-between rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-2.5 text-sm"
                  >
                    <span className="text-white">{s.section}</span>
                    <span className="text-slate-400">
                      {s.visits} visit{s.visits !== 1 ? 's' : ''}
                      {s.avgMinutes > 0 && ` · ~${s.avgMinutes} min`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold text-slate-300">Weekday pattern</h3>
            <div className="flex flex-wrap gap-2">
              {report.weekdayVisits.map((w) => (
                <span
                  key={w.weekday}
                  className={`chip ${
                    w.weekday === report.mostSkippedWeekday
                      ? 'border-amber-600/50 bg-amber-950/40 text-amber-200'
                      : 'border-slate-700 bg-slate-900 text-slate-300'
                  }`}
                >
                  {w.weekday}: {w.count}
                </span>
              ))}
            </div>
            {report.mostSkippedWeekday && (
              <p className="mt-2 text-xs text-amber-400/90">
                Least active weekday in range: {report.mostSkippedWeekday}
              </p>
            )}
          </section>

          {report.longRestExercises.length > 0 && (
            <section>
              <h3 className="mb-3 text-sm font-semibold text-slate-300">
                Longest rest between sets
              </h3>
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
            </section>
          )}

          <TrainingCalendar trainedDates={trainedDates} />
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
