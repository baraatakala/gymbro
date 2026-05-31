import { Modal } from '../ui/Modal'

interface WorkflowHelpProps {
  open: boolean
  onClose: () => void
}

export function WorkflowHelp({ open, onClose }: WorkflowHelpProps) {
  return (
    <Modal open={open} onClose={onClose} title="GymBro workflow">
      <div className="space-y-5 text-sm text-slate-300">
        <section>
          <h3 className="font-semibold text-white">1. Check-in (start)</h3>
          <p className="mt-1 leading-relaxed">
            Tap a <strong className="text-slate-100">section</strong> in the left rail (Chest, Back, …)
            or save your first set. That records check-in time — there is no separate “scan in” button.
          </p>
        </section>
        <section>
          <h3 className="font-semibold text-white">2. Log workout</h3>
          <p className="mt-1 leading-relaxed">
            Add exercises from the library, enter sets, and save each exercise. Rest timer runs
            between sets. Progress shows on the session bar (desktop) or bottom dock (phone).
          </p>
        </section>
        <section>
          <h3 className="font-semibold text-white">3. Check-out (end)</h3>
          <p className="mt-1 leading-relaxed">
            When you leave the gym, tap <strong className="text-slate-100">End session</strong> or{' '}
            <strong className="text-slate-100">Finish</strong> (after at least one saved exercise).
            That sets check-out time for visit length and Insights.
          </p>
        </section>
        <section>
          <h3 className="font-semibold text-white">Insights & export</h3>
          <ul className="mt-2 list-inside list-disc space-y-1 text-slate-400">
            <li>
              <strong className="text-slate-200">Insights</strong> (dock) — visits, streak, time in
              gym, sections, rest gaps, CSV export
            </li>
            <li>
              <strong className="text-slate-200">Progress</strong> — charts for the active section
            </li>
            <li>
              <strong className="text-slate-200">Settings → Export</strong> — full backup JSON / sets
              CSV
            </li>
          </ul>
        </section>
        <p className="rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs text-slate-500">
          Data syncs to Supabase when you are online. If cloud is off, check-in/out still work in
          this browser; Insights use what is stored here and in the cloud after sync.
        </p>
      </div>
    </Modal>
  )
}
