import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { CombinedDateTimePicker } from './CombinedDateTimePicker';

describe('CombinedDateTimePicker', () => {
  it('renders unified optical slab in 24h mode, forwards React 19 ref, and composes theme overrides', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            CombinedDateTimePicker: {
              className: 'theme-cdtp',
              style: { maxWidth: '640px' },
            },
          },
        }}
      >
        <CombinedDateTimePicker
          ref={ref}
          className="local-cdtp"
          xstyle={{ '--prism-slab-blur-px': '28px' }}
          style={{ marginTop: '10px' }}
          data-testid="cdtp-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('cdtp-root');
    expect(ref.current).toBe(root);
    expect(CombinedDateTimePicker.displayName).toBe('CombinedDateTimePicker');
    expect(root).toHaveClass(
      'refractor-combined-date-time-picker',
      'prism-slab',
      'theme-cdtp',
      'local-cdtp'
    );
    expect(root).toHaveStyle({ maxWidth: '640px', marginTop: '10px' });
    expect(root.style.getPropertyValue('--prism-slab-blur-px')).toBe('28px');
    expect(root).toHaveAttribute('data-clock-format', '24h');
    expect(root).toHaveAttribute('aria-labelledby');

    expect(screen.getByText('Date & Time')).toBeInTheDocument();
    expect(screen.getByTestId('combined-datetime-readout')).toHaveTextContent('2026-11-21 · 09:30');
    expect(screen.getByTestId('combined-datetime-hour')).toHaveTextContent('09');
    expect(screen.getByTestId('combined-datetime-minute')).toHaveTextContent('30');
    expect(screen.getByText('November 2026')).toBeInTheDocument();

    // Selected day highlighted with prism-btn-primary
    const selectedDay = screen.getByRole('button', { name: '2026-11-21' });
    expect(selectedDay).toHaveAttribute('aria-pressed', 'true');
    expect(selectedDay).toHaveClass('prism-btn-primary');

    // AM/PM buttons hidden in 24h mode
    expect(screen.queryByRole('button', { name: 'AM' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'PM' })).toBeNull();
  });

  it('selects calendar days while preserving time, shifts month on out-of-month click, and navigates months via buttons and IME-safe keys', () => {
    const onChange = vi.fn();
    const onKeyDown = vi.fn();

    render(
      <CombinedDateTimePicker
        defaultValue="2026-11-21T14:45"
        onChange={onChange}
        onKeyDown={onKeyDown}
        aria-label="Deployment timestamp"
        data-testid="cdtp-cal"
      />
    );

    const root = screen.getByTestId('cdtp-cal');
    expect(root).toHaveAttribute('aria-label', 'Deployment timestamp');
    expect(root).not.toHaveAttribute('aria-labelledby');

    // Selecting another in-month day preserves 14:45
    fireEvent.click(screen.getByRole('button', { name: '2026-11-12' }));
    expect(onChange).toHaveBeenLastCalledWith('2026-11-12T14:45');
    expect(screen.getByTestId('combined-datetime-readout')).toHaveTextContent('2026-11-12 · 14:45');

    // Clicking an out-of-month trailing cell selects date AND shifts view to December 2026
    fireEvent.click(screen.getByRole('button', { name: '2026-12-02' }));
    expect(onChange).toHaveBeenLastCalledWith('2026-12-02T14:45');
    expect(screen.getByText('December 2026')).toBeInTheDocument();

    // Previous / Next month navigation
    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(screen.getByText('November 2026')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
    expect(screen.getByText('December 2026')).toBeInTheDocument();

    // IME-safe keyboard PageUp / PageDown
    fireEvent.keyDown(root, { key: 'PageUp' });
    expect(screen.getByText('November 2026')).toBeInTheDocument();

    fireEvent.keyDown(root, { key: 'PageDown' });
    expect(screen.getByText('December 2026')).toBeInTheDocument();

    fireEvent.keyDown(root, { key: 'Tab' });
    expect(screen.getByText('December 2026')).toBeInTheDocument();

    const composingEvent = new KeyboardEvent('keydown', { key: 'PageUp', bubbles: true });
    Object.defineProperty(composingEvent, 'isComposing', { value: true });
    fireEvent(root, composingEvent);
    expect(screen.getByText('December 2026')).toBeInTheDocument();
    expect(onKeyDown).toHaveBeenCalledTimes(4);
  });

  it('steps hours and minutes with wraparound, clamps minuteStep (1..30), and applies quick time presets', () => {
    const onChange = vi.fn();

    const { rerender } = render(
      <CombinedDateTimePicker
        defaultValue="2026-11-21T23:55"
        minuteStep={5}
        onChange={onChange}
      />
    );

    // Hour increment wraps 23 -> 00
    fireEvent.click(screen.getByRole('button', { name: 'Increase hour' }));
    expect(onChange).toHaveBeenLastCalledWith('2026-11-21T00:55');

    // Hour decrement wraps 00 -> 23
    fireEvent.click(screen.getByRole('button', { name: 'Decrease hour' }));
    expect(onChange).toHaveBeenLastCalledWith('2026-11-21T23:55');

    // Minute increment wraps 55 -> 00
    fireEvent.click(screen.getByRole('button', { name: 'Increase minute' }));
    expect(onChange).toHaveBeenLastCalledWith('2026-11-21T23:00');

    // Minute decrement wraps 00 -> 55
    fireEvent.click(screen.getByRole('button', { name: 'Decrease minute' }));
    expect(onChange).toHaveBeenLastCalledWith('2026-11-21T23:55');

    // Quick time presets preserve date and activate emerald highlight
    const preset12 = screen.getByRole('button', { name: '12:00' });
    fireEvent.click(preset12);
    expect(onChange).toHaveBeenLastCalledWith('2026-11-21T12:00');
    expect(preset12).toHaveAttribute('aria-pressed', 'true');
    expect(preset12).toHaveClass('prism-emerald');

    fireEvent.click(screen.getByRole('button', { name: '09:00' }));
    expect(onChange).toHaveBeenLastCalledWith('2026-11-21T09:00');

    fireEvent.click(screen.getByRole('button', { name: '17:00' }));
    expect(onChange).toHaveBeenLastCalledWith('2026-11-21T17:00');

    // Clamping minuteStep: > 30 clamps to 30, < 1 clamps to 1, NaN falls back to 5
    rerender(
      <CombinedDateTimePicker
        value="2026-11-21T10:00"
        minuteStep={90}
        onChange={onChange}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Increase minute' }));
    expect(onChange).toHaveBeenLastCalledWith('2026-11-21T10:30');

    rerender(
      <CombinedDateTimePicker
        value="2026-11-21T10:00"
        minuteStep={0}
        onChange={onChange}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Increase minute' }));
    expect(onChange).toHaveBeenLastCalledWith('2026-11-21T10:01');

    rerender(
      <CombinedDateTimePicker
        value="2026-11-21T10:00"
        minuteStep={Number.NaN}
        onChange={onChange}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Increase minute' }));
    expect(onChange).toHaveBeenLastCalledWith('2026-11-21T10:05');
  });

  it('supports 12h clockFormat with formatted AM/PM readout, midnight/noon formatting, and AM/PM toggling', () => {
    const onChange = vi.fn();

    const { rerender } = render(
      <CombinedDateTimePicker
        defaultValue="2026-11-21T09:30"
        clockFormat="12h"
        onChange={onChange}
      />
    );

    expect(screen.getByTestId('combined-datetime-readout')).toHaveTextContent(
      '2026-11-21 · 9:30 AM'
    );
    expect(screen.getByTestId('combined-datetime-hour')).toHaveTextContent('9');

    const amBtn = screen.getByRole('button', { name: 'AM' });
    const pmBtn = screen.getByRole('button', { name: 'PM' });
    expect(amBtn).toHaveAttribute('aria-pressed', 'true');
    expect(pmBtn).toHaveAttribute('aria-pressed', 'false');

    // Clicking already-active AM does not trigger redundant onChange
    fireEvent.click(amBtn);
    expect(onChange).not.toHaveBeenCalled();

    // Switching AM -> PM adds 12 hours
    fireEvent.click(pmBtn);
    expect(onChange).toHaveBeenLastCalledWith('2026-11-21T21:30');
    expect(screen.getByTestId('combined-datetime-readout')).toHaveTextContent(
      '2026-11-21 · 9:30 PM'
    );
    expect(screen.getByRole('status')).toHaveTextContent('Selected 2026-11-21 · 9:30 PM.');

    // Switching PM -> AM subtracts 12 hours
    fireEvent.click(amBtn);
    expect(onChange).toHaveBeenLastCalledWith('2026-11-21T09:30');

    // Midnight (00:15) formats as 12:15 AM and noon (12:00) as 12:00 PM
    rerender(
      <CombinedDateTimePicker value="2026-11-21T00:15" clockFormat="12h" onChange={onChange} />
    );
    expect(screen.getByTestId('combined-datetime-readout')).toHaveTextContent(
      '2026-11-21 · 12:15 AM'
    );
    expect(screen.getByTestId('combined-datetime-hour')).toHaveTextContent('12');

    rerender(
      <CombinedDateTimePicker value="2026-11-21T12:00" clockFormat="12h" onChange={onChange} />
    );
    expect(screen.getByTestId('combined-datetime-readout')).toHaveTextContent(
      '2026-11-21 · 12:00 PM'
    );
  });

  it('disables all calendar, stepper, AM/PM, preset, and keyboard controls when disabled=true (negative test)', () => {
    const onChange = vi.fn();

    render(
      <CombinedDateTimePicker
        defaultValue="2026-11-21T09:30"
        clockFormat="12h"
        onChange={onChange}
        disabled
        data-testid="disabled-cdtp"
      />
    );

    const root = screen.getByTestId('disabled-cdtp');
    expect(root).toHaveAttribute('data-disabled', 'true');

    const controls = [
      screen.getByRole('button', { name: 'Previous month' }),
      screen.getByRole('button', { name: 'Next month' }),
      screen.getByRole('button', { name: '2026-11-22' }),
      screen.getByRole('button', { name: 'Decrease hour' }),
      screen.getByRole('button', { name: 'Increase hour' }),
      screen.getByRole('button', { name: 'Decrease minute' }),
      screen.getByRole('button', { name: 'Increase minute' }),
      screen.getByRole('button', { name: 'AM' }),
      screen.getByRole('button', { name: 'PM' }),
      screen.getByRole('button', { name: '09:00' }),
      screen.getByRole('button', { name: '12:00' }),
      screen.getByRole('button', { name: '17:00' }),
    ];

    for (const btn of controls) {
      expect(btn).toBeDisabled();
      expect(btn).toHaveClass('disabled:cursor-not-allowed');
      fireEvent.click(btn);
    }

    fireEvent.keyDown(root, { key: 'PageDown' });
    expect(screen.getByText('November 2026')).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('safely falls back to 2026-11-21T09:30 on malformed values and renders adversarial XSS payloads as literal text', () => {
    const payload = '<script>window.__cdtpXss=1</script><img src=x onerror=alert(1)>';

    const { rerender } = render(
      <CombinedDateTimePicker value="not-a-timestamp" label={payload} />
    );
    expect(screen.getByTestId('combined-datetime-readout')).toHaveTextContent('2026-11-21 · 09:30');
    expect(screen.getByText(payload)).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();

    // Impossible calendar date (Feb 30)
    rerender(<CombinedDateTimePicker value="2026-02-30T10:00" />);
    expect(screen.getByTestId('combined-datetime-readout')).toHaveTextContent('2026-11-21 · 09:30');

    // Out-of-bounds hour (25:00) and minute (10:75)
    rerender(<CombinedDateTimePicker value="2026-11-21T25:00" />);
    expect(screen.getByTestId('combined-datetime-readout')).toHaveTextContent('2026-11-21 · 09:30');

    rerender(<CombinedDateTimePicker value="2026-11-21T10:75" />);
    expect(screen.getByTestId('combined-datetime-readout')).toHaveTextContent('2026-11-21 · 09:30');
  });
});
