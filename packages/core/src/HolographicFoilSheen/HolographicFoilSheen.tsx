'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
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

export type HolographicFoilPreset = 'dichroic' | 'pearl' | 'titanium' | 'prism-gold';

export interface HolographicFoilSheenProps extends BaseProps<HTMLDivElement> {
  /** Dichroic metallic foil color preset. */
  preset?: HolographicFoilPreset;
  /** Pearlescent sheen intensity [0..1.5]. */
  intensity?: number;
  /** Subtle 3D tilt angle in degrees on hover (clamped 0–12). */
  tiltDegrees?: number;
  /** Forces pure CSS dichroic sheen without WebGL canvas. */
  disableWebGL?: boolean;
  /** Disables hover sheen and tilt reaction. */
  disabled?: boolean;
  /** Pro-plan badge, collectible tile, or hero card content. */
  children?: ReactNode;
}

const FOIL_GL_CLASS = /*#__PURE__*/ stableClassName('holographic-foil-sheen', 'gl');
const FOIL_SHEEN_CLASS = /*#__PURE__*/ stableClassName('holographic-foil-sheen', 'sheen');
const FOIL_CONTENT_CLASS = /*#__PURE__*/ stableClassName('holographic-foil-sheen', 'content');

const FOIL_GRADIENTS: Readonly<Record<HolographicFoilPreset, string>> = /*#__PURE__*/ Object.freeze({
  dichroic:
    'linear-gradient(var(--prism-foil-angle, 118deg), transparent 14%, rgba(var(--prism-secondary-rgb), 0.36) 36%, rgba(255, 255, 255, 0.56) 49%, rgba(var(--prism-primary-rgb), 0.34) 62%, rgba(var(--prism-info-rgb), 0.28) 74%, transparent 88%)',
  pearl:
    'linear-gradient(var(--prism-foil-angle, 118deg), transparent 16%, rgba(255, 255, 255, 0.62) 44%, rgba(var(--prism-secondary-rgb), 0.26) 56%, rgba(var(--prism-success-rgb), 0.22) 68%, transparent 86%)',
  titanium:
    'linear-gradient(var(--prism-foil-angle, 118deg), transparent 18%, rgba(var(--prism-crystal-border-rgb), 0.42) 38%, rgba(255, 255, 255, 0.65) 50%, rgba(var(--prism-info-rgb), 0.28) 64%, transparent 84%)',
  'prism-gold':
    'linear-gradient(var(--prism-foil-angle, 118deg), transparent 16%, rgba(var(--prism-warning-rgb), 0.38) 38%, rgba(255, 255, 255, 0.58) 50%, rgba(var(--prism-primary-rgb), 0.36) 64%, transparent 86%)',
});

function HolographicFoilSheenInner({
  preset = 'dichroic',
  intensity = 0.85,
  tiltDegrees = 5,
  disableWebGL = false,
  disabled = false,
  children,
  className,
  style,
  xstyle,
  ref,
  onPointerMove,
  onPointerEnter,
  onPointerLeave,
  ...rest
}: HolographicFoilSheenProps) {
  const override = useComponentOverride('HolographicFoilSheen');
  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mergedRef = useMergedRefs(ref, hostRef);
  const [hovered, setHovered] = useState(false);

  const safeIntensity = clampFinite(intensity, 0, 1.5, 0.85);
  const safeTilt = clampFinite(tiltDegrees, 0, 12, 5);

  const { renderer, updateUniforms } = useOpticalShader(canvasRef, {
    kind: 'holographic-foil',
    animated: !disabled,
    disableWebGL,
    initialUniforms: {
      intensity: safeIntensity,
      paramA: safeTilt * 0.2,
    },
  });

  useEffect(() => {
    updateUniforms({ intensity: safeIntensity, paramA: safeTilt * 0.2 });
  }, [safeIntensity, safeTilt, updateUniforms]);

  const commitFoil = useRafCallback((nx: number, ny: number) => {
    updateUniforms({ pointerX: nx, pointerY: ny });
    const el = hostRef.current;
    if (!el) return;
    const angle = Math.round(90 + (nx - 0.5) * 90 + (ny - 0.5) * 45);
    const rx = ((0.5 - ny) * safeTilt).toFixed(2);
    const ry = ((nx - 0.5) * safeTilt).toFixed(2);
    el.style.setProperty('--prism-foil-angle', `${angle}deg`);
    el.style.setProperty('--prism-foil-pos', `${Math.round(nx * 100)}% ${Math.round(ny * 100)}%`);
    if (safeTilt > 0) {
      el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg)`;
    }
  });

  const handlePointerEnter = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      onPointerEnter?.(event);
      if (!disabled) setHovered(true);
    },
    [disabled, onPointerEnter]
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      onPointerMove?.(event);
      if (disabled) return;
      const el = hostRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      commitFoil(
        clampFinite((event.clientX - rect.left) / Math.max(1, rect.width), 0, 1, 0.5),
        clampFinite((event.clientY - rect.top) / Math.max(1, rect.height), 0, 1, 0.5)
      );
    },
    [commitFoil, disabled, onPointerMove]
  );

  const handlePointerLeave = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      onPointerLeave?.(event);
      commitFoil.cancel();
      setHovered(false);
      if (hostRef.current) {
        hostRef.current.style.transform = '';
      }
    },
    [commitFoil, onPointerLeave]
  );

  const sheenStyle: CSSProperties = {
    background: FOIL_GRADIENTS[preset],
    backgroundSize: '200% 200%',
    backgroundPosition: 'var(--prism-foil-pos, 50% 50%)',
    opacity: disabled ? 0 : hovered ? Math.min(1, safeIntensity) : Math.min(0.45, safeIntensity * 0.35),
    mixBlendMode: 'overlay',
  };

  const merged = mergeProps({
    themeTarget: themeProps('holographic-foil-sheen', {
      preset,
      renderer,
      hovered: !disabled && hovered,
      disabled,
    }),
    baseClassName:
      'prism-slab prism-contain-box relative overflow-hidden rounded-2xl transition-transform duration-200 min-w-0 max-w-full',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div
      ref={mergedRef}
      {...rest}
      {...merged}
      onPointerEnter={handlePointerEnter}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        data-testid="holographic-foil-gl"
        data-renderer={renderer}
        className={`${FOIL_GL_CLASS} pointer-events-none absolute inset-0 h-full w-full z-10 ${
          renderer === 'webgl' ? 'opacity-80' : 'opacity-0'
        }`}
      />
      <div
        aria-hidden="true"
        data-testid="holographic-foil-sheen-layer"
        className={`${FOIL_SHEEN_CLASS} pointer-events-none absolute inset-0 z-10 transition-opacity duration-200`}
        style={sheenStyle}
      />
      <div className={`${FOIL_CONTENT_CLASS} relative z-20 min-w-0`}>{children}</div>
    </div>
  );
}

export const HolographicFoilSheen = /*#__PURE__*/ memoWithDisplayName(
  HolographicFoilSheenInner,
  'HolographicFoilSheen'
);
