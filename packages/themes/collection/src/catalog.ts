import {
  defineTheme,
  type DefinedPrismTheme,
  type ThemeCollectionCategory,
  type ThemeMaterial,
  type ThemeMode,
} from '@refractor-ui/core';
import { buildCatalogEntry } from './builder';
import { CLASSIC_OS_THEME_SPECS } from './collections/classicOs';
import { CYBER_NEON_THEME_SPECS } from './collections/cyberNeon';
import { DEVELOPER_IDE_THEME_SPECS } from './collections/developerIde';
import { MODERN_OS_THEME_SPECS } from './collections/modernOs';
import { NATURE_ELEMENTS_THEME_SPECS } from './collections/natureElements';
import { RETRO_GAMING_THEME_SPECS } from './collections/retroGaming';
import { SEASONS_THEME_SPECS } from './collections/seasons';
import { TACTILE_MATERIAL_THEME_SPECS } from './collections/tactileMaterial';
import type {
  RefractorThemeId,
  ThemeCatalogEntry,
  ThemeCategoryMeta,
  WebOsThemeId,
  WebOsThemeRawSpec,
} from './types';

export const THEME_CATEGORIES: ReadonlyArray<ThemeCategoryMeta> = [
  {
    id: 'optical-glass',
    label: 'Optical Glass (Refractor Core)',
    shortLabel: 'Optical Glass',
    description: 'Signature Refractor prismatic optical-glass light, dark, and jewel-tone refraction themes.',
  },
  {
    id: 'classic-os',
    label: 'Classic & Retro OS',
    shortLabel: 'Classic OS',
    description: 'Authentic Windows 95/XP/7, Amiga Workbench, BeOS, Solaris, Monterey, Ubuntu, Adwaita, and Mint desktops.',
  },
  {
    id: 'modern-os',
    label: 'Modern OS & Frost',
    shortLabel: 'Modern OS',
    description: 'Windows 11 Mica, iOS 17 Frost, GlassOS Dark, Material, New Western, and Midnight surfaces.',
  },
  {
    id: 'cyber-neon',
    label: 'Cyberpunk, Neon & CRT',
    shortLabel: 'Cyber & Neon',
    description: 'High-voltage Cyberpunk, Synthwave, Outrun, Vaporwave, Blade Runner, Akira, Neon Dreams, and Hacker CRT.',
  },
  {
    id: 'retro-gaming',
    label: 'Retro Console & Gaming',
    shortLabel: 'Gaming',
    description: 'Game Boy LCD, SNES, Sega Genesis & Saturn, Dreamcast Swirl, GameCube Purple, and PS5 Orbit.',
  },
  {
    id: 'tactile-material',
    label: 'Tactile, Brutalist & Experimental',
    shortLabel: 'Tactile & FX',
    description: 'Brutalist Web, Neumorphism, Soft Clay, Paper Cutout, Memphis Milano, E-Ink, Liquid Chrome, Resin & Slime.',
  },
  {
    id: 'developer-ide',
    label: 'Developer & IDE Palettes',
    shortLabel: 'Dev & IDE',
    description: 'VS Code Dark, Monokai Pro, One Dark Pro, Nord, Tokyo Night, Solarized Light/Dark, and Obsidian Stone.',
  },
  {
    id: 'nature-elements',
    label: 'Elements & Atmospheric',
    shortLabel: 'Elements',
    description: 'Air, Earth, Ether, Fire, Water, Ocean Depth, and Zen Garden natural surface aesthetics.',
  },
  {
    id: 'seasons',
    label: 'Four Seasons',
    shortLabel: 'Seasons',
    description: 'Spring bloom, Summer sun, Autumn amber, and Winter frost atmospheric themes.',
  },
];

const OPTICAL_PRESET_ENTRIES: ReadonlyArray<ThemeCatalogEntry> = [
  {
    id: 'alabaster',
    sourceId: 'alabaster',
    name: 'Alabaster Light',
    description: 'Signature studio alabaster optical glass with warm tangerine capsules and cool sky crystal.',
    mode: 'light',
    category: 'optical-glass',
    material: 'glass',
    wallpaperOverlay: 'none',
    fontFamily: '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif',
    swatches: ['#E75C24', '#38BDF8', '#EAEDF2', '#18202C'],
    wallpaper: 'linear-gradient(145deg, #F3F5F8 0%, #EAEDF2 48%, #E2E6ED 100%)',
    theme: defineTheme({
      name: 'alabaster',
      displayName: 'Alabaster Light',
      description: 'Signature studio alabaster optical glass with warm tangerine capsules and cool sky crystal.',
      category: 'optical-glass',
      material: 'glass',
      palette: {
        mode: 'light',
        primary: { main: '#E75C24', light: '#F59C28', dark: '#C94114', contrastText: '#FFFFFF' },
        secondary: { main: '#38BDF8', light: '#BAE6FD', dark: '#0284C7', contrastText: '#151E2C' },
        info: { main: '#1D4ED8', light: '#0EA5E9', dark: '#1E3A8A', contrastText: '#FFFFFF' },
        success: { main: '#26BC92', light: '#5CE1B8', dark: '#159673', contrastText: '#FFFFFF' },
      },
      optics: { refraction: 'standard', blurPx: 18, specularHighlight: true },
    }),
  },
  {
    id: 'obsidian',
    sourceId: 'obsidian',
    name: 'Obsidian Dark',
    description: 'Deep nocturnal optical glass with crisp high-luminance specular rims and WCAG AAA ink.',
    mode: 'dark',
    category: 'optical-glass',
    material: 'glass',
    wallpaperOverlay: 'none',
    fontFamily: '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif',
    swatches: ['#E75C24', '#38BDF8', '#0D121A', '#F1F5F9'],
    wallpaper: 'linear-gradient(145deg, #0D121A 0%, #121924 48%, #0B1017 100%)',
    theme: defineTheme({
      name: 'obsidian',
      displayName: 'Obsidian Dark',
      description: 'Deep nocturnal optical glass with crisp high-luminance specular rims and WCAG AAA ink.',
      category: 'optical-glass',
      material: 'glass',
      palette: {
        mode: 'dark',
        primary: { main: '#E75C24', light: '#F59C28', dark: '#C94114', contrastText: '#FFFFFF' },
        secondary: { main: '#38BDF8', light: '#BAE6FD', dark: '#0284C7', contrastText: '#F1F5F9' },
        info: { main: '#2563EB', light: '#38BDF8', dark: '#1E3A8A', contrastText: '#FFFFFF' },
        success: { main: '#26BC92', light: '#5CE1B8', dark: '#159673', contrastText: '#FFFFFF' },
      },
      optics: { refraction: 'standard', blurPx: 20, specularHighlight: true },
    }),
  },
  {
    id: 'amethyst',
    sourceId: 'amethyst',
    name: 'Amethyst Prism',
    description: 'Violet-indigo refractive primary paired with electric cyan optical edge dispersion.',
    mode: 'light',
    category: 'optical-glass',
    material: 'glass',
    wallpaperOverlay: 'none',
    fontFamily: '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif',
    swatches: ['#7C3AED', '#06B6D4', '#EAEDF2', '#18202C'],
    wallpaper: 'linear-gradient(145deg, #F5F3FF 0%, #EDE9FE 50%, #E0F2FE 100%)',
    theme: defineTheme({
      name: 'amethyst',
      displayName: 'Amethyst Prism',
      description: 'Violet-indigo refractive primary paired with electric cyan optical edge dispersion.',
      category: 'optical-glass',
      material: 'glass',
      palette: {
        mode: 'light',
        primary: { main: '#7C3AED', light: '#A78BFA', dark: '#5B21B6', contrastText: '#FFFFFF' },
        secondary: { main: '#06B6D4', light: '#A5F3FC', dark: '#0E7490', contrastText: '#151E2C' },
        info: { main: '#4F46E5', light: '#818CF8', dark: '#3730A3', contrastText: '#FFFFFF' },
        success: { main: '#10B981', light: '#6EE7B7', dark: '#047857', contrastText: '#FFFFFF' },
      },
      optics: { refraction: 'vivid', blurPx: 20, specularHighlight: true },
    }),
  },
  {
    id: 'emerald-tide',
    sourceId: 'emerald-tide',
    name: 'Emerald Tide',
    description: 'Seafoam teal primary glass calibrated for developer telemetry and fintech workspaces.',
    mode: 'light',
    category: 'optical-glass',
    material: 'glass',
    wallpaperOverlay: 'none',
    fontFamily: '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif',
    swatches: ['#0D9488', '#0EA5E9', '#EAEDF2', '#18202C'],
    wallpaper: 'linear-gradient(145deg, #F0FDFA 0%, #E0F2FE 55%, #ECFEFF 100%)',
    theme: defineTheme({
      name: 'emerald-tide',
      displayName: 'Emerald Tide',
      description: 'Seafoam teal primary glass calibrated for developer telemetry and fintech workspaces.',
      category: 'optical-glass',
      material: 'glass',
      palette: {
        mode: 'light',
        primary: { main: '#0D9488', light: '#2DD4BF', dark: '#0F766E', contrastText: '#FFFFFF' },
        secondary: { main: '#0EA5E9', light: '#7DD3FC', dark: '#0369A1', contrastText: '#151E2C' },
        info: { main: '#0284C7', light: '#38BDF8', dark: '#075985', contrastText: '#FFFFFF' },
        success: { main: '#16A34A', light: '#4ADE80', dark: '#15803D', contrastText: '#FFFFFF' },
      },
      optics: { refraction: 'standard', blurPx: 18, specularHighlight: true },
    }),
  },
  {
    id: 'solar-prism',
    sourceId: 'solar-prism',
    name: 'Solar Prism',
    description: 'Warm golden amber primary capsules balanced against crisp cobalt accents.',
    mode: 'light',
    category: 'optical-glass',
    material: 'glass',
    wallpaperOverlay: 'none',
    fontFamily: '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif',
    swatches: ['#D97706', '#2563EB', '#EAEDF2', '#18202C'],
    wallpaper: 'linear-gradient(145deg, #FFFBEB 0%, #FEF3C7 48%, #EFF6FF 100%)',
    theme: defineTheme({
      name: 'solar-prism',
      displayName: 'Solar Prism',
      description: 'Warm golden amber primary capsules balanced against crisp cobalt accents.',
      category: 'optical-glass',
      material: 'glass',
      palette: {
        mode: 'light',
        primary: { main: '#D97706', light: '#FBBF24', dark: '#B45309', contrastText: '#FFFFFF' },
        secondary: { main: '#2563EB', light: '#93C5FD', dark: '#1E40AF', contrastText: '#FFFFFF' },
        info: { main: '#1D4ED8', light: '#60A5FA', dark: '#1E3A8A', contrastText: '#FFFFFF' },
        success: { main: '#059669', light: '#34D399', dark: '#047857', contrastText: '#FFFFFF' },
      },
      optics: { refraction: 'vivid', blurPx: 18, specularHighlight: true },
    }),
  },
];

export const ALL_WEBOS_THEME_SPECS: ReadonlyArray<WebOsThemeRawSpec> = [
  ...CLASSIC_OS_THEME_SPECS,
  ...MODERN_OS_THEME_SPECS,
  ...CYBER_NEON_THEME_SPECS,
  ...RETRO_GAMING_THEME_SPECS,
  ...TACTILE_MATERIAL_THEME_SPECS,
  ...DEVELOPER_IDE_THEME_SPECS,
  ...NATURE_ELEMENTS_THEME_SPECS,
  ...SEASONS_THEME_SPECS,
];

export const WEBOS_THEME_ENTRIES: ReadonlyArray<ThemeCatalogEntry> =
  ALL_WEBOS_THEME_SPECS.map(buildCatalogEntry);

export const OPTICAL_THEME_ENTRIES: ReadonlyArray<ThemeCatalogEntry> = OPTICAL_PRESET_ENTRIES;

/** Complete unified 68-theme catalog (5 Refractor Optical Glass + 63 WebOS-v3 themes). */
export const ALL_THEME_ENTRIES: ReadonlyArray<ThemeCatalogEntry> = [
  ...OPTICAL_THEME_ENTRIES,
  ...WEBOS_THEME_ENTRIES,
];

const CATALOG_MAP = new Map<string, ThemeCatalogEntry>(
  ALL_THEME_ENTRIES.map((entry) => [entry.id, entry])
);

const WEBOS_MAP = new Map<WebOsThemeId, ThemeCatalogEntry>(
  WEBOS_THEME_ENTRIES.map((entry) => [entry.id as WebOsThemeId, entry])
);

export function isRefractorThemeId(candidate: string): candidate is RefractorThemeId {
  return CATALOG_MAP.has(candidate);
}

export function getThemeEntryById(id: string): ThemeCatalogEntry | undefined {
  if (id === 'webos-obsidian') {
    return CATALOG_MAP.get('obsidian-stone');
  }
  return CATALOG_MAP.get(id);
}

export function getThemeById(id: string): DefinedPrismTheme | undefined {
  return getThemeEntryById(id)?.theme;
}

export function getWebOsTheme(id: WebOsThemeId): DefinedPrismTheme {
  const entry = WEBOS_MAP.get(id);
  if (!entry) {
    throw new Error(`Unknown WebOS theme id: ${id}`);
  }
  return entry.theme;
}

export interface ListThemesFilter {
  category?: ThemeCollectionCategory | 'all';
  mode?: ThemeMode | 'all';
  material?: ThemeMaterial | 'all';
  query?: string;
}

/**
 * Filters the unified 68-theme catalog using safe linear-time substring matching (zero regex DoS).
 */
export function listThemes(filter?: ListThemesFilter): ReadonlyArray<ThemeCatalogEntry> {
  if (!filter) return ALL_THEME_ENTRIES;
  const q = (filter.query ?? '').trim().toLowerCase();

  return ALL_THEME_ENTRIES.filter((entry) => {
    if (filter.category && filter.category !== 'all' && entry.category !== filter.category) {
      return false;
    }
    if (filter.mode && filter.mode !== 'all' && entry.mode !== filter.mode) {
      return false;
    }
    if (filter.material && filter.material !== 'all' && entry.material !== filter.material) {
      return false;
    }
    if (!q) return true;
    return (
      entry.id.toLowerCase().includes(q) ||
      entry.name.toLowerCase().includes(q) ||
      entry.description.toLowerCase().includes(q) ||
      entry.material.toLowerCase().includes(q) ||
      entry.category.toLowerCase().includes(q) ||
      entry.fontFamily.toLowerCase().includes(q)
    );
  });
}
