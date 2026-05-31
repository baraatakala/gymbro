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
    <header className="page-header mb-4 sm:mb-5">
      <div className="page-header-main">
        <p className="brand-pill">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          GymBro
        </p>
        <h1 className="page-title">Workout Tracker</h1>
        <p className="page-tagline">{QUOTES[quoteIndex % QUOTES.length]}</p>
      </div>

      <details className="quote-panel-desktop hidden lg:block">
        <summary className="cursor-pointer text-xs font-medium text-slate-500 hover:text-slate-300">
          Motivation
        </summary>
        <QuoteGallery variant="compact" />
      </details>

      <div className="lg:hidden">
        <QuoteGallery variant="carousel" />
      </div>
    </header>
  )
}
