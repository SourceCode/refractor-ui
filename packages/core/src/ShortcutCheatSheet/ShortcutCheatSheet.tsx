'use client';

import {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { Keyboard, Search, X } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { STYLE_BORDER_DIVIDER, STYLE_BORDER_DIVIDER_TEXT_SECONDARY, STYLE_PRIMARY_MAIN, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export type ShortcutDisplayMode = 'modal' | 'inline';

export interface ShortcutBinding {
  /** Stable unique identifier for this shortcut binding. */
  id: string;
  /** Human-readable action label displayed alongside the key chord. */
  label: string;
  /** Ordered physical key labels rendered as tactile embossed optical <kbd> keycaps. */
  keys: ReadonlyArray<string>;
  /** Optional concise description displayed beneath the action label and included in search filtering. */
  description?: string;
}

export interface ShortcutCategoryGroup {
  /** Stable unique identifier for this shortcut category. */
  id: string;
  /** Category heading displayed above the group's shortcut list. */
  title: string;
  /** Keyboard shortcut bindings belonging to this category. */
  shortcuts: ReadonlyArray<ShortcutBinding>;
}

export interface ShortcutCheatSheetProps extends BaseProps<HTMLDivElement> {
  /** Categorized hotkey groups (defaults to Navigation, Editing & Canvas, and Playback & View). */
  groups?: ReadonlyArray<ShortcutCategoryGroup>;
  /** Presentation mode: `'modal'` renders a crystal trigger button + backdrop dialog; `'inline'` embeds the cheat sheet slab directly. */
  mode?: ShortcutDisplayMode;
  /** Controlled open state when `mode="modal"`. */
  open?: boolean;
  /** Initial uncontrolled open state when `mode="modal"` (defaults to `false`). */
  defaultOpen?: boolean;
  /** Callback invoked whenever the modal open state changes. */
  onOpenChange?: (open: boolean) => void;
  /** Enables pressing `?` outside editable inputs to toggle modal mode (defaults to `true`). */
  enableQuestionMarkHotkey?: boolean;
  /** Heading rendered at the top of the cheat sheet surface (defaults to `'Keyboard Shortcuts'`). */
  title?: string;
  /** Optional callback fired when a user clicks or keyboard-activates a shortcut item. */
  onSelectShortcut?: (shortcut: ShortcutBinding) => void;
}

interface NormalizedKeyToken {
  uniqueKey: string;
  label: string;
}

interface NormalizedShortcutEntry {
  uniqueKey: string;
  binding: ShortcutBinding;
  keys: ReadonlyArray<NormalizedKeyToken>;
  searchableText: string;
}

interface NormalizedGroupEntry {
  uniqueKey: string;
  id: string;
  title: string;
  titleLower: string;
  shortcuts: ReadonlyArray<NormalizedShortcutEntry>;
}

export const DEFAULT_SHORTCUT_GROUPS: ReadonlyArray<ShortcutCategoryGroup> = [
  {
    id: 'navigation',
    title: 'Navigation',
    shortcuts: [
      {
        id: 'nav-command-palette',
        label: 'Open Command Palette',
        keys: ['⌘', 'K'],
        description: 'Jump to commands, workspaces, and views',
      },
      {
        id: 'nav-quick-switch',
        label: 'Quick Switch File',
        keys: ['⌘', 'P'],
        description: 'Search and open any file in the project',
      },
      {
        id: 'nav-toggle-sidebar',
        label: 'Toggle Navigation Rail',
        keys: ['⌘', '\\'],
        description: 'Collapse or expand the primary sidebar',
      },
      {
        id: 'nav-shortcut-sheet',
        label: 'Toggle Shortcut Cheat Sheet',
        keys: ['?'],
        description: 'Show or dismiss this keyboard reference',
      },
    ],
  },
  {
    id: 'editing-canvas',
    title: 'Editing & Canvas',
    shortcuts: [
      {
        id: 'edit-undo',
        label: 'Undo Last Action',
        keys: ['⌘', 'Z'],
        description: 'Revert the previous canvas modification',
      },
      {
        id: 'edit-redo',
        label: 'Redo Action',
        keys: ['⌘', 'Shift', 'Z'],
        description: 'Re-apply the most recently undone edit',
      },
      {
        id: 'edit-duplicate',
        label: 'Duplicate Selection',
        keys: ['⌘', 'D'],
        description: 'Clone the currently selected layers in place',
      },
      {
        id: 'edit-group',
        label: 'Group Selected Layers',
        keys: ['⌘', 'G'],
        description: 'Bundle selected nodes into a shared container',
      },
    ],
  },
  {
    id: 'playback-view',
    title: 'Playback & View',
    shortcuts: [
      {
        id: 'view-play-pause',
        label: 'Play / Pause Timeline',
        keys: ['Space'],
        description: 'Toggle real-time preview transport playback',
      },
      {
        id: 'view-zoom-in',
        label: 'Zoom In Viewport',
        keys: ['⌘', '+'],
        description: 'Increase optical canvas magnification',
      },
      {
        id: 'view-zoom-fit',
        label: 'Zoom to Fit Canvas',
        keys: ['Shift', '1'],
        description: 'Center and fit the active artboard on screen',
      },
      {
        id: 'view-focus-mode',
        label: 'Toggle Focus Mode',
        keys: ['F'],
        description: 'Hide peripheral panels and inspector chrome',
      },
    ],
  },
];

function isEditableElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tagName = target.tagName.toUpperCase();
  if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') {
    return true;
  }
  if (target.isContentEditable) {
    return true;
  }
  const attr = target.getAttribute('contenteditable');
  if (attr !== null && attr.toLowerCase() !== 'false') {
    return true;
  }
  return target.closest('[contenteditable]:not([contenteditable="false"])') !== null;
}

function normalizeShortcutGroups(
  sourceGroups: ReadonlyArray<ShortcutCategoryGroup>
): ReadonlyArray<NormalizedGroupEntry> {
  const groupCounts = new Map<string, number>();
  const normalizedGroups: NormalizedGroupEntry[] = [];

  for (const group of sourceGroups) {
    const groupOccurrence = (groupCounts.get(group.id) ?? 0) + 1;
    groupCounts.set(group.id, groupOccurrence);
    const groupKey = `${group.id}::${groupOccurrence}`;

    const shortcutCounts = new Map<string, number>();
    const normalizedShortcuts: NormalizedShortcutEntry[] = [];

    for (const shortcut of group.shortcuts) {
      const shortcutOccurrence = (shortcutCounts.get(shortcut.id) ?? 0) + 1;
      shortcutCounts.set(shortcut.id, shortcutOccurrence);

      const keyCounts = new Map<string, number>();
      const normalizedKeys: NormalizedKeyToken[] = [];
      for (const rawKey of shortcut.keys) {
        const trimmedKey = rawKey.trim();
        if (trimmedKey.length === 0) {
          continue;
        }
        const keyOccurrence = (keyCounts.get(trimmedKey) ?? 0) + 1;
        keyCounts.set(trimmedKey, keyOccurrence);
        normalizedKeys.push({
          uniqueKey: `${trimmedKey}::${keyOccurrence}`,
          label: trimmedKey,
        });
      }

      const keyLabels = normalizedKeys.map((token) => token.label);
      const searchableParts = [
        shortcut.label,
        shortcut.description ?? '',
        keyLabels.join(' '),
        keyLabels.join('+'),
      ];

      normalizedShortcuts.push({
        uniqueKey: `${groupKey}::${shortcut.id}::${shortcutOccurrence}`,
        binding: shortcut,
        keys: normalizedKeys,
        searchableText: searchableParts.join('\n').toLowerCase(),
      });
    }

    if (normalizedShortcuts.length > 0) {
      normalizedGroups.push({
        uniqueKey: groupKey,
        id: group.id,
        title: group.title,
        titleLower: group.title.toLowerCase(),
        shortcuts: normalizedShortcuts,
      });
    }
  }

  return normalizedGroups;
}

const triggerClass = /*#__PURE__*/ stableClassName('shortcut-cheat-sheet', 'trigger');
const backdropClass = /*#__PURE__*/ stableClassName('shortcut-cheat-sheet', 'backdrop');
const panelClass = /*#__PURE__*/ stableClassName('shortcut-cheat-sheet', 'panel');
const searchWellClass = /*#__PURE__*/ stableClassName('shortcut-cheat-sheet', 'search');
const gridClass = /*#__PURE__*/ stableClassName('shortcut-cheat-sheet', 'grid');
const groupClass = /*#__PURE__*/ stableClassName('shortcut-cheat-sheet', 'group');
const itemClass = /*#__PURE__*/ stableClassName('shortcut-cheat-sheet', 'item');
const keycapClass = /*#__PURE__*/ stableClassName('shortcut-cheat-sheet', 'keycap');
const joinerClass = /*#__PURE__*/ stableClassName('shortcut-cheat-sheet', 'joiner');
const emptyClass = /*#__PURE__*/ stableClassName('shortcut-cheat-sheet', 'empty');
const closeClass = /*#__PURE__*/ stableClassName('shortcut-cheat-sheet', 'close');

function ShortcutCheatSheetInner({
  groups = DEFAULT_SHORTCUT_GROUPS,
  mode = 'modal',
  open,
  defaultOpen = false,
  onOpenChange,
  enableQuestionMarkHotkey = true,
  title = 'Keyboard Shortcuts',
  onSelectShortcut,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: ShortcutCheatSheetProps) {
  const [isModalOpen, setIsModalOpen] = useControllableState<boolean>({
    value: open,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });
  const [query, setQuery] = useState('');

  const titleId = useId();
  const dialogId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const wasOpenRef = useRef(false);

  const override = useComponentOverride('ShortcutCheatSheet');

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setIsModalOpen(nextOpen);
    },
    [setIsModalOpen]
  );

  useEffect(() => {
    if (mode !== 'modal') {
      wasOpenRef.current = false;
      return;
    }
    if (isModalOpen) {
      setQuery('');
      dialogRef.current?.focus();
    } else if (wasOpenRef.current) {
      triggerRef.current?.focus();
    }
    wasOpenRef.current = isModalOpen;
  }, [mode, isModalOpen]);

  useEffect(() => {
    if (mode !== 'modal') {
      return undefined;
    }

    const handleWindowKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.isComposing) {
        return;
      }

      if (e.key === 'Escape' && isModalOpen) {
        e.preventDefault();
        handleOpenChange(false);
        return;
      }

      if (
        enableQuestionMarkHotkey &&
        e.key === '?' &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        if (
          isEditableElement(e.target) ||
          isEditableElement(document.activeElement)
        ) {
          return;
        }
        e.preventDefault();
        handleOpenChange(!isModalOpen);
      }
    };

    window.addEventListener('keydown', handleWindowKeyDown);
    return () => window.removeEventListener('keydown', handleWindowKeyDown);
  }, [mode, isModalOpen, enableQuestionMarkHotkey, handleOpenChange]);

  const normalizedGroups = useMemo(
    () => normalizeShortcutGroups(groups),
    [groups]
  );

  const totalShortcutCount = useMemo(
    () =>
      normalizedGroups.reduce(
        (sum, group) => sum + group.shortcuts.length,
        0
      ),
    [normalizedGroups]
  );

  const trimmedQuery = query.trim();
  const lowerQuery = trimmedQuery.toLowerCase();

  const filteredGroups = useMemo(() => {
    if (!lowerQuery) {
      return normalizedGroups;
    }

    const matched: NormalizedGroupEntry[] = [];
    for (const group of normalizedGroups) {
      if (group.titleLower.includes(lowerQuery)) {
        matched.push(group);
        continue;
      }
      const matchingShortcuts = group.shortcuts.filter((entry) =>
        entry.searchableText.includes(lowerQuery)
      );
      if (matchingShortcuts.length > 0) {
        matched.push({
          ...group,
          shortcuts: matchingShortcuts,
        });
      }
    }
    return matched;
  }, [normalizedGroups, lowerQuery]);

  const matchingShortcutCount = useMemo(
    () =>
      filteredGroups.reduce((sum, group) => sum + group.shortcuts.length, 0),
    [filteredGroups]
  );

  const firstVisibleShortcut = filteredGroups[0]?.shortcuts[0]?.binding ?? null;

  const handleSearchKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) {
      return;
    }
    if (e.key === 'Escape' && mode === 'inline' && query.length > 0) {
      e.preventDefault();
      setQuery('');
    } else if (e.key === 'Enter' && onSelectShortcut && firstVisibleShortcut) {
      e.preventDefault();
      onSelectShortcut(firstVisibleShortcut);
    }
  };

  const resolvedTitle =
    title.trim().length > 0 ? title.trim() : 'Keyboard Shortcuts';
  const isEffectiveOpen = mode === 'inline' ? true : isModalOpen;


  const merged = mergeProps({
    themeTarget: themeProps('shortcut-cheat-sheet', {
      mode,
      open: isEffectiveOpen,
    }),
    baseClassName:
      mode === 'inline'
        ? 'prism-slab w-full max-w-full min-w-0 flex flex-col p-5 sm:p-6 gap-4'
        : 'inline-flex flex-col items-start max-w-full min-w-0',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const renderShortcutRowContent = (entry: NormalizedShortcutEntry) => (
    <>
      <div className="min-w-0 flex-1">
        <div
          className="text-sm font-medium leading-snug break-words"
          style={STYLE_TEXT_PRIMARY}
        >
          {entry.binding.label}
        </div>
        {entry.binding.description ? (
          <div
            className="text-xs leading-snug break-words mt-0.5"
            style={STYLE_TEXT_SECONDARY}
          >
            {entry.binding.description}
          </div>
        ) : null}
      </div>

      {entry.keys.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1 shrink-0">
          {entry.keys.map((keyToken, keyIdx) => (
            <Fragment key={keyToken.uniqueKey}>
              {keyIdx > 0 ? (
                <span
                  aria-hidden="true"
                  className={cx(
                    joinerClass,
                    'text-[10px] font-mono font-medium select-none leading-none'
                  )}
                  style={STYLE_TEXT_SECONDARY}
                >
                  +
                </span>
              ) : null}
              <kbd
                className={cx(
                  keycapClass,
                  'prism-crystal inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-lg font-mono text-xs font-semibold tabular-nums leading-none select-none whitespace-nowrap border-b-2'
                )}
                style={{
                  color: 'var(--prism-text-primary)',
                  borderBottomColor: 'var(--prism-well-border)',
                }}
              >
                {keyToken.label}
              </kbd>
            </Fragment>
          ))}
        </div>
      ) : null}
    </>
  );

  const sheetContent = (
    <>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 min-w-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            aria-hidden="true"
            className="prism-crystal w-9 h-9 rounded-xl inline-flex items-center justify-center shrink-0"
          >
            <Keyboard
              className="w-4 h-4"
              style={STYLE_PRIMARY_MAIN}
              aria-hidden="true"
            />
          </span>
          <div className="min-w-0">
            <h2
              id={titleId}
              className="text-base sm:text-lg font-semibold tracking-[-0.01em] truncate"
              style={STYLE_TEXT_PRIMARY}
            >
              {resolvedTitle}
            </h2>
            <p
              className="text-xs tabular-nums"
              style={STYLE_TEXT_SECONDARY}
            >
              {matchingShortcutCount}{' '}
              {matchingShortcutCount === 1 ? 'shortcut' : 'shortcuts'} across{' '}
              {filteredGroups.length}{' '}
              {filteredGroups.length === 1 ? 'category' : 'categories'}
            </p>
          </div>
        </div>

        {mode === 'modal' ? (
          <button
            type="button"
            onClick={() => handleOpenChange(false)}
            className={cx(
              closeClass,
              'prism-crystal prism-focus-ring inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium cursor-pointer shrink-0'
            )}
            style={STYLE_TEXT_PRIMARY}
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Close</span>
          </button>
        ) : null}
      </div>

      {/* Recessed Search Filter Well */}
      <div
        className={cx(
          searchWellClass,
          'prism-well rounded-full h-11 px-4 flex items-center gap-2.5 min-w-0 max-w-full'
        )}
      >
        <Search
          className="w-4 h-4 shrink-0"
          style={STYLE_TEXT_SECONDARY}
          aria-hidden="true"
        />
        <input
          ref={searchInputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder="Filter by action, category, or key..."
          aria-label="Filter keyboard shortcuts"
          className="w-full min-w-0 bg-transparent text-sm focus:outline-none"
          style={STYLE_TEXT_PRIMARY}
        />
        {query.length > 0 ? (
          <button
            type="button"
            aria-label="Clear search filter"
            onClick={() => {
              setQuery('');
              searchInputRef.current?.focus();
            }}
            className="prism-focus-ring inline-flex items-center justify-center w-6 h-6 rounded-full cursor-pointer shrink-0"
            style={STYLE_TEXT_SECONDARY}
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {/* Categorized 2-Column Shortcut Grid or Empty Status */}
      <div
        className={
          mode === 'modal'
            ? 'flex-1 min-h-0 overflow-y-auto pr-0.5 min-w-0'
            : 'min-w-0 max-w-full'
        }
      >
        {filteredGroups.length === 0 ? (
          <div
            role="status"
            aria-live="polite"
            className={cx(
              emptyClass,
              'prism-well rounded-2xl px-4 py-8 text-center flex flex-col items-center justify-center gap-3'
            )}
          >
            <p
              className="text-sm font-medium"
              style={STYLE_TEXT_PRIMARY}
            >
              {trimmedQuery
                ? `No shortcuts matching "${trimmedQuery}"`
                : 'No keyboard shortcuts configured.'}
            </p>
            {trimmedQuery ? (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  searchInputRef.current?.focus();
                }}
                className="prism-crystal prism-focus-ring inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full text-xs font-medium cursor-pointer"
                style={STYLE_TEXT_PRIMARY}
              >
                Clear search
              </button>
            ) : null}
          </div>
        ) : (
          <div
            className={cx(
              gridClass,
              'grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0 max-w-full'
            )}
          >
            {filteredGroups.map((group) => (
              <section
                key={group.uniqueKey}
                aria-label={group.title}
                className={cx(
                  groupClass,
                  'prism-well rounded-2xl p-4 flex flex-col gap-3 min-w-0 max-w-full'
                )}
              >
                <div
                  className="flex items-center justify-between gap-2 pb-2 border-b min-w-0"
                  style={STYLE_BORDER_DIVIDER}
                >
                  <h3
                    className="text-xs font-semibold uppercase tracking-wider truncate"
                    style={STYLE_TEXT_SECONDARY}
                  >
                    {group.title}
                  </h3>
                  <span
                    className="text-[11px] font-mono tabular-nums shrink-0"
                    style={STYLE_TEXT_SECONDARY}
                  >
                    {group.shortcuts.length}
                  </span>
                </div>

                <ul className="flex flex-col gap-2 min-w-0" role="list">
                  {group.shortcuts.map((entry) => (
                    <li key={entry.uniqueKey} className="min-w-0">
                      {onSelectShortcut ? (
                        <button
                          type="button"
                          onClick={() => onSelectShortcut(entry.binding)}
                          className={cx(
                            itemClass,
                            'prism-focus-ring w-full flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 px-2.5 py-2 rounded-xl text-left transition-opacity hover:opacity-90 cursor-pointer min-w-0'
                          )}
                          style={{
                            backgroundColor:
                              'color-mix(in srgb, var(--prism-crystal-top) 52%, transparent)',
                          }}
                        >
                          {renderShortcutRowContent(entry)}
                        </button>
                      ) : (
                        <div
                          className={cx(
                            itemClass,
                            'w-full flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 px-2.5 py-2 rounded-xl min-w-0'
                          )}
                          style={{
                            backgroundColor:
                              'color-mix(in srgb, var(--prism-crystal-top) 36%, transparent)',
                          }}
                        >
                          {renderShortcutRowContent(entry)}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>

      {/* Footer Hint */}
      <div
        className="pt-3 border-t flex flex-wrap items-center justify-between gap-2 text-[11px]"
        style={STYLE_BORDER_DIVIDER_TEXT_SECONDARY}
      >
        <span>
          {mode === 'modal'
            ? enableQuestionMarkHotkey
              ? 'Press ? to toggle · Esc to close'
              : 'Press Esc to close'
            : 'Filter by action, category, or key chord'}
        </span>
        <span className="font-mono tabular-nums">
          {trimmedQuery
            ? `Showing ${matchingShortcutCount} of ${totalShortcutCount}`
            : `${totalShortcutCount} total`}
        </span>
      </div>
    </>
  );

  if (mode === 'inline') {
    return (
      <div
        ref={ref}
        role="region"
        aria-labelledby={titleId}
        {...rest}
        {...merged}
      >
        {sheetContent}
      </div>
    );
  }

  return (
    <div ref={ref} {...rest} {...merged}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isModalOpen}
        aria-controls={isModalOpen ? dialogId : undefined}
        onClick={() => handleOpenChange(!isModalOpen)}
        className={cx(
          triggerClass,
          'prism-crystal prism-focus-ring inline-flex items-center gap-2 h-10 px-4 rounded-full text-sm font-medium max-w-full min-w-0 cursor-pointer transition-transform hover:-translate-y-0.5 active:translate-y-0'
        )}
        style={STYLE_TEXT_PRIMARY}
      >
        <Keyboard
          className="w-4 h-4 shrink-0"
          style={STYLE_PRIMARY_MAIN}
          aria-hidden="true"
        />
        <span className="truncate">Shortcuts</span>
        <span
          aria-hidden="true"
          style={STYLE_TEXT_SECONDARY}
        >
          {' · '}
        </span>
        <kbd
          className={cx(
            keycapClass,
            'prism-crystal inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-md font-mono text-[11px] font-semibold tabular-nums leading-none border-b-2 shrink-0'
          )}
          style={{
            color: 'var(--prism-text-primary)',
            borderBottomColor: 'var(--prism-well-border)',
          }}
        >
          ?
        </kbd>
      </button>

      {isModalOpen ? (
        <div
          data-part="backdrop"
          className={cx(
            backdropClass,
            'fixed inset-0 z-50 flex items-center justify-center p-4 prism-backdrop-scrim'
          )}
          style={{
            backgroundColor:
              'color-mix(in srgb, var(--prism-text-primary) 28%, transparent)',
          }}
          onClick={() => handleOpenChange(false)}
        >
          <div
            ref={dialogRef}
            id={dialogId}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={(e) => e.stopPropagation()}
            className={cx(
              panelClass,
              'prism-slab w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden p-5 sm:p-6 gap-4 min-w-0 focus:outline-none'
            )}
            style={STYLE_TEXT_PRIMARY}
          >
            {sheetContent}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export const ShortcutCheatSheet = /*#__PURE__*/ memoWithDisplayName(ShortcutCheatSheetInner, 'ShortcutCheatSheet');
