import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { DateTimePicker } from './DateTimePicker';

describe('DateTimePicker', () => {
  it('opens calendar grid, selects dates and time slots, exposes stable class, and forwards React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();
    const onChangeDate = vi.fn();
    const onChangeTime = vi.fn();

    render(
      <DateTimePicker
        ref={ref}
        dateIso="2026-11-18"
        timeSlot="10:30 AM"
        onChangeDate={onChangeDate}
        onChangeTime={onChangeTime}
        className="custom-dtp"
        data-testid="dtp-root"
      />
    );

    const root = screen.getByTestId('dtp-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass('refractor-date-time-picker', 'w-full', 'custom-dtp');
    expect(root).not.toHaveAttribute('data-open');

    const trigger = screen.getByRole('button');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(trigger);
    expect(root).toHaveAttribute('data-open', 'true');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('dialog', { name: 'November 2026 date and time picker' })).toBeInTheDocument();
    expect(screen.getByText('UTC-8')).toBeInTheDocument();

    const selectedDay = screen.getByRole('button', { name: '2026-11-18' });
    expect(selectedDay).toHaveAttribute('aria-pressed', 'true');
    expect(selectedDay).toHaveClass('prism-btn-primary');

    const nextDay = screen.getByRole('button', { name: '2026-11-22' });
    fireEvent.click(nextDay);
    expect(onChangeDate).toHaveBeenCalledWith('2026-11-22');

    // Out-of-month trailing cell (December 2026)
    const trailingCell = screen.getByRole('button', { name: '2026-12-01' });
    expect(trailingCell).toHaveClass('text-slate-400');

    const slotBtn = screen.getByRole('button', { name: '03:30 PM' });
    fireEvent.click(slotBtn);
    expect(onChangeTime).toHaveBeenCalledWith('03:30 PM');

    const activeSlot = screen.getByRole('button', { name: '10:30 AM' });
    expect(activeSlot).toHaveAttribute('aria-pressed', 'true');
    expect(activeSlot).toHaveClass('prism-emerald');
  });

  it('closes popover on Escape key and forwards caller onKeyDown', () => {
    const onKeyDown = vi.fn();
    render(
      <DateTimePicker
        dateIso="2026-11-10"
        timeSlot="09:00 AM"
        onChangeDate={vi.fn()}
        onChangeTime={vi.fn()}
        onKeyDown={onKeyDown}
        data-testid="dtp-esc"
      />
    );

    const root = screen.getByTestId('dtp-esc');
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(root, { key: 'Tab' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(root, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onKeyDown).toHaveBeenCalledTimes(2);
  });

  it('supports custom month/year, custom slots, and theme overrides without clobbering className', () => {
    render(
      <PrismThemeProvider
        theme={{
          components: { DateTimePicker: { className: 'theme-dtp', style: { maxWidth: '340px' } } },
        }}
      >
        <DateTimePicker
          dateIso="2026-01-15"
          timeSlot="12:00 PM"
          year={2026}
          month={0}
          monthLabel="January 2026"
          timezoneLabel="UTC"
          timeSlots={['12:00 PM', '06:00 PM']}
          className="local-dtp"
          data-testid="custom-month"
          onChangeDate={vi.fn()}
          onChangeTime={vi.fn()}
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('custom-month');
    expect(root).toHaveClass('refractor-date-time-picker', 'theme-dtp', 'local-dtp');
    expect(root).toHaveStyle({ maxWidth: '340px' });

    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('January 2026')).toBeInTheDocument();
    expect(screen.getByText('UTC')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '06:00 PM' })).toBeInTheDocument();
  });

  it('blocks opening when disabled (negative test)', () => {
    render(
      <DateTimePicker
        dateIso="2026-11-18"
        timeSlot="09:00 AM"
        disabled
        data-testid="disabled-dtp"
        onChangeDate={vi.fn()}
        onChangeTime={vi.fn()}
      />
    );

    const root = screen.getByTestId('disabled-dtp');
    expect(root).toHaveAttribute('data-disabled', 'true');
    const trigger = screen.getByRole('button');
    expect(trigger).toBeDisabled();
    fireEvent.click(trigger);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('handles NaN year/month and renders adversarial XSS strings as literal text', () => {
    const payload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';
    render(
      <DateTimePicker
        dateIso={payload}
        timeSlot={payload}
        year={Number.NaN}
        month={Number.NaN}
        monthLabel={payload}
        timezoneLabel={payload}
        timeSlots={[payload]}
        onChangeDate={vi.fn()}
        onChangeTime={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button'));
    expect(screen.getAllByText(payload).length).toBeGreaterThanOrEqual(4);
    expect(document.querySelector('script')).toBeNull();
  });
});
