import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  NetworkForceGraph,
  type NetworkEdge,
  type NetworkNode,
  type NetworkNodeTone,
} from './index';

const SAMPLE_NODES: NetworkNode[] = [
  { id: 'gw', label: 'API Gateway', group: 'Edge', weight: 10, tone: 'primary' },
  { id: 'auth', label: 'Auth Core', group: 'Core', weight: 6, tone: 'emerald' },
  { id: 'ml', label: 'Inference Pool', group: 'Compute', weight: 8, tone: 'secondary' },
  { id: 'db', label: 'Primary Store', group: 'Core', weight: 2 },
  { id: 'audit', label: 'Audit Sink', group: 'Edge', weight: 4, tone: 'rose' },
];

const SAMPLE_EDGES: NetworkEdge[] = [
  { id: 'e1', source: 'gw', target: 'auth', label: 'gRPC', weight: 3 },
  { id: 'e2', source: 'gw', target: 'ml', label: 'HTTP/3', weight: 2 },
  { id: 'e3', source: 'auth', target: 'db', label: 'TLS' },
];

describe('NetworkForceGraph', () => {
  it('renders optical force graph with ref, theme override, --prism-* tokens, count pill, weight radii, and bounded coordinates', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            NetworkForceGraph: {
              className: 'theme-network',
              style: { maxWidth: '760px' },
            },
          },
        }}
      >
        <NetworkForceGraph
          ref={ref}
          title="Service Mesh Topology"
          nodes={SAMPLE_NODES}
          edges={SAMPLE_EDGES}
          className="local-network"
          xstyle={{ '--prism-blur-px': '20px' }}
          style={{ marginTop: '8px' }}
          data-testid="network-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('network-root');
    expect(ref.current).toBe(root);
    expect(NetworkForceGraph.displayName).toBe('NetworkForceGraph');
    expect(root).toHaveClass(
      'refractor-network-force-graph',
      'prism-slab',
      'theme-network',
      'local-network'
    );
    expect(root).toHaveStyle({ maxWidth: '760px', marginTop: '8px' });
    expect(root).not.toHaveAttribute('data-empty');
    expect(root).not.toHaveAttribute('data-zoomed');

    expect(screen.getByTestId('network-count-pill')).toHaveTextContent('5 nodes · 3 edges');

    const svg = screen.getByRole('img', { name: 'Service Mesh Topology' });
    expect(svg).toHaveAttribute('viewBox', '0 0 600 280');
    expect(svg.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(svg.innerHTML).not.toMatch(/\brgba?\s*\(/i);
    expect(svg.innerHTML).not.toMatch(/\bhsla?\s*\(/i);
    expect(svg.innerHTML).not.toContain('NaN');

    // Every node stays cleanly clamped within the 600x280 viewport
    for (const node of SAMPLE_NODES) {
      const circle = screen.getByTestId(`network-node-${node.id}`);
      const cx = Number(circle.getAttribute('cx'));
      const cy = Number(circle.getAttribute('cy'));
      expect(cx).toBeGreaterThanOrEqual(52);
      expect(cx).toBeLessThanOrEqual(548);
      expect(cy).toBeGreaterThanOrEqual(32);
      expect(cy).toBeLessThanOrEqual(238);
      expect(circle).toHaveAttribute('data-state', 'idle');
      expect(screen.getByTestId(`network-node-label-${node.id}`)).toHaveTextContent(node.label);
    }

    // Weight-based radii: db (weight 2 -> 10), gw (weight 10 -> 22), auth (weight 6 -> 16)
    expect(Number(screen.getByTestId('network-node-db').getAttribute('r'))).toBeCloseTo(10, 5);
    expect(Number(screen.getByTestId('network-node-auth').getAttribute('r'))).toBeCloseTo(16, 5);
    expect(Number(screen.getByTestId('network-node-gw').getAttribute('r'))).toBeCloseTo(22, 5);

    // Semantic --prism-* token fills (including group-inherited emerald on db)
    expect(screen.getByTestId('network-node-gw')).toHaveAttribute('fill', 'var(--prism-primary-main)');
    expect(screen.getByTestId('network-node-auth')).toHaveAttribute('fill', 'var(--prism-success-main)');
    expect(screen.getByTestId('network-node-db')).toHaveAttribute('fill', 'var(--prism-success-main)');
    expect(screen.getByTestId('network-node-ml')).toHaveAttribute('fill', 'var(--prism-secondary-main)');
    expect(screen.getByTestId('network-node-audit')).toHaveAttribute('fill', 'var(--prism-error-main)');

    // Neutral idle edges use var(--prism-divider) and show edge labels
    expect(screen.getByTestId('network-edge-e1')).toHaveAttribute('stroke', 'var(--prism-divider)');
    expect(screen.getByTestId('network-edge-e1')).toHaveAttribute('data-active', 'false');
    expect(screen.getByTestId('network-edge-label-e1')).toHaveTextContent('gRPC');

    // Recessed inspector shows idle hint before selection
    expect(screen.getByTestId('network-inspector')).toHaveClass('prism-well');
    expect(screen.getByTestId('network-inspector')).toHaveTextContent('Select a node to inspect');
  });

  it('produces 100% deterministic node & edge coordinates across independent renders', () => {
    const first = render(<NetworkForceGraph nodes={SAMPLE_NODES} edges={SAMPLE_EDGES} />);
    const coordsA = SAMPLE_NODES.map((n) => {
      const el = screen.getByTestId(`network-node-${n.id}`);
      return { cx: el.getAttribute('cx'), cy: el.getAttribute('cy'), r: el.getAttribute('r') };
    });
    first.unmount();

    render(<NetworkForceGraph nodes={SAMPLE_NODES} edges={SAMPLE_EDGES} />);
    const coordsB = SAMPLE_NODES.map((n) => {
      const el = screen.getByTestId(`network-node-${n.id}`);
      return { cx: el.getAttribute('cx'), cy: el.getAttribute('cy'), r: el.getAttribute('r') };
    });

    expect(coordsB).toEqual(coordsA);
  });

  it('highlights direct neighbors & incident edges, dims non-neighbors, updates inspector, and supports keyboard + IME safety', () => {
    const onSelectNode = vi.fn<(node: NetworkNode, degree: number) => void>();

    render(
      <NetworkForceGraph
        nodes={SAMPLE_NODES}
        edges={SAMPLE_EDGES}
        onSelectNode={onSelectNode}
        data-testid="interactive-root"
      />
    );

    // Click 'gw' (degree 2, neighbors: auth & ml; non-neighbors: db & audit)
    const gwNode = screen.getByTestId('network-node-gw');
    fireEvent.click(gwNode);

    expect(onSelectNode).toHaveBeenCalledWith(SAMPLE_NODES[0], 2);
    expect(screen.getByTestId('interactive-root')).toHaveAttribute('data-selected', 'true');
    expect(gwNode).toHaveAttribute('aria-pressed', 'true');
    expect(gwNode).toHaveAttribute('data-state', 'selected');
    expect(screen.getByTestId('network-active-ring-gw')).toBeInTheDocument();

    // Direct neighbors highlighted
    expect(screen.getByTestId('network-node-auth')).toHaveAttribute('data-state', 'neighbor');
    expect(screen.getByTestId('network-node-ml')).toHaveAttribute('data-state', 'neighbor');
    expect(screen.getByTestId('network-node-group-auth')).toHaveAttribute('opacity', '1');

    // Non-neighbors dimmed
    expect(screen.getByTestId('network-node-db')).toHaveAttribute('data-state', 'dimmed');
    expect(screen.getByTestId('network-node-audit')).toHaveAttribute('data-state', 'dimmed');
    expect(screen.getByTestId('network-node-group-db')).toHaveAttribute('opacity', '0.22');

    // Incident edges highlighted with var(--prism-primary-main); non-incident edges use var(--prism-divider)
    expect(screen.getByTestId('network-edge-e1')).toHaveAttribute('stroke', 'var(--prism-primary-main)');
    expect(screen.getByTestId('network-edge-e1')).toHaveAttribute('data-active', 'true');
    expect(screen.getByTestId('network-edge-e2')).toHaveAttribute('stroke', 'var(--prism-primary-main)');
    expect(screen.getByTestId('network-edge-e3')).toHaveAttribute('stroke', 'var(--prism-divider)');
    expect(screen.getByTestId('network-edge-e3')).toHaveAttribute('data-active', 'false');

    // Inspector shows label, group, prism-emerald degree pill, weight, and clickable neighbors
    expect(screen.getByTestId('network-inspector-label')).toHaveTextContent('API Gateway');
    expect(screen.getByTestId('network-inspector-group')).toHaveTextContent('Edge');
    expect(screen.getByTestId('network-inspector-degree')).toHaveClass('prism-emerald');
    expect(screen.getByTestId('network-inspector-degree')).toHaveTextContent('Degree: 2');
    expect(screen.getByTestId('network-inspector-weight')).toHaveTextContent('Weight: 10');
    expect(screen.getByTestId('network-neighbor-pill-auth')).toHaveTextContent('Auth Core');
    expect(screen.getByTestId('network-neighbor-pill-ml')).toHaveTextContent('Inference Pool');

    // Clicking neighbor pill navigates selection directly to Auth Core (degree 2)
    fireEvent.click(screen.getByTestId('network-neighbor-pill-auth'));
    expect(onSelectNode).toHaveBeenLastCalledWith(SAMPLE_NODES[1], 2);
    expect(screen.getByTestId('network-inspector-label')).toHaveTextContent('Auth Core');

    // Keyboard Enter selects isolated node 'audit' (degree 0)
    const auditNode = screen.getByTestId('network-node-audit');
    fireEvent.keyDown(auditNode, { key: 'Enter' });
    expect(onSelectNode).toHaveBeenLastCalledWith(SAMPLE_NODES[4], 0);
    expect(screen.getByTestId('network-inspector-degree')).toHaveTextContent('Degree: 0');
    expect(screen.getByTestId('network-inspector-neighbors')).toHaveTextContent('None (isolated node)');

    // Keyboard Space selects 'db' (degree 1)
    const dbNode = screen.getByTestId('network-node-db');
    fireEvent.keyDown(dbNode, { key: ' ' });
    expect(onSelectNode).toHaveBeenLastCalledWith(SAMPLE_NODES[3], 1);

    // Unrelated key does not fire callback
    const callsBefore = onSelectNode.mock.calls.length;
    fireEvent.keyDown(dbNode, { key: 'ArrowRight' });
    expect(onSelectNode).toHaveBeenCalledTimes(callsBefore);

    // IME composition Enter is ignored
    const imeEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    Object.defineProperty(imeEvent, 'isComposing', { value: true });
    gwNode.dispatchEvent(imeEvent);
    expect(onSelectNode).toHaveBeenCalledTimes(callsBefore);

    // Escape clears selection
    fireEvent.keyDown(dbNode, { key: 'Escape' });
    expect(screen.getByTestId('network-inspector')).toHaveTextContent('Select a node to inspect');
    expect(screen.getByTestId('network-node-db')).toHaveAttribute('data-state', 'idle');

    // Escape when already unselected is a clean no-op
    fireEvent.keyDown(dbNode, { key: 'Escape' });
    expect(onSelectNode).toHaveBeenCalledTimes(callsBefore);

    // Clear button clears selection
    fireEvent.click(gwNode);
    fireEvent.click(screen.getByTestId('network-inspector-clear'));
    expect(screen.getByTestId('network-inspector')).toHaveTextContent('Select a node to inspect');
  });

  it('supports Zoom Out / Reset / Zoom In controls bounded to 0.75x..2x in 0.25x steps', () => {
    render(
      <NetworkForceGraph
        nodes={SAMPLE_NODES}
        edges={SAMPLE_EDGES}
        data-testid="zoom-root"
      />
    );

    const zoomOut = screen.getByRole('button', { name: 'Zoom Out' });
    const reset = screen.getByRole('button', { name: 'Reset' });
    const zoomIn = screen.getByRole('button', { name: 'Zoom In' });
    const stage = screen.getByTestId('network-graph-stage');

    expect(screen.getByTestId('network-zoom-value')).toHaveTextContent('1x');
    expect(zoomOut).not.toBeDisabled();
    expect(zoomIn).not.toBeDisabled();

    // Step down to 0.75x -> disables Zoom Out
    fireEvent.click(zoomOut);
    expect(screen.getByTestId('network-zoom-value')).toHaveTextContent('0.75x');
    expect(zoomOut).toBeDisabled();
    expect(stage.getAttribute('transform')).toContain('scale(0.75)');
    expect(screen.getByTestId('zoom-root')).toHaveAttribute('data-zoomed', 'true');

    // Reset restores 1x
    fireEvent.click(reset);
    expect(screen.getByTestId('network-zoom-value')).toHaveTextContent('1x');
    expect(zoomOut).not.toBeDisabled();
    expect(stage.getAttribute('transform')).toContain('scale(1)');
    expect(screen.getByTestId('zoom-root')).not.toHaveAttribute('data-zoomed');

    // Step up to 2x (4 clicks of +0.25x) -> disables Zoom In
    fireEvent.click(zoomIn);
    expect(screen.getByTestId('network-zoom-value')).toHaveTextContent('1.25x');
    fireEvent.click(zoomIn);
    expect(screen.getByTestId('network-zoom-value')).toHaveTextContent('1.5x');
    fireEvent.click(zoomIn);
    expect(screen.getByTestId('network-zoom-value')).toHaveTextContent('1.75x');
    fireEvent.click(zoomIn);
    expect(screen.getByTestId('network-zoom-value')).toHaveTextContent('2x');
    expect(zoomIn).toBeDisabled();
    expect(stage.getAttribute('transform')).toContain('scale(2)');
  });

  it('filters cluster groups cleanly, updates counts, handles all-hidden empty state, and restores groups', () => {
    render(
      <NetworkForceGraph
        nodes={SAMPLE_NODES}
        edges={SAMPLE_EDGES}
        data-testid="filter-root"
      />
    );

    const edgeBtn = screen.getByTestId('network-group-Edge');
    const coreBtn = screen.getByTestId('network-group-Core');
    const computeBtn = screen.getByTestId('network-group-Compute');

    // Select gw (in Edge group), then hide Edge group -> selection clears and edges connected to Edge vanish
    fireEvent.click(screen.getByTestId('network-node-gw'));
    fireEvent.click(edgeBtn);
    expect(edgeBtn).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByTestId('network-node-gw')).not.toBeInTheDocument();
    expect(screen.getByTestId('network-count-pill')).toHaveTextContent('3 nodes · 1 edges');
    expect(screen.getByTestId('network-inspector')).toHaveTextContent('Select a node to inspect');

    // Hide remaining groups -> clean empty state
    fireEvent.click(coreBtn);
    fireEvent.click(computeBtn);
    expect(screen.getByTestId('filter-root')).toHaveAttribute('data-all-hidden', 'true');
    expect(screen.getByTestId('network-count-pill')).toHaveTextContent('0 nodes · 0 edges');
    expect(screen.getByTestId('network-graph-empty')).toHaveTextContent('All cluster groups hidden');
    expect(screen.queryByTestId('network-force-svg')).not.toBeInTheDocument();

    // Restore Edge group
    fireEvent.click(edgeBtn);
    expect(edgeBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('filter-root')).not.toHaveAttribute('data-all-hidden');
    expect(screen.getByTestId('network-node-gw')).toBeInTheDocument();
    expect(screen.getByTestId('network-count-pill')).toHaveTextContent('2 nodes · 0 edges');
  });

  it('cycles all 5 tones when ungrouped, scales radii by degree without weight, clamps height 180..520, and handles single-node topology', () => {
    const ungroupedNodes: NetworkNode[] = [
      { id: 'n1', label: 'Hub' },
      { id: 'n2', label: 'Spoke A' },
      { id: 'n3', label: 'Spoke B' },
      { id: 'n4', label: 'Spoke C' },
      { id: 'n5', label: 'Leaf' },
    ];
    const starEdges: NetworkEdge[] = [
      { id: 's1', source: 'n1', target: 'n2' },
      { id: 's2', source: 'n1', target: 'n3' },
      { id: 's3', source: 'n1', target: 'n4' },
    ];
    const expectedTones: NetworkNodeTone[] = ['primary', 'secondary', 'emerald', 'amber', 'rose'];

    const { rerender } = render(
      <NetworkForceGraph nodes={ungroupedNodes} edges={starEdges} height={90} />
    );

    expect(screen.getByRole('heading', { name: 'Topology Network Graph' })).toBeInTheDocument();
    expect(screen.queryByTestId('network-group-filters')).not.toBeInTheDocument();
    expect(screen.getByTestId('network-force-svg')).toHaveAttribute('viewBox', '0 0 600 180');

    expectedTones.forEach((tone, index) => {
      expect(screen.getByTestId(`network-node-n${index + 1}`)).toHaveAttribute('data-tone', tone);
    });
    expect(screen.getByTestId('network-node-n4')).toHaveAttribute('fill', 'var(--prism-warning-main)');

    // Degree-based radius scaling: n1 (degree 3 -> 22), n5 (degree 0 -> 10)
    expect(Number(screen.getByTestId('network-node-n1').getAttribute('r'))).toBeCloseTo(22, 5);
    expect(Number(screen.getByTestId('network-node-n5').getAttribute('r'))).toBeCloseTo(10, 5);

    // Selecting ungrouped node without weight displays 'Ungrouped' and omits weight pill
    fireEvent.click(screen.getByTestId('network-node-n1'));
    expect(screen.getByTestId('network-inspector-group')).toHaveTextContent('Ungrouped');
    expect(screen.queryByTestId('network-inspector-weight')).not.toBeInTheDocument();

    // Upper clamp 520 and NaN fallback 280
    rerender(<NetworkForceGraph nodes={ungroupedNodes} edges={starEdges} height={900} />);
    expect(screen.getByTestId('network-force-svg')).toHaveAttribute('viewBox', '0 0 600 520');

    rerender(<NetworkForceGraph nodes={ungroupedNodes} edges={starEdges} height={Number.NaN} />);
    expect(screen.getByTestId('network-force-svg')).toHaveAttribute('viewBox', '0 0 600 280');

    // Single-node topology centers cleanly at (300, 140) with default radius 14
    rerender(
      <NetworkForceGraph
        nodes={[{ id: 'solo', label: 'Solo Node' }]}
        edges={[]}
      />
    );
    const solo = screen.getByTestId('network-node-solo');
    expect(Number(solo.getAttribute('cx'))).toBe(300);
    expect(Number(solo.getAttribute('cy'))).toBe(140);
    expect(Number(solo.getAttribute('r'))).toBe(14);
  });

  it('defends against XSS payloads, prototype-polluting IDs, duplicate/dangling/self-loop edges, invalid weights, and empty inputs', () => {
    const xssTitle = '<script>window.__netXss=1</script><img src=x onerror=alert(1)>';
    const { rerender } = render(
      <NetworkForceGraph
        title={xssTitle}
        nodes={[
          { id: '   ', label: 'Blank ID' },
          { id: '__proto__', label: '<svg onload=alert(1)>Proto', group: '  ', weight: -5 },
          { id: '__proto__', label: 'Duplicate Proto' },
          { id: 'constructor', label: 'Ctor', group: 'SafeGroup', weight: Number.NaN },
          { id: 'prototype', label: 'ProtoType', group: 'SafeGroup', weight: Number.POSITIVE_INFINITY },
        ]}
        edges={[
          { id: '   ', source: '__proto__', target: 'constructor' },
          { id: 'self', source: '__proto__', target: '__proto__' },
          { id: 'dangling', source: '__proto__', target: 'missing-node' },
          { id: 'valid-1', source: '__proto__', target: 'constructor', label: '   ', weight: -2 },
          { id: 'valid-1', source: 'constructor', target: 'prototype', label: 'dup-id' },
          { id: 'valid-2', source: 'constructor', target: 'prototype', label: '<img src=x>', weight: Number.NaN },
        ]}
      />
    );

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByRole('heading', { name: xssTitle })).toBeInTheDocument();
    expect(screen.getByTestId('network-count-pill')).toHaveTextContent('3 nodes · 2 edges');
    expect(screen.getByTestId('network-force-svg').innerHTML).not.toContain('NaN');
    expect(screen.getByTestId('network-edge-label-valid-2')).toHaveTextContent('<img src=x>');
    expect(screen.queryByTestId('network-edge-self')).not.toBeInTheDocument();
    expect(screen.queryByTestId('network-edge-dangling')).not.toBeInTheDocument();

    // Empty nodes list renders clean empty state
    rerender(
      <NetworkForceGraph
        nodes={[]}
        edges={[]}
        data-testid="empty-network"
      />
    );
    expect(screen.getByTestId('empty-network')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByTestId('network-graph-empty')).toHaveTextContent(
      'No network topology nodes available.'
    );
    expect(screen.queryByTestId('network-force-svg')).not.toBeInTheDocument();
  });
});
