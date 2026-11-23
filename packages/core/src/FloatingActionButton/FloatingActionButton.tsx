'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Plus } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { mergeProps } from '../utils/mergeProps';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export type FloatingActionButtonTone = 'primary' | 'cobalt' | 'crystal';

export interface FloatingActionButtonProps
  extends BaseProps<HTMLButtonElement>,
    Pick<
      ButtonHTMLAttributes<HTMLButtonElement>,
      'disabled' | 'form' | 'formAction' | 'name' | 'type' | 'value'
    > {
  /** Optional text label that expands the circular FAB into an extended pill. */
  label?: string;
  /** Custom icon node; defaults to Lucide Plus glyph. */
  icon?: ReactNode;
  /** Refractive glass surface tone ('primary' | 'cobalt' | 'crystal'). */
  tone?: FloatingActionButtonTone;
}

function FloatingActionButtonInner({
  label,
  icon,
  tone = 'primary',
  className,
  style,
  xstyle,
  disabled = false,
  type = 'button',
  'aria-label': ariaLabel,
  ref,
  ...rest
}: FloatingActionButtonProps) {
  const override = useComponentOverride('FloatingActionButton');
  const toneClass =
    tone === 'primary'
      ? 'prism-btn-primary'
      : tone === 'cobalt'
        ? 'prism-btn-cobalt'
        : 'prism-crystal rounded-full text-slate-900 dark:text-white';

  const merged = mergeProps({
    themeTarget: themeProps('floating-action-button', {
      tone,
      extended: Boolean(label),
      disabled,
    }),
    baseClassName: `${toneClass} prism-focus-ring inline-flex items-center justify-center gap-2 ${
      label ? 'h-14 px-6' : 'w-14 h-14'
    } cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm whitespace-nowrap shrink-0`,
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      aria-label={ariaLabel || label || 'Quick create action'}
      {...rest}
      {...merged}
    >
      <span className="relative z-10">
        {icon ?? <Plus className="w-5 h-5 stroke-[2.2]" aria-hidden="true" />}
      </span>
      {label ? <span className="relative z-10">{label}</span> : null}
    </button>
  );
}

export const FloatingActionButton = /*#__PURE__*/ memoWithDisplayName(FloatingActionButtonInner, 'FloatingActionButton');
