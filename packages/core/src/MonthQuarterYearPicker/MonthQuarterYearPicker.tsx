'use client';

import { useCallback, useId, useMemo, useState } from 'react';
import { CalendarRange, ChevronLeft, ChevronRight } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { themeProps } from '../utils/themeProps';

export type PeriodGranularity = 'month' | 'quarter' | 'year';

export interface PeriodValue {
  /** Active reporting period granularity ('month' | 'quarter' | 'year'). */
  granularity: PeriodGranularity;
  /** Four-digit calendar year clamped to minYear..maxYear. */
  year: number;
  /** 1-indexed calendar month (1..12) used when granularity is 'month'. */
  month?: number;
  /** Calendar quarter (1..4) used when granularity is 'quarter'. */
  quarter?: number;
}

type MonthQuarterYearPickerBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface MonthQuarterYearPickerProps extends MonthQuarterYearPickerBaseProps {
  /** Controlled reporting period value. */
  value?: PeriodValue;
  /** Initial reporting period in uncontrolled mode (defaults to Q4 2026). */
  defaultValue?: PeriodValue;
  /** Callback invoked whenever the reporting period or granularity changes. */
  onChange?: (next: PeriodValue) => void;
  /** Allowed granularity tabs (defaults to ['month', 'quarter', 'year']). */
  allowedGranularities?: PeriodGranularity[];
  /** Minimum selectable calendar year inclusive (defaults to 2000). */
  minYear?: number;
  /** Maximum selectable calendar year inclusive (defaults to 2050). */
  maxYear?: number;
  /** Heading label rendered in the picker header (defaults to 'Reporting Period'). */
  label?: string;
  /** Disables granularity switches, navigation buttons, and period cells. */
  disabled?: boolean;
}

interface MonthMeta {
  month: number;
  label: string;
}

interface QuarterMeta {
  quarter: number;
  code: string;
  range: string;
}

const DEFAULT_PERIOD_VALUE: PeriodValue = {
  granularity: 'quarter',
  year: 2026,
  quarter: 4,
};

const DEFAULT_GRANULARITIES: ReadonlyArray<PeriodGranularity> = ['month', 'quarter', 'year'];

const MONTHS: ReadonlyArray<MonthMeta> = [
  { month: 1, label: 'Jan' },
  { month: 2, label: 'Feb' },
  { month: 3, label: 'Mar' },
  { month: 4, label: 'Apr' },
  { month: 5, label: 'May' },
  { month: 6, label: 'Jun' },
  { month: 7, label: 'Jul' },
  { month: 8, label: 'Aug' },
  { month: 9, label: 'Sep' },
  { month: 10, label: 'Oct' },
  { month: 11, label: 'Nov' },
  { month: 12, label: 'Dec' },
];

const QUARTERS: ReadonlyArray<QuarterMeta> = [
  { quarter: 1, code: 'Q1', range: 'Jan–Mar' },
  { quarter: 2, code: 'Q2', range: 'Apr–Jun' },
  { quarter: 3, code: 'Q3', range: 'Jul–Sep' },
  { quarter: 4, code: 'Q4', range: 'Oct–Dec' },
];

function getGranularityLabel(granularity: PeriodGranularity): string {
  switch (granularity) {
    case 'month':
      return 'Month';
    case 'quarter':
      return 'Quarter';
    case 'year':
      return 'Year';
  }
}

function normalizeAllowedGranularities(
  input?: ReadonlyArray<PeriodGranularity>
): PeriodGranularity[] {
  if (!input || input.length === 0) {
    return [...DEFAULT_GRANULARITIES];
  }
  const unique: PeriodGranularity[] = [];
  for (const item of input) {
    if (!unique.includes(item)) {
      unique.push(item);
    }
  }
  return unique;
}

function normalizeYearBounds(minYear: number, maxYear: number): { min: number; max: number } {
  const rawMin = Number.isFinite(minYear) ? Math.trunc(minYear) : 2000;
  const rawMax = Number.isFinite(maxYear) ? Math.trunc(maxYear) : 2050;
  return {
    min: Math.min(rawMin, rawMax),
    max: Math.max(rawMin, rawMax),
  };
}

function normalizePeriodValue(
  input: PeriodValue,
  allowed: ReadonlyArray<PeriodGranularity>,
  minYear: number,
  maxYear: number
): PeriodValue {
  const granularity: PeriodGranularity = allowed.includes(input.granularity)
    ? input.granularity
    : (allowed[0] as PeriodGranularity);
  const year = Math.trunc(clampNumber(input.year, minYear, maxYear, minYear));

  switch (granularity) {
    case 'month': {
      const derivedMonth =
        input.month !== undefined
          ? input.month
          : input.quarter !== undefined
            ? (Math.trunc(clampNumber(input.quarter, 1, 4, 1)) - 1) * 3 + 1
            : 1;
      const month = Math.trunc(clampNumber(derivedMonth, 1, 12, 1));
      return { granularity: 'month', year, month };
    }
    case 'quarter': {
      const derivedQuarter =
        input.quarter !== undefined
          ? input.quarter
          : input.month !== undefined
            ? Math.ceil(Math.trunc(clampNumber(input.month, 1, 12, 1)) / 3)
            : 1;
      const quarter = Math.trunc(clampNumber(derivedQuarter, 1, 4, 1));
      return { granularity: 'quarter', year, quarter };
    }
    case 'year':
      return { granularity: 'year', year };
  }
}

/**
 * Formats a PeriodValue into a concise canonical label (e.g. 'Nov 2026', 'Q4 2026', or '2026').
 */
export function formatPeriodValue(period: PeriodValue): string {
  const safeYear = Number.isFinite(period.year) ? Math.trunc(period.year) : 2026;
  switch (period.granularity) {
    case 'month': {
      const monthIndex = Math.trunc(clampNumber(period.month ?? 1, 1, 12, 1)) - 1;
      const meta = MONTHS[monthIndex] as MonthMeta;
      return `${meta.label} ${safeYear}`;
    }
    case 'quarter': {
      const quarter = Math.trunc(clampNumber(period.quarter ?? 1, 1, 4, 1));
      return `Q${quarter} ${safeYear}`;
    }
    case 'year':
      return String(safeYear);
  }
}

export function MonthQuarterYearPicker({
  value,
  defaultValue = DEFAULT_PERIOD_VALUE,
  onChange,
  allowedGranularities,
  minYear = 2000,
  maxYear = 2050,
  label = 'Reporting Period',
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: MonthQuarterYearPickerProps) {
  const headingId = useId();
  const override = useComponentOverride('MonthQuarterYearPicker');

  const granularities = useMemo<PeriodGranularity[]>(
    () => normalizeAllowedGranularities(allowedGranularities),
    [allowedGranularities]
  );

  const bounds = useMemo(() => normalizeYearBounds(minYear, maxYear), [minYear, maxYear]);

  const initialPeriod = useMemo<PeriodValue>(
    () => normalizePeriodValue(defaultValue, granularities, bounds.min, bounds.max),
    [defaultValue, granularities, bounds.min, bounds.max]
  );

  const [rawPeriod, setPeriod] = useControllableState<PeriodValue>({
    value,
    defaultValue: initialPeriod,
    onChange,
  });

  const activePeriod = useMemo<PeriodValue>(
    () => normalizePeriodValue(rawPeriod, granularities, bounds.min, bounds.max),
    [rawPeriod, granularities, bounds.min, bounds.max]
  );

  const [viewYear, setViewYear] = useState<number>(activePeriod.year);
  const [syncedYear, setSyncedYear] = useState<number>(activePeriod.year);
  if (syncedYear !== activePeriod.year) {
    setSyncedYear(activePeriod.year);
    setViewYear(activePeriod.year);
  }

  const clampedViewYear = Math.trunc(clampNumber(viewYear, bounds.min, bounds.max, bounds.min));
  const isYearView = activePeriod.granularity === 'year';
  const decadeStart = Math.floor(clampedViewYear / 10) * 10;
  const decadeYears = useMemo<number[]>(
    () => Array.from({ length: 12 }, (_, idx) => decadeStart + idx),
    [decadeStart]
  );

  const isPrevDisabled = isYearView
    ? decadeStart <= bounds.min
    : clampedViewYear <= bounds.min;
  const isNextDisabled = isYearView
    ? decadeStart + 11 >= bounds.max
    : clampedViewYear >= bounds.max;

  const handleGranularityChange = useCallback(
    (nextGranularity: PeriodGranularity) => {
      if (nextGranularity === activePeriod.granularity) return;
      const nextPeriod = normalizePeriodValue(
        {
          granularity: nextGranularity,
          year: activePeriod.year,
          month: activePeriod.month,
          quarter: activePeriod.quarter,
        },
        granularities,
        bounds.min,
        bounds.max
      );
      setPeriod(nextPeriod);
    },
    [activePeriod, granularities, bounds.min, bounds.max, setPeriod]
  );

  const handlePrevNavigation = useCallback(() => {
    const target = isYearView ? decadeStart - 10 : clampedViewYear - 1;
    setViewYear(Math.trunc(clampNumber(target, bounds.min, bounds.max, bounds.min)));
  }, [isYearView, decadeStart, clampedViewYear, bounds.min, bounds.max]);

  const handleNextNavigation = useCallback(() => {
    const target = isYearView ? decadeStart + 10 : clampedViewYear + 1;
    setViewYear(Math.trunc(clampNumber(target, bounds.min, bounds.max, bounds.max)));
  }, [isYearView, decadeStart, clampedViewYear, bounds.min, bounds.max]);

  const handleSelectMonth = useCallback(
    (month: number) => {
      setPeriod({
        granularity: 'month',
        year: clampedViewYear,
        month,
      });
    },
    [clampedViewYear, setPeriod]
  );

  const handleSelectQuarter = useCallback(
    (quarter: number) => {
      setPeriod({
        granularity: 'quarter',
        year: clampedViewYear,
        quarter,
      });
    },
    [clampedViewYear, setPeriod]
  );

  const handleSelectYear = useCallback(
    (year: number) => {
      setViewYear(year);
      setPeriod({
        granularity: 'year',
        year,
      });
    },
    [setPeriod]
  );

  const readout = formatPeriodValue(activePeriod);

  const merged = mergeProps({
    themeTarget: themeProps('month-quarter-year-picker', {
      granularity: activePeriod.granularity,
      year: activePeriod.year,
      disabled,
    }),
    baseClassName: 'prism-slab w-full max-w-md p-4 space-y-3.5',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div ref={ref} role="region" aria-labelledby={headingId} {...rest} {...merged}>
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <span
              aria-hidden="true"
              className="prism-well w-8 h-8 rounded-xl inline-flex items-center justify-center shrink-0"
              style={{ color: 'var(--prism-primary-main)' }}
            >
              <CalendarRange className="w-4 h-4 shrink-0" aria-hidden="true" />
            </span>
            <span
              id={headingId}
              className="text-sm font-semibold truncate"
              style={{ color: 'var(--prism-text-primary)' }}
            >
              {label}
            </span>
          </div>

          <span
            data-testid="period-readout"
            className="prism-emerald px-2.5 py-1 rounded-full text-xs font-mono tabular-nums font-semibold whitespace-nowrap shrink-0"
          >
            {readout}
          </span>
        </div>

        {granularities.length > 1 ? (
          <div
            role="group"
            aria-label="Period granularity"
            data-testid="period-granularity-group"
            className="prism-well rounded-full p-1 flex items-center gap-1"
          >
            {granularities.map((granularity) => {
              const isSelected = activePeriod.granularity === granularity;
              return (
                <button
                  key={granularity}
                  type="button"
                  aria-pressed={isSelected}
                  disabled={disabled}
                  data-testid={`granularity-${granularity}`}
                  onClick={() => handleGranularityChange(granularity)}
                  className={cx(
                    isSelected ? 'prism-btn-primary' : 'prism-crystal',
                    'prism-focus-ring flex-1 px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer enabled:hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed transition-all'
                  )}
                  style={isSelected ? undefined : { color: 'var(--prism-text-primary)' }}
                >
                  <span className="relative z-10">{getGranularityLabel(granularity)}</span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <div
        className="prism-well rounded-2xl px-2 py-1.5 flex items-center justify-between gap-2"
        data-testid="period-nav-bar"
      >
        <button
          type="button"
          aria-label={isYearView ? 'Previous decade' : 'Previous year'}
          disabled={disabled || isPrevDisabled}
          data-testid="period-nav-prev"
          onClick={handlePrevNavigation}
          className="prism-crystal prism-focus-ring w-8 h-8 rounded-xl inline-flex items-center justify-center cursor-pointer enabled:hover:brightness-105 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          style={{ color: 'var(--prism-text-primary)' }}
        >
          <ChevronLeft className="w-4 h-4 shrink-0" aria-hidden="true" />
        </button>

        <span
          data-testid="period-nav-heading"
          className="text-xs font-mono tabular-nums font-semibold tracking-wide"
          style={{ color: 'var(--prism-text-primary)' }}
        >
          {isYearView ? `${decadeStart}–${decadeStart + 11}` : clampedViewYear}
        </span>

        <button
          type="button"
          aria-label={isYearView ? 'Next decade' : 'Next year'}
          disabled={disabled || isNextDisabled}
          data-testid="period-nav-next"
          onClick={handleNextNavigation}
          className="prism-crystal prism-focus-ring w-8 h-8 rounded-xl inline-flex items-center justify-center cursor-pointer enabled:hover:brightness-105 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          style={{ color: 'var(--prism-text-primary)' }}
        >
          <ChevronRight className="w-4 h-4 shrink-0" aria-hidden="true" />
        </button>
      </div>

      {activePeriod.granularity === 'month' ? (
        <div
          role="group"
          aria-label={`Months in ${clampedViewYear}`}
          data-testid="period-month-grid"
          className="grid grid-cols-3 gap-2"
        >
          {MONTHS.map((item) => {
            const isSelected =
              activePeriod.year === clampedViewYear && activePeriod.month === item.month;
            return (
              <button
                key={item.month}
                type="button"
                aria-label={`${item.label} ${clampedViewYear}`}
                aria-pressed={isSelected}
                disabled={disabled}
                data-testid={`period-month-${item.month}`}
                onClick={() => handleSelectMonth(item.month)}
                className={cx(
                  isSelected ? 'prism-btn-primary' : 'prism-crystal',
                  'prism-focus-ring h-10 rounded-xl text-xs font-semibold cursor-pointer enabled:hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed transition-all'
                )}
                style={isSelected ? undefined : { color: 'var(--prism-text-primary)' }}
              >
                <span className="relative z-10">{item.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      {activePeriod.granularity === 'quarter' ? (
        <div
          role="group"
          aria-label={`Quarters in ${clampedViewYear}`}
          data-testid="period-quarter-grid"
          className="grid grid-cols-2 gap-2.5"
        >
          {QUARTERS.map((item) => {
            const isSelected =
              activePeriod.year === clampedViewYear && activePeriod.quarter === item.quarter;
            return (
              <button
                key={item.quarter}
                type="button"
                aria-label={`${item.code} ${clampedViewYear} (${item.range})`}
                aria-pressed={isSelected}
                disabled={disabled}
                data-testid={`period-quarter-${item.quarter}`}
                onClick={() => handleSelectQuarter(item.quarter)}
                className={cx(
                  isSelected ? 'prism-btn-primary' : 'prism-crystal',
                  'prism-focus-ring px-3 py-3 rounded-2xl flex flex-col items-center justify-center gap-0.5 cursor-pointer enabled:hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed transition-all'
                )}
                style={isSelected ? undefined : { color: 'var(--prism-text-primary)' }}
              >
                <span className="relative z-10 text-sm font-bold font-mono tabular-nums">
                  {item.code}
                </span>
                <span
                  className="relative z-10 text-[11px] font-medium"
                  style={isSelected ? undefined : { color: 'var(--prism-text-secondary)' }}
                >
                  {item.range}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {activePeriod.granularity === 'year' ? (
        <div
          role="group"
          aria-label={`Years ${decadeStart} to ${decadeStart + 11}`}
          data-testid="period-year-grid"
          className="grid grid-cols-3 gap-2"
        >
          {decadeYears.map((yearValue) => {
            const outOfBounds = yearValue < bounds.min || yearValue > bounds.max;
            const isSelected = activePeriod.year === yearValue;
            return (
              <button
                key={yearValue}
                type="button"
                aria-label={String(yearValue)}
                aria-pressed={isSelected}
                disabled={disabled || outOfBounds}
                data-testid={`period-year-${yearValue}`}
                onClick={() => handleSelectYear(yearValue)}
                className={cx(
                  isSelected ? 'prism-btn-primary' : outOfBounds ? 'prism-well' : 'prism-crystal',
                  'prism-focus-ring h-10 rounded-xl text-xs font-mono tabular-nums font-semibold cursor-pointer enabled:hover:brightness-105 disabled:opacity-40 disabled:cursor-not-allowed transition-all'
                )}
                style={
                  isSelected
                    ? undefined
                    : {
                        color: outOfBounds
                          ? 'var(--prism-text-disabled)'
                          : 'var(--prism-text-primary)',
                      }
                }
              >
                <span className="relative z-10">{yearValue}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

MonthQuarterYearPicker.displayName = 'MonthQuarterYearPicker';
