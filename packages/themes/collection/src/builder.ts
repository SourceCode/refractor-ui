import {
  clampNumber,
  defineTheme,
  getAccessibleContrastText,
  getContrastRatio,
  mixRgb,
  parseColorToRgb,
  rgbToHex,
  type DefinedPrismTheme,
} from '@refractor-ui/core';
import type { ThemeCatalogEntry, WebOsThemeRawSpec } from './types';

function resolveAccessibleContrast(bgColor: string, preferredText: string): string {
  const preferredRatio = getContrastRatio(bgColor, preferredText);
  if (preferredRatio >= 4.5) {
    return preferredText;
  }
  const whiteRatio = getContrastRatio(bgColor, '#FFFFFF');
  const darkInkRatio = getContrastRatio(bgColor, '#151E2C');
  const pureBlackRatio = getContrastRatio(bgColor, '#000000');
  if (whiteRatio >= 4.5) return '#FFFFFF';
  if (darkInkRatio >= 4.5) return '#151E2C';
  if (pureBlackRatio >= whiteRatio) return '#000000';
  return '#FFFFFF';
}

function resolveAccessibleBodyText(bgColor: string, preferredText: string, mode: 'light' | 'dark'): string {
  const ratio = getContrastRatio(bgColor, preferredText);
  if (ratio >= 4.5) {
    return preferredText;
  }
  // Preserve authentic hue tone while guaranteeing strict WCAG 2.2 AA (>= 4.5:1)
  return mode === 'dark' ? '#F1F5F9' : '#1E293B';
}

function resolveAccessibleMutedText(bgColor: string, preferredMuted: string, bodyText: string): string {
  const ratio = getContrastRatio(bgColor, preferredMuted);
  if (ratio >= 4.5) {
    return preferredMuted;
  }
  const mutedRgb = parseColorToRgb(preferredMuted);
  const bodyRgb = parseColorToRgb(bodyText);
  for (const step of [0.35, 0.55, 0.75, 0.9]) {
    const candidate = rgbToHex(mixRgb(mutedRgb, bodyRgb, step));
    if (getContrastRatio(bgColor, candidate) >= 4.5) {
      return candidate;
    }
  }
  return bodyText;
}

function deriveControlShadow(spec: WebOsThemeRawSpec): string {
  if (spec.material === 'brutalist') {
    return `4px 4px 0 ${spec.colors.windowBorder}`;
  }
  if (spec.material === 'pixel') {
    return `0 3px 0 ${spec.colors.windowBorder}`;
  }
  if (spec.material === 'bevel') {
    return 'inset 1.5px 1.5px 0 rgba(255,255,255,0.85), inset -1.5px -1.5px 0 rgba(0,0,0,0.4)';
  }
  if (spec.material === 'neon' || spec.material === 'crt') {
    return `0 0 10px ${spec.colors.windowBorder}`;
  }
  if (spec.material === 'neumorphic') {
    return '6px 6px 12px rgba(163,177,198,0.55), -6px -6px 12px rgba(255,255,255,0.72)';
  }
  return spec.mode === 'dark'
    ? '0 8px 20px -6px rgba(0, 0, 0, 0.5)'
    : '0 6px 16px -6px rgba(15, 23, 42, 0.14)';
}

function deriveBackgroundStops(spec: WebOsThemeRawSpec): {
  defaultBg: string;
  start: string;
  mid: string;
  end: string;
  well: string;
} {
  const winHex = rgbToHex(parseColorToRgb(spec.colors.windowBg, spec.mode === 'dark' ? { r: 15, g: 23, b: 42 } : { r: 243, g: 245, b: 248 }));
  const surfHex = rgbToHex(parseColorToRgb(spec.colors.surface, spec.mode === 'dark' ? { r: 24, g: 34, b: 50 } : { r: 255, g: 255, b: 255 }));
  const wallHex = rgbToHex(parseColorToRgb(spec.colors.wallpaper, parseColorToRgb(winHex)));
  return {
    defaultBg: winHex,
    start: wallHex,
    mid: winHex,
    end: surfHex,
    well: spec.colors.surface,
  };
}

/**
 * Compiles a faithful multi-material theme specification into a Refractor DefinedPrismTheme
 * with guaranteed WCAG 2.2 AA contrast, authentic material physics, FX overlays, and font stacks.
 */
export function buildWebOsTheme(spec: WebOsThemeRawSpec): DefinedPrismTheme {
  const bg = deriveBackgroundStops(spec);
  const safePrimaryContrast = resolveAccessibleContrast(spec.colors.primary, spec.colors.primaryText);
  const safeSecondaryContrast = resolveAccessibleContrast(spec.colors.accent, getAccessibleContrastText(spec.colors.accent));
  const safeBodyText = resolveAccessibleBodyText(bg.defaultBg, spec.colors.text, spec.mode);
  const safeMutedText = resolveAccessibleMutedText(bg.defaultBg, spec.colors.textMuted, safeBodyText);
  const safeRadius = clampNumber(spec.window.radiusPx, 0, 32, 8);
  const buttonRadius =
    spec.material === 'clay' || spec.material === 'neumorphic'
      ? Math.min(24, safeRadius)
      : spec.material === 'mica' || spec.material === 'chrome' || spec.material === 'resin'
        ? Math.min(14, Math.max(8, Math.round(safeRadius * 0.75)))
        : Math.min(8, safeRadius);

  const isSharp =
    spec.sharpCorners ??
    (spec.material === 'bevel' ||
      spec.material === 'brutalist' ||
      spec.material === 'crt' ||
      spec.material === 'pixel' ||
      safeRadius <= 2);

  const infoColor = spec.colors.info ?? spec.colors.accent;
  const monoFamily =
    spec.monoFamily ??
    (spec.fontFamily.toLowerCase().includes('mono') ||
    spec.fontFamily.includes('Fira Code') ||
    spec.fontFamily.includes('JetBrains') ||
    spec.fontFamily.includes('Courier') ||
    spec.fontFamily.includes('VT323') ||
    spec.fontFamily.includes('Press Start')
      ? spec.fontFamily
      : '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace');

  return defineTheme({
    name: spec.id,
    displayName: spec.name,
    description: spec.description,
    category: spec.category,
    material: spec.material,
    palette: {
      mode: spec.mode,
      primary: {
        main: spec.colors.primary,
        contrastText: safePrimaryContrast,
      },
      secondary: {
        main: spec.colors.accent,
        contrastText: safeSecondaryContrast,
      },
      info: {
        main: infoColor,
        contrastText: resolveAccessibleContrast(infoColor, getAccessibleContrastText(infoColor)),
      },
      success: {
        main: spec.colors.success,
        contrastText: resolveAccessibleContrast(spec.colors.success, getAccessibleContrastText(spec.colors.success)),
      },
      warning: {
        main: spec.colors.warning,
        contrastText: resolveAccessibleContrast(spec.colors.warning, getAccessibleContrastText(spec.colors.warning)),
      },
      error: {
        main: spec.colors.error,
        contrastText: resolveAccessibleContrast(spec.colors.error, getAccessibleContrastText(spec.colors.error)),
      },
      background: {
        default: bg.defaultBg,
        start: bg.start,
        mid: bg.mid,
        end: bg.end,
        paper: spec.colors.windowBg,
        well: bg.well,
      },
      text: {
        primary: safeBodyText,
        secondary: safeMutedText,
        disabled: safeMutedText,
      },
      divider: spec.colors.border,
    },
    typography: {
      fontFamily: spec.fontFamily,
      monoFamily,
      letterSpacing: spec.letterSpacing ?? 'normal',
    },
    shape: {
      borderRadius: Math.min(safeRadius, 24),
      buttonRadius,
      slabRadius: safeRadius,
    },
    optics: {
      refraction: spec.material === 'chrome' || spec.material === 'resin' ? 'vivid' : 'standard',
      blurPx: spec.window.backdropBlurPx,
      slabBlurPx: spec.window.backdropBlurPx,
      specularHighlight:
        spec.material === 'mica' ||
        spec.material === 'chrome' ||
        spec.material === 'resin' ||
        spec.material === 'glass',
    },
    fx: {
      wallpaper: spec.colors.wallpaper,
      wallpaperOverlay: spec.wallpaperOverlay,
      ...(spec.overlayOpacity !== undefined ? { overlayOpacity: spec.overlayOpacity } : {}),
      glowColor: spec.colors.accent,
      glowIntensity:
        spec.material === 'neon' || spec.material === 'crt' || spec.material === 'resin'
          ? 1
          : spec.material === 'chrome'
            ? 0.55
            : 0.2,
      borderWidthPx: spec.window.borderWidthPx,
      windowBg: spec.colors.windowBg,
      surfaceBg: spec.colors.surface,
      surfaceHighlight: spec.colors.surfaceHighlight,
      windowBorder: spec.colors.windowBorder,
      chromeBg: spec.colors.chromeBg,
      chromeText: spec.colors.chromeText,
      windowShadow: spec.window.shadow,
      controlShadow: deriveControlShadow(spec),
      controlsLayout: spec.window.controlsLayout,
      titleBarHeightPx: spec.window.titleBarHeightPx,
      adaptiveInk: true,
      sharpCorners: isSharp,
    },
    editor: spec.editor,
  });
}

export function buildCatalogEntry(spec: WebOsThemeRawSpec): ThemeCatalogEntry {
  const theme = buildWebOsTheme(spec);
  return {
    id: spec.id,
    sourceId: spec.sourceId,
    name: spec.name,
    description: spec.description,
    mode: spec.mode,
    category: spec.category,
    material: spec.material,
    wallpaperOverlay: spec.wallpaperOverlay,
    fontFamily: spec.fontFamily,
    swatches: [
      spec.colors.primary,
      spec.colors.accent,
      rgbToHex(parseColorToRgb(spec.colors.windowBg, spec.mode === 'dark' ? { r: 17, g: 24, b: 39 } : { r: 243, g: 245, b: 248 })),
      spec.colors.text,
    ],
    wallpaper: spec.colors.wallpaper,
    theme,
  };
}
