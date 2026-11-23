'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';
import { Check, Copy } from 'lucide-react';
import type { BaseProps, OpticalStyleTokens } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { composeEventHandlers } from '../utils/composeEventHandlers';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { STYLE_TEXT_SECONDARY } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export type InlineCopySize = 'sm' | 'md';

export type InlineCopyVariant = 'crystal' | 'well' | 'ghost';

type InlineCopyTriggerBaseProps = Omit<BaseProps<HTMLButtonElement>, 'onCopy'>;

export interface InlineCopyTriggerProps extends InlineCopyTriggerBaseProps {
  /** Exact payload string written to the system clipboard on activation. */
  value: string;
  /** Optional truncated or formatted display label; defaults to `value`. */
  displayText?: string;
  /** Label rendered inside the emerald confirmation badge after copying (defaults to 'Copied'). */
  copiedLabel?: string;
  /** Milliseconds before resetting back to the copy icon (default 1800, clamped 400..10000). */
  resetDelayMs?: number;
  /** Compact or standard capsule sizing scale ('sm' | 'md', defaults to 'md'). */
  size?: InlineCopySize;
  /** Optical glass surface treatment ('crystal' | 'well' | 'ghost', defaults to 'well'). */
  variant?: InlineCopyVariant;
  /** Renders the snippet text in tabular monospace typography (defaults to true). */
  monospace?: boolean;
  /** Callback invoked after each copy attempt with the exact payload and success status. */
  onCopy?: (copiedValue: string, succeeded: boolean) => void;
  /** Disables interaction and dims the inline optical capsule (defaults to false). */
  disabled?: boolean;
}

const DEFAULT_COPIED_LABEL = 'Copied';
const DEFAULT_RESET_DELAY_MS = 1800;
const MIN_RESET_DELAY_MS = 400;
const MAX_RESET_DELAY_MS = 10000;

interface InlineCopySizeStyles {
  buttonClass: string;
  iconClass: string;
  badgeClass: string;
}

function getSizeStyles(size: InlineCopySize): InlineCopySizeStyles {
  if (size === 'sm') {
    return {
      buttonClass: 'h-7 px-2.5 text-xs',
      iconClass: 'w-3 h-3',
      badgeClass: 'px-1.5 py-0.5 text-[10px]',
    };
  }
  return {
    buttonClass: 'h-9 px-3 text-xs sm:text-sm',
    iconClass: 'w-3.5 h-3.5',
    badgeClass: 'px-2 py-0.5 text-[11px]',
  };
}

interface InlineCopyVariantStyles {
  surfaceClass: string;
  baseStyle: OpticalStyleTokens;
}

function getVariantStyles(
  variant: InlineCopyVariant,
  copied: boolean
): InlineCopyVariantStyles {
  switch (variant) {
    case 'crystal':
      return {
        surfaceClass: 'prism-crystal border',
        baseStyle: {
          color: 'var(--prism-text-primary)',
          borderColor: copied ? 'var(--prism-success-main)' : 'transparent',
        },
      };
    case 'ghost':
      return {
        surfaceClass: 'bg-transparent border',
        baseStyle: {
          color: 'var(--prism-text-primary)',
          borderColor: copied ? 'var(--prism-success-main)' : 'var(--prism-divider)',
        },
      };
    case 'well':
      return {
        surfaceClass: 'prism-well border',
        baseStyle: {
          color: 'var(--prism-text-primary)',
          borderColor: copied ? 'var(--prism-success-main)' : 'var(--prism-well-border)',
        },
      };
  }
}

const valuePartClass = /*#__PURE__*/ stableClassName('inline-copy-trigger', 'value');
const iconPartClass = /*#__PURE__*/ stableClassName('inline-copy-trigger', 'icon');
const badgePartClass = /*#__PURE__*/ stableClassName('inline-copy-trigger', 'badge');

function InlineCopyTriggerInner({
  value,
  displayText,
  copiedLabel = DEFAULT_COPIED_LABEL,
  resetDelayMs = DEFAULT_RESET_DELAY_MS,
  size = 'md',
  variant = 'well',
  monospace = true,
  onCopy,
  disabled = false,
  'aria-label': ariaLabelProp,
  className,
  style,
  xstyle,
  onClick,
  onKeyDown,
  ref,
  ...rest
}: InlineCopyTriggerProps) {
  const override = useComponentOverride('InlineCopyTrigger');

  const [copied, setCopied] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');

  const mountedRef = useRef<boolean>(true);
  const attemptIdRef = useRef<number>(0);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clampedResetDelayMs = Math.round(
    clampNumber(
      resetDelayMs,
      MIN_RESET_DELAY_MS,
      MAX_RESET_DELAY_MS,
      DEFAULT_RESET_DELAY_MS
    )
  );

  const resolvedCopiedLabel = copiedLabel.trim() || DEFAULT_COPIED_LABEL;
  const visibleLabel = displayText || value;

  const clearResetTimer = useCallback(() => {
    if (resetTimerRef.current !== null) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearResetTimer();
    };
  }, [clearResetTimer]);

  const finalizeCopy = useCallback(
    (succeeded: boolean, attemptId: number) => {
      if (!mountedRef.current || attemptId !== attemptIdRef.current) {
        return;
      }
      clearResetTimer();
      if (succeeded) {
        setCopied(true);
        setStatusMessage(`${resolvedCopiedLabel} to clipboard.`);
        resetTimerRef.current = setTimeout(() => {
          resetTimerRef.current = null;
          setCopied(false);
          setStatusMessage('');
        }, clampedResetDelayMs);
      } else {
        setCopied(false);
        setStatusMessage('Unable to copy to clipboard.');
      }
      onCopy?.(value, succeeded);
    },
    [clampedResetDelayMs, clearResetTimer, onCopy, resolvedCopiedLabel, value]
  );

  const triggerCopy = useCallback(() => {
    const attemptId = attemptIdRef.current + 1;
    attemptIdRef.current = attemptId;
    clearResetTimer();

    let writePromise: Promise<void>;
    try {
      const clipboard = navigator.clipboard;
      if (!clipboard || typeof clipboard.writeText !== 'function') {
        finalizeCopy(false, attemptId);
        return;
      }
      writePromise = Promise.resolve(clipboard.writeText(value));
    } catch {
      finalizeCopy(false, attemptId);
      return;
    }

    void writePromise.then(
      () => {
        finalizeCopy(true, attemptId);
      },
      () => {
        finalizeCopy(false, attemptId);
      }
    );
  }, [clearResetTimer, finalizeCopy, value]);

  const handleClick = composeEventHandlers<MouseEvent<HTMLButtonElement>>(
    onClick,
    () => {
      triggerCopy();
    }
  );

  const handleKeyDown = composeEventHandlers<KeyboardEvent<HTMLButtonElement>>(
    onKeyDown,
    (event) => {
      if (event.nativeEvent.isComposing) {
        event.preventDefault();
      }
    }
  );

  const sizeStyles = getSizeStyles(size);
  const variantStyles = getVariantStyles(variant, copied);

  const computedAriaLabel = visibleLabel
    ? copied
      ? `${resolvedCopiedLabel}: ${visibleLabel}`
      : `Copy ${visibleLabel}`
    : copied
      ? resolvedCopiedLabel
      : 'Copy to clipboard';

  const merged = mergeProps({
    themeTarget: themeProps('inline-copy-trigger', {
      size,
      variant,
      copied,
      disabled,
      monospace,
    }),
    baseClassName: cx(
      variantStyles.surfaceClass,
      sizeStyles.buttonClass,
      'prism-focus-ring max-w-full min-w-0 inline-flex items-center gap-2 rounded-full font-medium tracking-[-0.01em] transition-[color,background-color,border-color,opacity,transform] duration-150 cursor-pointer enabled:hover:brightness-[1.03] enabled:active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed'
    ),
    baseStyle: variantStyles.baseStyle,
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });


  return (
    <>
      <button
        ref={ref}
        type="button"
        disabled={disabled}
        aria-label={ariaLabelProp ?? computedAriaLabel}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        {...rest}
        {...merged}
      >
        <span
          data-testid="inline-copy-value"
          className={cx(
            valuePartClass,
            'min-w-0 truncate text-left leading-none',
            monospace ? 'font-mono tabular-nums' : 'font-sans'
          )}
        >
          {visibleLabel}
        </span>

        {copied ? (
          <span
            data-testid="inline-copy-badge"
            className={cx(
              badgePartClass,
              sizeStyles.badgeClass,
              'inline-flex items-center gap-1 rounded-full font-sans font-semibold leading-none whitespace-nowrap shrink-0 transition-[color,background-color,border-color,opacity,transform] duration-150'
            )}
            style={{
              backgroundColor: 'var(--prism-success-main)',
              color: 'var(--prism-success-contrast)',
              boxShadow: '0 0 12px var(--prism-success-main)',
            }}
          >
            <Check aria-hidden="true" className={cx(sizeStyles.iconClass, 'shrink-0')} />
            <span>{resolvedCopiedLabel}</span>
          </span>
        ) : (
          <span
            aria-hidden="true"
            data-testid="inline-copy-icon"
            className={cx(
              iconPartClass,
              'inline-flex items-center justify-center shrink-0 transition-colors duration-150'
            )}
            style={STYLE_TEXT_SECONDARY}
          >
            <Copy aria-hidden="true" className={cx(sizeStyles.iconClass, 'shrink-0')} />
          </span>
        )}
      </button>

      <span role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {statusMessage}
      </span>
    </>
  );
}

export const InlineCopyTrigger = /*#__PURE__*/ memoWithDisplayName(InlineCopyTriggerInner, 'InlineCopyTrigger');
