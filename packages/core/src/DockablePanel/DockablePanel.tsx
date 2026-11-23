'use client';

import {
  memo,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  PanelBottom,
  PanelLeft,
  PanelRight,
  PictureInPicture2,
  X,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { useMergedRefs } from '../hooks/useMergedRefs';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { themeProps } from '../utils/themeProps';

export type DockPosition = 'left' | 'right' | 'bottom' | 'center' | 'floating';

export interface FloatingCoords {
  x: number;
  y: number;
}

type DockablePanelBaseProps = Omit<BaseProps<HTMLElement>, 'children'>;

export interface DockablePanelProps extends DockablePanelBaseProps {
  /** Heading displayed in the frosted crystal titlebar and used for accessible labeling. */
  title: string;
  /** Optional subtitle displayed beneath the panel title. */
  subtitle?: string;
  /** Controlled dock zone or floating mode. */
  dockPosition?: DockPosition;
  /** Uncontrolled initial dock position (defaults to 'right'). */
  defaultDockPosition?: DockPosition;
  /** Callback invoked when the dock position changes via controls or edge-snap drag. */
  onDockPositionChange?: (position: DockPosition) => void;
  /** Controlled floating coordinates in pixels. */
  floatingPosition?: FloatingCoords;
  /** Uncontrolled initial floating coordinates (defaults to { x: 40, y: 40 }). */
  defaultFloatingPosition?: FloatingCoords;
  /** Callback invoked when floating coordinates update via pointer drag or keyboard move. */
  onFloatingPositionChange?: (pos: FloatingCoords) => void;
  /** Controlled collapsed state hiding the panel body. */
  collapsed?: boolean;
  /** Uncontrolled initial collapsed state (defaults to false). */
  defaultCollapsed?: boolean;
  /** Callback invoked when collapsed state toggles. */
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Optional close handler; renders a Close button in the titlebar when provided. */
  onClose?: () => void;
  /** Optional custom actions rendered inside the titlebar before dock controls. */
  headerActions?: ReactNode;
  /** Panel body content. */
  children: ReactNode;
  /** Enables snapping to left, right, or bottom dock zones when dragged near viewport edges (defaults to true). */
  edgeSnap?: boolean;
}

type EdgeSnapZone = 'left' | 'right' | 'bottom';

const DEFAULT_FLOATING_COORDS: FloatingCoords = { x: 40, y: 40 };
const EDGE_SNAP_THRESHOLD = 24;
const RIGHT_EDGE_FALLBACK_MARGIN = 96;
const BOTTOM_EDGE_FALLBACK_MARGIN = 72;
const KEYBOARD_STEP_PX = 16;

function getViewportBounds(): { maxX: number; maxY: number; width: number; height: number } {
  const width =
    typeof window !== 'undefined' && Number.isFinite(window.innerWidth) && window.innerWidth > 0
      ? window.innerWidth
      : 1024;
  const height =
    typeof window !== 'undefined' && Number.isFinite(window.innerHeight) && window.innerHeight > 0
      ? window.innerHeight
      : 768;
  return {
    maxX: Math.max(0, width - 64),
    maxY: Math.max(0, height - 48),
    width,
    height,
  };
}

function clampFloatingCoords(coords: FloatingCoords): FloatingCoords {
  const { maxX, maxY } = getViewportBounds();
  return {
    x: Math.round(clampNumber(coords.x, 0, maxX, 0)),
    y: Math.round(clampNumber(coords.y, 0, maxY, 0)),
  };
}

function detectEdgeSnap(
  coords: FloatingCoords,
  clientX: number,
  rectWidth: number,
  rectHeight: number
): EdgeSnapZone | null {
  const { width, height } = getViewportBounds();
  if (coords.x < EDGE_SNAP_THRESHOLD) {
    return 'left';
  }
  if (
    (rectWidth > 0 && coords.x + rectWidth >= width - EDGE_SNAP_THRESHOLD) ||
    coords.x >= width - RIGHT_EDGE_FALLBACK_MARGIN ||
    clientX >= width - EDGE_SNAP_THRESHOLD
  ) {
    return 'right';
  }
  if (
    (rectHeight > 0 && coords.y + rectHeight >= height - EDGE_SNAP_THRESHOLD) ||
    coords.y >= height - BOTTOM_EDGE_FALLBACK_MARGIN
  ) {
    return 'bottom';
  }
  return null;
}

function getDockLayoutClasses(position: DockPosition): string {
  switch (position) {
    case 'left':
      return 'w-[26rem] max-w-full rounded-r-[24px] rounded-l-none';
    case 'right':
      return 'w-[26rem] max-w-full rounded-l-[24px] rounded-r-none';
    case 'bottom':
      return 'w-full rounded-t-[24px] rounded-b-none';
    case 'center':
      return 'w-full';
    case 'floating':
      return 'fixed z-40 w-[26rem] max-w-[calc(100vw-2rem)] shadow-2xl';
  }
}

function DockablePanelInner({
  title,
  subtitle,
  dockPosition,
  defaultDockPosition = 'right',
  onDockPositionChange,
  floatingPosition,
  defaultFloatingPosition = DEFAULT_FLOATING_COORDS,
  onFloatingPositionChange,
  collapsed,
  defaultCollapsed = false,
  onCollapsedChange,
  onClose,
  headerActions,
  children,
  edgeSnap = true,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: DockablePanelProps) {
  const titleId = useId();
  const subtitleId = useId();
  const bodyId = useId();
  const override = useComponentOverride('DockablePanel');

  const panelRef = useRef<HTMLElement>(null);
  const mergedRef = useMergedRefs<HTMLElement>(panelRef, ref);
  const cleanupDragRef = useRef<(() => void) | null>(null);

  const [currentDock, setCurrentDock] = useControllableState<DockPosition>({
    value: dockPosition,
    defaultValue: defaultDockPosition,
    onChange: onDockPositionChange,
  });

  const [rawFloatingPos, setRawFloatingPos] = useControllableState<FloatingCoords>({
    value: floatingPosition,
    defaultValue: defaultFloatingPosition,
    onChange: onFloatingPositionChange,
  });

  const [isCollapsed, setIsCollapsed] = useControllableState<boolean>({
    value: collapsed,
    defaultValue: defaultCollapsed,
    onChange: onCollapsedChange,
  });

  const [isDragging, setIsDragging] = useState(false);
  const [snapPreview, setSnapPreview] = useState<EdgeSnapZone | null>(null);

  const isFloating = currentDock === 'floating';
  const safeFloatingPos = clampFloatingCoords(rawFloatingPos);

  const latestRef = useRef({
    edgeSnap,
    setCurrentDock,
    setRawFloatingPos,
  });
  latestRef.current = { edgeSnap, setCurrentDock, setRawFloatingPos };

  useEffect(() => {
    return () => {
      cleanupDragRef.current?.();
    };
  }, []);

  const handleHeaderPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!isFloating || event.button > 0) return;
      const target = event.target;
      if (target instanceof Element && target.closest('button, a, input, select, textarea')) {
        return;
      }

      event.preventDefault();
      cleanupDragRef.current?.();

      const startX = event.clientX;
      const startY = event.clientY;
      const originX = safeFloatingPos.x;
      const originY = safeFloatingPos.y;
      let hasMoved = false;
      let pendingSnap: EdgeSnapZone | null = null;

      setIsDragging(true);

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        if (dx !== 0 || dy !== 0) {
          hasMoved = true;
        }
        const nextCoords = clampFloatingCoords({ x: originX + dx, y: originY + dy });
        latestRef.current.setRawFloatingPos(nextCoords);

        if (latestRef.current.edgeSnap && hasMoved) {
          const rect = panelRef.current?.getBoundingClientRect();
          const detected = detectEdgeSnap(
            nextCoords,
            moveEvent.clientX,
            rect ? rect.width : 0,
            rect ? rect.height : 0
          );
          pendingSnap = detected;
          setSnapPreview(detected);
        } else {
          pendingSnap = null;
          setSnapPreview(null);
        }
      };

      const cleanup = () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
        window.removeEventListener('pointercancel', handlePointerCancel);
        cleanupDragRef.current = null;
      };

      const handlePointerUp = () => {
        cleanup();
        setIsDragging(false);
        setSnapPreview(null);
        if (latestRef.current.edgeSnap && hasMoved && pendingSnap) {
          latestRef.current.setCurrentDock(pendingSnap);
        }
      };

      const handlePointerCancel = () => {
        cleanup();
        setIsDragging(false);
        setSnapPreview(null);
      };

      cleanupDragRef.current = cleanup;
      window.addEventListener('pointermove', handlePointerMove, { passive: true });
      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('pointercancel', handlePointerCancel);
    },
    [isFloating, safeFloatingPos.x, safeFloatingPos.y]
  );

  const handleDragHandleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (!isFloating || event.nativeEvent.isComposing) return;

      let nextX = safeFloatingPos.x;
      let nextY = safeFloatingPos.y;

      if (event.key === 'ArrowLeft') {
        nextX -= KEYBOARD_STEP_PX;
      } else if (event.key === 'ArrowRight') {
        nextX += KEYBOARD_STEP_PX;
      } else if (event.key === 'ArrowUp') {
        nextY -= KEYBOARD_STEP_PX;
      } else if (event.key === 'ArrowDown') {
        nextY += KEYBOARD_STEP_PX;
      } else {
        return;
      }

      event.preventDefault();
      setRawFloatingPos(clampFloatingCoords({ x: nextX, y: nextY }));
    },
    [isFloating, safeFloatingPos.x, safeFloatingPos.y, setRawFloatingPos]
  );

  const merged = mergeProps({
    themeTarget: themeProps('dockable-panel', {
      dockPosition: currentDock,
      collapsed: isCollapsed,
      floating: isFloating,
      dragging: isDragging,
      snapPreview: snapPreview ?? undefined,
    }),
    baseClassName: cx(
      'prism-slab flex flex-col overflow-hidden transition-shadow duration-150',
      getDockLayoutClasses(currentDock)
    ),
    overrideClassName: override?.className,
    userClassName: className,
    baseStyle: isFloating
      ? { left: `${safeFloatingPos.x}px`, top: `${safeFloatingPos.y}px` }
      : undefined,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('dockable-panel', 'header');
  const bodyClass = stableClassName('dockable-panel', 'body');

  const dockZones: ReadonlyArray<{
    zone: DockPosition;
    label: string;
    icon: ReactNode;
  }> = [
    { zone: 'left', label: 'Dock left', icon: <PanelLeft className="w-3.5 h-3.5" aria-hidden="true" /> },
    { zone: 'bottom', label: 'Dock bottom', icon: <PanelBottom className="w-3.5 h-3.5" aria-hidden="true" /> },
    { zone: 'right', label: 'Dock right', icon: <PanelRight className="w-3.5 h-3.5" aria-hidden="true" /> },
    {
      zone: 'floating',
      label: 'Float panel',
      icon: <PictureInPicture2 className="w-3.5 h-3.5" aria-hidden="true" />,
    },
  ];

  return (
    <section
      ref={mergedRef}
      aria-labelledby={titleId}
      aria-describedby={subtitle ? subtitleId : undefined}
      {...rest}
      {...merged}
    >
      <header
        onPointerDown={handleHeaderPointerDown}
        className={cx(
          headerClass,
          'prism-crystal px-3.5 py-2.5 flex items-center justify-between gap-2 select-none border-b border-[var(--prism-divider)]',
          isFloating ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          {isFloating ? (
            <div
              role="button"
              tabIndex={0}
              aria-label="Move floating panel"
              aria-roledescription="draggable handle"
              onKeyDown={handleDragHandleKeyDown}
              className="prism-focus-ring shrink-0 p-1 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-white/55 dark:hover:bg-white/10 cursor-grab active:cursor-grabbing"
            >
              <GripVertical className="w-4 h-4" aria-hidden="true" />
            </div>
          ) : null}
          <div className="min-w-0">
            <h3
              id={titleId}
              className="text-sm font-semibold tracking-[-0.01em] text-slate-900 dark:text-white truncate"
            >
              {title}
            </h3>
            {subtitle ? (
              <p id={subtitleId} className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {headerActions ? (
            <div className="flex items-center gap-1 shrink-0">{headerActions}</div>
          ) : null}

          <div
            role="group"
            aria-label="Dock position controls"
            className="inline-flex items-center gap-0.5 rounded-xl bg-white/45 dark:bg-slate-900/40 p-0.5 border border-[var(--prism-divider)]"
          >
            {dockZones.map((item) => {
              const active = currentDock === item.zone;
              return (
                <button
                  key={item.zone}
                  type="button"
                  aria-label={item.label}
                  aria-pressed={active}
                  title={item.label}
                  onClick={() => setCurrentDock(item.zone)}
                    className={cx(
                      'prism-focus-ring p-1 rounded-lg cursor-pointer disabled:cursor-not-allowed transition-[color,background-color,border-color,opacity,transform]',
                      active
                        ? 'prism-btn-primary text-white'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-white/65 dark:hover:bg-white/10'
                    )}
                  >
                    <span className="relative z-10 block">{item.icon}</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              aria-expanded={!isCollapsed}
              aria-controls={bodyId}
              aria-label={isCollapsed ? 'Expand panel' : 'Collapse panel'}
              title={isCollapsed ? 'Expand panel' : 'Collapse panel'}
              onClick={() => setIsCollapsed((prev) => !prev)}
              className="prism-focus-ring p-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-white/10 cursor-pointer disabled:cursor-not-allowed"
            >
              {isCollapsed ? (
                <ChevronDown className="w-4 h-4" aria-hidden="true" />
              ) : (
                <ChevronUp className="w-4 h-4" aria-hidden="true" />
              )}
            </button>

            {onClose ? (
              <button
                type="button"
                aria-label="Close panel"
                title="Close panel"
                onClick={onClose}
                className="prism-focus-ring p-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-white/10 cursor-pointer disabled:cursor-not-allowed"
              >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </header>

      {snapPreview ? (
        <div
          role="status"
          aria-live="polite"
          className="px-3.5 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 bg-white/45 dark:bg-slate-900/40 border-b border-[var(--prism-divider)]"
        >
          Release to dock {snapPreview}
        </div>
      ) : null}

      {!isCollapsed ? (
        <div
          id={bodyId}
          className={cx(
            bodyClass,
            'p-4 text-sm text-slate-700 dark:text-slate-200 overflow-auto flex-1 min-h-0'
          )}
        >
          {children}
        </div>
      ) : null}
    </section>
  );
}

export const DockablePanel = memo(DockablePanelInner);
DockablePanel.displayName = 'DockablePanel';
