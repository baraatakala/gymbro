import {
  averageDaysBetweenSessions,
  calculateDayStats,
  daysSinceLastExerciseLog,
  estimateOneRepMax,
  filterRecordsForSection,
  getSectionVolumeTrend,
  mergePersonalRecordSources,
  sortPersonalRecords,
} from './analytics'
import { calendarDayKey } from './dateUtils'
import { sessionHasMeaningfulData } from './sessionMerge'
import type { Insight, PersonalRecord, WorkoutSession } from '../types/workout'

function sessionExerciseNames(session: WorkoutSession): string[] {
  const names = new Set<string>()
  Object.keys(session.exercises ?? {}).forEach((n) => names.add(n))
  if (session.exerciseSets) Object.keys(session.exerciseSets).forEach((n) => names.add(n))
  return [...names]
}

/** Pass collapseSessionsByDay() output — one row per calendar day. */
export function generateInsights(
  sessions: WorkoutSession[],
  options?: {
    cardio?: boolean
    savedToday?: number
    totalExercises?: number
    sectionExerciseNames?: string[]
    sectionLabel?: string
    cloudRecords?: PersonalRecord[]
  },
): Insight[] {
  const insights: Insight[] = []

  if (sessions.length === 0) {
    if (
      options?.savedToday !== undefined &&
      options.totalExercises &&
      options.savedToday > 0
    ) {
      insights.push({
        icon: '🎯',
        title: "Today's progress",
        message: `${options.savedToday}/${options.totalExercises} exercises saved today on ${options?.sectionLabel ?? 'this section'}.`,
        tone: 'positive',
      })
    } else {
      insights.push({
        icon: '📋',
        title: 'Getting started',
        message: `Log your first workout on ${options?.sectionLabel ?? 'this section'} to unlock progress insights.`,
        tone: 'neutral',
      })
    }
    return insights
  }

  const stats = calculateDayStats(sessions, { cardio: options?.cardio })

  if (
    options?.savedToday !== undefined &&
    options.totalExercises &&
    options.totalExercises > 0
  ) {
    const pct = Math.round((options.savedToday / options.totalExercises) * 100)
    if (options.savedToday >= options.totalExercises) {
      insights.push({
        icon: '✅',
        title: 'Section complete today',
        message: `All ${options.totalExercises} exercises logged — outstanding session!`,
        tone: 'positive',
      })
    } else if (options.savedToday > 0) {
      insights.push({
        icon: '🎯',
        title: "Today's progress",
        message: `${options.savedToday}/${options.totalExercises} exercises saved (${pct}%). ${options.totalExercises - options.savedToday} left on your list.`,
        tone: 'positive',
      })
    }
  }

  if (options?.sectionExerciseNames?.length) {
    const loggedEver = new Set<string>()
    for (const s of sessions) {
      sessionExerciseNames(s).forEach((n) => loggedEver.add(n.toLowerCase()))
    }
    const covered = options.sectionExerciseNames.filter((n) =>
      loggedEver.has(n.toLowerCase()),
    ).length
    const coveragePct = Math.round((covered / options.sectionExerciseNames.length) * 100)
    if (coveragePct < 100 && covered > 0) {
      insights.push({
        icon: '📊',
        title: 'Exercise coverage',
        message: `You've logged ${covered}/${options.sectionExerciseNames.length} planned exercises (${coveragePct}%) at least once.`,
        tone: coveragePct >= 50 ? 'neutral' : 'warning',
      })
    } else if (coveragePct === 100) {
      insights.push({
        icon: '🌟',
        title: 'Full program coverage',
        message: 'Every exercise in this section has logged history — great variety.',
        tone: 'positive',
      })
    }

    const stale = options.sectionExerciseNames.filter((name) => {
      const days = daysSinceLastExerciseLog(sessions, name)
      return days !== null && days >= 14
    })
    if (stale.length > 0 && stale.length <= 4) {
      insights.push({
        icon: '⏳',
        title: 'Due for a refresh',
        message: `${stale.join(', ')} — not logged in 2+ weeks. Rotating these back in prevents weak points.`,
        tone: 'warning',
      })
    } else if (stale.length > 4) {
      insights.push({
        icon: '⏳',
        title: 'Rotation reminder',
        message: `${stale.length} plan exercises haven't been logged in 14+ days — pick 1–2 this session.`,
        tone: 'warning',
      })
    }
  }

  const avgGap = averageDaysBetweenSessions(sessions)
  if (avgGap !== null) {
    if (avgGap <= 3) {
      insights.push({
        icon: '🔥',
        title: 'Strong consistency',
        message: `You train this section about every ${avgGap.toFixed(1)} days on average.`,
        tone: 'positive',
      })
    } else if (avgGap <= 7) {
      insights.push({
        icon: '💪',
        title: 'Steady rhythm',
        message: `${avgGap.toFixed(1)} days between session days — one extra day per week speeds strength gains.`,
        tone: 'neutral',
      })
    } else {
      insights.push({
        icon: '📅',
        title: 'Room to improve frequency',
        message: `Average gap is ${avgGap.toFixed(0)} days between session days. Shorter gaps usually help progress.`,
        tone: 'warning',
      })
    }
  }

  const volumeTrend = getSectionVolumeTrend(sessions)
  if (volumeTrend.length >= 2 && !options?.cardio) {
    const recent = volumeTrend.slice(-3)
    const maxVol = Math.max(...recent.map((p) => p.volume))
    const minVol = Math.min(...recent.map((p) => p.volume))
    if (maxVol > 0 && (maxVol - minVol) / maxVol <= 0.05) {
      insights.push({
        icon: '📉',
        title: 'Volume plateau',
        message:
          'Last few sessions show flat total volume — try +2.5 kg on a main lift or add one back-off set.',
        tone: 'warning',
      })
    }
  }

  if (stats.totalVolume > 0) {
    const label = options?.sectionLabel ? ` on ${options.sectionLabel}` : ''
    insights.push({
      icon: '🏋️',
      title: 'Training volume',
      message: `${stats.totalVolume.toLocaleString()} total logged across sets${label}.`,
      tone: 'neutral',
    })
  }

  if (stats.improvement !== null && !options?.cardio) {
    if (stats.improvement > 0) {
      insights.push({
        icon: '📈',
        title: 'Progressive overload',
        message: `+${stats.improvement}% average weight on shared exercises since your first session day.`,
        tone: 'positive',
      })
    } else if (stats.improvement < -5) {
      insights.push({
        icon: '⚠️',
        title: 'Recent dip',
        message: `${stats.improvement}% vs your first session — check sleep, nutrition, or a deload if needed.`,
        tone: 'warning',
      })
    }
  }

  const mergedPrs = mergePersonalRecordSources(
    options?.cloudRecords ?? [],
    sessions,
  )
  const sectionPrs = filterRecordsForSection(
    mergedPrs,
    options?.sectionExerciseNames ?? [],
  )
  const sorted = sortPersonalRecords(sectionPrs, 'weight')

  if (sorted.length > 0) {
    const top = sorted[0]
    const unit = options?.cardio ? 'min' : 'kg'
    const setLabel =
      top.set && top.set !== 'PR'
        ? top.set
        : top.reps && top.reps > 1
          ? `${top.reps} reps`
          : 'PR'
    let message = `${top.exercise}: ${top.weight} ${unit} (${setLabel}).`
    if (!options?.cardio && top.reps && top.reps > 1) {
      const e1rm = estimateOneRepMax(top.weight, top.reps)
      if (e1rm > top.weight) {
        message += ` Est. 1RM ≈ ${e1rm} kg.`
      }
    }
    insights.push({
      icon: '🏆',
      title: options?.cardio ? 'Longest session' : 'Top lift',
      message,
      tone: 'positive',
    })
  }

  const todayKey = calendarDayKey(Date.now())
  const sessionDays = new Set(
    sessions.filter(sessionHasMeaningfulData).map((s) => calendarDayKey(s.timestamp)),
  )
  if (sessionDays.has(todayKey)) {
    insights.push({
      icon: '📆',
      title: 'Logged today',
      message: `This section counts toward your training calendar for ${new Date().toLocaleDateString('en-GB')}.`,
      tone: 'positive',
    })
  }

  return insights
}

// Re-export for components that import from this module
export { getExerciseTrend, getSectionVolumeTrend } from './analytics'
export type { TrendMetric } from './analytics'
