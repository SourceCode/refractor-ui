'use client';

import {
  memo,
  useCallback,
  useId,
  useMemo,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type SankeyTone = 'primary' | 'secondary' | 'emerald' | 'amber' | 'rose';

export interface SankeyNode {
  /** Stable unique identifier for this node. */
  id: string;
  /** Human-readable label displayed alongside the node bar and in the inspector strip. */
  label: string;
  /** Discrete column/stage index sorted ascending from left to right. */
  stage: number;
  /** Optional semantic optical tone for the node bar and its outgoing flow ribbons. */
  tone?: SankeyTone;
}

export interface SankeyLink {
  /** Source node identifier. */
  source: string;
  /** Target node identifier. */
  target: string;
  /** Positive finite numeric flow magnitude. */
  value: number;
}

export interface SankeyDiagramProps extends BaseProps<HTMLDivElement> {
  /** Node definitions organized across sorted stage columns. */
  nodes: SankeyNode[];
  /** Directed flow links; only finite values > 0 between distinct valid nodes are rendered. */
  links: SankeyLink[];
  /** Diagram card heading (defaults to 'Flow Sankey Diagram'). */
  title?: string;
  /** SVG viewport height in pixels (defaults to 260, clamped to 160..520). */
  height?: number;
  /** Optional unit suffix appended to formatted flow values (e.g. 'k', 'MW', ' users'). */
  valueUnit?: string;
  /** Callback fired when a user clicks or activates any flow ribbon via keyboard. */
  onSelectLink?: (link: SankeyLink, sourceNode: SankeyNode, targetNode: SankeyNode) => void;
}

type SankeySelection =
  | { kind: 'none' }
  | { kind: 'link'; key: string }
  | { kind: 'node'; id: string };

interface RawNodeEntry {
  node: SankeyNode;
  origIdx: number;
  stage: number;
}

interface FilteredLinkEntry {
  key: string;
  origIdx: number;
  link: SankeyLink;
  sourceNode: SankeyNode;
  targetNode: SankeyNode;
}

interface ComputedSankeyNode {
  id: string;
  key: string;
  label: string;
  stage: number;
  stageIndex: number;
  tone: SankeyTone;
  color: string;
  inflow: number;
  outflow: number;
  magnitude: number;
  x: number;
  y: number;
  width: number;
  height: number;
  labelX: number;
  labelY: number;
  labelAnchor: 'start' | 'end';
  original: SankeyNode;
}

interface ComputedSankeyLink {
  key: string;
  source: string;
  target: string;
  value: number;
  color: string;
  pathD: string;
  strokeWidth: number;
  original: SankeyLink;
  sourceNode: SankeyNode;
  targetNode: SankeyNode;
}

interface StageGuide {
  key: string;
  stage: number;
  guideX: number;
  labelX: number;
  anchor: 'start' | 'middle' | 'end';
}

interface SlotAssignment {
  centerY: number;
  thickness: number;
}

const SVG_WIDTH = 640;
const PAD_TOP = 26;
const PAD_BOTTOM = 16;
const PAD_X = 16;
const NODE_WIDTH = 16;
const MIN_NODE_HEIGHT = 8;

const TONE_CYCLE: readonly SankeyTone[] = ['primary', 'secondary', 'emerald', 'amber', 'rose'];

const TONE_COLOR_MAP = new Map<SankeyTone, string>([
  ['primary', 'var(--prism-primary-main)'],
  ['secondary', 'var(--prism-secondary-main)'],
  ['emerald', 'var(--prism-success-main)'],
  ['amber', 'var(--prism-warning-main)'],
  ['rose', 'var(--prism-error-main)'],
]);

function roundCoord(value: number): number {
  return Number(value.toFixed(2));
}

function formatNumeric(value: number): string {
  if (Number.isInteger(value)) {
    return String(value);
  }
  return String(Number(value.toFixed(2)));
}

function formatValue(value: number, unit?: string): string {
  const formatted = formatNumeric(value);
  return unit ? `${formatted}${unit}` : formatted;
}

function resolveNodeTone(tone: SankeyTone | undefined, fallbackIndex: number): SankeyTone {
  if (tone !== undefined && TONE_COLOR_MAP.has(tone)) {
    return tone;
  }
  return TONE_CYCLE[fallbackIndex % TONE_CYCLE.length]!;
}

function SankeyDiagramInner({
  nodes,
  links,
  title = 'Flow Sankey Diagram',
  height = 260,
  valueUnit,
  onSelectLink,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: SankeyDiagramProps) {
  const headingId = useId();
  const override = useComponentOverride('SankeyDiagram');
  const [selection, setSelection] = useState<SankeySelection>({ kind: 'none' });

  const clampedHeight = clampNumber(height, 160, 520, 260);

  const geometry = useMemo(() => {
    const rawNodeMap = new Map<string, RawNodeEntry>();
    for (let i = 0; i < nodes.length; i += 1) {
      const node = nodes[i]!;
      if (rawNodeMap.has(node.id)) {
        continue;
      }
      const cleanStage = Number.isFinite(node.stage) ? node.stage : 0;
      rawNodeMap.set(node.id, { node, origIdx: i, stage: cleanStage });
    }

    const filteredLinks: FilteredLinkEntry[] = [];
    for (let i = 0; i < links.length; i += 1) {
      const link = links[i]!;
      if (!Number.isFinite(link.value) || link.value <= 0) {
        continue;
      }
      if (link.source === link.target) {
        continue;
      }
      const srcEntry = rawNodeMap.get(link.source);
      const tgtEntry = rawNodeMap.get(link.target);
      if (!srcEntry || !tgtEntry) {
        continue;
      }
      filteredLinks.push({
        key: `sankey-link-${i}`,
        origIdx: i,
        link,
        sourceNode: srcEntry.node,
        targetNode: tgtEntry.node,
      });
    }

    if (rawNodeMap.size === 0 || filteredLinks.length === 0) {
      return {
        nodes: [] as ComputedSankeyNode[],
        links: [] as ComputedSankeyLink[],
        stageGuides: [] as StageGuide[],
        stageCount: 0,
        totalLinkValue: 0,
        nodeLookup: new Map<string, ComputedSankeyNode>(),
        neighborsByNode: new Map<string, Set<string>>(),
      };
    }

    const inflowMap = new Map<string, number>();
    const outflowMap = new Map<string, number>();
    const neighborsByNode = new Map<string, Set<string>>();
    let totalLinkValue = 0;

    for (const item of filteredLinks) {
      const { source, target, value } = item.link;
      totalLinkValue += value;
      outflowMap.set(source, (outflowMap.get(source) ?? 0) + value);
      inflowMap.set(target, (inflowMap.get(target) ?? 0) + value);

      let srcNeighbors = neighborsByNode.get(source);
      if (!srcNeighbors) {
        srcNeighbors = new Set<string>();
        neighborsByNode.set(source, srcNeighbors);
      }
      srcNeighbors.add(target);

      let tgtNeighbors = neighborsByNode.get(target);
      if (!tgtNeighbors) {
        tgtNeighbors = new Set<string>();
        neighborsByNode.set(target, tgtNeighbors);
      }
      tgtNeighbors.add(source);
    }

    const stageGroups = new Map<number, RawNodeEntry[]>();
    for (const entry of rawNodeMap.values()) {
      let group = stageGroups.get(entry.stage);
      if (!group) {
        group = [];
        stageGroups.set(entry.stage, group);
      }
      group.push(entry);
    }

    const sortedStages = Array.from(stageGroups.keys()).sort((a, b) => a - b);
    const stageCount = sortedStages.length;
    const plotHeight = clampedHeight - PAD_TOP - PAD_BOTTOM;
    const usableWidth = SVG_WIDTH - PAD_X * 2 - NODE_WIDTH;

    let unitScale = Number.POSITIVE_INFINITY;
    for (const stage of sortedStages) {
      const colNodes = stageGroups.get(stage)!;
      const gap =
        colNodes.length > 1 ? Math.min(14, (plotHeight * 0.35) / (colNodes.length - 1)) : 0;
      const availableHeight = plotHeight - gap * (colNodes.length - 1);
      let colFlowTotal = 0;
      for (const entry of colNodes) {
        const inflow = inflowMap.get(entry.node.id) ?? 0;
        const outflow = outflowMap.get(entry.node.id) ?? 0;
        colFlowTotal += Math.max(inflow, outflow);
      }
      if (colFlowTotal > 0) {
        const colScale = availableHeight / colFlowTotal;
        if (colScale < unitScale) {
          unitScale = colScale;
        }
      }
    }

    const computedNodes: ComputedSankeyNode[] = [];
    const nodeLookup = new Map<string, ComputedSankeyNode>();
    const stageGuides: StageGuide[] = [];

    for (let stageIndex = 0; stageIndex < stageCount; stageIndex += 1) {
      const stage = sortedStages[stageIndex]!;
      const colNodes = stageGroups.get(stage)!;
      const colX =
        stageCount > 1
          ? roundCoord(PAD_X + (stageIndex / (stageCount - 1)) * usableWidth)
          : roundCoord(PAD_X + usableWidth / 2);
      const isFirstStage = stageCount > 1 && stageIndex === 0;
      const isLastStage = stageCount > 1 && stageIndex === stageCount - 1;

      stageGuides.push({
        key: `sankey-stage-${stage}`,
        stage,
        guideX: roundCoord(colX + NODE_WIDTH / 2),
        labelX: isFirstStage
          ? colX
          : isLastStage
            ? roundCoord(colX + NODE_WIDTH)
            : roundCoord(colX + NODE_WIDTH / 2),
        anchor: isFirstStage ? 'start' : isLastStage ? 'end' : 'middle',
      });

      const gap =
        colNodes.length > 1 ? Math.min(14, (plotHeight * 0.35) / (colNodes.length - 1)) : 0;
      const availableHeight = plotHeight - gap * (colNodes.length - 1);

      const rawHeights: number[] = [];
      let sumRawHeight = 0;
      for (const entry of colNodes) {
        const inflow = inflowMap.get(entry.node.id) ?? 0;
        const outflow = outflowMap.get(entry.node.id) ?? 0;
        const magnitude = Math.max(inflow, outflow);
        const rawH = Math.max(MIN_NODE_HEIGHT, magnitude * unitScale);
        rawHeights.push(rawH);
        sumRawHeight += rawH;
      }

      const fitScale = sumRawHeight > availableHeight ? availableHeight / sumRawHeight : 1;
      const scaledHeights = rawHeights.map((rawH) => roundCoord(rawH * fitScale));
      const usedHeight =
        scaledHeights.reduce((acc, h) => acc + h, 0) + gap * (colNodes.length - 1);
      let cursorY = PAD_TOP + (plotHeight - usedHeight) / 2;

      for (let idx = 0; idx < colNodes.length; idx += 1) {
        const entry = colNodes[idx]!;
        const nodeId = entry.node.id;
        const inflow = inflowMap.get(nodeId) ?? 0;
        const outflow = outflowMap.get(nodeId) ?? 0;
        const magnitude = Math.max(inflow, outflow);
        const nodeHeight = scaledHeights[idx]!;
        const nodeY = roundCoord(cursorY);
        cursorY += nodeHeight + gap;

        const tone = resolveNodeTone(entry.node.tone, entry.origIdx);
        const color = TONE_COLOR_MAP.get(tone)!;
        const computed: ComputedSankeyNode = {
          id: nodeId,
          key: `sankey-node-${entry.origIdx}`,
          label: entry.node.label,
          stage: entry.stage,
          stageIndex,
          tone,
          color,
          inflow,
          outflow,
          magnitude,
          x: colX,
          y: nodeY,
          width: NODE_WIDTH,
          height: nodeHeight,
          labelX: isLastStage ? roundCoord(colX - 8) : roundCoord(colX + NODE_WIDTH + 8),
          labelY: roundCoord(nodeY + nodeHeight / 2),
          labelAnchor: isLastStage ? 'end' : 'start',
          original: entry.node,
        };

        computedNodes.push(computed);
        nodeLookup.set(nodeId, computed);
      }
    }

    const outgoingByNode = new Map<string, FilteredLinkEntry[]>();
    const incomingByNode = new Map<string, FilteredLinkEntry[]>();
    for (const item of filteredLinks) {
      let outList = outgoingByNode.get(item.link.source);
      if (!outList) {
        outList = [];
        outgoingByNode.set(item.link.source, outList);
      }
      outList.push(item);

      let inList = incomingByNode.get(item.link.target);
      if (!inList) {
        inList = [];
        incomingByNode.set(item.link.target, inList);
      }
      inList.push(item);
    }

    const sourceSlots = new Map<string, SlotAssignment>();
    for (const [sourceId, outList] of outgoingByNode.entries()) {
      const srcNode = nodeLookup.get(sourceId)!;
      outList.sort((a, b) => {
        const aTgt = nodeLookup.get(a.link.target)!;
        const bTgt = nodeLookup.get(b.link.target)!;
        return aTgt.y - bTgt.y || a.origIdx - b.origIdx;
      });
      let offset = 0;
      for (const item of outList) {
        const slot = (item.link.value / srcNode.magnitude) * srcNode.height;
        sourceSlots.set(item.key, {
          centerY: roundCoord(srcNode.y + offset + slot / 2),
          thickness: slot,
        });
        offset += slot;
      }
    }

    const targetSlots = new Map<string, SlotAssignment>();
    for (const [targetId, inList] of incomingByNode.entries()) {
      const tgtNode = nodeLookup.get(targetId)!;
      inList.sort((a, b) => {
        const aSrc = nodeLookup.get(a.link.source)!;
        const bSrc = nodeLookup.get(b.link.source)!;
        return aSrc.y - bSrc.y || a.origIdx - b.origIdx;
      });
      let offset = 0;
      for (const item of inList) {
        const slot = (item.link.value / tgtNode.magnitude) * tgtNode.height;
        targetSlots.set(item.key, {
          centerY: roundCoord(tgtNode.y + offset + slot / 2),
          thickness: slot,
        });
        offset += slot;
      }
    }

    const computedLinks: ComputedSankeyLink[] = filteredLinks.map((item) => {
      const srcNode = nodeLookup.get(item.link.source)!;
      const tgtNode = nodeLookup.get(item.link.target)!;
      const srcSlot = sourceSlots.get(item.key)!;
      const tgtSlot = targetSlots.get(item.key)!;

      let x1: number;
      let x2: number;
      let mx: number;
      if (srcNode.stage < tgtNode.stage) {
        x1 = roundCoord(srcNode.x + srcNode.width);
        x2 = roundCoord(tgtNode.x);
        mx = roundCoord((x1 + x2) / 2);
      } else if (srcNode.stage > tgtNode.stage) {
        x1 = roundCoord(srcNode.x);
        x2 = roundCoord(tgtNode.x + tgtNode.width);
        mx = roundCoord((x1 + x2) / 2);
      } else {
        x1 = roundCoord(srcNode.x + srcNode.width);
        x2 = roundCoord(tgtNode.x + tgtNode.width);
        mx = roundCoord(x1 + 36);
      }

      const pathD = `M ${x1},${srcSlot.centerY} C ${mx},${srcSlot.centerY} ${mx},${tgtSlot.centerY} ${x2},${tgtSlot.centerY}`;
      const strokeWidth = roundCoord(Math.max(1.5, Math.min(srcSlot.thickness, tgtSlot.thickness)));

      return {
        key: item.key,
        source: item.link.source,
        target: item.link.target,
        value: item.link.value,
        color: srcNode.color,
        pathD,
        strokeWidth,
        original: item.link,
        sourceNode: item.sourceNode,
        targetNode: item.targetNode,
      };
    });

    return {
      nodes: computedNodes,
      links: computedLinks,
      stageGuides,
      stageCount,
      totalLinkValue,
      nodeLookup,
      neighborsByNode,
    };
  }, [nodes, links, clampedHeight]);

  const isEmpty = geometry.links.length === 0;

  const activeLink = useMemo(() => {
    if (selection.kind !== 'link') return null;
    return geometry.links.find((item) => item.key === selection.key) ?? null;
  }, [geometry.links, selection]);

  const activeNode = useMemo(() => {
    if (selection.kind !== 'node') return null;
    return geometry.nodeLookup.get(selection.id) ?? null;
  }, [geometry.nodeLookup, selection]);

  const hasActiveSelection = activeLink !== null || activeNode !== null;
  const activeNodeNeighbors = activeNode
    ? (geometry.neighborsByNode.get(activeNode.id) ?? null)
    : null;

  const handleSelectLink = useCallback(
    (link: ComputedSankeyLink) => {
      setSelection({ kind: 'link', key: link.key });
      onSelectLink?.(link.original, link.sourceNode, link.targetNode);
    },
    [onSelectLink]
  );

  const handleSelectNode = useCallback((node: ComputedSankeyNode) => {
    setSelection({ kind: 'node', id: node.id });
  }, []);

  const handleLinkKeyDown = useCallback(
    (link: ComputedSankeyLink) => (event: ReactKeyboardEvent<SVGPathElement>) => {
      if (event.nativeEvent.isComposing) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleSelectLink(link);
      } else if (event.key === 'Escape') {
        setSelection({ kind: 'none' });
      }
    },
    [handleSelectLink]
  );

  const handleNodeKeyDown = useCallback(
    (node: ComputedSankeyNode) => (event: ReactKeyboardEvent<SVGRectElement>) => {
      if (event.nativeEvent.isComposing) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleSelectNode(node);
      } else if (event.key === 'Escape') {
        setSelection({ kind: 'none' });
      }
    },
    [handleSelectNode]
  );

  const merged = mergeProps({
    themeTarget: themeProps('sankey-diagram', {
      empty: isEmpty,
      selection: activeLink ? 'link' : activeNode ? 'node' : undefined,
    }),
    baseClassName: 'prism-slab p-5 space-y-4',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('sankey-diagram', 'header');
  const svgClass = stableClassName('sankey-diagram', 'svg');
  const readoutClass = stableClassName('sankey-diagram', 'readout');

  return (
    <div ref={ref} role="region" aria-labelledby={headingId} {...rest} {...merged}>
      <div className={cx(headerClass, 'flex flex-wrap items-center justify-between gap-3')}>
        <h4
          id={headingId}
          className="text-sm font-semibold tracking-tight"
          style={STYLE_TEXT_PRIMARY}
        >
          {title}
        </h4>

        {!isEmpty ? (
          <div className="flex flex-wrap items-center gap-2 text-xs tabular-nums">
            <span
              data-testid="sankey-summary-pill"
              className="prism-crystal inline-flex items-center px-2.5 py-1 rounded-full font-medium"
              style={STYLE_TEXT_SECONDARY}
            >
              {`${geometry.stageCount} stages · ${geometry.nodes.length} nodes · ${geometry.links.length} links`}
            </span>
            <span
              data-testid="sankey-total-badge"
              className="prism-emerald inline-flex items-center px-3 py-1 rounded-full font-semibold"
            >
              {`Flow: ${formatValue(geometry.totalLinkValue, valueUnit)}`}
            </span>
          </div>
        ) : null}
      </div>

      {isEmpty ? (
        <div
          role="status"
          data-testid="sankey-diagram-empty"
          className="prism-well rounded-2xl px-4 py-8 text-center text-xs font-medium"
          style={STYLE_TEXT_SECONDARY}
        >
          No valid flow nodes or positive links to display.
        </div>
      ) : (
        <>
          <div className="w-full overflow-x-auto">
            <svg
              role="img"
              aria-label={`${title} sankey diagram with ${geometry.nodes.length} nodes and ${geometry.links.length} links`}
              viewBox={`0 0 ${SVG_WIDTH} ${clampedHeight}`}
              style={{ height: `${clampedHeight}px` }}
              className={cx(svgClass, 'w-full block overflow-visible')}
            >
              {geometry.stageGuides.map((guide) => (
                <g key={guide.key} pointerEvents="none">
                  <line
                    x1={guide.guideX}
                    y1={PAD_TOP}
                    x2={guide.guideX}
                    y2={clampedHeight - PAD_BOTTOM}
                    stroke="var(--prism-divider)"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    data-role="sankey-stage-guide"
                  />
                  <text
                    x={guide.labelX}
                    y={14}
                    textAnchor={guide.anchor}
                    fill="var(--prism-text-secondary)"
                    className="text-[10px] font-mono uppercase tracking-wider"
                  >
                    {`Stage ${guide.stage}`}
                  </text>
                </g>
              ))}

              <g data-role="sankey-links">
                {geometry.links.map((link) => {
                  const isSelectedLink = activeLink !== null && activeLink.key === link.key;
                  const isIncident =
                    activeNode !== null &&
                    (link.source === activeNode.id || link.target === activeNode.id);
                  const isHighlighted = isSelectedLink || isIncident;
                  const strokeOpacity = !hasActiveSelection ? 0.48 : isHighlighted ? 0.85 : 0.25;

                  return (
                    <path
                      key={link.key}
                      d={link.pathD}
                      fill="none"
                      stroke={link.color}
                      strokeWidth={link.strokeWidth}
                      strokeOpacity={strokeOpacity}
                      strokeLinecap="butt"
                      role="button"
                      tabIndex={0}
                      aria-pressed={isSelectedLink}
                      aria-label={`${link.sourceNode.label} → ${link.targetNode.label}: ${formatValue(link.value, valueUnit)}`}
                      data-role="sankey-link"
                      data-source={link.source}
                      data-target={link.target}
                      data-highlighted={isHighlighted ? 'true' : 'false'}
                      data-selected={isSelectedLink ? 'true' : 'false'}
                      className="prism-focus-ring cursor-pointer transition-opacity duration-150"
                      onClick={() => handleSelectLink(link)}
                      onKeyDown={handleLinkKeyDown(link)}
                    />
                  );
                })}
              </g>

              <g data-role="sankey-nodes">
                {geometry.nodes.map((node) => {
                  const isSelectedNode = activeNode !== null && activeNode.id === node.id;
                  const isLinkEndpoint =
                    activeLink !== null &&
                    (activeLink.source === node.id || activeLink.target === node.id);
                  const isConnectedNeighbor =
                    activeNodeNeighbors !== null && activeNodeNeighbors.has(node.id);
                  const fillOpacity = !hasActiveSelection
                    ? 0.92
                    : isSelectedNode || isLinkEndpoint
                      ? 1
                      : isConnectedNeighbor
                        ? 0.82
                        : 0.4;

                  return (
                    <g key={node.key}>
                      <rect
                        x={node.x}
                        y={node.y}
                        width={node.width}
                        height={node.height}
                        rx={4}
                        fill={node.color}
                        fillOpacity={fillOpacity}
                        stroke={
                          isSelectedNode || isLinkEndpoint ? 'var(--prism-text-primary)' : 'none'
                        }
                        strokeWidth={isSelectedNode || isLinkEndpoint ? 1.5 : 0}
                        role="button"
                        tabIndex={0}
                        aria-pressed={isSelectedNode}
                        aria-label={`${node.label} (Stage ${node.stage}): inflow ${formatValue(node.inflow, valueUnit)}, outflow ${formatValue(node.outflow, valueUnit)}`}
                        data-role="sankey-node"
                        data-node-id={node.id}
                        data-stage={String(node.stage)}
                        data-tone={node.tone}
                        data-selected={isSelectedNode ? 'true' : 'false'}
                        className="prism-focus-ring cursor-pointer transition-opacity duration-150"
                        onClick={() => handleSelectNode(node)}
                        onKeyDown={handleNodeKeyDown(node)}
                      />
                      <text
                        x={node.labelX}
                        y={roundCoord(node.labelY + 3.5)}
                        textAnchor={node.labelAnchor}
                        fill="var(--prism-text-primary)"
                        pointerEvents="none"
                        className="text-[11px] font-medium"
                      >
                        {node.label}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>

          <div
            data-testid="sankey-diagram-readout"
            aria-live="polite"
            className={cx(
              readoutClass,
              'prism-well rounded-xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs tabular-nums'
            )}
            style={STYLE_TEXT_PRIMARY}
          >
            {activeLink ? (
              <div className="inline-flex flex-wrap items-center gap-2">
                <span
                  aria-hidden="true"
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: activeLink.color }}
                />
                <span className="font-semibold">
                  {`${activeLink.sourceNode.label} → ${activeLink.targetNode.label}: ${formatValue(activeLink.value, valueUnit)}`}
                </span>
              </div>
            ) : activeNode ? (
              <>
                <div className="inline-flex flex-wrap items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: activeNode.color }}
                  />
                  <span className="font-semibold">{activeNode.label}</span>
                  <span
                    className="prism-crystal px-2 py-0.5 rounded-full text-[11px] font-medium"
                    style={STYLE_TEXT_SECONDARY}
                  >
                    {`Stage ${activeNode.stage}`}
                  </span>
                </div>
                <div className="inline-flex flex-wrap items-center gap-3 font-mono">
                  <span>{`Inflow: ${formatValue(activeNode.inflow, valueUnit)}`}</span>
                  <span>{`Outflow: ${formatValue(activeNode.outflow, valueUnit)}`}</span>
                </div>
              </>
            ) : (
              <span style={STYLE_TEXT_SECONDARY}>
                Select any flow ribbon or node to inspect transfer volume and inflow/outflow
                summary.
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export const SankeyDiagram = memo(SankeyDiagramInner);
SankeyDiagram.displayName = 'SankeyDiagram';
