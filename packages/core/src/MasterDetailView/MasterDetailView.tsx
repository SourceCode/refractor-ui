'use client';

import { useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { ArrowLeft, Search, X } from 'lucide-react';
import type { BaseProps, OpticalStyleTokens } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export interface MasterDetailItem {
  /** Stable unique identifier for selection and keyboard focus management. */
  id: string;
  /** Primary visible title displayed in the master list row. */
  title: string;
  /** Optional secondary descriptive line displayed beneath the title. */
  subtitle?: string;
  /** Optional compact status or category pill rendered alongside the title. */
  badge?: string;
  /** Optional trailing tabular metadata (timestamp, count, or identifier). */
  meta?: string;
}

type MasterDetailViewBaseProps = Omit<BaseProps<HTMLDivElement>, 'children'>;

export interface MasterDetailViewProps<T extends MasterDetailItem = MasterDetailItem>
  extends MasterDetailViewBaseProps {
  /** Collection of master records available for selection and filtering. */
  items: ReadonlyArray<T>;
  /** Controlled active item ID, or null when no item is selected. */
  selectedId?: string | null;
  /** Initial active item ID in uncontrolled mode (defaults to `items[0]?.id ?? null`). */
  defaultSelectedId?: string | null;
  /** Callback invoked whenever an item is selected via click or keyboard navigation. */
  onSelectItem?: (item: T) => void;
  /** Render function producing the right-hand detail workspace for the active item. */
  renderDetail: (item: T) => ReactNode;
  /** Optional custom row renderer for master list options. */
  renderItem?: (item: T, selected: boolean) => ReactNode;
  /** Optional heading displayed at the top of the master pane. */
  masterTitle?: string;
  /** Enables the recessed frosted search well to filter master records. */
  searchable?: boolean;
  /** Placeholder text for the master search input. */
  searchPlaceholder?: string;
  /** Empty-state message rendered in the detail canvas when no matching item is selected. */
  emptyDetailMessage?: string;
  /** Empty-state message rendered in the master pane when no items match or exist. */
  emptyListMessage?: string;
  /** Desktop width of the master pane in pixels (clamped 200..480, default 300). */
  masterWidthPx?: number;
}

function matchesSearchQuery(item: MasterDetailItem, normalizedQuery: string): boolean {
  if (item.title.toLowerCase().includes(normalizedQuery)) return true;
  if (item.subtitle && item.subtitle.toLowerCase().includes(normalizedQuery)) return true;
  if (item.badge && item.badge.toLowerCase().includes(normalizedQuery)) return true;
  if (item.meta && item.meta.toLowerCase().includes(normalizedQuery)) return true;
  return false;
}

function MasterDetailViewInner<T extends MasterDetailItem = MasterDetailItem>({
  items,
  selectedId,
  defaultSelectedId,
  onSelectItem,
  renderDetail,
  renderItem,
  masterTitle,
  searchable = true,
  searchPlaceholder = 'Search items...',
  emptyDetailMessage = 'Select an item to view details.',
  emptyListMessage = 'No matching items found.',
  masterWidthPx = 300,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: MasterDetailViewProps<T>) {
  const override = useComponentOverride('MasterDetailView');
  const initialSelectedId =
    defaultSelectedId !== undefined ? defaultSelectedId : (items[0]?.id ?? null);

  const [activeId, setActiveId] = useControllableState<string | null>({
    value: selectedId,
    defaultValue: initialSelectedId,
  });
  const [query, setQuery] = useState('');
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const optionRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const safeMasterWidth = clampNumber(masterWidthPx, 200, 480, 300);

  const filteredItems = useMemo(() => {
    if (!searchable) return items;
    const normalized = query.trim().toLowerCase();
    if (!normalized) return items;
    return items.filter((item) => matchesSearchQuery(item, normalized));
  }, [items, query, searchable]);

  const selectedItem = useMemo(
    () => (activeId !== null ? items.find((item) => item.id === activeId) : undefined),
    [activeId, items]
  );

  const selectItem = (item: T) => {
    setActiveId(item.id);
    setMobileDetailOpen(true);
    onSelectItem?.(item);
  };

  const handleListKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (filteredItems.length === 0) return;

    const currentIndex = filteredItems.findIndex((item) => item.id === activeId);
    let nextIndex: number;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      nextIndex =
        currentIndex === -1 ? 0 : Math.min(filteredItems.length - 1, currentIndex + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      nextIndex =
        currentIndex === -1 ? filteredItems.length - 1 : Math.max(0, currentIndex - 1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      nextIndex = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      nextIndex = filteredItems.length - 1;
    } else {
      return;
    }

    const nextItem = filteredItems[nextIndex];
    if (!nextItem) return;
    selectItem(nextItem);
    optionRefs.current.get(nextItem.id)?.focus();
  };

  const merged = mergeProps({
    themeTarget: themeProps('master-detail-view', {
      empty: items.length === 0,
      hasSelection: Boolean(selectedItem),
      mobileDetailOpen,
    }),
    baseClassName: 'prism-slab overflow-hidden flex flex-col md:flex-row min-h-[360px]',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const masterPaneStyle: OpticalStyleTokens = {
    '--prism-master-width': `${safeMasterWidth}px`,
  };

  return (
    <div ref={ref} {...rest} {...merged}>
      <aside
        data-part="master-pane"
        data-master-width={String(safeMasterWidth)}
        style={masterPaneStyle}
        className={cx(
          'prism-crystal flex-col border-b md:border-b-0 md:border-r border-slate-300/45 dark:border-slate-700/50 md:w-[var(--prism-master-width)] md:shrink-0',
          mobileDetailOpen ? 'hidden md:flex' : 'flex w-full'
        )}
      >
        {masterTitle ? (
          <div className="px-4 pt-3.5 pb-2 flex items-center justify-between gap-2 border-b border-slate-300/35 dark:border-slate-700/45">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-200 truncate">
              {masterTitle}
            </h2>
            <span className="font-mono tabular-nums text-[11px] px-2 py-0.5 rounded-full bg-white/50 dark:bg-white/10 text-slate-600 dark:text-slate-300 shrink-0">
              {filteredItems.length}
            </span>
          </div>
        ) : null}

        {searchable ? (
          <div className="p-3 border-b border-slate-300/35 dark:border-slate-700/45">
            <div className="prism-well rounded-xl h-9 px-3 flex items-center gap-2 focus-within:ring-2 focus-within:ring-sky-400/70">
              <Search
                aria-hidden="true"
                className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0"
              />
              <input
                type="search"
                value={query}
                aria-label={searchPlaceholder}
                placeholder={searchPlaceholder}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.nativeEvent.isComposing) return;
                  if (e.key === 'Escape' && query) {
                    setQuery('');
                  } else if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                    const first = filteredItems[0];
                    if (first) {
                      selectItem(first);
                    }
                  }
                }}
                className="w-full bg-transparent text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none"
              />
              {query ? (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setQuery('')}
                  className="prism-focus-ring rounded-full p-0.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer shrink-0"
                >
                  <X aria-hidden="true" className="w-3.5 h-3.5" />
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        <div
          role="listbox"
          aria-label={masterTitle ?? 'Master items'}
          onKeyDown={handleListKeyDown}
          className="flex-1 overflow-y-auto p-2 space-y-1"
        >
          {filteredItems.length === 0 ? (
            <div className="px-3 py-8 text-center text-xs text-slate-500 dark:text-slate-400">
              {emptyListMessage}
            </div>
          ) : (
            filteredItems.map((item) => {
              const isSelected = activeId === item.id;
              return (
                <button
                  key={item.id}
                  ref={(node) => {
                    if (node) {
                      optionRefs.current.set(item.id, node);
                    } else {
                      optionRefs.current.delete(item.id);
                    }
                  }}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => selectItem(item)}
                  className={cx(
                    'prism-focus-ring w-full text-left rounded-xl px-3 py-2.5 transition-colors cursor-pointer',
                    isSelected
                      ? 'prism-emerald text-white'
                      : 'text-slate-800 dark:text-slate-100 hover:bg-white/55 dark:hover:bg-white/10'
                  )}
                >
                  {renderItem ? (
                    renderItem(item, isSelected)
                  ) : (
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 min-w-0">
                        <span className="text-sm font-medium leading-snug">{item.title}</span>
                        {item.badge ? (
                          <span
                            className={cx(
                              'text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0',
                              isSelected
                                ? 'bg-white/25 text-white'
                                : 'bg-white/65 dark:bg-white/10 text-slate-700 dark:text-slate-200'
                            )}
                          >
                            {item.badge}
                          </span>
                        ) : null}
                      </div>
                      {item.subtitle || item.meta ? (
                        <div className="flex items-center justify-between gap-2 min-w-0">
                          {item.subtitle ? (
                            <span
                              className={cx(
                                'text-xs truncate',
                                isSelected
                                  ? 'text-white/85'
                                  : 'text-slate-500 dark:text-slate-400'
                              )}
                            >
                              {item.subtitle}
                            </span>
                          ) : (
                            <span />
                          )}
                          {item.meta ? (
                            <span
                              className={cx(
                                'text-[11px] font-mono tabular-nums shrink-0',
                                isSelected
                                  ? 'text-white/90'
                                  : 'text-slate-500 dark:text-slate-400'
                              )}
                            >
                              {item.meta}
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </aside>

      <section
        data-part="detail-pane"
        aria-label="Item details"
        className={cx(
          'flex-1 min-w-0 flex-col p-4 md:p-5',
          mobileDetailOpen ? 'flex' : 'hidden md:flex'
        )}
      >
        <div className="md:hidden mb-3">
          <button
            type="button"
            onClick={() => setMobileDetailOpen(false)}
            className="prism-btn-secondary prism-focus-ring inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium cursor-pointer"
          >
            <ArrowLeft aria-hidden="true" className="w-3.5 h-3.5" />
            <span>Back to list</span>
          </button>
        </div>

        {selectedItem ? (
          <div className="flex-1 min-w-0">{renderDetail(selectedItem)}</div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center px-4 py-12 text-sm text-slate-500 dark:text-slate-400">
            {emptyDetailMessage}
          </div>
        )}
      </section>
    </div>
  );
}

type MasterDetailViewComponent = (<T extends MasterDetailItem = MasterDetailItem>(
  props: MasterDetailViewProps<T>
) => ReactNode) & { displayName?: string };

export const MasterDetailView = /*#__PURE__*/ memoWithDisplayName(
  MasterDetailViewInner,
  'MasterDetailView'
) as MasterDetailViewComponent;
