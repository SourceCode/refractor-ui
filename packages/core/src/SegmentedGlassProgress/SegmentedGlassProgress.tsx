'use client';

import type { CSSProperties } from 'react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { memoWithDisplayName } from '../utils/memo';
import { mergeProps } from '../utils/mergeProps';
import { STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';
import { clampFinite } from '../utils/webglShader';

export type SegmentedProgressTone = 'prism' | 'emerald' | 'cobalt' | 'amber' | 'critical';

export interface SegmentedGlassProgressProps extends BaseProps<HTMLDivElement> {
  /** Current completion value between 0 and `max` (clamped safely). */
  value?: number;
  /** Maximum value representing 100% completion (default 100). */
  max?: number;
  /** Number of discrete optical glass pill segments (clamped 1–20; 1 renders a continuous liquid bar). */
  segments?: number;
  /** Semantic liquid gradient fill tone. */
  tone?: SegmentedProgressTone;
  /** Displays numeric percentage readout alongside the label. */
  showPercentage?: boolean;
  /** Accessible progressbar label. */
  label?: string;
  /** Displays an indeterminate prismatic sweep when exact progress is unknown. */
  indeterminate?: boolean;
}

const PROGRESS_TRACK_CLASS = /*#__PURE__*/ stableClassName('segmented-glass-progress', 'track');
const PROGRESS_SEG_CLASS = /*#__PURE__*/ stableClassName('segmented-glass-progress', 'segment');
const PROGRESS_FILL_CLASS = /*#__PURE__*/ stableClassName('segmented-glass-progress', 'fill');

const TONE_FILL: Readonly<Record<SegmentedProgressTone, string>> = /*#__PURE__*/ Object.freeze({
  prism:
    'linear-gradient(90deg, var(--prism-secondary-main), var(--prism-info-main), var(--prism-primary-main))',
  emerald: 'linear-gradient(90deg, var(--prism-success-dark), var(--prism-success-main))',
  cobalt: 'linear-gradient(90deg, var(--prism-info-dark), var(--prism-secondary-main))',
  amber: 'linear-gradient(90deg, var(--prism-warning-main), var(--prism-primary-main))',
  critical: 'linear-gradient(90deg, var(--prism-error-main), var(--prism-warning-main))',
});

function SegmentedGlassProgressInner({
  value = 64,
  max = 100,
  segments = 10,
  tone = 'prism',
  showPercentage = true,
  label = 'Optical build progress',
  indeterminate = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: SegmentedGlassProgressProps) {
  const override = useComponentOverride('SegmentedGlassProgress');
  const safeMax = clampFinite(max, 1, 1_000_000, 100);
  const safeValue = clampFinite(value, 0, safeMax, 0);
  const safeSegments = Math.round(clampFinite(segments, 1, 20, 10));
  const ratio = safeValue / safeMax;
  const pct = Math.round(ratio * 100);

  const merged = mergeProps({
    themeTarget: themeProps('segmented-glass-progress', {
      tone,
      indeterminate,
    }),
    baseClassName: 'prism-contain-leaf space-y-2 min-w-0 max-w-full',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div ref={ref} {...rest} {...merged}>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-semibold truncate" style={STYLE_TEXT_PRIMARY}>
          {label}
        </span>
        {showPercentage ? (
          <span className="font-mono tabular-nums font-semibold shrink-0" style={STYLE_TEXT_SECONDARY}>
            {indeterminate ? '…' : `${pct}%`}
          </span>
        ) : null}
      </div>

      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={indeterminate ? undefined : Math.round(safeValue)}
        aria-valuetext={indeterminate ? 'In progress' : `${pct}%`}
        className={`${PROGRESS_TRACK_CLASS} prism-well relative flex items-center gap-1 p-1 rounded-full h-4 overflow-hidden min-w-0`}
      >
        {indeterminate ? (
          <div
            aria-hidden="true"
            data-testid="segmented-glass-progress-indeterminate"
            className="relative h-full w-full rounded-full overflow-hidden"
          >
            <div
              className="prism-fx-shimmer-wave absolute inset-y-0 left-0 w-2/3 rounded-full"
              style={{ background: TONE_FILL[tone] }}
            />
          </div>
        ) : (
          Array.from({ length: safeSegments }, (_, idx) => {
            const segStart = idx / safeSegments;
            const segEnd = (idx + 1) / safeSegments;
            const fillFraction = clampFinite((ratio - segStart) / (segEnd - segStart), 0, 1, 0);
            const fillStyle: CSSProperties = {
              width: `${Math.round(fillFraction * 100)}%`,
              background: TONE_FILL[tone],
            };
            return (
              <div
                key={idx}
                data-testid="segmented-glass-progress-segment"
                className={`${PROGRESS_SEG_CLASS} relative flex-1 h-full rounded-full overflow-hidden bg-slate-400/15 dark:bg-slate-600/25`}
              >
                <div
                  className={`${PROGRESS_FILL_CLASS} relative h-full rounded-full transition-[width] duration-300`}
                  style={fillStyle}
                >
                  {/* Specular top liquid highlight */}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0.5 top-0 h-[40%] rounded-full bg-white/40"
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export const SegmentedGlassProgress = /*#__PURE__*/ memoWithDisplayName(
  SegmentedGlassProgressInner,
  'SegmentedGlassProgress'
);
