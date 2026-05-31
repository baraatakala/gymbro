import { calculatePersonalRecords } from './analytics'
import { isSessionOnLocalToday } from './dateUtils'
import { exercisesLoggedToday } from './sessionMerge'
import type { SaveSetResult } from './supabaseSessions'
import { METADATA_KEYS, type SetEntry, type SetWeights, type WorkoutSession } from '../types/workout'
import { getAllSessions, getSessionsForDay, saveSession } from './storage'

function setsToLegacy(sets: SetEntry[]): Record<string, number> {
  const out: Record<string, number> = {}
  sets.forEach((s, i) => {
    out[`Set ${i + 1}`] = s.weight
  })
  return out
}

function readExercisesFromKey(key: string): Record<string, SetWeights> {
  try {
    const raw = JSON.parse(localStorage.getItem(key) || '{}') as Record<string, unknown>
    const exercises: Record<string, SetWeights> = {}
    for (const [name, sets] of Object.entries(raw)) {
      if (METADATA_KEYS.has(name) || typeof sets !== 'object' || sets === null) continue
      const normalized: SetWeights = {}
      for (const [setName, weight] of Object.entries(sets as Record<string, unknown>)) {
        const w = typeof weight === 'number' ? weight : parseFloat(String(weight))
        if (!Number.isNaN(w)) normalized[setName] = Math.max(0, w)
      }
      if (Object.keys(normalized).length > 0) exercises[name] = normalized
    }
    return exercises
  } catch {
    return {}
  }
}

function writeSessionKey(
  key: string,
  timestamp: number,
  exercises: Record<string, SetWeights>,
): WorkoutSession {
  const now = new Date()
  const payload: Record<string, unknown> = {
    timestamp,
    saveTime: now.toLocaleTimeString('en-GB', { hour12: false }),
    saveDate: now.toLocaleDateString('en-GB'),
    ...exercises,
  }
  localStorage.setItem(key, JSON.stringify(payload))
  const day = key.slice(0, key.lastIndexOf('_'))
  return {
    key,
    day,
    timestamp,
    saveTime: payload.saveTime as string,
    saveDate: payload.saveDate as string,
    exercises,
  }
}

function detectLocalPr(
  exerciseName: string,
  sets: SetEntry[],
  beforeSave: WorkoutSession[],
): { prHit: boolean; prMessage?: string } {
  const prior = calculatePersonalRecords(beforeSave)
  const prev = prior.find((r) => r.exercise === exerciseName)
  const bestWeight = Math.max(...sets.map((s) => s.weight), 0)
  const bestReps = sets.reduce(
    (best, s) => (s.weight === bestWeight && s.reps > best ? s.reps : best),
    0,
  )
  if (bestWeight <= 0) return { prHit: false }
  if (!prev || bestWeight > prev.weight) {
    return { prHit: true, prMessage: `🏆 New PR — ${bestWeight} kg` }
  }
  if (bestWeight === prev.weight && bestReps > (prev.reps ?? 0)) {
    return { prHit: true, prMessage: `🏆 PR reps — ${bestWeight} kg × ${bestReps}` }
  }
  return { prHit: false }
}

/** Persist a set log to localStorage when cloud save is unavailable. */
export function saveExerciseLocally(
  day: string,
  exerciseName: string,
  sets: SetEntry[],
): SaveSetResult {
  const legacy = setsToLegacy(sets)
  const beforeAll = getAllSessions()
  const daySessions = getSessionsForDay(day)
  const todaySession = daySessions.find((s) => isSessionOnLocalToday(s.timestamp))

  let session: WorkoutSession
  if (todaySession) {
    const exercises = {
      ...readExercisesFromKey(todaySession.key),
      [exerciseName]: legacy,
    }
    session = writeSessionKey(todaySession.key, todaySession.timestamp, exercises)
    session.exerciseSets = {
      ...(todaySession.exerciseSets ?? {}),
      [exerciseName]: sets,
    }
  } else {
    session = saveSession(day, { [exerciseName]: legacy })
    session.exerciseSets = { [exerciseName]: sets }
  }

  const refreshed = getSessionsForDay(day)
  const { prHit, prMessage } = detectLocalPr(exerciseName, sets, beforeAll)

  return {
    session: { ...session, exerciseSets: session.exerciseSets },
    sessions: refreshed,
    prHit,
    prMessage,
  }
}

/** Local finish: true when at least one exercise was saved today for this section. */
export function finishWorkoutLocally(day: string): boolean {
  return exercisesLoggedToday(getSessionsForDay(day)).size > 0
}
