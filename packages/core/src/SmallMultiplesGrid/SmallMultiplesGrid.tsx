'use client';

import {
  useCallback,
  useId,
  useMemo,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { STYLE_SUCCESS_MAIN, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export type SmallMultipleChartKind = 'area' | 'bar';

export type SmallMultipleTone = 'primary' | 'secondary' | 'emerald' | 'amber' | 'info';

export interface SmallMultipleSeries {
  /** Stable unique identifier for this regional or category KPI facet. */
  id: string;
  /** Primary facet title shown at the top of the miniature card and summary bar. */
  title: string;
  /** Optional secondary caption shown beneath the facet title. */
  subtitle?: string;
  /** Ordered numeric values aligned with the shared X-axis labels (non-finite entries are safely sanitized). */
  values: ReadonlyArray<number>;
  /** Semantic optical tone mapped to --prism-* CSS tokens (cycles automatically when omitted). */
  tone?: SmallMultipleTone;
}

export interface SmallMultiplesSyncSnapshot {
  /** Zero-based synchronized period index across every facet card. */
  index: number;
  /** X-axis label for the synchronized period index. */
  periodLabel: string;
  /** Synchronized readout across all active facet series at the active period index. */
  entries: ReadonlyArray<{ seriesId: string; title: string; value: number }>;
}

export interface SmallMultiplesGridProps extends BaseProps<HTMLDivElement> {
  /** Shared X-axis period labels across every facet (defaults to Jan through Aug). */
  labels?: ReadonlyArray<string>;
  /** Faceted KPI series rendered in a synchronized trellis grid (defaults to 6 regional facets). */
  series?: ReadonlyArray<SmallMultipleSeries>;
  /** Controlled mini-chart visualization mode ('area' | 'bar'). */
  chartKind?: SmallMultipleChartKind;
  /** Initial uncontrolled mini-chart visualization mode (defaults to 'area'). */
  defaultChartKind?: SmallMultipleChartKind;
  /** Locks all miniature cards to the identical global Y-axis min..max domain when true (defaults to true). */
  sharedYScale?: boolean;
  /** Maximum desktop column count for the responsive trellis grid (defaults to 3). */
  columns?: 2 | 3 | 4;
  /** Unit suffix appended to metric readouts, deltas, and Y-axis domains (defaults to 'k'). */
  unit?: string;
  /** Card heading linked to the region landmark (defaults to 'Synchronized Small Multiples'). */
  title?: string;
  /** Callback invoked whenever hovering, clicking, stepping, or keyboard-navigating updates the synchronized period. */
  onSyncIndexChange?: (snapshot: SmallMultiplesSyncSnapshot) => void;
}

interface PreparedFacetSeries {
  key: string;
  id: string;
  title: string;
  subtitle?: string;
  tone: SmallMultipleTone;
  color: string;
  values: ReadonlyArray<number>;
  localMin: number;
  localMax: number;
}

interface PeriodHitSlot {
  key: string;
  index: number;
  label: string;
  hitX: number;
  hitWidth: number;
  centerX: number;
}

interface ComputedBar {
  key: string;
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  topY: number;
}

interface ComputedFacet extends PreparedFacetSeries {
  scaleMin: number;
  scaleMax: number;
  activeValue: number;
  deltaFromStart: number;
  areaPath: string;
  linePath: string;
  barZeroY: number;
  bars: ReadonlyArray<ComputedBar>;
  activePointX: number;
  activePointY: number;
}

interface Point2D {
  x: number;
  y: number;
}

const SVG_WIDTH = 180;
const SVG_HEIGHT = 72;
const PAD_LEFT = 8;
const PAD_RIGHT = 8;
const PAD_TOP = 10;
const PAD_BOTTOM = 10;
const PLOT_X = PAD_LEFT;
const PLOT_WIDTH = SVG_WIDTH - PAD_LEFT - PAD_RIGHT;
const PLOT_TOP = PAD_TOP;
const PLOT_BOTTOM = SVG_HEIGHT - PAD_BOTTOM;
const PLOT_HEIGHT = PLOT_BOTTOM - PLOT_TOP;
const AREA_Y_TOP = PLOT_TOP + 2;
const AREA_Y_BOTTOM = PLOT_BOTTOM - 2;
const AREA_Y_SPAN = AREA_Y_BOTTOM - AREA_Y_TOP;

const TONE_CYCLE: ReadonlyArray<SmallMultipleTone> = [
  'primary',
  'secondary',
  'emerald',
  'amber',
  'info',
];

const TONE_COLOR_MAP: Record<SmallMultipleTone, string> = {
  primary: 'var(--prism-primary-main)',
  secondary: 'var(--prism-secondary-main)',
  emerald: 'var(--prism-success-main)',
  amber: 'var(--prism-warning-main)',
  info: 'var(--prism-info-main)',
};

const CHART_KIND_OPTIONS: ReadonlyArray<{ id: SmallMultipleChartKind; label: string }> = [
  { id: 'area', label: 'Area' },
  { id: 'bar', label: 'Bar' },
];

const GRID_COLUMNS_CLASS: Record<2 | 3 | 4, string> = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
};

const GUIDE_LINES: ReadonlyArray<{ key: string; y: number }> = [
  { key: 'top', y: PLOT_TOP },
  { key: 'mid', y: roundCoord(PLOT_TOP + PLOT_HEIGHT / 2) },
  { key: 'bottom', y: PLOT_BOTTOM },
];

export const DEFAULT_SMALL_MULTIPLES_LABELS: ReadonlyArray<string> = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
];

export const DEFAULT_SMALL_MULTIPLES_SERIES: ReadonlyArray<SmallMultipleSeries> = [
  {
    id: 'na',
    title: 'North America',
    subtitle: 'Enterprise SaaS',
    tone: 'primary',
    values: [112, 118, 126, 131, 142, 148, 155, 164],
  },
  {
    id: 'emea',
    title: 'EMEA',
    subtitle: 'Cloud & Core',
    tone: 'secondary',
    values: [86, 91, 95, 102, 108, 114, 119, 127],
  },
  {
    id: 'apac',
    title: 'APAC',
    subtitle: 'High-Growth Tier',
    tone: 'emerald',
    values: [54, 61, 69, 76, 88, 96, 107, 118],
  },
  {
    id: 'latam',
    title: 'LATAM',
    subtitle: 'SMB Expansion',
    tone: 'amber',
    values: [28, 31, 34, 38, 41, 44, 49, 53],
  },
  {
    id: 'nordics',
    title: 'Nordics',
    subtitle: 'Digital Banking',
    tone: 'info',
    values: [42, 45, 44, 48, 52, 51, 56, 60],
  },
  {
    id: 'anz',
    title: 'ANZ',
    subtitle: 'Channel Partners',
    tone: 'primary',
    values: [36, 35, 38, 37, 34, 39, 41, 43],
  },
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

function formatMetric(value: number, unit: string): string {
  const num = formatNumeric(value);
  return unit ? `${num}${unit}` : num;
}

function formatSignedDelta(delta: number, unit: string): string {
  const safe = normalizeZero(Number(delta.toFixed(2)));
  if (safe > 0) {
    return `+${formatMetric(safe, unit)}`;
  }
  if (safe < 0) {
    return formatMetric(safe, unit);
  }
  return formatMetric(0, unit);
}

function mapAreaY(value: number, min: number, max: number): number {
  if (max === min) {
    return roundCoord(AREA_Y_TOP + AREA_Y_SPAN / 2);
  }
  const ratio = (value - min) / (max - min);
  return roundCoord(AREA_Y_BOTTOM - ratio * AREA_Y_SPAN);
}

function buildAreaPaths(points: ReadonlyArray<Point2D>): {
  linePath: string;
  areaPath: string;
} {
  const first = points[0]!;
  if (points.length === 1) {
    const x1 = roundCoord(Math.max(PLOT_X, first.x - 14));
    const x2 = roundCoord(Math.min(PLOT_X + PLOT_WIDTH, first.x + 14));
    return {
      linePath: `M ${x1} ${first.y} L ${x2} ${first.y}`,
      areaPath: `M ${x1} ${PLOT_BOTTOM} L ${x1} ${first.y} L ${x2} ${first.y} L ${x2} ${PLOT_BOTTOM} Z`,
    };
  }

  const segments: string[] = [];
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1]!;
    const curr = points[i]!;
    const midX = roundCoord((prev.x + curr.x) / 2);
    segments.push(`C ${midX} ${prev.y} ${midX} ${curr.y} ${curr.x} ${curr.y}`);
  }

  const last = points[points.length - 1]!;
  const body = segments.join(' ');
  return {
    linePath: `M ${first.x} ${first.y} ${body}`,
    areaPath: `M ${first.x} ${PLOT_BOTTOM} L ${first.x} ${first.y} ${body} L ${last.x} ${PLOT_BOTTOM} Z`,
  };
}

function buildBarGeometry(
  facetKey: string,
  values: ReadonlyArray<number>,
  slots: ReadonlyArray<PeriodHitSlot>,
  scaleMin: number,
  scaleMax: number,
  barWidth: number
): { barZeroY: number; bars: ReadonlyArray<ComputedBar> } {
  const barDomainMin = Math.min(0, scaleMin);
  const barDomainMax = Math.max(0, scaleMax);
  const halfBar = barWidth / 2;

  if (barDomainMax === barDomainMin) {
    const bars: ComputedBar[] = values.map((_val, idx) => {
      const slot = slots[idx]!;
      return {
        key: `${facetKey}-bar-${slot.index}`,
        index: slot.index,
        x: roundCoord(slot.centerX - halfBar),
        y: roundCoord(PLOT_BOTTOM - 2),
        width: barWidth,
        height: 2,
        topY: roundCoord(PLOT_BOTTOM - 2),
      };
    });
    return { barZeroY: PLOT_BOTTOM, bars };
  }

  const span = barDomainMax - barDomainMin;
  const toY = (val: number): number =>
    roundCoord(PLOT_BOTTOM - ((val - barDomainMin) / span) * PLOT_HEIGHT);
  const barZeroY = toY(0);

  const bars: ComputedBar[] = values.map((val, idx) => {
    const slot = slots[idx]!;
    const targetY = toY(val);
    const height = roundCoord(Math.max(2, Math.abs(barZeroY - targetY)));
    const y = val >= 0 ? roundCoord(Math.min(targetY, barZeroY - height)) : barZeroY;
    return {
      key: `${facetKey}-bar-${slot.index}`,
      index: slot.index,
      x: roundCoord(slot.centerX - halfBar),
      y,
      width: barWidth,
      height,
      topY: targetY,
    };
  });

  return { barZeroY, bars };
}

function resolveDeltaColor(delta: number): string {
  if (delta > 0) {
    return 'var(--prism-success-main)';
  }
  if (delta < 0) {
    return 'var(--prism-error-main)';
  }
  return 'var(--prism-text-secondary)';
}

const headerClass = /*#__PURE__*/ stableClassName('small-multiples-grid', 'header');
const controlsClass = /*#__PURE__*/ stableClassName('small-multiples-grid', 'controls');
const gridClass = /*#__PURE__*/ stableClassName('small-multiples-grid', 'grid');
const facetClass = /*#__PURE__*/ stableClassName('small-multiples-grid', 'facet');
const svgClass = /*#__PURE__*/ stableClassName('small-multiples-grid', 'svg');
const summaryClass = /*#__PURE__*/ stableClassName('small-multiples-grid', 'summary');

function SmallMultiplesGridInner({
  labels,
  series,
  chartKind,
  defaultChartKind = 'area',
  sharedYScale = true,
  columns = 3,
  unit = 'k',
  title = 'Synchronized Small Multiples',
  onSyncIndexChange,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: SmallMultiplesGridProps) {
  const headingId = useId();
  const svgId = useId();
  const override = useComponentOverride('SmallMultiplesGrid');

  const sourceLabels = labels ?? DEFAULT_SMALL_MULTIPLES_LABELS;
  const sourceSeries = series ?? DEFAULT_SMALL_MULTIPLES_SERIES;
  const resolvedColumns: 2 | 3 | 4 = columns === 2 || columns === 4 ? columns : 3;

  const [activeChartKind, setActiveChartKind] = useControllableState<SmallMultipleChartKind>({
    value: chartKind,
    defaultValue: defaultChartKind,
  });

  const [scaleState, setScaleState] = useState<{
    syncedProp: boolean;
    value: boolean;
  }>(() => ({
    syncedProp: sharedYScale,
    value: sharedYScale,
  }));

  const isSharedScale =
    scaleState.syncedProp === sharedYScale ? scaleState.value : sharedYScale;

  const [activeIndex, setActiveIndex] = useState<number>(() =>
    Math.min(4, Math.max(0, sourceLabels.length - 1))
  );

  const normalizedLabels = useMemo<ReadonlyArray<string>>(
    () =>
      sourceLabels.map((rawLabel, idx) => {
        const trimmed = rawLabel.trim();
        return trimmed.length > 0 ? trimmed : `P${idx + 1}`;
      }),
    [sourceLabels]
  );

  const periodCount = normalizedLabels.length;
  const safeActiveIndex =
    periodCount > 0 ? Math.max(0, Math.min(periodCount - 1, activeIndex)) : 0;

  const preparedData = useMemo(() => {
    if (periodCount === 0 || sourceSeries.length === 0) {
      return {
        seriesList: [] as PreparedFacetSeries[],
        globalMin: 0,
        globalMax: 0,
      };
    }

    const prepared: PreparedFacetSeries[] = [];
    let globalMin = Number.POSITIVE_INFINITY;
    let globalMax = Number.NEGATIVE_INFINITY;

    for (let sIdx = 0; sIdx < sourceSeries.length; sIdx += 1) {
      const entry = sourceSeries[sIdx]!;
      const alignedValues: number[] = [];
      let hasFiniteValue = false;
      let localMin = Number.POSITIVE_INFINITY;
      let localMax = Number.NEGATIVE_INFINITY;

      for (let pIdx = 0; pIdx < periodCount; pIdx += 1) {
        const raw = entry.values[pIdx];
        if (raw !== undefined && Number.isFinite(raw)) {
          hasFiniteValue = true;
          const clean = normalizeZero(raw);
          alignedValues.push(clean);
          if (clean < localMin) localMin = clean;
          if (clean > localMax) localMax = clean;
        } else {
          alignedValues.push(0);
          if (0 < localMin) localMin = 0;
          if (0 > localMax) localMax = 0;
        }
      }

      if (!hasFiniteValue) {
        continue;
      }

      if (localMin < globalMin) globalMin = localMin;
      if (localMax > globalMax) globalMax = localMax;

      const resolvedTone = entry.tone ?? TONE_CYCLE[sIdx % TONE_CYCLE.length]!;
      prepared.push({
        key: `${entry.id}::${sIdx}`,
        id: entry.id,
        title: entry.title,
        subtitle: entry.subtitle,
        tone: resolvedTone,
        color: TONE_COLOR_MAP[resolvedTone],
        values: alignedValues,
        localMin,
        localMax,
      });
    }

    if (prepared.length === 0) {
      return {
        seriesList: [] as PreparedFacetSeries[],
        globalMin: 0,
        globalMax: 0,
      };
    }

    return {
      seriesList: prepared,
      globalMin: normalizeZero(globalMin),
      globalMax: normalizeZero(globalMax),
    };
  }, [periodCount, sourceSeries]);

  const isEmpty = preparedData.seriesList.length === 0;

  const slots = useMemo<ReadonlyArray<PeriodHitSlot>>(() => {
    if (periodCount === 0) return [];
    const slotWidth = PLOT_WIDTH / periodCount;
    return normalizedLabels.map((label, idx) => ({
      key: `period-slot-${idx}-${label}`,
      index: idx,
      label,
      hitX: roundCoord(PLOT_X + idx * slotWidth),
      hitWidth: roundCoord(slotWidth),
      centerX: roundCoord(PLOT_X + (idx + 0.5) * slotWidth),
    }));
  }, [normalizedLabels, periodCount]);

  const computedFacets = useMemo<ReadonlyArray<ComputedFacet>>(() => {
    if (isEmpty) return [];
    const slotWidth = PLOT_WIDTH / periodCount;
    const barWidth = roundCoord(Math.min(24, Math.max(4, slotWidth * 0.62)));

    return preparedData.seriesList.map((facet) => {
      const scaleMin = isSharedScale ? preparedData.globalMin : facet.localMin;
      const scaleMax = isSharedScale ? preparedData.globalMax : facet.localMax;

      const areaPoints: Point2D[] = facet.values.map((val, idx) => ({
        x: slots[idx]!.centerX,
        y: mapAreaY(val, scaleMin, scaleMax),
      }));

      const { linePath, areaPath } = buildAreaPaths(areaPoints);
      const { barZeroY, bars } = buildBarGeometry(
        facet.key,
        facet.values,
        slots,
        scaleMin,
        scaleMax,
        barWidth
      );

      const activeValue = facet.values[safeActiveIndex]!;
      const startValue = facet.values[0]!;
      const deltaFromStart = normalizeZero(Number((activeValue - startValue).toFixed(2)));
      const activePointX = slots[safeActiveIndex]!.centerX;
      const activePointY =
        activeChartKind === 'bar'
          ? bars[safeActiveIndex]!.topY
          : areaPoints[safeActiveIndex]!.y;

      return {
        ...facet,
        scaleMin,
        scaleMax,
        activeValue,
        deltaFromStart,
        areaPath,
        linePath,
        barZeroY,
        bars,
        activePointX,
        activePointY,
      };
    });
  }, [
    activeChartKind,
    isEmpty,
    isSharedScale,
    periodCount,
    preparedData.globalMax,
    preparedData.globalMin,
    preparedData.seriesList,
    safeActiveIndex,
    slots,
  ]);

  const summaryMetrics = useMemo(() => {
    if (computedFacets.length === 0) {
      return null;
    }
    let highest = computedFacets[0]!;
    let lowest = computedFacets[0]!;

    for (let i = 1; i < computedFacets.length; i += 1) {
      const candidate = computedFacets[i]!;
      if (candidate.activeValue > highest.activeValue) {
        highest = candidate;
      }
      if (candidate.activeValue < lowest.activeValue) {
        lowest = candidate;
      }
    }

    return {
      periodLabel: normalizedLabels[safeActiveIndex]!,
      highest,
      lowest,
    };
  }, [computedFacets, normalizedLabels, safeActiveIndex]);

  const updateActiveIndex = useCallback(
    (nextIndex: number) => {
      const clamped = Math.max(0, Math.min(periodCount - 1, Math.trunc(nextIndex)));
      if (clamped === safeActiveIndex) return;
      setActiveIndex(clamped);
      if (onSyncIndexChange) {
        onSyncIndexChange({
          index: clamped,
          periodLabel: normalizedLabels[clamped]!,
          entries: preparedData.seriesList.map((entry) => ({
            seriesId: entry.id,
            title: entry.title,
            value: entry.values[clamped]!,
          })),
        });
      }
    },
    [
      normalizedLabels,
      onSyncIndexChange,
      periodCount,
      preparedData.seriesList,
      safeActiveIndex,
    ]
  );

  const handleToggleSharedScale = useCallback(() => {
    setScaleState({
      syncedProp: sharedYScale,
      value: !isSharedScale,
    });
  }, [isSharedScale, sharedYScale]);

  const handleFacetKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.nativeEvent.isComposing) return;

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        updateActiveIndex(safeActiveIndex - 1);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        updateActiveIndex(safeActiveIndex + 1);
      } else if (event.key === 'Home') {
        event.preventDefault();
        updateActiveIndex(0);
      } else if (event.key === 'End') {
        event.preventDefault();
        updateActiveIndex(periodCount - 1);
      }
    },
    [periodCount, safeActiveIndex, updateActiveIndex]
  );

  const merged = mergeProps({
    themeTarget: themeProps('small-multiples-grid', {
      empty: isEmpty,
      chartKind: activeChartKind,
      'shared-y-scale': isSharedScale,
      columns: resolvedColumns,
      facetCount: computedFacets.length,
    }),
    baseClassName: 'prism-slab p-4 sm:p-5 space-y-4 w-full max-w-full min-w-0',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });


  const activePeriodLabel = summaryMetrics?.periodLabel ?? '';
  const globalDomainLabel = `${formatMetric(preparedData.globalMin, unit)}–${formatMetric(preparedData.globalMax, unit)}`;

  return (
    <div ref={ref} role="region" aria-labelledby={headingId} {...rest} {...merged}>
      <div className={cx(headerClass, 'flex flex-wrap items-center justify-between gap-2.5 min-w-0')}>
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <h4
            id={headingId}
            className="text-sm font-semibold tracking-tight min-w-0 break-words"
            style={STYLE_TEXT_PRIMARY}
          >
            {title}
          </h4>

          {!isEmpty ? (
            <div
              className="prism-well inline-flex items-center gap-1 px-1 py-0.5 rounded-full shrink-0"
              aria-label="Synchronized period controls"
            >
              <button
                type="button"
                aria-label="Previous period"
                disabled={safeActiveIndex <= 0}
                onClick={() => updateActiveIndex(safeActiveIndex - 1)}
                className="prism-focus-ring prism-crystal w-6 h-6 inline-flex items-center justify-center rounded-full text-xs font-semibold cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                style={STYLE_TEXT_PRIMARY}
              >
                &lt;
              </button>
              <span
                data-testid="small-multiples-period-badge"
                className="px-2 text-[11px] font-mono font-semibold tabular-nums whitespace-nowrap"
                style={STYLE_TEXT_PRIMARY}
              >
                {`Period: ${activePeriodLabel}`}
              </span>
              <button
                type="button"
                aria-label="Next period"
                disabled={safeActiveIndex >= periodCount - 1}
                onClick={() => updateActiveIndex(safeActiveIndex + 1)}
                className="prism-focus-ring prism-crystal w-6 h-6 inline-flex items-center justify-center rounded-full text-xs font-semibold cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                style={STYLE_TEXT_PRIMARY}
              >
                &gt;
              </button>
            </div>
          ) : null}
        </div>

        {!isEmpty ? (
          <div className={cx(controlsClass, 'flex flex-wrap items-center gap-2 min-w-0 max-w-full')}>
            <div
              role="group"
              aria-label="Mini chart kind"
              className="prism-well inline-flex items-center gap-1 p-0.5 rounded-full"
            >
              {CHART_KIND_OPTIONS.map((option) => {
                const isSelected = activeChartKind === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={isSelected}
                    data-chart-kind-option={option.id}
                    onClick={() => setActiveChartKind(option.id)}
                    className={cx(
                      'prism-focus-ring px-2.5 py-1 rounded-full text-[11px] cursor-pointer transition-opacity duration-150',
                      isSelected ? 'prism-crystal font-semibold' : 'font-medium opacity-80'
                    )}
                    style={{
                      color: isSelected
                        ? 'var(--prism-text-primary)'
                        : 'var(--prism-text-secondary)',
                    }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              data-testid="small-multiples-scale-toggle"
              aria-pressed={isSharedScale}
              onClick={handleToggleSharedScale}
              className={cx(
                'prism-focus-ring px-3 py-1 rounded-full text-[11px] cursor-pointer transition-opacity duration-150 inline-flex items-center gap-1.5',
                isSharedScale ? 'prism-crystal font-semibold' : 'prism-well font-medium opacity-90'
              )}
              style={{
                color: isSharedScale
                  ? 'var(--prism-text-primary)'
                  : 'var(--prism-text-secondary)',
                border: isSharedScale
                  ? '1px solid var(--prism-primary-main)'
                  : '1px solid var(--prism-divider)',
              }}
            >
              <span
                aria-hidden="true"
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{
                  backgroundColor: isSharedScale
                    ? 'var(--prism-primary-main)'
                    : 'var(--prism-text-secondary)',
                }}
              />
              <span>{isSharedScale ? 'Shared Scale' : 'Local Scale'}</span>
            </button>
          </div>
        ) : null}
      </div>

      {!summaryMetrics ? (
        <div
          role="status"
          data-testid="small-multiples-empty"
          className="prism-well rounded-2xl px-4 py-8 text-center text-xs font-medium"
          style={STYLE_TEXT_SECONDARY}
        >
          No small multiples series to display.
        </div>
      ) : (
        <>
          <div
            data-testid="small-multiples-trellis"
            className={cx(gridClass, 'grid gap-3 w-full max-w-full min-w-0', GRID_COLUMNS_CLASS[resolvedColumns])}
          >
            {computedFacets.map((facet) => {
              const formattedValue = formatMetric(facet.activeValue, unit);
              const formattedDelta = formatSignedDelta(facet.deltaFromStart, unit);
              const facetDomainLabel = `${formatMetric(facet.scaleMin, unit)}–${formatMetric(facet.scaleMax, unit)}`;
              const gradientId = `${svgId}-grad-${facet.key.replace(/[^a-zA-Z0-9_-]/g, '-')}`;

              return (
                <div
                  key={facet.key}
                  tabIndex={0}
                  role="group"
                  aria-label={`${facet.title}: ${formattedValue} in ${activePeriodLabel}, delta ${formattedDelta} from ${normalizedLabels[0]}. Use Left, Right, Home, or End keys to step period.`}
                  data-testid={`small-multiple-facet-${facet.id}`}
                  data-series-id={facet.id}
                  data-tone={facet.tone}
                  data-y-min={String(facet.scaleMin)}
                  data-y-max={String(facet.scaleMax)}
                  onKeyDown={handleFacetKeyDown}
                  className={cx(
                    facetClass,
                    'prism-well prism-focus-ring rounded-2xl p-3 flex flex-col gap-2 min-w-0 max-w-full'
                  )}
                >
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <div className="min-w-0 flex flex-col gap-0.5">
                      <span
                        className="inline-flex items-center gap-1.5 text-xs font-semibold min-w-0"
                        style={STYLE_TEXT_PRIMARY}
                      >
                        <span
                          aria-hidden="true"
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: facet.color }}
                        />
                        <span className="truncate">{facet.title}</span>
                      </span>
                      {facet.subtitle ? (
                        <span
                          className="text-[10px] pl-3.5 truncate"
                          style={STYLE_TEXT_SECONDARY}
                        >
                          {facet.subtitle}
                        </span>
                      ) : null}
                    </div>

                    <div className="flex flex-col items-end shrink-0 tabular-nums">
                      <span
                        data-testid={`facet-value-${facet.id}`}
                        className="text-xs font-mono font-semibold"
                        style={STYLE_TEXT_PRIMARY}
                      >
                        {formattedValue}
                      </span>
                      <span
                        data-testid={`facet-delta-${facet.id}`}
                        className="text-[10px] font-mono font-medium"
                        style={{ color: resolveDeltaColor(facet.deltaFromStart) }}
                      >
                        {formattedDelta}
                      </span>
                    </div>
                  </div>

                  <svg
                    role="img"
                    aria-label={`${facet.title} ${activeChartKind} mini chart (${activePeriodLabel}: ${formattedValue})`}
                    viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
                    className={cx(svgClass, 'w-full h-auto select-none block', 'prism-contain-box')}
                  >
                    <defs>
                      <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={facet.color} stopOpacity={0.42} />
                        <stop offset="100%" stopColor={facet.color} stopOpacity={0.04} />
                      </linearGradient>
                    </defs>

                    {GUIDE_LINES.map((guide) => (
                      <line
                        key={guide.key}
                        x1={PLOT_X}
                        y1={guide.y}
                        x2={PLOT_X + PLOT_WIDTH}
                        y2={guide.y}
                        stroke="var(--prism-divider)"
                        strokeWidth={0.75}
                        strokeDasharray={guide.key === 'mid' ? '2 2' : undefined}
                        pointerEvents="none"
                      />
                    ))}

                    {activeChartKind === 'area' ? (
                      <g pointerEvents="none">
                        <path
                          data-role="facet-area"
                          d={facet.areaPath}
                          fill={`url(#${gradientId})`}
                        />
                        <path
                          data-role="facet-line"
                          d={facet.linePath}
                          fill="none"
                          stroke={facet.color}
                          strokeWidth={1.75}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </g>
                    ) : (
                      <g pointerEvents="none">
                        <line
                          data-role="facet-baseline"
                          x1={PLOT_X}
                          y1={facet.barZeroY}
                          x2={PLOT_X + PLOT_WIDTH}
                          y2={facet.barZeroY}
                          stroke="var(--prism-divider)"
                          strokeWidth={1}
                        />
                        {facet.bars.map((bar) => {
                          const isActiveBar = bar.index === safeActiveIndex;
                          return (
                            <rect
                              key={bar.key}
                              data-role="facet-bar"
                              data-period-index={String(bar.index)}
                              data-active={isActiveBar ? 'true' : 'false'}
                              x={bar.x}
                              y={bar.y}
                              width={bar.width}
                              height={bar.height}
                              rx={2}
                              fill={facet.color}
                              fillOpacity={isActiveBar ? 0.96 : 0.42}
                            />
                          );
                        })}
                      </g>
                    )}

                    <line
                      data-role="sync-crosshair"
                      x1={facet.activePointX}
                      y1={PLOT_TOP}
                      x2={facet.activePointX}
                      y2={PLOT_BOTTOM}
                      stroke="var(--prism-text-secondary)"
                      strokeWidth={1}
                      strokeDasharray="2 2"
                      pointerEvents="none"
                    />

                    <circle
                      cx={facet.activePointX}
                      cy={facet.activePointY}
                      r={5.5}
                      fill={facet.color}
                      fillOpacity={0.22}
                      pointerEvents="none"
                    />

                    <circle
                      data-role="sync-dot"
                      cx={facet.activePointX}
                      cy={facet.activePointY}
                      r={3}
                      fill={facet.color}
                      stroke="var(--prism-bg-start)"
                      strokeWidth={1.25}
                      pointerEvents="none"
                    />

                    {slots.map((slot) => (
                      <rect
                        key={`${facet.key}-${slot.key}`}
                        data-role="period-hit"
                        data-series-id={facet.id}
                        data-period-index={String(slot.index)}
                        data-period-label={slot.label}
                        x={slot.hitX}
                        y={PLOT_TOP}
                        width={slot.hitWidth}
                        height={PLOT_HEIGHT}
                        fill="none"
                        pointerEvents="all"
                        className="cursor-pointer"
                        onMouseEnter={() => updateActiveIndex(slot.index)}
                        onClick={() => updateActiveIndex(slot.index)}
                      />
                    ))}
                  </svg>

                  <div
                    className="flex items-center justify-between gap-2 text-[10px] font-mono tabular-nums min-w-0"
                    style={STYLE_TEXT_SECONDARY}
                  >
                    <span className="truncate">{normalizedLabels[0]}</span>
                    <span
                      data-testid={`facet-domain-${facet.id}`}
                      className="shrink-0 opacity-85"
                    >
                      {facetDomainLabel}
                    </span>
                    <span className="truncate">{normalizedLabels[periodCount - 1]}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div
            data-testid="small-multiples-summary"
            aria-live="polite"
            className={cx(
              summaryClass,
              'prism-well rounded-xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs tabular-nums min-w-0'
            )}
            style={STYLE_TEXT_PRIMARY}
          >
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0 font-mono text-[11px]">
              <span className="font-semibold">{`Active Period: ${summaryMetrics.periodLabel}`}</span>
              <span aria-hidden="true" style={STYLE_TEXT_SECONDARY}>
                ·
              </span>
              <span style={STYLE_TEXT_SECONDARY}>
                {`Global Y Domain: ${globalDomainLabel}`}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0 font-mono text-[11px]">
              <span style={STYLE_SUCCESS_MAIN}>
                {`Highest: ${summaryMetrics.highest.title} (${formatMetric(summaryMetrics.highest.activeValue, unit)})`}
              </span>
              <span aria-hidden="true" style={STYLE_TEXT_SECONDARY}>
                ·
              </span>
              <span style={STYLE_TEXT_SECONDARY}>
                {`Lowest: ${summaryMetrics.lowest.title} (${formatMetric(summaryMetrics.lowest.activeValue, unit)})`}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export const SmallMultiplesGrid = /*#__PURE__*/ memoWithDisplayName(SmallMultiplesGridInner, 'SmallMultiplesGrid');
