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
export const adwaitaTheme = /*#__PURE__*/ getWebOsTheme('adwaita');
export const amigaTheme = /*#__PURE__*/ getWebOsTheme('amiga');
export const beosTheme = /*#__PURE__*/ getWebOsTheme('beos');
export const macosTheme = /*#__PURE__*/ getWebOsTheme('macos');
export const mintTheme = /*#__PURE__*/ getWebOsTheme('mint');
export const solarisTheme = /*#__PURE__*/ getWebOsTheme('solaris');
export const ubuntuTheme = /*#__PURE__*/ getWebOsTheme('ubuntu');
export const win7Theme = /*#__PURE__*/ getWebOsTheme('win7');
export const windows95Theme = /*#__PURE__*/ getWebOsTheme('windows95');
export const windowsXpTheme = /*#__PURE__*/ getWebOsTheme('windowsXP');

// Modern OS & Frost (5)
export const darkmodeTheme = /*#__PURE__*/ getWebOsTheme('darkmode');
export const ios17FrostTheme = /*#__PURE__*/ getWebOsTheme('ios17-frost');
export const materialTheme = /*#__PURE__*/ getWebOsTheme('material');
export const midnightTheme = /*#__PURE__*/ getWebOsTheme('midnight');
export const win11MicaTheme = /*#__PURE__*/ getWebOsTheme('win11-mica');

// Cyberpunk, Neon & CRT (8)
export const akiraNeoTokyoTheme = /*#__PURE__*/ getWebOsTheme('akira-neo-tokyo');
export const bladeRunnerNeonTheme = /*#__PURE__*/ getWebOsTheme('blade-runner-neon');
export const cyberpunkTheme = /*#__PURE__*/ getWebOsTheme('cyberpunk');
export const hackerTheme = /*#__PURE__*/ getWebOsTheme('hacker');
export const neonDreamsTheme = /*#__PURE__*/ getWebOsTheme('neon-dreams');
export const outrunTheme = /*#__PURE__*/ getWebOsTheme('outrun');
export const synthwaveTheme = /*#__PURE__*/ getWebOsTheme('synthwave');
export const vaporwaveTheme = /*#__PURE__*/ getWebOsTheme('vaporwave');

// Retro Console & Gaming (7)
export const dreamcastSwirlTheme = /*#__PURE__*/ getWebOsTheme('dreamcast-swirl');
export const gameboyClassicTheme = /*#__PURE__*/ getWebOsTheme('gameboy-classic');
export const gamecubePurpleTheme = /*#__PURE__*/ getWebOsTheme('gamecube-purple');
export const ps5OrbitTheme = /*#__PURE__*/ getWebOsTheme('ps5-orbit');
export const segaGenesisTheme = /*#__PURE__*/ getWebOsTheme('sega-genesis');
export const segaSaturnTheme = /*#__PURE__*/ getWebOsTheme('sega-saturn');
export const snesClassicTheme = /*#__PURE__*/ getWebOsTheme('snes-classic');

// Tactile, Brutalist & Experimental (13)
export const brutalistWebTheme = /*#__PURE__*/ getWebOsTheme('brutalist-web');
export const eInkNotebookTheme = /*#__PURE__*/ getWebOsTheme('e-ink-notebook');
export const glowingResinTheme = /*#__PURE__*/ getWebOsTheme('glowing-resin');
export const industrialWarningTheme = /*#__PURE__*/ getWebOsTheme('industrial-warning');
export const liquidMetalTheme = /*#__PURE__*/ getWebOsTheme('liquid-metal');
export const memphisMilanoTheme = /*#__PURE__*/ getWebOsTheme('memphis-milano');
export const mpcBeatMachineTheme = /*#__PURE__*/ getWebOsTheme('mpc-beat-machine');
export const neumorphismTheme = /*#__PURE__*/ getWebOsTheme('neumorphism');
export const paperCutoutTheme = /*#__PURE__*/ getWebOsTheme('paper-cutout');
export const softClayUiTheme = /*#__PURE__*/ getWebOsTheme('soft-clay-ui');
export const surrealDreamlogicTheme = /*#__PURE__*/ getWebOsTheme('surreal-dreamlogic');
export const translucentSlimeTheme = /*#__PURE__*/ getWebOsTheme('translucent-slime');
export const y2kLiquidChromeTheme = /*#__PURE__*/ getWebOsTheme('y2k-liquid-chrome');

// Developer & IDE Palettes (8)
export const monokaiTheme = /*#__PURE__*/ getWebOsTheme('monokai');
export const nordTheme = /*#__PURE__*/ getWebOsTheme('nord');
export const obsidianStoneTheme = /*#__PURE__*/ getWebOsTheme('obsidian-stone');
export const oneDarkProTheme = /*#__PURE__*/ getWebOsTheme('one-dark-pro');
export const solarizedDarkTheme = /*#__PURE__*/ getWebOsTheme('solarized-dark');
export const solarizedLightTheme = /*#__PURE__*/ getWebOsTheme('solarized-light');
export const tokyoNightTheme = /*#__PURE__*/ getWebOsTheme('tokyo-night');
export const vscodeTheme = /*#__PURE__*/ getWebOsTheme('vscode');

// Elemental & Atmospheric (7)
export const elementAirTheme = /*#__PURE__*/ getWebOsTheme('element-air');
export const elementEarthTheme = /*#__PURE__*/ getWebOsTheme('element-earth');
export const elementEtherTheme = /*#__PURE__*/ getWebOsTheme('element-ether');
export const elementFireTheme = /*#__PURE__*/ getWebOsTheme('element-fire');
export const elementWaterTheme = /*#__PURE__*/ getWebOsTheme('element-water');
export const oceanTheme = /*#__PURE__*/ getWebOsTheme('ocean');
export const zenGardenTheme = /*#__PURE__*/ getWebOsTheme('zen-garden');

// Four Seasons (4)
export const seasonAutumnTheme = /*#__PURE__*/ getWebOsTheme('season-autumn');
export const seasonSpringTheme = /*#__PURE__*/ getWebOsTheme('season-spring');
export const seasonSummerTheme = /*#__PURE__*/ getWebOsTheme('season-summer');
export const seasonWinterTheme = /*#__PURE__*/ getWebOsTheme('season-winter');
