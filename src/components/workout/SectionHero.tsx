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
      className={`mb-3 overflow-hidden rounded-xl border px-4 py-3 shadow-md lg:mb-2 lg:px-3 lg:py-2.5 ${meta.accentClass}`}
    >
      <div className="flex items-center gap-3 lg:gap-2.5">
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center lg:h-10 lg:w-10">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 64 64" aria-hidden>
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
          <span className="absolute text-xs font-bold text-white lg:text-[11px]">
            {pct}%
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium uppercase tracking-wider opacity-80 lg:text-[9px]">
            {meta.label} day
          </p>
          <h2 className="truncate text-lg font-bold text-white lg:text-base">
            {meta.emoji} {sectionName}
          </h2>
          <p className="mt-0.5 text-[11px] opacity-70 lg:hidden">
            {cardio
              ? 'Log duration in minutes per interval'
              : 'Log weight × reps for each set'}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-2xl font-bold tabular-nums text-white lg:text-xl">
            {savedCount}
            <span className="text-base opacity-60 lg:text-sm">/{exerciseCount}</span>
          </p>
          <p className="text-[9px] font-medium uppercase tracking-wider opacity-70">
            {complete ? 'Complete ✓' : 'saved today'}
          </p>
        </div>
      </div>
    </div>
  )
}
