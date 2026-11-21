'use client';

import { useId, useMemo, useState, type KeyboardEvent } from 'react';
import { TrendingUp } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { themeProps } from '../utils/themeProps';

export type ChartSeriesTone = 'primary' | 'secondary' | 'emerald' | 'amber' | 'rose';

export interface LineSeries {
  /** Stable identifier for the series (used for visibility toggles and selection callbacks). */
  id: string;
  /** Human-readable label shown in the legend pill and active readout bar. */
  label: string;
  /** Optional semantic optical tone mapped to --prism-* CSS custom properties. */
  tone?: ChartSeriesTone;
  /** Ordered numeric observations aligned to the chart `labels` array. */
  values: number[];
  /** Renders the series path with a dashed stroke pattern when true. */
  dashed?: boolean;
}

export interface LineMultiSeriesChartProps extends BaseProps<HTMLDivElement> {
  /** Ordered X-axis category or timestamp labels. */
  labels: string[];
  /** Multi-series line definitions plotted along the shared Y domain. */
  series: LineSeries[];
  /** Card heading linked to the chart SVG (defaults to 'Trend Series'). */
  title?: string;
  /** Renders monotone cubic-bezier curves when true, or crisp polylines when false (defaults to true). */
  smooth?: boolean;
  /** Displays interactive clickable/focusable data point markers when true (defaults to true). */
  showPoints?: boolean;
  /** Chart SVG height in pixels, clamped to [120, 520] (defaults to 220). */
  height?: number;
  /** Optional unit suffix appended to formatted readout and tooltip values (e.g. 'ms', 'req/s'). */
  valueUnit?: string;
  /** Callback fired when a data point circle is clicked or activated via keyboard. */
  onSelectPoint?: (seriesId: string, index: number, value: number) => void;
}

interface NormalizedLabel {
  key: string;
  label: string;
  index: number;
  x: number;
}

interface SeriesObservation {
  key: string;
  index: number;
  label: string;
  x: number;
  value: number;
}

interface NormalizedLineSeries {
  key: string;
  id: string;
  label: string;
  tone: ChartSeriesTone;
  colorToken: string;
  dashed: boolean;
  observations: SeriesObservation[];
}

interface PlottedPoint {
  key: string;
  index: number;
  label: string;
  value: number;
  x: number;
  y: number;
}

interface PlottedSeries {
  series: NormalizedLineSeries;
  points: PlottedPoint[];
  smoothPath: string;
  polylinePoints: string;
}

interface GridTick {
  key: string;
  y: number;
  label: string;
}

interface ActiveSelection {
  seriesId: string;
  index: number;
}

interface ResolvedActivePoint {
  series: NormalizedLineSeries;
  point: PlottedPoint;
}

const VIEW_WIDTH = 640;
const PAD_LEFT = 54;
const PAD_RIGHT = 20;
const PAD_TOP = 18;
const PAD_BOTTOM = 30;
const GRID_STEPS = 4;

function getDefaultTone(index: number): ChartSeriesTone {
  switch (index % 5) {
    case 0:
      return 'primary';
    case 1:
      return 'secondary';
    case 2:
      return 'emerald';
    case 3:
      return 'amber';
    default:
      return 'rose';
  }
}

function getToneToken(tone: ChartSeriesTone): string {
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

function sanitizeFinite(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function formatNumber(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  const safe = rounded === 0 ? 0 : rounded;
  return Number.isInteger(safe) ? String(safe) : safe.toFixed(1);
}

function formatValue(value: number, valueUnit?: string): string {
  const formatted = formatNumber(value);
  const unit = valueUnit?.trim();
  return unit ? `${formatted} ${unit}` : formatted;
}

function buildSmoothCubicPath(points: ReadonlyArray<PlottedPoint>): string {
  let prev: PlottedPoint | undefined;
  let d = '';
  for (const pt of points) {
    if (!prev) {
      d = `M ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`;
    } else {
      const midX = (prev.x + pt.x) / 2;
      d += ` C ${midX.toFixed(2)} ${prev.y.toFixed(2)}, ${midX.toFixed(2)} ${pt.y.toFixed(2)}, ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`;
    }
    prev = pt;
  }
  return d;
}

function computeYDomain(visibleSeries: ReadonlyArray<NormalizedLineSeries>): {
  min: number;
  max: number;
} {
  let rawMin = Number.POSITIVE_INFINITY;
  let rawMax = Number.NEGATIVE_INFINITY;

  for (const s of visibleSeries) {
    for (const obs of s.observations) {
      if (obs.value < rawMin) rawMin = obs.value;
      if (obs.value > rawMax) rawMax = obs.value;
    }
  }

  if (!Number.isFinite(rawMin) || !Number.isFinite(rawMax)) {
    return { min: 0, max: 1 };
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

export function LineMultiSeriesChart({
  labels,
  series,
  title = 'Trend Series',
  smooth = true,
  showPoints = true,
  height = 220,
  valueUnit,
  onSelectPoint,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: LineMultiSeriesChartProps) {
  const override = useComponentOverride('LineMultiSeriesChart');
  const headingId = useId();
  const [hiddenIds, setHiddenIds] = useState<ReadonlySet<string>>(() => new Set());
  const [selection, setSelection] = useState<ActiveSelection | null>(null);

  const safeHeight = Math.round(clampNumber(height, 120, 520, 220));
  const isEmpty = labels.length === 0 || series.length === 0;
  const plotWidth = VIEW_WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = safeHeight - PAD_TOP - PAD_BOTTOM;

  const normalizedLabels = useMemo<NormalizedLabel[]>(() => {
    const counts = new Map<string, number>();
    const count = labels.length;
    return labels.map((label, index) => {
      const seen = counts.get(label) ?? 0;
      counts.set(label, seen + 1);
      const key = seen === 0 ? `lbl:${label}` : `lbl:${label}#${seen + 1}`;
      const x =
        count <= 1
          ? PAD_LEFT + plotWidth / 2
          : PAD_LEFT + (index / (count - 1)) * plotWidth;
      return { key, label, index, x };
    });
  }, [labels, plotWidth]);

  const normalizedSeries = useMemo<NormalizedLineSeries[]>(() => {
    const counts = new Map<string, number>();
    return series.map((item, idx) => {
      const seen = counts.get(item.id) ?? 0;
      counts.set(item.id, seen + 1);
      const key = seen === 0 ? `ser:${item.id}` : `ser:${item.id}#${seen + 1}`;
      const tone = item.tone ?? getDefaultTone(idx);
      const observations: SeriesObservation[] = normalizedLabels.map((lbl) => ({
        key: `${key}::${lbl.key}`,
        index: lbl.index,
        label: lbl.label,
        x: lbl.x,
        value: sanitizeFinite(item.values[lbl.index]),
      }));
      return {
        key,
        id: item.id,
        label: item.label,
        tone,
        colorToken: getToneToken(tone),
        dashed: Boolean(item.dashed),
        observations,
      };
    });
  }, [series, normalizedLabels]);

  const visibleSeries = useMemo<NormalizedLineSeries[]>(
    () => normalizedSeries.filter((s) => !hiddenIds.has(s.id)),
    [normalizedSeries, hiddenIds]
  );

  const allHidden = !isEmpty && visibleSeries.length === 0;

  const domain = useMemo(() => computeYDomain(visibleSeries), [visibleSeries]);
  const span = domain.max - domain.min;

  const gridTicks = useMemo<GridTick[]>(() => {
    const ticks: GridTick[] = [];
    for (let step = 0; step < GRID_STEPS; step += 1) {
      const fraction = step / (GRID_STEPS - 1);
      const y = PAD_TOP + fraction * plotHeight;
      const tickVal = domain.max - fraction * span;
      ticks.push({
        key: `grid-${step}`,
        y,
        label: formatNumber(tickVal),
      });
    }
    return ticks;
  }, [domain.max, plotHeight, span]);

  const plottedSeries = useMemo<PlottedSeries[]>(() => {
    return visibleSeries.map((s) => {
      const points: PlottedPoint[] = s.observations.map((obs) => {
        const ratio = (obs.value - domain.min) / span;
        const y = PAD_TOP + plotHeight - ratio * plotHeight;
        return {
          key: obs.key,
          index: obs.index,
          label: obs.label,
          value: obs.value,
          x: obs.x,
          y,
        };
      });
      const smoothPath = buildSmoothCubicPath(points);
      const polylinePoints = points
        .map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`)
        .join(' ');
      return {
        series: s,
        points,
        smoothPath,
        polylinePoints,
      };
    });
  }, [visibleSeries, domain.min, span, plotHeight]);

  const resolvedActive = useMemo<ResolvedActivePoint | null>(() => {
    const matchedSeries = selection
      ? plottedSeries.find((ps) => ps.series.id === selection.seriesId)
      : undefined;
    const targetSeries = matchedSeries ?? plottedSeries[0];
    if (!targetSeries) return null;
    const targetIndex = matchedSeries
      ? Math.min(selection ? selection.index : 0, targetSeries.points.length - 1)
      : targetSeries.points.length - 1;
    let resolved: ResolvedActivePoint | null = null;
    for (const pt of targetSeries.points) {
      if (pt.index === targetIndex) {
        resolved = { series: targetSeries.series, point: pt };
      }
    }
    return resolved;
  }, [plottedSeries, selection]);

  const handleToggleSeries = (seriesId: string) => {
    setHiddenIds((prev) => {
      const next = new Set(prev);
      if (next.has(seriesId)) {
        next.delete(seriesId);
      } else {
        next.add(seriesId);
      }
      return next;
    });
  };

  const handleSelectPoint = (seriesId: string, index: number, value: number) => {
    setSelection({ seriesId, index });
    onSelectPoint?.(seriesId, index, value);
  };

  const handlePointKeyDown = (
    event: KeyboardEvent<SVGCircleElement>,
    seriesId: string,
    index: number,
    value: number
  ) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSelectPoint(seriesId, index, value);
    }
  };

  const merged = mergeProps({
    themeTarget: themeProps('line-multi-series-chart', {
      smooth,
      empty: isEmpty,
      allHidden,
    }),
    baseClassName: 'prism-slab p-5 w-full space-y-4',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('line-multi-series-chart', 'header');
  const legendClass = stableClassName('line-multi-series-chart', 'legend');
  const canvasClass = stableClassName('line-multi-series-chart', 'canvas');
  const readoutClass = stableClassName('line-multi-series-chart', 'readout');

  return (
    <div ref={ref} {...rest} {...merged}>
      <div className={cx(headerClass, 'flex flex-wrap items-center justify-between gap-3')}>
        <div className="min-w-0 flex items-center gap-2.5">
          <span
            className="prism-well w-8 h-8 rounded-full inline-flex items-center justify-center shrink-0"
            style={{ color: 'var(--prism-primary-main)' }}
          >
            <TrendingUp aria-hidden="true" className="w-4 h-4 shrink-0" />
          </span>
          <h4
            id={headingId}
            className="text-sm font-semibold truncate"
            style={{ color: 'var(--prism-text-primary)' }}
          >
            {title}
          </h4>
        </div>

        {!isEmpty ? (
          <div
            role="group"
            aria-label="Toggle chart series"
            data-testid="line-chart-legend"
            className={cx(legendClass, 'flex flex-wrap items-center gap-1.5')}
          >
            {normalizedSeries.map((s) => {
              const isVisible = !hiddenIds.has(s.id);
              return (
                <button
                  key={s.key}
                  type="button"
                  aria-pressed={isVisible}
                  data-testid={`line-legend-${s.id}`}
                  data-tone={s.tone}
                  onClick={() => handleToggleSeries(s.id)}
                  className={cx(
                    'prism-focus-ring inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium cursor-pointer transition-all enabled:hover:opacity-100',
                    isVisible ? 'prism-crystal' : 'prism-well opacity-55 line-through'
                  )}
                  style={{ color: 'var(--prism-text-primary)' }}
                >
                  <span
                    aria-hidden="true"
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{
                      backgroundColor: isVisible ? s.colorToken : 'var(--prism-text-disabled)',
                    }}
                  />
                  <span>{s.label}</span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {isEmpty ? (
        <div
          data-testid="line-chart-empty"
          className="prism-well rounded-2xl px-4 py-8 text-center text-xs"
          style={{ color: 'var(--prism-text-secondary)' }}
        >
          No trend series data available.
        </div>
      ) : (
        <>
          <div className={cx(canvasClass, 'prism-well rounded-2xl p-3')}>
            <svg
              role="img"
              aria-labelledby={headingId}
              aria-label={`${title} multi-series line chart`}
              data-testid="line-chart-svg"
              viewBox={`0 0 ${VIEW_WIDTH} ${safeHeight}`}
              className="w-full overflow-visible block"
              style={{ height: `${safeHeight}px` }}
            >
              {gridTicks.map((tick) => (
                <g key={tick.key} data-testid="line-chart-gridline">
                  <line
                    x1={PAD_LEFT}
                    y1={tick.y}
                    x2={VIEW_WIDTH - PAD_RIGHT}
                    y2={tick.y}
                    stroke="var(--prism-divider)"
                    strokeWidth="1"
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

              {normalizedLabels.map((lbl) => (
                <text
                  key={lbl.key}
                  x={lbl.x}
                  y={safeHeight - 8}
                  textAnchor="middle"
                  className="text-[10px] font-medium"
                  style={{ fill: 'var(--prism-text-secondary)' }}
                >
                  {lbl.label}
                </text>
              ))}

              {plottedSeries.map((ps) => {
                const isSelectedSeries =
                  resolvedActive?.series.id === ps.series.id;
                const strokeDasharray = ps.series.dashed ? '6 4' : undefined;
                return (
                  <g key={ps.series.key} data-series-id={ps.series.id}>
                    {smooth ? (
                      <path
                        data-testid={`line-series-path-${ps.series.id}`}
                        d={ps.smoothPath}
                        fill="none"
                        stroke={ps.series.colorToken}
                        strokeWidth={isSelectedSeries ? 2.75 : 2.25}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeDasharray={strokeDasharray}
                      />
                    ) : (
                      <polyline
                        data-testid={`line-series-polyline-${ps.series.id}`}
                        points={ps.polylinePoints}
                        fill="none"
                        stroke={ps.series.colorToken}
                        strokeWidth={isSelectedSeries ? 2.75 : 2.25}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeDasharray={strokeDasharray}
                      />
                    )}

                    {showPoints
                      ? ps.points.map((pt) => {
                          const isSelectedPoint =
                            isSelectedSeries &&
                            resolvedActive?.point.index === pt.index;
                          return (
                            <circle
                              key={pt.key}
                              role="button"
                              tabIndex={0}
                              aria-label={`${ps.series.label} at ${pt.label}: ${formatValue(pt.value, valueUnit)}`}
                              aria-pressed={isSelectedPoint}
                              data-testid={`line-point-${ps.series.id}-${pt.index}`}
                              cx={pt.x}
                              cy={pt.y}
                              r={isSelectedPoint ? 6 : 4}
                              fill={
                                isSelectedPoint
                                  ? ps.series.colorToken
                                  : 'var(--prism-primary-contrast)'
                              }
                              stroke={ps.series.colorToken}
                              strokeWidth={isSelectedPoint ? 2.5 : 2}
                              className="prism-focus-ring cursor-pointer transition-all"
                              onClick={() =>
                                handleSelectPoint(ps.series.id, pt.index, pt.value)
                              }
                              onKeyDown={(event) =>
                                handlePointKeyDown(
                                  event,
                                  ps.series.id,
                                  pt.index,
                                  pt.value
                                )
                              }
                            />
                          );
                        })
                      : null}
                  </g>
                );
              })}
            </svg>
          </div>

          <div
            aria-live="polite"
            data-testid="line-chart-readout"
            className={cx(
              readoutClass,
              'prism-well rounded-xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs'
            )}
          >
            {resolvedActive ? (
              <>
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    aria-hidden="true"
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: resolvedActive.series.colorToken }}
                  />
                  <span
                    className="font-semibold truncate"
                    style={{ color: 'var(--prism-text-primary)' }}
                  >
                    {resolvedActive.series.label}
                  </span>
                  <span style={{ color: 'var(--prism-text-secondary)' }}>
                    {resolvedActive.point.label}
                  </span>
                </div>
                <span
                  data-testid="line-chart-readout-value"
                  className="font-mono font-semibold tabular-nums"
                  style={{ color: 'var(--prism-text-primary)' }}
                >
                  {formatValue(resolvedActive.point.value, valueUnit)}
                </span>
              </>
            ) : (
              <span
                data-testid="line-chart-all-hidden"
                style={{ color: 'var(--prism-text-secondary)' }}
              >
                All series hidden — toggle a series pill above to display trends.
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

LineMultiSeriesChart.displayName = 'LineMultiSeriesChart';
