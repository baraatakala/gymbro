import {
  calculateDayStats,
  calculatePersonalRecords,
} from './analytics'
import type { Insight, PersonalRecord, WorkoutSession } from '../types/workout'

function exerciseAvgFromSets(sets: Record<string, number>): number {
  const values = Object.values(sets).filter((w) => w > 0)
  if (values.length === 0) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

function exerciseAvgFromEntries(entries: { weight: number; reps: number }[]): number {
  const weights = entries.map((e) => e.weight).filter((w) => w > 0)
  if (weights.length === 0) return 0
  return weights.reduce((a, b) => a + b, 0) / weights.length
}

function sessionExerciseAvg(session: WorkoutSession, exerciseName: string): number {
  if (session.exerciseSets?.[exerciseName]?.length) {
    return exerciseAvgFromEntries(session.exerciseSets[exerciseName])
  }
  const legacy = session.exercises?.[exerciseName]
  if (legacy) return exerciseAvgFromSets(legacy)
  return 0
}

function sessionExerciseNames(session: WorkoutSession): string[] {
  const names = new Set<string>()
  Object.keys(session.exercises ?? {}).forEach((n) => names.add(n))
  if (session.exerciseSets) Object.keys(session.exerciseSets).forEach((n) => names.add(n))
  return [...names]
}

/** Pass collapseSessionsByDay() output — one row per calendar day. */
export function getExerciseTrend(
  sessions: WorkoutSession[],
  exerciseName: string,
): { date: string; avg: number }[] {
  const chronological = [...sessions].sort((a, b) => a.timestamp - b.timestamp)

  return chronological
    .filter(
      (s) =>
        s.exercises?.[exerciseName] ||
        (s.exerciseSets && s.exerciseSets[exerciseName]?.length),
    )
    .map((s) => ({
      date: new Date(s.timestamp).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
      }),
      avg: Number(sessionExerciseAvg(s, exerciseName).toFixed(1)),
    }))
    .filter((p) => p.avg > 0)
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
        title: 'Today\'s progress',
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
        title: 'Today\'s progress',
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
  }

  if (sessions.length >= 2) {
    const chronological = [...sessions].sort((a, b) => b.timestamp - a.timestamp)
    const spanMs = chronological[0].timestamp - chronological[chronological.length - 1].timestamp
    const daysBetween = spanMs / (1000 * 60 * 60 * 24) / (sessions.length - 1)

    if (daysBetween <= 2) {
      insights.push({
        icon: '🔥',
        title: 'Strong consistency',
        message: `You train about every ${daysBetween.toFixed(1)} days on average.`,
        tone: 'positive',
      })
    } else if (daysBetween <= 7) {
      insights.push({
        icon: '💪',
        title: 'Steady rhythm',
        message: `${daysBetween.toFixed(1)} days between sessions — consider one extra day per week for faster gains.`,
        tone: 'neutral',
      })
    } else {
      insights.push({
        icon: '📅',
        title: 'Room to improve frequency',
        message: `Average gap is ${daysBetween.toFixed(0)} days. Shorter gaps usually help strength progress.`,
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

  if (stats.improvement !== null) {
    if (stats.improvement > 0) {
      insights.push({
        icon: '📈',
        title: 'Progressive overload',
        message: `+${stats.improvement}% average weight on shared exercises since your first session.`,
        tone: 'positive',
      })
    } else if (stats.improvement < -5) {
      insights.push({
        icon: '⚠️',
        title: 'Recent dip',
        message: `${stats.improvement}% vs your first session — check sleep, nutrition, or deload if needed.`,
        tone: 'warning',
      })
    }
  }

  const sessionPrs = calculatePersonalRecords(sessions)
  const prSource =
    options?.cloudRecords && options.cloudRecords.length > 0
      ? options.cloudRecords
      : sessionPrs
  let sectionPrs = prSource
  if (options?.sectionExerciseNames?.length) {
    sectionPrs = prSource.filter((p) =>
      options.sectionExerciseNames!.some(
        (n) => n.toLowerCase() === p.exercise.toLowerCase(),
      ),
    )
  }
  if (sectionPrs.length > 0) {
    const top = [...sectionPrs].sort((a, b) => b.weight - a.weight)[0]
    const unit = options?.cardio ? 'min' : 'kg'
    const setLabel =
      'set' in top && top.set
        ? top.set
        : top.reps && top.reps > 1
          ? `${top.reps} reps`
          : 'PR'
    insights.push({
      icon: '🏆',
      title: options?.cardio ? 'Longest session' : 'Top lift',
      message: `${top.exercise}: ${top.weight} ${unit} (${setLabel}).`,
      tone: 'positive',
    })
  }

  return insights
}
