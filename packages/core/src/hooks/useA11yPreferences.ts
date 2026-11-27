'use client';

import { useEffect, useState } from 'react';

/**
 * OS Accessibility Preferences Hook (`useA11yPreferences`)
 *
 * Tracks `prefers-reduced-transparency: reduce`, `prefers-contrast: more`,
 * and `prefers-reduced-motion: reduce` reactively.
 */

export interface A11yPreferences {
  readonly prefersReducedTransparency: boolean;
  readonly prefersHighContrast: boolean;
  readonly prefersReducedMotion: boolean;
}

function queryMatch(query: string): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia(query).matches;
}

export function readA11yPreferences(): A11yPreferences {
  return {
    prefersReducedTransparency: queryMatch('(prefers-reduced-transparency: reduce)'),
    prefersHighContrast: queryMatch('(prefers-contrast: more)'),
    prefersReducedMotion: queryMatch('(prefers-reduced-motion: reduce)'),
  };
}

export function useA11yPreferences(): A11yPreferences {
  const [prefs, setPrefs] = useState<A11yPreferences>(readA11yPreferences);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const queries = [
      window.matchMedia('(prefers-reduced-transparency: reduce)'),
      window.matchMedia('(prefers-contrast: more)'),
      window.matchMedia('(prefers-reduced-motion: reduce)'),
    ];

    const sync = () => setPrefs(readA11yPreferences());
    sync();

    for (const mq of queries) {
      if (typeof mq.addEventListener === 'function') {
        mq.addEventListener('change', sync);
      }
    }

    return () => {
      for (const mq of queries) {
        if (typeof mq.removeEventListener === 'function') {
          mq.removeEventListener('change', sync);
        }
      }
    };
  }, []);

  return prefs;
}
