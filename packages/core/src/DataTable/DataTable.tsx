'use client';

import { memo, useMemo } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { mergeProps } from '../utils/mergeProps';
import { formatLocaleNumber } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export type SortDirection = 'asc' | 'desc';

export interface DataTableRow {
  id: string;
  project: string;
  owner: string;
  department: string;
  status: string;
  completion: number;
  budgetUsd: number;
  updatedAt: string;
}

export interface DataTableProps extends BaseProps<HTMLDivElement> {
  /** Dataset rows rendered in compact 44px optical table rows. */
  rows: ReadonlyArray<DataTableRow>;
  /** Currently sorted column key. */
  sortBy: keyof DataTableRow;
  /** Active sort direction ('asc' | 'desc'). */
  sortDir: SortDirection;
  /** Invoked when a sortable column header is pressed. */
  onSortChange: (col: keyof DataTableRow) => void;
  /** IDs of currently selected rows. */
  selectedIds: ReadonlyArray<string>;
  /** Invoked when a row selection checkbox is toggled. */
  onToggleSelect: (id: string) => void;
  /** Message rendered inside tbody when rows is empty. */
  emptyMessage?: string;
}

interface DataTableRowViewProps {
  row: DataTableRow;
  checked: boolean;
  onToggleSelect: (id: string) => void;
}

const DataTableRowView = memo(function DataTableRowView({
  row,
  checked,
  onToggleSelect,
}: DataTableRowViewProps) {
  return (
    <tr
      className={`h-11 prism-cv-row transition-colors ${
        checked ? 'bg-emerald-500/10' : 'hover:bg-white/45 dark:hover:bg-white/[0.04]'
      }`}
    >
      <td className="px-3.5">
        <input
          type="checkbox"
          checked={checked}
          aria-label={`Select ${row.project}`}
          onChange={() => onToggleSelect(row.id)}
          className="prism-focus-ring w-4 h-4 accent-emerald-600 rounded cursor-pointer"
        />
      </td>
      <td className="px-3.5 font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap">
        {row.id}
      </td>
      <td className="px-3.5 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
        {row.project}
      </td>
      <td className="px-3.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">
        {row.owner}
      </td>
      <td className="px-3.5 text-xs font-medium whitespace-nowrap">
        <span
          className={
            row.status === 'Active'
              ? 'text-emerald-700 dark:text-emerald-400'
              : row.status === 'Review'
                ? 'text-amber-700 dark:text-amber-400'
                : 'text-slate-500 dark:text-slate-400'
          }
        >
          {row.status}
        </span>
      </td>
      <td className="px-3.5 text-right font-mono text-xs tabular-nums text-slate-700 dark:text-slate-200">
        {row.completion}%
      </td>
      <td className="px-3.5 text-right font-mono text-xs tabular-nums text-slate-800 dark:text-slate-100">
        ${formatLocaleNumber(row.budgetUsd)}
      </td>
    </tr>
  );
});

function DataTableInner({
  rows,
  sortBy,
  sortDir,
  onSortChange,
  selectedIds,
  onToggleSelect,
  emptyMessage = 'No records to display.',
  className,
  style,
  xstyle,
  ref,
  ...rest
}: DataTableProps) {
  const override = useComponentOverride('DataTable');

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const merged = mergeProps({
    themeTarget: themeProps('data-table', {
      sortBy,
      sortDir,
      empty: rows.length === 0,
    }),
    baseClassName: 'prism-slab overflow-hidden',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const renderHeader = (col: keyof DataTableRow, label: string, alignRight = false) => {
    const active = sortBy === col;
    return (
      <th
        scope="col"
        aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
        className={`px-3.5 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 ${
          alignRight ? 'text-right' : 'text-left'
        }`}
      >
        <button
          type="button"
          onClick={() => onSortChange(col)}
          className={`prism-focus-ring rounded inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white cursor-pointer ${
            alignRight ? 'ml-auto' : ''
          }`}
        >
          <span>{label}</span>
          {active ? (
            sortDir === 'asc' ? (
              <ArrowUp aria-hidden="true" className="w-3 h-3 text-orange-500" />
            ) : (
              <ArrowDown aria-hidden="true" className="w-3 h-3 text-orange-500" />
            )
          ) : null}
        </button>
      </th>
    );
  };

  return (
    <div ref={ref} {...rest} {...merged}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="border-b border-slate-300/50 dark:border-slate-700/60 bg-white/30 dark:bg-white/[0.03]">
            <tr>
              <th scope="col" className="w-10 px-3.5 py-2.5 text-left">
                <span className="sr-only">Select row</span>
              </th>
              {renderHeader('id', 'ID')}
              {renderHeader('project', 'Component Track')}
              {renderHeader('owner', 'Lead')}
              {renderHeader('status', 'State')}
              {renderHeader('completion', 'Progress', true)}
              {renderHeader('budgetUsd', 'Allocation', true)}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/50 dark:divide-slate-700/40">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-xs text-slate-500 dark:text-slate-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <DataTableRowView
                  key={row.id}
                  row={row}
                  checked={selectedSet.has(row.id)}
                  onToggleSelect={onToggleSelect}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export const DataTable = /*#__PURE__*/ memoWithDisplayName(DataTableInner, 'DataTable');
