interface ExerciseListToolbarProps {
  exerciseCount: number
  savedCount: number
  onExpandAll: () => void
  onCollapseAll: () => void
}

export function ExerciseListToolbar({
  exerciseCount,
  savedCount,
  onExpandAll,
  onCollapseAll,
}: ExerciseListToolbarProps) {
  if (exerciseCount === 0 && savedCount === 0) return null

  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800/80 bg-slate-950/50 px-3 py-2">
      <span className="text-xs text-slate-500">
        {exerciseCount > 0 ? (
          <>
            {exerciseCount} exercise{exerciseCount !== 1 ? 's' : ''}
            {savedCount > 0 && (
              <span className="ml-2 text-emerald-500/90">
                · {savedCount} saved today
              </span>
            )}
          </>
        ) : (
          <span className="text-amber-400/90">
            {savedCount} saved today — add exercises to this section from the library
          </span>
        )}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onExpandAll}
          className="rounded-lg px-2.5 py-1 text-xs text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          Expand all
        </button>
        <button
          type="button"
          onClick={onCollapseAll}
          className="rounded-lg px-2.5 py-1 text-xs text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          Collapse all
        </button>
      </div>
    </div>
  )
}
