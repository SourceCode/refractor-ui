'use client';

import { useId, useMemo, useState, type KeyboardEvent } from 'react';
import { Flag } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { themeProps } from '../utils/themeProps';

export type ThresholdTone = 'primary' | 'secondary' | 'emerald' | 'amber' | 'rose';

export interface ThresholdDataPoint {
  /** Category or timestamp label plotted along the X-axis. */
  label: string;
  /** Numeric observation plotted along the Y-axis (non-finite values are filtered out). */
  value: number;
}

export interface ChartThresholdLine {
  /** Stable unique identifier for this horizontal threshold line. */
  id: string;
  /** Human-readable threshold label (e.g. 'SLA Limit', 'Budget Cap'). */
  label: string;
  /** Horizontal Y-axis reference value (non-finite thresholds are ignored). */
  value: number;
  /** Optional semantic --prism-* optical tone (defaults to 'amber'). */
  tone?: ThresholdTone;
  /** Renders the reference line with a dashed stroke pattern when true (defaults to true). */
  dashed?: boolean;
}

export interface ChartTargetBand {
  /** Stable unique identifier for this shaded target zone. */
  id: string;
  /** Right-aligned label rendered inside the shaded target zone. */
  label: string;
  /** Lower or starting boundary value of the target zone. */
  from: number;
  /** Upper or ending boundary value of the target zone. */
  to: number;
  /** Optional semantic --prism-* optical tone (defaults to 'emerald'). */
  tone?: ThresholdTone;
}

export interface ChartEventMarker {
  /** Stable unique identifier for this pinned vertical event marker. */
  id: string;
  /** Zero-based index into the finite data points array where the stem attaches. */
  index: number;
  /** Short callout flag label displayed atop the vertical reference stem. */
  label: string;
  /** Optional annotation detail displayed in the inspector well when focused. */
  detail?: string;
  /** Optional semantic --prism-* optical tone (defaults to 'primary'). */
  tone?: ThresholdTone;
}

export interface ChartThresholdMarkerProps extends BaseProps<HTMLDivElement> {
  /** Ordered numeric observations plotted as the base optical trend (non-finite values are filtered out). */
  data: ThresholdDataPoint[];
  /** Optional horizontal reference lines (e.g. SLA, Budget Cap) with live breach counts. */
  thresholds?: ChartThresholdLine[];
  /** Optional shaded horizontal target zones spanning [from, to]. */
  bands?: ChartTargetBand[];
  /** Optional vertical pinned event callout flags attached to valid data indices. */
  events?: ChartEventMarker[];
  /** Card heading linked to the chart SVG (defaults to 'Threshold & Event Annotations'). */
  title?: string;
  /** Optional unit suffix appended to formatted values (defaults to ''). */
  valueUnit?: string;
  /** SVG chart viewport height in pixels, clamped to [170, 480] (defaults to 250). */
  height?: number;
  /** Callback fired when a threshold badge pill is clicked or activated via keyboard. */
  onSelectThreshold?: (threshold: ChartThresholdLine, breaches: number) => void;
  /** Callback fired when an event callout flag is clicked or activated via keyboard. */
  onSelectEvent?: (event: ChartEventMarker, point: ThresholdDataPoint) => void;
}

interface NormalizedDataPoint {
  key: string;
  index: number;
  point: ThresholdDataPoint;
  value: number;
}

interface NormalizedThreshold {
  key: string;
  threshold: ChartThresholdLine;
  tone: ThresholdTone;
  colorToken: string;
  dashed: boolean;
  breaches: number;
}

interface NormalizedBand {
  key: string;
  band: ChartTargetBand;
  tone: ThresholdTone;
  colorToken: string;
  low: number;
  high: number;
}

interface NormalizedEvent {
  key: string;
  event: ChartEventMarker;
  point: NormalizedDataPoint;
  tone: ThresholdTone;
  colorToken: string;
  lane: number;
}

interface PlottedPoint {
  key: string;
  index: number;
  point: ThresholdDataPoint;
  value: number;
  x: number;
  y: number;
  isBreach: boolean;
}

interface PlottedThreshold {
  item: NormalizedThreshold;
  y: number;
  pillX: number;
  pillY: number;
  pillWidth: number;
  pillLabel: string;
}

interface PlottedBand {
  item: NormalizedBand;
  yTop: number;
  bandHeight: number;
  labelY: number;
}

interface PlottedEvent {
  item: NormalizedEvent;
  x: number;
  pointY: number;
  flagX: number;
  flagY: number;
  flagWidth: number;
}

interface GridTick {
  key: string;
  y: number;
  label: string;
}

interface ChartGeometry {
  gridTicks: GridTick[];
  xAxisPoints: PlottedPoint[];
  plottedPoints: PlottedPoint[];
  polylinePoints: string;
  areaPath: string;
  plottedBands: PlottedBand[];
  plottedThresholds: PlottedThreshold[];
  plottedEvents: PlottedEvent[];
  alertColor: string;
  plotBottomY: number;
}

type InspectorSelection =
  | { kind: 'threshold'; key: string }
  | { kind: 'event'; key: string }
  | null;

type ResolvedSelection =
  | { kind: 'threshold'; item: NormalizedThreshold }
  | { kind: 'event'; item: NormalizedEvent }
  | null;

const VIEW_WIDTH = 620;
const PAD_LEFT = 54;
const PAD_RIGHT = 24;
const PAD_TOP = 30;
const PAD_BOTTOM = 30;
const GRID_STEPS = 4;
const MIN_HEIGHT = 170;
const MAX_HEIGHT = 480;
const DEFAULT_HEIGHT = 250;
const PILL_HEIGHT = 20;
const FLAG_HEIGHT = 18;

const TONE_TOKEN_MAP: Record<ThresholdTone, string> = {
  primary: 'var(--prism-primary-main)',
  secondary: 'var(--prism-secondary-main)',
  emerald: 'var(--prism-success-main)',
  amber: 'var(--prism-warning-main)',
  rose: 'var(--prism-error-main)',
};

function formatNumber(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  const safe = rounded === 0 ? 0 : rounded;
  return Number.isInteger(safe) ? String(safe) : safe.toFixed(1);
}

function formatValue(value: number, valueUnit: string): string {
  return `${formatNumber(value)}${valueUnit}`;
}

function computeYDomain(
  points: ReadonlyArray<NormalizedDataPoint>,
  thresholds: ReadonlyArray<NormalizedThreshold>,
  bands: ReadonlyArray<NormalizedBand>
): { min: number; max: number } {
  let rawMin = Number.POSITIVE_INFINITY;
  let rawMax = Number.NEGATIVE_INFINITY;

  const extend = (v: number) => {
    if (v < rawMin) rawMin = v;
    if (v > rawMax) rawMax = v;
  };

  for (const pt of points) {
    extend(pt.value);
  }
  for (const th of thresholds) {
    extend(th.threshold.value);
  }
  for (const band of bands) {
    extend(band.low);
    extend(band.high);
  }

  if (rawMax === rawMin) {
    if (rawMax === 0) {
      return { min: 0, max: 10 };
    }
    const pad = Math.abs(rawMax) * 0.2;
    return { min: rawMin - pad, max: rawMax + pad };
  }

  const padding = (rawMax - rawMin) * 0.08;
  return {
    min: rawMin - padding,
    max: rawMax + padding,
  };
}

export function ChartThresholdMarker({
  data,
  thresholds = [],
  bands = [],
  events = [],
  title = 'Threshold & Event Annotations',
  valueUnit = '',
  height = DEFAULT_HEIGHT,
  onSelectThreshold,
  onSelectEvent,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: ChartThresholdMarkerProps) {
  const override = useComponentOverride('ChartThresholdMarker');
  const headingId = useId();
  const areaGradientId = useId();

  const [showBands, setShowBands] = useState(true);
  const [showThresholds, setShowThresholds] = useState(true);
  const [showEvents, setShowEvents] = useState(true);
  const [selection, setSelection] = useState<InspectorSelection>(null);

  const safeHeight = Math.round(clampNumber(height, MIN_HEIGHT, MAX_HEIGHT, DEFAULT_HEIGHT));
  const plotWidth = VIEW_WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = safeHeight - PAD_TOP - PAD_BOTTOM;

  const finitePoints = useMemo<NormalizedDataPoint[]>(() => {
    const counts = new Map<string, number>();
    const result: NormalizedDataPoint[] = [];
    for (const item of data) {
      if (!Number.isFinite(item.value)) continue;
      const seen = counts.get(item.label) ?? 0;
      counts.set(item.label, seen + 1);
      const key = seen === 0 ? `pt:${item.label}` : `pt:${item.label}#${seen + 1}`;
      result.push({
        key,
        index: result.length,
        point: item,
        value: item.value,
      });
    }
    return result;
  }, [data]);

  const normalizedThresholds = useMemo<NormalizedThreshold[]>(() => {
    const counts = new Map<string, number>();
    const result: NormalizedThreshold[] = [];
    for (const item of thresholds) {
      if (!Number.isFinite(item.value)) continue;
      const seen = counts.get(item.id) ?? 0;
      counts.set(item.id, seen + 1);
      const key = seen === 0 ? `th:${item.id}` : `th:${item.id}#${seen + 1}`;
      const tone: ThresholdTone = item.tone ?? 'amber';
      let breaches = 0;
      for (const pt of finitePoints) {
        if (pt.value > item.value) breaches += 1;
      }
      result.push({
        key,
        threshold: item,
        tone,
        colorToken: TONE_TOKEN_MAP[tone],
        dashed: item.dashed ?? true,
        breaches,
      });
    }
    return result;
  }, [thresholds, finitePoints]);

  const normalizedBands = useMemo<NormalizedBand[]>(() => {
    const counts = new Map<string, number>();
    const result: NormalizedBand[] = [];
    for (const item of bands) {
      if (!Number.isFinite(item.from) || !Number.isFinite(item.to)) continue;
      const seen = counts.get(item.id) ?? 0;
      counts.set(item.id, seen + 1);
      const key = seen === 0 ? `band:${item.id}` : `band:${item.id}#${seen + 1}`;
      const tone: ThresholdTone = item.tone ?? 'emerald';
      result.push({
        key,
        band: item,
        tone,
        colorToken: TONE_TOKEN_MAP[tone],
        low: Math.min(item.from, item.to),
        high: Math.max(item.from, item.to),
      });
    }
    return result;
  }, [bands]);

  const normalizedEvents = useMemo<NormalizedEvent[]>(() => {
    const idCounts = new Map<string, number>();
    const indexLanes = new Map<number, number>();
    const result: NormalizedEvent[] = [];
    for (const item of events) {
      if (!Number.isInteger(item.index)) {
        continue;
      }
      const targetPoint = finitePoints[item.index];
      if (!targetPoint) {
        continue;
      }
      const seen = idCounts.get(item.id) ?? 0;
      idCounts.set(item.id, seen + 1);
      const key = seen === 0 ? `ev:${item.id}` : `ev:${item.id}#${seen + 1}`;
      const lane = indexLanes.get(item.index) ?? 0;
      indexLanes.set(item.index, lane + 1);
      const tone: ThresholdTone = item.tone ?? 'primary';
      result.push({
        key,
        event: item,
        point: targetPoint,
        tone,
        colorToken: TONE_TOKEN_MAP[tone],
        lane,
      });
    }
    return result;
  }, [events, finitePoints]);

  const isEmpty = finitePoints.length === 0;

  const geometry = useMemo<ChartGeometry | null>(() => {
    if (finitePoints.length === 0) return null;

    const domain = computeYDomain(finitePoints, normalizedThresholds, normalizedBands);
    const span = domain.max - domain.min;
    const plotBottomY = PAD_TOP + plotHeight;
    const valueToY = (value: number): number =>
      PAD_TOP + plotHeight - ((value - domain.min) / span) * plotHeight;

    let highestAlertThreshold: NormalizedThreshold | null = null;
    for (const th of normalizedThresholds) {
      if (th.tone === 'rose' || th.tone === 'amber') {
        if (
          highestAlertThreshold === null ||
          th.threshold.value > highestAlertThreshold.threshold.value
        ) {
          highestAlertThreshold = th;
        }
      }
    }

    const alertColor = highestAlertThreshold
      ? highestAlertThreshold.colorToken
      : 'var(--prism-error-main)';

    const gridTicks: GridTick[] = [];
    for (let step = 0; step < GRID_STEPS; step += 1) {
      const fraction = step / (GRID_STEPS - 1);
      const y = PAD_TOP + fraction * plotHeight;
      const tickVal = domain.max - fraction * span;
      gridTicks.push({
        key: `grid-${step}`,
        y,
        label: formatNumber(tickVal),
      });
    }

    const pointCount = finitePoints.length;
    const indexToX = (index: number): number =>
      pointCount === 1
        ? PAD_LEFT + plotWidth / 2
        : PAD_LEFT + (index / (pointCount - 1)) * plotWidth;

    const plottedPoints: PlottedPoint[] = finitePoints.map((pt) => {
      const x = indexToX(pt.index);
      const y = valueToY(pt.value);
      const isBreach =
        highestAlertThreshold !== null && pt.value > highestAlertThreshold.threshold.value;
      return {
        key: pt.key,
        index: pt.index,
        point: pt.point,
        value: pt.value,
        x,
        y,
        isBreach,
      };
    });

    const labelStep = pointCount > 8 ? Math.ceil(pointCount / 6) : 1;
    const xAxisPoints = plottedPoints.filter(
      (pt) => pt.index % labelStep === 0 || pt.index === pointCount - 1
    );

    const polylinePoints = plottedPoints
      .map((pt) => `${pt.x.toFixed(2)},${pt.y.toFixed(2)}`)
      .join(' ');

    let areaPath = '';
    if (pointCount >= 2) {
      const firstX = indexToX(0);
      const lastX = indexToX(pointCount - 1);
      const lineCoords = plottedPoints
        .map((pt) => `L ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`)
        .join(' ');
      areaPath = `M ${firstX.toFixed(2)} ${plotBottomY.toFixed(2)} ${lineCoords} L ${lastX.toFixed(2)} ${plotBottomY.toFixed(2)} Z`;
    }

    const plottedBands: PlottedBand[] = normalizedBands.map((item) => {
      const yTop = valueToY(item.high);
      const yBottom = valueToY(item.low);
      const bandHeight = Math.max(2, yBottom - yTop);
      const labelY = Math.min(yTop + 12, plotBottomY - 4);
      return {
        item,
        yTop,
        bandHeight,
        labelY,
      };
    });

    const plottedThresholds: PlottedThreshold[] = normalizedThresholds.map((item) => {
      const y = valueToY(item.threshold.value);
      const pillLabel = `${item.threshold.label} · ${item.breaches}`;
      const pillWidth = Math.max(76, Math.min(200, Math.round(pillLabel.length * 6.2 + 18)));
      const pillX = VIEW_WIDTH - PAD_RIGHT - pillWidth;
      const pillY = clampNumber(
        y - PILL_HEIGHT / 2,
        PAD_TOP,
        plotBottomY - PILL_HEIGHT,
        PAD_TOP
      );
      return {
        item,
        y,
        pillX,
        pillY,
        pillWidth,
        pillLabel,
      };
    });

    const plottedEvents: PlottedEvent[] = normalizedEvents.map((item) => {
      const x = indexToX(item.point.index);
      const pointY = valueToY(item.point.value);
      const flagWidth = Math.max(54, Math.min(148, Math.round(item.event.label.length * 6.4 + 16)));
      const flagX = clampNumber(
        x - flagWidth / 2,
        PAD_LEFT,
        VIEW_WIDTH - PAD_RIGHT - flagWidth,
        PAD_LEFT
      );
      const flagY = clampNumber(
        4 + item.lane * (FLAG_HEIGHT + 4),
        4,
        plotBottomY - FLAG_HEIGHT,
        4
      );
      return {
        item,
        x,
        pointY,
        flagX,
        flagY,
        flagWidth,
      };
    });

    return {
      gridTicks,
      xAxisPoints,
      plottedPoints,
      polylinePoints,
      areaPath,
      plottedBands,
      plottedThresholds,
      plottedEvents,
      alertColor,
      plotBottomY,
    };
  }, [finitePoints, normalizedThresholds, normalizedBands, normalizedEvents, plotWidth, plotHeight]);

  const resolvedSelection = useMemo<ResolvedSelection>(() => {
    if (!selection) return null;
    if (selection.kind === 'threshold') {
      if (!showThresholds) return null;
      const found = normalizedThresholds.find((th) => th.key === selection.key);
      return found ? { kind: 'threshold', item: found } : null;
    }
    if (!showEvents) return null;
    const found = normalizedEvents.find((ev) => ev.key === selection.key);
    return found ? { kind: 'event', item: found } : null;
  }, [selection, showThresholds, showEvents, normalizedThresholds, normalizedEvents]);

  const handleSelectThreshold = (item: NormalizedThreshold) => {
    setSelection({ kind: 'threshold', key: item.key });
    onSelectThreshold?.(item.threshold, item.breaches);
  };

  const handleSelectEvent = (item: NormalizedEvent) => {
    setSelection({ kind: 'event', key: item.key });
    onSelectEvent?.(item.event, item.point.point);
  };

  const handleThresholdKeyDown = (
    event: KeyboardEvent<SVGGElement>,
    item: NormalizedThreshold
  ) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSelectThreshold(item);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setSelection(null);
    }
  };

  const handleEventKeyDown = (event: KeyboardEvent<SVGGElement>, item: NormalizedEvent) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSelectEvent(item);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setSelection(null);
    }
  };

  const merged = mergeProps({
    themeTarget: themeProps('chart-threshold-marker', {
      empty: isEmpty,
      showBands,
      showThresholds,
      showEvents,
    }),
    baseClassName: 'prism-slab p-5 w-full space-y-4',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('chart-threshold-marker', 'header');
  const controlsClass = stableClassName('chart-threshold-marker', 'controls');
  const canvasClass = stableClassName('chart-threshold-marker', 'canvas');
  const inspectorClass = stableClassName('chart-threshold-marker', 'inspector');

  return (
    <div ref={ref} {...rest} {...merged}>
      <div className={cx(headerClass, 'flex flex-wrap items-center justify-between gap-3')}>
        <div className="min-w-0 flex flex-wrap items-center gap-2.5">
          <span
            className="prism-well w-8 h-8 rounded-full inline-flex items-center justify-center shrink-0"
            style={{ color: 'var(--prism-primary-main)' }}
          >
            <Flag aria-hidden="true" className="w-4 h-4 shrink-0" />
          </span>
          <h4
            id={headingId}
            className="text-sm font-semibold truncate"
            style={{ color: 'var(--prism-text-primary)' }}
          >
            {title}
          </h4>
          <span
            data-testid="threshold-counts-pill"
            className="prism-crystal rounded-full px-2.5 py-0.5 text-[11px] font-mono tabular-nums shrink-0"
            style={{ color: 'var(--prism-text-secondary)' }}
          >
            {normalizedThresholds.length} lines · {normalizedEvents.length} events
          </span>
        </div>

        {!isEmpty ? (
          <div
            role="group"
            aria-label="Toggle chart annotation layers"
            data-testid="threshold-layer-toggles"
            className={cx(controlsClass, 'flex flex-wrap items-center gap-1.5')}
          >
            <button
              type="button"
              aria-pressed={showBands}
              data-testid="toggle-bands"
              onClick={() => setShowBands((prev) => !prev)}
              className={cx(
                'prism-focus-ring inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium cursor-pointer transition-all',
                showBands ? 'prism-crystal' : 'prism-well opacity-55 line-through'
              )}
              style={{ color: 'var(--prism-text-primary)' }}
            >
              <span
                aria-hidden="true"
                className="w-2 h-2 rounded-full shrink-0"
                style={{
                  backgroundColor: showBands
                    ? 'var(--prism-success-main)'
                    : 'var(--prism-text-disabled)',
                }}
              />
              <span>Bands</span>
            </button>

            <button
              type="button"
              aria-pressed={showThresholds}
              data-testid="toggle-thresholds"
              onClick={() => setShowThresholds((prev) => !prev)}
              className={cx(
                'prism-focus-ring inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium cursor-pointer transition-all',
                showThresholds ? 'prism-crystal' : 'prism-well opacity-55 line-through'
              )}
              style={{ color: 'var(--prism-text-primary)' }}
            >
              <span
                aria-hidden="true"
                className="w-2 h-2 rounded-full shrink-0"
                style={{
                  backgroundColor: showThresholds
                    ? 'var(--prism-warning-main)'
                    : 'var(--prism-text-disabled)',
                }}
              />
              <span>Thresholds</span>
            </button>

            <button
              type="button"
              aria-pressed={showEvents}
              data-testid="toggle-events"
              onClick={() => setShowEvents((prev) => !prev)}
              className={cx(
                'prism-focus-ring inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium cursor-pointer transition-all',
                showEvents ? 'prism-crystal' : 'prism-well opacity-55 line-through'
              )}
              style={{ color: 'var(--prism-text-primary)' }}
            >
              <span
                aria-hidden="true"
                className="w-2 h-2 rounded-full shrink-0"
                style={{
                  backgroundColor: showEvents
                    ? 'var(--prism-primary-main)'
                    : 'var(--prism-text-disabled)',
                }}
              />
              <span>Events</span>
            </button>
          </div>
        ) : null}
      </div>

      {geometry === null ? (
        <div
          role="status"
          data-testid="threshold-chart-empty"
          className="prism-well rounded-2xl px-4 py-8 text-center text-xs"
          style={{ color: 'var(--prism-text-secondary)' }}
        >
          No finite data points available to plot thresholds or event annotations.
        </div>
      ) : (
        <>
          <div className={cx(canvasClass, 'prism-well rounded-2xl p-3')}>
            <svg
              role="img"
              aria-labelledby={headingId}
              aria-label={`${title} chart with ${normalizedThresholds.length} thresholds and ${normalizedEvents.length} events`}
              data-testid="threshold-chart-svg"
              viewBox={`0 0 ${VIEW_WIDTH} ${safeHeight}`}
              className="w-full overflow-visible block"
              style={{ height: `${safeHeight}px` }}
            >
              <defs>
                <linearGradient id={areaGradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--prism-primary-main)" stopOpacity={0.24} />
                  <stop offset="100%" stopColor="var(--prism-primary-main)" stopOpacity={0.02} />
                </linearGradient>
              </defs>

              {geometry.gridTicks.map((tick) => (
                <g key={tick.key} data-testid="threshold-gridline">
                  <line
                    x1={PAD_LEFT}
                    y1={tick.y}
                    x2={VIEW_WIDTH - PAD_RIGHT}
                    y2={tick.y}
                    stroke="var(--prism-divider)"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                  />
                  <text
                    x={PAD_LEFT - 10}
                    y={tick.y + 3.5}
                    textAnchor="end"
                    className="text-[10px] font-mono tabular-nums"
                    style={{ fill: 'var(--prism-text-secondary)' }}
                  >
                    {tick.label}
                  </text>
                </g>
              ))}

              {geometry.xAxisPoints.map((pt) => (
                <text
                  key={`x-${pt.key}`}
                  x={pt.x}
                  y={safeHeight - 8}
                  textAnchor="middle"
                  className="text-[10px] font-medium"
                  style={{ fill: 'var(--prism-text-secondary)' }}
                >
                  {pt.point.label}
                </text>
              ))}

              {showBands
                ? geometry.plottedBands.map((pb) => (
                    <g
                      key={pb.item.key}
                      data-testid={`threshold-band-${pb.item.band.id}`}
                      data-tone={pb.item.tone}
                    >
                      <rect
                        x={PAD_LEFT}
                        y={pb.yTop}
                        width={plotWidth}
                        height={pb.bandHeight}
                        rx={3}
                        fill={pb.item.colorToken}
                        fillOpacity="0.12"
                      />
                      <text
                        x={VIEW_WIDTH - PAD_RIGHT - 6}
                        y={pb.labelY}
                        textAnchor="end"
                        className="text-[10px] font-medium"
                        style={{ fill: pb.item.colorToken }}
                      >
                        {pb.item.band.label}
                      </text>
                    </g>
                  ))
                : null}

              {geometry.areaPath ? (
                <path
                  data-testid="threshold-area-path"
                  d={geometry.areaPath}
                  fill={`url(#${areaGradientId})`}
                  pointerEvents="none"
                />
              ) : null}

              <polyline
                data-testid="threshold-trend-polyline"
                points={geometry.polylinePoints}
                fill="none"
                stroke="var(--prism-primary-main)"
                strokeWidth={2.25}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {showThresholds
                ? geometry.plottedThresholds.map((pt) => {
                    const isSelected =
                      resolvedSelection?.kind === 'threshold' &&
                      resolvedSelection.item.key === pt.item.key;
                    return (
                      <g key={pt.item.key} data-threshold-group={pt.item.threshold.id}>
                        <line
                          data-testid={`threshold-line-${pt.item.threshold.id}`}
                          data-tone={pt.item.tone}
                          x1={PAD_LEFT}
                          y1={pt.y}
                          x2={VIEW_WIDTH - PAD_RIGHT}
                          y2={pt.y}
                          stroke={pt.item.colorToken}
                          strokeWidth={isSelected ? 2.25 : 1.5}
                          strokeDasharray={pt.item.dashed ? '6 4' : undefined}
                        />
                        <g
                          role="button"
                          tabIndex={0}
                          aria-pressed={isSelected}
                          aria-label={`${pt.item.threshold.label}: ${formatValue(pt.item.threshold.value, valueUnit)}, ${pt.item.breaches} points above line`}
                          data-testid={`threshold-badge-${pt.item.threshold.id}`}
                          data-breaches={String(pt.item.breaches)}
                          data-tone={pt.item.tone}
                          className="prism-focus-ring cursor-pointer"
                          onClick={() => handleSelectThreshold(pt.item)}
                          onKeyDown={(e) => handleThresholdKeyDown(e, pt.item)}
                        >
                          <rect
                            x={pt.pillX}
                            y={pt.pillY}
                            width={pt.pillWidth}
                            height={PILL_HEIGHT}
                            rx={10}
                            fill={isSelected ? pt.item.colorToken : 'var(--prism-bg-start)'}
                            fillOpacity={isSelected ? 0.22 : 0.94}
                            stroke={pt.item.colorToken}
                            strokeWidth={isSelected ? 1.75 : 1.25}
                          />
                          <text
                            x={pt.pillX + pt.pillWidth / 2}
                            y={pt.pillY + 13.5}
                            textAnchor="middle"
                            className="text-[10px] font-mono font-semibold tabular-nums"
                            style={{ fill: pt.item.colorToken }}
                          >
                            {pt.pillLabel}
                          </text>
                        </g>
                      </g>
                    );
                  })
                : null}

              {geometry.plottedPoints.map((pt) => {
                const dotColor = pt.isBreach
                  ? geometry.alertColor
                  : 'var(--prism-primary-main)';
                return (
                  <g key={pt.key}>
                    {pt.isBreach ? (
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={8.5}
                        fill={geometry.alertColor}
                        fillOpacity={0.2}
                        pointerEvents="none"
                      />
                    ) : null}
                    <circle
                      data-testid={`threshold-point-${pt.index}`}
                      data-breach={pt.isBreach ? 'true' : undefined}
                      cx={pt.x}
                      cy={pt.y}
                      r={pt.isBreach ? 5 : 3.5}
                      fill={pt.isBreach ? dotColor : 'var(--prism-primary-contrast)'}
                      stroke={dotColor}
                      strokeWidth={pt.isBreach ? 2.25 : 1.75}
                    />
                  </g>
                );
              })}

              {showEvents
                ? geometry.plottedEvents.map((pe) => {
                    const isSelected =
                      resolvedSelection?.kind === 'event' &&
                      resolvedSelection.item.key === pe.item.key;
                    return (
                      <g key={pe.item.key} data-event-group={pe.item.event.id}>
                        <line
                          data-testid={`event-stem-${pe.item.event.id}`}
                          data-tone={pe.item.tone}
                          x1={pe.x}
                          y1={pe.flagY + FLAG_HEIGHT}
                          x2={pe.x}
                          y2={geometry.plotBottomY}
                          stroke={pe.item.colorToken}
                          strokeWidth={isSelected ? 2 : 1.25}
                          strokeDasharray="4 3"
                        />
                        <circle
                          cx={pe.x}
                          cy={pe.pointY}
                          r={isSelected ? 6 : 4.5}
                          fill={pe.item.colorToken}
                          stroke="var(--prism-primary-contrast)"
                          strokeWidth={1.5}
                          pointerEvents="none"
                        />
                        <g
                          role="button"
                          tabIndex={0}
                          aria-pressed={isSelected}
                          aria-label={`Event ${pe.item.event.label} at ${pe.item.point.point.label}: ${formatValue(pe.item.point.value, valueUnit)}${pe.item.event.detail ? ` — ${pe.item.event.detail}` : ''}`}
                          data-testid={`event-flag-${pe.item.event.id}`}
                          data-tone={pe.item.tone}
                          className="prism-focus-ring cursor-pointer"
                          onClick={() => handleSelectEvent(pe.item)}
                          onKeyDown={(e) => handleEventKeyDown(e, pe.item)}
                        >
                          <rect
                            x={pe.flagX}
                            y={pe.flagY}
                            width={pe.flagWidth}
                            height={FLAG_HEIGHT}
                            rx={9}
                            fill={isSelected ? pe.item.colorToken : 'var(--prism-bg-start)'}
                            fillOpacity={isSelected ? 0.22 : 0.94}
                            stroke={pe.item.colorToken}
                            strokeWidth={isSelected ? 1.75 : 1.25}
                          />
                          <text
                            x={pe.flagX + pe.flagWidth / 2}
                            y={pe.flagY + 12.5}
                            textAnchor="middle"
                            className="text-[10px] font-semibold"
                            style={{ fill: pe.item.colorToken }}
                          >
                            {pe.item.event.label}
                          </text>
                        </g>
                      </g>
                    );
                  })
                : null}
            </svg>
          </div>

          <div
            aria-live="polite"
            data-testid="threshold-inspector"
            className={cx(
              inspectorClass,
              'prism-well rounded-xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs'
            )}
          >
            {resolvedSelection?.kind === 'threshold' ? (
              <>
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <span
                    aria-hidden="true"
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: resolvedSelection.item.colorToken }}
                  />
                  <span
                    data-testid="threshold-inspector-text"
                    className="font-semibold tabular-nums"
                    style={{ color: 'var(--prism-text-primary)' }}
                  >
                    {resolvedSelection.item.threshold.label}:{' '}
                    {formatValue(resolvedSelection.item.threshold.value, valueUnit)} ·{' '}
                    {resolvedSelection.item.breaches} points above line
                  </span>
                  {resolvedSelection.item.breaches === 0 ? (
                    <span
                      data-testid="threshold-status-badge"
                      className="prism-emerald rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    >
                      Within limit
                    </span>
                  ) : (
                    <span
                      data-testid="threshold-status-badge"
                      className="prism-crystal rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={{ color: resolvedSelection.item.colorToken }}
                    >
                      Breached
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  data-testid="threshold-inspector-clear"
                  onClick={() => setSelection(null)}
                  className="prism-crystal prism-focus-ring rounded-full px-2.5 py-0.5 text-[11px] font-medium cursor-pointer"
                  style={{ color: 'var(--prism-text-primary)' }}
                >
                  Clear
                </button>
              </>
            ) : resolvedSelection?.kind === 'event' ? (
              <>
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <span
                    aria-hidden="true"
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: resolvedSelection.item.colorToken }}
                  />
                  <span
                    data-testid="threshold-inspector-text"
                    className="font-semibold"
                    style={{ color: 'var(--prism-text-primary)' }}
                  >
                    {resolvedSelection.item.point.point.label} · {resolvedSelection.item.event.label}
                  </span>
                  {resolvedSelection.item.event.detail ? (
                    <span
                      data-testid="threshold-inspector-detail"
                      style={{ color: 'var(--prism-text-secondary)' }}
                    >
                      {resolvedSelection.item.event.detail}
                    </span>
                  ) : null}
                  <span
                    data-testid="threshold-inspector-value"
                    className="prism-crystal rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums"
                    style={{ color: 'var(--prism-text-primary)' }}
                  >
                    {formatValue(resolvedSelection.item.point.value, valueUnit)}
                  </span>
                </div>
                <button
                  type="button"
                  data-testid="threshold-inspector-clear"
                  onClick={() => setSelection(null)}
                  className="prism-crystal prism-focus-ring rounded-full px-2.5 py-0.5 text-[11px] font-medium cursor-pointer"
                  style={{ color: 'var(--prism-text-primary)' }}
                >
                  Clear
                </button>
              </>
            ) : (
              <span
                data-testid="threshold-inspector-idle"
                style={{ color: 'var(--prism-text-secondary)' }}
              >
                Select a threshold badge or event flag to inspect breaches and annotations.
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

ChartThresholdMarker.displayName = 'ChartThresholdMarker';
