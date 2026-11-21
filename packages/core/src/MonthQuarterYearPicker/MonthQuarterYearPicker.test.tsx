import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  MonthQuarterYearPicker,
  formatPeriodValue,
  type PeriodValue,
} from './index';

describe('formatPeriodValue', () => {
  it('formats month, quarter, and year periods canonically and clamps invalid numbers', () => {
    expect(formatPeriodValue({ granularity: 'month', year: 2026, month: 11 })).toBe('Nov 2026');
    expect(formatPeriodValue({ granularity: 'month', year: 2026 })).toBe('Jan 2026');
    expect(formatPeriodValue({ granularity: 'month', year: 2026, month: 99 })).toBe('Dec 2026');
    expect(formatPeriodValue({ granularity: 'quarter', year: 2026, quarter: 4 })).toBe('Q4 2026');
    expect(formatPeriodValue({ granularity: 'quarter', year: 2026 })).toBe('Q1 2026');
    expect(formatPeriodValue({ granularity: 'quarter', year: 2026, quarter: 0 })).toBe('Q1 2026');
    expect(formatPeriodValue({ granularity: 'year', year: 2026 })).toBe('2026');
    expect(formatPeriodValue({ granularity: 'year', year: Number.NaN })).toBe('2026');
  });
});

describe('MonthQuarterYearPicker', () => {
  it('renders prism-slab header, canonical readout, ref, displayName, and theme overrides', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            MonthQuarterYearPicker: {
              className: 'theme-period-picker',
              style: { letterSpacing: '0.2px' },
            },
          },
        }}
      >
        <MonthQuarterYearPicker
          ref={ref}
          className="local-period-picker"
          style={{ maxWidth: '400px' }}
          xstyle={{ '--prism-slab-blur-px': '24px' }}
          data-testid="period-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('period-root');
    expect(MonthQuarterYearPicker.displayName).toBe('MonthQuarterYearPicker');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'refractor-month-quarter-year-picker',
      'prism-slab',
      'theme-period-picker',
      'local-period-picker'
    );
    expect(root).toHaveStyle({ letterSpacing: '0.2px', maxWidth: '400px' });
    expect(root.style.getPropertyValue('--prism-slab-blur-px')).toBe('24px');
    expect(root).toHaveAttribute('data-granularity', 'quarter');
    expect(root).toHaveAttribute('data-year', '2026');
    expect(root).not.toHaveAttribute('data-disabled');

    expect(screen.getByText('Reporting Period')).toBeInTheDocument();
    expect(screen.getByTestId('period-readout')).toHaveTextContent('Q4 2026');
    expect(screen.getByTestId('period-granularity-group')).toBeInTheDocument();
    expect(screen.getByTestId('granularity-quarter')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('granularity-month')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('granularity-year')).toHaveAttribute('aria-pressed', 'false');

    // Verify 2x2 quarter grid with month ranges
    expect(screen.getByTestId('period-quarter-grid')).toBeInTheDocument();
    expect(screen.getByTestId('period-quarter-1')).toHaveTextContent('Q1Jan–Mar');
    expect(screen.getByTestId('period-quarter-2')).toHaveTextContent('Q2Apr–Jun');
    expect(screen.getByTestId('period-quarter-3')).toHaveTextContent('Q3Jul–Sep');
    expect(screen.getByTestId('period-quarter-4')).toHaveTextContent('Q4Oct–Dec');
    expect(screen.getByTestId('period-quarter-4')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('period-quarter-4')).toHaveClass('prism-btn-primary');
    expect(screen.getByTestId('period-quarter-1')).toHaveClass('prism-crystal');
  });

  it('switches across quarter, month (3x4 grid), and year (12-year decade grid) in uncontrolled mode', () => {
    const onChange = vi.fn<(next: PeriodValue) => void>();

    render(<MonthQuarterYearPicker onChange={onChange} />);

    // Clicking already active granularity does not fire onChange
    fireEvent.click(screen.getByTestId('granularity-quarter'));
    expect(onChange).not.toHaveBeenCalled();

    // Select Q2 2026
    fireEvent.click(screen.getByTestId('period-quarter-2'));
    expect(onChange).toHaveBeenLastCalledWith({
      granularity: 'quarter',
      year: 2026,
      quarter: 2,
    });
    expect(screen.getByTestId('period-readout')).toHaveTextContent('Q2 2026');

    // Switch to Month view (derives month 4 from Q2)
    fireEvent.click(screen.getByTestId('granularity-month'));
    expect(onChange).toHaveBeenLastCalledWith({
      granularity: 'month',
      year: 2026,
      month: 4,
    });
    expect(screen.getByTestId('period-readout')).toHaveTextContent('Apr 2026');
    expect(screen.getByTestId('period-month-grid')).toBeInTheDocument();
    expect(screen.getByTestId('period-month-1')).toHaveTextContent('Jan');
    expect(screen.getByTestId('period-month-11')).toHaveTextContent('Nov');
    expect(screen.getByTestId('period-month-12')).toHaveTextContent('Dec');
    expect(screen.getByTestId('period-month-4')).toHaveAttribute('aria-pressed', 'true');

    // Select Nov 2026
    fireEvent.click(screen.getByTestId('period-month-11'));
    expect(onChange).toHaveBeenLastCalledWith({
      granularity: 'month',
      year: 2026,
      month: 11,
    });
    expect(screen.getByTestId('period-readout')).toHaveTextContent('Nov 2026');

    // Switch back to Quarter view (derives Q4 from Nov)
    fireEvent.click(screen.getByTestId('granularity-quarter'));
    expect(onChange).toHaveBeenLastCalledWith({
      granularity: 'quarter',
      year: 2026,
      quarter: 4,
    });
    expect(screen.getByTestId('period-readout')).toHaveTextContent('Q4 2026');

    // Switch to Year view
    fireEvent.click(screen.getByTestId('granularity-year'));
    expect(onChange).toHaveBeenLastCalledWith({
      granularity: 'year',
      year: 2026,
    });
    expect(screen.getByTestId('period-readout')).toHaveTextContent('2026');
    expect(screen.getByTestId('period-year-grid')).toBeInTheDocument();
    expect(screen.getByTestId('period-nav-heading')).toHaveTextContent('2020–2031');
    expect(screen.getByTestId('period-year-2026')).toHaveAttribute('aria-pressed', 'true');

    // Select 2029 in decade grid
    fireEvent.click(screen.getByTestId('period-year-2029'));
    expect(onChange).toHaveBeenLastCalledWith({
      granularity: 'year',
      year: 2029,
    });
    expect(screen.getByTestId('period-readout')).toHaveTextContent('2029');

    // Switching from Year (no month/quarter) to Month defaults to Jan, and from Year to Quarter defaults to Q1
    fireEvent.click(screen.getByTestId('granularity-month'));
    expect(onChange).toHaveBeenLastCalledWith({
      granularity: 'month',
      year: 2029,
      month: 1,
    });
    fireEvent.click(screen.getByTestId('granularity-year'));
    fireEvent.click(screen.getByTestId('granularity-quarter'));
    expect(onChange).toHaveBeenLastCalledWith({
      granularity: 'quarter',
      year: 2029,
      quarter: 1,
    });
  });

  it('navigates years and decades while clamping strictly to minYear..maxYear and disabling out-of-bounds years', () => {
    const onChange = vi.fn<(next: PeriodValue) => void>();

    const { rerender } = render(
      <MonthQuarterYearPicker
        defaultValue={{ granularity: 'month', year: 2025, month: 6 }}
        minYear={2024}
        maxYear={2026}
        onChange={onChange}
      />
    );

    const prevBtn = screen.getByTestId('period-nav-prev');
    const nextBtn = screen.getByTestId('period-nav-next');

    expect(screen.getByTestId('period-nav-heading')).toHaveTextContent('2025');
    expect(prevBtn).not.toBeDisabled();
    expect(nextBtn).not.toBeDisabled();

    // Navigate to minYear 2024
    fireEvent.click(prevBtn);
    expect(screen.getByTestId('period-nav-heading')).toHaveTextContent('2024');
    expect(prevBtn).toBeDisabled();

    // Select Mar 2024
    fireEvent.click(screen.getByTestId('period-month-3'));
    expect(onChange).toHaveBeenLastCalledWith({
      granularity: 'month',
      year: 2024,
      month: 3,
    });

    // Navigate forward to maxYear 2026
    fireEvent.click(nextBtn);
    fireEvent.click(nextBtn);
    expect(screen.getByTestId('period-nav-heading')).toHaveTextContent('2026');
    expect(nextBtn).toBeDisabled();

    // Switch to Year view inside narrow bounds 2024..2026 -> out-of-bounds cells disabled
    fireEvent.click(screen.getByTestId('granularity-year'));
    expect(screen.getByTestId('period-year-2023')).toBeDisabled();
    expect(screen.getByTestId('period-year-2023')).toHaveClass('prism-well');
    expect(screen.getByTestId('period-year-2024')).not.toBeDisabled();
    expect(screen.getByTestId('period-year-2026')).not.toBeDisabled();
    expect(screen.getByTestId('period-year-2027')).toBeDisabled();
    expect(screen.getByTestId('period-nav-prev')).toBeDisabled();
    expect(screen.getByTestId('period-nav-next')).toBeDisabled();

    // Multi-decade navigation across 2000..2035
    rerender(
      <MonthQuarterYearPicker
        defaultValue={{ granularity: 'year', year: 2024 }}
        minYear={2000}
        maxYear={2035}
        onChange={onChange}
      />
    );

    const decadePrev = screen.getByRole('button', { name: 'Previous decade' });
    const decadeNext = screen.getByRole('button', { name: 'Next decade' });

    expect(screen.getByTestId('period-nav-heading')).toHaveTextContent('2020–2031');
    fireEvent.click(decadePrev);
    expect(screen.getByTestId('period-nav-heading')).toHaveTextContent('2010–2021');
    fireEvent.click(decadePrev);
    expect(screen.getByTestId('period-nav-heading')).toHaveTextContent('2000–2011');
    expect(decadePrev).toBeDisabled();

    fireEvent.click(decadeNext);
    fireEvent.click(decadeNext);
    fireEvent.click(decadeNext);
    expect(screen.getByTestId('period-nav-heading')).toHaveTextContent('2030–2041');
    expect(decadeNext).toBeDisabled();
    expect(screen.getByTestId('period-year-2035')).not.toBeDisabled();
    expect(screen.getByTestId('period-year-2036')).toBeDisabled();
  });

  it('supports controlled value updates and syncs browsed year when external value changes', () => {
    function ControlledHarness() {
      const [period, setPeriod] = useState<PeriodValue>({
        granularity: 'quarter',
        year: 2026,
        quarter: 1,
      });

      return (
        <div>
          <span data-testid="controlled-out">{formatPeriodValue(period)}</span>
          <button
            type="button"
            data-testid="jump-2032"
            onClick={() => setPeriod({ granularity: 'month', year: 2032, month: 8 })}
          >
            Jump
          </button>
          <MonthQuarterYearPicker value={period} onChange={setPeriod} />
        </div>
      );
    }

    render(<ControlledHarness />);

    expect(screen.getByTestId('controlled-out')).toHaveTextContent('Q1 2026');
    fireEvent.click(screen.getByTestId('period-quarter-3'));
    expect(screen.getByTestId('controlled-out')).toHaveTextContent('Q3 2026');

    fireEvent.click(screen.getByTestId('jump-2032'));
    expect(screen.getByTestId('controlled-out')).toHaveTextContent('Aug 2032');
    expect(screen.getByTestId('period-nav-heading')).toHaveTextContent('2032');
    expect(screen.getByTestId('period-month-8')).toHaveAttribute('aria-pressed', 'true');
  });

  it('hides granularity toggle for single allowed granularity and handles malformed bounds/props (negative test)', () => {
    const { rerender } = render(
      <MonthQuarterYearPicker
        allowedGranularities={['month', 'month']}
        defaultValue={{ granularity: 'quarter', year: 1990, quarter: 3 }}
        minYear={2030}
        maxYear={2020}
      />
    );

    // Segmented group hidden when only 1 unique granularity is allowed
    expect(screen.queryByTestId('period-granularity-group')).not.toBeInTheDocument();
    // Inverted bounds normalized to 2020..2030, year 1990 clamped to 2020, Q3 coerced to month 7 (Jul)
    expect(screen.getByTestId('period-readout')).toHaveTextContent('Jul 2020');

    // Empty allowedGranularities falls back to all three, non-finite bounds fall back to 2000..2050
    rerender(
      <MonthQuarterYearPicker
        allowedGranularities={[]}
        minYear={Number.NaN}
        maxYear={Number.POSITIVE_INFINITY}
      />
    );
    expect(screen.getByTestId('period-granularity-group')).toBeInTheDocument();
  });

  it('disables all interactive controls when disabled is true (negative test)', () => {
    const onChange = vi.fn<(next: PeriodValue) => void>();

    render(
      <MonthQuarterYearPicker
        disabled
        onChange={onChange}
        data-testid="disabled-picker"
      />
    );

    expect(screen.getByTestId('disabled-picker')).toHaveAttribute('data-disabled', 'true');
    expect(screen.getByTestId('granularity-month')).toBeDisabled();
    expect(screen.getByTestId('period-nav-prev')).toBeDisabled();
    expect(screen.getByTestId('period-nav-next')).toBeDisabled();
    expect(screen.getByTestId('period-quarter-1')).toBeDisabled();

    fireEvent.click(screen.getByTestId('granularity-month'));
    fireEvent.click(screen.getByTestId('period-quarter-1'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('renders XSS payloads in label as literal text (adversarial test)', () => {
    const payload = '<script>window.__periodXss=1</script><img src=x onerror=alert(1)>';

    render(<MonthQuarterYearPicker label={payload} />);

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByText(payload)).toBeInTheDocument();
  });
});
