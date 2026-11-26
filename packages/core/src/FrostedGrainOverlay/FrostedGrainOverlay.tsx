'use client';

import { useEffect, useId, useRef, type CSSProperties, type ReactNode } from 'react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { memoWithDisplayName } from '../utils/memo';
import { mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';
import { clampFinite, useOpticalShader } from '../utils/webglShader';

export type FrostedGrainSize = 'fine' | 'medium' | 'coarse';

export interface FrostedGrainOverlayProps extends BaseProps<HTMLDivElement> {
  /** Micro-grain texture coarseness preventing smooth gradient color banding. */
  grainSize?: FrostedGrainSize;
  /** Tactile grain opacity (clamped 0.02–0.35). */
  opacity?: number;
  /** Subtle live film-grain jitter vs static matte-etched physical finish. */
  animated?: boolean;
  /** Forces pure SVG feTurbulence procedural grain without WebGL canvas. */
  disableWebGL?: boolean;
  /** Translucent glass content rendered beneath the non-interactive micro-grain layer. */
  children?: ReactNode;
}

const GRAIN_GL_CLASS = /*#__PURE__*/ stableClassName('frosted-grain-overlay', 'gl');
const GRAIN_SVG_CLASS = /*#__PURE__*/ stableClassName('frosted-grain-overlay', 'svg');
const GRAIN_CONTENT_CLASS = /*#__PURE__*/ stableClassName('frosted-grain-overlay', 'content');

const GRAIN_FREQ: Readonly<Record<FrostedGrainSize, { baseFreq: string; shaderScale: number }>> =
  /*#__PURE__*/ Object.freeze({
    fine: { baseFreq: '0.92', shaderScale: 2.2 },
    medium: { baseFreq: '0.65', shaderScale: 1.4 },
    coarse: { baseFreq: '0.42', shaderScale: 0.85 },
  });

function FrostedGrainOverlayInner({
  grainSize = 'fine',
  opacity = 0.14,
  animated = false,
  disableWebGL = false,
  children,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: FrostedGrainOverlayProps) {
  const override = useComponentOverride('FrostedGrainOverlay');
  const filterId = useId();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const safeOpacity = clampFinite(opacity, 0.02, 0.35, 0.14);
  const spec = GRAIN_FREQ[grainSize];

  const { renderer, updateUniforms } = useOpticalShader(canvasRef, {
    kind: 'frosted-grain',
    animated,
    disableWebGL,
    initialUniforms: {
      intensity: safeOpacity * 4.5,
      paramA: spec.shaderScale,
    },
  });

  useEffect(() => {
    updateUniforms({
      intensity: safeOpacity * 4.5,
      paramA: spec.shaderScale,
    });
  }, [safeOpacity, spec.shaderScale, updateUniforms]);

  const svgStyle: CSSProperties = {
    opacity: safeOpacity,
    mixBlendMode: 'overlay',
  };

  const merged = mergeProps({
    themeTarget: themeProps('frosted-grain-overlay', { grainSize, renderer, animated }),
    baseClassName:
      'prism-slab prism-contain-box relative overflow-hidden rounded-2xl min-w-0 max-w-full',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div ref={ref} {...rest} {...merged}>
      <div className={`${GRAIN_CONTENT_CLASS} relative z-10 min-w-0`}>{children}</div>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        data-testid="frosted-grain-gl"
        data-renderer={renderer}
        className={`${GRAIN_GL_CLASS} pointer-events-none absolute inset-0 h-full w-full z-20 ${
          renderer === 'webgl' ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <svg
        aria-hidden="true"
        data-testid="frosted-grain-svg"
        viewBox="0 0 160 160"
        preserveAspectRatio="none"
        className={`${GRAIN_SVG_CLASS} prism-contain-box pointer-events-none absolute inset-0 h-full w-full z-20`}
        style={svgStyle}
      >
        <filter id={filterId}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency={spec.baseFreq}
            numOctaves={3}
            stitchTiles="stitch"
          />
        </filter>
        <rect width="160" height="160" filter={`url(#${filterId})`} />
      </svg>
    </div>
  );
}

export const FrostedGrainOverlay = /*#__PURE__*/ memoWithDisplayName(
  FrostedGrainOverlayInner,
  'FrostedGrainOverlay'
);
