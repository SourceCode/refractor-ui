'use client';

import { useState, type KeyboardEvent } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { composeEventHandlers } from '../utils/composeEventHandlers';
import { mergeProps } from '../utils/mergeProps';
import { sanitizeUrl } from '../utils/sanitize';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export interface CarouselSlide {
  id: string;
  title: string;
  caption: string;
  imageSrc: string;
}

export interface CarouselSliderProps extends BaseProps<HTMLDivElement> {
  /** Media slides rendered inside the crystal viewport. */
  slides: ReadonlyArray<CarouselSlide>;
}

function CarouselSliderInner({
  slides,
  className,
  style,
  xstyle,
  onKeyDown,
  ref,
  ...rest
}: CarouselSliderProps) {
  const override = useComponentOverride('CarouselSlider');
  const [index, setIndex] = useState(0);
  const [failedIds, setFailedIds] = useState<ReadonlySet<string>>(() => new Set());

  const safeIndex = slides.length > 0 ? Math.min(index, slides.length - 1) : 0;
  const current = slides[safeIndex];

  const merged = mergeProps({
    themeTarget: themeProps('carousel-slider', {
      slideCount: slides.length,
      activeIndex: safeIndex,
    }),
    baseClassName: 'prism-slab p-3 space-y-3',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  if (!current) return null;

  const prev = () => setIndex((i) => (i - 1 + slides.length) % slides.length);
  const next = () => setIndex((i) => (i + 1) % slides.length);

  const handleKeyDown = composeEventHandlers<KeyboardEvent<HTMLDivElement>>(onKeyDown, (e) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      prev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      next();
    }
  });

  const safeImageSrc = sanitizeUrl(current.imageSrc, true);
  const showImage = Boolean(safeImageSrc) && !failedIds.has(current.id);

  return (
    <div
      ref={ref}
      role="region"
      aria-roledescription="carousel"
      aria-label="Media carousel"
      {...rest}
      onKeyDown={handleKeyDown}
      {...merged}
    >
      <div className="relative aspect-16/9 rounded-[18px] overflow-hidden bg-gradient-to-br from-slate-200 via-sky-100 to-amber-100 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800">
        {showImage ? (
          <img
            src={safeImageSrc}
            alt={current.title}
            referrerPolicy="no-referrer"
            onError={() =>
              setFailedIds((prevFailed) => {
                const updated = new Set(prevFailed);
                updated.add(current.id);
                return updated;
              })
            }
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-sm font-medium text-slate-600 dark:text-slate-300">
            {current.title}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent flex flex-col justify-end p-5">
          <h4 className="text-base font-semibold text-white">{current.title}</h4>
          <p className="text-xs text-white/85 mt-0.5">{current.caption}</p>
        </div>

        <button
          type="button"
          aria-label="Previous slide"
          onClick={prev}
          className="prism-crystal prism-focus-ring absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center text-slate-900 dark:text-white cursor-pointer"
        >
          <ChevronLeft aria-hidden="true" className="w-4 h-4" />
        </button>
        <button
          type="button"
          aria-label="Next slide"
          onClick={next}
          className="prism-crystal prism-focus-ring absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center text-slate-900 dark:text-white cursor-pointer"
        >
          <ChevronRight aria-hidden="true" className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center justify-between px-2">
        <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
          Slide {safeIndex + 1} of {slides.length}
        </span>
        <div className="flex items-center gap-1.5">
          {slides.map((s, idx) => (
            <button
              key={s.id}
              type="button"
              aria-label={`Go to slide ${idx + 1}`}
              aria-current={idx === safeIndex ? 'true' : undefined}
              onClick={() => setIndex(idx)}
              className={`prism-focus-ring h-2 rounded-full transition-[color,background-color,border-color,opacity,transform] cursor-pointer ${
                idx === safeIndex ? 'w-6 bg-orange-500' : 'w-2 bg-slate-400/60'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export const CarouselSlider = /*#__PURE__*/ memoWithDisplayName(CarouselSliderInner, 'CarouselSlider');
