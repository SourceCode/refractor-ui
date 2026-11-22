import { clampNumber } from '../utils/sanitize';
import { derivePaletteColor, formatRgbTriplet, parseColorToRgb } from '../utils/colorMath';
import { extractGoogleFontsFromStack } from './fonts';
import type {
  ComponentOverridesMap,
  PrismTheme,
  PrismThemeOptions,
  RefractionIntensity,
  ThemeCollectionCategory,
  ThemeEditorColors,
  ThemeFxConfig,
  ThemeMaterial,
  ThemeMode,
  ThemeMotionConfig,
  ThemeOverlayFx,
} from './types';

const VALID_MATERIALS = new Set<ThemeMaterial>([
  'glass',
  'mica',
  'bevel',
  'brutalist',
  'neon',
  'crt',
  'neumorphic',
  'clay',
  'paper',
  'flat',
  'chrome',
  'pixel',
  'resin',
]);

const VALID_OVERLAYS = new Set<ThemeOverlayFx>([
  'none',
  'noise',
  'scanlines',
  'cyber-grid',
  'retro-grid',
  'dot-matrix',
  'paper-grain',
  'crt-rgb',
  'hazard-stripes',
]);

function normalizeMaterial(material?: ThemeMaterial): ThemeMaterial {
  if (material && VALID_MATERIALS.has(material)) return material;
  return 'glass';
}

function normalizeOverlay(overlay?: ThemeOverlayFx): ThemeOverlayFx {
  if (overlay && VALID_OVERLAYS.has(overlay)) return overlay;
  return 'none';
}

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

function defaultMaterialBlurPx(material: ThemeMaterial): number {
  switch (material) {
    case 'glass':
    case 'mica':
    case 'resin':
      return 18;
    case 'chrome':
      return 14;
    case 'neon':
      return 4;
    default:
      return 0;
  }
}

function defaultOverlayOpacity(overlay: ThemeOverlayFx): number {
  switch (overlay) {
    case 'none':
      return 0;
    case 'noise':
      return 0.04;
    case 'paper-grain':
      return 0.06;
    case 'dot-matrix':
      return 0.12;
    case 'scanlines':
    case 'crt-rgb':
      return 0.16;
    case 'cyber-grid':
    case 'retro-grid':
      return 0.18;
    case 'hazard-stripes':
      return 0.14;
  }
}

function isSharpMaterial(material: ThemeMaterial): boolean {
  return (
    material === 'bevel' ||
    material === 'brutalist' ||
    material === 'crt' ||
    material === 'pixel'
  );
}

/**
 * Creates a complete Refractor Multi-Material & Optical Glass Theme.
 *
 * Supports BOTH:
 * 1. Ergonomic object configuration:
 *    `createPrismTheme({ material: 'neon', palette: { mode: 'dark', primary: { main: '#00F0FF' } } })`
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
  const material = normalizeMaterial(options.material);
  const refraction: RefractionIntensity = options.optics?.refraction ?? 'standard';
  const name = options.name ?? (isDark ? 'obsidian' : 'alabaster');
  const displayName = options.displayName ?? name;
  const description = options.description ?? '';
  const category: ThemeCollectionCategory = options.category ?? 'optical-glass';

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

  const defaultBlur = defaultMaterialBlurPx(material);
  const blurPx = clampNumber(options.optics?.blurPx ?? defaultBlur, 0, 48, defaultBlur);
  const slabBlurPx = clampNumber(
    options.optics?.slabBlurPx ?? (blurPx > 0 ? Math.min(48, blurPx + 4) : 0),
    0,
    48,
    blurPx > 0 ? Math.min(48, blurPx + 4) : 0
  );
  const defaultSpecular =
    material === 'glass' || material === 'mica' || material === 'chrome' || material === 'resin';
  const specularHighlight = options.optics?.specularHighlight ?? defaultSpecular;
  const specularOpacity = specularHighlight
    ? clampNumber(options.optics?.specularOpacity ?? 1, 0, 1.5, 1)
    : 0;
  const causticOpacity = clampNumber(
    options.optics?.causticOpacity ??
      (material === 'glass' ? refractionToOpacity(refraction) : defaultSpecular ? 0.65 : 0),
    0,
    2,
    material === 'glass' ? 1 : 0
  );

  const bgStart = options.palette?.background?.start ?? (isDark ? '#0D121A' : '#F3F5F8');
  const bgMid = options.palette?.background?.mid ?? (isDark ? '#121924' : '#EAEDF2');
  const bgEnd = options.palette?.background?.end ?? (isDark ? '#0B1017' : '#E2E6ED');
  const bgDefault = options.palette?.background?.default ?? bgMid;
  const bgPaper =
    options.palette?.background?.paper ??
    (isDark ? 'rgba(28, 38, 54, 0.84)' : 'rgba(242, 246, 251, 0.78)');
  const bgWell =
    options.palette?.background?.well ??
    (isDark ? 'rgba(13, 19, 29, 0.92)' : 'rgba(247, 249, 253, 0.94)');

  const textPrimary = options.palette?.text?.primary ?? (isDark ? '#F1F5F9' : '#18202C');
  const textSecondary = options.palette?.text?.secondary ?? (isDark ? '#94A3B8' : '#4B586C');
  const textDisabled = options.palette?.text?.disabled ?? (isDark ? '#475569' : '#94A3B8');
  const divider =
    options.palette?.divider ??
    (isDark ? 'rgba(148, 163, 184, 0.16)' : 'rgba(15, 23, 42, 0.08)');

  const borderRadius = clampNumber(options.shape?.borderRadius ?? 16, 0, 48, 16);
  const pillRadius = clampNumber(options.shape?.pillRadius ?? 9999, 0, 9999, 9999);
  const slabRadius = clampNumber(options.shape?.slabRadius ?? 24, 0, 48, 24);
  const buttonRadius = clampNumber(
    options.shape?.buttonRadius ?? (material === 'glass' ? pillRadius : borderRadius),
    0,
    9999,
    material === 'glass' ? pillRadius : borderRadius
  );

  const fontFamily =
    options.typography?.fontFamily ??
    '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif';
  const monoFamily =
    options.typography?.monoFamily ??
    '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace';
  const googleFonts: ReadonlyArray<string> =
    options.typography?.googleFonts ??
    Array.from(
      new Set([
        ...extractGoogleFontsFromStack(fontFamily),
        ...extractGoogleFontsFromStack(monoFamily),
      ])
    );
  const letterSpacing = options.typography?.letterSpacing ?? 'normal';

  const wallpaperOverlay = normalizeOverlay(options.fx?.wallpaperOverlay);
  const defaultWall = `linear-gradient(145deg, ${bgStart} 0%, ${bgMid} 48%, ${bgEnd} 100%)`;

  const fx: ThemeFxConfig = {
    wallpaper: options.fx?.wallpaper ?? defaultWall,
    wallpaperOverlay,
    overlayOpacity: clampNumber(
      options.fx?.overlayOpacity ?? defaultOverlayOpacity(wallpaperOverlay),
      0,
      0.4,
      defaultOverlayOpacity(wallpaperOverlay)
    ),
    glowColor: options.fx?.glowColor ?? primary.main,
    glowIntensity: clampNumber(
      options.fx?.glowIntensity ??
        (material === 'neon' || material === 'crt' || material === 'resin' ? 1 : 0.4),
      0,
      1.5,
      0.4
    ),
    borderWidthPx: clampNumber(
      options.fx?.borderWidthPx ?? (material === 'brutalist' ? 3 : material === 'bevel' ? 2 : 1),
      0,
      4,
      1
    ),
    windowBg: options.fx?.windowBg ?? bgPaper,
    surfaceBg: options.fx?.surfaceBg ?? bgPaper,
    surfaceHighlight: options.fx?.surfaceHighlight ?? bgWell,
    windowBorder: options.fx?.windowBorder ?? divider,
    chromeBg: options.fx?.chromeBg ?? bgPaper,
    chromeText: options.fx?.chromeText ?? textPrimary,
    windowShadow:
      options.fx?.windowShadow ??
      (isDark
        ? '0 18px 36px -10px rgba(0, 0, 0, 0.65)'
        : '0 18px 32px -10px rgba(30, 41, 59, 0.24)'),
    controlShadow:
      options.fx?.controlShadow ??
      (isDark
        ? '0 10px 20px -6px rgba(0, 0, 0, 0.55)'
        : '0 10px 22px -6px rgba(30, 41, 59, 0.2)'),
    wellShadow:
      options.fx?.wellShadow ??
      (isDark
        ? 'inset 0 2px 4px rgba(0, 0, 0, 0.45)'
        : 'inset 0 2px 4px rgba(15, 23, 42, 0.07)'),
    controlsLayout: options.fx?.controlsLayout ?? 'right',
    titleBarHeightPx: clampNumber(options.fx?.titleBarHeightPx ?? 36, 24, 48, 36),
    adaptiveInk: options.fx?.adaptiveInk ?? material !== 'glass',
    sharpCorners: options.fx?.sharpCorners ?? isSharpMaterial(material),
  };

  const motion: ThemeMotionConfig = {
    durationFast: options.motion?.durationFast ?? '120ms',
    durationNormal: options.motion?.durationNormal ?? '220ms',
    durationSlow: options.motion?.durationSlow ?? '360ms',
    easingStandard: options.motion?.easingStandard ?? 'cubic-bezier(0.2, 0, 0, 1)',
    easingEmphasized: options.motion?.easingEmphasized ?? 'cubic-bezier(0.16, 1, 0.3, 1)',
  };

  const editor: ThemeEditorColors = {
    background: options.editor?.background ?? bgWell,
    caret: options.editor?.caret ?? primary.main,
    comment: options.editor?.comment ?? textSecondary,
    gutter: options.editor?.gutter ?? bgDefault,
    keyword: options.editor?.keyword ?? primary.main,
    line: options.editor?.line ?? divider,
    number: options.editor?.number ?? warning.main,
    selection: options.editor?.selection ?? secondary.light,
    selectionText: options.editor?.selectionText ?? textPrimary,
    string: options.editor?.string ?? success.main,
    text: options.editor?.text ?? textPrimary,
  };

  return {
    name,
    displayName,
    description,
    category,
    material,
    palette: {
      mode,
      primary,
      secondary,
      info,
      success,
      warning,
      error,
      background: {
        default: bgDefault,
        start: bgStart,
        mid: bgMid,
        end: bgEnd,
        paper: bgPaper,
        well: bgWell,
      },
      text: {
        primary: textPrimary,
        secondary: textSecondary,
        disabled: textDisabled,
      },
      divider,
    },
    typography: {
      fontFamily,
      monoFamily,
      googleFonts,
      letterSpacing,
      h1: options.typography?.h1 ?? { fontSize: '2.25rem', fontWeight: 700, lineHeight: 1.2 },
      h2: options.typography?.h2 ?? { fontSize: '1.5rem', fontWeight: 600, lineHeight: 1.3 },
      body1: options.typography?.body1 ?? { fontSize: '0.9375rem', lineHeight: 1.6 },
      caption: options.typography?.caption ?? { fontSize: '0.75rem', lineHeight: 1.4 },
    },
    shape: {
      borderRadius,
      buttonRadius,
      pillRadius,
      slabRadius,
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
    fx,
    motion,
    editor,
    components: cloneComponentOverrides(options.components),
    customTokens: options.customTokens ? { ...options.customTokens } : {},
  };
}

/**
 * Serializes a PrismTheme into a flat CSS custom property record for :root or scoped injection.
 */
export function themeToCssVariables(theme: PrismTheme): Record<`--prism-${string}`, string> {
  const { palette, typography, shape, optics, fx, motion, editor, customTokens } = theme;
  const glowRgb = formatRgbTriplet(parseColorToRgb(fx.glowColor));
  const isAdaptive = fx.adaptiveInk;

  const baseVars: Record<`--prism-${string}`, string> = {
    '--prism-font-sans': typography.fontFamily,
    '--prism-font-mono': typography.monoFamily,
    '--prism-letter-spacing': typography.letterSpacing,

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
    '--prism-radius-btn': `${shape.buttonRadius}px`,
    '--prism-radius-pill': `${shape.pillRadius}px`,
    '--prism-radius-slab': `${shape.slabRadius}px`,

    '--prism-border-width': `${fx.borderWidthPx}px`,
    '--prism-wallpaper': fx.wallpaper,
    '--prism-fx-opacity': String(fx.overlayOpacity),
    '--prism-glow-color': fx.glowColor,
    '--prism-glow-rgb': glowRgb,
    '--prism-glow-intensity': String(fx.glowIntensity),
    '--prism-window-bg': fx.windowBg,
    '--prism-surface-bg': fx.surfaceBg,
    '--prism-surface-highlight': fx.surfaceHighlight,
    '--prism-window-border': fx.windowBorder,
    '--prism-chrome-bg': fx.chromeBg,
    '--prism-chrome-text': fx.chromeText,
    '--prism-window-shadow': fx.windowShadow,
    '--prism-control-shadow': fx.controlShadow,
    '--prism-well-shadow': fx.wellShadow,
    '--prism-titlebar-height': `${fx.titleBarHeightPx}px`,

    '--prism-motion-fast': motion.durationFast,
    '--prism-motion-normal': motion.durationNormal,
    '--prism-motion-slow': motion.durationSlow,
    '--prism-easing-standard': motion.easingStandard,
    '--prism-easing-emphasized': motion.easingEmphasized,

    '--prism-editor-bg': editor.background,
    '--prism-editor-caret': editor.caret,
    '--prism-editor-comment': editor.comment,
    '--prism-editor-gutter': editor.gutter,
    '--prism-editor-keyword': editor.keyword,
    '--prism-editor-line': editor.line,
    '--prism-editor-number': editor.number,
    '--prism-editor-selection': editor.selection,
    '--prism-editor-selection-text': editor.selectionText,
    '--prism-editor-string': editor.string,
    '--prism-editor-text': editor.text,
  };

  if (isAdaptive) {
    baseVars['--prism-slab-top'] = fx.windowBg;
    baseVars['--prism-slab-bottom'] = fx.windowBg;
    baseVars['--prism-crystal-top'] = fx.surfaceBg;
    baseVars['--prism-crystal-mid'] = fx.surfaceBg;
    baseVars['--prism-crystal-bottom'] = fx.surfaceHighlight;
    baseVars['--prism-well-start'] = palette.background.well;
    baseVars['--prism-well-end'] = palette.background.well;
    baseVars['--prism-well-border'] = fx.windowBorder;
  }

  return {
    ...baseVars,
    ...customTokens,
  };
}
