'use client';

import { memo } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { BaseProps } from '../BaseProps';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';

export type PrimaryButtonSize = 'sm' | 'md' | 'lg';

export interface PrimaryButtonProps
  extends BaseProps<HTMLButtonElement>,
    Pick<
      ButtonHTMLAttributes<HTMLButtonElement>,
      'disabled' | 'form' | 'formAction' | 'name' | 'type' | 'value'
    > {
  /** Capsule height and horizontal padding scale. */
  size?: PrimaryButtonSize;
  /** Optional icon rendered before the label. */
  leadingIcon?: ReactNode;
  /** Optional icon rendered after the label. */
  trailingIcon?: ReactNode;
  /** Button label content. */
  children?: ReactNode;
}

function PrimaryButtonInner({
  size = 'md',
  leadingIcon,
  trailingIcon,
  children,
  className,
  style,
  xstyle,
  disabled = false,
  type = 'button',
  ref,
  ...rest
}: PrimaryButtonProps) {
  const override = useComponentOverride('PrimaryButton');
  const sizeClasses =
    size === 'sm'
      ? 'h-9 px-5 text-xs'
      : size === 'lg'
        ? 'h-14 px-9 text-base'
        : 'h-12 px-7 text-[15px]';

  const merged = mergeProps({
    themeTarget: themeProps('primary-button', { size, disabled }),
    baseClassName: `prism-btn-primary prism-focus-ring inline-flex items-center justify-center gap-2.5 font-medium tracking-[-0.01em] whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${sizeClasses}`,
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <button ref={ref} type={type} disabled={disabled} {...rest} {...merged}>
      {leadingIcon ? <span className="relative z-10 shrink-0">{leadingIcon}</span> : null}
      <span className="relative z-10">{children}</span>
      {trailingIcon ? <span className="relative z-10 shrink-0">{trailingIcon}</span> : null}
    </button>
  );
}

export const PrimaryButton = memo(PrimaryButtonInner);
PrimaryButton.displayName = 'PrimaryButton';
