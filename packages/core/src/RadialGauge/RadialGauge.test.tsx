import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { RadialGauge as BarrelRadialGauge, type RadialGaugeThreshold } from './index';
import { RadialGauge } from './RadialGauge';

describe('RadialGauge', () => {
  it('renders 180-degree semi-circular gauge by default, forwards ref, merges theme overrides, and uses semantic tokens only', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <PrismThemeProvider
        theme={{
          components: {
            RadialGauge: { className: 'theme-radial-gauge', style: { maxWidth: '420px' } },
          },
        }}
      >
        <RadialGauge
          ref={ref}
          value={48}
          label="Throughput"
          className="consumer-radial-gauge"
          xstyle={{ '--prism-blur-px': '16px' }}
          data-testid="gauge-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('gauge-root');
    expect(ref.current).toBe(root);
    expect(RadialGauge.displayName).toBe('RadialGauge');
    expect(BarrelRadialGauge).toBe(RadialGauge);
    expect(root).toHaveClass(
      'refractor-radial-gauge',
      'prism-slab',
      'theme-radial-gauge',
      'consumer-radial-gauge'
    );
    expect(root).toHaveStyle({ maxWidth: '420px' });
    expect(root).toHaveAttribute('data-sweep', '180');
    expect(root).toHaveAttribute('data-tone', 'emerald');
    expect(root).not.toHaveAttribute('data-has-target');

    const statusBadge = screen.getByTestId('radial-gauge-status');
    expect(statusBadge).toHaveClass('prism-emerald');
    expect(statusBadge).toHaveTextContent('Optimal');

    const meter = screen.getByRole('meter', { name: 'KPI Radial Gauge' });
    expect(meter).toHaveAttribute('aria-valuenow', '48');
    expect(meter).toHaveAttribute('aria-valuemin', '0');
    expect(meter).toHaveAttribute('aria-valuemax', '100');
    expect(meter).toHaveAttribute('aria-valuetext', 'Throughput: 48% (Optimal)');
    expect(meter.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(meter.innerHTML).not.toContain('NaN');
    expect(meter.innerHTML).toContain('var(--prism-divider)');
    expect(meter.innerHTML).toContain('var(--prism-success-main)');
    expect(meter.innerHTML).toContain('var(--prism-warning-main)');
    expect(meter.innerHTML).toContain('var(--prism-error-main)');
    expect(meter.innerHTML).toContain('var(--prism-text-primary)');

    expect(screen.getByTestId('radial-gauge-track')).toBeInTheDocument();
    expect(screen.getByTestId('radial-gauge-progress')).toBeInTheDocument();
    expect(screen.queryByTestId('radial-gauge-target')).toBeNull();
    expect(screen.getByTestId('radial-gauge-needle')).toBeInTheDocument();
    expect(screen.getByTestId('radial-gauge-endpoints')).toHaveTextContent('0%100%');

    const valueGroup = screen.getByTestId('radial-gauge-value');
    expect(valueGroup).toHaveTextContent('48%');
    expect(valueGroup).toHaveTextContent('Throughput');

    const footer = screen.getByTestId('radial-gauge-footer');
    expect(footer).toHaveClass('prism-well');
    expect(footer).toHaveTextContent('Zone: Optimal (0%–60%)');
    expect(footer).toHaveTextContent('Range 0%–100%');
  });

  it('supports 270-degree speedometer sweep, target marker with signed deltas, decimal formatting, and prism-crystal non-emerald status badges', () => {
    const { rerender } = render(
      <RadialGauge
        title="Cluster Load"
        value={72.5}
        target={80}
        sweep={270}
        data-testid="speedometer-gauge"
      />
    );

    const root = screen.getByTestId('speedometer-gauge');
    expect(root).toHaveAttribute('data-sweep', '270');
    expect(root).toHaveAttribute('data-tone', 'amber');
    expect(root).toHaveAttribute('data-has-target', 'true');

    const statusBadge = screen.getByTestId('radial-gauge-status');
    expect(statusBadge).toHaveClass('prism-crystal');
    expect(statusBadge).not.toHaveClass('prism-emerald');
    expect(statusBadge).toHaveTextContent('Elevated');

    const meter = screen.getByRole('meter', { name: 'Cluster Load' });
    expect(meter).toHaveAttribute('aria-valuetext', '72.5% (Elevated)');
    const trackD = screen.getByTestId('radial-gauge-track').getAttribute('d') ?? '';
    expect(trackD).toContain(' 0 1 1 ');
    expect(meter.innerHTML).not.toContain('NaN');

    const targetGroup = screen.getByTestId('radial-gauge-target');
    expect(targetGroup.querySelector('line')).not.toBeNull();
    expect(targetGroup).toHaveTextContent('80%');
    expect(screen.getByTestId('radial-gauge-footer')).toHaveTextContent('Target 80% (-7.5%)');

    // Above target in Critical zone
    rerender(
      <RadialGauge
        title="Cluster Load"
        value={92}
        target={80}
        sweep={270}
        data-testid="speedometer-gauge"
      />
    );
    expect(root).toHaveAttribute('data-tone', 'rose');
    expect(screen.getByTestId('radial-gauge-status')).toHaveTextContent('Critical');
    expect(screen.getByTestId('radial-gauge-footer')).toHaveTextContent('Target 80% (+12%)');

    // Exact target with empty unit string
    rerender(
      <RadialGauge
        title="Cluster Load"
        value={80}
        target={80}
        unit=""
        sweep={270}
        data-testid="speedometer-gauge"
      />
    );
    expect(screen.getByTestId('radial-gauge-value')).toHaveTextContent('80');
    expect(screen.getByTestId('radial-gauge-endpoints')).toHaveTextContent('0100');
    expect(screen.getByTestId('radial-gauge-footer')).toHaveTextContent('Target 80 (0)');
  });

  it('invokes onSelectBand on click and IME-safe Enter/Space, updates footer on focus, clears on Escape, and resets when band disappears', () => {
    const onSelectBand = vi.fn();
    const { rerender } = render(
      <RadialGauge value={45} target={75} onSelectBand={onSelectBand} />
    );

    const elevatedBand = screen.getByRole('button', { name: 'Elevated band: 60% to 85%' });
    const criticalBand = screen.getByRole('button', { name: 'Critical band: 85% to 100%' });
    const optimalBand = screen.getByRole('button', { name: 'Optimal band: 0% to 60%' });

    // Click activates band and updates footer
    fireEvent.click(elevatedBand);
    expect(onSelectBand).toHaveBeenLastCalledWith({
      upTo: 85,
      label: 'Elevated',
      tone: 'amber',
    });
    expect(elevatedBand).toHaveAttribute('aria-pressed', 'true');
    expect(elevatedBand).toHaveAttribute('data-selected', 'true');
    expect(screen.getByTestId('radial-gauge-footer')).toHaveTextContent(
      'Band: Elevated (60%–85%)'
    );

    // Focus updates inspected band readout without calling onSelectBand
    fireEvent.focus(criticalBand);
    expect(onSelectBand).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('radial-gauge-footer')).toHaveTextContent(
      'Band: Critical (85%–100%)'
    );

    // IME composing Enter is ignored
    fireEvent.keyDown(criticalBand, { key: 'Enter', isComposing: true });
    expect(onSelectBand).toHaveBeenCalledTimes(1);

    // Unrelated key is ignored
    fireEvent.keyDown(criticalBand, { key: 'ArrowRight' });
    expect(onSelectBand).toHaveBeenCalledTimes(1);

    // Enter activates band
    fireEvent.keyDown(criticalBand, { key: 'Enter' });
    expect(onSelectBand).toHaveBeenLastCalledWith({
      upTo: 100,
      label: 'Critical',
      tone: 'rose',
    });

    // Space activates band
    fireEvent.keyDown(optimalBand, { key: ' ' });
    expect(onSelectBand).toHaveBeenLastCalledWith({
      upTo: 60,
      label: 'Optimal',
      tone: 'emerald',
    });
    expect(screen.getByTestId('radial-gauge-footer')).toHaveTextContent(
      'Band: Optimal (0%–60%)'
    );

    // Escape clears inspected band back to active zone
    fireEvent.keyDown(optimalBand, { key: 'Escape' });
    expect(screen.getByTestId('radial-gauge-footer')).toHaveTextContent(
      'Zone: Optimal (0%–60%)'
    );

    // Selecting a band and then changing thresholds so it disappears resets cleanly
    fireEvent.click(elevatedBand);
    expect(screen.getByTestId('radial-gauge-footer')).toHaveTextContent(
      'Band: Elevated (60%–85%)'
    );
    rerender(
      <RadialGauge
        value={45}
        target={75}
        thresholds={[
          { upTo: 50, label: 'Nominal', tone: 'primary' },
          { upTo: 100, label: 'Peak', tone: 'secondary' },
        ]}
        onSelectBand={onSelectBand}
      />
    );
    expect(screen.getByTestId('radial-gauge-footer')).toHaveTextContent(
      'Zone: Nominal (0%–50%)'
    );
  });

  it('sorts, clamps, deduplicates custom thresholds across all 5 tones, handles partial threshold coverage, and falls back when invalid', () => {
    const messyThresholds: RadialGaugeThreshold[] = [
      { upTo: 500, label: 'Overload', tone: 'rose' },
      { upTo: Number.NaN, label: 'Invalid', tone: 'amber' },
      { upTo: -20, label: 'BelowMin', tone: 'emerald' },
      { upTo: 120, label: 'PrimaryBand', tone: 'primary' },
      { upTo: 120, label: 'DuplicateBand', tone: 'amber' },
      { upTo: 60, label: 'SecondaryBand', tone: 'secondary' },
      { upTo: 160, label: 'WarnBand', tone: 'amber' },
      { upTo: 30, label: 'SafeBand', tone: 'emerald' },
    ];

    const { rerender } = render(
      <RadialGauge
        value={90}
        min={0}
        max={200}
        unit="ms"
        thresholds={messyThresholds}
      />
    );

    const meter = screen.getByRole('meter');
    expect(meter.innerHTML).toContain('var(--prism-success-main)');
    expect(meter.innerHTML).toContain('var(--prism-secondary-main)');
    expect(meter.innerHTML).toContain('var(--prism-primary-main)');
    expect(meter.innerHTML).toContain('var(--prism-warning-main)');
    expect(meter.innerHTML).toContain('var(--prism-error-main)');
    expect(screen.getByTestId('radial-gauge-status')).toHaveTextContent('PrimaryBand');
    expect(screen.queryByRole('button', { name: /BelowMin/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /DuplicateBand/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Invalid/ })).toBeNull();

    // Partial coverage: highest threshold stops at 70 while value is 95
    rerender(
      <RadialGauge
        value={95}
        min={0}
        max={100}
        thresholds={[
          { upTo: 40, label: 'Low', tone: 'emerald' },
          { upTo: 70, label: 'Mid', tone: 'primary' },
        ]}
      />
    );
    expect(screen.getByTestId('radial-gauge-status')).toHaveTextContent('Mid');
    expect(screen.getByTestId('radial-gauge-footer')).toHaveTextContent('Zone: Mid (40%–70%)');

    // Empty thresholds fall back to defaults
    rerender(<RadialGauge value={50} thresholds={[]} />);
    expect(screen.getByTestId('radial-gauge-status')).toHaveTextContent('Optimal');
    expect(screen.getByRole('button', { name: 'Critical band: 85% to 100%' })).toBeInTheDocument();

    // All invalid / below-min thresholds fall back to defaults
    rerender(
      <RadialGauge
        value={90}
        min={10}
        max={110}
        thresholds={[
          { upTo: Number.NaN, label: 'Bad', tone: 'rose' },
          { upTo: 5, label: 'TooLow', tone: 'emerald' },
        ]}
      />
    );
    expect(screen.getByTestId('radial-gauge-status')).toHaveTextContent('Elevated');
    expect(screen.getByRole('button', { name: 'Optimal band: 10% to 70%' })).toBeInTheDocument();
  });

  it('sanitizes non-finite and inverted scale inputs, omits zero-length progress arc, and clamps size bounds', () => {
    const { rerender } = render(
      <RadialGauge
        value={Number.NaN}
        min={Number.NaN}
        max={Number.NaN}
        target={Number.NaN}
        size={90}
      />
    );

    const meter = screen.getByRole('meter');
    expect(meter).toHaveAttribute('aria-valuenow', '0');
    expect(meter).toHaveAttribute('aria-valuemin', '0');
    expect(meter).toHaveAttribute('aria-valuemax', '100');
    expect(meter).toHaveAttribute('width', '160');
    expect(meter.innerHTML).not.toContain('NaN');
    expect(screen.queryByTestId('radial-gauge-progress')).toBeNull();
    expect(screen.queryByTestId('radial-gauge-target')).toBeNull();
    expect(screen.getByTestId('radial-gauge-needle')).toHaveAttribute('data-angle', '180');

    // Inverted max <= min falls back to min + 100, value/target clamp safely, size clamps to 360
    rerender(
      <RadialGauge
        value={250}
        min={50}
        max={20}
        target={500}
        size={600}
      />
    );
    const clampedMeter = screen.getByRole('meter');
    expect(clampedMeter).toHaveAttribute('aria-valuemin', '50');
    expect(clampedMeter).toHaveAttribute('aria-valuemax', '150');
    expect(clampedMeter).toHaveAttribute('aria-valuenow', '150');
    expect(clampedMeter).toHaveAttribute('width', '360');
    expect(screen.getByTestId('radial-gauge-target')).toHaveTextContent('150%');
    expect(screen.getByTestId('radial-gauge-needle')).toHaveAttribute('data-angle', '360');

    // Non-finite size and target fall back cleanly
    rerender(
      <RadialGauge
        value={-25}
        min={0}
        max={100}
        target={Number.POSITIVE_INFINITY}
        size={Number.NaN}
      />
    );
    const defaultSizeMeter = screen.getByRole('meter');
    expect(defaultSizeMeter).toHaveAttribute('width', '240');
    expect(defaultSizeMeter).toHaveAttribute('aria-valuenow', '0');
    expect(screen.queryByTestId('radial-gauge-target')).toBeNull();
  });

  it('neutralizes adversarial XSS payloads in title, label, unit, and threshold labels', () => {
    const payload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';
    render(
      <RadialGauge
        title={payload}
        label={payload}
        unit={payload}
        value={42}
        thresholds={[{ upTo: 100, label: payload, tone: 'primary' }]}
      />
    );

    expect(screen.getByRole('heading', { name: payload })).toBeInTheDocument();
    expect(screen.getByTestId('radial-gauge-status')).toHaveTextContent(payload);
    expect(screen.getByTestId('radial-gauge-value')).toHaveTextContent(`42${payload}`);
    expect(document.querySelector('script')).toBeNull();
  });
});
