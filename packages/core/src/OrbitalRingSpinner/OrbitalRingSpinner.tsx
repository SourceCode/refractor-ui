'use client';

import { useId, type CSSProperties } from 'react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { memoWithDisplayName } from '../utils/memo';
import { mergeProps } from '../utils/mergeProps';
import { STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';
import { clampFinite } from '../utils/webglShader';

export type OrbitalRingSize = 'sm' | 'md' | 'lg' | 'xl';

export interface OrbitalRingSpinnerProps extends BaseProps<HTMLDivElement> {
  /** Ring diameter size preset. */
  size?: OrbitalRingSize;
  /** Stroke width in SVG coordinate units (clamped 2–8). */
  strokeWidth?: number;
  /** Rotation period in seconds (clamped 0.5–4). */
  speedSeconds?: number;
  /** Accessible status label announced to assistive technology. */
  label?: string;
  /** Displays the status label next to the spinner. */
  showLabel?: boolean;
  /** Pauses orbital spin animation. */
  paused?: boolean;
}

const SPINNER_SVG_CLASS = /*#__PURE__*/ stableClassName('orbital-ring-spinner', 'svg');
const SPINNER_LABEL_CLASS = /*#__PURE__*/ stableClassName('orbital-ring-spinner', 'label');

const SIZE_PX: Readonly<Record<OrbitalRingSize, number>> = /*#__PURE__*/ Object.freeze({
  sm: 24,
  md: 40,
  lg: 56,
  xl: 76,
});

function OrbitalRingSpinnerInner({
  size = 'md',
  strokeWidth = 4.5,
  speedSeconds = 1.1,
  label = 'Loading…',
  showLabel = false,
  paused = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: OrbitalRingSpinnerProps) {
  const override = useComponentOverride('OrbitalRingSpinner');
  const gradId = useId();
  const safeStroke = clampFinite(strokeWidth, 2, 8, 4.5);
  const safeSpeed = clampFinite(speedSeconds, 0.5, 4, 1.1);
  const px = SIZE_PX[size];

  const spinStyle: CSSProperties = {
    width: `${px}px`,
    height: `${px}px`,
    '--prism-fx-duration': `${safeSpeed}s`,
    animationPlayState: paused ? 'paused' : 'running',
  } as CSSProperties;

  const merged = mergeProps({
    themeTarget: themeProps('orbital-ring-spinner', { size, paused }),
    baseClassName: 'prism-contain-leaf inline-flex items-center gap-2.5 min-w-0',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div ref={ref} role="status" aria-live="polite" aria-label={label} {...rest} {...merged}>
      <svg
        viewBox="0 0 64 64"
        aria-hidden="true"
        data-testid="orbital-ring-spinner-svg"
        className={`${SPINNER_SVG_CLASS} prism-contain-box prism-fx-orbital-spin shrink-0`}
        style={spinStyle}
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--prism-secondary-main)" stopOpacity="0.05" />
            <stop offset="45%" stopColor="var(--prism-info-main)" stopOpacity="0.65" />
            <stop offset="82%" stopColor="var(--prism-primary-main)" stopOpacity="0.95" />
            <stop offset="100%" stopColor="var(--prism-warning-main)" stopOpacity="1" />
          </linearGradient>
        </defs>
        {/* Recessed optical glass track */}
        <circle
          cx="32"
          cy="32"
          r="25"
          fill="none"
          stroke="var(--prism-divider)"
          strokeWidth={safeStroke}
          opacity="0.45"
        />
        {/* Trailing prismatic orbital arc */}
        <path
          d="M 32 7 A 25 25 0 1 1 8.5 40.5"
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={safeStroke}
          strokeLinecap="round"
        />
        {/* Leading luminous head bead */}
        <circle
          cx="32"
          cy="7"
          r={Math.max(2, safeStroke * 0.62)}
          fill="var(--prism-primary-main)"
        />
      </svg>
      {showLabel ? (
        <span className={`${SPINNER_LABEL_CLASS} text-xs font-medium`} style={STYLE_TEXT_SECONDARY}>
          {label}
        </span>
      ) : null}
    </div>
  );
}

export const OrbitalRingSpinner = /*#__PURE__*/ memoWithDisplayName(
  OrbitalRingSpinnerInner,
  'OrbitalRingSpinner'
);
