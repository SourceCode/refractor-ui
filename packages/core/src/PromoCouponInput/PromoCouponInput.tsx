'use client';

import { useId, useState } from 'react';
import { Tag, X } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { mergeProps } from '../utils/mergeProps';
import { STYLE_ERROR_MAIN, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export interface AppliedCoupon {
  /** Normalized promo code identifier (e.g. 'PRISM20'). */
  code: string;
  /** Human-readable promotion description (e.g. '20% off annual license'). */
  label: string;
  /** Optional formatted savings callout (e.g. '-$24.00'). */
  discountText?: string;
}

export interface PromoCouponInputProps extends BaseProps<HTMLDivElement> {
  /** Controlled applied promo coupon (pass null for explicitly no applied coupon). */
  appliedCoupon?: AppliedCoupon | null;
  /** Initial applied promo coupon when operating in uncontrolled mode. */
  defaultAppliedCoupon?: AppliedCoupon | null;
  /** Validation handler invoked with trimmed uppercase code; returns AppliedCoupon, error string, or null. */
  onApply: (code: string) => AppliedCoupon | string | null;
  /** Optional callback fired with the removed coupon code when the savings tag is dismissed. */
  onRemove?: (code: string) => void;
  /** Input placeholder text (defaults to 'Enter promo code (e.g. PRISM20)'). */
  placeholder?: string;
  /** Disables the promo input, Apply button, and Remove pill action. */
  disabled?: boolean;
}

function PromoCouponInputInner({
  appliedCoupon,
  defaultAppliedCoupon = null,
  onApply,
  onRemove,
  placeholder = 'Enter promo code (e.g. PRISM20)',
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: PromoCouponInputProps) {
  const inputId = useId();
  const errorId = useId();
  const override = useComponentOverride('PromoCouponInput');

  const [currentCoupon, setCurrentCoupon] = useControllableState<AppliedCoupon | null>({
    value: appliedCoupon,
    defaultValue: defaultAppliedCoupon,
  });

  const [draft, setDraft] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = () => {
    const trimmedUpper = draft.trim().toUpperCase();
    if (!trimmedUpper) return;

    const result = onApply(trimmedUpper);
    if (result === null) {
      setErrorMessage('Invalid promo code.');
      return;
    }
    if (typeof result === 'string') {
      const trimmedError = result.trim();
      setErrorMessage(trimmedError.length > 0 ? trimmedError : 'Invalid promo code.');
      return;
    }

    setCurrentCoupon(result);
    setDraft('');
    setErrorMessage(null);
  };

  const handleRemove = (code: string) => {
    setCurrentCoupon(null);
    setErrorMessage(null);
    onRemove?.(code);
  };

  const merged = mergeProps({
    themeTarget: themeProps('promo-coupon-input', {
      disabled,
      applied: Boolean(currentCoupon),
      invalid: Boolean(errorMessage),
    }),
    baseClassName: 'prism-slab p-3 w-full',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div ref={ref} {...rest} {...merged}>
      <div className="flex items-center gap-2">
        <div
          className="prism-well flex-1 min-w-0 h-10 px-3 rounded-full flex items-center gap-2"
          style={
            errorMessage
              ? { boxShadow: 'inset 0 0 0 1.5px var(--prism-error-main)' }
              : undefined
          }
        >
          <Tag
            className="w-4 h-4 shrink-0"
            aria-hidden="true"
            style={STYLE_TEXT_SECONDARY}
          />
          <input
            id={inputId}
            type="text"
            aria-label="Promo code"
            aria-invalid={Boolean(errorMessage)}
            aria-describedby={errorMessage ? errorId : undefined}
            value={draft}
            disabled={disabled}
            placeholder={placeholder}
            onChange={(e) => {
              setDraft(e.target.value);
              if (errorMessage) {
                setErrorMessage(null);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing && !disabled) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            className="w-full min-w-0 bg-transparent text-xs font-mono uppercase tracking-wider focus:outline-none disabled:opacity-55 disabled:cursor-not-allowed"
            style={STYLE_TEXT_PRIMARY}
          />
        </div>

        <button
          type="button"
          disabled={disabled}
          onClick={handleSubmit}
          className="prism-btn-primary prism-focus-ring h-10 px-4 inline-flex items-center justify-center text-xs font-semibold tracking-[-0.01em] whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="relative z-10">Apply</span>
        </button>
      </div>

      {errorMessage ? (
        <p
          id={errorId}
          role="alert"
          className="mt-2 px-1 text-xs font-medium"
          style={STYLE_ERROR_MAIN}
        >
          {errorMessage}
        </p>
      ) : null}

      {currentCoupon ? (
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <span
            role="status"
            aria-live="polite"
            data-testid="promo-applied-coupon"
            className="prism-emerald inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium max-w-full"
          >
            <Tag className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span className="font-mono font-bold tracking-wide uppercase shrink-0">
              {currentCoupon.code}
            </span>
            <span className="truncate">{currentCoupon.label}</span>
            {currentCoupon.discountText ? (
              <span
                data-testid="promo-discount-text"
                className="font-semibold tabular-nums shrink-0"
              >
                {currentCoupon.discountText}
              </span>
            ) : null}
            <button
              type="button"
              disabled={disabled}
              aria-label={`Remove promo code ${currentCoupon.code}`}
              onClick={() => handleRemove(currentCoupon.code)}
              className="prism-focus-ring rounded-full p-0.5 inline-flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:opacity-80 transition-opacity"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </span>
        </div>
      ) : null}
    </div>
  );
}

export const PromoCouponInput = /*#__PURE__*/ memoWithDisplayName(PromoCouponInputInner, 'PromoCouponInput');
