import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { WaterfallChart, type WaterfallStep } from './index';

const PNL_STEPS: WaterfallStep[] = [
  { id: 'open', label: 'Opening', value: 100, kind: 'start' },
  { id: 'sales', label: 'New Sales', value: 45, kind: 'increase' },
  { id: 'cogs', label: 'COGS', value: 18, kind: 'decrease' },
  { id: 'opex', label: 'OpEx', value: -12.5 },
  { id: 'upsell', label: 'Upsell', value: 5.5 },
  { id: 'ebitda', label: 'EBITDA', value: 999, kind: 'total' },
];

describe('WaterfallChart', () => {
  it('renders optical-glass waterfall bars, dashed connectors, zero baseline, forwards ref, and uses semantic tokens only', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <PrismThemeProvider
        theme={{
          components: {
            WaterfallChart: {
              className: 'theme-waterfall',
              style: { maxWidth: '760px' },
            },
          },
        }}
      >
        <WaterfallChart
          ref={ref}
          steps={PNL_STEPS}
          valueSuffix="k"
          className="consumer-waterfall"
          xstyle={{ '--prism-blur-px': '16px' }}
          data-testid="wf-chart"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('wf-chart');
    expect(ref.current).toBe(root);
    expect(WaterfallChart.displayName).toBe('WaterfallChart');
    expect(root).toHaveClass(
      'refractor-waterfall-chart',
      'prism-slab',
      'theme-waterfall',
      'consumer-waterfall'
    );
    expect(root).toHaveStyle({ maxWidth: '760px' });
    expect(root).not.toHaveAttribute('data-empty');
    expect(root).not.toHaveAttribute('data-has-negative');

    expect(screen.getByRole('heading', { name: 'P&L Waterfall' })).toBeInTheDocument();

    const netBadge = screen.getByTestId('waterfall-net-badge');
    expect(netBadge).toHaveClass('prism-emerald');
    expect(netBadge).toHaveTextContent('Net: $120k');

    const svg = screen.getByRole('img', {
      name: 'P&L Waterfall waterfall chart across 6 steps',
    });
    expect(svg).toHaveAttribute('viewBox', '0 0 580 240');
    expect(svg.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(svg.innerHTML).not.toMatch(/\b(?:rgba?|hsla?)\s*\(/);
    expect(svg.innerHTML).not.toContain('NaN');

    const bars = svg.querySelectorAll('rect');
    expect(bars).toHaveLength(6);
    expect(bars[0]).toHaveAttribute('fill', 'var(--prism-secondary-main)');
    expect(bars[0]).toHaveAttribute('data-step-kind', 'start');
    expect(bars[1]).toHaveAttribute('fill', 'var(--prism-success-main)');
    expect(bars[1]).toHaveAttribute('data-step-kind', 'increase');
    expect(bars[2]).toHaveAttribute('fill', 'var(--prism-error-main)');
    expect(bars[2]).toHaveAttribute('data-step-kind', 'decrease');
    expect(bars[3]).toHaveAttribute('fill', 'var(--prism-error-main)');
    expect(bars[3]).toHaveAttribute('data-step-kind', 'decrease');
    expect(bars[4]).toHaveAttribute('fill', 'var(--prism-success-main)');
    expect(bars[4]).toHaveAttribute('data-step-kind', 'increase');
    expect(bars[5]).toHaveAttribute('fill', 'var(--prism-primary-main)');
    expect(bars[5]).toHaveAttribute('data-step-kind', 'total');

    const zeroLine = svg.querySelector('line[data-role="zero-baseline"]');
    expect(zeroLine).not.toBeNull();
    expect(zeroLine).toHaveAttribute('stroke', 'var(--prism-text-secondary)');

    const connectors = svg.querySelectorAll('line[data-role="waterfall-connector"]');
    expect(connectors).toHaveLength(5);
    connectors.forEach((line, idx) => {
      expect(line).toHaveAttribute('stroke', 'var(--prism-divider)');
      expect(line).toHaveAttribute('stroke-dasharray', '3 3');
      const prevBar = bars[idx]!;
      const nextBar = bars[idx + 1]!;
      const prevRight = Number(prevBar.getAttribute('x')) + Number(prevBar.getAttribute('width'));
      const nextLeft = Number(nextBar.getAttribute('x'));
      expect(Number(line.getAttribute('x1'))).toBeCloseTo(prevRight, 3);
      expect(Number(line.getAttribute('x2'))).toBeCloseTo(nextLeft, 3);
      expect(line.getAttribute('y1')).toBe(line.getAttribute('y2'));
    });

    const readout = screen.getByTestId('waterfall-chart-readout');
    expect(readout).toHaveClass('prism-well');
    expect(readout).toHaveTextContent(
      'Select any step bar to inspect exact delta and running total.'
    );
  });

  it('computes cumulative running trajectory, ignores stale total values after prior deltas, and fires onSelectStep via click and IME-safe keyboard', () => {
    const onSelectStep = vi.fn();
    render(
      <WaterfallChart
        title="Q4 Bridge"
        steps={PNL_STEPS}
        valuePrefix="$"
        valueSuffix="k"
        onSelectStep={onSelectStep}
      />
    );

    const salesBar = screen.getByRole('button', {
      name: 'New Sales (Increase): +$45k, running total $145k',
    });
    fireEvent.click(salesBar);
    expect(onSelectStep).toHaveBeenCalledWith(PNL_STEPS[1], 145);
    expect(salesBar).toHaveAttribute('data-selected', 'true');
    expect(screen.getByTestId('waterfall-chart-readout')).toHaveTextContent(
      'New Sales+$45kRunning total: $145k'
    );

    // Decrease with positive value magnitude subtracts Math.abs(val)
    const cogsBar = screen.getByRole('button', {
      name: 'COGS (Decrease): -$18k, running total $127k',
    });
    // IME composition Enter must be ignored
    fireEvent.keyDown(cogsBar, { key: 'Enter', isComposing: true });
    expect(onSelectStep).toHaveBeenCalledTimes(1);

    // Non-activation key must be ignored
    fireEvent.keyDown(cogsBar, { key: 'Escape' });
    expect(onSelectStep).toHaveBeenCalledTimes(1);

    // Enter activates bar
    fireEvent.keyDown(cogsBar, { key: 'Enter' });
    expect(onSelectStep).toHaveBeenLastCalledWith(PNL_STEPS[2], 127);
    expect(screen.getByTestId('waterfall-chart-readout')).toHaveTextContent(
      'COGS-$18kRunning total: $127k'
    );

    // Space activates final total bar (must equal cumulative 120, not explicit 999)
    const totalBar = screen.getByRole('button', {
      name: 'EBITDA (Total): +$120k, running total $120k',
    });
    fireEvent.keyDown(totalBar, { key: ' ' });
    expect(onSelectStep).toHaveBeenLastCalledWith(PNL_STEPS[5], 120);
    expect(screen.getByTestId('waterfall-chart-readout')).toHaveTextContent(
      'EBITDA+$120kRunning total: $120k'
    );
  });

  it('uses explicit total value only when there is no prior cumulative delta, and respects zero cumulative total afterward', () => {
    const onSelectStep = vi.fn();
    const standaloneTotal: WaterfallStep[] = [
      { id: 'only-total', label: 'Standalone Net', value: 85, kind: 'total' },
    ];
    const { rerender } = render(
      <WaterfallChart steps={standaloneTotal} onSelectStep={onSelectStep} />
    );

    expect(screen.getByTestId('waterfall-net-badge')).toHaveTextContent('Net: $85');
    expect(screen.getByRole('img').querySelectorAll('line[data-role="waterfall-connector"]')).toHaveLength(0);

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Standalone Net (Total): +$85, running total $85',
      })
    );
    expect(onSelectStep).toHaveBeenCalledWith(standaloneTotal[0], 85);

    // When prior deltas net back to 0, total MUST stay 0 rather than adopting explicit value 500
    const balancedSteps: WaterfallStep[] = [
      { id: 's', label: 'Base', value: 50, kind: 'start' },
      { id: 'd', label: 'Offset', value: -50, kind: 'decrease' },
      { id: 't', label: 'Net Zero', value: 500, kind: 'total' },
    ];
    rerender(<WaterfallChart steps={balancedSteps} onSelectStep={onSelectStep} />);

    const netBadge = screen.getByTestId('waterfall-net-badge');
    expect(netBadge).toHaveClass('prism-crystal');
    expect(netBadge).toHaveTextContent('Net: $0');

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Net Zero (Total): $0, running total $0',
      })
    );
    expect(onSelectStep).toHaveBeenLastCalledWith(balancedSteps[2], 0);
  });

  it('supports negative running totals with a visible zero baseline rule and zero tick label', () => {
    const onSelectStep = vi.fn();
    const negativeSteps: WaterfallStep[] = [
      { id: 'start', label: 'Opening', value: 60, kind: 'start' },
      { id: 'writeoff', label: 'Write-off', value: -95, kind: 'decrease' },
      { id: 'recovery', label: 'Recovery', value: 15, kind: 'increase' },
      { id: 'net', label: 'Net Loss', value: 0, kind: 'total' },
    ];

    render(
      <WaterfallChart
        steps={negativeSteps}
        valuePrefix="€"
        valueSuffix="M"
        onSelectStep={onSelectStep}
        data-testid="neg-wf"
      />
    );

    const root = screen.getByTestId('neg-wf');
    expect(root).toHaveAttribute('data-has-negative', 'true');

    const netBadge = screen.getByTestId('waterfall-net-badge');
    expect(netBadge).toHaveClass('prism-crystal');
    expect(netBadge.style.color).toBe('var(--prism-error-main)');
    expect(netBadge).toHaveTextContent('Net: -€20M');

    const svg = screen.getByRole('img');
    const zeroLine = svg.querySelector('line[data-role="zero-baseline"]');
    expect(zeroLine).not.toBeNull();
    expect(zeroLine).toHaveAttribute('stroke', 'var(--prism-text-secondary)');
    const zeroY = Number(zeroLine!.getAttribute('y1'));
    expect(zeroY).toBeGreaterThan(26);
    expect(zeroY).toBeLessThan(202);

    // Since domain is [-35, 60], none of [0, 0.25, 0.5, 0.75, 1] lands on 0 -> dedicated zero tick label renders
    const zeroTickLabel = svg.querySelector('text[data-role="zero-tick-label"]');
    expect(zeroTickLabel).not.toBeNull();
    expect(zeroTickLabel).toHaveTextContent('€0M');

    const writeoffBar = screen.getByRole('button', {
      name: 'Write-off (Decrease): -€95M, running total -€35M',
    });
    fireEvent.click(writeoffBar);
    expect(onSelectStep).toHaveBeenCalledWith(negativeSteps[1], -35);
    expect(screen.getByTestId('waterfall-chart-readout')).toHaveTextContent(
      'Write-off-€95MRunning total: -€35M'
    );
  });

  it('clamps height to 160..480, sanitizes non-finite and all-zero inputs, handles sliver bars, and recovers when steps shrink', () => {
    const onSelectStep = vi.fn();
    const edgeSteps: WaterfallStep[] = [
      { id: 'missing', label: 'Missing Val', value: Number.NaN, kind: 'start' },
      { id: 'inf', label: 'Inf Val', value: Number.POSITIVE_INFINITY },
      { id: 'negzero', label: 'Neg Zero', value: -0, kind: 'decrease' },
      { id: 'ninf', label: 'Neg Inf', value: Number.NEGATIVE_INFINITY, kind: 'increase' },
    ];

    const { rerender } = render(
      <WaterfallChart steps={edgeSteps} height={90} onSelectStep={onSelectStep} />
    );
    expect(screen.getByRole('img')).toHaveAttribute('viewBox', '0 0 580 160');
    expect(screen.getByRole('img').innerHTML).not.toContain('NaN');

    // Select last bar (index 3) and ensure runningTotal is +0 (not -0)
    const lastBar = screen.getByRole('button', {
      name: 'Neg Inf (Increase): $0, running total $0',
    });
    fireEvent.click(lastBar);
    expect(onSelectStep).toHaveBeenCalledTimes(1);
    const passedTotal = onSelectStep.mock.calls[0]![1] as number;
    expect(Object.is(passedTotal, 0)).toBe(true);

    // Shrink steps array below selectedIndex -> readout falls back gracefully; test upper height clamp & sliver bar
    rerender(
      <WaterfallChart
        steps={[
          { id: 'big', label: 'Big', value: 100000, kind: 'start' },
          { id: 'tiny', label: 'Tiny', value: 1, kind: 'increase' },
        ]}
        height={900}
      />
    );
    expect(screen.getByRole('img')).toHaveAttribute('viewBox', '0 0 580 480');
    expect(screen.getByTestId('waterfall-chart-readout')).toHaveTextContent(
      'Select any step bar to inspect exact delta and running total.'
    );
    const tinyBar = screen.getByRole('button', {
      name: 'Tiny (Increase): +$1, running total $100001',
    });
    expect(Number(tinyBar.getAttribute('height'))).toBeGreaterThanOrEqual(2);
    // Click without onSelectStep handler defined
    fireEvent.click(tinyBar);
    expect(screen.getByTestId('waterfall-chart-readout')).toHaveTextContent(
      'Tiny+$1Running total: $100001'
    );

    // Non-finite height falls back to 240
    rerender(
      <WaterfallChart
        steps={[{ id: 'loss', label: 'Loss', value: -40, kind: 'start' }]}
        height={Number.NaN}
      />
    );
    expect(screen.getByRole('img')).toHaveAttribute('viewBox', '0 0 580 240');
    expect(screen.getByRole('img').innerHTML).not.toContain('NaN');
  });

  it('renders clean empty state when steps is empty and neutralizes XSS strings', () => {
    const { rerender } = render(<WaterfallChart steps={[]} data-testid="empty-wf" />);

    expect(screen.getByTestId('empty-wf')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByTestId('waterfall-chart-empty')).toHaveTextContent(
      'No waterfall steps to display.'
    );
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.queryByTestId('waterfall-chart-readout')).toBeNull();
    expect(screen.queryByTestId('waterfall-net-badge')).toBeNull();

    const payload = '<script>window.__wfXss=1</script><img src=x onerror=alert(1)>';
    rerender(
      <WaterfallChart
        title={payload}
        valuePrefix={payload}
        steps={[{ id: 'xss', label: payload, value: 25, kind: 'start' }]}
      />
    );
    expect(screen.getByRole('heading', { name: payload })).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
  });
});
