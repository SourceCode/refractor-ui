'use client';

import {
  memo,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { Check, ChevronDown, Plus } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { useMergedRefs } from '../hooks/useMergedRefs';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { STYLE_PRIMARY_MAIN, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export interface CreatableOption {
  /** Unique option value committed when selected. */
  value: string;
  /** Visible option label displayed in the input and listbox. */
  label: string;
  /** Optional group label shown alongside the option and included in filtering. */
  group?: string;
}

type CreatableComboboxBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface CreatableComboboxProps extends CreatableComboboxBaseProps {
  /** Controlled list of available options. */
  options?: CreatableOption[];
  /** Initial list of options when managing options internally. */
  defaultOptions?: CreatableOption[];
  /** Controlled selected option value. */
  value?: string;
  /** Initial selected option value for uncontrolled usage. */
  defaultValue?: string;
  /** Callback fired with the selected value and full CreatableOption object. */
  onChange?: (value: string, option: CreatableOption) => void;
  /** Optional factory invoked when creating a new option from the trimmed query. */
  onCreateOption?: (label: string) => CreatableOption | void;
  /** Input placeholder shown when empty (defaults to 'Search or create...'). */
  placeholder?: string;
  /** Prefix displayed before the quoted query in the create row (defaults to 'Create'). */
  createPromptPrefix?: string;
  /** Visible field label rendered above the combobox (defaults to 'Combobox'). */
  label?: string;
  /** Disables searching, opening, selecting, and creating options. */
  disabled?: boolean;
}

type ComboboxCandidate =
  | { kind: 'option'; id: string; option: CreatableOption }
  | { kind: 'create'; id: string; label: string };

function dedupeOptions(items: ReadonlyArray<CreatableOption>): CreatableOption[] {
  const seen = new Set<string>();
  const out: CreatableOption[] = [];
  for (const item of items) {
    if (seen.has(item.value)) continue;
    seen.add(item.value);
    out.push(item);
  }
  return out;
}

function slugifyLabel(label: string): string {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || label.trim().toLowerCase();
}

function createUniqueSlug(
  label: string,
  existingMap: Map<string, CreatableOption>
): string {
  const base = slugifyLabel(label);
  if (!existingMap.has(base)) {
    return base;
  }
  let suffix = 2;
  while (existingMap.has(`${base}-${suffix}`)) {
    suffix += 1;
  }
  return `${base}-${suffix}`;
}

function CreatableComboboxInner({
  options,
  defaultOptions,
  value,
  defaultValue,
  onChange,
  onCreateOption,
  placeholder = 'Search or create...',
  createPromptPrefix = 'Create',
  label = 'Combobox',
  disabled = false,
  className,
  style,
  xstyle,
  'aria-label': ariaLabelProp,
  ref,
  ...rest
}: CreatableComboboxProps) {
  const [internalOptions] = useState<CreatableOption[]>(() =>
    dedupeOptions(defaultOptions ?? [])
  );
  const [createdOptions, setCreatedOptions] = useState<CreatableOption[]>([]);
  const [selectedValue, setSelectedValue] = useControllableState<string>({
    value,
    defaultValue: defaultValue ?? '',
  });
  const [query, setQuery] = useState<string>('');
  const [isFiltering, setIsFiltering] = useState<boolean>(false);
  const [open, setOpen] = useState<boolean>(false);
  const [activeIndex, setActiveIndex] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mergedRef = useMergedRefs(containerRef, ref);
  const labelId = useId();
  const inputId = useId();
  const listboxId = useId();
  const override = useComponentOverride('CreatableCombobox');

  const { availableOptions, optionMap } = useMemo(() => {
    const base = options ?? internalOptions;
    const map = new Map<string, CreatableOption>();
    const list: CreatableOption[] = [];
    for (const opt of [...base, ...createdOptions]) {
      if (!map.has(opt.value)) {
        map.set(opt.value, opt);
        list.push(opt);
      }
    }
    return { availableOptions: list, optionMap: map };
  }, [options, internalOptions, createdOptions]);

  const selectedOption = selectedValue ? optionMap.get(selectedValue) : undefined;
  const selectedDisplay = selectedOption?.label ?? selectedValue;
  const inputValue = isFiltering ? query : selectedDisplay;

  const trimmedQuery = isFiltering ? query.trim() : '';
  const lowerQuery = trimmedQuery.toLowerCase();

  const filteredOptions = useMemo(() => {
    if (!lowerQuery) return availableOptions;
    return availableOptions.filter(
      (opt) =>
        opt.label.toLowerCase().includes(lowerQuery) ||
        opt.value.toLowerCase().includes(lowerQuery) ||
        (opt.group ? opt.group.toLowerCase().includes(lowerQuery) : false)
    );
  }, [availableOptions, lowerQuery]);

  const exactMatchExists = useMemo(() => {
    if (!lowerQuery) return true;
    return availableOptions.some(
      (opt) =>
        opt.label.toLowerCase() === lowerQuery || opt.value.toLowerCase() === lowerQuery
    );
  }, [availableOptions, lowerQuery]);

  const showCreateOption = trimmedQuery.length > 0 && !exactMatchExists;

  const candidates = useMemo<ComboboxCandidate[]>(() => {
    const list: ComboboxCandidate[] = filteredOptions.map((opt, idx) => ({
      kind: 'option',
      id: `${listboxId}-opt-${idx}`,
      option: opt,
    }));
    if (showCreateOption) {
      list.push({
        kind: 'create',
        id: `${listboxId}-create`,
        label: trimmedQuery,
      });
    }
    return list;
  }, [filteredOptions, listboxId, showCreateOption, trimmedQuery]);

  const isOpen = open && !disabled;
  const safeActiveIndex =
    candidates.length > 0 ? Math.min(Math.max(activeIndex, 0), candidates.length - 1) : -1;
  const activeCandidate = safeActiveIndex >= 0 ? candidates[safeActiveIndex] : undefined;

  const closeMenu = useCallback(() => {
    setOpen(false);
    setIsFiltering(false);
    setQuery('');
    setActiveIndex(0);
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleOutsideMouseDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        event.target instanceof Node &&
        !containerRef.current.contains(event.target)
      ) {
        closeMenu();
      }
    };

    document.addEventListener('mousedown', handleOutsideMouseDown);
    return () => document.removeEventListener('mousedown', handleOutsideMouseDown);
  }, [isOpen, closeMenu]);

  const selectOption = useCallback(
    (opt: CreatableOption) => {
      if (disabled) return;
      setSelectedValue(opt.value);
      onChange?.(opt.value, opt);
      closeMenu();
    },
    [disabled, setSelectedValue, onChange, closeMenu]
  );

  const createOption = useCallback(
    (rawLabel: string) => {
      if (disabled) return;
      const trimmed = rawLabel.trim();
      if (!trimmed) return;
      const customOption = onCreateOption?.(trimmed);
      const nextOption: CreatableOption = customOption ?? {
        value: createUniqueSlug(trimmed, optionMap),
        label: trimmed,
      };
      setCreatedOptions((prev) =>
        prev.some((item) => item.value === nextOption.value) ? prev : [...prev, nextOption]
      );
      setSelectedValue(nextOption.value);
      onChange?.(nextOption.value, nextOption);
      closeMenu();
    },
    [disabled, onCreateOption, optionMap, setSelectedValue, onChange, closeMenu]
  );

  const handleInputKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (disabled || event.nativeEvent.isComposing) return;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (!isOpen) {
          setOpen(true);
          setActiveIndex(0);
        } else if (candidates.length > 0) {
          setActiveIndex((safeActiveIndex + 1) % candidates.length);
        }
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        if (!isOpen) {
          setOpen(true);
          setActiveIndex(Math.max(0, candidates.length - 1));
        } else if (candidates.length > 0) {
          setActiveIndex((safeActiveIndex - 1 + candidates.length) % candidates.length);
        }
        return;
      }

      if (event.key === 'Enter') {
        if (isOpen && activeCandidate) {
          event.preventDefault();
          if (activeCandidate.kind === 'option') {
            selectOption(activeCandidate.option);
          } else {
            createOption(activeCandidate.label);
          }
        }
        return;
      }

      if (event.key === 'Escape' && isOpen) {
        event.preventDefault();
        closeMenu();
      }
    },
    [
      disabled,
      isOpen,
      candidates.length,
      safeActiveIndex,
      activeCandidate,
      selectOption,
      createOption,
      closeMenu,
    ]
  );

  const merged = mergeProps({
    themeTarget: themeProps('creatable-combobox', {
      open: isOpen,
      disabled,
      hasSelection: selectedValue.length > 0,
    }),
    baseClassName: 'relative w-full',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const wellClass = stableClassName('creatable-combobox', 'well');
  const listboxClass = stableClassName('creatable-combobox', 'listbox');
  const optionClass = stableClassName('creatable-combobox', 'option');
  const createClass = stableClassName('creatable-combobox', 'create');

  return (
    <div ref={mergedRef} {...rest} {...merged}>
      {label ? (
        <label
          id={labelId}
          htmlFor={inputId}
          className="block text-xs font-semibold mb-1.5 ml-1"
          style={STYLE_TEXT_PRIMARY}
        >
          {label}
        </label>
      ) : null}

      <div
        className={cx(
          'prism-crystal rounded-[20px] p-1.5 transition-shadow',
          disabled ? 'opacity-60' : undefined
        )}
      >
        <div
          onClick={() => {
            if (disabled) return;
            setOpen(true);
            inputRef.current?.focus();
          }}
          className={cx(
            wellClass,
            'prism-well rounded-[14px] min-h-11 pl-3.5 pr-1.5 py-1.5 flex items-center justify-between gap-2',
            disabled ? 'cursor-not-allowed' : 'cursor-text'
          )}
        >
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            role="combobox"
            aria-expanded={isOpen}
            aria-controls={isOpen ? listboxId : undefined}
            aria-activedescendant={isOpen && activeCandidate ? activeCandidate.id : undefined}
            aria-autocomplete="list"
            aria-labelledby={!ariaLabelProp && label ? labelId : undefined}
            aria-label={ariaLabelProp ?? (!label ? placeholder : undefined)}
            disabled={disabled}
            value={inputValue}
            placeholder={placeholder}
            onFocus={() => {
              if (!disabled) {
                setOpen(true);
              }
            }}
            onChange={(event) => {
              setIsFiltering(true);
              setQuery(event.target.value);
              setOpen(true);
              setActiveIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
            style={STYLE_TEXT_PRIMARY}
            className="flex-1 min-w-0 bg-transparent text-sm focus:outline-none disabled:cursor-not-allowed"
          />

          <button
            type="button"
            disabled={disabled}
            aria-label={isOpen ? 'Close options' : 'Open options'}
            onClick={(event) => {
              event.stopPropagation();
              if (isOpen) {
                closeMenu();
              } else {
                setOpen(true);
                inputRef.current?.focus();
              }
            }}
            style={STYLE_TEXT_SECONDARY}
            className="prism-focus-ring w-8 h-8 rounded-full inline-flex items-center justify-center enabled:hover:bg-white/60 dark:enabled:hover:bg-white/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0 transition-colors"
          >
            <ChevronDown
              aria-hidden="true"
              className={cx(
                'w-4 h-4 transition-transform duration-150',
                isOpen ? 'rotate-180' : undefined
              )}
            />
          </button>
        </div>
      </div>

      {isOpen ? (
        <div
          id={listboxId}
          role="listbox"
          aria-labelledby={!ariaLabelProp && label ? labelId : undefined}
          aria-label={ariaLabelProp ?? (!label ? placeholder : undefined)}
          className={cx(
            listboxClass,
            'prism-slab absolute left-0 right-0 mt-2 p-1.5 z-40 max-h-64 overflow-y-auto'
          )}
        >
          {candidates.length === 0 ? (
            <div
              role="status"
              data-testid="creatable-combobox-empty"
              className="px-3.5 py-5 text-center text-xs font-medium"
              style={STYLE_TEXT_SECONDARY}
            >
              No matching options
            </div>
          ) : (
            <div className="space-y-0.5">
              {candidates.map((candidate, idx) => {
                const isHighlighted = idx === safeActiveIndex;

                if (candidate.kind === 'create') {
                  return (
                    <button
                      key={`create-${candidate.label}`}
                      id={candidate.id}
                      type="button"
                      role="option"
                      aria-selected={false}
                      data-highlighted={isHighlighted ? 'true' : undefined}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => createOption(candidate.label)}
                      style={STYLE_PRIMARY_MAIN}
                      className={cx(
                        createClass,
                        'prism-focus-ring w-full px-3 py-2.5 rounded-2xl flex items-center justify-between gap-2 text-left text-sm font-medium transition-colors cursor-pointer enabled:hover:bg-white/65 dark:enabled:hover:bg-white/10',
                        isHighlighted ? 'prism-well' : undefined
                      )}
                    >
                      <span className="inline-flex items-center gap-2 min-w-0">
                        <Plus className="w-4 h-4 shrink-0" aria-hidden="true" />
                        <span className="truncate">
                          + {createPromptPrefix} &quot;{candidate.label}&quot;
                        </span>
                      </span>
                      <span
                        aria-hidden="true"
                        className="text-[11px] font-mono shrink-0"
                        style={STYLE_TEXT_SECONDARY}
                      >
                        ↵
                      </span>
                    </button>
                  );
                }

                const opt = candidate.option;
                const isSelected = opt.value === selectedValue;

                return (
                  <button
                    key={`opt-${opt.value}`}
                    id={candidate.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    data-highlighted={isHighlighted ? 'true' : undefined}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectOption(opt)}
                    style={STYLE_TEXT_PRIMARY}
                    className={cx(
                      optionClass,
                      'prism-focus-ring w-full px-3 py-2.5 rounded-2xl flex items-center justify-between gap-3 text-left transition-colors cursor-pointer enabled:hover:bg-white/65 dark:enabled:hover:bg-white/10',
                      isHighlighted ? 'prism-well' : undefined
                    )}
                  >
                    <span className="min-w-0 flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{opt.label}</span>
                      {opt.group ? (
                        <span
                          className="prism-crystal px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0"
                          style={STYLE_TEXT_SECONDARY}
                        >
                          {opt.group}
                        </span>
                      ) : null}
                    </span>

                    {isSelected ? (
                      <span
                        aria-hidden="true"
                        className="prism-emerald w-5 h-5 rounded-full inline-flex items-center justify-center shrink-0"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[2.6]" />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export const CreatableCombobox = memo(CreatableComboboxInner);
CreatableCombobox.displayName = 'CreatableCombobox';
