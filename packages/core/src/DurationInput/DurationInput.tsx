'use client';

import { memo, useId, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { Clock, Minus, Plus, Timer } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { mergeProps } from '../utils/mergeProps';
import { STYLE_ERROR_MAIN, STYLE_PRIMARY_MAIN, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_DAY = 86400;
const DEFAULT_DURATION_SECONDS = 9000;
const DEFAULT_MAX_SECONDS = 31536000;

export interface DurationParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

type DurationInputBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface DurationInputProps extends DurationInputBaseProps {
  /** Controlled duration value in total seconds. */
  valueSeconds?: number;
  /** Initial duration value in total seconds when uncontrolled (defaults to 9000 = 2h 30m). */
  defaultValueSeconds?: number;
  /** Callback fired whenever the duration changes with clamped total seconds and decomposed parts. */
  onChange?: (totalSeconds: number, parts: DurationParts) => void;
  /** Controls visibility of the Days segment well (defaults to true). */
  showDays?: boolean;
  /** Controls visibility of the Seconds segment well (defaults to false). */
  showSeconds?: boolean;
  /** Upper bound in seconds for clamping user input (defaults to 31536000 = 365 days). */
  maxSeconds?: number;
  /** Header label displayed above the duration segments (defaults to 'Duration'). */
  label?: string;
  /** Disables all segment steppers, numeric fields, and quick-shorthand controls. */
  disabled?: boolean;
}

type SegmentKey = 'days' | 'hours' | 'minutes' | 'seconds';

interface SegmentDescriptor {
  key: SegmentKey;
  label: string;
  unitSeconds: number;
  value: number;
}

function normalizeMaxSeconds(maxSeconds: number): number {
  if (!Number.isFinite(maxSeconds) || maxSeconds < 0) {
    return DEFAULT_MAX_SECONDS;
  }
  return Math.floor(maxSeconds);
}

function clampDurationSeconds(seconds: number, maxSeconds: number): number {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return 0;
  }
  return Math.min(Math.floor(seconds), maxSeconds);
}

/**
 * Pure helper decomposing a duration in seconds into integer days, hours, minutes, and seconds.
 * Non-finite and negative values clamp cleanly to zero.
 */
export function decomposeDurationSeconds(totalSeconds: number): DurationParts {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }
  const safe = Math.floor(totalSeconds);
  const days = Math.floor(safe / SECONDS_PER_DAY);
  const afterDays = safe % SECONDS_PER_DAY;
  const hours = Math.floor(afterDays / SECONDS_PER_HOUR);
  const afterHours = afterDays % SECONDS_PER_HOUR;
  const minutes = Math.floor(afterHours / SECONDS_PER_MINUTE);
  const seconds = afterHours % SECONDS_PER_MINUTE;
  return { days, hours, minutes, seconds };
}

/**
 * Pure helper formatting a duration in seconds into compact canonical shorthand
 * such as `'2h 30m'`, `'4d 12h'`, `'1d 2h 15m 30s'`, or `'0m'` / `'0s'`.
 */
export function formatDurationSeconds(totalSeconds: number, showSeconds = false): string {
  const parts = decomposeDurationSeconds(totalSeconds);
  const tokens: string[] = [];
  if (parts.days > 0) {
    tokens.push(`${parts.days}d`);
  }
  if (parts.hours > 0) {
    tokens.push(`${parts.hours}h`);
  }
  if (parts.minutes > 0) {
    tokens.push(`${parts.minutes}m`);
  }
  if (showSeconds && parts.seconds > 0) {
    tokens.push(`${parts.seconds}s`);
  }
  if (tokens.length === 0) {
    return showSeconds ? '0s' : '0m';
  }
  return tokens.join(' ');
}

function isAsciiWhitespace(code: number): boolean {
  return code === 32 || code === 9 || code === 10 || code === 13;
}

function isAsciiDigit(code: number): boolean {
  return code >= 48 && code <= 57;
}

function isAsciiLetter(code: number): boolean {
  return (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
}

function getUnitMultiplier(unit: string): number | null {
  switch (unit) {
    case 'd':
    case 'day':
    case 'days':
      return SECONDS_PER_DAY;
    case 'h':
    case 'hr':
    case 'hrs':
    case 'hour':
    case 'hours':
      return SECONDS_PER_HOUR;
    case 'm':
    case 'min':
    case 'mins':
    case 'minute':
    case 'minutes':
      return SECONDS_PER_MINUTE;
    case 's':
    case 'sec':
    case 'secs':
    case 'second':
    case 'seconds':
      return 1;
    default:
      return null;
  }
}

/**
 * Linear-time single-pass duration shorthand parser (zero backtracking regex).
 * Supports case-insensitive combinations such as `'2h 30m'`, `'4d 12h'`, `'45m'`,
 * and `'1d 2h 15m 30s'`. Returns `null` for empty or malformed input.
 */
export function parseDurationString(raw: string): number | null {
  const len = raw.length;
  let i = 0;
  let total = 0;
  let tokenCount = 0;

  while (i < len) {
    while (i < len && isAsciiWhitespace(raw.charCodeAt(i))) {
      i += 1;
    }
    if (i >= len) {
      break;
    }

    const digitStart = i;
    while (i < len && isAsciiDigit(raw.charCodeAt(i))) {
      i += 1;
    }
    if (i === digitStart) {
      return null;
    }

    const amount = Number(raw.slice(digitStart, i));
    if (!Number.isSafeInteger(amount)) {
      return null;
    }

    while (i < len && isAsciiWhitespace(raw.charCodeAt(i))) {
      i += 1;
    }

    const unitStart = i;
    while (i < len && isAsciiLetter(raw.charCodeAt(i))) {
      i += 1;
    }
    if (i === unitStart) {
      return null;
    }

    const unit = raw.slice(unitStart, i).toLowerCase();
    const multiplier = getUnitMultiplier(unit);
    if (multiplier === null) {
      return null;
    }

    const delta = amount * multiplier;
    if (!Number.isSafeInteger(delta) || !Number.isSafeInteger(total + delta)) {
      return null;
    }

    total += delta;
    tokenCount += 1;
  }

  return tokenCount > 0 ? total : null;
}

function DurationInputInner({
  valueSeconds,
  defaultValueSeconds = DEFAULT_DURATION_SECONDS,
  onChange,
  showDays = true,
  showSeconds = false,
  maxSeconds = DEFAULT_MAX_SECONDS,
  label = 'Duration',
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: DurationInputProps) {
  const baseId = useId();
  const shorthandId = `${baseId}-shorthand`;
  const errorId = `${baseId}-shorthand-error`;
  const override = useComponentOverride('DurationInput');

  const safeMaxSeconds = normalizeMaxSeconds(maxSeconds);

  const [rawSeconds, setRawSeconds] = useControllableState<number>({
    value: valueSeconds,
    defaultValue: clampDurationSeconds(defaultValueSeconds, safeMaxSeconds),
  });

  const [shorthandDraft, setShorthandDraft] = useState<string>('');
  const [shorthandError, setShorthandError] = useState<string | null>(null);

  const currentSeconds = clampDurationSeconds(rawSeconds, safeMaxSeconds);
  const parts = decomposeDurationSeconds(currentSeconds);
  const formattedSummary = formatDurationSeconds(currentSeconds, showSeconds);

  const commitSeconds = (nextRaw: number) => {
    const clamped = clampDurationSeconds(nextRaw, safeMaxSeconds);
    setRawSeconds(clamped);
    onChange?.(clamped, decomposeDurationSeconds(clamped));
  };

  const handleSegmentInputChange = (segment: SegmentKey, e: ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const parsed = Number(e.target.value);
    const nextSegmentValue = Math.max(0, Math.floor(parsed));

    const baseDays = showDays ? parts.days : 0;
    const baseHours = showDays ? parts.hours : parts.days * 24 + parts.hours;
    const nextDays = segment === 'days' ? nextSegmentValue : baseDays;
    const nextHours = segment === 'hours' ? nextSegmentValue : baseHours;
    const nextMinutes = segment === 'minutes' ? nextSegmentValue : parts.minutes;
    const nextSeconds = segment === 'seconds' ? nextSegmentValue : parts.seconds;

    const nextTotal =
      nextDays * SECONDS_PER_DAY +
      nextHours * SECONDS_PER_HOUR +
      nextMinutes * SECONDS_PER_MINUTE +
      nextSeconds;

    commitSeconds(nextTotal);
  };

  const handleApplyShorthand = () => {
    const parsed = parseDurationString(shorthandDraft);
    if (parsed === null) {
      setShorthandError('Invalid duration shorthand. Try values like "2h 30m" or "4d 12h".');
      return;
    }
    setShorthandError(null);
    setShorthandDraft('');
    commitSeconds(parsed);
  };

  const handleShorthandKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing && !disabled) {
      e.preventDefault();
      handleApplyShorthand();
    }
  };

  const segments: SegmentDescriptor[] = [];
  if (showDays) {
    segments.push({
      key: 'days',
      label: 'Days',
      unitSeconds: SECONDS_PER_DAY,
      value: parts.days,
    });
  }
  segments.push({
    key: 'hours',
    label: 'Hours',
    unitSeconds: SECONDS_PER_HOUR,
    value: showDays ? parts.hours : parts.days * 24 + parts.hours,
  });
  segments.push({
    key: 'minutes',
    label: 'Minutes',
    unitSeconds: SECONDS_PER_MINUTE,
    value: parts.minutes,
  });
  if (showSeconds) {
    segments.push({
      key: 'seconds',
      label: 'Seconds',
      unitSeconds: 1,
      value: parts.seconds,
    });
  }

  const gridColsClass =
    segments.length === 4
      ? 'grid-cols-2 sm:grid-cols-4'
      : segments.length === 3
        ? 'grid-cols-1 sm:grid-cols-3'
        : 'grid-cols-2';

  const merged = mergeProps({
    themeTarget: themeProps('duration-input', {
      disabled,
      invalid: Boolean(shorthandError),
      showDays,
      showSeconds,
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
            style={STYLE_PRIMARY_MAIN}
          >
            <Timer aria-hidden="true" className="w-4 h-4 shrink-0" />
          </span>
          <span
            className="text-sm font-semibold truncate"
            style={STYLE_TEXT_PRIMARY}
          >
            {label}
          </span>
        </div>

        <span
          role="status"
          aria-live="polite"
          data-testid="duration-summary-pill"
          className="prism-emerald inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold tabular-nums shrink-0"
        >
          {formattedSummary}
        </span>
      </div>

      <div className={`grid ${gridColsClass} gap-3`}>
        {segments.map((segment) => {
          const segmentInputId = `${baseId}-${segment.key}`;
          const canDecrease = !disabled && currentSeconds >= segment.unitSeconds;
          const canIncrease = !disabled && currentSeconds < safeMaxSeconds;

          return (
            <div
              key={segment.key}
              className="prism-crystal rounded-2xl p-2.5 flex flex-col gap-2"
            >
              <label
                htmlFor={segmentInputId}
                className="text-[11px] font-semibold uppercase tracking-wider px-1"
                style={STYLE_TEXT_SECONDARY}
              >
                {segment.label}
              </label>

              <div className="prism-well rounded-xl p-1 flex items-center gap-1">
                <button
                  type="button"
                  disabled={!canDecrease}
                  aria-label={`Decrease ${segment.label}`}
                  onClick={() => commitSeconds(currentSeconds - segment.unitSeconds)}
                  className="prism-btn-secondary prism-focus-ring w-7 h-7 inline-flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]"
                >
                  <Minus aria-hidden="true" className="w-3.5 h-3.5" />
                </button>

                <input
                  id={segmentInputId}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  aria-label={segment.label}
                  value={segment.value}
                  disabled={disabled}
                  onChange={(e) => handleSegmentInputChange(segment.key, e)}
                  className="prism-focus-ring w-full min-w-0 bg-transparent text-center font-mono text-sm font-semibold tabular-nums rounded-lg py-1 focus:outline-none disabled:opacity-55 disabled:cursor-not-allowed"
                  style={STYLE_TEXT_PRIMARY}
                />

                <button
                  type="button"
                  disabled={!canIncrease}
                  aria-label={`Increase ${segment.label}`}
                  onClick={() => commitSeconds(currentSeconds + segment.unitSeconds)}
                  className="prism-btn-secondary prism-focus-ring w-7 h-7 inline-flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]"
                >
                  <Plus aria-hidden="true" className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div
        className="mt-4 pt-3.5"
        style={{ borderTop: '1px solid var(--prism-divider)' }}
      >
        <div className="flex items-center gap-2">
          <div
            className="prism-well flex-1 min-w-0 h-10 px-3 rounded-full flex items-center gap-2"
            style={
              shorthandError
                ? { boxShadow: 'inset 0 0 0 1.5px var(--prism-error-main)' }
                : undefined
            }
          >
            <Clock
              aria-hidden="true"
              className="w-4 h-4 shrink-0"
              style={{
                color: shorthandError
                  ? 'var(--prism-error-main)'
                  : 'var(--prism-text-secondary)',
              }}
            />
            <input
              id={shorthandId}
              type="text"
              aria-label="Duration shorthand"
              aria-invalid={Boolean(shorthandError)}
              aria-describedby={shorthandError ? errorId : undefined}
              placeholder="e.g. 2h 30m or 4d 12h"
              value={shorthandDraft}
              disabled={disabled}
              onChange={(e) => {
                if (disabled) return;
                setShorthandDraft(e.target.value);
                if (shorthandError) {
                  setShorthandError(null);
                }
              }}
              onKeyDown={handleShorthandKeyDown}
              className="w-full min-w-0 bg-transparent text-xs font-mono focus:outline-none disabled:opacity-55 disabled:cursor-not-allowed"
              style={STYLE_TEXT_PRIMARY}
            />
          </div>

          <button
            type="button"
            disabled={disabled}
            onClick={handleApplyShorthand}
            className="prism-btn-primary prism-focus-ring h-10 px-4 inline-flex items-center justify-center text-xs font-semibold tracking-[-0.01em] whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]"
          >
            <span className="relative z-10">Apply</span>
          </button>
        </div>

        {shorthandError ? (
          <p
            id={errorId}
            role="alert"
            className="mt-2 px-1 text-xs font-medium"
            style={STYLE_ERROR_MAIN}
          >
            {shorthandError}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export const DurationInput = memo(DurationInputInner);
DurationInput.displayName = 'DurationInput';
