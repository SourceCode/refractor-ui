'use client';

import {
  useCallback,
  useId,
  useMemo,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { themeProps } from '../utils/themeProps';

export type BoxWhiskerTone = 'primary' | 'secondary' | 'emerald' | 'amber' | 'rose';

export interface BoxWhiskerSeries {
  /** Stable unique identifier for this distribution series. */
  id: string;
  /** Human-readable X-axis and inspector label for the series. */
  label: string;
  /** Raw numeric observations (non-finite entries are safely ignored). */
  values: number[];
  /** Semantic optical tone token used to tint the glyph (cycles automatically when omitted). */
  tone?: BoxWhiskerTone;
}

export interface BoxWhiskerStats {
  /** Minimum finite observation across the series. */
  min: number;
  /** First quartile (25th percentile via linear interpolation). */
  q1: number;
  /** Median (50th percentile). */
  median: number;
  /** Third quartile (75th percentile via linear interpolation). */
  q3: number;
  /** Maximum finite observation across the series. */
  max: number;
  /** Lowest non-outlier observation within [Q1 - 1.5*IQR, Q3 + 1.5*IQR]. */
  whiskerLow: number;
  /** Highest non-outlier observation within [Q1 - 1.5*IQR, Q3 + 1.5*IQR]. */
  whiskerHigh: number;
  /** Sorted observations lying strictly outside the Tukey 1.5*IQR fences. */
  outliers: number[];
}

export interface BoxWhiskerPlotProps extends BaseProps<HTMLDivElement> {
  /** Distribution series plotted as vertical optical box-and-whisker glyphs. */
  series: BoxWhiskerSeries[];
  /** Chart card heading (defaults to 'Distribution Spread'). */
  title?: string;
  /** Optional unit suffix appended to Y-axis ticks and five-number summaries (e.g. 'ms', '%'). */
  valueUnit?: string;
  /** SVG chart viewport height in pixels (defaults to 240, clamped to 160..480). */
  height?: number;
  /** Callback fired when a user clicks or activates any series glyph via keyboard. */
  onSelectSeries?: (series: BoxWhiskerSeries, stats: BoxWhiskerStats) => void;
}

interface PreparedSeriesItem {
  id: string;
  key: string;
  label: string;
  tone: BoxWhiskerTone;
  color: string;
  stats: BoxWhiskerStats;
  original: BoxWhiskerSeries;
}

interface OutlierMarker {
  key: string;
  value: number;
  cy: number;
}

interface PositionedGlyph extends PreparedSeriesItem {
  cx: number;
  boxX: number;
  boxY: number;
  boxWidth: number;
  boxHeight: number;
  hitX: number;
  hitWidth: number;
  capHalfWidth: number;
  yWhiskerHigh: number;
  yWhiskerLow: number;
  yMedian: number;
  outliers: OutlierMarker[];
}

interface AxisTick {
  key: string;
  y: number;
  label: string;
  isBaseline: boolean;
}

const SVG_WIDTH = 580;
const PAD_TOP = 18;
const PAD_RIGHT = 20;
const PAD_BOTTOM = 36;
const PAD_LEFT = 58;
const TICK_FRACTIONS: ReadonlyArray<number> = [0, 0.25, 0.5, 0.75, 1];

const TONE_TOKEN_MAP: Record<BoxWhiskerTone, string> = {
  primary: 'var(--prism-primary-main)',
  secondary: 'var(--prism-secondary-main)',
  emerald: 'var(--prism-success-main)',
  amber: 'var(--prism-warning-main)',
  rose: 'var(--prism-error-main)',
};

const TONE_CYCLE: ReadonlyArray<BoxWhiskerTone> = [
  'primary',
  'secondary',
  'emerald',
  'amber',
  'rose',
];

function normalizeZero(value: number): number {
  return value === 0 ? 0 : value;
}

function roundCoord(value: number): number {
  return Number(value.toFixed(2));
}

function formatNumeric(value: number): string {
  const safe = normalizeZero(value);
  if (Number.isInteger(safe)) {
    return String(safe);
  }
  return String(Number(safe.toFixed(2)));
}

function formatMetric(value: number, unit?: string): string {
  const num = formatNumeric(value);
  return unit ? `${num}${unit}` : num;
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
  const lowVal = sorted[lower]!;
  const highVal = sorted[upper]!;
  return normalizeZero(lowVal + (highVal - lowVal) * weight);
}

/**
 * Computes Tukey five-number summary, 1.5*IQR whisker bounds, and outliers for finite observations.
 * Returns `null` when no finite numeric observations exist.
 */
export function computeBoxStats(values: ReadonlyArray<number>): BoxWhiskerStats | null {
  const finite: number[] = [];
  for (const raw of values) {
    if (Number.isFinite(raw)) {
      finite.push(normalizeZero(raw));
    }
  }
  if (finite.length === 0) {
    return null;
  }

  finite.sort((a, b) => a - b);

  const min = finite[0]!;
  const max = finite[finite.length - 1]!;
  const q1 = quantileSorted(finite, 0.25);
  const median = quantileSorted(finite, 0.5);
  const q3 = quantileSorted(finite, 0.75);
  const iqr = q3 - q1;
  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;

  let whiskerLow = median;
  let whiskerHigh = median;
  let foundInFence = false;
  const outliers: number[] = [];

  for (const val of finite) {
    if (val < lowerFence || val > upperFence) {
      outliers.push(val);
    } else {
      if (!foundInFence) {
        whiskerLow = val;
        foundInFence = true;
      }
      whiskerHigh = val;
    }
  }

  return {
    min,
    q1,
    median,
    q3,
    max,
    whiskerLow,
    whiskerHigh,
    outliers,
  };
}

export function BoxWhiskerPlot({
  series,
  title = 'Distribution Spread',
  valueUnit,
  height = 240,
  onSelectSeries,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: BoxWhiskerPlotProps) {
  const headingId = useId();
  const override = useComponentOverride('BoxWhiskerPlot');
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null);

  const clampedHeight = clampNumber(height, 160, 480, 240);

  const preparedSeries = useMemo<PreparedSeriesItem[]>(() => {
    const valid: PreparedSeriesItem[] = [];
    for (let sIdx = 0; sIdx < series.length; sIdx += 1) {
      const entry = series[sIdx]!;
      const stats = computeBoxStats(entry.values);
      if (!stats) continue;
      const resolvedTone = entry.tone ?? (TONE_CYCLE[sIdx % TONE_CYCLE.length] as BoxWhiskerTone);
      valid.push({
        id: entry.id,
        key: `box-series-${entry.id}-${sIdx}`,
        label: entry.label,
        tone: resolvedTone,
        color: TONE_TOKEN_MAP[resolvedTone],
        stats,
        original: entry,
      });
    }
    return valid;
  }, [series]);

  const isEmpty = preparedSeries.length === 0;

  const geometry = useMemo(() => {
    const plotWidth = SVG_WIDTH - PAD_LEFT - PAD_RIGHT;
    const plotHeight = clampedHeight - PAD_TOP - PAD_BOTTOM;

    if (preparedSeries.length === 0) {
      return {
        plotWidth,
        plotHeight,
        ticks: [] as AxisTick[],
        glyphs: [] as PositionedGlyph[],
      };
    }

    let rawMin = Number.POSITIVE_INFINITY;
    let rawMax = Number.NEGATIVE_INFINITY;
    for (const item of preparedSeries) {
      if (item.stats.min < rawMin) rawMin = item.stats.min;
      if (item.stats.max > rawMax) rawMax = item.stats.max;
    }

    let domainMin = rawMin;
    let domainMax = rawMax;
    if (domainMin === domainMax) {
      const pad = domainMin === 0 ? 1 : Math.abs(domainMin) * 0.1;
      domainMin -= pad;
      domainMax += pad;
    }
    const domainSpan = domainMax - domainMin;

    const valueToY = (value: number): number =>
      roundCoord(PAD_TOP + plotHeight * (1 - (value - domainMin) / domainSpan));

    const ticks: AxisTick[] = TICK_FRACTIONS.map((frac) => {
      const y = roundCoord(PAD_TOP + plotHeight * (1 - frac));
      const tickVal = normalizeZero(domainMin + domainSpan * frac);
      return {
        key: `bw-tick-${frac}`,
        y,
        label: formatMetric(tickVal, valueUnit),
        isBaseline: frac === 0,
      };
    });

    const bandWidth = plotWidth / preparedSeries.length;
    const boxWidth = roundCoord(Math.min(54, Math.max(16, bandWidth * 0.42)));
    const capHalfWidth = roundCoord(Math.max(5, (boxWidth * 0.56) / 2));
    const hitWidth = roundCoord(Math.min(bandWidth - 4, Math.max(boxWidth + 16, bandWidth * 0.72)));

    const glyphs: PositionedGlyph[] = preparedSeries.map((item, idx) => {
      const cxPos = roundCoord(PAD_LEFT + idx * bandWidth + bandWidth / 2);
      const yWhiskerHigh = valueToY(item.stats.whiskerHigh);
      const yWhiskerLow = valueToY(item.stats.whiskerLow);
      const yQ3 = valueToY(item.stats.q3);
      const yQ1 = valueToY(item.stats.q1);
      const yMedian = valueToY(item.stats.median);
      const rawBoxHeight = yQ1 - yQ3;
      const boxHeight = roundCoord(Math.max(2, rawBoxHeight));
      const boxY =
        rawBoxHeight >= 2
          ? yQ3
          : roundCoord(
              clampNumber(yMedian - 1, PAD_TOP, PAD_TOP + plotHeight - 2, PAD_TOP)
            );

      const outliers: OutlierMarker[] = item.stats.outliers.map((val, oIdx) => ({
        key: `${item.key}-outlier-${oIdx}-${val}`,
        value: val,
        cy: valueToY(val),
      }));

      return {
        ...item,
        cx: cxPos,
        boxX: roundCoord(cxPos - boxWidth / 2),
        boxY,
        boxWidth,
        boxHeight,
        hitX: roundCoord(cxPos - hitWidth / 2),
        hitWidth,
        capHalfWidth,
        yWhiskerHigh,
        yWhiskerLow,
        yMedian,
        outliers,
      };
    });

    return {
      plotWidth,
      plotHeight,
      ticks,
      glyphs,
    };
  }, [preparedSeries, clampedHeight, valueUnit]);

  const activeSeries = useMemo(() => {
    if (selectedSeriesId === null) return null;
    return preparedSeries.find((item) => item.id === selectedSeriesId) ?? null;
  }, [preparedSeries, selectedSeriesId]);

  const handleSelectSeries = useCallback(
    (item: PreparedSeriesItem) => {
      setSelectedSeriesId(item.id);
      onSelectSeries?.(item.original, item.stats);
    },
    [onSelectSeries]
  );

  const handleGlyphKeyDown = useCallback(
    (item: PreparedSeriesItem) => (event: ReactKeyboardEvent<SVGGElement>) => {
      if (event.nativeEvent.isComposing) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleSelectSeries(item);
      }
    },
    [handleSelectSeries]
  );

  const merged = mergeProps({
    themeTarget: themeProps('box-whisker-plot', {
      empty: isEmpty,
      seriesCount: preparedSeries.length,
    }),
    baseClassName: 'prism-slab p-5 space-y-4',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('box-whisker-plot', 'header');
  const svgClass = stableClassName('box-whisker-plot', 'svg');
  const readoutClass = stableClassName('box-whisker-plot', 'readout');

  return (
    <div ref={ref} role="region" aria-labelledby={headingId} {...rest} {...merged}>
      <div className={cx(headerClass, 'flex flex-wrap items-center justify-between gap-3')}>
        <h4
          id={headingId}
          className="text-sm font-semibold tracking-tight"
          style={{ color: 'var(--prism-text-primary)' }}
        >
          {title}
        </h4>

        {!isEmpty ? (
          <div
            aria-hidden="true"
            className="inline-flex flex-wrap items-center gap-3 text-[11px] font-medium"
            style={{ color: 'var(--prism-text-secondary)' }}
          >
            <span className="inline-flex items-center gap-1.5">
              <span
                className="w-3 h-2 rounded-[2px] border"
                style={{
                  borderColor: 'var(--prism-primary-main)',
                  backgroundColor: 'var(--prism-divider)',
                }}
              />
              <span>IQR (Q1–Q3)</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className="w-3 h-0.5 rounded-full"
                style={{ backgroundColor: 'var(--prism-primary-main)' }}
              />
              <span>Median</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full border-2"
                style={{ borderColor: 'var(--prism-primary-main)' }}
              />
              <span>Outlier</span>
            </span>
          </div>
        ) : null}
      </div>

      {isEmpty ? (
        <div
          role="status"
          data-testid="box-whisker-empty"
          className="prism-well rounded-2xl px-4 py-8 text-center text-xs font-medium"
          style={{ color: 'var(--prism-text-secondary)' }}
        >
          No distribution data to display.
        </div>
      ) : (
        <>
          <div className="w-full overflow-x-auto">
            <svg
              role="img"
              aria-label={`${title} box and whisker plot across ${preparedSeries.length} series`}
              viewBox={`0 0 ${SVG_WIDTH} ${clampedHeight}`}
              style={{ height: `${clampedHeight}px` }}
              className={cx(svgClass, 'w-full block overflow-visible')}
            >
              {geometry.ticks.map((tick) => (
                <g key={tick.key}>
                  <line
                    x1={PAD_LEFT}
                    y1={tick.y}
                    x2={PAD_LEFT + geometry.plotWidth}
                    y2={tick.y}
                    stroke="var(--prism-divider)"
                    strokeWidth={tick.isBaseline ? 1.25 : 1}
                    strokeDasharray={tick.isBaseline ? undefined : '3 3'}
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

              {geometry.glyphs.map((glyph) => {
                const isSelected = activeSeries !== null && activeSeries.id === glyph.id;
                const boxFillOpacity =
                  activeSeries === null ? 0.24 : isSelected ? 0.38 : 0.14;
                const strokeOpacity = activeSeries === null ? 0.9 : isSelected ? 1 : 0.55;
                const outlierText =
                  glyph.stats.outliers.length === 1
                    ? '1 outlier'
                    : `${glyph.stats.outliers.length} outliers`;

                return (
                  <g
                    key={glyph.key}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                    aria-label={`${glyph.label}: median ${formatMetric(glyph.stats.median, valueUnit)}, Q1 ${formatMetric(glyph.stats.q1, valueUnit)}, Q3 ${formatMetric(glyph.stats.q3, valueUnit)}, range ${formatMetric(glyph.stats.min, valueUnit)} to ${formatMetric(glyph.stats.max, valueUnit)}, ${outlierText}`}
                    data-series-id={glyph.id}
                    data-tone={glyph.tone}
                    data-selected={isSelected ? 'true' : 'false'}
                    className="prism-focus-ring cursor-pointer"
                    onClick={() => handleSelectSeries(glyph)}
                    onKeyDown={handleGlyphKeyDown(glyph)}
                  >
                    <rect
                      x={glyph.hitX}
                      y={PAD_TOP}
                      width={glyph.hitWidth}
                      height={geometry.plotHeight}
                      rx={8}
                      fill={glyph.color}
                      fillOpacity={isSelected ? 0.08 : 0}
                    />

                    <line
                      data-role="whisker-line"
                      x1={glyph.cx}
                      y1={glyph.yWhiskerHigh}
                      x2={glyph.cx}
                      y2={glyph.yWhiskerLow}
                      stroke={glyph.color}
                      strokeWidth={1.5}
                      strokeOpacity={strokeOpacity}
                    />

                    <line
                      data-role="whisker-cap-high"
                      x1={roundCoord(glyph.cx - glyph.capHalfWidth)}
                      y1={glyph.yWhiskerHigh}
                      x2={roundCoord(glyph.cx + glyph.capHalfWidth)}
                      y2={glyph.yWhiskerHigh}
                      stroke={glyph.color}
                      strokeWidth={1.5}
                      strokeOpacity={strokeOpacity}
                      strokeLinecap="round"
                    />

                    <line
                      data-role="whisker-cap-low"
                      x1={roundCoord(glyph.cx - glyph.capHalfWidth)}
                      y1={glyph.yWhiskerLow}
                      x2={roundCoord(glyph.cx + glyph.capHalfWidth)}
                      y2={glyph.yWhiskerLow}
                      stroke={glyph.color}
                      strokeWidth={1.5}
                      strokeOpacity={strokeOpacity}
                      strokeLinecap="round"
                    />

                    <rect
                      data-role="iqr-box"
                      x={glyph.boxX}
                      y={glyph.boxY}
                      width={glyph.boxWidth}
                      height={glyph.boxHeight}
                      rx={5}
                      fill={glyph.color}
                      fillOpacity={boxFillOpacity}
                      stroke={isSelected ? 'var(--prism-text-primary)' : glyph.color}
                      strokeWidth={isSelected ? 2 : 1.5}
                      strokeOpacity={isSelected ? 1 : strokeOpacity}
                    />

                    <line
                      data-role="median-line"
                      x1={roundCoord(glyph.boxX + 1)}
                      y1={glyph.yMedian}
                      x2={roundCoord(glyph.boxX + glyph.boxWidth - 1)}
                      y2={glyph.yMedian}
                      stroke={isSelected ? 'var(--prism-text-primary)' : glyph.color}
                      strokeWidth={2.75}
                      strokeLinecap="round"
                    />

                    {glyph.outliers.map((outlier) => (
                      <circle
                        key={outlier.key}
                        data-role="outlier-marker"
                        data-outlier-value={String(outlier.value)}
                        cx={glyph.cx}
                        cy={outlier.cy}
                        r={3.5}
                        fill="var(--prism-bg-start)"
                        stroke={glyph.color}
                        strokeWidth={1.75}
                        strokeOpacity={strokeOpacity}
                      />
                    ))}

                    <text
                      x={glyph.cx}
                      y={PAD_TOP + geometry.plotHeight + 22}
                      textAnchor="middle"
                      fill="var(--prism-text-primary)"
                      className="text-[11px] font-medium"
                    >
                      {glyph.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div
            data-testid="box-whisker-readout"
            aria-live="polite"
            className={cx(
              readoutClass,
              'prism-well rounded-xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs tabular-nums'
            )}
            style={{ color: 'var(--prism-text-primary)' }}
          >
            {activeSeries ? (
              <>
                <span className="inline-flex items-center gap-2 font-semibold">
                  <span
                    aria-hidden="true"
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: activeSeries.color }}
                  />
                  <span>{activeSeries.label}</span>
                </span>
                <span className="font-mono text-[11px]">
                  {`Min ${formatMetric(activeSeries.stats.min, valueUnit)} · Q1 ${formatMetric(activeSeries.stats.q1, valueUnit)} · Median ${formatMetric(activeSeries.stats.median, valueUnit)} · Q3 ${formatMetric(activeSeries.stats.q3, valueUnit)} · Max ${formatMetric(activeSeries.stats.max, valueUnit)} · Outliers ${activeSeries.stats.outliers.length}`}
                </span>
              </>
            ) : (
              <span style={{ color: 'var(--prism-text-secondary)' }}>
                Select any series to inspect Min · Q1 · Median · Q3 · Max · Outliers.
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

BoxWhiskerPlot.displayName = 'BoxWhiskerPlot';
