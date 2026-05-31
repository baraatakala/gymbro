import type { ExerciseCatalog } from '../types/workout'

export const MAX_EXERCISES_PER_SECTION = 6

export function isCardioSection(sectionName: string): boolean {
  const n = sectionName.toLowerCase()
  return n === 'cardio' || n === 'conditioning'
}

export type SectionKind = 'cardio' | 'strength' | 'fullbody' | 'hybrid'

export interface SectionMeta {
  kind: SectionKind
  label: string
  emoji: string
  accentClass: string
  ringClass: string
}

export function getSectionMeta(sectionName: string): SectionMeta {
  const n = sectionName.toLowerCase()
  if (isCardioSection(sectionName)) {
    return {
      kind: 'cardio',
      label: 'Cardio',
      emoji: '💨',
      accentClass: 'text-cyan-400 border-cyan-500/30 bg-cyan-950/30',
      ringClass: 'stroke-cyan-500',
    }
  }
  if (n.includes('full body')) {
    return {
      kind: 'fullbody',
      label: 'Full body',
      emoji: '🔥',
      accentClass: 'text-violet-400 border-violet-500/30 bg-violet-950/30',
      ringClass: 'stroke-violet-500',
    }
  }
  if (['push', 'pull', 'upper', 'lower'].some((k) => n.includes(k))) {
    return {
      kind: 'hybrid',
      label: 'Split',
      emoji: '⚡',
      accentClass: 'text-amber-400 border-amber-500/30 bg-amber-950/30',
      ringClass: 'stroke-amber-500',
    }
  }
  return {
    kind: 'strength',
    label: 'Strength',
    emoji: '🏋️',
    accentClass: 'text-emerald-400 border-emerald-500/30 bg-emerald-950/30',
    ringClass: 'stroke-emerald-500',
  }
}

/** Pick default exercise names for a workout section from the muscle-group catalog. */
export function pickExercisesForSection(
  dayName: string,
  catalog: ExerciseCatalog | null,
  max = MAX_EXERCISES_PER_SECTION,
): string[] {
  if (!catalog) return []

  const take = (names: string[], limit = max) => [...new Set(names)].slice(0, limit)

  const direct = catalog[dayName]
  if (direct?.length) return take(direct)

  const c = catalog

  switch (dayName) {
    case 'Push':
      return take([...(c.Chest ?? []), ...(c.Shoulders ?? [])], 5)
    case 'Pull':
      return take([...(c.Back ?? []), ...(c.Arms ?? [])], 5)
    case 'Legs':
    case 'Lower':
      return take(c.Legs ?? [])
    case 'Upper':
      return take([...(c.Chest ?? []), ...(c.Back ?? []), ...(c.Shoulders ?? [])])
    case 'Full Body A':
      return take([
        ...(c.Chest ?? []).slice(0, 2),
        ...(c.Back ?? []).slice(0, 2),
        ...(c.Legs ?? []).slice(0, 2),
      ])
    case 'Full Body B':
      return take([
        ...(c.Shoulders ?? []).slice(0, 2),
        ...(c.Arms ?? []).slice(0, 2),
        ...(c.Core ?? []).slice(0, 2),
      ])
    case 'Conditioning':
    case 'Cardio':
      return take(c.Cardio ?? [])
    default:
      return take(c[dayName] ?? [])
  }
}
