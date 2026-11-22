'use client';

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import {
  AppWindow,
  ChevronLeft,
  ChevronRight,
  CornerDownLeft,
  Layers,
  X,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { composeEventHandlers } from '../utils/composeEventHandlers';
import { cx, mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';

export type WindowSwitcherMode = 'inline' | 'overlay';

export type SwitcherWindowTone =
  | 'primary'
  | 'info'
  | 'emerald'
  | 'amber'
  | 'rose';

export interface SwitcherWindowItem {
  /** Stable unique identifier for the open window. */
  id: string;
  /** Application name displayed above the window title. */
  appName: string;
  /** Specific document, tab, or session title for this window. */
  title: string;
  /** Optional workspace or virtual desktop pill label (e.g., `'Workspace 1'`). */
  workspaceLabel?: string;
  /** Semantic optical accent tone mapped strictly to `--prism-*` tokens (defaults to `'primary'`). */
  tone?: SwitcherWindowTone;
  /** Marks the window as the currently active workspace window. */
  active?: boolean;
}

type WindowSwitcherOverlayBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface WindowSwitcherOverlayProps extends WindowSwitcherOverlayBaseProps {
  /** Controlled list of active windows rendered in the switcher strip. */
  windows?: ReadonlyArray<SwitcherWindowItem>;
  /** Initial uncontrolled list of windows (defaults to 5 realistic studio windows). */
  defaultWindows?: ReadonlyArray<SwitcherWindowItem>;
  /** Presentation mode: `'inline'` embeds the slab directly; `'overlay'` mounts a centered frosted modal backdrop. */
  mode?: WindowSwitcherMode;
  /** Visibility flag for `mode="overlay"` (returns `null` when `false`; defaults to `true`). */
  open?: boolean;
  /** Callback invoked when the user focuses a window via `Enter`, `Space`, card click, or `Focus Window`. */
  onFocusWindow?: (windowItem: SwitcherWindowItem) => void;
  /** Callback invoked when the user closes a window via its `Close <title>` button or `Delete`/`Backspace`. */
  onCloseWindow?: (windowId: string) => void;
  /** Callback invoked when dismissed via `Escape`, backdrop click, or overlay dismiss control. */
  onDismiss?: () => void;
  /** Disables window cycling, focusing, closing, and dismissal interactions (defaults to `false`). */
  disabled?: boolean;
}

interface ThumbnailLineSpec {
  id: string;
  widthClass: string;
  accented: boolean;
}

const DEFAULT_SWITCHER_WINDOWS: ReadonlyArray<SwitcherWindowItem> = [
  {
    id: 'refractor-ide',
    appName: 'Refractor IDE',
    title: 'WindowSwitcherOverlay.tsx',
    workspaceLabel: 'Workspace 1',
    tone: 'primary',
    active: true,
  },
  {
    id: 'optical-shader-preview',
    appName: 'Optical Shader Preview',
    title: 'Caustic Dispersion Pass',
    workspaceLabel: 'Workspace 1',
    tone: 'info',
  },
  {
    id: 'terminal-multiplexer',
    appName: 'Terminal Multiplexer',
    title: 'vitest --coverage · zsh',
    workspaceLabel: 'Workspace 2',
    tone: 'emerald',
  },
  {
    id: 'design-specs',
    appName: 'Design Specs',
    title: 'Prism Optical Token Matrix',
    workspaceLabel: 'Workspace 2',
    tone: 'amber',
  },
  {
    id: 'audio-dsp-mixer',
    appName: 'Audio DSP Mixer',
    title: 'Master Bus · 48 kHz',
    workspaceLabel: 'Workspace 3',
    tone: 'rose',
  },
];

const THUMBNAIL_SKELETON_LINES: ReadonlyArray<ThumbnailLineSpec> = [
  { id: 'heading', widthClass: 'w-4/5', accented: true },
  { id: 'body-primary', widthClass: 'w-full', accented: false },
  { id: 'body-secondary', widthClass: 'w-3/5', accented: false },
];

function getToneAccentVar(tone: SwitcherWindowTone): string {
  switch (tone) {
    case 'primary':
      return 'var(--prism-primary-main)';
    case 'info':
      return 'var(--prism-info-main)';
    case 'emerald':
      return 'var(--prism-success-main)';
    case 'amber':
      return 'var(--prism-warning-main)';
    case 'rose':
      return 'var(--prism-error-main)';
  }
}

function dedupeWindows(
  list: ReadonlyArray<SwitcherWindowItem>
): SwitcherWindowItem[] {
  const seen = new Set<string>();
  const out: SwitcherWindowItem[] = [];
  for (const item of list) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      out.push(item);
    }
  }
  return out;
}

function findInitialHighlightedIndex(
  list: ReadonlyArray<SwitcherWindowItem>
): number {
  if (list.length === 0) {
    return -1;
  }
  const activeIdx = list.findIndex((item) => item.active === true);
  return activeIdx >= 0 ? activeIdx : 0;
}

function getDisplayAppName(item: SwitcherWindowItem): string {
  return item.appName.trim() || 'Application';
}

function getDisplayTitle(item: SwitcherWindowItem): string {
  return item.title.trim() || item.appName.trim() || 'Untitled window';
}

function getDisplayWorkspace(item: SwitcherWindowItem): string | null {
  const trimmed = item.workspaceLabel?.trim();
  return trimmed ? trimmed : null;
}

export function WindowSwitcherOverlay({
  windows,
  defaultWindows,
  mode = 'inline',
  open = true,
  onFocusWindow,
  onCloseWindow,
  onDismiss,
  disabled = false,
  'aria-label': ariaLabel,
  onClick,
  onKeyDown,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: WindowSwitcherOverlayProps) {
  const baseId = useId();
  const override = useComponentOverride('WindowSwitcherOverlay');
  const isControlled = windows !== undefined;

  const [internalWindows, setInternalWindows] = useState<SwitcherWindowItem[]>(
    () => dedupeWindows(defaultWindows ?? DEFAULT_SWITCHER_WINDOWS)
  );

  const currentWindows = useMemo<ReadonlyArray<SwitcherWindowItem>>(
    () => (isControlled ? dedupeWindows(windows) : internalWindows),
    [isControlled, windows, internalWindows]
  );

  const [rawHighlightedIndex, setRawHighlightedIndex] = useState<number>(() =>
    findInitialHighlightedIndex(currentWindows)
  );
  const [internalActiveId, setInternalActiveId] = useState<string | null>(
    () => currentWindows.find((item) => item.active === true)?.id ?? null
  );
  const [announcement, setAnnouncement] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);

  const isEmpty = currentWindows.length === 0;
  const highlightedIndex = isEmpty
    ? -1
    : Math.min(Math.max(rawHighlightedIndex, 0), currentWindows.length - 1);
  const highlightedWindow =
    highlightedIndex >= 0 ? currentWindows[highlightedIndex] : undefined;

  const handleDismiss = useCallback(
    (reason: 'escape' | 'backdrop' | 'button') => {
      if (disabled) {
        return;
      }
      setAnnouncement(
        reason === 'escape'
          ? 'Dismissed window switcher via Escape.'
          : reason === 'backdrop'
            ? 'Dismissed window switcher via backdrop.'
            : 'Dismissed window switcher.'
      );
      onDismiss?.();
    },
    [disabled, onDismiss]
  );

  useEffect(() => {
    if (mode !== 'overlay' || !open || disabled) {
      return;
    }
    const target = listboxRef.current ?? dialogRef.current;
    target?.focus();
  }, [disabled, mode, open]);

  useEffect(() => {
    if (mode !== 'overlay' || !open || disabled) {
      return undefined;
    }
    const handleWindowKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.isComposing || event.defaultPrevented) {
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        handleDismiss('escape');
      }
    };
    window.addEventListener('keydown', handleWindowKeyDown);
    return () => window.removeEventListener('keydown', handleWindowKeyDown);
  }, [disabled, handleDismiss, mode, open]);

  const jumpToWindow = useCallback(
    (nextIndex: number) => {
      const target = currentWindows[nextIndex];
      if (!target) {
        return;
      }
      setRawHighlightedIndex(nextIndex);
      setAnnouncement(
        `Highlighted ${getDisplayAppName(target)} — ${getDisplayTitle(target)} (${nextIndex + 1} of ${currentWindows.length}).`
      );
    },
    [currentWindows]
  );

  const cycleWindow = useCallback(
    (delta: 1 | -1) => {
      if (currentWindows.length === 0) {
        return;
      }
      const nextIndex =
        (highlightedIndex + delta + currentWindows.length) %
        currentWindows.length;
      jumpToWindow(nextIndex);
    },
    [currentWindows.length, highlightedIndex, jumpToWindow]
  );

  const commitFocusWindow = useCallback(
    (target: SwitcherWindowItem, index: number) => {
      if (disabled) {
        return;
      }
      setRawHighlightedIndex(index);
      if (!isControlled) {
        setInternalActiveId(target.id);
      }
      setAnnouncement(
        `Focused ${getDisplayAppName(target)} — ${getDisplayTitle(target)}.`
      );
      onFocusWindow?.(target);
    },
    [disabled, isControlled, onFocusWindow]
  );

  const focusHighlightedWindow = useCallback(() => {
    if (highlightedWindow) {
      commitFocusWindow(highlightedWindow, highlightedIndex);
    }
  }, [commitFocusWindow, highlightedIndex, highlightedWindow]);

  const closeWindowAt = useCallback(
    (target: SwitcherWindowItem, closeIndex: number) => {
      const displayTitle = getDisplayTitle(target);
      if (!isControlled) {
        const nextWindows = currentWindows.filter(
          (item) => item.id !== target.id
        );
        setInternalWindows(nextWindows);
        if (nextWindows.length === 0) {
          setRawHighlightedIndex(-1);
        } else if (closeIndex < highlightedIndex) {
          setRawHighlightedIndex(highlightedIndex - 1);
        } else if (highlightedIndex >= nextWindows.length) {
          setRawHighlightedIndex(nextWindows.length - 1);
        }
        if (internalActiveId === target.id) {
          const fallback =
            nextWindows[Math.min(closeIndex, nextWindows.length - 1)];
          setInternalActiveId(fallback?.id ?? null);
        }
        setAnnouncement(
          nextWindows.length === 0
            ? `Closed ${displayTitle}. No active windows remaining.`
            : `Closed ${displayTitle}. ${nextWindows.length} active window${nextWindows.length === 1 ? '' : 's'} remaining.`
        );
      } else {
        setAnnouncement(`Closed ${displayTitle}.`);
      }
      onCloseWindow?.(target.id);
    },
    [
      currentWindows,
      highlightedIndex,
      internalActiveId,
      isControlled,
      onCloseWindow,
    ]
  );

  const closeHighlightedWindow = useCallback(() => {
    if (highlightedWindow) {
      closeWindowAt(highlightedWindow, highlightedIndex);
    }
  }, [closeWindowAt, highlightedIndex, highlightedWindow]);

  const handleSwitcherNavigationKey = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        handleDismiss('escape');
        return;
      }

      if (
        event.key === 'ArrowRight' ||
        (event.key === 'Tab' && !event.shiftKey)
      ) {
        event.preventDefault();
        cycleWindow(1);
      } else if (
        event.key === 'ArrowLeft' ||
        (event.key === 'Tab' && event.shiftKey)
      ) {
        event.preventDefault();
        cycleWindow(-1);
      } else if (event.key === 'Home') {
        event.preventDefault();
        jumpToWindow(0);
      } else if (event.key === 'End') {
        event.preventDefault();
        jumpToWindow(currentWindows.length - 1);
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        focusHighlightedWindow();
      } else if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        closeHighlightedWindow();
      }
    },
    [
      closeHighlightedWindow,
      currentWindows.length,
      cycleWindow,
      focusHighlightedWindow,
      handleDismiss,
      jumpToWindow,
    ]
  );

  const handleListboxKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.nativeEvent.isComposing || disabled) {
        return;
      }
      const isCloseAction =
        event.target instanceof HTMLElement &&
        event.target.closest('[data-window-action="close"]') !== null;
      if (isCloseAction) {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          handleDismiss('escape');
        }
        return;
      }
      handleSwitcherNavigationKey(event);
    },
    [disabled, handleDismiss, handleSwitcherNavigationKey]
  );

  const handleContainerKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.nativeEvent.isComposing || disabled) {
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        handleDismiss('escape');
        return;
      }
      if (event.target === event.currentTarget) {
        handleSwitcherNavigationKey(event);
      }
    },
    [disabled, handleDismiss, handleSwitcherNavigationKey]
  );

  const composedRootKeyDown = composeEventHandlers<
    ReactKeyboardEvent<HTMLDivElement>
  >(onKeyDown, handleContainerKeyDown);

  const handleBackdropClick = composeEventHandlers<
    ReactMouseEvent<HTMLDivElement>
  >(onClick, () => {
    handleDismiss('backdrop');
  });

  if (mode === 'overlay' && !open) {
    return null;
  }

  const resolvedAriaLabel = ariaLabel?.trim() || 'Window switcher';

  const merged = mergeProps({
    themeTarget: themeProps('window-switcher-overlay', {
      mode,
      open,
      disabled,
      empty: isEmpty,
      count: currentWindows.length,
    }),
    baseClassName:
      mode === 'overlay'
        ? 'fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 min-w-0'
        : 'prism-slab relative w-full max-w-full min-w-0 p-4 sm:p-5 flex flex-col gap-4 overflow-hidden',
    overrideClassName: override?.className,
    userClassName: className,
    baseStyle:
      mode === 'overlay'
        ? {
            backgroundColor:
              'color-mix(in srgb, var(--prism-bg-end) 64%, transparent)',
            backdropFilter: 'blur(var(--prism-blur-px))',
          }
        : {
            color: 'var(--prism-text-primary)',
          },
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const panelClass = stableClassName('window-switcher-overlay', 'panel');
  const headerClass = stableClassName('window-switcher-overlay', 'header');
  const stripClass = stableClassName('window-switcher-overlay', 'strip');
  const cardClass = stableClassName('window-switcher-overlay', 'card');
  const thumbnailClass = stableClassName(
    'window-switcher-overlay',
    'thumbnail'
  );
  const footerClass = stableClassName('window-switcher-overlay', 'footer');
  const emptyClass = stableClassName('window-switcher-overlay', 'empty');
  const statusClass = stableClassName('window-switcher-overlay', 'status');

  const activeOptionId =
    highlightedWindow && highlightedIndex >= 0
      ? `${baseId}-option-${highlightedIndex}`
      : undefined;

  const highlightedAppName = highlightedWindow
    ? getDisplayAppName(highlightedWindow)
    : '';
  const highlightedTitle = highlightedWindow
    ? getDisplayTitle(highlightedWindow)
    : '';

  const idleStatusText = highlightedWindow
    ? `Highlighted ${highlightedAppName} — ${highlightedTitle} (${highlightedIndex + 1} of ${currentWindows.length}).`
    : 'No active windows open.';
  const liveStatusText = announcement ?? idleStatusText;

  const switcherContent = (
    <>
      {/* Top Optical Header */}
      <header
        data-part="header"
        className={cx(
          headerClass,
          'flex flex-wrap items-center justify-between gap-2 min-w-0 max-w-full'
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            aria-hidden="true"
            className="prism-crystal w-8 h-8 rounded-xl inline-flex items-center justify-center shrink-0"
            style={{ color: 'var(--prism-primary-main)' }}
          >
            <Layers className="w-4 h-4" />
          </span>

          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <h2
              className="text-sm font-semibold tracking-[-0.01em] truncate"
              style={{ color: 'var(--prism-text-primary)' }}
            >
              Window Switcher
            </h2>
            <span
              data-testid="window-switcher-count"
              className="prism-well inline-flex items-center px-2 py-0.5 rounded-full font-mono text-[10px] font-semibold tabular-nums whitespace-nowrap shrink-0"
              style={{ color: 'var(--prism-text-secondary)' }}
            >
              {currentWindows.length} active
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <span
            className="inline-flex items-center gap-1 text-[11px] font-mono shrink-0"
            style={{ color: 'var(--prism-text-secondary)' }}
          >
            <kbd
              className="prism-crystal inline-flex items-center justify-center h-5 px-1.5 rounded-md text-[10px] font-semibold leading-none border-b"
              style={{
                color: 'var(--prism-text-primary)',
                borderBottomColor: 'var(--prism-well-border)',
              }}
            >
              Alt
            </kbd>
            <span aria-hidden="true">+</span>
            <kbd
              className="prism-crystal inline-flex items-center justify-center h-5 px-1.5 rounded-md text-[10px] font-semibold leading-none border-b"
              style={{
                color: 'var(--prism-text-primary)',
                borderBottomColor: 'var(--prism-well-border)',
              }}
            >
              Tab
            </kbd>
          </span>

          {mode === 'overlay' ? (
            <button
              type="button"
              disabled={disabled}
              aria-label="Dismiss window switcher"
              data-testid="window-switcher-dismiss"
              onClick={() => handleDismiss('button')}
              className="prism-crystal prism-focus-ring w-7 h-7 rounded-full inline-flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed transition-opacity"
              style={{ color: 'var(--prism-text-secondary)' }}
            >
              <X aria-hidden="true" className="w-3.5 h-3.5" />
            </button>
          ) : null}
        </div>
      </header>

      {/* Window Preview Strip or Empty State */}
      {isEmpty ? (
        <div
          role="status"
          data-part="empty"
          data-testid="window-switcher-empty"
          className={cx(
            emptyClass,
            'prism-well rounded-2xl px-4 py-8 text-center flex flex-col items-center justify-center gap-2 min-w-0 max-w-full'
          )}
        >
          <span
            aria-hidden="true"
            className="prism-crystal w-10 h-10 rounded-2xl inline-flex items-center justify-center"
            style={{ color: 'var(--prism-text-secondary)' }}
          >
            <AppWindow className="w-5 h-5" />
          </span>
          <p
            className="text-sm font-semibold"
            style={{ color: 'var(--prism-text-primary)' }}
          >
            No active windows
          </p>
          <p
            className="text-xs max-w-sm break-words"
            style={{ color: 'var(--prism-text-secondary)' }}
          >
            All open windows have been closed. Launch a workspace app to switch
            between active views.
          </p>
        </div>
      ) : (
        <div
          ref={listboxRef}
          role="listbox"
          aria-label="Active windows"
          aria-orientation="horizontal"
          aria-activedescendant={activeOptionId}
          aria-disabled={disabled ? 'true' : undefined}
          tabIndex={disabled ? -1 : 0}
          data-part="strip"
          data-testid="window-switcher-listbox"
          onKeyDown={handleListboxKeyDown}
          className={cx(
            stripClass,
            'prism-focus-ring w-full max-w-full min-w-0 overflow-x-auto rounded-2xl py-1 px-0.5'
          )}
        >
          <div className="flex items-stretch gap-3 min-w-max">
            {currentWindows.map((win, index) => {
              const displayAppName = getDisplayAppName(win);
              const displayTitle = getDisplayTitle(win);
              const displayWorkspace = getDisplayWorkspace(win);
              const tone: SwitcherWindowTone = win.tone ?? 'primary';
              const accentVar = getToneAccentVar(tone);
              const isHighlighted = index === highlightedIndex;
              const isActiveWindow = isControlled
                ? Boolean(win.active)
                : internalActiveId === win.id;
              const optionId = `${baseId}-option-${index}`;

              return (
                <div
                  key={win.id}
                  id={optionId}
                  role="option"
                  aria-selected={isHighlighted}
                  aria-disabled={disabled ? 'true' : undefined}
                  tabIndex={-1}
                  data-part="card"
                  data-window-id={win.id}
                  data-tone={tone}
                  data-highlighted={isHighlighted ? 'true' : undefined}
                  data-active={isActiveWindow ? 'true' : undefined}
                  onClick={() => commitFocusWindow(win, index)}
                  className={cx(
                    cardClass,
                    'relative w-52 sm:w-56 shrink-0 rounded-2xl p-2.5 flex flex-col gap-2.5 select-none transition-all duration-150',
                    isHighlighted ? 'prism-crystal' : 'prism-well',
                    disabled
                      ? 'opacity-55 cursor-not-allowed'
                      : 'cursor-pointer'
                  )}
                  style={{
                    borderWidth: isHighlighted ? '1.5px' : '1px',
                    borderStyle: 'solid',
                    borderColor: isHighlighted
                      ? accentVar
                      : 'var(--prism-divider)',
                    boxShadow: isHighlighted
                      ? `0 0 0 2px color-mix(in srgb, ${accentVar} 28%, transparent), 0 12px 24px -10px color-mix(in srgb, ${accentVar} 42%, transparent)`
                      : undefined,
                  }}
                >
                  {/* Miniature Optical Window Preview Thumbnail */}
                  <div
                    aria-hidden="true"
                    data-part="thumbnail"
                    data-tone={tone}
                    className={cx(
                      thumbnailClass,
                      'prism-well rounded-xl overflow-hidden border flex flex-col'
                    )}
                    style={{
                      borderColor: `color-mix(in srgb, ${accentVar} 34%, var(--prism-divider))`,
                    }}
                  >
                    {/* Miniature Tinted Window Titlebar */}
                    <div
                      data-part="thumbnail-header"
                      className="h-5 px-2 flex items-center justify-between gap-1.5 border-b"
                      style={{
                        background: `linear-gradient(90deg, color-mix(in srgb, ${accentVar} 26%, var(--prism-crystal-top)) 0%, color-mix(in srgb, ${accentVar} 10%, var(--prism-crystal-bottom)) 100%)`,
                        borderColor: `color-mix(in srgb, ${accentVar} 26%, var(--prism-divider))`,
                      }}
                    >
                      <span className="inline-flex items-center gap-1 shrink-0">
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: 'var(--prism-error-main)' }}
                        />
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{
                            backgroundColor: 'var(--prism-warning-main)',
                          }}
                        />
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{
                            backgroundColor: 'var(--prism-success-main)',
                          }}
                        />
                      </span>
                      <span
                        className="h-1.5 w-14 rounded-full"
                        style={{
                          backgroundColor: `color-mix(in srgb, ${accentVar} 48%, transparent)`,
                        }}
                      />
                    </div>

                    {/* Miniature Window Skeleton Viewport */}
                    <div
                      data-part="thumbnail-skeleton"
                      className="h-16 p-2 flex gap-2"
                    >
                      <div
                        className="w-7 rounded-md shrink-0 flex flex-col gap-1 p-1"
                        style={{
                          backgroundColor: `color-mix(in srgb, ${accentVar} 14%, transparent)`,
                        }}
                      >
                        <span
                          className="h-1 w-full rounded-full"
                          style={{ backgroundColor: accentVar }}
                        />
                        <span
                          className="h-1 w-4/5 rounded-full"
                          style={{
                            backgroundColor:
                              'color-mix(in srgb, var(--prism-text-secondary) 28%, transparent)',
                          }}
                        />
                        <span
                          className="h-1 w-3/5 rounded-full"
                          style={{
                            backgroundColor:
                              'color-mix(in srgb, var(--prism-text-secondary) 20%, transparent)',
                          }}
                        />
                      </div>

                      <div className="flex-1 flex flex-col justify-center gap-1.5 min-w-0">
                        {THUMBNAIL_SKELETON_LINES.map((line) => (
                          <span
                            key={line.id}
                            className={cx(
                              line.widthClass,
                              'h-1.5 rounded-full'
                            )}
                            style={{
                              backgroundColor: line.accented
                                ? `color-mix(in srgb, ${accentVar} 46%, transparent)`
                                : 'color-mix(in srgb, var(--prism-text-secondary) 24%, transparent)',
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Card Header: App Name + Quick Close Button */}
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          aria-hidden="true"
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: accentVar }}
                        />
                        <span
                          className="text-[11px] font-semibold uppercase tracking-wide truncate"
                          style={{ color: 'var(--prism-text-secondary)' }}
                        >
                          {displayAppName}
                        </span>
                      </div>
                      <span
                        className="text-xs sm:text-sm font-semibold tracking-[-0.01em] truncate"
                        style={{ color: 'var(--prism-text-primary)' }}
                      >
                        {displayTitle}
                      </span>
                    </div>

                    <button
                      type="button"
                      data-window-action="close"
                      disabled={disabled}
                      aria-label={`Close ${displayTitle}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        closeWindowAt(win, index);
                      }}
                      className="prism-crystal prism-focus-ring w-6 h-6 rounded-full inline-flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed transition-opacity"
                      style={{ color: 'var(--prism-text-secondary)' }}
                    >
                      <X aria-hidden="true" className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Card Footer: Workspace Pill & Active Indicator */}
                  <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 border-t min-w-0" style={{ borderColor: 'var(--prism-divider)' }}>
                    {displayWorkspace ? (
                      <span
                        data-part="workspace-pill"
                        className="prism-well inline-flex items-center px-2 py-0.5 rounded-full font-mono text-[10px] font-medium truncate max-w-[130px]"
                        style={{ color: 'var(--prism-text-secondary)' }}
                      >
                        {displayWorkspace}
                      </span>
                    ) : (
                      <span
                        className="font-mono text-[10px] tabular-nums"
                        style={{ color: 'var(--prism-text-secondary)' }}
                      >
                        #{index + 1}
                      </span>
                    )}

                    {isActiveWindow ? (
                      <span
                        data-part="active-badge"
                        className="inline-flex items-center px-2 py-0.5 rounded-full font-mono text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap shrink-0"
                        style={{
                          color: accentVar,
                          backgroundColor: `color-mix(in srgb, ${accentVar} 14%, transparent)`,
                        }}
                      >
                        Active
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer Telemetry Bar */}
      <footer
        data-part="footer"
        className={cx(
          footerClass,
          'pt-3 border-t flex flex-col gap-2.5 min-w-0 max-w-full'
        )}
        style={{ borderColor: 'var(--prism-divider)' }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2.5 min-w-0">
          {/* Active Highlighted Window Readout */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span
              data-testid="window-switcher-active-title"
              className="text-xs sm:text-sm font-semibold truncate min-w-0"
              style={{ color: 'var(--prism-text-primary)' }}
            >
              {highlightedWindow
                ? `${highlightedAppName} — ${highlightedTitle}`
                : 'No window selected'}
            </span>
            {highlightedWindow ? (
              <span
                className="prism-well inline-flex items-center px-2 py-0.5 rounded-full font-mono text-[10px] font-semibold tabular-nums shrink-0"
                style={{ color: 'var(--prism-text-secondary)' }}
              >
                {highlightedIndex + 1} / {currentWindows.length}
              </span>
            ) : null}
          </div>

          {/* Tactile Cycling & Focus Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={disabled || isEmpty}
              onClick={() => cycleWindow(-1)}
              className="prism-btn-secondary prism-focus-ring h-8 px-3 inline-flex items-center justify-center gap-1 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
            >
              <ChevronLeft
                aria-hidden="true"
                className="w-3.5 h-3.5 shrink-0 relative z-10"
              />
              <span className="relative z-10">Previous</span>
            </button>

            <button
              type="button"
              disabled={disabled || isEmpty}
              onClick={() => cycleWindow(1)}
              className="prism-btn-secondary prism-focus-ring h-8 px-3 inline-flex items-center justify-center gap-1 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
            >
              <span className="relative z-10">Next</span>
              <ChevronRight
                aria-hidden="true"
                className="w-3.5 h-3.5 shrink-0 relative z-10"
              />
            </button>

            <button
              type="button"
              disabled={disabled || isEmpty}
              onClick={focusHighlightedWindow}
              className="prism-btn-primary prism-focus-ring h-8 px-3.5 inline-flex items-center justify-center gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
            >
              <CornerDownLeft
                aria-hidden="true"
                className="w-3.5 h-3.5 shrink-0 relative z-10"
              />
              <span className="relative z-10">Focus Window</span>
            </button>
          </div>
        </div>

        {/* Shortcut Hint & Polite Live Status */}
        <div
          className="prism-well rounded-xl px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] min-w-0 max-w-full"
          style={{
            color: 'var(--prism-text-secondary)',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'var(--prism-well-border)',
          }}
        >
          <span
            role={isEmpty ? undefined : 'status'}
            aria-live="polite"
            aria-atomic="true"
            data-testid="window-switcher-status"
            className={cx(statusClass, 'truncate min-w-0 flex-1')}
          >
            {liveStatusText}
          </span>
          <span
            data-part="shortcut-hint"
            className="font-mono text-[10px] whitespace-nowrap shrink-0"
          >
            ←/→ or Tab Cycle · Enter Focus · Del Close · Esc Dismiss
          </span>
        </div>
      </footer>
    </>
  );

  if (mode === 'overlay') {
    return (
      <div
        ref={ref}
        data-part="backdrop"
        data-testid="window-switcher-backdrop"
        {...rest}
        {...merged}
        onClick={handleBackdropClick}
        onKeyDown={composedRootKeyDown}
      >
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={resolvedAriaLabel}
          tabIndex={-1}
          data-part="panel"
          data-testid="window-switcher-panel"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={handleContainerKeyDown}
          className={cx(
            panelClass,
            'prism-slab prism-focus-ring relative w-full max-w-4xl min-w-0 p-4 sm:p-5 flex flex-col gap-4 overflow-hidden'
          )}
          style={{ color: 'var(--prism-text-primary)' }}
        >
          {switcherContent}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      role="region"
      aria-label={resolvedAriaLabel}
      tabIndex={-1}
      {...rest}
      {...merged}
      onClick={onClick}
      onKeyDown={composedRootKeyDown}
    >
      {switcherContent}
    </div>
  );
}

WindowSwitcherOverlay.displayName = 'WindowSwitcherOverlay';
