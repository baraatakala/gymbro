import { calendarDayKey } from './dateUtils'
import { collectGymDayKeys, parseRange } from './attendanceAnalytics'
import type { AttendanceReport, AttendanceSession, DateRange } from '../types/attendance'

export type InsightsSortKey = 'label' | 'value' | 'value2'
export type InsightsSortDir = 'asc' | 'desc'

export interface InsightsRow {
  id: string
  label: string
  value: number
  value2?: number
  unit?: string
  meta?: string
}

export type InsightMetricId =
  | 'visits'
  | 'visitsPerWeek'
  | 'avgMinutes'
  | 'streak'
  | 'longestStreak'
  | 'weeksOnTarget'
  | 'checkInGap'
  | 'bestHour'

export const INSIGHT_METRICS: {
  id: InsightMetricId
  label: string
  format: (r: AttendanceReport) => string
}[] = [
  { id: 'visits', label: 'Gym days', format: (r) => String(r.gymVisits) },
  { id: 'visitsPerWeek', label: 'Days / week', format: (r) => String(r.gymVisitsPerWeek) },
  { id: 'avgMinutes', label: 'Avg visit (min)', format: (r) => (r.avgSessionMinutes != null ? String(r.avgSessionMinutes) : '—') },
  { id: 'streak', label: 'Current streak', format: (r) => `${r.currentStreak}d` },
  { id: 'longestStreak', label: 'Longest streak', format: (r) => `${r.longestStreak}d` },
  { id: 'weeksOnTarget', label: 'Weeks on goal', format: (r) => `${r.weeksHitTargetPct}%` },
  { id: 'checkInGap', label: 'Check-in → 1st set', format: (r) =>
    r.avgCheckInToFirstSetMinutes != null
      ? r.avgCheckInToFirstSetMinutes === 0
        ? '<1m'
        : `${r.avgCheckInToFirstSetMinutes}m`
      : '—' },
  { id: 'bestHour', label: 'Peak start hour', format: (r) => r.bestHourToTrain?.label ?? '—' },
]

const DEFAULT_METRICS: InsightMetricId[] = [
  'visits',
  'avgMinutes',
  'streak',
  'weeksOnTarget',
]

const METRICS_KEY = 'gymbro_insights_visible_metrics'

export function getVisibleMetrics(): InsightMetricId[] {
  try {
    const raw = localStorage.getItem(METRICS_KEY)
    if (!raw) return DEFAULT_METRICS
    const parsed = JSON.parse(raw) as string[]
    const valid = INSIGHT_METRICS.map((m) => m.id)
    const picked = parsed.filter((id): id is InsightMetricId =>
      valid.includes(id as InsightMetricId),
    )
    return picked.length > 0 ? picked : DEFAULT_METRICS
  } catch {
    return DEFAULT_METRICS
  }
}

export function setVisibleMetrics(ids: InsightMetricId[]): void {
  localStorage.setItem(METRICS_KEY, JSON.stringify(ids))
}

export function sortRows(
  rows: InsightsRow[],
  key: InsightsSortKey,
  dir: InsightsSortDir,
): InsightsRow[] {
  const mul = dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    if (key === 'label') return mul * a.label.localeCompare(b.label)
    if (key === 'value2') {
      return mul * ((a.value2 ?? 0) - (b.value2 ?? 0))
    }
    return mul * (a.value - b.value)
  })
}

export function filterRows(rows: InsightsRow[], query: string): InsightsRow[] {
  const q = query.trim().toLowerCase()
  if (!q) return rows
  return rows.filter(
    (r) =>
      r.label.toLowerCase().includes(q) ||
      (r.meta?.toLowerCase().includes(q) ?? false),
  )
}

export function buildSectionRows(report: AttendanceReport): InsightsRow[] {
  return report.sectionVisitCounts.map((s) => ({
    id: s.section,
    label: s.section,
    value: s.visits,
    value2: s.avgMinutes,
    unit: 'visits',
    meta: `~${s.avgMinutes} min avg`,
  }))
}

export function buildWeekdayRows(report: AttendanceReport): InsightsRow[] {
  return report.weekdayVisits.map((w) => ({
    id: w.weekday,
    label: w.weekday,
    value: w.count,
    unit: 'days',
    meta: w.weekday === report.mostSkippedWeekday ? 'lowest' : undefined,
  }))
}

export function buildRestRows(report: AttendanceReport): InsightsRow[] {
  return report.longRestExercises.map((r) => ({
    id: r.exercise,
    label: r.exercise,
    value: Math.round(r.medianRestSec / 60),
    value2: r.samples,
    unit: 'min median',
    meta: `${r.samples} gaps`,
  }))
}

export function buildGymDayRows(
  trainedDates: string[],
  sessions: AttendanceSession[],
  range: DateRange,
): InsightsRow[] {
  const days = collectGymDayKeys(trainedDates, sessions, range)
  const { fromMs, toMs } = parseRange(range)
  const rows: InsightsRow[] = []

  for (const day of days) {
    const daySessions = sessions.filter((s) => {
      const k = calendarDayKey(s.timestamp)
      return k === day && s.sets.length > 0
    })
    const sections = [...new Set(daySessions.map((s) => s.section))]
    const sets = daySessions.reduce((n, s) => n + s.sets.length, 0)
    const ts = daySessions[0]?.timestamp ?? new Date(`${day}T12:00:00`).getTime()
    if (ts < fromMs || ts > toMs) continue
    rows.push({
      id: day,
      label: day,
      value: sets,
      value2: sections.length,
      unit: 'sets',
      meta: sections.join(', ') || '—',
    })
  }

  return rows.sort((a, b) => b.label.localeCompare(a.label))
}
