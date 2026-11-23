'use client';

import { memo, useId } from 'react';
import type { BaseProps } from '../BaseProps';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { themeProps } from '../utils/themeProps';

type RangeSliderBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface RangeSliderProps extends RangeSliderBaseProps {
  /** Visible accessible label bound to the native range input. */
  label: string;
  /** Minimum track bound (defaults to 0). */
  min?: number;
  /** Maximum track bound (defaults to 100). */
  max?: number;
  /** Increment step size (defaults to 1). */
  step?: number;
  /** Current numeric value. */
  value: number;
  /** Unit suffix displayed alongside the tabular value readout. */
  unit?: string;
  /** Disables slider interaction. */
  disabled?: boolean;
  /** Callback fired with the clamped numeric value on change. */
  onChange: (value: number) => void;
}

function RangeSliderInner({
  label,
  min = 0,
  max = 100,
  step = 1,
  value,
  unit = '%',
  disabled = false,
  onChange,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: RangeSliderProps) {
  const inputId = useId();
  const override = useComponentOverride('RangeSlider');

  const rawMin = Number.isFinite(min) ? min : 0;
  const rawMax = Number.isFinite(max) ? max : 100;
  const safeMin = Math.min(rawMin, rawMax);
  const safeMax = Math.max(rawMin, rawMax);
  const safeStep = Number.isFinite(step) && step > 0 ? step : 1;
  const safeValue = clampNumber(value, safeMin, safeMax, safeMin);
  const span = safeMax - safeMin;
  const pct = span === 0 ? 0 : clampNumber(((safeValue - safeMin) / span) * 100, 0, 100, 0);

  const merged = mergeProps({
    themeTarget: themeProps('range-slider', { disabled }),
    baseClassName: 'w-full',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div ref={ref} {...rest} {...merged}>
      <div className="flex items-center justify-between mb-2">
        <label htmlFor={inputId} className="text-xs font-semibold text-slate-700 dark:text-slate-200">
          {label}
        </label>
        <span className="text-xs font-mono tabular-nums font-medium text-slate-700 dark:text-slate-200">
          {safeValue}
          {unit}
        </span>
      </div>
      <div className={`relative h-8 flex items-center ${disabled ? 'opacity-50' : ''}`}>
        <div className="prism-crystal w-full h-3.5 rounded-full overflow-hidden p-0.5">
          <div
            className="prism-emerald h-full rounded-full transition-[color,background-color,border-color,opacity,transform] duration-75"
            style={{ width: `${pct}%` }}
          />
        </div>
        <input
          id={inputId}
          type="range"
          min={safeMin}
          max={safeMax}
          step={safeStep}
          value={safeValue}
          disabled={disabled}
          onChange={(e) => {
            if (disabled) return;
            onChange(clampNumber(Number(e.target.value), safeMin, safeMax, safeMin));
          }}
          className="peer absolute inset-0 w-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />
        <div
          aria-hidden="true"
          className="prism-thumb w-6 h-6 rounded-full pointer-events-none absolute -ml-3 transition-transform duration-75 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--prism-focus-ring)]"
          style={{ left: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export const RangeSlider = memo(RangeSliderInner);
RangeSlider.displayName = 'RangeSlider';
