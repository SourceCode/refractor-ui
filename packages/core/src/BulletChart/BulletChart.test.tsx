import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  BulletChart,
  type BulletChartItem,
  type BulletToneMap,
} from './index';

const SAMPLE_ITEMS: BulletChartItem[] = [
  {
    id: 'arr',
    label: 'Net New ARR',
    subtitle: 'Enterprise USD · Q4',
    actual: 112,
    target: 100,
    max: 125,
    ranges: [60, 95, 125],
    unit: 'k',
    tone: 'primary',
  },
  {
    id: 'retention',
    label: 'Gross Retention',
    actual: 94,
    target: 100,
    max: 100,
    ranges: [50, 80, 100],
    unit: '%',
    tone: 'emerald',
  },
  {
    id: 'sla',
    label: 'SLA Attainment',
    actual: 100,
    target: 100,
    max: 100,
    ranges: [50, 85, 100],
    unit: '%',
    tone: 'secondary',
  },
  {
    id: 'onboarding',
    label: 'Onboarding Speed',
    actual: 38.25,
    target: 100,
    ranges: [50, 80, 100],
    tone: 'rose',
  },
];

describe('BulletChart', () => {
  it('renders optical slab, legend, bullet tracks, variance badges, ref forwarding, theme overrides, and zero raw colors', () => {
    const ref = createRef<HTMLDivElement>();
    const toneKeys: Array<keyof BulletToneMap> = [
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
            BulletChart: { className: 'theme-bullet', style: { maxWidth: '720px' } },
          },
        }}
      >
        <BulletChart
          ref={ref}
          items={SAMPLE_ITEMS}
          className="consumer-bullet"
          xstyle={{ '--prism-blur-px': '16px' }}
          data-testid="bullet-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('bullet-root');
    expect(ref.current).toBe(root);
    expect(BulletChart.displayName).toBe('BulletChart');
    expect(root).toHaveClass(
      'refractor-bullet-chart',
      'prism-slab',
      'theme-bullet',
      'consumer-bullet'
    );
    expect(root).toHaveStyle({ maxWidth: '720px' });
    expect(root).toHaveAttribute('data-variance', 'true');
    expect(root).not.toHaveAttribute('data-empty');

    // Zero raw hex/rgb/hsl color literals anywhere in rendered markup
    expect(root.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}|rgba?\(|hsla?\(/i);
    expect(root.innerHTML).toContain('var(--prism-primary-main)');
    expect(root.innerHTML).toContain('var(--prism-secondary-main)');
    expect(root.innerHTML).toContain('var(--prism-success-main)');
    expect(root.innerHTML).toContain('var(--prism-error-main)');
    expect(root.innerHTML).toContain('var(--prism-text-secondary)');
    expect(root.innerHTML).toContain('var(--prism-divider)');
    expect(root.innerHTML).toContain('var(--prism-text-primary)');

    // Header title, region aria-labelledby linkage, count badge, and qualitative range legend
    expect(
      screen.getByRole('region', { name: 'Target Performance Bullet Chart' })
    ).toBe(root);
    expect(
      screen.getByRole('heading', { name: 'Target Performance Bullet Chart' })
    ).toBeInTheDocument();
    expect(screen.getByTestId('bullet-count-badge')).toHaveTextContent('4 metrics');
    const legend = screen.getByTestId('bullet-legend');
    expect(legend).toHaveTextContent('Poor');
    expect(legend).toHaveTextContent('Satisfactory');
    expect(legend).toHaveTextContent('Good');
    expect(legend).toHaveTextContent('Target');

    // Subtitle renders when present and is omitted when absent
    expect(screen.getByTestId('bullet-subtitle-arr')).toHaveTextContent('Enterprise USD · Q4');
    expect(screen.queryByTestId('bullet-subtitle-retention')).toBeNull();

    // Tabular readouts with optional unit formatting
    expect(screen.getByTestId('bullet-readout-arr')).toHaveTextContent('112k / 100k');
    expect(screen.getByTestId('bullet-readout-retention')).toHaveTextContent('94% / 100%');
    expect(screen.getByTestId('bullet-readout-onboarding')).toHaveTextContent('38.25 / 100');

    // Variance badges: prism-emerald when actual >= target, amber/rose tint when below
    const arrVariance = screen.getByTestId('bullet-variance-arr');
    expect(arrVariance).toHaveTextContent('+12%');
    expect(arrVariance).toHaveClass('prism-emerald');
    expect(arrVariance).toHaveAttribute('data-variance-tone', 'emerald');

    const slaVariance = screen.getByTestId('bullet-variance-sla');
    expect(slaVariance).toHaveTextContent('0%');
    expect(slaVariance).toHaveClass('prism-emerald');
    expect(slaVariance).toHaveAttribute('data-variance-tone', 'emerald');

    const retentionVariance = screen.getByTestId('bullet-variance-retention');
    expect(retentionVariance).toHaveTextContent('-6%');
    expect(retentionVariance).toHaveClass('prism-crystal');
    expect(retentionVariance).toHaveAttribute('data-variance-tone', 'amber');
    expect(retentionVariance.style.color).toBe('var(--prism-warning-main)');

    const onboardingVariance = screen.getByTestId('bullet-variance-onboarding');
    expect(onboardingVariance).toHaveTextContent('-61.8%');
    expect(onboardingVariance).toHaveClass('prism-crystal');
    expect(onboardingVariance).toHaveAttribute('data-variance-tone', 'rose');
    expect(onboardingVariance.style.color).toBe('var(--prism-error-main)');

    // SVG track geometry (height 28, bands, actual bar, vertical target bar)
    const arrTrack = screen.getByTestId('bullet-track-arr');
    expect(arrTrack).toHaveAttribute('height', '28');
    expect(screen.getByTestId('bullet-band-poor-arr')).toHaveAttribute('width', '48%');
    expect(screen.getByTestId('bullet-band-satisfactory-arr')).toHaveAttribute('width', '28%');
    expect(screen.getByTestId('bullet-band-good-arr')).toHaveAttribute('width', '24%');
    expect(screen.getByTestId('bullet-actual-arr')).toHaveAttribute('data-width-pct', '89.6');
    expect(screen.getByTestId('bullet-target-arr')).toHaveAttribute('data-target-pct', '80');

    // Recessed prism-well telemetry strip starts with prompt
    const telemetry = screen.getByTestId('bullet-telemetry');
    expect(telemetry).toHaveClass('prism-well');
    expect(telemetry).toHaveTextContent(
      'Select any metric row to inspect qualitative band classification, actual vs. target, and achievement percentage.'
    );
  });

  it('selects rows via click and IME-safe keyboard, fires onSelectItem, and updates telemetry strip across all qualitative bands', () => {
    const onSelectItem = vi.fn();
    render(
      <BulletChart
        items={SAMPLE_ITEMS}
        title="Q4 Executive KPIs"
        onSelectItem={onSelectItem}
      />
    );

    // Click Exceeding Target row
    const arrBtn = screen.getByRole('button', {
      name: 'Net New ARR: 112k / 100k (112% of target, Exceeding Target)',
    });
    fireEvent.click(arrBtn);
    expect(onSelectItem).toHaveBeenCalledWith(SAMPLE_ITEMS[0], 112);
    expect(arrBtn).toHaveAttribute('aria-pressed', 'true');
    expect(arrBtn).toHaveAttribute('data-selected', 'true');
    expect(screen.getByTestId('bullet-telemetry-band')).toHaveTextContent('Exceeding Target');
    expect(screen.getByTestId('bullet-telemetry-band')).toHaveClass('prism-emerald');
    expect(screen.getByTestId('bullet-telemetry-metrics')).toHaveTextContent(
      'Actual 112k · Target 100k · 112% achieved'
    );

    // IME composing Enter must be ignored
    const retentionBtn = screen.getByRole('button', {
      name: 'Gross Retention: 94% / 100% (94% of target, On Track)',
    });
    fireEvent.keyDown(retentionBtn, { key: 'Enter', isComposing: true });
    expect(onSelectItem).toHaveBeenCalledTimes(1);

    // Non-activation key must be ignored
    fireEvent.keyDown(retentionBtn, { key: 'Escape' });
    expect(onSelectItem).toHaveBeenCalledTimes(1);

    // Keyboard Enter activates On Track (below target / amber) row
    fireEvent.keyDown(retentionBtn, { key: 'Enter' });
    expect(onSelectItem).toHaveBeenLastCalledWith(SAMPLE_ITEMS[1], 94);
    expect(retentionBtn).toHaveAttribute('aria-pressed', 'true');
    expect(arrBtn).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('bullet-telemetry-band')).toHaveTextContent('On Track');
    expect(screen.getByTestId('bullet-telemetry-band').style.color).toBe(
      'var(--prism-warning-main)'
    );
    expect(screen.getByTestId('bullet-telemetry-metrics')).toHaveTextContent(
      'Actual 94% · Target 100% · 94% achieved'
    );

    // Keyboard Space activates Below Plan row
    const onboardingBtn = screen.getByRole('button', {
      name: 'Onboarding Speed: 38.25 / 100 (38.3% of target, Below Plan)',
    });
    fireEvent.keyDown(onboardingBtn, { key: ' ' });
    expect(onSelectItem).toHaveBeenLastCalledWith(SAMPLE_ITEMS[3], 38.3);
    expect(screen.getByTestId('bullet-telemetry-band')).toHaveTextContent('Below Plan');
    expect(screen.getByTestId('bullet-telemetry-band').style.color).toBe(
      'var(--prism-error-main)'
    );
    expect(screen.getByTestId('bullet-telemetry-metrics')).toHaveTextContent(
      'Actual 38.25 · Target 100 · 38.3% achieved'
    );

    // Clicking exact-target row renders On Track with emerald success tint
    const slaBtn = screen.getByRole('button', {
      name: 'SLA Attainment: 100% / 100% (100% of target, On Track)',
    });
    fireEvent.click(slaBtn);
    expect(onSelectItem).toHaveBeenLastCalledWith(SAMPLE_ITEMS[2], 100);
    expect(screen.getByTestId('bullet-telemetry-band')).toHaveTextContent('On Track');
    expect(screen.getByTestId('bullet-telemetry-band').style.color).toBe(
      'var(--prism-success-main)'
    );
  });

  it('auto-cycles tones, normalizes default & unsorted ranges, supports showVariance={false}, and resets selection when removed', () => {
    const autoItems: BulletChartItem[] = [
      { id: 'c1', label: 'Cycle 1', actual: 60, target: 80 }, // default ranges [40, 64, 80]
      { id: 'c2', label: 'Cycle 2', actual: 120, target: 100, max: 90 }, // max expands to 120
      { id: 'c3', label: 'Cycle 3', actual: 70, target: 80, ranges: [90, 40, 100] }, // unsorted ranges -> [40, 90, 100]
      { id: 'c4', label: 'Cycle 4', actual: 0, target: 80, ranges: [0, 50, 100] }, // actual=0 < target -> Below Plan
      { id: 'c5', label: 'Cycle 5', actual: 50, target: 50, max: 100 }, // 5th tone = rose
    ];

    const { rerender } = render(
      <BulletChart items={autoItems} showVariance={true} data-testid="cycle-bullet" />
    );

    const root = screen.getByTestId('cycle-bullet');
    expect(root.innerHTML).toContain('var(--prism-primary-main)');
    expect(root.innerHTML).toContain('var(--prism-secondary-main)');
    expect(root.innerHTML).toContain('var(--prism-success-main)');
    expect(root.innerHTML).toContain('var(--prism-warning-main)');
    expect(root.innerHTML).toContain('var(--prism-error-main)');

    // Default ranges [0.5, 0.8, 1.0] * scaleMax(80) -> [40, 64, 80] -> 50%, 30%, 20%
    expect(screen.getByTestId('bullet-band-poor-c1')).toHaveAttribute('width', '50%');
    expect(screen.getByTestId('bullet-band-satisfactory-c1')).toHaveAttribute('width', '30%');
    expect(screen.getByTestId('bullet-band-good-c1')).toHaveAttribute('width', '20%');

    // Unsorted ranges [90, 40, 100] normalized ascending -> [40, 90, 100]
    expect(screen.getByTestId('bullet-band-poor-c3')).toHaveAttribute('data-range-end', '40');
    expect(screen.getByTestId('bullet-band-satisfactory-c3')).toHaveAttribute('data-range-end', '90');
    expect(screen.getByTestId('bullet-band-good-c3')).toHaveAttribute('data-range-end', '100');

    // Scale expands to actual=120 when explicit max=90 is smaller
    expect(screen.getByTestId('bullet-actual-c2')).toHaveAttribute('data-width-pct', '100');
    expect(screen.getByTestId('bullet-target-c2')).toHaveAttribute('data-target-pct', '83.3');

    // actual === 0 with target > 0 classifies as Below Plan even when poorEnd === 0
    expect(
      screen.getByRole('button', { name: 'Cycle 4: 0 / 80 (0% of target, Below Plan)' })
    ).toHaveAttribute('data-band', 'below-plan');

    // Select c2 without onSelectItem callback, then rerender without c2 and showVariance={false}
    fireEvent.click(
      screen.getByRole('button', { name: 'Cycle 2: 120 / 100 (120% of target, Exceeding Target)' })
    );
    expect(screen.getByTestId('bullet-telemetry')).toHaveTextContent('Cycle 2');

    rerender(
      <BulletChart
        items={[{ id: 'solo', label: 'Single Metric', actual: 75, target: 100 }]}
        showVariance={false}
        data-testid="cycle-bullet"
      />
    );

    expect(screen.getByTestId('cycle-bullet')).not.toHaveAttribute('data-variance');
    expect(screen.getByTestId('bullet-count-badge')).toHaveTextContent('1 metric');
    expect(screen.queryByTestId('bullet-variance-solo')).toBeNull();
    expect(screen.getByTestId('bullet-telemetry')).toHaveTextContent(
      'Select any metric row to inspect qualitative band classification, actual vs. target, and achievement percentage.'
    );
  });

  it('handles empty items, non-finite/negative inputs, target === 0 without NaN or division by zero, and neutralizes XSS', () => {
    const { rerender } = render(<BulletChart items={[]} data-testid="adversarial-bullet" />);

    const root = screen.getByTestId('adversarial-bullet');
    expect(root).toHaveAttribute('data-empty', 'true');
    expect(screen.getByTestId('bullet-count-badge')).toHaveTextContent('0 metrics');
    expect(screen.getByTestId('bullet-empty')).toHaveTextContent(
      'No bullet chart metrics to display.'
    );
    expect(screen.queryByTestId('bullet-rows')).toBeNull();
    expect(screen.queryByTestId('bullet-telemetry')).toBeNull();

    // Non-finite, negative, zero-target, and degenerate ranges
    const adversarialItems: BulletChartItem[] = [
      {
        id: 'zero-both',
        label: 'Zero Both',
        actual: 0,
        target: 0,
      },
      {
        id: 'zero-target',
        label: 'Zero Target Positive Actual',
        actual: 42,
        target: 0,
      },
      {
        id: 'nan-neg',
        label: 'Corrupt Numbers',
        actual: Number.NaN,
        target: Number.POSITIVE_INFINITY,
        max: -20,
        ranges: [Number.NaN, -15, Number.NEGATIVE_INFINITY],
      },
      {
        id: 'neg-vals',
        label: 'Negative Values',
        actual: -50,
        target: -10,
        ranges: [0, 0, 0],
      },
    ];

    const onSelect = vi.fn();
    rerender(
      <BulletChart
        items={adversarialItems}
        onSelectItem={onSelect}
        data-testid="adversarial-bullet"
      />
    );

    const populatedRoot = screen.getByTestId('adversarial-bullet');
    expect(populatedRoot.innerHTML).not.toContain('NaN');
    expect(populatedRoot.innerHTML).not.toContain('Infinity');

    // Zero target + zero actual -> 0% achievement, On Track, emerald variance 0%
    expect(screen.getByTestId('bullet-readout-zero-both')).toHaveTextContent('0 / 0');
    expect(screen.getByTestId('bullet-variance-zero-both')).toHaveTextContent('0%');
    expect(screen.getByTestId('bullet-variance-zero-both')).toHaveClass('prism-emerald');

    // Zero target + positive actual -> no division by zero, 100% bar width, Exceeding Target
    expect(screen.getByTestId('bullet-actual-zero-target')).toHaveAttribute('data-width-pct', '100');
    expect(screen.getByTestId('bullet-target-zero-target')).toHaveAttribute('data-target-pct', '0');
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Zero Target Positive Actual: 42 / 0 (0% of target, Exceeding Target)',
      })
    );
    expect(onSelect).toHaveBeenCalledWith(adversarialItems[1], 0);
    expect(screen.getByTestId('bullet-telemetry-band')).toHaveTextContent('Exceeding Target');

    // Corrupt ranges fall back to default [50%, 30%, 20%]
    expect(screen.getByTestId('bullet-band-poor-nan-neg')).toHaveAttribute('width', '50%');
    expect(screen.getByTestId('bullet-band-satisfactory-nan-neg')).toHaveAttribute('width', '30%');
    expect(screen.getByTestId('bullet-band-good-nan-neg')).toHaveAttribute('width', '20%');

    // XSS payload neutralization across title, label, subtitle, unit, and id
    const payload = '<script>window.__bulletXss=1</script><img src=x onerror=alert(1)>';
    rerender(
      <BulletChart
        title={payload}
        items={[
          {
            id: payload,
            label: payload,
            subtitle: payload,
            actual: 64,
            target: 80,
            unit: payload,
          },
        ]}
      />
    );
    expect(screen.getByRole('heading', { name: payload })).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
  });

  it('normalizes negative zero, partial range tuples, and merges consumer style overrides cleanly', () => {
    const items: BulletChartItem[] = [
      {
        id: 'neg-zero',
        label: 'Signed Zero',
        actual: -0,
        target: -0,
        max: Number.NaN,
        ranges: [10, 0, 0],
      },
      {
        id: 'partial-high',
        label: 'Partial High Range',
        actual: 25,
        target: 50,
        ranges: [0, 0, 100],
      },
    ];

    render(
      <BulletChart
        items={items}
        style={{ minWidth: '320px' }}
        data-testid="partial-bullet"
      />
    );

    const root = screen.getByTestId('partial-bullet');
    expect(root).toHaveStyle({ minWidth: '320px' });
    expect(screen.getByTestId('bullet-readout-neg-zero')).toHaveTextContent('0 / 0');
    expect(screen.getByTestId('bullet-readout-neg-zero').textContent).not.toContain('-0');

    // [10, 0, 0] sorted -> [0, 0, 10], scaleMax = 10 -> poor=0%, sat=0%, good=100%
    expect(screen.getByTestId('bullet-band-poor-neg-zero')).toHaveAttribute('width', '0%');
    expect(screen.getByTestId('bullet-band-satisfactory-neg-zero')).toHaveAttribute('width', '0%');
    expect(screen.getByTestId('bullet-band-good-neg-zero')).toHaveAttribute('width', '100%');

    // [0, 0, 100] with actual=25, target=50 -> actualWidthPct=25%, targetPct=50%
    expect(screen.getByTestId('bullet-actual-partial-high')).toHaveAttribute('data-width-pct', '25');
    expect(screen.getByTestId('bullet-target-partial-high')).toHaveAttribute('data-target-pct', '50');
    expect(screen.getByTestId('bullet-variance-partial-high')).toHaveTextContent('-50%');
  });
});
