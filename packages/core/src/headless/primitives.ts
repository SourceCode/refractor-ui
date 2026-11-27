'use client';

import { useCallback, useId, useState } from 'react';
import { useRovingTabIndex, type RovingItemMeta } from '../hooks/useRovingTabIndex';

/**
 * Headless Behavioral Primitives (`packages/core/src/headless/primitives.ts`)
 *
 * Cleanly separates state, keyboard navigation, and ARIA contracts from the
 * optical glass visual skin so themes or custom surfaces can swap freely.
 */

export interface UseHeadlessButtonOptions {
  disabled?: boolean;
  onPress?: () => void;
}

export function useHeadlessButton(options: UseHeadlessButtonOptions = {}) {
  const { disabled = false, onPress } = options;
  const [pressed, setPressed] = useState(false);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      if (disabled || event.nativeEvent.isComposing) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        setPressed(true);
      }
    },
    [disabled]
  );

  const onKeyUp = useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      if (disabled || event.nativeEvent.isComposing) return;
      if (event.key === 'Enter' || event.key === ' ') {
        setPressed(false);
        onPress?.();
      }
    },
    [disabled, onPress]
  );

  return {
    pressed,
    buttonProps: {
      role: 'button' as const,
      tabIndex: disabled ? -1 : 0,
      'aria-disabled': disabled || undefined,
      onClick: () => {
        if (!disabled) onPress?.();
      },
      onPointerDown: () => {
        if (!disabled) setPressed(true);
      },
      onPointerUp: () => setPressed(false),
      onPointerLeave: () => setPressed(false),
      onKeyDown,
      onKeyUp,
    },
  };
}

export interface UseHeadlessDisclosureOptions {
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function useHeadlessDisclosure(options: UseHeadlessDisclosureOptions = {}) {
  const { defaultOpen = false, onOpenChange } = options;
  const [open, setOpenState] = useState(defaultOpen);
  const panelId = useId();

  const setOpen = useCallback(
    (next: boolean) => {
      setOpenState(next);
      onOpenChange?.(next);
    },
    [onOpenChange]
  );

  const toggle = useCallback(() => setOpen(!open), [open, setOpen]);

  return {
    open,
    setOpen,
    toggle,
    triggerProps: {
      'aria-expanded': open,
      'aria-controls': panelId,
      onClick: toggle,
    },
    panelProps: {
      id: panelId,
      hidden: !open,
    },
  };
}

export interface UseHeadlessTabsOptions {
  tabs: ReadonlyArray<RovingItemMeta>;
  initialTabId?: string;
  onTabChange?: (tabId: string) => void;
}

export function useHeadlessTabs(options: UseHeadlessTabsOptions) {
  const roving = useRovingTabIndex({
    items: options.tabs,
    orientation: 'horizontal',
    initialActiveId: options.initialTabId,
    onActiveChange: options.onTabChange,
  });

  return {
    activeTabId: roving.activeId,
    selectTab: roving.setActiveId,
    tabListProps: {
      role: 'tablist' as const,
      'aria-orientation': 'horizontal' as const,
    },
    getTabProps: (tabId: string) => ({
      role: 'tab' as const,
      'aria-selected': roving.activeId === tabId,
      ...roving.getItemProps(tabId),
      onClick: () => roving.setActiveId(tabId),
    }),
    getPanelProps: (tabId: string) => ({
      role: 'tabpanel' as const,
      hidden: roving.activeId !== tabId,
    }),
  };
}

export interface UseHeadlessMenuOptions {
  items: ReadonlyArray<RovingItemMeta>;
  onSelect?: (id: string) => void;
  onClose?: () => void;
}

export function useHeadlessMenu(options: UseHeadlessMenuOptions) {
  const roving = useRovingTabIndex({
    items: options.items,
    orientation: 'vertical',
    onEscape: options.onClose,
  });

  return {
    activeItemId: roving.activeId,
    menuProps: {
      role: 'menu' as const,
      'aria-orientation': 'vertical' as const,
    },
    getMenuItemProps: (id: string) => {
      const base = roving.getItemProps(id);
      return {
        role: 'menuitem' as const,
        ...base,
        onClick: () => options.onSelect?.(id),
        onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => {
          base.onKeyDown(event);
          if (!event.nativeEvent.isComposing && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            options.onSelect?.(id);
          }
        },
      };
    },
  };
}
