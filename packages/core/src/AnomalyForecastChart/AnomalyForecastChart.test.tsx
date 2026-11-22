import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  AnomalyForecastChart,
  DEFAULT_ANOMALY_FORECAST_DATA,
  type AnomalyDetectionSummary,
  type AnomalyDirectionMap,
  type AnomalyForecastPoint,
} from './index';

describe('AnomalyForecastChart', () => {
  it('renders default 16-checkpoint dataset (12 historical with 2 anomalies + 4 forecast), forwards ref, applies theme overrides, and uses semantic tokens only', () => {
    const ref = createRef<HTMLDivElement>();
    const directionKeys: ReadonlyArray<keyof AnomalyDirectionMap> = [
      'normal',
      'upper-breach',
      'lower-breach',
    ];
    expect(directionKeys).toHaveLength(3);

    render(
      <PrismThemeProvider
        theme={{
          components: {
            AnomalyForecastChart: {
              className: 'theme-anomaly-chart',
              style: { maxWidth: '720px' },
            },
          },
        }}
      >
        <AnomalyForecastChart
          ref={ref}
          className="consumer-anomaly-chart"
          xstyle={{ '--prism-blur-px': '16px' }}
          style={{ marginTop: '8px' }}
          data-testid="anomaly-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('anomaly-root');
    expect(ref.current).toBe(root);
    expect(AnomalyForecastChart.displayName).toBe('AnomalyForecastChart');
    expect(root).toHaveClass(
      'refractor-anomaly-forecast-chart',
      'prism-slab',
      'theme-anomaly-chart',
      'consumer-anomaly-chart'
    );
    expect(root).toHaveStyle({ maxWidth: '720px', marginTop: '8px' });
    expect(root).toHaveAttribute('data-status', 'anomaly');
    expect(root).toHaveAttribute('data-anomalies', '2');
    expect(root).toHaveAttribute('data-show-forecast', 'true');
    expect(root).not.toHaveAttribute('data-empty');

    expect(
      screen.getByRole('heading', { name: 'Anomaly Detection & Forecast' })
    ).toBeInTheDocument();

    // Default dataset structure: 12 historical + 4 future forecast intervals
    expect(DEFAULT_ANOMALY_FORECAST_DATA).toHaveLength(16);
    expect(DEFAULT_ANOMALY_FORECAST_DATA.filter((pt) => pt.actual !== null)).toHaveLength(12);
    expect(DEFAULT_ANOMALY_FORECAST_DATA.filter((pt) => pt.actual === null)).toHaveLength(4);

    // Header Anomaly Count pill in --prism-error-main and Forecast toggle
    const countPill = screen.getByTestId('anomaly-count-pill');
    expect(countPill).toHaveTextContent('2 Anomalies');
    expect(countPill).toHaveAttribute('data-status', 'anomaly');
    expect(countPill.style.color).toBe('var(--prism-error-main)');

    const forecastToggle = screen.getByTestId('anomaly-forecast-toggle');
    expect(forecastToggle).toHaveTextContent('Show Forecast Horizon');
    expect(forecastToggle).toHaveAttribute('aria-pressed', 'true');

    // Responsive 460x220 SVG inside recessed prism-well with zero raw color literals
    const svg = screen.getByTestId('anomaly-chart-svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 460 220');
    expect(svg).toHaveClass('w-full', 'h-auto', 'select-none');
    expect(svg.parentElement).toHaveClass('prism-well');
    expect(svg.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(svg.innerHTML).not.toMatch(/\b(?:rgba?|hsla?)\s*\(/);
    expect(svg.innerHTML).not.toContain('NaN');

    // Confidence corridor polygon, dashed expected baseline, Now boundary, crisp actual polyline
    const band = screen.getByTestId('anomaly-confidence-band');
    expect(band.tagName.toLowerCase()).toBe('polygon');
    expect(band).toHaveAttribute('fill', 'var(--prism-info-main)');

    const expectedLine = screen.getByTestId('anomaly-expected-line');
    expect(expectedLine).toHaveAttribute('stroke', 'var(--prism-text-secondary)');
    expect(expectedLine).toHaveAttribute('stroke-dasharray', '5 4');

    expect(screen.getByTestId('anomaly-forecast-zone')).toBeInTheDocument();
    expect(screen.getByTestId('anomaly-now-divider')).toHaveAttribute(
      'stroke',
      'var(--prism-info-main)'
    );
    expect(screen.getByTestId('anomaly-now-label')).toHaveTextContent('Now');

    const actualLine = screen.getByTestId('anomaly-actual-line');
    expect(actualLine).toHaveAttribute('stroke', 'var(--prism-primary-main)');
    expect(screen.getAllByTestId('anomaly-y-gridline')).toHaveLength(5);

    // Out-of-band glowing rings for upper breach (index 4) and lower breach (index 8)
    expect(screen.getByTestId('anomaly-ring-4')).toHaveAttribute(
      'fill',
      'var(--prism-error-main)'
    );
    expect(screen.getByTestId('anomaly-ring-8')).toHaveAttribute(
      'fill',
      'var(--prism-warning-main)'
    );
    expect(screen.getByTestId('anomaly-point-4')).toHaveAttribute(
      'data-direction',
      'upper-breach'
    );
    expect(screen.getByTestId('anomaly-point-8')).toHaveAttribute(
      'data-direction',
      'lower-breach'
    );
    expect(screen.getByTestId('anomaly-point-12')).toHaveAttribute('data-forecast', 'true');

    // Detected Anomalies pill jump bar
    expect(screen.getByTestId('anomaly-jump-bar')).toBeInTheDocument();
    expect(screen.getByTestId('anomaly-jump-t-05')).toHaveTextContent('09:00');
    expect(screen.getByTestId('anomaly-jump-t-09')).toHaveTextContent('10:00');

    // Recessed aria-live="polite" telemetry readout defaults to latest historical point (10:45)
    const inspector = screen.getByTestId('anomaly-inspector');
    expect(inspector).toHaveClass('prism-well');
    expect(inspector).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByTestId('anomaly-inspector-timestamp')).toHaveTextContent('10:45');
    expect(screen.getByTestId('anomaly-inspector-actual')).toHaveTextContent(
      'Actual 148 req/s vs Expected 146 req/s'
    );
    expect(screen.getByTestId('anomaly-inspector-band')).toHaveTextContent(
      'Confidence Band [130..162 req/s]'
    );
    expect(screen.getByTestId('anomaly-inspector-deviation')).toHaveTextContent(
      'Deviation +2 req/s'
    );
    expect(screen.getByTestId('anomaly-inspector-status')).toHaveTextContent('Nominal');
  });

  it('jumps directly to detected anomalies via pill jump bar and emits typed AnomalyDetectionSummary payloads', () => {
    const onSelectPoint = vi.fn<(summary: AnomalyDetectionSummary) => void>();
    render(<AnomalyForecastChart onSelectPoint={onSelectPoint} />);

    // Jump to upper breach (09:00, index 4)
    const upperPill = screen.getByTestId('anomaly-jump-t-05');
    fireEvent.click(upperPill);
    expect(upperPill).toHaveAttribute('aria-pressed', 'true');
    expect(onSelectPoint).toHaveBeenCalledWith({
      point: DEFAULT_ANOMALY_FORECAST_DATA[4],
      index: 4,
      direction: 'upper-breach',
      deviation: 44,
    });
    expect(screen.getByTestId('anomaly-inspector-timestamp')).toHaveTextContent('09:00');
    expect(screen.getByTestId('anomaly-inspector-actual')).toHaveTextContent(
      'Actual 186 req/s vs Expected 142 req/s'
    );
    expect(screen.getByTestId('anomaly-inspector-band')).toHaveTextContent(
      'Confidence Band [126..158 req/s]'
    );
    expect(screen.getByTestId('anomaly-inspector-deviation')).toHaveTextContent(
      'Deviation +44 req/s'
    );
    const status = screen.getByTestId('anomaly-inspector-status');
    expect(status).toHaveTextContent('Upper Breach');
    expect(status.style.color).toBe('var(--prism-error-main)');

    // Jump to lower breach (10:00, index 8)
    const lowerPill = screen.getByTestId('anomaly-jump-t-09');
    fireEvent.click(lowerPill);
    expect(lowerPill).toHaveAttribute('aria-pressed', 'true');
    expect(upperPill).toHaveAttribute('aria-pressed', 'false');
    expect(onSelectPoint).toHaveBeenLastCalledWith({
      point: DEFAULT_ANOMALY_FORECAST_DATA[8],
      index: 8,
      direction: 'lower-breach',
      deviation: -46,
    });
    expect(screen.getByTestId('anomaly-inspector-timestamp')).toHaveTextContent('10:00');
    expect(screen.getByTestId('anomaly-inspector-actual')).toHaveTextContent(
      'Actual 94 req/s vs Expected 140 req/s'
    );
    expect(screen.getByTestId('anomaly-inspector-band')).toHaveTextContent(
      'Confidence Band [124..156 req/s]'
    );
    expect(screen.getByTestId('anomaly-inspector-deviation')).toHaveTextContent(
      'Deviation -46 req/s'
    );
    expect(screen.getByTestId('anomaly-inspector-status')).toHaveTextContent('Lower Breach');
    expect(screen.getByTestId('anomaly-inspector-status').style.color).toBe(
      'var(--prism-warning-main)'
    );
    expect(screen.getByTestId('anomaly-crosshair')).toHaveAttribute(
      'x1',
      screen.getByTestId('anomaly-point-8').getAttribute('cx')!
    );
  });

  it('supports clicking forecast checkpoints and IME-safe keyboard navigation (Enter, Space, ArrowLeft, ArrowRight, Home, End)', () => {
    const onSelectPoint = vi.fn<(summary: AnomalyDetectionSummary) => void>();
    render(<AnomalyForecastChart onSelectPoint={onSelectPoint} />);

    // Click forecast checkpoint (11:00, index 12)
    const forecastPt = screen.getByTestId('anomaly-point-12');
    fireEvent.click(forecastPt);
    expect(onSelectPoint).toHaveBeenCalledWith({
      point: DEFAULT_ANOMALY_FORECAST_DATA[12],
      index: 12,
      direction: 'normal',
      deviation: 0,
    });
    expect(screen.getByTestId('anomaly-inspector-timestamp')).toHaveTextContent('11:00');
    expect(screen.getByTestId('anomaly-inspector-actual')).toHaveTextContent(
      'Forecast — vs Expected 150 req/s'
    );
    expect(screen.getByTestId('anomaly-inspector-band')).toHaveTextContent(
      'Confidence Band [132..168 req/s]'
    );
    expect(screen.getByTestId('anomaly-inspector-deviation')).toHaveTextContent(
      'Deviation Horizon'
    );
    expect(screen.getByTestId('anomaly-inspector-status')).toHaveTextContent('Forecast');
    expect(screen.getByTestId('anomaly-inspector-status').style.color).toBe(
      'var(--prism-info-main)'
    );

    // IME composition must be ignored
    const imeEnter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    Object.defineProperty(imeEnter, 'isComposing', { value: true });
    forecastPt.dispatchEvent(imeEnter);
    expect(onSelectPoint).toHaveBeenCalledTimes(1);

    // Unrelated key must be ignored
    fireEvent.keyDown(forecastPt, { key: 'Escape' });
    expect(onSelectPoint).toHaveBeenCalledTimes(1);

    // ArrowRight advances into forecast horizon and moves DOM focus
    fireEvent.keyDown(forecastPt, { key: 'ArrowRight' });
    expect(onSelectPoint).toHaveBeenLastCalledWith({
      point: DEFAULT_ANOMALY_FORECAST_DATA[13],
      index: 13,
      direction: 'normal',
      deviation: 0,
    });
    expect(document.activeElement).toBe(screen.getByTestId('anomaly-point-13'));

    // ArrowLeft steps back to index 12
    fireEvent.keyDown(screen.getByTestId('anomaly-point-13'), { key: 'ArrowLeft' });
    expect(onSelectPoint).toHaveBeenLastCalledWith({
      point: DEFAULT_ANOMALY_FORECAST_DATA[12],
      index: 12,
      direction: 'normal',
      deviation: 0,
    });
    expect(document.activeElement).toBe(forecastPt);

    // Enter and Space activate focused checkpoints
    fireEvent.keyDown(screen.getByTestId('anomaly-point-4'), { key: 'Enter' });
    expect(onSelectPoint).toHaveBeenLastCalledWith({
      point: DEFAULT_ANOMALY_FORECAST_DATA[4],
      index: 4,
      direction: 'upper-breach',
      deviation: 44,
    });
    fireEvent.keyDown(screen.getByTestId('anomaly-point-2'), { key: ' ' });
    expect(onSelectPoint).toHaveBeenLastCalledWith({
      point: DEFAULT_ANOMALY_FORECAST_DATA[2],
      index: 2,
      direction: 'normal',
      deviation: 2,
    });

    // Home jumps to index 0 and ArrowLeft clamps at 0
    fireEvent.keyDown(screen.getByTestId('anomaly-point-2'), { key: 'Home' });
    expect(onSelectPoint).toHaveBeenLastCalledWith({
      point: DEFAULT_ANOMALY_FORECAST_DATA[0],
      index: 0,
      direction: 'normal',
      deviation: -2,
    });
    expect(document.activeElement).toBe(screen.getByTestId('anomaly-point-0'));
    fireEvent.keyDown(screen.getByTestId('anomaly-point-0'), { key: 'ArrowLeft' });
    expect(onSelectPoint).toHaveBeenLastCalledWith({
      point: DEFAULT_ANOMALY_FORECAST_DATA[0],
      index: 0,
      direction: 'normal',
      deviation: -2,
    });

    // End jumps to final checkpoint (15) and ArrowRight clamps at 15
    fireEvent.keyDown(screen.getByTestId('anomaly-point-0'), { key: 'End' });
    expect(onSelectPoint).toHaveBeenLastCalledWith({
      point: DEFAULT_ANOMALY_FORECAST_DATA[15],
      index: 15,
      direction: 'normal',
      deviation: 0,
    });
    expect(document.activeElement).toBe(screen.getByTestId('anomaly-point-15'));
    fireEvent.keyDown(screen.getByTestId('anomaly-point-15'), { key: 'ArrowRight' });
    expect(onSelectPoint).toHaveBeenLastCalledWith({
      point: DEFAULT_ANOMALY_FORECAST_DATA[15],
      index: 15,
      direction: 'normal',
      deviation: 0,
    });
  });

  it('toggles Show Forecast Horizon cleanly, hides Now divider and forecast points, and handles forecast-only datasets', () => {
    const { rerender } = render(<AnomalyForecastChart data-testid="toggle-chart" />);

    // Select a forecast checkpoint first
    fireEvent.click(screen.getByTestId('anomaly-point-14'));
    expect(screen.getByTestId('anomaly-inspector-timestamp')).toHaveTextContent('11:30');

    // Toggle forecast horizon off
    const toggleBtn = screen.getByTestId('anomaly-forecast-toggle');
    fireEvent.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('toggle-chart')).not.toHaveAttribute('data-show-forecast');
    expect(screen.queryByTestId('anomaly-now-divider')).toBeNull();
    expect(screen.queryByTestId('anomaly-forecast-zone')).toBeNull();
    expect(screen.queryByTestId('anomaly-point-12')).toBeNull();
    // Active readout falls back safely to latest historical checkpoint (10:45)
    expect(screen.getByTestId('anomaly-inspector-timestamp')).toHaveTextContent('10:45');
    // Historical anomalies remain accessible in the jump bar
    expect(screen.getByTestId('anomaly-jump-t-05')).toBeInTheDocument();

    // Toggle forecast horizon back on
    fireEvent.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('anomaly-now-divider')).toBeInTheDocument();
    expect(screen.getByTestId('anomaly-point-12')).toBeInTheDocument();

    // Forecast-only dataset: no actual polyline or Now divider; hiding forecast shows status message
    const forecastOnly: AnomalyForecastPoint[] = [
      { id: 'f1', label: '12:00', actual: null, expected: 100, lower: 90, upper: 110 },
      { id: 'f2', label: '12:15', actual: null, expected: 105, lower: 92, upper: 118 },
    ];
    rerender(<AnomalyForecastChart data={forecastOnly} data-testid="toggle-chart" />);
    expect(screen.queryByTestId('anomaly-actual-line')).toBeNull();
    expect(screen.queryByTestId('anomaly-now-divider')).toBeNull();
    expect(screen.getByTestId('anomaly-inspector-timestamp')).toHaveTextContent('12:15');

    fireEvent.click(screen.getByTestId('anomaly-forecast-toggle'));
    expect(screen.getByTestId('anomaly-hidden-forecast-state')).toHaveTextContent(
      'Forecast horizon hidden'
    );
    expect(screen.queryByTestId('anomaly-chart-svg')).toBeNull();
    expect(screen.queryByTestId('anomaly-inspector')).toBeNull();

    // Turn forecast back on -> restores chart
    fireEvent.click(screen.getByTestId('anomaly-forecast-toggle'));
    expect(screen.getByTestId('anomaly-chart-svg')).toBeInTheDocument();
  });

  it('renders Nominal pill for zero anomalies and singular 1 Anomaly pill for a single breach', () => {
    const nominalData: AnomalyForecastPoint[] = [
      { id: 'n1', label: '01:00', actual: 50, expected: 50, lower: 40, upper: 60 },
      { id: 'n2', label: '02:00', actual: 55, expected: 54, lower: 44, upper: 64 },
    ];
    const { rerender } = render(<AnomalyForecastChart data={nominalData} data-testid="status-root" />);

    const countPill = screen.getByTestId('anomaly-count-pill');
    expect(countPill).toHaveTextContent('Nominal');
    expect(countPill).toHaveAttribute('data-status', 'nominal');
    expect(countPill.style.color).toBe('var(--prism-success-main)');
    expect(screen.getByTestId('status-root')).toHaveAttribute('data-status', 'nominal');
    expect(screen.queryByTestId('anomaly-jump-bar')).toBeNull();

    // Click index 0 where deviation === 0
    fireEvent.click(screen.getByTestId('anomaly-point-0'));
    expect(screen.getByTestId('anomaly-inspector-deviation')).toHaveTextContent('Deviation 0 req/s');

    // Single anomaly triggers singular "1 Anomaly" copy
    const singleAnomalyData: AnomalyForecastPoint[] = [
      { id: 's1', label: '01:00', actual: 50, expected: 50, lower: 40, upper: 60 },
      { id: 's2', label: '02:00', actual: 82, expected: 52, lower: 42, upper: 62 },
    ];
    rerender(<AnomalyForecastChart data={singleAnomalyData} data-testid="status-root" />);
    expect(screen.getByTestId('anomaly-count-pill')).toHaveTextContent('1 Anomaly');
    expect(screen.getByTestId('anomaly-chart-svg')).toHaveAttribute(
      'aria-label',
      'Anomaly Detection & Forecast chart across 2 checkpoints with 1 detected anomaly'
    );
  });

  it('handles single checkpoint, empty unit, decimal values, constant/negative domains, reversed bands, non-finite inputs, and duplicate IDs safely', () => {
    // 1. Single checkpoint with empty unit, decimal values, and negative values
    const singlePoint: AnomalyForecastPoint[] = [
      { id: 'solo', label: 'T0', actual: -12.36, expected: -10.1, lower: -11.5, upper: -8.5 },
    ];
    const { rerender } = render(<AnomalyForecastChart data={singlePoint} unit="" />);
    expect(screen.getByTestId('anomaly-confidence-band').tagName.toLowerCase()).toBe('rect');
    expect(screen.getByTestId('anomaly-expected-line').tagName.toLowerCase()).toBe('line');
    expect(screen.queryByTestId('anomaly-actual-line')).toBeNull();
    expect(screen.getByTestId('anomaly-inspector-actual')).toHaveTextContent(
      'Actual -12.4 vs Expected -10.1'
    );
    expect(screen.getByTestId('anomaly-inspector-band')).toHaveTextContent(
      'Confidence Band [-11.5..-8.5]'
    );
    expect(screen.getByTestId('anomaly-inspector-deviation')).toHaveTextContent('Deviation -2.3');
    expect(screen.getByTestId('anomaly-inspector-status')).toHaveTextContent('Lower Breach');
    expect(screen.getByTestId('anomaly-chart-svg').innerHTML).not.toContain('NaN');

    // 2. Constant all-zero domain
    rerender(
      <AnomalyForecastChart
        data={[
          { id: 'z1', label: 'Z1', actual: -0, expected: 0, lower: 0, upper: 0 },
          { id: 'z2', label: 'Z2', actual: 0, expected: 0, lower: 0, upper: 0 },
        ]}
      />
    );
    expect(screen.getByTestId('anomaly-chart-svg').innerHTML).not.toContain('NaN');

    // 3. Constant non-zero domain
    rerender(
      <AnomalyForecastChart
        data={[
          { id: 'c1', label: 'C1', actual: 40, expected: 40, lower: 40, upper: 40 },
          { id: 'c2', label: 'C2', actual: 40, expected: 40, lower: 40, upper: 40 },
        ]}
      />
    );
    expect(screen.getByTestId('anomaly-chart-svg').innerHTML).not.toContain('NaN');

    // 4. Non-finite fields, reversed lower/upper bounds, duplicate IDs, and expected outside band
    rerender(
      <AnomalyForecastChart
        data={[
          {
            id: 'dup',
            label: 'Bad1',
            actual: Number.NaN,
            expected: Number.POSITIVE_INFINITY,
            lower: Number.NaN,
            upper: Number.NEGATIVE_INFINITY,
          },
          {
            id: 'dup',
            label: 'Reversed',
            actual: 65,
            expected: 30,
            lower: 55,
            upper: 25,
          },
          {
            id: 'dup',
            label: 'ExpectedHigh',
            actual: 50,
            expected: 90,
            lower: 40,
            upper: 60,
          },
          {
            id: 'dup',
            label: 'ExpectedLow',
            actual: 50,
            expected: -5,
            lower: 40,
            upper: 60,
          },
        ]}
      />
    );
    const svg = screen.getByTestId('anomaly-chart-svg');
    expect(svg.innerHTML).not.toContain('NaN');
    expect(screen.getByTestId('anomaly-point-0')).toHaveAttribute('data-forecast', 'true');
    expect(screen.getByTestId('anomaly-point-1')).toHaveAttribute('data-direction', 'upper-breach');
    expect(screen.getByTestId('anomaly-count-pill')).toHaveTextContent('1 Anomaly');
  });

  it('renders clean role="status" empty state when data is [] and neutralizes XSS payloads', () => {
    const { rerender } = render(<AnomalyForecastChart data={[]} data-testid="empty-anomaly" />);

    const root = screen.getByTestId('empty-anomaly');
    expect(root).toHaveAttribute('data-empty', 'true');
    expect(root).not.toHaveAttribute('data-status');
    expect(root).not.toHaveAttribute('data-anomalies');

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('No anomaly detection or forecast telemetry available.');
    expect(screen.queryByTestId('anomaly-chart-svg')).toBeNull();
    expect(screen.queryByTestId('anomaly-count-pill')).toBeNull();
    expect(screen.queryByTestId('anomaly-forecast-toggle')).toBeNull();
    expect(screen.queryByTestId('anomaly-inspector')).toBeNull();

    const xssPayload = '<script>window.__anomalyXss=1</script><img src=x onerror=alert(1)>';
    rerender(
      <AnomalyForecastChart
        title={xssPayload}
        unit={xssPayload}
        data={[{ id: 'xss', label: xssPayload, actual: 25, expected: 20, lower: 15, upper: 22 }]}
      />
    );
    expect(screen.getByRole('heading', { name: xssPayload })).toBeInTheDocument();
    expect(screen.getByTestId('anomaly-inspector-timestamp')).toHaveTextContent(xssPayload);
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
  });
});
