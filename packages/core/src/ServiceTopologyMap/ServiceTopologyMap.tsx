'use client';

import {
  memo,
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { AlertTriangle, Network, X } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { STYLE_BG_ERROR, STYLE_BG_SUCCESS, STYLE_BG_WARNING, STYLE_ERROR_MAIN, STYLE_FILL_PRIMARY, STYLE_FILL_SECONDARY, STYLE_PRIMARY_MAIN, STYLE_TEXT_DISABLED, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY, STYLE_WARNING_MAIN } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type TopologyNodeKind = 'gateway' | 'service' | 'database' | 'queue' | 'cache';
export type TopologyHealthState = 'healthy' | 'degraded' | 'error';

export interface TopologyServiceNode {
  /** Stable unique service identifier used for edges and selection. */
  id: string;
  /** Human-readable service name rendered safely as literal text. */
  label: string;
  /** Architectural component category. */
  kind: TopologyNodeKind;
  /** Left-to-right architectural layer: 0 = Edge/Gateway, 1 = Microservices, 2 = Data/Async. */
  tier: 0 | 1 | 2;
  /** Current service health state. */
  health: TopologyHealthState;
  /** Requests per second handled by this service. */
  rps: number;
  /** P95 latency in milliseconds. */
  p95Ms: number;
  /** Error rate percentage (0..100). */
  errorRatePct: number;
}

export interface TopologyServiceEdge {
  /** Stable unique dependency edge identifier. */
  id: string;
  /** Upstream caller node ID. */
  source: string;
  /** Downstream callee node ID. */
  target: string;
  /** Observed edge latency in milliseconds. */
  latencyMs: number;
  /** Observed edge error rate percentage (0..100). */
  errorRatePct: number;
  /** Observed traffic throughput in requests per second. */
  rps: number;
}

export interface ServiceTopologyMapProps extends BaseProps<HTMLDivElement> {
  /** Service nodes arranged left-to-right by tier; defaults to a 6-node cloud topology when omitted. */
  nodes?: ReadonlyArray<TopologyServiceNode>;
  /** Directed dependency telemetry links; defaults to 7 live connections when omitted. */
  edges?: ReadonlyArray<TopologyServiceEdge>;
  /** Card title rendered in the optical slab header (defaults to 'Service Dependency Topology'). */
  title?: string;
  /** Callback fired when a service node is selected via pointer or keyboard. */
  onSelectNode?: (node: TopologyServiceNode) => void;
  /** Callback fired when a dependency edge is selected via pointer or keyboard. */
  onSelectEdge?: (edge: TopologyServiceEdge) => void;
}

interface PositionedServiceNode {
  id: string;
  raw: TopologyServiceNode;
  label: string;
  kind: TopologyNodeKind;
  tier: 0 | 1 | 2;
  health: TopologyHealthState;
  rps: number;
  p95Ms: number;
  errorRatePct: number;
  x: number;
  y: number;
  width: number;
  height: number;
  upstreamIds: ReadonlySet<string>;
  downstreamIds: ReadonlySet<string>;
}

interface PositionedServiceEdge {
  id: string;
  raw: TopologyServiceEdge;
  source: string;
  target: string;
  sourceLabel: string;
  targetLabel: string;
  latencyMs: number;
  errorRatePct: number;
  rps: number;
  health: TopologyHealthState;
  path: string;
  pillX: number;
  pillY: number;
  pillText: string;
  pillWidth: number;
}

interface TopologyLayout {
  nodes: PositionedServiceNode[];
  edges: PositionedServiceEdge[];
  nodeById: ReadonlyMap<string, PositionedServiceNode>;
  edgeById: ReadonlyMap<string, PositionedServiceEdge>;
  healthCounts: {
    healthy: number;
    degraded: number;
    error: number;
  };
}

type TopologySelection =
  | { kind: 'node'; id: string }
  | { kind: 'edge'; id: string }
  | null;

const VIEW_WIDTH = 540;
const VIEW_HEIGHT = 280;
const NODE_WIDTH = 108;
const MAX_NODE_HEIGHT = 54;
const MIN_NODE_HEIGHT = 34;
const TOP_PAD = 36;
const BOTTOM_PAD = 18;
const PILL_HEIGHT = 16;
const PILL_MIN_Y = 34;
const PILL_MAX_Y = VIEW_HEIGHT - 14;

const TIER_COLUMNS: ReadonlyArray<{ tier: 0 | 1 | 2; x: number; label: string }> = [
  { tier: 0, x: 72, label: 'EDGE' },
  { tier: 1, x: 270, label: 'SERVICES' },
  { tier: 2, x: 468, label: 'DATA & ASYNC' },
];

const DEFAULT_TOPOLOGY_NODES: ReadonlyArray<TopologyServiceNode> = [
  {
    id: 'edge-gw',
    label: 'API Gateway',
    kind: 'gateway',
    tier: 0,
    health: 'healthy',
    rps: 2480,
    p95Ms: 18,
    errorRatePct: 0.1,
  },
  {
    id: 'auth-svc',
    label: 'Auth Service',
    kind: 'service',
    tier: 1,
    health: 'healthy',
    rps: 1420,
    p95Ms: 24,
    errorRatePct: 0.2,
  },
  {
    id: 'checkout-svc',
    label: 'Checkout API',
    kind: 'service',
    tier: 1,
    health: 'degraded',
    rps: 960,
    p95Ms: 142,
    errorRatePct: 1.8,
  },
  {
    id: 'orders-db',
    label: 'Orders DB',
    kind: 'database',
    tier: 2,
    health: 'error',
    rps: 680,
    p95Ms: 286,
    errorRatePct: 4.2,
  },
  {
    id: 'session-cache',
    label: 'Session Redis',
    kind: 'cache',
    tier: 2,
    health: 'healthy',
    rps: 1950,
    p95Ms: 6,
    errorRatePct: 0,
  },
  {
    id: 'event-queue',
    label: 'Order Queue',
    kind: 'queue',
    tier: 2,
    health: 'healthy',
    rps: 540,
    p95Ms: 15,
    errorRatePct: 0.1,
  },
];

const DEFAULT_TOPOLOGY_EDGES: ReadonlyArray<TopologyServiceEdge> = [
  {
    id: 'e-gw-auth',
    source: 'edge-gw',
    target: 'auth-svc',
    latencyMs: 14,
    errorRatePct: 0.1,
    rps: 1420,
  },
  {
    id: 'e-gw-checkout',
    source: 'edge-gw',
    target: 'checkout-svc',
    latencyMs: 92,
    errorRatePct: 1.1,
    rps: 960,
  },
  {
    id: 'e-auth-db',
    source: 'auth-svc',
    target: 'orders-db',
    latencyMs: 32,
    errorRatePct: 0.2,
    rps: 210,
  },
  {
    id: 'e-auth-cache',
    source: 'auth-svc',
    target: 'session-cache',
    latencyMs: 4,
    errorRatePct: 0,
    rps: 1380,
  },
  {
    id: 'e-checkout-db',
    source: 'checkout-svc',
    target: 'orders-db',
    latencyMs: 248,
    errorRatePct: 3.4,
    rps: 470,
  },
  {
    id: 'e-checkout-cache',
    source: 'checkout-svc',
    target: 'session-cache',
    latencyMs: 7,
    errorRatePct: 0,
    rps: 570,
  },
  {
    id: 'e-checkout-queue',
    source: 'checkout-svc',
    target: 'event-queue',
    latencyMs: 19,
    errorRatePct: 0.1,
    rps: 540,
  },
];

function roundTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

function clampNonNegative(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function getTierX(tier: 0 | 1 | 2): number {
  switch (tier) {
    case 0:
      return 72;
    case 1:
      return 270;
    case 2:
      return 468;
  }
}

function getKindLabel(kind: TopologyNodeKind): string {
  switch (kind) {
    case 'gateway':
      return 'Gateway';
    case 'service':
      return 'Service';
    case 'database':
      return 'Database';
    case 'queue':
      return 'Queue';
    case 'cache':
      return 'Cache';
  }
}

function getHealthLabel(health: TopologyHealthState): string {
  switch (health) {
    case 'healthy':
      return 'Healthy';
    case 'degraded':
      return 'Degraded';
    case 'error':
      return 'Error';
  }
}

function getHealthColor(health: TopologyHealthState): string {
  switch (health) {
    case 'healthy':
      return 'var(--prism-success-main)';
    case 'degraded':
      return 'var(--prism-warning-main)';
    case 'error':
      return 'var(--prism-error-main)';
  }
}

function deriveEdgeHealth(latencyMs: number, errorRatePct: number): TopologyHealthState {
  if (errorRatePct >= 2 || latencyMs >= 200) {
    return 'error';
  }
  if (errorRatePct >= 0.5 || latencyMs >= 80) {
    return 'degraded';
  }
  return 'healthy';
}

function formatRps(rps: number): string {
  const rounded = Math.round(rps);
  return rounded >= 1000 ? `${(rounded / 1000).toFixed(1)}k` : String(rounded);
}

function formatMs(ms: number): string {
  return `${Math.round(ms)}ms`;
}

function formatPct(pct: number): string {
  const rounded = Math.round(pct * 10) / 10;
  return `${Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)}%`;
}

function truncateLabel(label: string, maxLength = 14): string {
  return label.length > maxLength ? `${label.slice(0, maxLength - 1)}…` : label;
}

function buildEdgeGeometry(
  source: PositionedServiceNode,
  target: PositionedServiceNode
): { path: string; pillX: number; pillY: number } {
  const halfW = NODE_WIDTH / 2;

  if (source.tier < target.tier) {
    const x1 = roundTwo(source.x + halfW);
    const y1 = source.y;
    const x2 = roundTwo(target.x - halfW - 4);
    const y2 = target.y;
    const controlDx = roundTwo(Math.max(32, (x2 - x1) * 0.48));
    const c1x = roundTwo(x1 + controlDx);
    const c2x = roundTwo(x2 - controlDx);
    return {
      path: `M ${x1} ${y1} C ${c1x} ${y1}, ${c2x} ${y2}, ${x2} ${y2}`,
      pillX: roundTwo((x1 + x2) / 2),
      pillY: roundTwo((y1 + y2) / 2),
    };
  }

  if (source.tier > target.tier) {
    const x1 = roundTwo(source.x - halfW);
    const y1 = source.y;
    const x2 = roundTwo(target.x + halfW + 4);
    const y2 = target.y;
    const controlDx = roundTwo(Math.max(32, (x1 - x2) * 0.48));
    const c1x = roundTwo(x1 - controlDx);
    const c2x = roundTwo(x2 + controlDx);
    return {
      path: `M ${x1} ${y1} C ${c1x} ${y1}, ${c2x} ${y2}, ${x2} ${y2}`,
      pillX: roundTwo((x1 + x2) / 2),
      pillY: roundTwo((y1 + y2) / 2),
    };
  }

  // Same-tier lateral dependency arc
  const curveDir = source.tier === 2 ? -1 : 1;
  const edgeOffset = halfW * curveDir;
  const x1 = roundTwo(source.x + edgeOffset);
  const y1 = source.y;
  const x2 = roundTwo(target.x + edgeOffset + 4 * curveDir);
  const y2 = target.y;
  const arcX = roundTwo(x1 + 42 * curveDir);
  return {
    path: `M ${x1} ${y1} C ${arcX} ${y1}, ${arcX} ${y2}, ${x2} ${y2}`,
    pillX: roundTwo(x1 + 32 * curveDir),
    pillY: roundTwo((y1 + y2) / 2),
  };
}

function buildTopologyLayout(
  rawNodes: ReadonlyArray<TopologyServiceNode>,
  rawEdges: ReadonlyArray<TopologyServiceEdge>
): TopologyLayout {
  const seenNodeIds = new Set<string>();
  const tierBuckets = new Map<0 | 1 | 2, TopologyServiceNode[]>([
    [0, []],
    [1, []],
    [2, []],
  ]);

  let healthy = 0;
  let degraded = 0;
  let error = 0;

  for (const node of rawNodes) {
    const id = node.id.trim();
    if (!id || seenNodeIds.has(id)) continue;
    seenNodeIds.add(id);

    tierBuckets.get(node.tier)!.push({ ...node, id });

    if (node.health === 'healthy') {
      healthy += 1;
    } else if (node.health === 'degraded') {
      degraded += 1;
    } else {
      error += 1;
    }
  }

  const upstreamMap = new Map<string, Set<string>>();
  const downstreamMap = new Map<string, Set<string>>();
  for (const id of seenNodeIds) {
    upstreamMap.set(id, new Set<string>());
    downstreamMap.set(id, new Set<string>());
  }

  const seenEdgeIds = new Set<string>();
  const validEdges: TopologyServiceEdge[] = [];
  for (const edge of rawEdges) {
    const id = edge.id.trim();
    const source = edge.source.trim();
    const target = edge.target.trim();
    if (!id || seenEdgeIds.has(id) || source === target) continue;
    if (!seenNodeIds.has(source) || !seenNodeIds.has(target)) continue;
    seenEdgeIds.add(id);

    validEdges.push({
      ...edge,
      id,
      source,
      target,
    });
    downstreamMap.get(source)!.add(target);
    upstreamMap.get(target)!.add(source);
  }

  const usableHeight = VIEW_HEIGHT - TOP_PAD - BOTTOM_PAD;
  const positionedNodes: PositionedServiceNode[] = [];
  const nodeById = new Map<string, PositionedServiceNode>();

  for (const column of TIER_COLUMNS) {
    const bucket = tierBuckets.get(column.tier)!;
    const count = bucket.length;
    if (count === 0) continue;

    const cardHeight = Math.round(
      clampNumber(
        Math.floor((usableHeight - (count - 1) * 10) / count),
        MIN_NODE_HEIGHT,
        MAX_NODE_HEIGHT,
        MAX_NODE_HEIGHT
      )
    );

    bucket.forEach((node, index) => {
      const y = roundTwo(TOP_PAD + ((index + 0.5) / count) * usableHeight);
      const positioned: PositionedServiceNode = {
        id: node.id,
        raw: node,
        label: node.label,
        kind: node.kind,
        tier: node.tier,
        health: node.health,
        rps: clampNonNegative(node.rps),
        p95Ms: clampNonNegative(node.p95Ms),
        errorRatePct: clampNumber(node.errorRatePct, 0, 100, 0),
        x: getTierX(node.tier),
        y,
        width: NODE_WIDTH,
        height: cardHeight,
        upstreamIds: upstreamMap.get(node.id)!,
        downstreamIds: downstreamMap.get(node.id)!,
      };
      positionedNodes.push(positioned);
      nodeById.set(positioned.id, positioned);
    });
  }

  const positionedEdges: PositionedServiceEdge[] = validEdges.map((edge) => {
    const sourceNode = nodeById.get(edge.source)!;
    const targetNode = nodeById.get(edge.target)!;
    const latencyMs = clampNonNegative(edge.latencyMs);
    const errorRatePct = clampNumber(edge.errorRatePct, 0, 100, 0);
    const rps = clampNonNegative(edge.rps);
    const health = deriveEdgeHealth(latencyMs, errorRatePct);
    const geometry = buildEdgeGeometry(sourceNode, targetNode);
    const pillText = `${formatMs(latencyMs)} · ${formatPct(errorRatePct)} err`;
    const pillWidth = Math.max(66, Math.min(92, pillText.length * 4.8 + 14));

    return {
      id: edge.id,
      raw: edge,
      source: edge.source,
      target: edge.target,
      sourceLabel: sourceNode.label,
      targetLabel: targetNode.label,
      latencyMs,
      errorRatePct,
      rps,
      health,
      path: geometry.path,
      pillX: geometry.pillX,
      pillY: geometry.pillY,
      pillText,
      pillWidth: roundTwo(pillWidth),
    };
  });

  // Deterministic vertical separation pass so adjacent edge pills remain readable
  const placedPills: Array<{ x: number; y: number }> = [];
  for (const edge of positionedEdges) {
    let adjustedY = clampNumber(edge.pillY, PILL_MIN_Y, PILL_MAX_Y, edge.pillY);
    for (const prev of placedPills) {
      if (Math.abs(edge.pillX - prev.x) < 60 && Math.abs(adjustedY - prev.y) < 20) {
        adjustedY = clampNumber(prev.y + 20, PILL_MIN_Y, PILL_MAX_Y, adjustedY);
      }
    }
    edge.pillY = roundTwo(adjustedY);
    placedPills.push({ x: edge.pillX, y: edge.pillY });
  }

  const edgeById = new Map<string, PositionedServiceEdge>();
  for (const edge of positionedEdges) {
    edgeById.set(edge.id, edge);
  }

  return {
    nodes: positionedNodes,
    edges: positionedEdges,
    nodeById,
    edgeById,
    healthCounts: { healthy, degraded, error },
  };
}

function ServiceTopologyMapInner({
  nodes = DEFAULT_TOPOLOGY_NODES,
  edges = DEFAULT_TOPOLOGY_EDGES,
  title = 'Service Dependency Topology',
  onSelectNode,
  onSelectEdge,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: ServiceTopologyMapProps) {
  const override = useComponentOverride('ServiceTopologyMap');
  const headingId = useId();
  const rawUid = useId();
  const markerPrefix = `stm-${rawUid.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  const [issuesOnly, setIssuesOnly] = useState<boolean>(false);
  const [selection, setSelection] = useState<TopologySelection>(null);

  const nodeElementsRef = useRef<Map<string, SVGGElement>>(new Map());
  const edgeElementsRef = useRef<Map<string, SVGGElement>>(new Map());

  const layout = useMemo(() => buildTopologyLayout(nodes, edges), [nodes, edges]);

  const activeNode =
    selection?.kind === 'node' ? (layout.nodeById.get(selection.id) ?? null) : null;
  const activeEdge =
    selection?.kind === 'edge' ? (layout.edgeById.get(selection.id) ?? null) : null;

  const hasSelection = activeNode !== null || activeEdge !== null;
  const isEmpty = layout.nodes.length === 0;
  const issueNodeCount = layout.healthCounts.degraded + layout.healthCounts.error;

  const selectNode = useCallback(
    (node: PositionedServiceNode) => {
      setSelection({ kind: 'node', id: node.id });
      onSelectNode?.(node.raw);
    },
    [onSelectNode]
  );

  const selectEdge = useCallback(
    (edge: PositionedServiceEdge) => {
      setSelection({ kind: 'edge', id: edge.id });
      onSelectEdge?.(edge.raw);
    },
    [onSelectEdge]
  );

  const handleClearSelection = useCallback(() => {
    setSelection(null);
  }, []);

  const handleNodeKeyDown = useCallback(
    (
      event: KeyboardEvent<SVGGElement>,
      node: PositionedServiceNode,
      index: number
    ) => {
      if (event.nativeEvent.isComposing) return;

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        selectNode(node);
        return;
      }

      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault();
        const total = layout.nodes.length;
        const delta = event.key === 'ArrowRight' ? 1 : -1;
        const nextIndex = (index + delta + total) % total;
        const targetNode = layout.nodes[nextIndex]!;
        nodeElementsRef.current.get(targetNode.id)?.focus();
        selectNode(targetNode);
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        handleClearSelection();
      }
    },
    [handleClearSelection, layout.nodes, selectNode]
  );

  const handleEdgeKeyDown = useCallback(
    (
      event: KeyboardEvent<SVGGElement>,
      edge: PositionedServiceEdge,
      index: number
    ) => {
      if (event.nativeEvent.isComposing) return;

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        selectEdge(edge);
        return;
      }

      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault();
        const total = layout.edges.length;
        const delta = event.key === 'ArrowRight' ? 1 : -1;
        const nextIndex = (index + delta + total) % total;
        const targetEdge = layout.edges[nextIndex]!;
        edgeElementsRef.current.get(targetEdge.id)?.focus();
        selectEdge(targetEdge);
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        handleClearSelection();
      }
    },
    [handleClearSelection, layout.edges, selectEdge]
  );

  const merged = mergeProps({
    themeTarget: themeProps('service-topology-map', {
      empty: isEmpty,
      issuesOnly,
      selected: hasSelection,
    }),
    baseClassName: 'prism-slab p-4 sm:p-5 w-full max-w-full min-w-0 space-y-4',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('service-topology-map', 'header');
  const canvasClass = stableClassName('service-topology-map', 'canvas');
  const inspectorClass = stableClassName('service-topology-map', 'inspector');

  const arrowHealthyId = `${markerPrefix}-arrow-healthy`;
  const arrowDegradedId = `${markerPrefix}-arrow-degraded`;
  const arrowErrorId = `${markerPrefix}-arrow-error`;
  const arrowActiveId = `${markerPrefix}-arrow-active`;

  return (
    <div ref={ref} {...rest} {...merged}>
      <div
        className={cx(
          headerClass,
          'flex flex-wrap items-center justify-between gap-3 min-w-0'
        )}
      >
        <div className="min-w-0 flex flex-wrap items-center gap-2.5">
          <span
            className="prism-well w-8 h-8 rounded-full inline-flex items-center justify-center shrink-0"
            style={STYLE_PRIMARY_MAIN}
          >
            <Network aria-hidden="true" className="w-4 h-4 shrink-0" />
          </span>
          <h4
            id={headingId}
            className="text-sm font-semibold truncate"
            style={STYLE_TEXT_PRIMARY}
          >
            {title}
          </h4>
        </div>

        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <div
            role="group"
            aria-label="Cluster health summary"
            data-testid="topology-health-summary"
            className="flex flex-wrap items-center gap-1.5"
          >
            <span
              data-testid="topology-count-healthy"
              className="prism-well inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-mono tabular-nums font-medium shrink-0"
              style={STYLE_TEXT_PRIMARY}
            >
              <span
                aria-hidden="true"
                className="w-2 h-2 rounded-full shrink-0"
                style={STYLE_BG_SUCCESS}
              />
              <span>Healthy {layout.healthCounts.healthy}</span>
            </span>

            <span
              data-testid="topology-count-degraded"
              className="prism-well inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-mono tabular-nums font-medium shrink-0"
              style={STYLE_WARNING_MAIN}
            >
              <span
                aria-hidden="true"
                className="w-2 h-2 rounded-full shrink-0"
                style={STYLE_BG_WARNING}
              />
              <span>Degraded {layout.healthCounts.degraded}</span>
            </span>

            <span
              data-testid="topology-count-error"
              className="prism-well inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-mono tabular-nums font-medium shrink-0"
              style={STYLE_ERROR_MAIN}
            >
              <span
                aria-hidden="true"
                className="w-2 h-2 rounded-full shrink-0"
                style={STYLE_BG_ERROR}
              />
              <span>Error {layout.healthCounts.error}</span>
            </span>
          </div>

          <button
            type="button"
            aria-pressed={issuesOnly}
            data-testid="topology-issues-toggle"
            onClick={() => setIssuesOnly((prev) => !prev)}
            className={cx(
              'prism-focus-ring inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium cursor-pointer transition-[color,background-color,border-color,opacity,transform] shrink-0',
              issuesOnly ? 'prism-crystal font-semibold' : 'prism-well opacity-85 hover:opacity-100'
            )}
            style={{
              color: issuesOnly
                ? 'var(--prism-error-main)'
                : 'var(--prism-text-primary)',
            }}
          >
            <AlertTriangle aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
            <span>Errors &amp; Degraded Only</span>
          </button>
        </div>
      </div>

      {isEmpty ? (
        <div
          role="status"
          data-testid="topology-empty"
          className="prism-well rounded-2xl px-4 py-8 text-center text-xs"
          style={STYLE_TEXT_SECONDARY}
        >
          No services in topology — provide nodes to render dependency telemetry.
        </div>
      ) : (
        <>
          <div
            className={cx(
              canvasClass,
              'prism-well rounded-2xl p-2 sm:p-3 w-full max-w-full min-w-0 overflow-hidden'
            )}
          >
            <svg
              role="img"
              aria-labelledby={headingId}
              data-testid="topology-svg"
              viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
              className="w-full h-auto select-none block"
            >
              <defs>
                <marker
                  id={arrowHealthyId}
                  viewBox="0 0 8 8"
                  refX="6"
                  refY="4"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 7 4 L 0 7 z" fill="var(--prism-text-disabled)" />
                </marker>
                <marker
                  id={arrowDegradedId}
                  viewBox="0 0 8 8"
                  refX="6"
                  refY="4"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 7 4 L 0 7 z" fill="var(--prism-warning-main)" />
                </marker>
                <marker
                  id={arrowErrorId}
                  viewBox="0 0 8 8"
                  refX="6"
                  refY="4"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 7 4 L 0 7 z" fill="var(--prism-error-main)" />
                </marker>
                <marker
                  id={arrowActiveId}
                  viewBox="0 0 8 8"
                  refX="6"
                  refY="4"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 7 4 L 0 7 z" fill="var(--prism-primary-main)" />
                </marker>
              </defs>

              <g data-testid="topology-tier-headers" aria-hidden="true">
                {TIER_COLUMNS.map((column) => (
                  <text
                    key={`tier-hdr-${column.tier}`}
                    x={column.x}
                    y={18}
                    textAnchor="middle"
                    className="text-[9px] font-mono font-semibold tracking-wider"
                    style={STYLE_FILL_SECONDARY}
                  >
                    {column.label}
                  </text>
                ))}
              </g>

              <g data-testid="topology-edges-layer">
                {layout.edges.map((edge, edgeIndex) => {
                  const isSelected = activeEdge?.id === edge.id;
                  const isIncident =
                    activeNode !== null &&
                    (edge.source === activeNode.id || edge.target === activeNode.id);
                  const isIssue = edge.health !== 'healthy';

                  const isDimmed = hasSelection
                    ? !isSelected && !isIncident
                    : issuesOnly && !isIssue;

                  const edgeState = isSelected
                    ? 'selected'
                    : isIncident
                      ? 'incident'
                      : isDimmed
                        ? 'dimmed'
                        : isIssue && issuesOnly
                          ? 'issue'
                          : 'idle';

                  const strokeColor =
                    isSelected || (isIncident && edge.health === 'healthy')
                      ? 'var(--prism-primary-main)'
                      : edge.health === 'error'
                        ? 'var(--prism-error-main)'
                        : edge.health === 'degraded'
                          ? 'var(--prism-warning-main)'
                          : 'var(--prism-text-disabled)';

                  const markerId =
                    isSelected || (isIncident && edge.health === 'healthy')
                      ? arrowActiveId
                      : edge.health === 'error'
                        ? arrowErrorId
                        : edge.health === 'degraded'
                          ? arrowDegradedId
                          : arrowHealthyId;

                  const strokeWidth = isSelected
                    ? 2.5
                    : isIncident || edge.health === 'error'
                      ? 2
                      : 1.5;

                  const pillBorder =
                    isSelected
                      ? 'var(--prism-primary-main)'
                      : edge.health === 'error'
                        ? 'var(--prism-error-main)'
                        : edge.health === 'degraded'
                          ? 'var(--prism-warning-main)'
                          : 'var(--prism-well-border)';

                  const pillTextColor =
                    edge.health === 'error'
                      ? 'var(--prism-error-main)'
                      : edge.health === 'degraded'
                        ? 'var(--prism-warning-main)'
                        : isSelected || isIncident
                          ? 'var(--prism-text-primary)'
                          : 'var(--prism-text-secondary)';

                  return (
                    <g
                      key={edge.id}
                      ref={(el) => {
                        if (el) {
                          edgeElementsRef.current.set(edge.id, el);
                        } else {
                          edgeElementsRef.current.delete(edge.id);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      aria-pressed={isSelected}
                      aria-label={`Dependency ${edge.sourceLabel} to ${edge.targetLabel}, ${formatMs(edge.latencyMs)} latency, ${formatPct(edge.errorRatePct)} error rate, ${formatRps(edge.rps)} rps, ${getHealthLabel(edge.health)}`}
                      data-testid={`topology-edge-${edge.id}`}
                      data-health={edge.health}
                      data-state={edgeState}
                      opacity={isDimmed ? 0.2 : 1}
                      onClick={() => selectEdge(edge)}
                      onKeyDown={(e) => handleEdgeKeyDown(e, edge, edgeIndex)}
                      className="prism-focus-ring cursor-pointer"
                    >
                      <path
                        d={edge.path}
                        fill="none"
                        stroke="transparent"
                        strokeWidth={12}
                      />
                      <path
                        data-testid={`topology-edge-path-${edge.id}`}
                        d={edge.path}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={strokeWidth}
                        strokeDasharray={edge.health === 'degraded' ? '5 3' : undefined}
                        markerEnd={`url(#${markerId})`}
                      />
                      <rect
                        data-testid={`topology-edge-pill-${edge.id}`}
                        x={roundTwo(edge.pillX - edge.pillWidth / 2)}
                        y={roundTwo(edge.pillY - PILL_HEIGHT / 2)}
                        width={edge.pillWidth}
                        height={PILL_HEIGHT}
                        rx={8}
                        fill="var(--prism-well-end)"
                        stroke={pillBorder}
                        strokeWidth={isSelected ? 1.5 : 1}
                      />
                      <text
                        x={edge.pillX}
                        y={roundTwo(edge.pillY + 3)}
                        textAnchor="middle"
                        className="text-[8px] font-mono tabular-nums font-semibold"
                        style={{ fill: pillTextColor }}
                      >
                        {edge.pillText}
                      </text>
                    </g>
                  );
                })}
              </g>

              <g data-testid="topology-nodes-layer">
                {layout.nodes.map((node, nodeIndex) => {
                  const isSelected = activeNode?.id === node.id;
                  const isUpstream =
                    activeNode !== null && activeNode.upstreamIds.has(node.id);
                  const isDownstream =
                    activeNode !== null && activeNode.downstreamIds.has(node.id);
                  const isEdgeEndpoint =
                    activeEdge !== null &&
                    (activeEdge.source === node.id || activeEdge.target === node.id);
                  const isIssue = node.health !== 'healthy';

                  const isRelated = isUpstream || isDownstream || isEdgeEndpoint;
                  const isDimmed = hasSelection
                    ? !isSelected && !isRelated
                    : issuesOnly && !isIssue;

                  const nodeState = isSelected
                    ? 'selected'
                    : isUpstream
                      ? 'upstream'
                      : isDownstream
                        ? 'downstream'
                        : isEdgeEndpoint
                          ? 'endpoint'
                          : isDimmed
                            ? 'dimmed'
                            : isIssue && issuesOnly
                              ? 'issue'
                              : 'idle';

                  const left = roundTwo(node.x - node.width / 2);
                  const top = roundTwo(node.y - node.height / 2);
                  const healthToken = getHealthColor(node.health);

                  const cardStroke = isSelected
                    ? 'var(--prism-primary-main)'
                    : node.health === 'error'
                      ? 'var(--prism-error-main)'
                      : node.health === 'degraded'
                        ? 'var(--prism-warning-main)'
                        : isRelated
                          ? 'var(--prism-secondary-main)'
                          : 'var(--prism-well-border)';

                  const cardStrokeWidth = isSelected
                    ? 2
                    : node.health !== 'healthy' || isRelated
                      ? 1.5
                      : 1;

                  return (
                    <g
                      key={node.id}
                      ref={(el) => {
                        if (el) {
                          nodeElementsRef.current.set(node.id, el);
                        } else {
                          nodeElementsRef.current.delete(node.id);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      aria-pressed={isSelected}
                      aria-label={`${node.label}, ${getKindLabel(node.kind)}, ${getHealthLabel(node.health)}, tier ${node.tier}, ${formatRps(node.rps)} rps, ${formatMs(node.p95Ms)} p95, ${formatPct(node.errorRatePct)} error rate`}
                      data-testid={`topology-node-${node.id}`}
                      data-tier={String(node.tier)}
                      data-kind={node.kind}
                      data-health={node.health}
                      data-state={nodeState}
                      opacity={isDimmed ? 0.22 : 1}
                      onClick={() => selectNode(node)}
                      onKeyDown={(e) => handleNodeKeyDown(e, node, nodeIndex)}
                      className="prism-focus-ring cursor-pointer"
                    >
                      {isSelected ? (
                        <rect
                          data-testid={`topology-node-halo-${node.id}`}
                          x={roundTwo(left - 3)}
                          y={roundTwo(top - 3)}
                          width={node.width + 6}
                          height={node.height + 6}
                          rx={14}
                          fill="none"
                          stroke="var(--prism-primary-main)"
                          strokeWidth={1.5}
                          strokeDasharray="4 2"
                          pointerEvents="none"
                        />
                      ) : null}

                      <rect
                        x={left}
                        y={top}
                        width={node.width}
                        height={node.height}
                        rx={12}
                        fill={
                          isSelected || isRelated
                            ? 'var(--prism-crystal-top)'
                            : 'var(--prism-slab-top)'
                        }
                        stroke={cardStroke}
                        strokeWidth={cardStrokeWidth}
                      />

                      <circle
                        cx={roundTwo(left + 11)}
                        cy={roundTwo(top + 13)}
                        r={3.5}
                        fill={healthToken}
                      />

                      <text
                        x={roundTwo(left + 19)}
                        y={roundTwo(top + 16)}
                        className="text-[8px] font-mono uppercase tracking-wider"
                        style={STYLE_FILL_SECONDARY}
                      >
                        {getKindLabel(node.kind)}
                      </text>

                      <text
                        data-testid={`topology-node-label-${node.id}`}
                        x={roundTwo(left + 9)}
                        y={roundTwo(top + 31)}
                        className="text-[10px] font-semibold"
                        style={STYLE_FILL_PRIMARY}
                      >
                        {truncateLabel(node.label)}
                      </text>

                      <text
                        x={roundTwo(left + 9)}
                        y={roundTwo(top + node.height - 8)}
                        className="text-[8px] font-mono tabular-nums"
                        style={{
                          fill:
                            node.health === 'healthy'
                              ? 'var(--prism-text-secondary)'
                              : healthToken,
                        }}
                      >
                        {formatRps(node.rps)} rps · {formatMs(node.p95Ms)}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>

          <div
            aria-live="polite"
            data-testid="topology-inspector"
            className={cx(
              inspectorClass,
              'prism-well rounded-2xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs min-w-0'
            )}
          >
            {activeNode ? (
              <>
                <div className="min-w-0 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span
                    className="font-semibold truncate"
                    style={STYLE_TEXT_PRIMARY}
                  >
                    {activeNode.label}
                  </span>
                  <span
                    className="font-mono tabular-nums"
                    style={STYLE_TEXT_SECONDARY}
                  >
                    {getKindLabel(activeNode.kind)}
                  </span>
                  <span aria-hidden="true" style={STYLE_TEXT_DISABLED}>
                    ·
                  </span>
                  <span
                    className="font-semibold"
                    style={{ color: getHealthColor(activeNode.health) }}
                  >
                    {getHealthLabel(activeNode.health)}
                  </span>
                  <span aria-hidden="true" style={STYLE_TEXT_DISABLED}>
                    ·
                  </span>
                  <span
                    className="font-mono tabular-nums"
                    style={STYLE_TEXT_PRIMARY}
                  >
                    {formatRps(activeNode.rps)} rps
                  </span>
                  <span aria-hidden="true" style={STYLE_TEXT_DISABLED}>
                    ·
                  </span>
                  <span
                    className="font-mono tabular-nums"
                    style={STYLE_TEXT_PRIMARY}
                  >
                    P95 {formatMs(activeNode.p95Ms)}
                  </span>
                  <span aria-hidden="true" style={STYLE_TEXT_DISABLED}>
                    ·
                  </span>
                  <span
                    className="font-mono tabular-nums"
                    style={{
                      color:
                        activeNode.health === 'healthy'
                          ? 'var(--prism-text-primary)'
                          : getHealthColor(activeNode.health),
                    }}
                  >
                    {formatPct(activeNode.errorRatePct)} err
                  </span>
                  <span aria-hidden="true" style={STYLE_TEXT_DISABLED}>
                    ·
                  </span>
                  <span
                    className="font-mono tabular-nums"
                    style={STYLE_TEXT_SECONDARY}
                  >
                    {activeNode.upstreamIds.size} upstream / {activeNode.downstreamIds.size}{' '}
                    downstream
                  </span>
                </div>

                <button
                  type="button"
                  data-testid="topology-clear-selection"
                  onClick={handleClearSelection}
                  className="prism-focus-ring prism-crystal inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium cursor-pointer shrink-0"
                  style={STYLE_TEXT_PRIMARY}
                >
                  <X aria-hidden="true" className="w-3 h-3 shrink-0" />
                  <span>Clear</span>
                </button>
              </>
            ) : activeEdge ? (
              <>
                <div className="min-w-0 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span
                    className="font-semibold truncate"
                    style={STYLE_TEXT_PRIMARY}
                  >
                    {activeEdge.sourceLabel} → {activeEdge.targetLabel}
                  </span>
                  <span
                    className="font-semibold"
                    style={{ color: getHealthColor(activeEdge.health) }}
                  >
                    {getHealthLabel(activeEdge.health)}
                  </span>
                  <span aria-hidden="true" style={STYLE_TEXT_DISABLED}>
                    ·
                  </span>
                  <span
                    className="font-mono tabular-nums"
                    style={STYLE_TEXT_PRIMARY}
                  >
                    {formatMs(activeEdge.latencyMs)} latency
                  </span>
                  <span aria-hidden="true" style={STYLE_TEXT_DISABLED}>
                    ·
                  </span>
                  <span
                    className="font-mono tabular-nums"
                    style={{
                      color:
                        activeEdge.health === 'healthy'
                          ? 'var(--prism-text-primary)'
                          : getHealthColor(activeEdge.health),
                    }}
                  >
                    {formatPct(activeEdge.errorRatePct)} err
                  </span>
                  <span aria-hidden="true" style={STYLE_TEXT_DISABLED}>
                    ·
                  </span>
                  <span
                    className="font-mono tabular-nums"
                    style={STYLE_TEXT_SECONDARY}
                  >
                    {formatRps(activeEdge.rps)} rps
                  </span>
                </div>

                <button
                  type="button"
                  data-testid="topology-clear-selection"
                  onClick={handleClearSelection}
                  className="prism-focus-ring prism-crystal inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium cursor-pointer shrink-0"
                  style={STYLE_TEXT_PRIMARY}
                >
                  <X aria-hidden="true" className="w-3 h-3 shrink-0" />
                  <span>Clear</span>
                </button>
              </>
            ) : (
              <div className="min-w-0 flex flex-wrap items-center justify-between gap-2 w-full">
                <span style={STYLE_TEXT_SECONDARY}>
                  Select a service node or dependency edge to inspect live telemetry.
                </span>
                <span
                  className="font-mono tabular-nums text-[11px] shrink-0"
                  style={STYLE_TEXT_SECONDARY}
                >
                  {layout.nodes.length} services · {layout.edges.length} links ·{' '}
                  {issueNodeCount} degraded/error
                </span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export const ServiceTopologyMap = memo(ServiceTopologyMapInner);
ServiceTopologyMap.displayName = 'ServiceTopologyMap';
