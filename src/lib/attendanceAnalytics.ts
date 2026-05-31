import { calendarDayKey } from './dateUtils'
import { getEarliestLocalCheckInForDay } from './checkIn'
import { computeTrainingStreak } from './trainingCalendar'
import { getRestEventsInRange } from './restEventLog'
import type { AttendanceReport, AttendanceSession, DateRange } from '../types/attendance'

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function defaultDateRange(): DateRange {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 89)
  return { from: toIsoDate(from), to: toIsoDate(to) }
}

export function toIsoDate(d: Date): string {
  return d.toLocaleDateString('en-CA')
}

const MAX_RANGE_DAYS = 730

/** Clamp invalid ranges; swap from/to if reversed. */
export function normalizeDateRange(range: DateRange): DateRange {
  let from = range.from?.trim() ?? ''
  let to = range.to?.trim() ?? ''
  if (!from || !to) {
    return defaultDateRange()
  }
  if (from > to) {
    ;[from, to] = [to, from]
  }
  const fromD = new Date(`${from}T12:00:00`)
  const toD = new Date(`${to}T12:00:00`)
  const spanDays = (toD.getTime() - fromD.getTime()) / 86400000
  if (spanDays > MAX_RANGE_DAYS) {
    const clampedFrom = new Date(toD)
    clampedFrom.setDate(clampedFrom.getDate() - MAX_RANGE_DAYS)
    from = toIsoDate(clampedFrom)
  }
  return { from, to }
}

export function parseRange(range: DateRange): { fromMs: number; toMs: number } {
  const normalized = normalizeDateRange(range)
  const fromMs = new Date(`${normalized.from}T00:00:00`).getTime()
  const toMs = new Date(`${normalized.to}T23:59:59.999`).getTime()
  return { fromMs, toMs }
}

function inRange(dayKey: string, range: DateRange): boolean {
  return dayKey >= range.from && dayKey <= range.to
}

/** Distinct gym days from training calendar + session timestamps. */
export function collectGymDayKeys(
  trainedDates: string[],
  sessions: AttendanceSession[],
  range: DateRange,
): string[] {
  const keys = new Set<string>()
  for (const d of trainedDates) {
    if (inRange(d, range)) keys.add(d)
  }
  for (const s of sessions) {
    const k = calendarDayKey(s.timestamp)
    if (inRange(k, range) && s.sets.length > 0) keys.add(k)
  }
  return [...keys].sort()
}

function groupSessionsByGymDay(
  sessions: AttendanceSession[],
  range: DateRange,
): Map<string, AttendanceSession[]> {
  const map = new Map<string, AttendanceSession[]>()
  for (const s of sessions) {
    const k = calendarDayKey(s.timestamp)
    if (!inRange(k, range) || s.sets.length === 0) continue
    const list = map.get(k) ?? []
    list.push(s)
    map.set(k, list)
  }
  return map
}

function daySetTimes(daySessions: AttendanceSession[]): number[] {
  const times: number[] = []
  for (const s of daySessions) {
    for (const set of s.sets) {
      const t = new Date(set.loggedAt).getTime()
      if (!Number.isNaN(t)) times.push(t)
    }
  }
  return times.sort((a, b) => a - b)
}

function sessionDurationMinutes(dayKey: string, daySessions: AttendanceSession[]): number {
  let startMs: number | null = null
  let endMs: number | null = null
  const setTimes = daySetTimes(daySessions)
  const totalSets = daySessions.reduce((n, s) => n + s.sets.length, 0)

  const localCheckIn = getEarliestLocalCheckInForDay(dayKey)
  if (localCheckIn) {
    const t = new Date(localCheckIn).getTime()
    if (!Number.isNaN(t)) startMs = t
  }

  for (const s of daySessions) {
    if (s.startedAt) {
      const t = new Date(s.startedAt).getTime()
      if (!Number.isNaN(t)) startMs = startMs === null ? t : Math.min(startMs, t)
    }
    if (s.finishedAt) {
      const t = new Date(s.finishedAt).getTime()
      if (!Number.isNaN(t)) endMs = endMs === null ? t : Math.max(endMs, t)
    }
  }

  if (setTimes.length > 0) {
    startMs = startMs === null ? setTimes[0] : Math.min(startMs, setTimes[0])
    endMs = endMs === null ? setTimes[setTimes.length - 1] : Math.max(endMs, setTimes[setTimes.length - 1])
  }

  if (startMs === null || endMs === null) return 0

  let span = endMs - startMs
  // Same-second saves: estimate from set count (~2.5 min per set incl. rest)
  if (span < 120_000 && totalSets >= 2) {
    return Math.max(10, Math.round(totalSets * 2.5))
  }
  if (span < 60_000) return totalSets >= 1 ? 8 : 0
  return Math.round(span / 60_000)
}

function checkInToFirstSetMinutes(dayKey: string, daySessions: AttendanceSession[]): number | null {
  let checkIn: number | null = null
  let firstSet: number | null = null

  const local = getEarliestLocalCheckInForDay(dayKey)
  if (local) {
    const t = new Date(local).getTime()
    if (!Number.isNaN(t)) checkIn = t
  }

  for (const s of daySessions) {
    if (s.startedAt) {
      const t = new Date(s.startedAt).getTime()
      if (!Number.isNaN(t)) checkIn = checkIn === null ? t : Math.min(checkIn, t)
    }
    for (const set of s.sets) {
      const t = new Date(set.loggedAt).getTime()
      if (!Number.isNaN(t)) firstSet = firstSet === null ? t : Math.min(firstSet, t)
    }
  }

  if (checkIn === null || firstSet === null) return null
  const gapMs = firstSet - checkIn
  if (gapMs < 30_000) return 0
  return Math.round(gapMs / 60_000)
}

function inferRestFromSets(sessions: AttendanceSession[]): Map<string, number[]> {
  const gaps = new Map<string, number[]>()
  for (const s of sessions) {
    const byEx = new Map<string, number[]>()
    for (const set of s.sets) {
      const t = new Date(set.loggedAt).getTime()
      if (Number.isNaN(t)) continue
      const list = byEx.get(set.exerciseName) ?? []
      list.push(t)
      byEx.set(set.exerciseName, list)
    }
    for (const [ex, times] of byEx) {
      times.sort((a, b) => a - b)
      for (let i = 1; i < times.length; i++) {
        const sec = Math.round((times[i] - times[i - 1]) / 1000)
        if (sec >= 30 && sec <= 600) {
          const key = ex
          const arr = gaps.get(key) ?? []
          arr.push(sec)
          gaps.set(key, arr)
        }
      }
    }
  }
  return gaps
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0
  const s = [...nums].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

function weeksInRange(range: DateRange): string[] {
  const weeks = new Set<string>()
  const start = new Date(`${range.from}T12:00:00`)
  const end = new Date(`${range.to}T12:00:00`)
  const d = new Date(start)
  while (d <= end) {
    weeks.add(weekKey(d))
    d.setDate(d.getDate() + 1)
  }
  return [...weeks]
}

function weekKey(d: Date): string {
  const copy = new Date(d)
  copy.setHours(12, 0, 0, 0)
  const day = copy.getDay()
  const diff = copy.getDate() - day + (day === 0 ? -6 : 1)
  copy.setDate(diff)
  return toIsoDate(copy)
}

function weeklyTargetHitRate(
  gymDays: string[],
  range: DateRange,
  targetDays: number,
): number {
  const weeks = weeksInRange(range)
  if (weeks.length === 0) return 0
  let hit = 0
  for (const wk of weeks) {
    const wkStart = new Date(`${wk}T12:00:00`).getTime()
    const wkEnd = wkStart + 7 * 86400000
    const count = gymDays.filter((d) => {
      const t = new Date(`${d}T12:00:00`).getTime()
      return t >= wkStart && t < wkEnd
    }).length
    if (count >= targetDays) hit++
  }
  return Math.round((hit / weeks.length) * 100)
}

export function buildAttendanceReport(
  trainedDates: string[],
  sessions: AttendanceSession[],
  range: DateRange,
  options: {
    weeklyTargetDays: number
    planSections: string[]
  },
): AttendanceReport {
  const normalizedRange = normalizeDateRange(range)
  const { fromMs, toMs } = parseRange(normalizedRange)
  const gymDays = collectGymDayKeys(trainedDates, sessions, normalizedRange)
  const byDay = groupSessionsByGymDay(sessions, normalizedRange)
  const streak = computeTrainingStreak(
    trainedDates.length > 0 ? trainedDates : gymDays,
  )

  const durations: number[] = []
  const checkInGaps: number[] = []
  const sectionVisits = new Map<string, number>()
  const sectionMinutes = new Map<string, number>()
  const hourCounts = new Map<number, number>()

  for (const [dayKey, daySessions] of byDay) {
    const mins = sessionDurationMinutes(dayKey, daySessions)
    if (mins > 0) durations.push(mins)
    const gap = checkInToFirstSetMinutes(dayKey, daySessions)
    if (gap !== null) checkInGaps.push(gap)

    for (const s of daySessions) {
      sectionVisits.set(s.section, (sectionVisits.get(s.section) ?? 0) + 1)
      sectionMinutes.set(s.section, (sectionMinutes.get(s.section) ?? 0) + mins)
    }

    let firstSetMs: number | null = null
    for (const s of daySessions) {
      for (const set of s.sets) {
        const t = new Date(set.loggedAt).getTime()
        if (!Number.isNaN(t)) firstSetMs = firstSetMs === null ? t : Math.min(firstSetMs, t)
      }
    }
    if (firstSetMs !== null) {
      const hour = new Date(firstSetMs).getHours()
      hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1)
    }
  }

  const weekdayCounts = new Map<number, number>()
  for (const d of gymDays) {
    const wd = new Date(`${d}T12:00:00`).getDay()
    weekdayCounts.set(wd, (weekdayCounts.get(wd) ?? 0) + 1)
  }

  const weekdayVisits = WEEKDAY_LABELS.map((weekday, wd) => ({
    weekday,
    count: weekdayCounts.get(wd) ?? 0,
  }))

  let mostSkippedWeekday: string | null = null
  if (weekdayVisits.length > 0) {
    const min = weekdayVisits.reduce((a, b) => (a.count <= b.count ? a : b))
    const max = weekdayVisits.reduce((a, b) => (a.count >= b.count ? a : b))
    if (max.count > min.count) mostSkippedWeekday = min.weekday
  }

  let bestHour: AttendanceReport['bestHourToTrain'] = null
  if (hourCounts.size > 0) {
    let bestH = 0
    let bestN = 0
    for (const [h, n] of hourCounts) {
      if (n > bestN) {
        bestN = n
        bestH = h
      }
    }
    const label = `${String(bestH).padStart(2, '0')}:00–${String(bestH).padStart(2, '0')}:59`
    bestHour = { hour: bestH, label, sessionDays: bestN }
  }

  const sectionVisitCounts = [...sectionVisits.entries()]
    .map(([section, visits]) => {
      const total = sectionMinutes.get(section) ?? 0
      return {
        section,
        visits,
        avgMinutes: visits > 0 ? Math.round(total / visits) : 0,
      }
    })
    .sort((a, b) => b.visits - a.visits)

  const sectionTimeMinutes = [...sectionMinutes.entries()]
    .map(([section, totalMinutes]) => ({
      section,
      totalMinutes: Math.round(totalMinutes),
    }))
    .sort((a, b) => b.totalMinutes - a.totalMinutes)

  const rangeDays =
    (new Date(`${normalizedRange.to}T12:00:00`).getTime() -
      new Date(`${normalizedRange.from}T12:00:00`).getTime()) /
      86400000 +
    1
  const weeks = Math.max(1, rangeDays / 7)

  const setRest = inferRestFromSets(
    sessions.filter((s) => {
      const k = calendarDayKey(s.timestamp)
      return inRange(k, normalizedRange)
    }),
  )
  const localRest = getRestEventsInRange(fromMs, toMs)
  for (const e of localRest) {
    const arr = setRest.get(e.exercise) ?? []
    arr.push(e.seconds)
    setRest.set(e.exercise, arr)
  }

  const longRestExercises = [...setRest.entries()]
    .map(([exercise, secs]) => ({
      exercise,
      medianRestSec: Math.round(median(secs)),
      samples: secs.length,
    }))
    .filter((r) => r.samples >= 2)
    .sort((a, b) => b.medianRestSec - a.medianRestSec)
    .slice(0, 8)

  const trainedSections = new Set(sectionVisitCounts.map((s) => s.section))
  const neglectedSections = options.planSections.filter((p) => !trainedSections.has(p))

  const insights: AttendanceReport['insights'] = []

  insights.push({
    icon: '📅',
    title: 'Gym visits',
    message: `${gymDays.length} day${gymDays.length !== 1 ? 's' : ''} in this period (${(gymDays.length / weeks).toFixed(1)}/week).`,
    tone: 'neutral',
  })

  if (durations.length > 0) {
    const avg = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    insights.push({
      icon: '⏱️',
      title: 'Average time in gym',
      message: `~${avg} min per visit (check-in → last set, or finish workout when marked).`,
      tone: 'positive',
    })
  }

  insights.push({
    icon: '🔥',
    title: 'Streak',
    message: `Current ${streak.current} day${streak.current !== 1 ? 's' : ''} · Longest ${streak.longest} · ${streak.last28}/28 days active.`,
    tone: streak.current >= 3 ? 'positive' : 'neutral',
  })

  const hitPct = weeklyTargetHitRate(gymDays, normalizedRange, options.weeklyTargetDays)
  insights.push({
    icon: '🎯',
    title: 'Weekly goal',
    message: `${hitPct}% of weeks hit your ${options.weeklyTargetDays}-day target in this range.`,
    tone: hitPct >= 50 ? 'positive' : 'warning',
  })

  if (checkInGaps.length > 0) {
    const avgGap = Math.round(checkInGaps.reduce((a, b) => a + b, 0) / checkInGaps.length)
    insights.push({
      icon: '🚪',
      title: 'Warm-up gap',
      message:
        avgGap === 0
          ? 'You start logging sets right after check-in — great flow.'
          : `Avg ${avgGap} min from check-in to first set — shorten if you're waiting too long.`,
      tone: avgGap > 15 ? 'warning' : 'neutral',
    })
  } else if (gymDays.length > 0) {
    insights.push({
      icon: '🚪',
      title: 'Warm-up gap',
      message:
        'Open a section before your first save (or apply timing migration) to measure check-in → first set.',
      tone: 'neutral',
    })
  }

  if (bestHour) {
    insights.push({
      icon: '🕐',
      title: 'Most consistent start time',
      message: `You often start around ${bestHour.label} (${bestHour.sessionDays} session days).`,
      tone: 'positive',
    })
  }

  if (longRestExercises[0]) {
    const top = longRestExercises[0]
    insights.push({
      icon: '💤',
      title: 'Longest rests',
      message: `${top.exercise}: ~${Math.round(top.medianRestSec / 60)} min median between sets.`,
      tone: top.medianRestSec > 180 ? 'warning' : 'neutral',
    })
  }

  if (neglectedSections.length > 0 && neglectedSections.length <= 5) {
    insights.push({
      icon: '⚠️',
      title: 'Sections not trained',
      message: `No logs in range: ${neglectedSections.join(', ')}.`,
      tone: 'warning',
    })
  }

  const topSectionByTime = sectionTimeMinutes[0]?.section ?? null

  if (topSectionByTime && sectionTimeMinutes[0].totalMinutes > 0) {
    insights.push({
      icon: '🏋️',
      title: 'Most time per visit',
      message: `${topSectionByTime} — ~${sectionVisitCounts.find((s) => s.section === topSectionByTime)?.avgMinutes ?? sectionTimeMinutes[0].totalMinutes} min average.`,
      tone: 'neutral',
    })
  }

  return {
    range: normalizedRange,
    gymVisits: gymDays.length,
    gymVisitsPerWeek: Number((gymDays.length / weeks).toFixed(1)),
    avgSessionMinutes:
      durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : null,
    longestStreak: streak.longest,
    currentStreak: streak.current,
    weeklyTargetDays: options.weeklyTargetDays,
    weeksHitTargetPct: hitPct,
    avgCheckInToFirstSetMinutes:
      checkInGaps.length > 0
        ? Math.round(checkInGaps.reduce((a, b) => a + b, 0) / checkInGaps.length)
        : null,
    sectionVisitCounts,
    sectionTimeMinutes,
    mostFrequentSections: sectionVisitCounts.slice(0, 3).map((s) => s.section),
    neglectedSections,
    weekdayVisits,
    mostSkippedWeekday,
    bestHourToTrain: bestHour,
    longRestExercises,
    topSectionByTime,
    insights,
  }
}
