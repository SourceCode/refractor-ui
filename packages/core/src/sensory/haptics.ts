'use client';

import { useCallback } from 'react';

/**
 * Haptic Feedback Hooks (`sensory/haptics.ts`)
 *
 * Triggers light, medium, rigid, selection, success, and error tactile pulses
 * on supported touch devices and trackpads via `navigator.vibrate`.
 */

export type HapticPatternName = 'light' | 'medium' | 'rigid' | 'selection' | 'success' | 'error';

export const HAPTIC_PATTERNS: Readonly<Record<HapticPatternName, ReadonlyArray<number>>> =
  /*#__PURE__*/ Object.freeze({
    light: Object.freeze([8]),
    medium: Object.freeze([18]),
    rigid: Object.freeze([28]),
    selection: Object.freeze([6]),
    success: Object.freeze([12, 36, 18]),
    error: Object.freeze([24, 28, 24, 28, 36]),
  });

export function isHapticsSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

/** Triggers a named haptic pulse pattern if supported by the current device. */
export function triggerHaptic(pattern: HapticPatternName): boolean {
  if (!isHapticsSupported()) return false;
  const seq = HAPTIC_PATTERNS[pattern];
  try {
    return navigator.vibrate([...seq]);
  } catch {
    return false;
  }
}

export interface UseHapticsOptions {
  enabled?: boolean;
}

export function useHaptics(options: UseHapticsOptions = {}) {
  const { enabled = true } = options;

  const pulse = useCallback(
    (pattern: HapticPatternName): boolean => {
      if (!enabled) return false;
      return triggerHaptic(pattern);
    },
    [enabled]
  );

  return {
    supported: isHapticsSupported(),
    pulse,
    light: useCallback(() => pulse('light'), [pulse]),
    medium: useCallback(() => pulse('medium'), [pulse]),
    rigid: useCallback(() => pulse('rigid'), [pulse]),
    selection: useCallback(() => pulse('selection'), [pulse]),
    success: useCallback(() => pulse('success'), [pulse]),
    error: useCallback(() => pulse('error'), [pulse]),
  };
}
