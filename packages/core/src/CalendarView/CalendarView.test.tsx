import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { CalendarView, type CalendarEventItem } from './CalendarView';

const EVENTS: CalendarEventItem[] = [
  {
    id: 'evt-1',
    title: 'UI Kit Freeze',
    dateIso: '2026-11-05',
    timeLabel: '10:00 AM',
    category: 'Release',
  },
  {
    id: 'evt-2',
    title: 'Accessibility Signoff',
    dateIso: '2026-11-20',
    timeLabel: '09:30 AM',
    category: 'Review',
  },
];

describe('CalendarView', () => {
  it('renders month grid, selects dates, submits new milestones, and forwards ref', () => {
    const ref = createRef<HTMLDivElement>();
    const onAddEvent = vi.fn();

    render(
      <CalendarView
        ref={ref}
        events={EVENTS}
        onAddEvent={onAddEvent}
        className="custom-calendar"
        data-testid="calendar"
      />
    );

    const root = screen.getByTestId('calendar');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass('refractor-calendar-view', 'prism-slab', 'custom-calendar');
    expect(screen.getByRole('heading', { name: 'November 2026' })).toBeInTheDocument();
    expect(screen.getByText('2 scheduled')).toBeInTheDocument();
    expect(screen.getByText('Accessibility Signoff (09:30 AM)')).toBeInTheDocument();

    const nov5 = root.querySelector('button[data-date="2026-11-05"]');
    expect(nov5).not.toBeNull();
    fireEvent.click(nov5 as HTMLButtonElement);
    expect(nov5).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('UI Kit Freeze (10:00 AM)')).toBeInTheDocument();

    const nov7 = root.querySelector('button[data-date="2026-11-07"]');
    fireEvent.click(nov7 as HTMLButtonElement);
    expect(screen.getByText('No events scheduled')).toBeInTheDocument();

    const input = screen.getByLabelText('New calendar milestone');
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.submit(input.closest('form') as HTMLFormElement);
    expect(onAddEvent).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: '  Prism Release  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add milestone' }));
    expect(onAddEvent).toHaveBeenCalledWith('2026-11-07', 'Prism Release');
    expect(input).toHaveValue('');
  });

  it('guards Enter during IME composition and supports custom year/month + theme overrides', () => {
    const onAddEvent = vi.fn();
    render(
      <PrismThemeProvider
        theme={{
          components: { CalendarView: { className: 'theme-cal', style: { maxWidth: '640px' } } },
        }}
      >
        <CalendarView
          events={[]}
          year={2026}
          month={0}
          initialSelectedDate="2026-01-15"
          onAddEvent={onAddEvent}
          className="local-cal"
          data-testid="jan-cal"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('jan-cal');
    expect(root).toHaveClass('refractor-calendar-view', 'theme-cal', 'local-cal');
    expect(root).toHaveStyle({ maxWidth: '640px' });
    expect(screen.getByRole('heading', { name: 'January 2026' })).toBeInTheDocument();
    expect(screen.getByText('0 scheduled')).toBeInTheDocument();

    const input = screen.getByLabelText('New calendar milestone');
    const composingEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(composingEvent, 'isComposing', { value: true });
    input.dispatchEvent(composingEvent);
    expect(composingEvent.defaultPrevented).toBe(true);

    const normalEnter = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    input.dispatchEvent(normalEnter);
    expect(normalEnter.defaultPrevented).toBe(false);
  });

  it('omits milestone form when onAddEvent is not provided and handles non-finite year/month (negative test)', () => {
    render(
      <CalendarView
        events={[]}
        year={Number.NaN}
        month={Number.POSITIVE_INFINITY}
        data-testid="readonly-cal"
      />
    );
    expect(screen.queryByLabelText('New calendar milestone')).toBeNull();
    expect(screen.getByRole('heading', { name: 'November 2026' })).toBeInTheDocument();
  });

  it('safely renders adversarial XSS payloads in event title and timeLabel as literal text', () => {
    const payload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';
    render(
      <CalendarView
        events={[{ id: 'xss', title: payload, dateIso: '2026-11-20', timeLabel: payload }]}
      />
    );
    expect(screen.getByText(`${payload} (${payload})`)).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
  });
});
