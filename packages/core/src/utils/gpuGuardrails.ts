'use client';

import { useCallback, useState } from 'react';

/**
 * Automatic Tiered GPU & Shader Fallbacks (`gpuGuardrails.ts`)
 *
 * Gracefully steps down from:
 * `'webgl-refraction'` -> `'css-backdrop'` -> `'flat-opaque'`
 * based on device hardware hints, battery-saver, reduced-motion, or sustained frame drops.
 */

export type GpuRenderTier = 'webgl-refraction' | 'css-backdrop' | 'flat-opaque';

export interface GpuDeviceHints {
  hardwareConcurrency?: number;
  deviceMemoryGb?: number;
  saveData?: boolean;
  prefersReducedMotion?: boolean;
  prefersReducedTransparency?: boolean;
  webglSupported?: boolean;
}

interface NavigatorWithDeviceHints {
  deviceMemory?: number;
  connection?: {
    saveData?: boolean;
  };
}

/** Reads safe hardware/preference hints from the browser environment. */
export function readBrowserGpuHints(): GpuDeviceHints {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { webglSupported: false };
  }
  const nav = navigator as Navigator & NavigatorWithDeviceHints;
  const mq = typeof window.matchMedia === 'function' ? window.matchMedia.bind(window) : null;
  return {
    hardwareConcurrency: navigator.hardwareConcurrency,
    deviceMemoryGb: nav.deviceMemory,
    saveData: Boolean(nav.connection?.saveData),
    prefersReducedMotion: mq ? mq('(prefers-reduced-motion: reduce)').matches : false,
    prefersReducedTransparency: mq ? mq('(prefers-reduced-transparency: reduce)').matches : false,
    webglSupported: typeof WebGLRenderingContext !== 'undefined',
  };
}

/** Detects the optimal initial GPU rendering tier from device capabilities. */
export function detectGpuCapabilityTier(hints: GpuDeviceHints = readBrowserGpuHints()): GpuRenderTier {
  if (hints.prefersReducedTransparency || hints.saveData) {
    return 'flat-opaque';
  }
  const lowCores = hints.hardwareConcurrency !== undefined && hints.hardwareConcurrency <= 2;
  const lowMem = hints.deviceMemoryGb !== undefined && hints.deviceMemoryGb <= 2;
  if (lowCores || lowMem || hints.prefersReducedMotion || hints.webglSupported === false) {
    return 'css-backdrop';
  }
  return 'webgl-refraction';
}

/** Steps down one tier when sustained frame drops or thermal throttling are detected. */
export function stepDownGpuTier(current: GpuRenderTier): GpuRenderTier {
  if (current === 'webgl-refraction') return 'css-backdrop';
  return 'flat-opaque';
}

export interface GpuGuardrailState {
  readonly tier: GpuRenderTier;
  readonly reportFrameTime: (frameMs: number) => void;
  readonly resetTier: () => void;
}

/**
 * React hook managing automatic GPU tier step-down when consecutive frames exceed
 * the frame budget (default: 3 consecutive frames > 28ms).
 */
export function useGpuPerformanceGuardrail(
  initialHints?: GpuDeviceHints,
  frameBudgetMs = 28,
  consecutiveThreshold = 3
): GpuGuardrailState {
  const [tier, setTier] = useState<GpuRenderTier>(() => detectGpuCapabilityTier(initialHints));
  const [slowStreak, setSlowStreak] = useState(0);

  const reportFrameTime = useCallback(
    (frameMs: number) => {
      if (!Number.isFinite(frameMs)) return;
      if (frameMs > frameBudgetMs) {
        const nextStreak = slowStreak + 1;
        if (nextStreak >= consecutiveThreshold) {
          setTier((prev) => stepDownGpuTier(prev));
          setSlowStreak(0);
        } else {
          setSlowStreak(nextStreak);
        }
      } else if (slowStreak > 0) {
        setSlowStreak(0);
      }
    },
    [consecutiveThreshold, frameBudgetMs, slowStreak]
  );

  const resetTier = useCallback(() => {
    setSlowStreak(0);
    setTier(detectGpuCapabilityTier(initialHints));
  }, [initialHints]);

  return { tier, reportFrameTime, resetTier };
}
