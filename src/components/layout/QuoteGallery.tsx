const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`

const QUOTE_IMAGES = [
  { src: asset('quotes/quote1.jpg'), alt: 'Motivation quote 1' },
  { src: asset('quotes/quote2.jpg'), alt: 'Motivation quote 2' },
  { src: asset('quotes/quote3.jpg'), alt: 'Motivation quote 3' },
  { src: asset('quotes/quote4.webp'), alt: 'Motivation quote 4' },
]

interface QuoteGalleryProps {
  variant?: 'carousel' | 'compact'
}

export function QuoteGallery({ variant = 'carousel' }: QuoteGalleryProps) {
  if (variant === 'compact') {
    return (
      <div className="mt-2 grid grid-cols-4 gap-2">
        {QUOTE_IMAGES.map((img) => (
          <img
            key={img.src}
            src={img.src}
            alt={img.alt}
            loading="lazy"
            decoding="async"
            className="h-14 w-full rounded-lg border border-slate-700/50 object-cover"
          />
        ))}
      </div>
    )
  }

  return (
    <div className="mt-4 sm:mt-5">
      <div className="quote-scroll-fade -mx-1 px-1">
        <div className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto pb-1 scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {QUOTE_IMAGES.map((img) => (
            <figure
              key={img.src}
              className="snap-center shrink-0 overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900 shadow-md"
            >
              <img
                src={img.src}
                alt={img.alt}
                loading="lazy"
                decoding="async"
                className="h-[72px] w-[min(64vw,200px)] object-cover sm:h-[88px] sm:w-[220px]"
              />
            </figure>
          ))}
        </div>
      </div>
      <p className="mt-1.5 text-center text-[10px] font-medium uppercase tracking-wider text-slate-600">
        Swipe for motivation
      </p>
    </div>
  )
}
