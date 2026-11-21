'use client';

import { Check, Minus } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';

type CheckboxBaseProps = Omit<BaseProps<HTMLLabelElement>, 'onChange'>;

export interface CheckboxProps extends CheckboxBaseProps {
  /** Controlled checked state. */
  checked: boolean;
  /** Mixed/indeterminate visual and aria-checked="mixed" state. */
  indeterminate?: boolean;
  /** Callback invoked with the toggled checked boolean. */
  onChange: (checked: boolean) => void;
  /** Visible and accessible label text. */
  label: string;
  /** Optional secondary description rendered beneath the label. */
  description?: string;
  /** Disables toggling the checkbox. */
  disabled?: boolean;
}

export function Checkbox({
  checked,
  indeterminate = false,
  onChange,
  label,
  description,
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: CheckboxProps) {
  const override = useComponentOverride('Checkbox');

  const merged = mergeProps({
    themeTarget: themeProps('checkbox', { checked, indeterminate, disabled }),
    baseClassName: `inline-flex items-start gap-3 select-none group ${
      disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
    }`,
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <label ref={ref} {...rest} {...merged}>
      <button
        type="button"
        role="checkbox"
        disabled={disabled}
        aria-checked={indeterminate ? 'mixed' : checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`prism-focus-ring w-7 h-7 rounded-[9px] flex items-center justify-center shrink-0 transition-transform duration-150 enabled:group-hover:scale-105 cursor-pointer disabled:cursor-not-allowed ${
          checked || indeterminate ? 'prism-emerald text-white' : 'prism-crystal text-transparent'
        }`}
      >
        {indeterminate ? (
          <Minus className="w-4 h-4 stroke-[2.8] text-white" aria-hidden="true" />
        ) : (
          <Check
            className={`w-4 h-4 stroke-[2.8] ${checked ? 'opacity-100' : 'opacity-0'}`}
            aria-hidden="true"
          />
        )}
      </button>
      <span className="pt-0.5">
        <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">{label}</span>
        {description ? (
          <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</span>
        ) : null}
      </span>
    </label>
  );
}

Checkbox.displayName = 'Checkbox';
