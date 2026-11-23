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
import { STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export type MarimekkoTone = 'primary' | 'secondary' | 'emerald' | 'amber' | 'info';

export interface MarimekkoSegment {
  /** Stable identifier for this segment within its column. */
  id: string;
  /** Human-readable segment or product-line label. */
  label: string;
  /** Positive finite numeric magnitude determining vertical segment share. */
  value: number;
  /** Optional semantic optical tone mapped to --prism-* CSS custom properties. */
  tone?: MarimekkoTone;
}

export interface MarimekkoColumn {
  /** Stable identifier for this column (e.g. region or market). */
  id: string;
  /** Human-readable column header label. */
  label: string;
  /** Ordered vertical segments stacked from top to bottom inside the column. */
  segments: ReadonlyArray<MarimekkoSegment>;
}

export interface MarimekkoSelection {
  /** Identifier of the selected segment's parent column. */
  columnId: string;
  /** Display label of the selected segment's parent column. */
  columnLabel: string;
  /** Identifier of the selected segment. */
  segmentId: string;
  /** Display label of the selected segment. */
  segmentLabel: string;
  /** Sanitized positive numeric value of the selected segment. */
  value: number;
  /** Percentage share of this segment within its parent column (0..100). */
  columnSharePct: number;
  /** Percentage share of this segment relative to the chart grand total (0..100). */
  totalSharePct: number;
}

export interface MarimekkoChartProps extends BaseProps<HTMLDivElement> {
  /** Regional or categorical columns containing stacked segments; defaults to 4 realistic revenue regions when omitted. */
  columns?: ReadonlyArray<MarimekkoColumn>;
  /** Unit suffix appended to formatted values such as 'M', 'B', or 'k' (defaults to 'M'). */
  valueUnit?: string;
  /** Currency or unit prefix prepended to formatted values (defaults to '$'). */
  valuePrefix?: string;
  /** Chart card heading linked to the region and SVG graphic (defaults to 'Market Share Marimekko'). */
  title?: string;
  /** Callback invoked when a user clicks or keyboard-activates/navigates to any segment rectangle. */
  onSelectSegment?: (selection: MarimekkoSelection) => void;
}

interface ComputedSegment {
  cellKey: string;
  colIndex: number;
  segIndex: number;
  columnId: string;
  columnLabel: string;
  segmentId: string;
  segmentLabel: string;
  legendKey: string;
  value: number;
  columnSharePct: number;
  totalSharePct: number;
  tone: MarimekkoTone;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

interface ComputedColumn {
  key: string;
  colIndex: number;
  id: string;
  label: string;
  total: number;
  sharePct: number;
  x: number;
  width: number;
  centerX: number;
  segments: ComputedSegment[];
}

interface LegendItem {
  key: string;
  label: string;
  tone: MarimekkoTone;
  color: string;
  totalValue: number;
  sharePct: number;
}

interface GridLine {
  key: string;
  y: number;
}

const SVG_WIDTH = 460;
const SVG_HEIGHT = 220;
const PAD_LEFT = 12;
const PAD_RIGHT = 12;
const PLOT_X = PAD_LEFT;
const PLOT_WIDTH = SVG_WIDTH - PAD_LEFT - PAD_RIGHT;
const HEADER_LABEL_Y = 15;
const HEADER_SHARE_Y = 28;
const PLOT_TOP = 36;
const PLOT_BOTTOM = 200;
const PLOT_HEIGHT = PLOT_BOTTOM - PLOT_TOP;
const FOOTER_TOTAL_Y = 214;
const MAX_COL_GAP = 4;
const GRID_FRACTIONS: ReadonlyArray<number> = [0, 0.25, 0.5, 0.75, 1];

export const DEFAULT_MARIMEKKO_COLUMNS: ReadonlyArray<MarimekkoColumn> = [
  {
    id: 'na',
    label: 'North America',
    segments: [
      { id: 'cloud', label: 'Cloud Core', value: 80, tone: 'primary' },
      { id: 'ai', label: 'AI Suite', value: 50, tone: 'secondary' },
      { id: 'security', label: 'Security', value: 36, tone: 'emerald' },
      { id: 'analytics', label: 'Analytics', value: 22, tone: 'amber' },
      { id: 'edge', label: 'Edge Ops', value: 12, tone: 'info' },
    ],
  },
  {
    id: 'emea',
    label: 'EMEA',
    segments: [
      { id: 'cloud', label: 'Cloud Core', value: 54, tone: 'primary' },
      { id: 'ai', label: 'AI Suite', value: 39, tone: 'secondary' },
      { id: 'security', label: 'Security', value: 30, tone: 'emerald' },
      { id: 'analytics', label: 'Analytics', value: 18, tone: 'amber' },
      { id: 'edge', label: 'Edge Ops', value: 9, tone: 'info' },
    ],
  },
  {
    id: 'apac',
    label: 'APAC',
    segments: [
      { id: 'cloud', label: 'Cloud Core', value: 32, tone: 'primary' },
      { id: 'ai', label: 'AI Suite', value: 30, tone: 'secondary' },
      { id: 'security', label: 'Security', value: 18, tone: 'emerald' },
      { id: 'analytics', label: 'Analytics', value: 12, tone: 'amber' },
      { id: 'edge', label: 'Edge Ops', value: 8, tone: 'info' },
    ],
  },
  {
    id: 'latam',
    label: 'LATAM',
    segments: [
      { id: 'cloud', label: 'Cloud Core', value: 20, tone: 'primary' },
      { id: 'ai', label: 'AI Suite', value: 12, tone: 'secondary' },
      { id: 'security', label: 'Security', value: 9, tone: 'emerald' },
      { id: 'analytics', label: 'Analytics', value: 6, tone: 'amber' },
      { id: 'edge', label: 'Edge Ops', value: 3, tone: 'info' },
    ],
  },
];

function getDefaultTone(index: number): MarimekkoTone {
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

function getToneColor(tone: MarimekkoTone): string {
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

function roundCoord(value: number): number {
  return Number(value.toFixed(2));
}

function roundPct(value: number): number {
  const rounded = Math.round(value * 10) / 10;
  return rounded === 0 ? 0 : rounded;
}

function formatNumeric(value: number): string {
  const safe = value === 0 ? 0 : value;
  if (Number.isInteger(safe)) {
    return String(safe);
  }
  return String(Number(safe.toFixed(2)));
}

function formatValue(value: number, prefix: string, unit: string): string {
  return `${prefix}${formatNumeric(value)}${unit}`;
}

function truncateLabel(text: string, maxChars: number): string {
  const limit = Math.max(2, maxChars);
  if (text.length <= limit) {
    return text;
  }
  return `${text.slice(0, limit - 1)}…`;
}

function toSelection(cell: ComputedSegment): MarimekkoSelection {
  return {
    columnId: cell.columnId,
    columnLabel: cell.columnLabel,
    segmentId: cell.segmentId,
    segmentLabel: cell.segmentLabel,
    value: cell.value,
    columnSharePct: cell.columnSharePct,
    totalSharePct: cell.totalSharePct,
  };
}

const headerClass = /*#__PURE__*/ stableClassName('marimekko-chart', 'header');
const legendClass = /*#__PURE__*/ stableClassName('marimekko-chart', 'legend');
const wellClass = /*#__PURE__*/ stableClassName('marimekko-chart', 'well');
const svgClass = /*#__PURE__*/ stableClassName('marimekko-chart', 'svg');
const inspectorClass = /*#__PURE__*/ stableClassName('marimekko-chart', 'inspector');

function MarimekkoChartInner({
  columns,
  valueUnit = 'M',
  valuePrefix = '$',
  title = 'Market Share Marimekko',
  onSelectSegment,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: MarimekkoChartProps) {
  const headingId = useId();
  const override = useComponentOverride('MarimekkoChart');
  const rectRefs = useRef<Map<string, SVGRectElement>>(new Map());

  const [selectedCellKey, setSelectedCellKey] = useState<string | null>(null);
  const [focusedCellKey, setFocusedCellKey] = useState<string | null>(null);
  const [activeLegendKey, setActiveLegendKey] = useState<string | null>(null);

  const sourceColumns = columns ?? DEFAULT_MARIMEKKO_COLUMNS;

  const { computedColumns, allCells, legendItems, grandTotal, gridLines } = useMemo(() => {
    const validRawColumns: Array<{
      id: string;
      label: string;
      total: number;
      segments: Array<MarimekkoSegment>;
    }> = [];

    let sumTotal = 0;

    for (const col of sourceColumns) {
      const validSegments: MarimekkoSegment[] = [];
      let colTotal = 0;

      for (const seg of col.segments) {
        if (Number.isFinite(seg.value) && seg.value > 0) {
          validSegments.push(seg);
          colTotal += seg.value;
        }
      }

      if (colTotal > 0) {
        validRawColumns.push({
          id: col.id,
          label: col.label,
          total: colTotal,
          segments: validSegments,
        });
        sumTotal += colTotal;
      }
    }

    if (validRawColumns.length === 0 || sumTotal <= 0) {
      return {
        computedColumns: [] as ComputedColumn[],
        allCells: [] as ComputedSegment[],
        legendItems: [] as LegendItem[],
        grandTotal: 0,
        gridLines: [] as GridLine[],
      };
    }

    const colCount = validRawColumns.length;
    const colGap = colCount > 1 ? Math.min(MAX_COL_GAP, (PLOT_WIDTH * 0.25) / (colCount - 1)) : 0;
    const availableWidth = PLOT_WIDTH - colGap * (colCount - 1);

    const legendToneMap = new Map<string, MarimekkoTone>();
    const legendAggregate = new Map<
      string,
      { key: string; label: string; tone: MarimekkoTone; color: string; totalValue: number }
    >();
    let nextToneIndex = 0;

    const cols: ComputedColumn[] = [];
    const flatCells: ComputedSegment[] = [];
    let cumulativeXRatio = 0;

    for (let cIdx = 0; cIdx < colCount; cIdx += 1) {
      const rawCol = validRawColumns[cIdx]!;
      const colRatio = rawCol.total / sumTotal;
      const nextXRatio = cumulativeXRatio + colRatio;

      const x0 = PLOT_X + cumulativeXRatio * availableWidth + cIdx * colGap;
      const x1 = PLOT_X + nextXRatio * availableWidth + cIdx * colGap;
      const colX = roundCoord(x0);
      const colWidth = Math.max(1, roundCoord(x1 - x0));
      const colCenterX = roundCoord(colX + colWidth / 2);

      cumulativeXRatio = nextXRatio;

      const computedSegments: ComputedSegment[] = [];
      let cumulativeYRatio = 0;

      for (let sIdx = 0; sIdx < rawCol.segments.length; sIdx += 1) {
        const seg = rawCol.segments[sIdx]!;
        const segRatio = seg.value / rawCol.total;
        const nextYRatio = cumulativeYRatio + segRatio;

        const y0 = PLOT_TOP + cumulativeYRatio * PLOT_HEIGHT;
        const y1 = PLOT_TOP + nextYRatio * PLOT_HEIGHT;
        const segY = roundCoord(y0);
        const segHeight = Math.max(1, roundCoord(y1 - y0));

        cumulativeYRatio = nextYRatio;

        const legendKey = seg.label.trim() || seg.id;
        let resolvedTone: MarimekkoTone;
        if (seg.tone) {
          resolvedTone = seg.tone;
          if (!legendToneMap.has(legendKey)) {
            legendToneMap.set(legendKey, seg.tone);
          }
        } else {
          const existingTone = legendToneMap.get(legendKey);
          if (existingTone) {
            resolvedTone = existingTone;
          } else {
            resolvedTone = getDefaultTone(nextToneIndex);
            nextToneIndex += 1;
            legendToneMap.set(legendKey, resolvedTone);
          }
        }

        const color = getToneColor(resolvedTone);
        const existingLegend = legendAggregate.get(legendKey);
        if (existingLegend) {
          existingLegend.totalValue += seg.value;
        } else {
          legendAggregate.set(legendKey, {
            key: legendKey,
            label: seg.label.trim() || seg.id,
            tone: resolvedTone,
            color,
            totalValue: seg.value,
          });
        }

        const cell: ComputedSegment = {
          cellKey: `${rawCol.id}::${seg.id}::${cIdx}:${sIdx}`,
          colIndex: cIdx,
          segIndex: sIdx,
          columnId: rawCol.id,
          columnLabel: rawCol.label,
          segmentId: seg.id,
          segmentLabel: seg.label,
          legendKey,
          value: seg.value,
          columnSharePct: roundPct((seg.value / rawCol.total) * 100),
          totalSharePct: roundPct((seg.value / sumTotal) * 100),
          tone: resolvedTone,
          color,
          x: colX,
          y: segY,
          width: colWidth,
          height: segHeight,
          centerX: colCenterX,
          centerY: roundCoord(segY + segHeight / 2),
        };

        computedSegments.push(cell);
        flatCells.push(cell);
      }

      cols.push({
        key: `col-${rawCol.id}-${cIdx}`,
        colIndex: cIdx,
        id: rawCol.id,
        label: rawCol.label,
        total: rawCol.total,
        sharePct: roundPct((rawCol.total / sumTotal) * 100),
        x: colX,
        width: colWidth,
        centerX: colCenterX,
        segments: computedSegments,
      });
    }

    const legends: LegendItem[] = Array.from(legendAggregate.values()).map((entry) => ({
      ...entry,
      sharePct: roundPct((entry.totalValue / sumTotal) * 100),
    }));

    const lines: GridLine[] = GRID_FRACTIONS.map((fraction) => ({
      key: `grid-${fraction}`,
      y: roundCoord(PLOT_TOP + fraction * PLOT_HEIGHT),
    }));

    return {
      computedColumns: cols,
      allCells: flatCells,
      legendItems: legends,
      grandTotal: sumTotal,
      gridLines: lines,
    };
  }, [sourceColumns]);

  const isEmpty = computedColumns.length === 0;

  const selectedCell = useMemo(() => {
    if (selectedCellKey === null) return null;
    return allCells.find((cell) => cell.cellKey === selectedCellKey) ?? null;
  }, [allCells, selectedCellKey]);

  const focusedCell = useMemo(() => {
    if (focusedCellKey === null) return null;
    return allCells.find((cell) => cell.cellKey === focusedCellKey) ?? null;
  }, [allCells, focusedCellKey]);

  const activeLegend = useMemo(() => {
    if (activeLegendKey === null) return null;
    return legendItems.find((item) => item.key === activeLegendKey) ?? null;
  }, [activeLegendKey, legendItems]);

  const inspectedCell = focusedCell ?? selectedCell;
  const hasFilter = inspectedCell !== null || activeLegend !== null;

  const registerRectRef = useCallback((cellKey: string, node: SVGRectElement | null) => {
    if (node) {
      rectRefs.current.set(cellKey, node);
    } else {
      rectRefs.current.delete(cellKey);
    }
  }, []);

  const handleSelectSegment = useCallback(
    (cell: ComputedSegment) => {
      setActiveLegendKey(null);
      setSelectedCellKey(cell.cellKey);
      onSelectSegment?.(toSelection(cell));
    },
    [onSelectSegment]
  );

  const handleToggleLegend = useCallback((legendKey: string) => {
    setSelectedCellKey(null);
    setFocusedCellKey(null);
    setActiveLegendKey((prev) => (prev === legendKey ? null : legendKey));
  }, []);

  const handleFocusSegment = useCallback((cellKey: string) => {
    setFocusedCellKey(cellKey);
  }, []);

  const handleBlurSegment = useCallback((cellKey: string) => {
    setFocusedCellKey((prev) => (prev === cellKey ? null : prev));
  }, []);

  const handleSegmentKeyDown = useCallback(
    (colIndex: number, segIndex: number, cell: ComputedSegment) =>
      (event: ReactKeyboardEvent<SVGRectElement>) => {
        if (event.nativeEvent.isComposing) return;

        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleSelectSegment(cell);
          return;
        }

        const colCount = computedColumns.length;
        const currentCol = computedColumns[colIndex]!;
        const segCount = currentCol.segments.length;

        let targetCell: ComputedSegment | null = null;
        if (event.key === 'ArrowUp') {
          const nextSegIdx = (segIndex - 1 + segCount) % segCount;
          targetCell = currentCol.segments[nextSegIdx]!;
        } else if (event.key === 'ArrowDown') {
          const nextSegIdx = (segIndex + 1) % segCount;
          targetCell = currentCol.segments[nextSegIdx]!;
        } else if (event.key === 'ArrowLeft') {
          const nextColIdx = (colIndex - 1 + colCount) % colCount;
          const nextCol = computedColumns[nextColIdx]!;
          const nextSegIdx = Math.min(segIndex, nextCol.segments.length - 1);
          targetCell = nextCol.segments[nextSegIdx]!;
        } else if (event.key === 'ArrowRight') {
          const nextColIdx = (colIndex + 1) % colCount;
          const nextCol = computedColumns[nextColIdx]!;
          const nextSegIdx = Math.min(segIndex, nextCol.segments.length - 1);
          targetCell = nextCol.segments[nextSegIdx]!;
        }

        if (targetCell) {
          event.preventDefault();
          rectRefs.current.get(targetCell.cellKey)?.focus();
          handleSelectSegment(targetCell);
        }
      },
    [computedColumns, handleSelectSegment]
  );

  const merged = mergeProps({
    themeTarget: themeProps('marimekko-chart', {
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
            data-testid="marimekko-total-pill"
            className="prism-crystal inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold tabular-nums shrink-0"
            style={STYLE_TEXT_PRIMARY}
          >
            <span style={STYLE_TEXT_SECONDARY}>Total</span>
            <span>{formatValue(grandTotal, valuePrefix, valueUnit)}</span>
          </span>
        ) : null}
      </div>

      {!isEmpty ? (
        <div
          role="group"
          aria-label="Segment series legend"
          className={cx(legendClass, 'flex flex-wrap items-center gap-2 min-w-0')}
        >
          {legendItems.map((item) => {
            const isLegendActive = activeLegend?.key === item.key;
            const isLegendDimmed = activeLegend !== null && !isLegendActive;

            return (
              <button
                key={item.key}
                type="button"
                aria-pressed={isLegendActive}
                data-legend-key={item.key}
                data-tone={item.tone}
                onClick={() => handleToggleLegend(item.key)}
                className={cx(
                  'prism-crystal prism-focus-ring inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-opacity duration-150',
                  isLegendDimmed ? 'opacity-50' : 'opacity-100'
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
                  {`${formatNumeric(item.sharePct)}%`}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {isEmpty ? (
        <div
          role="status"
          data-testid="marimekko-empty"
          className="prism-well rounded-2xl px-4 py-8 text-center text-xs font-medium"
          style={STYLE_TEXT_SECONDARY}
        >
          No positive market share values to display.
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
              aria-label={`${title} proportional marimekko chart across ${computedColumns.length} columns`}
              viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
              className={cx(svgClass, 'w-full h-auto select-none block', 'prism-contain-box')}
            >
              {gridLines.map((line) => (
                <line
                  key={line.key}
                  x1={PLOT_X}
                  y1={line.y}
                  x2={PLOT_X + PLOT_WIDTH}
                  y2={line.y}
                  stroke="var(--prism-divider)"
                  strokeWidth={0.75}
                  strokeDasharray="3 3"
                  pointerEvents="none"
                />
              ))}

              {computedColumns.map((col) => {
                const headerChars = Math.max(3, Math.floor(col.width / 6.2));
                const showFooterTotal = col.width >= 34;

                return (
                  <g key={col.key} data-column-group={col.id}>
                    <text
                      x={col.centerX}
                      y={HEADER_LABEL_Y}
                      textAnchor="middle"
                      fill="var(--prism-text-primary)"
                      className="text-[10px] font-semibold"
                    >
                      {truncateLabel(col.label, headerChars)}
                    </text>
                    <text
                      x={col.centerX}
                      y={HEADER_SHARE_Y}
                      textAnchor="middle"
                      fill="var(--prism-text-secondary)"
                      className="text-[9px] font-mono tabular-nums"
                    >
                      {`${formatNumeric(col.sharePct)}%`}
                    </text>

                    {col.segments.map((seg) => {
                      const isSelected = selectedCell?.cellKey === seg.cellKey;
                      const isFocused = focusedCell?.cellKey === seg.cellKey;
                      const isLegendMatch = activeLegend !== null && activeLegend.key === seg.legendKey;
                      const isHighlighted =
                        inspectedCell !== null
                          ? inspectedCell.cellKey === seg.cellKey
                          : isLegendMatch;
                      const isDimmed = hasFilter && !isHighlighted;

                      const fillOpacity = hasFilter ? (isHighlighted ? 0.54 : 0.14) : 0.34;
                      const strokeColor =
                        isSelected || isFocused ? 'var(--prism-text-primary)' : seg.color;
                      const strokeWidth = isSelected || isFocused ? 2 : isHighlighted ? 1.75 : 1.1;
                      const strokeOpacity =
                        isSelected || isFocused || isHighlighted ? 1 : isDimmed ? 0.25 : 0.78;

                      const showTwoLines = seg.width >= 58 && seg.height >= 30;
                      const showSinglePct = !showTwoLines && seg.width >= 28 && seg.height >= 15;
                      const segLabelChars = Math.max(3, Math.floor((seg.width - 8) / 5.8));

                      return (
                        <g key={seg.cellKey}>
                          <rect
                            ref={(node) => registerRectRef(seg.cellKey, node)}
                            role="button"
                            tabIndex={0}
                            aria-pressed={isSelected}
                            aria-label={`${col.label}, ${seg.segmentLabel}: ${formatValue(seg.value, valuePrefix, valueUnit)}, ${formatNumeric(seg.columnSharePct)}% of column, ${formatNumeric(seg.totalSharePct)}% of total`}
                            data-column-id={col.id}
                            data-segment-id={seg.segmentId}
                            data-tone={seg.tone}
                            data-selected={isSelected ? 'true' : 'false'}
                            data-highlighted={isHighlighted ? 'true' : 'false'}
                            data-dimmed={isDimmed ? 'true' : 'false'}
                            x={seg.x}
                            y={seg.y}
                            width={seg.width}
                            height={seg.height}
                            rx={2}
                            fill={seg.color}
                            fillOpacity={fillOpacity}
                            stroke={strokeColor}
                            strokeWidth={strokeWidth}
                            strokeOpacity={strokeOpacity}
                            className="prism-focus-ring cursor-pointer transition-opacity duration-150"
                            onClick={() => handleSelectSegment(seg)}
                            onFocus={() => handleFocusSegment(seg.cellKey)}
                            onBlur={() => handleBlurSegment(seg.cellKey)}
                            onKeyDown={handleSegmentKeyDown(col.colIndex, seg.segIndex, seg)}
                          />

                          {showTwoLines ? (
                            <g pointerEvents="none" opacity={isDimmed ? 0.45 : 1}>
                              <text
                                x={seg.centerX}
                                y={seg.centerY - 2}
                                textAnchor="middle"
                                fill="var(--prism-text-primary)"
                                className="text-[9px] font-semibold"
                              >
                                {truncateLabel(seg.segmentLabel, segLabelChars)}
                              </text>
                              <text
                                x={seg.centerX}
                                y={seg.centerY + 9}
                                textAnchor="middle"
                                fill="var(--prism-text-primary)"
                                className="text-[9px] font-mono tabular-nums"
                              >
                                {`${formatNumeric(seg.columnSharePct)}%`}
                              </text>
                            </g>
                          ) : showSinglePct ? (
                            <text
                              x={seg.centerX}
                              y={seg.centerY + 3}
                              textAnchor="middle"
                              fill="var(--prism-text-primary)"
                              pointerEvents="none"
                              opacity={isDimmed ? 0.45 : 1}
                              className="text-[9px] font-mono font-medium tabular-nums"
                            >
                              {`${formatNumeric(seg.columnSharePct)}%`}
                            </text>
                          ) : null}
                        </g>
                      );
                    })}

                    {showFooterTotal ? (
                      <text
                        x={col.centerX}
                        y={FOOTER_TOTAL_Y}
                        textAnchor="middle"
                        fill="var(--prism-text-secondary)"
                        className="text-[9px] font-mono tabular-nums"
                      >
                        {formatValue(col.total, valuePrefix, valueUnit)}
                      </text>
                    ) : null}
                  </g>
                );
              })}
            </svg>
          </div>

          <div
            data-testid="marimekko-inspector"
            aria-live="polite"
            className={cx(
              inspectorClass,
              'prism-well rounded-xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 min-w-0 text-xs tabular-nums'
            )}
            style={STYLE_TEXT_PRIMARY}
          >
            {inspectedCell ? (
              <div className="inline-flex flex-wrap items-center gap-1.5 min-w-0">
                <span
                  aria-hidden="true"
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: inspectedCell.color }}
                />
                <span className="font-semibold">{inspectedCell.columnLabel}</span>
                <span aria-hidden="true" style={STYLE_TEXT_SECONDARY}>
                  ·
                </span>
                <span className="font-medium">{inspectedCell.segmentLabel}</span>
                <span aria-hidden="true" style={STYLE_TEXT_SECONDARY}>
                  ·
                </span>
                <span className="font-mono font-semibold">
                  {formatValue(inspectedCell.value, valuePrefix, valueUnit)}
                </span>
                <span aria-hidden="true" style={STYLE_TEXT_SECONDARY}>
                  ·
                </span>
                <span className="font-mono" style={STYLE_TEXT_SECONDARY}>
                  {`${formatNumeric(inspectedCell.columnSharePct)}% Column Share`}
                </span>
                <span aria-hidden="true" style={STYLE_TEXT_SECONDARY}>
                  ·
                </span>
                <span className="font-mono" style={STYLE_TEXT_SECONDARY}>
                  {`${formatNumeric(inspectedCell.totalSharePct)}% Global Share`}
                </span>
              </div>
            ) : activeLegend ? (
              <div className="inline-flex flex-wrap items-center gap-1.5 min-w-0">
                <span
                  aria-hidden="true"
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: activeLegend.color }}
                />
                <span className="font-semibold">All Columns</span>
                <span aria-hidden="true" style={STYLE_TEXT_SECONDARY}>
                  ·
                </span>
                <span className="font-medium">{activeLegend.label}</span>
                <span aria-hidden="true" style={STYLE_TEXT_SECONDARY}>
                  ·
                </span>
                <span className="font-mono font-semibold">
                  {formatValue(activeLegend.totalValue, valuePrefix, valueUnit)}
                </span>
                <span aria-hidden="true" style={STYLE_TEXT_SECONDARY}>
                  ·
                </span>
                <span className="font-mono" style={STYLE_TEXT_SECONDARY}>
                  {`${formatNumeric(activeLegend.sharePct)}% Global Share`}
                </span>
              </div>
            ) : (
              <>
                <span style={STYLE_TEXT_SECONDARY}>
                  Select or focus any segment to inspect column share and global share.
                </span>
                <span
                  className="font-mono font-medium shrink-0"
                  style={STYLE_TEXT_SECONDARY}
                >
                  {`Total: ${formatValue(grandTotal, valuePrefix, valueUnit)}`}
                </span>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export const MarimekkoChart = /*#__PURE__*/ memoWithDisplayName(MarimekkoChartInner, 'MarimekkoChart');
