import type { ToastTone } from '../../hooks/useToast'

interface ToastProps {
  message: string
  tone: ToastTone
}

const toneStyles: Record<ToastTone, string> = {
  success: 'border-emerald-500/50 bg-emerald-950/90 text-emerald-100',
  error: 'border-red-500/50 bg-red-950/90 text-red-100',
  info: 'border-slate-500/50 bg-slate-900/95 text-slate-100',
}

const toneIcons: Record<ToastTone, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
}

export function Toast({ message, tone }: ToastProps) {
  return (
    <div
      role="status"
      className={`animate-toast-in fixed bottom-24 left-1/2 z-[100] flex max-w-[min(100%,26rem)] -translate-x-1/2 items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium shadow-2xl sm:bottom-6 ${toneStyles[tone]}`}
    >
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs"
        aria-hidden
      >
        {toneIcons[tone]}
      </span>
      <span className="text-left leading-snug">{message}</span>
    </div>
  )
}
