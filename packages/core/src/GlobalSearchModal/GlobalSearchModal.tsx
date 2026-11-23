'use client';

import { memo, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Clock, Search, X } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { composeEventHandlers } from '../utils/composeEventHandlers';
import { mergeProps } from '../utils/mergeProps';
import { splitLiteralHighlight } from '../utils/sanitize';
import { themeProps } from '../utils/themeProps';

export interface GlobalSearchItem {
  /** Unique identifier for the searchable entry. */
  id: string;
  /** Primary title matched and highlighted against the active search query. */
  title: string;
  /** Optional secondary description matched and highlighted against the query. */
  subtitle?: string;
  /** Category/type used for filter tabs and grouped result sections. */
  type: string;
  /** Optional keyboard shortcut badge rendered on the trailing edge. */
  shortcut?: string;
  /** Optional trailing metadata tag (e.g., workspace, path, or timestamp). */
  meta?: string;
}

type GlobalSearchModalBaseProps = Omit<BaseProps<HTMLDivElement>, 'children' | 'onSelect'>;

export interface GlobalSearchModalProps extends GlobalSearchModalBaseProps {
  /** Controls visibility of the global search modal overlay. */
  open: boolean;
  /** Callback invoked when the modal is dismissed via Escape, backdrop click, close button, or selection. */
  onClose: () => void;
  /** Searchable items dynamically grouped and filtered by their `type` field. */
  items: ReadonlyArray<GlobalSearchItem>;
  /** Callback invoked with the chosen item before closing the modal. */
  onSelectItem: (item: GlobalSearchItem) => void;
  /** Optional recent search queries surfaced as quick-fill chips when the query is empty. */
  recentQueries?: ReadonlyArray<string>;
  /** Placeholder text displayed in the search input well. */
  placeholder?: string;
  /** Optional custom empty-state message when no items match. */
  emptyMessage?: string;
}

interface HighlightChunk {
  key: string;
  text: string;
  highlighted: boolean;
}

function buildHighlightChunks(source: string, query: string): HighlightChunk[] {
  const segments = splitLiteralHighlight(source, query);
  let offset = 0;
  return segments.map((seg) => {
    const start = offset;
    offset += seg.text.length;
    return {
      key: `${start}-${seg.highlighted ? 'h' : 'n'}-${seg.text.length}`,
      text: seg.text,
      highlighted: seg.highlighted,
    };
  });
}

function renderHighlightedText(source: string, query: string) {
  const chunks = buildHighlightChunks(source, query);
  return chunks.map((chunk) =>
    chunk.highlighted ? (
      <mark
        key={chunk.key}
        className="bg-amber-200/80 dark:bg-amber-400/25 text-slate-950 dark:text-amber-100 rounded-sm px-0.5 font-semibold"
      >
        {chunk.text}
      </mark>
    ) : (
      <span key={chunk.key}>{chunk.text}</span>
    )
  );
}

function GlobalSearchModalInner({
  open,
  onClose,
  items,
  onSelectItem,
  recentQueries,
  placeholder = 'Search files, people, components, settings...',
  emptyMessage,
  onClick,
  className,
  style,
  xstyle,
  'aria-label': ariaLabelProp,
  ref,
  ...rest
}: GlobalSearchModalProps) {
  const [query, setQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const override = useComponentOverride('GlobalSearchModal');

  useEffect(() => {
    if (!open) return undefined;
    setQuery('');
    setSelectedType(null);
    setActiveIndex(0);
    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 20);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const handleWindowKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleWindowKeyDown);
    return () => window.removeEventListener('keydown', handleWindowKeyDown);
  }, [open, onClose]);

  const cleanRecentQueries = useMemo(() => {
    if (!recentQueries || recentQueries.length === 0) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const raw of recentQueries) {
      const trimmed = raw.trim();
      if (!trimmed || seen.has(trimmed)) continue;
      seen.add(trimmed);
      out.push(trimmed);
    }
    return out;
  }, [recentQueries]);

  const trimmedQuery = query.trim();
  const lowerQuery = trimmedQuery.toLowerCase();

  const queryMatchedItems = useMemo(() => {
    if (!lowerQuery) return items;
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(lowerQuery) ||
        (item.subtitle ? item.subtitle.toLowerCase().includes(lowerQuery) : false) ||
        item.type.toLowerCase().includes(lowerQuery) ||
        (item.meta ? item.meta.toLowerCase().includes(lowerQuery) : false)
    );
  }, [items, lowerQuery]);

  const typeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    const matchedSet = new Set<GlobalSearchItem>(queryMatchedItems);
    for (const item of items) {
      const current = counts.get(item.type) ?? 0;
      counts.set(item.type, current + (matchedSet.has(item) ? 1 : 0));
    }
    return counts;
  }, [items, queryMatchedItems]);

  const activeType =
    selectedType !== null && typeCounts.has(selectedType) ? selectedType : null;

  const { groupedSections, flattenedItems } = useMemo(() => {
    const visible =
      activeType === null
        ? queryMatchedItems
        : queryMatchedItems.filter((item) => item.type === activeType);

    const grouped = new Map<string, GlobalSearchItem[]>();
    for (const item of visible) {
      const bucket = grouped.get(item.type);
      if (bucket) {
        bucket.push(item);
      } else {
        grouped.set(item.type, [item]);
      }
    }

    const flattened: GlobalSearchItem[] = [];
    const sections: Array<{
      type: string;
      entries: Array<{ item: GlobalSearchItem; flatIndex: number }>;
    }> = [];

    for (const [groupType, groupItems] of grouped.entries()) {
      const entries = groupItems.map((item) => {
        const flatIndex = flattened.length;
        flattened.push(item);
        return { item, flatIndex };
      });
      sections.push({ type: groupType, entries });
    }

    return {
      groupedSections: sections,
      flattenedItems: flattened,
    };
  }, [queryMatchedItems, activeType]);

  if (!open) return null;

  const clampedIndex =
    flattenedItems.length > 0 ? Math.min(Math.max(activeIndex, 0), flattenedItems.length - 1) : 0;

  const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'ArrowDown' && flattenedItems.length > 0) {
      e.preventDefault();
      setActiveIndex((clampedIndex + 1) % flattenedItems.length);
    } else if (e.key === 'ArrowUp' && flattenedItems.length > 0) {
      e.preventDefault();
      setActiveIndex((clampedIndex - 1 + flattenedItems.length) % flattenedItems.length);
    } else if (e.key === 'Enter') {
      const target = flattenedItems[clampedIndex];
      if (target) {
        e.preventDefault();
        onSelectItem(target);
        onClose();
      }
    }
  };

  const merged = mergeProps({
    themeTarget: themeProps('global-search-modal', { open }),
    baseClassName:
      'fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 prism-backdrop-scrim',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const resolvedEmptyMessage =
    emptyMessage ??
    (trimmedQuery
      ? `No results matching "${trimmedQuery}"`
      : 'No searchable items available.');

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabelProp ?? 'Global Search'}
      onClick={composeEventHandlers(onClick, () => onClose())}
      {...rest}
      {...merged}
    >
      <div
        className="prism-slab w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Recessed Search Well */}
        <div className="p-3 pb-2.5 border-b border-slate-200/60 dark:border-slate-700/50 space-y-2.5">
          <div className="prism-well rounded-full h-12 px-4 flex items-center gap-3">
            <Search
              className="w-4 h-4 text-slate-600 dark:text-slate-300 shrink-0"
              aria-hidden="true"
            />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={handleInputKeyDown}
              placeholder={placeholder}
              aria-label="Global search query"
              className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none"
            />
            {query ? (
              <button
                type="button"
                aria-label="Clear search query"
                onClick={() => {
                  setQuery('');
                  setActiveIndex(0);
                  inputRef.current?.focus();
                }}
                className="prism-focus-ring rounded-full text-slate-500 hover:text-slate-800 dark:hover:text-white p-1 cursor-pointer shrink-0"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="prism-focus-ring text-[11px] font-mono text-slate-500 hover:text-slate-800 dark:hover:text-white px-2 py-0.5 rounded-md border border-slate-300/60 dark:border-slate-700 cursor-pointer shrink-0"
            >
              ESC
            </button>
          </div>

          {/* Instant Category Filter Tabs */}
          <div
            role="tablist"
            aria-label="Filter results by category"
            className="flex items-center gap-1.5 overflow-x-auto pb-0.5"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeType === null}
              onClick={() => {
                setSelectedType(null);
                setActiveIndex(0);
              }}
              className={`prism-focus-ring inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-xs font-medium whitespace-nowrap transition-[color,background-color,border-color,opacity,transform] cursor-pointer shrink-0 ${
                activeType === null
                  ? 'prism-emerald text-white'
                  : 'prism-crystal text-slate-700 dark:text-slate-200'
              }`}
            >
              <span>All</span>
              <span className="tabular-nums opacity-85">{queryMatchedItems.length}</span>
            </button>

            {Array.from(typeCounts.entries()).map(([typeName, count]) => {
              const isSelected = activeType === typeName;
              return (
                <button
                  key={typeName}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => {
                    setSelectedType(typeName);
                    setActiveIndex(0);
                  }}
                  className={`prism-focus-ring inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-xs font-medium whitespace-nowrap transition-[color,background-color,border-color,opacity,transform] cursor-pointer shrink-0 ${
                    isSelected
                      ? 'prism-emerald text-white'
                      : 'prism-crystal text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <span>{typeName}</span>
                  <span className="tabular-nums opacity-85">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Recent Queries Quick-Fill Chips */}
        {!trimmedQuery && cleanRecentQueries.length > 0 ? (
          <div className="px-3.5 py-2.5 border-b border-slate-200/50 dark:border-slate-700/40 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mr-1">
              <Clock className="w-3 h-3" aria-hidden="true" />
              Recent
            </span>
            {cleanRecentQueries.map((recent) => (
              <button
                key={recent}
                type="button"
                onClick={() => {
                  setQuery(recent);
                  setActiveIndex(0);
                  inputRef.current?.focus();
                }}
                className="prism-crystal prism-focus-ring h-7 px-2.5 rounded-full text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-white/75 dark:hover:bg-white/15 transition-colors cursor-pointer"
              >
                {recent}
              </button>
            ))}
          </div>
        ) : null}

        {/* Grouped Results List */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
          {groupedSections.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500 dark:text-slate-400">
              {resolvedEmptyMessage}
            </div>
          ) : (
            groupedSections.map((section) => (
              <section key={section.type} aria-label={section.type} className="space-y-1">
                <div className="px-2.5 pt-1 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <span>{section.type}</span>
                  <span className="tabular-nums">{section.entries.length}</span>
                </div>
                <div className="space-y-0.5">
                  {section.entries.map(({ item, flatIndex }) => {
                    const isHighlighted = flatIndex === clampedIndex;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        data-highlighted={isHighlighted ? 'true' : undefined}
                        onMouseEnter={() => setActiveIndex(flatIndex)}
                        onClick={() => {
                          onSelectItem(item);
                          onClose();
                        }}
                        className={`prism-focus-ring w-full px-3.5 py-2.5 rounded-2xl flex items-center justify-between gap-3 text-left transition-colors cursor-pointer hover:bg-white/65 dark:hover:bg-white/10 ${
                          isHighlighted ? 'bg-white/65 dark:bg-white/10' : ''
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                            {renderHighlightedText(item.title, trimmedQuery)}
                          </div>
                          {item.subtitle ? (
                            <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                              {renderHighlightedText(item.subtitle, trimmedQuery)}
                            </div>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {item.meta ? (
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                              {item.meta}
                            </span>
                          ) : null}
                          {item.shortcut ? (
                            <kbd className="text-[11px] font-mono text-slate-500 dark:text-slate-300 px-1.5 py-0.5 rounded-md border border-slate-300/60 dark:border-slate-700 bg-white/50 dark:bg-white/5">
                              {item.shortcut}
                            </kbd>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </div>

        {/* Footer Keyboard Legend */}
        <div className="px-4 py-2.5 border-t border-slate-200/60 dark:border-slate-700/50 flex items-center justify-between gap-3 text-[11px] text-slate-500 dark:text-slate-400">
          <span>↑↓ Navigate · ↵ Open · Esc Close</span>
          <span className="tabular-nums">
            {flattenedItems.length} {flattenedItems.length === 1 ? 'result' : 'results'}
          </span>
        </div>
      </div>
    </div>
  );
}

export const GlobalSearchModal = memo(GlobalSearchModalInner);
GlobalSearchModal.displayName = 'GlobalSearchModal';
