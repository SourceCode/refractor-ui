'use client';

import {
  useCallback,
  useId,
  useMemo,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { STYLE_TEXT_DISABLED, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export interface HeatmapCell {
  /** Zero-based row index aligned with `rowLabels`. */
  row: number;
  /** Zero-based column index aligned with `colLabels`. */
  col: number;
  /** Finite numeric intensity value plotted for this matrix coordinate. */
  value: number;
}

export type MatrixHeatmapTone = 'primary' | 'secondary' | 'emerald' | 'rose';

export interface MatrixHeatmapProps extends BaseProps<HTMLDivElement> {
  /** Ordered row axis labels rendered down the matrix body. */
  rowLabels: string[];
  /** Ordered column axis labels rendered across the matrix header. */
  colLabels: string[];
  /** Matrix intensity cells keyed by zero-based `{ row, col }` coordinates. */
  cells: HeatmapCell[];
  /** Semantic optical tone ramp applied to cell shading and legend swatches (defaults to 'primary'). */
  tone?: MatrixHeatmapTone;
  /** Card heading rendered in the optical slab header (defaults to 'Matrix Heatmap'). */
  title?: string;
  /** Optional unit suffix appended to cell values and selection readouts (e.g. '%', 'ms'). */
  valueUnit?: string;
  /** Whether to render numeric cell labels inside each matrix cell (defaults to true). */
  showValues?: boolean;
  /** Callback fired when a user clicks, focuses, or keyboard-activates a populated cell. */
  onSelectCell?: (cell: HeatmapCell, rowLabel: string, colLabel: string) => void;
}

interface ToneTokenPair {
  main: string;
  contrast: string;
}

interface AxisLabelEntry {
  index: number;
  label: string;
  key: string;
}

interface SelectedCoord {
  row: number;
  col: number;
}

const TONE_TOKEN_MAP: Record<MatrixHeatmapTone, ToneTokenPair> = {
  primary: {
    main: 'var(--prism-primary-main)',
    contrast: 'var(--prism-primary-contrast)',
  },
  secondary: {
    main: 'var(--prism-secondary-main)',
    contrast: 'var(--prism-secondary-contrast)',
  },
  emerald: {
    main: 'var(--prism-success-main)',
    contrast: 'var(--prism-success-contrast)',
  },
  rose: {
    main: 'var(--prism-error-main)',
    contrast: 'var(--prism-error-contrast)',
  },
};

const LEGEND_STEPS: ReadonlyArray<{ id: string; opacity: number }> = [
  { id: 'step-1', opacity: 0.1 },
  { id: 'step-2', opacity: 0.3 },
  { id: 'step-3', opacity: 0.5 },
  { id: 'step-4', opacity: 0.7 },
  { id: 'step-5', opacity: 0.9 },
];

function normalizeZero(value: number): number {
  return value === 0 ? 0 : value;
}

function formatNumeric(value: number): string {
  const safe = normalizeZero(value);
  if (Number.isInteger(safe)) {
    return String(safe);
  }
  return String(Number(safe.toFixed(2)));
}

function formatMetric(value: number, unit?: string): string {
  const num = formatNumeric(value);
  return unit ? `${num}${unit}` : num;
}

function computeCellOpacity(value: number, minVal: number, maxVal: number): number {
  const span = maxVal - minVal;
  if (span <= 0) {
    return 0.5;
  }
  const ratio = clampNumber((value - minVal) / span, 0, 1, 0);
  return Number((0.1 + ratio * 0.8).toFixed(2));
}

const headerClass = /*#__PURE__*/ stableClassName('matrix-heatmap', 'header');
const legendClass = /*#__PURE__*/ stableClassName('matrix-heatmap', 'legend');
const tableClass = /*#__PURE__*/ stableClassName('matrix-heatmap', 'table');
const readoutClass = /*#__PURE__*/ stableClassName('matrix-heatmap', 'readout');

function MatrixHeatmapInner({
  rowLabels,
  colLabels,
  cells,
  tone = 'primary',
  title = 'Matrix Heatmap',
  valueUnit,
  showValues = true,
  onSelectCell,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: MatrixHeatmapProps) {
  const headingId = useId();
  const override = useComponentOverride('MatrixHeatmap');
  const [selectedCoord, setSelectedCoord] = useState<SelectedCoord | null>(null);

  const isEmpty = rowLabels.length === 0 || colLabels.length === 0;
  const toneTokens = TONE_TOKEN_MAP[tone];

  const rowEntries = useMemo<AxisLabelEntry[]>(
    () => rowLabels.map((label, index) => ({ index, label, key: `hm-row-${label}-${index}` })),
    [rowLabels]
  );

  const colEntries = useMemo<AxisLabelEntry[]>(
    () => colLabels.map((label, index) => ({ index, label, key: `hm-col-${label}-${index}` })),
    [colLabels]
  );

  const { cellMap, minVal, maxVal, hasValues } = useMemo(() => {
    const map = new Map<string, number>();
    const rowCount = rowLabels.length;
    const colCount = colLabels.length;

    for (const cell of cells) {
      if (
        !Number.isInteger(cell.row) ||
        !Number.isInteger(cell.col) ||
        cell.row < 0 ||
        cell.row >= rowCount ||
        cell.col < 0 ||
        cell.col >= colCount ||
        !Number.isFinite(cell.value)
      ) {
        continue;
      }
      map.set(`${cell.row}:${cell.col}`, normalizeZero(cell.value));
    }

    if (map.size === 0) {
      return {
        cellMap: map,
        minVal: 0,
        maxVal: 0,
        hasValues: false,
      };
    }

    let lo = Number.POSITIVE_INFINITY;
    let hi = Number.NEGATIVE_INFINITY;
    for (const val of map.values()) {
      if (val < lo) lo = val;
      if (val > hi) hi = val;
    }

    return {
      cellMap: map,
      minVal: lo,
      maxVal: hi,
      hasValues: true,
    };
  }, [cells, rowLabels.length, colLabels.length]);

  const activeSelection = useMemo(() => {
    if (!selectedCoord) return null;
    const rowLabel = rowLabels[selectedCoord.row];
    const colLabel = colLabels[selectedCoord.col];
    if (rowLabel === undefined || colLabel === undefined) return null;
    const value = cellMap.get(`${selectedCoord.row}:${selectedCoord.col}`);
    if (value === undefined) return null;
    return {
      row: selectedCoord.row,
      col: selectedCoord.col,
      rowLabel,
      colLabel,
      value,
      opacity: computeCellOpacity(value, minVal, maxVal),
    };
  }, [cellMap, colLabels, maxVal, minVal, rowLabels, selectedCoord]);

  const handleSelectCell = useCallback(
    (row: number, col: number, value: number) => {
      const rowLabel = rowLabels[row]!;
      const colLabel = colLabels[col]!;
      setSelectedCoord({ row, col });
      onSelectCell?.({ row, col, value }, rowLabel, colLabel);
    },
    [colLabels, onSelectCell, rowLabels]
  );

  const handleCellKeyDown = useCallback(
    (row: number, col: number, value: number) =>
      (event: ReactKeyboardEvent<HTMLButtonElement>) => {
        if (event.nativeEvent.isComposing) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleSelectCell(row, col, value);
        }
      },
    [handleSelectCell]
  );

  const merged = mergeProps({
    themeTarget: themeProps('matrix-heatmap', {
      tone,
      empty: isEmpty,
    }),
    baseClassName: 'prism-slab p-5 space-y-4',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });


  return (
    <div ref={ref} role="region" aria-labelledby={headingId} {...rest} {...merged}>
      <div className={cx(headerClass, 'flex flex-wrap items-center justify-between gap-3')}>
        <h4
          id={headingId}
          className="text-sm font-semibold tracking-tight"
          style={STYLE_TEXT_PRIMARY}
        >
          {title}
        </h4>

        <div
          data-testid="matrix-heatmap-legend"
          aria-label="Intensity scale from low to high"
          className={cx(
            legendClass,
            'prism-crystal px-3 py-1 rounded-full inline-flex items-center gap-1.5 text-[11px] font-medium'
          )}
          style={STYLE_TEXT_SECONDARY}
        >
          <span>Low</span>
          <span className="inline-flex items-center gap-1" aria-hidden="true">
            {LEGEND_STEPS.map((step) => (
              <span
                key={step.id}
                data-role="heatmap-legend-step"
                data-opacity={String(step.opacity)}
                className="prism-well relative overflow-hidden w-3.5 h-3.5 rounded-[4px] inline-block"
              >
                <span
                  className="absolute inset-0"
                  style={{
                    backgroundColor: toneTokens.main,
                    opacity: step.opacity,
                  }}
                />
              </span>
            ))}
          </span>
          <span>High</span>
        </div>
      </div>

      {isEmpty ? (
        <div
          role="status"
          data-testid="matrix-heatmap-empty"
          className="prism-well rounded-2xl px-4 py-8 text-center text-xs font-medium"
          style={STYLE_TEXT_SECONDARY}
        >
          No matrix data to display.
        </div>
      ) : (
        <>
          <div className="w-full overflow-x-auto">
            <table
              aria-labelledby={headingId}
              className={cx(tableClass, 'w-full border-separate border-spacing-1.5 text-xs')}
            >
              <thead>
                <tr>
                  <th scope="col" className="px-2 py-1.5 text-left">
                    <span className="sr-only">Row</span>
                  </th>
                  {colEntries.map((colEntry) => (
                    <th
                      key={colEntry.key}
                      scope="col"
                      className="px-2 py-1.5 text-center text-[11px] font-semibold whitespace-nowrap"
                      style={STYLE_TEXT_SECONDARY}
                    >
                      {colEntry.label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {rowEntries.map((rowEntry) => (
                  <tr key={rowEntry.key}>
                    <th
                      scope="row"
                      className="px-2 py-1.5 text-left text-[11px] font-semibold whitespace-nowrap"
                      style={STYLE_TEXT_PRIMARY}
                    >
                      {rowEntry.label}
                    </th>

                    {colEntries.map((colEntry) => {
                      const coordKey = `${rowEntry.index}:${colEntry.index}`;
                      const cellValue = cellMap.get(coordKey);

                      if (cellValue === undefined) {
                        return (
                          <td key={`${rowEntry.key}-${colEntry.key}`} className="p-0 align-middle">
                            <div
                              data-row={String(rowEntry.index)}
                              data-col={String(colEntry.index)}
                              data-empty-cell="true"
                              aria-label={`${rowEntry.label} × ${colEntry.label}: no data`}
                              className="prism-well w-full min-w-[46px] h-10 rounded-lg inline-flex items-center justify-center font-mono text-[11px]"
                              style={STYLE_TEXT_DISABLED}
                            >
                              {showValues ? '—' : null}
                            </div>
                          </td>
                        );
                      }

                      const cellOpacity = computeCellOpacity(cellValue, minVal, maxVal);
                      const isSelected =
                        activeSelection !== null &&
                        activeSelection.row === rowEntry.index &&
                        activeSelection.col === colEntry.index;
                      const formattedVal = formatMetric(cellValue, valueUnit);
                      const textColor =
                        cellOpacity >= 0.6 ? toneTokens.contrast : 'var(--prism-text-primary)';

                      return (
                        <td key={`${rowEntry.key}-${colEntry.key}`} className="p-0 align-middle">
                          <button
                            type="button"
                            aria-pressed={isSelected}
                            aria-label={`${rowEntry.label} × ${colEntry.label}: ${formattedVal}`}
                            data-row={String(rowEntry.index)}
                            data-col={String(colEntry.index)}
                            data-value={String(cellValue)}
                            data-opacity={String(cellOpacity)}
                            data-selected={isSelected ? 'true' : 'false'}
                            onClick={() => handleSelectCell(rowEntry.index, colEntry.index, cellValue)}
                            onFocus={() => handleSelectCell(rowEntry.index, colEntry.index, cellValue)}
                            onKeyDown={handleCellKeyDown(rowEntry.index, colEntry.index, cellValue)}
                            className={cx(
                              'prism-focus-ring prism-well relative overflow-hidden w-full min-w-[46px] h-10 px-2 rounded-lg inline-flex items-center justify-center font-mono text-[11px] font-medium tabular-nums cursor-pointer border transition-transform duration-150',
                              isSelected ? 'scale-[1.03]' : 'hover:scale-[1.02]'
                            )}
                            style={{
                              borderColor: isSelected
                                ? 'var(--prism-text-primary)'
                                : 'var(--prism-divider)',
                              color: textColor,
                            }}
                          >
                            <span
                              aria-hidden="true"
                              data-role="heatmap-cell-tint"
                              className="absolute inset-0 pointer-events-none"
                              style={{
                                backgroundColor: toneTokens.main,
                                opacity: cellOpacity,
                              }}
                            />
                            {showValues ? (
                              <span className="relative z-10">{formattedVal}</span>
                            ) : null}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div
            data-testid="matrix-heatmap-readout"
            aria-live="polite"
            className={cx(
              readoutClass,
              'prism-well rounded-xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs tabular-nums'
            )}
            style={STYLE_TEXT_PRIMARY}
          >
            {activeSelection ? (
              <span className="inline-flex items-center gap-2 font-medium">
                <span
                  aria-hidden="true"
                  className="prism-well relative overflow-hidden w-3 h-3 rounded-[4px] shrink-0"
                >
                  <span
                    className="absolute inset-0"
                    style={{
                      backgroundColor: toneTokens.main,
                      opacity: activeSelection.opacity,
                    }}
                  />
                </span>
                <span className="font-mono">
                  {`${activeSelection.rowLabel} × ${activeSelection.colLabel}: ${formatMetric(activeSelection.value, valueUnit)}`}
                </span>
              </span>
            ) : (
              <span style={STYLE_TEXT_SECONDARY}>
                Select or focus any cell to inspect exact matrix values.
              </span>
            )}

            {hasValues ? (
              <span
                data-testid="matrix-heatmap-range"
                className="font-mono text-[11px]"
                style={STYLE_TEXT_SECONDARY}
              >
                {`Range: ${formatMetric(minVal, valueUnit)} – ${formatMetric(maxVal, valueUnit)}`}
              </span>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

export const MatrixHeatmap = /*#__PURE__*/ memoWithDisplayName(MatrixHeatmapInner, 'MatrixHeatmap');
