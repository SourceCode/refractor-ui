'use client';

import { memo } from 'react';

import type { BaseProps } from '../BaseProps';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';

export type TimelineTone = 'emerald' | 'amber' | 'cobalt';

export interface TimelineEntry {
  id: string;
  timestamp: string;
  title: string;
  detail: string;
  tone?: TimelineTone;
}

export interface TimelineProps extends BaseProps<HTMLOListElement> {
  /** Ordered chronological sequence of milestones. */
  entries: ReadonlyArray<TimelineEntry>;
}

function TimelineInner({
  entries,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: TimelineProps) {
  const override = useComponentOverride('Timeline');

  const merged = mergeProps({
    themeTarget: themeProps('timeline', { empty: entries.length === 0 }),
    baseClassName: 'prism-slab p-5 space-y-5',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <ol ref={ref} {...rest} {...merged}>
      {entries.map((entry, idx) => {
        const markerClass =
          entry.tone === 'emerald'
            ? 'prism-emerald'
            : entry.tone === 'cobalt'
              ? 'prism-btn-cobalt'
              : 'prism-btn-primary';

        return (
          <li key={entry.id} className="relative flex items-start gap-4">
            {idx < entries.length - 1 ? (
              <span
                aria-hidden="true"
                className="absolute left-3.5 top-7 -bottom-5 w-px bg-slate-300/70 dark:bg-slate-700"
              />
            ) : null}
            <span
              className={`${markerClass} w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-mono tabular-nums text-white shrink-0`}
            >
              {idx + 1}
            </span>
            <div className="min-w-0 pt-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  {entry.title}
                </span>
                <span aria-hidden="true" className="text-slate-400">
                  ·
                </span>
                <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                  {entry.timestamp}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                {entry.detail}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export const Timeline = memo(TimelineInner);
Timeline.displayName = 'Timeline';
