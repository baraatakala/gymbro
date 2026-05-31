import { isSupabaseConfigured, supabase } from './supabase'
import { gymDayKey } from './dateUtils'
import { tryEnsureSupabaseUser } from './supabaseAuth'
import {
  fetchSessionsForDay,
  hasLocalWorkoutData,
  syncLocalSessionsForSection,
} from './supabaseSessions'
import { getAllSessions } from './storage'
import { sessionsLookCorrupt } from './sessionMerge'
import type { WorkoutSession } from '../types/workout'

export interface RepairReport {
  ok: boolean
  message: string
  localSynced: number
  zombiesRemoved: number
  stillCorrupt: boolean
}

/** Remove cloud session shells with no exercises and no sets (bad merge / CRUD fallout). */
export async function purgeZombieSessions(
  userId: string,
  sectionName?: string,
): Promise<number> {
  if (!supabase) return 0

  let query = supabase
    .from('workout_sessions')
    .select('id, day, exercises, storage_key')
    .eq('user_id', userId)

  if (sectionName) query = query.eq('day', sectionName)

  const { data: rows, error } = await query
  if (error || !rows?.length) return 0

  const zombieIds: string[] = []
  for (const row of rows) {
    const ex = row.exercises as Record<string, unknown> | null
    const keys = ex ? Object.keys(ex).length : 0
    if (keys > 0) continue

    const { count } = await supabase
      .from('workout_sets')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', row.id as string)

    if ((count ?? 0) === 0) zombieIds.push(row.id as string)
  }

  if (zombieIds.length === 0) return 0

  const { error: delSets } = await supabase
    .from('workout_sets')
    .delete()
    .in('session_id', zombieIds)
  if (delSets) throw delSets

  const { error: delSessions } = await supabase
    .from('workout_sessions')
    .delete()
    .in('id', zombieIds)
  if (delSessions) throw delSessions

  return zombieIds.length
}

/** Drop training_days rows that no longer have any session with real exercise data. */
export async function pruneOrphanTrainingDays(userId: string): Promise<number> {
  if (!supabase) return 0

  const { data: days, error } = await supabase
    .from('training_days')
    .select('trained_on')
    .eq('user_id', userId)

  if (error || !days?.length) return 0

  const { data: allSessions } = await supabase
    .from('workout_sessions')
    .select('exercises, timestamp')
    .eq('user_id', userId)

  let removed = 0
  for (const row of days) {
    const trainedOn = String(row.trained_on).slice(0, 10)
    const hasWork = (allSessions ?? []).some((s) => {
      if (gymDayKey(Number(s.timestamp)) !== trainedOn) return false
      const ex = s.exercises as Record<string, unknown> | null
      return ex && Object.keys(ex).length > 0
    })

    if (!hasWork) {
      const { error: del } = await supabase
        .from('training_days')
        .delete()
        .eq('user_id', userId)
        .eq('trained_on', trainedOn)
      if (!del) removed++
    }
  }
  return removed
}

/**
 * One-click repair: sync local logs → cloud, purge empty shells, reload section.
 * No manual re-entry when localStorage still has the workouts.
 */
export async function repairWorkoutIntegrity(
  sectionName: string,
): Promise<RepairReport> {
  if (!isSupabaseConfigured) {
    return {
      ok: false,
      message: 'Cloud not configured — using device storage only.',
      localSynced: 0,
      zombiesRemoved: 0,
      stillCorrupt: false,
    }
  }

  const auth = await tryEnsureSupabaseUser()
  if (!auth.ok) {
    return {
      ok: false,
      message: auth.error.message,
      localSynced: 0,
      zombiesRemoved: 0,
      stillCorrupt: true,
    }
  }

  const userId = auth.userId
  let localSynced = 0
  let zombiesRemoved = 0

  const localForSection = getAllSessions().filter((s) => s.day === sectionName)
  const localAny = hasLocalWorkoutData()

  if (localForSection.length > 0 || localAny) {
    const sync = await syncLocalSessionsForSection(sectionName)
    localSynced = sync.uploaded
  }

  zombiesRemoved = await purgeZombieSessions(userId, sectionName)
  await pruneOrphanTrainingDays(userId)

  const refreshed = await fetchSessionsForDay(sectionName)
  const stillCorrupt = sessionsLookCorrupt(refreshed)

  let message: string
  if (localSynced > 0 && !stillCorrupt) {
    message = `Restored ${localSynced} exercise log${localSynced !== 1 ? 's' : ''} from this device.`
  } else if (zombiesRemoved > 0 && !stillCorrupt) {
    message = `Removed ${zombiesRemoved} empty cloud record${zombiesRemoved !== 1 ? 's' : ''}. Stats are clean — save any exercise to continue.`
  } else if (localSynced > 0 && stillCorrupt) {
    message = `Synced ${localSynced} log(s) but some rows still need a quick re-save on one exercise.`
  } else if (stillCorrupt) {
    message =
      'Cloud rows are damaged and no local backup was found on this browser. Save one set on any exercise to rebuild history.'
  } else if (zombiesRemoved > 0) {
    message = `Cleaned ${zombiesRemoved} empty session${zombiesRemoved !== 1 ? 's' : ''}.`
  } else {
    message = 'Nothing to repair — data looks consistent.'
  }

  return {
    ok: !stillCorrupt || localSynced > 0,
    message,
    localSynced,
    zombiesRemoved,
    stillCorrupt,
  }
}

export function sectionNeedsRepair(sessions: WorkoutSession[]): boolean {
  return sessionsLookCorrupt(sessions)
}
