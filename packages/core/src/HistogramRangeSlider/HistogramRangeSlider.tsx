'use client';

import {
  memo,
  useCallback,
  useEffect,
  useId,
  useMemo,
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
import { STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export interface HistogramBin {
  /** Lower numeric bound of this distribution bin. */
  min: number;
  /** Upper numeric bound of this distribution bin. */
  max: number;
  /** Frequency count of items in this bin (clamped >= 0). */
  count: number;
}

export interface HistogramRangeValue {
  /** Active lower bound of the selected range. */
  min: number;
  /** Active upper bound of the selected range. */
  max: number;
}

type HistogramRangeSliderBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface HistogramRangeSliderProps extends HistogramRangeSliderBaseProps {
  /** Distribution bins defining the numeric domain and bar heights. */
  bins: HistogramBin[];
  /** Controlled lower and upper selection bounds. */
  value?: HistogramRangeValue;
  /** Initial selection bounds for uncontrolled usage. */
  defaultValue?: HistogramRangeValue;
  /** Callback fired whenever either range bound changes. */
  onChange?: (next: HistogramRangeValue) => void;
  /** Increment step used for snapping drags and keyboard navigation (defaults to 1). */
  step?: number;
  /** Optional formatter applied to range readouts and aria-valuetext. */
  formatValue?: (val: number) => string;
  /** Visible heading label for the slider (defaults to 'Distribution Range'). */
  label?: string;
  /** Disables pointer dragging and keyboard stepping. */
  disabled?: boolean;
}

interface NormalizedBin {
  id: string;
  min: number;
  max: number;
  count: number;
}

type ActiveThumb = 'min' | 'max' | null;

function defaultFormatValue(val: number): string {
  return String(val);
}

function getStepDecimals(step: number): number {
  const str = String(step);
  const dotIdx = str.indexOf('.');
  return dotIdx === -1 ? 0 : Math.min(6, str.length - dotIdx - 1);
}

function normalizeBins(bins: ReadonlyArray<HistogramBin>): NormalizedBin[] {
  const result: NormalizedBin[] = [];
  for (let i = 0; i < bins.length; i += 1) {
    const bin = bins[i];
    if (!bin || !Number.isFinite(bin.min) || !Number.isFinite(bin.max)) {
      continue;
    }
    const low = Math.min(bin.min, bin.max);
    const high = Math.max(bin.min, bin.max);
    const count = Number.isFinite(bin.count) ? Math.max(0, bin.count) : 0;
    result.push({
      id: `bin-${i}-${low}-${high}`,
      min: low,
      max: high,
      count,
    });
  }
  return result;
}

function normalizeRange(
  range: HistogramRangeValue | undefined,
  domainMin: number,
  domainMax: number
): HistogramRangeValue {
  if (!range) {
    return { min: domainMin, max: domainMax };
  }
  const cMin = clampNumber(range.min, domainMin, domainMax, domainMin);
  const cMax = clampNumber(range.max, domainMin, domainMax, domainMax);
  return {
    min: Math.min(cMin, cMax),
    max: Math.max(cMin, cMax),
  };
}

function snapToStep(
  raw: number,
  domainMin: number,
  domainMax: number,
  step: number
): number {
  if (domainMax <= domainMin) {
    return domainMin;
  }
  const snapped = domainMin + Math.round((raw - domainMin) / step) * step;
  const factor = 10 ** getStepDecimals(step);
  const rounded = Math.round(snapped * factor) / factor;
  return clampNumber(rounded, domainMin, domainMax, domainMin);
}

function binOverlapsRange(bin: NormalizedBin, low: number, high: number): boolean {
  if (low === high || bin.min === bin.max) {
    return bin.min <= high && bin.max >= low;
  }
  return bin.max > low && bin.min < high;
}

function HistogramRangeSliderInner({
  bins,
  value,
  defaultValue,
  onChange,
  step = 1,
  formatValue = defaultFormatValue,
  label = 'Distribution Range',
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: HistogramRangeSliderProps) {
  const headingId = useId();
  const trackRef = useRef<HTMLDivElement>(null);
  const cleanupDragRef = useRef<(() => void) | null>(null);
  const [activeThumb, setActiveThumb] = useState<ActiveThumb>(null);
  const override = useComponentOverride('HistogramRangeSlider');

  const safeStep = Number.isFinite(step) && step > 0 ? step : 1;

  const { normalizedBins, domainMin, domainMax, maxCount, totalCount } = useMemo(() => {
    const clean = normalizeBins(bins);
    if (clean.length === 0) {
      return {
        normalizedBins: clean,
        domainMin: 0,
        domainMax: 0,
        maxCount: 1,
        totalCount: 0,
      };
    }
    let minVal = clean[0]!.min;
    let maxVal = clean[0]!.max;
    let peak = 0;
    let sum = 0;
    for (const bin of clean) {
      if (bin.min < minVal) minVal = bin.min;
      if (bin.max > maxVal) maxVal = bin.max;
      if (bin.count > peak) peak = bin.count;
      sum += bin.count;
    }
    return {
      normalizedBins: clean,
      domainMin: minVal,
      domainMax: maxVal,
      maxCount: Math.max(1, peak),
      totalCount: sum,
    };
  }, [bins]);

  const isEmpty = normalizedBins.length === 0;
  const domainSpan = domainMax - domainMin;

  const [rawRange, setRawRange] = useControllableState<HistogramRangeValue | undefined>({
    value,
    defaultValue,
  });

  const safeRange = normalizeRange(rawRange, domainMin, domainMax);
  const low = safeRange.min;
  const high = safeRange.max;

  const lowPct =
    domainSpan > 0 ? clampNumber(((low - domainMin) / domainSpan) * 100, 0, 100, 0) : 0;
  const highPct =
    domainSpan > 0 ? clampNumber(((high - domainMin) / domainSpan) * 100, 0, 100, 100) : 100;

  const { bars, matchedCount } = useMemo(() => {
    let matched = 0;
    const items = normalizedBins.map((bin, idx) => {
      const active = binOverlapsRange(bin, low, high);
      if (active) {
        matched += bin.count;
      }
      const xPct =
        domainSpan > 0
          ? ((bin.min - domainMin) / domainSpan) * 100
          : (idx / normalizedBins.length) * 100;
      const wPct =
        domainSpan > 0
          ? ((bin.max - bin.min) / domainSpan) * 100
          : 100 / normalizedBins.length;
      const gap = Math.min(0.8, wPct * 0.16);
      const barX = xPct + gap / 2;
      const barW = Math.max(0.5, wPct - gap);
      const barH = bin.count === 0 ? 2 : Math.max(4, (bin.count / maxCount) * 40);
      const barY = 44 - barH;
      return {
        id: bin.id,
        x: barX,
        y: barY,
        width: barW,
        height: barH,
        active,
      };
    });
    return { bars: items, matchedCount: matched };
  }, [normalizedBins, low, high, domainSpan, domainMin, maxCount]);

  const updateThumb = useCallback(
    (thumb: 'min' | 'max', rawVal: number) => {
      if (disabled || isEmpty) return;
      const snapped = snapToStep(rawVal, domainMin, domainMax, safeStep);
      if (thumb === 'min') {
        const nextMin = Math.min(snapped, high);
        if (nextMin === low) return;
        const next = { min: nextMin, max: high };
        setRawRange(next);
        onChange?.(next);
      } else {
        const nextMax = Math.max(snapped, low);
        if (nextMax === high) return;
        const next = { min: low, max: nextMax };
        setRawRange(next);
        onChange?.(next);
      }
    },
    [disabled, isEmpty, domainMin, domainMax, safeStep, low, high, setRawRange, onChange]
  );

  const latestUpdateRef = useRef(updateThumb);
  latestUpdateRef.current = updateThumb;

  useEffect(() => {
    return () => {
      cleanupDragRef.current?.();
    };
  }, []);

  const valueFromClientX = useCallback(
    (clientX: number): number | null => {
      const track = trackRef.current;
      if (!track) return null;
      const rect = track.getBoundingClientRect();
      if (!Number.isFinite(rect.width) || rect.width <= 0) return null;
      const ratio = clampNumber((clientX - rect.left) / rect.width, 0, 1, 0);
      return domainMin + ratio * domainSpan;
    },
    [domainMin, domainSpan]
  );

  const startDrag = useCallback(
    (thumb: 'min' | 'max', clientX: number) => {
      cleanupDragRef.current?.();
      setActiveThumb(thumb);

      const initialVal = valueFromClientX(clientX);
      if (initialVal !== null) {
        latestUpdateRef.current(thumb, initialVal);
      }

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const nextVal = valueFromClientX(moveEvent.clientX);
        if (nextVal !== null) {
          latestUpdateRef.current(thumb, nextVal);
        }
      };

      const cleanup = () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerEnd);
        window.removeEventListener('pointercancel', handlePointerEnd);
        cleanupDragRef.current = null;
      };

      const handlePointerEnd = () => {
        cleanup();
        setActiveThumb(null);
      };

      cleanupDragRef.current = cleanup;
      window.addEventListener('pointermove', handlePointerMove, { passive: true });
      window.addEventListener('pointerup', handlePointerEnd);
      window.addEventListener('pointercancel', handlePointerEnd);
    },
    [valueFromClientX]
  );

  const handleTrackPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (disabled || isEmpty || event.button > 0) return;
      event.preventDefault();
      const pointerVal = valueFromClientX(event.clientX);
      if (pointerVal === null) return;
      const distMin = Math.abs(pointerVal - low);
      const distMax = Math.abs(pointerVal - high);
      const chosenThumb: 'min' | 'max' =
        distMin < distMax || (distMin === distMax && pointerVal <= low) ? 'min' : 'max';
      startDrag(chosenThumb, event.clientX);
    },
    [disabled, isEmpty, valueFromClientX, low, high, startDrag]
  );

  const handleThumbPointerDown = useCallback(
    (thumb: 'min' | 'max') => (event: ReactPointerEvent<HTMLDivElement>) => {
      event.stopPropagation();
      if (disabled || isEmpty || event.button > 0) return;
      event.preventDefault();
      startDrag(thumb, event.clientX);
    },
    [disabled, isEmpty, startDrag]
  );

  const handleThumbKeyDown = useCallback(
    (thumb: 'min' | 'max') => (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (disabled || isEmpty || event.nativeEvent.isComposing) return;
      const currentVal = thumb === 'min' ? low : high;

      if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
        event.preventDefault();
        updateThumb(thumb, currentVal + safeStep);
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
        event.preventDefault();
        updateThumb(thumb, currentVal - safeStep);
      } else if (event.key === 'Home') {
        event.preventDefault();
        updateThumb(thumb, thumb === 'min' ? domainMin : low);
      } else if (event.key === 'End') {
        event.preventDefault();
        updateThumb(thumb, thumb === 'min' ? high : domainMax);
      }
    },
    [disabled, isEmpty, low, high, safeStep, domainMin, domainMax, updateThumb]
  );

  const merged = mergeProps({
    themeTarget: themeProps('histogram-range-slider', {
      disabled,
      dragging: activeThumb !== null,
      empty: isEmpty,
    }),
    baseClassName: 'prism-slab p-4 space-y-3 select-none',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('histogram-range-slider', 'header');
  const chartClass = stableClassName('histogram-range-slider', 'chart');
  const trackClass = stableClassName('histogram-range-slider', 'track');
  const thumbClass = stableClassName('histogram-range-slider', 'thumb');

  const formattedLow = formatValue(low);
  const formattedHigh = formatValue(high);
  const minThumbOnTop = activeThumb === 'min' || (low === high && lowPct > 50);

  return (
    <div
      ref={ref}
      role="group"
      aria-labelledby={headingId}
      {...rest}
      {...merged}
    >
      <div className={cx(headerClass, 'flex flex-wrap items-center justify-between gap-2')}>
        <span
          id={headingId}
          className="text-sm font-semibold tracking-tight"
          style={STYLE_TEXT_PRIMARY}
        >
          {label}
        </span>

        <div className="flex flex-wrap items-center gap-2">
          {!isEmpty ? (
            <span
              data-testid="histogram-range-pill"
              className="prism-crystal px-2.5 py-1 rounded-full font-mono text-xs font-semibold tabular-nums"
              style={STYLE_TEXT_PRIMARY}
            >
              {formattedLow} – {formattedHigh}
            </span>
          ) : null}
          <span
            data-testid="histogram-count-pill"
            className="prism-well px-2.5 py-1 rounded-full text-xs font-medium tabular-nums"
            style={STYLE_TEXT_SECONDARY}
          >
            {matchedCount} / {totalCount} items
          </span>
        </div>
      </div>

      {isEmpty ? (
        <div
          role="status"
          data-testid="histogram-empty"
          className="prism-well rounded-2xl px-4 py-6 text-center text-xs font-medium"
          style={STYLE_TEXT_SECONDARY}
        >
          No distribution data available
        </div>
      ) : (
        <div
          className={cx(
            'prism-well rounded-2xl px-4 pt-3 pb-3 space-y-2',
            disabled ? 'opacity-55' : undefined
          )}
        >
          <svg
            viewBox="0 0 100 44"
            preserveAspectRatio="none"
            role="img"
            aria-label={`${label} distribution histogram (${matchedCount} of ${totalCount} items matched)`}
            className={cx(chartClass, 'w-full h-24 block overflow-visible')}
          >
            {bars.map((bar) => (
              <rect
                key={bar.id}
                x={bar.x}
                y={bar.y}
                width={bar.width}
                height={bar.height}
                rx={1.2}
                data-active={bar.active ? 'true' : 'false'}
                fill={bar.active ? 'var(--prism-primary-main)' : 'var(--prism-divider)'}
              />
            ))}
          </svg>

          <div
            ref={trackRef}
            data-testid="histogram-track"
            onPointerDown={handleTrackPointerDown}
            style={{ touchAction: 'none' }}
            className={cx(
              trackClass,
              'relative h-7 flex items-center touch-none',
              disabled ? 'cursor-not-allowed' : 'cursor-pointer'
            )}
          >
            <div className="prism-crystal w-full h-3 rounded-full relative overflow-hidden">
              <div
                data-testid="histogram-active-track"
                className="absolute top-0 bottom-0 rounded-full"
                style={{
                  left: `${lowPct}%`,
                  width: `${Math.max(0, highPct - lowPct)}%`,
                  backgroundColor: 'var(--prism-primary-main)',
                }}
              />
            </div>

            <div
              role="slider"
              tabIndex={disabled ? -1 : 0}
              aria-label={`${label} minimum`}
              aria-valuemin={domainMin}
              aria-valuemax={high}
              aria-valuenow={low}
              aria-valuetext={formattedLow}
              aria-disabled={disabled || undefined}
              data-thumb="min"
              data-dragging={activeThumb === 'min' ? 'true' : undefined}
              onPointerDown={handleThumbPointerDown('min')}
              onKeyDown={handleThumbKeyDown('min')}
              style={{ left: `${lowPct}%` }}
              className={cx(
                thumbClass,
                'prism-thumb prism-focus-ring absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full transition-transform duration-75',
                minThumbOnTop ? 'z-20' : 'z-10',
                disabled
                  ? 'cursor-not-allowed'
                  : activeThumb === 'min'
                    ? 'scale-110 cursor-grabbing'
                    : 'cursor-grab'
              )}
            />

            <div
              role="slider"
              tabIndex={disabled ? -1 : 0}
              aria-label={`${label} maximum`}
              aria-valuemin={low}
              aria-valuemax={domainMax}
              aria-valuenow={high}
              aria-valuetext={formattedHigh}
              aria-disabled={disabled || undefined}
              data-thumb="max"
              data-dragging={activeThumb === 'max' ? 'true' : undefined}
              onPointerDown={handleThumbPointerDown('max')}
              onKeyDown={handleThumbKeyDown('max')}
              style={{ left: `${highPct}%` }}
              className={cx(
                thumbClass,
                'prism-thumb prism-focus-ring absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full transition-transform duration-75',
                minThumbOnTop ? 'z-10' : 'z-20',
                disabled
                  ? 'cursor-not-allowed'
                  : activeThumb === 'max'
                    ? 'scale-110 cursor-grabbing'
                    : 'cursor-grab'
              )}
            />
          </div>

          <div
            className="flex items-center justify-between text-[11px] font-mono tabular-nums"
            style={STYLE_TEXT_SECONDARY}
          >
            <span>{formatValue(domainMin)}</span>
            <span>{formatValue(domainMax)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export const HistogramRangeSlider = memo(HistogramRangeSliderInner);
HistogramRangeSlider.displayName = 'HistogramRangeSlider';
