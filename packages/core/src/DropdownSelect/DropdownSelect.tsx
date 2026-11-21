'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useMergedRefs } from '../hooks/useMergedRefs';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { composeEventHandlers } from '../utils/composeEventHandlers';
import { mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';

export interface SelectOption {
  /** Option value passed to onChange when selected. */
  value: string;
  /** Visible option label displayed in the trigger and listbox. */
  label: string;
  /** Disables selecting this individual option. */
  disabled?: boolean;
}

type DropdownSelectBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface DropdownSelectProps extends DropdownSelectBaseProps {
  /** Ordered list of selectable options. */
  options: SelectOption[];
  /** Currently selected option value. */
  value: string;
  /** Callback fired with the selected option value. */
  onChange: (value: string) => void;
  /** Optional field label rendered above the select pill. */
  label?: string;
  /** Placeholder text displayed when no option matches value. */
  placeholder?: string;
  /** Disables opening the dropdown and selecting options. */
  disabled?: boolean;
}

export function DropdownSelect({
  options,
  value,
  onChange,
  label,
  placeholder = 'Select',
  disabled = false,
  className,
  style,
  xstyle,
  onKeyDown,
  ref,
  ...rest
}: DropdownSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const mergedRef = useMergedRefs(containerRef, ref);
  const labelId = useId();
  const listboxId = useId();
  const override = useComponentOverride('DropdownSelect');

  const selectedOption = options.find((o) => o.value === value);
  const hasOptions = options.length > 0;
  const isOpen = open && !disabled && hasOptions;

  useEffect(() => {
    if (!isOpen) return;
    const onOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [isOpen]);

  const merged = mergeProps({
    themeTarget: themeProps('dropdown-select', { open: isOpen, disabled }),
    baseClassName: 'relative w-full',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const handleKeyDown = composeEventHandlers(onKeyDown, (e) => {
    if (e.key === 'Escape' && isOpen) {
      setOpen(false);
    }
  });

  return (
    <div ref={mergedRef} onKeyDown={handleKeyDown} {...rest} {...merged}>
      {label ? (
        <span
          id={labelId}
          className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5 ml-1"
        >
          {label}
        </span>
      ) : null}
      <button
        type="button"
        disabled={disabled || !hasOptions}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        aria-labelledby={label ? labelId : undefined}
        onClick={() => setOpen((prev) => !prev)}
        className="prism-crystal prism-focus-ring w-full h-14 rounded-full pl-5 pr-2.5 flex items-center justify-between gap-3 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="flex items-center gap-3 min-w-0">
          {/* Iconic 3/4 optical C-ring */}
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="w-5 h-5 text-slate-800 dark:text-slate-100 shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          >
            <path d="M18.36 6.64A9 9 0 1 0 18.36 17.36" />
          </svg>
          <span className="text-[15px] font-medium text-slate-800 dark:text-slate-100 truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </span>

        {/* Recessed right tray with emerald glass check square */}
        <span
          aria-hidden="true"
          className="h-10 pl-5 pr-1.5 rounded-full bg-slate-900/[0.03] dark:bg-white/[0.04] border border-white/50 dark:border-white/10 flex items-center justify-end shrink-0"
        >
          <span className="prism-emerald w-7 h-7 rounded-[8px] flex items-center justify-center text-white">
            <Check className="w-4 h-4 stroke-[2.6]" />
          </span>
        </span>
      </button>

      {isOpen ? (
        <div
          id={listboxId}
          role="listbox"
          aria-labelledby={label ? labelId : undefined}
          className="prism-slab absolute left-0 right-0 mt-2 p-1.5 z-40"
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                disabled={opt.disabled}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className="prism-focus-ring w-full px-4 py-2.5 rounded-2xl flex items-center justify-between text-left enabled:hover:bg-white/65 dark:enabled:hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                  {opt.label}
                </span>
                {isSelected ? (
                  <span
                    aria-hidden="true"
                    className="prism-emerald w-5 h-5 rounded-md flex items-center justify-center text-white"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[2.6]" />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

DropdownSelect.displayName = 'DropdownSelect';
