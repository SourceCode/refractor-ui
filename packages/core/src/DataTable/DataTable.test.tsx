import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { DataTable, type DataTableRow } from './DataTable';

const SAMPLE_ROWS: DataTableRow[] = [
  {
    id: 'PRJ-101',
    project: 'Refractor Button Primitives',
    owner: 'Clara Vance',
    department: 'Design',
    status: 'Active',
    completion: 96,
    budgetUsd: 48500,
    updatedAt: '2026-11-20',
  },
  {
    id: 'PRJ-102',
    project: 'Accessible Dialog Manager',
    owner: 'Elena Rostova',
    department: 'Platform',
    status: 'Review',
    completion: 78,
    budgetUsd: 39200,
    updatedAt: '2026-11-18',
  },
  {
    id: 'PRJ-103',
    project: 'Touch Sheet Physics',
    owner: 'Marcus Chen',
    department: 'Optics',
    status: 'Archived',
    completion: 100,
    budgetUsd: 53000,
    updatedAt: '2026-11-10',
  },
];

describe('DataTable', () => {
  it('renders rows, status tones, ascending sort indicator, selection state, and ref/className passthrough', () => {
    const ref = createRef<HTMLDivElement>();
    const onSortChange = vi.fn();
    const onToggleSelect = vi.fn();

    render(
      <DataTable
        ref={ref}
        rows={SAMPLE_ROWS}
        sortBy="project"
        sortDir="asc"
        onSortChange={onSortChange}
        selectedIds={['PRJ-101']}
        onToggleSelect={onToggleSelect}
        className="custom-table"
        data-testid="data-table"
      />
    );

    const root = screen.getByTestId('data-table');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass('refractor-data-table', 'prism-slab', 'custom-table');
    expect(root).toHaveAttribute('data-sort-by', 'project');
    expect(root).toHaveAttribute('data-sort-dir', 'asc');

    const projectHeader = screen.getByRole('columnheader', { name: 'Component Track' });
    expect(projectHeader).toHaveAttribute('aria-sort', 'ascending');
    expect(screen.getByRole('columnheader', { name: 'Lead' })).toHaveAttribute('aria-sort', 'none');

    expect(screen.getByText('Active')).toHaveClass('text-emerald-700');
    expect(screen.getByText('Review')).toHaveClass('text-amber-700');
    expect(screen.getByText('Archived')).toHaveClass('text-slate-500');
    expect(screen.getByText('96%')).toBeInTheDocument();
    expect(screen.getByText(`$${(48500).toLocaleString()}`)).toBeInTheDocument();

    const checkbox = screen.getByRole('checkbox', { name: 'Select Refractor Button Primitives' });
    expect(checkbox).toBeChecked();
    fireEvent.click(checkbox);
    expect(onToggleSelect).toHaveBeenCalledWith('PRJ-101');

    fireEvent.click(screen.getByRole('button', { name: 'Lead' }));
    expect(onSortChange).toHaveBeenCalledWith('owner');

    fireEvent.click(screen.getByRole('button', { name: 'Allocation' }));
    expect(onSortChange).toHaveBeenCalledWith('budgetUsd');
  });

  it('renders descending sort state and applies theme overrides without clobbering className', () => {
    render(
      <PrismThemeProvider
        theme={{
          components: { DataTable: { className: 'theme-table', style: { opacity: '0.98' } } },
        }}
      >
        <DataTable
          rows={SAMPLE_ROWS}
          sortBy="completion"
          sortDir="desc"
          onSortChange={vi.fn()}
          selectedIds={[]}
          onToggleSelect={vi.fn()}
          className="local-table"
          data-testid="desc-table"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('desc-table');
    expect(root).toHaveClass('refractor-data-table', 'theme-table', 'local-table');
    expect(root).toHaveStyle({ opacity: '0.98' });
    expect(screen.getByRole('columnheader', { name: 'Progress' })).toHaveAttribute(
      'aria-sort',
      'descending'
    );
  });

  it('renders empty state inside tbody when rows is empty (negative test)', () => {
    render(
      <DataTable
        rows={[]}
        sortBy="id"
        sortDir="asc"
        onSortChange={vi.fn()}
        selectedIds={[]}
        onToggleSelect={vi.fn()}
        emptyMessage="No matching optical tracks"
        data-testid="empty-table"
      />
    );

    const root = screen.getByTestId('empty-table');
    expect(root).toHaveAttribute('data-empty', 'true');
    expect(screen.getByText('No matching optical tracks')).toBeInTheDocument();
  });

  it('safely renders adversarial XSS strings inside row cells as literal text', () => {
    const payload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';
    const xssRows: DataTableRow[] = [
      {
        id: payload,
        project: payload,
        owner: payload,
        department: 'Optics',
        status: payload,
        completion: 50,
        budgetUsd: 1000,
        updatedAt: '2026-11-20',
      },
    ];

    render(
      <DataTable
        rows={xssRows}
        sortBy="id"
        sortDir="asc"
        onSortChange={vi.fn()}
        selectedIds={[]}
        onToggleSelect={vi.fn()}
      />
    );

    expect(screen.getAllByText(payload)).toHaveLength(4);
    expect(document.querySelector('script')).toBeNull();
  });
});
