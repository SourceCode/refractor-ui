import { MOTION_THEME, type MotionTokenName } from './motion.theme';

/**
 * Hardware-Accelerated Hybrid Animation Engine
 *
 * Offloads eligible compositor properties (`transform`, `opacity`, `clip-path`, `filter`)
 * to the browser's native Web Animations API (WAAPI) and `ScrollTimeline` when available,
 * while gracefully falling back to calm opacity fades or synchronous style application
 * in headless/SSR/reduced-motion environments.
 */

const COMPOSITOR_PROPERTIES = new Set<string>([
  'transform',
  'opacity',
  'clipPath',
  'clip-path',
  'filter',
  'translate',
  'scale',
  'rotate',
]);

export type HybridEngineBackend = 'waapi' | 'scroll-timeline' | 'calm-opacity' | 'style-fallback';

export interface HybridKeyframe {
  transform?: string;
  opacity?: number;
  clipPath?: string;
  borderRadius?: string;
  boxShadow?: string;
  offset?: number;
}

export interface HybridAnimateOptions {
  /** Semantic motion token (default: `'ui'`). */
  token?: MotionTokenName;
  /** Override duration in ms. */
  durationMs?: number;
  /** Override CSS easing string. */
  easing?: string;
  /** Delay in ms. */
  delayMs?: number;
  /** Fill mode (default: `'both'`). */
  fill?: FillMode;
  /** When true, strips spatial transforms and preserves only calm opacity transition. */
  calmReducedMotion?: boolean;
  /** Optional scroll container to bind a native ScrollTimeline when supported. */
  scrollSource?: HTMLElement | null;
}

export interface HybridAnimationHandle {
  readonly backend: HybridEngineBackend;
  readonly finished: Promise<void>;
  cancel: () => void;
  finish: () => void;
}

interface ScrollTimelineInit {
  source?: Element | null;
  axis?: 'block' | 'inline' | 'x' | 'y';
}

interface ScrollTimelineConstructor {
  new (options?: ScrollTimelineInit): AnimationTimeline;
}

interface WindowWithScrollTimeline {
  ScrollTimeline?: ScrollTimelineConstructor;
}

/** Returns true if a CSS property can be animated on the browser compositor thread. */
export function isCompositorProperty(propertyName: string): boolean {
  return COMPOSITOR_PROPERTIES.has(propertyName);
}

/** Returns true if the current environment supports the Web Animations API. */
export function supportsWaapi(element?: Element | null): boolean {
  if (element) {
    return typeof element.animate === 'function';
  }
  return typeof Element !== 'undefined' && typeof Element.prototype.animate === 'function';
}

/** Returns true if the browser natively supports CSS `ScrollTimeline`. */
export function supportsScrollTimeline(): boolean {
  if (typeof window === 'undefined') return false;
  const win = window as Window & WindowWithScrollTimeline;
  return typeof win.ScrollTimeline === 'function';
}

function sanitizeKeyframesForCalmMode(keyframes: ReadonlyArray<HybridKeyframe>): HybridKeyframe[] {
  return keyframes.map((frame, index) => {
    const fallbackOpacity = index === 0 ? 0.01 : 1;
    return {
      opacity: frame.opacity ?? fallbackOpacity,
      ...(frame.offset !== undefined ? { offset: frame.offset } : {}),
    };
  });
}

function applyFinalStyle(element: HTMLElement, frame: HybridKeyframe | undefined): void {
  if (!frame) return;
  if (frame.transform !== undefined) element.style.transform = frame.transform;
  if (frame.opacity !== undefined) element.style.opacity = String(frame.opacity);
  if (frame.clipPath !== undefined) element.style.clipPath = frame.clipPath;
  if (frame.borderRadius !== undefined) element.style.borderRadius = frame.borderRadius;
  if (frame.boxShadow !== undefined) element.style.boxShadow = frame.boxShadow;
}

/**
 * Runs a hybrid hardware-accelerated animation on `element`.
 */
export function animateHybrid(
  element: HTMLElement,
  keyframes: ReadonlyArray<HybridKeyframe>,
  options: HybridAnimateOptions = {}
): HybridAnimationHandle {
  const tokenSpec = MOTION_THEME[options.token ?? 'ui'];
  const calm = Boolean(options.calmReducedMotion);
  const duration = calm ? tokenSpec.calmOpacityMs : (options.durationMs ?? tokenSpec.durationMs);
  const easing = calm ? 'ease-out' : (options.easing ?? tokenSpec.cssEasing);
  const effectiveFrames = calm
    ? sanitizeKeyframesForCalmMode(keyframes)
    : keyframes.map((frame) => ({ ...frame }));

  if (!supportsWaapi(element)) {
    const finalFrame = effectiveFrames[effectiveFrames.length - 1];
    applyFinalStyle(element, finalFrame);
    return {
      backend: calm ? 'calm-opacity' : 'style-fallback',
      finished: Promise.resolve(),
      cancel: () => undefined,
      finish: () => applyFinalStyle(element, finalFrame),
    };
  }

  let backend: HybridEngineBackend = calm ? 'calm-opacity' : 'waapi';
  const timing: KeyframeAnimationOptions & { timeline?: AnimationTimeline } = {
    duration,
    easing,
    delay: options.delayMs ?? 0,
    fill: options.fill ?? 'both',
  };

  if (!calm && options.scrollSource && supportsScrollTimeline()) {
    const win = window as Window & WindowWithScrollTimeline;
    const Ctor = win.ScrollTimeline;
    if (Ctor) {
      timing.timeline = new Ctor({ source: options.scrollSource, axis: 'block' });
      backend = 'scroll-timeline';
    }
  }

  const anim = element.animate(effectiveFrames as Keyframe[], timing);
  const finished = anim.finished
    ? anim.finished.then(() => undefined).catch(() => undefined)
    : Promise.resolve();

  return {
    backend,
    finished,
    cancel: () => {
      try {
        anim.cancel();
      } catch {
        // Ignore already-cancelled animation handles in synthetic runtimes
      }
    },
    finish: () => {
      try {
        anim.finish();
      } catch {
        applyFinalStyle(element, effectiveFrames[effectiveFrames.length - 1]);
      }
    },
  };
}
