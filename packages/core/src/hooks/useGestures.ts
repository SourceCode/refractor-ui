'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createCoalescedPointerMove } from './useRafCallback';

/**
 * Cross-Device Gesture Recognizer Hook (`useGestures`)
 *
 * Unifies hover (cleanly ignoring touch pointers), tap (pointer + IME-safe keyboard
 * Enter/Space), focus, and drag with velocity tracking and momentum throwing.
 */

export interface GesturePoint {
  readonly x: number;
  readonly y: number;
}

export interface DragMomentumResult {
  readonly targetX: number;
  readonly targetY: number;
  readonly velocityX: number;
  readonly velocityY: number;
}

export interface DragBounds {
  minX?: number;
  maxX?: number;
  minY?: number;
  maxY?: number;
}

export interface UseGesturesOptions {
  disabled?: boolean;
  draggable?: boolean;
  dragBounds?: DragBounds;
  momentumFactor?: number;
  onHoverChange?: (hovered: boolean) => void;
  onTap?: () => void;
  onFocusChange?: (focused: boolean) => void;
  onDragMove?: (offset: GesturePoint) => void;
  onDragEnd?: (result: DragMomentumResult) => void;
}

export interface UseGesturesReturn {
  readonly isHovered: boolean;
  readonly isPressed: boolean;
  readonly isFocused: boolean;
  readonly isDragging: boolean;
  readonly offset: GesturePoint;
  readonly resetOffset: () => void;
  readonly handlers: {
    onPointerEnter: (event: React.PointerEvent<HTMLElement>) => void;
    onPointerLeave: (event: React.PointerEvent<HTMLElement>) => void;
    onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
    onPointerUp: (event: React.PointerEvent<HTMLElement>) => void;
    onPointerCancel: () => void;
    onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void;
    onKeyUp: (event: React.KeyboardEvent<HTMLElement>) => void;
    onFocus: () => void;
    onBlur: () => void;
  };
}

function clampBound(value: number, min?: number, max?: number): number {
  let next = value;
  if (min !== undefined && Number.isFinite(min)) next = Math.max(min, next);
  if (max !== undefined && Number.isFinite(max)) next = Math.min(max, next);
  return next;
}

/**
 * Computes damped momentum throw target from current offset and pointer release velocity.
 */
export function computeMomentumTarget(
  offset: GesturePoint,
  velocity: GesturePoint,
  momentumFactor = 0.22,
  bounds?: DragBounds
): DragMomentumResult {
  const safeFactor = Number.isFinite(momentumFactor) ? Math.min(1, Math.max(0, momentumFactor)) : 0.22;
  const targetX = Number(clampBound(offset.x + velocity.x * safeFactor, bounds?.minX, bounds?.maxX).toFixed(2));
  const targetY = Number(clampBound(offset.y + velocity.y * safeFactor, bounds?.minY, bounds?.maxY).toFixed(2));
  return {
    targetX,
    targetY,
    velocityX: Number(velocity.x.toFixed(2)),
    velocityY: Number(velocity.y.toFixed(2)),
  };
}

export function useGestures(options: UseGesturesOptions = {}): UseGesturesReturn {
  const {
    disabled = false,
    draggable = false,
    dragBounds,
    momentumFactor = 0.22,
    onHoverChange,
    onTap,
    onFocusChange,
    onDragMove,
    onDragEnd,
  } = options;

  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [offset, setOffset] = useState<GesturePoint>({ x: 0, y: 0 });

  const dragOriginRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number; lastX: number; lastY: number; lastTs: number; vx: number; vy: number } | null>(null);
  const offsetRef = useRef<GesturePoint>({ x: 0, y: 0 });

  const resetOffset = useCallback(() => {
    const zero: GesturePoint = { x: 0, y: 0 };
    offsetRef.current = zero;
    setOffset(zero);
  }, []);

  useEffect(() => {
    if (!isDragging || disabled) return;

    const coalescedMove = createCoalescedPointerMove((ev: PointerEvent) => {
      const origin = dragOriginRef.current;
      if (!origin) return;
      const now = performance.now();
      const dtSec = Math.max(0.008, (now - origin.lastTs) / 1000);
      const nextX = clampBound(origin.baseX + (ev.clientX - origin.startX), dragBounds?.minX, dragBounds?.maxX);
      const nextY = clampBound(origin.baseY + (ev.clientY - origin.startY), dragBounds?.minY, dragBounds?.maxY);
      origin.vx = (ev.clientX - origin.lastX) / dtSec;
      origin.vy = (ev.clientY - origin.lastY) / dtSec;
      origin.lastX = ev.clientX;
      origin.lastY = ev.clientY;
      origin.lastTs = now;
      const nextPoint: GesturePoint = { x: nextX, y: nextY };
      offsetRef.current = nextPoint;
      setOffset(nextPoint);
      onDragMove?.(nextPoint);
    });

    const handleWindowUp = () => {
      coalescedMove.cancel();
      const origin = dragOriginRef.current;
      dragOriginRef.current = null;
      setIsDragging(false);
      setIsPressed(false);
      if (origin) {
        const result = computeMomentumTarget(
          offsetRef.current,
          { x: origin.vx, y: origin.vy },
          momentumFactor,
          dragBounds
        );
        const thrown: GesturePoint = { x: result.targetX, y: result.targetY };
        offsetRef.current = thrown;
        setOffset(thrown);
        onDragEnd?.(result);
      }
    };

    window.addEventListener('pointermove', coalescedMove, { passive: true });
    window.addEventListener('pointerup', handleWindowUp, { passive: true });
    window.addEventListener('pointercancel', handleWindowUp, { passive: true });
    return () => {
      coalescedMove.cancel();
      window.removeEventListener('pointermove', coalescedMove);
      window.removeEventListener('pointerup', handleWindowUp);
      window.removeEventListener('pointercancel', handleWindowUp);
    };
  }, [isDragging, disabled, dragBounds, momentumFactor, onDragMove, onDragEnd]);

  const onPointerEnter = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (disabled || event.pointerType === 'touch') return;
      setIsHovered(true);
      onHoverChange?.(true);
    },
    [disabled, onHoverChange]
  );

  const onPointerLeave = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (event.pointerType === 'touch') return;
      setIsHovered(false);
      onHoverChange?.(false);
    },
    [onHoverChange]
  );

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (disabled) return;
      setIsPressed(true);
      if (draggable) {
        dragOriginRef.current = {
          startX: event.clientX,
          startY: event.clientY,
          baseX: offsetRef.current.x,
          baseY: offsetRef.current.y,
          lastX: event.clientX,
          lastY: event.clientY,
          lastTs: performance.now(),
          vx: 0,
          vy: 0,
        };
        setIsDragging(true);
      }
    },
    [disabled, draggable]
  );

  const onPointerUp = useCallback(() => {
    if (disabled) return;
    const wasDragging = isDragging;
    setIsPressed(false);
    if (!wasDragging) {
      onTap?.();
    }
  }, [disabled, isDragging, onTap]);

  const onPointerCancel = useCallback(() => {
    setIsPressed(false);
    setIsDragging(false);
    dragOriginRef.current = null;
  }, []);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      if (disabled || event.nativeEvent.isComposing) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        setIsPressed(true);
      }
    },
    [disabled]
  );

  const onKeyUp = useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      if (disabled || event.nativeEvent.isComposing) return;
      if (event.key === 'Enter' || event.key === ' ') {
        setIsPressed(false);
        onTap?.();
      }
    },
    [disabled, onTap]
  );

  const onFocus = useCallback(() => {
    if (disabled) return;
    setIsFocused(true);
    onFocusChange?.(true);
  }, [disabled, onFocusChange]);

  const onBlur = useCallback(() => {
    setIsFocused(false);
    setIsPressed(false);
    onFocusChange?.(false);
  }, [onFocusChange]);

  return {
    isHovered,
    isPressed,
    isFocused,
    isDragging,
    offset,
    resetOffset,
    handlers: {
      onPointerEnter,
      onPointerLeave,
      onPointerDown,
      onPointerUp,
      onPointerCancel,
      onKeyDown,
      onKeyUp,
      onFocus,
      onBlur,
    },
  };
}
