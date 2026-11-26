'use client';

import {
  useCallback,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
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
import { clampFinite } from '../utils/webglShader';

export type CursorHaloSpectrum = 'prismatic' | 'aurora' | 'solar' | 'emerald';

export interface PrismaticCursorHaloProps extends BaseProps<HTMLDivElement> {
  /** Radial spotlight diameter radius in pixels (clamped 80–520). */
  radiusPx?: number;
  /** Maximum spotlight intensity from 0 to 1. */
  intensity?: number;
  /** Semantic token color spectrum used for the radial halo. */
  spectrum?: CursorHaloSpectrum;
  /** Illuminates the outer glass border perimeter near the pointer. */
  borderGlow?: boolean;
  /** Disables cursor tracking and spotlight illumination. */
  disabled?: boolean;
  /** Workspace or card content illuminated by the cursor halo. */
  children?: ReactNode;
}

const HALO_OVERLAY_CLASS = /*#__PURE__*/ stableClassName('prismatic-cursor-halo', 'spotlight');
const HALO_BORDER_CLASS = /*#__PURE__*/ stableClassName('prismatic-cursor-halo', 'border-glow');
const HALO_CONTENT_CLASS = /*#__PURE__*/ stableClassName('prismatic-cursor-halo', 'content');

const SPECTRUM_GRADIENTS: Readonly<Record<CursorHaloSpectrum, string>> = /*#__PURE__*/ Object.freeze({
  prismatic:
    'radial-gradient(var(--prism-halo-r, 240px) circle at var(--prism-halo-x, 50%) var(--prism-halo-y, 50%), rgba(var(--prism-secondary-rgb), 0.34), rgba(var(--prism-primary-rgb), 0.22) 42%, transparent 72%)',
  aurora:
    'radial-gradient(var(--prism-halo-r, 240px) circle at var(--prism-halo-x, 50%) var(--prism-halo-y, 50%), rgba(var(--prism-info-rgb), 0.36), rgba(var(--prism-success-rgb), 0.22) 46%, transparent 74%)',
  solar:
    'radial-gradient(var(--prism-halo-r, 240px) circle at var(--prism-halo-x, 50%) var(--prism-halo-y, 50%), rgba(var(--prism-primary-rgb), 0.38), rgba(var(--prism-warning-rgb), 0.24) 45%, transparent 74%)',
  emerald:
    'radial-gradient(var(--prism-halo-r, 240px) circle at var(--prism-halo-x, 50%) var(--prism-halo-y, 50%), rgba(var(--prism-success-rgb), 0.36), rgba(var(--prism-secondary-rgb), 0.2) 46%, transparent 74%)',
});

function PrismaticCursorHaloInner({
  radiusPx = 240,
  intensity = 0.78,
  spectrum = 'prismatic',
  borderGlow = true,
  disabled = false,
  children,
  className,
  style,
  xstyle,
  ref,
  onPointerMove,
  onPointerEnter,
  onPointerLeave,
  onFocus,
  onBlur,
  ...rest
}: PrismaticCursorHaloProps) {
  const override = useComponentOverride('PrismaticCursorHalo');
  const hostRef = useRef<HTMLDivElement | null>(null);
  const mergedRef = useMergedRefs(ref, hostRef);
  const [engaged, setEngaged] = useState(false);

  const safeRadius = clampFinite(radiusPx, 80, 520, 240);
  const safeIntensity = clampFinite(intensity, 0, 1, 0.78);

  const commitCoords = useRafCallback((x: number, y: number) => {
    const el = hostRef.current;
    if (!el) return;
    el.style.setProperty('--prism-halo-x', `${Math.round(x)}px`);
    el.style.setProperty('--prism-halo-y', `${Math.round(y)}px`);
  });

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      onPointerMove?.(event);
      if (disabled) return;
      const el = hostRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      commitCoords(event.clientX - rect.left, event.clientY - rect.top);
    },
    [commitCoords, disabled, onPointerMove]
  );

  const handlePointerEnter = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      onPointerEnter?.(event);
      if (disabled) return;
      const el = hostRef.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        commitCoords(event.clientX - rect.left, event.clientY - rect.top);
      }
      setEngaged(true);
    },
    [commitCoords, disabled, onPointerEnter]
  );

  const handlePointerLeave = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      onPointerLeave?.(event);
      commitCoords.cancel();
      setEngaged(false);
    },
    [commitCoords, onPointerLeave]
  );

  const handleFocus = useCallback(
    (event: FocusEvent<HTMLDivElement>) => {
      onFocus?.(event);
      if (disabled) return;
      const el = hostRef.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        el.style.setProperty('--prism-halo-x', `${Math.round((rect.width || 240) / 2)}px`);
        el.style.setProperty('--prism-halo-y', `${Math.round((rect.height || 120) / 2)}px`);
      }
      setEngaged(true);
    },
    [disabled, onFocus]
  );

  const handleBlur = useCallback(
    (event: FocusEvent<HTMLDivElement>) => {
      onBlur?.(event);
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
        setEngaged(false);
      }
    },
    [onBlur]
  );

  const rootVars: CSSProperties = {
    '--prism-halo-r': `${safeRadius}px`,
  } as CSSProperties;

  const haloStyle: CSSProperties = {
    background: SPECTRUM_GRADIENTS[spectrum],
    opacity: !disabled && engaged ? safeIntensity : 0,
  };

  const borderStyle: CSSProperties = {
    background: SPECTRUM_GRADIENTS[spectrum],
    opacity: !disabled && engaged ? Math.min(1, safeIntensity * 1.15) : 0,
    WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
    WebkitMaskComposite: 'xor',
    maskComposite: 'exclude',
  };

  const merged = mergeProps({
    themeTarget: themeProps('prismatic-cursor-halo', {
      spectrum,
      engaged: !disabled && engaged,
      disabled,
    }),
    baseClassName:
      'prism-slab prism-contain-leaf relative overflow-hidden rounded-2xl min-w-0 max-w-full',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle: { ...rootVars, ...xstyle },
    userStyle: style,
  });

  return (
    <div
      ref={mergedRef}
      {...rest}
      {...merged}
      onPointerMove={handlePointerMove}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      <div
        aria-hidden="true"
        data-testid="prismatic-cursor-halo-spotlight"
        className={`${HALO_OVERLAY_CLASS} pointer-events-none absolute inset-0 z-0 transition-opacity duration-200`}
        style={haloStyle}
      />
      {borderGlow ? (
        <div
          aria-hidden="true"
          data-testid="prismatic-cursor-halo-border"
          className={`${HALO_BORDER_CLASS} pointer-events-none absolute inset-0 z-0 rounded-[inherit] p-[1.5px] transition-opacity duration-200`}
          style={borderStyle}
        />
      ) : null}
      <div className={`${HALO_CONTENT_CLASS} relative z-10 min-w-0`}>{children}</div>
    </div>
  );
}

export const PrismaticCursorHalo = /*#__PURE__*/ memoWithDisplayName(
  PrismaticCursorHaloInner,
  'PrismaticCursorHalo'
);
