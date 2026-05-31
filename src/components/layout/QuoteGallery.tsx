import { useCallback, useEffect, useState } from 'react'
import { Modal } from '../ui/Modal'

const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`

export const QUOTE_IMAGES = [
  { src: asset('quotes/quote1.jpg'), alt: 'Every day you are alive, your story is still being written.' },
  { src: asset('quotes/quote2.jpg'), alt: 'Motivation quote 2' },
  { src: asset('quotes/quote3.jpg'), alt: 'Motivation quote 3' },
  { src: asset('quotes/quote4.webp'), alt: 'Motivation quote 4' },
] as const

interface QuoteGalleryProps {
  variant?: 'featured' | 'carousel'
  activeIndex?: number
  onIndexChange?: (index: number) => void
}

export function QuoteGallery({
  variant = 'carousel',
  activeIndex: controlledIndex,
  onIndexChange,
}: QuoteGalleryProps) {
  const [internalIndex, setInternalIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const index =
    controlledIndex !== undefined
      ? ((controlledIndex % QUOTE_IMAGES.length) + QUOTE_IMAGES.length) % QUOTE_IMAGES.length
      : internalIndex

  const setIndex = useCallback(
    (next: number) => {
      const safe =
        ((next % QUOTE_IMAGES.length) + QUOTE_IMAGES.length) % QUOTE_IMAGES.length
      if (onIndexChange) onIndexChange(safe)
      else setInternalIndex(safe)
    },
    [onIndexChange],
  )

  useEffect(() => {
    if (variant !== 'featured' || controlledIndex !== undefined) return
    const id = window.setInterval(() => {
      setInternalIndex((i) => (i + 1) % QUOTE_IMAGES.length)
    }, 12_000)
    return () => window.clearInterval(id)
  }, [variant, controlledIndex])

  const current = QUOTE_IMAGES[index]

  if (variant === 'featured') {
    return (
      <>
        <div className="motivation-featured">
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            className="motivation-featured-frame group"
            aria-label="View motivation quote full size"
          >
            <img
              key={current.src}
              src={current.src}
              alt={current.alt}
              loading="lazy"
              decoding="async"
              className="motivation-featured-img"
            />
            <span className="motivation-featured-zoom">Tap to enlarge</span>
          </button>
          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex gap-1">
              {QUOTE_IMAGES.map((img, i) => (
                <button
                  key={img.src}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Quote ${i + 1}`}
                  aria-current={i === index ? 'true' : undefined}
                  className={`h-1.5 rounded-full transition-all ${
                    i === index ? 'w-5 bg-emerald-400' : 'w-1.5 bg-slate-600 hover:bg-slate-500'
                  }`}
                />
              ))}
            </div>
            <div className="flex gap-0.5">
              <button
                type="button"
                onClick={() => setIndex(index - 1)}
                className="rounded-lg px-2 py-0.5 text-xs text-slate-500 hover:bg-slate-800 hover:text-white"
                aria-label="Previous quote"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => setIndex(index + 1)}
                className="rounded-lg px-2 py-0.5 text-xs text-slate-500 hover:bg-slate-800 hover:text-white"
                aria-label="Next quote"
              >
                ›
              </button>
            </div>
          </div>
        </div>

        <Modal open={lightboxOpen} onClose={() => setLightboxOpen(false)} title="Motivation" wide>
          <img
            src={current.src}
            alt={current.alt}
            className="mx-auto max-h-[min(70vh,520px)] w-full rounded-xl object-contain"
          />
        </Modal>
      </>
    )
  }

  return (
    <div className="mt-3 sm:mt-4">
      <div className="quote-scroll-fade -mx-1 px-1">
        <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {QUOTE_IMAGES.map((img, i) => (
            <figure
              key={img.src}
              className="snap-center shrink-0 overflow-hidden rounded-xl border border-slate-700/60 bg-slate-950 shadow-lg"
            >
              <button
                type="button"
                onClick={() => {
                  setIndex(i)
                  setLightboxOpen(true)
                }}
                className="block"
              >
                <img
                  src={img.src}
                  alt={img.alt}
                  loading="lazy"
                  decoding="async"
                  className="h-[7.5rem] w-[min(78vw,280px)] object-contain sm:h-36 sm:w-[300px]"
                />
              </button>
            </figure>
          ))}
        </div>
      </div>
      <p className="mt-1 text-center text-[10px] font-medium uppercase tracking-wider text-slate-600">
        Swipe · tap to enlarge
      </p>

      <Modal open={lightboxOpen} onClose={() => setLightboxOpen(false)} title="Motivation" wide>
        <img
          src={QUOTE_IMAGES[index].src}
          alt={QUOTE_IMAGES[index].alt}
          className="mx-auto max-h-[min(70vh,520px)] w-full rounded-xl object-contain"
        />
      </Modal>
    </div>
  )
}
