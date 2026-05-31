import type { ToastTone } from '../../hooks/useToast'

interface ToastProps {
  message: string
  tone: ToastTone
}

const toneStyles: Record<ToastTone, string> = {
  success: 'border-emerald-400/40 bg-emerald-950/95 text-emerald-50 shadow-emerald-950/30',
  error: 'border-red-400/40 bg-red-950/95 text-red-50 shadow-red-950/30',
  info: 'border-slate-500/40 bg-slate-900/95 text-slate-100 shadow-black/40',
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
      className={`animate-toast-in fixed left-1/2 z-[100] flex max-w-[min(calc(100vw-2rem),24rem)] -translate-x-1/2 items-start gap-3 rounded-2xl border px-4 py-3.5 text-sm font-medium shadow-2xl backdrop-blur-md max-lg:bottom-[calc(5.5rem+env(safe-area-inset-bottom))] lg:bottom-6 ${toneStyles[tone]}`}
    >
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold"
        aria-hidden
      >
        {toneIcons[tone]}
      </span>
      <span className="min-w-0 pt-0.5 text-left leading-snug">{message}</span>
    </div>
  )
}
