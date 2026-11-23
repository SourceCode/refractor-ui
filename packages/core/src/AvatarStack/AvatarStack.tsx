'use client';

import {
  memo,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { Users, X } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useMergedRefs } from '../hooks/useMergedRefs';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber, sanitizeUrl } from '../utils/sanitize';
import { STYLE_BORDER_DIVIDER, STYLE_PRIMARY_MAIN, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type AvatarStackSize = 'sm' | 'md' | 'lg';
export type AvatarStackStatus = 'online' | 'away' | 'busy' | 'offline';
export type AvatarStackTone = 'primary' | 'secondary' | 'emerald' | 'amber' | 'info';

export interface AvatarStackUser {
  /** Unique collaborator identifier (duplicate IDs are deduplicated preserving first entry). */
  id: string;
  /** Display name rendered in tooltips, directory rows, accessible labels, and initials fallback. */
  name: string;
  /** Optional team role or title displayed in the full collaborator directory popover. */
  role?: string;
  /** Optional portrait image URL (sanitized via sanitizeUrl; falls back to tinted initials on omission, unsafe scheme, or load error). */
  src?: string;
  /** Optional live presence status driving the presence indicator dot and status badge. */
  status?: AvatarStackStatus;
  /** Optional semantic optical tint token used for the initials fallback surface. */
  tone?: AvatarStackTone;
}

export interface AvatarStackProps extends BaseProps<HTMLDivElement> {
  /** Collaborators displayed in the overlapping stack. Defaults to 7 product team members when omitted; renders a role="status" empty state when []. */
  users?: ReadonlyArray<AvatarStackUser>;
  /** Maximum avatars rendered directly in the cluster before collapsing into the +N pill (default 4, clamped 1..12). */
  maxVisible?: number;
  /** Visual scale for avatars, presence dots, and counter pill ('sm' | 'md' | 'lg', default 'md'). */
  size?: AvatarStackSize;
  /** Callback invoked when a visible avatar or directory popover member is selected. */
  onSelectUser?: (user: AvatarStackUser) => void;
  /** Accessible group label and popover heading (default 'Active collaborators'). */
  label?: string;
}

const DEFAULT_USERS: ReadonlyArray<AvatarStackUser> = [
  {
    id: 'clara-vance',
    name: 'Clara Vance',
    role: 'Principal Product Designer',
    status: 'online',
    tone: 'primary',
  },
  {
    id: 'marcus-chen',
    name: 'Marcus Chen',
    role: 'Staff Frontend Architect',
    status: 'online',
    tone: 'info',
  },
  {
    id: 'elena-rostova',
    name: 'Elena Rostova',
    role: 'Accessibility Lead',
    status: 'online',
    tone: 'emerald',
  },
  {
    id: 'devon-park',
    name: 'Devon Park',
    role: 'Design Systems Engineer',
    status: 'busy',
    tone: 'secondary',
  },
  {
    id: 'sora-takahashi',
    name: 'Sora Takahashi',
    role: 'Motion & Optics Specialist',
    status: 'away',
    tone: 'amber',
  },
  {
    id: 'priya-nair',
    name: 'Priya Nair',
    role: 'Product Manager',
    status: 'online',
    tone: 'primary',
  },
  {
    id: 'mateo-silva',
    name: 'Mateo Silva',
    role: 'QA Automation Lead',
    status: 'offline',
    tone: 'info',
  },
];

interface ToneTokens {
  background: string;
  color: string;
}

interface StatusMeta {
  label: string;
  tokenVar: string;
}

interface SizeClasses {
  avatar: string;
  dot: string;
  counter: string;
}

interface ResolvedUser {
  user: AvatarStackUser;
  displayName: string;
  safeSrc: string;
  initials: string;
  tone: AvatarStackTone;
  toneTokens: ToneTokens;
  statusMeta: StatusMeta | null;
}

function getFallbackTone(index: number): AvatarStackTone {
  switch (index % 5) {
    case 0:
      return 'primary';
    case 1:
      return 'info';
    case 2:
      return 'emerald';
    case 3:
      return 'secondary';
    default:
      return 'amber';
  }
}

function getToneTokens(tone: AvatarStackTone): ToneTokens {
  switch (tone) {
    case 'primary':
      return {
        background:
          'linear-gradient(145deg, var(--prism-primary-dark), var(--prism-primary-main), var(--prism-primary-light))',
        color: 'var(--prism-primary-contrast)',
      };
    case 'secondary':
      return {
        background:
          'linear-gradient(145deg, var(--prism-secondary-dark), var(--prism-secondary-main), var(--prism-secondary-light))',
        color: 'var(--prism-secondary-contrast)',
      };
    case 'emerald':
      return {
        background:
          'linear-gradient(145deg, var(--prism-success-dark), var(--prism-success-main), var(--prism-success-light))',
        color: 'var(--prism-success-contrast)',
      };
    case 'amber':
      return {
        background:
          'linear-gradient(145deg, var(--prism-primary-light), var(--prism-warning-main))',
        color: 'var(--prism-warning-contrast)',
      };
    case 'info':
      return {
        background:
          'linear-gradient(145deg, var(--prism-info-dark), var(--prism-info-main), var(--prism-info-light))',
        color: 'var(--prism-info-contrast)',
      };
  }
}

function getStatusMeta(status: AvatarStackStatus): StatusMeta {
  switch (status) {
    case 'online':
      return { label: 'Online', tokenVar: 'var(--prism-success-main)' };
    case 'away':
      return { label: 'Away', tokenVar: 'var(--prism-warning-main)' };
    case 'busy':
      return { label: 'Busy', tokenVar: 'var(--prism-error-main)' };
    case 'offline':
      return { label: 'Offline', tokenVar: 'var(--prism-text-disabled)' };
  }
}

function getSizeClasses(size: AvatarStackSize): SizeClasses {
  switch (size) {
    case 'sm':
      return {
        avatar: 'w-7 h-7 text-[10px]',
        dot: 'w-2 h-2',
        counter: 'h-7 min-w-7 px-2 text-[10px]',
      };
    case 'lg':
      return {
        avatar: 'w-11 h-11 text-sm',
        dot: 'w-3 h-3',
        counter: 'h-11 min-w-11 px-3 text-sm',
      };
    case 'md':
      return {
        avatar: 'w-9 h-9 text-xs',
        dot: 'w-2.5 h-2.5',
        counter: 'h-9 min-w-9 px-2.5 text-xs',
      };
  }
}

function deriveInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((segment) => segment.length > 0);
  const [first, ...rest] = parts;
  if (!first) return '?';
  const last = rest[rest.length - 1];
  if (!last) {
    return first.slice(0, 2).toUpperCase();
  }
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

function AvatarStackInner({
  users,
  maxVisible = 4,
  size = 'md',
  onSelectUser,
  label = 'Active collaborators',
  'aria-label': ariaLabelProp,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: AvatarStackProps) {
  const override = useComponentOverride('AvatarStack');
  const popoverId = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const mergedRef = useMergedRefs(ref, containerRef);

  const [popoverOpen, setPopoverOpen] = useState(false);
  const [failedSrcKeys, setFailedSrcKeys] = useState<Set<string>>(() => new Set());

  const sourceUsers = users ?? DEFAULT_USERS;
  const safeMaxVisible = Math.round(clampNumber(maxVisible, 1, 12, 4));
  const trimmedLabel = label.trim() || 'Active collaborators';

  const resolvedUsers = useMemo<ResolvedUser[]>(() => {
    const seen = new Set<string>();
    const list: ResolvedUser[] = [];
    let idx = 0;

    for (const user of sourceUsers) {
      if (seen.has(user.id)) continue;
      seen.add(user.id);
      const tone = user.tone ?? getFallbackTone(idx);
      list.push({
        user,
        displayName: user.name.trim() || 'Collaborator',
        safeSrc: user.src ? sanitizeUrl(user.src, true) : '',
        initials: deriveInitials(user.name),
        tone,
        toneTokens: getToneTokens(tone),
        statusMeta: user.status ? getStatusMeta(user.status) : null,
      });
      idx += 1;
    }

    return list;
  }, [sourceUsers]);

  const visibleUsers = useMemo(
    () => resolvedUsers.slice(0, safeMaxVisible),
    [resolvedUsers, safeMaxVisible]
  );

  const overflowCount = Math.max(0, resolvedUsers.length - safeMaxVisible);
  const isPopoverOpen = popoverOpen && overflowCount > 0;
  const isEmpty = resolvedUsers.length === 0;
  const sizeClasses = getSizeClasses(size);

  useEffect(() => {
    if (!isPopoverOpen) return undefined;

    const handleWindowKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing) return;
      if (event.key === 'Escape') {
        setPopoverOpen(false);
        triggerRef.current?.focus();
      }
    };

    const handleOutsideMouseDown = (event: MouseEvent) => {
      const target = event.target;
      if (
        target instanceof Node &&
        containerRef.current &&
        !containerRef.current.contains(target)
      ) {
        setPopoverOpen(false);
      }
    };

    window.addEventListener('keydown', handleWindowKeyDown);
    document.addEventListener('mousedown', handleOutsideMouseDown);
    return () => {
      window.removeEventListener('keydown', handleWindowKeyDown);
      document.removeEventListener('mousedown', handleOutsideMouseDown);
    };
  }, [isPopoverOpen]);

  const markImageFailed = (userId: string, src: string) => {
    const failureKey = `${userId}:${src}`;
    setFailedSrcKeys((prev) => {
      const next = new Set(prev);
      next.add(failureKey);
      return next;
    });
  };

  const handleSelectMember = (user: AvatarStackUser) => {
    setPopoverOpen(false);
    onSelectUser?.(user);
  };

  const handleMemberKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    user: AvatarStackUser
  ) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSelectMember(user);
    }
  };

  const handleCounterKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setPopoverOpen((prev) => !prev);
    }
  };

  const handleClosePopover = () => {
    setPopoverOpen(false);
    triggerRef.current?.focus();
  };

  const clusterPartClass = stableClassName('avatar-stack', 'cluster');
  const avatarPartClass = stableClassName('avatar-stack', 'avatar');
  const counterPartClass = stableClassName('avatar-stack', 'counter');
  const popoverPartClass = stableClassName('avatar-stack', 'popover');
  const emptyPartClass = stableClassName('avatar-stack', 'empty');

  const merged = mergeProps({
    themeTarget: themeProps('avatar-stack', {
      size,
      count: resolvedUsers.length,
      overflow: overflowCount > 0,
      open: isPopoverOpen,
      empty: isEmpty,
    }),
    baseClassName: 'relative inline-flex flex-wrap items-center gap-2 min-w-0 max-w-full',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const renderAvatarMedia = (entry: ResolvedUser, textClass: string) => {
    const failureKey = `${entry.user.id}:${entry.safeSrc}`;
    const showImage = Boolean(entry.safeSrc) && !failedSrcKeys.has(failureKey);

    if (showImage) {
      return (
        <img
          src={entry.safeSrc}
          alt={entry.displayName}
          referrerPolicy="no-referrer"
          onError={() => markImageFailed(entry.user.id, entry.safeSrc)}
          className="w-full h-full object-cover rounded-full"
        />
      );
    }

    return (
      <span
        aria-hidden="true"
        className={cx(
          'w-full h-full rounded-full flex items-center justify-center font-semibold tracking-tight select-none',
          textClass
        )}
        style={{
          background: entry.toneTokens.background,
          color: entry.toneTokens.color,
        }}
      >
        {entry.initials}
      </span>
    );
  };

  return (
    <div
      ref={mergedRef}
      role="group"
      aria-label={ariaLabelProp ?? trimmedLabel}
      {...rest}
      {...merged}
    >
      {isEmpty ? (
        <div
          role="status"
          aria-live="polite"
          className={cx(
            emptyPartClass,
            'prism-well rounded-full px-3.5 py-1.5 inline-flex items-center gap-2 text-xs font-medium min-w-0 max-w-full'
          )}
          style={STYLE_TEXT_SECONDARY}
        >
          <Users aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">No active collaborators</span>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2 min-w-0 max-w-full">
          <div className={cx(clusterPartClass, 'flex items-center -space-x-2.5')}>
            {visibleUsers.map((entry) => {
              const accessibleName = entry.statusMeta
                ? `${entry.displayName} (${entry.statusMeta.label})`
                : entry.displayName;

              return (
                <button
                  key={entry.user.id}
                  type="button"
                  aria-label={accessibleName}
                  data-user-id={entry.user.id}
                  data-tone={entry.tone}
                  data-status={entry.user.status}
                  onClick={() => handleSelectMember(entry.user)}
                  onKeyDown={(event) => handleMemberKeyDown(event, entry.user)}
                  className={cx(
                    avatarPartClass,
                    'prism-crystal prism-focus-ring relative z-0 rounded-full p-0.5 inline-flex items-center justify-center shrink-0 cursor-pointer transition-transform duration-150 hover:z-20 focus-visible:z-20 hover:-translate-y-0.5',
                    sizeClasses.avatar
                  )}
                >
                  <span className="w-full h-full rounded-full overflow-hidden flex items-center justify-center">
                    {renderAvatarMedia(entry, sizeClasses.avatar)}
                  </span>
                  {entry.statusMeta ? (
                    <span
                      aria-hidden="true"
                      data-status-dot={entry.user.status}
                      className={cx(
                        'absolute -bottom-0.5 -right-0.5 rounded-full border-2',
                        sizeClasses.dot
                      )}
                      style={{
                        backgroundColor: entry.statusMeta.tokenVar,
                        borderColor: 'var(--prism-bg-start)',
                      }}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>

          {overflowCount > 0 ? (
            <button
              ref={triggerRef}
              type="button"
              aria-expanded={isPopoverOpen}
              aria-haspopup="dialog"
              aria-controls={isPopoverOpen ? popoverId : undefined}
              aria-label={`Show ${overflowCount} more users`}
              data-overflow-trigger="true"
              onClick={() => setPopoverOpen((prev) => !prev)}
              onKeyDown={handleCounterKeyDown}
              className={cx(
                counterPartClass,
                'prism-crystal prism-focus-ring rounded-full inline-flex items-center justify-center font-mono font-semibold tabular-nums shrink-0 cursor-pointer transition-transform duration-150 hover:scale-105',
                sizeClasses.counter
              )}
              style={STYLE_TEXT_PRIMARY}
            >
              +{overflowCount}
            </button>
          ) : null}
        </div>
      )}

      {isPopoverOpen ? (
        <div
          id={popoverId}
          role="dialog"
          aria-label={trimmedLabel}
          data-overflow-popover="true"
          className={cx(
            popoverPartClass,
            'prism-slab absolute left-0 top-full mt-2 z-40 w-[min(18rem,calc(100vw-2rem))] max-w-full p-3 space-y-2'
          )}
        >
          <div
            className="flex items-center justify-between gap-2 pb-1.5 border-b min-w-0"
            style={STYLE_BORDER_DIVIDER}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className="text-xs font-semibold tracking-tight truncate"
                style={STYLE_TEXT_PRIMARY}
              >
                {trimmedLabel}
              </span>
              <span
                className="prism-well rounded-full px-1.5 py-0.5 text-[10px] font-mono font-semibold tabular-nums shrink-0"
                style={STYLE_TEXT_SECONDARY}
              >
                {resolvedUsers.length}
              </span>
            </div>
            <button
              type="button"
              aria-label="Close users list"
              onClick={handleClosePopover}
              className="prism-focus-ring rounded-lg p-1 cursor-pointer shrink-0"
              style={STYLE_TEXT_SECONDARY}
            >
              <X aria-hidden="true" className="w-3.5 h-3.5" />
            </button>
          </div>

          <ul className="space-y-1 max-h-64 overflow-y-auto min-w-0">
            {resolvedUsers.map((entry, idx) => {
              const isOverflow = idx >= safeMaxVisible;

              return (
                <li key={entry.user.id} className="min-w-0">
                  <button
                    type="button"
                    data-popover-user-id={entry.user.id}
                    data-overflow-member={isOverflow ? 'true' : 'false'}
                    onClick={() => handleSelectMember(entry.user)}
                    onKeyDown={(event) => handleMemberKeyDown(event, entry.user)}
                    className={cx(
                      'prism-focus-ring w-full px-2 py-1.5 rounded-xl flex items-center gap-2.5 text-left transition-colors cursor-pointer min-w-0',
                      isOverflow ? 'prism-well' : 'hover:opacity-90'
                    )}
                  >
                    <span className="prism-crystal relative w-8 h-8 rounded-full p-0.5 inline-flex items-center justify-center shrink-0">
                      <span className="w-full h-full rounded-full overflow-hidden flex items-center justify-center">
                        {renderAvatarMedia(entry, 'text-[10px]')}
                      </span>
                      {entry.statusMeta ? (
                        <span
                          aria-hidden="true"
                          className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border"
                          style={{
                            backgroundColor: entry.statusMeta.tokenVar,
                            borderColor: 'var(--prism-bg-start)',
                          }}
                        />
                      ) : null}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-1.5 min-w-0">
                        <span
                          className="text-xs font-semibold truncate"
                          style={STYLE_TEXT_PRIMARY}
                        >
                          {entry.displayName}
                        </span>
                        <span className="inline-flex items-center gap-1 shrink-0">
                          {isOverflow ? (
                            <span
                              className="prism-crystal rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
                              style={STYLE_PRIMARY_MAIN}
                            >
                              Overflow
                            </span>
                          ) : null}
                          {entry.statusMeta ? (
                            <span
                              className="text-[10px] font-medium"
                              style={{ color: entry.statusMeta.tokenVar }}
                            >
                              {entry.statusMeta.label}
                            </span>
                          ) : null}
                        </span>
                      </span>
                      {entry.user.role ? (
                        <span
                          className="block text-[11px] truncate"
                          style={STYLE_TEXT_SECONDARY}
                        >
                          {entry.user.role}
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export const AvatarStack = memo(AvatarStackInner);
AvatarStack.displayName = 'AvatarStack';
