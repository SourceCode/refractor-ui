import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { DateRangePicker, type DateRangePreset, type DateRangeValue } from './DateRangePicker';

describe('DateRangePicker', () => {
  it('renders optical slab, dual side-by-side months, forwards React 19 ref, and composes theme overrides', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            DateRangePicker: {
              className: 'theme-drp',
              style: { maxWidth: '820px' },
            },
          },
        }}
      >
        <DateRangePicker
          ref={ref}
          referenceDate="2026-11-21"
          className="local-drp"
          xstyle={{ '--prism-slab-blur-px': '24px' }}
          style={{ marginTop: '12px' }}
          data-testid="drp-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('drp-root');
    expect(ref.current).toBe(root);
    expect(DateRangePicker.displayName).toBe('DateRangePicker');
    expect(root).toHaveClass('refractor-date-range-picker', 'prism-slab', 'theme-drp', 'local-drp');
    expect(root).toHaveStyle({ maxWidth: '820px', marginTop: '12px' });
    expect(root.style.getPropertyValue('--prism-slab-blur-px')).toBe('24px');
    expect(root).toHaveAttribute('aria-labelledby');
    expect(root).not.toHaveAttribute('data-has-selection');

    expect(screen.getByText('Date Range')).toBeInTheDocument();
    expect(screen.getByTestId('date-range-summary')).toHaveTextContent('Select start & end date');
    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull();

    // Dual adjacent month views
    expect(screen.getByText('November 2026')).toBeInTheDocument();
    expect(screen.getByText('December 2026')).toBeInTheDocument();

    // Every in-month day across both months has a single unique accessible button
    expect(screen.getByRole('button', { name: '2026-11-30' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '2026-12-01' })).toBeInTheDocument();
  });

  it('selects start and end dates, highlights endpoints and in-range days, auto-swaps reverse clicks, and resets on third click', () => {
    const onChange = vi.fn();

    render(
      <DateRangePicker
        referenceDate="2026-11-21"
        onChange={onChange}
        data-testid="drp-select"
      />
    );

    const root = screen.getByTestId('drp-select');
    const summary = screen.getByTestId('date-range-summary');

    // First click sets start
    fireEvent.click(screen.getByRole('button', { name: '2026-11-10' }));
    expect(onChange).toHaveBeenLastCalledWith({ start: '2026-11-10', end: null });
    expect(summary).toHaveTextContent('2026-11-10 → Select end date');
    expect(root).toHaveAttribute('data-has-selection', 'true');
    expect(root).not.toHaveAttribute('data-complete');
    expect(screen.getByRole('button', { name: 'Clear' })).toBeInTheDocument();

    // Second click later date completes range
    fireEvent.click(screen.getByRole('button', { name: '2026-11-14' }));
    expect(onChange).toHaveBeenLastCalledWith({ start: '2026-11-10', end: '2026-11-14' });
    expect(summary).toHaveTextContent('2026-11-10 → 2026-11-14');
    expect(root).toHaveAttribute('data-complete', 'true');

    const startBtn = screen.getByRole('button', { name: '2026-11-10' });
    const midBtn = screen.getByRole('button', { name: '2026-11-12' });
    const endBtn = screen.getByRole('button', { name: '2026-11-14' });

    expect(startBtn).toHaveClass('prism-btn-primary');
    expect(startBtn).toHaveAttribute('data-range-start', 'true');
    expect(startBtn).toHaveAttribute('aria-pressed', 'true');

    expect(midBtn).toHaveAttribute('data-in-range', 'true');
    expect(midBtn).toHaveClass('bg-[var(--prism-primary-main)]/15');
    expect(midBtn).toHaveAttribute('aria-pressed', 'false');

    expect(endBtn).toHaveClass('prism-btn-primary');
    expect(endBtn).toHaveAttribute('data-range-end', 'true');

    // Third click starts a fresh selection
    fireEvent.click(screen.getByRole('button', { name: '2026-11-20' }));
    expect(onChange).toHaveBeenLastCalledWith({ start: '2026-11-20', end: null });

    // Clicking an earlier date auto-swaps so start <= end
    fireEvent.click(screen.getByRole('button', { name: '2026-11-15' }));
    expect(onChange).toHaveBeenLastCalledWith({ start: '2026-11-15', end: '2026-11-20' });
    expect(summary).toHaveTextContent('2026-11-15 → 2026-11-20');

    // Clear resets both dates and hides Clear button
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(onChange).toHaveBeenLastCalledWith({ start: null, end: null });
    expect(summary).toHaveTextContent('Select start & end date');
    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('Date range cleared.');
  });

  it('computes and applies default presets (Last 7 Days, Last 30 Days, Month to Date, Last Quarter) including Q1 year boundary', () => {
    const onChange = vi.fn();
    const { unmount } = render(
      <DateRangePicker referenceDate="2026-11-21" onChange={onChange} />
    );

    const last7 = screen.getByRole('button', { name: 'Last 7 Days' });
    fireEvent.click(last7);
    expect(onChange).toHaveBeenLastCalledWith({ start: '2026-11-15', end: '2026-11-21' });
    expect(last7).toHaveAttribute('aria-pressed', 'true');
    expect(last7).toHaveClass('prism-emerald');

    fireEvent.click(screen.getByRole('button', { name: 'Last 30 Days' }));
    expect(onChange).toHaveBeenLastCalledWith({ start: '2026-10-23', end: '2026-11-21' });
    expect(screen.getByText('October 2026')).toBeInTheDocument();
    expect(screen.getByText('November 2026')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Month to Date' }));
    expect(onChange).toHaveBeenLastCalledWith({ start: '2026-11-01', end: '2026-11-21' });

    fireEvent.click(screen.getByRole('button', { name: 'Last Quarter' }));
    expect(onChange).toHaveBeenLastCalledWith({ start: '2026-07-01', end: '2026-09-30' });
    expect(screen.getByText('July 2026')).toBeInTheDocument();
    expect(screen.getByText('August 2026')).toBeInTheDocument();

    unmount();

    // Q1 reference date crosses year boundary into Q4 of previous year
    const onQ1Change = vi.fn();
    render(<DateRangePicker referenceDate="2026-02-15" onChange={onQ1Change} />);
    fireEvent.click(screen.getByRole('button', { name: 'Last Quarter' }));
    expect(onQ1Change).toHaveBeenLastCalledWith({ start: '2025-10-01', end: '2025-12-31' });
  });

  it('supports controlled value, partial end-only summary, custom presets, custom aria-label, and month navigation including IME-safe keyboard shortcuts', () => {
    const onChange = vi.fn();
    const onKeyDown = vi.fn();
    const customPresets: DateRangePreset[] = [
      { id: 'sprint', label: 'Sprint 42', start: '2026-12-01', end: '2026-12-14' },
      { id: 'unparsed', label: 'Relative Preset', start: 'invalid-date', end: '2026-12-20' },
    ];
    const controlledValue: DateRangeValue = { start: null, end: '2026-11-25' };

    const { rerender } = render(
      <DateRangePicker
        value={controlledValue}
        onChange={onChange}
        presets={customPresets}
        referenceDate="2026-11-21"
        aria-label="Billing window selector"
        onKeyDown={onKeyDown}
        data-testid="controlled-drp"
      />
    );

    const root = screen.getByTestId('controlled-drp');
    expect(root).toHaveAttribute('aria-label', 'Billing window selector');
    expect(root).not.toHaveAttribute('aria-labelledby');
    expect(screen.getByTestId('date-range-summary')).toHaveTextContent(
      'Select start date → 2026-11-25'
    );

    // Next / Previous month buttons
    fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
    expect(screen.getByText('December 2026')).toBeInTheDocument();
    expect(screen.getByText('January 2027')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(screen.getByText('November 2026')).toBeInTheDocument();
    expect(screen.getByText('December 2026')).toBeInTheDocument();

    // Keyboard PageDown / PageUp
    fireEvent.keyDown(root, { key: 'PageDown' });
    expect(screen.getByText('January 2027')).toBeInTheDocument();

    fireEvent.keyDown(root, { key: 'PageUp' });
    expect(screen.getByText('November 2026')).toBeInTheDocument();

    // Unrelated key does not change months
    fireEvent.keyDown(root, { key: 'Enter' });
    expect(screen.getByText('November 2026')).toBeInTheDocument();

    // IME composing event must not trigger month navigation
    const composingEvent = new KeyboardEvent('keydown', { key: 'PageDown', bubbles: true });
    Object.defineProperty(composingEvent, 'isComposing', { value: true });
    fireEvent(root, composingEvent);
    expect(screen.getByText('November 2026')).toBeInTheDocument();
    expect(onKeyDown).toHaveBeenCalledTimes(4);

    // Custom preset with valid start moves view; preset with invalid start does not crash
    fireEvent.click(screen.getByRole('button', { name: 'Sprint 42' }));
    expect(onChange).toHaveBeenLastCalledWith({ start: '2026-12-01', end: '2026-12-14' });
    expect(screen.getByText('December 2026')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Relative Preset' }));
    expect(onChange).toHaveBeenLastCalledWith({ start: 'invalid-date', end: '2026-12-20' });

    // Controlled rerender reflects new value
    rerender(
      <DateRangePicker
        value={{ start: '2026-12-01', end: '2026-12-14' }}
        onChange={onChange}
        presets={customPresets}
        referenceDate="2026-11-21"
        data-testid="controlled-drp"
      />
    );
    expect(screen.getByTestId('date-range-summary')).toHaveTextContent('2026-12-01 → 2026-12-14');
  });

  it('disables presets, month navigation, day cells, Clear, and keyboard navigation when disabled=true (negative test)', () => {
    const onChange = vi.fn();

    render(
      <DateRangePicker
        defaultValue={{ start: '2026-11-10', end: '2026-11-15' }}
        referenceDate="2026-11-21"
        onChange={onChange}
        disabled
        data-testid="disabled-drp"
      />
    );

    const root = screen.getByTestId('disabled-drp');
    expect(root).toHaveAttribute('data-disabled', 'true');

    const controls = [
      screen.getByRole('button', { name: 'Last 7 Days' }),
      screen.getByRole('button', { name: 'Previous month' }),
      screen.getByRole('button', { name: 'Next month' }),
      screen.getByRole('button', { name: '2026-11-12' }),
      screen.getByRole('button', { name: 'Clear' }),
    ];

    for (const btn of controls) {
      expect(btn).toBeDisabled();
      expect(btn).toHaveClass('disabled:cursor-not-allowed');
      fireEvent.click(btn);
    }

    fireEvent.keyDown(root, { key: 'PageDown' });
    expect(screen.getByText('November 2026')).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByTestId('date-range-summary')).toHaveTextContent('2026-11-10 → 2026-11-15');
  });

  it('falls back safely on invalid referenceDate and renders adversarial XSS payloads as literal text', () => {
    const payload = '<script>window.__drpXss=1</script><img src=x onerror=alert(1)>';
    const customPresets: DateRangePreset[] = [
      { id: 'xss', label: payload, start: '2026-11-01', end: '2026-11-05' },
    ];

    const { rerender } = render(
      <DateRangePicker
        referenceDate="2026-02-31"
        label={payload}
        presets={customPresets}
      />
    );

    // Invalid calendar date (Feb 31) falls back cleanly to November 2026
    expect(screen.getByText('November 2026')).toBeInTheDocument();
    expect(screen.getAllByText(payload).length).toBeGreaterThanOrEqual(2);
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();

    // Non-ISO string falls back cleanly as well
    rerender(<DateRangePicker referenceDate={payload} />);
    expect(screen.getByText('November 2026')).toBeInTheDocument();
  });
});
