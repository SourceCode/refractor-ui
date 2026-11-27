'use client';

import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import type { BaseProps } from '../BaseProps';
import { useMergedRefs } from '../hooks/useMergedRefs';
import { animateHybrid } from '../motion/hybridEngine';
import type { MotionTokenName } from '../motion/motion.theme';
import { useMotionConfig } from '../motion/MotionConfigProvider';
import { computeScaleCorrectedRadius } from '../motion/springPhysics';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { memoWithDisplayName } from '../utils/memo';
import { mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';

export interface SharedElementSnapshot {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
  readonly borderRadiusPx: number;
}

interface SharedLayoutRegistry {
  snapshots: Map<string, SharedElementSnapshot>;
}

const DEFAULT_REGISTRY: SharedLayoutRegistry = {
  snapshots: new Map<string, SharedElementSnapshot>(),
};

const SharedLayoutContext = /*#__PURE__*/ createContext<SharedLayoutRegistry>(DEFAULT_REGISTRY);

export interface SharedLayoutProviderProps {
  children: ReactNode;
}

/**
 * Provides an isolated shared-element geometry registry for `SharedElementTransition`
 * children sharing a `layoutId` across tabs, cards, modals, or command palettes.
 */
export function SharedLayoutProvider({ children }: SharedLayoutProviderProps) {
  const registry = useMemo<SharedLayoutRegistry>(
    () => ({ snapshots: new Map<string, SharedElementSnapshot>() }),
    []
  );
  return <SharedLayoutContext value={registry}>{children}</SharedLayoutContext>;
}

export interface SharedElementTransitionProps extends BaseProps<HTMLDivElement> {
  /** Shared identifier linking departing and arriving elements across view/state changes. */
  layoutId: string;
  /** Base border-radius in pixels counter-scaled during the shared morph (default: 14). */
  borderRadiusPx?: number;
  /** Semantic motion token (default: `'ui'`). */
  transitionToken?: MotionTokenName;
  children?: ReactNode;
}

const ROOT_CLASS = /*#__PURE__*/ stableClassName('shared-element-transition');

function SharedElementTransitionInner({
  layoutId,
  borderRadiusPx = 14,
  transitionToken = 'ui',
  className,
  style,
  xstyle,
  ref,
  children,
  ...rest
}: SharedElementTransitionProps) {
  const override = useComponentOverride('SharedElementTransition');
  const registry = useContext(SharedLayoutContext);
  const { isCalmMotion } = useMotionConfig();
  const innerRef = useRef<HTMLDivElement | null>(null);
  const mergedRef = useMergedRefs(innerRef, ref);

  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;

    const nextRect = el.getBoundingClientRect();
    const prev = registry.snapshots.get(layoutId);
    let animCancel: (() => void) | null = null;

    if (prev && nextRect.width > 0 && nextRect.height > 0) {
      const dx = prev.left - nextRect.left;
      const dy = prev.top - nextRect.top;
      const sx = prev.width > 0 ? prev.width / nextRect.width : 1;
      const sy = prev.height > 0 ? prev.height / nextRect.height : 1;
      const hasDelta =
        Math.abs(dx) > 0.5 ||
        Math.abs(dy) > 0.5 ||
        Math.abs(1 - sx) > 0.005 ||
        Math.abs(1 - sy) > 0.005;

      if (hasDelta) {
        const startRadius = computeScaleCorrectedRadius(prev.borderRadiusPx, sx, sy);
        const handle = animateHybrid(
          el,
          [
            {
              transform: `translate3d(${dx}px, ${dy}px, 0) scale(${sx}, ${sy})`,
              borderRadius: startRadius.cssValue,
              opacity: isCalmMotion ? 0.25 : 1,
            },
            {
              transform: 'translate3d(0px, 0px, 0) scale(1, 1)',
              borderRadius: `${borderRadiusPx}px`,
              opacity: 1,
            },
          ],
          { token: transitionToken, calmReducedMotion: isCalmMotion }
        );
        animCancel = handle.cancel;
      }
    }

    registry.snapshots.set(layoutId, {
      left: nextRect.left,
      top: nextRect.top,
      width: nextRect.width,
      height: nextRect.height,
      borderRadiusPx,
    });

    return () => {
      animCancel?.();
      const departingRect = el.getBoundingClientRect();
      if (departingRect.width > 0 && departingRect.height > 0) {
        registry.snapshots.set(layoutId, {
          left: departingRect.left,
          top: departingRect.top,
          width: departingRect.width,
          height: departingRect.height,
          borderRadiusPx,
        });
      }
    };
  }, [layoutId, borderRadiusPx, transitionToken, isCalmMotion, registry]);

  const merged = mergeProps({
    themeTarget: themeProps('SharedElementTransition', {
      token: transitionToken,
      calm: isCalmMotion,
    }),
    baseClassName: ROOT_CLASS,
    overrideClassName: override?.className,
    userClassName: className,
    baseStyle: { borderRadius: `${borderRadiusPx}px`, transformOrigin: 'top left' },
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div ref={mergedRef} data-layout-id={layoutId} {...rest} {...merged}>
      {children}
    </div>
  );
}

export const SharedElementTransition = /*#__PURE__*/ memoWithDisplayName(SharedElementTransitionInner, 'SharedElementTransition');
