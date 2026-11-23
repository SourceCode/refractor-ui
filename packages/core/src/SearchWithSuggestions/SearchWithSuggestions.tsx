'use client';

import { memo, useEffect, useId, useRef, useState } from 'react';
import { Plus, Search, X } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useMergedRefs } from '../hooks/useMergedRefs';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';

export interface SearchSuggestion {
  /** Unique identifier for the suggestion item. */
  id: string;
  /** Visible suggestion title matched against the search query. */
  label: string;
  /** Optional category tag rendered on the trailing edge. */
  category?: string;
}

type SearchWithSuggestionsBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface SearchWithSuggestionsProps extends SearchWithSuggestionsBaseProps {
  /** Controlled search query value. */
  value: string;
  /** Callback fired whenever the search query text changes. */
  onChange: (value: string) => void;
  /** Full list of candidate suggestions filtered by label. */
  suggestions: SearchSuggestion[];
  /** Callback fired when a user clicks or confirms a suggestion. */
  onSelectSuggestion: (item: SearchSuggestion) => void;
  /** Optional callback triggered by the trailing "+" quick-add button or Enter with no suggestions. */
  onQuickAdd?: (currentQuery: string) => void;
  /** Placeholder text displayed when query is empty. */
  placeholder?: string;
  /** Accessible label for the search input (alias for aria-label). */
  ariaLabel?: string;
  /** Disables typing, clearing, quick-add, and suggestion selection. */
  disabled?: boolean;
}

function SearchWithSuggestionsInner({
  value,
  onChange,
  suggestions,
  onSelectSuggestion,
  onQuickAdd,
  placeholder = 'With suggestions',
  ariaLabel = 'Search with suggestions',
  disabled = false,
  className,
  style,
  xstyle,
  'aria-label': ariaLabelProp,
  ref,
  ...rest
}: SearchWithSuggestionsProps) {
  const [focused, setFocused] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mergedRef = useMergedRefs(wrapperRef, ref);
  const listboxId = useId();
  const override = useComponentOverride('SearchWithSuggestions');

  const filtered = suggestions.filter((s) =>
    s.label.toLowerCase().includes(value.trim().toLowerCase())
  );
  const showDropdown = !disabled && focused && filtered.length > 0;

  useEffect(() => {
    if (!focused) return;
    const onDocClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [focused]);

  const merged = mergeProps({
    themeTarget: themeProps('search-with-suggestions', { open: showDropdown, disabled }),
    baseClassName: 'relative w-full',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div ref={mergedRef} {...rest} {...merged}>
      <div className="prism-crystal rounded-full p-1 flex items-center focus-within:ring-2 focus-within:ring-sky-400/70">
        <div className="prism-well flex-1 h-12 rounded-l-full rounded-r-[10px] pl-4 pr-3 flex items-center gap-3">
          <Search
            aria-hidden="true"
            className="w-[19px] h-[19px] text-slate-700 dark:text-slate-200 stroke-[2] shrink-0"
          />
          <input
            type="search"
            role="combobox"
            aria-label={ariaLabelProp ?? ariaLabel}
            aria-expanded={showDropdown}
            aria-controls={showDropdown ? listboxId : undefined}
            aria-autocomplete="list"
            value={value}
            disabled={disabled}
            onFocus={() => setFocused(true)}
            onChange={(e) => {
              onChange(e.target.value);
              setFocused(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setFocused(false);
              } else if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                const firstMatch = filtered[0];
                if (showDropdown && firstMatch) {
                  onSelectSuggestion(firstMatch);
                  setFocused(false);
                } else {
                  onQuickAdd?.(value);
                }
              }
            }}
            placeholder={placeholder}
            className="w-full bg-transparent text-[15px] text-slate-800 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
          />
          {value && !disabled ? (
            <button
              type="button"
              aria-label="Clear search query"
              onClick={() => onChange('')}
              className="prism-focus-ring rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer p-1"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          ) : null}
        </div>
        <button
          type="button"
          disabled={disabled}
          aria-label="Add search item"
          onClick={() => onQuickAdd?.(value)}
          className="prism-focus-ring rounded-full w-14 h-12 flex items-center justify-center text-slate-800 dark:text-slate-100 enabled:hover:scale-105 transition-transform cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          <Plus className="w-5 h-5 stroke-[1.9]" aria-hidden="true" />
        </button>
      </div>

      {showDropdown ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Search suggestions"
          className="prism-slab absolute left-0 right-0 mt-2 p-1.5 z-40 max-h-60 overflow-y-auto"
        >
          {filtered.slice(0, 6).map((item) => (
            <button
              key={item.id}
              type="button"
              role="option"
              aria-selected={false}
              onClick={() => {
                onSelectSuggestion(item);
                setFocused(false);
              }}
              className="prism-focus-ring w-full flex items-center justify-between px-4 py-2.5 rounded-2xl text-left hover:bg-white/65 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{item.label}</span>
              {item.category ? (
                <span className="text-xs text-slate-500 dark:text-slate-400">{item.category}</span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export const SearchWithSuggestions = memo(SearchWithSuggestionsInner);
SearchWithSuggestions.displayName = 'SearchWithSuggestions';
