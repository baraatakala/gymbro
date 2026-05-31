const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`

const QUOTE_IMAGES = [
  { src: asset('quotes/quote1.jpg'), alt: 'Motivation quote 1' },
  { src: asset('quotes/quote2.jpg'), alt: 'Motivation quote 2' },
  { src: asset('quotes/quote3.jpg'), alt: 'Motivation quote 3' },
  { src: asset('quotes/quote4.webp'), alt: 'Motivation quote 4' },
]

export function QuoteGallery() {
  return (
    <div className="mt-5 sm:mt-6">
      <div className="quote-scroll-fade -mx-1 px-1">
        <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {QUOTE_IMAGES.map((img) => (
            <figure
              key={img.src}
              className="snap-center shrink-0 overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900 shadow-lg ring-1 ring-white/5"
            >
              <img
                src={img.src}
                alt={img.alt}
                loading="lazy"
                decoding="async"
                className="h-[100px] w-[min(72vw,260px)] object-cover sm:h-[118px] sm:w-[280px]"
              />
            </figure>
          ))}
        </div>
      </div>
      <p className="mt-2.5 text-center text-[11px] font-medium uppercase tracking-wider text-slate-600">
        Swipe for motivation
      </p>
    </div>
  )
}
