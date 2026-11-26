'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import type { BaseProps } from '../BaseProps';
import { useMergedRefs } from '../hooks/useMergedRefs';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { memoWithDisplayName } from '../utils/memo';
import { mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';
import { clampFinite, useOpticalShader } from '../utils/webglShader';

export interface RippleOriginEvent {
  x: number;
  y: number;
  normalizedX: number;
  normalizedY: number;
}

interface RippleWaveItem {
  id: number;
  xPx: number;
  yPx: number;
  sizePx: number;
}

export interface LiquidRippleTriggerProps extends BaseProps<HTMLDivElement> {
  /** Shockwave ripple intensity [0..1.5]. */
  intensity?: number;
  /** Ripple propagation duration in milliseconds (clamped 250–1800). */
  durationMs?: number;
  /** Maximum simultaneous DOM ripple rings retained (clamped 1–4). */
  maxRipples?: number;
  /** Callback fired with click/keyboard origin when a shockwave launches. */
  onRipple?: (origin: RippleOriginEvent) => void;
  /** Disables ripple triggering. */
  disabled?: boolean;
  /** Forces pure CSS shockwave ring mode without WebGL canvas. */
  disableWebGL?: boolean;
  /** Interactive button, card, or workspace surface receiving shockwaves. */
  children?: ReactNode;
}

const RIPPLE_GL_CLASS = /*#__PURE__*/ stableClassName('liquid-ripple-trigger', 'gl');
const RIPPLE_WAVE_CLASS = /*#__PURE__*/ stableClassName('liquid-ripple-trigger', 'wave');
const RIPPLE_CONTENT_CLASS = /*#__PURE__*/ stableClassName('liquid-ripple-trigger', 'content');

function LiquidRippleTriggerInner({
  intensity = 0.9,
  durationMs = 750,
  maxRipples = 3,
  onRipple,
  disabled = false,
  disableWebGL = false,
  children,
  className,
  style,
  xstyle,
  ref,
  onPointerDown,
  onKeyDown,
  ...rest
}: LiquidRippleTriggerProps) {
  const override = useComponentOverride('LiquidRippleTrigger');
  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mergedRef = useMergedRefs(ref, hostRef);
  const nextIdRef = useRef(1);
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const [waves, setWaves] = useState<ReadonlyArray<RippleWaveItem>>([]);

  const safeIntensity = clampFinite(intensity, 0, 1.5, 0.9);
  const safeDuration = clampFinite(durationMs, 250, 1800, 750);
  const safeMaxRipples = Math.round(clampFinite(maxRipples, 1, 4, 3));

  const { renderer, triggerPulse, updateUniforms } = useOpticalShader(canvasRef, {
    kind: 'liquid-ripple',
    animated: true,
    disableWebGL,
    initialUniforms: {
      intensity: safeIntensity,
      paramA: 1.0,
    },
  });

  useEffect(() => {
    updateUniforms({ intensity: safeIntensity });
  }, [safeIntensity, updateUniforms]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const timer of timers) {
        clearTimeout(timer);
      }
      timers.clear();
    };
  }, []);

  const launchRipple = useCallback(
    (xPx: number, yPx: number, width: number, height: number) => {
      if (disabled) return;
      const safeW = Math.max(1, width);
      const safeH = Math.max(1, height);
      const nx = clampFinite(xPx / safeW, 0, 1, 0.5);
      const ny = clampFinite(yPx / safeH, 0, 1, 0.5);
      const id = nextIdRef.current++;
      const sizePx = Math.max(80, Math.round(Math.hypot(safeW, safeH) * 0.65));

      triggerPulse(nx, ny);
      onRipple?.({ x: xPx, y: yPx, normalizedX: nx, normalizedY: ny });

      setWaves((prev) => [...prev.slice(-(safeMaxRipples - 1)), { id, xPx, yPx, sizePx }]);
      const timer = setTimeout(() => {
        timersRef.current.delete(timer);
        setWaves((prev) => prev.filter((item) => item.id !== id));
      }, safeDuration);
      timersRef.current.add(timer);
    },
    [disabled, onRipple, safeDuration, safeMaxRipples, triggerPulse]
  );

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      onPointerDown?.(event);
      if (disabled) return;
      const el = hostRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      launchRipple(
        event.clientX - rect.left,
        event.clientY - rect.top,
        rect.width || 240,
        rect.height || 120
      );
    },
    [disabled, launchRipple, onPointerDown]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(event);
      if (disabled || event.nativeEvent.isComposing) return;
      if (event.key === 'Enter' || event.key === ' ') {
        const el = hostRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const w = rect.width || 240;
        const h = rect.height || 120;
        launchRipple(w / 2, h / 2, w, h);
      }
    },
    [disabled, launchRipple, onKeyDown]
  );

  const merged = mergeProps({
    themeTarget: themeProps('liquid-ripple-trigger', {
      renderer,
      disabled,
      active: waves.length > 0,
    }),
    baseClassName:
      'prism-slab prism-contain-box relative overflow-hidden rounded-2xl select-none min-w-0 max-w-full cursor-pointer data-[disabled=true]:cursor-not-allowed',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div
      ref={mergedRef}
      {...rest}
      {...merged}
      onPointerDown={handlePointerDown}
      onKeyDown={handleKeyDown}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        data-testid="liquid-ripple-gl"
        data-renderer={renderer}
        className={`${RIPPLE_GL_CLASS} pointer-events-none absolute inset-0 h-full w-full z-10 ${
          renderer === 'webgl' ? 'opacity-100' : 'opacity-0'
        }`}
      />
      {waves.map((wave) => {
        const waveStyle: CSSProperties = {
          left: `${wave.xPx}px`,
          top: `${wave.yPx}px`,
          width: `${wave.sizePx}px`,
          height: `${wave.sizePx}px`,
          opacity: Math.min(1, safeIntensity),
          '--prism-fx-duration': `${safeDuration}ms`,
        } as CSSProperties;
        return (
          <span
            key={wave.id}
            aria-hidden="true"
            data-testid="liquid-ripple-wave"
            className={`${RIPPLE_WAVE_CLASS} prism-fx-ripple-ring z-10`}
            style={waveStyle}
          />
        );
      })}
      <div className={`${RIPPLE_CONTENT_CLASS} relative z-20 min-w-0`}>{children}</div>
    </div>
  );
}

export const LiquidRippleTrigger = /*#__PURE__*/ memoWithDisplayName(
  LiquidRippleTriggerInner,
  'LiquidRippleTrigger'
);
