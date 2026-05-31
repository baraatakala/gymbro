import { useCallback, useEffect, useState } from 'react'
import { isSupabaseConfigured } from '../lib/supabase'
import { ensureSupabaseUser, isAuthSetupError } from '../lib/supabaseAuth'
import {
  hasLocalWorkoutData,
  syncLocalSessionsToCloud,
  testSupabaseConnection,
} from '../lib/supabaseSessions'

type CloudStatus = 'idle' | 'checking' | 'connected' | 'error' | 'disabled'

export function useSupabase() {
  const [status, setStatus] = useState<CloudStatus>(isSupabaseConfigured ? 'checking' : 'disabled')
  const [message, setMessage] = useState('')
  const [syncing, setSyncing] = useState(false)

  const checkConnection = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setStatus('disabled')
      setMessage(supabaseConfigHint())
      return
    }

    setStatus('checking')
    try {
      const result = await testSupabaseConnection()
      setStatus(result.ok ? 'connected' : 'error')
      setMessage(result.message)
    } catch (e) {
      setStatus('error')
      setMessage(e instanceof Error ? e.message : 'Connection check failed')
    }
  }, [])

  useEffect(() => {
    void checkConnection()
  }, [checkConnection])

  const syncToCloud = useCallback(async () => {
    if (!isSupabaseConfigured) {
      return { ok: false, message: 'Supabase not configured' }
    }

    setSyncing(true)
    try {
      await ensureSupabaseUser()
      if (!hasLocalWorkoutData()) {
        await checkConnection()
        return { ok: true, message: 'Nothing in local storage to sync' }
      }
      const { uploaded, skipped } = await syncLocalSessionsToCloud()
      await checkConnection()
      if (uploaded === 0 && skipped > 0) {
        return { ok: false, message: `Sync skipped ${skipped} local session(s)` }
      }
      if (uploaded === 0) {
        return { ok: true, message: 'Already synced — no pending local logs' }
      }
      return {
        ok: true,
        message: `Synced ${uploaded} exercise log${uploaded !== 1 ? 's' : ''} to cloud${skipped ? ` (${skipped} skipped)` : ''}`,
      }
    } catch (err) {
      const msg = isAuthSetupError(err)
        ? err.message
        : err instanceof Error
          ? err.message
          : 'Sync failed'
      setStatus('error')
      setMessage(msg)
      return { ok: false, message: msg }
    } finally {
      setSyncing(false)
    }
  }, [checkConnection])

  return {
    status,
    message,
    syncing,
    isConfigured: isSupabaseConfigured,
    checkConnection,
    syncToCloud,
  }
}
