import { isSessionOnLocalToday } from './dateUtils'
import { getLocalCheckIn, recordLocalCheckIn, recordLocalCheckOut } from './checkIn'
import { isSupabaseConfigured, supabase } from './supabase'
import { tryEnsureSupabaseUser } from './supabaseAuth'
import { SESSION_ACTIVE, SESSION_COMPLETED, STALE_SESSION_HOURS } from './sessionStatus'

export type ActiveWorkoutSession = {
  id: string
  section: string
  startedAt: string
  timestamp: number
}

export type StartSessionResult =
  | { ok: true; resumed: boolean; session: ActiveWorkoutSession }
  | { ok: false; reason: 'offline' | 'auth' }
  | { ok: false; reason: 'conflict'; existing: ActiveWorkoutSession }

/** Close open sessions older than STALE_SESSION_HOURS (server RPC). */
export async function autoCloseStaleSessions(): Promise<number> {
  if (!supabase || !isSupabaseConfigured) return 0
  const auth = await tryEnsureSupabaseUser()
  if (!auth.ok) return 0

  const { data, error } = await supabase.rpc('auto_close_stale_workout_sessions', {
    p_max_hours: STALE_SESSION_HOURS,
  })
  if (error) {
    console.warn('auto_close_stale_workout_sessions:', error.message)
    return 0
  }
  return Number(data ?? 0)
}

/** Single open session for this user (source of truth for tabs / refresh). */
export async function fetchActiveSession(): Promise<ActiveWorkoutSession | null> {
  if (!supabase || !isSupabaseConfigured) return null
  const auth = await tryEnsureSupabaseUser()
  if (!auth.ok) return null

  const { data, error } = await supabase
    .from('workout_sessions')
    .select('id, day, started_at, timestamp')
    .eq('user_id', auth.userId)
    .eq('status', SESSION_ACTIVE)
    .is('finished_at', null)
    .order('timestamp', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data?.started_at) return null

  return {
    id: data.id as string,
    section: data.day as string,
    startedAt: data.started_at as string,
    timestamp: Number(data.timestamp),
  }
}

export async function startWorkoutSession(section: string): Promise<StartSessionResult> {
  recordLocalCheckIn(section)

  if (!supabase || !isSupabaseConfigured) {
    return { ok: false, reason: 'offline' }
  }

  const auth = await tryEnsureSupabaseUser()
  if (!auth.ok) return { ok: false, reason: 'auth' }

  await autoCloseStaleSessions()

  const existing = await fetchActiveSession()
  if (existing && existing.section !== section) {
    return { ok: false, reason: 'conflict', existing }
  }

  const nowIso = new Date().toISOString()
  const checkInAt = getLocalCheckIn(section) ?? nowIso

  if (existing && existing.section === section) {
    return {
      ok: true,
      resumed: true,
      session: existing,
    }
  }

  const { data: rows } = await supabase
    .from('workout_sessions')
    .select('id, started_at, timestamp, status, finished_at')
    .eq('user_id', auth.userId)
    .eq('day', section)

  const todayOpen = (rows ?? []).find(
    (r) =>
      isSessionOnLocalToday(Number(r.timestamp)) &&
      r.status === SESSION_ACTIVE &&
      !r.finished_at,
  )

  if (todayOpen?.id) {
    const started = (todayOpen.started_at as string) ?? checkInAt
    await supabase
      .from('workout_sessions')
      .update({ started_at: started, status: SESSION_ACTIVE })
      .eq('id', todayOpen.id as string)

    return {
      ok: true,
      resumed: true,
      session: {
        id: todayOpen.id as string,
        section,
        startedAt: started,
        timestamp: Number(todayOpen.timestamp),
      },
    }
  }

  const timestamp = Date.now()
  const { data: inserted, error } = await supabase
    .from('workout_sessions')
    .insert({
      storage_key: `${section}_${timestamp}`,
      day: section,
      timestamp,
      save_time: new Date().toLocaleTimeString('en-GB', { hour12: false }),
      save_date: new Date().toLocaleDateString('en-GB'),
      exercises: {},
      user_id: auth.userId,
      started_at: checkInAt,
      status: SESSION_ACTIVE,
    })
    .select('id, started_at, timestamp')
    .single()

  if (error) {
    if (error.code === '23505') {
      const again = await fetchActiveSession()
      if (again) {
        if (again.section === section) {
          return { ok: true, resumed: true, session: again }
        }
        return { ok: false, reason: 'conflict', existing: again }
      }
    }
    throw error
  }

  return {
    ok: true,
    resumed: false,
    session: {
      id: inserted.id as string,
      section,
      startedAt: inserted.started_at as string,
      timestamp: Number(inserted.timestamp),
    },
  }
}

/** End active session for a section (today). */
export async function completeActiveSession(section: string): Promise<boolean> {
  recordLocalCheckOut(section)
  if (!supabase || !isSupabaseConfigured) return false

  const auth = await tryEnsureSupabaseUser()
  if (!auth.ok) return false

  const nowIso = new Date().toISOString()
  const checkInAt = getLocalCheckIn(section)

  const { data: rows } = await supabase
    .from('workout_sessions')
    .select('id, timestamp')
    .eq('user_id', auth.userId)
    .eq('day', section)
    .eq('status', SESSION_ACTIVE)
    .is('finished_at', null)

  const ids = (rows ?? [])
    .filter((r) => isSessionOnLocalToday(Number(r.timestamp)))
    .map((r) => r.id as string)

  if (ids.length === 0) return false

  const { data: updated, error } = await supabase
    .from('workout_sessions')
    .update({ status: SESSION_COMPLETED, finished_at: nowIso })
    .in('id', ids)
    .select('id')

  if (error) throw error
  if (!updated?.length) return false

  if (checkInAt) {
    await supabase
      .from('workout_sessions')
      .update({ started_at: checkInAt })
      .in('id', ids)
      .is('started_at', null)
  }

  return true
}

/** Force-complete another section’s active session (user confirmed). */
export async function completeActiveSessionById(sessionId: string, section: string): Promise<boolean> {
  recordLocalCheckOut(section)
  if (!supabase) return false
  const auth = await tryEnsureSupabaseUser()
  if (!auth.ok) return false

  const nowIso = new Date().toISOString()
  const { data, error } = await supabase
    .from('workout_sessions')
    .update({ status: SESSION_COMPLETED, finished_at: nowIso })
    .eq('id', sessionId)
    .eq('user_id', auth.userId)
    .select('id')

  if (error) throw error
  return (data?.length ?? 0) > 0
}
