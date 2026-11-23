'use client';

import {
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import { Crosshair, Pin, PinOff } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { STYLE_FILL_SECONDARY, STYLE_PRIMARY_MAIN, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export type CrosshairTone = 'primary' | 'secondary' | 'emerald' | 'amber' | 'rose';

export interface CrosshairSeries {
  /** Stable series identifier returned in crosshair snapshots and test attributes. */
  id: string;
  /** Human-readable series name shown inside the floating glassmorphic tooltip. */
  label: string;
  /** Numeric data values aligned by index with the chart `labels` array. */
  values: number[];
  /** Optional semantic optical tone mapped to --prism-* CSS custom properties. */
  tone?: CrosshairTone;
  /** Optional unit suffix appended to formatted tooltip values (e.g. 'ms', '%'). */
  unit?: string;
}

export interface CrosshairSnapshotItem {
  seriesId: string;
  label: string;
  value: number;
  unit: string;
  delta: number | null;
  tone: CrosshairTone;
}

export interface CrosshairSnapshot {
  index: number;
  label: string;
  items: CrosshairSnapshotItem[];
}

export interface ChartCrosshairTooltipProps extends BaseProps<HTMLDivElement> {
  /** Ordered X-axis tick labels. */
  labels: string[];
  /** One or more numeric data series aligned with `labels`. */
  series: CrosshairSeries[];
  /** Card heading linked to the interactive chart SVG (defaults to 'Crosshair Multi-Series Inspector'). */
  title?: string;
  /** Controlled active column index (null clears active crosshair and tooltip). */
  activeIndex?: number | null;
  /** Uncontrolled initial active column index (defaults to null). */
  defaultActiveIndex?: number | null;
  /** Renders a horizontal dashed guide snapped to the primary series Y coordinate (defaults to true). */
  showHorizontalGuide?: boolean;
  /** Chart SVG height in pixels, clamped to [160, 460] (defaults to 240). */
  height?: number;
  /** Callback fired whenever the active inspected column changes or clears. */
  onActiveIndexChange?: (snapshot: CrosshairSnapshot | null) => void;
}

interface NormalizedLabel {
  key: string;
  label: string;
  index: number;
  x: number;
  hitX: number;
  hitWidth: number;
}

interface SeriesObservation {
  key: string;
  index: number;
  label: string;
  x: number;
  value: number;
  delta: number | null;
}

interface NormalizedSeries {
  key: string;
  id: string;
  label: string;
  tone: CrosshairTone;
  colorToken: string;
  unit: string;
  observations: SeriesObservation[];
}

interface PlottedPoint {
  key: string;
  index: number;
  label: string;
  value: number;
  delta: number | null;
  x: number;
  y: number;
}

interface PlottedSeries {
  series: NormalizedSeries;
  points: PlottedPoint[];
  polylinePoints: string;
}

interface GridTick {
  key: string;
  y: number;
  label: string;
}

interface TooltipRow {
  key: string;
  colorToken: string;
  item: CrosshairSnapshotItem;
}

interface HaloPoint {
  key: string;
  seriesId: string;
  colorToken: string;
  x: number;
  y: number;
}

interface ColumnInspection {
  label: NormalizedLabel;
  snapshot: CrosshairSnapshot;
  rows: TooltipRow[];
  haloPoints: HaloPoint[];
  primaryY: number;
  tooltipSide: 'left' | 'right';
  tooltipOffsetPercent: string;
}

const VIEW_WIDTH = 600;
const PAD_LEFT = 52;
const PAD_RIGHT = 20;
const PAD_TOP = 18;
const PAD_BOTTOM = 30;
const GRID_STEPS = 4;
const MIN_HEIGHT = 160;
const MAX_HEIGHT = 460;
const DEFAULT_HEIGHT = 240;

function getDefaultTone(index: number): CrosshairTone {
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

function getToneToken(tone: CrosshairTone): string {
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

function hasAnyFiniteValue(
  labelCount: number,
  series: ReadonlyArray<CrosshairSeries>
): boolean {
  if (labelCount <= 0 || series.length === 0) return false;
  for (const s of series) {
    const limit = Math.min(labelCount, s.values.length);
    for (let i = 0; i < limit; i += 1) {
      const val = s.values[i];
      if (typeof val === 'number' && Number.isFinite(val)) {
        return true;
      }
    }
  }
  return false;
}

function sanitizeFinite(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function normalizeIndex(
  index: number | null | undefined,
  labelCount: number
): number | null {
  if (
    index === null ||
    index === undefined ||
    labelCount <= 0 ||
    !Number.isFinite(index)
  ) {
    return null;
  }
  return Math.round(clampNumber(index, 0, labelCount - 1, 0));
}

function roundValue(value: number): number {
  const rounded = Math.round(value * 100) / 100;
  return rounded === 0 ? 0 : rounded;
}

function formatAxisTick(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  const safe = rounded === 0 ? 0 : rounded;
  return Number.isInteger(safe) ? String(safe) : safe.toFixed(1);
}

function formatTabularValue(value: number, unit: string): string {
  const num = String(roundValue(value));
  return unit ? `${num} ${unit}` : num;
}

function formatDelta(delta: number | null): string {
  if (delta === null) return '—';
  if (delta > 0) return `+${delta}`;
  return String(delta);
}

function getDeltaColor(delta: number | null): string {
  if (delta === null || delta === 0) return 'var(--prism-text-secondary)';
  return delta > 0 ? 'var(--prism-success-main)' : 'var(--prism-error-main)';
}

function computeYDomain(seriesList: ReadonlyArray<NormalizedSeries>): {
  min: number;
  max: number;
} {
  let rawMin = Number.POSITIVE_INFINITY;
  let rawMax = Number.NEGATIVE_INFINITY;

  for (const s of seriesList) {
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

const headerClass = /*#__PURE__*/ stableClassName('chart-crosshair-tooltip', 'header');
const stageClass = /*#__PURE__*/ stableClassName('chart-crosshair-tooltip', 'stage');
const tooltipClass = /*#__PURE__*/ stableClassName('chart-crosshair-tooltip', 'tooltip');
const emptyClass = /*#__PURE__*/ stableClassName('chart-crosshair-tooltip', 'empty');

function ChartCrosshairTooltipInner({
  labels,
  series,
  title = 'Crosshair Multi-Series Inspector',
  activeIndex,
  defaultActiveIndex = null,
  showHorizontalGuide = true,
  height = DEFAULT_HEIGHT,
  onActiveIndexChange,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: ChartCrosshairTooltipProps) {
  const override = useComponentOverride('ChartCrosshairTooltip');
  const headingId = useId();
  const columnRefs = useRef<Map<number, SVGRectElement>>(new Map());

  const isControlled = activeIndex !== undefined;
  const [uncontrolledIndex, setUncontrolledIndex] = useState<number | null>(() =>
    normalizeIndex(defaultActiveIndex, labels.length)
  );
  const [pinnedIndex, setPinnedIndex] = useState<number | null>(null);

  const safeHeight = Math.round(
    clampNumber(height, MIN_HEIGHT, MAX_HEIGHT, DEFAULT_HEIGHT)
  );
  const plotWidth = VIEW_WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = safeHeight - PAD_TOP - PAD_BOTTOM;

  const isEmpty = useMemo(
    () => !hasAnyFiniteValue(labels.length, series),
    [labels.length, series]
  );

  const normalizedLabels = useMemo<NormalizedLabel[]>(() => {
    const counts = new Map<string, number>();
    const count = labels.length;
    const step = count > 1 ? plotWidth / (count - 1) : plotWidth;

    return labels.map((label, index) => {
      const seen = counts.get(label) ?? 0;
      counts.set(label, seen + 1);
      const key = seen === 0 ? `lbl:${label}` : `lbl:${label}#${seen + 1}`;
      const x =
        count <= 1
          ? PAD_LEFT + plotWidth / 2
          : PAD_LEFT + (index / (count - 1)) * plotWidth;
      const leftEdge = count <= 1 || index === 0 ? PAD_LEFT : x - step / 2;
      const rightEdge =
        count <= 1 || index === count - 1
          ? VIEW_WIDTH - PAD_RIGHT
          : x + step / 2;
      return {
        key,
        label,
        index,
        x,
        hitX: leftEdge,
        hitWidth: Math.max(1, rightEdge - leftEdge),
      };
    });
  }, [labels, plotWidth]);

  const normalizedSeries = useMemo<NormalizedSeries[]>(() => {
    const counts = new Map<string, number>();
    return series.map((item, idx) => {
      const seen = counts.get(item.id) ?? 0;
      counts.set(item.id, seen + 1);
      const key = seen === 0 ? `ser:${item.id}` : `ser:${item.id}#${seen + 1}`;
      const tone = item.tone ?? getDefaultTone(idx);
      const unit = item.unit ? item.unit.trim() : '';

      let prevValue: number | null = null;
      const observations: SeriesObservation[] = normalizedLabels.map((lbl) => {
        const value = sanitizeFinite(item.values[lbl.index]);
        const delta = prevValue === null ? null : roundValue(value - prevValue);
        prevValue = value;
        return {
          key: `${key}::${lbl.key}`,
          index: lbl.index,
          label: lbl.label,
          x: lbl.x,
          value,
          delta,
        };
      });

      return {
        key,
        id: item.id,
        label: item.label,
        tone,
        colorToken: getToneToken(tone),
        unit,
        observations,
      };
    });
  }, [series, normalizedLabels]);

  const domain = useMemo(
    () => computeYDomain(normalizedSeries),
    [normalizedSeries]
  );
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
        label: formatAxisTick(tickVal),
      });
    }
    return ticks;
  }, [domain.max, plotHeight, span]);

  const plottedSeries = useMemo<PlottedSeries[]>(() => {
    return normalizedSeries.map((s) => {
      const points: PlottedPoint[] = s.observations.map((obs) => {
        const ratio = (obs.value - domain.min) / span;
        const y = PAD_TOP + plotHeight - ratio * plotHeight;
        return {
          key: obs.key,
          index: obs.index,
          label: obs.label,
          value: obs.value,
          delta: obs.delta,
          x: obs.x,
          y,
        };
      });
      const polylinePoints = points
        .map((pt) => `${pt.x.toFixed(2)},${pt.y.toFixed(2)}`)
        .join(' ');
      return {
        series: s,
        points,
        polylinePoints,
      };
    });
  }, [normalizedSeries, domain.min, span, plotHeight]);

  const columnMap = useMemo<ReadonlyMap<number, ColumnInspection>>(() => {
    const map = new Map<number, ColumnInspection>();
    for (const lbl of normalizedLabels) {
      const items: CrosshairSnapshotItem[] = [];
      const rows: TooltipRow[] = [];
      const haloPoints: HaloPoint[] = [];
      let primaryY = PAD_TOP;
      let hasPrimaryY = false;

      for (const ps of plottedSeries) {
        for (const pt of ps.points) {
          if (pt.index === lbl.index) {
            const item: CrosshairSnapshotItem = {
              seriesId: ps.series.id,
              label: ps.series.label,
              value: pt.value,
              unit: ps.series.unit,
              delta: pt.delta,
              tone: ps.series.tone,
            };
            items.push(item);
            rows.push({
              key: ps.series.key,
              colorToken: ps.series.colorToken,
              item,
            });
            haloPoints.push({
              key: ps.series.key,
              seriesId: ps.series.id,
              colorToken: ps.series.colorToken,
              x: pt.x,
              y: pt.y,
            });
            if (!hasPrimaryY) {
              primaryY = pt.y;
              hasPrimaryY = true;
            }
          }
        }
      }

      const xPercent = (lbl.x / VIEW_WIDTH) * 100;
      const tooltipSide: 'left' | 'right' = xPercent > 55 ? 'left' : 'right';
      const offsetPercent =
        tooltipSide === 'left'
          ? clampNumber(100 - xPercent + 2.5, 2, 62, 12)
          : clampNumber(xPercent + 2.5, 2, 62, 12);

      map.set(lbl.index, {
        label: lbl,
        snapshot: {
          index: lbl.index,
          label: lbl.label,
          items,
        },
        rows,
        haloPoints,
        primaryY,
        tooltipSide,
        tooltipOffsetPercent: `${offsetPercent.toFixed(1)}%`,
      });
    }
    return map;
  }, [normalizedLabels, plottedSeries]);

  const resolvedIndex = isEmpty
    ? null
    : normalizeIndex(
        isControlled ? activeIndex : uncontrolledIndex,
        normalizedLabels.length
      );

  const effectivePinnedIndex =
    !isEmpty && pinnedIndex !== null && pinnedIndex < normalizedLabels.length
      ? pinnedIndex
      : null;

  const isPinned =
    effectivePinnedIndex !== null &&
    resolvedIndex !== null &&
    effectivePinnedIndex === resolvedIndex;

  const activeColumn =
    (resolvedIndex === null ? undefined : columnMap.get(resolvedIndex)) ?? null;

  const selectIndex = (nextIndex: number | null) => {
    if (nextIndex === resolvedIndex) {
      return;
    }
    if (!isControlled) {
      setUncontrolledIndex(nextIndex);
    }
    const col = nextIndex === null ? undefined : columnMap.get(nextIndex);
    onActiveIndexChange?.(col ? col.snapshot : null);
  };

  const clearSelection = () => {
    setPinnedIndex(null);
    selectIndex(null);
  };

  const handleColumnClick = (index: number) => {
    if (effectivePinnedIndex === index) {
      clearSelection();
      return;
    }
    setPinnedIndex(index);
    selectIndex(index);
  };

  const handleColumnFocus = (index: number) => {
    if (effectivePinnedIndex !== null) return;
    selectIndex(index);
  };

  const moveKeyboardTo = (nextIndex: number) => {
    if (effectivePinnedIndex !== null) {
      setPinnedIndex(nextIndex);
    }
    selectIndex(nextIndex);
    columnRefs.current.get(nextIndex)?.focus();
  };

  const handleColumnKeyDown = (
    event: KeyboardEvent<SVGRectElement>,
    index: number
  ) => {
    if (event.nativeEvent.isComposing) return;

    const lastIndex = normalizedLabels.length - 1;
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      moveKeyboardTo(Math.min(lastIndex, index + 1));
      return;
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      moveKeyboardTo(Math.max(0, index - 1));
      return;
    }
    if (event.key === 'Home') {
      event.preventDefault();
      moveKeyboardTo(0);
      return;
    }
    if (event.key === 'End') {
      event.preventDefault();
      moveKeyboardTo(lastIndex);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      clearSelection();
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleColumnClick(index);
    }
  };

  const handleSvgPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (effectivePinnedIndex !== null) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return;

    const relativeX = ((event.clientX - rect.left) / rect.width) * VIEW_WIDTH;
    const count = normalizedLabels.length;
    if (count <= 1) {
      selectIndex(0);
      return;
    }
    const ratio = clampNumber((relativeX - PAD_LEFT) / plotWidth, 0, 1, 0);
    const nearest = Math.round(ratio * (count - 1));
    selectIndex(nearest);
  };

  const handleSvgPointerLeave = () => {
    if (effectivePinnedIndex !== null) return;
    selectIndex(null);
  };

  const merged = mergeProps({
    themeTarget: themeProps('chart-crosshair-tooltip', {
      empty: isEmpty,
      active: activeColumn !== null,
      pinned: isPinned,
      horizontalGuide: showHorizontalGuide,
    }),
    baseClassName: 'prism-slab p-5 w-full space-y-4',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });


  return (
    <div ref={ref} {...rest} {...merged}>
      <div className={cx(headerClass, 'flex flex-wrap items-center justify-between gap-3')}>
        <div className="min-w-0 flex items-center gap-2.5">
          <span
            className="prism-well w-8 h-8 rounded-full inline-flex items-center justify-center shrink-0"
            style={STYLE_PRIMARY_MAIN}
          >
            <Crosshair aria-hidden="true" className="w-4 h-4 shrink-0" />
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
          <div className="flex flex-wrap items-center gap-2">
            {activeColumn ? (
              <>
                <span
                  data-testid="crosshair-active-badge"
                  className="prism-crystal rounded-full px-2.5 py-1 text-xs font-mono font-medium tabular-nums"
                  style={STYLE_TEXT_PRIMARY}
                >
                  {activeColumn.snapshot.label}
                </span>

                {isPinned ? (
                  <button
                    type="button"
                    data-testid="crosshair-pin-button"
                    aria-pressed={true}
                    onClick={clearSelection}
                    className="prism-emerald prism-focus-ring inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium cursor-pointer transition-[color,background-color,border-color,opacity,transform]"
                  >
                    <PinOff aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                    <span>Pinned · Unpin</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    data-testid="crosshair-pin-button"
                    aria-pressed={false}
                    onClick={() => setPinnedIndex(activeColumn.snapshot.index)}
                    className="prism-crystal prism-focus-ring inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium cursor-pointer transition-[color,background-color,border-color,opacity,transform]"
                    style={STYLE_TEXT_PRIMARY}
                  >
                    <Pin aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                    <span>Pin</span>
                  </button>
                )}
              </>
            ) : (
              <span
                data-testid="crosshair-idle-hint"
                className="prism-well rounded-full px-2.5 py-1 text-xs"
                style={STYLE_TEXT_SECONDARY}
              >
                Hover or focus to inspect
              </span>
            )}
          </div>
        ) : null}
      </div>

      {isEmpty ? (
        <div
          role="status"
          data-testid="crosshair-empty"
          className={cx(
            emptyClass,
            'prism-well rounded-2xl px-4 py-8 text-center text-xs'
          )}
          style={STYLE_TEXT_SECONDARY}
        >
          No finite series data available to inspect.
        </div>
      ) : (
        <div className={cx(stageClass, 'prism-well relative rounded-2xl p-3')}>
          <svg
            role="img"
            aria-labelledby={headingId}
            aria-label={`${title} crosshair inspector chart`}
            data-testid="crosshair-svg"
            viewBox={`0 0 ${VIEW_WIDTH} ${safeHeight}`}
            className="w-full overflow-visible block select-none prism-contain-leaf"
            style={{ height: `${safeHeight}px` }}
            onPointerMove={handleSvgPointerMove}
            onPointerLeave={handleSvgPointerLeave}
          >
            {gridTicks.map((tick) => (
              <g key={tick.key} data-testid="crosshair-gridline">
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

            {normalizedLabels.map((lbl) => (
              <text
                key={lbl.key}
                x={lbl.x}
                y={safeHeight - 8}
                textAnchor="middle"
                className="text-[10px] font-medium"
                style={{
                  fill:
                    resolvedIndex === lbl.index
                      ? 'var(--prism-text-primary)'
                      : 'var(--prism-text-secondary)',
                }}
              >
                {lbl.label}
              </text>
            ))}

            {plottedSeries.map((ps) => (
              <g key={ps.series.key} data-series-id={ps.series.id}>
                <polyline
                  data-testid={`crosshair-series-${ps.series.id}`}
                  points={ps.polylinePoints}
                  fill="none"
                  stroke={ps.series.colorToken}
                  strokeWidth="2.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  pointerEvents="none"
                />
                {ps.points.map((pt) => {
                  const isPointActive = resolvedIndex === pt.index;
                  return (
                    <circle
                      key={pt.key}
                      data-testid={`crosshair-point-${ps.series.id}-${pt.index}`}
                      cx={pt.x}
                      cy={pt.y}
                      r={isPointActive ? 5 : 3.5}
                      fill={
                        isPointActive
                          ? ps.series.colorToken
                          : 'var(--prism-primary-contrast)'
                      }
                      stroke={
                        isPointActive
                          ? 'var(--prism-primary-contrast)'
                          : ps.series.colorToken
                      }
                      strokeWidth="2"
                      pointerEvents="none"
                    />
                  );
                })}
              </g>
            ))}

            {activeColumn ? (
              <g data-testid="crosshair-guides" pointerEvents="none">
                <line
                  data-testid="crosshair-vertical-guide"
                  x1={activeColumn.label.x}
                  y1={PAD_TOP}
                  x2={activeColumn.label.x}
                  y2={safeHeight - PAD_BOTTOM}
                  stroke="var(--prism-primary-main)"
                  strokeWidth="1.5"
                  strokeDasharray="4 3"
                />
                {showHorizontalGuide ? (
                  <line
                    data-testid="crosshair-horizontal-guide"
                    x1={PAD_LEFT}
                    y1={activeColumn.primaryY}
                    x2={VIEW_WIDTH - PAD_RIGHT}
                    y2={activeColumn.primaryY}
                    stroke="var(--prism-primary-main)"
                    strokeWidth="1.25"
                    strokeDasharray="4 3"
                    strokeOpacity="0.65"
                  />
                ) : null}
                {activeColumn.haloPoints.map((hp) => (
                  <circle
                    key={hp.key}
                    data-testid={`crosshair-halo-${hp.seriesId}`}
                    cx={hp.x}
                    cy={hp.y}
                    r={9}
                    fill={hp.colorToken}
                    fillOpacity={0.2}
                    stroke={hp.colorToken}
                    strokeOpacity={0.5}
                    strokeWidth="1.5"
                  />
                ))}
              </g>
            ) : null}

            {normalizedLabels.map((lbl) => {
              const isColumnPinned = isPinned && resolvedIndex === lbl.index;
              return (
                <rect
                  key={lbl.key}
                  ref={(el) => {
                    if (el) {
                      columnRefs.current.set(lbl.index, el);
                    } else {
                      columnRefs.current.delete(lbl.index);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`Inspect ${lbl.label}`}
                  aria-pressed={isColumnPinned}
                  data-testid={`crosshair-column-${lbl.index}`}
                  data-active={resolvedIndex === lbl.index ? 'true' : undefined}
                  data-pinned={isColumnPinned ? 'true' : undefined}
                  x={lbl.hitX}
                  y={PAD_TOP}
                  width={lbl.hitWidth}
                  height={plotHeight}
                  fill="transparent"
                  className="prism-focus-ring cursor-pointer outline-none"
                  onClick={() => handleColumnClick(lbl.index)}
                  onFocus={() => handleColumnFocus(lbl.index)}
                  onKeyDown={(event) => handleColumnKeyDown(event, lbl.index)}
                />
              );
            })}
          </svg>

          {activeColumn ? (
            <div
              role="status"
              aria-live="polite"
              data-testid="crosshair-tooltip"
              data-side={activeColumn.tooltipSide}
              className={cx(
                tooltipClass,
                'prism-slab static mt-3 sm:mt-0 sm:absolute z-10 pointer-events-none w-full sm:w-auto sm:min-w-[196px] sm:max-w-[260px] rounded-2xl p-3 space-y-2'
              )}
              style={
                activeColumn.tooltipSide === 'left'
                  ? { top: '12px', right: activeColumn.tooltipOffsetPercent }
                  : { top: '12px', left: activeColumn.tooltipOffsetPercent }
              }
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  data-testid="crosshair-tooltip-label"
                  className="text-xs font-semibold truncate"
                  style={STYLE_TEXT_PRIMARY}
                >
                  {activeColumn.snapshot.label}
                </span>
                <span
                  data-testid="crosshair-tooltip-mode"
                  className="prism-well rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0"
                  style={{
                    color: isPinned
                      ? 'var(--prism-success-main)'
                      : 'var(--prism-text-secondary)',
                  }}
                >
                  {isPinned ? 'Pinned' : 'Live'}
                </span>
              </div>

              <div className="space-y-1.5">
                {activeColumn.rows.map((row) => (
                  <div
                    key={row.key}
                    data-testid={`crosshair-tooltip-row-${row.item.seriesId}`}
                    className="prism-well rounded-xl px-2.5 py-1.5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: row.colorToken }}
                      />
                      <span
                        className="truncate font-medium"
                        style={STYLE_TEXT_PRIMARY}
                      >
                        {row.item.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 font-mono tabular-nums">
                      <span
                        data-testid={`crosshair-value-${row.item.seriesId}`}
                        className="font-semibold"
                        style={STYLE_TEXT_PRIMARY}
                      >
                        {formatTabularValue(row.item.value, row.item.unit)}
                      </span>
                      <span
                        data-testid={`crosshair-delta-${row.item.seriesId}`}
                        className="text-[11px]"
                        style={{ color: getDeltaColor(row.item.delta) }}
                      >
                        {formatDelta(row.item.delta)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

export const ChartCrosshairTooltip = /*#__PURE__*/ memoWithDisplayName(ChartCrosshairTooltipInner, 'ChartCrosshairTooltip');
