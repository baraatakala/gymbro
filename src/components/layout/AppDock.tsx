import type { AppView } from './AppViewNav'

interface AppDockProps {
  view: AppView
  onChange: (view: AppView) => void
  onOpenProgress: () => void
  onOpenSettings: () => void
  disabled?: boolean
}

const MAIN: { id: AppView; label: string; icon: string }[] = [
  { id: 'workout', label: 'Workout', icon: '🏋' },
  { id: 'insights', label: 'Insights', icon: '📊' },
]

export function AppDock({
  view,
  onChange,
  onOpenProgress,
  onOpenSettings,
  disabled,
}: AppDockProps) {
  return (
    <>
      {/* Desktop: left rail */}
      <nav
        className="app-dock-desktop"
        aria-label="Main navigation"
      >
        <p className="mb-6 hidden text-center text-[10px] font-bold uppercase tracking-widest text-emerald-500/80 xl:block">
          GymBro
        </p>
        <div className="flex flex-1 flex-col gap-2">
          {MAIN.map((item) => (
            <DockBtn
              key={item.id}
              active={view === item.id}
              disabled={disabled}
              icon={item.icon}
              label={item.label}
              onClick={() => onChange(item.id)}
              layout="vertical"
            />
          ))}
          <div className="my-2 border-t border-slate-800/80" />
          <DockBtn
            active={false}
            disabled={disabled}
            icon="📈"
            label="Progress"
            onClick={onOpenProgress}
            layout="vertical"
          />
        </div>
        <DockBtn
          active={false}
          icon="⚙"
          label="Settings"
          onClick={onOpenSettings}
          layout="vertical"
        />
      </nav>

      {/* Mobile: bottom bar (above workout dock) */}
      <nav className="app-dock-mobile" aria-label="Main navigation">
        {MAIN.map((item) => (
          <DockBtn
            key={item.id}
            active={view === item.id}
            disabled={disabled}
            icon={item.icon}
            label={item.label}
            onClick={() => onChange(item.id)}
            layout="horizontal"
          />
        ))}
        <DockBtn
          active={false}
          disabled={disabled}
          icon="📈"
          label="Progress"
          onClick={onOpenProgress}
          layout="horizontal"
        />
        <DockBtn
          active={false}
          icon="⚙"
          label="More"
          onClick={onOpenSettings}
          layout="horizontal"
        />
      </nav>
    </>
  )
}

function DockBtn({
  active,
  disabled,
  icon,
  label,
  onClick,
  layout,
}: {
  active: boolean
  disabled?: boolean
  icon: string
  label: string
  onClick: () => void
  layout: 'vertical' | 'horizontal'
}) {
  const vertical = layout === 'vertical'
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={label}
      className={`flex transition disabled:opacity-40 ${
        vertical
          ? `w-full flex-col items-center gap-1 rounded-xl px-2 py-3 text-center ${
              active
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/50'
                : 'text-slate-400 hover:bg-slate-800/80 hover:text-white'
            }`
          : `min-w-0 flex-1 flex-col items-center gap-0.5 py-2 ${
              active ? 'text-emerald-400' : 'text-slate-500'
            }`
      }`}
    >
      <span className={vertical ? 'text-xl' : 'text-lg'} aria-hidden>
        {icon}
      </span>
      <span className={`font-medium ${vertical ? 'text-[10px] leading-tight' : 'text-[10px]'}`}>
        {label}
      </span>
    </button>
  )
}
