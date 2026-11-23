'use client';

import { memo } from 'react';

import { X } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';

export type ToastSnackbarTone = 'amber' | 'emerald' | 'info' | 'critical';

export interface ToastSnackbarProps extends BaseProps<HTMLDivElement> {
  /** Primary notification heading. */
  title: string;
  /** Optional supporting detail copy. */
  description?: string;
  /** Optical accent tone for the prism diamond emblem. */
  tone?: ToastSnackbarTone;
  /** Optional dismiss handler; renders a close button when provided. */
  onDismiss?: () => void;
}

function ToastSnackbarInner({
  title,
  description,
  tone = 'amber',
  onDismiss,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: ToastSnackbarProps) {
  const override = useComponentOverride('ToastSnackbar');

  const diamondGradient =
    tone === 'emerald'
      ? 'from-emerald-400 to-teal-600'
      : tone === 'critical'
        ? 'from-red-400 to-rose-600'
        : tone === 'info'
          ? 'from-sky-400 to-blue-600'
          : 'from-amber-300 via-orange-400 to-slate-400';

  const merged = mergeProps({
    themeTarget: themeProps('toast-snackbar', { tone }),
    baseClassName:
      'prism-crystal prism-toast min-h-12 px-5 py-2.5 inline-flex items-center justify-between gap-3.5',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div ref={ref} role="status" aria-live="polite" {...rest} {...merged}>
      <span className="inline-flex items-center gap-3">
        <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" aria-hidden="true">
          <polygon points="12,2 21,12 12,12" className="fill-orange-300/90" />
          <polygon points="12,2 3,12 12,12" className="fill-slate-300/90" />
          <polygon points="12,22 21,12 12,12" className="fill-orange-400/80" />
          <polygon points="12,22 3,12 12,12" className="fill-slate-400/75" />
          <circle
            cx="12"
            cy="12"
            r="1.5"
            className={`bg-gradient-to-br ${diamondGradient} fill-white/80`}
          />
        </svg>
        <span>
          <span className="block text-[15px] font-medium text-slate-800 dark:text-slate-100 leading-tight">
            {title}
          </span>
          {description ? (
            <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {description}
            </span>
          ) : null}
        </span>
      </span>

      {onDismiss ? (
        <button
          type="button"
          aria-label={`Dismiss ${title} notification`}
          onClick={onDismiss}
          className="prism-focus-ring text-slate-500 hover:text-slate-800 dark:hover:text-white p-1 cursor-pointer relative z-10 rounded-full"
        >
          <X className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}

export const ToastSnackbar = memo(ToastSnackbarInner);
ToastSnackbar.displayName = 'ToastSnackbar';
