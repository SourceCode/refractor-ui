'use client';

import { memo, useMemo, type ReactNode } from 'react';
import type { BaseProps } from '../BaseProps';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { themeProps } from '../utils/themeProps';

export interface MasonryItem {
  /** Stable unique identifier used as React key and list-item anchor. */
  id: string;
  /** Estimated card height in pixels used for shortest-column greedy balancing (defaults to 160). */
  estimatedHeight?: number;
  /** Optional heading rendered by the default optical slab card. */
  title?: string;
  /** Optional supporting copy rendered by the default optical slab card. */
  subtitle?: string;
  /** Optional rich body content rendered by the default optical slab card. */
  content?: ReactNode;
}

export interface MasonryGridProps<
  T extends MasonryItem = MasonryItem,
> extends BaseProps<HTMLDivElement> {
  /** Collection of items distributed across balanced vertical masonry columns. */
  items: ReadonlyArray<T>;
  /** Number of brickwork columns (clamped 1..6, default 3). */
  columns?: number;
  /** Spacing in pixels between columns and stacked cards (clamped 0..48, default 16). */
  gapPx?: number;
  /** Optional custom item renderer; defaults to a refractive prism-slab optical card. */
  renderItem?: (item: T, index: number) => ReactNode;
  /** Message displayed inside an optical slab when items is empty. */
  emptyMessage?: string;
}

interface MasonryLaneEntry<T extends MasonryItem> {
  item: T;
  index: number;
}

interface MasonryLane<T extends MasonryItem> {
  id: string;
  columnIndex: number;
  height: number;
  entries: MasonryLaneEntry<T>[];
}

const DEFAULT_COLUMNS = 3;
const MIN_COLUMNS = 1;
const MAX_COLUMNS = 6;
const DEFAULT_GAP_PX = 16;
const MIN_GAP_PX = 0;
const MAX_GAP_PX = 48;
const DEFAULT_ESTIMATED_HEIGHT = 160;

function normalizeEstimatedHeight(estimatedHeight: number | undefined): number {
  if (
    typeof estimatedHeight !== 'number' ||
    !Number.isFinite(estimatedHeight) ||
    estimatedHeight <= 0
  ) {
    return DEFAULT_ESTIMATED_HEIGHT;
  }
  return estimatedHeight;
}

function distributeMasonryItems<T extends MasonryItem>(
  items: ReadonlyArray<T>,
  columnCount: number,
  gapPx: number
): MasonryLane<T>[] {
  const firstLane: MasonryLane<T> = {
    id: 'masonry-col-0',
    columnIndex: 0,
    height: 0,
    entries: [],
  };
  const lanes: MasonryLane<T>[] = [firstLane];
  for (let col = 1; col < columnCount; col += 1) {
    lanes.push({
      id: `masonry-col-${col}`,
      columnIndex: col,
      height: 0,
      entries: [],
    });
  }

  items.forEach((item, index) => {
    let shortestLane = firstLane;
    for (const lane of lanes) {
      if (lane.height < shortestLane.height) {
        shortestLane = lane;
      }
    }
    shortestLane.entries.push({ item, index });
    shortestLane.height += normalizeEstimatedHeight(item.estimatedHeight) + gapPx;
  });

  return lanes;
}

const DefaultMasonryCard = memo(function DefaultMasonryCard<T extends MasonryItem>({ item }: { item: T }) {
  return (
    <article className="prism-slab prism-cv-card relative overflow-hidden p-5 flex flex-col gap-2.5 transition-transform duration-200 hover:-translate-y-0.5">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/80 dark:via-white/30 to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-10 -left-8 w-40 h-24 rounded-[45%] bg-gradient-to-br from-white/55 via-white/15 to-transparent dark:from-white/12 dark:via-white/5 -rotate-12"
      />
      {item.title ? (
        <h3 className="relative z-10 text-sm font-semibold text-slate-900 dark:text-white tracking-tight leading-snug break-words">
          {item.title}
        </h3>
      ) : null}
      {item.subtitle ? (
        <p className="relative z-10 text-xs text-slate-600 dark:text-slate-300 leading-relaxed break-words">
          {item.subtitle}
        </p>
      ) : null}
      {item.content !== undefined && item.content !== null ? (
        <div className="relative z-10 text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
          {item.content}
        </div>
      ) : null}
    </article>
  );
});

function MasonryGridInner<T extends MasonryItem = MasonryItem>({
  items,
  columns = DEFAULT_COLUMNS,
  gapPx = DEFAULT_GAP_PX,
  renderItem,
  emptyMessage = 'No items to display.',
  className,
  style,
  xstyle,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  ref,
  ...rest
}: MasonryGridProps<T>) {
  const override = useComponentOverride('MasonryGrid');

  const safeCols = Math.round(clampNumber(columns, MIN_COLUMNS, MAX_COLUMNS, DEFAULT_COLUMNS));
  const safeGap = Math.round(clampNumber(gapPx, MIN_GAP_PX, MAX_GAP_PX, DEFAULT_GAP_PX));
  const isEmpty = items.length === 0;

  const lanes = useMemo(
    () => (isEmpty ? [] : distributeMasonryItems(items, safeCols, safeGap)),
    [isEmpty, items, safeCols, safeGap]
  );

  const merged = mergeProps({
    themeTarget: themeProps('masonry-grid', {
      columns: safeCols,
      gap: safeGap,
      empty: isEmpty,
    }),
    baseClassName: 'grid items-start w-full',
    overrideClassName: override?.className,
    userClassName: className,
    baseStyle: {
      gridTemplateColumns: `repeat(${safeCols}, minmax(0, 1fr))`,
      gap: `${safeGap}px`,
    },
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const laneGapStyle = useMemo(() => ({ gap: `${safeGap}px` }), [safeGap]);

  return (
    <div
      ref={ref}
      role="list"
      aria-label={ariaLabel ?? (ariaLabelledBy ? undefined : 'Masonry grid')}
      aria-labelledby={ariaLabelledBy}
      {...rest}
      {...merged}
    >
      {isEmpty ? (
        <div
          role="status"
          className="prism-slab col-span-full px-6 py-10 text-center text-sm text-slate-600 dark:text-slate-300"
        >
          {emptyMessage}
        </div>
      ) : (
        lanes.map((lane) => (
          <div
            key={lane.id}
            role="none"
            data-masonry-column={String(lane.columnIndex)}
            className="flex flex-col min-w-0"
            style={laneGapStyle}
          >
            {lane.entries.map(({ item, index }) => (
              <div
                key={item.id}
                role="listitem"
                data-masonry-index={String(index)}
                className="min-w-0 prism-cv-card"
              >
                {renderItem ? renderItem(item, index) : <DefaultMasonryCard item={item} />}
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}

type MasonryGridComponent = (<T extends MasonryItem = MasonryItem>(
  props: MasonryGridProps<T>
) => ReactNode) & { displayName?: string };

export const MasonryGrid = memo(MasonryGridInner) as MasonryGridComponent;
MasonryGrid.displayName = 'MasonryGrid';
