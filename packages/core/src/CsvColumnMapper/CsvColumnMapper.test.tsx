import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  CsvColumnMapper as BarrelCsvColumnMapper,
  type CsvImportPayload,
  type CsvTargetField,
  type CsvTargetFieldTypeMap,
} from './index';
import { CsvColumnMapper } from './CsvColumnMapper';

function createCsvFile(content: string, name = 'customers.csv'): File {
  const file = new File([content], name, { type: 'text/csv' });
  if (typeof file.text !== 'function') {
    Object.defineProperty(file, 'text', {
      value: () => Promise.resolve(content),
    });
  }
  return file;
}

describe('CsvColumnMapper', () => {
  it('renders default 4-row optical-glass mapper with quoted comma parsing, row errors, overflow-x-auto table, and import payload', () => {
    const onImport = vi.fn<(payload: CsvImportPayload) => void>();
    const fieldTypeMapCheck: CsvTargetFieldTypeMap = {
      string: true,
      email: true,
      number: true,
    };
    expect(fieldTypeMapCheck.email).toBe(true);
    expect(BarrelCsvColumnMapper).toBe(CsvColumnMapper);
    expect(CsvColumnMapper.displayName).toBe('CsvColumnMapper');

    render(<CsvColumnMapper onImport={onImport} />);

    expect(screen.getByRole('region', { name: 'CSV Column Mapper' })).toBeInTheDocument();
    expect(screen.getByTestId('csv-column-count')).toHaveTextContent('4 columns');
    expect(screen.getByTestId('csv-row-count')).toHaveTextContent('4 rows');
    expect(screen.getByTestId('csv-valid-count')).toHaveTextContent('3 valid');
    expect(screen.getByTestId('csv-error-count')).toHaveTextContent('1 error');

    // Table MUST be wrapped directly inside <div className="overflow-x-auto">
    const table = screen.getByRole('table', { name: 'CSV validation preview' });
    expect(table.parentElement?.tagName).toBe('DIV');
    expect(table.parentElement).toHaveClass('overflow-x-auto');
    expect(table.querySelector('thead')).not.toBeNull();
    expect(table.querySelector('tbody')).not.toBeNull();

    // Quoted comma field in Row 1 is parsed into a single cell
    const row0 = screen.getByTestId('csv-preview-row-0');
    expect(row0).toHaveAttribute('data-row-status', 'valid');
    expect(within(row0).getByText('Vance, Elena')).toBeInTheDocument();
    expect(within(row0).getByText('Valid')).toBeInTheDocument();

    // Deliberately invalid Row 3 shows Error pill & exact inline validation errors
    const row2 = screen.getByTestId('csv-preview-row-2');
    expect(row2).toHaveAttribute('data-row-status', 'error');
    expect(within(row2).getByText('Error')).toBeInTheDocument();
    expect(
      within(row2).getByText(/Work Email "invalid-email-address" is not a valid email address\./)
    ).toBeInTheDocument();
    expect(
      within(row2).getByText(/Monthly MRR "not-a-number" must be a valid number\./)
    ).toBeInTheDocument();

    // Import Valid Rows invokes onImport with formula-sanitized rows, errors, and mappings
    fireEvent.click(screen.getByRole('button', { name: 'Import Valid Rows' }));
    expect(onImport).toHaveBeenCalledTimes(1);
    const payload = onImport.mock.calls[0]![0];
    expect(payload.validRows).toHaveLength(3);
    expect(payload.validRows[0]).toEqual({
      email: 'elena.vance@lumencloud.io',
      fullName: '"Vance, Elena"',
      planTier: 'Enterprise',
      monthlyMrr: '4800',
    });
    expect(payload.validRows[1]).toEqual({
      email: 'marcus.chen@prismops.dev',
      fullName: 'Marcus Chen',
      planTier: 'Scale',
      monthlyMrr: '1650',
    });
    expect(payload.errors).toEqual([
      {
        rowIndex: 2,
        fieldKey: 'email',
        message: 'Work Email "invalid-email-address" is not a valid email address.',
      },
      {
        rowIndex: 2,
        fieldKey: 'monthlyMrr',
        message: 'Monthly MRR "not-a-number" must be a valid number.',
      },
    ]);
    expect(payload.mappings).toEqual([
      { sourceColumn: 'email', targetKey: 'email' },
      { sourceColumn: 'full_name', targetKey: 'fullName' },
      { sourceColumn: 'plan_tier', targetKey: 'planTier' },
      { sourceColumn: 'monthly_mrr', targetKey: 'monthlyMrr' },
    ]);
    expect(screen.getByTestId('csv-import-status')).toHaveTextContent(
      'Imported 3 valid rows (1 invalid row skipped).'
    );
  });

  it('parses RFC-4180 escaped quotes, multiline quoted cells, CRLF, BOM, blank lines, blank headers, duplicate headers, and ragged rows', () => {
    const csv = [
      '\uFEFFemail,full_name,,email,plan_tier',
      '"ada@prism.io","Ada ""Countess""\nLovelace",extra,dup@prism.io,Enterprise',
      '   ',
      'grace@prism.io,"Grace Hopper"',
      '',
    ].join('\r\n');

    render(<CsvColumnMapper defaultCsvText={csv} />);

    expect(screen.getByTestId('csv-column-count')).toHaveTextContent('5 columns');
    expect(screen.getByTestId('csv-row-count')).toHaveTextContent('2 rows');
    expect(screen.getByLabelText('Map column Column 3')).toBeInTheDocument();
    expect(screen.getByLabelText('Map column email (2)')).toBeInTheDocument();

    const row0 = screen.getByTestId('csv-preview-row-0');
    expect(row0).toHaveAttribute('data-row-status', 'valid');
    expect(row0.textContent).toContain('Ada "Countess"\nLovelace');

    // Ragged second row omits mapped optional plan_tier column cleanly
    const row1 = screen.getByTestId('csv-preview-row-1');
    expect(row1).toHaveAttribute('data-row-status', 'valid');
    expect(within(row1).getByText('Grace Hopper')).toBeInTheDocument();
    expect(within(row1).getByText('—')).toBeInTheDocument();
  });

  it('supports collapsing source textarea, clearing, loading sample, and header-only / single-row states', () => {
    const onImport = vi.fn<(payload: CsvImportPayload) => void>();
    render(<CsvColumnMapper onImport={onImport} />);

    // Collapse & expand source editor
    const toggleBtn = screen.getByRole('button', { name: 'Hide Source' });
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(toggleBtn);
    expect(screen.queryByLabelText('CSV source data')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show Source' }));
    const textarea = screen.getByLabelText('CSV source data');
    expect(textarea).toBeInTheDocument();

    // Header-only CSV (1 column, 0 rows)
    fireEvent.change(textarea, { target: { value: 'email' } });
    expect(screen.getByTestId('csv-column-count')).toHaveTextContent('1 column');
    expect(screen.getByTestId('csv-row-count')).toHaveTextContent('0 rows');
    expect(
      screen.getByText('Header row parsed. Add data rows to preview validation results.')
    ).toBeInTheDocument();

    // Single valid row -> singular row/import announcements
    fireEvent.change(textarea, {
      target: { value: 'email,full_name\nsolo@prism.io,Solo User' },
    });
    expect(screen.getByTestId('csv-row-count')).toHaveTextContent('1 row');
    expect(screen.getByTestId('csv-error-count')).toHaveTextContent('0 errors');
    expect(screen.getByTestId('csv-import-status')).toHaveTextContent(
      '1 valid row ready to import.'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Import Valid Rows' }));
    expect(screen.getByTestId('csv-import-status')).toHaveTextContent('Imported 1 valid row.');

    // Clear button resets CSV and disables clear/auto-map/import
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.getByTestId('csv-empty-state')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Auto-Map Headers' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Import Valid Rows' })).toBeDisabled();
    expect(screen.getByTestId('csv-import-status')).toHaveTextContent('Cleared CSV source data.');

    // Load Sample restores 4-row dataset
    fireEvent.click(screen.getByRole('button', { name: 'Load Sample' }));
    expect(screen.getByTestId('csv-row-count')).toHaveTextContent('4 rows');
    expect(screen.getByTestId('csv-import-status')).toHaveTextContent(
      'Loaded 4-row sample CSV dataset.'
    );
  });

  it('detects missing required mappings, duplicate target assignments, and auto-maps partial header names', () => {
    const csv = [
      'id,customer_email,name,plan,mrr,notes',
      '1,ops+team@sub.prism.io,Ada Lovelace,Enterprise,2500.5,VIP',
      '2,bad email@prism.io,,Scale,-10.25,missing name',
      '3,missing-domain@,Grace Hopper,Starter,.5,bad email',
    ].join('\n');

    const onImport = vi.fn<(payload: CsvImportPayload) => void>();
    render(<CsvColumnMapper defaultCsvText={csv} onImport={onImport} />);

    // Pass-2 auto-mapping matched customer_email, name, plan, mrr and ignored id & notes
    expect(screen.getByLabelText('Map column id')).toHaveValue('');
    expect(screen.getByLabelText('Map column customer_email')).toHaveValue('email');
    expect(screen.getByLabelText('Map column name')).toHaveValue('fullName');
    expect(screen.getByLabelText('Map column plan')).toHaveValue('planTier');
    expect(screen.getByLabelText('Map column mrr')).toHaveValue('monthlyMrr');
    expect(screen.getByLabelText('Map column notes')).toHaveValue('');
    expect(screen.getByTestId('csv-error-count')).toHaveTextContent('2 errors');

    // Unmap required field -> missing required banner + disabled import
    fireEvent.change(screen.getByLabelText('Map column customer_email'), {
      target: { value: '' },
    });
    expect(screen.getByTestId('csv-missing-required-banner')).toHaveTextContent(
      'Missing required target field: Work Email.'
    );
    expect(screen.getByRole('button', { name: 'Import Valid Rows' })).toBeDisabled();
    expect(screen.getByTestId('csv-import-status')).toHaveTextContent(
      'Resolve schema mapping alerts before importing valid rows.'
    );

    // Unmap second required field -> plural banner
    fireEvent.change(screen.getByLabelText('Map column name'), {
      target: { value: '' },
    });
    expect(screen.getByTestId('csv-missing-required-banner')).toHaveTextContent(
      'Missing required target fields: Work Email, Full Name.'
    );

    // Create duplicate target mapping -> duplicate banner + disabled import
    fireEvent.change(screen.getByLabelText('Map column customer_email'), {
      target: { value: 'email' },
    });
    fireEvent.change(screen.getByLabelText('Map column name'), {
      target: { value: 'fullName' },
    });
    fireEvent.change(screen.getByLabelText('Map column notes'), {
      target: { value: 'email' },
    });
    expect(screen.getByTestId('csv-duplicate-mapping-banner')).toHaveTextContent(
      'Duplicate target assignment: Work Email (customer_email & notes).'
    );
    expect(screen.getByRole('button', { name: 'Import Valid Rows' })).toBeDisabled();

    // Auto-Map Headers resolves duplicate cleanly and announces match count
    fireEvent.click(screen.getByRole('button', { name: 'Auto-Map Headers' }));
    expect(screen.queryByTestId('csv-duplicate-mapping-banner')).not.toBeInTheDocument();
    expect(screen.getByTestId('csv-import-status')).toHaveTextContent('Auto-mapped 4 of 6 columns.');
    expect(screen.getByRole('button', { name: 'Import Valid Rows' })).not.toBeDisabled();

    // Import with multiple skipped rows exercises plural skipped message
    fireEvent.click(screen.getByRole('button', { name: 'Import Valid Rows' }));
    expect(onImport).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('csv-import-status')).toHaveTextContent(
      'Imported 1 valid row (2 invalid rows skipped).'
    );
  });

  it('validates email edge cases, numeric overflow, and empty required cells', () => {
    const csv = [
      'email,full_name,monthly_mrr',
      ',Ada Lovelace,100',
      'a@b@c.com,Double At,200',
      'user@.domain.com,Leading Dot,300',
      'user@domain..com,Double Dot,400',
      'user@domain.c,Short Tld,500',
      `valid@prism.io,Overflow Num,1${'0'.repeat(309)}`,
      'valid2@prism.io,Optional Empty Mrr,',
    ].join('\n');

    render(<CsvColumnMapper defaultCsvText={csv} />);

    expect(screen.getByTestId('csv-preview-row-0')).toHaveTextContent('Work Email is required.');
    expect(screen.getByTestId('csv-preview-row-1')).toHaveAttribute('data-row-status', 'error');
    expect(screen.getByTestId('csv-preview-row-2')).toHaveAttribute('data-row-status', 'error');
    expect(screen.getByTestId('csv-preview-row-3')).toHaveAttribute('data-row-status', 'error');
    expect(screen.getByTestId('csv-preview-row-4')).toHaveAttribute('data-row-status', 'error');
    expect(screen.getByTestId('csv-preview-row-5')).toHaveTextContent('must be a valid number.');
    // Row 6 has empty optional monthlyMrr and renders em-dash cleanly
    const validRow = screen.getByTestId('csv-preview-row-6');
    expect(validRow).toHaveAttribute('data-row-status', 'valid');
    expect(within(validRow).getByText('—')).toBeInTheDocument();
  });

  it('handles CSV file uploads via file.text(), empty selection, and read failures', async () => {
    const onCsvTextChange = vi.fn<(csv: string) => void>();
    render(<CsvColumnMapper defaultCsvText="" onCsvTextChange={onCsvTextChange} />);

    expect(screen.getByTestId('csv-empty-state')).toBeInTheDocument();

    const fileInput = screen.getByTestId('csv-file-input') as HTMLInputElement;
    const clickSpy = vi.spyOn(fileInput, 'click');
    fireEvent.click(screen.getByRole('button', { name: 'Upload CSV' }));
    expect(clickSpy).toHaveBeenCalledTimes(1);

    // Empty files list is a no-op
    fireEvent.change(fileInput, { target: { files: [] } });
    expect(onCsvTextChange).not.toHaveBeenCalled();

    // Valid CSV file upload
    const validFile = createCsvFile(
      'email,full_name\nuploaded@prism.io,Uploaded User',
      'accounts.csv'
    );
    fireEvent.change(fileInput, { target: { files: [validFile] } });

    await waitFor(() => {
      expect(screen.getByTestId('csv-import-status')).toHaveTextContent(
        'Loaded file "accounts.csv".'
      );
    });
    expect(onCsvTextChange).toHaveBeenCalledWith(
      'email,full_name\nuploaded@prism.io,Uploaded User'
    );
    expect(screen.getByTestId('csv-row-count')).toHaveTextContent('1 row');

    // Rejected file.text() reports graceful error status
    const brokenFile = new File(['bad'], 'broken.csv', { type: 'text/csv' });
    Object.defineProperty(brokenFile, 'text', {
      value: () => Promise.reject(new Error('Disk read error')),
    });
    fireEvent.change(fileInput, { target: { files: [brokenFile] } });

    await waitFor(() => {
      expect(screen.getByTestId('csv-import-status')).toHaveTextContent(
        'Unable to read CSV file "broken.csv".'
      );
    });
  });

  it('supports IME-safe Ctrl/Cmd+Enter import shortcut in textarea', () => {
    const onImport = vi.fn<(payload: CsvImportPayload) => void>();
    render(<CsvColumnMapper onImport={onImport} />);
    const textarea = screen.getByLabelText('CSV source data');

    // IME composing Enter MUST NOT trigger import
    fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true, isComposing: true });
    expect(onImport).not.toHaveBeenCalled();

    // Plain Enter without modifier MUST NOT trigger import
    fireEvent.keyDown(textarea, { key: 'Enter' });
    expect(onImport).not.toHaveBeenCalled();

    // Ctrl+Enter triggers import cleanly
    fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });
    expect(onImport).toHaveBeenCalledTimes(1);
  });

  it('defends against __proto__/constructor/prototype headers & target keys, CSV formula injection, and XSS payloads', () => {
    const onImport = vi.fn<(payload: CsvImportPayload) => void>();
    const adversarialFields: ReadonlyArray<CsvTargetField> = [
      { key: '__proto__', label: 'Proto', required: true, type: 'string' },
      { key: 'constructor', label: 'Ctor', required: true, type: 'string' },
      { key: 'prototype', label: 'Prototype', required: false, type: 'string' },
      { key: '   ', label: 'Blank', required: false, type: 'string' },
      { key: 'email', label: 'Email', required: true, type: 'email' },
      { key: 'email', label: 'Duplicate Email Field', required: true, type: 'email' },
      { key: 'fullName', label: '   ', required: true },
      { key: 'notes', label: 'Notes', required: false, type: 'string' },
    ];

    const adversarialCsv = [
      '__proto__,constructor,prototype,email,full_name,notes',
      'polluted,ctor,proto,sec@prism.io,"=CMD|\' /C calc\'!A0","<script>alert(1)</script><img src=x onerror=alert(2)>"',
      'p2,c2,pr2,team@prism.io,+2+3,@SUM(A1:A2)',
    ].join('\n');

    const { container } = render(
      <CsvColumnMapper
        targetFields={adversarialFields}
        defaultCsvText={adversarialCsv}
        onImport={onImport}
      />
    );

    // Unsafe prototype keys are rejected cleanly with banner and alignment preserved
    expect(screen.getByTestId('csv-rejected-headers-banner')).toHaveTextContent(
      'Ignored unsafe header keys: __proto__, constructor, prototype.'
    );
    expect(screen.getByTestId('csv-column-count')).toHaveTextContent('3 columns');
    expect(screen.queryByLabelText('Map column __proto__')).not.toBeInTheDocument();

    // Single unsafe header singular text check
    const textarea = screen.getByLabelText('CSV source data');
    fireEvent.change(textarea, {
      target: {
        value:
          '__proto__,email,full_name,notes\npolluted,sec@prism.io,"=CMD|\' /C calc\'!A0","<script>alert(1)</script><img src=x onerror=alert(2)>"',
      },
    });
    expect(screen.getByTestId('csv-rejected-headers-banner')).toHaveTextContent(
      'Ignored unsafe header key: __proto__.'
    );

    // XSS payloads are rendered strictly as text nodes, never executable DOM elements
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(
      screen.getByText('<script>alert(1)</script><img src=x onerror=alert(2)>')
    ).toBeInTheDocument();

    // Import neutralizes leading formula characters via sanitizeCsvCell and never pollutes Object.prototype
    fireEvent.click(screen.getByRole('button', { name: 'Import Valid Rows' }));
    expect(onImport).toHaveBeenCalledTimes(1);
    const payload = onImport.mock.calls[0]![0];
    expect(payload.validRows).toHaveLength(1);
    expect(payload.validRows[0]).toEqual({
      email: 'sec@prism.io',
      fullName: "'=CMD|' /C calc'!A0",
      notes: '<script>alert(1)</script><img src=x onerror=alert(2)>',
    });
    expect(Object.prototype.hasOwnProperty.call(Object.prototype, 'polluted')).toBe(false);
  });

  it('supports controlled csvText mode, preserves manual overrides on data-only updates, and handles empty title fallback', () => {
    const onCsvTextChange = vi.fn<(csv: string) => void>();
    const initialCsv = 'col_a,col_b\nada@prism.io,Ada';
    const { rerender } = render(
      <CsvColumnMapper
        title="   "
        aria-label="Custom Mapper Region"
        csvText={initialCsv}
        onCsvTextChange={onCsvTextChange}
      />
    );

    expect(screen.getByRole('region', { name: 'Custom Mapper Region' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'CSV Column Mapper' })).toBeInTheDocument();

    // Manually map columns
    fireEvent.change(screen.getByLabelText('Map column col_a'), { target: { value: 'email' } });
    fireEvent.change(screen.getByLabelText('Map column col_b'), { target: { value: 'fullName' } });

    // Editing textarea calls onCsvTextChange without mutating controlled value until parent rerenders
    fireEvent.change(screen.getByLabelText('CSV source data'), {
      target: { value: 'col_a,col_b\ngrace@prism.io,Grace' },
    });
    expect(onCsvTextChange).toHaveBeenCalledWith('col_a,col_b\ngrace@prism.io,Grace');
    expect(screen.getByLabelText('CSV source data')).toHaveValue(initialCsv);

    // Rerender with same headers and new data row -> preserves manual mapping overrides
    rerender(
      <CsvColumnMapper
        title="Customer Ledger"
        csvText={'col_a,col_b\ngrace@prism.io,Grace'}
        onCsvTextChange={onCsvTextChange}
      />
    );
    expect(screen.getByLabelText('Map column col_a')).toHaveValue('email');
    expect(screen.getByLabelText('Map column col_b')).toHaveValue('fullName');
    expect(screen.getByText('Grace')).toBeInTheDocument();
  });

  it('respects disabled state, forwards React 19 ref, and composes theme overrides and xstyle cleanly', () => {
    const rootRef = createRef<HTMLDivElement>();
    const onImport = vi.fn<(payload: CsvImportPayload) => void>();
    const onCsvTextChange = vi.fn<(csv: string) => void>();

    render(
      <PrismThemeProvider
        scope="local"
        theme={{
          components: {
            CsvColumnMapper: {
              className: 'custom-theme-mapper',
              style: { '--prism-blur-px': '24px' },
            },
          },
        }}
      >
        <CsvColumnMapper
          ref={rootRef}
          disabled
          data-testid="mapper-root"
          className="consumer-mapper-class"
          style={{ marginTop: 8 }}
          xstyle={{ '--prism-radius-slab': '28px' }}
          onImport={onImport}
          onCsvTextChange={onCsvTextChange}
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('mapper-root');
    expect(rootRef.current).toBe(root);
    expect(root).toHaveClass('refractor-csv-column-mapper');
    expect(root).toHaveClass('prism-slab');
    expect(root).toHaveClass('custom-theme-mapper');
    expect(root).toHaveClass('consumer-mapper-class');
    expect(root).toHaveAttribute('data-disabled', 'true');
    expect(root.style.marginTop).toBe('8px');
    expect(root.style.getPropertyValue('--prism-blur-px')).toBe('24px');
    expect(root.style.getPropertyValue('--prism-radius-slab')).toBe('28px');

    expect(screen.getByLabelText('CSV source data')).toBeDisabled();
    expect(screen.getByTestId('csv-file-input')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Upload CSV' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Load Sample' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Clear' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Auto-Map Headers' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Import Valid Rows' })).toBeDisabled();
    expect(screen.getByLabelText('Map column email')).toBeDisabled();

    // Even direct programmatic events while disabled must not trigger callbacks
    fireEvent.click(screen.getByRole('button', { name: 'Import Valid Rows' }));
    fireEvent.click(screen.getByRole('button', { name: 'Load Sample' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    fireEvent.click(screen.getByRole('button', { name: 'Auto-Map Headers' }));
    fireEvent.change(screen.getByLabelText('Map column email'), { target: { value: '' } });
    fireEvent.change(screen.getByTestId('csv-file-input'), {
      target: { files: [createCsvFile('a\n1')] },
    });
    expect(onImport).not.toHaveBeenCalled();
    expect(onCsvTextChange).not.toHaveBeenCalled();
  });
});
