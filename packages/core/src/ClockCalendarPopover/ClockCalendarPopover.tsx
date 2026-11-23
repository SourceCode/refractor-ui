'use client';

import {
  memo,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Globe,
} from 'lucide-react';
import type { BaseProps, OpticalStyleTokens } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { STYLE_BORDER_DIVIDER, STYLE_PRIMARY_MAIN, STYLE_SECONDARY_MAIN, STYLE_TEXT_DISABLED, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export interface WorldClockZoneSpec {
  id: string;
  city: string;
  abbr: string;
  utcOffsetMinutes: number;
}

export interface ClockAgendaItem {
  id: string;
  dateIso: string;
  timeLabel: string;
  title: string;
  tone?: 'primary' | 'info' | 'emerald' | 'amber';
}

type ClockCalendarPopoverBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface ClockCalendarPopoverProps extends ClockCalendarPopoverBaseProps {
  /** Deterministic UTC reference timestamp in ISO 8601 format (defaults to `'2026-11-22T18:30:00Z'`). */
  referenceUtcIso?: string;
  /** World clock timezone entries rendered with UTC-offset arithmetic (defaults to San Francisco, London, Tokyo). */
  worldClocks?: ReadonlyArray<WorldClockZoneSpec>;
  /** Scheduled agenda items matched by ISO date (`YYYY-MM-DD`). */
  agendaItems?: ReadonlyArray<ClockAgendaItem>;
  /** Controlled open state of the calendar and world-clock popover. */
  open?: boolean;
  /** Initial uncontrolled open state of the popover (defaults to `true`). */
  defaultOpen?: boolean;
  /** Controlled selected ISO date (`YYYY-MM-DD`). */
  selectedDateIso?: string;
  /** Initial uncontrolled selected ISO date (`YYYY-MM-DD`); defaults to the UTC date of `referenceUtcIso`. */
  defaultSelectedDateIso?: string;
  /** Callback invoked whenever the popover opens or closes. */
  onOpenChange?: (open: boolean) => void;
  /** Callback invoked whenever a calendar date is selected. */
  onSelectDate?: (dateIso: string) => void;
  /** Disables the system clock trigger and suppresses opening the popover (defaults to `false`). */
  disabled?: boolean;
}

interface UtcDateParts {
  year: number;
  month: number;
  day: number;
  iso: string;
}

interface MonthView {
  year: number;
  month: number;
}

interface CalendarDayCell {
  dateIso: string;
  year: number;
  month: number;
  dayOfMonth: number;
  inCurrentMonth: boolean;
}

interface WorldClockReadout {
  timeLabel: string;
  dayDeltaLabel: string;
  offsetPill: string;
}

const DEFAULT_REFERENCE_UTC_ISO = '2026-11-22T18:30:00Z';
const DEFAULT_REFERENCE_UTC_MS = Date.parse(DEFAULT_REFERENCE_UTC_ISO);
const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 86_400_000;
const MIN_UTC_OFFSET_MINUTES = -840;
const MAX_UTC_OFFSET_MINUTES = 840;

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

const SHORT_MONTH_NAMES = [
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
] as const;

const SHORT_WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const GRID_WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const;

const DEFAULT_WORLD_CLOCKS: ReadonlyArray<WorldClockZoneSpec> = [
  { id: 'san-francisco', city: 'San Francisco', abbr: 'PST', utcOffsetMinutes: -480 },
  { id: 'london', city: 'London', abbr: 'GMT', utcOffsetMinutes: 0 },
  { id: 'tokyo', city: 'Tokyo', abbr: 'JST', utcOffsetMinutes: 540 },
];

const DEFAULT_AGENDA_ITEMS: ReadonlyArray<ClockAgendaItem> = [
  {
    id: 'agenda-design-sync',
    dateIso: '2026-11-22',
    timeLabel: '09:30',
    title: 'Optical Glass Design System Sync',
    tone: 'primary',
  },
  {
    id: 'agenda-a11y-audit',
    dateIso: '2026-11-22',
    timeLabel: '14:00',
    title: 'Accessibility & Contrast Verification',
    tone: 'emerald',
  },
  {
    id: 'agenda-telemetry-review',
    dateIso: '2026-11-22',
    timeLabel: '17:15',
    title: 'Release Candidate Telemetry Review',
    tone: 'info',
  },
  {
    id: 'agenda-edge-rollout',
    dateIso: '2026-11-23',
    timeLabel: '10:00',
    title: 'Global Edge Deployment Readiness',
    tone: 'amber',
  },
];

function pad2(value: number): string {
  return String(Math.trunc(value)).padStart(2, '0');
}

function parseReferenceUtcMs(iso: string | undefined): number {
  const trimmed = iso?.trim();
  if (!trimmed) {
    return DEFAULT_REFERENCE_UTC_MS;
  }
  const parsed = Date.parse(trimmed);
  return Number.isFinite(parsed) ? parsed : DEFAULT_REFERENCE_UTC_MS;
}

function formatDateParts(
  year: number,
  monthZeroIndexed: number,
  day: number
): UtcDateParts {
  const normalized = new Date(Date.UTC(year, monthZeroIndexed, day));
  const y = normalized.getUTCFullYear();
  const m = normalized.getUTCMonth();
  const d = normalized.getUTCDate();
  return {
    year: y,
    month: m,
    day: d,
    iso: `${String(y).padStart(4, '0')}-${pad2(m + 1)}-${pad2(d)}`,
  };
}

function parseDateIsoUtc(dateIso: string | undefined): UtcDateParts | null {
  if (!dateIso) {
    return null;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateIso.trim());
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const parts = formatDateParts(year, month, day);
  if (parts.year !== year || parts.month !== month || parts.day !== day) {
    return null;
  }
  return parts;
}

function formatFullDateUtc(parts: UtcDateParts): string {
  return `${MONTH_NAMES[parts.month]} ${parts.day}, ${parts.year}`;
}

function buildUtcMonthGrid42(
  year: number,
  monthZeroIndexed: number
): CalendarDayCell[] {
  const firstDay = new Date(Date.UTC(year, monthZeroIndexed, 1));
  const startWeekday = firstDay.getUTCDay();
  const cells: CalendarDayCell[] = [];

  for (let index = 0; index < 42; index += 1) {
    const dayOffset = index - startWeekday + 1;
    const cellDate = new Date(Date.UTC(year, monthZeroIndexed, dayOffset));
    const y = cellDate.getUTCFullYear();
    const m = cellDate.getUTCMonth();
    const d = cellDate.getUTCDate();
    cells.push({
      dateIso: `${String(y).padStart(4, '0')}-${pad2(m + 1)}-${pad2(d)}`,
      year: y,
      month: m,
      dayOfMonth: d,
      inCurrentMonth: y === year && m === monthZeroIndexed,
    });
  }

  return cells;
}

function sanitizeOffsetMinutes(offsetMinutes: number): number {
  if (!Number.isFinite(offsetMinutes)) {
    return 0;
  }
  return Math.max(
    MIN_UTC_OFFSET_MINUTES,
    Math.min(MAX_UTC_OFFSET_MINUTES, Math.trunc(offsetMinutes))
  );
}

function formatUtcOffsetPill(safeOffsetMinutes: number): string {
  const sign = safeOffsetMinutes < 0 ? '-' : '+';
  const absMinutes = Math.abs(safeOffsetMinutes);
  const hours = Math.floor(absMinutes / 60);
  const minutes = absMinutes % 60;
  return `UTC${sign}${pad2(hours)}:${pad2(minutes)}`;
}

function computeWorldClockReadout(
  referenceUtcMs: number,
  utcOffsetMinutes: number
): WorldClockReadout {
  const safeOffset = sanitizeOffsetMinutes(utcOffsetMinutes);
  const refDate = new Date(referenceUtcMs);
  const refDayStartMs = Date.UTC(
    refDate.getUTCFullYear(),
    refDate.getUTCMonth(),
    refDate.getUTCDate()
  );

  const shiftedDate = new Date(referenceUtcMs + safeOffset * MS_PER_MINUTE);
  const shiftedDayStartMs = Date.UTC(
    shiftedDate.getUTCFullYear(),
    shiftedDate.getUTCMonth(),
    shiftedDate.getUTCDate()
  );

  const dayDiff = Math.round((shiftedDayStartMs - refDayStartMs) / MS_PER_DAY);
  const dayDeltaLabel =
    dayDiff === 0 ? 'Today' : dayDiff > 0 ? `+${dayDiff}d` : `${dayDiff}d`;

  const timeLabel = `${pad2(shiftedDate.getUTCHours())}:${pad2(shiftedDate.getUTCMinutes())}`;
  const offsetPill = formatUtcOffsetPill(safeOffset);

  return { timeLabel, dayDeltaLabel, offsetPill };
}

function getAgendaToneToken(tone: ClockAgendaItem['tone']): string {
  switch (tone) {
    case 'info':
      return 'var(--prism-info-main)';
    case 'emerald':
      return 'var(--prism-success-main)';
    case 'amber':
      return 'var(--prism-warning-main)';
    default:
      return 'var(--prism-primary-main)';
  }
}

function ClockCalendarPopoverInner({
  referenceUtcIso = DEFAULT_REFERENCE_UTC_ISO,
  worldClocks = DEFAULT_WORLD_CLOCKS,
  agendaItems = DEFAULT_AGENDA_ITEMS,
  open,
  defaultOpen = true,
  selectedDateIso,
  defaultSelectedDateIso,
  onOpenChange,
  onSelectDate,
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: ClockCalendarPopoverProps) {
  const headingId = useId();
  const popoverId = useId();
  const override = useComponentOverride('ClockCalendarPopover');

  const referenceUtcMs = parseReferenceUtcMs(referenceUtcIso);

  const { todayParts, triggerDateLabel, triggerTimeDigits, triggerTimeLabel } =
    useMemo(() => {
      const refDate = new Date(referenceUtcMs);
      const parts = formatDateParts(
        refDate.getUTCFullYear(),
        refDate.getUTCMonth(),
        refDate.getUTCDate()
      );
      const weekday = SHORT_WEEKDAY_NAMES[refDate.getUTCDay()];
      const shortMonth = SHORT_MONTH_NAMES[parts.month];
      const digits = `${pad2(refDate.getUTCHours())}:${pad2(refDate.getUTCMinutes())}`;
      return {
        todayParts: parts,
        triggerDateLabel: `${weekday}, ${shortMonth} ${parts.day}`,
        triggerTimeDigits: digits,
        triggerTimeLabel: `${digits} UTC`,
      };
    }, [referenceUtcMs]);

  const initialSelectedParts =
    parseDateIsoUtc(defaultSelectedDateIso) ?? todayParts;

  const [isOpenState, setIsOpenState] = useControllableState<boolean>({
    value: open,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });

  const [rawSelectedDateIso, setRawSelectedDateIso] =
    useControllableState<string>({
      value: selectedDateIso,
      defaultValue: initialSelectedParts.iso,
      onChange: onSelectDate,
    });

  const activeSelectedParts =
    parseDateIsoUtc(rawSelectedDateIso) ?? todayParts;
  const activeSelectedIso = activeSelectedParts.iso;

  const [viewMonth, setViewMonth] = useState<MonthView>(() => ({
    year: activeSelectedParts.year,
    month: activeSelectedParts.month,
  }));

  const [announcement, setAnnouncement] = useState<string>('');
  const [focusTargetIso, setFocusTargetIso] = useState<string | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const dayButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const isOpen = !disabled && isOpenState;

  // Keep visible month synced when a controlled selectedDateIso prop changes.
  useEffect(() => {
    const parsed = parseDateIsoUtc(selectedDateIso);
    if (parsed) {
      setViewMonth({ year: parsed.year, month: parsed.month });
    }
  }, [selectedDateIso]);

  // Dismiss popover on IME-safe Escape and restore focus to the clock trigger.
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleWindowKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing) {
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsOpenState(false);
        setAnnouncement('Clock and calendar popover closed.');
        triggerRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleWindowKeyDown);
    return () => {
      window.removeEventListener('keydown', handleWindowKeyDown);
    };
  }, [isOpen, setIsOpenState]);

  // Restore focus to the navigated day button after arrow-key date traversal.
  useEffect(() => {
    if (!isOpen || !focusTargetIso) {
      return;
    }
    const targetButton = dayButtonRefs.current.get(focusTargetIso);
    targetButton?.focus();
    setFocusTargetIso(null);
  }, [focusTargetIso, isOpen, viewMonth.month, viewMonth.year]);

  const registerDayButton = useCallback(
    (dateIso: string, node: HTMLButtonElement | null) => {
      if (node) {
        dayButtonRefs.current.set(dateIso, node);
      } else {
        dayButtonRefs.current.delete(dateIso);
      }
    },
    []
  );

  const agendaByDate = useMemo(() => {
    const grouped = new Map<string, ClockAgendaItem[]>();
    for (const item of agendaItems) {
      const key = item.dateIso.trim();
      const existing = grouped.get(key);
      if (existing) {
        existing.push(item);
      } else {
        grouped.set(key, [item]);
      }
    }
    return grouped;
  }, [agendaItems]);

  const calendarCells = useMemo(
    () => buildUtcMonthGrid42(viewMonth.year, viewMonth.month),
    [viewMonth.month, viewMonth.year]
  );

  const monthHeading = `${MONTH_NAMES[viewMonth.month]} ${viewMonth.year}`;
  const selectedAgendaItems = agendaByDate.get(activeSelectedIso) ?? [];

  const handleToggleOpen = useCallback(() => {
    const nextOpen = !isOpen;
    setIsOpenState(nextOpen);
    setAnnouncement(
      nextOpen
        ? 'Clock and calendar popover opened.'
        : 'Clock and calendar popover closed.'
    );
  }, [isOpen, setIsOpenState]);

  const handlePrevMonth = useCallback(() => {
    const nextYear =
      viewMonth.month === 0 ? viewMonth.year - 1 : viewMonth.year;
    const nextMonthIndex = viewMonth.month === 0 ? 11 : viewMonth.month - 1;
    setViewMonth({ year: nextYear, month: nextMonthIndex });
    setAnnouncement(`Viewing ${MONTH_NAMES[nextMonthIndex]} ${nextYear}`);
  }, [viewMonth.month, viewMonth.year]);

  const handleNextMonth = useCallback(() => {
    const nextYear =
      viewMonth.month === 11 ? viewMonth.year + 1 : viewMonth.year;
    const nextMonthIndex = viewMonth.month === 11 ? 0 : viewMonth.month + 1;
    setViewMonth({ year: nextYear, month: nextMonthIndex });
    setAnnouncement(`Viewing ${MONTH_NAMES[nextMonthIndex]} ${nextYear}`);
  }, [viewMonth.month, viewMonth.year]);

  const handleSelectDateParts = useCallback(
    (parts: UtcDateParts, focusNavigatedDay = false) => {
      if (parts.year !== viewMonth.year || parts.month !== viewMonth.month) {
        setViewMonth({ year: parts.year, month: parts.month });
      }
      setRawSelectedDateIso(parts.iso);
      const count = agendaByDate.get(parts.iso)?.length ?? 0;
      const summary =
        count === 0
          ? 'no events scheduled'
          : `${count} ${count === 1 ? 'event' : 'events'} scheduled`;
      setAnnouncement(`Selected ${formatFullDateUtc(parts)}, ${summary}`);
      if (focusNavigatedDay) {
        setFocusTargetIso(parts.iso);
      }
    },
    [agendaByDate, setRawSelectedDateIso, viewMonth.month, viewMonth.year]
  );

  const handleJumpToday = useCallback(() => {
    setViewMonth({ year: todayParts.year, month: todayParts.month });
    setRawSelectedDateIso(todayParts.iso);
    setAnnouncement(`Jumped to today, ${formatFullDateUtc(todayParts)}`);
  }, [setRawSelectedDateIso, todayParts]);

  const handleDayKeyDown = useCallback(
    (
      event: ReactKeyboardEvent<HTMLButtonElement>,
      cell: CalendarDayCell
    ) => {
      if (event.nativeEvent.isComposing) {
        return;
      }

      let deltaDays: number;
      if (event.key === 'ArrowRight') {
        deltaDays = 1;
      } else if (event.key === 'ArrowLeft') {
        deltaDays = -1;
      } else if (event.key === 'ArrowDown') {
        deltaDays = 7;
      } else if (event.key === 'ArrowUp') {
        deltaDays = -7;
      } else {
        return;
      }

      event.preventDefault();
      const nextParts = formatDateParts(
        cell.year,
        cell.month,
        cell.dayOfMonth + deltaDays
      );
      handleSelectDateParts(nextParts, true);
    },
    [handleSelectDateParts]
  );

  const merged = mergeProps({
    themeTarget: themeProps('clock-calendar-popover', {
      open: isOpen,
      disabled,
      selectedDate: activeSelectedIso,
    }),
    baseClassName:
      'prism-slab relative flex flex-col w-full max-w-full min-w-0 select-none',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('clock-calendar-popover', 'header');
  const triggerClass = stableClassName('clock-calendar-popover', 'trigger');
  const popoverClass = stableClassName('clock-calendar-popover', 'popover');
  const calendarClass = stableClassName('clock-calendar-popover', 'calendar');
  const agendaClass = stableClassName('clock-calendar-popover', 'agenda');
  const worldClass = stableClassName('clock-calendar-popover', 'world-clocks');

  return (
    <div
      ref={ref}
      role="region"
      aria-labelledby={headingId}
      aria-disabled={disabled || undefined}
      {...rest}
      {...merged}
    >
      {/* System Clock Anchor Header */}
      <header
        data-part="header"
        className={cx(
          headerClass,
          'prism-crystal relative flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3 min-w-0 max-w-full',
          isOpen ? 'rounded-t-[inherit] border-b' : 'rounded-[inherit]'
        )}
        style={STYLE_BORDER_DIVIDER}
      >
        <span
          aria-hidden="true"
          data-part="sheen"
          className="pointer-events-none absolute inset-x-4 top-0 h-px"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, color-mix(in srgb, var(--prism-primary-contrast) 70%, transparent) 30%, color-mix(in srgb, var(--prism-secondary-light) 55%, transparent) 70%, transparent 100%)',
          }}
        />

        <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
          <span
            aria-hidden="true"
            className="prism-well w-8 h-8 rounded-xl inline-flex items-center justify-center shrink-0"
            style={STYLE_PRIMARY_MAIN}
          >
            <Calendar className="w-4 h-4 shrink-0" aria-hidden="true" />
          </span>

          <div className="flex flex-col min-w-0">
            <h2
              id={headingId}
              className="text-xs sm:text-sm font-semibold tracking-[-0.01em] truncate"
              style={STYLE_TEXT_PRIMARY}
            >
              System Clock &amp; Calendar
            </h2>
            <span
              data-testid="clock-calendar-selected-summary"
              className="text-[11px] font-mono tabular-nums truncate"
              style={STYLE_TEXT_SECONDARY}
            >
              Selected: {activeSelectedIso}
            </span>
          </div>
        </div>

        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-controls={isOpen ? popoverId : undefined}
          data-part="trigger"
          data-testid="clock-calendar-trigger"
          onClick={handleToggleOpen}
          className={cx(
            triggerClass,
            'prism-focus-ring inline-flex flex-wrap items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-medium cursor-pointer disabled:cursor-not-allowed transition-colors shrink-0 max-w-full',
            isOpen ? 'shadow-sm' : 'prism-well',
            disabled ? 'opacity-50' : ''
          )}
          style={
            isOpen
              ? {
                  borderColor: 'var(--prism-primary-main)',
                  backgroundColor:
                    'color-mix(in srgb, var(--prism-primary-main) 14%, transparent)',
                  color: 'var(--prism-text-primary)',
                }
              : {
                  borderColor: 'var(--prism-divider)',
                  color: disabled
                    ? 'var(--prism-text-disabled)'
                    : 'var(--prism-text-primary)',
                }
          }
        >
          <Clock
            aria-hidden="true"
            className="w-3.5 h-3.5 shrink-0"
            style={{
              color: isOpen
                ? 'var(--prism-primary-main)'
                : 'var(--prism-text-secondary)',
            }}
          />
          <span
            data-testid="clock-calendar-trigger-date"
            className="font-semibold whitespace-nowrap"
          >
            {triggerDateLabel}
          </span>
          <span
            aria-hidden="true"
            style={STYLE_TEXT_DISABLED}
          >
            ·
          </span>
          <span
            data-testid="clock-calendar-trigger-time"
            className="font-mono tabular-nums font-semibold whitespace-nowrap"
          >
            {triggerTimeLabel}
          </span>
          <span
            aria-hidden="true"
            style={STYLE_TEXT_SECONDARY}
          >
            {isOpen ? (
              <ChevronUp className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            ) : (
              <ChevronDown
                className="w-3.5 h-3.5 shrink-0"
                aria-hidden="true"
              />
            )}
          </span>
        </button>
      </header>

      {/* Popover Panel */}
      {isOpen ? (
        <div
          id={popoverId}
          role="dialog"
          aria-label="Calendar, agenda, and world clocks"
          data-part="popover"
          data-testid="clock-calendar-popover"
          className={cx(
            popoverClass,
            'grid grid-cols-1 md:grid-cols-[1.15fr_0.95fr] gap-4 p-4 min-w-0 max-w-full'
          )}
        >
          {/* Left Column: Monthly Calendar Grid */}
          <section
            aria-label="Monthly calendar"
            data-part="calendar"
            className={cx(
              calendarClass,
              'prism-well rounded-2xl p-3.5 flex flex-col gap-3 min-w-0 border'
            )}
            style={STYLE_BORDER_DIVIDER}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <button
                  type="button"
                  aria-label="Previous Month"
                  data-testid="clock-calendar-prev-month"
                  onClick={handlePrevMonth}
                  className="prism-crystal prism-focus-ring h-8 w-8 rounded-xl inline-flex items-center justify-center cursor-pointer transition-colors shrink-0"
                  style={STYLE_TEXT_PRIMARY}
                >
                  <ChevronLeft
                    aria-hidden="true"
                    className="w-4 h-4 shrink-0"
                  />
                </button>

                <h3
                  data-testid="clock-calendar-month-heading"
                  className="text-sm font-semibold tracking-[-0.01em] px-1 truncate min-w-0"
                  style={STYLE_TEXT_PRIMARY}
                >
                  {monthHeading}
                </h3>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  data-testid="clock-calendar-today"
                  onClick={handleJumpToday}
                  className="prism-btn-secondary prism-focus-ring h-8 px-3 text-xs font-semibold cursor-pointer"
                >
                  Today
                </button>

                <button
                  type="button"
                  aria-label="Next Month"
                  data-testid="clock-calendar-next-month"
                  onClick={handleNextMonth}
                  className="prism-crystal prism-focus-ring h-8 w-8 rounded-xl inline-flex items-center justify-center cursor-pointer transition-colors shrink-0"
                  style={STYLE_TEXT_PRIMARY}
                >
                  <ChevronRight
                    aria-hidden="true"
                    className="w-4 h-4 shrink-0"
                  />
                </button>
              </div>
            </div>

            <div
              aria-hidden="true"
              className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-wide"
              style={STYLE_TEXT_SECONDARY}
            >
              {GRID_WEEKDAY_LABELS.map((weekday) => (
                <div key={weekday} className="py-1">
                  {weekday}
                </div>
              ))}
            </div>

            <div
              role="group"
              aria-label={`${monthHeading} dates`}
              data-testid="clock-calendar-grid"
              className="grid grid-cols-7 gap-1 min-w-0"
            >
              {calendarCells.map((cell) => {
                const isSelected = cell.dateIso === activeSelectedIso;
                const isToday = cell.dateIso === todayParts.iso;
                const cellEvents = agendaByDate.get(cell.dateIso) ?? [];
                const firstEvent = cellEvents[0];

                const dayLabelParts = [
                  formatFullDateUtc({
                    year: cell.year,
                    month: cell.month,
                    day: cell.dayOfMonth,
                    iso: cell.dateIso,
                  }),
                ];
                if (isToday) {
                  dayLabelParts.push('Today');
                }
                if (cellEvents.length > 0) {
                  dayLabelParts.push(
                    `${cellEvents.length} ${cellEvents.length === 1 ? 'event' : 'events'}`
                  );
                }

                const dayStyle: OpticalStyleTokens = isSelected
                  ? {
                      color: 'var(--prism-primary-contrast)',
                    }
                  : isToday
                    ? {
                        color: 'var(--prism-text-primary)',
                        boxShadow: 'inset 0 0 0 1.5px var(--prism-secondary-main)',
                      }
                    : cell.inCurrentMonth
                      ? {
                          color: 'var(--prism-text-primary)',
                        }
                      : {
                          color: 'var(--prism-text-disabled)',
                        };

                return (
                  <button
                    key={cell.dateIso}
                    ref={(node) => registerDayButton(cell.dateIso, node)}
                    type="button"
                    aria-pressed={isSelected}
                    aria-current={isToday ? 'date' : undefined}
                    aria-label={dayLabelParts.join(', ')}
                    data-date={cell.dateIso}
                    data-in-month={cell.inCurrentMonth ? 'true' : 'false'}
                    data-today={isToday ? 'true' : undefined}
                    data-has-events={cellEvents.length > 0 ? 'true' : undefined}
                    data-testid={`clock-calendar-day-${cell.dateIso}`}
                    onClick={() =>
                      handleSelectDateParts({
                        year: cell.year,
                        month: cell.month,
                        day: cell.dayOfMonth,
                        iso: cell.dateIso,
                      })
                    }
                    onKeyDown={(event) => handleDayKeyDown(event, cell)}
                    className={cx(
                      'prism-focus-ring relative h-9 w-full min-w-0 rounded-xl flex flex-col items-center justify-center gap-0.5 text-xs font-mono tabular-nums cursor-pointer transition-colors',
                      isSelected
                        ? 'prism-btn-primary font-semibold'
                        : isToday
                          ? 'prism-crystal font-semibold'
                          : cell.inCurrentMonth
                            ? 'prism-crystal font-medium'
                            : 'opacity-45 font-normal'
                    )}
                    style={dayStyle}
                  >
                    <span className="leading-none relative z-10">
                      {cell.dayOfMonth}
                    </span>
                    {firstEvent ? (
                      <span
                        aria-hidden="true"
                        data-part="event-dot"
                        data-testid={`clock-calendar-dot-${cell.dateIso}`}
                        className="w-1.5 h-1.5 rounded-full relative z-10"
                        style={{
                          backgroundColor: isSelected
                            ? 'var(--prism-primary-contrast)'
                            : getAgendaToneToken(firstEvent.tone),
                        }}
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Right Column: Selected Day Agenda & World Time Readouts */}
          <div className="flex flex-col gap-3.5 min-w-0">
            {/* Selected Day Agenda */}
            <section
              aria-label="Selected day agenda"
              data-part="agenda"
              className={cx(
                agendaClass,
                'prism-well rounded-2xl p-3.5 flex flex-col gap-2.5 min-w-0 border'
              )}
              style={STYLE_BORDER_DIVIDER}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <h3
                    className="text-xs font-semibold uppercase tracking-wider"
                    style={STYLE_TEXT_SECONDARY}
                  >
                    Agenda
                  </h3>
                  <span
                    data-testid="clock-calendar-agenda-date"
                    className="prism-crystal px-2 py-0.5 rounded-full text-[11px] font-mono tabular-nums font-semibold"
                    style={STYLE_TEXT_PRIMARY}
                  >
                    {activeSelectedIso}
                  </span>
                </div>

                <span
                  data-testid="clock-calendar-agenda-count"
                  className="text-[11px] font-mono tabular-nums shrink-0"
                  style={STYLE_TEXT_SECONDARY}
                >
                  {selectedAgendaItems.length}{' '}
                  {selectedAgendaItems.length === 1 ? 'event' : 'events'}
                </span>
              </div>

              {selectedAgendaItems.length === 0 ? (
                <div
                  role="status"
                  data-part="agenda-empty"
                  data-testid="clock-calendar-agenda-empty"
                  className="rounded-xl px-3 py-4 text-center text-xs border border-dashed"
                  style={{
                    color: 'var(--prism-text-secondary)',
                    borderColor: 'var(--prism-divider)',
                  }}
                >
                  No events scheduled for {activeSelectedIso}
                </div>
              ) : (
                <ul
                  data-part="agenda-list"
                  data-testid="clock-calendar-agenda-list"
                  className="flex flex-col gap-2 min-w-0"
                >
                  {selectedAgendaItems.map((item) => {
                    const toneColor = getAgendaToneToken(item.tone);
                    return (
                      <li
                        key={item.id}
                        data-testid={`clock-calendar-agenda-item-${item.id}`}
                        className="prism-crystal rounded-xl px-3 py-2 flex items-start gap-2.5 min-w-0 border"
                        style={STYLE_BORDER_DIVIDER}
                      >
                        <span
                          aria-hidden="true"
                          className="w-1 self-stretch rounded-full shrink-0"
                          style={{ backgroundColor: toneColor }}
                        />
                        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                          <span
                            className="text-[11px] font-mono tabular-nums font-semibold"
                            style={{ color: toneColor }}
                          >
                            {item.timeLabel}
                          </span>
                          <span
                            className="text-xs font-medium break-words min-w-0"
                            style={STYLE_TEXT_PRIMARY}
                          >
                            {item.title}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* World Time Readouts */}
            <section
              aria-label="World clocks"
              data-part="world-clocks"
              className={cx(
                worldClass,
                'prism-well rounded-2xl p-3.5 flex flex-col gap-2.5 min-w-0 border'
              )}
              style={STYLE_BORDER_DIVIDER}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Globe
                    aria-hidden="true"
                    className="w-3.5 h-3.5 shrink-0"
                    style={STYLE_SECONDARY_MAIN}
                  />
                  <h3
                    className="text-xs font-semibold uppercase tracking-wider truncate"
                    style={STYLE_TEXT_SECONDARY}
                  >
                    World Clocks
                  </h3>
                </div>

                <span
                  className="text-[11px] font-mono tabular-nums shrink-0"
                  style={STYLE_TEXT_SECONDARY}
                >
                  Ref {triggerTimeDigits} UTC
                </span>
              </div>

              {worldClocks.length === 0 ? (
                <p
                  data-testid="clock-calendar-world-empty"
                  className="rounded-xl px-3 py-3 text-center text-xs border border-dashed"
                  style={{
                    color: 'var(--prism-text-secondary)',
                    borderColor: 'var(--prism-divider)',
                  }}
                >
                  No world clocks configured
                </p>
              ) : (
                <ul
                  data-part="world-clock-list"
                  data-testid="clock-calendar-world-list"
                  className="flex flex-col gap-2 min-w-0"
                >
                  {worldClocks.map((zone) => {
                    const readout = computeWorldClockReadout(
                      referenceUtcMs,
                      zone.utcOffsetMinutes
                    );
                    const isSameDay = readout.dayDeltaLabel === 'Today';

                    return (
                      <li
                        key={zone.id}
                        data-testid={`clock-calendar-zone-${zone.id}`}
                        className="prism-crystal rounded-xl px-3 py-2 flex flex-wrap items-center justify-between gap-2 min-w-0 border"
                        style={STYLE_BORDER_DIVIDER}
                      >
                        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                            <span
                              className="text-xs font-semibold truncate"
                              style={STYLE_TEXT_PRIMARY}
                            >
                              {zone.city}
                            </span>
                            <span
                              className="px-1.5 py-0.5 rounded-md border text-[10px] font-mono font-semibold uppercase shrink-0"
                              style={{
                                color: 'var(--prism-text-secondary)',
                                borderColor: 'var(--prism-divider)',
                                backgroundColor:
                                  'color-mix(in srgb, var(--prism-text-primary) 5%, transparent)',
                              }}
                            >
                              {zone.abbr}
                            </span>
                          </div>
                          <span
                            data-testid={`clock-calendar-zone-delta-${zone.id}`}
                            className="text-[11px] font-mono tabular-nums font-medium"
                            style={{
                              color: isSameDay
                                ? 'var(--prism-text-secondary)'
                                : 'var(--prism-primary-main)',
                            }}
                          >
                            {readout.dayDeltaLabel}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <span
                            data-testid={`clock-calendar-zone-offset-${zone.id}`}
                            className="prism-well px-2 py-0.5 rounded-full text-[10px] font-mono tabular-nums font-medium whitespace-nowrap"
                            style={STYLE_TEXT_SECONDARY}
                          >
                            {readout.offsetPill}
                          </span>
                          <span
                            data-testid={`clock-calendar-zone-time-${zone.id}`}
                            className="text-sm font-mono tabular-nums font-semibold whitespace-nowrap"
                            style={STYLE_TEXT_PRIMARY}
                          >
                            {readout.timeLabel}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        </div>
      ) : null}

      {/* Polite Screen-Reader Announcements */}
      <div
        aria-live="polite"
        aria-atomic="true"
        data-part="live-region"
        data-testid="clock-calendar-live"
        className="sr-only"
      >
        {announcement}
      </div>
    </div>
  );
}

export const ClockCalendarPopover = memo(ClockCalendarPopoverInner);
ClockCalendarPopover.displayName = 'ClockCalendarPopover';
