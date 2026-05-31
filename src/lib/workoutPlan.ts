import { supabase } from './supabase'
import { ensureSupabaseUser } from './supabaseAuth'
import {
  fetchCatalogFromSupabase,
  removeExerciseFromSectionHistory,
  renameExerciseInWorkoutHistory,
} from './supabaseSessions'
import { pickExercisesForSection } from './sectionUtils'
import { validateExerciseName, validateSectionName } from './validators'
import type { ExerciseCatalog } from '../types/workout'
import type { PlanExercise, UserWorkoutPlan, WorkoutDayPlan } from '../types/plan'

const DEFAULT_DAY_NAMES = [
  'Chest',
  'Back',
  'Shoulders',
  'Legs',
  'Arms',
  'Core',
  'Cardio',
  'Push',
  'Pull',
  'Upper',
  'Lower',
  'Full Body A',
  'Full Body B',
  'Conditioning',
]

function formatDbError(error: { message?: string; code?: string }, action: string): Error {
  const msg = error.message ?? 'Database error'
  if (error.code === '23505') {
    return new Error('That name is already used on another section. Pick a different name.')
  }
  if (error.code === '42501' || msg.toLowerCase().includes('row-level security')) {
    return new Error(
      `Permission denied while ${action}. Refresh the page to re-sign in. If it persists, check Supabase RLS on workout_days.`,
    )
  }
  return new Error(`${action}: ${msg}`)
}

export async function fetchUserPlan(knownUserId?: string | null): Promise<UserWorkoutPlan> {
  if (!supabase) return { days: [] }

  const userId = knownUserId ?? (await ensureSupabaseUser())
  if (!userId) return { days: [] }

  const { data: days, error: daysError } = await supabase
    .from('workout_days')
    .select('id, name, sort_order')
    .eq('user_id', userId)
    .order('sort_order')

  if (daysError) throw formatDbError(daysError, 'loading workout sections')
  if (!days?.length) {
    return initializeDefaultPlan(userId)
  }

  const dayIds = days.map((d) => d.id)
  const { data: exercises, error: exError } = await supabase
    .from('workout_day_exercises')
    .select('id, day_id, name, exercise_id, sort_order')
    .in('day_id', dayIds)
    .order('sort_order')

  if (exError) throw formatDbError(exError, 'loading exercises')

  const plan: WorkoutDayPlan[] = days.map((d) => ({
    id: d.id as string,
    name: d.name as string,
    sortOrder: d.sort_order as number,
    exercises: (exercises ?? [])
      .filter((e) => e.day_id === d.id)
      .map((e) => ({
        id: e.id as string,
        name: e.name as string,
        exerciseId: (e.exercise_id as string) ?? null,
        sortOrder: e.sort_order as number,
      })),
  }))

  return { days: plan }
}

/** Backfill sections that have zero exercises (e.g. Full Body A after first init). */
export async function repairEmptyPlanSections(
  userId: string,
  plan: UserWorkoutPlan,
): Promise<UserWorkoutPlan> {
  if (!supabase) return plan

  const emptyDays = plan.days.filter((d) => d.exercises.length === 0)
  if (emptyDays.length === 0) return plan

  const catalog = await fetchCatalogFromSupabase()
  const idByName = await resolveExerciseIds()
  const rows: {
    day_id: string
    name: string
    exercise_id: string | null
    sort_order: number
  }[] = []

  for (const day of emptyDays) {
    const names = pickExercisesForSection(day.name, catalog)
    names.forEach((name, idx) => {
      rows.push({
        day_id: day.id,
        name,
        exercise_id: idByName.get(name.toLowerCase()) ?? null,
        sort_order: idx,
      })
    })
  }

  if (rows.length > 0) {
    const { error } = await supabase.from('workout_day_exercises').insert(rows)
    if (error) throw formatDbError(error, 'filling empty sections')
  }

  return fetchUserPlan(userId)
}

async function resolveExerciseIds(): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  if (!supabase) return map
  const { data } = await supabase.from('exercises').select('id, name')
  for (const row of data ?? []) {
    map.set((row.name as string).toLowerCase(), row.id as string)
  }
  return map
}

async function initializeDefaultPlan(userId: string): Promise<UserWorkoutPlan> {
  if (!supabase) return { days: [] }

  const { count } = await supabase
    .from('workout_days')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (count && count > 0) {
    return fetchUserPlan(userId)
  }

  const catalog = await fetchCatalogFromSupabase()
  const idByName = await resolveExerciseIds()

  const daysToCreate = DEFAULT_DAY_NAMES.map((name, i) => ({
    user_id: userId,
    name,
    sort_order: i,
  }))

  const { data: insertedDays, error } = await supabase!
    .from('workout_days')
    .insert(daysToCreate)
    .select('id, name, sort_order')

  if (error) {
    if (error.code === '23505') return fetchUserPlan(userId)
    throw formatDbError(error, 'creating workout sections')
  }

  const exerciseRows: {
    day_id: string
    name: string
    exercise_id: string | null
    sort_order: number
  }[] = []

  for (const day of insertedDays ?? []) {
    const dayName = day.name as string
    const names = pickExercisesForSection(dayName, catalog as ExerciseCatalog | null)

    names.forEach((name, idx) => {
      exerciseRows.push({
        day_id: day.id as string,
        name,
        exercise_id: idByName.get(name.toLowerCase()) ?? null,
        sort_order: idx,
      })
    })
  }

  if (exerciseRows.length > 0) {
    const { error: exInsertError } = await supabase!
      .from('workout_day_exercises')
      .insert(exerciseRows)
    if (exInsertError) throw formatDbError(exInsertError, 'seeding section exercises')
  }

  return fetchUserPlan(userId)
}

export async function addWorkoutDay(name: string): Promise<WorkoutDayPlan> {
  const userId = await ensureSupabaseUser()
  if (!userId || !supabase) throw new Error('Not signed in')

  const trimmed = validateSectionName(name)

  const { data: duplicate } = await supabase
    .from('workout_days')
    .select('id')
    .eq('user_id', userId)
    .ilike('name', trimmed)
    .maybeSingle()

  if (duplicate) {
    throw new Error(`You already have a section named “${trimmed}”.`)
  }

  const { data: maxRow } = await supabase
    .from('workout_days')
    .select('sort_order')
    .eq('user_id', userId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const sortOrder = (maxRow?.sort_order ?? -1) + 1

  const { data, error } = await supabase
    .from('workout_days')
    .insert({ user_id: userId, name: trimmed, sort_order: sortOrder })
    .select('id, name, sort_order')
    .single()

  if (error) throw error

  return {
    id: data.id as string,
    name: data.name as string,
    sortOrder: data.sort_order as number,
    exercises: [],
  }
}

export async function renameWorkoutDay(dayId: string, name: string): Promise<void> {
  if (!supabase) throw new Error('Not connected')
  const userId = await ensureSupabaseUser()

  const trimmed = validateSectionName(name)

  const { data: duplicate } = await supabase
    .from('workout_days')
    .select('id')
    .eq('user_id', userId)
    .ilike('name', trimmed)
    .neq('id', dayId)
    .maybeSingle()

  if (duplicate) {
    throw new Error(`You already have a section named “${trimmed}”.`)
  }

  const { data: dayRow } = await supabase
    .from('workout_days')
    .select('name')
    .eq('id', dayId)
    .maybeSingle()

  const oldName = dayRow?.name as string | undefined

  const { error } = await supabase.from('workout_days').update({ name: trimmed }).eq('id', dayId)
  if (error) throw formatDbError(error, 'renaming section')

  if (userId && oldName && oldName !== trimmed) {
    await supabase
      .from('workout_sessions')
      .update({ day: trimmed })
      .eq('day', oldName)
      .eq('user_id', userId)
  }
}

export async function deleteWorkoutDay(dayId: string): Promise<void> {
  if (!supabase) throw new Error('Not connected')

  const userId = await ensureSupabaseUser()
  const { data: dayRow } = await supabase
    .from('workout_days')
    .select('name')
    .eq('id', dayId)
    .maybeSingle()

  const sectionName = dayRow?.name as string | undefined

  const { data: planExercises } = await supabase
    .from('workout_day_exercises')
    .select('name')
    .eq('day_id', dayId)

  const exerciseNames = (planExercises ?? []).map((e) => e.name as string).filter(Boolean)

  if (sectionName && userId) {
    const { data: sessions } = await supabase
      .from('workout_sessions')
      .select('id')
      .eq('day', sectionName)
      .eq('user_id', userId)

    const ids = (sessions ?? []).map((s) => s.id as string)
    if (ids.length > 0) {
      const { error: setsError } = await supabase
        .from('workout_sets')
        .delete()
        .in('session_id', ids)
      if (setsError) throw formatDbError(setsError, 'deleting workout sets')

      const { error: sessionsError } = await supabase
        .from('workout_sessions')
        .delete()
        .in('id', ids)
      if (sessionsError) throw formatDbError(sessionsError, 'deleting workout history')
    }

    if (exerciseNames.length > 0) {
      const { error: prError } = await supabase
        .from('personal_records')
        .delete()
        .eq('user_id', userId)
        .in('exercise_name', exerciseNames)
      if (prError) throw formatDbError(prError, 'deleting personal records')
    }
  }

  const { error } = await supabase.from('workout_days').delete().eq('id', dayId)
  if (error) throw formatDbError(error, 'deleting section')
}

export async function addExerciseToDay(
  dayId: string,
  name: string,
  exerciseId?: string | null,
): Promise<PlanExercise> {
  if (!supabase) throw new Error('No supabase')

  const trimmed = validateExerciseName(name)

  const { data: existing } = await supabase
    .from('workout_day_exercises')
    .select('id')
    .eq('day_id', dayId)
    .ilike('name', trimmed)
    .maybeSingle()

  if (existing) {
    throw new Error(`"${trimmed}" is already on this section`)
  }

  const { data: maxRow } = await supabase
    .from('workout_day_exercises')
    .select('sort_order')
    .eq('day_id', dayId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const sortOrder = (maxRow?.sort_order ?? -1) + 1

  const { data, error } = await supabase
    .from('workout_day_exercises')
    .insert({
      day_id: dayId,
      name: trimmed,
      exercise_id: exerciseId ?? null,
      sort_order: sortOrder,
    })
    .select('id, name, exercise_id, sort_order')
    .single()

  if (error) throw error

  return {
    id: data.id as string,
    name: data.name as string,
    exerciseId: (data.exercise_id as string) ?? null,
    sortOrder: data.sort_order as number,
  }
}

export async function renamePlanExercise(exerciseRowId: string, name: string): Promise<void> {
  if (!supabase) throw new Error('Not connected')

  const trimmed = validateExerciseName(name)

  const { data: row } = await supabase
    .from('workout_day_exercises')
    .select('name, day_id, workout_days ( name )')
    .eq('id', exerciseRowId)
    .maybeSingle()

  const oldName = row?.name as string | undefined
  const dayId = row?.day_id as string | undefined
  const dayJoin = row?.workout_days as { name: string } | { name: string }[] | null
  const sectionName =
    dayJoin && typeof dayJoin === 'object' && 'name' in dayJoin
      ? dayJoin.name
      : Array.isArray(dayJoin) && dayJoin[0]
        ? dayJoin[0].name
        : ''
  if (dayId) {
    const { data: dup } = await supabase
      .from('workout_day_exercises')
      .select('id')
      .eq('day_id', dayId)
      .ilike('name', trimmed)
      .neq('id', exerciseRowId)
      .maybeSingle()
    if (dup) throw new Error(`“${trimmed}” is already on this section.`)
  }

  const { error } = await supabase
    .from('workout_day_exercises')
    .update({ name: trimmed })
    .eq('id', exerciseRowId)
  if (error) throw formatDbError(error, 'renaming exercise')

  if (oldName && oldName !== trimmed && sectionName) {
    await renameExerciseInWorkoutHistory(sectionName, oldName, trimmed)
  }
}

export async function deletePlanExercise(exerciseRowId: string): Promise<void> {
  if (!supabase) throw new Error('Not connected')

  const { data: row } = await supabase
    .from('workout_day_exercises')
    .select('name, day_id, workout_days ( name )')
    .eq('id', exerciseRowId)
    .maybeSingle()

  const exerciseName = row?.name as string | undefined
  const dayJoin = row?.workout_days as { name: string } | { name: string }[] | null
  const sectionName =
    dayJoin && typeof dayJoin === 'object' && 'name' in dayJoin
      ? dayJoin.name
      : Array.isArray(dayJoin) && dayJoin[0]
        ? dayJoin[0].name
        : undefined

  const { error } = await supabase.from('workout_day_exercises').delete().eq('id', exerciseRowId)
  if (error) throw formatDbError(error, 'removing exercise')

  if (exerciseName && sectionName) {
    await removeExerciseFromSectionHistory(sectionName, exerciseName)
  }
}

export async function movePlanExercise(
  dayId: string,
  exerciseRowId: string,
  direction: 'up' | 'down',
): Promise<void> {
  if (!supabase) throw new Error('Not connected')

  const { data: rows, error } = await supabase
    .from('workout_day_exercises')
    .select('id, sort_order')
    .eq('day_id', dayId)
    .order('sort_order')

  if (error || !rows?.length) throw error ?? new Error('No exercises')

  const idx = rows.findIndex((r) => r.id === exerciseRowId)
  if (idx < 0) return
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1
  if (swapIdx < 0 || swapIdx >= rows.length) return

  const a = rows[idx]
  const b = rows[swapIdx]

  const { error: errA } = await supabase
    .from('workout_day_exercises')
    .update({ sort_order: b.sort_order })
    .eq('id', a.id)
  if (errA) throw formatDbError(errA, 'reordering exercise')

  const { error: errB } = await supabase
    .from('workout_day_exercises')
    .update({ sort_order: a.sort_order })
    .eq('id', b.id)
  if (errB) throw formatDbError(errB, 'reordering exercise')
}

export async function resetPlanToLibraryDefaults(): Promise<UserWorkoutPlan> {
  const userId = await ensureSupabaseUser()
  if (!userId || !supabase) throw new Error('Not signed in')

  const { data: days } = await supabase.from('workout_days').select('id').eq('user_id', userId)
  const ids = (days ?? []).map((d) => d.id)
  if (ids.length) {
    await supabase.from('workout_day_exercises').delete().in('day_id', ids)
    await supabase.from('workout_days').delete().eq('user_id', userId)
  }

  return initializeDefaultPlan(userId)
}
