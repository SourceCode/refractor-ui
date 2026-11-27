'use client';

import { useLayoutEffect, useRef, type ReactNode } from 'react';
import type { BaseProps } from '../BaseProps';
import { useMergedRefs } from '../hooks/useMergedRefs';
import { animateHybrid } from '../motion/hybridEngine';
import type { MotionTokenName } from '../motion/motion.theme';
import { useMotionConfig } from '../motion/MotionConfigProvider';
import {
  computeScaleCorrectedRadius,
  computeScaleCorrectedShadow,
} from '../motion/springPhysics';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { memoWithDisplayName } from '../utils/memo';
import { mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';

export interface LayoutMotionBoxProps extends BaseProps<HTMLDivElement> {
  /** Enables FLIP scale-corrected layout animations on size/position/order changes. */
  animateLayout?: boolean;
  /** Optional dependency key that triggers a FLIP measurement & transition when changed. */
  layoutDependency?: string | number | boolean;
  /** Base border-radius in pixels to counter-scale during FLIP transitions (default: 16). */
  borderRadiusPx?: number;
  /** Elevation shadow depth in pixels to counter-scale during FLIP transitions (default: 16). */
  shadowElevationPx?: number;
  /** Semantic motion token controlling spring curve & duration (default: `'ui'`). */
  transitionToken?: MotionTokenName;
  children?: ReactNode;
}

const ROOT_CLASS = /*#__PURE__*/ stableClassName('layout-motion-box');

function LayoutMotionBoxInner({
  animateLayout = true,
  layoutDependency,
  borderRadiusPx = 16,
  shadowElevationPx = 16,
  transitionToken = 'ui',
  className,
  style,
  xstyle,
  ref,
  children,
  ...rest
}: LayoutMotionBoxProps) {
  const override = useComponentOverride('LayoutMotionBox');
  const { isCalmMotion } = useMotionConfig();
  const innerRef = useRef<HTMLDivElement | null>(null);
  const prevRectRef = useRef<DOMRect | null>(null);
  const mergedRef = useMergedRefs(innerRef, ref);

  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el || !animateLayout) return;

    const nextRect = el.getBoundingClientRect();
    const prevRect = prevRectRef.current;
    prevRectRef.current = nextRect;

    if (!prevRect || nextRect.width <= 0 || nextRect.height <= 0) return;

    const dx = prevRect.left - nextRect.left;
    const dy = prevRect.top - nextRect.top;
    const sx = prevRect.width > 0 ? prevRect.width / nextRect.width : 1;
    const sy = prevRect.height > 0 ? prevRect.height / nextRect.height : 1;

    const hasDelta =
      Math.abs(dx) > 0.5 ||
      Math.abs(dy) > 0.5 ||
      Math.abs(1 - sx) > 0.005 ||
      Math.abs(1 - sy) > 0.005;

    if (!hasDelta) return;

    const correctedRadius = computeScaleCorrectedRadius(borderRadiusPx, sx, sy);
    const correctedShadow = computeScaleCorrectedShadow(shadowElevationPx, sx, sy);
    const baseRadius = `${borderRadiusPx}px`;
    const baseShadow = computeScaleCorrectedShadow(shadowElevationPx, 1, 1);

    const handle = animateHybrid(
      el,
      [
        {
          transform: `translate3d(${dx}px, ${dy}px, 0) scale(${sx}, ${sy})`,
          borderRadius: correctedRadius.cssValue,
          boxShadow: correctedShadow,
          opacity: isCalmMotion ? 0.72 : 1,
        },
        {
          transform: 'translate3d(0px, 0px, 0) scale(1, 1)',
          borderRadius: baseRadius,
          boxShadow: baseShadow,
          opacity: 1,
        },
      ],
      {
        token: transitionToken,
        calmReducedMotion: isCalmMotion,
      }
    );

    return () => handle.cancel();
  }, [animateLayout, layoutDependency, borderRadiusPx, shadowElevationPx, transitionToken, isCalmMotion]);

  const merged = mergeProps({
    themeTarget: themeProps('LayoutMotionBox', {
      layout: animateLayout,
      token: transitionToken,
      calm: isCalmMotion,
    }),
    baseClassName: `${ROOT_CLASS} prism-slab`,
    overrideClassName: override?.className,
    userClassName: className,
    baseStyle: {
      borderRadius: `${borderRadiusPx}px`,
      transformOrigin: 'top left',
    },
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div ref={mergedRef} {...rest} {...merged}>
      {children}
    </div>
  );
}

export const LayoutMotionBox = /*#__PURE__*/ memoWithDisplayName(LayoutMotionBoxInner, 'LayoutMotionBox');
