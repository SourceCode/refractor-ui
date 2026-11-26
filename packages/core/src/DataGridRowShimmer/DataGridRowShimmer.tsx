'use client';

import { useMemo, type CSSProperties, type ReactNode } from 'react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { memoWithDisplayName } from '../utils/memo';
import { mergeProps } from '../utils/mergeProps';
import { STYLE_BORDER_DIVIDER, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';
import { clampFinite } from '../utils/webglShader';

export interface DataGridRowShimmerProps extends BaseProps<HTMLDivElement> {
  /** Shows staggered optical row skeletons when true, or cross-fades to children when false. */
  loading?: boolean;
  /** Number of skeleton table rows to display (clamped 1–20). */
  rows?: number;
  /** Optional column header labels (defaults to 4 enterprise columns when omitted). */
  columns?: ReadonlyArray<string>;
  /** Milliseconds stagger delay between consecutive row waves (clamped 0–240). */
  staggerMs?: number;
  /** Enables animated prismatic shimmer sweep across skeleton cells. */
  animated?: boolean;
  /** Accessible loading caption announced while fetching table rows. */
  label?: string;
  /** Real table or data-grid content rendered once `loading` is false. */
  children?: ReactNode;
}

const GRID_WRAP_CLASS = /*#__PURE__*/ stableClassName('data-grid-row-shimmer', 'scroll-wrap');
const GRID_CELL_CLASS = /*#__PURE__*/ stableClassName('data-grid-row-shimmer', 'cell-bar');

const DEFAULT_COLUMNS: ReadonlyArray<string> = /*#__PURE__*/ Object.freeze([
  'Artifact',
  'Status',
  'Latency',
  'Updated',
]);

const CELL_WIDTHS: ReadonlyArray<string> = /*#__PURE__*/ Object.freeze([
  'w-4/5',
  'w-3/5',
  'w-1/2',
  'w-2/3',
  'w-3/4',
]);

function DataGridRowShimmerInner({
  loading = true,
  rows = 5,
  columns = DEFAULT_COLUMNS,
  staggerMs = 90,
  animated = true,
  label = 'Loading table rows',
  children,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: DataGridRowShimmerProps) {
  const override = useComponentOverride('DataGridRowShimmer');
  const safeRows = Math.round(clampFinite(rows, 1, 20, 5));
  const safeStagger = Math.round(clampFinite(staggerMs, 0, 240, 90));
  const resolvedColumns = columns.length > 0 ? columns : DEFAULT_COLUMNS;
  const columnDefs = useMemo(
    () =>
      resolvedColumns.map((col, colPos) => ({
        key: `col-${colPos}-${col}`,
        label: col,
        colPos,
      })),
    [resolvedColumns]
  );
  const rowDefs = useMemo(
    () =>
      Array.from({ length: safeRows }, (_, rowPos) => ({
        key: `shimmer-row-${rowPos}`,
        rowPos,
      })),
    [safeRows]
  );
  const showSkeleton =
    loading || children === undefined || children === null || children === false;

  const merged = mergeProps({
    themeTarget: themeProps('data-grid-row-shimmer', {
      loading: showSkeleton,
      animated,
    }),
    baseClassName:
      'prism-slab prism-contain-leaf rounded-2xl overflow-hidden min-w-0 max-w-full',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  if (!showSkeleton) {
    return (
      <div
        ref={ref}
        data-testid="data-grid-row-shimmer-loaded"
        {...rest}
        {...merged}
      >
        <div className="transition-opacity duration-300 opacity-100 min-w-0">{children}</div>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      role="status"
      aria-busy="true"
      aria-label={label}
      {...rest}
      {...merged}
    >
      <div className={`${GRID_WRAP_CLASS} w-full overflow-x-auto`}>
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b" style={STYLE_BORDER_DIVIDER}>
              {columnDefs.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className="px-4 py-3 font-semibold whitespace-nowrap"
                  style={STYLE_TEXT_SECONDARY}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowDefs.map((row) => {
              const delayStyle: CSSProperties = {
                animationDelay: `${row.rowPos * safeStagger}ms`,
                '--prism-fx-duration': '1.9s',
              } as CSSProperties;
              return (
                <tr
                  key={row.key}
                  data-testid="data-grid-row-shimmer-row"
                  className="border-b last:border-b-0"
                  style={STYLE_BORDER_DIVIDER}
                >
                  {columnDefs.map((col) => {
                    const widthClass =
                      CELL_WIDTHS[(row.rowPos + col.colPos) % CELL_WIDTHS.length] ?? 'w-3/4';
                    return (
                      <td key={`${row.key}-${col.key}`} className="px-4 py-3">
                        <div
                          aria-hidden="true"
                          className={`${GRID_CELL_CLASS} prism-well relative h-3 rounded-full overflow-hidden ${widthClass}`}
                        >
                          {animated ? (
                            <div
                              data-testid="data-grid-row-shimmer-wave"
                              className="prism-fx-shimmer-wave pointer-events-none absolute inset-y-0 left-0 w-2/3"
                              style={delayStyle}
                            />
                          ) : null}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export const DataGridRowShimmer = /*#__PURE__*/ memoWithDisplayName(
  DataGridRowShimmerInner,
  'DataGridRowShimmer'
);
