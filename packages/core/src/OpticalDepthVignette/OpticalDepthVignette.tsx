'use client';

import {
  useEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
} from 'react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { memoWithDisplayName } from '../utils/memo';
import { mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';
import { clampFinite, useOpticalShader } from '../utils/webglShader';

export interface OpticalDepthVignetteProps extends BaseProps<HTMLDivElement> {
  /** Activates progressive background depth-of-field blur and optical dimming. */
  active?: boolean;
  /** Normalized horizontal focal aperture center [0..1]. */
  focusX?: number;
  /** Normalized vertical focal aperture center [0..1]. */
  focusY?: number;
  /** Normalized clear-focus aperture radius [0.15..0.85]. */
  aperture?: number;
  /** Background depth-of-field blur radius in pixels (clamped 0–20). */
  blurPx?: number;
  /** Outer vignette dim opacity [0..0.85]. */
  dimOpacity?: number;
  /** Optional dismiss handler triggered on backdrop click or Escape key when active. */
  onDismiss?: () => void;
  /** Forces pure CSS depth-of-field radial vignette without WebGL canvas. */
  disableWebGL?: boolean;
  /** Background workspace layer progressively blurred when `active` is true. */
  children?: ReactNode;
  /** Crisp foreground spotlight, modal, or approval gate rendered above the depth-of-field veil. */
  foreground?: ReactNode;
}

const VIGNETTE_BG_CLASS = /*#__PURE__*/ stableClassName('optical-depth-vignette', 'background');
const VIGNETTE_VEIL_CLASS = /*#__PURE__*/ stableClassName('optical-depth-vignette', 'veil');
const VIGNETTE_GL_CLASS = /*#__PURE__*/ stableClassName('optical-depth-vignette', 'gl');
const VIGNETTE_FG_CLASS = /*#__PURE__*/ stableClassName('optical-depth-vignette', 'foreground');

function OpticalDepthVignetteInner({
  active = true,
  focusX = 0.5,
  focusY = 0.5,
  aperture = 0.36,
  blurPx = 8,
  dimOpacity = 0.58,
  onDismiss,
  disableWebGL = false,
  children,
  foreground,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: OpticalDepthVignetteProps) {
  const override = useComponentOverride('OpticalDepthVignette');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const safeFx = clampFinite(focusX, 0, 1, 0.5);
  const safeFy = clampFinite(focusY, 0, 1, 0.5);
  const safeAperture = clampFinite(aperture, 0.15, 0.85, 0.36);
  const safeBlur = clampFinite(blurPx, 0, 20, 8);
  const safeDim = clampFinite(dimOpacity, 0, 0.85, 0.58);

  const { renderer, updateUniforms } = useOpticalShader(canvasRef, {
    kind: 'optical-vignette',
    animated: false,
    disableWebGL,
    initialUniforms: {
      pointerX: safeFx,
      pointerY: safeFy,
      intensity: active ? safeDim * 1.35 : 0,
      paramA: safeAperture,
    },
  });

  useEffect(() => {
    updateUniforms({
      pointerX: safeFx,
      pointerY: safeFy,
      intensity: active ? safeDim * 1.35 : 0,
      paramA: safeAperture,
    });
  }, [active, safeAperture, safeDim, safeFx, safeFy, updateUniforms]);

  useEffect(() => {
    if (!active || !onDismiss || typeof window === 'undefined') return undefined;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.isComposing) return;
      if (event.key === 'Escape') {
        onDismiss();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [active, onDismiss]);

  const bgStyle: CSSProperties = {
    filter: active && safeBlur > 0 ? `blur(${safeBlur}px)` : 'none',
    transform: active ? 'scale(0.985)' : 'scale(1)',
  };

  const innerStopPct = Math.round(safeAperture * 100);
  const outerStopPct = Math.min(100, innerStopPct + 44);
  const veilStyle: CSSProperties = {
    background: `radial-gradient(circle at ${Math.round(safeFx * 100)}% ${Math.round(safeFy * 100)}%, transparent ${innerStopPct}%, rgba(15, 23, 42, ${safeDim.toFixed(2)}) ${outerStopPct}%)`,
    opacity: active ? 1 : 0,
  };

  const merged = mergeProps({
    themeTarget: themeProps('optical-depth-vignette', { active, renderer }),
    baseClassName:
      'prism-contain-box relative overflow-hidden rounded-3xl min-w-0 max-w-full',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div ref={ref} {...rest} {...merged}>
      <div
        data-testid="optical-depth-vignette-bg"
        aria-hidden={active && foreground ? 'true' : undefined}
        className={`${VIGNETTE_BG_CLASS} transition-[filter,transform] duration-300 min-w-0`}
        style={bgStyle}
      >
        {children}
      </div>

      <canvas
        ref={canvasRef}
        aria-hidden="true"
        data-testid="optical-depth-vignette-gl"
        data-renderer={renderer}
        className={`${VIGNETTE_GL_CLASS} pointer-events-none absolute inset-0 h-full w-full z-10 transition-opacity duration-300 ${
          active && renderer === 'webgl' ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <div
        aria-hidden="true"
        data-testid="optical-depth-vignette-veil"
        onClick={active ? onDismiss : undefined}
        className={`${VIGNETTE_VEIL_CLASS} absolute inset-0 z-10 transition-opacity duration-300 ${
          active && onDismiss ? 'pointer-events-auto cursor-pointer' : 'pointer-events-none'
        }`}
        style={veilStyle}
      />

      {foreground ? (
        <div
          data-testid="optical-depth-vignette-fg"
          className={`${VIGNETTE_FG_CLASS} relative z-20 min-w-0`}
        >
          {foreground}
        </div>
      ) : null}
    </div>
  );
}

export const OpticalDepthVignette = /*#__PURE__*/ memoWithDisplayName(
  OpticalDepthVignetteInner,
  'OpticalDepthVignette'
);
