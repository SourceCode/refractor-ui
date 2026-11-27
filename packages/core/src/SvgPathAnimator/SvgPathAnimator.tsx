'use client';

import { useEffect, useState } from 'react';
import type { BaseProps } from '../BaseProps';
import { useMotionConfig } from '../motion/MotionConfigProvider';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { memoWithDisplayName } from '../utils/memo';
import { mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';

export type SvgAnimatorPreset = 'checkmark' | 'ring' | 'sparkline' | 'prism-loader';

export type SvgViewBoxTuple = readonly [number, number, number, number];

export interface SvgPathAnimatorProps extends BaseProps<HTMLDivElement> {
  /** Built-in vector preset when custom `pathData` is omitted. */
  preset?: SvgAnimatorPreset;
  /** Custom SVG path `d` attribute string. */
  pathData?: string;
  /** Normalized draw progress in [0..1] (default: 1). */
  progress?: number;
  /** Target SVG `viewBox` tuple `[minX, minY, width, height]`. */
  viewBox?: SvgViewBoxTuple;
  /** Stroke width in SVG user units (default: 4). */
  strokeWidth?: number;
  /** Rendered width/height size in pixels (default: 84). */
  sizePx?: number;
  /** Accessible label describing the animated graphic. */
  label?: string;
}

const ROOT_CLASS = /*#__PURE__*/ stableClassName('svg-path-animator');
const SVG_CLASS = /*#__PURE__*/ stableClassName('svg-path-animator', 'svg');

const PRESET_PATHS: Readonly<Record<SvgAnimatorPreset, string>> = /*#__PURE__*/ Object.freeze({
  checkmark: 'M 18 52 L 40 74 L 82 26',
  ring: 'M 50 12 A 38 38 0 1 1 49.99 12 Z',
  sparkline: 'M 8 74 L 26 56 L 42 64 L 62 30 L 76 42 L 92 18',
  'prism-loader': 'M 50 10 L 88 32 L 88 68 L 50 90 L 12 68 L 12 32 Z',
});

const DEFAULT_VIEWBOX: SvgViewBoxTuple = /*#__PURE__*/ Object.freeze([0, 0, 100, 100]);

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(1, Math.max(0, value));
}

function SvgPathAnimatorInner({
  preset = 'checkmark',
  pathData,
  progress = 1,
  viewBox = DEFAULT_VIEWBOX,
  strokeWidth = 4,
  sizePx = 84,
  label = 'Animated optical vector path',
  className,
  style,
  xstyle,
  ref,
  ...rest
}: SvgPathAnimatorProps) {
  const override = useComponentOverride('SvgPathAnimator');
  const { isCalmMotion, getToken } = useMotionConfig();
  const token = getToken('ui');
  const safeProgress = clamp01(progress);
  const safeSize = Number.isFinite(sizePx) ? Math.min(240, Math.max(32, sizePx)) : 84;
  const safeStroke = Number.isFinite(strokeWidth) ? Math.min(12, Math.max(1, strokeWidth)) : 4;
  const [vb, setVb] = useState<SvgViewBoxTuple>(viewBox);

  useEffect(() => {
    setVb(viewBox);
  }, [viewBox]);

  const d = pathData ?? PRESET_PATHS[preset];
  const viewBoxStr = `${vb[0]} ${vb[1]} ${vb[2]} ${vb[3]}`;
  const dashOffset = Number((1 - safeProgress).toFixed(4));

  const merged = mergeProps({
    themeTarget: themeProps('SvgPathAnimator', {
      preset,
      calm: isCalmMotion,
    }),
    baseClassName: `${ROOT_CLASS} inline-flex items-center justify-center rounded-2xl prism-slab p-2`,
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div
      ref={ref}
      role="img"
      aria-label={label}
      {...rest}
      {...merged}
      data-progress={String(Math.round(safeProgress * 100))}
    >
      <svg
        width={safeSize}
        height={safeSize}
        viewBox={viewBoxStr}
        className={`${SVG_CLASS} prism-contain-box`}
        fill="none"
        aria-hidden="true"
      >
        <path
          d={d}
          stroke="var(--prism-border-divider)"
          strokeWidth={safeStroke}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.35}
        />
        <path
          d={d}
          pathLength={1}
          stroke="var(--prism-primary)"
          strokeWidth={safeStroke}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="1"
          strokeDashoffset={dashOffset}
          style={{
            transition: isCalmMotion
              ? `opacity ${token.calmOpacityMs}ms ease-out`
              : `stroke-dashoffset ${token.durationMs}ms ${token.cssEasing}`,
          }}
        />
      </svg>
    </div>
  );
}

export const SvgPathAnimator = /*#__PURE__*/ memoWithDisplayName(SvgPathAnimatorInner, 'SvgPathAnimator');
