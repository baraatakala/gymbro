import { validateSetEntries } from './validators'
import { getAllSessions, getWorkoutStorageKeys } from './storage'
import { mergeSessionsForPrefill } from './sessionMerge'
import { isCardioSection } from './sectionUtils'
import { getLocalCheckIn } from './checkIn'
import { calendarDayKey, isSessionOnLocalToday } from './dateUtils'
import { supabase, isSupabaseConfigured } from './supabase'
import { ensureSupabaseUser, tryEnsureSupabaseUser } from './supabaseAuth'
import {
  DEFAULT_REPS_PER_SET,
  type ExerciseCatalog,
  type PersonalRecord,
  type SetEntry,
  type SetWeights,
  type WorkoutSession,
} from '../types/workout'

export interface SaveSetResult {
  session: WorkoutSession
  /** All sessions for this section after save (avoids extra round-trip). */
  sessions: WorkoutSession[]
  prHit: boolean
  prMessage?: string
}

function setsToLegacy(sets: SetEntry[]): Record<string, number> {
  const out: Record<string, number> = {}
  sets.forEach((s, i) => {
    out[`Set ${i + 1}`] = s.weight
  })
  return out
}

export async function fetchCatalogFromSupabase(): Promise<ExerciseCatalog | null> {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('exercises')
    .select('name, muscle_groups ( name )')
    .order('name')

  if (error) throw error
  if (!data?.length) return null

  const catalog: ExerciseCatalog = {}
  for (const row of data) {
    const mg = row.muscle_groups as { name: string } | { name: string }[] | null
    const group =
      mg && typeof mg === 'object' && 'name' in mg
        ? mg.name
        : Array.isArray(mg) && mg[0]
          ? mg[0].name
          : 'Other'
    if (!catalog[group]) catalog[group] = []
    catalog[group].push(row.name as string)
  }
  return catalog
}

function bestSet(sets: SetEntry[]): SetEntry {
  return sets.reduce((best, s) => {
    if (s.weight > best.weight) return s
    if (s.weight === best.weight && s.reps > best.reps) return s
    return best
  }, sets[0])
}

async function upsertPersonalRecordIfBetter(
  userId: string,
  exerciseName: string,
  exerciseId: string | null,
  sets: SetEntry[],
  achievedAt: string,
  day: string,
): Promise<{ prHit: boolean; prMessage?: string }> {
  if (!supabase || sets.length === 0) return { prHit: false }

  const best = bestSet(sets)
  const { data: beforePr } = await supabase
    .from('personal_records')
    .select('weight_kg, reps')
    .eq('user_id', userId)
    .eq('exercise_name', exerciseName)
    .maybeSingle()

  const isBetter =
    !beforePr ||
    best.weight > Number(beforePr.weight_kg) ||
    (best.weight === Number(beforePr.weight_kg) && best.reps > beforePr.reps)

  if (!isBetter) return { prHit: false }

  const { error } = await supabase.from('personal_records').upsert(
    {
      user_id: userId,
      exercise_name: exerciseName,
      exercise_id: exerciseId,
      weight_kg: best.weight,
      reps: best.reps,
      achieved_at: achievedAt,
    },
    { onConflict: 'user_id,exercise_name' },
  )

  if (error) {
    console.warn('upsertPersonalRecordIfBetter:', error.message)
    return { prHit: false }
  }

  return {
    prHit: true,
    prMessage: isCardioSection(day)
      ? `🏆 New PR: ${best.weight} min`
      : `🏆 New PR: ${best.weight} kg × ${best.reps} reps`,
  }
}

function mapSessionRow(row: {
  id: string
  storage_key: string
  day: string
  timestamp: number
  save_time?: string | null
  save_date?: string | null
  started_at?: string | null
  finished_at?: string | null
  status?: string | null
  exercises: unknown
  total_volume_kg?: number | string | null
  workout_sets?: {
    exercise_name: string
    set_number: number
    weight_kg: number
    reps: number
  }[]
}): WorkoutSession {
  const sets = row.workout_sets ?? []
  const exerciseSets: Record<string, SetEntry[]> = {}
  const exercises: Record<string, Record<string, number>> = {}

  for (const s of sets) {
    if (!exerciseSets[s.exercise_name]) exerciseSets[s.exercise_name] = []
    exerciseSets[s.exercise_name].push({
      weight: Number(s.weight_kg),
      reps: s.reps,
    })
    if (!exercises[s.exercise_name]) exercises[s.exercise_name] = {}
    exercises[s.exercise_name][`Set ${s.set_number}`] = Number(s.weight_kg)
  }

  const legacyExercises =
    Object.keys(exercises).length > 0
      ? exercises
      : (row.exercises as Record<string, Record<string, number>>) ?? {}

  const storedVolume = Number(row.total_volume_kg ?? 0)

  return {
    id: row.id,
    key: row.storage_key,
    day: row.day,
    timestamp: row.timestamp,
    saveTime: row.save_time ?? undefined,
    saveDate: row.save_date ?? undefined,
    exercises: legacyExercises,
    exerciseSets: Object.keys(exerciseSets).length > 0 ? exerciseSets : undefined,
    storedVolumeKg: storedVolume > 0 ? storedVolume : undefined,
    startedAt: row.started_at ?? undefined,
    finishedAt: row.finished_at ?? undefined,
    status: row.status ?? undefined,
  }
}

/** Attach legacy rows (user_id null) on this device only — never all global orphans. */
export async function claimOrphanSessionsForUser(userId: string): Promise<number> {
  if (!supabase) return 0

  const localKeys = getWorkoutStorageKeys()
  if (localKeys.length > 0) {
    const { data, error } = await supabase
      .from('workout_sessions')
      .update({ user_id: userId })
      .is('user_id', null)
      .in('storage_key', localKeys)
      .select('id')

    if (error) {
      console.warn('claimOrphanSessionsForUser:', error.message)
      return 0
    }
    return data?.length ?? 0
  }

  return 0
}

function legacySetsToEntries(sets: SetWeights): SetEntry[] {
  return Object.entries(sets)
    .sort(([a], [b]) => {
      const na = parseInt(a.replace(/\D/g, ''), 10)
      const nb = parseInt(b.replace(/\D/g, ''), 10)
      return (Number.isFinite(na) ? na : 0) - (Number.isFinite(nb) ? nb : 0)
    })
    .map(([, weight]) => ({
      weight: Math.max(0, weight),
      reps: DEFAULT_REPS_PER_SET,
    }))
    .filter((s) => s.weight > 0)
}

function exercisesOnSession(session: WorkoutSession): Record<string, SetEntry[]> {
  const out: Record<string, SetEntry[]> = {}
  if (session.exerciseSets) {
    for (const [name, entries] of Object.entries(session.exerciseSets)) {
      const valid = entries.filter((e) => e.weight > 0)
      if (valid.length) out[name] = valid
    }
  }
  for (const [name, sets] of Object.entries(session.exercises ?? {})) {
    if (out[name]) continue
    const entries = legacySetsToEntries(sets)
    if (entries.length) out[name] = entries
  }
  return out
}

async function pushLocalSessionsToCloud(
  userId: string,
  localSessions: WorkoutSession[],
): Promise<{ uploaded: number; skipped: number }> {
  let uploaded = 0
  let skipped = 0
  const syncedKeys: string[] = []

  for (const session of localSessions) {
    const byExercise = exercisesOnSession(session)
    const names = Object.keys(byExercise)
    if (names.length === 0) {
      skipped++
      continue
    }

    try {
      for (const exerciseName of names) {
        await upsertExerciseOnStoredSession(userId, session, exerciseName, byExercise[exerciseName])
        uploaded++
      }
      syncedKeys.push(session.key)
    } catch (e) {
      console.warn('syncLocalSessionsToCloud:', session.key, e)
      skipped++
    }
  }

  for (const key of syncedKeys) {
    localStorage.removeItem(key)
  }

  return { uploaded, skipped }
}

/** Push one section's local rows to cloud (repair workflow). */
export async function syncLocalSessionsForSection(
  sectionName: string,
): Promise<{ uploaded: number; skipped: number }> {
  if (!supabase || !isSupabaseConfigured) return { uploaded: 0, skipped: 0 }

  const userId = await ensureSupabaseUser()
  if (!userId) return { uploaded: 0, skipped: 0 }

  const localSessions = getAllSessions().filter((s) => s.day === sectionName)
  if (localSessions.length === 0) {
    return pushLocalSessionsToCloud(userId, getAllSessions())
  }
  return pushLocalSessionsToCloud(userId, localSessions)
}

/** Push localStorage workout rows to Supabase (same storage_key), then remove synced keys. */
export async function syncLocalSessionsToCloud(): Promise<{
  uploaded: number
  skipped: number
}> {
  if (!supabase || !isSupabaseConfigured) return { uploaded: 0, skipped: 0 }

  const userId = await ensureSupabaseUser()
  if (!userId) return { uploaded: 0, skipped: 0 }

  return pushLocalSessionsToCloud(userId, getAllSessions())
}

export function hasLocalWorkoutData(): boolean {
  return getAllSessions().some((s) => Object.keys(exercisesOnSession(s)).length > 0)
}

async function upsertExerciseOnStoredSession(
  userId: string,
  session: WorkoutSession,
  exerciseName: string,
  sets: SetEntry[],
): Promise<void> {
  if (!supabase || sets.length === 0) return

  const legacy = setsToLegacy(sets)
  const loggedAt = new Date(session.timestamp).toISOString()
  const saveTime =
    session.saveTime ??
    new Date(session.timestamp).toLocaleTimeString('en-GB', { hour12: false })
  const saveDate =
    session.saveDate ??
    new Date(session.timestamp).toLocaleDateString('en-GB')

  const { data: exerciseRow } = await supabase
    .from('exercises')
    .select('id')
    .eq('name', exerciseName)
    .maybeSingle()

  const setRows = sets.map((s, i) => ({
    exercise_id: exerciseRow?.id ?? null,
    exercise_name: exerciseName,
    set_number: i + 1,
    weight_kg: s.weight,
    reps: s.reps,
    logged_at: loggedAt,
  }))

  let { data: row } = await supabase
    .from('workout_sessions')
    .select('id, exercises, user_id')
    .eq('storage_key', session.key)
    .maybeSingle()

  if (row?.user_id && row.user_id !== userId) {
    throw new Error(`Storage key ${session.key} belongs to another account`)
  }

  if (row && !row.user_id) {
    await supabase.from('workout_sessions').update({ user_id: userId }).eq('id', row.id)
    row = { ...row, user_id: userId }
  }

  let sessionId: string

  if (row) {
    sessionId = row.id as string
    const prev = (row.exercises as Record<string, Record<string, number>>) ?? {}
    const mergedExercises = { ...prev, [exerciseName]: legacy }

    await supabase
      .from('workout_sets')
      .delete()
      .eq('session_id', sessionId)
      .eq('exercise_name', exerciseName)

    const { error: setsError } = await supabase
      .from('workout_sets')
      .insert(setRows.map((r) => ({ ...r, session_id: sessionId })))

    if (setsError) throw setsError

    const totalVolume = await recalcSessionVolume(sessionId)
    const { error: updateError } = await supabase
      .from('workout_sessions')
      .update({
        exercises: mergedExercises,
        save_time: saveTime,
        save_date: saveDate,
        total_volume_kg: totalVolume,
        user_id: userId,
      })
      .eq('id', sessionId)

    if (updateError) throw updateError
  } else {
    const volume = sets.reduce((sum, s) => sum + s.weight * s.reps, 0)
    const { data: inserted, error: sessionError } = await supabase
      .from('workout_sessions')
      .insert({
        storage_key: session.key,
        day: session.day,
        timestamp: session.timestamp,
        save_time: saveTime,
        save_date: saveDate,
        exercises: { [exerciseName]: legacy },
        user_id: userId,
        started_at: loggedAt,
        status: 'in_progress',
        total_volume_kg: volume,
      })
      .select('id')
      .single()

    if (sessionError) throw sessionError
    sessionId = inserted.id as string

    const { error: setsError } = await supabase
      .from('workout_sets')
      .insert(setRows.map((r) => ({ ...r, session_id: sessionId })))

    if (setsError) throw setsError
  }

  await upsertPersonalRecordIfBetter(
    userId,
    exerciseName,
    exerciseRow?.id ?? null,
    sets,
    loggedAt,
    session.day,
  )
  if (sets.length > 0) {
    await recordTrainingDay(userId, new Date(session.timestamp))
  }
}

export async function fetchSessionsForDay(day: string): Promise<WorkoutSession[]> {
  if (!supabase) return []

  const auth = await tryEnsureSupabaseUser()
  const userId = auth.ok ? auth.userId : null

  let query = supabase
    .from('workout_sessions')
    .select(
      `
      id,
      storage_key,
      day,
      timestamp,
      save_time,
      save_date,
      started_at,
      finished_at,
      status,
      exercises,
      total_volume_kg,
      workout_sets ( exercise_name, set_number, weight_kg, reps )
    `,
    )
    .eq('day', day)
    .order('timestamp', { ascending: false })

  if (userId) {
    query = query.eq('user_id', userId)
  }

  const { data, error } = await query
  if (error) throw error

  const mapped = (data ?? []).map((row) =>
    mapSessionRow(row as Parameters<typeof mapSessionRow>[0]),
  )

  return collapseTodaySessions(mapped)
}

/** All sessions across sections for export and global analytics. */
export async function fetchAllUserSessions(): Promise<WorkoutSession[]> {
  if (!supabase) return []

  const auth = await tryEnsureSupabaseUser()
  if (!auth.ok) return []

  let query = supabase
    .from('workout_sessions')
    .select(
      `
      id,
      storage_key,
      day,
      timestamp,
      save_time,
      save_date,
      started_at,
      finished_at,
      status,
      exercises,
      total_volume_kg,
      workout_sets ( exercise_name, set_number, weight_kg, reps )
    `,
    )
    .order('timestamp', { ascending: false })

  query = query.eq('user_id', auth.userId)

  const { data, error } = await query
  if (error) throw error

  const mapped = (data ?? []).map((row) =>
    mapSessionRow(row as Parameters<typeof mapSessionRow>[0]),
  )

  const byDay = new Map<string, WorkoutSession[]>()
  for (const s of mapped) {
    const list = byDay.get(s.day) ?? []
    list.push(s)
    byDay.set(s.day, list)
  }

  const merged: WorkoutSession[] = []
  for (const daySessions of byDay.values()) {
    merged.push(...collapseTodaySessions(daySessions))
  }

  return merged.sort((a, b) => b.timestamp - a.timestamp)
}

function exerciseJsonCount(exercises: unknown): number {
  const ex = exercises as Record<string, unknown> | null
  return ex ? Object.keys(ex).length : 0
}

async function rebuildExercisesJsonFromSets(
  sessionId: string,
): Promise<Record<string, Record<string, number>>> {
  if (!supabase) return {}

  const { data: sets, error } = await supabase
    .from('workout_sets')
    .select('exercise_name, set_number, weight_kg')
    .eq('session_id', sessionId)
    .order('set_number', { ascending: true })

  if (error || !sets?.length) return {}

  const exercises: Record<string, Record<string, number>> = {}
  for (const row of sets) {
    const name = row.exercise_name as string
    if (!exercises[name]) exercises[name] = {}
    exercises[name][`Set ${row.set_number}`] = Number(row.weight_kg)
  }
  return exercises
}

async function mergeDuplicateSessionsIntoKeeper(
  keeperId: string,
  keeperExercises: Record<string, Record<string, number>>,
  duplicateIds: string[],
): Promise<void> {
  if (!supabase || duplicateIds.length === 0) return

  const merged = { ...keeperExercises }

  for (const dupId of duplicateIds) {
    const { data: dup } = await supabase
      .from('workout_sessions')
      .select('exercises')
      .eq('id', dupId)
      .maybeSingle()

    const ex = (dup?.exercises as Record<string, Record<string, number>>) ?? {}
    for (const [name, sets] of Object.entries(ex)) {
      if (!merged[name]) merged[name] = sets
    }

    const { error: moveError } = await supabase
      .from('workout_sets')
      .update({ session_id: keeperId })
      .eq('session_id', dupId)

    if (moveError) {
      console.warn('mergeDuplicateSessionsIntoKeeper: move sets failed', moveError.message)
      continue
    }

    await supabase.from('workout_sessions').delete().eq('id', dupId)
  }

  const fromSets = await rebuildExercisesJsonFromSets(keeperId)
  for (const [name, sets] of Object.entries(fromSets)) {
    if (!merged[name]) merged[name] = sets
  }

  if (Object.keys(merged).length === 0) return

  await supabase.from('workout_sessions').update({ exercises: merged }).eq('id', keeperId)
}

/** Merge multiple session rows for the same section on the same calendar day (any date). */
async function consolidateDuplicateSessionsForDay(
  userId: string,
  day: string,
): Promise<void> {
  if (!supabase) return

  const { data: rows, error } = await supabase
    .from('workout_sessions')
    .select('id, exercises, timestamp')
    .eq('day', day)
    .eq('user_id', userId)
    .order('timestamp', { ascending: false })

  if (error || !rows || rows.length <= 1) return

  const byDate = new Map<string, typeof rows>()
  for (const row of rows) {
    const ts = Number(row.timestamp)
    const key = calendarDayKey(ts)
    const group = byDate.get(key) ?? []
    group.push(row)
    byDate.set(key, group)
  }

  for (const group of byDate.values()) {
    if (group.length <= 1) continue
    const keeper = group.reduce((best, row) => {
      const bestCount = exerciseJsonCount(best.exercises)
      const rowCount = exerciseJsonCount(row.exercises)
      if (rowCount > bestCount) return row
      if (rowCount < bestCount) return best
      return Number(row.timestamp) > Number(best.timestamp) ? row : best
    })
    const keeperId = keeper.id as string
    const keeperExercises =
      (keeper.exercises as Record<string, Record<string, number>>) ?? {}
    const dupIds = group.slice(1).map((r) => r.id as string)
    await mergeDuplicateSessionsIntoKeeper(keeperId, keeperExercises, dupIds)
  }
}

/** One merged row for today + older sessions (fixes legacy multi-row saves). */
function collapseTodaySessions(sessions: WorkoutSession[]): WorkoutSession[] {
  const todayRows = sessions.filter((s) => isSessionOnLocalToday(s.timestamp))
  const olderRows = sessions.filter((s) => !isSessionOnLocalToday(s.timestamp))
  if (todayRows.length <= 1) return sessions
  const merged = mergeSessionsForPrefill(todayRows)
  if (!merged) return sessions
  return [merged, ...olderRows]
}

/** Mark a calendar day as trained (streak / training_days feature). */
async function recordTrainingDay(userId: string, at: Date = new Date()): Promise<void> {
  if (!supabase) return
  const trainedOn = at.toISOString().slice(0, 10)

  const { data: existing } = await supabase
    .from('training_days')
    .select('sessions_count')
    .eq('user_id', userId)
    .eq('trained_on', trainedOn)
    .maybeSingle()

  const nextCount = (existing?.sessions_count ?? 0) + 1

  const { error } = await supabase.from('training_days').upsert(
    {
      user_id: userId,
      trained_on: trainedOn,
      sessions_count: nextCount,
    },
    { onConflict: 'user_id,trained_on' },
  )
  if (error) console.warn('recordTrainingDay:', error.message)
}

export async function fetchTrainingDayCount(): Promise<number> {
  const dates = await fetchTrainingCalendarDates()
  return dates.length
}

/** Distinct calendar days with logged work (last N days). */
export async function fetchTrainingCalendarDates(
  lookbackDays = 120,
): Promise<string[]> {
  if (!supabase) return []
  const auth = await tryEnsureSupabaseUser()
  if (!auth.ok) return []

  const since = new Date()
  since.setDate(since.getDate() - lookbackDays)
  const sinceIso = since.toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('training_days')
    .select('trained_on')
    .eq('user_id', auth.userId)
    .gte('trained_on', sinceIso)
    .order('trained_on', { ascending: true })

  if (error) {
    console.warn('fetchTrainingCalendarDates:', error.message)
    return []
  }

  return (data ?? []).map((r) => String(r.trained_on).slice(0, 10))
}

async function recalcSessionVolume(sessionId: string): Promise<number> {
  if (!supabase) return 0
  const { data } = await supabase
    .from('workout_sets')
    .select('weight_kg, reps')
    .eq('session_id', sessionId)

  return (data ?? []).reduce(
    (sum, r) => sum + Number(r.weight_kg) * Number(r.reps),
    0,
  )
}

export async function saveExerciseToSupabase(
  day: string,
  exerciseName: string,
  sets: SetEntry[],
  options?: { cardio?: boolean },
): Promise<SaveSetResult> {
  if (!supabase || !isSupabaseConfigured) {
    throw new Error('Supabase not configured')
  }

  const validatedSets = validateSetEntries(sets, {
    cardio: options?.cardio,
    exerciseName,
  })

  const userId = await ensureSupabaseUser()
  if (!userId) {
    throw new Error(
      'Could not sign in. Enable Anonymous sign-in in Supabase → Authentication → Providers.',
    )
  }

  const now = new Date()
  const timestamp = now.getTime()
  const legacy = setsToLegacy(validatedSets)
  const volume = validatedSets.reduce((sum, s) => sum + s.weight * s.reps, 0)

  const { data: exerciseRow } = await supabase
    .from('exercises')
    .select('id')
    .eq('name', exerciseName)
    .maybeSingle()

  const setRows = validatedSets.map((s, i) => ({
    exercise_id: exerciseRow?.id ?? null,
    exercise_name: exerciseName,
    set_number: i + 1,
    weight_kg: s.weight,
    reps: s.reps,
    logged_at: now.toISOString(),
  }))

  await consolidateDuplicateSessionsForDay(userId, day)

  const { data: daySessions } = await supabase
    .from('workout_sessions')
    .select('id, exercises, storage_key, user_id, timestamp')
    .eq('day', day)
    .eq('user_id', userId)
    .order('timestamp', { ascending: false })

  const todaySession =
    (daySessions ?? []).find((r) => isSessionOnLocalToday(Number(r.timestamp))) ?? null

  let sessionId: string
  let storageKey: string

  if (todaySession) {
    sessionId = todaySession.id as string
    storageKey = todaySession.storage_key as string

    if (!todaySession.user_id) {
      await supabase.from('workout_sessions').update({ user_id: userId }).eq('id', sessionId)
    }

    const prev = (todaySession.exercises as Record<string, Record<string, number>>) ?? {}
    const mergedExercises = { ...prev, [exerciseName]: legacy }

    const { data: setsBackup } = await supabase
      .from('workout_sets')
      .select('exercise_id, exercise_name, set_number, weight_kg, reps, logged_at')
      .eq('session_id', sessionId)
      .eq('exercise_name', exerciseName)

    const { error: deleteSetsError } = await supabase
      .from('workout_sets')
      .delete()
      .eq('session_id', sessionId)
      .eq('exercise_name', exerciseName)

    if (deleteSetsError) throw deleteSetsError

    const { error: setsError } = await supabase
      .from('workout_sets')
      .insert(setRows.map((r) => ({ ...r, session_id: sessionId })))

    if (setsError) {
      if (setsBackup?.length) {
        await supabase.from('workout_sets').insert(
          setsBackup.map((row) => ({
            session_id: sessionId,
            exercise_id: row.exercise_id,
            exercise_name: row.exercise_name,
            set_number: row.set_number,
            weight_kg: row.weight_kg,
            reps: row.reps,
            logged_at: row.logged_at,
          })),
        )
      }
      throw setsError
    }

    const totalVolume = await recalcSessionVolume(sessionId)

    const checkInAt = getLocalCheckIn(day)
    const { error: updateError } = await supabase
      .from('workout_sessions')
      .update({
        exercises: mergedExercises,
        save_time: now.toLocaleTimeString('en-GB', { hour12: false }),
        save_date: now.toLocaleDateString('en-GB'),
        status: 'in_progress',
        total_volume_kg: totalVolume,
      })
      .eq('id', sessionId)

    if (updateError) throw updateError

    if (checkInAt) {
      await supabase
        .from('workout_sessions')
        .update({ started_at: checkInAt })
        .eq('id', sessionId)
        .is('started_at', null)
    }
  } else {
    storageKey = `${day}_${timestamp}`
    const checkInAt = getLocalCheckIn(day) ?? now.toISOString()
    const { data: sessionRow, error: sessionError } = await supabase
      .from('workout_sessions')
      .insert({
        storage_key: storageKey,
        day,
        timestamp,
        save_time: now.toLocaleTimeString('en-GB', { hour12: false }),
        save_date: now.toLocaleDateString('en-GB'),
        exercises: { [exerciseName]: legacy },
        user_id: userId,
        started_at: checkInAt,
        status: 'in_progress',
        total_volume_kg: volume,
      })
      .select('id')
      .single()

    if (sessionError) throw sessionError
    sessionId = sessionRow.id as string

    const { error: setsError } = await supabase
      .from('workout_sets')
      .insert(setRows.map((r) => ({ ...r, session_id: sessionId })))

    if (setsError) throw setsError
  }

  const { prHit, prMessage } = await upsertPersonalRecordIfBetter(
    userId,
    exerciseName,
    exerciseRow?.id ?? null,
    validatedSets,
    now.toISOString(),
    day,
  )

  if (validatedSets.length > 0) {
    await recordTrainingDay(userId, now)
  }

  const refreshed = await fetchSessionsForDay(day)
  const merged = mergeSessionsForPrefill(refreshed)
  const session: WorkoutSession = merged ?? {
    id: sessionId,
    key: storageKey,
    day,
    timestamp,
    saveTime: now.toLocaleTimeString('en-GB', { hour12: false }),
    saveDate: now.toLocaleDateString('en-GB'),
    exercises: { [exerciseName]: legacy },
    exerciseSets: { [exerciseName]: sets },
  }

  return { session, sessions: refreshed, prHit, prMessage }
}

/** Remove one exercise from all sessions (and sets) for a section. */
export async function removeExerciseFromSectionHistory(
  sectionName: string,
  exerciseName: string,
): Promise<void> {
  if (!supabase || !exerciseName) return

  const userId = await ensureSupabaseUser()
  if (!userId) return

  const { data: sessions, error: listError } = await supabase
    .from('workout_sessions')
    .select('id, exercises')
    .eq('user_id', userId)
    .eq('day', sectionName)

  if (listError) throw listError

  const sessionIds: string[] = []
  for (const row of sessions ?? []) {
    const exercises = row.exercises as Record<string, Record<string, number>>
    if (!exercises?.[exerciseName]) continue
    sessionIds.push(row.id as string)
    const next = { ...exercises }
    delete next[exerciseName]
    const { error } = await supabase
      .from('workout_sessions')
      .update({ exercises: next })
      .eq('id', row.id)
    if (error) throw error
  }

  if (sessionIds.length > 0) {
    const { error: setsError } = await supabase
      .from('workout_sets')
      .delete()
      .eq('exercise_name', exerciseName)
      .in('session_id', sessionIds)
    if (setsError) throw setsError
  }

  const { data: planRows, error: planErr } = await supabase
    .from('workout_day_exercises')
    .select('id, workout_days!inner(name, user_id)')
    .eq('name', exerciseName)
    .eq('workout_days.user_id', userId)

  if (planErr) throw planErr

  const usedElsewhere = (planRows ?? []).some((row) => {
    const joined = row.workout_days as { name: string } | { name: string }[] | null
    const dayName =
      joined && typeof joined === 'object' && 'name' in joined
        ? joined.name
        : Array.isArray(joined) && joined[0]
          ? joined[0].name
          : ''
    return dayName !== '' && dayName !== sectionName
  })

  if (!usedElsewhere) {
    const { error: prError } = await supabase
      .from('personal_records')
      .delete()
      .eq('user_id', userId)
      .eq('exercise_name', exerciseName)
    if (prError) throw prError
  }
}

/** Rename exercise in one section's sessions, sets, and matching PR row. */
export async function renameExerciseInWorkoutHistory(
  sectionName: string,
  oldName: string,
  newName: string,
): Promise<void> {
  if (!supabase || oldName === newName || !sectionName) return

  const userId = await ensureSupabaseUser()
  if (!userId) return

  const { data: sessions, error: sessionsError } = await supabase
    .from('workout_sessions')
    .select('id, exercises')
    .eq('user_id', userId)
    .eq('day', sectionName)

  if (sessionsError) throw sessionsError

  const sessionIds: string[] = []
  for (const row of sessions ?? []) {
    const exercises = row.exercises as Record<string, Record<string, number>>
    if (!exercises?.[oldName]) continue
    sessionIds.push(row.id as string)
    const next = { ...exercises, [newName]: exercises[oldName] }
    delete next[oldName]
    const { error } = await supabase
      .from('workout_sessions')
      .update({ exercises: next })
      .eq('id', row.id)
    if (error) throw error
  }

  if (sessionIds.length > 0) {
    const { error: setsError } = await supabase
      .from('workout_sets')
      .update({ exercise_name: newName })
      .eq('exercise_name', oldName)
      .in('session_id', sessionIds)
    if (setsError) throw setsError
  }

  const { error: prError } = await supabase
    .from('personal_records')
    .update({ exercise_name: newName })
    .eq('user_id', userId)
    .eq('exercise_name', oldName)

  if (prError) throw prError
}

/** Mark today's active session for a section as completed. Returns false if nothing was updated. */
export async function finishWorkoutForDay(day: string): Promise<boolean> {
  const { completeActiveSession } = await import('./activeSession')
  return completeActiveSession(day)
}

export async function fetchPersonalRecords(): Promise<PersonalRecord[]> {
  if (!supabase) return []
  const auth = await tryEnsureSupabaseUser()
  if (!auth.ok) return []
  const userId = auth.userId

  const { data, error } = await supabase
    .from('personal_records')
    .select('exercise_name, weight_kg, reps, achieved_at')
    .eq('user_id', userId)
    .order('achieved_at', { ascending: false })

  if (error) throw error

  const bestByExercise = new Map<
    string,
    { exercise_name: string; weight_kg: number; reps: number; achieved_at: string }
  >()
  for (const row of data ?? []) {
    const name = row.exercise_name as string
    const weight = Number(row.weight_kg)
    const reps = Number(row.reps ?? 0)
    const prev = bestByExercise.get(name)
    if (!prev) {
      bestByExercise.set(name, {
        exercise_name: name,
        weight_kg: weight,
        reps,
        achieved_at: row.achieved_at as string,
      })
      continue
    }
    if (
      weight > prev.weight_kg ||
      (weight === prev.weight_kg && reps > prev.reps)
    ) {
      bestByExercise.set(name, {
        exercise_name: name,
        weight_kg: weight,
        reps,
        achieved_at: row.achieved_at as string,
      })
    }
  }

  return [...bestByExercise.values()]
    .sort((a, b) => b.weight_kg - a.weight_kg)
    .map((r) => ({
      exercise: r.exercise_name,
      weight: r.weight_kg,
      reps: r.reps,
      date: new Date(r.achieved_at).getTime(),
      set: 'PR',
    }))
}

export async function deleteAllCloudWorkouts(): Promise<void> {
  if (!supabase) return
  const userId = await ensureSupabaseUser()
  if (!userId) return

  const { data: sessions, error: listError } = await supabase
    .from('workout_sessions')
    .select('id')
    .eq('user_id', userId)

  if (listError) throw listError

  const ids = (sessions ?? []).map((s) => s.id)
  if (ids.length > 0) {
    const { error: setsError } = await supabase.from('workout_sets').delete().in('session_id', ids)
    if (setsError) throw setsError
    const { error: sessionsError } = await supabase
      .from('workout_sessions')
      .delete()
      .in('id', ids)
    if (sessionsError) throw sessionsError
  }

  const { error: prError } = await supabase
    .from('personal_records')
    .delete()
    .eq('user_id', userId)
  if (prError) throw prError

  const { error: tdError } = await supabase
    .from('training_days')
    .delete()
    .eq('user_id', userId)
  if (tdError) throw tdError
}

export async function testSupabaseConnection(): Promise<{
  ok: boolean
  message: string
  errorCode?: string
}> {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false, message: 'Missing Supabase env variables' }
  }

  const { count, error } = await supabase
    .from('exercises')
    .select('*', { count: 'exact', head: true })

  if (error) return { ok: false, message: error.message }

  const auth = await tryEnsureSupabaseUser()
  if (!auth.ok) {
    return {
      ok: false,
      message: auth.error.message,
      errorCode: auth.error.code,
    }
  }

  return {
    ok: true,
    message: `Connected · ${count ?? 0} exercises · user ${auth.userId.slice(0, 8)}…`,
  }
}
