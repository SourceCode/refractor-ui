'use client';

import {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronRight,
  Download,
  GripVertical,
  Layers,
  Pencil,
  Pin,
  PinOff,
  X,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { createCoalescedPointerMove } from '../hooks/useRafCallback';
import { useControllableState } from '../hooks/useControllableState';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { buildSafeCsv, clampNumber, isSafeObjectKey } from '../utils/sanitize';
import { compareNaturalStrings } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export type GridCellValue = string | number | boolean;

export interface GridRowRecord {
  id: string;
  values: Record<string, GridCellValue>;
}

export type AdvancedGridPinSide = 'left' | 'right' | 'none';
export type AdvancedGridAlign = 'left' | 'right';
export type AdvancedGridSortDirection = 'asc' | 'desc';

export interface AdvancedGridColumn {
  key: string;
  header: string;
  width?: number;
  minWidth?: number;
  editable?: boolean;
  pinned?: AdvancedGridPinSide;
  align?: AdvancedGridAlign;
  sortable?: boolean;
}

type AdvancedDataGridBaseProps = Omit<BaseProps<HTMLDivElement>, 'children'>;

export interface AdvancedDataGridProps extends AdvancedDataGridBaseProps {
  /** Column definitions supporting resize, reorder, pinning, sorting, and inline editing. */
  columns: ReadonlyArray<AdvancedGridColumn>;
  /** Typed dataset rows rendered in the optical glass grid. */
  rows: ReadonlyArray<GridRowRecord>;
  /** Invoked whenever an editable cell commits a new value. */
  onCellEdit?: (rowId: string, columnKey: string, nextValue: GridCellValue) => void;
  /** Controlled active grouping column key (or null for flat ungrouped rows). */
  groupBy?: string | null;
  /** Uncontrolled initial grouping column key. */
  defaultGroupBy?: string | null;
  /** Invoked when the row grouping column selection changes. */
  onGroupByChange?: (columnKey: string | null) => void;
  /** Custom callback receiving formula-safe RFC 4180 CSV content and filename. */
  onExportCsv?: (csvContent: string, filename: string) => void;
  /** Filename used for CSV export callbacks and browser downloads. */
  exportFilename?: string;
  /** Message rendered when no rows or columns are available. */
  emptyMessage?: string;
}

interface SortState {
  key: string;
  direction: AdvancedGridSortDirection;
}

interface EditingCellState {
  rowId: string;
  columnKey: string;
  draft: string;
  originalValue: GridCellValue | undefined;
}

const DEFAULT_MIN_COL_WIDTH = 80;
const MAX_COL_WIDTH = 480;
const DEFAULT_COL_WIDTH = 160;
const RESIZE_STEP_PX = 16;

function readSafeCellValue(
  values: Record<string, GridCellValue>,
  key: string
): GridCellValue | undefined {
  if (!isSafeObjectKey(key)) return undefined;
  if (!Object.prototype.hasOwnProperty.call(values, key)) return undefined;
  return values[key];
}

function getColumnMinWidth(col: AdvancedGridColumn): number {
  return clampNumber(
    col.minWidth ?? DEFAULT_MIN_COL_WIDTH,
    1,
    MAX_COL_WIDTH,
    DEFAULT_MIN_COL_WIDTH
  );
}

function clampColumnWidth(col: AdvancedGridColumn, rawWidth: number): number {
  const minW = getColumnMinWidth(col);
  return Math.round(clampNumber(rawWidth, minW, MAX_COL_WIDTH, Math.max(minW, DEFAULT_COL_WIDTH)));
}

function nextPinSide(current: AdvancedGridPinSide): AdvancedGridPinSide {
  if (current === 'none') return 'left';
  if (current === 'left') return 'right';
  return 'none';
}

function parseEditedValue(
  draft: string,
  originalValue: GridCellValue | undefined
): GridCellValue {
  if (typeof originalValue === 'number') {
    const trimmed = draft.trim();
    if (trimmed !== '') {
      const parsed = Number(trimmed);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
    return draft;
  }
  if (typeof originalValue === 'boolean') {
    const lower = draft.trim().toLowerCase();
    if (lower === 'true') return true;
    if (lower === 'false') return false;
    return draft;
  }
  return draft;
}

function compareCellValues(
  left: GridCellValue | undefined,
  right: GridCellValue | undefined
): number {
  if (left === right) return 0;
  if (left === undefined) return 1;
  if (right === undefined) return -1;

  if (typeof left === 'number' && typeof right === 'number') {
    const leftFinite = Number.isFinite(left);
    const rightFinite = Number.isFinite(right);
    if (leftFinite && rightFinite) return left - right;
    if (!leftFinite && !rightFinite) return 0;
    return leftFinite ? -1 : 1;
  }

  if (typeof left === 'boolean' && typeof right === 'boolean') {
    return Number(left) - Number(right);
  }

  return compareNaturalStrings(String(left), String(right));
}

function formatDisplayCell(value: GridCellValue | undefined): string {
  if (value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'True' : 'False';
  return String(value);
}

const toolbarClass = /*#__PURE__*/ stableClassName('advanced-data-grid', 'toolbar');
const tableClass = /*#__PURE__*/ stableClassName('advanced-data-grid', 'table');
const groupHeaderClass = /*#__PURE__*/ stableClassName('advanced-data-grid', 'group-header');

function AdvancedDataGridInner({
  columns,
  rows,
  onCellEdit,
  groupBy,
  defaultGroupBy = null,
  onGroupByChange,
  onExportCsv,
  exportFilename = 'refractor-grid.csv',
  emptyMessage = 'No records to display.',
  className,
  style,
  xstyle,
  ref,
  ...rest
}: AdvancedDataGridProps) {
  const override = useComponentOverride('AdvancedDataGrid');
  const groupSelectId = useId();
  const editInputRef = useRef<HTMLInputElement>(null);
  const cleanupResizeRef = useRef<(() => void) | null>(null);

  const [activeGroupBy, setActiveGroupBy] = useControllableState<string | null>({
    value: groupBy,
    defaultValue: defaultGroupBy,
    onChange: onGroupByChange,
  });

  const [columnOrder, setColumnOrder] = useState<string[]>(() => columns.map((c) => c.key));
  const [widthOverrides, setWidthOverrides] = useState<Map<string, number>>(() => new Map());
  const [pinOverrides, setPinOverrides] = useState<Map<string, AdvancedGridPinSide>>(
    () => new Map()
  );
  const [sortState, setSortState] = useState<SortState | null>(null);
  const [editedCells, setEditedCells] = useState<Map<string, Map<string, GridCellValue>>>(
    () => new Map()
  );
  const [editingCell, setEditingCell] = useState<EditingCellState | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => new Set());
  const [draggedColumnKey, setDraggedColumnKey] = useState<string | null>(null);
  const [dragOverColumnKey, setDragOverColumnKey] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      cleanupResizeRef.current?.();
    };
  }, []);

  useEffect(() => {
    if (editingCell && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingCell?.rowId, editingCell?.columnKey]);

  const columnMap = useMemo(() => {
    const map = new Map<string, AdvancedGridColumn>();
    for (const col of columns) {
      map.set(col.key, col);
    }
    return map;
  }, [columns]);

  const getPinSide = useCallback(
    (col: AdvancedGridColumn): AdvancedGridPinSide =>
      pinOverrides.get(col.key) ?? col.pinned ?? 'none',
    [pinOverrides]
  );

  const getColumnWidth = useCallback(
    (col: AdvancedGridColumn): number => {
      const overrideWidth = widthOverrides.get(col.key);
      if (overrideWidth !== undefined) {
        return clampColumnWidth(col, overrideWidth);
      }
      return clampColumnWidth(col, col.width ?? DEFAULT_COL_WIDTH);
    },
    [widthOverrides]
  );

  const resolvedOrder = useMemo(() => {
    const existing = columnOrder.filter((key) => columnMap.has(key));
    const seen = new Set(existing);
    for (const col of columns) {
      if (!seen.has(col.key)) {
        existing.push(col.key);
        seen.add(col.key);
      }
    }
    return existing;
  }, [columnOrder, columnMap, columns]);

  const displayColumns = useMemo(() => {
    const left: AdvancedGridColumn[] = [];
    const center: AdvancedGridColumn[] = [];
    const right: AdvancedGridColumn[] = [];

    for (const key of resolvedOrder) {
      const col = columnMap.get(key) as AdvancedGridColumn;
      const pin = getPinSide(col);
      if (pin === 'left') {
        left.push(col);
      } else if (pin === 'right') {
        right.push(col);
      } else {
        center.push(col);
      }
    }

    return [...left, ...center, ...right];
  }, [resolvedOrder, columnMap, getPinSide]);

  const stickyMetrics = useMemo(() => {
    const leftOffsets = new Map<string, number>();
    const rightOffsets = new Map<string, number>();
    let leftAcc = 0;
    let lastLeftPinnedKey: string | null = null;
    let firstRightPinnedKey: string | null = null;

    for (const col of displayColumns) {
      const pin = getPinSide(col);
      if (pin === 'left') {
        leftOffsets.set(col.key, leftAcc);
        leftAcc += getColumnWidth(col);
        lastLeftPinnedKey = col.key;
      } else if (pin === 'right' && firstRightPinnedKey === null) {
        firstRightPinnedKey = col.key;
      }
    }

    let rightAcc = 0;
    for (let i = displayColumns.length - 1; i >= 0; i -= 1) {
      const col = displayColumns[i];
      if (col && getPinSide(col) === 'right') {
        rightOffsets.set(col.key, rightAcc);
        rightAcc += getColumnWidth(col);
      }
    }

    return { leftOffsets, rightOffsets, lastLeftPinnedKey, firstRightPinnedKey };
  }, [displayColumns, getPinSide, getColumnWidth]);

  const getEffectiveCellValue = useCallback(
    (row: GridRowRecord, columnKey: string): GridCellValue | undefined => {
      const rowEdits = editedCells.get(row.id);
      if (rowEdits && rowEdits.has(columnKey)) {
        return rowEdits.get(columnKey);
      }
      return readSafeCellValue(row.values, columnKey);
    },
    [editedCells]
  );

  const sortedRows = useMemo(() => {
    if (!sortState) return rows;
    const { key, direction } = sortState;
    const multiplier = direction === 'asc' ? 1 : -1;
    return [...rows].sort(
      (a, b) =>
        compareCellValues(getEffectiveCellValue(a, key), getEffectiveCellValue(b, key)) *
        multiplier
    );
  }, [rows, sortState, getEffectiveCellValue]);

  const validGroupBy = useMemo(() => {
    if (!activeGroupBy || !columnMap.has(activeGroupBy)) return null;
    return activeGroupBy;
  }, [activeGroupBy, columnMap]);

  const groupedEntries = useMemo(() => {
    if (!validGroupBy) return null;
    const groups = new Map<string, GridRowRecord[]>();
    for (const row of sortedRows) {
      const val = getEffectiveCellValue(row, validGroupBy);
      const label = val === undefined ? '(Empty)' : String(val);
      const bucket = groups.get(label);
      if (bucket) {
        bucket.push(row);
      } else {
        groups.set(label, [row]);
      }
    }
    return Array.from(groups.entries());
  }, [validGroupBy, sortedRows, getEffectiveCellValue]);

  const handleToggleSort = useCallback((col: AdvancedGridColumn) => {
    setSortState((prev) => {
      if (prev && prev.key === col.key) {
        return { key: col.key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key: col.key, direction: 'asc' };
    });
  }, []);

  const handleCyclePin = useCallback(
    (col: AdvancedGridColumn) => {
      const next = nextPinSide(getPinSide(col));
      setPinOverrides((prev) => {
        const updated = new Map(prev);
        updated.set(col.key, next);
        return updated;
      });
    },
    [getPinSide]
  );

  const updateColumnWidth = useCallback((col: AdvancedGridColumn, rawWidth: number) => {
    const clamped = clampColumnWidth(col, rawWidth);
    setWidthOverrides((prev) => {
      if (prev.get(col.key) === clamped) return prev;
      const updated = new Map(prev);
      updated.set(col.key, clamped);
      return updated;
    });
  }, []);

  const handleResizePointerDown = useCallback(
    (col: AdvancedGridColumn, event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button > 0) return;
      event.preventDefault();
      event.stopPropagation();
      cleanupResizeRef.current?.();

      const startX = event.clientX;
      const startWidth = getColumnWidth(col);

      const handlePointerMove = createCoalescedPointerMove((moveEvent: PointerEvent) => {
        updateColumnWidth(col, startWidth + (moveEvent.clientX - startX));
      });

      const cleanup = () => {
        handlePointerMove.cancel();
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerEnd);
        window.removeEventListener('pointercancel', handlePointerEnd);
        cleanupResizeRef.current = null;
      };

      const handlePointerEnd = () => {
        cleanup();
      };

      cleanupResizeRef.current = cleanup;
      window.addEventListener('pointermove', handlePointerMove, { passive: true });
      window.addEventListener('pointerup', handlePointerEnd);
      window.addEventListener('pointercancel', handlePointerEnd);
    },
    [getColumnWidth, updateColumnWidth]
  );

  const handleResizeKeyDown = useCallback(
    (col: AdvancedGridColumn, event: KeyboardEvent<HTMLDivElement>) => {
      if (event.nativeEvent.isComposing) return;
      const currentWidth = getColumnWidth(col);
      if (event.key === 'ArrowRight' || event.key === '+' || event.key === '=') {
        event.preventDefault();
        updateColumnWidth(col, currentWidth + RESIZE_STEP_PX);
      } else if (event.key === 'ArrowLeft' || event.key === '-') {
        event.preventDefault();
        updateColumnWidth(col, currentWidth - RESIZE_STEP_PX);
      } else if (event.key === 'Home') {
        event.preventDefault();
        updateColumnWidth(col, getColumnMinWidth(col));
      } else if (event.key === 'End') {
        event.preventDefault();
        updateColumnWidth(col, MAX_COL_WIDTH);
      }
    },
    [getColumnWidth, updateColumnWidth]
  );

  const moveColumnByOffset = useCallback(
    (col: AdvancedGridColumn, delta: -1 | 1) => {
      const pinBucket = getPinSide(col);
      const bucketKeys = displayColumns
        .filter((item) => getPinSide(item) === pinBucket)
        .map((item) => item.key);
      const pos = bucketKeys.indexOf(col.key);
      const swapWith = bucketKeys[pos + delta];
      if (!swapWith) return;

      setColumnOrder(() => {
        const next = [...resolvedOrder];
        const idxA = next.indexOf(col.key);
        const idxB = next.indexOf(swapWith);
        next[idxA] = swapWith;
        next[idxB] = col.key;
        return next;
      });
    },
    [displayColumns, getPinSide, resolvedOrder]
  );

  const reorderColumnToTarget = useCallback(
    (sourceKey: string, targetKey: string) => {
      if (!sourceKey || sourceKey === targetKey) return;
      if (!columnMap.has(sourceKey) || !columnMap.has(targetKey)) return;

      setColumnOrder(() => {
        const next = resolvedOrder.filter((key) => key !== sourceKey);
        const targetIndex = next.indexOf(targetKey);
        next.splice(targetIndex, 0, sourceKey);
        return next;
      });
    },
    [columnMap, resolvedOrder]
  );

  const handleHeaderDragStart = useCallback(
    (columnKey: string, event: DragEvent<HTMLTableCellElement>) => {
      setDraggedColumnKey(columnKey);
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', columnKey);
      }
    },
    []
  );

  const handleHeaderDragOver = useCallback(
    (columnKey: string, event: DragEvent<HTMLTableCellElement>) => {
      event.preventDefault();
      if (dragOverColumnKey !== columnKey) {
        setDragOverColumnKey(columnKey);
      }
    },
    [dragOverColumnKey]
  );

  const handleHeaderDrop = useCallback(
    (targetKey: string, event: DragEvent<HTMLTableCellElement>) => {
      event.preventDefault();
      const sourceKey =
        draggedColumnKey ?? (event.dataTransfer ? event.dataTransfer.getData('text/plain') : '');
      reorderColumnToTarget(sourceKey, targetKey);
      setDraggedColumnKey(null);
      setDragOverColumnKey(null);
    },
    [draggedColumnKey, reorderColumnToTarget]
  );

  const handleHeaderDragEnd = useCallback(() => {
    setDraggedColumnKey(null);
    setDragOverColumnKey(null);
  }, []);

  const startEditing = useCallback(
    (row: GridRowRecord, col: AdvancedGridColumn) => {
      if (!col.editable || !isSafeObjectKey(col.key)) return;
      const originalValue = getEffectiveCellValue(row, col.key);
      setEditingCell({
        rowId: row.id,
        columnKey: col.key,
        draft: originalValue === undefined ? '' : String(originalValue),
        originalValue,
      });
    },
    [getEffectiveCellValue]
  );

  const commitEdit = useCallback(() => {
    if (!editingCell) return;
    const { rowId, columnKey, draft, originalValue } = editingCell;
    const nextValue = parseEditedValue(draft, originalValue);
    setEditedCells((prev) => {
      const nextOuter = new Map(prev);
      const nextInner = new Map(prev.get(rowId) ?? []);
      nextInner.set(columnKey, nextValue);
      nextOuter.set(rowId, nextInner);
      return nextOuter;
    });
    setEditingCell(null);
    onCellEdit?.(rowId, columnKey, nextValue);
  }, [editingCell, onCellEdit]);

  const cancelEdit = useCallback(() => {
    setEditingCell(null);
  }, []);

  const toggleGroupCollapsed = useCallback((groupLabel: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupLabel)) {
        next.delete(groupLabel);
      } else {
        next.add(groupLabel);
      }
      return next;
    });
  }, []);

  const handleExportCsv = useCallback(() => {
    const headers = displayColumns.map((col) => col.header);
    const dataRows = sortedRows.map((row) =>
      displayColumns.map((col) => getEffectiveCellValue(row, col.key))
    );
    const csvContent = buildSafeCsv(headers, dataRows);
    const safeFilename = exportFilename.trim() || 'refractor-grid.csv';

    if (onExportCsv) {
      onExportCsv(csvContent, safeFilename);
      return;
    }

    if (
      typeof URL !== 'undefined' &&
      typeof URL.createObjectURL === 'function' &&
      typeof document !== 'undefined'
    ) {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = safeFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      if (typeof URL.revokeObjectURL === 'function') {
        URL.revokeObjectURL(url);
      }
    }
  }, [displayColumns, exportFilename, getEffectiveCellValue, onExportCsv, sortedRows]);

  const merged = mergeProps({
    themeTarget: themeProps('advanced-data-grid', {
      grouped: Boolean(validGroupBy),
      sorted: Boolean(sortState),
      empty: rows.length === 0 || displayColumns.length === 0,
    }),
    baseClassName: 'prism-slab overflow-hidden flex flex-col',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });


  const groupColumnHeader = validGroupBy ? columnMap.get(validGroupBy)?.header ?? validGroupBy : '';

  const stickyCellStyles = useMemo(() => {
    const headerStyles = new Map<string, CSSProperties>();
    const bodyStyles = new Map<string, CSSProperties>();
    for (let i = 0; i < displayColumns.length; i += 1) {
      const col = displayColumns[i]!;
      const width = getColumnWidth(col);
      const pin = getPinSide(col);
      const widthPx = `${width}px`;
      if (pin === 'left') {
        const leftPx = `${stickyMetrics.leftOffsets.get(col.key) ?? 0}px`;
        headerStyles.set(col.key, {
          width: widthPx,
          minWidth: widthPx,
          position: 'sticky',
          left: leftPx,
          zIndex: 20,
        });
        bodyStyles.set(col.key, {
          width: widthPx,
          minWidth: widthPx,
          position: 'sticky',
          left: leftPx,
          zIndex: 10,
        });
      } else if (pin === 'right') {
        const rightPx = `${stickyMetrics.rightOffsets.get(col.key) ?? 0}px`;
        headerStyles.set(col.key, {
          width: widthPx,
          minWidth: widthPx,
          position: 'sticky',
          right: rightPx,
          zIndex: 20,
        });
        bodyStyles.set(col.key, {
          width: widthPx,
          minWidth: widthPx,
          position: 'sticky',
          right: rightPx,
          zIndex: 10,
        });
      } else {
        const base: CSSProperties = { width: widthPx, minWidth: widthPx };
        headerStyles.set(col.key, base);
        bodyStyles.set(col.key, base);
      }
    }
    return { headerStyles, bodyStyles };
  }, [displayColumns, getColumnWidth, getPinSide, stickyMetrics]);

  const renderDataRow = (row: GridRowRecord) => (
    <tr
      key={row.id}
      data-row-id={row.id}
      className="h-11 prism-cv-row transition-colors hover:bg-white/45 dark:hover:bg-white/[0.04]"
    >
      {displayColumns.map((col) => {
        const pin = getPinSide(col);
        const value = getEffectiveCellValue(row, col.key);
        const isEditing =
          editingCell !== null &&
          editingCell.rowId === row.id &&
          editingCell.columnKey === col.key;
        const isRightAligned = col.align === 'right' || typeof value === 'number';
        const isLastLeftPin = pin === 'left' && stickyMetrics.lastLeftPinnedKey === col.key;
        const isFirstRightPin = pin === 'right' && stickyMetrics.firstRightPinnedKey === col.key;

        return (
          <td
            key={col.key}
            data-column-key={col.key}
            data-pinned={pin}
            data-editable={col.editable ? 'true' : undefined}
            tabIndex={col.editable && !isEditing ? 0 : undefined}
            style={stickyCellStyles.bodyStyles.get(col.key)}
            onDoubleClick={col.editable ? () => startEditing(row, col) : undefined}
            onKeyDown={
              col.editable && !isEditing
                ? (e) => {
                    if (e.nativeEvent.isComposing) return;
                    if (e.target === e.currentTarget && e.key === 'Enter') {
                      e.preventDefault();
                      startEditing(row, col);
                    }
                  }
                : undefined
            }
            className={cx(
              'px-3.5 py-2 text-sm text-slate-800 dark:text-slate-100 whitespace-nowrap overflow-hidden text-ellipsis align-middle prism-focus-ring',
              isRightAligned ? 'text-right font-mono tabular-nums' : 'text-left',
              pin !== 'none' && 'bg-[var(--prism-bg-start)]/95',
              isLastLeftPin && 'border-r-2 border-[var(--prism-secondary-main)]/45',
              isFirstRightPin && 'border-l-2 border-[var(--prism-secondary-main)]/45'
            )}
          >
            {isEditing ? (
              <div className="flex items-center gap-1">
                <input
                  ref={editInputRef}
                  type="text"
                  value={editingCell.draft}
                  aria-label={`Edit ${col.header} value for row ${row.id}`}
                  onChange={(e) =>
                    setEditingCell((prev) => (prev ? { ...prev, draft: e.target.value } : null))
                  }
                  onKeyDown={(e) => {
                    if (e.nativeEvent.isComposing) return;
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      commitEdit();
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      cancelEdit();
                    }
                  }}
                  className={cx(
                    'prism-well prism-focus-ring w-full min-w-0 h-7 px-2 rounded-lg text-xs text-slate-900 dark:text-slate-100',
                    isRightAligned && 'text-right font-mono tabular-nums'
                  )}
                />
                <button
                  type="button"
                  aria-label={`Save ${col.header} for row ${row.id}`}
                  onClick={commitEdit}
                  className="prism-crystal prism-focus-ring shrink-0 w-6 h-6 rounded-md inline-flex items-center justify-center text-emerald-700 dark:text-emerald-300 cursor-pointer"
                >
                  <Check aria-hidden="true" className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  aria-label={`Cancel editing ${col.header} for row ${row.id}`}
                  onClick={cancelEdit}
                  className="prism-crystal prism-focus-ring shrink-0 w-6 h-6 rounded-md inline-flex items-center justify-center text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  <X aria-hidden="true" className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div
                className={cx(
                  'flex items-center gap-1.5 min-w-0',
                  isRightAligned ? 'justify-end' : 'justify-between'
                )}
              >
                <span className="truncate">{formatDisplayCell(value)}</span>
                {col.editable ? (
                  <button
                    type="button"
                    aria-label={`Edit ${col.header} for row ${row.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditing(row, col);
                    }}
                    className="prism-focus-ring shrink-0 p-1 rounded-md text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer"
                  >
                    <Pencil aria-hidden="true" className="w-3 h-3" />
                  </button>
                ) : null}
              </div>
            )}
          </td>
        );
      })}
    </tr>
  );

  return (
    <div ref={ref} {...rest} {...merged}>
      <div
        className={cx(
          toolbarClass,
          'px-4 py-3 border-b border-[var(--prism-divider)] bg-white/35 dark:bg-white/[0.03] flex flex-wrap items-center justify-between gap-3'
        )}
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-200">
            <Layers aria-hidden="true" className="w-3.5 h-3.5 text-[var(--prism-secondary-dark)]" />
            <label htmlFor={groupSelectId} className="whitespace-nowrap">
              Group by
            </label>
            <select
              id={groupSelectId}
              aria-label="Group rows by"
              value={validGroupBy ?? ''}
              onChange={(e) => {
                const next = e.target.value === '' ? null : e.target.value;
                setActiveGroupBy(next);
              }}
              className="prism-well prism-focus-ring h-8 px-2.5 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 cursor-pointer"
            >
              <option value="">None</option>
              {columns.map((col) => (
                <option key={col.key} value={col.key}>
                  {col.header}
                </option>
              ))}
            </select>
          </div>
          <span className="prism-crystal px-2.5 py-1 rounded-full text-[11px] font-mono tabular-nums text-slate-700 dark:text-slate-200">
            {rows.length} {rows.length === 1 ? 'row' : 'rows'}
          </span>
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          className="prism-crystal prism-focus-ring h-8 px-3.5 rounded-full inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 cursor-pointer"
        >
          <Download aria-hidden="true" className="w-3.5 h-3.5" />
          <span>Export CSV</span>
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className={cx(tableClass, 'w-full border-collapse text-sm')}>
          <thead className="border-b border-[var(--prism-divider)] bg-white/40 dark:bg-white/[0.04]">
            <tr>
              {displayColumns.length === 0 ? (
                <th
                  scope="col"
                  className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400"
                >
                  Columns
                </th>
              ) : (
                displayColumns.map((col) => {
                  const pin = getPinSide(col);
                  const width = getColumnWidth(col);
                  const minW = getColumnMinWidth(col);
                  const isSortable = col.sortable !== false;
                  const isSorted = sortState?.key === col.key;
                  const bucketCols = displayColumns.filter((c) => getPinSide(c) === pin);
                  const bucketIdx = bucketCols.findIndex((c) => c.key === col.key);
                  const canMoveLeft = bucketIdx > 0;
                  const canMoveRight = bucketIdx < bucketCols.length - 1;
                  const isLastLeftPin =
                    pin === 'left' && stickyMetrics.lastLeftPinnedKey === col.key;
                  const isFirstRightPin =
                    pin === 'right' && stickyMetrics.firstRightPinnedKey === col.key;
                  const isDragOver = dragOverColumnKey === col.key && draggedColumnKey !== col.key;

                  return (
                    <th
                      key={col.key}
                      scope="col"
                      draggable
                      data-column-header={col.key}
                      data-pinned={pin}
                      data-width={String(width)}
                      aria-sort={
                        isSortable
                          ? isSorted
                            ? sortState.direction === 'asc'
                              ? 'ascending'
                              : 'descending'
                            : 'none'
                          : undefined
                      }
                      style={stickyCellStyles.headerStyles.get(col.key)}
                      onDragStart={(e) => handleHeaderDragStart(col.key, e)}
                      onDragOver={(e) => handleHeaderDragOver(col.key, e)}
                      onDragLeave={() => setDragOverColumnKey((prev) => (prev === col.key ? null : prev))}
                      onDrop={(e) => handleHeaderDrop(col.key, e)}
                      onDragEnd={handleHeaderDragEnd}
                      className={cx(
                        'relative px-3 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 select-none align-middle',
                        col.align === 'right' ? 'text-right' : 'text-left',
                        pin !== 'none' && 'bg-[var(--prism-bg-mid)]/95',
                        isLastLeftPin && 'border-r-2 border-[var(--prism-secondary-main)]/45',
                        isFirstRightPin && 'border-l-2 border-[var(--prism-secondary-main)]/45',
                        isDragOver && 'ring-2 ring-inset ring-[var(--prism-secondary-main)]'
                      )}
                    >
                      <div className="flex items-center justify-between gap-1.5 pr-2">
                        <div className="flex items-center gap-1 min-w-0">
                          <GripVertical
                            aria-hidden="true"
                            className="w-3.5 h-3.5 shrink-0 text-slate-400 cursor-grab"
                          />
                          {isSortable ? (
                            <button
                              type="button"
                              onClick={() => handleToggleSort(col)}
                              className="prism-focus-ring rounded inline-flex items-center gap-1 text-left truncate hover:text-slate-950 dark:hover:text-white cursor-pointer"
                            >
                              <span className="truncate">{col.header}</span>
                              {isSorted ? (
                                sortState.direction === 'asc' ? (
                                  <ArrowUp
                                    aria-hidden="true"
                                    className="w-3 h-3 shrink-0 text-[var(--prism-primary-main)]"
                                  />
                                ) : (
                                  <ArrowDown
                                    aria-hidden="true"
                                    className="w-3 h-3 shrink-0 text-[var(--prism-primary-main)]"
                                  />
                                )
                              ) : null}
                            </button>
                          ) : (
                            <span className="truncate">{col.header}</span>
                          )}
                        </div>

                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            type="button"
                            disabled={!canMoveLeft}
                            aria-label={`Move ${col.header} left`}
                            onClick={() => moveColumnByOffset(col, -1)}
                            className="prism-focus-ring p-1 rounded text-slate-500 dark:text-slate-400 enabled:hover:text-slate-900 dark:enabled:hover:text-white cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
                          >
                            <ArrowLeft aria-hidden="true" className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            disabled={!canMoveRight}
                            aria-label={`Move ${col.header} right`}
                            onClick={() => moveColumnByOffset(col, 1)}
                            className="prism-focus-ring p-1 rounded text-slate-500 dark:text-slate-400 enabled:hover:text-slate-900 dark:enabled:hover:text-white cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
                          >
                            <ArrowRight aria-hidden="true" className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            aria-label={`Pin ${col.header} (currently ${pin})`}
                            aria-pressed={pin !== 'none'}
                            onClick={() => handleCyclePin(col)}
                            className={cx(
                              'prism-focus-ring p-1 rounded cursor-pointer',
                              pin !== 'none'
                                ? 'text-[var(--prism-primary-main)]'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            )}
                          >
                            {pin === 'none' ? (
                              <Pin aria-hidden="true" className="w-3 h-3" />
                            ) : (
                              <PinOff aria-hidden="true" className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div
                        role="separator"
                        tabIndex={0}
                        aria-orientation="vertical"
                        aria-label={`Resize ${col.header} column`}
                        aria-valuenow={width}
                        aria-valuemin={minW}
                        aria-valuemax={MAX_COL_WIDTH}
                        onPointerDown={(e) => handleResizePointerDown(col, e)}
                        onKeyDown={(e) => handleResizeKeyDown(col, e)}
                        className="prism-focus-ring absolute top-1 bottom-1 right-0 w-2 cursor-col-resize touch-none flex items-center justify-center rounded-full"
                      >
                        <span
                          aria-hidden="true"
                          className="w-0.5 h-4 rounded-full bg-[var(--prism-text-secondary)]/35"
                        />
                      </div>
                    </th>
                  );
                })
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-[var(--prism-divider)]">
            {displayColumns.length === 0 || sortedRows.length === 0 ? (
              <tr>
                <td
                  colSpan={Math.max(1, displayColumns.length)}
                  className="px-4 py-8 text-center text-xs text-slate-500 dark:text-slate-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : groupedEntries ? (
              groupedEntries.map(([groupLabel, groupRows]) => {
                const isCollapsed = collapsedGroups.has(groupLabel);
                return (
                  <Fragment key={groupLabel}>
                    <tr
                      data-group-key={groupLabel}
                      className={cx(
                        groupHeaderClass,
                        'bg-white/45 dark:bg-white/[0.05]'
                      )}
                    >
                      <td colSpan={displayColumns.length} className="px-3.5 py-2">
                        <button
                          type="button"
                          aria-expanded={!isCollapsed}
                          onClick={() => toggleGroupCollapsed(groupLabel)}
                          className="prism-focus-ring inline-flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-100 rounded-lg px-1.5 py-0.5 cursor-pointer"
                        >
                          {isCollapsed ? (
                            <ChevronRight aria-hidden="true" className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown aria-hidden="true" className="w-3.5 h-3.5" />
                          )}
                          <span className="text-slate-500 dark:text-slate-400">
                            {groupColumnHeader}:
                          </span>
                          <span>{groupLabel}</span>
                          <span className="prism-crystal px-2 py-0.5 rounded-full text-[11px] font-mono tabular-nums text-slate-700 dark:text-slate-200">
                            {groupRows.length}
                          </span>
                        </button>
                      </td>
                    </tr>
                    {isCollapsed ? null : groupRows.map((row) => renderDataRow(row))}
                  </Fragment>
                );
              })
            ) : (
              sortedRows.map((row) => renderDataRow(row))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export const AdvancedDataGrid = /*#__PURE__*/ memoWithDisplayName(AdvancedDataGridInner, 'AdvancedDataGrid');
