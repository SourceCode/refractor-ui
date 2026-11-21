import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { BarColumnChart, type BarSeries } from './BarColumnChart';

const SAMPLE_CATEGORIES = ['Q1', 'Q2', 'Q3', 'Q4'];
const SAMPLE_SERIES: BarSeries[] = [
  { id: 'na', label: 'North America', tone: 'primary', values: [120, 145.5, 160, 190] },
  { id: 'eu', label: 'Europe', tone: 'secondary', values: [95, 110, 128, 142] },
  { id: 'apac', label: 'APAC', tone: 'emerald', values: [64, 82, 96, 118] },
];

describe('BarColumnChart', () => {
  it('renders vertical grouped bars by default, forwards ref, merges theme overrides, and uses semantic tokens only', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <PrismThemeProvider
        theme={{
          components: {
            BarColumnChart: { className: 'theme-bar-chart', style: { maxWidth: '720px' } },
          },
        }}
      >
        <BarColumnChart
          ref={ref}
          categories={SAMPLE_CATEGORIES}
          series={SAMPLE_SERIES}
          valueUnit="k"
          className="consumer-bar-chart"
          xstyle={{ '--prism-blur-px': '14px' }}
          data-testid="bar-chart"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('bar-chart');
    expect(ref.current).toBe(root);
    expect(BarColumnChart.displayName).toBe('BarColumnChart');
    expect(root).toHaveClass(
      'refractor-bar-column-chart',
      'prism-slab',
      'theme-bar-chart',
      'consumer-bar-chart'
    );
    expect(root).toHaveStyle({ maxWidth: '720px' });
    expect(root).toHaveAttribute('data-orientation', 'vertical');
    expect(root).toHaveAttribute('data-layout', 'grouped');

    const svg = screen.getByRole('img', {
      name: 'Category Comparison vertical grouped bar chart',
    });
    expect(svg.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(svg.innerHTML).toContain('var(--prism-primary-main)');
    expect(svg.innerHTML).toContain('var(--prism-secondary-main)');
    expect(svg.innerHTML).toContain('var(--prism-success-main)');
    expect(svg.innerHTML).toContain('var(--prism-divider)');

    const bars = svg.querySelectorAll('rect');
    expect(bars).toHaveLength(12);
    bars.forEach((rect) => {
      expect(rect).toHaveAttribute('rx', '4');
    });

    const readout = screen.getByTestId('bar-column-readout');
    expect(readout).toHaveClass('prism-well');
    expect(readout).toHaveTextContent(
      'Select any bar to inspect exact category and series values.'
    );
  });

  it('supports interactive toggles across all 4 orientation/layout modes and syncs with prop updates', () => {
    const { rerender } = render(
      <BarColumnChart
        categories={SAMPLE_CATEGORIES}
        series={SAMPLE_SERIES}
        title="Regional Mix"
        data-testid="modes-chart"
      />
    );

    const root = screen.getByTestId('modes-chart');
    expect(root).toHaveAttribute('data-orientation', 'vertical');
    expect(root).toHaveAttribute('data-layout', 'grouped');

    // vertical + stacked
    fireEvent.click(screen.getByRole('button', { name: 'Stacked' }));
    expect(root).toHaveAttribute('data-orientation', 'vertical');
    expect(root).toHaveAttribute('data-layout', 'stacked');
    expect(
      screen.getByRole('img', { name: 'Regional Mix vertical stacked bar chart' }).innerHTML
    ).not.toContain('NaN');

    // horizontal + stacked
    fireEvent.click(screen.getByRole('button', { name: 'Horizontal' }));
    expect(root).toHaveAttribute('data-orientation', 'horizontal');
    expect(root).toHaveAttribute('data-layout', 'stacked');
    expect(
      screen.getByRole('img', { name: 'Regional Mix horizontal stacked bar chart' }).innerHTML
    ).not.toContain('NaN');

    // horizontal + grouped
    fireEvent.click(screen.getByRole('button', { name: 'Grouped' }));
    expect(root).toHaveAttribute('data-orientation', 'horizontal');
    expect(root).toHaveAttribute('data-layout', 'grouped');
    expect(
      screen.getByRole('img', { name: 'Regional Mix horizontal grouped bar chart' }).innerHTML
    ).not.toContain('NaN');

    // Back to vertical via button
    fireEvent.click(screen.getByRole('button', { name: 'Vertical' }));
    expect(root).toHaveAttribute('data-orientation', 'vertical');

    // External prop sync via rerender
    rerender(
      <BarColumnChart
        categories={SAMPLE_CATEGORIES}
        series={SAMPLE_SERIES}
        title="Regional Mix"
        orientation="horizontal"
        layout="stacked"
        data-testid="modes-chart"
      />
    );
    expect(root).toHaveAttribute('data-orientation', 'horizontal');
    expect(root).toHaveAttribute('data-layout', 'stacked');
  });

  it('invokes onSelectBar via click and keyboard (IME-safe) and updates recessed readout', () => {
    const onSelectBar = vi.fn();
    render(
      <BarColumnChart
        categories={SAMPLE_CATEGORIES}
        series={SAMPLE_SERIES}
        valueUnit="k"
        onSelectBar={onSelectBar}
      />
    );

    const targetBar = screen.getByRole('button', {
      name: 'Q2 · North America: 145.5k',
    });
    fireEvent.click(targetBar);
    expect(onSelectBar).toHaveBeenCalledWith('na', 1, 145.5);
    expect(targetBar).toHaveAttribute('data-selected', 'true');
    expect(screen.getByTestId('bar-column-readout')).toHaveTextContent(
      'Q2 · North America: 145.5k'
    );

    // IME composing Enter must be ignored
    const euBar = screen.getByRole('button', { name: 'Q3 · Europe: 128k' });
    fireEvent.keyDown(euBar, { key: 'Enter', isComposing: true });
    expect(onSelectBar).toHaveBeenCalledTimes(1);

    // Non-activation key must be ignored
    fireEvent.keyDown(euBar, { key: 'Escape' });
    expect(onSelectBar).toHaveBeenCalledTimes(1);

    // Keyboard Enter activates bar
    fireEvent.keyDown(euBar, { key: 'Enter' });
    expect(onSelectBar).toHaveBeenLastCalledWith('eu', 2, 128);
    expect(screen.getByTestId('bar-column-readout')).toHaveTextContent('Q3 · Europe: 128k');

    // Keyboard Space activates bar
    const apacBar = screen.getByRole('button', { name: 'Q4 · APAC: 118k' });
    fireEvent.keyDown(apacBar, { key: ' ' });
    expect(onSelectBar).toHaveBeenLastCalledWith('apac', 3, 118);
    expect(screen.getByTestId('bar-column-readout')).toHaveTextContent('Q4 · APAC: 118k');
  });

  it('toggles series visibility via legend pills and handles all-hidden & selected-series-hidden gracefully', () => {
    render(
      <BarColumnChart
        categories={['Jan', 'Feb']}
        series={[
          { id: 'alpha', label: 'Alpha', tone: 'amber', values: [40, 60] },
          { id: 'beta', label: 'Beta', tone: 'rose', values: [25, 35] },
        ]}
      />
    );

    const alphaPill = screen.getByRole('button', { name: 'Alpha' });
    const betaPill = screen.getByRole('button', { name: 'Beta' });
    expect(alphaPill).toHaveAttribute('aria-pressed', 'true');
    expect(betaPill).toHaveAttribute('aria-pressed', 'true');

    // Select an Alpha bar, then hide Alpha -> readout clears gracefully
    fireEvent.click(screen.getByRole('button', { name: 'Jan · Alpha: 40' }));
    expect(screen.getByTestId('bar-column-readout')).toHaveTextContent('Jan · Alpha: 40');

    fireEvent.click(alphaPill);
    expect(alphaPill).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('bar-column-readout')).toHaveTextContent(
      'Select any bar to inspect exact category and series values.'
    );
    // Single visible series in grouped mode (both vertical and horizontal)
    expect(screen.getByRole('img').querySelectorAll('rect')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Horizontal' }));
    expect(screen.getByRole('img').querySelectorAll('rect')).toHaveLength(2);

    // Hide remaining series -> all-hidden notice
    fireEvent.click(betaPill);
    expect(betaPill).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('bar-column-all-hidden')).toHaveTextContent(
      'All series are hidden. Select a series in the legend to display bars.'
    );

    // Re-enable Alpha -> chart returns
    fireEvent.click(alphaPill);
    expect(alphaPill).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('img').querySelectorAll('rect')).toHaveLength(2);
  });

  it('clamps height, auto-cycles tones when omitted, handles invalid/negative/zero/short values, and shrinks categories safely', () => {
    const untonedSeries: BarSeries[] = [
      { id: 's1', label: 'S1', values: [-20, Number.NaN] },
      { id: 's2', label: 'S2', values: [0, Number.POSITIVE_INFINITY] },
      { id: 's3', label: 'S3', values: [10] },
      { id: 's4', label: 'S4', values: [0, 0] },
      { id: 's5', label: 'S5', values: [0, 0] },
    ];

    const { rerender } = render(
      <BarColumnChart
        categories={['A', 'B']}
        series={untonedSeries}
        height={60}
        layout="stacked"
      />
    );

    const svgLow = screen.getByRole('img');
    expect(svgLow).toHaveAttribute('viewBox', '0 0 560 140');
    expect(svgLow.innerHTML).not.toContain('NaN');
    expect(svgLow.innerHTML).toContain('var(--prism-warning-main)');
    expect(svgLow.innerHTML).toContain('var(--prism-error-main)');

    // Flip to horizontal stacked with zeros
    fireEvent.click(screen.getByRole('button', { name: 'Horizontal' }));
    expect(screen.getByRole('img').innerHTML).not.toContain('NaN');

    // Select category index 1, then shrink categories to 1 -> readout falls back safely
    fireEvent.click(screen.getByRole('button', { name: 'B · S1: 0' }));
    expect(screen.getByTestId('bar-column-readout')).toHaveTextContent('B · S1: 0');

    rerender(
      <BarColumnChart
        categories={['A']}
        series={[{ id: 's1', label: 'S1', values: [0] }]}
        height={999}
      />
    );
    expect(screen.getByRole('img')).toHaveAttribute('viewBox', '0 0 560 520');
    expect(screen.getByTestId('bar-column-readout')).toHaveTextContent(
      'Select any bar to inspect exact category and series values.'
    );

    // NaN height falls back to 240
    rerender(
      <BarColumnChart
        categories={['A']}
        series={[{ id: 's1', label: 'S1', values: [0] }]}
        height={Number.NaN}
      />
    );
    expect(screen.getByRole('img')).toHaveAttribute('viewBox', '0 0 560 240');
  });

  it('renders clean empty states when categories or series are empty and neutralizes XSS strings', () => {
    const { rerender } = render(
      <BarColumnChart categories={[]} series={SAMPLE_SERIES} data-testid="empty-bar" />
    );
    expect(screen.getByTestId('empty-bar')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByTestId('bar-column-empty')).toHaveTextContent('No chart data to display.');
    expect(screen.queryByTestId('bar-column-readout')).toBeNull();

    rerender(<BarColumnChart categories={['Q1']} series={[]} data-testid="empty-bar" />);
    expect(screen.getByTestId('empty-bar')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByTestId('bar-column-empty')).toBeInTheDocument();

    const payload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';
    rerender(
      <BarColumnChart
        title={payload}
        categories={[payload]}
        series={[{ id: 'xss', label: payload, values: [15] }]}
      />
    );
    expect(screen.getByRole('heading', { name: payload })).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
  });
});
