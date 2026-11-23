'use client';

import {
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { Activity, Layers } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { STYLE_PRIMARY_MAIN, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export type ViolinTone = 'primary' | 'secondary' | 'emerald' | 'amber' | 'info';

export interface ViolinSeries {
  /** Stable unique identifier for this distribution group. */
  id: string;
  /** Human-readable X-axis and statistical inspector label. */
  label: string;
  /** Raw numeric observations (non-finite entries are safely ignored). */
  values: ReadonlyArray<number>;
  /** Semantic optical tone token used to tint the violin curve (cycles automatically if omitted). */
  tone?: ViolinTone;
}

export interface ViolinStatsSummary {
  /** Distribution group identifier. */
  id: string;
  /** Distribution group label. */
  label: string;
  /** Total number of finite numeric observations. */
  count: number;
  /** Minimum finite observation. */
  min: number;
  /** First quartile (25th percentile via linear interpolation). */
  q1: number;
  /** Median (50th percentile). */
  median: number;
  /** Third quartile (75th percentile via linear interpolation). */
  q3: number;
  /** Maximum finite observation. */
  max: number;
  /** Arithmetic mean across finite observations. */
  mean: number;
}

export interface ViolinKdeBin {
  /** Domain value sampled at this vertical bin. */
  value: number;
  /** Gaussian kernel density estimate evaluated at `value`. */
  density: number;
}

export interface ViolinKdeResult {
  /** Silverman bandwidth (or zero-variance fallback) used for the Gaussian kernel. */
  bandwidth: number;
  /** Vertical density samples across the series support (24 bins by default). */
  bins: ViolinKdeBin[];
  /** Maximum density across all computed bins. */
  maxDensity: number;
}

export interface ViolinPlotProps extends BaseProps<HTMLDivElement> {
  /** Experimental distribution groups rendered as mirrored Gaussian KDE violins. Defaults to 4 realistic groups (including a bimodal sample) when omitted. Pass `[]` for the empty status state. */
  series?: ReadonlyArray<ViolinSeries>;
  /** Unit suffix appended to Y-axis ticks and statistical summaries (defaults to `'ms'`). */
  unit?: string;
  /** Controls visibility of the embedded Tukey IQR box, min-max whisker hairline, and crystal median dot (defaults to `true`). */
  showBoxOverlay?: boolean;
  /** Heading displayed in the sculpted prism-slab header (defaults to `'Violin Distribution Plot'`). */
  title?: string;
  /** Callback fired with the focused series `ViolinStatsSummary` on click or keyboard activation/navigation. */
  onSelectSeries?: (summary: ViolinStatsSummary) => void;
}

interface PreparedSeriesItem {
  key: string;
  tone: ViolinTone;
  color: string;
  sortedValues: ReadonlyArray<number>;
  summary: ViolinStatsSummary;
}

interface PositionedViolin extends PreparedSeriesItem {
  kde: ViolinKdeResult;
  cx: number;
  hitX: number;
  hitWidth: number;
  pathD: string;
  boxX: number;
  boxY: number;
  boxWidth: number;
  boxHeight: number;
  yMin: number;
  yMax: number;
  yMedian: number;
}

interface AxisTick {
  key: string;
  y: number;
  label: string;
  isBaseline: boolean;
}

const SVG_WIDTH = 460;
const SVG_HEIGHT = 220;
const PAD_TOP = 16;
const PAD_RIGHT = 16;
const PAD_BOTTOM = 34;
const PAD_LEFT = 54;
const PLOT_WIDTH = SVG_WIDTH - PAD_LEFT - PAD_RIGHT;
const PLOT_HEIGHT = SVG_HEIGHT - PAD_TOP - PAD_BOTTOM;
const KDE_BIN_COUNT = 24;
const INV_SQRT_2PI = 1 / Math.sqrt(2 * Math.PI);
const TICK_FRACTIONS: ReadonlyArray<number> = [0, 0.25, 0.5, 0.75, 1];

const TONE_CYCLE: ReadonlyArray<ViolinTone> = [
  'primary',
  'secondary',
  'emerald',
  'amber',
  'info',
];

export const DEFAULT_VIOLIN_SERIES: ReadonlyArray<ViolinSeries> = [
  {
    id: 'baseline',
    label: 'Baseline',
    tone: 'primary',
    values: [
      34, 37, 39, 40, 41, 42, 42, 43, 43, 44, 44, 44,
      45, 45, 46, 46, 47, 48, 49, 50, 51, 53, 55, 58,
    ],
  },
  {
    id: 'bimodal-cache',
    label: 'Cache Split',
    tone: 'secondary',
    values: [
      18, 20, 22, 23, 24, 25, 25, 26, 27, 28, 30, 32,
      62, 65, 67, 69, 70, 71, 72, 73, 75, 76, 79, 82,
    ],
  },
  {
    id: 'optimized',
    label: 'Optimized',
    tone: 'emerald',
    values: [
      16, 19, 21, 22, 23, 24, 25, 25, 26, 27, 28, 29,
      30, 31, 32, 34, 35, 37, 39, 41, 44, 47, 51, 56,
    ],
  },
  {
    id: 'heavy-load',
    label: 'Heavy Load',
    tone: 'amber',
    values: [
      46, 50, 53, 56, 58, 60, 62, 64, 65, 67, 68, 70,
      71, 73, 74, 76, 78, 80, 82, 85, 87, 90, 93, 96,
    ],
  },
];

function resolveToneColor(tone: ViolinTone): string {
  switch (tone) {
    case 'secondary':
      return 'var(--prism-secondary-main)';
    case 'emerald':
      return 'var(--prism-success-main)';
    case 'amber':
      return 'var(--prism-warning-main)';
    case 'info':
      return 'var(--prism-info-main)';
    default:
      return 'var(--prism-primary-main)';
  }
}

function normalizeZero(value: number): number {
  return value === 0 ? 0 : value;
}

function roundCoord(value: number): number {
  return Number(value.toFixed(2));
}

function formatNumeric(value: number): string {
  return String(Number(normalizeZero(value).toFixed(2)));
}

function formatMetric(value: number, unit: string): string {
  const num = formatNumeric(value);
  const trimmedUnit = unit.trim();
  return trimmedUnit ? `${num}${trimmedUnit}` : num;
}

function quantileSorted(sorted: ReadonlyArray<number>, p: number): number {
  const n = sorted.length;
  if (n === 1) {
    return sorted[0]!;
  }
  const pos = (n - 1) * p;
  const lower = Math.floor(pos);
  const upper = Math.ceil(pos);
  const weight = pos - lower;
  return normalizeZero(sorted[lower]! + (sorted[upper]! - sorted[lower]!) * weight);
}

/**
 * Computes exact distribution summary statistics (count, min, Q1, median, Q3, max, mean)
 * over finite numeric observations. Returns `null` when no finite samples exist.
 */
export function computeViolinStats(
  series: Pick<ViolinSeries, 'id' | 'label' | 'values'>
): ViolinStatsSummary | null {
  const finite: number[] = [];
  let sum = 0;

  for (const raw of series.values) {
    if (Number.isFinite(raw)) {
      const safe = normalizeZero(raw);
      finite.push(safe);
      sum += safe;
    }
  }

  if (finite.length === 0) {
    return null;
  }

  finite.sort((a, b) => a - b);

  const count = finite.length;
  return {
    id: series.id,
    label: series.label,
    count,
    min: finite[0]!,
    q1: quantileSorted(finite, 0.25),
    median: quantileSorted(finite, 0.5),
    q3: quantileSorted(finite, 0.75),
    max: finite[count - 1]!,
    mean: normalizeZero(sum / count),
  };
}

/**
 * Computes exact Gaussian Kernel Density Estimation across `binCount` (default 24)
 * vertical bins using Silverman's rule-of-thumb bandwidth with a positive fallback
 * for zero-variance and single-observation series.
 */
export function computeGaussianKde(
  values: ReadonlyArray<number>,
  binCount = KDE_BIN_COUNT,
  fallbackSpan?: number
): ViolinKdeResult {
  const finite: number[] = [];
  let sum = 0;

  for (const raw of values) {
    if (Number.isFinite(raw)) {
      const safe = normalizeZero(raw);
      finite.push(safe);
      sum += safe;
    }
  }

  const safeBins = Math.round(clampNumber(binCount, 2, 128, KDE_BIN_COUNT));
  if (finite.length === 0) {
    return { bandwidth: 0, bins: [], maxDensity: 0 };
  }

  finite.sort((a, b) => a - b);
  const n = finite.length;
  const mean = sum / n;
  const minVal = finite[0]!;
  const maxVal = finite[n - 1]!;

  let varianceSum = 0;
  for (const val of finite) {
    const diff = val - mean;
    varianceSum += diff * diff;
  }
  const stdDev = n > 1 ? Math.sqrt(varianceSum / (n - 1)) : 0;
  const q1 = quantileSorted(finite, 0.25);
  const q3 = quantileSorted(finite, 0.75);
  const iqr = q3 - q1;

  const resolvedFallbackSpan =
    fallbackSpan !== undefined && Number.isFinite(fallbackSpan) && fallbackSpan > 0
      ? fallbackSpan
      : maxVal > minVal
        ? maxVal - minVal
        : Math.abs(mean) > 0
          ? Math.abs(mean) * 0.2
          : 2;

  const iqrScale = iqr > 0 ? iqr / 1.34 : stdDev;
  const scale = stdDev > 0 ? Math.min(stdDev, iqrScale) : 0;
  const bandwidth = Math.max(
    scale > 0 ? 0.9 * scale * n ** -0.2 : resolvedFallbackSpan * 0.05,
    1e-6
  );

  const supportMin = maxVal > minVal ? minVal : minVal - bandwidth * 2.5;
  const supportMax = maxVal > minVal ? maxVal : maxVal + bandwidth * 2.5;
  const span = supportMax - supportMin;
  const denom = n * bandwidth;

  const bins: ViolinKdeBin[] = [];
  let maxDensity = 0;

  for (let i = 0; i < safeBins; i += 1) {
    const value = normalizeZero(supportMin + (span * i) / (safeBins - 1));
    let kernelSum = 0;
    for (const sample of finite) {
      const z = (value - sample) / bandwidth;
      kernelSum += Math.exp(-0.5 * z * z);
    }
    const density = (INV_SQRT_2PI * kernelSum) / denom;
    if (density > maxDensity) {
      maxDensity = density;
    }
    bins.push({ value, density });
  }

  return { bandwidth, bins, maxDensity };
}

const headerClass = /*#__PURE__*/ stableClassName('violin-plot', 'header');
const canvasClass = /*#__PURE__*/ stableClassName('violin-plot', 'canvas');
const svgClass = /*#__PURE__*/ stableClassName('violin-plot', 'svg');
const inspectorClass = /*#__PURE__*/ stableClassName('violin-plot', 'inspector');
const emptyClass = /*#__PURE__*/ stableClassName('violin-plot', 'empty');

function ViolinPlotInner({
  series,
  unit = 'ms',
  showBoxOverlay = true,
  title = 'Violin Distribution Plot',
  onSelectSeries,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: ViolinPlotProps) {
  const headingId = useId();
  const gradientPrefix = useId();
  const override = useComponentOverride('ViolinPlot');
  const groupRefs = useRef<Map<string, SVGGElement>>(new Map());

  const [selectedSeriesKey, setSelectedSeriesKey] = useState<string | null>(null);
  const [boxOverlayState, setBoxOverlayState] = useState<{
    propValue: boolean;
    visible: boolean;
  }>({ propValue: showBoxOverlay, visible: showBoxOverlay });

  const isBoxOverlayVisible =
    boxOverlayState.propValue === showBoxOverlay ? boxOverlayState.visible : showBoxOverlay;

  const sourceSeries = series === undefined ? DEFAULT_VIOLIN_SERIES : series;

  const preparedSeries = useMemo<PreparedSeriesItem[]>(() => {
    const valid: PreparedSeriesItem[] = [];
    for (let sIdx = 0; sIdx < sourceSeries.length; sIdx += 1) {
      const entry = sourceSeries[sIdx]!;
      const finite: number[] = [];
      for (const raw of entry.values) {
        if (Number.isFinite(raw)) {
          finite.push(normalizeZero(raw));
        }
      }
      if (finite.length === 0) continue;
      finite.sort((a, b) => a - b);
      const summary = computeViolinStats({
        id: entry.id,
        label: entry.label,
        values: finite,
      })!;
      const resolvedTone = entry.tone ?? TONE_CYCLE[sIdx % TONE_CYCLE.length]!;
      valid.push({
        key: `violin-series-${entry.id}-${sIdx}`,
        tone: resolvedTone,
        color: resolveToneColor(resolvedTone),
        sortedValues: finite,
        summary,
      });
    }
    return valid;
  }, [sourceSeries]);

  const totalSampleCount = useMemo(
    () => preparedSeries.reduce((acc, item) => acc + item.summary.count, 0),
    [preparedSeries]
  );

  const isEmpty = preparedSeries.length === 0;

  const geometry = useMemo(() => {
    if (preparedSeries.length === 0) {
      return {
        ticks: [] as AxisTick[],
        glyphs: [] as PositionedViolin[],
      };
    }

    let rawMin = Number.POSITIVE_INFINITY;
    let rawMax = Number.NEGATIVE_INFINITY;
    for (const item of preparedSeries) {
      if (item.summary.min < rawMin) rawMin = item.summary.min;
      if (item.summary.max > rawMax) rawMax = item.summary.max;
    }

    const rawSpan = rawMax - rawMin;
    const fallbackSpan =
      rawSpan > 0 ? rawSpan : Math.abs(rawMin) > 0 ? Math.abs(rawMin) * 0.2 : 2;

    const computedKdes = preparedSeries.map((item) =>
      computeGaussianKde(item.sortedValues, KDE_BIN_COUNT, fallbackSpan)
    );

    let domainMin = Number.POSITIVE_INFINITY;
    let domainMax = Number.NEGATIVE_INFINITY;
    for (const kde of computedKdes) {
      const low = kde.bins[0]!.value;
      const high = kde.bins[kde.bins.length - 1]!.value;
      if (low < domainMin) domainMin = low;
      if (high > domainMax) domainMax = high;
    }
    const domainSpan = domainMax - domainMin;

    const valueToY = (value: number): number =>
      roundCoord(PAD_TOP + PLOT_HEIGHT * (1 - (value - domainMin) / domainSpan));

    const ticks: AxisTick[] = TICK_FRACTIONS.map((frac) => {
      const y = roundCoord(PAD_TOP + PLOT_HEIGHT * (1 - frac));
      const tickVal = normalizeZero(domainMin + domainSpan * frac);
      return {
        key: `vp-tick-${frac}`,
        y,
        label: formatMetric(tickVal, unit),
        isBaseline: frac === 0,
      };
    });

    const bandWidth = PLOT_WIDTH / preparedSeries.length;
    const maxHalfWidth = roundCoord(Math.min(34, Math.max(8, bandWidth * 0.36)));
    const iqrBoxWidth = roundCoord(Math.min(10, Math.max(5, maxHalfWidth * 0.28)));
    const hitWidth = roundCoord(
      Math.min(bandWidth - 4, Math.max(maxHalfWidth * 2 + 12, bandWidth * 0.78))
    );

    const glyphs: PositionedViolin[] = preparedSeries.map((item, idx) => {
      const kde = computedKdes[idx]!;
      const cxPos = roundCoord(PAD_LEFT + idx * bandWidth + bandWidth / 2);

      const topY = valueToY(kde.bins[kde.bins.length - 1]!.value);
      const bottomY = valueToY(kde.bins[0]!.value);
      const rightParts: string[] = [];
      const leftParts: string[] = [];

      for (let k = kde.bins.length - 1; k >= 0; k -= 1) {
        const bin = kde.bins[k]!;
        const y = valueToY(bin.value);
        const halfW = roundCoord((bin.density / kde.maxDensity) * maxHalfWidth);
        rightParts.push(`L ${roundCoord(cxPos + halfW)} ${y}`);
      }
      for (let k = 0; k < kde.bins.length; k += 1) {
        const bin = kde.bins[k]!;
        const y = valueToY(bin.value);
        const halfW = roundCoord((bin.density / kde.maxDensity) * maxHalfWidth);
        leftParts.push(`L ${roundCoord(cxPos - halfW)} ${y}`);
      }

      const pathD = `M ${cxPos} ${topY} ${rightParts.join(' ')} L ${cxPos} ${bottomY} ${leftParts.join(' ')} Z`;

      const yMin = valueToY(item.summary.min);
      const yQ1 = valueToY(item.summary.q1);
      const yMedian = valueToY(item.summary.median);
      const yQ3 = valueToY(item.summary.q3);
      const yMax = valueToY(item.summary.max);

      const rawBoxHeight = yQ1 - yQ3;
      const boxHeight = roundCoord(Math.max(2, rawBoxHeight));
      const boxY =
        rawBoxHeight >= 2
          ? yQ3
          : roundCoord(clampNumber(yMedian - 1, PAD_TOP, PAD_TOP + PLOT_HEIGHT - 2, PAD_TOP));

      return {
        ...item,
        kde,
        cx: cxPos,
        hitX: roundCoord(cxPos - hitWidth / 2),
        hitWidth,
        pathD,
        boxX: roundCoord(cxPos - iqrBoxWidth / 2),
        boxY,
        boxWidth: iqrBoxWidth,
        boxHeight,
        yMin,
        yMax,
        yMedian,
      };
    });

    return { ticks, glyphs };
  }, [preparedSeries, unit]);

  const activeGlyph = useMemo<PositionedViolin | null>(() => {
    if (geometry.glyphs.length === 0) return null;
    if (selectedSeriesKey !== null) {
      const match = geometry.glyphs.find((glyph) => glyph.key === selectedSeriesKey);
      if (match) return match;
    }
    return geometry.glyphs[0]!;
  }, [geometry.glyphs, selectedSeriesKey]);

  const handleToggleBoxOverlay = useCallback(() => {
    setBoxOverlayState({
      propValue: showBoxOverlay,
      visible: !isBoxOverlayVisible,
    });
  }, [isBoxOverlayVisible, showBoxOverlay]);

  const handleSelectSeries = useCallback(
    (glyph: PositionedViolin) => {
      setSelectedSeriesKey(glyph.key);
      onSelectSeries?.(glyph.summary);
    },
    [onSelectSeries]
  );

  const handleSeriesKeyDown = useCallback(
    (index: number, glyph: PositionedViolin) => (event: ReactKeyboardEvent<SVGGElement>) => {
      if (event.nativeEvent.isComposing) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleSelectSeries(glyph);
        return;
      }
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault();
        const count = geometry.glyphs.length;
        const delta = event.key === 'ArrowRight' ? 1 : -1;
        const nextIndex = (index + delta + count) % count;
        const nextGlyph = geometry.glyphs[nextIndex]!;
        handleSelectSeries(nextGlyph);
        groupRefs.current.get(nextGlyph.key)?.focus();
      }
    },
    [geometry.glyphs, handleSelectSeries]
  );

  const merged = mergeProps({
    themeTarget: themeProps('violin-plot', {
      empty: isEmpty,
      boxOverlay: isBoxOverlayVisible,
      seriesCount: preparedSeries.length,
    }),
    baseClassName: 'prism-slab p-4 sm:p-5 w-full max-w-full min-w-0 space-y-3.5',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });


  return (
    <div ref={ref} role="region" aria-labelledby={headingId} {...rest} {...merged}>
      <div className={cx(headerClass, 'flex flex-wrap items-center justify-between gap-2.5 min-w-0')}>
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            aria-hidden="true"
            className="prism-well w-8 h-8 rounded-full inline-flex items-center justify-center shrink-0"
            style={STYLE_PRIMARY_MAIN}
          >
            <Activity className="w-4 h-4 shrink-0" />
          </span>
          <h4
            id={headingId}
            data-testid="violin-title"
            className="text-sm font-semibold tracking-tight truncate"
            style={STYLE_TEXT_PRIMARY}
          >
            {title}
          </h4>
        </div>

        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span
            data-testid="violin-sample-count"
            className="prism-crystal inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-mono font-medium tabular-nums whitespace-nowrap"
            style={STYLE_TEXT_PRIMARY}
          >
            {`N = ${totalSampleCount}`}
          </span>

          <button
            type="button"
            disabled={isEmpty}
            aria-pressed={isBoxOverlayVisible}
            data-testid="violin-box-overlay-toggle"
            onClick={handleToggleBoxOverlay}
            className={cx(
              'prism-focus-ring h-7 px-2.5 rounded-full inline-flex items-center gap-1.5 text-[11px] font-semibold whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-[color,background-color,border-color,opacity,transform]',
              isBoxOverlayVisible ? 'prism-btn-primary' : 'prism-btn-secondary'
            )}
          >
            <Layers aria-hidden="true" className="w-3 h-3 shrink-0" />
            <span className="relative z-10">Box Overlay</span>
          </button>
        </div>
      </div>

      {activeGlyph === null ? (
        <div
          role="status"
          data-testid="violin-empty"
          className={cx(
            emptyClass,
            'prism-well rounded-2xl px-4 py-8 text-center space-y-1 min-w-0'
          )}
        >
          <p className="text-sm font-semibold" style={STYLE_TEXT_PRIMARY}>
            No distribution data available
          </p>
          <p className="text-xs" style={STYLE_TEXT_SECONDARY}>
            Provide one or more series with finite numeric samples to render KDE violin curves.
          </p>
        </div>
      ) : (
        <>
          <div className={cx(canvasClass, 'prism-well rounded-2xl p-3 min-w-0 max-w-full')}>
            <svg
              role="img"
              aria-label={`${title} Gaussian KDE violin plot across ${geometry.glyphs.length} groups`}
              data-testid="violin-svg"
              viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
              className={cx(svgClass, 'w-full h-auto select-none block overflow-visible', 'prism-contain-leaf')}
            >
              <defs>
                {TONE_CYCLE.map((tone) => {
                  const toneColor = resolveToneColor(tone);
                  return (
                    <linearGradient
                      key={tone}
                      id={`${gradientPrefix}-${tone}`}
                      x1="0"
                      y1="0"
                      x2="1"
                      y2="0"
                    >
                      <stop offset="0%" stopColor={toneColor} stopOpacity={0.56} />
                      <stop offset="50%" stopColor={toneColor} stopOpacity={0.2} />
                      <stop offset="100%" stopColor={toneColor} stopOpacity={0.56} />
                    </linearGradient>
                  );
                })}
              </defs>

              {geometry.ticks.map((tick) => (
                <g key={tick.key} aria-hidden="true">
                  <line
                    x1={PAD_LEFT}
                    y1={tick.y}
                    x2={SVG_WIDTH - PAD_RIGHT}
                    y2={tick.y}
                    stroke="var(--prism-divider)"
                    strokeWidth={tick.isBaseline ? 1.25 : 1}
                    strokeDasharray={tick.isBaseline ? undefined : '3 3'}
                  />
                  <text
                    x={PAD_LEFT - 8}
                    y={tick.y + 3}
                    textAnchor="end"
                    fontSize={9.5}
                    fill="var(--prism-text-secondary)"
                    className="font-mono tabular-nums"
                  >
                    {tick.label}
                  </text>
                </g>
              ))}

              {geometry.glyphs.map((glyph, idx) => {
                const isSelected = activeGlyph.key === glyph.key;
                return (
                  <g
                    key={glyph.key}
                    ref={(node) => {
                      if (node) {
                        groupRefs.current.set(glyph.key, node);
                      } else {
                        groupRefs.current.delete(glyph.key);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                    aria-label={`${glyph.summary.label}: N ${glyph.summary.count}, min ${formatMetric(glyph.summary.min, unit)}, Q1 ${formatMetric(glyph.summary.q1, unit)}, median ${formatMetric(glyph.summary.median, unit)}, Q3 ${formatMetric(glyph.summary.q3, unit)}, max ${formatMetric(glyph.summary.max, unit)}, mean ${formatMetric(glyph.summary.mean, unit)}`}
                    data-testid={`violin-series-${glyph.summary.id}`}
                    data-series-id={glyph.summary.id}
                    data-tone={glyph.tone}
                    data-selected={isSelected ? 'true' : 'false'}
                    data-kde-bins={String(glyph.kde.bins.length)}
                    className="prism-focus-ring cursor-pointer"
                    onClick={() => handleSelectSeries(glyph)}
                    onKeyDown={handleSeriesKeyDown(idx, glyph)}
                  >
                    <rect
                      x={glyph.hitX}
                      y={PAD_TOP}
                      width={glyph.hitWidth}
                      height={PLOT_HEIGHT}
                      rx={8}
                      fill={glyph.color}
                      fillOpacity={isSelected ? 0.1 : 0}
                    />

                    <line
                      aria-hidden="true"
                      x1={glyph.cx}
                      y1={PAD_TOP}
                      x2={glyph.cx}
                      y2={PAD_TOP + PLOT_HEIGHT}
                      stroke="var(--prism-divider)"
                      strokeWidth={1}
                      strokeDasharray="2 3"
                    />

                    <path
                      data-role="violin-density-path"
                      d={glyph.pathD}
                      fill={`url(#${gradientPrefix}-${glyph.tone})`}
                      fillOpacity={isSelected ? 1 : 0.65}
                      stroke={isSelected ? 'var(--prism-text-primary)' : glyph.color}
                      strokeWidth={isSelected ? 1.85 : 1.3}
                      strokeOpacity={isSelected ? 0.95 : 0.8}
                      strokeLinejoin="round"
                    />

                    {isBoxOverlayVisible ? (
                      <g data-role="violin-box-overlay" pointerEvents="none">
                        <line
                          data-role="violin-whisker"
                          x1={glyph.cx}
                          y1={glyph.yMax}
                          x2={glyph.cx}
                          y2={glyph.yMin}
                          stroke={isSelected ? 'var(--prism-text-primary)' : glyph.color}
                          strokeWidth={1.5}
                          strokeLinecap="round"
                          strokeOpacity={0.9}
                        />
                        <rect
                          data-role="violin-iqr-box"
                          x={glyph.boxX}
                          y={glyph.boxY}
                          width={glyph.boxWidth}
                          height={glyph.boxHeight}
                          rx={3}
                          fill={glyph.color}
                          fillOpacity={isSelected ? 0.9 : 0.75}
                          stroke={isSelected ? 'var(--prism-text-primary)' : glyph.color}
                          strokeWidth={1.25}
                        />
                        <circle
                          data-role="violin-median-dot"
                          cx={glyph.cx}
                          cy={glyph.yMedian}
                          r={3.25}
                          fill="var(--prism-primary-contrast)"
                          stroke={isSelected ? 'var(--prism-text-primary)' : glyph.color}
                          strokeWidth={1.75}
                        />
                      </g>
                    ) : null}

                    <text
                      x={glyph.cx}
                      y={PAD_TOP + PLOT_HEIGHT + 20}
                      textAnchor="middle"
                      fontSize={10.5}
                      fill={
                        isSelected ? 'var(--prism-text-primary)' : 'var(--prism-text-secondary)'
                      }
                      className={isSelected ? 'font-semibold' : 'font-medium'}
                    >
                      {glyph.summary.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div
            aria-live="polite"
            data-testid="violin-inspector"
            className={cx(
              inspectorClass,
              'prism-well rounded-xl px-3.5 py-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs tabular-nums min-w-0'
            )}
            style={STYLE_TEXT_PRIMARY}
          >
            <span className="inline-flex items-center gap-2 font-semibold min-w-0">
              <span
                aria-hidden="true"
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: activeGlyph.color }}
              />
              <span className="truncate">{activeGlyph.summary.label}</span>
            </span>
            <span aria-hidden="true" style={STYLE_TEXT_SECONDARY}>
              {' · '}
            </span>
            <span className="font-mono text-[11px] min-w-0">
              {`N ${activeGlyph.summary.count} · Min ${formatMetric(activeGlyph.summary.min, unit)} · Q1 ${formatMetric(activeGlyph.summary.q1, unit)} · Median ${formatMetric(activeGlyph.summary.median, unit)} · Q3 ${formatMetric(activeGlyph.summary.q3, unit)} · Max ${formatMetric(activeGlyph.summary.max, unit)} · Mean ${formatMetric(activeGlyph.summary.mean, unit)}`}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

export const ViolinPlot = /*#__PURE__*/ memoWithDisplayName(ViolinPlotInner, 'ViolinPlot');
