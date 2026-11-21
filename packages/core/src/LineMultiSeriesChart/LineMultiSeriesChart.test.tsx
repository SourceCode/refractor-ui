import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  LineMultiSeriesChart,
  type ChartSeriesTone,
  type LineSeries,
} from './index';

const SAMPLE_LABELS = ['Mon', 'Tue', 'Wed', 'Thu'];

const SAMPLE_SERIES: LineSeries[] = [
  { id: 'p50', label: 'P50', tone: 'emerald', values: [40, 50, 45, 60] },
  { id: 'p95', label: 'P95', tone: 'primary', values: [90, 120, 100, 110] },
  { id: 'sla', label: 'SLA Target', tone: 'amber', dashed: true, values: [100, 100, 100, 100] },
];

describe('LineMultiSeriesChart', () => {
  it('renders smooth multi-series chart with ref, theme override, --prism-* tokens, dashed stroke, and readout', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            LineMultiSeriesChart: {
              className: 'theme-line-chart',
              style: { maxWidth: '680px' },
            },
          },
        }}
      >
        <LineMultiSeriesChart
          ref={ref}
          title="API Latency"
          labels={SAMPLE_LABELS}
          series={SAMPLE_SERIES}
          valueUnit="ms"
          className="local-line-chart"
          xstyle={{ '--prism-blur-px': '20px' }}
          style={{ marginTop: '8px' }}
          data-testid="line-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('line-root');
    expect(ref.current).toBe(root);
    expect(LineMultiSeriesChart.displayName).toBe('LineMultiSeriesChart');
    expect(root).toHaveClass(
      'refractor-line-multi-series-chart',
      'prism-slab',
      'theme-line-chart',
      'local-line-chart'
    );
    expect(root).toHaveStyle({ maxWidth: '680px', marginTop: '8px' });
    expect(root).toHaveAttribute('data-smooth', 'true');
    expect(root).not.toHaveAttribute('data-empty');

    const svg = screen.getByRole('img', { name: 'API Latency' });
    expect(svg).toHaveAttribute('viewBox', '0 0 640 220');
    expect(svg.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(svg.innerHTML).not.toContain('NaN');
    expect(screen.getAllByTestId('line-chart-gridline')).toHaveLength(4);

    const p50Path = screen.getByTestId('line-series-path-p50');
    const p95Path = screen.getByTestId('line-series-path-p95');
    const slaPath = screen.getByTestId('line-series-path-sla');
    expect(p50Path).toHaveAttribute('stroke', 'var(--prism-success-main)');
    expect(p50Path.getAttribute('d')).toContain(' C ');
    expect(p50Path).not.toHaveAttribute('stroke-dasharray');
    expect(p95Path).toHaveAttribute('stroke', 'var(--prism-primary-main)');
    expect(slaPath).toHaveAttribute('stroke', 'var(--prism-warning-main)');
    expect(slaPath).toHaveAttribute('stroke-dasharray', '6 4');

    // Default active readout selects latest point of first visible series
    expect(screen.getByTestId('line-chart-readout')).toHaveTextContent('P50');
    expect(screen.getByTestId('line-chart-readout')).toHaveTextContent('Thu');
    expect(screen.getByTestId('line-chart-readout-value')).toHaveTextContent('60 ms');
  });

  it('supports polyline mode (smooth=false), hiding points (showPoints=false), height clamping, and all 5 default tones', () => {
    const fiveSeries: LineSeries[] = [
      { id: 's1', label: 'One', values: [10, 20] },
      { id: 's2', label: 'Two', values: [15, 25] },
      { id: 's3', label: 'Three', values: [20, 30] },
      { id: 's4', label: 'Four', values: [25, 35] },
      { id: 's5', label: 'Five', values: [30, 40] },
    ];
    const explicitTones: ChartSeriesTone[] = ['primary', 'secondary', 'emerald', 'amber', 'rose'];

    const { rerender } = render(
      <LineMultiSeriesChart
        labels={['A', 'B']}
        series={fiveSeries}
        smooth={false}
        showPoints={false}
        height={60}
        data-testid="polyline-root"
      />
    );

    const svg = screen.getByTestId('line-chart-svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 640 120');
    expect(screen.getByTestId('line-series-polyline-s1')).toHaveAttribute(
      'stroke',
      'var(--prism-primary-main)'
    );
    expect(screen.getByTestId('line-series-polyline-s2')).toHaveAttribute(
      'stroke',
      'var(--prism-secondary-main)'
    );
    expect(screen.getByTestId('line-series-polyline-s3')).toHaveAttribute(
      'stroke',
      'var(--prism-success-main)'
    );
    expect(screen.getByTestId('line-series-polyline-s4')).toHaveAttribute(
      'stroke',
      'var(--prism-warning-main)'
    );
    expect(screen.getByTestId('line-series-polyline-s5')).toHaveAttribute(
      'stroke',
      'var(--prism-error-main)'
    );
    expect(svg.querySelectorAll('circle')).toHaveLength(0);

    explicitTones.forEach((tone, i) => {
      expect(screen.getByTestId(`line-legend-s${i + 1}`)).toHaveAttribute('data-tone', tone);
    });

    // Upper clamp to 520 and NaN fallback to 220
    rerender(
      <LineMultiSeriesChart
        labels={['A', 'B']}
        series={fiveSeries}
        height={999}
        smooth={false}
      />
    );
    expect(screen.getByTestId('line-chart-svg')).toHaveAttribute('viewBox', '0 0 640 520');

    rerender(
      <LineMultiSeriesChart
        labels={['A', 'B']}
        series={fiveSeries}
        height={Number.NaN}
      />
    );
    expect(screen.getByTestId('line-chart-svg')).toHaveAttribute('viewBox', '0 0 640 220');
  });

  it('invokes onSelectPoint via click and IME-safe keyboard Enter/Space and updates readout', () => {
    const onSelectPoint = vi.fn<(seriesId: string, index: number, value: number) => void>();

    render(
      <LineMultiSeriesChart
        labels={SAMPLE_LABELS}
        series={SAMPLE_SERIES}
        valueUnit="ms"
        onSelectPoint={onSelectPoint}
      />
    );

    const p95Tue = screen.getByTestId('line-point-p95-1');
    fireEvent.click(p95Tue);
    expect(onSelectPoint).toHaveBeenCalledWith('p95', 1, 120);
    expect(p95Tue).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('line-chart-readout')).toHaveTextContent('P95');
    expect(screen.getByTestId('line-chart-readout')).toHaveTextContent('Tue');
    expect(screen.getByTestId('line-chart-readout-value')).toHaveTextContent('120 ms');

    // Keyboard Enter activates point
    const p50Wed = screen.getByTestId('line-point-p50-2');
    fireEvent.keyDown(p50Wed, { key: 'Enter' });
    expect(onSelectPoint).toHaveBeenLastCalledWith('p50', 2, 45);
    expect(screen.getByTestId('line-chart-readout-value')).toHaveTextContent('45 ms');

    // Keyboard Space activates point
    const slaMon = screen.getByTestId('line-point-sla-0');
    fireEvent.keyDown(slaMon, { key: ' ' });
    expect(onSelectPoint).toHaveBeenLastCalledWith('sla', 0, 100);

    // Unrelated key does not fire callback
    const callsBefore = onSelectPoint.mock.calls.length;
    fireEvent.keyDown(p50Wed, { key: 'Escape' });
    expect(onSelectPoint).toHaveBeenCalledTimes(callsBefore);

    // IME composition keydown is safely ignored
    const imeEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    Object.defineProperty(imeEvent, 'isComposing', { value: true });
    p50Wed.dispatchEvent(imeEvent);
    expect(onSelectPoint).toHaveBeenCalledTimes(callsBefore);
  });

  it('toggles individual series via legend pills, handles all-hidden safely without crash, and restores cleanly', () => {
    render(
      <LineMultiSeriesChart
        labels={SAMPLE_LABELS}
        series={SAMPLE_SERIES}
        data-testid="toggle-root"
      />
    );

    // Select point on p95 then hide p95 -> readout falls back to remaining visible series
    fireEvent.click(screen.getByTestId('line-point-p95-1'));
    expect(screen.getByTestId('line-chart-readout')).toHaveTextContent('P95');

    const p95Btn = screen.getByTestId('line-legend-p95');
    const p50Btn = screen.getByTestId('line-legend-p50');
    const slaBtn = screen.getByTestId('line-legend-sla');

    fireEvent.click(p95Btn);
    expect(p95Btn).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByTestId('line-series-path-p95')).not.toBeInTheDocument();
    expect(screen.getByTestId('line-chart-readout')).toHaveTextContent('P50');

    // Hide remaining series -> all-hidden state renders without crash or NaN
    fireEvent.click(p50Btn);
    fireEvent.click(slaBtn);
    expect(screen.getByTestId('toggle-root')).toHaveAttribute('data-all-hidden', 'true');
    expect(screen.getByTestId('line-chart-all-hidden')).toHaveTextContent(
      'All series hidden'
    );
    expect(screen.getByTestId('line-chart-svg').innerHTML).not.toContain('NaN');

    // Re-enable p95
    fireEvent.click(p95Btn);
    expect(p95Btn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('line-series-path-p95')).toBeInTheDocument();
    expect(screen.getByTestId('toggle-root')).not.toHaveAttribute('data-all-hidden');
  });

  it('sanitizes NaN/Infinity, handles negative values, zero-span domains, solo point, duplicates, empty states, and XSS', () => {
    const xssTitle = '<script>window.__lineXss=1</script><img src=x onerror=alert(1)>';
    const { rerender } = render(
      <LineMultiSeriesChart
        title={xssTitle}
        labels={['Dup', 'Dup', 'End']}
        series={[
          {
            id: 'dup',
            label: '<svg onload=alert(1)>Neg',
            tone: 'rose',
            values: [-25.5, Number.NaN, Number.POSITIVE_INFINITY],
          },
          {
            id: 'dup',
            label: 'Duplicate ID Series',
            values: [10],
          },
        ]}
      />
    );

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByRole('heading', { name: xssTitle })).toBeInTheDocument();
    expect(screen.getByTestId('line-chart-svg').innerHTML).not.toContain('NaN');

    // Constant zero-span (all zeros)
    rerender(
      <LineMultiSeriesChart
        labels={['A', 'B']}
        series={[{ id: 'flat0', label: 'Flat Zero', values: [0, 0] }]}
      />
    );
    expect(screen.getByTestId('line-chart-svg').innerHTML).not.toContain('NaN');

    // Constant non-zero zero-span (all equal)
    rerender(
      <LineMultiSeriesChart
        labels={['A', 'B']}
        series={[{ id: 'flat50', label: 'Flat 50', values: [50, 50] }]}
      />
    );
    expect(screen.getByTestId('line-chart-svg').innerHTML).not.toContain('NaN');

    // Single X-axis point
    rerender(
      <LineMultiSeriesChart
        labels={['Solo']}
        series={[{ id: 'solo', label: 'Solo', values: [42.25] }]}
      />
    );
    expect(screen.getByTestId('line-chart-svg').innerHTML).not.toContain('NaN');
    expect(screen.getByTestId('line-chart-readout-value')).toHaveTextContent('42.3');

    // Empty labels
    rerender(
      <LineMultiSeriesChart labels={[]} series={SAMPLE_SERIES} data-testid="empty-line" />
    );
    expect(screen.getByTestId('empty-line')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByTestId('line-chart-empty')).toHaveTextContent(
      'No trend series data available.'
    );

    // Empty series
    rerender(
      <LineMultiSeriesChart labels={SAMPLE_LABELS} series={[]} data-testid="empty-line" />
    );
    expect(screen.getByTestId('empty-line')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByTestId('line-chart-empty')).toBeInTheDocument();
  });
});
