'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';

export interface PaginationProps extends BaseProps<HTMLElement> {
  /** Active 1-based page number (clamped safely to 1..totalPages). */
  currentPage: number;
  /** Total number of pages available. */
  totalPages: number;
  /** Callback invoked when the user navigates to a new page. */
  onPageChange: (page: number) => void;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: PaginationProps) {
  const override = useComponentOverride('Pagination');
  const safeTotal = Number.isFinite(totalPages) && totalPages > 0 ? Math.floor(totalPages) : 0;
  const safeCurrent =
    safeTotal === 0
      ? 0
      : Math.min(safeTotal, Math.max(1, Number.isFinite(currentPage) ? Math.floor(currentPage) : 1));
  const pages = Array.from({ length: safeTotal }, (_, i) => i + 1);

  const merged = mergeProps({
    themeTarget: themeProps('pagination', { page: safeCurrent, total: safeTotal }),
    baseClassName: 'inline-flex items-center gap-1.5',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <nav ref={ref} aria-label="Pagination" {...rest} {...merged}>
      <button
        type="button"
        aria-label="Previous page"
        disabled={safeCurrent <= 1}
        onClick={() => onPageChange(safeCurrent - 1)}
        className="prism-crystal prism-focus-ring w-9 h-9 rounded-full inline-flex items-center justify-center text-slate-700 dark:text-slate-200 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
      >
        <ChevronLeft className="w-4 h-4" aria-hidden="true" />
      </button>

      {pages.map((p) => {
        const active = p === safeCurrent;
        return (
          <button
            key={p}
            type="button"
            aria-label={`Page ${p}`}
            aria-current={active ? 'page' : undefined}
            onClick={() => onPageChange(p)}
            className={`prism-focus-ring w-9 h-9 rounded-full text-xs font-mono tabular-nums font-medium cursor-pointer transition-transform ${
              active
                ? 'prism-btn-primary text-white font-semibold'
                : 'prism-crystal text-slate-700 dark:text-slate-200 hover:-translate-y-0.5'
            }`}
          >
            <span className="relative z-10">{p}</span>
          </button>
        );
      })}

      <button
        type="button"
        aria-label="Next page"
        disabled={safeCurrent >= safeTotal}
        onClick={() => onPageChange(safeCurrent + 1)}
        className="prism-crystal prism-focus-ring w-9 h-9 rounded-full inline-flex items-center justify-center text-slate-700 dark:text-slate-200 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
      >
        <ChevronRight className="w-4 h-4" aria-hidden="true" />
      </button>
    </nav>
  );
}

Pagination.displayName = 'Pagination';
