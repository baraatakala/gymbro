import { useMemo, useState } from 'react'
import {
  ROADMAP_FEATURES,
  WORKFLOW_STEPS,
  type Priority,
  type RoadmapTab,
} from '../../data/roadmap'
import { Modal } from '../ui/Modal'

type Filter = 'all' | Priority

interface FeatureExplorerProps {
  open: boolean
  onClose: () => void
}

const TABS: { id: RoadmapTab | 'workflow'; label: string }[] = [
  { id: 'core', label: 'Core features' },
  { id: 'ai', label: 'AI features' },
  { id: 'workflow', label: 'User workflow' },
  { id: 'social', label: 'Social & gamification' },
]

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'must-have', label: 'Must-have' },
  { id: 'high value', label: 'High value' },
  { id: 'nice to have', label: 'Nice to have' },
]

const priorityStyles: Record<Priority, string> = {
  'must-have': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  'high value': 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  'nice to have': 'bg-slate-500/20 text-slate-400 border-slate-600/40',
}

const statusStyles = {
  live: 'text-emerald-400',
  schema: 'text-amber-400',
  partial: 'text-amber-400',
  planned: 'text-slate-500',
}

export function FeatureExplorer({ open, onClose }: FeatureExplorerProps) {
  const [tab, setTab] = useState<RoadmapTab | 'workflow'>('core')
  const [filter, setFilter] = useState<Filter>('all')

  const features = useMemo(() => {
    return ROADMAP_FEATURES.filter((f) => {
      const tabMatch = tab === 'workflow' ? false : f.tab === tab
      const filterMatch = filter === 'all' || f.priority === filter
      return tabMatch && filterMatch
    })
  }, [tab, filter])

  return (
    <Modal open={open} onClose={onClose} title="GymBro — Roadmap & Workflow" wide>
      <p className="mb-4 text-sm text-slate-400">
        Complete user journey from first open to long-term retention. Schema deployed on trail
        Supabase.
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              tab === t.id
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab !== 'workflow' && (
        <div className="mb-4 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                filter === f.id
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                  : 'border-slate-700 text-slate-500'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {tab === 'workflow' ? (
        <ol className="space-y-3">
          {WORKFLOW_STEPS.map((step) => (
            <li
              key={step.step}
              className="flex gap-4 rounded-xl border border-slate-800 bg-slate-950/50 p-4"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600/30 text-sm font-bold text-emerald-300">
                {step.step}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-white">{step.title}</h3>
                  <span className={`text-xs capitalize ${statusStyles[step.status]}`}>
                    {step.status}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-400">{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <ul className="space-y-3">
          {features.map((f) => (
            <li
              key={f.id}
              className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="font-semibold text-white">{f.title}</h3>
                <div className="flex gap-2">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${priorityStyles[f.priority]}`}
                  >
                    {f.priority}
                  </span>
                  <span className={`text-xs capitalize ${statusStyles[f.status]}`}>
                    {f.status}
                  </span>
                </div>
              </div>
              <p className="mt-2 text-sm text-slate-400">{f.description}</p>
              {f.action && (
                <p className="mt-2 text-xs font-medium text-emerald-500">{f.action} ↗</p>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 rounded-xl border border-emerald-800/40 bg-emerald-950/20 p-4 text-sm text-slate-300">
        <strong className="text-emerald-400">Live on trail DB:</strong> exercise library (33
        seeded), templates, workout_sets, personal_records + trigger, badges, body_metrics,
        training_days, user_profiles.
      </div>
    </Modal>
  )
}
