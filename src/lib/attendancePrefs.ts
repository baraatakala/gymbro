const KEY = 'gymbro_weekly_target_days'

export function getWeeklyTargetDays(): number {
  try {
    const n = parseInt(localStorage.getItem(KEY) ?? '4', 10)
    if (n >= 1 && n <= 7) return n
  } catch {
    /* ignore */
  }
  return 4
}

export function setWeeklyTargetDays(days: number): void {
  localStorage.setItem(KEY, String(Math.min(7, Math.max(1, days))))
}
