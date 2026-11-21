'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Check, Copy, RefreshCw, Share2, ThumbsDown, ThumbsUp } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';

export type ResponseFeedback = 'up' | 'down' | null;

type ResponseActionBarBaseProps = Omit<BaseProps<HTMLDivElement>, 'onCopy'>;

export interface ResponseActionBarProps extends ResponseActionBarBaseProps {
  /** Response text written to the clipboard when Copy is activated. */
  contentToCopy?: string;
  /** Callback invoked after copying with the copied response text. */
  onCopy?: (content: string) => void;
  /** Optional callback that enables the Regenerate action button. */
  onRegenerate?: () => void;
  /** Optional callback that enables the Share action button. */
  onShare?: () => void;
  /** Controlled feedback rating ('up' | 'down' | null). */
  feedback?: ResponseFeedback;
  /** Initial uncontrolled feedback rating (default null). */
  defaultFeedback?: ResponseFeedback;
  /** Callback fired whenever feedback selection changes. */
  onFeedbackChange?: (next: ResponseFeedback) => void;
  /** Disables all built-in toolbar actions. */
  disabled?: boolean;
  /** Optional extra controls rendered at the trailing end of the pill toolbar. */
  extraActions?: ReactNode;
}

const COPY_FEEDBACK_DURATION_MS = 1800;

const IDLE_BUTTON_CLASS =
  'text-slate-700 dark:text-slate-200 enabled:hover:bg-white/60 dark:enabled:hover:bg-white/10 enabled:hover:text-slate-950 dark:enabled:hover:text-white';

export function ResponseActionBar({
  contentToCopy,
  onCopy,
  onRegenerate,
  onShare,
  feedback,
  defaultFeedback = null,
  onFeedbackChange,
  disabled = false,
  extraActions,
  className,
  style,
  xstyle,
  'aria-label': ariaLabel,
  ref,
  ...rest
}: ResponseActionBarProps) {
  const override = useComponentOverride('ResponseActionBar');
  const [currentFeedback, setCurrentFeedback] = useControllableState<ResponseFeedback>({
    value: feedback,
    defaultValue: defaultFeedback,
    onChange: onFeedbackChange,
  });

  const [copied, setCopied] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const handleCopy = useCallback(() => {
    const text = contentToCopy ?? '';
    try {
      const clipboard = navigator.clipboard;
      if (clipboard && typeof clipboard.writeText === 'function') {
        void Promise.resolve(clipboard.writeText(text)).catch(() => undefined);
      }
    } catch {
      // Clipboard API unavailable or restricted; continue with callback and visual confirmation.
    }

    onCopy?.(text);
    setCopied(true);
    setStatusMessage('Response copied to clipboard.');

    if (copyTimerRef.current !== null) {
      clearTimeout(copyTimerRef.current);
    }
    copyTimerRef.current = setTimeout(() => {
      setCopied(false);
      copyTimerRef.current = null;
    }, COPY_FEEDBACK_DURATION_MS);
  }, [contentToCopy, onCopy]);

  const handleFeedbackToggle = useCallback(
    (target: 'up' | 'down') => {
      const next: ResponseFeedback = currentFeedback === target ? null : target;
      setCurrentFeedback(next);
      if (next === 'up') {
        setStatusMessage('Marked response as helpful.');
      } else if (next === 'down') {
        setStatusMessage('Marked response as unhelpful.');
      } else {
        setStatusMessage('Feedback cleared.');
      }
    },
    [currentFeedback, setCurrentFeedback]
  );

  const merged = mergeProps({
    themeTarget: themeProps('response-action-bar', {
      disabled,
      copied,
      feedback: currentFeedback ?? undefined,
    }),
    baseClassName:
      'prism-crystal rounded-full px-2 py-1 inline-flex flex-wrap items-center gap-1 w-fit max-w-full',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const actionGroupClass = stableClassName('response-action-bar', 'actions');
  const feedbackGroupClass = stableClassName('response-action-bar', 'feedback');
  const extraGroupClass = stableClassName('response-action-bar', 'extra');

  const baseButtonClass =
    'prism-focus-ring h-7 px-2.5 rounded-full inline-flex items-center justify-center gap-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-all cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed';

  const thumbButtonClass =
    'prism-focus-ring h-7 w-7 rounded-full inline-flex items-center justify-center shrink-0 transition-all cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed';

  return (
    <div
      ref={ref}
      role="toolbar"
      aria-label={ariaLabel ?? 'Response actions'}
      {...rest}
      {...merged}
    >
      <div className={cx(actionGroupClass, 'inline-flex items-center gap-1')}>
        <button
          type="button"
          disabled={disabled}
          onClick={handleCopy}
          data-copied={copied ? 'true' : undefined}
          className={cx(
            baseButtonClass,
            copied ? 'prism-emerald font-semibold' : IDLE_BUTTON_CLASS
          )}
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>Copy</span>
            </>
          )}
        </button>

        {onRegenerate ? (
          <button
            type="button"
            disabled={disabled}
            onClick={onRegenerate}
            className={cx(baseButtonClass, IDLE_BUTTON_CLASS)}
          >
            <RefreshCw className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>Regenerate</span>
          </button>
        ) : null}

        {onShare ? (
          <button
            type="button"
            disabled={disabled}
            onClick={onShare}
            className={cx(baseButtonClass, IDLE_BUTTON_CLASS)}
          >
            <Share2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>Share</span>
          </button>
        ) : null}
      </div>

      <span
        aria-hidden="true"
        className="h-4 w-px bg-[var(--prism-divider)] mx-0.5 shrink-0"
      />

      <div className={cx(feedbackGroupClass, 'inline-flex items-center gap-1')}>
        <button
          type="button"
          disabled={disabled}
          aria-label="Thumbs up"
          aria-pressed={currentFeedback === 'up'}
          data-feedback-action="up"
          onClick={() => handleFeedbackToggle('up')}
          className={cx(
            thumbButtonClass,
            currentFeedback === 'up' ? 'prism-emerald' : IDLE_BUTTON_CLASS
          )}
        >
          <ThumbsUp className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        </button>

        <button
          type="button"
          disabled={disabled}
          aria-label="Thumbs down"
          aria-pressed={currentFeedback === 'down'}
          data-feedback-action="down"
          onClick={() => handleFeedbackToggle('down')}
          className={cx(
            thumbButtonClass,
            currentFeedback === 'down' ? 'prism-btn-primary' : IDLE_BUTTON_CLASS
          )}
        >
          <ThumbsDown className="w-3.5 h-3.5 shrink-0 relative z-10" aria-hidden="true" />
        </button>
      </div>

      {extraActions ? (
        <>
          <span
            aria-hidden="true"
            className="h-4 w-px bg-[var(--prism-divider)] mx-0.5 shrink-0"
          />
          <div className={cx(extraGroupClass, 'inline-flex items-center gap-1')}>
            {extraActions}
          </div>
        </>
      ) : null}

      <span role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {statusMessage}
      </span>
    </div>
  );
}

ResponseActionBar.displayName = 'ResponseActionBar';
