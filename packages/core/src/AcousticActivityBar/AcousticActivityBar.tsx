'use client';

import type { CSSProperties } from 'react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { memoWithDisplayName } from '../utils/memo';
import { mergeProps } from '../utils/mergeProps';
import { STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';
import { clampFinite } from '../utils/webglShader';

export type AcousticBarTone = 'prism' | 'emerald' | 'cobalt' | 'amber';

export interface AcousticActivityBarProps extends BaseProps<HTMLDivElement> {
  /** Animates bars smoothly when voice input, audio DSP, or live streaming is active. */
  active?: boolean;
  /** Number of vertical optical glass bars (clamped 3–24). */
  barCount?: number;
  /** Optional live normalized amplitude levels [0..1] overriding autonomous animation heights. */
  levels?: ReadonlyArray<number>;
  /** Maximum bar height in pixels (clamped 16–84). */
  heightPx?: number;
  /** Optical gradient palette for active equalizer bars. */
  tone?: AcousticBarTone;
  /** Accessible status label describing audio or stream activity. */
  label?: string;
  /** Displays compact status label beside the equalizer strip. */
  showLabel?: boolean;
}

const ACOUSTIC_BARS_CLASS = /*#__PURE__*/ stableClassName('acoustic-activity-bar', 'bars');
const ACOUSTIC_BAR_CLASS = /*#__PURE__*/ stableClassName('acoustic-activity-bar', 'bar');

const TONE_GRADIENTS: Readonly<Record<AcousticBarTone, string>> = /*#__PURE__*/ Object.freeze({
  prism: 'linear-gradient(180deg, var(--prism-primary-main), var(--prism-secondary-main))',
  emerald: 'linear-gradient(180deg, var(--prism-success-main), var(--prism-secondary-main))',
  cobalt: 'linear-gradient(180deg, var(--prism-secondary-main), var(--prism-info-main))',
  amber: 'linear-gradient(180deg, var(--prism-warning-main), var(--prism-primary-main))',
});

const PHASE_PROFILE: ReadonlyArray<number> = /*#__PURE__*/ Object.freeze([
  0.42, 0.78, 0.56, 0.94, 0.68, 0.86, 0.48, 0.72, 0.38, 0.82, 0.62, 0.9,
]);

function AcousticActivityBarInner({
  active = true,
  barCount = 9,
  levels,
  heightPx = 32,
  tone = 'prism',
  label = 'Audio activity active',
  showLabel = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: AcousticActivityBarProps) {
  const override = useComponentOverride('AcousticActivityBar');
  const safeCount = Math.round(clampFinite(barCount, 3, 24, 9));
  const safeHeight = Math.round(clampFinite(heightPx, 16, 84, 32));
  const hasExplicitLevels = Boolean(levels && levels.length > 0);
  const resolvedCount = hasExplicitLevels && levels ? Math.min(24, Math.max(3, levels.length)) : safeCount;

  const containerStyle: CSSProperties = {
    height: `${safeHeight}px`,
  };

  const merged = mergeProps({
    themeTarget: themeProps('acoustic-activity-bar', { active, tone }),
    baseClassName:
      'prism-well prism-contain-leaf inline-flex items-center gap-3 px-3 py-2 rounded-2xl min-w-0 max-w-full',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div ref={ref} role="status" aria-live="polite" aria-label={label} {...rest} {...merged}>
      <div
        className={`${ACOUSTIC_BARS_CLASS} flex items-end gap-1`}
        style={containerStyle}
        aria-hidden="true"
      >
        {Array.from({ length: resolvedCount }, (_, idx) => {
          const explicitLevel =
            hasExplicitLevels && levels
              ? clampFinite(levels[idx] ?? 0.2, 0.12, 1, 0.2)
              : null;
          const fallbackScale = PHASE_PROFILE[idx % PHASE_PROFILE.length] ?? 0.5;
          const barStyle: CSSProperties = hasExplicitLevels
            ? {
                height: `${Math.round((explicitLevel ?? 0.2) * 100)}%`,
                background: TONE_GRADIENTS[tone],
                opacity: active ? 1 : 0.45,
              }
            : ({
                height: `${Math.round(fallbackScale * 100)}%`,
                background: TONE_GRADIENTS[tone],
                opacity: active ? 1 : 0.35,
                '--prism-fx-duration': `${(0.75 + (idx % 4) * 0.18).toFixed(2)}s`,
                animationDelay: `${idx * 85}ms`,
                animationPlayState: active ? 'running' : 'paused',
              } as CSSProperties);

          return (
            <span
              key={idx}
              data-testid="acoustic-activity-bar-item"
              className={`${ACOUSTIC_BAR_CLASS} w-1.5 rounded-full transition-[height,opacity] duration-150 ${
                !hasExplicitLevels && active ? 'prism-fx-acoustic-bar' : ''
              }`}
              style={barStyle}
            />
          );
        })}
      </div>
      {showLabel ? (
        <span className="text-xs font-medium whitespace-nowrap" style={STYLE_TEXT_SECONDARY}>
          {label}
        </span>
      ) : null}
    </div>
  );
}

export const AcousticActivityBar = /*#__PURE__*/ memoWithDisplayName(
  AcousticActivityBarInner,
  'AcousticActivityBar'
);
