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
  ArrowRightLeft,
  GripVertical,
  Monitor,
  Plus,
  X,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';

export type VirtualDesktopWindowTone =
  | 'primary'
  | 'info'
  | 'emerald'
  | 'amber';

export interface VirtualDesktopWindow {
  /** Stable unique identifier for the window. */
  id: string;
  /** Human-readable window title displayed in miniature previews and the transfer strip. */
  title: string;
  /** Optional semantic optical tone for the window pill accent. */
  tone?: VirtualDesktopWindowTone;
}

export interface VirtualDesktopSpace {
  /** Stable unique identifier for the virtual desktop workspace. */
  id: string;
  /** Workspace label shown on the preview card and transfer controls. */
  name: string;
  /** Windows currently residing inside this virtual desktop workspace. */
  windows: ReadonlyArray<VirtualDesktopWindow>;
}

type VirtualDesktopBarBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface VirtualDesktopBarProps extends VirtualDesktopBarBaseProps {
  /** Optional heading rendered in the top optical crystal bar header. */
  title?: string;
  /** Controlled ordered list of virtual desktop workspaces. */
  spaces?: ReadonlyArray<VirtualDesktopSpace>;
  /** Initial workspaces when operating in uncontrolled mode. */
  defaultSpaces?: ReadonlyArray<VirtualDesktopSpace>;
  /** Controlled active workspace identifier. */
  activeSpaceId?: string;
  /** Initial active workspace identifier when operating in uncontrolled mode. */
  defaultActiveSpaceId?: string;
  /** Maximum number of virtual desktop workspaces allowed (defaults to `6`, minimum `1`). */
  maxSpaces?: number;
  /** Callback fired whenever the active workspace changes via click, keyboard, creation, or close fallback. */
  onSelectSpace?: (spaceId: string) => void;
  /** Callback fired whenever workspaces are created, closed, or have windows transferred. */
  onSpacesChange?: (nextSpaces: ReadonlyArray<VirtualDesktopSpace>) => void;
  /** Callback fired whenever a window is transferred from one workspace to another. */
  onMoveWindow?: (
    windowId: string,
    fromSpaceId: string,
    toSpaceId: string
  ) => void;
  /** Disables workspace switching, creation, closing, drag-and-drop, and window transfer selects. */
  disabled?: boolean;
}

interface WindowToneTokens {
  accent: string;
  background: string;
  border: string;
}

interface DraggedWindowState {
  windowId: string;
  fromSpaceId: string;
}

const DND_MIME_TYPE = 'application/x-refractor-virtual-desktop-window';
const DEFAULT_MAX_SPACES = 6;

const DEFAULT_VIRTUAL_SPACES: ReadonlyArray<VirtualDesktopSpace> = [
  {
    id: 'desktop-1',
    name: 'Desktop 1 · Design',
    windows: [
      { id: 'win-optics-canvas', title: 'OpticsCanvas.fig', tone: 'primary' },
      { id: 'win-token-inspector', title: 'Token Inspector', tone: 'info' },
    ],
  },
  {
    id: 'desktop-2',
    name: 'Desktop 2 · Code',
    windows: [
      { id: 'win-refractor-ide', title: 'Refractor IDE', tone: 'emerald' },
      { id: 'win-terminal-mux', title: 'Terminal Mux', tone: 'amber' },
    ],
  },
  {
    id: 'desktop-3',
    name: 'Desktop 3 · Telemetry',
    windows: [
      { id: 'win-gpu-profiler', title: 'GPU Profiler', tone: 'info' },
    ],
  },
];

function normalizeMaxSpaces(maxSpaces: number | undefined): number {
  if (typeof maxSpaces !== 'number' || !Number.isFinite(maxSpaces)) {
    return DEFAULT_MAX_SPACES;
  }
  return Math.max(1, Math.floor(maxSpaces));
}

function dedupeSpaces(
  list: ReadonlyArray<VirtualDesktopSpace> | undefined
): VirtualDesktopSpace[] {
  if (!list || list.length === 0) {
    return [];
  }
  const seenSpaceIds = new Set<string>();
  const seenWindowIds = new Set<string>();
  const normalized: VirtualDesktopSpace[] = [];

  for (const space of list) {
    if (seenSpaceIds.has(space.id)) {
      continue;
    }
    seenSpaceIds.add(space.id);

    const uniqueWindows: VirtualDesktopWindow[] = [];
    for (const win of space.windows) {
      if (!seenWindowIds.has(win.id)) {
        seenWindowIds.add(win.id);
        uniqueWindows.push(win);
      }
    }

    normalized.push({
      id: space.id,
      name: space.name,
      windows: uniqueWindows,
    });
  }

  return normalized;
}

function getSpaceName(space: VirtualDesktopSpace): string {
  return space.name.trim() || 'Untitled Desktop';
}

function getWindowTitle(win: VirtualDesktopWindow): string {
  return win.title.trim() || 'Untitled Window';
}

function formatCount(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function createCollisionSafeSpace(
  existingSpaces: ReadonlyArray<VirtualDesktopSpace>
): VirtualDesktopSpace {
  const usedIds = new Set<string>();
  const usedNames = new Set<string>();

  for (const space of existingSpaces) {
    usedIds.add(space.id);
    usedNames.add(getSpaceName(space));
  }

  let index = 1;
  while (
    usedIds.has(`desktop-${index}`) ||
    usedNames.has(`Desktop ${index}`)
  ) {
    index += 1;
  }

  return {
    id: `desktop-${index}`,
    name: `Desktop ${index}`,
    windows: [],
  };
}

function getWindowToneTokens(
  tone: VirtualDesktopWindowTone | undefined
): WindowToneTokens {
  switch (tone) {
    case 'info':
      return {
        accent: 'var(--prism-info-main)',
        background:
          'color-mix(in srgb, var(--prism-info-main) 16%, transparent)',
        border:
          'color-mix(in srgb, var(--prism-info-main) 34%, var(--prism-divider))',
      };
    case 'emerald':
      return {
        accent: 'var(--prism-success-main)',
        background:
          'color-mix(in srgb, var(--prism-success-main) 16%, transparent)',
        border:
          'color-mix(in srgb, var(--prism-success-main) 34%, var(--prism-divider))',
      };
    case 'amber':
      return {
        accent: 'var(--prism-warning-main)',
        background:
          'color-mix(in srgb, var(--prism-warning-main) 18%, transparent)',
        border:
          'color-mix(in srgb, var(--prism-warning-main) 36%, var(--prism-divider))',
      };
    case 'primary':
    default:
      return {
        accent: 'var(--prism-primary-main)',
        background:
          'color-mix(in srgb, var(--prism-primary-main) 16%, transparent)',
        border:
          'color-mix(in srgb, var(--prism-primary-main) 34%, var(--prism-divider))',
      };
  }
}

export function VirtualDesktopBar({
  title = 'Virtual Desktops',
  spaces,
  defaultSpaces,
  activeSpaceId,
  defaultActiveSpaceId,
  maxSpaces = DEFAULT_MAX_SPACES,
  onSelectSpace,
  onSpacesChange,
  onMoveWindow,
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: VirtualDesktopBarProps) {
  const baseId = useId();
  const override = useComponentOverride('VirtualDesktopBar');

  const resolvedMaxSpaces = normalizeMaxSpaces(maxSpaces);
  const headingTitle = title.trim() || 'Virtual Desktops';
  const isSpacesControlled = spaces !== undefined;
  const isActiveControlled = activeSpaceId !== undefined;

  const [internalSpaces, setInternalSpaces] = useState<VirtualDesktopSpace[]>(
    () =>
      defaultSpaces !== undefined
        ? dedupeSpaces(defaultSpaces)
        : dedupeSpaces(DEFAULT_VIRTUAL_SPACES)
  );

  const currentSpaces = useMemo(
    () => (isSpacesControlled ? dedupeSpaces(spaces) : internalSpaces),
    [isSpacesControlled, spaces, internalSpaces]
  );

  const [internalActiveSpaceId, setInternalActiveSpaceId] = useState<string>(
    () => defaultActiveSpaceId ?? currentSpaces[0]?.id ?? ''
  );
  const [draggedWindow, setDraggedWindow] =
    useState<DraggedWindowState | null>(null);
  const [dropTargetSpaceId, setDropTargetSpaceId] = useState<string | null>(
    null
  );
  const [announcement, setAnnouncement] = useState('');

  const spaceButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const pendingFocusSpaceIdRef = useRef<string | null>(null);

  const effectiveActiveId = isActiveControlled
    ? activeSpaceId
    : internalActiveSpaceId;

  const activeSpace = useMemo(
    () =>
      currentSpaces.find((space) => space.id === effectiveActiveId) ??
      currentSpaces[0],
    [currentSpaces, effectiveActiveId]
  );
  const resolvedActiveSpaceId = activeSpace?.id ?? '';

  const totalWindows = useMemo(
    () => currentSpaces.reduce((sum, space) => sum + space.windows.length, 0),
    [currentSpaces]
  );

  const atMaxSpaces = currentSpaces.length >= resolvedMaxSpaces;
  const canCloseSpaces = currentSpaces.length > 1;

  useEffect(() => {
    const pendingId = pendingFocusSpaceIdRef.current;
    if (pendingId) {
      pendingFocusSpaceIdRef.current = null;
      spaceButtonRefs.current.get(pendingId)?.focus();
    }
  }, [currentSpaces, resolvedActiveSpaceId]);

  const commitSpaces = useCallback(
    (nextSpaces: VirtualDesktopSpace[]) => {
      if (!isSpacesControlled) {
        setInternalSpaces(nextSpaces);
      }
      onSpacesChange?.(nextSpaces);
    },
    [isSpacesControlled, onSpacesChange]
  );

  const selectSpace = useCallback(
    (spaceId: string) => {
      if (!isActiveControlled) {
        setInternalActiveSpaceId(spaceId);
      }
      onSelectSpace?.(spaceId);
    },
    [isActiveControlled, onSelectSpace]
  );

  const handleSelectSpace = useCallback(
    (space: VirtualDesktopSpace) => {
      if (disabled) {
        return;
      }
      selectSpace(space.id);
      setAnnouncement(
        `Switched to ${getSpaceName(space)} (${formatCount(space.windows.length, 'window', 'windows')})`
      );
    },
    [disabled, selectSpace]
  );

  const handleAddSpace = useCallback(() => {
    const created = createCollisionSafeSpace(currentSpaces);
    const nextSpaces = [...currentSpaces, created];
    commitSpaces(nextSpaces);
    selectSpace(created.id);
    setAnnouncement(`Created workspace ${created.name}`);
  }, [commitSpaces, currentSpaces, selectSpace]);

  const handleCloseSpace = useCallback(
    (space: VirtualDesktopSpace, index: number) => {
      const remaining = currentSpaces.filter((item) => item.id !== space.id);
      const fallbackSpace = remaining[Math.max(0, index - 1)];
      const rescuedWindows = space.windows;
      const nextSpaces =
        fallbackSpace && rescuedWindows.length > 0
          ? remaining.map((item) =>
              item.id === fallbackSpace.id
                ? { ...item, windows: [...item.windows, ...rescuedWindows] }
                : item
            )
          : remaining;

      commitSpaces(nextSpaces);

      if (space.id === resolvedActiveSpaceId && fallbackSpace) {
        pendingFocusSpaceIdRef.current = fallbackSpace.id;
        selectSpace(fallbackSpace.id);
      }

      const closedName = getSpaceName(space);
      setAnnouncement(
        fallbackSpace && rescuedWindows.length > 0
          ? `Closed ${closedName} and moved ${formatCount(rescuedWindows.length, 'window', 'windows')} to ${getSpaceName(fallbackSpace)}`
          : `Closed ${closedName}`
      );
    },
    [commitSpaces, currentSpaces, resolvedActiveSpaceId, selectSpace]
  );

  const moveWindow = useCallback(
    (windowId: string, fromSpaceId: string, toSpaceId: string) => {
      if (disabled || fromSpaceId === toSpaceId) {
        return;
      }

      const sourceSpace = currentSpaces.find((item) => item.id === fromSpaceId);
      const targetSpace = currentSpaces.find((item) => item.id === toSpaceId);
      const movedWindow = sourceSpace?.windows.find(
        (win) => win.id === windowId
      );

      if (!sourceSpace || !targetSpace || !movedWindow) {
        return;
      }

      const nextSpaces = currentSpaces.map((item) => {
        if (item.id === fromSpaceId) {
          return {
            ...item,
            windows: item.windows.filter((win) => win.id !== windowId),
          };
        }
        if (item.id === toSpaceId) {
          return {
            ...item,
            windows: [...item.windows, movedWindow],
          };
        }
        return item;
      });

      commitSpaces(nextSpaces);
      onMoveWindow?.(windowId, fromSpaceId, toSpaceId);
      setAnnouncement(
        `Moved ${getWindowTitle(movedWindow)} from ${getSpaceName(sourceSpace)} to ${getSpaceName(targetSpace)}`
      );
    },
    [commitSpaces, currentSpaces, disabled, onMoveWindow]
  );

  const handleSpaceKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
      if (
        event.nativeEvent.isComposing ||
        disabled ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey
      ) {
        return;
      }

      let nextIndex: number | null = null;
      if (event.key === 'ArrowRight') {
        nextIndex = (index + 1) % currentSpaces.length;
      } else if (event.key === 'ArrowLeft') {
        nextIndex = (index - 1 + currentSpaces.length) % currentSpaces.length;
      } else if (event.key === 'Home') {
        nextIndex = 0;
      } else if (event.key === 'End') {
        nextIndex = currentSpaces.length - 1;
      }

      const targetSpace =
        nextIndex !== null ? currentSpaces[nextIndex] : undefined;
      if (targetSpace) {
        event.preventDefault();
        pendingFocusSpaceIdRef.current = targetSpace.id;
        handleSelectSpace(targetSpace);
        spaceButtonRefs.current.get(targetSpace.id)?.focus();
      }
    },
    [currentSpaces, disabled, handleSelectSpace]
  );

  const handleWindowDragStart = useCallback(
    (
      event: ReactDragEvent<HTMLDivElement>,
      win: VirtualDesktopWindow,
      fromSpaceId: string
    ) => {
      if (disabled) {
        event.preventDefault();
        return;
      }
      setDraggedWindow({ windowId: win.id, fromSpaceId });
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData(DND_MIME_TYPE, win.id);
        event.dataTransfer.setData('text/plain', win.id);
      }
    },
    [disabled]
  );

  const handleSpaceDragOver = useCallback(
    (event: ReactDragEvent<HTMLDivElement>, spaceId: string) => {
      if (disabled) {
        return;
      }
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
      }
      setDropTargetSpaceId(spaceId);
    },
    [disabled]
  );

  const handleSpaceDragLeave = useCallback(
    (event: ReactDragEvent<HTMLDivElement>, spaceId: string) => {
      const related = event.relatedTarget;
      if (
        !(related instanceof Node) ||
        !event.currentTarget.contains(related)
      ) {
        setDropTargetSpaceId((prev) => (prev === spaceId ? null : prev));
      }
    },
    []
  );

  const handleSpaceDrop = useCallback(
    (event: ReactDragEvent<HTMLDivElement>, targetSpaceId: string) => {
      if (disabled) {
        return;
      }
      event.preventDefault();

      let transferredWindowId = draggedWindow?.windowId ?? '';
      if (event.dataTransfer) {
        const customId = event.dataTransfer.getData(DND_MIME_TYPE);
        const plainId = event.dataTransfer.getData('text/plain').trim();
        if (customId) {
          transferredWindowId = customId;
        } else if (plainId) {
          transferredWindowId = plainId;
        }
      }

      setDraggedWindow(null);
      setDropTargetSpaceId(null);

      if (!transferredWindowId) {
        return;
      }

      const sourceSpace = currentSpaces.find((space) =>
        space.windows.some((win) => win.id === transferredWindowId)
      );
      if (!sourceSpace) {
        return;
      }

      moveWindow(transferredWindowId, sourceSpace.id, targetSpaceId);
    },
    [currentSpaces, disabled, draggedWindow, moveWindow]
  );

  const handleWindowDragEnd = useCallback(() => {
    setDraggedWindow(null);
    setDropTargetSpaceId(null);
  }, []);

  const merged = mergeProps({
    themeTarget: themeProps('virtual-desktop-bar', {
      disabled,
      empty: currentSpaces.length === 0,
      atMaxSpaces,
      spaceCount: currentSpaces.length,
      windowCount: totalWindows,
    }),
    baseClassName:
      'prism-slab relative flex flex-col overflow-hidden w-full max-w-full min-w-0 transition-opacity',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('virtual-desktop-bar', 'header');
  const tablistClass = stableClassName('virtual-desktop-bar', 'tablist');
  const cardClass = stableClassName('virtual-desktop-bar', 'space-card');
  const windowPillClass = stableClassName('virtual-desktop-bar', 'mini-window');
  const transferClass = stableClassName(
    'virtual-desktop-bar',
    'transfer-strip'
  );
  const addButtonClass = stableClassName('virtual-desktop-bar', 'add-button');
  const statusBarClass = stableClassName('virtual-desktop-bar', 'status-bar');

  const panelId = `${baseId}-panel`;
  const activeSpaceName = activeSpace ? getSpaceName(activeSpace) : '';
  const activeSpaceTabId = activeSpace
    ? `${baseId}-space-${activeSpace.id}`
    : undefined;

  const idleStatusText = activeSpace
    ? `Active: ${activeSpaceName} (${formatCount(activeSpace.windows.length, 'window', 'windows')}) · ${formatCount(currentSpaces.length, 'desktop', 'desktops')}, ${formatCount(totalWindows, 'window', 'windows')} total`
    : 'No virtual desktops open';

  return (
    <div
      ref={ref}
      role="region"
      aria-label={headingTitle}
      {...rest}
      {...merged}
    >
      <header
        data-part="header"
        className={cx(
          headerClass,
          'prism-crystal relative flex flex-wrap items-center justify-between gap-2.5 px-3.5 py-2.5 border-b min-w-0 max-w-full'
        )}
        style={{ borderColor: 'var(--prism-divider)' }}
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

        <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
          <span
            aria-hidden="true"
            className="prism-well w-7 h-7 rounded-xl inline-flex items-center justify-center shrink-0"
            style={{ color: 'var(--prism-primary-main)' }}
          >
            <Monitor className="w-4 h-4" />
          </span>

          <h2
            data-part="title"
            className="text-sm font-semibold truncate min-w-0"
            style={{ color: 'var(--prism-text-primary)' }}
          >
            {headingTitle}
          </h2>

          {activeSpace ? (
            <span
              data-part="active-badge"
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium max-w-full min-w-0 border"
              style={{
                color: 'var(--prism-primary-main)',
                backgroundColor:
                  'color-mix(in srgb, var(--prism-primary-main) 14%, transparent)',
                borderColor:
                  'color-mix(in srgb, var(--prism-primary-main) 30%, var(--prism-divider))',
              }}
            >
              <span
                aria-hidden="true"
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: 'var(--prism-primary-main)' }}
              />
              <span className="truncate">{activeSpaceName}</span>
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0 min-w-0">
          <span
            data-part="summary-counts"
            className="prism-well px-2.5 py-1 rounded-full text-[11px] font-mono tabular-nums whitespace-nowrap"
            style={{ color: 'var(--prism-text-secondary)' }}
          >
            {currentSpaces.length} / {resolvedMaxSpaces} desktops ·{' '}
            {formatCount(totalWindows, 'window', 'windows')}
          </span>

          <button
            type="button"
            data-part="add-space"
            data-at-max={atMaxSpaces ? 'true' : undefined}
            disabled={disabled || atMaxSpaces}
            onClick={handleAddSpace}
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
            <span>New Desktop</span>
          </button>
        </div>
      </header>

      <div
        data-part="spaces-scroll"
        className="w-full max-w-full min-w-0 overflow-x-auto px-3.5 py-3 border-b"
        style={{ borderColor: 'var(--prism-divider)' }}
      >
        <div
          role="tablist"
          aria-label="Virtual desktops"
          aria-orientation="horizontal"
          className={cx(
            tablistClass,
            'inline-flex items-stretch gap-3 min-w-max py-0.5'
          )}
        >
          {currentSpaces.map((space, index) => {
            const spaceName = getSpaceName(space);
            const isActive = space.id === resolvedActiveSpaceId;
            const isDropTarget =
              dropTargetSpaceId === space.id &&
              draggedWindow?.fromSpaceId !== space.id;

            return (
              <div
                key={space.id}
                role="presentation"
                data-part="space-card"
                data-space-id={space.id}
                data-active={isActive ? 'true' : undefined}
                data-drop-target={isDropTarget ? 'true' : undefined}
                onDragOver={(event) => handleSpaceDragOver(event, space.id)}
                onDragLeave={(event) => handleSpaceDragLeave(event, space.id)}
                onDrop={(event) => handleSpaceDrop(event, space.id)}
                className={cx(
                  cardClass,
                  'prism-crystal relative flex flex-col gap-2 w-52 sm:w-56 rounded-2xl border p-2.5 shrink-0 transition-all',
                  disabled ? 'opacity-60' : ''
                )}
                style={{
                  borderColor: isDropTarget
                    ? 'var(--prism-focus-ring)'
                    : isActive
                      ? 'var(--prism-primary-main)'
                      : 'var(--prism-divider)',
                  boxShadow: isActive
                    ? '0 0 0 1px var(--prism-primary-main), 0 8px 20px -10px color-mix(in srgb, var(--prism-primary-main) 45%, transparent)'
                    : undefined,
                  outline: isDropTarget
                    ? '2px solid var(--prism-focus-ring)'
                    : undefined,
                  outlineOffset: isDropTarget ? '2px' : undefined,
                }}
              >
                <div
                  data-part="mini-canvas"
                  onClick={() => handleSelectSpace(space)}
                  className={cx(
                    'prism-well relative rounded-xl p-2 min-h-[82px] flex flex-col gap-1.5 border min-w-0',
                    disabled ? 'cursor-not-allowed' : 'cursor-pointer'
                  )}
                  style={{
                    borderColor: isDropTarget
                      ? 'var(--prism-focus-ring)'
                      : 'var(--prism-divider)',
                  }}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span
                      aria-hidden="true"
                      className="inline-flex items-center gap-1"
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          backgroundColor: isActive
                            ? 'var(--prism-primary-main)'
                            : 'var(--prism-divider)',
                        }}
                      />
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: 'var(--prism-divider)' }}
                      />
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: 'var(--prism-divider)' }}
                      />
                    </span>
                    <span
                      className="text-[10px] font-mono tabular-nums"
                      style={{ color: 'var(--prism-text-secondary)' }}
                    >
                      #{index + 1}
                    </span>
                  </div>

                  {space.windows.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 min-w-0">
                      {space.windows.map((win) => {
                        const winTitle = getWindowTitle(win);
                        const toneTokens = getWindowToneTokens(win.tone);
                        const isDraggingWin =
                          draggedWindow?.windowId === win.id;

                        return (
                          <div
                            key={win.id}
                            data-part="mini-window"
                            data-window-id={win.id}
                            data-space-id={space.id}
                            data-tone={win.tone ?? 'primary'}
                            data-dragging={isDraggingWin ? 'true' : undefined}
                            draggable={!disabled}
                            onDragStart={(event) =>
                              handleWindowDragStart(event, win, space.id)
                            }
                            onDragEnd={handleWindowDragEnd}
                            className={cx(
                              windowPillClass,
                              'inline-flex items-center gap-1 max-w-full rounded-lg border px-1.5 py-1 text-[11px] font-medium select-none transition-all',
                              disabled
                                ? 'cursor-not-allowed opacity-70'
                                : 'cursor-grab active:cursor-grabbing',
                              isDraggingWin ? 'opacity-50 scale-95' : ''
                            )}
                            style={{
                              backgroundColor: toneTokens.background,
                              borderColor: toneTokens.border,
                              color: 'var(--prism-text-primary)',
                            }}
                          >
                            <GripVertical
                              aria-hidden="true"
                              className="w-2.5 h-2.5 shrink-0 opacity-60"
                            />
                            <span
                              aria-hidden="true"
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: toneTokens.accent }}
                            />
                            <span className="truncate">{winTitle}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <span
                      data-part="empty-canvas"
                      className="text-[11px] italic my-auto self-center"
                      style={{ color: 'var(--prism-text-secondary)' }}
                    >
                      {isDropTarget ? 'Drop window here' : 'Empty desktop'}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-1.5 min-w-0">
                  <button
                    ref={(node) => {
                      if (node) {
                        spaceButtonRefs.current.set(space.id, node);
                      } else {
                        spaceButtonRefs.current.delete(space.id);
                      }
                    }}
                    id={`${baseId}-space-${space.id}`}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-controls={panelId}
                    tabIndex={disabled ? -1 : isActive ? 0 : -1}
                    disabled={disabled}
                    onClick={() => handleSelectSpace(space)}
                    onKeyDown={(event) => handleSpaceKeyDown(event, index)}
                    className="prism-focus-ring flex-1 min-w-0 inline-flex items-center justify-between gap-1.5 rounded-lg px-1.5 py-1 text-left text-xs cursor-pointer disabled:cursor-not-allowed transition-colors"
                    style={{
                      color: isActive
                        ? 'var(--prism-text-primary)'
                        : 'var(--prism-text-secondary)',
                      fontWeight: isActive ? 600 : 500,
                    }}
                  >
                    <span className="inline-flex items-center gap-1.5 min-w-0">
                      {isActive ? (
                        <span
                          data-part="active-dot"
                          aria-hidden="true"
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{
                            backgroundColor: 'var(--prism-primary-main)',
                          }}
                        />
                      ) : null}
                      <span className="truncate">{spaceName}</span>
                    </span>

                    <span
                      data-part="space-window-count"
                      className="prism-well px-1.5 py-0.5 rounded-full text-[10px] font-mono tabular-nums shrink-0"
                      style={{
                        color: isActive
                          ? 'var(--prism-primary-main)'
                          : 'var(--prism-text-secondary)',
                      }}
                    >
                      {space.windows.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    data-part="close-space"
                    disabled={disabled || !canCloseSpaces}
                    aria-label={`Close ${spaceName}`}
                    onClick={() => handleCloseSpace(space, index)}
                    className="prism-focus-ring w-6 h-6 rounded-lg inline-flex items-center justify-center shrink-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-35 transition-opacity enabled:hover:opacity-100 opacity-75"
                    style={{ color: 'var(--prism-text-secondary)' }}
                  >
                    <X aria-hidden="true" className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div
        id={panelId}
        role="tabpanel"
        aria-labelledby={activeSpaceTabId}
        data-part="transfer-strip"
        className={cx(
          transferClass,
          'px-3.5 py-3 flex flex-col gap-2.5 min-w-0 max-w-full'
        )}
      >
        {activeSpace ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
              <div
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider min-w-0"
                style={{ color: 'var(--prism-text-secondary)' }}
              >
                <AppWindow aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Windows in {activeSpaceName}</span>
              </div>
              <span
                className="text-[11px] font-mono tabular-nums shrink-0"
                style={{ color: 'var(--prism-text-secondary)' }}
              >
                {formatCount(activeSpace.windows.length, 'window', 'windows')}
              </span>
            </div>

            {activeSpace.windows.length > 0 ? (
              <div className="flex flex-col gap-1.5 min-w-0 max-w-full">
                {activeSpace.windows.map((win) => {
                  const winTitle = getWindowTitle(win);
                  const toneTokens = getWindowToneTokens(win.tone);

                  return (
                    <div
                      key={win.id}
                      data-part="transfer-row"
                      data-window-id={win.id}
                      className="prism-well rounded-xl px-2.5 py-2 flex flex-wrap items-center justify-between gap-2 min-w-0 max-w-full border"
                      style={{ borderColor: 'var(--prism-divider)' }}
                    >
                      <div className="inline-flex items-center gap-2 min-w-0 flex-1">
                        <span
                          aria-hidden="true"
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: toneTokens.accent }}
                        />
                        <span
                          className="text-xs font-medium truncate"
                          style={{ color: 'var(--prism-text-primary)' }}
                        >
                          {winTitle}
                        </span>
                      </div>

                      <div className="inline-flex items-center gap-1.5 shrink-0 max-w-full">
                        <ArrowRightLeft
                          aria-hidden="true"
                          className="w-3.5 h-3.5 shrink-0"
                          style={{ color: 'var(--prism-text-secondary)' }}
                        />
                        <select
                          data-part="window-transfer-select"
                          aria-label={`Move ${winTitle} to`}
                          value={activeSpace.id}
                          disabled={disabled || !canCloseSpaces}
                          onChange={(event) =>
                            moveWindow(
                              win.id,
                              activeSpace.id,
                              event.target.value
                            )
                          }
                          className="prism-crystal prism-focus-ring h-7 max-w-[200px] rounded-lg border px-2 text-xs font-medium cursor-pointer disabled:cursor-not-allowed disabled:opacity-45"
                          style={{
                            color: 'var(--prism-text-primary)',
                            borderColor: 'var(--prism-divider)',
                          }}
                        >
                          {currentSpaces.map((target) => {
                            const targetName = getSpaceName(target);
                            return (
                              <option key={target.id} value={target.id}>
                                {target.id === activeSpace.id
                                  ? `${targetName} (Current)`
                                  : targetName}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div
                data-part="empty-transfer"
                className="prism-well rounded-xl px-3 py-4 text-center text-xs min-w-0"
                style={{ color: 'var(--prism-text-secondary)' }}
              >
                No windows in {activeSpaceName}. Drag a window onto this desktop
                or switch workspaces to transfer one here.
              </div>
            )}
          </>
        ) : (
          <div
            data-part="empty-spaces"
            className="prism-well rounded-xl px-3 py-4 text-center text-xs min-w-0"
            style={{ color: 'var(--prism-text-secondary)' }}
          >
            No virtual desktops open. Select New Desktop to create a workspace.
          </div>
        )}
      </div>

      <div
        data-part="status-bar"
        role="status"
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
          ←/→ Switch · Drag or Select to Move
        </span>
      </div>
    </div>
  );
}

VirtualDesktopBar.displayName = 'VirtualDesktopBar';
