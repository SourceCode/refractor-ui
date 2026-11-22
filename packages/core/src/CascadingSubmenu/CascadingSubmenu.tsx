'use client';

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { Check, ChevronRight, Layers } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useMergedRefs } from '../hooks/useMergedRefs';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { themeProps } from '../utils/themeProps';

export interface SafeTrianglePoint {
  x: number;
  y: number;
}

export interface CascadingMenuItem {
  /** Unique identifier within this menu level. */
  id: string;
  /** Visible menu command or parent submenu label. */
  label: string;
  /** Optional keyboard shortcut hint displayed on the trailing edge. */
  shortcut?: string;
  /** Disables hovering, keyboard focus traversal, and selection on this item. */
  disabled?: boolean;
  /** Displays a subtle checkmark indicator beside the label. */
  checked?: boolean;
  /** Optional child items rendered in an adjacent cascading submenu pane. */
  children?: ReadonlyArray<CascadingMenuItem>;
}

type CascadingSubmenuBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface CascadingSubmenuProps extends CascadingSubmenuBaseProps {
  /** Accessible title rendered in the optical slab header and region label. */
  title?: string;
  /** Hierarchical menu tree (defaults to a realistic 3-level studio command hierarchy). */
  items?: ReadonlyArray<CascadingMenuItem>;
  /** Safe-triangle hover deferral delay in milliseconds (clamped 0..1000, default 160). */
  hoverDelayMs?: number;
  /** Callback invoked when a leaf item is selected via click, Enter, or Space. */
  onSelectItem?: (item: CascadingMenuItem, pathIds: ReadonlyArray<string>) => void;
  /** Disables all menu interactions and collapses open child panes. */
  disabled?: boolean;
}

interface MenuColumn {
  depth: number;
  key: string;
  parentId: string | null;
  parentLabel: string;
  parentColumnLabel: string;
  items: ReadonlyArray<CascadingMenuItem>;
  pathPrefix: ReadonlyArray<string>;
  pathLabels: ReadonlyArray<string>;
}

interface FocusRequest {
  depth: number;
  itemId: string;
}

const DEFAULT_TITLE = 'Command Menu';
const DEFAULT_HOVER_DELAY_MS = 160;
const MIN_HOVER_DELAY_MS = 0;
const MAX_HOVER_DELAY_MS = 1000;
const TRIANGLE_EPSILON = 1e-9;

export const DEFAULT_CASCADING_MENU_ITEMS: ReadonlyArray<CascadingMenuItem> = [
  { id: 'new-document', label: 'New Document', shortcut: '⌘N' },
  {
    id: 'open-recent',
    label: 'Open Recent',
    children: [
      { id: 'optical-spec-v2', label: 'OpticalSpec_v2.md', shortcut: '⌘1', checked: true },
      { id: 'token-engine-ts', label: 'TokenEngine.ts', shortcut: '⌘2' },
    ],
  },
  {
    id: 'export-as',
    label: 'Export As',
    children: [
      {
        id: 'raster-image',
        label: 'Raster Image',
        children: [
          { id: 'png-2x-retina', label: 'PNG (2x Retina)', shortcut: '⇧⌘P', checked: true },
          { id: 'webp-lossless', label: 'WebP Lossless', shortcut: '⇧⌘W' },
        ],
      },
      {
        id: 'vector',
        label: 'Vector',
        children: [{ id: 'svg-optical', label: 'SVG Optical', shortcut: '⇧⌘S' }],
      },
    ],
  },
  { id: 'preferences', label: 'Preferences', shortcut: '⌘,' },
  { id: 'disabled-action', label: 'Disabled Action', disabled: true },
];

function isFinitePoint(point: SafeTrianglePoint): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}

function crossProduct2D(
  point: SafeTrianglePoint,
  edgeStart: SafeTrianglePoint,
  edgeEnd: SafeTrianglePoint
): number {
  return (
    (point.x - edgeStart.x) * (edgeEnd.y - edgeStart.y) -
    (point.y - edgeStart.y) * (edgeEnd.x - edgeStart.x)
  );
}

/**
 * Pure 2D cross-product point-in-triangle check used to detect diagonal pointer
 * motion toward an open child submenu pane. Returns `false` for non-finite coordinates
 * or degenerate/collinear triangles.
 */
export function isPointInSafeTriangle(
  point: SafeTrianglePoint,
  anchor: SafeTrianglePoint,
  topCorner: SafeTrianglePoint,
  bottomCorner: SafeTrianglePoint
): boolean {
  if (
    !isFinitePoint(point) ||
    !isFinitePoint(anchor) ||
    !isFinitePoint(topCorner) ||
    !isFinitePoint(bottomCorner)
  ) {
    return false;
  }

  const doubleArea = crossProduct2D(bottomCorner, anchor, topCorner);
  if (Math.abs(doubleArea) <= TRIANGLE_EPSILON) {
    return false;
  }

  const d1 = crossProduct2D(point, anchor, topCorner);
  const d2 = crossProduct2D(point, topCorner, bottomCorner);
  const d3 = crossProduct2D(point, bottomCorner, anchor);

  const hasNegative =
    d1 < -TRIANGLE_EPSILON || d2 < -TRIANGLE_EPSILON || d3 < -TRIANGLE_EPSILON;
  const hasPositive =
    d1 > TRIANGLE_EPSILON || d2 > TRIANGLE_EPSILON || d3 > TRIANGLE_EPSILON;

  return !(hasNegative && hasPositive);
}

function hasChildItems(item: CascadingMenuItem): boolean {
  return Boolean(item.children && item.children.length > 0);
}

function getEnabledItems(items: ReadonlyArray<CascadingMenuItem>): ReadonlyArray<CascadingMenuItem> {
  return items.filter((item) => !item.disabled);
}

function makeItemNodeKey(depth: number, itemId: string): string {
  return `${depth}\0${itemId}`;
}

function pickColumnTarget(
  enabled: ReadonlyArray<CascadingMenuItem>,
  currentItem: CascadingMenuItem,
  key: 'ArrowDown' | 'ArrowUp' | 'Home' | 'End'
): CascadingMenuItem {
  if (key === 'Home') return enabled[0] as CascadingMenuItem;
  if (key === 'End') return enabled[enabled.length - 1] as CascadingMenuItem;
  const currentIndex = enabled.findIndex((entry) => entry.id === currentItem.id);
  const delta = key === 'ArrowDown' ? 1 : -1;
  const nextIndex = (currentIndex + delta + enabled.length) % enabled.length;
  return enabled[nextIndex] as CascadingMenuItem;
}

export function CascadingSubmenu({
  title = DEFAULT_TITLE,
  items,
  hoverDelayMs = DEFAULT_HOVER_DELAY_MS,
  onSelectItem,
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: CascadingSubmenuProps) {
  const instanceId = useId();
  const override = useComponentOverride('CascadingSubmenu');

  const rootRef = useRef<HTMLDivElement>(null);
  const mergedRef = useMergedRefs<HTMLDivElement>(rootRef, ref);

  const columnNodesRef = useRef<Map<number, HTMLDivElement>>(new Map());
  const itemNodesRef = useRef<Map<string, HTMLButtonElement>>(new Map());
  const anchorByDepthRef = useRef<Map<number, SafeTrianglePoint>>(new Map());
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDepthRef = useRef<number | null>(null);

  const resolvedItems = items ?? DEFAULT_CASCADING_MENU_ITEMS;
  const isEmpty = resolvedItems.length === 0;
  const clampedHoverDelayMs = Math.round(
    clampNumber(hoverDelayMs, MIN_HOVER_DELAY_MS, MAX_HOVER_DELAY_MS, DEFAULT_HOVER_DELAY_MS)
  );

  const [openPath, setOpenPath] = useState<ReadonlyArray<string>>([]);
  const [rovingRootId, setRovingRootId] = useState<string | null>(null);
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null);
  const [pendingHoverDepth, setPendingHoverDepth] = useState<number | null>(null);
  const [lastSelectedKey, setLastSelectedKey] = useState<string | null>(null);
  const [statusAnnouncement, setStatusAnnouncement] = useState<string>(
    'Ready · Navigate with mouse or arrow keys'
  );
  const [statusTone, setStatusTone] = useState<'idle' | 'opened' | 'selected'>('idle');

  const columns = useMemo<ReadonlyArray<MenuColumn>>(() => {
    if (resolvedItems.length === 0) return [];
    const activeIds = disabled ? [] : openPath;
    const result: MenuColumn[] = [
      {
        depth: 0,
        key: 'root',
        parentId: null,
        parentLabel: title,
        parentColumnLabel: title,
        items: resolvedItems,
        pathPrefix: [],
        pathLabels: [],
      },
    ];

    let currentItems = resolvedItems;
    let currentColumnLabel = title;
    const prefixIds: string[] = [];
    const prefixLabels: string[] = [];

    for (let depth = 0; depth < activeIds.length; depth += 1) {
      const targetId = activeIds[depth];
      const matched = currentItems.find((entry) => entry.id === targetId);
      if (!matched || matched.disabled || !matched.children || matched.children.length === 0) {
        break;
      }
      prefixIds.push(matched.id);
      prefixLabels.push(matched.label);
      result.push({
        depth: depth + 1,
        key: prefixIds.join('/'),
        parentId: matched.id,
        parentLabel: matched.label,
        parentColumnLabel: currentColumnLabel,
        items: matched.children,
        pathPrefix: [...prefixIds],
        pathLabels: [...prefixLabels],
      });
      currentItems = matched.children;
      currentColumnLabel = matched.label;
    }

    return result;
  }, [disabled, openPath, resolvedItems, title]);

  const lastColumn = columns[columns.length - 1];
  const effectiveOpenPath: ReadonlyArray<string> = lastColumn ? lastColumn.pathPrefix : [];
  const isHoverDeferred = !disabled && pendingHoverDepth !== null;

  const firstEnabledRootId = useMemo(
    () => resolvedItems.find((entry) => !entry.disabled)?.id ?? null,
    [resolvedItems]
  );

  const effectiveRovingRootId = useMemo(() => {
    if (rovingRootId && resolvedItems.some((entry) => entry.id === rovingRootId && !entry.disabled)) {
      return rovingRootId;
    }
    return firstEnabledRootId;
  }, [firstEnabledRootId, resolvedItems, rovingRootId]);

  const registerColumnNode = useCallback((depth: number, node: HTMLDivElement | null) => {
    if (node) {
      columnNodesRef.current.set(depth, node);
    } else {
      columnNodesRef.current.delete(depth);
    }
  }, []);

  const registerItemNode = useCallback(
    (depth: number, itemId: string, node: HTMLButtonElement | null) => {
      const key = makeItemNodeKey(depth, itemId);
      if (node) {
        itemNodesRef.current.set(key, node);
      } else {
        itemNodesRef.current.delete(key);
      }
    },
    []
  );

  const cancelPendingHover = useCallback(() => {
    if (hoverTimerRef.current !== null) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    if (pendingDepthRef.current !== null) {
      pendingDepthRef.current = null;
      setPendingHoverDepth(null);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current !== null) {
        clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (disabled && hoverTimerRef.current !== null) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
      pendingDepthRef.current = null;
    }
  }, [disabled]);

  useEffect(() => {
    if (!focusRequest) return;
    itemNodesRef.current.get(makeItemNodeKey(focusRequest.depth, focusRequest.itemId))?.focus();
  }, [focusRequest]);

  const openSubmenuAt = useCallback(
    (
      column: MenuColumn,
      item: CascadingMenuItem,
      childItems: ReadonlyArray<CascadingMenuItem>,
      focusFirstChild: boolean
    ) => {
      const nextPathIds = [...column.pathPrefix, item.id];
      const nextPathLabels = [...column.pathLabels, item.label];
      setOpenPath(nextPathIds);
      setStatusAnnouncement(`Opened ${nextPathLabels.join(' › ')} (Level ${column.depth + 2})`);
      setStatusTone('opened');

      if (focusFirstChild) {
        const firstEnabledChild = getEnabledItems(childItems)[0];
        if (firstEnabledChild) {
          setFocusRequest({ depth: column.depth + 1, itemId: firstEnabledChild.id });
        }
      }
    },
    []
  );

  const selectLeafItem = useCallback(
    (column: MenuColumn, item: CascadingMenuItem) => {
      const fullPathIds = [...column.pathPrefix, item.id];
      const fullPathLabels = [...column.pathLabels, item.label];
      setOpenPath(column.pathPrefix);
      setLastSelectedKey(fullPathIds.join('\0'));
      setStatusAnnouncement(`Selected: ${fullPathLabels.join(' › ')}`);
      setStatusTone('selected');
      onSelectItem?.(item, fullPathIds);
    },
    [onSelectItem]
  );

  const applyHoverTransition = useCallback(
    (column: MenuColumn, item: CascadingMenuItem, hadOpenChild: boolean) => {
      if (item.children && item.children.length > 0) {
        openSubmenuAt(column, item, item.children, false);
      } else if (hadOpenChild) {
        setOpenPath(column.pathPrefix);
        setStatusAnnouncement(`Active level: ${column.parentLabel}`);
        setStatusTone(column.depth > 0 ? 'opened' : 'idle');
      }
    },
    [openSubmenuAt]
  );

  const handleColumnMouseEnter = useCallback(
    (depth: number) => {
      if (disabled) return;
      if (pendingDepthRef.current !== null && depth > pendingDepthRef.current) {
        cancelPendingHover();
      }
    },
    [cancelPendingHover, disabled]
  );

  const handleItemMouseEnter = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>, column: MenuColumn, item: CascadingMenuItem) => {
      const depth = column.depth;
      const currentPoint: SafeTrianglePoint = { x: event.clientX, y: event.clientY };
      const activeIdAtDepth = effectiveOpenPath[depth];

      if (activeIdAtDepth === item.id) {
        cancelPendingHover();
        anchorByDepthRef.current.set(depth, currentPoint);
        return;
      }

      const hadOpenChild = activeIdAtDepth !== undefined;

      if (hadOpenChild && clampedHoverDelayMs > 0) {
        const childColumnNode = columnNodesRef.current.get(depth + 1);
        const anchor = anchorByDepthRef.current.get(depth);

        if (childColumnNode && anchor) {
          const childRect = childColumnNode.getBoundingClientRect();
          if (childRect.width > 0 && childRect.height > 0) {
            const edgeX =
              Math.abs(anchor.x - childRect.left) <= Math.abs(anchor.x - childRect.right)
                ? childRect.left
                : childRect.right;
            const topCorner: SafeTrianglePoint = { x: edgeX, y: childRect.top };
            const bottomCorner: SafeTrianglePoint = { x: edgeX, y: childRect.bottom };

            if (isPointInSafeTriangle(currentPoint, anchor, topCorner, bottomCorner)) {
              cancelPendingHover();
              pendingDepthRef.current = depth;
              setPendingHoverDepth(depth);
              hoverTimerRef.current = setTimeout(() => {
                hoverTimerRef.current = null;
                pendingDepthRef.current = null;
                setPendingHoverDepth(null);
                anchorByDepthRef.current.set(depth, currentPoint);
                applyHoverTransition(column, item, true);
              }, clampedHoverDelayMs);
              return;
            }
          }
        }
      }

      cancelPendingHover();
      anchorByDepthRef.current.set(depth, currentPoint);
      applyHoverTransition(column, item, hadOpenChild);
    },
    [applyHoverTransition, cancelPendingHover, clampedHoverDelayMs, effectiveOpenPath]
  );

  const handleItemMouseMove = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>, column: MenuColumn, item: CascadingMenuItem) => {
      if (effectiveOpenPath[column.depth] === item.id) {
        anchorByDepthRef.current.set(column.depth, { x: event.clientX, y: event.clientY });
      }
    },
    [effectiveOpenPath]
  );

  const handleItemClick = useCallback(
    (column: MenuColumn, item: CascadingMenuItem) => {
      cancelPendingHover();
      if (column.depth === 0) {
        setRovingRootId(item.id);
      }

      if (item.children && item.children.length > 0) {
        if (effectiveOpenPath[column.depth] === item.id) {
          setOpenPath(column.pathPrefix);
          setStatusAnnouncement(`Closed ${item.label} · Active level: ${column.parentLabel}`);
          setStatusTone(column.depth > 0 ? 'opened' : 'idle');
        } else {
          openSubmenuAt(column, item, item.children, false);
        }
      } else {
        selectLeafItem(column, item);
      }
    },
    [cancelPendingHover, effectiveOpenPath, openSubmenuAt, selectLeafItem]
  );

  const closeActiveLevelAndFocusParent = useCallback(
    (column: MenuColumn, parentId: string) => {
      const nextDepth = column.depth - 1;
      setOpenPath(column.pathPrefix.slice(0, -1));
      setStatusAnnouncement(
        `Closed ${column.parentLabel} · Returned to ${column.parentColumnLabel}`
      );
      setStatusTone(nextDepth > 0 ? 'opened' : 'idle');
      if (nextDepth === 0) {
        setRovingRootId(parentId);
      }
      setFocusRequest({ depth: nextDepth, itemId: parentId });
    },
    []
  );

  const handleItemKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>, column: MenuColumn, item: CascadingMenuItem) => {
      if (event.nativeEvent.isComposing) return;

      switch (event.key) {
        case 'ArrowDown':
        case 'ArrowUp':
        case 'Home':
        case 'End': {
          event.preventDefault();
          cancelPendingHover();
          const enabled = getEnabledItems(column.items);
          const next = pickColumnTarget(enabled, item, event.key);
          if (effectiveOpenPath.length > column.depth) {
            setOpenPath(column.pathPrefix);
          }
          if (column.depth === 0) {
            setRovingRootId(next.id);
          }
          setFocusRequest({ depth: column.depth, itemId: next.id });
          break;
        }
        case 'ArrowRight': {
          if (item.children && item.children.length > 0) {
            event.preventDefault();
            cancelPendingHover();
            openSubmenuAt(column, item, item.children, true);
          }
          break;
        }
        case 'ArrowLeft': {
          if (column.parentId !== null) {
            event.preventDefault();
            cancelPendingHover();
            closeActiveLevelAndFocusParent(column, column.parentId);
          }
          break;
        }
        case 'Escape': {
          if (column.parentId !== null) {
            event.preventDefault();
            cancelPendingHover();
            closeActiveLevelAndFocusParent(column, column.parentId);
          } else if (effectiveOpenPath.length > 0) {
            event.preventDefault();
            cancelPendingHover();
            setOpenPath([]);
            setStatusAnnouncement(`Closed submenus · Active level: ${title}`);
            setStatusTone('idle');
          }
          break;
        }
        case 'Enter':
        case ' ': {
          event.preventDefault();
          cancelPendingHover();
          if (item.children && item.children.length > 0) {
            openSubmenuAt(column, item, item.children, true);
          } else {
            selectLeafItem(column, item);
          }
          break;
        }
        default:
          break;
      }
    },
    [
      cancelPendingHover,
      closeActiveLevelAndFocusParent,
      effectiveOpenPath.length,
      openSubmenuAt,
      selectLeafItem,
      title,
    ]
  );

  const merged = mergeProps({
    themeTarget: themeProps('cascading-submenu', {
      disabled,
      empty: isEmpty,
      openDepth: effectiveOpenPath.length,
      hoverDeferred: isHoverDeferred,
    }),
    baseClassName: 'prism-slab w-full max-w-full min-w-0 p-4 sm:p-5 space-y-3.5',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('cascading-submenu', 'header');
  const statusClass = stableClassName('cascading-submenu', 'status');
  const panesClass = stableClassName('cascading-submenu', 'panes');
  const columnClass = stableClassName('cascading-submenu', 'column');
  const itemClass = stableClassName('cascading-submenu', 'item');
  const emptyClass = stableClassName('cascading-submenu', 'empty');

  const statusDotColor =
    statusTone === 'selected'
      ? 'var(--prism-success-main)'
      : statusTone === 'opened'
        ? 'var(--prism-primary-main)'
        : 'var(--prism-divider)';

  return (
    <div
      ref={mergedRef}
      role="region"
      aria-label={title}
      aria-disabled={disabled ? 'true' : undefined}
      {...rest}
      {...merged}
    >
      {/* Header & Polite Live Status Strip */}
      <div className={cx(headerClass, 'flex flex-wrap items-center justify-between gap-2.5 min-w-0')}>
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <Layers
            aria-hidden="true"
            className="w-4 h-4 shrink-0"
            style={{
              color: disabled ? 'var(--prism-text-disabled)' : 'var(--prism-primary-main)',
            }}
          />
          <span
            className="text-sm font-semibold tracking-tight truncate"
            style={{
              color: disabled ? 'var(--prism-text-disabled)' : 'var(--prism-text-primary)',
            }}
          >
            {title}
          </span>
          {!isEmpty ? (
            <span
              data-testid="cascading-submenu-depth-badge"
              className="prism-crystal px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0 tabular-nums"
              style={{ color: 'var(--prism-text-secondary)' }}
            >
              Level {columns.length} · {clampedHoverDelayMs}ms
            </span>
          ) : null}
        </div>

        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          data-testid="cascading-submenu-status"
          className={cx(
            statusClass,
            'prism-well inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium min-w-0 max-w-full'
          )}
          style={{ color: 'var(--prism-text-secondary)' }}
        >
          <span
            aria-hidden="true"
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: statusDotColor }}
          />
          <span className="truncate">{statusAnnouncement}</span>
        </div>
      </div>

      {/* Responsive Side-by-Side Cascading Menu Panes */}
      {isEmpty ? (
        <div
          role="status"
          data-testid="cascading-submenu-empty"
          className={cx(
            emptyClass,
            'prism-well rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-1.5 min-w-0 max-w-full'
          )}
        >
          <span
            className="text-sm font-semibold"
            style={{ color: 'var(--prism-text-primary)' }}
          >
            No menu items available
          </span>
          <span className="text-xs" style={{ color: 'var(--prism-text-secondary)' }}>
            Provide one or more menu entries to populate the cascading panes.
          </span>
        </div>
      ) : (
        <div
          data-testid="cascading-submenu-panes"
          className={cx(
            panesClass,
            'prism-well rounded-2xl p-2 w-full max-w-full min-w-0 overflow-x-auto'
          )}
        >
          <div className="flex items-stretch gap-2 w-max min-w-full">
            {columns.map((column) => {
              const columnId =
                column.depth === 0
                  ? `${instanceId}-col-0-root`
                  : `${instanceId}-col-${column.depth}-${column.parentId}`;

              return (
                <div
                  key={column.key}
                  ref={(node) => registerColumnNode(column.depth, node)}
                  id={columnId}
                  role="menu"
                  aria-label={column.parentLabel}
                  data-depth={String(column.depth)}
                  data-testid={`cascading-submenu-column-${column.depth}`}
                  onMouseEnter={() => handleColumnMouseEnter(column.depth)}
                  className={cx(
                    columnClass,
                    'prism-crystal rounded-xl p-1.5 min-w-[13.5rem] w-[14.5rem] shrink-0 flex flex-col gap-0.5'
                  )}
                >
                  <div
                    aria-hidden="true"
                    className="px-2.5 py-1 mb-0.5 text-[11px] font-semibold uppercase tracking-wider truncate"
                    style={{
                      color: 'var(--prism-text-secondary)',
                      borderBottom: '1px solid var(--prism-divider)',
                    }}
                  >
                    Level {column.depth + 1} · {column.parentLabel}
                  </div>

                  {column.items.map((item) => {
                    const hasChildren = hasChildItems(item);
                    const isItemDisabled = disabled || Boolean(item.disabled);
                    const isExpanded =
                      hasChildren && !isItemDisabled && effectiveOpenPath[column.depth] === item.id;
                    const fullPathKey = [...column.pathPrefix, item.id].join('\0');
                    const isSelected = !hasChildren && lastSelectedKey === fullPathKey;
                    const childColumnId = `${instanceId}-col-${column.depth + 1}-${item.id}`;
                    const isRoving =
                      !isItemDisabled && column.depth === 0 && effectiveRovingRootId === item.id;

                    return (
                      <button
                        key={`${column.key}-${item.id}`}
                        ref={(node) => registerItemNode(column.depth, item.id, node)}
                        type="button"
                        role="menuitem"
                        disabled={isItemDisabled}
                        aria-disabled={isItemDisabled ? 'true' : undefined}
                        aria-haspopup={hasChildren ? 'menu' : undefined}
                        aria-expanded={hasChildren ? isExpanded : undefined}
                        aria-controls={hasChildren && isExpanded ? childColumnId : undefined}
                        tabIndex={isRoving ? 0 : -1}
                        data-active={isExpanded ? 'true' : undefined}
                        data-selected={isSelected ? 'true' : undefined}
                        data-checked={item.checked ? 'true' : undefined}
                        onMouseEnter={
                          isItemDisabled
                            ? undefined
                            : (event) => handleItemMouseEnter(event, column, item)
                        }
                        onMouseMove={
                          isItemDisabled
                            ? undefined
                            : (event) => handleItemMouseMove(event, column, item)
                        }
                        onClick={
                          isItemDisabled ? undefined : () => handleItemClick(column, item)
                        }
                        onKeyDown={
                          isItemDisabled
                            ? undefined
                            : (event) => handleItemKeyDown(event, column, item)
                        }
                        style={{
                          color: isItemDisabled
                            ? 'var(--prism-text-disabled)'
                            : 'var(--prism-text-primary)',
                          backgroundColor: isExpanded
                            ? 'color-mix(in srgb, var(--prism-primary-main) 14%, transparent)'
                            : isSelected
                              ? 'color-mix(in srgb, var(--prism-success-main) 12%, transparent)'
                              : undefined,
                        }}
                        className={cx(
                          itemClass,
                          'prism-focus-ring w-full min-w-0 px-2.5 py-1.5 rounded-lg flex items-center justify-between gap-2.5 text-left text-xs font-medium select-none transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed',
                          !isExpanded
                            ? 'enabled:hover:bg-[color-mix(in_srgb,var(--prism-secondary-main)_14%,transparent)]'
                            : undefined
                        )}
                      >
                        <span className="flex items-center gap-2 min-w-0 flex-1">
                          <span
                            aria-hidden="true"
                            className="w-3.5 h-3.5 shrink-0 inline-flex items-center justify-center"
                          >
                            {item.checked ? (
                              <Check
                                data-testid={`cascading-check-${item.id}`}
                                className="w-3.5 h-3.5"
                                style={{ color: 'var(--prism-success-main)' }}
                              />
                            ) : null}
                          </span>
                          <span className="truncate">{item.label}</span>
                        </span>

                        <span className="shrink-0 inline-flex items-center gap-1.5">
                          {item.shortcut ? (
                            <span
                              aria-hidden="true"
                              className="px-1.5 py-0.5 rounded font-mono text-[10px] leading-none tabular-nums"
                              style={{
                                color: 'var(--prism-text-secondary)',
                                border: '1px solid var(--prism-divider)',
                              }}
                            >
                              {item.shortcut}
                            </span>
                          ) : null}
                          {hasChildren ? (
                            <ChevronRight
                              aria-hidden="true"
                              className="w-3.5 h-3.5 shrink-0"
                              style={{
                                color: isExpanded
                                  ? 'var(--prism-primary-main)'
                                  : 'var(--prism-text-secondary)',
                              }}
                            />
                          ) : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

CascadingSubmenu.displayName = 'CascadingSubmenu';
