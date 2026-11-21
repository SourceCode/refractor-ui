import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { MatrixHeatmap, type HeatmapCell, type MatrixHeatmapTone } from './index';

const SAMPLE_ROWS = ['Mon', 'Tue', 'Wed'];
const SAMPLE_COLS = ['00:00', '08:00', '16:00'];
const SAMPLE_CELLS: HeatmapCell[] = [
  { row: 0, col: 0, value: 0 },
  { row: 0, col: 1, value: 25.5 },
  { row: 0, col: 2, value: 50 },
  { row: 1, col: 0, value: 10 },
  { row: 1, col: 1, value: 75 },
  { row: 1, col: 2, value: 100 },
  { row: 2, col: 0, value: 20 },
  { row: 2, col: 1, value: 60 },
];

describe('MatrixHeatmap', () => {
  it('renders semantic table, 5-step Low-to-High legend, ref, theme overrides, and opacity-ramped --prism-* cells', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <PrismThemeProvider
        theme={{
          components: {
            MatrixHeatmap: { className: 'theme-heatmap', style: { maxWidth: '720px' } },
          },
        }}
      >
        <MatrixHeatmap
          ref={ref}
          rowLabels={SAMPLE_ROWS}
          colLabels={SAMPLE_COLS}
          cells={SAMPLE_CELLS}
          valueUnit="%"
          className="consumer-heatmap"
          xstyle={{ '--prism-blur-px': '14px' }}
          data-testid="heatmap-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('heatmap-root');
    expect(ref.current).toBe(root);
    expect(MatrixHeatmap.displayName).toBe('MatrixHeatmap');
    expect(root).toHaveClass(
      'refractor-matrix-heatmap',
      'prism-slab',
      'theme-heatmap',
      'consumer-heatmap'
    );
    expect(root).toHaveStyle({ maxWidth: '720px' });
    expect(root).toHaveAttribute('data-tone', 'primary');
    expect(root).not.toHaveAttribute('data-empty');

    expect(screen.getByRole('heading', { name: 'Matrix Heatmap' })).toBeInTheDocument();

    const legend = screen.getByTestId('matrix-heatmap-legend');
    expect(within(legend).getByText('Low')).toBeInTheDocument();
    expect(within(legend).getByText('High')).toBeInTheDocument();
    const steps = legend.querySelectorAll('[data-role="heatmap-legend-step"]');
    expect(steps).toHaveLength(5);

    const table = screen.getByRole('table', { name: 'Matrix Heatmap' });
    expect(table.querySelector('thead')).not.toBeNull();
    expect(table.querySelector('tbody')).not.toBeNull();
    expect(table.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(table.innerHTML).not.toMatch(/\b(?:rgba?|hsla?)\s*\(/);

    // Min value (0) gets opacity 0.1, max value (100) gets opacity 0.9
    const minCell = screen.getByRole('button', { name: 'Mon × 00:00: 0%' });
    const maxCell = screen.getByRole('button', { name: 'Tue × 16:00: 100%' });
    expect(minCell).toHaveAttribute('data-opacity', '0.1');
    expect(maxCell).toHaveAttribute('data-opacity', '0.9');

    const minTint = minCell.querySelector('[data-role="heatmap-cell-tint"]') as HTMLElement | null;
    const maxTint = maxCell.querySelector('[data-role="heatmap-cell-tint"]') as HTMLElement | null;
    expect(minTint?.style.backgroundColor).toBe('var(--prism-primary-main)');
    expect(minTint?.style.opacity).toBe('0.1');
    expect(maxTint?.style.opacity).toBe('0.9');

    // Missing coordinate (row 2, col 2) renders non-interactive empty placeholder
    const missingCell = table.querySelector('[data-empty-cell="true"]');
    expect(missingCell).not.toBeNull();
    expect(missingCell).toHaveTextContent('—');

    const readout = screen.getByTestId('matrix-heatmap-readout');
    expect(readout).toHaveClass('prism-well');
    expect(readout).toHaveTextContent('Select or focus any cell to inspect exact matrix values.');
    expect(screen.getByTestId('matrix-heatmap-range')).toHaveTextContent('Range: 0% – 100%');
  });

  it('selects cells on click, focus, and keyboard (IME-safe), fires onSelectCell, and updates recessed readout', () => {
    const onSelectCell = vi.fn();
    render(
      <MatrixHeatmap
        title="Traffic Load"
        rowLabels={SAMPLE_ROWS}
        colLabels={SAMPLE_COLS}
        cells={SAMPLE_CELLS}
        valueUnit="%"
        onSelectCell={onSelectCell}
      />
    );

    const target = screen.getByRole('button', { name: 'Mon × 08:00: 25.5%' });
    fireEvent.click(target);
    expect(target).toHaveAttribute('data-selected', 'true');
    expect(target).toHaveAttribute('aria-pressed', 'true');
    expect(onSelectCell).toHaveBeenCalledWith({ row: 0, col: 1, value: 25.5 }, 'Mon', '08:00');
    expect(screen.getByTestId('matrix-heatmap-readout')).toHaveTextContent('Mon × 08:00: 25.5%');

    // Focus selects another cell
    const focusCell = screen.getByRole('button', { name: 'Tue × 08:00: 75%' });
    fireEvent.focus(focusCell);
    expect(focusCell).toHaveAttribute('data-selected', 'true');
    expect(onSelectCell).toHaveBeenLastCalledWith({ row: 1, col: 1, value: 75 }, 'Tue', '08:00');
    expect(screen.getByTestId('matrix-heatmap-readout')).toHaveTextContent('Tue × 08:00: 75%');

    // IME composing Enter ignored
    const wedCell = screen.getByRole('button', { name: 'Wed × 08:00: 60%' });
    fireEvent.keyDown(wedCell, { key: 'Enter', isComposing: true });
    expect(onSelectCell).toHaveBeenCalledTimes(2);

    // Non-activation key ignored
    fireEvent.keyDown(wedCell, { key: 'Escape' });
    expect(onSelectCell).toHaveBeenCalledTimes(2);

    // Enter activates
    fireEvent.keyDown(wedCell, { key: 'Enter' });
    expect(onSelectCell).toHaveBeenLastCalledWith({ row: 2, col: 1, value: 60 }, 'Wed', '08:00');
    expect(screen.getByTestId('matrix-heatmap-readout')).toHaveTextContent('Wed × 08:00: 60%');

    // Space activates
    const monMax = screen.getByRole('button', { name: 'Mon × 16:00: 50%' });
    fireEvent.keyDown(monMax, { key: ' ' });
    expect(onSelectCell).toHaveBeenLastCalledWith({ row: 0, col: 2, value: 50 }, 'Mon', '16:00');
    expect(screen.getByTestId('matrix-heatmap-readout')).toHaveTextContent('Mon × 16:00: 50%');
  });

  it('supports all semantic tones and showValues={false} while keeping aria-labels and readout intact', () => {
    const toneCases: ReadonlyArray<{ tone: MatrixHeatmapTone; token: string }> = [
      { tone: 'primary', token: 'var(--prism-primary-main)' },
      { tone: 'secondary', token: 'var(--prism-secondary-main)' },
      { tone: 'emerald', token: 'var(--prism-success-main)' },
      { tone: 'rose', token: 'var(--prism-error-main)' },
    ];

    const { rerender } = render(
      <MatrixHeatmap
        rowLabels={['R1']}
        colLabels={['C1', 'C2']}
        cells={[{ row: 0, col: 0, value: 12 }]}
        tone="primary"
        showValues={false}
        data-testid="tone-heatmap"
      />
    );

    const cellBtn = screen.getByRole('button', { name: 'R1 × C1: 12' });
    expect(cellBtn).toHaveTextContent('');
    const emptySlot = screen.getByTestId('tone-heatmap').querySelector('[data-empty-cell="true"]');
    expect(emptySlot).toHaveTextContent('');

    for (const tc of toneCases) {
      rerender(
        <MatrixHeatmap
          rowLabels={['R1']}
          colLabels={['C1']}
          cells={[{ row: 0, col: 0, value: 12 }]}
          tone={tc.tone}
          showValues={false}
          data-testid="tone-heatmap"
        />
      );
      expect(screen.getByTestId('tone-heatmap')).toHaveAttribute('data-tone', tc.tone);
      const tint = screen
        .getByRole('button', { name: 'R1 × C1: 12' })
        .querySelector('[data-role="heatmap-cell-tint"]') as HTMLElement | null;
      expect(tint?.style.backgroundColor).toBe(tc.token);
      // Single equal value -> midpoint 0.5 opacity
      expect(tint?.style.opacity).toBe('0.5');
    }
  });

  it('sanitizes out-of-bounds, non-integer, non-finite, and -0 cells, and recovers cleanly when matrix shrinks', () => {
    const dirtyCells: HeatmapCell[] = [
      { row: -1, col: 0, value: 99 },
      { row: 0, col: 5, value: 99 },
      { row: 1.5, col: 0, value: 50 },
      { row: 0, col: 0, value: Number.NaN },
      { row: 0, col: 1, value: Number.POSITIVE_INFINITY },
      { row: 0, col: 0, value: -0 },
      { row: 1, col: 1, value: 40 },
    ];

    const { rerender } = render(
      <MatrixHeatmap rowLabels={['A', 'B']} colLabels={['X', 'Y']} cells={dirtyCells} />
    );

    const zeroBtn = screen.getByRole('button', { name: 'A × X: 0' });
    expect(zeroBtn).toHaveAttribute('data-value', '0');
    const bYBtn = screen.getByRole('button', { name: 'B × Y: 40' });
    fireEvent.click(bYBtn);
    expect(screen.getByTestId('matrix-heatmap-readout')).toHaveTextContent('B × Y: 40');

    // Shrink rows/cols so selected (1,1) is out of bounds -> readout clears safely
    rerender(
      <MatrixHeatmap rowLabels={['A']} colLabels={['X']} cells={[{ row: 0, col: 0, value: 5 }]} />
    );
    expect(screen.getByTestId('matrix-heatmap-readout')).toHaveTextContent(
      'Select or focus any cell to inspect exact matrix values.'
    );

    // Select (0,0), then remove its cell entry -> readout clears safely and range badge hides
    fireEvent.click(screen.getByRole('button', { name: 'A × X: 5' }));
    expect(screen.getByTestId('matrix-heatmap-readout')).toHaveTextContent('A × X: 5');

    rerender(<MatrixHeatmap rowLabels={['A']} colLabels={['X']} cells={[]} />);
    expect(screen.getByTestId('matrix-heatmap-readout')).toHaveTextContent(
      'Select or focus any cell to inspect exact matrix values.'
    );
    expect(screen.queryByTestId('matrix-heatmap-range')).toBeNull();
  });

  it('renders clean empty states and stays immune to prototype-pollution keys and XSS payloads', () => {
    const { rerender } = render(
      <MatrixHeatmap rowLabels={[]} colLabels={['C1']} cells={[]} data-testid="hm-empty" />
    );
    expect(screen.getByTestId('hm-empty')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByTestId('matrix-heatmap-empty')).toHaveTextContent(
      'No matrix data to display.'
    );
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.queryByTestId('matrix-heatmap-readout')).toBeNull();

    rerender(
      <MatrixHeatmap rowLabels={['R1']} colLabels={[]} cells={[]} data-testid="hm-empty" />
    );
    expect(screen.getByTestId('hm-empty')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByTestId('matrix-heatmap-empty')).toBeInTheDocument();

    const xssPayload = '<script>window.__hmXss=1</script><img src=x onerror=alert(1)>';
    const onSelectCell = vi.fn();
    rerender(
      <MatrixHeatmap
        title={xssPayload}
        rowLabels={['__proto__', 'constructor', 'prototype']}
        colLabels={['__proto__', xssPayload]}
        cells={[
          { row: 0, col: 0, value: 11 },
          { row: 1, col: 1, value: 22 },
          { row: 2, col: 0, value: 33 },
        ]}
        onSelectCell={onSelectCell}
      />
    );

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByRole('heading', { name: xssPayload })).toBeInTheDocument();

    const protoCell = screen.getByRole('button', { name: '__proto__ × __proto__: 11' });
    fireEvent.click(protoCell);
    expect(onSelectCell).toHaveBeenCalledWith(
      { row: 0, col: 0, value: 11 },
      '__proto__',
      '__proto__'
    );
    expect(screen.getByTestId('matrix-heatmap-readout')).toHaveTextContent(
      '__proto__ × __proto__: 11'
    );

    // Ensure Object.prototype was not polluted
    const probe: Record<string, string> = {};
    expect(probe['prototype']).toBeUndefined();
  });
});
