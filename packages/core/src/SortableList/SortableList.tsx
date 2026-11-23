'use client';

import {
  useMemo,
  useState,
  type DragEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { ChevronDown, ChevronUp, GripVertical, Lock } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { mergeProps } from '../utils/mergeProps';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export interface SortableListItem {
  /** Unique identifier used for React keys, drag lookup, and deduplication. */
  id: string;
  /** Primary title rendered on the row and spoken in live reorder announcements. */
  title: string;
  /** Optional secondary line rendered beneath the title. */
  subtitle?: string;
  /** Optional badge pill rendered beside the title. */
  badge?: string;
  /** Pins the item in place, preventing drags, drops, and keyboard/button moves. */
  locked?: boolean;
}

type SortableListBaseProps = Omit<BaseProps<HTMLDivElement>, 'children' | 'onChange'>;

export interface SortableListProps<T extends SortableListItem = SortableListItem>
  extends SortableListBaseProps {
  /** Controlled ordered list of sortable items. */
  items?: ReadonlyArray<T>;
  /** Initial ordered items when operating in uncontrolled mode. */
  defaultItems?: ReadonlyArray<T>;
  /** Fired whenever an unlocked item moves to a new valid unlocked position. */
  onReorder?: (nextItems: T[], fromIndex: number, toIndex: number) => void;
  /** Optional custom renderer for row content beside the rank orb and controls. */
  renderItem?: (item: T, index: number) => ReactNode;
  /** Accessible label applied to the ordered list (defaults to 'Sortable priority list'). */
  ariaLabel?: string;
  /** Message displayed inside the recessed empty state when the list has no items. */
  emptyMessage?: string;
}

function dedupeItems<T extends SortableListItem>(list: ReadonlyArray<T> | undefined): T[] {
  if (!list || list.length === 0) return [];
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of list) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      out.push(item);
    }
  }
  return out;
}

function SortableListInner<T extends SortableListItem = SortableListItem>({
  items,
  defaultItems,
  onReorder,
  renderItem,
  ariaLabel = 'Sortable priority list',
  emptyMessage = 'No items to reorder.',
  className,
  style,
  xstyle,
  'aria-label': nativeAriaLabel,
  ref,
  ...rest
}: SortableListProps<T>) {
  const override = useComponentOverride('SortableList');
  const isControlled = items !== undefined;
  const [internalItems, setInternalItems] = useState<T[]>(() => dedupeItems(defaultItems));
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState('');

  const currentItems = useMemo(
    () => (isControlled ? dedupeItems(items) : internalItems),
    [isControlled, items, internalItems]
  );

  const moveItem = (fromIndex: number, toIndex: number) => {
    if (
      !Number.isInteger(fromIndex) ||
      !Number.isInteger(toIndex) ||
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= currentItems.length ||
      toIndex >= currentItems.length ||
      fromIndex === toIndex
    ) {
      return;
    }

    const sourceItem = currentItems[fromIndex];
    const targetItem = currentItems[toIndex];
    if (!sourceItem || !targetItem || sourceItem.locked || targetItem.locked) {
      return;
    }

    const nextItems = [...currentItems];
    nextItems.splice(fromIndex, 1);
    nextItems.splice(toIndex, 0, sourceItem);

    if (!isControlled) {
      setInternalItems(nextItems);
    }
    setAnnouncement(`Moved ${sourceItem.title} to position ${toIndex + 1} of ${nextItems.length}`);
    onReorder?.(nextItems, fromIndex, toIndex);
  };

  const handleDragStart = (e: DragEvent<HTMLLIElement>, index: number, item: T) => {
    if (item.locked) {
      e.preventDefault();
      return;
    }
    setDraggedIndex(index);
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(index));
      e.dataTransfer.setData('application/x-refractor-sortable-id', item.id);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLLIElement>, index: number, item: T) => {
    if (item.locked) {
      return;
    }
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
    if (dropTargetIndex !== index) {
      setDropTargetIndex(index);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLLIElement>, index: number) => {
    const nextTarget = e.relatedTarget;
    if (!(nextTarget instanceof Node) || !e.currentTarget.contains(nextTarget)) {
      setDropTargetIndex((prev) => (prev === index ? null : prev));
    }
  };

  const handleDrop = (e: DragEvent<HTMLLIElement>, targetIndex: number) => {
    e.preventDefault();
    let resolvedFromIndex: number | null = draggedIndex;

    if (e.dataTransfer) {
      const transferId = e.dataTransfer.getData('application/x-refractor-sortable-id');
      const transferText = e.dataTransfer.getData('text/plain');
      if (transferId) {
        resolvedFromIndex = currentItems.findIndex((entry) => entry.id === transferId);
      } else if (transferText) {
        const trimmed = transferText.trim();
        resolvedFromIndex = /^-?\d+$/.test(trimmed) ? Number.parseInt(trimmed, 10) : -1;
      }
    }

    setDraggedIndex(null);
    setDropTargetIndex(null);

    if (resolvedFromIndex !== null) {
      moveItem(resolvedFromIndex, targetIndex);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDropTargetIndex(null);
  };

  const handleGrabKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!e.altKey) return;
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      moveItem(index, index - 1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      moveItem(index, index + 1);
    }
  };

  const resolvedAriaLabel = nativeAriaLabel ?? ariaLabel;

  const merged = mergeProps({
    themeTarget: themeProps('sortable-list', {
      count: currentItems.length,
      empty: currentItems.length === 0,
    }),
    baseClassName: 'prism-slab p-3.5 w-full',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div ref={ref} {...rest} {...merged}>
      {currentItems.length === 0 ? (
        <div className="prism-well rounded-2xl px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
          {emptyMessage}
        </div>
      ) : (
        <ol aria-label={resolvedAriaLabel} className="flex flex-col gap-2.5">
          {currentItems.map((item, index) => {
            const isLocked = Boolean(item.locked);
            const isDragging = draggedIndex === index;
            const isDropTarget = dropTargetIndex === index && !isLocked && draggedIndex !== index;
            const prevLocked = index > 0 && Boolean(currentItems[index - 1]?.locked);
            const nextLocked =
              index < currentItems.length - 1 && Boolean(currentItems[index + 1]?.locked);
            const upDisabled = isLocked || index === 0 || prevLocked;
            const downDisabled = isLocked || index === currentItems.length - 1 || nextLocked;

            const rowTarget = themeProps(
              'sortable-list',
              {
                itemId: item.id,
                locked: isLocked,
                dragging: isDragging,
                dropTarget: isDropTarget,
              },
              'item'
            );

            return (
              <li
                key={item.id}
                draggable={!isLocked}
                onDragStart={(e) => handleDragStart(e, index, item)}
                onDragOver={(e) => handleDragOver(e, index, item)}
                onDragLeave={(e) => handleDragLeave(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                {...mergeProps({
                  themeTarget: rowTarget,
                  baseClassName: `prism-crystal rounded-2xl px-3 py-2.5 flex items-center gap-3 transition-[color,background-color,border-color,opacity,transform] ${
                    isDragging ? 'opacity-60 scale-[0.98]' : ''
                  } ${
                    isDropTarget ? 'ring-2 ring-sky-400/80 dark:ring-sky-400/70 scale-[1.01]' : ''
                  } ${isLocked ? 'opacity-75' : ''}`,
                })}
              >
                <button
                  type="button"
                  disabled={isLocked}
                  aria-label={
                    isLocked
                      ? `${item.title} is locked`
                      : `Reorder ${item.title} with Alt+ArrowUp or Alt+ArrowDown`
                  }
                  onKeyDown={isLocked ? undefined : (e) => handleGrabKeyDown(e, index)}
                  className="prism-focus-ring w-7 h-7 rounded-xl inline-flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0 cursor-grab active:cursor-grabbing disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:bg-white/50 dark:enabled:hover:bg-white/10"
                >
                  <GripVertical aria-hidden="true" className="w-4 h-4" />
                </button>

                <span
                  aria-hidden="true"
                  className="prism-well h-7 min-w-8 px-2 rounded-full inline-flex items-center justify-center font-mono text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-200 shrink-0"
                >
                  #{index + 1}
                </span>

                <div className="flex-1 min-w-0">
                  {renderItem ? (
                    renderItem(item, index)
                  ) : (
                    <>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {item.title}
                        </span>
                        {item.badge ? (
                          <span className="prism-well px-2 py-0.5 rounded-full text-[11px] font-medium text-slate-700 dark:text-slate-200 shrink-0">
                            {item.badge}
                          </span>
                        ) : null}
                        {isLocked ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 shrink-0">
                            <Lock aria-hidden="true" className="w-3 h-3" />
                            <span>Locked</span>
                          </span>
                        ) : null}
                      </div>
                      {item.subtitle ? (
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {item.subtitle}
                        </p>
                      ) : null}
                    </>
                  )}
                </div>

                <div className="inline-flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    disabled={upDisabled}
                    aria-label={`Move ${item.title} up`}
                    onClick={upDisabled ? undefined : () => moveItem(index, index - 1)}
                    className="prism-crystal prism-focus-ring h-8 w-8 rounded-full inline-flex items-center justify-center text-slate-700 dark:text-slate-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed enabled:hover:scale-105 transition-transform"
                  >
                    <ChevronUp aria-hidden="true" className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={downDisabled}
                    aria-label={`Move ${item.title} down`}
                    onClick={downDisabled ? undefined : () => moveItem(index, index + 1)}
                    className="prism-crystal prism-focus-ring h-8 w-8 rounded-full inline-flex items-center justify-center text-slate-700 dark:text-slate-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed enabled:hover:scale-105 transition-transform"
                  >
                    <ChevronDown aria-hidden="true" className="w-4 h-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
    </div>
  );
}

type SortableListComponent = (<T extends SortableListItem = SortableListItem>(
  props: SortableListProps<T>
) => ReactNode) & { displayName?: string };

export const SortableList = /*#__PURE__*/ memoWithDisplayName(
  SortableListInner,
  'SortableList'
) as SortableListComponent;
