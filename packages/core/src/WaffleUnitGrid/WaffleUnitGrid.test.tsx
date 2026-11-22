import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  DEFAULT_WAFFLE_SEGMENTS,
  WaffleUnitGrid,
  type WaffleResolvedSegment,
  type WaffleSegment,
} from './index';

describe('WaffleUnitGrid', () => {
  it('renders default 10×10 cloud plan proportion grid with ref forwarding, theme overrides, resolution pill, total badge, and semantic tokens only', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <PrismThemeProvider
        theme={{
          components: {
            WaffleUnitGrid: { className: 'theme-waffle', style: { maxWidth: '720px' } },
          },
        }}
      >
        <WaffleUnitGrid
          ref={ref}
          className="consumer-waffle"
          xstyle={{ '--prism-blur-px': '18px' }}
          data-testid="waffle-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('waffle-root');
    expect(ref.current).toBe(root);
    expect(WaffleUnitGrid.displayName).toBe('WaffleUnitGrid');
    expect(DEFAULT_WAFFLE_SEGMENTS).toHaveLength(4);
    expect(root).toHaveClass(
      'refractor-waffle-unit-grid',
      'prism-slab',
      'theme-waffle',
      'consumer-waffle'
    );
    expect(root).toHaveStyle({ maxWidth: '720px' });
    expect(root).toHaveAttribute('data-rows', '10');
    expect(root).toHaveAttribute('data-columns', '10');
    expect(root).not.toHaveAttribute('data-empty');

    expect(
      screen.getByRole('heading', { name: '10×10 Waffle Unit Proportion' })
    ).toBeInTheDocument();
    expect(screen.getByTestId('waffle-resolution-pill')).toHaveTextContent(
      '100 units · 1 sq = 1.0%'
    );
    expect(screen.getByTestId('waffle-total-badge')).toHaveTextContent('Total');
    expect(screen.getByTestId('waffle-total-badge')).toHaveTextContent('100%');

    const svg = screen.getByTestId('waffle-svg');
    expect(svg).toHaveAttribute('role', 'img');
    expect(svg).toHaveAttribute('data-rows', '10');
    expect(svg).toHaveAttribute('data-columns', '10');
    expect(svg).toHaveAttribute('data-total-cells', '100');
    expect(svg.parentElement).toHaveClass('prism-well');
    expect(svg.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(svg.innerHTML).not.toMatch(/\b(?:rgba?|hsla?)\s*\(/);
    expect(svg.innerHTML).not.toContain('NaN');

    const allCells = svg.querySelectorAll('rect[data-waffle-cell="true"]');
    expect(allCells).toHaveLength(100);
    expect(svg.querySelectorAll('rect[data-segment-id="enterprise"]')).toHaveLength(42);
    expect(svg.querySelectorAll('rect[data-segment-id="pro"]')).toHaveLength(29);
    expect(svg.querySelectorAll('rect[data-segment-id="starter"]')).toHaveLength(18);
    expect(svg.querySelectorAll('rect[data-segment-id="sandbox"]')).toHaveLength(11);

    expect(svg.querySelector('rect[data-segment-id="enterprise"]')).toHaveAttribute(
      'fill',
      'var(--prism-primary-main)'
    );
    expect(svg.querySelector('rect[data-segment-id="pro"]')).toHaveAttribute(
      'fill',
      'var(--prism-secondary-main)'
    );
    expect(svg.querySelector('rect[data-segment-id="starter"]')).toHaveAttribute(
      'fill',
      'var(--prism-success-main)'
    );
    expect(svg.querySelector('rect[data-segment-id="sandbox"]')).toHaveAttribute(
      'fill',
      'var(--prism-warning-main)'
    );

    const cards = screen.getAllByRole('button');
    expect(cards).toHaveLength(4);
    const enterpriseCard = screen.getByTestId('waffle-card-enterprise');
    expect(enterpriseCard).toHaveAttribute('role', 'button');
    expect(enterpriseCard).toHaveAttribute('aria-pressed', 'false');
    expect(enterpriseCard).toHaveTextContent('Enterprise Plan');
    expect(enterpriseCard).toHaveTextContent('42.0%');
    expect(enterpriseCard).toHaveTextContent('42 / 100 sq');
    expect(enterpriseCard).toHaveTextContent('42%');

    const callout = screen.getByTestId('waffle-callout');
    expect(callout).toHaveAttribute('aria-live', 'polite');
    expect(callout).toHaveClass('prism-well');
    expect(callout).toHaveTextContent('42 of 100 units (42.0%) — Enterprise Plan');
    expect(callout).toHaveTextContent('4 categories · 10×10');
  });

  it('allocates squares with Largest-Remainder (Hamilton) rounding without off-by-one drift and clamps rows/columns safely', () => {
    // 1) Three-way equal tie on 10×10 = 100 cells -> 34, 33, 33 (sum === 100)
    const equalThirds: WaffleSegment[] = [
      { id: 'a', label: 'Alpha', value: 1, tone: 'primary' },
      { id: 'b', label: 'Beta', value: 1, tone: 'secondary' },
      { id: 'c', label: 'Gamma', value: 1, tone: 'emerald' },
    ];
    const { rerender } = render(<WaffleUnitGrid segments={equalThirds} />);

    let svg = screen.getByTestId('waffle-svg');
    expect(svg.querySelectorAll('rect[data-waffle-cell="true"]')).toHaveLength(100);
    expect(svg.querySelectorAll('rect[data-segment-id="a"]')).toHaveLength(34);
    expect(svg.querySelectorAll('rect[data-segment-id="b"]')).toHaveLength(33);
    expect(svg.querySelectorAll('rect[data-segment-id="c"]')).toHaveLength(33);
    expect(screen.getByTestId('waffle-card-a')).toHaveTextContent('34 / 100 sq');
    expect(screen.getByTestId('waffle-card-b')).toHaveTextContent('33 / 100 sq');
    expect(screen.getByTestId('waffle-card-c')).toHaveTextContent('33 / 100 sq');

    // 2) Unequal fractional remainders on 8×12 = 96 cells
    // [10, 20, 35, 17] sum = 82 -> exact quotas [11.707, 23.415, 40.976, 19.902]
    // floors = [11, 23, 40, 19] (sum 93, leftover 3) -> top remainders: idx 2, idx 3, idx 0 -> [12, 23, 41, 20]
    const unevenBudget: WaffleSegment[] = [
      { id: 'compute', label: 'Compute', value: 10, tone: 'primary' },
      { id: 'storage', label: 'Storage', value: 20, tone: 'secondary' },
      { id: 'ai', label: 'AI GPUs', value: 35, tone: 'rose' },
      { id: 'network', label: 'Network', value: 17, tone: 'info' },
    ];
    rerender(<WaffleUnitGrid segments={unevenBudget} rows={8} columns={12} unit="k" />);

    svg = screen.getByTestId('waffle-svg');
    expect(svg).toHaveAttribute('data-rows', '8');
    expect(svg).toHaveAttribute('data-columns', '12');
    expect(svg.querySelectorAll('rect[data-waffle-cell="true"]')).toHaveLength(96);
    expect(svg.querySelectorAll('rect[data-segment-id="compute"]')).toHaveLength(12);
    expect(svg.querySelectorAll('rect[data-segment-id="storage"]')).toHaveLength(23);
    expect(svg.querySelectorAll('rect[data-segment-id="ai"]')).toHaveLength(41);
    expect(svg.querySelectorAll('rect[data-segment-id="network"]')).toHaveLength(20);
    expect(screen.getByTestId('waffle-resolution-pill')).toHaveTextContent(
      '96 units · 1 sq = 1.0%'
    );
    expect(screen.getByTestId('waffle-total-badge')).toHaveTextContent('82 k');

    // 3) Clamping low: rows=1 -> 4, columns=2 -> 5 (20 cells)
    rerender(<WaffleUnitGrid segments={unevenBudget} rows={1} columns={2} />);
    svg = screen.getByTestId('waffle-svg');
    expect(svg).toHaveAttribute('data-rows', '4');
    expect(svg).toHaveAttribute('data-columns', '5');
    expect(svg.querySelectorAll('rect[data-waffle-cell="true"]')).toHaveLength(20);
    expect(screen.getByTestId('waffle-resolution-pill')).toHaveTextContent(
      '20 units · 1 sq = 5.0%'
    );

    // 4) Clamping high: rows=99 -> 12, columns=50 -> 20 (240 cells)
    rerender(<WaffleUnitGrid segments={unevenBudget} rows={99} columns={50} />);
    svg = screen.getByTestId('waffle-svg');
    expect(svg).toHaveAttribute('data-rows', '12');
    expect(svg).toHaveAttribute('data-columns', '20');
    expect(svg.querySelectorAll('rect[data-waffle-cell="true"]')).toHaveLength(240);
    expect(screen.getByTestId('waffle-resolution-pill')).toHaveTextContent(
      '240 units · 1 sq = 0.4%'
    );

    // 5) Non-finite and fractional clamping
    rerender(
      <WaffleUnitGrid
        segments={unevenBudget}
        rows={Number.NaN}
        columns={Number.POSITIVE_INFINITY}
      />
    );
    expect(screen.getByTestId('waffle-svg')).toHaveAttribute('data-total-cells', '100');

    rerender(<WaffleUnitGrid segments={unevenBudget} rows={6.6} columns={7.4} />);
    expect(screen.getByTestId('waffle-svg')).toHaveAttribute('data-rows', '7');
    expect(screen.getByTestId('waffle-svg')).toHaveAttribute('data-columns', '7');
    expect(screen.getByTestId('waffle-svg')).toHaveAttribute('data-total-cells', '49');
  });

  it('illuminates selected category squares, dims siblings, updates live callout, supports SVG square click and toggle-off, and invokes onSelectSegment', () => {
    const onSelectSegment = vi.fn<(segment: WaffleResolvedSegment) => void>();
    render(<WaffleUnitGrid onSelectSegment={onSelectSegment} data-testid="interactive-waffle" />);

    const root = screen.getByTestId('interactive-waffle');
    const svg = screen.getByTestId('waffle-svg');
    const enterpriseCard = screen.getByTestId('waffle-card-enterprise');
    const proCard = screen.getByTestId('waffle-card-pro');
    const callout = screen.getByTestId('waffle-callout');

    // Click Enterprise Plan card
    fireEvent.click(enterpriseCard);
    expect(onSelectSegment).toHaveBeenCalledTimes(1);
    expect(onSelectSegment).toHaveBeenLastCalledWith({
      id: 'enterprise',
      label: 'Enterprise Plan',
      value: 42,
      tone: 'primary',
      sharePct: 42,
      cellCount: 42,
    });
    expect(root).toHaveAttribute('data-has-selection', 'true');
    expect(enterpriseCard).toHaveAttribute('aria-pressed', 'true');
    expect(enterpriseCard).toHaveAttribute('data-selected', 'true');
    expect(proCard).toHaveAttribute('data-dimmed', 'true');

    const enterpriseCells = svg.querySelectorAll('rect[data-segment-id="enterprise"]');
    const proCells = svg.querySelectorAll('rect[data-segment-id="pro"]');
    expect(enterpriseCells[0]).toHaveAttribute('data-highlighted', 'true');
    expect(enterpriseCells[0]).toHaveAttribute('data-dimmed', 'false');
    expect(enterpriseCells[0]).toHaveAttribute('fill-opacity', '0.96');
    expect(enterpriseCells[0]).toHaveAttribute('stroke', 'var(--prism-text-primary)');
    expect(proCells[0]).toHaveAttribute('data-highlighted', 'false');
    expect(proCells[0]).toHaveAttribute('data-dimmed', 'true');
    expect(proCells[0]).toHaveAttribute('fill-opacity', '0.16');

    expect(callout).toHaveTextContent('42 of 100 units (42.0%) — Enterprise Plan');
    expect(callout).toHaveTextContent('42%');

    // Click directly on a Pro Teams unit square inside the SVG
    fireEvent.click(proCells[0]!);
    expect(onSelectSegment).toHaveBeenCalledTimes(2);
    expect(onSelectSegment).toHaveBeenLastCalledWith({
      id: 'pro',
      label: 'Pro Teams',
      value: 29,
      tone: 'secondary',
      sharePct: 29,
      cellCount: 29,
    });
    expect(proCard).toHaveAttribute('aria-pressed', 'true');
    expect(enterpriseCard).toHaveAttribute('aria-pressed', 'false');
    expect(callout).toHaveTextContent('29 of 100 units (29.0%) — Pro Teams');

    // Clicking the already selected card toggles selection back off cleanly
    fireEvent.click(proCard);
    expect(onSelectSegment).toHaveBeenCalledTimes(2);
    expect(proCard).toHaveAttribute('aria-pressed', 'false');
    expect(root).not.toHaveAttribute('data-has-selection');
    expect(svg.querySelectorAll('rect[data-dimmed="true"]')).toHaveLength(0);
    expect(callout).toHaveTextContent('Select a category to isolate its unit squares.');
  });

  it('supports IME-safe Enter, Space, Escape, and Arrow key navigation across category breakdown cards', () => {
    const onSelectSegment = vi.fn<(segment: WaffleResolvedSegment) => void>();
    render(<WaffleUnitGrid onSelectSegment={onSelectSegment} />);

    const enterprise = screen.getByTestId('waffle-card-enterprise');
    const pro = screen.getByTestId('waffle-card-pro');
    const starter = screen.getByTestId('waffle-card-starter');
    const sandbox = screen.getByTestId('waffle-card-sandbox');

    // IME composition events must be ignored
    fireEvent.keyDown(enterprise, { key: 'Enter', isComposing: true });
    fireEvent.keyDown(enterprise, { key: ' ', isComposing: true });
    fireEvent.keyDown(enterprise, { key: 'Escape', isComposing: true });
    fireEvent.keyDown(enterprise, { key: 'ArrowDown', isComposing: true });
    fireEvent.keyDown(enterprise, { key: 'ArrowUp', isComposing: true });
    expect(onSelectSegment).not.toHaveBeenCalled();

    // Unrelated key must be ignored
    fireEvent.keyDown(enterprise, { key: 'Tab' });
    expect(onSelectSegment).not.toHaveBeenCalled();

    // Enter selects Enterprise Plan
    fireEvent.keyDown(enterprise, { key: 'Enter' });
    expect(enterprise).toHaveAttribute('aria-pressed', 'true');
    expect(onSelectSegment).toHaveBeenCalledTimes(1);

    // Space toggles Enterprise Plan off, then Space on Pro Teams selects Pro Teams
    fireEvent.keyDown(enterprise, { key: ' ' });
    expect(enterprise).toHaveAttribute('aria-pressed', 'false');
    fireEvent.keyDown(pro, { key: ' ' });
    expect(pro).toHaveAttribute('aria-pressed', 'true');
    expect(onSelectSegment).toHaveBeenCalledTimes(2);

    // ArrowDown -> Starter Cloud, ArrowRight -> Sandbox & Free, ArrowDown wraps -> Enterprise Plan
    fireEvent.keyDown(pro, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(starter);
    expect(starter).toHaveAttribute('aria-pressed', 'true');

    fireEvent.keyDown(starter, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(sandbox);
    expect(sandbox).toHaveAttribute('aria-pressed', 'true');

    fireEvent.keyDown(sandbox, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(enterprise);
    expect(enterprise).toHaveAttribute('aria-pressed', 'true');

    // ArrowUp wraps backward -> Sandbox & Free, ArrowLeft -> Starter Cloud
    fireEvent.keyDown(enterprise, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(sandbox);
    expect(sandbox).toHaveAttribute('aria-pressed', 'true');

    fireEvent.keyDown(sandbox, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(starter);
    expect(starter).toHaveAttribute('aria-pressed', 'true');

    // Escape clears active selection
    fireEvent.keyDown(starter, { key: 'Escape' });
    expect(starter).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('waffle-callout')).toHaveTextContent(
      'Select a category to isolate its unit squares.'
    );
  });

  it('auto-cycles all 6 semantic tones, filters invalid values, handles duplicate IDs, decimals, empty unit, single-category pluralization, and stale selection cleanup', () => {
    const complexSegments: WaffleSegment[] = [
      { id: 'dup', label: 'Tier One', value: 10 },
      { id: 'dup', label: 'Tier Two', value: 12.75 },
      { id: 'lead', label: 'Leading Tier', value: 40 },
      { id: 'zero', label: 'Zero Ignored', value: 0 },
      { id: 'neg', label: 'Negative Ignored', value: -8 },
      { id: 'nan', label: 'NaN Ignored', value: Number.NaN },
      { id: 'inf', label: 'Inf Ignored', value: Number.POSITIVE_INFINITY },
      { id: 'fourth', label: 'Amber Tier', value: 15 },
      { id: 'fifth', label: 'Rose Tier', value: 12 },
      { id: 'sixth', label: 'Info Tier', value: 10 },
      { id: 'seventh', label: 'Wrapped Primary', value: 10 },
    ];

    const { rerender } = render(<WaffleUnitGrid segments={complexSegments} unit="seats" />);

    const cards = screen.getAllByRole('button');
    expect(cards).toHaveLength(7);

    // Verify all 6 cycled semantic tones + wrap on index 6
    expect(cards[0]).toHaveAttribute('data-tone', 'primary');
    expect(cards[1]).toHaveAttribute('data-tone', 'secondary');
    expect(cards[2]).toHaveAttribute('data-tone', 'emerald');
    expect(cards[3]).toHaveAttribute('data-tone', 'amber');
    expect(cards[4]).toHaveAttribute('data-tone', 'rose');
    expect(cards[5]).toHaveAttribute('data-tone', 'info');
    expect(cards[6]).toHaveAttribute('data-tone', 'primary');

    const svg = screen.getByTestId('waffle-svg');
    expect(svg.querySelector('rect[data-tone="rose"]')).toHaveAttribute(
      'fill',
      'var(--prism-error-main)'
    );
    expect(svg.querySelector('rect[data-tone="info"]')).toHaveAttribute(
      'fill',
      'var(--prism-info-main)'
    );
    expect(svg.querySelectorAll('rect[data-waffle-cell="true"]')).toHaveLength(100);

    // Duplicate ID receives unique collision-safe testid & formatted decimal metric
    expect(screen.getByTestId('waffle-card-dup-2')).toHaveTextContent('12.75 seats');
    // Leading segment (non-first index) is surfaced in idle callout
    expect(screen.getByTestId('waffle-callout')).toHaveTextContent('Leading Tier');

    // Select a card then rerender to a single-category dataset with empty unit -> cleans stale selection
    fireEvent.click(cards[2]!);
    expect(cards[2]).toHaveAttribute('aria-pressed', 'true');

    rerender(
      <WaffleUnitGrid
        segments={[{ id: 'solo', label: 'Unified Plan', value: 250, tone: 'info' }]}
        unit=""
      />
    );

    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.getByTestId('waffle-card-solo')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('waffle-card-solo')).toHaveTextContent('100 / 100 sq');
    expect(screen.getByTestId('waffle-total-badge')).toHaveTextContent('250');
    expect(screen.getByTestId('waffle-callout')).toHaveTextContent('1 category · 10×10');
  });

  it('renders clean role="status" empty state for empty or non-positive datasets and neutralizes XSS payloads', () => {
    const { rerender } = render(<WaffleUnitGrid segments={[]} data-testid="empty-waffle" />);
    expect(screen.getByTestId('empty-waffle')).toHaveAttribute('data-empty', 'true');
    const emptyStatus = screen.getByRole('status');
    expect(emptyStatus).toHaveTextContent('No positive proportion values to display.');
    expect(screen.queryByTestId('waffle-svg')).toBeNull();
    expect(screen.queryByTestId('waffle-total-badge')).toBeNull();
    expect(screen.queryByTestId('waffle-breakdown')).toBeNull();
    expect(screen.queryByTestId('waffle-callout')).toBeNull();

    // Non-positive and non-finite datasets also produce clean empty state
    rerender(
      <WaffleUnitGrid
        data-testid="empty-waffle"
        segments={[
          { id: 'z', label: 'Zero', value: 0 },
          { id: 'n', label: 'Negative', value: -20 },
          { id: 'nan', label: 'NaN', value: Number.NaN },
          { id: 'inf', label: 'Infinity', value: Number.POSITIVE_INFINITY },
        ]}
      />
    );
    expect(screen.getByTestId('empty-waffle')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByRole('status')).toBeInTheDocument();

    // Neutralizes XSS payloads in title, unit, and segment labels
    const xssPayload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';
    rerender(
      <WaffleUnitGrid
        title={xssPayload}
        unit={xssPayload}
        segments={[{ id: 'xss', label: xssPayload, value: 50, tone: 'rose' }]}
      />
    );
    expect(screen.getByRole('heading', { name: xssPayload })).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
    expect(screen.getByTestId('waffle-card-xss')).toHaveTextContent(xssPayload);
  });
});
