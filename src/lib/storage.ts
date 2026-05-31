import { METADATA_KEYS, type SetWeights, type WorkoutSession } from '../types/workout'

const SKIP_KEYS = new Set(['customExercises', 'darkMode', 'pomodoroState'])

function parseSessionKey(key: string): { day: string; timestamp: number } | null {
  const lastUnderscore = key.lastIndexOf('_')
  if (lastUnderscore <= 0) return null
  const timestamp = Number(key.slice(lastUnderscore + 1))
  if (!Number.isFinite(timestamp) || timestamp < 1e12) return null
  const day = key.slice(0, lastUnderscore)
  return day ? { day, timestamp } : null
}

function isWorkoutSessionKey(key: string): boolean {
  return parseSessionKey(key) !== null
}

function extractExercises(data: Record<string, unknown>): Record<string, SetWeights> {
  const exercises: Record<string, SetWeights> = {}

  for (const [name, sets] of Object.entries(data)) {
    if (METADATA_KEYS.has(name) || typeof sets !== 'object' || sets === null) continue
    const normalized: SetWeights = {}
    for (const [setName, weight] of Object.entries(sets as Record<string, unknown>)) {
      const w = typeof weight === 'number' ? weight : parseFloat(String(weight))
      if (!Number.isNaN(w)) normalized[setName] = Math.max(0, w)
    }
    if (Object.keys(normalized).length > 0) exercises[name] = normalized
  }

  return exercises
}

function readSession(key: string): WorkoutSession | null {
  const parsed = parseSessionKey(key)
  if (!parsed) return null

  try {
    const raw = JSON.parse(localStorage.getItem(key) || '{}') as Record<string, unknown>
    const exercises = extractExercises(raw)
    if (Object.keys(exercises).length === 0) return null

    return {
      key,
      day: parsed.day,
      timestamp: (raw.timestamp as number) ?? parsed.timestamp,
      saveTime: raw.saveTime as string | undefined,
      saveDate: raw.saveDate as string | undefined,
      exercises,
    }
  } catch {
    return null
  }
}

export function getSessionsForDay(day: string): WorkoutSession[] {
  const sessions: WorkoutSession[] = []

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key?.startsWith(`${day}_`)) continue
    const session = readSession(key)
    if (session) sessions.push(session)
  }

  return sessions.sort((a, b) => b.timestamp - a.timestamp)
}

/** storage_key values in localStorage (for claiming orphan cloud rows on this device). */
export function getWorkoutStorageKeys(): string[] {
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && isWorkoutSessionKey(key)) keys.push(key)
  }
  return keys
}

export function getAllSessions(): WorkoutSession[] {
  const sessions: WorkoutSession[] = []

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key || SKIP_KEYS.has(key)) continue
    if (!isWorkoutSessionKey(key)) continue
    const session = readSession(key)
    if (session) sessions.push(session)
  }

  return sessions.sort((a, b) => b.timestamp - a.timestamp)
}

export function saveSession(
  day: string,
  exercises: Record<string, SetWeights>,
  suffix?: string,
): WorkoutSession {
  const now = new Date()
  const timestamp = now.getTime()
  const payload: Record<string, unknown> = {
    timestamp,
    saveTime: now.toLocaleTimeString('en-GB', { hour12: false }),
    saveDate: now.toLocaleDateString('en-GB'),
    ...exercises,
  }

  const baseKey = `${day}_${timestamp}`
  const key = suffix ? `${baseKey}_${suffix}` : baseKey
  localStorage.setItem(key, JSON.stringify(payload))

  return {
    key,
    day,
    timestamp,
    saveTime: payload.saveTime as string,
    saveDate: payload.saveDate as string,
    exercises,
  }
}

export function getLastSessionForDay(day: string): WorkoutSession | null {
  return getSessionsForDay(day)[0] ?? null
}

export function deleteAllWorkoutData(): void {
  const toRemove: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && !SKIP_KEYS.has(key) && isWorkoutSessionKey(key)) {
      toRemove.push(key)
    }
  }
  toRemove.forEach((k) => localStorage.removeItem(k))
}

export function exportDataJson(): string {
  const data: Record<string, unknown> = {}
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key || SKIP_KEYS.has(key) || !isWorkoutSessionKey(key)) continue
    try {
      data[key] = JSON.parse(localStorage.getItem(key) || 'null')
    } catch {
      data[key] = localStorage.getItem(key)
    }
  }
  return JSON.stringify(data, null, 2)
}
