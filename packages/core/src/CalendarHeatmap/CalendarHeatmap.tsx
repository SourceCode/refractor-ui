'use client';

import {
  memo,
  useCallback,
  useId,
  useMemo,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type CalendarHeatmapTone = 'emerald' | 'primary' | 'secondary' | 'rose';

export interface CalendarHeatmapEntry {
  /** ISO calendar date string in `YYYY-MM-DD` format (UTC). */
  date: string;
  /** Non-negative finite activity count recorded for the date. */
  count: number;
  /** Optional contextual detail shown in the recessed readout when the day is selected. */
  detail?: string;
}

export interface CalendarHeatmapProps extends BaseProps<HTMLDivElement> {
  /** Daily activity entries aggregated into a prototype-safe UTC date map. */
  entries: CalendarHeatmapEntry[];
  /** Card heading rendered in the optical slab header (defaults to `'Activity Calendar Heatmap'`). */
  title?: string;
  /** Number of week columns rendered in the calendar grid, clamped to `4..26` (defaults to `12`). */
  weeks?: number;
  /**
   * Optional ISO `YYYY-MM-DD` anchor date determining the final week column.
   * When omitted or invalid, derives from the latest valid entry date or falls back to `'2026-11-21'`.
   */
  endDate?: string;
  /** Unit label appended to daily counts and totals (defaults to `'events'`). */
  valueUnit?: string;
  /** Semantic optical tone ramp applied to active day cells and legend swatches (defaults to `'emerald'`). */
  tone?: CalendarHeatmapTone;
  /** Callback fired when a user clicks or keyboard-activates a day cell. */
  onSelectDay?: (entry: CalendarHeatmapEntry) => void;
}

type IntensityLevel = 0 | 1 | 2 | 3 | 4;

interface ToneTokenPair {
  main: string;
  contrast: string;
}

interface CalendarDayCell {
  date: string;
  count: number;
  detail?: string;
  level: IntensityLevel;
}

interface CalendarWeekColumn {
  key: string;
  startDate: string;
  monthMarker: string | null;
  days: ReadonlyArray<CalendarDayCell>;
}

const MS_PER_DAY = 86_400_000;
const DEFAULT_FALLBACK_DATE_MS = Date.UTC(2026, 10, 21);
const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

const WEEKDAY_ROWS: ReadonlyArray<{ index: number; label: string; visible: boolean }> = [
  { index: 0, label: 'Sun', visible: false },
  { index: 1, label: 'Mon', visible: true },
  { index: 2, label: 'Tue', visible: false },
  { index: 3, label: 'Wed', visible: true },
  { index: 4, label: 'Thu', visible: false },
  { index: 5, label: 'Fri', visible: true },
  { index: 6, label: 'Sat', visible: false },
];

const MONTH_LABELS: ReadonlyArray<string> = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const LEVEL_OPACITY: Record<IntensityLevel, number> = {
  0: 0,
  1: 0.24,
  2: 0.48,
  3: 0.72,
  4: 0.95,
};

const LEGEND_LEVELS: ReadonlyArray<IntensityLevel> = [0, 1, 2, 3, 4];

const TONE_TOKEN_MAP: Record<CalendarHeatmapTone, ToneTokenPair> = {
  emerald: {
    main: 'var(--prism-success-main)',
    contrast: 'var(--prism-success-contrast)',
  },
  primary: {
    main: 'var(--prism-primary-main)',
    contrast: 'var(--prism-primary-contrast)',
  },
  secondary: {
    main: 'var(--prism-secondary-main)',
    contrast: 'var(--prism-secondary-contrast)',
  },
  rose: {
    main: 'var(--prism-error-main)',
    contrast: 'var(--prism-error-contrast)',
  },
};

function normalizeZero(value: number): number {
  return value === 0 ? 0 : value;
}

function formatNumeric(value: number): string {
  const safe = normalizeZero(value);
  if (Number.isInteger(safe)) {
    return String(safe);
  }
  return String(Number(safe.toFixed(2)));
}

function formatCountWithUnit(count: number, unit: string): string {
  const numeric = formatNumeric(count);
  return unit ? `${numeric} ${unit}` : numeric;
}

function parseIsoDateUtc(raw: string): number | null {
  const match = ISO_DATE_RE.exec(raw.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const ms = Date.UTC(year, month - 1, day);
  const check = new Date(ms);

  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return null;
  }

  return ms;
}

function formatIsoDateUtc(ms: number): string {
  const date = new Date(ms);
  const yyyy = String(date.getUTCFullYear()).padStart(4, '0');
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function quantizeIntensity(count: number, maxCount: number): IntensityLevel {
  if (count <= 0 || maxCount <= 0) {
    return 0;
  }
  const ratio = count / maxCount;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

function CalendarHeatmapInner({
  entries,
  title = 'Activity Calendar Heatmap',
  weeks = 12,
  endDate,
  valueUnit = 'events',
  tone = 'emerald',
  onSelectDay,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: CalendarHeatmapProps) {
  const headingId = useId();
  const override = useComponentOverride('CalendarHeatmap');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const safeWeeks = Math.round(clampNumber(weeks, 4, 26, 12));
  const unitLabel = valueUnit.trim();
  const toneTokens = TONE_TOKEN_MAP[tone];

  const {
    weekColumns,
    dayLookup,
    totalCount,
    activeDays,
    bestStreak,
    gridStartDate,
    gridEndDate,
  } = useMemo(() => {
    const entryMap = new Map<string, CalendarHeatmapEntry>();
    let latestEntryMs: number | null = null;

    for (const entry of entries) {
      const dateMs = parseIsoDateUtc(entry.date);
      if (dateMs === null || !Number.isFinite(entry.count) || entry.count < 0) {
        continue;
      }

      const iso = formatIsoDateUtc(dateMs);
      const safeCount = normalizeZero(entry.count);
      const incomingDetail = entry.detail?.trim() || undefined;

      if (latestEntryMs === null || dateMs > latestEntryMs) {
        latestEntryMs = dateMs;
      }

      const existing = entryMap.get(iso);
      if (existing) {
        const mergedCount = normalizeZero(existing.count + safeCount);
        const mergedDetail =
          existing.detail && incomingDetail
            ? `${existing.detail}; ${incomingDetail}`
            : (incomingDetail ?? existing.detail);
        entryMap.set(
          iso,
          mergedDetail !== undefined
            ? { date: iso, count: mergedCount, detail: mergedDetail }
            : { date: iso, count: mergedCount }
        );
      } else {
        entryMap.set(
          iso,
          incomingDetail !== undefined
            ? { date: iso, count: safeCount, detail: incomingDetail }
            : { date: iso, count: safeCount }
        );
      }
    }

    const explicitAnchorMs = endDate !== undefined ? parseIsoDateUtc(endDate) : null;
    const anchorMs = explicitAnchorMs ?? latestEntryMs ?? DEFAULT_FALLBACK_DATE_MS;
    const anchorWeekday = new Date(anchorMs).getUTCDay();
    const lastWeekSundayMs = anchorMs - anchorWeekday * MS_PER_DAY;
    const gridStartMs = lastWeekSundayMs - (safeWeeks - 1) * 7 * MS_PER_DAY;

    const rawDays: Array<{ date: string; count: number; detail?: string; weekIndex: number }> = [];
    let maxCount = 0;
    let runningTotal = 0;
    let activeCount = 0;
    let currentStreak = 0;
    let maxStreak = 0;

    for (let w = 0; w < safeWeeks; w += 1) {
      for (let d = 0; d < 7; d += 1) {
        const dayMs = gridStartMs + (w * 7 + d) * MS_PER_DAY;
        const iso = formatIsoDateUtc(dayMs);
        const stored = entryMap.get(iso);
        const count = stored ? stored.count : 0;

        runningTotal += count;
        if (count > maxCount) {
          maxCount = count;
        }
        if (count > 0) {
          activeCount += 1;
          currentStreak += 1;
          if (currentStreak > maxStreak) {
            maxStreak = currentStreak;
          }
        } else {
          currentStreak = 0;
        }

        rawDays.push(
          stored?.detail !== undefined
            ? { date: iso, count, detail: stored.detail, weekIndex: w }
            : { date: iso, count, weekIndex: w }
        );
      }
    }

    const columns: CalendarWeekColumn[] = [];
    const lookup = new Map<string, CalendarDayCell>();
    let prevMonth = -1;

    for (let w = 0; w < safeWeeks; w += 1) {
      const weekStartMs = gridStartMs + w * 7 * MS_PER_DAY;
      const weekMonth = new Date(weekStartMs).getUTCMonth();
      const monthMarker = w === 0 || weekMonth !== prevMonth ? MONTH_LABELS[weekMonth]! : null;
      prevMonth = weekMonth;

      const startDate = formatIsoDateUtc(weekStartMs);
      const days: CalendarDayCell[] = [];

      for (let d = 0; d < 7; d += 1) {
        const raw = rawDays[w * 7 + d]!;
        const level = quantizeIntensity(raw.count, maxCount);
        const cell: CalendarDayCell =
          raw.detail !== undefined
            ? { date: raw.date, count: raw.count, detail: raw.detail, level }
            : { date: raw.date, count: raw.count, level };
        days.push(cell);
        lookup.set(cell.date, cell);
      }

      columns.push({
        key: `cal-week-${startDate}`,
        startDate,
        monthMarker,
        days,
      });
    }

    const startLabel = formatIsoDateUtc(gridStartMs);
    const endLabel = formatIsoDateUtc(lastWeekSundayMs + 6 * MS_PER_DAY);

    return {
      weekColumns: columns,
      dayLookup: lookup,
      totalCount: normalizeZero(runningTotal),
      activeDays: activeCount,
      bestStreak: maxStreak,
      gridStartDate: startLabel,
      gridEndDate: endLabel,
    };
  }, [endDate, entries, safeWeeks]);

  const activeDay = useMemo<CalendarDayCell | null>(() => {
    if (selectedDate === null) return null;
    return dayLookup.get(selectedDate) ?? null;
  }, [dayLookup, selectedDate]);

  const handleSelectDay = useCallback(
    (day: CalendarDayCell) => {
      setSelectedDate(day.date);
      const payload: CalendarHeatmapEntry =
        day.detail !== undefined
          ? { date: day.date, count: day.count, detail: day.detail }
          : { date: day.date, count: day.count };
      onSelectDay?.(payload);
    },
    [onSelectDay]
  );

  const handleDayKeyDown = useCallback(
    (day: CalendarDayCell) => (event: ReactKeyboardEvent<HTMLButtonElement>) => {
      if (event.nativeEvent.isComposing) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleSelectDay(day);
      }
    },
    [handleSelectDay]
  );

  const isEmpty = activeDays === 0;

  const merged = mergeProps({
    themeTarget: themeProps('calendar-heatmap', {
      tone,
      weeks: safeWeeks,
      empty: isEmpty,
    }),
    baseClassName: 'prism-slab p-5 space-y-4',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('calendar-heatmap', 'header');
  const summaryClass = stableClassName('calendar-heatmap', 'summary');
  const legendClass = stableClassName('calendar-heatmap', 'legend');
  const gridClass = stableClassName('calendar-heatmap', 'grid');
  const readoutClass = stableClassName('calendar-heatmap', 'readout');

  return (
    <div ref={ref} role="region" aria-labelledby={headingId} {...rest} {...merged}>
      <div className={cx(headerClass, 'flex flex-wrap items-center justify-between gap-3')}>
        <div className="space-y-2">
          <h4
            id={headingId}
            className="text-sm font-semibold tracking-tight"
            style={STYLE_TEXT_PRIMARY}
          >
            {title}
          </h4>

          <div className={cx(summaryClass, 'flex flex-wrap items-center gap-2 text-[11px] tabular-nums')}>
            <span
              data-testid="calendar-heatmap-total"
              className="prism-crystal px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 font-medium"
              style={STYLE_TEXT_SECONDARY}
            >
              <span>Total</span>
              <span className="font-mono font-semibold" style={STYLE_TEXT_PRIMARY}>
                {formatCountWithUnit(totalCount, unitLabel)}
              </span>
            </span>

            <span
              data-testid="calendar-heatmap-active-days"
              className="prism-crystal px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 font-medium"
              style={STYLE_TEXT_SECONDARY}
            >
              <span>Active Days</span>
              <span className="font-mono font-semibold" style={STYLE_TEXT_PRIMARY}>
                {activeDays}
              </span>
            </span>

            <span
              data-testid="calendar-heatmap-best-streak"
              className="prism-crystal px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 font-medium"
              style={STYLE_TEXT_SECONDARY}
            >
              <span>Best Streak</span>
              <span className="font-mono font-semibold" style={STYLE_TEXT_PRIMARY}>
                {`${bestStreak} ${bestStreak === 1 ? 'day' : 'days'}`}
              </span>
            </span>
          </div>
        </div>

        <div
          data-testid="calendar-heatmap-legend"
          aria-label="Activity intensity scale from less to more"
          className={cx(
            legendClass,
            'prism-crystal px-3 py-1 rounded-full inline-flex items-center gap-1.5 text-[11px] font-medium'
          )}
          style={STYLE_TEXT_SECONDARY}
        >
          <span>Less</span>
          <span className="inline-flex items-center gap-1" aria-hidden="true">
            {LEGEND_LEVELS.map((level) => {
              const opacity = LEVEL_OPACITY[level];
              return (
                <span
                  key={`legend-level-${level}`}
                  data-role="calendar-legend-step"
                  data-level={String(level)}
                  data-opacity={String(opacity)}
                  className="prism-well relative overflow-hidden w-3.5 h-3.5 rounded-[4px] inline-block"
                >
                  {level > 0 ? (
                    <span
                      className="absolute inset-0"
                      style={{
                        backgroundColor: toneTokens.main,
                        opacity,
                      }}
                    />
                  ) : null}
                </span>
              );
            })}
          </span>
          <span>More</span>
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <table
          aria-labelledby={headingId}
          className={cx(gridClass, 'border-separate border-spacing-1 text-xs')}
        >
          <thead>
            <tr>
              <th scope="col" className="pr-2 pb-1 text-right">
                <span className="sr-only">Weekday</span>
              </th>
              {weekColumns.map((week) => (
                <th
                  key={week.key}
                  scope="col"
                  aria-label={`Week of ${week.startDate}`}
                  className="px-0 pb-1 text-left text-[10px] font-semibold whitespace-nowrap align-bottom"
                  style={STYLE_TEXT_SECONDARY}
                >
                  {week.monthMarker ? (
                    <span data-role="calendar-month-marker">{week.monthMarker}</span>
                  ) : (
                    <span aria-hidden="true" className="inline-block h-3" />
                  )}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {WEEKDAY_ROWS.map((row) => (
              <tr key={`weekday-row-${row.label}`}>
                <th
                  scope="row"
                  className="pr-2 text-right text-[10px] font-semibold whitespace-nowrap select-none align-middle"
                  style={STYLE_TEXT_SECONDARY}
                >
                  {row.visible ? (
                    <span data-role="calendar-weekday-label">{row.label}</span>
                  ) : (
                    <span className="sr-only">{row.label}</span>
                  )}
                </th>

                {weekColumns.map((week) => {
                  const day = week.days[row.index]!;
                  const isSelected = activeDay !== null && activeDay.date === day.date;
                  const countText = formatCountWithUnit(day.count, unitLabel);

                  return (
                    <td key={day.date} className="p-0 align-middle">
                      <button
                        type="button"
                        aria-pressed={isSelected}
                        aria-label={`${day.date}: ${countText}`}
                        data-date={day.date}
                        data-count={String(day.count)}
                        data-level={String(day.level)}
                        data-selected={isSelected ? 'true' : 'false'}
                        onClick={() => handleSelectDay(day)}
                        onKeyDown={handleDayKeyDown(day)}
                        className={cx(
                          'prism-focus-ring prism-well relative overflow-hidden w-4 h-4 sm:w-5 sm:h-5 rounded-[4px] block cursor-pointer border transition-transform duration-150',
                          isSelected ? 'scale-110' : 'hover:scale-105'
                        )}
                        style={{
                          borderColor: isSelected
                            ? 'var(--prism-text-primary)'
                            : 'var(--prism-divider)',
                        }}
                      >
                        {day.level > 0 ? (
                          <span
                            aria-hidden="true"
                            data-role="calendar-cell-tint"
                            className="absolute inset-0 pointer-events-none"
                            style={{
                              backgroundColor: toneTokens.main,
                              opacity: LEVEL_OPACITY[day.level],
                            }}
                          />
                        ) : null}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div
        data-testid="calendar-heatmap-readout"
        aria-live="polite"
        className={cx(
          readoutClass,
          'prism-well rounded-xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs tabular-nums'
        )}
        style={STYLE_TEXT_PRIMARY}
      >
        {activeDay ? (
          <span className="inline-flex flex-wrap items-center gap-2 font-medium">
            <span
              aria-hidden="true"
              className="prism-well relative overflow-hidden w-3.5 h-3.5 rounded-[4px] shrink-0"
            >
              {activeDay.level > 0 ? (
                <span
                  data-role="calendar-readout-tint"
                  className="absolute inset-0"
                  style={{
                    backgroundColor: toneTokens.main,
                    opacity: LEVEL_OPACITY[activeDay.level],
                  }}
                />
              ) : null}
            </span>
            <span className="font-mono font-semibold">{activeDay.date}</span>
            <span>{formatCountWithUnit(activeDay.count, unitLabel)}</span>
            <span
              data-testid="calendar-heatmap-readout-level"
              className="prism-crystal px-2 py-0.5 rounded-full font-mono text-[10px]"
              style={STYLE_TEXT_SECONDARY}
            >
              {`Level ${activeDay.level}/4`}
            </span>
            {activeDay.detail ? (
              <span
                data-testid="calendar-heatmap-readout-detail"
                style={STYLE_TEXT_SECONDARY}
              >
                {activeDay.detail}
              </span>
            ) : null}
          </span>
        ) : (
          <span style={STYLE_TEXT_SECONDARY}>
            Select or activate any day cell to inspect activity details.
          </span>
        )}

        <span
          data-testid="calendar-heatmap-window"
          className="font-mono text-[11px]"
          style={STYLE_TEXT_SECONDARY}
        >
          {`${gridStartDate} – ${gridEndDate}`}
        </span>
      </div>
    </div>
  );
}

export const CalendarHeatmap = memo(CalendarHeatmapInner);
CalendarHeatmap.displayName = 'CalendarHeatmap';
