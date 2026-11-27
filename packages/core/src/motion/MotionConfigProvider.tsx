'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  createMotionTheme,
  MOTION_THEME,
  type MotionThemeOverrides,
  type MotionTokenName,
  type MotionTokenSpec,
  type SemanticMotionTheme,
} from './motion.theme';

/**
 * Calm Reduced-Motion Mode (`reducedMotion: 'calm'`) & Semantic Motion Context
 *
 * When `reducedMotion="calm"` is active (or OS `prefers-reduced-motion: reduce` matches
 * under `'user'`), spatial transforms are disabled while subtle opacity fades remain enabled.
 */

export type ReducedMotionPolicy = 'user' | 'calm' | 'always' | 'never';

export interface MotionConfigContextValue {
  readonly theme: SemanticMotionTheme;
  readonly reducedMotion: ReducedMotionPolicy;
  /** True when spatial transforms should be suppressed in favor of calm opacity transitions. */
  readonly isCalmMotion: boolean;
  /** Helper returning the active semantic motion token spec. */
  readonly getToken: (name: MotionTokenName) => MotionTokenSpec;
}

const DEFAULT_MOTION_CONTEXT: MotionConfigContextValue = /*#__PURE__*/ Object.freeze({
  theme: MOTION_THEME,
  reducedMotion: 'user',
  isCalmMotion: false,
  getToken: (name: MotionTokenName) => MOTION_THEME[name],
});

const MotionConfigContext = /*#__PURE__*/ createContext<MotionConfigContextValue>(
  DEFAULT_MOTION_CONTEXT
);

export interface MotionConfigProviderProps {
  /** Reduced-motion behavior: `'user'` (OS media query -> calm), `'calm'` (always calm), `'always'`, or `'never'`. */
  reducedMotion?: ReducedMotionPolicy;
  /** Optional custom semantic motion theme or partial overrides. */
  theme?: SemanticMotionTheme | MotionThemeOverrides;
  /** When true, stamps `data-refractor-motion="calm" | "full"` on documentElement. */
  syncDocumentAttribute?: boolean;
  children: ReactNode;
}

function isFullSemanticTheme(
  candidate: SemanticMotionTheme | MotionThemeOverrides
): candidate is SemanticMotionTheme {
  const snap = candidate.snap;
  return Boolean(snap && 'compiled' in snap && 'cssEasing' in snap);
}

function readOsReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function MotionConfigProvider({
  reducedMotion = 'user',
  theme,
  syncDocumentAttribute = false,
  children,
}: MotionConfigProviderProps) {
  const [osPrefersReduced, setOsPrefersReduced] = useState<boolean>(readOsReducedMotion);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => setOsPrefersReduced(mq.matches);
    handleChange();
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', handleChange);
      return () => mq.removeEventListener('change', handleChange);
    }
    return undefined;
  }, []);

  const resolvedTheme = useMemo<SemanticMotionTheme>(() => {
    if (!theme) return MOTION_THEME;
    return isFullSemanticTheme(theme) ? theme : createMotionTheme(theme);
  }, [theme]);

  const isCalmMotion =
    reducedMotion === 'calm' ||
    reducedMotion === 'always' ||
    (reducedMotion === 'user' && osPrefersReduced);

  useEffect(() => {
    if (!syncDocumentAttribute || typeof document === 'undefined') return;
    document.documentElement.setAttribute(
      'data-refractor-motion',
      isCalmMotion ? 'calm' : 'full'
    );
    return () => {
      document.documentElement.removeAttribute('data-refractor-motion');
    };
  }, [isCalmMotion, syncDocumentAttribute]);

  const value = useMemo<MotionConfigContextValue>(
    () => ({
      theme: resolvedTheme,
      reducedMotion,
      isCalmMotion,
      getToken: (name: MotionTokenName) => resolvedTheme[name],
    }),
    [resolvedTheme, reducedMotion, isCalmMotion]
  );

  return <MotionConfigContext value={value}>{children}</MotionConfigContext>;
}

/** Reads the active semantic motion theme and calm reduced-motion state. */
export function useMotionConfig(): MotionConfigContextValue {
  return useContext(MotionConfigContext);
}
