'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { BaseProps } from '../BaseProps';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';

export type SecondaryButtonSize = 'sm' | 'md' | 'lg';
export type SecondaryButtonTone = 'crystal' | 'cobalt';

export interface SecondaryButtonProps
  extends BaseProps<HTMLButtonElement>,
    Pick<
      ButtonHTMLAttributes<HTMLButtonElement>,
      'disabled' | 'form' | 'formAction' | 'name' | 'type' | 'value'
    > {
  /** Capsule height and horizontal padding scale. */
  size?: SecondaryButtonSize;
  /** Optical glass surface tone ('crystal' frosted ice or 'cobalt' sapphire CTA). */
  tone?: SecondaryButtonTone;
  /** Optional icon rendered before the label. */
  leadingIcon?: ReactNode;
  /** Optional icon rendered after the label. */
  trailingIcon?: ReactNode;
  /** Button label content. */
  children?: ReactNode;
}

export function SecondaryButton({
  size = 'md',
  tone = 'crystal',
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
}: SecondaryButtonProps) {
  const override = useComponentOverride('SecondaryButton');
  const sizeClasses =
    size === 'sm'
      ? 'h-9 px-5 text-xs'
      : size === 'lg'
        ? 'h-14 px-9 text-base'
        : 'h-12 px-7 text-[15px]';

  const toneClass = tone === 'cobalt' ? 'prism-btn-cobalt' : 'prism-btn-secondary';

  const merged = mergeProps({
    themeTarget: themeProps('secondary-button', { size, tone, disabled }),
    baseClassName: `${toneClass} prism-focus-ring inline-flex items-center justify-center gap-2 font-medium tracking-[-0.01em] whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${sizeClasses}`,
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

SecondaryButton.displayName = 'SecondaryButton';
