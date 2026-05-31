import { useMemo, useState } from 'react'
import { AttendanceBars } from './AttendanceBars'
import { TrainingCalendar } from './TrainingCalendar'
import { toIsoDate } from '../../lib/attendanceAnalytics'
import { exportInsightsSummary, exportInsightsTable } from '../../lib/insightsExport'
import {
  buildGymDayRows,
  buildRestRows,
  buildSectionRows,
  buildWeekdayRows,
  filterRows,
  getVisibleMetrics,
  INSIGHT_METRICS,
  setVisibleMetrics,
  sortRows,
  type InsightMetricId,
  type InsightsRow,
  type InsightsSortDir,
  type InsightsSortKey,
} from '../../lib/insightsTables'
import type { useAttendanceData } from '../../hooks/useAttendanceData'

type TableId = 'sections' | 'weekdays' | 'gym-days' | 'rest'
type ChartMode = 'off' | 'sections' | 'weekdays'

interface InsightsViewProps {
  attendance: ReturnType<typeof useAttendanceData>
  planSections: string[]
}

export function InsightsView({ attendance, planSections }: InsightsViewProps) {
  const {
    loading,
    error,
    report,
    range,
    setRange,
    weeklyTarget,
    setWeeklyTarget,
    reload,
    applyPreset,
    sessions,
    trainedDates,
  } = attendance

  const [table, setTable] = useState<TableId>('sections')
  const [chart, setChart] = useState<ChartMode>('sections')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<InsightsSortKey>('value')
  const [sortDir, setSortDir] = useState<InsightsSortDir>('desc')
  const [visibleMetrics, setVisibleMetricsState] = useState<InsightMetricId[]>(getVisibleMetrics)
  const [sectionOnly, setSectionOnly] = useState('')

  const todayIso = toIsoDate(new Date())

  const rows = useMemo((): InsightsRow[] => {
    if (!report) return []
    switch (table) {
      case 'sections': {
        let list = buildSectionRows(report)
        if (sectionOnly) list = list.filter((r) => r.label === sectionOnly)
        return list
      }
      case 'weekdays':
        return buildWeekdayRows(report)
      case 'rest':
        return buildRestRows(report)
      case 'gym-days':
        return buildGymDayRows(trainedDates, sessions, report.range)
      default:
        return []
    }
  }, [report, table, trainedDates, sessions, sectionOnly])

  const displayRows = useMemo(
    () => sortRows(filterRows(rows, search), sortKey, sortDir),
    [rows, search, sortKey, sortDir],
  )

  const toggleMetric = (id: InsightMetricId) => {
    setVisibleMetricsState((prev) => {
      const next = prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
      const safe = next.length > 0 ? next : prev
      setVisibleMetrics(safe)
      return safe
    })
  }

  const tableColumns = useMemo(() => {
    switch (table) {
      case 'sections':
        return ['Section', 'Visits', 'Avg min', 'Notes']
      case 'weekdays':
        return ['Weekday', 'Gym days', '', 'Notes']
      case 'gym-days':
        return ['Date', 'Sets', 'Sections', 'Muscle days']
      case 'rest':
        return ['Exercise', 'Median rest (min)', 'Samples', 'Notes']
      default:
        return []
    }
  }, [table])

  const handleExportTable = () => {
    if (!report) return
    exportInsightsTable(table, tableColumns, displayRows, report.range)
  }

  const handleExportSummary = () => {
    if (!report) return
    const summaryRows = INSIGHT_METRICS.filter((m) => visibleMetrics.includes(m.id)).map(
      (m) => ({ metric: m.label, value: m.format(report) }),
    )
    exportInsightsSummary(report, summaryRows)
  }

  return (
    <div className="pb-6 lg:pb-4">
      <div className="mb-4 lg:mb-3">
        <p className="text-xs font-bold uppercase tracking-wider text-cyan-400">Insights</p>
        <h2 className="page-title mt-0.5">Explore your training data</h2>
        <p className="page-tagline mt-1">
          Tables, filters, sort, KPI toggles, CSV export.
        </p>
      </div>

      <div className="glass-panel mb-4 flex flex-wrap items-end gap-3 p-4">
        <div className="flex flex-wrap gap-2">
          {[
            { label: '30d', days: 29 },
            { label: '90d', days: 89 },
            { label: '6mo', days: 179 },
            { label: '1y', days: 364 },
          ].map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => applyPreset(p.days)}
              className="rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-cyan-600/50"
            >
              {p.label}
            </button>
          ))}
        </div>
        <input
          type="date"
          value={range.from}
          max={range.to}
          onChange={(e) => setRange({ ...range, from: e.target.value })}
          className="input-field py-1.5 text-xs"
          aria-label="From"
        />
        <span className="text-slate-600">→</span>
        <input
          type="date"
          value={range.to}
          min={range.from}
          max={todayIso}
          onChange={(e) => setRange({ ...range, to: e.target.value })}
          className="input-field py-1.5 text-xs"
          aria-label="To"
        />
        <select
          value={weeklyTarget}
          onChange={(e) => setWeeklyTarget(parseInt(e.target.value, 10) || 4)}
          className="input-field py-1.5 text-xs"
          aria-label="Weekly target"
        >
          {[2, 3, 4, 5, 6, 7].map((n) => (
            <option key={n} value={n}>
              Goal {n}d/wk
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => void reload()}
          disabled={loading}
          className="btn-ghost py-1.5 text-xs"
        >
          {loading ? '…' : 'Refresh'}
        </button>
        <div className="ml-auto flex flex-wrap gap-2">
          <button type="button" onClick={handleExportTable} disabled={!report} className="btn-secondary text-xs">
            Export table
          </button>
          <button type="button" onClick={handleExportSummary} disabled={!report} className="btn-secondary text-xs">
            Export summary
          </button>
        </div>
      </div>

      {error && !loading && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-950/40 p-4 text-sm text-red-200">
          {error}
          <button type="button" className="btn-secondary mt-2 text-xs" onClick={() => void reload()}>
            Retry
          </button>
        </div>
      )}

      {loading && (
        <p className="py-16 text-center text-sm text-slate-500">Loading insights…</p>
      )}

      {report && !loading && (
        <div className="grid gap-6 lg:grid-cols-12">
          <aside className="space-y-4 lg:col-span-3">
            <div className="glass-panel p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                KPIs to show
              </h3>
              <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto text-sm">
                {INSIGHT_METRICS.map((m) => (
                  <li key={m.id}>
                    <label className="flex cursor-pointer items-center gap-2 text-slate-300">
                      <input
                        type="checkbox"
                        checked={visibleMetrics.includes(m.id)}
                        onChange={() => toggleMetric(m.id)}
                        className="rounded border-slate-600"
                      />
                      {m.label}
                    </label>
                  </li>
                ))}
              </ul>
            </div>

            <div className="glass-panel p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Chart
              </h3>
              <select
                value={chart}
                onChange={(e) => setChart(e.target.value as ChartMode)}
                className="input-field mt-2 w-full py-2 text-xs"
              >
                <option value="off">Hidden</option>
                <option value="sections">By section</option>
                <option value="weekdays">By weekday</option>
              </select>
            </div>

            {report.neglectedSections.length > 0 && (
              <div className="rounded-xl border border-amber-800/40 bg-amber-950/25 p-3 text-xs text-amber-200/90">
                <p className="font-medium text-amber-200">Not trained in range</p>
                <p className="mt-1 leading-relaxed">
                  {report.neglectedSections.length <= 6
                    ? report.neglectedSections.join(', ')
                    : `${report.neglectedSections.length} of ${planSections.length} plan sections`}
                </p>
              </div>
            )}
          </aside>

          <div className="space-y-4 lg:col-span-9">
            {visibleMetrics.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {INSIGHT_METRICS.filter((m) => visibleMetrics.includes(m.id)).map((m) => (
                  <div
                    key={m.id}
                    className="rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2"
                  >
                    <p className="text-[10px] uppercase tracking-wide text-slate-500">{m.label}</p>
                    <p className="text-lg font-semibold text-white">{m.format(report)}</p>
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-slate-600">
              {report.range.from} → {report.range.to} · {report.gymVisits} gym day
              {report.gymVisits !== 1 ? 's' : ''}
            </p>

            <div className="glass-panel overflow-hidden">
              <div className="flex flex-wrap items-center gap-2 border-b border-slate-800/80 px-3 py-2">
                {(
                  [
                    ['sections', 'Sections'],
                    ['weekdays', 'Weekdays'],
                    ['gym-days', 'Gym days'],
                    ['rest', 'Rest gaps'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTable(id)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                      table === id ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {label}
                  </button>
                ))}
                {table === 'sections' && planSections.length > 0 && (
                  <select
                    value={sectionOnly}
                    onChange={(e) => setSectionOnly(e.target.value)}
                    className="input-field py-1.5 text-xs"
                    aria-label="Filter by plan section"
                  >
                    <option value="">All sections</option>
                    {planSections.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                )}
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter rows…"
                  className="input-field ml-auto max-w-[10rem] py-1.5 text-xs sm:max-w-xs"
                />
                <select
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value as InsightsSortKey)}
                  className="input-field py-1.5 text-xs"
                  aria-label="Sort by"
                >
                  <option value="value">Primary value</option>
                  <option value="value2">Secondary</option>
                  <option value="label">Name</option>
                </select>
                <button
                  type="button"
                  onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
                  className="btn-ghost py-1.5 text-xs"
                  aria-label="Toggle sort direction"
                >
                  {sortDir === 'desc' ? '↓' : '↑'}
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[320px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs uppercase text-slate-500">
                      {tableColumns.map((c) => (
                        <th key={c} className="px-4 py-2 font-medium">
                          {c || '—'}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {displayRows.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-10 text-center text-slate-500">
                          No rows match your filters.
                        </td>
                      </tr>
                    ) : (
                      displayRows.map((r) => (
                        <tr
                          key={r.id}
                          className="border-b border-slate-800/60 hover:bg-slate-900/50"
                        >
                          <td className="px-4 py-2.5 font-medium text-white">{r.label}</td>
                          <td className="px-4 py-2.5 text-slate-300">
                            {r.value}
                            {r.unit ? ` ${r.unit}` : ''}
                          </td>
                          <td className="px-4 py-2.5 text-slate-400">
                            {r.value2 != null ? r.value2 : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-slate-500">{r.meta ?? ''}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {chart !== 'off' && (
              <div className="glass-panel p-4">
                <AttendanceBars
                  items={
                    chart === 'sections'
                      ? report.sectionVisitCounts.slice(0, 10).map((s) => ({
                          label: s.section,
                          value: s.visits,
                        }))
                      : report.weekdayVisits.map((w) => ({
                          label: w.weekday,
                          value: w.count,
                          highlight: w.weekday === report.mostSkippedWeekday,
                        }))
                  }
                  unit={chart === 'sections' ? ' visits' : ' days'}
                />
              </div>
            )}

            <details className="glass-panel group">
              <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-300">
                Training calendar
              </summary>
              <div className="border-t border-slate-800 px-4 py-4">
                <TrainingCalendar trainedDates={trainedDates} />
              </div>
            </details>
          </div>
        </div>
      )}
    </div>
  )
}
