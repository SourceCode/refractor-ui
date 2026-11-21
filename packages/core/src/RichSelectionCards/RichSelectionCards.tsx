'use client';

import { useMemo, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { Check, Inbox } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';

export type RichSelectionMode = 'single' | 'multiple';

export interface RichSelectionCardOption {
  /** Unique identifier for this card option. */
  id: string;
  /** Primary card heading label. */
  title: string;
  /** Optional supporting copy rendered beneath the title. */
  description?: string;
  /** Optional pill badge rendered alongside the title. */
  badge?: string;
  /** Optional leading icon displayed inside an optical medallion. */
  icon?: ReactNode;
  /** Disables selection of this individual card. */
  disabled?: boolean;
}

type RichSelectionCardsBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface RichSelectionCardsProps extends RichSelectionCardsBaseProps {
  /** Selectable optical glass card options. */
  options: RichSelectionCardOption[];
  /** Selection mode: single mutually exclusive radio or multiple checkbox cards (defaults to 'single'). */
  mode?: RichSelectionMode;
  /** Controlled array of selected option IDs. */
  value?: string[];
  /** Initial selected option IDs in uncontrolled mode (defaults to []). */
  defaultValue?: string[];
  /** Callback fired with the updated array of selected option IDs. */
  onChange?: (selectedIds: string[]) => void;
  /** Responsive column count on wider viewports (defaults to 2). */
  columns?: 1 | 2 | 3;
  /** Accessible group label exposed via aria-label (defaults to 'Choose an option'). */
  label?: string;
  /** Disables selection across all cards in the group. */
  disabled?: boolean;
}

const EMPTY_SELECTION: string[] = [];

function getColumnsGridClass(columns: 1 | 2 | 3): string {
  if (columns === 1) return 'grid grid-cols-1 gap-3';
  if (columns === 3) return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3';
  return 'grid grid-cols-1 sm:grid-cols-2 gap-3';
}

export function RichSelectionCards({
  options,
  mode = 'single',
  value,
  defaultValue = EMPTY_SELECTION,
  onChange,
  columns = 2,
  label = 'Choose an option',
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: RichSelectionCardsProps) {
  const override = useComponentOverride('RichSelectionCards');
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const [selectedIds, setSelectedIds] = useControllableState<string[]>({
    value,
    defaultValue,
    onChange,
  });

  const isSingle = mode === 'single';

  const selectedSet = useMemo(() => {
    const active = isSingle ? selectedIds.slice(0, 1) : selectedIds;
    return new Set<string>(active);
  }, [isSingle, selectedIds]);

  const enabledOptions = useMemo(
    () => options.filter((opt) => !disabled && !opt.disabled),
    [disabled, options]
  );

  const firstEnabledId = enabledOptions[0]?.id;
  const hasSelectedEnabled = enabledOptions.some((opt) => selectedSet.has(opt.id));

  const handleCardSelect = (opt: RichSelectionCardOption) => {
    if (disabled || opt.disabled) return;
    if (isSingle) {
      setSelectedIds([opt.id]);
      return;
    }
    const next = selectedSet.has(opt.id)
      ? selectedIds.filter((id) => id !== opt.id)
      : [...selectedIds, opt.id];
    setSelectedIds(next);
  };

  const handleCardKeyDown = (e: KeyboardEvent<HTMLButtonElement>, opt: RichSelectionCardOption) => {
    if (e.nativeEvent.isComposing || disabled || opt.disabled || !isSingle) return;

    const delta =
      e.key === 'ArrowRight' || e.key === 'ArrowDown'
        ? 1
        : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
          ? -1
          : 0;
    if (delta === 0) return;

    e.preventDefault();
    const currentIndex = enabledOptions.findIndex((item) => item.id === opt.id);
    const nextIndex = (currentIndex + delta + enabledOptions.length) % enabledOptions.length;
    const nextOption = enabledOptions[nextIndex]!;
    setSelectedIds([nextOption.id]);
    buttonRefs.current.get(nextOption.id)?.focus();
  };

  const isEmpty = options.length === 0;

  const merged = mergeProps({
    themeTarget: themeProps('rich-selection-cards', {
      mode,
      columns,
      disabled,
      empty: isEmpty,
    }),
    baseClassName: isEmpty ? 'w-full' : getColumnsGridClass(columns),
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const cardClass = stableClassName('rich-selection-cards', 'card');
  const medallionClass = stableClassName('rich-selection-cards', 'medallion');
  const badgeClass = stableClassName('rich-selection-cards', 'badge');
  const checkClass = stableClassName('rich-selection-cards', 'check');
  const emptyClass = stableClassName('rich-selection-cards', 'empty');

  return (
    <div
      ref={ref}
      role={isSingle ? 'radiogroup' : 'group'}
      aria-label={label}
      aria-disabled={disabled || undefined}
      {...rest}
      {...merged}
    >
      {isEmpty ? (
        <div
          data-testid="rich-selection-cards-empty"
          className={cx(
            emptyClass,
            'prism-well rounded-2xl p-6 text-center border border-[var(--prism-divider)] flex flex-col items-center justify-center gap-2'
          )}
        >
          <span
            aria-hidden="true"
            className="prism-crystal w-9 h-9 rounded-xl inline-flex items-center justify-center text-[var(--prism-text-secondary)]"
          >
            <Inbox className="w-4 h-4" aria-hidden="true" />
          </span>
          <p className="text-sm font-medium text-[var(--prism-text-primary)]">
            No options available
          </p>
          <p className="text-xs text-[var(--prism-text-secondary)]">
            Add selection card options to choose from.
          </p>
        </div>
      ) : (
        options.map((opt) => {
          const isSelected = selectedSet.has(opt.id);
          const isCardDisabled = disabled || Boolean(opt.disabled);
          const singleTabIndex =
            !isCardDisabled &&
            (isSelected || (!hasSelectedEnabled && opt.id === firstEnabledId))
              ? 0
              : -1;

          return (
            <button
              key={opt.id}
              ref={(el) => {
                if (el) {
                  buttonRefs.current.set(opt.id, el);
                } else {
                  buttonRefs.current.delete(opt.id);
                }
              }}
              type="button"
              role={isSingle ? 'radio' : 'checkbox'}
              aria-checked={isSelected}
              disabled={isCardDisabled}
              tabIndex={isSingle ? singleTabIndex : undefined}
              data-option-id={opt.id}
              data-selected={isSelected ? 'true' : undefined}
              data-disabled={isCardDisabled ? 'true' : undefined}
              onClick={() => handleCardSelect(opt)}
              onKeyDown={(e) => handleCardKeyDown(e, opt)}
              className={cx(
                cardClass,
                'prism-focus-ring relative w-full text-left rounded-2xl p-4 flex items-start gap-3.5 transition-all duration-150 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 enabled:hover:-translate-y-0.5 enabled:hover:brightness-[1.02]',
                isSelected
                  ? 'prism-crystal ring-2 ring-[var(--prism-primary-main)]'
                  : 'prism-slab border border-[var(--prism-divider)]'
              )}
            >
              {opt.icon ? (
                <span
                  aria-hidden="true"
                  data-testid={`rich-card-icon-${opt.id}`}
                  className={cx(
                    medallionClass,
                    'prism-well w-10 h-10 rounded-xl inline-flex items-center justify-center shrink-0'
                  )}
                  style={{
                    color: isSelected
                      ? 'var(--prism-primary-main)'
                      : 'var(--prism-text-secondary)',
                  }}
                >
                  {opt.icon}
                </span>
              ) : null}

              <span className="flex-1 min-w-0 pr-7">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold tracking-[-0.01em] text-[var(--prism-text-primary)]">
                    {opt.title}
                  </span>
                  {opt.badge ? (
                    <span
                      className={cx(
                        badgeClass,
                        'prism-well rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-tight text-[var(--prism-primary-main)]'
                      )}
                    >
                      {opt.badge}
                    </span>
                  ) : null}
                </span>
                {opt.description ? (
                  <span className="block mt-1 text-xs leading-relaxed text-[var(--prism-text-secondary)]">
                    {opt.description}
                  </span>
                ) : null}
              </span>

              <span
                aria-hidden="true"
                data-testid={`rich-card-indicator-${opt.id}`}
                className={cx(
                  checkClass,
                  'absolute top-3.5 right-3.5 w-5 h-5 inline-flex items-center justify-center transition-all duration-150',
                  isSingle ? 'rounded-full' : 'rounded-md',
                  isSelected
                    ? 'prism-emerald text-[var(--prism-success-contrast)]'
                    : 'prism-well border border-[var(--prism-divider)]'
                )}
              >
                {isSelected ? (
                  <Check className="w-3.5 h-3.5 relative z-10" strokeWidth={2.75} aria-hidden="true" />
                ) : null}
              </span>
            </button>
          );
        })
      )}
    </div>
  );
}

RichSelectionCards.displayName = 'RichSelectionCards';
