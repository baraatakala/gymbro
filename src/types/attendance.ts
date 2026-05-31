export interface AttendanceSetLog {
  exerciseName: string
  setNumber: number
  loggedAt: string
}

export interface AttendanceSession {
  id: string
  section: string
  timestamp: number
  startedAt?: string
  finishedAt?: string
  status?: string
  sets: AttendanceSetLog[]
}

export interface DateRange {
  from: string
  to: string
}

export interface AttendanceReport {
  range: DateRange
  gymVisits: number
  gymVisitsPerWeek: number
  avgSessionMinutes: number | null
  longestStreak: number
  currentStreak: number
  weeklyTargetDays: number
  weeksHitTargetPct: number
  avgCheckInToFirstSetMinutes: number | null
  sectionVisitCounts: { section: string; visits: number; avgMinutes: number }[]
  sectionTimeMinutes: { section: string; totalMinutes: number }[]
  mostFrequentSections: string[]
  neglectedSections: string[]
  weekdayVisits: { weekday: string; count: number }[]
  mostSkippedWeekday: string | null
  bestHourToTrain: { hour: number; label: string; sessionDays: number } | null
  longRestExercises: { exercise: string; medianRestSec: number; samples: number }[]
  topSectionByTime: string | null
  insights: { icon: string; title: string; message: string; tone: 'positive' | 'neutral' | 'warning' }[]
}
