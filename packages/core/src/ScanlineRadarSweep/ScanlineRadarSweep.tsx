'use client';

import type { CSSProperties, ReactNode } from 'react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { memoWithDisplayName } from '../utils/memo';
import { mergeProps } from '../utils/mergeProps';
import { STYLE_TEXT_PRIMARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';
import { clampFinite } from '../utils/webglShader';

export type ScanlineSweepMode = 'vertical' | 'horizontal' | 'radar';
export type ScanlineSweepTone = 'cyan' | 'prism' | 'emerald' | 'amber';

export interface ScanlineRadarSweepProps extends BaseProps<HTMLDivElement> {
  /** Enables the luminous scanning beam across the target surface. */
  active?: boolean;
  /** Beam geometry mode: top-to-bottom scanline, left-to-right scanline, or rotating radar sweep. */
  mode?: ScanlineSweepMode;
  /** Semantic beam color palette. */
  tone?: ScanlineSweepTone;
  /** Sweep cycle duration in seconds (clamped 0.8–8). */
  speedSeconds?: number;
  /** Optional status badge text overlaid cleanly while scanning. */
  statusLabel?: string;
  /** Preview canvas, media tile, or code block being scanned. */
  children?: ReactNode;
}

const SCAN_BEAM_CLASS = /*#__PURE__*/ stableClassName('scanline-radar-sweep', 'beam');
const SCAN_BADGE_CLASS = /*#__PURE__*/ stableClassName('scanline-radar-sweep', 'badge');
const SCAN_CONTENT_CLASS = /*#__PURE__*/ stableClassName('scanline-radar-sweep', 'content');

const TONE_COLOR_RGB: Readonly<Record<ScanlineSweepTone, string>> = /*#__PURE__*/ Object.freeze({
  cyan: 'var(--prism-secondary-rgb)',
  prism: 'var(--prism-primary-rgb)',
  emerald: 'var(--prism-success-rgb)',
  amber: 'var(--prism-warning-rgb)',
});

function ScanlineRadarSweepInner({
  active = true,
  mode = 'vertical',
  tone = 'cyan',
  speedSeconds = 2.2,
  statusLabel = 'Scanning optical surface…',
  children,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: ScanlineRadarSweepProps) {
  const override = useComponentOverride('ScanlineRadarSweep');
  const safeSpeed = clampFinite(speedSeconds, 0.8, 8, 2.2);
  const rgbToken = TONE_COLOR_RGB[tone];

  const beamStyle: CSSProperties =
    mode === 'vertical'
      ? ({
          background: `linear-gradient(180deg, transparent 0%, rgba(${rgbToken}, 0.24) 68%, rgba(${rgbToken}, 0.92) 96%, transparent 100%)`,
          '--prism-fx-duration': `${safeSpeed}s`,
        } as CSSProperties)
      : mode === 'horizontal'
        ? ({
            background: `linear-gradient(90deg, transparent 0%, rgba(${rgbToken}, 0.24) 68%, rgba(${rgbToken}, 0.92) 96%, transparent 100%)`,
            '--prism-fx-duration': `${safeSpeed}s`,
          } as CSSProperties)
        : ({
            background: `conic-gradient(from 0deg, transparent 0deg, transparent 275deg, rgba(${rgbToken}, 0.42) 345deg, rgba(${rgbToken}, 0.95) 360deg)`,
            '--prism-fx-duration': `${safeSpeed}s`,
          } as CSSProperties);

  const merged = mergeProps({
    themeTarget: themeProps('scanline-radar-sweep', { active, mode, tone }),
    baseClassName:
      'prism-slab prism-contain-box relative overflow-hidden rounded-2xl min-w-0 max-w-full',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div
      ref={ref}
      role="region"
      aria-busy={active}
      aria-label={statusLabel}
      {...rest}
      {...merged}
    >
      <div className={`${SCAN_CONTENT_CLASS} relative z-10 min-w-0`}>{children}</div>

      {active ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-20 overflow-hidden"
        >
          {mode === 'vertical' ? (
            <div
              data-testid="scanline-radar-sweep-beam"
              className={`${SCAN_BEAM_CLASS} prism-fx-scan-y absolute inset-x-0 top-0 h-14`}
              style={beamStyle}
            />
          ) : mode === 'horizontal' ? (
            <div
              data-testid="scanline-radar-sweep-beam"
              className={`${SCAN_BEAM_CLASS} prism-fx-scan-x absolute inset-y-0 left-0 w-16`}
              style={beamStyle}
            />
          ) : (
            <div
              data-testid="scanline-radar-sweep-beam"
              className={`${SCAN_BEAM_CLASS} prism-fx-orbit-ring opacity-70`}
              style={beamStyle}
            />
          )}
        </div>
      ) : null}

      {active && statusLabel ? (
        <div
          role="status"
          aria-live="polite"
          className={`${SCAN_BADGE_CLASS} prism-crystal pointer-events-none absolute bottom-2.5 right-2.5 z-30 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold`}
          style={STYLE_TEXT_PRIMARY}
        >
          <span className="relative z-10">{statusLabel}</span>
        </div>
      ) : null}
    </div>
  );
}

export const ScanlineRadarSweep = /*#__PURE__*/ memoWithDisplayName(
  ScanlineRadarSweepInner,
  'ScanlineRadarSweep'
);
