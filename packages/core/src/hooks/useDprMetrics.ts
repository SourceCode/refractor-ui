'use client';

import { useEffect, useState } from 'react';

/**
 * Sub-Pixel & DPR Scaling Utilities (`useDprMetrics`)
 *
 * Locks glass borders, hairlines, and shader uniforms to `window.devicePixelRatio`
 * so thin specular highlights stay razor-sharp on Retina/4K displays without shimmering.
 */

export interface DprMetrics {
  /** Current clamped device pixel ratio (>= 1). */
  readonly dpr: number;
  /** Effective shader DPR capped to prevent excessive fill-rate (default cap: 2). */
  readonly shaderDpr: number;
  /** Razor-sharp 1 physical pixel hairline width in CSS pixels (e.g. `0.5px` on 2x). */
  readonly hairlinePx: number;
}

/** Reads the current safe device pixel ratio (>= 1). */
export function getSafeDevicePixelRatio(): number {
  if (typeof window === 'undefined' || !Number.isFinite(window.devicePixelRatio)) {
    return 1;
  }
  return Math.max(1, window.devicePixelRatio);
}

/** Snaps a CSS pixel coordinate to the nearest physical device pixel boundary. */
export function snapToDevicePixel(cssPx: number, dpr = getSafeDevicePixelRatio()): number {
  if (!Number.isFinite(cssPx)) return 0;
  const safeDpr = Math.max(1, Number.isFinite(dpr) ? dpr : 1);
  return Math.round(cssPx * safeDpr) / safeDpr;
}

/** Returns the exact CSS pixel width of 1 physical device pixel (minimum 0.33px). */
export function getHairlineWidthPx(dpr = getSafeDevicePixelRatio()): number {
  const safeDpr = Math.max(1, Number.isFinite(dpr) ? dpr : 1);
  return Number(Math.max(0.33, 1 / safeDpr).toFixed(3));
}

export function useDprMetrics(maxShaderDpr = 2): DprMetrics {
  const [dpr, setDpr] = useState<number>(getSafeDevicePixelRatio);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => setDpr(getSafeDevicePixelRatio());
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    dpr,
    shaderDpr: Math.min(maxShaderDpr, dpr),
    hairlinePx: getHairlineWidthPx(dpr),
  };
}
