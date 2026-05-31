import { useCallback, useEffect, useRef, useState } from 'react'

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

export function useTimer() {
  const [workoutStart, setWorkoutStart] = useState<number | null>(null)
  const [restEnd, setRestEnd] = useState<number | null>(null)
  const [now, setNow] = useState(Date.now())
  const intervalRef = useRef<number | null>(null)

  useEffect(() => {
    intervalRef.current = window.setInterval(() => setNow(Date.now()), 1000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const startWorkout = useCallback(() => {
    setWorkoutStart((prev) => prev ?? Date.now())
  }, [])

  const startRest = useCallback((seconds = 90) => {
    setRestEnd(Date.now() + seconds * 1000)
  }, [])

  const stopRest = useCallback(() => setRestEnd(null), [])

  const workoutElapsed = workoutStart ? now - workoutStart : 0
  const restRemaining = restEnd ? Math.max(0, restEnd - now) : 0

  useEffect(() => {
    if (restEnd && restRemaining === 0) setRestEnd(null)
  }, [restEnd, restRemaining])

  return {
    workoutLabel: formatDuration(workoutElapsed),
    restLabel: restEnd ? formatDuration(restRemaining) : '00:00',
    isResting: restEnd !== null && restRemaining > 0,
    startWorkout,
    startRest,
    stopRest,
  }
}
