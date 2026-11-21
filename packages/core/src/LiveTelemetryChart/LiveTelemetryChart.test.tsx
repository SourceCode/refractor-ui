import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  LiveTelemetryChart,
  type TelemetrySample,
  type TelemetryTone,
  type TelemetryToneMap,
} from './index';

const BASE_SAMPLES: TelemetrySample[] = [
  { id: 's1', timestamp: '12:00:01', value: 40 },
  { id: 's2', timestamp: '12:00:02', value: 55 },
  { id: 's3', timestamp: '12:00:03', value: 45 },
  { id: 's4', timestamp: '12:00:04', value: 60 },
];

function makeSeries(count: number, startOffset = 0): TelemetrySample[] {
  const list: TelemetrySample[] = [];
  for (let i = 0; i < count; i += 1) {
    const seq = startOffset + i + 1;
    list.push({
      id: `pt-${seq}`,
      timestamp: `00:${String(Math.floor(seq / 60)).padStart(2, '0')}:${String(seq % 60).padStart(2, '0')}`,
      value: 20 + ((seq * 7) % 80),
    });
  }
  return list;
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('LiveTelemetryChart', () => {
  it('renders optical slab with ref, theme override, --prism-* tokens, 4-stat strip, area gradient, and inspector', () => {
    const ref = createRef<HTMLDivElement>();
    const toneKeys: ReadonlyArray<keyof TelemetryToneMap> = [
      'primary',
      'secondary',
      'emerald',
      'amber',
      'rose',
    ];
    expect(toneKeys).toHaveLength(5);

    render(
      <PrismThemeProvider
        theme={{
          components: {
            LiveTelemetryChart: {
              className: 'theme-telemetry',
              style: { maxWidth: '720px' },
            },
          },
        }}
      >
        <LiveTelemetryChart
          ref={ref}
          samples={BASE_SAMPLES}
          className="local-telemetry"
          xstyle={{ '--prism-blur-px': '18px' }}
          style={{ marginTop: '6px' }}
          data-testid="telemetry-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('telemetry-root');
    expect(ref.current).toBe(root);
    expect(LiveTelemetryChart.displayName).toBe('LiveTelemetryChart');
    expect(root).toHaveClass(
      'refractor-live-telemetry-chart',
      'prism-slab',
      'theme-telemetry',
      'local-telemetry'
    );
    expect(root).toHaveStyle({ maxWidth: '720px', marginTop: '6px' });
    expect(root).toHaveAttribute('data-tone', 'primary');
    expect(root).toHaveAttribute('data-window-size', '40');
    expect(root).not.toHaveAttribute('data-paused');
    expect(root).not.toHaveAttribute('data-empty');
    expect(root).not.toHaveAttribute('data-warning');

    // Header badge, title, and controls
    const badge = screen.getByTestId('telemetry-status-badge');
    expect(badge).toHaveAttribute('data-status', 'live');
    expect(badge).toHaveTextContent('LIVE');
    expect(
      screen.getByRole('heading', { name: 'Live Telemetry Stream' })
    ).toBeInTheDocument();
    expect(screen.queryByTestId('telemetry-step-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('telemetry-buffered-badge')).not.toBeInTheDocument();

    // 4-stat strip
    expect(screen.getByTestId('telemetry-stat-current')).toHaveTextContent('60ms');
    expect(screen.getByTestId('telemetry-stat-min')).toHaveTextContent('40ms');
    expect(screen.getByTestId('telemetry-stat-avg')).toHaveTextContent('50ms');
    expect(screen.getByTestId('telemetry-stat-max')).toHaveTextContent('60ms');

    // SVG canvas
    const svg = screen.getByRole('img', { name: 'Live Telemetry Stream' });
    expect(svg).toHaveAttribute('viewBox', '0 0 640 200');
    expect(svg.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(svg.innerHTML).not.toContain('NaN');
    expect(screen.getAllByTestId('telemetry-gridline')).toHaveLength(4);
    expect(screen.getByTestId('telemetry-area-path')).toBeInTheDocument();
    expect(screen.getByTestId('telemetry-polyline')).toHaveAttribute(
      'stroke',
      'var(--prism-primary-main)'
    );
    expect(screen.getByTestId('telemetry-endpoint-glow')).toHaveAttribute(
      'fill',
      'var(--prism-primary-main)'
    );

    const stops = svg.querySelectorAll('linearGradient stop');
    expect(stops).toHaveLength(2);
    expect(stops[0]).toHaveAttribute('stop-color', 'var(--prism-primary-main)');

    // Inspector shows latest sample by default
    expect(screen.getByTestId('telemetry-inspector')).toHaveTextContent('Latest sample');
    expect(screen.getByTestId('telemetry-inspector-readout')).toHaveTextContent(
      '12:00:04 · 60ms'
    );
  });

  it('supports all 5 semantic tones, height clamping (140..360), and custom/empty unit', () => {
    const tonePairs: ReadonlyArray<readonly [TelemetryTone, string]> = [
      ['primary', 'var(--prism-primary-main)'],
      ['secondary', 'var(--prism-secondary-main)'],
      ['emerald', 'var(--prism-success-main)'],
      ['amber', 'var(--prism-warning-main)'],
      ['rose', 'var(--prism-error-main)'],
    ];

    const { rerender } = render(
      <LiveTelemetryChart
        samples={BASE_SAMPLES}
        tone="primary"
        height={60}
        unit="req/s"
      />
    );

    expect(screen.getByTestId('telemetry-chart-svg')).toHaveAttribute(
      'viewBox',
      '0 0 640 140'
    );
    expect(screen.getByTestId('telemetry-stat-current')).toHaveTextContent('60req/s');

    for (const [tone, expectedToken] of tonePairs) {
      rerender(
        <LiveTelemetryChart
          samples={BASE_SAMPLES}
          tone={tone}
          height={500}
          unit=""
        />
      );
      expect(screen.getByTestId('telemetry-polyline')).toHaveAttribute(
        'stroke',
        expectedToken
      );
      expect(screen.getByTestId('telemetry-chart-svg')).toHaveAttribute(
        'viewBox',
        '0 0 640 360'
      );
      expect(screen.getByTestId('telemetry-inspector-readout')).toHaveTextContent(
        '12:00:04 · 60'
      );
    }

    // NaN height falls back to 200
    rerender(
      <LiveTelemetryChart samples={BASE_SAMPLES} height={Number.NaN} />
    );
    expect(screen.getByTestId('telemetry-chart-svg')).toHaveAttribute(
      'viewBox',
      '0 0 640 200'
    );
  });

  it('renders warningThreshold line, highlights Current and exceeding points, and expands Y-domain cleanly', () => {
    const { rerender } = render(
      <LiveTelemetryChart
        samples={[
          { id: 'w1', timestamp: '10:00:01', value: 40 },
          { id: 'w2', timestamp: '10:00:02', value: 95 },
          { id: 'w3', timestamp: '10:00:03', value: 110 },
        ]}
        warningThreshold={95}
        data-testid="warn-root"
      />
    );

    expect(screen.getByTestId('warn-root')).toHaveAttribute('data-warning', 'true');
    expect(screen.getByTestId('telemetry-warning-threshold')).toHaveTextContent(
      'WARN 95ms'
    );
    expect(screen.getByTestId('telemetry-stat-current')).toHaveAttribute(
      'data-warning',
      'true'
    );
    expect(screen.getByTestId('telemetry-point-0')).not.toHaveAttribute('data-warning');
    expect(screen.getByTestId('telemetry-point-1')).toHaveAttribute(
      'data-warning',
      'true'
    );
    expect(screen.getByTestId('telemetry-point-1')).toHaveAttribute(
      'fill',
      'var(--prism-error-main)'
    );
    expect(screen.getByTestId('telemetry-endpoint-glow')).toHaveAttribute(
      'fill',
      'var(--prism-error-main)'
    );
    expect(screen.getByTestId('telemetry-inspector-warning')).toHaveTextContent(
      'Warning'
    );

    // Threshold strictly above all values expands upper domain; Current not warned
    rerender(
      <LiveTelemetryChart
        samples={BASE_SAMPLES}
        warningThreshold={200}
        data-testid="warn-root"
      />
    );
    expect(screen.getByTestId('warn-root')).not.toHaveAttribute('data-warning');
    expect(screen.getByTestId('telemetry-stat-current')).not.toHaveAttribute(
      'data-warning'
    );
    expect(screen.getByTestId('telemetry-warning-threshold')).toHaveTextContent(
      'WARN 200ms'
    );
    expect(screen.queryByTestId('telemetry-inspector-warning')).not.toBeInTheDocument();

    // Threshold strictly below all values expands lower domain
    rerender(
      <LiveTelemetryChart
        samples={BASE_SAMPLES}
        warningThreshold={10}
        data-testid="warn-root"
      />
    );
    expect(screen.getByTestId('warn-root')).toHaveAttribute('data-warning', 'true');
    expect(screen.getByTestId('telemetry-chart-svg').innerHTML).not.toContain('NaN');

    // Non-finite warningThreshold is ignored safely
    rerender(
      <LiveTelemetryChart
        samples={BASE_SAMPLES}
        warningThreshold={Number.POSITIVE_INFINITY}
        data-testid="warn-root"
      />
    );
    expect(
      screen.queryByTestId('telemetry-warning-threshold')
    ).not.toBeInTheDocument();
  });

  it('switches rolling window sizes (20, 40, 60) and slices buffer tail accurately', () => {
    const manySamples = makeSeries(65);

    render(
      <LiveTelemetryChart
        samples={manySamples}
        defaultWindowSize={20}
        data-testid="win-root"
      />
    );

    expect(screen.getByTestId('win-root')).toHaveAttribute('data-window-size', '20');
    expect(screen.getByTestId('telemetry-window-20')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByTestId('telemetry-window-40')).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(screen.queryByTestId('telemetry-point-19')).toBeInTheDocument();
    expect(screen.queryByTestId('telemetry-point-20')).not.toBeInTheDocument();

    // Switch to 40
    fireEvent.click(screen.getByTestId('telemetry-window-40'));
    expect(screen.getByTestId('win-root')).toHaveAttribute('data-window-size', '40');
    expect(screen.getByTestId('telemetry-window-40')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.queryByTestId('telemetry-point-39')).toBeInTheDocument();
    expect(screen.queryByTestId('telemetry-point-40')).not.toBeInTheDocument();

    // Switch to 60
    fireEvent.click(screen.getByTestId('telemetry-window-60'));
    expect(screen.getByTestId('win-root')).toHaveAttribute('data-window-size', '60');
    expect(screen.queryByTestId('telemetry-point-59')).toBeInTheDocument();
    expect(screen.queryByTestId('telemetry-point-60')).not.toBeInTheDocument();

    // Switch back to 20
    fireEvent.click(screen.getByTestId('telemetry-window-20'));
    expect(screen.queryByTestId('telemetry-point-19')).toBeInTheDocument();
    expect(screen.queryByTestId('telemetry-point-20')).not.toBeInTheDocument();
  });

  it('freezes rendered snapshot while paused, displays buffered count, and catches up on resume (uncontrolled & controlled)', () => {
    const onPausedChange = vi.fn<(paused: boolean) => void>();

    const { rerender } = render(
      <LiveTelemetryChart
        samples={BASE_SAMPLES}
        onPausedChange={onPausedChange}
        data-testid="pause-root"
      />
    );

    const toggle = screen.getByTestId('telemetry-pause-toggle');
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(toggle).toHaveTextContent('Pause');

    // Pause in uncontrolled mode
    fireEvent.click(toggle);
    expect(onPausedChange).toHaveBeenCalledWith(true);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(toggle).toHaveTextContent('Resume');
    expect(screen.getByTestId('telemetry-status-badge')).toHaveTextContent('PAUSED');
    expect(screen.getByTestId('pause-root')).toHaveAttribute('data-paused', 'true');

    // New samples arrive while paused -> window remains frozen at 4 samples, buffered badge shows +2
    const expanded: TelemetrySample[] = [
      ...BASE_SAMPLES,
      { id: 's5', timestamp: '12:00:05', value: 99 },
      { id: 's6', timestamp: '12:00:06', value: 120 },
    ];
    rerender(
      <LiveTelemetryChart
        samples={expanded}
        onPausedChange={onPausedChange}
        data-testid="pause-root"
      />
    );

    expect(screen.queryByTestId('telemetry-point-4')).not.toBeInTheDocument();
    expect(screen.getByTestId('telemetry-stat-current')).toHaveTextContent('60ms');
    expect(screen.getByTestId('telemetry-buffered-badge')).toHaveTextContent(
      '+2 buffered'
    );

    // Parent shrinks samples while paused -> buffered clamps safely to 0, snapshot stays frozen
    rerender(
      <LiveTelemetryChart
        samples={[]}
        onPausedChange={onPausedChange}
        data-testid="pause-root"
      />
    );
    expect(screen.queryByTestId('telemetry-buffered-badge')).not.toBeInTheDocument();
    expect(screen.getByTestId('telemetry-stat-current')).toHaveTextContent('60ms');

    // Restore expanded samples then resume -> unfreezes and displays latest 120ms
    rerender(
      <LiveTelemetryChart
        samples={expanded}
        onPausedChange={onPausedChange}
        data-testid="pause-root"
      />
    );
    fireEvent.click(screen.getByTestId('telemetry-pause-toggle'));
    expect(onPausedChange).toHaveBeenLastCalledWith(false);
    expect(screen.getByTestId('telemetry-status-badge')).toHaveTextContent('LIVE');
    expect(screen.queryByTestId('telemetry-buffered-badge')).not.toBeInTheDocument();
    expect(screen.getByTestId('telemetry-stat-current')).toHaveTextContent('120ms');
    expect(screen.getByTestId('telemetry-point-5')).toBeInTheDocument();
  });

  it('supports defaultPaused={true} and controlled paused prop transitions', () => {
    const onPausedChange = vi.fn<(paused: boolean) => void>();

    // Mount initially paused (uncontrolled defaultPaused)
    const { unmount } = render(
      <LiveTelemetryChart
        samples={BASE_SAMPLES}
        defaultPaused
        data-testid="init-paused"
      />
    );
    expect(screen.getByTestId('init-paused')).toHaveAttribute('data-paused', 'true');
    expect(screen.getByTestId('telemetry-status-badge')).toHaveTextContent('PAUSED');
    unmount();

    // Controlled paused={false} -> clicking calls callback without internally mutating
    const { rerender } = render(
      <LiveTelemetryChart
        samples={BASE_SAMPLES}
        paused={false}
        onPausedChange={onPausedChange}
        data-testid="ctrl-root"
      />
    );
    fireEvent.click(screen.getByTestId('telemetry-pause-toggle'));
    expect(onPausedChange).toHaveBeenCalledWith(true);
    expect(screen.getByTestId('ctrl-root')).not.toHaveAttribute('data-paused');

    // Parent updates paused={true} and pushes new sample -> freezes & buffers
    rerender(
      <LiveTelemetryChart
        samples={BASE_SAMPLES}
        paused
        onPausedChange={onPausedChange}
        data-testid="ctrl-root"
      />
    );
    rerender(
      <LiveTelemetryChart
        samples={[...BASE_SAMPLES, { id: 'c5', timestamp: '12:00:05', value: 88 }]}
        paused
        onPausedChange={onPausedChange}
        data-testid="ctrl-root"
      />
    );
    expect(screen.getByTestId('telemetry-buffered-badge')).toHaveTextContent(
      '+1 buffered'
    );
    expect(screen.getByTestId('telemetry-stat-current')).toHaveTextContent('60ms');

    // Parent sets paused={false} -> unfreezes immediately
    rerender(
      <LiveTelemetryChart
        samples={[...BASE_SAMPLES, { id: 'c5', timestamp: '12:00:05', value: 88 }]}
        paused={false}
        onPausedChange={onPausedChange}
        data-testid="ctrl-root"
      />
    );
    expect(screen.getByTestId('telemetry-stat-current')).toHaveTextContent('88ms');
  });

  it('streams samples on streamingIntervalMs, supports Step button, filters non-finite generated values, and cleans up clearInterval on pause/unmount', () => {
    vi.useFakeTimers();
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
    const generator = vi.fn<(sequence: number) => TelemetrySample>((seq) => ({
      id: `gen-${seq}`,
      timestamp: `12:01:0${seq}`,
      // Sequence 2 returns NaN to prove non-finite generated samples are safely ignored
      value: seq === 2 ? Number.NaN : 70 + seq * 5,
    }));

    const { unmount } = render(
      <LiveTelemetryChart
        samples={BASE_SAMPLES}
        streamingIntervalMs={250}
        onGenerateSample={generator}
      />
    );

    expect(screen.getByTestId('telemetry-step-button')).toBeInTheDocument();

    // Advance 3 ticks -> seq 1 (75), seq 2 (NaN skipped), seq 3 (85)
    act(() => {
      vi.advanceTimersByTime(750);
    });
    expect(generator).toHaveBeenCalledTimes(3);
    expect(generator).toHaveBeenNthCalledWith(1, 1);
    expect(generator).toHaveBeenNthCalledWith(2, 2);
    expect(generator).toHaveBeenNthCalledWith(3, 3);
    expect(screen.getByTestId('telemetry-stat-current')).toHaveTextContent('85ms');

    // Manual Step pushes seq 4 (90) immediately
    fireEvent.click(screen.getByTestId('telemetry-step-button'));
    expect(generator).toHaveBeenNthCalledWith(4, 4);
    expect(screen.getByTestId('telemetry-stat-current')).toHaveTextContent('90ms');

    // Pausing clears interval and prevents further automatic ticks
    const clearsBeforePause = clearIntervalSpy.mock.calls.length;
    fireEvent.click(screen.getByTestId('telemetry-pause-toggle'));
    expect(clearIntervalSpy.mock.calls.length).toBeGreaterThan(clearsBeforePause);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(generator).toHaveBeenCalledTimes(4);

    // Resuming restarts interval
    fireEvent.click(screen.getByTestId('telemetry-pause-toggle'));
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(generator).toHaveBeenCalledTimes(5);
    expect(screen.getByTestId('telemetry-stat-current')).toHaveTextContent('95ms');

    // Unmount cleans up active interval
    const clearsBeforeUnmount = clearIntervalSpy.mock.calls.length;
    unmount();
    expect(clearIntervalSpy.mock.calls.length).toBeGreaterThan(clearsBeforeUnmount);

    // Invalid/negative interval never schedules ticks
    const idleGen = vi.fn<(seq: number) => TelemetrySample>((seq) => ({
      timestamp: `00:00:0${seq}`,
      value: 10,
    }));
    render(
      <LiveTelemetryChart
        samples={BASE_SAMPLES}
        streamingIntervalMs={-100}
        onGenerateSample={idleGen}
      />
    );
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(idleGen).not.toHaveBeenCalled();
  });

  it('handles click and IME-safe Enter/Space point selection and falls back to latest when selected point scrolls out', () => {
    const onSelectSample = vi.fn<(sample: TelemetrySample, index: number) => void>();
    const initial20 = makeSeries(20);

    render(
      <LiveTelemetryChart
        samples={initial20}
        defaultWindowSize={20}
        onSelectSample={onSelectSample}
        onGenerateSample={(seq) => ({
          id: `push-${seq}`,
          timestamp: `99:00:0${seq}`,
          value: 77,
        })}
      />
    );

    const point0 = screen.getByTestId('telemetry-point-0');
    fireEvent.click(point0);
    expect(onSelectSample).toHaveBeenCalledWith(initial20[0], 0);
    expect(point0).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('telemetry-inspector')).toHaveTextContent(
      'Selected sample'
    );
    expect(screen.getByTestId('telemetry-inspector-readout')).toHaveTextContent(
      `${initial20[0]?.timestamp} · ${initial20[0]?.value}ms`
    );

    // Keyboard Enter selects point 2
    const point2 = screen.getByTestId('telemetry-point-2');
    fireEvent.keyDown(point2, { key: 'Enter' });
    expect(onSelectSample).toHaveBeenLastCalledWith(initial20[2], 2);

    // Keyboard Space selects point 0 again (oldest in 20-sample window)
    fireEvent.keyDown(point0, { key: ' ' });
    expect(onSelectSample).toHaveBeenLastCalledWith(initial20[0], 0);

    // Unrelated key ignored
    const callsBefore = onSelectSample.mock.calls.length;
    fireEvent.keyDown(point2, { key: 'Escape' });
    expect(onSelectSample).toHaveBeenCalledTimes(callsBefore);

    // IME composition Enter is ignored
    const imeEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    Object.defineProperty(imeEvent, 'isComposing', { value: true });
    point2.dispatchEvent(imeEvent);
    expect(onSelectSample).toHaveBeenCalledTimes(callsBefore);

    // Step pushes 1 new sample -> oldest point0 scrolls out of the 20-sample window; inspector falls back to Latest sample
    fireEvent.click(screen.getByTestId('telemetry-step-button'));
    expect(screen.getByTestId('telemetry-inspector')).toHaveTextContent('Latest sample');
    expect(screen.getByTestId('telemetry-inspector-readout')).toHaveTextContent(
      '99:00:01 · 77ms'
    );
  });

  it('handles empty state, all non-finite inputs, solo point, flat zero/non-zero domains, negative decimals, duplicate keys, and XSS safely', () => {
    const xssTitle = '<script>window.__telemetryXss=1</script><img src=x onerror=alert(1)>';

    const { rerender } = render(
      <LiveTelemetryChart
        title={xssTitle}
        samples={[
          { timestamp: 'dup', value: -40.25 },
          { timestamp: 'dup', value: Number.NaN },
          { id: 'same', timestamp: '12:00:02', value: -12.75 },
          { id: 'same', timestamp: '12:00:03', value: Number.NEGATIVE_INFINITY },
          { id: 'same', timestamp: '12:00:04', value: -20 },
        ]}
      />
    );

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByRole('heading', { name: xssTitle })).toBeInTheDocument();
    expect(screen.getByTestId('telemetry-chart-svg').innerHTML).not.toContain('NaN');
    expect(screen.getByTestId('telemetry-stat-min')).toHaveTextContent('-40.2ms');
    expect(screen.getByTestId('telemetry-stat-max')).toHaveTextContent('-12.7ms');

    // Solo point omits area fill path and centers dot cleanly
    rerender(
      <LiveTelemetryChart
        samples={[{ timestamp: '12:00:00', value: 42 }]}
      />
    );
    expect(screen.queryByTestId('telemetry-area-path')).not.toBeInTheDocument();
    expect(screen.getByTestId('telemetry-point-0')).toBeInTheDocument();
    expect(screen.getByTestId('telemetry-chart-svg').innerHTML).not.toContain('NaN');

    // Flat all-zero series including -0
    rerender(
      <LiveTelemetryChart
        samples={[
          { timestamp: '00:00:01', value: -0 },
          { timestamp: '00:00:02', value: 0 },
        ]}
      />
    );
    expect(screen.getByTestId('telemetry-stat-current')).toHaveTextContent('0ms');
    expect(screen.getByTestId('telemetry-chart-svg').innerHTML).not.toContain('NaN');

    // Flat non-zero series
    rerender(
      <LiveTelemetryChart
        samples={[
          { timestamp: '00:00:01', value: 50 },
          { timestamp: '00:00:02', value: 50 },
        ]}
      />
    );
    expect(screen.getByTestId('telemetry-chart-svg').innerHTML).not.toContain('NaN');

    // Only non-finite samples -> clean empty state
    rerender(
      <LiveTelemetryChart
        samples={[
          { timestamp: '00:00:01', value: Number.NaN },
          { timestamp: '00:00:02', value: Number.POSITIVE_INFINITY },
        ]}
        data-testid="empty-root"
      />
    );
    expect(screen.getByTestId('empty-root')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByTestId('telemetry-empty')).toHaveTextContent(
      'No finite telemetry samples available.'
    );
    expect(screen.queryByTestId('telemetry-chart-svg')).not.toBeInTheDocument();

    // Empty array -> clean empty state
    rerender(<LiveTelemetryChart samples={[]} data-testid="empty-root" />);
    expect(screen.getByTestId('empty-root')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByTestId('telemetry-empty')).toBeInTheDocument();
  });
});
