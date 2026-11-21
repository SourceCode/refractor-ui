'use client';

import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import type { OpticalStyleTokens } from '../BaseProps';
import { createPrismTheme, themeToCssVariables } from './createPrismTheme';
import { isDefinedPrismTheme, isResolvedPrismTheme, resolveDefinedTheme } from './defineTheme';
import type {
  ComponentStyleOverride,
  DefinedPrismTheme,
  PrismTheme,
  PrismThemeOptions,
  RefractionIntensity,
  ThemeMode,
} from './types';

const DEFAULT_THEME = createPrismTheme('light', 'standard');

const PrismThemeContext = createContext<PrismTheme>(DEFAULT_THEME);

export interface PrismThemeProviderProps {
  /** Resolved PrismTheme, Astryx DefinedPrismTheme, or MUI-style PrismThemeOptions. */
  theme?: PrismTheme | DefinedPrismTheme | PrismThemeOptions;
  /** Optional shorthand color mode override ('light' | 'dark'). */
  mode?: ThemeMode;
  /** Optional shorthand optical dispersion override ('subtle' | 'standard' | 'vivid'). */
  refraction?: RefractionIntensity;
  /**
   * 'root' injects CSS custom properties onto document.documentElement (default).
   * 'local' wraps children in a scoped container with cascade tokens (supports nested themes).
   */
  scope?: 'root' | 'local';
  className?: string;
  children: ReactNode;
}

export function PrismThemeProvider({
  theme: themeProp,
  mode,
  refraction,
  scope = 'root',
  className,
  children,
}: PrismThemeProviderProps) {
  const resolvedTheme = useMemo<PrismTheme>(() => {
    if (!themeProp) {
      return createPrismTheme(mode ?? 'light', refraction ?? 'standard');
    }
    if (isDefinedPrismTheme(themeProp)) {
      return resolveDefinedTheme(themeProp, mode, refraction);
    }
    if (isResolvedPrismTheme(themeProp)) {
      if (!mode && !refraction) return themeProp;
      return createPrismTheme({
        name: themeProp.name,
        palette: {
          mode: mode ?? themeProp.palette.mode,
          primary: themeProp.palette.primary,
          secondary: themeProp.palette.secondary,
          info: themeProp.palette.info,
          success: themeProp.palette.success,
          warning: themeProp.palette.warning,
          error: themeProp.palette.error,
          background: themeProp.palette.background,
          text: themeProp.palette.text,
          divider: themeProp.palette.divider,
        },
        typography: themeProp.typography,
        shape: themeProp.shape,
        optics: {
          ...themeProp.optics,
          refraction: refraction ?? themeProp.optics.refraction,
        },
        components: themeProp.components,
        customTokens: themeProp.customTokens,
      });
    }
    return createPrismTheme({
      ...themeProp,
      palette: {
        ...themeProp.palette,
        ...(mode ? { mode } : {}),
      },
      optics: {
        ...themeProp.optics,
        ...(refraction ? { refraction } : {}),
      },
    });
  }, [themeProp, mode, refraction]);

  const cssVars = useMemo(() => themeToCssVariables(resolvedTheme), [resolvedTheme]);

  useEffect(() => {
    if (scope !== 'root' || typeof document === 'undefined') return;
    const root = document.documentElement;
    if (resolvedTheme.palette.mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    root.setAttribute('data-color-mode', resolvedTheme.palette.mode);
    root.setAttribute('data-refraction', resolvedTheme.optics.refraction);
    root.setAttribute('data-refractor-theme', resolvedTheme.name);

    for (const [prop, val] of Object.entries(cssVars)) {
      root.style.setProperty(prop, val);
    }
  }, [cssVars, resolvedTheme, scope]);

  if (scope === 'local') {
    const localStyle: OpticalStyleTokens = { ...cssVars };
    return (
      <PrismThemeContext.Provider value={resolvedTheme}>
        <div
          data-color-mode={resolvedTheme.palette.mode}
          data-refraction={resolvedTheme.optics.refraction}
          data-refractor-theme={resolvedTheme.name}
          className={[resolvedTheme.palette.mode === 'dark' ? 'dark' : '', className]
            .filter(Boolean)
            .join(' ')}
          style={localStyle}
        >
          {children}
        </div>
      </PrismThemeContext.Provider>
    );
  }

  return (
    <PrismThemeContext.Provider value={resolvedTheme}>
      {children}
    </PrismThemeContext.Provider>
  );
}

PrismThemeProvider.displayName = 'PrismThemeProvider';

export function usePrismTheme(): PrismTheme {
  return useContext(PrismThemeContext);
}

export function useComponentOverride(componentName: string): ComponentStyleOverride | undefined {
  const theme = useContext(PrismThemeContext);
  return theme.components[componentName];
}
