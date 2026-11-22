import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  ClockCalendarPopover,
  type ClockAgendaItem,
  type WorldClockZoneSpec,
} from './index';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ClockCalendarPopover', () => {
  it('renders open by default with deterministic UTC clock, 42-day calendar grid, default agenda, world clocks, ref, and theme overrides', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            ClockCalendarPopover: {
              className: 'theme-clock-calendar',
              style: { opacity: '0.97' },
            },
          },
        }}
      >
        <ClockCalendarPopover
          ref={ref}
          className="local-clock-shell"
          xstyle={{ '--prism-blur-px': '20px' }}
          data-testid="clock-root"
        />
      </PrismThemeProvider>
    );

    expect(ClockCalendarPopover.displayName).toBe('ClockCalendarPopover');

    const root = screen.getByTestId('clock-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveAttribute('role', 'region');
    expect(root).toHaveAttribute('data-open', 'true');
    expect(root).toHaveAttribute('data-selected-date', '2026-11-22');
    expect(root).not.toHaveAttribute('data-disabled');
    expect(root).not.toHaveAttribute('aria-disabled');
    expect(root).toHaveClass(
      'refractor-clock-calendar-popover',
      'prism-slab',
      'theme-clock-calendar',
      'local-clock-shell'
    );
    expect(root).toHaveStyle({ opacity: '0.97' });

    const header = root.querySelector('[data-part="header"]');
    expect(header).toHaveClass('flex-wrap', 'min-w-0');

    const trigger = screen.getByTestId('clock-calendar-trigger');
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(trigger).toHaveClass('prism-focus-ring');
    expect(screen.getByTestId('clock-calendar-trigger-date')).toHaveTextContent(
      'Sun, Nov 22'
    );
    expect(screen.getByTestId('clock-calendar-trigger-time')).toHaveTextContent(
      '18:30 UTC'
    );

    const popover = screen.getByRole('dialog', {
      name: 'Calendar, agenda, and world clocks',
    });
    expect(trigger).toHaveAttribute('aria-controls', popover.id);
    expect(popover).toHaveClass('grid-cols-1', 'md:grid-cols-[1.15fr_0.95fr]');

    // Monthly calendar grid: 42 deterministic UTC day cells for November 2026
    expect(screen.getByTestId('clock-calendar-month-heading')).toHaveTextContent(
      'November 2026'
    );
    const grid = screen.getByTestId('clock-calendar-grid');
    const dayButtons = grid.querySelectorAll('button');
    expect(dayButtons).toHaveLength(42);

    const nov22 = screen.getByTestId('clock-calendar-day-2026-11-22');
    expect(nov22).toHaveAttribute('aria-pressed', 'true');
    expect(nov22).toHaveAttribute('aria-current', 'date');
    expect(nov22).toHaveAttribute('data-in-month', 'true');
    expect(nov22).toHaveAttribute('data-today', 'true');
    expect(nov22).toHaveAttribute('data-has-events', 'true');
    expect(screen.getByTestId('clock-calendar-dot-2026-11-22')).toBeInTheDocument();

    const nov23 = screen.getByTestId('clock-calendar-day-2026-11-23');
    expect(nov23).toHaveAttribute('aria-pressed', 'false');
    expect(nov23).toHaveAttribute('data-has-events', 'true');
    expect(screen.getByTestId('clock-calendar-dot-2026-11-23')).toBeInTheDocument();

    // Out-of-month trailing December cell is muted
    const dec01 = screen.getByTestId('clock-calendar-day-2026-12-01');
    expect(dec01).toHaveAttribute('data-in-month', 'false');
    expect(dec01).toHaveClass('opacity-45');

    // Default agenda items for 2026-11-22 (3 items)
    expect(screen.getByTestId('clock-calendar-agenda-date')).toHaveTextContent(
      '2026-11-22'
    );
    expect(screen.getByTestId('clock-calendar-agenda-count')).toHaveTextContent(
      '3 events'
    );
    expect(
      screen.getByText('Optical Glass Design System Sync')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Accessibility & Contrast Verification')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Release Candidate Telemetry Review')
    ).toBeInTheDocument();

    // Default 3 world clocks computed purely in UTC
    expect(
      screen.getByTestId('clock-calendar-zone-time-san-francisco')
    ).toHaveTextContent('10:30');
    expect(
      screen.getByTestId('clock-calendar-zone-delta-san-francisco')
    ).toHaveTextContent('Today');
    expect(
      screen.getByTestId('clock-calendar-zone-offset-san-francisco')
    ).toHaveTextContent('UTC-08:00');

    expect(
      screen.getByTestId('clock-calendar-zone-time-london')
    ).toHaveTextContent('18:30');
    expect(
      screen.getByTestId('clock-calendar-zone-delta-london')
    ).toHaveTextContent('Today');
    expect(
      screen.getByTestId('clock-calendar-zone-offset-london')
    ).toHaveTextContent('UTC+00:00');

    expect(
      screen.getByTestId('clock-calendar-zone-time-tokyo')
    ).toHaveTextContent('03:30');
    expect(
      screen.getByTestId('clock-calendar-zone-delta-tokyo')
    ).toHaveTextContent('+1d');
    expect(
      screen.getByTestId('clock-calendar-zone-offset-tokyo')
    ).toHaveTextContent('UTC+09:00');
  });

  it('toggles open and closed via trigger, supports IME-safe Escape dismissal with focus restoration, and cleans up listeners', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const onOpenChange = vi.fn<(open: boolean) => void>();

    const { unmount } = render(
      <ClockCalendarPopover defaultOpen={false} onOpenChange={onOpenChange} />
    );

    const countKeydown = (spy: typeof addSpy) =>
      spy.mock.calls.filter(([type]) => type === 'keydown').length;

    const trigger = screen.getByTestId('clock-calendar-trigger');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).not.toHaveAttribute('aria-controls');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(countKeydown(addSpy)).toBe(0);

    // Click opens popover and attaches Escape listener
    fireEvent.click(trigger);
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByTestId('clock-calendar-live')).toHaveTextContent(
      'Clock and calendar popover opened.'
    );
    expect(countKeydown(addSpy)).toBe(1);

    // Clicking trigger again closes popover and removes listener
    fireEvent.click(trigger);
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByTestId('clock-calendar-live')).toHaveTextContent(
      'Clock and calendar popover closed.'
    );
    expect(countKeydown(removeSpy)).toBe(1);

    // Reopen and focus a day inside the dialog
    fireEvent.click(trigger);
    expect(countKeydown(addSpy)).toBe(2);
    const nov22 = screen.getByTestId('clock-calendar-day-2026-11-22');
    act(() => {
      nov22.focus();
    });
    expect(document.activeElement).toBe(nov22);

    // Non-Escape key on window is ignored
    fireEvent.keyDown(window, { key: 'a' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // IME composing Escape MUST be ignored
    const composingEscape = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(composingEscape, 'isComposing', { value: true });
    window.dispatchEvent(composingEscape);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Real Escape dismisses popover and restores focus to trigger
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(countKeydown(removeSpy)).toBe(2);

    // Open and unmount -> listener cleanly torn down
    fireEvent.click(trigger);
    expect(countKeydown(addSpy)).toBe(3);
    unmount();
    expect(countKeydown(removeSpy)).toBe(3);
  });

  it('navigates Previous/Next months across Dec->Jan and Jan->Dec year boundaries and resets via Today button', () => {
    const onSelectDate = vi.fn<(dateIso: string) => void>();

    render(
      <ClockCalendarPopover
        referenceUtcIso="2026-11-22T18:30:00Z"
        onSelectDate={onSelectDate}
      />
    );

    const prevBtn = screen.getByRole('button', { name: 'Previous Month' });
    const nextBtn = screen.getByRole('button', { name: 'Next Month' });
    const todayBtn = screen.getByRole('button', { name: 'Today' });
    const heading = screen.getByTestId('clock-calendar-month-heading');
    const live = screen.getByTestId('clock-calendar-live');

    // Nov 2026 -> Dec 2026 -> Jan 2027 (Dec->Jan year rollover)
    fireEvent.click(nextBtn);
    expect(heading).toHaveTextContent('December 2026');
    expect(live).toHaveTextContent('Viewing December 2026');

    fireEvent.click(nextBtn);
    expect(heading).toHaveTextContent('January 2027');
    expect(live).toHaveTextContent('Viewing January 2027');

    // Jan 2027 -> Dec 2026 (Jan->Dec backward year rollover)
    fireEvent.click(prevBtn);
    expect(heading).toHaveTextContent('December 2026');
    expect(live).toHaveTextContent('Viewing December 2026');

    // Select a day in December 2026
    fireEvent.click(screen.getByTestId('clock-calendar-day-2026-12-15'));
    expect(onSelectDate).toHaveBeenLastCalledWith('2026-12-15');
    expect(screen.getByTestId('clock-calendar-agenda-date')).toHaveTextContent(
      '2026-12-15'
    );

    // Previous Month back to Nov 2026 -> Oct 2026
    fireEvent.click(prevBtn);
    expect(heading).toHaveTextContent('November 2026');
    fireEvent.click(prevBtn);
    expect(heading).toHaveTextContent('October 2026');

    // Today jump returns view to November 2026 and selects 2026-11-22
    fireEvent.click(todayBtn);
    expect(heading).toHaveTextContent('November 2026');
    expect(onSelectDate).toHaveBeenLastCalledWith('2026-11-22');
    expect(
      screen.getByTestId('clock-calendar-day-2026-11-22')
    ).toHaveAttribute('aria-pressed', 'true');
    expect(live).toHaveTextContent('Jumped to today, November 22, 2026');
  });

  it('updates Agenda list on day selection including empty-agenda status, out-of-month jumps, and omitted agenda tone fallback', () => {
    const customAgenda: ReadonlyArray<ClockAgendaItem> = [
      {
        id: 'ev-default-tone',
        dateIso: '2026-11-25',
        timeLabel: '11:00',
        title: 'Untoned Standby Check',
      },
      {
        id: 'ev-nov23',
        dateIso: '2026-11-23',
        timeLabel: '10:00',
        title: 'Global Edge Deployment Readiness',
        tone: 'amber',
      },
    ];

    render(<ClockCalendarPopover agendaItems={customAgenda} />);

    // Default date 2026-11-22 has no custom items -> clean role="status" empty state
    const emptyStatus = screen.getByRole('status');
    expect(emptyStatus).toHaveTextContent('No events scheduled for 2026-11-22');
    expect(screen.getByTestId('clock-calendar-agenda-count')).toHaveTextContent(
      '0 events'
    );

    // Click 2026-11-23 -> shows singular event & today cell retains non-selected today styling
    fireEvent.click(screen.getByTestId('clock-calendar-day-2026-11-23'));
    expect(screen.getByTestId('clock-calendar-agenda-count')).toHaveTextContent(
      '1 event'
    );
    expect(
      screen.getByText('Global Edge Deployment Readiness')
    ).toBeInTheDocument();
    expect(screen.getByTestId('clock-calendar-live')).toHaveTextContent(
      'Selected November 23, 2026, 1 event scheduled'
    );
    expect(
      screen.getByTestId('clock-calendar-day-2026-11-22').style.boxShadow
    ).toContain('var(--prism-secondary-main)');

    // Click 2026-11-25 -> renders item with default primary tone fallback
    fireEvent.click(screen.getByTestId('clock-calendar-day-2026-11-25'));
    expect(screen.getByText('Untoned Standby Check')).toBeInTheDocument();
    const dot25 = screen.getByTestId('clock-calendar-dot-2026-11-25');
    expect(dot25.style.backgroundColor).toBe('var(--prism-primary-contrast)');

    // Click empty date 2026-11-24 -> updates status message and live region
    fireEvent.click(screen.getByTestId('clock-calendar-day-2026-11-24'));
    expect(screen.getByRole('status')).toHaveTextContent(
      'No events scheduled for 2026-11-24'
    );
    expect(screen.getByTestId('clock-calendar-live')).toHaveTextContent(
      'Selected November 24, 2026, no events scheduled'
    );

    // Clicking out-of-month trailing cell (2026-12-02) switches calendar view to December 2026
    fireEvent.click(screen.getByTestId('clock-calendar-day-2026-12-02'));
    expect(screen.getByTestId('clock-calendar-month-heading')).toHaveTextContent(
      'December 2026'
    );
    expect(screen.getByTestId('clock-calendar-agenda-date')).toHaveTextContent(
      '2026-12-02'
    );
  });

  it('supports IME-safe Arrow key date navigation across days, weeks, and month boundaries with focus transfer', () => {
    const onSelectDate = vi.fn<(dateIso: string) => void>();

    render(<ClockCalendarPopover onSelectDate={onSelectDate} />);

    const nov22 = screen.getByTestId('clock-calendar-day-2026-11-22');
    act(() => {
      nov22.focus();
    });

    // Composing ArrowRight MUST be ignored
    const composingRight = new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(composingRight, 'isComposing', { value: true });
    fireEvent(nov22, composingRight);
    expect(onSelectDate).not.toHaveBeenCalled();
    expect(nov22).toHaveAttribute('aria-pressed', 'true');

    // Non-arrow key is ignored
    fireEvent.keyDown(nov22, { key: 'a' });
    expect(onSelectDate).not.toHaveBeenCalled();

    // ArrowRight: 2026-11-22 -> 2026-11-23
    fireEvent.keyDown(nov22, { key: 'ArrowRight' });
    expect(onSelectDate).toHaveBeenLastCalledWith('2026-11-23');
    const nov23 = screen.getByTestId('clock-calendar-day-2026-11-23');
    expect(nov23).toHaveAttribute('aria-pressed', 'true');
    expect(document.activeElement).toBe(nov23);

    // ArrowDown: 2026-11-23 -> 2026-11-30 (+7 days)
    fireEvent.keyDown(nov23, { key: 'ArrowDown' });
    expect(onSelectDate).toHaveBeenLastCalledWith('2026-11-30');
    const nov30 = screen.getByTestId('clock-calendar-day-2026-11-30');
    expect(document.activeElement).toBe(nov30);

    // ArrowRight across month boundary: 2026-11-30 -> 2026-12-01 (switches to December 2026)
    fireEvent.keyDown(nov30, { key: 'ArrowRight' });
    expect(onSelectDate).toHaveBeenLastCalledWith('2026-12-01');
    expect(screen.getByTestId('clock-calendar-month-heading')).toHaveTextContent(
      'December 2026'
    );
    const dec01 = screen.getByTestId('clock-calendar-day-2026-12-01');
    expect(dec01).toHaveAttribute('aria-pressed', 'true');
    expect(document.activeElement).toBe(dec01);

    // ArrowLeft back into November: 2026-12-01 -> 2026-11-30
    fireEvent.keyDown(dec01, { key: 'ArrowLeft' });
    expect(onSelectDate).toHaveBeenLastCalledWith('2026-11-30');
    expect(screen.getByTestId('clock-calendar-month-heading')).toHaveTextContent(
      'November 2026'
    );
    const nov30Again = screen.getByTestId('clock-calendar-day-2026-11-30');
    expect(document.activeElement).toBe(nov30Again);

    // ArrowUp: 2026-11-30 -> 2026-11-23 (-7 days)
    fireEvent.keyDown(nov30Again, { key: 'ArrowUp' });
    expect(onSelectDate).toHaveBeenLastCalledWith('2026-11-23');
    const nov23Final = screen.getByTestId('clock-calendar-day-2026-11-23');
    expect(document.activeElement).toBe(nov23Final);

    // ArrowLeft back onto multi-event day 2026-11-22 announces plural events scheduled
    fireEvent.keyDown(nov23Final, { key: 'ArrowLeft' });
    expect(onSelectDate).toHaveBeenLastCalledWith('2026-11-22');
    expect(screen.getByTestId('clock-calendar-live')).toHaveTextContent(
      'Selected November 22, 2026, 3 events scheduled'
    );
  });

  it('computes world clock offsets accurately including -1d, +1d, fractional offsets, NaN/Infinity sanitization, and empty state', () => {
    const zones: ReadonlyArray<WorldClockZoneSpec> = [
      { id: 'sf', city: 'San Francisco', abbr: 'PST', utcOffsetMinutes: -480 },
      { id: 'st-johns', city: 'St. Johns', abbr: 'NST', utcOffsetMinutes: -210 },
      { id: 'kolkata', city: 'Kolkata', abbr: 'IST', utcOffsetMinutes: 330 },
      { id: 'kiritimati', city: 'Kiritimati', abbr: 'LINT', utcOffsetMinutes: 840 },
      { id: 'nan-zone', city: 'Broken NaN', abbr: 'ERR', utcOffsetMinutes: Number.NaN },
      {
        id: 'inf-zone',
        city: 'Broken Inf',
        abbr: 'INF',
        utcOffsetMinutes: Number.POSITIVE_INFINITY,
      },
    ];

    // At 02:15 UTC:
    // -480 (-8h) => 18:15 previous day (-1d)
    // -210 (-3h30m) => 22:45 previous day (-1d)
    // +330 (+5h30m) => 07:45 Today
    // +840 (+14h) => 16:15 Today
    const { rerender } = render(
      <ClockCalendarPopover
        referenceUtcIso="2026-11-22T02:15:00Z"
        worldClocks={zones}
      />
    );

    expect(screen.getByTestId('clock-calendar-trigger-time')).toHaveTextContent(
      '02:15 UTC'
    );

    expect(screen.getByTestId('clock-calendar-zone-time-sf')).toHaveTextContent(
      '18:15'
    );
    expect(screen.getByTestId('clock-calendar-zone-delta-sf')).toHaveTextContent(
      '-1d'
    );
    expect(screen.getByTestId('clock-calendar-zone-offset-sf')).toHaveTextContent(
      'UTC-08:00'
    );

    expect(
      screen.getByTestId('clock-calendar-zone-time-st-johns')
    ).toHaveTextContent('22:45');
    expect(
      screen.getByTestId('clock-calendar-zone-delta-st-johns')
    ).toHaveTextContent('-1d');
    expect(
      screen.getByTestId('clock-calendar-zone-offset-st-johns')
    ).toHaveTextContent('UTC-03:30');

    expect(
      screen.getByTestId('clock-calendar-zone-time-kolkata')
    ).toHaveTextContent('07:45');
    expect(
      screen.getByTestId('clock-calendar-zone-delta-kolkata')
    ).toHaveTextContent('Today');
    expect(
      screen.getByTestId('clock-calendar-zone-offset-kolkata')
    ).toHaveTextContent('UTC+05:30');

    // NaN and Infinity offsets safely sanitize to UTC+00:00 (02:15 Today)
    expect(
      screen.getByTestId('clock-calendar-zone-time-nan-zone')
    ).toHaveTextContent('02:15');
    expect(
      screen.getByTestId('clock-calendar-zone-delta-nan-zone')
    ).toHaveTextContent('Today');
    expect(
      screen.getByTestId('clock-calendar-zone-offset-nan-zone')
    ).toHaveTextContent('UTC+00:00');

    expect(
      screen.getByTestId('clock-calendar-zone-offset-inf-zone')
    ).toHaveTextContent('UTC+00:00');

    // Rerender at 23:00 UTC -> Kiritimati (+14h) rolls over +1d to 13:00
    rerender(
      <ClockCalendarPopover
        referenceUtcIso="2026-11-22T23:00:00Z"
        worldClocks={zones}
      />
    );
    expect(
      screen.getByTestId('clock-calendar-zone-time-kiritimati')
    ).toHaveTextContent('13:00');
    expect(
      screen.getByTestId('clock-calendar-zone-delta-kiritimati')
    ).toHaveTextContent('+1d');
    expect(
      screen.getByTestId('clock-calendar-zone-offset-kiritimati')
    ).toHaveTextContent('UTC+14:00');

    // Empty worldClocks list renders clean fallback message
    rerender(<ClockCalendarPopover worldClocks={[]} />);
    expect(screen.getByTestId('clock-calendar-world-empty')).toHaveTextContent(
      'No world clocks configured'
    );
  });

  it('falls back safely on invalid referenceUtcIso and invalid defaultSelectedDateIso values', () => {
    const { rerender } = render(
      <ClockCalendarPopover
        referenceUtcIso="not-a-valid-date"
        defaultSelectedDateIso="2026-02-31"
      />
    );

    expect(screen.getByTestId('clock-calendar-trigger-date')).toHaveTextContent(
      'Sun, Nov 22'
    );
    expect(screen.getByTestId('clock-calendar-trigger-time')).toHaveTextContent(
      '18:30 UTC'
    );
    expect(screen.getByTestId('clock-calendar-agenda-date')).toHaveTextContent(
      '2026-11-22'
    );

    // Blank whitespace referenceUtcIso and malformed date format also fall back cleanly
    rerender(
      <ClockCalendarPopover
        referenceUtcIso="   "
        selectedDateIso="invalid-iso"
      />
    );
    expect(screen.getByTestId('clock-calendar-trigger-date')).toHaveTextContent(
      'Sun, Nov 22'
    );
    expect(screen.getByTestId('clock-calendar-agenda-date')).toHaveTextContent(
      '2026-11-22'
    );
  });

  it('supports controlled open and selectedDateIso props without mutating internal state until parent updates', () => {
    const onOpenChange = vi.fn<(open: boolean) => void>();
    const onSelectDate = vi.fn<(dateIso: string) => void>();

    const { rerender } = render(
      <ClockCalendarPopover
        open={false}
        selectedDateIso="2026-11-22"
        onOpenChange={onOpenChange}
        onSelectDate={onSelectDate}
      />
    );

    const trigger = screen.getByTestId('clock-calendar-trigger');
    expect(screen.queryByRole('dialog')).toBeNull();

    // Clicking trigger notifies parent without opening while open=false
    fireEvent.click(trigger);
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(screen.queryByRole('dialog')).toBeNull();

    // Parent opens popover
    rerender(
      <ClockCalendarPopover
        open
        selectedDateIso="2026-11-22"
        onOpenChange={onOpenChange}
        onSelectDate={onSelectDate}
      />
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(
      screen.getByTestId('clock-calendar-day-2026-11-22')
    ).toHaveAttribute('aria-pressed', 'true');

    // Clicking 2026-11-23 notifies parent without changing selection until parent commits
    fireEvent.click(screen.getByTestId('clock-calendar-day-2026-11-23'));
    expect(onSelectDate).toHaveBeenCalledWith('2026-11-23');
    expect(
      screen.getByTestId('clock-calendar-day-2026-11-22')
    ).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('clock-calendar-agenda-date')).toHaveTextContent(
      '2026-11-22'
    );

    // Parent updates selectedDateIso to a date in another year/month -> calendar view syncs
    rerender(
      <ClockCalendarPopover
        open
        selectedDateIso="2027-02-10"
        onOpenChange={onOpenChange}
        onSelectDate={onSelectDate}
      />
    );
    expect(screen.getByTestId('clock-calendar-month-heading')).toHaveTextContent(
      'February 2027'
    );
    expect(
      screen.getByTestId('clock-calendar-day-2027-02-10')
    ).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('clock-calendar-agenda-date')).toHaveTextContent(
      '2027-02-10'
    );
  });

  it('suppresses opening and disables trigger interactions when disabled', () => {
    const onOpenChange = vi.fn<(open: boolean) => void>();

    const { rerender } = render(
      <ClockCalendarPopover
        disabled
        defaultOpen
        onOpenChange={onOpenChange}
        data-testid="disabled-clock"
      />
    );

    const root = screen.getByTestId('disabled-clock');
    const trigger = screen.getByTestId('clock-calendar-trigger');

    expect(root).toHaveAttribute('data-disabled', 'true');
    expect(root).toHaveAttribute('aria-disabled', 'true');
    expect(trigger).toBeDisabled();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(trigger);
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();

    // Enabling reveals popover; disabling again immediately closes it
    rerender(
      <ClockCalendarPopover
        disabled={false}
        defaultOpen
        onOpenChange={onOpenChange}
        data-testid="disabled-clock"
      />
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    rerender(
      <ClockCalendarPopover
        disabled
        defaultOpen
        onOpenChange={onOpenChange}
        data-testid="disabled-clock"
      />
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('escapes adversarial XSS titles and world clock labels safely and isolates prototype-like dateIso keys', () => {
    const xssTitle =
      '<script>window.__clockXss=1</script><img src=x onerror=alert(1)>';
    const xssCity = '<svg onload=alert(2)>Tokyo</svg>';

    render(
      <ClockCalendarPopover
        agendaItems={[
          {
            id: 'xss-item',
            dateIso: '2026-11-22',
            timeLabel: '<b>12:00</b>',
            title: xssTitle,
            tone: 'info',
          },
          {
            id: 'proto-item',
            dateIso: '__proto__',
            timeLabel: '00:00',
            title: 'Prototype Guard Entry',
            tone: 'emerald',
          },
        ]}
        worldClocks={[
          {
            id: 'xss-zone',
            city: xssCity,
            abbr: '<script>Z</script>',
            utcOffsetMinutes: 540,
          },
        ]}
      />
    );

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByText(xssTitle)).toBeInTheDocument();
    expect(screen.getByText('<b>12:00</b>')).toBeInTheDocument();
    expect(screen.getByText(xssCity)).toBeInTheDocument();
    expect(screen.getByText('<script>Z</script>')).toBeInTheDocument();
    expect(screen.queryByText('Prototype Guard Entry')).toBeNull();
  });
});
