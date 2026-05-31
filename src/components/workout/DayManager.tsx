import { useEffect, useRef, useState } from 'react'
import type { WorkoutDayPlan } from '../../types/plan'

interface DayManagerProps {
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

export function DayManager({
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
}: DayManagerProps) {
  const [newDayName, setNewDayName] = useState('')
  const [renaming, setRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(activeDayName)
  const [tabSearch, setTabSearch] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const activeTabRef = useRef<HTMLButtonElement>(null)

  const filteredDays = days.filter((d) =>
    d.name.toLowerCase().includes(tabSearch.trim().toLowerCase()),
  )
  const visibleDays = tabSearch ? filteredDays : days
  const emptyCount = days.filter((d) => d.exercises.length === 0).length

  useEffect(() => {
    if (!renaming) setRenameValue(activeDayName)
  }, [activeDayName, renaming])

  useEffect(() => {
    activeTabRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    })
  }, [activeDayId])

  return (
    <div className="glass-panel-strong mb-6 p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-white">
          Workout sections{' '}
          <span className="text-emerald-400">({days.length})</span>
          {emptyCount > 0 && (
            <span className="ml-2 text-xs font-normal text-amber-400">
              {emptyCount} empty
            </span>
          )}
        </h2>
        <div className="flex flex-wrap gap-3">
          {emptyCount > 0 && onRepairEmpty && (
            <button
              type="button"
              disabled={repairing || resetting}
              onClick={() => void onRepairEmpty()}
              className="text-xs font-medium text-amber-400 hover:text-amber-300 disabled:opacity-50"
            >
              {repairing ? 'Filling…' : `Fill ${emptyCount} empty`}
            </button>
          )}
          <button
            type="button"
            disabled={resetting || repairing}
            onClick={() => void onResetPlan()}
            className="text-xs text-slate-500 underline hover:text-slate-300 disabled:opacity-50"
          >
            {resetting ? 'Resetting…' : 'Reset all 14 days'}
          </button>
        </div>
      </div>

      {days.length > 6 && (
        <input
          value={tabSearch}
          onChange={(e) => setTabSearch(e.target.value)}
          placeholder="Filter sections…"
          className="input-field mb-3 w-full py-2.5 text-sm"
        />
      )}

      {tabSearch && visibleDays.length === 0 && (
        <p className="mb-3 text-sm text-slate-500">No sections match “{tabSearch.trim()}”.</p>
      )}

      <div
        ref={scrollRef}
        className="mb-3 flex gap-2 overflow-x-auto pb-1 scroll-smooth [-ms-overflow-style:none] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-700"
      >
        {visibleDays.map((d) => {
          const isActive = d.id === activeDayId
          const isEmpty = d.exercises.length === 0
          return (
            <button
              key={d.id}
              ref={isActive ? activeTabRef : undefined}
              type="button"
              onClick={() => onSelectDay(d.id, d.name)}
              className={`section-tab ${
                isActive
                  ? 'section-tab-active'
                  : isEmpty
                    ? 'border border-amber-700/50 bg-amber-950/30 text-amber-200 hover:bg-amber-950/50'
                    : 'section-tab-idle'
              }`}
            >
              {d.name}
              <span className={`ml-1 ${isActive ? 'opacity-90' : 'opacity-60'}`}>
                ({d.exercises.length})
              </span>
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap gap-2 border-t border-slate-800 pt-3">
        <input
          value={newDayName}
          onChange={(e) => setNewDayName(e.target.value)}
          placeholder="New section name"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const n = newDayName.trim()
              if (n) void Promise.resolve(onAddDay(n)).then(() => setNewDayName(''))
            }
          }}
          className="input-field min-w-[140px] flex-1 py-2.5 text-sm"
        />
        <button
          type="button"
          onClick={() => {
            const n = newDayName.trim()
            if (!n) {
              window.alert('Enter a section name first.')
              return
            }
            void Promise.resolve(onAddDay(n)).then(() => setNewDayName(''))
          }}
          className="btn-primary shrink-0"
        >
          + Add section
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {renaming ? (
          <>
            <input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const n = renameValue.trim()
                  if (n) void Promise.resolve(onRenameDay(activeDayId, n)).then(() => setRenaming(false))
                }
              }}
              className="input-field py-2.5 text-sm"
            />
            <button
              type="button"
              onClick={() => {
                const n = renameValue.trim()
                if (n) void Promise.resolve(onRenameDay(activeDayId, n)).then(() => setRenaming(false))
                else setRenaming(false)
              }}
              className="btn-secondary"
            >
              Save name
            </button>
            <button
              type="button"
              onClick={() => setRenaming(false)}
              className="text-sm text-slate-500"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => {
                setRenameValue(activeDayName)
                setRenaming(true)
              }}
              className="btn-secondary"
            >
              Rename “{activeDayName}”
            </button>
            <button
              type="button"
              disabled={days.length <= 1}
              onClick={() => {
                if (days.length <= 1) return
                if (
                  window.confirm(
                    `Delete section "${activeDayName}"?\n\nThis removes all exercises on the plan AND all saved workout history (sessions, sets, PRs) for this section. This cannot be undone.`,
                  )
                ) {
                  void onDeleteDay(activeDayId)
                }
              }}
              className="btn-secondary border-red-800/60 text-red-400 hover:border-red-700/60 hover:bg-red-950/40 disabled:opacity-40"
            >
              Delete section
            </button>
          </>
        )}
      </div>
    </div>
  )
}
