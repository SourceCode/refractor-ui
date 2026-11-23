'use client';

import {
  useCallback,
  useId,
  useMemo,
  useState,
  type DragEvent,
} from 'react';
import { GripVertical, Sigma, Table2 } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { isSafeObjectKey } from '../utils/sanitize';
import { formatUsNumber } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export type PivotScalar = string | number | boolean;
export type PivotRecord = Record<string, PivotScalar>;
export type PivotAggregation = 'sum' | 'avg' | 'count' | 'min' | 'max';

export interface PivotField {
  key: string;
  label: string;
  numeric?: boolean;
}

export interface PivotConfig {
  rowField: string;
  columnField: string;
  valueField: string;
  aggregation: PivotAggregation;
}

type PivotZone = 'rows' | 'columns' | 'values';
type PivotTableBaseProps = Omit<BaseProps<HTMLDivElement>, 'children'>;

export interface PivotTableProps extends PivotTableBaseProps {
  /** Dataset records used to build the cross-tabulation matrix. */
  data: ReadonlyArray<PivotRecord>;
  /** Available field descriptors that can be assigned to Rows, Columns, or Values. */
  fields: ReadonlyArray<PivotField>;
  /** Initial row dimension field key. */
  defaultRowField?: string;
  /** Initial column dimension field key. */
  defaultColumnField?: string;
  /** Initial aggregated metric field key. */
  defaultValueField?: string;
  /** Initial aggregation function ('sum' | 'avg' | 'count' | 'min' | 'max'). */
  defaultAggregation?: PivotAggregation;
  /** Invoked whenever row, column, value field, or aggregation changes. */
  onConfigChange?: (config: PivotConfig) => void;
  /** Message displayed when data or fields are empty. */
  emptyMessage?: string;
}

const AGGREGATION_OPTIONS: ReadonlyArray<{ mode: PivotAggregation; label: string }> = [
  { mode: 'sum', label: 'Sum' },
  { mode: 'avg', label: 'Avg' },
  { mode: 'count', label: 'Count' },
  { mode: 'min', label: 'Min' },
  { mode: 'max', label: 'Max' },
];

function resolveFieldKey(
  fields: ReadonlyArray<PivotField>,
  preferred: string | undefined,
  predicate: (field: PivotField) => boolean,
  fallbackIndex: number
): string {
  if (preferred && fields.some((f) => f.key === preferred)) {
    return preferred;
  }
  const matched = fields.find(predicate);
  if (matched) return matched.key;
  return fields[fallbackIndex]?.key ?? fields[0]?.key ?? '';
}

function readPivotValue(record: PivotRecord, fieldKey: string): PivotScalar | undefined {
  if (!fieldKey || !isSafeObjectKey(fieldKey)) return undefined;
  if (!Object.prototype.hasOwnProperty.call(record, fieldKey)) return undefined;
  return record[fieldKey];
}

function toFiniteNumber(value: PivotScalar | undefined): number | null {
  if (value === undefined || typeof value === 'boolean') return null;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function computeAggregate(
  values: ReadonlyArray<PivotScalar | undefined>,
  aggregation: PivotAggregation
): number | null {
  if (values.length === 0) return null;
  if (aggregation === 'count') {
    return values.length;
  }

  let sum = 0;
  let count = 0;
  let min = Infinity;
  let max = -Infinity;

  for (const raw of values) {
    const num = toFiniteNumber(raw);
    if (num === null) continue;
    sum += num;
    count += 1;
    if (num < min) min = num;
    if (num > max) max = num;
  }

  if (count === 0) return null;
  if (aggregation === 'sum') return sum;
  if (aggregation === 'avg') return sum / count;
  if (aggregation === 'min') return min;
  return max;
}

function formatPivotMetric(value: number | null, aggregation: PivotAggregation): string {
  if (value === null || !Number.isFinite(value)) return '—';
  if (aggregation === 'count') {
    return formatUsNumber(Math.round(value));
  }
  if (Number.isInteger(value)) {
    return formatUsNumber(value);
  }
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

const controlsClass = /*#__PURE__*/ stableClassName('pivot-table', 'controls');
const tableClass = /*#__PURE__*/ stableClassName('pivot-table', 'table');

function PivotTableInner({
  data,
  fields,
  defaultRowField,
  defaultColumnField,
  defaultValueField,
  defaultAggregation = 'sum',
  onConfigChange,
  emptyMessage = 'No data available for pivot analysis.',
  className,
  style,
  xstyle,
  ref,
  ...rest
}: PivotTableProps) {
  const override = useComponentOverride('PivotTable');
  const rowSelectId = useId();
  const colSelectId = useId();
  const valSelectId = useId();

  const initialRow = resolveFieldKey(fields, defaultRowField, (f) => !f.numeric, 0);
  const initialCol = resolveFieldKey(
    fields,
    defaultColumnField,
    (f) => !f.numeric && f.key !== initialRow,
    1
  );
  const initialVal = resolveFieldKey(
    fields,
    defaultValueField,
    (f) => Boolean(f.numeric),
    Math.max(0, fields.length - 1)
  );

  const [rowField, setRowField] = useState<string>(initialRow);
  const [columnField, setColumnField] = useState<string>(initialCol);
  const [valueField, setValueField] = useState<string>(initialVal);
  const [aggregation, setAggregation] = useState<PivotAggregation>(defaultAggregation);
  const [draggedFieldKey, setDraggedFieldKey] = useState<string | null>(null);
  const [dragOverZone, setDragOverZone] = useState<PivotZone | null>(null);

  const fieldMap = useMemo(() => {
    const map = new Map<string, PivotField>();
    for (const field of fields) {
      map.set(field.key, field);
    }
    return map;
  }, [fields]);

  const activeRowField = fieldMap.has(rowField) ? rowField : initialRow;
  const activeColumnField = fieldMap.has(columnField) ? columnField : initialCol;
  const activeValueField = fieldMap.has(valueField) ? valueField : initialVal;

  const updateConfig = useCallback(
    (partial: Partial<PivotConfig>) => {
      const next: PivotConfig = {
        rowField: partial.rowField ?? activeRowField,
        columnField: partial.columnField ?? activeColumnField,
        valueField: partial.valueField ?? activeValueField,
        aggregation: partial.aggregation ?? aggregation,
      };
      if (partial.rowField !== undefined) setRowField(partial.rowField);
      if (partial.columnField !== undefined) setColumnField(partial.columnField);
      if (partial.valueField !== undefined) setValueField(partial.valueField);
      if (partial.aggregation !== undefined) setAggregation(partial.aggregation);
      onConfigChange?.(next);
    },
    [activeColumnField, activeRowField, activeValueField, aggregation, onConfigChange]
  );

  const handleFieldDragStart = useCallback(
    (fieldKey: string, event: DragEvent<HTMLDivElement>) => {
      setDraggedFieldKey(fieldKey);
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'copyMove';
        event.dataTransfer.setData('text/plain', fieldKey);
      }
    },
    []
  );

  const handleZoneDragOver = useCallback(
    (zone: PivotZone, event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (dragOverZone !== zone) {
        setDragOverZone(zone);
      }
    },
    [dragOverZone]
  );

  const handleZoneDrop = useCallback(
    (zone: PivotZone, event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const key =
        draggedFieldKey ?? (event.dataTransfer ? event.dataTransfer.getData('text/plain') : '');
      setDraggedFieldKey(null);
      setDragOverZone(null);

      if (!key || !fieldMap.has(key)) return;
      if (zone === 'rows') {
        updateConfig({ rowField: key });
      } else if (zone === 'columns') {
        updateConfig({ columnField: key });
      } else {
        updateConfig({ valueField: key });
      }
    },
    [draggedFieldKey, fieldMap, updateConfig]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedFieldKey(null);
    setDragOverZone(null);
  }, []);

  const matrix = useMemo(() => {
    const rowKeySet = new Set<string>();
    const colKeySet = new Set<string>();
    const cellBuckets = new Map<string, Map<string, Array<PivotScalar | undefined>>>();
    const rowBuckets = new Map<string, Array<PivotScalar | undefined>>();
    const colBuckets = new Map<string, Array<PivotScalar | undefined>>();
    const allValues: Array<PivotScalar | undefined> = [];

    if (
      data.length === 0 ||
      fields.length === 0 ||
      !activeRowField ||
      !activeColumnField ||
      !activeValueField
    ) {
      return {
        rowKeys: [] as string[],
        colKeys: [] as string[],
        cellBuckets,
        rowBuckets,
        colBuckets,
        allValues,
      };
    }

    for (const record of data) {
      const rawRow = readPivotValue(record, activeRowField);
      const rawCol = readPivotValue(record, activeColumnField);
      const rawVal = readPivotValue(record, activeValueField);

      const rKey = rawRow === undefined ? '(Empty)' : String(rawRow);
      const cKey = rawCol === undefined ? '(Empty)' : String(rawCol);

      rowKeySet.add(rKey);
      colKeySet.add(cKey);

      let rowMap = cellBuckets.get(rKey);
      if (!rowMap) {
        rowMap = new Map<string, Array<PivotScalar | undefined>>();
        cellBuckets.set(rKey, rowMap);
      }

      const cellList = rowMap.get(cKey);
      if (cellList) {
        cellList.push(rawVal);
      } else {
        rowMap.set(cKey, [rawVal]);
      }

      const rList = rowBuckets.get(rKey);
      if (rList) {
        rList.push(rawVal);
      } else {
        rowBuckets.set(rKey, [rawVal]);
      }

      const cList = colBuckets.get(cKey);
      if (cList) {
        cList.push(rawVal);
      } else {
        colBuckets.set(cKey, [rawVal]);
      }

      allValues.push(rawVal);
    }

    return {
      rowKeys: Array.from(rowKeySet),
      colKeys: Array.from(colKeySet),
      cellBuckets,
      rowBuckets,
      colBuckets,
      allValues,
    };
  }, [data, fields.length, activeRowField, activeColumnField, activeValueField]);

  const isEmpty = matrix.rowKeys.length === 0 || matrix.colKeys.length === 0;
  const rowFieldLabel = fieldMap.get(activeRowField)?.label ?? 'Rows';
  const colFieldLabel = fieldMap.get(activeColumnField)?.label ?? 'Columns';
  const valFieldLabel = fieldMap.get(activeValueField)?.label ?? 'Value';

  const merged = mergeProps({
    themeTarget: themeProps('pivot-table', {
      aggregation,
      empty: isEmpty,
    }),
    baseClassName: 'prism-slab overflow-hidden flex flex-col',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });


  const renderZone = (
    zone: PivotZone,
    title: string,
    selectId: string,
    ariaLabel: string,
    selectedKey: string,
    onSelectKey: (nextKey: string) => void
  ) => {
    const isOver = dragOverZone === zone;
    const selectedLabel = fieldMap.get(selectedKey)?.label ?? 'Unassigned';

    return (
      <div
        data-drop-zone={zone}
        data-drag-over={isOver ? 'true' : undefined}
        onDragOver={(e) => handleZoneDragOver(zone, e)}
        onDragLeave={() => setDragOverZone((prev) => (prev === zone ? null : prev))}
        onDrop={(e) => handleZoneDrop(zone, e)}
        className={cx(
          'prism-well rounded-2xl p-2.5 flex flex-col gap-1.5 transition-shadow',
          isOver && 'ring-2 ring-[var(--prism-secondary-main)]'
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <label
            htmlFor={selectId}
            className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
          >
            {title}
          </label>
          <span className="prism-crystal px-2 py-0.5 rounded-full text-[11px] font-medium text-slate-700 dark:text-slate-200 truncate max-w-[140px]">
            {selectedLabel}
          </span>
        </div>
        <select
          id={selectId}
          aria-label={ariaLabel}
          disabled={fields.length === 0}
          value={selectedKey}
          onChange={(e) => onSelectKey(e.target.value)}
          className="prism-crystal prism-focus-ring h-8 px-2.5 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {fields.length === 0 ? (
            <option value="">No fields</option>
          ) : (
            fields.map((field) => (
              <option key={field.key} value={field.key}>
                {field.label}
              </option>
            ))
          )}
        </select>
      </div>
    );
  };

  return (
    <div ref={ref} {...rest} {...merged}>
      <div
        className={cx(
          controlsClass,
          'p-4 border-b border-[var(--prism-divider)] bg-white/35 dark:bg-white/[0.03] flex flex-col gap-3'
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <Table2 aria-hidden="true" className="w-3.5 h-3.5 text-[var(--prism-secondary-dark)]" />
              <span>Fields</span>
            </span>
            {fields.length === 0 ? (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                No fields configured
              </span>
            ) : (
              fields.map((field) => (
                <div
                  key={field.key}
                  draggable
                  data-field-chip={field.key}
                  onDragStart={(e) => handleFieldDragStart(field.key, e)}
                  onDragEnd={handleDragEnd}
                  className="prism-crystal px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 text-xs font-medium text-slate-800 dark:text-slate-100 cursor-grab select-none"
                >
                  <GripVertical aria-hidden="true" className="w-3 h-3 text-slate-400" />
                  <span>{field.label}</span>
                  {field.numeric ? (
                    <span
                      aria-hidden="true"
                      className="text-[10px] font-mono text-[var(--prism-primary-main)]"
                    >
                      #
                    </span>
                  ) : null}
                </div>
              ))
            )}
          </div>

          <div
            role="group"
            aria-label="Aggregation mode"
            className="prism-well p-1 rounded-full inline-flex items-center gap-1"
          >
            <Sigma
              aria-hidden="true"
              className="w-3.5 h-3.5 ml-1.5 text-slate-500 dark:text-slate-400"
            />
            {AGGREGATION_OPTIONS.map((opt) => {
              const active = aggregation === opt.mode;
              return (
                <button
                  key={opt.mode}
                  type="button"
                  aria-pressed={active}
                  data-aggregation-option={opt.mode}
                  onClick={() => updateConfig({ aggregation: opt.mode })}
                  className={cx(
                    'prism-focus-ring px-2.5 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer',
                    active
                      ? 'prism-crystal text-[var(--prism-primary-main)]'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {renderZone('rows', 'Rows', rowSelectId, 'Row field', activeRowField, (nextKey) =>
            updateConfig({ rowField: nextKey })
          )}
          {renderZone('columns', 'Columns', colSelectId, 'Column field', activeColumnField, (nextKey) =>
            updateConfig({ columnField: nextKey })
          )}
          {renderZone('values', 'Values', valSelectId, 'Value field', activeValueField, (nextKey) =>
            updateConfig({ valueField: nextKey })
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className={cx(tableClass, 'w-full border-collapse text-sm')}>
          <thead className="border-b border-[var(--prism-divider)] bg-white/40 dark:bg-white/[0.04]">
            <tr>
              <th
                scope="col"
                className="px-3.5 py-2.5 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap"
              >
                <span>
                  {rowFieldLabel} / {colFieldLabel}
                </span>
                <span className="ml-2 text-[11px] font-mono uppercase text-[var(--prism-primary-main)]">
                  {aggregation}({valFieldLabel})
                </span>
              </th>
              {matrix.colKeys.map((colKey) => (
                <th
                  key={colKey}
                  scope="col"
                  data-pivot-col={colKey}
                  className="px-3.5 py-2.5 text-right text-xs font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap"
                >
                  {colKey}
                </th>
              ))}
              <th
                scope="col"
                className="px-3.5 py-2.5 text-right text-xs font-semibold text-slate-900 dark:text-white whitespace-nowrap border-l border-[var(--prism-divider)]"
              >
                Row Total
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[var(--prism-divider)]">
            {isEmpty ? (
              <tr>
                <td
                  colSpan={matrix.colKeys.length + 2}
                  className="px-4 py-8 text-center text-xs text-slate-500 dark:text-slate-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              matrix.rowKeys.map((rowKey) => {
                const rowCells = matrix.cellBuckets.get(rowKey);
                const rowTotal = computeAggregate(
                  matrix.rowBuckets.get(rowKey) ?? [],
                  aggregation
                );
                return (
                  <tr
                    key={rowKey}
                    data-pivot-row={rowKey}
                    className="h-11 transition-colors hover:bg-white/45 dark:hover:bg-white/[0.04]"
                  >
                    <th
                      scope="row"
                      className="px-3.5 py-2 text-left text-xs font-semibold text-slate-800 dark:text-slate-100 whitespace-nowrap"
                    >
                      {rowKey}
                    </th>
                    {matrix.colKeys.map((colKey) => {
                      const bucket = rowCells?.get(colKey) ?? [];
                      const cellMetric = computeAggregate(bucket, aggregation);
                      return (
                        <td
                          key={colKey}
                          data-pivot-cell={`${rowKey}::${colKey}`}
                          className="px-3.5 py-2 text-right font-mono text-xs tabular-nums text-slate-700 dark:text-slate-200 whitespace-nowrap"
                        >
                          {formatPivotMetric(cellMetric, aggregation)}
                        </td>
                      );
                    })}
                    <td
                      data-pivot-row-total={rowKey}
                      className="px-3.5 py-2 text-right font-mono text-xs font-semibold tabular-nums text-slate-900 dark:text-white whitespace-nowrap border-l border-[var(--prism-divider)]"
                    >
                      {formatPivotMetric(rowTotal, aggregation)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

          <tfoot className="border-t-2 border-[var(--prism-divider)] bg-white/45 dark:bg-white/[0.05]">
            <tr>
              <th
                scope="row"
                className="px-3.5 py-2.5 text-left text-xs font-bold text-slate-900 dark:text-white whitespace-nowrap"
              >
                Column Total
              </th>
              {matrix.colKeys.map((colKey) => {
                const colTotal = computeAggregate(
                  matrix.colBuckets.get(colKey) ?? [],
                  aggregation
                );
                return (
                  <td
                    key={colKey}
                    data-pivot-col-total={colKey}
                    className="px-3.5 py-2.5 text-right font-mono text-xs font-semibold tabular-nums text-slate-900 dark:text-white whitespace-nowrap"
                  >
                    {formatPivotMetric(colTotal, aggregation)}
                  </td>
                );
              })}
              <td
                data-pivot-grand-total="true"
                className="px-3.5 py-2.5 text-right font-mono text-xs font-bold tabular-nums text-[var(--prism-primary-main)] whitespace-nowrap border-l border-[var(--prism-divider)]"
              >
                {formatPivotMetric(
                  computeAggregate(matrix.allValues, aggregation),
                  aggregation
                )}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export const PivotTable = /*#__PURE__*/ memoWithDisplayName(PivotTableInner, 'PivotTable');
