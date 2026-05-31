interface BarItem {
  label: string
  value: number
  highlight?: boolean
}

export function AttendanceBars({
  items,
  maxValue,
  unit = '',
}: {
  items: BarItem[]
  maxValue?: number
  unit?: string
}) {
  const max = maxValue ?? Math.max(1, ...items.map((i) => i.value))

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.label}>
          <div className="mb-1 flex justify-between text-xs">
            <span className={item.highlight ? 'font-medium text-amber-300' : 'text-slate-400'}>
              {item.label}
            </span>
            <span className="tabular-nums text-slate-500">
              {item.value}
              {unit}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className={`h-full rounded-full transition-all ${
                item.highlight ? 'bg-amber-500/80' : 'bg-emerald-500/70'
              }`}
              style={{ width: `${Math.max(4, (item.value / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}
