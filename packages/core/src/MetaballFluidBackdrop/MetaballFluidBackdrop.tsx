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

export interface MetaballFluidBackdropProps extends BaseProps<HTMLDivElement> {
  /** Number of merging fluid optical orbs rendered (clamped 2–5). */
  orbCount?: number;
  /** Metaball glow intensity [0..1.5]. */
  intensity?: number;
  /** Organic fluid motion speed multiplier (clamped 0.2–2.5). */
  speed?: number;
  /** Enables live organic orb attraction toward pointer coordinates. */
  interactive?: boolean;
  /** Enables continuous metaball fluid motion. */
  animated?: boolean;
  /** Forces pure CSS blurred-orb fallback without WebGL canvas. */
  disableWebGL?: boolean;
  /** Frosted glass controls rendered over the metaball fluid backdrop. */
  children?: ReactNode;
}

const META_GL_CLASS = /*#__PURE__*/ stableClassName('metaball-fluid-backdrop', 'gl');
const META_ORBS_CLASS = /*#__PURE__*/ stableClassName('metaball-fluid-backdrop', 'orbs');
const META_CONTENT_CLASS = /*#__PURE__*/ stableClassName('metaball-fluid-backdrop', 'content');

interface FallbackOrbSpec {
  id: string;
  positionClass: string;
  motionClass: string;
  bg: string;
}

const FALLBACK_ORBS: ReadonlyArray<FallbackOrbSpec> = /*#__PURE__*/ Object.freeze([
  {
    id: 'orb-0',
    positionClass: 'top-4 left-6 w-36 h-36',
    motionClass: 'prism-fx-metaball-a',
    bg: 'radial-gradient(circle, rgba(var(--prism-secondary-rgb), 0.72) 0%, transparent 72%)',
  },
  {
    id: 'orb-1',
    positionClass: 'bottom-4 right-8 w-40 h-40',
    motionClass: 'prism-fx-metaball-b',
    bg: 'radial-gradient(circle, rgba(var(--prism-primary-rgb), 0.68) 0%, transparent 72%)',
  },
  {
    id: 'orb-2',
    positionClass: 'top-1/3 left-1/2 -translate-x-1/2 w-32 h-32',
    motionClass: 'prism-fx-metaball-a',
    bg: 'radial-gradient(circle, rgba(var(--prism-info-rgb), 0.64) 0%, transparent 72%)',
  },
  {
    id: 'orb-3',
    positionClass: 'bottom-8 left-1/4 w-28 h-28',
    motionClass: 'prism-fx-metaball-b',
    bg: 'radial-gradient(circle, rgba(var(--prism-success-rgb), 0.56) 0%, transparent 72%)',
  },
  {
    id: 'orb-4',
    positionClass: 'top-6 right-1/4 w-28 h-28',
    motionClass: 'prism-fx-metaball-a',
    bg: 'radial-gradient(circle, rgba(var(--prism-warning-rgb), 0.56) 0%, transparent 72%)',
  },
]);

function MetaballFluidBackdropInner({
  orbCount = 3,
  intensity = 0.85,
  speed = 1.0,
  interactive = true,
  animated = true,
  disableWebGL = false,
  children,
  className,
  style,
  xstyle,
  ref,
  onPointerMove,
  ...rest
}: MetaballFluidBackdropProps) {
  const override = useComponentOverride('MetaballFluidBackdrop');
  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mergedRef = useMergedRefs(ref, hostRef);

  const safeOrbs = Math.round(clampFinite(orbCount, 2, 5, 3));
  const safeIntensity = clampFinite(intensity, 0, 1.5, 0.85);
  const safeSpeed = clampFinite(speed, 0.2, 2.5, 1.0);

  const { renderer, updateUniforms } = useOpticalShader(canvasRef, {
    kind: 'metaball-fluid',
    animated,
    disableWebGL,
    initialUniforms: {
      intensity: safeIntensity,
      speed: safeSpeed,
      paramA: safeOrbs / 3,
    },
  });

  useEffect(() => {
    updateUniforms({
      intensity: safeIntensity,
      speed: safeSpeed,
      paramA: safeOrbs / 3,
    });
  }, [safeIntensity, safeOrbs, safeSpeed, updateUniforms]);

  const commitPointer = useRafCallback((nx: number, ny: number) => {
    updateUniforms({ pointerX: nx, pointerY: ny });
  });

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      onPointerMove?.(event);
      if (!interactive) return;
      const el = hostRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      commitPointer(
        clampFinite((event.clientX - rect.left) / Math.max(1, rect.width), 0, 1, 0.5),
        clampFinite((event.clientY - rect.top) / Math.max(1, rect.height), 0, 1, 0.5)
      );
    },
    [commitPointer, interactive, onPointerMove]
  );

  const durationSec = Math.max(4, Math.round(10 / safeSpeed));
  const visibleOrbs = FALLBACK_ORBS.slice(0, safeOrbs);

  const merged = mergeProps({
    themeTarget: themeProps('metaball-fluid-backdrop', {
      renderer,
      animated,
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
      data-orb-count={safeOrbs}
      {...rest}
      {...merged}
      onPointerMove={handlePointerMove}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        data-testid="metaball-fluid-gl"
        data-renderer={renderer}
        className={`${META_GL_CLASS} pointer-events-none absolute inset-0 h-full w-full z-0 ${
          renderer === 'webgl' ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <div
        aria-hidden="true"
        data-testid="metaball-fluid-orbs"
        className={`${META_ORBS_CLASS} pointer-events-none absolute inset-0 z-0 blur-2xl`}
        style={{ opacity: Math.min(1, safeIntensity * 0.85) }}
      >
        {visibleOrbs.map((orb) => {
          const orbStyle: CSSProperties = {
            background: orb.bg,
            '--prism-fx-duration': `${durationSec}s`,
          } as CSSProperties;
          return (
            <div
              key={orb.id}
              data-testid="metaball-fluid-orb"
              className={`absolute rounded-full ${orb.positionClass} ${
                animated ? orb.motionClass : ''
              }`}
              style={orbStyle}
            />
          );
        })}
      </div>
      <div className={`${META_CONTENT_CLASS} relative z-10 min-w-0`}>{children}</div>
    </div>
  );
}

export const MetaballFluidBackdrop = /*#__PURE__*/ memoWithDisplayName(
  MetaballFluidBackdropInner,
  'MetaballFluidBackdrop'
);
