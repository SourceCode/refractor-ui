import { parseColorToRgb, type RgbColor } from './colorMath';

/**
 * Optical Material Engine, Adaptive Luminance Sensing & Ambient Accent Extraction
 */

export type OpticalMaterialTier = 'wafer' | 'lens' | 'prism';
export type AdaptiveInkMode = 'light-ink' | 'dark-ink';

export interface OpticalMaterialGradeSpec {
  readonly tier: OpticalMaterialTier;
  readonly label: string;
  readonly ior: number;
  readonly blurPx: number;
  readonly thicknessPx: number;
  readonly dispersion: number;
  readonly tintOpacity: number;
  readonly specularStrength: number;
  readonly borderRadiusPx: number;
}

export const OPTICAL_MATERIAL_PRESETS: Readonly<Record<OpticalMaterialTier, OpticalMaterialGradeSpec>> =
  /*#__PURE__*/ Object.freeze({
    wafer: Object.freeze({
      tier: 'wafer',
      label: 'Wafer (Thin Frosted Overlay)',
      ior: 1.12,
      blurPx: 8,
      thicknessPx: 1,
      dispersion: 0.08,
      tintOpacity: 0.56,
      specularStrength: 0.25,
      borderRadiusPx: 12,
    }),
    lens: Object.freeze({
      tier: 'lens',
      label: 'Lens (Medium Refractive Card)',
      ior: 1.48,
      blurPx: 14,
      thicknessPx: 2,
      dispersion: 0.28,
      tintOpacity: 0.68,
      specularStrength: 0.55,
      borderRadiusPx: 18,
    }),
    prism: Object.freeze({
      tier: 'prism',
      label: 'Prism (Thick Beveled Dispersion)',
      ior: 1.78,
      blurPx: 20,
      thicknessPx: 3,
      dispersion: 0.64,
      tintOpacity: 0.78,
      specularStrength: 0.85,
      borderRadiusPx: 24,
    }),
  });

export interface AdaptiveContrastResult {
  readonly luminance: number;
  readonly inkMode: AdaptiveInkMode;
  readonly textColorVar: string;
  readonly mutedColorVar: string;
  readonly bevelOpacity: number;
}

export interface ExtractedAmbientAccents {
  readonly primaryRgb: string;
  readonly secondaryRgb: string;
  readonly primaryHex: string;
  readonly secondaryHex: string;
  readonly averageLuminance: number;
}

function srgbChannelToLinear(channel: number): number {
  const c = Math.min(255, Math.max(0, channel)) / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** Computes WCAG 2.1 relative luminance in [0..1] from an RGB color. */
export function computeRelativeLuminance(rgb: RgbColor): number {
  const r = srgbChannelToLinear(rgb.r);
  const g = srgbChannelToLinear(rgb.g);
  const b = srgbChannelToLinear(rgb.b);
  return Number((0.2126 * r + 0.7152 * g + 0.0722 * b).toFixed(4));
}

/**
 * Resolves whether foreground text/icons over a backdrop color should use
 * `'dark-ink'` (over bright surfaces) or `'light-ink'` (over dark surfaces).
 */
export function resolveAdaptiveInkMode(
  backdropColor: string,
  threshold = 0.42
): AdaptiveContrastResult {
  const parsed = parseColorToRgb(backdropColor);
  const luminance = parsed ? computeRelativeLuminance(parsed) : 0.85;
  const isBright = luminance >= threshold;
  return {
    luminance,
    inkMode: isBright ? 'dark-ink' : 'light-ink',
    textColorVar: isBright ? 'var(--prism-ink-dark, #0f172a)' : 'var(--prism-ink-light, #f8fafc)',
    mutedColorVar: isBright
      ? 'var(--prism-ink-dark-muted, rgba(15, 23, 42, 0.72))'
      : 'var(--prism-ink-light-muted, rgba(248, 250, 252, 0.76))',
    bevelOpacity: isBright ? 0.32 : 0.18,
  };
}

function rgbToHex(rgb: RgbColor): string {
  const toHex = (n: number) => Math.min(255, Math.max(0, Math.round(n))).toString(16).padStart(2, '0');
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

function saturationScore(rgb: RgbColor): number {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return 0;
  const l = (max + min) / 2;
  const sat = (max - min) / (1 - Math.abs(2 * l - 1));
  const midPenalty = 1 - Math.abs(l - 0.5) * 1.1;
  return sat * Math.max(0.2, midPenalty);
}

/**
 * Extracts primary and secondary ambient accents from a list of color swatches
 * or sampled RGBA pixel data (e.g. from a wallpaper canvas).
 */
export function extractDominantAccents(
  swatches: ReadonlyArray<string>
): ExtractedAmbientAccents {
  const parsed: RgbColor[] = [];
  for (const swatch of swatches) {
    const rgb = parseColorToRgb(swatch);
    if (rgb) parsed.push(rgb);
  }

  if (parsed.length === 0) {
    return {
      primaryRgb: '232, 93, 4',
      secondaryRgb: '56, 189, 248',
      primaryHex: '#e85d04',
      secondaryHex: '#38bdf8',
      averageLuminance: 0.45,
    };
  }

  const ranked = [...parsed].sort((a, b) => saturationScore(b) - saturationScore(a));
  const primary = ranked[0]!;
  const secondary = ranked.find((c) => {
    const dist =
      Math.abs(c.r - primary.r) + Math.abs(c.g - primary.g) + Math.abs(c.b - primary.b);
    return dist >= 60;
  }) ?? ranked[1] ?? primary;

  const avgLum =
    parsed.reduce((acc, c) => acc + computeRelativeLuminance(c), 0) / parsed.length;

  return {
    primaryRgb: `${Math.round(primary.r)}, ${Math.round(primary.g)}, ${Math.round(primary.b)}`,
    secondaryRgb: `${Math.round(secondary.r)}, ${Math.round(secondary.g)}, ${Math.round(secondary.b)}`,
    primaryHex: rgbToHex(primary),
    secondaryHex: rgbToHex(secondary),
    averageLuminance: Number(avgLum.toFixed(4)),
  };
}

/** Samples quantized RGB swatches from a flat RGBA Uint8ClampedArray (e.g. ImageData.data). */
export function sampleRgbaPixelsToAccents(
  rgbaData: Uint8ClampedArray,
  stride = 16
): ExtractedAmbientAccents {
  const safeStride = Math.max(1, Math.round(stride));
  const swatches: string[] = [];
  for (let i = 0; i + 3 < rgbaData.length; i += 4 * safeStride) {
    const a = rgbaData[i + 3] ?? 255;
    if (a < 128) continue;
    swatches.push(`rgb(${rgbaData[i]}, ${rgbaData[i + 1]}, ${rgbaData[i + 2]})`);
  }
  return extractDominantAccents(swatches);
}
