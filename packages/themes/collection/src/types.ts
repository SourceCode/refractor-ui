import type {
  DefinedPrismTheme,
  ThemeCollectionCategory,
  ThemeControlsLayout,
  ThemeEditorColors,
  ThemeMaterial,
  ThemeMode,
  ThemeOverlayFx,
} from '@refractor-ui/core';

export type OpticalPresetThemeId =
  | 'alabaster'
  | 'obsidian'
  | 'amethyst'
  | 'emerald-tide'
  | 'solar-prism';

export type WebOsThemeId =
  | 'adwaita'
  | 'akira-neo-tokyo'
  | 'amiga'
  | 'beos'
  | 'blade-runner-neon'
  | 'brutalist-web'
  | 'cyberpunk'
  | 'darkmode'
  | 'dreamcast-swirl'
  | 'e-ink-notebook'
  | 'element-air'
  | 'element-earth'
  | 'element-ether'
  | 'element-fire'
  | 'element-water'
  | 'gameboy-classic'
  | 'gamecube-purple'
  | 'glowing-resin'
  | 'hacker'
  | 'industrial-warning'
  | 'ios17-frost'
  | 'liquid-metal'
  | 'macos'
  | 'material'
  | 'memphis-milano'
  | 'midnight'
  | 'mint'
  | 'monokai'
  | 'mpc-beat-machine'
  | 'neon-dreams'
  | 'neumorphism'
  | 'nord'
  | 'obsidian-stone'
  | 'ocean'
  | 'one-dark-pro'
  | 'outrun'
  | 'paper-cutout'
  | 'ps5-orbit'
  | 'season-autumn'
  | 'season-spring'
  | 'season-summer'
  | 'season-winter'
  | 'sega-genesis'
  | 'sega-saturn'
  | 'snes-classic'
  | 'soft-clay-ui'
  | 'solaris'
  | 'solarized-dark'
  | 'solarized-light'
  | 'surreal-dreamlogic'
  | 'synthwave'
  | 'tokyo-night'
  | 'translucent-slime'
  | 'ubuntu'
  | 'vaporwave'
  | 'vscode'
  | 'win11-mica'
  | 'win7'
  | 'windows95'
  | 'windowsXP'
  | 'y2k-liquid-chrome'
  | 'zen-garden';

export type RefractorThemeId = OpticalPresetThemeId | WebOsThemeId;

export interface WebOsThemeRawSpec {
  readonly id: WebOsThemeId;
  readonly sourceId: string;
  readonly name: string;
  readonly description: string;
  readonly mode: ThemeMode;
  readonly category: Exclude<ThemeCollectionCategory, 'optical-glass'>;
  readonly material: ThemeMaterial;
  readonly wallpaperOverlay: ThemeOverlayFx;
  readonly overlayOpacity?: number;
  readonly sharpCorners?: boolean;
  readonly letterSpacing?: string;
  readonly fontFamily: string;
  readonly monoFamily?: string;
  readonly colors: {
    readonly primary: string;
    readonly primaryText: string;
    readonly secondary: string;
    readonly accent: string;
    readonly info?: string;
    readonly success: string;
    readonly warning: string;
    readonly error: string;
    readonly text: string;
    readonly textMuted: string;
    readonly border: string;
    readonly windowBg: string;
    readonly windowBorder: string;
    readonly surface: string;
    readonly surfaceHighlight: string;
    readonly chromeBg: string;
    readonly chromeText: string;
    readonly wallpaper: string;
  };
  readonly window: {
    readonly radiusPx: number;
    readonly borderWidthPx: number;
    readonly backdropBlurPx: number;
    readonly shadow: string;
    readonly controlsLayout: ThemeControlsLayout;
    readonly titleBarHeightPx: number;
  };
  readonly editor: ThemeEditorColors;
}

export interface ThemeCatalogEntry {
  readonly id: RefractorThemeId;
  readonly sourceId: string;
  readonly name: string;
  readonly description: string;
  readonly mode: ThemeMode;
  readonly category: ThemeCollectionCategory;
  readonly material: ThemeMaterial;
  readonly wallpaperOverlay: ThemeOverlayFx;
  readonly fontFamily: string;
  readonly swatches: readonly [string, string, string, string];
  readonly wallpaper: string;
  readonly theme: DefinedPrismTheme;
}

export interface ThemeCategoryMeta {
  readonly id: ThemeCollectionCategory;
  readonly label: string;
  readonly shortLabel: string;
  readonly description: string;
}
