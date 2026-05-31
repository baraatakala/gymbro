import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  buildAttendanceReport,
  defaultDateRange,
  normalizeDateRange,
  toIsoDate,
} from '../lib/attendanceAnalytics'
import { getWeeklyTargetDays, setWeeklyTargetDays } from '../lib/attendancePrefs'
import { loadAttendanceDataset } from '../lib/supabaseAttendance'
import type { DateRange } from '../types/attendance'

export function useAttendanceData(
  planSections: string[],
  calendarDates: string[],
  enabled = true,
) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [trainedDates, setTrainedDates] = useState<string[]>(calendarDates)
  const [sessions, setSessions] = useState<
    Awaited<ReturnType<typeof loadAttendanceDataset>>['sessions']
  >([])
  const [range, setRange] = useState<DateRange>(defaultDateRange)
  const [weeklyTarget, setWeeklyTargetState] = useState(getWeeklyTargetDays())

  const setWeeklyTarget = useCallback((days: number) => {
    setWeeklyTargetState(days)
    setWeeklyTargetDays(days)
  }, [])

  const reload = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    setError('')
    try {
      const data = await loadAttendanceDataset(400)
      setTrainedDates(data.trainedDates.length > 0 ? data.trainedDates : calendarDates)
      setSessions(data.sessions)
    } catch (e) {
      setSessions([])
      setError(e instanceof Error ? e.message : 'Could not load gym habits data')
    } finally {
      setLoading(false)
    }
  }, [enabled, calendarDates])

  useEffect(() => {
    if (!enabled) return
    void reload()
  }, [enabled, reload])

  useEffect(() => {
    setTrainedDates((prev) =>
      calendarDates.length > prev.length ? calendarDates : prev,
    )
  }, [calendarDates])

  const effectiveRange = useMemo(() => normalizeDateRange(range), [range])

  const report = useMemo(() => {
    if (loading) return null
    return buildAttendanceReport(trainedDates, sessions, effectiveRange, {
      weeklyTargetDays: weeklyTarget,
      planSections,
    })
  }, [loading, trainedDates, sessions, effectiveRange, weeklyTarget, planSections])

  const applyPreset = useCallback((daysBack: number) => {
    const to = new Date()
    const from = new Date()
    from.setDate(from.getDate() - daysBack)
    setRange({ from: toIsoDate(from), to: toIsoDate(to) })
  }, [])

  return {
    loading,
    error,
    report,
    range,
    setRange,
    weeklyTarget,
    setWeeklyTarget,
    reload,
    applyPreset,
    sessionCount: sessions.length,
  }
}
