'use client';

import { useState, type KeyboardEvent } from 'react';
import { Calendar, Clock } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { buildMonthGrid } from '../utils/dateGrid';
import { mergeProps } from '../utils/mergeProps';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

const DEFAULT_TIME_SLOTS: ReadonlyArray<string> = [
  '09:00 AM',
  '10:30 AM',
  '01:00 PM',
  '03:30 PM',
  '05:00 PM',
];

const WEEKDAYS: ReadonlyArray<string> = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export interface DateTimePickerProps extends BaseProps<HTMLDivElement> {
  /** Selected ISO 8601 date string (YYYY-MM-DD). */
  dateIso: string;
  /** Selected formatted time slot label. */
  timeSlot: string;
  /** Callback fired when a calendar date is selected. */
  onChangeDate: (dateIso: string) => void;
  /** Callback fired when a time slot is selected. */
  onChangeTime: (timeSlot: string) => void;
  /** Calendar grid year (defaults to 2026). */
  year?: number;
  /** Zero-indexed calendar month (defaults to 10 for November). */
  month?: number;
  /** Heading label shown above the calendar grid. */
  monthLabel?: string;
  /** Timezone caption displayed opposite the month heading. */
  timezoneLabel?: string;
  /** Available selectable time slot labels. */
  timeSlots?: ReadonlyArray<string>;
  /** Disables opening the date/time selector popover. */
  disabled?: boolean;
}

function DateTimePickerInner({
  dateIso,
  timeSlot,
  onChangeDate,
  onChangeTime,
  year = 2026,
  month = 10,
  monthLabel = 'November 2026',
  timezoneLabel = 'UTC-8',
  timeSlots = DEFAULT_TIME_SLOTS,
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  onKeyDown,
  ...rest
}: DateTimePickerProps) {
  const [open, setOpen] = useState(false);
  const override = useComponentOverride('DateTimePicker');
  const cells = buildMonthGrid(year, month);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape' && open) {
      setOpen(false);
    }
    onKeyDown?.(e);
  };

  const merged = mergeProps({
    themeTarget: themeProps('date-time-picker', { open, disabled }),
    baseClassName: 'w-full',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div ref={ref} onKeyDown={handleKeyDown} {...rest} {...merged}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className="prism-crystal prism-focus-ring w-full h-12 rounded-full px-4 flex items-center justify-between text-sm font-medium text-slate-800 dark:text-slate-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="flex items-center gap-2.5">
          <Calendar className="w-4 h-4 text-orange-600 dark:text-orange-400" aria-hidden="true" />
          <span className="tabular-nums">{dateIso}</span>
        </span>
        <span className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 tabular-nums">
          <Clock className="w-3.5 h-3.5" aria-hidden="true" />
          {timeSlot}
        </span>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label={`${monthLabel} date and time picker`}
          className="prism-slab mt-2.5 p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">
              {monthLabel}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              {timezoneLabel}
            </span>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-slate-500 font-medium">
            {WEEKDAYS.map((dayName) => (
              <span key={dayName}>{dayName}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell) => {
              const selected = cell.dateIso === dateIso;
              return (
                <button
                  key={cell.dateIso}
                  type="button"
                  aria-label={cell.dateIso}
                  aria-pressed={selected}
                  onClick={() => onChangeDate(cell.dateIso)}
                  className={`prism-focus-ring h-8 rounded-xl text-xs tabular-nums cursor-pointer transition-colors ${
                    selected
                      ? 'prism-btn-primary font-semibold'
                      : cell.inCurrentMonth
                        ? 'text-slate-800 dark:text-slate-100 hover:bg-white/60 dark:hover:bg-white/10'
                        : 'text-slate-400 dark:text-slate-600'
                  }`}
                >
                  {cell.dayOfMonth}
                </button>
              );
            })}
          </div>
          <div className="pt-2 border-t border-slate-300/40 dark:border-slate-700/50 flex flex-wrap gap-1.5">
            {timeSlots.map((slot) => (
              <button
                key={slot}
                type="button"
                aria-pressed={slot === timeSlot}
                onClick={() => onChangeTime(slot)}
                className={`prism-focus-ring px-2.5 py-1 rounded-full text-xs tabular-nums cursor-pointer transition-colors ${
                  slot === timeSlot
                    ? 'prism-emerald text-white font-medium'
                    : 'prism-well text-slate-700 dark:text-slate-200'
                }`}
              >
                {slot}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export const DateTimePicker = /*#__PURE__*/ memoWithDisplayName(DateTimePickerInner, 'DateTimePicker');
