import { gymDayKey, isSessionOnLocalToday } from './dateUtils'
import type { SetEntry, SetWeights, WorkoutSession } from '../types/workout'

export function sessionHasLoggedExercises(session: WorkoutSession): boolean {
  const names = Object.keys(session.exercises ?? {})
  if (names.length > 0) return true
  return Boolean(session.exerciseSets && Object.keys(session.exerciseSets).length > 0)
}

/** Session has real logged exercises (not volume-only corrupt shells). */
export function sessionHasMeaningfulData(session: WorkoutSession): boolean {
  return sessionHasLoggedExercises(session)
}

/** DB volume exists but exercise payload missing — needs re-save or local sync. */
export function sessionLooksCorrupt(session: WorkoutSession): boolean {
  return (session.storedVolumeKg ?? 0) > 0 && !sessionHasLoggedExercises(session)
}

export function sessionsLookCorrupt(sessions: WorkoutSession[]): boolean {
  return sessions.some(sessionLooksCorrupt)
}

export function sessionsHaveLoggedData(sessions: WorkoutSession[]): boolean {
  return sessions.some(sessionHasMeaningfulData)
}

export function sessionsBeforeToday(sessions: WorkoutSession[]): WorkoutSession[] {
  return sessions.filter((s) => !isSessionOnLocalToday(s.timestamp))
}

/** Exercises saved today for this section (not all-time history). */
export function exercisesLoggedToday(sessions: WorkoutSession[]): Set<string> {
  const todaySessions = sessions.filter((s) => isSessionOnLocalToday(s.timestamp))
  const merged = mergeSessionsForPrefill(todaySessions)
  if (!merged) return new Set()
  const names = new Set<string>()
  for (const name of Object.keys(merged.exercises ?? {})) names.add(name)
  if (merged.exerciseSets) {
    for (const name of Object.keys(merged.exerciseSets)) names.add(name)
  }
  return names
}

export function sessionsTodayOnly(sessions: WorkoutSession[]): WorkoutSession[] {
  const today = sessions.filter((s) => isSessionOnLocalToday(s.timestamp))
  const merged = mergeSessionsForPrefill(today)
  return merged ? [merged] : []
}

/** One row per calendar day (merges duplicate saves on the same day). */
export function collapseSessionsByDay(sessions: WorkoutSession[]): WorkoutSession[] {
  if (sessions.length === 0) return []
  const byDay = new Map<string, WorkoutSession[]>()
  for (const s of sessions) {
    const key = gymDayKey(s.timestamp)
    const group = byDay.get(key) ?? []
    group.push(s)
    byDay.set(key, group)
  }
  const out: WorkoutSession[] = []
  for (const group of byDay.values()) {
    const merged = mergeSessionsForPrefill(group)
    if (merged && sessionHasMeaningfulData(merged)) out.push(merged)
  }
  return out.sort((a, b) => b.timestamp - a.timestamp)
}

/** Merge prior sessions (excluding today) for “vs last workout” comparisons. */
export function mergePreviousSessionForPrefill(sessions: WorkoutSession[]): WorkoutSession | null {
  return mergeSessionsForPrefill(sessionsBeforeToday(sessions))
}

/** Merge per-exercise session rows into one object for prefill / compare. */
export function mergeSessionsForPrefill(sessions: WorkoutSession[]): WorkoutSession | null {
  if (sessions.length === 0) return null

  const exercises: Record<string, SetWeights> = {}
  const exerciseSets: Record<string, SetEntry[]> = {}
  const sorted = [...sessions].sort((a, b) => b.timestamp - a.timestamp)

  for (const session of sorted) {
    for (const [name, sets] of Object.entries(session.exercises ?? {})) {
      if (!exercises[name]) exercises[name] = sets
    }
    if (session.exerciseSets) {
      for (const [name, entries] of Object.entries(session.exerciseSets)) {
        if (!exerciseSets[name]) exerciseSets[name] = entries
      }
    }
  }

  const latest = sorted[0]
  const storedVolumeKg = sorted.reduce(
    (max, s) => Math.max(max, s.storedVolumeKg ?? 0),
    0,
  )

  let startedAt: string | undefined
  let earliestStart = Infinity
  for (const s of sorted) {
    if (!s.startedAt) continue
    const t = new Date(s.startedAt).getTime()
    if (!Number.isNaN(t) && t < earliestStart) {
      earliestStart = t
      startedAt = s.startedAt
    }
  }

  const completedSession = sorted.find((s) => s.status === 'completed')
  const finishedAt =
    completedSession?.finishedAt ??
    sorted.find((s) => s.finishedAt)?.finishedAt
  const status = completedSession ? 'completed' : latest.status

  return {
    ...latest,
    exercises,
    exerciseSets: Object.keys(exerciseSets).length > 0 ? exerciseSets : undefined,
    storedVolumeKg: storedVolumeKg > 0 ? storedVolumeKg : latest.storedVolumeKg,
    startedAt,
    finishedAt,
    status,
  }
}
