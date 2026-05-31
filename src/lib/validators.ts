import type { SetEntry } from '../types/workout'

const MAX_SECTION_NAME = 48
const MAX_EXERCISE_NAME = 120
const MAX_WEIGHT_KG = 600
const MAX_CARDIO_MINUTES = 180
const MAX_REPS = 100

export function validateSectionName(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('Section name cannot be empty')
  if (trimmed.length > MAX_SECTION_NAME) {
    throw new Error(`Section name must be ${MAX_SECTION_NAME} characters or fewer`)
  }
  return trimmed
}

export function validateExerciseName(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('Exercise name cannot be empty')
  if (trimmed.length > MAX_EXERCISE_NAME) {
    throw new Error(`Exercise name must be ${MAX_EXERCISE_NAME} characters or fewer`)
  }
  return trimmed
}

export function validateSetEntries(
  sets: SetEntry[],
  options?: { cardio?: boolean; exerciseName?: string },
): SetEntry[] {
  const label = options?.exerciseName ?? 'exercise'
  const cardio = options?.cardio ?? false

  if (!sets.length) throw new Error(`Add at least one set for ${label}`)

  const maxWeight = cardio ? MAX_CARDIO_MINUTES : MAX_WEIGHT_KG
  const parsed = sets.map((s, i) => ({
    weight: Math.min(maxWeight, Math.max(0, Number(s.weight) || 0)),
    reps: Math.min(MAX_REPS, Math.max(1, Math.round(Number(s.reps) || 1))),
    index: i,
  }))

  if (cardio) {
    if (parsed.every((s) => s.weight === 0)) {
      throw new Error(`Enter duration (minutes) for ${label}`)
    }
    return parsed.map(({ weight, reps }) => ({ weight, reps }))
  }

  if (parsed.every((s) => s.weight === 0)) {
    throw new Error(`Enter weights for ${label}`)
  }

  const withWeight = parsed.filter((s) => s.weight > 0)
  if (withWeight.length < parsed.length) {
    throw new Error(`Fill all ${parsed.length} sets for ${label}`)
  }

  return parsed.map(({ weight, reps }) => ({ weight, reps }))
}
