import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  BurndownBurnupChart,
  DEFAULT_SPRINT_BURN_DATA,
  type SprintBurnPoint,
} from './index';

describe('BurndownBurnupChart', () => {
  it('renders default 10-day sprint trajectory with mid-sprint scope increase, forwards ref, applies theme overrides, and uses semantic tokens only', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <PrismThemeProvider
        theme={{
          components: {
            BurndownBurnupChart: {
              className: 'theme-burn-chart',
              style: { maxWidth: '680px' },
            },
          },
        }}
      >
        <BurndownBurnupChart
          ref={ref}
          className="consumer-burn-chart"
          xstyle={{ '--prism-blur-px': '16px' }}
          data-testid="burn-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('burn-root');
    expect(ref.current).toBe(root);
    expect(BurndownBurnupChart.displayName).toBe('BurndownBurnupChart');
    expect(root).toHaveClass(
      'refractor-burndown-burnup-chart',
      'prism-slab',
      'theme-burn-chart',
      'consumer-burn-chart'
    );
    expect(root).toHaveStyle({ maxWidth: '680px' });
    expect(root).toHaveAttribute('data-mode', 'burndown');
    expect(root).toHaveAttribute('data-pace', 'on-track');
    expect(root).not.toHaveAttribute('data-empty');

    expect(
      screen.getByRole('heading', { name: 'Sprint Burn-Down / Burn-Up' })
    ).toBeInTheDocument();

    // Verify built-in 10-day trajectory includes mid-sprint scope increase
    expect(DEFAULT_SPRINT_BURN_DATA).toHaveLength(10);
    expect(DEFAULT_SPRINT_BURN_DATA[4]!.scope).toBeGreaterThan(
      DEFAULT_SPRINT_BURN_DATA[0]!.scope
    );

    // Pace pill defaults to On Track in --prism-success-main
    const pacePill = screen.getByTestId('burn-pace-pill');
    expect(pacePill).toHaveTextContent('On Track');
    expect(pacePill.style.color).toBe('var(--prism-success-main)');

    // Mode buttons expose aria-pressed
    expect(screen.getByTestId('burn-mode-burndown')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('burn-mode-burnup')).toHaveAttribute('aria-pressed', 'false');

    // Responsive SVG inside recessed prism-well with zero raw color literals
    const svg = screen.getByTestId('burn-chart-svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 460 210');
    expect(svg).toHaveClass('w-full', 'h-auto', 'select-none');
    expect(svg.parentElement).toHaveClass('prism-well');
    expect(svg.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(svg.innerHTML).not.toMatch(/\b(?:rgba?|hsla?)\s*\(/);
    expect(svg.innerHTML).not.toContain('NaN');

    // Burndown series styling: primary actual line, dashed secondary ideal line, no scope ceiling
    const actualLine = screen.getByTestId('burn-actual-line');
    expect(actualLine).toHaveAttribute('stroke', 'var(--prism-primary-main)');
    const idealLine = screen.getByTestId('burn-ideal-line');
    expect(idealLine).toHaveAttribute('stroke', 'var(--prism-text-secondary)');
    expect(idealLine).toHaveAttribute('stroke-dasharray', '5 4');
    expect(screen.queryByTestId('burn-scope-ceiling')).toBeNull();
    expect(screen.getByTestId('burn-area-path')).toBeInTheDocument();
    expect(screen.getAllByTestId('burn-y-gridline')).toHaveLength(5);

    // Recessed aria-live="polite" inspector shows Day 10 by default
    const inspector = screen.getByTestId('burn-inspector');
    expect(inspector).toHaveClass('prism-well');
    expect(inspector).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByTestId('burn-inspector-day')).toHaveTextContent('Day 10');
    expect(screen.getByTestId('burn-inspector-remaining')).toHaveTextContent('Remaining: 2 pts');
    expect(screen.getByTestId('burn-inspector-completed')).toHaveTextContent('Completed: 90 pts');
    expect(screen.getByTestId('burn-inspector-scope')).toHaveTextContent('Scope: 92 pts');
    expect(screen.getByTestId('burn-inspector-delta')).toHaveTextContent('Ideal Delta: +2 pts');
  });

  it('supports uncontrolled and controlled Burn-Down / Burn-Up mode switching and renders Scope Ceiling in Burn-Up mode', () => {
    const onModeChange = vi.fn();
    const { rerender } = render(
      <BurndownBurnupChart onModeChange={onModeChange} data-testid="mode-chart" />
    );

    const burndownBtn = screen.getByTestId('burn-mode-burndown');
    const burnupBtn = screen.getByTestId('burn-mode-burnup');

    // Clicking already-active mode does not redundantly fire onModeChange
    fireEvent.click(burndownBtn);
    expect(onModeChange).not.toHaveBeenCalled();

    // Switch to Burn-Up (uncontrolled)
    fireEvent.click(burnupBtn);
    expect(onModeChange).toHaveBeenCalledTimes(1);
    expect(onModeChange).toHaveBeenLastCalledWith('burnup');
    expect(screen.getByTestId('mode-chart')).toHaveAttribute('data-mode', 'burnup');
    expect(burnupBtn).toHaveAttribute('aria-pressed', 'true');
    expect(burndownBtn).toHaveAttribute('aria-pressed', 'false');

    // Actual polyline switches to --prism-success-main and Scope Ceiling renders in --prism-warning-main
    expect(screen.getByTestId('burn-actual-line')).toHaveAttribute(
      'stroke',
      'var(--prism-success-main)'
    );
    const scopeCeiling = screen.getByTestId('burn-scope-ceiling');
    expect(scopeCeiling).toHaveAttribute('stroke', 'var(--prism-warning-main)');
    expect(screen.getByTestId('burn-legend-scope')).toHaveTextContent('Scope Ceiling');
    expect(screen.getByTestId('burn-inspector-delta')).toHaveTextContent('Ideal Delta: -2 pts');

    // Controlled mode stays anchored to prop until parent updates it
    const onControlledChange = vi.fn();
    rerender(
      <BurndownBurnupChart
        mode="burndown"
        onModeChange={onControlledChange}
        data-testid="mode-chart"
      />
    );
    expect(screen.getByTestId('mode-chart')).toHaveAttribute('data-mode', 'burndown');
    fireEvent.click(screen.getByTestId('burn-mode-burnup'));
    expect(onControlledChange).toHaveBeenCalledWith('burnup');
    // Still burndown until parent updates controlled prop
    expect(screen.getByTestId('mode-chart')).toHaveAttribute('data-mode', 'burndown');

    rerender(
      <BurndownBurnupChart
        mode="burnup"
        onModeChange={onControlledChange}
        data-testid="mode-chart"
      />
    );
    expect(screen.getByTestId('mode-chart')).toHaveAttribute('data-mode', 'burnup');
    expect(screen.getByTestId('burn-scope-ceiling')).toBeInTheDocument();
  });

  it('computes On Track, At Risk, and Behind Ideal pace statuses and inspector delta colors accurately', () => {
    const onTrackOverDelivered: SprintBurnPoint[] = [
      { id: 'd1', label: 'D1', scope: 50, completed: 10 },
      { id: 'd2', label: 'D2', scope: 50, completed: 58 }, // Over-delivered -> remaining clamped to 0
    ];
    const atRiskData: SprintBurnPoint[] = [
      { id: 'd1', label: 'D1', scope: 100, completed: 20 },
      { id: 'd2', label: 'D2', scope: 100, completed: 50 },
      { id: 'd3', label: 'D3', scope: 100, completed: 90 }, // 10% remaining -> At Risk
    ];
    const behindData: SprintBurnPoint[] = [
      { id: 'd1', label: 'D1', scope: 100, completed: 10 },
      { id: 'd2', label: 'D2', scope: 100, completed: 35 },
      { id: 'd3', label: 'D3', scope: 100, completed: 65 }, // 35% remaining -> Behind Ideal
    ];

    const { rerender } = render(
      <BurndownBurnupChart data={onTrackOverDelivered} defaultMode="burnup" />
    );
    let pacePill = screen.getByTestId('burn-pace-pill');
    expect(pacePill).toHaveTextContent('On Track');
    expect(pacePill).toHaveAttribute('data-pace', 'on-track');
    expect(pacePill.style.color).toBe('var(--prism-success-main)');
    expect(screen.getByTestId('burn-inspector-remaining')).toHaveTextContent('Remaining: 0 pts');
    expect(screen.getByTestId('burn-inspector-delta')).toHaveTextContent('Ideal Delta: +8 pts');
    expect(
      screen.getByTestId('burn-inspector-delta').querySelector('strong')!.style.color
    ).toBe('var(--prism-success-main)');

    // At Risk (>5% and <=15% behind)
    rerender(<BurndownBurnupChart data={atRiskData} mode="burndown" />);
    pacePill = screen.getByTestId('burn-pace-pill');
    expect(pacePill).toHaveTextContent('At Risk');
    expect(pacePill).toHaveAttribute('data-pace', 'at-risk');
    expect(pacePill.style.color).toBe('var(--prism-warning-main)');
    expect(
      screen.getByTestId('burn-inspector-delta').querySelector('strong')!.style.color
    ).toBe('var(--prism-warning-main)');

    // Behind Ideal (>15% behind)
    rerender(<BurndownBurnupChart data={behindData} mode="burndown" />);
    pacePill = screen.getByTestId('burn-pace-pill');
    expect(pacePill).toHaveTextContent('Behind Ideal');
    expect(pacePill).toHaveAttribute('data-pace', 'behind');
    expect(pacePill.style.color).toBe('var(--prism-error-main)');
    expect(
      screen.getByTestId('burn-inspector-delta').querySelector('strong')!.style.color
    ).toBe('var(--prism-error-main)');

    // Select D1 where remaining (90) is ahead of ideal (100) -> negative delta in --prism-success-main
    fireEvent.click(screen.getByTestId('burn-point-0'));
    expect(screen.getByTestId('burn-inspector-delta')).toHaveTextContent('Ideal Delta: -10 pts');
    expect(
      screen.getByTestId('burn-inspector-delta').querySelector('strong')!.style.color
    ).toBe('var(--prism-success-main)');
  });

  it('supports clickable and IME-safe keyboard-navigable day markers with crosshair highlight', () => {
    const onSelectPoint = vi.fn();
    render(<BurndownBurnupChart onSelectPoint={onSelectPoint} />);

    // Click Day 5 (index 4)
    const day5 = screen.getByTestId('burn-point-4');
    fireEvent.click(day5);
    expect(onSelectPoint).toHaveBeenCalledWith(DEFAULT_SPRINT_BURN_DATA[4], 4);
    expect(day5).toHaveAttribute('data-selected', 'true');
    expect(screen.getByTestId('burn-crosshair')).toHaveAttribute(
      'x1',
      day5.getAttribute('cx')!
    );
    expect(screen.getByTestId('burn-inspector-day')).toHaveTextContent('Day 5');
    expect(screen.getByTestId('burn-inspector-remaining')).toHaveTextContent('Remaining: 52 pts');
    expect(screen.getByTestId('burn-inspector-scope')).toHaveTextContent('Scope: 92 pts');

    // IME composition must be ignored
    fireEvent.keyDown(day5, { key: 'Enter', isComposing: true });
    fireEvent.keyDown(day5, { key: 'ArrowRight', isComposing: true });
    expect(onSelectPoint).toHaveBeenCalledTimes(1);

    // Unrelated key must be ignored
    fireEvent.keyDown(day5, { key: 'Escape' });
    expect(onSelectPoint).toHaveBeenCalledTimes(1);

    // ArrowRight moves to Day 6 and shifts focus
    fireEvent.keyDown(day5, { key: 'ArrowRight' });
    expect(onSelectPoint).toHaveBeenLastCalledWith(DEFAULT_SPRINT_BURN_DATA[5], 5);
    expect(document.activeElement).toBe(screen.getByTestId('burn-point-5'));
    expect(screen.getByTestId('burn-inspector-day')).toHaveTextContent('Day 6');

    // ArrowLeft moves back to Day 5
    fireEvent.keyDown(screen.getByTestId('burn-point-5'), { key: 'ArrowLeft' });
    expect(onSelectPoint).toHaveBeenLastCalledWith(DEFAULT_SPRINT_BURN_DATA[4], 4);
    expect(document.activeElement).toBe(day5);

    // Enter & Space activate the marker
    fireEvent.keyDown(screen.getByTestId('burn-point-2'), { key: 'Enter' });
    expect(onSelectPoint).toHaveBeenLastCalledWith(DEFAULT_SPRINT_BURN_DATA[2], 2);
    fireEvent.keyDown(screen.getByTestId('burn-point-3'), { key: ' ' });
    expect(onSelectPoint).toHaveBeenLastCalledWith(DEFAULT_SPRINT_BURN_DATA[3], 3);

    // Home jumps to first day and ArrowLeft clamps at 0
    fireEvent.keyDown(screen.getByTestId('burn-point-3'), { key: 'Home' });
    expect(onSelectPoint).toHaveBeenLastCalledWith(DEFAULT_SPRINT_BURN_DATA[0], 0);
    expect(document.activeElement).toBe(screen.getByTestId('burn-point-0'));
    fireEvent.keyDown(screen.getByTestId('burn-point-0'), { key: 'ArrowLeft' });
    expect(onSelectPoint).toHaveBeenLastCalledWith(DEFAULT_SPRINT_BURN_DATA[0], 0);

    // End jumps to last day and ArrowRight clamps at last index
    fireEvent.keyDown(screen.getByTestId('burn-point-0'), { key: 'End' });
    expect(onSelectPoint).toHaveBeenLastCalledWith(DEFAULT_SPRINT_BURN_DATA[9], 9);
    expect(document.activeElement).toBe(screen.getByTestId('burn-point-9'));
    fireEvent.keyDown(screen.getByTestId('burn-point-9'), { key: 'ArrowRight' });
    expect(onSelectPoint).toHaveBeenLastCalledWith(DEFAULT_SPRINT_BURN_DATA[9], 9);
  });

  it('handles single checkpoint, long sprints, fractional scopes, empty unit, non-finite/negative values, zero scope, and data shrinking gracefully', () => {
    // 1. Single checkpoint in Burn-Down and Burn-Up
    const singlePoint: SprintBurnPoint[] = [
      { id: 'only', label: 'Sprint Day', scope: 2.5, completed: 1.25 },
    ];
    const { rerender } = render(
      <BurndownBurnupChart data={singlePoint} unit="" mode="burndown" />
    );
    expect(screen.getByTestId('burn-ideal-line').tagName.toLowerCase()).toBe('line');
    expect(screen.queryByTestId('burn-area-path')).toBeNull();
    expect(screen.queryByTestId('burn-actual-line')).toBeNull();
    expect(screen.getByTestId('burn-inspector-remaining')).toHaveTextContent('Remaining: 1.3');
    expect(screen.getByTestId('burn-inspector-delta')).toHaveTextContent('Ideal Delta: +1.3');

    rerender(<BurndownBurnupChart data={singlePoint} unit="" mode="burnup" />);
    expect(screen.getByTestId('burn-scope-ceiling').tagName.toLowerCase()).toBe('line');
    expect(screen.getByTestId('burn-chart-svg').innerHTML).not.toContain('NaN');

    // 2. Non-finite, negative, all-zero values, and initial zero scope -> later scope
    const sanitizedData: SprintBurnPoint[] = [
      { id: 'a', label: 'A', scope: Number.NaN, completed: Number.NEGATIVE_INFINITY },
      { id: 'b', label: 'B', scope: -10, completed: Number.POSITIVE_INFINITY },
      { id: 'c', label: 'C', scope: -0, completed: -0 },
    ];
    rerender(<BurndownBurnupChart data={sanitizedData} mode="burndown" />);
    expect(screen.getByTestId('burn-chart-svg').innerHTML).not.toContain('NaN');
    expect(screen.getByTestId('burn-pace-pill')).toHaveTextContent('On Track');
    expect(screen.getByTestId('burn-inspector-delta')).toHaveTextContent('Ideal Delta: 0 pts');

    // Initial scope 0 growing later + final scope dropping to 0
    const scopeShiftData: SprintBurnPoint[] = [
      { id: 's1', label: 'S1', scope: 0, completed: 0 },
      { id: 's2', label: 'S2', scope: 40, completed: 15 },
      { id: 's3', label: 'S3', scope: 0, completed: 0 },
    ];
    rerender(<BurndownBurnupChart data={scopeShiftData} mode="burndown" />);
    expect(screen.getByTestId('burn-chart-svg').innerHTML).not.toContain('NaN');
    expect(screen.getByTestId('burn-pace-pill')).toHaveTextContent('On Track');

    // 3. Long 14-day sprint triggers X-axis label thinning; select high index then shrink data
    const longSprint: SprintBurnPoint[] = Array.from({ length: 14 }, (_, idx) => ({
      id: `l-${idx + 1}`,
      label: `Day ${idx + 1}`,
      scope: 140,
      completed: (idx + 1) * 10,
    }));
    rerender(<BurndownBurnupChart data={longSprint} />);
    const svgTextLabels = Array.from(
      screen.getByTestId('burn-chart-svg').querySelectorAll('text')
    ).map((el) => el.textContent);
    expect(svgTextLabels).toContain('Day 1');
    expect(svgTextLabels).toContain('Day 14');
    // Not every intermediate day label is rendered when > 10 points
    expect(svgTextLabels).not.toContain('Day 2');

    // Select Day 12 (index 11) without onSelectPoint prop, then shrink to 2 points
    fireEvent.click(screen.getByTestId('burn-point-11'));
    expect(screen.getByTestId('burn-inspector-day')).toHaveTextContent('Day 12');

    rerender(<BurndownBurnupChart data={longSprint.slice(0, 2)} />);
    expect(screen.getByTestId('burn-inspector-day')).toHaveTextContent('Day 2');
  });

  it('renders clean role="status" empty state when data is [] and neutralizes XSS payloads', () => {
    const { rerender } = render(<BurndownBurnupChart data={[]} data-testid="empty-burn" />);

    const root = screen.getByTestId('empty-burn');
    expect(root).toHaveAttribute('data-empty', 'true');
    expect(root).not.toHaveAttribute('data-pace');
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('No sprint burn data available.');
    expect(screen.queryByTestId('burn-chart-svg')).toBeNull();
    expect(screen.queryByTestId('burn-pace-pill')).toBeNull();
    expect(screen.queryByTestId('burn-inspector')).toBeNull();

    const payload = '<script>window.__burnXss=1</script><img src=x onerror=alert(1)>';
    rerender(
      <BurndownBurnupChart
        title={payload}
        unit={payload}
        data={[{ id: 'xss', label: payload, scope: 10, completed: 5 }]}
      />
    );
    expect(screen.getByRole('heading', { name: payload })).toBeInTheDocument();
    expect(screen.getByTestId('burn-inspector-day')).toHaveTextContent(payload);
    expect(document.querySelector('script')).toBeNull();
  });
});
