import type { OpticalStyleTokens } from '../BaseProps';
import type { DerivedPaletteColor } from '../utils/colorMath';

export type ThemeMode = 'light' | 'dark';
export type RefractionIntensity = 'subtle' | 'standard' | 'vivid';

export interface PaletteColorInput {
  main: string;
  light?: string;
  dark?: string;
  contrastText?: string;
}

export interface ComponentStyleOverride {
  className?: string;
  style?: OpticalStyleTokens;
}

export type ComponentOverridesMap = Record<string, ComponentStyleOverride>;

export type ThemeTokenValue = string | readonly [string, string];
export type ThemeTokenMap = Record<`--prism-${string}`, ThemeTokenValue>;

export interface PrismTheme {
  name: string;
  palette: {
    mode: ThemeMode;
    primary: DerivedPaletteColor;
    secondary: DerivedPaletteColor;
    info: DerivedPaletteColor;
    success: DerivedPaletteColor;
    warning: DerivedPaletteColor;
    error: DerivedPaletteColor;
    background: {
      default: string;
      start: string;
      mid: string;
      end: string;
      paper: string;
      well: string;
    };
    text: {
      primary: string;
      secondary: string;
      disabled: string;
    };
    divider: string;
  };
  typography: {
    fontFamily: string;
    monoFamily: string;
    h1: { fontSize: string; fontWeight: number; lineHeight: number };
    h2: { fontSize: string; fontWeight: number; lineHeight: number };
    body1: { fontSize: string; lineHeight: number };
    caption: { fontSize: string; lineHeight: number };
  };
  shape: {
    borderRadius: number;
    pillRadius: number;
    slabRadius: number;
  };
  optics: {
    refraction: RefractionIntensity;
    blurPx: number;
    slabBlurPx: number;
    causticOpacity: number;
    specularOpacity: number;
    causticWarmRgb: string;
    causticCoolRgb: string;
    specularHighlight: boolean;
  };
  components: ComponentOverridesMap;
  customTokens: Record<`--prism-${string}`, string>;
}

/**
 * MUI-ergonomic theme customization input: pass only the tokens you want to override.
 * Example: createPrismTheme({ palette: { primary: { main: '#7C3AED' } } })
 */
export interface PrismThemeOptions {
  name?: string;
  palette?: {
    mode?: ThemeMode;
    primary?: PaletteColorInput;
    secondary?: PaletteColorInput;
    info?: PaletteColorInput;
    success?: PaletteColorInput;
    warning?: PaletteColorInput;
    error?: PaletteColorInput;
    background?: Partial<PrismTheme['palette']['background']>;
    text?: Partial<PrismTheme['palette']['text']>;
    divider?: string;
  };
  typography?: Partial<PrismTheme['typography']>;
  shape?: Partial<PrismTheme['shape']>;
  optics?: Partial<PrismTheme['optics']>;
  components?: ComponentOverridesMap;
  customTokens?: Record<`--prism-${string}`, string>;
}

/**
 * Astryx-style theme definition supporting extends, [light, dark] token tuples,
 * MUI palette inputs, optical physics overrides, and component overrides.
 */
export interface DefinePrismThemeInput extends PrismThemeOptions {
  name: string;
  extends?: DefinedPrismTheme;
  tokens?: ThemeTokenMap;
}

export interface DefinedPrismTheme {
  readonly __kind: 'DefinedPrismTheme';
  readonly name: string;
  readonly options: PrismThemeOptions;
  readonly tokens: ThemeTokenMap;
  readonly components: ComponentOverridesMap;
}
