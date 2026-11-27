'use client';

import { useCallback, useState } from 'react';
import type { BaseProps } from '../BaseProps';
import { useMotionConfig } from '../motion/MotionConfigProvider';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { memoWithDisplayName } from '../utils/memo';
import { mergeProps } from '../utils/mergeProps';
import { STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type GalleryViewMode = 'grid-2d' | 'carousel-3d' | 'coverflow-3d' | 'detail';

export interface GalleryMediaItem {
  readonly id: string;
  readonly title: string;
  readonly caption?: string;
  readonly badge?: string;
  readonly imageUrl?: string;
}

export interface MorphingMediaGalleryProps extends BaseProps<HTMLDivElement> {
  /** Media items rendered across 2D grid, 3D carousel, coverflow, and detail views. */
  items: ReadonlyArray<GalleryMediaItem>;
  /** Initial or controlled layout arrangement (default: `'carousel-3d'`). */
  viewMode?: GalleryViewMode;
  /** Callback invoked when view mode changes. */
  onViewModeChange?: (mode: GalleryViewMode) => void;
  /** Controlled active item index. */
  activeIndex?: number;
  /** Callback invoked when selected item changes. */
  onActiveIndexChange?: (index: number) => void;
}

const ROOT_CLASS = /*#__PURE__*/ stableClassName('morphing-media-gallery');
const TOOLBAR_CLASS = /*#__PURE__*/ stableClassName('morphing-media-gallery', 'toolbar');
const STAGE_CLASS = /*#__PURE__*/ stableClassName('morphing-media-gallery', 'stage');
const CARD_CLASS = /*#__PURE__*/ stableClassName('morphing-media-gallery', 'card');

const VIEW_MODES: ReadonlyArray<{ id: GalleryViewMode; label: string }> = /*#__PURE__*/ Object.freeze([
  { id: 'grid-2d', label: '2D Grid' },
  { id: 'carousel-3d', label: '3D Carousel' },
  { id: 'coverflow-3d', label: 'Coverflow' },
  { id: 'detail', label: 'Detail' },
]);

function MorphingMediaGalleryInner({
  items,
  viewMode: controlledMode,
  onViewModeChange,
  activeIndex: controlledIndex,
  onActiveIndexChange,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: MorphingMediaGalleryProps) {
  const override = useComponentOverride('MorphingMediaGallery');
  const { isCalmMotion } = useMotionConfig();
  const [internalMode, setInternalMode] = useState<GalleryViewMode>('carousel-3d');
  const [internalIndex, setInternalIndex] = useState(0);

  const mode = controlledMode ?? internalMode;
  const activeIdx =
    items.length > 0
      ? Math.min(items.length - 1, Math.max(0, controlledIndex ?? internalIndex))
      : 0;

  const setMode = useCallback(
    (next: GalleryViewMode) => {
      if (controlledMode === undefined) setInternalMode(next);
      onViewModeChange?.(next);
    },
    [controlledMode, onViewModeChange]
  );

  const setIndex = useCallback(
    (next: number) => {
      if (items.length === 0) return;
      const wrapped = ((next % items.length) + items.length) % items.length;
      if (controlledIndex === undefined) setInternalIndex(wrapped);
      onActiveIndexChange?.(wrapped);
    },
    [controlledIndex, items.length, onActiveIndexChange]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.nativeEvent.isComposing || items.length === 0) return;
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        setIndex(activeIdx + 1);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setIndex(activeIdx - 1);
      } else if (event.key === 'Escape' && mode === 'detail') {
        event.preventDefault();
        setMode('grid-2d');
      }
    },
    [activeIdx, items.length, mode, setIndex, setMode]
  );

  const merged = mergeProps({
    themeTarget: themeProps('MorphingMediaGallery', {
      viewMode: mode,
      calm: isCalmMotion,
    }),
    baseClassName: `${ROOT_CLASS} prism-slab prism-focus-prismatic rounded-2xl p-4`,
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const activeItem = items[activeIdx];

  return (
    <div
      ref={ref}
      role="region"
      aria-label="Morphing Media Gallery"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      {...rest}
      {...merged}
    >
      <div className={`${TOOLBAR_CLASS} mb-3 flex flex-wrap items-center justify-between gap-2`}>
        <div className="inline-flex flex-wrap gap-1" role="tablist" aria-label="Gallery view modes">
          {VIEW_MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={mode === m.id}
              onClick={() => setMode(m.id)}
              className={`prism-focus-prismatic rounded-full px-2.5 py-1 text-xs font-medium cursor-pointer ${
                mode === m.id ? 'prism-btn-primary' : 'prism-btn-secondary'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="inline-flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Previous media item"
            onClick={() => setIndex(activeIdx - 1)}
            className="prism-btn-secondary prism-focus-prismatic rounded-full px-2.5 py-1 text-xs cursor-pointer"
          >
            Prev
          </button>
          <span className="text-[11px] font-mono tabular-nums" style={STYLE_TEXT_SECONDARY}>
            {items.length > 0 ? `${activeIdx + 1} / ${items.length}` : '0 / 0'}
          </span>
          <button
            type="button"
            aria-label="Next media item"
            onClick={() => setIndex(activeIdx + 1)}
            className="prism-btn-secondary prism-focus-prismatic rounded-full px-2.5 py-1 text-xs cursor-pointer"
          >
            Next
          </button>
        </div>
      </div>

      {mode === 'detail' && activeItem ? (
        <div className={`${STAGE_CLASS} rounded-xl p-4 border`} style={{ borderColor: 'var(--prism-border-divider)' }}>
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-semibold" style={STYLE_TEXT_PRIMARY}>
              {activeItem.title}
            </h4>
            {activeItem.badge ? (
              <span className="text-[11px] font-mono" style={STYLE_TEXT_SECONDARY}>
                {activeItem.badge}
              </span>
            ) : null}
          </div>
          {activeItem.caption ? (
            <p className="mt-1.5 text-xs" style={STYLE_TEXT_SECONDARY}>
              {activeItem.caption}
            </p>
          ) : null}
        </div>
      ) : (
        <div
          className={`${STAGE_CLASS} ${
            mode === 'grid-2d'
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'
              : 'relative min-h-[156px] flex items-center justify-center overflow-hidden'
          }`}
          style={mode === 'grid-2d' ? undefined : { perspective: '900px' }}
        >
          {items.map((item, idx) => {
            const delta = idx - activeIdx;
            const absDelta = Math.abs(delta);
            const isSelected = idx === activeIdx;
            const is3d = mode !== 'grid-2d';
            const cardTransform =
              !is3d || isCalmMotion
                ? undefined
                : mode === 'coverflow-3d'
                  ? `translate3d(${delta * 84}px, 0, ${-absDelta * 64}px) rotateY(${delta * -26}deg) scale(${Math.max(0.76, 1 - absDelta * 0.12)})`
                  : `translate3d(${delta * 108}px, 0, ${-absDelta * 48}px) rotateY(${delta * -12}deg) scale(${Math.max(0.82, 1 - absDelta * 0.08)})`;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (isSelected && is3d) {
                    setMode('detail');
                  } else {
                    setIndex(idx);
                  }
                }}
                aria-pressed={isSelected}
                className={`${CARD_CLASS} prism-crystal prism-focus-prismatic rounded-xl p-3 text-left cursor-pointer ${
                  is3d ? 'absolute w-[220px]' : 'w-full'
                }`}
                style={{
                  transform: cardTransform,
                  opacity: is3d ? Math.max(0.35, 1 - absDelta * 0.25) : 1,
                  zIndex: is3d ? items.length - absDelta : undefined,
                  transition: 'transform 260ms ease-out, opacity 220ms ease-out',
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold truncate" style={STYLE_TEXT_PRIMARY}>
                    {item.title}
                  </span>
                  {item.badge ? (
                    <span className="text-[10px] font-mono shrink-0" style={STYLE_TEXT_SECONDARY}>
                      {item.badge}
                    </span>
                  ) : null}
                </div>
                {item.caption ? (
                  <p className="mt-1 text-[11px] line-clamp-2" style={STYLE_TEXT_SECONDARY}>
                    {item.caption}
                  </p>
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export const MorphingMediaGallery = /*#__PURE__*/ memoWithDisplayName(MorphingMediaGalleryInner, 'MorphingMediaGallery');
