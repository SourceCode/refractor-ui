'use client';

import {
  useCallback,
  useEffect,
  useRef,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from 'react';
import type { BaseProps } from '../BaseProps';
import { useMergedRefs } from '../hooks/useMergedRefs';
import { useRafCallback } from '../hooks/useRafCallback';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { memoWithDisplayName } from '../utils/memo';
import { mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';
import { clampFinite, useOpticalShader } from '../utils/webglShader';

export interface RefractiveLensContainerProps extends BaseProps<HTMLDivElement> {
  /** Optical index of refraction (clamped 1.0–2.4; acrylic ~1.49, crystal ~1.65). */
  ior?: number;
  /** Normalized optical lens focal radius [0.15..0.85]. */
  lensRadius?: number;
  /** Subtle optical magnification multiplier for content (clamped 1.0–1.25). */
  magnification?: number;
  /** Shader highlight intensity [0..1.5]. */
  intensity?: number;
  /** Tracks pointer focus across the lens surface. */
  interactive?: boolean;
  /** Forces CSS Fresnel fallback without WebGL context allocation. */
  disableWebGL?: boolean;
  /** Foreground content refracted inside the optical lens panel. */
  children?: ReactNode;
}

const LENS_GL_CLASS = /*#__PURE__*/ stableClassName('refractive-lens-container', 'gl');
const LENS_BEVEL_CLASS = /*#__PURE__*/ stableClassName('refractive-lens-container', 'bevel');
const LENS_CONTENT_CLASS = /*#__PURE__*/ stableClassName('refractive-lens-container', 'content');

function RefractiveLensContainerInner({
  ior = 1.49,
  lensRadius = 0.52,
  magnification = 1.04,
  intensity = 0.9,
  interactive = true,
  disableWebGL = false,
  children,
  className,
  style,
  xstyle,
  ref,
  onPointerMove,
  ...rest
}: RefractiveLensContainerProps) {
  const override = useComponentOverride('RefractiveLensContainer');
  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mergedRef = useMergedRefs(ref, hostRef);

  const safeIor = clampFinite(ior, 1.0, 2.4, 1.49);
  const safeRadius = clampFinite(lensRadius, 0.15, 0.85, 0.52);
  const safeMag = clampFinite(magnification, 1.0, 1.25, 1.04);
  const safeIntensity = clampFinite(intensity, 0, 1.5, 0.9);

  const { renderer, updateUniforms } = useOpticalShader(canvasRef, {
    kind: 'refractive-lens',
    animated: interactive,
    disableWebGL,
    initialUniforms: {
      intensity: safeIntensity,
      paramA: safeIor,
      paramB: safeRadius,
    },
  });

  useEffect(() => {
    updateUniforms({
      intensity: safeIntensity,
      paramA: safeIor,
      paramB: safeRadius,
    });
  }, [safeIntensity, safeIor, safeRadius, updateUniforms]);

  const commitFocus = useRafCallback((nx: number, ny: number) => {
    updateUniforms({ pointerX: nx, pointerY: ny });
    const el = hostRef.current;
    if (el) {
      el.style.setProperty('--prism-lens-x', `${Math.round(nx * 100)}%`);
      el.style.setProperty('--prism-lens-y', `${Math.round(ny * 100)}%`);
    }
  });

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      onPointerMove?.(event);
      if (!interactive) return;
      const el = hostRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const nx = clampFinite((event.clientX - rect.left) / Math.max(1, rect.width), 0, 1, 0.5);
      const ny = clampFinite((event.clientY - rect.top) / Math.max(1, rect.height), 0, 1, 0.5);
      commitFocus(nx, ny);
    },
    [commitFocus, interactive, onPointerMove]
  );

  const bevelStyle: CSSProperties = {
    background:
      'radial-gradient(62% 58% at var(--prism-lens-x, 38%) var(--prism-lens-y, 28%), rgba(255, 255, 255, 0.34), rgba(var(--prism-secondary-rgb), 0.16) 46%, transparent 74%)',
    opacity: Math.min(1, safeIntensity * 0.85),
  };

  const contentStyle: CSSProperties =
    safeMag > 1.001
      ? {
          transform: `scale(${safeMag.toFixed(3)})`,
          transformOrigin: 'center center',
        }
      : {};

  const merged = mergeProps({
    themeTarget: themeProps('refractive-lens-container', {
      renderer,
      interactive,
    }),
    baseClassName:
      'prism-slab prism-contain-box relative overflow-hidden rounded-3xl min-w-0 max-w-full',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div
      ref={mergedRef}
      data-ior={safeIor.toFixed(2)}
      {...rest}
      {...merged}
      onPointerMove={handlePointerMove}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        data-testid="refractive-lens-gl"
        data-renderer={renderer}
        className={`${LENS_GL_CLASS} pointer-events-none absolute inset-0 h-full w-full z-0 ${
          renderer === 'webgl' ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <div
        aria-hidden="true"
        data-testid="refractive-lens-bevel"
        className={`${LENS_BEVEL_CLASS} prism-fx-dispersion-ring pointer-events-none absolute inset-0 z-10 rounded-[inherit]`}
        style={bevelStyle}
      />
      <div className={`${LENS_CONTENT_CLASS} relative z-10 min-w-0`} style={contentStyle}>
        {children}
      </div>
    </div>
  );
}

export const RefractiveLensContainer = /*#__PURE__*/ memoWithDisplayName(
  RefractiveLensContainerInner,
  'RefractiveLensContainer'
);
