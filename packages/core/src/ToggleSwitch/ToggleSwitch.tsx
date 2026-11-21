'use client';

import type { BaseProps } from '../BaseProps';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';

type ToggleSwitchBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface ToggleSwitchProps extends ToggleSwitchBaseProps {
  /** Controlled binary on/off state. */
  checked: boolean;
  /** Callback invoked immediately with the toggled state. */
  onChange: (checked: boolean) => void;
  /** Visible text label displayed next to the switch. */
  label?: string;
  /** Accessible name override when label is omitted or customized. */
  ariaLabel?: string;
  /** Disables pointer and keyboard toggling. */
  disabled?: boolean;
}

export function ToggleSwitch({
  checked,
  onChange,
  label,
  ariaLabel,
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: ToggleSwitchProps) {
  const override = useComponentOverride('ToggleSwitch');

  const merged = mergeProps({
    themeTarget: themeProps('toggle-switch', { checked, disabled }),
    baseClassName: 'inline-flex items-center gap-3',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div ref={ref} {...rest} {...merged}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel || label || 'Toggle setting'}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`prism-focus-ring relative w-[78px] h-[42px] rounded-full p-1 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0 ${
          checked ? 'prism-emerald' : 'prism-crystal'
        }`}
      >
        <span
          className={`prism-thumb block w-[34px] h-[34px] rounded-full transition-transform duration-200 ${
            checked ? 'translate-x-[36px]' : 'translate-x-0'
          }`}
        />
      </button>
      {label ? (
        <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{label}</span>
      ) : null}
    </div>
  );
}

ToggleSwitch.displayName = 'ToggleSwitch';
