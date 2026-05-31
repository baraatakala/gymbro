interface DataRepairBannerProps {
  sectionName: string
  repairing: boolean
  hasLocalBackup: boolean
  onRepair: () => void | Promise<void>
}

export function DataRepairBanner({
  sectionName,
  repairing,
  hasLocalBackup,
  onRepair,
}: DataRepairBannerProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-700/50 bg-gradient-to-r from-amber-950/50 to-slate-950/80 px-4 py-3">
      <div className="min-w-0 flex-1 text-sm text-amber-100">
        <p className="font-medium text-amber-50">Workout data needs a quick fix</p>
        <p className="mt-1 text-amber-200/80">
          Cloud history for {sectionName} lost exercise details
          {hasLocalBackup
            ? ' — we can restore automatically from this browser.'
            : ' — we can remove broken empty records so stats match reality.'}
        </p>
      </div>
      <button
        type="button"
        disabled={repairing}
        onClick={() => void onRepair()}
        className="shrink-0 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-60"
      >
        {repairing ? 'Fixing…' : hasLocalBackup ? 'Restore automatically' : 'Fix cloud data'}
      </button>
    </div>
  )
}
