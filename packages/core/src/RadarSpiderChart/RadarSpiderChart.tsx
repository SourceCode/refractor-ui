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
import { STYLE_BG_DIVIDER, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export type RadarTone = 'primary' | 'secondary' | 'emerald' | 'amber' | 'rose';

export interface RadarSeries {
  /** Stable unique identifier for this series (used for visibility toggles). */
  id: string;
  /** Human-readable label shown in the legend pill and axis comparison bar. */
  label: string;
  /** Ordered numeric scores aligned to `axes`; each value is sanitized to `[0, safeMax]`. */
  values: number[];
  /** Optional semantic optical tone token used for polygon fill, stroke, and vertex dots. */
  tone?: RadarTone;
}

export interface RadarSpiderChartProps extends BaseProps<HTMLDivElement> {
  /** Ordered axis labels around the radar perimeter (requires at least 3 axes). */
  axes: string[];
  /** Multi-series radar polygon definitions (requires at least 1 series). */
  series: RadarSeries[];
  /** Positive finite upper bound for axis scaling (defaults to 100). */
  maxValue?: number;
  /** Chart card heading linked to the SVG graphic (defaults to 'Multi-Axis Profile'). */
  title?: string;
  /** Square SVG viewport dimension in pixels (defaults to 260, clamped to 180..400). */
  size?: number;
  /** Callback fired when an axis label/button is clicked or activated via keyboard. */
  onSelectAxis?: (axisIndex: number, axisLabel: string) => void;
}

interface ComputedAxis {
  key: string;
  index: number;
  label: string;
  angle: number;
  tipX: number;
  tipY: number;
  labelX: number;
  labelY: number;
  textAnchor: 'start' | 'middle' | 'end';
  dominantBaseline: 'auto' | 'central' | 'hanging';
}

interface ComputedWebRing {
  level: number;
  pct: number;
  points: string;
  tickY: number;
  tickLabel: string;
}

interface ComputedVertex {
  key: string;
  axisIndex: number;
  axisLabel: string;
  value: number;
  pct: number;
  x: number;
  y: number;
}

interface ComputedRadarSeries {
  id: string;
  key: string;
  label: string;
  tone: RadarTone;
  color: string;
  vertices: ComputedVertex[];
  polygonPoints: string;
}

const TONE_TOKEN_MAP: Record<RadarTone, string> = {
  primary: 'var(--prism-primary-main)',
  secondary: 'var(--prism-secondary-main)',
  emerald: 'var(--prism-success-main)',
  amber: 'var(--prism-warning-main)',
  rose: 'var(--prism-error-main)',
};

const TONE_CYCLE: ReadonlyArray<RadarTone> = [
  'primary',
  'secondary',
  'emerald',
  'amber',
  'rose',
];

const WEB_LEVELS: ReadonlyArray<number> = [0.25, 0.5, 0.75, 1];

function roundCoord(value: number): number {
  return Number(value.toFixed(2));
}

function formatNumeric(value: number): string {
  if (Number.isInteger(value)) {
    return String(value);
  }
  return String(Number(value.toFixed(2)));
}

function sanitizeSeriesValue(raw: number | undefined, safeMax: number): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) {
    return 0;
  }
  return Math.max(0, Math.min(safeMax, raw));
}

function polarToCartesian(
  center: number,
  radius: number,
  angleRadians: number
): { x: number; y: number } {
  return {
    x: roundCoord(center + radius * Math.cos(angleRadians)),
    y: roundCoord(center + radius * Math.sin(angleRadians)),
  };
}

function getAxisTextAnchor(angleRadians: number): 'start' | 'middle' | 'end' {
  const cos = Math.cos(angleRadians);
  if (Math.abs(cos) < 0.2) {
    return 'middle';
  }
  return cos > 0 ? 'start' : 'end';
}

function getAxisBaseline(angleRadians: number): 'auto' | 'central' | 'hanging' {
  const sin = Math.sin(angleRadians);
  if (sin < -0.5) {
    return 'auto';
  }
  if (sin > 0.5) {
    return 'hanging';
  }
  return 'central';
}

const headerClass = /*#__PURE__*/ stableClassName('radar-spider-chart', 'header');
const legendClass = /*#__PURE__*/ stableClassName('radar-spider-chart', 'legend');
const svgClass = /*#__PURE__*/ stableClassName('radar-spider-chart', 'svg');
const comparisonClass = /*#__PURE__*/ stableClassName('radar-spider-chart', 'comparison');

function RadarSpiderChartInner({
  axes,
  series,
  maxValue = 100,
  title = 'Multi-Axis Profile',
  size = 260,
  onSelectAxis,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: RadarSpiderChartProps) {
  const headingId = useId();
  const override = useComponentOverride('RadarSpiderChart');
  const [hiddenIds, setHiddenIds] = useState<ReadonlySet<string>>(() => new Set());
  const [selectedAxisIndex, setSelectedAxisIndex] = useState<number | null>(null);

  const clampedSize = clampNumber(size, 180, 400, 260);
  const safeMax = Number.isFinite(maxValue) && maxValue > 0 ? maxValue : 100;
  const isEmpty = axes.length < 3 || series.length < 1;

  const center = clampedSize / 2;
  const outerRadius = roundCoord(clampedSize * 0.31);
  const labelRadius = roundCoord(outerRadius + 16);

  const { computedAxes, webRings, computedSeries } = useMemo(() => {
    if (isEmpty) {
      return {
        computedAxes: [] as ComputedAxis[],
        webRings: [] as ComputedWebRing[],
        computedSeries: [] as ComputedRadarSeries[],
      };
    }

    const axisCounts = new Map<string, number>();
    const axisList: ComputedAxis[] = axes.map((label, index) => {
      const seen = axisCounts.get(label) ?? 0;
      axisCounts.set(label, seen + 1);
      const key = seen === 0 ? `axis:${label}` : `axis:${label}#${seen + 1}`;
      const angle = -Math.PI / 2 + (index * Math.PI * 2) / axes.length;
      const tip = polarToCartesian(center, outerRadius, angle);
      const labelPos = polarToCartesian(center, labelRadius, angle);

      return {
        key,
        index,
        label,
        angle,
        tipX: tip.x,
        tipY: tip.y,
        labelX: labelPos.x,
        labelY: labelPos.y,
        textAnchor: getAxisTextAnchor(angle),
        dominantBaseline: getAxisBaseline(angle),
      };
    });

    const rings: ComputedWebRing[] = WEB_LEVELS.map((level) => {
      const radius = outerRadius * level;
      const points = axisList
        .map((axis) => {
          const pt = polarToCartesian(center, radius, axis.angle);
          return `${pt.x},${pt.y}`;
        })
        .join(' ');
      return {
        level,
        pct: Math.round(level * 100),
        points,
        tickY: roundCoord(center - radius),
        tickLabel: formatNumeric(safeMax * level),
      };
    });

    const seriesCounts = new Map<string, number>();
    const seriesList: ComputedRadarSeries[] = series.map((item, idx) => {
      const seen = seriesCounts.get(item.id) ?? 0;
      seriesCounts.set(item.id, seen + 1);
      const key = seen === 0 ? `series:${item.id}` : `series:${item.id}#${seen + 1}`;
      const resolvedTone = item.tone ?? (TONE_CYCLE[idx % TONE_CYCLE.length] as RadarTone);
      const color = TONE_TOKEN_MAP[resolvedTone];

      const vertices: ComputedVertex[] = axisList.map((axis) => {
        const value = sanitizeSeriesValue(item.values[axis.index], safeMax);
        const ratio = value / safeMax;
        const pos = polarToCartesian(center, outerRadius * ratio, axis.angle);
        return {
          key: `${key}::${axis.key}`,
          axisIndex: axis.index,
          axisLabel: axis.label,
          value,
          pct: Number((ratio * 100).toFixed(1)),
          x: pos.x,
          y: pos.y,
        };
      });

      const polygonPoints = vertices.map((v) => `${v.x},${v.y}`).join(' ');

      return {
        id: item.id,
        key,
        label: item.label,
        tone: resolvedTone,
        color,
        vertices,
        polygonPoints,
      };
    });

    return {
      computedAxes: axisList,
      webRings: rings,
      computedSeries: seriesList,
    };
  }, [axes, series, isEmpty, center, outerRadius, labelRadius, safeMax]);

  const visibleSeries = useMemo(
    () => computedSeries.filter((item) => !hiddenIds.has(item.id)),
    [computedSeries, hiddenIds]
  );

  const allHidden = !isEmpty && visibleSeries.length === 0;

  const activeAxisIndex =
    selectedAxisIndex !== null &&
    selectedAxisIndex >= 0 &&
    selectedAxisIndex < computedAxes.length
      ? selectedAxisIndex
      : null;

  const selectedAxis = activeAxisIndex !== null ? computedAxes[activeAxisIndex]! : null;

  const handleToggleSeries = useCallback((seriesId: string) => {
    setHiddenIds((prev) => {
      const next = new Set(prev);
      if (next.has(seriesId)) {
        next.delete(seriesId);
      } else {
        next.add(seriesId);
      }
      return next;
    });
  }, []);

  const handleSelectAxis = useCallback(
    (axisIndex: number, axisLabel: string) => {
      setSelectedAxisIndex(axisIndex);
      onSelectAxis?.(axisIndex, axisLabel);
    },
    [onSelectAxis]
  );

  const handleAxisKeyDown = useCallback(
    (axisIndex: number, axisLabel: string) =>
      (event: ReactKeyboardEvent<SVGTextElement>) => {
        if (event.nativeEvent.isComposing) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleSelectAxis(axisIndex, axisLabel);
        }
      },
    [handleSelectAxis]
  );

  const merged = mergeProps({
    themeTarget: themeProps('radar-spider-chart', {
      empty: isEmpty,
      allHidden,
    }),
    baseClassName: 'prism-slab p-5 space-y-4',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });


  return (
    <div ref={ref} role="region" aria-labelledby={headingId} {...rest} {...merged}>
      <div className={cx(headerClass, 'flex flex-wrap items-center justify-between gap-3')}>
        <h4
          id={headingId}
          className="text-sm font-semibold tracking-tight"
          style={STYLE_TEXT_PRIMARY}
        >
          {title}
        </h4>

        {!isEmpty ? (
          <div
            role="group"
            aria-label="Toggle radar series"
            data-testid="radar-series-legend"
            className={cx(legendClass, 'flex flex-wrap items-center gap-1.5')}
          >
            {computedSeries.map((item) => {
              const isVisible = !hiddenIds.has(item.id);
              return (
                <button
                  key={item.key}
                  type="button"
                  aria-pressed={isVisible}
                  data-series-id={item.id}
                  data-tone={item.tone}
                  data-testid={`radar-legend-${item.id}`}
                  onClick={() => handleToggleSeries(item.id)}
                  className={cx(
                    'prism-focus-ring inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium cursor-pointer transition-[color,background-color,border-color,opacity,transform]',
                    isVisible ? 'prism-crystal' : 'prism-well opacity-55 line-through'
                  )}
                  style={STYLE_TEXT_PRIMARY}
                >
                  <span
                    aria-hidden="true"
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{
                      backgroundColor: isVisible ? item.color : 'var(--prism-text-disabled)',
                    }}
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {isEmpty ? (
        <div
          role="status"
          data-testid="radar-spider-empty"
          className="prism-well rounded-2xl px-4 py-8 text-center text-xs font-medium"
          style={STYLE_TEXT_SECONDARY}
        >
          {axes.length < 3
            ? 'Provide at least 3 axes to render the radar chart.'
            : 'Provide at least 1 series to render the radar chart.'}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-center">
            <svg
              role="img"
              aria-label={`${title} radar chart`}
              data-testid="radar-spider-svg"
              viewBox={`0 0 ${clampedSize} ${clampedSize}`}
              width={clampedSize}
              height={clampedSize}
              style={{ width: `${clampedSize}px`, height: `${clampedSize}px` }}
              className={cx(svgClass, 'block overflow-visible', 'prism-contain-leaf')}
            >
              <g data-testid="radar-web-rings">
                {webRings.map((ring) => (
                  <g key={`ring-${ring.pct}`}>
                    <polygon
                      points={ring.points}
                      fill="none"
                      stroke="var(--prism-divider)"
                      strokeWidth={ring.level === 1 ? 1.25 : 1}
                      strokeDasharray={ring.level === 1 ? undefined : '3 3'}
                      data-level={String(ring.pct)}
                      data-testid={`radar-web-ring-${ring.pct}`}
                    />
                    {ring.level === 0.5 || ring.level === 1 ? (
                      <text
                        x={roundCoord(center + 4)}
                        y={roundCoord(ring.tickY + 3)}
                        aria-hidden="true"
                        pointerEvents="none"
                        fill="var(--prism-text-secondary)"
                        className="text-[9px] font-mono tabular-nums"
                      >
                        {ring.tickLabel}
                      </text>
                    ) : null}
                  </g>
                ))}
              </g>

              <g data-testid="radar-spokes">
                {computedAxes.map((axis) => {
                  const isSelected = activeAxisIndex === axis.index;
                  return (
                    <line
                      key={`spoke-${axis.key}`}
                      x1={center}
                      y1={center}
                      x2={axis.tipX}
                      y2={axis.tipY}
                      stroke={
                        isSelected ? 'var(--prism-primary-main)' : 'var(--prism-divider)'
                      }
                      strokeWidth={isSelected ? 1.75 : 1}
                      data-axis-index={String(axis.index)}
                      data-testid={`radar-spoke-${axis.index}`}
                    />
                  );
                })}
              </g>

              <g data-testid="radar-series-layer">
                {visibleSeries.map((item) => (
                  <g key={item.key} data-series-id={item.id}>
                    <polygon
                      points={item.polygonPoints}
                      fill={item.color}
                      fillOpacity={0.22}
                      stroke={item.color}
                      strokeWidth={2}
                      strokeLinejoin="round"
                      data-series-id={item.id}
                      data-testid={`radar-series-polygon-${item.id}`}
                    />
                    {item.vertices.map((vertex) => {
                      const isSelectedVertex = activeAxisIndex === vertex.axisIndex;
                      return (
                        <circle
                          key={vertex.key}
                          cx={vertex.x}
                          cy={vertex.y}
                          r={isSelectedVertex ? 4.5 : 3.25}
                          fill={item.color}
                          stroke="var(--prism-primary-contrast)"
                          strokeWidth={1.25}
                          data-axis-index={String(vertex.axisIndex)}
                          data-testid={`radar-vertex-${item.id}-${vertex.axisIndex}`}
                        />
                      );
                    })}
                  </g>
                ))}
              </g>

              <g data-testid="radar-axis-labels">
                {computedAxes.map((axis) => {
                  const isSelected = activeAxisIndex === axis.index;
                  return (
                    <text
                      key={axis.key}
                      x={axis.labelX}
                      y={axis.labelY}
                      textAnchor={axis.textAnchor}
                      dominantBaseline={axis.dominantBaseline}
                      role="button"
                      tabIndex={0}
                      aria-pressed={isSelected}
                      data-axis-index={String(axis.index)}
                      data-selected={isSelected ? 'true' : 'false'}
                      data-testid={`radar-axis-label-${axis.index}`}
                      fill={
                        isSelected
                          ? 'var(--prism-primary-main)'
                          : 'var(--prism-text-primary)'
                      }
                      className={cx(
                        'prism-focus-ring cursor-pointer text-[11px] select-none transition-colors',
                        isSelected ? 'font-bold' : 'font-medium'
                      )}
                      onClick={() => handleSelectAxis(axis.index, axis.label)}
                      onKeyDown={handleAxisKeyDown(axis.index, axis.label)}
                    >
                      {axis.label}
                    </text>
                  );
                })}
              </g>
            </svg>
          </div>

          <div
            data-testid="radar-axis-comparison"
            aria-live="polite"
            className={cx(
              comparisonClass,
              'prism-well rounded-xl px-3.5 py-2.5 space-y-2 text-xs'
            )}
            style={STYLE_TEXT_PRIMARY}
          >
            {allHidden ? (
              <div
                role="status"
                data-testid="radar-all-hidden"
                className="font-medium"
                style={STYLE_TEXT_SECONDARY}
              >
                All series hidden — toggle a series pill above to display radar profiles.
              </div>
            ) : selectedAxis ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold truncate">{selectedAxis.label}</span>
                  <span
                    className="shrink-0 font-mono tabular-nums"
                    style={STYLE_TEXT_SECONDARY}
                  >
                    {`Scale: 0–${formatNumeric(safeMax)}`}
                  </span>
                </div>

                <div className="space-y-1.5">
                  {visibleSeries.map((item) => {
                    const vertex = item.vertices[selectedAxis.index]!;
                    return (
                      <div
                        key={`cmp-${item.key}`}
                        data-testid={`radar-comparison-row-${item.id}`}
                        className="prism-crystal rounded-lg px-2.5 py-1.5 flex items-center justify-between gap-3"
                      >
                        <span className="inline-flex items-center gap-2 min-w-0">
                          <span
                            aria-hidden="true"
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="font-medium truncate">{item.label}</span>
                        </span>

                        <span className="inline-flex items-center gap-2.5 shrink-0">
                          <span
                            aria-hidden="true"
                            className="w-20 h-1.5 rounded-full overflow-hidden block"
                            style={STYLE_BG_DIVIDER}
                          >
                            <span
                              className="h-full rounded-full block"
                              style={{
                                width: `${vertex.pct}%`,
                                backgroundColor: item.color,
                              }}
                            />
                          </span>
                          <span className="font-mono font-semibold tabular-nums">
                            {`${formatNumeric(vertex.value)} / ${formatNumeric(safeMax)}`}
                          </span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <span style={STYLE_TEXT_SECONDARY}>
                  Select any axis label to compare visible series scores.
                </span>
                <span
                  className="shrink-0 font-mono font-medium tabular-nums"
                  style={STYLE_TEXT_SECONDARY}
                >
                  {`Max: ${formatNumeric(safeMax)}`}
                </span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export const RadarSpiderChart = /*#__PURE__*/ memoWithDisplayName(RadarSpiderChartInner, 'RadarSpiderChart');
