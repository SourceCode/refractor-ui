'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { Disc3 } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { createCoalescedPointerMove } from '../hooks/useRafCallback';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { STYLE_BG_DIVIDER, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export interface JogShuttleWheelProps extends BaseProps<HTMLDivElement> {
  /** Deck header title and accessible region label (defaults to 'Jog / Shuttle Deck'). */
  title?: string;
  /** Controlled current frame counter. */
  frame?: number;
  /** Initial frame counter in uncontrolled mode (defaults to 0). */
  defaultFrame?: number;
  /** Minimum inclusive frame bound (defaults to 0). */
  minFrame?: number;
  /** Maximum inclusive frame bound (defaults to 1800). */
  maxFrame?: number;
  /** Ordered discrete shuttle speed multipliers (defaults to [-8, -4, -2, -1, 0, 1, 2, 4, 8]). */
  shuttleSpeeds?: ReadonlyArray<number>;
  /** When true (default), releasing the shuttle slider automatically springs shuttle rate back to 0. */
  springReturn?: boolean;
  /** Callback fired on discrete jog steps with signed frame delta and resulting clamped frame. */
  onJogStep?: (deltaFrames: number, nextFrame: number) => void;
  /** Callback fired whenever the active shuttle rate changes (including spring return to 0). */
  onShuttleChange?: (speed: number) => void;
  /** Disables jog wheel dragging/keyboard, shuttle strip dragging/keyboard, and detent controls. */
  disabled?: boolean;
}

interface KnurlTick {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  major: boolean;
}

interface NormalizedShuttleScale {
  speeds: ReadonlyArray<number>;
  min: number;
  max: number;
  zeroIndex: number;
}

const DEFAULT_TITLE = 'Jog / Shuttle Deck';
const DEFAULT_FRAME = 0;
const DEFAULT_MIN_FRAME = 0;
const DEFAULT_MAX_FRAME = 1800;
const DEFAULT_SHUTTLE_SPEEDS: readonly number[] = [-8, -4, -2, -1, 0, 1, 2, 4, 8];

const WHEEL_VIEWBOX = 140;
const WHEEL_CENTER = 70;
const JOG_PX_PER_FRAME = 12;
const JOG_PAGE_STEP = 10;
const DEGREES_PER_FRAME = 15;

function roundTwo(value: number): number {
  const rounded = Math.round(value * 100) / 100;
  return rounded === 0 ? 0 : rounded;
}

function polarToCartesian(cxPos: number, cyPos: number, radius: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: roundTwo(cxPos + radius * Math.cos(rad)),
    y: roundTwo(cyPos + radius * Math.sin(rad)),
  };
}

function clampFrame(raw: number, min: number, max: number, fallback: number): number {
  const rounded = Math.round(clampNumber(raw, min, max, fallback));
  return rounded === 0 ? 0 : rounded;
}

function formatFrameReadout(frame: number): string {
  if (frame < 0) {
    return `F -${String(Math.abs(frame)).padStart(4, '0')}`;
  }
  return `F ${String(frame).padStart(4, '0')}`;
}

function formatShuttleBadge(speed: number): string {
  if (speed > 0) return `+${speed}× FWD`;
  if (speed < 0) return `${speed}× REV`;
  return 'IDLE';
}

function formatDetentLabel(speed: number): string {
  if (speed > 0) return `+${speed}×`;
  return `${speed}×`;
}

function formatDetentAriaLabel(speed: number): string {
  if (speed > 0) return `Set shuttle speed to +${speed}× forward`;
  if (speed < 0) return `Set shuttle speed to ${speed}× reverse`;
  return 'Reset shuttle speed to 0× idle';
}

function buildShuttleScale(raw?: ReadonlyArray<number>): NormalizedShuttleScale {
  const unique = new Set<number>();
  if (raw) {
    for (const item of raw) {
      if (Number.isFinite(item)) {
        unique.add(item === 0 ? 0 : item);
      }
    }
  }
  const sorted =
    unique.size === 0
      ? DEFAULT_SHUTTLE_SPEEDS
      : Array.from(unique.add(0)).sort((a, b) => a - b);

  let min = 0;
  let max = 0;
  let zeroIndex = 0;
  let idx = 0;
  for (const value of sorted) {
    if (idx === 0) min = value;
    max = value;
    if (value === 0) zeroIndex = idx;
    idx += 1;
  }

  return { speeds: sorted, min, max, zeroIndex };
}

function getSpeedByIndex(speeds: ReadonlyArray<number>, targetIndex: number): number {
  let selected = 0;
  let idx = 0;
  for (const value of speeds) {
    if (idx === targetIndex) {
      selected = value;
      break;
    }
    idx += 1;
  }
  return selected;
}

function indexToPercent(index: number, count: number): number {
  if (count <= 1) return 50;
  return roundTwo((index / (count - 1)) * 100);
}

const KNURL_TICKS: ReadonlyArray<KnurlTick> = Array.from({ length: 36 }, (_, idx) => {
  const deg = idx * 10;
  const major = deg % 90 === 0;
  const inner = polarToCartesian(WHEEL_CENTER, WHEEL_CENTER, major ? 53 : 56, deg);
  const outer = polarToCartesian(WHEEL_CENTER, WHEEL_CENTER, 63, deg);
  return {
    id: `knurl-${deg}`,
    x1: inner.x,
    y1: inner.y,
    x2: outer.x,
    y2: outer.y,
    major,
  };
});

const headerClass = /*#__PURE__*/ stableClassName('jog-shuttle-wheel', 'header');
const wheelClass = /*#__PURE__*/ stableClassName('jog-shuttle-wheel', 'wheel');
const shuttleClass = /*#__PURE__*/ stableClassName('jog-shuttle-wheel', 'shuttle');
const detentsClass = /*#__PURE__*/ stableClassName('jog-shuttle-wheel', 'detents');

function JogShuttleWheelInner({
  title = DEFAULT_TITLE,
  frame,
  defaultFrame = DEFAULT_FRAME,
  minFrame = DEFAULT_MIN_FRAME,
  maxFrame = DEFAULT_MAX_FRAME,
  shuttleSpeeds,
  springReturn = true,
  onJogStep,
  onShuttleChange,
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: JogShuttleWheelProps) {
  const override = useComponentOverride('JogShuttleWheel');

  const rawMinFrame = Number.isFinite(minFrame) ? Math.round(minFrame) : DEFAULT_MIN_FRAME;
  const rawMaxFrame = Number.isFinite(maxFrame) ? Math.round(maxFrame) : DEFAULT_MAX_FRAME;
  const safeMinFrame = Math.min(rawMinFrame, rawMaxFrame);
  const safeMaxFrame = Math.max(rawMinFrame, rawMaxFrame);
  const safeDefaultFrame = clampFrame(defaultFrame, safeMinFrame, safeMaxFrame, safeMinFrame);

  const isFrameControlled = frame !== undefined;
  const [uncontrolledFrame, setUncontrolledFrame] = useState<number>(safeDefaultFrame);
  const rawFrame = isFrameControlled ? frame : uncontrolledFrame;
  const currentFrame = clampFrame(rawFrame, safeMinFrame, safeMaxFrame, safeDefaultFrame);

  const shuttleScale = useMemo(() => buildShuttleScale(shuttleSpeeds), [shuttleSpeeds]);
  const [shuttleSpeed, setShuttleSpeed] = useState<number>(0);
  const [springMode, setSpringMode] = useState<boolean>(springReturn);
  const [isJogDragging, setIsJogDragging] = useState<boolean>(false);
  const [isShuttleDragging, setIsShuttleDragging] = useState<boolean>(false);
  const [dragSubAngleDeg, setDragSubAngleDeg] = useState<number>(0);

  const cleanupJogDragRef = useRef<(() => void) | null>(null);
  const cleanupShuttleDragRef = useRef<(() => void) | null>(null);

  const safeShuttleSpeed = shuttleScale.speeds.includes(shuttleSpeed) ? shuttleSpeed : 0;
  const activeSpeedIndex = shuttleScale.speeds.indexOf(safeShuttleSpeed);

  useEffect(() => {
    setSpringMode(springReturn);
  }, [springReturn]);

  useEffect(() => {
    if (disabled) {
      cleanupJogDragRef.current?.();
      cleanupShuttleDragRef.current?.();
      setIsJogDragging(false);
      setIsShuttleDragging(false);
      setDragSubAngleDeg(0);
    }
  }, [disabled]);

  useEffect(() => {
    return () => {
      cleanupJogDragRef.current?.();
      cleanupShuttleDragRef.current?.();
    };
  }, []);

  const latestRef = useRef({
    safeMinFrame,
    safeMaxFrame,
    isFrameControlled,
    onJogStep,
    shuttleScale,
    onShuttleChange,
    springMode,
    shuttleSpeed: safeShuttleSpeed,
  });
  latestRef.current = {
    safeMinFrame,
    safeMaxFrame,
    isFrameControlled,
    onJogStep,
    shuttleScale,
    onShuttleChange,
    springMode,
    shuttleSpeed: safeShuttleSpeed,
  };

  const commitFrameTarget = useCallback(
    (targetFrame: number) => {
      const nextFrame = clampFrame(targetFrame, safeMinFrame, safeMaxFrame, currentFrame);
      const delta = nextFrame - currentFrame;
      if (delta === 0) return;
      if (!isFrameControlled) {
        setUncontrolledFrame(nextFrame);
      }
      onJogStep?.(delta, nextFrame);
    },
    [currentFrame, isFrameControlled, onJogStep, safeMaxFrame, safeMinFrame]
  );

  const commitShuttleSpeed = useCallback(
    (nextSpeed: number) => {
      if (nextSpeed === safeShuttleSpeed) return;
      setShuttleSpeed(nextSpeed);
      onShuttleChange?.(nextSpeed);
    },
    [onShuttleChange, safeShuttleSpeed]
  );

  const handleJogPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (disabled || event.button > 0) return;
      event.preventDefault();
      event.currentTarget.focus();
      cleanupJogDragRef.current?.();

      let lastX = event.clientX;
      let residualPx = 0;
      let workingFrame = currentFrame;

      setIsJogDragging(true);
      setDragSubAngleDeg(0);

      const handlePointerMove = createCoalescedPointerMove((moveEvent: PointerEvent) => {
        const dx = moveEvent.clientX - lastX;
        lastX = moveEvent.clientX;
        const totalPx = residualPx + dx;
        const wholeSteps = Math.trunc(totalPx / JOG_PX_PER_FRAME);

        const {
          safeMinFrame: minF,
          safeMaxFrame: maxF,
          isFrameControlled: controlled,
          onJogStep: onStep,
        } = latestRef.current;

        if (wholeSteps !== 0) {
          residualPx = totalPx - wholeSteps * JOG_PX_PER_FRAME;
          const nextFrame = clampFrame(workingFrame + wholeSteps, minF, maxF, workingFrame);
          const delta = nextFrame - workingFrame;
          if (delta !== 0) {
            workingFrame = nextFrame;
            if (!controlled) {
              setUncontrolledFrame(nextFrame);
            }
            onStep?.(delta, nextFrame);
          }
        } else {
          residualPx = totalPx;
        }

        const atLowerStop = workingFrame <= minF && residualPx < 0;
        const atUpperStop = workingFrame >= maxF && residualPx > 0;
        if (atLowerStop || atUpperStop) {
          residualPx = 0;
          setDragSubAngleDeg(0);
        } else {
          setDragSubAngleDeg(roundTwo((residualPx / JOG_PX_PER_FRAME) * DEGREES_PER_FRAME));
        }
      });

      const cleanup = () => {
        handlePointerMove.cancel();
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerEnd);
        window.removeEventListener('pointercancel', handlePointerEnd);
        cleanupJogDragRef.current = null;
      };

      const handlePointerEnd = () => {
        cleanup();
        setIsJogDragging(false);
        setDragSubAngleDeg(0);
      };

      cleanupJogDragRef.current = cleanup;
      window.addEventListener('pointermove', handlePointerMove, { passive: true });
      window.addEventListener('pointerup', handlePointerEnd);
      window.addEventListener('pointercancel', handlePointerEnd);
    },
    [currentFrame, disabled]
  );

  const handleJogKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (disabled || event.nativeEvent.isComposing) return;

      let targetFrame: number | null = null;
      if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
        targetFrame = currentFrame + 1;
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
        targetFrame = currentFrame - 1;
      } else if (event.key === 'PageUp') {
        targetFrame = currentFrame + JOG_PAGE_STEP;
      } else if (event.key === 'PageDown') {
        targetFrame = currentFrame - JOG_PAGE_STEP;
      } else if (event.key === 'Home') {
        targetFrame = safeMinFrame;
      } else if (event.key === 'End') {
        targetFrame = safeMaxFrame;
      }

      if (targetFrame === null) return;
      event.preventDefault();
      commitFrameTarget(targetFrame);
    },
    [commitFrameTarget, currentFrame, disabled, safeMaxFrame, safeMinFrame]
  );

  const handleShuttlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (disabled || event.button > 0) return;
      event.preventDefault();
      event.currentTarget.focus();
      cleanupShuttleDragRef.current?.();

      const trackEl = event.currentTarget;
      let activeSpeed = latestRef.current.shuttleSpeed;

      const applySpeedFromClientX = (clientX: number) => {
        const rect = trackEl.getBoundingClientRect();
        if (!Number.isFinite(rect.width) || rect.width <= 0) return;

        const { speeds } = latestRef.current.shuttleScale;
        const maxIdx = speeds.length - 1;
        const ratio = clampNumber((clientX - rect.left) / rect.width, 0, 1, 0.5);
        const targetIdx = maxIdx <= 0 ? 0 : Math.round(ratio * maxIdx);
        const nextSpeed = getSpeedByIndex(speeds, targetIdx);

        if (nextSpeed !== activeSpeed) {
          activeSpeed = nextSpeed;
          setShuttleSpeed(nextSpeed);
          latestRef.current.onShuttleChange?.(nextSpeed);
        }
      };

      setIsShuttleDragging(true);
      applySpeedFromClientX(event.clientX);

      const handlePointerMove = createCoalescedPointerMove((moveEvent: PointerEvent) => {
        applySpeedFromClientX(moveEvent.clientX);
      });

      const cleanup = () => {
        handlePointerMove.cancel();
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerEnd);
        window.removeEventListener('pointercancel', handlePointerEnd);
        cleanupShuttleDragRef.current = null;
      };

      const handlePointerEnd = () => {
        cleanup();
        setIsShuttleDragging(false);
        if (latestRef.current.springMode && activeSpeed !== 0) {
          activeSpeed = 0;
          setShuttleSpeed(0);
          latestRef.current.onShuttleChange?.(0);
        }
      };

      cleanupShuttleDragRef.current = cleanup;
      window.addEventListener('pointermove', handlePointerMove, { passive: true });
      window.addEventListener('pointerup', handlePointerEnd);
      window.addEventListener('pointercancel', handlePointerEnd);
    },
    [disabled]
  );

  const handleShuttleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (disabled || event.nativeEvent.isComposing) return;

      const maxIdx = shuttleScale.speeds.length - 1;
      let targetIdx: number | null = null;
      if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
        targetIdx = Math.min(maxIdx, activeSpeedIndex + 1);
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
        targetIdx = Math.max(0, activeSpeedIndex - 1);
      } else if (event.key === '0' || event.key === 'Home') {
        targetIdx = shuttleScale.zeroIndex;
      }

      if (targetIdx === null) return;
      event.preventDefault();
      commitShuttleSpeed(getSpeedByIndex(shuttleScale.speeds, targetIdx));
    },
    [activeSpeedIndex, commitShuttleSpeed, disabled, shuttleScale]
  );

  const handleToggleSpringMode = useCallback(() => {
    setSpringMode((prev) => !prev);
  }, []);

  const rotorAngleDeg = roundTwo(currentFrame * DEGREES_PER_FRAME + dragSubAngleDeg);
  const frameReadout = formatFrameReadout(currentFrame);
  const shuttleBadgeText = formatShuttleBadge(safeShuttleSpeed);
  const shuttleDirection =
    safeShuttleSpeed > 0 ? 'fwd' : safeShuttleSpeed < 0 ? 'rev' : 'idle';

  const zeroPercent = indexToPercent(shuttleScale.zeroIndex, shuttleScale.speeds.length);
  const thumbPercent = indexToPercent(activeSpeedIndex, shuttleScale.speeds.length);
  const fillLeftPercent = Math.min(zeroPercent, thumbPercent);
  const fillWidthPercent = roundTwo(Math.abs(thumbPercent - zeroPercent));

  const merged = mergeProps({
    themeTarget: themeProps('jog-shuttle-wheel', {
      disabled,
      jogging: isJogDragging,
      shuttling: isShuttleDragging,
      shuttleDirection,
      springReturn: springMode,
    }),
    baseClassName: 'prism-slab w-full max-w-full p-4 sm:p-5 space-y-4 select-none',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });


  const accentColor =
    safeShuttleSpeed > 0
      ? 'var(--prism-primary-main)'
      : safeShuttleSpeed < 0
        ? 'var(--prism-secondary-main)'
        : 'var(--prism-text-disabled)';

  return (
    <div ref={ref} role="region" aria-label={title} {...rest} {...merged}>
      {/* Deck Header */}
      <div className={cx(headerClass, 'flex flex-wrap items-center justify-between gap-2.5')}>
        <div className="flex items-center gap-2 min-w-0">
          <Disc3
            aria-hidden="true"
            className="w-4 h-4 shrink-0"
            style={{
              color:
                isJogDragging || safeShuttleSpeed !== 0
                  ? 'var(--prism-primary-main)'
                  : 'var(--prism-text-secondary)',
            }}
          />
          <span
            data-testid="jog-shuttle-title"
            className="text-sm font-semibold tracking-tight truncate"
            style={STYLE_TEXT_PRIMARY}
          >
            {title}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <span
            data-testid="jog-frame-readout"
            className="prism-well px-2.5 py-1 rounded-full font-mono text-xs font-bold tabular-nums"
            style={STYLE_TEXT_PRIMARY}
          >
            {frameReadout}
          </span>

          <span
            data-testid="shuttle-rate-badge"
            className={cx(
              safeShuttleSpeed === 0 ? 'prism-well' : 'prism-crystal',
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-xs font-semibold tabular-nums'
            )}
            style={{
              color:
                safeShuttleSpeed > 0
                  ? 'var(--prism-primary-main)'
                  : safeShuttleSpeed < 0
                    ? 'var(--prism-text-primary)'
                    : 'var(--prism-text-secondary)',
            }}
          >
            <span
              aria-hidden="true"
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: accentColor }}
            />
            {shuttleBadgeText}
          </span>
        </div>
      </div>

      {/* Responsive Deck Controls: Jog Wheel + Spring-Loaded Shuttle Strip */}
      <div className="flex flex-wrap items-center gap-5 max-w-full">
        {/* Left / Top: Tactile Optical SVG Jog Wheel */}
        <div className="flex flex-col items-center gap-2 shrink-0 mx-auto sm:mx-0">
          <div
            role="slider"
            aria-label="Jog wheel"
            aria-valuenow={currentFrame}
            aria-valuemin={safeMinFrame}
            aria-valuemax={safeMaxFrame}
            aria-valuetext={frameReadout}
            aria-disabled={disabled || undefined}
            tabIndex={disabled ? -1 : 0}
            data-testid="jog-wheel"
            data-dragging={isJogDragging ? 'true' : undefined}
            onPointerDown={handleJogPointerDown}
            onKeyDown={handleJogKeyDown}
            style={{ touchAction: 'none' }}
            className={cx(
              wheelClass,
              'prism-crystal prism-focus-ring relative inline-flex items-center justify-center w-[140px] h-[140px] max-w-full rounded-full touch-none shrink-0',
              disabled
                ? 'opacity-50 cursor-not-allowed'
                : isJogDragging
                  ? 'cursor-grabbing'
                  : 'cursor-grab'
            )}
          >
            <svg
              width={WHEEL_VIEWBOX}
              height={WHEEL_VIEWBOX}
              viewBox={`0 0 ${WHEEL_VIEWBOX} ${WHEEL_VIEWBOX}`}
              aria-hidden="true"
              data-testid="jog-wheel-svg"
              className="block overflow-visible pointer-events-none prism-contain-leaf"
            >
              {/* Concentric Crystal Outer Rim */}
              <circle
                cx={WHEEL_CENTER}
                cy={WHEEL_CENTER}
                r={66}
                fill="none"
                stroke="var(--prism-divider)"
                strokeWidth={1.5}
              />

              {/* Knurled Outer Ticks */}
              {KNURL_TICKS.map((tick) => (
                <line
                  key={tick.id}
                  x1={tick.x1}
                  y1={tick.y1}
                  x2={tick.x2}
                  y2={tick.y2}
                  stroke="var(--prism-divider)"
                  strokeWidth={tick.major ? 2 : 1.25}
                  strokeLinecap="round"
                />
              ))}

              {/* Static 12-o'clock Reference Pip */}
              <line
                x1={WHEEL_CENTER}
                y1={4}
                x2={WHEEL_CENTER}
                y2={11}
                stroke="var(--prism-primary-main)"
                strokeWidth={2}
                strokeLinecap="round"
              />

              {/* Recessed Optical Rotor Well */}
              <circle
                cx={WHEEL_CENTER}
                cy={WHEEL_CENTER}
                r={50}
                fill="var(--prism-well-start)"
                stroke="var(--prism-well-border)"
                strokeWidth={1.5}
              />

              {/* Rotating Inner Rotor */}
              <g
                data-testid="jog-wheel-rotor"
                transform={`rotate(${rotorAngleDeg} ${WHEEL_CENTER} ${WHEEL_CENTER})`}
              >
                <circle
                  cx={WHEEL_CENTER}
                  cy={WHEEL_CENTER}
                  r={43}
                  fill="var(--prism-crystal-top)"
                  stroke="var(--prism-divider)"
                  strokeWidth={1.5}
                />
                <circle
                  cx={WHEEL_CENTER}
                  cy={WHEEL_CENTER}
                  r={33}
                  fill="none"
                  stroke="var(--prism-divider)"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
                {/* Tangerine Index Notch */}
                <line
                  data-testid="jog-wheel-notch"
                  x1={WHEEL_CENTER}
                  y1={29}
                  x2={WHEEL_CENTER}
                  y2={40}
                  stroke="var(--prism-primary-main)"
                  strokeWidth={4}
                  strokeLinecap="round"
                />
                {/* Recessed Tactile Finger Dimple */}
                <circle
                  data-testid="jog-wheel-dimple"
                  cx={88}
                  cy={52}
                  r={9.5}
                  fill="var(--prism-well-start)"
                  stroke="var(--prism-well-border)"
                  strokeWidth={1.5}
                />
                <circle
                  cx={86.5}
                  cy={50.5}
                  r={4.2}
                  fill="var(--prism-well-end)"
                  stroke="var(--prism-divider)"
                  strokeWidth={0.75}
                />
                {/* Central Optical Spindle */}
                <circle
                  cx={WHEEL_CENTER}
                  cy={WHEEL_CENTER}
                  r={7.5}
                  fill="var(--prism-well-end)"
                  stroke="var(--prism-divider)"
                  strokeWidth={1.5}
                />
              </g>
            </svg>
          </div>

          <span
            className="text-[11px] font-mono tabular-nums text-center"
            style={STYLE_TEXT_SECONDARY}
          >
            Jog · {safeMinFrame}–{safeMaxFrame}F
          </span>
        </div>

        {/* Right / Bottom: Spring-Loaded Shuttle Strip */}
        <div className="flex-1 min-w-[220px] max-w-full space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span
              className="text-xs font-semibold tracking-tight"
              style={STYLE_TEXT_SECONDARY}
            >
              Shuttle Strip
            </span>

            <button
              type="button"
              disabled={disabled}
              data-testid="shuttle-spring-toggle"
              aria-pressed={springMode}
              aria-label={
                springMode
                  ? 'Shuttle mode: Spring return enabled'
                  : 'Shuttle mode: Hold speed enabled'
              }
              onClick={handleToggleSpringMode}
              className={cx(
                'prism-crystal prism-focus-ring inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-opacity cursor-pointer disabled:cursor-not-allowed',
                disabled ? 'opacity-50' : ''
              )}
              style={STYLE_TEXT_PRIMARY}
            >
              <span
                aria-hidden="true"
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{
                  backgroundColor: springMode
                    ? 'var(--prism-primary-main)'
                    : 'var(--prism-secondary-main)',
                }}
              />
              {springMode ? 'Spring' : 'Hold'}
            </button>
          </div>

          {/* Interactive Shuttle Track */}
          <div
            role="slider"
            aria-label="Shuttle speed"
            aria-valuemin={shuttleScale.min}
            aria-valuemax={shuttleScale.max}
            aria-valuenow={safeShuttleSpeed}
            aria-valuetext={shuttleBadgeText}
            aria-disabled={disabled || undefined}
            tabIndex={disabled ? -1 : 0}
            data-testid="shuttle-slider"
            data-dragging={isShuttleDragging ? 'true' : undefined}
            onPointerDown={handleShuttlePointerDown}
            onKeyDown={handleShuttleKeyDown}
            style={{ touchAction: 'none' }}
            className={cx(
              shuttleClass,
              'prism-well prism-focus-ring relative h-11 w-full rounded-2xl flex items-center px-4 touch-none',
              disabled
                ? 'opacity-50 cursor-not-allowed'
                : isShuttleDragging
                  ? 'cursor-grabbing'
                  : 'cursor-ew-resize'
            )}
          >
            <div className="relative w-full h-full flex items-center pointer-events-none">
              {/* Base Rail */}
              <div
                className="w-full h-1.5 rounded-full"
                style={STYLE_BG_DIVIDER}
              />

              {/* Bidirectional Active Fill */}
              <div
                data-testid="shuttle-active-fill"
                className="absolute h-1.5 rounded-full"
                style={{
                  left: `${fillLeftPercent}%`,
                  width: `${fillWidthPercent}%`,
                  backgroundColor: accentColor,
                  opacity: safeShuttleSpeed === 0 ? 0 : 0.9,
                }}
              />

              {/* Center 0x Detent Marker */}
              <div
                data-testid="shuttle-center-detent"
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-0.5 h-5 rounded-full"
                style={{
                  left: `${zeroPercent}%`,
                  backgroundColor: 'var(--prism-text-secondary)',
                }}
              />

              {/* Discrete Speed Notch Pips */}
              {shuttleScale.speeds.map((spd, idx) => {
                const pipPercent = indexToPercent(idx, shuttleScale.speeds.length);
                return (
                  <span
                    key={`pip-${spd}`}
                    aria-hidden="true"
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1 h-2.5 rounded-full"
                    style={{
                      left: `${pipPercent}%`,
                      backgroundColor:
                        spd === safeShuttleSpeed
                          ? accentColor
                          : 'var(--prism-text-disabled)',
                    }}
                  />
                );
              })}

              {/* Optical Crystal Shuttle Thumb */}
              <div
                data-testid="shuttle-thumb"
                className={cx(
                  'prism-crystal absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-7 rounded-xl flex items-center justify-center',
                  isShuttleDragging ? '' : 'transition-[left] duration-100'
                )}
                style={{ left: `${thumbPercent}%` }}
              >
                <span
                  aria-hidden="true"
                  className="w-1 h-3.5 rounded-full"
                  style={{
                    backgroundColor:
                      safeShuttleSpeed === 0
                        ? 'var(--prism-text-secondary)'
                        : accentColor,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Direct Discrete Detent Buttons */}
          <div
            className={cx(
              detentsClass,
              'flex flex-wrap items-center justify-between gap-1 max-w-full'
            )}
          >
            {shuttleScale.speeds.map((spd) => {
              const isSelected = spd === safeShuttleSpeed;
              return (
                <button
                  key={`detent-${spd}`}
                  type="button"
                  disabled={disabled}
                  data-testid={`shuttle-notch-${spd}`}
                  data-active={isSelected ? 'true' : undefined}
                  data-center={spd === 0 ? 'true' : undefined}
                  aria-pressed={isSelected}
                  aria-label={formatDetentAriaLabel(spd)}
                  onClick={() => commitShuttleSpeed(spd)}
                  className={cx(
                    isSelected ? 'prism-btn-primary' : 'prism-well',
                    'prism-focus-ring flex-1 min-w-[38px] h-7 px-1.5 rounded-lg font-mono text-[11px] font-semibold tabular-nums transition-opacity cursor-pointer disabled:cursor-not-allowed',
                    disabled ? 'opacity-50' : ''
                  )}
                  style={
                    isSelected
                      ? undefined
                      : {
                          color:
                            spd === 0
                              ? 'var(--prism-text-primary)'
                              : 'var(--prism-text-secondary)',
                        }
                  }
                >
                  {formatDetentLabel(spd)}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export const JogShuttleWheel = /*#__PURE__*/ memoWithDisplayName(JogShuttleWheelInner, 'JogShuttleWheel');
