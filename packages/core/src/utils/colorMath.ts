export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export interface HsvColor {
  h: number; // 0..360
  s: number; // 0..100
  v: number; // 0..100
}

export interface DerivedPaletteColor {
  main: string;
  light: string;
  dark: string;
  contrastText: string;
  rgb: string;
  lightRgb: string;
  darkRgb: string;
}

const DEFAULT_FALLBACK_RGB: RgbColor = Object.freeze({ r: 231, g: 92, b: 36 });
const SHORT_HEX_RE = /^#([0-9a-fA-F]{3})$/;
const FULL_HEX_RE = /^#([0-9a-fA-F]{6})(?:[0-9a-fA-F]{2})?$/;
const RGBA_RE = /^rgba?\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/;

const MAX_COLOR_CACHE_SIZE = 1024;
const parsedColorCache = new Map<string, RgbColor>();

/**
 * Precomputed 256-entry sRGB -> linear luminance LUT eliminating Math.pow calls
 * on WCAG contrast and relative luminance calculations.
 */
const SRGB_LINEAR_LUT = new Float64Array(256);
for (let i = 0; i < 256; i += 1) {
  const s = i / 255;
  SRGB_LINEAR_LUT[i] = s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function clampChannel(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(255, Math.round(n)));
}

function toHexByte(n: number): string {
  return clampChannel(n).toString(16).padStart(2, '0');
}

function hexNibble(code: number): number {
  if (code >= 48 && code <= 57) return code - 48; // 0-9
  if (code >= 65 && code <= 70) return code - 55; // A-F
  if (code >= 97 && code <= 102) return code - 87; // a-f
  return -1;
}

/**
 * Parses #RGB, #RRGGBB, #RRGGBBAA, or rgb(r, g, b) strings into RgbColor.
 * Uses a fast hex code-point path and bounded cache for zero-regex steady-state parsing.
 */
export function parseColorToRgb(input: string, fallback: RgbColor = DEFAULT_FALLBACK_RGB): RgbColor {
  const trimmed = input.trim();
  const cached = parsedColorCache.get(trimmed);
  if (cached !== undefined) {
    return cached;
  }

  let parsed: RgbColor | null = null;

  // Fast path for #RRGGBB / #RRGGBBAA without regex execution
  if (
    trimmed.charCodeAt(0) === 35 && // '#'
    (trimmed.length === 7 || trimmed.length === 9)
  ) {
    const rHi = hexNibble(trimmed.charCodeAt(1));
    const rLo = hexNibble(trimmed.charCodeAt(2));
    const gHi = hexNibble(trimmed.charCodeAt(3));
    const gLo = hexNibble(trimmed.charCodeAt(4));
    const bHi = hexNibble(trimmed.charCodeAt(5));
    const bLo = hexNibble(trimmed.charCodeAt(6));
    const alphaValid =
      trimmed.length === 7 ||
      (hexNibble(trimmed.charCodeAt(7)) >= 0 && hexNibble(trimmed.charCodeAt(8)) >= 0);

    if (rHi >= 0 && rLo >= 0 && gHi >= 0 && gLo >= 0 && bHi >= 0 && bLo >= 0 && alphaValid) {
      parsed = {
        r: (rHi << 4) | rLo,
        g: (gHi << 4) | gLo,
        b: (bHi << 4) | bLo,
      };
    }
  }

  if (parsed === null) {
    const shortHex = SHORT_HEX_RE.exec(trimmed);
    if (shortHex && shortHex[1]) {
      const h = shortHex[1];
      parsed = {
        r: parseInt(`${h[0]}${h[0]}`, 16),
        g: parseInt(`${h[1]}${h[1]}`, 16),
        b: parseInt(`${h[2]}${h[2]}`, 16),
      };
    }
  }

  if (parsed === null) {
    const fullHex = FULL_HEX_RE.exec(trimmed);
    if (fullHex && fullHex[1]) {
      const h = fullHex[1];
      parsed = {
        r: parseInt(h.slice(0, 2), 16),
        g: parseInt(h.slice(2, 4), 16),
        b: parseInt(h.slice(4, 6), 16),
      };
    }
  }

  if (parsed === null) {
    const rgbMatch = RGBA_RE.exec(trimmed);
    if (rgbMatch && rgbMatch[1] && rgbMatch[2] && rgbMatch[3]) {
      parsed = {
        r: clampChannel(Number(rgbMatch[1])),
        g: clampChannel(Number(rgbMatch[2])),
        b: clampChannel(Number(rgbMatch[3])),
      };
    }
  }

  if (parsed !== null) {
    if (parsedColorCache.size >= MAX_COLOR_CACHE_SIZE) {
      parsedColorCache.clear();
    }
    parsedColorCache.set(trimmed, parsed);
    return parsed;
  }

  return fallback;
}

export function rgbToHex(rgb: RgbColor): string {
  return `#${toHexByte(rgb.r)}${toHexByte(rgb.g)}${toHexByte(rgb.b)}`.toUpperCase();
}

export function formatRgbTriplet(rgb: RgbColor): string {
  return `${clampChannel(rgb.r)}, ${clampChannel(rgb.g)}, ${clampChannel(rgb.b)}`;
}

/**
 * Mixes two RGB colors linearly (amount 0..1 towards target).
 */
export function mixRgb(base: RgbColor, target: RgbColor, amount: number): RgbColor {
  const t = Number.isFinite(amount) ? Math.max(0, Math.min(1, amount)) : 0;
  return {
    r: clampChannel(base.r + (target.r - base.r) * t),
    g: clampChannel(base.g + (target.g - base.g) * t),
    b: clampChannel(base.b + (target.b - base.b) * t),
  };
}

const WHITE_RGB: RgbColor = Object.freeze({ r: 255, g: 255, b: 255 });
const DARK_INK_RGB: RgbColor = Object.freeze({ r: 10, g: 14, b: 22 });

export function lightenHex(hex: string, amount = 0.22): string {
  const base = parseColorToRgb(hex);
  return rgbToHex(mixRgb(base, WHITE_RGB, amount));
}

export function darkenHex(hex: string, amount = 0.2): string {
  const base = parseColorToRgb(hex);
  return rgbToHex(mixRgb(base, DARK_INK_RGB, amount));
}

/** WCAG 2.2 relative luminance (0..1) using precomputed sRGB LUT */
export function getRelativeLuminance(rgb: RgbColor): number {
  return (
    0.2126 * SRGB_LINEAR_LUT[clampChannel(rgb.r)]! +
    0.7152 * SRGB_LINEAR_LUT[clampChannel(rgb.g)]! +
    0.0722 * SRGB_LINEAR_LUT[clampChannel(rgb.b)]!
  );
}

/** WCAG 2.2 contrast ratio (1..21) */
export function getContrastRatio(colorA: string, colorB: string): number {
  const lumA = getRelativeLuminance(parseColorToRgb(colorA));
  const lumB = getRelativeLuminance(parseColorToRgb(colorB));
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Selects high-contrast foreground text (#FFFFFF or #151E2C) maximizing WCAG readability.
 */
export function getAccessibleContrastText(backgroundHex: string): string {
  const whiteRatio = getContrastRatio(backgroundHex, '#FFFFFF');
  const inkRatio = getContrastRatio(backgroundHex, '#151E2C');
  return whiteRatio >= inkRatio ? '#FFFFFF' : '#151E2C';
}

/**
 * Automatic palette derivation from a single `main` color string,
 * with optional explicit overrides for light, dark, and contrastText.
 */
export function derivePaletteColor(input: {
  main: string;
  light?: string;
  dark?: string;
  contrastText?: string;
}): DerivedPaletteColor {
  const mainRgb = parseColorToRgb(input.main);
  const normalizedMain = rgbToHex(mainRgb);
  const lightRgb = input.light
    ? parseColorToRgb(input.light)
    : mixRgb(mainRgb, WHITE_RGB, 0.24);
  const darkRgb = input.dark
    ? parseColorToRgb(input.dark)
    : mixRgb(mainRgb, DARK_INK_RGB, 0.22);
  const lightHex = rgbToHex(lightRgb);
  const darkHex = rgbToHex(darkRgb);
  const contrastText = input.contrastText ?? getAccessibleContrastText(normalizedMain);

  return {
    main: normalizedMain,
    light: lightHex,
    dark: darkHex,
    contrastText,
    rgb: formatRgbTriplet(mainRgb),
    lightRgb: formatRgbTriplet(lightRgb),
    darkRgb: formatRgbTriplet(darkRgb),
  };
}

export function hsvToRgb(hsv: HsvColor): RgbColor {
  const h = (((Number.isFinite(hsv.h) ? hsv.h : 0) % 360) + 360) % 360;
  const s = Math.max(0, Math.min(100, Number.isFinite(hsv.s) ? hsv.s : 0)) / 100;
  const v = Math.max(0, Math.min(100, Number.isFinite(hsv.v) ? hsv.v : 0)) / 100;

  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;

  let rPrime = 0;
  let gPrime = 0;
  let bPrime = 0;

  if (h < 60) {
    rPrime = c;
    gPrime = x;
  } else if (h < 120) {
    rPrime = x;
    gPrime = c;
  } else if (h < 180) {
    gPrime = c;
    bPrime = x;
  } else if (h < 240) {
    gPrime = x;
    bPrime = c;
  } else if (h < 300) {
    rPrime = x;
    bPrime = c;
  } else {
    rPrime = c;
    bPrime = x;
  }

  return {
    r: clampChannel((rPrime + m) * 255),
    g: clampChannel((gPrime + m) * 255),
    b: clampChannel((bPrime + m) * 255),
  };
}

export function rgbToHsv(rgb: RgbColor): HsvColor {
  const r = clampChannel(rgb.r) / 255;
  const g = clampChannel(rgb.g) / 255;
  const b = clampChannel(rgb.b) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === r) {
      h = 60 * (((g - b) / delta) % 6);
    } else if (max === g) {
      h = 60 * ((b - r) / delta + 2);
    } else {
      h = 60 * ((r - g) / delta + 4);
    }
  }
  if (h < 0) h += 360;

  const s = max === 0 ? 0 : (delta / max) * 100;
  const v = max * 100;

  return {
    h: Math.round(h),
    s: Math.round(s),
    v: Math.round(v),
  };
}

export function hsvToHex(hsv: HsvColor): string {
  return rgbToHex(hsvToRgb(hsv));
}

export function hexToHsv(hex: string): HsvColor {
  return rgbToHsv(parseColorToRgb(hex));
}
