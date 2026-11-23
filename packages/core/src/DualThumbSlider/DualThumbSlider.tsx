'use client';

import {
  memo,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { STYLE_BG_PRIMARY, STYLE_TEXT_PRIMARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export interface DualThumbRange {
  min: number;
  max: number;
}

type DualThumbSliderBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface DualThumbSliderProps extends DualThumbSliderBaseProps {
  /** Controlled selected range `{ min, max }`. */
  value?: DualThumbRange;
  /** Initial range bounds in uncontrolled mode (defaults to `{ min: 20, max: 80 }`). */
  defaultValue?: DualThumbRange;
  /** Callback fired whenever either thumb changes the range. */
  onChange?: (next: DualThumbRange) => void;
  /** Minimum track bound (defaults to 0). */
  min?: number;
  /** Maximum track bound (defaults to 100). */
  max?: number;
  /** Increment step size (defaults to 1). */
  step?: number;
  /** Minimum enforced separation between min and max thumbs (defaults to 0). */
  minDistance?: number;
  /** Optional formatter for the range readout pill and thumb aria-valuetext. */
  formatValue?: (val: number) => string;
  /** Accessible and visible group label (defaults to 'Range'). */
  label?: string;
  /** Disables pointer dragging and keyboard stepping on both thumbs. */
  disabled?: boolean;
}

type ActiveThumb = 'min' | 'max';

interface DragSession {
  thumb: ActiveThumb;
  pointerId: number;
}

const DEFAULT_MIN = 0;
const DEFAULT_MAX = 100;
const DEFAULT_STEP = 1;
const DEFAULT_RANGE: DualThumbRange = { min: 20, max: 80 };
const PAGE_STEP_MULTIPLIER = 10;

function defaultFormatValue(val: number): string {
  return String(val);
}

function getDecimalPlaces(value: number): number {
  const text = String(value);
  const expIdx = text.indexOf('e-');
  if (expIdx !== -1) {
    const exp = Number(text.slice(expIdx + 2));
    return clampNumber(exp, 0, 10, 0);
  }
  const dotIdx = text.indexOf('.');
  return dotIdx === -1 ? 0 : Math.min(10, text.length - dotIdx - 1);
}

function roundToDecimals(value: number, decimals: number): number {
  const rounded = Number(value.toFixed(decimals));
  return rounded === 0 ? 0 : rounded;
}

function snapToStep(
  raw: number,
  min: number,
  max: number,
  step: number,
  decimals: number
): number {
  const clamped = clampNumber(raw, min, max, min);
  if (clamped <= min) return roundToDecimals(min, decimals);
  if (clamped >= max) return roundToDecimals(max, decimals);
  const snapped = min + Math.round((clamped - min) / step) * step;
  return clampNumber(roundToDecimals(snapped, decimals), min, max, min);
}

function normalizeRange(
  raw: DualThumbRange,
  min: number,
  max: number,
  minDistance: number,
  decimals: number
): DualThumbRange {
  const clampedLow = clampNumber(raw.min, min, max, min);
  const clampedHigh = clampNumber(raw.max, min, max, max);
  let low = Math.min(clampedLow, clampedHigh);
  let high = Math.max(clampedLow, clampedHigh);

  if (high - low < minDistance) {
    high = Math.min(max, low + minDistance);
    low = Math.max(min, high - minDistance);
  }

  return {
    min: roundToDecimals(low, decimals),
    max: roundToDecimals(high, decimals),
  };
}

function getEventPointerId(event: ReactPointerEvent<HTMLDivElement>): number {
  return typeof event.pointerId === 'number' ? event.pointerId : 0;
}

function DualThumbSliderInner({
  value,
  defaultValue = DEFAULT_RANGE,
  onChange,
  min = DEFAULT_MIN,
  max = DEFAULT_MAX,
  step = DEFAULT_STEP,
  minDistance = 0,
  formatValue,
  label = 'Range',
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: DualThumbSliderProps) {
  const labelId = useId();
  const override = useComponentOverride('DualThumbSlider');
  const trackRef = useRef<HTMLDivElement>(null);
  const activeDragRef = useRef<DragSession | null>(null);
  const [activeThumb, setActiveThumb] = useState<ActiveThumb | null>(null);

  const rawMin = Number.isFinite(min) ? min : DEFAULT_MIN;
  const rawMax = Number.isFinite(max) ? max : DEFAULT_MAX;
  const safeStep = Number.isFinite(step) && step > 0 ? step : DEFAULT_STEP;
  const safeMin = Math.min(rawMin, rawMax);
  const rawHighBound = Math.max(rawMin, rawMax);
  const safeMax = rawHighBound > safeMin ? rawHighBound : safeMin + safeStep;
  const span = safeMax - safeMin;
  const safeMinDistance = clampNumber(minDistance, 0, span, 0);
  const decimals = Math.max(
    getDecimalPlaces(safeStep),
    getDecimalPlaces(safeMinDistance),
    getDecimalPlaces(safeMin),
    getDecimalPlaces(safeMax)
  );

  const initialRange = normalizeRange(defaultValue, safeMin, safeMax, safeMinDistance, decimals);

  const [rawRange, setRawRange] = useControllableState<DualThumbRange>({
    value,
    defaultValue: initialRange,
    onChange,
  });

  const currentRange = normalizeRange(rawRange, safeMin, safeMax, safeMinDistance, decimals);
  const latestRangeRef = useRef<DualThumbRange>(currentRange);
  latestRangeRef.current = currentRange;

  const { min: low, max: high } = currentRange;
  const maxAllowedLow = roundToDecimals(high - safeMinDistance, decimals);
  const minAllowedHigh = roundToDecimals(low + safeMinDistance, decimals);

  const lowPct = clampNumber(((low - safeMin) / span) * 100, 0, 100, 0);
  const highPct = clampNumber(((high - safeMin) / span) * 100, 0, 100, 100);
  const isDragging = activeThumb !== null && !disabled;

  const format = formatValue ?? defaultFormatValue;
  const formattedLow = format(low);
  const formattedHigh = format(high);

  const clientXToValue = (clientX: number): number | null => {
    const track = trackRef.current;
    if (!track) return null;
    const rect = track.getBoundingClientRect();
    if (!Number.isFinite(rect.width) || rect.width <= 0) return null;
    const ratio = clampNumber((clientX - rect.left) / rect.width, 0, 1, 0);
    return safeMin + ratio * span;
  };

  const commitThumbValue = (thumb: ActiveThumb, candidate: number) => {
    if (disabled) return;
    const latest = latestRangeRef.current;
    const snapped = snapToStep(candidate, safeMin, safeMax, safeStep, decimals);

    let nextRange: DualThumbRange;
    if (thumb === 'min') {
      const upperBound = roundToDecimals(latest.max - safeMinDistance, decimals);
      const nextLow = roundToDecimals(
        clampNumber(snapped, safeMin, upperBound, latest.min),
        decimals
      );
      nextRange = { min: nextLow, max: latest.max };
    } else {
      const lowerBound = roundToDecimals(latest.min + safeMinDistance, decimals);
      const nextHigh = roundToDecimals(
        clampNumber(snapped, lowerBound, safeMax, latest.max),
        decimals
      );
      nextRange = { min: latest.min, max: nextHigh };
    }

    if (nextRange.min !== latest.min || nextRange.max !== latest.max) {
      if (value === undefined) {
        latestRangeRef.current = nextRange;
      }
      setRawRange(nextRange);
    }
  };

  const handleTrackPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled || (typeof event.button === 'number' && event.button > 0)) return;
    const mapped = clientXToValue(event.clientX);
    if (mapped === null) return;

    const latest = latestRangeRef.current;
    const distLow = Math.abs(mapped - latest.min);
    const distHigh = Math.abs(mapped - latest.max);
    const chosenThumb: ActiveThumb =
      distLow < distHigh || (distLow === distHigh && mapped <= latest.min)
        ? 'min'
        : 'max';

    commitThumbValue(chosenThumb, mapped);
  };

  const handleThumbPointerDown =
    (thumb: ActiveThumb) => (event: ReactPointerEvent<HTMLDivElement>) => {
      if (disabled || (typeof event.button === 'number' && event.button > 0)) return;
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.focus();

      const pointerId = getEventPointerId(event);
      activeDragRef.current = { thumb, pointerId };
      setActiveThumb(thumb);
      event.currentTarget.setPointerCapture?.(pointerId);

      const mapped = clientXToValue(event.clientX);
      if (mapped !== null) {
        commitThumbValue(thumb, mapped);
      }
    };

  const handleThumbPointerMove =
    (thumb: ActiveThumb) => (event: ReactPointerEvent<HTMLDivElement>) => {
      const drag = activeDragRef.current;
      const pointerId = getEventPointerId(event);
      if (!drag || disabled || drag.thumb !== thumb || drag.pointerId !== pointerId) return;

      const mapped = clientXToValue(event.clientX);
      if (mapped !== null) {
        commitThumbValue(thumb, mapped);
      }
    };

  const handleThumbPointerEnd =
    (thumb: ActiveThumb) => (event: ReactPointerEvent<HTMLDivElement>) => {
      const drag = activeDragRef.current;
      const pointerId = getEventPointerId(event);
      if (!drag || drag.thumb !== thumb || drag.pointerId !== pointerId) return;

      if (event.currentTarget.hasPointerCapture?.(pointerId)) {
        event.currentTarget.releasePointerCapture?.(pointerId);
      }
      activeDragRef.current = null;
      setActiveThumb(null);
    };

  const handleThumbKeyDown =
    (thumb: ActiveThumb) => (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (disabled || event.nativeEvent.isComposing) return;

      const latest = latestRangeRef.current;
      const currentVal = thumb === 'min' ? latest.min : latest.max;
      const largeStep = safeStep * PAGE_STEP_MULTIPLIER;

      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowUp':
          event.preventDefault();
          commitThumbValue(thumb, currentVal + safeStep);
          break;
        case 'ArrowLeft':
        case 'ArrowDown':
          event.preventDefault();
          commitThumbValue(thumb, currentVal - safeStep);
          break;
        case 'PageUp':
          event.preventDefault();
          commitThumbValue(thumb, currentVal + largeStep);
          break;
        case 'PageDown':
          event.preventDefault();
          commitThumbValue(thumb, currentVal - largeStep);
          break;
        case 'Home':
          event.preventDefault();
          commitThumbValue(
            thumb,
            thumb === 'min' ? safeMin : latest.min + safeMinDistance
          );
          break;
        case 'End':
          event.preventDefault();
          commitThumbValue(
            thumb,
            thumb === 'min' ? latest.max - safeMinDistance : safeMax
          );
          break;
        default:
          break;
      }
    };

  const merged = mergeProps({
    themeTarget: themeProps('dual-thumb-slider', {
      disabled,
      dragging: isDragging,
    }),
    baseClassName: 'w-full select-none',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const labelClass = stableClassName('dual-thumb-slider', 'label');
  const readoutClass = stableClassName('dual-thumb-slider', 'readout');
  const trackClass = stableClassName('dual-thumb-slider', 'track');
  const fillClass = stableClassName('dual-thumb-slider', 'fill');
  const thumbClass = stableClassName('dual-thumb-slider', 'thumb');

  const minThumbZ =
    activeThumb === 'min' || (low === high && lowPct >= 50) ? 'z-30' : 'z-10';
  const maxThumbZ = activeThumb === 'max' ? 'z-30' : 'z-20';

  return (
    <div ref={ref} role="group" aria-labelledby={labelId} {...rest} {...merged}>
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <span
          id={labelId}
          className={cx(labelClass, 'text-xs font-semibold tracking-tight')}
          style={STYLE_TEXT_PRIMARY}
        >
          {label}
        </span>
        <span
          data-testid="dual-thumb-readout"
          className={cx(
            readoutClass,
            'prism-crystal px-2.5 py-0.5 rounded-full font-mono text-xs font-semibold tabular-nums whitespace-nowrap'
          )}
          style={STYLE_TEXT_PRIMARY}
        >
          {formattedLow} – {formattedHigh}
        </span>
      </div>

      <div
        className={cx(
          'relative h-8 flex items-center touch-none',
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        )}
      >
        <div
          ref={trackRef}
          data-testid="dual-thumb-track"
          onPointerDown={handleTrackPointerDown}
          className={cx(
            trackClass,
            'prism-well relative w-full h-3 rounded-full overflow-hidden'
          )}
        >
          <div
            data-testid="dual-thumb-fill"
            aria-hidden="true"
            className={cx(fillClass, 'absolute inset-y-0 rounded-full pointer-events-none')}
            style={{
              left: `${lowPct}%`,
              width: `${highPct - lowPct}%`,
              backgroundColor: 'var(--prism-primary-main)',
              boxShadow: '0 0 12px var(--prism-primary-main)',
            }}
          />
        </div>

        <div
          role="slider"
          aria-label="Minimum value"
          aria-valuenow={low}
          aria-valuemin={safeMin}
          aria-valuemax={maxAllowedLow}
          aria-valuetext={formattedLow}
          aria-disabled={disabled ? 'true' : undefined}
          tabIndex={disabled ? -1 : 0}
          data-testid="dual-thumb-min"
          data-thumb="min"
          onPointerDown={handleThumbPointerDown('min')}
          onPointerMove={handleThumbPointerMove('min')}
          onPointerUp={handleThumbPointerEnd('min')}
          onPointerCancel={handleThumbPointerEnd('min')}
          onKeyDown={handleThumbKeyDown('min')}
          style={{
            left: `${lowPct}%`,
            borderColor: 'var(--prism-primary-main)',
            touchAction: 'none',
          }}
          className={cx(
            thumbClass,
            minThumbZ,
            'prism-crystal prism-focus-ring absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full border-2 flex items-center justify-center touch-none transition-transform duration-100',
            disabled
              ? 'cursor-not-allowed'
              : activeThumb === 'min'
                ? 'scale-110 cursor-grabbing'
                : 'cursor-grab hover:scale-105'
          )}
        >
          <span
            aria-hidden="true"
            className="w-2 h-2 rounded-full pointer-events-none"
            style={STYLE_BG_PRIMARY}
          />
        </div>

        <div
          role="slider"
          aria-label="Maximum value"
          aria-valuenow={high}
          aria-valuemin={minAllowedHigh}
          aria-valuemax={safeMax}
          aria-valuetext={formattedHigh}
          aria-disabled={disabled ? 'true' : undefined}
          tabIndex={disabled ? -1 : 0}
          data-testid="dual-thumb-max"
          data-thumb="max"
          onPointerDown={handleThumbPointerDown('max')}
          onPointerMove={handleThumbPointerMove('max')}
          onPointerUp={handleThumbPointerEnd('max')}
          onPointerCancel={handleThumbPointerEnd('max')}
          onKeyDown={handleThumbKeyDown('max')}
          style={{
            left: `${highPct}%`,
            borderColor: 'var(--prism-primary-main)',
            touchAction: 'none',
          }}
          className={cx(
            thumbClass,
            maxThumbZ,
            'prism-crystal prism-focus-ring absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full border-2 flex items-center justify-center touch-none transition-transform duration-100',
            disabled
              ? 'cursor-not-allowed'
              : activeThumb === 'max'
                ? 'scale-110 cursor-grabbing'
                : 'cursor-grab hover:scale-105'
          )}
        >
          <span
            aria-hidden="true"
            className="w-2 h-2 rounded-full pointer-events-none"
            style={STYLE_BG_PRIMARY}
          />
        </div>
      </div>
    </div>
  );
}

export const DualThumbSlider = memo(DualThumbSliderInner);
DualThumbSlider.displayName = 'DualThumbSlider';
