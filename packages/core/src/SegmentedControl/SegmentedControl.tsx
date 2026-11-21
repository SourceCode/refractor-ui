'use client';

import type { ReactNode } from 'react';
import type { BaseProps } from '../BaseProps';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';

export interface SegmentOption {
  /** Unique option value passed to onChange when selected. */
  value: string;
  /** Visible segment text label. */
  label: string;
  /** Optional leading icon rendered next to the segment label. */
  icon?: ReactNode;
  /** Disables selecting this individual segment. */
  disabled?: boolean;
}

type SegmentedControlBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface SegmentedControlProps extends SegmentedControlBaseProps {
  /** Ordered list of selectable segments. */
  options: SegmentOption[];
  /** Currently selected segment value. */
  value: string;
  /** Fired with the newly selected option value. */
  onChange: (value: string) => void;
  /** Accessible group name (alias for aria-label). */
  ariaLabel?: string;
  /** Disables all segments in the control. */
  disabled?: boolean;
}

export function SegmentedControl({
  options,
  value,
  onChange,
  ariaLabel = 'View selector',
  disabled = false,
  className,
  style,
  xstyle,
  'aria-label': ariaLabelProp,
  ref,
  ...rest
}: SegmentedControlProps) {
  const override = useComponentOverride('SegmentedControl');

  const merged = mergeProps({
    themeTarget: themeProps('segmented-control', { disabled }),
    baseClassName: 'prism-crystal inline-flex items-center p-1 rounded-full gap-1 max-w-full overflow-x-auto',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div
      ref={ref}
      role="group"
      aria-label={ariaLabelProp ?? ariaLabel}
      {...rest}
      {...merged}
    >
      {options.map((opt) => {
        const selected = opt.value === value;
        const isDisabled = disabled || Boolean(opt.disabled);
        const optionMerged = mergeProps({
          themeTarget: themeProps('segmented-control', { selected, disabled: isDisabled }, 'option'),
          baseClassName: `prism-focus-ring h-9 px-4 rounded-full text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 ${
            selected
              ? 'prism-well text-slate-900 dark:text-white font-semibold shadow-sm'
              : 'text-slate-600 dark:text-slate-300 enabled:hover:text-slate-900 dark:enabled:hover:text-white'
          }`,
        });

        return (
          <button
            key={opt.value}
            type="button"
            disabled={isDisabled}
            aria-pressed={selected}
            onClick={() => onChange(opt.value)}
            {...optionMerged}
          >
            {opt.icon}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

SegmentedControl.displayName = 'SegmentedControl';
