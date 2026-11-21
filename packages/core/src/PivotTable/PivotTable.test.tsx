import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { PivotTable, type PivotField, type PivotRecord } from './PivotTable';

const SAMPLE_FIELDS: PivotField[] = [
  { key: 'region', label: 'Region' },
  { key: 'quarter', label: 'Quarter' },
  { key: 'category', label: 'Category' },
  { key: 'revenue', label: 'Revenue', numeric: true },
  { key: 'units', label: 'Units', numeric: true },
];

const SAMPLE_DATA: PivotRecord[] = [
  { region: 'West', quarter: 'Q1', category: 'Optics', revenue: 100, units: 2 },
  { region: 'West', quarter: 'Q1', category: 'Glass', revenue: 50, units: 3 },
  { region: 'West', quarter: 'Q2', category: 'Optics', revenue: 200, units: 5 },
  { region: 'East', quarter: 'Q1', category: 'Optics', revenue: 300, units: 4 },
  { region: 'East', quarter: 'Q2', category: 'Glass', revenue: 150.5, units: 6 },
];

describe('PivotTable', () => {
  it('forwards React 19 ref, applies theme overrides, merges className/xstyle, and renders thead/tbody/tfoot', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <PrismThemeProvider
        theme={{
          components: {
            PivotTable: {
              className: 'theme-pivot',
              style: { letterSpacing: '0.25px' },
            },
          },
        }}
      >
        <PivotTable
          ref={ref}
          data={SAMPLE_DATA}
          fields={SAMPLE_FIELDS}
          className="custom-pivot"
          xstyle={{ '--prism-blur-px': '14px' }}
          data-testid="pivot-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('pivot-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass('refractor-pivot-table', 'prism-slab', 'theme-pivot', 'custom-pivot');
    expect(root).toHaveStyle({ letterSpacing: '0.25px' });
    expect(root.querySelector('table > thead')).not.toBeNull();
    expect(root.querySelector('table > tbody')).not.toBeNull();
    expect(root.querySelector('table > tfoot')).not.toBeNull();
  });

  it('computes cross-tabulation cells, row totals, column totals, and grand total across sum, avg, count, min, and max', () => {
    const onConfigChange = vi.fn();
    render(
      <PivotTable
        data={SAMPLE_DATA}
        fields={SAMPLE_FIELDS}
        defaultRowField="region"
        defaultColumnField="quarter"
        defaultValueField="revenue"
        defaultAggregation="sum"
        onConfigChange={onConfigChange}
      />
    );

    const cellText = (selector: string) =>
      (document.querySelector(selector) as HTMLElement | null)?.textContent;

    // SUM
    expect(cellText('td[data-pivot-cell="West::Q1"]')).toBe('150');
    expect(cellText('td[data-pivot-cell="West::Q2"]')).toBe('200');
    expect(cellText('td[data-pivot-row-total="West"]')).toBe('350');
    expect(cellText('td[data-pivot-cell="East::Q1"]')).toBe('300');
    expect(cellText('td[data-pivot-cell="East::Q2"]')).toBe('150.5');
    expect(cellText('td[data-pivot-row-total="East"]')).toBe('450.5');
    expect(cellText('td[data-pivot-col-total="Q1"]')).toBe('450');
    expect(cellText('td[data-pivot-col-total="Q2"]')).toBe('350.5');
    expect(cellText('td[data-pivot-grand-total="true"]')).toBe('800.5');

    // AVG
    fireEvent.click(screen.getByRole('button', { name: 'Avg' }));
    expect(onConfigChange).toHaveBeenLastCalledWith({
      rowField: 'region',
      columnField: 'quarter',
      valueField: 'revenue',
      aggregation: 'avg',
    });
    expect(cellText('td[data-pivot-cell="West::Q1"]')).toBe('75');
    expect(cellText('td[data-pivot-row-total="West"]')).toBe('116.67');
    expect(cellText('td[data-pivot-grand-total="true"]')).toBe('160.1');

    // COUNT
    fireEvent.click(screen.getByRole('button', { name: 'Count' }));
    expect(cellText('td[data-pivot-cell="West::Q1"]')).toBe('2');
    expect(cellText('td[data-pivot-row-total="West"]')).toBe('3');
    expect(cellText('td[data-pivot-col-total="Q1"]')).toBe('3');
    expect(cellText('td[data-pivot-grand-total="true"]')).toBe('5');

    // MIN
    fireEvent.click(screen.getByRole('button', { name: 'Min' }));
    expect(cellText('td[data-pivot-cell="West::Q1"]')).toBe('50');
    expect(cellText('td[data-pivot-grand-total="true"]')).toBe('50');

    // MAX
    fireEvent.click(screen.getByRole('button', { name: 'Max' }));
    expect(cellText('td[data-pivot-cell="West::Q1"]')).toBe('100');
    expect(cellText('td[data-pivot-grand-total="true"]')).toBe('300');
  });

  it('supports drag-and-drop field chips onto Rows, Columns, and Values drop zones plus accessible select controls', () => {
    const onConfigChange = vi.fn();
    render(
      <PivotTable
        data={SAMPLE_DATA}
        fields={SAMPLE_FIELDS}
        onConfigChange={onConfigChange}
      />
    );

    const transferStore = new Map<string, string>();
    const dataTransfer = {
      effectAllowed: '',
      setData: (type: string, val: string) => transferStore.set(type, val),
      getData: (type: string) => transferStore.get(type) ?? '',
    };

    const categoryChip = document.querySelector('[data-field-chip="category"]') as HTMLElement;
    const unitsChip = document.querySelector('[data-field-chip="units"]') as HTMLElement;
    const regionChip = document.querySelector('[data-field-chip="region"]') as HTMLElement;
    const rowsZone = document.querySelector('[data-drop-zone="rows"]') as HTMLElement;
    const colsZone = document.querySelector('[data-drop-zone="columns"]') as HTMLElement;
    const valsZone = document.querySelector('[data-drop-zone="values"]') as HTMLElement;

    // Drag Category -> Rows
    fireEvent.dragStart(categoryChip, { dataTransfer });
    fireEvent.dragOver(rowsZone, { dataTransfer });
    expect(rowsZone).toHaveAttribute('data-drag-over', 'true');
    fireEvent.dragLeave(rowsZone);
    expect(rowsZone).not.toHaveAttribute('data-drag-over');
    fireEvent.dragOver(rowsZone, { dataTransfer });
    fireEvent.drop(rowsZone, { dataTransfer });
    fireEvent.dragEnd(categoryChip);

    expect(onConfigChange).toHaveBeenLastCalledWith({
      rowField: 'category',
      columnField: 'quarter',
      valueField: 'revenue',
      aggregation: 'sum',
    });
    expect(document.querySelector('tr[data-pivot-row="Optics"]')).toBeInTheDocument();
    expect(document.querySelector('tr[data-pivot-row="Glass"]')).toBeInTheDocument();

    // Drag Region -> Columns
    fireEvent.dragStart(regionChip, { dataTransfer });
    fireEvent.dragOver(colsZone, { dataTransfer });
    fireEvent.drop(colsZone, { dataTransfer });
    expect(onConfigChange).toHaveBeenLastCalledWith({
      rowField: 'category',
      columnField: 'region',
      valueField: 'revenue',
      aggregation: 'sum',
    });

    // Drag Units -> Values
    fireEvent.dragStart(unitsChip, { dataTransfer });
    fireEvent.dragOver(valsZone, { dataTransfer });
    fireEvent.drop(valsZone, { dataTransfer });
    expect(onConfigChange).toHaveBeenLastCalledWith({
      rowField: 'category',
      columnField: 'region',
      valueField: 'units',
      aggregation: 'sum',
    });
    expect(
      (document.querySelector('td[data-pivot-grand-total="true"]') as HTMLElement).textContent
    ).toBe('20');

    // Dropping an unknown field key via dataTransfer is safely ignored
    const callsBeforeInvalidDrop = onConfigChange.mock.calls.length;
    fireEvent.drop(rowsZone, { dataTransfer: { getData: () => 'nonexistent_field' } });
    expect(onConfigChange).toHaveBeenCalledTimes(callsBeforeInvalidDrop);

    // Keyboard / screen-reader <select> parity
    fireEvent.change(screen.getByLabelText('Row field'), { target: { value: 'region' } });
    fireEvent.change(screen.getByLabelText('Column field'), { target: { value: 'quarter' } });
    fireEvent.change(screen.getByLabelText('Value field'), { target: { value: 'revenue' } });
    expect(onConfigChange).toHaveBeenLastCalledWith({
      rowField: 'region',
      columnField: 'quarter',
      valueField: 'revenue',
      aggregation: 'sum',
    });
  });

  it('skips non-numeric, boolean, blank, and NaN/Infinity values cleanly and displays em-dash for empty intersections', () => {
    const dirtyData: PivotRecord[] = [
      { region: 'North', quarter: 'Q1', revenue: Number.NaN },
      { region: 'North', quarter: 'Q1', revenue: 'not-a-number' },
      { region: 'North', quarter: 'Q1', revenue: true },
      { region: 'North', quarter: 'Q1', revenue: '   ' },
      { region: 'North', quarter: 'Q1', revenue: Number.POSITIVE_INFINITY },
      { region: 'South', quarter: 'Q2', revenue: '42.5' },
      { region: 'South', quarter: 'Q2', revenue: 7.5 },
    ];

    render(
      <PivotTable
        data={dirtyData}
        fields={SAMPLE_FIELDS}
        defaultRowField="region"
        defaultColumnField="quarter"
        defaultValueField="revenue"
        defaultAggregation="sum"
      />
    );

    const cellText = (selector: string) =>
      (document.querySelector(selector) as HTMLElement | null)?.textContent;

    // North::Q1 has only non-finite/non-numeric values -> displays —
    expect(cellText('td[data-pivot-cell="North::Q1"]')).toBe('—');
    // North::Q2 has 0 matching records -> displays —
    expect(cellText('td[data-pivot-cell="North::Q2"]')).toBe('—');
    // South::Q2 parses '42.5' + 7.5 = 50
    expect(cellText('td[data-pivot-cell="South::Q2"]')).toBe('50');
    expect(cellText('td[data-pivot-grand-total="true"]')).toBe('50');

    // Switching to Count counts all matching records even if non-numeric
    fireEvent.click(screen.getByRole('button', { name: 'Count' }));
    expect(cellText('td[data-pivot-cell="North::Q1"]')).toBe('5');
    expect(cellText('td[data-pivot-cell="North::Q2"]')).toBe('—');
    expect(cellText('td[data-pivot-grand-total="true"]')).toBe('7');
  });

  it('defends against prototype pollution (__proto__/constructor/prototype) and XSS strings in dimensions', () => {
    const xss = '<script>window.__pivotXss=1</script><img src=x onerror=alert(1)>';
    const hostileFields: PivotField[] = [
      { key: 'rowDim', label: 'Row Dim' },
      { key: 'colDim', label: 'Col Dim' },
      { key: 'metric', label: 'Metric', numeric: true },
      { key: 'constructor', label: 'Unsafe Key' },
    ];
    const hostileData: PivotRecord[] = [
      { rowDim: '__proto__', colDim: 'constructor', metric: 111 },
      { rowDim: 'prototype', colDim: '__proto__', metric: 222 },
      { rowDim: 'constructor', colDim: xss, metric: 333 },
      { metric: 444 },
    ];

    render(
      <PivotTable
        data={hostileData}
        fields={hostileFields}
        defaultRowField="rowDim"
        defaultColumnField="colDim"
        defaultValueField="metric"
      />
    );

    expect(
      (document.querySelector('td[data-pivot-cell="__proto__::constructor"]') as HTMLElement).textContent
    ).toBe('111');
    expect(
      (document.querySelector('td[data-pivot-cell="prototype::__proto__"]') as HTMLElement).textContent
    ).toBe('222');
    expect(
      (document.querySelector('td[data-pivot-cell="(Empty)::(Empty)"]') as HTMLElement).textContent
    ).toBe('444');
    expect(
      (document.querySelector('td[data-pivot-grand-total="true"]') as HTMLElement).textContent
    ).toBe('1,110');
    expect(screen.getByText(xss)).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
    expect(({} as Record<string, string>)['polluted']).toBeUndefined();

    // Selecting unsafe field key 'constructor' yields empty safely without leaking Object.prototype
    fireEvent.change(screen.getByLabelText('Value field'), { target: { value: 'constructor' } });
    expect(
      (document.querySelector('td[data-pivot-grand-total="true"]') as HTMLElement).textContent
    ).toBe('—');
  });

  it('handles empty data, empty fields, and field list shrinkage gracefully', () => {
    const { rerender } = render(
      <PivotTable
        data={[]}
        fields={SAMPLE_FIELDS}
        emptyMessage="No pivot rows yet."
      />
    );

    expect(screen.getByText('No pivot rows yet.')).toBeInTheDocument();
    expect(
      (document.querySelector('td[data-pivot-grand-total="true"]') as HTMLElement).textContent
    ).toBe('—');

    rerender(<PivotTable data={SAMPLE_DATA} fields={[]} emptyMessage="Add fields to pivot." />);
    expect(screen.getByText('Add fields to pivot.')).toBeInTheDocument();
    expect(screen.getByText('No fields configured')).toBeInTheDocument();
    expect(screen.getByLabelText('Row field')).toBeDisabled();

    // Single field fallback & prop change fallback when previous key disappears
    rerender(
      <PivotTable
        data={[{ solo: 10 }, { solo: 20 }]}
        fields={[{ key: 'solo', label: 'Solo', numeric: true }]}
      />
    );
    expect(
      (document.querySelector('td[data-pivot-grand-total="true"]') as HTMLElement).textContent
    ).toBe('30');
  });
});
