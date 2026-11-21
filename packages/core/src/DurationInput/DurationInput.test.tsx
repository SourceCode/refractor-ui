import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  DurationInput,
  decomposeDurationSeconds,
  formatDurationSeconds,
  parseDurationString,
  type DurationParts,
} from './index';

describe('DurationInput pure helpers', () => {
  it('decomposeDurationSeconds clamps non-finite/negative values and floors positive seconds', () => {
    expect(decomposeDurationSeconds(9000)).toEqual({ days: 0, hours: 2, minutes: 30, seconds: 0 });
    expect(decomposeDurationSeconds(94530.9)).toEqual({ days: 1, hours: 2, minutes: 15, seconds: 30 });
    expect(decomposeDurationSeconds(0)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0 });
    expect(decomposeDurationSeconds(-42)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0 });
    expect(decomposeDurationSeconds(Number.NaN)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0 });
    expect(decomposeDurationSeconds(Number.POSITIVE_INFINITY)).toEqual({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    });
  });

  it('formatDurationSeconds emits compact canonical shorthand with optional seconds', () => {
    expect(formatDurationSeconds(9000)).toBe('2h 30m');
    expect(formatDurationSeconds(4 * 86400 + 12 * 3600)).toBe('4d 12h');
    expect(formatDurationSeconds(0)).toBe('0m');
    expect(formatDurationSeconds(0, true)).toBe('0s');
    expect(formatDurationSeconds(45)).toBe('0m');
    expect(formatDurationSeconds(45, true)).toBe('45s');
    expect(formatDurationSeconds(94530, false)).toBe('1d 2h 15m');
    expect(formatDurationSeconds(94530, true)).toBe('1d 2h 15m 30s');
    expect(formatDurationSeconds(-100)).toBe('0m');
  });

  it('parseDurationString parses valid case-insensitive shorthand and aliases in linear time', () => {
    expect(parseDurationString('2h 30m')).toBe(9000);
    expect(parseDurationString('4d 12h')).toBe(388800);
    expect(parseDurationString('45m')).toBe(2700);
    expect(parseDurationString('1d 2h 15m 30s')).toBe(94530);
    expect(parseDurationString('  2H\t30M\r\n')).toBe(9000);
    expect(parseDurationString('2h30m')).toBe(9000);
    expect(parseDurationString('0m')).toBe(0);

    // Full alias coverage
    expect(parseDurationString('1 day 2 days')).toBe(3 * 86400);
    expect(parseDurationString('1 hr 2 hrs 1 hour 2 hours')).toBe(6 * 3600);
    expect(parseDurationString('1 min 2 mins 1 minute 2 minutes')).toBe(6 * 60);
    expect(parseDurationString('1 sec 2 secs 1 second 2 seconds')).toBe(6);
  });

  it('parseDurationString rejects empty, malformed, overflow, and adversarial inputs with null', () => {
    expect(parseDurationString('')).toBeNull();
    expect(parseDurationString('   \t\n ')).toBeNull();
    expect(parseDurationString('abc')).toBeNull();
    expect(parseDurationString('-5m')).toBeNull();
    expect(parseDurationString('123')).toBeNull();
    expect(parseDurationString('2h 30')).toBeNull();
    expect(parseDurationString('2.5h')).toBeNull();
    expect(parseDurationString('2w')).toBeNull();
    expect(parseDurationString('2h foo')).toBeNull();
    expect(parseDurationString('999999999999999999999d')).toBeNull();
    expect(parseDurationString('9007199254740991d')).toBeNull();
    expect(parseDurationString('9007199254740990s 5s')).toBeNull();
    expect(parseDurationString('<script>alert(1)</script>')).toBeNull();

    // Linear-time resilience on long adversarial whitespace + garbage string
    const longBad = `${' '.repeat(2000)}12345${' '.repeat(2000)}!`;
    expect(parseDurationString(longBad)).toBeNull();
  });
});

describe('DurationInput component', () => {
  it('renders prism-slab with theme overrides, ref, default 2h 30m pill, and segment steppers', () => {
    const ref = createRef<HTMLDivElement>();
    const onChange = vi.fn<(totalSeconds: number, parts: DurationParts) => void>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            DurationInput: { className: 'theme-duration', style: { maxWidth: '520px' } },
          },
        }}
      >
        <DurationInput
          ref={ref}
          onChange={onChange}
          className="local-duration"
          xstyle={{ '--prism-blur-px': '20px' }}
          data-testid="duration-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('duration-root');
    expect(DurationInput.displayName).toBe('DurationInput');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass('refractor-duration-input', 'prism-slab', 'theme-duration', 'local-duration');
    expect(root).toHaveStyle({ maxWidth: '520px' });
    expect(screen.getByText('Duration')).toBeInTheDocument();
    expect(screen.getByTestId('duration-summary-pill')).toHaveTextContent('2h 30m');

    expect(screen.getByRole('spinbutton', { name: 'Days' })).toHaveValue(0);
    expect(screen.getByRole('spinbutton', { name: 'Hours' })).toHaveValue(2);
    expect(screen.getByRole('spinbutton', { name: 'Minutes' })).toHaveValue(30);
    expect(screen.queryByRole('spinbutton', { name: 'Seconds' })).not.toBeInTheDocument();

    // Decrease Days is disabled when total < 1 day
    expect(screen.getByRole('button', { name: 'Decrease Days' })).toBeDisabled();

    // Increment Days (+86400s -> 1d 2h 30m)
    fireEvent.click(screen.getByRole('button', { name: 'Increase Days' }));
    expect(onChange).toHaveBeenLastCalledWith(95400, {
      days: 1,
      hours: 2,
      minutes: 30,
      seconds: 0,
    });
    expect(screen.getByTestId('duration-summary-pill')).toHaveTextContent('1d 2h 30m');

    // Decrement Hours (-3600s -> 1d 1h 30m)
    fireEvent.click(screen.getByRole('button', { name: 'Decrease Hours' }));
    expect(onChange).toHaveBeenLastCalledWith(91800, {
      days: 1,
      hours: 1,
      minutes: 30,
      seconds: 0,
    });
    expect(screen.getByTestId('duration-summary-pill')).toHaveTextContent('1d 1h 30m');
  });

  it('supports direct numeric segment edits, showDays=false, showSeconds=true, and maxSeconds clamping', () => {
    const onChange = vi.fn<(totalSeconds: number, parts: DurationParts) => void>();

    const { rerender } = render(
      <DurationInput
        label="Retention Window"
        defaultValueSeconds={90065}
        showDays
        showSeconds
        maxSeconds={100000}
        onChange={onChange}
      />
    );

    expect(screen.getByText('Retention Window')).toBeInTheDocument();
    expect(screen.getByTestId('duration-summary-pill')).toHaveTextContent('1d 1h 1m 5s');

    // Direct input edits across all 4 segments
    const daysInput = screen.getByRole('spinbutton', { name: 'Days' });
    const hoursInput = screen.getByRole('spinbutton', { name: 'Hours' });
    const minutesInput = screen.getByRole('spinbutton', { name: 'Minutes' });
    const secondsInput = screen.getByRole('spinbutton', { name: 'Seconds' });

    fireEvent.change(secondsInput, { target: { value: '20' } });
    expect(onChange).toHaveBeenLastCalledWith(90080, {
      days: 1,
      hours: 1,
      minutes: 1,
      seconds: 20,
    });

    fireEvent.change(minutesInput, { target: { value: '' } });
    expect(onChange).toHaveBeenLastCalledWith(90020, {
      days: 1,
      hours: 1,
      minutes: 0,
      seconds: 20,
    });

    // Exceeding maxSeconds clamps cleanly and disables Increase buttons
    fireEvent.change(daysInput, { target: { value: '5' } });
    expect(onChange).toHaveBeenLastCalledWith(100000, {
      days: 1,
      hours: 3,
      minutes: 46,
      seconds: 40,
    });
    expect(screen.getByRole('button', { name: 'Increase Seconds' })).toBeDisabled();

    // Negative typed input clamps cleanly to 0 for that segment
    fireEvent.change(hoursInput, { target: { value: '-4' } });
    expect(onChange).toHaveBeenLastCalledWith(89200, {
      days: 1,
      hours: 0,
      minutes: 46,
      seconds: 40,
    });

    // Rerender with showDays=false and showSeconds=false (2-column grid, days folded into hours)
    rerender(
      <DurationInput
        valueSeconds={90000}
        showDays={false}
        showSeconds={false}
        maxSeconds={-5}
        onChange={onChange}
      />
    );
    expect(screen.queryByRole('spinbutton', { name: 'Days' })).not.toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: 'Hours' })).toHaveValue(25);

    fireEvent.change(screen.getByRole('spinbutton', { name: 'Hours' }), {
      target: { value: '10' },
    });
    expect(onChange).toHaveBeenLastCalledWith(36000, {
      days: 0,
      hours: 10,
      minutes: 0,
      seconds: 0,
    });
  });

  it('applies shorthand via Apply button and IME-safe Enter, ignoring IME composing and alerting on invalid input', () => {
    const onChange = vi.fn<(totalSeconds: number, parts: DurationParts) => void>();
    render(<DurationInput onChange={onChange} data-testid="shorthand-duration" />);

    const shorthandInput = screen.getByPlaceholderText('e.g. 2h 30m or 4d 12h');
    const applyButton = screen.getByRole('button', { name: 'Apply' });

    // Invalid shorthand triggers role="alert"
    fireEvent.change(shorthandInput, { target: { value: 'not-a-duration' } });
    fireEvent.click(applyButton);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Invalid duration shorthand');
    expect(shorthandInput).toHaveAttribute('aria-invalid', 'true');
    expect(shorthandInput).toHaveAttribute('aria-describedby', alert.id);
    expect(screen.getByTestId('shorthand-duration')).toHaveAttribute('data-invalid', 'true');
    expect(onChange).not.toHaveBeenCalled();

    // Editing clears error alert
    fireEvent.change(shorthandInput, { target: { value: '4d 12h' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    // IME composing Enter MUST NOT submit
    fireEvent.keyDown(shorthandInput, { key: 'Enter', isComposing: true });
    expect(onChange).not.toHaveBeenCalled();

    // Standard Enter applies shorthand and resets draft
    fireEvent.keyDown(shorthandInput, { key: 'Enter' });
    expect(onChange).toHaveBeenLastCalledWith(388800, {
      days: 4,
      hours: 12,
      minutes: 0,
      seconds: 0,
    });
    expect(screen.getByTestId('duration-summary-pill')).toHaveTextContent('4d 12h');
    expect(shorthandInput).toHaveValue('');

    // Apply via button
    fireEvent.change(shorthandInput, { target: { value: '45m' } });
    fireEvent.click(applyButton);
    expect(onChange).toHaveBeenLastCalledWith(2700, {
      days: 0,
      hours: 0,
      minutes: 45,
      seconds: 0,
    });
    expect(screen.getByTestId('duration-summary-pill')).toHaveTextContent('45m');
  });

  it('supports controlled valueSeconds updates cleanly', () => {
    function ControlledHarness() {
      const [seconds, setSeconds] = useState(3600);
      return (
        <DurationInput
          valueSeconds={seconds}
          onChange={(nextSeconds) => setSeconds(nextSeconds)}
        />
      );
    }

    render(<ControlledHarness />);
    expect(screen.getByTestId('duration-summary-pill')).toHaveTextContent('1h');

    fireEvent.click(screen.getByRole('button', { name: 'Increase Minutes' }));
    expect(screen.getByTestId('duration-summary-pill')).toHaveTextContent('1h 1m');
  });

  it('disables all interactive controls and blocks edits when disabled is true (negative test)', () => {
    const onChange = vi.fn<(totalSeconds: number, parts: DurationParts) => void>();
    render(
      <DurationInput
        disabled
        defaultValueSeconds={9000}
        onChange={onChange}
        data-testid="disabled-duration"
      />
    );

    expect(screen.getByTestId('disabled-duration')).toHaveAttribute('data-disabled', 'true');
    const hoursInput = screen.getByRole('spinbutton', { name: 'Hours' });
    const shorthandInput = screen.getByPlaceholderText('e.g. 2h 30m or 4d 12h');
    const applyButton = screen.getByRole('button', { name: 'Apply' });

    expect(hoursInput).toBeDisabled();
    expect(shorthandInput).toBeDisabled();
    expect(applyButton).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Increase Hours' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Decrease Hours' })).toBeDisabled();

    fireEvent.change(hoursInput, { target: { value: '8' } });
    fireEvent.change(shorthandInput, { target: { value: '5h' } });
    fireEvent.keyDown(shorthandInput, { key: 'Enter' });
    fireEvent.click(applyButton);

    expect(onChange).not.toHaveBeenCalled();
  });

  it('renders adversarial XSS payloads in label and shorthand as inert literal text', () => {
    const payload = '<script>window.__durationXss=1</script><img src=x onerror=alert(1)>';
    render(<DurationInput label={payload} />);

    const shorthandInput = screen.getByPlaceholderText('e.g. 2h 30m or 4d 12h');
    fireEvent.change(shorthandInput, { target: { value: payload } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByText(payload)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
