'use client';

import { Ban, CheckCircle2, Loader2, RotateCw, Square, XCircle } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';

export type ProcessStatus = 'running' | 'success' | 'failed' | 'cancelled';

export interface ProcessStatusPillProps extends BaseProps<HTMLSpanElement> {
  /** Human-readable process or task name displayed inside the pill. */
  label: string;
  /** Execution lifecycle state ('running' | 'success' | 'failed' | 'cancelled'). */
  status: ProcessStatus;
  /** Optional elapsed duration in milliseconds (negative/NaN/non-finite values are ignored). */
  elapsedMs?: number;
  /** Optional numeric process exit code rendered as a monospace badge when finite. */
  exitCode?: number;
  /** Optional handler that displays a Stop button while status is 'running'. */
  onStop?: () => void;
  /** Optional handler that displays a Retry button while status is 'failed' or 'cancelled'. */
  onRetry?: () => void;
  /** Pill density scale ('sm' | 'md', defaults to 'md'). */
  size?: 'sm' | 'md';
}

function formatElapsedMs(elapsedMs?: number): string | null {
  if (elapsedMs === undefined || !Number.isFinite(elapsedMs) || elapsedMs < 0) {
    return null;
  }
  if (elapsedMs < 1000) {
    return `${Math.floor(elapsedMs)}ms`;
  }
  if (elapsedMs < 60000) {
    return `${(elapsedMs / 1000).toFixed(1)}s`;
  }
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

function renderStatusIcon(status: ProcessStatus, iconClassName: string) {
  switch (status) {
    case 'running':
      return (
        <Loader2
          aria-hidden="true"
          data-testid="process-status-icon"
          className={cx(iconClassName, 'animate-spin')}
          style={{ color: 'var(--prism-info-main)' }}
        />
      );
    case 'success':
      return (
        <CheckCircle2
          aria-hidden="true"
          data-testid="process-status-icon"
          className={iconClassName}
          style={{ color: 'var(--prism-success-main)' }}
        />
      );
    case 'failed':
      return (
        <XCircle
          aria-hidden="true"
          data-testid="process-status-icon"
          className={iconClassName}
          style={{ color: 'var(--prism-error-main)' }}
        />
      );
    case 'cancelled':
      return (
        <Ban
          aria-hidden="true"
          data-testid="process-status-icon"
          className={iconClassName}
          style={{ color: 'var(--prism-text-secondary)' }}
        />
      );
  }
}

export function ProcessStatusPill({
  label,
  status,
  elapsedMs,
  exitCode,
  onStop,
  onRetry,
  size = 'md',
  className,
  style,
  xstyle,
  ref,
  ...rest
}: ProcessStatusPillProps) {
  const override = useComponentOverride('ProcessStatusPill');

  const formattedElapsed = formatElapsedMs(elapsedMs);
  const hasExitCode = exitCode !== undefined && Number.isFinite(exitCode);
  const showStop = status === 'running' && Boolean(onStop);
  const showRetry = (status === 'failed' || status === 'cancelled') && Boolean(onRetry);
  const isSmall = size === 'sm';

  const merged = mergeProps({
    themeTarget: themeProps('process-status-pill', {
      status,
      size,
      hasElapsed: formattedElapsed !== null,
      hasExitCode,
    }),
    baseClassName: cx(
      'prism-crystal rounded-full inline-flex items-center whitespace-nowrap transition-all',
      isSmall ? 'h-7 px-2.5 gap-1.5 text-[11px]' : 'h-9 px-3.5 gap-2 text-xs'
    ),
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const labelClass = stableClassName('process-status-pill', 'label');
  const elapsedClass = stableClassName('process-status-pill', 'elapsed');
  const exitCodeClass = stableClassName('process-status-pill', 'exit-code');
  const actionClass = stableClassName('process-status-pill', 'action');

  const iconClassName = isSmall ? 'w-3.5 h-3.5 shrink-0' : 'w-4 h-4 shrink-0';
  const actionButtonClass = cx(
    actionClass,
    'prism-well prism-focus-ring rounded-full inline-flex items-center justify-center gap-1 font-medium whitespace-nowrap shrink-0 transition-all cursor-pointer enabled:hover:brightness-105',
    isSmall ? 'h-5 px-2 text-[10px]' : 'h-6 px-2.5 text-[11px]'
  );

  return (
    <span ref={ref} role="status" {...rest} {...merged}>
      {renderStatusIcon(status, iconClassName)}

      <span
        className={cx(labelClass, 'font-medium truncate max-w-[240px]')}
        style={{ color: 'var(--prism-text-primary)' }}
      >
        {label}
      </span>

      {formattedElapsed !== null ? (
        <span
          data-testid="process-elapsed"
          className={cx(elapsedClass, 'font-mono tabular-nums shrink-0')}
          style={{ color: 'var(--prism-text-secondary)' }}
        >
          {formattedElapsed}
        </span>
      ) : null}

      {hasExitCode ? (
        <code
          data-testid="process-exit-code"
          className={cx(
            exitCodeClass,
            'prism-well rounded-full font-mono tabular-nums font-medium shrink-0',
            isSmall ? 'px-1.5 py-0 text-[10px]' : 'px-2 py-0.5 text-[11px]'
          )}
          style={{
            color:
              exitCode === 0 ? 'var(--prism-success-main)' : 'var(--prism-error-main)',
          }}
        >
          exit {Math.trunc(exitCode)}
        </code>
      ) : null}

      {showStop ? (
        <button
          type="button"
          onClick={onStop}
          className={actionButtonClass}
          style={{ color: 'var(--prism-error-main)' }}
        >
          <Square aria-hidden="true" className="w-2.5 h-2.5 shrink-0" />
          <span>Stop</span>
        </button>
      ) : null}

      {showRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className={actionButtonClass}
          style={{ color: 'var(--prism-primary-main)' }}
        >
          <RotateCw aria-hidden="true" className="w-3 h-3 shrink-0" />
          <span>Retry</span>
        </button>
      ) : null}
    </span>
  );
}

ProcessStatusPill.displayName = 'ProcessStatusPill';
