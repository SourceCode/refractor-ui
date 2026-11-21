'use client';

import { useRef, type KeyboardEvent } from 'react';
import type { BaseProps } from '../BaseProps';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';

export type RadioGroupOrientation = 'vertical' | 'horizontal';

export interface RadioOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

type RadioGroupBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface RadioGroupProps extends RadioGroupBaseProps {
  /** Accessible group name exposed via aria-label. */
  name: string;
  /** Mutually exclusive radio options. */
  options: ReadonlyArray<RadioOption>;
  /** Currently selected option value. */
  value: string;
  /** Callback invoked when a new option is selected. */
  onChange: (value: string) => void;
  /** Layout direction of the radio options. */
  orientation?: RadioGroupOrientation;
  /** Disables interaction across all options in the group. */
  disabled?: boolean;
}

export function RadioGroup({
  name,
  options,
  value,
  onChange,
  orientation = 'vertical',
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: RadioGroupProps) {
  const override = useComponentOverride('RadioGroup');
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const enabledOptions = options.filter((opt) => !disabled && !opt.disabled);
  const firstEnabledValue = enabledOptions[0]?.value;
  const hasSelectedEnabled = enabledOptions.some((opt) => opt.value === value);

  const handleRadioKeyDown = (e: KeyboardEvent<HTMLButtonElement>, currentValue: string) => {
    if (disabled || enabledOptions.length === 0) return;
    const delta =
      e.key === 'ArrowDown' || e.key === 'ArrowRight'
        ? 1
        : e.key === 'ArrowUp' || e.key === 'ArrowLeft'
          ? -1
          : 0;
    if (delta === 0) return;

    e.preventDefault();
    const currentIndex = enabledOptions.findIndex((opt) => opt.value === currentValue);
    const nextIndex = (Math.max(0, currentIndex) + delta + enabledOptions.length) % enabledOptions.length;
    const nextOption = enabledOptions[nextIndex] ?? enabledOptions[0];
    if (nextOption) {
      onChange(nextOption.value);
      buttonRefs.current.get(nextOption.value)?.focus();
    }
  };

  const merged = mergeProps({
    themeTarget: themeProps('radio-group', { orientation, disabled }),
    baseClassName: orientation === 'horizontal' ? 'flex flex-wrap gap-2.5' : 'space-y-2.5',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div
      ref={ref}
      role="radiogroup"
      aria-label={name}
      aria-orientation={orientation}
      aria-disabled={disabled || undefined}
      {...rest}
      {...merged}
    >
      {options.map((opt) => {
        const selected = opt.value === value;
        const isOptionDisabled = disabled || Boolean(opt.disabled);
        const isTabStop =
          !isOptionDisabled &&
          (selected || (!hasSelectedEnabled && opt.value === firstEnabledValue));

        return (
          <label
            key={opt.value}
            className={`flex items-start gap-3 p-2.5 rounded-2xl transition-colors ${
              isOptionDisabled
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-white/40 dark:hover:bg-white/5 cursor-pointer'
            }`}
          >
            <button
              ref={(el) => {
                if (el) {
                  buttonRefs.current.set(opt.value, el);
                } else {
                  buttonRefs.current.delete(opt.value);
                }
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={opt.label}
              disabled={isOptionDisabled}
              tabIndex={isTabStop ? 0 : -1}
              onClick={() => onChange(opt.value)}
              onKeyDown={(e) => handleRadioKeyDown(e, opt.value)}
              className="prism-crystal prism-focus-ring w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 cursor-pointer disabled:cursor-not-allowed"
            >
              {selected ? <span className="prism-emerald w-3.5 h-3.5 rounded-full block" /> : null}
            </button>
            <span>
              <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">
                {opt.label}
              </span>
              {opt.description ? (
                <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {opt.description}
                </span>
              ) : null}
            </span>
          </label>
        );
      })}
    </div>
  );
}

RadioGroup.displayName = 'RadioGroup';
