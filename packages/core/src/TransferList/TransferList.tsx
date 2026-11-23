'use client';

import { useId, useMemo, useState, type KeyboardEvent } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  X,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { mergeProps } from '../utils/mergeProps';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export interface TransferListItem {
  /** Unique identifier for the transferable item. */
  id: string;
  /** Primary visible label displayed inside the listbox row. */
  label: string;
  /** Optional secondary description rendered beneath the label. */
  description?: string;
  /** Prevents checking or transferring this item between pools. */
  disabled?: boolean;
}

type TransferListBaseProps = Omit<BaseProps<HTMLDivElement>, 'children' | 'onChange'>;

export interface TransferListProps extends TransferListBaseProps {
  /** Master catalog of items partitioned across Available and Selected pools. */
  items: ReadonlyArray<TransferListItem>;
  /** Controlled item IDs currently assigned to the Selected pool. */
  selectedIds?: ReadonlyArray<string>;
  /** Initial item IDs assigned to the Selected pool in uncontrolled mode. */
  defaultSelectedIds?: ReadonlyArray<string>;
  /** Callback invoked with the updated deduplicated Selected item IDs. */
  onChange?: (selectedIds: string[]) => void;
  /** Heading for the left Available pool (defaults to 'Available'). */
  availableTitle?: string;
  /** Heading for the right Selected pool (defaults to 'Selected'). */
  selectedTitle?: string;
  /** Enables independent recessed search filters in both pools (defaults to true). */
  searchable?: boolean;
}

function normalizeSelection(
  ids: ReadonlyArray<string> | undefined,
  itemMap: ReadonlyMap<string, TransferListItem>
): { ids: string[]; items: TransferListItem[] } {
  if (!ids || ids.length === 0) return { ids: [], items: [] };
  const seen = new Set<string>();
  const resolvedIds: string[] = [];
  const resolvedItems: TransferListItem[] = [];
  for (const id of ids) {
    const found = itemMap.get(id);
    if (found && !seen.has(id)) {
      seen.add(id);
      resolvedIds.push(id);
      resolvedItems.push(found);
    }
  }
  return { ids: resolvedIds, items: resolvedItems };
}

function filterPoolItems(
  pool: ReadonlyArray<TransferListItem>,
  query: string
): TransferListItem[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [...pool];
  return pool.filter(
    (item) =>
      item.label.toLowerCase().includes(normalized) ||
      (item.description ? item.description.toLowerCase().includes(normalized) : false)
  );
}

function TransferListInner({
  items,
  selectedIds,
  defaultSelectedIds,
  onChange,
  availableTitle = 'Available',
  selectedTitle = 'Selected',
  searchable = true,
  className,
  style,
  xstyle,
  'aria-label': ariaLabel = 'Transfer list',
  ref,
  ...rest
}: TransferListProps) {
  const override = useComponentOverride('TransferList');
  const availableHeadingId = useId();
  const selectedHeadingId = useId();

  const { uniqueItems, itemMap } = useMemo(() => {
    const map = new Map<string, TransferListItem>();
    const list: TransferListItem[] = [];
    for (const item of items) {
      if (!map.has(item.id)) {
        map.set(item.id, item);
        list.push(item);
      }
    }
    return { uniqueItems: list, itemMap: map };
  }, [items]);

  const isControlled = selectedIds !== undefined;
  const [internalSelectedIds, setInternalSelectedIds] = useState<string[]>(
    () => normalizeSelection(defaultSelectedIds, itemMap).ids
  );
  const [leftChecked, setLeftChecked] = useState<Set<string>>(() => new Set());
  const [rightChecked, setRightChecked] = useState<Set<string>>(() => new Set());
  const [availableQuery, setAvailableQuery] = useState('');
  const [selectedQuery, setSelectedQuery] = useState('');
  const [announcement, setAnnouncement] = useState('');

  const { ids: currentSelectedIds, items: selectedItems } = useMemo(
    () => normalizeSelection(isControlled ? selectedIds : internalSelectedIds, itemMap),
    [isControlled, selectedIds, internalSelectedIds, itemMap]
  );

  const selectedIdSet = useMemo(() => new Set<string>(currentSelectedIds), [currentSelectedIds]);

  const availableItems = useMemo(
    () => uniqueItems.filter((item) => !selectedIdSet.has(item.id)),
    [uniqueItems, selectedIdSet]
  );

  const filteredAvailable = useMemo(
    () => (searchable ? filterPoolItems(availableItems, availableQuery) : availableItems),
    [searchable, availableItems, availableQuery]
  );

  const filteredSelected = useMemo(
    () => (searchable ? filterPoolItems(selectedItems, selectedQuery) : selectedItems),
    [searchable, selectedItems, selectedQuery]
  );

  const eligibleAvailable = useMemo(
    () => availableItems.filter((item) => !item.disabled),
    [availableItems]
  );

  const eligibleSelected = useMemo(
    () => selectedItems.filter((item) => !item.disabled),
    [selectedItems]
  );

  const activeLeftCheckedIds = useMemo(
    () => eligibleAvailable.filter((item) => leftChecked.has(item.id)).map((item) => item.id),
    [eligibleAvailable, leftChecked]
  );

  const activeRightCheckedIds = useMemo(
    () => eligibleSelected.filter((item) => rightChecked.has(item.id)).map((item) => item.id),
    [eligibleSelected, rightChecked]
  );

  const commitSelection = (nextIds: string[], message: string) => {
    if (!isControlled) {
      setInternalSelectedIds(nextIds);
    }
    setAnnouncement(message);
    onChange?.(nextIds);
  };

  const toggleLeftItem = (itemId: string) => {
    setLeftChecked((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const toggleRightItem = (itemId: string) => {
    setRightChecked((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const handleMoveCheckedRight = () => {
    const movedCount = activeLeftCheckedIds.length;
    const nextSelected = [...currentSelectedIds, ...activeLeftCheckedIds];
    setLeftChecked((prev) => {
      const next = new Set(prev);
      for (const id of activeLeftCheckedIds) {
        next.delete(id);
      }
      return next;
    });
    commitSelection(
      nextSelected,
      `Moved ${movedCount} ${movedCount === 1 ? 'item' : 'items'} to ${selectedTitle}`
    );
  };

  const handleMoveAllRight = () => {
    const movedIds = eligibleAvailable.map((item) => item.id);
    const movedCount = movedIds.length;
    const nextSelected = [...currentSelectedIds, ...movedIds];
    setLeftChecked(new Set());
    commitSelection(
      nextSelected,
      `Moved all ${movedCount} enabled ${movedCount === 1 ? 'item' : 'items'} to ${selectedTitle}`
    );
  };

  const handleMoveCheckedLeft = () => {
    const removeSet = new Set(activeRightCheckedIds);
    const movedCount = activeRightCheckedIds.length;
    const nextSelected = currentSelectedIds.filter((id) => !removeSet.has(id));
    setRightChecked((prev) => {
      const next = new Set(prev);
      for (const id of activeRightCheckedIds) {
        next.delete(id);
      }
      return next;
    });
    commitSelection(
      nextSelected,
      `Moved ${movedCount} ${movedCount === 1 ? 'item' : 'items'} to ${availableTitle}`
    );
  };

  const handleMoveAllLeft = () => {
    const movedCount = eligibleSelected.length;
    const nextSelected = currentSelectedIds.filter((id) => Boolean(itemMap.get(id)?.disabled));
    setRightChecked(new Set());
    commitSelection(
      nextSelected,
      `Moved all ${movedCount} enabled ${movedCount === 1 ? 'item' : 'items'} to ${availableTitle}`
    );
  };

  const handleSearchKeyDown = (
    e: KeyboardEvent<HTMLInputElement>,
    onClear: () => void
  ) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Enter') {
      e.preventDefault();
    } else if (e.key === 'Escape') {
      onClear();
    }
  };

  const merged = mergeProps({
    themeTarget: themeProps('transfer-list', {
      searchable,
      availableCount: availableItems.length,
      selectedCount: selectedItems.length,
    }),
    baseClassName:
      'w-full grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch gap-4',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const renderPool = (params: {
    side: 'available' | 'selected';
    title: string;
    headingId: string;
    totalCount: number;
    checkedCount: number;
    filteredItems: ReadonlyArray<TransferListItem>;
    checkedSet: ReadonlySet<string>;
    onToggle: (itemId: string) => void;
    query: string;
    onQueryChange: (value: string) => void;
    emptyPoolLabel: string;
  }) => {
    const poolTarget = themeProps(
      'transfer-list',
      {
        pool: params.side,
        count: params.totalCount,
        empty: params.totalCount === 0,
      },
      'pool'
    );

    return (
      <section
        aria-labelledby={params.headingId}
        {...mergeProps({
          themeTarget: poolTarget,
          baseClassName: 'prism-slab p-4 flex flex-col gap-3 min-w-0',
        })}
      >
        <header className="flex items-center justify-between gap-2">
          <h3
            id={params.headingId}
            className="text-sm font-semibold text-slate-900 dark:text-white truncate"
          >
            {params.title}
          </h3>
          <div className="inline-flex items-center gap-1.5 shrink-0">
            {params.checkedCount > 0 ? (
              <span className="prism-emerald px-2 py-0.5 rounded-full font-mono text-[11px] font-semibold tabular-nums">
                {params.checkedCount} checked
              </span>
            ) : null}
            <span
              data-testid={`transfer-count-${params.side}`}
              className="prism-well px-2.5 py-0.5 rounded-full font-mono text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-200"
            >
              {params.totalCount}
            </span>
          </div>
        </header>

        {searchable ? (
          <div className="prism-well rounded-full px-3 h-9 flex items-center gap-2 focus-within:ring-2 focus-within:ring-sky-400/70">
            <Search
              aria-hidden="true"
              className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0"
            />
            <input
              type="text"
              value={params.query}
              onChange={(e) => params.onQueryChange(e.target.value)}
              onKeyDown={(e) => handleSearchKeyDown(e, () => params.onQueryChange(''))}
              placeholder={`Search ${params.title.toLowerCase()}...`}
              aria-label={`Filter ${params.title}`}
              className="flex-1 min-w-0 bg-transparent text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none"
            />
            {params.query.length > 0 ? (
              <button
                type="button"
                aria-label={`Clear ${params.title} search`}
                onClick={() => params.onQueryChange('')}
                className="prism-focus-ring w-5 h-5 rounded-full inline-flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer shrink-0"
              >
                <X aria-hidden="true" className="w-3 h-3" />
              </button>
            ) : null}
          </div>
        ) : null}

        <div
          role="listbox"
          aria-multiselectable="true"
          aria-labelledby={params.headingId}
          className="flex-1 min-h-[180px] max-h-72 overflow-y-auto space-y-1.5 pr-0.5"
        >
          {params.totalCount === 0 ? (
            <div className="prism-well rounded-2xl px-3 py-8 text-center text-xs text-slate-500 dark:text-slate-400">
              {params.emptyPoolLabel}
            </div>
          ) : params.filteredItems.length === 0 ? (
            <div className="prism-well rounded-2xl px-3 py-8 text-center text-xs text-slate-500 dark:text-slate-400">
              No matching items
            </div>
          ) : (
            params.filteredItems.map((item) => {
              const isDisabled = Boolean(item.disabled);
              const isChecked = !isDisabled && params.checkedSet.has(item.id);

              return (
                <button
                  key={item.id}
                  type="button"
                  role="option"
                  aria-selected={isChecked}
                  aria-disabled={isDisabled || undefined}
                  disabled={isDisabled}
                  data-checked={isChecked ? 'true' : undefined}
                  data-disabled={isDisabled ? 'true' : undefined}
                  onClick={isDisabled ? undefined : () => params.onToggle(item.id)}
                  className={`prism-focus-ring w-full px-3 py-2.5 rounded-2xl flex items-start gap-3 text-left transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:bg-white/60 dark:enabled:hover:bg-white/10 ${
                    isChecked ? 'bg-white/55 dark:bg-white/10' : ''
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`mt-0.5 w-5 h-5 rounded-[7px] flex items-center justify-center shrink-0 transition-transform ${
                      isChecked
                        ? 'prism-emerald text-white'
                        : 'prism-crystal text-transparent'
                    }`}
                  >
                    <Check
                      className={`w-3.5 h-3.5 stroke-[2.8] ${isChecked ? 'opacity-100' : 'opacity-0'}`}
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {item.label}
                    </span>
                    {item.description ? (
                      <span className="block text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {item.description}
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </section>
    );
  };

  return (
    <div ref={ref} role="group" aria-label={ariaLabel} {...rest} {...merged}>
      {renderPool({
        side: 'available',
        title: availableTitle,
        headingId: availableHeadingId,
        totalCount: availableItems.length,
        checkedCount: activeLeftCheckedIds.length,
        filteredItems: filteredAvailable,
        checkedSet: leftChecked,
        onToggle: toggleLeftItem,
        query: availableQuery,
        onQueryChange: setAvailableQuery,
        emptyPoolLabel: `No items in ${availableTitle}`,
      })}

      <div
        role="toolbar"
        aria-label="Transfer controls"
        className="flex flex-row md:flex-col items-center justify-center gap-2 py-1"
      >
        <button
          type="button"
          data-action="move-checked-right"
          disabled={activeLeftCheckedIds.length === 0}
          aria-label={`Move checked items to ${selectedTitle}`}
          onClick={activeLeftCheckedIds.length > 0 ? handleMoveCheckedRight : undefined}
          className="prism-crystal prism-focus-ring h-10 w-10 rounded-full inline-flex items-center justify-center text-slate-700 dark:text-slate-100 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed enabled:hover:scale-105 transition-transform"
        >
          <ChevronRight aria-hidden="true" className="w-4 h-4" />
        </button>

        <button
          type="button"
          data-action="move-all-right"
          disabled={eligibleAvailable.length === 0}
          aria-label={`Move all enabled items to ${selectedTitle}`}
          onClick={eligibleAvailable.length > 0 ? handleMoveAllRight : undefined}
          className="prism-crystal prism-focus-ring h-10 w-10 rounded-full inline-flex items-center justify-center text-slate-700 dark:text-slate-100 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed enabled:hover:scale-105 transition-transform"
        >
          <ChevronsRight aria-hidden="true" className="w-4 h-4" />
        </button>

        <button
          type="button"
          data-action="move-checked-left"
          disabled={activeRightCheckedIds.length === 0}
          aria-label={`Move checked items to ${availableTitle}`}
          onClick={activeRightCheckedIds.length > 0 ? handleMoveCheckedLeft : undefined}
          className="prism-crystal prism-focus-ring h-10 w-10 rounded-full inline-flex items-center justify-center text-slate-700 dark:text-slate-100 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed enabled:hover:scale-105 transition-transform"
        >
          <ChevronLeft aria-hidden="true" className="w-4 h-4" />
        </button>

        <button
          type="button"
          data-action="move-all-left"
          disabled={eligibleSelected.length === 0}
          aria-label={`Move all enabled items to ${availableTitle}`}
          onClick={eligibleSelected.length > 0 ? handleMoveAllLeft : undefined}
          className="prism-crystal prism-focus-ring h-10 w-10 rounded-full inline-flex items-center justify-center text-slate-700 dark:text-slate-100 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed enabled:hover:scale-105 transition-transform"
        >
          <ChevronsLeft aria-hidden="true" className="w-4 h-4" />
        </button>
      </div>

      {renderPool({
        side: 'selected',
        title: selectedTitle,
        headingId: selectedHeadingId,
        totalCount: selectedItems.length,
        checkedCount: activeRightCheckedIds.length,
        filteredItems: filteredSelected,
        checkedSet: rightChecked,
        onToggle: toggleRightItem,
        query: selectedQuery,
        onQueryChange: setSelectedQuery,
        emptyPoolLabel: `No items in ${selectedTitle}`,
      })}

      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
    </div>
  );
}

export const TransferList = /*#__PURE__*/ memoWithDisplayName(TransferListInner, 'TransferList');
