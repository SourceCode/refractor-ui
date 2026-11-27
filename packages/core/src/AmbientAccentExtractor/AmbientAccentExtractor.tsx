'use client';

import { useEffect, useMemo, type ReactNode } from 'react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { memoWithDisplayName } from '../utils/memo';
import { mergeProps } from '../utils/mergeProps';
import {
  extractDominantAccents,
  type ExtractedAmbientAccents,
} from '../utils/opticalMaterial';
import { STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export interface AmbientAccentExtractorProps extends BaseProps<HTMLDivElement> {
  /** Palette swatches sampled from the active desktop wallpaper or brand asset. */
  wallpaperSwatches: ReadonlyArray<string>;
  /** Optional label for the active wallpaper source. */
  sourceLabel?: string;
  /** Callback fired whenever extracted primary/secondary accents update. */
  onAccentsExtracted?: (accents: ExtractedAmbientAccents) => void;
  children?: ReactNode;
}

const ROOT_CLASS = /*#__PURE__*/ stableClassName('ambient-accent-extractor');

function AmbientAccentExtractorInner({
  wallpaperSwatches,
  sourceLabel = 'Ambient Wallpaper',
  onAccentsExtracted,
  className,
  style,
  xstyle,
  ref,
  children,
  ...rest
}: AmbientAccentExtractorProps) {
  const override = useComponentOverride('AmbientAccentExtractor');
  const accents = useMemo(
    () => extractDominantAccents(wallpaperSwatches),
    [wallpaperSwatches]
  );

  useEffect(() => {
    onAccentsExtracted?.(accents);
  }, [accents, onAccentsExtracted]);

  const merged = mergeProps({
    themeTarget: themeProps('AmbientAccentExtractor'),
    baseClassName: `${ROOT_CLASS} prism-slab rounded-2xl p-4`,
    overrideClassName: override?.className,
    userClassName: className,
    baseStyle: {
      '--prism-primary-rgb': accents.primaryRgb,
      '--prism-secondary-rgb': accents.secondaryRgb,
      '--prism-primary': accents.primaryHex,
      '--prism-secondary': accents.secondaryHex,
      boxShadow: `0 0 0 1px rgba(${accents.primaryRgb}, 0.28), 0 12px 32px rgba(${accents.secondaryRgb}, 0.14)`,
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
      data-primary-accent={accents.primaryHex}
      data-secondary-accent={accents.secondaryHex}
    >
      <div className="mb-2 flex items-center justify-between gap-2 text-xs">
        <span className="font-semibold" style={STYLE_TEXT_PRIMARY}>
          {sourceLabel}
        </span>
        <span className="font-mono text-[11px]" style={STYLE_TEXT_SECONDARY}>
          {accents.primaryHex} · {accents.secondaryHex}
        </span>
      </div>
      {children}
    </div>
  );
}

export const AmbientAccentExtractor = /*#__PURE__*/ memoWithDisplayName(AmbientAccentExtractorInner, 'AmbientAccentExtractor');
