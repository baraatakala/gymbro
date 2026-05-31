import { QUOTE_IMAGES, QuoteGallery } from './QuoteGallery'

const QUOTES = [
  'Push yourself — no one else will do it for you.',
  'Consistency beats intensity.',
  'Strong body, strong mind.',
  'Progress is built one session at a time.',
  'Show up. Lift. Repeat.',
]

interface HeaderProps {
  quoteIndex: number
  onQuoteIndexChange?: (index: number) => void
  /** Motivation images distract on data-heavy views */
  showMotivation?: boolean
}

export function Header({
  quoteIndex,
  onQuoteIndexChange,
  showMotivation = true,
}: HeaderProps) {
  const textQuote = QUOTES[quoteIndex % QUOTES.length]

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
        <p className="page-tagline">{textQuote}</p>
      </div>

      {showMotivation && (
      <aside className="motivation-aside hidden lg:block" aria-label="Motivation quotes">
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Daily spark
        </p>
        <QuoteGallery
          variant="featured"
          activeIndex={quoteIndex % QUOTE_IMAGES.length}
          onIndexChange={onQuoteIndexChange}
        />
      </aside>
      )}

      {showMotivation && (
      <div className="lg:hidden">
        <QuoteGallery
          variant="carousel"
          activeIndex={quoteIndex % QUOTE_IMAGES.length}
          onIndexChange={onQuoteIndexChange}
        />
      </div>
      )}
    </header>
  )
}
