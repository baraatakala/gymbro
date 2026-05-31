import { getLocalCheckIn, getLocalCheckOut } from './checkIn'
import { supabase } from './supabase'
import { ensureSupabaseUser, tryEnsureSupabaseUser } from './supabaseAuth'
import { DEFAULT_REPS_PER_SET, type SetEntry, type WorkoutSession } from '../types/workout'

export interface WorkoutSessionRow {
  id?: string
  storage_key: string
  day: string
  timestamp: number
  save_time: string | null
  save_date: string | null
  exercises: Record<string, Record<string, number>>
  user_id?: string
  created_at?: string
}

function toRow(session: WorkoutSession, userId: string): WorkoutSessionRow & { user_id: string } {
  return {
    storage_key: session.key,
    day: session.day,
    timestamp: session.timestamp,
    save_time: session.saveTime ?? null,
    save_date: session.saveDate ?? null,
    exercises: session.exercises,
    user_id: userId,
  }
}

function fromRow(row: WorkoutSessionRow): WorkoutSession {
  return {
    key: row.storage_key,
    day: row.day,
    timestamp: row.timestamp,
    saveTime: row.save_time ?? undefined,
    saveDate: row.save_date ?? undefined,
    exercises: row.exercises,
  }
}

function legacySetsToRows(
  sessionId: string,
  exercises: Record<string, Record<string, number>>,
  loggedAt: string,
): {
  session_id: string
  exercise_name: string
  set_number: number
  weight_kg: number
  reps: number
  logged_at: string
}[] {
  const rows: {
    session_id: string
    exercise_name: string
    set_number: number
    weight_kg: number
    reps: number
    logged_at: string
  }[] = []

  for (const [exerciseName, sets] of Object.entries(exercises)) {
    for (const [setLabel, weight] of Object.entries(sets)) {
      const setNum = parseInt(setLabel.replace(/\D/g, ''), 10) || rows.length + 1
      if (weight <= 0) continue
      rows.push({
        session_id: sessionId,
        exercise_name: exerciseName,
        set_number: setNum,
        weight_kg: weight,
        reps: DEFAULT_REPS_PER_SET,
        logged_at: loggedAt,
      })
    }
  }
  return rows
}

function exerciseSetsToRows(
  sessionId: string,
  exerciseSets: Record<string, SetEntry[]>,
  loggedAt: string,
): {
  session_id: string
  exercise_name: string
  set_number: number
  weight_kg: number
  reps: number
  logged_at: string
}[] {
  const rows: {
    session_id: string
    exercise_name: string
    set_number: number
    weight_kg: number
    reps: number
    logged_at: string
  }[] = []

  for (const [exerciseName, entries] of Object.entries(exerciseSets)) {
    entries.forEach((entry, i) => {
      if (entry.weight <= 0) return
      rows.push({
        session_id: sessionId,
        exercise_name: exerciseName,
        set_number: i + 1,
        weight_kg: entry.weight,
        reps: entry.reps,
        logged_at: loggedAt,
      })
    })
  }
  return rows
}

/** Import a local session into cloud with normalized workout_sets rows. */
export async function upsertWorkoutSession(session: WorkoutSession): Promise<void> {
  if (!supabase) return

  const userId = await ensureSupabaseUser()
  if (!userId) {
    throw new Error('Sign in required to sync local workouts to cloud')
  }

  const loggedAt = new Date(session.timestamp).toISOString()

  const checkOut = getLocalCheckOut(session.day) ?? loggedAt

  const { data, error } = await supabase
    .from('workout_sessions')
    .upsert(
      {
        ...toRow(session, userId),
        started_at: getLocalCheckIn(session.day) ?? loggedAt,
        status: 'completed',
        finished_at: checkOut,
      },
      { onConflict: 'storage_key' },
    )
    .select('id')
    .single()

  if (error) throw error

  const sessionId = data.id as string

  await supabase.from('workout_sets').delete().eq('session_id', sessionId)

  const setRows = session.exerciseSets
    ? exerciseSetsToRows(sessionId, session.exerciseSets, loggedAt)
    : legacySetsToRows(sessionId, session.exercises, loggedAt)

  if (setRows.length > 0) {
    const { error: setsError } = await supabase.from('workout_sets').insert(setRows)
    if (setsError) throw setsError
  }
}

export async function fetchWorkoutSessionsForDay(day: string): Promise<WorkoutSession[]> {
  if (!supabase) return []

  const auth = await tryEnsureSupabaseUser()
  if (!auth.ok) return []

  const { data, error } = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('day', day)
    .eq('user_id', auth.userId)
    .order('timestamp', { ascending: false })

  if (error) throw error
  return (data as WorkoutSessionRow[]).map(fromRow)
}

export async function syncAllLocalSessions(
  sessions: WorkoutSession[],
): Promise<{ synced: number; failed: number }> {
  let synced = 0
  let failed = 0

  for (const session of sessions) {
    try {
      await upsertWorkoutSession(session)
      synced++
    } catch {
      failed++
    }
  }

  return { synced, failed }
}
