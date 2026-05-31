import { AttendanceBars } from './AttendanceBars'
import type { AttendanceReport } from '../../types/attendance'
import type { useAttendanceData } from '../../hooks/useAttendanceData'

type AttendanceState = ReturnType<typeof useAttendanceData>

interface AttendanceDashboardProps {
  attendance: AttendanceState
  onOpenFull: () => void
  planSectionCount: number
}

/** Main-page panel: direct answers to all gym habit questions (not hidden in a modal). */
export function AttendanceDashboard({
  attendance,
  onOpenFull,
  planSectionCount,
}: AttendanceDashboardProps) {
  const { loading, error, report, range, setRange, weeklyTarget, setWeeklyTarget, reload, applyPreset } =
    attendance

  const todayIso = toIsoDateLocal(new Date())

  return (
    <section className="glass-panel-strong mb-6 overflow-hidden border-cyan-500/25">
      <div className="border-b border-slate-800/80 bg-gradient-to-r from-cyan-950/50 to-slate-950/30 px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-cyan-400">
              Gym habits — your answers
            </p>
            <h2 className="mt-1 text-lg font-bold text-white sm:text-xl">
              How often you train, how long, and what you skip
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-400">
              Uses cloud calendar + saved sets. Open a section before saving for check-in time; tap{' '}
              <strong className="text-slate-300">Finish workout</strong> for check-out.
            </p>
          </div>
          <button type="button" onClick={onOpenFull} className="btn-secondary shrink-0 text-sm">
            Full report →
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {[
            { label: 'This month', days: 29 },
            { label: '90 days', days: 89 },
            { label: '6 months', days: 179 },
            { label: '1 year', days: 364 },
          ].map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => applyPreset(p.days)}
              className="rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-cyan-600/50 hover:text-white"
            >
              {p.label}
            </button>
          ))}
          <input
            type="date"
            value={range.from}
            max={range.to}
            onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
            className="input-field py-1.5 text-xs"
            aria-label="From date"
          />
          <span className="self-center text-slate-600">→</span>
          <input
            type="date"
            value={range.to}
            min={range.from}
            max={todayIso}
            onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
            className="input-field py-1.5 text-xs"
            aria-label="To date"
          />
          <select
            value={weeklyTarget}
            onChange={(e) => setWeeklyTarget(parseInt(e.target.value, 10) || 4)}
            className="input-field py-1.5 text-xs"
            aria-label="Weekly target days"
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
            {loading ? '…' : '↻'}
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        {loading && (
          <p className="py-8 text-center text-sm text-slate-500">Loading your gym history…</p>
        )}

        {error && !loading && (
          <div className="rounded-xl border border-red-500/30 bg-red-950/40 p-4 text-sm text-red-200">
            {error}
            <button type="button" className="btn-secondary mt-3 block text-xs" onClick={() => void reload()}>
              Retry
            </button>
          </div>
        )}

        {report && !loading && !error && (
          <div className="space-y-6">
            <AnswerGrid report={report} planSectionCount={planSectionCount} />

            {report.sectionVisitCounts.length > 0 && (
              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Which sections you train most
                  </h3>
                  <AttendanceBars
                    items={report.sectionVisitCounts.slice(0, 8).map((s) => ({
                      label: s.section,
                      value: s.visits,
                    }))}
                    unit=" visits"
                  />
                </div>
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Which weekdays you come (skip = lowest bar)
                  </h3>
                  <AttendanceBars
                    items={report.weekdayVisits.map((w) => ({
                      label: w.weekday,
                      value: w.count,
                      highlight: w.weekday === report.mostSkippedWeekday,
                    }))}
                    unit=" days"
                  />
                </div>
              </div>
            )}

            {report.longRestExercises.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Exercises where you rest longest between sets
                </h3>
                <p className="text-sm text-slate-300">
                  {report.longRestExercises
                    .slice(0, 3)
                    .map((r) => `${r.exercise} (~${Math.round(r.medianRestSec / 60)} min)`)
                    .join(' · ')}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

function AnswerGrid({
  report,
  planSectionCount,
}: {
  report: AttendanceReport
  planSectionCount: number
}) {
  const topSection = report.mostFrequentSections[0] ?? '—'
  const skipped =
    report.neglectedSections.length > 0
      ? report.neglectedSections.length <= 4
        ? report.neglectedSections.join(', ')
        : `${report.neglectedSections.length} of ${planSectionCount} sections`
      : 'None in this period — great coverage'

  const items: { q: string; a: string; hint?: string }[] = [
    {
      q: 'How many times did I come to the gym?',
      a: `${report.gymVisits} day${report.gymVisits !== 1 ? 's' : ''} (${report.gymVisitsPerWeek}/week in range)`,
    },
    {
      q: 'Average time in the gym (check-in → last set / finish)?',
      a: report.avgSessionMinutes !== null ? `~${report.avgSessionMinutes} minutes` : 'Log more sessions',
      hint: 'Finish workout when you leave',
    },
    {
      q: 'Longest attendance streak?',
      a: `${report.longestStreak} days (current ${report.currentStreak})`,
    },
    {
      q: `% of weeks hitting ${report.weeklyTargetDays} days/week goal?`,
      a: `${report.weeksHitTargetPct}%`,
    },
    {
      q: 'Check-in → first exercise logged?',
      a:
        report.avgCheckInToFirstSetMinutes !== null
          ? report.avgCheckInToFirstSetMinutes === 0
            ? 'Under 1 minute'
            : `~${report.avgCheckInToFirstSetMinutes} minutes`
          : 'Open section before first save',
    },
    {
      q: 'Which muscle / section day most often?',
      a: topSection,
      hint: report.sectionVisitCounts[0]
        ? `${report.sectionVisitCounts[0].visits} visits`
        : undefined,
    },
    {
      q: 'Which section takes the most time per visit?',
      a: report.topSectionByTime ?? topSection,
      hint: report.sectionVisitCounts.find((s) => s.section === report.topSectionByTime)
        ? `~${report.sectionVisitCounts.find((s) => s.section === report.topSectionByTime)!.avgMinutes} min avg`
        : undefined,
    },
    {
      q: 'Which days do I skip most often?',
      a: report.mostSkippedWeekday
        ? `Weekday: ${report.mostSkippedWeekday} (fewest gym days)`
        : 'Need more history',
      hint: `Sections not trained: ${skipped}`,
    },
    {
      q: 'Best time to go for consistency?',
      a: report.bestHourToTrain?.label ?? 'Log more workouts',
      hint: report.bestHourToTrain
        ? `${report.bestHourToTrain.sessionDays} session day(s) started then`
        : undefined,
    },
    {
      q: 'Exercises with long rest between sets?',
      a:
        report.longRestExercises[0]
          ? `${report.longRestExercises[0].exercise} (~${Math.round(report.longRestExercises[0].medianRestSec / 60)} min)`
          : 'Use rest timer after saves',
    },
  ]

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <li
          key={item.q}
          className="rounded-xl border border-slate-800/80 bg-slate-950/60 px-4 py-3"
        >
          <p className="text-xs font-medium text-slate-500">{item.q}</p>
          <p className="mt-1 text-base font-semibold text-white">{item.a}</p>
          {item.hint && <p className="mt-0.5 text-xs text-slate-500">{item.hint}</p>}
        </li>
      ))}
    </ul>
  )
}

function toIsoDateLocal(d: Date): string {
  return d.toLocaleDateString('en-CA')
}
