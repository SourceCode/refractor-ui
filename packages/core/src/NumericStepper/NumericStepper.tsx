'use client';

import { useId, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { Minus, Plus } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export type NumericStepperSize = 'sm' | 'md' | 'lg';

type NumericStepperBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface NumericStepperProps extends NumericStepperBaseProps {
  /** Controlled numeric value. */
  value?: number;
  /** Initial numeric value in uncontrolled mode (defaults to 1). */
  defaultValue?: number;
  /** Callback fired whenever the committed numeric value changes. */
  onChange?: (next: number) => void;
  /** Minimum inclusive numeric bound (defaults to 0). */
  min?: number;
  /** Maximum inclusive numeric bound (defaults to 100). */
  max?: number;
  /** Increment/decrement delta per step (defaults to 1). */
  step?: number;
  /** Optional decimal rounding precision (inferred from step when omitted). */
  precision?: number;
  /** Optional visible field label bound to the spinbutton input. */
  label?: string;
  /** Optional unit suffix displayed inside the recessed optical well. */
  unit?: string;
  /** Control density scale ('sm' | 'md' | 'lg', defaults to 'md'). */
  size?: NumericStepperSize;
  /** Disables buttons, keyboard stepping, and direct text editing. */
  disabled?: boolean;
}

interface SizeTokens {
  label: string;
  button: string;
  icon: string;
  well: string;
  input: string;
  unit: string;
}

const SIZE_TOKENS: Record<NumericStepperSize, SizeTokens> = {
  sm: {
    label: 'text-[11px]',
    button: 'w-8 h-8 rounded-xl',
    icon: 'w-3.5 h-3.5',
    well: 'h-8 px-2.5 min-w-[4.5rem] rounded-xl',
    input: 'text-xs',
    unit: 'text-[10px]',
  },
  md: {
    label: 'text-xs',
    button: 'w-10 h-10 rounded-xl',
    icon: 'w-4 h-4',
    well: 'h-10 px-3 min-w-[5.5rem] rounded-xl',
    input: 'text-sm',
    unit: 'text-xs',
  },
  lg: {
    label: 'text-sm',
    button: 'w-12 h-12 rounded-2xl',
    icon: 'w-4 h-4',
    well: 'h-12 px-4 min-w-[6.5rem] rounded-2xl',
    input: 'text-base',
    unit: 'text-xs',
  },
};

const MAX_PRECISION = 10;
const PAGE_STEP_MULTIPLIER = 10;
const DECIMAL_NUMBER_RE = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;

function inferPrecision(step: number): number {
  const text = String(step).toLowerCase();
  const expIndex = text.indexOf('e');
  if (expIndex !== -1) {
    const mantissa = text.slice(0, expIndex);
    const exponent = Number(text.slice(expIndex + 1));
    const dotIndex = mantissa.indexOf('.');
    const fracDigits = dotIndex === -1 ? 0 : mantissa.length - dotIndex - 1;
    return Math.min(MAX_PRECISION, Math.max(0, fracDigits - exponent));
  }
  const dotIndex = text.indexOf('.');
  return dotIndex === -1 ? 0 : Math.min(MAX_PRECISION, text.length - dotIndex - 1);
}

function roundToPrecision(value: number, precision: number): number {
  const rounded = Number(value.toFixed(precision));
  return rounded === 0 ? 0 : rounded;
}

function clampAndRound(
  raw: number,
  min: number,
  max: number,
  precision: number,
  fallback: number
): number {
  const clamped = clampNumber(raw, min, max, fallback);
  const rounded = roundToPrecision(clamped, precision);
  return clampNumber(rounded, min, max, fallback);
}

function parseDraftNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (!DECIMAL_NUMBER_RE.test(trimmed)) {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function NumericStepperInner({
  value,
  defaultValue = 1,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  precision,
  label,
  unit,
  size = 'md',
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: NumericStepperProps) {
  const inputId = useId();
  const override = useComponentOverride('NumericStepper');

  const rawMin = Number.isFinite(min) ? min : 0;
  const rawMax = Number.isFinite(max) ? max : 100;
  const safeMin = Math.min(rawMin, rawMax);
  const safeMax = Math.max(rawMin, rawMax);
  const safeStep = Number.isFinite(step) && step > 0 ? step : 1;

  const hasExplicitPrecision = precision !== undefined && Number.isFinite(precision);
  const resolvedPrecision = hasExplicitPrecision
    ? Math.round(clampNumber(precision, 0, MAX_PRECISION, 0))
    : inferPrecision(safeStep);

  const fallbackValue = clampAndRound(defaultValue, safeMin, safeMax, resolvedPrecision, safeMin);

  const [rawValue, setRawValue] = useControllableState<number>({
    value,
    defaultValue: fallbackValue,
    onChange,
  });

  const [draft, setDraft] = useState<string | null>(null);

  const current = clampAndRound(rawValue, safeMin, safeMax, resolvedPrecision, fallbackValue);
  const displayValue = hasExplicitPrecision
    ? current.toFixed(resolvedPrecision)
    : String(current);

  const canDecrement = !disabled && current > safeMin;
  const canIncrement = !disabled && current < safeMax;

  const commitValue = (nextRaw: number) => {
    const next = clampAndRound(nextRaw, safeMin, safeMax, resolvedPrecision, current);
    setDraft(null);
    if (next !== current) {
      setRawValue(next);
    }
  };

  const getStepBase = (): number => {
    if (draft === null) return current;
    const parsed = parseDraftNumber(draft);
    return parsed === null ? current : parsed;
  };

  const commitDraft = () => {
    if (draft === null) return;
    const parsed = parseDraftNumber(draft);
    setDraft(null);
    if (disabled || parsed === null) return;
    const next = clampAndRound(parsed, safeMin, safeMax, resolvedPrecision, current);
    if (next !== current) {
      setRawValue(next);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    setDraft(e.target.value);
  };

  const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled || e.nativeEvent.isComposing) return;

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        commitValue(getStepBase() + safeStep);
        break;
      case 'ArrowDown':
        e.preventDefault();
        commitValue(getStepBase() - safeStep);
        break;
      case 'PageUp':
        e.preventDefault();
        commitValue(getStepBase() + safeStep * PAGE_STEP_MULTIPLIER);
        break;
      case 'PageDown':
        e.preventDefault();
        commitValue(getStepBase() - safeStep * PAGE_STEP_MULTIPLIER);
        break;
      case 'Home':
        e.preventDefault();
        commitValue(safeMin);
        break;
      case 'End':
        e.preventDefault();
        commitValue(safeMax);
        break;
      case 'Enter':
        e.preventDefault();
        commitDraft();
        break;
      default:
        break;
    }
  };

  const sizeStyles = SIZE_TOKENS[size];

  const merged = mergeProps({
    themeTarget: themeProps('numeric-stepper', {
      size,
      disabled,
      atMin: current <= safeMin,
      atMax: current >= safeMax,
    }),
    baseClassName: 'prism-contain-leaf inline-flex flex-col gap-1.5',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div ref={ref} {...rest} {...merged}>
      {label ? (
        <label
          htmlFor={inputId}
          className={cx('font-semibold tracking-tight px-0.5', sizeStyles.label)}
          style={STYLE_TEXT_SECONDARY}
        >
          {label}
        </label>
      ) : null}

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-label="Decrement"
          disabled={!canDecrement}
          onClick={() => commitValue(current - safeStep)}
          className={cx(
            'prism-crystal prism-focus-ring inline-flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]',
            sizeStyles.button
          )}
          style={STYLE_TEXT_PRIMARY}
        >
          <Minus aria-hidden="true" className={sizeStyles.icon} />
        </button>

        <div
          className={cx(
            'prism-well flex items-center justify-center gap-1.5 flex-1 min-w-0 transition-opacity',
            disabled ? 'opacity-55' : '',
            sizeStyles.well
          )}
        >
          <input
            id={inputId}
            type="text"
            inputMode="decimal"
            role="spinbutton"
            aria-label={label ? undefined : 'Numeric value'}
            aria-valuenow={current}
            aria-valuemin={safeMin}
            aria-valuemax={safeMax}
            aria-valuetext={unit ? `${displayValue} ${unit}` : undefined}
            value={draft !== null ? draft : displayValue}
            disabled={disabled}
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
            onBlur={commitDraft}
            className={cx(
              'prism-focus-ring w-full min-w-0 bg-transparent text-center font-mono font-semibold tabular-nums rounded-lg focus:outline-none disabled:cursor-not-allowed',
              sizeStyles.input
            )}
            style={STYLE_TEXT_PRIMARY}
          />
          {unit ? (
            <span
              data-testid="numeric-stepper-unit"
              className={cx('font-mono font-medium select-none shrink-0', sizeStyles.unit)}
              style={STYLE_TEXT_SECONDARY}
            >
              {unit}
            </span>
          ) : null}
        </div>

        <button
          type="button"
          aria-label="Increment"
          disabled={!canIncrement}
          onClick={() => commitValue(current + safeStep)}
          className={cx(
            'prism-crystal prism-focus-ring inline-flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]',
            sizeStyles.button
          )}
          style={STYLE_TEXT_PRIMARY}
        >
          <Plus aria-hidden="true" className={sizeStyles.icon} />
        </button>
      </div>
    </div>
  );
}

export const NumericStepper = /*#__PURE__*/ memoWithDisplayName(NumericStepperInner, 'NumericStepper');
