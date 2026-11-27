'use client';

import { useEffect, useState, type RefObject } from 'react';
import { isDocumentVisible } from './useRafCallback';

/**
 * Viewport & Focus Shader Pausing Hook (`useViewportVisibilityPause`)
 *
 * Combines IntersectionObserver, Page Visibility (`visibilitychange`), and optional
 * window blur/focus listeners so off-screen or background-tab shaders drop to zero work.
 */

export interface ViewportVisibilityState {
  readonly isInViewport: boolean;
  readonly isDocumentVisible: boolean;
  readonly isWindowFocused: boolean;
  /** True only when all active visibility gates pass and shaders/loops should run. */
  readonly shouldRun: boolean;
}

export interface UseViewportVisibilityOptions {
  /** Also pause when the browser window loses focus (default: false). */
  pauseOnWindowBlur?: boolean;
  /** IntersectionObserver rootMargin (default: `'64px'`). */
  rootMargin?: string;
}

export function useViewportVisibilityPause(
  targetRef: RefObject<Element | null>,
  options: UseViewportVisibilityOptions = {}
): ViewportVisibilityState {
  const { pauseOnWindowBlur = false, rootMargin = '64px' } = options;
  const [inViewport, setInViewport] = useState(true);
  const [docVisible, setDocVisible] = useState<boolean>(() => isDocumentVisible());
  const [winFocused, setWinFocused] = useState<boolean>(true);

  useEffect(() => {
    const el = targetRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) {
          setInViewport(entry.isIntersecting);
        }
      },
      { rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [targetRef, rootMargin]);

  useEffect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;

    const onVisChange = () => setDocVisible(isDocumentVisible());
    const onFocus = () => setWinFocused(true);
    const onBlur = () => setWinFocused(false);

    document.addEventListener('visibilitychange', onVisChange);
    window.addEventListener('focus', onFocus);
    window.addEventListener('blur', onBlur);

    return () => {
      document.removeEventListener('visibilitychange', onVisChange);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  const shouldRun = inViewport && docVisible && (!pauseOnWindowBlur || winFocused);

  return {
    isInViewport: inViewport,
    isDocumentVisible: docVisible,
    isWindowFocused: winFocused,
    shouldRun,
  };
}
