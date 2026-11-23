'use client';

import {
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
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export type SunburstTone = 'primary' | 'secondary' | 'emerald' | 'amber' | 'rose';

export interface SunburstNode {
  /** Stable unique identifier for this node within its hierarchy branch. */
  id: string;
  /** Human-readable label shown in center focus, breadcrumbs, and accessible readouts. */
  label: string;
  /** Numeric leaf value (finite numbers > 0); branches sum positive child totals instead. */
  value?: number;
  /** Optional semantic optical tone token (cycles at top ring; descendants inherit parent tone). */
  tone?: SunburstTone;
  /** Optional descendant hierarchy nodes (traversal safely bounded to max depth 6). */
  children?: SunburstNode[];
}

export interface SunburstChartProps extends BaseProps<HTMLDivElement> {
  /** Root node of the hierarchical dataset. */
  root: SunburstNode;
  /** Chart card heading (defaults to 'Hierarchical Sunburst'). */
  title?: string;
  /** Square SVG viewport size in pixels (defaults to 260, clamped to 180..400). */
  size?: number;
  /** Optional unit suffix appended to values in readouts (e.g. 'GB', 'k', 'ms'). */
  valueUnit?: string;
  /** Callback invoked when the user zooms into an arc or navigates back via center/breadcrumb/reset. */
  onZoomNode?: (node: SunburstNode, breadcrumb: SunburstNode[]) => void;
}

interface ResolvedSunburstNode {
  id: string;
  key: string;
  label: string;
  node: SunburstNode;
  tone: SunburstTone;
  color: string;
  total: number;
  children: ResolvedSunburstNode[];
}

interface SunburstArc {
  key: string;
  id: string;
  label: string;
  total: number;
  sharePct: number;
  ringDepth: number;
  color: string;
  fillOpacity: number;
  pathD: string;
  isFullCircle: boolean;
  pathIds: string[];
  pathNodes: SunburstNode[];
}

interface Point2D {
  x: number;
  y: number;
}

const MAX_TREE_DEPTH = 6;
const MAX_VISIBLE_RINGS = 3;
const FULL_CIRCLE_RAD = Math.PI * 2;
const FULL_CIRCLE_THRESHOLD = FULL_CIRCLE_RAD - 0.001;
const RING_GAP_PX = 2;

const RING_OPACITIES: ReadonlyArray<number> = [0.92, 0.72, 0.54];

const TONE_CYCLE: ReadonlyArray<SunburstTone> = [
  'primary',
  'secondary',
  'emerald',
  'amber',
  'rose',
];

const TONE_TOKEN_MAP: Record<SunburstTone, string> = {
  primary: 'var(--prism-primary-main)',
  secondary: 'var(--prism-secondary-main)',
  emerald: 'var(--prism-success-main)',
  amber: 'var(--prism-warning-main)',
  rose: 'var(--prism-error-main)',
};

function sanitizePositiveValue(raw: number | undefined): number {
  if (raw === undefined || !Number.isFinite(raw) || raw <= 0) {
    return 0;
  }
  return raw;
}

function roundCoord(value: number): number {
  return Number(value.toFixed(2));
}

function roundPct(value: number): number {
  return Number(value.toFixed(1));
}

function formatNumeric(value: number): string {
  if (Number.isInteger(value)) {
    return String(value);
  }
  return String(Number(value.toFixed(2)));
}

function formatMetric(value: number, unit?: string): string {
  const num = formatNumeric(value);
  return unit ? `${num}${unit}` : num;
}

function truncateCenterText(label: string, maxLength: number): string {
  if (label.length <= maxLength) return label;
  return `${label.slice(0, maxLength - 1)}…`;
}

function polarToCartesian(cxPos: number, cyPos: number, radius: number, angleRad: number): Point2D {
  return {
    x: roundCoord(cxPos + radius * Math.cos(angleRad)),
    y: roundCoord(cyPos + radius * Math.sin(angleRad)),
  };
}

function buildResolvedTree(
  node: SunburstNode,
  depth: number,
  siblingIndex: number,
  inheritedTone: SunburstTone,
  ancestors: ReadonlySet<SunburstNode>
): ResolvedSunburstNode {
  const resolvedTone: SunburstTone =
    node.tone ??
    (depth === 1 ? (TONE_CYCLE[siblingIndex % TONE_CYCLE.length] as SunburstTone) : inheritedTone);
  const color = TONE_TOKEN_MAP[resolvedTone];
  const nodeKey = `${node.id}-${depth}-${siblingIndex}`;

  if (depth < MAX_TREE_DEPTH && Array.isArray(node.children) && node.children.length > 0) {
    const nextAncestors = new Set<SunburstNode>(ancestors);
    nextAncestors.add(node);
    const resolvedChildren: ResolvedSunburstNode[] = [];
    let sum = 0;

    for (let i = 0; i < node.children.length; i += 1) {
      const child = node.children[i]!;
      if (nextAncestors.has(child)) {
        continue;
      }
      const resolvedChild = buildResolvedTree(child, depth + 1, i, resolvedTone, nextAncestors);
      if (resolvedChild.total > 0) {
        resolvedChildren.push(resolvedChild);
        sum += resolvedChild.total;
      }
    }

    return {
      id: node.id,
      key: nodeKey,
      label: node.label,
      node,
      tone: resolvedTone,
      color,
      total: sum,
      children: resolvedChildren,
    };
  }

  return {
    id: node.id,
    key: nodeKey,
    label: node.label,
    node,
    tone: resolvedTone,
    color,
    total: sanitizePositiveValue(node.value),
    children: [],
  };
}

function getVisibleDescendantDepth(node: ResolvedSunburstNode, depth = 0): number {
  if (depth >= MAX_VISIBLE_RINGS || node.children.length === 0) {
    return depth;
  }
  let maxDepth = depth;
  for (const child of node.children) {
    const childDepth = getVisibleDescendantDepth(child, depth + 1);
    if (childDepth > maxDepth) {
      maxDepth = childDepth;
    }
  }
  return maxDepth;
}

function buildAnnularArcPath(
  center: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number,
  hasSiblings: boolean
): { pathD: string; isFullCircle: boolean } {
  const sweep = endAngle - startAngle;

  if (sweep >= FULL_CIRCLE_THRESHOLD) {
    const x = roundCoord(center);
    const rOut = roundCoord(outerRadius);
    const rIn = roundCoord(innerRadius);
    const yOutTop = roundCoord(center - outerRadius);
    const yOutBottom = roundCoord(center + outerRadius);
    const yInTop = roundCoord(center - innerRadius);
    const yInBottom = roundCoord(center + innerRadius);

    return {
      isFullCircle: true,
      pathD: [
        `M ${x} ${yOutTop}`,
        `A ${rOut} ${rOut} 0 1 1 ${x} ${yOutBottom}`,
        `A ${rOut} ${rOut} 0 1 1 ${x} ${yOutTop}`,
        'Z',
        `M ${x} ${yInTop}`,
        `A ${rIn} ${rIn} 0 1 0 ${x} ${yInBottom}`,
        `A ${rIn} ${rIn} 0 1 0 ${x} ${yInTop}`,
        'Z',
      ].join(' '),
    };
  }

  const angularPad = hasSiblings && sweep > 0.03 ? Math.min(0.014, sweep * 0.12) : 0;
  const a0 = startAngle + angularPad / 2;
  const a1 = endAngle - angularPad / 2;
  const largeArc = a1 - a0 > Math.PI ? 1 : 0;

  const p1 = polarToCartesian(center, center, outerRadius, a0);
  const p2 = polarToCartesian(center, center, outerRadius, a1);
  const p3 = polarToCartesian(center, center, innerRadius, a1);
  const p4 = polarToCartesian(center, center, innerRadius, a0);
  const rOut = roundCoord(outerRadius);
  const rIn = roundCoord(innerRadius);

  return {
    isFullCircle: false,
    pathD: [
      `M ${p1.x} ${p1.y}`,
      `A ${rOut} ${rOut} 0 ${largeArc} 1 ${p2.x} ${p2.y}`,
      `L ${p3.x} ${p3.y}`,
      `A ${rIn} ${rIn} 0 ${largeArc} 0 ${p4.x} ${p4.y}`,
      'Z',
    ].join(' '),
  };
}

const headerClass = /*#__PURE__*/ stableClassName('sunburst-chart', 'header');
const breadcrumbClass = /*#__PURE__*/ stableClassName('sunburst-chart', 'breadcrumb');
const svgClass = /*#__PURE__*/ stableClassName('sunburst-chart', 'svg');
const readoutClass = /*#__PURE__*/ stableClassName('sunburst-chart', 'readout');

function SunburstChartInner({
  root,
  title = 'Hierarchical Sunburst',
  size = 260,
  valueUnit,
  onZoomNode,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: SunburstChartProps) {
  const headingId = useId();
  const override = useComponentOverride('SunburstChart');
  const [focusIds, setFocusIds] = useState<ReadonlyArray<string>>([root.id]);
  const [hoveredArcKey, setHoveredArcKey] = useState<string | null>(null);

  const clampedSize = clampNumber(size, 180, 400, 260);

  const resolvedRoot = useMemo<ResolvedSunburstNode>(() => {
    const initialTone: SunburstTone = root.tone ?? 'primary';
    return buildResolvedTree(root, 0, 0, initialTone, new Set<SunburstNode>());
  }, [root]);

  const isEmpty = resolvedRoot.total <= 0;

  const trail = useMemo<ResolvedSunburstNode[]>(() => {
    const items: ResolvedSunburstNode[] = [resolvedRoot];
    if (focusIds.length <= 1 || focusIds[0] !== resolvedRoot.id) {
      return items;
    }

    let current = resolvedRoot;
    for (let i = 1; i < focusIds.length; i += 1) {
      const targetId = focusIds[i];
      const matched = current.children.find((child) => child.id === targetId);
      if (!matched) {
        break;
      }
      items.push(matched);
      current = matched;
    }
    return items;
  }, [focusIds, resolvedRoot]);

  const activeFocus = trail[trail.length - 1]!;
  const isZoomed = trail.length > 1;
  const parentFocus = isZoomed ? trail[trail.length - 2]! : null;

  const focusShareOfRoot =
    resolvedRoot.total > 0 ? roundPct((activeFocus.total / resolvedRoot.total) * 100) : 0;

  const geometry = useMemo(() => {
    const center = clampedSize / 2;
    const outerMax = center - 8;
    const centerRadius = roundCoord(outerMax * 0.3);

    if (isEmpty) {
      return {
        center,
        centerRadius,
        arcs: [] as SunburstArc[],
      };
    }

    const visibleRingCount = Math.max(1, getVisibleDescendantDepth(activeFocus));
    const usableRadialSpan = outerMax - centerRadius - RING_GAP_PX * visibleRingCount;
    const ringBand = Math.max(8, usableRadialSpan / visibleRingCount);
    const arcs: SunburstArc[] = [];

    const baseIds = trail.map((item) => item.id);
    const baseNodes = trail.map((item) => item.node);

    const collectRing = (
      parent: ResolvedSunburstNode,
      ringDepth: number,
      startAngle: number,
      endAngle: number,
      parentPathIds: string[],
      parentPathNodes: SunburstNode[]
    ) => {
      if (ringDepth > MAX_VISIBLE_RINGS || parent.children.length === 0 || parent.total <= 0) {
        return;
      }

      const innerRadius = centerRadius + RING_GAP_PX + (ringDepth - 1) * (ringBand + RING_GAP_PX);
      const outerRadius = innerRadius + ringBand;
      const fillOpacity = RING_OPACITIES[ringDepth - 1] ?? 0.54;
      const span = endAngle - startAngle;
      const hasSiblings = parent.children.length > 1;
      let cursor = startAngle;

      for (let i = 0; i < parent.children.length; i += 1) {
        const child = parent.children[i]!;
        const angleSpan = (child.total / parent.total) * span;
        const childStart = cursor;
        const childEnd = cursor + angleSpan;
        cursor = childEnd;

        const nextPathIds = [...parentPathIds, child.id];
        const nextPathNodes = [...parentPathNodes, child.node];
        const { pathD, isFullCircle } = buildAnnularArcPath(
          center,
          innerRadius,
          outerRadius,
          childStart,
          childEnd,
          hasSiblings
        );

        arcs.push({
          key: `${nextPathIds.join('/')}-${ringDepth}-${i}`,
          id: child.id,
          label: child.label,
          total: child.total,
          sharePct: roundPct((child.total / activeFocus.total) * 100),
          ringDepth,
          color: child.color,
          fillOpacity,
          pathD,
          isFullCircle,
          pathIds: nextPathIds,
          pathNodes: nextPathNodes,
        });

        if (ringDepth < MAX_VISIBLE_RINGS && child.children.length > 0) {
          collectRing(child, ringDepth + 1, childStart, childEnd, nextPathIds, nextPathNodes);
        }
      }
    };

    collectRing(activeFocus, 1, -Math.PI / 2, -Math.PI / 2 + FULL_CIRCLE_RAD, baseIds, baseNodes);

    return { center, centerRadius, arcs };
  }, [activeFocus, clampedSize, isEmpty, trail]);

  const hoveredArc = useMemo(() => {
    if (!hoveredArcKey) return null;
    return geometry.arcs.find((arc) => arc.key === hoveredArcKey) ?? null;
  }, [geometry.arcs, hoveredArcKey]);

  const applyZoom = useCallback(
    (targetNode: SunburstNode, nextIds: string[], nextBreadcrumb: SunburstNode[]) => {
      setFocusIds(nextIds);
      setHoveredArcKey(null);
      onZoomNode?.(targetNode, nextBreadcrumb);
    },
    [onZoomNode]
  );

  const handleZoomOut = useCallback(() => {
    if (!isZoomed) return;
    const nextTrail = trail.slice(0, -1);
    const target = nextTrail[nextTrail.length - 1]!;
    applyZoom(
      target.node,
      nextTrail.map((item) => item.id),
      nextTrail.map((item) => item.node)
    );
  }, [applyZoom, isZoomed, trail]);

  const handleResetZoom = useCallback(() => {
    applyZoom(resolvedRoot.node, [resolvedRoot.id], [resolvedRoot.node]);
  }, [applyZoom, resolvedRoot]);

  const handleBreadcrumbClick = useCallback(
    (index: number) => {
      const nextTrail = trail.slice(0, index + 1);
      const target = nextTrail[nextTrail.length - 1]!;
      applyZoom(
        target.node,
        nextTrail.map((item) => item.id),
        nextTrail.map((item) => item.node)
      );
    },
    [applyZoom, trail]
  );

  const handleArcKeyDown = useCallback(
    (arc: SunburstArc) => (event: ReactKeyboardEvent<SVGPathElement>) => {
      if (event.nativeEvent.isComposing) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        const targetNode = arc.pathNodes[arc.pathNodes.length - 1]!;
        applyZoom(targetNode, arc.pathIds, arc.pathNodes);
      }
    },
    [applyZoom]
  );

  const handleCenterKeyDown = useCallback(
    (event: ReactKeyboardEvent<SVGGElement>) => {
      if (event.nativeEvent.isComposing) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleZoomOut();
      }
    },
    [handleZoomOut]
  );

  const merged = mergeProps({
    themeTarget: themeProps('sunburst-chart', {
      zoomed: isZoomed,
      empty: isEmpty,
    }),
    baseClassName: 'prism-slab p-5 space-y-4',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });


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

        {!isEmpty && isZoomed ? (
          <button
            type="button"
            onClick={handleResetZoom}
            className="prism-focus-ring prism-crystal px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-opacity hover:opacity-100"
            style={STYLE_TEXT_PRIMARY}
          >
            Reset Zoom
          </button>
        ) : null}
      </div>

      {!isEmpty ? (
        <nav
          aria-label="Sunburst breadcrumb"
          className={cx(breadcrumbClass, 'flex flex-wrap items-center gap-1.5')}
        >
          {trail.map((item, idx) => {
            const isCurrent = idx === trail.length - 1;
            return (
              <span key={`${item.key}-crumb`} className="inline-flex items-center gap-1.5">
                {idx > 0 ? (
                  <span
                    aria-hidden="true"
                    className="text-xs select-none"
                    style={STYLE_TEXT_SECONDARY}
                  >
                    /
                  </span>
                ) : null}
                <button
                  type="button"
                  aria-current={isCurrent ? 'location' : undefined}
                  onClick={() => handleBreadcrumbClick(idx)}
                  className={cx(
                    'prism-focus-ring inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs cursor-pointer transition-opacity',
                    isCurrent ? 'prism-well font-semibold' : 'prism-crystal font-medium opacity-85 hover:opacity-100'
                  )}
                  style={STYLE_TEXT_PRIMARY}
                >
                  <span
                    aria-hidden="true"
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span>{item.label}</span>
                </button>
              </span>
            );
          })}
        </nav>
      ) : null}

      {isEmpty ? (
        <div
          role="status"
          data-testid="sunburst-empty"
          className="prism-well rounded-2xl px-4 py-8 text-center text-xs font-medium"
          style={STYLE_TEXT_SECONDARY}
        >
          No hierarchical data to display.
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center">
          <svg
            role="img"
            aria-label={`${title} focused on ${activeFocus.label}`}
            viewBox={`0 0 ${clampedSize} ${clampedSize}`}
            style={{ width: `${clampedSize}px`, height: `${clampedSize}px` }}
            className={cx(svgClass, 'block max-w-full overflow-visible', 'prism-contain-leaf')}
          >
            {geometry.arcs.map((arc) => {
              const isHovered = hoveredArc?.key === arc.key;
              return (
                <path
                  key={arc.key}
                  d={arc.pathD}
                  fill={arc.color}
                  fillOpacity={isHovered ? Math.min(1, arc.fillOpacity + 0.08) : arc.fillOpacity}
                  fillRule={arc.isFullCircle ? 'evenodd' : undefined}
                  stroke={isHovered ? 'var(--prism-text-primary)' : 'var(--prism-divider)'}
                  strokeWidth={isHovered ? 1.5 : 0.75}
                  role="button"
                  tabIndex={0}
                  aria-label={`${arc.label}: ${formatMetric(arc.total, valueUnit)} (${arc.sharePct}% of ${activeFocus.label})`}
                  data-node-id={arc.id}
                  data-ring-depth={String(arc.ringDepth)}
                  data-full-circle={arc.isFullCircle ? 'true' : 'false'}
                  className="prism-focus-ring cursor-pointer transition-opacity duration-150"
                  onMouseEnter={() => setHoveredArcKey(arc.key)}
                  onMouseLeave={() => setHoveredArcKey(null)}
                  onFocus={() => setHoveredArcKey(arc.key)}
                  onBlur={() => setHoveredArcKey(null)}
                  onClick={() => {
                    const targetNode = arc.pathNodes[arc.pathNodes.length - 1]!;
                    applyZoom(targetNode, arc.pathIds, arc.pathNodes);
                  }}
                  onKeyDown={handleArcKeyDown(arc)}
                />
              );
            })}

            <g
              data-testid="sunburst-center"
              role={isZoomed ? 'button' : undefined}
              tabIndex={isZoomed ? 0 : undefined}
              aria-label={
                parentFocus ? `Zoom out to ${parentFocus.label}` : undefined
              }
              className={cx(isZoomed && 'prism-focus-ring cursor-pointer')}
              onClick={handleZoomOut}
              onKeyDown={isZoomed ? handleCenterKeyDown : undefined}
            >
              <circle
                cx={geometry.center}
                cy={geometry.center}
                r={geometry.centerRadius}
                fill="var(--prism-bg-mid)"
                stroke="var(--prism-divider)"
                strokeWidth={1.5}
              />
              <text
                x={geometry.center}
                y={geometry.center - (isZoomed ? 7 : 3)}
                textAnchor="middle"
                fill="var(--prism-text-primary)"
                className="text-[11px] font-semibold select-none"
              >
                {truncateCenterText(activeFocus.label, 12)}
              </text>
              <text
                x={geometry.center}
                y={geometry.center + (isZoomed ? 7 : 12)}
                textAnchor="middle"
                fill="var(--prism-text-secondary)"
                className="text-[10px] font-mono tabular-nums select-none"
              >
                {formatMetric(activeFocus.total, valueUnit)}
              </text>
              {isZoomed ? (
                <text
                  x={geometry.center}
                  y={geometry.center + 19}
                  textAnchor="middle"
                  fill="var(--prism-text-secondary)"
                  className="text-[9px] font-medium select-none"
                >
                  {`${focusShareOfRoot}% · Back`}
                </text>
              ) : null}
            </g>
          </svg>
        </div>
      )}

      {!isEmpty ? (
        <div
          data-testid="sunburst-readout"
          aria-live="polite"
          className={cx(
            readoutClass,
            'prism-well rounded-xl px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 text-xs tabular-nums'
          )}
          style={STYLE_TEXT_PRIMARY}
        >
          <div className="inline-flex items-center gap-2 min-w-0">
            <span
              aria-hidden="true"
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: hoveredArc ? hoveredArc.color : activeFocus.color }}
            />
            <span className="font-medium truncate">
              {hoveredArc
                ? `${hoveredArc.label}: ${formatMetric(hoveredArc.total, valueUnit)} (${hoveredArc.sharePct}% of ${activeFocus.label})`
                : `${activeFocus.label}: ${formatMetric(activeFocus.total, valueUnit)} (${focusShareOfRoot}% of ${resolvedRoot.label})`}
            </span>
          </div>
          <span className="text-[11px]" style={STYLE_TEXT_SECONDARY}>
            {activeFocus.children.length === 0
              ? 'Leaf focus · Click center or breadcrumb to zoom out.'
              : isZoomed
                ? 'Click any arc to drill deeper or center to step back.'
                : 'Click any arc to zoom into a branch.'}
          </span>
        </div>
      ) : null}
    </div>
  );
}

export const SunburstChart = /*#__PURE__*/ memoWithDisplayName(SunburstChartInner, 'SunburstChart');
