'use client';

import type { ReactNode } from 'react';
import type { BaseProps } from '../BaseProps';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';

export interface SkeletonLoaderProps extends BaseProps<HTMLDivElement> {
  /** When true, displays the animated optical placeholder instead of children. */
  loading: boolean;
  /** Resolved content rendered once loading completes. */
  children?: ReactNode;
}

export function SkeletonLoader({
  loading,
  children,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: SkeletonLoaderProps) {
  const override = useComponentOverride('SkeletonLoader');
  const showPlaceholder =
    loading || children === undefined || children === null || children === false;

  const merged = mergeProps({
    themeTarget: themeProps('skeleton-loader', { loading: showPlaceholder }),
    baseClassName: showPlaceholder ? 'prism-slab p-5 space-y-4' : undefined,
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  if (!showPlaceholder) {
    return (
      <div ref={ref} {...rest} {...merged}>
        {children}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      aria-busy="true"
      aria-label="Loading content placeholder"
      {...rest}
      {...merged}
    >
      <div className="flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-full bg-slate-300/70 dark:bg-slate-700/70 animate-pulse shrink-0" />
        <div className="space-y-2 flex-1">
          <div className="h-3.5 w-2/5 rounded-full bg-slate-300/80 dark:bg-slate-700/80 animate-pulse" />
          <div className="h-2.5 w-3/5 rounded-full bg-slate-300/60 dark:bg-slate-700/60 animate-pulse" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full rounded-full bg-slate-300/65 dark:bg-slate-700/65 animate-pulse" />
        <div className="h-3 w-4/5 rounded-full bg-slate-300/55 dark:bg-slate-700/55 animate-pulse" />
      </div>
    </div>
  );
}

SkeletonLoader.displayName = 'SkeletonLoader';
