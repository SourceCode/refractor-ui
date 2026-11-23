'use client';

import { memo } from 'react';
import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';

export type AlertBannerSeverity = 'info' | 'success' | 'warning' | 'error';

export interface AlertBannerProps extends BaseProps<HTMLDivElement> {
  /** Semantic severity governing icon and optical accent ring. */
  severity?: AlertBannerSeverity;
  /** Prominent heading communicating the alert subject. */
  title: string;
  /** Detailed explanation or guidance copy. */
  message: string;
  /** Optional label for a secondary action button (requires onAction). */
  actionLabel?: string;
  /** Callback triggered when the action button is pressed. */
  onAction?: () => void;
  /** Optional callback enabling the dismiss button. */
  onDismiss?: () => void;
}

interface SeverityVisual {
  icon: ReactNode;
  ring: string;
}

function getSeverityVisual(severity: AlertBannerSeverity): SeverityVisual {
  switch (severity) {
    case 'success':
      return {
        icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />,
        ring: 'ring-1 ring-emerald-400/50',
      };
    case 'warning':
      return {
        icon: <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden="true" />,
        ring: 'ring-1 ring-amber-400/60',
      };
    case 'error':
      return {
        icon: <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" aria-hidden="true" />,
        ring: 'ring-1 ring-red-400/60',
      };
    case 'info':
    default:
      return {
        icon: <Info className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" aria-hidden="true" />,
        ring: 'ring-1 ring-sky-400/50',
      };
  }
}

function AlertBannerInner({
  severity = 'info',
  title,
  message,
  actionLabel,
  onAction,
  onDismiss,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: AlertBannerProps) {
  const override = useComponentOverride('AlertBanner');
  const visual = getSeverityVisual(severity);

  const merged = mergeProps({
    themeTarget: themeProps('alert-banner', { severity }),
    baseClassName: `prism-slab ${visual.ring} px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full`,
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div ref={ref} role="alert" {...rest} {...merged}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5">{visual.icon}</span>
        <div>
          <div className="text-sm font-semibold text-slate-900 dark:text-white">{title}</div>
          <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{message}</div>
        </div>
      </div>

      {((actionLabel && onAction) || onDismiss) ? (
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          {actionLabel && onAction ? (
            <button
              type="button"
              onClick={onAction}
              className="prism-btn-secondary prism-focus-ring h-8 px-3.5 text-xs font-medium cursor-pointer"
            >
              {actionLabel}
            </button>
          ) : null}
          {onDismiss ? (
            <button
              type="button"
              aria-label="Dismiss alert"
              onClick={onDismiss}
              className="prism-focus-ring p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer rounded-full"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export const AlertBanner = memo(AlertBannerInner);
AlertBanner.displayName = 'AlertBanner';
