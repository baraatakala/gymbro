import { QuoteGallery } from './QuoteGallery'

const QUOTES = [
  'Push yourself — no one else will do it for you.',
  'Consistency beats intensity.',
  'Strong body, strong mind.',
  'Progress is built one session at a time.',
  'Show up. Lift. Repeat.',
]

interface HeaderProps {
  quoteIndex: number
}

export function Header({ quoteIndex }: HeaderProps) {
  return (
    <header className="mb-6 text-center sm:mb-8">
      <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-300">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
        </span>
        GymBro
      </p>
      <h1 className="text-[1.75rem] font-bold tracking-tight text-white sm:text-4xl">
        <span className="bg-gradient-to-br from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
          Workout Tracker
        </span>
      </h1>
      <p className="mx-auto mt-2 max-w-lg px-2 text-sm leading-relaxed text-slate-400 sm:mt-3 sm:text-base">
        {QUOTES[quoteIndex % QUOTES.length]}
      </p>
      <QuoteGallery />
    </header>
  )
}
