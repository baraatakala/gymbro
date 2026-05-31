import { recordLocalCheckIn } from './checkIn'
import { getAllSessions } from './storage'
import { isSupabaseConfigured, supabase } from './supabase'
import { tryEnsureSupabaseUser } from './supabaseAuth'
import { fetchTrainingCalendarDates } from './supabaseSessions'
import type { AttendanceSession, AttendanceSetLog } from '../types/attendance'

type RawRow = {
  id: string
  day: string
  timestamp: number
  started_at?: string | null
  finished_at?: string | null
  status?: string | null
  workout_sets?: {
    exercise_name: string
    set_number: number
    logged_at?: string | null
  }[]
}

function mapRow(row: RawRow): AttendanceSession {
  const sets: AttendanceSetLog[] = (row.workout_sets ?? []).map((s) => ({
    exerciseName: s.exercise_name,
    setNumber: s.set_number,
    loggedAt: s.logged_at ?? new Date(row.timestamp).toISOString(),
  }))

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

/** Mark gym check-in for today's section (earliest started_at wins). */
export async function touchSessionCheckIn(section: string): Promise<void> {
  recordLocalCheckIn(section)
  if (!supabase || !isSupabaseConfigured) return
  const auth = await tryEnsureSupabaseUser()
  if (!auth.ok) return

  const nowIso = new Date().toISOString()
  const { data: rows } = await supabase
    .from('workout_sessions')
    .select('id, started_at, timestamp')
    .eq('user_id', auth.userId)
    .eq('day', section)

  const todayRows = (rows ?? []).filter((r) => {
    const ts = Number(r.timestamp)
    const d = new Date(ts).toLocaleDateString('en-CA')
    return d === new Date().toLocaleDateString('en-CA')
  })

  if (todayRows.length === 0) return

  for (const row of todayRows) {
    if (row.started_at) continue
    await supabase
      .from('workout_sessions')
      .update({ started_at: nowIso, status: 'in_progress' })
      .eq('id', row.id as string)
      .is('started_at', null)
  }
}

export async function fetchAttendanceSessions(): Promise<AttendanceSession[]> {
  if (!supabase || !isSupabaseConfigured) {
    return buildAttendanceFromLocal()
  }

  const auth = await tryEnsureSupabaseUser()
  if (!auth.ok) return buildAttendanceFromLocal()

  const selectWithTiming = `
      id,
      day,
      timestamp,
      started_at,
      finished_at,
      status,
      workout_sets ( exercise_name, set_number, logged_at )
    `

  let { data, error } = await supabase
    .from('workout_sessions')
    .select(selectWithTiming)
    .eq('user_id', auth.userId)
    .order('timestamp', { ascending: false })
    .limit(500)

  if (error?.message?.includes('started_at') || error?.message?.includes('logged_at')) {
    const fallback = await supabase
      .from('workout_sessions')
      .select(
        `
        id,
        day,
        timestamp,
        workout_sets ( exercise_name, set_number, weight_kg, reps )
      `,
      )
      .eq('user_id', auth.userId)
      .order('timestamp', { ascending: false })
      .limit(500)

    if (fallback.error) throw fallback.error
    data = (fallback.data ?? []).map((row) => {
      const r = row as {
        id: string
        day: string
        timestamp: number
        workout_sets?: { exercise_name: string; set_number: number }[]
      }
      return {
        id: r.id,
        day: r.day,
        timestamp: r.timestamp,
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
    fetchAttendanceSessions(),
  ])
  return { trainedDates, sessions }
}
