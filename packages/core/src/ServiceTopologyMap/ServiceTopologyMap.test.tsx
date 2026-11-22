import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  ServiceTopologyMap,
  type TopologyNodeKindMap,
  type TopologyServiceEdge,
  type TopologyServiceNode,
} from './index';

describe('ServiceTopologyMap', () => {
  it('renders default 6-node / 7-edge layered optical topology with ref, theme override, --prism-* tokens, and summary pills', () => {
    const ref = createRef<HTMLDivElement>();

    const kindMapCheck: TopologyNodeKindMap = {
      gateway: true,
      service: true,
      database: true,
      queue: true,
      cache: true,
    };
    expect(Object.keys(kindMapCheck)).toHaveLength(5);

    render(
      <PrismThemeProvider
        theme={{
          components: {
            ServiceTopologyMap: {
              className: 'theme-topology',
              style: { maxWidth: '820px' },
            },
          },
        }}
      >
        <ServiceTopologyMap
          ref={ref}
          title="Production Mesh Topology"
          className="local-topology"
          xstyle={{ '--prism-blur-px': '20px' }}
          style={{ marginTop: '6px' }}
          data-testid="topology-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('topology-root');
    expect(ref.current).toBe(root);
    expect(ServiceTopologyMap.displayName).toBe('ServiceTopologyMap');
    expect(root).toHaveClass(
      'refractor-service-topology-map',
      'prism-slab',
      'theme-topology',
      'local-topology'
    );
    expect(root).toHaveStyle({ maxWidth: '820px', marginTop: '6px' });
    expect(root).not.toHaveAttribute('data-empty');
    expect(root).not.toHaveAttribute('data-issues-only');
    expect(root).not.toHaveAttribute('data-selected');

    // Cluster health summary pills (4 healthy, 1 degraded, 1 error)
    expect(screen.getByTestId('topology-count-healthy')).toHaveTextContent('Healthy 4');
    expect(screen.getByTestId('topology-count-degraded')).toHaveTextContent('Degraded 1');
    expect(screen.getByTestId('topology-count-error')).toHaveTextContent('Error 1');

    // Toggle button defaults to unpressed
    const toggle = screen.getByTestId('topology-issues-toggle');
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(toggle).toHaveTextContent('Errors & Degraded Only');

    // Responsive 540x280 SVG with zero raw color literals and zero NaN
    const svg = screen.getByRole('img', { name: 'Production Mesh Topology' });
    expect(svg).toHaveAttribute('viewBox', '0 0 540 280');
    expect(svg).toHaveClass('w-full', 'h-auto', 'select-none');
    expect(svg.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(svg.innerHTML).not.toMatch(/\brgba?\s*\(/i);
    expect(svg.innerHTML).not.toMatch(/\bhsla?\s*\(/i);
    expect(svg.innerHTML).not.toContain('NaN');

    // Verify all 6 default nodes across tiers 0, 1, 2
    expect(screen.getByTestId('topology-node-edge-gw')).toHaveAttribute('data-tier', '0');
    expect(screen.getByTestId('topology-node-auth-svc')).toHaveAttribute('data-tier', '1');
    expect(screen.getByTestId('topology-node-checkout-svc')).toHaveAttribute('data-tier', '1');
    expect(screen.getByTestId('topology-node-orders-db')).toHaveAttribute('data-tier', '2');
    expect(screen.getByTestId('topology-node-session-cache')).toHaveAttribute('data-tier', '2');
    expect(screen.getByTestId('topology-node-event-queue')).toHaveAttribute('data-tier', '2');

    // Verify left-to-right monotonic tier X ordering
    const gwRect = screen.getByTestId('topology-node-edge-gw').querySelector('rect')!;
    const authRect = screen.getByTestId('topology-node-auth-svc').querySelector('rect')!;
    const dbRect = screen.getByTestId('topology-node-orders-db').querySelector('rect')!;
    expect(Number(gwRect.getAttribute('x'))).toBeLessThan(Number(authRect.getAttribute('x')));
    expect(Number(authRect.getAttribute('x'))).toBeLessThan(Number(dbRect.getAttribute('x')));

    // Verify 7 default edges including 1 degraded (--prism-warning-main) & 1 high-error (--prism-error-main)
    expect(screen.getByTestId('topology-edge-e-gw-auth')).toHaveAttribute('data-health', 'healthy');
    expect(screen.getByTestId('topology-edge-e-gw-checkout')).toHaveAttribute('data-health', 'degraded');
    expect(screen.getByTestId('topology-edge-path-e-gw-checkout')).toHaveAttribute(
      'stroke',
      'var(--prism-warning-main)'
    );
    expect(screen.getByTestId('topology-edge-e-gw-checkout')).toHaveTextContent('92ms · 1.1% err');

    expect(screen.getByTestId('topology-edge-e-checkout-db')).toHaveAttribute('data-health', 'error');
    expect(screen.getByTestId('topology-edge-path-e-checkout-db')).toHaveAttribute(
      'stroke',
      'var(--prism-error-main)'
    );
    expect(screen.getByTestId('topology-edge-e-checkout-db')).toHaveTextContent('248ms · 3.4% err');

    // Idle aria-live inspector summary
    const inspector = screen.getByTestId('topology-inspector');
    expect(inspector).toHaveAttribute('aria-live', 'polite');
    expect(inspector).toHaveClass('prism-well');
    expect(inspector).toHaveTextContent('6 services · 7 links · 2 degraded/error');
  });

  it('produces 100% deterministic layout geometry across independent renders', () => {
    const first = render(<ServiceTopologyMap />);
    const firstSnapshot = screen.getByTestId('topology-svg').innerHTML;
    first.unmount();

    render(<ServiceTopologyMap />);
    const secondSnapshot = screen.getByTestId('topology-svg').innerHTML;

    // Strip dynamic useId marker prefix when comparing deterministic geometry
    const normalizeIds = (html: string) => html.replace(/stm-[a-zA-Z0-9_-]+-arrow-/g, 'stm-arrow-');
    expect(normalizeIds(secondSnapshot)).toBe(normalizeIds(firstSnapshot));
  });

  it('highlights upstream & downstream neighbors on node click, dims unrelated services, updates inspector, and clears cleanly', () => {
    const onSelectNode = vi.fn<(node: TopologyServiceNode) => void>();

    render(<ServiceTopologyMap onSelectNode={onSelectNode} data-testid="interactive-root" />);

    const checkoutNode = screen.getByTestId('topology-node-checkout-svc');
    fireEvent.click(checkoutNode);

    expect(onSelectNode).toHaveBeenCalledTimes(1);
    expect(onSelectNode.mock.calls[0]?.[0].id).toBe('checkout-svc');
    expect(screen.getByTestId('interactive-root')).toHaveAttribute('data-selected', 'true');
    expect(checkoutNode).toHaveAttribute('aria-pressed', 'true');
    expect(checkoutNode).toHaveAttribute('data-state', 'selected');
    expect(screen.getByTestId('topology-node-halo-checkout-svc')).toBeInTheDocument();

    // Upstream & downstream neighbors highlighted
    expect(screen.getByTestId('topology-node-edge-gw')).toHaveAttribute('data-state', 'upstream');
    expect(screen.getByTestId('topology-node-edge-gw')).toHaveAttribute('opacity', '1');
    expect(screen.getByTestId('topology-node-orders-db')).toHaveAttribute('data-state', 'downstream');
    expect(screen.getByTestId('topology-node-session-cache')).toHaveAttribute('data-state', 'downstream');
    expect(screen.getByTestId('topology-node-event-queue')).toHaveAttribute('data-state', 'downstream');

    // Unrelated service dimmed
    expect(screen.getByTestId('topology-node-auth-svc')).toHaveAttribute('data-state', 'dimmed');
    expect(screen.getByTestId('topology-node-auth-svc')).toHaveAttribute('opacity', '0.22');

    // Incident edges highlighted; unrelated edges dimmed
    expect(screen.getByTestId('topology-edge-e-gw-checkout')).toHaveAttribute('data-state', 'incident');
    expect(screen.getByTestId('topology-edge-e-checkout-db')).toHaveAttribute('data-state', 'incident');
    expect(screen.getByTestId('topology-edge-e-checkout-cache')).toHaveAttribute('data-state', 'incident');
    expect(screen.getByTestId('topology-edge-e-checkout-queue')).toHaveAttribute('data-state', 'incident');
    expect(screen.getByTestId('topology-edge-e-gw-auth')).toHaveAttribute('data-state', 'dimmed');
    expect(screen.getByTestId('topology-edge-e-gw-auth')).toHaveAttribute('opacity', '0.2');

    // Inspector shows full service telemetry
    const inspector = screen.getByTestId('topology-inspector');
    expect(inspector).toHaveTextContent('Checkout API');
    expect(inspector).toHaveTextContent('Service');
    expect(inspector).toHaveTextContent('Degraded');
    expect(inspector).toHaveTextContent('960 rps');
    expect(inspector).toHaveTextContent('P95 142ms');
    expect(inspector).toHaveTextContent('1.8% err');
    expect(inspector).toHaveTextContent('1 upstream / 3 downstream');

    // Selecting a healthy node renders healthy inspector telemetry
    fireEvent.click(screen.getByTestId('topology-node-edge-gw'));
    expect(inspector).toHaveTextContent('API Gateway');
    expect(inspector).toHaveTextContent('Gateway');
    expect(inspector).toHaveTextContent('Healthy');
    expect(inspector).toHaveTextContent('2.5k rps');
    expect(inspector).toHaveTextContent('0 upstream / 2 downstream');

    // Clear button resets selection
    fireEvent.click(screen.getByTestId('topology-clear-selection'));
    expect(screen.getByTestId('interactive-root')).not.toHaveAttribute('data-selected');
    expect(screen.getByTestId('topology-node-auth-svc')).toHaveAttribute('data-state', 'idle');
    expect(inspector).toHaveTextContent('Select a service node or dependency edge');
  });

  it('selects edges, highlights endpoint services, dims unrelated nodes/links, and displays edge link telemetry', () => {
    const onSelectEdge = vi.fn<(edge: TopologyServiceEdge) => void>();

    render(<ServiceTopologyMap onSelectEdge={onSelectEdge} />);

    // Click high-error edge
    const errorEdge = screen.getByTestId('topology-edge-e-checkout-db');
    fireEvent.click(errorEdge);

    expect(onSelectEdge).toHaveBeenCalledTimes(1);
    expect(onSelectEdge.mock.calls[0]?.[0].id).toBe('e-checkout-db');
    expect(errorEdge).toHaveAttribute('aria-pressed', 'true');
    expect(errorEdge).toHaveAttribute('data-state', 'selected');
    expect(screen.getByTestId('topology-edge-path-e-checkout-db')).toHaveAttribute(
      'stroke',
      'var(--prism-primary-main)'
    );

    // Endpoints stay lit, unrelated nodes & edges dim
    expect(screen.getByTestId('topology-node-checkout-svc')).toHaveAttribute('data-state', 'endpoint');
    expect(screen.getByTestId('topology-node-orders-db')).toHaveAttribute('data-state', 'endpoint');
    expect(screen.getByTestId('topology-node-edge-gw')).toHaveAttribute('data-state', 'dimmed');
    expect(screen.getByTestId('topology-edge-e-gw-auth')).toHaveAttribute('data-state', 'dimmed');

    const inspector = screen.getByTestId('topology-inspector');
    expect(inspector).toHaveTextContent('Checkout API → Orders DB');
    expect(inspector).toHaveTextContent('Error');
    expect(inspector).toHaveTextContent('248ms latency');
    expect(inspector).toHaveTextContent('3.4% err');
    expect(inspector).toHaveTextContent('470 rps');

    // Click healthy edge to verify healthy edge inspector color path
    fireEvent.click(screen.getByTestId('topology-edge-e-gw-auth'));
    expect(inspector).toHaveTextContent('API Gateway → Auth Service');
    expect(inspector).toHaveTextContent('Healthy');
    expect(inspector).toHaveTextContent('14ms latency');
    expect(inspector).toHaveTextContent('0.1% err');
    expect(inspector).toHaveTextContent('1.4k rps');
  });

  it('toggles Errors & Degraded Only mode to emphasize unhealthy services and links', () => {
    render(<ServiceTopologyMap data-testid="issues-root" />);

    const toggle = screen.getByTestId('topology-issues-toggle');
    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('issues-root')).toHaveAttribute('data-issues-only', 'true');

    // Unhealthy nodes highlighted as 'issue'; healthy nodes dimmed
    expect(screen.getByTestId('topology-node-checkout-svc')).toHaveAttribute('data-state', 'issue');
    expect(screen.getByTestId('topology-node-orders-db')).toHaveAttribute('data-state', 'issue');
    expect(screen.getByTestId('topology-node-edge-gw')).toHaveAttribute('data-state', 'dimmed');
    expect(screen.getByTestId('topology-node-auth-svc')).toHaveAttribute('data-state', 'dimmed');

    // Unhealthy edges highlighted as 'issue'; healthy edges dimmed
    expect(screen.getByTestId('topology-edge-e-gw-checkout')).toHaveAttribute('data-state', 'issue');
    expect(screen.getByTestId('topology-edge-e-checkout-db')).toHaveAttribute('data-state', 'issue');
    expect(screen.getByTestId('topology-edge-e-gw-auth')).toHaveAttribute('data-state', 'dimmed');

    // Toggling off restores normal idle states
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('topology-node-edge-gw')).toHaveAttribute('data-state', 'idle');
    expect(screen.getByTestId('topology-edge-e-gw-auth')).toHaveAttribute('data-state', 'idle');
  });

  it('supports keyboard Enter, Space, ArrowLeft, ArrowRight, Escape and guards IME composition on nodes and edges', () => {
    const onSelectNode = vi.fn<(node: TopologyServiceNode) => void>();
    const onSelectEdge = vi.fn<(edge: TopologyServiceEdge) => void>();

    render(
      <ServiceTopologyMap onSelectNode={onSelectNode} onSelectEdge={onSelectEdge} />
    );

    const gwNode = screen.getByTestId('topology-node-edge-gw');
    const authNode = screen.getByTestId('topology-node-auth-svc');
    const queueNode = screen.getByTestId('topology-node-event-queue');

    // IME composition must be ignored on nodes
    fireEvent.keyDown(gwNode, { key: 'Enter', isComposing: true });
    expect(onSelectNode).not.toHaveBeenCalled();

    // Enter selects node
    fireEvent.keyDown(gwNode, { key: 'Enter' });
    expect(onSelectNode).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'edge-gw' })
    );

    // ArrowRight moves focus and selects next node (auth-svc)
    fireEvent.keyDown(gwNode, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(authNode);
    expect(onSelectNode).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'auth-svc' })
    );

    // ArrowLeft from first node wraps around to last node (event-queue)
    fireEvent.keyDown(gwNode, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(queueNode);
    expect(onSelectNode).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'event-queue' })
    );

    // Space selects node
    fireEvent.keyDown(authNode, { key: ' ' });
    expect(authNode).toHaveAttribute('data-state', 'selected');

    // Unrelated key does not clear selection
    fireEvent.keyDown(authNode, { key: 'Tab' });
    expect(authNode).toHaveAttribute('data-state', 'selected');

    // Escape clears node selection
    fireEvent.keyDown(authNode, { key: 'Escape' });
    expect(authNode).toHaveAttribute('data-state', 'idle');

    // Edge keyboard navigation + IME guard
    const firstEdge = screen.getByTestId('topology-edge-e-gw-auth');
    const secondEdge = screen.getByTestId('topology-edge-e-gw-checkout');
    const lastEdge = screen.getByTestId('topology-edge-e-checkout-queue');

    fireEvent.keyDown(firstEdge, { key: 'Enter', isComposing: true });
    expect(onSelectEdge).not.toHaveBeenCalled();

    fireEvent.keyDown(firstEdge, { key: 'Enter' });
    expect(onSelectEdge).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'e-gw-auth' })
    );

    fireEvent.keyDown(firstEdge, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(secondEdge);
    expect(onSelectEdge).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'e-gw-checkout' })
    );

    fireEvent.keyDown(firstEdge, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(lastEdge);
    expect(onSelectEdge).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'e-checkout-queue' })
    );

    fireEvent.keyDown(secondEdge, { key: ' ' });
    expect(secondEdge).toHaveAttribute('data-state', 'selected');

    fireEvent.keyDown(secondEdge, { key: 'Tab' });
    expect(secondEdge).toHaveAttribute('data-state', 'selected');

    fireEvent.keyDown(secondEdge, { key: 'Escape' });
    expect(secondEdge).toHaveAttribute('data-state', 'idle');
  });

  it('renders a clean role="status" empty state when nodes is explicitly empty', () => {
    render(<ServiceTopologyMap nodes={[]} edges={[]} data-testid="empty-root" />);

    expect(screen.getByTestId('empty-root')).toHaveAttribute('data-empty', 'true');
    const status = screen.getByRole('status');
    expect(status).toHaveClass('prism-well');
    expect(status).toHaveTextContent('No services in topology');
    expect(screen.queryByTestId('topology-svg')).not.toBeInTheDocument();
    expect(screen.queryByTestId('topology-inspector')).not.toBeInTheDocument();
    expect(screen.getByTestId('topology-count-healthy')).toHaveTextContent('Healthy 0');
  });

  it('sanitizes adversarial inputs, reverse/lateral edges, long labels, XSS strings, and stale selections safely', () => {
    const xssTitle = '<script>alert("xss")</script> Mesh';
    const xssLabel = '<img src=x onerror=alert(1)> Super Long Gateway Name';

    const customNodes: TopologyServiceNode[] = [
      {
        id: '  ',
        label: 'Blank ID Dropped',
        kind: 'service',
        tier: 0,
        health: 'healthy',
        rps: 100,
        p95Ms: 10,
        errorRatePct: 0,
      },
      {
        id: '__proto__',
        label: xssLabel,
        kind: 'gateway',
        tier: 0,
        health: 'healthy',
        rps: Number.NaN,
        p95Ms: -15,
        errorRatePct: 150,
      },
      {
        id: '__proto__',
        label: 'Duplicate Ignored',
        kind: 'service',
        tier: 1,
        health: 'error',
        rps: 50,
        p95Ms: 50,
        errorRatePct: 5,
      },
      {
        id: 'constructor',
        label: 'Worker A',
        kind: 'service',
        tier: 1,
        health: 'degraded',
        rps: 300,
        p95Ms: 85,
        errorRatePct: 0.7,
      },
      {
        id: 'worker-b',
        label: 'Worker B',
        kind: 'service',
        tier: 1,
        health: 'healthy',
        rps: 200,
        p95Ms: 22,
        errorRatePct: 0,
      },
      {
        id: 'db-1',
        label: 'Primary DB',
        kind: 'database',
        tier: 2,
        health: 'error',
        rps: 120,
        p95Ms: 210,
        errorRatePct: 2.5,
      },
      {
        id: 'db-2',
        label: 'Replica DB',
        kind: 'database',
        tier: 2,
        health: 'healthy',
        rps: 110,
        p95Ms: 18,
        errorRatePct: 0,
      },
    ];

    const customEdges: TopologyServiceEdge[] = [
      // Blank, duplicate, self-loop, and dangling edges should all be filtered safely
      { id: ' ', source: '__proto__', target: 'constructor', latencyMs: 10, errorRatePct: 0, rps: 10 },
      { id: 'self', source: 'constructor', target: 'constructor', latencyMs: 5, errorRatePct: 0, rps: 5 },
      { id: 'dangling', source: 'constructor', target: 'missing', latencyMs: 5, errorRatePct: 0, rps: 5 },
      // Forward edge with latency-only error (>= 200ms, 0% err)
      { id: 'fwd', source: '__proto__', target: 'constructor', latencyMs: 220, errorRatePct: 0, rps: Number.POSITIVE_INFINITY },
      // Duplicate ID ignored
      { id: 'fwd', source: '__proto__', target: 'worker-b', latencyMs: 10, errorRatePct: 0, rps: 10 },
      // Reverse tier edge (tier 2 -> tier 1) with error-only degraded (0.8% err, 12ms)
      { id: 'rev', source: 'db-1', target: 'constructor', latencyMs: 12, errorRatePct: 0.8, rps: 60 },
      // Same-tier lateral edge on tier 1 (curves right) with latency-only degraded (95ms, 0% err)
      { id: 'lat-t1', source: 'constructor', target: 'worker-b', latencyMs: 95, errorRatePct: 0, rps: 80 },
      // Same-tier lateral edge on tier 2 (curves left)
      { id: 'lat-t2', source: 'db-1', target: 'db-2', latencyMs: 15, errorRatePct: 0, rps: 90 },
    ];

    const { container, rerender } = render(
      <ServiceTopologyMap title={xssTitle} nodes={customNodes} edges={customEdges} />
    );

    // Zero injected <script> or <img> DOM nodes (rendered strictly as text)
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent(xssTitle);

    // Truncated label renders with ellipsis while preserving full label in aria-label
    const protoNode = screen.getByTestId('topology-node-__proto__');
    expect(screen.getByTestId('topology-node-label-__proto__').textContent).toContain('…');
    expect(protoNode.getAttribute('aria-label')).toContain(xssLabel);

    // All 4 valid edges rendered with zero NaN
    const svg = screen.getByTestId('topology-svg');
    expect(svg.innerHTML).not.toContain('NaN');
    expect(screen.getByTestId('topology-edge-fwd')).toHaveAttribute('data-health', 'error');
    expect(screen.getByTestId('topology-edge-rev')).toHaveAttribute('data-health', 'degraded');
    expect(screen.getByTestId('topology-edge-lat-t1')).toHaveAttribute('data-health', 'degraded');
    expect(screen.getByTestId('topology-edge-lat-t2')).toHaveAttribute('data-health', 'healthy');
    expect(screen.queryByTestId('topology-edge-self')).not.toBeInTheDocument();
    expect(screen.queryByTestId('topology-edge-dangling')).not.toBeInTheDocument();

    // Select a node, then remove it via rerender -> inspector falls back cleanly to idle
    fireEvent.click(protoNode);
    expect(screen.getByTestId('topology-inspector')).toHaveTextContent('100% err');

    rerender(
      <ServiceTopologyMap
        title="Shrunk Topology"
        nodes={customNodes.filter((n) => n.id === 'worker-b')}
        edges={[]}
      />
    );
    expect(screen.getByTestId('topology-inspector')).toHaveTextContent(
      'Select a service node or dependency edge'
    );

    // Select an edge, then remove it via rerender -> inspector falls back cleanly to idle
    rerender(<ServiceTopologyMap nodes={customNodes} edges={customEdges} />);
    fireEvent.click(screen.getByTestId('topology-edge-lat-t2'));
    expect(screen.getByTestId('topology-inspector')).toHaveTextContent('Primary DB → Replica DB');

    rerender(<ServiceTopologyMap nodes={customNodes} edges={[]} />);
    expect(screen.getByTestId('topology-inspector')).toHaveTextContent(
      'Select a service node or dependency edge'
    );
  });
});
