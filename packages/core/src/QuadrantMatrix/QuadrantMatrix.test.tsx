import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  DEFAULT_QUADRANT_ITEMS,
  DEFAULT_QUADRANT_LABELS,
  QuadrantMatrix,
  type QuadrantItem,
  type QuadrantSelection,
  type QuadrantZoneMap,
} from './index';

describe('QuadrantMatrix', () => {
  it('renders default 8 roadmap items across all 4 quadrants, forwards ref, merges overrides, and uses --prism-* tokens exclusively', () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <PrismThemeProvider
        theme={{
          components: {
            QuadrantMatrix: {
              className: 'theme-quadrant',
              style: { maxWidth: '680px' },
            },
          },
        }}
      >
        <QuadrantMatrix
          ref={ref}
          className="consumer-quadrant"
          xstyle={{ '--prism-blur-px': '14px' }}
          style={{ padding: '20px' }}
          data-testid="quadrant-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('quadrant-root');
    expect(ref.current).toBe(root);
    expect(QuadrantMatrix.displayName).toBe('QuadrantMatrix');
    expect(root).toHaveClass(
      'refractor-quadrant-matrix',
      'prism-slab',
      'theme-quadrant',
      'consumer-quadrant'
    );
    expect(root).toHaveStyle({ maxWidth: '680px', padding: '20px' });
    expect(root).toHaveAttribute('data-filter', 'all');
    expect(root).toHaveAttribute('data-split-x', '50');
    expect(root).toHaveAttribute('data-split-y', '50');
    expect(root).not.toHaveAttribute('data-empty');

    expect(DEFAULT_QUADRANT_ITEMS).toHaveLength(8);
    expect(DEFAULT_QUADRANT_LABELS.topLeft).toBe('Quick Wins');
    expect(
      screen.getByRole('heading', { name: 'Strategic 2×2 Quadrant Matrix' })
    ).toBeInTheDocument();
    expect(screen.getByTestId('quadrant-total-count')).toHaveTextContent('8 initiatives');

    // Verify per-quadrant filter pill counts (2 in each of the 4 quadrants)
    expect(screen.getByTestId('quadrant-filter-all')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('quadrant-filter-count-top-left')).toHaveTextContent('2');
    expect(screen.getByTestId('quadrant-filter-count-top-right')).toHaveTextContent('2');
    expect(screen.getByTestId('quadrant-filter-count-bottom-left')).toHaveTextContent('2');
    expect(screen.getByTestId('quadrant-filter-count-bottom-right')).toHaveTextContent('2');

    // Verify SVG canvas, viewBox, responsive classes, zones, split axes, and watermarks
    const svg = screen.getByTestId('quadrant-matrix-svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 440 300');
    expect(svg).toHaveClass('w-full', 'h-auto', 'select-none');
    expect(svg.querySelectorAll('[data-role="quadrant-zone"]')).toHaveLength(4);
    expect(svg.querySelectorAll('[data-role="quadrant-item"]')).toHaveLength(8);

    expect(screen.getByTestId('quadrant-watermark-top-left')).toHaveTextContent('Quick Wins');
    expect(screen.getByTestId('quadrant-watermark-top-right')).toHaveTextContent('Major Bets');
    expect(screen.getByTestId('quadrant-watermark-bottom-left')).toHaveTextContent('Fill-Ins');
    expect(screen.getByTestId('quadrant-watermark-bottom-right')).toHaveTextContent('Reconsider');
    expect(screen.getByTestId('quadrant-x-label')).toHaveTextContent('Implementation Effort');
    expect(screen.getByTestId('quadrant-y-label')).toHaveTextContent('Strategic Impact');

    // Zero raw color literals anywhere in rendered DOM/SVG
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(container.innerHTML).not.toMatch(/\b(?:rgba?|hsla?)\s*\(/);
    expect(svg.innerHTML).toContain('var(--prism-success-main)');
    expect(svg.innerHTML).toContain('var(--prism-primary-main)');
    expect(svg.innerHTML).toContain('var(--prism-info-main)');
    expect(svg.innerHTML).toContain('var(--prism-error-main)');
    expect(svg.innerHTML).not.toContain('NaN');

    // Verify recessed aria-live="polite" strategic inspector defaults to first item
    const inspector = screen.getByTestId('quadrant-inspector');
    expect(inspector).toHaveClass('prism-well');
    expect(inspector).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByTestId('quadrant-inspector-label')).toHaveTextContent('Passkey Login');
    expect(screen.getByTestId('quadrant-inspector-badge')).toHaveTextContent('Quick Wins');
    expect(screen.getByTestId('quadrant-inspector-coords')).toHaveTextContent(
      'Implementation Effort: 22 · Strategic Impact: 84'
    );
    expect(screen.getByTestId('quadrant-inspector-summary')).toHaveTextContent(
      'Cuts sign-in friction'
    );
    expect(screen.getByTestId('quadrant-active-ring-passkey-login')).toBeInTheDocument();

    // Type-level verification of extensible QuadrantZoneMap
    const zoneMap: QuadrantZoneMap = {
      'top-left': true,
      'top-right': true,
      'bottom-left': true,
      'bottom-right': true,
    };
    expect(Object.keys(zoneMap)).toHaveLength(4);
  });

  it('filters plotted bubbles via Quadrant Filter Pills and handles empty filtered quadrant gracefully', () => {
    const items: QuadrantItem[] = [
      { id: 'qw-1', label: 'Fast Win', x: 20, y: 80, summary: 'Ship this week.' },
      { id: 'mb-1', label: 'Platform Rewrite', x: 82, y: 90, weight: 3 },
      { id: 'fi-1', label: 'Docs Polish', x: 25, y: 25, weight: 1 },
    ];

    render(<QuadrantMatrix items={items} data-testid="quadrant-filter-root" />);

    const root = screen.getByTestId('quadrant-filter-root');
    const svg = screen.getByTestId('quadrant-matrix-svg');
    expect(svg.querySelectorAll('[data-role="quadrant-item"]')).toHaveLength(3);

    // Select an item in top-right first
    fireEvent.click(screen.getByTestId('quadrant-item-mb-1'));
    expect(screen.getByTestId('quadrant-inspector-label')).toHaveTextContent('Platform Rewrite');
    expect(screen.queryByTestId('quadrant-inspector-summary')).toBeNull();

    // Filter to Quick Wins (top-left) -> stale top-right selection falls back to visible top-left item
    fireEvent.click(screen.getByTestId('quadrant-filter-top-left'));
    expect(root).toHaveAttribute('data-filter', 'top-left');
    expect(screen.getByTestId('quadrant-filter-top-left')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('quadrant-filter-all')).toHaveAttribute('aria-pressed', 'false');
    expect(svg.querySelectorAll('[data-role="quadrant-item"]')).toHaveLength(1);
    expect(screen.getByTestId('quadrant-inspector-label')).toHaveTextContent('Fast Win');
    expect(screen.getByTestId('quadrant-inspector-badge')).toHaveTextContent('Quick Wins');

    // Filter to Reconsider (bottom-right) which has 0 items -> inspector shows empty-zone guidance
    fireEvent.click(screen.getByTestId('quadrant-filter-bottom-right'));
    expect(root).toHaveAttribute('data-filter', 'bottom-right');
    expect(svg.querySelectorAll('[data-role="quadrant-item"]')).toHaveLength(0);
    expect(screen.getByTestId('quadrant-inspector-empty-zone')).toHaveTextContent(
      'No initiatives in Reconsider'
    );

    // Click All pill to restore all 3 bubbles
    fireEvent.click(screen.getByTestId('quadrant-filter-all'));
    expect(root).toHaveAttribute('data-filter', 'all');
    expect(svg.querySelectorAll('[data-role="quadrant-item"]')).toHaveLength(3);
  });

  it('supports clicking bubbles and IME-safe keyboard navigation (Enter, Space, ArrowLeft, ArrowRight with wrap)', () => {
    const selections: QuadrantSelection[] = [];
    const onSelectItem = vi.fn((selection: QuadrantSelection) => {
      selections.push(selection);
    });

    const items: QuadrantItem[] = [
      { id: 'alpha', label: 'Alpha Launch', x: 20, y: 80, weight: 2, summary: 'High leverage.' },
      { id: 'beta', label: 'Beta Architecture', x: 80, y: 85 },
      { id: 'gamma', label: 'Gamma Cleanup', x: 75, y: 20, weight: 1 },
    ];

    render(
      <QuadrantMatrix
        title="Release Priorities"
        xLabel="Engineering Cost"
        yLabel="Customer Value"
        items={items}
        onSelectItem={onSelectItem}
      />
    );

    const alpha = screen.getByTestId('quadrant-item-alpha');
    const beta = screen.getByTestId('quadrant-item-beta');
    const gamma = screen.getByTestId('quadrant-item-gamma');

    expect(alpha).toHaveAttribute('tabindex', '0');
    expect(beta).toHaveAttribute('tabindex', '-1');

    // Click beta -> fires selection with quadrant metadata (and omits undefined weight/summary)
    fireEvent.click(beta);
    expect(onSelectItem).toHaveBeenCalledTimes(1);
    expect(selections[0]).toEqual({
      id: 'beta',
      label: 'Beta Architecture',
      x: 80,
      y: 85,
      quadrant: 'top-right',
      quadrantLabel: 'Major Bets',
    });
    expect(beta).toHaveAttribute('aria-pressed', 'true');
    expect(beta).toHaveAttribute('data-selected', 'true');
    expect(screen.getByTestId('quadrant-active-ring-beta')).toBeInTheDocument();

    // IME composing events MUST be ignored
    fireEvent.keyDown(beta, { key: 'Enter', isComposing: true });
    fireEvent.keyDown(beta, { key: 'ArrowRight', isComposing: true });
    expect(onSelectItem).toHaveBeenCalledTimes(1);

    // Unrelated keys MUST be ignored
    fireEvent.keyDown(beta, { key: 'Escape' });
    expect(onSelectItem).toHaveBeenCalledTimes(1);

    // Enter activates gamma
    fireEvent.keyDown(gamma, { key: 'Enter' });
    expect(onSelectItem).toHaveBeenCalledTimes(2);
    expect(selections[1]?.id).toBe('gamma');
    expect(selections[1]?.quadrant).toBe('bottom-right');
    expect(selections[1]?.quadrantLabel).toBe('Reconsider');

    // Space activates alpha (with weight and summary preserved)
    fireEvent.keyDown(alpha, { key: ' ' });
    expect(onSelectItem).toHaveBeenCalledTimes(3);
    expect(selections[2]).toEqual({
      id: 'alpha',
      label: 'Alpha Launch',
      x: 20,
      y: 80,
      weight: 2,
      summary: 'High leverage.',
      quadrant: 'top-left',
      quadrantLabel: 'Quick Wins',
    });

    // ArrowRight moves from alpha (index 0) -> beta (index 1) and focuses beta
    fireEvent.keyDown(alpha, { key: 'ArrowRight' });
    expect(onSelectItem).toHaveBeenCalledTimes(4);
    expect(selections[3]?.id).toBe('beta');
    expect(document.activeElement).toBe(beta);

    // ArrowLeft from alpha wraps cleanly to gamma (last item)
    fireEvent.keyDown(alpha, { key: 'ArrowLeft' });
    expect(onSelectItem).toHaveBeenCalledTimes(5);
    expect(selections[4]?.id).toBe('gamma');
    expect(document.activeElement).toBe(gamma);

    // ArrowRight from gamma wraps cleanly back to alpha (first item)
    fireEvent.keyDown(gamma, { key: 'ArrowRight' });
    expect(onSelectItem).toHaveBeenCalledTimes(6);
    expect(selections[5]?.id).toBe('alpha');
    expect(document.activeElement).toBe(alpha);
  });

  it('handles single-item matrix, custom labels, splitX/splitY clamping, and no-op arrow keys cleanly', () => {
    const onSelectItem = vi.fn();
    render(
      <QuadrantMatrix
        items={[
          {
            id: 'solo',
            label: 'Single Initiative With Extremely Long Title Beyond Limit',
            x: 88,
            y: 72,
            weight: 2.5,
            summary: '   ',
          },
        ]}
        quadrantLabels={{
          topLeft: 'Act Immediately',
          topRight: 'Strategic Bet',
          bottomLeft: '  ',
          bottomRight: 'Defer',
        }}
        splitX={4}
        splitY={140}
        onSelectItem={onSelectItem}
        data-testid="quadrant-single-root"
      />
    );

    const root = screen.getByTestId('quadrant-single-root');
    expect(root).toHaveAttribute('data-split-x', '10');
    expect(root).toHaveAttribute('data-split-y', '90');
    expect(screen.getByTestId('quadrant-total-count')).toHaveTextContent('1 initiative');

    // Custom labels + whitespace fallback to default 'Fill-Ins'
    expect(screen.getByTestId('quadrant-watermark-top-left')).toHaveTextContent('Act Immediately');
    expect(screen.getByTestId('quadrant-watermark-top-right')).toHaveTextContent('Strategic Bet');
    expect(screen.getByTestId('quadrant-watermark-bottom-left')).toHaveTextContent('Fill-Ins');
    expect(screen.getByTestId('quadrant-watermark-bottom-right')).toHaveTextContent('Defer');

    // At splitX=10, splitY=90 -> (88, 72) classifies as bottom-right ('Defer')
    const solo = screen.getByTestId('quadrant-item-solo');
    expect(solo).toHaveAttribute('data-quadrant', 'bottom-right');
    expect(screen.getByTestId('quadrant-inspector-badge')).toHaveTextContent('Defer');
    expect(screen.queryByTestId('quadrant-inspector-summary')).toBeNull();

    // Long label truncated inline with ellipsis, full label preserved in inspector
    const inlineLabel = solo.querySelector('[data-role="quadrant-item-label"]');
    expect(inlineLabel?.textContent).toMatch(/…$/);
    expect(inlineLabel).toHaveAttribute('text-anchor', 'end');
    expect(screen.getByTestId('quadrant-inspector-label')).toHaveTextContent(
      'Single Initiative With Extremely Long Title Beyond Limit'
    );

    // Equal-weight bubble radius equals mid radius (10.5)
    const bubble = solo.querySelector('[data-role="quadrant-bubble"]');
    expect(bubble).toHaveAttribute('r', '10.5');

    // Arrow navigation with only 1 visible item is a safe no-op
    fireEvent.keyDown(solo, { key: 'ArrowRight' });
    fireEvent.keyDown(solo, { key: 'ArrowLeft' });
    expect(onSelectItem).not.toHaveBeenCalled();
  });

  it('renders clean role="status" empty state when items is empty array', () => {
    render(<QuadrantMatrix items={[]} data-testid="quadrant-empty-root" />);

    const root = screen.getByTestId('quadrant-empty-root');
    expect(root).toHaveAttribute('data-empty', 'true');
    expect(screen.getByTestId('quadrant-total-count')).toHaveTextContent('0 initiatives');

    const empty = screen.getByTestId('quadrant-matrix-empty');
    expect(empty).toHaveAttribute('role', 'status');
    expect(empty).toHaveTextContent('No strategic initiatives available');
    expect(screen.queryByTestId('quadrant-matrix-svg')).toBeNull();
    expect(screen.queryByTestId('quadrant-inspector')).toBeNull();
  });

  it('defends against adversarial inputs: out-of-range/NaN coordinates, invalid weights, non-finite splits, and duplicate IDs', () => {
    const adversarialItems: QuadrantItem[] = [
      { id: 'dup', label: 'Clamped High', x: 180, y: 240, weight: -5 },
      { id: 'dup', label: 'Clamped Low', x: -40, y: -15, weight: Number.NaN },
      { id: 'fallback-pt', label: 'Fallback Point', x: Number.NaN, y: Number.POSITIVE_INFINITY, weight: 0 },
      { id: 'scaled-lo', label: 'Weight Min', x: 30, y: 70, weight: 1 },
      { id: 'scaled-hi', label: 'Weight Max', x: 40, y: 80, weight: 5 },
    ];

    const { container } = render(
      <QuadrantMatrix
        items={adversarialItems}
        splitX={Number.NaN}
        splitY={Number.POSITIVE_INFINITY}
        data-testid="quadrant-adversarial-root"
      />
    );

    const root = screen.getByTestId('quadrant-adversarial-root');
    expect(root).toHaveAttribute('data-split-x', '50');
    expect(root).toHaveAttribute('data-split-y', '50');

    const svg = screen.getByTestId('quadrant-matrix-svg');
    expect(svg.innerHTML).not.toContain('NaN');
    expect(svg.innerHTML).not.toContain('Infinity');
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);

    const renderedItems = svg.querySelectorAll('[data-role="quadrant-item"]');
    expect(renderedItems).toHaveLength(5);

    // Duplicate IDs both rendered safely and classified at clamped bounds (100,100) and (0,0)
    const dupNodes = screen.getAllByTestId('quadrant-item-dup');
    expect(dupNodes).toHaveLength(2);
    expect(dupNodes[0]).toHaveAttribute('data-quadrant', 'top-right');
    expect(dupNodes[1]).toHaveAttribute('data-quadrant', 'bottom-left');

    // Invalid weights fall back to default radius (9), while valid weights scale gently [7..13.5]
    const invalidBubble = screen
      .getByTestId('quadrant-item-fallback-pt')
      .querySelector('[data-role="quadrant-bubble"]');
    const minBubble = screen
      .getByTestId('quadrant-item-scaled-lo')
      .querySelector('[data-role="quadrant-bubble"]');
    const maxBubble = screen
      .getByTestId('quadrant-item-scaled-hi')
      .querySelector('[data-role="quadrant-bubble"]');

    expect(invalidBubble).toHaveAttribute('r', '9');
    expect(minBubble).toHaveAttribute('r', '7');
    expect(maxBubble).toHaveAttribute('r', '13.5');
  });
});
