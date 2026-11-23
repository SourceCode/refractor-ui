'use client';

import { useEffect, useId, useMemo, useState, type KeyboardEvent } from 'react';
import { Layers } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { STYLE_FILL_SECONDARY, STYLE_SECONDARY_MAIN, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export type AreaSeriesTone = 'primary' | 'secondary' | 'emerald' | 'amber' | 'rose';

export interface AreaSeries {
  /** Stable identifier for the series (used for visibility toggles and readout tracking). */
  id: string;
  /** Human-readable label shown in the legend pill and X-slice breakdown readout. */
  label: string;
  /** Optional semantic optical tone mapped to --prism-* CSS custom properties. */
  tone?: AreaSeriesTone;
  /** Ordered numeric observations aligned to the chart `labels` array (sanitized to >= 0). */
  values: number[];
}

export interface AreaStackedChartProps extends BaseProps<HTMLDivElement> {
  /** Ordered X-axis category or timestamp labels. */
  labels: string[];
  /** Multi-series area volume definitions. */
  series: AreaSeries[];
  /** Initializes the chart in cumulative 'Stacked' mode when true or independent 'Overlay' mode when false (defaults to true). */
  stacked?: boolean;
  /** Card heading linked to the chart SVG (defaults to 'Area Volume'). */
  title?: string;
  /** Chart SVG height in pixels, clamped to [120, 520] (defaults to 220). */
  height?: number;
  /** Optional unit suffix appended to formatted readout values (e.g. 'GB', 'req/s'). */
  valueUnit?: string;
  /** Callback fired when an X-axis slice button or chart marker is selected. */
  onSelectIndex?: (index: number) => void;
}

interface NormalizedLabel {
  key: string;
  label: string;
  index: number;
  x: number;
}

interface SeriesSliceValue {
  index: number;
  x: number;
  value: number;
}

interface NormalizedAreaSeries {
  key: string;
  id: string;
  label: string;
  tone: AreaSeriesTone;
  colorToken: string;
  slices: SeriesSliceValue[];
  activeValue: number;
}

interface BandSample {
  index: number;
  x: number;
  base: number;
  top: number;
}

interface Point2D {
  x: number;
  y: number;
}

interface PlottedAreaLayer {
  series: NormalizedAreaSeries;
  gradientId: string;
  strokePath: string;
  areaPath: string;
  activeMarker: Point2D;
}

interface GridTick {
  key: string;
  y: number;
  label: string;
}

const VIEW_WIDTH = 640;
const PAD_LEFT = 54;
const PAD_RIGHT = 20;
const PAD_TOP = 18;
const PAD_BOTTOM = 30;
const GRID_STEPS = 4;
const SOLO_HALF_WIDTH = 28;

function getDefaultTone(index: number): AreaSeriesTone {
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

function getToneToken(tone: AreaSeriesTone): string {
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

function sanitizeNonNegative(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
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

function buildCurveSegments(points: ReadonlyArray<Point2D>, startCmd: 'M' | 'L'): string {
  let prev: Point2D | undefined;
  let d = '';
  for (const pt of points) {
    if (!prev) {
      d = `${startCmd} ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`;
    } else {
      const midX = (prev.x + pt.x) / 2;
      d += ` C ${midX.toFixed(2)} ${prev.y.toFixed(2)}, ${midX.toFixed(2)} ${pt.y.toFixed(2)}, ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`;
    }
    prev = pt;
  }
  return d;
}

function buildAreaPaths(
  topPoints: ReadonlyArray<Point2D>,
  bottomPoints: ReadonlyArray<Point2D>
): { strokePath: string; areaPath: string } {
  if (topPoints.length === 1) {
    let strokePath = '';
    let areaPath = '';
    for (const top of topPoints) {
      for (const bot of bottomPoints) {
        const leftX = (top.x - SOLO_HALF_WIDTH).toFixed(2);
        const rightX = (top.x + SOLO_HALF_WIDTH).toFixed(2);
        const topY = top.y.toFixed(2);
        const botY = bot.y.toFixed(2);
        strokePath = `M ${leftX} ${topY} L ${rightX} ${topY}`;
        areaPath = `M ${leftX} ${topY} L ${rightX} ${topY} L ${rightX} ${botY} L ${leftX} ${botY} Z`;
      }
    }
    return { strokePath, areaPath };
  }
  const strokePath = buildCurveSegments(topPoints, 'M');
  const reversedBottom = [...bottomPoints].reverse();
  const bottomPath = buildCurveSegments(reversedBottom, 'L');
  return {
    strokePath,
    areaPath: `${strokePath} ${bottomPath} Z`,
  };
}

const headerClass = /*#__PURE__*/ stableClassName('area-stacked-chart', 'header');
const legendClass = /*#__PURE__*/ stableClassName('area-stacked-chart', 'legend');
const canvasClass = /*#__PURE__*/ stableClassName('area-stacked-chart', 'canvas');
const slicesClass = /*#__PURE__*/ stableClassName('area-stacked-chart', 'slices');
const readoutClass = /*#__PURE__*/ stableClassName('area-stacked-chart', 'readout');

function AreaStackedChartInner({
  labels,
  series,
  stacked = true,
  title = 'Area Volume',
  height = 220,
  valueUnit,
  onSelectIndex,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: AreaStackedChartProps) {
  const override = useComponentOverride('AreaStackedChart');
  const headingId = useId();
  const rawGradientPrefix = useId();
  const gradientPrefix = rawGradientPrefix.replace(/[^a-zA-Z0-9_-]/g, '');

  const [isStacked, setIsStacked] = useState<boolean>(stacked);
  const [hiddenIds, setHiddenIds] = useState<ReadonlySet<string>>(() => new Set());
  const [selectedIdx, setSelectedIdx] = useState<number>(0);

  useEffect(() => {
    setIsStacked(stacked);
  }, [stacked]);

  const safeHeight = Math.round(clampNumber(height, 120, 520, 220));
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

  const safeSelectedIdx =
    normalizedLabels.length > 0
      ? Math.min(selectedIdx, normalizedLabels.length - 1)
      : 0;

  const activeLabel = normalizedLabels[safeSelectedIdx];
  const isEmpty = !activeLabel || series.length === 0;

  const normalizedSeries = useMemo<NormalizedAreaSeries[]>(() => {
    const counts = new Map<string, number>();
    return series.map((item, idx) => {
      const seen = counts.get(item.id) ?? 0;
      counts.set(item.id, seen + 1);
      const key = seen === 0 ? `ser:${item.id}` : `ser:${item.id}#${seen + 1}`;
      const tone = item.tone ?? getDefaultTone(idx);
      const slices: SeriesSliceValue[] = normalizedLabels.map((lbl) => ({
        index: lbl.index,
        x: lbl.x,
        value: sanitizeNonNegative(item.values[lbl.index]),
      }));
      return {
        key,
        id: item.id,
        label: item.label,
        tone,
        colorToken: getToneToken(tone),
        slices,
        activeValue: sanitizeNonNegative(item.values[safeSelectedIdx]),
      };
    });
  }, [series, normalizedLabels, safeSelectedIdx]);

  const visibleSeries = useMemo<NormalizedAreaSeries[]>(
    () => normalizedSeries.filter((s) => !hiddenIds.has(s.id)),
    [normalizedSeries, hiddenIds]
  );

  const allHidden = !isEmpty && visibleSeries.length === 0;

  const { maxVal, layers } = useMemo<{
    maxVal: number;
    layers: PlottedAreaLayer[];
  }>(() => {
    if (isEmpty || visibleSeries.length === 0) {
      return { maxVal: 1, layers: [] };
    }

    const cumulative = new Map<number, number>();
    const computedBands: Array<{
      series: NormalizedAreaSeries;
      samples: BandSample[];
    }> = [];
    let peak = 0;

    for (const s of visibleSeries) {
      const samples: BandSample[] = [];
      for (const slice of s.slices) {
        const base = isStacked ? (cumulative.get(slice.index) ?? 0) : 0;
        const top = base + slice.value;
        if (isStacked) {
          cumulative.set(slice.index, top);
        }
        if (top > peak) {
          peak = top;
        }
        samples.push({ index: slice.index, x: slice.x, base, top });
      }
      computedBands.push({ series: s, samples });
    }

    const safeMax = peak > 0 ? peak : 1;
    const mapY = (val: number) => PAD_TOP + plotHeight - (val / safeMax) * plotHeight;

    const plotted: PlottedAreaLayer[] = computedBands.map((band, layerIdx) => {
      const topPoints: Point2D[] = [];
      const bottomPoints: Point2D[] = [];
      let activeMarker: Point2D = { x: activeLabel.x, y: mapY(0) };

      for (const sample of band.samples) {
        const topPt: Point2D = { x: sample.x, y: mapY(sample.top) };
        const bottomPt: Point2D = { x: sample.x, y: mapY(sample.base) };
        topPoints.push(topPt);
        bottomPoints.push(bottomPt);
        if (sample.index === safeSelectedIdx) {
          activeMarker = topPt;
        }
      }

      const { strokePath, areaPath } = buildAreaPaths(topPoints, bottomPoints);
      return {
        series: band.series,
        gradientId: `${gradientPrefix}-area-${layerIdx}`,
        strokePath,
        areaPath,
        activeMarker,
      };
    });

    return { maxVal: safeMax, layers: plotted };
  }, [
    isEmpty,
    activeLabel,
    visibleSeries,
    isStacked,
    plotHeight,
    gradientPrefix,
    safeSelectedIdx,
  ]);

  const gridTicks = useMemo<GridTick[]>(() => {
    const ticks: GridTick[] = [];
    for (let step = 0; step < GRID_STEPS; step += 1) {
      const fraction = step / (GRID_STEPS - 1);
      const y = PAD_TOP + fraction * plotHeight;
      const tickVal = maxVal * (1 - fraction);
      ticks.push({
        key: `grid-${step}`,
        y,
        label: formatNumber(tickVal),
      });
    }
    return ticks;
  }, [maxVal, plotHeight]);

  const activeSliceTotal = useMemo(
    () => visibleSeries.reduce((sum, s) => sum + s.activeValue, 0),
    [visibleSeries]
  );

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

  const handleSelectSlice = (index: number) => {
    setSelectedIdx(index);
    onSelectIndex?.(index);
  };

  const handleSliceKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number
  ) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'ArrowRight' && index < normalizedLabels.length - 1) {
      event.preventDefault();
      handleSelectSlice(index + 1);
    } else if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      handleSelectSlice(index - 1);
    }
  };

  const merged = mergeProps({
    themeTarget: themeProps('area-stacked-chart', {
      mode: isStacked ? 'stacked' : 'overlay',
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


  const sliceStepWidth =
    normalizedLabels.length > 1
      ? plotWidth / (normalizedLabels.length - 1)
      : plotWidth;

  return (
    <div ref={ref} {...rest} {...merged}>
      <div className={cx(headerClass, 'flex flex-wrap items-center justify-between gap-3')}>
        <div className="min-w-0 flex items-center gap-2.5">
          <span
            className="prism-well w-8 h-8 rounded-full inline-flex items-center justify-center shrink-0"
            style={STYLE_SECONDARY_MAIN}
          >
            <Layers aria-hidden="true" className="w-4 h-4 shrink-0" />
          </span>
          <h4
            id={headingId}
            className="text-sm font-semibold truncate"
            style={STYLE_TEXT_PRIMARY}
          >
            {title}
          </h4>
        </div>

        {!isEmpty ? (
          <div
            role="group"
            aria-label="Area stacking mode"
            data-testid="area-mode-toggle"
            className="prism-crystal p-1 rounded-full inline-flex gap-1"
          >
            <button
              type="button"
              aria-pressed={isStacked}
              onClick={() => setIsStacked(true)}
              className={cx(
                'prism-focus-ring px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-[color,background-color,border-color,opacity,transform] enabled:hover:opacity-100',
                isStacked ? 'prism-well font-semibold' : 'opacity-75'
              )}
              style={STYLE_TEXT_PRIMARY}
            >
              Stacked
            </button>
            <button
              type="button"
              aria-pressed={!isStacked}
              onClick={() => setIsStacked(false)}
              className={cx(
                'prism-focus-ring px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-[color,background-color,border-color,opacity,transform] enabled:hover:opacity-100',
                !isStacked ? 'prism-well font-semibold' : 'opacity-75'
              )}
              style={STYLE_TEXT_PRIMARY}
            >
              Overlay
            </button>
          </div>
        ) : null}
      </div>

      {isEmpty ? (
        <div
          data-testid="area-chart-empty"
          className="prism-well rounded-2xl px-4 py-8 text-center text-xs"
          style={STYLE_TEXT_SECONDARY}
        >
          No area volume data available.
        </div>
      ) : (
        <>
          <div
            role="group"
            aria-label="Toggle area series"
            data-testid="area-chart-legend"
            className={cx(legendClass, 'flex flex-wrap items-center gap-1.5')}
          >
            {normalizedSeries.map((s) => {
              const isVisible = !hiddenIds.has(s.id);
              return (
                <button
                  key={s.key}
                  type="button"
                  aria-pressed={isVisible}
                  data-testid={`area-legend-${s.id}`}
                  data-tone={s.tone}
                  onClick={() => handleToggleSeries(s.id)}
                  className={cx(
                    'prism-focus-ring inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium cursor-pointer transition-[color,background-color,border-color,opacity,transform] enabled:hover:opacity-100',
                    isVisible ? 'prism-crystal' : 'prism-well opacity-55 line-through'
                  )}
                  style={STYLE_TEXT_PRIMARY}
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

          <div className={cx(canvasClass, 'prism-well rounded-2xl p-3')}>
            <svg
              role="img"
              aria-labelledby={headingId}
              aria-label={`${title} ${isStacked ? 'stacked' : 'overlay'} area chart`}
              data-testid="area-chart-svg"
              viewBox={`0 0 ${VIEW_WIDTH} ${safeHeight}`}
              className="w-full overflow-visible block prism-contain-leaf"
              style={{ height: `${safeHeight}px` }}
            >
              <defs>
                {layers.map((layer) => (
                  <linearGradient
                    key={layer.gradientId}
                    id={layer.gradientId}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor={layer.series.colorToken}
                      stopOpacity={isStacked ? 0.52 : 0.36}
                    />
                    <stop
                      offset="100%"
                      stopColor={layer.series.colorToken}
                      stopOpacity={0.06}
                    />
                  </linearGradient>
                ))}
              </defs>

              {gridTicks.map((tick) => (
                <g key={tick.key} data-testid="area-chart-gridline">
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
                    style={STYLE_FILL_SECONDARY}
                  >
                    {tick.label}
                  </text>
                </g>
              ))}

              {layers.map((layer) => (
                <g key={layer.series.key} data-series-id={layer.series.id}>
                  <path
                    data-testid={`area-fill-${layer.series.id}`}
                    d={layer.areaPath}
                    fill={`url(#${layer.gradientId})`}
                  />
                  <path
                    data-testid={`area-stroke-${layer.series.id}`}
                    d={layer.strokePath}
                    fill="none"
                    stroke={layer.series.colorToken}
                    strokeWidth="2.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              ))}

              <line
                data-testid="area-active-cursor"
                x1={activeLabel.x}
                y1={PAD_TOP}
                x2={activeLabel.x}
                y2={PAD_TOP + plotHeight}
                stroke="var(--prism-focus-ring)"
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />

              {layers.map((layer) => (
                <circle
                  key={`marker-${layer.series.key}`}
                  data-testid={`area-marker-${layer.series.id}`}
                  cx={layer.activeMarker.x}
                  cy={layer.activeMarker.y}
                  r={4.5}
                  fill="var(--prism-primary-contrast)"
                  stroke={layer.series.colorToken}
                  strokeWidth="2.5"
                />
              ))}

              {normalizedLabels.map((lbl) => (
                <g key={lbl.key}>
                  <rect
                    aria-hidden="true"
                    data-testid={`area-svg-slice-${lbl.index}`}
                    x={Math.max(PAD_LEFT, lbl.x - sliceStepWidth / 2)}
                    y={PAD_TOP}
                    width={sliceStepWidth}
                    height={plotHeight}
                    fill="transparent"
                    className="cursor-pointer"
                    onClick={() => handleSelectSlice(lbl.index)}
                  />
                  <text
                    x={lbl.x}
                    y={safeHeight - 8}
                    textAnchor="middle"
                    className="text-[10px] font-medium"
                    style={{
                      fill:
                        lbl.index === safeSelectedIdx
                          ? 'var(--prism-text-primary)'
                          : 'var(--prism-text-secondary)',
                    }}
                  >
                    {lbl.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>

          <div
            role="group"
            aria-label="Inspect chart slice"
            data-testid="area-slice-selector"
            className={cx(slicesClass, 'flex flex-wrap items-center gap-1.5')}
          >
            {normalizedLabels.map((lbl) => {
              const isSelected = lbl.index === safeSelectedIdx;
              return (
                <button
                  key={lbl.key}
                  type="button"
                  aria-pressed={isSelected}
                  data-testid={`area-slice-btn-${lbl.index}`}
                  onClick={() => handleSelectSlice(lbl.index)}
                  onKeyDown={(event) => handleSliceKeyDown(event, lbl.index)}
                  className={cx(
                    'prism-focus-ring rounded-full px-2.5 py-1 text-[11px] font-medium cursor-pointer transition-[color,background-color,border-color,opacity,transform] enabled:hover:opacity-100',
                    isSelected ? 'prism-emerald font-semibold' : 'prism-crystal opacity-80'
                  )}
                  style={STYLE_TEXT_PRIMARY}
                >
                  {lbl.label}
                </button>
              );
            })}
          </div>

          <div
            aria-live="polite"
            data-testid="area-chart-readout"
            className={cx(readoutClass, 'prism-well rounded-xl px-3.5 py-2.5 space-y-2 text-xs')}
          >
            {allHidden ? (
              <span
                data-testid="area-chart-all-hidden"
                style={STYLE_TEXT_SECONDARY}
              >
                All series hidden — toggle a series pill above to inspect volume.
              </span>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span
                    data-testid="area-readout-label"
                    className="font-semibold"
                    style={STYLE_TEXT_PRIMARY}
                  >
                    {activeLabel.label}
                  </span>
                  <span
                    data-testid="area-readout-total"
                    className="font-mono font-semibold tabular-nums"
                    style={STYLE_TEXT_PRIMARY}
                  >
                    Total: {formatValue(activeSliceTotal, valueUnit)}
                  </span>
                </div>
                <ul
                  aria-label="Series slice breakdown"
                  data-testid="area-readout-breakdown"
                  className="flex flex-wrap items-center gap-2"
                >
                  {visibleSeries.map((s) => (
                    <li
                      key={s.key}
                      data-testid={`area-readout-item-${s.id}`}
                      className="prism-crystal inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px]"
                      style={STYLE_TEXT_PRIMARY}
                    >
                      <span
                        aria-hidden="true"
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: s.colorToken }}
                      />
                      <span>{s.label}</span>
                      <span
                        className="font-mono font-medium tabular-nums"
                        style={STYLE_TEXT_SECONDARY}
                      >
                        {formatValue(s.activeValue, valueUnit)}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export const AreaStackedChart = /*#__PURE__*/ memoWithDisplayName(AreaStackedChartInner, 'AreaStackedChart');
