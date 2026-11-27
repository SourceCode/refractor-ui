'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import type { BaseProps } from '../BaseProps';
import { useMergedRefs } from '../hooks/useMergedRefs';
import { createCoalescedPointerMove } from '../hooks/useRafCallback';
import { useMotionConfig } from '../motion/MotionConfigProvider';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { memoWithDisplayName } from '../utils/memo';
import { mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';

export interface MagneticCursorProps extends BaseProps<HTMLDivElement> {
  /** Base cursor reticle diameter in pixels when idle (default: 24). */
  baseSizePx?: number;
  /** Magnetic pull strength [0..1] toward nearby `[data-magnetic-target]` bounds (default: 0.35). */
  magneticStrength?: number;
  /** CSS selector for magnetic snap targets (default: `'[data-magnetic-target]'`). */
  targetSelector?: string;
  /** Disables magnetic tracking & reticle rendering. */
  disabled?: boolean;
  children?: ReactNode;
}

const ROOT_CLASS = /*#__PURE__*/ stableClassName('magnetic-cursor');
const RETICLE_CLASS = /*#__PURE__*/ stableClassName('magnetic-cursor', 'reticle');

function MagneticCursorInner({
  baseSizePx = 24,
  magneticStrength = 0.35,
  targetSelector = '[data-magnetic-target]',
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  children,
  ...rest
}: MagneticCursorProps) {
  const override = useComponentOverride('MagneticCursor');
  const { isCalmMotion } = useMotionConfig();
  const stageRef = useRef<HTMLDivElement | null>(null);
  const reticleRef = useRef<HTMLDivElement | null>(null);
  const mergedRef = useMergedRefs(stageRef, ref);

  const safeSize = Number.isFinite(baseSizePx) ? Math.min(64, Math.max(12, baseSizePx)) : 24;
  const safeStrength = Number.isFinite(magneticStrength)
    ? Math.min(1, Math.max(0, magneticStrength))
    : 0.35;

  useEffect(() => {
    const stage = stageRef.current;
    const reticle = reticleRef.current;
    if (!stage || !reticle || disabled || isCalmMotion) return;

    const handleMove = createCoalescedPointerMove((event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      const stageRect = stage.getBoundingClientRect();
      const relX = event.clientX - stageRect.left;
      const relY = event.clientY - stageRect.top;

      let targetW = safeSize;
      let targetH = safeSize;
      let targetX = relX;
      let targetY = relY;
      let radius = '9999px';
      let snapped = false;

      const hit = (event.target as Element | null)?.closest?.(targetSelector);
      if (hit && stage.contains(hit)) {
        const hitRect = hit.getBoundingClientRect();
        const centerX = hitRect.left - stageRect.left + hitRect.width / 2;
        const centerY = hitRect.top - stageRect.top + hitRect.height / 2;
        targetX = relX + (centerX - relX) * safeStrength;
        targetY = relY + (centerY - relY) * safeStrength;
        targetW = Math.max(safeSize, hitRect.width + 8);
        targetH = Math.max(safeSize, hitRect.height + 8);
        const computed = window.getComputedStyle(hit);
        radius = computed.borderRadius || '12px';
        snapped = true;
      }

      reticle.style.setProperty('--prism-cursor-x', `${targetX.toFixed(1)}px`);
      reticle.style.setProperty('--prism-cursor-y', `${targetY.toFixed(1)}px`);
      reticle.style.setProperty('--prism-cursor-w', `${targetW.toFixed(1)}px`);
      reticle.style.setProperty('--prism-cursor-h', `${targetH.toFixed(1)}px`);
      reticle.style.setProperty('--prism-cursor-r', radius);
      reticle.setAttribute('data-snapped', snapped ? 'true' : 'false');
      reticle.style.opacity = '1';
    });

    const handleLeave = () => {
      handleMove.cancel();
      reticle.style.opacity = '0';
      reticle.setAttribute('data-snapped', 'false');
    };

    stage.addEventListener('pointermove', handleMove, { passive: true });
    stage.addEventListener('pointerleave', handleLeave, { passive: true });

    return () => {
      handleMove.cancel();
      stage.removeEventListener('pointermove', handleMove);
      stage.removeEventListener('pointerleave', handleLeave);
    };
  }, [disabled, isCalmMotion, safeSize, safeStrength, targetSelector]);

  const merged = mergeProps({
    themeTarget: themeProps('MagneticCursor', {
      disabled,
      calm: isCalmMotion,
    }),
    baseClassName: `${ROOT_CLASS} relative overflow-hidden`,
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div ref={mergedRef} {...rest} {...merged}>
      {children}
      {!disabled && !isCalmMotion ? (
        <div
          ref={reticleRef}
          aria-hidden="true"
          data-snapped="false"
          className={`${RETICLE_CLASS} pointer-events-none absolute top-0 left-0 z-20`}
          style={{
            width: `var(--prism-cursor-w, ${safeSize}px)`,
            height: `var(--prism-cursor-h, ${safeSize}px)`,
            borderRadius: 'var(--prism-cursor-r, 9999px)',
            transform:
              'translate3d(calc(var(--prism-cursor-x, -100px) - 50%), calc(var(--prism-cursor-y, -100px) - 50%), 0)',
            border: '1.5px solid rgba(var(--prism-primary-rgb), 0.72)',
            background: 'rgba(var(--prism-primary-rgb), 0.08)',
            boxShadow: '0 0 18px rgba(var(--prism-primary-rgb), 0.25)',
            opacity: 0,
            transition: 'width 160ms ease-out, height 160ms ease-out, border-radius 160ms ease-out, opacity 140ms ease-out',
          }}
        />
      ) : null}
    </div>
  );
}

export const MagneticCursor = /*#__PURE__*/ memoWithDisplayName(MagneticCursorInner, 'MagneticCursor');
