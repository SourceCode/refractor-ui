import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  BumpChart,
  DEFAULT_BUMP_PERIODS,
  DEFAULT_BUMP_SERIES,
  type BumpSelection,
  type BumpSeriesItem,
} from './index';

describe('BumpChart', () => {
  it('renders default 5 trajectories with smooth cubic-Bezier crossovers, #1 rail at top, ref forwarding, theme overrides, and semantic tokens only', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <PrismThemeProvider
        theme={{
          components: {
            BumpChart: { className: 'theme-bump', style: { maxWidth: '780px' } },
          },
        }}
      >
        <BumpChart
          ref={ref}
          className="consumer-bump"
          xstyle={{ '--prism-blur-px': '14px' }}
          data-testid="bump-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('bump-root');
    expect(ref.current).toBe(root);
    expect(BumpChart.displayName).toBe('BumpChart');
    expect(DEFAULT_BUMP_PERIODS).toEqual(['Q1', 'Q2', 'Q3', 'Q4', 'Q1+']);
    expect(DEFAULT_BUMP_SERIES).toHaveLength(5);
    expect(root).toHaveClass('refractor-bump-chart', 'prism-slab', 'theme-bump', 'consumer-bump');
    expect(root).toHaveStyle({ maxWidth: '780px' });
    expect(screen.getByRole('heading', { name: 'Rank Trajectory Bump Chart' })).toBeInTheDocument();

    const periodPill = screen.getByTestId('bump-period-pill');
    expect(periodPill).toHaveTextContent('5');
    expect(periodPill).toHaveTextContent('Periods');

    const legendGroup = screen.getByRole('group', { name: 'Series trajectory legend' });
    const legendButtons = within(legendGroup).getAllByRole('button');
    expect(legendButtons).toHaveLength(5);
    expect(legendButtons[0]).toHaveAttribute('data-series-id', 'organic');
    expect(legendButtons[0]).toHaveAttribute('data-tone', 'primary');
    expect(legendButtons[1]).toHaveAttribute('data-tone', 'secondary');
    expect(legendButtons[2]).toHaveAttribute('data-tone', 'emerald');
    expect(legendButtons[3]).toHaveAttribute('data-tone', 'amber');
    expect(legendButtons[4]).toHaveAttribute('data-tone', 'rose');

    const svg = screen.getByRole('img', {
      name: 'Rank Trajectory Bump Chart rank trajectory bump chart across 5 periods and 5 series',
    });
    expect(svg).toHaveAttribute('viewBox', '0 0 480 240');
    expect(svg).toHaveClass('refractor-bump-chart__svg', 'w-full', 'h-auto', 'select-none');
    expect(svg.parentElement).toHaveClass('prism-well');
    expect(svg.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(svg.innerHTML).not.toMatch(/\b(?:rgba?|hsla?)\s*\(/);
    expect(svg.innerHTML).not.toContain('NaN');

    // Verify 5 vertical dashed period columns
    const periodCols = svg.querySelectorAll('g[data-period-column]');
    expect(periodCols).toHaveLength(5);
    expect(periodCols[0]?.querySelector('line')).toHaveAttribute('stroke-dasharray', '3 3');

    // Verify horizontal #1..#5 rank rails with #1 strictly at the top (smallest y)
    const rankRails = Array.from(svg.querySelectorAll('g[data-rank-rail]'));
    expect(rankRails).toHaveLength(5);
    const railYs = rankRails.map((rail) => Number(rail.querySelector('line')?.getAttribute('y1')));
    expect(railYs[0]).toBeLessThan(railYs[1]!);
    expect(railYs[1]).toBeLessThan(railYs[2]!);
    expect(railYs[2]).toBeLessThan(railYs[3]!);
    expect(railYs[3]).toBeLessThan(railYs[4]!);

    // Verify smooth cubic-Bezier S-curve paths (M x,y C midX,y1 midX,y2 x2,y2)
    const paths = Array.from(svg.querySelectorAll('path[data-series-path]'));
    expect(paths).toHaveLength(5);
    for (const path of paths) {
      const d = path.getAttribute('d') ?? '';
      expect(d).toMatch(/^M \d+(?:\.\d+)?,\d+(?:\.\d+)?(?: C \d+(?:\.\d+)?,\d+(?:\.\d+)? \d+(?:\.\d+)?,\d+(?:\.\d+)? \d+(?:\.\d+)?,\d+(?:\.\d+)?){4}$/);
      expect(path.getAttribute('stroke')).toMatch(/^var\(--prism-/);
    }

    // Verify 25 interactive numbered circular rank nodes (5 series × 5 periods)
    const nodes = svg.querySelectorAll('g[role="button"]');
    expect(nodes).toHaveLength(25);
    const organicQ1 = svg.querySelector('g[data-series-id="organic"][data-period-index="0"]')!;
    const organicQ4 = svg.querySelector('g[data-series-id="organic"][data-period-index="3"]')!;
    expect(organicQ1.querySelector('text')).toHaveTextContent('3');
    expect(organicQ4.querySelector('text')).toHaveTextContent('1');
    expect(organicQ1.querySelector('circle')).toHaveAttribute('fill', 'var(--prism-primary-main)');
    expect(organicQ1.querySelector('text')).toHaveAttribute('fill', 'var(--prism-primary-contrast)');

    // Rank #1 node sits strictly higher (smaller cy) than Rank #3 node
    const cyRank1 = Number(organicQ4.querySelector('circle')?.getAttribute('cy'));
    const cyRank3 = Number(organicQ1.querySelector('circle')?.getAttribute('cy'));
    expect(cyRank1).toBeLessThan(cyRank3);

    const inspector = screen.getByTestId('bump-inspector');
    expect(inspector).toHaveAttribute('aria-live', 'polite');
    expect(inspector).toHaveClass('prism-well');
    expect(inspector).toHaveTextContent(
      'Select or focus any rank node or series chip to inspect trajectory movement.'
    );
    expect(inspector).toHaveTextContent('5 series · 5 periods');
  });

  it('highlights focused/selected trajectory, dims siblings, formats net movement (+2 spots / -1 spot / -3 spots / Steady), and invokes onSelectSeries', () => {
    const onSelectSeries = vi.fn<(selection: BumpSelection) => void>();
    render(<BumpChart onSelectSeries={onSelectSeries} />);

    const svg = screen.getByRole('img');
    const inspector = screen.getByTestId('bump-inspector');

    const organicQ1Plus = svg.querySelector(
      'g[data-series-id="organic"][data-period-index="4"]'
    ) as SVGGElement;
    const partnerQ3 = svg.querySelector(
      'g[data-series-id="partner"][data-period-index="2"]'
    ) as SVGGElement;
    const paidQ1Plus = svg.querySelector(
      'g[data-series-id="paid-media"][data-period-index="4"]'
    ) as SVGGElement;
    const communityQ1Plus = svg.querySelector(
      'g[data-series-id="community"][data-period-index="4"]'
    ) as SVGGElement;

    // Focus highlights without firing onSelectSeries
    fireEvent.focus(partnerQ3);
    expect(onSelectSeries).not.toHaveBeenCalled();
    expect(partnerQ3).toHaveAttribute('data-highlighted', 'true');
    expect(organicQ1Plus).toHaveAttribute('data-dimmed', 'true');
    expect(svg.querySelector('path[data-series-path="partner"]')).toHaveAttribute(
      'data-highlighted',
      'true'
    );
    expect(svg.querySelector('path[data-series-path="organic"]')).toHaveAttribute(
      'data-dimmed',
      'true'
    );
    expect(inspector).toHaveTextContent('Partner Ecosystem');
    expect(inspector).toHaveTextContent('Q3');
    expect(inspector).toHaveTextContent('Rank #3');
    expect(inspector).toHaveTextContent('Net Movement');
    expect(inspector).toHaveTextContent('-1 spot');

    // Blurring an unfocused node does not clear the focused node
    fireEvent.blur(organicQ1Plus);
    expect(partnerQ3).toHaveAttribute('data-highlighted', 'true');

    // Blurring the focused node returns to idle state
    fireEvent.blur(partnerQ3);
    expect(inspector).toHaveTextContent(
      'Select or focus any rank node or series chip to inspect trajectory movement.'
    );

    // Clicking Organic Search Q1+ (+2 spots)
    fireEvent.click(organicQ1Plus);
    expect(onSelectSeries).toHaveBeenCalledTimes(1);
    expect(onSelectSeries).toHaveBeenLastCalledWith({
      seriesId: 'organic',
      label: 'Organic Search',
      periodIndex: 4,
      periodLabel: 'Q1+',
      rank: 1,
      netChange: 2,
    });
    expect(organicQ1Plus).toHaveAttribute('aria-pressed', 'true');
    expect(organicQ1Plus).toHaveAttribute('data-selected', 'true');
    expect(inspector).toHaveTextContent('Organic Search');
    expect(inspector).toHaveTextContent('Q1+');
    expect(inspector).toHaveTextContent('Rank #1');
    expect(inspector).toHaveTextContent('+2 spots');

    // Clicking Paid Media Q1+ (-3 spots)
    fireEvent.click(paidQ1Plus);
    expect(onSelectSeries).toHaveBeenLastCalledWith({
      seriesId: 'paid-media',
      label: 'Paid Media',
      periodIndex: 4,
      periodLabel: 'Q1+',
      rank: 5,
      netChange: -3,
    });
    expect(inspector).toHaveTextContent('-3 spots');

    // Clicking Developer Community Q1+ (Steady / 0 net change)
    fireEvent.click(communityQ1Plus);
    expect(onSelectSeries).toHaveBeenLastCalledWith({
      seriesId: 'community',
      label: 'Developer Community',
      periodIndex: 4,
      periodLabel: 'Q1+',
      rank: 4,
      netChange: 0,
    });
    expect(inspector).toHaveTextContent('Developer Community');
    expect(inspector).toHaveTextContent('Steady');
  });

  it('toggles interactive series legend chips to highlight trajectories across all periods and clears cleanly', () => {
    const onSelectSeries = vi.fn<(selection: BumpSelection) => void>();
    render(<BumpChart onSelectSeries={onSelectSeries} />);

    const legendGroup = screen.getByRole('group', { name: 'Series trajectory legend' });
    const productLedBtn = within(legendGroup).getByRole('button', { name: /Product-Led/i });
    const organicBtn = within(legendGroup).getByRole('button', { name: /Organic Search/i });
    const svg = screen.getByRole('img');
    const inspector = screen.getByTestId('bump-inspector');

    // Click Product-Led legend chip ON
    fireEvent.click(productLedBtn);
    expect(productLedBtn).toHaveAttribute('aria-pressed', 'true');
    expect(organicBtn).toHaveClass('opacity-45');
    expect(onSelectSeries).toHaveBeenCalledTimes(1);
    expect(onSelectSeries).toHaveBeenLastCalledWith({
      seriesId: 'product-led',
      label: 'Product-Led',
      periodIndex: 4,
      periodLabel: 'Q1+',
      rank: 3,
      netChange: 2,
    });

    const productLedNodes = Array.from(svg.querySelectorAll('g[data-series-id="product-led"]'));
    expect(productLedNodes).toHaveLength(5);
    for (const node of productLedNodes) {
      expect(node).toHaveAttribute('data-highlighted', 'true');
      expect(node).toHaveAttribute('data-dimmed', 'false');
    }
    expect(svg.querySelector('g[data-series-id="organic"]')).toHaveAttribute('data-dimmed', 'true');
    expect(inspector).toHaveTextContent('Product-Led');
    expect(inspector).toHaveTextContent('Q1+');
    expect(inspector).toHaveTextContent('Rank #3');
    expect(inspector).toHaveTextContent('+2 spots');

    // Clicking the same legend chip again toggles highlight OFF
    fireEvent.click(productLedBtn);
    expect(productLedBtn).toHaveAttribute('aria-pressed', 'false');
    expect(onSelectSeries).toHaveBeenCalledTimes(1);
    expect(inspector).toHaveTextContent(
      'Select or focus any rank node or series chip to inspect trajectory movement.'
    );

    // Clicking an SVG node then clicking its own legend chip toggles highlight OFF cleanly
    const organicQ2 = svg.querySelector('g[data-series-id="organic"][data-period-index="1"]')!;
    fireEvent.click(organicQ2);
    expect(organicBtn).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(organicBtn);
    expect(organicBtn).toHaveAttribute('aria-pressed', 'false');
    expect(inspector).toHaveTextContent(
      'Select or focus any rank node or series chip to inspect trajectory movement.'
    );
  });

  it('supports IME-safe Enter/Space activation and 2D ArrowLeft/ArrowRight/ArrowUp/ArrowDown keyboard navigation across crossovers', () => {
    const onSelectSeries = vi.fn<(selection: BumpSelection) => void>();
    render(<BumpChart onSelectSeries={onSelectSeries} />);

    const svg = screen.getByRole('img');
    // At Q3 (periodIndex=2), default visual rank order is:
    // #1 product-led, #2 organic, #3 partner, #4 paid-media, #5 community
    const prodQ3 = svg.querySelector('g[data-series-id="product-led"][data-period-index="2"]')!;
    const organicQ3 = svg.querySelector('g[data-series-id="organic"][data-period-index="2"]')!;
    const communityQ3 = svg.querySelector('g[data-series-id="community"][data-period-index="2"]')!;
    const organicQ1 = svg.querySelector('g[data-series-id="organic"][data-period-index="0"]')!;
    const organicQ4 = svg.querySelector('g[data-series-id="organic"][data-period-index="3"]')!;
    const organicQ1Plus = svg.querySelector('g[data-series-id="organic"][data-period-index="4"]')!;

    // IME composition must be ignored
    fireEvent.keyDown(organicQ3, { key: 'Enter', isComposing: true });
    fireEvent.keyDown(organicQ3, { key: 'ArrowRight', isComposing: true });
    expect(onSelectSeries).not.toHaveBeenCalled();

    // Unrelated keys must be ignored
    fireEvent.keyDown(organicQ3, { key: 'Tab' });
    expect(onSelectSeries).not.toHaveBeenCalled();

    // Enter activates organicQ3
    fireEvent.keyDown(organicQ3, { key: 'Enter' });
    expect(onSelectSeries).toHaveBeenLastCalledWith(
      expect.objectContaining({ seriesId: 'organic', periodIndex: 2, rank: 2 })
    );

    // Space activates prodQ3
    fireEvent.keyDown(prodQ3, { key: ' ' });
    expect(onSelectSeries).toHaveBeenLastCalledWith(
      expect.objectContaining({ seriesId: 'product-led', periodIndex: 2, rank: 1 })
    );

    // ArrowRight moves horizontally along Organic Search trajectory: Q3 -> Q4
    fireEvent.keyDown(organicQ3, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(organicQ4);
    expect(onSelectSeries).toHaveBeenLastCalledWith(
      expect.objectContaining({ seriesId: 'organic', periodIndex: 3, periodLabel: 'Q4', rank: 1 })
    );

    // ArrowRight wraps from last period (Q1+) back to Q1
    fireEvent.keyDown(organicQ1Plus, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(organicQ1);
    expect(onSelectSeries).toHaveBeenLastCalledWith(
      expect.objectContaining({ seriesId: 'organic', periodIndex: 0, periodLabel: 'Q1', rank: 3 })
    );

    // ArrowLeft wraps from Q1 back to Q1+
    fireEvent.keyDown(organicQ1, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(organicQ1Plus);

    // ArrowDown at Q3 from #1 product-led moves to visual #2 organic
    fireEvent.keyDown(prodQ3, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(organicQ3);
    expect(onSelectSeries).toHaveBeenLastCalledWith(
      expect.objectContaining({ seriesId: 'organic', periodIndex: 2, rank: 2 })
    );

    // ArrowUp at Q3 from #1 product-led wraps to visual #5 community
    fireEvent.keyDown(prodQ3, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(communityQ3);
    expect(onSelectSeries).toHaveBeenLastCalledWith(
      expect.objectContaining({ seriesId: 'community', periodIndex: 2, rank: 5 })
    );

    // ArrowDown at Q3 from #5 community wraps to visual #1 product-led
    fireEvent.keyDown(communityQ3, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(prodQ3);
  });

  it('supports all 6 tones with auto-cycling, +1 spot formatting, >6-rank scaling, sparse/single-node/tied/fractional ranks, long period labels, duplicate keys, and stale selection cleanup', () => {
    const sevenSeries: BumpSeriesItem[] = [
      { id: 's1', label: 'Alpha', ranks: [2, 1] }, // auto primary, +1 spot
      { id: 's2', label: 'Beta', ranks: [1, 2] }, // auto secondary, -1 spot
      { id: 's3', label: 'Gamma', ranks: [3.4, 3.6] }, // auto emerald, fractional -> [3, 4], -1 spot
      { id: 's4', label: 'Delta', ranks: [4, 4] }, // auto amber, Steady
      { id: 's5', label: 'Epsilon', ranks: [5, 5] }, // auto rose, Steady
      { id: 's6', label: 'Zeta', ranks: [6, 6] }, // auto info, Steady
      { id: 's6', label: '   ', ranks: [7, Number.NaN] }, // duplicate id, blank label, auto wrap primary, 1 valid node
      { id: 's8', label: 'Tied At Seven', ranks: [7, 7], tone: 'info' }, // tied rank 7 at period 0
    ];

    const { rerender } = render(
      <BumpChart
        periods={[
          'Fiscal Year 2026 Extended Quarter One Label',
          'Fiscal Year 2026 Extended Quarter One Label',
          '   ',
        ]}
        series={sevenSeries}
      />
    );

    const svg = screen.getByRole('img');
    expect(svg.innerHTML).not.toContain('NaN');
    expect(svg.textContent).toContain('…');

    // Verify all 6 semantic tones cycle and wrap cleanly
    const legendButtons = within(
      screen.getByRole('group', { name: 'Series trajectory legend' })
    ).getAllByRole('button');
    expect(legendButtons).toHaveLength(8);
    expect(legendButtons[0]).toHaveAttribute('data-tone', 'primary');
    expect(legendButtons[1]).toHaveAttribute('data-tone', 'secondary');
    expect(legendButtons[2]).toHaveAttribute('data-tone', 'emerald');
    expect(legendButtons[3]).toHaveAttribute('data-tone', 'amber');
    expect(legendButtons[4]).toHaveAttribute('data-tone', 'rose');
    expect(legendButtons[5]).toHaveAttribute('data-tone', 'info');
    expect(legendButtons[6]).toHaveAttribute('data-tone', 'primary');
    expect(legendButtons[7]).toHaveAttribute('data-tone', 'info');

    // Info tone uses --prism-info-main & --prism-info-contrast
    const infoNode = svg.querySelector('g[data-series-id="s8"][data-period-index="0"]')!;
    expect(infoNode.querySelector('circle')).toHaveAttribute('fill', 'var(--prism-info-main)');
    expect(infoNode.querySelector('text')).toHaveAttribute('fill', 'var(--prism-info-contrast)');

    // Compact radius scaling when maxRank > 6
    const compactRadius = Number(infoNode.querySelector('circle')?.getAttribute('r'));
    expect(compactRadius).toBeLessThanOrEqual(10);
    expect(compactRadius).toBeGreaterThanOrEqual(6.5);

    // Singular "+1 spot" movement on Alpha
    const alphaEnd = svg.querySelector('g[data-series-id="s1"][data-period-index="1"]')!;
    fireEvent.click(alphaEnd);
    expect(screen.getByTestId('bump-inspector')).toHaveTextContent('+1 spot');

    // Highlight single-node series (no curve path) via legend chip
    fireEvent.click(legendButtons[6]!);
    expect(screen.getByTestId('bump-inspector')).toHaveTextContent('s6');
    expect(screen.getByTestId('bump-inspector')).toHaveTextContent('Steady');

    // Focus + select a node then rerender to a single-rank chart -> stale cleanup + maxRank === 1 centered rail
    fireEvent.focus(alphaEnd);
    fireEvent.click(alphaEnd);
    rerender(
      <BumpChart
        periods={['Start', 'End']}
        series={[{ id: 'solo', label: 'Solo', ranks: [1, 1], tone: 'info' }]}
      />
    );

    const soloSvg = screen.getByRole('img');
    expect(soloSvg.querySelectorAll('g[data-rank-rail]')).toHaveLength(1);
    const soloRailY = Number(
      soloSvg.querySelector('g[data-rank-rail="1"] line')?.getAttribute('y1')
    );
    expect(soloRailY).toBeCloseTo(130, 1);
    expect(screen.getByTestId('bump-inspector')).toHaveTextContent(
      'Select or focus any rank node or series chip to inspect trajectory movement.'
    );

    // Activate Solo legend chip, then rerender to another series -> resets activeLegend cleanly
    const soloLegendBtn = within(
      screen.getByRole('group', { name: 'Series trajectory legend' })
    ).getByRole('button', { name: /Solo/i });
    fireEvent.click(soloLegendBtn);
    expect(screen.getByTestId('bump-inspector')).toHaveTextContent('Solo');

    rerender(
      <BumpChart
        periods={['P1', 'P2']}
        series={[{ id: 'fresh', label: 'Fresh', ranks: [1, 1], tone: 'emerald' }]}
      />
    );
    expect(screen.getByTestId('bump-inspector')).toHaveTextContent(
      'Select or focus any rank node or series chip to inspect trajectory movement.'
    );
  });

  it('renders clean role="status" empty state for <2 periods, empty series, or invalid ranks and neutralizes XSS payloads', () => {
    const { rerender } = render(<BumpChart periods={['OnlyOne']} data-testid="empty-bump" />);
    expect(screen.getByTestId('empty-bump')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByRole('status')).toHaveTextContent(
      'Provide at least 2 periods and 1 ranked series to plot trajectories.'
    );
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.queryByTestId('bump-period-pill')).toBeNull();
    expect(screen.queryByTestId('bump-inspector')).toBeNull();

    // Empty series array also triggers empty state
    rerender(<BumpChart periods={['Q1', 'Q2']} series={[]} data-testid="empty-bump" />);
    expect(screen.getByTestId('empty-bump')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByRole('status')).toBeInTheDocument();

    // Series containing only invalid / non-positive / non-finite ranks triggers empty state
    rerender(
      <BumpChart
        data-testid="empty-bump"
        periods={['Q1', 'Q2', 'Q3']}
        series={[
          { id: 'invalid-1', label: 'Bad', ranks: [0, -2, Number.NaN] },
          { id: 'invalid-2', label: 'Inf', ranks: [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY] },
        ]}
      />
    );
    expect(screen.getByTestId('empty-bump')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByRole('status')).toBeInTheDocument();

    // XSS payload strings are rendered strictly as text with zero script execution
    const payload = '<script>window.__bumpXss=1</script><img src=x onerror=alert(1)>';
    rerender(
      <BumpChart
        title={payload}
        periods={[payload, `${payload}-2`]}
        series={[{ id: 'xss', label: payload, ranks: [1, 2], tone: 'primary' }]}
      />
    );
    expect(screen.getByRole('heading', { name: payload })).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
    expect(screen.getByRole('img').querySelectorAll('g[role="button"]')).toHaveLength(2);
  });
});
