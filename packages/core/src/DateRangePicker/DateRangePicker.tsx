'use client';

import { memo, useCallback, useId, useMemo, useState, type KeyboardEvent } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { buildMonthGrid } from '../utils/dateGrid';
import { cx, mergeProps } from '../utils/mergeProps';
import { STYLE_BORDER_DIVIDER, STYLE_PRIMARY_MAIN, STYLE_TEXT_DISABLED, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export interface DateRangeValue {
  /** Inclusive range start date in ISO format (`YYYY-MM-DD`) or `null` when unset. */
  start: string | null;
  /** Inclusive range end date in ISO format (`YYYY-MM-DD`) or `null` when unset. */
  end: string | null;
}

export interface DateRangePreset {
  /** Stable identifier for the preset entry. */
  id: string;
  /** Human-readable preset label rendered in the quick-select rail. */
  label: string;
  /** Preset start date in ISO format (`YYYY-MM-DD`). */
  start: string;
  /** Preset end date in ISO format (`YYYY-MM-DD`). */
  end: string;
}

type DateRangePickerBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface DateRangePickerProps extends DateRangePickerBaseProps {
  /** Controlled date range value (`{ start, end }` ISO `YYYY-MM-DD` strings or `null`). */
  value?: DateRangeValue;
  /** Initial uncontrolled date range value (defaults to `{ start: null, end: null }`). */
  defaultValue?: DateRangeValue;
  /** Callback fired whenever the range changes via day click, preset selection, or Clear. */
  onChange?: (next: DateRangeValue) => void;
  /** Optional custom quick-select presets (defaults to Last 7 Days, Last 30 Days, Month to Date, Last Quarter). */
  presets?: ReadonlyArray<DateRangePreset>;
  /** Reference ISO date (`YYYY-MM-DD`) used to compute default presets and initial calendar view (defaults to `'2026-11-21'`). */
  referenceDate?: string;
  /** Visible heading label displayed in the slab header (defaults to `'Date Range'`). */
  label?: string;
  /** Disables presets, month navigation, day selection, and Clear action. */
  disabled?: boolean;
}

interface ParsedIsoDate {
  year: number;
  month: number;
  day: number;
  iso: string;
}

const DEFAULT_REFERENCE_DATE: ParsedIsoDate = {
  year: 2026,
  month: 10,
  day: 21,
  iso: '2026-11-21',
};

const DEFAULT_RANGE_VALUE: DateRangeValue = {
  start: null,
  end: null,
};

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

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

function parseIsoDate(iso: string | null | undefined): ParsedIsoDate | null {
  if (!iso) return null;
  const match = ISO_DATE_RE.exec(iso);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const probe = new Date(Date.UTC(year, month, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month ||
    probe.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day, iso };
}

function toUtcIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function shiftYearMonth(year: number, month: number, deltaMonths: number): { year: number; month: number } {
  const shifted = new Date(Date.UTC(year, month + deltaMonths, 1));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
  };
}

function buildDefaultPresets(refDate: ParsedIsoDate): DateRangePreset[] {
  const last7Start = toUtcIso(new Date(Date.UTC(refDate.year, refDate.month, refDate.day - 6)));
  const last30Start = toUtcIso(new Date(Date.UTC(refDate.year, refDate.month, refDate.day - 29)));
  const monthStart = toUtcIso(new Date(Date.UTC(refDate.year, refDate.month, 1)));

  const currentQuarter = Math.floor(refDate.month / 3);
  const prevQuarterStartMonth = (currentQuarter - 1) * 3;
  const lastQuarterStart = toUtcIso(new Date(Date.UTC(refDate.year, prevQuarterStartMonth, 1)));
  const lastQuarterEnd = toUtcIso(new Date(Date.UTC(refDate.year, prevQuarterStartMonth + 3, 0)));

  return [
    { id: 'last-7-days', label: 'Last 7 Days', start: last7Start, end: refDate.iso },
    { id: 'last-30-days', label: 'Last 30 Days', start: last30Start, end: refDate.iso },
    { id: 'month-to-date', label: 'Month to Date', start: monthStart, end: refDate.iso },
    { id: 'last-quarter', label: 'Last Quarter', start: lastQuarterStart, end: lastQuarterEnd },
  ];
}

function formatRangeSummary(range: DateRangeValue): string {
  if (range.start && range.end) {
    return `${range.start} → ${range.end}`;
  }
  if (range.start) {
    return `${range.start} → Select end date`;
  }
  if (range.end) {
    return `Select start date → ${range.end}`;
  }
  return 'Select start & end date';
}

function DateRangePickerInner({
  value,
  defaultValue = DEFAULT_RANGE_VALUE,
  onChange,
  presets,
  referenceDate,
  label = 'Date Range',
  disabled = false,
  className,
  style,
  xstyle,
  'aria-label': ariaLabel,
  onKeyDown,
  ref,
  ...rest
}: DateRangePickerProps) {
  const override = useComponentOverride('DateRangePicker');
  const labelId = useId();

  const resolvedRef = useMemo(
    () => parseIsoDate(referenceDate) ?? DEFAULT_REFERENCE_DATE,
    [referenceDate]
  );

  const [range, setRange] = useControllableState<DateRangeValue>({
    value,
    defaultValue,
    onChange,
  });

  const [view, setView] = useState<{ year: number; month: number }>(() => {
    const initialAnchor = parseIsoDate(value?.start ?? defaultValue.start) ?? resolvedRef;
    return { year: initialAnchor.year, month: initialAnchor.month };
  });

  const [statusMessage, setStatusMessage] = useState<string>('');

  const resolvedPresets = useMemo<ReadonlyArray<DateRangePreset>>(
    () => presets ?? buildDefaultPresets(resolvedRef),
    [presets, resolvedRef]
  );

  const secondMonth = useMemo(
    () => shiftYearMonth(view.year, view.month, 1),
    [view.year, view.month]
  );

  const monthPanels = useMemo(
    () => [
      {
        key: `${view.year}-${view.month}`,
        heading: `${MONTH_NAMES[view.month]} ${view.year}`,
        cells: buildMonthGrid(view.year, view.month),
      },
      {
        key: `${secondMonth.year}-${secondMonth.month}`,
        heading: `${MONTH_NAMES[secondMonth.month]} ${secondMonth.year}`,
        cells: buildMonthGrid(secondMonth.year, secondMonth.month),
      },
    ],
    [view.year, view.month, secondMonth.year, secondMonth.month]
  );

  const hasSelection = Boolean(range.start || range.end);
  const isComplete = Boolean(range.start && range.end);
  const summaryText = formatRangeSummary(range);

  const handleNavigateMonth = useCallback((delta: number) => {
    setView((prev) => shiftYearMonth(prev.year, prev.month, delta));
  }, []);

  const handleSelectDay = useCallback(
    (dateIso: string) => {
      if (!range.start || range.end) {
        setRange({ start: dateIso, end: null });
        setStatusMessage(`Start date set to ${dateIso}. Select an end date.`);
        return;
      }
      if (dateIso < range.start) {
        setRange({ start: dateIso, end: range.start });
        setStatusMessage(`Selected range ${dateIso} to ${range.start}.`);
        return;
      }
      setRange({ start: range.start, end: dateIso });
      setStatusMessage(`Selected range ${range.start} to ${dateIso}.`);
    },
    [range.end, range.start, setRange]
  );

  const handleSelectPreset = useCallback(
    (preset: DateRangePreset) => {
      setRange({ start: preset.start, end: preset.end });
      const parsedStart = parseIsoDate(preset.start);
      if (parsedStart) {
        setView({ year: parsedStart.year, month: parsedStart.month });
      }
      setStatusMessage(`Applied preset ${preset.label}: ${preset.start} to ${preset.end}.`);
    },
    [setRange]
  );

  const handleClear = useCallback(() => {
    setRange({ start: null, end: null });
    setStatusMessage('Date range cleared.');
  }, [setRange]);

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
    themeTarget: themeProps('date-range-picker', {
      disabled,
      hasSelection,
      complete: isComplete,
    }),
    baseClassName: 'prism-slab p-4 sm:p-5 w-full',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('date-range-picker', 'header');
  const presetsClass = stableClassName('date-range-picker', 'presets');
  const calendarsClass = stableClassName('date-range-picker', 'calendars');

  const navButtonClass =
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

        <div className="flex flex-wrap items-center gap-2">
          <span
            data-testid="date-range-summary"
            className="prism-well inline-flex items-center px-3 py-1 rounded-full text-xs font-medium tabular-nums"
            style={{
              color: hasSelection ? 'var(--prism-text-primary)' : 'var(--prism-text-secondary)',
            }}
          >
            {summaryText}
          </span>

          {hasSelection ? (
            <button
              type="button"
              disabled={disabled}
              onClick={handleClear}
              className="prism-btn-secondary prism-focus-ring h-7 px-2.5 inline-flex items-center gap-1 text-xs font-medium cursor-pointer enabled:hover:brightness-105 disabled:opacity-45 disabled:cursor-not-allowed"
            >
              <X aria-hidden="true" className="w-3 h-3 shrink-0" />
              <span>Clear</span>
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        <div
          className={cx(
            presetsClass,
            'flex flex-row lg:flex-col flex-wrap gap-1.5 lg:w-40 shrink-0 lg:pr-4 lg:border-r'
          )}
          style={STYLE_BORDER_DIVIDER}
          role="group"
          aria-label="Quick date range presets"
        >
          {resolvedPresets.map((preset) => {
            const isActive = range.start === preset.start && range.end === preset.end;
            return (
              <button
                key={preset.id}
                type="button"
                disabled={disabled}
                aria-pressed={isActive}
                onClick={() => handleSelectPreset(preset)}
                className={cx(
                  'prism-focus-ring px-3 py-2 rounded-xl text-left text-xs transition-[color,background-color,border-color,opacity,transform] cursor-pointer enabled:hover:brightness-105 disabled:opacity-45 disabled:cursor-not-allowed',
                  isActive ? 'prism-emerald font-semibold' : 'prism-well font-medium'
                )}
                style={isActive ? undefined : { color: 'var(--prism-text-primary)' }}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        <div className={cx(calendarsClass, 'flex-1 min-w-0')}>
          <div className="flex items-center justify-between gap-2 mb-3">
            <button
              type="button"
              aria-label="Previous month"
              disabled={disabled}
              onClick={() => handleNavigateMonth(-1)}
              className={navButtonClass}
              style={STYLE_TEXT_PRIMARY}
            >
              <ChevronLeft aria-hidden="true" className="w-4 h-4 shrink-0" />
            </button>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
              {monthPanels.map((panel) => (
                <span
                  key={panel.key}
                  className="text-xs font-semibold tracking-tight"
                  style={STYLE_TEXT_PRIMARY}
                >
                  {panel.heading}
                </span>
              ))}
            </div>

            <button
              type="button"
              aria-label="Next month"
              disabled={disabled}
              onClick={() => handleNavigateMonth(1)}
              className={navButtonClass}
              style={STYLE_TEXT_PRIMARY}
            >
              <ChevronRight aria-hidden="true" className="w-4 h-4 shrink-0" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {monthPanels.map((panel) => (
              <div
                key={panel.key}
                role="group"
                aria-label={panel.heading}
                className="prism-well rounded-2xl p-3"
              >
                <div
                  className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold mb-1.5"
                  style={STYLE_TEXT_SECONDARY}
                >
                  {WEEKDAYS.map((weekday) => (
                    <span key={weekday} className="py-0.5">
                      {weekday}
                    </span>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {panel.cells.map((cell) => {
                    if (!cell.inCurrentMonth) {
                      return (
                        <span
                          key={`${panel.key}-${cell.dateIso}`}
                          aria-hidden="true"
                          className="h-8 flex items-center justify-center text-xs tabular-nums opacity-25 select-none"
                          style={STYLE_TEXT_DISABLED}
                        >
                          {cell.dayOfMonth}
                        </span>
                      );
                    }

                    const isStart = range.start === cell.dateIso;
                    const isEnd = range.end === cell.dateIso;
                    const isEndpoint = isStart || isEnd;
                    const isInRange = Boolean(
                      range.start &&
                        range.end &&
                        cell.dateIso > range.start &&
                        cell.dateIso < range.end
                    );

                    return (
                      <button
                        key={cell.dateIso}
                        type="button"
                        aria-label={cell.dateIso}
                        aria-pressed={isEndpoint}
                        data-date={cell.dateIso}
                        data-range-start={isStart ? 'true' : undefined}
                        data-range-end={isEnd ? 'true' : undefined}
                        data-in-range={isInRange ? 'true' : undefined}
                        disabled={disabled}
                        onClick={() => handleSelectDay(cell.dateIso)}
                        className={cx(
                          'prism-focus-ring h-8 rounded-xl text-xs tabular-nums transition-[color,background-color,border-color,opacity,transform] cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed',
                          isEndpoint
                            ? 'prism-btn-primary font-semibold'
                            : isInRange
                              ? 'bg-[var(--prism-primary-main)]/15 font-medium enabled:hover:brightness-95'
                              : 'enabled:hover:bg-[var(--prism-primary-main)]/10'
                        )}
                        style={isEndpoint ? undefined : { color: 'var(--prism-text-primary)' }}
                      >
                        {cell.dayOfMonth}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <span role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {statusMessage}
      </span>
    </div>
  );
}

export const DateRangePicker = memo(DateRangePickerInner);
DateRangePicker.displayName = 'DateRangePicker';
