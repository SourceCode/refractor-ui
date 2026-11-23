import { useCallback, useEffect, useRef } from 'react';

export interface RafThrottleController<A extends ReadonlyArray<number | string | boolean | object | null | undefined>> {
  (...args: A): void;
  cancel: () => void;
  flush: () => void;
}

/**
 * Coalesces high-frequency pointermove / scroll / resize callbacks to at most one
 * trailing animation frame while executing the leading call immediately for zero-latency
 * interactivity and synchronous test compatibility.
 */
export function useRafCallback<A extends ReadonlyArray<number | string | boolean | object | null | undefined>>(
  callback: (...args: A) => void
): RafThrottleController<A> {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const rafIdRef = useRef<number | null>(null);
  const pendingArgsRef = useRef<A | null>(null);

  const cancel = useCallback(() => {
    if (rafIdRef.current !== null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(rafIdRef.current);
    }
    rafIdRef.current = null;
    pendingArgsRef.current = null;
  }, []);

  const flush = useCallback(() => {
    if (rafIdRef.current !== null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    const args = pendingArgsRef.current;
    pendingArgsRef.current = null;
    if (args !== null) {
      callbackRef.current(...args);
    }
  }, []);

  useEffect(() => cancel, [cancel]);

  const invoke = useCallback((...args: A) => {
    if (typeof requestAnimationFrame !== 'function') {
      callbackRef.current(...args);
      return;
    }
    if (rafIdRef.current === null) {
      callbackRef.current(...args);
      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;
        const queued = pendingArgsRef.current;
        pendingArgsRef.current = null;
        if (queued !== null) {
          callbackRef.current(...queued);
        }
      });
    } else {
      pendingArgsRef.current = args;
    }
  }, []) as RafThrottleController<A>;

  invoke.cancel = cancel;
  invoke.flush = flush;
  return invoke;
}

export interface CoalescedPointerMoveListener {
  (event: PointerEvent): void;
  cancel: () => void;
}

/**
 * Wraps a window `pointermove` listener with 60fps `requestAnimationFrame` coalescing
 * for real high-polling-rate (120Hz–1000Hz) browser pointer streams (`event.isTrusted`)
 * while executing synthetic/programmatic events immediately for deterministic latency.
 */
export function createCoalescedPointerMove(
  handler: (event: PointerEvent) => void
): CoalescedPointerMoveListener {
  let rafId: number | null = null;
  let pendingEvent: PointerEvent | null = null;

  const cancel = () => {
    if (rafId !== null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(rafId);
    }
    rafId = null;
    pendingEvent = null;
  };

  const listener = ((event: PointerEvent) => {
    if (!event.isTrusted || typeof requestAnimationFrame !== 'function') {
      handler(event);
      return;
    }
    if (rafId === null) {
      handler(event);
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const queued = pendingEvent;
        pendingEvent = null;
        if (queued !== null) {
          handler(queued);
        }
      });
    } else {
      pendingEvent = event;
    }
  }) as CoalescedPointerMoveListener;

  listener.cancel = cancel;
  return listener;
}

/**
 * Returns true when the current browser tab is visible, avoiding wasted background
 * interval ticks when a tab is hidden or minimized.
 */
export function isDocumentVisible(): boolean {
  return typeof document === 'undefined' || document.visibilityState !== 'hidden';
}
