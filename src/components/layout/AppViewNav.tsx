export type AppView = 'workout' | 'insights'

interface AppViewNavProps {
  view: AppView
  onChange: (view: AppView) => void
  disabled?: boolean
}

export function AppViewNav({ view, onChange, disabled }: AppViewNavProps) {
  const items: { id: AppView; label: string; hint: string }[] = [
    { id: 'workout', label: 'Workout', hint: 'Log sets & sections' },
    { id: 'insights', label: 'Insights', hint: 'Filter, sort, export' },
  ]

  return (
    <nav
      className="glass-panel mb-5 flex gap-1 p-1 sm:mb-6"
      aria-label="App sections"
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          disabled={disabled}
          onClick={() => onChange(item.id)}
          className={`flex min-w-0 flex-1 flex-col rounded-xl px-3 py-2.5 text-left transition sm:px-4 ${
            view === item.id
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40'
              : 'text-slate-400 hover:bg-slate-800/80 hover:text-white'
          } disabled:opacity-50`}
        >
          <span className="text-sm font-semibold">{item.label}</span>
          <span
            className={`mt-0.5 truncate text-[10px] sm:text-xs ${
              view === item.id ? 'text-emerald-100/90' : 'text-slate-500'
            }`}
          >
            {item.hint}
          </span>
        </button>
      ))}
    </nav>
  )
}
