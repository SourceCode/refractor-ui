'use client';

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { GitBranch, Maximize2, Minus, Plus, Trash2, X } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { themeProps } from '../utils/themeProps';

export type FlowNodeTone = 'primary' | 'emerald' | 'cobalt' | 'crystal';

export interface FlowNode {
  /** Unique identifier for the node. */
  id: string;
  /** Visible human-readable label rendered safely as literal text. */
  label: string;
  /** Optional category tag shown in the tone-accented header strip. */
  category?: string;
  /** Horizontal world coordinate in pixels. */
  x: number;
  /** Vertical world coordinate in pixels. */
  y: number;
  /** Optical glass header accent tone. */
  tone?: FlowNodeTone;
}

export interface FlowEdge {
  /** Unique identifier for the directed edge. */
  id: string;
  /** Source node identifier (output port). */
  sourceId: string;
  /** Target node identifier (input port). */
  targetId: string;
  /** Optional label displayed along the cubic bezier midpoint. */
  label?: string;
}

type NodeGraphCanvasBaseProps = Omit<BaseProps<HTMLDivElement>, 'children'>;

export interface NodeGraphCanvasProps extends NodeGraphCanvasBaseProps {
  /** Controlled list of graph nodes. */
  nodes?: ReadonlyArray<FlowNode>;
  /** Initial uncontrolled list of graph nodes. */
  defaultNodes?: ReadonlyArray<FlowNode>;
  /** Controlled list of directed edges connecting node ports. */
  edges?: ReadonlyArray<FlowEdge>;
  /** Initial uncontrolled list of directed edges. */
  defaultEdges?: ReadonlyArray<FlowEdge>;
  /** Fired with the next sanitized nodes array after add, drag, nudge, or delete. */
  onNodesChange?: (nodes: FlowNode[]) => void;
  /** Fired with the next sanitized edges array after connect, edge removal, or node deletion. */
  onEdgesChange?: (edges: FlowEdge[]) => void;
  /** Fired whenever the selected node changes (or null when cleared). */
  onSelectNode?: (node: FlowNode | null) => void;
  /** Viewport height in pixels (clamped 220..900, default 380). */
  height?: number;
  /** Disables node creation, dragging, nudging, connecting, and deleting. */
  readOnly?: boolean;
}

interface Point2D {
  x: number;
  y: number;
}

interface EdgeGeometry {
  d: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  midX: number;
  midY: number;
}

interface EdgeRenderItem {
  edge: FlowEdge;
  source: FlowNode;
  target: FlowNode;
  geometry: EdgeGeometry;
}

const MIN_HEIGHT = 220;
const MAX_HEIGHT = 900;
const DEFAULT_HEIGHT = 380;

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2.5;
const DEFAULT_ZOOM = 1;
const ZOOM_STEP = 0.25;

const MIN_COORD = -4000;
const MAX_COORD = 4000;
const MIN_PAN = -4000;
const MAX_PAN = 4000;

const NODE_WIDTH = 176;
const NODE_HEIGHT = 84;
const PORT_OFFSET_Y = 42;
const KEYBOARD_NUDGE_PX = 16;
const GRID_BASE_PX = 24;

function roundOne(value: number): number {
  return Math.round(value * 10) / 10;
}

function roundTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

function stopEventPropagation(event: { stopPropagation: () => void }): void {
  event.stopPropagation();
}

function normalizeTone(tone?: FlowNodeTone): FlowNodeTone {
  if (tone === 'primary' || tone === 'emerald' || tone === 'cobalt' || tone === 'crystal') {
    return tone;
  }
  return 'crystal';
}

function getToneForIndex(index: number): FlowNodeTone {
  switch (index % 4) {
    case 0:
      return 'primary';
    case 1:
      return 'emerald';
    case 2:
      return 'cobalt';
    default:
      return 'crystal';
  }
}

function getToneHeaderClasses(tone: FlowNodeTone): string {
  switch (tone) {
    case 'primary':
      return 'bg-[var(--prism-primary-main)] text-[var(--prism-primary-contrast)]';
    case 'emerald':
      return 'bg-[var(--prism-success-main)] text-[var(--prism-success-contrast)]';
    case 'cobalt':
      return 'bg-[var(--prism-info-main)] text-[var(--prism-info-contrast)]';
    case 'crystal':
      return 'bg-[var(--prism-secondary-main)] text-[var(--prism-secondary-contrast)]';
  }
}

function sanitizeNodes(raw?: ReadonlyArray<FlowNode>): FlowNode[] {
  if (!raw || raw.length === 0) return [];
  const seen = new Set<string>();
  const result: FlowNode[] = [];
  for (const item of raw) {
    const id = item.id.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const next: FlowNode = {
      id,
      label: item.label,
      x: roundOne(clampNumber(item.x, MIN_COORD, MAX_COORD, 0)),
      y: roundOne(clampNumber(item.y, MIN_COORD, MAX_COORD, 0)),
    };
    if (item.category !== undefined) {
      next.category = item.category;
    }
    if (item.tone !== undefined) {
      next.tone = normalizeTone(item.tone);
    }
    result.push(next);
  }
  return result;
}

function buildCubicEdgePath(source: FlowNode, target: FlowNode): EdgeGeometry {
  const x1 = roundOne(source.x + NODE_WIDTH);
  const y1 = roundOne(source.y + PORT_OFFSET_Y);
  const x2 = roundOne(target.x);
  const y2 = roundOne(target.y + PORT_OFFSET_Y);
  const controlDelta = roundOne(Math.max(48, Math.abs(x2 - x1) * 0.5));
  const c1x = roundOne(x1 + controlDelta);
  const c2x = roundOne(x2 - controlDelta);
  return {
    d: `M ${x1} ${y1} C ${c1x} ${y1}, ${c2x} ${y2}, ${x2} ${y2}`,
    x1,
    y1,
    x2,
    y2,
    midX: roundOne((x1 + x2) / 2),
    midY: roundOne((y1 + y2) / 2),
  };
}

function resolveEdges(
  raw: ReadonlyArray<FlowEdge> | undefined,
  nodeMap: ReadonlyMap<string, FlowNode>
): EdgeRenderItem[] {
  if (!raw || raw.length === 0) return [];
  const seenIds = new Set<string>();
  const seenPairs = new Set<string>();
  const items: EdgeRenderItem[] = [];
  for (const edge of raw) {
    const id = edge.id.trim();
    const sourceId = edge.sourceId.trim();
    const targetId = edge.targetId.trim();
    if (!id || seenIds.has(id) || sourceId === targetId) continue;
    const source = nodeMap.get(sourceId);
    const target = nodeMap.get(targetId);
    if (!source || !target) continue;
    const pairKey = `${sourceId}->${targetId}`;
    if (seenPairs.has(pairKey)) continue;
    seenIds.add(id);
    seenPairs.add(pairKey);
    const normalized: FlowEdge =
      edge.label !== undefined
        ? { id, sourceId, targetId, label: edge.label }
        : { id, sourceId, targetId };
    items.push({
      edge: normalized,
      source,
      target,
      geometry: buildCubicEdgePath(source, target),
    });
  }
  return items;
}

function allocateUniqueId(
  prefix: string,
  existingIds: ReadonlySet<string>,
  counterRef: { current: number }
): string {
  let candidate = `${prefix}-${counterRef.current}`;
  while (existingIds.has(candidate)) {
    counterRef.current += 1;
    candidate = `${prefix}-${counterRef.current}`;
  }
  counterRef.current += 1;
  return candidate;
}

function NodeGraphCanvasInner({
  nodes,
  defaultNodes,
  edges,
  defaultEdges,
  onNodesChange,
  onEdgesChange,
  onSelectNode,
  height = DEFAULT_HEIGHT,
  readOnly = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: NodeGraphCanvasProps) {
  const override = useComponentOverride('NodeGraphCanvas');
  const viewportRef = useRef<HTMLDivElement>(null);
  const cleanupPointerRef = useRef<(() => void) | null>(null);
  const panMovedRef = useRef(false);
  const nodeCounterRef = useRef(1);
  const edgeCounterRef = useRef(1);

  const safeHeight = Math.round(clampNumber(height, MIN_HEIGHT, MAX_HEIGHT, DEFAULT_HEIGHT));

  const isNodesControlled = nodes !== undefined;
  const [uncontrolledNodes, setUncontrolledNodes] = useState<FlowNode[]>(() =>
    sanitizeNodes(defaultNodes)
  );
  const activeNodes = useMemo(
    () => (isNodesControlled ? sanitizeNodes(nodes) : uncontrolledNodes),
    [isNodesControlled, nodes, uncontrolledNodes]
  );

  const nodeMap = useMemo(() => {
    const map = new Map<string, FlowNode>();
    for (const node of activeNodes) {
      map.set(node.id, node);
    }
    return map;
  }, [activeNodes]);

  const isEdgesControlled = edges !== undefined;
  const [uncontrolledEdges, setUncontrolledEdges] = useState<FlowEdge[]>(() =>
    defaultEdges ? [...defaultEdges] : []
  );
  const activeRawEdges = isEdgesControlled ? edges : uncontrolledEdges;

  const edgeRenderItems = useMemo(
    () => resolveEdges(activeRawEdges, nodeMap),
    [activeRawEdges, nodeMap]
  );
  const validEdges = useMemo(
    () => edgeRenderItems.map((item) => item.edge),
    [edgeRenderItems]
  );

  const [pan, setPan] = useState<Point2D>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(DEFAULT_ZOOM);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [connectingFromId, setConnectingFromId] = useState<string | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState<boolean>(false);

  const selectedNode = selectedNodeId ? (nodeMap.get(selectedNodeId) ?? null) : null;
  const connectingFromNode = connectingFromId ? (nodeMap.get(connectingFromId) ?? null) : null;

  const selectedNodeIdRef = useRef<string | null>(selectedNode?.id ?? null);
  selectedNodeIdRef.current = selectedNode?.id ?? null;

  const nodesRef = useRef<FlowNode[]>(activeNodes);
  nodesRef.current = activeNodes;

  const validEdgesRef = useRef<FlowEdge[]>(validEdges);
  validEdgesRef.current = validEdges;

  const panRef = useRef<Point2D>(pan);
  panRef.current = pan;

  const zoomRef = useRef<number>(zoom);
  zoomRef.current = zoom;

  const isNodesControlledRef = useRef(isNodesControlled);
  isNodesControlledRef.current = isNodesControlled;

  const isEdgesControlledRef = useRef(isEdgesControlled);
  isEdgesControlledRef.current = isEdgesControlled;

  const onNodesChangeRef = useRef(onNodesChange);
  onNodesChangeRef.current = onNodesChange;

  const onEdgesChangeRef = useRef(onEdgesChange);
  onEdgesChangeRef.current = onEdgesChange;

  const onSelectNodeRef = useRef(onSelectNode);
  onSelectNodeRef.current = onSelectNode;

  useEffect(() => {
    return () => {
      cleanupPointerRef.current?.();
    };
  }, []);

  useEffect(() => {
    if (!connectingFromId) return;
    const handleWindowKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.isComposing) return;
      if (event.key === 'Escape') {
        setConnectingFromId(null);
      }
    };
    window.addEventListener('keydown', handleWindowKeyDown);
    return () => {
      window.removeEventListener('keydown', handleWindowKeyDown);
    };
  }, [connectingFromId]);

  const commitNodes = useCallback((next: FlowNode[]) => {
    const sanitized = sanitizeNodes(next);
    if (!isNodesControlledRef.current) {
      nodesRef.current = sanitized;
      setUncontrolledNodes(sanitized);
    }
    onNodesChangeRef.current?.(sanitized);
  }, []);

  const commitEdges = useCallback((next: FlowEdge[], currentNodes: ReadonlyArray<FlowNode>) => {
    const map = new Map<string, FlowNode>();
    for (const node of currentNodes) {
      map.set(node.id, node);
    }
    const sanitized = resolveEdges(next, map).map((item) => item.edge);
    if (!isEdgesControlledRef.current) {
      validEdgesRef.current = sanitized;
      setUncontrolledEdges(sanitized);
    }
    onEdgesChangeRef.current?.(sanitized);
  }, []);

  const selectNode = useCallback((node: FlowNode | null) => {
    const nextId = node ? node.id : null;
    selectedNodeIdRef.current = nextId;
    setSelectedNodeId(nextId);
    onSelectNodeRef.current?.(node);
  }, []);

  const updateZoom = useCallback((rawZoom: number) => {
    const nextZoom = roundTwo(clampNumber(rawZoom, MIN_ZOOM, MAX_ZOOM, DEFAULT_ZOOM));
    zoomRef.current = nextZoom;
    setZoom(nextZoom);
  }, []);

  const updatePan = useCallback((next: Point2D) => {
    const clamped: Point2D = {
      x: roundOne(clampNumber(next.x, MIN_PAN, MAX_PAN, 0)),
      y: roundOne(clampNumber(next.y, MIN_PAN, MAX_PAN, 0)),
    };
    panRef.current = clamped;
    setPan(clamped);
  }, []);

  const handleZoomOut = useCallback(() => {
    updateZoom(zoomRef.current - ZOOM_STEP);
  }, [updateZoom]);

  const handleZoomIn = useCallback(() => {
    updateZoom(zoomRef.current + ZOOM_STEP);
  }, [updateZoom]);

  const handleResetView = useCallback(() => {
    const viewport = viewportRef.current;
    const currentNodes = nodesRef.current;
    const firstNode = currentNodes[0];

    if (viewport && firstNode) {
      const rect = viewport.getBoundingClientRect();
      if (
        Number.isFinite(rect.width) &&
        Number.isFinite(rect.height) &&
        rect.width > 0 &&
        rect.height > 0
      ) {
        let minX = firstNode.x;
        let minY = firstNode.y;
        let maxX = minX + NODE_WIDTH;
        let maxY = minY + NODE_HEIGHT;
        for (const node of currentNodes) {
          minX = Math.min(minX, node.x);
          minY = Math.min(minY, node.y);
          maxX = Math.max(maxX, node.x + NODE_WIDTH);
          maxY = Math.max(maxY, node.y + NODE_HEIGHT);
        }
        const graphWidth = Math.max(NODE_WIDTH, maxX - minX);
        const graphHeight = Math.max(NODE_HEIGHT, maxY - minY);
        const padding = 56;
        const availW = Math.max(120, rect.width - padding * 2);
        const availH = Math.max(120, rect.height - padding * 2 - 48);
        const fitZoom = roundTwo(
          clampNumber(Math.min(availW / graphWidth, availH / graphHeight, 1), MIN_ZOOM, MAX_ZOOM, 1)
        );
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        updateZoom(fitZoom);
        updatePan({
          x: rect.width / 2 - centerX * fitZoom,
          y: (rect.height + 32) / 2 - centerY * fitZoom,
        });
        return;
      }
    }

    updateZoom(DEFAULT_ZOOM);
    updatePan({ x: 0, y: 0 });
  }, [updatePan, updateZoom]);

  const handleAddNode = useCallback(() => {
    if (readOnly) return;
    const currentNodes = nodesRef.current;
    const existingIds = new Set(currentNodes.map((n) => n.id));
    const nextId = allocateUniqueId('node', existingIds, nodeCounterRef);
    const index = currentNodes.length;
    const newNode: FlowNode = {
      id: nextId,
      label: `Node ${index + 1}`,
      category: 'Process',
      x: roundOne(clampNumber(72 + (index % 4) * 230, MIN_COORD, MAX_COORD, 72)),
      y: roundOne(clampNumber(96 + Math.floor(index / 4) * 124, MIN_COORD, MAX_COORD, 96)),
      tone: getToneForIndex(index),
    };
    const nextNodes = [...currentNodes, newNode];
    commitNodes(nextNodes);
    selectNode(newNode);
  }, [commitNodes, readOnly, selectNode]);

  const deleteNodeById = useCallback(
    (targetId: string) => {
      if (readOnly) return;
      const currentNodes = nodesRef.current;
      const nextNodes = currentNodes.filter((n) => n.id !== targetId);
      commitNodes(nextNodes);

      const currentEdges = validEdgesRef.current;
      const remainingEdges = currentEdges.filter(
        (e) => e.sourceId !== targetId && e.targetId !== targetId
      );
      if (remainingEdges.length !== currentEdges.length) {
        commitEdges(remainingEdges, nextNodes);
      }

      setConnectingFromId((prev) => (prev === targetId ? null : prev));
      selectNode(null);
    },
    [commitEdges, commitNodes, readOnly, selectNode]
  );

  const handleDeleteSelected = useCallback(() => {
    if (readOnly || !selectedNode) return;
    deleteNodeById(selectedNode.id);
  }, [deleteNodeById, readOnly, selectedNode]);

  const handleRemoveEdge = useCallback(
    (edgeId: string) => {
      if (readOnly) return;
      const nextEdges = validEdgesRef.current.filter((e) => e.id !== edgeId);
      commitEdges(nextEdges, nodesRef.current);
    },
    [commitEdges, readOnly]
  );

  const handleOutputPortClick = useCallback(
    (nodeId: string) => {
      if (readOnly) return;
      setConnectingFromId((prev) => (prev === nodeId ? null : nodeId));
    },
    [readOnly]
  );

  const handleInputPortClick = useCallback(
    (targetId: string) => {
      if (readOnly || !connectingFromNode) return;
      const sourceId = connectingFromNode.id;
      if (sourceId === targetId) {
        setConnectingFromId(null);
        return;
      }
      const currentEdges = validEdgesRef.current;
      const duplicate = currentEdges.some(
        (e) => e.sourceId === sourceId && e.targetId === targetId
      );
      if (duplicate) {
        setConnectingFromId(null);
        return;
      }
      const existingEdgeIds = new Set(currentEdges.map((e) => e.id));
      const nextId = allocateUniqueId('edge', existingEdgeIds, edgeCounterRef);
      const newEdge: FlowEdge = {
        id: nextId,
        sourceId,
        targetId,
      };
      commitEdges([...currentEdges, newEdge], nodesRef.current);
      setConnectingFromId(null);
    },
    [commitEdges, connectingFromNode, readOnly]
  );

  const handleNodePointerDown = useCallback(
    (node: FlowNode, event: ReactPointerEvent<HTMLDivElement>) => {
      event.stopPropagation();
      if (event.button > 0) return;

      selectNode(node);

      if (readOnly) return;

      event.preventDefault();
      cleanupPointerRef.current?.();

      const startClientX = event.clientX;
      const startClientY = event.clientY;
      const startNodeX = node.x;
      const startNodeY = node.y;
      const activeZoom = zoomRef.current;
      const draggedId = node.id;

      setDraggingNodeId(draggedId);

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const dx = (moveEvent.clientX - startClientX) / activeZoom;
        const dy = (moveEvent.clientY - startClientY) / activeZoom;
        const nextX = roundOne(clampNumber(startNodeX + dx, MIN_COORD, MAX_COORD, startNodeX));
        const nextY = roundOne(clampNumber(startNodeY + dy, MIN_COORD, MAX_COORD, startNodeY));

        const nextNodes = nodesRef.current.map((item) =>
          item.id === draggedId ? { ...item, x: nextX, y: nextY } : item
        );
        commitNodes(nextNodes);
      };

      const cleanup = () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerEnd);
        window.removeEventListener('pointercancel', handlePointerEnd);
        cleanupPointerRef.current = null;
      };

      const handlePointerEnd = () => {
        cleanup();
        setDraggingNodeId(null);
      };

      cleanupPointerRef.current = cleanup;
      window.addEventListener('pointermove', handlePointerMove, { passive: true });
      window.addEventListener('pointerup', handlePointerEnd);
      window.addEventListener('pointercancel', handlePointerEnd);
    },
    [commitNodes, readOnly, selectNode]
  );

  const handleCanvasPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button > 0) return;
      cleanupPointerRef.current?.();

      const startClientX = event.clientX;
      const startClientY = event.clientY;
      const startPanX = panRef.current.x;
      const startPanY = panRef.current.y;
      panMovedRef.current = false;

      setIsPanning(true);

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const dx = moveEvent.clientX - startClientX;
        const dy = moveEvent.clientY - startClientY;
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
          panMovedRef.current = true;
        }
        updatePan({ x: startPanX + dx, y: startPanY + dy });
      };

      const cleanup = () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerEnd);
        window.removeEventListener('pointercancel', handlePointerEnd);
        cleanupPointerRef.current = null;
      };

      const handlePointerEnd = () => {
        cleanup();
        setIsPanning(false);
      };

      cleanupPointerRef.current = cleanup;
      window.addEventListener('pointermove', handlePointerMove, { passive: true });
      window.addEventListener('pointerup', handlePointerEnd);
      window.addEventListener('pointercancel', handlePointerEnd);
    },
    [updatePan]
  );

  const handleCanvasClick = useCallback(() => {
    if (panMovedRef.current) {
      panMovedRef.current = false;
      return;
    }
    setConnectingFromId(null);
    selectNode(null);
  }, [selectNode]);

  const handleNodeKeyDown = useCallback(
    (node: FlowNode, event: KeyboardEvent<HTMLDivElement>) => {
      if (event.nativeEvent.isComposing) return;

      if (event.target !== event.currentTarget) {
        if (event.key === 'Escape' && connectingFromId) {
          event.preventDefault();
          event.stopPropagation();
          setConnectingFromId(null);
        }
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        if (connectingFromId) {
          setConnectingFromId(null);
        } else {
          selectNode(null);
        }
        return;
      }

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        event.stopPropagation();
        selectNode(node);
        return;
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (readOnly) return;
        event.preventDefault();
        event.stopPropagation();
        deleteNodeById(node.id);
        return;
      }

      const dx =
        event.key === 'ArrowLeft'
          ? -KEYBOARD_NUDGE_PX
          : event.key === 'ArrowRight'
            ? KEYBOARD_NUDGE_PX
            : 0;
      const dy =
        event.key === 'ArrowUp'
          ? -KEYBOARD_NUDGE_PX
          : event.key === 'ArrowDown'
            ? KEYBOARD_NUDGE_PX
            : 0;

      if (dx === 0 && dy === 0) return;
      if (readOnly) return;

      event.preventDefault();
      event.stopPropagation();

      const nextX = roundOne(clampNumber(node.x + dx, MIN_COORD, MAX_COORD, node.x));
      const nextY = roundOne(clampNumber(node.y + dy, MIN_COORD, MAX_COORD, node.y));
      const nextNodes = nodesRef.current.map((item) =>
        item.id === node.id ? { ...item, x: nextX, y: nextY } : item
      );
      commitNodes(nextNodes);
    },
    [commitNodes, connectingFromId, deleteNodeById, readOnly, selectNode]
  );

  const handleViewportKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.nativeEvent.isComposing) return;

      if (event.key === 'Escape' && connectingFromId) {
        event.preventDefault();
        setConnectingFromId(null);
        return;
      }

      if (event.key === '+' || event.key === '=') {
        event.preventDefault();
        handleZoomIn();
        return;
      }

      if (event.key === '-' || event.key === '_') {
        event.preventDefault();
        handleZoomOut();
        return;
      }

      if (event.key === '0') {
        event.preventDefault();
        handleResetView();
      }
    },
    [connectingFromId, handleResetView, handleZoomIn, handleZoomOut]
  );

  const gridStepPx = roundTwo(GRID_BASE_PX * zoom);

  const merged = mergeProps({
    themeTarget: themeProps('node-graph-canvas', {
      readOnly,
      empty: activeNodes.length === 0,
      connecting: connectingFromNode !== null,
      dragging: draggingNodeId !== null,
      panning: isPanning,
    }),
    baseClassName: 'prism-slab relative w-full overflow-hidden select-none',
    overrideClassName: override?.className,
    userClassName: className,
    baseStyle: { height: `${safeHeight}px` },
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const viewportClass = stableClassName('node-graph-canvas', 'viewport');
  const toolbarClass = stableClassName('node-graph-canvas', 'toolbar');
  const nodeClass = stableClassName('node-graph-canvas', 'node');
  const edgeClass = stableClassName('node-graph-canvas', 'edge');

  return (
    <div ref={ref} role="region" aria-label="Node graph canvas" {...rest} {...merged}>
      {/* Floating Optical Crystal HUD Toolbar */}
      <div className="pointer-events-none absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2">
        <div
          role="toolbar"
          aria-label="Node graph controls"
          className={cx(
            toolbarClass,
            'prism-crystal pointer-events-auto rounded-2xl px-2.5 py-1.5 inline-flex flex-wrap items-center gap-1.5'
          )}
        >
          <button
            type="button"
            aria-label="Zoom out"
            disabled={zoom <= MIN_ZOOM}
            onClick={handleZoomOut}
            className="prism-well prism-focus-ring h-7 w-7 rounded-full inline-flex items-center justify-center text-slate-700 dark:text-slate-200 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:scale-105 transition-transform"
          >
            <Minus className="w-3.5 h-3.5" aria-hidden="true" />
          </button>

          <span
            data-testid="node-graph-zoom-readout"
            className="text-xs font-mono tabular-nums font-semibold text-slate-800 dark:text-slate-100 min-w-[44px] text-center"
          >
            {Math.round(zoom * 100)}%
          </span>

          <button
            type="button"
            aria-label="Zoom in"
            disabled={zoom >= MAX_ZOOM}
            onClick={handleZoomIn}
            className="prism-well prism-focus-ring h-7 w-7 rounded-full inline-flex items-center justify-center text-slate-700 dark:text-slate-200 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:scale-105 transition-transform"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
          </button>

          <span aria-hidden="true" className="w-px h-4 bg-[var(--prism-divider)] mx-0.5" />

          <button
            type="button"
            aria-label="Fit and reset view"
            onClick={handleResetView}
            className="prism-well prism-focus-ring h-7 px-2.5 rounded-full inline-flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer hover:brightness-105"
          >
            <Maximize2 className="w-3 h-3" aria-hidden="true" />
            <span>Reset</span>
          </button>

          {!readOnly ? (
            <button
              type="button"
              onClick={handleAddNode}
              className="prism-btn-primary prism-focus-ring h-7 px-3 inline-flex items-center gap-1 text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 relative z-10" aria-hidden="true" />
              <span className="relative z-10">Add Node</span>
            </button>
          ) : null}

          <button
            type="button"
            aria-label="Delete selected node"
            disabled={readOnly || selectedNode === null}
            onClick={handleDeleteSelected}
            className="prism-well prism-focus-ring h-7 px-2.5 rounded-full inline-flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:text-[var(--prism-error-main)] transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Delete</span>
          </button>
        </div>

        <div className="pointer-events-auto flex flex-wrap items-center gap-2">
          {connectingFromNode ? (
            <div
              role="status"
              data-testid="node-graph-connecting-status"
              className="prism-crystal rounded-full px-3 py-1.5 inline-flex items-center gap-2 text-[11px] font-medium text-slate-800 dark:text-slate-100"
            >
              <span
                className="w-2 h-2 rounded-full bg-[var(--prism-primary-main)]"
                aria-hidden="true"
              />
              <span className="max-w-[180px] truncate">
                Connecting from {connectingFromNode.label}
              </span>
              <button
                type="button"
                aria-label="Cancel connection"
                onClick={() => setConnectingFromId(null)}
                className="prism-focus-ring rounded-full p-0.5 text-slate-500 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white cursor-pointer"
              >
                <X className="w-3 h-3" aria-hidden="true" />
              </button>
            </div>
          ) : null}

          <div
            data-testid="node-graph-telemetry"
            className="prism-crystal rounded-full px-3 py-1.5 inline-flex items-center gap-2 text-[11px] font-mono tabular-nums font-medium text-slate-700 dark:text-slate-200"
          >
            <GitBranch
              className="w-3.5 h-3.5 text-[var(--prism-secondary-main)]"
              aria-hidden="true"
            />
            <span>
              {activeNodes.length === 1 ? '1 node' : `${activeNodes.length} nodes`} ·{' '}
              {validEdges.length === 1 ? '1 edge' : `${validEdges.length} edges`}
            </span>
            {readOnly ? (
              <>
                <span aria-hidden="true">{' · '}</span>
                <span className="font-sans font-semibold text-[var(--prism-primary-main)]">
                  Read-only
                </span>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Infinite 2D Optical Studio Grid Viewport */}
      <div
        ref={viewportRef}
        role="application"
        tabIndex={0}
        aria-label="Interactive node graph workspace. Use plus and minus keys to zoom, zero to reset view, and Escape to cancel connections."
        data-testid="node-graph-viewport"
        data-pan-x={String(pan.x)}
        data-pan-y={String(pan.y)}
        data-zoom={String(zoom)}
        onPointerDown={handleCanvasPointerDown}
        onClick={handleCanvasClick}
        onKeyDown={handleViewportKeyDown}
        style={{
          backgroundSize: `${gridStepPx}px ${gridStepPx}px, ${gridStepPx}px ${gridStepPx}px, 100% 100%`,
          backgroundPosition: `${pan.x}px ${pan.y}px, ${pan.x}px ${pan.y}px, 0px 0px`,
          touchAction: 'none',
        }}
        className={cx(
          viewportClass,
          'prism-studio-grid prism-focus-ring relative w-full h-full overflow-hidden touch-none',
          isPanning ? 'cursor-grabbing' : 'cursor-grab'
        )}
      >
        {/* World Transform Layer */}
        <div
          data-testid="node-graph-world"
          style={{
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
          className="absolute inset-0 will-change-transform"
        >
          {/* Token-Driven SVG Cubic Bezier Edge Layer */}
          <svg
            aria-hidden="true"
            data-testid="node-graph-edges-svg"
            width={1}
            height={1}
            className="absolute top-0 left-0 overflow-visible pointer-events-none"
          >
            {edgeRenderItems.map(({ edge, geometry }) => {
              const highlighted =
                selectedNode !== null &&
                (edge.sourceId === selectedNode.id || edge.targetId === selectedNode.id);
              const strokeToken = highlighted
                ? 'var(--prism-primary-main)'
                : 'var(--prism-secondary-main)';

              return (
                <g key={edge.id}>
                  <path
                    data-testid={`flow-edge-path-${edge.id}`}
                    data-highlighted={highlighted ? 'true' : undefined}
                    d={geometry.d}
                    fill="none"
                    stroke={strokeToken}
                    strokeWidth={highlighted ? 2.75 : 2}
                    strokeLinecap="round"
                  />
                  <circle cx={geometry.x1} cy={geometry.y1} r={3} fill={strokeToken} />
                  <circle cx={geometry.x2} cy={geometry.y2} r={3} fill={strokeToken} />
                </g>
              );
            })}
          </svg>

          {/* Edge Labels & Click-to-Remove Controls */}
          {edgeRenderItems.map(({ edge, source, target, geometry }) => {
            if (!edge.label && readOnly) return null;
            return (
              <div
                key={edge.id}
                data-testid={`flow-edge-badge-${edge.id}`}
                onPointerDown={stopEventPropagation}
                onClick={stopEventPropagation}
                style={{
                  left: `${geometry.midX}px`,
                  top: `${geometry.midY}px`,
                }}
                className={cx(
                  edgeClass,
                  'prism-crystal absolute -translate-x-1/2 -translate-y-1/2 z-10 rounded-full px-2 py-0.5 inline-flex items-center gap-1'
                )}
              >
                {edge.label ? (
                  <span className="text-[10px] font-medium text-slate-700 dark:text-slate-200 max-w-[140px] truncate">
                    {edge.label}
                  </span>
                ) : null}
                {!readOnly ? (
                  <button
                    type="button"
                    aria-label={
                      edge.label
                        ? `Remove edge ${edge.label}`
                        : `Remove edge from ${source.label} to ${target.label}`
                    }
                    data-testid={`remove-edge-${edge.id}`}
                    onPointerDown={stopEventPropagation}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveEdge(edge.id);
                    }}
                    className="prism-focus-ring w-4 h-4 rounded-full inline-flex items-center justify-center text-slate-500 hover:text-[var(--prism-error-main)] dark:text-slate-300 cursor-pointer transition-colors"
                  >
                    <X className="w-3 h-3" aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            );
          })}

          {/* Refractive Glass Draggable Nodes */}
          {activeNodes.map((node) => {
            const tone = normalizeTone(node.tone);
            const isSelected = selectedNode?.id === node.id;
            const isConnectingSource = connectingFromNode?.id === node.id;
            const isConnectTargetCandidate =
              connectingFromNode !== null && connectingFromNode.id !== node.id && !readOnly;
            const isDraggingThis = draggingNodeId === node.id;

            return (
              <div
                key={node.id}
                role="group"
                tabIndex={0}
                aria-roledescription="graph node"
                aria-label={`${node.label}${node.category ? `, ${node.category}` : ''}. Position ${Math.round(node.x)}, ${Math.round(node.y)}.${readOnly ? ' Read-only.' : ' Use arrow keys to nudge and Delete to remove.'}`}
                data-testid={`flow-node-${node.id}`}
                data-node-id={node.id}
                data-tone={tone}
                data-selected={isSelected ? 'true' : undefined}
                onPointerDown={(e) => handleNodePointerDown(node, e)}
                onClick={(e) => {
                  e.stopPropagation();
                  if (selectedNodeIdRef.current !== node.id) {
                    selectNode(node);
                  }
                }}
                onKeyDown={(e) => handleNodeKeyDown(node, e)}
                style={{
                  left: `${node.x}px`,
                  top: `${node.y}px`,
                  width: `${NODE_WIDTH}px`,
                  minHeight: `${NODE_HEIGHT}px`,
                  touchAction: 'none',
                }}
                className={cx(
                  nodeClass,
                  'prism-crystal prism-focus-ring absolute rounded-2xl border border-[var(--prism-divider)] transition-shadow touch-none',
                  isSelected ? 'ring-2 ring-[var(--prism-primary-main)] z-20' : 'z-10',
                  readOnly ? 'cursor-default' : isDraggingThis ? 'cursor-grabbing' : 'cursor-grab'
                )}
              >
                {/* Tone-Accented Refractive Header Strip */}
                <div
                  className={cx(
                    'flex items-center justify-between gap-2 px-3 py-1.5 rounded-t-[15px] text-[10px] font-semibold tracking-wide uppercase',
                    getToneHeaderClasses(tone)
                  )}
                >
                  <span className="truncate">{node.category ?? 'Node'}</span>
                  <span className="font-mono tabular-nums opacity-90 shrink-0">
                    {Math.round(node.x)},{Math.round(node.y)}
                  </span>
                </div>

                {/* Node Content Body */}
                <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                    {node.label}
                  </span>
                </div>

                {/* Left Input Port Orb */}
                <button
                  type="button"
                  disabled={readOnly}
                  aria-label={`Connect input port of ${node.label}`}
                  data-testid={`node-input-port-${node.id}`}
                  onPointerDown={stopEventPropagation}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleInputPortClick(node.id);
                  }}
                  style={{ top: `${PORT_OFFSET_Y}px` }}
                  className={cx(
                    'prism-thumb prism-focus-ring absolute -left-2.5 -translate-y-1/2 w-5 h-5 rounded-full border-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-transform',
                    isConnectTargetCandidate
                      ? 'border-[var(--prism-primary-main)] ring-2 ring-[var(--prism-primary-main)]/40 enabled:hover:scale-110'
                      : 'border-[var(--prism-secondary-main)] enabled:hover:scale-110'
                  )}
                />

                {/* Right Output Port Orb */}
                <button
                  type="button"
                  disabled={readOnly}
                  aria-label={`Start connection from ${node.label}`}
                  aria-pressed={isConnectingSource}
                  data-testid={`node-output-port-${node.id}`}
                  onPointerDown={stopEventPropagation}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOutputPortClick(node.id);
                  }}
                  style={{ top: `${PORT_OFFSET_Y}px` }}
                  className={cx(
                    'prism-focus-ring absolute -right-2.5 -translate-y-1/2 w-5 h-5 rounded-full border-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-transform',
                    isConnectingSource
                      ? 'bg-[var(--prism-primary-main)] border-[var(--prism-primary-contrast)] ring-2 ring-[var(--prism-primary-main)]/45 scale-110'
                      : 'prism-thumb border-[var(--prism-secondary-main)] enabled:hover:scale-110'
                  )}
                />
              </div>
            );
          })}
        </div>

        {/* Graceful Empty Canvas Overlay */}
        {activeNodes.length === 0 ? (
          <div
            data-testid="node-graph-empty"
            className="pointer-events-none absolute inset-0 flex items-center justify-center p-6 text-center"
          >
            <div className="prism-crystal rounded-2xl px-4 py-3 max-w-xs space-y-1">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                No nodes on canvas
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {readOnly
                  ? 'This graph is empty in read-only mode.'
                  : 'Click Add Node in the top toolbar to place your first refractive node.'}
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export const NodeGraphCanvas = memo(NodeGraphCanvasInner);
NodeGraphCanvas.displayName = 'NodeGraphCanvas';
