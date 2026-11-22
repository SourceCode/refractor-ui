import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  DEFAULT_SLOPEGRAPH_ITEMS,
  SlopegraphChart,
  type SlopeSeriesItem,
  type SlopeSeriesSelection,
  type SlopeToneMap,
} from './index';

describe('SlopegraphChart', () => {
  it('renders 6 default Q1 vs Q4 adoption metrics, filter pills, net avg badge, dual-axis SVG, ref, theme overrides, and semantic tokens only', () => {
    const ref = createRef<HTMLDivElement>();
    const toneKeys: Array<keyof SlopeToneMap> = [
      'primary',
      'secondary',
      'emerald',
      'amber',
      'rose',
      'info',
    ];
    expect(toneKeys).toHaveLength(6);
    expect(DEFAULT_SLOPEGRAPH_ITEMS).toHaveLength(6);

    render(
      <PrismThemeProvider
        theme={{
          components: {
            SlopegraphChart: {
              className: 'theme-slopegraph',
              style: { maxWidth: '680px' },
            },
          },
        }}
      >
        <SlopegraphChart
          ref={ref}
          className="consumer-slopegraph"
          xstyle={{ '--prism-blur-px': '14px' }}
          data-testid="slope-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('slope-root');
    expect(ref.current).toBe(root);
    expect(SlopegraphChart.displayName).toBe('SlopegraphChart');
    expect(root).toHaveClass(
      'refractor-slopegraph-chart',
      'prism-slab',
      'theme-slopegraph',
      'consumer-slopegraph',
      'w-full',
      'max-w-full',
      'min-w-0'
    );
    expect(root).toHaveStyle({ maxWidth: '680px' });
    expect(root).toHaveAttribute('data-filter', 'all');
    expect(root).toHaveAttribute('data-series-count', '6');
    expect(root).not.toHaveAttribute('data-empty');
    expect(root).not.toHaveAttribute('data-has-selection');

    expect(
      screen.getByRole('region', { name: 'Before / After Slopegraph' })
    ).toBe(root);
    expect(
      screen.getByRole('heading', { name: 'Before / After Slopegraph' })
    ).toBeInTheDocument();

    // Net average change badge: (48 + 22 + 14 + 17 - 32 - 22) / 6 = +7.8%
    const avgBadge = screen.getByTestId('slopegraph-avg-badge');
    expect(avgBadge).toHaveTextContent('Net Avg +7.8%');
    expect(avgBadge).toHaveClass('prism-emerald');
    expect(avgBadge).toHaveAttribute('data-avg-tone', 'positive');

    // Direction filter pills
    expect(screen.getByTestId('slopegraph-direction-filters')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^All\s*6$/ })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: /^Rising Only\s*4$/ })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(screen.getByRole('button', { name: /^Declining Only\s*2$/ })).toHaveAttribute(
      'aria-pressed',
      'false'
    );

    // Responsive 460x250 dual-axis SVG inside recessed prism-well
    const svg = screen.getByRole('img', {
      name: 'Before / After Slopegraph comparing Q1 2026 and Q4 2026 across 6 series',
    });
    expect(svg).toHaveAttribute('viewBox', '0 0 460 250');
    expect(svg).toHaveClass('w-full', 'h-auto', 'select-none');
    expect(svg.parentElement).toHaveClass('prism-well');

    expect(svg.querySelector('[data-role="start-axis-label"]')).toHaveTextContent('Q1 2026');
    expect(svg.querySelector('[data-role="end-axis-label"]')).toHaveTextContent('Q4 2026');
    expect(svg.querySelector('[data-role="start-axis-rail"]')).toBeInTheDocument();
    expect(svg.querySelector('[data-role="end-axis-rail"]')).toBeInTheDocument();
    expect(svg.querySelectorAll('[data-role="slope-series"]')).toHaveLength(6);

    // Strictly --prism-* CSS custom properties, zero raw color literals, zero NaN
    expect(root.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(root.innerHTML).not.toMatch(/\b(?:rgba?|hsla?)\s*\(/i);
    expect(svg.innerHTML).toContain('var(--prism-success-main)');
    expect(svg.innerHTML).toContain('var(--prism-error-main)');
    expect(svg.innerHTML).toContain('var(--prism-divider)');
    expect(svg.innerHTML).not.toContain('NaN');

    // Recessed aria-live="polite" readout default guidance
    const readout = screen.getByTestId('slopegraph-readout');
    expect(readout).toHaveClass('prism-well');
    expect(readout).toHaveAttribute('aria-live', 'polite');
    expect(readout).toHaveTextContent('6 series');
  });

  it('highlights clicked series, softly dims siblings, emits SlopeSeriesSelection, and populates the live readout', () => {
    const selections: SlopeSeriesSelection[] = [];
    const onSelectItem = vi.fn((selection: SlopeSeriesSelection) => {
      selections.push(selection);
    });

    render(<SlopegraphChart title="Adoption Shift" onSelectItem={onSelectItem} />);

    const copilot = screen.getByRole('button', { name: /AI Copilot: 28% to 76%/ });
    const legacy = screen.getByRole('button', { name: /Legacy Export: 71% to 39%/ });
    const mobile = screen.getByRole('button', { name: /Mobile Sync: 54% to 68%/ });

    fireEvent.click(copilot);

    expect(onSelectItem).toHaveBeenCalledTimes(1);
    expect(selections[0]).toEqual({
      id: 'ai-copilot',
      label: 'AI Copilot',
      startValue: 28,
      endValue: 76,
      delta: 48,
      deltaPct: 171.4,
      startRank: 6,
      endRank: 2,
    });

    expect(copilot).toHaveAttribute('aria-pressed', 'true');
    expect(copilot).toHaveAttribute('data-selected', 'true');
    expect(copilot).toHaveAttribute('data-active', 'true');
    expect(copilot).toHaveAttribute('data-dimmed', 'false');
    expect(copilot.querySelector('[data-role="slope-line"]')).toHaveAttribute('stroke-width', '3');
    expect(copilot.querySelector('[data-role="slope-line"]')).toHaveAttribute('stroke-opacity', '1');
    expect(copilot.querySelector('[data-role="slope-start-dot"]')).toHaveAttribute('r', '4.5');

    // Sibling softly dimmed
    expect(legacy).toHaveAttribute('aria-pressed', 'false');
    expect(legacy).toHaveAttribute('data-active', 'false');
    expect(legacy).toHaveAttribute('data-dimmed', 'true');
    expect(legacy.querySelector('[data-role="slope-line"]')).toHaveAttribute('stroke-width', '1.25');
    expect(legacy.querySelector('[data-role="slope-line"]')).toHaveAttribute('stroke-opacity', '0.2');
    expect(legacy.querySelector('[data-role="slope-start-dot"]')).toHaveAttribute('r', '3.2');

    // Live readout contents
    expect(screen.getByTestId('slopegraph-readout-series')).toHaveTextContent('AI Copilot');
    expect(screen.getByTestId('slopegraph-readout-range')).toHaveTextContent('28% → 76%');
    expect(screen.getByTestId('slopegraph-readout-delta')).toHaveTextContent('+48%');
    expect(screen.getByTestId('slopegraph-readout-pct')).toHaveTextContent('+171.4%');
    expect(screen.getByTestId('slopegraph-readout-rank')).toHaveTextContent('Rank #6 → #2 (+4)');

    // Click declining series
    fireEvent.click(legacy);
    expect(selections[1]).toEqual({
      id: 'legacy-export',
      label: 'Legacy Export',
      startValue: 71,
      endValue: 39,
      delta: -32,
      deltaPct: -45.1,
      startRank: 1,
      endRank: 5,
    });
    expect(screen.getByTestId('slopegraph-readout-series')).toHaveTextContent('Legacy Export');
    expect(screen.getByTestId('slopegraph-readout-range')).toHaveTextContent('71% → 39%');
    expect(screen.getByTestId('slopegraph-readout-delta')).toHaveTextContent('-32%');
    expect(screen.getByTestId('slopegraph-readout-pct')).toHaveTextContent('-45.1%');
    expect(screen.getByTestId('slopegraph-readout-rank')).toHaveTextContent('Rank #1 → #5 (-4)');

    // Click unchanged-rank series (#3 -> #3)
    fireEvent.click(mobile);
    expect(screen.getByTestId('slopegraph-readout-rank')).toHaveTextContent('Rank #3 → #3');
  });

  it('supports focus/blur preview, IME-safe Enter/Space, ArrowUp/ArrowDown wrap-around navigation, and Escape clear', () => {
    const onSelectItem = vi.fn();
    render(<SlopegraphChart onSelectItem={onSelectItem} />);

    const copilot = screen.getByRole('button', { name: /AI Copilot/ });
    const sso = screen.getByRole('button', { name: /SSO Enforced/ });
    const audit = screen.getByRole('button', { name: /Manual Audit/ });

    // Focus previews without firing onSelectItem
    fireEvent.focus(sso);
    expect(sso).toHaveAttribute('data-active', 'true');
    expect(screen.getByTestId('slopegraph-readout-series')).toHaveTextContent('SSO Enforced');
    expect(onSelectItem).not.toHaveBeenCalled();

    // Blur previous after focusing another preserves active focus
    fireEvent.focus(copilot);
    fireEvent.blur(sso);
    expect(screen.getByTestId('slopegraph-readout-series')).toHaveTextContent('AI Copilot');

    // Blur active focused returns to idle
    fireEvent.blur(copilot);
    expect(screen.queryByTestId('slopegraph-readout-series')).toBeNull();

    // IME composition must be ignored
    fireEvent.keyDown(copilot, { key: 'Enter', isComposing: true });
    fireEvent.keyDown(copilot, { key: 'ArrowDown', isComposing: true });
    expect(onSelectItem).not.toHaveBeenCalled();

    // Unhandled key ignored
    fireEvent.keyDown(copilot, { key: 'Tab' });
    expect(onSelectItem).not.toHaveBeenCalled();

    // Enter activates AI Copilot
    fireEvent.keyDown(copilot, { key: 'Enter' });
    expect(onSelectItem).toHaveBeenCalledTimes(1);
    expect(copilot).toHaveAttribute('data-selected', 'true');

    // ArrowDown moves 0 -> 1 (SSO Enforced) and shifts focus
    fireEvent.keyDown(copilot, { key: 'ArrowDown' });
    expect(onSelectItem).toHaveBeenCalledTimes(2);
    expect(sso).toHaveAttribute('data-selected', 'true');
    expect(document.activeElement).toBe(sso);

    // ArrowUp moves 1 -> 0 (AI Copilot)
    fireEvent.keyDown(sso, { key: 'ArrowUp' });
    expect(onSelectItem).toHaveBeenCalledTimes(3);
    expect(copilot).toHaveAttribute('data-selected', 'true');
    expect(document.activeElement).toBe(copilot);

    // ArrowUp wraps 0 -> last (Manual Audit)
    fireEvent.keyDown(copilot, { key: 'ArrowUp' });
    expect(onSelectItem).toHaveBeenCalledTimes(4);
    expect(audit).toHaveAttribute('data-selected', 'true');
    expect(document.activeElement).toBe(audit);

    // ArrowDown wraps last -> 0 (AI Copilot)
    fireEvent.keyDown(audit, { key: 'ArrowDown' });
    expect(onSelectItem).toHaveBeenCalledTimes(5);
    expect(copilot).toHaveAttribute('data-selected', 'true');

    // Space activates SSO Enforced
    fireEvent.keyDown(sso, { key: ' ' });
    expect(onSelectItem).toHaveBeenCalledTimes(6);
    expect(sso).toHaveAttribute('data-selected', 'true');

    // Escape clears selection
    fireEvent.keyDown(sso, { key: 'Escape' });
    expect(sso).toHaveAttribute('data-selected', 'false');
    expect(screen.queryByTestId('slopegraph-readout-series')).toBeNull();
  });

  it('filters via Rising Only / Declining Only / All pills, renders context ghost lines, and handles empty filter matches', () => {
    const { rerender } = render(<SlopegraphChart data-testid="filter-slope" />);
    const root = screen.getByTestId('filter-slope');

    // Select a series, then filter to Declining Only
    fireEvent.click(screen.getByRole('button', { name: /AI Copilot/ }));
    expect(screen.getByTestId('slopegraph-readout-series')).toHaveTextContent('AI Copilot');

    const decliningPill = screen.getByRole('button', { name: /^Declining Only\s*2$/ });
    fireEvent.click(decliningPill);

    expect(root).toHaveAttribute('data-filter', 'declining');
    expect(root).toHaveAttribute('data-series-count', '2');
    expect(decliningPill).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByTestId('slopegraph-readout-series')).toBeNull();
    expect(screen.getByTestId('slopegraph-readout')).toHaveTextContent('2/6 series');

    // Net average for declining: (-32 + -22) / 2 = -27%
    const avgBadge = screen.getByTestId('slopegraph-avg-badge');
    expect(avgBadge).toHaveTextContent('Net Avg -27%');
    expect(avgBadge).toHaveAttribute('data-avg-tone', 'negative');
    expect(avgBadge.style.color).toBe('var(--prism-error-main)');

    const svg = screen.getByRole('img');
    expect(svg.querySelectorAll('[data-role="slope-series"]')).toHaveLength(2);
    expect(svg.querySelectorAll('[data-role="filtered-context-line"]')).toHaveLength(4);

    // Filter to Rising Only (4 visible, 2 context lines)
    fireEvent.click(screen.getByRole('button', { name: /^Rising Only\s*4$/ }));
    expect(root).toHaveAttribute('data-filter', 'rising');
    expect(svg.querySelectorAll('[data-role="slope-series"]')).toHaveLength(4);
    expect(svg.querySelectorAll('[data-role="filtered-context-line"]')).toHaveLength(2);
    expect(screen.getByTestId('slopegraph-avg-badge')).toHaveTextContent('Net Avg +25.3%');

    // Return to All
    fireEvent.click(screen.getByRole('button', { name: /^All\s*6$/ }));
    expect(root).toHaveAttribute('data-filter', 'all');
    expect(svg.querySelectorAll('[data-role="slope-series"]')).toHaveLength(6);
    expect(svg.querySelectorAll('[data-role="filtered-context-line"]')).toHaveLength(0);

    // Select & focus a series, then rerender with all-declining data so Rising Only yields empty filter status
    const copilot = screen.getByRole('button', { name: /AI Copilot/ });
    fireEvent.click(copilot);
    fireEvent.focus(copilot);
    rerender(
      <SlopegraphChart
        data-testid="filter-slope"
        items={[
          { id: 'd1', label: 'Drop A', startValue: 80, endValue: 60 },
          { id: 'd2', label: 'Drop B', startValue: 50, endValue: 30 },
        ]}
      />
    );
    expect(screen.queryByTestId('slopegraph-readout-series')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /^Rising Only\s*0$/ }));
    expect(screen.getByTestId('slopegraph-filter-empty')).toHaveTextContent(
      'No rising series match the current filter.'
    );
    expect(screen.getByTestId('slopegraph-avg-badge')).toHaveTextContent('Net Avg —');
    expect(screen.getByTestId('slopegraph-avg-badge')).toHaveAttribute('data-avg-tone', 'neutral');

    // Rerender with all-rising data and click Declining Only -> filtered empty notice
    rerender(
      <SlopegraphChart
        data-testid="filter-slope"
        items={[{ id: 'r1', label: 'Rise Only', startValue: 20, endValue: 50 }]}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /^Declining Only\s*0$/ }));
    expect(screen.getByTestId('slopegraph-filter-empty')).toHaveTextContent(
      'No declining series match the current filter.'
    );
  });

  it('supports all 6 explicit SlopeTone overrides, flat lines, zero baselines (deltaPct: null), ties, constant domains, empty unit, and truncation', () => {
    const onSelectItem = vi.fn();
    const customItems: SlopeSeriesItem[] = [
      { id: 't-primary', label: 'Primary Series', startValue: 10.25, endValue: 35.75, tone: 'primary' },
      { id: 't-secondary', label: 'Secondary Series', startValue: 40, endValue: 40, tone: 'secondary' },
      { id: 't-emerald', label: 'Emerald Metric', startValue: 0, endValue: 25, tone: 'emerald' },
      { id: 't-amber', label: 'Amber Very Long Series Name', startValue: 40, endValue: 20, tone: 'amber' },
      { id: 't-rose', label: 'Rose Metric', startValue: 50, endValue: 45, tone: 'rose' },
      { id: 't-info', label: 'Info Metric', startValue: 30, endValue: 40, tone: 'info' },
      { id: 'flat-default', label: 'Unchanged Base', startValue: 20, endValue: 20 },
    ];

    const { rerender } = render(
      <SlopegraphChart
        items={customItems}
        startLabel="Baseline Quarter 2025"
        endLabel="Post Launch Quarter 2026"
        unit=""
        onSelectItem={onSelectItem}
      />
    );

    const svg = screen.getByRole('img');
    expect(svg.innerHTML).toContain('var(--prism-primary-main)');
    expect(svg.innerHTML).toContain('var(--prism-secondary-main)');
    expect(svg.innerHTML).toContain('var(--prism-success-main)');
    expect(svg.innerHTML).toContain('var(--prism-warning-main)');
    expect(svg.innerHTML).toContain('var(--prism-error-main)');
    expect(svg.innerHTML).toContain('var(--prism-info-main)');
    expect(svg.innerHTML).toContain('var(--prism-text-secondary)');
    expect(svg.textContent).toContain('…');

    // Click zero-baseline item -> deltaPct is null, readout displays 'N/A', tone preserved
    fireEvent.click(screen.getByRole('button', { name: /Emerald Metric: 0 to 25/ }));
    expect(onSelectItem).toHaveBeenLastCalledWith(
      expect.objectContaining({
        id: 't-emerald',
        tone: 'emerald',
        delta: 25,
        deltaPct: null,
      })
    );
    expect(screen.getByTestId('slopegraph-readout-pct')).toHaveTextContent('N/A');
    expect(screen.getByTestId('slopegraph-readout-range')).toHaveTextContent('0 → 25');

    // Click flat default item -> delta 0, deltaPct 0%, tie-aware competition ranks
    const flatBtn = screen.getByRole('button', { name: /Unchanged Base: 20 to 20/ });
    expect(flatBtn).toHaveAttribute('data-direction', 'flat');
    fireEvent.click(flatBtn);
    expect(screen.getByTestId('slopegraph-readout-delta')).toHaveTextContent('0');
    expect(screen.getByTestId('slopegraph-readout-pct')).toHaveTextContent('0%');

    // Click primary fractional item -> preserves decimal formatting
    fireEvent.click(screen.getByRole('button', { name: /Primary Series: 10\.25 to 35\.75/ }));
    expect(screen.getByTestId('slopegraph-readout-delta')).toHaveTextContent('+25.5');

    // Tied top startValue (40, 40) share competition rank #2 behind 50 (#1)
    fireEvent.click(screen.getByRole('button', { name: /Secondary Series: 40 to 40/ }));
    expect(onSelectItem).toHaveBeenLastCalledWith(
      expect.objectContaining({
        startRank: 2,
      })
    );

    // Constant non-zero domain + single item
    rerender(
      <SlopegraphChart items={[{ id: 'const', label: 'Constant', startValue: 50, endValue: 50 }]} />
    );
    expect(screen.getByRole('img').innerHTML).not.toContain('NaN');
    expect(screen.getByTestId('slopegraph-avg-badge')).toHaveTextContent('Net Avg 0%');
    expect(screen.getByTestId('slopegraph-avg-badge')).toHaveAttribute('data-avg-tone', 'neutral');

    // Constant all-zero domain with negative zero normalization
    rerender(
      <SlopegraphChart items={[{ id: 'zero', label: 'Signed Zero', startValue: -0, endValue: -0 }]} />
    );
    expect(screen.getByRole('img').innerHTML).not.toContain('NaN');
    expect(screen.getByRole('img').textContent).not.toContain('-0%');
  });

  it('prevents label overlap at top, middle, and bottom rail clusters and renders leader ticks', () => {
    const clusteredItems: SlopeSeriesItem[] = [
      { id: 'top-1', label: 'Top A', startValue: 100, endValue: 0 },
      { id: 'top-2', label: 'Top B', startValue: 99.8, endValue: 0.2 },
      { id: 'top-3', label: 'Top C', startValue: 99.6, endValue: 0.4 },
      { id: 'bot-1', label: 'Bottom A', startValue: 0, endValue: 100 },
      { id: 'bot-2', label: 'Bottom B', startValue: 0.2, endValue: 99.8 },
      { id: 'bot-3', label: 'Bottom C', startValue: 0.4, endValue: 99.6 },
    ];

    render(<SlopegraphChart items={clusteredItems} />);

    const svg = screen.getByRole('img');
    const leftYs = Array.from(svg.querySelectorAll('[data-role="slope-left-label"]'))
      .map((node) => Number(node.getAttribute('y')))
      .sort((a, b) => a - b);
    const rightYs = Array.from(svg.querySelectorAll('[data-role="slope-right-label"]'))
      .map((node) => Number(node.getAttribute('y')))
      .sort((a, b) => a - b);

    expect(leftYs[0]).toBeGreaterThanOrEqual(42);
    expect(leftYs[leftYs.length - 1]).toBeLessThanOrEqual(232);
    expect(rightYs[0]).toBeGreaterThanOrEqual(42);
    expect(rightYs[rightYs.length - 1]).toBeLessThanOrEqual(232);

    for (let i = 1; i < leftYs.length; i += 1) {
      expect(leftYs[i]! - leftYs[i - 1]!).toBeGreaterThanOrEqual(13.99);
      expect(rightYs[i]! - rightYs[i - 1]!).toBeGreaterThanOrEqual(13.99);
    }

    // Displaced labels render subtle leader lines
    expect(svg.querySelectorAll('[data-role="slope-left-leader"]').length).toBeGreaterThan(0);
    expect(svg.querySelectorAll('[data-role="slope-right-leader"]').length).toBeGreaterThan(0);

    // Selecting a clustered series updates active/dimmed leader opacity cleanly
    fireEvent.click(screen.getByRole('button', { name: /Top C/ }));
    expect(screen.getByTestId('slopegraph-readout-series')).toHaveTextContent('Top C');
  });

  it('renders clean role="status" empty states, filters non-finite entries, and resists prototype pollution and XSS', () => {
    const { rerender } = render(<SlopegraphChart items={[]} data-testid="empty-slope" />);

    expect(screen.getByTestId('empty-slope')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByTestId('slopegraph-empty')).toHaveAttribute('role', 'status');
    expect(screen.getByTestId('slopegraph-empty')).toHaveTextContent(
      'No slopegraph series to display.'
    );
    expect(screen.queryByTestId('slopegraph-direction-filters')).toBeNull();
    expect(screen.queryByTestId('slopegraph-avg-badge')).toBeNull();
    expect(screen.queryByTestId('slopegraph-readout')).toBeNull();

    // Non-finite-only dataset renders clean status empty state
    rerender(
      <SlopegraphChart
        data-testid="empty-slope"
        items={[
          { id: 'nan', label: 'NaN Row', startValue: Number.NaN, endValue: 50 },
          {
            id: 'inf',
            label: 'Inf Row',
            startValue: 10,
            endValue: Number.POSITIVE_INFINITY,
          },
        ]}
      />
    );
    expect(screen.getByTestId('empty-slope')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('No slopegraph series to display.');

    // Mixed valid + non-finite + prototype-polluting keys + XSS payload
    const xssPayload = '<script>window.__slopeXss=1</script><img src=x onerror=alert(1)>';
    rerender(
      <SlopegraphChart
        title={xssPayload}
        startLabel={xssPayload}
        endLabel={xssPayload}
        unit="%"
        items={[
          { id: 'bad', label: 'Ignored', startValue: Number.NEGATIVE_INFINITY, endValue: 20 },
          { id: '__proto__', label: xssPayload, startValue: 15, endValue: 45 },
          { id: 'constructor', label: 'Safe', startValue: 60, endValue: 30 },
        ]}
      />
    );

    expect(screen.getByRole('heading', { name: xssPayload })).toBeInTheDocument();
    expect(screen.getByRole('img').querySelectorAll('[data-role="slope-series"]')).toHaveLength(2);
    expect(screen.getByRole('img').innerHTML).not.toContain('NaN');
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(({} as Record<string, string>)['__proto__']).not.toBe('polluted');
  });
});
