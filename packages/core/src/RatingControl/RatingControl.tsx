'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { themeProps } from '../utils/themeProps';

type RatingControlBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface RatingControlProps extends RatingControlBaseProps {
  /** Current rating score from 0 to max. */
  value: number;
  /** Maximum number of selectable stars (defaults to 5). */
  max?: number;
  /** Callback fired with the chosen star rating (1..max). */
  onChange: (rating: number) => void;
  /** Visible caption rendered above the star pill. */
  label?: string;
  /** Disables hover preview and star selection. */
  disabled?: boolean;
}

export function RatingControl({
  value,
  max = 5,
  onChange,
  label = 'Optical Clarity Score',
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: RatingControlProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const override = useComponentOverride('RatingControl');

  const safeMax = Math.max(1, Math.min(20, Math.round(clampNumber(max, 1, 20, 5))));
  const safeValue = clampNumber(value, 0, safeMax, 0);
  const activeScore = hovered ?? safeValue;
  const scores = Array.from({ length: safeMax }, (_, i) => i + 1);
  const formattedScore = Number.isInteger(safeValue) ? `${safeValue}.0` : safeValue.toFixed(1);

  const merged = mergeProps({
    themeTarget: themeProps('rating-control', { value: safeValue, max: safeMax, disabled }),
    baseClassName: 'inline-flex flex-col gap-1.5',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div ref={ref} {...rest} {...merged}>
      {label ? (
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{label}</span>
      ) : null}
      <div
        role="group"
        aria-label={label || 'Rating'}
        className="prism-crystal rounded-full px-3.5 py-2 inline-flex items-center gap-1.5"
      >
        {scores.map((score) => {
          const filled = score <= activeScore;
          return (
            <button
              key={`star-${score}`}
              type="button"
              disabled={disabled}
              aria-label={`Rate ${score} out of ${safeMax} stars`}
              aria-pressed={score <= safeValue}
              onMouseEnter={() => setHovered(score)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onChange(score)}
              className="prism-focus-ring p-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-transform enabled:hover:scale-110 rounded-full"
            >
              <Star
                aria-hidden="true"
                className={`w-5 h-5 transition-colors ${
                  filled
                    ? 'fill-amber-400 text-orange-500 drop-shadow-sm drop-shadow-amber-500/45'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              />
            </button>
          );
        })}
        <span className="ml-2 text-xs font-mono tabular-nums font-semibold text-slate-700 dark:text-slate-200">
          {formattedScore} / {safeMax}
        </span>
      </div>
    </div>
  );
}

RatingControl.displayName = 'RatingControl';
