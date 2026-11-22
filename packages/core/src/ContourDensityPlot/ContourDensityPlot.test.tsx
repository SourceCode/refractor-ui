import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  CONTOUR_GRID_COLS,
  CONTOUR_GRID_ROWS,
  ContourDensityPlot,
  DEFAULT_CONTOUR_POINTS,
  type ContourCellReading,
  type ContourSamplePoint,
  type ContourTone,
} from './index';

describe('ContourDensityPlot', () => {
  it('renders default 32-point bimodal optical cluster, forwards ref, merges overrides, and uses --prism-* tokens exclusively', () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <PrismThemeProvider
        theme={{
          components: {
            ContourDensityPlot: {
              className: 'theme-contour',
              style: { maxWidth: '640px' },
            },
          },
        }}
      >
        <ContourDensityPlot
          ref={ref}
          className="consumer-contour"
          xstyle={{ '--prism-blur-px': '14px' }}
          style={{ padding: '20px' }}
          data-testid="contour-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('contour-root');
    expect(ref.current).toBe(root);
    expect(ContourDensityPlot.displayName).toBe('ContourDensityPlot');
    expect(root).toHaveClass(
      'refractor-contour-density-plot',
      'prism-slab',
      'theme-contour',
      'consumer-contour'
    );
    expect(root).toHaveStyle({ maxWidth: '640px', padding: '20px' });
    expect(root).toHaveAttribute('data-tone', 'primary');
    expect(root).toHaveAttribute('data-levels', '5');
    expect(root).toHaveAttribute('data-show-points', 'true');
    expect(root).not.toHaveAttribute('data-empty');

    expect(DEFAULT_CONTOUR_POINTS).toHaveLength(32);
    expect(screen.getByRole('heading', { name: '2D Contour Density Plot' })).toBeInTheDocument();
    expect(screen.getByTestId('contour-sample-count')).toHaveTextContent('32 samples');

    // Quantized legend bands L1..L5
    const legend = screen.getByTestId('contour-level-legend');
    const legendBands = legend.querySelectorAll('[data-role="contour-legend-band"]');
    expect(legendBands).toHaveLength(5);
    expect(legend).toHaveTextContent('L1');
    expect(legend).toHaveTextContent('L5');

    // SVG dimensions, responsiveness, cells, isolines, scatter markers, and axis labels
    const svg = screen.getByTestId('contour-density-svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 420 260');
    expect(svg).toHaveClass('w-full', 'h-auto', 'select-none');
    expect(svg.querySelectorAll('[data-role="contour-cell"]')).toHaveLength(
      CONTOUR_GRID_COLS * CONTOUR_GRID_ROWS
    );
    expect(svg.querySelectorAll('[data-role="contour-isoline"]').length).toBeGreaterThanOrEqual(3);
    expect(svg.querySelectorAll('[data-role="contour-sample-point"]')).toHaveLength(32);
    expect(screen.getByTestId('contour-x-label')).toHaveTextContent('X Axis');
    expect(screen.getByTestId('contour-y-label')).toHaveTextContent('Y Axis');

    // Zero raw color literals anywhere in component DOM/SVG
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(container.innerHTML).not.toMatch(/\b(?:rgba?|hsla?)\s*\(/);
    expect(svg.innerHTML).toContain('var(--prism-primary-main)');
    expect(svg.innerHTML).toContain('var(--prism-primary-dark)');
    expect(svg.innerHTML).not.toContain('NaN');

    // Recessed polite live readout with all required telemetry fields
    const readout = screen.getByTestId('contour-density-readout');
    expect(readout).toHaveClass('prism-well');
    expect(readout).toHaveAttribute('aria-live', 'polite');
    expect(readout.textContent).toMatch(
      /Coord \(-?\d+(?:\.\d+)?, -?\d+(?:\.\d+)?\) · Normalized Density 1\.00 · Contour Band L5 · Peak Density \d+\.\d{2}/
    );
  });

  it('toggles scatter sample markers via Show Points button and syncs showPoints prop updates', () => {
    const { rerender } = render(<ContourDensityPlot showPoints={false} />);

    const toggle = screen.getByTestId('contour-toggle-points');
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByTestId('contour-points-layer')).toBeNull();

    // User toggles points on interactively
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('contour-points-layer')).toBeInTheDocument();
    expect(
      screen.getByTestId('contour-density-svg').querySelectorAll('[data-role="contour-sample-point"]')
    ).toHaveLength(32);

    // User toggles points back off
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByTestId('contour-points-layer')).toBeNull();

    // Consumer updates showPoints prop to true -> syncs visible state
    rerender(<ContourDensityPlot showPoints={true} />);
    expect(screen.getByTestId('contour-toggle-points')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('contour-points-layer')).toBeInTheDocument();
  });

  it('supports clicking cells and IME-safe keyboard probing (Enter, Space, Arrow keys, boundary clamps)', () => {
    const readings: ContourCellReading[] = [];
    const onSelectCell = vi.fn((reading: ContourCellReading) => {
      readings.push(reading);
    });

    render(
      <ContourDensityPlot
        title="Optical Beam Field"
        xLabel="Azimuth (mrad)"
        yLabel="Elevation (mrad)"
        onSelectCell={onSelectCell}
      />
    );

    const svg = screen.getByTestId('contour-density-svg');
    const getCell = (row: number, col: number): SVGRectElement => {
      const el = svg.querySelector<SVGRectElement>(
        `[data-role="contour-cell"][data-row="${row}"][data-col="${col}"]`
      );
      if (!el) throw new Error(`Missing contour cell (${row}, ${col})`);
      return el;
    };

    expect(screen.getByTestId('contour-x-label')).toHaveTextContent('Azimuth (mrad)');
    expect(screen.getByTestId('contour-y-label')).toHaveTextContent('Elevation (mrad)');

    // Click cell (2, 3)
    const cell23 = getCell(2, 3);
    fireEvent.click(cell23);
    expect(onSelectCell).toHaveBeenCalledTimes(1);
    expect(cell23).toHaveAttribute('data-selected', 'true');
    expect(cell23).toHaveAttribute('aria-pressed', 'true');
    expect(cell23).toHaveAttribute('tabindex', '0');
    expect(readings[0]?.row).toBe(2);
    expect(readings[0]?.col).toBe(3);
    expect(readings[0]?.density).toBeGreaterThanOrEqual(0);
    expect(readings[0]?.density).toBeLessThanOrEqual(1);
    expect(readings[0]?.level).toBeGreaterThanOrEqual(1);
    expect(readings[0]?.level).toBeLessThanOrEqual(5);

    // IME composing events must be ignored
    fireEvent.keyDown(cell23, { key: 'Enter', isComposing: true });
    fireEvent.keyDown(cell23, { key: 'ArrowRight', isComposing: true });
    expect(onSelectCell).toHaveBeenCalledTimes(1);

    // Unrelated key must be ignored
    fireEvent.keyDown(cell23, { key: 'Escape' });
    expect(onSelectCell).toHaveBeenCalledTimes(1);

    // Enter activates cell (4, 5)
    const cell45 = getCell(4, 5);
    fireEvent.keyDown(cell45, { key: 'Enter' });
    expect(onSelectCell).toHaveBeenCalledTimes(2);
    expect(readings[1]?.row).toBe(4);
    expect(readings[1]?.col).toBe(5);

    // Space activates cell (5, 6)
    const cell56 = getCell(5, 6);
    fireEvent.keyDown(cell56, { key: ' ' });
    expect(onSelectCell).toHaveBeenCalledTimes(3);
    expect(readings[2]?.row).toBe(5);
    expect(readings[2]?.col).toBe(6);

    // ArrowRight -> (5, 7)
    fireEvent.keyDown(cell56, { key: 'ArrowRight' });
    expect(onSelectCell).toHaveBeenCalledTimes(4);
    expect(readings[3]).toMatchObject({ row: 5, col: 7 });
    expect(document.activeElement).toBe(getCell(5, 7));

    // ArrowDown -> (6, 7)
    fireEvent.keyDown(getCell(5, 7), { key: 'ArrowDown' });
    expect(onSelectCell).toHaveBeenCalledTimes(5);
    expect(readings[4]).toMatchObject({ row: 6, col: 7 });
    expect(document.activeElement).toBe(getCell(6, 7));

    // ArrowLeft -> (6, 6)
    fireEvent.keyDown(getCell(6, 7), { key: 'ArrowLeft' });
    expect(onSelectCell).toHaveBeenCalledTimes(6);
    expect(readings[5]).toMatchObject({ row: 6, col: 6 });
    expect(document.activeElement).toBe(getCell(6, 6));

    // ArrowUp -> (5, 6)
    fireEvent.keyDown(getCell(6, 6), { key: 'ArrowUp' });
    expect(onSelectCell).toHaveBeenCalledTimes(7);
    expect(readings[6]).toMatchObject({ row: 5, col: 6 });
    expect(document.activeElement).toBe(getCell(5, 6));

    // Boundary clamping at corners does not fire redundant callbacks
    const topLeft = getCell(0, 0);
    fireEvent.keyDown(topLeft, { key: 'ArrowLeft' });
    fireEvent.keyDown(topLeft, { key: 'ArrowUp' });
    const bottomRight = getCell(CONTOUR_GRID_ROWS - 1, CONTOUR_GRID_COLS - 1);
    fireEvent.keyDown(bottomRight, { key: 'ArrowRight' });
    fireEvent.keyDown(bottomRight, { key: 'ArrowDown' });
    expect(onSelectCell).toHaveBeenCalledTimes(7);
  });

  it('clamps levels to 3..8 and applies all 4 semantic optical tones via --prism-* tokens', () => {
    const toneChecks: ReadonlyArray<{ tone: ContourTone; expectedVar: string }> = [
      { tone: 'primary', expectedVar: 'var(--prism-primary-main)' },
      { tone: 'secondary', expectedVar: 'var(--prism-secondary-main)' },
      { tone: 'emerald', expectedVar: 'var(--prism-success-main)' },
      { tone: 'info', expectedVar: 'var(--prism-info-main)' },
    ];

    const { rerender } = render(<ContourDensityPlot levels={1} tone="primary" />);
    expect(
      screen.getByTestId('contour-level-legend').querySelectorAll('[data-role="contour-legend-band"]')
    ).toHaveLength(3);
    expect(screen.getByTestId('contour-density-svg')).toHaveAttribute('data-levels', '3');

    rerender(<ContourDensityPlot levels={25} tone="secondary" />);
    expect(
      screen.getByTestId('contour-level-legend').querySelectorAll('[data-role="contour-legend-band"]')
    ).toHaveLength(8);
    expect(screen.getByTestId('contour-density-svg')).toHaveAttribute('data-levels', '8');

    rerender(<ContourDensityPlot levels={Number.NaN} tone="info" />);
    expect(
      screen.getByTestId('contour-level-legend').querySelectorAll('[data-role="contour-legend-band"]')
    ).toHaveLength(5);

    for (const check of toneChecks) {
      rerender(<ContourDensityPlot tone={check.tone} />);
      const svg = screen.getByTestId('contour-density-svg');
      expect(svg).toHaveAttribute('data-tone', check.tone);
      expect(svg.innerHTML).toContain(check.expectedVar);
      expect(svg.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    }
  });

  it('handles empty arrays, non-finite coordinates, degenerate single-point clusters, invalid weights, and XSS payloads safely', () => {
    const { rerender } = render(
      <ContourDensityPlot points={[]} data-testid="contour-empty-root" />
    );

    expect(screen.getByTestId('contour-empty-root')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByTestId('contour-sample-count')).toHaveTextContent('0 samples');
    expect(screen.getByRole('status')).toHaveTextContent(
      'No 2D sample observations available to compute contour density.'
    );
    expect(screen.queryByTestId('contour-density-svg')).toBeNull();
    expect(screen.queryByTestId('contour-density-readout')).toBeNull();
    expect(screen.queryByTestId('contour-toggle-points')).toBeNull();

    // Non-finite only points also render clean empty status
    rerender(
      <ContourDensityPlot
        points={[
          { x: Number.NaN, y: 10 },
          { x: 10, y: Number.POSITIVE_INFINITY },
          { x: Number.NEGATIVE_INFINITY, y: 5 },
        ]}
        data-testid="contour-empty-root"
      />
    );
    expect(screen.getByTestId('contour-empty-root')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByRole('status')).toBeInTheDocument();

    // Single degenerate point at (0, 0) with -0, blank id, and invalid negative weight
    const singleZero: ContourSamplePoint[] = [{ id: '   ', x: -0, y: -0, weight: -4 }];
    rerender(<ContourDensityPlot points={singleZero} data-testid="contour-empty-root" />);
    expect(screen.getByTestId('contour-sample-count')).toHaveTextContent('1 sample');
    expect(screen.getByTestId('contour-density-svg').innerHTML).not.toContain('NaN');
    expect(screen.getByTestId('contour-density-readout')).toBeInTheDocument();

    // Single degenerate non-zero point at (50, 50) with NaN weight and omitted id
    rerender(
      <ContourDensityPlot
        points={[{ x: 50, y: 50, weight: Number.NaN }]}
        data-testid="contour-empty-root"
      />
    );
    expect(screen.getByTestId('contour-density-svg').innerHTML).not.toContain('NaN');

    // XSS payload strings in title, axis labels, and sample id are rendered strictly as text
    const xss = '<script>window.__contourXss=1</script><img src=x onerror=alert(1)>';
    rerender(
      <ContourDensityPlot
        title={xss}
        xLabel={xss}
        yLabel={xss}
        points={[
          { id: xss, x: 10, y: 20, weight: 2 },
          { x: 30, y: 40 },
          { x: Number.NaN, y: 50 },
        ]}
      />
    );
    expect(screen.getByRole('heading', { name: xss })).toBeInTheDocument();
    expect(screen.getByTestId('contour-x-label')).toHaveTextContent(xss);
    expect(screen.getByTestId('contour-y-label')).toHaveTextContent(xss);
    expect(screen.getByTestId('contour-sample-count')).toHaveTextContent('2 samples');
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();

    // Transition back to empty cleanly unmounts SVG cell refs
    rerender(<ContourDensityPlot points={[]} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
