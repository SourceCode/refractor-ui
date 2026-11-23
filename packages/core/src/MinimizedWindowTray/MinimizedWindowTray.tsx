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
import {
  AppWindow,
  ArrowUpRight,
  LayoutGrid,
  Minimize2,
  RotateCcw,
  Rows3,
  X,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { STYLE_BG_ERROR, STYLE_BG_SUCCESS, STYLE_BG_WARNING, STYLE_BORDER_DIVIDER, STYLE_BORDER_DIVIDER_TEXT_SECONDARY, STYLE_PRIMARY_MAIN, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export type MinimizedTrayDisplayMode = 'thumbnails' | 'pills';

export type MinimizedWindowTone =
  | 'primary'
  | 'info'
  | 'emerald'
  | 'amber'
  | 'rose';

export interface MinimizedWindowItem {
  /** Stable unique identifier for the minimized window. */
  id: string;
  /** Host application name displayed as a compact badge or tag. */
  appName: string;
  /** Document or window title displayed on the thumbnail card or glass pill. */
  title: string;
  /** Compact relative or wall-clock timestamp showing when the window was minimized. */
  minimizedAt: string;
  /** Semantic optical accent tone mapped strictly to `--prism-*` tokens (defaults to `'primary'`). */
  tone?: MinimizedWindowTone;
}

type MinimizedWindowTrayBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface MinimizedWindowTrayProps extends MinimizedWindowTrayBaseProps {
  /** Tray heading displayed inside the optical glass header (defaults to `'Minimized Windows'`). */
  title?: string;
  /** Controlled array of minimized window entries. Pass `[]` to display the `role="status"` empty state. */
  items?: ReadonlyArray<MinimizedWindowItem>;
  /** Initial minimized window entries when operating in uncontrolled mode. */
  defaultItems?: ReadonlyArray<MinimizedWindowItem>;
  /** Controlled tray presentation mode (`'thumbnails' | 'pills'`). */
  displayMode?: MinimizedTrayDisplayMode;
  /** Initial presentation mode when operating in uncontrolled mode (defaults to `'thumbnails'`). */
  defaultDisplayMode?: MinimizedTrayDisplayMode;
  /** Callback fired when switching between `'thumbnails'` and `'pills'` display modes. */
  onDisplayModeChange?: (mode: MinimizedTrayDisplayMode) => void;
  /** Callback fired when an individual minimized window is restored via click or keyboard Enter/Space. */
  onRestoreWindow?: (item: MinimizedWindowItem) => void;
  /** Callback fired when `Restore All` restores all currently minimized windows. */
  onRestoreAll?: (items: ReadonlyArray<MinimizedWindowItem>) => void;
  /** Callback fired when an individual minimized window is closed via its `Close <title>` button. */
  onCloseWindow?: (windowId: string) => void;
  /** Disables display mode switching, `Restore All`, window restoration, and window closing. */
  disabled?: boolean;
}

interface NormalizedMinimizedWindow {
  key: string;
  id: string;
  appName: string;
  title: string;
  minimizedAt: string;
  tone: MinimizedWindowTone;
  item: MinimizedWindowItem;
}

const DEFAULT_TRAY_TITLE = 'Minimized Windows';

const DEFAULT_MINIMIZED_WINDOWS: ReadonlyArray<MinimizedWindowItem> = [
  {
    id: 'shader-graph-v3',
    appName: 'Prism Studio',
    title: 'ShaderGraph_v3.prism',
    minimizedAt: '2m ago',
    tone: 'primary',
  },
  {
    id: 'release-logs-zsh',
    appName: 'Terminal',
    title: 'ReleaseLogs — zsh',
    minimizedAt: '6m ago',
    tone: 'info',
  },
  {
    id: 'q4-budget-xlsx',
    appName: 'Sheets',
    title: 'Q4_Budget.xlsx',
    minimizedAt: '14m ago',
    tone: 'emerald',
  },
  {
    id: 'brand-spec-pdf',
    appName: 'Preview',
    title: 'BrandSpec.pdf',
    minimizedAt: '28m ago',
    tone: 'amber',
  },
];

function getToneAccentVar(tone: MinimizedWindowTone): string {
  switch (tone) {
    case 'info':
      return 'var(--prism-info-main)';
    case 'emerald':
      return 'var(--prism-success-main)';
    case 'amber':
      return 'var(--prism-warning-main)';
    case 'rose':
      return 'var(--prism-error-main)';
    case 'primary':
      return 'var(--prism-primary-main)';
  }
}

function dedupeItems(
  source: ReadonlyArray<MinimizedWindowItem>
): MinimizedWindowItem[] {
  const seen = new Set<string>();
  const out: MinimizedWindowItem[] = [];
  for (const item of source) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      out.push(item);
    }
  }
  return out;
}

function normalizeItems(
  source: ReadonlyArray<MinimizedWindowItem>
): ReadonlyArray<NormalizedMinimizedWindow> {
  return dedupeItems(source).map((item) => ({
    key: `minimized:${item.id}`,
    id: item.id,
    appName: item.appName.trim() || 'App',
    title: item.title.trim() || 'Untitled window',
    minimizedAt: item.minimizedAt.trim() || 'Just now',
    tone: item.tone ?? 'primary',
    item,
  }));
}

function pluralizeWindows(count: number): string {
  return count === 1 ? 'window' : 'windows';
}

const headerClass = /*#__PURE__*/ stableClassName('minimized-window-tray', 'header');
const countClass = /*#__PURE__*/ stableClassName('minimized-window-tray', 'count');
const modeSwitcherClass = /*#__PURE__*/ stableClassName('minimized-window-tray', 'mode-switcher');
const restoreAllClass = /*#__PURE__*/ stableClassName('minimized-window-tray', 'restore-all');
const shelfClass = /*#__PURE__*/ stableClassName('minimized-window-tray', 'shelf');
const thumbnailClass = /*#__PURE__*/ stableClassName('minimized-window-tray', 'thumbnail');
const pillClass = /*#__PURE__*/ stableClassName('minimized-window-tray', 'pill');
const emptyClass = /*#__PURE__*/ stableClassName('minimized-window-tray', 'empty');
const statusBarClass = /*#__PURE__*/ stableClassName('minimized-window-tray', 'status-bar');

function MinimizedWindowTrayInner({
  title = DEFAULT_TRAY_TITLE,
  items,
  defaultItems,
  displayMode,
  defaultDisplayMode = 'thumbnails',
  onDisplayModeChange,
  onRestoreWindow,
  onRestoreAll,
  onCloseWindow,
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: MinimizedWindowTrayProps) {
  const titleId = useId();
  const override = useComponentOverride('MinimizedWindowTray');

  const isItemsControlled = items !== undefined;
  const [internalItems, setInternalItems] = useState<MinimizedWindowItem[]>(
    () =>
      defaultItems !== undefined
        ? dedupeItems(defaultItems)
        : dedupeItems(DEFAULT_MINIMIZED_WINDOWS)
  );

  const normalizedItems = useMemo<ReadonlyArray<NormalizedMinimizedWindow>>(
    () => normalizeItems(isItemsControlled ? items : internalItems),
    [isItemsControlled, items, internalItems]
  );

  const [currentDisplayMode, setCurrentDisplayMode] =
    useControllableState<MinimizedTrayDisplayMode>({
      value: displayMode,
      defaultValue: defaultDisplayMode,
      onChange: onDisplayModeChange,
    });

  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');

  const itemTriggerRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const pendingFocusIdRef = useRef<string | null>(null);

  const resolvedTitle = title.trim() || DEFAULT_TRAY_TITLE;
  const isEmpty = normalizedItems.length === 0;

  const rovingFocusId = useMemo<string | null>(() => {
    if (
      focusedItemId !== null &&
      normalizedItems.some((entry) => entry.id === focusedItemId)
    ) {
      return focusedItemId;
    }
    return normalizedItems[0]?.id ?? null;
  }, [focusedItemId, normalizedItems]);

  useEffect(() => {
    const pendingId = pendingFocusIdRef.current;
    if (pendingId) {
      pendingFocusIdRef.current = null;
      itemTriggerRefs.current.get(pendingId)?.focus();
    }
  }, [normalizedItems, currentDisplayMode]);

  const handleDisplayModeChange = useCallback(
    (nextMode: MinimizedTrayDisplayMode) => {
      if (nextMode === currentDisplayMode) {
        return;
      }
      setCurrentDisplayMode(nextMode);
      setAnnouncement(
        nextMode === 'thumbnails'
          ? 'Switched minimized tray to Thumbnails view'
          : 'Switched minimized tray to Glass Pills view'
      );
    },
    [currentDisplayMode, setCurrentDisplayMode]
  );

  const handleRestoreWindow = useCallback(
    (
      entry: NormalizedMinimizedWindow,
      index: number,
      restoreFocusToNeighbor = false
    ) => {
      if (!isItemsControlled) {
        const nextItems = internalItems.filter((item) => item.id !== entry.id);
        setInternalItems(nextItems);
        if (restoreFocusToNeighbor) {
          const fallback = nextItems[Math.min(index, nextItems.length - 1)];
          if (fallback) {
            setFocusedItemId(fallback.id);
            pendingFocusIdRef.current = fallback.id;
          } else {
            setFocusedItemId(null);
          }
        }
      }
      setAnnouncement(`Restored ${entry.title}`);
      onRestoreWindow?.(entry.item);
    },
    [internalItems, isItemsControlled, onRestoreWindow]
  );

  const handleRestoreAll = useCallback(() => {
    const snapshot = normalizedItems.map((entry) => entry.item);
    if (!isItemsControlled) {
      setInternalItems([]);
      setFocusedItemId(null);
    }
    setAnnouncement(
      `Restored all ${snapshot.length} minimized ${pluralizeWindows(snapshot.length)}`
    );
    onRestoreAll?.(snapshot);
  }, [isItemsControlled, normalizedItems, onRestoreAll]);

  const handleCloseWindow = useCallback(
    (entry: NormalizedMinimizedWindow) => {
      if (!isItemsControlled) {
        setInternalItems((prev) => prev.filter((item) => item.id !== entry.id));
      }
      setAnnouncement(`Closed ${entry.title}`);
      onCloseWindow?.(entry.id);
    },
    [isItemsControlled, onCloseWindow]
  );

  const handleItemKeyDown = useCallback(
    (
      event: ReactKeyboardEvent<HTMLButtonElement>,
      index: number,
      entry: NormalizedMinimizedWindow
    ) => {
      if (disabled || event.nativeEvent.isComposing) {
        return;
      }

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleRestoreWindow(entry, index, true);
        return;
      }

      if (event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }

      let nextIndex: number | null = null;
      if (event.key === 'ArrowRight') {
        nextIndex = (index + 1) % normalizedItems.length;
      } else if (event.key === 'ArrowLeft') {
        nextIndex =
          (index - 1 + normalizedItems.length) % normalizedItems.length;
      } else if (event.key === 'Home') {
        nextIndex = 0;
      } else if (event.key === 'End') {
        nextIndex = normalizedItems.length - 1;
      }

      const target =
        nextIndex !== null ? normalizedItems[nextIndex] : undefined;
      if (target) {
        event.preventDefault();
        setFocusedItemId(target.id);
        itemTriggerRefs.current.get(target.id)?.focus();
      }
    },
    [disabled, handleRestoreWindow, normalizedItems]
  );

  const merged = mergeProps({
    themeTarget: themeProps('minimized-window-tray', {
      displayMode: currentDisplayMode,
      disabled,
      empty: isEmpty,
      count: normalizedItems.length,
    }),
    baseClassName: cx(
      'prism-slab relative flex flex-col overflow-hidden w-full max-w-full min-w-0 transition-opacity',
      disabled ? 'opacity-75' : ''
    ),
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });


  const idleStatusText = isEmpty
    ? 'All windows restored · Tray empty'
    : `${normalizedItems.length} minimized ${pluralizeWindows(normalizedItems.length)} · ${
        currentDisplayMode === 'thumbnails' ? 'Thumbnails' : 'Glass Pills'
      } view`;

  return (
    <div
      ref={ref}
      role="region"
      aria-labelledby={titleId}
      {...rest}
      {...merged}
    >
      <header
        data-part="header"
        className={cx(
          headerClass,
          'prism-crystal relative flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 border-b min-w-0 max-w-full'
        )}
        style={STYLE_BORDER_DIVIDER}
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

        <div className="flex items-center gap-2 min-w-0">
          <span
            aria-hidden="true"
            className="prism-well w-6 h-6 rounded-lg inline-flex items-center justify-center shrink-0"
            style={STYLE_PRIMARY_MAIN}
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </span>

          <h2
            id={titleId}
            data-part="title"
            className="text-xs font-semibold tracking-wide truncate"
            style={STYLE_TEXT_PRIMARY}
          >
            {resolvedTitle}
          </h2>

          <span
            data-part="count-badge"
            data-testid="minimized-tray-count"
            aria-label={`${normalizedItems.length} minimized ${pluralizeWindows(normalizedItems.length)}`}
            className={cx(
              countClass,
              'prism-well inline-flex items-center justify-center min-w-[22px] h-5 px-2 rounded-full text-[11px] font-mono font-semibold tabular-nums shrink-0'
            )}
            style={{
              color: isEmpty
                ? 'var(--prism-text-disabled)'
                : 'var(--prism-primary-main)',
            }}
          >
            {normalizedItems.length}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <div
            role="group"
            aria-label="Tray display mode"
            data-part="mode-switcher"
            className={cx(
              modeSwitcherClass,
              'prism-well inline-flex items-center gap-0.5 rounded-full p-0.5 shrink-0'
            )}
          >
            <button
              type="button"
              disabled={disabled}
              aria-pressed={currentDisplayMode === 'thumbnails'}
              data-mode="thumbnails"
              onClick={() => handleDisplayModeChange('thumbnails')}
              className={cx(
                'prism-focus-ring inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11px] font-medium whitespace-nowrap cursor-pointer disabled:cursor-not-allowed disabled:opacity-45 transition-[color,background-color,border-color,opacity,transform]',
                currentDisplayMode === 'thumbnails'
                  ? 'prism-crystal font-semibold'
                  : ''
              )}
              style={{
                color:
                  currentDisplayMode === 'thumbnails'
                    ? 'var(--prism-text-primary)'
                    : 'var(--prism-text-secondary)',
              }}
            >
              <LayoutGrid aria-hidden="true" className="w-3 h-3 shrink-0" />
              <span>Thumbnails</span>
            </button>

            <button
              type="button"
              disabled={disabled}
              aria-pressed={currentDisplayMode === 'pills'}
              data-mode="pills"
              onClick={() => handleDisplayModeChange('pills')}
              className={cx(
                'prism-focus-ring inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11px] font-medium whitespace-nowrap cursor-pointer disabled:cursor-not-allowed disabled:opacity-45 transition-[color,background-color,border-color,opacity,transform]',
                currentDisplayMode === 'pills'
                  ? 'prism-crystal font-semibold'
                  : ''
              )}
              style={{
                color:
                  currentDisplayMode === 'pills'
                    ? 'var(--prism-text-primary)'
                    : 'var(--prism-text-secondary)',
              }}
            >
              <Rows3 aria-hidden="true" className="w-3 h-3 shrink-0" />
              <span>Glass Pills</span>
            </button>
          </div>

          <button
            type="button"
            data-part="restore-all"
            disabled={disabled || isEmpty}
            onClick={handleRestoreAll}
            className={cx(
              restoreAllClass,
              'prism-crystal prism-focus-ring inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium whitespace-nowrap shrink-0 border cursor-pointer disabled:cursor-not-allowed disabled:opacity-45 transition-opacity enabled:hover:opacity-90'
            )}
            style={{
              color:
                disabled || isEmpty
                  ? 'var(--prism-text-disabled)'
                  : 'var(--prism-primary-main)',
              borderColor:
                disabled || isEmpty
                  ? 'var(--prism-divider)'
                  : 'color-mix(in srgb, var(--prism-primary-main) 30%, var(--prism-divider))',
            }}
          >
            <RotateCcw aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
            <span>Restore All</span>
          </button>
        </div>
      </header>

      {isEmpty ? (
        <div className="px-3.5 py-3 min-w-0 max-w-full">
          <div
            role="status"
            data-part="empty-state"
            data-testid="minimized-tray-empty"
            className={cx(
              emptyClass,
              'prism-well rounded-2xl px-4 py-6 text-center flex flex-col items-center justify-center gap-1.5 min-w-0 max-w-full'
            )}
          >
            <span
              aria-hidden="true"
              className="prism-crystal w-9 h-9 rounded-xl inline-flex items-center justify-center mb-0.5"
              style={STYLE_TEXT_SECONDARY}
            >
              <AppWindow className="w-4 h-4" />
            </span>
            <p
              className="text-sm font-semibold"
              style={STYLE_TEXT_PRIMARY}
            >
              No minimized windows
            </p>
            <p
              className="text-xs max-w-md"
              style={STYLE_TEXT_SECONDARY}
            >
              Minimized windows dock here as live optical thumbnails or glass
              pills until restored.
            </p>
          </div>
        </div>
      ) : (
        <div
          role="list"
          aria-label="Minimized windows"
          data-part="shelf"
          data-testid="minimized-tray-shelf"
          data-display-mode={currentDisplayMode}
          className={cx(
            shelfClass,
            currentDisplayMode === 'thumbnails'
              ? 'flex items-stretch gap-3 overflow-x-auto max-w-full min-w-0 px-3.5 py-3'
              : 'flex items-center gap-2 overflow-x-auto max-w-full min-w-0 px-3.5 py-3'
          )}
        >
          {normalizedItems.map((entry, index) => {
            const accentVar = getToneAccentVar(entry.tone);
            const isRovingTarget = rovingFocusId === entry.id;

            if (currentDisplayMode === 'pills') {
              return (
                <div
                  key={entry.key}
                  role="listitem"
                  data-part="tray-pill"
                  data-testid={`minimized-window-item-${index}`}
                  data-window-id={entry.id}
                  data-tone={entry.tone}
                  className={cx(
                    pillClass,
                    'prism-crystal rounded-full inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1.5 shrink-0 max-w-[280px] border transition-[color,background-color,border-color,opacity,transform]'
                  )}
                  style={{
                    borderColor: `color-mix(in srgb, ${accentVar} 28%, var(--prism-divider))`,
                  }}
                >
                  <button
                    ref={(node) => {
                      if (node) {
                        itemTriggerRefs.current.set(entry.id, node);
                      } else {
                        itemTriggerRefs.current.delete(entry.id);
                      }
                    }}
                    type="button"
                    disabled={disabled}
                    tabIndex={disabled ? -1 : isRovingTarget ? 0 : -1}
                    aria-label={`Restore ${entry.title} (${entry.appName})`}
                    data-part="restore-trigger"
                    onFocus={() => setFocusedItemId(entry.id)}
                    onClick={() => handleRestoreWindow(entry, index)}
                    onKeyDown={(event) => handleItemKeyDown(event, index, entry)}
                    className="prism-focus-ring inline-flex items-center gap-2 min-w-0 rounded-full py-0.5 pr-1 text-left cursor-pointer disabled:cursor-not-allowed transition-opacity enabled:hover:opacity-85"
                  >
                    <span
                      aria-hidden="true"
                      data-part="tone-dot"
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{
                        backgroundColor: accentVar,
                        boxShadow: `0 0 0 2px color-mix(in srgb, ${accentVar} 24%, transparent)`,
                      }}
                    />
                    <span
                      className="text-xs font-semibold truncate"
                      style={STYLE_TEXT_PRIMARY}
                    >
                      {entry.title}
                    </span>
                    <span
                      className="prism-well rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0 max-w-[96px] truncate"
                      style={STYLE_TEXT_SECONDARY}
                    >
                      {entry.appName}
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={disabled}
                    aria-label={`Close ${entry.title}`}
                    data-part="close-window"
                    onClick={() => handleCloseWindow(entry)}
                    className="prism-focus-ring w-5 h-5 rounded-full inline-flex items-center justify-center shrink-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 transition-opacity opacity-75 enabled:hover:opacity-100"
                    style={STYLE_TEXT_SECONDARY}
                  >
                    <X aria-hidden="true" className="w-3 h-3" />
                  </button>
                </div>
              );
            }

            return (
              <div
                key={entry.key}
                role="listitem"
                data-part="tray-thumbnail"
                data-testid={`minimized-window-item-${index}`}
                data-window-id={entry.id}
                data-tone={entry.tone}
                className={cx(
                  thumbnailClass,
                  'prism-crystal rounded-2xl w-52 sm:w-56 shrink-0 flex flex-col overflow-hidden border transition-[color,background-color,border-color,opacity,transform]'
                )}
                style={{
                  borderColor: `color-mix(in srgb, ${accentVar} 26%, var(--prism-divider))`,
                }}
              >
                <div
                  data-part="mini-titlebar"
                  className="flex items-center justify-between gap-1.5 px-2.5 py-1.5 border-b min-w-0"
                  style={{
                    borderColor: 'var(--prism-divider)',
                    backgroundColor:
                      'color-mix(in srgb, var(--prism-crystal-top) 64%, transparent)',
                  }}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      aria-hidden="true"
                      className="inline-flex items-center gap-1 shrink-0"
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={STYLE_BG_ERROR}
                      />
                      <span
                        className="w-2 h-2 rounded-full"
                        style={STYLE_BG_WARNING}
                      />
                      <span
                        className="w-2 h-2 rounded-full"
                        style={STYLE_BG_SUCCESS}
                      />
                    </span>
                    <span
                      className="text-[10px] font-semibold uppercase tracking-wider truncate"
                      style={STYLE_TEXT_SECONDARY}
                    >
                      {entry.appName}
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={disabled}
                    aria-label={`Close ${entry.title}`}
                    data-part="close-window"
                    onClick={() => handleCloseWindow(entry)}
                    className="prism-focus-ring w-5 h-5 rounded-full inline-flex items-center justify-center shrink-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 transition-opacity opacity-75 enabled:hover:opacity-100"
                    style={STYLE_TEXT_SECONDARY}
                  >
                    <X aria-hidden="true" className="w-3 h-3" />
                  </button>
                </div>

                <button
                  ref={(node) => {
                    if (node) {
                      itemTriggerRefs.current.set(entry.id, node);
                    } else {
                      itemTriggerRefs.current.delete(entry.id);
                    }
                  }}
                  type="button"
                  disabled={disabled}
                  tabIndex={disabled ? -1 : isRovingTarget ? 0 : -1}
                  aria-label={`Restore ${entry.title} (${entry.appName})`}
                  data-part="restore-trigger"
                  onFocus={() => setFocusedItemId(entry.id)}
                  onClick={() => handleRestoreWindow(entry, index)}
                  onKeyDown={(event) => handleItemKeyDown(event, index, entry)}
                  className="prism-focus-ring flex flex-col gap-2 p-2.5 text-left min-w-0 w-full flex-1 cursor-pointer disabled:cursor-not-allowed transition-opacity enabled:hover:opacity-90"
                >
                  <div
                    aria-hidden="true"
                    data-part="mini-viewport"
                    className="prism-well rounded-xl p-2 flex flex-col gap-1.5 w-full overflow-hidden"
                  >
                    <span
                      className="block h-1 w-full rounded-full"
                      style={{
                        background: `linear-gradient(90deg, ${accentVar} 0%, color-mix(in srgb, ${accentVar} 28%, transparent) 100%)`,
                      }}
                    />
                    <div className="grid grid-cols-3 gap-1.5 items-stretch">
                      <div className="col-span-1 flex flex-col gap-1">
                        <span
                          className="block h-2 rounded-sm"
                          style={{
                            backgroundColor: `color-mix(in srgb, ${accentVar} 26%, transparent)`,
                          }}
                        />
                        <span
                          className="block h-2 rounded-sm w-4/5"
                          style={{
                            backgroundColor:
                              'color-mix(in srgb, var(--prism-text-secondary) 20%, transparent)',
                          }}
                        />
                        <span
                          className="block h-2 rounded-sm w-3/5"
                          style={{
                            backgroundColor:
                              'color-mix(in srgb, var(--prism-text-secondary) 16%, transparent)',
                          }}
                        />
                      </div>
                      <div className="col-span-2 flex flex-col gap-1">
                        <span
                          className="block h-3.5 rounded-md"
                          style={{
                            backgroundColor: `color-mix(in srgb, ${accentVar} 18%, var(--prism-divider))`,
                          }}
                        />
                        <span
                          className="block h-2 rounded-sm w-11/12"
                          style={{
                            backgroundColor:
                              'color-mix(in srgb, var(--prism-text-secondary) 22%, transparent)',
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 min-w-0 w-full">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        aria-hidden="true"
                        data-part="tone-dot"
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: accentVar }}
                      />
                      <span
                        className="text-xs font-semibold truncate"
                        style={STYLE_TEXT_PRIMARY}
                      >
                        {entry.title}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 min-w-0 text-[10px]">
                      <span
                        className="font-mono tabular-nums truncate"
                        style={STYLE_TEXT_SECONDARY}
                      >
                        {entry.minimizedAt}
                      </span>
                      <span
                        aria-hidden="true"
                        className="inline-flex items-center gap-0.5 font-medium shrink-0"
                        style={{ color: accentVar }}
                      >
                        <span>Restore</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div
        data-part="status-bar"
        data-testid="minimized-tray-status"
        role={isEmpty ? undefined : 'status'}
        aria-live="polite"
        aria-atomic="true"
        className={cx(
          statusBarClass,
          'px-3.5 py-1.5 border-t text-[11px] flex flex-wrap items-center justify-between gap-2 min-w-0 max-w-full'
        )}
        style={STYLE_BORDER_DIVIDER_TEXT_SECONDARY}
      >
        <span className="truncate">{announcement || idleStatusText}</span>
        <span className="font-mono text-[10px] shrink-0">
          ←/→ Navigate · Enter Restore
        </span>
      </div>
    </div>
  );
}

export const MinimizedWindowTray = /*#__PURE__*/ memoWithDisplayName(MinimizedWindowTrayInner, 'MinimizedWindowTray');
