export type ExportFormat = 'json' | 'csv-sets' | 'csv-records'

interface ExportBarProps {
  onExport: (format: ExportFormat) => void
  exporting?: boolean
  compact?: boolean
}

export function ExportBar({ onExport, exporting = false, compact = false }: ExportBarProps) {
  const btnClass = compact
    ? 'rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-emerald-700 hover:text-white disabled:opacity-50'
    : 'rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-emerald-700 hover:text-white disabled:opacity-50'

  return (
    <div className={`flex flex-wrap gap-2 ${compact ? '' : 'mt-6 border-t border-slate-800 pt-5'}`}>
      {!compact && (
        <p className="mb-1 w-full text-xs font-semibold uppercase tracking-wider text-slate-500">
          Export data
        </p>
      )}
      <button
        type="button"
        disabled={exporting}
        onClick={() => onExport('json')}
        className={btnClass}
      >
        {exporting ? '…' : '📦 Full backup'}
      </button>
      <button
        type="button"
        disabled={exporting}
        onClick={() => onExport('csv-sets')}
        className={btnClass}
      >
        Sets CSV
      </button>
      <button
        type="button"
        disabled={exporting}
        onClick={() => onExport('csv-records')}
        className={btnClass}
      >
        PRs CSV
      </button>
    </div>
  )
}
