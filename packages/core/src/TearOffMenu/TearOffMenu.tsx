'use client';

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  Check,
  ChevronDown,
  CornerUpLeft,
  GripHorizontal,
  Layers,
  Pin,
  X,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { createCoalescedPointerMove } from '../hooks/useRafCallback';
import { useControllableState } from '../hooks/useControllableState';
import { useMergedRefs } from '../hooks/useMergedRefs';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { STYLE_PRIMARY_MAIN, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export interface TearOffMenuItem {
  /** Unique identifier for the menu action. */
  id: string;
  /** Visible display label for the action. */
  label: string;
  /** Optional right-aligned monospace keyboard shortcut hint (e.g. '⌘0'). */
  shortcut?: string;
  /** When defined as a boolean, renders the item as a toggleable checkable action. */
  checked?: boolean;
  /** Disables interaction and removes the item from keyboard arrow traversal. */
  disabled?: boolean;
}

type TearOffMenuBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface TearOffMenuProps extends TearOffMenuBaseProps {
  /** Label displayed on the parent menu bar trigger and floating palette titlebar (defaults to 'View & Guides'). */
  menuLabel?: string;
  /** Menu actions rendered inside both the docked dropdown and torn-off floating palette. */
  items?: ReadonlyArray<TearOffMenuItem>;
  /** Controlled open visibility of the docked dropdown menu. */
  open?: boolean;
  /** Initial uncontrolled open state of the docked dropdown menu (defaults to false). */
  defaultOpen?: boolean;
  /** Controlled detached state indicating whether the menu is torn off as a persistent floating palette. */
  detached?: boolean;
  /** Initial uncontrolled detached state (defaults to false). */
  defaultDetached?: boolean;
  /** Callback fired when the docked dropdown open state changes. */
  onOpenChange?: (open: boolean) => void;
  /** Callback fired when the menu is torn off into a floating palette or docked/closed back. */
  onDetachedChange?: (detached: boolean) => void;
  /** Callback fired when an enabled item is activated in either docked or floating palette state. */
  onSelectItem?: (item: TearOffMenuItem) => void;
  /** Disables the menu trigger, perforated tear-off grip, floating palette controls, and items. */
  disabled?: boolean;
}

interface NormalizedTearOffMenuItem {
  reactKey: string;
  item: TearOffMenuItem;
  label: string;
  shortcut?: string;
  isCheckable: boolean;
  baseChecked: boolean;
  isDisabled: boolean;
}

interface CheckedOverrideRecord {
  base: boolean;
  value: boolean;
}

type FocusRequest =
  | { target: 'trigger' }
  | { target: 'dock-back' }
  | { target: 'docked-item'; key: string }
  | { target: 'palette-item'; key: string };

const DEFAULT_MENU_LABEL = 'View & Guides';
const TEAR_OFF_DRAG_THRESHOLD_PX = 24;
const PERFORATION_DOT_KEYS = [
  'perf-1',
  'perf-2',
  'perf-3',
  'perf-4',
  'perf-5',
  'perf-6',
] as const;

export const DEFAULT_TEAR_OFF_MENU_ITEMS: ReadonlyArray<TearOffMenuItem> = [
  {
    id: 'snap-optical-grid',
    label: 'Snap to Optical Grid',
    checked: true,
  },
  {
    id: 'show-specular-guides',
    label: 'Show Specular Guides',
    checked: true,
  },
  {
    id: 'align-pixel-bounds',
    label: 'Align to Pixel Bounds',
  },
  {
    id: 'reset-viewport',
    label: 'Reset Viewport',
    shortcut: '⌘0',
  },
  {
    id: 'disabled-tool',
    label: 'Disabled Tool',
    disabled: true,
  },
];

function normalizeItems(
  source: ReadonlyArray<TearOffMenuItem>
): ReadonlyArray<NormalizedTearOffMenuItem> {
  const seenIds = new Map<string, number>();

  return source.map((item, idx) => {
    const trimmedId = item.id.trim();
    const safeId = trimmedId || `item-${idx + 1}`;
    const count = seenIds.get(safeId) ?? 0;
    seenIds.set(safeId, count + 1);
    const reactKey = count === 0 ? safeId : `${safeId}#${count + 1}`;
    const trimmedLabel = item.label.trim();
    const trimmedShortcut = item.shortcut?.trim();

    return {
      reactKey,
      item,
      label: trimmedLabel || safeId,
      shortcut: trimmedShortcut || undefined,
      isCheckable: typeof item.checked === 'boolean',
      baseChecked: Boolean(item.checked),
      isDisabled: Boolean(item.disabled),
    };
  });
}

function pickNextEnabledEntry(
  enabled: ReadonlyArray<NormalizedTearOffMenuItem>,
  currentKey: string,
  key: 'ArrowDown' | 'ArrowUp' | 'Home' | 'End'
): NormalizedTearOffMenuItem | undefined {
  const currentIndex = enabled.findIndex((entry) => entry.reactKey === currentKey);
  const nextIndex =
    key === 'Home'
      ? 0
      : key === 'End'
        ? enabled.length - 1
        : (currentIndex + (key === 'ArrowDown' ? 1 : -1) + enabled.length) %
          enabled.length;
  return enabled[nextIndex];
}

const barClass = /*#__PURE__*/ stableClassName('tear-off-menu', 'bar');
const triggerClass = /*#__PURE__*/ stableClassName('tear-off-menu', 'trigger');
const statusPillClass = /*#__PURE__*/ stableClassName('tear-off-menu', 'status-pill');
const dropdownClass = /*#__PURE__*/ stableClassName('tear-off-menu', 'dropdown');
const gripClass = /*#__PURE__*/ stableClassName('tear-off-menu', 'grip');
const paletteClass = /*#__PURE__*/ stableClassName('tear-off-menu', 'palette');
const paletteHeaderClass = /*#__PURE__*/ stableClassName('tear-off-menu', 'palette-header');
const itemClass = /*#__PURE__*/ stableClassName('tear-off-menu', 'item');

function TearOffMenuInner({
  menuLabel = DEFAULT_MENU_LABEL,
  items = DEFAULT_TEAR_OFF_MENU_ITEMS,
  open,
  defaultOpen = false,
  detached,
  defaultDetached = false,
  onOpenChange,
  onDetachedChange,
  onSelectItem,
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: TearOffMenuProps) {
  const instanceId = useId();
  const dropdownId = `${instanceId}-dropdown`;
  const paletteHeadingId = `${instanceId}-palette-heading`;
  const override = useComponentOverride('TearOffMenu');

  const rootRef = useRef<HTMLDivElement>(null);
  const mergedRef = useMergedRefs<HTMLDivElement>(rootRef, ref);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dockBackRef = useRef<HTMLButtonElement>(null);
  const dockedItemNodesRef = useRef<Map<string, HTMLButtonElement>>(new Map());
  const paletteItemNodesRef = useRef<Map<string, HTMLButtonElement>>(new Map());
  const cleanupDragRef = useRef<(() => void) | null>(null);

  const [isOpen, setOpen] = useControllableState<boolean>({
    value: open,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });

  const [isDetached, setDetached] = useControllableState<boolean>({
    value: detached,
    defaultValue: defaultDetached,
    onChange: onDetachedChange,
  });

  const [checkedOverrides, setCheckedOverrides] = useState<
    ReadonlyMap<string, CheckedOverrideRecord>
  >(() => new Map());
  const [isDraggingGrip, setIsDraggingGrip] = useState<boolean>(false);
  const [dragDistancePx, setDragDistancePx] = useState<number>(0);
  const [announcement, setAnnouncement] = useState<string>('');
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null);

  const resolvedMenuLabel = menuLabel.trim() || DEFAULT_MENU_LABEL;
  const isDockedDropdownOpen = isOpen && !isDetached;
  const effectiveDragging = isDraggingGrip && !disabled && isDockedDropdownOpen;
  const effectiveDragDistance = effectiveDragging ? dragDistancePx : 0;
  const dragProgressPct = Math.min(
    100,
    Math.round((effectiveDragDistance / TEAR_OFF_DRAG_THRESHOLD_PX) * 100)
  );

  const normalizedItems = useMemo(() => normalizeItems(items), [items]);
  const enabledItems = useMemo(
    () => normalizedItems.filter((entry) => !disabled && !entry.isDisabled),
    [disabled, normalizedItems]
  );

  const registerDockedItemNode = useCallback(
    (key: string, node: HTMLButtonElement | null) => {
      if (node) {
        dockedItemNodesRef.current.set(key, node);
      } else {
        dockedItemNodesRef.current.delete(key);
      }
    },
    []
  );

  const registerPaletteItemNode = useCallback(
    (key: string, node: HTMLButtonElement | null) => {
      if (node) {
        paletteItemNodesRef.current.set(key, node);
      } else {
        paletteItemNodesRef.current.delete(key);
      }
    },
    []
  );

  useEffect(() => {
    if (!focusRequest) return;
    if (focusRequest.target === 'trigger') {
      triggerRef.current?.focus();
    } else if (focusRequest.target === 'dock-back') {
      dockBackRef.current?.focus();
    } else if (focusRequest.target === 'docked-item') {
      dockedItemNodesRef.current.get(focusRequest.key)?.focus();
    } else {
      paletteItemNodesRef.current.get(focusRequest.key)?.focus();
    }
  }, [focusRequest]);

  useEffect(() => {
    if (disabled || !isDockedDropdownOpen) {
      cleanupDragRef.current?.();
    }
  }, [disabled, isDockedDropdownOpen]);

  useEffect(() => {
    return () => {
      cleanupDragRef.current?.();
    };
  }, []);

  useEffect(() => {
    if (!isDockedDropdownOpen || disabled) return undefined;

    const handleOutsideMouseDown = (event: MouseEvent) => {
      if (
        rootRef.current &&
        event.target instanceof Node &&
        !rootRef.current.contains(event.target)
      ) {
        setOpen(false);
        setAnnouncement(`${resolvedMenuLabel} menu closed`);
      }
    };

    const handleWindowKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        setAnnouncement(`${resolvedMenuLabel} menu closed`);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleOutsideMouseDown);
    window.addEventListener('keydown', handleWindowKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideMouseDown);
      window.removeEventListener('keydown', handleWindowKeyDown);
    };
  }, [disabled, isDockedDropdownOpen, resolvedMenuLabel, setOpen]);

  const getIsChecked = useCallback(
    (entry: NormalizedTearOffMenuItem): boolean => {
      if (!entry.isCheckable) return false;
      const record = checkedOverrides.get(entry.reactKey);
      if (record && record.base === entry.baseChecked) {
        return record.value;
      }
      return entry.baseChecked;
    },
    [checkedOverrides]
  );

  const closeDockedDropdown = useCallback(
    (restoreFocus: boolean) => {
      setOpen(false);
      setAnnouncement(`${resolvedMenuLabel} menu closed`);
      if (restoreFocus) {
        setFocusRequest({ target: 'trigger' });
      }
    },
    [resolvedMenuLabel, setOpen]
  );

  const detachMenu = useCallback(
    (via: 'click' | 'keyboard' | 'drag') => {
      cleanupDragRef.current?.();
      setIsDraggingGrip(false);
      setDragDistancePx(0);
      setDetached(true);
      setAnnouncement(
        via === 'drag'
          ? `${resolvedMenuLabel} torn off by drag into floating palette`
          : `${resolvedMenuLabel} detached into floating palette`
      );
      setFocusRequest({ target: 'dock-back' });
    },
    [resolvedMenuLabel, setDetached]
  );

  const latestDetachRef = useRef(detachMenu);
  useEffect(() => {
    latestDetachRef.current = detachMenu;
  }, [detachMenu]);

  const handleDockBack = useCallback(() => {
    setDetached(false);
    if (!isOpen) {
      setOpen(true);
    }
    setAnnouncement(`${resolvedMenuLabel} docked back to menu bar`);
    setFocusRequest({ target: 'trigger' });
  }, [isOpen, resolvedMenuLabel, setDetached, setOpen]);

  const handleClosePalette = useCallback(() => {
    setDetached(false);
    if (isOpen) {
      setOpen(false);
    }
    setAnnouncement(`${resolvedMenuLabel} floating palette closed`);
    setFocusRequest({ target: 'trigger' });
  }, [isOpen, resolvedMenuLabel, setDetached, setOpen]);

  const focusBoundaryDockedItem = useCallback(
    (position: 'first' | 'last') => {
      const target =
        position === 'first'
          ? enabledItems[0]
          : enabledItems[enabledItems.length - 1];
      if (target) {
        setFocusRequest({ target: 'docked-item', key: target.reactKey });
      }
    },
    [enabledItems]
  );

  const handleTriggerClick = useCallback(() => {
    if (isDetached) {
      setDetached(false);
      if (!isOpen) {
        setOpen(true);
      }
      setAnnouncement(`${resolvedMenuLabel} docked back to menu bar`);
      return;
    }
    const nextOpen = !isOpen;
    setOpen(nextOpen);
    setAnnouncement(
      nextOpen
        ? `${resolvedMenuLabel} menu opened`
        : `${resolvedMenuLabel} menu closed`
    );
  }, [isDetached, isOpen, resolvedMenuLabel, setDetached, setOpen]);

  const handleTriggerKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>) => {
      if (disabled || event.nativeEvent.isComposing) return;

      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        if (isDetached) {
          setDetached(false);
        }
        if (!isOpen) {
          setOpen(true);
        }
        focusBoundaryDockedItem(event.key === 'ArrowDown' ? 'first' : 'last');
      } else if (event.key === 'Escape' && isDockedDropdownOpen) {
        event.preventDefault();
        closeDockedDropdown(false);
      }
    },
    [
      closeDockedDropdown,
      disabled,
      focusBoundaryDockedItem,
      isDetached,
      isDockedDropdownOpen,
      isOpen,
      setDetached,
      setOpen,
    ]
  );

  const handleGripPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (disabled || event.button > 0) return;

      cleanupDragRef.current?.();
      const startX = event.clientX;
      const startY = event.clientY;
      setIsDraggingGrip(true);
      setDragDistancePx(0);

      const handlePointerMove = createCoalescedPointerMove((moveEvent: PointerEvent) => {
        const distance = Math.hypot(
          moveEvent.clientX - startX,
          moveEvent.clientY - startY
        );
        if (distance >= TEAR_OFF_DRAG_THRESHOLD_PX) {
          latestDetachRef.current('drag');
        } else {
          setDragDistancePx(distance);
        }
      });

      const cleanup = () => {
        handlePointerMove.cancel();
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerEnd);
        window.removeEventListener('pointercancel', handlePointerEnd);
        cleanupDragRef.current = null;
      };

      const handlePointerEnd = () => {
        cleanup();
        setIsDraggingGrip(false);
        setDragDistancePx(0);
      };

      cleanupDragRef.current = cleanup;
      window.addEventListener('pointermove', handlePointerMove, { passive: true });
      window.addEventListener('pointerup', handlePointerEnd);
      window.addEventListener('pointercancel', handlePointerEnd);
    },
    [disabled]
  );

  const handleGripKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>) => {
      if (disabled || event.nativeEvent.isComposing) return;

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        detachMenu('keyboard');
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        focusBoundaryDockedItem('first');
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        focusBoundaryDockedItem('last');
      } else if (event.key === 'Escape') {
        event.preventDefault();
        closeDockedDropdown(true);
      }
    },
    [closeDockedDropdown, detachMenu, disabled, focusBoundaryDockedItem]
  );

  const activateItem = useCallback(
    (entry: NormalizedTearOffMenuItem, surface: 'docked' | 'palette') => {
      let payload: TearOffMenuItem = entry.item;
      let statusMessage = `Selected ${entry.label}`;

      if (entry.isCheckable) {
        const nextChecked = !getIsChecked(entry);
        setCheckedOverrides((prev) => {
          const next = new Map(prev);
          next.set(entry.reactKey, {
            base: entry.baseChecked,
            value: nextChecked,
          });
          return next;
        });
        payload = { ...entry.item, checked: nextChecked };
        statusMessage = `${entry.label} ${nextChecked ? 'enabled' : 'disabled'}`;
      }

      onSelectItem?.(payload);
      setAnnouncement(statusMessage);

      if (surface === 'docked') {
        setOpen(false);
        setFocusRequest({ target: 'trigger' });
      }
    },
    [getIsChecked, onSelectItem, setOpen]
  );

  const focusAdjacentEnabledItem = useCallback(
    (
      target: 'docked-item' | 'palette-item',
      currentKey: string,
      key: 'ArrowDown' | 'ArrowUp' | 'Home' | 'End'
    ) => {
      const nextEntry = pickNextEnabledEntry(enabledItems, currentKey, key);
      if (nextEntry) {
        setFocusRequest({ target, key: nextEntry.reactKey });
      }
    },
    [enabledItems]
  );

  const handleDockedItemKeyDown = useCallback(
    (
      event: ReactKeyboardEvent<HTMLButtonElement>,
      entry: NormalizedTearOffMenuItem
    ) => {
      if (disabled || entry.isDisabled || event.nativeEvent.isComposing) return;

      switch (event.key) {
        case 'ArrowDown':
        case 'ArrowUp':
        case 'Home':
        case 'End': {
          event.preventDefault();
          focusAdjacentEnabledItem('docked-item', entry.reactKey, event.key);
          break;
        }
        case 'Enter':
        case ' ': {
          event.preventDefault();
          activateItem(entry, 'docked');
          break;
        }
        case 'Escape': {
          event.preventDefault();
          closeDockedDropdown(true);
          break;
        }
        case 'Tab': {
          closeDockedDropdown(false);
          break;
        }
        default:
          break;
      }
    },
    [activateItem, closeDockedDropdown, disabled, focusAdjacentEnabledItem]
  );

  const handlePaletteItemKeyDown = useCallback(
    (
      event: ReactKeyboardEvent<HTMLButtonElement>,
      entry: NormalizedTearOffMenuItem
    ) => {
      if (disabled || entry.isDisabled || event.nativeEvent.isComposing) return;

      switch (event.key) {
        case 'ArrowDown':
        case 'ArrowUp':
        case 'Home':
        case 'End': {
          event.preventDefault();
          focusAdjacentEnabledItem('palette-item', entry.reactKey, event.key);
          break;
        }
        case 'Enter':
        case ' ': {
          event.preventDefault();
          activateItem(entry, 'palette');
          break;
        }
        default:
          break;
      }
    },
    [activateItem, disabled, focusAdjacentEnabledItem]
  );

  const merged = mergeProps({
    themeTarget: themeProps('tear-off-menu', {
      open: isDockedDropdownOpen,
      detached: isDetached,
      disabled,
      dragging: effectiveDragging,
    }),
    baseClassName: 'relative w-full min-w-0 max-w-full flex flex-col gap-3',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });


  const perforationBorderToken = effectiveDragging
    ? 'var(--prism-primary-main)'
    : 'var(--prism-border, var(--prism-well-border))';

  return (
    <div ref={mergedRef} {...rest} {...merged}>
      {/* Parent Menu Bar Strip */}
      <div
        className={cx(
          barClass,
          'prism-slab w-full min-w-0 max-w-full px-3 py-2 flex flex-wrap items-center justify-between gap-2'
        )}
      >
        <div className="relative flex flex-wrap items-center gap-2 min-w-0">
          <button
            ref={triggerRef}
            type="button"
            aria-haspopup="menu"
            aria-expanded={isDockedDropdownOpen}
            aria-controls={isDockedDropdownOpen ? dropdownId : undefined}
            disabled={disabled}
            data-active={isDockedDropdownOpen ? 'true' : undefined}
            onClick={handleTriggerClick}
            onKeyDown={handleTriggerKeyDown}
            style={
              isDockedDropdownOpen
                ? undefined
                : STYLE_TEXT_PRIMARY
            }
            className={cx(
              triggerClass,
              'prism-focus-ring inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold tracking-[-0.01em] whitespace-nowrap cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 select-none transition-colors',
              isDockedDropdownOpen
                ? 'prism-btn-primary'
                : 'prism-crystal enabled:hover:brightness-105'
            )}
          >
            <Layers
              aria-hidden="true"
              className="w-3.5 h-3.5 shrink-0"
              style={{
                color: isDockedDropdownOpen
                  ? 'var(--prism-primary-contrast)'
                  : 'var(--prism-primary-main)',
              }}
            />
            <span className="relative z-10">{resolvedMenuLabel}</span>
            <ChevronDown
              aria-hidden="true"
              className={cx(
                'w-3.5 h-3.5 shrink-0 transition-transform duration-150',
                isDockedDropdownOpen && 'rotate-180'
              )}
            />
          </button>

          {/* Docked Dropdown Menu Panel */}
          {isDockedDropdownOpen ? (
            <div
              id={dropdownId}
              role="menu"
              aria-label={resolvedMenuLabel}
              className={cx(
                dropdownClass,
                'prism-slab absolute left-0 top-full mt-2 z-40 w-[min(19rem,calc(100vw-2rem))] p-2 flex flex-col gap-1'
              )}
            >
              {/* Perforated Optical Tear-Off Grip */}
              <button
                type="button"
                aria-label="Tear off menu into floating palette"
                disabled={disabled}
                data-dragging={effectiveDragging ? 'true' : undefined}
                onClick={() => detachMenu('click')}
                onKeyDown={handleGripKeyDown}
                onPointerDown={handleGripPointerDown}
                style={{
                  borderBottom: `1.5px dashed ${perforationBorderToken}`,
                  color: effectiveDragging
                    ? 'var(--prism-primary-main)'
                    : 'var(--prism-text-secondary)',
                  backgroundColor: effectiveDragging
                    ? 'color-mix(in srgb, var(--prism-primary-main) 12%, transparent)'
                    : 'color-mix(in srgb, var(--prism-secondary-main) 7%, transparent)',
                }}
                className={cx(
                  gripClass,
                  'prism-focus-ring w-full min-w-0 px-2.5 py-2 mb-1 rounded-t-xl flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-[0.08em] cursor-grab active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-50 touch-none select-none transition-colors'
                )}
              >
                <span
                  aria-hidden="true"
                  className="inline-flex items-center gap-1 shrink-0"
                >
                  {PERFORATION_DOT_KEYS.slice(0, 3).map((dotKey) => (
                    <span
                      key={dotKey}
                      className="w-1 h-1 rounded-full"
                      style={{ backgroundColor: perforationBorderToken }}
                    />
                  ))}
                </span>

                <span className="inline-flex items-center gap-1.5 min-w-0 truncate">
                  <GripHorizontal
                    aria-hidden="true"
                    className="w-3.5 h-3.5 shrink-0"
                  />
                  <span className="truncate">
                    {effectiveDragging
                      ? `Detaching ${dragProgressPct}%`
                      : 'Tear Off'}
                  </span>
                </span>

                <span
                  aria-hidden="true"
                  className="inline-flex items-center gap-1 shrink-0"
                >
                  {PERFORATION_DOT_KEYS.slice(3, 6).map((dotKey) => (
                    <span
                      key={dotKey}
                      className="w-1 h-1 rounded-full"
                      style={{ backgroundColor: perforationBorderToken }}
                    />
                  ))}
                </span>
              </button>

              {/* Docked Menu Actions */}
              {normalizedItems.length === 0 ? (
                <div
                  role="menuitem"
                  aria-disabled="true"
                  className="px-3 py-2 text-xs select-none"
                  style={STYLE_TEXT_SECONDARY}
                >
                  No actions available
                </div>
              ) : (
                normalizedItems.map((entry) => {
                  const isChecked = getIsChecked(entry);
                  const itemDisabled = disabled || entry.isDisabled;

                  return (
                    <button
                      key={entry.reactKey}
                      ref={(node) => registerDockedItemNode(entry.reactKey, node)}
                      type="button"
                      role={entry.isCheckable ? 'menuitemcheckbox' : 'menuitem'}
                      aria-checked={entry.isCheckable ? isChecked : undefined}
                      disabled={itemDisabled}
                      aria-disabled={itemDisabled ? 'true' : undefined}
                      tabIndex={-1}
                      onClick={() => activateItem(entry, 'docked')}
                      onKeyDown={(event) => handleDockedItemKeyDown(event, entry)}
                      style={{
                        color: itemDisabled
                          ? 'var(--prism-text-disabled)'
                          : 'var(--prism-text-primary)',
                      }}
                      className={cx(
                        itemClass,
                        'prism-focus-ring w-full min-w-0 px-2.5 py-1.5 rounded-xl flex items-center justify-between gap-3 text-left text-xs font-medium cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 transition-colors enabled:hover:bg-[color-mix(in_srgb,var(--prism-secondary-main)_14%,transparent)]'
                      )}
                    >
                      <span className="flex items-center gap-2 min-w-0 flex-1">
                        <span
                          aria-hidden="true"
                          className="w-3.5 h-3.5 shrink-0 inline-flex items-center justify-center"
                        >
                          {entry.isCheckable && isChecked ? (
                            <Check
                              className="w-3.5 h-3.5"
                              style={STYLE_PRIMARY_MAIN}
                            />
                          ) : null}
                        </span>
                        <span className="truncate">{entry.label}</span>
                      </span>

                      {entry.shortcut ? (
                        <span
                          aria-hidden="true"
                          className="shrink-0 font-mono text-[11px] tabular-nums tracking-tight"
                          style={STYLE_TEXT_SECONDARY}
                        >
                          {entry.shortcut}
                        </span>
                      ) : null}
                    </button>
                  );
                })
              )}
            </div>
          ) : null}
        </div>

        {/* Mode Status Pill (Docked vs Floating Palette) */}
        <span
          data-state={isDetached ? 'detached' : 'docked'}
          className={cx(
            statusPillClass,
            'prism-well rounded-full px-2.5 py-1 inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-tight whitespace-nowrap shrink-0 select-none'
          )}
          style={{
            color: isDetached
              ? 'var(--prism-text-primary)'
              : 'var(--prism-text-secondary)',
          }}
        >
          <span
            aria-hidden="true"
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{
              backgroundColor: isDetached
                ? 'var(--prism-success-main)'
                : 'var(--prism-secondary-main)',
            }}
          />
          <span>{isDetached ? 'Floating Palette' : 'Docked'}</span>
        </span>
      </div>

      {/* Torn-Off Persistent Floating Tool Palette */}
      {isDetached ? (
        <div
          role="region"
          aria-label={`${resolvedMenuLabel} floating palette`}
          data-state="detached"
          className={cx(
            paletteClass,
            'prism-slab w-[min(21rem,100%)] max-w-full min-w-0 p-2.5 flex flex-col gap-2'
          )}
        >
          {/* Slim Floating Palette Titlebar */}
          <div
            className={cx(
              paletteHeaderClass,
              'flex flex-wrap items-center justify-between gap-2 pb-2 min-w-0'
            )}
            style={{
              borderBottom: '1px solid var(--prism-divider)',
            }}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <Pin
                aria-hidden="true"
                className="w-3.5 h-3.5 shrink-0"
                style={STYLE_PRIMARY_MAIN}
              />
              <span
                id={paletteHeadingId}
                className="text-xs font-bold tracking-[-0.01em] truncate"
                style={STYLE_TEXT_PRIMARY}
              >
                {resolvedMenuLabel}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                ref={dockBackRef}
                type="button"
                aria-label="Dock palette back to menu bar"
                disabled={disabled}
                onClick={handleDockBack}
                style={STYLE_TEXT_PRIMARY}
                className="prism-crystal prism-focus-ring rounded-full px-2.5 py-1 inline-flex items-center gap-1 text-[11px] font-semibold whitespace-nowrap cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
              >
                <CornerUpLeft aria-hidden="true" className="w-3 h-3 shrink-0" />
                <span>Dock Back</span>
              </button>

              <button
                type="button"
                disabled={disabled}
                onClick={handleClosePalette}
                style={STYLE_TEXT_SECONDARY}
                className="prism-well prism-focus-ring rounded-full px-2 py-1 inline-flex items-center gap-1 text-[11px] font-semibold whitespace-nowrap cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 transition-colors enabled:hover:bg-[color-mix(in_srgb,var(--prism-error-main)_12%,transparent)]"
              >
                <X aria-hidden="true" className="w-3 h-3 shrink-0" />
                <span>Close</span>
              </button>
            </div>
          </div>

          {/* Persistent Tool Action List */}
          <div
            role="group"
            aria-labelledby={paletteHeadingId}
            className="flex flex-col gap-1 min-w-0"
          >
            {normalizedItems.length === 0 ? (
              <div
                className="px-3 py-2 text-xs select-none"
                style={STYLE_TEXT_SECONDARY}
              >
                No actions available
              </div>
            ) : (
              normalizedItems.map((entry) => {
                const isChecked = getIsChecked(entry);
                const itemDisabled = disabled || entry.isDisabled;

                return (
                  <button
                    key={entry.reactKey}
                    ref={(node) => registerPaletteItemNode(entry.reactKey, node)}
                    type="button"
                    aria-pressed={entry.isCheckable ? isChecked : undefined}
                    disabled={itemDisabled}
                    aria-disabled={itemDisabled ? 'true' : undefined}
                    onClick={() => activateItem(entry, 'palette')}
                    onKeyDown={(event) => handlePaletteItemKeyDown(event, entry)}
                    style={{
                      color: itemDisabled
                        ? 'var(--prism-text-disabled)'
                        : 'var(--prism-text-primary)',
                      backgroundColor:
                        entry.isCheckable && isChecked
                          ? 'color-mix(in srgb, var(--prism-primary-main) 12%, transparent)'
                          : undefined,
                    }}
                    className={cx(
                      itemClass,
                      'prism-focus-ring w-full min-w-0 px-2.5 py-1.5 rounded-xl flex items-center justify-between gap-3 text-left text-xs font-medium cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 transition-colors enabled:hover:bg-[color-mix(in_srgb,var(--prism-secondary-main)_14%,transparent)]'
                    )}
                  >
                    <span className="flex items-center gap-2 min-w-0 flex-1">
                      <span
                        aria-hidden="true"
                        className="w-3.5 h-3.5 shrink-0 inline-flex items-center justify-center"
                      >
                        {entry.isCheckable && isChecked ? (
                          <Check
                            className="w-3.5 h-3.5"
                            style={STYLE_PRIMARY_MAIN}
                          />
                        ) : null}
                      </span>
                      <span className="truncate">{entry.label}</span>
                    </span>

                    {entry.shortcut ? (
                      <span
                        aria-hidden="true"
                        className="shrink-0 font-mono text-[11px] tabular-nums tracking-tight"
                        style={STYLE_TEXT_SECONDARY}
                      >
                        {entry.shortcut}
                      </span>
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}

      {/* Polite Live Region for Screen Reader Status Announcements */}
      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </div>
  );
}

export const TearOffMenu = /*#__PURE__*/ memoWithDisplayName(TearOffMenuInner, 'TearOffMenu');
