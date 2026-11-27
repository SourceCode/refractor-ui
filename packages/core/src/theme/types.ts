import type { OpticalStyleTokens } from '../BaseProps';
import type { DerivedPaletteColor } from '../utils/colorMath';

export type ThemeMode = 'light' | 'dark';
export type RefractionIntensity = 'subtle' | 'standard' | 'vivid';
export type ThemePerformanceMode = 'balanced' | 'high' | 'max';
export type ThemeDensityMode = 'compact' | 'comfortable' | 'touch';

export type ThemeMaterial =
  | 'glass'
  | 'mica'
  | 'bevel'
  | 'brutalist'
  | 'neon'
  | 'crt'
  | 'neumorphic'
  | 'clay'
  | 'paper'
  | 'flat'
  | 'chrome'
  | 'pixel'
  | 'resin';

export type ThemeOverlayFx =
  | 'none'
  | 'noise'
  | 'scanlines'
  | 'cyber-grid'
  | 'retro-grid'
  | 'dot-matrix'
  | 'paper-grain'
  | 'crt-rgb'
  | 'hazard-stripes';

export type ThemeControlsLayout = 'left' | 'right';

export type ThemeCollectionCategory =
  | 'optical-glass'
  | 'classic-os'
  | 'modern-os'
  | 'cyber-neon'
  | 'retro-gaming'
  | 'tactile-material'
  | 'developer-ide'
  | 'nature-elements'
  | 'seasons';

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

export interface ThemeFxConfig {
  /** CSS background specification for full-viewport/stage desktop wallpaper. */
  wallpaper: string;
  /** Decorative non-interactive GPU-friendly FX overlay layer. */
  wallpaperOverlay: ThemeOverlayFx;
  /** Clamped overlay opacity in [0..0.4]. */
  overlayOpacity: number;
  /** Semantic glow color used by neon, crt, chrome, and resin materials. */
  glowColor: string;
  /** Clamped luminous glow multiplier in [0..1.5]. */
  glowIntensity: number;
  /** Clamped structural border stroke width in px [0..4]. */
  borderWidthPx: number;
  /** Primary window / panel surface background (solid, rgba, or gradient). */
  windowBg: string;
  /** Elevated card / inner control surface background. */
  surfaceBg: string;
  /** Highlighted / hovered surface tint. */
  surfaceHighlight: string;
  /** Structural window and panel outline color. */
  windowBorder: string;
  /** Window titlebar / desktop chrome background. */
  chromeBg: string;
  /** Window titlebar / desktop chrome foreground ink. */
  chromeText: string;
  /** Primary elevation / shadow CSS value for slabs and windows. */
  windowShadow: string;
  /** Secondary control / crystal card shadow CSS value. */
  controlShadow: string;
  /** Recessed input / well inset shadow CSS value. */
  wellShadow: string;
  /** Preferred OS traffic-light / window button alignment. */
  controlsLayout: ThemeControlsLayout;
  /** Clamped window titlebar height in px [24..48]. */
  titleBarHeightPx: number;
  /**
   * Enables adaptive Tailwind ink/surface cascade bridging so all 339 components
   * inherit non-glass palettes cleanly while keeping default optical glass pixel-identical.
   */
  adaptiveInk: boolean;
  /** Clamps rounded-lg..3xl component corners to the theme's sharp border radius. */
  sharpCorners: boolean;
}

export interface ThemeMotionConfig {
  durationFast: string;
  durationNormal: string;
  durationSlow: string;
  easingStandard: string;
  easingEmphasized: string;
}

export interface ThemeEditorColors {
  background: string;
  caret: string;
  comment: string;
  gutter: string;
  keyword: string;
  line: string;
  number: string;
  selection: string;
  selectionText: string;
  string: string;
  text: string;
}

export interface PrismTheme {
  name: string;
  displayName: string;
  description: string;
  category: ThemeCollectionCategory;
  material: ThemeMaterial;
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
    googleFonts: ReadonlyArray<string>;
    letterSpacing: string;
    h1: { fontSize: string; fontWeight: number; lineHeight: number };
    h2: { fontSize: string; fontWeight: number; lineHeight: number };
    body1: { fontSize: string; lineHeight: number };
    caption: { fontSize: string; lineHeight: number };
  };
  shape: {
    borderRadius: number;
    buttonRadius: number;
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
  fx: ThemeFxConfig;
  motion: ThemeMotionConfig;
  editor: ThemeEditorColors;
  components: ComponentOverridesMap;
  customTokens: Record<`--prism-${string}`, string>;
}

/**
 * Ergonomic theme customization input: pass only the tokens, materials, fonts, or FX you want to override.
 */
export interface PrismThemeOptions {
  name?: string;
  displayName?: string;
  description?: string;
  category?: ThemeCollectionCategory;
  material?: ThemeMaterial;
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
  fx?: Partial<ThemeFxConfig>;
  motion?: Partial<ThemeMotionConfig>;
  editor?: Partial<ThemeEditorColors>;
  components?: ComponentOverridesMap;
  customTokens?: Record<`--prism-${string}`, string>;
}

/**
 * Cascade theme definition supporting extends, [light, dark] token tuples,
 * palette shortcuts, material/FX configs, typography, and component overrides.
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
