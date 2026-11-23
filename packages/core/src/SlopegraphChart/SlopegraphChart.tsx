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
import { clampNumber } from '../utils/sanitize';
import { STYLE_BG_ERROR, STYLE_BG_SUCCESS, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type SlopeTone = 'primary' | 'secondary' | 'emerald' | 'amber' | 'rose' | 'info';

export interface SlopeSeriesItem {
  /** Stable unique identifier for this series line. */
  id: string;
  /** Human-readable series name shown along the rails and in the live readout. */
  label: string;
  /** Starting period numeric measurement plotted on the left vertical rail. */
  startValue: number;
  /** Ending period numeric measurement plotted on the right vertical rail. */
  endValue: number;
  /** Optional semantic optical tone overriding directional rising/declining coloring. */
  tone?: SlopeTone;
}

export interface SlopeSeriesSelection extends SlopeSeriesItem {
  /** Signed absolute difference (`endValue - startValue`). */
  delta: number;
  /** Relative percentage change rounded to 1 decimal place, or `null` when `startValue === 0`. */
  deltaPct: number | null;
  /** 1-based descending rank on the start axis (ties share the top competition rank). */
  startRank: number;
  /** 1-based descending rank on the end axis (ties share the top competition rank). */
  endRank: number;
}

export interface SlopegraphChartProps extends BaseProps<HTMLDivElement> {
  /** Series items plotted between the start and end rails (defaults to 6 Q1 vs Q4 product adoption metrics). */
  items?: ReadonlyArray<SlopeSeriesItem>;
  /** Label rendered above the left vertical reference rail (defaults to 'Q1 2026'). */
  startLabel?: string;
  /** Label rendered above the right vertical reference rail (defaults to 'Q4 2026'). */
  endLabel?: string;
  /** Unit suffix appended to metric values and signed deltas (defaults to '%'). */
  unit?: string;
  /** Chart card heading linked to the region and SVG graphic (defaults to 'Before / After Slopegraph'). */
  title?: string;
  /** Callback fired when a user clicks, activates, or arrow-navigates to a series line. */
  onSelectItem?: (selection: SlopeSeriesSelection) => void;
}

type SlopeDirection = 'rising' | 'declining' | 'flat';
type SlopeDirectionFilter = 'all' | 'rising' | 'declining';

interface ComputedSlopeItem {
  key: string;
  id: string;
  label: string;
  startValue: number;
  endValue: number;
  delta: number;
  deltaPct: number | null;
  direction: SlopeDirection;
  tone?: SlopeTone;
  color: string;
  startRank: number;
  endRank: number;
  startY: number;
  endY: number;
  startFormatted: string;
  endFormatted: string;
  signedDeltaFormatted: string;
  deltaPctFormatted: string;
  rankShiftFormatted: string;
  ariaLabel: string;
  selection: SlopeSeriesSelection;
}

interface PositionedSlopeItem extends ComputedSlopeItem {
  leftLabelY: number;
  rightLabelY: number;
}

interface LabelAnchor {
  key: string;
  rawY: number;
  order: number;
}

const SVG_WIDTH = 460;
const SVG_HEIGHT = 250;
const LEFT_X = 152;
const RIGHT_X = 308;
const LEFT_LABEL_X = 140;
const RIGHT_LABEL_X = 320;
const HEADER_Y = 20;
const AXIS_TOP = 36;
const AXIS_BOTTOM = 228;
const PLOT_TOP = 48;
const PLOT_BOTTOM = 216;
const PLOT_MID = (PLOT_TOP + PLOT_BOTTOM) / 2;
const PLOT_HEIGHT = PLOT_BOTTOM - PLOT_TOP;
const LABEL_MIN_Y = 42;
const LABEL_MAX_Y = 232;
const MIN_LABEL_GAP = 14;
const MAX_SERIES_LABEL_CHARS = 14;
const MAX_COLUMN_LABEL_CHARS = 16;

export const DEFAULT_SLOPEGRAPH_ITEMS: ReadonlyArray<SlopeSeriesItem> = [
  { id: 'ai-copilot', label: 'AI Copilot', startValue: 28, endValue: 76 },
  { id: 'sso-enforced', label: 'SSO Enforced', startValue: 62, endValue: 84 },
  { id: 'mobile-sync', label: 'Mobile Sync', startValue: 54, endValue: 68 },
  { id: 'api-webhooks', label: 'API Webhooks', startValue: 41, endValue: 58 },
  { id: 'legacy-export', label: 'Legacy Export', startValue: 71, endValue: 39 },
  { id: 'manual-audit', label: 'Manual Audit', startValue: 48, endValue: 26 },
];

function normalizeZero(value: number): number {
  return value === 0 ? 0 : value;
}

function roundTwoDecimals(value: number): number {
  return normalizeZero(Math.round(value * 100) / 100);
}

function roundOneDecimal(value: number): number {
  return normalizeZero(Math.round(value * 10) / 10);
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

function formatMetric(value: number, unit: string): string {
  const num = formatNumeric(value);
  return unit ? `${num}${unit}` : num;
}

function formatSignedDelta(delta: number, unit: string): string {
  const safe = normalizeZero(delta);
  if (safe > 0) {
    return `+${formatMetric(safe, unit)}`;
  }
  if (safe < 0) {
    return formatMetric(safe, unit);
  }
  return formatMetric(0, unit);
}

function formatDeltaPct(deltaPct: number | null): string {
  if (deltaPct === null) {
    return 'N/A';
  }
  const safe = normalizeZero(deltaPct);
  if (safe > 0) {
    return `+${formatNumeric(safe)}%`;
  }
  if (safe < 0) {
    return `${formatNumeric(safe)}%`;
  }
  return '0%';
}

function formatRankShift(startRank: number, endRank: number): string {
  const shift = startRank - endRank;
  if (shift > 0) {
    return `Rank #${startRank} → #${endRank} (+${shift})`;
  }
  if (shift < 0) {
    return `Rank #${startRank} → #${endRank} (${shift})`;
  }
  return `Rank #${startRank} → #${endRank}`;
}

function truncateLabel(text: string, maxChars: number): string {
  if (text.length <= maxChars) {
    return text;
  }
  return `${text.slice(0, maxChars - 1)}…`;
}

function getToneColor(tone: SlopeTone): string {
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
    case 'info':
      return 'var(--prism-info-main)';
  }
}

function getSeriesColor(direction: SlopeDirection, tone?: SlopeTone): string {
  if (tone !== undefined) {
    return getToneColor(tone);
  }
  if (direction === 'rising') {
    return 'var(--prism-success-main)';
  }
  if (direction === 'declining') {
    return 'var(--prism-error-main)';
  }
  return 'var(--prism-text-secondary)';
}

function computeCompetitionRanks(values: ReadonlyArray<number>): number[] {
  const sorted = [...values].sort((a, b) => b - a);
  return values.map((val) => sorted.indexOf(val) + 1);
}

function resolveLabelPositions(
  anchors: ReadonlyArray<LabelAnchor>,
  minY: number,
  maxY: number,
  minGap: number
): Map<string, number> {
  const result = new Map<string, number>();
  const count = anchors.length;
  if (count === 0) {
    return result;
  }

  const sorted = [...anchors].sort((a, b) => a.rawY - b.rawY || a.order - b.order);
  const availableSpan = Math.max(0, maxY - minY);
  const effectiveGap = count > 1 ? Math.min(minGap, availableSpan / (count - 1)) : 0;

  const ys = sorted.map((entry) => clampNumber(entry.rawY, minY, maxY, minY));

  for (let i = 1; i < count; i += 1) {
    const prev = ys[i - 1]!;
    if (ys[i]! < prev + effectiveGap) {
      ys[i] = prev + effectiveGap;
    }
  }

  if (ys[count - 1]! > maxY) {
    ys[count - 1] = maxY;
    for (let i = count - 2; i >= 0; i -= 1) {
      const next = ys[i + 1]!;
      if (ys[i]! > next - effectiveGap) {
        ys[i] = next - effectiveGap;
      }
    }
  }

  for (let i = 0; i < count; i += 1) {
    result.set(sorted[i]!.key, roundCoord(clampNumber(ys[i]!, minY, maxY, minY)));
  }

  return result;
}

function SlopegraphChartInner({
  items,
  startLabel = 'Q1 2026',
  endLabel = 'Q4 2026',
  unit = '%',
  title = 'Before / After Slopegraph',
  onSelectItem,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: SlopegraphChartProps) {
  const headingId = useId();
  const override = useComponentOverride('SlopegraphChart');
  const seriesRefs = useRef<Map<string, SVGGElement>>(new Map());

  const [directionFilter, setDirectionFilter] = useState<SlopeDirectionFilter>('all');
  const [selectedItemKey, setSelectedItemKey] = useState<string | null>(null);
  const [focusedItemKey, setFocusedItemKey] = useState<string | null>(null);

  const sourceItems = items ?? DEFAULT_SLOPEGRAPH_ITEMS;
  const normalizedUnit = unit;

  const { computedItems, risingCount, decliningCount } = useMemo(() => {
    const validItems: SlopeSeriesItem[] = [];
    for (const item of sourceItems) {
      if (Number.isFinite(item.startValue) && Number.isFinite(item.endValue)) {
        validItems.push(item);
      }
    }

    if (validItems.length === 0) {
      return {
        computedItems: [] as ComputedSlopeItem[],
        risingCount: 0,
        decliningCount: 0,
      };
    }

    const startValues = validItems.map((item) => normalizeZero(item.startValue));
    const endValues = validItems.map((item) => normalizeZero(item.endValue));
    const startRanks = computeCompetitionRanks(startValues);
    const endRanks = computeCompetitionRanks(endValues);

    let dataMin = Number.POSITIVE_INFINITY;
    let dataMax = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < validItems.length; i += 1) {
      const sVal = startValues[i]!;
      const eVal = endValues[i]!;
      if (sVal < dataMin) dataMin = sVal;
      if (sVal > dataMax) dataMax = sVal;
      if (eVal < dataMin) dataMin = eVal;
      if (eVal > dataMax) dataMax = eVal;
    }

    let domainMin = dataMin;
    let domainMax = dataMax;
    if (domainMin === domainMax) {
      const pad = domainMin === 0 ? 1 : Math.abs(domainMin) * 0.1;
      domainMin -= pad;
      domainMax += pad;
    }

    const span = domainMax - domainMin;
    let rising = 0;
    let declining = 0;

    const list: ComputedSlopeItem[] = validItems.map((item, idx) => {
      const startValue = startValues[idx]!;
      const endValue = endValues[idx]!;
      const delta = roundTwoDecimals(endValue - startValue);
      const deltaPct =
        startValue === 0
          ? null
          : roundOneDecimal(((endValue - startValue) / Math.abs(startValue)) * 100);
      const direction: SlopeDirection = delta > 0 ? 'rising' : delta < 0 ? 'declining' : 'flat';

      if (direction === 'rising') {
        rising += 1;
      } else if (direction === 'declining') {
        declining += 1;
      }

      const startRatio = clampNumber((startValue - domainMin) / span, 0, 1, 0.5);
      const endRatio = clampNumber((endValue - domainMin) / span, 0, 1, 0.5);
      const startY = roundCoord(PLOT_BOTTOM - startRatio * PLOT_HEIGHT);
      const endY = roundCoord(PLOT_BOTTOM - endRatio * PLOT_HEIGHT);

      const startRank = startRanks[idx]!;
      const endRank = endRanks[idx]!;
      const color = getSeriesColor(direction, item.tone);

      const startFormatted = formatMetric(startValue, normalizedUnit);
      const endFormatted = formatMetric(endValue, normalizedUnit);
      const signedDeltaFormatted = formatSignedDelta(delta, normalizedUnit);
      const deltaPctFormatted = formatDeltaPct(deltaPct);
      const rankShiftFormatted = formatRankShift(startRank, endRank);

      const selection: SlopeSeriesSelection = {
        id: item.id,
        label: item.label,
        startValue,
        endValue,
        ...(item.tone !== undefined ? { tone: item.tone } : {}),
        delta,
        deltaPct,
        startRank,
        endRank,
      };

      return {
        key: `slope-${item.id}-${idx}`,
        id: item.id,
        label: item.label,
        startValue,
        endValue,
        delta,
        deltaPct,
        direction,
        tone: item.tone,
        color,
        startRank,
        endRank,
        startY,
        endY,
        startFormatted,
        endFormatted,
        signedDeltaFormatted,
        deltaPctFormatted,
        rankShiftFormatted,
        ariaLabel: `${item.label}: ${startFormatted} to ${endFormatted} (${signedDeltaFormatted}, ${deltaPctFormatted}), ${rankShiftFormatted}`,
        selection,
      };
    });

    return {
      computedItems: list,
      risingCount: rising,
      decliningCount: declining,
    };
  }, [sourceItems, normalizedUnit]);

  const isEmpty = computedItems.length === 0;

  const { positionedItems, contextItems } = useMemo(() => {
    const visible: ComputedSlopeItem[] = [];
    const context: ComputedSlopeItem[] = [];

    for (const entry of computedItems) {
      const matches =
        directionFilter === 'all' ||
        (directionFilter === 'rising' && entry.direction === 'rising') ||
        (directionFilter === 'declining' && entry.direction === 'declining');
      if (matches) {
        visible.push(entry);
      } else {
        context.push(entry);
      }
    }

    const leftPositions = resolveLabelPositions(
      visible.map((entry, idx) => ({ key: entry.key, rawY: entry.startY, order: idx })),
      LABEL_MIN_Y,
      LABEL_MAX_Y,
      MIN_LABEL_GAP
    );
    const rightPositions = resolveLabelPositions(
      visible.map((entry, idx) => ({ key: entry.key, rawY: entry.endY, order: idx })),
      LABEL_MIN_Y,
      LABEL_MAX_Y,
      MIN_LABEL_GAP
    );

    const positioned: PositionedSlopeItem[] = visible.map((entry) => ({
      ...entry,
      leftLabelY: leftPositions.get(entry.key)!,
      rightLabelY: rightPositions.get(entry.key)!,
    }));

    return {
      positionedItems: positioned,
      contextItems: context,
    };
  }, [computedItems, directionFilter]);

  const netAvgDelta = useMemo<number | null>(() => {
    if (positionedItems.length === 0) {
      return null;
    }
    let total = 0;
    for (const entry of positionedItems) {
      total += entry.delta;
    }
    return roundOneDecimal(total / positionedItems.length);
  }, [positionedItems]);

  const selectedItem = useMemo(() => {
    if (selectedItemKey === null) return null;
    return positionedItems.find((entry) => entry.key === selectedItemKey) ?? null;
  }, [positionedItems, selectedItemKey]);

  const focusedItem = useMemo(() => {
    if (focusedItemKey === null) return null;
    return positionedItems.find((entry) => entry.key === focusedItemKey) ?? null;
  }, [positionedItems, focusedItemKey]);

  const activeItem = focusedItem ?? selectedItem;

  const registerSeriesRef = useCallback((seriesKey: string, node: SVGGElement | null) => {
    if (node) {
      seriesRefs.current.set(seriesKey, node);
    } else {
      seriesRefs.current.delete(seriesKey);
    }
  }, []);

  const handleSelectFilter = useCallback((nextFilter: SlopeDirectionFilter) => {
    setDirectionFilter(nextFilter);
    setSelectedItemKey(null);
    setFocusedItemKey(null);
  }, []);

  const handleSelectSeries = useCallback(
    (entry: PositionedSlopeItem) => {
      setSelectedItemKey(entry.key);
      onSelectItem?.(entry.selection);
    },
    [onSelectItem]
  );

  const handleFocusSeries = useCallback((seriesKey: string) => {
    setFocusedItemKey(seriesKey);
  }, []);

  const handleBlurSeries = useCallback((seriesKey: string) => {
    setFocusedItemKey((prev) => (prev === seriesKey ? null : prev));
  }, []);

  const handleSeriesKeyDown = useCallback(
    (entryIndex: number, entry: PositionedSlopeItem) =>
      (event: ReactKeyboardEvent<SVGGElement>) => {
        if (event.nativeEvent.isComposing) return;

        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleSelectSeries(entry);
          return;
        }

        if (event.key === 'Escape') {
          event.preventDefault();
          setSelectedItemKey(null);
          setFocusedItemKey(null);
          return;
        }

        const count = positionedItems.length;
        let target: PositionedSlopeItem | null = null;
        if (event.key === 'ArrowDown') {
          target = positionedItems[(entryIndex + 1) % count]!;
        } else if (event.key === 'ArrowUp') {
          target = positionedItems[(entryIndex - 1 + count) % count]!;
        }

        if (target) {
          event.preventDefault();
          seriesRefs.current.get(target.key)?.focus();
          handleSelectSeries(target);
        }
      },
    [positionedItems, handleSelectSeries]
  );

  const merged = mergeProps({
    themeTarget: themeProps('slopegraph-chart', {
      empty: isEmpty,
      filter: directionFilter,
      seriesCount: positionedItems.length,
      hasSelection: activeItem !== null,
    }),
    baseClassName: 'prism-slab p-4 sm:p-5 space-y-4 w-full max-w-full min-w-0',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('slopegraph-chart', 'header');
  const filtersClass = stableClassName('slopegraph-chart', 'filters');
  const wellClass = stableClassName('slopegraph-chart', 'well');
  const svgClass = stableClassName('slopegraph-chart', 'svg');
  const readoutClass = stableClassName('slopegraph-chart', 'readout');

  const avgBadgeText =
    netAvgDelta === null
      ? 'Net Avg —'
      : `Net Avg ${formatSignedDelta(netAvgDelta, normalizedUnit)}`;

  const avgBadgeTone =
    netAvgDelta === null || netAvgDelta === 0
      ? 'neutral'
      : netAvgDelta > 0
        ? 'positive'
        : 'negative';

  return (
    <div ref={ref} role="region" aria-labelledby={headingId} {...rest} {...merged}>
      <div className={cx(headerClass, 'space-y-3 min-w-0')}>
        <div className="flex flex-wrap items-center justify-between gap-2.5 min-w-0">
          <h4
            id={headingId}
            className="text-sm font-semibold tracking-tight min-w-0 break-words"
            style={STYLE_TEXT_PRIMARY}
          >
            {title}
          </h4>

          {!isEmpty ? (
            <span
              data-testid="slopegraph-avg-badge"
              data-avg-tone={avgBadgeTone}
              className={cx(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-semibold tabular-nums shrink-0',
                avgBadgeTone === 'positive' ? 'prism-emerald' : 'prism-crystal'
              )}
              style={
                avgBadgeTone === 'positive'
                  ? undefined
                  : {
                      color:
                        avgBadgeTone === 'negative'
                          ? 'var(--prism-error-main)'
                          : 'var(--prism-text-secondary)',
                    }
              }
            >
              {avgBadgeText}
            </span>
          ) : null}
        </div>

        {!isEmpty ? (
          <div
            role="group"
            aria-label="Filter slopegraph series by direction"
            data-testid="slopegraph-direction-filters"
            className={cx(filtersClass, 'flex flex-wrap items-center gap-1.5 min-w-0')}
          >
            <button
              type="button"
              aria-pressed={directionFilter === 'all'}
              data-direction-filter="all"
              onClick={() => handleSelectFilter('all')}
              className={cx(
                'prism-focus-ring inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-opacity duration-150',
                directionFilter === 'all' ? 'prism-crystal opacity-100' : 'prism-well opacity-75'
              )}
              style={STYLE_TEXT_PRIMARY}
            >
              <span>All</span>
              <span
                className="font-mono text-[11px] tabular-nums"
                style={STYLE_TEXT_SECONDARY}
              >
                {String(computedItems.length)}
              </span>
            </button>

            <button
              type="button"
              aria-pressed={directionFilter === 'rising'}
              data-direction-filter="rising"
              onClick={() => handleSelectFilter('rising')}
              className={cx(
                'prism-focus-ring inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-opacity duration-150',
                directionFilter === 'rising'
                  ? 'prism-crystal opacity-100'
                  : 'prism-well opacity-75'
              )}
              style={STYLE_TEXT_PRIMARY}
            >
              <span
                aria-hidden="true"
                className="w-2 h-2 rounded-full shrink-0"
                style={STYLE_BG_SUCCESS}
              />
              <span>Rising Only</span>
              <span
                className="font-mono text-[11px] tabular-nums"
                style={STYLE_TEXT_SECONDARY}
              >
                {String(risingCount)}
              </span>
            </button>

            <button
              type="button"
              aria-pressed={directionFilter === 'declining'}
              data-direction-filter="declining"
              onClick={() => handleSelectFilter('declining')}
              className={cx(
                'prism-focus-ring inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-opacity duration-150',
                directionFilter === 'declining'
                  ? 'prism-crystal opacity-100'
                  : 'prism-well opacity-75'
              )}
              style={STYLE_TEXT_PRIMARY}
            >
              <span
                aria-hidden="true"
                className="w-2 h-2 rounded-full shrink-0"
                style={STYLE_BG_ERROR}
              />
              <span>Declining Only</span>
              <span
                className="font-mono text-[11px] tabular-nums"
                style={STYLE_TEXT_SECONDARY}
              >
                {String(decliningCount)}
              </span>
            </button>
          </div>
        ) : null}
      </div>

      {isEmpty ? (
        <div
          role="status"
          data-testid="slopegraph-empty"
          className="prism-well rounded-2xl px-4 py-8 text-center text-xs font-medium"
          style={STYLE_TEXT_SECONDARY}
        >
          No slopegraph series to display.
        </div>
      ) : positionedItems.length === 0 ? (
        <div
          role="status"
          data-testid="slopegraph-filter-empty"
          className="prism-well rounded-2xl px-4 py-8 text-center text-xs font-medium"
          style={STYLE_TEXT_SECONDARY}
        >
          {directionFilter === 'rising'
            ? 'No rising series match the current filter.'
            : 'No declining series match the current filter.'}
        </div>
      ) : (
        <div
          className={cx(
            wellClass,
            'prism-well rounded-2xl p-3 w-full max-w-full min-w-0 overflow-hidden'
          )}
        >
          <svg
            role="img"
            aria-label={`${title} comparing ${startLabel} and ${endLabel} across ${positionedItems.length} series`}
            viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
            className={cx(svgClass, 'w-full h-auto select-none block')}
          >
            <g data-role="axis-rails">
              <text
                data-role="start-axis-label"
                x={LEFT_X}
                y={HEADER_Y}
                textAnchor="middle"
                fill="var(--prism-text-primary)"
                className="text-[11px] font-semibold"
              >
                {truncateLabel(startLabel, MAX_COLUMN_LABEL_CHARS)}
              </text>

              <text
                data-role="end-axis-label"
                x={RIGHT_X}
                y={HEADER_Y}
                textAnchor="middle"
                fill="var(--prism-text-primary)"
                className="text-[11px] font-semibold"
              >
                {truncateLabel(endLabel, MAX_COLUMN_LABEL_CHARS)}
              </text>

              <line
                data-role="mid-guide"
                x1={LEFT_X}
                y1={PLOT_MID}
                x2={RIGHT_X}
                y2={PLOT_MID}
                stroke="var(--prism-divider)"
                strokeWidth={1}
                strokeDasharray="3 4"
                strokeOpacity={0.75}
              />

              <line
                data-role="start-axis-rail"
                x1={LEFT_X}
                y1={AXIS_TOP}
                x2={LEFT_X}
                y2={AXIS_BOTTOM}
                stroke="var(--prism-divider)"
                strokeWidth={1.75}
                strokeLinecap="round"
              />
              <line
                x1={LEFT_X - 5}
                y1={AXIS_TOP}
                x2={LEFT_X + 5}
                y2={AXIS_TOP}
                stroke="var(--prism-divider)"
                strokeWidth={1.25}
              />
              <line
                x1={LEFT_X - 5}
                y1={AXIS_BOTTOM}
                x2={LEFT_X + 5}
                y2={AXIS_BOTTOM}
                stroke="var(--prism-divider)"
                strokeWidth={1.25}
              />

              <line
                data-role="end-axis-rail"
                x1={RIGHT_X}
                y1={AXIS_TOP}
                x2={RIGHT_X}
                y2={AXIS_BOTTOM}
                stroke="var(--prism-divider)"
                strokeWidth={1.75}
                strokeLinecap="round"
              />
              <line
                x1={RIGHT_X - 5}
                y1={AXIS_TOP}
                x2={RIGHT_X + 5}
                y2={AXIS_TOP}
                stroke="var(--prism-divider)"
                strokeWidth={1.25}
              />
              <line
                x1={RIGHT_X - 5}
                y1={AXIS_BOTTOM}
                x2={RIGHT_X + 5}
                y2={AXIS_BOTTOM}
                stroke="var(--prism-divider)"
                strokeWidth={1.25}
              />
            </g>

            {contextItems.length > 0 ? (
              <g aria-hidden="true" pointerEvents="none" data-role="filtered-context-layer">
                {contextItems.map((entry) => (
                  <line
                    key={`ctx-${entry.key}`}
                    data-role="filtered-context-line"
                    x1={LEFT_X}
                    y1={entry.startY}
                    x2={RIGHT_X}
                    y2={entry.endY}
                    stroke="var(--prism-divider)"
                    strokeWidth={1}
                    strokeOpacity={0.35}
                    strokeDasharray="3 3"
                    strokeLinecap="round"
                  />
                ))}
              </g>
            ) : null}

            <g data-role="slope-series-list">
              {positionedItems.map((entry, idx) => {
                const isSelected = selectedItem?.key === entry.key;
                const isActive = activeItem?.key === entry.key;
                const isDimmed = activeItem !== null && !isActive;
                const hasLeftOffset = Math.abs(entry.leftLabelY - entry.startY) > 1;
                const hasRightOffset = Math.abs(entry.rightLabelY - entry.endY) > 1;
                const shortLabel = truncateLabel(entry.label, MAX_SERIES_LABEL_CHARS);

                return (
                  <g
                    key={entry.key}
                    ref={(node) => registerSeriesRef(entry.key, node)}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                    aria-label={entry.ariaLabel}
                    data-role="slope-series"
                    data-series-id={entry.id}
                    data-direction={entry.direction}
                    data-tone={entry.tone ?? entry.direction}
                    data-selected={isSelected ? 'true' : 'false'}
                    data-active={isActive ? 'true' : 'false'}
                    data-dimmed={isDimmed ? 'true' : 'false'}
                    className="prism-focus-ring cursor-pointer"
                    onClick={() => handleSelectSeries(entry)}
                    onFocus={() => handleFocusSeries(entry.key)}
                    onBlur={() => handleBlurSeries(entry.key)}
                    onKeyDown={handleSeriesKeyDown(idx, entry)}
                  >
                    <line
                      x1={LEFT_X}
                      y1={entry.startY}
                      x2={RIGHT_X}
                      y2={entry.endY}
                      stroke="var(--prism-divider)"
                      strokeOpacity={0}
                      strokeWidth={14}
                      strokeLinecap="round"
                    />

                    <line
                      data-role="slope-line"
                      x1={LEFT_X}
                      y1={entry.startY}
                      x2={RIGHT_X}
                      y2={entry.endY}
                      stroke={entry.color}
                      strokeWidth={isActive ? 3 : isDimmed ? 1.25 : 2}
                      strokeOpacity={isActive ? 1 : isDimmed ? 0.2 : 0.88}
                      strokeLinecap="round"
                    />

                    {hasLeftOffset ? (
                      <line
                        data-role="slope-left-leader"
                        x1={LEFT_LABEL_X + 3}
                        y1={entry.leftLabelY}
                        x2={LEFT_X - 4}
                        y2={entry.startY}
                        stroke={entry.color}
                        strokeWidth={0.75}
                        strokeOpacity={isActive ? 0.85 : isDimmed ? 0.14 : 0.42}
                        pointerEvents="none"
                      />
                    ) : null}

                    {hasRightOffset ? (
                      <line
                        data-role="slope-right-leader"
                        x1={RIGHT_X + 4}
                        y1={entry.endY}
                        x2={RIGHT_LABEL_X - 3}
                        y2={entry.rightLabelY}
                        stroke={entry.color}
                        strokeWidth={0.75}
                        strokeOpacity={isActive ? 0.85 : isDimmed ? 0.14 : 0.42}
                        pointerEvents="none"
                      />
                    ) : null}

                    <circle
                      data-role="slope-start-dot"
                      cx={LEFT_X}
                      cy={entry.startY}
                      r={isActive ? 4.5 : 3.2}
                      fill={entry.color}
                      fillOpacity={isActive ? 1 : isDimmed ? 0.24 : 0.95}
                      stroke="var(--prism-bg-start)"
                      strokeWidth={1.25}
                      pointerEvents="none"
                    />

                    <circle
                      data-role="slope-end-dot"
                      cx={RIGHT_X}
                      cy={entry.endY}
                      r={isActive ? 4.5 : 3.2}
                      fill={entry.color}
                      fillOpacity={isActive ? 1 : isDimmed ? 0.24 : 0.95}
                      stroke="var(--prism-bg-start)"
                      strokeWidth={1.25}
                      pointerEvents="none"
                    />

                    <text
                      data-role="slope-left-label"
                      x={LEFT_LABEL_X}
                      y={entry.leftLabelY}
                      dy="0.32em"
                      textAnchor="end"
                      fill={isActive ? 'var(--prism-text-primary)' : 'var(--prism-text-secondary)'}
                      opacity={isActive ? 1 : isDimmed ? 0.28 : 0.92}
                      className={cx(
                        'text-[9px] font-mono tabular-nums',
                        isActive ? 'font-semibold' : 'font-medium'
                      )}
                    >
                      {`${shortLabel} ${entry.startFormatted}`}
                    </text>

                    <text
                      data-role="slope-right-label"
                      x={RIGHT_LABEL_X}
                      y={entry.rightLabelY}
                      dy="0.32em"
                      textAnchor="start"
                      fill={isActive ? entry.color : 'var(--prism-text-primary)'}
                      opacity={isActive ? 1 : isDimmed ? 0.28 : 0.92}
                      className={cx(
                        'text-[9px] font-mono tabular-nums',
                        isActive ? 'font-semibold' : 'font-medium'
                      )}
                    >
                      {`${entry.endFormatted} ${shortLabel}`}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>
      )}

      {!isEmpty ? (
        <div
          data-testid="slopegraph-readout"
          aria-live="polite"
          className={cx(
            readoutClass,
            'prism-well rounded-xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 w-full max-w-full min-w-0 text-xs tabular-nums'
          )}
          style={STYLE_TEXT_PRIMARY}
        >
          {activeItem ? (
            <div className="flex flex-wrap items-center gap-1.5 min-w-0 w-full">
              <span className="inline-flex items-center gap-2 font-semibold min-w-0">
                <span
                  aria-hidden="true"
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: activeItem.color }}
                />
                <span data-testid="slopegraph-readout-series" className="truncate">
                  {activeItem.label}
                </span>
              </span>
              <span aria-hidden="true" style={STYLE_TEXT_SECONDARY}>
                ·
              </span>
              <span
                data-testid="slopegraph-readout-range"
                className="font-mono font-medium"
                style={STYLE_TEXT_PRIMARY}
              >
                {`${activeItem.startFormatted} → ${activeItem.endFormatted}`}
              </span>
              <span aria-hidden="true" style={STYLE_TEXT_SECONDARY}>
                ·
              </span>
              <span
                data-testid="slopegraph-readout-delta"
                className="font-mono font-semibold"
                style={{ color: activeItem.color }}
              >
                {activeItem.signedDeltaFormatted}
              </span>
              <span aria-hidden="true" style={STYLE_TEXT_SECONDARY}>
                ·
              </span>
              <span
                data-testid="slopegraph-readout-pct"
                className="prism-crystal rounded-full px-2 py-0.5 text-[11px] font-mono font-medium"
                style={STYLE_TEXT_PRIMARY}
              >
                {activeItem.deltaPctFormatted}
              </span>
              <span aria-hidden="true" style={STYLE_TEXT_SECONDARY}>
                ·
              </span>
              <span
                data-testid="slopegraph-readout-rank"
                className="font-mono font-medium"
                style={STYLE_TEXT_SECONDARY}
              >
                {activeItem.rankShiftFormatted}
              </span>
            </div>
          ) : (
            <>
              <span style={STYLE_TEXT_SECONDARY}>
                Select or focus any slope line (ArrowUp / ArrowDown) to inspect value change and rank shift.
              </span>
              <span
                className="font-mono font-medium shrink-0"
                style={STYLE_TEXT_SECONDARY}
              >
                {directionFilter === 'all'
                  ? `${computedItems.length} series`
                  : `${positionedItems.length}/${computedItems.length} series`}
              </span>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

export const SlopegraphChart = memo(SlopegraphChartInner);
SlopegraphChart.displayName = 'SlopegraphChart';
