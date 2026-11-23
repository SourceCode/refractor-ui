'use client';

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { Check, Crop, ImageOff, RefreshCw, RotateCcw, RotateCw, ZoomIn } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { createCoalescedPointerMove } from '../hooks/useRafCallback';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber, sanitizeUrl } from '../utils/sanitize';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export type CropAspectRatio = 'free' | '1:1' | '16:9' | '4:3';

export interface CropRegion {
  /** Horizontal offset from the left edge as a percentage (0..100). */
  x: number;
  /** Vertical offset from the top edge as a percentage (0..100). */
  y: number;
  /** Width of the crop region as a percentage (0..100). */
  width: number;
  /** Height of the crop region as a percentage (0..100). */
  height: number;
}

export interface CropResult {
  region: CropRegion;
  zoom: number;
  rotationDeg: number;
  aspectRatio: CropAspectRatio;
}

type ImageCropperBaseProps = Omit<BaseProps<HTMLDivElement>, 'children'>;

export interface ImageCropperProps extends ImageCropperBaseProps {
  /** Image source URL (strictly validated with sanitizeUrl allowing raster data URIs). */
  src: string;
  /** Accessible image alt text (defaults to 'Editable media'). */
  alt?: string;
  /** Initial crop frame percentage coordinates (defaults to { x: 15, y: 15, width: 70, height: 70 }). */
  defaultCrop?: CropRegion;
  /** Initial aspect ratio preset (defaults to 'free'). */
  defaultAspectRatio?: CropAspectRatio;
  /** Callback fired when the user confirms the crop via Apply Crop. */
  onApplyCrop?: (result: CropResult) => void;
  /** Callback fired whenever crop geometry, zoom, rotation, or aspect ratio changes. */
  onCropChange?: (result: CropResult) => void;
}

interface AspectOption {
  id: CropAspectRatio;
  label: string;
  ratio: number | null;
}

const ASPECT_OPTIONS: ReadonlyArray<AspectOption> = [
  { id: 'free', label: 'Free', ratio: null },
  { id: '1:1', label: '1:1', ratio: 1 },
  { id: '16:9', label: '16:9', ratio: 16 / 9 },
  { id: '4:3', label: '4:3', ratio: 4 / 3 },
];

const DEFAULT_CROP_REGION: CropRegion = { x: 15, y: 15, width: 70, height: 70 };
const MIN_CROP_SIZE = 15;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.1;
const KEYBOARD_STEP = 2;

function roundTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

function getRatioValue(aspectRatio: CropAspectRatio): number | null {
  switch (aspectRatio) {
    case '1:1':
      return 1;
    case '16:9':
      return 16 / 9;
    case '4:3':
      return 4 / 3;
    default:
      return null;
  }
}

function normalizeAspectRatio(aspectRatio: CropAspectRatio | undefined): CropAspectRatio {
  if (
    aspectRatio === 'free' ||
    aspectRatio === '1:1' ||
    aspectRatio === '16:9' ||
    aspectRatio === '4:3'
  ) {
    return aspectRatio;
  }
  return 'free';
}

function normalizeRotation(degrees: number): number {
  const mod = degrees % 360;
  return Object.is(mod, -0) ? 0 : mod;
}

function sanitizeCropRegion(
  raw: CropRegion | undefined,
  aspectRatio: CropAspectRatio
): CropRegion {
  const source = raw ?? DEFAULT_CROP_REGION;
  const ratio = getRatioValue(aspectRatio);

  if (ratio === null) {
    const width = roundTwo(clampNumber(source.width, MIN_CROP_SIZE, 100, DEFAULT_CROP_REGION.width));
    const height = roundTwo(
      clampNumber(source.height, MIN_CROP_SIZE, 100, DEFAULT_CROP_REGION.height)
    );
    const x = roundTwo(clampNumber(source.x, 0, Math.max(0, 100 - width), DEFAULT_CROP_REGION.x));
    const y = roundTwo(clampNumber(source.y, 0, Math.max(0, 100 - height), DEFAULT_CROP_REGION.y));
    return {
      x: Math.min(x, roundTwo(100 - width)),
      y: Math.min(y, roundTwo(100 - height)),
      width,
      height,
    };
  }

  const minWidth = Math.max(MIN_CROP_SIZE, MIN_CROP_SIZE * ratio);
  const maxWidth = Math.min(100, 100 * ratio);
  const rawWidth = clampNumber(source.width, minWidth, maxWidth, DEFAULT_CROP_REGION.width);
  const width = roundTwo(clampNumber(rawWidth, minWidth, maxWidth, minWidth));
  const height = roundTwo(clampNumber(width / ratio, MIN_CROP_SIZE, 100, MIN_CROP_SIZE));
  const x = roundTwo(clampNumber(source.x, 0, Math.max(0, 100 - width), DEFAULT_CROP_REGION.x));
  const y = roundTwo(clampNumber(source.y, 0, Math.max(0, 100 - height), DEFAULT_CROP_REGION.y));

  return {
    x: Math.min(x, roundTwo(100 - width)),
    y: Math.min(y, roundTwo(100 - height)),
    width,
    height,
  };
}

function moveCropRegion(region: CropRegion, targetX: number, targetY: number): CropRegion {
  const maxX = Math.max(0, roundTwo(100 - region.width));
  const maxY = Math.max(0, roundTwo(100 - region.height));
  return {
    x: roundTwo(clampNumber(targetX, 0, maxX, region.x)),
    y: roundTwo(clampNumber(targetY, 0, maxY, region.y)),
    width: region.width,
    height: region.height,
  };
}

function resizeCropRegion(
  region: CropRegion,
  targetWidth: number,
  targetHeight: number,
  aspectRatio: CropAspectRatio,
  preferHeightAxis = false
): CropRegion {
  const ratio = getRatioValue(aspectRatio);
  const availWidth = Math.max(MIN_CROP_SIZE, roundTwo(100 - region.x));
  const availHeight = Math.max(MIN_CROP_SIZE, roundTwo(100 - region.y));

  if (ratio === null) {
    return {
      x: region.x,
      y: region.y,
      width: roundTwo(clampNumber(targetWidth, MIN_CROP_SIZE, availWidth, region.width)),
      height: roundTwo(clampNumber(targetHeight, MIN_CROP_SIZE, availHeight, region.height)),
    };
  }

  const minWidth = Math.max(MIN_CROP_SIZE, MIN_CROP_SIZE * ratio);
  const maxWidth = Math.min(availWidth, availHeight * ratio);
  const desiredWidth = preferHeightAxis ? targetHeight * ratio : targetWidth;
  const clampedWidth = roundTwo(
    clampNumber(desiredWidth, minWidth, Math.max(minWidth, maxWidth), region.width)
  );
  const clampedHeight = roundTwo(
    clampNumber(clampedWidth / ratio, MIN_CROP_SIZE, availHeight, region.height)
  );

  return {
    x: region.x,
    y: region.y,
    width: clampedWidth,
    height: clampedHeight,
  };
}

const viewportClass = /*#__PURE__*/ stableClassName('image-cropper', 'viewport');
const frameClass = /*#__PURE__*/ stableClassName('image-cropper', 'frame');
const dockClass = /*#__PURE__*/ stableClassName('image-cropper', 'dock');

function ImageCropperInner({
  src,
  alt = 'Editable media',
  defaultCrop,
  defaultAspectRatio = 'free',
  onApplyCrop,
  onCropChange,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: ImageCropperProps) {
  const override = useComponentOverride('ImageCropper');
  const zoomId = useId();
  const viewportRef = useRef<HTMLDivElement>(null);
  const cleanupDragRef = useRef<(() => void) | null>(null);

  const initialAspect = useMemo(
    () => normalizeAspectRatio(defaultAspectRatio),
    [defaultAspectRatio]
  );
  const initialCrop = useMemo(
    () => sanitizeCropRegion(defaultCrop, initialAspect),
    [defaultCrop, initialAspect]
  );

  const [aspectRatio, setAspectRatio] = useState<CropAspectRatio>(initialAspect);
  const [region, setRegion] = useState<CropRegion>(initialCrop);
  const [zoom, setZoom] = useState<number>(MIN_ZOOM);
  const [rotationDeg, setRotationDeg] = useState<number>(0);
  const [dragMode, setDragMode] = useState<'move' | 'resize' | null>(null);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  const safeSrc = useMemo(() => sanitizeUrl(src, true), [src]);
  const isUnsafeUrl = safeSrc.length === 0;
  const isBrokenImage = !isUnsafeUrl && failedSrc === safeSrc;
  const hasRenderableImage = !isUnsafeUrl && !isBrokenImage;

  const emitChange = useCallback(
    (next: CropResult) => {
      onCropChange?.(next);
    },
    [onCropChange]
  );

  const latestRef = useRef({
    aspectRatio,
    zoom,
    rotationDeg,
    emitChange,
  });
  latestRef.current = { aspectRatio, zoom, rotationDeg, emitChange };

  useEffect(() => {
    return () => {
      cleanupDragRef.current?.();
    };
  }, []);

  const updateRegion = useCallback(
    (nextRegion: CropRegion) => {
      setRegion(nextRegion);
      const { aspectRatio: liveAspect, zoom: liveZoom, rotationDeg: liveRot, emitChange: emit } =
        latestRef.current;
      emit({
        region: nextRegion,
        zoom: liveZoom,
        rotationDeg: liveRot,
        aspectRatio: liveAspect,
      });
    },
    []
  );

  const startPointerInteraction = useCallback(
    (mode: 'move' | 'resize', event: ReactPointerEvent<HTMLElement>) => {
      if (event.button > 0) return;
      event.preventDefault();
      if (mode === 'resize') {
        event.stopPropagation();
      }
      cleanupDragRef.current?.();

      const startX = event.clientX;
      const startY = event.clientY;
      const startRegion = region;
      setDragMode(mode);

      const handlePointerMove = createCoalescedPointerMove((moveEvent: PointerEvent) => {
        const viewport = viewportRef.current;
        if (!viewport) return;
        const rect = viewport.getBoundingClientRect();
        if (!Number.isFinite(rect.width) || !Number.isFinite(rect.height) || rect.width <= 0 || rect.height <= 0) {
          return;
        }

        const dxPct = ((moveEvent.clientX - startX) / rect.width) * 100;
        const dyPct = ((moveEvent.clientY - startY) / rect.height) * 100;

        if (mode === 'move') {
          updateRegion(moveCropRegion(startRegion, startRegion.x + dxPct, startRegion.y + dyPct));
        } else {
          const liveAspect = latestRef.current.aspectRatio;
          const ratio = getRatioValue(liveAspect);
          const preferHeight = ratio !== null && Math.abs(dyPct * ratio) > Math.abs(dxPct);
          updateRegion(
            resizeCropRegion(
              startRegion,
              startRegion.width + dxPct,
              startRegion.height + dyPct,
              liveAspect,
              preferHeight
            )
          );
        }
      });

      const cleanup = () => {
        handlePointerMove.cancel();
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerEnd);
        window.removeEventListener('pointercancel', handlePointerEnd);
        cleanupDragRef.current = null;
      };

      const handlePointerEnd = () => {
        cleanup();
        setDragMode(null);
      };

      cleanupDragRef.current = cleanup;
      window.addEventListener('pointermove', handlePointerMove, { passive: true });
      window.addEventListener('pointerup', handlePointerEnd);
      window.addEventListener('pointercancel', handlePointerEnd);
    },
    [region, updateRegion]
  );

  const handleCropFrameKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.nativeEvent.isComposing) return;

      const isArrow =
        event.key === 'ArrowLeft' ||
        event.key === 'ArrowRight' ||
        event.key === 'ArrowUp' ||
        event.key === 'ArrowDown';
      if (!isArrow) return;

      event.preventDefault();

      if (!event.shiftKey) {
        const dx =
          event.key === 'ArrowLeft'
            ? -KEYBOARD_STEP
            : event.key === 'ArrowRight'
              ? KEYBOARD_STEP
              : 0;
        const dy =
          event.key === 'ArrowUp'
            ? -KEYBOARD_STEP
            : event.key === 'ArrowDown'
              ? KEYBOARD_STEP
              : 0;
        updateRegion(moveCropRegion(region, region.x + dx, region.y + dy));
        return;
      }

      const dw =
        event.key === 'ArrowLeft'
          ? -KEYBOARD_STEP
          : event.key === 'ArrowRight'
            ? KEYBOARD_STEP
            : 0;
      const dh =
        event.key === 'ArrowUp'
          ? -KEYBOARD_STEP
          : event.key === 'ArrowDown'
            ? KEYBOARD_STEP
            : 0;
      const preferHeight = event.key === 'ArrowUp' || event.key === 'ArrowDown';
      updateRegion(
        resizeCropRegion(
          region,
          region.width + dw,
          region.height + dh,
          aspectRatio,
          preferHeight
        )
      );
    },
    [aspectRatio, region, updateRegion]
  );

  const handleAspectSelect = useCallback(
    (nextAspect: CropAspectRatio) => {
      const nextRegion = sanitizeCropRegion(region, nextAspect);
      setAspectRatio(nextAspect);
      setRegion(nextRegion);
      emitChange({
        region: nextRegion,
        zoom,
        rotationDeg,
        aspectRatio: nextAspect,
      });
    },
    [emitChange, region, rotationDeg, zoom]
  );

  const handleZoomChange = useCallback(
    (rawValue: number) => {
      const nextZoom = roundTwo(clampNumber(rawValue, MIN_ZOOM, MAX_ZOOM, MIN_ZOOM));
      setZoom(nextZoom);
      emitChange({
        region,
        zoom: nextZoom,
        rotationDeg,
        aspectRatio,
      });
    },
    [aspectRatio, emitChange, region, rotationDeg]
  );

  const handleRotate = useCallback(
    (deltaDeg: number) => {
      const nextRotation = normalizeRotation(rotationDeg + deltaDeg);
      setRotationDeg(nextRotation);
      emitChange({
        region,
        zoom,
        rotationDeg: nextRotation,
        aspectRatio,
      });
    },
    [aspectRatio, emitChange, region, rotationDeg, zoom]
  );

  const handleReset = useCallback(() => {
    setAspectRatio(initialAspect);
    setRegion(initialCrop);
    setZoom(MIN_ZOOM);
    setRotationDeg(0);
    emitChange({
      region: initialCrop,
      zoom: MIN_ZOOM,
      rotationDeg: 0,
      aspectRatio: initialAspect,
    });
  }, [emitChange, initialAspect, initialCrop]);

  const handleApply = useCallback(() => {
    if (!hasRenderableImage) return;
    onApplyCrop?.({
      region,
      zoom,
      rotationDeg,
      aspectRatio,
    });
  }, [aspectRatio, hasRenderableImage, onApplyCrop, region, rotationDeg, zoom]);

  const mediaState = isUnsafeUrl ? 'unsafe' : isBrokenImage ? 'error' : 'ready';

  const merged = mergeProps({
    themeTarget: themeProps('image-cropper', {
      aspectRatio,
      dragging: dragMode !== null,
      mediaState,
    }),
    baseClassName: 'prism-slab p-4 space-y-4 select-none',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });


  return (
    <div ref={ref} role="region" aria-label={`Image cropper for ${alt}`} {...rest} {...merged}>
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="prism-crystal w-7 h-7 rounded-xl inline-flex items-center justify-center text-slate-700 dark:text-slate-200 shrink-0">
            <Crop className="w-3.5 h-3.5" aria-hidden="true" />
          </span>
          <span className="text-xs font-semibold tracking-[-0.01em] text-slate-800 dark:text-slate-100 truncate">
            {alt}
          </span>
        </div>
        <div
          data-testid="crop-metrics"
          className="flex items-center gap-2 text-[11px] font-mono tabular-nums text-slate-600 dark:text-slate-300"
        >
          <span>
            {Math.round(region.width)}% × {Math.round(region.height)}%
          </span>
          <span aria-hidden="true">·</span>
          <span>{rotationDeg}°</span>
          <span aria-hidden="true">·</span>
          <span>{zoom.toFixed(1)}x</span>
        </div>
      </div>

      <div
        ref={viewportRef}
        data-testid="crop-viewport"
        data-media-state={mediaState}
        className={cx(
          viewportClass,
          'prism-well relative w-full aspect-16/10 rounded-[18px] overflow-hidden bg-slate-900/5 dark:bg-slate-950/60'
        )}
      >
        {hasRenderableImage ? (
          <>
            <img
              src={safeSrc}
              alt={alt}
              draggable={false}
              referrerPolicy="no-referrer"
              onError={() => setFailedSrc(safeSrc)}
              style={{ transform: `scale(${zoom}) rotate(${rotationDeg}deg)` }}
              className="w-full h-full object-contain pointer-events-none transition-transform duration-150 will-change-transform"
            />

            {/* Translucent backdrop masks outside the active crop region */}
            <div
              aria-hidden="true"
              className="absolute left-0 right-0 top-0 bg-slate-950/45 pointer-events-none"
              style={{ height: `${region.y}%` }}
            />
            <div
              aria-hidden="true"
              className="absolute left-0 right-0 bottom-0 bg-slate-950/45 pointer-events-none"
              style={{ top: `${region.y + region.height}%` }}
            />
            <div
              aria-hidden="true"
              className="absolute left-0 bg-slate-950/45 pointer-events-none"
              style={{
                top: `${region.y}%`,
                height: `${region.height}%`,
                width: `${region.x}%`,
              }}
            />
            <div
              aria-hidden="true"
              className="absolute right-0 bg-slate-950/45 pointer-events-none"
              style={{
                top: `${region.y}%`,
                height: `${region.height}%`,
                left: `${region.x + region.width}%`,
              }}
            />

            {/* Interactive rule-of-thirds optical crop frame */}
            <div
              role="group"
              tabIndex={0}
              aria-roledescription="crop frame"
              aria-label={`Crop frame at ${Math.round(region.x)}% by ${Math.round(region.y)}%, size ${Math.round(region.width)}% by ${Math.round(region.height)}%. Use arrow keys to move and Shift with arrow keys to resize.`}
              data-testid="crop-frame"
              data-dragging={dragMode ?? undefined}
              onPointerDown={(e) => startPointerInteraction('move', e)}
              onKeyDown={handleCropFrameKeyDown}
              style={{
                left: `${region.x}%`,
                top: `${region.y}%`,
                width: `${region.width}%`,
                height: `${region.height}%`,
                touchAction: 'none',
              }}
              className={cx(
                frameClass,
                'prism-focus-ring absolute border-2 border-white/95 shadow-lg touch-none',
                dragMode === 'move' ? 'cursor-grabbing' : 'cursor-grab'
              )}
            >
              {/* Rule-of-thirds optical hairline guides */}
              <span
                aria-hidden="true"
                className="absolute top-0 bottom-0 left-1/3 w-px bg-white/55 pointer-events-none"
              />
              <span
                aria-hidden="true"
                className="absolute top-0 bottom-0 left-2/3 w-px bg-white/55 pointer-events-none"
              />
              <span
                aria-hidden="true"
                className="absolute left-0 right-0 top-1/3 h-px bg-white/55 pointer-events-none"
              />
              <span
                aria-hidden="true"
                className="absolute left-0 right-0 top-2/3 h-px bg-white/55 pointer-events-none"
              />

              {/* Optical corner ticks */}
              <span
                aria-hidden="true"
                className="absolute -top-0.5 -left-0.5 w-3.5 h-3.5 border-t-[3px] border-l-[3px] border-[var(--prism-secondary-main)] pointer-events-none"
              />
              <span
                aria-hidden="true"
                className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 border-t-[3px] border-r-[3px] border-[var(--prism-secondary-main)] pointer-events-none"
              />
              <span
                aria-hidden="true"
                className="absolute -bottom-0.5 -left-0.5 w-3.5 h-3.5 border-b-[3px] border-l-[3px] border-[var(--prism-secondary-main)] pointer-events-none"
              />

              {/* Bottom-right interactive corner resize handle */}
              <button
                type="button"
                aria-label="Resize crop region"
                data-testid="crop-resize-handle"
                onPointerDown={(e) => startPointerInteraction('resize', e)}
                style={{ touchAction: 'none' }}
                className="prism-thumb prism-focus-ring absolute -bottom-2 -right-2 w-4 h-4 rounded-full border-2 border-[var(--prism-primary-main)] cursor-nwse-resize touch-none"
              />
            </div>
          </>
        ) : (
          <div
            role="status"
            data-testid="crop-fallback"
            className="w-full h-full flex flex-col items-center justify-center gap-2 p-6 text-center"
          >
            <div className="prism-crystal w-11 h-11 rounded-2xl flex items-center justify-center text-slate-600 dark:text-slate-300">
              <ImageOff className="w-5 h-5" aria-hidden="true" />
            </div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {isUnsafeUrl ? 'Blocked unsafe media URL' : 'Unable to load media preview'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
              {isUnsafeUrl
                ? 'Provide an http(s), relative, or raster data:image URI to enable optical cropping.'
                : 'The image source failed to load. Verify the URL or supply an alternative asset.'}
            </p>
          </div>
        )}
      </div>

      {/* Crystal Control Dock */}
      <div className={cx(dockClass, 'prism-crystal rounded-[20px] p-3 space-y-3')}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div
            role="group"
            aria-label="Aspect ratio"
            className="inline-flex flex-wrap items-center gap-1"
          >
            {ASPECT_OPTIONS.map((opt) => {
              const active = aspectRatio === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => handleAspectSelect(opt.id)}
                  className={cx(
                    'prism-focus-ring px-3 py-1.5 rounded-full text-xs font-semibold transition-[color,background-color,border-color,opacity,transform] cursor-pointer',
                    active
                      ? 'bg-[var(--prism-primary-main)] text-[var(--prism-primary-contrast)] shadow-sm'
                      : 'prism-well text-slate-700 dark:text-slate-200 hover:brightness-105'
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <div className="inline-flex items-center gap-1.5">
            <button
              type="button"
              aria-label="Rotate left 90 degrees"
              onClick={() => handleRotate(-90)}
              className="prism-well prism-focus-ring h-8 px-2.5 rounded-full inline-flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer hover:brightness-105"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="tabular-nums">-90°</span>
            </button>
            <button
              type="button"
              aria-label="Rotate right 90 degrees"
              onClick={() => handleRotate(90)}
              className="prism-well prism-focus-ring h-8 px-2.5 rounded-full inline-flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer hover:brightness-105"
            >
              <RotateCw className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="tabular-nums">+90°</span>
            </button>
            <button
              type="button"
              aria-label="Reset transform"
              onClick={handleReset}
              className="prism-well prism-focus-ring h-8 px-2.5 rounded-full inline-flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer hover:brightness-105"
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-[var(--prism-divider)]">
          <div className="flex items-center gap-2.5 flex-1 min-w-[180px]">
            <ZoomIn className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" aria-hidden="true" />
            <label
              htmlFor={zoomId}
              className="text-xs font-semibold text-slate-700 dark:text-slate-200 shrink-0"
            >
              Zoom
            </label>
            <input
              id={zoomId}
              type="range"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={ZOOM_STEP}
              value={zoom}
              onChange={(e) => handleZoomChange(Number(e.target.value))}
              className="prism-focus-ring flex-1 accent-[var(--prism-primary-main)] cursor-pointer"
            />
            <span
              data-testid="crop-zoom-readout"
              className="text-xs font-mono tabular-nums font-semibold text-slate-700 dark:text-slate-200 w-10 text-right shrink-0"
            >
              {zoom.toFixed(1)}x
            </span>
          </div>

          <button
            type="button"
            disabled={!hasRenderableImage}
            onClick={handleApply}
            className="prism-btn-primary prism-focus-ring h-9 px-5 inline-flex items-center justify-center gap-2 text-xs font-semibold whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check className="w-3.5 h-3.5 relative z-10" aria-hidden="true" />
            <span className="relative z-10">Apply Crop</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export const ImageCropper = /*#__PURE__*/ memoWithDisplayName(ImageCropperInner, 'ImageCropper');
