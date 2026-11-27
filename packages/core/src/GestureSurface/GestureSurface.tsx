'use client';

import type { ReactNode } from 'react';
import type { BaseProps } from '../BaseProps';
import {
  useGestures,
  type DragBounds,
  type DragMomentumResult,
  type GesturePoint,
} from '../hooks/useGestures';
import { useMotionConfig } from '../motion/MotionConfigProvider';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { composeEventHandlers } from '../utils/composeEventHandlers';
import { memoWithDisplayName } from '../utils/memo';
import { mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';

export type GestureSurfaceBaseProps = Omit<BaseProps<HTMLDivElement>, 'onDragEnd'>;

export interface GestureSurfaceProps extends GestureSurfaceBaseProps {
  /** Disables hover, tap, focus, and drag recognizers. */
  disabled?: boolean;
  /** Enables pointer drag with momentum throwing. */
  draggable?: boolean;
  /** Optional x/y drag clamping bounds in pixels. */
  dragBounds?: DragBounds;
  /** Momentum throw multiplier [0..1] (default: 0.22). */
  momentumFactor?: number;
  /** Fired on pointer tap or IME-safe keyboard Enter/Space press. */
  onTap?: () => void;
  /** Fired on non-touch hover enter/leave. */
  onHoverChange?: (hovered: boolean) => void;
  /** Fired during drag with current x/y offset. */
  onDragMove?: (offset: GesturePoint) => void;
  /** Fired on drag release with computed momentum target. */
  onDragEnd?: (result: DragMomentumResult) => void;
  children?: ReactNode;
}

const ROOT_CLASS = /*#__PURE__*/ stableClassName('gesture-surface');

function GestureSurfaceInner({
  disabled = false,
  draggable = false,
  dragBounds,
  momentumFactor = 0.22,
  onTap,
  onHoverChange,
  onDragMove,
  onDragEnd,
  onPointerEnter,
  onPointerLeave,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  onKeyDown,
  onKeyUp,
  onFocus,
  onBlur,
  className,
  style,
  xstyle,
  ref,
  children,
  ...rest
}: GestureSurfaceProps) {
  const override = useComponentOverride('GestureSurface');
  const { isCalmMotion, getToken } = useMotionConfig();
  const snap = getToken('snap');

  const { isHovered, isPressed, isFocused, isDragging, offset, handlers } = useGestures({
    disabled,
    draggable,
    dragBounds,
    momentumFactor,
    onTap,
    onHoverChange,
    onDragMove,
    onDragEnd,
  });

  const scale = isCalmMotion ? 1 : isPressed ? 0.97 : isHovered ? 1.015 : 1;
  const transform = `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`;

  const merged = mergeProps({
    themeTarget: themeProps('GestureSurface', {
      hovered: isHovered,
      pressed: isPressed,
      focused: isFocused,
      dragging: isDragging,
      disabled,
    }),
    baseClassName: `${ROOT_CLASS} prism-slab prism-focus-prismatic select-none ${
      disabled ? 'opacity-55 cursor-not-allowed' : draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
    }`,
    overrideClassName: override?.className,
    userClassName: className,
    baseStyle: {
      transform,
      transition: isDragging
        ? 'none'
        : `transform ${isCalmMotion ? snap.calmOpacityMs : snap.durationMs}ms ${snap.cssEasing}`,
      touchAction: draggable ? 'none' : undefined,
    },
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div
      ref={ref}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled || undefined}
      {...rest}
      {...merged}
      onPointerEnter={composeEventHandlers(handlers.onPointerEnter, onPointerEnter)}
      onPointerLeave={composeEventHandlers(handlers.onPointerLeave, onPointerLeave)}
      onPointerDown={composeEventHandlers(handlers.onPointerDown, onPointerDown)}
      onPointerUp={composeEventHandlers(handlers.onPointerUp, onPointerUp)}
      onPointerCancel={composeEventHandlers(handlers.onPointerCancel, onPointerCancel)}
      onKeyDown={composeEventHandlers(handlers.onKeyDown, onKeyDown)}
      onKeyUp={composeEventHandlers(handlers.onKeyUp, onKeyUp)}
      onFocus={composeEventHandlers(handlers.onFocus, onFocus)}
      onBlur={composeEventHandlers(handlers.onBlur, onBlur)}
    >
      {children}
    </div>
  );
}

export const GestureSurface = /*#__PURE__*/ memoWithDisplayName(GestureSurfaceInner, 'GestureSurface');
