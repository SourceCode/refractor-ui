'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { BaseProps } from '../BaseProps';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { mergeProps } from '../utils/mergeProps';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export type IconButtonSize = 'sm' | 'md' | 'lg';

export interface IconButtonProps
  extends BaseProps<HTMLButtonElement>,
    Pick<
      ButtonHTMLAttributes<HTMLButtonElement>,
      'disabled' | 'form' | 'formAction' | 'name' | 'type' | 'value'
    > {
  /** Mandatory accessible label for screen readers since IconButton has no visible text. */
  'aria-label': string;
  /** Square tile dimension and corner radius scale. */
  size?: IconButtonSize;
  /** Pressed/active toggle highlight state reflected via aria-pressed and data-active. */
  active?: boolean;
  /** Icon glyph content. */
  children?: ReactNode;
}

function IconButtonInner({
  size = 'md',
  active = false,
  children,
  className,
  style,
  xstyle,
  disabled = false,
  type = 'button',
  ref,
  ...rest
}: IconButtonProps) {
  const override = useComponentOverride('IconButton');
  const sizeClasses =
    size === 'sm'
      ? 'w-9 h-9 rounded-[13px]'
      : size === 'lg'
        ? 'w-14 h-14 rounded-[20px]'
        : 'w-12 h-12 rounded-[17px]';

  const merged = mergeProps({
    themeTarget: themeProps('icon-button', { size, active, disabled }),
    baseClassName: `prism-crystal prism-focus-ring inline-flex items-center justify-center shrink-0 cursor-pointer text-slate-800 dark:text-slate-100 transition-transform duration-150 enabled:hover:-translate-y-0.5 enabled:active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed ${
      active ? 'ring-2 ring-orange-400/70' : ''
    } ${sizeClasses}`,
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <button ref={ref} type={type} disabled={disabled} aria-pressed={active} {...rest} {...merged}>
      {children}
    </button>
  );
}

export const IconButton = /*#__PURE__*/ memoWithDisplayName(IconButtonInner, 'IconButton');
