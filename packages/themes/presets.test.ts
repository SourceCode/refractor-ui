import { describe, expect, it } from 'vitest';
import { compileThemeCss, isDefinedPrismTheme } from '@refractor-ui/core';
import { alabasterTheme } from './alabaster/src';
import { obsidianTheme } from './obsidian/src';
import { amethystTheme } from './amethyst/src';
import { emeraldTideTheme } from './emerald-tide/src';
import { solarPrismTheme } from './solar-prism/src';

describe('@refractor-ui/theme-* official optical presets', () => {
  it('exports all 5 official optical theme presets cleanly', () => {
    const presets = [
      alabasterTheme,
      obsidianTheme,
      amethystTheme,
      emeraldTideTheme,
      solarPrismTheme,
    ];
    expect(presets.map((p) => p.name)).toEqual([
      'alabaster',
      'obsidian',
      'amethyst',
      'emerald-tide',
      'solar-prism',
    ]);
    for (const preset of presets) {
      expect(isDefinedPrismTheme(preset)).toBe(true);
      expect(compileThemeCss(preset)).toContain(`[data-refractor-theme="${preset.name}"]`);
    }
  });
});
