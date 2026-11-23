'use client';

import {
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { MoveHorizontal } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

type ScrubbableNumberFieldBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface ScrubbableNumberFieldProps extends ScrubbableNumberFieldBaseProps {
  /** Controlled numeric value. */
  value?: number;
  /** Initial numeric value in uncontrolled mode (defaults to 24). */
  defaultValue?: number;
  /** Callback fired whenever the numeric value changes via scrubbing, keyboard stepping, or direct edit. */
  onChange?: (next: number) => void;
  /** Minimum inclusive numeric bound (defaults to -1000). */
  min?: number;
  /** Maximum inclusive numeric bound (defaults to 1000). */
  max?: number;
  /** Base increment delta per scrub step or ArrowUp/ArrowDown press (defaults to 1). */
  step?: number;
  /** Horizontal pointer distance in pixels per step, clamped to [1..40] (defaults to 4). */
  sensitivity?: number;
  /** Decimal rounding precision, clamped to [0..10] (defaults to 1). */
  precision?: number;
  /** Visible scrub-strip label bound to the numeric input (defaults to 'Value'). */
  label?: string;
  /** Optional unit suffix badge displayed inside the recessed optical well. */
  suffix?: string;
  /** Disables pointer scrubbing and numeric input editing. */
  disabled?: boolean;
}

interface ScrubSession {
  pointerId: number;
  lastX: number;
  residualPx: number;
  workingValue: number;
  lastEmitted: number;
}

const DEFAULT_VALUE = 24;
const DEFAULT_MIN = -1000;
const DEFAULT_MAX = 1000;
const DEFAULT_STEP = 1;
const DEFAULT_SENSITIVITY = 4;
const MIN_SENSITIVITY = 1;
const MAX_SENSITIVITY = 40;
const DEFAULT_PRECISION = 1;
const MAX_PRECISION = 10;
const FINE_MULTIPLIER = 0.1;
const COARSE_MULTIPLIER = 10;
const DECIMAL_NUMBER_RE = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;

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

function getModifierMultiplier(shiftKey: boolean, altKey: boolean): number {
  if (shiftKey) return FINE_MULTIPLIER;
  if (altKey) return COARSE_MULTIPLIER;
  return 1;
}

function ScrubbableNumberFieldInner({
  value,
  defaultValue = DEFAULT_VALUE,
  onChange,
  min = DEFAULT_MIN,
  max = DEFAULT_MAX,
  step = DEFAULT_STEP,
  sensitivity = DEFAULT_SENSITIVITY,
  precision = DEFAULT_PRECISION,
  label = 'Value',
  suffix,
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: ScrubbableNumberFieldProps) {
  const inputId = useId();
  const override = useComponentOverride('ScrubbableNumberField');
  const scrubSessionRef = useRef<ScrubSession | null>(null);

  const rawMin = Number.isFinite(min) ? min : DEFAULT_MIN;
  const rawMax = Number.isFinite(max) ? max : DEFAULT_MAX;
  const safeMin = Math.min(rawMin, rawMax);
  const safeMax = Math.max(rawMin, rawMax);
  const safeStep = Number.isFinite(step) && step > 0 ? step : DEFAULT_STEP;
  const safeSensitivity = clampNumber(
    sensitivity,
    MIN_SENSITIVITY,
    MAX_SENSITIVITY,
    DEFAULT_SENSITIVITY
  );
  const safePrecision = Math.round(
    clampNumber(precision, 0, MAX_PRECISION, DEFAULT_PRECISION)
  );

  const fallbackValue = clampAndRound(defaultValue, safeMin, safeMax, safePrecision, safeMin);

  const [rawValue, setRawValue] = useControllableState<number>({
    value,
    defaultValue: fallbackValue,
    onChange,
  });

  const [draft, setDraft] = useState<string | null>(null);
  const [scrubbing, setScrubbing] = useState<boolean>(false);

  const current = clampAndRound(rawValue, safeMin, safeMax, safePrecision, fallbackValue);
  const displayValue = String(current);
  const isScrubbing = scrubbing && !disabled;

  const commitValue = (nextRaw: number) => {
    const next = clampAndRound(nextRaw, safeMin, safeMax, safePrecision, current);
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
    const next = clampAndRound(parsed, safeMin, safeMax, safePrecision, current);
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

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const multiplier = getModifierMultiplier(e.shiftKey, e.altKey);
      commitValue(getStepBase() + safeStep * multiplier);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const multiplier = getModifierMultiplier(e.shiftKey, e.altKey);
      commitValue(getStepBase() - safeStep * multiplier);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      commitDraft();
    }
  };

  const handleScrubPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled || e.button > 0) return;
    e.preventDefault();
    const pointerId = e.pointerId;

    scrubSessionRef.current = {
      pointerId,
      lastX: e.clientX,
      residualPx: 0,
      workingValue: current,
      lastEmitted: current,
    };

    setDraft(null);
    setScrubbing(true);
    e.currentTarget.setPointerCapture?.(pointerId);
  };

  const handleScrubPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const session = scrubSessionRef.current;
    if (!session || disabled || e.pointerId !== session.pointerId) return;

    const dx = e.clientX - session.lastX;
    session.lastX = e.clientX;
    const totalPx = session.residualPx + dx;
    const wholeSteps = Math.trunc(totalPx / safeSensitivity);

    if (wholeSteps === 0) {
      session.residualPx = totalPx;
      return;
    }

    session.residualPx = totalPx - wholeSteps * safeSensitivity;
    const multiplier = getModifierMultiplier(e.shiftKey, e.altKey);
    const nextWorking = clampNumber(
      session.workingValue + wholeSteps * safeStep * multiplier,
      safeMin,
      safeMax,
      session.workingValue
    );
    session.workingValue = nextWorking;

    const nextRounded = clampAndRound(
      nextWorking,
      safeMin,
      safeMax,
      safePrecision,
      session.lastEmitted
    );
    if (nextRounded !== session.lastEmitted) {
      session.lastEmitted = nextRounded;
      setRawValue(nextRounded);
    }
  };

  const handleScrubPointerEnd = (e: ReactPointerEvent<HTMLDivElement>) => {
    const session = scrubSessionRef.current;
    if (!session || e.pointerId !== session.pointerId) return;

    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    }

    scrubSessionRef.current = null;
    setScrubbing(false);
  };

  const merged = mergeProps({
    themeTarget: themeProps('scrubbable-number-field', {
      disabled,
      scrubbing: isScrubbing ? 'true' : 'false',
    }),
    baseClassName: 'prism-contain-leaf prism-crystal rounded-2xl p-1.5 inline-flex items-center gap-1.5 transition-shadow',
    overrideClassName: override?.className,
    userClassName: className,
    baseStyle: isScrubbing
      ? { outline: '2px solid var(--prism-focus-ring)', outlineOffset: '1px' }
      : undefined,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div ref={ref} {...rest} {...merged}>
      <div
        data-testid="scrub-strip"
        onPointerDown={handleScrubPointerDown}
        onPointerMove={handleScrubPointerMove}
        onPointerUp={handleScrubPointerEnd}
        onPointerCancel={handleScrubPointerEnd}
        style={{
          touchAction: 'none',
          color: isScrubbing ? 'var(--prism-primary-main)' : 'var(--prism-text-secondary)',
        }}
        className={cx(
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl select-none touch-none shrink-0 transition-colors',
          disabled ? 'cursor-not-allowed opacity-55' : 'cursor-ew-resize'
        )}
      >
        <MoveHorizontal aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
        <label
          htmlFor={inputId}
          className={cx(
            'text-xs font-semibold tracking-tight whitespace-nowrap',
            disabled ? 'cursor-not-allowed' : 'cursor-ew-resize'
          )}
        >
          {label}
        </label>
      </div>

      <div
        className={cx(
          'prism-well rounded-xl h-9 px-2.5 flex items-center gap-1.5 flex-1 min-w-0 transition-opacity',
          disabled ? 'opacity-55' : ''
        )}
      >
        <input
          id={inputId}
          type="text"
          inputMode="decimal"
          role="spinbutton"
          aria-valuenow={current}
          aria-valuemin={safeMin}
          aria-valuemax={safeMax}
          aria-valuetext={suffix ? `${displayValue} ${suffix}` : undefined}
          value={draft !== null ? draft : displayValue}
          disabled={disabled}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          onBlur={commitDraft}
          className="prism-focus-ring w-full min-w-0 bg-transparent text-right font-mono text-sm font-semibold tabular-nums rounded-md focus:outline-none disabled:cursor-not-allowed"
          style={STYLE_TEXT_PRIMARY}
        />
        {suffix ? (
          <span
            data-testid="scrubbable-suffix"
            className="prism-crystal px-1.5 py-0.5 rounded-md font-mono text-[11px] font-semibold select-none shrink-0"
            style={STYLE_TEXT_SECONDARY}
          >
            {suffix}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export const ScrubbableNumberField = /*#__PURE__*/ memoWithDisplayName(ScrubbableNumberFieldInner, 'ScrubbableNumberField');
