'use client';

import {
  memo,
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY, STYLE_WARNING_MAIN } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type BurnChartMode = 'burndown' | 'burnup';

export type BurnPaceStatus = 'on-track' | 'at-risk' | 'behind';

export interface SprintBurnPoint {
  /** Stable unique identifier for this sprint checkpoint. */
  id: string;
  /** Human-readable X-axis day or milestone label (e.g. 'Day 1'). */
  label: string;
  /** Total committed sprint scope at this checkpoint (non-finite or negative values clamp to 0). */
  scope: number;
  /** Cumulative completed work at this checkpoint (non-finite or negative values clamp to 0). */
  completed: number;
}

export interface BurndownBurnupChartProps extends BaseProps<HTMLDivElement> {
  /**
   * Ordered sprint trajectory checkpoints.
   * Defaults to a 10-day sprint trajectory with a mid-sprint scope increase when omitted;
   * pass `[]` to display the clean `role="status"` empty state.
   */
  data?: ReadonlyArray<SprintBurnPoint>;
  /** Controlled chart visualization mode ('burndown' | 'burnup'). */
  mode?: BurnChartMode;
  /** Initial visualization mode when uncontrolled (defaults to 'burndown'). */
  defaultMode?: BurnChartMode;
  /** Callback fired whenever the user toggles between 'burndown' and 'burnup'. */
  onModeChange?: (mode: BurnChartMode) => void;
  /** Measurement unit suffix appended to readouts (defaults to 'pts'). */
  unit?: string;
  /** Visible heading in the sculpted card header (defaults to 'Sprint Burn-Down / Burn-Up'). */
  title?: string;
  /** Callback fired when a day marker is clicked or activated/navigated via keyboard. */
  onSelectPoint?: (point: SprintBurnPoint, index: number) => void;
}

interface ComputedBurnPoint {
  key: string;
  index: number;
  point: SprintBurnPoint;
  scope: number;
  completed: number;
  remaining: number;
  idealRemaining: number;
  idealCompleted: number;
  x: number;
  remainingY: number;
  completedY: number;
  scopeY: number;
  idealRemainingY: number;
  idealCompletedY: number;
  showXLabel: boolean;
}

interface AxisTick {
  key: string;
  value: number;
  label: string;
  y: number;
  isBaseline: boolean;
}

interface PaceMeta {
  status: BurnPaceStatus;
  label: string;
  color: string;
}

export const DEFAULT_SPRINT_BURN_DATA: ReadonlyArray<SprintBurnPoint> = [
  { id: 'day-1', label: 'Day 1', scope: 80, completed: 0 },
  { id: 'day-2', label: 'Day 2', scope: 80, completed: 10 },
  { id: 'day-3', label: 'Day 3', scope: 80, completed: 21 },
  { id: 'day-4', label: 'Day 4', scope: 80, completed: 31 },
  { id: 'day-5', label: 'Day 5', scope: 92, completed: 40 },
  { id: 'day-6', label: 'Day 6', scope: 92, completed: 50 },
  { id: 'day-7', label: 'Day 7', scope: 92, completed: 61 },
  { id: 'day-8', label: 'Day 8', scope: 92, completed: 72 },
  { id: 'day-9', label: 'Day 9', scope: 92, completed: 82 },
  { id: 'day-10', label: 'Day 10', scope: 92, completed: 90 },
];

const SVG_WIDTH = 460;
const SVG_HEIGHT = 210;
const PAD_LEFT = 44;
const PAD_RIGHT = 18;
const PAD_TOP = 16;
const PAD_BOTTOM = 30;
const PLOT_WIDTH = SVG_WIDTH - PAD_LEFT - PAD_RIGHT;
const PLOT_HEIGHT = SVG_HEIGHT - PAD_TOP - PAD_BOTTOM;
const PLOT_BOTTOM = PAD_TOP + PLOT_HEIGHT;
const TICK_FRACTIONS: ReadonlyArray<number> = [0, 0.25, 0.5, 0.75, 1];
const ON_TRACK_THRESHOLD = 0.05;
const AT_RISK_THRESHOLD = 0.15;

const MODE_OPTIONS: ReadonlyArray<{ id: BurnChartMode; label: string }> = [
  { id: 'burndown', label: 'Burn-Down' },
  { id: 'burnup', label: 'Burn-Up' },
];

function normalizeZero(value: number): number {
  return value === 0 ? 0 : value;
}

function sanitizeNonNegative(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) {
    return 0;
  }
  return normalizeZero(raw);
}

function formatNumber(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  const safe = normalizeZero(rounded);
  return Number.isInteger(safe) ? String(safe) : safe.toFixed(1);
}

function formatWithUnit(value: number, unit: string): string {
  const trimmedUnit = unit.trim();
  const formatted = formatNumber(value);
  return trimmedUnit ? `${formatted} ${trimmedUnit}` : formatted;
}

function formatSignedDelta(value: number, unit: string): string {
  const rounded = Math.round(value * 10) / 10;
  const safe = normalizeZero(rounded);
  const trimmedUnit = unit.trim();
  const suffix = trimmedUnit ? ` ${trimmedUnit}` : '';
  if (safe > 0) {
    return `+${formatNumber(safe)}${suffix}`;
  }
  if (safe < 0) {
    return `-${formatNumber(Math.abs(safe))}${suffix}`;
  }
  return `0${suffix}`;
}

function computeYMax(rawMax: number): number {
  if (rawMax <= 0) {
    return 10;
  }
  if (rawMax < 4) {
    return rawMax;
  }
  return Math.ceil(rawMax / 4) * 4;
}

function resolvePaceMeta(remaining: number, referenceScope: number): PaceMeta {
  const ratio = referenceScope > 0 ? remaining / referenceScope : 0;
  if (ratio <= ON_TRACK_THRESHOLD) {
    return {
      status: 'on-track',
      label: 'On Track',
      color: 'var(--prism-success-main)',
    };
  }
  if (ratio <= AT_RISK_THRESHOLD) {
    return {
      status: 'at-risk',
      label: 'At Risk',
      color: 'var(--prism-warning-main)',
    };
  }
  return {
    status: 'behind',
    label: 'Behind Ideal',
    color: 'var(--prism-error-main)',
  };
}

function buildPolylineString(coords: ReadonlyArray<{ x: number; y: number }>): string {
  return coords.map((pt) => `${pt.x.toFixed(2)},${pt.y.toFixed(2)}`).join(' ');
}

function buildAreaPath(coords: ReadonlyArray<{ x: number; y: number }>): string {
  if (coords.length < 2) {
    return '';
  }
  const first = coords[0]!;
  const last = coords[coords.length - 1]!;
  const segments = coords
    .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`)
    .join(' ');
  return `${segments} L ${last.x.toFixed(2)} ${PLOT_BOTTOM.toFixed(2)} L ${first.x.toFixed(2)} ${PLOT_BOTTOM.toFixed(2)} Z`;
}

function BurndownBurnupChartInner({
  data,
  mode,
  defaultMode = 'burndown',
  onModeChange,
  unit = 'pts',
  title = 'Sprint Burn-Down / Burn-Up',
  onSelectPoint,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: BurndownBurnupChartProps) {
  const override = useComponentOverride('BurndownBurnupChart');
  const headingId = useId();
  const rawGradientId = useId();
  const gradientId = `burn-area-${rawGradientId.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  const isControlledMode = mode !== undefined;
  const [internalMode, setInternalMode] = useState<BurnChartMode>(defaultMode);
  const currentMode: BurnChartMode = isControlledMode ? mode : internalMode;

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const markerNodesRef = useRef<Map<number, SVGCircleElement>>(new Map());

  const sourceData = data === undefined ? DEFAULT_SPRINT_BURN_DATA : data;
  const isEmpty = sourceData.length === 0;

  const handleModeSelect = useCallback(
    (nextMode: BurnChartMode) => {
      if (!isControlledMode) {
        setInternalMode(nextMode);
      }
      if (nextMode !== currentMode) {
        onModeChange?.(nextMode);
      }
    },
    [currentMode, isControlledMode, onModeChange]
  );

  const registerMarkerNode = useCallback(
    (index: number) => (node: SVGCircleElement | null) => {
      if (node) {
        markerNodesRef.current.set(index, node);
      } else {
        markerNodesRef.current.delete(index);
      }
    },
    []
  );

  const chartModel = useMemo(() => {
    if (sourceData.length === 0) {
      return {
        points: [] as ComputedBurnPoint[],
        ticks: [] as AxisTick[],
        referenceScope: 0,
        pace: resolvePaceMeta(0, 0),
      };
    }

    const sanitized = sourceData.map((point) => {
      const scope = sanitizeNonNegative(point.scope);
      const completed = sanitizeNonNegative(point.completed);
      const remaining = normalizeZero(Math.max(0, scope - completed));
      return { point, scope, completed, remaining };
    });

    const count = sanitized.length;
    const firstScope = sanitized[0]!.scope;
    const finalScope = sanitized[count - 1]!.scope;
    let maxScope = 0;
    let rawMax = 0;
    for (const item of sanitized) {
      if (item.scope > maxScope) maxScope = item.scope;
      if (item.scope > rawMax) rawMax = item.scope;
      if (item.completed > rawMax) rawMax = item.completed;
    }

    const burndownIdealStart = firstScope > 0 ? firstScope : maxScope;
    const burnupIdealEnd = finalScope;
    const yMax = computeYMax(rawMax);

    const valueToY = (value: number): number => {
      const ratio = value / yMax;
      return PAD_TOP + PLOT_HEIGHT * (1 - ratio);
    };

    const labelStep = count <= 10 ? 1 : Math.ceil(count / 6);

    const points: ComputedBurnPoint[] = sanitized.map((item, idx) => {
      const progress = count === 1 ? 1 : idx / (count - 1);
      const idealRemaining = normalizeZero(burndownIdealStart * (1 - progress));
      const idealCompleted = normalizeZero(burnupIdealEnd * progress);
      const x = count === 1 ? PAD_LEFT + PLOT_WIDTH / 2 : PAD_LEFT + progress * PLOT_WIDTH;
      const showXLabel = count <= 10 || idx === 0 || idx === count - 1 || idx % labelStep === 0;

      return {
        key: `bbc-pt-${item.point.id}-${idx}`,
        index: idx,
        point: item.point,
        scope: item.scope,
        completed: item.completed,
        remaining: item.remaining,
        idealRemaining,
        idealCompleted,
        x,
        remainingY: valueToY(item.remaining),
        completedY: valueToY(item.completed),
        scopeY: valueToY(item.scope),
        idealRemainingY: valueToY(idealRemaining),
        idealCompletedY: valueToY(idealCompleted),
        showXLabel,
      };
    });

    const ticks: AxisTick[] = TICK_FRACTIONS.map((fraction) => {
      const value = normalizeZero(yMax * fraction);
      return {
        key: `bbc-tick-${fraction}`,
        value,
        label: formatNumber(value),
        y: PAD_TOP + PLOT_HEIGHT * (1 - fraction),
        isBaseline: fraction === 0,
      };
    });

    const latest = points[points.length - 1]!;
    const referenceScope = finalScope > 0 ? finalScope : maxScope;
    const pace = resolvePaceMeta(latest.remaining, referenceScope);

    return {
      points,
      ticks,
      referenceScope,
      pace,
    };
  }, [sourceData]);

  const activeIndex =
    chartModel.points.length === 0
      ? -1
      : selectedIndex !== null && selectedIndex < chartModel.points.length
        ? selectedIndex
        : chartModel.points.length - 1;

  const activePoint = activeIndex >= 0 ? chartModel.points[activeIndex]! : null;

  const selectPointAtIndex = useCallback(
    (index: number, focusMarker: boolean) => {
      const target = chartModel.points[index]!;
      setSelectedIndex(index);
      onSelectPoint?.(target.point, index);
      if (focusMarker) {
        markerNodesRef.current.get(index)?.focus();
      }
    },
    [chartModel.points, onSelectPoint]
  );

  const handleMarkerKeyDown = useCallback(
    (index: number) => (event: ReactKeyboardEvent<SVGCircleElement>) => {
      if (event.nativeEvent.isComposing) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        selectPointAtIndex(index, false);
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        const nextIndex = Math.min(chartModel.points.length - 1, index + 1);
        selectPointAtIndex(nextIndex, true);
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        const prevIndex = Math.max(0, index - 1);
        selectPointAtIndex(prevIndex, true);
        return;
      }
      if (event.key === 'Home') {
        event.preventDefault();
        selectPointAtIndex(0, true);
        return;
      }
      if (event.key === 'End') {
        event.preventDefault();
        selectPointAtIndex(chartModel.points.length - 1, true);
      }
    },
    [chartModel.points.length, selectPointAtIndex]
  );

  const isBurndown = currentMode === 'burndown';
  const actualColor = isBurndown ? 'var(--prism-primary-main)' : 'var(--prism-success-main)';
  const actualSeriesLabel = isBurndown ? 'Actual Remaining' : 'Actual Completed';

  const actualCoords = useMemo(
    () =>
      chartModel.points.map((pt) => ({
        x: pt.x,
        y: isBurndown ? pt.remainingY : pt.completedY,
      })),
    [chartModel.points, isBurndown]
  );

  const idealCoords = useMemo(
    () =>
      chartModel.points.map((pt) => ({
        x: pt.x,
        y: isBurndown ? pt.idealRemainingY : pt.idealCompletedY,
      })),
    [chartModel.points, isBurndown]
  );

  const scopeCoords = useMemo(
    () => chartModel.points.map((pt) => ({ x: pt.x, y: pt.scopeY })),
    [chartModel.points]
  );

  const actualPolyline = useMemo(() => buildPolylineString(actualCoords), [actualCoords]);
  const actualAreaPath = useMemo(() => buildAreaPath(actualCoords), [actualCoords]);
  const idealPolyline = useMemo(() => buildPolylineString(idealCoords), [idealCoords]);
  const scopePolyline = useMemo(() => buildPolylineString(scopeCoords), [scopeCoords]);

  const activeIdealDelta = activePoint
    ? normalizeZero(
        isBurndown
          ? activePoint.remaining - activePoint.idealRemaining
          : activePoint.completed - activePoint.idealCompleted
      )
    : 0;

  const activeDeltaColor = useMemo(() => {
    const isOnOrAhead = isBurndown ? activeIdealDelta <= 0 : activeIdealDelta >= 0;
    if (isOnOrAhead) {
      return 'var(--prism-success-main)';
    }
    const magnitude = Math.abs(activeIdealDelta);
    const ratio = magnitude / chartModel.referenceScope;
    return ratio > AT_RISK_THRESHOLD ? 'var(--prism-error-main)' : 'var(--prism-warning-main)';
  }, [activeIdealDelta, chartModel.referenceScope, isBurndown]);

  const merged = mergeProps({
    themeTarget: themeProps('burndown-burnup-chart', {
      mode: currentMode,
      pace: isEmpty ? undefined : chartModel.pace.status,
      empty: isEmpty,
    }),
    baseClassName: 'prism-slab p-4 sm:p-5 space-y-3.5 min-w-0 max-w-full',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('burndown-burnup-chart', 'header');
  const legendClass = stableClassName('burndown-burnup-chart', 'legend');
  const canvasClass = stableClassName('burndown-burnup-chart', 'canvas');
  const svgClass = stableClassName('burndown-burnup-chart', 'svg');
  const inspectorClass = stableClassName('burndown-burnup-chart', 'inspector');

  return (
    <div ref={ref} role="region" aria-labelledby={headingId} {...rest} {...merged}>
      <div className={cx(headerClass, 'flex flex-wrap items-center justify-between gap-2.5 min-w-0')}>
        <h4
          id={headingId}
          className="text-sm font-semibold tracking-tight min-w-0 truncate"
          style={STYLE_TEXT_PRIMARY}
        >
          {title}
        </h4>

        <div className="flex flex-wrap items-center gap-2 min-w-0">
          {!isEmpty ? (
            <span
              data-testid="burn-pace-pill"
              data-pace={chartModel.pace.status}
              className="prism-crystal inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold shrink-0"
              style={{ color: chartModel.pace.color }}
            >
              <span
                aria-hidden="true"
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: chartModel.pace.color }}
              />
              <span>{chartModel.pace.label}</span>
            </span>
          ) : null}

          <div
            role="group"
            aria-label="Burn chart mode"
            data-testid="burn-mode-toggle"
            className="prism-well inline-flex items-center gap-1 rounded-full p-0.5 shrink-0"
          >
            {MODE_OPTIONS.map((option) => {
              const pressed = currentMode === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={pressed}
                  data-testid={`burn-mode-${option.id}`}
                  onClick={() => handleModeSelect(option.id)}
                  className={cx(
                    'prism-focus-ring rounded-full px-2.5 py-1 text-xs font-medium cursor-pointer transition-[color,background-color,border-color,opacity,transform]',
                    pressed ? 'prism-crystal font-semibold' : 'opacity-75 hover:opacity-100'
                  )}
                  style={{
                    color: pressed ? 'var(--prism-text-primary)' : 'var(--prism-text-secondary)',
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {!isEmpty ? (
        <div
          aria-label="Chart series legend"
          className={cx(legendClass, 'flex flex-wrap items-center gap-2 text-[11px] min-w-0')}
        >
          <span
            className="prism-crystal inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-medium"
            style={STYLE_TEXT_PRIMARY}
          >
            <span
              aria-hidden="true"
              className="w-2.5 h-0.5 rounded-full shrink-0"
              style={{ backgroundColor: actualColor }}
            />
            <span>{actualSeriesLabel}</span>
          </span>

          <span
            className="prism-crystal inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-medium"
            style={STYLE_TEXT_SECONDARY}
          >
            <span
              aria-hidden="true"
              className="w-3 border-t border-dashed shrink-0"
              style={{ borderColor: 'var(--prism-text-secondary)' }}
            />
            <span>Ideal Pace</span>
          </span>

          {!isBurndown ? (
            <span
              data-testid="burn-legend-scope"
              className="prism-crystal inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-medium"
              style={STYLE_WARNING_MAIN}
            >
              <span
                aria-hidden="true"
                className="w-3 border-t-2 border-dashed shrink-0"
                style={{ borderColor: 'var(--prism-warning-main)' }}
              />
              <span>Scope Ceiling</span>
            </span>
          ) : null}
        </div>
      ) : null}

      {isEmpty ? (
        <div
          role="status"
          data-testid="burn-empty-state"
          className="prism-well rounded-2xl px-4 py-8 text-center text-xs font-medium"
          style={STYLE_TEXT_SECONDARY}
        >
          No sprint burn data available.
        </div>
      ) : (
        <div className={cx(canvasClass, 'prism-well rounded-2xl p-2.5 sm:p-3 min-w-0 max-w-full')}>
          <svg
            role="img"
            aria-label={`${title} ${isBurndown ? 'burn-down' : 'burn-up'} chart across ${chartModel.points.length} checkpoints`}
            data-testid="burn-chart-svg"
            viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
            className={cx(svgClass, 'w-full h-auto select-none')}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={actualColor} stopOpacity={0.3} />
                <stop offset="100%" stopColor={actualColor} stopOpacity={0.02} />
              </linearGradient>
            </defs>

            {chartModel.ticks.map((tick) => (
              <g key={tick.key} data-testid="burn-y-gridline">
                <line
                  x1={PAD_LEFT}
                  y1={tick.y}
                  x2={SVG_WIDTH - PAD_RIGHT}
                  y2={tick.y}
                  stroke={tick.isBaseline ? 'var(--prism-text-secondary)' : 'var(--prism-divider)'}
                  strokeWidth={tick.isBaseline ? 1.25 : 1}
                  strokeDasharray={tick.isBaseline ? undefined : '3 3'}
                  strokeOpacity={tick.isBaseline ? 0.45 : 1}
                />
                <text
                  x={PAD_LEFT - 8}
                  y={tick.y + 3.5}
                  textAnchor="end"
                  fill="var(--prism-text-secondary)"
                  className="text-[10px] font-mono tabular-nums"
                >
                  {tick.label}
                </text>
              </g>
            ))}

            {chartModel.points.map((pt) =>
              pt.showXLabel ? (
                <text
                  key={`x-${pt.key}`}
                  x={pt.x}
                  y={SVG_HEIGHT - 8}
                  textAnchor="middle"
                  fill={
                    activeIndex === pt.index
                      ? 'var(--prism-text-primary)'
                      : 'var(--prism-text-secondary)'
                  }
                  className={cx(
                    'text-[9.5px] font-mono tabular-nums',
                    activeIndex === pt.index ? 'font-semibold' : undefined
                  )}
                >
                  {pt.point.label}
                </text>
              ) : null
            )}

            <line
              data-testid="burn-crosshair"
              x1={activePoint!.x}
              y1={PAD_TOP}
              x2={activePoint!.x}
              y2={PLOT_BOTTOM}
              stroke={actualColor}
              strokeWidth={1.25}
              strokeOpacity={0.5}
              strokeDasharray="4 3"
              pointerEvents="none"
            />

            {actualAreaPath ? (
              <path
                data-testid="burn-area-path"
                d={actualAreaPath}
                fill={`url(#${gradientId})`}
                pointerEvents="none"
              />
            ) : null}

            {chartModel.points.length >= 2 ? (
              <polyline
                data-testid="burn-ideal-line"
                points={idealPolyline}
                fill="none"
                stroke="var(--prism-text-secondary)"
                strokeWidth={1.5}
                strokeDasharray="5 4"
                strokeLinecap="round"
                pointerEvents="none"
              />
            ) : (
              <line
                data-testid="burn-ideal-line"
                x1={PAD_LEFT}
                y1={isBurndown ? chartModel.points[0]!.idealRemainingY : chartModel.points[0]!.idealCompletedY}
                x2={SVG_WIDTH - PAD_RIGHT}
                y2={isBurndown ? chartModel.points[0]!.idealRemainingY : chartModel.points[0]!.idealCompletedY}
                stroke="var(--prism-text-secondary)"
                strokeWidth={1.5}
                strokeDasharray="5 4"
                pointerEvents="none"
              />
            )}

            {!isBurndown ? (
              chartModel.points.length >= 2 ? (
                <polyline
                  data-testid="burn-scope-ceiling"
                  points={scopePolyline}
                  fill="none"
                  stroke="var(--prism-warning-main)"
                  strokeWidth={1.75}
                  strokeDasharray="4 2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  pointerEvents="none"
                />
              ) : (
                <line
                  data-testid="burn-scope-ceiling"
                  x1={PAD_LEFT}
                  y1={chartModel.points[0]!.scopeY}
                  x2={SVG_WIDTH - PAD_RIGHT}
                  y2={chartModel.points[0]!.scopeY}
                  stroke="var(--prism-warning-main)"
                  strokeWidth={1.75}
                  strokeDasharray="4 2"
                  pointerEvents="none"
                />
              )
            ) : null}

            {chartModel.points.length >= 2 ? (
              <>
                <polyline
                  data-testid="burn-actual-glow"
                  points={actualPolyline}
                  fill="none"
                  stroke={actualColor}
                  strokeWidth={6}
                  strokeOpacity={0.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  pointerEvents="none"
                />
                <polyline
                  data-testid="burn-actual-line"
                  points={actualPolyline}
                  fill="none"
                  stroke={actualColor}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  pointerEvents="none"
                />
              </>
            ) : null}

            {chartModel.points.map((pt) => {
              const isSelected = activeIndex === pt.index;
              const cy = isBurndown ? pt.remainingY : pt.completedY;
              const idealVal = isBurndown ? pt.idealRemaining : pt.idealCompleted;
              const deltaVal = normalizeZero(
                isBurndown ? pt.remaining - idealVal : pt.completed - idealVal
              );

              return (
                <g key={pt.key}>
                  {isSelected ? (
                    <circle
                      cx={pt.x}
                      cy={cy}
                      r={9}
                      fill={actualColor}
                      fillOpacity={0.22}
                      pointerEvents="none"
                    />
                  ) : null}
                  <circle
                    ref={registerMarkerNode(pt.index)}
                    cx={pt.x}
                    cy={cy}
                    r={isSelected ? 5.25 : 3.75}
                    fill={actualColor}
                    stroke={isSelected ? 'var(--prism-text-primary)' : 'var(--prism-bg-start)'}
                    strokeWidth={isSelected ? 1.75 : 1.25}
                    role="button"
                    tabIndex={0}
                    aria-label={`${pt.point.label}: Remaining ${formatWithUnit(pt.remaining, unit)}, Completed ${formatWithUnit(pt.completed, unit)}, Scope ${formatWithUnit(pt.scope, unit)}, Ideal Delta ${formatSignedDelta(deltaVal, unit)}`}
                    data-testid={`burn-point-${pt.index}`}
                    data-point-id={pt.point.id}
                    data-selected={isSelected ? 'true' : 'false'}
                    className="prism-focus-ring cursor-pointer transition-[color,background-color,border-color,opacity,transform] duration-150"
                    onClick={() => selectPointAtIndex(pt.index, false)}
                    onKeyDown={handleMarkerKeyDown(pt.index)}
                  />
                </g>
              );
            })}
          </svg>
        </div>
      )}

      {activePoint ? (
        <div
          data-testid="burn-inspector"
          aria-live="polite"
          className={cx(
            inspectorClass,
            'prism-well rounded-xl px-3.5 py-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs tabular-nums min-w-0'
          )}
          style={STYLE_TEXT_PRIMARY}
        >
          <span className="font-semibold" data-testid="burn-inspector-day">
            {activePoint.point.label}
          </span>
          <span aria-hidden="true" style={STYLE_TEXT_SECONDARY}>
            ·
          </span>
          <span data-testid="burn-inspector-remaining">
            <span style={STYLE_TEXT_SECONDARY}>Remaining: </span>
            <strong className="font-mono font-semibold">
              {formatWithUnit(activePoint.remaining, unit)}
            </strong>
          </span>
          <span aria-hidden="true" style={STYLE_TEXT_SECONDARY}>
            ·
          </span>
          <span data-testid="burn-inspector-completed">
            <span style={STYLE_TEXT_SECONDARY}>Completed: </span>
            <strong className="font-mono font-semibold">
              {formatWithUnit(activePoint.completed, unit)}
            </strong>
          </span>
          <span aria-hidden="true" style={STYLE_TEXT_SECONDARY}>
            ·
          </span>
          <span data-testid="burn-inspector-scope">
            <span style={STYLE_TEXT_SECONDARY}>Scope: </span>
            <strong className="font-mono font-semibold">
              {formatWithUnit(activePoint.scope, unit)}
            </strong>
          </span>
          <span aria-hidden="true" style={STYLE_TEXT_SECONDARY}>
            ·
          </span>
          <span data-testid="burn-inspector-delta">
            <span style={STYLE_TEXT_SECONDARY}>Ideal Delta: </span>
            <strong className="font-mono font-semibold" style={{ color: activeDeltaColor }}>
              {formatSignedDelta(activeIdealDelta, unit)}
            </strong>
          </span>
        </div>
      ) : null}
    </div>
  );
}

export const BurndownBurnupChart = memo(BurndownBurnupChartInner);
BurndownBurnupChart.displayName = 'BurndownBurnupChart';
