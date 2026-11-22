import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  FormulaSpreadsheetGrid as BarrelFormulaSpreadsheetGrid,
  evaluateSpreadsheetCell as barrelEvaluateSpreadsheetCell,
  type SpreadsheetFormulaFnMap,
} from './index';
import {
  FormulaSpreadsheetGrid,
  evaluateSpreadsheetCell,
  type SpreadsheetSheetSpec,
} from './FormulaSpreadsheetGrid';

describe('evaluateSpreadsheetCell (formula engine)', () => {
  it('evaluates case-insensitive cell refs, ranges, all 5 functions, arithmetic precedence, unary ops, and diamonds', () => {
    const map = new Map<string, string>([
      ['a1', 'Label'],
      ['B1', '10'],
      ['b2', '20'],
      ['B3', '30'],
      ['B4', ''],
      ['C1', '=b1+b2*2'],
      ['C2', '=(B3-B1)/B1'],
      ['C3', '=sum(B1:B3)'],
      ['C4', '=SUM(b3:b1, 5, B1*2)'],
      ['D1', '=AVERAGE(B1:B4)'],
      ['D2', '=MIN(B1:B3)'],
      ['D3', '=MAX(B1:B3)'],
      ['D4', '=COUNT(A1:B4)'],
      ['E1', '=-B1'],
      ['E2', '=+B1'],
      ['E3', '=-(2+3)'],
      ['E4', '=-0'],
      ['F1', '=5'],
      ['F2', '=F1*2'],
      ['F3', '=F1+F2'],
      ['G1', '=Z9+5'],
      ['G2', '=SUM(A1, B1)'],
      ['G3', '=SUM(1.5, .5)'],
      ['G4', '=MIN(Z1:Z3)'],
      ['H1', '=MAX(Z1:Z3)'],
      ['H2', '=SUM(Z1:Z3)'],
      ['H3', '=COUNT(Z1:Z3)'],
      ['H4', '=AVERAGE(Z1:Z3)'],
    ]);

    expect(evaluateSpreadsheetCell('C1', map)).toEqual({
      display: '50',
      numericValue: 50,
      error: null,
      isFormula: true,
    });
    expect(evaluateSpreadsheetCell('c2', map).display).toBe('2');
    expect(evaluateSpreadsheetCell('C3', map).display).toBe('60');
    expect(evaluateSpreadsheetCell('C4', map).display).toBe('85');
    expect(evaluateSpreadsheetCell('D1', map).display).toBe('20');
    expect(evaluateSpreadsheetCell('D2', map).display).toBe('10');
    expect(evaluateSpreadsheetCell('D3', map).display).toBe('30');
    expect(evaluateSpreadsheetCell('D4', map).display).toBe('3');
    expect(evaluateSpreadsheetCell('E1', map).display).toBe('-10');
    expect(evaluateSpreadsheetCell('E2', map).display).toBe('10');
    expect(evaluateSpreadsheetCell('E3', map).display).toBe('-5');
    expect(evaluateSpreadsheetCell('E4', map).display).toBe('0');
    // Diamond dependency (F3 -> F1 and F3 -> F2 -> F1) is NOT a cycle
    expect(evaluateSpreadsheetCell('F3', map).display).toBe('15');
    // Blank referenced cell evaluates to 0 in arithmetic
    expect(evaluateSpreadsheetCell('G1', map).display).toBe('5');
    // Single cell argument in function skips text cell
    expect(evaluateSpreadsheetCell('G2', map).display).toBe('10');
    // Leading decimal and standard decimal numbers
    expect(evaluateSpreadsheetCell('G3', map).display).toBe('2');
    // Empty range aggregates
    expect(evaluateSpreadsheetCell('G4', map).display).toBe('0');
    expect(evaluateSpreadsheetCell('H1', map).display).toBe('0');
    expect(evaluateSpreadsheetCell('H2', map).display).toBe('0');
    expect(evaluateSpreadsheetCell('H3', map).display).toBe('0');
    expect(evaluateSpreadsheetCell('H4', map)).toEqual({
      display: '#DIV/0!',
      numericValue: null,
      error: '#DIV/0!',
      isFormula: true,
    });
    // Non-formula cells
    expect(evaluateSpreadsheetCell('A1', map)).toEqual({
      display: 'Label',
      numericValue: null,
      error: null,
      isFormula: false,
    });
    expect(evaluateSpreadsheetCell('B1', map)).toEqual({
      display: '10',
      numericValue: 10,
      error: null,
      isFormula: false,
    });
    expect(evaluateSpreadsheetCell('B4', map)).toEqual({
      display: '',
      numericValue: null,
      error: null,
      isFormula: false,
    });
    // Multi-letter columns (AA1 = index 26)
    const wideMap = new Map<string, string>([
      ['AA1', '42'],
      ['AB1', '=AA1+8'],
    ]);
    expect(barrelEvaluateSpreadsheetCell('AB1', wideMap).display).toBe('50');
  });

  it('detects direct, mutual, and range circular references (#CYCLE!), division/overflow (#DIV/0!), syntax errors (#ERR!), and prototype-safe keys', () => {
    const map = new Map<string, string>([
      ['A1', '=A1+1'],
      ['B1', '=C1'],
      ['C1', '=B1'],
      ['D1', '10'],
      ['D2', '=SUM(D1:D2)'],
      ['E1', '=10/0'],
      ['E2', '1e200'],
      ['E3', '=E2*E2'],
      ['F1', '='],
      ['F2', '=1.2.3'],
      ['F3', '=.'],
      ['F4', '=UNKNOWN(D1)'],
      ['G1', '=SUM()'],
      ['G2', '=SUM(D1:BAD)'],
      ['G3', '=SUM(A1:ZZ999)'],
      ['G4', '=SUM(FOO)'],
      ['H1', '=SUM(D1 2)'],
      ['H2', '=1 2'],
      ['H3', '=(1+2'],
      ['H4', '=FOO'],
      ['I1', '=1+'],
      ['I2', '=1;2'],
      ['I3', '=1/0+2'],
      ['I4', '=SUM(E1)'],
      ['J1', 'TextCell'],
      ['J2', '=J1+5'],
      ['J3', '=1+-*2'],
      ['J4', '=SUM(1+)'],
      ['K1', `=${'('.repeat(26)}1${')'.repeat(26)}`],
      ['K2', `=${'SUM('.repeat(26)}1${')'.repeat(26)}`],
      ['K3', `=${'1+'.repeat(150)}1`],
      ['K4', '=E1+1'],
      ['L1', '=SUM(D1:D1) + E1'],
      ['L2', '=1*(1/0)'],
      ['L3', '=-(1/0)'],
      ['L4', '=(1/0)'],
      ['M1', '=*2'],
      ['M2', '=1-'],
      ['M3', '=1*'],
      ['M4', '=SUM(E1:E1)'],
      ['__proto__', '999'],
      ['constructor', '888'],
    ]);

    expect(evaluateSpreadsheetCell('A1', map).error).toBe('#CYCLE!');
    expect(evaluateSpreadsheetCell('B1', map).error).toBe('#CYCLE!');
    expect(evaluateSpreadsheetCell('D2', map).error).toBe('#CYCLE!');
    expect(evaluateSpreadsheetCell('E1', map).error).toBe('#DIV/0!');
    expect(evaluateSpreadsheetCell('E3', map).error).toBe('#DIV/0!');
    expect(evaluateSpreadsheetCell('I3', map).error).toBe('#DIV/0!');
    expect(evaluateSpreadsheetCell('I4', map).error).toBe('#DIV/0!');
    expect(evaluateSpreadsheetCell('K4', map).error).toBe('#DIV/0!');
    expect(evaluateSpreadsheetCell('L1', map).error).toBe('#DIV/0!');
    expect(evaluateSpreadsheetCell('L2', map).error).toBe('#DIV/0!');
    expect(evaluateSpreadsheetCell('L3', map).error).toBe('#DIV/0!');
    expect(evaluateSpreadsheetCell('L4', map).error).toBe('#DIV/0!');
    expect(evaluateSpreadsheetCell('M4', map).error).toBe('#DIV/0!');

    for (const addr of [
      'F1',
      'F2',
      'F3',
      'F4',
      'G1',
      'G2',
      'G3',
      'G4',
      'H1',
      'H2',
      'H3',
      'H4',
      'I1',
      'I2',
      'J2',
      'J3',
      'J4',
      'K1',
      'K2',
      'K3',
      'M1',
      'M2',
      'M3',
    ]) {
      expect(evaluateSpreadsheetCell(addr, map).error, `expected #ERR! at ${addr}`).toBe('#ERR!');
    }

    // Prototype keys and invalid target addresses fail safely with #ERR!
    expect(evaluateSpreadsheetCell('__proto__', map).error).toBe('#ERR!');
    expect(evaluateSpreadsheetCell('constructor', map).error).toBe('#ERR!');
    expect(evaluateSpreadsheetCell('A0', map).error).toBe('#ERR!');
  });
});

describe('FormulaSpreadsheetGrid', () => {
  it('renders default 2 live sheets with React 19 ref, theme overrides, responsive table wrapper, and formula bar sync', () => {
    const ref = createRef<HTMLDivElement>();
    const fnMapCheck: SpreadsheetFormulaFnMap = {
      SUM: true,
      AVERAGE: true,
      MIN: true,
      MAX: true,
      COUNT: true,
    };
    expect(fnMapCheck.SUM).toBe(true);
    expect(fnMapCheck.COUNT).toBe(true);

    render(
      <PrismThemeProvider
        theme={{
          components: {
            FormulaSpreadsheetGrid: {
              className: 'theme-spreadsheet-grid',
              style: { letterSpacing: '0.1px' },
            },
          },
        }}
      >
        <FormulaSpreadsheetGrid
          ref={ref}
          className="local-spreadsheet-grid"
          xstyle={{ '--prism-slab-blur-px': '20px' }}
          style={{ marginTop: '4px' }}
          data-testid="default-spreadsheet"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('default-spreadsheet');
    expect(ref.current).toBe(root);
    expect(FormulaSpreadsheetGrid.displayName).toBe('FormulaSpreadsheetGrid');
    expect(root).toHaveAttribute('role', 'region');
    expect(root).toHaveAttribute('aria-labelledby');
    expect(root).toHaveClass(
      'refractor-formula-spreadsheet-grid',
      'prism-slab',
      'theme-spreadsheet-grid',
      'local-spreadsheet-grid'
    );
    expect(root).toHaveStyle({ letterSpacing: '0.1px', marginTop: '4px' });
    expect(root.style.getPropertyValue('--prism-slab-blur-px')).toBe('20px');
    expect(root).toHaveAttribute('data-active-sheet', 'q4-budget');
    expect(root).toHaveAttribute('data-active-cell', 'D5');

    expect(
      screen.getByRole('heading', { name: 'Optical Formula Spreadsheet' })
    ).toBeInTheDocument();
    expect(screen.getByTestId('spreadsheet-header')).toHaveClass('prism-slab');
    expect(screen.getByTestId('spreadsheet-range-badge')).toHaveTextContent('D5');
    expect(screen.getByTestId('spreadsheet-active-cell-badge')).toHaveTextContent('D5');
    expect(screen.getByLabelText('Formula bar')).toHaveValue('=SUM(D2:D4)');

    // Responsive <table> sits directly inside overflow-x-auto wrapper with thead & tbody
    const wrapper = screen.getByTestId('spreadsheet-table-wrapper');
    expect(wrapper).toHaveClass(
      'prism-well',
      'rounded-2xl',
      'p-2',
      'overflow-x-auto',
      'max-w-full',
      'min-w-0'
    );
    const table = screen.getByTestId('spreadsheet-table');
    expect(table.parentElement).toBe(wrapper);
    expect(table.querySelector('thead')).not.toBeNull();
    expect(table.querySelector('tbody')).not.toBeNull();

    // Live evaluated default formulas on Q4 Budget
    expect(screen.getByTestId('spreadsheet-cell-D2')).toHaveTextContent('5,400');
    expect(screen.getByTestId('spreadsheet-cell-D3')).toHaveTextContent('1,800');
    expect(screen.getByTestId('spreadsheet-cell-D4')).toHaveTextContent('1,600');
    expect(screen.getByTestId('spreadsheet-cell-D5')).toHaveTextContent('8,800');
    expect(screen.getByTestId('spreadsheet-cell-B5')).toHaveTextContent('25');
    expect(screen.getByTestId('spreadsheet-cell-C5')).toHaveTextContent('331.67');
    expect(screen.getByTestId('spreadsheet-cell-B6')).toHaveTextContent('3');
    expect(screen.getByTestId('spreadsheet-cell-C6')).toHaveTextContent('225');
    expect(screen.getByTestId('spreadsheet-cell-D6')).toHaveTextContent('5,400');

    // Bottom status readout reflects selected cell D5 (8,800)
    expect(screen.getByTestId('spreadsheet-stat-sum')).toHaveTextContent('8,800');
    expect(screen.getByTestId('spreadsheet-stat-avg')).toHaveTextContent('8,800');
    expect(screen.getByTestId('spreadsheet-stat-count')).toHaveTextContent('1');

    // Switch to Unit Economics sheet and check parenthesized margin formula
    fireEvent.click(screen.getByTestId('spreadsheet-sheet-tab-unit-economics'));
    expect(root).toHaveAttribute('data-active-sheet', 'unit-economics');
    expect(screen.getByTestId('spreadsheet-cell-D2')).toHaveTextContent('0.76');
    expect(screen.getByTestId('spreadsheet-cell-D3')).toHaveTextContent('0.81');
    expect(screen.getByTestId('spreadsheet-cell-D4')).toHaveTextContent('0.85');
    expect(screen.getByTestId('spreadsheet-cell-B5')).toHaveTextContent('226');
    expect(screen.getByLabelText('Formula bar')).toHaveValue('Plan Tier');
  });

  it('supports click + Shift+Click range selection, live Sum/Avg/Count readout, and Insert =SUM workflows', () => {
    const onCellChange = vi.fn();
    render(<FormulaSpreadsheetGrid onCellChange={onCellChange} />);

    // Click D2 then Shift+Click D4 -> range D2:D4
    fireEvent.click(screen.getByTestId('spreadsheet-cell-D2'));
    expect(screen.getByTestId('spreadsheet-range-badge')).toHaveTextContent('D2');
    expect(screen.getByLabelText('Formula bar')).toHaveValue('=B2*C2');

    fireEvent.click(screen.getByTestId('spreadsheet-cell-D4'), { shiftKey: true });
    expect(screen.getByTestId('spreadsheet-range-badge')).toHaveTextContent('D2:D4');
    expect(screen.getByTestId('spreadsheet-stat-sum')).toHaveTextContent('8,800');
    expect(screen.getByTestId('spreadsheet-stat-avg')).toHaveTextContent('2,933.33');
    expect(screen.getByTestId('spreadsheet-stat-count')).toHaveTextContent('3');

    // Insert =SUM on multi-cell range D2:D4 writes =SUM(D2:D4) into cell below (D5)
    fireEvent.click(screen.getByTestId('spreadsheet-insert-sum'));
    expect(onCellChange).toHaveBeenLastCalledWith('q4-budget', 'D5', '=SUM(D2:D4)', '8,800');
    expect(screen.getByTestId('spreadsheet-active-cell-badge')).toHaveTextContent('D5');

    // Insert =SUM on a multi-cell range reaching bottom row (D5:D6) populates formula bar draft without self-cycle
    fireEvent.click(screen.getByTestId('spreadsheet-cell-D5'));
    fireEvent.click(screen.getByTestId('spreadsheet-cell-D6'), { shiftKey: true });
    fireEvent.click(screen.getByTestId('spreadsheet-insert-sum'));
    const formulaInput = screen.getByLabelText('Formula bar');
    expect(formulaInput).toHaveValue('=SUM(D5:D6)');
    expect(document.activeElement).toBe(formulaInput);

    // Insert =SUM on single cell in row 2 (B2) inserts =SUM(B1:B1)
    fireEvent.click(screen.getByTestId('spreadsheet-cell-B2'));
    fireEvent.click(screen.getByTestId('spreadsheet-insert-sum'));
    expect(onCellChange).toHaveBeenLastCalledWith('q4-budget', 'B2', '=SUM(B1:B1)', '0');

    // Insert =SUM on single cell in row 6 (B6) inserts =SUM(B2:B5)
    fireEvent.click(screen.getByTestId('spreadsheet-cell-B6'));
    fireEvent.click(screen.getByTestId('spreadsheet-insert-sum'));
    expect(onCellChange).toHaveBeenLastCalledWith('q4-budget', 'B6', '=SUM(B2:B5)', '26');

    // Insert =SUM on top row A1 puts '=SUM(' into formula bar draft and focuses input
    fireEvent.click(screen.getByTestId('spreadsheet-cell-A1'));
    expect(screen.getByTestId('spreadsheet-stat-sum')).toHaveTextContent('—');
    expect(screen.getByTestId('spreadsheet-stat-avg')).toHaveTextContent('—');
    expect(screen.getByTestId('spreadsheet-stat-count')).toHaveTextContent('0');
    fireEvent.click(screen.getByTestId('spreadsheet-insert-sum'));
    expect(formulaInput).toHaveValue('=SUM(');
    expect(document.activeElement).toBe(formulaInput);
  });

  it('edits formulas via IME-safe formula bar, inline double-click, blur commit, Escape revert, and live recalculation', () => {
    const onCellChange = vi.fn();
    render(<FormulaSpreadsheetGrid onCellChange={onCellChange} />);

    // Select B2 (currently 12) and edit via formula bar
    fireEvent.click(screen.getByTestId('spreadsheet-cell-B2'));
    const formulaInput = screen.getByLabelText('Formula bar');
    expect(formulaInput).toHaveValue('12');

    // IME composing Enter is ignored
    fireEvent.change(formulaInput, { target: { value: '20' } });
    fireEvent.keyDown(formulaInput, { key: 'Enter', isComposing: true });
    expect(onCellChange).not.toHaveBeenCalled();

    // Escape reverts draft
    fireEvent.keyDown(formulaInput, { key: 'Escape' });
    expect(formulaInput).toHaveValue('12');

    // Unrelated key in formula bar does not commit
    fireEvent.change(formulaInput, { target: { value: '20' } });
    fireEvent.keyDown(formulaInput, { key: 'a' });
    expect(onCellChange).not.toHaveBeenCalled();

    // Enter commits 20 to B2 -> D2 becomes 20*450 = 9,000 and D5 becomes 12,400!
    fireEvent.keyDown(formulaInput, { key: 'Enter' });
    expect(onCellChange).toHaveBeenLastCalledWith('q4-budget', 'B2', '20', '20');
    expect(screen.getByTestId('spreadsheet-cell-D2')).toHaveTextContent('9,000');
    expect(screen.getByTestId('spreadsheet-cell-D5')).toHaveTextContent('12,400');

    // Double-click C2 to edit inline: IME Enter ignored, Escape cancels without blur commit
    fireEvent.doubleClick(screen.getByTestId('spreadsheet-cell-C2'));
    const inlineC2 = screen.getByTestId('spreadsheet-inline-input-C2');
    expect(document.activeElement).toBe(inlineC2);
    fireEvent.change(inlineC2, { target: { value: '999' } });
    fireEvent.keyDown(inlineC2, { key: 'Enter', isComposing: true });
    fireEvent.keyDown(inlineC2, { key: 'Escape' });
    fireEvent.blur(inlineC2);
    expect(screen.getByTestId('spreadsheet-cell-C2')).toHaveTextContent('450');

    // Double-click C2 again, enter 500, commit via Enter
    fireEvent.doubleClick(screen.getByTestId('spreadsheet-cell-C2'));
    const inlineC2Again = screen.getByTestId('spreadsheet-inline-input-C2');
    fireEvent.change(inlineC2Again, { target: { value: '500' } });
    fireEvent.keyDown(inlineC2Again, { key: 'x' });
    fireEvent.keyDown(inlineC2Again, { key: 'Enter' });
    expect(onCellChange).toHaveBeenLastCalledWith('q4-budget', 'C2', '500', '500');
    expect(screen.getByTestId('spreadsheet-cell-D2')).toHaveTextContent('10,000');

    // Double-click B3 and commit via blur
    fireEvent.doubleClick(screen.getByTestId('spreadsheet-cell-B3'));
    const inlineB3 = screen.getByTestId('spreadsheet-inline-input-B3');
    fireEvent.change(inlineB3, { target: { value: '10' } });
    fireEvent.blur(inlineB3);
    expect(onCellChange).toHaveBeenLastCalledWith('q4-budget', 'B3', '10', '10');
    expect(screen.getByTestId('spreadsheet-cell-D3')).toHaveTextContent('2,250');

    // Commit circular reference in D2 and verify error display & data-cell-error
    fireEvent.click(screen.getByTestId('spreadsheet-cell-D2'));
    fireEvent.change(formulaInput, { target: { value: '=D2+1' } });
    fireEvent.keyDown(formulaInput, { key: 'Enter' });
    expect(onCellChange).toHaveBeenLastCalledWith('q4-budget', 'D2', '=D2+1', '#CYCLE!');
    expect(screen.getByTestId('spreadsheet-cell-D2')).toHaveTextContent('#CYCLE!');
    expect(screen.getByTestId('spreadsheet-cell-D2').parentElement).toHaveAttribute(
      'data-cell-error',
      '#CYCLE!'
    );
  });

  it('supports arrow-key navigation, Shift+Arrow range selection, F2/Enter/type-to-edit, Backspace/Delete clear, and tablist keyboard navigation', () => {
    const onCellChange = vi.fn();
    render(<FormulaSpreadsheetGrid onCellChange={onCellChange} />);

    // Focus D5 (default active cell)
    const d5 = screen.getByTestId('spreadsheet-cell-D5');
    d5.focus();

    // IME composing keyDown on cell is ignored
    fireEvent.keyDown(d5, { key: 'ArrowUp', isComposing: true });
    expect(screen.getByTestId('spreadsheet-active-cell-badge')).toHaveTextContent('D5');

    // ArrowUp -> D4, ArrowLeft -> C4, ArrowDown -> C5, ArrowRight -> D5
    fireEvent.keyDown(d5, { key: 'ArrowUp' });
    expect(screen.getByTestId('spreadsheet-active-cell-badge')).toHaveTextContent('D4');
    fireEvent.keyDown(screen.getByTestId('spreadsheet-cell-D4'), { key: 'ArrowLeft' });
    expect(screen.getByTestId('spreadsheet-active-cell-badge')).toHaveTextContent('C4');
    fireEvent.keyDown(screen.getByTestId('spreadsheet-cell-C4'), { key: 'ArrowDown' });
    expect(screen.getByTestId('spreadsheet-active-cell-badge')).toHaveTextContent('C5');
    fireEvent.keyDown(screen.getByTestId('spreadsheet-cell-C5'), { key: 'ArrowRight' });
    expect(screen.getByTestId('spreadsheet-active-cell-badge')).toHaveTextContent('D5');

    // Shift+ArrowUp extends selection from D5 to D4:D5
    fireEvent.keyDown(screen.getByTestId('spreadsheet-cell-D5'), {
      key: 'ArrowUp',
      shiftKey: true,
    });
    expect(screen.getByTestId('spreadsheet-range-badge')).toHaveTextContent('D4:D5');

    // Modifier-held single char (Ctrl+c) does not start editing
    fireEvent.keyDown(screen.getByTestId('spreadsheet-cell-D4'), { key: 'c', ctrlKey: true });
    expect(screen.queryByTestId('spreadsheet-inline-input-D4')).toBeNull();

    // F2 starts inline editing with existing raw value, Escape cancels
    fireEvent.click(screen.getByTestId('spreadsheet-cell-B2'));
    fireEvent.keyDown(screen.getByTestId('spreadsheet-cell-B2'), { key: 'F2' });
    expect(screen.getByTestId('spreadsheet-inline-input-B2')).toHaveValue('12');
    fireEvent.keyDown(screen.getByTestId('spreadsheet-inline-input-B2'), { key: 'Escape' });

    // Enter starts inline editing
    fireEvent.keyDown(screen.getByTestId('spreadsheet-cell-B2'), { key: 'Enter' });
    expect(screen.getByTestId('spreadsheet-inline-input-B2')).toHaveValue('12');
    fireEvent.keyDown(screen.getByTestId('spreadsheet-inline-input-B2'), { key: 'Escape' });

    // Type-to-edit seeds inline input with typed character
    fireEvent.keyDown(screen.getByTestId('spreadsheet-cell-B2'), { key: '7' });
    const inlineTyped = screen.getByTestId('spreadsheet-inline-input-B2');
    expect(inlineTyped).toHaveValue('7');
    fireEvent.keyDown(inlineTyped, { key: 'Enter' });
    expect(onCellChange).toHaveBeenLastCalledWith('q4-budget', 'B2', '7', '7');

    // Delete clears cell
    fireEvent.keyDown(screen.getByTestId('spreadsheet-cell-B2'), { key: 'Delete' });
    expect(onCellChange).toHaveBeenLastCalledWith('q4-budget', 'B2', '', '');

    // Backspace clears cell
    fireEvent.keyDown(screen.getByTestId('spreadsheet-cell-B3'), { key: 'Backspace' });
    expect(onCellChange).toHaveBeenLastCalledWith('q4-budget', 'B3', '', '');

    // Add Sheet appends Sheet 3 and switches to it
    fireEvent.click(screen.getByTestId('spreadsheet-add-sheet'));
    expect(screen.getByTestId('spreadsheet-sheet-tab-sheet-3')).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByTestId('spreadsheet-sheet-tab-sheet-3')).toHaveTextContent('Sheet 3');

    // Sheet tablist keyboard navigation (IME ignored, ArrowLeft, ArrowRight, Home, End)
    const tab3 = screen.getByTestId('spreadsheet-sheet-tab-sheet-3');
    fireEvent.keyDown(tab3, { key: 'ArrowLeft', isComposing: true });
    expect(tab3).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(tab3, { key: 'Tab' });
    fireEvent.keyDown(tab3, { key: 'ArrowLeft' });
    expect(screen.getByTestId('spreadsheet-sheet-tab-unit-economics')).toHaveAttribute(
      'aria-selected',
      'true'
    );
    fireEvent.keyDown(screen.getByTestId('spreadsheet-sheet-tab-unit-economics'), {
      key: 'Home',
    });
    expect(screen.getByTestId('spreadsheet-sheet-tab-q4-budget')).toHaveAttribute(
      'aria-selected',
      'true'
    );
    fireEvent.keyDown(screen.getByTestId('spreadsheet-sheet-tab-q4-budget'), { key: 'End' });
    expect(screen.getByTestId('spreadsheet-sheet-tab-sheet-3')).toHaveAttribute(
      'aria-selected',
      'true'
    );
    fireEvent.keyDown(screen.getByTestId('spreadsheet-sheet-tab-sheet-3'), {
      key: 'ArrowRight',
    });
    expect(screen.getByTestId('spreadsheet-sheet-tab-q4-budget')).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  it('respects disabled mode, handles empty sheets=[] state, clamps invalid dimensions, avoids ID collisions, and neutralizes XSS/prototype payloads', () => {
    const xss = '<script>window.__sheetXss=1</script><img src=x onerror=alert(1)>';
    const onCellChange = vi.fn();

    // 1. Disabled mode allows navigation/inspection but blocks all edits and sheet creation
    const { rerender, unmount } = render(
      <BarrelFormulaSpreadsheetGrid
        disabled
        title="   "
        aria-label="Readonly Workbook"
        onCellChange={onCellChange}
        data-testid="disabled-spreadsheet"
      />
    );

    const root = screen.getByTestId('disabled-spreadsheet');
    expect(root).toHaveAttribute('data-disabled', 'true');
    expect(root).toHaveAttribute('aria-label', 'Readonly Workbook');
    expect(root).not.toHaveAttribute('aria-labelledby');
    expect(
      screen.getByRole('heading', { name: 'Optical Formula Spreadsheet' })
    ).toBeInTheDocument();

    expect(screen.getByTestId('spreadsheet-insert-sum')).toBeDisabled();
    expect(screen.getByTestId('spreadsheet-add-sheet')).toBeDisabled();
    const formulaInput = screen.getByLabelText('Formula bar');
    expect(formulaInput).toBeDisabled();

    // Double-clicking, typing, or pressing Enter/Delete in disabled mode does nothing
    const d5 = screen.getByTestId('spreadsheet-cell-D5');
    fireEvent.doubleClick(d5);
    expect(screen.queryByTestId('spreadsheet-inline-input-D5')).toBeNull();
    fireEvent.keyDown(d5, { key: 'Enter' });
    fireEvent.keyDown(d5, { key: '5' });
    fireEvent.keyDown(d5, { key: 'Delete' });
    fireEvent.change(formulaInput, { target: { value: '999' } });
    fireEvent.keyDown(formulaInput, { key: 'Enter' });
    expect(onCellChange).not.toHaveBeenCalled();

    // Arrow navigation still works for inspection in disabled mode
    fireEvent.keyDown(d5, { key: 'ArrowUp' });
    expect(screen.getByTestId('spreadsheet-active-cell-badge')).toHaveTextContent('D4');

    // 2. Adversarial custom sheets: XSS strings, prototype addresses, NaN/out-of-bounds dimensions, colliding sheet ID
    const adversarialSheets: ReadonlyArray<SpreadsheetSheetSpec> = [
      {
        id: 'sheet-2',
        name: xss,
        columns: Number.NaN,
        rows: 0,
        cells: [
          { address: 'A1', raw: xss },
          { address: '__proto__', raw: '999' },
          { address: 'constructor', raw: '888' },
        ],
      },
    ];

    rerender(
      <BarrelFormulaSpreadsheetGrid
        title={xss}
        sheets={adversarialSheets}
        data-testid="disabled-spreadsheet"
      />
    );

    // Clamped to 1x1 cleanly and rendered safely as literal text
    expect(screen.getByRole('heading', { name: xss })).toBeInTheDocument();
    expect(screen.getByTestId('spreadsheet-cell-A1')).toHaveTextContent(xss);
    expect(screen.getByTestId('spreadsheet-sheet-tab-sheet-2')).toHaveTextContent(xss);
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();

    // Adding a sheet when 'sheet-2' already exists skips collision to 'sheet-3'
    fireEvent.click(screen.getByTestId('spreadsheet-add-sheet'));
    expect(screen.getByTestId('spreadsheet-sheet-tab-sheet-3')).toHaveTextContent('Sheet 3');

    // 3. Empty sheets=[] renders role="status" empty state cleanly
    unmount();
    render(<FormulaSpreadsheetGrid sheets={[]} data-testid="empty-spreadsheet" />);
    const emptyRoot = screen.getByTestId('empty-spreadsheet');
    expect(emptyRoot).toHaveAttribute('data-empty', 'true');
    expect(screen.getByTestId('spreadsheet-empty')).toHaveTextContent('No sheets available');
    expect(screen.queryByTestId('spreadsheet-table')).toBeNull();
    expect(screen.getByTestId('spreadsheet-active-cell-badge')).toHaveTextContent('—');
    expect(screen.getByTestId('spreadsheet-range-badge')).toHaveTextContent('—');
  });
});
