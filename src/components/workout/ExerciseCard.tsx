import { useEffect, useState } from 'react'
import type { SetEntry, SetWeights } from '../../types/workout'
import { DEFAULT_REPS_PER_SET } from '../../types/workout'

export type ExerciseLogMode = 'strength' | 'cardio'

interface ExerciseCardProps {
  planExerciseId: string
  name: string
  logMode?: ExerciseLogMode
  lastSets?: SetWeights
  lastEntries?: SetEntry[]
  onSave: (sets: SetEntry[]) => void | Promise<void>
  onRename: (newName: string) => void | Promise<void>
  onRemove: () => void | Promise<void>
  onMoveUp?: () => void | Promise<void>
  onMoveDown?: () => void | Promise<void>
  canMoveUp?: boolean
  canMoveDown?: boolean
  onError?: (message: string) => void
  saved?: boolean
  saving?: boolean
  defaultRestSeconds?: number
  onStartRest?: (seconds: number) => void
  /** Increment to expand/collapse all cards from parent. */
  expandSignal?: number
  expandMode?: 'expand' | 'collapse'
}

const SET_COUNT = 3

export function ExerciseCard({
  planExerciseId,
  name,
  logMode = 'strength',
  lastSets,
  lastEntries,
  onSave,
  onRename,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  onError,
  saved,
  saving,
  defaultRestSeconds = 90,
  onStartRest,
  expandSignal = 0,
  expandMode = 'expand',
}: ExerciseCardProps) {
  const isCardio = logMode === 'cardio'
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (expandSignal > 0) setOpen(expandMode === 'expand')
  }, [expandSignal, expandMode])
  const [displayName, setDisplayName] = useState(name)
  const [editingName, setEditingName] = useState(false)

  useEffect(() => {
    setDisplayName(name)
  }, [name])

  const buildSets = (): SetEntry[] =>
    Array.from({ length: SET_COUNT }, (_, i) => {
      if (lastEntries?.[i]) return { ...lastEntries[i] }
      const key = `Set ${i + 1}`
      const lastW = lastSets?.[key]
      return {
        weight: lastW ?? 0,
        reps: isCardio ? (lastEntries?.[i]?.reps ?? 1) : DEFAULT_REPS_PER_SET,
      }
    })

  const [sets, setSets] = useState<SetEntry[]>(buildSets)

  useEffect(() => {
    setSets(buildSets())
  }, [name, lastSets, lastEntries, isCardio])

  const maxPrimary = isCardio ? 180 : 500

  const adjustPrimary = (index: number, delta: number) => {
    setSets((prev) => {
      const next = [...prev]
      next[index] = {
        ...next[index],
        weight: Math.min(maxPrimary, Math.max(0, next[index].weight + delta)),
      }
      return next
    })
  }

  const handleSave = async () => {
    const parsed = sets.map((s) => ({
      weight: Math.max(0, s.weight),
      reps: Math.max(1, s.reps),
    }))

    if (isCardio) {
      if (parsed.every((s) => s.weight === 0)) {
        onError?.(`Enter duration (minutes) for ${displayName}`)
        return
      }
    } else {
      if (parsed.every((s) => s.weight === 0)) {
        onError?.(`Enter weights for ${displayName}`)
        return
      }
      if (parsed.some((s) => s.weight === 0)) {
        onError?.(`Fill all 3 sets for ${displayName}`)
        return
      }
    }

    try {
      await onSave(parsed)
      onStartRest?.(defaultRestSeconds)
    } catch {
      /* Parent shows error toast */
    }
  }

  const handleRename = async () => {
    const n = displayName.trim()
    if (!n) return
    try {
      await onRename(n)
      setEditingName(false)
    } catch {
      onError?.('Could not rename exercise')
    }
  }

  const primaryLabel = isCardio ? 'min' : 'kg'
  const step = isCardio ? 1 : 2.5

  return (
    <article
      className={`rounded-2xl border transition-all duration-300 ${
        saved
          ? 'animate-save-pulse border-emerald-500/60 bg-emerald-950/25 shadow-sm shadow-emerald-900/20'
          : 'border-slate-700/80 bg-slate-900/60 hover:border-slate-600'
      }`}
      data-plan-exercise-id={planExerciseId}
    >
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          onClick={() => setOpen((v) => !v)}
        >
          {editingName ? (
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void handleRename()
                }
              }}
              className="w-full rounded border border-slate-600 bg-slate-950 px-2 py-1 text-white"
            />
          ) : (
            <h3 className="flex min-w-0 items-center gap-2 truncate font-semibold text-white">
              {saved && (
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-xs text-emerald-400"
                  title="Saved today"
                >
                  ✓
                </span>
              )}
              <span className="truncate">{displayName}</span>
              {isCardio && (
                <span className="shrink-0 text-xs font-normal text-cyan-400/90">cardio</span>
              )}
            </h3>
          )}
          <span className="shrink-0 text-slate-400">{open ? '−' : '+'}</span>
        </button>
        <div className="flex shrink-0 gap-1">
          {onMoveUp && (
            <button
              type="button"
              title="Move up"
              disabled={!canMoveUp}
              onClick={() => void onMoveUp()}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 disabled:opacity-30"
            >
              ↑
            </button>
          )}
          {onMoveDown && (
            <button
              type="button"
              title="Move down"
              disabled={!canMoveDown}
              onClick={() => void onMoveDown()}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 disabled:opacity-30"
            >
              ↓
            </button>
          )}
          <button
            type="button"
            title="Rename"
            onClick={() => setEditingName((v) => !v)}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            ✏️
          </button>
          <button
            type="button"
            title="Remove from this day"
            onClick={() => {
              if (
                window.confirm(
                  `Remove "${displayName}" from this section?\n\nPast sets and PRs for this exercise on this section will also be deleted from your history.`,
                )
              ) {
                void onRemove()
              }
            }}
            className="rounded-lg p-2 text-red-400 hover:bg-red-950/50"
          >
            🗑️
          </button>
        </div>
      </div>

      {open && (
        <div className="space-y-4 border-t border-slate-800 px-4 pb-4 pt-3">
          {Array.from({ length: SET_COUNT }, (_, i) => {
            const setNum = i + 1
            const lastKey = `Set ${setNum}`
            const lastVal = lastSets?.[lastKey] ?? lastEntries?.[i]?.weight

            return (
              <div key={setNum}>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">
                  {isCardio ? `Interval ${setNum}` : `Set ${setNum}`}
                  {lastVal !== undefined && lastVal > 0 && (
                    <span className="ml-2 text-slate-500">
                      Last: {lastVal} {primaryLabel}
                    </span>
                  )}
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => adjustPrimary(i, -step)}
                    className="h-11 w-11 shrink-0 rounded-xl bg-slate-800 text-sm font-medium text-slate-300 hover:bg-slate-700"
                  >
                    −{step}
                  </button>
                  <input
                    type="number"
                    min={0}
                    step={isCardio ? 1 : 0.5}
                    value={sets[i].weight || ''}
                    placeholder={primaryLabel}
                    onChange={(e) => {
                      const w = Math.min(
                        maxPrimary,
                        Math.max(0, parseFloat(e.target.value) || 0),
                      )
                      setSets((prev) => {
                        const next = [...prev]
                        next[i] = { ...next[i], weight: w }
                        return next
                      })
                    }}
                    className="h-11 min-w-0 flex-1 rounded-xl border border-slate-600 bg-slate-950 px-3 text-center text-base text-white"
                  />
                  {!isCardio && (
                    <input
                      type="number"
                      min={1}
                      value={sets[i].reps}
                      onChange={(e) => {
                        const r = parseInt(e.target.value, 10) || DEFAULT_REPS_PER_SET
                        setSets((prev) => {
                          const next = [...prev]
                          next[i] = { ...next[i], reps: r }
                          return next
                        })
                      }}
                      className="h-11 w-16 rounded-xl border border-slate-600 bg-slate-950 text-center text-white"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => adjustPrimary(i, step)}
                    className="h-11 w-11 shrink-0 rounded-xl bg-slate-800 text-sm font-medium text-slate-300 hover:bg-slate-700"
                  >
                    +{step}
                  </button>
                </div>
              </div>
            )
          })}

          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="btn-primary w-full py-3 disabled:opacity-60"
          >
            {saving ? 'Saving…' : `Save ${displayName}`}
          </button>
        </div>
      )}
    </article>
  )
}
