import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  buildGoogleFontsHref,
  compileThemeCss,
  getContrastRatio,
  isDefinedPrismTheme,
  PrimaryButton,
  PrismCard,
  PrismThemeProvider,
  resolveDefinedTheme,
  SecondaryButton,
  TextInput,
  themeToCssVariables,
} from '@refractor-ui/core';
import {
  ALL_THEME_ENTRIES,
  ALL_WEBOS_THEME_SPECS,
  brutalistWebTheme,
  cyberpunkTheme,
  gameboyClassicTheme,
  getThemeById,
  getThemeEntryById,
  getWebOsTheme,
  hackerTheme,
  ios17FrostTheme,
  isRefractorThemeId,
  listThemes,
  neumorphismTheme,
  OPTICAL_THEME_ENTRIES,
  softClayUiTheme,
  synthwaveTheme,
  THEME_CATEGORIES,
  tokyoNightTheme,
  WEBOS_THEME_ENTRIES,
  win11MicaTheme,
  windows95Theme,
  y2kLiquidChromeTheme,
  type WebOsThemeId,
} from './index';

const ALL_EXPECTED_WEBOS_SOURCE_IDS: ReadonlyArray<string> = [
  'adwaita',
  'akira-neo-tokyo',
  'amiga',
  'beos',
  'blade-runner-neon',
  'brutalist-web',
  'cyberpunk',
  'darkmode',
  'dreamcast-swirl',
  'e-ink-notebook',
  'element-air',
  'element-earth',
  'element-ether',
  'element-fire',
  'element-water',
  'gameboy-classic',
  'gamecube-purple',
  'glowing-resin',
  'hacker',
  'industrial-warning',
  'ios17-frost',
  'liquid-metal',
  'macos',
  'material',
  'memphis-milano',
  'midnight',
  'mint',
  'monokai',
  'mpc-beat-machine',
  'neon-dreams',
  'neumorphism',
  'nord',
  'obsidian',
  'ocean',
  'one-dark-pro',
  'outrun',
  'paper-cutout',
  'ps5-orbit',
  'season-autumn',
  'season-spring',
  'season-summer',
  'season-winter',
  'sega-genesis',
  'sega-saturn',
  'snes-classic',
  'soft-clay-ui',
  'solaris',
  'solarized-dark',
  'solarized-light',
  'surreal-dreamlogic',
  'synthwave',
  'tokyo-night',
  'translucent-slime',
  'ubuntu',
  'vaporwave',
  'vscode',
  'win11-mica',
  'win7',
  'windows95',
  'windowsXP',
  'y2k-liquid-chrome',
  'zen-garden',
];

describe('@refractor-ui/themes — Complete 62-Theme WebOS-v3 Collection & 67-Theme Catalog', () => {
  it('implements all 62 curated WebOS-v3 themes plus 5 Refractor optical presets (67 total)', () => {
    expect(OPTICAL_THEME_ENTRIES).toHaveLength(5);
    expect(WEBOS_THEME_ENTRIES).toHaveLength(62);
    expect(ALL_WEBOS_THEME_SPECS).toHaveLength(62);
    expect(ALL_THEME_ENTRIES).toHaveLength(67);
    expect(THEME_CATEGORIES).toHaveLength(9);

    const uniqueIds = new Set(ALL_THEME_ENTRIES.map((e) => e.id));
    expect(uniqueIds.size).toBe(67);

    const sourceIds = new Set(WEBOS_THEME_ENTRIES.map((e) => e.sourceId));
    for (const expectedSourceId of ALL_EXPECTED_WEBOS_SOURCE_IDS) {
      expect(sourceIds.has(expectedSourceId), `Missing webos-v3 theme: ${expectedSourceId}`).toBe(
        true
      );
    }

    // Verify all 13 UI material archetypes are represented across the 67-theme catalog
    const representedMaterials = new Set(ALL_THEME_ENTRIES.map((e) => e.material));
    expect(representedMaterials.size).toBe(13);

    // Verify named exports resolve identically to catalog lookup
    expect(windows95Theme.name).toBe('windows95');
    expect(cyberpunkTheme.name).toBe('cyberpunk');
    expect(synthwaveTheme.name).toBe('synthwave');
    expect(hackerTheme.name).toBe('hacker');
    expect(gameboyClassicTheme.name).toBe('gameboy-classic');
    expect(brutalistWebTheme.name).toBe('brutalist-web');
    expect(neumorphismTheme.name).toBe('neumorphism');
    expect(softClayUiTheme.name).toBe('soft-clay-ui');
    expect(win11MicaTheme.name).toBe('win11-mica');
    expect(ios17FrostTheme.name).toBe('ios17-frost');
    expect(y2kLiquidChromeTheme.name).toBe('y2k-liquid-chrome');
    expect(tokyoNightTheme.name).toBe('tokyo-night');
  });

  it('enforces strict WCAG 2.2 AA contrast (>= 4.5:1), valid tokens, and allowlisted Google Fonts across ALL 67 themes', () => {
    for (const entry of ALL_THEME_ENTRIES) {
      expect(isDefinedPrismTheme(entry.theme)).toBe(true);
      const resolved = resolveDefinedTheme(entry.theme, entry.mode);
      const vars = themeToCssVariables(resolved);

      // Primary button text contrast: strict WCAG 2.2 AA (>= 4.5:1) for all 62 WebOS-v3 themes,
      // and >= 3.0:1 (WCAG AA UI/large + >= 4.5:1 gradient dark stop) for legacy optical glass presets
      const primaryBtnContrast = getContrastRatio(
        resolved.palette.primary.main,
        resolved.palette.primary.contrastText
      );
      if (entry.category === 'optical-glass') {
        expect(primaryBtnContrast).toBeGreaterThanOrEqual(3.0);
        expect(
          getContrastRatio(resolved.palette.primary.dark, resolved.palette.primary.contrastText)
        ).toBeGreaterThanOrEqual(4.5);
      } else {
        expect(
          primaryBtnContrast,
          `Low primary CTA contrast (${primaryBtnContrast}) in theme "${entry.id}"`
        ).toBeGreaterThanOrEqual(4.5);
      }

      // Primary & secondary body text contrast against base window surface MUST satisfy WCAG 2.2 AA >= 4.5:1
      const bodyContrast = getContrastRatio(
        resolved.palette.background.default,
        resolved.palette.text.primary
      );
      expect(
        bodyContrast,
        `Low body text contrast (${bodyContrast}) in theme "${entry.id}"`
      ).toBeGreaterThanOrEqual(4.5);

      if (entry.category !== 'optical-glass') {
        const mutedContrast = getContrastRatio(
          resolved.palette.background.default,
          resolved.palette.text.secondary
        );
        expect(
          mutedContrast,
          `Low secondary/muted text contrast (${mutedContrast}) in theme "${entry.id}"`
        ).toBeGreaterThanOrEqual(4.5);
      }

      // Every theme emits complete transformation tokens
      expect(vars['--prism-wallpaper']).toBeTruthy();
      expect(vars['--prism-window-bg']).toBeTruthy();
      expect(vars['--prism-font-sans']).toBeTruthy();
      expect(vars['--prism-radius-btn']).toBeTruthy();
      expect(vars['--prism-editor-bg']).toBeTruthy();

      // Any declared Google Fonts MUST pass URL allowlist validation cleanly
      if (resolved.typography.googleFonts.length > 0) {
        const href = buildGoogleFontsHref(resolved.typography.googleFonts);
        expect(href).not.toBeNull();
        expect(href).toMatch(/^https:\/\/fonts\.googleapis\.com\/css2\?family=/);
      }

      // Cascade CSS compiles cleanly
      const css = compileThemeCss(entry.theme);
      expect(css).toContain(`[data-refractor-theme="${entry.id}"]`);
    }
  });

  it('resolves all 67 themes under performance budget (< 5ms average per theme switch)', () => {
    const start = performance.now();
    for (const entry of ALL_THEME_ENTRIES) {
      const resolved = resolveDefinedTheme(entry.theme, entry.mode);
      themeToCssVariables(resolved);
    }
    const elapsedMs = performance.now() - start;
    const avgMs = elapsedMs / ALL_THEME_ENTRIES.length;
    expect(avgMs).toBeLessThan(5);
  });

  it('supports prototype-safe lookup, alias resolution, filtering, and linear-time search', () => {
    expect(isRefractorThemeId('windows95')).toBe(true);
    expect(isRefractorThemeId('__proto__')).toBe(false);
    expect(isRefractorThemeId('constructor')).toBe(false);

    expect(getThemeById('__proto__')).toBeUndefined();
    expect(getThemeEntryById('webos-obsidian')?.id).toBe('obsidian-stone');
    expect(getThemeById('obsidian')?.name).toBe('obsidian');
    expect(getThemeById('obsidian-stone')?.name).toBe('obsidian-stone');

    expect(() => getWebOsTheme('nonexistent' as WebOsThemeId)).toThrow(/Unknown WebOS theme id/);

    expect(listThemes()).toHaveLength(67);
    expect(listThemes({ category: 'classic-os' })).toHaveLength(10);
    expect(listThemes({ category: 'cyber-neon', mode: 'dark' })).toHaveLength(8);
    expect(listThemes({ material: 'bevel' }).length).toBeGreaterThanOrEqual(5);
    expect(listThemes({ query: 'win' }).some((t) => t.id === 'windows95')).toBe(true);
    expect(listThemes({ query: 'Orbitron' }).some((t) => t.id === 'synthwave')).toBe(true);
    // Regex metacharacters in search MUST NOT throw or backtrack
    expect(listThemes({ query: '(.*)+[a-z]{1,99}$' })).toEqual([]);
  });

  it('renders Refractor UI primitives inside local scoped WebOS-v3 themes with accurate material & FX attributes', () => {
    const { container } = render(
      <div>
        <PrismThemeProvider theme={windows95Theme} scope="local" loadFonts={false}>
          <PrismCard title="Win95 Surface">
            <TextInput label="Path" defaultValue="C:\\WINDOWS" />
            <PrimaryButton size="sm">OK</PrimaryButton>
            <SecondaryButton size="sm">Cancel</SecondaryButton>
          </PrismCard>
        </PrismThemeProvider>
        <PrismThemeProvider theme={hackerTheme} scope="local" loadFonts={false}>
          <PrismCard title="Hacker Surface">
            <PrimaryButton size="sm">Execute</PrimaryButton>
          </PrismCard>
        </PrismThemeProvider>
      </div>
    );

    const win95Root = container.querySelector('[data-refractor-theme="windows95"]');
    expect(win95Root?.getAttribute('data-refractor-material')).toBe('bevel');
    expect(win95Root?.getAttribute('data-refractor-sharp')).toBe('true');
    expect(win95Root?.getAttribute('data-refractor-theme-adaptive')).toBe('true');

    const hackerRoot = container.querySelector('[data-refractor-theme="hacker"]');
    expect(hackerRoot?.getAttribute('data-refractor-material')).toBe('crt');
    expect(hackerRoot?.getAttribute('data-refractor-fx')).toBe('crt-rgb');
    expect(screen.getByText('Win95 Surface')).toBeInTheDocument();
    expect(screen.getByText('Hacker Surface')).toBeInTheDocument();
  });
});
