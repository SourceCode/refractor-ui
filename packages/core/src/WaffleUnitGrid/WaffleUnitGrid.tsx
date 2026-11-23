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
import { STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export type WaffleTone = 'primary' | 'secondary' | 'emerald' | 'amber' | 'rose' | 'info';

export interface WaffleSegment {
  /** Stable identifier for this proportion category. */
  id: string;
  /** Human-readable category label displayed on cards, tooltips, and the live storytelling callout. */
  label: string;
  /** Positive finite numeric magnitude determining proportional unit-square allocation. */
  value: number;
  /** Optional semantic optical tone mapped strictly to `--prism-*` CSS custom properties. */
  tone?: WaffleTone;
}

export interface WaffleResolvedSegment extends WaffleSegment {
  /** Percentage share of the grand total rounded to one decimal place (0..100). */
  sharePct: number;
  /** Exact integer count of allocated unit squares computed via Largest-Remainder (Hamilton) rounding. */
  cellCount: number;
  /** Resolved semantic optical tone token key. */
  tone: WaffleTone;
}

export interface WaffleUnitGridProps extends BaseProps<HTMLDivElement> {
  /**
   * Proportional categories to allocate across the unit-square matrix.
   * Defaults to 4 cloud budget / user plan segments when omitted; renders a clean `role="status"` empty state
   * when passed `[]` or when the sum of valid positive values is `<= 0`.
   */
  segments?: ReadonlyArray<WaffleSegment>;
  /** Number of matrix rows (defaults to `10`, clamped to `4..12`). */
  rows?: number;
  /** Number of matrix columns (defaults to `10`, clamped to `5..20`; default `10×10 = 100` squares). */
  columns?: number;
  /** Measurement unit appended to raw segment values and the grand total badge (defaults to `'%'`). */
  unit?: string;
  /** Heading rendered in the sculpted `prism-slab` header (defaults to `'10×10 Waffle Unit Proportion'`). */
  title?: string;
  /** Callback invoked with the resolved segment whenever a category is selected. */
  onSelectSegment?: (segment: WaffleResolvedSegment) => void;
}

interface InternalWaffleSegment {
  key: string;
  testId: string;
  index: number;
  color: string;
  resolved: WaffleResolvedSegment;
}

interface WaffleGridCell {
  key: string;
  index: number;
  row: number;
  col: number;
  x: number;
  y: number;
  segment: InternalWaffleSegment;
}

const MIN_ROWS = 4;
const MAX_ROWS = 12;
const DEFAULT_ROWS = 10;
const MIN_COLUMNS = 5;
const MAX_COLUMNS = 20;
const DEFAULT_COLUMNS = 10;

const CELL_SIZE = 18;
const CELL_GAP = 4;
const GRID_PAD = 6;
const CELL_RADIUS = 4;

const TONE_CYCLE: ReadonlyArray<WaffleTone> = [
  'primary',
  'secondary',
  'emerald',
  'amber',
  'rose',
  'info',
];

const TONE_TOKEN_MAP: Record<WaffleTone, string> = {
  primary: 'var(--prism-primary-main)',
  secondary: 'var(--prism-secondary-main)',
  emerald: 'var(--prism-success-main)',
  amber: 'var(--prism-warning-main)',
  rose: 'var(--prism-error-main)',
  info: 'var(--prism-info-main)',
};

export const DEFAULT_WAFFLE_SEGMENTS: ReadonlyArray<WaffleSegment> = [
  { id: 'enterprise', label: 'Enterprise Plan', value: 42, tone: 'primary' },
  { id: 'pro', label: 'Pro Teams', value: 29, tone: 'secondary' },
  { id: 'starter', label: 'Starter Cloud', value: 18, tone: 'emerald' },
  { id: 'sandbox', label: 'Sandbox & Free', value: 11, tone: 'amber' },
];

function roundPct(value: number): number {
  return Math.round(value * 10) / 10;
}

function formatNumeric(value: number): string {
  if (Number.isInteger(value)) {
    return String(value);
  }
  return String(Number(value.toFixed(2)));
}

function formatMetric(value: number, unit: string): string {
  const num = formatNumeric(value);
  const trimmedUnit = unit.trim();
  if (!trimmedUnit) {
    return num;
  }
  if (trimmedUnit === '%') {
    return `${num}%`;
  }
  return `${num} ${trimmedUnit}`;
}

const headerClass = /*#__PURE__*/ stableClassName('waffle-unit-grid', 'header');
const layoutClass = /*#__PURE__*/ stableClassName('waffle-unit-grid', 'layout');
const wellClass = /*#__PURE__*/ stableClassName('waffle-unit-grid', 'well');
const svgClass = /*#__PURE__*/ stableClassName('waffle-unit-grid', 'svg');
const breakdownClass = /*#__PURE__*/ stableClassName('waffle-unit-grid', 'breakdown');
const cardClass = /*#__PURE__*/ stableClassName('waffle-unit-grid', 'card');
const calloutClass = /*#__PURE__*/ stableClassName('waffle-unit-grid', 'callout');

function WaffleUnitGridInner({
  segments,
  rows = DEFAULT_ROWS,
  columns = DEFAULT_COLUMNS,
  unit = '%',
  title = '10×10 Waffle Unit Proportion',
  onSelectSegment,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: WaffleUnitGridProps) {
  const headingId = useId();
  const override = useComponentOverride('WaffleUnitGrid');
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const safeRows = Math.round(clampNumber(rows, MIN_ROWS, MAX_ROWS, DEFAULT_ROWS));
  const safeColumns = Math.round(clampNumber(columns, MIN_COLUMNS, MAX_COLUMNS, DEFAULT_COLUMNS));
  const totalCells = safeRows * safeColumns;
  const unitStepPct = (100 / totalCells).toFixed(1);

  const sourceSegments = segments ?? DEFAULT_WAFFLE_SEGMENTS;

  const { resolvedSegments, cells, totalValue, leadingSegment } = useMemo(() => {
    const validSegments: WaffleSegment[] = [];
    let sumTotal = 0;

    for (const seg of sourceSegments) {
      if (Number.isFinite(seg.value) && seg.value > 0) {
        validSegments.push(seg);
        sumTotal += seg.value;
      }
    }

    if (validSegments.length === 0) {
      return {
        resolvedSegments: [] as InternalWaffleSegment[],
        cells: [] as WaffleGridCell[],
        totalValue: 0,
        leadingSegment: null as InternalWaffleSegment | null,
      };
    }

    // Largest-Remainder (Hamilton) rounding so allocated squares ALWAYS sum exactly to rows * columns.
    const quotas = validSegments.map((seg, index) => {
      const exact = (seg.value / sumTotal) * totalCells;
      const base = Math.floor(exact);
      return {
        index,
        base,
        remainder: exact - base,
      };
    });

    let allocated = 0;
    for (const q of quotas) {
      allocated += q.base;
    }

    const leftover = totalCells - allocated;
    if (leftover > 0) {
      const ranked = [...quotas].sort((a, b) => {
        if (b.remainder !== a.remainder) {
          return b.remainder - a.remainder;
        }
        return a.index - b.index;
      });
      const extraCount = Math.min(leftover, ranked.length);
      for (let i = 0; i < extraCount; i += 1) {
        ranked[i]!.base += 1;
      }
    }

    const idCounts = new Map<string, number>();
    const internalList: InternalWaffleSegment[] = validSegments.map((seg, index) => {
      const seen = idCounts.get(seg.id) ?? 0;
      idCounts.set(seg.id, seen + 1);
      const key = seen === 0 ? `waffle:${seg.id}` : `waffle:${seg.id}#${seen + 1}`;
      const testId = seen === 0 ? `waffle-card-${seg.id}` : `waffle-card-${seg.id}-${seen + 1}`;
      const tone: WaffleTone = seg.tone ?? TONE_CYCLE[index % TONE_CYCLE.length]!;
      const resolved: WaffleResolvedSegment = {
        id: seg.id,
        label: seg.label,
        value: seg.value,
        tone,
        sharePct: roundPct((seg.value / sumTotal) * 100),
        cellCount: quotas[index]!.base,
      };

      return {
        key,
        testId,
        index,
        color: TONE_TOKEN_MAP[tone],
        resolved,
      };
    });

    let topSegment = internalList[0]!;
    for (const entry of internalList) {
      if (entry.resolved.value > topSegment.resolved.value) {
        topSegment = entry;
      }
    }

    const flatCells: WaffleGridCell[] = [];
    let cursor = 0;
    for (const entry of internalList) {
      for (let count = 0; count < entry.resolved.cellCount; count += 1) {
        const row = Math.floor(cursor / safeColumns);
        const col = cursor % safeColumns;
        flatCells.push({
          key: `cell-${row}-${col}`,
          index: cursor,
          row,
          col,
          x: GRID_PAD + col * (CELL_SIZE + CELL_GAP),
          y: GRID_PAD + row * (CELL_SIZE + CELL_GAP),
          segment: entry,
        });
        cursor += 1;
      }
    }

    return {
      resolvedSegments: internalList,
      cells: flatCells,
      totalValue: sumTotal,
      leadingSegment: topSegment,
    };
  }, [sourceSegments, totalCells, safeColumns]);

  const isEmpty = resolvedSegments.length === 0;

  const selectedSegment = useMemo(() => {
    if (selectedKey === null) return null;
    return resolvedSegments.find((entry) => entry.key === selectedKey) ?? null;
  }, [resolvedSegments, selectedKey]);

  const registerCardRef = useCallback((key: string, node: HTMLDivElement | null) => {
    if (node) {
      cardRefs.current.set(key, node);
    } else {
      cardRefs.current.delete(key);
    }
  }, []);

  const handleSelectSegment = useCallback(
    (entry: InternalWaffleSegment) => {
      setSelectedKey(entry.key);
      onSelectSegment?.(entry.resolved);
    },
    [onSelectSegment]
  );

  const handleToggleSegment = useCallback(
    (entry: InternalWaffleSegment) => {
      if (selectedSegment?.key === entry.key) {
        setSelectedKey(null);
        return;
      }
      handleSelectSegment(entry);
    },
    [handleSelectSegment, selectedSegment]
  );

  const handleCardKeyDown = useCallback(
    (segIndex: number, entry: InternalWaffleSegment) =>
      (event: ReactKeyboardEvent<HTMLDivElement>) => {
        if (event.nativeEvent.isComposing) return;

        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleToggleSegment(entry);
          return;
        }

        if (event.key === 'Escape') {
          event.preventDefault();
          setSelectedKey(null);
          return;
        }

        const count = resolvedSegments.length;
        if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
          event.preventDefault();
          const next = resolvedSegments[(segIndex + 1) % count]!;
          cardRefs.current.get(next.key)?.focus();
          handleSelectSegment(next);
          return;
        }

        if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
          event.preventDefault();
          const prev = resolvedSegments[(segIndex - 1 + count) % count]!;
          cardRefs.current.get(prev.key)?.focus();
          handleSelectSegment(prev);
        }
      },
    [handleSelectSegment, handleToggleSegment, resolvedSegments]
  );

  const svgWidth = GRID_PAD * 2 + safeColumns * CELL_SIZE + (safeColumns - 1) * CELL_GAP;
  const svgHeight = GRID_PAD * 2 + safeRows * CELL_SIZE + (safeRows - 1) * CELL_GAP;

  const merged = mergeProps({
    themeTarget: themeProps('waffle-unit-grid', {
      empty: isEmpty,
      rows: safeRows,
      columns: safeColumns,
      hasSelection: selectedSegment !== null,
    }),
    baseClassName: 'prism-slab p-4 sm:p-5 space-y-4 w-full max-w-full min-w-0',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });


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

        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span
            data-testid="waffle-resolution-pill"
            className="prism-crystal inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-mono font-medium tabular-nums shrink-0"
            style={STYLE_TEXT_SECONDARY}
          >
            {`${totalCells} units · 1 sq = ${unitStepPct}%`}
          </span>

          {!isEmpty ? (
            <span
              data-testid="waffle-total-badge"
              className="prism-crystal inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-mono font-semibold tabular-nums shrink-0"
              style={STYLE_TEXT_PRIMARY}
            >
              <span style={STYLE_TEXT_SECONDARY}>Total</span>
              <span>{formatMetric(totalValue, unit)}</span>
            </span>
          ) : null}
        </div>
      </div>

      {isEmpty ? (
        <div
          role="status"
          data-testid="waffle-empty"
          className="prism-well rounded-2xl px-4 py-8 text-center text-xs font-medium"
          style={STYLE_TEXT_SECONDARY}
        >
          No positive proportion values to display.
        </div>
      ) : (
        <>
          <div
            className={cx(
              layoutClass,
              'grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-4 items-center min-w-0 w-full max-w-full'
            )}
          >
            <div
              className={cx(
                wellClass,
                'prism-well rounded-2xl p-3 flex items-center justify-center min-w-0 max-w-full overflow-hidden'
              )}
            >
              <svg
                role="img"
                aria-label={`${title} ${safeRows}×${safeColumns} waffle unit grid (${totalCells} squares across ${resolvedSegments.length} categories)`}
                data-testid="waffle-svg"
                data-rows={String(safeRows)}
                data-columns={String(safeColumns)}
                data-total-cells={String(totalCells)}
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className={cx(svgClass, 'w-full h-auto block select-none', 'prism-contain-box')}
                style={{ maxWidth: `${Math.min(svgWidth, 320)}px` }}
              >
                {cells.map((cell) => {
                  const isHighlighted =
                    selectedSegment !== null && selectedSegment.key === cell.segment.key;
                  const isDimmed = selectedSegment !== null && !isHighlighted;
                  const fillOpacity = isHighlighted ? 0.96 : isDimmed ? 0.16 : 0.78;
                  const strokeColor = isHighlighted
                    ? 'var(--prism-text-primary)'
                    : cell.segment.color;
                  const strokeWidth = isHighlighted ? 1.5 : 0.75;
                  const strokeOpacity = isHighlighted ? 0.9 : isDimmed ? 0.2 : 0.45;

                  return (
                    <rect
                      key={cell.key}
                      x={cell.x}
                      y={cell.y}
                      width={CELL_SIZE}
                      height={CELL_SIZE}
                      rx={CELL_RADIUS}
                      fill={cell.segment.color}
                      fillOpacity={fillOpacity}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      strokeOpacity={strokeOpacity}
                      data-waffle-cell="true"
                      data-cell-index={String(cell.index)}
                      data-row={String(cell.row)}
                      data-col={String(cell.col)}
                      data-segment-id={cell.segment.resolved.id}
                      data-tone={cell.segment.resolved.tone}
                      data-highlighted={isHighlighted ? 'true' : 'false'}
                      data-dimmed={isDimmed ? 'true' : 'false'}
                      className="cursor-pointer transition-opacity duration-150"
                      onClick={() => handleToggleSegment(cell.segment)}
                    >
                      <title>{`${cell.segment.resolved.label}: ${cell.segment.resolved.cellCount} of ${totalCells} units (${cell.segment.resolved.sharePct.toFixed(1)}%)`}</title>
                    </rect>
                  );
                })}
              </svg>
            </div>

            <div
              role="group"
              aria-label="Category proportion breakdown"
              data-testid="waffle-breakdown"
              className={cx(breakdownClass, 'flex flex-col gap-2 min-w-0 w-full')}
            >
              {resolvedSegments.map((entry) => {
                const isSelected = selectedSegment?.key === entry.key;
                const isDimmed = selectedSegment !== null && !isSelected;
                const { id, label, value, tone, sharePct, cellCount } = entry.resolved;

                return (
                  <div
                    key={entry.key}
                    ref={(node) => registerCardRef(entry.key, node)}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                    aria-label={`${label}: ${sharePct.toFixed(1)}%, ${cellCount} of ${totalCells} units, ${formatMetric(value, unit)}`}
                    data-testid={entry.testId}
                    data-segment-id={id}
                    data-tone={tone}
                    data-selected={isSelected ? 'true' : 'false'}
                    data-dimmed={isDimmed ? 'true' : 'false'}
                    onClick={() => handleToggleSegment(entry)}
                    onKeyDown={handleCardKeyDown(entry.index, entry)}
                    className={cx(
                      cardClass,
                      'prism-focus-ring rounded-xl px-3 py-2.5 cursor-pointer transition-[color,background-color,border-color,opacity,transform] duration-150 min-w-0 max-w-full flex flex-col gap-1.5',
                      isSelected ? 'prism-well' : 'prism-crystal',
                      isDimmed ? 'opacity-60 hover:opacity-85' : 'opacity-100'
                    )}
                    style={{
                      border: isSelected
                        ? `1.5px solid ${entry.color}`
                        : '1px solid var(--prism-divider)',
                      color: 'var(--prism-text-primary)',
                    }}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
                      <span className="inline-flex items-center gap-2 min-w-0">
                        <span
                          aria-hidden="true"
                          className="w-3 h-3 rounded-[4px] shrink-0"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-xs font-semibold truncate">{label}</span>
                      </span>

                      <span className="text-xs font-mono font-bold tabular-nums shrink-0">
                        {`${sharePct.toFixed(1)}%`}
                      </span>
                    </div>

                    <div
                      className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono tabular-nums min-w-0"
                      style={STYLE_TEXT_SECONDARY}
                    >
                      <span>{`${cellCount} / ${totalCells} sq`}</span>
                      <span>{formatMetric(value, unit)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div
            data-testid="waffle-callout"
            aria-live="polite"
            className={cx(
              calloutClass,
              'prism-well rounded-xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs tabular-nums min-w-0'
            )}
            style={STYLE_TEXT_PRIMARY}
          >
            {selectedSegment ? (
              <>
                <span className="inline-flex items-center gap-2 min-w-0">
                  <span
                    aria-hidden="true"
                    className="w-2.5 h-2.5 rounded-[3px] shrink-0"
                    style={{ backgroundColor: selectedSegment.color }}
                  />
                  <span className="font-medium break-words min-w-0">
                    {`${selectedSegment.resolved.cellCount} of ${totalCells} units (${selectedSegment.resolved.sharePct.toFixed(1)}%) — ${selectedSegment.resolved.label}`}
                  </span>
                </span>
                <span
                  className="shrink-0 font-mono font-medium"
                  style={STYLE_TEXT_SECONDARY}
                >
                  {formatMetric(selectedSegment.resolved.value, unit)}
                </span>
              </>
            ) : (
              <>
                <span
                  className="min-w-0 break-words"
                  style={STYLE_TEXT_SECONDARY}
                >
                  {`Select a category to isolate its unit squares. Lead: ${leadingSegment!.resolved.cellCount} of ${totalCells} units (${leadingSegment!.resolved.sharePct.toFixed(1)}%) — ${leadingSegment!.resolved.label}`}
                </span>
                <span
                  className="shrink-0 font-mono font-medium"
                  style={STYLE_TEXT_SECONDARY}
                >
                  {`${resolvedSegments.length} ${resolvedSegments.length === 1 ? 'category' : 'categories'} · ${safeRows}×${safeColumns}`}
                </span>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export const WaffleUnitGrid = /*#__PURE__*/ memoWithDisplayName(WaffleUnitGridInner, 'WaffleUnitGrid');
