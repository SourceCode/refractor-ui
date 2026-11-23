'use client';

import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';
import type { OpticalStyleTokens } from '../BaseProps';
import { createPrismTheme, themeToCssVariables } from './createPrismTheme';
import { isDefinedPrismTheme, isResolvedPrismTheme, resolveDefinedTheme } from './defineTheme';
import { ensureThemeFontsLoaded } from './fonts';
import type {
  ComponentOverridesMap,
  ComponentStyleOverride,
  DefinedPrismTheme,
  PrismTheme,
  PrismThemeOptions,
  RefractionIntensity,
  ThemeMode,
  ThemePerformanceMode,
} from './types';

const DEFAULT_THEME = createPrismTheme('light', 'standard');
const EMPTY_COMPONENT_OVERRIDES: ComponentOverridesMap = Object.freeze({});

const PrismThemeContext = createContext<PrismTheme>(DEFAULT_THEME);
/**
 * Dedicated context for `theme.components` overrides so components calling
 * `useComponentOverride()` do NOT re-render on color-mode, refraction, or theme
 * switches when component-level class/style overrides have not changed.
 */
const PrismComponentOverridesContext = createContext<ComponentOverridesMap>(
  EMPTY_COMPONENT_OVERRIDES
);

function areStyleMapsEqual(
  a?: OpticalStyleTokens,
  b?: OpticalStyleTokens
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (let i = 0; i < keysA.length; i += 1) {
    const k = keysA[i] as keyof OpticalStyleTokens;
    if (a[k] !== b[k]) return false;
  }
  return true;
}

function areComponentOverridesEqual(
  a: ComponentOverridesMap,
  b: ComponentOverridesMap
): boolean {
  if (a === b) return true;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (let i = 0; i < keysA.length; i += 1) {
    const key = keysA[i]!;
    const valA = a[key];
    const valB = b[key];
    if (!valA || !valB) return false;
    if (valA.className !== valB.className) return false;
    if (!areStyleMapsEqual(valA.style, valB.style)) return false;
  }
  return true;
}

export interface PrismThemeProviderProps {
  /** Resolved PrismTheme, DefinedPrismTheme, or ergonomic PrismThemeOptions. */
  theme?: PrismTheme | DefinedPrismTheme | PrismThemeOptions;
  /** Optional shorthand color mode override ('light' | 'dark'). */
  mode?: ThemeMode;
  /** Optional shorthand optical dispersion override ('subtle' | 'standard' | 'vivid'). */
  refraction?: RefractionIntensity;
  /**
   * GPU compositing performance profile:
   * - `'balanced'` (default): eliminates redundant nested backdrop blurs and enables safe CSS containment.
   * - `'high'`: caps blur radius to 8px and simplifies multi-layer caustic shadows for dense dashboards.
   * - `'max'`: disables all backdrop-filter passes and decorative FX for maximum 120fps throughput.
   */
  performanceMode?: ThemePerformanceMode;
  /**
   * 'root' injects CSS custom properties & material/FX data attributes onto document.documentElement (default).
   * 'local' wraps children in a scoped container with cascade tokens (supports nested themes).
   */
  scope?: 'root' | 'local';
  /**
   * Automatically lazy-load any Google Font families declared by the active theme (default: true).
   * Set to false for offline or self-hosted typography setups.
   */
  loadFonts?: boolean;
  className?: string;
  children: ReactNode;
}

export function PrismThemeProvider({
  theme: themeProp,
  mode,
  refraction,
  performanceMode = 'balanced',
  scope = 'root',
  loadFonts = true,
  className,
  children,
}: PrismThemeProviderProps) {
  const previousRootVarsRef = useRef<Map<string, string>>(new Map());
  const previousOverridesRef = useRef<ComponentOverridesMap>(EMPTY_COMPONENT_OVERRIDES);

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
        displayName: themeProp.displayName,
        description: themeProp.description,
        category: themeProp.category,
        material: themeProp.material,
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
        fx: themeProp.fx,
        motion: themeProp.motion,
        editor: themeProp.editor,
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

  const stableOverrides = useMemo<ComponentOverridesMap>(() => {
    const next = resolvedTheme.components;
    if (Object.keys(next).length === 0) {
      previousOverridesRef.current = EMPTY_COMPONENT_OVERRIDES;
      return EMPTY_COMPONENT_OVERRIDES;
    }
    if (areComponentOverridesEqual(previousOverridesRef.current, next)) {
      return previousOverridesRef.current;
    }
    previousOverridesRef.current = next;
    return next;
  }, [resolvedTheme.components]);

  const cssVars = useMemo(() => themeToCssVariables(resolvedTheme), [resolvedTheme]);

  useEffect(() => {
    if (!loadFonts || resolvedTheme.typography.googleFonts.length === 0) return;
    ensureThemeFontsLoaded(resolvedTheme.typography.googleFonts);
  }, [loadFonts, resolvedTheme.typography.googleFonts]);

  useEffect(() => {
    if (scope !== 'root' || typeof document === 'undefined') return;
    const root = document.documentElement;
    const isDark = resolvedTheme.palette.mode === 'dark';
    if (root.classList.contains('dark') !== isDark) {
      root.classList.toggle('dark', isDark);
    }

    const attrs: ReadonlyArray<readonly [string, string]> = [
      ['data-color-mode', resolvedTheme.palette.mode],
      ['data-refraction', resolvedTheme.optics.refraction],
      ['data-refractor-theme', resolvedTheme.name],
      ['data-refractor-material', resolvedTheme.material],
      ['data-refractor-fx', resolvedTheme.fx.wallpaperOverlay],
      ['data-refractor-controls-layout', resolvedTheme.fx.controlsLayout],
      ['data-refractor-theme-adaptive', resolvedTheme.fx.adaptiveInk ? 'true' : 'false'],
      ['data-refractor-sharp', resolvedTheme.fx.sharpCorners ? 'true' : 'false'],
      ['data-refractor-performance', performanceMode],
    ];

    for (let i = 0; i < attrs.length; i += 1) {
      const [attrName, attrVal] = attrs[i]!;
      if (root.getAttribute(attrName) !== attrVal) {
        root.setAttribute(attrName, attrVal);
      }
    }

    const prevMap = previousRootVarsRef.current;
    const nextMap = new Map<string, string>();
    for (const prop in cssVars) {
      if (!Object.prototype.hasOwnProperty.call(cssVars, prop)) continue;
      const val = cssVars[prop as `--prism-${string}`];
      if (val === undefined) continue;
      nextMap.set(prop, val);
      if (prevMap.get(prop) !== val || root.style.getPropertyValue(prop) !== val) {
        root.style.setProperty(prop, val);
      }
    }
    for (const prevKey of prevMap.keys()) {
      if (!nextMap.has(prevKey)) {
        root.style.removeProperty(prevKey);
      }
    }
    previousRootVarsRef.current = nextMap;
  }, [cssVars, performanceMode, resolvedTheme, scope]);

  const localStyle = useMemo<OpticalStyleTokens>(
    () => ({
      ...cssVars,
      fontFamily: resolvedTheme.typography.fontFamily,
      color: resolvedTheme.palette.text.primary,
    }),
    [cssVars, resolvedTheme.palette.text.primary, resolvedTheme.typography.fontFamily]
  );

  const localClassName = useMemo(() => {
    const darkClass = resolvedTheme.palette.mode === 'dark' ? 'dark' : '';
    if (darkClass && className) return `${darkClass} ${className}`;
    return darkClass || className || '';
  }, [className, resolvedTheme.palette.mode]);

  if (scope === 'local') {
    return (
      <PrismThemeContext.Provider value={resolvedTheme}>
        <PrismComponentOverridesContext.Provider value={stableOverrides}>
          <div
            data-color-mode={resolvedTheme.palette.mode}
            data-refraction={resolvedTheme.optics.refraction}
            data-refractor-theme={resolvedTheme.name}
            data-refractor-material={resolvedTheme.material}
            data-refractor-fx={resolvedTheme.fx.wallpaperOverlay}
            data-refractor-controls-layout={resolvedTheme.fx.controlsLayout}
            data-refractor-theme-adaptive={resolvedTheme.fx.adaptiveInk ? 'true' : 'false'}
            data-refractor-sharp={resolvedTheme.fx.sharpCorners ? 'true' : 'false'}
            data-refractor-performance={performanceMode}
            className={localClassName}
            style={localStyle}
          >
            {children}
          </div>
        </PrismComponentOverridesContext.Provider>
      </PrismThemeContext.Provider>
    );
  }

  return (
    <PrismThemeContext.Provider value={resolvedTheme}>
      <PrismComponentOverridesContext.Provider value={stableOverrides}>
        {children}
      </PrismComponentOverridesContext.Provider>
    </PrismThemeContext.Provider>
  );
}

PrismThemeProvider.displayName = 'PrismThemeProvider';

export function usePrismTheme(): PrismTheme {
  return useContext(PrismThemeContext);
}

export function useComponentOverride(componentName: string): ComponentStyleOverride | undefined {
  const overrides = useContext(PrismComponentOverridesContext);
  return overrides[componentName];
}
