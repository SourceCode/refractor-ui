import React from 'react';
import { AlertTriangle, CheckCircle2, Info, Inbox, X, XCircle } from 'lucide-react';
import { PrimaryButton } from './buttons';

/* 1. Toast / Snackbar (Exact match to "❖ Toast" crystal capsule with warm-amber inner ring) */
export interface ToastSnackbarProps {
  title: string;
  description?: string;
  tone?: 'amber' | 'emerald' | 'info' | 'critical';
  onDismiss?: () => void;
}

export const ToastSnackbar: React.FC<ToastSnackbarProps> = ({
  title,
  description,
  tone = 'amber',
  onDismiss,
}) => {
  const diamondGradient =
    tone === 'emerald'
      ? 'from-emerald-400 to-teal-600'
      : tone === 'critical'
        ? 'from-red-400 to-rose-600'
        : tone === 'info'
          ? 'from-sky-400 to-blue-600'
          : 'from-amber-300 via-orange-400 to-slate-400';

  return (
    <div
      role="status"
      aria-live="polite"
      className="prism-crystal prism-toast min-h-12 px-5 py-2.5 inline-flex items-center justify-between gap-3.5"
    >
      <span className="inline-flex items-center gap-3">
        {/* 4-point faceted prism diamond icon from attached reference */}
        <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" aria-hidden="true">
          <polygon points="12,2 21,12 12,12" className="fill-orange-300/90" />
          <polygon points="12,2 3,12 12,12" className="fill-slate-300/90" />
          <polygon points="12,22 21,12 12,12" className="fill-orange-400/80" />
          <polygon points="12,22 3,12 12,12" className="fill-slate-400/75" />
          <circle cx="12" cy="12" r="1.5" className={`bg-gradient-to-br ${diamondGradient} fill-white/80`} />
        </svg>
        <span>
          <span className="block text-[15px] font-medium text-slate-800 dark:text-slate-100 leading-tight">
            {title}
          </span>
          {description && (
            <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {description}
            </span>
          )}
        </span>
      </span>

      {onDismiss && (
        <button
          type="button"
          aria-label={`Dismiss ${title} notification`}
          onClick={onDismiss}
          className="text-slate-500 hover:text-slate-800 dark:hover:text-white p-1 cursor-pointer relative z-10"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

/* 2. Alert Banner */
export interface AlertBannerProps {
  severity?: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  severity = 'info',
  title,
  message,
  actionLabel,
  onAction,
  onDismiss,
}) => {
  const config = {
    info: {
      icon: <Info className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" />,
      ring: 'ring-1 ring-sky-400/50',
    },
    success: {
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />,
      ring: 'ring-1 ring-emerald-400/50',
    },
    warning: {
      icon: <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />,
      ring: 'ring-1 ring-amber-400/60',
    },
    error: {
      icon: <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />,
      ring: 'ring-1 ring-red-400/60',
    },
  }[severity];

  return (
    <div
      role="alert"
      className={`prism-slab ${config.ring} px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full`}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5">{config.icon}</span>
        <div>
          <div className="text-sm font-semibold text-slate-900 dark:text-white">{title}</div>
          <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{message}</div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="prism-btn-secondary h-8 px-3.5 text-xs font-medium cursor-pointer"
          >
            {actionLabel}
          </button>
        )}
        {onDismiss && (
          <button
            type="button"
            aria-label="Dismiss alert"
            onClick={onDismiss}
            className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

/* 3. Progress Bar & Loading Spinner */
export interface ProgressAndSpinnerProps {
  progress: number;
  label?: string;
  indeterminateSpinner?: boolean;
}

export const ProgressAndSpinner: React.FC<ProgressAndSpinnerProps> = ({
  progress,
  label = 'Compiling refractive shader cache',
  indeterminateSpinner = true,
}) => {
  const clamped = Math.max(0, Math.min(100, progress));

  return (
    <div className="space-y-4 w-full">
      <div>
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="font-medium text-slate-700 dark:text-slate-200">{label}</span>
          <span className="font-mono tabular-nums font-semibold text-slate-800 dark:text-slate-100">
            {clamped}%
          </span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label}
          className="prism-crystal h-4 rounded-full p-0.5 overflow-hidden"
        >
          <div
            className="prism-btn-primary h-full rounded-full transition-all duration-200"
            style={{ width: `${clamped}%` }}
          />
        </div>
      </div>

      {indeterminateSpinner && (
        <div className="inline-flex items-center gap-3 prism-crystal rounded-full px-4 py-2">
          <svg
            viewBox="0 0 24 24"
            role="status"
            aria-label="Loading"
            className="w-5 h-5 text-emerald-600 dark:text-emerald-400 animate-spin"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
            Synchronizing virtual storage...
          </span>
        </div>
      )}
    </div>
  );
};

/* 4. Skeleton Loader */
export interface SkeletonLoaderProps {
  loading: boolean;
  children?: React.ReactNode;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ loading, children }) => {
  if (!loading && children) {
    return <>{children}</>;
  }

  return (
    <div
      aria-busy="true"
      aria-label="Loading content placeholder"
      className="prism-slab p-5 space-y-4"
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
};

/* 5. Empty State */
export interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="prism-slab p-8 text-center flex flex-col items-center justify-center max-w-md mx-auto">
      <div className="prism-crystal w-14 h-14 rounded-2xl flex items-center justify-center text-slate-700 dark:text-slate-200 mb-4">
        <Inbox className="w-6 h-6" />
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
};
