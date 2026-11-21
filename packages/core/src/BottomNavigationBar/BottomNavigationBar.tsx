'use client';

import { useMemo, useRef, type KeyboardEvent, type ReactNode } from 'react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';

export interface BottomNavItem {
  /** Stable unique identifier for the navigation destination. */
  id: string;
  /** Concise visible destination label. */
  label: string;
  /** Optional icon rendered above the destination label. */
  icon?: ReactNode;
  /** Optional unread/notification counter rendered when finite and > 0 (clamped at 99+). */
  badgeCount?: number;
  /** Disables activation and skips this destination during keyboard navigation. */
  disabled?: boolean;
}

export type BottomNavigationMode = 'fixed' | 'inline';

type BottomNavigationBarBaseProps = Omit<BaseProps<HTMLElement>, 'onChange'>;

export interface BottomNavigationBarProps extends BottomNavigationBarBaseProps {
  /** Ordered list of mobile navigation destinations rendered in an equal-column grid. */
  items: BottomNavItem[];
  /** Controlled active destination identifier. */
  activeId?: string;
  /** Initial active destination identifier for uncontrolled mode (defaults to first non-disabled item). */
  defaultActiveId?: string;
  /** Callback fired with the selected destination id and item descriptor. */
  onChange?: (id: string, item: BottomNavItem) => void;
  /** Placement mode: 'fixed' pins to viewport bottom edge, 'inline' renders a rounded bar in flow. */
  mode?: BottomNavigationMode;
  /** Accessible landmark name for the <nav> element (defaults to 'Bottom navigation'). */
  ariaLabel?: string;
}

function formatBadgeCount(count?: number): string | null {
  if (count === undefined || !Number.isFinite(count) || count <= 0) {
    return null;
  }
  const whole = Math.floor(count);
  if (whole <= 0) {
    return null;
  }
  return whole > 99 ? '99+' : String(whole);
}

export function BottomNavigationBar({
  items,
  activeId,
  defaultActiveId,
  onChange,
  mode = 'inline',
  ariaLabel = 'Bottom navigation',
  'aria-label': ariaLabelProp,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: BottomNavigationBarProps) {
  const override = useComponentOverride('BottomNavigationBar');
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const enabledItems = useMemo(
    () => items.filter((item) => !item.disabled),
    [items]
  );

  const firstEnabledId = enabledItems[0]?.id ?? '';
  const initialActiveId =
    defaultActiveId !== undefined &&
    enabledItems.some((item) => item.id === defaultActiveId)
      ? defaultActiveId
      : firstEnabledId;

  const [currentActiveId, setCurrentActiveId] = useControllableState<string>({
    value: activeId,
    defaultValue: initialActiveId,
  });

  const handleActivate = (item: BottomNavItem) => {
    setCurrentActiveId(item.id);
    onChange?.(item.id, item);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, itemId: string) => {
    if (e.nativeEvent.isComposing) return;

    const currentEnabledIdx = enabledItems.findIndex((item) => item.id === itemId);
    if (currentEnabledIdx === -1) return;

    let nextIdx: number | null = null;
    if (e.key === 'ArrowRight') {
      nextIdx = (currentEnabledIdx + 1) % enabledItems.length;
    } else if (e.key === 'ArrowLeft') {
      nextIdx = (currentEnabledIdx - 1 + enabledItems.length) % enabledItems.length;
    } else if (e.key === 'Home') {
      nextIdx = 0;
    } else if (e.key === 'End') {
      nextIdx = enabledItems.length - 1;
    }

    const target = nextIdx !== null ? enabledItems[nextIdx] : undefined;
    if (target) {
      e.preventDefault();
      handleActivate(target);
      buttonRefs.current.get(target.id)?.focus();
    }
  };

  const isEmpty = items.length === 0;
  const modeClassName =
    mode === 'fixed'
      ? 'prism-slab fixed bottom-0 inset-x-0 z-40 rounded-t-3xl rounded-b-none px-2 py-1.5 w-full'
      : 'prism-slab rounded-3xl px-2 py-1.5 w-full';

  const merged = mergeProps({
    themeTarget: themeProps('bottom-navigation-bar', {
      mode,
      empty: isEmpty,
    }),
    baseClassName: modeClassName,
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <nav
      ref={ref}
      aria-label={ariaLabelProp ?? ariaLabel}
      {...rest}
      {...merged}
    >
      {isEmpty ? (
        <div
          role="status"
          data-testid="bottom-nav-empty"
          className="prism-well rounded-2xl py-3 px-4 text-center text-xs font-medium"
          style={{ color: 'var(--prism-text-secondary)' }}
        >
          No navigation destinations available.
        </div>
      ) : (
        <div
          className="grid gap-1 items-stretch"
          style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
        >
          {items.map((item) => {
            const isDisabled = Boolean(item.disabled);
            const isActive = !isDisabled && item.id === currentActiveId;
            const badgeText = formatBadgeCount(item.badgeCount);

            const itemMerged = mergeProps({
              themeTarget: themeProps(
                'bottom-navigation-bar',
                { active: isActive, disabled: isDisabled },
                'item'
              ),
              baseClassName: `prism-focus-ring relative min-h-[48px] px-2 py-1.5 rounded-2xl flex flex-col items-center justify-center gap-0.5 text-[11px] leading-tight transition-all duration-150 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                isActive
                  ? 'prism-crystal font-semibold'
                  : 'font-medium enabled:hover:bg-[var(--prism-divider)]'
              }`,
              baseStyle: {
                color: isActive
                  ? 'var(--prism-primary-main)'
                  : 'var(--prism-text-secondary)',
              },
            });

            return (
              <button
                key={item.id}
                ref={(el) => {
                  if (el) {
                    buttonRefs.current.set(item.id, el);
                  } else {
                    buttonRefs.current.delete(item.id);
                  }
                }}
                type="button"
                disabled={isDisabled}
                aria-current={isActive ? 'page' : undefined}
                data-item-id={item.id}
                onClick={isDisabled ? undefined : () => handleActivate(item)}
                onKeyDown={
                  isDisabled ? undefined : (e) => handleKeyDown(e, item.id)
                }
                {...itemMerged}
              >
                {item.icon ? (
                  <span className="relative inline-flex items-center justify-center shrink-0">
                    <span
                      aria-hidden="true"
                      className="inline-flex items-center justify-center"
                    >
                      {item.icon}
                    </span>
                    {badgeText ? (
                      <span
                        data-testid={`bottom-nav-badge-${item.id}`}
                        className="prism-btn-primary absolute -top-1.5 -right-3 min-w-[18px] h-[18px] px-1 rounded-full inline-flex items-center justify-center text-[10px] font-mono font-bold tabular-nums leading-none pointer-events-none"
                      >
                        <span className="relative z-10">{badgeText}</span>
                      </span>
                    ) : null}
                  </span>
                ) : null}

                <span className="inline-flex items-center justify-center gap-1 max-w-full">
                  <span className="truncate">{item.label}</span>
                  {!item.icon && badgeText ? (
                    <span
                      data-testid={`bottom-nav-badge-${item.id}`}
                      className="prism-btn-primary min-w-[18px] h-[18px] px-1 rounded-full inline-flex items-center justify-center text-[10px] font-mono font-bold tabular-nums leading-none shrink-0"
                    >
                      <span className="relative z-10">{badgeText}</span>
                    </span>
                  ) : null}
                </span>

                {isActive ? (
                  <span
                    aria-hidden="true"
                    data-testid={`bottom-nav-active-pill-${item.id}`}
                    className="w-5 h-0.5 rounded-full mt-0.5 shrink-0"
                    style={{ backgroundColor: 'var(--prism-primary-main)' }}
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </nav>
  );
}

BottomNavigationBar.displayName = 'BottomNavigationBar';
