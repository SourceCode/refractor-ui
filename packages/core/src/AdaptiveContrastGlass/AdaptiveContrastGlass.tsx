'use client';

import { useMemo, type ReactNode } from 'react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { memoWithDisplayName } from '../utils/memo';
import { mergeProps } from '../utils/mergeProps';
import { resolveAdaptiveInkMode } from '../utils/opticalMaterial';
import { themeProps } from '../utils/themeProps';

export interface AdaptiveContrastGlassProps extends BaseProps<HTMLDivElement> {
  /** Sampled backdrop color (hex or rgb) sitting behind this translucent glass panel. */
  backdropColor?: string;
  /** Luminance threshold [0..1] where foreground ink flips between light and dark (default: 0.42). */
  luminanceThreshold?: number;
  /** Optional status readout showing live sampled luminance & ink polarity. */
  showTelemetry?: boolean;
  children?: ReactNode;
}

const ROOT_CLASS = /*#__PURE__*/ stableClassName('adaptive-contrast-glass');

function AdaptiveContrastGlassInner({
  backdropColor = '#f1f5f9',
  luminanceThreshold = 0.42,
  showTelemetry = false,
  className,
  style,
  xstyle,
  ref,
  children,
  ...rest
}: AdaptiveContrastGlassProps) {
  const override = useComponentOverride('AdaptiveContrastGlass');
  const adaptive = useMemo(
    () => resolveAdaptiveInkMode(backdropColor, luminanceThreshold),
    [backdropColor, luminanceThreshold]
  );

  const merged = mergeProps({
    themeTarget: themeProps('AdaptiveContrastGlass', {
      inkMode: adaptive.inkMode,
    }),
    baseClassName: `${ROOT_CLASS} prism-slab rounded-2xl p-4`,
    overrideClassName: override?.className,
    userClassName: className,
    baseStyle: {
      color: adaptive.textColorVar,
      '--prism-adaptive-ink': adaptive.textColorVar,
      '--prism-adaptive-muted': adaptive.mutedColorVar,
      '--prism-adaptive-bevel-opacity': String(adaptive.bevelOpacity),
    },
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div
      ref={ref}
      {...rest}
      {...merged}
      data-ink-mode={adaptive.inkMode}
      data-luminance={String(adaptive.luminance)}
    >
      {showTelemetry ? (
        <div
          className="mb-2 flex items-center justify-between text-[11px] font-mono"
          style={{ color: adaptive.mutedColorVar }}
        >
          <span>Ink: {adaptive.inkMode}</span>
          <span>L={adaptive.luminance.toFixed(2)}</span>
        </div>
      ) : null}
      {children}
    </div>
  );
}

export const AdaptiveContrastGlass = /*#__PURE__*/ memoWithDisplayName(AdaptiveContrastGlassInner, 'AdaptiveContrastGlass');
