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
    <header className="mb-8 text-center">
      <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-950/40 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-emerald-400">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        GymBro
      </p>
      <h1 className="bg-gradient-to-b from-white to-slate-400 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl">
        Workout Tracker
      </h1>
      <p className="mx-auto mt-3 max-w-md text-sm text-slate-400">
        {QUOTES[quoteIndex % QUOTES.length]}
      </p>
      <QuoteGallery />
    </header>
  )
}
