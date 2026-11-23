'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Check, Copy, Eye, EyeOff, KeyRound, RefreshCw } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { STYLE_PRIMARY_MAIN, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

type SecretKeyFieldBaseProps = Omit<BaseProps<HTMLDivElement>, 'onCopy'>;

export interface SecretKeyFieldProps extends SecretKeyFieldBaseProps {
  /** Heading label rendered above the credential well (defaults to 'API Secret Key'). */
  label?: string;
  /** Full secret credential string to mask, reveal, and copy. */
  value: string;
  /** Leading characters kept visible while masked (default 6, clamped 0..16). */
  visiblePrefixChars?: number;
  /** Trailing characters kept visible while masked (default 4, clamped 0..16). */
  visibleSuffixChars?: number;
  /** Initial secret visibility state (defaults to false). */
  defaultRevealed?: boolean;
  /** Callback invoked with the full secret value when Copy is activated. */
  onCopy?: (value: string) => void;
  /** Optional callback that enables and handles the Rotate key action button. */
  onRotate?: () => void;
  /** Optional helper or security policy text displayed below the credential well. */
  helperText?: string;
  /** Disables reveal, copy, and rotate controls. */
  disabled?: boolean;
}

const DEFAULT_PREFIX_CHARS = 6;
const DEFAULT_SUFFIX_CHARS = 4;
const MIN_VISIBLE_CHARS = 0;
const MAX_VISIBLE_CHARS = 16;
const MIN_HIDDEN_BULLETS = 4;
const MAX_DISPLAY_BULLETS = 12;
const COPY_FEEDBACK_DURATION_MS = 1800;

function clampVisibleChars(value: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(MAX_VISIBLE_CHARS, Math.max(MIN_VISIBLE_CHARS, Math.trunc(value)));
}

function maskSecretValue(value: string, prefixChars: number, suffixChars: number): string {
  const chars = Array.from(value);
  if (chars.length < prefixChars + suffixChars + MIN_HIDDEN_BULLETS) {
    const bulletLength = Math.min(Math.max(chars.length, MIN_HIDDEN_BULLETS), MAX_DISPLAY_BULLETS);
    return '•'.repeat(bulletLength);
  }
  const prefix = chars.slice(0, prefixChars).join('');
  const suffix = chars.slice(chars.length - suffixChars).join('');
  const hiddenCount = chars.length - prefixChars - suffixChars;
  const bulletCount = Math.min(hiddenCount, MAX_DISPLAY_BULLETS);
  return `${prefix}${'•'.repeat(bulletCount)}${suffix}`;
}

const headerClass = /*#__PURE__*/ stableClassName('secret-key-field', 'header');
const readoutClass = /*#__PURE__*/ stableClassName('secret-key-field', 'readout');
const actionsClass = /*#__PURE__*/ stableClassName('secret-key-field', 'actions');

function SecretKeyFieldInner({
  label = 'API Secret Key',
  value,
  visiblePrefixChars = DEFAULT_PREFIX_CHARS,
  visibleSuffixChars = DEFAULT_SUFFIX_CHARS,
  defaultRevealed = false,
  onCopy,
  onRotate,
  helperText,
  disabled = false,
  className,
  style,
  xstyle,
  'aria-label': ariaLabel,
  ref,
  ...rest
}: SecretKeyFieldProps) {
  const override = useComponentOverride('SecretKeyField');
  const labelId = useId();
  const helperId = useId();

  const [revealed, setRevealed] = useState<boolean>(defaultRevealed);
  const [copied, setCopied] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const isEmpty = value.length === 0;
  const effectiveRevealed = !isEmpty && revealed;
  const safePrefix = clampVisibleChars(visiblePrefixChars, DEFAULT_PREFIX_CHARS);
  const safeSuffix = clampVisibleChars(visibleSuffixChars, DEFAULT_SUFFIX_CHARS);
  const displayValue = isEmpty
    ? 'No key configured'
    : effectiveRevealed
      ? value
      : maskSecretValue(value, safePrefix, safeSuffix);

  const handleToggleReveal = useCallback(() => {
    const next = !revealed;
    setRevealed(next);
    setStatusMessage(next ? 'Secret key revealed.' : 'Secret key hidden.');
  }, [revealed]);

  const handleCopy = useCallback(() => {
    try {
      const clipboard = navigator.clipboard;
      if (clipboard && typeof clipboard.writeText === 'function') {
        void Promise.resolve(clipboard.writeText(value)).catch(() => undefined);
      }
    } catch {
      // Clipboard API unavailable or restricted; continue with callback and confirmation state.
    }

    onCopy?.(value);
    setCopied(true);
    setStatusMessage('Secret key copied to clipboard.');

    if (copyTimerRef.current !== null) {
      clearTimeout(copyTimerRef.current);
    }
    copyTimerRef.current = setTimeout(() => {
      setCopied(false);
      copyTimerRef.current = null;
    }, COPY_FEEDBACK_DURATION_MS);
  }, [onCopy, value]);

  const handleRotate = useCallback(() => {
    onRotate?.();
    setStatusMessage('Secret key rotation requested.');
  }, [onRotate]);

  const merged = mergeProps({
    themeTarget: themeProps('secret-key-field', {
      revealed: effectiveRevealed,
      copied,
      disabled,
      empty: isEmpty,
    }),
    baseClassName: 'prism-slab p-4 sm:p-5 w-full',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });


  const actionButtonClass =
    'prism-focus-ring h-9 px-3 rounded-full inline-flex items-center justify-center gap-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-[color,background-color,border-color,opacity,transform] cursor-pointer enabled:hover:brightness-105 disabled:opacity-45 disabled:cursor-not-allowed';

  return (
    <div
      ref={ref}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabel ? undefined : labelId}
      aria-describedby={helperText ? helperId : undefined}
      {...rest}
      {...merged}
    >
      <div className={cx(headerClass, 'flex flex-wrap items-center justify-between gap-2 mb-3')}>
        <div className="min-w-0 flex items-center gap-2.5">
          <span
            className="prism-well w-8 h-8 rounded-full inline-flex items-center justify-center shrink-0"
            style={STYLE_PRIMARY_MAIN}
          >
            <KeyRound aria-hidden="true" className="w-4 h-4 shrink-0" />
          </span>
          <span
            id={labelId}
            className="text-sm font-semibold truncate"
            style={STYLE_TEXT_PRIMARY}
          >
            {label}
          </span>
        </div>

        <span
          data-testid="secret-key-visibility-badge"
          className={cx(
            'inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-tight shrink-0',
            effectiveRevealed ? 'prism-emerald' : 'prism-well'
          )}
          style={effectiveRevealed ? undefined : STYLE_TEXT_SECONDARY}
        >
          {isEmpty ? 'Unconfigured' : effectiveRevealed ? 'Visible' : 'Masked'}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
        <div
          className={cx(
            readoutClass,
            'prism-well rounded-2xl px-3.5 py-2.5 min-w-0 flex-1 flex items-center overflow-x-auto'
          )}
        >
          <code
            data-testid="secret-key-value"
            data-revealed={effectiveRevealed ? 'true' : 'false'}
            className={cx(
              'font-mono text-xs sm:text-sm tracking-tight break-all',
              effectiveRevealed ? 'select-all' : 'select-none'
            )}
            style={{
              color: isEmpty ? 'var(--prism-text-disabled)' : 'var(--prism-text-primary)',
            }}
          >
            {displayValue}
          </code>
        </div>

        <div className={cx(actionsClass, 'flex flex-wrap items-center gap-1.5 shrink-0')}>
          <button
            type="button"
            disabled={disabled || isEmpty}
            aria-pressed={effectiveRevealed}
            onClick={handleToggleReveal}
            className={cx(actionButtonClass, 'prism-crystal')}
            style={STYLE_TEXT_PRIMARY}
          >
            {effectiveRevealed ? (
              <>
                <EyeOff aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                <span>Hide</span>
              </>
            ) : (
              <>
                <Eye aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                <span>Reveal</span>
              </>
            )}
          </button>

          <button
            type="button"
            disabled={disabled || isEmpty}
            data-copied={copied ? 'true' : undefined}
            onClick={handleCopy}
            className={cx(
              actionButtonClass,
              copied ? 'prism-emerald font-semibold' : 'prism-crystal'
            )}
            style={copied ? undefined : STYLE_TEXT_PRIMARY}
          >
            {copied ? (
              <>
                <Check aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                <span>Copy</span>
              </>
            )}
          </button>

          {onRotate ? (
            <button
              type="button"
              disabled={disabled}
              onClick={handleRotate}
              className={cx(actionButtonClass, 'prism-crystal')}
              style={STYLE_TEXT_PRIMARY}
            >
              <RefreshCw aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
              <span>Rotate</span>
            </button>
          ) : null}
        </div>
      </div>

      {helperText ? (
        <p
          id={helperId}
          className="mt-2.5 text-xs leading-relaxed"
          style={STYLE_TEXT_SECONDARY}
        >
          {helperText}
        </p>
      ) : null}

      <span role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {statusMessage}
      </span>
    </div>
  );
}

export const SecretKeyField = /*#__PURE__*/ memoWithDisplayName(SecretKeyFieldInner, 'SecretKeyField');
