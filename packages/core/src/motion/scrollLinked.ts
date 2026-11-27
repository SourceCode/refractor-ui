'use client';

import { useEffect, useState, type RefObject } from 'react';
import { supportsScrollTimeline } from './hybridEngine';

/**
 * Hardware-Accelerated Scroll-Linked Values (`useScrollProgress` / `scrollProgress`)
 *
 * Links glass blur intensity, parallax layers, reading progress bars, or timeline scrubbers
 * directly to window, container, or target-element scroll progress with configurable viewport
 * offsets and passive rAF throttling.
 */

export type ScrollOffsetEdge = 'start' | 'center' | 'end';

export interface ScrollProgressOptions {
  /** Scrollable container ref; omit to observe the window viewport. */
  container?: RefObject<HTMLElement | null>;
  /** Target element ref whose viewport traversal computes progress [0..1]. */
  target?: RefObject<HTMLElement | null>;
  /** Start/end viewport offset edges. Default: `['start', 'end']`. */
  offset?: readonly [ScrollOffsetEdge, ScrollOffsetEdge];
}

export interface ScrollProgressState {
  /** Normalized vertical scroll progress in [0..1]. */
  progressY: number;
  /** Normalized horizontal scroll progress in [0..1]. */
  progressX: number;
  /** Scroll top in pixels. */
  scrollY: number;
  /** Scroll left in pixels. */
  scrollX: number;
  /** True when the browser supports hardware ScrollTimeline offloading. */
  hardwareTimelineSupported: boolean;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function resolveOffsetFactor(edge: ScrollOffsetEdge): number {
  if (edge === 'start') return 0;
  if (edge === 'center') return 0.5;
  return 1;
}

/**
 * Maps a normalized scroll progress [0..1] across an input domain to an output range.
 */
export function mapScrollRange(
  progress: number,
  inputRange: readonly [number, number],
  outputRange: readonly [number, number]
): number {
  const [inMin, inMax] = inputRange;
  const [outMin, outMax] = outputRange;
  if (inMax === inMin) return outMin;
  const t = clamp01((progress - inMin) / (inMax - inMin));
  return outMin + (outMax - outMin) * t;
}

/**
 * Computes current scroll progress synchronously for a container, target, or window.
 */
export function measureScrollProgress(options: ScrollProgressOptions = {}): ScrollProgressState {
  const hardwareTimelineSupported = supportsScrollTimeline();
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { progressX: 0, progressY: 0, scrollX: 0, scrollY: 0, hardwareTimelineSupported };
  }

  const containerEl = options.container?.current ?? null;
  const targetEl = options.target?.current ?? null;

  if (targetEl) {
    const [startEdge, endEdge] = options.offset ?? ['start', 'end'];
    const viewportRect = containerEl
      ? containerEl.getBoundingClientRect()
      : { top: 0, height: window.innerHeight || 1, left: 0, width: window.innerWidth || 1 };
    const rect = targetEl.getBoundingClientRect();
    const startOffset = viewportRect.height * resolveOffsetFactor(startEdge);
    const endOffset = viewportRect.height * resolveOffsetFactor(endEdge);
    const startY = viewportRect.top + startOffset;
    const totalTravel = Math.max(1, rect.height + Math.abs(endOffset - startOffset));
    const progressY = clamp01((startY - rect.top) / totalTravel);
    return {
      progressY,
      progressX: 0,
      scrollY: containerEl ? containerEl.scrollTop : window.scrollY,
      scrollX: containerEl ? containerEl.scrollLeft : window.scrollX,
      hardwareTimelineSupported,
    };
  }

  if (containerEl) {
    const maxY = Math.max(0, containerEl.scrollHeight - containerEl.clientHeight);
    const maxX = Math.max(0, containerEl.scrollWidth - containerEl.clientWidth);
    return {
      progressY: maxY > 0 ? clamp01(containerEl.scrollTop / maxY) : 0,
      progressX: maxX > 0 ? clamp01(containerEl.scrollLeft / maxX) : 0,
      scrollY: containerEl.scrollTop,
      scrollX: containerEl.scrollLeft,
      hardwareTimelineSupported,
    };
  }

  const docEl = document.documentElement;
  const maxY = Math.max(0, docEl.scrollHeight - window.innerHeight);
  const maxX = Math.max(0, docEl.scrollWidth - window.innerWidth);
  return {
    progressY: maxY > 0 ? clamp01(window.scrollY / maxY) : 0,
    progressX: maxX > 0 ? clamp01(window.scrollX / maxX) : 0,
    scrollY: window.scrollY,
    scrollX: window.scrollX,
    hardwareTimelineSupported,
  };
}

/**
 * Imperative scroll listener binding a callback to normalized scroll progress.
 * Returns a cleanup unsubscribe function.
 */
export function scrollProgress(
  onProgress: (state: ScrollProgressState) => void,
  options: ScrollProgressOptions = {}
): () => void {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  let rafId: number | null = null;
  const emit = () => {
    rafId = null;
    onProgress(measureScrollProgress(options));
  };

  const schedule = () => {
    if (rafId !== null) return;
    if (typeof window.requestAnimationFrame === 'function') {
      rafId = window.requestAnimationFrame(emit);
    } else {
      emit();
    }
  };

  const eventTarget: EventTarget = options.container?.current ?? window;
  eventTarget.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  emit();

  return () => {
    eventTarget.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', schedule);
    if (rafId !== null && typeof window.cancelAnimationFrame === 'function') {
      window.cancelAnimationFrame(rafId);
    }
  };
}

/**
 * React hook returning live rAF-coalesced scroll progress for window, container, or target.
 */
export function useScrollProgress(options: ScrollProgressOptions = {}): ScrollProgressState {
  const [state, setState] = useState<ScrollProgressState>(() => measureScrollProgress(options));
  const container = options.container;
  const target = options.target;
  const offsetStart = options.offset?.[0] ?? 'start';
  const offsetEnd = options.offset?.[1] ?? 'end';

  useEffect(() => {
    return scrollProgress(setState, {
      container,
      target,
      offset: [offsetStart, offsetEnd],
    });
  }, [container, target, offsetStart, offsetEnd]);

  return state;
}
