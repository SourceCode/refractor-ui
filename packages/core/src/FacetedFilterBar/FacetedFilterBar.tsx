'use client';

import { memo, useCallback, useId, useMemo } from 'react';
import { Calendar, Check, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { formatUsNumber } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export interface FacetCategoryOption {
  /** Stable category identifier stored in FacetedFilterState.categories. */
  value: string;
  /** Visible category pill label. */
  label: string;
  /** Optional item count badge displayed on the category pill. */
  count?: number;
}

export interface FacetedFilterState {
  /** Literal search query string (never evaluated as a RegExp). */
  query: string;
  /** Selected category option values. */
  categories: string[];
  /** Optional lower numeric price bound. */
  minPrice?: number;
  /** Optional upper numeric price bound. */
  maxPrice?: number;
  /** Optional inclusive start ISO date string (YYYY-MM-DD). */
  dateFrom?: string;
  /** Optional inclusive end ISO date string (YYYY-MM-DD). */
  dateTo?: string;
}

type FacetedFilterBarBaseProps = Omit<BaseProps<HTMLDivElement>, 'children' | 'onChange'>;

export interface FacetedFilterBarProps extends FacetedFilterBarBaseProps {
  /** Selectable category facet options rendered as optical glass pills. */
  categories: ReadonlyArray<FacetCategoryOption>;
  /** Controlled faceted filter state. */
  value?: FacetedFilterState;
  /** Initial uncontrolled faceted filter state. */
  defaultValue?: Partial<FacetedFilterState>;
  /** Callback fired whenever any search, category, price, or date filter updates. */
  onChange?: (state: FacetedFilterState) => void;
  /** Accessible and visible label for the numeric price range controls. */
  priceLabel?: string;
  /** Inclusive numeric bounds used to clamp minPrice and maxPrice inputs. */
  priceBounds?: { min: number; max: number };
  /** Controls visibility of the start/end ISO date range inputs. */
  showDateRange?: boolean;
  /** Optional total matching result count displayed in a tabular badge. */
  resultCount?: number;
  /** Placeholder text for the recessed search input well. */
  searchPlaceholder?: string;
}

interface ActiveFilterChip {
  id: string;
  label: string;
  removeLabel: string;
  onRemove: () => void;
}

const DEFAULT_PRICE_BOUNDS = { min: 0, max: 10000 };

function normalizePriceBounds(bounds?: { min: number; max: number }): { min: number; max: number } {
  const rawMin = bounds && Number.isFinite(bounds.min) ? bounds.min : DEFAULT_PRICE_BOUNDS.min;
  const rawMax = bounds && Number.isFinite(bounds.max) ? bounds.max : DEFAULT_PRICE_BOUNDS.max;
  return {
    min: Math.min(rawMin, rawMax),
    max: Math.max(rawMin, rawMax),
  };
}

function normalizePriceValue(
  raw: number | undefined,
  bounds: { min: number; max: number }
): number | undefined {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) {
    return undefined;
  }
  return clampNumber(raw, bounds.min, bounds.max, bounds.min);
}

function normalizeDateValue(raw: string | undefined): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeFilterState(
  raw: Partial<FacetedFilterState> | undefined,
  bounds: { min: number; max: number }
): FacetedFilterState {
  const query = typeof raw?.query === 'string' ? raw.query : '';
  const categories = Array.isArray(raw?.categories)
    ? Array.from(new Set(raw.categories.filter((item) => typeof item === 'string')))
    : [];

  let minPrice = normalizePriceValue(raw?.minPrice, bounds);
  let maxPrice = normalizePriceValue(raw?.maxPrice, bounds);
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    const swappedMin = maxPrice;
    maxPrice = minPrice;
    minPrice = swappedMin;
  }

  let dateFrom = normalizeDateValue(raw?.dateFrom);
  let dateTo = normalizeDateValue(raw?.dateTo);
  if (dateFrom !== undefined && dateTo !== undefined && dateFrom > dateTo) {
    const swappedFrom = dateTo;
    dateTo = dateFrom;
    dateFrom = swappedFrom;
  }

  const next: FacetedFilterState = {
    query,
    categories,
  };
  if (minPrice !== undefined) next.minPrice = minPrice;
  if (maxPrice !== undefined) next.maxPrice = maxPrice;
  if (dateFrom !== undefined) next.dateFrom = dateFrom;
  if (dateTo !== undefined) next.dateTo = dateTo;

  return next;
}

function parseNumericInput(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (trimmed === '') return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function FacetedFilterBarInner({
  categories,
  value,
  defaultValue,
  onChange,
  priceLabel = 'Price Range',
  priceBounds = DEFAULT_PRICE_BOUNDS,
  showDateRange = true,
  resultCount,
  searchPlaceholder = 'Search filters, titles, or tags...',
  className,
  style,
  xstyle,
  ref,
  ...rest
}: FacetedFilterBarProps) {
  const override = useComponentOverride('FacetedFilterBar');
  const searchInputId = useId();
  const minPriceId = useId();
  const maxPriceId = useId();
  const dateFromId = useId();
  const dateToId = useId();

  const bounds = useMemo(() => normalizePriceBounds(priceBounds), [priceBounds]);

  const initialDefaultState = useMemo(
    () => normalizeFilterState(defaultValue, bounds),
    [defaultValue, bounds]
  );

  const [rawState, setRawState] = useControllableState<FacetedFilterState>({
    value,
    defaultValue: initialDefaultState,
    onChange,
  });

  const state = useMemo(() => normalizeFilterState(rawState, bounds), [rawState, bounds]);

  const uniqueCategories = useMemo(() => {
    const seen = new Set<string>();
    const list: FacetCategoryOption[] = [];
    for (const option of categories) {
      if (!seen.has(option.value)) {
        seen.add(option.value);
        list.push(option);
      }
    }
    return list;
  }, [categories]);

  const categoryLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const option of uniqueCategories) {
      map.set(option.value, option.label);
    }
    return map;
  }, [uniqueCategories]);

  const selectedCategorySet = useMemo(() => new Set(state.categories), [state.categories]);

  const commitState = useCallback(
    (draft: Partial<FacetedFilterState>) => {
      const next = normalizeFilterState(draft, bounds);
      setRawState(next);
    },
    [bounds, setRawState]
  );

  const handleToggleCategory = useCallback(
    (categoryValue: string) => {
      const nextCategories = selectedCategorySet.has(categoryValue)
        ? state.categories.filter((item) => item !== categoryValue)
        : [...state.categories, categoryValue];
      commitState({ ...state, categories: nextCategories });
    },
    [commitState, selectedCategorySet, state]
  );

  const handleResetAll = useCallback(() => {
    commitState({ query: '', categories: [] });
  }, [commitState]);

  const activeChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = [];

    if (state.query.trim().length > 0) {
      chips.push({
        id: 'chip-query',
        label: `Search: "${state.query.trim()}"`,
        removeLabel: 'Remove search filter',
        onRemove: () => commitState({ ...state, query: '' }),
      });
    }

    for (const catVal of state.categories) {
      const displayLabel = categoryLabelMap.get(catVal) ?? catVal;
      chips.push({
        id: `chip-cat-${catVal}`,
        label: displayLabel,
        removeLabel: `Remove ${displayLabel} category filter`,
        onRemove: () =>
          commitState({
            ...state,
            categories: state.categories.filter((item) => item !== catVal),
          }),
      });
    }

    if (state.minPrice !== undefined || state.maxPrice !== undefined) {
      const priceText =
        state.minPrice !== undefined && state.maxPrice !== undefined
          ? `${priceLabel}: ${state.minPrice} – ${state.maxPrice}`
          : state.minPrice !== undefined
            ? `${priceLabel}: ≥ ${state.minPrice}`
            : `${priceLabel}: ≤ ${state.maxPrice}`;
      chips.push({
        id: 'chip-price',
        label: priceText,
        removeLabel: `Remove ${priceLabel} filter`,
        onRemove: () => commitState({ ...state, minPrice: undefined, maxPrice: undefined }),
      });
    }

    if (state.dateFrom !== undefined || state.dateTo !== undefined) {
      const dateText =
        state.dateFrom !== undefined && state.dateTo !== undefined
          ? `Date: ${state.dateFrom} – ${state.dateTo}`
          : state.dateFrom !== undefined
            ? `From: ${state.dateFrom}`
            : `To: ${state.dateTo}`;
      chips.push({
        id: 'chip-date',
        label: dateText,
        removeLabel: 'Remove date range filter',
        onRemove: () => commitState({ ...state, dateFrom: undefined, dateTo: undefined }),
      });
    }

    return chips;
  }, [categoryLabelMap, commitState, priceLabel, state]);

  const hasActiveFilters = activeChips.length > 0 || state.query.length > 0;
  const formattedResultCount =
    typeof resultCount === 'number' && Number.isFinite(resultCount)
      ? Math.max(0, Math.floor(resultCount))
      : undefined;

  const merged = mergeProps({
    themeTarget: themeProps('faceted-filter-bar', {
      active: hasActiveFilters,
      dateRange: showDateRange,
    }),
    baseClassName: 'prism-slab p-4 flex flex-col gap-3.5 w-full',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const searchBarClass = stableClassName('faceted-filter-bar', 'search');
  const categoriesClass = stableClassName('faceted-filter-bar', 'categories');
  const rangesClass = stableClassName('faceted-filter-bar', 'ranges');
  const chipsClass = stableClassName('faceted-filter-bar', 'chips');

  return (
    <div ref={ref} role="search" aria-label="Faceted filter bar" {...rest} {...merged}>
      {/* Top row: Search input well, result count badge, and Reset all action */}
      <div className={cx(searchBarClass, 'flex flex-wrap items-center gap-3')}>
        <div className="prism-well flex-1 min-w-[220px] h-11 rounded-2xl px-3.5 flex items-center gap-2.5">
          <Search
            aria-hidden="true"
            className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0"
          />
          <label htmlFor={searchInputId} className="sr-only">
            Search filters
          </label>
          <input
            id={searchInputId}
            type="search"
            value={state.query}
            placeholder={searchPlaceholder}
            onChange={(e) => commitState({ ...state, query: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                e.preventDefault();
                commitState({ ...state, query: e.currentTarget.value });
              } else if (e.key === 'Escape' && !e.nativeEvent.isComposing && state.query.length > 0) {
                e.preventDefault();
                commitState({ ...state, query: '' });
              }
            }}
            className="prism-focus-ring w-full bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 rounded-lg"
          />
          {state.query.length > 0 ? (
            <button
              type="button"
              aria-label="Clear search query"
              onClick={() => commitState({ ...state, query: '' })}
              className="prism-focus-ring rounded-full p-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 cursor-pointer shrink-0"
            >
              <X aria-hidden="true" className="w-3.5 h-3.5" />
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {formattedResultCount !== undefined ? (
            <span
              role="status"
              aria-live="polite"
              data-result-count={String(formattedResultCount)}
              className="prism-crystal h-9 px-3.5 rounded-full inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 tabular-nums"
            >
              <span>{formatUsNumber(formattedResultCount)}</span>{' '}
              <span className="font-normal text-slate-600 dark:text-slate-300">
                {formattedResultCount === 1 ? 'result' : 'results'}
              </span>
            </span>
          ) : null}

          {hasActiveFilters ? (
            <button
              type="button"
              onClick={handleResetAll}
              className="prism-crystal prism-focus-ring h-9 px-3.5 rounded-full inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 cursor-pointer transition-opacity hover:opacity-90"
            >
              <RotateCcw aria-hidden="true" className="w-3.5 h-3.5" />
              <span>Reset all</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* Category facet toggle pills */}
      <div
        role="group"
        aria-label="Categories"
        className={cx(categoriesClass, 'flex flex-wrap items-center gap-2')}
      >
        {uniqueCategories.length === 0 ? (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            No categories available
          </span>
        ) : (
          uniqueCategories.map((option) => {
            const selected = selectedCategorySet.has(option.value);
            const numericCount =
              typeof option.count === 'number' && Number.isFinite(option.count)
                ? Math.max(0, Math.floor(option.count))
                : null;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={selected}
                data-category={option.value}
                data-selected={selected ? 'true' : undefined}
                onClick={() => handleToggleCategory(option.value)}
                className={cx(
                  'prism-focus-ring h-8 px-3 rounded-full inline-flex items-center gap-1.5 text-xs font-medium cursor-pointer transition-transform',
                  selected
                    ? 'prism-emerald font-semibold'
                    : 'prism-crystal text-slate-800 dark:text-slate-100'
                )}
              >
                {selected ? <Check aria-hidden="true" className="w-3.5 h-3.5 shrink-0" /> : null}
                <span>{option.label}</span>
                {numericCount !== null ? (
                  <span
                    className={cx(
                      'px-1.5 py-0.5 rounded-full text-[11px] font-mono tabular-nums',
                      selected
                        ? 'bg-white/20 text-current'
                        : 'bg-slate-900/10 dark:bg-white/10 text-slate-600 dark:text-slate-300'
                    )}
                  >
                    {formatUsNumber(numericCount)}
                  </span>
                ) : null}
              </button>
            );
          })
        )}
      </div>

      {/* Numeric Price Range & ISO Date Range Wells */}
      <div className={cx(rangesClass, 'flex flex-wrap items-end gap-3')}>
        <div
          role="group"
          aria-label={priceLabel}
          className="flex flex-wrap items-center gap-2"
        >
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <SlidersHorizontal
              aria-hidden="true"
              className="w-3.5 h-3.5 text-[var(--prism-secondary-dark)]"
            />
            <span>{priceLabel}</span>
          </span>

          <div className="flex items-center gap-1.5">
            <label htmlFor={minPriceId} className="sr-only">
              {`${priceLabel} minimum`}
            </label>
            <input
              id={minPriceId}
              type="number"
              min={bounds.min}
              max={bounds.max}
              value={state.minPrice !== undefined ? String(state.minPrice) : ''}
              placeholder={String(bounds.min)}
              aria-label={`${priceLabel} minimum`}
              onChange={(e) => {
                const parsed = parseNumericInput(e.target.value);
                commitState({ ...state, minPrice: parsed });
              }}
              className="prism-well prism-focus-ring h-9 w-28 px-3 rounded-xl text-xs font-mono tabular-nums text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
            />
            <span aria-hidden="true" className="text-xs text-slate-500 dark:text-slate-400">
              –
            </span>
            <label htmlFor={maxPriceId} className="sr-only">
              {`${priceLabel} maximum`}
            </label>
            <input
              id={maxPriceId}
              type="number"
              min={bounds.min}
              max={bounds.max}
              value={state.maxPrice !== undefined ? String(state.maxPrice) : ''}
              placeholder={String(bounds.max)}
              aria-label={`${priceLabel} maximum`}
              onChange={(e) => {
                const parsed = parseNumericInput(e.target.value);
                commitState({ ...state, maxPrice: parsed });
              }}
              className="prism-well prism-focus-ring h-9 w-28 px-3 rounded-xl text-xs font-mono tabular-nums text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
            />
          </div>
        </div>

        {showDateRange ? (
          <div
            role="group"
            aria-label="Date range"
            className="flex flex-wrap items-center gap-2"
          >
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <Calendar
                aria-hidden="true"
                className="w-3.5 h-3.5 text-[var(--prism-primary-main)]"
              />
              <span>Date Range</span>
            </span>

            <div className="flex items-center gap-1.5">
              <label htmlFor={dateFromId} className="sr-only">
                Date from
              </label>
              <input
                id={dateFromId}
                type="date"
                value={state.dateFrom ?? ''}
                aria-label="Date from"
                onChange={(e) => {
                  commitState({ ...state, dateFrom: normalizeDateValue(e.target.value) });
                }}
                className="prism-well prism-focus-ring h-9 px-3 rounded-xl text-xs font-mono tabular-nums text-slate-800 dark:text-slate-100"
              />
              <span aria-hidden="true" className="text-xs text-slate-500 dark:text-slate-400">
                –
              </span>
              <label htmlFor={dateToId} className="sr-only">
                Date to
              </label>
              <input
                id={dateToId}
                type="date"
                value={state.dateTo ?? ''}
                aria-label="Date to"
                onChange={(e) => {
                  commitState({ ...state, dateTo: normalizeDateValue(e.target.value) });
                }}
                className="prism-well prism-focus-ring h-9 px-3 rounded-xl text-xs font-mono tabular-nums text-slate-800 dark:text-slate-100"
              />
            </div>
          </div>
        ) : null}
      </div>

      {/* Live removable active-filter crystal chips strip */}
      {activeChips.length > 0 ? (
        <div
          role="region"
          aria-label="Active filters"
          className={cx(
            chipsClass,
            'pt-3 border-t border-[var(--prism-divider)] flex flex-wrap items-center gap-2'
          )}
        >
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Active
          </span>
          {activeChips.map((chip) => (
            <span
              key={chip.id}
              data-active-chip={chip.id}
              className="prism-crystal h-7 pl-2.5 pr-1.5 rounded-full inline-flex items-center gap-1.5 text-xs font-medium text-slate-800 dark:text-slate-100"
            >
              <span className="truncate max-w-[220px]">{chip.label}</span>
              <button
                type="button"
                aria-label={chip.removeLabel}
                onClick={chip.onRemove}
                className="prism-focus-ring rounded-full p-0.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer"
              >
                <X aria-hidden="true" className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export const FacetedFilterBar = memo(FacetedFilterBarInner);
FacetedFilterBar.displayName = 'FacetedFilterBar';
