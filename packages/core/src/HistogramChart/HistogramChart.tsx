'use client';

import { memo, useId, useMemo, useState, type KeyboardEvent } from 'react';
import { BarChart3 } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { STYLE_BG_PRIMARY, STYLE_BG_SUCCESS, STYLE_FILL_SECONDARY, STYLE_PRIMARY_MAIN, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export interface ComputedHistogramBin {
  /** Zero-based bucket index from lowest to highest range. */
  index: number;
  /** Lower numeric bound of the bucket. */
  min: number;
  /** Upper numeric bound of the bucket. */
  max: number;
  /** Number of finite observations falling into this bucket. */
  count: number;
}

export interface HistogramChartProps extends BaseProps<HTMLDivElement> {
  /** Raw numeric sample observations (non-finite values are filtered out safely). */
  values: number[];
  /** Number of equal-width frequency buckets, clamped to [2, 24] (defaults to 8). */
  binCount?: number;
  /** Card heading linked to the SVG graphic (defaults to 'Frequency Histogram'). */
  title?: string;
  /** Optional unit suffix appended to summary stats, axis ticks, and bin readouts (e.g. 'ms', '%'). */
  valueUnit?: string;
  /** Displays vertical dashed Mean marker line when true (defaults to true). */
  showMean?: boolean;
  /** Displays vertical dashed Median marker line when true (defaults to true). */
  showMedian?: boolean;
  /** SVG viewport height in pixels, clamped to [140, 480] (defaults to 240). */
  height?: number;
  /** Callback fired when a histogram bar is clicked or activated with Enter/Space. */
  onSelectBin?: (bin: ComputedHistogramBin) => void;
}

interface PlottedBin {
  key: string;
  bin: ComputedHistogramBin;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface YGridTick {
  key: string;
  y: number;
  label: string;
}

interface XAxisTick {
  key: string;
  x: number;
  label: string;
}

const VIEW_WIDTH = 640;
const PAD_LEFT = 54;
const PAD_RIGHT = 22;
const PAD_TOP = 30;
const PAD_BOTTOM = 34;
const Y_GRID_STEPS = 4;

function normalizeZero(value: number): number {
  return value === 0 ? 0 : value;
}

function formatNumber(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return String(normalizeZero(rounded));
}

function formatValue(value: number, valueUnit?: string): string {
  const formatted = formatNumber(value);
  const unit = valueUnit?.trim();
  return unit ? `${formatted} ${unit}` : formatted;
}

/**
 * Pure helper that bins finite numeric values into `binCount` (clamped 2..24) equal-width buckets.
 * Safely handles empty arrays, non-finite observations, and identical/flat distributions without division by zero.
 */
export function computeHistogramBins(
  values: ReadonlyArray<number>,
  binCount: number
): ComputedHistogramBin[] {
  const safeBins = Math.round(clampNumber(binCount, 2, 24, 8));
  const finite: number[] = [];
  let minVal = Number.POSITIVE_INFINITY;
  let maxVal = Number.NEGATIVE_INFINITY;

  for (const val of values) {
    if (typeof val === 'number' && Number.isFinite(val)) {
      finite.push(val);
      if (val < minVal) minVal = val;
      if (val > maxVal) maxVal = val;
    }
  }

  if (finite.length === 0) {
    return [];
  }

  if (minVal === maxVal) {
    const halfSpan = minVal === 0 ? 1 : Math.abs(minVal) * 0.1;
    const start = minVal - halfSpan;
    const step = (halfSpan * 2) / safeBins;
    const centerIndex = Math.floor(safeBins / 2);
    const flatBins: ComputedHistogramBin[] = [];

    for (let i = 0; i < safeBins; i += 1) {
      flatBins.push({
        index: i,
        min: normalizeZero(start + i * step),
        max: normalizeZero(start + (i + 1) * step),
        count: i === centerIndex ? finite.length : 0,
      });
    }
    return flatBins;
  }

  const span = maxVal - minVal;
  const step = span / safeBins;
  const counts = new Array<number>(safeBins).fill(0);

  for (const val of finite) {
    const rawIdx = Math.floor((val - minVal) / step);
    const bucketIdx = Math.min(safeBins - 1, Math.max(0, rawIdx));
    counts[bucketIdx] = counts[bucketIdx]! + 1;
  }

  const bins: ComputedHistogramBin[] = [];
  for (let i = 0; i < safeBins; i += 1) {
    const binMin = i === 0 ? minVal : minVal + i * step;
    const binMax = i === safeBins - 1 ? maxVal : minVal + (i + 1) * step;
    bins.push({
      index: i,
      min: normalizeZero(binMin),
      max: normalizeZero(binMax),
      count: counts[i]!,
    });
  }

  return bins;
}

function HistogramChartInner({
  values,
  binCount = 8,
  title = 'Frequency Histogram',
  valueUnit,
  showMean = true,
  showMedian = true,
  height = 240,
  onSelectBin,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: HistogramChartProps) {
  const override = useComponentOverride('HistogramChart');
  const headingId = useId();
  const [selectedBinIndex, setSelectedBinIndex] = useState<number | null>(null);

  const safeHeight = Math.round(clampNumber(height, 140, 480, 240));
  const plotWidth = VIEW_WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = safeHeight - PAD_TOP - PAD_BOTTOM;

  const stats = useMemo(() => {
    const finite: number[] = [];
    let sum = 0;

    for (const val of values) {
      if (typeof val === 'number' && Number.isFinite(val)) {
        finite.push(val);
        sum += val;
      }
    }

    const n = finite.length;
    if (n === 0) {
      return {
        n: 0,
        mean: 0,
        median: 0,
        bins: [] as ComputedHistogramBin[],
        peakIndex: 0,
      };
    }

    const sorted = [...finite].sort((a, b) => a - b);
    const mid = Math.floor(n / 2);
    const median = n % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
    const mean = sum / n;
    const bins = computeHistogramBins(finite, binCount);

    let peakIndex = 0;
    let peakCount = -1;
    for (const bin of bins) {
      if (bin.count > peakCount) {
        peakCount = bin.count;
        peakIndex = bin.index;
      }
    }

    return { n, mean, median, bins, peakIndex };
  }, [values, binCount]);

  const isEmpty = stats.n === 0;

  const geometry = useMemo(() => {
    if (stats.bins.length === 0) {
      return {
        yTicks: [] as YGridTick[],
        xTicks: [] as XAxisTick[],
        bars: [] as PlottedBin[],
        meanX: PAD_LEFT,
        medianX: PAD_LEFT,
      };
    }

    let maxCount = 1;
    for (const bin of stats.bins) {
      if (bin.count > maxCount) maxCount = bin.count;
    }

    const yTicks: YGridTick[] = [];
    for (let step = 0; step < Y_GRID_STEPS; step += 1) {
      const fraction = step / (Y_GRID_STEPS - 1);
      const y = PAD_TOP + fraction * plotHeight;
      const tickCount = maxCount - fraction * maxCount;
      yTicks.push({
        key: `ygrid-${step}`,
        y,
        label: formatNumber(tickCount),
      });
    }

    const totalBins = stats.bins.length;
    const slotWidth = plotWidth / totalBins;
    const gap = Math.min(2, slotWidth * 0.08);
    const barWidth = Math.max(2, slotWidth - gap);
    const baselineY = PAD_TOP + plotHeight;

    const bars: PlottedBin[] = stats.bins.map((bin) => {
      const ratio = bin.count / maxCount;
      const rawBarHeight = ratio * plotHeight;
      const barHeight = bin.count === 0 ? 2 : Math.max(4, rawBarHeight);
      const x = PAD_LEFT + bin.index * slotWidth + gap / 2;
      const y = baselineY - barHeight;
      return {
        key: `bin-${bin.index}`,
        bin,
        x,
        y,
        width: barWidth,
        height: barHeight,
      };
    });

    const domainMin = stats.bins[0]!.min;
    const domainMax = stats.bins[totalBins - 1]!.max;
    const domainSpan = domainMax - domainMin;

    const stride = Math.max(1, Math.ceil(totalBins / 8));
    const xTicks: XAxisTick[] = [];
    for (let i = 0; i <= totalBins; i += 1) {
      const isEdge = i === 0 || i === totalBins;
      const isStride = i % stride === 0 && totalBins - i >= Math.ceil(stride / 2);
      if (!isEdge && !isStride) continue;
      const boundaryValue = i === totalBins ? domainMax : stats.bins[i]!.min;
      xTicks.push({
        key: `xtick-${i}`,
        x: PAD_LEFT + (i / totalBins) * plotWidth,
        label: formatNumber(boundaryValue),
      });
    }

    const meanX =
      PAD_LEFT + clampNumber((stats.mean - domainMin) / domainSpan, 0, 1, 0.5) * plotWidth;
    const medianX =
      PAD_LEFT + clampNumber((stats.median - domainMin) / domainSpan, 0, 1, 0.5) * plotWidth;

    return { yTicks, xTicks, bars, meanX, medianX };
  }, [stats, plotWidth, plotHeight]);

  const resolvedActiveBin = useMemo<ComputedHistogramBin | null>(() => {
    if (stats.bins.length === 0) return null;
    if (
      selectedBinIndex !== null &&
      selectedBinIndex >= 0 &&
      selectedBinIndex < stats.bins.length
    ) {
      return stats.bins[selectedBinIndex]!;
    }
    return stats.bins[stats.peakIndex]!;
  }, [stats.bins, stats.peakIndex, selectedBinIndex]);

  const handleSelectBin = (bin: ComputedHistogramBin) => {
    setSelectedBinIndex(bin.index);
    onSelectBin?.(bin);
  };

  const handleBinKeyDown = (
    event: KeyboardEvent<SVGRectElement>,
    bin: ComputedHistogramBin
  ) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSelectBin(bin);
    }
  };

  const merged = mergeProps({
    themeTarget: themeProps('histogram-chart', {
      empty: isEmpty,
      showMean,
      showMedian,
    }),
    baseClassName: 'prism-slab p-5 w-full space-y-4',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('histogram-chart', 'header');
  const statsClass = stableClassName('histogram-chart', 'stats');
  const canvasClass = stableClassName('histogram-chart', 'canvas');
  const readoutClass = stableClassName('histogram-chart', 'readout');
  const markersClose =
    showMean && showMedian && Math.abs(geometry.meanX - geometry.medianX) < 56;

  return (
    <div ref={ref} {...rest} {...merged}>
      <div className={cx(headerClass, 'flex flex-wrap items-center justify-between gap-3')}>
        <div className="min-w-0 flex items-center gap-2.5">
          <span
            className="prism-well w-8 h-8 rounded-full inline-flex items-center justify-center shrink-0"
            style={STYLE_PRIMARY_MAIN}
          >
            <BarChart3 aria-hidden="true" className="w-4 h-4 shrink-0" />
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
            data-testid="histogram-summary-pills"
            className={cx(statsClass, 'flex flex-wrap items-center gap-1.5')}
          >
            <span
              data-testid="histogram-stat-n"
              className="prism-crystal inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-mono tabular-nums"
              style={STYLE_TEXT_PRIMARY}
            >
              n = {stats.n}
            </span>
            <span
              data-testid="histogram-stat-mean"
              className="prism-crystal inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-mono tabular-nums"
              style={STYLE_TEXT_PRIMARY}
            >
              <span
                aria-hidden="true"
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: 'var(--prism-secondary-main)' }}
              />
              Mean: {formatValue(stats.mean, valueUnit)}
            </span>
            <span
              data-testid="histogram-stat-median"
              className="prism-crystal inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-mono tabular-nums"
              style={STYLE_TEXT_PRIMARY}
            >
              <span
                aria-hidden="true"
                className="w-2 h-2 rounded-full shrink-0"
                style={STYLE_BG_SUCCESS}
              />
              Median: {formatValue(stats.median, valueUnit)}
            </span>
          </div>
        ) : null}
      </div>

      {resolvedActiveBin === null ? (
        <div
          data-testid="histogram-empty"
          className="prism-well rounded-2xl px-4 py-8 text-center text-xs"
          style={STYLE_TEXT_SECONDARY}
        >
          No finite numeric values available.
        </div>
      ) : (
        <>
          <div className={cx(canvasClass, 'prism-well rounded-2xl p-3')}>
            <svg
              role="img"
              aria-labelledby={headingId}
              aria-label={`${title} frequency histogram`}
              data-testid="histogram-svg"
              viewBox={`0 0 ${VIEW_WIDTH} ${safeHeight}`}
              className="w-full overflow-visible block"
              style={{ height: `${safeHeight}px` }}
            >
              {geometry.yTicks.map((tick) => (
                <g key={tick.key} data-testid="histogram-gridline">
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

              {geometry.xTicks.map((tick) => (
                <text
                  key={tick.key}
                  data-testid="histogram-x-tick"
                  x={tick.x}
                  y={safeHeight - 10}
                  textAnchor="middle"
                  className="text-[10px] font-mono tabular-nums"
                  style={STYLE_FILL_SECONDARY}
                >
                  {tick.label}
                </text>
              ))}

              {geometry.bars.map((item) => {
                const isSelected = resolvedActiveBin.index === item.bin.index;
                const minText = formatValue(item.bin.min, valueUnit);
                const maxText = formatValue(item.bin.max, valueUnit);
                return (
                  <rect
                    key={item.key}
                    role="button"
                    tabIndex={0}
                    aria-label={`Range [${minText} – ${maxText}]: ${item.bin.count} samples`}
                    aria-pressed={isSelected}
                    data-testid={`histogram-bin-${item.bin.index}`}
                    x={item.x}
                    y={item.y}
                    width={item.width}
                    height={item.height}
                    rx={3}
                    fill="var(--prism-primary-main)"
                    fillOpacity={isSelected ? 0.94 : 0.72}
                    stroke={
                      isSelected
                        ? 'var(--prism-text-primary)'
                        : 'var(--prism-primary-main)'
                    }
                    strokeWidth={isSelected ? 1.75 : 1}
                    className="prism-focus-ring cursor-pointer transition-[color,background-color,border-color,opacity,transform]"
                    onClick={() => handleSelectBin(item.bin)}
                    onKeyDown={(event) => handleBinKeyDown(event, item.bin)}
                  />
                );
              })}

              {showMean ? (
                <g data-testid="histogram-mean-marker" pointerEvents="none">
                  <line
                    data-testid="histogram-mean-line"
                    x1={geometry.meanX}
                    y1={PAD_TOP}
                    x2={geometry.meanX}
                    y2={PAD_TOP + plotHeight}
                    stroke="var(--prism-secondary-main)"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                  />
                  <text
                    x={geometry.meanX}
                    y={markersClose ? PAD_TOP - 16 : PAD_TOP - 8}
                    textAnchor="middle"
                    className="text-[10px] font-semibold"
                    style={{ fill: 'var(--prism-secondary-main)' }}
                  >
                    Mean
                  </text>
                </g>
              ) : null}

              {showMedian ? (
                <g data-testid="histogram-median-marker" pointerEvents="none">
                  <line
                    data-testid="histogram-median-line"
                    x1={geometry.medianX}
                    y1={PAD_TOP}
                    x2={geometry.medianX}
                    y2={PAD_TOP + plotHeight}
                    stroke="var(--prism-success-main)"
                    strokeWidth={2}
                    strokeDasharray="4 3"
                  />
                  <text
                    x={geometry.medianX}
                    y={PAD_TOP - 5}
                    textAnchor="middle"
                    className="text-[10px] font-semibold"
                    style={{ fill: 'var(--prism-success-main)' }}
                  >
                    Median
                  </text>
                </g>
              ) : null}
            </svg>
          </div>

          <div
            aria-live="polite"
            data-testid="histogram-readout"
            className={cx(
              readoutClass,
              'prism-well rounded-xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs'
            )}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                aria-hidden="true"
                className="w-2.5 h-2.5 rounded-sm shrink-0"
                style={STYLE_BG_PRIMARY}
              />
              <span
                data-testid="histogram-readout-text"
                className="font-mono font-semibold tabular-nums truncate"
                style={STYLE_TEXT_PRIMARY}
              >
                Range [{formatValue(resolvedActiveBin.min, valueUnit)} –{' '}
                {formatValue(resolvedActiveBin.max, valueUnit)}]: {resolvedActiveBin.count}{' '}
                samples
              </span>
            </div>
            <span
              className="font-mono tabular-nums shrink-0"
              style={STYLE_TEXT_SECONDARY}
            >
              {formatNumber((resolvedActiveBin.count / stats.n) * 100)}% of total
            </span>
          </div>
        </>
      )}
    </div>
  );
}

export const HistogramChart = memo(HistogramChartInner);
HistogramChart.displayName = 'HistogramChart';
