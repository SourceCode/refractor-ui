'use client';


import type { BaseProps } from '../BaseProps';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export interface ProgressAndSpinnerProps extends BaseProps<HTMLDivElement> {
  /** Completion percentage clamped cleanly to [0, 100]. */
  progress: number;
  /** Accessible progress bar heading label. */
  label?: string;
  /** Whether to display the companion indeterminate emerald optical spinner pill. */
  indeterminateSpinner?: boolean;
  /** Companion text shown inside the indeterminate spinner pill. */
  spinnerLabel?: string;
}

function ProgressAndSpinnerInner({
  progress,
  label = 'Compiling refractive shader cache',
  indeterminateSpinner = true,
  spinnerLabel = 'Synchronizing virtual storage...',
  className,
  style,
  xstyle,
  ref,
  ...rest
}: ProgressAndSpinnerProps) {
  const override = useComponentOverride('ProgressAndSpinner');
  const clamped = clampNumber(progress, 0, 100, 0);

  const merged = mergeProps({
    themeTarget: themeProps('progress-and-spinner', { indeterminate: indeterminateSpinner }),
    baseClassName: 'prism-contain-leaf space-y-4 w-full',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div ref={ref} {...rest} {...merged}>
      <div>
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="font-medium text-slate-700 dark:text-slate-200">{label}</span>
          <span className="font-mono tabular-nums font-semibold text-slate-800 dark:text-slate-100">
            {clamped}%
          </span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label}
          className="prism-crystal h-4 rounded-full p-0.5 overflow-hidden"
        >
          <div
            className="prism-btn-primary h-full rounded-full transition-[color,background-color,border-color,opacity,transform] duration-200"
            style={{ width: `${clamped}%` }}
          />
        </div>
      </div>

      {indeterminateSpinner ? (
        <div className="inline-flex items-center gap-3 prism-crystal rounded-full px-4 py-2">
          <svg
            viewBox="0 0 24 24"
            role="status"
            aria-label="Loading"
            className="w-5 h-5 text-emerald-600 dark:text-emerald-400 animate-spin motion-reduce:animate-none prism-contain-box"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
            {spinnerLabel}
          </span>
        </div>
      ) : null}
    </div>
  );
}

export const ProgressAndSpinner = /*#__PURE__*/ memoWithDisplayName(ProgressAndSpinnerInner, 'ProgressAndSpinner');
