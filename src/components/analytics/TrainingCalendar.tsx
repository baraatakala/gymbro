import { buildCalendarCells, computeTrainingStreak } from '../../lib/trainingCalendar'
import { gymDayKey } from '../../lib/dateUtils'

interface TrainingCalendarProps {
  trainedDates: string[]
  title?: string
}

export function TrainingCalendar({
  trainedDates,
  title = 'Training calendar',
}: TrainingCalendarProps) {
  const trained = new Set(trainedDates)
  const cells = buildCalendarCells(27)
  const todayKey = gymDayKey(Date.now())
  const streak = computeTrainingStreak(trainedDates)

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-300">{title}</h3>
        <p className="text-xs text-slate-500">Last 4 weeks · all sections</p>
      </div>

      <div className="mb-3 flex flex-wrap gap-3 text-xs">
        <span className="text-slate-400">
          Streak:{' '}
          <strong className="text-emerald-400">{streak.current} day{streak.current !== 1 ? 's' : ''}</strong>
        </span>
        <span className="text-slate-500">
          Best run: {streak.longest} · {streak.last28}/28 days active
        </span>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((cell) => {
          const active = trained.has(cell.key)
          const isToday = cell.key === todayKey
          return (
            <div
              key={cell.key}
              title={cell.key}
              className={`flex aspect-square flex-col items-center justify-center rounded-md text-[10px] transition ${
                active
                  ? 'bg-emerald-600/80 text-white shadow-sm shadow-emerald-900/40'
                  : 'bg-slate-900 text-slate-600'
              } ${isToday ? 'ring-2 ring-emerald-400/60 ring-offset-1 ring-offset-slate-950' : ''}`}
            >
              <span className="opacity-70">{cell.weekday}</span>
            </div>
          )
        })}
      </div>

      <p className="mt-2 text-[10px] text-slate-600">
        Green = logged a workout that day (any section). Today has a ring.
      </p>
    </section>
  )
}
