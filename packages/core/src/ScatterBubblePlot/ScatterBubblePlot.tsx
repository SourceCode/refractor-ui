'use client';

import { useId, useMemo, useState, type KeyboardEvent } from 'react';
import { ChartScatter } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { themeProps } from '../utils/themeProps';

export type ScatterTone = 'primary' | 'secondary' | 'emerald' | 'amber' | 'rose';

export interface ScatterPoint {
  /** Stable identifier for the point (used for keys, test IDs, and selection state). */
  id: string;
  /** Human-readable point label displayed in the readout and accessible descriptions. */
  label: string;
  /** Numeric X-axis coordinate (non-finite points are filtered out safely). */
  x: number;
  /** Numeric Y-axis coordinate (non-finite points are filtered out safely). */
  y: number;
  /** Optional positive bubble magnitude mapped to circle radii [6..20]. */
  size?: number;
  /** Optional category group name enabling interactive group filter pills. */
  group?: string;
  /** Optional semantic optical tone mapped to --prism-* CSS custom properties. */
  tone?: ScatterTone;
}

export interface ScatterBubblePlotProps extends BaseProps<HTMLDivElement> {
  /** Scatter or bubble coordinate points plotted in the 2D optical plane. */
  points: ScatterPoint[];
  /** Card heading linked to the SVG graphic (defaults to 'Scatter & Bubble Plot'). */
  title?: string;
  /** Label rendered along the horizontal X axis and readout (defaults to 'X Axis'). */
  xLabel?: string;
  /** Label rendered along the vertical Y axis and readout (defaults to 'Y Axis'). */
  yLabel?: string;
  /** Optional label for the bubble size dimension shown in the active readout. */
  sizeLabel?: string;
  /** SVG viewport height in pixels, clamped to [160, 520] (defaults to 260). */
  height?: number;
  /** Renders dashed horizontal and vertical midpoint quadrant lines when true (defaults to false). */
  showQuadrants?: boolean;
  /** Callback fired when a bubble is clicked or activated with Enter/Space. */
  onSelectPoint?: (point: ScatterPoint) => void;
}

interface NormalizedPoint {
  key: string;
  point: ScatterPoint;
  size: number | undefined;
  group: string | undefined;
  tone: ScatterTone;
  colorToken: string;
}

interface GroupFilterItem {
  key: string;
  name: string;
  tone: ScatterTone;
  colorToken: string;
}

interface PlottedBubble {
  key: string;
  point: ScatterPoint;
  size: number | undefined;
  group: string | undefined;
  tone: ScatterTone;
  colorToken: string;
  cx: number;
  cy: number;
  r: number;
}

interface AxisTick {
  key: string;
  pos: number;
  label: string;
}

interface AxisDomain {
  min: number;
  max: number;
}

const VIEW_WIDTH = 640;
const PAD_LEFT = 62;
const PAD_RIGHT = 24;
const PAD_TOP = 20;
const PAD_BOTTOM = 44;
const GRID_STEPS = 5;
const MIN_RADIUS = 6;
const MAX_RADIUS = 20;
const DEFAULT_RADIUS = 7;
const MID_RADIUS = 13;

function getDefaultTone(index: number): ScatterTone {
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

function getToneToken(tone: ScatterTone): string {
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
  const rounded = Math.round(value * 100) / 100;
  return String(rounded === 0 ? 0 : rounded);
}

function computeAxisDomain(values: ReadonlyArray<number>): AxisDomain {
  let rawMin = values[0]!;
  let rawMax = values[0]!;
  for (const val of values) {
    if (val < rawMin) rawMin = val;
    if (val > rawMax) rawMax = val;
  }

  if (rawMin === rawMax) {
    if (rawMax === 0) {
      return { min: -1, max: 1 };
    }
    const pad = Math.abs(rawMax) * 0.2;
    return { min: rawMin - pad, max: rawMax + pad };
  }

  const pad = (rawMax - rawMin) * 0.08;
  return { min: rawMin - pad, max: rawMax + pad };
}

function computeBubbleRadius(
  size: number | undefined,
  minSize: number,
  maxSize: number
): number {
  if (size === undefined) {
    return DEFAULT_RADIUS;
  }
  if (minSize === maxSize) {
    return MID_RADIUS;
  }
  const ratio = (size - minSize) / (maxSize - minSize);
  return MIN_RADIUS + ratio * (MAX_RADIUS - MIN_RADIUS);
}

export function ScatterBubblePlot({
  points,
  title = 'Scatter & Bubble Plot',
  xLabel = 'X Axis',
  yLabel = 'Y Axis',
  sizeLabel,
  height = 260,
  showQuadrants = false,
  onSelectPoint,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: ScatterBubblePlotProps) {
  const override = useComponentOverride('ScatterBubblePlot');
  const headingId = useId();
  const [hiddenGroups, setHiddenGroups] = useState<ReadonlySet<string>>(() => new Set());
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const safeHeight = Math.round(clampNumber(height, 160, 520, 260));
  const plotWidth = VIEW_WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = safeHeight - PAD_TOP - PAD_BOTTOM;

  const { validPoints, groups } = useMemo(() => {
    const idCounts = new Map<string, number>();
    const groupIndexMap = new Map<string, number>();
    const extractedGroups: GroupFilterItem[] = [];
    const normalized: NormalizedPoint[] = [];

    for (const point of points) {
      if (
        typeof point.x !== 'number' ||
        !Number.isFinite(point.x) ||
        typeof point.y !== 'number' ||
        !Number.isFinite(point.y)
      ) {
        continue;
      }

      const seen = idCounts.get(point.id) ?? 0;
      idCounts.set(point.id, seen + 1);
      const key = seen === 0 ? `pt:${point.id}` : `pt:${point.id}#${seen + 1}`;

      const trimmedGroup = point.group?.trim();
      const group = trimmedGroup ? trimmedGroup : undefined;

      let tone: ScatterTone;
      if (group !== undefined) {
        let groupIdx = groupIndexMap.get(group);
        if (groupIdx === undefined) {
          groupIdx = extractedGroups.length;
          groupIndexMap.set(group, groupIdx);
          const groupTone = point.tone ?? getDefaultTone(groupIdx);
          extractedGroups.push({
            key: `grp:${group}`,
            name: group,
            tone: groupTone,
            colorToken: getToneToken(groupTone),
          });
        }
        tone = point.tone ?? getDefaultTone(groupIdx);
      } else {
        tone = point.tone ?? getDefaultTone(normalized.length);
      }

      const validSize =
        typeof point.size === 'number' && Number.isFinite(point.size) && point.size > 0
          ? point.size
          : undefined;

      normalized.push({
        key,
        point,
        size: validSize,
        group,
        tone,
        colorToken: getToneToken(tone),
      });
    }

    return { validPoints: normalized, groups: extractedGroups };
  }, [points]);

  const visiblePoints = useMemo(
    () =>
      validPoints.filter(
        (item) => item.group === undefined || !hiddenGroups.has(item.group)
      ),
    [validPoints, hiddenGroups]
  );

  const isEmpty = validPoints.length === 0;
  const allHidden = !isEmpty && visiblePoints.length === 0;

  const geometry = useMemo(() => {
    if (visiblePoints.length === 0) {
      return {
        xTicks: [] as AxisTick[],
        yTicks: [] as AxisTick[],
        plotted: [] as PlottedBubble[],
        renderOrder: [] as PlottedBubble[],
      };
    }

    const xDomain = computeAxisDomain(visiblePoints.map((item) => item.point.x));
    const yDomain = computeAxisDomain(visiblePoints.map((item) => item.point.y));
    const xSpan = xDomain.max - xDomain.min;
    const ySpan = yDomain.max - yDomain.min;

    let minSize = Number.POSITIVE_INFINITY;
    let maxSize = Number.NEGATIVE_INFINITY;
    for (const item of visiblePoints) {
      if (item.size !== undefined) {
        if (item.size < minSize) minSize = item.size;
        if (item.size > maxSize) maxSize = item.size;
      }
    }

    const xTicks: AxisTick[] = [];
    const yTicks: AxisTick[] = [];
    for (let step = 0; step < GRID_STEPS; step += 1) {
      const fraction = step / (GRID_STEPS - 1);
      xTicks.push({
        key: `xtick-${step}`,
        pos: PAD_LEFT + fraction * plotWidth,
        label: formatNumber(xDomain.min + fraction * xSpan),
      });
      yTicks.push({
        key: `ytick-${step}`,
        pos: PAD_TOP + fraction * plotHeight,
        label: formatNumber(yDomain.max - fraction * ySpan),
      });
    }

    const plotted: PlottedBubble[] = visiblePoints.map((item) => {
      const cxVal = PAD_LEFT + ((item.point.x - xDomain.min) / xSpan) * plotWidth;
      const cyVal =
        PAD_TOP + plotHeight - ((item.point.y - yDomain.min) / ySpan) * plotHeight;
      const r = computeBubbleRadius(item.size, minSize, maxSize);
      return {
        key: item.key,
        point: item.point,
        size: item.size,
        group: item.group,
        tone: item.tone,
        colorToken: item.colorToken,
        cx: cxVal,
        cy: cyVal,
        r,
      };
    });

    const renderOrder = [...plotted].sort((a, b) => b.r - a.r);

    return { xTicks, yTicks, plotted, renderOrder };
  }, [visiblePoints, plotWidth, plotHeight]);

  const resolvedActive = useMemo<PlottedBubble | null>(() => {
    if (geometry.plotted.length === 0) return null;
    if (selectedKey !== null) {
      const matched = geometry.plotted.find((item) => item.key === selectedKey);
      if (matched) return matched;
    }
    return geometry.plotted[0]!;
  }, [geometry.plotted, selectedKey]);

  const handleToggleGroup = (groupName: string) => {
    setHiddenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupName)) {
        next.delete(groupName);
      } else {
        next.add(groupName);
      }
      return next;
    });
  };

  const handleSelectBubble = (bubble: PlottedBubble) => {
    setSelectedKey(bubble.key);
    onSelectPoint?.(bubble.point);
  };

  const handleBubbleKeyDown = (
    event: KeyboardEvent<SVGCircleElement>,
    bubble: PlottedBubble
  ) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSelectBubble(bubble);
    }
  };

  const merged = mergeProps({
    themeTarget: themeProps('scatter-bubble-plot', {
      quadrants: showQuadrants,
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

  const headerClass = stableClassName('scatter-bubble-plot', 'header');
  const filtersClass = stableClassName('scatter-bubble-plot', 'filters');
  const canvasClass = stableClassName('scatter-bubble-plot', 'canvas');
  const readoutClass = stableClassName('scatter-bubble-plot', 'readout');
  const resolvedSizeLabel = sizeLabel?.trim() || 'Size';
  const midX = PAD_LEFT + plotWidth / 2;
  const midY = PAD_TOP + plotHeight / 2;

  return (
    <div ref={ref} {...rest} {...merged}>
      <div className={cx(headerClass, 'flex flex-wrap items-center justify-between gap-3')}>
        <div className="min-w-0 flex items-center gap-2.5">
          <span
            className="prism-well w-8 h-8 rounded-full inline-flex items-center justify-center shrink-0"
            style={{ color: 'var(--prism-primary-main)' }}
          >
            <ChartScatter aria-hidden="true" className="w-4 h-4 shrink-0" />
          </span>
          <h4
            id={headingId}
            className="text-sm font-semibold truncate"
            style={{ color: 'var(--prism-text-primary)' }}
          >
            {title}
          </h4>
        </div>

        {groups.length > 0 ? (
          <div
            role="group"
            aria-label="Filter scatter groups"
            data-testid="scatter-group-filters"
            className={cx(filtersClass, 'flex flex-wrap items-center gap-1.5')}
          >
            {groups.map((grp) => {
              const isVisible = !hiddenGroups.has(grp.name);
              return (
                <button
                  key={grp.key}
                  type="button"
                  aria-pressed={isVisible}
                  data-testid={`scatter-group-${grp.name}`}
                  data-tone={grp.tone}
                  onClick={() => handleToggleGroup(grp.name)}
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
                      backgroundColor: isVisible
                        ? grp.colorToken
                        : 'var(--prism-text-disabled)',
                    }}
                  />
                  <span>{grp.name}</span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {resolvedActive === null ? (
        <div
          data-testid="scatter-plot-empty"
          className="prism-well rounded-2xl px-4 py-8 text-center text-xs"
          style={{ color: 'var(--prism-text-secondary)' }}
        >
          {isEmpty
            ? 'No valid scatter points available.'
            : 'All groups hidden — toggle a group filter above to display points.'}
        </div>
      ) : (
        <>
          <div className={cx(canvasClass, 'prism-well rounded-2xl p-3')}>
            <svg
              role="img"
              aria-labelledby={headingId}
              aria-label={`${title} scatter and bubble plot`}
              data-testid="scatter-plot-svg"
              viewBox={`0 0 ${VIEW_WIDTH} ${safeHeight}`}
              className="w-full overflow-visible block"
              style={{ height: `${safeHeight}px` }}
            >
              {geometry.yTicks.map((tick) => (
                <g key={tick.key} data-testid="scatter-gridline-y">
                  <line
                    x1={PAD_LEFT}
                    y1={tick.pos}
                    x2={VIEW_WIDTH - PAD_RIGHT}
                    y2={tick.pos}
                    stroke="var(--prism-divider)"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={PAD_LEFT - 10}
                    y={tick.pos + 3.5}
                    textAnchor="end"
                    className="text-[10px] font-mono tabular-nums"
                    style={{ fill: 'var(--prism-text-secondary)' }}
                  >
                    {tick.label}
                  </text>
                </g>
              ))}

              {geometry.xTicks.map((tick) => (
                <g key={tick.key} data-testid="scatter-gridline-x">
                  <line
                    x1={tick.pos}
                    y1={PAD_TOP}
                    x2={tick.pos}
                    y2={PAD_TOP + plotHeight}
                    stroke="var(--prism-divider)"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={tick.pos}
                    y={PAD_TOP + plotHeight + 16}
                    textAnchor="middle"
                    className="text-[10px] font-mono tabular-nums"
                    style={{ fill: 'var(--prism-text-secondary)' }}
                  >
                    {tick.label}
                  </text>
                </g>
              ))}

              {showQuadrants ? (
                <g data-testid="scatter-quadrants">
                  <line
                    data-testid="scatter-quadrant-x"
                    x1={midX}
                    y1={PAD_TOP}
                    x2={midX}
                    y2={PAD_TOP + plotHeight}
                    stroke="var(--prism-text-secondary)"
                    strokeWidth="1.25"
                    strokeDasharray="6 4"
                    strokeOpacity={0.55}
                  />
                  <line
                    data-testid="scatter-quadrant-y"
                    x1={PAD_LEFT}
                    y1={midY}
                    x2={VIEW_WIDTH - PAD_RIGHT}
                    y2={midY}
                    stroke="var(--prism-text-secondary)"
                    strokeWidth="1.25"
                    strokeDasharray="6 4"
                    strokeOpacity={0.55}
                  />
                </g>
              ) : null}

              <text
                data-testid="scatter-x-axis-label"
                x={midX}
                y={safeHeight - 8}
                textAnchor="middle"
                className="text-[11px] font-medium"
                style={{ fill: 'var(--prism-text-secondary)' }}
              >
                {xLabel}
              </text>

              <text
                data-testid="scatter-y-axis-label"
                x={16}
                y={midY}
                textAnchor="middle"
                transform={`rotate(-90 16 ${midY})`}
                className="text-[11px] font-medium"
                style={{ fill: 'var(--prism-text-secondary)' }}
              >
                {yLabel}
              </text>

              {geometry.renderOrder.map((bubble) => {
                const isSelected = resolvedActive.key === bubble.key;
                const sizeText =
                  bubble.size !== undefined
                    ? `, ${resolvedSizeLabel}: ${formatNumber(bubble.size)}`
                    : '';
                return (
                  <g key={bubble.key}>
                    {isSelected ? (
                      <circle
                        data-testid={`scatter-active-ring-${bubble.point.id}`}
                        cx={bubble.cx}
                        cy={bubble.cy}
                        r={bubble.r + 4}
                        fill="none"
                        stroke={bubble.colorToken}
                        strokeWidth={2}
                        strokeOpacity={0.9}
                        pointerEvents="none"
                      />
                    ) : null}
                    <circle
                      role="button"
                      tabIndex={0}
                      aria-label={`${bubble.point.label}, ${xLabel}: ${formatNumber(bubble.point.x)}, ${yLabel}: ${formatNumber(bubble.point.y)}${sizeText}`}
                      aria-pressed={isSelected}
                      data-testid={`scatter-point-${bubble.point.id}`}
                      data-tone={bubble.tone}
                      cx={bubble.cx}
                      cy={bubble.cy}
                      r={bubble.r}
                      fill={bubble.colorToken}
                      fillOpacity={0.72}
                      stroke={bubble.colorToken}
                      strokeWidth={isSelected ? 2.5 : 1.5}
                      className="prism-focus-ring cursor-pointer transition-all"
                      onClick={() => handleSelectBubble(bubble)}
                      onKeyDown={(event) => handleBubbleKeyDown(event, bubble)}
                    />
                  </g>
                );
              })}
            </svg>
          </div>

          <div
            aria-live="polite"
            data-testid="scatter-plot-readout"
            className={cx(
              readoutClass,
              'prism-well rounded-xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs'
            )}
          >
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <span
                aria-hidden="true"
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: resolvedActive.colorToken }}
              />
              <span
                className="font-semibold truncate"
                style={{ color: 'var(--prism-text-primary)' }}
              >
                {resolvedActive.point.label}
              </span>
              <span
                className="font-mono tabular-nums"
                style={{ color: 'var(--prism-text-secondary)' }}
              >
                · {xLabel}: {formatNumber(resolvedActive.point.x)} · {yLabel}:{' '}
                {formatNumber(resolvedActive.point.y)}
                {resolvedActive.size !== undefined
                  ? ` · ${resolvedSizeLabel}: ${formatNumber(resolvedActive.size)}`
                  : ''}
              </span>
            </div>

            {resolvedActive.group ? (
              <span
                className="prism-crystal rounded-full px-2 py-0.5 text-[11px] font-medium shrink-0"
                style={{ color: 'var(--prism-text-primary)' }}
              >
                {resolvedActive.group}
              </span>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

ScatterBubblePlot.displayName = 'ScatterBubblePlot';
