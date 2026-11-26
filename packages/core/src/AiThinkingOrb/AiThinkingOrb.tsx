'use client';

import { useEffect, useRef, type CSSProperties } from 'react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { memoWithDisplayName } from '../utils/memo';
import { mergeProps } from '../utils/mergeProps';
import { STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';
import { clampFinite, useOpticalShader } from '../utils/webglShader';

export type AiOrbState = 'idle' | 'listening' | 'thinking' | 'generating' | 'complete';

export interface AiThinkingOrbProps extends BaseProps<HTMLDivElement> {
  /** Agent lifecycle state modulating morphing speed, energy, and optical hue. */
  state?: AiOrbState;
  /** Orb diameter in pixels (clamped 36–160). */
  sizePx?: number;
  /** Accessible status text describing current agent activity. */
  label?: string;
  /** Displays state label beneath or beside the orb. */
  showLabel?: boolean;
  /** Forces pure CSS/SVG liquid morphing orb without WebGL canvas. */
  disableWebGL?: boolean;
}

const ORB_STAGE_CLASS = /*#__PURE__*/ stableClassName('ai-thinking-orb', 'stage');
const ORB_GL_CLASS = /*#__PURE__*/ stableClassName('ai-thinking-orb', 'gl');
const ORB_CORE_CLASS = /*#__PURE__*/ stableClassName('ai-thinking-orb', 'core');

interface OrbStateSpec {
  energy: number;
  speed: number;
  accentShift: number;
  defaultLabel: string;
  gradient: string;
}

const ORB_STATE_SPECS: Readonly<Record<AiOrbState, OrbStateSpec>> = /*#__PURE__*/ Object.freeze({
  idle: {
    energy: 0.2,
    speed: 0.55,
    accentShift: 0.1,
    defaultLabel: 'Agent standing by',
    gradient:
      'radial-gradient(circle at 35% 30%, rgba(255, 255, 255, 0.85), rgba(var(--prism-secondary-rgb), 0.72) 48%, rgba(var(--prism-info-rgb), 0.78) 100%)',
  },
  listening: {
    energy: 0.55,
    speed: 1.05,
    accentShift: 0.35,
    defaultLabel: 'Listening…',
    gradient:
      'radial-gradient(circle at 35% 30%, rgba(255, 255, 255, 0.88), rgba(var(--prism-success-rgb), 0.78) 46%, rgba(var(--prism-secondary-rgb), 0.84) 100%)',
  },
  thinking: {
    energy: 0.9,
    speed: 1.55,
    accentShift: 0.75,
    defaultLabel: 'Reasoning…',
    gradient:
      'radial-gradient(circle at 35% 30%, rgba(255, 255, 255, 0.9), rgba(var(--prism-info-rgb), 0.82) 42%, rgba(var(--prism-primary-rgb), 0.88) 100%)',
  },
  generating: {
    energy: 1.0,
    speed: 1.95,
    accentShift: 1.0,
    defaultLabel: 'Generating response…',
    gradient:
      'radial-gradient(circle at 35% 30%, rgba(255, 255, 255, 0.92), rgba(var(--prism-primary-rgb), 0.84) 44%, rgba(var(--prism-warning-rgb), 0.86) 100%)',
  },
  complete: {
    energy: 0.15,
    speed: 0.35,
    accentShift: 0.25,
    defaultLabel: 'Response ready',
    gradient:
      'radial-gradient(circle at 35% 30%, rgba(255, 255, 255, 0.9), rgba(var(--prism-success-rgb), 0.82) 50%, rgba(var(--prism-secondary-rgb), 0.78) 100%)',
  },
});

function AiThinkingOrbInner({
  state = 'thinking',
  sizePx = 68,
  label,
  showLabel = true,
  disableWebGL = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: AiThinkingOrbProps) {
  const override = useComponentOverride('AiThinkingOrb');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const spec = ORB_STATE_SPECS[state];
  const safeSize = Math.round(clampFinite(sizePx, 36, 160, 68));
  const resolvedLabel = label ?? spec.defaultLabel;
  const isAnimated = state !== 'complete';

  const { renderer, updateUniforms } = useOpticalShader(canvasRef, {
    kind: 'thinking-orb',
    animated: isAnimated,
    disableWebGL,
    initialUniforms: {
      intensity: 0.95,
      speed: spec.speed,
      paramA: spec.accentShift,
      paramB: spec.energy,
    },
  });

  useEffect(() => {
    updateUniforms({
      speed: spec.speed,
      paramA: spec.accentShift,
      paramB: spec.energy,
    });
  }, [spec.accentShift, spec.energy, spec.speed, updateUniforms]);

  const stageStyle: CSSProperties = {
    width: `${safeSize}px`,
    height: `${safeSize}px`,
  };

  const durationSec = Math.max(1.8, Math.round((5.5 / spec.speed) * 10) / 10);
  const coreStyle: CSSProperties = {
    background: spec.gradient,
    '--prism-fx-duration': `${durationSec}s`,
  } as CSSProperties;

  const haloStyle: CSSProperties = {
    background: spec.gradient,
    '--prism-fx-duration': `${(durationSec * 1.25).toFixed(1)}s`,
  } as CSSProperties;

  const merged = mergeProps({
    themeTarget: themeProps('ai-thinking-orb', { state, renderer }),
    baseClassName: 'prism-contain-leaf inline-flex flex-col items-center gap-2 min-w-0',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div ref={ref} role="status" aria-live="polite" aria-label={resolvedLabel} {...rest} {...merged}>
      <div
        data-testid="ai-thinking-orb-stage"
        className={`${ORB_STAGE_CLASS} relative flex items-center justify-center rounded-full overflow-hidden shrink-0`}
        style={stageStyle}
      >
        {/* Outer soft liquid aura */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-1 rounded-full blur-md opacity-65 ${
            isAnimated ? 'prism-fx-aura-layer' : ''
          }`}
          style={haloStyle}
        />

        {/* WebGL liquid morphing orb canvas */}
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          data-testid="ai-thinking-orb-gl"
          data-renderer={renderer}
          className={`${ORB_GL_CLASS} pointer-events-none absolute inset-0 h-full w-full z-10 ${
            renderer === 'webgl' ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Optical liquid sphere core (CSS fallback & specular glass shell) */}
        <div
          aria-hidden="true"
          data-testid="ai-thinking-orb-core"
          className={`${ORB_CORE_CLASS} pointer-events-none relative z-10 w-[72%] h-[72%] rounded-[44%_56%_52%_48%/48%_44%_56%_52%] shadow-inner ${
            isAnimated ? 'prism-fx-metaball-a' : ''
          }`}
          style={coreStyle}
        />
      </div>

      {showLabel ? (
        <div className="text-center min-w-0">
          <div className="text-xs font-semibold" style={STYLE_TEXT_PRIMARY}>
            {resolvedLabel}
          </div>
          <div className="text-[10px] font-mono uppercase tracking-wider" style={STYLE_TEXT_SECONDARY}>
            {state}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export const AiThinkingOrb = /*#__PURE__*/ memoWithDisplayName(
  AiThinkingOrbInner,
  'AiThinkingOrb'
);
