import type { AttendanceReport } from '../types/attendance'
import type { InsightsRow } from './insightsTables'

function escapeCsv(cell: string | number): string {
  const s = String(cell)
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function downloadCsv(filename: string, lines: string[]): void {
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function exportInsightsTable(
  tableName: string,
  columns: string[],
  rows: InsightsRow[],
  range: AttendanceReport['range'],
): void {
  const header = columns.map(escapeCsv).join(',')
  const body = rows.map((r) =>
    [
      r.label,
      r.value,
      r.value2 ?? '',
      r.unit ?? '',
      r.meta ?? '',
    ]
      .map(escapeCsv)
      .join(','),
  )
  const stamp = `${range.from}_${range.to}`
  downloadCsv(`gymbro-${tableName}-${stamp}.csv`, [header, ...body])
}

export function exportInsightsSummary(
  report: AttendanceReport,
  rows: { metric: string; value: string }[],
): void {
  const lines = [
    'metric,value',
    ...rows.map((r) => `${escapeCsv(r.metric)},${escapeCsv(r.value)}`),
    `range,${escapeCsv(`${report.range.from} → ${report.range.to}`)}`,
    `gym_visits,${report.gymVisits}`,
    `avg_minutes,${report.avgSessionMinutes ?? ''}`,
    `weeks_on_target_pct,${report.weeksHitTargetPct}`,
  ]
  downloadCsv(`gymbro-insights-summary-${report.range.from}.csv`, lines)
}
