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

export type EnergyRibbonState =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'streaming'
  | 'success'
  | 'error';

export type EnergyRibbonPosition = 'top' | 'bottom' | 'inline';

export interface StatefulEnergyRibbonProps extends BaseProps<HTMLDivElement> {
  /** Operational system or AI state governing speed, hue, and glow. */
  state?: EnergyRibbonState;
  /** Anchors the hairline to the top/bottom edge of a positioned host or inline. */
  position?: EnergyRibbonPosition;
  /** Ribbon hairline height in pixels (clamped 2–8). */
  thicknessPx?: number;
  /** Displays a compact polite live status label beneath/beside the hairline. */
  showLabel?: boolean;
  /** Custom status announcement text overriding the default state label. */
  label?: string;
  /** Pauses animated ribbon flow while keeping the semantic hue visible. */
  paused?: boolean;
}

const RIBBON_TRACK_CLASS = /*#__PURE__*/ stableClassName('stateful-energy-ribbon', 'track');
const RIBBON_FLOW_CLASS = /*#__PURE__*/ stableClassName('stateful-energy-ribbon', 'flow');
const RIBBON_LABEL_CLASS = /*#__PURE__*/ stableClassName('stateful-energy-ribbon', 'label');

interface RibbonStateProfile {
  gradient: string;
  durationSec: number;
  defaultLabel: string;
  opacity: number;
}

const STATE_PROFILES: Readonly<Record<EnergyRibbonState, RibbonStateProfile>> =
  /*#__PURE__*/ Object.freeze({
    idle: {
      gradient:
        'linear-gradient(90deg, rgba(var(--prism-crystal-border-rgb), 0.35), rgba(var(--prism-secondary-rgb), 0.55), rgba(var(--prism-crystal-border-rgb), 0.35), rgba(var(--prism-secondary-rgb), 0.55))',
      durationSec: 8.5,
      defaultLabel: 'Idle — Ready',
      opacity: 0.65,
    },
    listening: {
      gradient:
        'linear-gradient(90deg, var(--prism-secondary-main), var(--prism-success-main), var(--prism-info-main), var(--prism-secondary-main), var(--prism-success-main))',
      durationSec: 2.6,
      defaultLabel: 'Listening for input…',
      opacity: 0.95,
    },
    thinking: {
      gradient:
        'linear-gradient(90deg, var(--prism-info-main), var(--prism-primary-main), var(--prism-warning-main), var(--prism-info-main), var(--prism-primary-main))',
      durationSec: 1.5,
      defaultLabel: 'Thinking…',
      opacity: 1,
    },
    streaming: {
      gradient:
        'linear-gradient(90deg, var(--prism-secondary-main), var(--prism-info-main), var(--prism-primary-main), var(--prism-secondary-main), var(--prism-info-main))',
      durationSec: 1.1,
      defaultLabel: 'Streaming response…',
      opacity: 1,
    },
    success: {
      gradient:
        'linear-gradient(90deg, var(--prism-success-main), var(--prism-secondary-main), var(--prism-success-main), var(--prism-secondary-main))',
      durationSec: 5.5,
      defaultLabel: 'Completed',
      opacity: 0.95,
    },
    error: {
      gradient:
        'linear-gradient(90deg, var(--prism-error-main), var(--prism-warning-main), var(--prism-error-main), var(--prism-warning-main))',
      durationSec: 1.4,
      defaultLabel: 'Attention required',
      opacity: 1,
    },
  });

const POSITION_CLASSES: Readonly<Record<EnergyRibbonPosition, string>> =
  /*#__PURE__*/ Object.freeze({
    top: 'absolute inset-x-0 top-0 z-20',
    bottom: 'absolute inset-x-0 bottom-0 z-20',
    inline: 'relative w-full',
  });

function StatefulEnergyRibbonInner({
  state = 'idle',
  position = 'inline',
  thicknessPx = 3,
  showLabel = false,
  label,
  paused = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: StatefulEnergyRibbonProps) {
  const override = useComponentOverride('StatefulEnergyRibbon');
  const profile = STATE_PROFILES[state];
  const safeThickness = clampFinite(thicknessPx, 2, 8, 3);
  const resolvedLabel = label ?? profile.defaultLabel;

  const trackStyle: CSSProperties = {
    height: `${safeThickness}px`,
  };

  const flowStyle: CSSProperties = {
    background: profile.gradient,
    opacity: profile.opacity,
    '--prism-fx-duration': `${profile.durationSec}s`,
    animationPlayState: paused ? 'paused' : 'running',
  } as CSSProperties;

  const merged = mergeProps({
    themeTarget: themeProps('stateful-energy-ribbon', { state, position, paused }),
    baseClassName: `prism-contain-leaf ${POSITION_CLASSES[position]} min-w-0 max-w-full`,
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div ref={ref} role="status" aria-live="polite" aria-label={resolvedLabel} {...rest} {...merged}>
      <div
        className={`${RIBBON_TRACK_CLASS} relative w-full overflow-hidden rounded-full`}
        style={trackStyle}
      >
        <div
          data-testid="stateful-energy-ribbon-flow"
          className={`${RIBBON_FLOW_CLASS} prism-fx-ribbon-track`}
          style={flowStyle}
        />
      </div>
      {showLabel ? (
        <div
          className={`${RIBBON_LABEL_CLASS} mt-1.5 flex items-center justify-between text-[11px] font-medium`}
          style={STYLE_TEXT_SECONDARY}
        >
          <span>{resolvedLabel}</span>
          <span className="font-mono uppercase text-[10px] tracking-wider">{state}</span>
        </div>
      ) : null}
    </div>
  );
}

export const StatefulEnergyRibbon = /*#__PURE__*/ memoWithDisplayName(
  StatefulEnergyRibbonInner,
  'StatefulEnergyRibbon'
);
