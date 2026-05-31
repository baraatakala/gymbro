import { gymDayKey } from './dateUtils'
import {
  collapseSessionsByDay,
  mergeSessionsForPrefill,
  sessionHasMeaningfulData,
} from './sessionMerge'

export type TrendMetric = 'avg' | 'max' | 'volume'
export type RecordSortKey = 'weight' | 'date' | 'name'
import {
  DEFAULT_REPS_PER_SET,
  type DayStats,
  type PersonalRecord,
  type SetEntry,
  type SetWeights,
  type WorkoutSession,
} from '../types/workout'

function setValues(sets: SetWeights): number[] {
  return Object.values(sets).filter((w) => w > 0)
}

function exerciseAvgFromSets(sets: SetWeights): number {
  const values = setValues(sets)
  if (values.length === 0) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

function exerciseAvgFromEntries(entries: SetEntry[]): number {
  const weights = entries.map((e) => e.weight).filter((w) => w > 0)
  if (weights.length === 0) return 0
  return weights.reduce((a, b) => a + b, 0) / weights.length
}

function sessionExerciseAvg(session: WorkoutSession, exerciseName: string): number {
  if (session.exerciseSets?.[exerciseName]?.length) {
    return exerciseAvgFromEntries(session.exerciseSets[exerciseName])
  }
  const legacy = session.exercises?.[exerciseName]
  if (legacy) return exerciseAvgFromSets(legacy)
  return 0
}

function sessionExerciseNames(session: WorkoutSession): string[] {
  const names = new Set<string>()
  Object.keys(session.exercises ?? {}).forEach((n) => names.add(n))
  if (session.exerciseSets) Object.keys(session.exerciseSets).forEach((n) => names.add(n))
  return [...names]
}

export function calculateVolume(sets: SetWeights, repsPerSet = DEFAULT_REPS_PER_SET): number {
  return setValues(sets).reduce((sum, w) => sum + w * repsPerSet, 0)
}

function accumulateSessionStats(session: WorkoutSession): {
  weightSum: number
  setCount: number
  totalVolume: number
  exerciseNames: Set<string>
} {
  let weightSum = 0
  let setCount = 0
  let totalVolume = 0
  const exerciseNames = new Set<string>()
  const countedExercises = new Set<string>()

  if (session.exerciseSets) {
    for (const [name, entries] of Object.entries(session.exerciseSets)) {
      countedExercises.add(name)
      exerciseNames.add(name)
      for (const e of entries) {
        if (e.weight <= 0) continue
        weightSum += e.weight
        setCount += 1
        totalVolume += e.weight * Math.max(1, e.reps)
      }
    }
  }

  for (const [name, sets] of Object.entries(session.exercises ?? {})) {
    if (countedExercises.has(name)) continue
    exerciseNames.add(name)
    const values = setValues(sets)
    for (const w of values) {
      if (w <= 0) continue
      weightSum += w
      setCount += 1
      totalVolume += w * DEFAULT_REPS_PER_SET
    }
  }

  if (setCount === 0 && (session.storedVolumeKg ?? 0) > 0) {
    totalVolume += session.storedVolumeKg!
  }

  return { weightSum, setCount, totalVolume, exerciseNames }
}

export function calculateDayStats(
  sessions: WorkoutSession[],
  options?: { cardio?: boolean },
): DayStats {
  const collapsed = collapseSessionsByDay(sessions)
  sessions = collapsed

  if (sessions.length === 0) {
    return {
      totalSessions: 0,
      avgWeight: 0,
      totalVolume: 0,
      improvement: null,
      setCount: 0,
      exerciseCount: 0,
    }
  }

  let weightSum = 0
  let setCount = 0
  let totalVolume = 0
  const uniqueExercises = new Set<string>()

  for (const session of sessions) {
    const acc = accumulateSessionStats(session)
    weightSum += acc.weightSum
    setCount += acc.setCount
    totalVolume += acc.totalVolume
    acc.exerciseNames.forEach((n) => uniqueExercises.add(n))
  }

  const ordered = [...sessions].sort((a, b) => b.timestamp - a.timestamp)

  let improvement: number | null = null
  if (ordered.length >= 2) {
    const oldest = ordered[ordered.length - 1]
    const newest = ordered[0]
    let firstSum = 0
    let lastSum = 0
    let common = 0

    const names = new Set([...sessionExerciseNames(oldest), ...sessionExerciseNames(newest)])
    for (const name of names) {
      const oldAvg = sessionExerciseAvg(oldest, name)
      const newAvg = sessionExerciseAvg(newest, name)
      if (oldAvg <= 0 || newAvg <= 0) continue
      firstSum += oldAvg
      lastSum += newAvg
      common++
    }

    if (common > 0) {
      const firstMean = firstSum / common
      const lastMean = lastSum / common
      if (firstMean > 0) {
        improvement = Number((((lastMean - firstMean) / firstMean) * 100).toFixed(1))
      }
    }
  }

  return {
    totalSessions: countDistinctSessionDays(sessions),
    avgWeight: setCount > 0 ? Number((weightSum / setCount).toFixed(1)) : 0,
    totalVolume: Math.round(totalVolume),
    improvement: options?.cardio ? null : improvement,
    setCount,
    exerciseCount: uniqueExercises.size,
  }
}

/** @deprecated Use exercisesLoggedToday from sessionMerge */
export function exercisesInLatestSession(sessions: WorkoutSession[]): Set<string> {
  const merged = mergeSessionsForPrefill(sessions)
  if (!merged) return new Set()
  const names = new Set<string>()
  for (const name of Object.keys(merged.exercises ?? {})) names.add(name)
  if (merged.exerciseSets) {
    for (const name of Object.keys(merged.exerciseSets)) names.add(name)
  }
  return names
}

/** Distinct gym days with logged work (4 AM cutoff; not raw session row count). */
export function countDistinctSessionDays(sessions: WorkoutSession[]): number {
  if (sessions.length === 0) return 0
  const keys = new Set<string>()
  for (const s of sessions) {
    if (!sessionHasMeaningfulData(s)) continue
    keys.add(gymDayKey(s.timestamp))
  }
  return keys.size
}

export function calculatePersonalRecords(sessions: WorkoutSession[]): PersonalRecord[] {
  const map = new Map<string, PersonalRecord>()

  for (const session of sessions) {
    if (session.exerciseSets) {
      for (const [exercise, entries] of Object.entries(session.exerciseSets)) {
        for (const entry of entries) {
          if (entry.weight <= 0) continue
          const current = map.get(exercise)
          if (
            !current ||
            entry.weight > current.weight ||
            (entry.weight === current.weight &&
              (entry.reps ?? 0) > (current.reps ?? 0))
          ) {
            map.set(exercise, {
              exercise,
              weight: entry.weight,
              reps: entry.reps,
              date: session.timestamp,
              set: 'PR',
            })
          }
        }
      }
    }
    for (const [exercise, sets] of Object.entries(session.exercises ?? {})) {
      for (const [setName, weight] of Object.entries(sets)) {
        if (weight <= 0) continue
        const current = map.get(exercise)
        if (!current || weight > current.weight) {
          map.set(exercise, {
            exercise,
            weight,
            date: session.timestamp,
            set: setName,
          })
        }
      }
    }
  }

  return [...map.values()].sort((a, b) => b.weight - a.weight)
}

function isBetterRecord(a: PersonalRecord, b: PersonalRecord): boolean {
  if (a.weight > b.weight) return true
  if (a.weight < b.weight) return false
  return (a.reps ?? 0) > (b.reps ?? 0)
}

/** Cloud PRs plus session-derived PRs (whichever is best per exercise). */
export function mergePersonalRecordSources(
  cloud: PersonalRecord[],
  sessions: WorkoutSession[],
): PersonalRecord[] {
  const map = new Map<string, PersonalRecord>()
  for (const r of [...calculatePersonalRecords(sessions), ...cloud]) {
    const prev = map.get(r.exercise)
    if (!prev || isBetterRecord(r, prev)) map.set(r.exercise, r)
  }
  return [...map.values()].sort((a, b) => b.weight - a.weight)
}

function sessionExerciseMax(session: WorkoutSession, exerciseName: string): number {
  if (session.exerciseSets?.[exerciseName]?.length) {
    const weights = session.exerciseSets[exerciseName]
      .map((e) => e.weight)
      .filter((w) => w > 0)
    return weights.length ? Math.max(...weights) : 0
  }
  const legacy = session.exercises?.[exerciseName]
  if (legacy) {
    const values = setValues(legacy)
    return values.length ? Math.max(...values) : 0
  }
  return 0
}

function sessionExerciseVolume(session: WorkoutSession, exerciseName: string): number {
  if (session.exerciseSets?.[exerciseName]?.length) {
    return session.exerciseSets[exerciseName].reduce(
      (sum, e) => (e.weight > 0 ? sum + e.weight * Math.max(1, e.reps) : sum),
      0,
    )
  }
  const legacy = session.exercises?.[exerciseName]
  if (legacy) return calculateVolume(legacy)
  return 0
}

/** One point per calendar day (merged saves), chronological. */
export function getExerciseTrend(
  sessions: WorkoutSession[],
  exerciseName: string,
  options?: { cardio?: boolean; metric?: TrendMetric },
): { date: string; timestamp: number; value: number }[] {
  const metric = options?.metric ?? (options?.cardio ? 'avg' : 'max')
  const chronological = collapseSessionsByDay(sessions).sort((a, b) => a.timestamp - b.timestamp)

  return chronological
    .filter(
      (s) =>
        s.exercises?.[exerciseName] ||
        (s.exerciseSets && s.exerciseSets[exerciseName]?.length),
    )
    .map((s) => {
      let value = 0
      if (metric === 'max') value = sessionExerciseMax(s, exerciseName)
      else if (metric === 'volume') value = sessionExerciseVolume(s, exerciseName)
      else value = sessionExerciseAvg(s, exerciseName)

      return {
        date: new Date(s.timestamp).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
        }),
        timestamp: s.timestamp,
        value: Number(value.toFixed(1)),
      }
    })
    .filter((p) => p.value > 0)
}

/** Total logged volume per session day (all exercises in section). */
export function getSectionVolumeTrend(
  sessions: WorkoutSession[],
): { date: string; timestamp: number; volume: number }[] {
  const chronological = collapseSessionsByDay(sessions).sort((a, b) => a.timestamp - b.timestamp)

  return chronological.map((s) => ({
    date: new Date(s.timestamp).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
    }),
    timestamp: s.timestamp,
    volume: Math.round(accumulateSessionStats(s).totalVolume),
  }))
}

/** Average calendar days between consecutive session days (not span ÷ count). */
export function averageDaysBetweenSessions(sessions: WorkoutSession[]): number | null {
  const keys = [
    ...new Set(
      sessions.filter(sessionHasMeaningfulData).map((s) => gymDayKey(s.timestamp)),
    ),
  ].sort()
  if (keys.length < 2) return null

  let gapSum = 0
  for (let i = 1; i < keys.length; i++) {
    const prev = new Date(`${keys[i - 1]}T12:00:00`).getTime()
    const curr = new Date(`${keys[i]}T12:00:00`).getTime()
    gapSum += (curr - prev) / (1000 * 60 * 60 * 24)
  }
  return gapSum / (keys.length - 1)
}

export function filterRecordsForSection(
  records: PersonalRecord[],
  sectionExerciseNames: string[],
): PersonalRecord[] {
  if (sectionExerciseNames.length === 0) return []
  const names = new Set(sectionExerciseNames.map((n) => n.toLowerCase()))
  return records.filter((r) => names.has(r.exercise.toLowerCase()))
}

export function sortPersonalRecords(
  records: PersonalRecord[],
  sortBy: RecordSortKey,
): PersonalRecord[] {
  const copy = [...records]
  if (sortBy === 'date') {
    return copy.sort((a, b) => b.date - a.date)
  }
  if (sortBy === 'name') {
    return copy.sort((a, b) => a.exercise.localeCompare(b.exercise))
  }
  return copy.sort((a, b) => {
    if (b.weight !== a.weight) return b.weight - a.weight
    return (b.reps ?? 0) - (a.reps ?? 0)
  })
}

/** Brzycki estimate — useful for comparing strength across rep ranges. */
export function estimateOneRepMax(weightKg: number, reps: number): number {
  if (weightKg <= 0 || reps <= 0) return 0
  if (reps === 1) return weightKg
  return Math.round(weightKg * (36 / (37 - Math.min(reps, 12))))
}

export function daysSinceLastExerciseLog(
  sessions: WorkoutSession[],
  exerciseName: string,
): number | null {
  const key = exerciseName.toLowerCase()
  let latest = 0
  for (const s of sessions) {
    const names = sessionExerciseNames(s).map((n) => n.toLowerCase())
    if (names.includes(key) && s.timestamp > latest) latest = s.timestamp
  }
  if (!latest) return null
  const dayMs = 24 * 60 * 60 * 1000
  return Math.floor((Date.now() - latest) / dayMs)
}

export function compareToLast(
  _exercise: string,
  current: number[],
  lastSets?: SetWeights,
  lastEntries?: SetEntry[],
  options?: { cardio?: boolean },
): string {
  let lastAvg = 0
  if (lastEntries?.length) {
    const weights = lastEntries.map((e) => e.weight).filter((w) => w > 0)
    if (weights.length) lastAvg = weights.reduce((a, b) => a + b, 0) / weights.length
  } else if (lastSets) {
    lastAvg = exerciseAvgFromSets(lastSets)
  }
  if (lastAvg <= 0) return ''
  const positive = current.filter((w) => w > 0)
  if (positive.length === 0) return ''
  const currentAvg = positive.reduce((a, b) => a + b, 0) / positive.length
  if (currentAvg <= 0) return ''
  const diff = currentAvg - lastAvg
  const unit = options?.cardio ? 'min' : 'kg'
  if (diff > 0) return `(+${diff.toFixed(1)} ${unit} vs last)`
  if (diff < 0) return `(${diff.toFixed(1)} ${unit} vs last)`
  return '(same as last)'
}
