'use client';

import {
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
import { themeProps } from '../utils/themeProps';

export type AnomalyDirection = 'normal' | 'upper-breach' | 'lower-breach';

export interface AnomalyForecastPoint {
  /** Stable unique identifier for this time-series checkpoint. */
  id: string;
  /** Human-readable X-axis timestamp or interval label (e.g. '09:00'). */
  label: string;
  /** Observed metric value, or `null` for future forecast horizon checkpoints beyond the present divider. */
  actual: number | null;
  /** Model-predicted expected baseline value at this checkpoint. */
  expected: number;
  /** Lower bound of the expected confidence corridor. */
  lower: number;
  /** Upper bound of the expected confidence corridor. */
  upper: number;
}

export interface AnomalyDetectionSummary {
  /** Original checkpoint record from the dataset. */
  point: AnomalyForecastPoint;
  /** Zero-based index of the checkpoint in the source dataset. */
  index: number;
  /** Classification relative to the confidence corridor (`'normal' | 'upper-breach' | 'lower-breach'`). */
  direction: AnomalyDirection;
  /** Signed deviation (`actual - expected`, or `0` for future forecast intervals). */
  deviation: number;
}

export interface AnomalyForecastChartProps extends BaseProps<HTMLDivElement> {
  /**
   * Ordered time-series checkpoints combining historical observations (`actual !== null`)
   * and future forecast intervals (`actual === null`).
   * Defaults to 16 checkpoints (12 historical including 2 upper/lower anomalies + 4 forecast intervals)
   * when omitted; pass `[]` to display the clean `role="status"` empty state.
   */
  data?: ReadonlyArray<AnomalyForecastPoint>;
  /** Measurement unit suffix appended to telemetry readouts (defaults to `'req/s'`). */
  unit?: string;
  /** Visible heading in the sculpted prism-slab header (defaults to `'Anomaly Detection & Forecast'`). */
  title?: string;
  /** Callback fired when a checkpoint marker or anomaly jump pill is clicked or navigated via keyboard. */
  onSelectPoint?: (summary: AnomalyDetectionSummary) => void;
}

interface NormalizedPoint {
  key: string;
  originalIndex: number;
  point: AnomalyForecastPoint;
  actual: number | null;
  expected: number;
  lower: number;
  upper: number;
  isForecast: boolean;
  direction: AnomalyDirection;
  deviation: number;
}

interface PlottedPoint extends NormalizedPoint {
  visibleIndex: number;
  x: number;
  expectedY: number;
  lowerY: number;
  upperY: number;
  actualY: number | null;
  markerY: number;
  showXLabel: boolean;
}

interface AxisTick {
  key: string;
  label: string;
  y: number;
  isBaseline: boolean;
}

interface ChartModel {
  plottedPoints: ReadonlyArray<PlottedPoint>;
  historicalPoints: ReadonlyArray<PlottedPoint>;
  anomalies: ReadonlyArray<PlottedPoint>;
  lastHistorical: PlottedPoint | null;
  ticks: ReadonlyArray<AxisTick>;
  bandPolygonPoints: string;
  expectedPolyline: string;
  actualPolyline: string;
  nowDividerX: number | null;
}

export const DEFAULT_ANOMALY_FORECAST_DATA: ReadonlyArray<AnomalyForecastPoint> = [
  { id: 't-01', label: '08:00', actual: 118, expected: 120, lower: 105, upper: 135 },
  { id: 't-02', label: '08:15', actual: 126, expected: 124, lower: 109, upper: 139 },
  { id: 't-03', label: '08:30', actual: 132, expected: 130, lower: 115, upper: 145 },
  { id: 't-04', label: '08:45', actual: 141, expected: 136, lower: 120, upper: 152 },
  { id: 't-05', label: '09:00', actual: 186, expected: 142, lower: 126, upper: 158 },
  { id: 't-06', label: '09:15', actual: 149, expected: 146, lower: 130, upper: 162 },
  { id: 't-07', label: '09:30', actual: 144, expected: 148, lower: 132, upper: 164 },
  { id: 't-08', label: '09:45', actual: 139, expected: 145, lower: 129, upper: 161 },
  { id: 't-09', label: '10:00', actual: 94, expected: 140, lower: 124, upper: 156 },
  { id: 't-10', label: '10:15', actual: 134, expected: 138, lower: 122, upper: 154 },
  { id: 't-11', label: '10:30', actual: 142, expected: 141, lower: 125, upper: 157 },
  { id: 't-12', label: '10:45', actual: 148, expected: 146, lower: 130, upper: 162 },
  { id: 't-13', label: '11:00', actual: null, expected: 150, lower: 132, upper: 168 },
  { id: 't-14', label: '11:15', actual: null, expected: 154, lower: 133, upper: 175 },
  { id: 't-15', label: '11:30', actual: null, expected: 158, lower: 134, upper: 182 },
  { id: 't-16', label: '11:45', actual: null, expected: 161, lower: 133, upper: 189 },
];

const SVG_WIDTH = 460;
const SVG_HEIGHT = 220;
const PAD_LEFT = 46;
const PAD_RIGHT = 18;
const PAD_TOP = 22;
const PAD_BOTTOM = 30;
const PLOT_WIDTH = SVG_WIDTH - PAD_LEFT - PAD_RIGHT;
const PLOT_HEIGHT = SVG_HEIGHT - PAD_TOP - PAD_BOTTOM;
const PLOT_BOTTOM = PAD_TOP + PLOT_HEIGHT;
const TICK_FRACTIONS: ReadonlyArray<number> = [0, 0.25, 0.5, 0.75, 1];

function normalizeZero(value: number): number {
  return value === 0 ? 0 : value;
}

function sanitizeFinite(value: number, fallback: number): number {
  return Number.isFinite(value) ? normalizeZero(value) : fallback;
}

function formatNumber(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  const safe = normalizeZero(rounded);
  return Number.isInteger(safe) ? String(safe) : safe.toFixed(1);
}

function formatWithUnit(value: number, unit: string): string {
  const trimmed = unit.trim();
  const formatted = formatNumber(value);
  return trimmed ? `${formatted} ${trimmed}` : formatted;
}

function formatSignedDelta(value: number, unit: string): string {
  const rounded = Math.round(value * 10) / 10;
  const safe = normalizeZero(rounded);
  const trimmed = unit.trim();
  const suffix = trimmed ? ` ${trimmed}` : '';
  if (safe > 0) {
    return `+${formatNumber(safe)}${suffix}`;
  }
  if (safe < 0) {
    return `-${formatNumber(Math.abs(safe))}${suffix}`;
  }
  return `0${suffix}`;
}

function formatBandRange(lower: number, upper: number, unit: string): string {
  const trimmed = unit.trim();
  const suffix = trimmed ? ` ${trimmed}` : '';
  return `[${formatNumber(lower)}..${formatNumber(upper)}${suffix}]`;
}

function classifyAnomaly(
  actual: number | null,
  expected: number,
  lower: number,
  upper: number
): { direction: AnomalyDirection; deviation: number } {
  if (actual === null) {
    return { direction: 'normal', deviation: 0 };
  }
  const deviation = normalizeZero(actual - expected);
  if (actual > upper) {
    return { direction: 'upper-breach', deviation };
  }
  if (actual < lower) {
    return { direction: 'lower-breach', deviation };
  }
  return { direction: 'normal', deviation };
}

function getStatusColor(direction: AnomalyDirection, isForecast: boolean): string {
  if (isForecast) {
    return 'var(--prism-info-main)';
  }
  if (direction === 'upper-breach') {
    return 'var(--prism-error-main)';
  }
  if (direction === 'lower-breach') {
    return 'var(--prism-warning-main)';
  }
  return 'var(--prism-success-main)';
}

function getStatusLabel(direction: AnomalyDirection, isForecast: boolean): string {
  if (isForecast) {
    return 'Forecast';
  }
  if (direction === 'upper-breach') {
    return 'Upper Breach';
  }
  if (direction === 'lower-breach') {
    return 'Lower Breach';
  }
  return 'Nominal';
}

function getMarkerColor(direction: AnomalyDirection, isForecast: boolean): string {
  if (isForecast) {
    return 'var(--prism-info-main)';
  }
  if (direction === 'upper-breach') {
    return 'var(--prism-error-main)';
  }
  if (direction === 'lower-breach') {
    return 'var(--prism-warning-main)';
  }
  return 'var(--prism-primary-main)';
}

function computeYDomain(minVal: number, maxVal: number): { min: number; max: number } {
  if (maxVal === minVal) {
    const pad = maxVal === 0 ? 10 : Math.abs(maxVal) * 0.2;
    return { min: minVal - pad, max: maxVal + pad };
  }
  const pad = (maxVal - minVal) * 0.1;
  const rawMin = minVal - pad;
  return {
    min: minVal >= 0 ? Math.max(0, rawMin) : rawMin,
    max: maxVal + pad,
  };
}

function buildMarkerAriaLabel(pt: PlottedPoint, unit: string): string {
  const status = getStatusLabel(pt.direction, pt.isForecast);
  const bandText = formatBandRange(pt.lower, pt.upper, unit);
  if (pt.actual === null) {
    return `${pt.point.label}: Forecast expected ${formatWithUnit(pt.expected, unit)}, Confidence Band ${bandText}, Status ${status}`;
  }
  return `${pt.point.label}: Actual ${formatWithUnit(pt.actual, unit)} vs Expected ${formatWithUnit(pt.expected, unit)}, Confidence Band ${bandText}, Deviation ${formatSignedDelta(pt.deviation, unit)}, Status ${status}`;
}

export function AnomalyForecastChart({
  data,
  unit = 'req/s',
  title = 'Anomaly Detection & Forecast',
  onSelectPoint,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: AnomalyForecastChartProps) {
  const override = useComponentOverride('AnomalyForecastChart');
  const headingId = useId();

  const [showForecast, setShowForecast] = useState<boolean>(true);
  const [selectedOriginalIndex, setSelectedOriginalIndex] = useState<number | null>(null);
  const markerNodesRef = useRef<Map<number, SVGCircleElement>>(new Map());

  const sourceData = data === undefined ? DEFAULT_ANOMALY_FORECAST_DATA : data;
  const isEmpty = sourceData.length === 0;

  const registerMarkerNode = useCallback(
    (originalIndex: number) => (node: SVGCircleElement | null) => {
      if (node) {
        markerNodesRef.current.set(originalIndex, node);
      } else {
        markerNodesRef.current.delete(originalIndex);
      }
    },
    []
  );

  const normalizedAll = useMemo<ReadonlyArray<NormalizedPoint>>(() => {
    const idCounts = new Map<string, number>();
    return sourceData.map((point, originalIndex) => {
      const seen = idCounts.get(point.id) ?? 0;
      idCounts.set(point.id, seen + 1);
      const key = seen === 0 ? `afc-${point.id}` : `afc-${point.id}-${seen + 1}`;

      const expected = sanitizeFinite(point.expected, 0);
      const rawLower = sanitizeFinite(point.lower, expected);
      const rawUpper = sanitizeFinite(point.upper, expected);
      const lower = Math.min(rawLower, rawUpper);
      const upper = Math.max(rawLower, rawUpper);
      const actual =
        point.actual !== null && Number.isFinite(point.actual)
          ? normalizeZero(point.actual)
          : null;
      const isForecast = actual === null;
      const { direction, deviation } = classifyAnomaly(actual, expected, lower, upper);

      return {
        key,
        originalIndex,
        point,
        actual,
        expected,
        lower,
        upper,
        isForecast,
        direction,
        deviation,
      };
    });
  }, [sourceData]);

  const totalAnomalies = useMemo(
    () => normalizedAll.filter((pt) => pt.direction !== 'normal').length,
    [normalizedAll]
  );

  const visibleSource = useMemo<ReadonlyArray<NormalizedPoint>>(
    () => (showForecast ? normalizedAll : normalizedAll.filter((pt) => !pt.isForecast)),
    [normalizedAll, showForecast]
  );

  const chartModel = useMemo<ChartModel | null>(() => {
    const count = visibleSource.length;
    if (count === 0) {
      return null;
    }

    let minVal = Number.POSITIVE_INFINITY;
    let maxVal = Number.NEGATIVE_INFINITY;
    for (const item of visibleSource) {
      if (item.lower < minVal) minVal = item.lower;
      if (item.expected < minVal) minVal = item.expected;
      if (item.upper > maxVal) maxVal = item.upper;
      if (item.expected > maxVal) maxVal = item.expected;
      if (item.actual !== null) {
        if (item.actual < minVal) minVal = item.actual;
        if (item.actual > maxVal) maxVal = item.actual;
      }
    }

    const domain = computeYDomain(minVal, maxVal);
    const span = domain.max - domain.min;
    const valueToY = (value: number): number =>
      PAD_TOP + PLOT_HEIGHT * (1 - (value - domain.min) / span);

    const labelStep = count <= 8 ? 1 : Math.ceil(count / 5);

    const plottedPoints: PlottedPoint[] = visibleSource.map((item, visibleIndex) => {
      const x =
        count === 1
          ? PAD_LEFT + PLOT_WIDTH / 2
          : PAD_LEFT + (visibleIndex / (count - 1)) * PLOT_WIDTH;
      const expectedY = valueToY(item.expected);
      const lowerY = valueToY(item.lower);
      const upperY = valueToY(item.upper);
      const actualY = item.actual !== null ? valueToY(item.actual) : null;
      const markerY = actualY !== null ? actualY : expectedY;
      const showXLabel =
        count <= 8 ||
        visibleIndex === 0 ||
        visibleIndex === count - 1 ||
        visibleIndex % labelStep === 0;

      return {
        ...item,
        visibleIndex,
        x,
        expectedY,
        lowerY,
        upperY,
        actualY,
        markerY,
        showXLabel,
      };
    });

    const historicalPoints: PlottedPoint[] = [];
    const anomalies: PlottedPoint[] = [];
    let lastHistorical: PlottedPoint | null = null;
    let firstForecast: PlottedPoint | null = null;

    for (const pt of plottedPoints) {
      if (!pt.isForecast) {
        historicalPoints.push(pt);
        lastHistorical = pt;
      } else if (firstForecast === null) {
        firstForecast = pt;
      }
      if (pt.direction !== 'normal') {
        anomalies.push(pt);
      }
    }

    const ticks: AxisTick[] = TICK_FRACTIONS.map((fraction) => {
      const value = normalizeZero(domain.min + span * fraction);
      return {
        key: `afc-tick-${fraction}`,
        label: formatNumber(value),
        y: PAD_TOP + PLOT_HEIGHT * (1 - fraction),
        isBaseline: fraction === 0,
      };
    });

    let bandPolygonPoints = '';
    if (count >= 2) {
      const topCoords = plottedPoints.map((pt) => `${pt.x.toFixed(2)},${pt.upperY.toFixed(2)}`);
      const bottomCoords = [...plottedPoints]
        .reverse()
        .map((pt) => `${pt.x.toFixed(2)},${pt.lowerY.toFixed(2)}`);
      bandPolygonPoints = [...topCoords, ...bottomCoords].join(' ');
    }

    const expectedPolyline = plottedPoints
      .map((pt) => `${pt.x.toFixed(2)},${pt.expectedY.toFixed(2)}`)
      .join(' ');

    const actualPolyline = historicalPoints
      .map((pt) => `${pt.x.toFixed(2)},${pt.markerY.toFixed(2)}`)
      .join(' ');

    const nowDividerX =
      lastHistorical !== null && firstForecast !== null
        ? (lastHistorical.x + firstForecast.x) / 2
        : null;

    return {
      plottedPoints,
      historicalPoints,
      anomalies,
      lastHistorical,
      ticks,
      bandPolygonPoints,
      expectedPolyline,
      actualPolyline,
      nowDividerX,
    };
  }, [visibleSource]);

  const activePoint = useMemo<PlottedPoint | null>(() => {
    if (!chartModel) {
      return null;
    }
    if (selectedOriginalIndex !== null) {
      const matched = chartModel.plottedPoints.find(
        (pt) => pt.originalIndex === selectedOriginalIndex
      );
      if (matched) {
        return matched;
      }
    }
    if (chartModel.lastHistorical) {
      return chartModel.lastHistorical;
    }
    return chartModel.plottedPoints[chartModel.plottedPoints.length - 1]!;
  }, [chartModel, selectedOriginalIndex]);

  const selectPlottedPoint = useCallback(
    (target: PlottedPoint, focusMarker: boolean) => {
      setSelectedOriginalIndex(target.originalIndex);
      onSelectPoint?.({
        point: target.point,
        index: target.originalIndex,
        direction: target.direction,
        deviation: target.deviation,
      });
      if (focusMarker) {
        markerNodesRef.current.get(target.originalIndex)?.focus();
      }
    },
    [onSelectPoint]
  );

  const handleMarkerKeyDown = useCallback(
    (visibleIndex: number) => (event: ReactKeyboardEvent<SVGCircleElement>) => {
      if (event.nativeEvent.isComposing) {
        return;
      }
      const list = chartModel!.plottedPoints;
      const lastIdx = list.length - 1;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        selectPlottedPoint(list[visibleIndex]!, false);
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        selectPlottedPoint(list[Math.min(lastIdx, visibleIndex + 1)]!, true);
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        selectPlottedPoint(list[Math.max(0, visibleIndex - 1)]!, true);
        return;
      }
      if (event.key === 'Home') {
        event.preventDefault();
        selectPlottedPoint(list[0]!, true);
        return;
      }
      if (event.key === 'End') {
        event.preventDefault();
        selectPlottedPoint(list[lastIdx]!, true);
      }
    },
    [chartModel, selectPlottedPoint]
  );

  const merged = mergeProps({
    themeTarget: themeProps('anomaly-forecast-chart', {
      status: isEmpty ? undefined : totalAnomalies > 0 ? 'anomaly' : 'nominal',
      anomalies: isEmpty ? undefined : totalAnomalies,
      showForecast: isEmpty ? undefined : showForecast,
      empty: isEmpty,
    }),
    baseClassName: 'prism-slab p-4 sm:p-5 space-y-3.5 min-w-0 max-w-full',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('anomaly-forecast-chart', 'header');
  const legendClass = stableClassName('anomaly-forecast-chart', 'legend');
  const canvasClass = stableClassName('anomaly-forecast-chart', 'canvas');
  const svgClass = stableClassName('anomaly-forecast-chart', 'svg');
  const jumpBarClass = stableClassName('anomaly-forecast-chart', 'anomalies');
  const inspectorClass = stableClassName('anomaly-forecast-chart', 'inspector');

  const countPillColor =
    totalAnomalies > 0 ? 'var(--prism-error-main)' : 'var(--prism-success-main)';
  const countPillText =
    totalAnomalies === 0
      ? 'Nominal'
      : totalAnomalies === 1
        ? '1 Anomaly'
        : `${totalAnomalies} Anomalies`;

  return (
    <div ref={ref} role="region" aria-labelledby={headingId} {...rest} {...merged}>
      <div className={cx(headerClass, 'flex flex-wrap items-center justify-between gap-2.5 min-w-0')}>
        <h4
          id={headingId}
          className="text-sm font-semibold tracking-tight min-w-0 truncate"
          style={{ color: 'var(--prism-text-primary)' }}
        >
          {title}
        </h4>

        {!isEmpty ? (
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <span
              data-testid="anomaly-count-pill"
              data-status={totalAnomalies > 0 ? 'anomaly' : 'nominal'}
              className="prism-crystal inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums shrink-0"
              style={{ color: countPillColor }}
            >
              <span
                aria-hidden="true"
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: countPillColor }}
              />
              <span>{countPillText}</span>
            </span>

            <button
              type="button"
              aria-pressed={showForecast}
              data-testid="anomaly-forecast-toggle"
              onClick={() => setShowForecast((prev) => !prev)}
              className={cx(
                'prism-focus-ring inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium cursor-pointer transition-all shrink-0',
                showForecast ? 'prism-crystal font-semibold' : 'prism-well opacity-75 hover:opacity-100'
              )}
              style={{
                color: showForecast
                  ? 'var(--prism-text-primary)'
                  : 'var(--prism-text-secondary)',
              }}
            >
              <span
                aria-hidden="true"
                className="w-2 h-2 rounded-full shrink-0"
                style={{
                  backgroundColor: showForecast
                    ? 'var(--prism-info-main)'
                    : 'var(--prism-text-disabled)',
                }}
              />
              <span>Show Forecast Horizon</span>
            </button>
          </div>
        ) : null}
      </div>

      {!isEmpty ? (
        <div
          aria-label="Chart series legend"
          className={cx(legendClass, 'flex flex-wrap items-center gap-2 text-[11px] min-w-0')}
        >
          <span
            className="prism-crystal inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-medium"
            style={{ color: 'var(--prism-text-primary)' }}
          >
            <span
              aria-hidden="true"
              className="w-2.5 h-0.5 rounded-full shrink-0"
              style={{ backgroundColor: 'var(--prism-primary-main)' }}
            />
            <span>Actual</span>
          </span>

          <span
            className="prism-crystal inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-medium"
            style={{ color: 'var(--prism-text-secondary)' }}
          >
            <span
              aria-hidden="true"
              className="w-3 border-t border-dashed shrink-0"
              style={{ borderColor: 'var(--prism-text-secondary)' }}
            />
            <span>Expected</span>
          </span>

          <span
            className="prism-crystal inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-medium"
            style={{ color: 'var(--prism-info-main)' }}
          >
            <span
              aria-hidden="true"
              className="w-2.5 h-2 rounded-sm shrink-0 opacity-60"
              style={{ backgroundColor: 'var(--prism-info-main)' }}
            />
            <span>Confidence Band</span>
          </span>

          <span
            className="prism-crystal inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-medium"
            style={{ color: 'var(--prism-error-main)' }}
          >
            <span
              aria-hidden="true"
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: 'var(--prism-error-main)' }}
            />
            <span>Upper Breach</span>
          </span>

          <span
            className="prism-crystal inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-medium"
            style={{ color: 'var(--prism-warning-main)' }}
          >
            <span
              aria-hidden="true"
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: 'var(--prism-warning-main)' }}
            />
            <span>Lower Breach</span>
          </span>
        </div>
      ) : null}

      {isEmpty ? (
        <div
          role="status"
          data-testid="anomaly-empty-state"
          className="prism-well rounded-2xl px-4 py-8 text-center text-xs font-medium"
          style={{ color: 'var(--prism-text-secondary)' }}
        >
          No anomaly detection or forecast telemetry available.
        </div>
      ) : chartModel === null ? (
        <div
          role="status"
          data-testid="anomaly-hidden-forecast-state"
          className="prism-well rounded-2xl px-4 py-8 text-center text-xs font-medium"
          style={{ color: 'var(--prism-text-secondary)' }}
        >
          Forecast horizon hidden — no historical checkpoints available.
        </div>
      ) : (
        <div className={cx(canvasClass, 'prism-well rounded-2xl p-2.5 sm:p-3 min-w-0 max-w-full')}>
          <svg
            role="img"
            aria-label={`${title} chart across ${chartModel.plottedPoints.length} checkpoints with ${totalAnomalies} detected ${totalAnomalies === 1 ? 'anomaly' : 'anomalies'}`}
            data-testid="anomaly-chart-svg"
            viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
            className={cx(svgClass, 'w-full h-auto select-none')}
          >
            {chartModel.nowDividerX !== null ? (
              <rect
                data-testid="anomaly-forecast-zone"
                x={chartModel.nowDividerX}
                y={PAD_TOP}
                width={Math.max(0, SVG_WIDTH - PAD_RIGHT - chartModel.nowDividerX)}
                height={PLOT_HEIGHT}
                fill="var(--prism-info-main)"
                fillOpacity={0.06}
                pointerEvents="none"
              />
            ) : null}

            {chartModel.ticks.map((tick) => (
              <g key={tick.key} data-testid="anomaly-y-gridline">
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

            {chartModel.plottedPoints.map((pt) =>
              pt.showXLabel ? (
                <text
                  key={`x-${pt.key}`}
                  x={pt.x}
                  y={SVG_HEIGHT - 8}
                  textAnchor="middle"
                  fill={
                    activePoint!.originalIndex === pt.originalIndex
                      ? 'var(--prism-text-primary)'
                      : 'var(--prism-text-secondary)'
                  }
                  className={cx(
                    'text-[9.5px] font-mono tabular-nums',
                    activePoint!.originalIndex === pt.originalIndex ? 'font-semibold' : undefined
                  )}
                >
                  {pt.point.label}
                </text>
              ) : null
            )}

            {chartModel.bandPolygonPoints ? (
              <polygon
                data-testid="anomaly-confidence-band"
                points={chartModel.bandPolygonPoints}
                fill="var(--prism-info-main)"
                fillOpacity={0.16}
                stroke="var(--prism-info-main)"
                strokeOpacity={0.3}
                strokeWidth={1}
                pointerEvents="none"
              />
            ) : (
              <rect
                data-testid="anomaly-confidence-band"
                x={chartModel.plottedPoints[0]!.x - 14}
                y={chartModel.plottedPoints[0]!.upperY}
                width={28}
                height={Math.max(
                  2,
                  chartModel.plottedPoints[0]!.lowerY - chartModel.plottedPoints[0]!.upperY
                )}
                rx={4}
                fill="var(--prism-info-main)"
                fillOpacity={0.18}
                stroke="var(--prism-info-main)"
                strokeOpacity={0.35}
                strokeWidth={1}
                pointerEvents="none"
              />
            )}

            {chartModel.plottedPoints.length >= 2 ? (
              <polyline
                data-testid="anomaly-expected-line"
                points={chartModel.expectedPolyline}
                fill="none"
                stroke="var(--prism-text-secondary)"
                strokeWidth={1.5}
                strokeDasharray="5 4"
                strokeLinecap="round"
                strokeLinejoin="round"
                pointerEvents="none"
              />
            ) : (
              <line
                data-testid="anomaly-expected-line"
                x1={PAD_LEFT}
                y1={chartModel.plottedPoints[0]!.expectedY}
                x2={SVG_WIDTH - PAD_RIGHT}
                y2={chartModel.plottedPoints[0]!.expectedY}
                stroke="var(--prism-text-secondary)"
                strokeWidth={1.5}
                strokeDasharray="5 4"
                pointerEvents="none"
              />
            )}

            {chartModel.nowDividerX !== null ? (
              <g data-testid="anomaly-now-boundary" pointerEvents="none">
                <line
                  data-testid="anomaly-now-divider"
                  x1={chartModel.nowDividerX}
                  y1={PAD_TOP}
                  x2={chartModel.nowDividerX}
                  y2={PLOT_BOTTOM}
                  stroke="var(--prism-info-main)"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                  strokeOpacity={0.85}
                />
                <text
                  data-testid="anomaly-now-label"
                  x={chartModel.nowDividerX}
                  y={PAD_TOP - 6}
                  textAnchor="middle"
                  fill="var(--prism-info-main)"
                  className="text-[10px] font-semibold tracking-wide"
                >
                  Now
                </text>
              </g>
            ) : null}

            <line
              data-testid="anomaly-crosshair"
              x1={activePoint!.x}
              y1={PAD_TOP}
              x2={activePoint!.x}
              y2={PLOT_BOTTOM}
              stroke={getMarkerColor(activePoint!.direction, activePoint!.isForecast)}
              strokeWidth={1.25}
              strokeOpacity={0.5}
              strokeDasharray="4 3"
              pointerEvents="none"
            />

            {chartModel.historicalPoints.length >= 2 ? (
              <>
                <polyline
                  data-testid="anomaly-actual-glow"
                  points={chartModel.actualPolyline}
                  fill="none"
                  stroke="var(--prism-primary-main)"
                  strokeWidth={5.5}
                  strokeOpacity={0.18}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  pointerEvents="none"
                />
                <polyline
                  data-testid="anomaly-actual-line"
                  points={chartModel.actualPolyline}
                  fill="none"
                  stroke="var(--prism-primary-main)"
                  strokeWidth={2.25}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  pointerEvents="none"
                />
              </>
            ) : null}

            {chartModel.plottedPoints.map((pt) => {
              const isSelected = activePoint!.originalIndex === pt.originalIndex;
              const isAnomaly = pt.direction !== 'normal';
              const markerColor = getMarkerColor(pt.direction, pt.isForecast);
              const coreRadius = isAnomaly
                ? isSelected
                  ? 5.5
                  : 4.5
                : isSelected
                  ? 5
                  : 3.5;

              return (
                <g key={pt.key}>
                  {isAnomaly ? (
                    <>
                      <circle
                        data-testid={`anomaly-ring-${pt.originalIndex}`}
                        cx={pt.x}
                        cy={pt.markerY}
                        r={10.5}
                        fill={markerColor}
                        fillOpacity={0.2}
                        pointerEvents="none"
                      />
                      <circle
                        cx={pt.x}
                        cy={pt.markerY}
                        r={7.25}
                        fill="none"
                        stroke={markerColor}
                        strokeWidth={1.5}
                        strokeOpacity={0.75}
                        pointerEvents="none"
                      />
                    </>
                  ) : isSelected ? (
                    <circle
                      cx={pt.x}
                      cy={pt.markerY}
                      r={8.5}
                      fill={markerColor}
                      fillOpacity={0.22}
                      pointerEvents="none"
                    />
                  ) : null}

                  <circle
                    ref={registerMarkerNode(pt.originalIndex)}
                    cx={pt.x}
                    cy={pt.markerY}
                    r={coreRadius}
                    fill={pt.isForecast ? 'var(--prism-bg-start)' : markerColor}
                    stroke={
                      pt.isForecast
                        ? 'var(--prism-info-main)'
                        : isSelected
                          ? 'var(--prism-text-primary)'
                          : 'var(--prism-bg-start)'
                    }
                    strokeWidth={pt.isForecast || isSelected ? 1.75 : 1.25}
                    role="button"
                    tabIndex={0}
                    aria-label={buildMarkerAriaLabel(pt, unit)}
                    data-testid={`anomaly-point-${pt.originalIndex}`}
                    data-point-id={pt.point.id}
                    data-direction={pt.direction}
                    data-forecast={pt.isForecast ? 'true' : 'false'}
                    data-selected={isSelected ? 'true' : 'false'}
                    className="prism-focus-ring cursor-pointer transition-all duration-150"
                    onClick={() => selectPlottedPoint(pt, false)}
                    onKeyDown={handleMarkerKeyDown(pt.visibleIndex)}
                  />
                </g>
              );
            })}
          </svg>
        </div>
      )}

      {chartModel && chartModel.anomalies.length > 0 ? (
        <div
          role="group"
          aria-label="Detected anomalies"
          data-testid="anomaly-jump-bar"
          className={cx(jumpBarClass, 'flex flex-wrap items-center gap-1.5 min-w-0')}
        >
          <span
            className="text-[11px] font-semibold uppercase tracking-wide shrink-0 mr-0.5"
            style={{ color: 'var(--prism-text-secondary)' }}
          >
            Detected Anomalies
          </span>
          {chartModel.anomalies.map((item) => {
            const selected = activePoint!.originalIndex === item.originalIndex;
            const breachColor = getStatusColor(item.direction, false);
            const arrow = item.direction === 'upper-breach' ? '↑' : '↓';
            return (
              <button
                key={`jump-${item.key}`}
                type="button"
                aria-pressed={selected}
                data-testid={`anomaly-jump-${item.point.id}`}
                data-direction={item.direction}
                onClick={() => selectPlottedPoint(item, false)}
                className={cx(
                  'prism-focus-ring inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-mono tabular-nums cursor-pointer transition-all shrink-0',
                  selected ? 'prism-crystal font-semibold' : 'prism-well opacity-85 hover:opacity-100'
                )}
                style={{ color: breachColor }}
              >
                <span
                  aria-hidden="true"
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: breachColor }}
                />
                <span>{item.point.label}</span>
                <span>
                  {arrow} {formatSignedDelta(item.deviation, unit)}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {activePoint ? (
        <div
          data-testid="anomaly-inspector"
          aria-live="polite"
          className={cx(
            inspectorClass,
            'prism-well rounded-xl px-3.5 py-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs tabular-nums min-w-0'
          )}
          style={{ color: 'var(--prism-text-primary)' }}
        >
          <span className="font-semibold font-mono" data-testid="anomaly-inspector-timestamp">
            {activePoint.point.label}
          </span>
          <span aria-hidden="true" style={{ color: 'var(--prism-text-secondary)' }}>
            ·
          </span>
          <span data-testid="anomaly-inspector-actual">
            {activePoint.actual !== null ? (
              <>
                <span style={{ color: 'var(--prism-text-secondary)' }}>Actual </span>
                <strong className="font-mono font-semibold">
                  {formatWithUnit(activePoint.actual, unit)}
                </strong>
                <span style={{ color: 'var(--prism-text-secondary)' }}> vs Expected </span>
                <strong className="font-mono font-semibold">
                  {formatWithUnit(activePoint.expected, unit)}
                </strong>
              </>
            ) : (
              <>
                <span style={{ color: 'var(--prism-text-secondary)' }}>Forecast </span>
                <strong className="font-mono font-semibold" style={{ color: 'var(--prism-info-main)' }}>
                  —
                </strong>
                <span style={{ color: 'var(--prism-text-secondary)' }}> vs Expected </span>
                <strong className="font-mono font-semibold">
                  {formatWithUnit(activePoint.expected, unit)}
                </strong>
              </>
            )}
          </span>
          <span aria-hidden="true" style={{ color: 'var(--prism-text-secondary)' }}>
            ·
          </span>
          <span data-testid="anomaly-inspector-band">
            <span style={{ color: 'var(--prism-text-secondary)' }}>Confidence Band </span>
            <strong className="font-mono font-semibold" style={{ color: 'var(--prism-info-main)' }}>
              {formatBandRange(activePoint.lower, activePoint.upper, unit)}
            </strong>
          </span>
          <span aria-hidden="true" style={{ color: 'var(--prism-text-secondary)' }}>
            ·
          </span>
          <span data-testid="anomaly-inspector-deviation">
            <span style={{ color: 'var(--prism-text-secondary)' }}>Deviation </span>
            <strong
              className="font-mono font-semibold"
              style={{ color: getStatusColor(activePoint.direction, activePoint.isForecast) }}
            >
              {activePoint.isForecast
                ? 'Horizon'
                : formatSignedDelta(activePoint.deviation, unit)}
            </strong>
          </span>
          <span aria-hidden="true" style={{ color: 'var(--prism-text-secondary)' }}>
            ·
          </span>
          <span
            data-testid="anomaly-inspector-status"
            data-direction={activePoint.direction}
            className="font-semibold"
            style={{ color: getStatusColor(activePoint.direction, activePoint.isForecast) }}
          >
            {getStatusLabel(activePoint.direction, activePoint.isForecast)}
          </span>
        </div>
      ) : null}
    </div>
  );
}

AnomalyForecastChart.displayName = 'AnomalyForecastChart';
