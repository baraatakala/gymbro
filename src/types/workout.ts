export type SetWeights = Record<string, number>

export interface SetEntry {
  weight: number
  reps: number
}

export interface WorkoutSession {
  key: string
  id?: string
  day: string
  timestamp: number
  saveTime?: string
  saveDate?: string
  exercises: Record<string, SetWeights>
  /** Full set data when loaded from Supabase */
  exerciseSets?: Record<string, SetEntry[]>
  /** Denormalized DB column when sets/json were lost but volume remains */
  storedVolumeKg?: number
  startedAt?: string
  finishedAt?: string
  status?: string
}

export interface ExerciseCatalog {
  [category: string]: string[]
}

export interface DayStats {
  totalSessions: number
  avgWeight: number
  totalVolume: number
  improvement: number | null
  setCount: number
  exerciseCount: number
}

export interface PersonalRecord {
  exercise: string
  weight: number
  reps?: number
  date: number
  set: string
}

export interface Insight {
  icon: string
  title: string
  message: string
  tone: 'positive' | 'neutral' | 'warning'
}

export const METADATA_KEYS = new Set(['timestamp', 'saveTime', 'saveDate'])
export const DEFAULT_REPS_PER_SET = 8
