import { useCallback, useEffect, useRef, useState } from 'react'
import { logRestEvent } from '../lib/restEventLog'

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export interface RestMeta {
  section: string
  exercise: string
}

export function useTimer() {
  const [workoutStart, setWorkoutStart] = useState<number | null>(null)
  const [restEnd, setRestEnd] = useState<number | null>(null)
  const [now, setNow] = useState(Date.now())
  const intervalRef = useRef<number | null>(null)
  const restMetaRef = useRef<(RestMeta & { startedAt: number; plannedSec: number }) | null>(null)

  useEffect(() => {
    intervalRef.current = window.setInterval(() => setNow(Date.now()), 1000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const startWorkout = useCallback(() => {
    setWorkoutStart((prev) => prev ?? Date.now())
  }, [])

  /** Resume timer from DB check-in (refresh / multi-tab). */
  const syncWorkoutStart = useCallback((startedAtMs: number) => {
    if (!Number.isFinite(startedAtMs)) return
    setWorkoutStart((prev) => (prev == null || startedAtMs < prev ? startedAtMs : prev))
  }, [])

  const startRest = useCallback((seconds = 90, meta?: RestMeta) => {
    const startedAt = Date.now()
    restMetaRef.current = meta
      ? { ...meta, startedAt, plannedSec: seconds }
      : null
    setRestEnd(startedAt + seconds * 1000)
  }, [])

  const stopRest = useCallback(() => {
    const meta = restMetaRef.current
    if (meta) {
      const elapsed = Math.round((Date.now() - meta.startedAt) / 1000)
      if (elapsed >= 20) {
        logRestEvent(meta.section, meta.exercise, elapsed)
      }
    }
    restMetaRef.current = null
    setRestEnd(null)
  }, [])

  const workoutElapsed = workoutStart ? now - workoutStart : 0
  const restRemaining = restEnd ? Math.max(0, restEnd - now) : 0

  useEffect(() => {
    if (restEnd && restRemaining === 0) {
      const meta = restMetaRef.current
      if (meta) {
        logRestEvent(meta.section, meta.exercise, meta.plannedSec)
        restMetaRef.current = null
      }
      setRestEnd(null)
    }
  }, [restEnd, restRemaining])

  return {
    workoutLabel: formatDuration(workoutElapsed),
    restLabel: restEnd ? formatDuration(restRemaining) : '00:00',
    isResting: restEnd !== null && restRemaining > 0,
    startWorkout,
    syncWorkoutStart,
    startRest,
    stopRest,
  }
}
