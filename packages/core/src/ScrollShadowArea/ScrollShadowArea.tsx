'use client';

import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type UIEvent,
} from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { STYLE_TEXT_PRIMARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type ScrollShadowAxis = 'vertical' | 'horizontal' | 'both';

export interface ScrollShadowEdgeState {
  top: boolean;
  bottom: boolean;
  left: boolean;
  right: boolean;
}

export interface ScrollShadowAreaProps extends BaseProps<HTMLDivElement> {
  /** Scrollable overflow axis and active optical edge-fade directions (default `'vertical'`). */
  axis?: ScrollShadowAxis;
  /** Maximum height of the scrollable viewport in pixels or CSS length (default `260`). */
  maxHeight?: number | string;
  /** Edge-fade shadow depth in pixels, clamped to `12..64` (default `28`). */
  shadowSizePx?: number;
  /** Show subtle Back-to-Top / Jump-to-End optical glass pill when vertical overflow exists (default `false`). */
  showScrollButtons?: boolean;
  /** Callback invoked whenever any overflow edge state (`top`, `bottom`, `left`, `right`) changes. */
  onEdgeChange?: (edges: ScrollShadowEdgeState) => void;
  /** Accessible `aria-label` applied to the focusable scroll viewport region (default `'Scrollable content region'`). */
  viewportLabel?: string;
  /** Scrollable content rendered inside the viewport. */
  children?: ReactNode;
}

const DEFAULT_MAX_HEIGHT_PX = 260;
const DEFAULT_SHADOW_SIZE_PX = 28;
const MIN_SHADOW_SIZE_PX = 12;
const MAX_SHADOW_SIZE_PX = 64;
const EDGE_EPSILON_PX = 0.5;
const DEFAULT_VIEWPORT_LABEL = 'Scrollable content region';

const INITIAL_EDGES: ScrollShadowEdgeState = {
  top: false,
  bottom: false,
  left: false,
  right: false,
};

function clampShadowSize(size: number): number {
  if (!Number.isFinite(size)) {
    return DEFAULT_SHADOW_SIZE_PX;
  }
  return Math.min(MAX_SHADOW_SIZE_PX, Math.max(MIN_SHADOW_SIZE_PX, Math.round(size)));
}

function normalizeMaxHeight(maxHeight: number | string): string {
  if (typeof maxHeight === 'number') {
    if (!Number.isFinite(maxHeight) || maxHeight <= 0) {
      return `${DEFAULT_MAX_HEIGHT_PX}px`;
    }
    return `${maxHeight}px`;
  }
  const trimmed = maxHeight.trim();
  return trimmed.length > 0 ? trimmed : `${DEFAULT_MAX_HEIGHT_PX}px`;
}

function getOverflowClass(axis: ScrollShadowAxis): string {
  switch (axis) {
    case 'horizontal':
      return 'overflow-x-auto overflow-y-hidden';
    case 'both':
      return 'overflow-auto';
    case 'vertical':
      return 'overflow-y-auto overflow-x-hidden';
  }
}

function computeEdgeState(
  viewport: HTMLDivElement,
  canScrollVertical: boolean,
  canScrollHorizontal: boolean
): ScrollShadowEdgeState {
  return {
    top: canScrollVertical && viewport.scrollTop > EDGE_EPSILON_PX,
    bottom:
      canScrollVertical &&
      viewport.scrollTop + viewport.clientHeight < viewport.scrollHeight - EDGE_EPSILON_PX,
    left: canScrollHorizontal && viewport.scrollLeft > EDGE_EPSILON_PX,
    right:
      canScrollHorizontal &&
      viewport.scrollLeft + viewport.clientWidth < viewport.scrollWidth - EDGE_EPSILON_PX,
  };
}

function ScrollShadowAreaInner({
  axis = 'vertical',
  maxHeight = DEFAULT_MAX_HEIGHT_PX,
  shadowSizePx = DEFAULT_SHADOW_SIZE_PX,
  showScrollButtons = false,
  onEdgeChange,
  viewportLabel = DEFAULT_VIEWPORT_LABEL,
  children,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: ScrollShadowAreaProps) {
  const override = useComponentOverride('ScrollShadowArea');

  const canScrollVertical = axis === 'vertical' || axis === 'both';
  const canScrollHorizontal = axis === 'horizontal' || axis === 'both';
  const clampedShadowSize = clampShadowSize(shadowSizePx);
  const resolvedMaxHeight = normalizeMaxHeight(maxHeight);
  const resolvedViewportLabel = viewportLabel.trim() || DEFAULT_VIEWPORT_LABEL;

  const [viewportNode, setViewportNode] = useState<HTMLDivElement | null>(null);
  const edgesRef = useRef<ScrollShadowEdgeState>(INITIAL_EDGES);
  const onEdgeChangeRef = useRef<ScrollShadowAreaProps['onEdgeChange']>(onEdgeChange);
  const [edges, setEdges] = useState<ScrollShadowEdgeState>(INITIAL_EDGES);

  useEffect(() => {
    onEdgeChangeRef.current = onEdgeChange;
  }, [onEdgeChange]);

  const syncEdgesForElement = useCallback(
    (viewport: HTMLDivElement) => {
      const next = computeEdgeState(viewport, canScrollVertical, canScrollHorizontal);
      const prev = edgesRef.current;
      if (
        prev.top !== next.top ||
        prev.bottom !== next.bottom ||
        prev.left !== next.left ||
        prev.right !== next.right
      ) {
        edgesRef.current = next;
        setEdges(next);
        onEdgeChangeRef.current?.(next);
      }
    },
    [canScrollHorizontal, canScrollVertical]
  );

  useEffect(() => {
    if (!viewportNode) {
      return;
    }

    const handleMeasure = () => {
      syncEdgesForElement(viewportNode);
    };

    handleMeasure();
    window.addEventListener('resize', handleMeasure, { passive: true });

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(handleMeasure);
      observer.observe(viewportNode);
    }

    return () => {
      window.removeEventListener('resize', handleMeasure);
      observer?.disconnect();
    };
  }, [viewportNode, syncEdgesForElement]);

  useEffect(() => {
    if (viewportNode) {
      syncEdgesForElement(viewportNode);
    }
  }, [viewportNode, syncEdgesForElement, children, resolvedMaxHeight]);

  const handleScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      syncEdgesForElement(event.currentTarget);
    },
    [syncEdgesForElement]
  );

  const scrollViewportTo = useCallback(
    (viewport: HTMLDivElement, position: 'top' | 'bottom') => {
      const maxScrollTop = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
      const targetTop = position === 'top' ? 0 : maxScrollTop;
      if (typeof viewport.scrollTo === 'function') {
        viewport.scrollTo({ top: targetTop, behavior: 'smooth' });
      } else {
        viewport.scrollTop = targetTop;
      }
      syncEdgesForElement(viewport);
    },
    [syncEdgesForElement]
  );

  const merged = mergeProps({
    themeTarget: themeProps('scroll-shadow-area', {
      axis,
      shadowTop: edges.top ? 'true' : 'false',
      shadowBottom: edges.bottom ? 'true' : 'false',
      shadowLeft: edges.left ? 'true' : 'false',
      shadowRight: edges.right ? 'true' : 'false',
      scrollButtons: showScrollButtons,
    }),
    baseClassName: 'prism-slab relative overflow-hidden min-w-0 max-w-full w-full p-1.5',
    overrideClassName: override?.className,
    userClassName: className,
    baseStyle: {
      '--prism-scroll-shadow-size': `${clampedShadowSize}px`,
    },
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const frameClass = stableClassName('scroll-shadow-area', 'frame');
  const viewportClass = stableClassName('scroll-shadow-area', 'viewport');
  const topShadowClass = stableClassName('scroll-shadow-area', 'shadow-top');
  const bottomShadowClass = stableClassName('scroll-shadow-area', 'shadow-bottom');
  const leftShadowClass = stableClassName('scroll-shadow-area', 'shadow-left');
  const rightShadowClass = stableClassName('scroll-shadow-area', 'shadow-right');
  const controlsClass = stableClassName('scroll-shadow-area', 'controls');

  const activeControlsViewport =
    showScrollButtons && canScrollVertical && (edges.top || edges.bottom) ? viewportNode : null;

  return (
    <div ref={ref} {...rest} {...merged}>
      <div
        className={cx(
          frameClass,
          'prism-well relative overflow-hidden rounded-2xl min-w-0 max-w-full w-full'
        )}
      >
        <div
          ref={setViewportNode}
          role="region"
          tabIndex={0}
          aria-label={resolvedViewportLabel}
          onScroll={handleScroll}
          className={cx(
            viewportClass,
            'prism-focus-ring relative min-w-0 max-w-full w-full rounded-2xl',
            getOverflowClass(axis)
          )}
          style={{ maxHeight: resolvedMaxHeight }}
        >
          {children}
        </div>

        {canScrollVertical ? (
          <>
            <div
              aria-hidden="true"
              data-edge="top"
              data-active={edges.top ? 'true' : 'false'}
              className={cx(
                topShadowClass,
                'pointer-events-none absolute inset-x-0 top-0 z-10 transition-opacity duration-200'
              )}
              style={{
                height: `${clampedShadowSize}px`,
                opacity: edges.top ? 1 : 0,
                backgroundImage:
                  'linear-gradient(to bottom, var(--prism-bg-start) 0%, var(--prism-divider) 45%, transparent 100%)',
                boxShadow: 'inset 0 1px 0 var(--prism-divider)',
              }}
            />
            <div
              aria-hidden="true"
              data-edge="bottom"
              data-active={edges.bottom ? 'true' : 'false'}
              className={cx(
                bottomShadowClass,
                'pointer-events-none absolute inset-x-0 bottom-0 z-10 transition-opacity duration-200'
              )}
              style={{
                height: `${clampedShadowSize}px`,
                opacity: edges.bottom ? 1 : 0,
                backgroundImage:
                  'linear-gradient(to top, var(--prism-bg-start) 0%, var(--prism-divider) 45%, transparent 100%)',
                boxShadow: 'inset 0 -1px 0 var(--prism-divider)',
              }}
            />
          </>
        ) : null}

        {canScrollHorizontal ? (
          <>
            <div
              aria-hidden="true"
              data-edge="left"
              data-active={edges.left ? 'true' : 'false'}
              className={cx(
                leftShadowClass,
                'pointer-events-none absolute inset-y-0 left-0 z-10 transition-opacity duration-200'
              )}
              style={{
                width: `${clampedShadowSize}px`,
                opacity: edges.left ? 1 : 0,
                backgroundImage:
                  'linear-gradient(to right, var(--prism-bg-start) 0%, var(--prism-divider) 45%, transparent 100%)',
                boxShadow: 'inset 1px 0 0 var(--prism-divider)',
              }}
            />
            <div
              aria-hidden="true"
              data-edge="right"
              data-active={edges.right ? 'true' : 'false'}
              className={cx(
                rightShadowClass,
                'pointer-events-none absolute inset-y-0 right-0 z-10 transition-opacity duration-200'
              )}
              style={{
                width: `${clampedShadowSize}px`,
                opacity: edges.right ? 1 : 0,
                backgroundImage:
                  'linear-gradient(to left, var(--prism-bg-start) 0%, var(--prism-divider) 45%, transparent 100%)',
                boxShadow: 'inset -1px 0 0 var(--prism-divider)',
              }}
            />
          </>
        ) : null}

        {activeControlsViewport ? (
          <div
            role="group"
            aria-label="Scroll position controls"
            data-testid="scroll-shadow-controls"
            className={cx(
              controlsClass,
              'prism-crystal absolute bottom-2.5 right-2.5 z-20 inline-flex items-center gap-1 rounded-full p-1'
            )}
          >
            <button
              type="button"
              disabled={!edges.top}
              aria-label="Back to top"
              onClick={() => scrollViewportTo(activeControlsViewport, 'top')}
              className="prism-focus-ring prism-well h-7 px-2.5 rounded-full inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap transition-[color,background-color,border-color,opacity,transform] cursor-pointer enabled:hover:brightness-105 disabled:opacity-45 disabled:cursor-not-allowed"
              style={STYLE_TEXT_PRIMARY}
            >
              <ArrowUp aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
              <span>Top</span>
            </button>
            <button
              type="button"
              disabled={!edges.bottom}
              aria-label="Jump to end"
              onClick={() => scrollViewportTo(activeControlsViewport, 'bottom')}
              className="prism-focus-ring prism-well h-7 px-2.5 rounded-full inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap transition-[color,background-color,border-color,opacity,transform] cursor-pointer enabled:hover:brightness-105 disabled:opacity-45 disabled:cursor-not-allowed"
              style={STYLE_TEXT_PRIMARY}
            >
              <ArrowDown aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
              <span>End</span>
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export const ScrollShadowArea = memo(ScrollShadowAreaInner);
ScrollShadowArea.displayName = 'ScrollShadowArea';
