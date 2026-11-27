'use client';

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Check, ChevronDown, Plus, X } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useMergedRefs } from '../hooks/useMergedRefs';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { mergeProps } from '../utils/mergeProps';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export interface ComboboxOption {
  /** Unique option value stored in selected values array. */
  value: string;
  /** Visible option label shown in pills and listbox rows. */
  label: string;
  /** Optional category hint displayed alongside the option label. */
  category?: string;
  /** Disables selecting or toggling this individual option. */
  disabled?: boolean;
}

type MultiSelectComboboxBaseProps = Omit<BaseProps<HTMLDivElement>, 'children' | 'onChange'>;

export interface MultiSelectComboboxProps extends MultiSelectComboboxBaseProps {
  /** Available selectable options filtered live by label, value, or category. */
  options: ReadonlyArray<ComboboxOption>;
  /** Controlled array of selected option values or custom tokens. */
  value?: ReadonlyArray<string>;
  /** Initial selected values when operating in uncontrolled mode. */
  defaultValue?: ReadonlyArray<string>;
  /** Callback fired with the updated deduplicated selection array. */
  onChange?: (values: string[]) => void;
  /** Optional field label rendered above the combobox crystal bezel. */
  label?: string;
  /** Placeholder text displayed in the search input when empty. */
  placeholder?: string;
  /** Allows pressing Enter or clicking the create option to add trimmed custom tokens. */
  creatable?: boolean;
  /** Optional maximum number of tokens that may be selected simultaneously. */
  maxSelected?: number;
  /** Disables opening, searching, selecting, creating, and removing tokens. */
  disabled?: boolean;
}

type ListboxCandidate =
  | { kind: 'option'; id: string; option: ComboboxOption }
  | { kind: 'create'; id: string; token: string };

function normalizeMaxSelected(maxSelected: number | undefined): number | undefined {
  if (maxSelected === undefined || !Number.isFinite(maxSelected)) {
    return undefined;
  }
  return Math.max(0, Math.floor(maxSelected));
}

function normalizeSelection(
  values: ReadonlyArray<string> | undefined,
  maxCap?: number
): string[] {
  if (!values || values.length === 0) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const trimmed = raw.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    if (maxCap !== undefined && out.length >= maxCap) break;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

function MultiSelectComboboxInner({
  options,
  value,
  defaultValue,
  onChange,
  label,
  placeholder = 'Search and select items...',
  creatable = false,
  maxSelected,
  disabled = false,
  className,
  style,
  xstyle,
  'aria-label': ariaLabelProp,
  ref,
  ...rest
}: MultiSelectComboboxProps) {
  const resolvedMax = normalizeMaxSelected(maxSelected);
  const [internalValues, setInternalValues] = useState<string[]>(() =>
    normalizeSelection(defaultValue, resolvedMax)
  );
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mergedRef = useMergedRefs(containerRef, ref);
  const labelId = useId();
  const inputId = useId();
  const listboxId = useId();
  const override = useComponentOverride('MultiSelectCombobox');

  const isControlled = value !== undefined;
  const selectedValues = useMemo(
    () => (isControlled ? normalizeSelection(value) : internalValues),
    [isControlled, value, internalValues]
  );

  const selectedSet = useMemo(() => new Set<string>(selectedValues), [selectedValues]);
  const isAtLimit = resolvedMax !== undefined && selectedValues.length >= resolvedMax;

  const { uniqueOptions, optionMap } = useMemo(() => {
    const map = new Map<string, ComboboxOption>();
    const deduped: ComboboxOption[] = [];
    for (const opt of options) {
      if (!map.has(opt.value)) {
        map.set(opt.value, opt);
        deduped.push(opt);
      }
    }
    return { uniqueOptions: deduped, optionMap: map };
  }, [options]);

  const trimmedQuery = query.trim();
  const lowerQuery = trimmedQuery.toLowerCase();

  const filteredOptions = useMemo(() => {
    if (query.length === 0) return uniqueOptions;
    if (!lowerQuery) return [];
    return uniqueOptions.filter(
      (opt) =>
        opt.label.toLowerCase().includes(lowerQuery) ||
        opt.value.toLowerCase().includes(lowerQuery) ||
        (opt.category ? opt.category.toLowerCase().includes(lowerQuery) : false)
    );
  }, [uniqueOptions, query.length, lowerQuery]);

  const exactMatchExists = useMemo(() => {
    if (!lowerQuery) return true;
    const matchesOption = uniqueOptions.some(
      (opt) =>
        opt.value.toLowerCase() === lowerQuery || opt.label.toLowerCase() === lowerQuery
    );
    if (matchesOption) return true;
    return selectedValues.some((selected) => selected.toLowerCase() === lowerQuery);
  }, [uniqueOptions, selectedValues, lowerQuery]);

  const showCreateOption = creatable && trimmedQuery.length > 0 && !exactMatchExists;

  const candidates = useMemo<ListboxCandidate[]>(() => {
    const list: ListboxCandidate[] = filteredOptions.map((opt, idx) => ({
      kind: 'option',
      id: `${listboxId}-opt-${idx}`,
      option: opt,
    }));
    if (showCreateOption) {
      list.push({
        kind: 'create',
        id: `${listboxId}-create`,
        token: trimmedQuery,
      });
    }
    return list;
  }, [filteredOptions, listboxId, showCreateOption, trimmedQuery]);

  const isOpen = open && !disabled;
  const safeActiveIndex =
    candidates.length > 0 ? Math.min(Math.max(activeIndex, 0), candidates.length - 1) : -1;
  const activeCandidate = safeActiveIndex >= 0 ? candidates[safeActiveIndex] : undefined;

  useEffect(() => {
    if (!isOpen) return;
    const onOutsideMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onOutsideMouseDown);
    return () => document.removeEventListener('mousedown', onOutsideMouseDown);
  }, [isOpen]);

  const commitSelection = (next: string[]) => {
    if (!isControlled) {
      setInternalValues(next);
    }
    onChange?.(next);
  };

  const removeToken = (tokenValue: string) => {
    if (disabled) return;
    const next = selectedValues.filter((item) => item !== tokenValue);
    commitSelection(next);
  };

  const toggleOption = (opt: ComboboxOption) => {
    if (disabled || opt.disabled) return;
    if (selectedSet.has(opt.value)) {
      removeToken(opt.value);
      return;
    }
    if (isAtLimit) return;
    const next = [...selectedValues, opt.value];
    commitSelection(next);
    setQuery('');
    setActiveIndex(0);
  };

  const addCustomToken = (rawToken: string) => {
    if (disabled || !creatable) return;
    const cleaned = rawToken.trim();
    if (!cleaned) return;
    if (selectedValues.some((item) => item.toLowerCase() === cleaned.toLowerCase())) return;
    if (isAtLimit) return;
    const next = [...selectedValues, cleaned];
    commitSelection(next);
    setQuery('');
    setActiveIndex(0);
  };

  const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled || e.nativeEvent.isComposing) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setOpen(true);
        setActiveIndex(0);
      } else if (candidates.length > 0) {
        setActiveIndex((safeActiveIndex + 1) % candidates.length);
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setOpen(true);
        setActiveIndex(Math.max(0, candidates.length - 1));
      } else if (candidates.length > 0) {
        setActiveIndex((safeActiveIndex - 1 + candidates.length) % candidates.length);
      }
      return;
    }

    if (e.key === 'Enter') {
      if (isOpen && activeCandidate) {
        e.preventDefault();
        if (activeCandidate.kind === 'option') {
          toggleOption(activeCandidate.option);
        } else {
          addCustomToken(activeCandidate.token);
        }
        return;
      }
      if (creatable && trimmedQuery && !exactMatchExists) {
        e.preventDefault();
        addCustomToken(trimmedQuery);
      }
      return;
    }

    if (e.key === 'Backspace' && query.length === 0 && selectedValues.length > 0) {
      const last = selectedValues[selectedValues.length - 1];
      if (last !== undefined) {
        removeToken(last);
      }
      return;
    }

    if (e.key === 'Escape' && isOpen) {
      e.preventDefault();
      setOpen(false);
    }
  };

  const merged = mergeProps({
    themeTarget: themeProps('multi-select-combobox', {
      open: isOpen,
      disabled,
      creatable,
      hasSelection: selectedValues.length > 0,
    }),
    baseClassName: 'relative w-full',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div ref={mergedRef} {...rest} {...merged}>
      {label || resolvedMax !== undefined ? (
        <div className="flex items-center justify-between gap-2 mb-1.5 px-1">
          {label ? (
            <label
              id={labelId}
              htmlFor={inputId}
              className="text-xs font-semibold text-slate-700 dark:text-slate-200"
            >
              {label}
            </label>
          ) : (
            <span />
          )}
          {resolvedMax !== undefined ? (
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 tabular-nums">
              {selectedValues.length} / {resolvedMax}
            </span>
          ) : null}
        </div>
      ) : null}

      <div
        className={`prism-crystal rounded-[24px] p-1.5 transition-shadow focus-within:ring-2 focus-within:ring-sky-400/70 ${
          disabled ? 'opacity-60' : ''
        }`}
      >
        <div
          onClick={() => {
            if (disabled) return;
            setOpen(true);
            inputRef.current?.focus();
          }}
          className={`prism-well rounded-[18px] min-h-12 pl-3 pr-2 py-2 flex items-center justify-between gap-2 ${
            disabled ? 'cursor-not-allowed' : 'cursor-text'
          }`}
        >
          <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
            {selectedValues.map((tokenValue) => {
              const tokenLabel = optionMap.get(tokenValue)?.label ?? tokenValue;
              return (
                <span
                  key={tokenValue}
                  data-slot="token-chip"
                  className="prism-emerald inline-flex items-center gap-1.5 h-7 pl-3 pr-1.5 rounded-full text-xs font-medium leading-none text-white max-w-full"
                >
                  <span className="truncate leading-none">{tokenLabel}</span>
                  <button
                    type="button"
                    disabled={disabled}
                    aria-label={`Remove ${tokenLabel}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeToken(tokenValue);
                    }}
                    className="prism-focus-ring w-4 h-4 p-0 rounded-full inline-flex items-center justify-center text-white/95 enabled:hover:bg-black/15 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                  >
                    <X
                      aria-hidden="true"
                      className="w-3 h-3 block shrink-0 prism-contain-box"
                      strokeWidth={2.5}
                    />
                  </button>
                </span>
              );
            })}

            <input
              ref={inputRef}
              id={inputId}
              type="text"
              role="combobox"
              aria-expanded={isOpen}
              aria-controls={isOpen ? listboxId : undefined}
              aria-activedescendant={isOpen && activeCandidate ? activeCandidate.id : undefined}
              aria-autocomplete="list"
              aria-labelledby={label ? labelId : undefined}
              aria-label={ariaLabelProp ?? (!label ? placeholder : undefined)}
              disabled={disabled}
              value={query}
              placeholder={selectedValues.length === 0 ? placeholder : ''}
              onFocus={() => {
                if (!disabled) {
                  setOpen(true);
                }
              }}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
                setActiveIndex(0);
              }}
              onKeyDown={handleInputKeyDown}
              className="flex-1 min-w-[110px] bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none disabled:cursor-not-allowed"
            />
          </div>

          <button
            type="button"
            disabled={disabled}
            aria-label={isOpen ? 'Close options' : 'Open options'}
            onClick={(e) => {
              e.stopPropagation();
              setOpen((prev) => !prev);
              inputRef.current?.focus();
            }}
            className="prism-focus-ring w-8 h-8 rounded-full inline-flex items-center justify-center text-slate-600 dark:text-slate-300 enabled:hover:bg-white/60 dark:enabled:hover:bg-white/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            <ChevronDown
              aria-hidden="true"
              className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
      </div>

      {isOpen ? (
        <div
          id={listboxId}
          role="listbox"
          aria-multiselectable="true"
          aria-labelledby={label ? labelId : undefined}
          aria-label={!label ? (ariaLabelProp ?? 'Selectable options') : undefined}
          className="prism-slab absolute left-0 right-0 mt-2 p-1.5 z-40 max-h-64 overflow-y-auto"
        >
          {candidates.length === 0 ? (
            <div className="px-3.5 py-5 text-center text-xs text-slate-500 dark:text-slate-400">
              No matching options
            </div>
          ) : (
            <div className="space-y-0.5">
              {candidates.map((candidate, idx) => {
                const isHighlighted = idx === safeActiveIndex;

                if (candidate.kind === 'create') {
                  return (
                    <button
                      key={`create-${candidate.token}`}
                      id={candidate.id}
                      type="button"
                      role="option"
                      aria-selected={false}
                      aria-disabled={isAtLimit || undefined}
                      disabled={isAtLimit}
                      data-highlighted={isHighlighted ? 'true' : undefined}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => addCustomToken(candidate.token)}
                      className={`prism-focus-ring w-full px-3.5 py-2.5 rounded-2xl flex items-center justify-between gap-2 text-left transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:bg-white/65 dark:enabled:hover:bg-white/10 ${
                        isHighlighted ? 'bg-white/65 dark:bg-white/10' : ''
                      }`}
                    >
                      <span className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300 truncate">
                        <Plus className="w-4 h-4 shrink-0" aria-hidden="true" />
                        <span className="truncate">Create &quot;{candidate.token}&quot;</span>
                      </span>
                      <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 shrink-0">
                        ↵
                      </span>
                    </button>
                  );
                }

                const opt = candidate.option;
                const isSelected = selectedSet.has(opt.value);
                const isOptionDisabled = Boolean(opt.disabled) || (!isSelected && isAtLimit);

                return (
                  <button
                    key={`opt-${opt.value}`}
                    id={candidate.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={isOptionDisabled || undefined}
                    disabled={isOptionDisabled}
                    data-highlighted={isHighlighted ? 'true' : undefined}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => toggleOption(opt)}
                    className={`prism-focus-ring w-full px-3.5 py-2.5 rounded-2xl flex items-center justify-between gap-3 text-left transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:bg-white/65 dark:enabled:hover:bg-white/10 ${
                      isHighlighted ? 'bg-white/65 dark:bg-white/10' : ''
                    }`}
                  >
                    <div className="min-w-0 flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                        {opt.label}
                      </span>
                      {opt.category ? (
                        <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">
                          {opt.category}
                        </span>
                      ) : null}
                    </div>
                    {isSelected ? (
                      <span
                        aria-hidden="true"
                        className="prism-emerald w-5 h-5 rounded-md flex items-center justify-center text-white shrink-0"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[2.6]" />
                      </span>
                    ) : (
                      <span
                        aria-hidden="true"
                        className="w-5 h-5 rounded-md border border-slate-300/80 dark:border-slate-600/80 shrink-0"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {isAtLimit && resolvedMax !== undefined ? (
            <div className="mt-1 px-3 py-1.5 border-t border-slate-200/60 dark:border-slate-700/50 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
              Maximum of {resolvedMax} items selected
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export const MultiSelectCombobox = /*#__PURE__*/ memoWithDisplayName(MultiSelectComboboxInner, 'MultiSelectCombobox');
