'use client';

import {
  memo,
  useCallback,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type SwipeActionTone = 'primary' | 'secondary' | 'emerald' | 'amber' | 'rose';

export interface SwipeActionItem {
  /** Unique identifier for this swipe action. */
  id: string;
  /** Visible action label rendered as literal text. */
  label: string;
  /** Optional leading icon rendered inside the action capsule. */
  icon?: ReactNode;
  /** Semantic optical tone mapped exclusively to `--prism-*` tokens (defaults to 'secondary'). */
  tone?: SwipeActionTone;
  /** Callback fired when the action button is activated. */
  onTrigger?: () => void;
}

export type SwipeRevealSide = 'none' | 'left' | 'right';

export interface SwipeableActionRowProps extends BaseProps<HTMLDivElement> {
  /** Foreground row content displayed inside the draggable optical card. */
  children: ReactNode;
  /** Actions revealed in the left tray when swiping right. */
  leftActions?: SwipeActionItem[];
  /** Actions revealed in the right tray when swiping left. */
  rightActions?: SwipeActionItem[];
  /** Horizontal drag distance in pixels required to snap a tray open (clamped 24..160, defaults to 56). */
  threshold?: number;
  /** Disables pointer dragging, keyboard reveal controls, and action buttons. */
  disabled?: boolean;
  /** Callback invoked when the revealed tray side changes or resets after triggering an action. */
  onRevealChange?: (side: SwipeRevealSide) => void;
}

interface TonePresentation {
  className: string;
  style: CSSProperties;
}

interface DragSession {
  active: boolean;
  startX: number;
  baseOffset: number;
  startSide: SwipeRevealSide;
}

const DEFAULT_THRESHOLD = 56;
const MIN_THRESHOLD = 24;
const MAX_THRESHOLD = 160;
const ACTION_SLOT_WIDTH_PX = 88;
const TRAY_PADDING_PX = 16;
const EMPTY_ACTIONS: SwipeActionItem[] = [];

function getTonePresentation(tone: SwipeActionTone): TonePresentation {
  switch (tone) {
    case 'primary':
      return {
        className: 'prism-btn-primary',
        style: {
          color: 'var(--prism-primary-contrast)',
        },
      };
    case 'emerald':
      return {
        className: 'prism-emerald rounded-full',
        style: {
          color: 'var(--prism-success-contrast)',
        },
      };
    case 'amber':
      return {
        className: 'rounded-full border shadow-sm',
        style: {
          backgroundColor: 'var(--prism-warning-main)',
          color: 'var(--prism-warning-contrast)',
          borderColor: 'var(--prism-warning-main)',
        },
      };
    case 'rose':
      return {
        className: 'rounded-full border shadow-sm',
        style: {
          backgroundColor: 'var(--prism-error-main)',
          color: 'var(--prism-error-contrast)',
          borderColor: 'var(--prism-error-main)',
        },
      };
    case 'secondary':
    default:
      return {
        className: 'prism-btn-secondary',
        style: {
          color: 'var(--prism-text-primary)',
        },
      };
  }
}

function resolveReleaseSide(
  startSide: SwipeRevealSide,
  finalOffset: number,
  deltaX: number,
  threshold: number,
  hasLeft: boolean,
  hasRight: boolean
): SwipeRevealSide {
  if (startSide === 'left') {
    if (hasRight && finalOffset <= -threshold) return 'right';
    if (deltaX <= -(threshold / 2) || finalOffset < threshold) return 'none';
    return 'left';
  }
  if (startSide === 'right') {
    if (hasLeft && finalOffset >= threshold) return 'left';
    if (deltaX >= threshold / 2 || finalOffset > -threshold) return 'none';
    return 'right';
  }
  if (hasLeft && finalOffset >= threshold) return 'left';
  if (hasRight && finalOffset <= -threshold) return 'right';
  return 'none';
}

function SwipeableActionRowInner({
  children,
  leftActions = EMPTY_ACTIONS,
  rightActions = EMPTY_ACTIONS,
  threshold = DEFAULT_THRESHOLD,
  disabled = false,
  onRevealChange,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: SwipeableActionRowProps) {
  const override = useComponentOverride('SwipeableActionRow');

  const safeThreshold = Math.round(
    clampNumber(threshold, MIN_THRESHOLD, MAX_THRESHOLD, DEFAULT_THRESHOLD)
  );
  const hasLeft = leftActions.length > 0;
  const hasRight = rightActions.length > 0;
  const hasAnyActions = hasLeft || hasRight;

  const leftMaxTravel = hasLeft
    ? Math.max(safeThreshold + 24, leftActions.length * ACTION_SLOT_WIDTH_PX + TRAY_PADDING_PX)
    : 0;
  const rightMaxTravel = hasRight
    ? Math.max(safeThreshold + 24, rightActions.length * ACTION_SLOT_WIDTH_PX + TRAY_PADDING_PX)
    : 0;

  const [revealedSide, setRevealedSide] = useState<SwipeRevealSide>('none');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragOffset, setDragOffset] = useState<number>(0);

  const dragRef = useRef<DragSession>({
    active: false,
    startX: 0,
    baseOffset: 0,
    startSide: 'none',
  });
  const offsetRef = useRef<number>(0);

  const effectiveSide: SwipeRevealSide = disabled
    ? 'none'
    : revealedSide === 'left' && !hasLeft
      ? 'none'
      : revealedSide === 'right' && !hasRight
        ? 'none'
        : revealedSide;

  const restOffset =
    effectiveSide === 'left'
      ? leftMaxTravel
      : effectiveSide === 'right'
        ? -rightMaxTravel
        : 0;

  const currentOffset = isDragging ? dragOffset : restOffset;

  const commitRevealSide = useCallback(
    (nextSide: SwipeRevealSide, alwaysNotify = false) => {
      setRevealedSide(nextSide);
      if (alwaysNotify || nextSide !== effectiveSide) {
        onRevealChange?.(nextSide);
      }
    },
    [effectiveSide, onRevealChange]
  );

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (disabled || event.button > 0 || !hasAnyActions) return;
      dragRef.current = {
        active: true,
        startX: event.clientX,
        baseOffset: restOffset,
        startSide: effectiveSide,
      };
      offsetRef.current = restOffset;
      setDragOffset(restOffset);
      setIsDragging(true);
    },
    [disabled, effectiveSide, hasAnyActions, restOffset]
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!dragRef.current.active || disabled) return;
      const rawDelta = event.clientX - dragRef.current.startX;
      const candidate = dragRef.current.baseOffset + rawDelta;
      const minOffset = hasRight ? -rightMaxTravel : 0;
      const maxOffset = hasLeft ? leftMaxTravel : 0;
      const clamped = clampNumber(candidate, minOffset, maxOffset, 0);
      offsetRef.current = clamped;
      setDragOffset(clamped);
    },
    [disabled, hasLeft, hasRight, leftMaxTravel, rightMaxTravel]
  );

  const handlePointerUp = useCallback(() => {
    if (!dragRef.current.active) return;
    const { baseOffset, startSide } = dragRef.current;
    dragRef.current.active = false;
    setIsDragging(false);

    const finalOffset = offsetRef.current;
    const deltaX = finalOffset - baseOffset;
    const nextSide = resolveReleaseSide(
      startSide,
      finalOffset,
      deltaX,
      safeThreshold,
      hasLeft,
      hasRight
    );
    commitRevealSide(nextSide);
  }, [commitRevealSide, hasLeft, hasRight, safeThreshold]);

  const handlePointerCancel = useCallback(() => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    setIsDragging(false);
    offsetRef.current = restOffset;
    setDragOffset(restOffset);
  }, [restOffset]);

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.nativeEvent.isComposing || disabled) return;

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        if (effectiveSide === 'right') {
          commitRevealSide('none');
        } else if (hasLeft) {
          commitRevealSide('left');
        }
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        if (effectiveSide === 'left') {
          commitRevealSide('none');
        } else if (hasRight) {
          commitRevealSide('right');
        }
      } else if (event.key === 'Escape' && effectiveSide !== 'none') {
        event.preventDefault();
        commitRevealSide('none');
      }
    },
    [commitRevealSide, disabled, effectiveSide, hasLeft, hasRight]
  );

  const handleActionTrigger = useCallback(
    (action: SwipeActionItem) => {
      if (disabled) return;
      action.onTrigger?.();
      dragRef.current.active = false;
      setIsDragging(false);
      offsetRef.current = 0;
      setDragOffset(0);
      commitRevealSide('none', true);
    },
    [commitRevealSide, disabled]
  );

  const merged = mergeProps({
    themeTarget: themeProps('swipeable-action-row', {
      revealed: effectiveSide,
      dragging: isDragging,
      disabled,
    }),
    baseClassName: cx(
      'prism-slab relative overflow-hidden select-none w-full',
      disabled ? 'opacity-65' : ''
    ),
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const leftTrayClass = stableClassName('swipeable-action-row', 'left-tray');
  const rightTrayClass = stableClassName('swipeable-action-row', 'right-tray');
  const foregroundClass = stableClassName('swipeable-action-row', 'foreground');

  const renderActionButton = (action: SwipeActionItem, side: 'left' | 'right') => {
    const tone: SwipeActionTone = action.tone ?? 'secondary';
    const visual = getTonePresentation(tone);
    const isInteractive = !disabled && effectiveSide === side;

    return (
      <button
        key={action.id}
        type="button"
        disabled={disabled}
        tabIndex={isInteractive ? 0 : -1}
        data-action-id={action.id}
        data-tone={tone}
        onClick={() => handleActionTrigger(action)}
        style={visual.style}
        className={cx(
          visual.className,
          'prism-focus-ring h-9 px-3.5 inline-flex items-center justify-center gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-opacity'
        )}
      >
        {action.icon ? (
          <span className="shrink-0 inline-flex items-center" aria-hidden="true">
            {action.icon}
          </span>
        ) : null}
        <span>{action.label}</span>
      </button>
    );
  };

  return (
    <div ref={ref} {...rest} {...merged}>
      {hasLeft ? (
        <div
          data-testid="swipeable-left-tray"
          aria-hidden={effectiveSide !== 'left' && !isDragging}
          className={cx(
            leftTrayClass,
            'prism-well absolute inset-y-0 left-0 z-0 flex items-center gap-1.5 px-2.5'
          )}
        >
          {leftActions.map((action) => renderActionButton(action, 'left'))}
        </div>
      ) : null}

      {hasRight ? (
        <div
          data-testid="swipeable-right-tray"
          aria-hidden={effectiveSide !== 'right' && !isDragging}
          className={cx(
            rightTrayClass,
            'prism-well absolute inset-y-0 right-0 z-0 flex items-center gap-1.5 px-2.5'
          )}
        >
          {rightActions.map((action) => renderActionButton(action, 'right'))}
        </div>
      ) : null}

      <div
        role="group"
        aria-roledescription="swipeable row"
        aria-label="Swipeable row"
        tabIndex={disabled ? -1 : 0}
        data-testid="swipeable-foreground"
        data-offset={String(Math.round(currentOffset))}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onKeyDown={handleKeyDown}
        style={{
          transform: `translateX(${currentOffset}px)`,
          touchAction: 'pan-y',
          color: 'var(--prism-text-primary)',
        }}
        className={cx(
          foregroundClass,
          'prism-crystal prism-focus-ring relative z-10 w-full flex items-center gap-2.5 px-3.5 py-3 rounded-[inherit]',
          isDragging ? '' : 'transition-transform duration-200 ease-out',
          disabled
            ? 'cursor-not-allowed'
            : isDragging
              ? 'cursor-grabbing'
              : hasAnyActions
                ? 'cursor-grab'
                : ''
        )}
      >
        {hasLeft ? (
          <button
            type="button"
            disabled={disabled}
            aria-label={effectiveSide === 'left' ? 'Hide left actions' : 'Reveal left actions'}
            aria-expanded={effectiveSide === 'left'}
            data-testid="swipeable-toggle-left"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => commitRevealSide(effectiveSide === 'left' ? 'none' : 'left')}
            style={STYLE_TEXT_SECONDARY}
            className="prism-well prism-focus-ring w-7 h-7 rounded-full inline-flex items-center justify-center shrink-0 opacity-75 enabled:hover:opacity-100 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed transition-[color,background-color,border-color,opacity,transform]"
          >
            <ChevronRight
              className={cx(
                'w-3.5 h-3.5 transition-transform',
                effectiveSide === 'left' ? 'rotate-180' : ''
              )}
              aria-hidden="true"
            />
          </button>
        ) : null}

        <div className="min-w-0 flex-1">{children}</div>

        {hasRight ? (
          <button
            type="button"
            disabled={disabled}
            aria-label={effectiveSide === 'right' ? 'Hide right actions' : 'Reveal right actions'}
            aria-expanded={effectiveSide === 'right'}
            data-testid="swipeable-toggle-right"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => commitRevealSide(effectiveSide === 'right' ? 'none' : 'right')}
            style={STYLE_TEXT_SECONDARY}
            className="prism-well prism-focus-ring w-7 h-7 rounded-full inline-flex items-center justify-center shrink-0 opacity-75 enabled:hover:opacity-100 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed transition-[color,background-color,border-color,opacity,transform]"
          >
            <ChevronLeft
              className={cx(
                'w-3.5 h-3.5 transition-transform',
                effectiveSide === 'right' ? 'rotate-180' : ''
              )}
              aria-hidden="true"
            />
          </button>
        ) : null}
      </div>
    </div>
  );
}

export const SwipeableActionRow = memo(SwipeableActionRowInner);
SwipeableActionRow.displayName = 'SwipeableActionRow';
