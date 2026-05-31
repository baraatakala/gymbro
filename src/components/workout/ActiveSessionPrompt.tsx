import { Modal } from '../ui/Modal'
import { formatSessionTime } from '../../lib/checkIn'
import type { ActiveWorkoutSession } from '../../lib/activeSession'

interface ActiveSessionPromptProps {
  open: boolean
  existing: ActiveWorkoutSession | null
  targetSection: string
  onEndPrevious: () => void
  onContinuePrevious: () => void
  onCancel: () => void
  busy?: boolean
}

export function ActiveSessionPrompt({
  open,
  existing,
  targetSection,
  onEndPrevious,
  onContinuePrevious,
  onCancel,
  busy,
}: ActiveSessionPromptProps) {
  if (!existing) return null

  return (
    <Modal open={open} onClose={onCancel} title="Active gym session">
      <p className="text-sm leading-relaxed text-slate-300">
        You still have an open session on{' '}
        <strong className="text-white">{existing.section}</strong>
        {existing.startedAt ? (
          <>
            {' '}
            (since {formatSessionTime(existing.startedAt)})
          </>
        ) : null}
        . Only one active session is allowed at a time.
      </p>
      <p className="mt-3 text-sm text-slate-400">
        Switch to <strong className="text-emerald-400">{targetSection}</strong>?
      </p>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          disabled={busy}
          onClick={onEndPrevious}
          className="btn-primary flex-1 disabled:opacity-50"
        >
          End {existing.section} & start {targetSection}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onContinuePrevious}
          className="btn-secondary flex-1"
        >
          Back to {existing.section}
        </button>
      </div>
    </Modal>
  )
}
