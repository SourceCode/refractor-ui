import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { ActiveSessionsList, type ActiveSessionItem } from './ActiveSessionsList';

const DESKTOP_SESSION: ActiveSessionItem = {
  id: 'sess-desktop',
  deviceName: 'MacBook Pro 16"',
  deviceType: 'desktop',
  browserOrClient: 'Chrome 134 · macOS 15',
  location: 'San Francisco, US',
  ipAddress: '198.51.100.42',
  lastActive: 'Active now',
  current: true,
};

const MOBILE_SESSION: ActiveSessionItem = {
  id: 'sess-mobile',
  deviceName: 'iPhone 16 Pro',
  deviceType: 'mobile',
  browserOrClient: 'Safari · iOS 18',
  location: 'New York, US',
  ipAddress: '198.51.100.88',
  lastActive: '12 minutes ago',
};

const TABLET_SESSION: ActiveSessionItem = {
  id: 'sess-tablet',
  deviceName: 'iPad Air',
  deviceType: 'tablet',
  location: 'London, UK',
  lastActive: '2 hours ago',
};

const CLI_SESSION: ActiveSessionItem = {
  id: 'sess-cli',
  deviceName: 'CI Deploy Runner',
  deviceType: 'cli',
  browserOrClient: 'refractor-cli 1.3.0',
  location: 'Frankfurt, DE',
  ipAddress: '203.0.113.19',
  lastActive: 'Yesterday',
};

const SAMPLE_SESSIONS: ReadonlyArray<ActiveSessionItem> = [
  DESKTOP_SESSION,
  MOBILE_SESSION,
  TABLET_SESSION,
  CLI_SESSION,
];

describe('ActiveSessionsList', () => {
  it('renders prism-slab container, all device types, emerald current badge, forwards React 19 ref, and composes theme overrides', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            ActiveSessionsList: {
              className: 'theme-sessions-slab',
              style: { letterSpacing: '0.2px' },
            },
          },
        }}
      >
        <ActiveSessionsList
          ref={ref}
          defaultSessions={SAMPLE_SESSIONS}
          className="local-sessions"
          xstyle={{ '--prism-slab-blur-px': '24px' }}
          style={{ marginTop: '10px' }}
          data-testid="sessions-list"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('sessions-list');
    expect(ref.current).toBe(root);
    expect(root).toHaveAttribute('role', 'region');
    expect(root).toHaveClass(
      'refractor-active-sessions-list',
      'prism-slab',
      'theme-sessions-slab',
      'local-sessions'
    );
    expect(root).toHaveStyle({ letterSpacing: '0.2px', marginTop: '10px' });
    expect(root.style.getPropertyValue('--prism-slab-blur-px')).toBe('24px');
    expect(root).toHaveAttribute('data-has-other-sessions', 'true');

    expect(screen.getByRole('heading', { name: 'Active Sessions' })).toBeInTheDocument();
    expect(screen.getByTestId('active-sessions-count')).toHaveTextContent('4 sessions');

    // Current session shows emerald badge and omits Sign out button
    const currentBadge = screen.getByTestId('session-current-badge-sess-desktop');
    expect(currentBadge).toHaveTextContent('Current session');
    expect(currentBadge).toHaveClass('prism-emerald');
    expect(screen.queryByRole('button', { name: 'Sign out MacBook Pro 16"' })).toBeNull();

    // Non-current sessions render metadata, optional IP, and per-device Sign out buttons
    expect(screen.getByTestId('session-ip-sess-desktop')).toHaveTextContent('198.51.100.42');
    expect(screen.getByTestId('session-ip-sess-cli')).toHaveTextContent('203.0.113.19');
    expect(screen.queryByTestId('session-ip-sess-tablet')).toBeNull();

    expect(screen.getByText('Chrome 134 · macOS 15')).toBeInTheDocument();
    expect(screen.getByText('San Francisco, US')).toBeInTheDocument();
    expect(screen.getByText('London, UK')).toBeInTheDocument();
    expect(screen.getByText('Yesterday')).toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Sign out iPhone 16 Pro' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign out iPad Air' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign out CI Deploy Runner' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign out all others' })).toBeEnabled();
  });

  it('defaults omitted deviceType to desktop and supports custom title and aria-label', () => {
    const singleSession: ReadonlyArray<ActiveSessionItem> = [
      {
        id: 'sess-default-type',
        deviceName: 'Workstation Linux',
        location: 'Austin, US',
        lastActive: 'Active now',
        current: true,
      },
    ];

    render(
      <ActiveSessionsList
        title="Signed-In Devices"
        aria-label="Account devices region"
        defaultSessions={singleSession}
        data-testid="custom-sessions"
      />
    );

    const root = screen.getByTestId('custom-sessions');
    expect(root).toHaveAttribute('aria-label', 'Account devices region');
    expect(root).not.toHaveAttribute('aria-labelledby');
    expect(screen.getByRole('heading', { name: 'Signed-In Devices' })).toBeInTheDocument();
    expect(screen.getByTestId('active-sessions-count')).toHaveTextContent('1 session');

    const row = screen.getByText('Workstation Linux').closest('li');
    expect(row).toHaveAttribute('data-device-type', 'desktop');
    expect(row).toHaveAttribute('data-current', 'true');

    // Only current session present -> Sign out all others is disabled
    const bulkBtn = screen.getByRole('button', { name: 'Sign out all others' });
    expect(bulkBtn).toBeDisabled();
    expect(bulkBtn).toHaveClass('disabled:cursor-not-allowed');
  });

  it('revokes individual sessions and signs out all others in uncontrolled mode with polite live announcements', () => {
    const onSessionsChange = vi.fn();
    const onSignOutSession = vi.fn();
    const onSignOutAllOthers = vi.fn();

    render(
      <ActiveSessionsList
        defaultSessions={SAMPLE_SESSIONS}
        onSessionsChange={onSessionsChange}
        onSignOutSession={onSignOutSession}
        onSignOutAllOthers={onSignOutAllOthers}
      />
    );

    // Individual sign-out of iPad Air
    fireEvent.click(screen.getByRole('button', { name: 'Sign out iPad Air' }));
    expect(onSignOutSession).toHaveBeenCalledWith('sess-tablet');
    expect(onSessionsChange).toHaveBeenLastCalledWith(
      SAMPLE_SESSIONS.filter((item) => item.id !== 'sess-tablet')
    );
    expect(screen.queryByText('iPad Air')).toBeNull();
    expect(screen.getByTestId('active-sessions-count')).toHaveTextContent('3 sessions');
    expect(screen.getByRole('status')).toHaveTextContent('Signed out session on iPad Air.');

    // Bulk sign-out removes remaining 2 non-current sessions and preserves current session
    const bulkBtn = screen.getByRole('button', { name: 'Sign out all others' });
    fireEvent.click(bulkBtn);

    expect(onSignOutAllOthers).toHaveBeenCalledTimes(1);
    expect(onSessionsChange).toHaveBeenLastCalledWith([DESKTOP_SESSION]);
    expect(screen.getByTestId('active-sessions-count')).toHaveTextContent('1 session');
    expect(screen.getByText('MacBook Pro 16"')).toBeInTheDocument();
    expect(screen.queryByText('iPhone 16 Pro')).toBeNull();
    expect(screen.queryByText('CI Deploy Runner')).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('Signed out 2 other sessions.');
    expect(bulkBtn).toBeDisabled();
  });

  it('announces singular session grammar when signing out a single other session via bulk action', () => {
    const twoSessions: ReadonlyArray<ActiveSessionItem> = [DESKTOP_SESSION, MOBILE_SESSION];
    render(<ActiveSessionsList defaultSessions={twoSessions} />);

    fireEvent.click(screen.getByRole('button', { name: 'Sign out all others' }));
    expect(screen.getByRole('status')).toHaveTextContent('Signed out 1 other session.');
    expect(screen.getByRole('button', { name: 'Sign out all others' })).toBeDisabled();
  });

  it('supports controlled sessions mode without mutating internal list until parent updates prop', () => {
    const emittedLists: ActiveSessionItem[][] = [];
    const onSignOutSession = vi.fn();
    const onSignOutAllOthers = vi.fn();

    const initial: ReadonlyArray<ActiveSessionItem> = [DESKTOP_SESSION, MOBILE_SESSION];
    const { rerender } = render(
      <ActiveSessionsList
        sessions={initial}
        onSessionsChange={(next) => {
          emittedLists.push(next);
        }}
        onSignOutSession={onSignOutSession}
        onSignOutAllOthers={onSignOutAllOthers}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Sign out iPhone 16 Pro' }));
    expect(onSignOutSession).toHaveBeenCalledWith('sess-mobile');
    expect(emittedLists).toEqual([[DESKTOP_SESSION]]);
    // Still rendered because parent has not updated controlled prop yet
    expect(screen.getByText('iPhone 16 Pro')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Sign out all others' }));
    expect(onSignOutAllOthers).toHaveBeenCalledTimes(1);
    expect(emittedLists).toHaveLength(2);

    rerender(
      <ActiveSessionsList
        sessions={[DESKTOP_SESSION]}
        onSessionsChange={(next) => {
          emittedLists.push(next);
        }}
        onSignOutSession={onSignOutSession}
        onSignOutAllOthers={onSignOutAllOthers}
      />
    );

    expect(screen.queryByText('iPhone 16 Pro')).toBeNull();
    expect(screen.getByTestId('active-sessions-count')).toHaveTextContent('1 session');
    expect(screen.getByRole('button', { name: 'Sign out all others' })).toBeDisabled();
  });

  it('renders graceful empty state and disables bulk sign-out when sessions list is empty (negative test)', () => {
    const onSignOutAllOthers = vi.fn();
    const { rerender } = render(
      <ActiveSessionsList
        onSignOutAllOthers={onSignOutAllOthers}
        data-testid="empty-sessions-list"
      />
    );

    const root = screen.getByTestId('empty-sessions-list');
    expect(root).toHaveAttribute('data-empty', 'true');
    expect(screen.getByTestId('active-sessions-count')).toHaveTextContent('0 sessions');
    expect(screen.getByTestId('active-sessions-empty')).toHaveTextContent('No active sessions');

    const bulkBtn = screen.getByRole('button', { name: 'Sign out all others' });
    expect(bulkBtn).toBeDisabled();
    expect(bulkBtn).toHaveClass('disabled:cursor-not-allowed');
    fireEvent.click(bulkBtn);
    expect(onSignOutAllOthers).not.toHaveBeenCalled();

    rerender(<ActiveSessionsList sessions={[]} onSignOutAllOthers={onSignOutAllOthers} />);
    expect(screen.getByTestId('active-sessions-empty')).toBeInTheDocument();
  });

  it('deduplicates session IDs prototype-safely using Set and handles prototype-key IDs safely', () => {
    const prototypeSessions: ReadonlyArray<ActiveSessionItem> = [
      {
        id: '__proto__',
        deviceName: 'Proto Device First',
        location: 'Seattle, US',
        lastActive: 'Active now',
        current: true,
      },
      {
        id: '__proto__',
        deviceName: 'Proto Device Duplicate',
        location: 'Duplicate City',
        lastActive: '1 hour ago',
      },
      {
        id: 'constructor',
        deviceName: 'Constructor CLI',
        deviceType: 'cli',
        location: 'Berlin, DE',
        lastActive: '5 minutes ago',
      },
      {
        id: 'toString',
        deviceName: 'ToString Mobile',
        deviceType: 'mobile',
        location: 'Tokyo, JP',
        lastActive: '10 minutes ago',
      },
      {
        id: 'constructor',
        deviceName: 'Constructor Duplicate',
        location: 'Ignored City',
        lastActive: '9 hours ago',
      },
    ];

    render(<ActiveSessionsList defaultSessions={prototypeSessions} />);

    expect(screen.getByTestId('active-sessions-count')).toHaveTextContent('3 sessions');
    expect(screen.getByText('Proto Device First')).toBeInTheDocument();
    expect(screen.queryByText('Proto Device Duplicate')).toBeNull();
    expect(screen.getByText('Constructor CLI')).toBeInTheDocument();
    expect(screen.queryByText('Constructor Duplicate')).toBeNull();
    expect(screen.getByText('ToString Mobile')).toBeInTheDocument();
  });

  it('renders adversarial XSS payloads as literal text without executing markup', () => {
    const payload = '<script>window.__sessionsXss=1</script><img src=x onerror=alert(1)>';
    const xssSessions: ReadonlyArray<ActiveSessionItem> = [
      {
        id: 'xss-1',
        deviceName: payload,
        browserOrClient: payload,
        location: payload,
        ipAddress: payload,
        lastActive: payload,
      },
    ];

    render(<ActiveSessionsList title={payload} defaultSessions={xssSessions} />);

    expect(screen.getByRole('heading', { name: payload })).toBeInTheDocument();
    expect(screen.getByTestId('session-ip-xss-1')).toHaveTextContent(payload);
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
  });
});
