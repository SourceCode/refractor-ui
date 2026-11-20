'use client';

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight, GripVertical, Plus } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';

export type KanbanPriority = 'low' | 'medium' | 'high' | 'critical';

export interface KanbanCardItem {
  id: string;
  columnId: string;
  title: string;
  description?: string;
  assignee?: string;
  priority?: KanbanPriority;
  tags?: ReadonlyArray<string>;
}

export interface KanbanColumnDef {
  id: string;
  title: string;
  wipLimit?: number;
}

export interface KanbanBoardProps extends BaseProps<HTMLDivElement> {
  /** Ordered workflow columns rendered left-to-right. */
  columns: ReadonlyArray<KanbanColumnDef>;
  /** Controlled array of cards across columns. */
  cards?: ReadonlyArray<KanbanCardItem>;
  /** Initial cards when operating in uncontrolled mode. */
  defaultCards?: ReadonlyArray<KanbanCardItem>;
  /** Fired whenever cards are added or moved between columns. */
  onCardsChange?: (cards: KanbanCardItem[]) => void;
  /** Fired when a card transitions from one valid column to another. */
  onCardMove?: (cardId: string, fromColumnId: string, toColumnId: string) => void;
  /** Fired when a new card is submitted through a column's inline Quick Add bar. */
  onCardAdd?: (columnId: string, title: string) => void;
  /** Fired when a card's title trigger is activated. */
  onCardSelect?: (card: KanbanCardItem) => void;
  /** Enables recessed inline Quick Add controls at the bottom of each column (defaults to true). */
  allowQuickAdd?: boolean;
}

interface TaggedEntry {
  key: string;
  label: string;
}

function getPriorityToken(priority: KanbanPriority): string {
  switch (priority) {
    case 'critical':
      return 'var(--prism-error-main)';
    case 'high':
      return 'var(--prism-primary-main)';
    case 'low':
      return 'var(--prism-success-main)';
    default:
      return 'var(--prism-warning-main)';
  }
}

function buildUniqueTagEntries(cardId: string, tags: ReadonlyArray<string>): TaggedEntry[] {
  const counts = new Map<string, number>();
  const entries: TaggedEntry[] = [];
  for (const tag of tags) {
    const trimmed = tag.trim();
    if (!trimmed) continue;
    const seen = (counts.get(trimmed) ?? 0) + 1;
    counts.set(trimmed, seen);
    entries.push({ key: `${cardId}::${trimmed}::${seen}`, label: trimmed });
  }
  return entries;
}

export function KanbanBoard({
  columns,
  cards,
  defaultCards,
  onCardsChange,
  onCardMove,
  onCardAdd,
  onCardSelect,
  allowQuickAdd = true,
  className,
  style,
  xstyle,
  'aria-label': ariaLabel = 'Kanban board',
  ref,
  ...rest
}: KanbanBoardProps) {
  const override = useComponentOverride('KanbanBoard');
  const idSeqRef = useRef(1);
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [dropColumnId, setDropColumnId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Map<string, string>>(() => new Map());

  const controlledCards = useMemo(
    () => (cards !== undefined ? [...cards] : undefined),
    [cards]
  );
  const initialCards = useMemo(
    () => (defaultCards !== undefined ? [...defaultCards] : []),
    [defaultCards]
  );

  const [currentCards, setCurrentCards] = useControllableState<KanbanCardItem[]>({
    value: controlledCards,
    defaultValue: initialCards,
    onChange: onCardsChange,
  });

  const uniqueColumns = useMemo(() => {
    const seen = new Set<string>();
    const out: KanbanColumnDef[] = [];
    for (const col of columns) {
      if (!seen.has(col.id)) {
        seen.add(col.id);
        out.push(col);
      }
    }
    return out;
  }, [columns]);

  const columnIdSet = useMemo(
    () => new Set(uniqueColumns.map((col) => col.id)),
    [uniqueColumns]
  );

  const cardsByColumn = useMemo(() => {
    const map = new Map<string, KanbanCardItem[]>();
    for (const col of uniqueColumns) {
      map.set(col.id, []);
    }
    for (const card of currentCards) {
      const bucket = map.get(card.columnId);
      if (bucket) {
        bucket.push(card);
      }
    }
    return map;
  }, [uniqueColumns, currentCards]);

  const moveCard = useCallback(
    (cardId: string, toColumnId: string) => {
      if (!columnIdSet.has(toColumnId)) return;
      const existing = currentCards.find((card) => card.id === cardId);
      if (!existing || existing.columnId === toColumnId) return;

      const fromColumnId = existing.columnId;
      const nextCards = currentCards.map((card) =>
        card.id === cardId ? { ...card, columnId: toColumnId } : card
      );
      setCurrentCards(nextCards);
      onCardMove?.(cardId, fromColumnId, toColumnId);
    },
    [columnIdSet, currentCards, onCardMove, setCurrentCards]
  );

  const setColumnDraft = useCallback((columnId: string, value: string) => {
    setDrafts((prev) => {
      const next = new Map(prev);
      next.set(columnId, value);
      return next;
    });
  }, []);

  const handleQuickAdd = useCallback(
    (columnId: string) => {
      const rawTitle = drafts.get(columnId) ?? '';
      const trimmedTitle = rawTitle.trim();
      if (!trimmedTitle) return;

      const existingIds = new Set(currentCards.map((card) => card.id));
      let nextId = `kanban-card-${idSeqRef.current}`;
      while (existingIds.has(nextId)) {
        idSeqRef.current += 1;
        nextId = `kanban-card-${idSeqRef.current}`;
      }
      idSeqRef.current += 1;

      const created: KanbanCardItem = {
        id: nextId,
        columnId,
        title: trimmedTitle,
        priority: 'medium',
      };

      setCurrentCards([...currentCards, created]);
      onCardAdd?.(columnId, trimmedTitle);
      setColumnDraft(columnId, '');
    },
    [currentCards, drafts, onCardAdd, setColumnDraft, setCurrentCards]
  );

  const handleDragStart = (e: DragEvent<HTMLElement>, cardId: string) => {
    setDraggedCardId(cardId);
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', cardId);
    }
  };

  const handleDragEnd = () => {
    setDraggedCardId(null);
    setDropColumnId(null);
  };

  const handleColumnDragOver = (e: DragEvent<HTMLElement>, columnId: string) => {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
    if (dropColumnId !== columnId) {
      setDropColumnId(columnId);
    }
  };

  const handleColumnDragLeave = (e: DragEvent<HTMLElement>, columnId: string) => {
    const nextTarget = e.relatedTarget;
    if (!(nextTarget instanceof Node) || !e.currentTarget.contains(nextTarget)) {
      setDropColumnId((prev) => (prev === columnId ? null : prev));
    }
  };

  const handleColumnDrop = (e: DragEvent<HTMLElement>, columnId: string) => {
    e.preventDefault();
    const transferCardId = e.dataTransfer ? e.dataTransfer.getData('text/plain') : '';
    const transferTargetColumn = e.dataTransfer
      ? e.dataTransfer.getData('application/x-refractor-column')
      : '';
    const resolvedCardId = transferCardId || draggedCardId;
    const resolvedColumnId = transferTargetColumn || columnId;
    setDropColumnId(null);
    setDraggedCardId(null);
    if (resolvedCardId) {
      moveCard(resolvedCardId, resolvedColumnId);
    }
  };

  const handleQuickAddKeyDown = (e: KeyboardEvent<HTMLInputElement>, columnId: string) => {
    if (e.key === 'Enter') {
      if (e.nativeEvent.isComposing) {
        e.preventDefault();
        return;
      }
      e.preventDefault();
      handleQuickAdd(columnId);
    }
  };

  const handleQuickAddSubmit = (e: FormEvent<HTMLFormElement>, columnId: string) => {
    e.preventDefault();
    handleQuickAdd(columnId);
  };

  const merged = mergeProps({
    themeTarget: themeProps('kanban-board', {
      columnCount: uniqueColumns.length,
      cardCount: currentCards.length,
      allowQuickAdd,
    }),
    baseClassName: 'w-full overflow-x-auto pb-2',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div ref={ref} role="region" aria-label={ariaLabel} {...rest} {...merged}>
      {uniqueColumns.length === 0 ? (
        <div className="prism-slab p-6 text-center text-xs text-slate-500 dark:text-slate-400">
          No workflow columns configured.
        </div>
      ) : (
        <div className="flex items-start gap-4 min-w-max">
          {uniqueColumns.map((column, colIndex) => {
            const columnCards = cardsByColumn.get(column.id) ?? [];
            const safeWipLimit =
              column.wipLimit !== undefined &&
              Number.isFinite(column.wipLimit) &&
              column.wipLimit >= 0
                ? Math.floor(column.wipLimit)
                : undefined;
            const wipExceeded = safeWipLimit !== undefined && columnCards.length > safeWipLimit;
            const isDropTarget = dropColumnId === column.id;
            const prevCol = colIndex > 0 ? uniqueColumns[colIndex - 1] : undefined;
            const nextCol =
              colIndex < uniqueColumns.length - 1 ? uniqueColumns[colIndex + 1] : undefined;
            const draftValue = drafts.get(column.id) ?? '';

            const columnTarget = themeProps(
              'kanban-board',
              {
                columnId: column.id,
                wipExceeded,
                dropTarget: isDropTarget,
              },
              'column'
            );

            return (
              <section
                key={column.id}
                aria-label={column.title}
                onDragOver={(e) => handleColumnDragOver(e, column.id)}
                onDragLeave={(e) => handleColumnDragLeave(e, column.id)}
                onDrop={(e) => handleColumnDrop(e, column.id)}
                {...mergeProps({
                  themeTarget: columnTarget,
                  baseClassName: `prism-slab p-3.5 w-72 shrink-0 flex flex-col gap-3 transition-all ${
                    isDropTarget
                      ? 'ring-2 ring-sky-400/80 dark:ring-sky-400/70 scale-[1.01]'
                      : wipExceeded
                        ? 'ring-2 ring-amber-500/80 dark:ring-amber-400/80'
                        : ''
                  }`,
                })}
              >
                <header className="prism-crystal rounded-2xl px-3 py-2 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                    {column.title}
                  </h3>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-xs tabular-nums shrink-0 ${
                      wipExceeded
                        ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 font-semibold'
                        : 'prism-well text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {wipExceeded ? (
                      <AlertTriangle aria-hidden="true" className="w-3 h-3 shrink-0" />
                    ) : null}
                    <span>
                      {safeWipLimit !== undefined
                        ? `${columnCards.length}/${safeWipLimit}`
                        : String(columnCards.length)}
                    </span>
                    {wipExceeded ? <span className="sr-only">WIP limit exceeded</span> : null}
                  </span>
                </header>

                <div className="flex flex-col gap-2.5 min-h-[68px]">
                  {columnCards.length === 0 ? (
                    <div className="prism-well rounded-2xl px-3 py-5 text-center text-xs text-slate-500 dark:text-slate-400 border border-dashed border-slate-300/60 dark:border-slate-600/50">
                      Drop cards here
                    </div>
                  ) : (
                    columnCards.map((card) => {
                      const priority: KanbanPriority = card.priority ?? 'medium';
                      const isDragging = draggedCardId === card.id;
                      const tagEntries = card.tags ? buildUniqueTagEntries(card.id, card.tags) : [];

                      const cardTarget = themeProps(
                        'kanban-board',
                        {
                          cardId: card.id,
                          priority,
                          dragging: isDragging,
                        },
                        'card'
                      );

                      return (
                        <article
                          key={card.id}
                          draggable
                          aria-label={card.title}
                          onDragStart={(e) => handleDragStart(e, card.id)}
                          onDragEnd={handleDragEnd}
                          {...mergeProps({
                            themeTarget: cardTarget,
                            baseClassName: `prism-crystal rounded-2xl p-3 space-y-2 transition-all ${
                              isDragging ? 'opacity-60 scale-[0.98]' : ''
                            }`,
                          })}
                        >
                          <div className="flex items-start gap-2">
                            <span
                              aria-hidden="true"
                              className="mt-1 w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: getPriorityToken(priority) }}
                            />
                            <button
                              type="button"
                              onClick={() => onCardSelect?.(card)}
                              className="prism-focus-ring flex-1 min-w-0 text-left text-sm font-semibold text-slate-900 dark:text-white leading-snug rounded cursor-pointer hover:underline"
                            >
                              {card.title}
                            </button>
                            <GripVertical
                              aria-hidden="true"
                              className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5"
                            />
                          </div>

                          {card.description ? (
                            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                              {card.description}
                            </p>
                          ) : null}

                          {tagEntries.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {tagEntries.map((tagEntry) => (
                                <span
                                  key={tagEntry.key}
                                  className="prism-well px-2 py-0.5 rounded-full text-[10px] font-medium text-slate-700 dark:text-slate-200"
                                >
                                  {tagEntry.label}
                                </span>
                              ))}
                            </div>
                          ) : null}

                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-300/40 dark:border-slate-700/50">
                            <div className="flex items-center gap-1.5 min-w-0">
                              {card.assignee ? (
                                <span className="prism-well px-2 py-0.5 rounded-full text-[11px] font-medium text-slate-700 dark:text-slate-200 truncate max-w-[120px]">
                                  {card.assignee}
                                </span>
                              ) : null}
                              <span className="text-[10px] font-mono uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                {priority}
                              </span>
                            </div>

                            <div className="inline-flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                disabled={!prevCol}
                                aria-label={
                                  prevCol
                                    ? `Move ${card.title} left to ${prevCol.title}`
                                    : `Move ${card.title} left`
                                }
                                onClick={prevCol ? () => moveCard(card.id, prevCol.id) : undefined}
                                className="prism-crystal prism-focus-ring h-7 w-7 rounded-full inline-flex items-center justify-center text-slate-700 dark:text-slate-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed enabled:hover:scale-105 transition-transform"
                              >
                                <ChevronLeft aria-hidden="true" className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={!nextCol}
                                aria-label={
                                  nextCol
                                    ? `Move ${card.title} right to ${nextCol.title}`
                                    : `Move ${card.title} right`
                                }
                                onClick={nextCol ? () => moveCard(card.id, nextCol.id) : undefined}
                                className="prism-crystal prism-focus-ring h-7 w-7 rounded-full inline-flex items-center justify-center text-slate-700 dark:text-slate-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed enabled:hover:scale-105 transition-transform"
                              >
                                <ChevronRight aria-hidden="true" className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>

                {allowQuickAdd ? (
                  <form
                    onSubmit={(e) => handleQuickAddSubmit(e, column.id)}
                    className="flex items-center gap-1.5 pt-1"
                  >
                    <input
                      type="text"
                      value={draftValue}
                      onChange={(e) => setColumnDraft(column.id, e.target.value)}
                      onKeyDown={(e) => handleQuickAddKeyDown(e, column.id)}
                      placeholder={`Add to ${column.title}...`}
                      aria-label={`Quick add card to ${column.title}`}
                      className="prism-well prism-focus-ring flex-1 min-w-0 h-8 px-3 rounded-full text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={draftValue.trim().length === 0}
                      aria-label={`Add card to ${column.title}`}
                      className="prism-btn-secondary prism-focus-ring h-8 px-2.5 text-xs font-medium inline-flex items-center gap-1 shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                    >
                      <Plus aria-hidden="true" className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  </form>
                ) : null}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

KanbanBoard.displayName = 'KanbanBoard';
