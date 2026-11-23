'use client';

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { Grid3x3, Maximize2, RotateCcw } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { createCoalescedPointerMove } from '../hooks/useRafCallback';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { STYLE_BG_ERROR, STYLE_BG_SUCCESS, STYLE_BG_WARNING, STYLE_PRIMARY_MAIN, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export type WindowResizeEdge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export interface WindowFrameRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

type WindowResizeFrameBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface WindowResizeFrameProps extends WindowResizeFrameBaseProps {
  /** Window header title displayed in the telemetry bar and window chrome (defaults to `'Optical Viewport Window'`). */
  title?: string;
  /** Controlled window frame geometry `{ x, y, width, height }` in pixels. */
  rect?: WindowFrameRect;
  /** Initial uncontrolled window frame geometry (defaults to `{ x: 64, y: 48, width: 360, height: 220 }`). */
  defaultRect?: WindowFrameRect;
  /** Minimum allowable window width in pixels (defaults to `180`). */
  minWidth?: number;
  /** Minimum allowable window height in pixels (defaults to `120`). */
  minHeight?: number;
  /** Maximum allowable window width in pixels (defaults to `560`). */
  maxWidth?: number;
  /** Maximum allowable window height in pixels (defaults to `340`). */
  maxHeight?: number;
  /** Snap grid increment in pixels; `0` disables snapping (defaults to `16`). */
  snapGridPx?: number;
  /** Callback invoked when a pointer resize commits on `pointerup`, via keyboard resizing, or on Reset Frame. */
  onResizeCommit?: (rect: WindowFrameRect, edge: WindowResizeEdge) => void;
  /** Disables all directional resize handles, grid snap toggling, and reset controls. */
  disabled?: boolean;
}

interface SanitizedBounds {
  minWidth: number;
  minHeight: number;
  maxWidth: number;
  maxHeight: number;
  stageWidth: number;
  stageHeight: number;
}

interface GhostResizeState {
  edge: WindowResizeEdge;
  rect: WindowFrameRect;
  snapped: boolean;
}

interface ResizeHandleSpec {
  readonly edge: WindowResizeEdge;
  readonly ariaLabel: string;
  readonly shortLabel: string;
  readonly isCorner: boolean;
  readonly isHorizontalEdge: boolean;
  readonly positionClass: string;
  readonly cursorClass: string;
  readonly allowsHorizontal: boolean;
  readonly allowsVertical: boolean;
}

const DEFAULT_TITLE = 'Optical Viewport Window';
const DEFAULT_MIN_WIDTH = 180;
const DEFAULT_MIN_HEIGHT = 120;
const DEFAULT_MAX_WIDTH = 560;
const DEFAULT_MAX_HEIGHT = 340;
const ABSOLUTE_MIN_WIDTH = 80;
const ABSOLUTE_MIN_HEIGHT = 64;
const ABSOLUTE_MAX_WIDTH = 960;
const ABSOLUTE_MAX_HEIGHT = 640;
const DEFAULT_SNAP_GRID_PX = 16;
const MAX_SNAP_GRID_PX = 64;
const DEFAULT_KEYBOARD_STEP_PX = 16;
const FINE_KEYBOARD_STEP_PX = 4;
const STAGE_PADDING_PX = 32;
const MIN_STAGE_WIDTH = 320;
const MIN_STAGE_HEIGHT = 240;

const DEFAULT_RECT: WindowFrameRect = {
  x: 64,
  y: 48,
  width: 360,
  height: 220,
};

const RESIZE_HANDLES: ReadonlyArray<ResizeHandleSpec> = [
  {
    edge: 'n',
    ariaLabel: 'Resize North edge',
    shortLabel: 'North edge',
    isCorner: false,
    isHorizontalEdge: true,
    positionClass: '-top-2 left-4 right-4 h-4',
    cursorClass: 'cursor-ns-resize',
    allowsHorizontal: false,
    allowsVertical: true,
  },
  {
    edge: 's',
    ariaLabel: 'Resize South edge',
    shortLabel: 'South edge',
    isCorner: false,
    isHorizontalEdge: true,
    positionClass: '-bottom-2 left-4 right-4 h-4',
    cursorClass: 'cursor-ns-resize',
    allowsHorizontal: false,
    allowsVertical: true,
  },
  {
    edge: 'e',
    ariaLabel: 'Resize East edge',
    shortLabel: 'East edge',
    isCorner: false,
    isHorizontalEdge: false,
    positionClass: 'top-4 bottom-4 -right-2 w-4',
    cursorClass: 'cursor-ew-resize',
    allowsHorizontal: true,
    allowsVertical: false,
  },
  {
    edge: 'w',
    ariaLabel: 'Resize West edge',
    shortLabel: 'West edge',
    isCorner: false,
    isHorizontalEdge: false,
    positionClass: 'top-4 bottom-4 -left-2 w-4',
    cursorClass: 'cursor-ew-resize',
    allowsHorizontal: true,
    allowsVertical: false,
  },
  {
    edge: 'nw',
    ariaLabel: 'Resize North-West corner',
    shortLabel: 'North-West corner',
    isCorner: true,
    isHorizontalEdge: false,
    positionClass: '-top-2.5 -left-2.5 w-5 h-5',
    cursorClass: 'cursor-nwse-resize',
    allowsHorizontal: true,
    allowsVertical: true,
  },
  {
    edge: 'ne',
    ariaLabel: 'Resize North-East corner',
    shortLabel: 'North-East corner',
    isCorner: true,
    isHorizontalEdge: false,
    positionClass: '-top-2.5 -right-2.5 w-5 h-5',
    cursorClass: 'cursor-nesw-resize',
    allowsHorizontal: true,
    allowsVertical: true,
  },
  {
    edge: 'se',
    ariaLabel: 'Resize South-East corner',
    shortLabel: 'South-East corner',
    isCorner: true,
    isHorizontalEdge: false,
    positionClass: '-bottom-2.5 -right-2.5 w-5 h-5',
    cursorClass: 'cursor-nwse-resize',
    allowsHorizontal: true,
    allowsVertical: true,
  },
  {
    edge: 'sw',
    ariaLabel: 'Resize South-West corner',
    shortLabel: 'South-West corner',
    isCorner: true,
    isHorizontalEdge: false,
    positionClass: '-bottom-2.5 -left-2.5 w-5 h-5',
    cursorClass: 'cursor-nesw-resize',
    allowsHorizontal: true,
    allowsVertical: true,
  },
];

function sanitizeBounds(
  minWidth: number,
  minHeight: number,
  maxWidth: number,
  maxHeight: number
): SanitizedBounds {
  const rawMinW = Math.round(
    clampNumber(minWidth, ABSOLUTE_MIN_WIDTH, ABSOLUTE_MAX_WIDTH, DEFAULT_MIN_WIDTH)
  );
  const rawMaxW = Math.round(
    clampNumber(maxWidth, ABSOLUTE_MIN_WIDTH, ABSOLUTE_MAX_WIDTH, DEFAULT_MAX_WIDTH)
  );
  const safeMinWidth = Math.min(rawMinW, rawMaxW);
  const safeMaxWidth = Math.max(rawMinW, rawMaxW);

  const rawMinH = Math.round(
    clampNumber(minHeight, ABSOLUTE_MIN_HEIGHT, ABSOLUTE_MAX_HEIGHT, DEFAULT_MIN_HEIGHT)
  );
  const rawMaxH = Math.round(
    clampNumber(maxHeight, ABSOLUTE_MIN_HEIGHT, ABSOLUTE_MAX_HEIGHT, DEFAULT_MAX_HEIGHT)
  );
  const safeMinHeight = Math.min(rawMinH, rawMaxH);
  const safeMaxHeight = Math.max(rawMinH, rawMaxH);

  return {
    minWidth: safeMinWidth,
    minHeight: safeMinHeight,
    maxWidth: safeMaxWidth,
    maxHeight: safeMaxHeight,
    stageWidth: Math.max(MIN_STAGE_WIDTH, safeMaxWidth + STAGE_PADDING_PX * 2),
    stageHeight: Math.max(MIN_STAGE_HEIGHT, safeMaxHeight + STAGE_PADDING_PX * 2),
  };
}

function sanitizeSnapGridPx(raw: number): number {
  if (!Number.isFinite(raw)) {
    return DEFAULT_SNAP_GRID_PX;
  }
  if (raw <= 0) {
    return 0;
  }
  return Math.round(clampNumber(raw, 1, MAX_SNAP_GRID_PX, DEFAULT_SNAP_GRID_PX));
}

function sanitizeRect(
  raw: WindowFrameRect | undefined,
  bounds: SanitizedBounds
): WindowFrameRect {
  const source = raw ?? DEFAULT_RECT;
  const fallbackWidth = clampNumber(
    DEFAULT_RECT.width,
    bounds.minWidth,
    bounds.maxWidth,
    bounds.minWidth
  );
  const fallbackHeight = clampNumber(
    DEFAULT_RECT.height,
    bounds.minHeight,
    bounds.maxHeight,
    bounds.minHeight
  );
  const width = Math.round(
    clampNumber(source.width, bounds.minWidth, bounds.maxWidth, fallbackWidth)
  );
  const height = Math.round(
    clampNumber(source.height, bounds.minHeight, bounds.maxHeight, fallbackHeight)
  );
  const maxX = Math.max(0, bounds.stageWidth - width);
  const maxY = Math.max(0, bounds.stageHeight - height);
  const x = Math.round(clampNumber(source.x, 0, maxX, Math.min(DEFAULT_RECT.x, maxX)));
  const y = Math.round(clampNumber(source.y, 0, maxY, Math.min(DEFAULT_RECT.y, maxY)));
  return { x, y, width, height };
}

function snapLength(value: number, snapPx: number): number {
  if (snapPx <= 0) {
    return Math.round(value);
  }
  return Math.round(value / snapPx) * snapPx;
}

function computeResizedRect(
  startRect: WindowFrameRect,
  edge: WindowResizeEdge,
  dx: number,
  dy: number,
  bounds: SanitizedBounds,
  snapPx: number
): WindowFrameRect {
  const left = startRect.x;
  const top = startRect.y;
  const right = startRect.x + startRect.width;
  const bottom = startRect.y + startRect.height;

  const movesEast = edge === 'e' || edge === 'ne' || edge === 'se';
  const movesWest = edge === 'w' || edge === 'nw' || edge === 'sw';
  const movesSouth = edge === 's' || edge === 'se' || edge === 'sw';
  const movesNorth = edge === 'n' || edge === 'ne' || edge === 'nw';

  let nextX = left;
  let nextWidth = startRect.width;

  if (movesEast) {
    const maxAllowedWidth = Math.min(bounds.maxWidth, bounds.stageWidth - left);
    const candidate = snapLength(startRect.width + dx, snapPx);
    nextWidth = Math.round(
      clampNumber(candidate, bounds.minWidth, maxAllowedWidth, startRect.width)
    );
  } else if (movesWest) {
    const maxAllowedWidth = Math.min(bounds.maxWidth, right);
    const candidate = snapLength(startRect.width - dx, snapPx);
    nextWidth = Math.round(
      clampNumber(candidate, bounds.minWidth, maxAllowedWidth, startRect.width)
    );
    nextX = right - nextWidth;
  }

  let nextY = top;
  let nextHeight = startRect.height;

  if (movesSouth) {
    const maxAllowedHeight = Math.min(bounds.maxHeight, bounds.stageHeight - top);
    const candidate = snapLength(startRect.height + dy, snapPx);
    nextHeight = Math.round(
      clampNumber(candidate, bounds.minHeight, maxAllowedHeight, startRect.height)
    );
  } else if (movesNorth) {
    const maxAllowedHeight = Math.min(bounds.maxHeight, bottom);
    const candidate = snapLength(startRect.height - dy, snapPx);
    nextHeight = Math.round(
      clampNumber(candidate, bounds.minHeight, maxAllowedHeight, startRect.height)
    );
    nextY = bottom - nextHeight;
  }

  return {
    x: nextX,
    y: nextY,
    width: nextWidth,
    height: nextHeight,
  };
}

const telemetryClass = /*#__PURE__*/ stableClassName('window-resize-frame', 'telemetry');
const scrollerClass = /*#__PURE__*/ stableClassName('window-resize-frame', 'scroller');
const stageClass = /*#__PURE__*/ stableClassName('window-resize-frame', 'stage');
const windowClass = /*#__PURE__*/ stableClassName('window-resize-frame', 'window');
const ghostClass = /*#__PURE__*/ stableClassName('window-resize-frame', 'ghost');
const handleClass = /*#__PURE__*/ stableClassName('window-resize-frame', 'handle');
const statusClass = /*#__PURE__*/ stableClassName('window-resize-frame', 'status');

function WindowResizeFrameInner({
  title = DEFAULT_TITLE,
  rect,
  defaultRect,
  minWidth = DEFAULT_MIN_WIDTH,
  minHeight = DEFAULT_MIN_HEIGHT,
  maxWidth = DEFAULT_MAX_WIDTH,
  maxHeight = DEFAULT_MAX_HEIGHT,
  snapGridPx = DEFAULT_SNAP_GRID_PX,
  onResizeCommit,
  disabled = false,
  className,
  style,
  xstyle,
  'aria-label': nativeAriaLabel,
  ref,
  ...rest
}: WindowResizeFrameProps) {
  const override = useComponentOverride('WindowResizeFrame');
  const headingId = useId();

  const bounds = useMemo<SanitizedBounds>(
    () => sanitizeBounds(minWidth, minHeight, maxWidth, maxHeight),
    [minWidth, minHeight, maxWidth, maxHeight]
  );
  const safeSnapGridPx = useMemo(() => sanitizeSnapGridPx(snapGridPx), [snapGridPx]);
  const baselineRect = useMemo<WindowFrameRect>(
    () => sanitizeRect(defaultRect, bounds),
    [defaultRect, bounds]
  );

  const isControlled = rect !== undefined;
  const [uncontrolledRect, setUncontrolledRect] = useState<WindowFrameRect>(() => baselineRect);
  const [snapEnabled, setSnapEnabled] = useState<boolean>(true);
  const [ghostState, setGhostState] = useState<GhostResizeState | null>(null);
  const [announcement, setAnnouncement] = useState<string>('');

  const cleanupDragRef = useRef<(() => void) | null>(null);

  const committedRect = useMemo<WindowFrameRect>(
    () => sanitizeRect(isControlled ? rect : uncontrolledRect, bounds),
    [bounds, isControlled, rect, uncontrolledRect]
  );

  const isSnapActive = safeSnapGridPx > 0 && snapEnabled;
  const activeSnapPx = isSnapActive ? safeSnapGridPx : 0;
  const resolvedTitle = title.trim() || DEFAULT_TITLE;
  const resolvedAriaLabel = nativeAriaLabel?.trim() || undefined;

  const liveRef = useRef({
    bounds,
    committedRect,
    isControlled,
    activeSnapPx,
    safeSnapGridPx,
    onResizeCommit,
  });
  liveRef.current = {
    bounds,
    committedRect,
    isControlled,
    activeSnapPx,
    safeSnapGridPx,
    onResizeCommit,
  };

  useEffect(() => {
    if (disabled && cleanupDragRef.current) {
      cleanupDragRef.current();
      setGhostState(null);
    }
  }, [disabled]);

  useEffect(() => {
    return () => {
      cleanupDragRef.current?.();
    };
  }, []);

  const commitRect = useCallback(
    (nextRect: WindowFrameRect, spec: ResizeHandleSpec, snapped: boolean) => {
      const sanitized = sanitizeRect(nextRect, liveRef.current.bounds);
      if (!liveRef.current.isControlled) {
        setUncontrolledRect(sanitized);
      }
      const alignmentLabel = snapped
        ? `Snapped ${liveRef.current.safeSnapGridPx}px`
        : 'Free alignment';
      setAnnouncement(
        `Resized ${spec.shortLabel} to ${sanitized.width} × ${sanitized.height} px · ${alignmentLabel}`
      );
      liveRef.current.onResizeCommit?.(sanitized, spec.edge);
    },
    []
  );

  const startEdgeDrag = useCallback(
    (spec: ResizeHandleSpec, event: ReactPointerEvent<HTMLButtonElement>) => {
      if (disabled || event.button > 0) {
        return;
      }
      event.preventDefault();
      cleanupDragRef.current?.();

      const pointerId = event.pointerId;
      const startClientX = event.clientX;
      const startClientY = event.clientY;
      const startRect = liveRef.current.committedRect;
      const activeBounds = liveRef.current.bounds;
      const dragSnapPx = liveRef.current.activeSnapPx;
      const isSnapped = dragSnapPx > 0;

      let latestRect = startRect;
      let hasMoved = false;

      setGhostState({
        edge: spec.edge,
        rect: startRect,
        snapped: isSnapped,
      });

      const cleanup = () => {
        handleWindowPointerMove.cancel();
        window.removeEventListener('pointermove', handleWindowPointerMove);
        window.removeEventListener('pointerup', handleWindowPointerUp);
        window.removeEventListener('pointercancel', handleWindowPointerCancel);
        window.removeEventListener('keydown', handleWindowKeyDown);
        cleanupDragRef.current = null;
      };

      const handleWindowPointerMove = createCoalescedPointerMove((moveEvent: PointerEvent) => {
        if (moveEvent.pointerId !== pointerId) {
          return;
        }
        const dx = moveEvent.clientX - startClientX;
        const dy = moveEvent.clientY - startClientY;
        if (dx !== 0 || dy !== 0) {
          hasMoved = true;
        }
        const nextRect = computeResizedRect(
          startRect,
          spec.edge,
          dx,
          dy,
          activeBounds,
          dragSnapPx
        );
        latestRect = nextRect;
        setGhostState({
          edge: spec.edge,
          rect: nextRect,
          snapped: isSnapped,
        });
      });

      const handleWindowPointerUp = (upEvent: PointerEvent) => {
        if (upEvent.pointerId !== pointerId) {
          return;
        }
        cleanup();
        setGhostState(null);
        if (hasMoved) {
          commitRect(latestRect, spec, isSnapped);
        }
      };

      const handleWindowPointerCancel = (cancelEvent: PointerEvent) => {
        if (cancelEvent.pointerId !== pointerId) {
          return;
        }
        cleanup();
        setGhostState(null);
        setAnnouncement(
          `Resize cancelled · Frame remains ${startRect.width} × ${startRect.height} px`
        );
      };

      const handleWindowKeyDown = (keyEvent: KeyboardEvent) => {
        if (keyEvent.isComposing) {
          return;
        }
        if (keyEvent.key === 'Escape') {
          keyEvent.preventDefault();
          cleanup();
          setGhostState(null);
          setAnnouncement(
            `Resize cancelled · Frame remains ${startRect.width} × ${startRect.height} px`
          );
        }
      };

      cleanupDragRef.current = cleanup;
      window.addEventListener('pointermove', handleWindowPointerMove, { passive: true });
      window.addEventListener('pointerup', handleWindowPointerUp);
      window.addEventListener('pointercancel', handleWindowPointerCancel);
      window.addEventListener('keydown', handleWindowKeyDown);
    },
    [commitRect, disabled]
  );

  const handleEdgeKeyDown = useCallback(
    (spec: ResizeHandleSpec, event: ReactKeyboardEvent<HTMLButtonElement>) => {
      if (disabled || event.nativeEvent.isComposing) {
        return;
      }

      const useFineStep = event.shiftKey;
      const step = useFineStep
        ? FINE_KEYBOARD_STEP_PX
        : isSnapActive
          ? safeSnapGridPx
          : DEFAULT_KEYBOARD_STEP_PX;

      let dx = 0;
      let dy = 0;

      if (spec.allowsHorizontal && event.key === 'ArrowLeft') {
        dx = -step;
      } else if (spec.allowsHorizontal && event.key === 'ArrowRight') {
        dx = step;
      } else if (spec.allowsVertical && event.key === 'ArrowUp') {
        dy = -step;
      } else if (spec.allowsVertical && event.key === 'ArrowDown') {
        dy = step;
      } else {
        return;
      }

      event.preventDefault();
      const effectiveSnapPx = !useFineStep && isSnapActive ? safeSnapGridPx : 0;
      const nextRect = computeResizedRect(
        committedRect,
        spec.edge,
        dx,
        dy,
        bounds,
        effectiveSnapPx
      );
      commitRect(nextRect, spec, effectiveSnapPx > 0);
    },
    [bounds, commitRect, committedRect, disabled, isSnapActive, safeSnapGridPx]
  );

  const handleToggleSnap = useCallback(() => {
    const nextEnabled = !snapEnabled;
    setSnapEnabled(nextEnabled);
    setAnnouncement(
      nextEnabled
        ? `Grid snap enabled (${safeSnapGridPx}px) · Frame ${committedRect.width} × ${committedRect.height} px`
        : `Grid snap disabled · Frame ${committedRect.width} × ${committedRect.height} px`
    );
  }, [committedRect.height, committedRect.width, safeSnapGridPx, snapEnabled]);

  const handleResetFrame = useCallback(() => {
    cleanupDragRef.current?.();
    setGhostState(null);
    if (!isControlled) {
      setUncontrolledRect(baselineRect);
    }
    setAnnouncement(
      `Frame reset to ${baselineRect.width} × ${baselineRect.height} px · ${
        isSnapActive ? `Snap ${safeSnapGridPx}px` : 'Free alignment'
      }`
    );
    onResizeCommit?.(baselineRect, 'se');
  }, [baselineRect, isControlled, isSnapActive, onResizeCommit, safeSnapGridPx]);

  const activeDisplayRect = ghostState ? ghostState.rect : committedRect;

  const merged = mergeProps({
    themeTarget: themeProps('window-resize-frame', {
      resizing: ghostState !== null,
      activeEdge: ghostState?.edge,
      snap: isSnapActive,
      disabled,
    }),
    baseClassName:
      'prism-slab relative flex flex-col gap-3.5 p-4 sm:p-5 w-full max-w-full min-w-0 select-none',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });


  const defaultStatusSummary = `Frame ${activeDisplayRect.width} × ${activeDisplayRect.height} px · Origin (${activeDisplayRect.x}, ${activeDisplayRect.y}) · ${
    isSnapActive ? `Snap ${safeSnapGridPx}px` : 'Free alignment'
  }`;

  return (
    <div
      ref={ref}
      role="region"
      aria-label={resolvedAriaLabel}
      aria-labelledby={resolvedAriaLabel ? undefined : headingId}
      {...rest}
      {...merged}
    >
      {/* Top Telemetry Bar */}
      <div
        data-part="telemetry"
        className={cx(
          telemetryClass,
          'flex flex-wrap items-center justify-between gap-2.5 min-w-0 max-w-full'
        )}
      >
        <div className="flex flex-wrap items-center gap-2 min-w-0 max-w-full">
          <span
            aria-hidden="true"
            className="prism-crystal w-8 h-8 rounded-xl inline-flex items-center justify-center shrink-0"
            style={{
              color: disabled
                ? 'var(--prism-text-disabled)'
                : 'var(--prism-primary-main)',
            }}
          >
            <Maximize2 className="w-4 h-4" />
          </span>

          <h2
            id={headingId}
            className="text-sm font-semibold tracking-[-0.01em] truncate"
            style={STYLE_TEXT_PRIMARY}
          >
            {resolvedTitle}
          </h2>

          <span
            data-testid="resize-dimension-badge"
            className="prism-crystal px-2.5 py-1 rounded-full text-xs font-mono font-semibold tabular-nums shrink-0"
            style={{
              color: ghostState
                ? 'var(--prism-primary-main)'
                : 'var(--prism-text-primary)',
            }}
          >
            {activeDisplayRect.width} × {activeDisplayRect.height} px
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 min-w-0 max-w-full">
          <button
            type="button"
            disabled={disabled || safeSnapGridPx === 0}
            aria-pressed={isSnapActive}
            data-testid="resize-snap-toggle"
            onClick={handleToggleSnap}
            className={cx(
              'prism-focus-ring h-8 px-3 rounded-full border inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
              isSnapActive ? 'prism-crystal' : 'prism-well'
            )}
            style={{
              color: isSnapActive
                ? 'var(--prism-primary-main)'
                : 'var(--prism-text-secondary)',
              borderColor: isSnapActive
                ? 'color-mix(in srgb, var(--prism-primary-main) 42%, var(--prism-divider))'
                : 'var(--prism-divider)',
            }}
          >
            <Grid3x3 aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
            <span>
              {safeSnapGridPx > 0 ? `Grid Snap (${safeSnapGridPx}px)` : 'Grid Snap (Off)'}
            </span>
          </button>

          <button
            type="button"
            disabled={disabled}
            data-testid="resize-reset-button"
            onClick={handleResetFrame}
            className="prism-btn-secondary prism-focus-ring h-8 px-3 inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCcw aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
            <span>Reset Frame</span>
          </button>
        </div>
      </div>

      {/* Responsive Scrollable Bounded Optical Stage */}
      <div
        data-testid="resize-stage-scroller"
        className={cx(
          scrollerClass,
          'prism-well rounded-2xl w-full max-w-full min-w-0 overflow-x-auto p-3'
        )}
      >
        <div
          data-testid="resize-stage"
          className={cx(stageClass, 'relative rounded-xl border overflow-hidden shrink-0')}
          style={{
            width: `${bounds.stageWidth}px`,
            height: `${bounds.stageHeight}px`,
            borderColor: 'var(--prism-divider)',
            backgroundColor: 'color-mix(in srgb, var(--prism-bg-start) 65%, transparent)',
            backgroundImage: isSnapActive
              ? 'linear-gradient(to right, var(--prism-divider) 1px, transparent 1px), linear-gradient(to bottom, var(--prism-divider) 1px, transparent 1px)'
              : 'radial-gradient(circle at 24% 22%, color-mix(in srgb, var(--prism-secondary-main) 12%, transparent), transparent 62%)',
            backgroundSize: isSnapActive
              ? `${safeSnapGridPx}px ${safeSnapGridPx}px`
              : '100% 100%',
          }}
        >
          {/* Active Optical Glass Window */}
          <div
            data-testid="resize-window-frame"
            data-x={String(committedRect.x)}
            data-y={String(committedRect.y)}
            data-width={String(committedRect.width)}
            data-height={String(committedRect.height)}
            className={cx(
              windowClass,
              'prism-crystal absolute z-10 rounded-2xl flex flex-col transition-opacity',
              disabled && 'opacity-70'
            )}
            style={{
              left: `${committedRect.x}px`,
              top: `${committedRect.y}px`,
              width: `${committedRect.width}px`,
              height: `${committedRect.height}px`,
            }}
          >
            {/* Inner Window Header Strip */}
            <div
              className="flex items-center justify-between gap-2 px-3 py-2 border-b min-w-0 rounded-t-2xl"
              style={{
                borderColor: 'var(--prism-divider)',
                backgroundColor:
                  'color-mix(in srgb, var(--prism-crystal-top) 65%, transparent)',
              }}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  aria-hidden="true"
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={STYLE_BG_ERROR}
                />
                <span
                  aria-hidden="true"
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={STYLE_BG_WARNING}
                />
                <span
                  aria-hidden="true"
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={STYLE_BG_SUCCESS}
                />
                <span
                  className="ml-1.5 text-[11px] font-semibold truncate"
                  style={STYLE_TEXT_PRIMARY}
                >
                  {resolvedTitle}
                </span>
              </div>
              <span
                className="text-[10px] font-mono tabular-nums shrink-0"
                style={STYLE_TEXT_SECONDARY}
              >
                {committedRect.x}, {committedRect.y}
              </span>
            </div>

            {/* Window Viewport Interior */}
            <div className="flex-1 flex flex-col items-center justify-center p-3 text-center gap-1 min-h-0 overflow-hidden">
              <span
                className="text-sm font-mono font-semibold tabular-nums"
                style={STYLE_TEXT_PRIMARY}
              >
                {committedRect.width} × {committedRect.height} px
              </span>
              <span
                className="text-[11px] font-mono tabular-nums"
                style={STYLE_TEXT_SECONDARY}
              >
                Bounds {bounds.minWidth}–{bounds.maxWidth} × {bounds.minHeight}–
                {bounds.maxHeight}
              </span>
            </div>

            {/* 8 Directional Edge & Corner Resize Hitboxes */}
            {RESIZE_HANDLES.map((spec) => {
              const isActive = ghostState?.edge === spec.edge;
              return (
                <button
                  key={spec.edge}
                  type="button"
                  disabled={disabled}
                  aria-label={spec.ariaLabel}
                  data-testid={`resize-handle-${spec.edge}`}
                  data-edge={spec.edge}
                  data-active={isActive ? 'true' : undefined}
                  onPointerDown={(event) => startEdgeDrag(spec, event)}
                  onKeyDown={(event) => handleEdgeKeyDown(spec, event)}
                  style={{ touchAction: 'none' }}
                  className={cx(
                    handleClass,
                    'prism-focus-ring group absolute z-20 inline-flex items-center justify-center rounded-full touch-none disabled:cursor-not-allowed disabled:opacity-45',
                    spec.positionClass,
                    disabled ? 'cursor-not-allowed' : spec.cursorClass
                  )}
                >
                  {spec.isCorner ? (
                    <span
                      aria-hidden="true"
                      className="w-3 h-3 rounded-full border-2 transition-transform"
                      style={{
                        borderColor: isActive
                          ? 'var(--prism-primary-main)'
                          : 'var(--prism-secondary-main)',
                        backgroundColor: isActive
                          ? 'var(--prism-primary-main)'
                          : 'var(--prism-crystal-top)',
                      }}
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className={cx(
                        'rounded-full transition-opacity',
                        spec.isHorizontalEdge ? 'h-1.5 w-9' : 'w-1.5 h-9',
                        isActive ? 'opacity-100' : 'opacity-65 group-hover:opacity-100'
                      )}
                      style={{
                        backgroundColor: isActive
                          ? 'var(--prism-primary-main)'
                          : 'var(--prism-secondary-main)',
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Luminous Translucent Optical Ghost Preview Outline */}
          {ghostState ? (
            <div
              data-testid="resize-ghost-frame"
              data-edge={ghostState.edge}
              data-snapped={ghostState.snapped ? 'true' : 'false'}
              data-width={String(ghostState.rect.width)}
              data-height={String(ghostState.rect.height)}
              aria-hidden="true"
              className={cx(
                ghostClass,
                'pointer-events-none absolute z-30 rounded-2xl border-2 border-dashed flex items-center justify-center'
              )}
              style={{
                left: `${ghostState.rect.x}px`,
                top: `${ghostState.rect.y}px`,
                width: `${ghostState.rect.width}px`,
                height: `${ghostState.rect.height}px`,
                borderColor: 'var(--prism-primary-main)',
                backgroundColor:
                  'color-mix(in srgb, var(--prism-primary-main) 14%, transparent)',
                boxShadow:
                  '0 0 0 1px color-mix(in srgb, var(--prism-primary-light) 35%, transparent), 0 8px 24px -6px color-mix(in srgb, var(--prism-primary-main) 28%, transparent)',
              }}
            >
              <span
                data-testid="resize-ghost-pill"
                className="prism-crystal px-3 py-1 rounded-full text-xs font-mono font-semibold tabular-nums whitespace-nowrap shadow-sm"
                style={STYLE_PRIMARY_MAIN}
              >
                {ghostState.snapped
                  ? `${ghostState.rect.width} × ${ghostState.rect.height} px · Snapped ${safeSnapGridPx}px`
                  : `${ghostState.rect.width} × ${ghostState.rect.height} px · Free`}
              </span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Polite Aria-Live Status Strip */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-testid="resize-status-strip"
        className={cx(
          statusClass,
          'prism-well flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-xl text-xs min-w-0 max-w-full'
        )}
        style={STYLE_TEXT_SECONDARY}
      >
        <span className="inline-flex items-center gap-1.5 min-w-0 max-w-full">
          <span
            aria-hidden="true"
            className="w-2 h-2 rounded-full shrink-0"
            style={{
              backgroundColor: ghostState
                ? 'var(--prism-primary-main)'
                : isSnapActive
                  ? 'var(--prism-secondary-main)'
                  : 'var(--prism-divider)',
            }}
          />
          <span className="truncate">{announcement || defaultStatusSummary}</span>
        </span>
        <span className="font-mono text-[11px] tabular-nums shrink-0">
          {isSnapActive ? `Snap ${safeSnapGridPx}px` : 'Free resize'}
        </span>
      </div>
    </div>
  );
}

export const WindowResizeFrame = /*#__PURE__*/ memoWithDisplayName(WindowResizeFrameInner, 'WindowResizeFrame');
