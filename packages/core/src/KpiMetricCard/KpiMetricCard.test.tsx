import { createRef } from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { KpiMetricCard, type KpiSparklinePoint } from './index';

describe('KpiMetricCard', () => {
  const LABELED_SERIES: KpiSparklinePoint[] = [
    { label: 'Mon', value: 120 },
    { label: 'Tue', value: 138 },
    { label: 'Wed', value: 132 },
    { label: 'Thu', value: 155 },
  ];

  it('renders metric value, prefix, unit, icon, footer, positive delta badge, token-only SVG, and forwards React 19 ref', () => {
    const ref = createRef<HTMLElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            KpiMetricCard: { className: 'theme-kpi', style: { minWidth: '240px' } },
          },
        }}
      >
        <KpiMetricCard
          ref={ref}
          label="Monthly Recurring Revenue"
          value={142800}
          prefix="$"
          unit="USD"
          deltaPercent={12.4}
          deltaLabel="vs last 30d"
          sparkline={LABELED_SERIES}
          icon={<span data-testid="kpi-icon">★</span>}
          footer={<span data-testid="kpi-footer">Updated 2m ago</span>}
          className="custom-kpi"
          style={{ maxWidth: '380px' }}
          xstyle={{ '--prism-blur-px': '16px' }}
          data-testid="kpi-root"
        />
      </PrismThemeProvider>
    );

    const card = screen.getByTestId('kpi-root');
    expect(ref.current).toBe(card);
    expect(card.tagName).toBe('ARTICLE');
    expect(card).toHaveClass('refractor-kpi-metric-card', 'prism-slab', 'theme-kpi', 'custom-kpi');
    expect(card).toHaveStyle({ minWidth: '240px', maxWidth: '380px' });
    expect(card).toHaveAttribute('data-tone', 'positive');

    expect(screen.getByText('Monthly Recurring Revenue')).toBeInTheDocument();
    expect(screen.getByText('$')).toBeInTheDocument();
    expect(screen.getByText((142800).toLocaleString())).toBeInTheDocument();
    expect(screen.getByText('USD')).toBeInTheDocument();
    expect(screen.getByText('+12.4%')).toBeInTheDocument();
    expect(screen.getByText('vs last 30d')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-icon')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-footer')).toBeInTheDocument();

    const svg = screen.getByRole('img', { name: 'Monthly Recurring Revenue trend sparkline' });
    expect(svg.innerHTML).toContain('var(--prism-success-main)');
    expect(svg.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(svg.innerHTML).not.toContain('NaN');
  });

  it('supports negative, neutral, omitted, and inverted delta semantics', () => {
    const { rerender } = render(
      <KpiMetricCard
        label="Error Budget"
        value="99.4"
        unit="%"
        deltaPercent={-3.2}
        sparkline={[99.9, 99.7, 99.4]}
        data-testid="kpi-tone"
      />
    );

    const card = screen.getByTestId('kpi-tone');
    expect(card).toHaveAttribute('data-tone', 'negative');
    expect(screen.getByText('-3.2%')).toBeInTheDocument();
    expect(screen.getByRole('img').innerHTML).toContain('var(--prism-error-main)');

    // Zero delta -> neutral
    rerender(
      <KpiMetricCard
        label="Error Budget"
        value="99.4"
        deltaPercent={0}
        sparkline={[10, 20, 30]}
        data-testid="kpi-tone"
      />
    );
    expect(card).toHaveAttribute('data-tone', 'neutral');
    expect(screen.getByText('0.0%')).toBeInTheDocument();
    expect(screen.getByRole('img').innerHTML).toContain('var(--prism-primary-main)');

    // Inverted semantics: negative delta is positive (e.g. latency drop)
    rerender(
      <KpiMetricCard
        label="P99 Latency"
        value={38}
        unit="ms"
        deltaPercent={-14.5}
        invertDeltaSemantics
        sparkline={[52, 46, 38]}
        data-testid="kpi-tone"
      />
    );
    expect(card).toHaveAttribute('data-tone', 'positive');
    expect(card).toHaveAttribute('data-inverted', 'true');
    expect(screen.getByText('-14.5%')).toBeInTheDocument();
    expect(screen.getByRole('img').innerHTML).toContain('var(--prism-success-main)');

    // Inverted semantics: positive delta is negative (e.g. latency spike)
    rerender(
      <KpiMetricCard
        label="P99 Latency"
        value={74}
        unit="ms"
        deltaPercent={18.2}
        invertDeltaSemantics
        sparkline={[52, 60, 74]}
        data-testid="kpi-tone"
      />
    );
    expect(card).toHaveAttribute('data-tone', 'negative');
    expect(screen.getByText('+18.2%')).toBeInTheDocument();
    expect(screen.getByRole('img').innerHTML).toContain('var(--prism-error-main)');

    // Omitted deltaPercent with deltaLabel only
    rerender(
      <KpiMetricCard
        label="Active Nodes"
        value={24}
        deltaLabel="Steady state"
        sparkline={[24, 24, 24]}
        data-testid="kpi-tone"
      />
    );
    expect(card).toHaveAttribute('data-tone', 'neutral');
    expect(screen.getByText('Steady state')).toBeInTheDocument();

    // Omitted deltaPercent and omitted deltaLabel
    rerender(
      <KpiMetricCard
        label="Active Nodes"
        value={24}
        sparkline={[24, 24, 24]}
        data-testid="kpi-tone"
      />
    );
    expect(screen.queryByText('Steady state')).not.toBeInTheDocument();
  });

  it('updates live point readout via hover, click, focus/blur, and keyboard navigation', () => {
    render(
      <KpiMetricCard
        label="Throughput"
        value={155}
        unit="req/s"
        deltaPercent={8.5}
        sparkline={LABELED_SERIES}
      />
    );

    expect(screen.getByText('Latest (Thu)')).toBeInTheDocument();

    const points = screen.getAllByRole('button');
    expect(points).toHaveLength(4);

    // Hover point 1 (Tue)
    fireEvent.mouseEnter(points[1]!);
    expect(screen.getByText('Tue')).toBeInTheDocument();
    expect(screen.getByText('138 req/s')).toBeInTheDocument();

    // Mouse leave sparkline container resets to summary
    const sparklineSvg = screen.getByRole('img', { name: 'Throughput trend sparkline' });
    fireEvent.mouseLeave(sparklineSvg.parentElement as HTMLElement);
    expect(screen.getByText('Latest (Thu)')).toBeInTheDocument();

    // Click point 0 (Mon)
    fireEvent.click(points[0]!);
    expect(screen.getByText('Mon')).toBeInTheDocument();

    // Keyboard navigation: ArrowRight -> End -> ArrowLeft -> Home -> unrelated key
    fireEvent.focus(points[0]!);
    fireEvent.keyDown(points[0]!, { key: 'ArrowRight' });
    expect(screen.getByText('Tue')).toBeInTheDocument();
    expect(document.activeElement).toBe(points[1]);

    fireEvent.keyDown(points[1]!, { key: 'End' });
    expect(screen.getByText('Thu')).toBeInTheDocument();
    expect(document.activeElement).toBe(points[3]);

    fireEvent.keyDown(points[3]!, { key: 'ArrowLeft' });
    expect(screen.getByText('Wed')).toBeInTheDocument();
    expect(document.activeElement).toBe(points[2]);

    fireEvent.keyDown(points[2]!, { key: 'Home' });
    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(document.activeElement).toBe(points[0]);

    fireEvent.keyDown(points[0]!, { key: 'KeyZ' });
    expect(screen.getByText('Mon')).toBeInTheDocument();

    // Blur resets readout
    fireEvent.blur(points[0]!);
    expect(screen.getByText('Latest (Thu)')).toBeInTheDocument();
  });

  it('handles empty, single-point, all-equal, all-zero, negative, and NaN/Infinity inputs without NaN in SVG or text', () => {
    const { rerender } = render(
      <KpiMetricCard label="Metric" value={0} sparkline={[]} data-testid="adv-kpi" />
    );

    const card = screen.getByTestId('adv-kpi');
    expect(card).toHaveAttribute('data-empty-sparkline', 'true');
    expect(screen.getByText('No trend data')).toBeInTheDocument();
    expect(screen.getByText('No sparkline points available')).toBeInTheDocument();
    expect(card.querySelector('polyline')).toBeNull();

    // Single point [42]
    rerender(<KpiMetricCard label="Metric" value={42} sparkline={[42]} data-testid="adv-kpi" />);
    const singleSvg = screen.getByRole('img', { name: 'Metric trend sparkline' });
    expect(singleSvg.innerHTML).not.toContain('NaN');
    expect(singleSvg.innerHTML).not.toContain('Infinity');
    expect(singleSvg.querySelector('polyline')?.getAttribute('points')).toBe('120,31');

    // All equal [10, 10, 10]
    rerender(
      <KpiMetricCard label="Metric" value={10} sparkline={[10, 10, 10]} data-testid="adv-kpi" />
    );
    const flatSvg = screen.getByRole('img', { name: 'Metric trend sparkline' });
    expect(flatSvg.innerHTML).not.toContain('NaN');
    expect(flatSvg.querySelector('polyline')?.getAttribute('points')).toBe('8,31 120,31 232,31');

    // All zero [0, 0, 0]
    rerender(
      <KpiMetricCard label="Metric" value={0} sparkline={[0, 0, 0]} data-testid="adv-kpi" />
    );
    expect(screen.getByRole('img').innerHTML).not.toContain('NaN');

    // Negative values [-20, -5, 15]
    rerender(
      <KpiMetricCard label="Delta" value={-5} sparkline={[-20, -5, 15]} data-testid="adv-kpi" />
    );
    expect(screen.getByRole('img').innerHTML).not.toContain('NaN');

    // NaN / Infinity inside numeric sparkline, object sparkline, deltaPercent, and value
    rerender(
      <KpiMetricCard
        label="Corrupt Feed"
        value={Number.NaN}
        deltaPercent={Number.POSITIVE_INFINITY}
        sparkline={[Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]}
        data-testid="adv-kpi"
      />
    );
    expect(card).toHaveAttribute('data-tone', 'neutral');
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByText('0.0%')).toBeInTheDocument();
    expect(card.textContent).not.toContain('NaN');
    expect(card.textContent).not.toContain('Infinity');
    expect(screen.getByRole('img').innerHTML).not.toContain('NaN');
    expect(screen.getByRole('img').innerHTML).not.toContain('Infinity');

    // Non-finite inside KpiSparklinePoint entries + shrinking series after selection
    rerender(
      <KpiMetricCard
        label="Object Feed"
        value={10}
        deltaPercent={Number.NaN}
        sparkline={[
          { label: 'A', value: Number.NaN },
          { label: 'B', value: 25 },
          { label: 'C', value: Number.POSITIVE_INFINITY },
        ]}
        data-testid="adv-kpi"
      />
    );
    const objPoints = screen.getAllByRole('button');
    fireEvent.click(objPoints[2]!);
    expect(screen.getByText('C')).toBeInTheDocument();
    expect(screen.getByRole('img').innerHTML).not.toContain('NaN');

    // Shrink sparkline while activeIndex was 2 -> gracefully falls back to summary without crashing
    rerender(
      <KpiMetricCard
        label="Object Feed"
        value={10}
        sparkline={[{ label: 'Only', value: 10 }]}
        data-testid="adv-kpi"
      />
    );
    expect(screen.getByText('Latest (Only)')).toBeInTheDocument();
  });

  it('safely renders adversarial XSS payloads in label, value, deltaLabel, and point labels as literal text', () => {
    const payload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';

    render(
      <KpiMetricCard
        label={payload}
        value={payload}
        deltaPercent={4.2}
        deltaLabel={payload}
        sparkline={[{ label: payload, value: 99 }]}
      />
    );

    expect(screen.getAllByText(payload).length).toBeGreaterThanOrEqual(3);
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
  });
});
