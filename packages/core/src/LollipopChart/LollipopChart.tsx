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
import { useControllableState } from '../hooks/useControllableState';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { themeProps } from '../utils/themeProps';

export type LollipopOrientation = 'horizontal' | 'vertical';

export type LollipopSortMode = 'value-desc' | 'value-asc' | 'label';

export type LollipopTone = 'primary' | 'secondary' | 'emerald' | 'amber' | 'info';

export interface LollipopDatum {
  /** Stable unique identifier for this ranked item. */
  id: string;
  /** Human-readable category label displayed beside the stem and in the readout. */
  label: string;
  /** Numeric magnitude plotted along the value axis (non-finite values sanitize to 0). */
  value: number;
  /** Optional semantic optical tone mapped strictly to `--prism-*` CSS custom properties. */
  tone?: LollipopTone;
}

export interface LollipopChartProps extends BaseProps<HTMLDivElement> {
  /**
   * Ranked data items plotted as crisp low-ink stems with sculpted optical terminal circles.
   * Defaults to 7 ranked feature adoption items when omitted; pass `[]` to display
   * the clean `role="status"` empty state.
   */
  data?: ReadonlyArray<LollipopDatum>;
  /** Controlled chart orientation (`'horizontal'` or `'vertical'`). */
  orientation?: LollipopOrientation;
  /** Initial chart orientation when uncontrolled (defaults to `'horizontal'`). */
  defaultOrientation?: LollipopOrientation;
  /** Optional callback fired when the user switches orientation. */
  onOrientationChange?: (orientation: LollipopOrientation) => void;
  /** Controlled sort ordering (`'value-desc'`, `'value-asc'`, or `'label'`). */
  sortBy?: LollipopSortMode;
  /** Initial sort ordering when uncontrolled (defaults to `'value-desc'`). */
  defaultSortBy?: LollipopSortMode;
  /** Optional callback fired when the user switches sort order. */
  onSortByChange?: (sortBy: LollipopSortMode) => void;
  /** Measurement unit suffix appended to formatted values and deltas (defaults to `'k'`). */
  unit?: string;
  /** Prefix prepended before formatted numeric values and deltas (defaults to `''`). */
  valuePrefix?: string;
  /**
   * Optional explicit target/reference threshold for the dashed reference line.
   * When omitted and `showAverageLine` is `true`, the arithmetic mean is computed automatically.
   */
  referenceValue?: number;
  /** Shows the auto-computed mean dashed reference line when `referenceValue` is omitted (defaults to `true`). */
  showAverageLine?: boolean;
  /** Visible heading displayed in the sculpted `prism-slab` header (defaults to `'Low-Ink Lollipop Ranking'`). */
  title?: string;
  /** Callback fired with the selected datum and its 1-based performance rank (`1` = highest value). */
  onSelectItem?: (datum: LollipopDatum, rank: number) => void;
}

interface NormalizedLollipopItem {
  key: string;
  originalIndex: number;
  id: string;
  label: string;
  value: number;
  rank: number;
  tone: LollipopTone;
  color: string;
  original: LollipopDatum;
}

interface AxisTick {
  key: string;
  coord: number;
  label: string;
}

interface PlottedStem {
  item: NormalizedLollipopItem;
  displayIndex: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  labelX: number;
  labelY: number;
  labelAnchor: 'start' | 'middle' | 'end';
  valueX: number;
  valueY: number;
  valueAnchor: 'start' | 'middle' | 'end';
  hitX: number;
  hitY: number;
  hitWidth: number;
  hitHeight: number;
  shortLabel: string;
}

const SVG_WIDTH = 460;
const SVG_HEIGHT = 230;
const STEM_STROKE_WIDTH = 2.5;
const TERMINAL_RADIUS = 6.5;

export const DEFAULT_LOLLIPOP_DATA: ReadonlyArray<LollipopDatum> = [
  { id: 'ai-copilot', label: 'AI Copilot', value: 84.2, tone: 'primary' },
  { id: 'live-canvas', label: 'Live Canvas', value: 71.6, tone: 'secondary' },
  { id: 'smart-search', label: 'Smart Search', value: 63.4, tone: 'emerald' },
  { id: 'auto-sync', label: 'Auto Sync', value: 52.8, tone: 'info' },
  { id: 'voice-notes', label: 'Voice Notes', value: 44.1, tone: 'amber' },
  { id: 'offline-mode', label: 'Offline Mode', value: 36.5, tone: 'primary' },
  { id: 'api-webhooks', label: 'API Webhooks', value: 27.9, tone: 'secondary' },
];

const ORIENTATION_OPTIONS: ReadonlyArray<{ value: LollipopOrientation; label: string }> = [
  { value: 'horizontal', label: 'Horizontal' },
  { value: 'vertical', label: 'Vertical' },
];

const SORT_OPTIONS: ReadonlyArray<{ value: LollipopSortMode; label: string }> = [
  { value: 'value-desc', label: 'High→Low' },
  { value: 'value-asc', label: 'Low→High' },
  { value: 'label', label: 'A→Z' },
];

function getDefaultTone(index: number): LollipopTone {
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
      return 'info';
  }
}

function getToneColor(tone: LollipopTone): string {
  switch (tone) {
    case 'primary':
      return 'var(--prism-primary-main)';
    case 'secondary':
      return 'var(--prism-secondary-main)';
    case 'emerald':
      return 'var(--prism-success-main)';
    case 'amber':
      return 'var(--prism-warning-main)';
    case 'info':
      return 'var(--prism-info-main)';
  }
}

function normalizeZero(value: number): number {
  return value === 0 ? 0 : value;
}

function sanitizeFinite(raw: number): number {
  if (!Number.isFinite(raw)) {
    return 0;
  }
  return normalizeZero(raw);
}

function roundCoord(value: number): number {
  return normalizeZero(Number(value.toFixed(2)));
}

function roundOneDecimal(value: number): number {
  return normalizeZero(Math.round(value * 10) / 10);
}

function formatNumeric(value: number): string {
  const safe = normalizeZero(value);
  if (Number.isInteger(safe)) {
    return String(safe);
  }
  return String(Number(safe.toFixed(2)));
}

function formatValue(value: number, prefix: string, unit: string): string {
  const safe = normalizeZero(value);
  const sign = safe < 0 ? '-' : '';
  return `${sign}${prefix}${formatNumeric(Math.abs(safe))}${unit}`;
}

function formatDelta(delta: number, prefix: string, unit: string): string {
  const rounded = roundOneDecimal(delta);
  if (rounded > 0) {
    return `+${prefix}${formatNumeric(rounded)}${unit}`;
  }
  if (rounded < 0) {
    return `-${prefix}${formatNumeric(Math.abs(rounded))}${unit}`;
  }
  return `${prefix}0${unit}`;
}

function truncateLabel(text: string, maxChars: number): string {
  if (text.length <= maxChars) {
    return text;
  }
  return `${text.slice(0, maxChars - 1)}…`;
}

function compareByValueDesc(
  a: { value: number; label: string; originalIndex: number },
  b: { value: number; label: string; originalIndex: number }
): number {
  if (b.value !== a.value) {
    return b.value - a.value;
  }
  const labelCmp = a.label.localeCompare(b.label, undefined, { sensitivity: 'base' });
  if (labelCmp !== 0) {
    return labelCmp;
  }
  return a.originalIndex - b.originalIndex;
}

export function LollipopChart({
  data,
  orientation,
  defaultOrientation = 'horizontal',
  onOrientationChange,
  sortBy,
  defaultSortBy = 'value-desc',
  onSortByChange,
  unit = 'k',
  valuePrefix = '',
  referenceValue,
  showAverageLine = true,
  title = 'Low-Ink Lollipop Ranking',
  onSelectItem,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: LollipopChartProps) {
  const headingId = useId();
  const override = useComponentOverride('LollipopChart');
  const stemRefs = useRef<Map<string, SVGGElement>>(new Map());

  const [activeOrientation, setActiveOrientation] = useControllableState<LollipopOrientation>({
    value: orientation,
    defaultValue: defaultOrientation,
    onChange: onOrientationChange,
  });

  const [activeSortBy, setActiveSortBy] = useControllableState<LollipopSortMode>({
    value: sortBy,
    defaultValue: defaultSortBy,
    onChange: onSortByChange,
  });

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [focusedKey, setFocusedKey] = useState<string | null>(null);

  const sourceData = data ?? DEFAULT_LOLLIPOP_DATA;
  const isEmpty = sourceData.length === 0;

  const { sortedItems, meanValue, hasExplicitReference, lineReferenceValue, referenceWord } =
    useMemo(() => {
      if (sourceData.length === 0) {
        return {
          sortedItems: [] as NormalizedLollipopItem[],
          meanValue: 0,
          hasExplicitReference: false,
          lineReferenceValue: null as number | null,
          referenceWord: 'Average' as 'Reference' | 'Average',
        };
      }

      const idCounts = new Map<string, number>();
      let sum = 0;

      const baseItems = sourceData.map((datum, originalIndex) => {
        const seen = idCounts.get(datum.id) ?? 0;
        idCounts.set(datum.id, seen + 1);
        const key = seen === 0 ? `lollipop:${datum.id}` : `lollipop:${datum.id}#${seen + 1}`;
        const value = sanitizeFinite(datum.value);
        sum += value;
        const tone = datum.tone ?? getDefaultTone(originalIndex);

        return {
          key,
          originalIndex,
          id: datum.id,
          label: datum.label,
          value,
          tone,
          color: getToneColor(tone),
          original: datum,
        };
      });

      const mean = roundOneDecimal(sum / baseItems.length);
      const explicitRef =
        referenceValue !== undefined && Number.isFinite(referenceValue)
          ? normalizeZero(referenceValue)
          : null;
      const lineRef = explicitRef !== null ? explicitRef : showAverageLine ? mean : null;

      const rankedCopy = [...baseItems].sort(compareByValueDesc);
      const rankByKey = new Map<string, number>();
      rankedCopy.forEach((entry, rankIdx) => {
        rankByKey.set(entry.key, rankIdx + 1);
      });

      const normalized: NormalizedLollipopItem[] = baseItems.map((entry) => ({
        ...entry,
        rank: rankByKey.get(entry.key)!,
      }));

      const ordered = [...normalized].sort((a, b) => {
        if (activeSortBy === 'value-desc') {
          return compareByValueDesc(a, b);
        }
        if (activeSortBy === 'value-asc') {
          if (a.value !== b.value) {
            return a.value - b.value;
          }
          return compareByValueDesc(a, b);
        }
        const labelCmp = a.label.localeCompare(b.label, undefined, { sensitivity: 'base' });
        if (labelCmp !== 0) {
          return labelCmp;
        }
        return compareByValueDesc(a, b);
      });

      return {
        sortedItems: ordered,
        meanValue: mean,
        hasExplicitReference: explicitRef !== null,
        lineReferenceValue: lineRef,
        referenceWord: explicitRef !== null ? ('Reference' as const) : ('Average' as const),
      };
    }, [sourceData, referenceValue, showAverageLine, activeSortBy]);

  const geometry = useMemo(() => {
    if (sortedItems.length === 0) {
      return {
        ticks: [] as AxisTick[],
        stems: [] as PlottedStem[],
        baselineX1: 0,
        baselineY1: 0,
        baselineX2: 0,
        baselineY2: 0,
        refLine: null as {
          x1: number;
          y1: number;
          x2: number;
          y2: number;
          labelX: number;
          labelY: number;
          labelAnchor: 'start' | 'middle' | 'end';
          labelText: string;
        } | null,
      };
    }

    let minVal = 0;
    let maxVal = 0;
    for (const item of sortedItems) {
      if (item.value < minVal) minVal = item.value;
      if (item.value > maxVal) maxVal = item.value;
    }
    if (lineReferenceValue !== null) {
      if (lineReferenceValue < minVal) minVal = lineReferenceValue;
      if (lineReferenceValue > maxVal) maxVal = lineReferenceValue;
    }

    const domainMin = minVal;
    const domainMax = maxVal === domainMin ? domainMin + 1 : maxVal;
    const span = domainMax - domainMin;
    const hasNegative = domainMin < 0;
    const midValue = roundOneDecimal(domainMin + span / 2);
    const tickValues = [domainMin, midValue, domainMax];
    const refTag = hasExplicitReference ? 'Ref' : 'Avg';
    const refText =
      lineReferenceValue !== null
        ? `${refTag} ${formatValue(lineReferenceValue, valuePrefix, unit)}`
        : '';

    if (activeOrientation === 'horizontal') {
      const padTop = 24;
      const padBottom = 24;
      const padLeft = hasNegative ? 132 : 104;
      const padRight = 58;
      const plotWidth = SVG_WIDTH - padLeft - padRight;
      const plotHeight = SVG_HEIGHT - padTop - padBottom;
      const mapX = (val: number) => roundCoord(padLeft + ((val - domainMin) / span) * plotWidth);

      const baselineX = mapX(0);
      const ticks: AxisTick[] = tickValues.map((val, idx) => ({
        key: `h-tick-${idx}`,
        coord: mapX(val),
        label: formatValue(val, valuePrefix, unit),
      }));

      const rowStep = plotHeight / sortedItems.length;
      const hitHeight = roundCoord(Math.min(24, Math.max(14, rowStep - 2)));

      const stems: PlottedStem[] = sortedItems.map((item, displayIndex) => {
        const y = roundCoord(padTop + (displayIndex + 0.5) * rowStep);
        const tipX = mapX(item.value);
        const isNeg = item.value < 0;

        return {
          item,
          displayIndex,
          x1: baselineX,
          y1: y,
          x2: tipX,
          y2: y,
          labelX: 96,
          labelY: roundCoord(y + 3.5),
          labelAnchor: 'end',
          valueX: roundCoord(isNeg ? tipX - 11 : tipX + 11),
          valueY: roundCoord(y + 3.5),
          valueAnchor: isNeg ? 'end' : 'start',
          hitX: roundCoord(padLeft - 4),
          hitY: roundCoord(y - hitHeight / 2),
          hitWidth: roundCoord(plotWidth + padRight),
          hitHeight,
          shortLabel: truncateLabel(item.label, 14),
        };
      });

      const refLine =
        lineReferenceValue !== null
          ? {
              x1: mapX(lineReferenceValue),
              y1: padTop - 6,
              x2: mapX(lineReferenceValue),
              y2: padTop + plotHeight + 4,
              labelX: roundCoord(
                clampNumber(mapX(lineReferenceValue), padLeft + 26, SVG_WIDTH - padRight - 10)
              ),
              labelY: padTop - 10,
              labelAnchor: 'middle' as const,
              labelText: refText,
            }
          : null;

      return {
        ticks,
        stems,
        baselineX1: baselineX,
        baselineY1: padTop - 4,
        baselineX2: baselineX,
        baselineY2: padTop + plotHeight + 4,
        refLine,
      };
    }

    // Vertical orientation
    const padTop = 30;
    const padBottom = hasNegative ? 48 : 34;
    const padLeft = 52;
    const padRight = 18;
    const plotWidth = SVG_WIDTH - padLeft - padRight;
    const plotHeight = SVG_HEIGHT - padTop - padBottom;
    const mapY = (val: number) =>
      roundCoord(padTop + plotHeight - ((val - domainMin) / span) * plotHeight);

    const baselineY = mapY(0);
    const ticks: AxisTick[] = tickValues.map((val, idx) => ({
      key: `v-tick-${idx}`,
      coord: mapY(val),
      label: formatValue(val, valuePrefix, unit),
    }));

    const colStep = plotWidth / sortedItems.length;
    const hitWidth = roundCoord(Math.min(44, Math.max(18, colStep - 4)));
    const maxVerticalChars = sortedItems.length <= 5 ? 11 : sortedItems.length <= 8 ? 8 : 6;

    const stems: PlottedStem[] = sortedItems.map((item, displayIndex) => {
      const x = roundCoord(padLeft + (displayIndex + 0.5) * colStep);
      const tipY = mapY(item.value);
      const isNeg = item.value < 0;

      return {
        item,
        displayIndex,
        x1: x,
        y1: baselineY,
        x2: x,
        y2: tipY,
        labelX: x,
        labelY: roundCoord(padTop + plotHeight + (hasNegative ? 32 : 18)),
        labelAnchor: 'middle',
        valueX: x,
        valueY: roundCoord(isNeg ? tipY + 17 : tipY - 12),
        valueAnchor: 'middle',
        hitX: roundCoord(x - hitWidth / 2),
        hitY: roundCoord(padTop - 8),
        hitWidth,
        hitHeight: roundCoord(plotHeight + 16),
        shortLabel: truncateLabel(item.label, maxVerticalChars),
      };
    });

    const refLine =
      lineReferenceValue !== null
        ? {
            x1: padLeft - 4,
            y1: mapY(lineReferenceValue),
            x2: padLeft + plotWidth + 4,
            y2: mapY(lineReferenceValue),
            labelX: padLeft + plotWidth,
            labelY: roundCoord(Math.max(12, mapY(lineReferenceValue) - 5)),
            labelAnchor: 'end' as const,
            labelText: refText,
          }
        : null;

    return {
      ticks,
      stems,
      baselineX1: padLeft - 4,
      baselineY1: baselineY,
      baselineX2: padLeft + plotWidth + 4,
      baselineY2: baselineY,
      refLine,
    };
  }, [
    sortedItems,
    lineReferenceValue,
    hasExplicitReference,
    activeOrientation,
    valuePrefix,
    unit,
  ]);

  const selectedItem = useMemo(() => {
    if (selectedKey === null) return null;
    return sortedItems.find((item) => item.key === selectedKey) ?? null;
  }, [sortedItems, selectedKey]);

  const focusedItem = useMemo(() => {
    if (focusedKey === null) return null;
    return sortedItems.find((item) => item.key === focusedKey) ?? null;
  }, [sortedItems, focusedKey]);

  const activeHighlightItem = focusedItem ?? selectedItem;
  const readoutItem = activeHighlightItem ?? sortedItems[0] ?? null;

  const comparisonBaseline = hasExplicitReference ? lineReferenceValue! : meanValue;

  const registerStemRef = useCallback((stemKey: string, node: SVGGElement | null) => {
    if (node) {
      stemRefs.current.set(stemKey, node);
    } else {
      stemRefs.current.delete(stemKey);
    }
  }, []);

  const handleSelectItem = useCallback(
    (item: NormalizedLollipopItem) => {
      setSelectedKey(item.key);
      onSelectItem?.(item.original, item.rank);
    },
    [onSelectItem]
  );

  const handleToggleItem = useCallback(
    (item: NormalizedLollipopItem) => {
      if (selectedItem?.key === item.key) {
        setSelectedKey(null);
        return;
      }
      handleSelectItem(item);
    },
    [handleSelectItem, selectedItem]
  );

  const handleFocusItem = useCallback((stemKey: string) => {
    setFocusedKey(stemKey);
  }, []);

  const handleBlurItem = useCallback((stemKey: string) => {
    setFocusedKey((prev) => (prev === stemKey ? null : prev));
  }, []);

  const handleStemKeyDown = useCallback(
    (displayIndex: number, item: NormalizedLollipopItem) =>
      (event: ReactKeyboardEvent<SVGGElement>) => {
        if (event.nativeEvent.isComposing) return;

        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleToggleItem(item);
          return;
        }

        const count = sortedItems.length;
        if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
          event.preventDefault();
          const nextItem = sortedItems[(displayIndex + 1) % count]!;
          stemRefs.current.get(nextItem.key)?.focus();
          handleSelectItem(nextItem);
          return;
        }

        if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
          event.preventDefault();
          const prevItem = sortedItems[(displayIndex - 1 + count) % count]!;
          stemRefs.current.get(prevItem.key)?.focus();
          handleSelectItem(prevItem);
        }
      },
    [sortedItems, handleSelectItem, handleToggleItem]
  );

  const merged = mergeProps({
    themeTarget: themeProps('lollipop-chart', {
      orientation: activeOrientation,
      sortBy: activeSortBy,
      empty: isEmpty,
      hasSelection: activeHighlightItem !== null,
      reference: lineReferenceValue !== null,
    }),
    baseClassName: 'prism-slab p-4 sm:p-5 space-y-4 w-full max-w-full min-w-0',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('lollipop-chart', 'header');
  const wellClass = stableClassName('lollipop-chart', 'well');
  const svgClass = stableClassName('lollipop-chart', 'svg');
  const readoutClass = stableClassName('lollipop-chart', 'readout');

  const readoutDelta = readoutItem ? roundOneDecimal(readoutItem.value - comparisonBaseline) : 0;
  const readoutDeltaColor =
    readoutDelta > 0
      ? 'var(--prism-success-main)'
      : readoutDelta < 0
        ? 'var(--prism-warning-main)'
        : 'var(--prism-text-secondary)';

  return (
    <div ref={ref} role="region" aria-labelledby={headingId} {...rest} {...merged}>
      <div className={cx(headerClass, 'flex flex-wrap items-center justify-between gap-2.5 min-w-0')}>
        <h4
          id={headingId}
          className="text-sm font-semibold tracking-tight min-w-0 break-words"
          style={{ color: 'var(--prism-text-primary)' }}
        >
          {title}
        </h4>

        <div className="flex flex-wrap items-center gap-2 min-w-0 max-w-full">
          <div
            role="group"
            aria-label="Chart orientation"
            className="prism-well inline-flex flex-wrap items-center gap-0.5 rounded-full p-0.5 min-w-0 max-w-full"
          >
            {ORIENTATION_OPTIONS.map((opt) => {
              const pressed = activeOrientation === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  aria-pressed={pressed}
                  data-orientation-option={opt.value}
                  onClick={() => setActiveOrientation(opt.value)}
                  className={cx(
                    'prism-focus-ring rounded-full px-2.5 py-1 text-xs cursor-pointer transition-all',
                    pressed ? 'prism-crystal font-semibold' : 'font-medium opacity-75'
                  )}
                  style={{
                    color: pressed ? 'var(--prism-text-primary)' : 'var(--prism-text-secondary)',
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <div
            role="group"
            aria-label="Sort ranking"
            className="prism-well inline-flex flex-wrap items-center gap-0.5 rounded-full p-0.5 min-w-0 max-w-full"
          >
            {SORT_OPTIONS.map((opt) => {
              const pressed = activeSortBy === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  aria-pressed={pressed}
                  data-sort-option={opt.value}
                  onClick={() => setActiveSortBy(opt.value)}
                  className={cx(
                    'prism-focus-ring rounded-full px-2.5 py-1 text-xs cursor-pointer transition-all',
                    pressed ? 'prism-crystal font-semibold' : 'font-medium opacity-75'
                  )}
                  style={{
                    color: pressed ? 'var(--prism-text-primary)' : 'var(--prism-text-secondary)',
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {isEmpty || !readoutItem ? (
        <div
          role="status"
          data-testid="lollipop-empty"
          className="prism-well rounded-2xl px-4 py-8 text-center text-xs font-medium"
          style={{ color: 'var(--prism-text-secondary)' }}
        >
          No lollipop ranking data to display.
        </div>
      ) : (
        <>
          <div className={cx(wellClass, 'prism-well rounded-2xl p-3 sm:p-4 w-full max-w-full min-w-0')}>
            <svg
              role="img"
              aria-label={`${title} ${activeOrientation} lollipop chart with ${sortedItems.length} ranked items`}
              data-testid="lollipop-svg"
              viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
              className={cx(svgClass, 'w-full h-auto select-none')}
            >
              <g data-testid="lollipop-grid" pointerEvents="none">
                {geometry.ticks.map((tick) =>
                  activeOrientation === 'horizontal' ? (
                    <g key={tick.key}>
                      <line
                        x1={tick.coord}
                        y1={20}
                        x2={tick.coord}
                        y2={SVG_HEIGHT - 20}
                        stroke="var(--prism-divider)"
                        strokeWidth={0.85}
                        strokeDasharray="2 3"
                      />
                      <text
                        x={tick.coord}
                        y={SVG_HEIGHT - 7}
                        textAnchor="middle"
                        fill="var(--prism-text-secondary)"
                        className="text-[9px] font-mono tabular-nums"
                      >
                        {tick.label}
                      </text>
                    </g>
                  ) : (
                    <g key={tick.key}>
                      <line
                        x1={48}
                        y1={tick.coord}
                        x2={SVG_WIDTH - 14}
                        y2={tick.coord}
                        stroke="var(--prism-divider)"
                        strokeWidth={0.85}
                        strokeDasharray="2 3"
                      />
                      <text
                        x={44}
                        y={roundCoord(tick.coord + 3)}
                        textAnchor="end"
                        fill="var(--prism-text-secondary)"
                        className="text-[9px] font-mono tabular-nums"
                      >
                        {tick.label}
                      </text>
                    </g>
                  )
                )}

                <line
                  data-testid="lollipop-baseline"
                  x1={geometry.baselineX1}
                  y1={geometry.baselineY1}
                  x2={geometry.baselineX2}
                  y2={geometry.baselineY2}
                  stroke="var(--prism-divider)"
                  strokeWidth={1.25}
                />
              </g>

              {geometry.refLine ? (
                <g data-testid="lollipop-reference-line" pointerEvents="none">
                  <line
                    x1={geometry.refLine.x1}
                    y1={geometry.refLine.y1}
                    x2={geometry.refLine.x2}
                    y2={geometry.refLine.y2}
                    stroke="var(--prism-text-secondary)"
                    strokeWidth={1.25}
                    strokeDasharray="4 3"
                    strokeOpacity={0.85}
                  />
                  <text
                    data-testid="lollipop-reference-label"
                    x={geometry.refLine.labelX}
                    y={geometry.refLine.labelY}
                    textAnchor={geometry.refLine.labelAnchor}
                    fill="var(--prism-text-secondary)"
                    className="text-[9px] font-mono font-semibold tabular-nums"
                  >
                    {geometry.refLine.labelText}
                  </text>
                </g>
              ) : null}

              <g data-testid="lollipop-stems">
                {geometry.stems.map((stem) => {
                  const { item } = stem;
                  const isSelected = selectedItem?.key === item.key;
                  const isActive = activeHighlightItem?.key === item.key;
                  const isDimmed = activeHighlightItem !== null && !isActive;
                  const formattedVal = formatValue(item.value, valuePrefix, unit);
                  const deltaText = formatDelta(item.value - comparisonBaseline, valuePrefix, unit);

                  return (
                    <g
                      key={item.key}
                      ref={(node) => registerStemRef(item.key, node)}
                      role="button"
                      tabIndex={0}
                      aria-pressed={isSelected}
                      aria-label={`Rank #${item.rank} · ${item.label} · ${formattedVal} · ${deltaText} vs ${referenceWord}`}
                      data-item-id={item.id}
                      data-rank={String(item.rank)}
                      data-tone={item.tone}
                      data-value={String(item.value)}
                      data-selected={isSelected ? 'true' : 'false'}
                      data-active={isActive ? 'true' : 'false'}
                      data-dimmed={isDimmed ? 'true' : 'false'}
                      data-testid={`lollipop-stem-${item.id}`}
                      className="prism-focus-ring cursor-pointer"
                      onClick={() => handleToggleItem(item)}
                      onFocus={() => handleFocusItem(item.key)}
                      onBlur={() => handleBlurItem(item.key)}
                      onKeyDown={handleStemKeyDown(stem.displayIndex, item)}
                    >
                      <title>{`Rank #${item.rank} · ${item.label}: ${formattedVal} (${deltaText} vs ${referenceWord})`}</title>

                      <rect
                        x={stem.hitX}
                        y={stem.hitY}
                        width={stem.hitWidth}
                        height={stem.hitHeight}
                        rx={6}
                        fill={item.color}
                        fillOpacity={isActive ? 0.1 : 0}
                      />

                      <line
                        data-testid={`lollipop-line-${item.id}`}
                        x1={stem.x1}
                        y1={stem.y1}
                        x2={stem.x2}
                        y2={stem.y2}
                        stroke={item.color}
                        strokeWidth={STEM_STROKE_WIDTH}
                        strokeLinecap="round"
                        strokeOpacity={isDimmed ? 0.35 : isActive ? 1 : 0.88}
                      />

                      {isActive ? (
                        <circle
                          data-testid={`lollipop-halo-${item.id}`}
                          cx={stem.x2}
                          cy={stem.y2}
                          r={10.5}
                          fill={item.color}
                          fillOpacity={0.2}
                          stroke={item.color}
                          strokeWidth={1}
                          strokeOpacity={0.6}
                          pointerEvents="none"
                        />
                      ) : null}

                      <circle
                        data-testid={`lollipop-node-${item.id}`}
                        cx={stem.x2}
                        cy={stem.y2}
                        r={TERMINAL_RADIUS}
                        fill={item.color}
                        fillOpacity={isDimmed ? 0.42 : 0.94}
                        stroke={isActive ? 'var(--prism-text-primary)' : 'var(--prism-bg-start)'}
                        strokeWidth={isActive ? 2 : 1.5}
                      />

                      <circle
                        cx={roundCoord(stem.x2 - 2)}
                        cy={roundCoord(stem.y2 - 2)}
                        r={1.75}
                        fill="var(--prism-bg-start)"
                        fillOpacity={isDimmed ? 0.25 : 0.7}
                        pointerEvents="none"
                      />

                      <text
                        data-testid={`lollipop-label-${item.id}`}
                        x={stem.labelX}
                        y={stem.labelY}
                        textAnchor={stem.labelAnchor}
                        fill={isActive ? 'var(--prism-text-primary)' : 'var(--prism-text-secondary)'}
                        className={cx(
                          'text-[10px] select-none',
                          isActive ? 'font-semibold' : 'font-medium'
                        )}
                      >
                        {stem.shortLabel}
                      </text>

                      <text
                        data-testid={`lollipop-value-${item.id}`}
                        x={stem.valueX}
                        y={stem.valueY}
                        textAnchor={stem.valueAnchor}
                        fill={isActive ? 'var(--prism-text-primary)' : 'var(--prism-text-secondary)'}
                        className={cx(
                          'text-[10px] font-mono tabular-nums select-none',
                          isActive ? 'font-bold' : 'font-medium'
                        )}
                      >
                        {formattedVal}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>

          <div
            data-testid="lollipop-readout"
            aria-live="polite"
            className={cx(
              readoutClass,
              'prism-well rounded-xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs tabular-nums min-w-0'
            )}
            style={{ color: 'var(--prism-text-primary)' }}
          >
            <div className="inline-flex flex-wrap items-center gap-2 min-w-0">
              <span
                aria-hidden="true"
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: readoutItem.color }}
              />
              <span className="font-semibold break-words min-w-0">
                {`Rank #${readoutItem.rank} · ${readoutItem.label} · ${formatValue(readoutItem.value, valuePrefix, unit)}`}
              </span>
              <span
                data-testid="lollipop-readout-delta"
                className="font-mono font-semibold tabular-nums shrink-0"
                style={{ color: readoutDeltaColor }}
              >
                {`${formatDelta(readoutDelta, valuePrefix, unit)} vs ${referenceWord}`}
              </span>
            </div>

            <span
              data-testid="lollipop-readout-baseline"
              className="shrink-0 font-mono font-medium tabular-nums"
              style={{ color: 'var(--prism-text-secondary)' }}
            >
              {`${referenceWord}: ${formatValue(comparisonBaseline, valuePrefix, unit)}`}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

LollipopChart.displayName = 'LollipopChart';
