'use client';

import {
  useId,
  useMemo,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react';
import { Banknote } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';

const DEFAULT_MIN_AMOUNT = 0;
const DEFAULT_MAX_AMOUNT = 1_000_000_000;
const MIN_DECIMALS = 0;
const MAX_DECIMALS = 4;

export interface CurrencyOption {
  /** ISO 4217 currency code (e.g. 'USD', 'EUR', 'JPY'). */
  code: string;
  /** Display currency symbol prefixed in the recessed input well (e.g. '$', '€', '¥'). */
  symbol: string;
  /** Human-readable currency name (e.g. 'US Dollar'). */
  label: string;
  /** Fixed decimal places used for formatting and rounding (clamped to 0..4). */
  decimals: number;
}

export interface CurrencyInputValue {
  /** Numeric currency amount clamped within [min, max] and rounded to active currency decimals. */
  amount: number;
  /** Active currency code matching a configured CurrencyOption. */
  currency: string;
}

const DEFAULT_CURRENCY_USD: CurrencyOption = {
  code: 'USD',
  symbol: '$',
  label: 'US Dollar',
  decimals: 2,
};

export const DEFAULT_CURRENCIES: CurrencyOption[] = [
  DEFAULT_CURRENCY_USD,
  { code: 'EUR', symbol: '€', label: 'Euro', decimals: 2 },
  { code: 'GBP', symbol: '£', label: 'British Pound', decimals: 2 },
  { code: 'JPY', symbol: '¥', label: 'Japanese Yen', decimals: 0 },
  { code: 'CAD', symbol: 'CA$', label: 'Canadian Dollar', decimals: 2 },
  { code: 'AUD', symbol: 'A$', label: 'Australian Dollar', decimals: 2 },
];

const DEFAULT_CURRENCY_VALUE: CurrencyInputValue = {
  amount: 1250.5,
  currency: 'USD',
};

type CurrencyInputBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface CurrencyInputProps extends CurrencyInputBaseProps {
  /** Controlled currency value ({ amount, currency }). */
  value?: CurrencyInputValue;
  /** Initial currency value when uncontrolled (defaults to { amount: 1250.5, currency: 'USD' }). */
  defaultValue?: CurrencyInputValue;
  /** Callback fired when an edited amount commits (blur/Enter) or the selected currency changes. */
  onChange?: (next: CurrencyInputValue) => void;
  /** Curated list of selectable currencies (defaults to DEFAULT_CURRENCIES). */
  currencies?: CurrencyOption[];
  /** Minimum permitted numeric amount (defaults to 0). */
  min?: number;
  /** Maximum permitted numeric amount (defaults to 1_000_000_000). */
  max?: number;
  /** Field label displayed in the slab header and associated with the amount input (defaults to 'Amount'). */
  label?: string;
  /** Disables the amount input and currency selector. */
  disabled?: boolean;
}

function clampDecimals(decimals: number): number {
  if (!Number.isFinite(decimals)) {
    return 2;
  }
  return Math.min(MAX_DECIMALS, Math.max(MIN_DECIMALS, Math.floor(decimals)));
}

function roundToDecimals(value: number, decimals: number): number {
  const safeDecimals = clampDecimals(decimals);
  const factor = 10 ** safeDecimals;
  const rounded = Math.round((value + Number.EPSILON * Math.sign(value)) * factor) / factor;
  return rounded === 0 ? 0 : rounded;
}

function resolveBounds(min: number, max: number): { min: number; max: number } {
  const safeMin = Number.isFinite(min) ? min : DEFAULT_MIN_AMOUNT;
  const safeMax = Number.isFinite(max) ? max : DEFAULT_MAX_AMOUNT;
  return safeMin <= safeMax ? { min: safeMin, max: safeMax } : { min: safeMax, max: safeMin };
}

function clampNumber(value: number, min: number, max: number): number {
  const clamped = Math.min(max, Math.max(min, value));
  return clamped === 0 ? 0 : clamped;
}

function insertThousandsCommas(digits: string): string {
  const len = digits.length;
  if (len <= 3) {
    return digits;
  }
  const firstGroup = len % 3 || 3;
  let out = digits.slice(0, firstGroup);
  for (let i = firstGroup; i < len; i += 3) {
    out += `,${digits.slice(i, i + 3)}`;
  }
  return out;
}

/**
 * Pure helper formatting a finite number with thousands commas and fixed decimal places
 * (clamping `decimals` to `0..4`). Non-finite values default cleanly to `0`.
 */
export function formatCurrencyAmount(amount: number, decimals: number): string {
  const safeDecimals = clampDecimals(decimals);
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const rounded = roundToDecimals(safeAmount, safeDecimals);
  const isNegative = rounded < 0;
  const fixed = Math.abs(rounded).toFixed(safeDecimals);
  const dotIndex = fixed.indexOf('.');
  const intPart = dotIndex === -1 ? fixed : fixed.slice(0, dotIndex);
  const fracPart = dotIndex === -1 ? '' : fixed.slice(dotIndex);
  return `${isNegative ? '-' : ''}${insertThousandsCommas(intPart)}${fracPart}`;
}

function parseCurrencyDraft(raw: string, currencySymbol: string): number | null {
  let cleaned = raw.trim();
  let leadingSign = '';
  if (cleaned.startsWith('-') || cleaned.startsWith('+')) {
    leadingSign = cleaned.charAt(0);
    cleaned = cleaned.slice(1).trim();
  }
  if (currencySymbol && cleaned.startsWith(currencySymbol)) {
    cleaned = cleaned.slice(currencySymbol.length).trim();
  }
  if (leadingSign) {
    cleaned = `${leadingSign}${cleaned}`;
  }
  if (cleaned.length === 0) {
    return null;
  }

  let normalized = '';
  let dotSeen = false;
  let digitCount = 0;

  for (let i = 0; i < cleaned.length; i += 1) {
    const ch = cleaned.charAt(i);
    const code = cleaned.charCodeAt(i);
    if (ch === ',' || ch === ' ') {
      continue;
    }
    if ((ch === '-' || ch === '+') && normalized.length === 0) {
      normalized += ch;
      continue;
    }
    if (ch === '.' && !dotSeen) {
      dotSeen = true;
      normalized += ch;
      continue;
    }
    if (code >= 48 && code <= 57) {
      digitCount += 1;
      normalized += ch;
      continue;
    }
    return null;
  }

  if (digitCount === 0) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function deduplicateCurrencies(
  currencies: CurrencyOption[]
): [CurrencyOption, ...CurrencyOption[]] {
  const seen = new Set<string>();
  let first: CurrencyOption | undefined;
  const rest: CurrencyOption[] = [];
  for (const option of currencies) {
    if (!seen.has(option.code)) {
      seen.add(option.code);
      if (first === undefined) {
        first = option;
      } else {
        rest.push(option);
      }
    }
  }
  if (first !== undefined) {
    return [first, ...rest];
  }
  return [DEFAULT_CURRENCY_USD, ...DEFAULT_CURRENCIES.slice(1)];
}

export function CurrencyInput({
  value,
  defaultValue = DEFAULT_CURRENCY_VALUE,
  onChange,
  currencies = DEFAULT_CURRENCIES,
  min = DEFAULT_MIN_AMOUNT,
  max = DEFAULT_MAX_AMOUNT,
  label = 'Amount',
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: CurrencyInputProps) {
  const inputId = useId();
  const selectId = useId();
  const override = useComponentOverride('CurrencyInput');

  const availableCurrencies = useMemo(() => deduplicateCurrencies(currencies), [currencies]);
  const bounds = useMemo(() => resolveBounds(min, max), [min, max]);

  const [currentValue, setCurrentValue] = useControllableState<CurrencyInputValue>({
    value,
    defaultValue,
    onChange,
  });

  const activeCurrency = useMemo<CurrencyOption>(
    () =>
      availableCurrencies.find((option) => option.code === currentValue.currency) ??
      availableCurrencies[0],
    [availableCurrencies, currentValue.currency]
  );

  const activeDecimals = clampDecimals(activeCurrency.decimals);
  const rawAmount = Number.isFinite(currentValue.amount) ? currentValue.amount : bounds.min;
  const clampedAmount = clampNumber(
    roundToDecimals(clampNumber(rawAmount, bounds.min, bounds.max), activeDecimals),
    bounds.min,
    bounds.max
  );

  const [isFocused, setIsFocused] = useState<boolean>(false);
  const [draft, setDraft] = useState<string>(() => String(clampedAmount));

  const formattedAmount = formatCurrencyAmount(clampedAmount, activeDecimals);
  const displayedInputValue = isFocused ? draft : formattedAmount;

  const readoutText =
    clampedAmount < 0
      ? `-${activeCurrency.symbol}${formatCurrencyAmount(Math.abs(clampedAmount), activeDecimals)} ${activeCurrency.code}`
      : `${activeCurrency.symbol}${formattedAmount} ${activeCurrency.code}`;

  const commitDraft = () => {
    const parsed = parseCurrencyDraft(draft, activeCurrency.symbol);
    if (parsed === null) {
      setDraft(String(clampedAmount));
      return;
    }

    const nextAmount = clampNumber(
      roundToDecimals(clampNumber(parsed, bounds.min, bounds.max), activeDecimals),
      bounds.min,
      bounds.max
    );
    setDraft(String(nextAmount));

    if (nextAmount !== clampedAmount || currentValue.currency !== activeCurrency.code) {
      setCurrentValue({
        amount: nextAmount,
        currency: activeCurrency.code,
      });
    }
  };

  const handleFocus = () => {
    if (disabled) return;
    setDraft(String(clampedAmount));
    setIsFocused(true);
  };

  const handleDraftChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    setDraft(e.target.value);
  };

  const handleBlur = () => {
    commitDraft();
    setIsFocused(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing && !disabled) {
      e.preventDefault();
      commitDraft();
    }
  };

  const handleCurrencyChange = (e: ChangeEvent<HTMLSelectElement>) => {
    if (disabled) return;
    const nextCurrency = availableCurrencies.find((option) => option.code === e.target.value);
    if (!nextCurrency) return;

    const nextDecimals = clampDecimals(nextCurrency.decimals);
    const nextAmount = clampNumber(
      roundToDecimals(clampNumber(clampedAmount, bounds.min, bounds.max), nextDecimals),
      bounds.min,
      bounds.max
    );

    setDraft(String(nextAmount));
    setCurrentValue({
      amount: nextAmount,
      currency: nextCurrency.code,
    });
  };

  const merged = mergeProps({
    themeTarget: themeProps('currency-input', {
      disabled,
      focused: isFocused,
      currency: activeCurrency.code,
    }),
    baseClassName: 'prism-slab p-4 w-full',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div ref={ref} {...rest} {...merged}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span
            aria-hidden="true"
            className="prism-well w-7 h-7 rounded-full inline-flex items-center justify-center shrink-0"
            style={{ color: 'var(--prism-primary-main)' }}
          >
            <Banknote aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
          </span>
          <label
            htmlFor={inputId}
            className="text-xs font-semibold truncate"
            style={{ color: 'var(--prism-text-primary)' }}
          >
            {label}
          </label>
        </div>

        <span
          role="status"
          aria-live="polite"
          data-testid="currency-readout-pill"
          className="prism-emerald inline-flex items-center px-3 py-1 rounded-full text-xs font-mono font-semibold tabular-nums whitespace-nowrap shrink-0"
        >
          {readoutText}
        </span>
      </div>

      <div className="flex items-stretch gap-2">
        <div
          className="prism-well flex-1 min-w-0 h-11 px-3.5 rounded-2xl flex items-center gap-2 transition-all"
          style={
            isFocused
              ? { boxShadow: 'inset 0 0 0 1.5px var(--prism-primary-main)' }
              : undefined
          }
        >
          <span
            aria-hidden="true"
            data-testid="currency-symbol-prefix"
            className="text-sm font-mono font-semibold select-none shrink-0"
            style={{ color: 'var(--prism-text-secondary)' }}
          >
            {activeCurrency.symbol}
          </span>

          <input
            id={inputId}
            type="text"
            inputMode="decimal"
            value={displayedInputValue}
            disabled={disabled}
            onFocus={handleFocus}
            onChange={handleDraftChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="prism-focus-ring w-full min-w-0 bg-transparent font-mono text-sm font-semibold tabular-nums rounded-lg py-1 focus:outline-none disabled:opacity-55 disabled:cursor-not-allowed"
            style={{ color: 'var(--prism-text-primary)' }}
          />
        </div>

        <select
          id={selectId}
          aria-label="Currency"
          value={activeCurrency.code}
          disabled={disabled}
          onChange={handleCurrencyChange}
          className="prism-crystal prism-focus-ring h-11 px-3 rounded-2xl text-xs font-mono font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-all shrink-0 focus:outline-none"
          style={{ color: 'var(--prism-text-primary)' }}
        >
          {availableCurrencies.map((option) => (
            <option
              key={option.code}
              value={option.code}
              style={{
                color: 'var(--prism-text-primary)',
                backgroundColor: 'var(--prism-bg-start)',
              }}
            >
              {`${option.code} (${option.symbol})`}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

CurrencyInput.displayName = 'CurrencyInput';
