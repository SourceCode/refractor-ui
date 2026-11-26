'use client';

import type { CSSProperties, ReactNode } from 'react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { memoWithDisplayName } from '../utils/memo';
import { mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';
import { clampFinite } from '../utils/webglShader';

export type AmbientAuraTone = 'prism' | 'ai-violet' | 'emerald' | 'amber' | 'critical';
export type AmbientAuraElevation = 'sm' | 'md' | 'lg';

export interface AmbientAuraBleedProps extends BaseProps<HTMLDivElement> {
  /** Optical tone driving the ambient floor glow beneath the card or control. */
  tone?: AmbientAuraTone;
  /** Bloom opacity intensity [0..1.5]. */
  intensity?: number;
  /** Perceived antigravity lift & bloom offset. */
  elevation?: AmbientAuraElevation;
  /** Enables subtle breathing drift animation (paused under reduced-motion/max perf). */
  breathing?: boolean;
  /** Toggles aura visibility cleanly without unmounting children. */
  active?: boolean;
  /** Elevated optical card or AI control wrapped by the ambient aura. */
  children?: ReactNode;
}

const AURA_BLOOM_CLASS = /*#__PURE__*/ stableClassName('ambient-aura-bleed', 'bloom');
const AURA_CONTENT_CLASS = /*#__PURE__*/ stableClassName('ambient-aura-bleed', 'content');

const TONE_GRADIENTS: Readonly<Record<AmbientAuraTone, string>> = /*#__PURE__*/ Object.freeze({
  prism:
    'radial-gradient(ellipse at center, rgba(var(--prism-primary-rgb), 0.44) 0%, rgba(var(--prism-secondary-rgb), 0.34) 48%, transparent 74%)',
  'ai-violet':
    'radial-gradient(ellipse at center, rgba(var(--prism-info-rgb), 0.46) 0%, rgba(var(--prism-secondary-rgb), 0.34) 48%, transparent 74%)',
  emerald:
    'radial-gradient(ellipse at center, rgba(var(--prism-success-rgb), 0.46) 0%, rgba(var(--prism-secondary-rgb), 0.28) 50%, transparent 74%)',
  amber:
    'radial-gradient(ellipse at center, rgba(var(--prism-warning-rgb), 0.48) 0%, rgba(var(--prism-primary-rgb), 0.32) 48%, transparent 74%)',
  critical:
    'radial-gradient(ellipse at center, rgba(var(--prism-error-rgb), 0.48) 0%, rgba(var(--prism-warning-rgb), 0.28) 48%, transparent 74%)',
});

const ELEVATION_CLASSES: Readonly<Record<AmbientAuraElevation, string>> =
  /*#__PURE__*/ Object.freeze({
    sm: 'inset-x-4 -bottom-2 h-8',
    md: 'inset-x-3 -bottom-3.5 h-12',
    lg: 'inset-x-2 -bottom-5 h-16',
  });

function AmbientAuraBleedInner({
  tone = 'prism',
  intensity = 0.78,
  elevation = 'md',
  breathing = true,
  active = true,
  children,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: AmbientAuraBleedProps) {
  const override = useComponentOverride('AmbientAuraBleed');
  const safeIntensity = clampFinite(intensity, 0, 1.5, 0.78);

  const bloomStyle: CSSProperties = {
    background: TONE_GRADIENTS[tone],
    opacity: active ? Math.min(1, safeIntensity) : 0,
  };

  const merged = mergeProps({
    themeTarget: themeProps('ambient-aura-bleed', { tone, elevation, breathing, active }),
    baseClassName: 'prism-contain-leaf relative isolate min-w-0 max-w-full',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div ref={ref} {...rest} {...merged}>
      <div
        aria-hidden="true"
        data-testid="ambient-aura-bleed-bloom"
        className={`${AURA_BLOOM_CLASS} pointer-events-none absolute -z-10 rounded-full transition-opacity duration-300 ${
          ELEVATION_CLASSES[elevation]
        } ${breathing ? 'prism-fx-aura-layer' : 'blur-xl'}`}
        style={bloomStyle}
      />
      <div className={`${AURA_CONTENT_CLASS} relative z-10 min-w-0`}>{children}</div>
    </div>
  );
}

export const AmbientAuraBleed = /*#__PURE__*/ memoWithDisplayName(
  AmbientAuraBleedInner,
  'AmbientAuraBleed'
);
