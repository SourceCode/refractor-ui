import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  AdvancedDataGrid,
  type AdvancedGridColumn,
  type GridRowRecord,
} from './AdvancedDataGrid';

const SAMPLE_COLUMNS: AdvancedGridColumn[] = [
  { key: 'name', header: 'Project', width: 180, minWidth: 100, editable: true },
  { key: 'region', header: 'Region', width: 140, editable: true },
  { key: 'budget', header: 'Budget', width: 140, align: 'right', editable: true },
  { key: 'active', header: 'Active', width: 110, editable: true },
  { key: 'notes', header: 'Notes', width: 160, sortable: false },
];

const SAMPLE_ROWS: GridRowRecord[] = [
  {
    id: 'r1',
    values: { name: 'Alpha Prism', region: 'West', budget: 45000, active: true, notes: 'Core' },
  },
  {
    id: 'r2',
    values: { name: 'Zephyr Glass', region: 'East', budget: 12000, active: false, notes: 'Beta' },
  },
  {
    id: 'r3',
    values: { name: 'Beacon Lens', region: 'West', budget: 98000, active: true, notes: 'Launch' },
  },
];

describe('AdvancedDataGrid', () => {
  it('forwards React 19 ref, applies theme overrides, merges className/xstyle, and renders thead/tbody', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <PrismThemeProvider
        theme={{
          components: {
            AdvancedDataGrid: {
              className: 'theme-grid',
              style: { letterSpacing: '0.5px' },
            },
          },
        }}
      >
        <AdvancedDataGrid
          ref={ref}
          columns={SAMPLE_COLUMNS}
          rows={SAMPLE_ROWS}
          className="custom-grid"
          xstyle={{ '--prism-blur-px': '12px' }}
          data-testid="grid-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('grid-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass('refractor-advanced-data-grid', 'prism-slab', 'theme-grid', 'custom-grid');
    expect(root).toHaveStyle({ letterSpacing: '0.5px' });
    expect(root.querySelector('table > thead')).not.toBeNull();
    expect(root.querySelector('table > tbody')).not.toBeNull();
    expect(screen.getByText('3 rows')).toBeInTheDocument();
  });

  it('supports inline cell editing via double-click, Enter key, Edit button, numeric/boolean preservation, IME guard, and Escape/Cancel', () => {
    const onCellEdit = vi.fn();
    render(
      <AdvancedDataGrid columns={SAMPLE_COLUMNS} rows={SAMPLE_ROWS} onCellEdit={onCellEdit} />
    );

    // 1. Double-click numeric cell -> preserves finite number type
    const budgetCell = document.querySelector('tr[data-row-id="r1"] td[data-column-key="budget"]') as HTMLElement;
    fireEvent.doubleClick(budgetCell);
    const budgetInput = screen.getByLabelText('Edit Budget value for row r1');
    expect(budgetInput).toHaveClass('prism-well');

    // IME composing Enter must NOT commit
    fireEvent.change(budgetInput, { target: { value: '52500.5' } });
    fireEvent.keyDown(budgetInput, { key: 'Enter', isComposing: true });
    expect(onCellEdit).not.toHaveBeenCalled();

    // Non-composing Enter commits numeric value
    fireEvent.keyDown(budgetInput, { key: 'Enter' });
    expect(onCellEdit).toHaveBeenCalledWith('r1', 'budget', 52500.5);
    expect(budgetCell).toHaveTextContent('52500.5');

    // 2. Numeric cell edited to blank string and non-numeric string falls back to string
    fireEvent.doubleClick(budgetCell);
    const budgetInputBlank = screen.getByLabelText('Edit Budget value for row r1');
    fireEvent.change(budgetInputBlank, { target: { value: '   ' } });
    fireEvent.keyDown(budgetInputBlank, { key: 'Enter' });
    expect(onCellEdit).toHaveBeenLastCalledWith('r1', 'budget', '   ');

    const budgetCell2 = document.querySelector('tr[data-row-id="r2"] td[data-column-key="budget"]') as HTMLElement;
    fireEvent.doubleClick(budgetCell2);
    const budgetInput2 = screen.getByLabelText('Edit Budget value for row r2');
    fireEvent.change(budgetInput2, { target: { value: 'TBD' } });
    fireEvent.keyDown(budgetInput2, { key: 'a' });
    fireEvent.click(screen.getByLabelText('Save Budget for row r2'));
    expect(onCellEdit).toHaveBeenLastCalledWith('r2', 'budget', 'TBD');
    expect(budgetCell2).toHaveTextContent('TBD');

    // 2b. String cell edit commits updated string
    fireEvent.click(screen.getByLabelText('Edit Project for row r1'));
    const projectInput = screen.getByLabelText('Edit Project value for row r1');
    fireEvent.change(projectInput, { target: { value: 'Alpha Prism v2' } });
    fireEvent.keyDown(projectInput, { key: 'Enter' });
    expect(onCellEdit).toHaveBeenLastCalledWith('r1', 'name', 'Alpha Prism v2');
    expect(screen.getByText('Alpha Prism v2')).toBeInTheDocument();

    // 3. Boolean cell edited via Enter on cell preserves boolean & falls back to string on non-boolean
    const activeCell = document.querySelector('tr[data-row-id="r1"] td[data-column-key="active"]') as HTMLElement;
    fireEvent.keyDown(activeCell, { key: 'Enter', isComposing: true });
    fireEvent.keyDown(activeCell, { key: 'Space' });
    expect(screen.queryByRole('textbox')).toBeNull();
    fireEvent.keyDown(activeCell, { key: 'Enter' });
    const activeInput = screen.getByLabelText('Edit Active value for row r1');
    fireEvent.change(activeInput, { target: { value: 'false' } });
    fireEvent.keyDown(activeInput, { key: 'Enter' });
    expect(onCellEdit).toHaveBeenLastCalledWith('r1', 'active', false);
    expect(activeCell).toHaveTextContent('False');

    fireEvent.doubleClick(activeCell);
    const activeInputTrue = screen.getByLabelText('Edit Active value for row r1');
    fireEvent.change(activeInputTrue, { target: { value: 'true' } });
    fireEvent.keyDown(activeInputTrue, { key: 'Enter' });
    expect(onCellEdit).toHaveBeenLastCalledWith('r1', 'active', true);

    fireEvent.doubleClick(activeCell);
    const activeInputOther = screen.getByLabelText('Edit Active value for row r1');
    fireEvent.change(activeInputOther, { target: { value: 'Pending' } });
    fireEvent.keyDown(activeInputOther, { key: 'Enter' });
    expect(onCellEdit).toHaveBeenLastCalledWith('r1', 'active', 'Pending');

    // 4. Edit button + Escape cancels without calling onCellEdit
    const callsBeforeCancel = onCellEdit.mock.calls.length;
    fireEvent.click(screen.getByLabelText('Edit Project for row r2'));
    const nameInput = screen.getByLabelText('Edit Project value for row r2');
    fireEvent.change(nameInput, { target: { value: 'Discarded' } });
    fireEvent.keyDown(nameInput, { key: 'Escape' });
    expect(onCellEdit).toHaveBeenCalledTimes(callsBeforeCancel);
    expect(screen.getByText('Zephyr Glass')).toBeInTheDocument();

    // 5. Cancel button cancels edit
    fireEvent.click(screen.getByLabelText('Edit Project for row r2'));
    fireEvent.click(screen.getByLabelText('Cancel editing Project for row r2'));
    expect(screen.queryByRole('textbox')).toBeNull();

    // 6. Non-editable column ignores double-click
    const notesCell = document.querySelector('tr[data-row-id="r1"] td[data-column-key="notes"]') as HTMLElement;
    fireEvent.doubleClick(notesCell);
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('resizes columns via pointer drag and keyboard arrows/Home/End clamped to [minWidth ?? 80, 480]', () => {
    const { unmount } = render(
      <AdvancedDataGrid columns={SAMPLE_COLUMNS} rows={SAMPLE_ROWS} />
    );

    const projectHeader = document.querySelector('th[data-column-header="name"]') as HTMLElement;
    const resizeHandle = screen.getByRole('separator', { name: 'Resize Project column' });
    expect(projectHeader).toHaveAttribute('data-width', '180');

    // Secondary mouse button is ignored
    fireEvent.pointerDown(resizeHandle, { button: 2, clientX: 100 });
    fireEvent.pointerMove(window, { clientX: 220 });
    expect(projectHeader).toHaveAttribute('data-width', '180');

    // Primary drag increases width and clamps at 480
    fireEvent.pointerDown(resizeHandle, { button: 0, clientX: 100 });
    fireEvent.pointerMove(window, { clientX: 150 });
    expect(projectHeader).toHaveAttribute('data-width', '230');
    fireEvent.pointerMove(window, { clientX: 900 });
    expect(projectHeader).toHaveAttribute('data-width', '480');
    fireEvent.pointerUp(window);

    // Keyboard resize with ArrowLeft, -, ArrowRight, +, Home, End, and IME guard
    fireEvent.keyDown(resizeHandle, { key: 'ArrowLeft', isComposing: true });
    expect(projectHeader).toHaveAttribute('data-width', '480');

    fireEvent.keyDown(resizeHandle, { key: 'ArrowLeft' });
    expect(projectHeader).toHaveAttribute('data-width', '464');

    fireEvent.keyDown(resizeHandle, { key: '-' });
    expect(projectHeader).toHaveAttribute('data-width', '448');

    fireEvent.keyDown(resizeHandle, { key: 'ArrowRight' });
    expect(projectHeader).toHaveAttribute('data-width', '464');

    fireEvent.keyDown(resizeHandle, { key: '+' });
    expect(projectHeader).toHaveAttribute('data-width', '480');

    // Home clamps to minWidth (100 for Project, default 80 for Region)
    fireEvent.keyDown(resizeHandle, { key: 'Home' });
    expect(projectHeader).toHaveAttribute('data-width', '100');

    fireEvent.keyDown(resizeHandle, { key: 'End' });
    expect(projectHeader).toHaveAttribute('data-width', '480');

    // Unrecognized key leaves width unchanged
    fireEvent.keyDown(resizeHandle, { key: 'Tab' });
    expect(projectHeader).toHaveAttribute('data-width', '480');

    const regionHandle = screen.getByRole('separator', { name: 'Resize Region column' });
    const regionHeader = document.querySelector('th[data-column-header="region"]') as HTMLElement;
    fireEvent.keyDown(regionHandle, { key: 'Home' });
    expect(regionHeader).toHaveAttribute('data-width', '80');

    // Active drag cleans up listeners safely on unmount
    fireEvent.pointerDown(regionHandle, { button: 0, clientX: 50 });
    unmount();
    fireEvent.pointerMove(window, { clientX: 250 });
  });

  it('reorders columns via Move Left / Move Right buttons and HTML5 drag-and-drop', () => {
    render(<AdvancedDataGrid columns={SAMPLE_COLUMNS} rows={SAMPLE_ROWS} />);

    const getHeaderOrder = () =>
      Array.from(document.querySelectorAll('thead th[data-column-header]')).map((el) =>
        el.getAttribute('data-column-header')
      );

    expect(getHeaderOrder()).toEqual(['name', 'region', 'budget', 'active', 'notes']);

    // First column Move Left is disabled; last column Move Right is disabled
    expect(screen.getByLabelText('Move Project left')).toBeDisabled();
    expect(screen.getByLabelText('Move Notes right')).toBeDisabled();

    // Move Region left -> swaps with Project
    fireEvent.click(screen.getByLabelText('Move Region left'));
    expect(getHeaderOrder()).toEqual(['region', 'name', 'budget', 'active', 'notes']);

    // Move Region right -> back to second position
    fireEvent.click(screen.getByLabelText('Move Region right'));
    expect(getHeaderOrder()).toEqual(['name', 'region', 'budget', 'active', 'notes']);

    // HTML5 drag-and-drop reorder: drag Budget onto Project
    const budgetTh = document.querySelector('th[data-column-header="budget"]') as HTMLElement;
    const nameTh = document.querySelector('th[data-column-header="name"]') as HTMLElement;
    const transferStore = new Map<string, string>();
    const dataTransfer = {
      effectAllowed: '',
      setData: (type: string, val: string) => transferStore.set(type, val),
      getData: (type: string) => transferStore.get(type) ?? '',
    };

    fireEvent.dragStart(budgetTh, { dataTransfer });
    fireEvent.dragOver(nameTh, { dataTransfer });
    fireEvent.dragOver(nameTh, { dataTransfer });
    fireEvent.dragLeave(budgetTh);
    fireEvent.dragLeave(nameTh);
    fireEvent.dragOver(nameTh, { dataTransfer });
    fireEvent.drop(nameTh, { dataTransfer });
    fireEvent.dragEnd(budgetTh);

    expect(getHeaderOrder()).toEqual(['budget', 'name', 'region', 'active', 'notes']);

    // Fallback drop via dataTransfer without prior dragStart in state
    fireEvent.drop(budgetTh, {
      dataTransfer: { getData: () => 'notes' },
    });
    expect(getHeaderOrder()).toEqual(['notes', 'budget', 'name', 'region', 'active']);

    // Dropping a column onto itself or an unknown column key is a no-op
    fireEvent.drop(budgetTh, {
      dataTransfer: { getData: () => 'budget' },
    });
    fireEvent.drop(budgetTh, {
      dataTransfer: { getData: () => 'unknown_col' },
    });
    expect(getHeaderOrder()).toEqual(['notes', 'budget', 'name', 'region', 'active']);
  });

  it('cycles pinned columns (none -> left -> right -> none) and computes sticky offsets', () => {
    const pinnedCols: AdvancedGridColumn[] = [
      { key: 'idCol', header: 'ID', width: 90, pinned: 'left' },
      { key: 'name', header: 'Name', width: 150 },
      { key: 'score', header: 'Score', width: 100, pinned: 'right' },
      { key: 'status', header: 'Status', width: 120, pinned: 'right' },
    ];
    const rows: GridRowRecord[] = [
      { id: '1', values: { idCol: 'A-1', name: 'Lens', score: 99, status: 'OK' } },
    ];

    render(<AdvancedDataGrid columns={pinnedCols} rows={rows} />);

    const idHeader = document.querySelector('th[data-column-header="idCol"]') as HTMLElement;
    const scoreHeader = document.querySelector('th[data-column-header="score"]') as HTMLElement;
    const statusHeader = document.querySelector('th[data-column-header="status"]') as HTMLElement;

    expect(idHeader).toHaveAttribute('data-pinned', 'left');
    expect(idHeader).toHaveStyle({ position: 'sticky', left: '0px' });
    expect(statusHeader).toHaveStyle({ position: 'sticky', right: '0px' });
    expect(scoreHeader).toHaveStyle({ position: 'sticky', right: '120px' });

    // Cycle Name: none -> left -> right -> none
    fireEvent.click(screen.getByLabelText('Pin Name (currently none)'));
    const nameHeader = document.querySelector('th[data-column-header="name"]') as HTMLElement;
    expect(nameHeader).toHaveAttribute('data-pinned', 'left');
    expect(nameHeader).toHaveStyle({ left: '90px' });

    fireEvent.click(screen.getByLabelText('Pin Name (currently left)'));
    expect(nameHeader).toHaveAttribute('data-pinned', 'right');

    fireEvent.click(screen.getByLabelText('Pin Name (currently right)'));
    expect(nameHeader).toHaveAttribute('data-pinned', 'none');
  });

  it('sorts ascending and descending across string, number, boolean, NaN, and missing values', () => {
    const rowsWithEdgeVals: GridRowRecord[] = [
      { id: 'r1', values: { name: 'Beta', budget: Number.NaN, active: true } },
      { id: 'r2', values: { name: 'Alpha', budget: 500, active: false } },
      { id: 'r3', values: { name: 'Gamma', active: true } },
      { id: 'r4', values: { name: 'Delta', budget: 100, active: false } },
      { id: 'r5', values: { name: 'Epsilon', budget: Number.NaN, active: false } },
    ];

    render(<AdvancedDataGrid columns={SAMPLE_COLUMNS} rows={rowsWithEdgeVals} />);

    const getRowIds = () =>
      Array.from(document.querySelectorAll('tbody tr[data-row-id]')).map((tr) =>
        tr.getAttribute('data-row-id')
      );

    // Click Project header -> ascending
    fireEvent.click(screen.getByRole('button', { name: 'Project' }));
    expect(document.querySelector('th[data-column-header="name"]')).toHaveAttribute(
      'aria-sort',
      'ascending'
    );
    expect(getRowIds()).toEqual(['r2', 'r1', 'r4', 'r5', 'r3']);

    // Click Project header again -> descending, and a third time -> back to ascending
    fireEvent.click(screen.getByRole('button', { name: 'Project' }));
    expect(document.querySelector('th[data-column-header="name"]')).toHaveAttribute(
      'aria-sort',
      'descending'
    );
    expect(getRowIds()).toEqual(['r3', 'r5', 'r4', 'r1', 'r2']);
    fireEvent.click(screen.getByRole('button', { name: 'Project' }));
    expect(document.querySelector('th[data-column-header="name"]')).toHaveAttribute(
      'aria-sort',
      'ascending'
    );

    // Numeric sorting handles finite, NaN, and undefined cleanly (asc & desc)
    fireEvent.click(screen.getByRole('button', { name: 'Budget' }));
    expect(getRowIds().slice(0, 2)).toEqual(['r4', 'r2']);
    expect(getRowIds()[4]).toBe('r3');
    fireEvent.click(screen.getByRole('button', { name: 'Budget' }));
    expect(getRowIds()[0]).toBe('r3');

    // Editing a missing (undefined) editable cell initializes empty draft and commits
    const emptyBudgetCell = document.querySelector('tr[data-row-id="r3"] td[data-column-key="budget"]') as HTMLElement;
    fireEvent.doubleClick(emptyBudgetCell);
    const emptyInput = screen.getByLabelText('Edit Budget value for row r3') as HTMLInputElement;
    expect(emptyInput.value).toBe('');
    fireEvent.change(emptyInput, { target: { value: '777' } });
    fireEvent.keyDown(emptyInput, { key: 'Enter' });
    expect(emptyBudgetCell).toHaveTextContent('777');

    // Boolean sorting
    fireEvent.click(screen.getByRole('button', { name: 'Active' }));
    expect(getRowIds().slice(0, 3)).toEqual(['r2', 'r4', 'r5']);

    // Non-sortable column has no sort button and no aria-sort
    expect(document.querySelector('th[data-column-header="notes"]')).not.toHaveAttribute('aria-sort');
  });

  it('groups rows using ES Map with collapsible group headers and controlled/uncontrolled support', () => {
    const onGroupByChange = vi.fn();
    const { rerender } = render(
      <AdvancedDataGrid
        columns={SAMPLE_COLUMNS}
        rows={SAMPLE_ROWS}
        defaultGroupBy="region"
        onGroupByChange={onGroupByChange}
      />
    );

    expect(document.querySelector('tr[data-group-key="West"]')).toBeInTheDocument();
    expect(document.querySelector('tr[data-group-key="East"]')).toBeInTheDocument();

    // Collapse West group
    const westToggle = within(document.querySelector('tr[data-group-key="West"]') as HTMLElement).getByRole('button');
    expect(westToggle).toHaveAttribute('aria-expanded', 'true');
    expect(westToggle).toHaveTextContent('2');
    fireEvent.click(westToggle);
    expect(westToggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Alpha Prism')).toBeNull();
    expect(screen.getByText('Zephyr Glass')).toBeInTheDocument();

    // Re-expand West group
    fireEvent.click(westToggle);
    expect(screen.getByText('Alpha Prism')).toBeInTheDocument();

    // Change grouping via toolbar select to None
    fireEvent.change(screen.getByLabelText('Group rows by'), { target: { value: '' } });
    expect(onGroupByChange).toHaveBeenCalledWith(null);
    expect(document.querySelector('tr[data-group-key="West"]')).toBeNull();

    // Controlled groupBy
    rerender(
      <AdvancedDataGrid
        columns={SAMPLE_COLUMNS}
        rows={SAMPLE_ROWS}
        groupBy="active"
        onGroupByChange={onGroupByChange}
      />
    );
    expect(document.querySelector('tr[data-group-key="true"]')).toBeInTheDocument();
    expect(document.querySelector('tr[data-group-key="false"]')).toBeInTheDocument();
  });

  it('exports formula-safe RFC 4180 CSV via callback and triggers blob download when onExportCsv is omitted', () => {
    const onExportCsv = vi.fn();
    const maliciousRows: GridRowRecord[] = [
      {
        id: 'sec1',
        values: {
          name: "=CMD|' /C calc'!A0",
          region: '+1+1',
          budget: '-2+3',
          active: '@SUM(A1:A5)',
          notes: '\t=HYPERLINK("http://evil")',
        },
      },
      {
        id: 'sec2',
        values: {
          name: '\r=1+1',
          region: 'North, "Prime"',
          budget: 1200,
          active: true,
          notes: 'Safe',
        },
      },
    ];

    const { rerender } = render(
      <AdvancedDataGrid
        columns={SAMPLE_COLUMNS}
        rows={maliciousRows}
        onExportCsv={onExportCsv}
        exportFilename="audit-report.csv"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Export CSV' }));
    expect(onExportCsv).toHaveBeenCalledTimes(1);
    const [csv, filename] = onExportCsv.mock.calls[0] as [string, string];
    expect(filename).toBe('audit-report.csv');
    expect(csv).toContain("'=CMD|' /C calc'!A0");
    expect(csv).toContain("'+1+1");
    expect(csv).toContain("'-2+3");
    expect(csv).toContain("'@SUM(A1:A5)");
    expect(csv).toContain("'\t=HYPERLINK");
    expect(csv).toContain('"\'\r=1+1"');
    expect(csv).toContain('"North, ""Prime"""');

    // Fallback blob download when onExportCsv is not provided
    const createObjectURL = vi.fn(() => 'blob:refractor-csv');
    const revokeObjectURL = vi.fn();
    const origCreate = URL.createObjectURL;
    const origRevoke = URL.revokeObjectURL;
    Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, configurable: true });
    Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURL, configurable: true });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    try {
      rerender(
        <AdvancedDataGrid
          columns={SAMPLE_COLUMNS}
          rows={maliciousRows}
          exportFilename="   "
        />
      );
      fireEvent.click(screen.getByRole('button', { name: 'Export CSV' }));
      expect(createObjectURL).toHaveBeenCalledTimes(1);
      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:refractor-csv');
    } finally {
      clickSpy.mockRestore();
      Object.defineProperty(URL, 'createObjectURL', { value: origCreate, configurable: true });
      Object.defineProperty(URL, 'revokeObjectURL', { value: origRevoke, configurable: true });
    }
  });

  it('defends against prototype pollution (__proto__/constructor/prototype) and XSS payloads', () => {
    const xssPayload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';
    const adversarialCols: AdvancedGridColumn[] = [
      { key: 'category', header: 'Category', editable: true },
      { key: 'constructor', header: 'Unsafe Constructor', editable: true },
      { key: '__proto__', header: 'Unsafe Proto', editable: true },
    ];
    const adversarialRows: GridRowRecord[] = [
      { id: 'p1', values: { category: '__proto__' } },
      { id: 'p2', values: { category: 'constructor' } },
      { id: 'p3', values: { category: 'prototype' } },
      { id: 'p4', values: { category: xssPayload } },
      { id: 'p5', values: {} },
    ];

    render(
      <AdvancedDataGrid
        columns={adversarialCols}
        rows={adversarialRows}
        defaultGroupBy="category"
      />
    );

    // Grouping by __proto__, constructor, prototype, XSS, and empty works safely
    expect(document.querySelector('tr[data-group-key="__proto__"]')).toBeInTheDocument();
    expect(document.querySelector('tr[data-group-key="constructor"]')).toBeInTheDocument();
    expect(document.querySelector('tr[data-group-key="prototype"]')).toBeInTheDocument();
    expect(document.querySelector('tr[data-group-key="(Empty)"]')).toBeInTheDocument();
    expect(screen.getAllByText(xssPayload).length).toBeGreaterThanOrEqual(1);
    expect(document.querySelector('script')).toBeNull();

    // Unsafe column keys do NOT leak Object.prototype.constructor and cannot open editor
    const ctorCell = document.querySelector('tr[data-row-id="p1"] td[data-column-key="constructor"]') as HTMLElement;
    expect(ctorCell).toHaveTextContent('—');
    fireEvent.doubleClick(ctorCell);
    expect(screen.queryByRole('textbox')).toBeNull();

    // Object.prototype remains pristine
    expect(({} as Record<string, string>)['polluted']).toBeUndefined();
  });

  it('handles empty rows, empty columns, and dynamically added columns gracefully', () => {
    const { rerender } = render(
      <AdvancedDataGrid columns={SAMPLE_COLUMNS} rows={[]} emptyMessage="Nothing here yet." />
    );
    expect(screen.getByText('Nothing here yet.')).toBeInTheDocument();
    expect(screen.getByText('0 rows')).toBeInTheDocument();

    rerender(<AdvancedDataGrid columns={[]} rows={SAMPLE_ROWS} emptyMessage="Define columns first." />);
    expect(screen.getByText('Define columns first.')).toBeInTheDocument();

    // Single row singular label + newly added column reconciliation
    rerender(
      <AdvancedDataGrid
        columns={[...SAMPLE_COLUMNS, { key: 'owner', header: 'Owner' }]}
        rows={[{ id: 'only1', values: { name: 'Solo', owner: 'Ada' } }]}
      />
    );
    expect(screen.getByText('1 row')).toBeInTheDocument();
    expect(screen.getByText('Ada')).toBeInTheDocument();
  });
});
