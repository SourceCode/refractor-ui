'use client';

import { memo } from 'react';
import type { ReactNode } from 'react';
import type { BaseProps } from '../BaseProps';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';

export interface PrismListItem {
  id: string;
  title: string;
  subtitle: string;
  meta?: string;
  leading?: ReactNode;
  actionLabel?: string;
}

export interface PrismListProps extends BaseProps<HTMLUListElement> {
  /** Uniform rows displayed inside the optical list surface. */
  items: ReadonlyArray<PrismListItem>;
  /** Optional handler invoked when a row action button is clicked. */
  onItemAction?: (item: PrismListItem) => void;
}

function PrismListInner({
  items,
  onItemAction,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: PrismListProps) {
  const override = useComponentOverride('PrismList');

  const merged = mergeProps({
    themeTarget: themeProps('prism-list', { empty: items.length === 0 }),
    baseClassName:
      'prism-slab divide-y divide-slate-300/45 dark:divide-slate-700/50 overflow-hidden',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <ul ref={ref} {...rest} {...merged}>
      {items.map((item) => (
        <li
          key={item.id}
          className="px-4 py-3 flex items-center justify-between gap-4 hover:bg-white/40 dark:hover:bg-white/[0.04] transition-colors"
        >
          <div className="flex items-center gap-3 min-w-0">
            {item.leading ? (
              <span className="prism-crystal w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-slate-700 dark:text-slate-200">
                {item.leading}
              </span>
            ) : null}
            <div className="min-w-0">
              <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                {item.title}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {item.subtitle}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {item.meta ? (
              <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                {item.meta}
              </span>
            ) : null}
            {item.actionLabel && onItemAction ? (
              <button
                type="button"
                onClick={() => onItemAction(item)}
                className="prism-btn-secondary prism-focus-ring h-8 px-3.5 text-xs font-medium cursor-pointer"
              >
                {item.actionLabel}
              </button>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

export const PrismList = memo(PrismListInner);
PrismList.displayName = 'PrismList';
