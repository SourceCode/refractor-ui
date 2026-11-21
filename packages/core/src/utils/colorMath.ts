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

function clampChannel(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(255, Math.round(n)));
}

function toHexByte(n: number): string {
  return clampChannel(n).toString(16).padStart(2, '0');
}

/**
 * Parses #RGB, #RRGGBB, or rgb(r, g, b) strings into RgbColor.
 * Falls back cleanly to a deterministic neutral slate if input is malformed.
 */
export function parseColorToRgb(input: string, fallback: RgbColor = { r: 231, g: 92, b: 36 }): RgbColor {
  const trimmed = input.trim();
  const shortHex = /^#([0-9a-fA-F]{3})$/.exec(trimmed);
  if (shortHex && shortHex[1]) {
    const h = shortHex[1];
    return {
      r: parseInt(`${h[0]}${h[0]}`, 16),
      g: parseInt(`${h[1]}${h[1]}`, 16),
      b: parseInt(`${h[2]}${h[2]}`, 16),
    };
  }

  const fullHex = /^#([0-9a-fA-F]{6})(?:[0-9a-fA-F]{2})?$/.exec(trimmed);
  if (fullHex && fullHex[1]) {
    const h = fullHex[1];
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
    };
  }

  const rgbMatch = /^rgba?\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/.exec(
    trimmed
  );
  if (rgbMatch && rgbMatch[1] && rgbMatch[2] && rgbMatch[3]) {
    return {
      r: clampChannel(Number(rgbMatch[1])),
      g: clampChannel(Number(rgbMatch[2])),
      b: clampChannel(Number(rgbMatch[3])),
    };
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

export function lightenHex(hex: string, amount = 0.22): string {
  const base = parseColorToRgb(hex);
  return rgbToHex(mixRgb(base, { r: 255, g: 255, b: 255 }, amount));
}

export function darkenHex(hex: string, amount = 0.2): string {
  const base = parseColorToRgb(hex);
  return rgbToHex(mixRgb(base, { r: 10, g: 14, b: 22 }, amount));
}

function linearizeChannel(channel: number): number {
  const s = clampChannel(channel) / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

/** WCAG 2.2 relative luminance (0..1) */
export function getRelativeLuminance(rgb: RgbColor): number {
  return (
    0.2126 * linearizeChannel(rgb.r) +
    0.7152 * linearizeChannel(rgb.g) +
    0.0722 * linearizeChannel(rgb.b)
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
 * MUI-style automatic palette derivation from a single `main` color string,
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
  const lightHex = input.light ? rgbToHex(parseColorToRgb(input.light)) : lightenHex(normalizedMain, 0.24);
  const darkHex = input.dark ? rgbToHex(parseColorToRgb(input.dark)) : darkenHex(normalizedMain, 0.22);
  const contrastText = input.contrastText ?? getAccessibleContrastText(normalizedMain);

  return {
    main: normalizedMain,
    light: lightHex,
    dark: darkHex,
    contrastText,
    rgb: formatRgbTriplet(mainRgb),
    lightRgb: formatRgbTriplet(parseColorToRgb(lightHex)),
    darkRgb: formatRgbTriplet(parseColorToRgb(darkHex)),
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
