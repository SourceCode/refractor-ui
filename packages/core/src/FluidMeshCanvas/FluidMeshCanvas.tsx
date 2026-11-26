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

export type FluidMeshMood = 'calm' | 'creative' | 'thinking' | 'alert';

export interface FluidMeshCanvasProps extends BaseProps<HTMLDivElement> {
  /** Ambient palette & motion cadence profile reacting to application state. */
  mood?: FluidMeshMood;
  /** Live typing/interaction cadence intensity [0..1] modulating mesh energy. */
  cadence?: number;
  /** Ambient mesh visibility/intensity [0..1.5]. */
  intensity?: number;
  /** Enables continuous ambient morphing when motion is permitted. */
  animated?: boolean;
  /** Forces CSS-only mesh backdrop even when WebGL is available. */
  disableWebGL?: boolean;
  /** Foreground glass panels floating above the fluid mesh backdrop. */
  children?: ReactNode;
}

const MESH_CANVAS_CLASS = /*#__PURE__*/ stableClassName('fluid-mesh-canvas', 'gl');
const MESH_FALLBACK_CLASS = /*#__PURE__*/ stableClassName('fluid-mesh-canvas', 'fallback');
const MESH_CONTENT_CLASS = /*#__PURE__*/ stableClassName('fluid-mesh-canvas', 'content');

const MOOD_SPEED: Readonly<Record<FluidMeshMood, number>> = /*#__PURE__*/ Object.freeze({
  calm: 0.65,
  creative: 1.0,
  thinking: 1.55,
  alert: 1.9,
});

const MOOD_CSS_BACKDROP: Readonly<Record<FluidMeshMood, string>> = /*#__PURE__*/ Object.freeze({
  calm: 'radial-gradient(60% 55% at var(--prism-mesh-x, 28%) var(--prism-mesh-y, 32%), rgba(var(--prism-secondary-rgb), 0.32), transparent 68%), radial-gradient(55% 55% at 78% 72%, rgba(var(--prism-info-rgb), 0.24), transparent 70%)',
  creative:
    'radial-gradient(62% 56% at var(--prism-mesh-x, 30%) var(--prism-mesh-y, 30%), rgba(var(--prism-primary-rgb), 0.34), transparent 66%), radial-gradient(58% 58% at 74% 68%, rgba(var(--prism-secondary-rgb), 0.32), transparent 68%)',
  thinking:
    'radial-gradient(60% 56% at var(--prism-mesh-x, 50%) var(--prism-mesh-y, 40%), rgba(var(--prism-info-rgb), 0.38), transparent 65%), radial-gradient(58% 54% at 24% 76%, rgba(var(--prism-primary-rgb), 0.28), transparent 68%)',
  alert:
    'radial-gradient(62% 54% at var(--prism-mesh-x, 50%) var(--prism-mesh-y, 35%), rgba(var(--prism-error-rgb), 0.34), transparent 66%), radial-gradient(56% 52% at 75% 75%, rgba(var(--prism-warning-rgb), 0.28), transparent 68%)',
});

function FluidMeshCanvasInner({
  mood = 'creative',
  cadence = 0.35,
  intensity = 0.85,
  animated = true,
  disableWebGL = false,
  children,
  className,
  style,
  xstyle,
  ref,
  onPointerMove,
  ...rest
}: FluidMeshCanvasProps) {
  const override = useComponentOverride('FluidMeshCanvas');
  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mergedRef = useMergedRefs(ref, hostRef);

  const safeCadence = clampFinite(cadence, 0, 1, 0.35);
  const safeIntensity = clampFinite(intensity, 0, 1.5, 0.85);
  const effectiveSpeed = MOOD_SPEED[mood] + safeCadence * 1.1;

  const { renderer, updateUniforms } = useOpticalShader(canvasRef, {
    kind: 'fluid-mesh',
    animated,
    disableWebGL,
    initialUniforms: {
      intensity: safeIntensity,
      speed: effectiveSpeed,
      paramA: safeCadence,
      paramB: safeCadence,
    },
  });

  useEffect(() => {
    updateUniforms({
      intensity: safeIntensity,
      speed: effectiveSpeed,
      paramA: safeCadence,
      paramB: safeCadence,
    });
  }, [effectiveSpeed, safeCadence, safeIntensity, updateUniforms]);

  const commitPointer = useRafCallback((nx: number, ny: number) => {
    updateUniforms({ pointerX: nx, pointerY: ny });
    const el = hostRef.current;
    if (el) {
      el.style.setProperty('--prism-mesh-x', `${Math.round(nx * 100)}%`);
      el.style.setProperty('--prism-mesh-y', `${Math.round(ny * 100)}%`);
    }
  });

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      onPointerMove?.(event);
      const el = hostRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const nx = clampFinite((event.clientX - rect.left) / Math.max(1, rect.width), 0, 1, 0.5);
      const ny = clampFinite((event.clientY - rect.top) / Math.max(1, rect.height), 0, 1, 0.5);
      commitPointer(nx, ny);
    },
    [commitPointer, onPointerMove]
  );

  const fallbackStyle: CSSProperties = {
    background: MOOD_CSS_BACKDROP[mood],
    opacity: Math.min(1, safeIntensity),
    '--prism-fx-duration': `${Math.max(4, Math.round(12 / Math.max(0.5, effectiveSpeed)))}s`,
  } as CSSProperties;

  const merged = mergeProps({
    themeTarget: themeProps('fluid-mesh-canvas', { mood, renderer, animated }),
    baseClassName:
      'prism-slab prism-contain-box relative overflow-hidden rounded-3xl min-w-0 max-w-full',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div ref={mergedRef} {...rest} {...merged} onPointerMove={handlePointerMove}>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        data-testid="fluid-mesh-canvas-gl"
        data-renderer={renderer}
        className={`${MESH_CANVAS_CLASS} pointer-events-none absolute inset-0 h-full w-full ${
          renderer === 'webgl' ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <div
        aria-hidden="true"
        data-testid="fluid-mesh-canvas-fallback"
        className={`${MESH_FALLBACK_CLASS} pointer-events-none absolute -inset-6 ${
          animated ? 'prism-fx-caustic-overlay' : ''
        }`}
        style={fallbackStyle}
      />
      <div className={`${MESH_CONTENT_CLASS} relative z-10 min-w-0`}>{children}</div>
    </div>
  );
}

export const FluidMeshCanvas = /*#__PURE__*/ memoWithDisplayName(
  FluidMeshCanvasInner,
  'FluidMeshCanvas'
);
