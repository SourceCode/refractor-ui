import { clampNumber } from '../utils/sanitize';
import { derivePaletteColor } from '../utils/colorMath';
import type {
  ComponentOverridesMap,
  PrismTheme,
  PrismThemeOptions,
  RefractionIntensity,
  ThemeMode,
} from './types';

function refractionToOpacity(refraction: RefractionIntensity): number {
  if (refraction === 'subtle') return 0.45;
  if (refraction === 'vivid') return 1.35;
  return 1;
}

function cloneComponentOverrides(
  overrides?: ComponentOverridesMap
): ComponentOverridesMap {
  const result: ComponentOverridesMap = {};
  if (!overrides) return result;
  for (const [k, v] of Object.entries(overrides)) {
    result[k] = {
      className: v.className,
      style: v.style ? { ...v.style } : undefined,
    };
  }
  return result;
}

/**
 * Creates a complete Refractor Optical Glass Theme.
 *
 * Supports BOTH:
 * 1. MUI-style ergonomic object configuration:
 *    `createPrismTheme({ palette: { mode: 'light', primary: { main: '#7C3AED' } }, shape: { borderRadius: 20 } })`
 * 2. Shorthand signature:
 *    `createPrismTheme('dark', 'vivid')`
 */
export function createPrismTheme(
  optionsOrMode: PrismThemeOptions | ThemeMode = 'light',
  refractionArg: RefractionIntensity = 'standard'
): PrismTheme {
  const options: PrismThemeOptions =
    typeof optionsOrMode === 'string'
      ? { palette: { mode: optionsOrMode }, optics: { refraction: refractionArg } }
      : optionsOrMode;

  const mode: ThemeMode = options.palette?.mode ?? 'light';
  const isDark = mode === 'dark';
  const refraction: RefractionIntensity = options.optics?.refraction ?? 'standard';

  const primary = derivePaletteColor(
    options.palette?.primary ?? {
      main: '#E75C24',
      light: '#F59C28',
      dark: '#C94114',
      contrastText: '#FFFFFF',
    }
  );

  const secondary = derivePaletteColor(
    options.palette?.secondary ?? {
      main: '#38BDF8',
      light: '#BAE6FD',
      dark: '#0284C7',
      contrastText: isDark ? '#F1F5F9' : '#151E2C',
    }
  );

  const info = derivePaletteColor(
    options.palette?.info ?? {
      main: '#1D4ED8',
      light: '#0EA5E9',
      dark: '#1E3A8A',
      contrastText: '#FFFFFF',
    }
  );

  const success = derivePaletteColor(
    options.palette?.success ?? {
      main: '#26BC92',
      light: '#5CE1B8',
      dark: '#159673',
      contrastText: '#FFFFFF',
    }
  );

  const warning = derivePaletteColor(
    options.palette?.warning ?? {
      main: '#EB9242',
      light: '#F7B977',
      dark: '#C26C21',
      contrastText: '#18202C',
    }
  );

  const error = derivePaletteColor(
    options.palette?.error ?? {
      main: '#DC2626',
      light: '#F87171',
      dark: '#991B1B',
      contrastText: '#FFFFFF',
    }
  );

  const blurPx = clampNumber(options.optics?.blurPx ?? 18, 0, 48, 18);
  const slabBlurPx = clampNumber(
    options.optics?.slabBlurPx ?? Math.min(48, blurPx + 4),
    0,
    48,
    22
  );
  const specularHighlight = options.optics?.specularHighlight ?? true;
  const specularOpacity = specularHighlight
    ? clampNumber(options.optics?.specularOpacity ?? 1, 0, 1.5, 1)
    : 0;
  const causticOpacity = clampNumber(
    options.optics?.causticOpacity ?? refractionToOpacity(refraction),
    0,
    2,
    1
  );

  return {
    name: options.name ?? (isDark ? 'obsidian' : 'alabaster'),
    palette: {
      mode,
      primary,
      secondary,
      info,
      success,
      warning,
      error,
      background: {
        default: options.palette?.background?.default ?? (isDark ? '#0D121A' : '#EAEDF2'),
        start: options.palette?.background?.start ?? (isDark ? '#0D121A' : '#F3F5F8'),
        mid: options.palette?.background?.mid ?? (isDark ? '#121924' : '#EAEDF2'),
        end: options.palette?.background?.end ?? (isDark ? '#0B1017' : '#E2E6ED'),
        paper:
          options.palette?.background?.paper ??
          (isDark ? 'rgba(28, 38, 54, 0.84)' : 'rgba(242, 246, 251, 0.78)'),
        well:
          options.palette?.background?.well ??
          (isDark ? 'rgba(13, 19, 29, 0.92)' : 'rgba(247, 249, 253, 0.94)'),
      },
      text: {
        primary: options.palette?.text?.primary ?? (isDark ? '#F1F5F9' : '#18202C'),
        secondary: options.palette?.text?.secondary ?? (isDark ? '#94A3B8' : '#4B586C'),
        disabled: options.palette?.text?.disabled ?? (isDark ? '#475569' : '#94A3B8'),
      },
      divider:
        options.palette?.divider ??
        (isDark ? 'rgba(148, 163, 184, 0.16)' : 'rgba(15, 23, 42, 0.08)'),
    },
    typography: {
      fontFamily:
        options.typography?.fontFamily ??
        '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif',
      monoFamily:
        options.typography?.monoFamily ??
        '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace',
      h1: options.typography?.h1 ?? { fontSize: '2.25rem', fontWeight: 700, lineHeight: 1.2 },
      h2: options.typography?.h2 ?? { fontSize: '1.5rem', fontWeight: 600, lineHeight: 1.3 },
      body1: options.typography?.body1 ?? { fontSize: '0.9375rem', lineHeight: 1.6 },
      caption: options.typography?.caption ?? { fontSize: '0.75rem', lineHeight: 1.4 },
    },
    shape: {
      borderRadius: clampNumber(options.shape?.borderRadius ?? 16, 0, 48, 16),
      pillRadius: clampNumber(options.shape?.pillRadius ?? 9999, 0, 9999, 9999),
      slabRadius: clampNumber(options.shape?.slabRadius ?? 24, 0, 48, 24),
    },
    optics: {
      refraction,
      blurPx,
      slabBlurPx,
      causticOpacity,
      specularOpacity,
      causticWarmRgb: options.optics?.causticWarmRgb ?? primary.lightRgb,
      causticCoolRgb: options.optics?.causticCoolRgb ?? secondary.rgb,
      specularHighlight,
    },
    components: cloneComponentOverrides(options.components),
    customTokens: options.customTokens ? { ...options.customTokens } : {},
  };
}

/**
 * Serializes a PrismTheme into a flat CSS custom property record for :root or scoped injection.
 */
export function themeToCssVariables(theme: PrismTheme): Record<`--prism-${string}`, string> {
  const { palette, typography, shape, optics, customTokens } = theme;

  return {
    '--prism-font-sans': typography.fontFamily,
    '--prism-font-mono': typography.monoFamily,

    '--prism-primary-main': palette.primary.main,
    '--prism-primary-light': palette.primary.light,
    '--prism-primary-dark': palette.primary.dark,
    '--prism-primary-contrast': palette.primary.contrastText,
    '--prism-primary-rgb': palette.primary.rgb,
    '--prism-primary-light-rgb': palette.primary.lightRgb,
    '--prism-primary-dark-rgb': palette.primary.darkRgb,

    '--prism-secondary-main': palette.secondary.main,
    '--prism-secondary-light': palette.secondary.light,
    '--prism-secondary-dark': palette.secondary.dark,
    '--prism-secondary-contrast': palette.secondary.contrastText,
    '--prism-secondary-rgb': palette.secondary.rgb,
    '--prism-secondary-light-rgb': palette.secondary.lightRgb,
    '--prism-secondary-dark-rgb': palette.secondary.darkRgb,

    '--prism-info-main': palette.info.main,
    '--prism-info-light': palette.info.light,
    '--prism-info-dark': palette.info.dark,
    '--prism-info-contrast': palette.info.contrastText,
    '--prism-info-rgb': palette.info.rgb,
    '--prism-info-light-rgb': palette.info.lightRgb,
    '--prism-info-dark-rgb': palette.info.darkRgb,

    '--prism-success-main': palette.success.main,
    '--prism-success-light': palette.success.light,
    '--prism-success-dark': palette.success.dark,
    '--prism-success-contrast': palette.success.contrastText,
    '--prism-success-rgb': palette.success.rgb,
    '--prism-success-dark-rgb': palette.success.darkRgb,

    '--prism-warning-main': palette.warning.main,
    '--prism-warning-contrast': palette.warning.contrastText,
    '--prism-warning-rgb': palette.warning.rgb,

    '--prism-error-main': palette.error.main,
    '--prism-error-contrast': palette.error.contrastText,
    '--prism-error-rgb': palette.error.rgb,

    '--prism-bg-start': palette.background.start,
    '--prism-bg-mid': palette.background.mid,
    '--prism-bg-end': palette.background.end,
    '--prism-text-primary': palette.text.primary,
    '--prism-text-secondary': palette.text.secondary,
    '--prism-text-disabled': palette.text.disabled,
    '--prism-divider': palette.divider,
    '--prism-focus-ring': palette.secondary.main,

    '--prism-caustic-opacity': String(optics.causticOpacity),
    '--prism-caustic-warm-rgb': optics.causticWarmRgb,
    '--prism-caustic-cool-rgb': optics.causticCoolRgb,
    '--prism-specular-opacity': String(optics.specularOpacity),
    '--prism-blur-px': `${optics.blurPx}px`,
    '--prism-slab-blur-px': `${optics.slabBlurPx}px`,

    '--prism-radius-control': `${shape.borderRadius}px`,
    '--prism-radius-pill': `${shape.pillRadius}px`,
    '--prism-radius-slab': `${shape.slabRadius}px`,

    ...customTokens,
  };
}
