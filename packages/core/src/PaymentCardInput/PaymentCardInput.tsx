'use client';

import {
  memo,
  useId,
  useMemo,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  CreditCard,
  Lock,
  ShieldCheck,
  User,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { mergeProps } from '../utils/mergeProps';
import { STYLE_ERROR_MAIN, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type CardBrand = 'visa' | 'mastercard' | 'amex' | 'discover' | 'generic';

export interface PaymentCardValue {
  /** Auto-formatted card number (`4-6-5` for Amex, `4-4-4-4` for other networks). */
  cardNumber: string;
  /** Auto-formatted expiration date (`MM/YY`, month clamped to `01..12`). */
  expiry: string;
  /** Numeric card security code (`4` digits for Amex, `3` digits otherwise). */
  cvc: string;
  /** Cardholder name string. */
  cardholderName: string;
  /** Automatically detected card network brand. */
  brand: CardBrand;
  /** Whether the entered card digits satisfy the standard Luhn checksum (13–19 digits). */
  isValidLuhn: boolean;
  /** Whether card number, expiry, CVC, and (when shown) cardholder name are all complete. */
  isComplete: boolean;
}

type PaymentCardInputBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange' | 'onSubmit'>;

export interface PaymentCardInputProps extends PaymentCardInputBaseProps {
  /** Initial cardholder name populated in the cardholder name field. */
  defaultCardholderName?: string;
  /** Callback fired whenever any payment card field changes. */
  onChange?: (val: PaymentCardValue) => void;
  /** Optional submit callback; renders the optical submit button when provided. */
  onSubmit?: (val: PaymentCardValue) => void;
  /** Disables all card inputs and submission actions. */
  disabled?: boolean;
  /** Controls whether the cardholder name input is displayed (defaults to true). */
  showCardholderName?: boolean;
  /** Label rendered on the optional submit button (defaults to 'Confirm Payment Method'). */
  submitLabel?: string;
}

function stripDigits(input: string): string {
  let out = '';
  for (let i = 0; i < input.length; i += 1) {
    const code = input.charCodeAt(i);
    if (code >= 48 && code <= 57) {
      out += input.charAt(i);
    }
  }
  return out;
}

/**
 * Pure brand detector supporting Visa, American Express, Mastercard (51–55 & 2221–2720),
 * and Discover (6011 & 65), falling back to `'generic'`.
 */
export function detectCardBrand(digits: string): CardBrand {
  const clean = stripDigits(digits);
  if (clean.length === 0) {
    return 'generic';
  }
  if (clean.charAt(0) === '4') {
    return 'visa';
  }
  if (
    clean.length >= 2 &&
    clean.charAt(0) === '3' &&
    (clean.charAt(1) === '4' || clean.charAt(1) === '7')
  ) {
    return 'amex';
  }
  if (
    clean.length >= 2 &&
    clean.charAt(0) === '5' &&
    clean.charCodeAt(1) >= 49 &&
    clean.charCodeAt(1) <= 53
  ) {
    return 'mastercard';
  }
  if (clean.length >= 4) {
    const prefix4 = Number(clean.slice(0, 4));
    if (prefix4 >= 2221 && prefix4 <= 2720) {
      return 'mastercard';
    }
  }
  if (clean.startsWith('6011') || clean.startsWith('65')) {
    return 'discover';
  }
  return 'generic';
}

/**
 * Pure standard Luhn checksum validator for 13–19 card digits.
 * Ignores spaces and hyphens while rejecting arbitrary non-digit characters.
 */
export function validateLuhn(digits: string): boolean {
  let clean = '';
  for (let i = 0; i < digits.length; i += 1) {
    const ch = digits.charAt(i);
    if (ch === ' ' || ch === '-') {
      continue;
    }
    const code = digits.charCodeAt(i);
    if (code < 48 || code > 57) {
      return false;
    }
    clean += ch;
  }

  if (clean.length < 13 || clean.length > 19) {
    return false;
  }

  let sum = 0;
  let shouldDouble = false;
  for (let i = clean.length - 1; i >= 0; i -= 1) {
    let digit = clean.charCodeAt(i) - 48;
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum > 0 && sum % 10 === 0;
}

function getExpectedCardLength(brand: CardBrand): number {
  return brand === 'amex' ? 15 : 16;
}

function getExpectedCvcLength(brand: CardBrand): number {
  return brand === 'amex' ? 4 : 3;
}

function getBrandLabel(brand: CardBrand): string {
  switch (brand) {
    case 'visa':
      return 'Visa';
    case 'mastercard':
      return 'Mastercard';
    case 'amex':
      return 'Amex';
    case 'discover':
      return 'Discover';
    case 'generic':
      return 'Card';
  }
}

function formatCardDigits(digits: string, brand: CardBrand): string {
  if (digits.length === 0) {
    return '';
  }
  if (brand === 'amex') {
    const parts: string[] = [digits.slice(0, 4)];
    if (digits.length > 4) {
      parts.push(digits.slice(4, 10));
    }
    if (digits.length > 10) {
      parts.push(digits.slice(10, 15));
    }
    return parts.join(' ');
  }

  const groups: string[] = [];
  for (let i = 0; i < digits.length; i += 4) {
    groups.push(digits.slice(i, i + 4));
  }
  return groups.join(' ');
}

function formatExpiry(raw: string): string {
  const slashIndex = raw.indexOf('/');
  let digits: string;
  if (slashIndex !== -1) {
    const rawMonth = stripDigits(raw.slice(0, slashIndex));
    const rawYear = stripDigits(raw.slice(slashIndex + 1));
    digits =
      rawMonth.length === 1 && rawYear.length > 0
        ? `0${rawMonth}${rawYear}`.slice(0, 4)
        : `${rawMonth}${rawYear}`.slice(0, 4);
  } else {
    digits = stripDigits(raw).slice(0, 4);
  }

  if (digits.length === 0) {
    return '';
  }

  if (digits.length === 1) {
    const firstDigit = digits.charCodeAt(0) - 48;
    return firstDigit >= 2 ? `0${digits}` : digits;
  }

  const rawMonthNum = Number(digits.slice(0, 2));
  const clampedMonthNum = Math.min(12, Math.max(1, rawMonthNum));
  const monthStr = clampedMonthNum < 10 ? `0${clampedMonthNum}` : String(clampedMonthNum);

  if (digits.length === 2) {
    return monthStr;
  }

  return `${monthStr}/${digits.slice(2, 4)}`;
}

function buildCardValue(
  cardDigits: string,
  expiry: string,
  cvc: string,
  cardholderName: string,
  showCardholderName: boolean
): PaymentCardValue {
  const brand = detectCardBrand(cardDigits);
  const expectedCardLength = getExpectedCardLength(brand);
  const expectedCvcLength = getExpectedCvcLength(brand);
  const normalizedDigits = cardDigits.slice(0, expectedCardLength);
  const normalizedCvc = cvc.slice(0, expectedCvcLength);
  const cardNumber = formatCardDigits(normalizedDigits, brand);
  const isValidLuhn = validateLuhn(normalizedDigits);
  const isComplete =
    normalizedDigits.length === expectedCardLength &&
    expiry.length === 5 &&
    normalizedCvc.length === expectedCvcLength &&
    (!showCardholderName || cardholderName.trim().length > 0);

  return {
    cardNumber,
    expiry,
    cvc: normalizedCvc,
    cardholderName,
    brand,
    isValidLuhn,
    isComplete,
  };
}

function PaymentCardInputInner({
  defaultCardholderName = '',
  onChange,
  onSubmit,
  disabled = false,
  showCardholderName = true,
  submitLabel = 'Confirm Payment Method',
  className,
  style,
  xstyle,
  ref,
  ...rest
}: PaymentCardInputProps) {
  const override = useComponentOverride('PaymentCardInput');
  const baseId = useId();
  const cardNumberId = `${baseId}-card-number`;
  const expiryId = `${baseId}-expiry`;
  const cvcId = `${baseId}-cvc`;
  const cardholderId = `${baseId}-cardholder`;
  const luhnErrorId = `${baseId}-luhn-error`;

  const [cardDigits, setCardDigits] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [cardholderName, setCardholderName] = useState(defaultCardholderName);

  const cardValue = useMemo(
    () => buildCardValue(cardDigits, expiry, cvc, cardholderName, showCardholderName),
    [cardDigits, expiry, cvc, cardholderName, showCardholderName]
  );

  const expectedCardLength = getExpectedCardLength(cardValue.brand);
  const expectedCvcLength = getExpectedCvcLength(cardValue.brand);
  const isCardLengthComplete = cardDigits.length === expectedCardLength;
  const showLuhnValid = isCardLengthComplete && cardValue.isValidLuhn;
  const showLuhnError = isCardLengthComplete && !cardValue.isValidLuhn;
  const canSubmit = cardValue.isComplete && cardValue.isValidLuhn && !disabled;

  const handleCardNumberChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const rawDigits = stripDigits(e.target.value);
    const nextBrand = detectCardBrand(rawDigits);
    const nextDigits = rawDigits.slice(0, getExpectedCardLength(nextBrand));
    const nextCvc = cvc.slice(0, getExpectedCvcLength(nextBrand));
    setCardDigits(nextDigits);
    if (nextCvc !== cvc) {
      setCvc(nextCvc);
    }
    onChange?.(buildCardValue(nextDigits, expiry, nextCvc, cardholderName, showCardholderName));
  };

  const handleExpiryChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const nextExpiry = formatExpiry(e.target.value);
    setExpiry(nextExpiry);
    onChange?.(buildCardValue(cardDigits, nextExpiry, cvc, cardholderName, showCardholderName));
  };

  const handleCvcChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const nextCvc = stripDigits(e.target.value).slice(0, expectedCvcLength);
    setCvc(nextCvc);
    onChange?.(buildCardValue(cardDigits, expiry, nextCvc, cardholderName, showCardholderName));
  };

  const handleCardholderChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const nextName = e.target.value;
    setCardholderName(nextName);
    onChange?.(buildCardValue(cardDigits, expiry, cvc, nextName, showCardholderName));
  };

  const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing && !e.defaultPrevented && onSubmit) {
      e.preventDefault();
      if (canSubmit) {
        onSubmit(cardValue);
      }
    }
  };

  const merged = mergeProps({
    themeTarget: themeProps('payment-card-input', {
      brand: cardValue.brand,
      disabled,
      valid: showLuhnValid,
      invalid: showLuhnError,
      complete: cardValue.isComplete,
    }),
    baseClassName: 'prism-slab p-5 w-full',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div ref={ref} {...rest} {...merged}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className="prism-well w-8 h-8 rounded-full inline-flex items-center justify-center shrink-0"
            style={{
              color: showLuhnValid ? 'var(--prism-success-main)' : 'var(--prism-primary-main)',
            }}
          >
            <CreditCard aria-hidden="true" className="w-4 h-4 shrink-0" />
          </span>
          <span
            className="text-sm font-semibold truncate"
            style={STYLE_TEXT_PRIMARY}
          >
            Payment Card
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            data-testid="payment-card-brand-pill"
            data-brand={cardValue.brand}
            className="prism-crystal inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-tight shrink-0"
            style={STYLE_TEXT_PRIMARY}
          >
            {getBrandLabel(cardValue.brand)}
          </span>

          {showLuhnValid ? (
            <span
              role="status"
              aria-live="polite"
              data-testid="payment-card-valid-badge"
              className="prism-emerald inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-tight shrink-0"
            >
              <CheckCircle2 aria-hidden="true" className="w-3 h-3 shrink-0" />
              <span>Valid</span>
            </span>
          ) : null}
        </div>
      </div>

      <div className="space-y-3.5">
        <div>
          <label
            htmlFor={cardNumberId}
            className="block text-xs font-semibold mb-1.5 ml-1"
            style={STYLE_TEXT_PRIMARY}
          >
            Card number
          </label>
          <div
            className="prism-crystal rounded-2xl p-1 transition-[color,background-color,border-color,opacity,transform]"
            style={
              showLuhnError
                ? { boxShadow: '0 0 0 1.5px var(--prism-error-main)' }
                : undefined
            }
          >
            <div className="prism-well rounded-xl h-11 px-3.5 flex items-center gap-2.5">
              <CreditCard
                aria-hidden="true"
                className="w-4 h-4 shrink-0"
                style={{
                  color: showLuhnError
                    ? 'var(--prism-error-main)'
                    : 'var(--prism-text-secondary)',
                }}
              />
              <input
                id={cardNumberId}
                type="text"
                inputMode="numeric"
                autoComplete="cc-number"
                placeholder={
                  cardValue.brand === 'amex' ? '3782 822463 10005' : '4242 4242 4242 4242'
                }
                value={cardValue.cardNumber}
                disabled={disabled}
                aria-invalid={showLuhnError}
                aria-describedby={showLuhnError ? luhnErrorId : undefined}
                onChange={handleCardNumberChange}
                onKeyDown={handleInputKeyDown}
                className="prism-focus-ring w-full bg-transparent font-mono text-sm tabular-nums rounded-lg px-1 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                style={STYLE_TEXT_PRIMARY}
              />
            </div>
          </div>

          {showLuhnError ? (
            <p
              id={luhnErrorId}
              role="alert"
              data-testid="payment-card-luhn-error"
              className="mt-1.5 ml-1 flex items-center gap-1.5 text-xs font-medium"
              style={STYLE_ERROR_MAIN}
            >
              <AlertCircle aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
              <span>Invalid card number checksum. Check the digits and try again.</span>
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor={expiryId}
              className="block text-xs font-semibold mb-1.5 ml-1"
              style={STYLE_TEXT_PRIMARY}
            >
              Expiry
            </label>
            <div className="prism-crystal rounded-2xl p-1 transition-[color,background-color,border-color,opacity,transform]">
              <div className="prism-well rounded-xl h-11 px-3.5 flex items-center gap-2">
                <Calendar
                  aria-hidden="true"
                  className="w-4 h-4 shrink-0"
                  style={STYLE_TEXT_SECONDARY}
                />
                <input
                  id={expiryId}
                  type="text"
                  inputMode="numeric"
                  autoComplete="cc-exp"
                  placeholder="MM/YY"
                  maxLength={5}
                  value={cardValue.expiry}
                  disabled={disabled}
                  onChange={handleExpiryChange}
                  onKeyDown={handleInputKeyDown}
                  className="prism-focus-ring w-full bg-transparent font-mono text-sm tabular-nums rounded-lg px-1 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                  style={STYLE_TEXT_PRIMARY}
                />
              </div>
            </div>
          </div>

          <div>
            <label
              htmlFor={cvcId}
              className="block text-xs font-semibold mb-1.5 ml-1"
              style={STYLE_TEXT_PRIMARY}
            >
              CVC
            </label>
            <div className="prism-crystal rounded-2xl p-1 transition-[color,background-color,border-color,opacity,transform]">
              <div className="prism-well rounded-xl h-11 px-3.5 flex items-center gap-2">
                <Lock
                  aria-hidden="true"
                  className="w-4 h-4 shrink-0"
                  style={STYLE_TEXT_SECONDARY}
                />
                <input
                  id={cvcId}
                  type="text"
                  inputMode="numeric"
                  autoComplete="cc-csc"
                  placeholder={expectedCvcLength === 4 ? '1234' : '123'}
                  maxLength={expectedCvcLength}
                  value={cardValue.cvc}
                  disabled={disabled}
                  onChange={handleCvcChange}
                  onKeyDown={handleInputKeyDown}
                  className="prism-focus-ring w-full bg-transparent font-mono text-sm tabular-nums rounded-lg px-1 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                  style={STYLE_TEXT_PRIMARY}
                />
              </div>
            </div>
          </div>
        </div>

        {showCardholderName ? (
          <div>
            <label
              htmlFor={cardholderId}
              className="block text-xs font-semibold mb-1.5 ml-1"
              style={STYLE_TEXT_PRIMARY}
            >
              Cardholder name
            </label>
            <div className="prism-crystal rounded-2xl p-1 transition-[color,background-color,border-color,opacity,transform]">
              <div className="prism-well rounded-xl h-11 px-3.5 flex items-center gap-2">
                <User
                  aria-hidden="true"
                  className="w-4 h-4 shrink-0"
                  style={STYLE_TEXT_SECONDARY}
                />
                <input
                  id={cardholderId}
                  type="text"
                  autoComplete="cc-name"
                  placeholder="Name on card"
                  value={cardValue.cardholderName}
                  disabled={disabled}
                  onChange={handleCardholderChange}
                  onKeyDown={handleInputKeyDown}
                  className="prism-focus-ring w-full bg-transparent text-sm rounded-lg px-1 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                  style={STYLE_TEXT_PRIMARY}
                />
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {onSubmit ? (
        <button
          type="button"
          disabled={!canSubmit}
          onClick={() => onSubmit(cardValue)}
          className="prism-btn-primary prism-focus-ring mt-4 w-full h-11 px-6 inline-flex items-center justify-center gap-2 text-sm font-semibold tracking-[-0.01em] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]"
        >
          <ShieldCheck aria-hidden="true" className="w-4 h-4 shrink-0 relative z-10" />
          <span className="relative z-10">{submitLabel}</span>
        </button>
      ) : null}
    </div>
  );
}

export const PaymentCardInput = memo(PaymentCardInputInner);
PaymentCardInput.displayName = 'PaymentCardInput';
