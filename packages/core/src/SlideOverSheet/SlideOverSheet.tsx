'use client';

import { useEffect, useId, type ReactNode } from 'react';
import { X } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { composeEventHandlers } from '../utils/composeEventHandlers';
import { mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';

export type SlideOverSheetMode = 'right' | 'bottom';

export interface SlideOverSheetProps extends BaseProps<HTMLDivElement> {
  /** Controls visibility of the slide-over sheet dialog. */
  open: boolean;
  /** Edge from which the optical slab enters ('right' drawer or 'bottom' sheet). */
  mode?: SlideOverSheetMode;
  /** Heading displayed at the top of the panel. */
  title: string;
  /** Optional subtitle displayed below the heading. */
  subtitle?: string;
  /** Scrollable sheet body content. */
  children: ReactNode;
  /** Callback invoked when the sheet is dismissed via Escape, backdrop, Close icon, or Done button. */
  onClose: () => void;
}

export function SlideOverSheet({
  open,
  mode = 'right',
  title,
  subtitle,
  children,
  onClose,
  onClick,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: SlideOverSheetProps) {
  const titleId = useId();
  const subtitleId = useId();
  const override = useComponentOverride('SlideOverSheet');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const merged = mergeProps({
    themeTarget: themeProps('slide-over-sheet', { open, mode }),
    baseClassName: 'fixed inset-0 z-50 bg-slate-900/35 backdrop-blur-xs flex',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={subtitle ? subtitleId : undefined}
      onClick={composeEventHandlers(onClick, () => onClose())}
      {...rest}
      {...merged}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`prism-slab p-6 flex flex-col justify-between ${
          mode === 'right'
            ? 'ml-auto h-full w-full max-w-md rounded-l-[28px] rounded-r-none'
            : 'mt-auto w-full max-h-[75vh] rounded-t-[28px] rounded-b-none'
        }`}
      >
        <div className="space-y-4 overflow-y-auto">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 id={titleId} className="text-lg font-semibold text-slate-900 dark:text-white">
                {title}
              </h3>
              {subtitle ? (
                <p id={subtitleId} className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {subtitle}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              aria-label="Close panel"
              onClick={onClose}
              className="prism-focus-ring rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white p-1 cursor-pointer"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
          <div className="text-sm text-slate-700 dark:text-slate-200">{children}</div>
        </div>

        <div className="pt-4 border-t border-slate-300/45 dark:border-slate-700/50 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="prism-btn-secondary prism-focus-ring inline-flex items-center justify-center gap-2 font-medium tracking-[-0.01em] whitespace-nowrap shrink-0 cursor-pointer h-9 px-5 text-xs"
          >
            <span className="relative z-10">Done</span>
          </button>
        </div>
      </div>
    </div>
  );
}

SlideOverSheet.displayName = 'SlideOverSheet';
