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
import { clampFinite } from '../utils/webglShader';

export type IridescentRimSpectrum = 'dichroic' | 'prism' | 'arctic' | 'amber-rose';

export interface IridescentRimSurfaceProps extends BaseProps<HTMLDivElement> {
  /** Rim-light intensity [0..1]. */
  intensity?: number;
  /** Specular dichroic color temperature spectrum. */
  spectrum?: IridescentRimSpectrum;
  /** Enables deviceorientation beta/gamma tilt reaction on mobile/tablet devices. */
  enableTilt?: boolean;
  /** Renders elevated optical glass surface backing. */
  elevated?: boolean;
  /** Disables dynamic rim angle shifts. */
  disabled?: boolean;
  /** Surface content framed by the iridescent rim light. */
  children?: ReactNode;
}

const RIM_BORDER_CLASS = /*#__PURE__*/ stableClassName('iridescent-rim-surface', 'rim');
const RIM_SPECULAR_CLASS = /*#__PURE__*/ stableClassName('iridescent-rim-surface', 'specular');
const RIM_CONTENT_CLASS = /*#__PURE__*/ stableClassName('iridescent-rim-surface', 'content');

const RIM_GRADIENTS: Readonly<Record<IridescentRimSpectrum, string>> = /*#__PURE__*/ Object.freeze({
  dichroic:
    'conic-gradient(from var(--prism-rim-angle, 125deg) at 50% 50%, var(--prism-secondary-main), var(--prism-info-main), var(--prism-primary-main), var(--prism-success-main), var(--prism-secondary-main))',
  prism:
    'conic-gradient(from var(--prism-rim-angle, 125deg) at 50% 50%, var(--prism-primary-main), var(--prism-warning-main), var(--prism-secondary-main), var(--prism-primary-main))',
  arctic:
    'conic-gradient(from var(--prism-rim-angle, 125deg) at 50% 50%, var(--prism-secondary-main), var(--prism-info-main), var(--prism-success-main), var(--prism-secondary-main))',
  'amber-rose':
    'conic-gradient(from var(--prism-rim-angle, 125deg) at 50% 50%, var(--prism-warning-main), var(--prism-primary-main), var(--prism-error-main), var(--prism-warning-main))',
});

function IridescentRimSurfaceInner({
  intensity = 0.85,
  spectrum = 'dichroic',
  enableTilt = false,
  elevated = true,
  disabled = false,
  children,
  className,
  style,
  xstyle,
  ref,
  onPointerMove,
  ...rest
}: IridescentRimSurfaceProps) {
  const override = useComponentOverride('IridescentRimSurface');
  const hostRef = useRef<HTMLDivElement | null>(null);
  const mergedRef = useMergedRefs(ref, hostRef);
  const safeIntensity = clampFinite(intensity, 0, 1, 0.85);

  const commitAngle = useRafCallback((deg: number, pxPct: number, pyPct: number) => {
    const el = hostRef.current;
    if (!el) return;
    el.style.setProperty('--prism-rim-angle', `${Math.round(deg)}deg`);
    el.style.setProperty('--prism-rim-x', `${Math.round(pxPct)}%`);
    el.style.setProperty('--prism-rim-y', `${Math.round(pyPct)}%`);
  });

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      onPointerMove?.(event);
      if (disabled) return;
      const el = hostRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const angle = (Math.atan2(event.clientY - cy, event.clientX - cx) * 180) / Math.PI + 90;
      const pxPct = clampFinite(((event.clientX - rect.left) / Math.max(1, rect.width)) * 100, 0, 100, 50);
      const pyPct = clampFinite(((event.clientY - rect.top) / Math.max(1, rect.height)) * 100, 0, 100, 50);
      commitAngle(angle, pxPct, pyPct);
    },
    [commitAngle, disabled, onPointerMove]
  );

  useEffect(() => {
    if (!enableTilt || disabled || typeof window === 'undefined') return undefined;
    const onOrientation = (event: DeviceOrientationEvent) => {
      const gamma = clampFinite(event.gamma ?? 0, -45, 45, 0);
      const beta = clampFinite(event.beta ?? 0, -45, 45, 0);
      const deg = 125 + gamma * 2.4 + beta * 1.1;
      const px = clampFinite(50 + gamma, 5, 95, 50);
      const py = clampFinite(50 + beta, 5, 95, 50);
      commitAngle(deg, px, py);
    };
    window.addEventListener('deviceorientation', onOrientation, { passive: true });
    return () => {
      window.removeEventListener('deviceorientation', onOrientation);
      commitAngle.cancel();
    };
  }, [commitAngle, disabled, enableTilt]);

  const rimStyle: CSSProperties = {
    background: RIM_GRADIENTS[spectrum],
    opacity: disabled ? 0.2 : safeIntensity,
    WebkitMask: 'linear-gradient(currentColor 0 0) content-box, linear-gradient(currentColor 0 0)',
    WebkitMaskComposite: 'xor',
    maskComposite: 'exclude',
  };

  const specularStyle: CSSProperties = {
    background:
      'radial-gradient(180px circle at var(--prism-rim-x, 30%) var(--prism-rim-y, 20%), rgba(255, 255, 255, 0.28), transparent 70%)',
    opacity: disabled ? 0 : safeIntensity * 0.75,
  };

  const merged = mergeProps({
    themeTarget: themeProps('iridescent-rim-surface', {
      spectrum,
      elevated,
      enableTilt,
      disabled,
    }),
    baseClassName: `${elevated ? 'prism-slab' : 'prism-well'} prism-contain-leaf relative overflow-hidden rounded-2xl min-w-0 max-w-full`,
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div ref={mergedRef} {...rest} {...merged} onPointerMove={handlePointerMove}>
      <div
        aria-hidden="true"
        data-testid="iridescent-rim-surface-rim"
        className={`${RIM_BORDER_CLASS} pointer-events-none absolute inset-0 z-10 rounded-[inherit] p-[1.5px]`}
        style={rimStyle}
      />
      <div
        aria-hidden="true"
        data-testid="iridescent-rim-surface-specular"
        className={`${RIM_SPECULAR_CLASS} pointer-events-none absolute inset-0 z-0`}
        style={specularStyle}
      />
      <div className={`${RIM_CONTENT_CLASS} relative z-10 min-w-0`}>{children}</div>
    </div>
  );
}

export const IridescentRimSurface = /*#__PURE__*/ memoWithDisplayName(
  IridescentRimSurfaceInner,
  'IridescentRimSurface'
);
