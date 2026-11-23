'use client';

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { Check, ChevronRight, Layers } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useMergedRefs } from '../hooks/useMergedRefs';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { STYLE_BG_DIVIDER, STYLE_PRIMARY_MAIN, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export type AppMenuItemKind = 'action' | 'checkbox' | 'submenu' | 'separator';

export interface AppMenuActionItem {
  id: string;
  kind?: 'action' | 'checkbox' | 'submenu';
  label: string;
  shortcut?: string;
  checked?: boolean;
  disabled?: boolean;
  danger?: boolean;
  children?: ReadonlyArray<AppMenuEntry>;
}

export interface AppMenuSeparatorItem {
  id: string;
  kind: 'separator';
}

export type AppMenuEntry = AppMenuActionItem | AppMenuSeparatorItem;

export interface AppMenuGroup {
  id: string;
  label: string;
  items: ReadonlyArray<AppMenuEntry>;
}

export interface AppMenuBarProps extends BaseProps<HTMLDivElement> {
  /** Top-level desktop OS menu groups (defaults to File, Edit, View, Window, Help). */
  menus?: ReadonlyArray<AppMenuGroup>;
  /** Optional leading application identity badge label (defaults to 'Refractor'; pass '' to hide). */
  brandLabel?: string;
  /** Callback invoked when an action item (dropdown or nested submenu) is activated. */
  onSelectAction?: (item: AppMenuActionItem, menuId: string) => void;
  /** Callback invoked when a checkbox item toggles its checked state. */
  onToggleCheck?: (itemId: string, nextChecked: boolean, menuId: string) => void;
}

interface CheckedOverrideRecord {
  base: boolean;
  value: boolean;
}

type FocusTarget =
  | { scope: 'trigger'; menuId: string }
  | { scope: 'item'; menuId: string; itemId: string }
  | { scope: 'subitem'; menuId: string; submenuId: string; itemId: string };

export const DEFAULT_APP_MENUS: ReadonlyArray<AppMenuGroup> = [
  {
    id: 'file',
    label: 'File',
    items: [
      { id: 'new-canvas', kind: 'action', label: 'New Optical Canvas', shortcut: '⌘N' },
      { id: 'open-project', kind: 'action', label: 'Open Project…', shortcut: '⌘O' },
      { id: 'save', kind: 'action', label: 'Save', shortcut: '⌘S' },
      { id: 'sep-file-1', kind: 'separator' },
      {
        id: 'export-as',
        kind: 'submenu',
        label: 'Export As',
        children: [
          { id: 'export-png', kind: 'action', label: 'Refracted PNG (2×)', shortcut: '⇧⌘E' },
          { id: 'export-svg', kind: 'action', label: 'Vector Tokens SVG' },
          { id: 'export-css', kind: 'action', label: 'Prism CSS Cascade' },
          { id: 'sep-export-1', kind: 'separator' },
          {
            id: 'export-caustics',
            kind: 'checkbox',
            label: 'Embed Caustic Metadata',
            checked: true,
          },
        ],
      },
      { id: 'sep-file-2', kind: 'separator' },
      {
        id: 'close-workspace',
        kind: 'action',
        label: 'Close Workspace',
        shortcut: '⌘W',
        danger: true,
      },
    ],
  },
  {
    id: 'edit',
    label: 'Edit',
    items: [
      { id: 'undo', kind: 'action', label: 'Undo', shortcut: '⌘Z' },
      { id: 'redo', kind: 'action', label: 'Redo', shortcut: '⇧⌘Z' },
      { id: 'sep-edit-1', kind: 'separator' },
      { id: 'cut', kind: 'action', label: 'Cut', shortcut: '⌘X' },
      { id: 'copy', kind: 'action', label: 'Copy', shortcut: '⌘C' },
      { id: 'paste', kind: 'action', label: 'Paste', shortcut: '⌘V' },
      { id: 'sep-edit-2', kind: 'separator' },
      { id: 'command-palette', kind: 'action', label: 'Command Palette…', shortcut: '⇧⌘P' },
    ],
  },
  {
    id: 'view',
    label: 'View',
    items: [
      {
        id: 'show-optical-grid',
        kind: 'checkbox',
        label: 'Show Optical Grid',
        shortcut: "⌘'",
        checked: true,
      },
      {
        id: 'show-rulers',
        kind: 'checkbox',
        label: 'Show Rulers',
        shortcut: '⌘R',
        checked: false,
      },
      {
        id: 'live-caustics',
        kind: 'checkbox',
        label: 'Live Caustic Preview',
        checked: true,
      },
      { id: 'sep-view-1', kind: 'separator' },
      { id: 'zoom-in', kind: 'action', label: 'Zoom In', shortcut: '⌘+' },
      { id: 'zoom-out', kind: 'action', label: 'Zoom Out', shortcut: '⌘-' },
      { id: 'actual-size', kind: 'action', label: 'Actual Size', shortcut: '⌘0' },
    ],
  },
  {
    id: 'window',
    label: 'Window',
    items: [
      { id: 'minimize', kind: 'action', label: 'Minimize', shortcut: '⌘M' },
      { id: 'tile-left', kind: 'action', label: 'Tile Left Half' },
      { id: 'tile-right', kind: 'action', label: 'Tile Right Half' },
      { id: 'sep-window-1', kind: 'separator' },
      { id: 'bring-all-front', kind: 'action', label: 'Bring All to Front' },
      {
        id: 'detach-inspector',
        kind: 'action',
        label: 'Detach Inspector (Locked)',
        disabled: true,
      },
    ],
  },
  {
    id: 'help',
    label: 'Help',
    items: [
      { id: 'documentation', kind: 'action', label: 'Refractor Documentation' },
      { id: 'keyboard-shortcuts', kind: 'action', label: 'Keyboard Shortcuts', shortcut: '⌘/' },
      { id: 'sep-help-1', kind: 'separator' },
      { id: 'about-refractor', kind: 'action', label: 'About Refractor' },
    ],
  },
];

function isSeparatorEntry(entry: AppMenuEntry): entry is AppMenuSeparatorItem {
  return entry.kind === 'separator';
}

function resolveActionKind(item: AppMenuActionItem): 'action' | 'checkbox' | 'submenu' {
  if (item.kind === 'checkbox' || item.kind === 'submenu' || item.kind === 'action') {
    return item.kind;
  }
  if (item.children && item.children.length > 0) {
    return 'submenu';
  }
  return 'action';
}

function getEnabledActionItems(entries: ReadonlyArray<AppMenuEntry>): ReadonlyArray<AppMenuActionItem> {
  const result: AppMenuActionItem[] = [];
  for (const entry of entries) {
    if (!isSeparatorEntry(entry) && !entry.disabled) {
      result.push(entry);
    }
  }
  return result;
}

function getAtOrFallback<T>(list: ReadonlyArray<T>, index: number, fallback: T): T {
  const item = list[index];
  return item !== undefined ? item : fallback;
}

function pickNavigationTarget(
  enabled: ReadonlyArray<AppMenuActionItem>,
  currentItem: AppMenuActionItem,
  key: 'ArrowDown' | 'ArrowUp' | 'Home' | 'End'
): AppMenuActionItem {
  const currentIndex = enabled.findIndex((entry) => entry.id === currentItem.id);
  const nextIndex =
    key === 'Home'
      ? 0
      : key === 'End'
        ? enabled.length - 1
        : (currentIndex + (key === 'ArrowDown' ? 1 : -1) + enabled.length) % enabled.length;
  return getAtOrFallback(enabled, nextIndex, currentItem);
}

function makeCheckKey(menuId: string, itemId: string): string {
  return `${menuId}\0${itemId}`;
}

function makeItemNodeKey(menuId: string, itemId: string): string {
  return `${menuId}\0${itemId}`;
}

function makeSubitemNodeKey(menuId: string, submenuId: string, itemId: string): string {
  return `${menuId}\0${submenuId}\0${itemId}`;
}

const barClass = /*#__PURE__*/ stableClassName('app-menu-bar', 'bar');
const brandClass = /*#__PURE__*/ stableClassName('app-menu-bar', 'brand');
const menuClass = /*#__PURE__*/ stableClassName('app-menu-bar', 'menu');
const submenuClass = /*#__PURE__*/ stableClassName('app-menu-bar', 'submenu');
const itemClass = /*#__PURE__*/ stableClassName('app-menu-bar', 'item');
const statusClass = /*#__PURE__*/ stableClassName('app-menu-bar', 'status');

function AppMenuBarInner({
  menus = DEFAULT_APP_MENUS,
  brandLabel = 'Refractor',
  onSelectAction,
  onToggleCheck,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: AppMenuBarProps) {
  const instanceId = useId();
  const override = useComponentOverride('AppMenuBar');

  const rootRef = useRef<HTMLDivElement>(null);
  const mergedRef = useMergedRefs<HTMLDivElement>(rootRef, ref);

  const triggerNodesRef = useRef<Map<string, HTMLButtonElement>>(new Map());
  const itemNodesRef = useRef<Map<string, HTMLButtonElement>>(new Map());
  const subitemNodesRef = useRef<Map<string, HTMLButtonElement>>(new Map());

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [openSubmenuId, setOpenSubmenuId] = useState<string | null>(null);
  const [rovingMenuId, setRovingMenuId] = useState<string | null>(null);
  const [focusRequest, setFocusRequest] = useState<FocusTarget | null>(null);
  const [checkedOverrides, setCheckedOverrides] = useState<ReadonlyMap<string, CheckedOverrideRecord>>(
    () => new Map()
  );
  const [lastStatus, setLastStatus] = useState<string | null>(null);

  const activeOpenMenu = useMemo(
    () => menus.find((group) => group.id === openMenuId) ?? null,
    [menus, openMenuId]
  );
  const effectiveOpenMenuId = activeOpenMenu ? activeOpenMenu.id : null;
  const effectiveOpenSubmenuId = effectiveOpenMenuId ? openSubmenuId : null;

  const effectiveRovingMenuId = useMemo(() => {
    if (effectiveOpenMenuId) return effectiveOpenMenuId;
    if (rovingMenuId && menus.some((group) => group.id === rovingMenuId)) {
      return rovingMenuId;
    }
    return menus[0]?.id ?? null;
  }, [effectiveOpenMenuId, menus, rovingMenuId]);

  const registerTriggerNode = useCallback((menuId: string, node: HTMLButtonElement | null) => {
    if (node) {
      triggerNodesRef.current.set(menuId, node);
    } else {
      triggerNodesRef.current.delete(menuId);
    }
  }, []);

  const registerItemNode = useCallback((key: string, node: HTMLButtonElement | null) => {
    if (node) {
      itemNodesRef.current.set(key, node);
    } else {
      itemNodesRef.current.delete(key);
    }
  }, []);

  const registerSubitemNode = useCallback((key: string, node: HTMLButtonElement | null) => {
    if (node) {
      subitemNodesRef.current.set(key, node);
    } else {
      subitemNodesRef.current.delete(key);
    }
  }, []);

  useEffect(() => {
    if (!focusRequest) return;
    if (focusRequest.scope === 'trigger') {
      triggerNodesRef.current.get(focusRequest.menuId)?.focus();
    } else if (focusRequest.scope === 'item') {
      itemNodesRef.current
        .get(makeItemNodeKey(focusRequest.menuId, focusRequest.itemId))
        ?.focus();
    } else {
      subitemNodesRef.current
        .get(makeSubitemNodeKey(focusRequest.menuId, focusRequest.submenuId, focusRequest.itemId))
        ?.focus();
    }
  }, [focusRequest]);

  useEffect(() => {
    if (effectiveOpenMenuId === null) return undefined;

    const handleOutsideMouseDown = (event: MouseEvent) => {
      if (
        rootRef.current &&
        event.target instanceof Node &&
        !rootRef.current.contains(event.target)
      ) {
        setOpenMenuId(null);
        setOpenSubmenuId(null);
      }
    };

    const handleWindowKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpenMenuId(null);
        setOpenSubmenuId(null);
        setFocusRequest({ scope: 'trigger', menuId: effectiveOpenMenuId });
      }
    };

    document.addEventListener('mousedown', handleOutsideMouseDown);
    window.addEventListener('keydown', handleWindowKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideMouseDown);
      window.removeEventListener('keydown', handleWindowKeyDown);
    };
  }, [effectiveOpenMenuId]);

  const getIsChecked = useCallback(
    (menuId: string, item: AppMenuActionItem): boolean => {
      const base = Boolean(item.checked);
      const overrideEntry = checkedOverrides.get(makeCheckKey(menuId, item.id));
      if (overrideEntry && overrideEntry.base === base) {
        return overrideEntry.value;
      }
      return base;
    },
    [checkedOverrides]
  );

  const closeMenu = useCallback((restoreTriggerId?: string) => {
    setOpenMenuId(null);
    setOpenSubmenuId(null);
    if (restoreTriggerId) {
      setFocusRequest({ scope: 'trigger', menuId: restoreTriggerId });
    }
  }, []);

  const openMenuAndFocusItem = useCallback((group: AppMenuGroup, position: 'first' | 'last') => {
    setOpenMenuId(group.id);
    setOpenSubmenuId(null);
    setRovingMenuId(group.id);
    const enabled = getEnabledActionItems(group.items);
    const target = position === 'first' ? enabled[0] : enabled[enabled.length - 1];
    if (target) {
      setFocusRequest({ scope: 'item', menuId: group.id, itemId: target.id });
    }
  }, []);

  const selectTopLevelByIndex = useCallback(
    (index: number, fallbackGroup: AppMenuGroup, keepOpen: boolean) => {
      const targetGroup = getAtOrFallback(menus, index, fallbackGroup);
      setRovingMenuId(targetGroup.id);
      setOpenSubmenuId(null);
      if (keepOpen) {
        setOpenMenuId(targetGroup.id);
      }
      setFocusRequest({ scope: 'trigger', menuId: targetGroup.id });
    },
    [menus]
  );

  const switchTopLevelFromDropdown = useCallback(
    (currentMenuIndex: number, fallbackGroup: AppMenuGroup, delta: number) => {
      const nextIndex = (currentMenuIndex + delta + menus.length) % menus.length;
      const nextGroup = getAtOrFallback(menus, nextIndex, fallbackGroup);
      setOpenMenuId(nextGroup.id);
      setOpenSubmenuId(null);
      setRovingMenuId(nextGroup.id);
      const firstEnabled = getEnabledActionItems(nextGroup.items)[0];
      if (firstEnabled) {
        setFocusRequest({ scope: 'item', menuId: nextGroup.id, itemId: firstEnabled.id });
      } else {
        setFocusRequest({ scope: 'trigger', menuId: nextGroup.id });
      }
    },
    [menus]
  );

  const openSubmenuAndFocusFirst = useCallback((menuId: string, item: AppMenuActionItem) => {
    setOpenSubmenuId(item.id);
    const firstChild = getEnabledActionItems(item.children ?? [])[0];
    if (firstChild) {
      setFocusRequest({
        scope: 'subitem',
        menuId,
        submenuId: item.id,
        itemId: firstChild.id,
      });
    }
  }, []);

  const activateLeafEntry = useCallback(
    (group: AppMenuGroup, item: AppMenuActionItem, kind: 'action' | 'checkbox') => {
      if (kind === 'checkbox') {
        const base = Boolean(item.checked);
        const nextChecked = !getIsChecked(group.id, item);
        setCheckedOverrides((prev) => {
          const next = new Map(prev);
          next.set(makeCheckKey(group.id, item.id), { base, value: nextChecked });
          return next;
        });
        setLastStatus(`${group.label} › ${item.label}: ${nextChecked ? 'On' : 'Off'}`);
        onToggleCheck?.(item.id, nextChecked, group.id);
        return;
      }

      setLastStatus(`${group.label} › ${item.label}`);
      onSelectAction?.(item, group.id);
      closeMenu(group.id);
    },
    [closeMenu, getIsChecked, onSelectAction, onToggleCheck]
  );

  const handleTriggerKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>, group: AppMenuGroup, menuIndex: number) => {
      if (event.nativeEvent.isComposing) return;
      const isAnyOpen = effectiveOpenMenuId !== null;

      switch (event.key) {
        case 'ArrowRight': {
          event.preventDefault();
          selectTopLevelByIndex((menuIndex + 1) % menus.length, group, isAnyOpen);
          break;
        }
        case 'ArrowLeft': {
          event.preventDefault();
          selectTopLevelByIndex((menuIndex - 1 + menus.length) % menus.length, group, isAnyOpen);
          break;
        }
        case 'Home': {
          event.preventDefault();
          selectTopLevelByIndex(0, group, isAnyOpen);
          break;
        }
        case 'End': {
          event.preventDefault();
          selectTopLevelByIndex(menus.length - 1, group, isAnyOpen);
          break;
        }
        case 'ArrowDown': {
          event.preventDefault();
          openMenuAndFocusItem(group, 'first');
          break;
        }
        case 'ArrowUp': {
          event.preventDefault();
          openMenuAndFocusItem(group, 'last');
          break;
        }
        case 'Enter':
        case ' ': {
          event.preventDefault();
          if (effectiveOpenMenuId === group.id) {
            closeMenu();
          } else {
            openMenuAndFocusItem(group, 'first');
          }
          break;
        }
        case 'Escape': {
          if (isAnyOpen) {
            event.preventDefault();
            closeMenu();
          }
          break;
        }
        default:
          break;
      }
    },
    [closeMenu, effectiveOpenMenuId, menus.length, openMenuAndFocusItem, selectTopLevelByIndex]
  );

  const handleDropdownItemKeyDown = useCallback(
    (
      event: ReactKeyboardEvent<HTMLButtonElement>,
      group: AppMenuGroup,
      menuIndex: number,
      item: AppMenuActionItem,
      entryKind: 'action' | 'checkbox' | 'submenu'
    ) => {
      if (event.nativeEvent.isComposing) return;

      switch (event.key) {
        case 'ArrowDown':
        case 'ArrowUp':
        case 'Home':
        case 'End': {
          event.preventDefault();
          const enabled = getEnabledActionItems(group.items);
          const next = pickNavigationTarget(enabled, item, event.key);
          setOpenSubmenuId(null);
          setFocusRequest({ scope: 'item', menuId: group.id, itemId: next.id });
          break;
        }
        case 'ArrowRight': {
          event.preventDefault();
          if (entryKind === 'submenu') {
            openSubmenuAndFocusFirst(group.id, item);
          } else {
            switchTopLevelFromDropdown(menuIndex, group, 1);
          }
          break;
        }
        case 'ArrowLeft': {
          event.preventDefault();
          switchTopLevelFromDropdown(menuIndex, group, -1);
          break;
        }
        case 'Enter':
        case ' ': {
          event.preventDefault();
          if (entryKind === 'submenu') {
            openSubmenuAndFocusFirst(group.id, item);
          } else {
            activateLeafEntry(group, item, entryKind);
          }
          break;
        }
        case 'Escape': {
          event.preventDefault();
          closeMenu(group.id);
          break;
        }
        case 'Tab': {
          closeMenu();
          break;
        }
        default:
          break;
      }
    },
    [activateLeafEntry, closeMenu, openSubmenuAndFocusFirst, switchTopLevelFromDropdown]
  );

  const handleSubmenuItemKeyDown = useCallback(
    (
      event: ReactKeyboardEvent<HTMLButtonElement>,
      group: AppMenuGroup,
      menuIndex: number,
      parentItem: AppMenuActionItem,
      subEntries: ReadonlyArray<AppMenuEntry>,
      subItem: AppMenuActionItem,
      subKind: 'action' | 'checkbox'
    ) => {
      if (event.nativeEvent.isComposing) return;

      switch (event.key) {
        case 'ArrowDown':
        case 'ArrowUp':
        case 'Home':
        case 'End': {
          event.preventDefault();
          const enabledSub = getEnabledActionItems(subEntries);
          const next = pickNavigationTarget(enabledSub, subItem, event.key);
          setFocusRequest({
            scope: 'subitem',
            menuId: group.id,
            submenuId: parentItem.id,
            itemId: next.id,
          });
          break;
        }
        case 'ArrowLeft': {
          event.preventDefault();
          setOpenSubmenuId(null);
          setFocusRequest({ scope: 'item', menuId: group.id, itemId: parentItem.id });
          break;
        }
        case 'ArrowRight': {
          event.preventDefault();
          switchTopLevelFromDropdown(menuIndex, group, 1);
          break;
        }
        case 'Enter':
        case ' ': {
          event.preventDefault();
          activateLeafEntry(group, subItem, subKind);
          break;
        }
        case 'Escape': {
          event.preventDefault();
          closeMenu(group.id);
          break;
        }
        case 'Tab': {
          closeMenu();
          break;
        }
        default:
          break;
      }
    },
    [activateLeafEntry, closeMenu, switchTopLevelFromDropdown]
  );

  const merged = mergeProps({
    themeTarget: themeProps('app-menu-bar', {
      open: effectiveOpenMenuId !== null,
      activeMenu: effectiveOpenMenuId ?? undefined,
      activeSubmenu: effectiveOpenSubmenuId ?? undefined,
    }),
    baseClassName: 'relative w-full min-w-0 max-w-full',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });


  const trimmedBrand = brandLabel.trim();

  return (
    <div ref={mergedRef} {...rest} {...merged}>
      <div
        className={cx(
          barClass,
          'prism-slab w-full min-w-0 max-w-full px-2.5 py-1.5 flex flex-wrap items-center justify-between gap-2'
        )}
      >
        <div className="flex flex-wrap items-center gap-1.5 min-w-0 max-w-full">
          {trimmedBrand.length > 0 ? (
            <>
              <span
                className={cx(
                  brandClass,
                  'prism-crystal rounded-full px-2.5 py-1 inline-flex items-center gap-1.5 text-xs font-bold tracking-[-0.01em] select-none shrink-0 max-w-full min-w-0'
                )}
                style={STYLE_TEXT_PRIMARY}
              >
                <Layers
                  aria-hidden="true"
                  className="w-3.5 h-3.5 shrink-0"
                  style={STYLE_PRIMARY_MAIN}
                />
                <span className="truncate">{trimmedBrand}</span>
              </span>
              <span
                aria-hidden="true"
                className="h-4 w-px shrink-0"
                style={STYLE_BG_DIVIDER}
              />
            </>
          ) : null}

          <div
            role="menubar"
            aria-label="Application menu bar"
            className="flex flex-wrap items-center gap-0.5 min-w-0 max-w-full"
          >
            {menus.length === 0 ? (
              <span
                className="px-2.5 py-1 text-xs font-medium select-none"
                style={STYLE_TEXT_SECONDARY}
              >
                No menus
              </span>
            ) : (
              menus.map((group, menuIndex) => {
                const isOpen = effectiveOpenMenuId === group.id;
                const isRoving = effectiveRovingMenuId === group.id;
                const dropdownId = `${instanceId}-menu-${group.id}`;

                return (
                  <div key={group.id} className="relative">
                    <button
                      ref={(node) => registerTriggerNode(group.id, node)}
                      type="button"
                      role="menuitem"
                      aria-haspopup="menu"
                      aria-expanded={isOpen}
                      aria-controls={isOpen ? dropdownId : undefined}
                      tabIndex={isRoving ? 0 : -1}
                      data-active={isOpen ? 'true' : undefined}
                      onClick={() => {
                        if (isOpen) {
                          closeMenu();
                        } else {
                          setOpenMenuId(group.id);
                          setOpenSubmenuId(null);
                          setRovingMenuId(group.id);
                        }
                      }}
                      onMouseEnter={() => {
                        if (effectiveOpenMenuId !== null && effectiveOpenMenuId !== group.id) {
                          setOpenMenuId(group.id);
                          setOpenSubmenuId(null);
                          setRovingMenuId(group.id);
                        }
                      }}
                      onKeyDown={(event) => handleTriggerKeyDown(event, group, menuIndex)}
                      style={
                        isOpen
                          ? undefined
                          : STYLE_TEXT_PRIMARY
                      }
                      className={cx(
                        'prism-focus-ring px-2.5 py-1 rounded-xl text-xs font-semibold tracking-[-0.01em] whitespace-nowrap cursor-pointer select-none transition-colors',
                        isOpen
                          ? 'prism-btn-primary'
                          : 'hover:bg-[color-mix(in_srgb,var(--prism-secondary-main)_14%,transparent)]'
                      )}
                    >
                      <span className="relative z-10">{group.label}</span>
                    </button>

                    {isOpen ? (
                      <div
                        id={dropdownId}
                        role="menu"
                        aria-label={group.label}
                        className={cx(
                          menuClass,
                          'prism-slab absolute left-0 top-full mt-1.5 z-40 min-w-[13.5rem] w-[15.5rem] max-w-[calc(100vw-2rem)] p-1.5 flex flex-col gap-0.5'
                        )}
                      >
                        {group.items.length === 0 ? (
                          <div
                            role="menuitem"
                            aria-disabled="true"
                            className="px-3 py-1.5 text-xs select-none"
                            style={STYLE_TEXT_SECONDARY}
                          >
                            No items
                          </div>
                        ) : (
                          group.items.map((entry) => {
                            if (isSeparatorEntry(entry)) {
                              return (
                                <div
                                  key={entry.id}
                                  role="separator"
                                  className="my-1 mx-2 h-px"
                                  style={STYLE_BG_DIVIDER}
                                />
                              );
                            }

                            const entryKind = resolveActionKind(entry);
                            const isChecked =
                              entryKind === 'checkbox' ? getIsChecked(group.id, entry) : false;
                            const isSubOpen =
                              entryKind === 'submenu' && effectiveOpenSubmenuId === entry.id;
                            const submenuId = `${dropdownId}-sub-${entry.id}`;
                            const itemNodeKey = makeItemNodeKey(group.id, entry.id);

                            const itemButton = (
                              <button
                                key={entryKind === 'submenu' ? undefined : entry.id}
                                ref={(node) => registerItemNode(itemNodeKey, node)}
                                type="button"
                                role={entryKind === 'checkbox' ? 'menuitemcheckbox' : 'menuitem'}
                                aria-checked={entryKind === 'checkbox' ? isChecked : undefined}
                                aria-haspopup={entryKind === 'submenu' ? 'menu' : undefined}
                                aria-expanded={entryKind === 'submenu' ? isSubOpen : undefined}
                                aria-controls={
                                  entryKind === 'submenu' && isSubOpen ? submenuId : undefined
                                }
                                disabled={entry.disabled}
                                aria-disabled={entry.disabled ? 'true' : undefined}
                                tabIndex={-1}
                                onMouseEnter={() => {
                                  if (entryKind === 'submenu' && !entry.disabled) {
                                    setOpenSubmenuId(entry.id);
                                  } else if (openSubmenuId !== null) {
                                    setOpenSubmenuId(null);
                                  }
                                }}
                                onClick={() => {
                                  if (entryKind === 'submenu') {
                                    setOpenSubmenuId((prev) =>
                                      prev === entry.id ? null : entry.id
                                    );
                                  } else {
                                    activateLeafEntry(group, entry, entryKind);
                                  }
                                }}
                                onKeyDown={(event) =>
                                  handleDropdownItemKeyDown(
                                    event,
                                    group,
                                    menuIndex,
                                    entry,
                                    entryKind
                                  )
                                }
                                style={{
                                  color: entry.disabled
                                    ? 'var(--prism-text-disabled)'
                                    : entry.danger
                                      ? 'var(--prism-error-main)'
                                      : 'var(--prism-text-primary)',
                                  backgroundColor: isSubOpen
                                    ? 'color-mix(in srgb, var(--prism-secondary-main) 18%, transparent)'
                                    : undefined,
                                }}
                                className={cx(
                                  itemClass,
                                  'prism-focus-ring w-full min-w-0 px-2.5 py-1.5 rounded-xl flex items-center justify-between gap-3 text-left text-xs font-medium cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
                                  entry.danger
                                    ? 'enabled:hover:bg-[color-mix(in_srgb,var(--prism-error-main)_14%,transparent)]'
                                    : 'enabled:hover:bg-[color-mix(in_srgb,var(--prism-secondary-main)_14%,transparent)]'
                                )}
                              >
                                <span className="flex items-center gap-2 min-w-0 flex-1">
                                  <span
                                    aria-hidden="true"
                                    className="w-3.5 h-3.5 shrink-0 inline-flex items-center justify-center"
                                  >
                                    {entryKind === 'checkbox' && isChecked ? (
                                      <Check
                                        className="w-3.5 h-3.5"
                                        style={STYLE_PRIMARY_MAIN}
                                      />
                                    ) : null}
                                  </span>
                                  <span className="truncate">{entry.label}</span>
                                </span>

                                <span className="shrink-0 inline-flex items-center gap-1.5">
                                  {entry.shortcut ? (
                                    <span
                                      aria-hidden="true"
                                      className="font-mono text-[11px] tabular-nums tracking-tight"
                                      style={{
                                        color: entry.danger
                                          ? 'var(--prism-error-main)'
                                          : 'var(--prism-text-secondary)',
                                      }}
                                    >
                                      {entry.shortcut}
                                    </span>
                                  ) : null}
                                  {entryKind === 'submenu' ? (
                                    <ChevronRight
                                      aria-hidden="true"
                                      className="w-3.5 h-3.5"
                                      style={STYLE_TEXT_SECONDARY}
                                    />
                                  ) : null}
                                </span>
                              </button>
                            );

                            if (entryKind !== 'submenu') {
                              return itemButton;
                            }

                            const subEntries = entry.children ?? [];

                            return (
                              <div key={entry.id} className="relative">
                                {itemButton}

                                {isSubOpen ? (
                                  <div
                                    id={submenuId}
                                    role="menu"
                                    aria-label={entry.label}
                                    className={cx(
                                      submenuClass,
                                      'prism-slab absolute left-0 top-full mt-1 sm:left-full sm:top-0 sm:mt-0 sm:ml-1.5 z-50 min-w-[12.5rem] w-[14.5rem] max-w-[calc(100vw-2rem)] p-1.5 flex flex-col gap-0.5'
                                    )}
                                  >
                                    {subEntries.length === 0 ? (
                                      <div
                                        role="menuitem"
                                        aria-disabled="true"
                                        className="px-3 py-1.5 text-xs select-none"
                                        style={STYLE_TEXT_SECONDARY}
                                      >
                                        No items
                                      </div>
                                    ) : (
                                      subEntries.map((subEntry) => {
                                        if (isSeparatorEntry(subEntry)) {
                                          return (
                                            <div
                                              key={subEntry.id}
                                              role="separator"
                                              className="my-1 mx-2 h-px"
                                              style={STYLE_BG_DIVIDER}
                                            />
                                          );
                                        }

                                        const subKind: 'action' | 'checkbox' =
                                          subEntry.kind === 'checkbox' ? 'checkbox' : 'action';
                                        const subChecked =
                                          subKind === 'checkbox'
                                            ? getIsChecked(group.id, subEntry)
                                            : false;
                                        const subNodeKey = makeSubitemNodeKey(
                                          group.id,
                                          entry.id,
                                          subEntry.id
                                        );

                                        return (
                                          <button
                                            key={subEntry.id}
                                            ref={(node) => registerSubitemNode(subNodeKey, node)}
                                            type="button"
                                            role={
                                              subKind === 'checkbox'
                                                ? 'menuitemcheckbox'
                                                : 'menuitem'
                                            }
                                            aria-checked={
                                              subKind === 'checkbox' ? subChecked : undefined
                                            }
                                            disabled={subEntry.disabled}
                                            aria-disabled={subEntry.disabled ? 'true' : undefined}
                                            tabIndex={-1}
                                            onClick={() =>
                                              activateLeafEntry(group, subEntry, subKind)
                                            }
                                            onKeyDown={(event) =>
                                              handleSubmenuItemKeyDown(
                                                event,
                                                group,
                                                menuIndex,
                                                entry,
                                                subEntries,
                                                subEntry,
                                                subKind
                                              )
                                            }
                                            style={{
                                              color: subEntry.disabled
                                                ? 'var(--prism-text-disabled)'
                                                : subEntry.danger
                                                  ? 'var(--prism-error-main)'
                                                  : 'var(--prism-text-primary)',
                                            }}
                                            className={cx(
                                              itemClass,
                                              'prism-focus-ring w-full min-w-0 px-2.5 py-1.5 rounded-xl flex items-center justify-between gap-3 text-left text-xs font-medium cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
                                              subEntry.danger
                                                ? 'enabled:hover:bg-[color-mix(in_srgb,var(--prism-error-main)_14%,transparent)]'
                                                : 'enabled:hover:bg-[color-mix(in_srgb,var(--prism-secondary-main)_14%,transparent)]'
                                            )}
                                          >
                                            <span className="flex items-center gap-2 min-w-0 flex-1">
                                              <span
                                                aria-hidden="true"
                                                className="w-3.5 h-3.5 shrink-0 inline-flex items-center justify-center"
                                              >
                                                {subKind === 'checkbox' && subChecked ? (
                                                  <Check
                                                    className="w-3.5 h-3.5"
                                                    style={STYLE_PRIMARY_MAIN}
                                                  />
                                                ) : null}
                                              </span>
                                              <span className="truncate">{subEntry.label}</span>
                                            </span>
                                            {subEntry.shortcut ? (
                                              <span
                                                aria-hidden="true"
                                                className="shrink-0 font-mono text-[11px] tabular-nums tracking-tight"
                                                style={{
                                                  color: subEntry.danger
                                                    ? 'var(--prism-error-main)'
                                                    : 'var(--prism-text-secondary)',
                                                }}
                                              >
                                                {subEntry.shortcut}
                                              </span>
                                            ) : null}
                                          </button>
                                        );
                                      })
                                    )}
                                  </div>
                                ) : null}
                              </div>
                            );
                          })
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div
          role="status"
          aria-live="polite"
          data-testid="app-menu-status"
          className={cx(
            statusClass,
            'prism-well rounded-full px-2.5 py-1 inline-flex items-center gap-1.5 min-w-0 max-w-full text-[11px] font-mono tabular-nums'
          )}
        >
          <span
            aria-hidden="true"
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{
              backgroundColor: lastStatus
                ? 'var(--prism-success-main)'
                : 'var(--prism-text-secondary)',
            }}
          />
          <span
            className="truncate"
            style={{
              color: lastStatus ? 'var(--prism-text-primary)' : 'var(--prism-text-secondary)',
            }}
          >
            {lastStatus ?? 'Ready'}
          </span>
        </div>
      </div>
    </div>
  );
}

export const AppMenuBar = /*#__PURE__*/ memoWithDisplayName(AppMenuBarInner, 'AppMenuBar');
