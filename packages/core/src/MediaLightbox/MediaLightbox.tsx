'use client';

import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Film,
  ImageOff,
  Play,
  RotateCcw,
  ShieldAlert,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber, sanitizeUrl } from '../utils/sanitize';
import { STYLE_ERROR_MAIN } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type LightboxMediaKind = 'image' | 'video';

export type MediaLightboxMode = 'overlay' | 'inline';

export interface LightboxMediaItem {
  /** Unique identifier for the media item. */
  id: string;
  /** Accessible title displayed in the header bar and used as media alt/label. */
  title: string;
  /** Optional descriptive caption rendered beneath the stage. */
  caption?: string;
  /** Source URL validated strictly via sanitizeUrl. */
  src: string;
  /** Media asset type ('image' | 'video', defaults to 'image'). */
  kind?: LightboxMediaKind;
  /** Optional thumbnail image URL for the filmstrip bar. */
  thumbnailSrc?: string;
}

export interface MediaLightboxProps extends BaseProps<HTMLDivElement> {
  /** Ordered list of images or videos to inspect in the optical viewer. */
  items: ReadonlyArray<LightboxMediaItem>;
  /** Controlled open state. */
  open?: boolean;
  /** Initial open state for uncontrolled usage (defaults to true). */
  defaultOpen?: boolean;
  /** Callback fired when open state changes (e.g. close button or Escape in overlay mode). */
  onOpenChange?: (open: boolean) => void;
  /** Controlled active item index. */
  activeIndex?: number;
  /** Initial active item index for uncontrolled usage (defaults to 0). */
  defaultIndex?: number;
  /** Callback fired when the active item index changes. */
  onIndexChange?: (idx: number) => void;
  /** Display mode: fullscreen backdrop 'overlay' or embedded 'inline' slab (defaults to 'overlay'). */
  mode?: MediaLightboxMode;
}

interface PanOffset {
  x: number;
  y: number;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.5;
const PAN_RANGE_PER_ZOOM = 320;
const ZERO_PAN: PanOffset = { x: 0, y: 0 };

function roundZoom(value: number): number {
  return Math.round(clampNumber(value, MIN_ZOOM, MAX_ZOOM, MIN_ZOOM) * 10) / 10;
}

function MediaLightboxInner({
  items,
  open,
  defaultOpen = true,
  onOpenChange,
  activeIndex,
  defaultIndex = 0,
  onIndexChange,
  mode = 'overlay',
  className,
  style,
  xstyle,
  onKeyDown,
  ref,
  ...rest
}: MediaLightboxProps) {
  const override = useComponentOverride('MediaLightbox');
  const cleanupDragRef = useRef<(() => void) | null>(null);

  const [isOpen, setIsOpen] = useControllableState<boolean>({
    value: open,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });

  const [rawIndex, setRawIndex] = useControllableState<number>({
    value: activeIndex,
    defaultValue: defaultIndex,
    onChange: onIndexChange,
  });

  const [zoom, setZoom] = useState<number>(MIN_ZOOM);
  const [pan, setPan] = useState<PanOffset>(ZERO_PAN);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const resolvedMode: MediaLightboxMode = mode === 'inline' ? 'inline' : 'overlay';
  const itemCount = items.length;
  const safeIndex =
    itemCount > 0 ? Math.round(clampNumber(rawIndex, 0, itemCount - 1, 0)) : 0;
  const currentItem = items[safeIndex];

  useEffect(() => {
    setZoom(MIN_ZOOM);
    setPan(ZERO_PAN);
    setIsDragging(false);
    cleanupDragRef.current?.();
  }, [safeIndex, isOpen]);

  useEffect(() => {
    return () => {
      cleanupDragRef.current?.();
    };
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, [setIsOpen]);

  const goPrev = useCallback(() => {
    if (itemCount <= 1) return;
    setRawIndex((safeIndex - 1 + itemCount) % itemCount);
  }, [itemCount, safeIndex, setRawIndex]);

  const goNext = useCallback(() => {
    if (itemCount <= 1) return;
    setRawIndex((safeIndex + 1) % itemCount);
  }, [itemCount, safeIndex, setRawIndex]);

  const selectIndex = useCallback(
    (idx: number) => {
      setRawIndex(Math.round(clampNumber(idx, 0, Math.max(0, itemCount - 1), 0)));
    },
    [itemCount, setRawIndex]
  );

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => {
      const next = roundZoom(prev - ZOOM_STEP);
      if (next <= MIN_ZOOM) {
        setPan(ZERO_PAN);
      }
      return next;
    });
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => roundZoom(prev + ZOOM_STEP));
  }, []);

  const handleResetView = useCallback(() => {
    setZoom(MIN_ZOOM);
    setPan(ZERO_PAN);
  }, []);

  useEffect(() => {
    if (!isOpen || itemCount === 0 || resolvedMode !== 'overlay') return;

    const handleWindowKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        handleClose();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goPrev();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        goNext();
      }
    };

    window.addEventListener('keydown', handleWindowKeyDown);
    return () => {
      window.removeEventListener('keydown', handleWindowKeyDown);
    };
  }, [goNext, goPrev, handleClose, isOpen, itemCount, resolvedMode]);

  const handleRootKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(event);
      if (event.defaultPrevented || event.nativeEvent.isComposing) return;
      if (resolvedMode !== 'inline') return;

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goPrev();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        goNext();
      }
    },
    [goNext, goPrev, onKeyDown, resolvedMode]
  );

  const mediaKind: LightboxMediaKind = currentItem?.kind === 'video' ? 'video' : 'image';
  const safeSrc = currentItem ? sanitizeUrl(currentItem.src, mediaKind === 'image') : '';
  const isBlocked = safeSrc.length === 0;
  const canPan = !isBlocked && zoom > MIN_ZOOM;

  const handleStagePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!canPan || event.button > 0) return;
      event.preventDefault();
      cleanupDragRef.current?.();

      const startX = event.clientX;
      const startY = event.clientY;
      const startPan = pan;
      const maxOffset = Math.round((zoom - MIN_ZOOM) * PAN_RANGE_PER_ZOOM);

      setIsDragging(true);

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        setPan({
          x: Math.round(clampNumber(startPan.x + dx, -maxOffset, maxOffset, 0)),
          y: Math.round(clampNumber(startPan.y + dy, -maxOffset, maxOffset, 0)),
        });
      };

      const cleanup = () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerEnd);
        window.removeEventListener('pointercancel', handlePointerEnd);
        cleanupDragRef.current = null;
      };

      const handlePointerEnd = () => {
        cleanup();
        setIsDragging(false);
      };

      cleanupDragRef.current = cleanup;
      window.addEventListener('pointermove', handlePointerMove, { passive: true });
      window.addEventListener('pointerup', handlePointerEnd);
      window.addEventListener('pointercancel', handlePointerEnd);
    },
    [canPan, pan, zoom]
  );

  if (!isOpen || !currentItem) {
    return null;
  }

  const showCloseButton = resolvedMode === 'overlay' || Boolean(onOpenChange);
  const canResetView = zoom > MIN_ZOOM || pan.x !== 0 || pan.y !== 0;

  const merged = mergeProps({
    themeTarget: themeProps('media-lightbox', {
      mode: resolvedMode,
      zoomed: zoom > MIN_ZOOM,
      dragging: isDragging,
      mediaKind,
      blocked: isBlocked,
    }),
    baseClassName: cx(
      'flex flex-col gap-3 text-slate-100 select-none',
      resolvedMode === 'overlay'
        ? 'fixed inset-0 z-50 prism-backdrop-scrim bg-slate-950/90 p-4 sm:p-6'
        : 'prism-slab bg-slate-950/90 overflow-hidden p-4'
    ),
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('media-lightbox', 'header');
  const stageClass = stableClassName('media-lightbox', 'stage');
  const filmstripClass = stableClassName('media-lightbox', 'filmstrip');
  const transformStyle = {
    transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
  };

  return (
    <div
      ref={ref}
      role={resolvedMode === 'overlay' ? 'dialog' : 'region'}
      aria-modal={resolvedMode === 'overlay' ? true : undefined}
      aria-label={currentItem.title}
      tabIndex={-1}
      onKeyDown={handleRootKeyDown}
      {...rest}
      {...merged}
    >
      {/* Optical Viewer Header Bar */}
      <div
        className={cx(
          headerClass,
          'flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-white/10'
        )}
      >
        <div className="min-w-0 flex items-center gap-3">
          <h2 className="text-sm font-semibold tracking-[-0.01em] text-slate-100 truncate">
            {currentItem.title}
          </h2>
          <span
            data-testid="lightbox-counter"
            className="px-2.5 py-0.5 rounded-full bg-white/10 border border-white/15 font-mono text-xs tabular-nums text-slate-200 shrink-0"
          >
            {safeIndex + 1} / {itemCount}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            aria-label="Zoom out"
            disabled={isBlocked || zoom <= MIN_ZOOM}
            onClick={handleZoomOut}
            className="prism-focus-ring w-8 h-8 rounded-full bg-white/10 border border-white/15 inline-flex items-center justify-center text-slate-100 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed enabled:hover:bg-white/20"
          >
            <ZoomOut className="w-4 h-4" aria-hidden="true" />
          </button>

          <span
            data-testid="lightbox-zoom-readout"
            className="min-w-[3.25rem] text-center font-mono text-xs font-semibold tabular-nums text-slate-100"
          >
            {Math.round(zoom * 100)}%
          </span>

          <button
            type="button"
            aria-label="Zoom in"
            disabled={isBlocked || zoom >= MAX_ZOOM}
            onClick={handleZoomIn}
            className="prism-focus-ring w-8 h-8 rounded-full bg-white/10 border border-white/15 inline-flex items-center justify-center text-slate-100 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed enabled:hover:bg-white/20"
          >
            <ZoomIn className="w-4 h-4" aria-hidden="true" />
          </button>

          <button
            type="button"
            aria-label="Reset zoom and pan"
            disabled={!canResetView}
            onClick={handleResetView}
            className="prism-focus-ring h-8 px-2.5 rounded-full bg-white/10 border border-white/15 inline-flex items-center gap-1.5 text-xs font-medium text-slate-100 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed enabled:hover:bg-white/20"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Reset</span>
          </button>

          {showCloseButton ? (
            <button
              type="button"
              aria-label="Close lightbox"
              onClick={handleClose}
              className="prism-focus-ring ml-1 w-8 h-8 rounded-full bg-white/10 border border-white/15 inline-flex items-center justify-center text-slate-100 transition-colors cursor-pointer disabled:cursor-not-allowed enabled:hover:bg-white/20"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Main Optical Stage */}
      <div
        data-testid="lightbox-stage"
        data-dragging={isDragging ? 'true' : undefined}
        onPointerDown={handleStagePointerDown}
        style={{ touchAction: canPan ? 'none' : 'auto' }}
        className={cx(
          stageClass,
          'relative w-full overflow-hidden rounded-[18px] bg-slate-950/60 border border-white/10 flex items-center justify-center',
          resolvedMode === 'overlay' ? 'flex-1 min-h-0' : 'h-[340px]',
          canPan ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'
        )}
      >
        {isBlocked ? (
          <div
            role="status"
            data-testid="lightbox-blocked"
            className="flex flex-col items-center justify-center gap-2 p-6 text-center max-w-sm"
          >
            <span
              className="w-11 h-11 rounded-2xl bg-white/10 border border-white/15 inline-flex items-center justify-center"
              style={STYLE_ERROR_MAIN}
            >
              <ShieldAlert className="w-5 h-5" aria-hidden="true" />
            </span>
            <p className="text-sm font-semibold text-slate-100">Media URL blocked</p>
            <p className="text-xs text-slate-400">
              This asset uses an untrusted protocol and cannot be displayed in the optical viewer.
            </p>
          </div>
        ) : mediaKind === 'video' ? (
          <video
            key={currentItem.id}
            data-testid="lightbox-video"
            src={safeSrc}
            controls
            aria-label={currentItem.title}
            style={transformStyle}
            className="max-w-full max-h-full rounded-xl transition-transform duration-150 will-change-transform"
          />
        ) : (
          <img
            key={currentItem.id}
            data-testid="lightbox-image"
            src={safeSrc}
            alt={currentItem.title}
            draggable={false}
            referrerPolicy="no-referrer"
            style={transformStyle}
            className={cx(
              'max-w-full max-h-full object-contain pointer-events-none will-change-transform',
              isDragging ? 'transition-none' : 'transition-transform duration-150'
            )}
          />
        )}

        {/* Circular Prev / Next Navigation Arrows */}
        <button
          type="button"
          aria-label="Previous media"
          disabled={itemCount <= 1}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={goPrev}
          className="prism-focus-ring absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-900/85 border border-white/20 inline-flex items-center justify-center text-slate-100 shadow-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed enabled:hover:bg-slate-800/90"
        >
          <ChevronLeft className="w-5 h-5" aria-hidden="true" />
        </button>

        <button
          type="button"
          aria-label="Next media"
          disabled={itemCount <= 1}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={goNext}
          className="prism-focus-ring absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-900/85 border border-white/20 inline-flex items-center justify-center text-slate-100 shadow-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed enabled:hover:bg-slate-800/90"
        >
          <ChevronRight className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>

      {/* Optional Caption */}
      {currentItem.caption ? (
        <p
          data-testid="lightbox-caption"
          className="text-xs text-center text-slate-300 leading-relaxed px-2"
        >
          {currentItem.caption}
        </p>
      ) : null}

      {/* Clickable Filmstrip Thumbnail Strip */}
      <div
        role="group"
        aria-label="Media filmstrip"
        data-testid="lightbox-filmstrip"
        className={cx(
          filmstripClass,
          'flex items-center justify-center gap-2 overflow-x-auto py-1 px-1'
        )}
      >
        {items.map((item, idx) => {
          const isActive = idx === safeIndex;
          const isVideoItem = item.kind === 'video';
          const rawThumb = item.thumbnailSrc ?? (isVideoItem ? '' : item.src);
          const safeThumb = rawThumb ? sanitizeUrl(rawThumb, true) : '';

          return (
            <button
              key={item.id}
              type="button"
              aria-label={`Select ${item.title}`}
              aria-pressed={isActive}
              aria-current={isActive ? 'true' : undefined}
              data-active={isActive ? 'true' : undefined}
              data-testid={`lightbox-thumb-${item.id}`}
              onClick={() => selectIndex(idx)}
              className={cx(
                'prism-focus-ring relative w-16 h-11 rounded-xl overflow-hidden shrink-0 bg-white/10 border transition-[color,background-color,border-color,opacity,transform] inline-flex items-center justify-center cursor-pointer disabled:cursor-not-allowed',
                isActive
                  ? 'ring-2 ring-[var(--prism-primary-main)] border-white/40 opacity-100'
                  : 'border-white/15 opacity-65 enabled:hover:opacity-100'
              )}
            >
              {safeThumb ? (
                <>
                  <img
                    src={safeThumb}
                    alt=""
                    aria-hidden="true"
                    draggable={false}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover pointer-events-none"
                  />
                  {isVideoItem ? (
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 flex items-center justify-center bg-slate-950/35 text-slate-100"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </span>
                  ) : null}
                </>
              ) : isVideoItem ? (
                <Film className="w-4 h-4 text-slate-300" aria-hidden="true" />
              ) : (
                <ImageOff className="w-4 h-4 text-slate-400" aria-hidden="true" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export const MediaLightbox = memo(MediaLightboxInner);
MediaLightbox.displayName = 'MediaLightbox';
