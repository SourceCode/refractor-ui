import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { DonutPieChart, type DonutSlice } from './DonutPieChart';

const SAMPLE_SLICES: DonutSlice[] = [
  { id: 'compute', label: 'Compute', value: 60, tone: 'primary' },
  { id: 'storage', label: 'Storage', value: 25, tone: 'secondary' },
  { id: 'network', label: 'Network', value: 15, tone: 'emerald' },
];

describe('DonutPieChart', () => {
  it('renders donut mode by default, forwards ref, merges theme overrides, and uses semantic tokens only', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <PrismThemeProvider
        theme={{
          components: {
            DonutPieChart: { className: 'theme-donut-chart', style: { maxWidth: '640px' } },
          },
        }}
      >
        <DonutPieChart
          ref={ref}
          slices={SAMPLE_SLICES}
          valueUnit="k"
          centerLabel="Monthly"
          centerValue="$100k"
          className="consumer-donut-chart"
          xstyle={{ '--prism-blur-px': '16px' }}
          data-testid="donut-chart"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('donut-chart');
    expect(ref.current).toBe(root);
    expect(DonutPieChart.displayName).toBe('DonutPieChart');
    expect(root).toHaveClass(
      'refractor-donut-pie-chart',
      'prism-slab',
      'theme-donut-chart',
      'consumer-donut-chart'
    );
    expect(root).toHaveStyle({ maxWidth: '640px' });
    expect(root).toHaveAttribute('data-variant', 'donut');

    const svg = screen.getByRole('img', { name: 'Composition Share donut chart' });
    expect(svg).toHaveAttribute('viewBox', '0 0 220 220');
    expect(svg.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(svg.innerHTML).not.toContain('NaN');
    expect(svg.innerHTML).toContain('var(--prism-primary-main)');
    expect(svg.innerHTML).toContain('var(--prism-secondary-main)');
    expect(svg.innerHTML).toContain('var(--prism-success-main)');
    expect(svg.innerHTML).toContain('var(--prism-divider)');
    expect(svg.querySelectorAll('path')).toHaveLength(3);

    const center = screen.getByTestId('donut-pie-center');
    expect(center).toHaveTextContent('$100k');
    expect(center).toHaveTextContent('Monthly');

    const readout = screen.getByTestId('donut-pie-readout');
    expect(readout).toHaveClass('prism-well');
    expect(readout).toHaveTextContent('Select any slice to inspect exact composition share.');
    expect(readout).toHaveTextContent('Monthly: $100k');
  });

  it('switches interactively between Donut and Pie views and syncs external variant prop', () => {
    const { rerender } = render(
      <DonutPieChart
        slices={SAMPLE_SLICES}
        title="Spend Mix"
        data-testid="variant-chart"
      />
    );

    const root = screen.getByTestId('variant-chart');
    const donutBtn = screen.getByRole('button', { name: 'Donut' });
    const pieBtn = screen.getByRole('button', { name: 'Pie' });

    expect(root).toHaveAttribute('data-variant', 'donut');
    expect(donutBtn).toHaveAttribute('aria-pressed', 'true');
    expect(pieBtn).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('donut-pie-center')).toHaveTextContent('100');
    expect(screen.getByTestId('donut-pie-center')).toHaveTextContent('Total');

    // Switch to Pie mode
    fireEvent.click(pieBtn);
    expect(root).toHaveAttribute('data-variant', 'pie');
    expect(pieBtn).toHaveAttribute('aria-pressed', 'true');
    expect(donutBtn).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByTestId('donut-pie-center')).toBeNull();
    const pieSvg = screen.getByRole('img', { name: 'Spend Mix pie chart' });
    expect(pieSvg.querySelectorAll('path')).toHaveLength(3);
    expect(pieSvg.innerHTML).not.toContain('NaN');

    // Switch back to Donut mode
    fireEvent.click(donutBtn);
    expect(root).toHaveAttribute('data-variant', 'donut');
    expect(screen.getByTestId('donut-pie-center')).toBeInTheDocument();

    // Sync from external variant prop change
    rerender(
      <DonutPieChart
        slices={SAMPLE_SLICES}
        title="Spend Mix"
        variant="pie"
        data-testid="variant-chart"
      />
    );
    expect(root).toHaveAttribute('data-variant', 'pie');
    expect(screen.queryByTestId('donut-pie-center')).toBeNull();
  });

  it('renders single-slice 100% full-circle paths cleanly in both donut and pie modes without degenerate arc collapse', () => {
    const onSelectSlice = vi.fn();
    const singleSlice: DonutSlice[] = [
      { id: 'only', label: 'Primary Cluster', value: 42.5, tone: 'emerald' },
    ];

    render(
      <DonutPieChart
        slices={singleSlice}
        valueUnit="TB"
        onSelectSlice={onSelectSlice}
      />
    );

    const donutSvg = screen.getByRole('img', { name: 'Composition Share donut chart' });
    const donutPath = donutSvg.querySelector('path');
    expect(donutPath).not.toBeNull();
    const donutD = donutPath?.getAttribute('d') ?? '';
    // Full donut ring uses two outer + two inner semicircle arcs (4 'A' commands) and evenodd rule
    expect(donutD.match(/\bA\b/g)).toHaveLength(4);
    expect(donutD).not.toContain('NaN');
    expect(donutPath).toHaveAttribute('fill-rule', 'evenodd');

    fireEvent.click(donutPath!);
    expect(onSelectSlice).toHaveBeenCalledWith(singleSlice[0], 100);
    expect(screen.getByTestId('donut-pie-center')).toHaveTextContent('100%');
    expect(screen.getByTestId('donut-pie-center')).toHaveTextContent('Primary Cluster');

    // Switch to Pie mode for single 100% slice
    fireEvent.click(screen.getByRole('button', { name: 'Pie' }));
    const pieSvg = screen.getByRole('img', { name: 'Composition Share pie chart' });
    const piePath = pieSvg.querySelector('path');
    expect(piePath).not.toBeNull();
    const pieD = piePath?.getAttribute('d') ?? '';
    expect(pieD.match(/\bA\b/g)).toHaveLength(2);
    expect(pieD).not.toContain('NaN');
    expect(piePath).not.toHaveAttribute('fill-rule');
  });

  it('invokes onSelectSlice via SVG click, legend click, and IME-safe Enter/Space, and resets when selected slice disappears', () => {
    const onSelectSlice = vi.fn();
    const { rerender } = render(
      <DonutPieChart
        slices={SAMPLE_SLICES}
        valueUnit="k"
        onSelectSlice={onSelectSlice}
      />
    );

    const computeSlice = screen.getByRole('button', { name: 'Compute: 60k (60%)' });
    fireEvent.click(computeSlice);
    expect(onSelectSlice).toHaveBeenLastCalledWith(SAMPLE_SLICES[0], 60);
    expect(computeSlice).toHaveAttribute('data-selected', 'true');
    expect(computeSlice).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('donut-pie-center')).toHaveTextContent('60%');
    expect(screen.getByTestId('donut-pie-center')).toHaveTextContent('Compute');
    expect(screen.getByTestId('donut-pie-readout')).toHaveTextContent('Compute: 60k (60%)');

    // Legend row aria-pressed mirrors active slice and activates on click
    const legendGroup = screen.getByRole('group', { name: 'Slice legend' });
    const storageLegend = within(legendGroup).getByRole('button', { name: /Storage.*25k.*25%/i });
    expect(storageLegend).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(storageLegend);
    expect(onSelectSlice).toHaveBeenLastCalledWith(SAMPLE_SLICES[1], 25);
    expect(storageLegend).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('donut-pie-center')).toHaveTextContent('25%');
    expect(screen.getByTestId('donut-pie-center')).toHaveTextContent('Storage');

    // IME composing Enter must be ignored
    const networkSlice = screen.getByRole('button', { name: 'Network: 15k (15%)' });
    fireEvent.keyDown(networkSlice, { key: 'Enter', isComposing: true });
    expect(onSelectSlice).toHaveBeenCalledTimes(2);

    // Non-activation key must be ignored
    fireEvent.keyDown(networkSlice, { key: 'Escape' });
    expect(onSelectSlice).toHaveBeenCalledTimes(2);

    // Keyboard Enter on SVG path selects slice
    fireEvent.keyDown(networkSlice, { key: 'Enter' });
    expect(onSelectSlice).toHaveBeenLastCalledWith(SAMPLE_SLICES[2], 15);
    expect(screen.getByTestId('donut-pie-center')).toHaveTextContent('15%');
    expect(screen.getByTestId('donut-pie-center')).toHaveTextContent('Network');

    // Keyboard Space on legend button selects slice
    const computeLegend = within(legendGroup).getByRole('button', { name: /Compute.*60k.*60%/i });
    fireEvent.keyDown(computeLegend, { key: ' ' });
    expect(onSelectSlice).toHaveBeenLastCalledWith(SAMPLE_SLICES[0], 60);
    expect(computeLegend).toHaveAttribute('aria-pressed', 'true');

    // Removing the selected slice resets center & readout safely back to total
    rerender(
      <DonutPieChart
        slices={[SAMPLE_SLICES[1]!]}
        valueUnit="k"
        onSelectSlice={onSelectSlice}
      />
    );
    expect(screen.getByTestId('donut-pie-center')).toHaveTextContent('25k');
    expect(screen.getByTestId('donut-pie-center')).toHaveTextContent('Total');
    expect(screen.getByTestId('donut-pie-readout')).toHaveTextContent(
      'Select any slice to inspect exact composition share.'
    );
  });

  it('filters non-positive and non-finite slices, auto-cycles all 5 tones, and clamps size bounds', () => {
    const mixedSlices: DonutSlice[] = [
      { id: 'bad-zero', label: 'Zero', value: 0 },
      { id: 'bad-neg', label: 'Negative', value: -15 },
      { id: 'bad-nan', label: 'NaN', value: Number.NaN },
      { id: 'bad-inf', label: 'Infinity', value: Number.POSITIVE_INFINITY },
      { id: 's1', label: 'S1', value: 1 },
      { id: 's2', label: 'S2', value: 1 },
      { id: 's3', label: 'S3', value: 1 },
      { id: 's4', label: 'S4', value: 1 },
      { id: 's5', label: 'S5', value: 2 },
    ];

    const { rerender } = render(<DonutPieChart slices={mixedSlices} size={80} />);
    const svgLow = screen.getByRole('img');
    expect(svgLow).toHaveAttribute('viewBox', '0 0 140 140');
    expect(svgLow.querySelectorAll('path')).toHaveLength(5);
    expect(svgLow.innerHTML).toContain('var(--prism-primary-main)');
    expect(svgLow.innerHTML).toContain('var(--prism-secondary-main)');
    expect(svgLow.innerHTML).toContain('var(--prism-success-main)');
    expect(svgLow.innerHTML).toContain('var(--prism-warning-main)');
    expect(svgLow.innerHTML).toContain('var(--prism-error-main)');
    expect(screen.getByTestId('donut-pie-center')).toHaveTextContent('6');

    rerender(<DonutPieChart slices={mixedSlices} size={600} />);
    expect(screen.getByRole('img')).toHaveAttribute('viewBox', '0 0 360 360');

    rerender(<DonutPieChart slices={mixedSlices} size={Number.NaN} />);
    expect(screen.getByRole('img')).toHaveAttribute('viewBox', '0 0 220 220');
  });

  it('renders clean empty states for empty or all-invalid slices and neutralizes XSS payloads', () => {
    const { rerender } = render(<DonutPieChart slices={[]} data-testid="empty-donut" />);
    expect(screen.getByTestId('empty-donut')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByTestId('donut-pie-empty')).toHaveTextContent(
      'No positive slice values to display.'
    );
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.queryByTestId('donut-pie-readout')).toBeNull();

    rerender(
      <DonutPieChart
        slices={[
          { id: 'z', label: 'Zero', value: 0 },
          { id: 'n', label: 'Neg', value: -5 },
          { id: 'nan', label: 'NaN', value: Number.NaN },
          { id: 'inf', label: 'Inf', value: Number.NEGATIVE_INFINITY },
        ]}
        data-testid="empty-donut"
      />
    );
    expect(screen.getByTestId('empty-donut')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByTestId('donut-pie-empty')).toBeInTheDocument();

    const payload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';
    rerender(
      <DonutPieChart
        title={payload}
        centerLabel={payload}
        centerValue={payload}
        slices={[{ id: 'xss', label: payload, value: 10 }]}
      />
    );
    expect(screen.getByRole('heading', { name: payload })).toBeInTheDocument();
    expect(screen.getByTestId('donut-pie-center')).toHaveTextContent(payload);
    expect(document.querySelector('script')).toBeNull();
  });
});
