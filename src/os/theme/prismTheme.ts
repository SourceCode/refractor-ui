import React, { createContext, useContext, useEffect } from 'react';

export type ThemeMode = 'light' | 'dark';
export type RefractionIntensity = 'subtle' | 'standard' | 'vivid';

/**
 * MUI-compatible Global Dynamic Theme Specification
 * Mirrors Material-UI palette, typography, shape, and component token contracts
 * while extending optical refraction physics tokens.
 */
export interface PrismTheme {
  palette: {
    mode: ThemeMode;
    primary: { main: string; light: string; dark: string; contrastText: string };
    secondary: { main: string; light: string; dark: string; contrastText: string };
    success: { main: string; contrastText: string };
    warning: { main: string; contrastText: string };
    error: { main: string; contrastText: string };
    info: { main: string; contrastText: string };
    background: { default: string; paper: string; well: string };
    text: { primary: string; secondary: string; disabled: string };
    divider: string;
  };
  typography: {
    fontFamily: string;
    monoFamily: string;
    h1: { fontSize: string; fontWeight: number; lineHeight: number };
    h2: { fontSize: string; fontWeight: number; lineHeight: number };
    body1: { fontSize: string; lineHeight: number };
    caption: { fontSize: string; lineHeight: number };
  };
  shape: {
    borderRadius: number;
    pillRadius: number;
    slabRadius: number;
  };
  optics: {
    refraction: RefractionIntensity;
    blurPx: number;
    specularHighlight: boolean;
  };
}

export function createPrismTheme(
  mode: ThemeMode = 'light',
  refraction: RefractionIntensity = 'standard'
): PrismTheme {
  const isDark = mode === 'dark';
  return {
    palette: {
      mode,
      primary: {
        main: '#E75C24',
        light: '#F59C28',
        dark: '#C94114',
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: '#38BDF8',
        light: '#BAE6FD',
        dark: '#0284C7',
        contrastText: isDark ? '#F8FAFC' : '#17202E',
      },
      success: { main: '#22B58B', contrastText: '#FFFFFF' },
      warning: { main: '#EB9242', contrastText: '#18202C' },
      error: { main: '#DC2626', contrastText: '#FFFFFF' },
      info: { main: '#1D4ED8', contrastText: '#FFFFFF' },
      background: {
        default: isDark ? '#0D121A' : '#EAEDF2',
        paper: isDark ? 'rgba(28, 38, 54, 0.84)' : 'rgba(242, 246, 251, 0.78)',
        well: isDark ? 'rgba(13, 19, 29, 0.92)' : 'rgba(247, 249, 253, 0.94)',
      },
      text: {
        primary: isDark ? '#F1F5F9' : '#18202C',
        secondary: isDark ? '#94A3B8' : '#4B586C',
        disabled: isDark ? '#475569' : '#94A3B8',
      },
      divider: isDark ? 'rgba(148, 163, 184, 0.16)' : 'rgba(15, 23, 42, 0.08)',
    },
    typography: {
      fontFamily: '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif',
      monoFamily: '"JetBrains Mono", ui-monospace, monospace',
      h1: { fontSize: '2.25rem', fontWeight: 700, lineHeight: 1.2 },
      h2: { fontSize: '1.5rem', fontWeight: 600, lineHeight: 1.3 },
      body1: { fontSize: '0.9375rem', lineHeight: 1.6 },
      caption: { fontSize: '0.75rem', lineHeight: 1.4 },
    },
    shape: {
      borderRadius: 16,
      pillRadius: 9999,
      slabRadius: 24,
    },
    optics: {
      refraction,
      blurPx: 18,
      specularHighlight: true,
    },
  };
}

const PrismThemeContext = createContext<PrismTheme>(createPrismTheme('light', 'standard'));

export interface PrismThemeProviderProps {
  mode: ThemeMode;
  refraction: RefractionIntensity;
  children: React.ReactNode;
}

export const PrismThemeProvider: React.FC<PrismThemeProviderProps> = ({
  mode,
  refraction,
  children,
}) => {
  const theme = React.useMemo(() => createPrismTheme(mode, refraction), [mode, refraction]);

  useEffect(() => {
    const root = document.documentElement;
    if (mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    root.setAttribute('data-refraction', refraction);
  }, [mode, refraction]);

  return React.createElement(PrismThemeContext.Provider, { value: theme }, children);
};

export function usePrismTheme(): PrismTheme {
  return useContext(PrismThemeContext);
}
