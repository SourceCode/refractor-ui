'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { BaseProps } from '../BaseProps';
import { useMergedRefs } from '../hooks/useMergedRefs';
import { createCoalescedPointerMove } from '../hooks/useRafCallback';
import { useMotionConfig } from '../motion/MotionConfigProvider';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { memoWithDisplayName } from '../utils/memo';
import { mergeProps } from '../utils/mergeProps';
import { STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type SpatialDepthPattern = 'depth-deck' | 'spin-blur' | 'deeper-elements';

export interface SpatialDeckLayer {
  readonly id: string;
  readonly title: string;
  readonly subtitle?: string;
  readonly depthPx?: number;
  readonly content?: ReactNode;
}

export interface SpatialDepthDeckProps extends BaseProps<HTMLDivElement> {
  /** Stacked spatial layers rendered with GPU 3D perspective. */
  layers: ReadonlyArray<SpatialDeckLayer>;
  /** 3D spatial pattern: `'depth-deck'`, `'spin-blur'`, or `'deeper-elements'`. */
  pattern?: SpatialDepthPattern;
  /** Active front-facing layer index. */
  activeIndex?: number;
  /** Callback when active layer changes via click or keyboard arrows. */
  onActiveIndexChange?: (index: number) => void;
  /** CSS perspective distance in pixels (default: 960). */
  perspectivePx?: number;
  /** Maximum pointer-driven tilt in degrees (default: 10). */
  maxTiltDeg?: number;
}

const ROOT_CLASS = /*#__PURE__*/ stableClassName('spatial-depth-deck');
const STAGE_CLASS = /*#__PURE__*/ stableClassName('spatial-depth-deck', 'stage');
const LAYER_CLASS = /*#__PURE__*/ stableClassName('spatial-depth-deck', 'layer');

function SpatialDepthDeckInner({
  layers,
  pattern = 'depth-deck',
  activeIndex: controlledIndex,
  onActiveIndexChange,
  perspectivePx = 960,
  maxTiltDeg = 10,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: SpatialDepthDeckProps) {
  const override = useComponentOverride('SpatialDepthDeck');
  const { isCalmMotion } = useMotionConfig();
  const [internalIndex, setInternalIndex] = useState(0);
  const currentIndex = controlledIndex !== undefined ? controlledIndex : internalIndex;
  const safeIndex = layers.length > 0 ? Math.min(layers.length - 1, Math.max(0, currentIndex)) : 0;

  const rootRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const mergedRef = useMergedRefs(rootRef, ref);

  const selectIndex = useCallback(
    (next: number) => {
      if (layers.length === 0) return;
      const wrapped = ((next % layers.length) + layers.length) % layers.length;
      if (controlledIndex === undefined) setInternalIndex(wrapped);
      onActiveIndexChange?.(wrapped);
    },
    [controlledIndex, layers.length, onActiveIndexChange]
  );

  useEffect(() => {
    const root = rootRef.current;
    const stage = stageRef.current;
    if (!root || !stage || isCalmMotion) return;

    const handleMove = createCoalescedPointerMove((event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      const rect = root.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = ((event.clientY - rect.top) / rect.height) * 2 - 1;
      const rx = (-ny * maxTiltDeg).toFixed(2);
      const ry = (nx * maxTiltDeg).toFixed(2);
      stage.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
    });

    const handleLeave = () => {
      handleMove.cancel();
      stage.style.transform = 'rotateX(0deg) rotateY(0deg)';
    };

    root.addEventListener('pointermove', handleMove, { passive: true });
    root.addEventListener('pointerleave', handleLeave, { passive: true });
    return () => {
      handleMove.cancel();
      root.removeEventListener('pointermove', handleMove);
      root.removeEventListener('pointerleave', handleLeave);
    };
  }, [isCalmMotion, maxTiltDeg]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.nativeEvent.isComposing || layers.length === 0) return;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        event.preventDefault();
        selectIndex(safeIndex + 1);
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        event.preventDefault();
        selectIndex(safeIndex - 1);
      }
    },
    [layers.length, safeIndex, selectIndex]
  );

  const merged = mergeProps({
    themeTarget: themeProps('SpatialDepthDeck', {
      pattern,
      calm: isCalmMotion,
    }),
    baseClassName: `${ROOT_CLASS} prism-focus-prismatic relative rounded-2xl p-4`,
    overrideClassName: override?.className,
    userClassName: className,
    baseStyle: { perspective: `${Math.max(320, perspectivePx)}px` },
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div
      ref={mergedRef}
      role="region"
      aria-label="3D Spatial Depth Deck"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      {...rest}
      {...merged}
    >
      <div
        ref={stageRef}
        className={`${STAGE_CLASS} relative min-h-[168px] flex items-center justify-center`}
        style={{
          transformStyle: isCalmMotion ? 'flat' : 'preserve-3d',
          transition: 'transform 220ms ease-out',
        }}
      >
        {layers.map((layer, index) => {
          const offset = index - safeIndex;
          const absOffset = Math.abs(offset);
          const zDepth = layer.depthPx ?? -absOffset * 38;
          const xShift = pattern === 'deeper-elements' ? offset * 18 : offset * 28;
          const yShift = pattern === 'depth-deck' ? absOffset * 8 : 0;
          const rotY = pattern === 'spin-blur' ? offset * 18 : offset * 6;
          const scale = Math.max(0.84, 1 - absOffset * 0.06);
          const isFront = index === safeIndex;

          const transform = isCalmMotion
            ? 'none'
            : `translate3d(${xShift}px, ${yShift}px, ${zDepth}px) rotateY(${rotY}deg) scale(${scale})`;

          return (
            <button
              key={layer.id}
              type="button"
              onClick={() => selectIndex(index)}
              aria-pressed={isFront}
              className={`${LAYER_CLASS} prism-slab prism-focus-prismatic absolute w-[86%] max-w-[320px] rounded-2xl p-4 text-left cursor-pointer`}
              style={{
                transform,
                opacity: isFront ? 1 : Math.max(0.45, 0.85 - absOffset * 0.18),
                zIndex: layers.length - absOffset,
                filter:
                  !isCalmMotion && pattern === 'spin-blur' && !isFront
                    ? `blur(${Math.min(4, absOffset * 1.5)}px)`
                    : undefined,
                transition: 'transform 260ms ease-out, opacity 220ms ease-out',
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold" style={STYLE_TEXT_PRIMARY}>
                  {layer.title}
                </span>
                <span className="text-[10px] font-mono opacity-75" style={STYLE_TEXT_SECONDARY}>
                  Z:{zDepth}px
                </span>
              </div>
              {layer.subtitle ? (
                <p className="mt-1 text-xs" style={STYLE_TEXT_SECONDARY}>
                  {layer.subtitle}
                </p>
              ) : null}
              {layer.content ? <div className="mt-2">{layer.content}</div> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export const SpatialDepthDeck = /*#__PURE__*/ memoWithDisplayName(SpatialDepthDeckInner, 'SpatialDepthDeck');
