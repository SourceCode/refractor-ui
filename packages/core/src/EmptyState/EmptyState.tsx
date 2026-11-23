'use client';

import { memo } from 'react';
import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { PrimaryButton } from '../PrimaryButton/PrimaryButton';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';

export interface EmptyStateProps extends BaseProps<HTMLDivElement> {
  /** Heading summarizing why the view is empty. */
  title: string;
  /** Helpful guidance explaining what the user can do next. */
  description: string;
  /** Label for the primary call-to-action button. */
  actionLabel: string;
  /** Handler invoked when the primary call-to-action button is clicked. */
  onAction: () => void;
  /** Optional custom emblem icon replacing the default Inbox symbol. */
  icon?: ReactNode;
}

function EmptyStateInner({
  title,
  description,
  actionLabel,
  onAction,
  icon,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: EmptyStateProps) {
  const override = useComponentOverride('EmptyState');

  const merged = mergeProps({
    themeTarget: themeProps('empty-state'),
    baseClassName:
      'prism-slab p-8 text-center flex flex-col items-center justify-center max-w-md mx-auto',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div ref={ref} {...rest} {...merged}>
      <div className="prism-crystal w-14 h-14 rounded-2xl flex items-center justify-center text-slate-700 dark:text-slate-200 mb-4">
        {icon ?? <Inbox className="w-6 h-6" aria-hidden="true" />}
      </div>
      <h4 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h4>
      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 mb-5 max-w-xs leading-relaxed">
        {description}
      </p>
      <PrimaryButton size="sm" onClick={onAction}>
        {actionLabel}
      </PrimaryButton>
    </div>
  );
}

export const EmptyState = memo(EmptyStateInner);
EmptyState.displayName = 'EmptyState';
