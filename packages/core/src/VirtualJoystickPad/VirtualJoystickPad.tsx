'use client';

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Crosshair,
  Gamepad2,
  RotateCcw,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { createCoalescedPointerMove } from '../hooks/useRafCallback';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export type JoystickControlMode = 'analog' | 'dpad';

export type JoystickCardinalDirection =
  | 'CENTER'
  | 'N'
  | 'NE'
  | 'E'
  | 'SE'
  | 'S'
  | 'SW'
  | 'W'
  | 'NW';

export interface JoystickVector {
  /** Normalized horizontal deflection inside [-1..1] (+1 = East/Right). */
  x: number;
  /** Normalized vertical deflection inside [-1..1] (+1 = North/Up). */
  y: number;
  /** Radial vector magnitude clamped inside [0..1]. */
  magnitude: number;
  /** Compass heading in degrees [0..359] (0° = North, 90° = East, 180° = South, 270° = West). */
  angleDeg: number;
  /** Eight-way compass cardinal direction or CENTER when neutral. */
  direction: JoystickCardinalDirection;
}

type VirtualJoystickPadBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface VirtualJoystickPadProps extends VirtualJoystickPadBaseProps {
  /** Panel header title and accessible region label (defaults to 'Optical Gimbal & D-Pad Controller'). */
  title?: string;
  /** Controlled 2D unit-circle vector coordinate { x, y }. */
  value?: { x: number; y: number };
  /** Initial uncontrolled 2D vector coordinate (defaults to { x: 0, y: 0 }). */
  defaultValue?: { x: number; y: number };
  /** Controlled input mode ('analog' | 'dpad'). */
  mode?: JoystickControlMode;
  /** Initial uncontrolled input mode (defaults to 'analog'). */
  defaultMode?: JoystickControlMode;
  /** When true (default), releasing analog stick or D-Pad pointer springs back to center (0, 0). */
  springReturn?: boolean;
  /** Inner radial deadzone threshold clamped to [0..0.45] (defaults to 0.08). */
  deadzone?: number;
  /** Callback invoked whenever the normalized JoystickVector changes. */
  onChange?: (vector: JoystickVector) => void;
  /** Callback invoked whenever the controller mode changes between analog and dpad. */
  onModeChange?: (mode: JoystickControlMode) => void;
  /** Disables analog dragging, keyboard steering, D-Pad controls, mode switching, and spring toggle. */
  disabled?: boolean;
}

interface JoystickPoint {
  x: number;
  y: number;
}

interface GimbalRing {
  id: string;
  radius: number;
  isOuter: boolean;
}

interface GimbalTick {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  major: boolean;
}

const DEFAULT_TITLE = 'Optical Gimbal & D-Pad Controller';
const DEFAULT_POINT: JoystickPoint = { x: 0, y: 0 };
const DEFAULT_DEADZONE = 0.08;
const MIN_DEADZONE = 0;
const MAX_DEADZONE = 0.45;
const COARSE_STEP = 0.25;
const FINE_STEP = 0.1;

const SVG_SIZE = 220;
const GIMBAL_CENTER = 110;
const GIMBAL_RADIUS = 80;
const PUCK_TRAVEL_RADIUS = 68;

const CENTER_VECTOR: JoystickVector = {
  x: 0,
  y: 0,
  magnitude: 0,
  angleDeg: 0,
  direction: 'CENTER',
};

const DPAD_UP_POINT: JoystickPoint = { x: 0, y: 1 };
const DPAD_DOWN_POINT: JoystickPoint = { x: 0, y: -1 };
const DPAD_LEFT_POINT: JoystickPoint = { x: -1, y: 0 };
const DPAD_RIGHT_POINT: JoystickPoint = { x: 1, y: 0 };
const DPAD_CENTER_POINT: JoystickPoint = { x: 0, y: 0 };

function roundTwo(value: number): number {
  const rounded = Math.round(value * 100) / 100;
  return rounded === 0 ? 0 : rounded;
}

function compassToSvg(radius: number, compassDeg: number): JoystickPoint {
  const rad = (compassDeg * Math.PI) / 180;
  return {
    x: roundTwo(GIMBAL_CENTER + radius * Math.sin(rad)),
    y: roundTwo(GIMBAL_CENTER - radius * Math.cos(rad)),
  };
}

const GIMBAL_RINGS: ReadonlyArray<GimbalRing> = [
  { id: 'inner', radius: 32, isOuter: false },
  { id: 'mid', radius: 56, isOuter: false },
  { id: 'outer', radius: GIMBAL_RADIUS, isOuter: true },
];

const TICK_ANGLES: ReadonlyArray<number> = [0, 45, 90, 135, 180, 225, 270, 315];

const GIMBAL_TICKS: ReadonlyArray<GimbalTick> = TICK_ANGLES.map((deg) => {
  const major = deg % 90 === 0;
  const start = compassToSvg(major ? GIMBAL_RADIUS : GIMBAL_RADIUS + 1, deg);
  const end = compassToSvg(major ? 89 : 87, deg);
  return {
    id: `tick-${deg}`,
    x1: start.x,
    y1: start.y,
    x2: end.x,
    y2: end.y,
    major,
  };
});

function resolveCompassDirection(angleDeg: number): JoystickCardinalDirection {
  const sector = Math.floor(((angleDeg + 22.5) % 360) / 45);
  switch (sector) {
    case 1:
      return 'NE';
    case 2:
      return 'E';
    case 3:
      return 'SE';
    case 4:
      return 'S';
    case 5:
      return 'SW';
    case 6:
      return 'W';
    case 7:
      return 'NW';
    default:
      return 'N';
  }
}

function normalizeJoystickVector(raw: JoystickPoint, deadzone: number): JoystickVector {
  const rawX = Number.isFinite(raw.x) ? raw.x : 0;
  const rawY = Number.isFinite(raw.y) ? raw.y : 0;
  const rawRadius = Math.hypot(rawX, rawY);

  let unitX = rawX;
  let unitY = rawY;
  if (rawRadius > 1) {
    unitX = rawX / rawRadius;
    unitY = rawY / rawRadius;
  }

  const clampedRadius = Math.min(rawRadius, 1);
  if (clampedRadius === 0 || clampedRadius < deadzone) {
    return CENTER_VECTOR;
  }

  const x = roundTwo(unitX);
  const y = roundTwo(unitY);
  if (x === 0 && y === 0) {
    return CENTER_VECTOR;
  }

  const magnitude = Math.min(1, roundTwo(Math.hypot(x, y)));
  const angleDeg = Math.round(((Math.atan2(x, y) * 180) / Math.PI + 360) % 360) % 360;
  const direction = resolveCompassDirection(angleDeg);

  return {
    x,
    y,
    magnitude,
    angleDeg,
    direction,
  };
}

function vectorsEqual(a: JoystickVector, b: JoystickVector): boolean {
  return a.x === b.x && a.y === b.y;
}

function formatSignedAxis(value: number): string {
  return value > 0 ? `+${value.toFixed(2)}` : value.toFixed(2);
}

const headerClass = /*#__PURE__*/ stableClassName('virtual-joystick-pad', 'header');
const stageClass = /*#__PURE__*/ stableClassName('virtual-joystick-pad', 'stage');
const gimbalClass = /*#__PURE__*/ stableClassName('virtual-joystick-pad', 'gimbal');
const dpadClass = /*#__PURE__*/ stableClassName('virtual-joystick-pad', 'dpad');
const footerClass = /*#__PURE__*/ stableClassName('virtual-joystick-pad', 'footer');

function VirtualJoystickPadInner({
  title = DEFAULT_TITLE,
  value,
  defaultValue = DEFAULT_POINT,
  mode,
  defaultMode = 'analog',
  springReturn = true,
  deadzone = DEFAULT_DEADZONE,
  onChange,
  onModeChange,
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: VirtualJoystickPadProps) {
  const override = useComponentOverride('VirtualJoystickPad');
  const idPrefix = useId();
  const puckGlowId = `${idPrefix}-puck-glow`;
  const wellGradId = `${idPrefix}-well-grad`;

  const safeDeadzone = clampNumber(deadzone, MIN_DEADZONE, MAX_DEADZONE, DEFAULT_DEADZONE);

  const isValueControlled = value !== undefined;
  const [uncontrolledVector, setUncontrolledVector] = useState<JoystickVector>(() =>
    normalizeJoystickVector(defaultValue, safeDeadzone)
  );
  const currentVector = useMemo(
    () =>
      normalizeJoystickVector(
        value !== undefined ? value : uncontrolledVector,
        safeDeadzone
      ),
    [safeDeadzone, uncontrolledVector, value]
  );

  const isModeControlled = mode !== undefined;
  const [uncontrolledMode, setUncontrolledMode] = useState<JoystickControlMode>(defaultMode);
  const activeMode = isModeControlled ? mode : uncontrolledMode;

  const [isSpringReturn, setIsSpringReturn] = useState<boolean>(springReturn);
  useEffect(() => {
    setIsSpringReturn(springReturn);
  }, [springReturn]);

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [pressedDpadDir, setPressedDpadDir] = useState<JoystickCardinalDirection | null>(null);

  const cleanupPointerRef = useRef<(() => void) | null>(null);
  const dpadPointerHandledRef = useRef<boolean>(false);

  const abortActivePointer = useCallback(() => {
    cleanupPointerRef.current?.();
    dpadPointerHandledRef.current = false;
    setIsDragging(false);
    setPressedDpadDir(null);
  }, []);

  useEffect(() => {
    if (disabled) {
      abortActivePointer();
    }
  }, [abortActivePointer, disabled]);

  useEffect(() => {
    abortActivePointer();
  }, [abortActivePointer, activeMode]);

  useEffect(() => {
    return () => {
      cleanupPointerRef.current?.();
    };
  }, []);

  const latestRef = useRef({
    currentVector,
    isValueControlled,
    safeDeadzone,
    isSpringReturn,
    onChange,
  });
  latestRef.current = {
    currentVector,
    isValueControlled,
    safeDeadzone,
    isSpringReturn,
    onChange,
  };

  const commitPoint = useCallback(
    (point: JoystickPoint) => {
      const next = normalizeJoystickVector(point, safeDeadzone);
      if (vectorsEqual(currentVector, next)) return;
      if (!isValueControlled) {
        setUncontrolledVector(next);
      }
      onChange?.(next);
    },
    [currentVector, isValueControlled, onChange, safeDeadzone]
  );

  const handleSelectMode = useCallback(
    (nextMode: JoystickControlMode) => {
      if (disabled || nextMode === activeMode) return;
      abortActivePointer();
      if (!isModeControlled) {
        setUncontrolledMode(nextMode);
      }
      onModeChange?.(nextMode);
    },
    [abortActivePointer, activeMode, disabled, isModeControlled, onModeChange]
  );

  const handleToggleSpring = useCallback(() => {
    setIsSpringReturn((prev) => !prev);
  }, []);

  const handleCenter = useCallback(() => {
    commitPoint(DEFAULT_POINT);
  }, [commitPoint]);

  const handleGimbalPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (disabled || event.button > 0) return;
      event.preventDefault();
      event.currentTarget.focus();
      cleanupPointerRef.current?.();

      const padEl = event.currentTarget;
      let workingVector = latestRef.current.currentVector;
      setIsDragging(true);

      const applyPoint = (clientX: number, clientY: number) => {
        const rect = padEl.getBoundingClientRect();
        if (
          !Number.isFinite(rect.width) ||
          !Number.isFinite(rect.height) ||
          rect.width <= 0 ||
          rect.height <= 0
        ) {
          return;
        }

        const svgX = ((clientX - rect.left) / rect.width) * SVG_SIZE;
        const svgY = ((clientY - rect.top) / rect.height) * SVG_SIZE;
        const rawX = (svgX - GIMBAL_CENTER) / GIMBAL_RADIUS;
        const rawY = (GIMBAL_CENTER - svgY) / GIMBAL_RADIUS;

        const next = normalizeJoystickVector({ x: rawX, y: rawY }, latestRef.current.safeDeadzone);
        if (vectorsEqual(workingVector, next)) return;

        workingVector = next;
        if (!latestRef.current.isValueControlled) {
          setUncontrolledVector(next);
        }
        latestRef.current.onChange?.(next);
      };

      applyPoint(event.clientX, event.clientY);

      const handlePointerMove = createCoalescedPointerMove((moveEvent: PointerEvent) => {
        applyPoint(moveEvent.clientX, moveEvent.clientY);
      });

      const cleanup = () => {
        handlePointerMove.cancel();
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerEnd);
        window.removeEventListener('pointercancel', handlePointerEnd);
        cleanupPointerRef.current = null;
      };

      const handlePointerEnd = () => {
        cleanup();
        setIsDragging(false);
        if (
          latestRef.current.isSpringReturn &&
          !vectorsEqual(workingVector, CENTER_VECTOR)
        ) {
          workingVector = CENTER_VECTOR;
          if (!latestRef.current.isValueControlled) {
            setUncontrolledVector(CENTER_VECTOR);
          }
          latestRef.current.onChange?.(CENTER_VECTOR);
        }
      };

      cleanupPointerRef.current = cleanup;
      window.addEventListener('pointermove', handlePointerMove, { passive: true });
      window.addEventListener('pointerup', handlePointerEnd);
      window.addEventListener('pointercancel', handlePointerEnd);
    },
    [disabled]
  );

  const handleGimbalKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (disabled || event.nativeEvent.isComposing) return;

      const step = event.shiftKey ? FINE_STEP : COARSE_STEP;
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;

      let targetX = currentVector.x;
      let targetY = currentVector.y;

      if (key === 'ArrowUp' || key === 'w') {
        targetY = currentVector.y + step;
      } else if (key === 'ArrowDown' || key === 's') {
        targetY = currentVector.y - step;
      } else if (key === 'ArrowRight' || key === 'd') {
        targetX = currentVector.x + step;
      } else if (key === 'ArrowLeft' || key === 'a') {
        targetX = currentVector.x - step;
      } else if (key === 'Home' || key === ' ') {
        targetX = 0;
        targetY = 0;
      } else {
        return;
      }

      event.preventDefault();
      commitPoint({ x: targetX, y: targetY });
    },
    [commitPoint, currentVector.x, currentVector.y, disabled]
  );

  const handleDpadPointerDown = useCallback(
    (
      event: ReactPointerEvent<HTMLButtonElement>,
      direction: JoystickCardinalDirection,
      point: JoystickPoint
    ) => {
      if (disabled || event.button > 0) return;
      cleanupPointerRef.current?.();
      dpadPointerHandledRef.current = true;
      setPressedDpadDir(direction);

      let workingVector = latestRef.current.currentVector;
      const next = normalizeJoystickVector(point, latestRef.current.safeDeadzone);
      if (!vectorsEqual(workingVector, next)) {
        workingVector = next;
        if (!latestRef.current.isValueControlled) {
          setUncontrolledVector(next);
        }
        latestRef.current.onChange?.(next);
      }

      const cleanup = () => {
        window.removeEventListener('pointerup', handlePointerEnd);
        window.removeEventListener('pointercancel', handlePointerEnd);
        cleanupPointerRef.current = null;
      };

      const handlePointerEnd = () => {
        cleanup();
        setPressedDpadDir(null);
        if (
          latestRef.current.isSpringReturn &&
          direction !== 'CENTER' &&
          !vectorsEqual(workingVector, CENTER_VECTOR)
        ) {
          workingVector = CENTER_VECTOR;
          if (!latestRef.current.isValueControlled) {
            setUncontrolledVector(CENTER_VECTOR);
          }
          latestRef.current.onChange?.(CENTER_VECTOR);
        }
      };

      cleanupPointerRef.current = cleanup;
      window.addEventListener('pointerup', handlePointerEnd);
      window.addEventListener('pointercancel', handlePointerEnd);
    },
    [disabled]
  );

  const handleDpadClick = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>, point: JoystickPoint) => {
      if (dpadPointerHandledRef.current && event.detail > 0) {
        dpadPointerHandledRef.current = false;
        return;
      }
      dpadPointerHandledRef.current = false;
      commitPoint(point);
    },
    [commitPoint]
  );

  const handleDpadKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, point: JoystickPoint) => {
      if (disabled || event.nativeEvent.isComposing) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        dpadPointerHandledRef.current = false;
        commitPoint(point);
      }
    },
    [commitPoint, disabled]
  );

  const isCentered = currentVector.direction === 'CENTER';
  const magnitudePercent = Math.round(currentVector.magnitude * 100);
  const puckX = roundTwo(GIMBAL_CENTER + currentVector.x * PUCK_TRAVEL_RADIUS);
  const puckY = roundTwo(GIMBAL_CENTER - currentVector.y * PUCK_TRAVEL_RADIUS);
  const deadzoneRadius = roundTwo(safeDeadzone * GIMBAL_RADIUS);

  const formattedX = formatSignedAxis(currentVector.x);
  const formattedY = formatSignedAxis(currentVector.y);
  const formattedMagnitude = currentVector.magnitude.toFixed(2);
  const formattedHeading = `${currentVector.angleDeg}°`;

  const merged = mergeProps({
    themeTarget: themeProps('virtual-joystick-pad', {
      disabled,
      mode: activeMode,
      dragging: isDragging,
      springReturn: isSpringReturn,
      active: !isCentered,
      direction: currentVector.direction.toLowerCase(),
    }),
    baseClassName: 'prism-slab w-full max-w-full p-4 sm:p-5 space-y-4 select-none',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });


  const isDirActive = (dir: JoystickCardinalDirection) =>
    pressedDpadDir === dir || currentVector.direction === dir;

  return (
    <div ref={ref} role="region" aria-label={title} {...rest} {...merged}>
      {/* Top Header */}
      <div className={cx(headerClass, 'flex flex-wrap items-center justify-between gap-2.5 min-w-0')}>
        <div className="flex items-center gap-2 min-w-0">
          <Gamepad2
            aria-hidden="true"
            className="w-4 h-4 shrink-0"
            style={{
              color:
                !isCentered || isDragging
                  ? 'var(--prism-primary-main)'
                  : 'var(--prism-text-secondary)',
            }}
          />
          <span
            data-testid="joystick-title"
            className="text-sm font-semibold tracking-tight truncate"
            style={STYLE_TEXT_PRIMARY}
          >
            {title}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 min-w-0">
          {/* Analog Stick / Tactile D-Pad Switcher */}
          <div
            role="group"
            aria-label="Controller input mode"
            className="prism-well inline-flex items-center p-0.5 rounded-full gap-0.5 max-w-full"
          >
            <button
              type="button"
              disabled={disabled}
              aria-pressed={activeMode === 'analog'}
              data-testid="joystick-mode-analog"
              onClick={() => handleSelectMode('analog')}
              className={cx(
                'prism-focus-ring px-2.5 py-1 rounded-full text-xs font-semibold transition-[color,background-color,border-color,opacity,transform] cursor-pointer disabled:cursor-not-allowed shrink-0',
                activeMode === 'analog' ? 'prism-crystal' : 'opacity-70',
                disabled ? 'opacity-50' : ''
              )}
              style={{
                color:
                  activeMode === 'analog'
                    ? 'var(--prism-text-primary)'
                    : 'var(--prism-text-secondary)',
              }}
            >
              Analog Stick
            </button>
            <button
              type="button"
              disabled={disabled}
              aria-pressed={activeMode === 'dpad'}
              data-testid="joystick-mode-dpad"
              onClick={() => handleSelectMode('dpad')}
              className={cx(
                'prism-focus-ring px-2.5 py-1 rounded-full text-xs font-semibold transition-[color,background-color,border-color,opacity,transform] cursor-pointer disabled:cursor-not-allowed shrink-0',
                activeMode === 'dpad' ? 'prism-crystal' : 'opacity-70',
                disabled ? 'opacity-50' : ''
              )}
              style={{
                color:
                  activeMode === 'dpad'
                    ? 'var(--prism-text-primary)'
                    : 'var(--prism-text-secondary)',
              }}
            >
              Tactile D-Pad
            </button>
          </div>

          {/* Spring Return Toggle */}
          <button
            type="button"
            disabled={disabled}
            aria-pressed={isSpringReturn}
            data-testid="joystick-spring-toggle"
            onClick={handleToggleSpring}
            className={cx(
              'prism-crystal prism-focus-ring inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-opacity cursor-pointer disabled:cursor-not-allowed shrink-0',
              disabled ? 'opacity-50' : ''
            )}
            style={STYLE_TEXT_PRIMARY}
          >
            <span
              aria-hidden="true"
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{
                backgroundColor: isSpringReturn
                  ? 'var(--prism-primary-main)'
                  : 'var(--prism-text-disabled)',
              }}
            />
            <span>Spring Return</span>
          </button>

          {/* Center Button */}
          <button
            type="button"
            disabled={disabled || isCentered}
            data-testid="joystick-center-btn"
            aria-label={`Center ${title}`}
            onClick={handleCenter}
            className={cx(
              'prism-crystal prism-focus-ring inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-opacity cursor-pointer disabled:cursor-not-allowed shrink-0',
              disabled || isCentered ? 'opacity-50' : ''
            )}
            style={STYLE_TEXT_PRIMARY}
          >
            <RotateCcw aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
            <span>Center</span>
          </button>
        </div>
      </div>

      {/* Main Tactile Stage */}
      <div
        data-testid="joystick-stage"
        className={cx(
          stageClass,
          'prism-well rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center min-w-0 max-w-full'
        )}
      >
        {activeMode === 'analog' ? (
          <div
            role="slider"
            aria-label={`${title} analog thumbstick`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={magnitudePercent}
            aria-valuetext={`X ${formattedX}, Y ${formattedY}, Magnitude ${formattedMagnitude}, Heading ${formattedHeading}, Direction ${currentVector.direction}`}
            aria-disabled={disabled || undefined}
            tabIndex={disabled ? -1 : 0}
            data-testid="joystick-gimbal"
            data-dragging={isDragging ? 'true' : undefined}
            onPointerDown={handleGimbalPointerDown}
            onKeyDown={handleGimbalKeyDown}
            style={{ touchAction: 'none' }}
            className={cx(
              gimbalClass,
              'prism-focus-ring relative w-full max-w-[240px] mx-auto rounded-full touch-none',
              disabled
                ? 'opacity-50 cursor-not-allowed'
                : isDragging
                  ? 'cursor-grabbing'
                  : 'cursor-grab'
            )}
          >
            <svg
              viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
              aria-hidden="true"
              data-testid="joystick-svg"
              className="w-full max-w-[240px] h-auto mx-auto select-none block overflow-visible pointer-events-none prism-contain-leaf"
            >
              <defs>
                <radialGradient id={wellGradId} cx="50%" cy="46%" r="54%">
                  <stop offset="0%" stopColor="var(--prism-well-end)" />
                  <stop offset="100%" stopColor="var(--prism-well-start)" />
                </radialGradient>
                <radialGradient id={puckGlowId} cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="var(--prism-primary-main)" stopOpacity={0.44} />
                  <stop offset="100%" stopColor="var(--prism-primary-main)" stopOpacity={0} />
                </radialGradient>
              </defs>

              {/* Outer Optical Bezel Ring */}
              <circle
                cx={GIMBAL_CENTER}
                cy={GIMBAL_CENTER}
                r={89}
                fill="none"
                stroke="var(--prism-divider)"
                strokeWidth={1.5}
              />

              {/* Cardinal & Intercardinal Ticks */}
              {GIMBAL_TICKS.map((tick) => (
                <line
                  key={tick.id}
                  x1={tick.x1}
                  y1={tick.y1}
                  x2={tick.x2}
                  y2={tick.y2}
                  stroke={tick.major ? 'var(--prism-well-border)' : 'var(--prism-divider)'}
                  strokeWidth={tick.major ? 1.75 : 1.1}
                  strokeLinecap="round"
                />
              ))}

              {/* Cardinal Labels */}
              <text
                x={GIMBAL_CENTER}
                y={14}
                textAnchor="middle"
                fontSize={10}
                fontWeight={700}
                fill="var(--prism-text-secondary)"
              >
                N
              </text>
              <text
                x={209}
                y={GIMBAL_CENTER + 3.5}
                textAnchor="middle"
                fontSize={10}
                fontWeight={700}
                fill="var(--prism-text-secondary)"
              >
                E
              </text>
              <text
                x={GIMBAL_CENTER}
                y={214}
                textAnchor="middle"
                fontSize={10}
                fontWeight={700}
                fill="var(--prism-text-secondary)"
              >
                S
              </text>
              <text
                x={11}
                y={GIMBAL_CENTER + 3.5}
                textAnchor="middle"
                fontSize={10}
                fontWeight={700}
                fill="var(--prism-text-secondary)"
              >
                W
              </text>

              {/* Recessed Circular Gimbal Well */}
              <circle
                cx={GIMBAL_CENTER}
                cy={GIMBAL_CENTER}
                r={GIMBAL_RADIUS}
                fill={`url(#${wellGradId})`}
                stroke="var(--prism-well-border)"
                strokeWidth={1.75}
              />

              {/* Concentric Calibration Rings */}
              {GIMBAL_RINGS.map((ring) => (
                <circle
                  key={ring.id}
                  data-testid={`joystick-ring-${ring.id}`}
                  cx={GIMBAL_CENTER}
                  cy={GIMBAL_CENTER}
                  r={ring.radius}
                  fill="none"
                  stroke={ring.isOuter ? 'var(--prism-well-border)' : 'var(--prism-divider)'}
                  strokeWidth={ring.isOuter ? 1.25 : 1}
                  strokeDasharray={ring.isOuter ? undefined : '3 3'}
                />
              ))}

              {/* Subtle Gimbal Crosshair Axes */}
              <line
                x1={GIMBAL_CENTER - GIMBAL_RADIUS}
                y1={GIMBAL_CENTER}
                x2={GIMBAL_CENTER + GIMBAL_RADIUS}
                y2={GIMBAL_CENTER}
                stroke="var(--prism-divider)"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              <line
                x1={GIMBAL_CENTER}
                y1={GIMBAL_CENTER - GIMBAL_RADIUS}
                x2={GIMBAL_CENTER}
                y2={GIMBAL_CENTER + GIMBAL_RADIUS}
                stroke="var(--prism-divider)"
                strokeWidth={1}
                strokeDasharray="3 3"
              />

              {/* Deadzone Threshold Ring */}
              {deadzoneRadius > 0 && (
                <circle
                  data-testid="joystick-deadzone-ring"
                  cx={GIMBAL_CENTER}
                  cy={GIMBAL_CENTER}
                  r={deadzoneRadius}
                  fill="var(--prism-well-start)"
                  stroke="var(--prism-secondary-main)"
                  strokeWidth={1.1}
                  strokeDasharray="2 2"
                  opacity={0.75}
                />
              )}

              {/* Center Origin Spindle */}
              <circle
                cx={GIMBAL_CENTER}
                cy={GIMBAL_CENTER}
                r={3}
                fill="var(--prism-well-end)"
                stroke="var(--prism-well-border)"
                strokeWidth={1.25}
              />

              {/* Luminous Active Vector Ray */}
              <line
                data-testid="joystick-vector-glow"
                x1={GIMBAL_CENTER}
                y1={GIMBAL_CENTER}
                x2={puckX}
                y2={puckY}
                stroke="var(--prism-primary-main)"
                strokeWidth={7}
                strokeLinecap="round"
                opacity={isCentered ? 0 : isDragging ? 0.36 : 0.22}
              />
              <line
                data-testid="joystick-vector-ray"
                x1={GIMBAL_CENTER}
                y1={GIMBAL_CENTER}
                x2={puckX}
                y2={puckY}
                stroke="var(--prism-primary-main)"
                strokeWidth={2.75}
                strokeLinecap="round"
                opacity={isCentered ? 0 : 0.95}
              />

              {/* Draggable Optical Thumbstick Puck */}
              <g data-testid="joystick-puck">
                <circle
                  cx={puckX}
                  cy={puckY}
                  r={isDragging ? 24 : 20}
                  fill={`url(#${puckGlowId})`}
                  opacity={isCentered && !isDragging ? 0.35 : 0.95}
                />
                <circle
                  cx={puckX}
                  cy={puckY}
                  r={16}
                  fill="var(--prism-crystal-top)"
                  stroke={
                    isDragging || !isCentered
                      ? 'var(--prism-primary-main)'
                      : 'var(--prism-well-border)'
                  }
                  strokeWidth={2}
                />
                <circle
                  cx={puckX}
                  cy={puckY}
                  r={10}
                  fill="var(--prism-well-start)"
                  stroke="var(--prism-divider)"
                  strokeWidth={1.25}
                />
                <circle
                  cx={puckX}
                  cy={puckY}
                  r={3.5}
                  fill={
                    isDragging || !isCentered
                      ? 'var(--prism-primary-main)'
                      : 'var(--prism-secondary-main)'
                  }
                />
              </g>
            </svg>
          </div>
        ) : (
          /* Tactile 5-Way Cruciform Optical D-Pad */
          <div
            role="group"
            aria-label={`${title} directional pad`}
            data-testid="joystick-dpad-grid"
            className={cx(
              dpadClass,
              'grid grid-cols-3 grid-rows-3 gap-2 w-full max-w-[204px] aspect-square mx-auto'
            )}
          >
            {/* Row 1: Up */}
            <div aria-hidden="true" />
            <button
              type="button"
              disabled={disabled}
              aria-label="D-Pad Up"
              aria-pressed={isDirActive('N')}
              data-testid="joystick-dpad-up"
              onPointerDown={(e) => handleDpadPointerDown(e, 'N', DPAD_UP_POINT)}
              onClick={(e) => handleDpadClick(e, DPAD_UP_POINT)}
              onKeyDown={(e) => handleDpadKeyDown(e, DPAD_UP_POINT)}
              style={{
                touchAction: 'none',
                color: isDirActive('N')
                  ? 'var(--prism-primary-main)'
                  : 'var(--prism-text-primary)',
                borderColor: isDirActive('N')
                  ? 'var(--prism-primary-main)'
                  : 'var(--prism-well-border)',
              }}
              className={cx(
                'prism-focus-ring flex flex-col items-center justify-center rounded-2xl border transition-[color,background-color,border-color,opacity,transform] cursor-pointer disabled:cursor-not-allowed',
                isDirActive('N') ? 'prism-well scale-95' : 'prism-crystal',
                disabled ? 'opacity-50' : ''
              )}
            >
              <ChevronUp aria-hidden="true" className="w-5 h-5" />
              <span className="text-[10px] font-bold tracking-wider">N</span>
            </button>
            <div aria-hidden="true" />

            {/* Row 2: Left, Center, Right */}
            <button
              type="button"
              disabled={disabled}
              aria-label="D-Pad Left"
              aria-pressed={isDirActive('W')}
              data-testid="joystick-dpad-left"
              onPointerDown={(e) => handleDpadPointerDown(e, 'W', DPAD_LEFT_POINT)}
              onClick={(e) => handleDpadClick(e, DPAD_LEFT_POINT)}
              onKeyDown={(e) => handleDpadKeyDown(e, DPAD_LEFT_POINT)}
              style={{
                touchAction: 'none',
                color: isDirActive('W')
                  ? 'var(--prism-primary-main)'
                  : 'var(--prism-text-primary)',
                borderColor: isDirActive('W')
                  ? 'var(--prism-primary-main)'
                  : 'var(--prism-well-border)',
              }}
              className={cx(
                'prism-focus-ring flex flex-col items-center justify-center rounded-2xl border transition-[color,background-color,border-color,opacity,transform] cursor-pointer disabled:cursor-not-allowed',
                isDirActive('W') ? 'prism-well scale-95' : 'prism-crystal',
                disabled ? 'opacity-50' : ''
              )}
            >
              <ChevronLeft aria-hidden="true" className="w-5 h-5" />
              <span className="text-[10px] font-bold tracking-wider">W</span>
            </button>

            <button
              type="button"
              disabled={disabled}
              aria-label="D-Pad Center"
              aria-pressed={isDirActive('CENTER')}
              data-testid="joystick-dpad-center"
              onPointerDown={(e) => handleDpadPointerDown(e, 'CENTER', DPAD_CENTER_POINT)}
              onClick={(e) => handleDpadClick(e, DPAD_CENTER_POINT)}
              onKeyDown={(e) => handleDpadKeyDown(e, DPAD_CENTER_POINT)}
              style={{
                touchAction: 'none',
                color: isDirActive('CENTER')
                  ? 'var(--prism-primary-main)'
                  : 'var(--prism-text-secondary)',
                borderColor: isDirActive('CENTER')
                  ? 'var(--prism-primary-main)'
                  : 'var(--prism-well-border)',
              }}
              className={cx(
                'prism-focus-ring flex flex-col items-center justify-center rounded-full border transition-[color,background-color,border-color,opacity,transform] cursor-pointer disabled:cursor-not-allowed',
                isDirActive('CENTER') ? 'prism-well scale-95' : 'prism-crystal',
                disabled ? 'opacity-50' : ''
              )}
            >
              <Crosshair aria-hidden="true" className="w-4 h-4" />
            </button>

            <button
              type="button"
              disabled={disabled}
              aria-label="D-Pad Right"
              aria-pressed={isDirActive('E')}
              data-testid="joystick-dpad-right"
              onPointerDown={(e) => handleDpadPointerDown(e, 'E', DPAD_RIGHT_POINT)}
              onClick={(e) => handleDpadClick(e, DPAD_RIGHT_POINT)}
              onKeyDown={(e) => handleDpadKeyDown(e, DPAD_RIGHT_POINT)}
              style={{
                touchAction: 'none',
                color: isDirActive('E')
                  ? 'var(--prism-primary-main)'
                  : 'var(--prism-text-primary)',
                borderColor: isDirActive('E')
                  ? 'var(--prism-primary-main)'
                  : 'var(--prism-well-border)',
              }}
              className={cx(
                'prism-focus-ring flex flex-col items-center justify-center rounded-2xl border transition-[color,background-color,border-color,opacity,transform] cursor-pointer disabled:cursor-not-allowed',
                isDirActive('E') ? 'prism-well scale-95' : 'prism-crystal',
                disabled ? 'opacity-50' : ''
              )}
            >
              <ChevronRight aria-hidden="true" className="w-5 h-5" />
              <span className="text-[10px] font-bold tracking-wider">E</span>
            </button>

            {/* Row 3: Down */}
            <div aria-hidden="true" />
            <button
              type="button"
              disabled={disabled}
              aria-label="D-Pad Down"
              aria-pressed={isDirActive('S')}
              data-testid="joystick-dpad-down"
              onPointerDown={(e) => handleDpadPointerDown(e, 'S', DPAD_DOWN_POINT)}
              onClick={(e) => handleDpadClick(e, DPAD_DOWN_POINT)}
              onKeyDown={(e) => handleDpadKeyDown(e, DPAD_DOWN_POINT)}
              style={{
                touchAction: 'none',
                color: isDirActive('S')
                  ? 'var(--prism-primary-main)'
                  : 'var(--prism-text-primary)',
                borderColor: isDirActive('S')
                  ? 'var(--prism-primary-main)'
                  : 'var(--prism-well-border)',
              }}
              className={cx(
                'prism-focus-ring flex flex-col items-center justify-center rounded-2xl border transition-[color,background-color,border-color,opacity,transform] cursor-pointer disabled:cursor-not-allowed',
                isDirActive('S') ? 'prism-well scale-95' : 'prism-crystal',
                disabled ? 'opacity-50' : ''
              )}
            >
              <span className="text-[10px] font-bold tracking-wider">S</span>
              <ChevronDown aria-hidden="true" className="w-5 h-5" />
            </button>
            <div aria-hidden="true" />
          </div>
        )}
      </div>

      {/* Live Telemetry Footer */}
      <div
        aria-live="polite"
        data-testid="joystick-telemetry"
        className={cx(footerClass, 'grid grid-cols-2 sm:grid-cols-5 gap-2 min-w-0 max-w-full')}
      >
        <div className="prism-well rounded-xl px-3 py-2 flex flex-col gap-0.5 min-w-0">
          <span
            className="text-[10px] font-semibold uppercase tracking-wider truncate"
            style={STYLE_TEXT_SECONDARY}
          >
            X
          </span>
          <span
            data-testid="joystick-readout-x"
            className="font-mono text-xs font-semibold tabular-nums truncate"
            style={STYLE_TEXT_PRIMARY}
          >
            {formattedX}
          </span>
        </div>

        <div className="prism-well rounded-xl px-3 py-2 flex flex-col gap-0.5 min-w-0">
          <span
            className="text-[10px] font-semibold uppercase tracking-wider truncate"
            style={STYLE_TEXT_SECONDARY}
          >
            Y
          </span>
          <span
            data-testid="joystick-readout-y"
            className="font-mono text-xs font-semibold tabular-nums truncate"
            style={STYLE_TEXT_PRIMARY}
          >
            {formattedY}
          </span>
        </div>

        <div className="prism-well rounded-xl px-3 py-2 flex flex-col gap-0.5 min-w-0">
          <span
            className="text-[10px] font-semibold uppercase tracking-wider truncate"
            style={STYLE_TEXT_SECONDARY}
          >
            MAG
          </span>
          <span
            data-testid="joystick-readout-mag"
            className="font-mono text-xs font-semibold tabular-nums truncate"
            style={STYLE_TEXT_PRIMARY}
          >
            {formattedMagnitude}
          </span>
        </div>

        <div className="prism-well rounded-xl px-3 py-2 flex flex-col gap-0.5 min-w-0">
          <span
            className="text-[10px] font-semibold uppercase tracking-wider truncate"
            style={STYLE_TEXT_SECONDARY}
          >
            HDG
          </span>
          <span
            data-testid="joystick-readout-hdg"
            className="font-mono text-xs font-semibold tabular-nums truncate"
            style={STYLE_TEXT_PRIMARY}
          >
            {formattedHeading}
          </span>
        </div>

        <div className="prism-well rounded-xl px-3 py-2 flex flex-col justify-center gap-0.5 min-w-0 col-span-2 sm:col-span-1">
          <span
            className="text-[10px] font-semibold uppercase tracking-wider truncate"
            style={STYLE_TEXT_SECONDARY}
          >
            DIR
          </span>
          <span
            data-testid="joystick-readout-dir"
            className={cx(
              isCentered ? 'prism-well' : 'prism-crystal',
              'inline-flex items-center justify-center self-start px-2 py-0.5 rounded-full font-mono text-[11px] font-bold tracking-wider'
            )}
            style={{
              color: isCentered
                ? 'var(--prism-text-secondary)'
                : 'var(--prism-primary-main)',
            }}
          >
            {currentVector.direction}
          </span>
        </div>
      </div>
    </div>
  );
}

export const VirtualJoystickPad = /*#__PURE__*/ memoWithDisplayName(VirtualJoystickPadInner, 'VirtualJoystickPad');
