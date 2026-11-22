import { getWebOsTheme } from './catalog';

export type {
  OpticalPresetThemeId,
  RefractorThemeId,
  ThemeCatalogEntry,
  ThemeCategoryMeta,
  WebOsThemeId,
  WebOsThemeRawSpec,
} from './types';

export { buildCatalogEntry, buildWebOsTheme } from './builder';

export {
  ALL_THEME_ENTRIES,
  ALL_WEBOS_THEME_SPECS,
  getThemeById,
  getThemeEntryById,
  getWebOsTheme,
  isRefractorThemeId,
  listThemes,
  OPTICAL_THEME_ENTRIES,
  THEME_CATEGORIES,
  WEBOS_THEME_ENTRIES,
  type ListThemesFilter,
} from './catalog';

// Classic & Retro OS (10)
export const adwaitaTheme = getWebOsTheme('adwaita');
export const amigaTheme = getWebOsTheme('amiga');
export const beosTheme = getWebOsTheme('beos');
export const macosTheme = getWebOsTheme('macos');
export const mintTheme = getWebOsTheme('mint');
export const solarisTheme = getWebOsTheme('solaris');
export const ubuntuTheme = getWebOsTheme('ubuntu');
export const win7Theme = getWebOsTheme('win7');
export const windows95Theme = getWebOsTheme('windows95');
export const windowsXpTheme = getWebOsTheme('windowsXP');

// Modern OS & Frost (6)
export const darkmodeTheme = getWebOsTheme('darkmode');
export const ios17FrostTheme = getWebOsTheme('ios17-frost');
export const materialTheme = getWebOsTheme('material');
export const midnightTheme = getWebOsTheme('midnight');
export const newwesternDarkTheme = getWebOsTheme('newwesternDark');
export const win11MicaTheme = getWebOsTheme('win11-mica');

// Cyberpunk, Neon & CRT (8)
export const akiraNeoTokyoTheme = getWebOsTheme('akira-neo-tokyo');
export const bladeRunnerNeonTheme = getWebOsTheme('blade-runner-neon');
export const cyberpunkTheme = getWebOsTheme('cyberpunk');
export const hackerTheme = getWebOsTheme('hacker');
export const neonDreamsTheme = getWebOsTheme('neon-dreams');
export const outrunTheme = getWebOsTheme('outrun');
export const synthwaveTheme = getWebOsTheme('synthwave');
export const vaporwaveTheme = getWebOsTheme('vaporwave');

// Retro Console & Gaming (7)
export const dreamcastSwirlTheme = getWebOsTheme('dreamcast-swirl');
export const gameboyClassicTheme = getWebOsTheme('gameboy-classic');
export const gamecubePurpleTheme = getWebOsTheme('gamecube-purple');
export const ps5OrbitTheme = getWebOsTheme('ps5-orbit');
export const segaGenesisTheme = getWebOsTheme('sega-genesis');
export const segaSaturnTheme = getWebOsTheme('sega-saturn');
export const snesClassicTheme = getWebOsTheme('snes-classic');

// Tactile, Brutalist & Experimental (13)
export const brutalistWebTheme = getWebOsTheme('brutalist-web');
export const eInkNotebookTheme = getWebOsTheme('e-ink-notebook');
export const glowingResinTheme = getWebOsTheme('glowing-resin');
export const industrialWarningTheme = getWebOsTheme('industrial-warning');
export const liquidMetalTheme = getWebOsTheme('liquid-metal');
export const memphisMilanoTheme = getWebOsTheme('memphis-milano');
export const mpcBeatMachineTheme = getWebOsTheme('mpc-beat-machine');
export const neumorphismTheme = getWebOsTheme('neumorphism');
export const paperCutoutTheme = getWebOsTheme('paper-cutout');
export const softClayUiTheme = getWebOsTheme('soft-clay-ui');
export const surrealDreamlogicTheme = getWebOsTheme('surreal-dreamlogic');
export const translucentSlimeTheme = getWebOsTheme('translucent-slime');
export const y2kLiquidChromeTheme = getWebOsTheme('y2k-liquid-chrome');

// Developer & IDE Palettes (8)
export const monokaiTheme = getWebOsTheme('monokai');
export const nordTheme = getWebOsTheme('nord');
export const obsidianStoneTheme = getWebOsTheme('obsidian-stone');
export const oneDarkProTheme = getWebOsTheme('one-dark-pro');
export const solarizedDarkTheme = getWebOsTheme('solarized-dark');
export const solarizedLightTheme = getWebOsTheme('solarized-light');
export const tokyoNightTheme = getWebOsTheme('tokyo-night');
export const vscodeTheme = getWebOsTheme('vscode');

// Elemental & Atmospheric (7)
export const elementAirTheme = getWebOsTheme('element-air');
export const elementEarthTheme = getWebOsTheme('element-earth');
export const elementEtherTheme = getWebOsTheme('element-ether');
export const elementFireTheme = getWebOsTheme('element-fire');
export const elementWaterTheme = getWebOsTheme('element-water');
export const oceanTheme = getWebOsTheme('ocean');
export const zenGardenTheme = getWebOsTheme('zen-garden');

// Four Seasons (4)
export const seasonAutumnTheme = getWebOsTheme('season-autumn');
export const seasonSpringTheme = getWebOsTheme('season-spring');
export const seasonSummerTheme = getWebOsTheme('season-summer');
export const seasonWinterTheme = getWebOsTheme('season-winter');
