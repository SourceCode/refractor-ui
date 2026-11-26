'use client';

import { useCallback, useState, type CSSProperties, type FocusEvent, type ReactNode } from 'react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { memoWithDisplayName } from '../utils/memo';
import { mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';
import { clampFinite } from '../utils/webglShader';

export type AiFocusRingPalette = 'ai-spectrum' | 'cobalt-amber' | 'emerald-cyan' | 'rose-violet';

export interface AiFocusRingProps extends BaseProps<HTMLDivElement> {
  /** Forces the orbiting border active even when not focused. */
  active?: boolean;
  /** Accelerates orbital rotation and intensifies outer glow while AI is processing. */
  processing?: boolean;
  /** Multi-hue conic gradient spectrum preset. */
  palette?: AiFocusRingPalette;
  /** Perimeter ring thickness in pixels (clamped 1–6). */
  thicknessPx?: number;
  /** Orbital rotation duration in seconds (clamped 0.8–12). */
  speedSeconds?: number;
  /** Tailwind border-radius utility shared by outer ring and inner surface. */
  radiusClassName?: string;
  /** Disables the orbiting ring effect. */
  disabled?: boolean;
  /** Wrapped prompt input, agent card, or focusable panel. */
  children?: ReactNode;
}

const RING_TRACK_CLASS = /*#__PURE__*/ stableClassName('ai-focus-ring', 'track');
const RING_GLOW_CLASS = /*#__PURE__*/ stableClassName('ai-focus-ring', 'glow');
const RING_INNER_CLASS = /*#__PURE__*/ stableClassName('ai-focus-ring', 'inner');

const PALETTE_CONIC: Readonly<Record<AiFocusRingPalette, string>> = /*#__PURE__*/ Object.freeze({
  'ai-spectrum':
    'conic-gradient(from 0deg, var(--prism-secondary-main), var(--prism-info-main), var(--prism-primary-main), var(--prism-warning-main), var(--prism-secondary-main))',
  'cobalt-amber':
    'conic-gradient(from 0deg, var(--prism-info-main), var(--prism-secondary-main), var(--prism-primary-main), var(--prism-warning-main), var(--prism-info-main))',
  'emerald-cyan':
    'conic-gradient(from 0deg, var(--prism-success-main), var(--prism-secondary-main), var(--prism-info-main), var(--prism-success-main))',
  'rose-violet':
    'conic-gradient(from 0deg, var(--prism-error-main), var(--prism-primary-main), var(--prism-info-main), var(--prism-error-main))',
});

function AiFocusRingInner({
  active = false,
  processing = false,
  palette = 'ai-spectrum',
  thicknessPx = 2,
  speedSeconds = 3.2,
  radiusClassName = 'rounded-2xl',
  disabled = false,
  children,
  className,
  style,
  xstyle,
  ref,
  onFocus,
  onBlur,
  ...rest
}: AiFocusRingProps) {
  const override = useComponentOverride('AiFocusRing');
  const [focusWithin, setFocusWithin] = useState(false);

  const isVisible = !disabled && (active || processing || focusWithin);
  const safeThickness = clampFinite(thicknessPx, 1, 6, 2);
  const baseDuration = clampFinite(speedSeconds, 0.8, 12, 3.2);
  const effectiveDuration = processing ? Math.max(0.8, baseDuration * 0.55) : baseDuration;

  const handleFocus = useCallback(
    (event: FocusEvent<HTMLDivElement>) => {
      onFocus?.(event);
      if (!disabled) setFocusWithin(true);
    },
    [disabled, onFocus]
  );

  const handleBlur = useCallback(
    (event: FocusEvent<HTMLDivElement>) => {
      onBlur?.(event);
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
        setFocusWithin(false);
      }
    },
    [onBlur]
  );

  const ringStyle: CSSProperties = {
    background: PALETTE_CONIC[palette],
    '--prism-fx-duration': `${effectiveDuration}s`,
  } as CSSProperties;

  const framePaddingStyle: CSSProperties = {
    padding: `${safeThickness}px`,
  };

  const merged = mergeProps({
    themeTarget: themeProps('ai-focus-ring', {
      active: isVisible,
      processing,
      palette,
      disabled,
    }),
    baseClassName: `prism-contain-leaf relative ${radiusClassName} min-w-0 max-w-full`,
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle: { ...framePaddingStyle, ...xstyle },
    userStyle: style,
  });

  return (
    <div
      ref={ref}
      data-busy={processing ? 'true' : undefined}
      {...rest}
      {...merged}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      {/* Ambient outer bloom */}
      <div
        aria-hidden="true"
        data-testid="ai-focus-ring-glow"
        className={`${RING_GLOW_CLASS} pointer-events-none absolute -inset-1 ${radiusClassName} overflow-hidden blur-md transition-opacity duration-300 ${
          isVisible ? (processing ? 'opacity-65' : 'opacity-35') : 'opacity-0'
        }`}
      >
        <div className="prism-fx-orbit-ring" style={ringStyle} />
      </div>

      {/* Crisp orbiting border perimeter */}
      <div
        aria-hidden="true"
        data-testid="ai-focus-ring-track"
        className={`${RING_TRACK_CLASS} pointer-events-none absolute inset-0 ${radiusClassName} overflow-hidden transition-opacity duration-200 ${
          isVisible ? 'opacity-100' : 'opacity-25'
        }`}
      >
        <div className="prism-fx-orbit-ring" style={ringStyle} />
      </div>

      {/* Inner glass content */}
      <div
        className={`${RING_INNER_CLASS} relative z-10 ${radiusClassName} bg-white/90 dark:bg-slate-950/90 min-w-0 overflow-hidden`}
      >
        {children}
      </div>
    </div>
  );
}

export const AiFocusRing = /*#__PURE__*/ memoWithDisplayName(AiFocusRingInner, 'AiFocusRing');
