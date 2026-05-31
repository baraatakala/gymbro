import { calendarDayKey } from './dateUtils'

/** `trained_on` values from DB (YYYY-MM-DD). */
export function computeTrainingStreak(trainedDates: string[]): {
  current: number
  longest: number
  last28: number
} {
  if (trainedDates.length === 0) {
    return { current: 0, longest: 0, last28: 0 }
  }

  const set = new Set(trainedDates)
  const todayKey = calendarDayKey(Date.now())
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const startOffset = set.has(todayKey) ? 0 : 1
  let current = 0
  for (let i = startOffset; i < 365; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    if (set.has(calendarDayKey(d.getTime()))) current++
    else break
  }

  const sorted = [...set].sort()
  let longest = 0
  let run = 0
  let prev: Date | null = null
  for (const key of sorted) {
    const d = new Date(key + 'T12:00:00')
    if (prev) {
      const diff = (d.getTime() - prev.getTime()) / 86400000
      run = diff === 1 ? run + 1 : 1
    } else {
      run = 1
    }
    longest = Math.max(longest, run)
    prev = d
  }

  let last28 = 0
  for (let i = 0; i < 28; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    if (set.has(calendarDayKey(d.getTime()))) last28++
  }

  return { current, longest, last28 }
}

export function buildCalendarCells(daysBack = 27): { key: string; weekday: string }[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const cells: { key: string; weekday: string }[] = []
  for (let i = daysBack; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    cells.push({
      key: calendarDayKey(d.getTime()),
      weekday: d.toLocaleDateString('en-GB', { weekday: 'narrow' }),
    })
  }
  return cells
}
