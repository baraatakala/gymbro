import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { mergePersonalRecordSources } from '../lib/analytics'
import { clearExerciseLibraryCache } from '../lib/exerciseLibrary'
import { isCardioSection } from '../lib/sectionUtils'
import { validateSetEntries } from '../lib/validators'
import { isAuthSetupError, tryEnsureSupabaseUser } from '../lib/supabaseAuth'
import { fetchLibraryStats, prefetchExerciseLibrary } from '../lib/exerciseLibrary'
import {
  claimOrphanSessionsForUser,
  deleteAllCloudWorkouts,
  fetchPersonalRecords,
  fetchSessionsForDay,
  fetchTrainingCalendarDates,
  finishWorkoutForDay,
  hasLocalWorkoutData,
  saveExerciseToSupabase,
  syncLocalSessionsToCloud,
  purgeLocalSessionsClearedInCloud,
  type SaveSetResult,
} from '../lib/supabaseSessions'
import { isSupabaseConfigured } from '../lib/supabase'
import type { PersonalRecord, SetEntry, WorkoutSession } from '../types/workout'
import type { UserWorkoutPlan } from '../types/plan'
import {
  addExerciseToDay,
  addWorkoutDay,
  deletePlanExercise,
  deleteWorkoutDay,
  fetchUserPlan,
  movePlanExercise,
  renamePlanExercise,
  renameWorkoutDay,
  repairEmptyPlanSections,
  resetPlanToLibraryDefaults,
} from '../lib/workoutPlan'
import { finishWorkoutLocally, saveExerciseLocally } from '../lib/localWorkout'
import { deleteAllWorkoutData, getSessionsForDay } from '../lib/storage'
import { repairWorkoutIntegrity } from '../lib/repairWorkoutIntegrity'
import { sessionsLookCorrupt } from '../lib/sessionMerge'

const SESSION_FETCH_TIMEOUT_MS = 20_000
const REFRESH_TIMEOUT_MS = 25_000

function fetchSessionsWithTimeout(dayLabel: string) {
  return Promise.race([
    fetchSessionsForDay(dayLabel),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Session fetch timed out')), SESSION_FETCH_TIMEOUT_MS)
    }),
  ])
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out`)), ms)
    }),
  ])
}

export function useWorkoutData(activeDayId: string, activeDayName: string) {
  const [plan, setPlan] = useState<UserWorkoutPlan>({ days: [] })
  const [sessions, setSessions] = useState<WorkoutSession[]>([])
  const [records, setRecords] = useState<PersonalRecord[]>([])
  const [libraryStats, setLibraryStats] = useState({ exercises: 0, muscles: 0 })
  const [trainingCalendarDates, setTrainingCalendarDates] = useState<string[]>([])
  const [dataSource, setDataSource] = useState<'loading' | 'supabase' | 'local' | 'offline'>(
    'loading',
  )
  const [error, setError] = useState('')
  const [errorCode, setErrorCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const [repairing, setRepairing] = useState(false)
  const autoRepairSections = useRef(new Set<string>())
  const sessionsBySection = useRef(new Map<string, WorkoutSession[]>())

  const refreshStats = useCallback(async () => {
    try {
      const [recs, trained] = await Promise.all([
        fetchPersonalRecords(),
        fetchTrainingCalendarDates(),
      ])
      setRecords(recs)
      setTrainingCalendarDates(trained)
    } catch {
      /* optional */
    }
  }, [])

  const userIdRef = useRef<string | null>(null)
  const sectionRef = useRef(activeDayName)
  const skipNextSessionLoad = useRef(true)
  const claimedOrphansRef = useRef(false)
  const syncedLocalRef = useRef(false)
  const sessionsLoadId = useRef(0)
  const sessionFetchInFlight = useRef(0)
  const planReadyRef = useRef(false)
  const [planReady, setPlanReady] = useState(false)

  const beginSessionFetch = useCallback(() => {
    sessionFetchInFlight.current += 1
    if (sessionFetchInFlight.current === 1) {
      setSessionsLoading(true)
    }
  }, [])

  const endSessionFetch = useCallback(() => {
    sessionFetchInFlight.current = Math.max(0, sessionFetchInFlight.current - 1)
    if (sessionFetchInFlight.current === 0) {
      setSessionsLoading(false)
    }
  }, [])

  const activeDay =
    (activeDayId ? plan.days.find((d) => d.id === activeDayId) : null) ??
    plan.days.find((d) => d.name === activeDayName) ??
    plan.days[0] ??
    null

  const sectionName = activeDay?.name ?? activeDayName
  sectionRef.current = sectionName
  const isInitialLoading = dataSource === 'loading' && !planReady

  const loadSessions = useCallback(async (dayLabel: string) => {
    const loadId = ++sessionsLoadId.current
    if (!isSupabaseConfigured) {
      setSessions(getSessionsForDay(dayLabel))
      return
    }
    beginSessionFetch()
    try {
      const auth = await tryEnsureSupabaseUser()
      if (!auth.ok) {
        if (loadId === sessionsLoadId.current) {
          setSessions(getSessionsForDay(dayLabel))
        }
        return
      }
      userIdRef.current = auth.userId
      if (!claimedOrphansRef.current) {
        await claimOrphanSessionsForUser(auth.userId)
        claimedOrphansRef.current = true
      }
      await purgeLocalSessionsClearedInCloud()
      if (!syncedLocalRef.current && hasLocalWorkoutData()) {
        const { uploaded } = await syncLocalSessionsToCloud()
        syncedLocalRef.current = true
        if (uploaded > 0) {
          setSyncMessage(`Synced ${uploaded} local log${uploaded !== 1 ? 's' : ''} to cloud`)
        }
      }
      const cloudSessions = await fetchSessionsWithTimeout(dayLabel)
      if (loadId === sessionsLoadId.current) {
        setSessions(cloudSessions)
      }
    } catch {
      if (loadId === sessionsLoadId.current) {
        setSessions(getSessionsForDay(dayLabel))
      }
    } finally {
      endSessionFetch()
    }
  }, [beginSessionFetch, endSessionFetch])

  const refresh = useCallback(async () => {
    setError('')
    setErrorCode('')
    if (!isSupabaseConfigured) {
      setDataSource('offline')
      setSessions(getSessionsForDay(sectionName))
      return null
    }

    if (!planReadyRef.current) {
      setDataSource('loading')
    }
    try {
      const auth = await tryEnsureSupabaseUser()
      if (!auth.ok) {
        setError(auth.error.message)
        setErrorCode(auth.error.code)
        setSessions(getSessionsForDay(sectionName))
        setDataSource('local')
        return null
      }

      userIdRef.current = auth.userId
      const dayLabel = sectionRef.current

      if (!claimedOrphansRef.current) {
        await claimOrphanSessionsForUser(auth.userId)
        claimedOrphansRef.current = true
      }
      await purgeLocalSessionsClearedInCloud()
      if (!syncedLocalRef.current && hasLocalWorkoutData()) {
        const { uploaded } = await syncLocalSessionsToCloud()
        syncedLocalRef.current = true
        if (uploaded > 0) {
          setSyncMessage(`Synced ${uploaded} local log${uploaded !== 1 ? 's' : ''} to cloud`)
        }
      }

      const sessionsLoadIdAtStart = sessionsLoadId.current
      const [userPlan, cloudSessions, cloudRecords, stats, trainedDates] = await withTimeout(
        Promise.all([
          fetchUserPlan(auth.userId),
          fetchSessionsWithTimeout(dayLabel),
          fetchPersonalRecords(),
          fetchLibraryStats(),
          fetchTrainingCalendarDates(),
        ]),
        REFRESH_TIMEOUT_MS,
        'Refresh',
      )

      setPlan(userPlan)
      sessionsBySection.current.set(dayLabel, cloudSessions)
      if (sessionsLoadIdAtStart === sessionsLoadId.current) {
        setSessions(cloudSessions)
      }
      setRecords(cloudRecords)
      setLibraryStats(stats)
      setTrainingCalendarDates(trainedDates)
      setDataSource('supabase')
      planReadyRef.current = true
      setPlanReady(true)
      skipNextSessionLoad.current = true
      prefetchExerciseLibrary()
      return userPlan
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load plan'
      setError(msg)
      if (isAuthSetupError(e)) setErrorCode(e.code)
      setSessions(getSessionsForDay(sectionRef.current))
      setDataSource('local')
      return null
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  /** Never leave the section overlay stuck if a fetch hangs or races. */
  useEffect(() => {
    if (!sessionsLoading) return
    const t = window.setTimeout(() => {
      sessionFetchInFlight.current = 0
      setSessionsLoading(false)
    }, REFRESH_TIMEOUT_MS + 5_000)
    return () => window.clearTimeout(t)
  }, [sessionsLoading])

  useEffect(() => {
    if (!planReady || dataSource === 'loading') return
    if (skipNextSessionLoad.current) {
      skipNextSessionLoad.current = false
      return
    }
    const cached = sessionsBySection.current.get(sectionName)
    if (cached?.length) {
      setSessions(cached)
    } else if (!isSupabaseConfigured) {
      setSessions(getSessionsForDay(sectionName))
    }
    void loadSessions(sectionName)
  }, [sectionName, activeDayId, planReady, dataSource, loadSessions])

  const saveExercise = useCallback(
    async (exerciseName: string, sets: SetEntry[]) => {
      const saveSection = sectionRef.current
      const cardio = isCardioSection(saveSection)
      const validated = validateSetEntries(sets, { cardio, exerciseName })

      const applyLocal = (result: SaveSetResult) => {
        sessionsBySection.current.set(saveSection, result.sessions)
        if (sectionRef.current === saveSection) {
          setSessions(result.sessions)
          setDataSource((prev) =>
            prev === 'supabase' ? prev : ('local' as const),
          )
        }
        return result
      }

      if (!isSupabaseConfigured) {
        return applyLocal(saveExerciseLocally(saveSection, exerciseName, validated))
      }

      try {
        const result = await saveExerciseToSupabase(
          saveSection,
          exerciseName,
          validated,
          { cardio },
        )
        sessionsBySection.current.set(saveSection, result.sessions)
        if (sectionRef.current === saveSection) {
          setSessions(result.sessions)
          setDataSource('supabase')
        }
        await purgeLocalSessionsClearedInCloud()
        if (hasLocalWorkoutData()) {
          await syncLocalSessionsToCloud()
        }
        await refreshStats()
        return result
      } catch (e) {
        const useLocal =
          dataSource === 'local' ||
          dataSource === 'offline' ||
          isAuthSetupError(e) ||
          (e instanceof Error &&
            /not configured|not signed in|anonymous|network|fetch failed/i.test(
              e.message,
            ))
        if (!useLocal) throw e
        return applyLocal(saveExerciseLocally(saveSection, exerciseName, validated))
      }
    },
    [dataSource, refreshStats, sectionName],
  )

  const refreshPlan = useCallback(async () => {
    if (!userIdRef.current) {
      await refresh()
      return
    }
    try {
      const userPlan = await fetchUserPlan(userIdRef.current)
      setPlan(userPlan)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to refresh plan')
    }
  }, [refresh])

  const addExerciseToActiveDay = useCallback(
    async (name: string, exerciseId?: string | null) => {
      if (!activeDay) throw new Error('No active section')
      await addExerciseToDay(activeDay.id, name, exerciseId)
      await refreshPlan()
    },
    [activeDay, refreshPlan],
  )

  const removeExercise = useCallback(
    async (planExerciseId: string) => {
      await deletePlanExercise(planExerciseId)
      await refreshPlan()
      await loadSessions(sectionName)
      await refreshStats()
    },
    [loadSessions, refreshPlan, refreshStats, sectionName],
  )

  const renameExercise = useCallback(
    async (planExerciseId: string, newName: string) => {
      await renamePlanExercise(planExerciseId, newName)
      await refreshPlan()
      await loadSessions(sectionName)
      await refreshStats()
    },
    [refreshPlan, loadSessions, refreshStats, sectionName],
  )

  const moveExercise = useCallback(
    async (planExerciseId: string, direction: 'up' | 'down') => {
      if (!activeDay) throw new Error('No active section')
      await movePlanExercise(activeDay.id, planExerciseId, direction)
      await refreshPlan()
    },
    [activeDay, refreshPlan],
  )

  const addDay = useCallback(
    async (name: string) => {
      const day = await addWorkoutDay(name)
      await refreshPlan()
      await loadSessions(name)
      return day
    },
    [loadSessions, refreshPlan],
  )

  const renameDay = useCallback(
    async (dayId: string, name: string) => {
      await renameWorkoutDay(dayId, name)
      await refreshPlan()
      await loadSessions(name)
    },
    [loadSessions, refreshPlan],
  )

  const removeDay = useCallback(
    async (dayId: string) => {
      const deletingActive = activeDay?.id === dayId
      const remaining = plan.days.filter((d) => d.id !== dayId)
      if (deletingActive && remaining[0]) {
        sectionRef.current = remaining[0].name
      }
      await deleteWorkoutDay(dayId)
      const updated = await refresh()
      if (deletingActive && remaining[0]) {
        await loadSessions(remaining[0].name)
      }
      return updated?.days[0] ?? null
    },
    [activeDay?.id, loadSessions, plan.days, refresh],
  )

  const repairIntegrity = useCallback(
    async (targetSection?: string) => {
      const label = targetSection ?? sectionRef.current
      setRepairing(true)
      setError('')
      try {
        const report = await repairWorkoutIntegrity(label)
        await loadSessions(label)
        await refreshStats()
        setSyncMessage(report.message)
        return report
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Repair failed'
        setError(msg)
        throw e
      } finally {
        setRepairing(false)
      }
    },
    [loadSessions, refreshStats],
  )

  useEffect(() => {
    autoRepairSections.current.delete(sectionName)
  }, [sectionName])

  useEffect(() => {
    if (!planReady || dataSource !== 'supabase') return
    if (autoRepairSections.current.has(sectionName)) return
    if (!sessionsLookCorrupt(sessions)) return
    autoRepairSections.current.add(sectionName)
    void repairIntegrity(sectionName).catch(() => {
      autoRepairSections.current.delete(sectionName)
    })
  }, [planReady, dataSource, sessions, sectionName, repairIntegrity])

  const resetPlan = useCallback(async () => {
    setBusy(true)
    try {
      const newPlan = await resetPlanToLibraryDefaults()
      setPlan(newPlan)
      setPlanReady(true)
      await loadSessions(sectionName)
      return newPlan
    } finally {
      setBusy(false)
    }
  }, [loadSessions, sectionName])

  const resetAll = useCallback(async () => {
    await deleteAllCloudWorkouts()
    deleteAllWorkoutData()
    syncedLocalRef.current = false
    claimedOrphansRef.current = false
    autoRepairSections.current.clear()
    sessionsBySection.current.clear()
    clearExerciseLibraryCache()
    setSessions([])
    setRecords([])
    setTrainingCalendarDates([])
    await refresh()
  }, [refresh])

  const emptySectionCount = plan.days.filter((d) => d.exercises.length === 0).length

  const displayRecords = useMemo(
    () => mergePersonalRecordSources(records, sessions),
    [records, sessions],
  )

  const repairEmpty = useCallback(async () => {
    if (!userIdRef.current) {
      await refresh()
      return
    }
    setBusy(true)
    try {
      const userPlan = await repairEmptyPlanSections(userIdRef.current, plan)
      setPlan(userPlan)
      await loadSessions(sectionName)
    } finally {
      setBusy(false)
    }
  }, [loadSessions, plan, refresh, sectionName])

  const reloadSessions = useCallback(async () => {
    await loadSessions(sectionName)
  }, [loadSessions, sectionName])

  const finishWorkout = useCallback(async (): Promise<boolean> => {
    if (!isSupabaseConfigured || dataSource === 'local' || dataSource === 'offline') {
      return finishWorkoutLocally(sectionName)
    }
    try {
      const ok = await finishWorkoutForDay(sectionName)
      if (ok) await loadSessions(sectionName)
      return ok
    } catch {
      return finishWorkoutLocally(sectionName)
    }
  }, [dataSource, loadSessions, sectionName])

  return {
    plan,
    activeDay,
    sectionName,
    sessions,
    records: displayRecords,
    libraryStats,
    trainingDays: trainingCalendarDates.length,
    trainingCalendarDates,
    dataSource,
    error,
    errorCode,
    isInitialLoading,
    sessionsLoading,
    syncMessage,
    clearSyncMessage: useCallback(() => setSyncMessage(null), []),
    busy,
    repairing,
    repairIntegrity,
    emptySectionCount,
    refresh,
    reloadSessions,
    saveExercise,
    addExerciseToActiveDay,
    removeExercise,
    renameExercise,
    moveExercise,
    addDay,
    renameDay,
    removeDay,
    resetPlan,
    resetAll,
    repairEmpty,
    finishWorkout,
    hasLocalBackup: hasLocalWorkoutData(),
  }
}
