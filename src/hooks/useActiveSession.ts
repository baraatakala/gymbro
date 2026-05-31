import { useCallback, useEffect, useState } from 'react'
import {
  autoCloseStaleSessions,
  completeActiveSessionById,
  fetchActiveSession,
  startWorkoutSession,
  type ActiveWorkoutSession,
} from '../lib/activeSession'
import { isSupabaseConfigured } from '../lib/supabase'

export function useActiveSession(enabled: boolean) {
  const [active, setActive] = useState<ActiveWorkoutSession | null>(null)
  const [staleClosed, setStaleClosed] = useState(0)
  const [loading, setLoading] = useState(false)
  const [pendingConflict, setPendingConflict] = useState<ActiveWorkoutSession | null>(null)

  const refresh = useCallback(async () => {
    if (!enabled || !isSupabaseConfigured) {
      setActive(null)
      return
    }
    setLoading(true)
    try {
      const closed = await autoCloseStaleSessions()
      setStaleClosed(closed)
      const row = await fetchActiveSession()
      setActive(row)
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const beginSection = useCallback(
    async (
      section: string,
    ): Promise<
      | { status: 'ok'; session: ActiveWorkoutSession }
      | { status: 'conflict'; existing: ActiveWorkoutSession }
      | { status: 'offline' }
    > => {
      const result = await startWorkoutSession(section)
      if (!result.ok) {
        if (result.reason === 'conflict') {
          setPendingConflict(result.existing)
          setActive(result.existing)
          return { status: 'conflict', existing: result.existing }
        }
        return { status: 'offline' }
      }
      setPendingConflict(null)
      setActive(result.session)
      return { status: 'ok', session: result.session }
    },
    [],
  )

  const endOtherAndBegin = useCallback(
    async (other: ActiveWorkoutSession, newSection: string) => {
      await completeActiveSessionById(other.id, other.section)
      setPendingConflict(null)
      const result = await startWorkoutSession(newSection)
      if (result.ok) {
        setActive(result.session)
        return true
      }
      return false
    },
    [],
  )

  const dismissConflict = useCallback(() => {
    setPendingConflict(null)
  }, [])

  return {
    active,
    staleClosed,
    loading,
    pendingConflict,
    refresh,
    beginSection,
    endOtherAndBegin,
    dismissConflict,
    isSessionActive: active !== null,
  }
}
