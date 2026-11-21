'use client';

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import { Plus } from 'lucide-react';
import type { BaseProps, OpticalStyleTokens } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { useMergedRefs } from '../hooks/useMergedRefs';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { composeEventHandlers } from '../utils/composeEventHandlers';
import { cx, mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';

export type SpeedDialDirection = 'up' | 'down' | 'left' | 'right' | 'radial';

export type SpeedDialTone = 'primary' | 'secondary' | 'emerald' | 'amber' | 'rose';

export interface SpeedDialAction {
  /** Unique identifier for the secondary speed dial action. */
  id: string;
  /** Visible floating label pill and accessible name for the action. */
  label: string;
  /** Icon glyph displayed inside the circular optical action button. */
  icon: ReactNode;
  /** Optional refractive surface tone ('primary' | 'secondary' | 'emerald' | 'amber' | 'rose'). */
  tone?: SpeedDialTone;
  /** Disables activating this individual action item. */
  disabled?: boolean;
  /** Callback invoked when this enabled action is clicked. */
  onSelect?: () => void;
}

export interface SpeedDialButtonProps extends BaseProps<HTMLDivElement> {
  /** Secondary quick actions fanned out when the speed dial opens. */
  actions: SpeedDialAction[];
  /** Controlled open state of the speed dial menu. */
  open?: boolean;
  /** Initial open state in uncontrolled mode (default false). */
  defaultOpen?: boolean;
  /** Callback fired whenever the open state transitions. */
  onOpenChange?: (open: boolean) => void;
  /** Expansion layout direction ('up' | 'down' | 'left' | 'right' | 'radial', default 'up'). */
  direction?: SpeedDialDirection;
  /** Accessible label for the circular floating trigger button (default 'Quick actions'). */
  triggerLabel?: string;
  /** Opens on pointer hover and closes when pointer leaves while enabled (default false). */
  openOnHover?: boolean;
  /** Disables the trigger and prevents opening or selecting actions (default false). */
  disabled?: boolean;
}

const RADIAL_RADIUS_PX = 72;

interface RadialOffset {
  x: number;
  y: number;
}

interface ActionToneVisual {
  surfaceClass: string;
  style?: OpticalStyleTokens;
}

function normalizeZero(value: number): number {
  return Object.is(value, -0) ? 0 : value;
}

function computeRadialOffset(index: number, count: number): RadialOffset {
  let angle: number;
  if (count <= 1) {
    angle = -Math.PI / 2;
  } else if (count === 2) {
    angle = (-3 * Math.PI) / 4 + index * (Math.PI / 2);
  } else {
    angle = -Math.PI + (index / (count - 1)) * Math.PI;
  }

  const x = normalizeZero(Math.round(Math.cos(angle) * RADIAL_RADIUS_PX * 100) / 100);
  const y = normalizeZero(Math.round(Math.sin(angle) * RADIAL_RADIUS_PX * 100) / 100);
  return { x, y };
}

function getActionToneVisual(tone?: SpeedDialTone): ActionToneVisual {
  switch (tone) {
    case 'primary':
      return {
        surfaceClass: 'prism-btn-primary',
      };
    case 'secondary':
      return {
        surfaceClass: 'prism-btn-secondary',
      };
    case 'emerald':
      return {
        surfaceClass: 'prism-emerald',
      };
    case 'amber':
      return {
        surfaceClass: 'prism-crystal',
        style: {
          color: 'var(--prism-warning-main)',
          border: '1.5px solid var(--prism-warning-main)',
        },
      };
    case 'rose':
      return {
        surfaceClass: 'prism-crystal',
        style: {
          color: 'var(--prism-error-main)',
          border: '1.5px solid var(--prism-error-main)',
        },
      };
    default:
      return {
        surfaceClass: 'prism-crystal',
        style: {
          color: 'var(--prism-text-primary)',
        },
      };
  }
}

function getMenuLayoutClass(direction: SpeedDialDirection): string {
  switch (direction) {
    case 'up':
      return 'absolute bottom-full left-1/2 -translate-x-1/2 pb-3 flex flex-col-reverse items-center gap-2.5 z-30';
    case 'down':
      return 'absolute top-full left-1/2 -translate-x-1/2 pt-3 flex flex-col items-center gap-2.5 z-30';
    case 'left':
      return 'absolute right-full top-1/2 -translate-y-1/2 pr-3 flex flex-row-reverse items-center gap-2.5 z-30';
    case 'right':
      return 'absolute left-full top-1/2 -translate-y-1/2 pl-3 flex flex-row items-center gap-2.5 z-30';
    case 'radial':
      return 'pointer-events-none absolute inset-0 flex items-center justify-center z-30';
  }
}

function getLabelPositionClass(direction: SpeedDialDirection): string {
  if (direction === 'up' || direction === 'down') {
    return 'right-full mr-2.5 top-1/2 -translate-y-1/2';
  }
  return 'bottom-full mb-2 left-1/2 -translate-x-1/2';
}

export function SpeedDialButton({
  actions,
  open,
  defaultOpen = false,
  onOpenChange,
  direction = 'up',
  triggerLabel = 'Quick actions',
  openOnHover = false,
  disabled = false,
  className,
  style,
  xstyle,
  onMouseEnter,
  onMouseLeave,
  onKeyDown,
  ref,
  ...rest
}: SpeedDialButtonProps) {
  const [rawOpen, setRawOpen] = useControllableState<boolean>({
    value: open,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const mergedRef = useMergedRefs(containerRef, ref);
  const menuId = useId();
  const override = useComponentOverride('SpeedDialButton');

  const hasActions = actions.length > 0;
  const isOpen = rawOpen && !disabled && hasActions;

  const closeAndFocusTrigger = useCallback(() => {
    setRawOpen(false);
    triggerRef.current?.focus();
  }, [setRawOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideMouseDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        event.target instanceof Node &&
        !containerRef.current.contains(event.target)
      ) {
        setRawOpen(false);
      }
    };

    const handleWindowKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        closeAndFocusTrigger();
      }
    };

    document.addEventListener('mousedown', handleOutsideMouseDown);
    window.addEventListener('keydown', handleWindowKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideMouseDown);
      window.removeEventListener('keydown', handleWindowKeyDown);
    };
  }, [isOpen, setRawOpen, closeAndFocusTrigger]);

  const handleTriggerClick = useCallback(() => {
    if (!hasActions) return;
    setRawOpen((prev) => !prev);
  }, [hasActions, setRawOpen]);

  const handleActionSelect = useCallback(
    (action: SpeedDialAction) => {
      action.onSelect?.();
      setRawOpen(false);
    },
    [setRawOpen]
  );

  const handleMouseEnter = composeEventHandlers(onMouseEnter, () => {
    if (openOnHover && !disabled && hasActions) {
      setRawOpen(true);
    }
  });

  const handleMouseLeave = composeEventHandlers(onMouseLeave, () => {
    if (openOnHover && !disabled && isOpen) {
      setRawOpen(false);
    }
  });

  const handleKeyDown = composeEventHandlers(
    onKeyDown,
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.nativeEvent.isComposing) return;
      if (event.key === 'Escape' && isOpen) {
        event.preventDefault();
        closeAndFocusTrigger();
      }
    }
  );

  const merged = mergeProps({
    themeTarget: themeProps('speed-dial-button', {
      open: isOpen,
      direction,
      disabled,
      openOnHover,
    }),
    baseClassName: 'relative inline-flex items-center justify-center',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const triggerClass = stableClassName('speed-dial-button', 'trigger');
  const triggerIconClass = stableClassName('speed-dial-button', 'icon');
  const menuClass = stableClassName('speed-dial-button', 'menu');
  const itemClass = stableClassName('speed-dial-button', 'item');
  const actionClass = stableClassName('speed-dial-button', 'action');
  const labelClass = stableClassName('speed-dial-button', 'label');
  const labelPositionClass = getLabelPositionClass(direction);

  return (
    <div
      ref={mergedRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onKeyDown={handleKeyDown}
      {...rest}
      {...merged}
    >
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-controls={isOpen ? menuId : undefined}
        aria-label={triggerLabel}
        data-open={isOpen ? 'true' : undefined}
        onClick={handleTriggerClick}
        className={cx(
          triggerClass,
          'prism-btn-primary prism-focus-ring w-14 h-14 inline-flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-transform duration-200 enabled:hover:-translate-y-0.5'
        )}
      >
        <Plus
          aria-hidden="true"
          className={cx(
            triggerIconClass,
            'w-5 h-5 stroke-[2.2] relative z-10 transition-transform duration-200',
            isOpen ? 'rotate-45' : 'rotate-0'
          )}
        />
      </button>

      {isOpen ? (
        <div
          id={menuId}
          role="menu"
          aria-label={`${triggerLabel} menu`}
          data-direction={direction}
          className={cx(menuClass, getMenuLayoutClass(direction))}
        >
          {actions.map((action, index) => {
            const toneVisual = getActionToneVisual(action.tone);
            const radialOffset =
              direction === 'radial' ? computeRadialOffset(index, actions.length) : null;
            const itemStyle: CSSProperties | undefined = radialOffset
              ? { transform: `translate(${radialOffset.x}px, ${radialOffset.y}px)` }
              : undefined;

            return (
              <div
                key={action.id}
                role="none"
                data-speed-dial-item={action.id}
                data-radial-x={radialOffset ? String(radialOffset.x) : undefined}
                data-radial-y={radialOffset ? String(radialOffset.y) : undefined}
                style={itemStyle}
                className={cx(
                  itemClass,
                  direction === 'radial'
                    ? 'absolute pointer-events-auto flex items-center justify-center'
                    : 'relative flex items-center justify-center'
                )}
              >
                <button
                  type="button"
                  role="menuitem"
                  disabled={Boolean(action.disabled)}
                  aria-label={action.label}
                  data-tone={action.tone ?? 'crystal'}
                  onClick={() => handleActionSelect(action)}
                  style={toneVisual.style}
                  className={cx(
                    actionClass,
                    toneVisual.surfaceClass,
                    'prism-focus-ring relative w-11 h-11 rounded-full inline-flex items-center justify-center shrink-0 cursor-pointer transition-transform duration-150 enabled:hover:-translate-y-0.5 enabled:hover:scale-105 disabled:opacity-45 disabled:cursor-not-allowed'
                  )}
                >
                  <span
                    className="relative z-10 inline-flex items-center justify-center"
                    aria-hidden="true"
                  >
                    {action.icon}
                  </span>
                  <span
                    className={cx(
                      labelClass,
                      'prism-crystal absolute rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap max-w-[120px] truncate leading-none pointer-events-auto',
                      labelPositionClass
                    )}
                    style={{
                      color: 'var(--prism-text-primary)',
                      textShadow: 'none',
                    }}
                  >
                    {action.label}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

SpeedDialButton.displayName = 'SpeedDialButton';
