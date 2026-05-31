import { getAllSessions } from './storage'
import { isSupabaseConfigured, supabase } from './supabase'
import { tryEnsureSupabaseUser } from './supabaseAuth'
import { fetchTrainingCalendarDates } from './supabaseSessions'
import type { AttendanceSession, AttendanceSetLog } from '../types/attendance'

type RawRow = {
  id: string
  day: string
  timestamp: number
  exercises?: unknown
  started_at?: string | null
  finished_at?: string | null
  status?: string | null
  workout_sets?: {
    exercise_name: string
    set_number: number
    logged_at?: string | null
  }[]
}

function setsFromExercisesJson(exercises: unknown, timestamp: number): AttendanceSetLog[] {
  if (!exercises || typeof exercises !== 'object') return []
  const ex = exercises as Record<string, Record<string, number>>
  const sets: AttendanceSetLog[] = []
  let offset = 0
  for (const [exerciseName, sw] of Object.entries(ex)) {
    const keys = Object.keys(sw).sort((a, b) => {
      const na = parseInt(a.replace(/\D/g, ''), 10)
      const nb = parseInt(b.replace(/\D/g, ''), 10)
      return (Number.isFinite(na) ? na : 0) - (Number.isFinite(nb) ? nb : 0)
    })
    keys.forEach((_, idx) => {
      sets.push({
        exerciseName,
        setNumber: idx + 1,
        loggedAt: new Date(timestamp + offset * 60_000).toISOString(),
      })
      offset += 1
    })
  }
  return sets
}

function mapRow(row: RawRow): AttendanceSession {
  let sets: AttendanceSetLog[] = (row.workout_sets ?? []).map((s) => ({
    exerciseName: s.exercise_name,
    setNumber: s.set_number,
    loggedAt: s.logged_at ?? new Date(row.timestamp).toISOString(),
  }))
  if (sets.length === 0 && row.workout_sets === undefined) {
    sets = setsFromExercisesJson(row.exercises, Number(row.timestamp))
  }

  return {
    id: row.id,
    section: row.day,
    timestamp: row.timestamp,
    startedAt: row.started_at ?? undefined,
    finishedAt: row.finished_at ?? undefined,
    status: row.status ?? undefined,
    sets,
  }
}

export async function fetchAttendanceSessions(lookbackDays = 400): Promise<AttendanceSession[]> {
  if (!supabase || !isSupabaseConfigured) {
    return buildAttendanceFromLocal()
  }

  const auth = await tryEnsureSupabaseUser()
  if (!auth.ok) return buildAttendanceFromLocal()

  const since = new Date()
  since.setDate(since.getDate() - lookbackDays)
  const sinceTs = since.getTime()

  const selectWithTiming = `
      id,
      day,
      timestamp,
      exercises,
      started_at,
      finished_at,
      status,
      workout_sets ( exercise_name, set_number, logged_at )
    `

  let { data, error } = await supabase
    .from('workout_sessions')
    .select(selectWithTiming)
    .eq('user_id', auth.userId)
    .gte('timestamp', sinceTs)
    .order('timestamp', { ascending: false })
    .limit(800)

  if (error?.message?.includes('started_at') || error?.message?.includes('logged_at')) {
    const fallback = await supabase
      .from('workout_sessions')
      .select(
        `
        id,
        day,
        timestamp,
        exercises,
        workout_sets ( exercise_name, set_number, weight_kg, reps )
      `,
      )
      .eq('user_id', auth.userId)
      .gte('timestamp', sinceTs)
      .order('timestamp', { ascending: false })
      .limit(800)

    if (fallback.error) throw fallback.error
    data = (fallback.data ?? []).map((row) => {
      const r = row as {
        id: string
        day: string
        timestamp: number
        exercises?: unknown
        workout_sets?: { exercise_name: string; set_number: number }[]
      }
      return {
        id: r.id,
        day: r.day,
        timestamp: r.timestamp,
        exercises: r.exercises,
        started_at: null,
        finished_at: null,
        status: null,
        workout_sets: (r.workout_sets ?? []).map((s) => ({
          exercise_name: s.exercise_name,
          set_number: s.set_number,
          logged_at: new Date(Number(r.timestamp)).toISOString(),
        })),
      }
    })
  } else if (error) {
    throw error
  }

  return (data ?? []).map((row) => mapRow(row as RawRow))
}

function buildAttendanceFromLocal(): AttendanceSession[] {
  const sessions = getAllSessions()
  return sessions.map((s, i) => {
    const sets: AttendanceSetLog[] = []
    if (s.exerciseSets) {
      for (const [exerciseName, entries] of Object.entries(s.exerciseSets)) {
        entries.forEach((_, idx) => {
          sets.push({
            exerciseName,
            setNumber: idx + 1,
            loggedAt: new Date(s.timestamp + idx * 60_000).toISOString(),
          })
        })
      }
    } else {
      for (const [exerciseName, sw] of Object.entries(s.exercises ?? {})) {
        Object.keys(sw).forEach((_, idx) => {
          sets.push({
            exerciseName,
            setNumber: idx + 1,
            loggedAt: new Date(s.timestamp + idx * 60_000).toISOString(),
          })
        })
      }
    }
    return {
      id: s.id ?? `local-${i}`,
      section: s.day,
      timestamp: s.timestamp,
      sets,
    }
  })
}

export async function loadAttendanceDataset(lookbackDays = 365): Promise<{
  trainedDates: string[]
  sessions: AttendanceSession[]
}> {
  const [trainedDates, sessions] = await Promise.all([
    fetchTrainingCalendarDates(lookbackDays),
    fetchAttendanceSessions(lookbackDays),
  ])
  return { trainedDates, sessions }
}
