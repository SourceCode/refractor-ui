'use client';

import { memo, useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useMergedRefs } from '../hooks/useMergedRefs';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { composeEventHandlers } from '../utils/composeEventHandlers';
import { cx, mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';

export type ComboSplitTone = 'primary' | 'secondary';
export type ComboSplitSize = 'sm' | 'md' | 'lg';

export interface ComboSplitAction {
  /** Unique identifier for the menu action item. */
  id: string;
  /** Action label rendered inside the floating optical slab menu. */
  label: string;
  /** Optional secondary description rendered beneath the action label. */
  description?: string;
  /** Optional leading icon rendered beside the action label. */
  icon?: ReactNode;
  /** Styles the action with destructive rose/error semantic tokens. */
  destructive?: boolean;
  /** Disables selecting and keyboard-focusing this individual menu item. */
  disabled?: boolean;
  /** Optional per-action handler invoked when this action is selected. */
  onSelect?: () => void;
}

export interface ComboSplitButtonProps extends BaseProps<HTMLDivElement> {
  /** Primary button label. */
  label: string;
  /** Optional leading icon rendered inside the primary action half. */
  icon?: ReactNode;
  /** Handler invoked when the primary action button is clicked. */
  onPrimaryClick?: () => void;
  /** Secondary actions rendered inside the attached floating slab menu. */
  actions: ComboSplitAction[];
  /** Callback invoked with the chosen action when an enabled menu item is selected. */
  onActionSelect?: (action: ComboSplitAction) => void;
  /** Visual optical-glass tone ('primary' or 'secondary'). */
  tone?: ComboSplitTone;
  /** Control height and padding scale ('sm' | 'md' | 'lg'). */
  size?: ComboSplitSize;
  /** Disables both the primary action button and the chevron menu trigger. */
  disabled?: boolean;
  /** Accessible label for the chevron menu trigger and dropdown menu. */
  menuLabel?: string;
}

interface SizeScaleClasses {
  height: string;
  primaryPadding: string;
  triggerPadding: string;
  dividerMargin: string;
  chevronSize: string;
}

function getSizeClasses(size: ComboSplitSize): SizeScaleClasses {
  switch (size) {
    case 'sm':
      return {
        height: 'h-9',
        primaryPadding: 'px-4 text-xs gap-1.5',
        triggerPadding: 'px-2.5',
        dividerMargin: 'my-1.5',
        chevronSize: 'w-3.5 h-3.5',
      };
    case 'lg':
      return {
        height: 'h-14',
        primaryPadding: 'px-8 text-base gap-2.5',
        triggerPadding: 'px-4',
        dividerMargin: 'my-2.5',
        chevronSize: 'w-4 h-4',
      };
    case 'md':
    default:
      return {
        height: 'h-12',
        primaryPadding: 'px-6 text-sm gap-2',
        triggerPadding: 'px-3.5',
        dividerMargin: 'my-2',
        chevronSize: 'w-4 h-4',
      };
  }
}

function ComboSplitButtonInner({
  label,
  icon,
  onPrimaryClick,
  actions,
  onActionSelect,
  tone = 'primary',
  size = 'md',
  disabled = false,
  menuLabel = 'More actions',
  className,
  style,
  xstyle,
  onKeyDown,
  ref,
  ...rest
}: ComboSplitButtonProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const pendingFocusRef = useRef<'first' | 'last' | null>(null);
  const mergedRef = useMergedRefs(containerRef, ref);
  const menuId = useId();
  const override = useComponentOverride('ComboSplitButton');

  const hasActions = actions.length > 0;
  const isOpen = open && !disabled && hasActions;

  const enabledActionIds = useMemo(
    () => actions.filter((action) => !action.disabled).map((action) => action.id),
    [actions]
  );

  const focusActionById = useCallback((actionId: string | undefined) => {
    if (!actionId) return;
    itemRefs.current.get(actionId)?.focus();
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;

    if (pendingFocusRef.current !== null && enabledActionIds.length > 0) {
      const targetId =
        pendingFocusRef.current === 'last'
          ? enabledActionIds[enabledActionIds.length - 1]
          : enabledActionIds[0];
      pendingFocusRef.current = null;
      focusActionById(targetId);
    } else {
      pendingFocusRef.current = null;
    }

    const handleOutsideMouseDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        event.target instanceof Node &&
        !containerRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideMouseDown);
    return () => document.removeEventListener('mousedown', handleOutsideMouseDown);
  }, [isOpen, enabledActionIds, focusActionById]);

  const handlePrimaryClick = useCallback(() => {
    if (disabled) return;
    onPrimaryClick?.();
  }, [disabled, onPrimaryClick]);

  const handleSelectAction = useCallback(
    (action: ComboSplitAction) => {
      if (disabled || action.disabled) return;
      setOpen(false);
      action.onSelect?.();
      onActionSelect?.(action);
    },
    [disabled, onActionSelect]
  );

  const handleKeyDown = composeEventHandlers(onKeyDown, (event) => {
    if (event.nativeEvent.isComposing) return;

    if (!isOpen) {
      if (
        !disabled &&
        hasActions &&
        event.target === triggerRef.current &&
        (event.key === 'ArrowDown' || event.key === 'ArrowUp')
      ) {
        event.preventDefault();
        pendingFocusRef.current = event.key === 'ArrowUp' ? 'last' : 'first';
        setOpen(true);
      }
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }

    if (
      event.key !== 'ArrowDown' &&
      event.key !== 'ArrowUp' &&
      event.key !== 'Home' &&
      event.key !== 'End'
    ) {
      return;
    }

    event.preventDefault();
    if (enabledActionIds.length === 0) return;

    const activeElement = document.activeElement;
    const currentIndex = enabledActionIds.findIndex(
      (id) => itemRefs.current.get(id) === activeElement
    );

    if (event.key === 'Home') {
      focusActionById(enabledActionIds[0]);
      return;
    }

    if (event.key === 'End') {
      focusActionById(enabledActionIds[enabledActionIds.length - 1]);
      return;
    }

    if (event.key === 'ArrowDown') {
      const nextIndex =
        currentIndex === -1 ? 0 : (currentIndex + 1) % enabledActionIds.length;
      focusActionById(enabledActionIds[nextIndex]);
      return;
    }

    const prevIndex =
      currentIndex === -1
        ? enabledActionIds.length - 1
        : (currentIndex - 1 + enabledActionIds.length) % enabledActionIds.length;
    focusActionById(enabledActionIds[prevIndex]);
  });

  const sizeClasses = getSizeClasses(size);
  const shellClass = tone === 'primary' ? 'prism-btn-primary' : 'prism-btn-secondary';

  const merged = mergeProps({
    themeTarget: themeProps('combo-split-button', {
      tone,
      size,
      open: isOpen,
      disabled,
    }),
    baseClassName: 'relative inline-block',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const groupClass = stableClassName('combo-split-button', 'group');
  const primaryClass = stableClassName('combo-split-button', 'primary');
  const dividerClass = stableClassName('combo-split-button', 'divider');
  const triggerClass = stableClassName('combo-split-button', 'trigger');
  const menuClass = stableClassName('combo-split-button', 'menu');
  const itemClass = stableClassName('combo-split-button', 'item');

  return (
    <div ref={mergedRef} onKeyDown={handleKeyDown} {...rest} {...merged}>
      <div
        role="group"
        aria-label={label}
        className={cx(
          groupClass,
          shellClass,
          sizeClasses.height,
          'inline-flex items-stretch overflow-hidden',
          disabled ? 'opacity-60' : undefined
        )}
      >
        <button
          type="button"
          disabled={disabled}
          onClick={handlePrimaryClick}
          className={cx(
            primaryClass,
            'prism-focus-ring inline-flex items-center justify-center font-medium tracking-[-0.01em] whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:bg-white/10 transition-colors rounded-l-full',
            sizeClasses.primaryPadding
          )}
        >
          {icon ? (
            <span className="relative z-10 inline-flex shrink-0" aria-hidden="true">
              {icon}
            </span>
          ) : null}
          <span className="relative z-10">{label}</span>
        </button>

        <span
          aria-hidden="true"
          className={cx(
            dividerClass,
            'w-px shrink-0',
            sizeClasses.dividerMargin,
            tone === 'primary' ? 'opacity-35' : undefined
          )}
          style={{
            backgroundColor:
              tone === 'primary' ? 'var(--prism-primary-contrast)' : 'var(--prism-divider)',
          }}
        />

        <button
          ref={triggerRef}
          type="button"
          disabled={disabled || !hasActions}
          aria-label={menuLabel}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          aria-controls={isOpen ? menuId : undefined}
          onClick={() => {
            pendingFocusRef.current = null;
            setOpen((prev) => !prev);
          }}
          className={cx(
            triggerClass,
            'prism-focus-ring inline-flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:bg-white/10 transition-colors rounded-r-full',
            sizeClasses.triggerPadding
          )}
        >
          <ChevronDown
            aria-hidden="true"
            className={cx(
              sizeClasses.chevronSize,
              'relative z-10 transition-transform duration-150',
              isOpen ? 'rotate-180' : undefined
            )}
          />
        </button>
      </div>

      {isOpen ? (
        <div
          id={menuId}
          role="menu"
          aria-label={menuLabel}
          className={cx(
            menuClass,
            'prism-slab absolute right-0 mt-2 min-w-[14rem] max-w-[18rem] p-1.5 z-40'
          )}
        >
          {actions.map((action) => {
            const isDestructive = Boolean(action.destructive);
            const isItemDisabled = Boolean(action.disabled);

            return (
              <button
                key={action.id}
                ref={(node) => {
                  if (node) {
                    itemRefs.current.set(action.id, node);
                  } else {
                    itemRefs.current.delete(action.id);
                  }
                }}
                type="button"
                role="menuitem"
                disabled={isItemDisabled}
                aria-disabled={isItemDisabled ? 'true' : undefined}
                data-destructive={isDestructive ? 'true' : undefined}
                onClick={() => handleSelectAction(action)}
                className={cx(
                  itemClass,
                  'prism-focus-ring w-full text-left px-3 py-2.5 rounded-2xl flex items-start gap-2.5 border border-transparent transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed',
                  isDestructive
                    ? 'enabled:hover:bg-[var(--prism-rose-bg,var(--prism-well-start))]'
                    : 'enabled:hover:bg-white/60 dark:enabled:hover:bg-white/10'
                )}
                style={
                  isDestructive
                    ? {
                        color: 'var(--prism-rose-text, var(--prism-error-main))',
                        borderColor: 'var(--prism-rose-border, transparent)',
                      }
                    : {
                        color: 'var(--prism-text-primary)',
                      }
                }
              >
                {action.icon ? (
                  <span
                    aria-hidden="true"
                    className="inline-flex shrink-0 mt-0.5"
                    style={{
                      color: isDestructive
                        ? 'var(--prism-rose-text, var(--prism-error-main))'
                        : 'var(--prism-text-secondary)',
                    }}
                  >
                    {action.icon}
                  </span>
                ) : null}
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium leading-snug break-words">
                    {action.label}
                  </span>
                  {action.description ? (
                    <span
                      className={cx(
                        'block text-xs mt-0.5 leading-snug break-words',
                        isDestructive ? 'opacity-80' : undefined
                      )}
                      style={{
                        color: isDestructive
                          ? 'var(--prism-rose-text, var(--prism-error-main))'
                          : 'var(--prism-text-secondary)',
                      }}
                    >
                      {action.description}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export const ComboSplitButton = memo(ComboSplitButtonInner);
ComboSplitButton.displayName = 'ComboSplitButton';
