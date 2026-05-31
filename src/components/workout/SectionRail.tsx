import { useEffect, useState } from 'react'
import type { WorkoutDayPlan } from '../../types/plan'
import { filterDays, SectionTabButton } from './SectionPickerShared'

interface SectionRailProps {
  days: WorkoutDayPlan[]
  activeDayId: string
  activeDayName: string
  onSelectDay: (dayId: string, dayName: string) => void
  onAddDay: (name: string) => void | Promise<void>
  onRenameDay: (dayId: string, name: string) => void | Promise<void>
  onDeleteDay: (dayId: string) => void | Promise<void>
  onResetPlan: () => void | Promise<void>
  onRepairEmpty?: () => void | Promise<void>
  resetting?: boolean
  repairing?: boolean
}

/** Desktop: vertical section list — saves vertical space vs horizontal pill scroller. */
export function SectionRail({
  days,
  activeDayId,
  activeDayName,
  onSelectDay,
  onAddDay,
  onRenameDay,
  onDeleteDay,
  onResetPlan,
  onRepairEmpty,
  resetting = false,
  repairing = false,
}: SectionRailProps) {
  const [search, setSearch] = useState('')
  const [newName, setNewName] = useState('')
  const visible = filterDays(days, search)
  const emptyCount = days.filter((d) => d.exercises.length === 0).length

  useEffect(() => {
    setSearch('')
  }, [activeDayId])

  return (
    <aside className="section-rail hidden lg:flex">
      <div className="section-rail-inner">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Sections <span className="text-emerald-400">{days.length}</span>
          </h2>
          {emptyCount > 0 && onRepairEmpty && (
            <button
              type="button"
              disabled={repairing || resetting}
              onClick={() => void onRepairEmpty()}
              className="text-[10px] font-medium text-amber-400 hover:text-amber-300"
            >
              Fill {emptyCount}
            </button>
          )}
        </div>

        {days.length > 8 && (
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter…"
            className="input-field mb-2 w-full py-2 text-xs"
          />
        )}

        <nav className="section-rail-list" aria-label="Workout sections">
          {visible.map((d) => (
            <SectionTabButton
              key={d.id}
              day={d}
              isActive={d.id === activeDayId}
              compact
              onSelect={() => onSelectDay(d.id, d.name)}
            />
          ))}
        </nav>

        <div className="mt-3 space-y-2 border-t border-slate-800/80 pt-3">
          <div className="flex gap-1.5">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New section"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const n = newName.trim()
                  if (n) void Promise.resolve(onAddDay(n)).then(() => setNewName(''))
                }
              }}
              className="input-field min-w-0 flex-1 py-2 text-xs"
            />
            <button
              type="button"
              className="btn-primary shrink-0 px-3 py-2 text-xs"
              onClick={() => {
                const n = newName.trim()
                if (!n) return
                void Promise.resolve(onAddDay(n)).then(() => setNewName(''))
              }}
            >
              +
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              className="btn-ghost py-1.5 text-[11px]"
              onClick={() => {
                const n = window.prompt('Rename section', activeDayName)
                if (n?.trim()) void onRenameDay(activeDayId, n.trim())
              }}
            >
              Rename
            </button>
            <button
              type="button"
              disabled={days.length <= 1}
              className="btn-ghost py-1.5 text-[11px] text-red-400"
              onClick={() => {
                if (days.length <= 1) return
                if (
                  window.confirm(
                    `Delete "${activeDayName}" and all its history? This cannot be undone.`,
                  )
                ) {
                  void onDeleteDay(activeDayId)
                }
              }}
            >
              Delete
            </button>
            <button
              type="button"
              disabled={resetting}
              onClick={() => void onResetPlan()}
              className="btn-ghost py-1.5 text-[11px] text-slate-500"
            >
              Reset 14d
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}
