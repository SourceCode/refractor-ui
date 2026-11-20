'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Users, X } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { getAccessibleContrastText } from '../utils/colorMath';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber, sanitizeUrl } from '../utils/sanitize';
import { themeProps } from '../utils/themeProps';
import { useComponentOverride } from '../theme/PrismThemeProvider';

export type PresenceStatus = 'online' | 'editing' | 'viewing' | 'idle';

export type LivePresenceSize = 'sm' | 'md' | 'lg';

export interface PresenceCursor {
  /** Horizontal canvas coordinate percentage (clamped safely to 0..100). */
  x: number;
  /** Vertical canvas coordinate percentage (clamped safely to 0..100). */
  y: number;
  /** Optional custom pill label rendered beside the live cursor arrow. */
  label?: string;
}

export interface PresenceUser {
  /** Unique collaborator identifier (duplicates are deduplicated preserving first entry). */
  id: string;
  /** Collaborator display name rendered in tooltips, detail pills, and initials fallback. */
  name: string;
  /** Optional workspace role or title (e.g. 'Design Lead'). */
  role?: string;
  /** Optional avatar portrait URL (sanitized against unsafe protocols; falls back to initials). */
  avatarSrc?: string;
  /** Real-time presence state driving status dot semantics and summary counts. */
  status: PresenceStatus;
  /** Optional validated hex or rgb accent color for rings and live cursors. */
  color?: string;
  /** Optional live activity string (e.g. 'Editing Hero Frame'). */
  activity?: string;
  /** Optional live cursor position rendered when showCursors is enabled. */
  cursor?: PresenceCursor;
}

export interface LivePresenceIndicatorProps extends BaseProps<HTMLDivElement> {
  /** List of active or idle collaborators present in the session. */
  users: readonly PresenceUser[];
  /** Maximum avatars rendered before collapsing into the +N overflow trigger (clamped 1..12, default 4). */
  maxVisible?: number;
  /** Renders the optical studio grid stage displaying live collaborator SVG cursors (default false). */
  showCursors?: boolean;
  /** Displays the live summary count pill (e.g. '6 active', '2 editing') (default true). */
  showCountLabel?: boolean;
  /** Avatar stack sizing scale ('sm' | 'md' | 'lg', default 'md'). */
  size?: LivePresenceSize;
  /** Callback invoked whenever a collaborator avatar or overflow row is selected. */
  onUserSelect?: (user: PresenceUser) => void;
  /** Accessible label for the live cursor canvas stage (default 'Live collaboration canvas'). */
  cursorStageLabel?: string;
}

interface StatusMeta {
  label: string;
  tokenVar: string;
  pulse: boolean;
}

const SAFE_HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const SAFE_RGB_COLOR_RE =
  /^rgb\(\s*(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\s*,\s*(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\s*,\s*(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\s*\)$/;

const COLLABORATOR_FALLBACK_COLORS: readonly string[] = [
  '#E75C24',
  '#0284C7',
  '#159673',
  '#7C3AED',
  '#D97706',
  '#DB2777',
  '#0D9488',
  '#4F46E5',
];

function getStatusMeta(status: PresenceStatus): StatusMeta {
  switch (status) {
    case 'editing':
      return { label: 'Editing', tokenVar: 'var(--prism-primary-main)', pulse: true };
    case 'viewing':
      return { label: 'Viewing', tokenVar: 'var(--prism-secondary-main)', pulse: false };
    case 'idle':
      return { label: 'Idle', tokenVar: 'var(--prism-text-disabled)', pulse: false };
    case 'online':
      return { label: 'Online', tokenVar: 'var(--prism-success-main)', pulse: false };
  }
}

function sanitizeAccentColor(rawColor: string | undefined, fallbackIndex: number): string {
  if (typeof rawColor === 'string') {
    const trimmed = rawColor.trim();
    if (SAFE_HEX_COLOR_RE.test(trimmed) || SAFE_RGB_COLOR_RE.test(trimmed)) {
      return trimmed;
    }
  }
  const idx = Math.abs(fallbackIndex) % COLLABORATOR_FALLBACK_COLORS.length;
  return COLLABORATOR_FALLBACK_COLORS[idx] ?? '#E75C24';
}

function deriveInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((segment) => segment.length > 0);
  const firstPart = parts[0];
  if (!firstPart) return '?';
  const lastPart = parts[parts.length - 1];
  if (parts.length === 1 || !lastPart) {
    return firstPart.slice(0, 2).toUpperCase();
  }
  return `${firstPart.charAt(0)}${lastPart.charAt(0)}`.toUpperCase();
}

function getSizeClasses(size: LivePresenceSize): {
  avatar: string;
  dot: string;
  overflow: string;
} {
  if (size === 'sm') {
    return {
      avatar: 'w-7 h-7 text-[10px]',
      dot: 'w-2 h-2',
      overflow: 'h-7 min-w-7 px-1.5 text-[10px]',
    };
  }
  if (size === 'lg') {
    return {
      avatar: 'w-11 h-11 text-sm',
      dot: 'w-3 h-3',
      overflow: 'h-11 min-w-11 px-2.5 text-xs',
    };
  }
  return {
    avatar: 'w-9 h-9 text-xs',
    dot: 'w-2.5 h-2.5',
    overflow: 'h-9 min-w-9 px-2 text-xs',
  };
}

interface ResolvedPresenceUser {
  user: PresenceUser;
  displayName: string;
  safeAvatarSrc: string;
  initials: string;
  accentColor: string;
  statusMeta: StatusMeta;
}

interface CursorEntry {
  entry: ResolvedPresenceUser;
  cursor: PresenceCursor;
}

export function LivePresenceIndicator({
  users,
  maxVisible = 4,
  showCursors = false,
  showCountLabel = true,
  size = 'md',
  onUserSelect,
  cursorStageLabel = 'Live collaboration canvas',
  'aria-label': ariaLabel = 'Live collaborator presence',
  className,
  style,
  xstyle,
  ref,
  ...rest
}: LivePresenceIndicatorProps) {
  const override = useComponentOverride('LivePresenceIndicator');
  const popoverId = useId();
  const overflowContainerRef = useRef<HTMLDivElement | null>(null);

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [failedAvatars, setFailedAvatars] = useState<Set<string>>(() => new Set());

  const safeMaxVisible = Math.round(clampNumber(maxVisible, 1, 12, 4));

  const { resolvedUsers, userMap } = useMemo(() => {
    const map = new Map<string, ResolvedPresenceUser>();
    const list: ResolvedPresenceUser[] = [];
    let idx = 0;

    for (const user of users) {
      if (map.has(user.id)) continue;
      const resolved: ResolvedPresenceUser = {
        user,
        displayName: user.name.trim() || 'Collaborator',
        safeAvatarSrc: user.avatarSrc ? sanitizeUrl(user.avatarSrc, true) : '',
        initials: deriveInitials(user.name),
        accentColor: sanitizeAccentColor(user.color, idx),
        statusMeta: getStatusMeta(user.status),
      };
      map.set(user.id, resolved);
      list.push(resolved);
      idx += 1;
    }

    return { resolvedUsers: list, userMap: map };
  }, [users]);

  const visibleUsers = useMemo(
    () => resolvedUsers.slice(0, safeMaxVisible),
    [resolvedUsers, safeMaxVisible]
  );

  const overflowUsers = useMemo(
    () => resolvedUsers.slice(safeMaxVisible),
    [resolvedUsers, safeMaxVisible]
  );

  const isOverflowOpen = overflowOpen && overflowUsers.length > 0;

  const selectedEntry = selectedUserId !== null ? (userMap.get(selectedUserId) ?? null) : null;

  const activeCount = useMemo(
    () => resolvedUsers.filter((entry) => entry.user.status !== 'idle').length,
    [resolvedUsers]
  );

  const editingCount = useMemo(
    () => resolvedUsers.filter((entry) => entry.user.status === 'editing').length,
    [resolvedUsers]
  );

  const cursorEntries = useMemo<CursorEntry[]>(() => {
    const list: CursorEntry[] = [];
    for (const entry of resolvedUsers) {
      if (entry.user.cursor) {
        list.push({ entry, cursor: entry.user.cursor });
      }
    }
    return list;
  }, [resolvedUsers]);

  useEffect(() => {
    if (!isOverflowOpen) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing) return;
      if (event.key === 'Escape') {
        setOverflowOpen(false);
      }
    };

    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target;
      if (
        target instanceof Node &&
        overflowContainerRef.current &&
        !overflowContainerRef.current.contains(target)
      ) {
        setOverflowOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [isOverflowOpen]);

  const markAvatarFailed = (userId: string, src: string) => {
    const key = `${userId}:${src}`;
    setFailedAvatars((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  };

  const handleAvatarClick = (entry: ResolvedPresenceUser) => {
    setSelectedUserId((prev) => (prev === entry.user.id ? null : entry.user.id));
    onUserSelect?.(entry.user);
  };

  const handleOverflowUserClick = (entry: ResolvedPresenceUser) => {
    setSelectedUserId(entry.user.id);
    setOverflowOpen(false);
    onUserSelect?.(entry.user);
  };

  const sizeClasses = getSizeClasses(size);

  const merged = mergeProps({
    themeTarget: themeProps('live-presence-indicator', {
      size,
      count: resolvedUsers.length,
      showCursors,
      overflowOpen: isOverflowOpen,
    }),
    baseClassName: 'inline-flex flex-col gap-3 max-w-full',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const renderAvatarContent = (entry: ResolvedPresenceUser, avatarClass: string) => {
    const failureKey = `${entry.user.id}:${entry.safeAvatarSrc}`;
    const showImage = Boolean(entry.safeAvatarSrc) && !failedAvatars.has(failureKey);

    if (showImage) {
      return (
        <img
          src={entry.safeAvatarSrc}
          alt={entry.displayName}
          referrerPolicy="no-referrer"
          onError={() => markAvatarFailed(entry.user.id, entry.safeAvatarSrc)}
          className="w-full h-full object-cover rounded-full"
        />
      );
    }

    return (
      <span
        aria-hidden="true"
        className={cx(
          'w-full h-full rounded-full flex items-center justify-center font-semibold tracking-tight select-none',
          avatarClass
        )}
        style={{
          backgroundColor: entry.accentColor,
          color: getAccessibleContrastText(entry.accentColor),
        }}
      >
        {entry.initials}
      </span>
    );
  };

  return (
    <div ref={ref} role="group" aria-label={ariaLabel} {...rest} {...merged}>
      {resolvedUsers.length === 0 ? (
        <div
          data-empty="true"
          className="prism-well rounded-full px-3.5 py-1.5 inline-flex items-center gap-2 text-xs font-medium w-fit"
          style={{ color: 'var(--prism-text-secondary)' }}
        >
          <Users aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
          <span>No active collaborators</span>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center">
            <div className="flex items-center -space-x-2">
              {visibleUsers.map((entry) => {
                const isSelected = selectedEntry?.user.id === entry.user.id;
                return (
                  <button
                    key={entry.user.id}
                    type="button"
                    aria-label={`${entry.displayName} (${entry.statusMeta.label})`}
                    aria-pressed={isSelected}
                    data-user-id={entry.user.id}
                    data-status={entry.user.status}
                    data-selected={isSelected ? 'true' : undefined}
                    onClick={() => handleAvatarClick(entry)}
                    className={cx(
                      'prism-crystal prism-focus-ring relative rounded-full p-0.5 inline-flex items-center justify-center shrink-0 cursor-pointer transition-transform enabled:hover:z-10 enabled:hover:-translate-y-0.5',
                      sizeClasses.avatar,
                      isSelected && 'z-10 ring-2 ring-[var(--prism-focus-ring)]'
                    )}
                    style={{
                      borderWidth: '2px',
                      borderStyle: 'solid',
                      borderColor: entry.accentColor,
                    }}
                  >
                    <span className="w-full h-full rounded-full overflow-hidden flex items-center justify-center">
                      {renderAvatarContent(entry, sizeClasses.avatar)}
                    </span>
                    <span
                      aria-hidden="true"
                      data-status-dot={entry.user.status}
                      className={cx(
                        'absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-white dark:border-slate-900',
                        sizeClasses.dot,
                        entry.statusMeta.pulse && 'animate-pulse'
                      )}
                      style={{ backgroundColor: entry.statusMeta.tokenVar }}
                    />
                  </button>
                );
              })}
            </div>

            {overflowUsers.length > 0 ? (
              <div ref={overflowContainerRef} className="relative ml-1.5">
                <button
                  type="button"
                  aria-label={`Show ${overflowUsers.length} more collaborators`}
                  aria-expanded={isOverflowOpen}
                  aria-controls={isOverflowOpen ? popoverId : undefined}
                  aria-haspopup="dialog"
                  data-overflow-trigger="true"
                  onClick={() => setOverflowOpen((prev) => !prev)}
                  className={cx(
                    'prism-crystal prism-focus-ring rounded-full inline-flex items-center justify-center font-mono font-semibold tabular-nums cursor-pointer transition-transform enabled:hover:scale-105',
                    sizeClasses.overflow
                  )}
                  style={{ color: 'var(--prism-text-primary)' }}
                >
                  +{overflowUsers.length}
                </button>

                {isOverflowOpen ? (
                  <div
                    id={popoverId}
                    role="dialog"
                    aria-label="Additional collaborators"
                    data-overflow-popover="true"
                    className="prism-slab absolute left-0 top-full mt-2 z-40 w-72 p-3 space-y-2"
                  >
                    <div
                      className="flex items-center justify-between gap-2 pb-1.5 border-b"
                      style={{ borderColor: 'var(--prism-divider)' }}
                    >
                      <span
                        className="text-xs font-semibold tracking-tight"
                        style={{ color: 'var(--prism-text-primary)' }}
                      >
                        {overflowUsers.length} more{' '}
                        {overflowUsers.length === 1 ? 'collaborator' : 'collaborators'}
                      </span>
                      <button
                        type="button"
                        aria-label="Close collaborators list"
                        onClick={() => setOverflowOpen(false)}
                        className="prism-focus-ring rounded-lg p-1 cursor-pointer"
                        style={{ color: 'var(--prism-text-secondary)' }}
                      >
                        <X aria-hidden="true" className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <ul className="space-y-1 max-h-60 overflow-y-auto">
                      {overflowUsers.map((entry) => (
                        <li key={entry.user.id}>
                          <button
                            type="button"
                            data-overflow-user-id={entry.user.id}
                            onClick={() => handleOverflowUserClick(entry)}
                            className="prism-focus-ring w-full px-2 py-1.5 rounded-xl flex items-start gap-2.5 text-left transition-colors cursor-pointer enabled:hover:bg-white/55 dark:enabled:hover:bg-white/10"
                          >
                            <span
                              className="prism-crystal relative w-8 h-8 rounded-full p-0.5 inline-flex items-center justify-center shrink-0 mt-0.5"
                              style={{
                                borderWidth: '1.5px',
                                borderStyle: 'solid',
                                borderColor: entry.accentColor,
                              }}
                            >
                              <span className="w-full h-full rounded-full overflow-hidden flex items-center justify-center">
                                {renderAvatarContent(entry, 'text-[10px]')}
                              </span>
                              <span
                                aria-hidden="true"
                                className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white dark:border-slate-900"
                                style={{ backgroundColor: entry.statusMeta.tokenVar }}
                              />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center justify-between gap-1.5">
                                <span
                                  className="text-xs font-semibold truncate"
                                  style={{ color: 'var(--prism-text-primary)' }}
                                >
                                  {entry.user.name}
                                </span>
                                <span
                                  className="text-[10px] font-medium shrink-0"
                                  style={{ color: entry.statusMeta.tokenVar }}
                                >
                                  {entry.statusMeta.label}
                                </span>
                              </span>
                              {entry.user.role ? (
                                <span
                                  className="block text-[11px] truncate"
                                  style={{ color: 'var(--prism-text-secondary)' }}
                                >
                                  {entry.user.role}
                                </span>
                              ) : null}
                              {entry.user.activity ? (
                                <span
                                  className="block text-[11px] truncate mt-0.5"
                                  style={{ color: 'var(--prism-text-secondary)' }}
                                >
                                  {entry.user.activity}
                                </span>
                              ) : null}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          {showCountLabel ? (
            <div
              data-presence-summary="true"
              className="inline-flex items-center gap-1.5 text-xs font-medium"
            >
              <span
                className="prism-crystal rounded-full px-2.5 py-1 inline-flex items-center gap-1.5 tabular-nums"
                style={{ color: 'var(--prism-text-primary)' }}
              >
                <span
                  aria-hidden="true"
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{
                    backgroundColor:
                      activeCount > 0
                        ? 'var(--prism-success-main)'
                        : 'var(--prism-text-disabled)',
                  }}
                />
                <span>
                  {activeCount > 0 ? `${activeCount} active` : `${resolvedUsers.length} idle`}
                </span>
              </span>
              {editingCount > 0 ? (
                <span className="prism-emerald rounded-full px-2.5 py-1 text-[11px] font-semibold tabular-nums">
                  {editingCount} editing
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      )}

      {selectedEntry ? (
        <div
          role="status"
          aria-live="polite"
          data-selected-user-pill={selectedEntry.user.id}
          className="prism-crystal rounded-full pl-3 pr-2 py-1.5 inline-flex items-center gap-2.5 w-fit max-w-full text-xs"
        >
          <span
            aria-hidden="true"
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: selectedEntry.accentColor }}
          />
          <span className="min-w-0 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span
              className="font-semibold truncate"
              style={{ color: 'var(--prism-text-primary)' }}
            >
              {selectedEntry.user.name}
            </span>
            {selectedEntry.user.role ? (
              <span
                className="truncate"
                style={{ color: 'var(--prism-text-secondary)' }}
              >
                {selectedEntry.user.role}
              </span>
            ) : null}
            <span
              className="prism-well rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{ color: selectedEntry.statusMeta.tokenVar }}
            >
              {selectedEntry.statusMeta.label}
            </span>
            {selectedEntry.user.activity ? (
              <span
                className="truncate"
                style={{ color: 'var(--prism-text-secondary)' }}
              >
                {selectedEntry.user.activity}
              </span>
            ) : null}
          </span>
          <button
            type="button"
            aria-label="Close collaborator details"
            onClick={() => setSelectedUserId(null)}
            className="prism-focus-ring rounded-full p-1 cursor-pointer shrink-0"
            style={{ color: 'var(--prism-text-secondary)' }}
          >
            <X aria-hidden="true" className="w-3 h-3" />
          </button>
        </div>
      ) : null}

      {showCursors ? (
        <div
          role="region"
          aria-label={cursorStageLabel}
          data-cursor-stage="true"
          className="prism-well prism-studio-grid relative w-full min-h-[180px] rounded-2xl overflow-hidden border p-3"
          style={{ borderColor: 'var(--prism-well-border)' }}
        >
          <div className="flex items-center justify-between gap-2 pointer-events-none">
            <span
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: 'var(--prism-text-secondary)' }}
            >
              {cursorStageLabel}
            </span>
            <span
              className="font-mono text-[11px] tabular-nums"
              style={{ color: 'var(--prism-text-secondary)' }}
            >
              {cursorEntries.length} {cursorEntries.length === 1 ? 'cursor' : 'cursors'}
            </span>
          </div>

          {cursorEntries.length === 0 ? (
            <div
              className="absolute inset-0 flex items-center justify-center text-xs pointer-events-none"
              style={{ color: 'var(--prism-text-secondary)' }}
            >
              No live cursors active
            </div>
          ) : (
            cursorEntries.map(({ entry, cursor }) => {
              const safeX = clampNumber(cursor.x, 0, 100);
              const safeY = clampNumber(cursor.y, 0, 100);
              const pillText = cursor.label ?? entry.displayName;
              const flipLeft = safeX > 55;
              const flipUp = safeY > 75;

              return (
                <div
                  key={entry.user.id}
                  data-cursor-user={entry.user.id}
                  data-cursor-x={String(safeX)}
                  data-cursor-y={String(safeY)}
                  className={cx(
                    'absolute pointer-events-none select-none flex items-start gap-1 transition-all duration-150',
                    flipLeft && 'flex-row-reverse -translate-x-full',
                    flipUp && '-translate-y-full'
                  )}
                  style={{
                    left: `${safeX}%`,
                    top: `${safeY}%`,
                  }}
                >
                  <svg
                    aria-hidden="true"
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    className="shrink-0 drop-shadow-xs"
                  >
                    <path
                      d="M2 1.5L13.5 7.5L8.2 9.1L6.2 14.2L2 1.5Z"
                      fill={entry.accentColor}
                      stroke="var(--prism-primary-contrast)"
                      strokeWidth="1.25"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span
                    className="mt-2 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap shadow-xs"
                    style={{
                      backgroundColor: entry.accentColor,
                      color: getAccessibleContrastText(entry.accentColor),
                    }}
                  >
                    {pillText}
                  </span>
                </div>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}

LivePresenceIndicator.displayName = 'LivePresenceIndicator';
