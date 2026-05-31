import { getSectionMeta, isCardioSection } from '../../lib/sectionUtils'

interface SectionHeroProps {
  sectionName: string
  exerciseCount: number
  savedCount: number
}

export function SectionHero({ sectionName, exerciseCount, savedCount }: SectionHeroProps) {
  const meta = getSectionMeta(sectionName)
  const cardio = isCardioSection(sectionName)
  const pct = exerciseCount > 0 ? Math.round((savedCount / exerciseCount) * 100) : 0
  const complete = savedCount >= exerciseCount && exerciseCount > 0
  const circumference = 2 * Math.PI * 28
  const offset = circumference - (pct / 100) * circumference

  return (
    <div
      className={`mb-4 overflow-hidden rounded-2xl border px-5 py-4 shadow-lg ${meta.accentClass}`}
    >
      <div className="flex items-center gap-4">
        <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
          <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64" aria-hidden>
            <circle
              cx="32"
              cy="32"
              r="28"
              fill="none"
              className="stroke-black/25"
              strokeWidth="5"
            />
            <circle
              cx="32"
              cy="32"
              r="28"
              fill="none"
              className={`${meta.ringClass} transition-all duration-700 ease-out`}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>
          <span className="absolute text-sm font-bold text-white">
            {pct}%
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wider opacity-80">
            {meta.label} day
          </p>
          <h2 className="truncate text-xl font-bold text-white">
            {meta.emoji} {sectionName}
          </h2>
          <p className="mt-0.5 text-xs opacity-70">
            {cardio
              ? 'Log duration in minutes per interval'
              : 'Log weight × reps for each set'}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-3xl font-bold tabular-nums text-white">
            {savedCount}
            <span className="text-lg opacity-60">/{exerciseCount}</span>
          </p>
          <p className="text-[10px] font-medium uppercase tracking-wider opacity-70">
            {complete ? 'Complete ✓' : 'saved today'}
          </p>
        </div>
      </div>
    </div>
  )
}
