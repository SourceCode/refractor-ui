import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  CohortRetentionGrid,
  type CohortColorTone,
  type CohortRetentionRow,
} from './index';

describe('CohortRetentionGrid', () => {
  it('renders default 6-cohort triangular matrix, responsive overflow-x-auto wrapper, weighted header pills, legend, ref, and theme overrides', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <PrismThemeProvider
        theme={{
          components: {
            CohortRetentionGrid: {
              className: 'theme-cohort-grid',
              style: { maxWidth: '880px' },
            },
          },
        }}
      >
        <CohortRetentionGrid
          ref={ref}
          className="consumer-cohort-grid"
          xstyle={{ '--prism-blur-px': '14px' }}
          data-testid="cohort-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('cohort-root');
    expect(ref.current).toBe(root);
    expect(CohortRetentionGrid.displayName).toBe('CohortRetentionGrid');
    expect(root).toHaveClass(
      'refractor-cohort-retention-grid',
      'prism-slab',
      'theme-cohort-grid',
      'consumer-cohort-grid'
    );
    expect(root).toHaveStyle({ maxWidth: '880px' });
    expect(root).toHaveAttribute('data-tone', 'emerald');
    expect(root).toHaveAttribute('data-show-average-row', 'true');
    expect(root).not.toHaveAttribute('data-empty');

    expect(screen.getByRole('heading', { name: 'Cohort Retention Matrix' })).toBeInTheDocument();
    expect(screen.getByTestId('cohort-total-users')).toHaveTextContent('9,460 users');
    expect(screen.getByTestId('cohort-m1-pill')).toHaveTextContent('M1 Avg82.8%');
    expect(screen.getByTestId('cohort-m3-pill')).toHaveTextContent('M3 Avg63.6%');

    const legend = screen.getByTestId('cohort-intensity-legend');
    expect(within(legend).getByText('0%')).toBeInTheDocument();
    expect(within(legend).getByText('100%')).toBeInTheDocument();
    const steps = legend.querySelectorAll('[data-role="cohort-legend-step"]');
    expect(steps).toHaveLength(5);

    const wrapper = screen.getByTestId('cohort-table-wrapper');
    expect(wrapper).toHaveClass('prism-well', 'rounded-2xl', 'p-2', 'overflow-x-auto');

    const table = screen.getByRole('table', { name: 'Cohort Retention Matrix' });
    expect(table.parentElement).toBe(wrapper);
    expect(table.querySelector('thead')).not.toBeNull();
    expect(table.querySelector('tbody')).not.toBeNull();
    expect(table.querySelector('tfoot')).not.toBeNull();

    // Zero raw hex/rgb/hsl color literals in rendered markup
    expect(root.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(root.innerHTML).not.toMatch(/\b(?:rgba?|hsla?)\s*\(/);

    // 6x6 triangular matrix: 21 elapsed buttons + 15 unelapsed dashes
    const cellButtons = within(table).getAllByRole('button');
    expect(cellButtons).toHaveLength(21);
    const emptyCells = table.querySelectorAll('[data-empty-cell="true"]');
    expect(emptyCells).toHaveLength(15);
    expect(emptyCells[0]).toHaveTextContent('—');

    // Weighted average footer values
    const footer = screen.getByTestId('cohort-average-footer');
    expect(within(footer).getByText('Weighted Avg')).toBeInTheDocument();
    expect(within(footer).getByText('9,460')).toBeInTheDocument();
    const avgCells = footer.querySelectorAll('[data-role="cohort-avg-cell"]');
    expect(avgCells).toHaveLength(6);
    expect(avgCells[0]).toHaveTextContent('100.0%');
    expect(avgCells[1]).toHaveTextContent('82.8%');
    expect(avgCells[3]).toHaveTextContent('63.6%');
    expect(avgCells[5]).toHaveTextContent('53.1%');

    const readout = screen.getByTestId('cohort-retention-readout');
    expect(readout).toHaveAttribute('aria-live', 'polite');
    expect(readout).toHaveTextContent(
      'Select any elapsed cohort cell to inspect retention and retained users.'
    );
  });

  it('selects cells on click and IME-safe Enter/Space, fires onSelectCell, and updates recessed inspector', () => {
    const onSelectCell = vi.fn();
    render(<CohortRetentionGrid onSelectCell={onSelectCell} />);

    const janM2 = screen.getByRole('button', {
      name: 'Jan 2026, M2: 68.0% retained (843 of 1,240 users)',
    });
    fireEvent.click(janM2);

    expect(janM2).toHaveAttribute('aria-pressed', 'true');
    expect(janM2).toHaveAttribute('data-selected', 'true');
    expect(onSelectCell).toHaveBeenCalledWith({
      cohortId: '2026-01',
      cohortLabel: 'Jan 2026',
      cohortSize: 1240,
      periodIndex: 2,
      periodLabel: 'M2',
      retentionPct: 68,
      retainedUsers: 843,
    });
    expect(screen.getByTestId('cohort-retention-readout')).toHaveTextContent(
      'Jan 2026 · M2 · 68.0% retained · 843 of 1,240 users'
    );

    const febM1 = screen.getByRole('button', {
      name: 'Feb 2026, M1: 81.2% retained (1,121 of 1,380 users)',
    });

    // IME composing Enter & Space are ignored
    fireEvent.keyDown(febM1, { key: 'Enter', isComposing: true });
    fireEvent.keyDown(febM1, { key: ' ', isComposing: true });
    expect(onSelectCell).toHaveBeenCalledTimes(1);

    // Non-activation key is ignored
    fireEvent.keyDown(febM1, { key: 'Escape' });
    expect(onSelectCell).toHaveBeenCalledTimes(1);

    // Enter activates
    fireEvent.keyDown(febM1, { key: 'Enter' });
    expect(onSelectCell).toHaveBeenLastCalledWith({
      cohortId: '2026-02',
      cohortLabel: 'Feb 2026',
      cohortSize: 1380,
      periodIndex: 1,
      periodLabel: 'M1',
      retentionPct: 81.2,
      retainedUsers: 1121,
    });
    expect(febM1).toHaveAttribute('aria-pressed', 'true');
    expect(janM2).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('cohort-retention-readout')).toHaveTextContent(
      'Feb 2026 · M1 · 81.2% retained · 1,121 of 1,380 users'
    );

    // Space activates
    const marM3 = screen.getByRole('button', {
      name: 'Mar 2026, M3: 65.4% retained (988 of 1,510 users)',
    });
    fireEvent.keyDown(marM3, { key: ' ' });
    expect(onSelectCell).toHaveBeenLastCalledWith({
      cohortId: '2026-03',
      cohortLabel: 'Mar 2026',
      cohortSize: 1510,
      periodIndex: 3,
      periodLabel: 'M3',
      retentionPct: 65.4,
      retainedUsers: 988,
    });
    expect(screen.getByTestId('cohort-retention-readout')).toHaveTextContent(
      'Mar 2026 · M3 · 65.4% retained · 988 of 1,510 users'
    );
  });

  it('supports all tones, custom periodPrefix with whitespace fallback, and showAverageRow={false}', () => {
    const sampleCohorts: CohortRetentionRow[] = [
      { id: 'w1', label: 'Week 1', size: 500, retentionPct: [100, 42.5] },
      { id: 'w2', label: 'Week 2', size: 500, retentionPct: [100, null] },
    ];

    const toneCases: ReadonlyArray<{ tone: CohortColorTone; token: string; contrast: string }> = [
      {
        tone: 'primary',
        token: 'var(--prism-primary-main)',
        contrast: 'var(--prism-primary-contrast)',
      },
      {
        tone: 'emerald',
        token: 'var(--prism-success-main)',
        contrast: 'var(--prism-success-contrast)',
      },
      {
        tone: 'info',
        token: 'var(--prism-info-main)',
        contrast: 'var(--prism-info-contrast)',
      },
    ];

    const { rerender } = render(
      <CohortRetentionGrid
        cohorts={sampleCohorts}
        periodPrefix="W"
        tone="primary"
        showAverageRow={false}
        title="Weekly Cohorts"
        data-testid="custom-cohort"
      />
    );

    expect(screen.queryByTestId('cohort-average-footer')).toBeNull();
    expect(screen.getByTestId('cohort-m1-pill')).toHaveTextContent('W1 Avg42.5%');
    // Period 3 does not exist in 2-period dataset -> renders em-dash
    expect(screen.getByTestId('cohort-m3-pill')).toHaveTextContent('W3 Avg—');

    for (const tc of toneCases) {
      rerender(
        <CohortRetentionGrid
          cohorts={sampleCohorts}
          periodPrefix="W"
          tone={tc.tone}
          showAverageRow={false}
          data-testid="custom-cohort"
        />
      );
      expect(screen.getByTestId('custom-cohort')).toHaveAttribute('data-tone', tc.tone);

      const highCell = screen.getByRole('button', {
        name: 'Week 1, W0: 100.0% retained (500 of 500 users)',
      });
      const lowCell = screen.getByRole('button', {
        name: 'Week 1, W1: 42.5% retained (213 of 500 users)',
      });
      const highTint = highCell.querySelector('[data-role="cohort-cell-tint"]') as HTMLElement;
      const lowTint = lowCell.querySelector('[data-role="cohort-cell-tint"]') as HTMLElement;

      expect(highTint.style.backgroundColor).toBe(tc.token);
      expect(highTint.style.opacity).toBe('0.88');
      expect(highCell.style.color).toBe(tc.contrast);

      expect(lowTint.style.backgroundColor).toBe(tc.token);
      expect(lowTint.style.opacity).toBe('0.42');
      expect(lowCell.style.color).toBe('var(--prism-text-primary)');
    }

    // Whitespace-only periodPrefix safely falls back to 'M'
    rerender(
      <CohortRetentionGrid cohorts={sampleCohorts} periodPrefix="   " showAverageRow={false} />
    );
    expect(screen.getByRole('columnheader', { name: 'M0' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'M1' })).toBeInTheDocument();
  });

  it('sanitizes malformed sizes/percentages, handles jagged rows, zero-weight averages, all-null columns, and clears stale selection on shrink', () => {
    const dirtyCohorts: CohortRetentionRow[] = [
      {
        id: 'c1',
        label: 'Cohort A',
        size: Number.NaN,
        retentionPct: [145, -15, Number.NaN, null],
      },
      {
        id: 'c2',
        label: 'Cohort B',
        size: -40,
        retentionPct: [-0, Number.POSITIVE_INFINITY],
      },
    ];

    const { rerender } = render(<CohortRetentionGrid cohorts={dirtyCohorts} />);

    // Both sizes sanitized to 0 -> unweighted mean fallback for M0: (100 + 0) / 2 = 50.0%
    expect(screen.getByTestId('cohort-total-users')).toHaveTextContent('0 users');
    const footer = screen.getByTestId('cohort-average-footer');
    const avgCells = footer.querySelectorAll('[data-role="cohort-avg-cell"]');
    expect(avgCells[0]).toHaveTextContent('50.0%');
    expect(avgCells[1]).toHaveTextContent('0.0%');
    // Period 2 (NaN + missing) and Period 3 (null + missing) -> unelapsed '—'
    expect(avgCells[2]).toHaveTextContent('—');
    expect(avgCells[3]).toHaveTextContent('—');

    const cellA0 = screen.getByRole('button', {
      name: 'Cohort A, M0: 100.0% retained (0 of 0 users)',
    });
    const cellB0 = screen.getByRole('button', {
      name: 'Cohort B, M0: 0.0% retained (0 of 0 users)',
    });
    expect(cellB0).toHaveAttribute('data-retention', '0.0');

    // Select Cohort A M0, then mutate cell to null -> readout clears cleanly
    fireEvent.click(cellA0);
    expect(screen.getByTestId('cohort-retention-readout')).toHaveTextContent(
      'Cohort A · M0 · 100.0% retained · 0 of 0 users'
    );

    rerender(
      <CohortRetentionGrid
        cohorts={[{ id: 'c1', label: 'Cohort A', size: 100, retentionPct: [null] }]}
      />
    );
    expect(screen.getByTestId('cohort-retention-readout')).toHaveTextContent(
      'Select any elapsed cohort cell to inspect retention and retained users.'
    );

    // Select a cell at index (1, 1), then shrink rows so cohortIndex is out-of-bounds
    rerender(
      <CohortRetentionGrid
        cohorts={[
          { id: 'a', label: 'Alpha', size: 100, retentionPct: [100, 50] },
          { id: 'b', label: 'Beta', size: 200, retentionPct: [100, 75] },
        ]}
      />
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Beta, M1: 75.0% retained (150 of 200 users)' })
    );
    expect(screen.getByTestId('cohort-retention-readout')).toHaveTextContent(
      'Beta · M1 · 75.0% retained · 150 of 200 users'
    );

    rerender(
      <CohortRetentionGrid cohorts={[{ id: 'a', label: 'Alpha', size: 100, retentionPct: [] }]} />
    );
    expect(screen.getByTestId('cohort-retention-readout')).toHaveTextContent(
      'Select any elapsed cohort cell to inspect retention and retained users.'
    );
  });

  it('renders clean role="status" empty state and resists XSS and prototype-pollution payloads', () => {
    const { rerender } = render(
      <CohortRetentionGrid cohorts={[]} data-testid="empty-cohort" />
    );

    expect(screen.getByTestId('empty-cohort')).toHaveAttribute('data-empty', 'true');
    const emptyStatus = screen.getByRole('status');
    expect(emptyStatus).toHaveTextContent('No cohort retention data to display.');
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.queryByTestId('cohort-total-users')).toBeNull();
    expect(screen.queryByTestId('cohort-retention-readout')).toBeNull();

    const xssPayload = '<script>window.__cohortXss=1</script><img src=x onerror=alert(1)>';
    const onSelectCell = vi.fn();
    rerender(
      <CohortRetentionGrid
        title={xssPayload}
        cohorts={[
          { id: '__proto__', label: '__proto__', size: 100, retentionPct: [100, 80] },
          { id: 'constructor', label: xssPayload, size: 200, retentionPct: [100, null] },
          { id: 'prototype', label: 'prototype', size: 300, retentionPct: [100, 60] },
        ]}
        onSelectCell={onSelectCell}
      />
    );

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByRole('heading', { name: xssPayload })).toBeInTheDocument();

    const protoCell = screen.getByRole('button', {
      name: '__proto__, M1: 80.0% retained (80 of 100 users)',
    });
    fireEvent.click(protoCell);
    expect(onSelectCell).toHaveBeenCalledWith({
      cohortId: '__proto__',
      cohortLabel: '__proto__',
      cohortSize: 100,
      periodIndex: 1,
      periodLabel: 'M1',
      retentionPct: 80,
      retainedUsers: 80,
    });
    expect(screen.getByTestId('cohort-retention-readout')).toHaveTextContent(
      '__proto__ · M1 · 80.0% retained · 80 of 100 users'
    );

    const probe: Record<string, string> = {};
    expect(probe['prototype']).toBeUndefined();
  });
});
