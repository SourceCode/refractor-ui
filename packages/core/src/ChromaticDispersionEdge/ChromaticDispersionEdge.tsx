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

export interface ChromaticDispersionEdgeProps extends BaseProps<HTMLDivElement> {
  /** Chromatic RGB channel separation spread factor (clamped 0.5–3.0). */
  dispersion?: number;
  /** Caustic edge luminosity intensity [0..1.5]. */
  intensity?: number;
  /** Animates subtle prism wave rotation along curved edges. */
  animated?: boolean;
  /** Forces pure CSS chromatic edge dispersion without WebGL canvas. */
  disableWebGL?: boolean;
  /** Content framed by the chromatic dispersion border. */
  children?: ReactNode;
}

const EDGE_GL_CLASS = /*#__PURE__*/ stableClassName('chromatic-dispersion-edge', 'gl');
const EDGE_CAUSTIC_CLASS = /*#__PURE__*/ stableClassName('chromatic-dispersion-edge', 'caustic');
const EDGE_CONTENT_CLASS = /*#__PURE__*/ stableClassName('chromatic-dispersion-edge', 'content');

function ChromaticDispersionEdgeInner({
  dispersion = 1.35,
  intensity = 0.88,
  animated = true,
  disableWebGL = false,
  children,
  className,
  style,
  xstyle,
  ref,
  onPointerMove,
  ...rest
}: ChromaticDispersionEdgeProps) {
  const override = useComponentOverride('ChromaticDispersionEdge');
  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mergedRef = useMergedRefs(ref, hostRef);

  const safeDispersion = clampFinite(dispersion, 0.5, 3.0, 1.35);
  const safeIntensity = clampFinite(intensity, 0, 1.5, 0.88);

  const { renderer, updateUniforms } = useOpticalShader(canvasRef, {
    kind: 'chromatic-dispersion',
    animated,
    disableWebGL,
    initialUniforms: {
      intensity: safeIntensity,
      paramA: safeDispersion,
    },
  });

  useEffect(() => {
    updateUniforms({ intensity: safeIntensity, paramA: safeDispersion });
  }, [safeDispersion, safeIntensity, updateUniforms]);

  const commitPointer = useRafCallback((nx: number, ny: number) => {
    updateUniforms({ pointerX: nx, pointerY: ny });
  });

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      onPointerMove?.(event);
      const el = hostRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      commitPointer(
        clampFinite((event.clientX - rect.left) / Math.max(1, rect.width), 0, 1, 0.5),
        clampFinite((event.clientY - rect.top) / Math.max(1, rect.height), 0, 1, 0.5)
      );
    },
    [commitPointer, onPointerMove]
  );

  const pxOffset = Math.round(safeDispersion * 1.5 * 10) / 10;
  const ringStyle: CSSProperties = {
    boxShadow: `inset ${pxOffset}px 0 0 rgba(var(--prism-primary-rgb), 0.72), inset -${pxOffset}px 0 0 rgba(var(--prism-secondary-rgb), 0.72), inset 0 ${pxOffset}px 0 rgba(255, 255, 255, 0.78), inset 0 -${pxOffset}px 0 rgba(var(--prism-info-rgb), 0.62)`,
    opacity: Math.min(1, safeIntensity),
  };

  const merged = mergeProps({
    themeTarget: themeProps('chromatic-dispersion-edge', { renderer, animated }),
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
      data-dispersion={safeDispersion.toFixed(2)}
      {...rest}
      {...merged}
      onPointerMove={handlePointerMove}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        data-testid="chromatic-dispersion-gl"
        data-renderer={renderer}
        className={`${EDGE_GL_CLASS} pointer-events-none absolute inset-0 h-full w-full z-10 ${
          renderer === 'webgl' ? 'opacity-90' : 'opacity-0'
        }`}
      />
      <div
        aria-hidden="true"
        data-testid="chromatic-dispersion-ring"
        className={`${EDGE_CAUSTIC_CLASS} prism-fx-dispersion-ring pointer-events-none absolute inset-0 z-10 rounded-[inherit]`}
        style={ringStyle}
      />
      <div className={`${EDGE_CONTENT_CLASS} relative z-10 min-w-0`}>{children}</div>
    </div>
  );
}

export const ChromaticDispersionEdge = /*#__PURE__*/ memoWithDisplayName(
  ChromaticDispersionEdgeInner,
  'ChromaticDispersionEdge'
);
