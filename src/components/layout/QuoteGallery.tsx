const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`

const QUOTE_IMAGES = [
  { src: asset('quotes/quote1.jpg'), alt: 'Motivation quote 1' },
  { src: asset('quotes/quote2.jpg'), alt: 'Motivation quote 2' },
  { src: asset('quotes/quote3.jpg'), alt: 'Motivation quote 3' },
  { src: asset('quotes/quote4.webp'), alt: 'Motivation quote 4' },
]

export function QuoteGallery() {
  return (
    <div className="mt-5">
      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {QUOTE_IMAGES.map((img) => (
          <figure
            key={img.src}
            className="snap-start shrink-0 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/60 shadow"
          >
            <img
              src={img.src}
              alt={img.alt}
              loading="lazy"
              className="h-[110px] w-[240px] object-cover sm:h-[120px] sm:w-[260px]"
            />
          </figure>
        ))}
      </div>
      <p className="mt-2 text-center text-xs text-slate-500">
        Swipe for motivation.
      </p>
    </div>
  )
}

