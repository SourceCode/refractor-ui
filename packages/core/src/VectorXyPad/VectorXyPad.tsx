'use client';

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { Crosshair, RotateCcw } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { createCoalescedPointerMove } from '../hooks/useRafCallback';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { STYLE_PRIMARY_MAIN, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export type XyPadGridMode = 'cartesian' | 'polar';

export interface XyVectorValue {
  /** Horizontal coordinate clamped inside [minX..maxX]. */
  x: number;
  /** Vertical coordinate clamped inside [minY..maxY]. */
  y: number;
}

type VectorXyPadBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface VectorXyPadProps extends VectorXyPadBaseProps {
  /** Controlled 2D vector coordinate pair. */
  value?: XyVectorValue;
  /** Initial uncontrolled 2D vector coordinate pair (defaults to { x: 0, y: 0 }). */
  defaultValue?: XyVectorValue;
  /** Minimum horizontal coordinate bound (defaults to -100). */
  minX?: number;
  /** Maximum horizontal coordinate bound (defaults to 100). */
  maxX?: number;
  /** Minimum vertical coordinate bound (defaults to -100). */
  minY?: number;
  /** Maximum vertical coordinate bound (defaults to 100). */
  maxY?: number;
  /** Display label for the X-axis telemetry pill (defaults to 'Light Azimuth (X)'). */
  xLabel?: string;
  /** Display label for the Y-axis telemetry pill (defaults to 'Elevation / Resonance (Y)'). */
  yLabel?: string;
  /** Unit suffix appended to X, Y, and radial magnitude readouts (defaults to '%'). */
  unit?: string;
  /** Coordinate overlay mode ('cartesian' | 'polar', defaults to 'cartesian'). */
  gridMode?: XyPadGridMode;
  /** Optional grid snap increment (defaults to 0 = continuous). */
  snapStep?: number;
  /** Callback invoked whenever the 2D vector coordinate changes. */
  onChange?: (next: XyVectorValue) => void;
  /** Panel header title and accessible region label (defaults to '2D XY Vector Pad'). */
  title?: string;
  /** Disables pad dragging, double-click centering, keyboard nudging, grid switching, and reset. */
  disabled?: boolean;
}

interface AxisBounds {
  min: number;
  max: number;
  span: number;
  mid: number;
}

interface CartesianGridLine {
  id: string;
  pos: number;
  isCenter: boolean;
}

interface PolarRing {
  id: string;
  radius: number;
  isOuter: boolean;
}

interface PolarSpoke {
  id: string;
  x2: number;
  y2: number;
  isCardinal: boolean;
}

const DEFAULT_VECTOR: XyVectorValue = { x: 0, y: 0 };
const DEFAULT_MIN = -100;
const DEFAULT_MAX = 100;
const DEFAULT_X_LABEL = 'Light Azimuth (X)';
const DEFAULT_Y_LABEL = 'Elevation / Resonance (Y)';
const DEFAULT_UNIT = '%';
const DEFAULT_TITLE = '2D XY Vector Pad';

const SVG_SIZE = 220;
const PAD_MIN = 18;
const PAD_SIZE = 184;
const PAD_MAX = PAD_MIN + PAD_SIZE;
const PAD_CENTER = PAD_MIN + PAD_SIZE / 2;
const PAD_HALF = PAD_SIZE / 2;

const COARSE_STEP_RATIO = 0.05;
const FINE_STEP_RATIO = 0.01;

function roundCoord(value: number): number {
  const rounded = Math.round(value * 100) / 100;
  return rounded === 0 ? 0 : rounded;
}

const CARTESIAN_GRID_LINES: ReadonlyArray<CartesianGridLine> = [
  { id: 'q1', pos: roundCoord(PAD_MIN + PAD_SIZE * 0.25), isCenter: false },
  { id: 'center', pos: PAD_CENTER, isCenter: true },
  { id: 'q3', pos: roundCoord(PAD_MIN + PAD_SIZE * 0.75), isCenter: false },
];

const POLAR_RINGS: ReadonlyArray<PolarRing> = [
  { id: 'r25', radius: roundCoord(PAD_HALF * 0.25), isOuter: false },
  { id: 'r50', radius: roundCoord(PAD_HALF * 0.5), isOuter: false },
  { id: 'r75', radius: roundCoord(PAD_HALF * 0.75), isOuter: false },
  { id: 'r100', radius: PAD_HALF, isOuter: true },
];

const POLAR_SPOKE_ANGLES: ReadonlyArray<number> = [0, 45, 90, 135, 180, 225, 270, 315];

const POLAR_SPOKES: ReadonlyArray<PolarSpoke> = POLAR_SPOKE_ANGLES.map((deg) => {
  const rad = (deg * Math.PI) / 180;
  return {
    id: `deg-${deg}`,
    x2: roundCoord(PAD_CENTER + PAD_HALF * Math.cos(rad)),
    y2: roundCoord(PAD_CENTER - PAD_HALF * Math.sin(rad)),
    isCardinal: deg % 90 === 0,
  };
});

function normalizeBounds(
  rawMin: number,
  rawMax: number,
  fallbackMin: number,
  fallbackMax: number
): AxisBounds {
  const safeMin = Number.isFinite(rawMin) ? rawMin : fallbackMin;
  const safeMax = Number.isFinite(rawMax) ? rawMax : fallbackMax;
  const min = Math.min(safeMin, safeMax);
  const max = Math.max(safeMin, safeMax);
  const span = roundCoord(max - min);
  const mid = roundCoord((min + max) / 2);
  return { min, max, span, mid };
}

function normalizeAxis(raw: number, bounds: AxisBounds, snapStep: number): number {
  const clamped = clampNumber(raw, bounds.min, bounds.max, bounds.mid);
  const snapped = snapStep > 0 ? Math.round(clamped / snapStep) * snapStep : clamped;
  return roundCoord(clampNumber(snapped, bounds.min, bounds.max, bounds.mid));
}

function normalizeVector(
  raw: XyVectorValue,
  boundsX: AxisBounds,
  boundsY: AxisBounds,
  snapStep: number
): XyVectorValue {
  return {
    x: normalizeAxis(raw.x, boundsX, snapStep),
    y: normalizeAxis(raw.y, boundsY, snapStep),
  };
}

function vectorsEqual(a: XyVectorValue, b: XyVectorValue): boolean {
  return a.x === b.x && a.y === b.y;
}

function formatCompactNumber(value: number, span: number): string {
  const safe = value === 0 ? 0 : value;
  if (span <= 10) return safe.toFixed(2);
  return Number.isInteger(safe) ? String(safe) : safe.toFixed(1);
}

function formatSignedMetric(value: number, span: number, unit: string): string {
  const formatted = formatCompactNumber(value, span);
  const signed = value > 0 ? `+${formatted}` : formatted;
  return unit ? `${signed}${unit}` : signed;
}

function formatUnsignedMetric(value: number, span: number, unit: string): string {
  const formatted = formatCompactNumber(value, span);
  return unit ? `${formatted}${unit}` : formatted;
}

const headerClass = /*#__PURE__*/ stableClassName('vector-xy-pad', 'header');
const stageClass = /*#__PURE__*/ stableClassName('vector-xy-pad', 'stage');
const padClass = /*#__PURE__*/ stableClassName('vector-xy-pad', 'pad');
const footerClass = /*#__PURE__*/ stableClassName('vector-xy-pad', 'footer');

function VectorXyPadInner({
  value,
  defaultValue = DEFAULT_VECTOR,
  minX = DEFAULT_MIN,
  maxX = DEFAULT_MAX,
  minY = DEFAULT_MIN,
  maxY = DEFAULT_MAX,
  xLabel = DEFAULT_X_LABEL,
  yLabel = DEFAULT_Y_LABEL,
  unit = DEFAULT_UNIT,
  gridMode = 'cartesian',
  snapStep = 0,
  onChange,
  title = DEFAULT_TITLE,
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: VectorXyPadProps) {
  const override = useComponentOverride('VectorXyPad');
  const idPrefix = useId();
  const vectorGradId = `${idPrefix}-vector-grad`;
  const puckGlowId = `${idPrefix}-puck-glow`;

  const boundsX = useMemo(
    () => normalizeBounds(minX, maxX, DEFAULT_MIN, DEFAULT_MAX),
    [minX, maxX]
  );
  const boundsY = useMemo(
    () => normalizeBounds(minY, maxY, DEFAULT_MIN, DEFAULT_MAX),
    [minY, maxY]
  );
  const safeSnapStep = Number.isFinite(snapStep) && snapStep > 0 ? snapStep : 0;

  const centerValue = useMemo<XyVectorValue>(
    () => normalizeVector({ x: boundsX.mid, y: boundsY.mid }, boundsX, boundsY, safeSnapStep),
    [boundsX, boundsY, safeSnapStep]
  );

  const isControlled = value !== undefined;
  const [uncontrolledValue, setUncontrolledValue] = useState<XyVectorValue>(() =>
    normalizeVector(defaultValue, boundsX, boundsY, safeSnapStep)
  );
  const currentValue = useMemo(
    () =>
      normalizeVector(
        value !== undefined ? value : uncontrolledValue,
        boundsX,
        boundsY,
        safeSnapStep
      ),
    [boundsX, boundsY, safeSnapStep, uncontrolledValue, value]
  );

  const [activeGridMode, setActiveGridMode] = useState<XyPadGridMode>(gridMode);
  useEffect(() => {
    setActiveGridMode(gridMode);
  }, [gridMode]);

  const [isDragging, setIsDragging] = useState(false);
  const cleanupDragRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (disabled) {
      cleanupDragRef.current?.();
      setIsDragging(false);
    }
  }, [disabled]);

  useEffect(() => {
    return () => {
      cleanupDragRef.current?.();
    };
  }, []);

  const latestRef = useRef({
    currentValue,
    isControlled,
    boundsX,
    boundsY,
    safeSnapStep,
    onChange,
  });
  latestRef.current = {
    currentValue,
    isControlled,
    boundsX,
    boundsY,
    safeSnapStep,
    onChange,
  };

  const commitValue = useCallback(
    (rawNext: XyVectorValue) => {
      const normalized = normalizeVector(rawNext, boundsX, boundsY, safeSnapStep);
      if (vectorsEqual(currentValue, normalized)) return;
      if (!isControlled) {
        setUncontrolledValue(normalized);
      }
      onChange?.(normalized);
    },
    [boundsX, boundsY, currentValue, isControlled, onChange, safeSnapStep]
  );

  const handlePadPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (disabled || event.button > 0) return;
      event.preventDefault();
      event.currentTarget.focus();
      cleanupDragRef.current?.();

      const padEl = event.currentTarget;
      let workingValue = latestRef.current.currentValue;
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
        const normX = clampNumber((svgX - PAD_MIN) / PAD_SIZE, 0, 1, 0.5);
        const normY = clampNumber((PAD_MAX - svgY) / PAD_SIZE, 0, 1, 0.5);

        const { boundsX: bX, boundsY: bY, safeSnapStep: step } = latestRef.current;
        const rawX = bX.min + normX * bX.span;
        const rawY = bY.min + normY * bY.span;
        const next = normalizeVector({ x: rawX, y: rawY }, bX, bY, step);

        if (vectorsEqual(workingValue, next)) return;

        workingValue = next;
        if (!latestRef.current.isControlled) {
          setUncontrolledValue(next);
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
        cleanupDragRef.current = null;
      };

      const handlePointerEnd = () => {
        cleanup();
        setIsDragging(false);
      };

      cleanupDragRef.current = cleanup;
      window.addEventListener('pointermove', handlePointerMove, { passive: true });
      window.addEventListener('pointerup', handlePointerEnd);
      window.addEventListener('pointercancel', handlePointerEnd);
    },
    [disabled]
  );

  const handlePadDoubleClick = useCallback(() => {
    if (disabled) return;
    commitValue(centerValue);
  }, [centerValue, commitValue, disabled]);

  const handlePadKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (disabled || event.nativeEvent.isComposing) return;

      const factor = event.shiftKey ? FINE_STEP_RATIO : COARSE_STEP_RATIO;
      const stepX = Math.max(boundsX.span * factor, safeSnapStep);
      const stepY = Math.max(boundsY.span * factor, safeSnapStep);

      let targetX = currentValue.x;
      let targetY = currentValue.y;

      if (event.key === 'ArrowRight') {
        targetX = currentValue.x + stepX;
      } else if (event.key === 'ArrowLeft') {
        targetX = currentValue.x - stepX;
      } else if (event.key === 'ArrowUp') {
        targetY = currentValue.y + stepY;
      } else if (event.key === 'ArrowDown') {
        targetY = currentValue.y - stepY;
      } else if (event.key === 'Home') {
        targetX = centerValue.x;
        targetY = centerValue.y;
      } else {
        return;
      }

      event.preventDefault();
      commitValue({ x: targetX, y: targetY });
    },
    [boundsX.span, boundsY.span, centerValue.x, centerValue.y, commitValue, currentValue.x, currentValue.y, disabled, safeSnapStep]
  );

  const handleReset = useCallback(() => {
    commitValue(centerValue);
  }, [centerValue, commitValue]);

  const isAtCenter = vectorsEqual(currentValue, centerValue);

  const ratioX = boundsX.span > 0 ? (currentValue.x - boundsX.min) / boundsX.span : 0.5;
  const ratioY = boundsY.span > 0 ? (currentValue.y - boundsY.min) / boundsY.span : 0.5;
  const puckX = roundCoord(PAD_MIN + ratioX * PAD_SIZE);
  const puckY = roundCoord(PAD_MAX - ratioY * PAD_SIZE);

  const dx = currentValue.x - centerValue.x;
  const dy = currentValue.y - centerValue.y;
  const rawMagnitude = Math.hypot(dx, dy);
  const magnitude = roundCoord(rawMagnitude);
  const angleDeg =
    magnitude === 0
      ? 0
      : Math.round((((Math.atan2(dy, dx) * 180) / Math.PI) % 360 + 360) % 360) % 360;
  const maxRadius = Math.hypot(boundsX.span / 2, boundsY.span / 2);
  const magnitudePct = maxRadius > 0 ? Math.min(100, Math.round((rawMagnitude / maxRadius) * 100)) : 0;

  const formattedX = formatSignedMetric(currentValue.x, boundsX.span, unit);
  const formattedY = formatSignedMetric(currentValue.y, boundsY.span, unit);
  const magnitudeSpan = Math.max(boundsX.span, boundsY.span);
  const formattedMagnitude = formatUnsignedMetric(magnitude, magnitudeSpan, unit);
  const polarSummary = `${formattedMagnitude} · ${angleDeg}°`;

  const resetLabel =
    centerValue.x === 0 && centerValue.y === 0
      ? 'Center (0, 0)'
      : `Center (${formatCompactNumber(centerValue.x, boundsX.span)}, ${formatCompactNumber(centerValue.y, boundsY.span)})`;

  const merged = mergeProps({
    themeTarget: themeProps('vector-xy-pad', {
      disabled,
      gridMode: activeGridMode,
      dragging: isDragging,
      snapped: safeSnapStep > 0,
      modified: !isAtCenter,
    }),
    baseClassName: 'prism-slab w-full max-w-full p-4 sm:p-5 space-y-4 select-none',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });


  return (
    <div ref={ref} role="region" aria-label={title} {...rest} {...merged}>
      {/* Panel Header */}
      <div className={cx(headerClass, 'flex flex-wrap items-center justify-between gap-2.5 min-w-0')}>
        <div className="flex items-center gap-2 min-w-0">
          <Crosshair
            aria-hidden="true"
            className="w-4 h-4 shrink-0"
            style={{
              color:
                !isAtCenter || isDragging
                  ? 'var(--prism-primary-main)'
                  : 'var(--prism-text-secondary)',
            }}
          />
          <span
            data-testid="xy-pad-title"
            className="text-sm font-semibold tracking-tight truncate"
            style={STYLE_TEXT_PRIMARY}
          >
            {title}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 min-w-0">
          {/* Cartesian / Polar Grid Overlay Toggle */}
          <div
            role="group"
            aria-label="Grid overlay mode"
            className="prism-well inline-flex items-center p-0.5 rounded-full gap-0.5 max-w-full"
          >
            <button
              type="button"
              disabled={disabled}
              aria-pressed={activeGridMode === 'cartesian'}
              data-testid="xy-mode-cartesian"
              onClick={() => setActiveGridMode('cartesian')}
              className={cx(
                'prism-focus-ring px-2.5 py-1 rounded-full text-xs font-semibold transition-[color,background-color,border-color,opacity,transform] cursor-pointer disabled:cursor-not-allowed shrink-0',
                activeGridMode === 'cartesian' ? 'prism-crystal' : 'opacity-70',
                disabled ? 'opacity-50' : ''
              )}
              style={{
                color:
                  activeGridMode === 'cartesian'
                    ? 'var(--prism-text-primary)'
                    : 'var(--prism-text-secondary)',
              }}
            >
              Cartesian
            </button>
            <button
              type="button"
              disabled={disabled}
              aria-pressed={activeGridMode === 'polar'}
              data-testid="xy-mode-polar"
              onClick={() => setActiveGridMode('polar')}
              className={cx(
                'prism-focus-ring px-2.5 py-1 rounded-full text-xs font-semibold transition-[color,background-color,border-color,opacity,transform] cursor-pointer disabled:cursor-not-allowed shrink-0',
                activeGridMode === 'polar' ? 'prism-crystal' : 'opacity-70',
                disabled ? 'opacity-50' : ''
              )}
              style={{
                color:
                  activeGridMode === 'polar'
                    ? 'var(--prism-text-primary)'
                    : 'var(--prism-text-secondary)',
              }}
            >
              Polar
            </button>
          </div>

          {/* Center (0, 0) Reset Button */}
          <button
            type="button"
            disabled={disabled || isAtCenter}
            data-testid="xy-pad-reset"
            aria-label={`Reset ${title} to center`}
            onClick={handleReset}
            className={cx(
              'prism-crystal prism-focus-ring inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-opacity cursor-pointer disabled:cursor-not-allowed shrink-0',
              disabled || isAtCenter ? 'opacity-50' : ''
            )}
            style={STYLE_TEXT_PRIMARY}
          >
            <RotateCcw aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
            <span>{resetLabel}</span>
          </button>
        </div>
      </div>

      {/* Recessed Optical Well with Square Interactive SVG Pad */}
      <div
        data-testid="xy-pad-well"
        className={cx(
          stageClass,
          'prism-well rounded-2xl p-3 sm:p-4 flex flex-col items-center justify-center min-w-0 max-w-full'
        )}
      >
        <div
          role="slider"
          aria-label={`${title} vector coordinates`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={magnitudePct}
          aria-valuetext={`${xLabel} ${formattedX}, ${yLabel} ${formattedY}, Vector ${polarSummary}`}
          aria-disabled={disabled || undefined}
          tabIndex={disabled ? -1 : 0}
          data-testid="xy-pad-surface"
          data-dragging={isDragging ? 'true' : undefined}
          onPointerDown={handlePadPointerDown}
          onDoubleClick={handlePadDoubleClick}
          onKeyDown={handlePadKeyDown}
          style={{ touchAction: 'none' }}
          className={cx(
            padClass,
            'prism-focus-ring relative w-full max-w-[240px] mx-auto rounded-2xl touch-none',
            disabled
              ? 'opacity-50 cursor-not-allowed'
              : isDragging
                ? 'cursor-grabbing'
                : 'cursor-crosshair'
          )}
        >
          <svg
            viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
            aria-hidden="true"
            data-testid="xy-pad-svg"
            className="w-full max-w-[240px] h-auto mx-auto select-none block overflow-visible pointer-events-none prism-contain-leaf"
          >
            <defs>
              <linearGradient
                id={vectorGradId}
                gradientUnits="userSpaceOnUse"
                x1={PAD_MIN}
                y1={PAD_MAX}
                x2={PAD_MAX}
                y2={PAD_MIN}
              >
                <stop offset="0%" stopColor="var(--prism-secondary-main)" />
                <stop offset="100%" stopColor="var(--prism-primary-main)" />
              </linearGradient>
              <radialGradient id={puckGlowId} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="var(--prism-primary-main)" stopOpacity={0.42} />
                <stop offset="100%" stopColor="var(--prism-primary-main)" stopOpacity={0} />
              </radialGradient>
            </defs>

            {/* Plot Surface Frame */}
            <rect
              x={PAD_MIN}
              y={PAD_MIN}
              width={PAD_SIZE}
              height={PAD_SIZE}
              rx={14}
              fill="var(--prism-well-start)"
              stroke="var(--prism-well-border)"
              strokeWidth={1.5}
            />

            {/* Coordinate Grid Overlay */}
            {activeGridMode === 'cartesian' ? (
              <g data-testid="xy-grid-cartesian">
                {CARTESIAN_GRID_LINES.map((line) => (
                  <g key={line.id}>
                    <line
                      x1={line.pos}
                      y1={PAD_MIN}
                      x2={line.pos}
                      y2={PAD_MAX}
                      stroke={line.isCenter ? 'var(--prism-well-border)' : 'var(--prism-divider)'}
                      strokeWidth={line.isCenter ? 1.25 : 1}
                      strokeDasharray={line.isCenter ? undefined : '3 3'}
                    />
                    <line
                      x1={PAD_MIN}
                      y1={line.pos}
                      x2={PAD_MAX}
                      y2={line.pos}
                      stroke={line.isCenter ? 'var(--prism-well-border)' : 'var(--prism-divider)'}
                      strokeWidth={line.isCenter ? 1.25 : 1}
                      strokeDasharray={line.isCenter ? undefined : '3 3'}
                    />
                  </g>
                ))}
                <text
                  x={PAD_CENTER}
                  y={12}
                  textAnchor="middle"
                  fontSize={9}
                  fontWeight={600}
                  fill="var(--prism-text-secondary)"
                >
                  +Y
                </text>
                <text
                  x={PAD_CENTER}
                  y={215}
                  textAnchor="middle"
                  fontSize={9}
                  fontWeight={600}
                  fill="var(--prism-text-secondary)"
                >
                  -Y
                </text>
                <text
                  x={8}
                  y={PAD_CENTER + 3}
                  textAnchor="middle"
                  fontSize={9}
                  fontWeight={600}
                  fill="var(--prism-text-secondary)"
                >
                  -X
                </text>
                <text
                  x={212}
                  y={PAD_CENTER + 3}
                  textAnchor="middle"
                  fontSize={9}
                  fontWeight={600}
                  fill="var(--prism-text-secondary)"
                >
                  +X
                </text>
              </g>
            ) : (
              <g data-testid="xy-grid-polar">
                {POLAR_RINGS.map((ring) => (
                  <circle
                    key={ring.id}
                    data-testid={`xy-polar-ring-${ring.id}`}
                    cx={PAD_CENTER}
                    cy={PAD_CENTER}
                    r={ring.radius}
                    fill="none"
                    stroke={ring.isOuter ? 'var(--prism-well-border)' : 'var(--prism-divider)'}
                    strokeWidth={ring.isOuter ? 1.25 : 1}
                    strokeDasharray={ring.isOuter ? undefined : '3 3'}
                  />
                ))}
                {POLAR_SPOKES.map((spoke) => (
                  <line
                    key={spoke.id}
                    x1={PAD_CENTER}
                    y1={PAD_CENTER}
                    x2={spoke.x2}
                    y2={spoke.y2}
                    stroke={spoke.isCardinal ? 'var(--prism-well-border)' : 'var(--prism-divider)'}
                    strokeWidth={spoke.isCardinal ? 1.15 : 0.9}
                    strokeDasharray={spoke.isCardinal ? undefined : '2 3'}
                  />
                ))}
                <text
                  x={PAD_CENTER}
                  y={12}
                  textAnchor="middle"
                  fontSize={9}
                  fontWeight={600}
                  fill="var(--prism-text-secondary)"
                >
                  90°
                </text>
                <text
                  x={PAD_CENTER}
                  y={215}
                  textAnchor="middle"
                  fontSize={9}
                  fontWeight={600}
                  fill="var(--prism-text-secondary)"
                >
                  270°
                </text>
                <text
                  x={7}
                  y={PAD_CENTER + 3}
                  textAnchor="middle"
                  fontSize={8.5}
                  fontWeight={600}
                  fill="var(--prism-text-secondary)"
                >
                  180°
                </text>
                <text
                  x={212}
                  y={PAD_CENTER + 3}
                  textAnchor="middle"
                  fontSize={8.5}
                  fontWeight={600}
                  fill="var(--prism-text-secondary)"
                >
                  0°
                </text>
              </g>
            )}

            {/* Origin Anchor Marker */}
            <circle
              cx={PAD_CENTER}
              cy={PAD_CENTER}
              r={3.2}
              fill="var(--prism-well-end)"
              stroke="var(--prism-well-border)"
              strokeWidth={1.25}
            />

            {/* Active Crosshair Tracking Lines */}
            <line
              data-testid="xy-crosshair-h"
              x1={PAD_MIN}
              y1={puckY}
              x2={PAD_MAX}
              y2={puckY}
              stroke="var(--prism-secondary-main)"
              strokeWidth={1}
              strokeDasharray="3 3"
              opacity={isDragging ? 0.85 : 0.45}
            />
            <line
              data-testid="xy-crosshair-v"
              x1={puckX}
              y1={PAD_MIN}
              x2={puckX}
              y2={PAD_MAX}
              stroke="var(--prism-secondary-main)"
              strokeWidth={1}
              strokeDasharray="3 3"
              opacity={isDragging ? 0.85 : 0.45}
            />

            {/* Glowing Vector Line from Origin to Puck */}
            <line
              data-testid="xy-vector-glow"
              x1={PAD_CENTER}
              y1={PAD_CENTER}
              x2={puckX}
              y2={puckY}
              stroke="var(--prism-primary-main)"
              strokeWidth={6}
              strokeLinecap="round"
              opacity={isAtCenter ? 0 : isDragging ? 0.34 : 0.2}
            />
            <line
              data-testid="xy-vector-line"
              x1={PAD_CENTER}
              y1={PAD_CENTER}
              x2={puckX}
              y2={puckY}
              stroke={`url(#${vectorGradId})`}
              strokeWidth={2.5}
              strokeLinecap="round"
              opacity={isAtCenter ? 0 : 0.95}
            />

            {/* Draggable Vector Puck */}
            <g data-testid="xy-puck">
              <circle cx={puckX} cy={puckY} r={isDragging ? 18 : 14} fill={`url(#${puckGlowId})`} />
              <circle
                cx={puckX}
                cy={puckY}
                r={10.5}
                fill="none"
                stroke="var(--prism-primary-main)"
                strokeWidth={1.5}
                opacity={isDragging ? 0.95 : 0.5}
              />
              <circle
                cx={puckX}
                cy={puckY}
                r={7}
                fill="var(--prism-crystal-top)"
                stroke="var(--prism-primary-main)"
                strokeWidth={2.25}
              />
              <circle cx={puckX} cy={puckY} r={2.6} fill="var(--prism-primary-main)" />
            </g>
          </svg>
        </div>
      </div>

      {/* Paired Telemetry Footer */}
      <div
        aria-live="polite"
        data-testid="xy-pad-telemetry"
        className={cx(footerClass, 'grid grid-cols-1 sm:grid-cols-3 gap-2 min-w-0 max-w-full')}
      >
        <div className="prism-well rounded-xl px-3 py-2 flex flex-col gap-0.5 min-w-0">
          <span
            className="text-[11px] font-medium truncate"
            style={STYLE_TEXT_SECONDARY}
          >
            {xLabel}
          </span>
          <span
            data-testid="xy-readout-x"
            className="font-mono text-xs font-semibold tabular-nums truncate"
            style={STYLE_TEXT_PRIMARY}
          >
            {formattedX}
          </span>
        </div>

        <div className="prism-well rounded-xl px-3 py-2 flex flex-col gap-0.5 min-w-0">
          <span
            className="text-[11px] font-medium truncate"
            style={STYLE_TEXT_SECONDARY}
          >
            {yLabel}
          </span>
          <span
            data-testid="xy-readout-y"
            className="font-mono text-xs font-semibold tabular-nums truncate"
            style={STYLE_TEXT_PRIMARY}
          >
            {formattedY}
          </span>
        </div>

        <div className="prism-well rounded-xl px-3 py-2 flex flex-col gap-0.5 min-w-0">
          <span
            className="text-[11px] font-medium truncate"
            style={STYLE_TEXT_SECONDARY}
          >
            Vector (r · θ°)
          </span>
          <span
            data-testid="xy-readout-polar"
            className="font-mono text-xs font-semibold tabular-nums truncate"
            style={STYLE_PRIMARY_MAIN}
          >
            {polarSummary}
          </span>
        </div>
      </div>
    </div>
  );
}

export const VectorXyPad = /*#__PURE__*/ memoWithDisplayName(VectorXyPadInner, 'VectorXyPad');
