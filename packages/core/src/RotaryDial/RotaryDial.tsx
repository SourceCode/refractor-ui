'use client';

import {
  memo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { themeProps } from '../utils/themeProps';

type RotaryDialBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface RotaryDialProps extends RotaryDialBaseProps {
  /** Controlled numeric value. */
  value?: number;
  /** Initial numeric value in uncontrolled mode and double-click reset target (defaults to 50). */
  defaultValue?: number;
  /** Callback fired with the next clamped and step-snapped value. */
  onChange?: (next: number) => void;
  /** Minimum inclusive numeric bound (defaults to 0). */
  min?: number;
  /** Maximum inclusive numeric bound (defaults to 100). */
  max?: number;
  /** Increment step size (defaults to 1). */
  step?: number;
  /** Unit suffix appended to the tabular value readout (defaults to '°'). */
  unit?: string;
  /** Visible label and accessible slider name (defaults to 'Dial'). */
  label?: string;
  /** Outer SVG dial diameter in pixels, clamped to [64..160] (defaults to 96). */
  size?: number;
  /** Disables pointer drag, double-click reset, and keyboard adjustments. */
  disabled?: boolean;
}

interface DragSession {
  pointerId: number;
  startX: number;
  startY: number;
  startValue: number;
  lastEmitted: number;
}

interface CalibrationTick {
  id: string;
  x: number;
  y: number;
}

const DEFAULT_VALUE = 50;
const DEFAULT_MIN = 0;
const DEFAULT_MAX = 100;
const DEFAULT_STEP = 1;
const DEFAULT_SIZE = 96;
const MIN_SIZE = 64;
const MAX_SIZE = 160;
const VIEWBOX_SIZE = 120;
const CENTER = 60;
const TRACK_RADIUS = 46;
const TICK_RADIUS = 55;
const START_ANGLE_DEG = -135;
const SWEEP_DEGREES = 270;
const DRAG_FULL_SPAN_PX = 180;
const PAGE_STEP_MULTIPLIER = 10;

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

function getStepDecimals(step: number): number {
  const text = String(step);
  const dotIdx = text.indexOf('.');
  if (dotIdx === -1) return 0;
  return Math.min(6, text.length - dotIdx - 1);
}

function snapAndClamp(
  raw: number,
  min: number,
  max: number,
  step: number,
  fallback: number
): number {
  const clamped = clampNumber(raw, min, max, fallback);
  const stepsFromMin = Math.round((clamped - min) / step);
  const snapped = min + stepsFromMin * step;
  const decimals = getStepDecimals(step);
  const rounded = Number(snapped.toFixed(decimals));
  const normalizedZero = rounded === 0 ? 0 : rounded;
  return clampNumber(normalizedZero, min, max, fallback);
}

const TRACK_START = polarToCartesian(CENTER, CENTER, TRACK_RADIUS, START_ANGLE_DEG);
const TRACK_END = polarToCartesian(CENTER, CENTER, TRACK_RADIUS, START_ANGLE_DEG + SWEEP_DEGREES);
const TRACK_ARC_PATH = `M ${TRACK_START.x} ${TRACK_START.y} A ${TRACK_RADIUS} ${TRACK_RADIUS} 0 1 1 ${TRACK_END.x} ${TRACK_END.y}`;
const TOTAL_ARC_LENGTH = roundTwo((2 * Math.PI * TRACK_RADIUS * SWEEP_DEGREES) / 360);

const CALIBRATION_TICKS: ReadonlyArray<CalibrationTick> = [-135, 0, 135].map((deg) => {
  const pt = polarToCartesian(CENTER, CENTER, TICK_RADIUS, deg);
  return { id: `tick-${deg}`, x: pt.x, y: pt.y };
});

function RotaryDialInner({
  value,
  defaultValue = DEFAULT_VALUE,
  onChange,
  min = DEFAULT_MIN,
  max = DEFAULT_MAX,
  step = DEFAULT_STEP,
  unit = '°',
  label = 'Dial',
  size = DEFAULT_SIZE,
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: RotaryDialProps) {
  const override = useComponentOverride('RotaryDial');
  const dragSessionRef = useRef<DragSession | null>(null);
  const [dragging, setDragging] = useState<boolean>(false);

  const rawMin = Number.isFinite(min) ? min : DEFAULT_MIN;
  const rawMax = Number.isFinite(max) ? max : DEFAULT_MAX;
  const safeMin = Math.min(rawMin, rawMax);
  const safeMax = Math.max(rawMin, rawMax);
  const safeStep = Number.isFinite(step) && step > 0 ? step : DEFAULT_STEP;
  const safeSize = Math.round(clampNumber(size, MIN_SIZE, MAX_SIZE, DEFAULT_SIZE));
  const safeDefault = snapAndClamp(defaultValue, safeMin, safeMax, safeStep, safeMin);

  const [rawValue, setRawValue] = useControllableState<number>({
    value,
    defaultValue: safeDefault,
    onChange,
  });

  const current = snapAndClamp(rawValue, safeMin, safeMax, safeStep, safeDefault);
  const span = safeMax - safeMin;
  const progress = span === 0 ? 0 : clampNumber((current - safeMin) / span, 0, 1, 0);
  const angleDeg = roundTwo(START_ANGLE_DEG + progress * SWEEP_DEGREES);
  const activeArcLength = roundTwo(TOTAL_ARC_LENGTH * progress);
  const faceSize = Math.round(safeSize * 0.62);
  const isDragging = dragging && !disabled;

  const commitValue = (rawNext: number) => {
    const next = snapAndClamp(rawNext, safeMin, safeMax, safeStep, current);
    if (next !== current) {
      setRawValue(next);
    }
  };

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled || e.button > 0) return;
    e.preventDefault();
    e.currentTarget.focus();

    dragSessionRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startValue: current,
      lastEmitted: current,
    };

    setDragging(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const session = dragSessionRef.current;
    if (!session || disabled || e.pointerId !== session.pointerId) return;

    const dx = e.clientX - session.startX;
    const dy = e.clientY - session.startY;
    const sensitivity = span === 0 ? 0 : span / DRAG_FULL_SPAN_PX;
    const nextRaw = session.startValue + (dx - dy) * sensitivity;
    const next = snapAndClamp(nextRaw, safeMin, safeMax, safeStep, session.lastEmitted);

    if (next !== session.lastEmitted) {
      session.lastEmitted = next;
      setRawValue(next);
    }
  };

  const handlePointerEnd = (e: ReactPointerEvent<HTMLDivElement>) => {
    const session = dragSessionRef.current;
    if (!session || e.pointerId !== session.pointerId) return;

    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    }

    dragSessionRef.current = null;
    setDragging(false);
  };

  const handleDoubleClick = () => {
    if (disabled) return;
    commitValue(safeDefault);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (disabled || e.nativeEvent.isComposing) return;

    let targetRaw: number | null = null;
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
      targetRaw = current + safeStep;
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
      targetRaw = current - safeStep;
    } else if (e.key === 'PageUp') {
      targetRaw = current + safeStep * PAGE_STEP_MULTIPLIER;
    } else if (e.key === 'PageDown') {
      targetRaw = current - safeStep * PAGE_STEP_MULTIPLIER;
    } else if (e.key === 'Home') {
      targetRaw = safeMin;
    } else if (e.key === 'End') {
      targetRaw = safeMax;
    }

    if (targetRaw === null) return;
    e.preventDefault();
    commitValue(targetRaw);
  };

  const merged = mergeProps({
    themeTarget: themeProps('rotary-dial', {
      disabled,
      dragging: isDragging,
    }),
    baseClassName: 'prism-slab inline-flex flex-col items-center gap-2 p-3.5 rounded-2xl select-none',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const knobClass = stableClassName('rotary-dial', 'knob');
  const faceClass = stableClassName('rotary-dial', 'face');
  const labelClass = stableClassName('rotary-dial', 'label');
  const valueClass = stableClassName('rotary-dial', 'value');

  return (
    <div ref={ref} {...rest} {...merged}>
      <div
        role="slider"
        aria-label={label}
        aria-valuenow={current}
        aria-valuemin={safeMin}
        aria-valuemax={safeMax}
        aria-valuetext={`${current}${unit}`}
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : 0}
        data-testid="rotary-dial-knob"
        data-dragging={isDragging ? 'true' : undefined}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onDoubleClick={handleDoubleClick}
        onKeyDown={handleKeyDown}
        style={{
          width: `${safeSize}px`,
          height: `${safeSize}px`,
          touchAction: 'none',
        }}
        className={cx(
          knobClass,
          'prism-focus-ring relative inline-flex items-center justify-center rounded-full touch-none transition-transform duration-100',
          disabled
            ? 'opacity-50 cursor-not-allowed'
            : isDragging
              ? 'cursor-grabbing'
              : 'cursor-grab'
        )}
      >
        <svg
          width={safeSize}
          height={safeSize}
          viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
          aria-hidden="true"
          data-testid="rotary-dial-svg"
          className="block overflow-visible pointer-events-none"
        >
          {CALIBRATION_TICKS.map((tick) => (
            <circle
              key={tick.id}
              cx={tick.x}
              cy={tick.y}
              r={1.8}
              fill="var(--prism-text-disabled)"
            />
          ))}

          <path
            data-testid="rotary-dial-track"
            d={TRACK_ARC_PATH}
            fill="none"
            stroke="var(--prism-divider)"
            strokeWidth={8}
            strokeLinecap="round"
          />

          <path
            data-testid="rotary-dial-progress"
            d={TRACK_ARC_PATH}
            fill="none"
            stroke="var(--prism-primary-main)"
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={`${activeArcLength} ${TOTAL_ARC_LENGTH}`}
            strokeOpacity={progress > 0 ? 1 : 0}
          />
        </svg>

        <div
          aria-hidden="true"
          data-testid="rotary-dial-face"
          style={{
            width: `${faceSize}px`,
            height: `${faceSize}px`,
          }}
          className={cx(
            faceClass,
            'prism-crystal pointer-events-none absolute rounded-full flex items-center justify-center border border-[var(--prism-divider)]'
          )}
        >
          <svg
            viewBox="0 0 64 64"
            width={faceSize}
            height={faceSize}
            aria-hidden="true"
            className="block pointer-events-none"
          >
            <g
              data-testid="rotary-dial-indicator"
              transform={`rotate(${angleDeg} 32 32)`}
            >
              <line
                x1={32}
                y1={19}
                x2={32}
                y2={8}
                stroke="var(--prism-primary-main)"
                strokeWidth={4}
                strokeLinecap="round"
              />
              <circle
                cx={32}
                cy={32}
                r={3}
                fill="var(--prism-text-secondary)"
                fillOpacity={0.55}
              />
            </g>
          </svg>
        </div>
      </div>

      <div className="flex flex-col items-center gap-0.5 text-center">
        <span
          data-testid="rotary-dial-label"
          className={cx(
            labelClass,
            'text-xs font-semibold tracking-[-0.01em] text-[var(--prism-text-secondary)]'
          )}
        >
          {label}
        </span>
        <span
          data-testid="rotary-dial-value"
          className={cx(
            valueClass,
            'prism-well rounded-full px-2.5 py-0.5 text-xs font-mono font-bold tabular-nums text-[var(--prism-text-primary)]'
          )}
        >
          {current}
          {unit}
        </span>
      </div>
    </div>
  );
}

export const RotaryDial = memo(RotaryDialInner);
RotaryDial.displayName = 'RotaryDial';
