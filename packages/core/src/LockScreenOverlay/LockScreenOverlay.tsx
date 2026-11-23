'use client';

import {
  memo,
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import {
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Moon,
  Power,
  RotateCw,
  ShieldAlert,
  ShieldCheck,
  Unlock,
  UserCheck,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { STYLE_BORDER_DIVIDER, STYLE_ERROR_MAIN, STYLE_PRIMARY_MAIN, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type LockScreenDisplayMode = 'inline' | 'fullscreen';

export type LockScreenPowerAction = 'sleep' | 'restart' | 'shutdown';

export interface LockScreenUserAccount {
  /** Stable unique identifier for the user account. */
  id: string;
  /** Display name rendered in the avatar switcher and active profile header. */
  name: string;
  /** Secondary role or session subtitle for the user account. */
  role: string;
  /** Short avatar monogram displayed inside the circular optical avatar chip. */
  initials: string;
  /** Whether unlocking this account requires a password or PIN entry. */
  requiresPassword: boolean;
}

type LockScreenOverlayBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface LockScreenOverlayProps extends LockScreenOverlayBaseProps {
  /** Presentation mode: `'inline'` embeds inside a `prism-slab`; `'fullscreen'` renders a full-viewport frosted barrier and returns `null` when unlocked. */
  mode?: LockScreenDisplayMode;
  /** Controlled locked state. */
  locked?: boolean;
  /** Initial uncontrolled locked state (defaults to `true`). */
  defaultLocked?: boolean;
  /** Large tabular clock display string (defaults to `'10:42'`). */
  timeLabel?: string;
  /** Date subtitle rendered beneath the clock (defaults to `'Sunday, November 22'`). */
  dateLabel?: string;
  /** User accounts available in the avatar switcher (defaults to Clara Vance, Marcus Chen, and Guest Session). */
  users?: ReadonlyArray<LockScreenUserAccount>;
  /** Initial selected user account id when mounted (falls back to the first available account). */
  defaultSelectedUserId?: string;
  /** Callback invoked on unlock attempt; return `false` to reject the credential and stay locked. */
  onUnlock?: (user: LockScreenUserAccount, credential: string) => boolean | void;
  /** Callback invoked whenever lock state changes (`false` on unlock, `true` on re-lock). */
  onLockChange?: (locked: boolean) => void;
  /** Callback invoked when a quick power control (`'sleep'`, `'restart'`, or `'shutdown'`) is triggered. */
  onPowerAction?: (action: LockScreenPowerAction) => void;
  /** Disables account switching, credential entry, unlocking, re-locking, and power controls. */
  disabled?: boolean;
}

interface PowerActionDescriptor {
  action: LockScreenPowerAction;
  label: string;
  announcement: string;
  accentVar: string;
  icon: ReactNode;
}

const DEFAULT_TIME_LABEL = '10:42';
const DEFAULT_DATE_LABEL = 'Sunday, November 22';

const DEFAULT_LOCK_SCREEN_USERS: ReadonlyArray<LockScreenUserAccount> = [
  {
    id: 'clara-vance',
    name: 'Clara Vance',
    role: 'Lead Optical Architect',
    initials: 'CV',
    requiresPassword: true,
  },
  {
    id: 'marcus-chen',
    name: 'Marcus Chen',
    role: 'Systems Engineer',
    initials: 'MC',
    requiresPassword: true,
  },
  {
    id: 'guest-session',
    name: 'Guest Session',
    role: 'Temporary Sandbox',
    initials: 'GS',
    requiresPassword: false,
  },
];

const POWER_ACTIONS: ReadonlyArray<PowerActionDescriptor> = [
  {
    action: 'sleep',
    label: 'Sleep',
    announcement: 'Sleep requested.',
    accentVar: 'var(--prism-info-main)',
    icon: <Moon aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />,
  },
  {
    action: 'restart',
    label: 'Restart',
    announcement: 'Restart requested.',
    accentVar: 'var(--prism-warning-main)',
    icon: <RotateCw aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />,
  },
  {
    action: 'shutdown',
    label: 'Shut Down',
    announcement: 'Shut down requested.',
    accentVar: 'var(--prism-error-main)',
    icon: <Power aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />,
  },
];

function dedupeUsers(
  list: ReadonlyArray<LockScreenUserAccount>
): LockScreenUserAccount[] {
  const seen = new Set<string>();
  const out: LockScreenUserAccount[] = [];
  for (const user of list) {
    if (!seen.has(user.id)) {
      seen.add(user.id);
      out.push(user);
    }
  }
  return out;
}

function getDisplayName(user: LockScreenUserAccount): string {
  return user.name.trim() || 'User Account';
}

function getDisplayRole(user: LockScreenUserAccount): string {
  return user.role.trim() || 'Local Account';
}

function getDisplayInitials(user: LockScreenUserAccount): string {
  const trimmed = user.initials.trim();
  if (trimmed.length > 0) {
    return trimmed.slice(0, 2).toUpperCase();
  }
  const nameChars = user.name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0))
    .join('');
  return nameChars.slice(0, 2).toUpperCase() || 'UA';
}

function LockScreenOverlayInner({
  mode = 'inline',
  locked,
  defaultLocked = true,
  timeLabel = DEFAULT_TIME_LABEL,
  dateLabel = DEFAULT_DATE_LABEL,
  users,
  defaultSelectedUserId,
  onUnlock,
  onLockChange,
  onPowerAction,
  disabled = false,
  'aria-label': ariaLabel,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: LockScreenOverlayProps) {
  const baseId = useId();
  const safeBaseId = baseId.replace(/[^a-zA-Z0-9_-]/g, '');
  const passwordInputId = `lock-screen-password-${safeBaseId}`;
  const errorId = `lock-screen-error-${safeBaseId}`;
  const override = useComponentOverride('LockScreenOverlay');

  const resolvedUsers = useMemo<ReadonlyArray<LockScreenUserAccount>>(
    () => dedupeUsers(users ?? DEFAULT_LOCK_SCREEN_USERS),
    [users]
  );

  const isLockedControlled = locked !== undefined;
  const [uncontrolledLocked, setUncontrolledLocked] =
    useState<boolean>(defaultLocked);
  const isLocked = isLockedControlled ? locked : uncontrolledLocked;

  const [selectedUserId, setSelectedUserId] = useState<string>(() => {
    if (
      defaultSelectedUserId &&
      resolvedUsers.some((user) => user.id === defaultSelectedUserId)
    ) {
      return defaultSelectedUserId;
    }
    return resolvedUsers[0]?.id ?? '';
  });

  const selectedUser: LockScreenUserAccount | undefined =
    resolvedUsers.find((user) => user.id === selectedUserId) ??
    resolvedUsers[0];

  const [unlockedUser, setUnlockedUser] =
    useState<LockScreenUserAccount | null>(null);
  const [credential, setCredential] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<string>('');

  const radioRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const resolvedTimeLabel = timeLabel.trim() || DEFAULT_TIME_LABEL;
  const resolvedDateLabel = dateLabel.trim() || DEFAULT_DATE_LABEL;
  const resolvedAriaLabel = ariaLabel?.trim() || 'Lock screen';

  const clearCredentialState = useCallback(() => {
    setCredential('');
    setShowPassword(false);
    setErrorMessage(null);
  }, []);

  const handleSelectUser = useCallback(
    (user: LockScreenUserAccount) => {
      if (user.id === selectedUser?.id) {
        return;
      }
      setSelectedUserId(user.id);
      clearCredentialState();
      setAnnouncement(`Selected account ${getDisplayName(user)}.`);
    },
    [clearCredentialState, selectedUser?.id]
  );

  const handleRadioKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
      if (
        event.nativeEvent.isComposing ||
        disabled ||
        resolvedUsers.length <= 1
      ) {
        return;
      }
      let nextIndex: number | null = null;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        nextIndex = (currentIndex + 1) % resolvedUsers.length;
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        nextIndex =
          (currentIndex - 1 + resolvedUsers.length) % resolvedUsers.length;
      } else if (event.key === 'Home') {
        nextIndex = 0;
      } else if (event.key === 'End') {
        nextIndex = resolvedUsers.length - 1;
      }
      if (nextIndex !== null) {
        event.preventDefault();
        const target = resolvedUsers[nextIndex];
        if (target) {
          handleSelectUser(target);
          radioRefs.current.get(target.id)?.focus();
        }
      }
    },
    [disabled, handleSelectUser, resolvedUsers]
  );

  const handleCredentialChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setCredential(event.target.value);
      if (errorMessage !== null) {
        setErrorMessage(null);
      }
    },
    [errorMessage]
  );

  const handleTogglePasswordVisibility = useCallback(() => {
    setShowPassword((prev) => {
      const next = !prev;
      setAnnouncement(next ? 'Password visible.' : 'Password hidden.');
      return next;
    });
  }, []);

  const handleAttemptUnlock = useCallback(() => {
    if (disabled || !selectedUser) {
      return;
    }

    const displayName = getDisplayName(selectedUser);

    if (selectedUser.requiresPassword) {
      if (credential.trim().length === 0) {
        const msg = 'Enter your password or PIN to unlock.';
        setErrorMessage(msg);
        setAnnouncement(msg);
        return;
      }

      const submittedCredential = credential;
      const unlockResult = onUnlock?.(selectedUser, submittedCredential);
      if (unlockResult === false) {
        const msg = 'Incorrect password or PIN. Please try again.';
        setErrorMessage(msg);
        setAnnouncement(msg);
        return;
      }

      clearCredentialState();
      setUnlockedUser(selectedUser);
      if (!isLockedControlled) {
        setUncontrolledLocked(false);
      }
      onLockChange?.(false);
      setAnnouncement(`Unlocked session for ${displayName}.`);
      return;
    }

    const guestResult = onUnlock?.(selectedUser, '');
    if (guestResult === false) {
      const msg = `Unable to enter ${displayName}.`;
      setErrorMessage(msg);
      setAnnouncement(msg);
      return;
    }

    clearCredentialState();
    setUnlockedUser(selectedUser);
    if (!isLockedControlled) {
      setUncontrolledLocked(false);
    }
    onLockChange?.(false);
    setAnnouncement(`Entered ${displayName}.`);
  }, [
    clearCredentialState,
    credential,
    disabled,
    isLockedControlled,
    onLockChange,
    onUnlock,
    selectedUser,
  ]);

  const handleFormSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      handleAttemptUnlock();
    },
    [handleAttemptUnlock]
  );

  const handlePasswordKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (event.nativeEvent.isComposing || disabled) {
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        handleAttemptUnlock();
      }
    },
    [disabled, handleAttemptUnlock]
  );

  const handleRelock = useCallback(() => {
    clearCredentialState();
    if (!isLockedControlled) {
      setUncontrolledLocked(true);
    }
    onLockChange?.(true);
    setAnnouncement('Screen locked.');
  }, [clearCredentialState, isLockedControlled, onLockChange]);

  const handlePowerTrigger = useCallback(
    (descriptor: PowerActionDescriptor) => {
      onPowerAction?.(descriptor.action);
      setAnnouncement(descriptor.announcement);
    },
    [onPowerAction]
  );

  if (mode === 'fullscreen' && !isLocked) {
    return null;
  }

  const activeSessionUser = unlockedUser ?? selectedUser;
  const activeSessionName = activeSessionUser
    ? getDisplayName(activeSessionUser)
    : 'Active Session';
  const activeSessionRole = activeSessionUser
    ? getDisplayRole(activeSessionUser)
    : 'Unlocked Workspace';

  const idleStatusText = isLocked
    ? selectedUser
      ? `Locked — ${getDisplayName(selectedUser)} selected.`
      : 'Locked — no user accounts configured.'
    : `Unlocked — signed in as ${activeSessionName}.`;
  const liveStatusText = announcement || idleStatusText;

  const isFullscreenLocked = mode === 'fullscreen' && isLocked;

  const merged = mergeProps({
    themeTarget: themeProps('lock-screen-overlay', {
      mode,
      locked: isLocked,
      unlocked: !isLocked,
      disabled,
      requiresPassword: Boolean(selectedUser?.requiresPassword),
      error: Boolean(errorMessage),
    }),
    baseClassName: isFullscreenLocked
      ? 'fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 min-w-0 overflow-y-auto'
      : 'prism-slab relative w-full max-w-full min-w-0 p-5 sm:p-6 flex flex-col gap-5 overflow-hidden',
    overrideClassName: override?.className,
    userClassName: className,
    baseStyle: isFullscreenLocked
      ? {
          backgroundColor:
            'color-mix(in srgb, var(--prism-bg-end) 76%, transparent)',
          backdropFilter: 'blur(var(--prism-slab-blur-px))',
        }
      : {
          color: 'var(--prism-text-primary)',
        },
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const panelClass = stableClassName('lock-screen-overlay', 'panel');
  const clockClass = stableClassName('lock-screen-overlay', 'clock');
  const accountsClass = stableClassName('lock-screen-overlay', 'accounts');
  const avatarClass = stableClassName('lock-screen-overlay', 'avatar');
  const formClass = stableClassName('lock-screen-overlay', 'form');
  const powerClass = stableClassName('lock-screen-overlay', 'power');
  const unlockedClass = stableClassName('lock-screen-overlay', 'unlocked');
  const statusClass = stableClassName('lock-screen-overlay', 'status');

  // Inline Unlocked Confirmation Bar
  if (!isLocked) {
    return (
      <div
        ref={ref}
        role="region"
        aria-label={resolvedAriaLabel}
        aria-disabled={disabled ? 'true' : undefined}
        {...rest}
        {...merged}
      >
        <div
          data-part="unlocked"
          data-testid="lock-screen-unlocked-bar"
          className={cx(
            unlockedClass,
            'flex flex-wrap items-center justify-between gap-3 min-w-0'
          )}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <span
              aria-hidden="true"
              className="prism-emerald w-10 h-10 rounded-full inline-flex items-center justify-center shrink-0"
            >
              <Unlock className="w-4 h-4" />
            </span>

            <div className="flex flex-col min-w-0">
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                <span
                  className="text-sm font-semibold tracking-tight truncate"
                  style={STYLE_TEXT_PRIMARY}
                >
                  Session Unlocked
                </span>
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide shrink-0"
                  style={{
                    color: 'var(--prism-success-main)',
                    backgroundColor:
                      'color-mix(in srgb, var(--prism-success-main) 14%, transparent)',
                  }}
                >
                  <ShieldCheck aria-hidden="true" className="w-3 h-3" />
                  <span>Active</span>
                </span>
              </div>
              <span
                data-testid="lock-screen-unlocked-user"
                className="text-xs truncate"
                style={STYLE_TEXT_SECONDARY}
              >
                {activeSessionName} · {activeSessionRole}
              </span>
            </div>
          </div>

          <button
            type="button"
            disabled={disabled}
            onClick={handleRelock}
            className="prism-btn-secondary prism-focus-ring h-9 px-4 inline-flex items-center justify-center gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
          >
            <Lock
              aria-hidden="true"
              className="w-3.5 h-3.5 shrink-0 relative z-10"
            />
            <span className="relative z-10">Lock Screen</span>
          </button>
        </div>

        <p
          role="status"
          aria-live="polite"
          aria-atomic="true"
          data-testid="lock-screen-status"
          className={cx(
            statusClass,
            'prism-well rounded-xl px-3 py-1.5 text-[11px] truncate min-w-0 max-w-full'
          )}
          style={{
            color: 'var(--prism-text-secondary)',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'var(--prism-well-border)',
          }}
        >
          {liveStatusText}
        </p>
      </div>
    );
  }

  const lockedScreenBody = (
    <>
      {/* Large Tabular Clock & Date Header */}
      <header
        data-part="clock"
        className={cx(
          clockClass,
          'flex flex-col items-center text-center gap-1.5 min-w-0 max-w-full'
        )}
      >
        <span
          className="prism-well inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase shrink-0"
          style={STYLE_TEXT_SECONDARY}
        >
          <Lock
            aria-hidden="true"
            className="w-3 h-3 shrink-0"
            style={STYLE_PRIMARY_MAIN}
          />
          <span>Session Locked</span>
        </span>

        <div
          data-testid="lock-screen-time"
          className="font-mono text-4xl sm:text-5xl font-bold tracking-tight tabular-nums leading-none break-words max-w-full"
          style={STYLE_TEXT_PRIMARY}
        >
          {resolvedTimeLabel}
        </div>

        <div
          data-testid="lock-screen-date"
          className="text-xs sm:text-sm font-medium tracking-tight break-words max-w-full"
          style={STYLE_TEXT_SECONDARY}
        >
          {resolvedDateLabel}
        </div>
      </header>

      {/* User Avatar Switcher & Authentication Surface */}
      {selectedUser ? (
        <div className="flex flex-col items-center gap-4 min-w-0 max-w-full">
          {/* User Avatar Switcher */}
          <div
            role="radiogroup"
            aria-label="Select user account"
            aria-disabled={disabled ? 'true' : undefined}
            data-part="accounts"
            className={cx(
              accountsClass,
              'flex flex-wrap items-start justify-center gap-3 min-w-0 max-w-full'
            )}
          >
            {resolvedUsers.map((user, index) => {
              const isSelected = user.id === selectedUser.id;
              const userDisplayName = getDisplayName(user);
              const userInitials = getDisplayInitials(user);

              return (
                <button
                  key={user.id}
                  ref={(node) => {
                    if (node) {
                      radioRefs.current.set(user.id, node);
                    } else {
                      radioRefs.current.delete(user.id);
                    }
                  }}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  disabled={disabled}
                  tabIndex={disabled ? -1 : isSelected ? 0 : -1}
                  data-part="avatar"
                  data-user-id={user.id}
                  data-selected={isSelected ? 'true' : undefined}
                  onClick={() => handleSelectUser(user)}
                  onKeyDown={(event) => handleRadioKeyDown(event, index)}
                  className={cx(
                    avatarClass,
                    'prism-focus-ring group flex flex-col items-center gap-1.5 rounded-2xl px-3 py-2 min-w-0 max-w-[10.5rem] transition-[color,background-color,border-color,opacity,transform] duration-150 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed'
                  )}
                  style={{
                    backgroundColor: isSelected
                      ? 'color-mix(in srgb, var(--prism-primary-main) 10%, transparent)'
                      : 'transparent',
                  }}
                >
                  <span
                    aria-hidden="true"
                    data-part="avatar-halo"
                    className={cx(
                      'w-12 h-12 rounded-full inline-flex items-center justify-center font-mono text-sm font-bold tracking-tight shrink-0 transition-[color,background-color,border-color,opacity,transform] duration-150',
                      isSelected ? 'prism-crystal' : 'prism-well'
                    )}
                    style={{
                      color: isSelected
                        ? 'var(--prism-primary-main)'
                        : 'var(--prism-text-secondary)',
                      borderWidth: isSelected ? '2px' : '1px',
                      borderStyle: 'solid',
                      borderColor: isSelected
                        ? 'var(--prism-primary-main)'
                        : 'var(--prism-divider)',
                      boxShadow: isSelected
                        ? '0 0 0 3px color-mix(in srgb, var(--prism-primary-main) 30%, transparent), 0 10px 20px -8px color-mix(in srgb, var(--prism-primary-main) 52%, transparent)'
                        : undefined,
                    }}
                  >
                    {userInitials}
                  </span>

                  <span
                    className="text-xs font-semibold tracking-tight truncate max-w-full"
                    style={{
                      color: isSelected
                        ? 'var(--prism-text-primary)'
                        : 'var(--prism-text-secondary)',
                    }}
                  >
                    {userDisplayName}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active User Profile Readout & Unlock Form */}
          <div
            data-part="form"
            className={cx(
              formClass,
              'prism-crystal rounded-2xl p-4 w-full max-w-md min-w-0 flex flex-col gap-3'
            )}
          >
            <div className="flex flex-col items-center text-center gap-0.5 min-w-0">
              <span
                data-testid="lock-screen-active-user-name"
                className="text-sm font-semibold tracking-tight break-words max-w-full"
                style={STYLE_TEXT_PRIMARY}
              >
                {getDisplayName(selectedUser)}
              </span>
              <span
                data-testid="lock-screen-active-user-role"
                className="text-xs break-words max-w-full"
                style={STYLE_TEXT_SECONDARY}
              >
                {getDisplayRole(selectedUser)}
              </span>
            </div>

            {selectedUser.requiresPassword ? (
              <form
                onSubmit={handleFormSubmit}
                noValidate
                className="flex flex-col gap-2.5 min-w-0 w-full"
              >
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 min-w-0 w-full">
                  <div
                    className="prism-well rounded-2xl px-3 py-1.5 flex items-center gap-1.5 min-w-0 flex-1"
                    style={{
                      borderWidth: '1px',
                      borderStyle: 'solid',
                      borderColor: errorMessage
                        ? 'var(--prism-error-main)'
                        : 'var(--prism-well-border)',
                    }}
                  >
                    <input
                      id={passwordInputId}
                      type={showPassword ? 'text' : 'password'}
                      value={credential}
                      disabled={disabled}
                      autoComplete="current-password"
                      placeholder="Enter password or PIN"
                      aria-label="Password or PIN"
                      aria-invalid={errorMessage ? 'true' : undefined}
                      aria-describedby={errorMessage ? errorId : undefined}
                      onChange={handleCredentialChange}
                      onKeyDown={handlePasswordKeyDown}
                      className="prism-focus-ring min-w-0 flex-1 bg-transparent text-xs sm:text-sm py-1 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                      style={STYLE_TEXT_PRIMARY}
                    />

                    <button
                      type="button"
                      disabled={disabled}
                      aria-pressed={showPassword}
                      onClick={handleTogglePasswordVisibility}
                      className="prism-crystal prism-focus-ring h-7 px-2.5 rounded-full inline-flex items-center justify-center gap-1 text-[11px] font-medium whitespace-nowrap shrink-0 cursor-pointer enabled:hover:brightness-105 disabled:opacity-45 disabled:cursor-not-allowed"
                      style={STYLE_TEXT_SECONDARY}
                    >
                      {showPassword ? (
                        <>
                          <EyeOff
                            aria-hidden="true"
                            className="w-3.5 h-3.5 shrink-0"
                          />
                          <span>Hide</span>
                        </>
                      ) : (
                        <>
                          <Eye
                            aria-hidden="true"
                            className="w-3.5 h-3.5 shrink-0"
                          />
                          <span>Show</span>
                        </>
                      )}
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={disabled}
                    className="prism-btn-primary prism-focus-ring h-10 px-4 inline-flex items-center justify-center gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                  >
                    <span className="relative z-10">Unlock</span>
                    <ArrowRight
                      aria-hidden="true"
                      className="w-3.5 h-3.5 shrink-0 relative z-10"
                    />
                  </button>
                </div>

                {errorMessage ? (
                  <p
                    id={errorId}
                    role="alert"
                    data-testid="lock-screen-error"
                    className="inline-flex items-center gap-1.5 text-xs font-medium break-words min-w-0"
                    style={STYLE_ERROR_MAIN}
                  >
                    <ShieldAlert
                      aria-hidden="true"
                      className="w-3.5 h-3.5 shrink-0"
                    />
                    <span>{errorMessage}</span>
                  </p>
                ) : null}
              </form>
            ) : (
              <div className="flex flex-col items-center gap-2.5 min-w-0 w-full">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={handleAttemptUnlock}
                  className="prism-btn-primary prism-focus-ring h-10 px-5 w-full sm:w-auto inline-flex items-center justify-center gap-2 text-xs font-semibold whitespace-nowrap cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                >
                  <UserCheck
                    aria-hidden="true"
                    className="w-4 h-4 shrink-0 relative z-10"
                  />
                  <span className="relative z-10">Enter Guest Session</span>
                </button>

                {errorMessage ? (
                  <p
                    id={errorId}
                    role="alert"
                    data-testid="lock-screen-error"
                    className="inline-flex items-center gap-1.5 text-xs font-medium break-words min-w-0"
                    style={STYLE_ERROR_MAIN}
                  >
                    <ShieldAlert
                      aria-hidden="true"
                      className="w-3.5 h-3.5 shrink-0"
                    />
                    <span>{errorMessage}</span>
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div
          data-testid="lock-screen-no-users"
          className="prism-well rounded-2xl px-4 py-6 text-center text-xs font-medium"
          style={STYLE_TEXT_SECONDARY}
        >
          No user accounts available.
        </div>
      )}

      {/* Bottom Quick Power Cluster & Polite Live Status */}
      <footer
        data-part="power"
        className={cx(
          powerClass,
          'pt-4 border-t flex flex-col items-center gap-3 min-w-0 max-w-full'
        )}
        style={STYLE_BORDER_DIVIDER}
      >
        <div
          role="group"
          aria-label="Power controls"
          className="flex flex-wrap items-center justify-center gap-2 min-w-0 max-w-full"
        >
          {POWER_ACTIONS.map((item) => (
            <button
              key={item.action}
              type="button"
              disabled={disabled}
              data-power-action={item.action}
              onClick={() => handlePowerTrigger(item)}
              className="prism-crystal prism-focus-ring h-8 px-3.5 rounded-full inline-flex items-center justify-center gap-1.5 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer enabled:hover:brightness-105 disabled:opacity-45 disabled:cursor-not-allowed transition-opacity"
              style={STYLE_TEXT_PRIMARY}
            >
              <span
                aria-hidden="true"
                className="inline-flex items-center"
                style={{ color: item.accentVar }}
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        <p
          role="status"
          aria-live="polite"
          aria-atomic="true"
          data-testid="lock-screen-status"
          className={cx(
            statusClass,
            'prism-well rounded-xl px-3 py-1.5 w-full text-center text-[11px] truncate min-w-0 max-w-full'
          )}
          style={{
            color: 'var(--prism-text-secondary)',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'var(--prism-well-border)',
          }}
        >
          {liveStatusText}
        </p>
      </footer>
    </>
  );

  if (mode === 'fullscreen') {
    return (
      <div
        ref={ref}
        data-part="backdrop"
        data-testid="lock-screen-backdrop"
        {...rest}
        {...merged}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label={resolvedAriaLabel}
          aria-disabled={disabled ? 'true' : undefined}
          data-part="panel"
          data-testid="lock-screen-panel"
          className={cx(
            panelClass,
            'prism-slab relative w-full max-w-xl min-w-0 p-5 sm:p-7 flex flex-col gap-5 overflow-hidden'
          )}
          style={STYLE_TEXT_PRIMARY}
        >
          {lockedScreenBody}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      role="region"
      aria-label={resolvedAriaLabel}
      aria-disabled={disabled ? 'true' : undefined}
      {...rest}
      {...merged}
    >
      {lockedScreenBody}
    </div>
  );
}

export const LockScreenOverlay = memo(LockScreenOverlayInner);
LockScreenOverlay.displayName = 'LockScreenOverlay';
