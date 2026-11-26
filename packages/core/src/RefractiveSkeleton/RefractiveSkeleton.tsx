'use client';

import type { CSSProperties, ReactNode } from 'react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { memoWithDisplayName } from '../utils/memo';
import { mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';
import { clampFinite } from '../utils/webglShader';

export type RefractiveSkeletonPreset = 'card' | 'profile' | 'article' | 'media' | 'metrics';

export interface RefractiveSkeletonProps extends BaseProps<HTMLDivElement> {
  /** Renders frosted optical skeleton placeholders when true, or fades in children when false. */
  loading?: boolean;
  /** Structural placeholder layout preset matching target content geometry. */
  preset?: RefractiveSkeletonPreset;
  /** Number of body text lines for text-bearing presets (clamped 1–8). */
  lines?: number;
  /** Sweeps an angled prismatic light wave across placeholder blocks. */
  animated?: boolean;
  /** Sweep cycle duration in seconds (clamped 0.8–5). */
  speedSeconds?: number;
  /** Accessible status label announced while loading. */
  label?: string;
  /** Resolved content rendered once `loading` becomes false. */
  children?: ReactNode;
}

const SKEL_BLOCK_CLASS = /*#__PURE__*/ stableClassName('refractive-skeleton', 'block');
const SKEL_WAVE_CLASS = /*#__PURE__*/ stableClassName('refractive-skeleton', 'wave');

const LINE_WIDTHS: ReadonlyArray<string> = /*#__PURE__*/ Object.freeze([
  'w-full',
  'w-11/12',
  'w-4/5',
  'w-3/4',
  'w-5/6',
  'w-2/3',
  'w-10/12',
  'w-3/5',
]);

function GlassBlock({
  className,
  animated,
  waveStyle,
}: {
  className: string;
  animated: boolean;
  waveStyle: CSSProperties;
}) {
  return (
    <div
      className={`${SKEL_BLOCK_CLASS} prism-well relative overflow-hidden ${className}`}
      aria-hidden="true"
    >
      {animated ? (
        <div
          className={`${SKEL_WAVE_CLASS} prism-fx-shimmer-wave pointer-events-none absolute inset-y-0 left-0 w-2/3`}
          style={waveStyle}
        />
      ) : null}
    </div>
  );
}

function RefractiveSkeletonInner({
  loading = true,
  preset = 'card',
  lines = 3,
  animated = true,
  speedSeconds = 1.85,
  label = 'Loading optical content',
  children,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: RefractiveSkeletonProps) {
  const override = useComponentOverride('RefractiveSkeleton');
  const safeLines = Math.round(clampFinite(lines, 1, 8, 3));
  const safeSpeed = clampFinite(speedSeconds, 0.8, 5, 1.85);
  const showPlaceholder =
    loading || children === undefined || children === null || children === false;

  const waveStyle: CSSProperties = {
    '--prism-fx-duration': `${safeSpeed}s`,
  } as CSSProperties;

  const merged = mergeProps({
    themeTarget: themeProps('refractive-skeleton', {
      loading: showPlaceholder,
      preset,
      animated,
    }),
    baseClassName: showPlaceholder
      ? 'prism-slab prism-contain-leaf rounded-2xl p-5 space-y-4 min-w-0 max-w-full'
      : 'prism-contain-leaf min-w-0 max-w-full',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  if (!showPlaceholder) {
    return (
      <div ref={ref} {...rest} {...merged}>
        {children}
      </div>
    );
  }

  return (
    <div ref={ref} role="status" aria-busy="true" aria-label={label} {...rest} {...merged}>
      {preset === 'media' ? (
        <GlassBlock className="h-36 w-full rounded-xl" animated={animated} waveStyle={waveStyle} />
      ) : null}

      {preset === 'metrics' ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[0, 1, 2].map((idx) => (
            <div key={idx} className="space-y-2">
              <GlassBlock className="h-3 w-1/2 rounded-full" animated={animated} waveStyle={waveStyle} />
              <GlassBlock className="h-7 w-4/5 rounded-xl" animated={animated} waveStyle={waveStyle} />
            </div>
          ))}
        </div>
      ) : null}

      {preset === 'card' || preset === 'profile' ? (
        <div className="flex items-center gap-3.5">
          <GlassBlock
            className="w-11 h-11 rounded-full shrink-0"
            animated={animated}
            waveStyle={waveStyle}
          />
          <div className="space-y-2 flex-1 min-w-0">
            <GlassBlock className="h-3.5 w-2/5 rounded-full" animated={animated} waveStyle={waveStyle} />
            <GlassBlock className="h-2.5 w-3/5 rounded-full" animated={animated} waveStyle={waveStyle} />
          </div>
        </div>
      ) : null}

      {preset === 'article' ? (
        <GlassBlock className="h-5 w-3/5 rounded-lg" animated={animated} waveStyle={waveStyle} />
      ) : null}

      {preset !== 'metrics' ? (
        <div className="space-y-2.5">
          {Array.from({ length: safeLines }, (_, idx) => (
            <GlassBlock
              key={idx}
              className={`h-3 rounded-full ${LINE_WIDTHS[idx % LINE_WIDTHS.length] ?? 'w-full'}`}
              animated={animated}
              waveStyle={waveStyle}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export const RefractiveSkeleton = /*#__PURE__*/ memoWithDisplayName(
  RefractiveSkeletonInner,
  'RefractiveSkeleton'
);
