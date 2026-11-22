import { useMemo } from 'react';
import { Provider } from 'react-redux';
import { createPrismTheme, PrismThemeProvider } from '@refractor-ui/core';
import { getThemeById } from '@refractor-ui/themes';
import { DocsShell } from './docs/DocsShell';
import { store, useAppSelector } from './system/store';

function ThemedRoot() {
  const themePreset = useAppSelector((s) => s.system.themePreset);
  const mode = useAppSelector((s) => s.system.themeMode);
  const refraction = useAppSelector((s) => s.system.refraction);
  const customPalette = useAppSelector((s) => s.system.customPalette);

  const activeTheme = useMemo(() => {
    if (themePreset !== 'custom') {
      const presetTheme = getThemeById(themePreset);
      if (presetTheme) return presetTheme;
    }

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
