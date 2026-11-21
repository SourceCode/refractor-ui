import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { RadarSpiderChart, type RadarSeries } from './RadarSpiderChart';

const SAMPLE_AXES = ['Accuracy', 'Latency', 'Throughput', 'Memory', 'Safety'];

const SAMPLE_SERIES: RadarSeries[] = [
  { id: 'alpha', label: 'Alpha v2', values: [92, 84, 88, 76, 95], tone: 'primary' },
  { id: 'beta', label: 'Beta v1', values: [72, 68, 74.5, 81, 79], tone: 'secondary' },
];

describe('RadarSpiderChart', () => {
  it('renders 4 concentric web rings, spokes, translucent series polygons, vertex dots, forwards ref, and merges theme overrides', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <PrismThemeProvider
        theme={{
          components: {
            RadarSpiderChart: { className: 'theme-radar-chart', style: { maxWidth: '520px' } },
          },
        }}
      >
        <RadarSpiderChart
          ref={ref}
          axes={SAMPLE_AXES}
          series={SAMPLE_SERIES}
          className="consumer-radar-chart"
          xstyle={{ '--prism-blur-px': '18px' }}
          data-testid="radar-chart"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('radar-chart');
    expect(ref.current).toBe(root);
    expect(RadarSpiderChart.displayName).toBe('RadarSpiderChart');
    expect(root).toHaveClass(
      'refractor-radar-spider-chart',
      'prism-slab',
      'theme-radar-chart',
      'consumer-radar-chart'
    );
    expect(root).toHaveStyle({ maxWidth: '520px' });
    expect(root).not.toHaveAttribute('data-empty');
    expect(root).not.toHaveAttribute('data-all-hidden');

    const svg = screen.getByRole('img', { name: 'Multi-Axis Profile radar chart' });
    expect(svg).toHaveAttribute('viewBox', '0 0 260 260');
    expect(svg.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(svg.innerHTML).not.toMatch(/\brgba?\s*\(/i);
    expect(svg.innerHTML).not.toMatch(/\bhsla?\s*\(/i);
    expect(svg.innerHTML).not.toContain('NaN');

    // 4 concentric radar web polygons (25%, 50%, 75%, 100%)
    const webRingsGroup = screen.getByTestId('radar-web-rings');
    const webPolygons = webRingsGroup.querySelectorAll('polygon');
    expect(webPolygons).toHaveLength(4);
    for (const pct of [25, 50, 75, 100]) {
      const ring = screen.getByTestId(`radar-web-ring-${pct}`);
      expect(ring).toHaveAttribute('fill', 'none');
      expect(ring).toHaveAttribute('stroke', 'var(--prism-divider)');
    }

    // 5 radial spoke lines from center (130, 130)
    const spokesGroup = screen.getByTestId('radar-spokes');
    const spokeLines = spokesGroup.querySelectorAll('line');
    expect(spokeLines).toHaveLength(5);
    spokeLines.forEach((line) => {
      expect(line).toHaveAttribute('x1', '130');
      expect(line).toHaveAttribute('y1', '130');
      expect(line).toHaveAttribute('stroke', 'var(--prism-divider)');
    });

    // Translucent series polygons with fillOpacity 0.22 and 5 vertex dots each
    const alphaPoly = screen.getByTestId('radar-series-polygon-alpha');
    expect(alphaPoly).toHaveAttribute('fill', 'var(--prism-primary-main)');
    expect(alphaPoly).toHaveAttribute('fill-opacity', '0.22');
    expect(alphaPoly).toHaveAttribute('stroke', 'var(--prism-primary-main)');

    const betaPoly = screen.getByTestId('radar-series-polygon-beta');
    expect(betaPoly).toHaveAttribute('fill', 'var(--prism-secondary-main)');
    expect(betaPoly).toHaveAttribute('fill-opacity', '0.22');
    expect(betaPoly).toHaveAttribute('stroke', 'var(--prism-secondary-main)');

    const seriesLayer = screen.getByTestId('radar-series-layer');
    expect(seriesLayer.querySelectorAll('circle')).toHaveLength(10);

    // Outer axis labels
    SAMPLE_AXES.forEach((label, idx) => {
      const axisEl = screen.getByTestId(`radar-axis-label-${idx}`);
      expect(axisEl).toHaveTextContent(label);
      expect(axisEl).toHaveAttribute('aria-pressed', 'false');
    });

    // Recessed comparison bar initial prompt
    const comparison = screen.getByTestId('radar-axis-comparison');
    expect(comparison).toHaveClass('prism-well');
    expect(comparison).toHaveTextContent('Select any axis label to compare visible series scores.');
    expect(comparison).toHaveTextContent('Max: 100');
  });

  it('toggles series visibility via aria-pressed legend pills and displays notice when all series are hidden', () => {
    render(
      <RadarSpiderChart
        title="Latency Radar"
        axes={SAMPLE_AXES}
        series={SAMPLE_SERIES}
        data-testid="toggle-radar"
      />
    );

    const root = screen.getByTestId('toggle-radar');
    const alphaPill = screen.getByTestId('radar-legend-alpha');
    const betaPill = screen.getByTestId('radar-legend-beta');

    expect(alphaPill).toHaveAttribute('aria-pressed', 'true');
    expect(betaPill).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('radar-series-polygon-alpha')).toBeInTheDocument();
    expect(screen.getByTestId('radar-series-polygon-beta')).toBeInTheDocument();

    // Hide Alpha
    fireEvent.click(alphaPill);
    expect(alphaPill).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByTestId('radar-series-polygon-alpha')).toBeNull();
    expect(screen.getByTestId('radar-series-polygon-beta')).toBeInTheDocument();
    expect(root).not.toHaveAttribute('data-all-hidden');

    // Hide Beta too -> all hidden notice appears
    fireEvent.click(betaPill);
    expect(betaPill).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByTestId('radar-series-polygon-beta')).toBeNull();
    expect(root).toHaveAttribute('data-all-hidden', 'true');
    expect(screen.getByTestId('radar-all-hidden')).toHaveTextContent(
      'All series hidden — toggle a series pill above to display radar profiles.'
    );

    // Re-enable Alpha -> polygon returns and all-hidden notice clears
    fireEvent.click(alphaPill);
    expect(alphaPill).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('radar-series-polygon-alpha')).toBeInTheDocument();
    expect(screen.queryByTestId('radar-all-hidden')).toBeNull();
    expect(root).not.toHaveAttribute('data-all-hidden');
  });

  it('selects axes via click and IME-safe keyboard Enter/Space, invokes onSelectAxis, compares visible series in prism-well bar, and resets when axes shrink', () => {
    const onSelectAxis = vi.fn();
    const { rerender } = render(
      <RadarSpiderChart
        axes={SAMPLE_AXES}
        series={SAMPLE_SERIES}
        onSelectAxis={onSelectAxis}
      />
    );

    // Click axis 2 ('Throughput')
    const throughputLabel = screen.getByRole('button', { name: 'Throughput' });
    fireEvent.click(throughputLabel);
    expect(onSelectAxis).toHaveBeenLastCalledWith(2, 'Throughput');
    expect(throughputLabel).toHaveAttribute('aria-pressed', 'true');
    expect(throughputLabel).toHaveAttribute('data-selected', 'true');
    expect(screen.getByTestId('radar-spoke-2')).toHaveAttribute(
      'stroke',
      'var(--prism-primary-main)'
    );

    const comparison = screen.getByTestId('radar-axis-comparison');
    expect(comparison).toHaveClass('prism-well');
    expect(comparison).toHaveTextContent('Throughput');
    expect(comparison).toHaveTextContent('Scale: 0–100');
    expect(within(comparison).getByTestId('radar-comparison-row-alpha')).toHaveTextContent(
      'Alpha v2'
    );
    expect(within(comparison).getByTestId('radar-comparison-row-alpha')).toHaveTextContent(
      '88 / 100'
    );
    expect(within(comparison).getByTestId('radar-comparison-row-beta')).toHaveTextContent(
      '74.5 / 100'
    );

    // Hiding Beta removes its row from the active comparison bar
    fireEvent.click(screen.getByTestId('radar-legend-beta'));
    expect(within(comparison).queryByTestId('radar-comparison-row-beta')).toBeNull();
    expect(within(comparison).getByTestId('radar-comparison-row-alpha')).toBeInTheDocument();

    // Re-show Beta
    fireEvent.click(screen.getByTestId('radar-legend-beta'));
    expect(within(comparison).getByTestId('radar-comparison-row-beta')).toBeInTheDocument();

    // IME composing Enter must be ignored
    const safetyLabel = screen.getByRole('button', { name: 'Safety' });
    fireEvent.keyDown(safetyLabel, { key: 'Enter', isComposing: true });
    expect(onSelectAxis).toHaveBeenCalledTimes(1);

    // Non-activation key must be ignored
    fireEvent.keyDown(safetyLabel, { key: 'Escape' });
    expect(onSelectAxis).toHaveBeenCalledTimes(1);

    // Keyboard Enter selects axis 4 ('Safety')
    fireEvent.keyDown(safetyLabel, { key: 'Enter' });
    expect(onSelectAxis).toHaveBeenLastCalledWith(4, 'Safety');
    expect(safetyLabel).toHaveAttribute('aria-pressed', 'true');
    expect(within(comparison).getByTestId('radar-comparison-row-alpha')).toHaveTextContent(
      '95 / 100'
    );

    // Keyboard Space selects axis 0 ('Accuracy')
    const accuracyLabel = screen.getByRole('button', { name: 'Accuracy' });
    fireEvent.keyDown(accuracyLabel, { key: ' ' });
    expect(onSelectAxis).toHaveBeenLastCalledWith(0, 'Accuracy');
    expect(accuracyLabel).toHaveAttribute('aria-pressed', 'true');

    // Select axis 4 again, then shrink axes to 3 items -> active selection safely resets
    fireEvent.click(safetyLabel);
    expect(onSelectAxis).toHaveBeenLastCalledWith(4, 'Safety');
    rerender(
      <RadarSpiderChart
        axes={['Accuracy', 'Latency', 'Throughput']}
        series={SAMPLE_SERIES}
      />
    );
    expect(screen.getByTestId('radar-axis-comparison')).toHaveTextContent(
      'Select any axis label to compare visible series scores.'
    );

    // Activating without onSelectAxis callback works cleanly
    fireEvent.click(screen.getByRole('button', { name: 'Latency' }));
    expect(screen.getByTestId('radar-axis-comparison')).toHaveTextContent('84 / 100');
  });

  it('sanitizes out-of-range, non-finite, and missing values, falls back invalid maxValue, clamps size, auto-cycles all 5 tones, and handles duplicate keys', () => {
    const adversarialSeries: RadarSeries[] = [
      {
        id: 's1',
        label: 'Series 1',
        values: [-25, 150, Number.NaN, Number.POSITIVE_INFINITY],
      },
      { id: 's2', label: 'Series 2', values: [12.345, 50, Number.NEGATIVE_INFINITY, 0, 20] },
      { id: 's3', label: 'Series 3', values: [10, 20, 30, 40, 50] },
      { id: 's4', label: 'Series 4', values: [20, 30, 40, 50, 60] },
      { id: 's5', label: 'Series 5', values: [30, 40, 50, 60, 70] },
      { id: 's1', label: 'Series 1 Dup', values: [40, 40, 40, 40, 40] },
    ];

    const duplicateAxes = ['Dim', 'Dim', 'Right', 'Bottom', 'Left'];

    const { rerender } = render(
      <RadarSpiderChart
        axes={duplicateAxes}
        series={adversarialSeries}
        maxValue={0}
        size={90}
      />
    );

    const svgLow = screen.getByTestId('radar-spider-svg');
    expect(svgLow).toHaveAttribute('viewBox', '0 0 180 180');
    expect(svgLow.innerHTML).not.toContain('NaN');
    expect(svgLow.innerHTML).toContain('var(--prism-primary-main)');
    expect(svgLow.innerHTML).toContain('var(--prism-secondary-main)');
    expect(svgLow.innerHTML).toContain('var(--prism-success-main)');
    expect(svgLow.innerHTML).toContain('var(--prism-warning-main)');
    expect(svgLow.innerHTML).toContain('var(--prism-error-main)');

    // Verify sanitization in comparison bar (maxValue=0 fell back to 100)
    fireEvent.click(screen.getByTestId('radar-axis-label-0'));
    const comparison = screen.getByTestId('radar-axis-comparison');
    const s1Rows = within(comparison).getAllByTestId('radar-comparison-row-s1');
    expect(s1Rows[0]).toHaveTextContent('0 / 100'); // -25 clamped to 0
    expect(within(comparison).getByTestId('radar-comparison-row-s2')).toHaveTextContent(
      '12.35 / 100'
    );

    // Axis 1: 150 clamped to 100
    fireEvent.click(screen.getByTestId('radar-axis-label-1'));
    expect(within(comparison).getAllByTestId('radar-comparison-row-s1')[0]).toHaveTextContent(
      '100 / 100'
    );

    // Axis 2: NaN -> 0
    fireEvent.click(screen.getByTestId('radar-axis-label-2'));
    expect(within(comparison).getAllByTestId('radar-comparison-row-s1')[0]).toHaveTextContent(
      '0 / 100'
    );

    // Axis 4: missing entry (undefined) -> 0
    fireEvent.click(screen.getByTestId('radar-axis-label-4'));
    expect(within(comparison).getAllByTestId('radar-comparison-row-s1')[0]).toHaveTextContent(
      '0 / 100'
    );

    // Upper size clamp + valid custom maxValue
    rerender(
      <RadarSpiderChart
        axes={duplicateAxes}
        series={adversarialSeries}
        maxValue={50}
        size={640}
      />
    );
    expect(screen.getByTestId('radar-spider-svg')).toHaveAttribute('viewBox', '0 0 400 400');
    expect(screen.getByTestId('radar-axis-comparison')).toHaveTextContent('Scale: 0–50');

    // NaN size & NaN maxValue -> defaults (260 & 100)
    rerender(
      <RadarSpiderChart
        axes={duplicateAxes}
        series={adversarialSeries}
        maxValue={Number.NaN}
        size={Number.NaN}
      />
    );
    expect(screen.getByTestId('radar-spider-svg')).toHaveAttribute('viewBox', '0 0 260 260');
    expect(screen.getByTestId('radar-axis-comparison')).toHaveTextContent('Scale: 0–100');
  });

  it('renders accessible empty states for < 3 axes or 0 series and neutralizes XSS payloads', () => {
    const { rerender } = render(
      <RadarSpiderChart
        axes={['OnlyOne', 'OnlyTwo']}
        series={SAMPLE_SERIES}
        data-testid="empty-radar"
      />
    );

    expect(screen.getByTestId('empty-radar')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByTestId('radar-spider-empty')).toHaveTextContent(
      'Provide at least 3 axes to render the radar chart.'
    );
    expect(screen.queryByTestId('radar-spider-svg')).toBeNull();
    expect(screen.queryByTestId('radar-series-legend')).toBeNull();
    expect(screen.queryByTestId('radar-axis-comparison')).toBeNull();

    // 3+ axes with 0 series
    rerender(
      <RadarSpiderChart axes={SAMPLE_AXES} series={[]} data-testid="empty-radar" />
    );
    expect(screen.getByTestId('empty-radar')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByTestId('radar-spider-empty')).toHaveTextContent(
      'Provide at least 1 series to render the radar chart.'
    );
    expect(screen.queryByTestId('radar-spider-svg')).toBeNull();

    // XSS payload neutralization
    const payload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';
    rerender(
      <RadarSpiderChart
        title={payload}
        axes={[payload, 'Reliability', 'Speed']}
        series={[{ id: 'xss', label: payload, values: [80, 70, 90], tone: 'emerald' }]}
      />
    );
    expect(screen.getByRole('heading', { name: payload })).toBeInTheDocument();
    expect(screen.getByTestId('radar-axis-label-0')).toHaveTextContent(payload);
    expect(screen.getByTestId('radar-legend-xss')).toHaveTextContent(payload);
    expect(document.querySelector('script')).toBeNull();
  });
});
