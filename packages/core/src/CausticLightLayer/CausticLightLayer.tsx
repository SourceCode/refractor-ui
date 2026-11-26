'use client';

import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { memoWithDisplayName } from '../utils/memo';
import { mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';
import { clampFinite, useOpticalShader } from '../utils/webglShader';

export interface CausticLightLayerProps extends BaseProps<HTMLDivElement> {
  /** Intensity of projected light refraction filaments [0..1.5]. */
  intensity?: number;
  /** Spatial frequency scale of caustic cells (clamped 0.5–3.0). */
  scale?: number;
  /** Animation drift speed multiplier (clamped 0.1–3.0). */
  speed?: number;
  /** Enables animated filament projection. */
  animated?: boolean;
  /** Forces pure CSS filament layer without WebGL canvas. */
  disableWebGL?: boolean;
  /** Hero, header, or card content illuminated by the caustic overlay. */
  children?: ReactNode;
}

const CAUSTIC_GL_CLASS = /*#__PURE__*/ stableClassName('caustic-light-layer', 'gl');
const CAUSTIC_CSS_CLASS = /*#__PURE__*/ stableClassName('caustic-light-layer', 'filaments');
const CAUSTIC_CONTENT_CLASS = /*#__PURE__*/ stableClassName('caustic-light-layer', 'content');

function CausticLightLayerInner({
  intensity = 0.72,
  scale = 1.2,
  speed = 1.0,
  animated = true,
  disableWebGL = false,
  children,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: CausticLightLayerProps) {
  const override = useComponentOverride('CausticLightLayer');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const safeIntensity = clampFinite(intensity, 0, 1.5, 0.72);
  const safeScale = clampFinite(scale, 0.5, 3.0, 1.2);
  const safeSpeed = clampFinite(speed, 0.1, 3.0, 1.0);

  const { renderer, updateUniforms } = useOpticalShader(canvasRef, {
    kind: 'caustic-light',
    animated,
    disableWebGL,
    initialUniforms: {
      intensity: safeIntensity,
      speed: safeSpeed,
      paramA: safeScale,
    },
  });

  useEffect(() => {
    updateUniforms({
      intensity: safeIntensity,
      speed: safeSpeed,
      paramA: safeScale,
    });
  }, [safeIntensity, safeScale, safeSpeed, updateUniforms]);

  const cssOverlayStyle: CSSProperties = {
    opacity: Math.min(0.85, safeIntensity * 0.75),
    '--prism-fx-duration': `${Math.max(3, Math.round(9 / safeSpeed))}s`,
  } as CSSProperties;

  const merged = mergeProps({
    themeTarget: themeProps('caustic-light-layer', { renderer, animated }),
    baseClassName:
      'prism-slab prism-contain-box relative overflow-hidden rounded-3xl min-w-0 max-w-full',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div ref={ref} {...rest} {...merged}>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        data-testid="caustic-light-layer-gl"
        data-renderer={renderer}
        className={`${CAUSTIC_GL_CLASS} pointer-events-none absolute inset-0 h-full w-full z-0 ${
          renderer === 'webgl' ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <div
        aria-hidden="true"
        data-testid="caustic-light-layer-css"
        className={`${CAUSTIC_CSS_CLASS} pointer-events-none absolute -inset-6 z-0 ${
          animated ? 'prism-fx-caustic-overlay' : ''
        }`}
        style={cssOverlayStyle}
      />
      <div className={`${CAUSTIC_CONTENT_CLASS} relative z-10 min-w-0`}>{children}</div>
    </div>
  );
}

export const CausticLightLayer = /*#__PURE__*/ memoWithDisplayName(
  CausticLightLayerInner,
  'CausticLightLayer'
);
