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
    <div className="glass-panel mb-3 flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-xs font-medium text-slate-400 sm:text-sm">
        {exerciseCount > 0 ? (
          <>
            {exerciseCount} exercise{exerciseCount !== 1 ? 's' : ''}
            {savedCount > 0 && (
              <span className="ml-2 text-emerald-400">
                · {savedCount} saved today
              </span>
            )}
          </>
        ) : (
          <span className="text-amber-400/90">
            {savedCount} saved today — add exercises from the library
          </span>
        )}
      </span>
      <div className="flex gap-2">
        <button type="button" onClick={onExpandAll} className="btn-ghost py-1.5 text-xs">
          Expand all
        </button>
        <button type="button" onClick={onCollapseAll} className="btn-ghost py-1.5 text-xs">
          Collapse all
        </button>
      </div>
    </div>
  )
}
