import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { fetchExerciseLibrary, type LibraryExercise } from '../../lib/exerciseLibrary'
import { Modal } from '../ui/Modal'

interface ExerciseLibraryModalProps {
  open: boolean
  onClose: () => void
  onPick: (name: string, muscleGroup: string, exerciseId?: string) => void
  /** Exercise names already on the active section (case-insensitive match). */
  existingNames?: string[]
  sectionLabel?: string
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase()
}

export function ExerciseLibraryModal({
  open,
  onClose,
  onPick,
  existingNames = [],
  sectionLabel,
}: ExerciseLibraryModalProps) {
  const [exercises, setExercises] = useState<LibraryExercise[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [muscleFilter, setMuscleFilter] = useState('all')
  const [equipmentFilter, setEquipmentFilter] = useState('all')
  const [hideAdded, setHideAdded] = useState(true)
  const searchRef = useRef<HTMLInputElement>(null)

  const existingSet = useMemo(
    () => new Set(existingNames.map(normalizeName)),
    [existingNames],
  )

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setError('')
    fetchExerciseLibrary()
      .then(setExercises)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load library'))
      .finally(() => setLoading(false))
  }, [open])

  useEffect(() => {
    if (!open) {
      setSearch('')
      setMuscleFilter('all')
      setEquipmentFilter('all')
      setHideAdded(true)
      return
    }
    const t = window.setTimeout(() => searchRef.current?.focus(), 80)
    return () => window.clearTimeout(t)
  }, [open])

  const muscles = useMemo(() => {
    const set = new Set(exercises.map((e) => e.muscle_group).filter(Boolean) as string[])
    return Array.from(set).sort()
  }, [exercises])

  const equipmentTypes = useMemo(() => {
    const set = new Set(exercises.map((e) => e.equipment).filter(Boolean))
    return Array.from(set).sort()
  }, [exercises])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return exercises.filter((e) => {
      const muscleOk = muscleFilter === 'all' || e.muscle_group === muscleFilter
      const equipOk = equipmentFilter === 'all' || e.equipment === equipmentFilter
      const searchOk =
        !q ||
        e.name.toLowerCase().includes(q) ||
        (e.muscle_group?.toLowerCase().includes(q) ?? false) ||
        e.equipment.toLowerCase().includes(q) ||
        e.movement_pattern.toLowerCase().includes(q)
      const added = existingSet.has(normalizeName(e.name))
      const hideOk = !hideAdded || !added
      return muscleOk && equipOk && searchOk && hideOk
    })
  }, [exercises, search, muscleFilter, equipmentFilter, hideAdded, existingSet])

  const grouped = useMemo(() => {
    if (muscleFilter !== 'all' || search.trim() || equipmentFilter !== 'all') return null
    const map = new Map<string, LibraryExercise[]>()
    for (const ex of filtered) {
      const key = ex.muscle_group ?? 'Other'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(ex)
    }
    return map
  }, [filtered, muscleFilter, search, equipmentFilter])

  const addedOnSection = exercises.filter((e) => existingSet.has(normalizeName(e.name))).length

  const renderRow = (ex: LibraryExercise) => {
    const added = existingSet.has(normalizeName(ex.name))
    return (
      <li key={ex.id}>
        <button
          type="button"
          disabled={added}
          onClick={() => {
            if (added) return
            onPick(ex.name, ex.muscle_group ?? 'Chest', ex.id)
            onClose()
          }}
          className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
            added
              ? 'cursor-not-allowed border-slate-800/80 bg-slate-950/30 opacity-60'
              : 'border-slate-800 bg-slate-950/50 hover:border-emerald-600/50 hover:bg-slate-900'
          }`}
        >
          <div className="min-w-0 flex-1 pr-3">
            <p className="font-medium text-white">{ex.name}</p>
            <p className="text-xs text-slate-500">
              {ex.muscle_group} · {ex.equipment} · {ex.movement_pattern}
              {ex.is_compound ? ' · compound' : ''}
            </p>
          </div>
          <div className="shrink-0 text-right">
            {added ? (
              <span className="text-xs font-medium text-slate-500">On section</span>
            ) : (
              <span className="text-xs text-slate-500">{ex.default_rest_seconds}s rest</span>
            )}
          </div>
        </button>
      </li>
    )
  }

  const titleSuffix = sectionLabel ? ` → ${sectionLabel}` : ''

  return (
    <Modal open={open} onClose={onClose} title={`Exercise library${titleSuffix}`} wide>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span>
          {loading ? 'Loading…' : `${filtered.length} shown`}
          {!loading && exercises.length > 0 && ` · ${exercises.length} total`}
        </span>
        {existingNames.length > 0 && (
          <span className="text-emerald-600/90">
            · {existingNames.length} on this section
            {addedOnSection > 0 && hideAdded ? ` (${addedOnSection} hidden)` : ''}
          </span>
        )}
      </div>

      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, muscle, equipment…"
            className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 pl-3 pr-9 text-white placeholder:text-slate-600"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:text-white"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
        <label className="flex shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={hideAdded}
            onChange={(e) => setHideAdded(e.target.checked)}
            className="rounded border-slate-600"
          />
          Hide on section
        </label>
      </div>

      <div className="mb-2 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <FilterChip active={muscleFilter === 'all'} onClick={() => setMuscleFilter('all')}>
          All muscles
        </FilterChip>
        {muscles.map((m) => (
          <FilterChip
            key={m}
            active={muscleFilter === m}
            onClick={() => setMuscleFilter(m)}
          >
            {m}
          </FilterChip>
        ))}
      </div>

      {equipmentTypes.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          <FilterChip
            small
            active={equipmentFilter === 'all'}
            onClick={() => setEquipmentFilter('all')}
          >
            All equipment
          </FilterChip>
          {equipmentTypes.map((eq) => (
            <FilterChip
              key={eq}
              small
              active={equipmentFilter === eq}
              onClick={() => setEquipmentFilter(eq)}
            >
              {eq}
            </FilterChip>
          ))}
        </div>
      )}

      {loading && <p className="py-8 text-center text-slate-500">Loading from Supabase…</p>}
      {error && <p className="rounded-lg bg-red-950/50 p-3 text-sm text-red-300">{error}</p>}

      {!loading && !error && filtered.length === 0 && (
        <p className="py-8 text-center text-slate-500">
          {hideAdded && existingNames.length > 0
            ? 'All matching exercises are already on this section. Uncheck “Hide on section”.'
            : 'No exercises match your filters.'}
        </p>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="max-h-[50vh] space-y-4 overflow-y-auto">
          {grouped ? (
            Array.from(grouped.entries())
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([muscle, list]) => (
                <section key={muscle}>
                  <h3 className="sticky top-0 z-10 mb-2 bg-slate-900/95 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-500/90">
                    {muscle}{' '}
                    <span className="font-normal text-slate-600">({list.length})</span>
                  </h3>
                  <ul className="space-y-2">{list.map(renderRow)}</ul>
                </section>
              ))
          ) : (
            <ul className="space-y-2">{filtered.map(renderRow)}</ul>
          )}
        </div>
      )}
    </Modal>
  )
}

function FilterChip({
  children,
  active,
  onClick,
  small,
}: {
  children: ReactNode
  active: boolean
  onClick: () => void
  small?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-lg font-medium transition ${
        small ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'
      } ${
        active
          ? 'bg-emerald-600 text-white'
          : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
      }`}
    >
      {children}
    </button>
  )
}
