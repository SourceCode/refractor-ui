import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { SunburstChart, type SunburstNode } from './SunburstChart';

const SAMPLE_TREE: SunburstNode = {
  id: 'cluster',
  label: 'Cluster Storage',
  children: [
    {
      id: 'models',
      label: 'Models',
      tone: 'primary',
      children: [
        {
          id: 'llm',
          label: 'LLM Weights',
          children: [
            {
              id: 'fp16',
              label: 'FP16 Shards',
              children: [{ id: 'shard-a', label: 'Shard Alpha', value: 120 }],
            },
            { id: 'int4', label: 'INT4', value: 60 },
          ],
        },
        { id: 'vision', label: 'Vision', value: 100 },
      ],
    },
    {
      id: 'datasets',
      label: 'Datasets',
      tone: 'emerald',
      children: [
        { id: 'train', label: 'Training', value: 140.5 },
        { id: 'eval', label: 'Eval', value: 59.5 },
      ],
    },
    {
      id: 'logs',
      label: 'Logs',
      tone: 'amber',
      value: 20,
    },
  ],
};

describe('SunburstChart', () => {
  it('renders concentric SVG rings up to 3 levels deep, forwards ref, merges theme overrides, and uses --prism-* tokens only', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <PrismThemeProvider
        theme={{
          components: {
            SunburstChart: { className: 'theme-sunburst', style: { maxWidth: '480px' } },
          },
        }}
      >
        <SunburstChart
          ref={ref}
          root={SAMPLE_TREE}
          valueUnit="GB"
          className="consumer-sunburst"
          xstyle={{ '--prism-blur-px': '14px' }}
          data-testid="sunburst-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('sunburst-root');
    expect(ref.current).toBe(root);
    expect(SunburstChart.displayName).toBe('SunburstChart');
    expect(root).toHaveClass(
      'refractor-sunburst-chart',
      'prism-slab',
      'theme-sunburst',
      'consumer-sunburst'
    );
    expect(root).toHaveStyle({ maxWidth: '480px' });
    expect(root).not.toHaveAttribute('data-zoomed');
    expect(root).not.toHaveAttribute('data-empty');

    const svg = screen.getByRole('img', {
      name: 'Hierarchical Sunburst focused on Cluster Storage',
    });
    expect(svg).toHaveAttribute('viewBox', '0 0 260 260');
    expect(svg.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(svg.innerHTML).not.toContain('NaN');
    expect(svg.innerHTML).toContain('var(--prism-primary-main)');
    expect(svg.innerHTML).toContain('var(--prism-success-main)');
    expect(svg.innerHTML).toContain('var(--prism-warning-main)');
    expect(svg.innerHTML).toContain('var(--prism-divider)');

    // Ring depths 1, 2, 3 are rendered; depth 4 ('shard-a') is NOT rendered until zoomed in
    expect(svg.querySelector('[data-node-id="models"]')).toHaveAttribute('data-ring-depth', '1');
    expect(svg.querySelector('[data-node-id="llm"]')).toHaveAttribute('data-ring-depth', '2');
    expect(svg.querySelector('[data-node-id="fp16"]')).toHaveAttribute('data-ring-depth', '3');
    expect(svg.querySelector('[data-node-id="shard-a"]')).toBeNull();

    // Progressively lighter fillOpacity per ring depth
    const op1 = Number(svg.querySelector('[data-node-id="models"]')?.getAttribute('fill-opacity'));
    const op2 = Number(svg.querySelector('[data-node-id="llm"]')?.getAttribute('fill-opacity'));
    const op3 = Number(svg.querySelector('[data-node-id="fp16"]')?.getAttribute('fill-opacity'));
    expect(op1).toBeGreaterThan(op2);
    expect(op2).toBeGreaterThan(op3);

    // Center shows truncated label (> 12 chars) and total (500GB)
    const center = screen.getByTestId('sunburst-center');
    expect(center).toHaveTextContent('Cluster Sto…');
    expect(center).toHaveTextContent('500GB');

    // No Reset Zoom button while at root
    expect(screen.queryByRole('button', { name: 'Reset Zoom' })).toBeNull();

    // Clicking center at root is a safe no-op
    fireEvent.click(center);
    expect(root).not.toHaveAttribute('data-zoomed');

    // Readout renders active focus summary
    expect(screen.getByTestId('sunburst-readout')).toHaveTextContent(
      'Cluster Storage: 500GB (100% of Cluster Storage)'
    );
  });

  it('zooms into arcs via click and IME-safe keyboard, reveals deeper rings, and zooms back out via center, breadcrumbs, and Reset Zoom', () => {
    const onZoomNode = vi.fn();
    render(
      <SunburstChart
        root={SAMPLE_TREE}
        title="Storage Hierarchy"
        valueUnit="GB"
        onZoomNode={onZoomNode}
        data-testid="zoom-sunburst"
      />
    );

    const rootEl = screen.getByTestId('zoom-sunburst');

    // Hover and focus preview updates live readout
    const modelsArc = screen.getByRole('button', {
      name: 'Models: 280GB (56% of Cluster Storage)',
    });
    fireEvent.mouseEnter(modelsArc);
    expect(screen.getByTestId('sunburst-readout')).toHaveTextContent(
      'Models: 280GB (56% of Cluster Storage)'
    );
    fireEvent.mouseLeave(modelsArc);
    expect(screen.getByTestId('sunburst-readout')).toHaveTextContent(
      'Cluster Storage: 500GB (100% of Cluster Storage)'
    );

    fireEvent.focus(modelsArc);
    expect(screen.getByTestId('sunburst-readout')).toHaveTextContent(
      'Models: 280GB (56% of Cluster Storage)'
    );
    fireEvent.blur(modelsArc);

    // Click depth-1 arc -> zooms to Models and exposes depth-4 node 'shard-a' at ring 3
    fireEvent.click(modelsArc);
    expect(rootEl).toHaveAttribute('data-zoomed', 'true');
    expect(onZoomNode).toHaveBeenCalledTimes(1);
    expect(onZoomNode.mock.calls[0]?.[0].id).toBe('models');
    expect(onZoomNode.mock.calls[0]?.[1].map((n: SunburstNode) => n.id)).toEqual([
      'cluster',
      'models',
    ]);
    expect(screen.getByRole('button', { name: 'Reset Zoom' })).toBeInTheDocument();

    const svgAfterModels = screen.getByRole('img', {
      name: 'Storage Hierarchy focused on Models',
    });
    expect(svgAfterModels.querySelector('[data-node-id="shard-a"]')).toHaveAttribute(
      'data-ring-depth',
      '3'
    );

    // IME composing Enter on arc must be ignored
    const fp16Arc = screen.getByRole('button', {
      name: /FP16 Shards: 120GB/,
    });
    fireEvent.keyDown(fp16Arc, { key: 'Enter', isComposing: true });
    expect(onZoomNode).toHaveBeenCalledTimes(1);

    // Non-activation key on arc must be ignored
    fireEvent.keyDown(fp16Arc, { key: 'Escape' });
    expect(onZoomNode).toHaveBeenCalledTimes(1);

    // Enter key zooms directly into depth-2 arc (pushing intermediate 'llm' + 'fp16')
    fireEvent.keyDown(fp16Arc, { key: 'Enter' });
    expect(onZoomNode).toHaveBeenCalledTimes(2);
    expect(onZoomNode.mock.calls[1]?.[0].id).toBe('fp16');
    expect(onZoomNode.mock.calls[1]?.[1].map((n: SunburstNode) => n.id)).toEqual([
      'cluster',
      'models',
      'llm',
      'fp16',
    ]);

    // Single child ('shard-a') renders as a non-degenerate full-360° ring
    const shardArc = screen.getByRole('button', { name: 'Shard Alpha: 120GB (100% of FP16 Shards)' });
    expect(shardArc).toHaveAttribute('data-full-circle', 'true');
    expect(shardArc).toHaveAttribute('fill-rule', 'evenodd');
    expect(shardArc.getAttribute('d')).not.toContain('NaN');

    // Space key zooms into leaf node ('shard-a')
    fireEvent.keyDown(shardArc, { key: ' ' });
    expect(onZoomNode).toHaveBeenCalledTimes(3);
    expect(onZoomNode.mock.calls[2]?.[0].id).toBe('shard-a');
    expect(screen.getByTestId('sunburst-readout')).toHaveTextContent(
      'Leaf focus · Click center or breadcrumb to zoom out.'
    );

    // Center disc IME composing & non-activation key ignored
    const centerDisc = screen.getByTestId('sunburst-center');
    fireEvent.keyDown(centerDisc, { key: 'Enter', isComposing: true });
    fireEvent.keyDown(centerDisc, { key: 'Tab' });
    expect(onZoomNode).toHaveBeenCalledTimes(3);

    // Keyboard Enter on center disc steps back 1 level to 'fp16'
    fireEvent.keyDown(centerDisc, { key: 'Enter' });
    expect(onZoomNode).toHaveBeenCalledTimes(4);
    expect(onZoomNode.mock.calls[3]?.[0].id).toBe('fp16');

    // Keyboard Space on center disc steps back 1 level to 'llm'
    fireEvent.keyDown(screen.getByTestId('sunburst-center'), { key: ' ' });
    expect(onZoomNode).toHaveBeenCalledTimes(5);
    expect(onZoomNode.mock.calls[4]?.[0].id).toBe('llm');

    // Clicking center disc steps back 1 level to 'models'
    fireEvent.click(screen.getByTestId('sunburst-center'));
    expect(onZoomNode).toHaveBeenCalledTimes(6);
    expect(onZoomNode.mock.calls[5]?.[0].id).toBe('models');

    // Zoom into Vision, then click 'Models' breadcrumb pill
    fireEvent.click(screen.getByRole('button', { name: /Vision: 100GB/ }));
    expect(onZoomNode).toHaveBeenCalledTimes(7);
    fireEvent.click(screen.getByRole('button', { name: 'Models' }));
    expect(onZoomNode).toHaveBeenCalledTimes(8);
    expect(onZoomNode.mock.calls[7]?.[0].id).toBe('models');

    // Reset Zoom button returns directly to root
    fireEvent.click(screen.getByRole('button', { name: 'Reset Zoom' }));
    expect(onZoomNode).toHaveBeenCalledTimes(9);
    expect(onZoomNode.mock.calls[8]?.[0].id).toBe('cluster');
    expect(rootEl).not.toHaveAttribute('data-zoomed');
  });

  it('bounds recursion to max depth 6, defends against cyclic references, auto-cycles tones, clamps size, and handles prop updates cleanly', () => {
    // Build a cyclic node graph + 8-level deep chain + invalid values + tiny slice
    const cyclicChild: SunburstNode = { id: 'cycle-a', label: 'Cycle A', value: 25 };
    cyclicChild.children = [cyclicChild, { id: 'valid-in-cycle', label: 'Valid', value: 30 }];

    const deepChain: SunburstNode = {
      id: 'd1',
      label: 'D1',
      children: [
        {
          id: 'd2',
          label: 'D2',
          children: [
            {
              id: 'd3',
              label: 'D3',
              children: [
                {
                  id: 'd4',
                  label: 'D4',
                  children: [
                    {
                      id: 'd5',
                      label: 'D5',
                      children: [
                        {
                          id: 'd6',
                          label: 'D6 Boundary',
                          value: 40,
                          children: [{ id: 'd7', label: 'Too Deep', value: 999 }],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const complexRoot: SunburstNode = {
      id: 'complex',
      label: 'Root',
      children: [
        cyclicChild,
        deepChain,
        { id: 'c3', label: 'C3', value: 10 },
        { id: 'c4', label: 'C4', value: 10 },
        { id: 'c5', label: 'C5', value: 0.05 }, // tiny slice (< 0.03 rad)
        { id: 'bad-neg', label: 'Neg', value: -50 },
        { id: 'bad-nan', label: 'NaN', value: Number.NaN },
        { id: 'empty-arr', label: 'Empty Arr Leaf', value: 15, children: [] },
      ],
    };

    const { rerender } = render(<SunburstChart root={complexRoot} size={100} />);

    // Size clamped to 180
    const svgSmall = screen.getByRole('img');
    expect(svgSmall).toHaveAttribute('viewBox', '0 0 180 180');
    expect(svgSmall.innerHTML).not.toContain('NaN');
    // Total = 30 (cycle valid) + 40 (d6 boundary, NOT 999 from d7) + 10 + 10 + 0.05 + 15 = 105.05
    expect(screen.getByTestId('sunburst-readout')).toHaveTextContent('Root: 105.05 (100% of Root)');
    // Auto-cycled tones include secondary, emerald, amber, rose
    expect(svgSmall.innerHTML).toContain('var(--prism-secondary-main)');
    expect(svgSmall.innerHTML).toContain('var(--prism-success-main)');
    expect(svgSmall.innerHTML).toContain('var(--prism-warning-main)');
    expect(svgSmall.innerHTML).toContain('var(--prism-error-main)');

    // Zoom into c3, then remove c3 in rerender -> focus resolves safely back to root
    fireEvent.click(screen.getByRole('button', { name: /C3: 10/ }));
    expect(screen.getByRole('button', { name: 'Reset Zoom' })).toBeInTheDocument();

    rerender(
      <SunburstChart
        root={{
          id: 'complex',
          label: 'Root',
          children: [{ id: 'only', label: 'Only', value: 100 }],
        }}
        size={600}
      />
    );
    expect(screen.getByRole('img')).toHaveAttribute('viewBox', '0 0 400 400');
    expect(screen.queryByRole('button', { name: 'Reset Zoom' })).toBeNull();

    // Rerender with different root id & NaN size -> resets focus and uses default size 260
    rerender(
      <SunburstChart
        root={{ id: 'different-root', label: 'New Root', value: 50 }}
        size={Number.NaN}
      />
    );
    expect(screen.getByRole('img')).toHaveAttribute('viewBox', '0 0 260 260');
    expect(screen.getByTestId('sunburst-readout')).toHaveTextContent(
      'New Root: 50 (100% of New Root)'
    );
  });

  it('renders clean empty states for non-positive hierarchies and neutralizes XSS payloads', () => {
    const { rerender } = render(
      <SunburstChart
        root={{
          id: 'zero',
          label: 'Zero Root',
          children: [
            { id: 'a', label: 'A', value: 0 },
            { id: 'b', label: 'B', value: -10 },
            { id: 'c', label: 'C', value: Number.POSITIVE_INFINITY },
          ],
        }}
        data-testid="empty-sunburst"
      />
    );

    expect(screen.getByTestId('empty-sunburst')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByTestId('sunburst-empty')).toHaveTextContent(
      'No hierarchical data to display.'
    );
    expect(screen.queryByTestId('sunburst-readout')).toBeNull();

    const payload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';
    rerender(
      <SunburstChart
        title={payload}
        root={{
          id: 'xss-root',
          label: payload,
          children: [{ id: 'xss-child', label: payload, value: 42 }],
        }}
      />
    );
    expect(screen.getByRole('heading', { name: payload })).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
  });
});
