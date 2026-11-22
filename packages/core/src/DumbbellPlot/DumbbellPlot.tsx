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
import { themeProps } from '../utils/themeProps';

export type DumbbellSortMode = 'original' | 'gap-desc' | 'target-desc';

export interface DumbbellItem {
  /** Stable unique identifier for this comparison category row. */
  id: string;
  /** Human-readable category label displayed along the left axis. */
  label: string;
  /** Starting or baseline measurement value (non-finite values safely normalize to 0). */
  baseline: number;
  /** Ending or current measurement value (non-finite values safely normalize to 0). */
  current: number;
}

export interface DumbbellSelection extends DumbbellItem {
  /** Signed variance gap (`current - baseline`). */
  gap: number;
  /** Relative percentage change versus `|baseline|`, or `null` when `baseline === 0`. */
  gapPct: number | null;
}

export interface DumbbellPlotProps extends BaseProps<HTMLDivElement> {
  /**
   * Ordered comparison items plotted as horizontal connected baseline-to-current dumbbells.
   * Defaults to 6 regional conversion / NPS before-vs-after items (with both gains and regressions)
   * when omitted; pass `[]` to display the clean `role="status"` empty state.
   */
  items?: ReadonlyArray<DumbbellItem>;
  /** Legend and readout label for the baseline series (defaults to `'Baseline'`). */
  baselineLabel?: string;
  /** Legend and readout label for the current series (defaults to `'Current'`). */
  currentLabel?: string;
  /** Unit suffix appended to formatted numeric values and deltas (defaults to `'%'`). */
  unit?: string;
  /** Controlled sort mode (`'original' | 'gap-desc' | 'target-desc'`). */
  sortBy?: DumbbellSortMode;
  /** Initial uncontrolled sort mode when `sortBy` is omitted (defaults to `'original'`). */
  defaultSortBy?: DumbbellSortMode;
  /** Chart card heading linked to the region and SVG graphic (defaults to `'Variance Gap Dumbbell Plot'`). */
  title?: string;
  /** Callback invoked when a user clicks or keyboard-activates/navigates to any category row. */
  onSelectItem?: (selection: DumbbellSelection) => void;
}

interface NormalizedRow {
  key: string;
  originalIndex: number;
  id: string;
  label: string;
  baseline: number;
  current: number;
  gap: number;
  gapPct: number | null;
  isGain: boolean;
  deltaColor: string;
}

interface PlottedRow extends NormalizedRow {
  rowIndex: number;
  y: number;
  bandY: number;
  bandHeight: number;
  baselineX: number;
  currentX: number;
  isCoincident: boolean;
}

interface ScaleTick {
  key: string;
  x: number;
  label: string;
}

interface PlotModel {
  rows: ReadonlyArray<PlottedRow>;
  ticks: ReadonlyArray<ScaleTick>;
}

export const DEFAULT_DUMBBELL_ITEMS: ReadonlyArray<DumbbellItem> = [
  { id: 'na', label: 'North America', baseline: 42.4, current: 56.6 },
  { id: 'emea', label: 'EMEA', baseline: 51.8, current: 48.3 },
  { id: 'apac', label: 'APAC', baseline: 38.0, current: 59.4 },
  { id: 'latam', label: 'LATAM', baseline: 34.5, current: 44.1 },
  { id: 'nordics', label: 'Nordics', baseline: 64.0, current: 61.2 },
  { id: 'uk-ie', label: 'UK & Ireland', baseline: 46.2, current: 54.0 },
];

const SORT_OPTIONS: ReadonlyArray<{ mode: DumbbellSortMode; label: string }> = [
  { mode: 'original', label: 'Default' },
  { mode: 'gap-desc', label: 'Largest Gap' },
  { mode: 'target-desc', label: 'Highest Current' },
];

const SVG_WIDTH = 460;
const SVG_HEIGHT = 230;
const LABEL_X = 100;
const PLOT_LEFT = 112;
const PLOT_RIGHT = 384;
const PLOT_WIDTH = PLOT_RIGHT - PLOT_LEFT;
const PLOT_TOP = 14;
const PLOT_BOTTOM = 196;
const PLOT_HEIGHT = PLOT_BOTTOM - PLOT_TOP;
const DELTA_PILL_X = 394;
const DELTA_PILL_WIDTH = 58;
const DELTA_PILL_HEIGHT = 18;
const TICK_FRACTIONS: ReadonlyArray<number> = [0, 0.25, 0.5, 0.75, 1];

function normalizeZero(value: number): number {
  return value === 0 ? 0 : value;
}

function sanitizeFinite(value: number): number {
  return Number.isFinite(value) ? normalizeZero(value) : 0;
}

function roundCoord(value: number): number {
  return Number(value.toFixed(2));
}

function roundTwoDecimals(value: number): number {
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

function formatValue(value: number, unit: string): string {
  return `${formatNumeric(value)}${unit}`;
}

function formatSignedValue(value: number, unit: string): string {
  const safe = normalizeZero(value);
  if (safe > 0) {
    return `+${formatNumeric(safe)}${unit}`;
  }
  if (safe < 0) {
    return `-${formatNumeric(Math.abs(safe))}${unit}`;
  }
  return `0${unit}`;
}

function formatGapPct(gapPct: number | null): string {
  if (gapPct === null) {
    return 'N/A';
  }
  if (gapPct > 0) {
    return `+${formatNumeric(gapPct)}%`;
  }
  if (gapPct < 0) {
    return `-${formatNumeric(Math.abs(gapPct))}%`;
  }
  return '0%';
}

function truncateLabel(text: string, maxChars: number): string {
  if (text.length <= maxChars) {
    return text;
  }
  return `${text.slice(0, maxChars - 1)}…`;
}

function computeXDomain(minVal: number, maxVal: number): { min: number; max: number } {
  if (minVal === maxVal) {
    if (minVal === 0) {
      return { min: 0, max: 10 };
    }
    const pad = Math.abs(minVal) * 0.2;
    return {
      min: minVal > 0 ? Math.max(0, minVal - pad) : minVal - pad,
      max: maxVal + pad,
    };
  }
  const pad = (maxVal - minVal) * 0.08;
  const rawMin = minVal - pad;
  return {
    min: minVal >= 0 ? Math.max(0, rawMin) : rawMin,
    max: maxVal + pad,
  };
}

function toSelection(row: NormalizedRow): DumbbellSelection {
  return {
    id: row.id,
    label: row.label,
    baseline: row.baseline,
    current: row.current,
    gap: row.gap,
    gapPct: row.gapPct,
  };
}

function buildRowAriaLabel(
  row: PlottedRow,
  baselineLabel: string,
  currentLabel: string,
  unit: string
): string {
  const baselineText = formatValue(row.baseline, unit);
  const currentText = formatValue(row.current, unit);
  const gapText = formatSignedValue(row.gap, unit);
  const pctText = formatGapPct(row.gapPct);
  return `${row.label}: ${baselineLabel} ${baselineText} to ${currentLabel} ${currentText}, gap ${gapText} (${pctText} change)`;
}

export function DumbbellPlot({
  items,
  baselineLabel = 'Baseline',
  currentLabel = 'Current',
  unit = '%',
  sortBy,
  defaultSortBy = 'original',
  title = 'Variance Gap Dumbbell Plot',
  onSelectItem,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: DumbbellPlotProps) {
  const headingId = useId();
  const override = useComponentOverride('DumbbellPlot');
  const rowRefs = useRef<Map<string, SVGGElement>>(new Map());

  const [internalSortBy, setInternalSortBy] = useState<DumbbellSortMode>(defaultSortBy);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [focusedKey, setFocusedKey] = useState<string | null>(null);

  const activeSortBy: DumbbellSortMode = sortBy ?? internalSortBy;
  const sourceItems = items ?? DEFAULT_DUMBBELL_ITEMS;
  const isEmpty = sourceItems.length === 0;

  const registerRowRef = useCallback((rowKey: string, node: SVGGElement | null) => {
    if (node) {
      rowRefs.current.set(rowKey, node);
    } else {
      rowRefs.current.delete(rowKey);
    }
  }, []);

  const plotModel = useMemo<PlotModel>(() => {
    if (sourceItems.length === 0) {
      return { rows: [], ticks: [] };
    }

    const idCounts = new Map<string, number>();
    const normalized: NormalizedRow[] = sourceItems.map((item, originalIndex) => {
      const seen = idCounts.get(item.id) ?? 0;
      idCounts.set(item.id, seen + 1);
      const key = seen === 0 ? `db-${item.id}` : `db-${item.id}-${seen + 1}`;

      const baseline = sanitizeFinite(item.baseline);
      const current = sanitizeFinite(item.current);
      const gap = roundTwoDecimals(current - baseline);
      const gapPct =
        baseline === 0 ? null : roundOneDecimal(((current - baseline) / Math.abs(baseline)) * 100);
      const isGain = current >= baseline;
      const deltaColor = isGain ? 'var(--prism-success-main)' : 'var(--prism-error-main)';

      return {
        key,
        originalIndex,
        id: item.id,
        label: item.label,
        baseline,
        current,
        gap,
        gapPct,
        isGain,
        deltaColor,
      };
    });

    const ordered = [...normalized];
    if (activeSortBy === 'gap-desc') {
      ordered.sort(
        (a, b) =>
          Math.abs(b.gap) - Math.abs(a.gap) ||
          b.gap - a.gap ||
          a.originalIndex - b.originalIndex
      );
    } else if (activeSortBy === 'target-desc') {
      ordered.sort(
        (a, b) =>
          b.current - a.current || b.gap - a.gap || a.originalIndex - b.originalIndex
      );
    }

    let minVal = Number.POSITIVE_INFINITY;
    let maxVal = Number.NEGATIVE_INFINITY;
    for (const row of ordered) {
      if (row.baseline < minVal) minVal = row.baseline;
      if (row.current < minVal) minVal = row.current;
      if (row.baseline > maxVal) maxVal = row.baseline;
      if (row.current > maxVal) maxVal = row.current;
    }

    const domain = computeXDomain(minVal, maxVal);
    const domainSpan = domain.max - domain.min;
    const valueToX = (value: number): number =>
      roundCoord(PLOT_LEFT + ((value - domain.min) / domainSpan) * PLOT_WIDTH);

    const rowStep = PLOT_HEIGHT / ordered.length;
    const bandHeight = roundCoord(Math.min(28, Math.max(12, rowStep - 4)));

    const rows: PlottedRow[] = ordered.map((row, rowIndex) => {
      const y = roundCoord(PLOT_TOP + rowStep * (rowIndex + 0.5));
      const bandY = roundCoord(y - bandHeight / 2);
      const baselineX = valueToX(row.baseline);
      const currentX = valueToX(row.current);
      return {
        ...row,
        rowIndex,
        y,
        bandY,
        bandHeight,
        baselineX,
        currentX,
        isCoincident: row.baseline === row.current,
      };
    });

    const ticks: ScaleTick[] = TICK_FRACTIONS.map((fraction) => {
      const tickVal = roundOneDecimal(domain.min + domainSpan * fraction);
      return {
        key: `db-tick-${fraction}`,
        x: roundCoord(PLOT_LEFT + PLOT_WIDTH * fraction),
        label: formatValue(tickVal, unit),
      };
    });

    return { rows, ticks };
  }, [sourceItems, activeSortBy, unit]);

  const selectedRow = useMemo(() => {
    if (selectedKey === null) return null;
    return plotModel.rows.find((row) => row.key === selectedKey) ?? null;
  }, [plotModel.rows, selectedKey]);

  const focusedRow = useMemo(() => {
    if (focusedKey === null) return null;
    return plotModel.rows.find((row) => row.key === focusedKey) ?? null;
  }, [plotModel.rows, focusedKey]);

  const activeHighlightRow = focusedRow ?? selectedRow;
  const readoutRow = activeHighlightRow ?? plotModel.rows[0] ?? null;

  const handleSortClick = useCallback(
    (mode: DumbbellSortMode) => {
      if (sortBy === undefined) {
        setInternalSortBy(mode);
      }
    },
    [sortBy]
  );

  const handleSelectRow = useCallback(
    (row: PlottedRow) => {
      setSelectedKey(row.key);
      onSelectItem?.(toSelection(row));
    },
    [onSelectItem]
  );

  const handleRowKeyDown = useCallback(
    (rowIndex: number, row: PlottedRow) => (event: ReactKeyboardEvent<SVGGElement>) => {
      if (event.nativeEvent.isComposing) return;

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleSelectRow(row);
        return;
      }

      const count = plotModel.rows.length;
      let nextRow: PlottedRow | null = null;
      if (event.key === 'ArrowDown') {
        nextRow = plotModel.rows[(rowIndex + 1) % count]!;
      } else if (event.key === 'ArrowUp') {
        nextRow = plotModel.rows[(rowIndex - 1 + count) % count]!;
      } else if (event.key === 'Home') {
        nextRow = plotModel.rows[0]!;
      } else if (event.key === 'End') {
        nextRow = plotModel.rows[count - 1]!;
      }

      if (nextRow) {
        event.preventDefault();
        rowRefs.current.get(nextRow.key)?.focus();
        handleSelectRow(nextRow);
      }
    },
    [plotModel.rows, handleSelectRow]
  );

  const merged = mergeProps({
    themeTarget: themeProps('dumbbell-plot', {
      sortBy: activeSortBy,
      empty: isEmpty,
      hasSelection: activeHighlightRow !== null,
    }),
    baseClassName: 'prism-slab p-4 sm:p-5 space-y-3.5 w-full max-w-full min-w-0',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('dumbbell-plot', 'header');
  const legendClass = stableClassName('dumbbell-plot', 'legend');
  const sortClass = stableClassName('dumbbell-plot', 'sort');
  const wellClass = stableClassName('dumbbell-plot', 'well');
  const svgClass = stableClassName('dumbbell-plot', 'svg');
  const readoutClass = stableClassName('dumbbell-plot', 'readout');

  return (
    <div ref={ref} role="region" aria-labelledby={headingId} {...rest} {...merged}>
      <div className={cx(headerClass, 'space-y-2.5 min-w-0')}>
        <div className="flex flex-wrap items-center justify-between gap-2.5 min-w-0">
          <h4
            id={headingId}
            className="text-sm font-semibold tracking-tight min-w-0 break-words"
            style={{ color: 'var(--prism-text-primary)' }}
          >
            {title}
          </h4>

          <div
            data-testid="dumbbell-legend"
            aria-label="Comparison series legend"
            className={cx(legendClass, 'flex flex-wrap items-center gap-2 text-xs min-w-0')}
          >
            <span
              className="prism-crystal inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-medium"
              style={{ color: 'var(--prism-text-primary)' }}
            >
              <span
                aria-hidden="true"
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: 'var(--prism-info-main)' }}
              />
              <span>{baselineLabel}</span>
            </span>

            <span
              className="prism-crystal inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-medium"
              style={{ color: 'var(--prism-text-primary)' }}
            >
              <span
                aria-hidden="true"
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: 'var(--prism-primary-main)' }}
              />
              <span>{currentLabel}</span>
            </span>
          </div>
        </div>

        <div
          role="group"
          aria-label="Sort dumbbell plot rows"
          data-testid="dumbbell-sort-group"
          className={cx(sortClass, 'flex flex-wrap items-center gap-1.5 min-w-0')}
        >
          {SORT_OPTIONS.map((option) => {
            const isActive = activeSortBy === option.mode;
            return (
              <button
                key={option.mode}
                type="button"
                aria-pressed={isActive}
                data-sort-mode={option.mode}
                data-testid={`dumbbell-sort-${option.mode}`}
                onClick={() => handleSortClick(option.mode)}
                className={cx(
                  'prism-focus-ring inline-flex items-center px-2.5 py-1 rounded-full text-xs cursor-pointer transition-all duration-150 shrink-0',
                  isActive
                    ? 'prism-crystal font-semibold'
                    : 'prism-well font-medium opacity-80 hover:opacity-100'
                )}
                style={{
                  color: isActive ? 'var(--prism-text-primary)' : 'var(--prism-text-secondary)',
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {isEmpty || !readoutRow ? (
        <div
          role="status"
          data-testid="dumbbell-empty"
          className="prism-well rounded-2xl px-4 py-8 text-center text-xs font-medium"
          style={{ color: 'var(--prism-text-secondary)' }}
        >
          No variance comparison items to display.
        </div>
      ) : (
        <>
          <div
            className={cx(
              wellClass,
              'prism-well rounded-2xl p-2.5 sm:p-3 w-full max-w-full min-w-0'
            )}
          >
            <svg
              role="img"
              aria-label={`${title} comparing ${baselineLabel} and ${currentLabel} across ${plotModel.rows.length} ${plotModel.rows.length === 1 ? 'category' : 'categories'}`}
              data-testid="dumbbell-svg"
              viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
              className={cx(svgClass, 'w-full h-auto select-none')}
            >
              {plotModel.ticks.map((tick) => (
                <g key={tick.key} data-testid="dumbbell-grid-tick">
                  <line
                    x1={tick.x}
                    y1={PLOT_TOP}
                    x2={tick.x}
                    y2={PLOT_BOTTOM}
                    stroke="var(--prism-divider)"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    pointerEvents="none"
                  />
                  <line
                    x1={tick.x}
                    y1={PLOT_BOTTOM}
                    x2={tick.x}
                    y2={PLOT_BOTTOM + 4}
                    stroke="var(--prism-divider)"
                    strokeWidth={1}
                    pointerEvents="none"
                  />
                  <text
                    x={tick.x}
                    y={PLOT_BOTTOM + 18}
                    textAnchor="middle"
                    fill="var(--prism-text-secondary)"
                    className="text-[9.5px] font-mono tabular-nums"
                  >
                    {tick.label}
                  </text>
                </g>
              ))}

              <line
                x1={PLOT_LEFT}
                y1={PLOT_BOTTOM}
                x2={PLOT_RIGHT}
                y2={PLOT_BOTTOM}
                stroke="var(--prism-divider)"
                strokeWidth={1.25}
                pointerEvents="none"
              />

              {plotModel.rows.map((row) => {
                const isSelected = selectedRow?.key === row.key;
                const isHighlighted = activeHighlightRow?.key === row.key;
                const isDimmed = activeHighlightRow !== null && !isHighlighted;
                const baselineRadius = row.isCoincident
                  ? isHighlighted
                    ? 6.5
                    : 5.75
                  : isHighlighted
                    ? 5
                    : 4.25;
                const currentRadius = row.isCoincident
                  ? isHighlighted
                    ? 3.75
                    : 3.25
                  : isHighlighted
                    ? 5.25
                    : 4.5;

                return (
                  <g
                    key={row.key}
                    ref={(node) => registerRowRef(row.key, node)}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                    aria-label={buildRowAriaLabel(row, baselineLabel, currentLabel, unit)}
                    data-testid={`dumbbell-row-${row.id}`}
                    data-item-id={row.id}
                    data-direction={row.isGain ? 'gain' : 'regression'}
                    data-selected={isSelected ? 'true' : 'false'}
                    data-highlighted={isHighlighted ? 'true' : 'false'}
                    className="prism-focus-ring cursor-pointer transition-opacity duration-150"
                    onClick={() => handleSelectRow(row)}
                    onFocus={() => setFocusedKey(row.key)}
                    onBlur={() => setFocusedKey((prev) => (prev === row.key ? null : prev))}
                    onKeyDown={handleRowKeyDown(row.rowIndex, row)}
                  >
                    <rect
                      x={4}
                      y={row.bandY}
                      width={SVG_WIDTH - 8}
                      height={row.bandHeight}
                      rx={6}
                      fill={isHighlighted ? row.deltaColor : 'transparent'}
                      fillOpacity={isHighlighted ? 0.12 : 0}
                      stroke={isHighlighted ? row.deltaColor : 'none'}
                      strokeOpacity={isHighlighted ? 0.45 : 0}
                      strokeWidth={isHighlighted ? 1 : 0}
                    />

                    <text
                      x={LABEL_X}
                      y={row.y + 3.5}
                      textAnchor="end"
                      fill={
                        isHighlighted
                          ? 'var(--prism-text-primary)'
                          : 'var(--prism-text-secondary)'
                      }
                      opacity={isDimmed ? 0.55 : 1}
                      className={cx(
                        'text-[10.5px]',
                        isHighlighted ? 'font-semibold' : 'font-medium'
                      )}
                    >
                      {truncateLabel(row.label, 14)}
                    </text>

                    <line
                      x1={PLOT_LEFT}
                      y1={row.y}
                      x2={PLOT_RIGHT}
                      y2={row.y}
                      stroke="var(--prism-divider)"
                      strokeWidth={1}
                      strokeOpacity={0.45}
                      pointerEvents="none"
                    />

                    <line
                      data-testid={`dumbbell-connector-${row.id}`}
                      x1={row.baselineX}
                      y1={row.y}
                      x2={row.currentX}
                      y2={row.y}
                      stroke={row.deltaColor}
                      strokeWidth={isHighlighted ? 4.5 : 3}
                      strokeLinecap="round"
                      strokeOpacity={isDimmed ? 0.35 : 0.95}
                      pointerEvents="none"
                    />

                    <circle
                      data-testid={`dumbbell-baseline-dot-${row.id}`}
                      cx={row.baselineX}
                      cy={row.y}
                      r={baselineRadius}
                      fill="var(--prism-info-main)"
                      fillOpacity={isDimmed ? 0.45 : 1}
                      stroke={
                        isHighlighted ? 'var(--prism-text-primary)' : 'var(--prism-bg-start)'
                      }
                      strokeWidth={isHighlighted ? 1.75 : 1.25}
                      pointerEvents="none"
                    />

                    <circle
                      data-testid={`dumbbell-current-dot-${row.id}`}
                      cx={row.currentX}
                      cy={row.y}
                      r={currentRadius}
                      fill="var(--prism-primary-main)"
                      fillOpacity={isDimmed ? 0.45 : 1}
                      stroke={
                        isHighlighted ? 'var(--prism-text-primary)' : 'var(--prism-bg-start)'
                      }
                      strokeWidth={isHighlighted ? 1.75 : 1.25}
                      pointerEvents="none"
                    />

                    <g data-testid={`dumbbell-delta-${row.id}`} pointerEvents="none">
                      <rect
                        x={DELTA_PILL_X}
                        y={roundCoord(row.y - DELTA_PILL_HEIGHT / 2)}
                        width={DELTA_PILL_WIDTH}
                        height={DELTA_PILL_HEIGHT}
                        rx={9}
                        fill={row.deltaColor}
                        fillOpacity={isHighlighted ? 0.22 : isDimmed ? 0.06 : 0.12}
                        stroke={row.deltaColor}
                        strokeOpacity={isHighlighted ? 0.85 : isDimmed ? 0.25 : 0.45}
                        strokeWidth={1}
                      />
                      <text
                        x={DELTA_PILL_X + DELTA_PILL_WIDTH / 2}
                        y={row.y + 3.5}
                        textAnchor="middle"
                        fill={row.deltaColor}
                        opacity={isDimmed ? 0.6 : 1}
                        className="text-[9.5px] font-mono font-semibold tabular-nums"
                      >
                        {formatSignedValue(row.gap, unit)}
                      </text>
                    </g>
                  </g>
                );
              })}
            </svg>
          </div>

          <div
            data-testid="dumbbell-readout"
            aria-live="polite"
            className={cx(
              readoutClass,
              'prism-well rounded-xl px-3.5 py-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs tabular-nums min-w-0'
            )}
            style={{ color: 'var(--prism-text-primary)' }}
          >
            <span
              aria-hidden="true"
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: readoutRow.deltaColor }}
            />
            <span data-testid="dumbbell-readout-category" className="font-semibold">
              {readoutRow.label}
            </span>
            <span aria-hidden="true" style={{ color: 'var(--prism-text-secondary)' }}>
              ·
            </span>
            <span data-testid="dumbbell-readout-values" className="font-mono">
              <span style={{ color: 'var(--prism-info-main)' }}>
                {`${baselineLabel} ${formatValue(readoutRow.baseline, unit)}`}
              </span>
              <span aria-hidden="true" style={{ color: 'var(--prism-text-secondary)' }}>
                {' → '}
              </span>
              <span style={{ color: 'var(--prism-primary-main)' }}>
                {`${currentLabel} ${formatValue(readoutRow.current, unit)}`}
              </span>
            </span>
            <span aria-hidden="true" style={{ color: 'var(--prism-text-secondary)' }}>
              ·
            </span>
            <span
              data-testid="dumbbell-readout-gap"
              className="font-mono font-semibold"
              style={{ color: readoutRow.deltaColor }}
            >
              {formatSignedValue(readoutRow.gap, unit)}
            </span>
            <span aria-hidden="true" style={{ color: 'var(--prism-text-secondary)' }}>
              ·
            </span>
            <span
              data-testid="dumbbell-readout-pct"
              className="font-mono"
              style={{ color: 'var(--prism-text-secondary)' }}
            >
              {`${formatGapPct(readoutRow.gapPct)} change`}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

DumbbellPlot.displayName = 'DumbbellPlot';
