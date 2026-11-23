'use client';

import { memo, useId, useMemo, useState, type KeyboardEvent } from 'react';
import { Minus, Network, Plus, RotateCcw } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { STYLE_FILL_PRIMARY, STYLE_PRIMARY_MAIN, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type NetworkNodeTone = 'primary' | 'secondary' | 'emerald' | 'amber' | 'rose';

export interface NetworkNode {
  /** Stable unique identifier used for edge bindings, selection, and deterministic seeding. */
  id: string;
  /** Visible human-readable label rendered safely as literal text. */
  label: string;
  /** Optional cluster group name enabling header group filter pills. */
  group?: string;
  /** Optional positive finite weight used to scale node circle radius. */
  weight?: number;
  /** Optional semantic optical tone mapped to --prism-* CSS custom properties. */
  tone?: NetworkNodeTone;
}

export interface NetworkEdge {
  /** Stable unique identifier for the topology edge. */
  id: string;
  /** Source node identifier. */
  source: string;
  /** Target node identifier. */
  target: string;
  /** Optional human-readable label rendered near the edge midpoint. */
  label?: string;
  /** Optional positive finite weight scaling spring tension and stroke width. */
  weight?: number;
}

export interface NetworkForceGraphProps extends BaseProps<HTMLDivElement> {
  /** Topology nodes positioned via deterministic force-directed relaxation. */
  nodes: NetworkNode[];
  /** Topology edges connecting valid node IDs. */
  edges: NetworkEdge[];
  /** Card heading linked to the SVG graphic (defaults to 'Topology Network Graph'). */
  title?: string;
  /** SVG viewport height in pixels, clamped to [180, 520] (defaults to 280). */
  height?: number;
  /** Invoked when a node is clicked or activated with Enter/Space, passing node and degree. */
  onSelectNode?: (node: NetworkNode, degree: number) => void;
}

interface NormalizedNode {
  id: string;
  raw: NetworkNode;
  group: string | undefined;
  weight: number | undefined;
  tone: NetworkNodeTone;
  colorToken: string;
}

interface NormalizedEdge {
  id: string;
  source: string;
  target: string;
  label: string | undefined;
  springWeight: number;
  strokeWidth: number;
}

interface GroupFilterItem {
  key: string;
  name: string;
  tone: NetworkNodeTone;
  colorToken: string;
}

interface PositionedNode extends NormalizedNode {
  x: number;
  y: number;
  r: number;
  degree: number;
}

interface PositionedEdge {
  id: string;
  sourceId: string;
  targetId: string;
  label: string | undefined;
  strokeWidth: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  midX: number;
  midY: number;
}

interface GraphLayout {
  nodes: PositionedNode[];
  edges: PositionedEdge[];
  nodeById: ReadonlyMap<string, PositionedNode>;
  neighborsById: ReadonlyMap<string, PositionedNode[]>;
}

const VIEW_WIDTH = 600;
const MIN_HEIGHT = 180;
const MAX_HEIGHT = 520;
const DEFAULT_HEIGHT = 280;

const MIN_ZOOM = 0.75;
const MAX_ZOOM = 2;
const DEFAULT_ZOOM = 1;
const ZOOM_STEP = 0.25;

const RELAX_ITERATIONS = 40;
const PAD_X = 52;
const PAD_TOP = 32;
const PAD_BOTTOM = 42;
const MIN_RADIUS = 10;
const MAX_RADIUS = 22;
const DEFAULT_RADIUS = 14;

function roundTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

function formatZoom(zoom: number): string {
  return `${roundTwo(zoom)}x`;
}

function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function getDefaultTone(index: number): NetworkNodeTone {
  switch (index % 5) {
    case 0:
      return 'primary';
    case 1:
      return 'secondary';
    case 2:
      return 'emerald';
    case 3:
      return 'amber';
    default:
      return 'rose';
  }
}

function getToneToken(tone: NetworkNodeTone): string {
  switch (tone) {
    case 'primary':
      return 'var(--prism-primary-main)';
    case 'secondary':
      return 'var(--prism-secondary-main)';
    case 'emerald':
      return 'var(--prism-success-main)';
    case 'amber':
      return 'var(--prism-warning-main)';
    case 'rose':
      return 'var(--prism-error-main)';
  }
}

function computeNodeRadius(score: number, minScore: number, maxScore: number): number {
  if (minScore === maxScore) {
    return DEFAULT_RADIUS;
  }
  const ratio = (score - minScore) / (maxScore - minScore);
  return roundTwo(MIN_RADIUS + ratio * (MAX_RADIUS - MIN_RADIUS));
}

function computeForceLayout(
  visibleNodes: ReadonlyArray<NormalizedNode>,
  visibleEdges: ReadonlyArray<NormalizedEdge>,
  height: number
): GraphLayout {
  const count = visibleNodes.length;
  const centerX = VIEW_WIDTH / 2;
  const centerY = height / 2;
  const minX = PAD_X;
  const maxX = VIEW_WIDTH - PAD_X;
  const minY = PAD_TOP;
  const maxY = height - PAD_BOTTOM;

  const indexById = new Map<string, number>();
  const degrees = new Array<number>(count).fill(0);
  const neighborIndices: Array<Set<number>> = [];

  for (let i = 0; i < count; i += 1) {
    indexById.set(visibleNodes[i]!.id, i);
    neighborIndices.push(new Set<number>());
  }

  for (const edge of visibleEdges) {
    const u = indexById.get(edge.source)!;
    const v = indexById.get(edge.target)!;
    degrees[u] = degrees[u]! + 1;
    degrees[v] = degrees[v]! + 1;
    neighborIndices[u]!.add(v);
    neighborIndices[v]!.add(u);
  }

  const posX: number[] = [];
  const posY: number[] = [];

  if (count === 1) {
    posX.push(centerX);
    posY.push(centerY);
  } else {
    const initRadius = Math.min(maxX - minX, maxY - minY) * 0.36;
    for (let i = 0; i < count; i += 1) {
      const seed = hashString(visibleNodes[i]!.id);
      const baseAngle = (2 * Math.PI * i) / count - Math.PI / 2;
      const angleJitter = ((seed & 0xff) / 255 - 0.5) * 0.18;
      const radiusScale = 0.88 + (((seed >>> 8) & 0xff) / 255) * 0.24;
      const x = centerX + Math.cos(baseAngle + angleJitter) * initRadius * radiusScale;
      const y = centerY + Math.sin(baseAngle + angleJitter) * initRadius * radiusScale;
      posX.push(clampNumber(x, minX, maxX, centerX));
      posY.push(clampNumber(y, minY, maxY, centerY));
    }

    const usableWidth = maxX - minX;
    const usableHeight = maxY - minY;
    const idealSpacing = clampNumber(
      Math.sqrt((usableWidth * usableHeight) / count),
      45,
      160,
      90
    );
    const repulsionStrength = idealSpacing * idealSpacing * 0.65;
    const restLength = idealSpacing * 0.72;
    const springStrength = 0.06;
    const gravityStrength = 0.04;
    const initialStep = Math.min(usableWidth, usableHeight) * 0.14;

    const fx = new Array<number>(count);
    const fy = new Array<number>(count);

    for (let iter = 0; iter < RELAX_ITERATIONS; iter += 1) {
      fx.fill(0);
      fy.fill(0);

      // Pairwise softened Coulomb repulsion
      for (let i = 0; i < count; i += 1) {
        for (let j = i + 1; j < count; j += 1) {
          const dx = posX[i]! - posX[j]!;
          const dy = posY[i]! - posY[j]!;
          const distSq = dx * dx + dy * dy + 1;
          const dist = Math.sqrt(distSq);
          const force = repulsionStrength / Math.max(distSq, 25);
          const ux = dx / dist;
          const uy = dy / dist;
          fx[i] = fx[i]! + ux * force;
          fy[i] = fy[i]! + uy * force;
          fx[j] = fx[j]! - ux * force;
          fy[j] = fy[j]! - uy * force;
        }
      }

      // Hooke spring attraction along topology edges
      for (const edge of visibleEdges) {
        const u = indexById.get(edge.source)!;
        const v = indexById.get(edge.target)!;
        const dx = posX[v]! - posX[u]!;
        const dy = posY[v]! - posY[u]!;
        const dist = Math.sqrt(dx * dx + dy * dy + 0.01);
        const displacement = dist - restLength;
        const force = springStrength * displacement * edge.springWeight;
        const ux = dx / dist;
        const uy = dy / dist;
        fx[u] = fx[u]! + ux * force;
        fy[u] = fy[u]! + uy * force;
        fx[v] = fx[v]! - ux * force;
        fy[v] = fy[v]! - uy * force;
      }

      // Gentle center gravity + annealed displacement clamped to viewport bounds
      const maxStep = initialStep * (1 - iter / RELAX_ITERATIONS) + 2;
      for (let i = 0; i < count; i += 1) {
        const totalFx = fx[i]! + (centerX - posX[i]!) * gravityStrength;
        const totalFy = fy[i]! + (centerY - posY[i]!) * gravityStrength;
        const mag = Math.sqrt(totalFx * totalFx + totalFy * totalFy + 0.0001);
        const step = Math.min(mag, maxStep);
        posX[i] = clampNumber(posX[i]! + (totalFx / mag) * step, minX, maxX, centerX);
        posY[i] = clampNumber(posY[i]! + (totalFy / mag) * step, minY, maxY, centerY);
      }
    }
  }

  const scores = visibleNodes.map((node, idx) =>
    node.weight !== undefined ? node.weight : degrees[idx]!
  );
  let minScore = scores[0]!;
  let maxScore = scores[0]!;
  for (const score of scores) {
    if (score < minScore) minScore = score;
    if (score > maxScore) maxScore = score;
  }

  const nodeById = new Map<string, PositionedNode>();
  const positionedNodes: PositionedNode[] = visibleNodes.map((node, idx) => {
    const positioned: PositionedNode = {
      ...node,
      x: roundTwo(posX[idx]!),
      y: roundTwo(posY[idx]!),
      r: computeNodeRadius(scores[idx]!, minScore, maxScore),
      degree: degrees[idx]!,
    };
    nodeById.set(node.id, positioned);
    return positioned;
  });

  const neighborsById = new Map<string, PositionedNode[]>();
  for (let i = 0; i < count; i += 1) {
    const list: PositionedNode[] = [];
    for (const neighborIdx of neighborIndices[i]!) {
      list.push(positionedNodes[neighborIdx]!);
    }
    neighborsById.set(positionedNodes[i]!.id, list);
  }

  const positionedEdges: PositionedEdge[] = visibleEdges.map((edge) => {
    const sourceNode = nodeById.get(edge.source)!;
    const targetNode = nodeById.get(edge.target)!;
    return {
      id: edge.id,
      sourceId: edge.source,
      targetId: edge.target,
      label: edge.label,
      strokeWidth: edge.strokeWidth,
      x1: sourceNode.x,
      y1: sourceNode.y,
      x2: targetNode.x,
      y2: targetNode.y,
      midX: roundTwo((sourceNode.x + targetNode.x) / 2),
      midY: roundTwo((sourceNode.y + targetNode.y) / 2),
    };
  });

  return {
    nodes: positionedNodes,
    edges: positionedEdges,
    nodeById,
    neighborsById,
  };
}

function NetworkForceGraphInner({
  nodes,
  edges,
  title = 'Topology Network Graph',
  height = DEFAULT_HEIGHT,
  onSelectNode,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: NetworkForceGraphProps) {
  const override = useComponentOverride('NetworkForceGraph');
  const headingId = useId();
  const [hiddenGroups, setHiddenGroups] = useState<ReadonlySet<string>>(() => new Set());
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(DEFAULT_ZOOM);

  const safeHeight = Math.round(
    clampNumber(height, MIN_HEIGHT, MAX_HEIGHT, DEFAULT_HEIGHT)
  );
  const centerX = VIEW_WIDTH / 2;
  const centerY = safeHeight / 2;

  const { validNodes, groups } = useMemo(() => {
    const seenIds = new Set<string>();
    const groupIndexMap = new Map<string, number>();
    const extractedGroups: GroupFilterItem[] = [];
    const normalized: NormalizedNode[] = [];

    for (const node of nodes) {
      const id = node.id.trim();
      if (!id || seenIds.has(id)) continue;
      seenIds.add(id);

      const trimmedGroup = node.group?.trim();
      const group = trimmedGroup ? trimmedGroup : undefined;

      let tone: NetworkNodeTone;
      if (group !== undefined) {
        let groupIdx = groupIndexMap.get(group);
        if (groupIdx === undefined) {
          groupIdx = extractedGroups.length;
          groupIndexMap.set(group, groupIdx);
          const groupTone = node.tone ?? getDefaultTone(groupIdx);
          extractedGroups.push({
            key: `grp:${group}`,
            name: group,
            tone: groupTone,
            colorToken: getToneToken(groupTone),
          });
        }
        tone = node.tone ?? extractedGroups[groupIdx]!.tone;
      } else {
        tone = node.tone ?? getDefaultTone(normalized.length);
      }

      const validWeight =
        typeof node.weight === 'number' &&
        Number.isFinite(node.weight) &&
        node.weight > 0
          ? node.weight
          : undefined;

      normalized.push({
        id,
        raw: node,
        group,
        weight: validWeight,
        tone,
        colorToken: getToneToken(tone),
      });
    }

    return { validNodes: normalized, groups: extractedGroups };
  }, [nodes]);

  const visibleNodes = useMemo(
    () =>
      validNodes.filter(
        (node) => node.group === undefined || !hiddenGroups.has(node.group)
      ),
    [validNodes, hiddenGroups]
  );

  const visibleEdges = useMemo(() => {
    const visibleIds = new Set<string>();
    for (const node of visibleNodes) {
      visibleIds.add(node.id);
    }

    const seenEdgeIds = new Set<string>();
    const resolved: NormalizedEdge[] = [];
    for (const edge of edges) {
      const id = edge.id.trim();
      const source = edge.source.trim();
      const target = edge.target.trim();
      if (!id || seenEdgeIds.has(id) || source === target) continue;
      if (!visibleIds.has(source) || !visibleIds.has(target)) continue;
      seenEdgeIds.add(id);

      const trimmedLabel = edge.label?.trim();
      const validWeight =
        typeof edge.weight === 'number' &&
        Number.isFinite(edge.weight) &&
        edge.weight > 0
          ? edge.weight
          : undefined;

      resolved.push({
        id,
        source,
        target,
        label: trimmedLabel ? trimmedLabel : undefined,
        springWeight:
          validWeight !== undefined ? clampNumber(validWeight, 0.5, 2.5, 1) : 1,
        strokeWidth:
          validWeight !== undefined
            ? roundTwo(clampNumber(1 + validWeight * 0.35, 1.25, 3.5, 1.5))
            : 1.5,
      });
    }
    return resolved;
  }, [edges, visibleNodes]);

  const isEmpty = validNodes.length === 0;
  const allHidden = !isEmpty && visibleNodes.length === 0;

  const layout = useMemo<GraphLayout | null>(() => {
    if (visibleNodes.length === 0) return null;
    return computeForceLayout(visibleNodes, visibleEdges, safeHeight);
  }, [visibleNodes, visibleEdges, safeHeight]);

  const resolvedActiveNode = useMemo<PositionedNode | null>(() => {
    if (!layout || selectedNodeId === null) return null;
    return layout.nodeById.get(selectedNodeId) ?? null;
  }, [layout, selectedNodeId]);

  const activeNodeId = resolvedActiveNode?.id ?? null;

  const activeNeighbors = useMemo<PositionedNode[]>(() => {
    if (!layout || activeNodeId === null) return [];
    return layout.neighborsById.get(activeNodeId)!;
  }, [layout, activeNodeId]);

  const activeNeighborIds = useMemo<ReadonlySet<string>>(
    () => new Set(activeNeighbors.map((neighbor) => neighbor.id)),
    [activeNeighbors]
  );

  const handleToggleGroup = (groupName: string) => {
    setHiddenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupName)) {
        next.delete(groupName);
      } else {
        next.add(groupName);
      }
      return next;
    });
  };

  const handleZoomOut = () => {
    setZoom((prev) => roundTwo(clampNumber(prev - ZOOM_STEP, MIN_ZOOM, MAX_ZOOM, DEFAULT_ZOOM)));
  };

  const handleZoomIn = () => {
    setZoom((prev) => roundTwo(clampNumber(prev + ZOOM_STEP, MIN_ZOOM, MAX_ZOOM, DEFAULT_ZOOM)));
  };

  const handleZoomReset = () => {
    setZoom(DEFAULT_ZOOM);
  };

  const handleSelectNode = (node: PositionedNode) => {
    setSelectedNodeId(node.id);
    onSelectNode?.(node.raw, node.degree);
  };

  const handleClearSelection = () => {
    setSelectedNodeId(null);
  };

  const handleNodeKeyDown = (
    event: KeyboardEvent<SVGCircleElement>,
    node: PositionedNode
  ) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSelectNode(node);
      return;
    }
    if (event.key === 'Escape' && selectedNodeId !== null) {
      event.preventDefault();
      handleClearSelection();
    }
  };

  const merged = mergeProps({
    themeTarget: themeProps('network-force-graph', {
      empty: isEmpty,
      allHidden,
      zoomed: zoom !== DEFAULT_ZOOM,
      selected: resolvedActiveNode !== null,
    }),
    baseClassName: 'prism-slab p-5 w-full space-y-4',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('network-force-graph', 'header');
  const filtersClass = stableClassName('network-force-graph', 'filters');
  const canvasClass = stableClassName('network-force-graph', 'canvas');
  const inspectorClass = stableClassName('network-force-graph', 'inspector');

  return (
    <div ref={ref} {...rest} {...merged}>
      <div className={cx(headerClass, 'space-y-2.5')}>
        <div className="flex flex-wrap items-center justify-between gap-3">
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
            <span
              data-testid="network-count-pill"
              className="prism-crystal rounded-full px-2.5 py-0.5 text-[11px] font-mono tabular-nums font-medium shrink-0"
              style={STYLE_TEXT_SECONDARY}
            >
              {visibleNodes.length} nodes · {visibleEdges.length} edges
            </span>
          </div>

          <div
            role="group"
            aria-label="Graph zoom controls"
            data-testid="network-zoom-controls"
            className="prism-crystal rounded-full px-1.5 py-1 inline-flex items-center gap-1 shrink-0"
          >
            <button
              type="button"
              aria-label="Zoom Out"
              data-testid="network-zoom-out"
              disabled={zoom <= MIN_ZOOM}
              onClick={handleZoomOut}
              className="prism-well prism-focus-ring h-6 w-6 rounded-full inline-flex items-center justify-center cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:scale-105 transition-transform"
              style={STYLE_TEXT_PRIMARY}
            >
              <Minus aria-hidden="true" className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              aria-label="Reset"
              data-testid="network-zoom-reset"
              onClick={handleZoomReset}
              className="prism-well prism-focus-ring h-6 rounded-full px-2 inline-flex items-center gap-1 text-[11px] font-mono tabular-nums font-medium cursor-pointer transition-opacity"
              style={STYLE_TEXT_PRIMARY}
            >
              <RotateCcw aria-hidden="true" className="w-3 h-3" />
              <span>Reset</span>
              <span
                data-testid="network-zoom-value"
                style={STYLE_TEXT_SECONDARY}
              >
                {formatZoom(zoom)}
              </span>
            </button>
            <button
              type="button"
              aria-label="Zoom In"
              data-testid="network-zoom-in"
              disabled={zoom >= MAX_ZOOM}
              onClick={handleZoomIn}
              className="prism-well prism-focus-ring h-6 w-6 rounded-full inline-flex items-center justify-center cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:scale-105 transition-transform"
              style={STYLE_TEXT_PRIMARY}
            >
              <Plus aria-hidden="true" className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {groups.length > 0 ? (
          <div
            role="group"
            aria-label="Filter cluster groups"
            data-testid="network-group-filters"
            className={cx(filtersClass, 'flex flex-wrap items-center gap-1.5')}
          >
            {groups.map((grp) => {
              const isVisible = !hiddenGroups.has(grp.name);
              return (
                <button
                  key={grp.key}
                  type="button"
                  aria-pressed={isVisible}
                  data-testid={`network-group-${grp.name}`}
                  data-tone={grp.tone}
                  onClick={() => handleToggleGroup(grp.name)}
                  className={cx(
                    'prism-focus-ring inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium cursor-pointer transition-[color,background-color,border-color,opacity,transform]',
                    isVisible ? 'prism-crystal' : 'prism-well opacity-55 line-through'
                  )}
                  style={STYLE_TEXT_PRIMARY}
                >
                  <span
                    aria-hidden="true"
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{
                      backgroundColor: isVisible
                        ? grp.colorToken
                        : 'var(--prism-text-disabled)',
                    }}
                  />
                  <span>{grp.name}</span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {layout === null ? (
        <div
          data-testid="network-graph-empty"
          className="prism-well rounded-2xl px-4 py-8 text-center text-xs"
          style={STYLE_TEXT_SECONDARY}
        >
          {isEmpty
            ? 'No network topology nodes available.'
            : 'All cluster groups hidden — toggle a group filter above to display nodes.'}
        </div>
      ) : (
        <>
          <div className={cx(canvasClass, 'prism-well rounded-2xl p-2 overflow-hidden')}>
            <svg
              role="img"
              aria-labelledby={headingId}
              aria-label={`${title} network force graph`}
              data-testid="network-force-svg"
              data-zoom={String(zoom)}
              viewBox={`0 0 ${VIEW_WIDTH} ${safeHeight}`}
              className="w-full block overflow-hidden"
              style={{ height: `${safeHeight}px` }}
            >
              <g
                data-testid="network-graph-stage"
                transform={`translate(${centerX} ${centerY}) scale(${zoom}) translate(${-centerX} ${-centerY})`}
              >
                <g data-testid="network-edges-layer">
                  {layout.edges.map((edge) => {
                    const isIncident =
                      activeNodeId !== null &&
                      (edge.sourceId === activeNodeId || edge.targetId === activeNodeId);
                    const isDimmed = activeNodeId !== null && !isIncident;
                    const stroke = isIncident
                      ? 'var(--prism-primary-main)'
                      : 'var(--prism-divider)';
                    const strokeOpacity = isIncident ? 0.95 : isDimmed ? 0.2 : 0.85;
                    const strokeWidth = isIncident
                      ? roundTwo(edge.strokeWidth + 1)
                      : edge.strokeWidth;

                    return (
                      <g key={edge.id} opacity={strokeOpacity}>
                        <line
                          data-testid={`network-edge-${edge.id}`}
                          data-active={isIncident ? 'true' : 'false'}
                          x1={edge.x1}
                          y1={edge.y1}
                          x2={edge.x2}
                          y2={edge.y2}
                          stroke={stroke}
                          strokeWidth={strokeWidth}
                          strokeLinecap="round"
                        />
                        {edge.label ? (
                          <text
                            data-testid={`network-edge-label-${edge.id}`}
                            x={edge.midX}
                            y={edge.midY - 4}
                            textAnchor="middle"
                            pointerEvents="none"
                            className="text-[9px] font-mono select-none"
                            style={{
                              fill: isIncident
                                ? 'var(--prism-text-primary)'
                                : 'var(--prism-text-secondary)',
                            }}
                          >
                            {edge.label}
                          </text>
                        ) : null}
                      </g>
                    );
                  })}
                </g>

                <g data-testid="network-nodes-layer">
                  {layout.nodes.map((node) => {
                    const isSelected = activeNodeId === node.id;
                    const isNeighbor =
                      activeNodeId !== null && activeNeighborIds.has(node.id);
                    const isDimmed =
                      activeNodeId !== null && !isSelected && !isNeighbor;
                    const nodeState = isSelected
                      ? 'selected'
                      : isNeighbor
                        ? 'neighbor'
                        : isDimmed
                          ? 'dimmed'
                          : 'idle';
                    const groupSummary = node.group ? `, Group: ${node.group}` : '';

                    return (
                      <g
                        key={node.id}
                        data-testid={`network-node-group-${node.id}`}
                        opacity={isDimmed ? 0.22 : 1}
                      >
                        {isSelected ? (
                          <circle
                            data-testid={`network-active-ring-${node.id}`}
                            cx={node.x}
                            cy={node.y}
                            r={node.r + 4}
                            fill="none"
                            stroke={node.colorToken}
                            strokeWidth={2}
                            strokeOpacity={0.9}
                            pointerEvents="none"
                          />
                        ) : null}
                        <circle
                          role="button"
                          tabIndex={0}
                          aria-pressed={isSelected}
                          aria-label={`${node.raw.label}${groupSummary}, Degree: ${node.degree}`}
                          data-testid={`network-node-${node.id}`}
                          data-tone={node.tone}
                          data-state={nodeState}
                          cx={node.x}
                          cy={node.y}
                          r={node.r}
                          fill={node.colorToken}
                          fillOpacity={isSelected ? 0.9 : 0.78}
                          stroke={
                            isNeighbor ? 'var(--prism-primary-main)' : node.colorToken
                          }
                          strokeWidth={isSelected ? 2.5 : isNeighbor ? 2 : 1.5}
                          className="prism-focus-ring cursor-pointer transition-[color,background-color,border-color,opacity,transform]"
                          onClick={() => handleSelectNode(node)}
                          onKeyDown={(event) => handleNodeKeyDown(event, node)}
                        />
                        <text
                          data-testid={`network-node-label-${node.id}`}
                          x={node.x}
                          y={node.y + node.r + 13}
                          textAnchor="middle"
                          pointerEvents="none"
                          className={cx(
                            'text-[10px] select-none',
                            isSelected ? 'font-semibold' : 'font-medium'
                          )}
                          style={STYLE_FILL_PRIMARY}
                        >
                          {node.raw.label}
                        </text>
                      </g>
                    );
                  })}
                </g>
              </g>
            </svg>
          </div>

          <div
            aria-live="polite"
            data-testid="network-inspector"
            className={cx(
              inspectorClass,
              'prism-well rounded-xl px-3.5 py-2.5 text-xs'
            )}
          >
            {resolvedActiveNode === null ? (
              <p style={STYLE_TEXT_SECONDARY}>
                Select a node to inspect its cluster group, degree, and connected
                neighbors.
              </p>
            ) : (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <span
                      aria-hidden="true"
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: resolvedActiveNode.colorToken }}
                    />
                    <span
                      data-testid="network-inspector-label"
                      className="font-semibold truncate"
                      style={STYLE_TEXT_PRIMARY}
                    >
                      {resolvedActiveNode.raw.label}
                    </span>
                    <span
                      data-testid="network-inspector-group"
                      className="prism-crystal rounded-full px-2 py-0.5 text-[11px] font-medium shrink-0"
                      style={STYLE_TEXT_PRIMARY}
                    >
                      {resolvedActiveNode.group ?? 'Ungrouped'}
                    </span>
                    <span
                      data-testid="network-inspector-degree"
                      className="prism-emerald rounded-full px-2 py-0.5 text-[11px] font-mono tabular-nums font-medium shrink-0"
                    >
                      Degree: {resolvedActiveNode.degree}
                    </span>
                    {resolvedActiveNode.weight !== undefined ? (
                      <span
                        data-testid="network-inspector-weight"
                        className="prism-crystal rounded-full px-2 py-0.5 text-[11px] font-mono tabular-nums shrink-0"
                        style={STYLE_TEXT_SECONDARY}
                      >
                        Weight: {roundTwo(resolvedActiveNode.weight)}
                      </span>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    aria-label="Clear selection"
                    data-testid="network-inspector-clear"
                    onClick={handleClearSelection}
                    className="prism-crystal prism-focus-ring rounded-full px-2 py-0.5 text-[11px] font-medium cursor-pointer shrink-0"
                    style={STYLE_TEXT_SECONDARY}
                  >
                    Clear
                  </button>
                </div>

                <div
                  data-testid="network-inspector-neighbors"
                  className="flex flex-wrap items-center gap-1.5"
                >
                  <span
                    className="text-[11px] font-medium shrink-0"
                    style={STYLE_TEXT_SECONDARY}
                  >
                    Neighbors:
                  </span>
                  {activeNeighbors.length > 0 ? (
                    activeNeighbors.map((neighbor) => (
                      <button
                        key={neighbor.id}
                        type="button"
                        data-testid={`network-neighbor-pill-${neighbor.id}`}
                        onClick={() => handleSelectNode(neighbor)}
                        className="prism-crystal prism-focus-ring inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium cursor-pointer"
                        style={STYLE_TEXT_PRIMARY}
                      >
                        <span
                          aria-hidden="true"
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: neighbor.colorToken }}
                        />
                        <span>{neighbor.raw.label}</span>
                      </button>
                    ))
                  ) : (
                    <span
                      className="text-[11px]"
                      style={STYLE_TEXT_SECONDARY}
                    >
                      None (isolated node)
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export const NetworkForceGraph = memo(NetworkForceGraphInner);
NetworkForceGraph.displayName = 'NetworkForceGraph';
