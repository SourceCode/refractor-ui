'use client';

import { useMemo, useRef, useState, type ReactNode, type UIEvent } from 'react';
import { Loader2 } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { themeProps } from '../utils/themeProps';

export interface VirtualizedListItem {
  /** Stable unique identifier used as React list key for virtualized rows. */
  id: string;
}

type VirtualizedListBaseProps = Omit<BaseProps<HTMLDivElement>, 'children'>;

export interface VirtualizedListProps<T extends VirtualizedListItem = VirtualizedListItem>
  extends VirtualizedListBaseProps {
  /** Full dataset of items; only the visible slice plus overscan is mounted in the DOM. */
  items: ReadonlyArray<T>;
  /** Fixed row height in pixels (clamped >= 20, default 48). */
  itemHeight?: number;
  /** Scrollable viewport height in pixels (clamped >= 80, default 320). */
  height?: number;
  /** Extra rows rendered above and below the viewport to prevent scroll blanking (clamped 0..20, default 3). */
  overscan?: number;
  /** Render callback invoked only for currently virtualized rows. */
  renderItem: (item: T, index: number) => ReactNode;
  /** Infinite-scroll callback invoked once per scroll into `endReachedThreshold` for the current dataset length. */
  onEndReached?: () => void;
  /** Distance from the bottom edge in pixels at which `onEndReached` fires (default 120). */
  endReachedThreshold?: number;
  /** Displays an optical loading indicator pill and suppresses duplicate `onEndReached` triggers while true. */
  loadingMore?: boolean;
  /** Message rendered inside the viewport when `items` is empty. */
  emptyMessage?: string;
  /** Renders the frosted crystal telemetry header pill displaying the active row slice (default true). */
  showTelemetry?: boolean;
}

export function VirtualizedList<T extends VirtualizedListItem = VirtualizedListItem>({
  items,
  itemHeight = 48,
  height = 320,
  overscan = 3,
  renderItem,
  onEndReached,
  endReachedThreshold = 120,
  loadingMore = false,
  emptyMessage = 'No items to display.',
  showTelemetry = true,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: VirtualizedListProps<T>) {
  const override = useComponentOverride('VirtualizedList');
  const [scrollTop, setScrollTop] = useState(0);
  const lastEndReachedLengthRef = useRef<number | null>(null);

  const safeItemHeight = clampNumber(itemHeight, 20, 10000, 48);
  const safeHeight = clampNumber(height, 80, 10000, 320);
  const safeOverscan = Math.floor(clampNumber(overscan, 0, 20, 3));
  const safeThreshold = clampNumber(endReachedThreshold, 0, 10000, 120);

  const totalHeight = items.length * safeItemHeight;
  const maxScrollTop = Math.max(0, totalHeight - safeHeight);
  const effectiveScrollTop = clampNumber(scrollTop, 0, maxScrollTop, 0);

  const visibleStart = Math.floor(effectiveScrollTop / safeItemHeight);
  const visibleCount = Math.ceil(safeHeight / safeItemHeight);
  const startIndex = items.length === 0 ? 0 : Math.max(0, visibleStart - safeOverscan);
  const endIndex =
    items.length === 0
      ? -1
      : Math.min(items.length - 1, visibleStart + visibleCount + safeOverscan - 1);

  const offsetY = startIndex * safeItemHeight;

  const visibleItems = useMemo(
    () => (endIndex >= startIndex ? items.slice(startIndex, endIndex + 1) : []),
    [items, startIndex, endIndex]
  );

  const telemetryLabel =
    items.length === 0
      ? 'Rows 0 of 0'
      : `Rows ${(startIndex + 1).toLocaleString('en-US')}–${(endIndex + 1).toLocaleString('en-US')} of ${items.length.toLocaleString('en-US')}`;

  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    const rawTop = e.currentTarget.scrollTop;
    const nextScrollTop = clampNumber(rawTop, 0, maxScrollTop, 0);
    setScrollTop(nextScrollTop);

    if (onEndReached && !loadingMore && items.length > 0) {
      const distanceFromBottom = totalHeight - (nextScrollTop + safeHeight);
      if (
        distanceFromBottom <= safeThreshold &&
        lastEndReachedLengthRef.current !== items.length
      ) {
        lastEndReachedLengthRef.current = items.length;
        onEndReached();
      }
    }
  };

  const merged = mergeProps({
    themeTarget: themeProps('virtualized-list', {
      empty: items.length === 0,
      loadingMore,
      showTelemetry,
    }),
    baseClassName: 'prism-slab overflow-hidden flex flex-col',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div ref={ref} {...rest} {...merged}>
      {showTelemetry ? (
        <div
          data-part="telemetry-bar"
          className="px-4 py-2.5 border-b border-slate-300/45 dark:border-slate-700/50 flex flex-wrap items-center justify-between gap-2 bg-white/25 dark:bg-white/[0.02]"
        >
          <span
            data-part="telemetry-pill"
            className="prism-crystal rounded-full px-3 py-1 text-xs font-mono tabular-nums text-slate-700 dark:text-slate-200 inline-flex items-center"
          >
            {telemetryLabel}
          </span>
          <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
            {visibleItems.length.toLocaleString('en-US')} mounted
          </span>
        </div>
      ) : null}

      <div
        data-part="viewport"
        data-item-height={String(safeItemHeight)}
        data-viewport-height={String(safeHeight)}
        role="region"
        aria-label="Virtualized list viewport"
        tabIndex={0}
        onScroll={handleScroll}
        style={{ height: `${safeHeight}px` }}
        className="prism-focus-ring overflow-y-auto relative"
      >
        {items.length === 0 ? (
          <div className="h-full flex items-center justify-center px-4 text-center text-sm text-slate-500 dark:text-slate-400">
            {emptyMessage}
          </div>
        ) : (
          <div
            data-part="spacer"
            style={{ height: `${totalHeight}px`, position: 'relative' }}
          >
            <div
              role="list"
              data-part="window"
              style={{ transform: `translateY(${offsetY}px)`, willChange: 'transform' }}
            >
              {visibleItems.map((item, sliceOffset) => {
                const index = startIndex + sliceOffset;
                return (
                  <div
                    key={item.id}
                    role="listitem"
                    aria-posinset={index + 1}
                    aria-setsize={items.length}
                    data-index={String(index)}
                    style={{ height: `${safeItemHeight}px` }}
                    className="box-border flex items-center w-full min-w-0 overflow-hidden px-3 sm:px-4 border-b border-slate-200/45 dark:border-slate-700/40 hover:bg-white/40 dark:hover:bg-white/[0.04] transition-colors"
                  >
                    {renderItem(item, index)}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {loadingMore ? (
        <div
          role="status"
          aria-live="polite"
          data-part="loading-bar"
          className="px-4 py-2 border-t border-slate-300/45 dark:border-slate-700/50 flex items-center justify-center bg-white/25 dark:bg-white/[0.02]"
        >
          <span className="prism-crystal rounded-full px-3.5 py-1 inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-200">
            <Loader2 aria-hidden="true" className="w-3.5 h-3.5 animate-spin" />
            <span>Loading more items…</span>
          </span>
        </div>
      ) : null}
    </div>
  );
}

VirtualizedList.displayName = 'VirtualizedList';
