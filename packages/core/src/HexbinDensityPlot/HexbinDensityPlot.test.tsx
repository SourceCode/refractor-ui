import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  DEFAULT_HEXBIN_POINTS,
  HexbinDensityPlot,
  type HexbinCluster,
  type HexbinPoint,
  type HexbinTone,
} from './index';

describe('HexbinDensityPlot', () => {
  it('renders the default 64-point bi-cluster honeycomb, forwards ref, merges overrides, and uses --prism-* tokens only', () => {
    expect(DEFAULT_HEXBIN_POINTS).toHaveLength(64);

    const ref = createRef<HTMLDivElement>();
    render(
      <PrismThemeProvider
        theme={{
          components: {
            HexbinDensityPlot: { className: 'theme-hexbin', style: { maxWidth: '720px' } },
          },
        }}
      >
        <HexbinDensityPlot
          ref={ref}
          className="consumer-hexbin"
          xstyle={{ '--prism-blur-px': '14px' }}
          data-testid="hexbin-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('hexbin-root');
    expect(ref.current).toBe(root);
    expect(HexbinDensityPlot.displayName).toBe('HexbinDensityPlot');
    expect(root).toHaveClass(
      'refractor-hexbin-density-plot',
      'prism-slab',
      'theme-hexbin',
      'consumer-hexbin',
      'min-w-0',
      'max-w-full'
    );
    expect(root).toHaveStyle({ maxWidth: '720px' });
    expect(root).toHaveAttribute('data-tone', 'emerald');
    expect(root).toHaveAttribute('data-columns', '10');
    expect(root).not.toHaveAttribute('data-empty');

    expect(
      screen.getByRole('heading', { name: 'Hexbin Spatial Aggregation' })
    ).toBeInTheDocument();

    const legend = screen.getByTestId('hexbin-legend');
    expect(legend).toHaveTextContent('Low');
    expect(legend).toHaveTextContent('Peak');
    expect(legend.querySelectorAll('[data-role="hexbin-legend-step"]')).toHaveLength(5);

    const svg = screen.getByRole('img', {
      name: /Hexbin Spatial Aggregation hexbin density plot aggregating 64 points/,
    });
    expect(svg).toHaveAttribute('viewBox', '0 0 440 250');
    expect(svg).toHaveClass('w-full', 'h-auto', 'select-none');
    expect(svg.parentElement).toHaveClass('prism-well');

    // Zero raw color literals anywhere in the rendered component
    expect(root.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(root.innerHTML).not.toMatch(/\b(?:rgba?|hsla?)\s*\(/);
    expect(svg.innerHTML).toContain('var(--prism-success-main)');
    expect(svg.innerHTML).toContain('var(--prism-divider)');
    expect(svg.innerHTML).not.toContain('NaN');

    expect(svg.querySelector('[data-role="hexbin-x-label"]')).toHaveTextContent(
      'Request Size (KB)'
    );
    expect(svg.querySelector('[data-role="hexbin-y-label"]')).toHaveTextContent(
      'Response Time (ms)'
    );

    const emptyCells = svg.querySelectorAll('[data-role="hexbin-empty-cell"]');
    const populatedButtons = screen.getAllByRole('button');
    expect(emptyCells.length).toBeGreaterThan(0);
    expect(populatedButtons.length).toBeGreaterThan(4);
    expect(svg.querySelectorAll('[data-role="hexbin-count-label"]').length).toBeGreaterThan(0);
    expect(svg.querySelectorAll('[data-role="hexbin-selection-ring"]')).toHaveLength(1);

    // Every single one of the 64 finite points must be conserved across populated bins
    const aggregatedSum = populatedButtons.reduce(
      (acc, el) => acc + Number(el.getAttribute('data-count')),
      0
    );
    expect(aggregatedSum).toBe(64);

    const telemetry = screen.getByTestId('hexbin-telemetry-pill');
    expect(telemetry).toHaveTextContent(`64 points · ${populatedButtons.length} populated bins`);

    const inspector = screen.getByTestId('hexbin-inspector');
    expect(inspector).toHaveClass('prism-well');
    expect(inspector).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByTestId('inspector-bin')).toHaveTextContent(/^Hex Bin \(\d+, \d+\)$/);
    expect(screen.getByTestId('inspector-center')).toHaveTextContent(
      /^Center \(-?\d+(?:\.\d+)?, -?\d+(?:\.\d+)?\)$/
    );
    expect(screen.getByTestId('inspector-count')).toHaveTextContent(/^\d+ points?$/);
    expect(screen.getByTestId('inspector-share')).toHaveTextContent(/^\d+\.\d% share$/);
  });

  it('supports clicking and IME-safe Enter, Space, ArrowLeft, and ArrowRight keyboard navigation on populated hexagons', () => {
    const received: HexbinCluster[] = [];
    const onSelectHex = vi.fn((bin: HexbinCluster) => {
      received.push(bin);
    });

    const customPoints: HexbinPoint[] = [
      // Dense top-left hotspot (4 points)
      { x: 10.2, y: 92.4 },
      { x: 10.6, y: 93.1 },
      { x: 11.0, y: 91.8 },
      { x: 10.8, y: 92.7 },
      // Mid-density center cluster (2 points)
      { x: 50.5, y: 50.5 },
      { x: 51.1, y: 51.2 },
      // Singleton bottom-right bin (1 point)
      { x: 92.0, y: 12.0 },
    ];

    render(
      <HexbinDensityPlot
        points={customPoints}
        columns={8}
        title="Latency Clusters"
        onSelectHex={onSelectHex}
      />
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(3);

    const firstBtn = buttons[0]!;
    const secondBtn = buttons[1]!;
    const lastBtn = buttons[buttons.length - 1]!;

    // Click the singleton last bin
    fireEvent.click(lastBtn);
    expect(onSelectHex).toHaveBeenCalledTimes(1);
    expect(lastBtn).toHaveAttribute('aria-pressed', 'true');
    expect(lastBtn).toHaveAttribute('data-selected', 'true');
    expect(received[0]?.count).toBe(1);
    expect(received[0]?.centerX).toBe(92);
    expect(received[0]?.centerY).toBe(12);
    expect(screen.getByTestId('inspector-count')).toHaveTextContent('1 point');
    expect(screen.getByTestId('inspector-center')).toHaveTextContent('Center (92, 12)');

    // IME composing keydown must be ignored
    fireEvent.keyDown(firstBtn, { key: 'Enter', isComposing: true });
    expect(onSelectHex).toHaveBeenCalledTimes(1);

    // Unrelated key must be ignored
    fireEvent.keyDown(firstBtn, { key: 'Escape' });
    expect(onSelectHex).toHaveBeenCalledTimes(1);

    // Enter activates first bin
    fireEvent.keyDown(firstBtn, { key: 'Enter' });
    expect(onSelectHex).toHaveBeenCalledTimes(2);
    expect(firstBtn).toHaveAttribute('data-selected', 'true');
    expect(received[1]?.id).toBe(firstBtn.getAttribute('data-bin-id'));

    // Space activates second bin
    fireEvent.keyDown(secondBtn, { key: ' ' });
    expect(onSelectHex).toHaveBeenCalledTimes(3);
    expect(secondBtn).toHaveAttribute('data-selected', 'true');

    // ArrowLeft from index 1 steps back to index 0 and moves focus
    fireEvent.keyDown(secondBtn, { key: 'ArrowLeft' });
    expect(onSelectHex).toHaveBeenCalledTimes(4);
    expect(firstBtn).toHaveAttribute('data-selected', 'true');
    expect(document.activeElement).toBe(firstBtn);

    // ArrowLeft at index 0 clamps to index 0
    fireEvent.keyDown(firstBtn, { key: 'ArrowLeft' });
    expect(onSelectHex).toHaveBeenCalledTimes(5);
    expect(firstBtn).toHaveAttribute('data-selected', 'true');

    // ArrowRight from index 0 advances to index 1 and moves focus
    fireEvent.keyDown(firstBtn, { key: 'ArrowRight' });
    expect(onSelectHex).toHaveBeenCalledTimes(6);
    expect(secondBtn).toHaveAttribute('data-selected', 'true');
    expect(document.activeElement).toBe(secondBtn);

    // ArrowRight at last index clamps to last index
    fireEvent.keyDown(lastBtn, { key: 'ArrowRight' });
    expect(onSelectHex).toHaveBeenCalledTimes(7);
    expect(lastBtn).toHaveAttribute('data-selected', 'true');
  });

  it('supports all 4 semantic tones, clamps columns (5..16), and renders custom axis labels', () => {
    const toneExpectations: ReadonlyArray<{ tone: HexbinTone; token: string }> = [
      { tone: 'primary', token: 'var(--prism-primary-main)' },
      { tone: 'secondary', token: 'var(--prism-secondary-main)' },
      { tone: 'emerald', token: 'var(--prism-success-main)' },
      { tone: 'info', token: 'var(--prism-info-main)' },
    ];

    const { rerender } = render(
      <HexbinDensityPlot
        tone="primary"
        columns={2}
        xLabel="Payload Entropy"
        yLabel="Compute Cost"
        data-testid="tone-plot"
      />
    );

    const root = screen.getByTestId('tone-plot');
    expect(root).toHaveAttribute('data-columns', '5');
    expect(root.querySelector('[data-role="hexbin-x-label"]')).toHaveTextContent('Payload Entropy');
    expect(root.querySelector('[data-role="hexbin-y-label"]')).toHaveTextContent('Compute Cost');

    for (const { tone, token } of toneExpectations) {
      rerender(<HexbinDensityPlot tone={tone} columns={10} data-testid="tone-plot" />);
      expect(screen.getByTestId('tone-plot')).toHaveAttribute('data-tone', tone);
      expect(screen.getByRole('img').innerHTML).toContain(token);
      expect(screen.getByTestId('tone-plot').innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    }

    // Clamp above max (16) and fallback on NaN (10)
    rerender(<HexbinDensityPlot columns={99} data-testid="tone-plot" />);
    expect(screen.getByTestId('tone-plot')).toHaveAttribute('data-columns', '16');

    rerender(<HexbinDensityPlot columns={Number.NaN} data-testid="tone-plot" />);
    expect(screen.getByTestId('tone-plot')).toHaveAttribute('data-columns', '10');
  });

  it('filters non-finite coordinates, handles degenerate constant/zero domains, and resets stale selection on dataset change', () => {
    const mixedPoints: HexbinPoint[] = [
      { x: Number.NaN, y: 12 },
      { x: 18, y: Number.POSITIVE_INFINITY },
      { x: Number.NEGATIVE_INFINITY, y: 40 },
      { x: 50, y: 100 },
    ];

    const { rerender } = render(
      <HexbinDensityPlot points={mixedPoints} columns={10} data-testid="edge-plot" />
    );

    expect(screen.getByTestId('hexbin-telemetry-pill')).toHaveTextContent(
      '1 point · 1 populated bin'
    );
    expect(screen.getByRole('img').innerHTML).not.toContain('NaN');
    expect(screen.getByTestId('inspector-center')).toHaveTextContent('Center (50, 100)');
    expect(screen.getByTestId('inspector-count')).toHaveTextContent('1 point');
    expect(screen.getByTestId('inspector-share')).toHaveTextContent('100.0% share');

    // Select the single bin, then switch to an all-zero constant dataset at a different resolution
    const singleBtn = screen.getByRole('button');
    fireEvent.click(singleBtn);

    rerender(
      <HexbinDensityPlot
        points={[
          { x: -0, y: 0 },
          { x: 0, y: -0 },
        ]}
        columns={15}
        data-testid="edge-plot"
      />
    );

    expect(screen.getByTestId('hexbin-telemetry-pill')).toHaveTextContent(
      '2 points · 1 populated bin'
    );
    expect(screen.getByRole('img').innerHTML).not.toContain('NaN');
    expect(screen.getByTestId('inspector-center')).toHaveTextContent('Center (0, 0)');
    expect(screen.getByTestId('inspector-count')).toHaveTextContent('2 points');
  });

  it('renders a clean role="status" empty state for [] or non-finite-only inputs and neutralizes XSS payloads', () => {
    const { rerender } = render(<HexbinDensityPlot points={[]} data-testid="empty-plot" />);

    const root = screen.getByTestId('empty-plot');
    expect(root).toHaveAttribute('data-empty', 'true');
    expect(screen.getByTestId('hexbin-telemetry-pill')).toHaveTextContent(
      '0 points · 0 populated bins'
    );

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('data-testid', 'hexbin-empty');
    expect(status).toHaveTextContent('No spatial points available for hexagonal aggregation.');
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.queryByTestId('hexbin-inspector')).toBeNull();

    rerender(
      <HexbinDensityPlot
        points={[
          { x: Number.NaN, y: Number.NaN },
          { x: Number.POSITIVE_INFINITY, y: 5 },
        ]}
        data-testid="empty-plot"
      />
    );
    expect(screen.getByTestId('empty-plot')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByRole('status')).toBeInTheDocument();

    const xssPayload = '<script>window.__hexXss=1</script><img src=x onerror=alert(1)>';
    rerender(
      <HexbinDensityPlot
        title={xssPayload}
        xLabel={xssPayload}
        yLabel={xssPayload}
        points={[
          { x: 1.5, y: 2.5 },
          { x: 9.5, y: 12.5 },
        ]}
      />
    );

    expect(screen.getByRole('heading', { name: xssPayload })).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
  });
});
