'use client';

import { useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { mergeProps } from '../utils/mergeProps';
import { formatLocaleNumber } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export type KpiTrendTone = 'positive' | 'negative' | 'neutral';

export interface KpiSparklinePoint {
  /** Short category or timestamp label displayed in hover/focus readouts. */
  label: string;
  /** Numeric metric measurement for this point. */
  value: number;
}

type KpiMetricCardBaseProps = Omit<BaseProps<HTMLElement>, 'children'>;

export interface KpiMetricCardProps extends KpiMetricCardBaseProps {
  /** Concise metric kicker label displayed at the top of the card. */
  label: string;
  /** Primary headline metric figure (formatted string or finite number). */
  value: string | number;
  /** Optional trailing measurement unit (e.g. 'ms', '%', 'req/s'). */
  unit?: string;
  /** Optional leading value prefix (e.g. '$', '~'). */
  prefix?: string;
  /** Percentage delta relative to the comparison baseline (e.g. 12.4, -3.2, 0). */
  deltaPercent?: number;
  /** Comparison window label rendered alongside the delta badge (e.g. 'vs last 30d'). */
  deltaLabel?: string;
  /** Inverts semantic tone so negative deltas read as positive (e.g. latency, error rate). */
  invertDeltaSemantics?: boolean;
  /** Ordered time-series data plotted inside the miniature optical SVG sparkline. */
  sparkline: ReadonlyArray<number | KpiSparklinePoint>;
  /** Optional icon rendered in a crystal bezel at the top-right corner. */
  icon?: ReactNode;
  /** Optional footer bar rendered beneath a translucent divider. */
  footer?: ReactNode;
}

interface PlottedSparklinePoint {
  id: string;
  index: number;
  label: string;
  value: number;
  x: number;
  y: number;
}

const SPARKLINE_WIDTH = 240;
const SPARKLINE_HEIGHT = 64;
const SPARKLINE_PAD_X = 8;
const SPARKLINE_PAD_TOP = 8;
const SPARKLINE_PAD_BOTTOM = 10;
const SPARKLINE_AREA_BOTTOM = 60;
const SPARKLINE_MID_Y =
  SPARKLINE_PAD_TOP + (SPARKLINE_HEIGHT - SPARKLINE_PAD_TOP - SPARKLINE_PAD_BOTTOM) / 2;

function resolveTrendTone(
  deltaPercent: number | undefined,
  invertDeltaSemantics: boolean
): KpiTrendTone {
  if (deltaPercent === undefined || !Number.isFinite(deltaPercent) || deltaPercent === 0) {
    return 'neutral';
  }
  const isUp = deltaPercent > 0;
  if (invertDeltaSemantics) {
    return isUp ? 'negative' : 'positive';
  }
  return isUp ? 'positive' : 'negative';
}

function resolveDeltaDirection(deltaPercent: number): 'up' | 'down' | 'flat' {
  if (!Number.isFinite(deltaPercent) || deltaPercent === 0) {
    return 'flat';
  }
  return deltaPercent > 0 ? 'up' : 'down';
}

function formatDeltaPercent(deltaPercent: number): string {
  if (!Number.isFinite(deltaPercent) || deltaPercent === 0) {
    return '0.0%';
  }
  const sign = deltaPercent > 0 ? '+' : '';
  return `${sign}${deltaPercent.toFixed(1)}%`;
}

function formatMetricValue(value: string | number): string {
  if (typeof value === 'string') {
    return value;
  }
  return Number.isFinite(value) ? formatLocaleNumber(value) : '—';
}

function formatPointReadout(value: number, prefix?: string, unit?: string): string {
  const base = formatLocaleNumber(value);
  const withPrefix = prefix ? `${prefix}${base}` : base;
  return unit ? `${withPrefix} ${unit}` : withPrefix;
}

function getToneStrokeVar(tone: KpiTrendTone): string {
  if (tone === 'positive') return 'var(--prism-success-main)';
  if (tone === 'negative') return 'var(--prism-error-main)';
  return 'var(--prism-primary-main)';
}

function getDeltaBadgeClasses(tone: KpiTrendTone): string {
  if (tone === 'positive') {
    return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30';
  }
  if (tone === 'negative') {
    return 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30';
  }
  return 'prism-well text-slate-600 dark:text-slate-300';
}

function getSpecularAccentClasses(tone: KpiTrendTone): string {
  if (tone === 'positive') {
    return 'from-emerald-400/80 via-teal-300/40 to-transparent';
  }
  if (tone === 'negative') {
    return 'from-rose-400/80 via-red-300/40 to-transparent';
  }
  return 'from-amber-400/75 via-sky-300/40 to-transparent';
}

function buildPlottedPoints(
  sparkline: ReadonlyArray<number | KpiSparklinePoint>
): PlottedSparklinePoint[] {
  if (sparkline.length === 0) {
    return [];
  }

  const normalized = sparkline.map((entry, idx) => {
    if (typeof entry === 'number') {
      const safeVal = Number.isFinite(entry) ? entry : 0;
      return {
        id: `spark-${idx + 1}`,
        index: idx,
        label: `Point ${idx + 1}`,
        value: safeVal,
      };
    }
    const safeVal = Number.isFinite(entry.value) ? entry.value : 0;
    return {
      id: `spark-${idx + 1}-${entry.label}`,
      index: idx,
      label: entry.label,
      value: safeVal,
    };
  });

  let minVal = Infinity;
  let maxVal = -Infinity;
  for (const pt of normalized) {
    if (pt.value < minVal) minVal = pt.value;
    if (pt.value > maxVal) maxVal = pt.value;
  }

  const span = maxVal - minVal;
  const usableWidth = SPARKLINE_WIDTH - SPARKLINE_PAD_X * 2;
  const usableHeight = SPARKLINE_HEIGHT - SPARKLINE_PAD_TOP - SPARKLINE_PAD_BOTTOM;
  const count = normalized.length;

  return normalized.map((pt) => {
    const x =
      count === 1
        ? SPARKLINE_WIDTH / 2
        : Number((SPARKLINE_PAD_X + (pt.index / (count - 1)) * usableWidth).toFixed(2));
    const y =
      span === 0
        ? SPARKLINE_MID_Y
        : Number(
            (SPARKLINE_PAD_TOP + (1 - (pt.value - minVal) / span) * usableHeight).toFixed(2)
          );
    return {
      id: pt.id,
      index: pt.index,
      label: pt.label,
      value: pt.value,
      x,
      y,
    };
  });
}

function KpiMetricCardInner({
  label,
  value,
  unit,
  prefix,
  deltaPercent,
  deltaLabel,
  invertDeltaSemantics = false,
  sparkline,
  icon,
  footer,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: KpiMetricCardProps) {
  const override = useComponentOverride('KpiMetricCard');
  const gradientId = useId();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const tone = resolveTrendTone(deltaPercent, invertDeltaSemantics);
  const strokeToken = getToneStrokeVar(tone);

  const plottedPoints = useMemo(() => buildPlottedPoints(sparkline), [sparkline]);

  const activePoint =
    activeIndex !== null && activeIndex < plottedPoints.length
      ? plottedPoints[activeIndex]
      : undefined;
  const firstPoint = plottedPoints[0];
  const latestPoint = plottedPoints[plottedPoints.length - 1];

  const polylinePoints = plottedPoints.map((pt) => `${pt.x},${pt.y}`).join(' ');
  const areaPoints =
    firstPoint && latestPoint
      ? `${firstPoint.x},${SPARKLINE_AREA_BOTTOM} ${polylinePoints} ${latestPoint.x},${SPARKLINE_AREA_BOTTOM}`
      : '';

  const handlePointKeyDown = (event: KeyboardEvent<SVGGElement>, index: number) => {
    const lastIndex = plottedPoints.length - 1;
    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight') {
      nextIndex = Math.min(lastIndex, index + 1);
    } else if (event.key === 'ArrowLeft') {
      nextIndex = Math.max(0, index - 1);
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = lastIndex;
    }

    if (nextIndex !== null) {
      event.preventDefault();
      setActiveIndex(nextIndex);
      const target = svgRef.current?.querySelector<SVGGElement>(
        `[data-point-index="${nextIndex}"]`
      );
      target?.focus();
    }
  };

  const merged = mergeProps({
    themeTarget: themeProps('kpi-metric-card', {
      tone,
      inverted: invertDeltaSemantics,
      emptySparkline: plottedPoints.length === 0,
    }),
    baseClassName: 'prism-slab relative overflow-hidden p-5 flex flex-col gap-3.5',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const deltaDirection =
    deltaPercent !== undefined ? resolveDeltaDirection(deltaPercent) : null;

  return (
    <article ref={ref} {...rest} {...merged}>
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-4 top-0 h-1 rounded-b-full bg-gradient-to-r ${getSpecularAccentClasses(tone)}`}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          <div className="text-xs font-semibold uppercase tracking-[0.06em] leading-snug text-slate-500 dark:text-slate-400">
            {label}
          </div>
          <div className="flex items-baseline gap-1 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums leading-none">
            {prefix ? (
              <span className="text-lg font-semibold text-slate-500 dark:text-slate-400">
                {prefix}
              </span>
            ) : null}
            <span>{formatMetricValue(value)}</span>
            {unit ? (
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {unit}
              </span>
            ) : null}
          </div>
        </div>

        {icon ? (
          <div className="prism-crystal w-9 h-9 rounded-xl inline-flex items-center justify-center shrink-0 text-slate-700 dark:text-slate-200">
            {icon}
          </div>
        ) : null}
      </div>

      {deltaPercent !== undefined || deltaLabel ? (
        <div className="flex flex-wrap items-center gap-2">
          {deltaPercent !== undefined && deltaDirection !== null ? (
            <span
              data-kpi-delta-tone={tone}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-mono font-semibold tabular-nums ${getDeltaBadgeClasses(tone)}`}
            >
              {deltaDirection === 'up' ? (
                <TrendingUp aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
              ) : deltaDirection === 'down' ? (
                <TrendingDown aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <Minus aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>{formatDeltaPercent(deltaPercent)}</span>
            </span>
          ) : null}

          {deltaLabel ? (
            <span className="text-xs text-slate-500 dark:text-slate-400">{deltaLabel}</span>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-1.5">
        <div
          aria-live="polite"
          data-kpi-readout={activePoint ? activePoint.label : 'summary'}
          className="flex items-center justify-between gap-2 text-[11px] font-mono tabular-nums text-slate-600 dark:text-slate-300 min-h-4"
        >
          {activePoint ? (
            <>
              <span className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                {activePoint.label}
              </span>
              <span>{formatPointReadout(activePoint.value, prefix, unit)}</span>
            </>
          ) : latestPoint ? (
            <>
              <span className="text-slate-500 dark:text-slate-400">
                Latest ({latestPoint.label})
              </span>
              <span>{formatPointReadout(latestPoint.value, prefix, unit)}</span>
            </>
          ) : (
            <span className="text-slate-500 dark:text-slate-400">No trend data</span>
          )}
        </div>

        <div
          className="prism-well rounded-xl px-2 py-1.5"
          onMouseLeave={() => setActiveIndex(null)}
        >
          {plottedPoints.length === 0 ? (
            <div className="h-16 flex items-center justify-center text-[11px] text-slate-500 dark:text-slate-400">
              No sparkline points available
            </div>
          ) : (
            <svg
              ref={svgRef}
              role="img"
              aria-label={`${label} trend sparkline`}
              viewBox={`0 0 ${SPARKLINE_WIDTH} ${SPARKLINE_HEIGHT}`}
              className="w-full h-16 overflow-visible prism-contain-leaf"
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={strokeToken} stopOpacity="0.38" />
                  <stop offset="100%" stopColor={strokeToken} stopOpacity="0.0" />
                </linearGradient>
              </defs>

              <polygon points={areaPoints} fill={`url(#${gradientId})`} />

              <polyline
                fill="none"
                stroke={strokeToken}
                strokeWidth="2.25"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={polylinePoints}
              />

              {plottedPoints.map((pt) => {
                const isActive = activePoint?.index === pt.index;
                return (
                  <g
                    key={pt.id}
                    role="button"
                    tabIndex={0}
                    data-point-index={pt.index}
                    aria-label={`${pt.label}: ${formatPointReadout(pt.value, prefix, unit)}`}
                    className="prism-focus-ring cursor-pointer focus:outline-none"
                    onMouseEnter={() => setActiveIndex(pt.index)}
                    onClick={() => setActiveIndex(pt.index)}
                    onFocus={() => setActiveIndex(pt.index)}
                    onBlur={() => setActiveIndex(null)}
                    onKeyDown={(e) => handlePointKeyDown(e, pt.index)}
                  >
                    <circle cx={pt.x} cy={pt.y} r={10} fill="transparent" />
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isActive ? 4.5 : plottedPoints.length === 1 ? 4 : 2.5}
                      fill={isActive ? strokeToken : 'var(--prism-bg-start)'}
                      stroke={strokeToken}
                      strokeWidth={isActive ? 2 : 1.5}
                    />
                  </g>
                );
              })}
            </svg>
          )}
        </div>
      </div>

      {footer ? (
        <div className="pt-3 border-t border-slate-300/40 dark:border-slate-700/50 text-xs text-slate-600 dark:text-slate-300">
          {footer}
        </div>
      ) : null}
    </article>
  );
}

export const KpiMetricCard = /*#__PURE__*/ memoWithDisplayName(KpiMetricCardInner, 'KpiMetricCard');
