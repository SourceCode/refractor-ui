'use client';

import {
  Fragment,
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardPaste,
  Copy,
  FileImage,
  Pencil,
  Scissors,
  Trash2,
} from 'lucide-react';
import type { BaseProps, OpticalStyleTokens } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { useMergedRefs } from '../hooks/useMergedRefs';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';

export type RichContextQuickActionId = 'cut' | 'copy' | 'paste' | 'rename' | 'delete';
export type RichContextTagTone = 'primary' | 'rose' | 'emerald' | 'info' | 'amber' | 'secondary';

export interface RichContextMenuAction {
  /** Stable unique identifier for this vertical menu command. */
  id: string;
  /** Human-readable command label displayed in the vertical menu list. */
  label: string;
  /** Optional right-aligned keyboard shortcut hint (e.g. '⌘I', '⌘D', '⌘⌫'). */
  shortcut?: string;
  /** Applies destructive optical danger styling (`--prism-error-main`). */
  destructive?: boolean;
  /** Disables activation and skips this row cleanly during keyboard navigation. */
  disabled?: boolean;
  /** Renders an optical hairline divider immediately above this row. */
  dividerBefore?: boolean;
}

type RichContextMenuBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface RichContextMenuProps extends RichContextMenuBaseProps {
  /** Active context item name displayed in the header and right-click preview surface (defaults to `'HeroPrism_v4.png'`). */
  targetLabel?: string;
  /** Vertical menu commands displayed below the quick-action icon strip and color tags. */
  actions?: ReadonlyArray<RichContextMenuAction>;
  /** Controlled array of active semantic color tags applied to the target item. */
  selectedTags?: ReadonlyArray<RichContextTagTone>;
  /** Initial uncontrolled array of active semantic color tags (defaults to `[]`). */
  defaultSelectedTags?: ReadonlyArray<RichContextTagTone>;
  /** Initial uncontrolled visibility of the inline rich context menu panel (defaults to `true`). */
  defaultOpen?: boolean;
  /** Disables the Paste quick-action button when clipboard data is unavailable (defaults to `false`). */
  disablePaste?: boolean;
  /** Callback invoked when one of the 5 top quick-action icon buttons is triggered. */
  onQuickAction?: (actionId: RichContextQuickActionId) => void;
  /** Callback invoked with the command `id` when an enabled vertical menu row is selected. */
  onSelectAction?: (actionId: string) => void;
  /** Callback invoked with the updated array of active tag tones whenever a color-tag dot is toggled. */
  onTagsChange?: (tags: ReadonlyArray<RichContextTagTone>) => void;
  /** Disables all triggers, quick actions, color tags, and vertical menu commands (defaults to `false`). */
  disabled?: boolean;
}

interface QuickActionConfig {
  id: RichContextQuickActionId;
  label: string;
  shortcut: string;
  destructive?: boolean;
}

interface ColorTagConfig {
  tone: RichContextTagTone;
  label: string;
  token: string;
}

interface StatusRecord {
  message: string;
  indicatorToken: string;
}

type RovingKey = 'ArrowDown' | 'ArrowUp' | 'ArrowLeft' | 'ArrowRight' | 'Home' | 'End';

const DEFAULT_TARGET_LABEL = 'HeroPrism_v4.png';
const DEFAULT_SELECTED_TAGS: ReadonlyArray<RichContextTagTone> = [];

const QUICK_ACTIONS: ReadonlyArray<QuickActionConfig> = [
  { id: 'cut', label: 'Cut', shortcut: '⌘X' },
  { id: 'copy', label: 'Copy', shortcut: '⌘C' },
  { id: 'paste', label: 'Paste', shortcut: '⌘V' },
  { id: 'rename', label: 'Rename', shortcut: '↩' },
  { id: 'delete', label: 'Delete', shortcut: '⌫', destructive: true },
];

const COLOR_TAGS: ReadonlyArray<ColorTagConfig> = [
  { tone: 'primary', label: 'Amber', token: 'var(--prism-primary-main)' },
  { tone: 'rose', label: 'Crimson', token: 'var(--prism-error-main)' },
  { tone: 'emerald', label: 'Emerald', token: 'var(--prism-success-main)' },
  { tone: 'info', label: 'Cobalt', token: 'var(--prism-info-main)' },
  { tone: 'amber', label: 'Gold', token: 'var(--prism-warning-main)' },
  { tone: 'secondary', label: 'Violet', token: 'var(--prism-secondary-main)' },
];

const DEFAULT_VERTICAL_ACTIONS: ReadonlyArray<RichContextMenuAction> = [
  { id: 'get-info', label: 'Get Info', shortcut: '⌘I' },
  { id: 'duplicate', label: 'Duplicate', shortcut: '⌘D' },
  { id: 'compress', label: 'Compress to Archive' },
  { id: 'share-link', label: 'Share Link…' },
  {
    id: 'move-to-trash',
    label: 'Move to Trash',
    shortcut: '⌘⌫',
    destructive: true,
    dividerBefore: true,
  },
];

function renderQuickActionIcon(id: RichContextQuickActionId) {
  switch (id) {
    case 'cut':
      return <Scissors aria-hidden="true" className="w-4 h-4 shrink-0" />;
    case 'copy':
      return <Copy aria-hidden="true" className="w-4 h-4 shrink-0" />;
    case 'paste':
      return <ClipboardPaste aria-hidden="true" className="w-4 h-4 shrink-0" />;
    case 'rename':
      return <Pencil aria-hidden="true" className="w-4 h-4 shrink-0" />;
    case 'delete':
      return <Trash2 aria-hidden="true" className="w-4 h-4 shrink-0" />;
  }
}

function resolveRovingItem<T>(
  items: ReadonlyArray<T>,
  currentIndex: number,
  key: RovingKey
): T | undefined {
  if (items.length === 0) return undefined;
  const baseIndex = currentIndex === -1 ? 0 : currentIndex;
  const step = key === 'ArrowDown' || key === 'ArrowRight' ? 1 : -1;
  const nextIndex =
    key === 'Home'
      ? 0
      : key === 'End'
        ? items.length - 1
        : (baseIndex + step + items.length) % items.length;
  return items[nextIndex];
}

export function RichContextMenu({
  targetLabel = DEFAULT_TARGET_LABEL,
  actions,
  selectedTags,
  defaultSelectedTags = DEFAULT_SELECTED_TAGS,
  defaultOpen = true,
  disablePaste = false,
  onQuickAction,
  onSelectAction,
  onTagsChange,
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: RichContextMenuProps) {
  const menuPanelId = useId();
  const override = useComponentOverride('RichContextMenu');

  const rootRef = useRef<HTMLDivElement>(null);
  const mergedRef = useMergedRefs<HTMLDivElement>(rootRef, ref);
  const toggleButtonRef = useRef<HTMLButtonElement>(null);
  const quickActionRefs = useRef<Map<RichContextQuickActionId, HTMLButtonElement>>(new Map());
  const actionButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const [isOpen, setIsOpen] = useState<boolean>(defaultOpen);
  const [activeTags, setActiveTags] = useControllableState<ReadonlyArray<RichContextTagTone>>({
    value: selectedTags,
    defaultValue: defaultSelectedTags,
    onChange: onTagsChange,
  });
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [statusRecord, setStatusRecord] = useState<StatusRecord | null>(null);

  const resolvedTargetLabel = targetLabel.trim().length > 0 ? targetLabel : DEFAULT_TARGET_LABEL;
  const resolvedActions = actions ?? DEFAULT_VERTICAL_ACTIONS;

  const activeTagSet = useMemo(() => new Set<RichContextTagTone>(activeTags), [activeTags]);
  const activeTagConfigs = useMemo(
    () => COLOR_TAGS.filter((tag) => activeTagSet.has(tag.tone)),
    [activeTagSet]
  );

  const enabledActions = useMemo(
    () => (disabled ? [] : resolvedActions.filter((action) => !action.disabled)),
    [disabled, resolvedActions]
  );

  const effectiveActiveActionId = useMemo(() => {
    const firstEnabled = enabledActions[0];
    if (!firstEnabled) return null;
    if (activeActionId && enabledActions.some((action) => action.id === activeActionId)) {
      return activeActionId;
    }
    return firstEnabled.id;
  }, [activeActionId, enabledActions]);

  const registerQuickActionButton = useCallback(
    (id: RichContextQuickActionId, node: HTMLButtonElement | null) => {
      if (node) {
        quickActionRefs.current.set(id, node);
      } else {
        quickActionRefs.current.delete(id);
      }
    },
    []
  );

  const registerActionButton = useCallback((id: string, node: HTMLButtonElement | null) => {
    if (node) {
      actionButtonRefs.current.set(id, node);
    } else {
      actionButtonRefs.current.delete(id);
    }
  }, []);

  const dismissMenu = useCallback(() => {
    setIsOpen(false);
    setStatusRecord({
      message: `Context menu hidden for ${resolvedTargetLabel}`,
      indicatorToken: 'var(--prism-text-secondary)',
    });
    toggleButtonRef.current?.focus();
  }, [resolvedTargetLabel]);

  const handleToggleMenu = useCallback(() => {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    setStatusRecord({
      message: nextOpen
        ? `Context menu opened for ${resolvedTargetLabel}`
        : `Context menu hidden for ${resolvedTargetLabel}`,
      indicatorToken: nextOpen ? 'var(--prism-primary-main)' : 'var(--prism-text-secondary)',
    });
  }, [isOpen, resolvedTargetLabel]);

  const handleContextSurfaceMenu = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (disabled) return;
      setIsOpen(true);
      setStatusRecord({
        message: `Context menu opened for ${resolvedTargetLabel}`,
        indicatorToken: 'var(--prism-primary-main)',
      });
    },
    [disabled, resolvedTargetLabel]
  );

  const triggerQuickAction = useCallback(
    (item: QuickActionConfig) => {
      if (disabled || (item.id === 'paste' && disablePaste)) {
        return;
      }
      setStatusRecord({
        message: `Quick action: ${item.label} (${item.shortcut}) — ${resolvedTargetLabel}`,
        indicatorToken: item.destructive
          ? 'var(--prism-error-main)'
          : 'var(--prism-primary-main)',
      });
      onQuickAction?.(item.id);
    },
    [disablePaste, disabled, onQuickAction, resolvedTargetLabel]
  );

  const handleQuickActionKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>, item: QuickActionConfig) => {
      if (event.nativeEvent.isComposing || disabled) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        dismissMenu();
        return;
      }

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        triggerQuickAction(item);
        return;
      }

      if (
        event.key === 'ArrowRight' ||
        event.key === 'ArrowLeft' ||
        event.key === 'Home' ||
        event.key === 'End'
      ) {
        event.preventDefault();
        const enabledQuick = QUICK_ACTIONS.filter((q) => !(q.id === 'paste' && disablePaste));
        const currentIdx = enabledQuick.findIndex((q) => q.id === item.id);
        const target = resolveRovingItem(enabledQuick, currentIdx, event.key);
        if (target) {
          quickActionRefs.current.get(target.id)?.focus();
        }
      }
    },
    [disablePaste, disabled, dismissMenu, triggerQuickAction]
  );

  const toggleColorTag = useCallback(
    (tag: ColorTagConfig) => {
      const isSelected = activeTagSet.has(tag.tone);
      const nextTags: ReadonlyArray<RichContextTagTone> = isSelected
        ? activeTags.filter((tone) => tone !== tag.tone)
        : [...activeTags, tag.tone];
      setActiveTags(nextTags);
      setStatusRecord({
        message: isSelected
          ? `Tag removed: ${tag.label} (${nextTags.length} active)`
          : `Tag added: ${tag.label} (${nextTags.length} active)`,
        indicatorToken: tag.token,
      });
    },
    [activeTagSet, activeTags, setActiveTags]
  );

  const handleTagKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>, tag: ColorTagConfig) => {
      if (event.nativeEvent.isComposing || disabled) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        dismissMenu();
        return;
      }

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggleColorTag(tag);
      }
    },
    [disabled, dismissMenu, toggleColorTag]
  );

  const handleSelectVerticalAction = useCallback(
    (action: RichContextMenuAction) => {
      setActiveActionId(action.id);
      setStatusRecord({
        message: action.shortcut
          ? `Action executed: ${action.label} (${action.shortcut})`
          : `Action executed: ${action.label}`,
        indicatorToken: action.destructive
          ? 'var(--prism-error-main)'
          : 'var(--prism-primary-main)',
      });
      onSelectAction?.(action.id);
    },
    [onSelectAction]
  );

  const handleMenuKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.nativeEvent.isComposing || disabled) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        dismissMenu();
        return;
      }

      const targetElement = event.target as Element;
      const targetRow = targetElement.closest<HTMLElement>('[data-action-id]');
      const sourceId = targetRow?.dataset.actionId ?? effectiveActiveActionId;
      const currentIndex = enabledActions.findIndex((item) => item.id === sourceId);

      if (
        event.key === 'ArrowDown' ||
        event.key === 'ArrowUp' ||
        event.key === 'Home' ||
        event.key === 'End'
      ) {
        event.preventDefault();
        const nextAction = resolveRovingItem(enabledActions, currentIndex, event.key);
        if (nextAction) {
          setActiveActionId(nextAction.id);
          actionButtonRefs.current.get(nextAction.id)?.focus();
        }
        return;
      }

      if (event.key === 'Enter' || event.key === ' ') {
        const chosen = enabledActions[currentIndex];
        if (!chosen) return;
        event.preventDefault();
        handleSelectVerticalAction(chosen);
      }
    },
    [disabled, dismissMenu, effectiveActiveActionId, enabledActions, handleSelectVerticalAction]
  );

  const merged = mergeProps({
    themeTarget: themeProps('rich-context-menu', {
      open: isOpen,
      disabled,
      tagCount: activeTagConfigs.length,
    }),
    baseClassName: 'prism-slab w-full max-w-full min-w-0 p-4 sm:p-5 flex flex-col gap-3.5 select-none',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('rich-context-menu', 'header');
  const surfaceClass = stableClassName('rich-context-menu', 'surface');
  const toggleClass = stableClassName('rich-context-menu', 'toggle');
  const panelClass = stableClassName('rich-context-menu', 'panel');
  const quickActionsClass = stableClassName('rich-context-menu', 'quick-actions');
  const quickActionClass = stableClassName('rich-context-menu', 'quick-action');
  const tagsClass = stableClassName('rich-context-menu', 'tags');
  const tagDotClass = stableClassName('rich-context-menu', 'tag-dot');
  const menuClass = stableClassName('rich-context-menu', 'menu');
  const menuItemClass = stableClassName('rich-context-menu', 'menu-item');
  const statusClass = stableClassName('rich-context-menu', 'status');

  const activeTagsSummary =
    activeTagConfigs.length > 0 ? activeTagConfigs.map((tag) => tag.label).join(', ') : 'None';

  return (
    <div
      ref={mergedRef}
      role="region"
      aria-label="Rich Context Menu"
      aria-disabled={disabled ? 'true' : undefined}
      {...rest}
      {...merged}
    >
      {/* Target Context Header */}
      <div
        data-part="header"
        className={cx(
          headerClass,
          'flex flex-wrap items-center justify-between gap-2.5 min-w-0 max-w-full'
        )}
      >
        <div className="flex flex-wrap items-center gap-2.5 min-w-0 flex-1">
          <span
            aria-hidden="true"
            className="prism-crystal w-8 h-8 rounded-xl inline-flex items-center justify-center shrink-0"
            style={{ color: 'var(--prism-primary-main)' }}
          >
            <FileImage className="w-4 h-4 shrink-0" />
          </span>

          <div className="flex flex-col min-w-0 flex-1">
            <span
              data-testid="rich-context-target-label"
              className="text-sm font-semibold tracking-tight truncate min-w-0 max-w-full"
              style={{ color: 'var(--prism-text-primary)' }}
            >
              {resolvedTargetLabel}
            </span>
            <div className="flex flex-wrap items-center gap-1.5 min-w-0">
              <span
                className="text-[11px] font-medium"
                style={{ color: 'var(--prism-text-secondary)' }}
              >
                Active item context
              </span>
              {activeTagConfigs.length > 0 ? (
                <span
                  aria-hidden="true"
                  data-testid="rich-context-header-tag-dots"
                  className="inline-flex items-center gap-1 shrink-0"
                >
                  {activeTagConfigs.map((tag) => (
                    <span
                      key={tag.tone}
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: tag.token }}
                    />
                  ))}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <button
          ref={toggleButtonRef}
          type="button"
          disabled={disabled}
          aria-expanded={isOpen}
          aria-controls={isOpen ? menuPanelId : undefined}
          data-testid="rich-context-toggle"
          onClick={handleToggleMenu}
          className={cx(
            toggleClass,
            'prism-btn-secondary prism-focus-ring inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50'
          )}
        >
          <span className="relative z-10">{isOpen ? 'Hide Menu' : 'Open Menu'}</span>
          {isOpen ? (
            <ChevronUp aria-hidden="true" className="relative z-10 w-3.5 h-3.5 shrink-0" />
          ) : (
            <ChevronDown aria-hidden="true" className="relative z-10 w-3.5 h-3.5 shrink-0" />
          )}
        </button>
      </div>

      {/* Right-Click Context Target Interactive Preview Surface */}
      <div
        data-part="surface"
        data-testid="rich-context-surface"
        onContextMenu={handleContextSurfaceMenu}
        className={cx(
          surfaceClass,
          'prism-well rounded-2xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 min-w-0 max-w-full transition-opacity',
          disabled ? 'opacity-55 cursor-not-allowed' : 'cursor-context-menu'
        )}
      >
        <span
          className="text-xs font-medium min-w-0 break-words flex-1"
          style={{ color: 'var(--prism-text-secondary)' }}
        >
          Right-click preview area for{' '}
          <strong style={{ color: 'var(--prism-text-primary)' }}>{resolvedTargetLabel}</strong>
        </span>
        <span
          data-testid="rich-context-surface-tag-summary"
          className="font-mono text-[11px] font-medium shrink-0"
          style={{ color: 'var(--prism-text-secondary)' }}
        >
          Tags: {activeTagsSummary}
        </span>
      </div>

      {/* Inline Optical Rich Context Menu Panel */}
      {isOpen ? (
        <div
          id={menuPanelId}
          data-part="panel"
          data-testid="rich-context-menu-panel"
          className={cx(
            panelClass,
            'prism-crystal rounded-2xl p-2.5 sm:p-3 w-full max-w-full sm:max-w-[23rem] min-w-0 flex flex-col gap-2.5 border'
          )}
          style={{ borderColor: 'var(--prism-divider)' }}
        >
          {/* 1. Top Quick-Action Icon Strip */}
          <div
            role="toolbar"
            aria-label="Quick actions"
            data-part="quick-actions"
            data-testid="rich-context-quick-actions"
            className={cx(
              quickActionsClass,
              'flex flex-wrap items-stretch gap-1.5 min-w-0 max-w-full'
            )}
          >
            {QUICK_ACTIONS.map((item) => {
              const isQuickDisabled = disabled || (item.id === 'paste' && disablePaste);
              const quickStyle: OpticalStyleTokens = item.destructive
                ? {
                    color: isQuickDisabled
                      ? 'var(--prism-text-disabled)'
                      : 'var(--prism-error-main)',
                    backgroundColor:
                      'color-mix(in srgb, var(--prism-error-main) 10%, transparent)',
                    borderColor:
                      'color-mix(in srgb, var(--prism-error-main) 34%, var(--prism-divider))',
                  }
                : {
                    color: isQuickDisabled
                      ? 'var(--prism-text-disabled)'
                      : 'var(--prism-text-primary)',
                    borderColor: 'var(--prism-divider)',
                  };

              return (
                <button
                  key={item.id}
                  ref={(node) => registerQuickActionButton(item.id, node)}
                  type="button"
                  disabled={isQuickDisabled}
                  aria-label={item.label}
                  data-quick-action={item.id}
                  data-destructive={item.destructive ? 'true' : undefined}
                  data-testid={`rich-context-quick-${item.id}`}
                  onClick={() => triggerQuickAction(item)}
                  onKeyDown={(event) => handleQuickActionKeyDown(event, item)}
                  className={cx(
                    quickActionClass,
                    'prism-focus-ring flex-1 min-w-[3.25rem] rounded-xl border px-1.5 py-2 flex flex-col items-center justify-center gap-1 text-[11px] font-semibold cursor-pointer disabled:cursor-not-allowed disabled:opacity-45 transition-colors',
                    item.destructive
                      ? 'enabled:hover:bg-[color-mix(in_srgb,var(--prism-error-main)_18%,transparent)]'
                      : 'prism-well enabled:hover:bg-[color-mix(in_srgb,var(--prism-secondary-main)_14%,transparent)]'
                  )}
                  style={quickStyle}
                >
                  {renderQuickActionIcon(item.id)}
                  <span aria-hidden="true" className="truncate max-w-full leading-none">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>

          <div
            aria-hidden="true"
            className="h-px w-full"
            style={{ backgroundColor: 'var(--prism-divider)' }}
          />

          {/* 2. Semantic Color-Tag Dot Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-1 min-w-0 max-w-full">
            <span
              className="text-[11px] font-semibold uppercase tracking-wider shrink-0"
              style={{ color: 'var(--prism-text-secondary)' }}
            >
              Color Tags
            </span>

            <div
              role="group"
              aria-label="Color tags"
              data-part="tags"
              data-testid="rich-context-tags"
              className={cx(tagsClass, 'flex flex-wrap items-center gap-2 min-w-0')}
            >
              {COLOR_TAGS.map((tag) => {
                const isSelected = activeTagSet.has(tag.tone);
                const dotStyle: OpticalStyleTokens = {
                  backgroundColor: tag.token,
                  borderColor: isSelected ? 'var(--prism-primary-contrast)' : 'transparent',
                  boxShadow: isSelected
                    ? `0 0 0 2px ${tag.token}, 0 0 10px color-mix(in srgb, ${tag.token} 48%, transparent)`
                    : 'inset 0 1px 1px color-mix(in srgb, var(--prism-primary-contrast) 45%, transparent)',
                  color: 'var(--prism-primary-contrast)',
                };

                return (
                  <button
                    key={tag.tone}
                    type="button"
                    disabled={disabled}
                    aria-label={tag.label}
                    aria-pressed={isSelected}
                    data-tag-tone={tag.tone}
                    data-selected={isSelected ? 'true' : 'false'}
                    data-testid={`rich-context-tag-${tag.tone}`}
                    onClick={() => toggleColorTag(tag)}
                    onKeyDown={(event) => handleTagKeyDown(event, tag)}
                    className={cx(
                      tagDotClass,
                      'prism-focus-ring w-6 h-6 rounded-full inline-flex items-center justify-center shrink-0 border-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-45 transition-shadow'
                    )}
                    style={dotStyle}
                  >
                    {isSelected ? (
                      <Check aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div
            aria-hidden="true"
            className="h-px w-full"
            style={{ backgroundColor: 'var(--prism-divider)' }}
          />

          {/* 3. Standard Vertical Menu Actions */}
          <div
            role="menu"
            aria-label={`${resolvedTargetLabel} actions`}
            data-part="menu"
            data-testid="rich-context-menu-list"
            onKeyDown={handleMenuKeyDown}
            className={cx(menuClass, 'flex flex-col gap-0.5 min-w-0 max-w-full')}
          >
            {resolvedActions.length === 0 ? (
              <div
                role="menuitem"
                aria-disabled="true"
                data-testid="rich-context-menu-empty"
                className="px-3 py-2 text-xs font-medium select-none"
                style={{ color: 'var(--prism-text-secondary)' }}
              >
                No actions available
              </div>
            ) : (
              resolvedActions.map((action) => {
                const isRowDisabled = disabled || Boolean(action.disabled);
                const isRovingFocus = !isRowDisabled && action.id === effectiveActiveActionId;

                return (
                  <Fragment key={action.id}>
                    {action.dividerBefore ? (
                      <div
                        role="separator"
                        data-testid={`rich-context-divider-${action.id}`}
                        className="my-1 mx-2 h-px"
                        style={{ backgroundColor: 'var(--prism-divider)' }}
                      />
                    ) : null}
                    <button
                      ref={(node) => registerActionButton(action.id, node)}
                      type="button"
                      role="menuitem"
                      disabled={isRowDisabled}
                      aria-disabled={isRowDisabled ? 'true' : undefined}
                      tabIndex={isRovingFocus ? 0 : -1}
                      data-action-id={action.id}
                      data-destructive={action.destructive ? 'true' : undefined}
                      data-testid={`rich-context-action-${action.id}`}
                      onFocus={() => setActiveActionId(action.id)}
                      onClick={() => handleSelectVerticalAction(action)}
                      className={cx(
                        menuItemClass,
                        'prism-focus-ring w-full px-3 py-2 rounded-xl flex items-center justify-between gap-3 text-xs font-medium text-left min-w-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-45 transition-colors',
                        action.destructive
                          ? 'enabled:hover:bg-[color-mix(in_srgb,var(--prism-error-main)_14%,transparent)]'
                          : 'enabled:hover:bg-[color-mix(in_srgb,var(--prism-secondary-main)_14%,transparent)]'
                      )}
                      style={{
                        color: isRowDisabled
                          ? 'var(--prism-text-disabled)'
                          : action.destructive
                            ? 'var(--prism-error-main)'
                            : 'var(--prism-text-primary)',
                      }}
                    >
                      <span className="truncate min-w-0">{action.label}</span>
                      {action.shortcut ? (
                        <span className="font-mono text-[11px] shrink-0 opacity-75">
                          {action.shortcut}
                        </span>
                      ) : null}
                    </button>
                  </Fragment>
                );
              })
            )}
          </div>
        </div>
      ) : null}

      {/* Polite Status Announcement Strip */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-part="status"
        data-testid="rich-context-status"
        className={cx(
          statusClass,
          'prism-well rounded-xl px-3 py-2 flex flex-wrap items-center gap-2 text-xs font-medium min-w-0 max-w-full'
        )}
        style={{ color: 'var(--prism-text-secondary)' }}
      >
        <span
          aria-hidden="true"
          data-testid="rich-context-status-dot"
          className="w-2 h-2 rounded-full shrink-0"
          style={{
            backgroundColor: statusRecord ? statusRecord.indicatorToken : 'var(--prism-divider)',
          }}
        />
        <span className="min-w-0 break-words flex-1">
          {statusRecord ? statusRecord.message : `Ready · ${resolvedTargetLabel}`}
        </span>
      </div>
    </div>
  );
}

RichContextMenu.displayName = 'RichContextMenu';
