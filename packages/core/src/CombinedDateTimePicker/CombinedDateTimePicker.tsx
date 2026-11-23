'use client';

import { memo, useCallback, useId, useMemo, useState, type KeyboardEvent } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Clock, Minus, Plus } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { buildMonthGrid } from '../utils/dateGrid';
import { cx, mergeProps } from '../utils/mergeProps';
import { STYLE_BORDER_DIVIDER, STYLE_PRIMARY_MAIN, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type DateTimeClockFormat = '12h' | '24h';

type CombinedDateTimePickerBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface CombinedDateTimePickerProps extends CombinedDateTimePickerBaseProps {
  /** Controlled ISO local date-time string (`YYYY-MM-DDTHH:mm`). */
  value?: string;
  /** Uncontrolled initial ISO local date-time string (defaults to `'2026-11-21T09:30'`). */
  defaultValue?: string;
  /** Callback fired with the updated `YYYY-MM-DDTHH:mm` string when date or time changes. */
  onChange?: (iso: string) => void;
  /** Clock format used for the readout badge and hour stepper (`'12h'` or `'24h'`, default `'24h'`). */
  clockFormat?: DateTimeClockFormat;
  /** Minute increment/decrement step clamped between `1` and `30` (defaults to `5`). */
  minuteStep?: number;
  /** Heading label rendered in the optical slab header (defaults to `'Date & Time'`). */
  label?: string;
  /** Disables calendar navigation, day selection, hour/minute steppers, AM/PM toggle, and presets. */
  disabled?: boolean;
}

interface ParsedDateTime {
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
  dateIso: string;
  iso: string;
}

interface TimePreset {
  label: string;
  hours: number;
  minutes: number;
}

const DEFAULT_DATE_TIME_ISO = '2026-11-21T09:30';

const FALLBACK_DATE_TIME: ParsedDateTime = {
  year: 2026,
  month: 10,
  day: 21,
  hours: 9,
  minutes: 30,
  dateIso: '2026-11-21',
  iso: DEFAULT_DATE_TIME_ISO,
};

const DATE_TIME_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

const DEFAULT_MINUTE_STEP = 5;
const MIN_MINUTE_STEP = 1;
const MAX_MINUTE_STEP = 30;

const MONTH_NAMES: ReadonlyArray<string> = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEKDAYS: ReadonlyArray<string> = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const QUICK_TIME_PRESETS: ReadonlyArray<TimePreset> = [
  { label: '09:00', hours: 9, minutes: 0 },
  { label: '12:00', hours: 12, minutes: 0 },
  { label: '17:00', hours: 17, minutes: 0 },
];

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function clampMinuteStep(step: number): number {
  if (!Number.isFinite(step)) {
    return DEFAULT_MINUTE_STEP;
  }
  return Math.min(MAX_MINUTE_STEP, Math.max(MIN_MINUTE_STEP, Math.trunc(step)));
}

function parseDateTimeIso(raw: string): ParsedDateTime {
  const match = DATE_TIME_RE.exec(raw);
  if (!match) {
    return FALLBACK_DATE_TIME;
  }

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const hours = Number(match[4]);
  const minutes = Number(match[5]);

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return FALLBACK_DATE_TIME;
  }

  const probe = new Date(Date.UTC(year, month, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month ||
    probe.getUTCDate() !== day
  ) {
    return FALLBACK_DATE_TIME;
  }

  const dateIso = `${match[1]}-${match[2]}-${match[3]}`;
  return {
    year,
    month,
    day,
    hours,
    minutes,
    dateIso,
    iso: `${dateIso}T${pad2(hours)}:${pad2(minutes)}`,
  };
}

function formatDateTimeIso(dateIso: string, hours: number, minutes: number): string {
  return `${dateIso}T${pad2(hours)}:${pad2(minutes)}`;
}

function formatReadout(parsed: ParsedDateTime, clockFormat: DateTimeClockFormat): string {
  if (clockFormat === '12h') {
    const period = parsed.hours >= 12 ? 'PM' : 'AM';
    const hour12 = parsed.hours % 12 === 0 ? 12 : parsed.hours % 12;
    return `${parsed.dateIso} · ${hour12}:${pad2(parsed.minutes)} ${period}`;
  }
  return `${parsed.dateIso} · ${pad2(parsed.hours)}:${pad2(parsed.minutes)}`;
}

function shiftYearMonth(year: number, month: number, deltaMonths: number): { year: number; month: number } {
  const shifted = new Date(Date.UTC(year, month + deltaMonths, 1));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
  };
}

function CombinedDateTimePickerInner({
  value,
  defaultValue = DEFAULT_DATE_TIME_ISO,
  onChange,
  clockFormat = '24h',
  minuteStep = DEFAULT_MINUTE_STEP,
  label = 'Date & Time',
  disabled = false,
  className,
  style,
  xstyle,
  'aria-label': ariaLabel,
  onKeyDown,
  ref,
  ...rest
}: CombinedDateTimePickerProps) {
  const override = useComponentOverride('CombinedDateTimePicker');
  const labelId = useId();

  const [currentIso, setCurrentIso] = useControllableState<string>({
    value,
    defaultValue,
    onChange,
  });

  const parsed = useMemo(() => parseDateTimeIso(currentIso), [currentIso]);
  const safeMinuteStep = clampMinuteStep(minuteStep);

  const [view, setView] = useState<{ year: number; month: number }>(() => {
    const initial = parseDateTimeIso(value ?? defaultValue);
    return { year: initial.year, month: initial.month };
  });

  const [statusMessage, setStatusMessage] = useState<string>('');

  const cells = useMemo(() => buildMonthGrid(view.year, view.month), [view.year, view.month]);
  const monthHeading = `${MONTH_NAMES[view.month]} ${view.year}`;

  const period: 'AM' | 'PM' = parsed.hours >= 12 ? 'PM' : 'AM';
  const hour12 = parsed.hours % 12 === 0 ? 12 : parsed.hours % 12;
  const displayedHour = clockFormat === '12h' ? String(hour12) : pad2(parsed.hours);
  const displayedMinute = pad2(parsed.minutes);
  const readoutText = formatReadout(parsed, clockFormat);

  const commitDateTime = useCallback(
    (nextDateIso: string, nextHours: number, nextMinutes: number) => {
      const nextIso = formatDateTimeIso(nextDateIso, nextHours, nextMinutes);
      setCurrentIso(nextIso);
      const nextParsed = parseDateTimeIso(nextIso);
      setStatusMessage(`Selected ${formatReadout(nextParsed, clockFormat)}.`);
    },
    [clockFormat, setCurrentIso]
  );

  const handleNavigateMonth = useCallback((delta: number) => {
    setView((prev) => shiftYearMonth(prev.year, prev.month, delta));
  }, []);

  const handleSelectDay = useCallback(
    (dateIso: string, inCurrentMonth: boolean) => {
      commitDateTime(dateIso, parsed.hours, parsed.minutes);
      if (!inCurrentMonth) {
        const nextParsed = parseDateTimeIso(formatDateTimeIso(dateIso, parsed.hours, parsed.minutes));
        setView({ year: nextParsed.year, month: nextParsed.month });
      }
    },
    [commitDateTime, parsed.hours, parsed.minutes]
  );

  const handleAdjustHour = useCallback(
    (delta: number) => {
      const nextHours = ((parsed.hours + delta) % 24 + 24) % 24;
      commitDateTime(parsed.dateIso, nextHours, parsed.minutes);
    },
    [commitDateTime, parsed.dateIso, parsed.hours, parsed.minutes]
  );

  const handleAdjustMinute = useCallback(
    (delta: number) => {
      const nextMinutes = ((parsed.minutes + delta) % 60 + 60) % 60;
      commitDateTime(parsed.dateIso, parsed.hours, nextMinutes);
    },
    [commitDateTime, parsed.dateIso, parsed.hours, parsed.minutes]
  );

  const handleSelectPeriod = useCallback(
    (targetPeriod: 'AM' | 'PM') => {
      if (targetPeriod === period) return;
      const nextHours = targetPeriod === 'PM' ? parsed.hours + 12 : parsed.hours - 12;
      commitDateTime(parsed.dateIso, nextHours, parsed.minutes);
    },
    [commitDateTime, parsed.dateIso, parsed.hours, parsed.minutes, period]
  );

  const handleSelectPreset = useCallback(
    (preset: TimePreset) => {
      commitDateTime(parsed.dateIso, preset.hours, preset.minutes);
    },
    [commitDateTime, parsed.dateIso]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (!e.nativeEvent.isComposing && !disabled) {
        if (e.key === 'PageUp') {
          e.preventDefault();
          handleNavigateMonth(-1);
        } else if (e.key === 'PageDown') {
          e.preventDefault();
          handleNavigateMonth(1);
        }
      }
      onKeyDown?.(e);
    },
    [disabled, handleNavigateMonth, onKeyDown]
  );

  const merged = mergeProps({
    themeTarget: themeProps('combined-date-time-picker', {
      clockFormat,
      disabled,
    }),
    baseClassName: 'prism-slab p-4 sm:p-5 w-full',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('combined-date-time-picker', 'header');
  const calendarClass = stableClassName('combined-date-time-picker', 'calendar');
  const timePanelClass = stableClassName('combined-date-time-picker', 'time-panel');

  const iconButtonClass =
    'prism-crystal prism-focus-ring w-8 h-8 rounded-full inline-flex items-center justify-center shrink-0 transition-[color,background-color,border-color,opacity,transform] cursor-pointer enabled:hover:brightness-105 disabled:opacity-45 disabled:cursor-not-allowed';

  return (
    <div
      ref={ref}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabel ? undefined : labelId}
      onKeyDown={handleKeyDown}
      {...rest}
      {...merged}
    >
      <div
        className={cx(
          headerClass,
          'flex flex-wrap items-center justify-between gap-2.5 pb-3.5 mb-4 border-b'
        )}
        style={STYLE_BORDER_DIVIDER}
      >
        <div className="min-w-0 flex items-center gap-2.5">
          <span
            className="prism-well w-8 h-8 rounded-full inline-flex items-center justify-center shrink-0"
            style={STYLE_PRIMARY_MAIN}
          >
            <Calendar aria-hidden="true" className="w-4 h-4 shrink-0" />
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
          data-testid="combined-datetime-readout"
          className="prism-well inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tabular-nums"
          style={STYLE_TEXT_PRIMARY}
        >
          <Clock aria-hidden="true" className="w-3.5 h-3.5 shrink-0" style={STYLE_PRIMARY_MAIN} />
          <span>{readoutText}</span>
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_220px] gap-4">
        <div className={cx(calendarClass, 'prism-well rounded-2xl p-3.5 min-w-0')}>
          <div className="flex items-center justify-between gap-2 mb-3">
            <button
              type="button"
              aria-label="Previous month"
              disabled={disabled}
              onClick={() => handleNavigateMonth(-1)}
              className={iconButtonClass}
              style={STYLE_TEXT_PRIMARY}
            >
              <ChevronLeft aria-hidden="true" className="w-4 h-4 shrink-0" />
            </button>

            <span
              className="text-xs font-semibold tracking-tight"
              style={STYLE_TEXT_PRIMARY}
            >
              {monthHeading}
            </span>

            <button
              type="button"
              aria-label="Next month"
              disabled={disabled}
              onClick={() => handleNavigateMonth(1)}
              className={iconButtonClass}
              style={STYLE_TEXT_PRIMARY}
            >
              <ChevronRight aria-hidden="true" className="w-4 h-4 shrink-0" />
            </button>
          </div>

          <div
            className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold mb-1.5"
            style={STYLE_TEXT_SECONDARY}
          >
            {WEEKDAYS.map((dayName) => (
              <span key={dayName} className="py-0.5">
                {dayName}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell) => {
              const isSelected = cell.dateIso === parsed.dateIso;
              return (
                <button
                  key={cell.dateIso}
                  type="button"
                  aria-label={cell.dateIso}
                  aria-pressed={isSelected}
                  data-date={cell.dateIso}
                  disabled={disabled}
                  onClick={() => handleSelectDay(cell.dateIso, cell.inCurrentMonth)}
                  className={cx(
                    'prism-focus-ring h-8 rounded-xl text-xs tabular-nums transition-[color,background-color,border-color,opacity,transform] cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed',
                    isSelected
                      ? 'prism-btn-primary font-semibold'
                      : 'enabled:hover:bg-[var(--prism-primary-main)]/10'
                  )}
                  style={
                    isSelected
                      ? undefined
                      : {
                          color: cell.inCurrentMonth
                            ? 'var(--prism-text-primary)'
                            : 'var(--prism-text-disabled)',
                        }
                  }
                >
                  {cell.dayOfMonth}
                </button>
              );
            })}
          </div>
        </div>

        <div
          className={cx(timePanelClass, 'prism-well rounded-2xl p-3.5 flex flex-col justify-between gap-3.5')}
          role="group"
          aria-label="Time controls"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span
                className="text-[11px] font-semibold uppercase tracking-wider"
                style={STYLE_TEXT_SECONDARY}
              >
                Hour
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  aria-label="Decrease hour"
                  disabled={disabled}
                  onClick={() => handleAdjustHour(-1)}
                  className={iconButtonClass}
                  style={STYLE_TEXT_PRIMARY}
                >
                  <Minus aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                </button>
                <span
                  data-testid="combined-datetime-hour"
                  className="prism-crystal w-10 h-8 rounded-xl inline-flex items-center justify-center text-sm font-semibold tabular-nums"
                  style={STYLE_TEXT_PRIMARY}
                >
                  {displayedHour}
                </span>
                <button
                  type="button"
                  aria-label="Increase hour"
                  disabled={disabled}
                  onClick={() => handleAdjustHour(1)}
                  className={iconButtonClass}
                  style={STYLE_TEXT_PRIMARY}
                >
                  <Plus aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span
                className="text-[11px] font-semibold uppercase tracking-wider"
                style={STYLE_TEXT_SECONDARY}
              >
                Minute
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  aria-label="Decrease minute"
                  disabled={disabled}
                  onClick={() => handleAdjustMinute(-safeMinuteStep)}
                  className={iconButtonClass}
                  style={STYLE_TEXT_PRIMARY}
                >
                  <Minus aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                </button>
                <span
                  data-testid="combined-datetime-minute"
                  className="prism-crystal w-10 h-8 rounded-xl inline-flex items-center justify-center text-sm font-semibold tabular-nums"
                  style={STYLE_TEXT_PRIMARY}
                >
                  {displayedMinute}
                </span>
                <button
                  type="button"
                  aria-label="Increase minute"
                  disabled={disabled}
                  onClick={() => handleAdjustMinute(safeMinuteStep)}
                  className={iconButtonClass}
                  style={STYLE_TEXT_PRIMARY}
                >
                  <Plus aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                </button>
              </div>
            </div>

            {clockFormat === '12h' ? (
              <div className="flex items-center justify-between pt-1">
                <span
                  className="text-[11px] font-semibold uppercase tracking-wider"
                  style={STYLE_TEXT_SECONDARY}
                >
                  Period
                </span>
                <div className="inline-flex items-center gap-1.5" role="group" aria-label="Meridiem">
                  {(['AM', 'PM'] as const).map((meridiem) => {
                    const active = period === meridiem;
                    return (
                      <button
                        key={meridiem}
                        type="button"
                        aria-pressed={active}
                        disabled={disabled}
                        onClick={() => handleSelectPeriod(meridiem)}
                        className={cx(
                          'prism-focus-ring h-8 px-3 rounded-full text-xs transition-[color,background-color,border-color,opacity,transform] cursor-pointer enabled:hover:brightness-105 disabled:opacity-45 disabled:cursor-not-allowed',
                          active ? 'prism-emerald font-semibold' : 'prism-crystal font-medium'
                        )}
                        style={active ? undefined : { color: 'var(--prism-text-primary)' }}
                      >
                        {meridiem}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>

          <div className="pt-3 border-t space-y-2" style={STYLE_BORDER_DIVIDER}>
            <span
              className="block text-[11px] font-semibold uppercase tracking-wider"
              style={STYLE_TEXT_SECONDARY}
            >
              Quick Presets
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {QUICK_TIME_PRESETS.map((preset) => {
                const isActive =
                  parsed.hours === preset.hours && parsed.minutes === preset.minutes;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    aria-pressed={isActive}
                    disabled={disabled}
                    onClick={() => handleSelectPreset(preset)}
                    className={cx(
                      'prism-focus-ring h-8 rounded-full text-xs tabular-nums transition-[color,background-color,border-color,opacity,transform] cursor-pointer enabled:hover:brightness-105 disabled:opacity-45 disabled:cursor-not-allowed',
                      isActive ? 'prism-emerald font-semibold' : 'prism-crystal font-medium'
                    )}
                    style={isActive ? undefined : { color: 'var(--prism-text-primary)' }}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <span role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {statusMessage}
      </span>
    </div>
  );
}

export const CombinedDateTimePicker = memo(CombinedDateTimePickerInner);
CombinedDateTimePicker.displayName = 'CombinedDateTimePicker';
