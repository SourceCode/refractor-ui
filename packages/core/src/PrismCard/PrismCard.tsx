'use client';

import type { ReactNode } from 'react';
import type { BaseProps } from '../BaseProps';
import { useMergedRefs } from '../hooks/useMergedRefs';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';

export interface PrismCardProps extends BaseProps<HTMLElement> {
  /** Optional heading or specimen corner label. */
  title?: string;
  /** Optional kicker text rendered above the title. */
  kicker?: string;
  /** Card body content. */
  children?: ReactNode;
  /** Optional footer bar rendered beneath a translucent divider. */
  footer?: ReactNode;
  /** Renders the sculptural optical crystal slab specimen instead of a structured content article. */
  specimenSlab?: boolean;
}

export function PrismCard({
  title,
  kicker,
  children,
  footer,
  specimenSlab = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: PrismCardProps) {
  const override = useComponentOverride('PrismCard');
  const mergedRef = useMergedRefs<HTMLElement>(ref);

  const merged = mergeProps({
    themeTarget: themeProps('prism-card', { specimenSlab }),
    baseClassName: specimenSlab
      ? 'prism-slab relative h-44 w-full max-w-[260px] p-5 flex flex-col justify-between overflow-hidden select-none'
      : 'prism-slab p-5 flex flex-col justify-between gap-4',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  if (specimenSlab) {
    return (
      <div ref={mergedRef} {...rest} {...merged}>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-10 -left-10 w-52 h-32 rounded-[40%] bg-gradient-to-br from-white/85 via-white/30 to-transparent -rotate-12"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-4 left-1.5 w-2 rounded-full bg-gradient-to-b from-sky-300/40 via-violet-300/25 to-amber-300/45 blur-[2px]"
        />
        <span />
        <div className="flex justify-end">
          <span className="text-base font-medium text-slate-800 dark:text-slate-100 tracking-[-0.01em]">
            {title || 'Card'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <article ref={mergedRef} {...rest} {...merged}>
      <div>
        {kicker ? (
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{kicker}</div>
        ) : null}
        {title ? (
          <h4 className="text-base font-semibold text-slate-900 dark:text-white tracking-tight">
            {title}
          </h4>
        ) : null}
        {children ? (
          <div className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {children}
          </div>
        ) : null}
      </div>
      {footer ? (
        <div className="pt-3 border-t border-slate-300/40 dark:border-slate-700/50 flex items-center justify-between gap-3">
          {footer}
        </div>
      ) : null}
    </article>
  );
}

PrismCard.displayName = 'PrismCard';
