import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { TreemapChart, type TreemapTile } from './TreemapChart';

const SAMPLE_TILES: TreemapTile[] = [
  { id: 'warehouse', label: 'Warehouse', group: 'Analytics', value: 45, changePct: 12.5 },
  { id: 'logs', label: 'Telemetry Logs', group: 'Observability', value: 25, changePct: -4.25 },
  { id: 'models', label: 'Model Weights', group: 'AI', value: 15, changePct: 0 },
  { id: 'backups', label: 'Backups', value: 15 },
];

describe('TreemapChart', () => {
  it('renders partitioned tiles, forwards ref, merges theme overrides, and uses semantic tokens only', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <PrismThemeProvider
        theme={{
          components: {
            TreemapChart: { className: 'theme-treemap', style: { maxWidth: '720px' } },
          },
        }}
      >
        <TreemapChart
          ref={ref}
          tiles={SAMPLE_TILES}
          valueUnit="TB"
          className="consumer-treemap"
          xstyle={{ '--prism-blur-px': '14px' }}
          data-testid="treemap-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('treemap-root');
    expect(ref.current).toBe(root);
    expect(TreemapChart.displayName).toBe('TreemapChart');
    expect(root).toHaveClass(
      'refractor-treemap-chart',
      'prism-slab',
      'theme-treemap',
      'consumer-treemap'
    );
    expect(root).toHaveStyle({ maxWidth: '720px' });

    const svg = screen.getByRole('img', { name: 'Hierarchical Treemap hierarchical treemap' });
    expect(svg).toHaveAttribute('viewBox', '0 0 600 240');
    expect(svg.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(svg.innerHTML).not.toContain('NaN');

    // Verify all 4 semantic tokens are applied properly
    const tileButtons = svg.querySelectorAll('g[role="button"]');
    expect(tileButtons).toHaveLength(4);

    const warehouseG = svg.querySelector('g[data-tile-id="warehouse"]');
    const logsG = svg.querySelector('g[data-tile-id="logs"]');
    const modelsG = svg.querySelector('g[data-tile-id="models"]');
    const backupsG = svg.querySelector('g[data-tile-id="backups"]');

    expect(warehouseG).toHaveAttribute('data-tone', 'positive');
    expect(warehouseG?.querySelector('rect')).toHaveAttribute('fill', 'var(--prism-success-main)');

    expect(logsG).toHaveAttribute('data-tone', 'negative');
    expect(logsG?.querySelector('rect')).toHaveAttribute('fill', 'var(--prism-error-main)');

    // Neutral tiles (changePct 0 and omitted) cycle primary then secondary
    expect(modelsG).toHaveAttribute('data-tone', 'neutral');
    expect(modelsG?.querySelector('rect')).toHaveAttribute('fill', 'var(--prism-primary-main)');

    expect(backupsG).toHaveAttribute('data-tone', 'neutral');
    expect(backupsG?.querySelector('rect')).toHaveAttribute('fill', 'var(--prism-secondary-main)');

    // Every tile rect has finite positive geometry inside the 600x240 viewport
    tileButtons.forEach((group) => {
      const rect = group.querySelector('rect');
      expect(rect).not.toBeNull();
      const x = Number(rect?.getAttribute('x'));
      const y = Number(rect?.getAttribute('y'));
      const w = Number(rect?.getAttribute('width'));
      const h = Number(rect?.getAttribute('height'));
      expect(Number.isFinite(x)).toBe(true);
      expect(Number.isFinite(y)).toBe(true);
      expect(w).toBeGreaterThan(0);
      expect(h).toBeGreaterThan(0);
      expect(x + w).toBeLessThanOrEqual(600);
      expect(y + h).toBeLessThanOrEqual(240);
    });

    const inspector = screen.getByTestId('treemap-inspector');
    expect(inspector).toHaveClass('prism-well');
    expect(inspector).toHaveTextContent('Select any tile to inspect value, share, and delta.');
    expect(inspector).toHaveTextContent('Total: 100TB');
  });

  it('invokes onSelectTile on click and IME-safe keyboard and updates recessed inspector strip for positive, negative, zero, and omitted deltas', () => {
    const onSelectTile = vi.fn();
    const { rerender } = render(
      <TreemapChart
        tiles={SAMPLE_TILES}
        valueUnit="TB"
        onSelectTile={onSelectTile}
      />
    );

    // Click positive tile with group
    const warehouseTile = screen.getByRole('button', {
      name: 'Warehouse (Analytics) 45TB, 45% of total +12.5%',
    });
    fireEvent.click(warehouseTile);
    expect(onSelectTile).toHaveBeenLastCalledWith(SAMPLE_TILES[0]);
    expect(warehouseTile).toHaveAttribute('data-selected', 'true');
    expect(warehouseTile).toHaveAttribute('aria-pressed', 'true');

    const inspector = screen.getByTestId('treemap-inspector');
    expect(inspector).toHaveTextContent('Warehouse');
    expect(inspector).toHaveTextContent('Analytics');
    expect(inspector).toHaveTextContent('45TB');
    expect(inspector).toHaveTextContent('45% of total');
    expect(screen.getByTestId('treemap-inspector-delta')).toHaveTextContent('+12.5%');
    expect(screen.getByTestId('treemap-inspector-delta').style.color).toBe(
      'var(--prism-success-main)'
    );

    // IME composing Enter must be ignored
    const logsTile = screen.getByRole('button', {
      name: 'Telemetry Logs (Observability) 25TB, 25% of total -4.25%',
    });
    fireEvent.keyDown(logsTile, { key: 'Enter', isComposing: true });
    expect(onSelectTile).toHaveBeenCalledTimes(1);

    // Non-activation key must be ignored
    fireEvent.keyDown(logsTile, { key: 'Tab' });
    expect(onSelectTile).toHaveBeenCalledTimes(1);

    // Keyboard Enter selects negative tile
    fireEvent.keyDown(logsTile, { key: 'Enter' });
    expect(onSelectTile).toHaveBeenLastCalledWith(SAMPLE_TILES[1]);
    expect(inspector).toHaveTextContent('Telemetry Logs');
    expect(inspector).toHaveTextContent('Observability');
    expect(inspector).toHaveTextContent('25TB');
    expect(inspector).toHaveTextContent('25% of total');
    expect(screen.getByTestId('treemap-inspector-delta')).toHaveTextContent('-4.25%');
    expect(screen.getByTestId('treemap-inspector-delta').style.color).toBe(
      'var(--prism-error-main)'
    );

    // Keyboard Space selects zero-delta tile
    const modelsTile = screen.getByRole('button', {
      name: 'Model Weights (AI) 15TB, 15% of total 0%',
    });
    fireEvent.keyDown(modelsTile, { key: ' ' });
    expect(onSelectTile).toHaveBeenLastCalledWith(SAMPLE_TILES[2]);
    expect(screen.getByTestId('treemap-inspector-delta')).toHaveTextContent('0%');
    expect(screen.getByTestId('treemap-inspector-delta').style.color).toBe(
      'var(--prism-text-secondary)'
    );

    // Click tile without group or changePct
    const backupsTile = screen.getByRole('button', {
      name: 'Backups 15TB, 15% of total',
    });
    fireEvent.click(backupsTile);
    expect(onSelectTile).toHaveBeenLastCalledWith(SAMPLE_TILES[3]);
    expect(inspector).toHaveTextContent('Backups');
    expect(inspector).toHaveTextContent('15TB');
    expect(inspector).toHaveTextContent('15% of total');
    expect(screen.queryByTestId('treemap-inspector-delta')).toBeNull();

    // Removing the selected tile resets inspector gracefully
    rerender(
      <TreemapChart
        tiles={[SAMPLE_TILES[0]!]}
        valueUnit="TB"
        onSelectTile={onSelectTile}
      />
    );
    expect(inspector).toHaveTextContent('Select any tile to inspect value, share, and delta.');
    expect(inspector).toHaveTextContent('Total: 45TB');
  });

  it('handles single tile, dense tiny tiles, tall aspect-ratio splits, height clamping, and invalid numeric filtering', () => {
    // Tall viewport forces horizontal splits cleanly, plus tiny tiles hide cramped inner labels safely
    const denseTiles: TreemapTile[] = [
      { id: 'bad-zero', label: 'Zero', value: 0 },
      { id: 'bad-neg', label: 'Neg', value: -10 },
      { id: 'bad-nan', label: 'NaN', value: Number.NaN },
      { id: 'bad-inf', label: 'Inf', value: Number.POSITIVE_INFINITY },
      { id: 'big-a', label: 'Big A', group: 'Core', value: 500, changePct: Number.NaN },
      { id: 'big-b', label: 'Big B', value: 490 },
      { id: 'tiny-1', label: 'Tiny 1', value: 1 },
      { id: 'tiny-2', label: 'Tiny 2', value: 1 },
      { id: 'tiny-3', label: 'Tiny 3', value: 1 },
      { id: 'tiny-4', label: 'Tiny 4', value: 1 },
      { id: 'tiny-5', label: 'Tiny 5', value: 1 },
      { id: 'tiny-6', label: 'Tiny 6', value: 1 },
    ];

    const { rerender } = render(<TreemapChart tiles={denseTiles} height={100} />);
    const svgLow = screen.getByRole('img');
    expect(svgLow).toHaveAttribute('viewBox', '0 0 600 160');
    expect(svgLow.querySelectorAll('g[role="button"]')).toHaveLength(8);
    expect(svgLow.innerHTML).not.toContain('NaN');

    // Clamp above maximum (480) — also exercises horizontal splits when height > width in subrects
    rerender(<TreemapChart tiles={denseTiles} height={800} />);
    const svgHigh = screen.getByRole('img');
    expect(svgHigh).toHaveAttribute('viewBox', '0 0 600 480');
    expect(svgHigh.innerHTML).not.toContain('NaN');

    // NaN height falls back to 240, single tile fills cleanly
    rerender(
      <TreemapChart
        tiles={[{ id: 'solo', label: 'Solo Node', group: 'Edge', value: 33.333 }]}
        height={Number.NaN}
      />
    );
    const svgSolo = screen.getByRole('img');
    expect(svgSolo).toHaveAttribute('viewBox', '0 0 600 240');
    expect(svgSolo.querySelectorAll('g[role="button"]')).toHaveLength(1);
    expect(screen.getByTestId('treemap-inspector')).toHaveTextContent('Total: 33.33');
  });

  it('renders clean empty states for empty or all-invalid tiles and neutralizes XSS strings', () => {
    const { rerender } = render(<TreemapChart tiles={[]} data-testid="empty-treemap" />);
    expect(screen.getByTestId('empty-treemap')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByTestId('treemap-empty')).toHaveTextContent(
      'No positive treemap values to display.'
    );
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.queryByTestId('treemap-inspector')).toBeNull();

    rerender(
      <TreemapChart
        tiles={[
          { id: 'z', label: 'Zero', value: 0 },
          { id: 'n', label: 'Neg', value: -8 },
          { id: 'nan', label: 'NaN', value: Number.NaN },
          { id: 'inf', label: 'Inf', value: Number.NEGATIVE_INFINITY },
        ]}
        data-testid="empty-treemap"
      />
    );
    expect(screen.getByTestId('empty-treemap')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByTestId('treemap-empty')).toBeInTheDocument();

    const payload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';
    rerender(
      <TreemapChart
        title={payload}
        tiles={[{ id: 'xss', label: payload, group: payload, value: 40 }]}
      />
    );
    expect(screen.getByRole('heading', { name: payload })).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
  });
});
