'use client';

import { memo, useMemo, type CSSProperties } from 'react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { themeProps } from '../utils/themeProps';

export type SparklineVariant = 'line' | 'bar';
export type SparklineTone = 'primary' | 'secondary' | 'emerald' | 'amber' | 'rose';

type SparklineDeltaDirection = 'positive' | 'negative' | 'neutral';

export interface SparklineChartProps extends BaseProps<HTMLSpanElement> {
  /** Ordered numeric series plotted in the inline sparkline. Non-finite values are safely filtered out. */
  values: ReadonlyArray<number>;
  /** Axis-free plot geometry ('line' | 'bar'). Defaults to 'line'. */
  variant?: SparklineVariant;
  /** Semantic --prism-* optical color tone. Defaults to 'primary'. */
  tone?: SparklineTone;
  /** SVG width in pixels, clamped to 48..320. Defaults to 120. */
  width?: number;
  /** SVG height in pixels, clamped to 16..96. Defaults to 32. */
  height?: number;
  /** Highlights start, peak, and end markers on the 'line' variant. Defaults to true. */
  showEndpoints?: boolean;
  /** Displays an inline tabular percentage change pill when at least 2 finite values exist. Defaults to false. */
  showDelta?: boolean;
  /** Accessible label applied to the sparkline SVG graphic. Defaults to 'Trend sparkline'. */
  ariaLabel?: string;
}

interface SanitizedSeries {
  values: number[];
  first: number;
  last: number;
  min: number;
  max: number;
  peakIndex: number;
}

interface EndpointDot {
  id: string;
  kind: 'start' | 'peak' | 'end';
  x: number;
  y: number;
  isPeak: boolean;
}

interface LineGeometry {
  polylinePoints: string;
  areaPoints: string;
  dots: EndpointDot[];
}

interface PlottedBar {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isLatest: boolean;
}

interface SparklineDelta {
  label: string;
  direction: SparklineDeltaDirection;
}

const DEFAULT_WIDTH = 120;
const MIN_WIDTH = 48;
const MAX_WIDTH = 320;

const DEFAULT_HEIGHT = 32;
const MIN_HEIGHT = 16;
const MAX_HEIGHT = 96;

const LINE_PAD_X = 4;
const LINE_PAD_Y = 4;
const BAR_PAD_X = 2;
const BAR_PAD_Y = 2;

function getToneColorVar(tone: SparklineTone): string {
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

function getDeltaPillClassName(direction: SparklineDeltaDirection): string {
  if (direction === 'positive') {
    return 'prism-emerald';
  }
  if (direction === 'negative') {
    return 'prism-crystal border';
  }
  return 'prism-crystal';
}

function getDeltaPillStyle(direction: SparklineDeltaDirection): CSSProperties {
  if (direction === 'positive') {
    return { color: 'var(--prism-success-contrast)' };
  }
  if (direction === 'negative') {
    return {
      color: 'var(--prism-error-main)',
      borderColor: 'var(--prism-error-main)',
    };
  }
  return { color: 'var(--prism-text-secondary)' };
}

function analyzeSeries(rawValues: ReadonlyArray<number>): SanitizedSeries | null {
  const finite: number[] = [];
  let first = 0;
  let last = 0;
  let min = Infinity;
  let max = -Infinity;
  let peakIndex = 0;

  for (const raw of rawValues) {
    if (!Number.isFinite(raw)) {
      continue;
    }
    const val = raw === 0 ? 0 : raw;
    const index = finite.length;
    finite.push(val);
    if (index === 0) {
      first = val;
    }
    last = val;
    if (val < min) {
      min = val;
    }
    if (val > max) {
      max = val;
      peakIndex = index;
    }
  }

  if (finite.length === 0) {
    return null;
  }

  return { values: finite, first, last, min, max, peakIndex };
}

function normalizeInRange(val: number, min: number, max: number): number {
  const span = max - min;
  if (span === 0) {
    return 0.5;
  }
  if (!Number.isFinite(span)) {
    const halfSpan = max / 2 - min / 2;
    return (val / 2 - min / 2) / halfSpan;
  }
  return (val - min) / span;
}

function buildLineGeometry(
  series: SanitizedSeries,
  width: number,
  height: number
): LineGeometry {
  const count = series.values.length;
  const usableWidth = width - LINE_PAD_X * 2;
  const usableHeight = height - LINE_PAD_Y * 2;
  const baselineY = Number((height - LINE_PAD_Y).toFixed(2));

  const coords: string[] = [];
  let startX = 0;
  let startY = 0;
  let endX = 0;
  let endY = 0;
  let peakX = 0;
  let peakY = 0;

  for (const [index, val] of series.values.entries()) {
    const x =
      count === 1
        ? Number((width / 2).toFixed(2))
        : Number((LINE_PAD_X + (index / (count - 1)) * usableWidth).toFixed(2));
    const ratio = normalizeInRange(val, series.min, series.max);
    const y = Number((LINE_PAD_Y + (1 - ratio) * usableHeight).toFixed(2));

    coords.push(`${x},${y}`);
    if (index === 0) {
      startX = x;
      startY = y;
    }
    if (index === series.peakIndex) {
      peakX = x;
      peakY = y;
    }
    endX = x;
    endY = y;
  }

  const polylinePoints = coords.join(' ');
  const areaPoints =
    count >= 2 ? `${startX},${baselineY} ${polylinePoints} ${endX},${baselineY}` : '';

  const dots: EndpointDot[] = [];
  if (count === 1) {
    dots.push({ id: 'dot-end', kind: 'end', x: endX, y: endY, isPeak: true });
  } else {
    const hasVariation = series.max > series.min;
    dots.push({
      id: 'dot-start',
      kind: 'start',
      x: startX,
      y: startY,
      isPeak: hasVariation && series.peakIndex === 0,
    });
    if (hasVariation && series.peakIndex > 0 && series.peakIndex < count - 1) {
      dots.push({
        id: 'dot-peak',
        kind: 'peak',
        x: peakX,
        y: peakY,
        isPeak: true,
      });
    }
    dots.push({
      id: 'dot-end',
      kind: 'end',
      x: endX,
      y: endY,
      isPeak: hasVariation && series.peakIndex === count - 1,
    });
  }

  return { polylinePoints, areaPoints, dots };
}

function buildBarGeometry(
  series: SanitizedSeries,
  width: number,
  height: number
): PlottedBar[] {
  const count = series.values.length;
  const usableWidth = width - BAR_PAD_X * 2;
  const usableHeight = height - BAR_PAD_Y * 2;
  const bottomY = height - BAR_PAD_Y;
  const minBarHeight = Math.max(2, Number((usableHeight * 0.14).toFixed(2)));

  const slotWidth = usableWidth / count;
  const gap = count === 1 ? 0 : Math.min(2, slotWidth * 0.28);
  const barWidth =
    count === 1
      ? Number(Math.min(16, usableWidth).toFixed(2))
      : Number(Math.max(0.5, slotWidth - gap).toFixed(2));

  const bars: PlottedBar[] = [];
  const isFlat = series.min === series.max;
  const isAllNonNegative = series.min >= 0 && series.max > 0;

  for (const [index, val] of series.values.entries()) {
    const x =
      count === 1
        ? Number(((width - barWidth) / 2).toFixed(2))
        : Number((BAR_PAD_X + index * slotWidth + gap / 2).toFixed(2));

    let barHeight: number;
    if (isFlat) {
      barHeight = series.min === 0 ? minBarHeight : Number((usableHeight * 0.5).toFixed(2));
    } else if (isAllNonNegative) {
      barHeight = Number(Math.max(minBarHeight, (val / series.max) * usableHeight).toFixed(2));
    } else {
      const ratio = normalizeInRange(val, series.min, series.max);
      barHeight = Number((minBarHeight + ratio * (usableHeight - minBarHeight)).toFixed(2));
    }

    const y = Number((bottomY - barHeight).toFixed(2));
    bars.push({
      id: `bar-${index}`,
      x,
      y,
      width: barWidth,
      height: barHeight,
      isLatest: index === count - 1,
    });
  }

  return bars;
}

function computeDelta(series: SanitizedSeries | null): SparklineDelta | null {
  if (!series || series.values.length < 2) {
    return null;
  }
  const { first, last } = series;
  if (first === last) {
    return { label: '0.0%', direction: 'neutral' };
  }
  if (first === 0) {
    return last > 0
      ? { label: '+100.0%', direction: 'positive' }
      : { label: '-100.0%', direction: 'negative' };
  }
  const rawPct = ((last - first) / Math.abs(first)) * 100;
  if (!Number.isFinite(rawPct)) {
    return last > first
      ? { label: '+100.0%', direction: 'positive' }
      : { label: '-100.0%', direction: 'negative' };
  }
  const rounded = Math.round(rawPct * 10) / 10;
  if (rounded === 0) {
    return { label: '0.0%', direction: 'neutral' };
  }
  return rounded > 0
    ? { label: `+${rounded.toFixed(1)}%`, direction: 'positive' }
    : { label: `${rounded.toFixed(1)}%`, direction: 'negative' };
}

function SparklineChartInner({
  values,
  variant = 'line',
  tone = 'primary',
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  showEndpoints = true,
  showDelta = false,
  ariaLabel = 'Trend sparkline',
  className,
  style,
  xstyle,
  ref,
  ...rest
}: SparklineChartProps) {
  const override = useComponentOverride('SparklineChart');

  const safeWidth = clampNumber(width, MIN_WIDTH, MAX_WIDTH, DEFAULT_WIDTH);
  const safeHeight = clampNumber(height, MIN_HEIGHT, MAX_HEIGHT, DEFAULT_HEIGHT);
  const toneVar = getToneColorVar(tone);
  const resolvedAriaLabel = ariaLabel.trim().length > 0 ? ariaLabel : 'Trend sparkline';

  const series = useMemo(() => analyzeSeries(values), [values]);
  const delta = useMemo(() => (showDelta ? computeDelta(series) : null), [series, showDelta]);

  const lineGeometry = useMemo(
    () => (series && variant === 'line' ? buildLineGeometry(series, safeWidth, safeHeight) : null),
    [series, variant, safeWidth, safeHeight]
  );

  const bars = useMemo(
    () => (series && variant === 'bar' ? buildBarGeometry(series, safeWidth, safeHeight) : null),
    [series, variant, safeWidth, safeHeight]
  );

  const midY = Number((safeHeight / 2).toFixed(2));

  const merged = mergeProps({
    themeTarget: themeProps('sparkline-chart', {
      variant,
      tone,
      empty: series === null,
      showDelta: Boolean(delta),
      deltaDirection: delta?.direction,
    }),
    baseClassName: 'prism-focus-ring inline-flex items-center gap-2 align-middle rounded-lg',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <span ref={ref} {...rest} {...merged}>
      <span
        className={`${stableClassName('sparkline-chart', 'plot')} prism-crystal inline-flex items-center justify-center rounded-lg px-1.5 py-0.5 shrink-0`}
      >
        <svg
          role="img"
          aria-label={resolvedAriaLabel}
          width={safeWidth}
          height={safeHeight}
          viewBox={`0 0 ${safeWidth} ${safeHeight}`}
          className="block overflow-visible"
        >
          {series === null ? (
            <line
              x1={LINE_PAD_X}
              y1={midY}
              x2={safeWidth - LINE_PAD_X}
              y2={midY}
              stroke={toneVar}
              strokeOpacity={0.28}
              strokeWidth={1.5}
              strokeDasharray="3 3"
              strokeLinecap="round"
              data-sparkline-empty="true"
            />
          ) : null}

          {lineGeometry ? (
            <>
              {lineGeometry.areaPoints ? (
                <polygon
                  points={lineGeometry.areaPoints}
                  fill={toneVar}
                  fillOpacity={0.16}
                />
              ) : null}
              <polyline
                fill="none"
                stroke={toneVar}
                strokeWidth={1.75}
                strokeLinecap="round"
                strokeLinejoin="round"
                points={lineGeometry.polylinePoints}
              />
              {showEndpoints
                ? lineGeometry.dots.map((dot) => {
                    if (dot.kind === 'start') {
                      return (
                        <circle
                          key={dot.id}
                          cx={dot.x}
                          cy={dot.y}
                          r={2}
                          fill="var(--prism-bg-start)"
                          stroke={toneVar}
                          strokeWidth={1.5}
                          data-sparkline-dot="start"
                          data-sparkline-peak={dot.isPeak ? 'true' : undefined}
                        />
                      );
                    }
                    if (dot.kind === 'peak') {
                      return (
                        <circle
                          key={dot.id}
                          cx={dot.x}
                          cy={dot.y}
                          r={2.5}
                          fill={toneVar}
                          stroke="var(--prism-bg-start)"
                          strokeWidth={1}
                          data-sparkline-dot="peak"
                          data-sparkline-peak="true"
                        />
                      );
                    }
                    return (
                      <circle
                        key={dot.id}
                        cx={dot.x}
                        cy={dot.y}
                        r={2.75}
                        fill={toneVar}
                        data-sparkline-dot="end"
                        data-sparkline-peak={dot.isPeak ? 'true' : undefined}
                      />
                    );
                  })
                : null}
            </>
          ) : null}

          {bars
            ? bars.map((bar) => (
                <rect
                  key={bar.id}
                  x={bar.x}
                  y={bar.y}
                  width={bar.width}
                  height={bar.height}
                  rx={2}
                  fill={toneVar}
                  fillOpacity={bar.isLatest ? 1 : 0.42}
                  data-sparkline-bar={bar.isLatest ? 'latest' : 'series'}
                />
              ))
            : null}
        </svg>
      </span>

      {delta ? (
        <span
          data-sparkline-delta={delta.direction}
          className={`${stableClassName('sparkline-chart', 'delta')} ${getDeltaPillClassName(delta.direction)} inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-mono font-semibold tabular-nums leading-none whitespace-nowrap shrink-0`}
          style={getDeltaPillStyle(delta.direction)}
        >
          {delta.label}
        </span>
      ) : null}
    </span>
  );
}

export const SparklineChart = memo(SparklineChartInner);
SparklineChart.displayName = 'SparklineChart';
