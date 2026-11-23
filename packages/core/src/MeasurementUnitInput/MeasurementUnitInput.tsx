'use client';

import {
  memo,
  useId,
  useMemo,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react';
import { Ruler } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { mergeProps } from '../utils/mergeProps';
import { STYLE_PRIMARY_MAIN, STYLE_TEXT_PRIMARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

const DEFAULT_MIN_AMOUNT = 0;
const DEFAULT_MAX_AMOUNT = 100_000;
const DEFAULT_STEP = 1;

export interface MeasurementUnitOption {
  /** Unique unit identifier (e.g. 'px', 'rem', 'ms', 'GB'). */
  id: string;
  /** Visible display label rendered in the unit selector and summary badge. */
  label: string;
  /** Optional positive finite multiplier converting one of this unit to a shared base unit. */
  factorToBase?: number;
}

export interface MeasurementValue {
  /** Numeric measurement amount clamped within [min, max]. */
  amount: number;
  /** Active unit identifier matching a configured MeasurementUnitOption. */
  unit: string;
}

const DEFAULT_UNIT_PX: MeasurementUnitOption = { id: 'px', label: 'px' };

export const DEFAULT_MEASUREMENT_UNITS: MeasurementUnitOption[] = [
  DEFAULT_UNIT_PX,
  { id: '%', label: '%' },
  { id: 'rem', label: 'rem' },
  { id: 'ms', label: 'ms' },
  { id: 'GB', label: 'GB' },
];

const DEFAULT_MEASUREMENT_VALUE: MeasurementValue = {
  amount: 16,
  unit: 'px',
};

type MeasurementUnitInputBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface MeasurementUnitInputProps extends MeasurementUnitInputBaseProps {
  /** Controlled measurement value ({ amount, unit }). */
  value?: MeasurementValue;
  /** Initial measurement value when uncontrolled (defaults to { amount: 16, unit: 'px' }). */
  defaultValue?: MeasurementValue;
  /** Callback fired when the amount commits/steps or when the active unit changes. */
  onChange?: (next: MeasurementValue) => void;
  /** Curated unit options rendered in the attached prism-crystal switcher (defaults to DEFAULT_MEASUREMENT_UNITS). */
  units?: MeasurementUnitOption[];
  /** Converts amount across units when both previous and next units define finite factorToBase > 0 (defaults to false). */
  convertOnUnitChange?: boolean;
  /** Minimum permitted numeric amount (defaults to 0). */
  min?: number;
  /** Maximum permitted numeric amount (defaults to 100000). */
  max?: number;
  /** Increment/decrement step size applied on ArrowUp/ArrowDown (defaults to 1). */
  step?: number;
  /** Field label displayed in the slab header and linked to the numeric input (defaults to 'Measurement'). */
  label?: string;
  /** Disables the numeric input and attached unit selector. */
  disabled?: boolean;
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

function cleanFloat(value: number): number {
  const rounded = Math.round(value * 1_000_000) / 1_000_000;
  return rounded === 0 ? 0 : rounded;
}

function roundTo3Decimals(value: number): number {
  const rounded = Math.round((value + Number.EPSILON * Math.sign(value)) * 1000) / 1000;
  return rounded === 0 ? 0 : rounded;
}

function isValidFactor(factor: number | undefined): factor is number {
  return factor !== undefined && Number.isFinite(factor) && factor > 0;
}

function parseMeasurementDraft(raw: string): number | null {
  const cleaned = raw.trim();
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

function deduplicateUnits(
  units: MeasurementUnitOption[]
): [MeasurementUnitOption, ...MeasurementUnitOption[]] {
  const seen = new Set<string>();
  let first: MeasurementUnitOption | undefined;
  const rest: MeasurementUnitOption[] = [];
  for (const unit of units) {
    if (!seen.has(unit.id)) {
      seen.add(unit.id);
      if (first === undefined) {
        first = unit;
      } else {
        rest.push(unit);
      }
    }
  }
  if (first !== undefined) {
    return [first, ...rest];
  }
  return [DEFAULT_UNIT_PX, ...DEFAULT_MEASUREMENT_UNITS.slice(1)];
}

function MeasurementUnitInputInner({
  value,
  defaultValue = DEFAULT_MEASUREMENT_VALUE,
  onChange,
  units = DEFAULT_MEASUREMENT_UNITS,
  convertOnUnitChange = false,
  min = DEFAULT_MIN_AMOUNT,
  max = DEFAULT_MAX_AMOUNT,
  step = DEFAULT_STEP,
  label = 'Measurement',
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: MeasurementUnitInputProps) {
  const inputId = useId();
  const selectId = useId();
  const override = useComponentOverride('MeasurementUnitInput');

  const availableUnits = useMemo(() => deduplicateUnits(units), [units]);
  const bounds = useMemo(() => resolveBounds(min, max), [min, max]);
  const safeStep = Number.isFinite(step) && step > 0 ? step : DEFAULT_STEP;

  const [currentValue, setCurrentValue] = useControllableState<MeasurementValue>({
    value,
    defaultValue,
    onChange,
  });

  const activeUnit = useMemo<MeasurementUnitOption>(
    () => availableUnits.find((option) => option.id === currentValue.unit) ?? availableUnits[0],
    [availableUnits, currentValue.unit]
  );

  const rawAmount = Number.isFinite(currentValue.amount) ? currentValue.amount : bounds.min;
  const clampedAmount = clampNumber(rawAmount, bounds.min, bounds.max);

  const [isFocused, setIsFocused] = useState<boolean>(false);
  const [draft, setDraft] = useState<string>(() => String(clampedAmount));

  const displayedInputValue = isFocused ? draft : String(clampedAmount);
  const summaryText = `${clampedAmount} ${activeUnit.label}`;

  const commitAmount = (candidate: number) => {
    const nextAmount = clampNumber(candidate, bounds.min, bounds.max);
    setDraft(String(nextAmount));
    if (nextAmount !== clampedAmount || currentValue.unit !== activeUnit.id) {
      setCurrentValue({
        amount: nextAmount,
        unit: activeUnit.id,
      });
    }
  };

  const commitDraft = () => {
    const parsed = parseMeasurementDraft(draft);
    if (parsed === null) {
      setDraft(String(clampedAmount));
      return;
    }
    commitAmount(parsed);
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
    if (disabled || e.nativeEvent.isComposing) return;

    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const parsedDraft = isFocused ? parseMeasurementDraft(draft) : null;
      const baseAmount = parsedDraft !== null ? parsedDraft : clampedAmount;
      const delta = e.key === 'ArrowUp' ? safeStep : -safeStep;
      commitAmount(cleanFloat(baseAmount + delta));
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      commitDraft();
    }
  };

  const handleUnitChange = (e: ChangeEvent<HTMLSelectElement>) => {
    if (disabled) return;
    const nextUnit = availableUnits.find((option) => option.id === e.target.value);
    if (!nextUnit) return;

    let nextAmount = clampedAmount;
    if (
      convertOnUnitChange &&
      isValidFactor(activeUnit.factorToBase) &&
      isValidFactor(nextUnit.factorToBase)
    ) {
      const converted = (clampedAmount * activeUnit.factorToBase) / nextUnit.factorToBase;
      nextAmount = clampNumber(roundTo3Decimals(converted), bounds.min, bounds.max);
    }

    setDraft(String(nextAmount));
    setCurrentValue({
      amount: nextAmount,
      unit: nextUnit.id,
    });
  };

  const merged = mergeProps({
    themeTarget: themeProps('measurement-unit-input', {
      disabled,
      focused: isFocused,
      unit: activeUnit.id,
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
            style={STYLE_PRIMARY_MAIN}
          >
            <Ruler aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
          </span>
          <label
            htmlFor={inputId}
            className="text-xs font-semibold truncate"
            style={STYLE_TEXT_PRIMARY}
          >
            {label}
          </label>
        </div>

        <span
          role="status"
          aria-live="polite"
          data-testid="measurement-summary-badge"
          className="prism-emerald inline-flex items-center px-3 py-1 rounded-full text-xs font-mono font-semibold tabular-nums whitespace-nowrap shrink-0"
        >
          {summaryText}
        </span>
      </div>

      <div className="flex items-stretch w-full">
        <div
          className="prism-well flex-1 min-w-0 h-11 px-3.5 rounded-l-2xl rounded-r-none flex items-center transition-[color,background-color,border-color,opacity,transform]"
          style={
            isFocused
              ? { boxShadow: 'inset 0 0 0 1.5px var(--prism-primary-main)' }
              : undefined
          }
        >
          <input
            id={inputId}
            type="text"
            inputMode="decimal"
            role="spinbutton"
            aria-valuemin={bounds.min}
            aria-valuemax={bounds.max}
            aria-valuenow={clampedAmount}
            aria-valuetext={summaryText}
            value={displayedInputValue}
            disabled={disabled}
            onFocus={handleFocus}
            onChange={handleDraftChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="prism-focus-ring w-full min-w-0 bg-transparent font-mono text-sm font-semibold tabular-nums rounded-lg py-1 focus:outline-none disabled:opacity-55 disabled:cursor-not-allowed"
            style={STYLE_TEXT_PRIMARY}
          />
        </div>

        <select
          id={selectId}
          aria-label="Unit"
          value={activeUnit.id}
          disabled={disabled}
          onChange={handleUnitChange}
          className="prism-crystal prism-focus-ring h-11 px-3 rounded-r-2xl rounded-l-none text-xs font-mono font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform] shrink-0 focus:outline-none"
          style={{
            color: 'var(--prism-text-primary)',
            borderLeft: '1px solid var(--prism-divider)',
          }}
        >
          {availableUnits.map((unit) => (
            <option
              key={unit.id}
              value={unit.id}
              style={{
                color: 'var(--prism-text-primary)',
                backgroundColor: 'var(--prism-bg-start)',
              }}
            >
              {unit.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export const MeasurementUnitInput = memo(MeasurementUnitInputInner);
MeasurementUnitInput.displayName = 'MeasurementUnitInput';
