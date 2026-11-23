'use client';

import {
  memo,
  useCallback,
  useId,
  useMemo,
  useState,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { splitLiteralHighlight } from '../utils/sanitize';
import { STYLE_PRIMARY_MAIN, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type FlameGraphOrientation = 'flame' | 'icicle';

export type FlameFrameTone = 'primary' | 'secondary' | 'amber' | 'rose' | 'info';

export interface FlameFrameNode {
  /** Stable identifier for this stack frame node. */
  id: string;
  /** Function, symbol, or span name displayed on the frame bar and profiler readout. */
  name: string;
  /** Optional source module, package, or runtime subsystem (defaults to 'runtime'). */
  module?: string;
  /** Inclusive CPU or duration magnitude (finite positive numbers only). */
  value: number;
  /** Optional semantic --prism-* optical color tone. */
  tone?: FlameFrameTone;
  /** Optional callee frames executed within this stack frame (capped at depth 12). */
  children?: ReadonlyArray<FlameFrameNode>;
}

export interface FlameFrameMetrics {
  /** Frame identifier from the source FlameFrameNode. */
  id: string;
  /** Frame symbol or function name. */
  name: string;
  /** Resolved source module or runtime subsystem name. */
  module: string;
  /** Inclusive total CPU/duration value of this frame. */
  totalValue: number;
  /** Exclusive self CPU/duration value (total minus direct child sum, floored at 0). */
  selfValue: number;
  /** Percentage share of the full profile root total (0..100). */
  rootSharePct: number;
  /** Stack depth from the profile root (0 for root, capped at 12). */
  depth: number;
}

export interface FlameGraphChartProps extends BaseProps<HTMLDivElement> {
  /** Root CPU stack profile tree; omit for the built-in Node/V8 server profile, or pass null for an empty state. */
  root?: FlameFrameNode | null;
  /** Controlled stack orientation: 'flame' (root at bottom growing upward) or 'icicle' (root at top growing downward). */
  orientation?: FlameGraphOrientation;
  /** Initial uncontrolled stack orientation (defaults to 'flame'). */
  defaultOrientation?: FlameGraphOrientation;
  /** Callback invoked whenever the user toggles between Flame and Icicle orientations. */
  onOrientationChange?: (orientation: FlameGraphOrientation) => void;
  /** Measurement unit suffix appended to CPU/duration metrics (defaults to 'ms'). */
  unit?: string;
  /** Card header title linked via aria-labelledby (defaults to 'CPU Flame / Icicle Graph'). */
  title?: string;
  /** Callback invoked when a stack frame is clicked or activated via keyboard. */
  onSelectFrame?: (metrics: FlameFrameMetrics) => void;
}

interface ToneVisual {
  bg: string;
  fg: string;
}

interface ResolvedFlameNode {
  pathKey: string;
  id: string;
  name: string;
  module: string;
  totalValue: number;
  selfValue: number;
  rootSharePct: number;
  depth: number;
  tone: FlameFrameTone;
  visual: ToneVisual;
  children: ResolvedFlameNode[];
  metrics: FlameFrameMetrics;
}

interface LayoutFrame {
  node: ResolvedFlameNode;
  relativeDepth: number;
  leftPct: number;
  widthPct: number;
  isMatched: boolean;
}

interface LayoutRow {
  relativeDepth: number;
  key: string;
  frames: LayoutFrame[];
}

const MAX_DEPTH = 12;

const TONE_CYCLE: ReadonlyArray<FlameFrameTone> = [
  'primary',
  'amber',
  'rose',
  'secondary',
  'info',
];

const TONE_VISUAL_MAP: Record<FlameFrameTone, ToneVisual> = {
  primary: {
    bg: 'var(--prism-primary-main)',
    fg: 'var(--prism-primary-contrast)',
  },
  secondary: {
    bg: 'var(--prism-secondary-main)',
    fg: 'var(--prism-secondary-contrast)',
  },
  amber: {
    bg: 'var(--prism-warning-main)',
    fg: 'var(--prism-warning-contrast)',
  },
  rose: {
    bg: 'var(--prism-error-main)',
    fg: 'var(--prism-error-contrast)',
  },
  info: {
    bg: 'var(--prism-info-main)',
    fg: 'var(--prism-info-contrast)',
  },
};

const DEFAULT_FLAME_GRAPH_ROOT: FlameFrameNode = {
  id: 'root',
  name: '(root)',
  module: 'node:runtime',
  value: 1000,
  tone: 'info',
  children: [
    {
      id: 'http-server',
      name: 'http.Server.emit',
      module: 'node:http',
      value: 760,
      tone: 'primary',
      children: [
        {
          id: 'router-dispatch',
          name: 'router.dispatch',
          module: 'api/router.ts',
          value: 520,
          tone: 'amber',
          children: [
            {
              id: 'auth-verify',
              name: 'verifyJwtSignature',
              module: 'auth/jwt.ts',
              value: 160,
              tone: 'secondary',
              children: [
                {
                  id: 'crypto-verify',
                  name: 'crypto.verify',
                  module: 'node:crypto',
                  value: 135,
                  tone: 'info',
                },
              ],
            },
            {
              id: 'query-exec',
              name: 'executeQueryPlan',
              module: 'db/planner.ts',
              value: 310,
              tone: 'rose',
              children: [
                {
                  id: 'sql-parse',
                  name: 'parseSqlAst',
                  module: 'db/parser.ts',
                  value: 110,
                  tone: 'amber',
                },
                {
                  id: 'row-hydrate',
                  name: 'hydrateResultRows',
                  module: 'db/hydrator.ts',
                  value: 175,
                  tone: 'primary',
                },
              ],
            },
          ],
        },
        {
          id: 'json-serialize',
          name: 'JSON.stringify',
          module: 'v8:builtins',
          value: 210,
          tone: 'amber',
          children: [
            {
              id: 'zlib-gzip',
              name: 'zlib.gzipSync',
              module: 'node:zlib',
              value: 145,
              tone: 'rose',
            },
          ],
        },
      ],
    },
    {
      id: 'v8-gc',
      name: 'v8::MarkCompactCollector',
      module: 'v8:gc',
      value: 185,
      tone: 'rose',
      children: [
        {
          id: 'gc-sweep',
          name: 'SweepNewSpace',
          module: 'v8:gc',
          value: 115,
          tone: 'amber',
        },
      ],
    },
    {
      id: 'libuv-poll',
      name: 'uv__io_poll',
      module: 'libuv',
      value: 55,
      tone: 'secondary',
    },
  ],
};

function roundValue(value: number): number {
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

function formatMetric(value: number, unit: string): string {
  const num = formatNumeric(value);
  const trimmedUnit = unit.trim();
  return trimmedUnit ? `${num}${trimmedUnit}` : num;
}

function buildResolvedTree(
  node: FlameFrameNode,
  depth: number,
  siblingIndex: number,
  pathKey: string,
  rootTotal: number,
  ancestors: ReadonlySet<FlameFrameNode>,
  byPathKey: Map<string, ResolvedFlameNode>,
  parentByPathKey: Map<string, string>,
  parentPathKey: string | null
): ResolvedFlameNode | null {
  if (!Number.isFinite(node.value) || node.value <= 0) {
    return null;
  }

  const totalValue = node.value;
  const resolvedTone: FlameFrameTone =
    node.tone ?? TONE_CYCLE[(depth + siblingIndex) % TONE_CYCLE.length]!;
  const moduleName = node.module?.trim() || 'runtime';
  const resolvedChildren: ResolvedFlameNode[] = [];
  let childrenSum = 0;

  if (depth < MAX_DEPTH && Array.isArray(node.children) && node.children.length > 0) {
    const nextAncestors = new Set<FlameFrameNode>(ancestors);
    nextAncestors.add(node);

    for (let i = 0; i < node.children.length; i += 1) {
      const child = node.children[i]!;
      if (nextAncestors.has(child)) {
        continue;
      }
      const childKey = `${pathKey}/${i}`;
      const resolvedChild = buildResolvedTree(
        child,
        depth + 1,
        i,
        childKey,
        rootTotal,
        nextAncestors,
        byPathKey,
        parentByPathKey,
        pathKey
      );
      if (resolvedChild) {
        resolvedChildren.push(resolvedChild);
        childrenSum += resolvedChild.totalValue;
      }
    }
  }

  const roundedTotal = roundValue(totalValue);
  const selfValue = Math.max(0, roundValue(totalValue - childrenSum));
  const rootSharePct = roundPct((totalValue / rootTotal) * 100);
  const metrics: FlameFrameMetrics = {
    id: node.id,
    name: node.name,
    module: moduleName,
    totalValue: roundedTotal,
    selfValue,
    rootSharePct,
    depth,
  };

  const resolved: ResolvedFlameNode = {
    pathKey,
    id: node.id,
    name: node.name,
    module: moduleName,
    totalValue,
    selfValue,
    rootSharePct,
    depth,
    tone: resolvedTone,
    visual: TONE_VISUAL_MAP[resolvedTone],
    children: resolvedChildren,
    metrics,
  };

  byPathKey.set(pathKey, resolved);
  if (parentPathKey !== null) {
    parentByPathKey.set(pathKey, parentPathKey);
  }

  return resolved;
}

function matchesSearch(node: ResolvedFlameNode, lowerQuery: string): boolean {
  return (
    node.name.toLowerCase().includes(lowerQuery) ||
    node.module.toLowerCase().includes(lowerQuery)
  );
}

function computeMatchedTotal(node: ResolvedFlameNode, lowerQuery: string): number {
  if (matchesSearch(node, lowerQuery)) {
    return node.totalValue;
  }
  let sum = 0;
  for (const child of node.children) {
    sum += computeMatchedTotal(child, lowerQuery);
  }
  return Math.min(node.totalValue, sum);
}

function layoutSubtree(activeRoot: ResolvedFlameNode, lowerQuery: string): LayoutRow[] {
  const rowMap = new Map<number, LayoutFrame[]>();
  const hasQuery = lowerQuery.length > 0;

  const visit = (
    node: ResolvedFlameNode,
    relativeDepth: number,
    leftPct: number,
    widthPct: number
  ) => {
    const existing = rowMap.get(relativeDepth);
    const frame: LayoutFrame = {
      node,
      relativeDepth,
      leftPct: Number(leftPct.toFixed(4)),
      widthPct: Number(widthPct.toFixed(4)),
      isMatched: hasQuery && matchesSearch(node, lowerQuery),
    };
    if (existing) {
      existing.push(frame);
    } else {
      rowMap.set(relativeDepth, [frame]);
    }

    if (node.children.length === 0) {
      return;
    }

    let childrenSum = 0;
    for (const child of node.children) {
      childrenSum += child.totalValue;
    }
    const scaleTotal = Math.max(node.totalValue, childrenSum);
    let cursorLeft = leftPct;

    for (const child of node.children) {
      const childWidth = (child.totalValue / scaleTotal) * widthPct;
      visit(child, relativeDepth + 1, cursorLeft, childWidth);
      cursorLeft += childWidth;
    }
  };

  visit(activeRoot, 0, 0, 100);

  const rows: LayoutRow[] = [];
  for (let depth = 0; depth < rowMap.size; depth += 1) {
    rows.push({
      relativeDepth: depth,
      key: `depth-row-${depth}`,
      frames: rowMap.get(depth)!,
    });
  }
  return rows;
}

function renderLiteralHighlight(source: string, query: string, keyPrefix: string) {
  const segments = splitLiteralHighlight(source, query);
  let offset = 0;
  return segments.map((segment) => {
    const startOffset = offset;
    offset += segment.text.length;
    const key = `${keyPrefix}-${startOffset}-${segment.highlighted ? 'h' : 'n'}`;
    if (segment.highlighted) {
      return (
        <mark
          key={key}
          className="bg-transparent text-inherit underline decoration-2 underline-offset-2 font-bold"
        >
          {segment.text}
        </mark>
      );
    }
    return <span key={key}>{segment.text}</span>;
  });
}

function FlameGraphChartInner({
  root,
  orientation,
  defaultOrientation = 'flame',
  onOrientationChange,
  unit = 'ms',
  title = 'CPU Flame / Icicle Graph',
  onSelectFrame,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: FlameGraphChartProps) {
  const headingId = useId();
  const override = useComponentOverride('FlameGraphChart');

  const [currentOrientation, setCurrentOrientation] = useControllableState<FlameGraphOrientation>({
    value: orientation,
    defaultValue: defaultOrientation,
    onChange: onOrientationChange,
  });

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [zoomPathKey, setZoomPathKey] = useState<string | null>(null);
  const [selectedPathKey, setSelectedPathKey] = useState<string | null>(null);
  const [hoveredPathKey, setHoveredPathKey] = useState<string | null>(null);

  const effectiveRoot = root === undefined ? DEFAULT_FLAME_GRAPH_ROOT : root;

  const { resolvedRoot, byPathKey, parentByPathKey } = useMemo(() => {
    const nodeMap = new Map<string, ResolvedFlameNode>();
    const parentMap = new Map<string, string>();
    if (!effectiveRoot) {
      return {
        resolvedRoot: null,
        byPathKey: nodeMap,
        parentByPathKey: parentMap,
      };
    }

    const built = buildResolvedTree(
      effectiveRoot,
      0,
      0,
      '0',
      effectiveRoot.value,
      new Set<FlameFrameNode>(),
      nodeMap,
      parentMap,
      null
    );

    return {
      resolvedRoot: built,
      byPathKey: nodeMap,
      parentByPathKey: parentMap,
    };
  }, [effectiveRoot]);

  const activeRoot = useMemo(() => {
    if (!resolvedRoot) return null;
    if (zoomPathKey === null) return resolvedRoot;
    return byPathKey.get(zoomPathKey) ?? resolvedRoot;
  }, [byPathKey, resolvedRoot, zoomPathKey]);

  const isZoomed = Boolean(activeRoot && activeRoot.depth > 0);

  const zoomTrail = useMemo<ResolvedFlameNode[]>(() => {
    if (!activeRoot) return [];
    const chain: ResolvedFlameNode[] = [activeRoot];
    let currentKey = activeRoot.pathKey;
    let parentKey = parentByPathKey.get(currentKey);
    while (parentKey !== undefined) {
      const parentNode = byPathKey.get(parentKey)!;
      chain.push(parentNode);
      currentKey = parentKey;
      parentKey = parentByPathKey.get(currentKey);
    }
    return chain.reverse();
  }, [activeRoot, byPathKey, parentByPathKey]);

  const trimmedQuery = searchQuery.trim();
  const lowerQuery = trimmedQuery.toLowerCase();
  const hasSearchQuery = lowerQuery.length > 0;

  const layoutRows = useMemo<LayoutRow[]>(() => {
    if (!activeRoot) return [];
    return layoutSubtree(activeRoot, lowerQuery);
  }, [activeRoot, lowerQuery]);

  const orderedRows = useMemo<LayoutRow[]>(() => {
    if (currentOrientation === 'flame') {
      return [...layoutRows].reverse();
    }
    return layoutRows;
  }, [currentOrientation, layoutRows]);

  const searchMatchSharePct = useMemo<number>(() => {
    if (!activeRoot || !hasSearchQuery) return 0;
    const matchedTotal = computeMatchedTotal(activeRoot, lowerQuery);
    return roundPct((matchedTotal / activeRoot.totalValue) * 100);
  }, [activeRoot, hasSearchQuery, lowerQuery]);

  const activeView = useMemo(() => {
    if (!activeRoot) return null;
    const hovered = hoveredPathKey !== null ? byPathKey.get(hoveredPathKey) : undefined;
    const selected = selectedPathKey !== null ? byPathKey.get(selectedPathKey) : undefined;
    return {
      root: activeRoot,
      display: hovered ?? selected ?? activeRoot,
    };
  }, [activeRoot, byPathKey, hoveredPathKey, selectedPathKey]);

  const isEmpty = activeView === null;

  const handleResetZoom = useCallback(() => {
    setZoomPathKey(null);
    setSelectedPathKey(null);
    setHoveredPathKey(null);
  }, []);

  const handleSelectFrame = useCallback(
    (node: ResolvedFlameNode) => {
      setZoomPathKey(node.depth === 0 ? null : node.pathKey);
      setSelectedPathKey(node.pathKey);
      setHoveredPathKey(null);
      onSelectFrame?.(node.metrics);
    },
    [onSelectFrame]
  );

  const handleBreadcrumbClick = useCallback(
    (crumb: ResolvedFlameNode, isCurrentZoomRoot: boolean) => {
      if (isCurrentZoomRoot || crumb.depth === 0) {
        handleResetZoom();
        return;
      }
      setZoomPathKey(crumb.pathKey);
      setSelectedPathKey(crumb.pathKey);
      setHoveredPathKey(null);
    },
    [handleResetZoom]
  );

  const handleFrameKeyDown = useCallback(
    (node: ResolvedFlameNode) => (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.nativeEvent.isComposing) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleSelectFrame(node);
        return;
      }
      if (event.key === 'Escape' && isZoomed) {
        event.preventDefault();
        handleResetZoom();
      }
    },
    [handleResetZoom, handleSelectFrame, isZoomed]
  );

  const handleSearchChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  }, []);

  const handleSearchKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (event.nativeEvent.isComposing) return;
      if (event.key === 'Escape') {
        if (searchQuery.length > 0) {
          event.preventDefault();
          setSearchQuery('');
        } else if (isZoomed) {
          event.preventDefault();
          handleResetZoom();
        }
      }
    },
    [handleResetZoom, isZoomed, searchQuery]
  );

  const merged = mergeProps({
    themeTarget: themeProps('flame-graph-chart', {
      orientation: currentOrientation,
      zoomed: isZoomed,
      empty: isEmpty,
      searching: hasSearchQuery,
    }),
    baseClassName: 'prism-slab p-4 sm:p-5 space-y-3.5 max-w-full min-w-0',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('flame-graph-chart', 'header');
  const controlsClass = stableClassName('flame-graph-chart', 'controls');
  const canvasClass = stableClassName('flame-graph-chart', 'canvas');
  const readoutClass = stableClassName('flame-graph-chart', 'readout');

  return (
    <div ref={ref} role="region" aria-labelledby={headingId} {...rest} {...merged}>
      <div className={cx(headerClass, 'flex flex-wrap items-center justify-between gap-3 min-w-0')}>
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <h4
            id={headingId}
            className="text-sm font-semibold tracking-tight truncate"
            style={STYLE_TEXT_PRIMARY}
          >
            {title}
          </h4>
          {resolvedRoot ? (
            <span
              className="prism-crystal px-2 py-0.5 rounded-full text-[11px] font-mono font-medium tabular-nums"
              style={STYLE_TEXT_SECONDARY}
            >
              {formatMetric(resolvedRoot.totalValue, unit)}
            </span>
          ) : null}
        </div>

        <div className={cx(controlsClass, 'flex flex-wrap items-center gap-2 min-w-0 max-w-full')}>
          <div
            role="group"
            aria-label="Graph orientation"
            className="prism-well rounded-full p-0.5 inline-flex items-center gap-0.5 shrink-0"
          >
            <button
              type="button"
              aria-pressed={currentOrientation === 'flame'}
              onClick={() => setCurrentOrientation('flame')}
              className={cx(
                'prism-focus-ring px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-opacity',
                currentOrientation === 'flame' ? 'prism-crystal font-semibold' : 'opacity-75 hover:opacity-100'
              )}
              style={{
                color:
                  currentOrientation === 'flame'
                    ? 'var(--prism-text-primary)'
                    : 'var(--prism-text-secondary)',
              }}
            >
              Flame
            </button>
            <button
              type="button"
              aria-pressed={currentOrientation === 'icicle'}
              onClick={() => setCurrentOrientation('icicle')}
              className={cx(
                'prism-focus-ring px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-opacity',
                currentOrientation === 'icicle' ? 'prism-crystal font-semibold' : 'opacity-75 hover:opacity-100'
              )}
              style={{
                color:
                  currentOrientation === 'icicle'
                    ? 'var(--prism-text-primary)'
                    : 'var(--prism-text-secondary)',
              }}
            >
              Icicle
            </button>
          </div>

          <div className="prism-well rounded-full px-3 py-1 inline-flex items-center gap-2 min-w-0 max-w-full">
            <input
              type="search"
              aria-label="Filter stack frames"
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyDown}
              placeholder="Filter frames..."
              className="prism-focus-ring bg-transparent text-xs min-w-0 w-32 sm:w-40 outline-none"
              style={STYLE_TEXT_PRIMARY}
            />
            {hasSearchQuery ? (
              <span
                data-testid="flame-search-match-pill"
                className="prism-crystal px-1.5 py-0.5 rounded-full text-[10px] font-mono font-semibold tabular-nums shrink-0"
                style={STYLE_PRIMARY_MAIN}
              >
                {`${formatNumeric(searchMatchSharePct)}%`}
              </span>
            ) : null}
          </div>

          <button
            type="button"
            disabled={!isZoomed}
            onClick={handleResetZoom}
            className="prism-focus-ring prism-crystal px-3 py-1 rounded-full text-xs font-medium cursor-pointer disabled:cursor-not-allowed disabled:opacity-45 shrink-0"
            style={STYLE_TEXT_PRIMARY}
          >
            Reset Zoom
          </button>
        </div>
      </div>

      {activeView && isZoomed ? (
        <nav
          aria-label="Active zoom breadcrumb"
          data-testid="flame-zoom-breadcrumb"
          className="flex flex-wrap items-center gap-1.5 min-w-0"
        >
          {zoomTrail.map((crumb, idx) => {
            const isCurrent = crumb.pathKey === activeView.root.pathKey;
            return (
              <span key={`crumb-${crumb.pathKey}`} className="inline-flex items-center gap-1.5 min-w-0">
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
                  onClick={() => handleBreadcrumbClick(crumb, isCurrent)}
                  className={cx(
                    'prism-focus-ring inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs cursor-pointer max-w-full min-w-0',
                    isCurrent ? 'prism-well font-semibold' : 'prism-crystal font-medium opacity-85 hover:opacity-100'
                  )}
                  style={STYLE_TEXT_PRIMARY}
                >
                  <span
                    aria-hidden="true"
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: crumb.visual.bg }}
                  />
                  <span className="truncate">
                    {isCurrent ? `Zoom: ${crumb.name}` : crumb.name}
                  </span>
                </button>
              </span>
            );
          })}
        </nav>
      ) : null}

      {activeView === null ? (
        <div
          role="status"
          data-testid="flame-graph-empty"
          className="prism-well rounded-2xl px-4 py-8 text-center text-xs font-medium"
          style={STYLE_TEXT_SECONDARY}
        >
          No CPU stack profile samples available.
        </div>
      ) : (
        <>
          <div
            data-testid="flame-graph-canvas"
            data-orientation={currentOrientation}
            className={cx(
              canvasClass,
              'prism-well rounded-2xl p-2.5 space-y-1 w-full min-w-0 max-w-full overflow-x-auto'
            )}
          >
            {orderedRows.map((row) => (
              <div
                key={row.key}
                data-flame-row={String(row.relativeDepth)}
                className="relative h-7 w-full min-w-0"
              >
                {row.frames.map((frame) => {
                  const { node } = frame;
                  const isActiveSelected = activeView.display.pathKey === node.pathKey;
                  const isDimmed = hasSearchQuery && !frame.isMatched;
                  const frameAriaLabel = `${node.name} (${node.module}) — Total ${formatMetric(node.totalValue, unit)}, Self ${formatMetric(node.selfValue, unit)}, ${formatNumeric(node.rootSharePct)}% of root`;

                  return (
                    <div
                      key={node.pathKey}
                      role="button"
                      tabIndex={0}
                      aria-label={frameAriaLabel}
                      aria-pressed={isActiveSelected}
                      data-frame-id={node.id}
                      data-frame-depth={String(node.depth)}
                      data-tone={node.tone}
                      data-matched={frame.isMatched ? 'true' : 'false'}
                      data-zoom-root={activeView.root.pathKey === node.pathKey ? 'true' : 'false'}
                      className="prism-focus-ring absolute top-0 bottom-0 px-0.5 cursor-pointer select-none min-w-0"
                      style={{
                        left: `${frame.leftPct}%`,
                        width: `${frame.widthPct}%`,
                      }}
                      onClick={() => handleSelectFrame(node)}
                      onKeyDown={handleFrameKeyDown(node)}
                      onMouseEnter={() => setHoveredPathKey(node.pathKey)}
                      onMouseLeave={() => setHoveredPathKey(null)}
                      onFocus={() => setHoveredPathKey(node.pathKey)}
                      onBlur={() => setHoveredPathKey(null)}
                    >
                      <div
                        className="h-full w-full rounded-md px-1.5 flex items-center justify-between gap-1 overflow-hidden text-[11px] font-mono leading-none transition-opacity duration-150"
                        style={{
                          backgroundColor: node.visual.bg,
                          color: node.visual.fg,
                          opacity: isDimmed ? 0.3 : 1,
                          border:
                            frame.isMatched || isActiveSelected
                              ? '1.5px solid var(--prism-text-primary)'
                              : '1px solid var(--prism-divider)',
                        }}
                      >
                        <span className="truncate font-medium">
                          {hasSearchQuery
                            ? renderLiteralHighlight(node.name, trimmedQuery, `${node.pathKey}-name`)
                            : node.name}
                        </span>
                        {frame.widthPct >= 18 ? (
                          <span className="shrink-0 text-[10px] opacity-90 tabular-nums">
                            {formatMetric(node.totalValue, unit)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div
            data-testid="flame-graph-readout"
            aria-live="polite"
            className={cx(
              readoutClass,
              'prism-well rounded-xl px-3.5 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs tabular-nums min-w-0 max-w-full'
            )}
            style={STYLE_TEXT_PRIMARY}
          >
            <span className="inline-flex items-center gap-1.5 min-w-0 max-w-full">
              <span
                aria-hidden="true"
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: activeView.display.visual.bg }}
              />
              <span style={STYLE_TEXT_SECONDARY}>Frame:</span>
              <span className="font-semibold font-mono truncate">{activeView.display.name}</span>
            </span>

            <span aria-hidden="true" style={STYLE_TEXT_SECONDARY}>
              ·
            </span>

            <span className="inline-flex items-center gap-1 min-w-0">
              <span style={STYLE_TEXT_SECONDARY}>Module:</span>
              <span className="font-mono truncate">{activeView.display.module}</span>
            </span>

            <span aria-hidden="true" style={STYLE_TEXT_SECONDARY}>
              ·
            </span>

            <span className="inline-flex items-center gap-1">
              <span style={STYLE_TEXT_SECONDARY}>Total CPU:</span>
              <span className="font-mono font-semibold">
                {formatMetric(activeView.display.totalValue, unit)}
              </span>
            </span>

            <span aria-hidden="true" style={STYLE_TEXT_SECONDARY}>
              ·
            </span>

            <span className="inline-flex items-center gap-1">
              <span style={STYLE_TEXT_SECONDARY}>Self CPU:</span>
              <span className="font-mono font-semibold">
                {formatMetric(activeView.display.selfValue, unit)}
              </span>
            </span>

            <span aria-hidden="true" style={STYLE_TEXT_SECONDARY}>
              ·
            </span>

            <span className="inline-flex items-center gap-1">
              <span style={STYLE_TEXT_SECONDARY}>% of Root:</span>
              <span className="font-mono font-semibold">
                {`${formatNumeric(activeView.display.rootSharePct)}%`}
              </span>
            </span>

            <span aria-hidden="true" style={STYLE_TEXT_SECONDARY}>
              ·
            </span>

            <span className="inline-flex items-center gap-1">
              <span style={STYLE_TEXT_SECONDARY}>Search Match %:</span>
              <span
                data-testid="flame-readout-search-match"
                className="font-mono font-semibold"
                style={{
                  color: hasSearchQuery
                    ? 'var(--prism-primary-main)'
                    : 'var(--prism-text-secondary)',
                }}
              >
                {hasSearchQuery ? `${formatNumeric(searchMatchSharePct)}%` : '—'}
              </span>
            </span>
          </div>
        </>
      )}
    </div>
  );
}

export const FlameGraphChart = memo(FlameGraphChartInner);
FlameGraphChart.displayName = 'FlameGraphChart';
