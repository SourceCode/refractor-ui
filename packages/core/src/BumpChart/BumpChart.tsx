'use client';

import {
  memo,
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
import { STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type BumpTone = 'primary' | 'secondary' | 'emerald' | 'amber' | 'rose' | 'info';

export interface BumpSeriesItem {
  /** Stable unique identifier for this ranked series trajectory. */
  id: string;
  /** Human-readable framework, channel, or entity label shown in legend chips and inspector. */
  label: string;
  /** Ordered 1-based rank positions aligned to `periods` (`1` is plotted at the top rail). */
  ranks: ReadonlyArray<number>;
  /** Optional semantic optical tone mapped strictly to `--prism-*` CSS custom properties. */
  tone?: BumpTone;
}

export interface BumpSelection {
  /** Identifier of the selected series trajectory. */
  seriesId: string;
  /** Human-readable label of the selected series trajectory. */
  label: string;
  /** Zero-based period index along the horizontal axis. */
  periodIndex: number;
  /** Display label of the selected period column. */
  periodLabel: string;
  /** Sanitized 1-based rank at the selected period (`1` at top). */
  rank: number;
  /** Net rank movement across the series timeline (`firstRank - lastRank`: positive = climbed, negative = dropped, 0 = steady). */
  netChange: number;
}

export interface BumpChartProps extends BaseProps<HTMLDivElement> {
  /** Ordered time periods along the horizontal axis (defaults to `['Q1', 'Q2', 'Q3', 'Q4', 'Q1+']`). */
  periods?: ReadonlyArray<string>;
  /** Ranked trajectories across `periods` (defaults to 5 realistic channel trajectories with crisp crossovers). */
  series?: ReadonlyArray<BumpSeriesItem>;
  /** Chart card heading linked to the region and SVG graphic (defaults to `'Rank Trajectory Bump Chart'`). */
  title?: string;
  /** Callback invoked when a user clicks, keyboard-activates, or arrow-navigates to a node or selects a series chip. */
  onSelectSeries?: (selection: BumpSelection) => void;
}

interface ComputedPeriod {
  key: string;
  index: number;
  label: string;
  displayLabel: string;
  x: number;
}

interface ComputedRankRail {
  key: string;
  rank: number;
  y: number;
}

interface ComputedNode {
  nodeKey: string;
  periodIndex: number;
  periodLabel: string;
  rank: number;
  x: number;
  y: number;
}

interface ComputedSeries {
  seriesKey: string;
  seriesIndex: number;
  id: string;
  label: string;
  tone: BumpTone;
  color: string;
  contrastColor: string;
  nodes: ReadonlyArray<ComputedNode>;
  latestNode: ComputedNode;
  netChange: number;
  pathD: string;
}

interface NodeEntry {
  series: ComputedSeries;
  node: ComputedNode;
}

const SVG_WIDTH = 480;
const SVG_HEIGHT = 240;
const PAD_LEFT = 42;
const PAD_RIGHT = 28;
const PLOT_WIDTH = SVG_WIDTH - PAD_LEFT - PAD_RIGHT;
const PERIOD_LABEL_Y = 20;
const PLOT_TOP = 44;
const PLOT_BOTTOM = 216;
const PLOT_HEIGHT = PLOT_BOTTOM - PLOT_TOP;
const RAIL_LEFT = PAD_LEFT - 10;
const RAIL_RIGHT = SVG_WIDTH - PAD_RIGHT + 10;
const COLUMN_TOP = PLOT_TOP - 14;
const COLUMN_BOTTOM = PLOT_BOTTOM + 14;
const RANK_LABEL_X = 24;

export const DEFAULT_BUMP_PERIODS: ReadonlyArray<string> = ['Q1', 'Q2', 'Q3', 'Q4', 'Q1+'];

export const DEFAULT_BUMP_SERIES: ReadonlyArray<BumpSeriesItem> = [
  {
    id: 'organic',
    label: 'Organic Search',
    ranks: [3, 2, 2, 1, 1],
    tone: 'primary',
  },
  {
    id: 'partner',
    label: 'Partner Ecosystem',
    ranks: [1, 1, 3, 2, 2],
    tone: 'secondary',
  },
  {
    id: 'product-led',
    label: 'Product-Led',
    ranks: [5, 4, 1, 3, 3],
    tone: 'emerald',
  },
  {
    id: 'paid-media',
    label: 'Paid Media',
    ranks: [2, 3, 4, 4, 5],
    tone: 'amber',
  },
  {
    id: 'community',
    label: 'Developer Community',
    ranks: [4, 5, 5, 5, 4],
    tone: 'rose',
  },
];

const TONE_CYCLE: ReadonlyArray<BumpTone> = [
  'primary',
  'secondary',
  'emerald',
  'amber',
  'rose',
  'info',
];

const TONE_COLOR_MAP: Record<BumpTone, string> = {
  primary: 'var(--prism-primary-main)',
  secondary: 'var(--prism-secondary-main)',
  emerald: 'var(--prism-success-main)',
  amber: 'var(--prism-warning-main)',
  rose: 'var(--prism-error-main)',
  info: 'var(--prism-info-main)',
};

const TONE_CONTRAST_MAP: Record<BumpTone, string> = {
  primary: 'var(--prism-primary-contrast)',
  secondary: 'var(--prism-secondary-contrast)',
  emerald: 'var(--prism-success-contrast)',
  amber: 'var(--prism-warning-contrast)',
  rose: 'var(--prism-error-contrast)',
  info: 'var(--prism-info-contrast)',
};

function roundCoord(value: number): number {
  return Number(value.toFixed(2));
}

function truncateLabel(text: string, maxChars: number): string {
  if (text.length <= maxChars) {
    return text;
  }
  return `${text.slice(0, Math.max(1, maxChars - 1))}…`;
}

function formatNetMovement(netChange: number): string {
  if (netChange === 0) {
    return 'Steady';
  }
  const abs = Math.abs(netChange);
  const sign = netChange > 0 ? '+' : '-';
  const unit = abs === 1 ? 'spot' : 'spots';
  return `${sign}${abs} ${unit}`;
}

function getNetMovementColor(netChange: number): string {
  if (netChange > 0) {
    return 'var(--prism-success-main)';
  }
  if (netChange < 0) {
    return 'var(--prism-error-main)';
  }
  return 'var(--prism-text-secondary)';
}

function buildBumpCurvePath(nodes: ReadonlyArray<ComputedNode>): string {
  let d = '';
  let prev: ComputedNode | undefined;
  for (const node of nodes) {
    if (!prev) {
      d = `M ${node.x},${node.y}`;
    } else {
      const midX = roundCoord((prev.x + node.x) / 2);
      d += ` C ${midX},${prev.y} ${midX},${node.y} ${node.x},${node.y}`;
    }
    prev = node;
  }
  return d;
}

function toSelection(series: ComputedSeries, node: ComputedNode): BumpSelection {
  return {
    seriesId: series.id,
    label: series.label,
    periodIndex: node.periodIndex,
    periodLabel: node.periodLabel,
    rank: node.rank,
    netChange: series.netChange,
  };
}

function BumpChartInner({
  periods,
  series,
  title = 'Rank Trajectory Bump Chart',
  onSelectSeries,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: BumpChartProps) {
  const headingId = useId();
  const override = useComponentOverride('BumpChart');
  const nodeRefs = useRef<Map<string, SVGGElement>>(new Map());

  const [selectedNodeKey, setSelectedNodeKey] = useState<string | null>(null);
  const [focusedNodeKey, setFocusedNodeKey] = useState<string | null>(null);
  const [activeLegendKey, setActiveLegendKey] = useState<string | null>(null);

  const sourcePeriods = periods ?? DEFAULT_BUMP_PERIODS;
  const sourceSeries = series ?? DEFAULT_BUMP_SERIES;

  const {
    computedPeriods,
    rankRails,
    computedSeries,
    allNodeEntries,
    columnNavMap,
    baseNodeRadius,
    activeNodeRadius,
  } = useMemo(() => {
    if (sourcePeriods.length < 2 || sourceSeries.length === 0) {
      return {
        computedPeriods: [] as ComputedPeriod[],
        rankRails: [] as ComputedRankRail[],
        computedSeries: [] as ComputedSeries[],
        allNodeEntries: [] as NodeEntry[],
        columnNavMap: new Map<number, ReadonlyArray<NodeEntry>>(),
        baseNodeRadius: 10,
        activeNodeRadius: 11.5,
      };
    }

    const periodCount = sourcePeriods.length;
    const periodStep = PLOT_WIDTH / (periodCount - 1);
    const maxPeriodChars = Math.max(4, Math.floor(periodStep / 6.2));
    const periodSeenCounts = new Map<string, number>();

    const normalizedPeriods: ComputedPeriod[] = sourcePeriods.map((rawPeriod, index) => {
      const label = rawPeriod.trim() || `P${index + 1}`;
      const seen = periodSeenCounts.get(label) ?? 0;
      periodSeenCounts.set(label, seen + 1);
      const key = seen === 0 ? `per:${label}` : `per:${label}#${seen + 1}`;
      const x = roundCoord(PAD_LEFT + (index / (periodCount - 1)) * PLOT_WIDTH);
      return {
        key,
        index,
        label,
        displayLabel: truncateLabel(label, maxPeriodChars),
        x,
      };
    });

    const rawValidSeries: Array<{
      item: BumpSeriesItem;
      validRanks: Array<{ periodIndex: number; rank: number }>;
    }> = [];
    let maxObservedRank = 0;

    for (const item of sourceSeries) {
      const validRanks: Array<{ periodIndex: number; rank: number }> = [];
      for (let pIdx = 0; pIdx < periodCount; pIdx += 1) {
        const rawRank = item.ranks[pIdx];
        if (typeof rawRank === 'number' && Number.isFinite(rawRank) && rawRank >= 1) {
          const rank = Math.round(rawRank);
          validRanks.push({ periodIndex: pIdx, rank });
          if (rank > maxObservedRank) {
            maxObservedRank = rank;
          }
        }
      }
      if (validRanks.length > 0) {
        rawValidSeries.push({ item, validRanks });
      }
    }

    if (rawValidSeries.length === 0) {
      return {
        computedPeriods: [] as ComputedPeriod[],
        rankRails: [] as ComputedRankRail[],
        computedSeries: [] as ComputedSeries[],
        allNodeEntries: [] as NodeEntry[],
        columnNavMap: new Map<number, ReadonlyArray<NodeEntry>>(),
        baseNodeRadius: 10,
        activeNodeRadius: 11.5,
      };
    }

    const maxRank = Math.max(rawValidSeries.length, maxObservedRank, 1);
    const rails: ComputedRankRail[] = [];
    const rankYMap = new Map<number, number>();

    for (let rank = 1; rank <= maxRank; rank += 1) {
      const y =
        maxRank === 1
          ? roundCoord(PLOT_TOP + PLOT_HEIGHT / 2)
          : roundCoord(PLOT_TOP + ((rank - 1) / (maxRank - 1)) * PLOT_HEIGHT);
      rails.push({
        key: `rank-rail-${rank}`,
        rank,
        y,
      });
      rankYMap.set(rank, y);
    }

    const computedBaseRadius =
      maxRank <= 6
        ? 10
        : roundCoord(Math.max(6.5, Math.min(10, (PLOT_HEIGHT / (maxRank - 1)) * 0.36)));
    const computedActiveRadius = roundCoord(computedBaseRadius + 1.5);

    const seriesSeenCounts = new Map<string, number>();
    const seriesList: ComputedSeries[] = [];
    const flatEntries: NodeEntry[] = [];
    const colBuckets = new Map<number, NodeEntry[]>();

    for (let sIdx = 0; sIdx < rawValidSeries.length; sIdx += 1) {
      const { item, validRanks } = rawValidSeries[sIdx]!;
      const seen = seriesSeenCounts.get(item.id) ?? 0;
      seriesSeenCounts.set(item.id, seen + 1);
      const seriesKey = seen === 0 ? `ser:${item.id}` : `ser:${item.id}#${seen + 1}`;
      const label = item.label.trim() || item.id;
      const tone = item.tone ?? TONE_CYCLE[sIdx % TONE_CYCLE.length]!;
      const color = TONE_COLOR_MAP[tone];
      const contrastColor = TONE_CONTRAST_MAP[tone];

      const nodes: ComputedNode[] = validRanks.map(({ periodIndex, rank }) => {
        const period = normalizedPeriods[periodIndex]!;
        return {
          nodeKey: `${seriesKey}::${period.key}`,
          periodIndex,
          periodLabel: period.label,
          rank,
          x: period.x,
          y: rankYMap.get(rank)!,
        };
      });

      const firstNode = nodes[0]!;
      const latestNode = nodes[nodes.length - 1]!;
      const netChange = firstNode.rank - latestNode.rank;
      const pathD = buildBumpCurvePath(nodes);

      const computed: ComputedSeries = {
        seriesKey,
        seriesIndex: sIdx,
        id: item.id,
        label,
        tone,
        color,
        contrastColor,
        nodes,
        latestNode,
        netChange,
        pathD,
      };

      seriesList.push(computed);

      for (const node of nodes) {
        const entry: NodeEntry = { series: computed, node };
        flatEntries.push(entry);
        const bucket = colBuckets.get(node.periodIndex);
        if (bucket) {
          bucket.push(entry);
        } else {
          colBuckets.set(node.periodIndex, [entry]);
        }
      }
    }

    const navMap = new Map<number, ReadonlyArray<NodeEntry>>();
    for (const [periodIndex, entries] of colBuckets.entries()) {
      entries.sort(
        (a, b) => a.node.rank - b.node.rank || a.series.seriesIndex - b.series.seriesIndex
      );
      navMap.set(periodIndex, entries);
    }

    return {
      computedPeriods: normalizedPeriods,
      rankRails: rails,
      computedSeries: seriesList,
      allNodeEntries: flatEntries,
      columnNavMap: navMap,
      baseNodeRadius: computedBaseRadius,
      activeNodeRadius: computedActiveRadius,
    };
  }, [sourcePeriods, sourceSeries]);

  const isEmpty = computedSeries.length === 0;

  const selectedEntry = useMemo(() => {
    if (selectedNodeKey === null) return null;
    return allNodeEntries.find((entry) => entry.node.nodeKey === selectedNodeKey) ?? null;
  }, [allNodeEntries, selectedNodeKey]);

  const focusedEntry = useMemo(() => {
    if (focusedNodeKey === null) return null;
    return allNodeEntries.find((entry) => entry.node.nodeKey === focusedNodeKey) ?? null;
  }, [allNodeEntries, focusedNodeKey]);

  const activeLegendSeries = useMemo(() => {
    if (activeLegendKey === null) return null;
    return computedSeries.find((item) => item.seriesKey === activeLegendKey) ?? null;
  }, [activeLegendKey, computedSeries]);

  const inspectedEntry: NodeEntry | null =
    focusedEntry ??
    selectedEntry ??
    (activeLegendSeries
      ? { series: activeLegendSeries, node: activeLegendSeries.latestNode }
      : null);

  const highlightedSeriesKey = inspectedEntry?.series.seriesKey ?? null;
  const hasFilter = highlightedSeriesKey !== null;

  const registerNodeRef = useCallback((nodeKey: string, el: SVGGElement | null) => {
    if (el) {
      nodeRefs.current.set(nodeKey, el);
    } else {
      nodeRefs.current.delete(nodeKey);
    }
  }, []);

  const handleSelectNode = useCallback(
    (targetSeries: ComputedSeries, targetNode: ComputedNode) => {
      setActiveLegendKey(null);
      setSelectedNodeKey(targetNode.nodeKey);
      onSelectSeries?.(toSelection(targetSeries, targetNode));
    },
    [onSelectSeries]
  );

  const handleToggleLegend = useCallback(
    (targetSeries: ComputedSeries) => {
      const isAlreadyHighlighted =
        activeLegendSeries?.seriesKey === targetSeries.seriesKey ||
        (activeLegendSeries === null && selectedEntry?.series.seriesKey === targetSeries.seriesKey);

      setSelectedNodeKey(null);
      setFocusedNodeKey(null);

      if (isAlreadyHighlighted) {
        setActiveLegendKey(null);
      } else {
        setActiveLegendKey(targetSeries.seriesKey);
        onSelectSeries?.(toSelection(targetSeries, targetSeries.latestNode));
      }
    },
    [activeLegendSeries, onSelectSeries, selectedEntry]
  );

  const handleFocusNode = useCallback((nodeKey: string) => {
    setFocusedNodeKey(nodeKey);
  }, []);

  const handleBlurNode = useCallback((nodeKey: string) => {
    setFocusedNodeKey((prev) => (prev === nodeKey ? null : prev));
  }, []);

  const handleNodeKeyDown = useCallback(
    (targetSeries: ComputedSeries, targetNode: ComputedNode) =>
      (event: ReactKeyboardEvent<SVGGElement>) => {
        if (event.nativeEvent.isComposing) return;

        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleSelectNode(targetSeries, targetNode);
          return;
        }

        let nextEntry: NodeEntry | null = null;

        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          const idxInSeries = targetSeries.nodes.findIndex(
            (item) => item.nodeKey === targetNode.nodeKey
          );
          const delta = event.key === 'ArrowLeft' ? -1 : 1;
          const nextIdx =
            (idxInSeries + delta + targetSeries.nodes.length) % targetSeries.nodes.length;
          nextEntry = { series: targetSeries, node: targetSeries.nodes[nextIdx]! };
        } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
          const colEntries = columnNavMap.get(targetNode.periodIndex)!;
          const idxInCol = colEntries.findIndex(
            (entry) => entry.node.nodeKey === targetNode.nodeKey
          );
          const delta = event.key === 'ArrowUp' ? -1 : 1;
          const nextIdx = (idxInCol + delta + colEntries.length) % colEntries.length;
          nextEntry = colEntries[nextIdx]!;
        }

        if (nextEntry) {
          event.preventDefault();
          nodeRefs.current.get(nextEntry.node.nodeKey)?.focus();
          handleSelectNode(nextEntry.series, nextEntry.node);
        }
      },
    [columnNavMap, handleSelectNode]
  );

  const merged = mergeProps({
    themeTarget: themeProps('bump-chart', {
      empty: isEmpty,
      hasSelection: hasFilter,
    }),
    baseClassName: 'prism-slab p-4 sm:p-5 space-y-4 w-full max-w-full min-w-0',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('bump-chart', 'header');
  const legendClass = stableClassName('bump-chart', 'legend');
  const wellClass = stableClassName('bump-chart', 'well');
  const svgClass = stableClassName('bump-chart', 'svg');
  const inspectorClass = stableClassName('bump-chart', 'inspector');

  const highlightedSeries = inspectedEntry?.series ?? null;

  return (
    <div ref={ref} role="region" aria-labelledby={headingId} {...rest} {...merged}>
      <div className={cx(headerClass, 'flex flex-wrap items-center justify-between gap-2.5 min-w-0')}>
        <h4
          id={headingId}
          className="text-sm font-semibold tracking-tight min-w-0 break-words"
          style={STYLE_TEXT_PRIMARY}
        >
          {title}
        </h4>

        {!isEmpty ? (
          <span
            data-testid="bump-period-pill"
            className="prism-crystal inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold tabular-nums shrink-0"
            style={STYLE_TEXT_PRIMARY}
          >
            <span>{computedPeriods.length}</span>
            <span style={STYLE_TEXT_SECONDARY}>Periods</span>
          </span>
        ) : null}
      </div>

      {!isEmpty ? (
        <div
          role="group"
          aria-label="Series trajectory legend"
          className={cx(legendClass, 'flex flex-wrap items-center gap-2 min-w-0')}
        >
          {computedSeries.map((item) => {
            const isChipHighlighted = highlightedSeriesKey === item.seriesKey;
            const isChipPressed =
              activeLegendSeries?.seriesKey === item.seriesKey ||
              (activeLegendSeries === null && selectedEntry?.series.seriesKey === item.seriesKey);
            const isChipDimmed = hasFilter && !isChipHighlighted;

            return (
              <button
                key={item.seriesKey}
                type="button"
                aria-pressed={isChipPressed}
                data-series-id={item.id}
                data-tone={item.tone}
                onClick={() => handleToggleLegend(item)}
                className={cx(
                  'prism-crystal prism-focus-ring inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-opacity duration-150',
                  isChipDimmed ? 'opacity-45' : 'opacity-100'
                )}
                style={STYLE_TEXT_PRIMARY}
              >
                <span
                  aria-hidden="true"
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span>{item.label}</span>
                <span
                  className="font-mono text-[11px] tabular-nums"
                  style={STYLE_TEXT_SECONDARY}
                >
                  {`#${item.latestNode.rank}`}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {isEmpty ? (
        <div
          role="status"
          data-testid="bump-empty"
          className="prism-well rounded-2xl px-4 py-8 text-center text-xs font-medium"
          style={STYLE_TEXT_SECONDARY}
        >
          Provide at least 2 periods and 1 ranked series to plot trajectories.
        </div>
      ) : (
        <>
          <div
            className={cx(
              wellClass,
              'prism-well rounded-2xl p-3 w-full max-w-full min-w-0 overflow-x-auto'
            )}
          >
            <svg
              role="img"
              aria-label={`${title} rank trajectory bump chart across ${computedPeriods.length} periods and ${computedSeries.length} series`}
              viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
              className={cx(svgClass, 'w-full h-auto select-none block')}
            >
              {/* Horizontal #1..#N rank rails (#1 at top) */}
              {rankRails.map((rail) => (
                <g key={rail.key} data-rank-rail={String(rail.rank)}>
                  <line
                    x1={RAIL_LEFT}
                    y1={rail.y}
                    x2={RAIL_RIGHT}
                    y2={rail.y}
                    stroke="var(--prism-divider)"
                    strokeWidth={0.75}
                    pointerEvents="none"
                  />
                  <text
                    x={RANK_LABEL_X}
                    y={rail.y + 3.5}
                    textAnchor="end"
                    fill="var(--prism-text-secondary)"
                    className="text-[10px] font-mono font-semibold tabular-nums"
                  >
                    {`#${rail.rank}`}
                  </text>
                </g>
              ))}

              {/* Vertical dashed period columns */}
              {computedPeriods.map((period) => (
                <g key={period.key} data-period-column={period.label}>
                  <line
                    x1={period.x}
                    y1={COLUMN_TOP}
                    x2={period.x}
                    y2={COLUMN_BOTTOM}
                    stroke="var(--prism-divider)"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    pointerEvents="none"
                  />
                  <text
                    x={period.x}
                    y={PERIOD_LABEL_Y}
                    textAnchor="middle"
                    fill="var(--prism-text-primary)"
                    className="text-[10px] font-mono font-semibold"
                  >
                    {period.displayLabel}
                  </text>
                </g>
              ))}

              {/* Smooth cubic-Bezier trajectory curves */}
              {computedSeries.map((item) => {
                if (item.nodes.length < 2) {
                  return null;
                }
                const isSeriesHighlighted = highlightedSeriesKey === item.seriesKey;
                const isDimmed = hasFilter && !isSeriesHighlighted;

                return (
                  <path
                    key={`path-${item.seriesKey}`}
                    d={item.pathD}
                    fill="none"
                    stroke={item.color}
                    strokeWidth={isSeriesHighlighted ? 3.5 : 2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeOpacity={isDimmed ? 0.2 : isSeriesHighlighted ? 1 : 0.85}
                    data-series-path={item.id}
                    data-tone={item.tone}
                    data-highlighted={isSeriesHighlighted ? 'true' : 'false'}
                    data-dimmed={isDimmed ? 'true' : 'false'}
                    pointerEvents="none"
                    className="transition-opacity duration-150"
                  />
                );
              })}

              {/* Elevated refractive overlay curve so active trajectory glides cleanly above siblings */}
              {highlightedSeries && highlightedSeries.nodes.length >= 2 ? (
                <path
                  d={highlightedSeries.pathD}
                  fill="none"
                  stroke={highlightedSeries.color}
                  strokeWidth={6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeOpacity={0.22}
                  pointerEvents="none"
                />
              ) : null}

              {/* Interactive numbered circular rank nodes (stable DOM order preserves focus) */}
              {computedSeries.map((item) => {
                const isSeriesHighlighted = highlightedSeriesKey === item.seriesKey;
                const isDimmed = hasFilter && !isSeriesHighlighted;

                return (
                  <g key={`nodes-${item.seriesKey}`} data-series-nodes={item.id}>
                    {item.nodes.map((node) => {
                      const isSelected = selectedEntry?.node.nodeKey === node.nodeKey;
                      const isFocused = focusedEntry?.node.nodeKey === node.nodeKey;
                      const isActiveNode =
                        isSelected ||
                        isFocused ||
                        (activeLegendSeries?.seriesKey === item.seriesKey &&
                          item.latestNode.nodeKey === node.nodeKey);
                      const radius = isActiveNode ? activeNodeRadius : baseNodeRadius;

                      return (
                        <g
                          key={node.nodeKey}
                          ref={(el) => registerNodeRef(node.nodeKey, el)}
                          role="button"
                          tabIndex={0}
                          aria-pressed={isSelected}
                          aria-label={`${item.label}, ${node.periodLabel}, Rank #${node.rank}, Net Movement ${formatNetMovement(item.netChange)}`}
                          data-series-id={item.id}
                          data-period-index={String(node.periodIndex)}
                          data-rank={String(node.rank)}
                          data-tone={item.tone}
                          data-selected={isSelected ? 'true' : 'false'}
                          data-highlighted={isSeriesHighlighted ? 'true' : 'false'}
                          data-dimmed={isDimmed ? 'true' : 'false'}
                          opacity={isDimmed ? 0.25 : 1}
                          className="prism-focus-ring cursor-pointer transition-opacity duration-150"
                          onClick={() => handleSelectNode(item, node)}
                          onFocus={() => handleFocusNode(node.nodeKey)}
                          onBlur={() => handleBlurNode(node.nodeKey)}
                          onKeyDown={handleNodeKeyDown(item, node)}
                        >
                          {isActiveNode ? (
                            <circle
                              cx={node.x}
                              cy={node.y}
                              r={roundCoord(radius + 3.5)}
                              fill={item.color}
                              fillOpacity={0.22}
                              pointerEvents="none"
                            />
                          ) : null}
                          <circle
                            cx={node.x}
                            cy={node.y}
                            r={radius}
                            fill={item.color}
                            stroke={
                              isSelected || isFocused
                                ? 'var(--prism-text-primary)'
                                : 'var(--prism-well-end)'
                            }
                            strokeWidth={isSelected || isFocused ? 2 : 1.75}
                          />
                          <text
                            x={node.x}
                            y={node.y + 3.2}
                            textAnchor="middle"
                            fill={item.contrastColor}
                            pointerEvents="none"
                            className="text-[9px] font-mono font-bold tabular-nums"
                          >
                            {node.rank}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                );
              })}
            </svg>
          </div>

          <div
            data-testid="bump-inspector"
            aria-live="polite"
            className={cx(
              inspectorClass,
              'prism-well rounded-xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 min-w-0 text-xs tabular-nums'
            )}
            style={STYLE_TEXT_PRIMARY}
          >
            {inspectedEntry ? (
              <div className="inline-flex flex-wrap items-center gap-1.5 min-w-0">
                <span
                  aria-hidden="true"
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: inspectedEntry.series.color }}
                />
                <span className="font-semibold">{inspectedEntry.series.label}</span>
                <span aria-hidden="true" style={STYLE_TEXT_SECONDARY}>
                  ·
                </span>
                <span className="font-mono font-medium">{inspectedEntry.node.periodLabel}</span>
                <span aria-hidden="true" style={STYLE_TEXT_SECONDARY}>
                  ·
                </span>
                <span className="font-mono font-semibold">
                  {`Rank #${inspectedEntry.node.rank}`}
                </span>
                <span aria-hidden="true" style={STYLE_TEXT_SECONDARY}>
                  ·
                </span>
                <span style={STYLE_TEXT_SECONDARY}>Net Movement</span>
                <span
                  data-net-change={String(inspectedEntry.series.netChange)}
                  className="font-mono font-semibold"
                  style={{ color: getNetMovementColor(inspectedEntry.series.netChange) }}
                >
                  {formatNetMovement(inspectedEntry.series.netChange)}
                </span>
              </div>
            ) : (
              <>
                <span style={STYLE_TEXT_SECONDARY}>
                  Select or focus any rank node or series chip to inspect trajectory movement.
                </span>
                <span
                  className="font-mono font-medium shrink-0"
                  style={STYLE_TEXT_SECONDARY}
                >
                  {`${computedSeries.length} series · ${computedPeriods.length} periods`}
                </span>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export const BumpChart = memo(BumpChartInner);
BumpChart.displayName = 'BumpChart';
