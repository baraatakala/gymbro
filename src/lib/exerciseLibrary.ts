import { supabase } from './supabase'

export interface LibraryExercise {
  id: string
  name: string
  slug: string
  muscle_group: string | null
  equipment: string
  movement_pattern: string
  default_rest_seconds: number
  is_compound: boolean
}

let libraryCache: LibraryExercise[] | null = null
let libraryFetch: Promise<LibraryExercise[]> | null = null

export function clearExerciseLibraryCache(): void {
  libraryCache = null
  libraryFetch = null
}

export function prefetchExerciseLibrary(): void {
  void fetchExerciseLibrary()
}

async function fetchExerciseLibraryFromDb(): Promise<LibraryExercise[]> {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('exercises')
    .select(
      `
      id,
      name,
      slug,
      equipment,
      movement_pattern,
      default_rest_seconds,
      is_compound,
      muscle_groups ( name )
    `,
    )
    .order('name')

  if (error) throw error

  return (data ?? []).map((row) => {
    const mg = row.muscle_groups as { name: string } | { name: string }[] | null
    const muscle =
      mg && typeof mg === 'object' && 'name' in mg
        ? mg.name
        : Array.isArray(mg) && mg[0]
          ? mg[0].name
          : null

    return {
      id: row.id as string,
      name: row.name as string,
      slug: row.slug as string,
      muscle_group: muscle,
      equipment: row.equipment as string,
      movement_pattern: row.movement_pattern as string,
      default_rest_seconds: row.default_rest_seconds as number,
      is_compound: row.is_compound as boolean,
    }
  })
}

export async function fetchExerciseLibrary(force = false): Promise<LibraryExercise[]> {
  if (force) clearExerciseLibraryCache()
  if (libraryCache) return libraryCache
  if (!libraryFetch) {
    libraryFetch = fetchExerciseLibraryFromDb()
      .then((data) => {
        libraryCache = data
        return data
      })
      .finally(() => {
        libraryFetch = null
      })
  }
  return libraryFetch
}

export async function getExerciseLibraryCount(): Promise<number> {
  if (!supabase) return 0
  const { count, error } = await supabase
    .from('exercises')
    .select('*', { count: 'exact', head: true })
  if (error) return 0
  return count ?? 0
}

export async function fetchLibraryStats(): Promise<{ exercises: number; muscles: number }> {
  if (!supabase) return { exercises: 0, muscles: 0 }
  const [exRes, mgRes] = await Promise.all([
    supabase.from('exercises').select('*', { count: 'exact', head: true }),
    supabase.from('muscle_groups').select('*', { count: 'exact', head: true }),
  ])
  return {
    exercises: exRes.count ?? 0,
    muscles: mgRes.count ?? 0,
  }
}
