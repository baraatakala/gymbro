/** Local midnight today in ms (for “logged today” filters). */
export function startOfTodayMs(): number {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** Stable local calendar day key (YYYY-MM-DD) for grouping sessions. */
export function calendarDayKey(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-CA')
}

/** Whether a session timestamp falls on the user's local calendar today. */
export function isSessionOnLocalToday(timestamp: number): boolean {
  return calendarDayKey(timestamp) === calendarDayKey(Date.now())
}
