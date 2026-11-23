'use client';

import { memo, useCallback, useId, useMemo, useState, type ReactNode } from 'react';
import {
  Clock,
  LogOut,
  MapPin,
  Monitor,
  ShieldCheck,
  Smartphone,
  Tablet,
  Terminal,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { STYLE_ERROR_MAIN, STYLE_INFO_MAIN, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type SessionDeviceType = 'desktop' | 'mobile' | 'tablet' | 'cli';

export interface ActiveSessionItem {
  /** Unique session identifier (duplicate IDs are deduplicated prototype-safely). */
  id: string;
  /** Human-readable device or workstation label. */
  deviceName: string;
  /** Device form-factor icon category (defaults to 'desktop'). */
  deviceType?: SessionDeviceType;
  /** Optional browser, operating system, or CLI client name. */
  browserOrClient?: string;
  /** Approximate geographic location of the session. */
  location: string;
  /** Optional IP address rendered in tabular monospace text. */
  ipAddress?: string;
  /** Human-readable last active timestamp. */
  lastActive: string;
  /** Marks the user's current active session (protected from sign-out controls). */
  current?: boolean;
}

export interface ActiveSessionsListProps extends BaseProps<HTMLDivElement> {
  /** Controlled list of active sessions. */
  sessions?: ReadonlyArray<ActiveSessionItem>;
  /** Initial uncontrolled list of active sessions. */
  defaultSessions?: ReadonlyArray<ActiveSessionItem>;
  /** Callback fired whenever sessions change after individual or bulk sign-out. */
  onSessionsChange?: (next: ActiveSessionItem[]) => void;
  /** Callback fired with the revoked session ID when a single session is signed out. */
  onSignOutSession?: (sessionId: string) => void;
  /** Callback fired when "Sign out all others" is activated. */
  onSignOutAllOthers?: () => void;
  /** Heading displayed in the optical slab header (defaults to 'Active Sessions'). */
  title?: string;
}

function deduplicateSessions(
  list: ReadonlyArray<ActiveSessionItem> | undefined
): ActiveSessionItem[] {
  if (!list || list.length === 0) {
    return [];
  }
  const seen = new Set<string>();
  const unique: ActiveSessionItem[] = [];
  for (const item of list) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      unique.push(item);
    }
  }
  return unique;
}

function renderDeviceIcon(deviceType: SessionDeviceType): ReactNode {
  switch (deviceType) {
    case 'mobile':
      return <Smartphone aria-hidden="true" className="w-4 h-4 shrink-0" />;
    case 'tablet':
      return <Tablet aria-hidden="true" className="w-4 h-4 shrink-0" />;
    case 'cli':
      return <Terminal aria-hidden="true" className="w-4 h-4 shrink-0" />;
    case 'desktop':
      return <Monitor aria-hidden="true" className="w-4 h-4 shrink-0" />;
  }
}

function ActiveSessionsListInner({
  sessions,
  defaultSessions,
  onSessionsChange,
  onSignOutSession,
  onSignOutAllOthers,
  title = 'Active Sessions',
  className,
  style,
  xstyle,
  'aria-label': ariaLabel,
  ref,
  ...rest
}: ActiveSessionsListProps) {
  const override = useComponentOverride('ActiveSessionsList');
  const headingId = useId();

  const controlledSessions = useMemo(
    () => (sessions !== undefined ? deduplicateSessions(sessions) : undefined),
    [sessions]
  );
  const initialSessions = useMemo(() => deduplicateSessions(defaultSessions), [defaultSessions]);

  const [activeSessions, setActiveSessions] = useControllableState<ActiveSessionItem[]>({
    value: controlledSessions,
    defaultValue: initialSessions,
    onChange: onSessionsChange,
  });

  const [statusMessage, setStatusMessage] = useState<string>('');

  const otherSessionsCount = useMemo(
    () => activeSessions.filter((session) => !session.current).length,
    [activeSessions]
  );

  const handleSignOutSession = useCallback(
    (session: ActiveSessionItem) => {
      const next = activeSessions.filter((item) => item.id !== session.id);
      setActiveSessions(next);
      onSignOutSession?.(session.id);
      setStatusMessage(`Signed out session on ${session.deviceName}.`);
    },
    [activeSessions, onSignOutSession, setActiveSessions]
  );

  const handleSignOutAllOthers = useCallback(() => {
    const revokedCount = activeSessions.filter((item) => !item.current).length;
    const next = activeSessions.filter((item) => Boolean(item.current));
    setActiveSessions(next);
    onSignOutAllOthers?.();
    const noun = revokedCount === 1 ? 'session' : 'sessions';
    setStatusMessage(`Signed out ${revokedCount} other ${noun}.`);
  }, [activeSessions, onSignOutAllOthers, setActiveSessions]);

  const isEmpty = activeSessions.length === 0;
  const sessionUnit = activeSessions.length === 1 ? 'session' : 'sessions';

  const merged = mergeProps({
    themeTarget: themeProps('active-sessions-list', {
      empty: isEmpty,
      hasOtherSessions: otherSessionsCount > 0,
    }),
    baseClassName: 'prism-slab p-4 sm:p-5 w-full',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('active-sessions-list', 'header');
  const listClass = stableClassName('active-sessions-list', 'list');
  const rowClass = stableClassName('active-sessions-list', 'row');
  const emptyClass = stableClassName('active-sessions-list', 'empty');

  return (
    <div
      ref={ref}
      role="region"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabel ? undefined : headingId}
      {...rest}
      {...merged}
    >
      <div className={cx(headerClass, 'flex flex-wrap items-center justify-between gap-3')}>
        <div className="min-w-0 flex flex-wrap items-center gap-2.5">
          <span
            className="prism-well w-8 h-8 rounded-full inline-flex items-center justify-center shrink-0"
            style={STYLE_INFO_MAIN}
          >
            <ShieldCheck aria-hidden="true" className="w-4 h-4 shrink-0" />
          </span>

          <h3
            id={headingId}
            className="text-sm font-semibold truncate"
            style={STYLE_TEXT_PRIMARY}
          >
            {title}
          </h3>

          <span
            data-testid="active-sessions-count"
            className="prism-well px-2.5 py-0.5 rounded-full font-mono text-[11px] font-medium tabular-nums shrink-0"
            style={STYLE_TEXT_SECONDARY}
          >
            {activeSessions.length} {sessionUnit}
          </span>
        </div>

        <button
          type="button"
          disabled={otherSessionsCount === 0}
          onClick={handleSignOutAllOthers}
          className="prism-crystal prism-focus-ring h-8 px-3 rounded-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0 transition-[color,background-color,border-color,opacity,transform] cursor-pointer enabled:hover:brightness-105 disabled:opacity-45 disabled:cursor-not-allowed"
          style={STYLE_TEXT_PRIMARY}
        >
          <LogOut aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
          <span>Sign out all others</span>
        </button>
      </div>

      {isEmpty ? (
        <div
          data-testid="active-sessions-empty"
          className={cx(emptyClass, 'prism-well rounded-2xl mt-4 px-4 py-8 text-center')}
        >
          <p className="text-sm font-semibold" style={STYLE_TEXT_PRIMARY}>
            No active sessions
          </p>
          <p className="mt-1 text-xs" style={STYLE_TEXT_SECONDARY}>
            Signed-in browsers, mobile devices, and CLI tokens will appear here.
          </p>
        </div>
      ) : (
        <ul className={cx(listClass, 'mt-4 space-y-2.5')} aria-labelledby={headingId}>
          {activeSessions.map((session) => {
            const deviceType: SessionDeviceType = session.deviceType ?? 'desktop';
            const isCurrent = Boolean(session.current);

            return (
              <li
                key={session.id}
                data-session-id={session.id}
                data-device-type={deviceType}
                data-current={isCurrent ? 'true' : undefined}
                className={cx(
                  rowClass,
                  'prism-crystal rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3'
                )}
              >
                <div className="min-w-0 flex items-start gap-3">
                  <span
                    data-testid={`session-icon-${session.id}`}
                    className="prism-well w-9 h-9 rounded-xl inline-flex items-center justify-center shrink-0 mt-0.5"
                    style={{
                      color: isCurrent ? 'var(--prism-success-main)' : 'var(--prism-info-main)',
                    }}
                  >
                    {renderDeviceIcon(deviceType)}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="text-sm font-semibold break-words"
                        style={STYLE_TEXT_PRIMARY}
                      >
                        {session.deviceName}
                      </span>

                      {isCurrent ? (
                        <span
                          data-testid={`session-current-badge-${session.id}`}
                          className="prism-emerald inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-tight shrink-0"
                        >
                          Current session
                        </span>
                      ) : null}
                    </div>

                    <div
                      className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs"
                      style={STYLE_TEXT_SECONDARY}
                    >
                      {session.browserOrClient ? (
                        <span className="break-words">{session.browserOrClient}</span>
                      ) : null}

                      <span className="inline-flex items-center gap-1">
                        <MapPin aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                        <span>{session.location}</span>
                      </span>

                      {session.ipAddress ? (
                        <code
                          data-testid={`session-ip-${session.id}`}
                          className="prism-well px-2 py-0.5 rounded-md font-mono text-[11px] tabular-nums"
                          style={STYLE_TEXT_PRIMARY}
                        >
                          {session.ipAddress}
                        </code>
                      ) : null}

                      <span className="inline-flex items-center gap-1">
                        <Clock aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                        <span>{session.lastActive}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {!isCurrent ? (
                  <button
                    type="button"
                    aria-label={`Sign out ${session.deviceName}`}
                    onClick={() => handleSignOutSession(session)}
                    className="prism-crystal prism-focus-ring h-8 px-3 rounded-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0 self-start sm:self-center transition-[color,background-color,border-color,opacity,transform] cursor-pointer enabled:hover:brightness-105 disabled:opacity-45 disabled:cursor-not-allowed"
                    style={STYLE_ERROR_MAIN}
                  >
                    <LogOut aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                    <span>Sign out</span>
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <span role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {statusMessage}
      </span>
    </div>
  );
}

export const ActiveSessionsList = memo(ActiveSessionsListInner);
ActiveSessionsList.displayName = 'ActiveSessionsList';
