import { useMemo } from 'react';
import { Provider } from 'react-redux';
import { createPrismTheme, PrismThemeProvider } from '@refractor-ui/core';
import { alabasterTheme } from '@refractor-ui/theme-alabaster';
import { amethystTheme } from '@refractor-ui/theme-amethyst';
import { emeraldTideTheme } from '@refractor-ui/theme-emerald-tide';
import { obsidianTheme } from '@refractor-ui/theme-obsidian';
import { solarPrismTheme } from '@refractor-ui/theme-solar-prism';
import { DocsShell } from './docs/DocsShell';
import { store, useAppSelector } from './system/store';

function ThemedRoot() {
  const themePreset = useAppSelector((s) => s.system.themePreset);
  const mode = useAppSelector((s) => s.system.themeMode);
  const refraction = useAppSelector((s) => s.system.refraction);
  const customPalette = useAppSelector((s) => s.system.customPalette);

  const activeTheme = useMemo(() => {
    if (themePreset === 'alabaster') return alabasterTheme;
    if (themePreset === 'obsidian') return obsidianTheme;
    if (themePreset === 'amethyst') return amethystTheme;
    if (themePreset === 'emerald-tide') return emeraldTideTheme;
    if (themePreset === 'solar-prism') return solarPrismTheme;

    return createPrismTheme({
      name: 'custom-studio',
      palette: {
        mode,
        primary: { main: customPalette.primaryMain },
        secondary: { main: customPalette.secondaryMain },
        success: { main: customPalette.successMain },
        info: { main: customPalette.infoMain },
      },
      shape: {
        slabRadius: customPalette.slabRadius,
      },
      optics: {
        refraction,
        blurPx: customPalette.blurPx,
        specularHighlight: customPalette.specularHighlight,
      },
    });
  }, [customPalette, mode, refraction, themePreset]);

  return (
    <PrismThemeProvider theme={activeTheme} mode={mode} refraction={refraction}>
      <DocsShell />
    </PrismThemeProvider>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <ThemedRoot />
    </Provider>
  );
}
