import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  FacetedFilterBar,
  type FacetCategoryOption,
  type FacetedFilterState,
} from './FacetedFilterBar';

const SAMPLE_CATEGORIES: ReadonlyArray<FacetCategoryOption> = [
  { value: 'optics', label: 'Optics', count: 24 },
  { value: 'sensors', label: 'Sensors', count: 12 },
  { value: 'mounts', label: 'Mounts' },
];

describe('FacetedFilterBar', () => {
  it('renders search well, categories with counts, price and date wells, resultCount, ref, and theme overrides', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            FacetedFilterBar: {
              className: 'theme-faceted',
              style: { letterSpacing: '0.2px' },
            },
          },
        }}
      >
        <FacetedFilterBar
          ref={ref}
          categories={SAMPLE_CATEGORIES}
          resultCount={42}
          priceLabel="Budget"
          searchPlaceholder="Find hardware..."
          className="local-faceted"
          xstyle={{ '--prism-blur-px': '12px' }}
          data-testid="filter-bar"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('filter-bar');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'refractor-faceted-filter-bar',
      'prism-slab',
      'theme-faceted',
      'local-faceted'
    );
    expect(root).toHaveAttribute('data-date-range', 'true');
    expect(root).toHaveStyle({ letterSpacing: '0.2px' });

    expect(screen.getByPlaceholderText('Find hardware...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Optics/i })).toHaveClass('prism-crystal');
    expect(screen.getByRole('button', { name: /Optics/i })).toHaveTextContent('24');
    expect(screen.getByRole('button', { name: /Mounts/i })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByLabelText('Budget minimum')).toBeInTheDocument();
    expect(screen.getByLabelText('Budget maximum')).toBeInTheDocument();
    expect(screen.getByLabelText('Date from')).toBeInTheDocument();
    expect(screen.getByLabelText('Date to')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('42 results');
    expect(screen.queryByRole('button', { name: /Reset all/i })).not.toBeInTheDocument();
  });

  it('supports singular resultCount, hides date range when showDateRange=false, and handles invalid resultCount', () => {
    const { rerender } = render(
      <FacetedFilterBar categories={SAMPLE_CATEGORIES} resultCount={1} showDateRange={false} />
    );

    expect(screen.getByRole('status')).toHaveTextContent('1 result');
    expect(screen.queryByLabelText('Date from')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Date to')).not.toBeInTheDocument();

    rerender(<FacetedFilterBar categories={SAMPLE_CATEGORIES} resultCount={Number.NaN} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    rerender(<FacetedFilterBar categories={SAMPLE_CATEGORIES} resultCount={-5} />);
    expect(screen.getByRole('status')).toHaveTextContent('0 results');
  });

  it('manages search, category toggles, price/date filters, removable chips, and Reset all in uncontrolled mode', () => {
    const onChange = vi.fn();

    render(
      <FacetedFilterBar
        categories={SAMPLE_CATEGORIES}
        priceBounds={{ min: 0, max: 5000 }}
        onChange={onChange}
      />
    );

    // Search input update + clear button + chip
    const searchInput = screen.getByRole('searchbox');
    fireEvent.change(searchInput, { target: { value: 'prism lens' } });
    expect(onChange).toHaveBeenLastCalledWith({ query: 'prism lens', categories: [] });
    expect(screen.getByText('Search: "prism lens"')).toBeInTheDocument();

    // Toggle category ON -> prism-emerald
    const opticsBtn = screen.getByRole('button', { name: /Optics/i });
    fireEvent.click(opticsBtn);
    expect(opticsBtn).toHaveAttribute('aria-pressed', 'true');
    expect(opticsBtn).toHaveClass('prism-emerald');
    expect(onChange).toHaveBeenLastCalledWith({
      query: 'prism lens',
      categories: ['optics'],
    });

    // Set minPrice only -> >= chip
    const minInput = screen.getByLabelText('Price Range minimum');
    fireEvent.change(minInput, { target: { value: '250' } });
    expect(screen.getByText('Price Range: ≥ 250')).toBeInTheDocument();

    // Set maxPrice -> range chip
    const maxInput = screen.getByLabelText('Price Range maximum');
    fireEvent.change(maxInput, { target: { value: '1200' } });
    expect(screen.getByText('Price Range: 250 – 1200')).toBeInTheDocument();

    // Set dateFrom only -> From chip, then dateTo -> Date range chip
    const dateFrom = screen.getByLabelText('Date from');
    const dateTo = screen.getByLabelText('Date to');
    fireEvent.change(dateFrom, { target: { value: '2026-01-10' } });
    expect(screen.getByText('From: 2026-01-10')).toBeInTheDocument();
    fireEvent.change(dateTo, { target: { value: '2026-06-20' } });
    expect(screen.getByText('Date: 2026-01-10 – 2026-06-20')).toBeInTheDocument();

    // Remove individual chips
    fireEvent.click(screen.getByRole('button', { name: 'Remove search filter' }));
    expect(searchInput).toHaveValue('');

    fireEvent.click(screen.getByRole('button', { name: 'Remove Optics category filter' }));
    expect(opticsBtn).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(screen.getByRole('button', { name: 'Remove Price Range filter' }));
    expect(minInput).toHaveValue(null);
    expect(maxInput).toHaveValue(null);

    fireEvent.click(screen.getByRole('button', { name: 'Remove date range filter' }));
    expect(dateFrom).toHaveValue('');
    expect(dateTo).toHaveValue('');
    expect(screen.queryByRole('region', { name: 'Active filters' })).not.toBeInTheDocument();

    // Activate filters again and test max-only price chip, to-only date chip, category toggle-off, and Reset all
    fireEvent.change(maxInput, { target: { value: '800' } });
    expect(screen.getByText('Price Range: ≤ 800')).toBeInTheDocument();
    fireEvent.change(dateTo, { target: { value: '2026-09-01' } });
    expect(screen.getByText('To: 2026-09-01')).toBeInTheDocument();

    const sensorsBtn = screen.getByRole('button', { name: /Sensors/i });
    fireEvent.click(sensorsBtn);
    expect(sensorsBtn).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(sensorsBtn);
    expect(sensorsBtn).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(opticsBtn);
    fireEvent.click(screen.getByRole('button', { name: /Reset all/i }));
    expect(onChange).toHaveBeenLastCalledWith({ query: '', categories: [] });
    expect(screen.queryByRole('button', { name: /Reset all/i })).not.toBeInTheDocument();
  });

  it('guards IME composition on search Enter and Escape and supports inline Clear button', () => {
    const onChange = vi.fn();
    render(
      <FacetedFilterBar
        categories={SAMPLE_CATEGORIES}
        defaultValue={{ query: 'laser' }}
        onChange={onChange}
      />
    );

    const searchInput = screen.getByRole('searchbox');

    // During IME composition, Enter and Escape are ignored
    const composingEnter = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(composingEnter, 'isComposing', { value: true });
    fireEvent(searchInput, composingEnter);
    expect(composingEnter.defaultPrevented).toBe(false);
    expect(onChange).not.toHaveBeenCalled();

    const composingEsc = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(composingEsc, 'isComposing', { value: true });
    fireEvent(searchInput, composingEsc);
    expect(searchInput).toHaveValue('laser');

    // Normal Enter confirms query and prevents form submission
    const plainEnter = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    fireEvent(searchInput, plainEnter);
    expect(plainEnter.defaultPrevented).toBe(true);
    expect(onChange).toHaveBeenCalledWith({ query: 'laser', categories: [] });

    // Normal Escape clears query
    fireEvent.keyDown(searchInput, { key: 'Escape' });
    expect(searchInput).toHaveValue('');

    // Inline clear button clears query
    fireEvent.change(searchInput, { target: { value: 'crystal' } });
    fireEvent.click(screen.getByRole('button', { name: 'Clear search query' }));
    expect(searchInput).toHaveValue('');
  });

  it('operates cleanly in controlled mode and falls back to raw value for unknown category chips', () => {
    function ControlledHarness() {
      const [state, setState] = useState<FacetedFilterState>({
        query: 'beam',
        categories: ['custom-cat'],
        minPrice: 100,
      });
      return (
        <FacetedFilterBar
          categories={SAMPLE_CATEGORIES}
          value={state}
          onChange={setState}
          resultCount={7}
        />
      );
    }

    render(<ControlledHarness />);
    expect(screen.getByText('custom-cat')).toBeInTheDocument();
    expect(screen.getByRole('searchbox')).toHaveValue('beam');

    const categoryGroup = screen.getByRole('group', { name: 'Categories' });
    fireEvent.click(within(categoryGroup).getByRole('button', { name: /Sensors/i }));
    expect(within(categoryGroup).getByRole('button', { name: /Sensors/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('auto-normalizes inverted numeric and date ranges, clamps bounds, and defends against NaN/empty/regex/XSS inputs', () => {
    const onChange = vi.fn();

    render(
      <FacetedFilterBar
        categories={[
          { value: 'dup', label: 'Duplicate', count: 5 },
          { value: 'dup', label: 'Duplicate Shadow', count: Number.NaN },
        ]}
        priceBounds={{ min: 1000, max: 100 }}
        defaultValue={{
          query: '.*[a-z]+(foo|bar)?^$\\',
          categories: ['dup', 'dup'],
          minPrice: 800,
          maxPrice: 200,
          dateFrom: '2026-12-15',
          dateTo: '2026-02-01',
        }}
        onChange={onChange}
      />
    );

    // Deduplicated category pill + inverted ranges swapped immediately
    const categoryGroup = screen.getByRole('group', { name: 'Categories' });
    expect(within(categoryGroup).getAllByRole('button', { name: /Duplicate/i })).toHaveLength(1);
    const minInput = screen.getByLabelText('Price Range minimum');
    const maxInput = screen.getByLabelText('Price Range maximum');
    expect(minInput).toHaveValue(200);
    expect(maxInput).toHaveValue(800);

    const dateFrom = screen.getByLabelText('Date from');
    const dateTo = screen.getByLabelText('Date to');
    expect(dateFrom).toHaveValue('2026-02-01');
    expect(dateTo).toHaveValue('2026-12-15');

    // Special regex chars preserved literally without throwing
    expect(screen.getByRole('searchbox')).toHaveValue('.*[a-z]+(foo|bar)?^$\\');

    // Out-of-bounds clamping & live inversion swap
    fireEvent.change(minInput, { target: { value: '99999' } });
    expect(onChange).toHaveBeenLastCalledWith({
      query: '.*[a-z]+(foo|bar)?^$\\',
      categories: ['dup'],
      minPrice: 800,
      maxPrice: 1000,
      dateFrom: '2026-02-01',
      dateTo: '2026-12-15',
    });

    fireEvent.change(maxInput, { target: { value: '-50' } });
    expect(onChange).toHaveBeenLastCalledWith({
      query: '.*[a-z]+(foo|bar)?^$\\',
      categories: ['dup'],
      minPrice: 100,
      maxPrice: 800,
      dateFrom: '2026-02-01',
      dateTo: '2026-12-15',
    });

    // Clearing numeric input or overflowing exponential notation yields undefined (never NaN/Infinity)
    fireEvent.change(minInput, { target: { value: '1e999' } });
    const overflowState = onChange.mock.calls.at(-1)?.[0] as FacetedFilterState;
    expect(overflowState.minPrice).toBeUndefined();

    fireEvent.change(minInput, { target: { value: '' } });
    const latest = onChange.mock.calls.at(-1)?.[0] as FacetedFilterState;
    expect(latest.minPrice).toBeUndefined();
    expect(latest.maxPrice).toBe(800);

    // Live inverted date swap
    fireEvent.change(dateFrom, { target: { value: '2027-05-01' } });
    const latestDate = onChange.mock.calls.at(-1)?.[0] as FacetedFilterState;
    expect(latestDate.dateFrom).toBe('2026-12-15');
    expect(latestDate.dateTo).toBe('2027-05-01');

    // XSS payload rendered safely as literal text
    const xss = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: xss } });
    expect(screen.getByText(`Search: "${xss}"`)).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
  });

  it('handles empty categories array and NaN default prices/bounds gracefully', () => {
    render(
      <FacetedFilterBar
        categories={[]}
        priceBounds={{ min: Number.NaN, max: Number.POSITIVE_INFINITY }}
        defaultValue={{
          minPrice: Number.NaN,
          maxPrice: Number.NEGATIVE_INFINITY,
          dateFrom: '   ',
        }}
      />
    );

    expect(screen.getByText('No categories available')).toBeInTheDocument();
    expect(screen.getByLabelText('Price Range minimum')).toHaveAttribute('min', '0');
    expect(screen.getByLabelText('Price Range maximum')).toHaveAttribute('max', '10000');
    expect(screen.getByLabelText('Price Range minimum')).toHaveValue(null);
    expect(screen.getByLabelText('Price Range maximum')).toHaveValue(null);
  });
});
