import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  NodeGraphCanvas,
  type FlowEdge,
  type FlowNode,
  type FlowNodeTone,
} from './index';

const SAMPLE_NODES: ReadonlyArray<FlowNode> = [
  { id: 'n1', label: 'Webhook Trigger', category: 'Input', x: 40, y: 80, tone: 'primary' },
  { id: 'n2', label: 'Optical Classifier', category: 'Model', x: 320, y: 120, tone: 'emerald' },
  { id: 'n3', label: 'Vector Sink', category: 'Output', x: 600, y: 160, tone: 'cobalt' },
  { id: 'n4', label: 'Audit Logger', x: 320, y: 260, tone: 'crystal' },
];

const SAMPLE_EDGES: ReadonlyArray<FlowEdge> = [
  { id: 'e1', sourceId: 'n1', targetId: 'n2', label: 'JSON' },
  { id: 'e2', sourceId: 'n2', targetId: 'n3' },
];

function mockViewportRect(el: HTMLElement, width = 800, height = 400) {
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    width,
    height,
    right: width,
    bottom: height,
    toJSON: () => ({}),
  });
}

describe('NodeGraphCanvas', () => {
  it('renders prism-slab canvas, studio grid, nodes, cubic bezier edges, theme overrides, and React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            NodeGraphCanvas: { className: 'theme-graph', style: { maxWidth: '960px' } },
          },
        }}
      >
        <NodeGraphCanvas
          ref={ref}
          defaultNodes={SAMPLE_NODES}
          defaultEdges={SAMPLE_EDGES}
          height={440}
          className="local-graph"
          xstyle={{ '--prism-blur-px': '20px' }}
          style={{ borderRadius: '28px' }}
          data-testid="graph-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('graph-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'refractor-node-graph-canvas',
      'prism-slab',
      'theme-graph',
      'local-graph'
    );
    expect(root).toHaveStyle({ height: '440px', maxWidth: '960px', borderRadius: '28px' });

    const viewport = screen.getByTestId('node-graph-viewport');
    expect(viewport).toHaveClass('prism-studio-grid', 'refractor-node-graph-canvas__viewport');

    expect(screen.getByTestId('node-graph-telemetry')).toHaveTextContent('4 nodes · 2 edges');
    expect(screen.getByTestId('node-graph-zoom-readout')).toHaveTextContent('100%');

    // Verify all 4 tones render with expected data attributes
    expect(screen.getByTestId('flow-node-n1')).toHaveAttribute('data-tone', 'primary');
    expect(screen.getByTestId('flow-node-n2')).toHaveAttribute('data-tone', 'emerald');
    expect(screen.getByTestId('flow-node-n3')).toHaveAttribute('data-tone', 'cobalt');
    expect(screen.getByTestId('flow-node-n4')).toHaveAttribute('data-tone', 'crystal');

    // Verify token-driven SVG cubic bezier edges (no raw color literals)
    const edge1 = screen.getByTestId('flow-edge-path-e1');
    expect(edge1).toHaveAttribute('stroke', 'var(--prism-secondary-main)');
    expect(edge1.getAttribute('d')).toMatch(/^M 216 122 C .+ 320 162$/);
    expect(screen.getByTestId('flow-edge-badge-e1')).toHaveTextContent('JSON');

    // Selecting a node highlights incident edges with var(--prism-primary-main)
    fireEvent.click(screen.getByTestId('flow-node-n1'));
    expect(screen.getByTestId('flow-node-n1')).toHaveAttribute('data-selected', 'true');
    // Clicking an edge badge stops propagation and preserves selection
    fireEvent.pointerDown(screen.getByTestId('flow-edge-badge-e1'));
    fireEvent.click(screen.getByTestId('flow-edge-badge-e1'));
    expect(screen.getByTestId('flow-node-n1')).toHaveAttribute('data-selected', 'true');
    expect(screen.getByTestId('flow-edge-path-e1')).toHaveAttribute(
      'stroke',
      'var(--prism-primary-main)'
    );
    expect(screen.getByTestId('flow-edge-path-e2')).toHaveAttribute(
      'stroke',
      'var(--prism-secondary-main)'
    );
  });

  it('adds nodes with tone cycling & collision-safe IDs, deletes selected node with incident edges, and removes individual edges', () => {
    const onNodesChange = vi.fn<(nodes: FlowNode[]) => void>();
    const onEdgesChange = vi.fn<(edges: FlowEdge[]) => void>();
    const onSelectNode = vi.fn<(node: FlowNode | null) => void>();

    render(
      <NodeGraphCanvas
        defaultNodes={[
          { id: 'node-1', label: 'Existing', x: 50, y: 60, tone: 'primary' },
          { id: 'n2', label: 'Target', x: 300, y: 60, tone: 'emerald' },
        ]}
        defaultEdges={[
          { id: 'e1', sourceId: 'node-1', targetId: 'n2', label: 'Pipe' },
        ]}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onSelectNode={onSelectNode}
      />
    );

    // Delete button disabled until a node is selected
    const deleteBtn = screen.getByRole('button', { name: 'Delete selected node' });
    expect(deleteBtn).toBeDisabled();

    // Add 3 new nodes to exercise tone cycling (2 -> cobalt, 3 -> crystal, 4 -> primary) and ID collision skip ('node-1')
    const addBtn = screen.getByRole('button', { name: 'Add Node' });
    fireEvent.click(addBtn);
    expect(screen.getByTestId('flow-node-node-2')).toHaveAttribute('data-tone', 'cobalt');
    expect(onNodesChange).toHaveBeenCalledTimes(1);
    expect(onSelectNode).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'node-2', tone: 'cobalt' })
    );

    fireEvent.click(addBtn);
    expect(screen.getByTestId('flow-node-node-3')).toHaveAttribute('data-tone', 'crystal');
    fireEvent.click(addBtn);
    expect(screen.getByTestId('flow-node-node-4')).toHaveAttribute('data-tone', 'primary');
    fireEvent.click(addBtn);
    expect(screen.getByTestId('flow-node-node-5')).toHaveAttribute('data-tone', 'emerald');

    expect(screen.getByTestId('node-graph-telemetry')).toHaveTextContent('6 nodes · 1 edge');

    // Start connecting from node-1, then select and delete node-1 -> incident edge removed & connection cleared
    fireEvent.click(screen.getByTestId('node-output-port-node-1'));
    expect(screen.getByTestId('node-graph-connecting-status')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('flow-node-node-1'));
    expect(deleteBtn).toBeEnabled();
    fireEvent.click(deleteBtn);

    expect(screen.queryByTestId('flow-node-node-1')).toBeNull();
    expect(screen.queryByTestId('flow-edge-path-e1')).toBeNull();
    expect(screen.queryByTestId('node-graph-connecting-status')).toBeNull();
    expect(onEdgesChange).toHaveBeenLastCalledWith([]);
    expect(onSelectNode).toHaveBeenLastCalledWith(null);
    expect(screen.getByTestId('node-graph-telemetry')).toHaveTextContent('5 nodes · 0 edges');

    // Delete a node with no incident edges -> onEdgesChange not called again
    const edgeCallsBefore = onEdgesChange.mock.calls.length;
    fireEvent.click(screen.getByTestId('flow-node-node-5'));
    fireEvent.click(deleteBtn);
    expect(onEdgesChange).toHaveBeenCalledTimes(edgeCallsBefore);
  });

  it('connects output port to input port, rejects self-loops and duplicates, cancels via Escape/toggle/button, and removes edges', () => {
    const onEdgesChange = vi.fn<(edges: FlowEdge[]) => void>();

    render(
      <NodeGraphCanvas
        defaultNodes={[
          { id: 'a', label: 'Alpha', x: 40, y: 80 },
          { id: 'b', label: 'Beta', x: 300, y: 80 },
          { id: 'c', label: 'Gamma', x: 560, y: 80 },
        ]}
        defaultEdges={[{ id: 'edge-1', sourceId: 'a', targetId: 'b' }]}
        onEdgesChange={onEdgesChange}
      />
    );

    // Clicking input port with no active connection is a no-op (and pointerDown stops propagation cleanly)
    fireEvent.pointerDown(screen.getByTestId('node-input-port-b'));
    fireEvent.click(screen.getByTestId('node-input-port-b'));
    expect(onEdgesChange).not.toHaveBeenCalled();

    // Clicking output port starts connection, clicking same output port toggles it off
    const outA = screen.getByTestId('node-output-port-a');
    fireEvent.pointerDown(outA);
    fireEvent.click(outA);
    expect(outA).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('node-graph-connecting-status')).toHaveTextContent(
      'Connecting from Alpha'
    );
    fireEvent.click(outA);
    expect(outA).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByTestId('node-graph-connecting-status')).toBeNull();

    // Self-loop (a -> a) rejected cleanly
    fireEvent.click(outA);
    fireEvent.click(screen.getByTestId('node-input-port-a'));
    expect(onEdgesChange).not.toHaveBeenCalled();
    expect(screen.queryByTestId('node-graph-connecting-status')).toBeNull();

    // Duplicate edge (a -> b already exists) rejected cleanly
    fireEvent.click(outA);
    fireEvent.click(screen.getByTestId('node-input-port-b'));
    expect(onEdgesChange).not.toHaveBeenCalled();
    expect(screen.queryByTestId('node-graph-connecting-status')).toBeNull();

    // Valid new connection (b -> c) creates edge-2 (skips existing edge-1)
    fireEvent.click(screen.getByTestId('node-output-port-b'));
    fireEvent.click(screen.getByTestId('node-input-port-c'));
    expect(onEdgesChange).toHaveBeenCalledTimes(1);
    expect(onEdgesChange).toHaveBeenLastCalledWith([
      { id: 'edge-1', sourceId: 'a', targetId: 'b' },
      { id: 'edge-2', sourceId: 'b', targetId: 'c' },
    ]);
    expect(screen.getByTestId('flow-edge-path-edge-2')).toBeInTheDocument();

    // Cancel connection via Cancel button in status pill
    fireEvent.click(outA);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel connection' }));
    expect(screen.queryByTestId('node-graph-connecting-status')).toBeNull();

    // Cancel connection via window Escape (and verify composing Escape is ignored)
    fireEvent.click(outA);
    fireEvent.keyDown(window, { key: 'Escape', isComposing: true });
    expect(screen.getByTestId('node-graph-connecting-status')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByTestId('node-graph-connecting-status')).toBeNull();

    // Remove unlabeled edge via click-to-remove button
    fireEvent.pointerDown(screen.getByTestId('remove-edge-edge-1'));
    fireEvent.click(screen.getByTestId('remove-edge-edge-1'));
    expect(screen.queryByTestId('flow-edge-path-edge-1')).toBeNull();
    expect(onEdgesChange).toHaveBeenLastCalledWith([
      { id: 'edge-2', sourceId: 'b', targetId: 'c' },
    ]);
    expect(screen.getByTestId('node-graph-telemetry')).toHaveTextContent('3 nodes · 1 edge');
  });

  it('supports pointer dragging nodes scaled by 1/zoom, canvas panning, background deselection, and unmount cleanup', () => {
    const onNodesChange = vi.fn<(nodes: FlowNode[]) => void>();
    const onSelectNode = vi.fn<(node: FlowNode | null) => void>();

    const { unmount } = render(
      <NodeGraphCanvas
        defaultNodes={[{ id: 'n1', label: 'Draggable', x: 100, y: 100 }]}
        onNodesChange={onNodesChange}
        onSelectNode={onSelectNode}
      />
    );

    const viewport = screen.getByTestId('node-graph-viewport');
    const world = screen.getByTestId('node-graph-world');
    const node = screen.getByTestId('flow-node-n1');

    // Zoom in to 200% (four +25% clicks: 100 -> 125 -> 150 -> 175 -> 200)
    const zoomInBtn = screen.getByRole('button', { name: 'Zoom in' });
    fireEvent.click(zoomInBtn);
    fireEvent.click(zoomInBtn);
    fireEvent.click(zoomInBtn);
    fireEvent.click(zoomInBtn);
    expect(screen.getByTestId('node-graph-zoom-readout')).toHaveTextContent('200%');

    // Secondary mouse button on node must not drag or select
    fireEvent.pointerDown(node, { button: 2, clientX: 50, clientY: 50 });
    fireEvent.pointerMove(window, { clientX: 150, clientY: 150 });
    expect(onNodesChange).not.toHaveBeenCalled();
    expect(onSelectNode).not.toHaveBeenCalled();

    // Primary drag +100px X, +60px Y at 200% zoom -> node moves +50px X, +30px Y
    fireEvent.pointerDown(node, { button: 0, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(window, { clientX: 200, clientY: 160 });
    expect(node).toHaveStyle({ left: '150px', top: '130px' });
    fireEvent.pointerUp(window);

    // Click immediately after pointerDown on same node does not double-fire onSelectNode
    fireEvent.click(node);
    expect(onSelectNode).toHaveBeenCalledTimes(1);

    // Secondary mouse button on canvas viewport must not pan
    fireEvent.pointerDown(viewport, { button: 2, clientX: 10, clientY: 10 });
    fireEvent.pointerMove(window, { clientX: 90, clientY: 90 });
    expect(viewport).toHaveAttribute('data-pan-x', '0');

    // Primary canvas pan moves pan coordinates, updates studio grid & world transform, and keeps selection
    fireEvent.pointerDown(viewport, { button: 0, clientX: 20, clientY: 30 });
    fireEvent.pointerMove(window, { clientX: 80, clientY: 75 });
    fireEvent.pointerUp(window);
    expect(viewport).toHaveAttribute('data-pan-x', '60');
    expect(viewport).toHaveAttribute('data-pan-y', '45');
    expect(world).toHaveStyle({ transform: 'translate3d(60px, 45px, 0) scale(2)' });

    // Click after a pan drag suppresses deselection once, then clean background click clears selection
    fireEvent.click(viewport);
    expect(screen.getByTestId('flow-node-n1')).toHaveAttribute('data-selected', 'true');
    fireEvent.click(viewport);
    expect(screen.getByTestId('flow-node-n1')).not.toHaveAttribute('data-selected');
    expect(onSelectNode).toHaveBeenLastCalledWith(null);

    // Start a drag and unmount mid-drag -> window listeners cleaned up cleanly
    fireEvent.pointerDown(node, { button: 0, clientX: 100, clientY: 100 });
    const callsBeforeUnmount = onNodesChange.mock.calls.length;
    unmount();
    fireEvent.pointerMove(window, { clientX: 300, clientY: 300 });
    expect(onNodesChange).toHaveBeenCalledTimes(callsBeforeUnmount);
  });

  it('controls zoom bounds, keyboard viewport zoom/reset, and Fit/Reset view with and without viewport dimensions', () => {
    render(
      <NodeGraphCanvas
        defaultNodes={[
          { id: 'n1', label: 'Start', x: 100, y: 100 },
          { id: 'n2', label: 'End', x: 500, y: 260 },
        ]}
      />
    );

    const viewport = screen.getByTestId('node-graph-viewport');
    const zoomInBtn = screen.getByRole('button', { name: 'Zoom in' });
    const zoomOutBtn = screen.getByRole('button', { name: 'Zoom out' });
    const resetBtn = screen.getByRole('button', { name: 'Fit and reset view' });
    const readout = screen.getByTestId('node-graph-zoom-readout');

    // Keyboard zoom in/out and IME guard
    fireEvent.keyDown(viewport, { key: '+', isComposing: true });
    expect(readout).toHaveTextContent('100%');
    fireEvent.keyDown(viewport, { key: '+' });
    expect(readout).toHaveTextContent('125%');
    fireEvent.keyDown(viewport, { key: '=' });
    expect(readout).toHaveTextContent('150%');
    fireEvent.keyDown(viewport, { key: '-' });
    expect(readout).toHaveTextContent('125%');
    fireEvent.keyDown(viewport, { key: '_' });
    expect(readout).toHaveTextContent('100%');

    // Zoom down to minimum 25% disables Zoom Out button
    for (let i = 0; i < 6; i += 1) {
      fireEvent.click(zoomOutBtn);
    }
    expect(readout).toHaveTextContent('25%');
    expect(zoomOutBtn).toBeDisabled();

    // Reset via '0' key with unmocked 0x0 viewport resets cleanly to 100% and pan (0, 0)
    fireEvent.keyDown(viewport, { key: '0' });
    expect(readout).toHaveTextContent('100%');
    expect(viewport).toHaveAttribute('data-pan-x', '0');
    expect(viewport).toHaveAttribute('data-pan-y', '0');

    // Zoom up to maximum 250% disables Zoom In button
    for (let i = 0; i < 8; i += 1) {
      fireEvent.click(zoomInBtn);
    }
    expect(readout).toHaveTextContent('250%');
    expect(zoomInBtn).toBeDisabled();

    // Fit/Reset view with measurable viewport fits bounding box and centers graph
    mockViewportRect(viewport, 800, 400);
    fireEvent.click(resetBtn);
    expect(Number(viewport.getAttribute('data-zoom'))).toBeGreaterThanOrEqual(0.25);
    expect(Number(viewport.getAttribute('data-zoom'))).toBeLessThanOrEqual(1);
    expect(viewport.getAttribute('data-pan-x')).not.toBe('0');

    // Viewport Escape cancels active connection
    fireEvent.click(screen.getByTestId('node-output-port-n1'));
    expect(screen.getByTestId('node-graph-connecting-status')).toBeInTheDocument();
    fireEvent.keyDown(viewport, { key: 'Escape' });
    expect(screen.queryByTestId('node-graph-connecting-status')).toBeNull();
  });

  it('supports keyboard nudging (16px arrows), Enter/Space selection, Escape cancel/deselect, and Delete/Backspace removal on nodes', () => {
    const onNodesChange = vi.fn<(nodes: FlowNode[]) => void>();
    const onSelectNode = vi.fn<(node: FlowNode | null) => void>();

    render(
      <NodeGraphCanvas
        defaultNodes={[
          { id: 'n1', label: 'Node A', x: 100, y: 100 },
          { id: 'n2', label: 'Node B', x: 360, y: 100 },
        ]}
        onNodesChange={onNodesChange}
        onSelectNode={onSelectNode}
      />
    );

    const node1 = screen.getByTestId('flow-node-n1');
    const node2 = screen.getByTestId('flow-node-n2');

    // IME composing and unrelated key ignored
    fireEvent.keyDown(node1, { key: 'ArrowRight', isComposing: true });
    fireEvent.keyDown(node1, { key: 'Tab' });
    expect(onNodesChange).not.toHaveBeenCalled();

    // Enter & Space select node
    fireEvent.keyDown(node1, { key: 'Enter' });
    expect(node1).toHaveAttribute('data-selected', 'true');
    fireEvent.keyDown(node2, { key: ' ' });
    expect(node2).toHaveAttribute('data-selected', 'true');

    // Escape on node clears selection when not connecting
    fireEvent.keyDown(node2, { key: 'Escape' });
    expect(node2).not.toHaveAttribute('data-selected');

    // Escape on node cancels connection first when connecting
    fireEvent.click(screen.getByTestId('node-output-port-n1'));
    fireEvent.keyDown(node1, { key: 'Escape' });
    expect(screen.queryByTestId('node-graph-connecting-status')).toBeNull();

    // Child port keydown: Escape cancels connection; Enter does not swallow button activation
    const outPort1 = screen.getByTestId('node-output-port-n1');
    fireEvent.click(outPort1);
    fireEvent.keyDown(outPort1, { key: 'Enter' });
    expect(screen.getByTestId('node-graph-connecting-status')).toBeInTheDocument();
    fireEvent.keyDown(outPort1, { key: 'Escape' });
    expect(screen.queryByTestId('node-graph-connecting-status')).toBeNull();

    // Arrow keys nudge focused node by 16px in all 4 directions
    fireEvent.keyDown(node1, { key: 'ArrowRight' });
    expect(node1).toHaveStyle({ left: '116px', top: '100px' });
    fireEvent.keyDown(node1, { key: 'ArrowDown' });
    expect(node1).toHaveStyle({ left: '116px', top: '116px' });
    fireEvent.keyDown(node1, { key: 'ArrowLeft' });
    expect(node1).toHaveStyle({ left: '100px', top: '116px' });
    fireEvent.keyDown(node1, { key: 'ArrowUp' });
    expect(node1).toHaveStyle({ left: '100px', top: '100px' });

    // Delete & Backspace delete focused nodes
    fireEvent.keyDown(node1, { key: 'Delete' });
    expect(screen.queryByTestId('flow-node-n1')).toBeNull();
    fireEvent.keyDown(node2, { key: 'Backspace' });
    expect(screen.queryByTestId('flow-node-n2')).toBeNull();
    expect(screen.getByTestId('node-graph-empty')).toBeInTheDocument();
  });

  it('blocks all mutations in readOnly mode while allowing selection and empty state display', () => {
    const onNodesChange = vi.fn();
    const onEdgesChange = vi.fn();
    const onSelectNode = vi.fn();

    const { rerender } = render(
      <NodeGraphCanvas
        readOnly
        defaultNodes={[
          { id: 'n1', label: 'Locked A', x: 80, y: 80 },
          { id: 'n2', label: 'Locked B', x: 340, y: 80 },
        ]}
        defaultEdges={[
          { id: 'e1', sourceId: 'n1', targetId: 'n2', label: 'Stream' },
          { id: 'e2', sourceId: 'n2', targetId: 'n1' },
        ]}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onSelectNode={onSelectNode}
      />
    );

    expect(screen.queryByRole('button', { name: 'Add Node' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Delete selected node' })).toBeDisabled();
    expect(screen.getByTestId('node-graph-telemetry')).toHaveTextContent('Read-only');

    // Edge label badge stays visible without remove button; unlabeled edge badge hidden in readOnly
    expect(screen.getByTestId('flow-edge-badge-e1')).toHaveTextContent('Stream');
    expect(screen.queryByTestId('remove-edge-e1')).toBeNull();
    expect(screen.queryByTestId('flow-edge-badge-e2')).toBeNull();

    // Ports are disabled
    expect(screen.getByTestId('node-output-port-n1')).toBeDisabled();
    expect(screen.getByTestId('node-input-port-n2')).toBeDisabled();

    // Node selection works, dragging & keyboard mutations blocked
    const node1 = screen.getByTestId('flow-node-n1');
    fireEvent.pointerDown(node1, { button: 0, clientX: 80, clientY: 80 });
    fireEvent.pointerMove(window, { clientX: 200, clientY: 200 });
    fireEvent.pointerUp(window);
    expect(onSelectNode).toHaveBeenCalledWith(expect.objectContaining({ id: 'n1' }));
    expect(node1).toHaveStyle({ left: '80px', top: '80px' });

    fireEvent.keyDown(node1, { key: 'ArrowRight' });
    fireEvent.keyDown(node1, { key: 'Delete' });
    expect(onNodesChange).not.toHaveBeenCalled();
    expect(onEdgesChange).not.toHaveBeenCalled();

    // Empty read-only canvas message
    rerender(<NodeGraphCanvas readOnly nodes={[]} edges={[]} />);
    expect(screen.getByTestId('node-graph-empty')).toHaveTextContent(
      'This graph is empty in read-only mode.'
    );
  });

  it('works cleanly in controlled mode and ignores adversarial inputs, dangling/duplicate/self-loop edges, and XSS labels', () => {
    const onNodesChange = vi.fn<(nodes: FlowNode[]) => void>();
    const onEdgesChange = vi.fn<(edges: FlowEdge[]) => void>();
    const xssLabel = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';

    const controlledNodes: FlowNode[] = [
      { id: '  ', label: 'Blank ID ignored', x: 0, y: 0 },
      {
        id: 'n1',
        label: xssLabel,
        category: '<b>Cat</b>',
        x: Number.NaN,
        y: Number.POSITIVE_INFINITY,
        tone: 'unknown-tone' as FlowNodeTone,
      },
      { id: 'n1', label: 'Duplicate ID ignored', x: 500, y: 500 },
      { id: 'n2', label: 'Clamped Node', x: 99999, y: -99999, tone: 'cobalt' },
    ];

    const controlledEdges: FlowEdge[] = [
      { id: ' ', sourceId: 'n1', targetId: 'n2' },
      { id: 'self', sourceId: 'n1', targetId: 'n1' },
      { id: 'dangling-src', sourceId: 'missing', targetId: 'n2' },
      { id: 'dangling-tgt', sourceId: 'n1', targetId: 'missing' },
      { id: 'valid-1', sourceId: 'n1', targetId: 'n2', label: xssLabel },
      { id: 'valid-1', sourceId: 'n2', targetId: 'n1' }, // duplicate edge ID
      { id: 'dup-pair', sourceId: 'n1', targetId: 'n2' }, // duplicate source->target pair
    ];

    render(
      <NodeGraphCanvas
        nodes={controlledNodes}
        edges={controlledEdges}
        height={Number.NaN}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        data-testid="adversarial-root"
      />
    );

    // Height NaN falls back cleanly to 380px
    expect(screen.getByTestId('adversarial-root')).toHaveStyle({ height: '380px' });

    // Only 2 valid nodes and 1 valid edge rendered
    expect(screen.getByTestId('node-graph-telemetry')).toHaveTextContent('2 nodes · 1 edge');

    // XSS payload rendered strictly as literal text — zero injected <script> or <img>
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByTestId('flow-node-n1')).toHaveTextContent(xssLabel);
    expect(screen.getByTestId('flow-edge-badge-valid-1')).toHaveTextContent(xssLabel);

    // Coordinates clamped and invalid tone normalized to 'crystal'
    expect(screen.getByTestId('flow-node-n1')).toHaveStyle({ left: '0px', top: '0px' });
    expect(screen.getByTestId('flow-node-n1')).toHaveAttribute('data-tone', 'crystal');
    expect(screen.getByTestId('flow-node-n2')).toHaveStyle({ left: '4000px', top: '-4000px' });

    // Controlled Add Node emits onNodesChange without mutating DOM until parent updates props
    fireEvent.click(screen.getByRole('button', { name: 'Add Node' }));
    expect(onNodesChange).toHaveBeenCalledTimes(1);
    expect(onNodesChange.mock.calls[0]?.[0]).toHaveLength(3);
    expect(screen.getByTestId('node-graph-telemetry')).toHaveTextContent('2 nodes · 1 edge');

    // Controlled remove edge emits onEdgesChange([]) without mutating DOM directly
    fireEvent.click(screen.getByTestId('remove-edge-valid-1'));
    expect(onEdgesChange).toHaveBeenCalledWith([]);
    expect(screen.getByTestId('flow-edge-path-valid-1')).toBeInTheDocument();
  });

  it('clamps extreme numeric heights to [220..900] and renders graceful empty canvas by default', () => {
    const { rerender } = render(<NodeGraphCanvas height={40} data-testid="clamp-root" />);
    expect(screen.getByTestId('clamp-root')).toHaveStyle({ height: '220px' });
    expect(screen.getByTestId('node-graph-empty')).toHaveTextContent('No nodes on canvas');
    expect(screen.getByTestId('node-graph-telemetry')).toHaveTextContent('0 nodes · 0 edges');

    rerender(<NodeGraphCanvas height={2400} data-testid="clamp-root" />);
    expect(screen.getByTestId('clamp-root')).toHaveStyle({ height: '900px' });

    // Singular telemetry label ('1 node · 0 edges')
    rerender(
      <NodeGraphCanvas
        nodes={[{ id: 'solo', label: 'Single Node', x: 50, y: 50 }]}
        edges={[]}
        data-testid="clamp-root"
      />
    );
    expect(screen.getByTestId('node-graph-telemetry')).toHaveTextContent('1 node · 0 edges');
  });
});
