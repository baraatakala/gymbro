import { useState } from 'react'

interface QuickAddExerciseProps {
  onAdd: (name: string) => void | Promise<void>
}

export function QuickAddExercise({ onAdd }: QuickAddExerciseProps) {
  const [name, setName] = useState('')
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)

  const submit = async (n: string) => {
    setAdding(true)
    try {
      await onAdd(n)
      setName('')
      setOpen(false)
    } finally {
      setAdding(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border border-dashed border-slate-600 py-3 text-sm text-slate-400 transition hover:border-emerald-600 hover:text-emerald-400"
      >
        + Custom exercise name
      </button>
    )
  }

  return (
    <div className="glass-panel flex gap-2 p-3">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Cable Crossover"
        disabled={adding}
        className="flex-1 rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white disabled:opacity-60"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            const n = name.trim()
            if (n && !adding) void submit(n)
          }
          if (e.key === 'Escape') setOpen(false)
        }}
      />
      <button
        type="button"
        disabled={adding}
        onClick={() => {
          const n = name.trim()
          if (n) void submit(n)
        }}
        className="btn-primary shrink-0 px-4 py-2"
      >
        {adding ? '…' : 'Add'}
      </button>
      <button
        type="button"
        disabled={adding}
        onClick={() => setOpen(false)}
        className="shrink-0 px-2 text-slate-500 hover:text-white"
        aria-label="Cancel"
      >
        ✕
      </button>
    </div>
  )
}
