'use client';

import { memo, useId, type ChangeEvent } from 'react';
import { Calendar, Clock, Minus, Plus, Repeat, Terminal } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { mergeProps } from '../utils/mergeProps';
import { STYLE_PRIMARY_MAIN, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type RecurrenceEndKind = 'never' | 'until' | 'count';

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval: number;
  weekdays: number[];
  monthDay: number;
  hour: number;
  minute: number;
  endKind: RecurrenceEndKind;
  untilDate?: string;
  count?: number;
}

type RecurrenceBuilderBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface RecurrenceBuilderProps extends RecurrenceBuilderBaseProps {
  /** Controlled recurrence rule value. */
  value?: RecurrenceRule;
  /** Initial recurrence rule in uncontrolled mode. */
  defaultValue?: RecurrenceRule;
  /** Callback fired whenever the recurrence rule updates with normalized rule, 5-field cron, and summary. */
  onChange?: (rule: RecurrenceRule, cron: string, summary: string) => void;
  /** Controls visibility of the monospace 5-field cron expression badge (defaults to true). */
  showCronPreview?: boolean;
  /** Header title rendered in the optical slab (defaults to 'Recurrence Schedule'). */
  label?: string;
  /** Disables all interactive frequency, interval, weekday, time, and end controls. */
  disabled?: boolean;
}

const DEFAULT_RECURRENCE_RULE: RecurrenceRule = {
  frequency: 'weekly',
  interval: 1,
  weekdays: [1, 3, 5],
  monthDay: 1,
  hour: 9,
  minute: 0,
  endKind: 'never',
};

const FREQUENCY_OPTIONS: ReadonlyArray<{ value: RecurrenceFrequency; label: string }> = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

const WEEKDAY_OPTIONS: ReadonlyArray<{ index: number; label: string }> = [
  { index: 0, label: 'Sun' },
  { index: 1, label: 'Mon' },
  { index: 2, label: 'Tue' },
  { index: 3, label: 'Wed' },
  { index: 4, label: 'Thu' },
  { index: 5, label: 'Fri' },
  { index: 6, label: 'Sat' },
];

const END_KIND_OPTIONS: ReadonlyArray<{ value: RecurrenceEndKind; label: string }> = [
  { value: 'never', label: 'Never' },
  { value: 'until', label: 'Until Date' },
  { value: 'count', label: 'After Count' },
];

function clampInt(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.floor(value)));
}

function normalizeWeekdays(weekdays: ReadonlyArray<number>): number[] {
  const unique = new Set<number>();
  for (const day of weekdays) {
    if (Number.isFinite(day)) {
      const floored = Math.floor(day);
      if (floored >= 0 && floored <= 6) {
        unique.add(floored);
      }
    }
  }
  if (unique.size === 0) {
    return [1];
  }
  return Array.from(unique).sort((a, b) => a - b);
}

function normalizeRule(rule: RecurrenceRule): RecurrenceRule {
  return {
    frequency: rule.frequency,
    interval: clampInt(rule.interval, 1, 99, 1),
    weekdays: normalizeWeekdays(rule.weekdays),
    monthDay: clampInt(rule.monthDay, 1, 31, 1),
    hour: clampInt(rule.hour, 0, 23, 9),
    minute: clampInt(rule.minute, 0, 59, 0),
    endKind: rule.endKind,
    ...(rule.untilDate !== undefined ? { untilDate: rule.untilDate } : {}),
    ...(rule.count !== undefined ? { count: clampInt(rule.count, 1, 999, 1) } : {}),
  };
}

function padTwoDigits(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

function getWeekdayShortLabel(dayIndex: number): string {
  const match = WEEKDAY_OPTIONS.find((item) => item.index === dayIndex);
  return match ? match.label : 'Mon';
}

function getFrequencyUnitLabel(frequency: RecurrenceFrequency, interval: number): string {
  const singular = interval === 1;
  switch (frequency) {
    case 'daily':
      return singular ? 'day' : 'days';
    case 'weekly':
      return singular ? 'week' : 'weeks';
    case 'monthly':
      return singular ? 'month' : 'months';
    case 'yearly':
      return singular ? 'year' : 'years';
  }
}

/**
 * Pure helper converting a RecurrenceRule into a standard 5-field cron expression
 * (`<minute> <hour> <dom> <month> <dow>`).
 */
export function toCronExpression(rule: RecurrenceRule): string {
  const normalized = normalizeRule(rule);
  const minuteField = String(normalized.minute);
  const hourField = String(normalized.hour);

  switch (normalized.frequency) {
    case 'daily': {
      const domField = normalized.interval === 1 ? '*' : `*/${normalized.interval}`;
      return `${minuteField} ${hourField} ${domField} * *`;
    }
    case 'weekly': {
      const dowField = normalized.weekdays.join(',');
      return `${minuteField} ${hourField} * * ${dowField}`;
    }
    case 'monthly': {
      const monthField = normalized.interval === 1 ? '*' : `*/${normalized.interval}`;
      return `${minuteField} ${hourField} ${normalized.monthDay} ${monthField} *`;
    }
    case 'yearly': {
      return `${minuteField} ${hourField} ${normalized.monthDay} 1 *`;
    }
  }
}

/**
 * Pure helper formatting a RecurrenceRule into a readable natural-language summary
 * such as `'Every 2 weeks on Tue, Thu at 09:00 until 2026-12-31'`.
 */
export function formatRecurrenceSummary(rule: RecurrenceRule): string {
  const normalized = normalizeRule(rule);
  const timeText = `${padTwoDigits(normalized.hour)}:${padTwoDigits(normalized.minute)}`;
  const unit = getFrequencyUnitLabel(normalized.frequency, normalized.interval);
  const prefix = normalized.interval === 1 ? `Every ${unit}` : `Every ${normalized.interval} ${unit}`;

  let cadence: string;
  switch (normalized.frequency) {
    case 'daily':
      cadence = prefix;
      break;
    case 'weekly': {
      const daysText = normalized.weekdays.map(getWeekdayShortLabel).join(', ');
      cadence = `${prefix} on ${daysText}`;
      break;
    }
    case 'monthly':
    case 'yearly':
      cadence = `${prefix} on day ${normalized.monthDay}`;
      break;
  }

  let endClause = '';
  if (normalized.endKind === 'until') {
    const cleanDate = normalized.untilDate?.trim() ?? '';
    if (cleanDate.length > 0) {
      endClause = ` until ${cleanDate}`;
    }
  } else if (normalized.endKind === 'count') {
    const totalCount = normalized.count ?? 1;
    const occLabel = totalCount === 1 ? 'occurrence' : 'occurrences';
    endClause = ` for ${totalCount} ${occLabel}`;
  }

  return `${cadence} at ${timeText}${endClause}`;
}

function RecurrenceBuilderInner({
  value,
  defaultValue = DEFAULT_RECURRENCE_RULE,
  onChange,
  showCronPreview = true,
  label = 'Recurrence Schedule',
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: RecurrenceBuilderProps) {
  const baseId = useId();
  const intervalId = `${baseId}-interval`;
  const monthDayId = `${baseId}-month-day`;
  const hourId = `${baseId}-hour`;
  const minuteId = `${baseId}-minute`;
  const untilDateId = `${baseId}-until-date`;
  const countId = `${baseId}-count`;
  const override = useComponentOverride('RecurrenceBuilder');

  const [rawRule, setRawRule] = useControllableState<RecurrenceRule>({
    value,
    defaultValue: normalizeRule(defaultValue),
  });

  const rule = normalizeRule(rawRule);
  const cron = toCronExpression(rule);
  const summary = formatRecurrenceSummary(rule);

  const commitRule = (nextRaw: RecurrenceRule) => {
    const normalized = normalizeRule(nextRaw);
    setRawRule(normalized);
    onChange?.(normalized, toCronExpression(normalized), formatRecurrenceSummary(normalized));
  };

  const handleFrequencyChange = (frequency: RecurrenceFrequency) => {
    commitRule({ ...rule, frequency });
  };

  const handleIntervalChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    commitRule({ ...rule, interval: Number(e.target.value) });
  };

  const handleToggleWeekday = (dayIndex: number) => {
    const isSelected = rule.weekdays.includes(dayIndex);
    if (isSelected) {
      if (rule.weekdays.length <= 1) {
        return;
      }
      commitRule({
        ...rule,
        weekdays: rule.weekdays.filter((d) => d !== dayIndex),
      });
      return;
    }
    commitRule({
      ...rule,
      weekdays: [...rule.weekdays, dayIndex].sort((a, b) => a - b),
    });
  };

  const handleMonthDayChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    commitRule({ ...rule, monthDay: Number(e.target.value) });
  };

  const handleHourChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    commitRule({ ...rule, hour: Number(e.target.value) });
  };

  const handleMinuteChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    commitRule({ ...rule, minute: Number(e.target.value) });
  };

  const handleEndKindChange = (endKind: RecurrenceEndKind) => {
    if (endKind === 'until') {
      commitRule({
        ...rule,
        endKind,
        untilDate: rule.untilDate ?? '2026-12-31',
      });
      return;
    }
    if (endKind === 'count') {
      commitRule({
        ...rule,
        endKind,
        count: rule.count ?? 10,
      });
      return;
    }
    commitRule({ ...rule, endKind: 'never' });
  };

  const handleUntilDateChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    commitRule({ ...rule, untilDate: e.target.value });
  };

  const handleCountChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    commitRule({ ...rule, count: Number(e.target.value) });
  };

  const merged = mergeProps({
    themeTarget: themeProps('recurrence-builder', {
      frequency: rule.frequency,
      endKind: rule.endKind,
      disabled,
    }),
    baseClassName: 'prism-slab p-5 w-full space-y-4',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div ref={ref} {...rest} {...merged}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className="prism-well w-8 h-8 rounded-full inline-flex items-center justify-center shrink-0"
            style={STYLE_PRIMARY_MAIN}
          >
            <Repeat aria-hidden="true" className="w-4 h-4 shrink-0" />
          </span>
          <span
            className="text-sm font-semibold truncate"
            style={STYLE_TEXT_PRIMARY}
          >
            {label}
          </span>
        </div>

        <span
          className="prism-crystal inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize shrink-0"
          style={STYLE_TEXT_PRIMARY}
        >
          {rule.frequency}
        </span>
      </div>

      <div>
        <span
          className="block text-[11px] font-semibold uppercase tracking-wider mb-2 ml-1"
          style={STYLE_TEXT_SECONDARY}
        >
          Frequency
        </span>
        <div
          role="group"
          aria-label="Frequency"
          className="grid grid-cols-2 sm:grid-cols-4 gap-2"
        >
          {FREQUENCY_OPTIONS.map((option) => {
            const active = rule.frequency === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                disabled={disabled}
                onClick={() => handleFrequencyChange(option.value)}
                className={`prism-focus-ring h-9 px-3 rounded-full text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform] ${
                  active ? 'prism-btn-primary' : 'prism-btn-secondary'
                }`}
              >
                <span className="relative z-10">{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="prism-crystal rounded-2xl p-3 flex flex-col gap-2">
          <label
            htmlFor={intervalId}
            className="text-[11px] font-semibold uppercase tracking-wider px-1"
            style={STYLE_TEXT_SECONDARY}
          >
            Repeat Every
          </label>
          <div className="flex items-center gap-2">
            <div className="prism-well rounded-xl p-1 flex items-center gap-1 flex-1 min-w-0">
              <button
                type="button"
                disabled={disabled || rule.interval <= 1}
                aria-label="Decrease interval"
                onClick={() => commitRule({ ...rule, interval: rule.interval - 1 })}
                className="prism-btn-secondary prism-focus-ring w-7 h-7 inline-flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]"
              >
                <Minus aria-hidden="true" className="w-3.5 h-3.5" />
              </button>
              <input
                id={intervalId}
                type="number"
                inputMode="numeric"
                min={1}
                max={99}
                aria-label="Interval"
                value={rule.interval}
                disabled={disabled}
                onChange={handleIntervalChange}
                className="prism-focus-ring w-full min-w-0 bg-transparent text-center font-mono text-sm font-semibold tabular-nums rounded-lg py-1 focus:outline-none disabled:opacity-55 disabled:cursor-not-allowed"
                style={STYLE_TEXT_PRIMARY}
              />
              <button
                type="button"
                disabled={disabled || rule.interval >= 99}
                aria-label="Increase interval"
                onClick={() => commitRule({ ...rule, interval: rule.interval + 1 })}
                className="prism-btn-secondary prism-focus-ring w-7 h-7 inline-flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]"
              >
                <Plus aria-hidden="true" className="w-3.5 h-3.5" />
              </button>
            </div>
            <span
              className="text-xs font-medium shrink-0"
              style={STYLE_TEXT_SECONDARY}
            >
              {getFrequencyUnitLabel(rule.frequency, rule.interval)}
            </span>
          </div>
        </div>

        <div className="prism-crystal rounded-2xl p-3 flex flex-col gap-2">
          <span
            className="text-[11px] font-semibold uppercase tracking-wider px-1 flex items-center gap-1.5"
            style={STYLE_TEXT_SECONDARY}
          >
            <Clock aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
            <span>Time (24h)</span>
          </span>
          <div className="grid grid-cols-2 gap-2">
            <div className="prism-well rounded-xl h-9 px-2.5 flex items-center gap-1.5">
              <label
                htmlFor={hourId}
                className="text-[11px] font-medium shrink-0"
                style={STYLE_TEXT_SECONDARY}
              >
                Hr
              </label>
              <input
                id={hourId}
                type="number"
                inputMode="numeric"
                min={0}
                max={23}
                aria-label="Hour"
                value={rule.hour}
                disabled={disabled}
                onChange={handleHourChange}
                className="prism-focus-ring w-full min-w-0 bg-transparent text-center font-mono text-sm font-semibold tabular-nums rounded-lg focus:outline-none disabled:opacity-55 disabled:cursor-not-allowed"
                style={STYLE_TEXT_PRIMARY}
              />
            </div>

            <div className="prism-well rounded-xl h-9 px-2.5 flex items-center gap-1.5">
              <label
                htmlFor={minuteId}
                className="text-[11px] font-medium shrink-0"
                style={STYLE_TEXT_SECONDARY}
              >
                Min
              </label>
              <input
                id={minuteId}
                type="number"
                inputMode="numeric"
                min={0}
                max={59}
                aria-label="Minute"
                value={rule.minute}
                disabled={disabled}
                onChange={handleMinuteChange}
                className="prism-focus-ring w-full min-w-0 bg-transparent text-center font-mono text-sm font-semibold tabular-nums rounded-lg focus:outline-none disabled:opacity-55 disabled:cursor-not-allowed"
                style={STYLE_TEXT_PRIMARY}
              />
            </div>
          </div>
        </div>
      </div>

      {rule.frequency === 'weekly' ? (
        <div>
          <span
            className="block text-[11px] font-semibold uppercase tracking-wider mb-2 ml-1"
            style={STYLE_TEXT_SECONDARY}
          >
            Weekdays
          </span>
          <div
            role="group"
            aria-label="Weekdays"
            className="grid grid-cols-7 gap-1.5"
          >
            {WEEKDAY_OPTIONS.map((day) => {
              const selected = rule.weekdays.includes(day.index);
              return (
                <button
                  key={day.label}
                  type="button"
                  aria-pressed={selected}
                  disabled={disabled}
                  onClick={() => handleToggleWeekday(day.index)}
                  className={`prism-focus-ring h-9 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform] ${
                    selected ? 'prism-emerald' : 'prism-well'
                  }`}
                  style={selected ? undefined : { color: 'var(--prism-text-primary)' }}
                >
                  {day.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {rule.frequency === 'monthly' || rule.frequency === 'yearly' ? (
        <div className="prism-crystal rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3">
          <label
            htmlFor={monthDayId}
            className="text-xs font-semibold flex items-center gap-1.5"
            style={STYLE_TEXT_PRIMARY}
          >
            <Calendar
              aria-hidden="true"
              className="w-4 h-4 shrink-0"
              style={STYLE_TEXT_SECONDARY}
            />
            <span>Day of month</span>
          </label>
          <div className="prism-well rounded-xl h-9 w-24 px-2.5 flex items-center">
            <input
              id={monthDayId}
              type="number"
              inputMode="numeric"
              min={1}
              max={31}
              aria-label="Day of month"
              value={rule.monthDay}
              disabled={disabled}
              onChange={handleMonthDayChange}
              className="prism-focus-ring w-full min-w-0 bg-transparent text-center font-mono text-sm font-semibold tabular-nums rounded-lg focus:outline-none disabled:opacity-55 disabled:cursor-not-allowed"
              style={STYLE_TEXT_PRIMARY}
            />
          </div>
        </div>
      ) : null}

      <div className="space-y-2.5">
        <span
          className="block text-[11px] font-semibold uppercase tracking-wider ml-1"
          style={STYLE_TEXT_SECONDARY}
        >
          Ends
        </span>
        <div
          role="group"
          aria-label="End condition"
          className="grid grid-cols-3 gap-2"
        >
          {END_KIND_OPTIONS.map((option) => {
            const active = rule.endKind === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                disabled={disabled}
                onClick={() => handleEndKindChange(option.value)}
                className={`prism-focus-ring h-9 px-3 rounded-full text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform] ${
                  active ? 'prism-btn-primary' : 'prism-btn-secondary'
                }`}
              >
                <span className="relative z-10">{option.label}</span>
              </button>
            );
          })}
        </div>

        {rule.endKind === 'until' ? (
          <div className="prism-crystal rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3">
            <label
              htmlFor={untilDateId}
              className="text-xs font-semibold"
              style={STYLE_TEXT_PRIMARY}
            >
              Until date
            </label>
            <div className="prism-well rounded-xl h-9 px-3 flex items-center">
              <input
                id={untilDateId}
                type="date"
                aria-label="Until date"
                value={rule.untilDate ?? ''}
                disabled={disabled}
                onChange={handleUntilDateChange}
                className="prism-focus-ring bg-transparent font-mono text-xs font-semibold tabular-nums rounded-lg focus:outline-none disabled:opacity-55 disabled:cursor-not-allowed"
                style={STYLE_TEXT_PRIMARY}
              />
            </div>
          </div>
        ) : null}

        {rule.endKind === 'count' ? (
          <div className="prism-crystal rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3">
            <label
              htmlFor={countId}
              className="text-xs font-semibold"
              style={STYLE_TEXT_PRIMARY}
            >
              Occurrences
            </label>
            <div className="prism-well rounded-xl h-9 w-24 px-2.5 flex items-center">
              <input
                id={countId}
                type="number"
                inputMode="numeric"
                min={1}
                max={999}
                aria-label="Occurrences"
                value={rule.count ?? 10}
                disabled={disabled}
                onChange={handleCountChange}
                className="prism-focus-ring w-full min-w-0 bg-transparent text-center font-mono text-sm font-semibold tabular-nums rounded-lg focus:outline-none disabled:opacity-55 disabled:cursor-not-allowed"
                style={STYLE_TEXT_PRIMARY}
              />
            </div>
          </div>
        ) : null}
      </div>

      <div
        className="prism-crystal rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3"
        style={{ borderTop: '1px solid var(--prism-divider)' }}
      >
        <p
          role="status"
          aria-live="polite"
          data-testid="recurrence-summary"
          className="text-xs font-medium min-w-0"
          style={STYLE_TEXT_PRIMARY}
        >
          {summary}
        </p>

        {showCronPreview ? (
          <span
            data-testid="recurrence-cron"
            className="prism-well inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-xs font-semibold tabular-nums shrink-0"
            style={STYLE_TEXT_PRIMARY}
          >
            <Terminal
              aria-hidden="true"
              className="w-3.5 h-3.5 shrink-0"
              style={STYLE_PRIMARY_MAIN}
            />
            <code>{cron}</code>
          </span>
        ) : null}
      </div>
    </div>
  );
}

export const RecurrenceBuilder = memo(RecurrenceBuilderInner);
RecurrenceBuilder.displayName = 'RecurrenceBuilder';
