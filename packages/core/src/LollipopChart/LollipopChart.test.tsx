import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  DEFAULT_LOLLIPOP_DATA,
  LollipopChart,
  type LollipopDatum,
  type LollipopOrientationMap,
} from './index';

describe('LollipopChart', () => {
  it('renders default 7 ranked items, low-ink SVG geometry, auto-average line, theme overrides, ref, and zero raw colors', () => {
    const ref = createRef<HTMLDivElement>();
    const orientationKeys: Array<keyof LollipopOrientationMap> = ['horizontal', 'vertical'];
    expect(orientationKeys).toHaveLength(2);
    expect(DEFAULT_LOLLIPOP_DATA).toHaveLength(7);

    render(
      <PrismThemeProvider
        theme={{
          components: {
            LollipopChart: { className: 'theme-lollipop', style: { maxWidth: '640px' } },
          },
        }}
      >
        <LollipopChart
          ref={ref}
          className="consumer-lollipop"
          xstyle={{ '--prism-blur-px': '18px' }}
          style={{ minWidth: '280px' }}
          data-testid="lollipop-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('lollipop-root');
    expect(ref.current).toBe(root);
    expect(LollipopChart.displayName).toBe('LollipopChart');
    expect(root).toHaveClass(
      'refractor-lollipop-chart',
      'prism-slab',
      'theme-lollipop',
      'consumer-lollipop'
    );
    expect(root).toHaveStyle({ maxWidth: '640px', minWidth: '280px' });
    expect(root).toHaveAttribute('data-orientation', 'horizontal');
    expect(root).toHaveAttribute('data-sort-by', 'value-desc');
    expect(root).toHaveAttribute('data-reference', 'true');
    expect(root).not.toHaveAttribute('data-empty');

    // Region & heading linkage
    expect(screen.getByRole('region', { name: 'Low-Ink Lollipop Ranking' })).toBe(root);
    expect(
      screen.getByRole('heading', { name: 'Low-Ink Lollipop Ranking' })
    ).toBeInTheDocument();

    // Header pill states
    expect(screen.getByRole('button', { name: 'Horizontal' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Vertical' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'High→Low' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Low→High' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'A→Z' })).toHaveAttribute('aria-pressed', 'false');

    // SVG contract: viewBox 0 0 460 230, responsive class, thin stems (2.5), sculpted terminal circles (6.5)
    const svg = screen.getByTestId('lollipop-svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 460 230');
    expect(svg).toHaveClass('refractor-lollipop-chart__svg', 'w-full', 'h-auto', 'select-none');

    const stemsGroup = screen.getByTestId('lollipop-stems');
    const stems = within(stemsGroup).getAllByRole('button');
    expect(stems).toHaveLength(7);
    expect(stems[0]).toHaveAttribute('data-item-id', 'ai-copilot');
    expect(stems[0]).toHaveAttribute('data-rank', '1');
    expect(stems[6]).toHaveAttribute('data-item-id', 'api-webhooks');
    expect(stems[6]).toHaveAttribute('data-rank', '7');

    const firstLine = screen.getByTestId('lollipop-line-ai-copilot');
    expect(firstLine).toHaveAttribute('stroke-width', '2.5');
    expect(firstLine.getAttribute('y1')).toBe(firstLine.getAttribute('y2'));

    const firstNode = screen.getByTestId('lollipop-node-ai-copilot');
    expect(firstNode).toHaveAttribute('r', '6.5');

    // Auto-computed average line: (84.2+71.6+63.4+52.8+44.1+36.5+27.9)/7 = 54.357 -> 54.4k
    expect(screen.getByTestId('lollipop-reference-line')).toBeInTheDocument();
    expect(screen.getByTestId('lollipop-reference-label')).toHaveTextContent('Avg 54.4k');

    // Zero raw hex/rgb/hsl color literals in rendered markup; uses semantic --prism-* tokens
    expect(root.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}|rgba?\(|hsla?\(/i);
    expect(root.innerHTML).toContain('var(--prism-primary-main)');
    expect(root.innerHTML).toContain('var(--prism-secondary-main)');
    expect(root.innerHTML).toContain('var(--prism-success-main)');
    expect(root.innerHTML).toContain('var(--prism-warning-main)');
    expect(root.innerHTML).toContain('var(--prism-info-main)');
    expect(root.innerHTML).toContain('var(--prism-divider)');
    expect(root.innerHTML).toContain('var(--prism-text-primary)');
    expect(root.innerHTML).toContain('var(--prism-text-secondary)');

    // Recessed polite readout displays leading item immediately
    const readout = screen.getByTestId('lollipop-readout');
    expect(readout).toHaveAttribute('aria-live', 'polite');
    expect(readout).toHaveClass('prism-well');
    expect(readout).toHaveTextContent('Rank #1 · AI Copilot · 84.2k');
    expect(screen.getByTestId('lollipop-readout-delta')).toHaveTextContent('+29.8k vs Average');
    expect(screen.getByTestId('lollipop-readout-baseline')).toHaveTextContent('Average: 54.4k');
  });

  it('switches orientation between Horizontal and Vertical and sorts High→Low, Low→High, and A→Z', () => {
    const onOrientationChange = vi.fn();
    const onSortByChange = vi.fn();

    render(
      <LollipopChart
        onOrientationChange={onOrientationChange}
        onSortByChange={onSortByChange}
        data-testid="interactive-modes"
      />
    );

    const root = screen.getByTestId('interactive-modes');

    // Switch to Vertical
    fireEvent.click(screen.getByRole('button', { name: 'Vertical' }));
    expect(onOrientationChange).toHaveBeenCalledWith('vertical');
    expect(root).toHaveAttribute('data-orientation', 'vertical');
    expect(screen.getByRole('button', { name: 'Vertical' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Horizontal' })).toHaveAttribute('aria-pressed', 'false');

    const verticalLine = screen.getByTestId('lollipop-line-ai-copilot');
    expect(verticalLine.getAttribute('x1')).toBe(verticalLine.getAttribute('x2'));
    expect(verticalLine.getAttribute('y1')).not.toBe(verticalLine.getAttribute('y2'));

    // Sort Low→High
    fireEvent.click(screen.getByRole('button', { name: 'Low→High' }));
    expect(onSortByChange).toHaveBeenCalledWith('value-asc');
    expect(root).toHaveAttribute('data-sort-by', 'value-asc');

    const ascStems = within(screen.getByTestId('lollipop-stems')).getAllByRole('button');
    expect(ascStems[0]).toHaveAttribute('data-item-id', 'api-webhooks');
    expect(ascStems[0]).toHaveAttribute('data-rank', '7');
    expect(ascStems[6]).toHaveAttribute('data-item-id', 'ai-copilot');
    expect(ascStems[6]).toHaveAttribute('data-rank', '1');
    expect(screen.getByTestId('lollipop-readout')).toHaveTextContent('Rank #7 · API Webhooks · 27.9k');

    // Sort A→Z
    fireEvent.click(screen.getByRole('button', { name: 'A→Z' }));
    expect(onSortByChange).toHaveBeenLastCalledWith('label');
    expect(root).toHaveAttribute('data-sort-by', 'label');

    const alphaIds = within(screen.getByTestId('lollipop-stems'))
      .getAllByRole('button')
      .map((el) => el.getAttribute('data-item-id'));
    expect(alphaIds).toEqual([
      'ai-copilot',
      'api-webhooks',
      'auto-sync',
      'live-canvas',
      'offline-mode',
      'smart-search',
      'voice-notes',
    ]);

    // Switch back to Horizontal and High→Low
    fireEvent.click(screen.getByRole('button', { name: 'Horizontal' }));
    fireEvent.click(screen.getByRole('button', { name: 'High→Low' }));
    expect(root).toHaveAttribute('data-orientation', 'horizontal');
    expect(root).toHaveAttribute('data-sort-by', 'value-desc');
  });

  it('supports controlled orientation and sortBy props without mutating internal state until parent updates', () => {
    const onOrientationChange = vi.fn();
    const onSortByChange = vi.fn();

    const { rerender } = render(
      <LollipopChart
        orientation="vertical"
        sortBy="label"
        onOrientationChange={onOrientationChange}
        onSortByChange={onSortByChange}
        data-testid="controlled-lollipop"
      />
    );

    const root = screen.getByTestId('controlled-lollipop');
    expect(root).toHaveAttribute('data-orientation', 'vertical');
    expect(root).toHaveAttribute('data-sort-by', 'label');

    fireEvent.click(screen.getByRole('button', { name: 'Horizontal' }));
    fireEvent.click(screen.getByRole('button', { name: 'Low→High' }));
    expect(onOrientationChange).toHaveBeenCalledWith('horizontal');
    expect(onSortByChange).toHaveBeenCalledWith('value-asc');
    // Still controlled at previous prop values until rerender
    expect(root).toHaveAttribute('data-orientation', 'vertical');
    expect(root).toHaveAttribute('data-sort-by', 'label');

    rerender(
      <LollipopChart
        orientation="horizontal"
        sortBy="value-asc"
        onOrientationChange={onOrientationChange}
        onSortByChange={onSortByChange}
        data-testid="controlled-lollipop"
      />
    );
    expect(root).toHaveAttribute('data-orientation', 'horizontal');
    expect(root).toHaveAttribute('data-sort-by', 'value-asc');
  });

  it('handles click toggle, focus/blur highlighting, IME-safe Enter/Space, and Arrow key wrap navigation', () => {
    const onSelectItem = vi.fn();
    const items: LollipopDatum[] = [
      { id: 'alpha', label: 'Alpha', value: 90, tone: 'primary' },
      { id: 'beta', label: 'Beta', value: 60, tone: 'secondary' },
      { id: 'gamma', label: 'Gamma', value: 30, tone: 'emerald' },
    ];

    render(
      <LollipopChart
        data={items}
        title="Navigation Test"
        onSelectItem={onSelectItem}
        data-testid="nav-lollipop"
      />
    );

    const alphaStem = screen.getByTestId('lollipop-stem-alpha');
    const betaStem = screen.getByTestId('lollipop-stem-beta');
    const gammaStem = screen.getByTestId('lollipop-stem-gamma');

    // Click Beta to select and verify halo + dimming + callback + readout
    fireEvent.click(betaStem);
    expect(onSelectItem).toHaveBeenCalledWith(items[1], 2);
    expect(betaStem).toHaveAttribute('aria-pressed', 'true');
    expect(betaStem).toHaveAttribute('data-selected', 'true');
    expect(betaStem).toHaveAttribute('data-active', 'true');
    expect(alphaStem).toHaveAttribute('data-dimmed', 'true');
    expect(screen.getByTestId('lollipop-halo-beta')).toBeInTheDocument();
    expect(screen.getByTestId('lollipop-readout')).toHaveTextContent('Rank #2 · Beta · 60k');
    expect(screen.getByTestId('lollipop-readout-delta')).toHaveTextContent('0k vs Average');
    expect(screen.getByTestId('lollipop-readout-delta').style.color).toBe(
      'var(--prism-text-secondary)'
    );

    // Clicking Beta again toggles selection off cleanly
    fireEvent.click(betaStem);
    expect(betaStem).toHaveAttribute('aria-pressed', 'false');
    expect(alphaStem).toHaveAttribute('data-dimmed', 'false');
    expect(screen.queryByTestId('lollipop-halo-beta')).toBeNull();
    expect(onSelectItem).toHaveBeenCalledTimes(1);

    // Focus highlights hovered/focused stem and blur restores cleanly
    fireEvent.focus(gammaStem);
    expect(gammaStem).toHaveAttribute('data-active', 'true');
    expect(screen.getByTestId('lollipop-readout')).toHaveTextContent('Rank #3 · Gamma · 30k');
    expect(screen.getByTestId('lollipop-readout-delta')).toHaveTextContent('-30k vs Average');
    expect(screen.getByTestId('lollipop-readout-delta').style.color).toBe(
      'var(--prism-warning-main)'
    );

    // Focus another stem before blurring previous stem exercises prev !== stemKey branch
    fireEvent.focus(alphaStem);
    fireEvent.blur(gammaStem);
    expect(alphaStem).toHaveAttribute('data-active', 'true');
    fireEvent.blur(alphaStem);
    expect(alphaStem).toHaveAttribute('data-active', 'false');

    // IME composing Enter must be ignored
    fireEvent.keyDown(alphaStem, { key: 'Enter', isComposing: true });
    expect(onSelectItem).toHaveBeenCalledTimes(1);

    // Non-navigation key is ignored
    fireEvent.keyDown(alphaStem, { key: 'Escape' });
    expect(onSelectItem).toHaveBeenCalledTimes(1);

    // Enter selects Alpha
    fireEvent.keyDown(alphaStem, { key: 'Enter' });
    expect(onSelectItem).toHaveBeenLastCalledWith(items[0], 1);
    expect(alphaStem).toHaveAttribute('aria-pressed', 'true');

    // Space toggles Alpha off
    fireEvent.keyDown(alphaStem, { key: ' ' });
    expect(alphaStem).toHaveAttribute('aria-pressed', 'false');

    // ArrowDown moves from Alpha -> Beta
    fireEvent.keyDown(alphaStem, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(betaStem);
    expect(onSelectItem).toHaveBeenLastCalledWith(items[1], 2);

    // ArrowRight moves from Beta -> Gamma
    fireEvent.keyDown(betaStem, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(gammaStem);
    expect(onSelectItem).toHaveBeenLastCalledWith(items[2], 3);

    // ArrowDown from last wraps to first (Gamma -> Alpha)
    fireEvent.keyDown(gammaStem, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(alphaStem);
    expect(onSelectItem).toHaveBeenLastCalledWith(items[0], 1);

    // ArrowUp from first wraps to last (Alpha -> Gamma)
    fireEvent.keyDown(alphaStem, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(gammaStem);
    expect(onSelectItem).toHaveBeenLastCalledWith(items[2], 3);

    // ArrowLeft moves from Gamma -> Beta
    fireEvent.keyDown(gammaStem, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(betaStem);
    expect(onSelectItem).toHaveBeenLastCalledWith(items[1], 2);
  });

  it('supports explicit referenceValue, valuePrefix, unit, showAverageLine={false}, and reference outside data range', () => {
    const items: LollipopDatum[] = [
      { id: 'na', label: 'North America', value: 62.5, tone: 'primary' },
      { id: 'eu', label: 'Europe', value: 45, tone: 'secondary' },
      { id: 'apac', label: 'APAC', value: 30, tone: 'emerald' },
    ];

    const { rerender } = render(
      <LollipopChart
        data={items}
        valuePrefix="$"
        unit="M"
        referenceValue={45}
        showAverageLine={false}
        data-testid="ref-lollipop"
      />
    );

    // Explicit referenceValue displays Ref line even when showAverageLine={false}
    expect(screen.getByTestId('lollipop-reference-label')).toHaveTextContent('Ref $45M');
    expect(screen.getByTestId('lollipop-readout')).toHaveTextContent(
      'Rank #1 · North America · $62.5M'
    );
    expect(screen.getByTestId('lollipop-readout-delta')).toHaveTextContent('+$17.5M vs Reference');
    expect(screen.getByTestId('lollipop-readout-delta').style.color).toBe(
      'var(--prism-success-main)'
    );
    expect(screen.getByTestId('lollipop-readout-baseline')).toHaveTextContent('Reference: $45M');

    // Select APAC to verify negative currency delta formatting (-$15M)
    fireEvent.click(screen.getByTestId('lollipop-stem-apac'));
    expect(screen.getByTestId('lollipop-readout-delta')).toHaveTextContent('-$15M vs Reference');

    // Rerender with referenceValue > maxData and vertical orientation
    rerender(
      <LollipopChart
        data={items}
        defaultOrientation="vertical"
        orientation="vertical"
        valuePrefix="$"
        unit="M"
        referenceValue={100}
        data-testid="ref-lollipop"
      />
    );
    expect(screen.getByTestId('lollipop-reference-label')).toHaveTextContent('Ref $100M');
    expect(screen.getByTestId('lollipop-svg').innerHTML).not.toContain('NaN');

    // Rerender with referenceValue < minData (negative reference)
    rerender(
      <LollipopChart
        data={items}
        orientation="horizontal"
        valuePrefix="$"
        unit="M"
        referenceValue={-10}
        data-testid="ref-lollipop"
      />
    );
    expect(screen.getByTestId('lollipop-reference-label')).toHaveTextContent('Ref -$10M');

    // Omit referenceValue and disable showAverageLine -> no reference line in horizontal or vertical
    rerender(
      <LollipopChart
        data={items}
        orientation="horizontal"
        showAverageLine={false}
        data-testid="ref-lollipop"
      />
    );
    expect(screen.getByTestId('ref-lollipop')).not.toHaveAttribute('data-reference');
    expect(screen.queryByTestId('lollipop-reference-line')).toBeNull();
    expect(screen.getByTestId('lollipop-readout-baseline')).toHaveTextContent('Average: 45.8k');

    rerender(
      <LollipopChart
        data={items}
        orientation="vertical"
        showAverageLine={false}
        data-testid="ref-lollipop"
      />
    );
    expect(screen.queryByTestId('lollipop-reference-line')).toBeNull();

    // Non-finite referenceValue falls back gracefully to auto-computed average
    rerender(
      <LollipopChart
        data={items}
        referenceValue={Number.NaN}
        showAverageLine={true}
        data-testid="ref-lollipop"
      />
    );
    expect(screen.getByTestId('lollipop-reference-label')).toHaveTextContent('Avg 45.8k');
  });

  it('handles empty state, signed negative values, all-zero values, non-finite inputs, tie-breaking, long labels, and XSS neutralization', () => {
    const { rerender } = render(<LollipopChart data={[]} data-testid="edge-lollipop" />);

    const root = screen.getByTestId('edge-lollipop');
    expect(root).toHaveAttribute('data-empty', 'true');
    expect(screen.getByTestId('lollipop-empty')).toHaveAttribute('role', 'status');
    expect(screen.getByTestId('lollipop-empty')).toHaveTextContent(
      'No lollipop ranking data to display.'
    );
    expect(screen.queryByTestId('lollipop-svg')).toBeNull();
    expect(screen.queryByTestId('lollipop-readout')).toBeNull();

    // Signed negative + positive + zero + non-finite + duplicate IDs + tie-breaking + auto-cycled tones
    const adversarialData: LollipopDatum[] = [
      { id: 'dup', label: 'Bravo Tied Feature Name Very Long', value: 25 },
      { id: 'dup', label: 'Alpha Tied', value: 25 },
      { id: 'dup', label: 'Alpha Tied', value: 25 },
      { id: 'neg', label: 'Churn Delta', value: -18.5 },
      { id: 'nan', label: 'Corrupt Metric', value: Number.NaN },
      { id: 'inf', label: 'Infinite Metric', value: Number.POSITIVE_INFINITY },
      { id: 'neg-zero', label: 'Neg Zero', value: -0 },
      { id: 'extra-8', label: 'Eighth Item', value: 12 },
      { id: 'extra-9', label: 'Ninth Item Long Label', value: 8 },
    ];

    rerender(
      <LollipopChart
        data={adversarialData}
        valuePrefix="$"
        unit="k"
        data-testid="edge-lollipop"
      />
    );

    const populated = screen.getByTestId('edge-lollipop');
    expect(populated.innerHTML).not.toContain('NaN');
    expect(populated.innerHTML).not.toContain('Infinity');
    expect(populated.innerHTML).not.toContain('-$0k');

    // All 5 semantic tones auto-cycled across items without explicit tone
    expect(populated.innerHTML).toContain('var(--prism-primary-main)');
    expect(populated.innerHTML).toContain('var(--prism-secondary-main)');
    expect(populated.innerHTML).toContain('var(--prism-success-main)');
    expect(populated.innerHTML).toContain('var(--prism-warning-main)');
    expect(populated.innerHTML).toContain('var(--prism-info-main)');

    // Negative horizontal value label renders left-anchored with leading minus sign before prefix
    const negVal = screen.getByTestId('lollipop-value-neg');
    expect(negVal).toHaveTextContent('-$18.5k');
    expect(negVal).toHaveAttribute('text-anchor', 'end');

    // Long horizontal label truncates cleanly with ellipsis
    const dupLabels = screen.getAllByTestId('lollipop-label-dup');
    expect(dupLabels.some((el) => el.textContent?.endsWith('…'))).toBe(true);

    // Switch to Low→High and A→Z to exercise tie-breakers on equal values & identical labels
    fireEvent.click(screen.getByRole('button', { name: 'Low→High' }));
    fireEvent.click(screen.getByRole('button', { name: 'A→Z' }));

    // Switch to Vertical with > 8 items and negative values to test vertical negative label + 6-char truncation
    fireEvent.click(screen.getByRole('button', { name: 'Vertical' }));
    expect(screen.getByTestId('lollipop-label-extra-9').textContent).toBe('Ninth…');
    expect(screen.getByTestId('lollipop-svg').innerHTML).not.toContain('NaN');

    // Focus & select an item, then shrink dataset so previous focusedKey & selectedKey disappear cleanly
    const negStem = screen.getByTestId('lollipop-stem-neg');
    fireEvent.focus(negStem);
    fireEvent.click(negStem);
    expect(negStem).toHaveAttribute('aria-pressed', 'true');
    expect(negStem).toHaveAttribute('data-active', 'true');

    // All-zero dataset exercises domainMax === domainMin fallback
    rerender(
      <LollipopChart
        data={[
          { id: 'z1', label: 'Zero A', value: 0 },
          { id: 'z2', label: 'Zero B', value: -0 },
        ]}
        data-testid="edge-lollipop"
      />
    );
    expect(screen.getByTestId('lollipop-svg').innerHTML).not.toContain('NaN');
    expect(screen.getByTestId('lollipop-readout')).toHaveTextContent('Rank #1 · Zero A · 0k');

    // XSS payload neutralization across title, id, label, valuePrefix, and unit
    const payload = '<script>window.__lollipopXss=1</script><img src=x onerror=alert(1)>';
    rerender(
      <LollipopChart
        title={payload}
        valuePrefix={payload}
        unit={payload}
        data={[{ id: payload, label: payload, value: 42 }]}
      />
    );
    expect(screen.getByRole('heading', { name: payload })).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
  });
});
