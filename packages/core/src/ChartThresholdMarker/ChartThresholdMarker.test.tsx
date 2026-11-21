import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  ChartThresholdMarker,
  type ChartEventMarker,
  type ChartTargetBand,
  type ChartThresholdLine,
  type ThresholdDataPoint,
  type ThresholdTone,
  type ThresholdToneMap,
} from './index';

const SAMPLE_DATA: ThresholdDataPoint[] = [
  { label: '09:00', value: 82 },
  { label: '10:00', value: 118 },
  { label: '11:00', value: 164 },
  { label: '12:00', value: 142 },
  { label: '13:00', value: 94 },
];

const SAMPLE_BANDS: ChartTargetBand[] = [
  { id: 'slo-band', label: 'Nominal SLO', from: 70, to: 120, tone: 'emerald' },
];

const SAMPLE_THRESHOLDS: ChartThresholdLine[] = [
  { id: 'warn-cap', label: 'Warn Cap', value: 130, tone: 'amber' },
  { id: 'sla-max', label: 'SLA Max', value: 150, tone: 'rose', dashed: true },
  { id: 'budget-floor', label: 'Solid Floor', value: 200, tone: 'secondary', dashed: false },
];

const SAMPLE_EVENTS: ChartEventMarker[] = [
  {
    id: 'deploy',
    index: 2,
    label: 'v2.4 Deploy',
    detail: 'Canary rollout triggered brief spike',
    tone: 'primary',
  },
  {
    id: 'warm',
    index: 4,
    label: 'Cache Warm',
    tone: 'emerald',
  },
];

describe('ChartThresholdMarker', () => {
  it('renders prism-slab card with ref, theme override, counts pill, bands, thresholds, breach dots, and events using --prism-* tokens', () => {
    const ref = createRef<HTMLDivElement>();
    const toneKeys: ReadonlyArray<keyof ThresholdToneMap> = [
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
            ChartThresholdMarker: {
              className: 'theme-threshold-card',
              style: { maxWidth: '720px' },
            },
          },
        }}
      >
        <ChartThresholdMarker
          ref={ref}
          title="Gateway Latency"
          valueUnit="ms"
          data={SAMPLE_DATA}
          bands={SAMPLE_BANDS}
          thresholds={SAMPLE_THRESHOLDS}
          events={SAMPLE_EVENTS}
          className="local-threshold-card"
          xstyle={{ '--prism-blur-px': '20px' }}
          style={{ marginTop: '10px' }}
          data-testid="threshold-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('threshold-root');
    expect(ref.current).toBe(root);
    expect(ChartThresholdMarker.displayName).toBe('ChartThresholdMarker');
    expect(root).toHaveClass(
      'refractor-chart-threshold-marker',
      'prism-slab',
      'theme-threshold-card',
      'local-threshold-card'
    );
    expect(root).toHaveStyle({ maxWidth: '720px', marginTop: '10px' });
    expect(root).toHaveAttribute('data-show-bands', 'true');
    expect(root).toHaveAttribute('data-show-thresholds', 'true');
    expect(root).toHaveAttribute('data-show-events', 'true');
    expect(root).not.toHaveAttribute('data-empty');

    // Header counts pill
    expect(screen.getByTestId('threshold-counts-pill')).toHaveTextContent('3 lines · 2 events');

    // SVG plot contract
    const svg = screen.getByRole('img', { name: 'Gateway Latency' });
    expect(svg).toHaveAttribute('viewBox', '0 0 620 250');
    expect(svg.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(svg.innerHTML).not.toContain('NaN');
    expect(screen.getAllByTestId('threshold-gridline')).toHaveLength(4);
    expect(screen.getByTestId('threshold-area-path')).toBeInTheDocument();
    expect(screen.getByTestId('threshold-trend-polyline')).toHaveAttribute(
      'stroke',
      'var(--prism-primary-main)'
    );

    // Band fill opacity and token
    const sloBand = screen.getByTestId('threshold-band-slo-band');
    expect(sloBand).toHaveAttribute('data-tone', 'emerald');
    const bandRect = sloBand.querySelector('rect');
    expect(bandRect).toHaveAttribute('fill', 'var(--prism-success-main)');
    expect(bandRect).toHaveAttribute('fill-opacity', '0.12');

    // Threshold lines (dashed default vs solid override) and breach counts
    const warnLine = screen.getByTestId('threshold-line-warn-cap');
    const slaLine = screen.getByTestId('threshold-line-sla-max');
    const solidLine = screen.getByTestId('threshold-line-budget-floor');
    expect(warnLine).toHaveAttribute('stroke', 'var(--prism-warning-main)');
    expect(warnLine).toHaveAttribute('stroke-dasharray', '6 4');
    expect(slaLine).toHaveAttribute('stroke', 'var(--prism-error-main)');
    expect(slaLine).toHaveAttribute('stroke-dasharray', '6 4');
    expect(solidLine).toHaveAttribute('stroke', 'var(--prism-secondary-main)');
    expect(solidLine).not.toHaveAttribute('stroke-dasharray');

    expect(screen.getByTestId('threshold-badge-warn-cap')).toHaveAttribute('data-breaches', '2');
    expect(screen.getByTestId('threshold-badge-sla-max')).toHaveAttribute('data-breaches', '1');
    expect(screen.getByTestId('threshold-badge-budget-floor')).toHaveAttribute('data-breaches', '0');

    // Highest rose/amber threshold is SLA Max (150); only index 2 (164) exceeds it
    expect(screen.getByTestId('threshold-point-2')).toHaveAttribute('data-breach', 'true');
    expect(screen.getByTestId('threshold-point-2')).toHaveAttribute(
      'fill',
      'var(--prism-error-main)'
    );
    expect(screen.getByTestId('threshold-point-3')).not.toHaveAttribute('data-breach');
    expect(screen.getByTestId('threshold-point-0')).not.toHaveAttribute('data-breach');

    // Idle inspector well
    const inspector = screen.getByTestId('threshold-inspector');
    expect(inspector).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByTestId('threshold-inspector-idle')).toBeInTheDocument();
  });

  it('activates threshold badges via click and IME-safe keyboard Enter/Space, shows breached vs emerald within-limit badges, and clears via Escape or Clear button', () => {
    const onSelectThreshold = vi.fn<(threshold: ChartThresholdLine, breaches: number) => void>();

    render(
      <ChartThresholdMarker
        data={SAMPLE_DATA}
        thresholds={SAMPLE_THRESHOLDS}
        valueUnit="ms"
        onSelectThreshold={onSelectThreshold}
      />
    );

    const warnBadge = screen.getByTestId('threshold-badge-warn-cap');
    fireEvent.click(warnBadge);
    expect(onSelectThreshold).toHaveBeenCalledWith(SAMPLE_THRESHOLDS[0], 2);
    expect(warnBadge).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('threshold-inspector-text')).toHaveTextContent(
      'Warn Cap: 130ms · 2 points above line'
    );
    expect(screen.getByTestId('threshold-status-badge')).toHaveTextContent('Breached');

    // Enter activates zero-breach threshold and renders prism-emerald Within limit badge
    const floorBadge = screen.getByTestId('threshold-badge-budget-floor');
    fireEvent.keyDown(floorBadge, { key: 'Enter' });
    expect(onSelectThreshold).toHaveBeenLastCalledWith(SAMPLE_THRESHOLDS[2], 0);
    expect(screen.getByTestId('threshold-inspector-text')).toHaveTextContent(
      'Solid Floor: 200ms · 0 points above line'
    );
    const okBadge = screen.getByTestId('threshold-status-badge');
    expect(okBadge).toHaveTextContent('Within limit');
    expect(okBadge).toHaveClass('prism-emerald');

    // Space activates SLA Max
    const slaBadge = screen.getByTestId('threshold-badge-sla-max');
    fireEvent.keyDown(slaBadge, { key: ' ' });
    expect(onSelectThreshold).toHaveBeenLastCalledWith(SAMPLE_THRESHOLDS[1], 1);
    expect(screen.getByTestId('threshold-inspector-text')).toHaveTextContent(
      'SLA Max: 150ms · 1 points above line'
    );

    // Unrelated key is a no-op
    const callsBefore = onSelectThreshold.mock.calls.length;
    fireEvent.keyDown(slaBadge, { key: 'ArrowRight' });
    expect(onSelectThreshold).toHaveBeenCalledTimes(callsBefore);

    // IME composition Enter is safely ignored
    const imeEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    Object.defineProperty(imeEvent, 'isComposing', { value: true });
    warnBadge.dispatchEvent(imeEvent);
    expect(onSelectThreshold).toHaveBeenCalledTimes(callsBefore);

    // Escape clears active threshold selection
    fireEvent.keyDown(slaBadge, { key: 'Escape' });
    expect(screen.getByTestId('threshold-inspector-idle')).toBeInTheDocument();

    // Clear button resets inspector back to idle
    fireEvent.click(warnBadge);
    expect(screen.getByTestId('threshold-inspector-clear')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('threshold-inspector-clear'));
    expect(screen.getByTestId('threshold-inspector-idle')).toBeInTheDocument();
  });

  it('activates vertical event flags via click and IME-safe keyboard Enter/Space, renders detail or omits when absent, and clears on Escape', () => {
    const onSelectEvent = vi.fn<(event: ChartEventMarker, point: ThresholdDataPoint) => void>();

    render(
      <ChartThresholdMarker
        data={SAMPLE_DATA}
        events={SAMPLE_EVENTS}
        valueUnit="ms"
        onSelectEvent={onSelectEvent}
      />
    );

    const deployFlag = screen.getByTestId('event-flag-deploy');
    fireEvent.click(deployFlag);
    expect(onSelectEvent).toHaveBeenCalledWith(SAMPLE_EVENTS[0], SAMPLE_DATA[2]);
    expect(deployFlag).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('threshold-inspector-text')).toHaveTextContent('11:00 · v2.4 Deploy');
    expect(screen.getByTestId('threshold-inspector-detail')).toHaveTextContent(
      'Canary rollout triggered brief spike'
    );
    expect(screen.getByTestId('threshold-inspector-value')).toHaveTextContent('164ms');

    // Keyboard Enter on event without detail
    const warmFlag = screen.getByTestId('event-flag-warm');
    fireEvent.keyDown(warmFlag, { key: 'Enter' });
    expect(onSelectEvent).toHaveBeenLastCalledWith(SAMPLE_EVENTS[1], SAMPLE_DATA[4]);
    expect(screen.getByTestId('threshold-inspector-text')).toHaveTextContent('13:00 · Cache Warm');
    expect(screen.queryByTestId('threshold-inspector-detail')).not.toBeInTheDocument();
    expect(screen.getByTestId('threshold-inspector-value')).toHaveTextContent('94ms');

    // Space key activates deploy event
    fireEvent.keyDown(deployFlag, { key: ' ' });
    expect(onSelectEvent).toHaveBeenLastCalledWith(SAMPLE_EVENTS[0], SAMPLE_DATA[2]);

    // Unrelated key is ignored
    const callsBefore = onSelectEvent.mock.calls.length;
    fireEvent.keyDown(deployFlag, { key: 'Tab' });
    expect(onSelectEvent).toHaveBeenCalledTimes(callsBefore);

    // IME composition keydown is ignored
    const imeEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    Object.defineProperty(imeEvent, 'isComposing', { value: true });
    warmFlag.dispatchEvent(imeEvent);
    expect(onSelectEvent).toHaveBeenCalledTimes(callsBefore);

    // Escape dismisses event inspector
    fireEvent.keyDown(deployFlag, { key: 'Escape' });
    expect(screen.getByTestId('threshold-inspector-idle')).toBeInTheDocument();

    // Clear button also dismisses focused event
    fireEvent.click(deployFlag);
    fireEvent.click(screen.getByTestId('threshold-inspector-clear'));
    expect(screen.getByTestId('threshold-inspector-idle')).toBeInTheDocument();
  });

  it('toggles Bands, Thresholds, and Events visibility pills cleanly and handles stale selections on hide or prop removal', () => {
    const { rerender } = render(
      <ChartThresholdMarker
        data={SAMPLE_DATA}
        bands={SAMPLE_BANDS}
        thresholds={SAMPLE_THRESHOLDS}
        events={SAMPLE_EVENTS}
        data-testid="toggle-root"
      />
    );

    const bandsBtn = screen.getByTestId('toggle-bands');
    const thresholdsBtn = screen.getByTestId('toggle-thresholds');
    const eventsBtn = screen.getByTestId('toggle-events');

    // Toggle Bands off and back on
    expect(bandsBtn).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(bandsBtn);
    expect(bandsBtn).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByTestId('threshold-band-slo-band')).not.toBeInTheDocument();
    fireEvent.click(bandsBtn);
    expect(screen.getByTestId('threshold-band-slo-band')).toBeInTheDocument();

    // Select a threshold then toggle Thresholds off -> inspector falls back to idle
    fireEvent.click(screen.getByTestId('threshold-badge-warn-cap'));
    expect(screen.getByTestId('threshold-inspector-text')).toBeInTheDocument();
    fireEvent.click(thresholdsBtn);
    expect(thresholdsBtn).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByTestId('threshold-line-warn-cap')).not.toBeInTheDocument();
    expect(screen.getByTestId('threshold-inspector-idle')).toBeInTheDocument();
    fireEvent.click(thresholdsBtn);
    expect(screen.getByTestId('threshold-inspector-text')).toBeInTheDocument();

    // Remove the selected threshold via rerender -> safely resolves to idle
    rerender(
      <ChartThresholdMarker
        data={SAMPLE_DATA}
        bands={SAMPLE_BANDS}
        thresholds={SAMPLE_THRESHOLDS.slice(1, 2)}
        events={SAMPLE_EVENTS}
        data-testid="toggle-root"
      />
    );
    expect(screen.getByTestId('threshold-inspector-idle')).toBeInTheDocument();

    // Select an event then toggle Events off -> inspector falls back to idle
    fireEvent.click(screen.getByTestId('event-flag-deploy'));
    expect(screen.getByTestId('threshold-inspector-text')).toHaveTextContent('v2.4 Deploy');
    fireEvent.click(eventsBtn);
    expect(eventsBtn).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByTestId('event-flag-deploy')).not.toBeInTheDocument();
    expect(screen.getByTestId('threshold-inspector-idle')).toBeInTheDocument();
    fireEvent.click(eventsBtn);
    expect(screen.getByTestId('threshold-inspector-text')).toHaveTextContent('v2.4 Deploy');

    // Remove the selected event via rerender -> safely resolves to idle
    rerender(
      <ChartThresholdMarker
        data={SAMPLE_DATA}
        bands={SAMPLE_BANDS}
        thresholds={SAMPLE_THRESHOLDS.slice(1, 2)}
        events={SAMPLE_EVENTS.slice(1, 2)}
        data-testid="toggle-root"
      />
    );
    expect(screen.getByTestId('threshold-inspector-idle')).toBeInTheDocument();
  });

  it('supports height clamping, default tones, highest amber/rose alert selection, reversed bands, dense >8 datasets, and single-point domains', () => {
    const denseData: ThresholdDataPoint[] = Array.from({ length: 10 }, (_, idx) => ({
      label: `T${idx + 1}`,
      value: (idx + 1) * 10,
    }));

    const { rerender } = render(
      <ChartThresholdMarker
        data={denseData}
        height={80}
        bands={[{ id: 'rev', label: 'Reversed Band', from: 95, to: 40 }]}
        thresholds={[
          { id: 'hi-amber', label: 'High Amber', value: 85 },
          { id: 'lo-rose', label: 'Low Rose', value: 50, tone: 'rose' },
          { id: 'nominal', label: 'Nominal', value: 30, tone: 'primary' },
        ]}
        events={[
          { id: 'ev-a', index: 0, label: 'Start' },
          { id: 'ev-b', index: 0, label: 'Same Index Stack', tone: 'secondary' },
        ]}
      />
    );

    // Height clamped to 170 minimum
    expect(screen.getByTestId('threshold-chart-svg')).toHaveAttribute('viewBox', '0 0 620 170');
    // Default tones applied
    expect(screen.getByTestId('threshold-band-rev')).toHaveAttribute('data-tone', 'emerald');
    expect(screen.getByTestId('threshold-badge-hi-amber')).toHaveAttribute('data-tone', 'amber');
    expect(screen.getByTestId('event-flag-ev-a')).toHaveAttribute('data-tone', 'primary');
    // Highest alert threshold is hi-amber (85 > 50), so T9 (90) and T10 (100) are breached with amber color
    expect(screen.getByTestId('threshold-point-8')).toHaveAttribute('data-breach', 'true');
    expect(screen.getByTestId('threshold-point-8')).toHaveAttribute(
      'fill',
      'var(--prism-warning-main)'
    );
    expect(screen.getByTestId('threshold-point-6')).not.toHaveAttribute('data-breach');
    // Stacked events at same index both render without NaN
    expect(screen.getByTestId('event-flag-ev-a')).toBeInTheDocument();
    expect(screen.getByTestId('event-flag-ev-b')).toBeInTheDocument();
    expect(screen.getByTestId('threshold-chart-svg').innerHTML).not.toContain('NaN');

    // Upper clamp to 480 and NaN fallback to 250
    rerender(<ChartThresholdMarker data={denseData} height={999} />);
    expect(screen.getByTestId('threshold-chart-svg')).toHaveAttribute('viewBox', '0 0 620 480');

    rerender(<ChartThresholdMarker data={denseData} height={Number.NaN} />);
    expect(screen.getByTestId('threshold-chart-svg')).toHaveAttribute('viewBox', '0 0 620 250');

    // Single finite data point with non-zero value and decimal precision
    rerender(
      <ChartThresholdMarker
        data={[{ label: 'Solo', value: 42.25 }]}
        thresholds={[{ id: 'p', label: 'Info', value: 42.25, tone: 'primary' as ThresholdTone }]}
      />
    );
    expect(screen.queryByTestId('threshold-area-path')).not.toBeInTheDocument();
    expect(screen.getByTestId('threshold-point-0')).not.toHaveAttribute('data-breach');
    expect(screen.getByTestId('threshold-chart-svg').innerHTML).not.toContain('NaN');

    // All-zero constant domain + negative zero rounding safety
    rerender(<ChartThresholdMarker data={[{ label: 'Z1', value: -0.01 }, { label: 'Z2', value: 0 }]} />);
    expect(screen.getByTestId('threshold-chart-svg').innerHTML).not.toContain('NaN');

    rerender(<ChartThresholdMarker data={[{ label: 'Zero', value: 0 }]} />);
    expect(screen.getByTestId('threshold-chart-svg').innerHTML).not.toContain('NaN');
  });

  it('filters non-finite data/thresholds/bands, ignores out-of-range events, deduplicates IDs/labels, prevents XSS, and renders role="status" empty state', () => {
    const xssTitle = '<script>window.__thresholdXss=1</script><img src=x onerror=alert(1)>';

    const { rerender } = render(
      <ChartThresholdMarker
        title={xssTitle}
        data={[
          { label: 'Dup', value: Number.NaN },
          { label: 'Dup', value: -15.5 },
          { label: 'Dup', value: 25 },
          { label: 'Inf', value: Number.POSITIVE_INFINITY },
        ]}
        bands={[
          { id: 'dup-b', label: 'Bad Band', from: Number.NaN, to: 10 },
          { id: 'dup-b', label: 'Bad High', from: 0, to: Number.POSITIVE_INFINITY },
          { id: 'dup-b', label: 'Good Band 1', from: -30, to: 5 },
          { id: 'dup-b', label: 'Good Band 2', from: 5, to: 35, tone: 'secondary' },
        ]}
        thresholds={[
          { id: 'dup-t', label: 'Ignored NaN', value: Number.NaN },
          { id: 'dup-t', label: 'Valid 1', value: 10 },
          { id: 'dup-t', label: 'Valid 2', value: 40, tone: 'rose' },
        ]}
        events={[
          { id: 'dup-e', index: -1, label: 'Negative Index' },
          { id: 'dup-e', index: 1.5, label: 'Fractional Index' },
          { id: 'dup-e', index: 99, label: 'Out Of Range' },
          { id: 'dup-e', index: 0, label: '<svg onload=alert(1)>E1' },
          { id: 'dup-e', index: 1, label: 'E2', tone: 'rose' },
        ]}
      />
    );

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByRole('heading', { name: xssTitle })).toBeInTheDocument();
    expect(screen.getByTestId('threshold-counts-pill')).toHaveTextContent('2 lines · 2 events');
    expect(screen.getByTestId('threshold-chart-svg').innerHTML).not.toContain('NaN');
    expect(screen.getAllByTestId('threshold-band-dup-b')).toHaveLength(2);
    expect(screen.getAllByTestId('threshold-badge-dup-t')).toHaveLength(2);
    expect(screen.getAllByTestId('event-flag-dup-e')).toHaveLength(2);

    // Empty data array -> role="status" empty state
    rerender(<ChartThresholdMarker data={[]} data-testid="empty-root" />);
    expect(screen.getByTestId('empty-root')).toHaveAttribute('data-empty', 'true');
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('No finite data points available');
    expect(screen.queryByTestId('threshold-chart-svg')).not.toBeInTheDocument();
    expect(screen.queryByTestId('threshold-layer-toggles')).not.toBeInTheDocument();

    // All non-finite values -> role="status" empty state
    rerender(
      <ChartThresholdMarker
        data={[
          { label: 'A', value: Number.NaN },
          { label: 'B', value: Number.POSITIVE_INFINITY },
          { label: 'C', value: Number.NEGATIVE_INFINITY },
        ]}
        data-testid="empty-root"
      />
    );
    expect(screen.getByTestId('empty-root')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
