'use client';

import { memo, useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { buildMonthGrid } from '../utils/dateGrid';
import { mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';

const MONTH_NAMES = [
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
] as const;

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export type CalendarEventCategory = 'Release' | 'Review' | 'Sync';

export interface CalendarEventItem {
  id: string;
  title: string;
  dateIso: string;
  timeLabel: string;
  category?: string;
}

export interface CalendarViewProps extends BaseProps<HTMLDivElement> {
  /** Scheduled calendar milestones matched by ISO date (YYYY-MM-DD). */
  events: ReadonlyArray<CalendarEventItem>;
  /** Optional handler invoked when a new milestone is submitted for the selected date. */
  onAddEvent?: (dateIso: string, title: string) => void;
  /** Calendar year rendered by the month grid (defaults to 2026). */
  year?: number;
  /** Zero-indexed month 0-11 rendered by the month grid (defaults to 10 = November). */
  month?: number;
  /** Initially selected ISO date string (defaults to '2026-11-20'). */
  initialSelectedDate?: string;
}

function CalendarViewInner({
  events,
  onAddEvent,
  year = 2026,
  month = 10,
  initialSelectedDate = '2026-11-20',
  className,
  style,
  xstyle,
  ref,
  ...rest
}: CalendarViewProps) {
  const override = useComponentOverride('CalendarView');
  const [selectedDate, setSelectedDate] = useState(initialSelectedDate);
  const [draftTitle, setDraftTitle] = useState('');

  const safeMonthIndex = Number.isFinite(month)
    ? ((Math.trunc(month) % 12) + 12) % 12
    : 10;
  const safeYear = Number.isFinite(year) ? Math.trunc(year) : 2026;
  const headingLabel = `${MONTH_NAMES[safeMonthIndex]} ${safeYear}`;

  const cells = buildMonthGrid(safeYear, safeMonthIndex);
  const selectedEvents = events.filter((e) => e.dateIso === selectedDate);

  const handleAdd = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!draftTitle.trim() || !onAddEvent) return;
    onAddEvent(selectedDate, draftTitle.trim());
    setDraftTitle('');
  };

  const merged = mergeProps({
    themeTarget: themeProps('calendar-view', { eventCount: events.length }),
    baseClassName: 'prism-slab p-4 space-y-4',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div ref={ref} {...rest} {...merged}>
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{headingLabel}</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Select a date cell to inspect or schedule milestones
          </p>
        </div>
        <span className="text-xs font-mono tabular-nums text-slate-600 dark:text-slate-300">
          {events.length} scheduled
        </span>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-slate-500">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {cells.slice(0, 35).map((cell) => {
          const firstEvent = events.find((ev) => ev.dateIso === cell.dateIso);
          const isSelected = cell.dateIso === selectedDate;
          return (
            <button
              key={cell.dateIso}
              type="button"
              data-date={cell.dateIso}
              aria-pressed={isSelected}
              onClick={() => setSelectedDate(cell.dateIso)}
              className={`prism-focus-ring min-h-[54px] p-1.5 rounded-2xl text-left flex flex-col justify-between cursor-pointer transition-[color,background-color,border-color,opacity,transform] ${
                isSelected
                  ? 'prism-btn-primary text-white'
                  : cell.inCurrentMonth
                    ? 'prism-well text-slate-800 dark:text-slate-100 hover:brightness-98'
                    : 'opacity-40 text-slate-400'
              }`}
            >
              <span className="text-xs font-mono tabular-nums font-medium relative z-10">
                {cell.dayOfMonth}
              </span>
              {firstEvent ? (
                <span
                  className={`text-[10px] truncate px-1 rounded relative z-10 ${
                    isSelected
                      ? 'bg-white/25 text-white'
                      : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-medium'
                  }`}
                >
                  {firstEvent.title}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="pt-3 border-t border-slate-300/45 dark:border-slate-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="text-xs">
          <span className="font-mono tabular-nums font-semibold text-slate-800 dark:text-slate-100">
            {selectedDate}:
          </span>{' '}
          {selectedEvents.length === 0 ? (
            <span className="text-slate-500">No events scheduled</span>
          ) : (
            <span className="text-slate-700 dark:text-slate-200">
              {selectedEvents.map((e) => `${e.title} (${e.timeLabel})`).join(' · ')}
            </span>
          )}
        </div>

        {onAddEvent ? (
          <form onSubmit={handleAdd} className="flex items-center gap-2">
            <input
              type="text"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.nativeEvent.isComposing) {
                  e.preventDefault();
                }
              }}
              placeholder="New milestone..."
              aria-label="New calendar milestone"
              className="prism-well prism-focus-ring h-8 px-3 rounded-full text-xs text-slate-900 dark:text-white focus:outline-none"
            />
            <button
              type="submit"
              aria-label="Add milestone"
              className="prism-btn-secondary prism-focus-ring h-8 px-3 text-xs font-medium inline-flex items-center gap-1 cursor-pointer"
            >
              <Plus aria-hidden="true" className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}

export const CalendarView = memo(CalendarViewInner);
CalendarView.displayName = 'CalendarView';
