'use client';

import type { ReactNode } from 'react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { memoWithDisplayName } from '../utils/memo';
import { mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';

export interface FocusPrismaticRingProps extends BaseProps<HTMLDivElement> {
  /** Optional corner radius preset matching the wrapped control (default: `'lg'`). */
  radius?: 'md' | 'lg' | 'xl' | 'full';
  /** Forces the focus ring visible for preview/testing states (default: false). */
  forceVisible?: boolean;
  children?: ReactNode;
}

const ROOT_CLASS = /*#__PURE__*/ stableClassName('focus-prismatic-ring');

const RADIUS_CLASS: Readonly<Record<'md' | 'lg' | 'xl' | 'full', string>> = /*#__PURE__*/ Object.freeze({
  md: 'rounded-lg',
  lg: 'rounded-xl',
  xl: 'rounded-2xl',
  full: 'rounded-full',
});

function FocusPrismaticRingInner({
  radius = 'lg',
  forceVisible = false,
  className,
  style,
  xstyle,
  ref,
  children,
  ...rest
}: FocusPrismaticRingProps) {
  const override = useComponentOverride('FocusPrismaticRing');

  const merged = mergeProps({
    themeTarget: themeProps('FocusPrismaticRing', {
      radius,
      forceVisible,
    }),
    baseClassName: `${ROOT_CLASS} prism-focus-prismatic inline-flex ${RADIUS_CLASS[radius]}`,
    overrideClassName: override?.className,
    userClassName: className,
    baseStyle: forceVisible
      ? {
          boxShadow:
            '0 0 0 2px rgba(var(--prism-ink-rgb, 15, 23, 42), 0.92), 0 0 0 4.5px rgba(var(--prism-primary-rgb, 232, 93, 4), 0.95), 0 0 14px rgba(var(--prism-secondary-rgb, 56, 189, 248), 0.65)',
        }
      : undefined,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div ref={ref} {...rest} {...merged}>
      {children}
    </div>
  );
}

export const FocusPrismaticRing = /*#__PURE__*/ memoWithDisplayName(FocusPrismaticRingInner, 'FocusPrismaticRing');
