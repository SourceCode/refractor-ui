'use client';

import { memo } from 'react';

import type { BaseProps } from '../BaseProps';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';

export type BadgeStatusTone = 'online' | 'warning' | 'offline' | 'counter';

export interface BadgeStatusProps extends BaseProps<HTMLSpanElement> {
  /** Explicit accessible status text paired with the dot or numeric counter. */
  label: string;
  /** Optional numeric counter rendered inside a tangerine glass pill. */
  count?: number;
  /** Semantic indicator dot tone ('online' | 'warning' | 'offline' | 'counter'). */
  tone?: BadgeStatusTone;
}

function BadgeStatusInner({
  label,
  count,
  tone = 'online',
  className,
  style,
  xstyle,
  ref,
  ...rest
}: BadgeStatusProps) {
  const override = useComponentOverride('BadgeStatus');

  const dotClass =
    tone === 'online'
      ? 'bg-emerald-500'
      : tone === 'warning'
        ? 'bg-amber-500'
        : tone === 'offline'
          ? 'bg-slate-400'
          : 'bg-orange-500';

  const merged = mergeProps({
    themeTarget: themeProps('badge-status', { tone, hasCount: count !== undefined }),
    baseClassName:
      'prism-crystal rounded-full px-3.5 py-1.5 inline-flex items-center gap-2 text-xs font-medium text-slate-800 dark:text-slate-100 whitespace-nowrap',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <span ref={ref} {...rest} {...merged}>
      {count !== undefined ? (
        <span className="prism-btn-primary h-5 min-w-5 px-1.5 rounded-full inline-flex items-center justify-center text-[11px] font-mono tabular-nums font-semibold">
          {count}
        </span>
      ) : (
        <span aria-hidden="true" className={`w-2 h-2 rounded-full ${dotClass}`} />
      )}
      <span>{label}</span>
    </span>
  );
}

export const BadgeStatus = memo(BadgeStatusInner);
BadgeStatus.displayName = 'BadgeStatus';
