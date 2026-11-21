'use client';

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { Pause, Play, StepForward } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { themeProps } from '../utils/themeProps';

export type TelemetryTone = 'primary' | 'secondary' | 'emerald' | 'amber' | 'rose';
export type TelemetryWindowSize = 20 | 40 | 60;

export interface TelemetrySample {
  /** Optional stable identifier for the telemetry sample. */
  id?: string;
  /** Human-readable timestamp string (e.g. '12:04:08'). */
  timestamp: string;
  /** Numeric telemetry measurement (non-finite values are filtered out). */
  value: number;
}

export interface LiveTelemetryChartProps extends BaseProps<HTMLDivElement> {
  /** Initial or externally updated streaming points (filtered to finite numeric values). */
  samples: TelemetrySample[];
  /** Card heading linked to the chart SVG (defaults to 'Live Telemetry Stream'). */
  title?: string;
  /** Unit suffix appended to formatted telemetry readouts (defaults to 'ms'). */
  unit?: string;
  /** Semantic --prism-* optical color tone (defaults to 'primary'). */
  tone?: TelemetryTone;
  /** Initial rolling window size: 20, 40, or 60 samples (defaults to 40). */
  defaultWindowSize?: TelemetryWindowSize;
  /** Optional horizontal dashed threshold; flags samples >= threshold with --prism-error-main. */
  warningThreshold?: number;
  /** Controlled pause state; freezes the rendered window snapshot when true. */
  paused?: boolean;
  /** Initial uncontrolled pause state (defaults to false). */
  defaultPaused?: boolean;
  /** Callback fired when pause state toggles. */
  onPausedChange?: (paused: boolean) => void;
  /** Auto-streaming interval in milliseconds when > 0, live, and onGenerateSample is provided (defaults to 0). */
  streamingIntervalMs?: number;
  /** Optional sample factory invoked by the streaming interval and manual Step button. */
  onGenerateSample?: (sequence: number) => TelemetrySample;
  /** Chart SVG height in pixels, clamped to [140, 360] (defaults to 200). */
  height?: number;
  /** Callback fired when a plotted sample point is clicked or activated via keyboard. */
  onSelectSample?: (sample: TelemetrySample, index: number) => void;
}

interface NormalizedSample {
  key: string;
  sample: TelemetrySample;
  value: number;
}

interface PauseSnapshot {
  wasPaused: boolean;
  buffer: NormalizedSample[] | null;
}

interface TelemetryStats {
  current: number;
  min: number;
  avg: number;
  max: number;
}

interface PlottedSamplePoint {
  key: string;
  index: number;
  sample: TelemetrySample;
  value: number;
  x: number;
  y: number;
  exceedsThreshold: boolean;
}

interface GridTick {
  key: string;
  y: number;
  label: string;
}

interface ReadyTelemetryView {
  stats: TelemetryStats;
  plottedPoints: PlottedSamplePoint[];
  latestPoint: PlottedSamplePoint;
  inspectedPoint: PlottedSamplePoint;
  hasExplicitSelection: boolean;
  polylinePoints: string;
  areaPath: string;
  xAxisPoints: PlottedSamplePoint[];
  gridTicks: GridTick[];
  warningY: number | undefined;
}

const VIEW_WIDTH = 640;
const PAD_LEFT = 54;
const PAD_RIGHT = 20;
const PAD_TOP = 18;
const PAD_BOTTOM = 28;
const GRID_STEPS = 4;
const MIN_HEIGHT = 140;
const MAX_HEIGHT = 360;
const DEFAULT_HEIGHT = 200;

const WINDOW_SIZES: readonly TelemetryWindowSize[] = [20, 40, 60];

function getToneToken(tone: TelemetryTone): string {
  switch (tone) {
    case 'primary':
      return 'var(--prism-primary-main)';
    case 'secondary':
      return 'var(--prism-secondary-main)';
    case 'emerald':
      return 'var(--prism-success-main)';
    case 'amber':
      return 'var(--prism-warning-main)';
    case 'rose':
      return 'var(--prism-error-main)';
  }
}

function formatNumber(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  const safe = rounded === 0 ? 0 : rounded;
  return Number.isInteger(safe) ? String(safe) : safe.toFixed(1);
}

function formatMetric(value: number, unit: string): string {
  const trimmed = unit.trim();
  return `${formatNumber(value)}${trimmed}`;
}

function normalizeFiniteValue(value: number): number {
  return value === 0 ? 0 : value;
}

function computeYDomain(
  minVal: number,
  maxVal: number,
  warningThreshold: number | undefined
): { min: number; max: number } {
  let rawMin = minVal;
  let rawMax = maxVal;

  if (warningThreshold !== undefined) {
    if (warningThreshold < rawMin) rawMin = warningThreshold;
    if (warningThreshold > rawMax) rawMax = warningThreshold;
  }

  if (rawMax === rawMin) {
    if (rawMax === 0) {
      return { min: 0, max: 1 };
    }
    const pad = Math.abs(rawMax) * 0.2;
    return { min: rawMin - pad, max: rawMax + pad };
  }

  return { min: rawMin, max: rawMax };
}

function buildAreaPath(
  points: ReadonlyArray<PlottedSamplePoint>,
  baselineY: number
): string {
  if (points.length < 2) {
    return '';
  }
  let firstX = 0;
  let lastX = 0;
  let d = '';
  for (const pt of points) {
    if (d === '') {
      firstX = pt.x;
      d = `M ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`;
    } else {
      d += ` L ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`;
    }
    lastX = pt.x;
  }
  return `${d} L ${lastX.toFixed(2)} ${baselineY.toFixed(2)} L ${firstX.toFixed(2)} ${baselineY.toFixed(2)} Z`;
}

function selectXAxisPoints(
  points: ReadonlyArray<PlottedSamplePoint>
): PlottedSamplePoint[] {
  const count = points.length;
  if (count <= 5) {
    return [...points];
  }
  const indices = new Set<number>([
    0,
    Math.round((count - 1) * 0.25),
    Math.round((count - 1) * 0.5),
    Math.round((count - 1) * 0.75),
    count - 1,
  ]);
  return points.filter((pt) => indices.has(pt.index));
}

export function LiveTelemetryChart({
  samples,
  title = 'Live Telemetry Stream',
  unit = 'ms',
  tone = 'primary',
  defaultWindowSize = 40,
  warningThreshold,
  paused,
  defaultPaused = false,
  onPausedChange,
  streamingIntervalMs = 0,
  onGenerateSample,
  height = DEFAULT_HEIGHT,
  onSelectSample,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: LiveTelemetryChartProps) {
  const override = useComponentOverride('LiveTelemetryChart');
  const headingId = useId();
  const rawGradientId = useId();
  const gradientId = `ltc-area-${rawGradientId.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  const sequenceRef = useRef<number>(1);
  const [appendedSamples, setAppendedSamples] = useState<NormalizedSample[]>([]);
  const [windowSize, setWindowSize] = useState<TelemetryWindowSize>(defaultWindowSize);
  const [internalPaused, setInternalPaused] = useState<boolean>(defaultPaused);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const isControlledPaused = paused !== undefined;
  const isPaused = isControlledPaused ? paused : internalPaused;

  const safeHeight = Math.round(
    clampNumber(height, MIN_HEIGHT, MAX_HEIGHT, DEFAULT_HEIGHT)
  );
  const safeWarningThreshold =
    typeof warningThreshold === 'number' && Number.isFinite(warningThreshold)
      ? warningThreshold
      : undefined;
  const safeIntervalMs =
    typeof streamingIntervalMs === 'number' &&
    Number.isFinite(streamingIntervalMs) &&
    streamingIntervalMs > 0
      ? Math.max(1, Math.round(streamingIntervalMs))
      : 0;

  const toneColor = getToneToken(tone);
  const plotWidth = VIEW_WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = safeHeight - PAD_TOP - PAD_BOTTOM;

  const appendGeneratedSample = useCallback(
    (generator: (sequence: number) => TelemetrySample) => {
      const seq = sequenceRef.current;
      sequenceRef.current += 1;
      const nextSample = generator(seq);
      if (typeof nextSample.value === 'number' && Number.isFinite(nextSample.value)) {
        const entry: NormalizedSample = {
          key: `stream:${seq}`,
          sample: nextSample,
          value: normalizeFiniteValue(nextSample.value),
        };
        setAppendedSamples((prev) => [...prev, entry]);
      }
    },
    []
  );

  useEffect(() => {
    if (isPaused || safeIntervalMs <= 0 || !onGenerateSample) {
      return undefined;
    }
    const timerId = setInterval(() => {
      appendGeneratedSample(onGenerateSample);
    }, safeIntervalMs);
    return () => {
      clearInterval(timerId);
    };
  }, [appendGeneratedSample, isPaused, onGenerateSample, safeIntervalMs]);

  const normalizedPropSamples = useMemo<NormalizedSample[]>(() => {
    const counts = new Map<string, number>();
    const out: NormalizedSample[] = [];
    for (const sample of samples) {
      if (typeof sample.value !== 'number' || !Number.isFinite(sample.value)) {
        continue;
      }
      const base = sample.id
        ? `prop-id:${sample.id}`
        : `prop-ts:${sample.timestamp}`;
      const seen = counts.get(base) ?? 0;
      counts.set(base, seen + 1);
      const key = seen === 0 ? base : `${base}#${seen + 1}`;
      out.push({
        key,
        sample,
        value: normalizeFiniteValue(sample.value),
      });
    }
    return out;
  }, [samples]);

  const combinedBuffer = useMemo<NormalizedSample[]>(
    () => [...normalizedPropSamples, ...appendedSamples],
    [normalizedPropSamples, appendedSamples]
  );

  const [pauseSnapshot, setPauseSnapshot] = useState<PauseSnapshot>(() => ({
    wasPaused: isPaused,
    buffer: isPaused ? combinedBuffer : null,
  }));

  let activeBuffer: NormalizedSample[];
  if (isPaused !== pauseSnapshot.wasPaused) {
    const nextBuffer = isPaused ? combinedBuffer : null;
    setPauseSnapshot({ wasPaused: isPaused, buffer: nextBuffer });
    activeBuffer = nextBuffer ?? combinedBuffer;
  } else if (pauseSnapshot.buffer !== null) {
    activeBuffer = pauseSnapshot.buffer;
  } else {
    activeBuffer = combinedBuffer;
  }

  const bufferedCount = isPaused
    ? Math.max(0, combinedBuffer.length - activeBuffer.length)
    : 0;

  const visibleSamples = useMemo<NormalizedSample[]>(
    () => activeBuffer.slice(-windowSize),
    [activeBuffer, windowSize]
  );

  const readyView = useMemo<ReadyTelemetryView | null>(() => {
    const firstEntry = visibleSamples[0];
    if (!firstEntry) {
      return null;
    }

    const count = visibleSamples.length;
    let minVal = firstEntry.value;
    let maxVal = firstEntry.value;
    let sum = firstEntry.value;
    let currentVal = firstEntry.value;

    const restEntries = visibleSamples.slice(1);
    for (const entry of restEntries) {
      if (entry.value < minVal) minVal = entry.value;
      if (entry.value > maxVal) maxVal = entry.value;
      sum += entry.value;
      currentVal = entry.value;
    }

    const stats: TelemetryStats = {
      current: currentVal,
      min: minVal,
      avg: sum / count,
      max: maxVal,
    };

    const domain = computeYDomain(minVal, maxVal, safeWarningThreshold);
    const span = domain.max - domain.min;
    const baselineY = PAD_TOP + plotHeight;

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

    const toPlottedPoint = (
      entry: NormalizedSample,
      index: number
    ): PlottedSamplePoint => {
      const x =
        count === 1
          ? PAD_LEFT + plotWidth / 2
          : PAD_LEFT + (index / (count - 1)) * plotWidth;
      const ratio = (entry.value - domain.min) / span;
      const y = PAD_TOP + plotHeight - ratio * plotHeight;
      const exceedsThreshold =
        safeWarningThreshold !== undefined && entry.value >= safeWarningThreshold;
      return {
        key: entry.key,
        index,
        sample: entry.sample,
        value: entry.value,
        x,
        y,
        exceedsThreshold,
      };
    };

    const firstPlotted = toPlottedPoint(firstEntry, 0);
    const plottedPoints: PlottedSamplePoint[] = [firstPlotted];
    let latestPoint: PlottedSamplePoint = firstPlotted;
    let idx = 1;
    for (const entry of restEntries) {
      const pt = toPlottedPoint(entry, idx);
      plottedPoints.push(pt);
      latestPoint = pt;
      idx += 1;
    }

    const matchedSelected = selectedKey
      ? plottedPoints.find((pt) => pt.key === selectedKey)
      : undefined;
    const inspectedPoint = matchedSelected ?? latestPoint;
    const hasExplicitSelection = matchedSelected !== undefined;

    const polylinePoints = plottedPoints
      .map((pt) => `${pt.x.toFixed(2)},${pt.y.toFixed(2)}`)
      .join(' ');
    const areaPath = buildAreaPath(plottedPoints, baselineY);
    const xAxisPoints = selectXAxisPoints(plottedPoints);

    const warningY =
      safeWarningThreshold !== undefined
        ? PAD_TOP +
          plotHeight -
          ((safeWarningThreshold - domain.min) / span) * plotHeight
        : undefined;

    return {
      stats,
      plottedPoints,
      latestPoint,
      inspectedPoint,
      hasExplicitSelection,
      polylinePoints,
      areaPath,
      xAxisPoints,
      gridTicks,
      warningY,
    };
  }, [visibleSamples, safeWarningThreshold, plotHeight, plotWidth, selectedKey]);

  const isEmpty = readyView === null;
  const isCurrentWarning =
    readyView !== null &&
    safeWarningThreshold !== undefined &&
    readyView.stats.current >= safeWarningThreshold;

  const handleTogglePaused = useCallback(() => {
    const nextPaused = !isPaused;
    if (!isControlledPaused) {
      setInternalPaused(nextPaused);
    }
    onPausedChange?.(nextPaused);
  }, [isControlledPaused, isPaused, onPausedChange]);

  const handleSelectPoint = useCallback(
    (key: string, sample: TelemetrySample, index: number) => {
      setSelectedKey(key);
      onSelectSample?.(sample, index);
    },
    [onSelectSample]
  );

  const handlePointKeyDown = useCallback(
    (
      event: KeyboardEvent<SVGCircleElement>,
      key: string,
      sample: TelemetrySample,
      index: number
    ) => {
      if (event.nativeEvent.isComposing) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleSelectPoint(key, sample, index);
      }
    },
    [handleSelectPoint]
  );

  const merged = mergeProps({
    themeTarget: themeProps('live-telemetry-chart', {
      tone,
      paused: isPaused,
      empty: isEmpty,
      windowSize,
      warning: isCurrentWarning,
    }),
    baseClassName: 'prism-slab p-5 w-full space-y-4',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('live-telemetry-chart', 'header');
  const statsClass = stableClassName('live-telemetry-chart', 'stats');
  const canvasClass = stableClassName('live-telemetry-chart', 'canvas');
  const inspectorClass = stableClassName('live-telemetry-chart', 'inspector');

  return (
    <div ref={ref} {...rest} {...merged}>
      <div className={cx(headerClass, 'flex flex-wrap items-center justify-between gap-3')}>
        <div className="min-w-0 flex flex-wrap items-center gap-2.5">
          <span
            data-testid="telemetry-status-badge"
            data-status={isPaused ? 'paused' : 'live'}
            className="prism-well inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wider uppercase shrink-0"
            style={{
              color: isPaused
                ? 'var(--prism-warning-main)'
                : 'var(--prism-success-main)',
            }}
          >
            <span
              aria-hidden="true"
              className="w-2 h-2 rounded-full shrink-0"
              style={{
                backgroundColor: isPaused
                  ? 'var(--prism-warning-main)'
                  : 'var(--prism-success-main)',
              }}
            />
            <span>{isPaused ? 'PAUSED' : 'LIVE'}</span>
          </span>

          <h4
            id={headingId}
            className="text-sm font-semibold truncate"
            style={{ color: 'var(--prism-text-primary)' }}
          >
            {title}
          </h4>

          {bufferedCount > 0 ? (
            <span
              data-testid="telemetry-buffered-badge"
              className="prism-crystal rounded-full px-2 py-0.5 text-[11px] font-mono font-semibold tabular-nums shrink-0"
              style={{ color: 'var(--prism-warning-main)' }}
            >
              +{bufferedCount} buffered
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="Sample window size"
            data-testid="telemetry-window-group"
            className="prism-well inline-flex items-center gap-1 rounded-full p-0.5"
          >
            {WINDOW_SIZES.map((size) => {
              const active = windowSize === size;
              return (
                <button
                  key={`win-${size}`}
                  type="button"
                  aria-pressed={active}
                  data-testid={`telemetry-window-${size}`}
                  onClick={() => setWindowSize(size)}
                  className={cx(
                    'prism-focus-ring rounded-full px-2.5 py-1 text-xs font-mono tabular-nums cursor-pointer transition-all',
                    active ? 'prism-crystal font-semibold' : 'opacity-70 hover:opacity-100'
                  )}
                  style={{
                    color: active
                      ? 'var(--prism-text-primary)'
                      : 'var(--prism-text-secondary)',
                  }}
                >
                  {size}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            aria-pressed={isPaused}
            data-testid="telemetry-pause-toggle"
            onClick={handleTogglePaused}
            className={cx(
              'prism-focus-ring inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium cursor-pointer transition-all enabled:hover:brightness-105',
              isPaused ? 'prism-emerald font-semibold' : 'prism-crystal'
            )}
            style={
              isPaused
                ? { color: 'var(--prism-success-contrast)' }
                : { color: 'var(--prism-text-primary)' }
            }
          >
            {isPaused ? (
              <>
                <Play aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                <span>Resume</span>
              </>
            ) : (
              <>
                <Pause aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                <span>Pause</span>
              </>
            )}
          </button>

          {onGenerateSample ? (
            <button
              type="button"
              data-testid="telemetry-step-button"
              onClick={() => appendGeneratedSample(onGenerateSample)}
              className="prism-focus-ring prism-crystal inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium cursor-pointer transition-all enabled:hover:brightness-105"
              style={{ color: 'var(--prism-text-primary)' }}
            >
              <StepForward aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
              <span>Step</span>
            </button>
          ) : null}
        </div>
      </div>

      {readyView === null ? (
        <div
          data-testid="telemetry-empty"
          className="prism-well rounded-2xl px-4 py-8 text-center text-xs"
          style={{ color: 'var(--prism-text-secondary)' }}
        >
          No finite telemetry samples available.
        </div>
      ) : (
        <>
          <div
            data-testid="telemetry-stats"
            className={cx(statsClass, 'grid grid-cols-2 sm:grid-cols-4 gap-2.5')}
          >
            <div
              data-testid="telemetry-stat-current"
              data-warning={isCurrentWarning ? 'true' : undefined}
              className={cx(
                'prism-well rounded-xl px-3 py-2 flex flex-col gap-0.5',
                isCurrentWarning ? 'border' : undefined
              )}
              style={
                isCurrentWarning
                  ? { borderColor: 'var(--prism-error-main)' }
                  : undefined
              }
            >
              <span
                className="text-[10px] font-medium uppercase tracking-wider"
                style={{ color: 'var(--prism-text-secondary)' }}
              >
                Current
              </span>
              <span
                className="text-sm font-mono font-semibold tabular-nums"
                style={{
                  color: isCurrentWarning
                    ? 'var(--prism-error-main)'
                    : 'var(--prism-text-primary)',
                }}
              >
                {formatMetric(readyView.stats.current, unit)}
              </span>
            </div>

            <div
              data-testid="telemetry-stat-min"
              className="prism-well rounded-xl px-3 py-2 flex flex-col gap-0.5"
            >
              <span
                className="text-[10px] font-medium uppercase tracking-wider"
                style={{ color: 'var(--prism-text-secondary)' }}
              >
                Min
              </span>
              <span
                className="text-sm font-mono font-semibold tabular-nums"
                style={{ color: 'var(--prism-text-primary)' }}
              >
                {formatMetric(readyView.stats.min, unit)}
              </span>
            </div>

            <div
              data-testid="telemetry-stat-avg"
              className="prism-well rounded-xl px-3 py-2 flex flex-col gap-0.5"
            >
              <span
                className="text-[10px] font-medium uppercase tracking-wider"
                style={{ color: 'var(--prism-text-secondary)' }}
              >
                Avg
              </span>
              <span
                className="text-sm font-mono font-semibold tabular-nums"
                style={{ color: 'var(--prism-text-primary)' }}
              >
                {formatMetric(readyView.stats.avg, unit)}
              </span>
            </div>

            <div
              data-testid="telemetry-stat-max"
              className="prism-well rounded-xl px-3 py-2 flex flex-col gap-0.5"
            >
              <span
                className="text-[10px] font-medium uppercase tracking-wider"
                style={{ color: 'var(--prism-text-secondary)' }}
              >
                Max
              </span>
              <span
                className="text-sm font-mono font-semibold tabular-nums"
                style={{ color: 'var(--prism-text-primary)' }}
              >
                {formatMetric(readyView.stats.max, unit)}
              </span>
            </div>
          </div>

          <div className={cx(canvasClass, 'prism-well rounded-2xl p-3')}>
            <svg
              role="img"
              aria-labelledby={headingId}
              aria-label={`${title} live telemetry chart`}
              data-testid="telemetry-chart-svg"
              viewBox={`0 0 ${VIEW_WIDTH} ${safeHeight}`}
              className="w-full overflow-visible block"
              style={{ height: `${safeHeight}px` }}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={toneColor} stopOpacity={0.32} />
                  <stop offset="100%" stopColor={toneColor} stopOpacity={0.02} />
                </linearGradient>
              </defs>

              {readyView.gridTicks.map((tick) => (
                <g key={tick.key} data-testid="telemetry-gridline">
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

              {readyView.xAxisPoints.map((pt) => (
                <text
                  key={`x-${pt.key}`}
                  x={pt.x}
                  y={safeHeight - 8}
                  textAnchor="middle"
                  className="text-[10px] font-mono tabular-nums"
                  style={{ fill: 'var(--prism-text-secondary)' }}
                >
                  {pt.sample.timestamp}
                </text>
              ))}

              {readyView.warningY !== undefined && safeWarningThreshold !== undefined ? (
                <g data-testid="telemetry-warning-threshold">
                  <line
                    x1={PAD_LEFT}
                    y1={readyView.warningY}
                    x2={VIEW_WIDTH - PAD_RIGHT}
                    y2={readyView.warningY}
                    stroke="var(--prism-error-main)"
                    strokeWidth={1.5}
                    strokeDasharray="6 4"
                  />
                  <text
                    x={VIEW_WIDTH - PAD_RIGHT}
                    y={Math.max(PAD_TOP - 4, readyView.warningY - 5)}
                    textAnchor="end"
                    className="text-[10px] font-mono font-semibold tabular-nums"
                    style={{ fill: 'var(--prism-error-main)' }}
                  >
                    WARN {formatMetric(safeWarningThreshold, unit)}
                  </text>
                </g>
              ) : null}

              {readyView.areaPath ? (
                <path
                  data-testid="telemetry-area-path"
                  d={readyView.areaPath}
                  fill={`url(#${gradientId})`}
                />
              ) : null}

              <polyline
                data-testid="telemetry-polyline"
                points={readyView.polylinePoints}
                fill="none"
                stroke={toneColor}
                strokeWidth={2.25}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              <circle
                data-testid="telemetry-endpoint-glow"
                cx={readyView.latestPoint.x}
                cy={readyView.latestPoint.y}
                r={9}
                fill={
                  readyView.latestPoint.exceedsThreshold
                    ? 'var(--prism-error-main)'
                    : toneColor
                }
                fillOpacity={0.22}
                pointerEvents="none"
              />

              {readyView.plottedPoints.map((pt) => {
                const isSelected =
                  readyView.hasExplicitSelection &&
                  readyView.inspectedPoint.key === pt.key;
                const isEndpoint = pt.key === readyView.latestPoint.key;
                const pointColor = pt.exceedsThreshold
                  ? 'var(--prism-error-main)'
                  : toneColor;
                return (
                  <circle
                    key={pt.key}
                    role="button"
                    tabIndex={0}
                    aria-label={`${pt.sample.timestamp}: ${formatMetric(pt.value, unit)}${
                      pt.exceedsThreshold ? ' (warning threshold exceeded)' : ''
                    }`}
                    aria-pressed={isSelected}
                    data-testid={`telemetry-point-${pt.index}`}
                    data-warning={pt.exceedsThreshold ? 'true' : undefined}
                    cx={pt.x}
                    cy={pt.y}
                    r={isSelected ? 5.5 : isEndpoint ? 4.5 : 3.5}
                    fill={
                      pt.exceedsThreshold || isSelected || isEndpoint
                        ? pointColor
                        : 'var(--prism-primary-contrast)'
                    }
                    stroke={pointColor}
                    strokeWidth={isSelected ? 2.5 : 1.75}
                    className="prism-focus-ring cursor-pointer transition-all"
                    onClick={() => handleSelectPoint(pt.key, pt.sample, pt.index)}
                    onKeyDown={(event) =>
                      handlePointKeyDown(event, pt.key, pt.sample, pt.index)
                    }
                  />
                );
              })}
            </svg>
          </div>

          <div
            aria-live="polite"
            data-testid="telemetry-inspector"
            className={cx(
              inspectorClass,
              'prism-well rounded-xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs'
            )}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                aria-hidden="true"
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{
                  backgroundColor: readyView.inspectedPoint.exceedsThreshold
                    ? 'var(--prism-error-main)'
                    : toneColor,
                }}
              />
              <span
                className="font-semibold"
                style={{ color: 'var(--prism-text-primary)' }}
              >
                {readyView.hasExplicitSelection ? 'Selected sample' : 'Latest sample'}
              </span>
              {readyView.inspectedPoint.exceedsThreshold ? (
                <span
                  data-testid="telemetry-inspector-warning"
                  className="prism-crystal rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--prism-error-main)' }}
                >
                  Warning
                </span>
              ) : null}
            </div>

            <span
              data-testid="telemetry-inspector-readout"
              className="font-mono font-semibold tabular-nums"
              style={{
                color: readyView.inspectedPoint.exceedsThreshold
                  ? 'var(--prism-error-main)'
                  : 'var(--prism-text-primary)',
              }}
            >
              {readyView.inspectedPoint.sample.timestamp} ·{' '}
              {formatMetric(readyView.inspectedPoint.value, unit)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

LiveTelemetryChart.displayName = 'LiveTelemetryChart';
