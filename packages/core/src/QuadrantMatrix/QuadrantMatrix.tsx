'use client';

import {
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { themeProps } from '../utils/themeProps';

export type QuadrantZoneId = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface QuadrantLabels {
  /** Label for the high-Y, low-X quadrant (default 'Quick Wins'). */
  topLeft: string;
  /** Label for the high-Y, high-X quadrant (default 'Major Bets'). */
  topRight: string;
  /** Label for the low-Y, low-X quadrant (default 'Fill-Ins'). */
  bottomLeft: string;
  /** Label for the low-Y, high-X quadrant (default 'Reconsider'). */
  bottomRight: string;
}

export interface QuadrantItem {
  /** Stable unique identifier for this strategic initiative. */
  id: string;
  /** Concise human-readable title rendered beside the bubble and in the inspector. */
  label: string;
  /** Horizontal axis coordinate in 0..100 (clamped safely if out of bounds). */
  x: number;
  /** Vertical axis coordinate in 0..100 (clamped safely if out of bounds). */
  y: number;
  /** Optional positive scope/importance weight scaling bubble radius gently. */
  weight?: number;
  /** Optional strategic rationale shown in the recessed live inspector. */
  summary?: string;
}

export interface QuadrantSelection extends QuadrantItem {
  /** Resolved 2×2 quadrant zone identifier determined from (splitX, splitY). */
  quadrant: QuadrantZoneId;
  /** Resolved human-readable label for the item's quadrant zone. */
  quadrantLabel: string;
}

export interface QuadrantMatrixProps extends BaseProps<HTMLDivElement> {
  /** Strategic initiatives plotted in the 2×2 matrix; defaults to 8 roadmap items across all 4 quadrants when omitted. */
  items?: ReadonlyArray<QuadrantItem>;
  /** Horizontal axis title (defaults to 'Implementation Effort'). */
  xLabel?: string;
  /** Vertical axis title (defaults to 'Strategic Impact'). */
  yLabel?: string;
  /** Optional partial label overrides for any of the 4 quadrant zones. */
  quadrantLabels?: Partial<QuadrantLabels>;
  /** Vertical quadrant divider in 10..90 (defaults to 50). */
  splitX?: number;
  /** Horizontal quadrant divider in 10..90 (defaults to 50). */
  splitY?: number;
  /** Card heading rendered in the sculpted prism-slab header (defaults to 'Strategic 2×2 Quadrant Matrix'). */
  title?: string;
  /** Callback fired when an initiative bubble is clicked or selected via keyboard. */
  onSelectItem?: (selection: QuadrantSelection) => void;
}

type QuadrantFilter = 'all' | QuadrantZoneId;

interface QuadrantZoneMeta {
  id: QuadrantZoneId;
  colorToken: string;
}

interface PlottedQuadrantItem {
  key: string;
  id: string;
  label: string;
  displayLabel: string;
  x: number;
  y: number;
  weight?: number;
  summary?: string;
  quadrant: QuadrantZoneId;
  quadrantLabel: string;
  zoneColor: string;
  svgX: number;
  svgY: number;
  radius: number;
  labelX: number;
  labelY: number;
  labelAnchor: 'start' | 'end';
}

interface ZoneRectGeometry {
  id: QuadrantZoneId;
  label: string;
  colorToken: string;
  x: number;
  y: number;
  width: number;
  height: number;
  watermarkX: number;
  watermarkY: number;
  watermarkAnchor: 'start' | 'end';
}

export const DEFAULT_QUADRANT_LABELS: Readonly<QuadrantLabels> = {
  topLeft: 'Quick Wins',
  topRight: 'Major Bets',
  bottomLeft: 'Fill-Ins',
  bottomRight: 'Reconsider',
};

/**
 * Default 8 realistic product roadmap prioritization initiatives spanning all 4 quadrants.
 */
export const DEFAULT_QUADRANT_ITEMS: ReadonlyArray<QuadrantItem> = [
  {
    id: 'passkey-login',
    label: 'Passkey Login',
    x: 22,
    y: 84,
    weight: 2.2,
    summary: 'Cuts sign-in friction and password reset tickets with minimal backend lift.',
  },
  {
    id: 'guided-setup',
    label: 'Guided Setup',
    x: 36,
    y: 68,
    weight: 1.5,
    summary: 'Lifts day-7 workspace activation through a three-step interactive checklist.',
  },
  {
    id: 'ai-copilot',
    label: 'AI Workflow Copilot',
    x: 76,
    y: 88,
    weight: 3.0,
    summary: 'Automates multi-step operational pipelines with transparent approval gates.',
  },
  {
    id: 'live-multiplayer',
    label: 'Live Multiplayer',
    x: 66,
    y: 66,
    weight: 2.5,
    summary: 'Enables real-time collaborative canvas editing backed by CRDT state sync.',
  },
  {
    id: 'shortcut-overlay',
    label: 'Shortcut Overlay',
    x: 18,
    y: 34,
    weight: 1.0,
    summary: 'Surfaces keyboard shortcuts in a lightweight searchable reference sheet.',
  },
  {
    id: 'csv-presets',
    label: 'CSV Presets',
    x: 35,
    y: 20,
    weight: 1.2,
    summary: 'Saves recurring column templates for weekly executive data exports.',
  },
  {
    id: 'legacy-xml-sync',
    label: 'Legacy XML Sync',
    x: 78,
    y: 32,
    weight: 1.8,
    summary: 'High engineering upkeep serving fewer than two percent of active tenants.',
  },
  {
    id: 'theme-ide',
    label: 'Custom CSS IDE',
    x: 64,
    y: 18,
    weight: 2.0,
    summary: 'Complex sandboxed stylesheet editor better deferred until token studio matures.',
  },
];

const SVG_WIDTH = 440;
const SVG_HEIGHT = 300;
const PAD_LEFT = 46;
const PAD_RIGHT = 18;
const PAD_TOP = 16;
const PAD_BOTTOM = 40;
const PLOT_WIDTH = SVG_WIDTH - PAD_LEFT - PAD_RIGHT;
const PLOT_HEIGHT = SVG_HEIGHT - PAD_TOP - PAD_BOTTOM;

const MIN_SPLIT = 10;
const MAX_SPLIT = 90;
const DEFAULT_SPLIT = 50;

const MIN_RADIUS = 7;
const MAX_RADIUS = 13.5;
const DEFAULT_RADIUS = 9;
const MID_RADIUS = 10.5;
const MAX_INLINE_LABEL_LEN = 22;

const QUADRANT_ZONES: ReadonlyArray<QuadrantZoneMeta> = [
  { id: 'top-left', colorToken: 'var(--prism-success-main)' },
  { id: 'top-right', colorToken: 'var(--prism-primary-main)' },
  { id: 'bottom-left', colorToken: 'var(--prism-info-main)' },
  { id: 'bottom-right', colorToken: 'var(--prism-error-main)' },
];

const ZONE_COLOR_MAP: Record<QuadrantZoneId, string> = {
  'top-left': 'var(--prism-success-main)',
  'top-right': 'var(--prism-primary-main)',
  'bottom-left': 'var(--prism-info-main)',
  'bottom-right': 'var(--prism-error-main)',
};

function roundOne(value: number): number {
  return Math.round(value * 10) / 10;
}

function roundTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

function formatCoord(value: number): string {
  return String(roundOne(value));
}

function pickLabel(custom: string | undefined, fallback: string): string {
  const trimmed = custom?.trim();
  return trimmed ? trimmed : fallback;
}

function resolveQuadrantLabels(overrides?: Partial<QuadrantLabels>): QuadrantLabels {
  return {
    topLeft: pickLabel(overrides?.topLeft, DEFAULT_QUADRANT_LABELS.topLeft),
    topRight: pickLabel(overrides?.topRight, DEFAULT_QUADRANT_LABELS.topRight),
    bottomLeft: pickLabel(overrides?.bottomLeft, DEFAULT_QUADRANT_LABELS.bottomLeft),
    bottomRight: pickLabel(overrides?.bottomRight, DEFAULT_QUADRANT_LABELS.bottomRight),
  };
}

function getZoneLabel(zone: QuadrantZoneId, labels: QuadrantLabels): string {
  switch (zone) {
    case 'top-left':
      return labels.topLeft;
    case 'top-right':
      return labels.topRight;
    case 'bottom-left':
      return labels.bottomLeft;
    case 'bottom-right':
      return labels.bottomRight;
  }
}

function classifyQuadrant(x: number, y: number, splitX: number, splitY: number): QuadrantZoneId {
  const isRight = x >= splitX;
  const isTop = y >= splitY;
  if (isTop) {
    return isRight ? 'top-right' : 'top-left';
  }
  return isRight ? 'bottom-right' : 'bottom-left';
}

function computeBubbleRadius(
  weight: number | undefined,
  minWeight: number,
  maxWeight: number
): number {
  if (weight === undefined) {
    return DEFAULT_RADIUS;
  }
  if (minWeight === maxWeight) {
    return MID_RADIUS;
  }
  const ratio = (weight - minWeight) / (maxWeight - minWeight);
  return roundTwo(MIN_RADIUS + ratio * (MAX_RADIUS - MIN_RADIUS));
}

function formatInlineLabel(label: string): string {
  return label.length > MAX_INLINE_LABEL_LEN
    ? `${label.slice(0, MAX_INLINE_LABEL_LEN - 1)}…`
    : label;
}

function projectX(x: number): number {
  return roundTwo(PAD_LEFT + (x / 100) * PLOT_WIDTH);
}

function projectY(y: number): number {
  return roundTwo(PAD_TOP + ((100 - y) / 100) * PLOT_HEIGHT);
}

export function QuadrantMatrix({
  items,
  xLabel = 'Implementation Effort',
  yLabel = 'Strategic Impact',
  quadrantLabels,
  splitX = DEFAULT_SPLIT,
  splitY = DEFAULT_SPLIT,
  title = 'Strategic 2×2 Quadrant Matrix',
  onSelectItem,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: QuadrantMatrixProps) {
  const headingId = useId();
  const plotClipId = useId();
  const override = useComponentOverride('QuadrantMatrix');
  const itemRefs = useRef<Map<string, SVGGElement>>(new Map());

  const [activeFilter, setActiveFilter] = useState<QuadrantFilter>('all');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const safeSplitX = roundOne(clampNumber(splitX, MIN_SPLIT, MAX_SPLIT, DEFAULT_SPLIT));
  const safeSplitY = roundOne(clampNumber(splitY, MIN_SPLIT, MAX_SPLIT, DEFAULT_SPLIT));

  const resolvedLabels = useMemo<QuadrantLabels>(
    () => resolveQuadrantLabels(quadrantLabels),
    [quadrantLabels]
  );

  const sourceItems = items === undefined ? DEFAULT_QUADRANT_ITEMS : items;

  const { plottedItems, zoneCounts } = useMemo(() => {
    const counts: Record<QuadrantZoneId, number> = {
      'top-left': 0,
      'top-right': 0,
      'bottom-left': 0,
      'bottom-right': 0,
    };

    let minWeight = Number.POSITIVE_INFINITY;
    let maxWeight = Number.NEGATIVE_INFINITY;

    const prepared = sourceItems.map((raw) => {
      const validWeight =
        typeof raw.weight === 'number' && Number.isFinite(raw.weight) && raw.weight > 0
          ? raw.weight
          : undefined;

      if (validWeight !== undefined) {
        if (validWeight < minWeight) minWeight = validWeight;
        if (validWeight > maxWeight) maxWeight = validWeight;
      }

      return { raw, validWeight };
    });

    const seenIds = new Map<string, number>();
    const plotted: PlottedQuadrantItem[] = [];

    for (const { raw, validWeight } of prepared) {
      const count = seenIds.get(raw.id) ?? 0;
      seenIds.set(raw.id, count + 1);
      const key = count === 0 ? `qm:${raw.id}` : `qm:${raw.id}#${count + 1}`;

      const safeX = roundOne(clampNumber(raw.x, 0, 100, DEFAULT_SPLIT));
      const safeY = roundOne(clampNumber(raw.y, 0, 100, DEFAULT_SPLIT));
      const quadrant = classifyQuadrant(safeX, safeY, safeSplitX, safeSplitY);
      const quadrantLabel = getZoneLabel(quadrant, resolvedLabels);
      counts[quadrant] += 1;

      const svgX = projectX(safeX);
      const svgY = projectY(safeY);
      const radius = computeBubbleRadius(validWeight, minWeight, maxWeight);
      const placeLeft = safeX > 72;
      const labelAnchor: 'start' | 'end' = placeLeft ? 'end' : 'start';
      const labelX = roundTwo(placeLeft ? svgX - radius - 5 : svgX + radius + 5);
      const labelY = roundTwo(svgY + 3.5);
      const trimmedSummary = raw.summary?.trim();

      plotted.push({
        key,
        id: raw.id,
        label: raw.label,
        displayLabel: formatInlineLabel(raw.label),
        x: safeX,
        y: safeY,
        weight: validWeight,
        summary: trimmedSummary ? trimmedSummary : undefined,
        quadrant,
        quadrantLabel,
        zoneColor: ZONE_COLOR_MAP[quadrant],
        svgX,
        svgY,
        radius,
        labelX,
        labelY,
        labelAnchor,
      });
    }

    return { plottedItems: plotted, zoneCounts: counts };
  }, [sourceItems, safeSplitX, safeSplitY, resolvedLabels]);

  const isEmpty = plottedItems.length === 0;

  const visibleItems = useMemo<ReadonlyArray<PlottedQuadrantItem>>(
    () =>
      activeFilter === 'all'
        ? plottedItems
        : plottedItems.filter((item) => item.quadrant === activeFilter),
    [plottedItems, activeFilter]
  );

  const selectedItem = useMemo<PlottedQuadrantItem | null>(() => {
    if (visibleItems.length === 0) return null;
    if (selectedKey !== null) {
      const matched = visibleItems.find((item) => item.key === selectedKey);
      if (matched) return matched;
    }
    return visibleItems[0]!;
  }, [visibleItems, selectedKey]);

  const splitSvgX = projectX(safeSplitX);
  const splitSvgY = projectY(safeSplitY);

  const zoneGeometries = useMemo<ReadonlyArray<ZoneRectGeometry>>(() => {
    const leftWidth = roundTwo(splitSvgX - PAD_LEFT);
    const rightWidth = roundTwo(PAD_LEFT + PLOT_WIDTH - splitSvgX);
    const topHeight = roundTwo(splitSvgY - PAD_TOP);
    const bottomHeight = roundTwo(PAD_TOP + PLOT_HEIGHT - splitSvgY);

    return [
      {
        id: 'top-left',
        label: resolvedLabels.topLeft,
        colorToken: ZONE_COLOR_MAP['top-left'],
        x: PAD_LEFT,
        y: PAD_TOP,
        width: leftWidth,
        height: topHeight,
        watermarkX: PAD_LEFT + 8,
        watermarkY: PAD_TOP + 15,
        watermarkAnchor: 'start',
      },
      {
        id: 'top-right',
        label: resolvedLabels.topRight,
        colorToken: ZONE_COLOR_MAP['top-right'],
        x: splitSvgX,
        y: PAD_TOP,
        width: rightWidth,
        height: topHeight,
        watermarkX: PAD_LEFT + PLOT_WIDTH - 8,
        watermarkY: PAD_TOP + 15,
        watermarkAnchor: 'end',
      },
      {
        id: 'bottom-left',
        label: resolvedLabels.bottomLeft,
        colorToken: ZONE_COLOR_MAP['bottom-left'],
        x: PAD_LEFT,
        y: splitSvgY,
        width: leftWidth,
        height: bottomHeight,
        watermarkX: PAD_LEFT + 8,
        watermarkY: PAD_TOP + PLOT_HEIGHT - 8,
        watermarkAnchor: 'start',
      },
      {
        id: 'bottom-right',
        label: resolvedLabels.bottomRight,
        colorToken: ZONE_COLOR_MAP['bottom-right'],
        x: splitSvgX,
        y: splitSvgY,
        width: rightWidth,
        height: bottomHeight,
        watermarkX: PAD_LEFT + PLOT_WIDTH - 8,
        watermarkY: PAD_TOP + PLOT_HEIGHT - 8,
        watermarkAnchor: 'end',
      },
    ];
  }, [splitSvgX, splitSvgY, resolvedLabels]);

  const handleSelectItem = useCallback(
    (entry: PlottedQuadrantItem) => {
      setSelectedKey(entry.key);
      const selection: QuadrantSelection = {
        id: entry.id,
        label: entry.label,
        x: entry.x,
        y: entry.y,
        ...(entry.weight !== undefined ? { weight: entry.weight } : {}),
        ...(entry.summary !== undefined ? { summary: entry.summary } : {}),
        quadrant: entry.quadrant,
        quadrantLabel: entry.quadrantLabel,
      };
      onSelectItem?.(selection);
    },
    [onSelectItem]
  );

  const handleItemKeyDown = useCallback(
    (
      event: ReactKeyboardEvent<SVGGElement>,
      entry: PlottedQuadrantItem,
      visibleIndex: number
    ) => {
      if (event.nativeEvent.isComposing) return;

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleSelectItem(entry);
        return;
      }

      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
        return;
      }

      event.preventDefault();
      if (visibleItems.length <= 1) return;

      const delta = event.key === 'ArrowRight' ? 1 : -1;
      const nextIndex = (visibleIndex + delta + visibleItems.length) % visibleItems.length;
      const target = visibleItems[nextIndex]!;
      handleSelectItem(target);
      itemRefs.current.get(target.key)?.focus();
    },
    [handleSelectItem, visibleItems]
  );

  const merged = mergeProps({
    themeTarget: themeProps('quadrant-matrix', {
      empty: isEmpty,
      filter: activeFilter,
      splitX: safeSplitX,
      splitY: safeSplitY,
    }),
    baseClassName: 'prism-slab p-4 sm:p-5 space-y-3.5 w-full max-w-full min-w-0',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('quadrant-matrix', 'header');
  const filtersClass = stableClassName('quadrant-matrix', 'filters');
  const canvasClass = stableClassName('quadrant-matrix', 'canvas');
  const svgClass = stableClassName('quadrant-matrix', 'svg');
  const inspectorClass = stableClassName('quadrant-matrix', 'inspector');

  const totalCountLabel =
    plottedItems.length === 1 ? '1 initiative' : `${plottedItems.length} initiatives`;

  return (
    <div ref={ref} role="region" aria-labelledby={headingId} {...rest} {...merged}>
      <div className={cx(headerClass, 'space-y-2.5 min-w-0 max-w-full')}>
        <div className="flex flex-wrap items-center justify-between gap-2.5 min-w-0 max-w-full">
          <div className="flex flex-wrap items-center gap-2 min-w-0 max-w-full">
            <h4
              id={headingId}
              className="text-sm font-semibold tracking-tight truncate max-w-full"
              style={{ color: 'var(--prism-text-primary)' }}
            >
              {title}
            </h4>
            <span
              data-testid="quadrant-total-count"
              className="prism-crystal rounded-full px-2.5 py-0.5 text-[11px] font-mono tabular-nums font-medium shrink-0"
              style={{ color: 'var(--prism-text-secondary)' }}
            >
              {totalCountLabel}
            </span>
          </div>
        </div>

        <div
          role="group"
          aria-label="Filter initiatives by quadrant"
          data-testid="quadrant-filter-pills"
          className={cx(filtersClass, 'flex flex-wrap items-center gap-1.5 min-w-0 max-w-full')}
        >
          <button
            type="button"
            aria-pressed={activeFilter === 'all'}
            data-testid="quadrant-filter-all"
            onClick={() => setActiveFilter('all')}
            className={cx(
              'prism-focus-ring inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium cursor-pointer transition-all',
              activeFilter === 'all' ? 'prism-crystal' : 'prism-well opacity-75 hover:opacity-100'
            )}
            style={{ color: 'var(--prism-text-primary)' }}
          >
            <span>All</span>
            <span
              className="font-mono text-[10px] tabular-nums"
              style={{ color: 'var(--prism-text-secondary)' }}
            >
              {plottedItems.length}
            </span>
          </button>

          {QUADRANT_ZONES.map((zone) => {
            const label = getZoneLabel(zone.id, resolvedLabels);
            const count = zoneCounts[zone.id];
            const isSelectedFilter = activeFilter === zone.id;

            return (
              <button
                key={zone.id}
                type="button"
                aria-pressed={isSelectedFilter}
                data-testid={`quadrant-filter-${zone.id}`}
                data-quadrant={zone.id}
                onClick={() => setActiveFilter(zone.id)}
                className={cx(
                  'prism-focus-ring inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium cursor-pointer transition-all',
                  isSelectedFilter ? 'prism-crystal' : 'prism-well opacity-75 hover:opacity-100'
                )}
                style={{
                  color: 'var(--prism-text-primary)',
                  border: isSelectedFilter ? `1px solid ${zone.colorToken}` : undefined,
                }}
              >
                <span
                  aria-hidden="true"
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: zone.colorToken }}
                />
                <span>{label}</span>
                <span
                  data-testid={`quadrant-filter-count-${zone.id}`}
                  className="font-mono text-[10px] tabular-nums"
                  style={{ color: 'var(--prism-text-secondary)' }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {isEmpty ? (
        <div
          role="status"
          data-testid="quadrant-matrix-empty"
          className="prism-well rounded-2xl px-4 py-8 text-center text-xs font-medium"
          style={{ color: 'var(--prism-text-secondary)' }}
        >
          No strategic initiatives available to plot in this quadrant matrix.
        </div>
      ) : (
        <>
          <div
            className={cx(
              canvasClass,
              'prism-well rounded-2xl p-2 sm:p-3 w-full max-w-full min-w-0 overflow-hidden'
            )}
          >
            <svg
              role="img"
              aria-label={`${title} plotting ${visibleItems.length} of ${plottedItems.length} initiatives across ${resolvedLabels.topLeft}, ${resolvedLabels.topRight}, ${resolvedLabels.bottomLeft}, and ${resolvedLabels.bottomRight}`}
              data-testid="quadrant-matrix-svg"
              viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
              className={cx(svgClass, 'w-full h-auto select-none block')}
            >
              <defs>
                <clipPath id={plotClipId}>
                  <rect
                    x={PAD_LEFT}
                    y={PAD_TOP}
                    width={PLOT_WIDTH}
                    height={PLOT_HEIGHT}
                    rx={8}
                  />
                </clipPath>
              </defs>

              <g clipPath={`url(#${plotClipId})`}>
                {zoneGeometries.map((zone) => {
                  const isFocused = activeFilter === zone.id;
                  const isDimmed = activeFilter !== 'all' && !isFocused;
                  const zoneOpacity = isFocused ? 0.14 : isDimmed ? 0.03 : 0.08;

                  return (
                    <rect
                      key={zone.id}
                      data-role="quadrant-zone"
                      data-zone={zone.id}
                      x={zone.x}
                      y={zone.y}
                      width={zone.width}
                      height={zone.height}
                      fill={zone.colorToken}
                      fillOpacity={zoneOpacity}
                    />
                  );
                })}
              </g>

              <rect
                x={PAD_LEFT}
                y={PAD_TOP}
                width={PLOT_WIDTH}
                height={PLOT_HEIGHT}
                rx={8}
                fill="none"
                stroke="var(--prism-divider)"
                strokeWidth={1}
              />

              <line
                data-testid="quadrant-split-x"
                data-split-x={String(safeSplitX)}
                x1={splitSvgX}
                y1={PAD_TOP}
                x2={splitSvgX}
                y2={PAD_TOP + PLOT_HEIGHT}
                stroke="var(--prism-text-secondary)"
                strokeWidth={1.25}
                strokeDasharray="5 4"
                strokeOpacity={0.65}
              />

              <line
                data-testid="quadrant-split-y"
                data-split-y={String(safeSplitY)}
                x1={PAD_LEFT}
                y1={splitSvgY}
                x2={PAD_LEFT + PLOT_WIDTH}
                y2={splitSvgY}
                stroke="var(--prism-text-secondary)"
                strokeWidth={1.25}
                strokeDasharray="5 4"
                strokeOpacity={0.65}
              />

              {zoneGeometries.map((zone) => {
                const isDimmed = activeFilter !== 'all' && activeFilter !== zone.id;
                return (
                  <text
                    key={`wm-${zone.id}`}
                    data-testid={`quadrant-watermark-${zone.id}`}
                    x={zone.watermarkX}
                    y={zone.watermarkY}
                    textAnchor={zone.watermarkAnchor}
                    pointerEvents="none"
                    className="text-[10px] font-semibold uppercase tracking-wide"
                    style={{
                      fill: zone.colorToken,
                      opacity: isDimmed ? 0.35 : 0.78,
                    }}
                  >
                    {zone.label}
                  </text>
                );
              })}

              <text
                x={PAD_LEFT}
                y={PAD_TOP + PLOT_HEIGHT + 14}
                textAnchor="start"
                className="text-[9px] font-mono tabular-nums"
                style={{ fill: 'var(--prism-text-secondary)' }}
              >
                0
              </text>
              <text
                x={splitSvgX}
                y={PAD_TOP + PLOT_HEIGHT + 14}
                textAnchor="middle"
                className="text-[9px] font-mono tabular-nums"
                style={{ fill: 'var(--prism-text-secondary)' }}
              >
                {formatCoord(safeSplitX)}
              </text>
              <text
                x={PAD_LEFT + PLOT_WIDTH}
                y={PAD_TOP + PLOT_HEIGHT + 14}
                textAnchor="end"
                className="text-[9px] font-mono tabular-nums"
                style={{ fill: 'var(--prism-text-secondary)' }}
              >
                100
              </text>

              <text
                x={PAD_LEFT - 7}
                y={PAD_TOP + PLOT_HEIGHT}
                textAnchor="end"
                className="text-[9px] font-mono tabular-nums"
                style={{ fill: 'var(--prism-text-secondary)' }}
              >
                0
              </text>
              <text
                x={PAD_LEFT - 7}
                y={splitSvgY + 3}
                textAnchor="end"
                className="text-[9px] font-mono tabular-nums"
                style={{ fill: 'var(--prism-text-secondary)' }}
              >
                {formatCoord(safeSplitY)}
              </text>
              <text
                x={PAD_LEFT - 7}
                y={PAD_TOP + 8}
                textAnchor="end"
                className="text-[9px] font-mono tabular-nums"
                style={{ fill: 'var(--prism-text-secondary)' }}
              >
                100
              </text>

              <text
                data-testid="quadrant-x-label"
                x={PAD_LEFT + PLOT_WIDTH / 2}
                y={SVG_HEIGHT - 8}
                textAnchor="middle"
                className="text-[11px] font-medium"
                style={{ fill: 'var(--prism-text-secondary)' }}
              >
                {xLabel}
              </text>

              <text
                data-testid="quadrant-y-label"
                x={14}
                y={PAD_TOP + PLOT_HEIGHT / 2}
                textAnchor="middle"
                transform={`rotate(-90 14 ${PAD_TOP + PLOT_HEIGHT / 2})`}
                className="text-[11px] font-medium"
                style={{ fill: 'var(--prism-text-secondary)' }}
              >
                {yLabel}
              </text>

              <g data-testid="quadrant-bubbles-layer">
                {visibleItems.map((entry, idx) => {
                  const isSelected = selectedItem?.key === entry.key;

                  return (
                    <g
                      key={entry.key}
                      ref={(node) => {
                        if (node) {
                          itemRefs.current.set(entry.key, node);
                        } else {
                          itemRefs.current.delete(entry.key);
                        }
                      }}
                      role="button"
                      tabIndex={isSelected ? 0 : -1}
                      aria-pressed={isSelected}
                      aria-label={`${entry.label}, ${entry.quadrantLabel}, ${xLabel}: ${formatCoord(entry.x)}, ${yLabel}: ${formatCoord(entry.y)}`}
                      data-role="quadrant-item"
                      data-testid={`quadrant-item-${entry.id}`}
                      data-quadrant={entry.quadrant}
                      data-selected={isSelected ? 'true' : 'false'}
                      className="prism-focus-ring cursor-pointer"
                      onClick={() => handleSelectItem(entry)}
                      onKeyDown={(event) => handleItemKeyDown(event, entry, idx)}
                    >
                      {isSelected ? (
                        <circle
                          data-testid={`quadrant-active-ring-${entry.id}`}
                          cx={entry.svgX}
                          cy={entry.svgY}
                          r={roundTwo(entry.radius + 4)}
                          fill="none"
                          stroke={entry.zoneColor}
                          strokeWidth={2}
                          strokeOpacity={0.92}
                          pointerEvents="none"
                        />
                      ) : null}

                      <circle
                        data-role="quadrant-bubble"
                        cx={entry.svgX}
                        cy={entry.svgY}
                        r={entry.radius}
                        fill={entry.zoneColor}
                        fillOpacity={isSelected ? 0.92 : 0.72}
                        stroke={entry.zoneColor}
                        strokeWidth={isSelected ? 2 : 1.5}
                      />

                      <circle
                        aria-hidden="true"
                        cx={roundTwo(entry.svgX - entry.radius * 0.28)}
                        cy={roundTwo(entry.svgY - entry.radius * 0.28)}
                        r={roundTwo(entry.radius * 0.24)}
                        fill="var(--prism-bg-start)"
                        fillOpacity={0.55}
                        pointerEvents="none"
                      />

                      <text
                        data-role="quadrant-item-label"
                        x={entry.labelX}
                        y={entry.labelY}
                        textAnchor={entry.labelAnchor}
                        pointerEvents="none"
                        className="text-[10px] font-medium"
                        style={{ fill: 'var(--prism-text-primary)' }}
                      >
                        {entry.displayLabel}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>

          <div
            data-testid="quadrant-inspector"
            aria-live="polite"
            className={cx(
              inspectorClass,
              'prism-well rounded-xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs min-w-0 max-w-full'
            )}
          >
            {selectedItem ? (
              <>
                <div className="flex flex-wrap items-center gap-2 min-w-0 max-w-full">
                  <span
                    aria-hidden="true"
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: selectedItem.zoneColor }}
                  />
                  <span
                    data-testid="quadrant-inspector-label"
                    className="font-semibold truncate max-w-full"
                    style={{ color: 'var(--prism-text-primary)' }}
                  >
                    {selectedItem.label}
                  </span>
                  <span
                    data-testid="quadrant-inspector-badge"
                    data-quadrant={selectedItem.quadrant}
                    className="prism-crystal rounded-full px-2 py-0.5 text-[11px] font-semibold shrink-0"
                    style={{
                      color: selectedItem.zoneColor,
                      border: `1px solid ${selectedItem.zoneColor}`,
                    }}
                  >
                    {selectedItem.quadrantLabel}
                  </span>
                  <span
                    data-testid="quadrant-inspector-coords"
                    className="font-mono tabular-nums"
                    style={{ color: 'var(--prism-text-secondary)' }}
                  >
                    {`${xLabel}: ${formatCoord(selectedItem.x)} · ${yLabel}: ${formatCoord(selectedItem.y)}`}
                  </span>
                </div>

                {selectedItem.summary ? (
                  <p
                    data-testid="quadrant-inspector-summary"
                    className="w-full text-[11px] leading-relaxed min-w-0"
                    style={{ color: 'var(--prism-text-secondary)' }}
                  >
                    {selectedItem.summary}
                  </p>
                ) : null}
              </>
            ) : (
              <span
                data-testid="quadrant-inspector-empty-zone"
                style={{ color: 'var(--prism-text-secondary)' }}
              >
                {`No initiatives in ${getZoneLabel(activeFilter as QuadrantZoneId, resolvedLabels)}. Select All or another quadrant filter above.`}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

QuadrantMatrix.displayName = 'QuadrantMatrix';
