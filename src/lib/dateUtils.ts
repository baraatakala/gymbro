/** Hour (local) before which a session counts as the previous gym day (night training). */
export const GYM_DAY_CUTOFF_HOUR = 4

/** Stable local calendar day (YYYY-MM-DD) — midnight boundary. */
export function calendarDayKey(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-CA')
}

/**
 * Gym day key: times before 04:00 local belong to the previous calendar day.
 * Used for streaks, attendance, and “logged today”.
 */
export function gymDayKey(timestamp: number): string {
  const d = new Date(timestamp)
  if (d.getHours() < GYM_DAY_CUTOFF_HOUR) {
    d.setDate(d.getDate() - 1)
  }
  return d.toLocaleDateString('en-CA')
}

/** Local midnight today in ms (for legacy filters). */
export function startOfTodayMs(): number {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** Whether a session falls on the current gym day (4 AM cutoff). */
export function isSessionOnLocalToday(timestamp: number): boolean {
  return gymDayKey(timestamp) === gymDayKey(Date.now())
}
