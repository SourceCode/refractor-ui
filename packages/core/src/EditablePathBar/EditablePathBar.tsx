'use client';

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ChevronRight,
  Clock,
  CornerDownLeft,
  Folder,
  HardDrive,
  Pencil,
  X,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useMergedRefs } from '../hooks/useMergedRefs';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { STYLE_PRIMARY_MAIN, STYLE_SECONDARY_MAIN, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export type EditablePathSuggestionKind = 'folder' | 'mount' | 'recent';

export interface EditablePathSuggestion {
  /** Target directory path suggested during autocomplete. */
  path: string;
  /** Optional human-readable label rendered beneath the path. */
  label?: string;
  /** Optional semantic kind badge and icon ('folder' | 'mount' | 'recent'). */
  kind?: EditablePathSuggestionKind;
}

type EditablePathBarBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface EditablePathBarProps extends EditablePathBarBaseProps {
  /** Controlled active directory path. */
  path?: string;
  /** Initial uncontrolled directory path (defaults to '/Users/clara/Projects/refractor-ui/packages/core'). */
  defaultPath?: string;
  /** Autocomplete path suggestions displayed in edit mode. */
  suggestions?: ReadonlyArray<EditablePathSuggestion>;
  /** Callback fired with the normalized directory path whenever navigation commits. */
  onNavigate?: (nextPath: string) => void;
  /** Accessible label applied to the root path bar region (defaults to 'Directory path navigation'). */
  ariaLabel?: string;
  /** Disables navigation controls, breadcrumb clicks, edit mode, and keyboard shortcuts. */
  disabled?: boolean;
}

interface EditablePathSegment {
  name: string;
  fullPath: string;
}

interface NormalizedPathSuggestion {
  normalizedPath: string;
  label: string | undefined;
  kind: EditablePathSuggestionKind;
}

interface PathHistoryState {
  back: ReadonlyArray<string>;
  current: string;
  forward: ReadonlyArray<string>;
}

export const DEFAULT_EDITABLE_PATH = '/Users/clara/Projects/refractor-ui/packages/core';

export const DEFAULT_EDITABLE_PATH_SUGGESTIONS: ReadonlyArray<EditablePathSuggestion> = [
  {
    path: '/Users/clara/Projects/refractor-ui/packages/core',
    label: 'Core Package',
    kind: 'folder',
  },
  {
    path: '/Users/clara/Projects/refractor-ui/apps/docs',
    label: 'Docs Portal',
    kind: 'folder',
  },
  {
    path: '/Users/clara/Documents/DesignSpecs',
    label: 'Design Specs',
    kind: 'recent',
  },
  {
    path: '/Volumes/StudioNVMe/Renders',
    label: 'Studio NVMe Renders',
    kind: 'mount',
  },
  {
    path: '/Users/clara/Downloads',
    label: 'Downloads',
    kind: 'recent',
  },
];

/**
 * Pure linear-time path normalizer (zero regex backtracking):
 * converts backslashes to `/`, collapses repeated slashes, resolves `.` and `..`
 * without escaping above `/`, ensures a leading `/`, and falls back to `'/'` for empty input.
 */
export function normalizeEditablePath(rawPath: string): string {
  const trimmed = rawPath.trim();
  if (trimmed.length === 0) {
    return '/';
  }

  const resolved: string[] = [];
  let segmentStart = 0;

  for (let i = 0; i <= trimmed.length; i += 1) {
    const ch = i < trimmed.length ? trimmed[i] : '/';
    if (ch === '/' || ch === '\\') {
      if (i > segmentStart) {
        const segment = trimmed.slice(segmentStart, i);
        if (segment === '..') {
          if (resolved.length > 0) {
            resolved.pop();
          }
        } else if (segment !== '.') {
          resolved.push(segment);
        }
      }
      segmentStart = i + 1;
    }
  }

  if (resolved.length === 0) {
    return '/';
  }

  return `/${resolved.join('/')}`;
}

function splitPathSegments(normalizedPath: string): ReadonlyArray<EditablePathSegment> {
  if (normalizedPath === '/') {
    return [];
  }

  const parts = normalizedPath.slice(1).split('/');
  const segments: EditablePathSegment[] = [];
  let acc = '';
  for (const part of parts) {
    acc = `${acc}/${part}`;
    segments.push({ name: part, fullPath: acc });
  }
  return segments;
}

function getParentPath(normalizedPath: string): string {
  const lastSlash = normalizedPath.lastIndexOf('/');
  return lastSlash <= 0 ? '/' : normalizedPath.slice(0, lastSlash);
}

function filterPathSuggestions(
  items: ReadonlyArray<NormalizedPathSuggestion>,
  rawQuery: string
): ReadonlyArray<NormalizedPathSuggestion> {
  const normalizedQuery = rawQuery.trim().split('\\').join('/').toLowerCase();
  if (normalizedQuery.length === 0) {
    return items;
  }

  return items.filter(
    (item) =>
      item.normalizedPath.toLowerCase().includes(normalizedQuery) ||
      (item.label !== undefined && item.label.toLowerCase().includes(normalizedQuery))
  );
}

function renderSuggestionKindIcon(kind: EditablePathSuggestionKind) {
  if (kind === 'mount') {
    return (
      <HardDrive
        aria-hidden="true"
        className="w-4 h-4 shrink-0"
        style={STYLE_SECONDARY_MAIN}
      />
    );
  }
  if (kind === 'recent') {
    return (
      <Clock
        aria-hidden="true"
        className="w-4 h-4 shrink-0"
        style={STYLE_TEXT_SECONDARY}
      />
    );
  }
  return (
    <Folder
      aria-hidden="true"
      className="w-4 h-4 shrink-0"
      style={STYLE_PRIMARY_MAIN}
    />
  );
}

const toolbarClass = /*#__PURE__*/ stableClassName('editable-path-bar', 'toolbar');
const navGroupClass = /*#__PURE__*/ stableClassName('editable-path-bar', 'nav-group');
const wellClass = /*#__PURE__*/ stableClassName('editable-path-bar', 'well');
const listboxClass = /*#__PURE__*/ stableClassName('editable-path-bar', 'listbox');

function EditablePathBarInner({
  path,
  defaultPath = DEFAULT_EDITABLE_PATH,
  suggestions = DEFAULT_EDITABLE_PATH_SUGGESTIONS,
  onNavigate,
  ariaLabel = 'Directory path navigation',
  disabled = false,
  className,
  style,
  xstyle,
  onKeyDown,
  'aria-label': ariaLabelProp,
  ref,
  ...rest
}: EditablePathBarProps) {
  const override = useComponentOverride('EditablePathBar');
  const listboxId = useId();

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const editButtonRef = useRef<HTMLButtonElement | null>(null);
  const shouldRestoreFocusRef = useRef(false);
  const pendingDirectionRef = useRef<'back' | 'forward' | null>(null);
  const mergedRef = useMergedRefs(wrapperRef, ref);

  const isControlled = path !== undefined;
  const initialPath = normalizeEditablePath(path ?? defaultPath);

  const [history, setHistory] = useState<PathHistoryState>(() => ({
    back: [],
    current: initialPath,
    forward: [],
  }));

  const currentPath = isControlled ? normalizeEditablePath(path) : history.current;

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<string>(currentPath);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [announcement, setAnnouncement] = useState<string>(`Current path ${initialPath}`);

  const editingActive = isEditing && !disabled;

  useEffect(() => {
    if (!isControlled) {
      return;
    }
    const nextControlled = normalizeEditablePath(path);
    const pendingDirection = pendingDirectionRef.current;
    pendingDirectionRef.current = null;

    setHistory((prev) => {
      if (prev.current === nextControlled) {
        return prev;
      }
      if (pendingDirection === 'back' && prev.back[0] === nextControlled) {
        return {
          back: prev.back.slice(1),
          current: nextControlled,
          forward: [prev.current, ...prev.forward],
        };
      }
      if (pendingDirection === 'forward' && prev.forward[0] === nextControlled) {
        return {
          back: [prev.current, ...prev.back],
          current: nextControlled,
          forward: prev.forward.slice(1),
        };
      }
      return {
        back: [prev.current, ...prev.back],
        current: nextControlled,
        forward: [],
      };
    });
  }, [isControlled, path]);

  useEffect(() => {
    if (editingActive) {
      inputRef.current?.focus();
      inputRef.current?.select();
      return;
    }

    if (shouldRestoreFocusRef.current) {
      shouldRestoreFocusRef.current = false;
      editButtonRef.current?.focus();
    }
  }, [editingActive]);

  useEffect(() => {
    if (!editingActive) {
      return;
    }
    const handleDocumentMouseDown = (event: MouseEvent) => {
      const wrapper = wrapperRef.current;
      if (wrapper && !wrapper.contains(event.target as Node)) {
        setIsEditing(false);
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleDocumentMouseDown);
    return () => document.removeEventListener('mousedown', handleDocumentMouseDown);
  }, [editingActive]);

  const segments = useMemo(() => splitPathSegments(currentPath), [currentPath]);

  const normalizedSuggestions = useMemo<ReadonlyArray<NormalizedPathSuggestion>>(() => {
    const seen = new Set<string>();
    const list: NormalizedPathSuggestion[] = [];
    for (const item of suggestions) {
      const normalizedPath = normalizeEditablePath(item.path);
      if (seen.has(normalizedPath)) {
        continue;
      }
      seen.add(normalizedPath);
      list.push({
        normalizedPath,
        label: item.label,
        kind: item.kind ?? 'folder',
      });
    }
    return list;
  }, [suggestions]);

  const filteredSuggestions = useMemo(
    () => filterPathSuggestions(normalizedSuggestions, draft),
    [normalizedSuggestions, draft]
  );

  const safeHighlightedIndex =
    highlightedIndex >= 0 && highlightedIndex < filteredSuggestions.length
      ? highlightedIndex
      : -1;

  const showSuggestions = editingActive && filteredSuggestions.length > 0;
  const activeOptionId =
    editingActive && safeHighlightedIndex >= 0
      ? `${listboxId}-option-${safeHighlightedIndex}`
      : undefined;

  const canGoBack = !disabled && history.back.length > 0;
  const canGoForward = !disabled && history.forward.length > 0;
  const canGoUp = !disabled && currentPath !== '/';

  const navigateToPath = useCallback(
    (rawTarget: string, source: 'breadcrumb' | 'edit' | 'up') => {
      const nextPath = normalizeEditablePath(rawTarget);
      if (nextPath === currentPath) {
        setAnnouncement(`Current path ${nextPath}`);
        return;
      }
      if (!isControlled) {
        setHistory((prev) => ({
          back: [prev.current, ...prev.back],
          current: nextPath,
          forward: [],
        }));
      }
      onNavigate?.(nextPath);
      setAnnouncement(
        source === 'up' ? `Navigated up to ${nextPath}` : `Navigated to ${nextPath}`
      );
    },
    [currentPath, isControlled, onNavigate]
  );

  const enterEditMode = useCallback(() => {
    setDraft(currentPath);
    setHighlightedIndex(-1);
    setIsEditing(true);
    setAnnouncement(`Editing path ${currentPath}`);
  }, [currentPath]);

  const commitDraft = useCallback(
    (rawTarget: string, restoreFocus: boolean) => {
      shouldRestoreFocusRef.current = restoreFocus;
      setIsEditing(false);
      setHighlightedIndex(-1);
      navigateToPath(rawTarget, 'edit');
    },
    [navigateToPath]
  );

  const cancelEditMode = useCallback(
    (restoreFocus: boolean) => {
      shouldRestoreFocusRef.current = restoreFocus;
      setDraft(currentPath);
      setHighlightedIndex(-1);
      setIsEditing(false);
      setAnnouncement(`Canceled editing. Current path ${currentPath}`);
    },
    [currentPath]
  );

  const handleGoBack = () => {
    const [target, ...remainingBack] = history.back;
    if (target === undefined) {
      return;
    }
    if (isControlled) {
      pendingDirectionRef.current = 'back';
    } else {
      setHistory((prev) => ({
        back: remainingBack,
        current: target,
        forward: [prev.current, ...prev.forward],
      }));
    }
    setIsEditing(false);
    setHighlightedIndex(-1);
    onNavigate?.(target);
    setAnnouncement(`Navigated back to ${target}`);
  };

  const handleGoForward = () => {
    const [target, ...remainingForward] = history.forward;
    if (target === undefined) {
      return;
    }
    if (isControlled) {
      pendingDirectionRef.current = 'forward';
    } else {
      setHistory((prev) => ({
        back: [prev.current, ...prev.back],
        current: target,
        forward: remainingForward,
      }));
    }
    setIsEditing(false);
    setHighlightedIndex(-1);
    onNavigate?.(target);
    setAnnouncement(`Navigated forward to ${target}`);
  };

  const handleGoUp = () => {
    const parent = getParentPath(currentPath);
    setIsEditing(false);
    setHighlightedIndex(-1);
    navigateToPath(parent, 'up');
  };

  const handleWellClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (disabled) {
      return;
    }
    if ((event.target as Element).closest('button')) {
      return;
    }
    enterEditMode();
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    setDraft(event.target.value);
    setHighlightedIndex(-1);
  };

  const handleInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) {
      return;
    }

    if (event.key === 'ArrowDown') {
      if (filteredSuggestions.length > 0) {
        event.preventDefault();
        setHighlightedIndex((prev) =>
          prev < 0 || prev >= filteredSuggestions.length - 1 ? 0 : prev + 1
        );
      }
      return;
    }

    if (event.key === 'ArrowUp') {
      if (filteredSuggestions.length > 0) {
        event.preventDefault();
        setHighlightedIndex((prev) =>
          prev <= 0 ? filteredSuggestions.length - 1 : prev - 1
        );
      }
      return;
    }

    const highlighted =
      safeHighlightedIndex >= 0 ? filteredSuggestions[safeHighlightedIndex] : undefined;

    if (event.key === 'Tab') {
      const candidate = highlighted ?? filteredSuggestions[0];
      if (candidate && (highlighted !== undefined || candidate.normalizedPath !== draft)) {
        event.preventDefault();
        setDraft(candidate.normalizedPath);
        setHighlightedIndex(-1);
        setAnnouncement(`Completed path ${candidate.normalizedPath}`);
      }
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      commitDraft(highlighted ? highlighted.normalizedPath : draft, true);
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      cancelEditMode(true);
    }
  };

  const handleContainerKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || disabled || event.nativeEvent.isComposing) {
      return;
    }
    const lowerKey = event.key.toLowerCase();
    const isCtrlOrMetaL = (event.ctrlKey || event.metaKey) && !event.altKey && lowerKey === 'l';
    const isAltD = event.altKey && !event.ctrlKey && !event.metaKey && lowerKey === 'd';
    if (isCtrlOrMetaL || isAltD) {
      event.preventDefault();
      enterEditMode();
    }
  };

  const merged = mergeProps({
    themeTarget: themeProps('editable-path-bar', {
      mode: editingActive ? 'edit' : 'breadcrumb',
      disabled,
      canGoBack,
      canGoForward,
      canGoUp,
      depth: segments.length,
    }),
    baseClassName: 'prism-slab p-2 sm:p-2.5 w-full max-w-full min-w-0',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });


  return (
    <div
      ref={mergedRef}
      role="region"
      aria-label={ariaLabelProp ?? ariaLabel}
      aria-disabled={disabled || undefined}
      {...rest}
      {...merged}
      onKeyDown={handleContainerKeyDown}
    >
      <div
        role="toolbar"
        aria-label="Path navigation controls"
        className={cx(
          toolbarClass,
          'flex flex-wrap items-center gap-1.5 min-w-0 max-w-full w-full'
        )}
      >
        <div
          role="group"
          aria-label="History and parent navigation"
          className={cx(
            navGroupClass,
            'prism-well p-1 rounded-xl inline-flex items-center gap-0.5 shrink-0'
          )}
        >
          <button
            type="button"
            aria-label="Go back"
            disabled={!canGoBack}
            onClick={handleGoBack}
            data-testid="editable-path-back"
            className="prism-crystal prism-focus-ring h-8 w-8 rounded-lg inline-flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]"
            style={STYLE_TEXT_PRIMARY}
          >
            <ArrowLeft aria-hidden="true" className="w-4 h-4 shrink-0" />
          </button>

          <button
            type="button"
            aria-label="Go forward"
            disabled={!canGoForward}
            onClick={handleGoForward}
            data-testid="editable-path-forward"
            className="prism-crystal prism-focus-ring h-8 w-8 rounded-lg inline-flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]"
            style={STYLE_TEXT_PRIMARY}
          >
            <ArrowRight aria-hidden="true" className="w-4 h-4 shrink-0" />
          </button>

          <button
            type="button"
            aria-label="Go up one folder"
            disabled={!canGoUp}
            onClick={handleGoUp}
            data-testid="editable-path-up"
            className="prism-crystal prism-focus-ring h-8 w-8 rounded-lg inline-flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]"
            style={STYLE_TEXT_PRIMARY}
          >
            <ArrowUp aria-hidden="true" className="w-4 h-4 shrink-0" />
          </button>
        </div>

        <div className="relative flex-1 min-w-0 max-w-full">
          {editingActive ? (
            <div
              data-testid="editable-path-edit-well"
              className={cx(
                wellClass,
                'prism-well rounded-xl px-2.5 py-1 min-h-10 flex flex-wrap items-center gap-1.5 min-w-0 max-w-full'
              )}
              style={{ borderColor: 'var(--prism-focus-ring)' }}
            >
              <Folder
                aria-hidden="true"
                className="w-4 h-4 shrink-0"
                style={STYLE_PRIMARY_MAIN}
              />
              <input
                ref={inputRef}
                type="text"
                role="combobox"
                aria-label="Edit directory path"
                aria-expanded={showSuggestions}
                aria-autocomplete="list"
                aria-controls={showSuggestions ? listboxId : undefined}
                aria-activedescendant={activeOptionId}
                value={draft}
                disabled={disabled}
                onChange={handleInputChange}
                onKeyDown={handleInputKeyDown}
                data-testid="editable-path-input"
                placeholder="/path/to/directory"
                className="flex-1 min-w-0 bg-transparent font-mono text-xs sm:text-sm focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                style={STYLE_TEXT_PRIMARY}
              />
              <button
                type="button"
                aria-label="Go to path"
                disabled={disabled}
                onClick={() => commitDraft(draft, true)}
                data-testid="editable-path-commit"
                className="prism-btn-primary prism-focus-ring h-7 px-2.5 rounded-lg inline-flex items-center gap-1 text-xs font-semibold shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed transition-[color,background-color,border-color,opacity,transform]"
              >
                <CornerDownLeft aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                <span>Go</span>
              </button>
              <button
                type="button"
                aria-label="Cancel path editing"
                disabled={disabled}
                onClick={() => cancelEditMode(true)}
                data-testid="editable-path-cancel"
                className="prism-crystal prism-focus-ring h-7 w-7 rounded-lg inline-flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]"
                style={STYLE_TEXT_SECONDARY}
              >
                <X aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
              </button>
            </div>
          ) : (
            <div
              data-testid="editable-path-well"
              onClick={handleWellClick}
              className={cx(
                wellClass,
                'prism-well rounded-xl px-2 py-1 min-h-10 flex flex-wrap items-center gap-1 min-w-0 max-w-full',
                disabled ? 'opacity-65 cursor-not-allowed' : 'cursor-text'
              )}
            >
              <nav
                aria-label="Directory breadcrumbs"
                className="flex flex-wrap items-center gap-0.5 min-w-0 max-w-full flex-1"
              >
                <ol className="flex flex-wrap items-center gap-0.5 min-w-0 max-w-full">
                  <li className="inline-flex items-center min-w-0">
                    <button
                      type="button"
                      disabled={disabled}
                      aria-label="Root directory /"
                      aria-current={segments.length === 0 ? 'location' : undefined}
                      data-testid="editable-path-root"
                      data-path="/"
                      onClick={() => navigateToPath('/', 'breadcrumb')}
                      className={cx(
                        segments.length === 0
                          ? 'prism-btn-secondary font-semibold'
                          : 'prism-crystal',
                        'prism-focus-ring h-7 px-2 rounded-lg inline-flex items-center gap-1 font-mono text-xs shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]'
                      )}
                      style={STYLE_TEXT_PRIMARY}
                    >
                      <HardDrive aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                      <span>/</span>
                    </button>
                  </li>

                  {segments.map((segment, index) => {
                    const isLast = index === segments.length - 1;
                    return (
                      <li
                        key={segment.fullPath}
                        className="inline-flex items-center gap-0.5 min-w-0 max-w-full"
                      >
                        <ChevronRight
                          aria-hidden="true"
                          className="w-3.5 h-3.5 shrink-0"
                          style={STYLE_TEXT_SECONDARY}
                        />
                        <button
                          type="button"
                          disabled={disabled}
                          aria-current={isLast ? 'location' : undefined}
                          data-path={segment.fullPath}
                          onClick={() => navigateToPath(segment.fullPath, 'breadcrumb')}
                          className={cx(
                            isLast
                              ? 'prism-btn-secondary font-semibold'
                              : 'prism-crystal font-medium',
                            'prism-focus-ring h-7 px-2 rounded-lg inline-flex items-center text-xs min-w-0 max-w-full break-all sm:break-normal sm:truncate cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]'
                          )}
                          style={{
                            color: isLast
                              ? 'var(--prism-text-primary)'
                              : 'var(--prism-text-secondary)',
                          }}
                        >
                          {segment.name}
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </nav>

              <button
                ref={editButtonRef}
                type="button"
                disabled={disabled}
                aria-label="Edit path"
                data-testid="editable-path-edit-btn"
                onClick={enterEditMode}
                className="prism-crystal prism-focus-ring h-7 px-2.5 rounded-lg inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]"
                style={STYLE_TEXT_SECONDARY}
              >
                <Pencil aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                <span>Edit path</span>
              </button>
            </div>
          )}

          {showSuggestions ? (
            <div
              id={listboxId}
              role="listbox"
              aria-label="Path suggestions"
              data-testid="editable-path-listbox"
              className={cx(
                listboxClass,
                'prism-slab absolute left-0 top-full mt-2 w-full max-w-[calc(100vw-2rem)] z-40 p-1.5 max-h-64 overflow-y-auto flex flex-col gap-1'
              )}
            >
              {filteredSuggestions.map((suggestion, index) => {
                const isHighlighted = index === safeHighlightedIndex;
                const optionId = `${listboxId}-option-${index}`;
                return (
                  <button
                    key={suggestion.normalizedPath}
                    id={optionId}
                    type="button"
                    role="option"
                    aria-selected={isHighlighted}
                    data-highlighted={isHighlighted ? 'true' : undefined}
                    data-kind={suggestion.kind}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => commitDraft(suggestion.normalizedPath, true)}
                    className={cx(
                      isHighlighted ? 'prism-btn-secondary' : 'prism-crystal',
                      'prism-focus-ring w-full px-3 py-2 rounded-xl text-left flex flex-wrap items-center justify-between gap-2 min-w-0 cursor-pointer transition-[color,background-color,border-color,opacity,transform]'
                    )}
                  >
                    <span className="inline-flex items-center gap-2 min-w-0 flex-1">
                      {renderSuggestionKindIcon(suggestion.kind)}
                      <span className="flex flex-col min-w-0">
                        <span
                          className="font-mono text-xs font-medium break-all"
                          style={STYLE_TEXT_PRIMARY}
                        >
                          {suggestion.normalizedPath}
                        </span>
                        {suggestion.label ? (
                          <span
                            className="text-[11px] truncate"
                            style={STYLE_TEXT_SECONDARY}
                          >
                            {suggestion.label}
                          </span>
                        ) : null}
                      </span>
                    </span>
                    <span
                      className="prism-well px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide shrink-0"
                      style={STYLE_TEXT_SECONDARY}
                    >
                      {suggestion.kind}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>

      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-testid="editable-path-status"
        className="sr-only"
      >
        {announcement}
      </div>
    </div>
  );
}

export const EditablePathBar = /*#__PURE__*/ memoWithDisplayName(EditablePathBarInner, 'EditablePathBar');
