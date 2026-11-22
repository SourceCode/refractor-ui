'use client';

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import {
  AppWindow,
  ExternalLink,
  FileText,
  Maximize2,
  Merge,
  Minus,
  Plus,
  X,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';

export interface MergedWindowTabItem {
  /** Stable unique identifier for the window tab. */
  id: string;
  /** Document or workspace title rendered inside the tab pill and preview header. */
  title: string;
  /** Optional path, branch, or file-type subtitle rendered in the compact active tab preview. */
  subtitle?: string;
  /** Shows an optical unsaved-changes indicator dot tinted with `--prism-primary-main`. */
  dirty?: boolean;
  /** Controls whether the tab renders a `Close <title>` button (defaults to `true`). */
  closable?: boolean;
}

export type MergedWindowAction = 'close' | 'minimize' | 'maximize';

type MergedWindowTabBarBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface MergedWindowTabBarProps extends MergedWindowTabBarBaseProps {
  /** Controlled ordered list of merged window tabs. */
  tabs?: ReadonlyArray<MergedWindowTabItem>;
  /** Initial ordered tabs when operating in uncontrolled mode. */
  defaultTabs?: ReadonlyArray<MergedWindowTabItem>;
  /** Controlled active window tab identifier. */
  activeTabId?: string;
  /** Initial active tab identifier when operating in uncontrolled mode. */
  defaultActiveTabId?: string;
  /** Callback fired whenever a tab becomes active via click, keyboard navigation, creation, closure fallback, or merge-back. */
  onSelectTab?: (tabId: string) => void;
  /** Callback fired whenever tabs are added, closed, reordered, torn off, or merged back. */
  onTabsChange?: (nextTabs: ReadonlyArray<MergedWindowTabItem>) => void;
  /** Callback fired when a tab is torn off into a standalone detached window. */
  onTearOffTab?: (tab: MergedWindowTabItem) => void;
  /** Optional custom handler for the trailing `+ New Tab` button; when omitted, creates a collision-safe tab automatically. */
  onAddTab?: () => void;
  /** Callback fired when leading window chrome controls (`close`, `minimize`, `maximize`) are activated. */
  onWindowAction?: (action: 'close' | 'minimize' | 'maximize') => void;
  /** Disables tab selection, drag/keyboard reordering, tear-off, closure, creation, and chrome actions. */
  disabled?: boolean;
}

const DND_MIME_TYPE = 'application/x-refractor-merged-window-tab';

const DEFAULT_MERGED_TABS: ReadonlyArray<MergedWindowTabItem> = [
  {
    id: 'design-system-fig',
    title: 'DesignSystem.fig',
    subtitle: 'packages/tokens · Canvas · Unsaved optical edits',
    dirty: true,
    closable: true,
  },
  {
    id: 'token-engine-ts',
    title: 'TokenEngine.ts',
    subtitle: 'packages/core/src/theme · TypeScript',
    dirty: false,
    closable: true,
  },
  {
    id: 'release-notes-md',
    title: 'ReleaseNotes.md',
    subtitle: 'docs/releases · Markdown',
    dirty: false,
    closable: true,
  },
];

function dedupeTabs(
  list: ReadonlyArray<MergedWindowTabItem> | undefined
): MergedWindowTabItem[] {
  if (!list || list.length === 0) {
    return [];
  }
  const seen = new Set<string>();
  const out: MergedWindowTabItem[] = [];
  for (const item of list) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      out.push(item);
    }
  }
  return out;
}

function getDisplayTitle(tab: MergedWindowTabItem): string {
  return tab.title.trim() || 'Untitled tab';
}

function getDisplaySubtitle(tab: MergedWindowTabItem): string | undefined {
  return tab.subtitle?.trim() || undefined;
}

function createCollisionSafeTab(
  existingTabs: ReadonlyArray<MergedWindowTabItem>,
  detachedTabs: ReadonlyArray<MergedWindowTabItem>
): MergedWindowTabItem {
  const usedIds = new Set<string>();
  const usedTitles = new Set<string>();

  for (const item of existingTabs) {
    usedIds.add(item.id);
    usedTitles.add(getDisplayTitle(item));
  }
  for (const item of detachedTabs) {
    usedIds.add(item.id);
    usedTitles.add(getDisplayTitle(item));
  }

  let index = 1;
  while (
    usedIds.has(`untitled-tab-${index}`) ||
    usedTitles.has(`Untitled-${index}.tsx`)
  ) {
    index += 1;
  }

  return {
    id: `untitled-tab-${index}`,
    title: `Untitled-${index}.tsx`,
    subtitle: `Scratch workspace · Buffer ${index}`,
    dirty: false,
    closable: true,
  };
}

export function MergedWindowTabBar({
  tabs,
  defaultTabs,
  activeTabId,
  defaultActiveTabId,
  onSelectTab,
  onTabsChange,
  onTearOffTab,
  onAddTab,
  onWindowAction,
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: MergedWindowTabBarProps) {
  const baseId = useId();
  const override = useComponentOverride('MergedWindowTabBar');

  const isTabsControlled = tabs !== undefined;
  const isActiveControlled = activeTabId !== undefined;

  const [internalTabs, setInternalTabs] = useState<MergedWindowTabItem[]>(() =>
    defaultTabs !== undefined
      ? dedupeTabs(defaultTabs)
      : dedupeTabs(DEFAULT_MERGED_TABS)
  );

  const currentTabs = useMemo(
    () => (isTabsControlled ? dedupeTabs(tabs) : internalTabs),
    [isTabsControlled, tabs, internalTabs]
  );

  const [internalActiveTabId, setInternalActiveTabId] = useState<string>(
    () => defaultActiveTabId ?? currentTabs[0]?.id ?? ''
  );
  const [detachedTabs, setDetachedTabs] = useState<MergedWindowTabItem[]>([]);
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');

  const tabButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const pendingFocusTabIdRef = useRef<string | null>(null);

  const effectiveActiveId = isActiveControlled
    ? activeTabId
    : internalActiveTabId;
  const activeTab = useMemo(
    () =>
      currentTabs.find((item) => item.id === effectiveActiveId) ??
      currentTabs[0],
    [currentTabs, effectiveActiveId]
  );
  const resolvedActiveTabId = activeTab?.id ?? '';
  const activeTabIndex = activeTab
    ? currentTabs.findIndex((item) => item.id === activeTab.id)
    : -1;

  const visibleDetachedTabs = useMemo(() => {
    const activeIds = new Set(currentTabs.map((item) => item.id));
    return detachedTabs.filter((item) => !activeIds.has(item.id));
  }, [currentTabs, detachedTabs]);

  useEffect(() => {
    const pendingId = pendingFocusTabIdRef.current;
    if (pendingId) {
      pendingFocusTabIdRef.current = null;
      tabButtonRefs.current.get(pendingId)?.focus();
    }
  }, [currentTabs, resolvedActiveTabId]);

  const commitTabs = useCallback(
    (nextTabs: MergedWindowTabItem[]) => {
      if (!isTabsControlled) {
        setInternalTabs(nextTabs);
      }
      onTabsChange?.(nextTabs);
    },
    [isTabsControlled, onTabsChange]
  );

  const selectTab = useCallback(
    (tabId: string) => {
      if (!isActiveControlled) {
        setInternalActiveTabId(tabId);
      }
      onSelectTab?.(tabId);
    },
    [isActiveControlled, onSelectTab]
  );

  const handleSelectTab = useCallback(
    (tab: MergedWindowTabItem) => {
      selectTab(tab.id);
      setAnnouncement(`Switched to tab ${getDisplayTitle(tab)}`);
    },
    [selectTab]
  );

  const moveTab = useCallback(
    (fromIndex: number, toIndex: number) => {
      const movedTab = Number.isInteger(fromIndex)
        ? currentTabs[fromIndex]
        : undefined;
      if (
        disabled ||
        !movedTab ||
        !Number.isInteger(toIndex) ||
        toIndex < 0 ||
        toIndex >= currentTabs.length ||
        fromIndex === toIndex
      ) {
        return;
      }

      const nextTabs = [...currentTabs];
      nextTabs.splice(fromIndex, 1);
      nextTabs.splice(toIndex, 0, movedTab);

      commitTabs(nextTabs);
      setAnnouncement(
        `Moved ${getDisplayTitle(movedTab)} to tab position ${toIndex + 1} of ${nextTabs.length}`
      );
    },
    [commitTabs, currentTabs, disabled]
  );

  const handleCloseTab = useCallback(
    (tab: MergedWindowTabItem, index: number) => {
      const nextTabs = currentTabs.filter((item) => item.id !== tab.id);
      commitTabs(nextTabs);

      if (tab.id === resolvedActiveTabId) {
        const fallbackTab = nextTabs[Math.min(index, nextTabs.length - 1)];
        if (fallbackTab) {
          selectTab(fallbackTab.id);
        } else if (!isActiveControlled) {
          setInternalActiveTabId('');
        }
      }

      setAnnouncement(`Closed tab ${getDisplayTitle(tab)}`);
    },
    [
      commitTabs,
      currentTabs,
      isActiveControlled,
      resolvedActiveTabId,
      selectTab,
    ]
  );

  const handleTearOffTab = useCallback(
    (tab: MergedWindowTabItem, index: number) => {
      const nextTabs = currentTabs.filter((item) => item.id !== tab.id);
      commitTabs(nextTabs);
      setDetachedTabs((prev) => [
        ...prev.filter((item) => item.id !== tab.id),
        tab,
      ]);

      if (tab.id === resolvedActiveTabId) {
        const fallbackTab = nextTabs[Math.min(index, nextTabs.length - 1)];
        if (fallbackTab) {
          selectTab(fallbackTab.id);
        } else if (!isActiveControlled) {
          setInternalActiveTabId('');
        }
      }

      onTearOffTab?.(tab);
      setAnnouncement(`Detached ${getDisplayTitle(tab)} into standalone window`);
    },
    [
      commitTabs,
      currentTabs,
      isActiveControlled,
      onTearOffTab,
      resolvedActiveTabId,
      selectTab,
    ]
  );

  const handleMergeBackTab = useCallback(
    (detached: MergedWindowTabItem) => {
      setDetachedTabs((prev) => prev.filter((item) => item.id !== detached.id));
      const nextTabs = [...currentTabs, detached];
      commitTabs(nextTabs);
      selectTab(detached.id);
      setAnnouncement(
        `Merged ${getDisplayTitle(detached)} back into window tab bar`
      );
    },
    [commitTabs, currentTabs, selectTab]
  );

  const handleAddTab = useCallback(() => {
    if (onAddTab) {
      onAddTab();
      setAnnouncement('Requested new window tab');
      return;
    }
    const created = createCollisionSafeTab(currentTabs, detachedTabs);
    const nextTabs = [...currentTabs, created];
    commitTabs(nextTabs);
    selectTab(created.id);
    setAnnouncement(`Opened tab ${created.title}`);
  }, [commitTabs, currentTabs, detachedTabs, onAddTab, selectTab]);

  const handleWindowAction = useCallback(
    (action: MergedWindowAction) => {
      onWindowAction?.(action);
      setAnnouncement(`Window ${action} requested`);
    },
    [onWindowAction]
  );

  const handleChromeKeyDown = useCallback(
    (
      event: ReactKeyboardEvent<HTMLButtonElement>,
      action: MergedWindowAction
    ) => {
      if (event.nativeEvent.isComposing || disabled) {
        return;
      }
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleWindowAction(action);
      }
    },
    [disabled, handleWindowAction]
  );

  const handleTabKeyDown = useCallback(
    (
      event: ReactKeyboardEvent<HTMLButtonElement>,
      index: number,
      tab: MergedWindowTabItem
    ) => {
      if (event.nativeEvent.isComposing || disabled) {
        return;
      }

      if (
        event.altKey &&
        (event.key === 'ArrowLeft' || event.key === 'ArrowRight')
      ) {
        event.preventDefault();
        const delta = event.key === 'ArrowLeft' ? -1 : 1;
        pendingFocusTabIdRef.current = tab.id;
        moveTab(index, index + delta);
        return;
      }

      if (event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }

      let nextIndex: number | null = null;
      if (event.key === 'ArrowRight') {
        nextIndex = (index + 1) % currentTabs.length;
      } else if (event.key === 'ArrowLeft') {
        nextIndex = (index - 1 + currentTabs.length) % currentTabs.length;
      } else if (event.key === 'Home') {
        nextIndex = 0;
      } else if (event.key === 'End') {
        nextIndex = currentTabs.length - 1;
      }

      const targetTab =
        nextIndex !== null ? currentTabs[nextIndex] : undefined;
      if (targetTab) {
        event.preventDefault();
        pendingFocusTabIdRef.current = targetTab.id;
        selectTab(targetTab.id);
        setAnnouncement(`Switched to tab ${getDisplayTitle(targetTab)}`);
        tabButtonRefs.current.get(targetTab.id)?.focus();
      }
    },
    [currentTabs, disabled, moveTab, selectTab]
  );

  const handleDragStart = useCallback(
    (
      event: ReactDragEvent<HTMLDivElement>,
      index: number,
      tab: MergedWindowTabItem
    ) => {
      if (
        disabled ||
        (event.target instanceof Element &&
          event.target.closest('[data-tab-action]') !== null)
      ) {
        event.preventDefault();
        return;
      }
      setDraggedTabId(tab.id);
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData(DND_MIME_TYPE, tab.id);
        event.dataTransfer.setData('text/plain', String(index));
      }
    },
    [disabled]
  );

  const handleDragOver = useCallback(
    (event: ReactDragEvent<HTMLDivElement>, tab: MergedWindowTabItem) => {
      if (disabled) {
        return;
      }
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
      }
      setDropTargetId(tab.id);
    },
    [disabled]
  );

  const handleDragLeave = useCallback(
    (event: ReactDragEvent<HTMLDivElement>, tab: MergedWindowTabItem) => {
      const related = event.relatedTarget;
      if (
        !(related instanceof Node) ||
        !event.currentTarget.contains(related)
      ) {
        setDropTargetId((prev) => (prev === tab.id ? null : prev));
      }
    },
    []
  );

  const handleDrop = useCallback(
    (event: ReactDragEvent<HTMLDivElement>, targetIndex: number) => {
      if (disabled) {
        return;
      }
      event.preventDefault();

      let fromIndex = draggedTabId
        ? currentTabs.findIndex((item) => item.id === draggedTabId)
        : -1;

      if (event.dataTransfer) {
        const transferId = event.dataTransfer.getData(DND_MIME_TYPE);
        const transferText = event.dataTransfer.getData('text/plain');
        if (transferId) {
          fromIndex = currentTabs.findIndex((item) => item.id === transferId);
        } else if (transferText) {
          const trimmed = transferText.trim();
          const byId = currentTabs.findIndex((item) => item.id === trimmed);
          if (byId !== -1) {
            fromIndex = byId;
          } else if (/^\d+$/.test(trimmed)) {
            fromIndex = Number.parseInt(trimmed, 10);
          }
        }
      }

      setDraggedTabId(null);
      setDropTargetId(null);
      moveTab(fromIndex, targetIndex);
    },
    [currentTabs, disabled, draggedTabId, moveTab]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedTabId(null);
    setDropTargetId(null);
  }, []);

  const merged = mergeProps({
    themeTarget: themeProps('merged-window-tab-bar', {
      disabled,
      empty: currentTabs.length === 0,
      tabCount: currentTabs.length,
      detachedCount: visibleDetachedTabs.length,
    }),
    baseClassName:
      'prism-slab relative flex flex-col overflow-hidden w-full max-w-full min-w-0 transition-opacity',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const titlebarClass = stableClassName('merged-window-tab-bar', 'titlebar');
  const controlsClass = stableClassName(
    'merged-window-tab-bar',
    'chrome-controls'
  );
  const tablistClass = stableClassName('merged-window-tab-bar', 'tablist');
  const tabClass = stableClassName('merged-window-tab-bar', 'tab');
  const addButtonClass = stableClassName('merged-window-tab-bar', 'add-button');
  const shelfClass = stableClassName('merged-window-tab-bar', 'detached-shelf');
  const previewClass = stableClassName('merged-window-tab-bar', 'preview');
  const emptyClass = stableClassName('merged-window-tab-bar', 'empty');
  const statusBarClass = stableClassName('merged-window-tab-bar', 'status-bar');

  const panelId = `${baseId}-panel`;
  const activeTabButtonId = activeTab
    ? `${baseId}-tab-${activeTab.id}`
    : undefined;
  const activeDisplayTitle = activeTab ? getDisplayTitle(activeTab) : '';
  const activeDisplaySubtitle = activeTab
    ? getDisplaySubtitle(activeTab)
    : undefined;

  const idleStatusText = activeTab
    ? `Active: ${activeDisplayTitle} (${activeTabIndex + 1} of ${currentTabs.length})`
    : 'No open window tabs';

  return (
    <div
      ref={ref}
      role="region"
      aria-label="Merged window tab bar"
      {...rest}
      {...merged}
    >
      <header
        data-part="titlebar"
        className={cx(
          titlebarClass,
          'prism-crystal relative flex flex-wrap items-center gap-2 px-3 py-2 border-b min-w-0 max-w-full'
        )}
        style={{
          borderColor: 'var(--prism-divider)',
        }}
      >
        <span
          aria-hidden="true"
          data-part="sheen"
          className="pointer-events-none absolute inset-x-4 top-0 h-px"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, color-mix(in srgb, var(--prism-primary-contrast) 65%, transparent) 30%, color-mix(in srgb, var(--prism-secondary-light) 50%, transparent) 70%, transparent 100%)',
          }}
        />

        <div
          role="group"
          aria-label="Window controls"
          data-part="chrome-controls"
          className={cx(
            controlsClass,
            'group/chrome inline-flex items-center gap-2 shrink-0 pr-1'
          )}
        >
          <button
            type="button"
            disabled={disabled}
            aria-label="Close window"
            data-control="close"
            onClick={() => handleWindowAction('close')}
            onKeyDown={(event) => handleChromeKeyDown(event, 'close')}
            className="prism-focus-ring w-3.5 h-3.5 rounded-full inline-flex items-center justify-center shrink-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-45 transition-transform enabled:hover:scale-110 enabled:active:scale-95"
            style={{
              backgroundColor: 'var(--prism-error-main)',
              color: 'var(--prism-error-contrast)',
              boxShadow:
                'inset 0 1px 1px color-mix(in srgb, var(--prism-primary-contrast) 45%, transparent), 0 0 0 1px var(--prism-divider)',
            }}
          >
            <X
              aria-hidden="true"
              className="w-2 h-2 opacity-0 group-hover/chrome:opacity-100 group-focus-within/chrome:opacity-100 transition-opacity"
            />
          </button>

          <button
            type="button"
            disabled={disabled}
            aria-label="Minimize window"
            data-control="minimize"
            onClick={() => handleWindowAction('minimize')}
            onKeyDown={(event) => handleChromeKeyDown(event, 'minimize')}
            className="prism-focus-ring w-3.5 h-3.5 rounded-full inline-flex items-center justify-center shrink-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-45 transition-transform enabled:hover:scale-110 enabled:active:scale-95"
            style={{
              backgroundColor: 'var(--prism-warning-main)',
              color: 'var(--prism-warning-contrast)',
              boxShadow:
                'inset 0 1px 1px color-mix(in srgb, var(--prism-primary-contrast) 45%, transparent), 0 0 0 1px var(--prism-divider)',
            }}
          >
            <Minus
              aria-hidden="true"
              className="w-2 h-2 opacity-0 group-hover/chrome:opacity-100 group-focus-within/chrome:opacity-100 transition-opacity"
            />
          </button>

          <button
            type="button"
            disabled={disabled}
            aria-label="Maximize window"
            data-control="maximize"
            onClick={() => handleWindowAction('maximize')}
            onKeyDown={(event) => handleChromeKeyDown(event, 'maximize')}
            className="prism-focus-ring w-3.5 h-3.5 rounded-full inline-flex items-center justify-center shrink-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-45 transition-transform enabled:hover:scale-110 enabled:active:scale-95"
            style={{
              backgroundColor: 'var(--prism-success-main)',
              color: 'var(--prism-success-contrast)',
              boxShadow:
                'inset 0 1px 1px color-mix(in srgb, var(--prism-primary-contrast) 45%, transparent), 0 0 0 1px var(--prism-divider)',
            }}
          >
            <Maximize2
              aria-hidden="true"
              className="w-2 h-2 opacity-0 group-hover/chrome:opacity-100 group-focus-within/chrome:opacity-100 transition-opacity"
            />
          </button>
        </div>

        <div
          data-part="tablist-scroll"
          className="flex-1 min-w-0 overflow-x-auto max-w-full"
        >
          <div
            role="tablist"
            aria-label="Merged window tabs"
            aria-orientation="horizontal"
            className={cx(
              tablistClass,
              'inline-flex items-center gap-1.5 min-w-max py-0.5'
            )}
          >
            {currentTabs.map((tab, index) => {
              const displayTitle = getDisplayTitle(tab);
              const isActive = tab.id === resolvedActiveTabId;
              const isClosable = tab.closable !== false;
              const isDragging = draggedTabId === tab.id;
              const isDropTarget =
                dropTargetId === tab.id && draggedTabId !== tab.id;

              return (
                <div
                  key={tab.id}
                  role="presentation"
                  data-part="tab-item"
                  data-tab-id={tab.id}
                  data-active={isActive ? 'true' : undefined}
                  data-dirty={tab.dirty ? 'true' : undefined}
                  data-dragging={isDragging ? 'true' : undefined}
                  data-drop-target={isDropTarget ? 'true' : undefined}
                  draggable={!disabled}
                  onDragStart={(event) => handleDragStart(event, index, tab)}
                  onDragOver={(event) => handleDragOver(event, tab)}
                  onDragLeave={(event) => handleDragLeave(event, tab)}
                  onDrop={(event) => handleDrop(event, index)}
                  onDragEnd={handleDragEnd}
                  className={cx(
                    tabClass,
                    'inline-flex items-center gap-1 rounded-xl border px-1.5 py-1 transition-all shrink-0 max-w-[240px]',
                    isActive ? 'prism-well font-semibold' : '',
                    isDragging ? 'opacity-60 scale-[0.98]' : '',
                    disabled ? 'opacity-60' : ''
                  )}
                  style={{
                    borderColor: isDropTarget
                      ? 'var(--prism-focus-ring)'
                      : isActive
                        ? 'color-mix(in srgb, var(--prism-primary-main) 34%, var(--prism-divider))'
                        : 'var(--prism-divider)',
                    backgroundColor: isActive
                      ? undefined
                      : 'color-mix(in srgb, var(--prism-crystal-top) 54%, transparent)',
                    outline: isDropTarget
                      ? '2px solid var(--prism-focus-ring)'
                      : undefined,
                    outlineOffset: isDropTarget ? '1px' : undefined,
                  }}
                >
                  <button
                    ref={(node) => {
                      if (node) {
                        tabButtonRefs.current.set(tab.id, node);
                      } else {
                        tabButtonRefs.current.delete(tab.id);
                      }
                    }}
                    id={`${baseId}-tab-${tab.id}`}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-controls={panelId}
                    tabIndex={disabled ? -1 : isActive ? 0 : -1}
                    disabled={disabled}
                    draggable={!disabled}
                    onClick={() => handleSelectTab(tab)}
                    onKeyDown={(event) => handleTabKeyDown(event, index, tab)}
                    className="prism-focus-ring inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg text-xs whitespace-nowrap min-w-0 max-w-[160px] cursor-pointer disabled:cursor-not-allowed transition-colors"
                    style={{
                      color: isActive
                        ? 'var(--prism-text-primary)'
                        : 'var(--prism-text-secondary)',
                    }}
                  >
                    {tab.dirty ? (
                      <>
                        <span
                          data-part="dirty-dot"
                          aria-hidden="true"
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{
                            backgroundColor: 'var(--prism-primary-main)',
                            boxShadow:
                              '0 0 0 2px color-mix(in srgb, var(--prism-primary-main) 24%, transparent)',
                          }}
                        />
                        <span className="sr-only">Unsaved changes</span>
                      </>
                    ) : null}
                    <span className="truncate">{displayTitle}</span>
                  </button>

                  <button
                    type="button"
                    data-tab-action="detach"
                    disabled={disabled}
                    aria-label={`Detach ${displayTitle}`}
                    onClick={() => handleTearOffTab(tab, index)}
                    className="prism-focus-ring w-5 h-5 rounded-md inline-flex items-center justify-center shrink-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 transition-opacity enabled:hover:opacity-100 opacity-75"
                    style={{
                      color: 'var(--prism-text-secondary)',
                    }}
                  >
                    <ExternalLink aria-hidden="true" className="w-3 h-3" />
                  </button>

                  {isClosable ? (
                    <button
                      type="button"
                      data-tab-action="close"
                      disabled={disabled}
                      aria-label={`Close ${displayTitle}`}
                      onClick={() => handleCloseTab(tab, index)}
                      className="prism-focus-ring w-5 h-5 rounded-md inline-flex items-center justify-center shrink-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 transition-opacity enabled:hover:opacity-100 opacity-75"
                      style={{
                        color: 'var(--prism-text-secondary)',
                      }}
                    >
                      <X aria-hidden="true" className="w-3 h-3" />
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          data-part="add-tab"
          disabled={disabled}
          aria-label="New window tab"
          onClick={handleAddTab}
          className={cx(
            addButtonClass,
            'prism-crystal prism-focus-ring inline-flex items-center gap-1 h-8 px-2.5 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 border cursor-pointer disabled:cursor-not-allowed disabled:opacity-45 transition-opacity enabled:hover:opacity-90'
          )}
          style={{
            color: 'var(--prism-text-primary)',
            borderColor: 'var(--prism-divider)',
          }}
        >
          <Plus aria-hidden="true" className="w-3.5 h-3.5" />
          <span>New Tab</span>
        </button>
      </header>

      {visibleDetachedTabs.length > 0 ? (
        <section
          data-part="detached-shelf"
          aria-label="Detached Windows"
          className={cx(
            shelfClass,
            'px-3.5 py-2.5 border-b flex flex-col gap-2 min-w-0 max-w-full'
          )}
          style={{
            borderColor: 'var(--prism-divider)',
            backgroundColor:
              'color-mix(in srgb, var(--prism-well-start) 72%, transparent)',
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
            <div
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: 'var(--prism-text-secondary)' }}
            >
              <AppWindow aria-hidden="true" className="w-3.5 h-3.5" />
              <span>Detached Windows</span>
            </div>
            <span
              className="prism-well px-2 py-0.5 rounded-full text-[11px] font-mono tabular-nums"
              style={{ color: 'var(--prism-text-secondary)' }}
            >
              {visibleDetachedTabs.length}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 min-w-0 max-w-full">
            {visibleDetachedTabs.map((detached) => {
              const detachedTitle = getDisplayTitle(detached);
              const detachedSubtitle = getDisplaySubtitle(detached);
              const detachedTitleId = `${baseId}-detached-${detached.id}`;

              return (
                <div
                  key={detached.id}
                  data-part="detached-window"
                  data-tab-id={detached.id}
                  className="prism-crystal rounded-xl px-2.5 py-1.5 border inline-flex flex-wrap items-center gap-2 min-w-0 max-w-full"
                  style={{ borderColor: 'var(--prism-divider)' }}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    {detached.dirty ? (
                      <span
                        aria-hidden="true"
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{
                          backgroundColor: 'var(--prism-primary-main)',
                        }}
                      />
                    ) : null}
                    <div className="flex flex-col min-w-0">
                      <span
                        id={detachedTitleId}
                        className="text-xs font-medium truncate"
                        style={{ color: 'var(--prism-text-primary)' }}
                      >
                        {detachedTitle}
                      </span>
                      {detachedSubtitle ? (
                        <span
                          className="text-[10px] font-mono truncate"
                          style={{ color: 'var(--prism-text-secondary)' }}
                        >
                          {detachedSubtitle}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={disabled}
                    aria-describedby={detachedTitleId}
                    onClick={() => handleMergeBackTab(detached)}
                    className="prism-well prism-focus-ring inline-flex items-center gap-1 h-7 px-2.5 rounded-lg text-[11px] font-medium whitespace-nowrap shrink-0 border cursor-pointer disabled:cursor-not-allowed disabled:opacity-45 transition-opacity enabled:hover:opacity-90"
                    style={{
                      color: 'var(--prism-primary-main)',
                      borderColor:
                        'color-mix(in srgb, var(--prism-primary-main) 28%, var(--prism-divider))',
                    }}
                  >
                    <Merge aria-hidden="true" className="w-3 h-3" />
                    <span>Merge Back</span>
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <div className="p-3.5 min-w-0 max-w-full">
        {activeTab ? (
          <div
            id={panelId}
            role="tabpanel"
            aria-labelledby={activeTabButtonId}
            data-part="preview-pane"
            className={cx(
              previewClass,
              'prism-well rounded-2xl px-3.5 py-3 flex flex-wrap items-center justify-between gap-2 min-w-0 max-w-full'
            )}
          >
            <div className="flex items-start gap-2.5 min-w-0 flex-1">
              <span
                aria-hidden="true"
                className="prism-crystal w-8 h-8 rounded-xl inline-flex items-center justify-center shrink-0"
                style={{ color: 'var(--prism-primary-main)' }}
              >
                <FileText className="w-4 h-4" />
              </span>

              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <h3
                    data-part="preview-title"
                    className="text-sm font-semibold truncate"
                    style={{ color: 'var(--prism-text-primary)' }}
                  >
                    {activeDisplayTitle}
                  </h3>
                  {activeTab.dirty ? (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0"
                      style={{
                        color: 'var(--prism-primary-main)',
                        backgroundColor:
                          'color-mix(in srgb, var(--prism-primary-main) 14%, transparent)',
                      }}
                    >
                      Unsaved
                    </span>
                  ) : null}
                </div>

                {activeDisplaySubtitle ? (
                  <p
                    data-part="preview-subtitle"
                    className="text-xs font-mono truncate mt-0.5"
                    style={{ color: 'var(--prism-text-secondary)' }}
                  >
                    {activeDisplaySubtitle}
                  </p>
                ) : null}
              </div>
            </div>

            <div
              className="inline-flex items-center gap-2 text-[11px] font-mono shrink-0"
              style={{ color: 'var(--prism-text-secondary)' }}
            >
              <span className="tabular-nums">
                Tab {activeTabIndex + 1} / {currentTabs.length}
              </span>
            </div>
          </div>
        ) : (
          <div
            role="status"
            data-part="empty-state"
            className={cx(
              emptyClass,
              'prism-well rounded-2xl px-4 py-6 text-center flex flex-col items-center gap-1 min-w-0 max-w-full'
            )}
          >
            <p
              className="text-sm font-semibold"
              style={{ color: 'var(--prism-text-primary)' }}
            >
              No open window tabs
            </p>
            <p
              className="text-xs"
              style={{ color: 'var(--prism-text-secondary)' }}
            >
              Open a new tab or merge a detached window back into this titlebar.
            </p>
          </div>
        )}
      </div>

      <div
        data-part="status-bar"
        role={currentTabs.length > 0 ? 'status' : undefined}
        aria-live="polite"
        aria-atomic="true"
        className={cx(
          statusBarClass,
          'px-3.5 py-1.5 border-t text-[11px] flex flex-wrap items-center justify-between gap-2 min-w-0 max-w-full'
        )}
        style={{
          borderColor: 'var(--prism-divider)',
          color: 'var(--prism-text-secondary)',
        }}
      >
        <span className="truncate">{announcement || idleStatusText}</span>
        <span className="font-mono text-[10px] shrink-0">
          Alt+←/→ Reorder
        </span>
      </div>
    </div>
  );
}

MergedWindowTabBar.displayName = 'MergedWindowTabBar';
