import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  RecurrenceBuilder,
  formatRecurrenceSummary,
  toCronExpression,
  type RecurrenceRule,
} from './index';

describe('RecurrenceBuilder pure helpers', () => {
  it('toCronExpression generates standard 5-field cron expressions across all frequencies', () => {
    expect(
      toCronExpression({
        frequency: 'daily',
        interval: 1,
        weekdays: [1],
        monthDay: 1,
        hour: 9,
        minute: 0,
        endKind: 'never',
      })
    ).toBe('0 9 * * *');

    expect(
      toCronExpression({
        frequency: 'daily',
        interval: 3,
        weekdays: [1],
        monthDay: 1,
        hour: 14,
        minute: 30,
        endKind: 'never',
      })
    ).toBe('30 14 */3 * *');

    expect(
      toCronExpression({
        frequency: 'weekly',
        interval: 2,
        weekdays: [4, 2, 2, 99, -1, Number.NaN],
        monthDay: 1,
        hour: 9,
        minute: 0,
        endKind: 'never',
      })
    ).toBe('0 9 * * 2,4');

    // Empty weekdays defaults cleanly to Monday (1)
    expect(
      toCronExpression({
        frequency: 'weekly',
        interval: 1,
        weekdays: [],
        monthDay: 1,
        hour: 8,
        minute: 15,
        endKind: 'never',
      })
    ).toBe('15 8 * * 1');

    expect(
      toCronExpression({
        frequency: 'monthly',
        interval: 1,
        weekdays: [1],
        monthDay: 15,
        hour: 10,
        minute: 5,
        endKind: 'never',
      })
    ).toBe('5 10 15 * *');

    expect(
      toCronExpression({
        frequency: 'monthly',
        interval: 3,
        weekdays: [1],
        monthDay: 45,
        hour: 25,
        minute: 90,
        endKind: 'never',
      })
    ).toBe('59 23 31 */3 *');

    expect(
      toCronExpression({
        frequency: 'yearly',
        interval: Number.NaN,
        weekdays: [1],
        monthDay: Number.NaN,
        hour: Number.NaN,
        minute: Number.NaN,
        endKind: 'never',
      })
    ).toBe('0 9 1 1 *');
  });

  it('formatRecurrenceSummary produces clear human-readable strings for all cadences and end conditions', () => {
    expect(
      formatRecurrenceSummary({
        frequency: 'weekly',
        interval: 2,
        weekdays: [2, 4],
        monthDay: 1,
        hour: 9,
        minute: 0,
        endKind: 'never',
      })
    ).toBe('Every 2 weeks on Tue, Thu at 09:00');

    expect(
      formatRecurrenceSummary({
        frequency: 'weekly',
        interval: 2,
        weekdays: [2, 4],
        monthDay: 1,
        hour: 9,
        minute: 0,
        endKind: 'until',
        untilDate: '2026-12-31',
      })
    ).toBe('Every 2 weeks on Tue, Thu at 09:00 until 2026-12-31');

    expect(
      formatRecurrenceSummary({
        frequency: 'weekly',
        interval: 1,
        weekdays: [1, 3, 5],
        monthDay: 1,
        hour: 9,
        minute: 5,
        endKind: 'count',
        count: 10,
      })
    ).toBe('Every week on Mon, Wed, Fri at 09:05 for 10 occurrences');

    expect(
      formatRecurrenceSummary({
        frequency: 'daily',
        interval: 1,
        weekdays: [0],
        monthDay: 1,
        hour: 8,
        minute: 0,
        endKind: 'count',
      })
    ).toBe('Every day at 08:00 for 1 occurrence');

    expect(
      formatRecurrenceSummary({
        frequency: 'daily',
        interval: 4,
        weekdays: [0],
        monthDay: 1,
        hour: 18,
        minute: 45,
        endKind: 'until',
        untilDate: '   ',
      })
    ).toBe('Every 4 days at 18:45');

    expect(
      formatRecurrenceSummary({
        frequency: 'monthly',
        interval: 1,
        weekdays: [1],
        monthDay: 15,
        hour: 10,
        minute: 0,
        endKind: 'never',
      })
    ).toBe('Every month on day 15 at 10:00');

    expect(
      formatRecurrenceSummary({
        frequency: 'monthly',
        interval: 3,
        weekdays: [1],
        monthDay: 1,
        hour: 0,
        minute: 0,
        endKind: 'never',
      })
    ).toBe('Every 3 months on day 1 at 00:00');

    expect(
      formatRecurrenceSummary({
        frequency: 'yearly',
        interval: 1,
        weekdays: [1],
        monthDay: 20,
        hour: 12,
        minute: 30,
        endKind: 'never',
      })
    ).toBe('Every year on day 20 at 12:30');

    expect(
      formatRecurrenceSummary({
        frequency: 'yearly',
        interval: 2,
        weekdays: [1],
        monthDay: 25,
        hour: 7,
        minute: 5,
        endKind: 'never',
      })
    ).toBe('Every 2 years on day 25 at 07:05');
  });
});

describe('RecurrenceBuilder component', () => {
  it('renders prism-slab with theme overrides, ref, default weekly schedule, summary, and cron preview', () => {
    const ref = createRef<HTMLDivElement>();
    const onChange = vi.fn<(rule: RecurrenceRule, cron: string, summary: string) => void>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            RecurrenceBuilder: { className: 'theme-recurrence', style: { maxWidth: '560px' } },
          },
        }}
      >
        <RecurrenceBuilder
          ref={ref}
          onChange={onChange}
          className="local-recurrence"
          xstyle={{ '--prism-blur-px': '18px' }}
          data-testid="recurrence-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('recurrence-root');
    expect(RecurrenceBuilder.displayName).toBe('RecurrenceBuilder');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'refractor-recurrence-builder',
      'prism-slab',
      'theme-recurrence',
      'local-recurrence'
    );
    expect(root).toHaveStyle({ maxWidth: '560px' });
    expect(root).toHaveAttribute('data-frequency', 'weekly');
    expect(root).toHaveAttribute('data-end-kind', 'never');
    expect(screen.getByText('Recurrence Schedule')).toBeInTheDocument();
    expect(screen.getByTestId('recurrence-summary')).toHaveTextContent(
      'Every week on Mon, Wed, Fri at 09:00'
    );
    expect(screen.getByTestId('recurrence-cron')).toHaveTextContent('0 9 * * 1,3,5');

    // Interval stepper bounds & increment/decrement
    expect(screen.getByRole('button', { name: 'Decrease interval' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Increase interval' }));
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ frequency: 'weekly', interval: 2 }),
      '0 9 * * 1,3,5',
      'Every 2 weeks on Mon, Wed, Fri at 09:00'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Decrease interval' }));
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ interval: 1 }),
      '0 9 * * 1,3,5',
      'Every week on Mon, Wed, Fri at 09:00'
    );

    // Direct interval typing clamps to 1..99 and handles empty / non-finite
    const intervalInput = screen.getByRole('spinbutton', { name: 'Interval' });
    fireEvent.change(intervalInput, { target: { value: '120' } });
    expect(intervalInput).toHaveValue(99);
    expect(screen.getByRole('button', { name: 'Increase interval' })).toBeDisabled();

    fireEvent.change(intervalInput, { target: { value: '' } });
    expect(intervalInput).toHaveValue(1);

    fireEvent.change(intervalInput, { target: { value: '-5' } });
    expect(intervalInput).toHaveValue(1);
  });

  it('toggles weekdays in weekly mode while preserving at least 1 selected weekday', () => {
    const onChange = vi.fn<(rule: RecurrenceRule, cron: string, summary: string) => void>();

    render(
      <RecurrenceBuilder
        defaultValue={{
          frequency: 'weekly',
          interval: 2,
          weekdays: [2],
          monthDay: 1,
          hour: 9,
          minute: 0,
          endKind: 'never',
        }}
        onChange={onChange}
      />
    );

    const tueButton = screen.getByRole('button', { name: 'Tue' });
    const thuButton = screen.getByRole('button', { name: 'Thu' });

    expect(tueButton).toHaveAttribute('aria-pressed', 'true');
    expect(thuButton).toHaveAttribute('aria-pressed', 'false');

    // Clicking the sole remaining selected weekday keeps it selected and does not fire onChange
    fireEvent.click(tueButton);
    expect(tueButton).toHaveAttribute('aria-pressed', 'true');
    expect(onChange).not.toHaveBeenCalled();

    // Selecting Thu adds it in sorted order
    fireEvent.click(thuButton);
    expect(thuButton).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('recurrence-summary')).toHaveTextContent(
      'Every 2 weeks on Tue, Thu at 09:00'
    );
    expect(screen.getByTestId('recurrence-cron')).toHaveTextContent('0 9 * * 2,4');

    // Deselecting Tue now succeeds because Thu remains selected
    fireEvent.click(tueButton);
    expect(tueButton).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('recurrence-cron')).toHaveTextContent('0 9 * * 4');
  });

  it('switches frequencies, edits day-of-month and 24h time inputs, and configures end conditions', () => {
    const onChange = vi.fn<(rule: RecurrenceRule, cron: string, summary: string) => void>();

    render(<RecurrenceBuilder onChange={onChange} showCronPreview />);

    // Switch to Daily -> hides weekdays and day-of-month
    fireEvent.click(screen.getByRole('button', { name: 'Daily' }));
    expect(screen.queryByRole('group', { name: 'Weekdays' })).not.toBeInTheDocument();
    expect(screen.queryByRole('spinbutton', { name: 'Day of month' })).not.toBeInTheDocument();
    expect(screen.getByTestId('recurrence-cron')).toHaveTextContent('0 9 * * *');

    // Switch to Monthly -> shows Day of month (1..31)
    fireEvent.click(screen.getByRole('button', { name: 'Monthly' }));
    const monthDayInput = screen.getByRole('spinbutton', { name: 'Day of month' });
    fireEvent.change(monthDayInput, { target: { value: '15' } });
    expect(screen.getByTestId('recurrence-summary')).toHaveTextContent(
      'Every month on day 15 at 09:00'
    );
    expect(screen.getByTestId('recurrence-cron')).toHaveTextContent('0 9 15 * *');

    fireEvent.change(monthDayInput, { target: { value: '' } });
    expect(monthDayInput).toHaveValue(1);
    fireEvent.change(monthDayInput, { target: { value: '50' } });
    expect(monthDayInput).toHaveValue(31);
    fireEvent.change(monthDayInput, { target: { value: '1' } });

    // Switch to Yearly -> retains Day of month and emits month 1 in cron
    fireEvent.click(screen.getByRole('button', { name: 'Yearly' }));
    expect(screen.getByRole('spinbutton', { name: 'Day of month' })).toBeInTheDocument();
    expect(screen.getByTestId('recurrence-cron')).toHaveTextContent('0 9 1 1 *');

    // Time inputs (Hour 0..23, Minute 0..59)
    const hourInput = screen.getByRole('spinbutton', { name: 'Hour' });
    const minuteInput = screen.getByRole('spinbutton', { name: 'Minute' });

    fireEvent.change(hourInput, { target: { value: '14' } });
    fireEvent.change(minuteInput, { target: { value: '45' } });
    expect(screen.getByTestId('recurrence-summary')).toHaveTextContent(
      'Every year on day 1 at 14:45'
    );
    expect(screen.getByTestId('recurrence-cron')).toHaveTextContent('45 14 1 1 *');

    // Empty & out-of-range time inputs clamp to 0..23 and 0..59
    fireEvent.change(hourInput, { target: { value: '' } });
    fireEvent.change(minuteInput, { target: { value: '' } });
    expect(hourInput).toHaveValue(0);
    expect(minuteInput).toHaveValue(0);

    fireEvent.change(hourInput, { target: { value: '42' } });
    fireEvent.change(minuteInput, { target: { value: '99' } });
    expect(hourInput).toHaveValue(23);
    expect(minuteInput).toHaveValue(59);

    // End condition: Until Date
    fireEvent.click(screen.getByRole('button', { name: 'Until Date' }));
    const untilInput = screen.getByLabelText('Until date');
    expect(untilInput).toHaveValue('2026-12-31');
    fireEvent.change(untilInput, { target: { value: '2027-06-30' } });
    expect(screen.getByTestId('recurrence-summary')).toHaveTextContent('until 2027-06-30');

    // End condition: After Count
    fireEvent.click(screen.getByRole('button', { name: 'After Count' }));
    const countInput = screen.getByRole('spinbutton', { name: 'Occurrences' });
    expect(countInput).toHaveValue(10);
    expect(screen.getByTestId('recurrence-summary')).toHaveTextContent('for 10 occurrences');

    fireEvent.change(countInput, { target: { value: '5' } });
    expect(screen.getByTestId('recurrence-summary')).toHaveTextContent('for 5 occurrences');

    fireEvent.change(countInput, { target: { value: '' } });
    expect(countInput).toHaveValue(1);
    fireEvent.change(countInput, { target: { value: '1500' } });
    expect(countInput).toHaveValue(999);

    // End condition: back to Never
    fireEvent.click(screen.getByRole('button', { name: 'Never' }));
    expect(screen.queryByLabelText('Until date')).not.toBeInTheDocument();
    expect(screen.queryByRole('spinbutton', { name: 'Occurrences' })).not.toBeInTheDocument();
  });

  it('supports controlled value mode and hides cron preview when showCronPreview is false', () => {
    function ControlledHarness() {
      const [rule, setRule] = useState<RecurrenceRule>({
        frequency: 'weekly',
        interval: 1,
        weekdays: [1],
        monthDay: 1,
        hour: 9,
        minute: 0,
        endKind: 'until',
        untilDate: undefined,
      });

      return (
        <RecurrenceBuilder
          label="Team Standup"
          value={rule}
          showCronPreview={false}
          onChange={(nextRule) => setRule(nextRule)}
        />
      );
    }

    render(<ControlledHarness />);
    expect(screen.getByText('Team Standup')).toBeInTheDocument();
    expect(screen.queryByTestId('recurrence-cron')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Until date')).toHaveValue('');

    fireEvent.click(screen.getByRole('button', { name: 'Wed' }));
    expect(screen.getByTestId('recurrence-summary')).toHaveTextContent(
      'Every week on Mon, Wed at 09:00'
    );
  });

  it('disables all interactive controls and blocks edits when disabled is true (negative test)', () => {
    const onChange = vi.fn<(rule: RecurrenceRule, cron: string, summary: string) => void>();

    const { rerender } = render(
      <RecurrenceBuilder
        disabled
        defaultValue={{
          frequency: 'monthly',
          interval: 2,
          weekdays: [1],
          monthDay: 10,
          hour: 8,
          minute: 30,
          endKind: 'until',
          untilDate: '2026-12-31',
        }}
        onChange={onChange}
        data-testid="disabled-recurrence"
      />
    );

    expect(screen.getByTestId('disabled-recurrence')).toHaveAttribute('data-disabled', 'true');
    expect(screen.getByRole('button', { name: 'Daily' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Increase interval' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Decrease interval' })).toBeDisabled();

    fireEvent.change(screen.getByRole('spinbutton', { name: 'Interval' }), {
      target: { value: '5' },
    });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Day of month' }), {
      target: { value: '20' },
    });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Hour' }), {
      target: { value: '12' },
    });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Minute' }), {
      target: { value: '15' },
    });
    fireEvent.change(screen.getByLabelText('Until date'), {
      target: { value: '2027-01-01' },
    });

    rerender(
      <RecurrenceBuilder
        disabled
        value={{
          frequency: 'weekly',
          interval: 1,
          weekdays: [1, 3],
          monthDay: 1,
          hour: 9,
          minute: 0,
          endKind: 'count',
          count: 5,
        }}
        onChange={onChange}
      />
    );

    fireEvent.change(screen.getByRole('spinbutton', { name: 'Occurrences' }), {
      target: { value: '12' },
    });
    expect(screen.getByRole('button', { name: 'Mon' })).toBeDisabled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('safely renders adversarial XSS payloads in label and untilDate as inert text', () => {
    const payload = '<script>window.__recurrenceXss=1</script><img src=x onerror=alert(1)>';

    render(
      <RecurrenceBuilder
        label={payload}
        value={{
          frequency: 'daily',
          interval: 1,
          weekdays: [1],
          monthDay: 1,
          hour: 9,
          minute: 0,
          endKind: 'until',
          untilDate: payload,
        }}
      />
    );

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByText(payload)).toBeInTheDocument();
    expect(screen.getByTestId('recurrence-summary')).toHaveTextContent(payload);
  });
});
