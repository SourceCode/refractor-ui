import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  AreaStackedChart,
  type AreaSeries,
  type AreaSeriesTone,
} from './index';

const SAMPLE_LABELS = ['00:00', '06:00', '12:00', '18:00'];

const SAMPLE_SERIES: AreaSeries[] = [
  { id: 'inference', label: 'Inference', tone: 'primary', values: [40, 60, 80, 50] },
  { id: 'training', label: 'Training', tone: 'secondary', values: [20, 30, 40, 25] },
  { id: 'ingest', label: 'Ingest', tone: 'emerald', values: [10, 15, 20, 15] },
];

describe('AreaStackedChart', () => {
  it('renders stacked optical area chart with ref, theme override, token linear gradients, and breakdown readout', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            AreaStackedChart: {
              className: 'theme-area-chart',
              style: { maxWidth: '700px' },
            },
          },
        }}
      >
        <AreaStackedChart
          ref={ref}
          title="Cluster Compute"
          labels={SAMPLE_LABELS}
          series={SAMPLE_SERIES}
          valueUnit="vCPU"
          className="local-area-chart"
          xstyle={{ '--prism-blur-px': '22px' }}
          style={{ marginBottom: '6px' }}
          data-testid="area-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('area-root');
    expect(ref.current).toBe(root);
    expect(AreaStackedChart.displayName).toBe('AreaStackedChart');
    expect(root).toHaveClass(
      'refractor-area-stacked-chart',
      'prism-slab',
      'theme-area-chart',
      'local-area-chart'
    );
    expect(root).toHaveStyle({ maxWidth: '700px', marginBottom: '6px' });
    expect(root).toHaveAttribute('data-mode', 'stacked');
    expect(root).not.toHaveAttribute('data-empty');

    const svg = screen.getByRole('img', { name: 'Cluster Compute' });
    expect(svg).toHaveAttribute('viewBox', '0 0 640 220');
    expect(svg.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(svg.innerHTML).not.toContain('NaN');

    const gradients = svg.querySelectorAll('defs linearGradient');
    expect(gradients).toHaveLength(3);
    const stops = svg.querySelectorAll('defs linearGradient stop');
    expect(stops.length).toBe(6);
    stops.forEach((stop) => {
      const stopColor = stop.getAttribute('stop-color') ?? '';
      expect(stopColor.startsWith('var(--prism-')).toBe(true);
    });

    const fillPath = screen.getByTestId('area-fill-inference');
    expect(fillPath.getAttribute('fill')).toMatch(/^url\(#.+\)$/);
    expect(screen.getByTestId('area-stroke-inference')).toHaveAttribute(
      'stroke',
      'var(--prism-primary-main)'
    );
    expect(screen.getByTestId('area-stroke-training')).toHaveAttribute(
      'stroke',
      'var(--prism-secondary-main)'
    );
    expect(screen.getByTestId('area-stroke-ingest')).toHaveAttribute(
      'stroke',
      'var(--prism-success-main)'
    );

    // Initial slice index 0 readout: 40 + 20 + 10 = 70 vCPU
    expect(screen.getByTestId('area-readout-label')).toHaveTextContent('00:00');
    expect(screen.getByTestId('area-readout-total')).toHaveTextContent('Total: 70 vCPU');
    expect(screen.getByTestId('area-readout-item-inference')).toHaveTextContent('40 vCPU');
    expect(screen.getByTestId('area-readout-item-training')).toHaveTextContent('20 vCPU');
    expect(screen.getByTestId('area-readout-item-ingest')).toHaveTextContent('10 vCPU');
  });

  it('toggles between Stacked and Overlay modes smoothly and syncs with stacked prop updates', () => {
    const { rerender } = render(
      <AreaStackedChart
        labels={SAMPLE_LABELS}
        series={SAMPLE_SERIES}
        stacked={false}
        data-testid="mode-root"
      />
    );

    const root = screen.getByTestId('mode-root');
    expect(root).toHaveAttribute('data-mode', 'overlay');

    const stackedBtn = screen.getByRole('button', { name: 'Stacked' });
    const overlayBtn = screen.getByRole('button', { name: 'Overlay' });
    expect(overlayBtn).toHaveAttribute('aria-pressed', 'true');
    expect(stackedBtn).toHaveAttribute('aria-pressed', 'false');

    const overlayTrainingPath = screen.getByTestId('area-fill-training').getAttribute('d');

    // Switch to Stacked via toggle button
    fireEvent.click(stackedBtn);
    expect(root).toHaveAttribute('data-mode', 'stacked');
    expect(stackedBtn).toHaveAttribute('aria-pressed', 'true');
    expect(overlayBtn).toHaveAttribute('aria-pressed', 'false');

    const stackedTrainingPath = screen.getByTestId('area-fill-training').getAttribute('d');
    // Cumulative stacking shifts the training band baseline above inference
    expect(stackedTrainingPath).not.toBe(overlayTrainingPath);

    // Switch back to Overlay via button
    fireEvent.click(overlayBtn);
    expect(root).toHaveAttribute('data-mode', 'overlay');

    // Controlled prop update re-syncs mode
    rerender(
      <AreaStackedChart
        labels={SAMPLE_LABELS}
        series={SAMPLE_SERIES}
        stacked={true}
        data-testid="mode-root"
      />
    );
    expect(root).toHaveAttribute('data-mode', 'stacked');
  });

  it('selects X-slices via buttons, SVG hit targets, and IME-safe Arrow keys while firing onSelectIndex', () => {
    const onSelectIndex = vi.fn<(index: number) => void>();

    render(
      <AreaStackedChart
        labels={SAMPLE_LABELS}
        series={SAMPLE_SERIES}
        valueUnit="GB"
        onSelectIndex={onSelectIndex}
      />
    );

    // Click X-slice button for index 2 (12:00 -> 80 + 40 + 20 = 140 GB)
    const slice2Btn = screen.getByTestId('area-slice-btn-2');
    fireEvent.click(slice2Btn);
    expect(onSelectIndex).toHaveBeenCalledWith(2);
    expect(slice2Btn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('area-readout-label')).toHaveTextContent('12:00');
    expect(screen.getByTestId('area-readout-total')).toHaveTextContent('Total: 140 GB');

    // Click SVG slice region for index 3 (18:00 -> 50 + 25 + 15 = 90 GB)
    fireEvent.click(screen.getByTestId('area-svg-slice-3'));
    expect(onSelectIndex).toHaveBeenLastCalledWith(3);
    expect(screen.getByTestId('area-readout-label')).toHaveTextContent('18:00');
    expect(screen.getByTestId('area-readout-total')).toHaveTextContent('Total: 90 GB');

    // Keyboard ArrowLeft moves back to index 2; ArrowRight moves forward to 3
    fireEvent.keyDown(screen.getByTestId('area-slice-btn-3'), { key: 'ArrowLeft' });
    expect(onSelectIndex).toHaveBeenLastCalledWith(2);
    fireEvent.keyDown(screen.getByTestId('area-slice-btn-2'), { key: 'ArrowRight' });
    expect(onSelectIndex).toHaveBeenLastCalledWith(3);

    // Boundary ArrowRight at last index & ArrowLeft at index 0 do not fire
    const callsBeforeBoundary = onSelectIndex.mock.calls.length;
    fireEvent.keyDown(screen.getByTestId('area-slice-btn-3'), { key: 'ArrowRight' });
    fireEvent.keyDown(screen.getByTestId('area-slice-btn-0'), { key: 'ArrowLeft' });
    expect(onSelectIndex).toHaveBeenCalledTimes(callsBeforeBoundary);

    // IME composing keydown is ignored
    const imeEvent = new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true });
    Object.defineProperty(imeEvent, 'isComposing', { value: true });
    screen.getByTestId('area-slice-btn-3').dispatchEvent(imeEvent);
    expect(onSelectIndex).toHaveBeenCalledTimes(callsBeforeBoundary);
  });

  it('toggles individual series via legend pills, recalculates totals, and handles all-hidden safely', () => {
    const fiveSeries: AreaSeries[] = [
      { id: 'a', label: 'Alpha', values: [10, 20] },
      { id: 'b', label: 'Beta', values: [20, 30] },
      { id: 'c', label: 'Gamma', values: [30, 40] },
      { id: 'd', label: 'Delta', values: [40, 50] },
      { id: 'e', label: 'Epsilon', values: [50, 60] },
    ];
    const expectedTones: AreaSeriesTone[] = ['primary', 'secondary', 'emerald', 'amber', 'rose'];

    render(
      <AreaStackedChart
        labels={['T1', 'T2']}
        series={fiveSeries}
        height={80}
        data-testid="legend-root"
      />
    );

    // Clamped min height 120
    expect(screen.getByTestId('area-chart-svg')).toHaveAttribute('viewBox', '0 0 640 120');

    // All 5 default tones assigned
    fiveSeries.forEach((s, idx) => {
      expect(screen.getByTestId(`area-legend-${s.id}`)).toHaveAttribute(
        'data-tone',
        expectedTones[idx]
      );
    });
    expect(screen.getByTestId('area-readout-total')).toHaveTextContent('Total: 150');

    // Hide Alpha -> total becomes 140
    fireEvent.click(screen.getByTestId('area-legend-a'));
    expect(screen.getByTestId('area-legend-a')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByTestId('area-fill-a')).not.toBeInTheDocument();
    expect(screen.getByTestId('area-readout-total')).toHaveTextContent('Total: 140');

    // Hide all remaining series
    fireEvent.click(screen.getByTestId('area-legend-b'));
    fireEvent.click(screen.getByTestId('area-legend-c'));
    fireEvent.click(screen.getByTestId('area-legend-d'));
    fireEvent.click(screen.getByTestId('area-legend-e'));
    expect(screen.getByTestId('legend-root')).toHaveAttribute('data-all-hidden', 'true');
    expect(screen.getByTestId('area-chart-all-hidden')).toHaveTextContent('All series hidden');
    expect(screen.getByTestId('area-chart-svg').innerHTML).not.toContain('NaN');

    // Re-enable Alpha -> restores smoothly
    fireEvent.click(screen.getByTestId('area-legend-a'));
    expect(screen.getByTestId('area-fill-a')).toBeInTheDocument();
    expect(screen.getByTestId('area-readout-total')).toHaveTextContent('Total: 10');
  });

  it('sanitizes negative/NaN/Infinity to >= 0, handles single-point, zero peak, height max clamp, empty states, and XSS', () => {
    const xssTitle = '<script>window.__areaXss=1</script><img src=x onerror=alert(1)>';

    const { rerender } = render(
      <AreaStackedChart
        title={xssTitle}
        labels={['Dup', 'Dup', 'End']}
        height={800}
        series={[
          {
            id: 'bad',
            label: '<svg onload=alert(1)>Corrupt',
            tone: 'rose',
            values: [-100, Number.NaN, Number.POSITIVE_INFINITY],
          },
          {
            id: 'bad',
            label: 'Duplicate ID',
            tone: 'amber',
            values: [-5],
          },
        ]}
      />
    );

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByRole('heading', { name: xssTitle })).toBeInTheDocument();
    expect(screen.getByTestId('area-chart-svg')).toHaveAttribute('viewBox', '0 0 640 520');
    expect(screen.getByTestId('area-chart-svg').innerHTML).not.toContain('NaN');
    expect(screen.getByTestId('area-readout-total')).toHaveTextContent('Total: 0');

    // Single-point chart renders valid finite closed band
    rerender(
      <AreaStackedChart
        labels={['Only']}
        height={Number.NaN}
        series={[{ id: 'solo', label: 'Solo', values: [33.34] }]}
      />
    );
    expect(screen.getByTestId('area-chart-svg')).toHaveAttribute('viewBox', '0 0 640 220');
    expect(screen.getByTestId('area-fill-solo').getAttribute('d')).toContain(' Z');
    expect(screen.getByTestId('area-chart-svg').innerHTML).not.toContain('NaN');
    expect(screen.getByTestId('area-readout-total')).toHaveTextContent('Total: 33.3');

    // Empty labels
    rerender(
      <AreaStackedChart labels={[]} series={SAMPLE_SERIES} data-testid="empty-area" />
    );
    expect(screen.getByTestId('empty-area')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByTestId('area-chart-empty')).toHaveTextContent(
      'No area volume data available.'
    );

    // Empty series
    rerender(
      <AreaStackedChart labels={SAMPLE_LABELS} series={[]} data-testid="empty-area" />
    );
    expect(screen.getByTestId('empty-area')).toHaveAttribute('data-empty', 'true');
  });
});
