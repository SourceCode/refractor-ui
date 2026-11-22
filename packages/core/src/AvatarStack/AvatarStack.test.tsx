import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { createEvent, fireEvent, render, screen, within } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { AvatarStack, type AvatarStackUser } from './index';

const TEAM_USERS: ReadonlyArray<AvatarStackUser> = [
  {
    id: 'u-1',
    name: 'Clara Vance',
    role: 'Design Lead',
    src: 'https://example.com/clara.png',
    status: 'online',
    tone: 'primary',
  },
  {
    id: 'u-2',
    name: 'Marcus Chen',
    role: 'Staff Engineer',
    src: '/avatars/marcus.png',
    status: 'away',
    tone: 'secondary',
  },
  {
    id: 'u-3',
    name: 'Elena Rostova',
    role: 'Accessibility Lead',
    status: 'busy',
    tone: 'emerald',
  },
  {
    id: 'u-4',
    name: 'Devon Park',
    status: 'offline',
    tone: 'amber',
  },
  {
    id: 'u-5',
    name: 'Sora',
    role: 'Motion Designer',
    tone: 'info',
  },
  {
    id: 'u-6',
    name: 'Mary Jane Watson',
    role: 'QA Lead',
    status: 'online',
  },
];

describe('AvatarStack', () => {
  it('renders 7 realistic default product team members, Astryx overrides, React 19 ref, and +3 counter pill when users is omitted', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            AvatarStack: { className: 'theme-avatar-stack', style: { padding: '6px' } },
          },
        }}
      >
        <AvatarStack
          ref={ref}
          className="custom-stack"
          style={{ marginTop: '4px' }}
          xstyle={{ '--prism-blur-px': '20px' }}
          data-testid="avatar-stack-root"
        />
      </PrismThemeProvider>
    );

    expect(AvatarStack.displayName).toBe('AvatarStack');

    const root = screen.getByTestId('avatar-stack-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveAttribute('role', 'group');
    expect(root).toHaveAttribute('aria-label', 'Active collaborators');
    expect(root).toHaveClass('refractor-avatar-stack', 'theme-avatar-stack', 'custom-stack');
    expect(root).toHaveAttribute('data-size', 'md');
    expect(root).toHaveAttribute('data-count', '7');
    expect(root).toHaveAttribute('data-overflow', 'true');
    expect(root).toHaveStyle({ padding: '6px', marginTop: '4px' });

    // Compact horizontal overlapping cluster
    const cluster = root.querySelector('.refractor-avatar-stack__cluster');
    expect(cluster).toHaveClass('flex', 'items-center', '-space-x-2.5');

    // Default maxVisible=4 => 4 visible avatars + "+3" counter pill
    const claraBtn = screen.getByRole('button', { name: 'Clara Vance (Online)' });
    expect(claraBtn).toHaveClass('hover:z-20', 'focus-visible:z-20', 'prism-focus-ring');
    expect(claraBtn).toHaveTextContent('CV');
    expect(screen.getByRole('button', { name: 'Marcus Chen (Online)' })).toHaveTextContent('MC');
    expect(screen.getByRole('button', { name: 'Elena Rostova (Online)' })).toHaveTextContent('ER');
    expect(screen.getByRole('button', { name: 'Devon Park (Busy)' })).toHaveTextContent('DP');

    const counter = screen.getByRole('button', { name: 'Show 3 more users' });
    expect(counter).toHaveTextContent('+3');
    expect(counter).toHaveAttribute('aria-expanded', 'false');
    expect(counter).toHaveAttribute('aria-haspopup', 'dialog');
  });

  it('opens a viewport-clamped prism-slab popover listing ALL users with overflow highlighted and supports Escape, outside click, Close button, and selection', () => {
    const onSelectUser = vi.fn();

    render(
      <div>
        <button type="button">Outside Target</button>
        <AvatarStack
          users={TEAM_USERS}
          maxVisible={3}
          label="Design Review Team"
          onSelectUser={onSelectUser}
        />
      </div>
    );

    const counter = screen.getByRole('button', { name: 'Show 3 more users' });
    fireEvent.click(counter);

    expect(counter).toHaveAttribute('aria-expanded', 'true');
    const dialog = screen.getByRole('dialog', { name: 'Design Review Team' });
    expect(dialog).toHaveClass('prism-slab', 'w-[min(18rem,calc(100vw-2rem))]');
    expect(dialog.className).not.toMatch(/\bw-(?:72|80|96)\b/);

    // Lists ALL 6 users (3 visible + 3 overflow)
    const rows = within(dialog).getAllByRole('button').filter((btn) => btn.hasAttribute('data-popover-user-id'));
    expect(rows).toHaveLength(6);

    // First 3 marked non-overflow, last 3 highlighted as overflow
    expect(rows[0]).toHaveAttribute('data-overflow-member', 'false');
    expect(rows[1]).toHaveAttribute('data-overflow-member', 'false');
    expect(rows[2]).toHaveAttribute('data-overflow-member', 'false');
    expect(rows[3]).toHaveAttribute('data-overflow-member', 'true');
    expect(rows[4]).toHaveAttribute('data-overflow-member', 'true');
    expect(rows[5]).toHaveAttribute('data-overflow-member', 'true');
    expect(within(dialog).getAllByText('Overflow')).toHaveLength(3);

    // Displays name, role, status, single-word and multi-word initials
    expect(within(dialog).getByText('Clara Vance')).toBeInTheDocument();
    expect(within(dialog).getByText('Design Lead')).toBeInTheDocument();
    expect(within(dialog).getByText('Away')).toBeInTheDocument();
    expect(within(dialog).getByText('Busy')).toBeInTheDocument();
    expect(within(dialog).getByText('Offline')).toBeInTheDocument();
    expect(within(dialog).getByText('Sora')).toBeInTheDocument();
    expect(within(dialog).getByText('SO')).toBeInTheDocument();
    expect(within(dialog).getByText('Mary Jane Watson')).toBeInTheDocument();
    expect(within(dialog).getByText('MW')).toBeInTheDocument();

    // Composing Escape must NOT dismiss popover
    const composingEsc = createEvent.keyDown(window, { key: 'Escape' });
    Object.defineProperty(composingEsc, 'isComposing', { value: true });
    fireEvent(window, composingEsc);
    expect(screen.getByRole('dialog', { name: 'Design Review Team' })).toBeInTheDocument();

    // Non-Escape key keeps popover open
    fireEvent.keyDown(window, { key: 'a' });
    expect(screen.getByRole('dialog', { name: 'Design Review Team' })).toBeInTheDocument();

    // Escape dismisses popover and returns focus to trigger
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Design Review Team' })).not.toBeInTheDocument();
    expect(document.activeElement).toBe(counter);

    // Open via IME-safe Enter, verify composing Enter/Space ignored, close via IME-safe Space
    const composingEnter = createEvent.keyDown(counter, { key: 'Enter' });
    Object.defineProperty(composingEnter, 'isComposing', { value: true });
    fireEvent(counter, composingEnter);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.keyDown(counter, { key: 'Tab' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.keyDown(counter, { key: 'Enter' });
    expect(screen.getByRole('dialog', { name: 'Design Review Team' })).toBeInTheDocument();

    fireEvent.keyDown(counter, { key: ' ' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Re-open and verify inside mouseDown keeps open while outside mouseDown closes
    fireEvent.click(counter);
    const openDialog = screen.getByRole('dialog', { name: 'Design Review Team' });
    fireEvent.mouseDown(openDialog);
    expect(screen.getByRole('dialog', { name: 'Design Review Team' })).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole('button', { name: 'Outside Target' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Re-open and close via Close button
    fireEvent.click(counter);
    fireEvent.click(screen.getByRole('button', { name: 'Close users list' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(counter);

    // Re-open and select an overflow member via click
    fireEvent.click(counter);
    fireEvent.click(screen.getByText('Sora'));
    expect(onSelectUser).toHaveBeenCalledTimes(1);
    expect(onSelectUser).toHaveBeenLastCalledWith(TEAM_USERS[4]);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Re-open and select a popover member via IME-safe keyboard Enter and Space
    fireEvent.click(counter);
    const maryRow = screen.getByRole('dialog').querySelector('[data-popover-user-id="u-6"]');
    expect(maryRow).not.toBeNull();

    const composingRowEnter = createEvent.keyDown(maryRow!, { key: 'Enter' });
    Object.defineProperty(composingRowEnter, 'isComposing', { value: true });
    fireEvent(maryRow!, composingRowEnter);
    expect(onSelectUser).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(maryRow!, { key: 'ArrowDown' });
    expect(onSelectUser).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(maryRow!, { key: ' ' });
    expect(onSelectUser).toHaveBeenCalledTimes(2);
    expect(onSelectUser).toHaveBeenLastCalledWith(TEAM_USERS[5]);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('invokes onSelectUser on visible avatar click and IME-safe Enter/Space without firing while composing', () => {
    const onSelectUser = vi.fn();

    render(<AvatarStack users={TEAM_USERS.slice(0, 3)} onSelectUser={onSelectUser} />);

    const elenaBtn = screen.getByRole('button', { name: 'Elena Rostova (Busy)' });

    fireEvent.click(elenaBtn);
    expect(onSelectUser).toHaveBeenCalledTimes(1);
    expect(onSelectUser).toHaveBeenLastCalledWith(TEAM_USERS[2]);

    const composingKey = createEvent.keyDown(elenaBtn, { key: 'Enter' });
    Object.defineProperty(composingKey, 'isComposing', { value: true });
    fireEvent(elenaBtn, composingKey);
    expect(onSelectUser).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(elenaBtn, { key: 'Enter' });
    expect(onSelectUser).toHaveBeenCalledTimes(2);
    expect(onSelectUser).toHaveBeenLastCalledWith(TEAM_USERS[2]);
  });

  it('sanitizes portrait images, falls back to tinted initials on image error, and cycles tones deterministically when omitted', () => {
    const untonedUsers: ReadonlyArray<AvatarStackUser> = [
      { id: 't1', name: 'Avery Kim', src: 'https://example.com/avery.png', status: 'online' },
      { id: 't2', name: 'Blake Lin' },
      { id: 't3', name: 'Casey Ortiz', status: 'away' },
      { id: 't4', name: 'Drew Patel', status: 'busy' },
      { id: 't5', name: 'Ellis Wu', status: 'offline' },
    ];

    render(<AvatarStack users={untonedUsers} maxVisible={5} />);

    // Valid image renders with no-referrer
    const averyImg = screen.getByAltText('Avery Kim');
    expect(averyImg).toHaveAttribute('src', 'https://example.com/avery.png');
    expect(averyImg).toHaveAttribute('referrerpolicy', 'no-referrer');

    // Image load error immediately switches to uppercase initials
    fireEvent.error(averyImg);
    expect(screen.queryByAltText('Avery Kim')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Avery Kim (Online)' })).toHaveTextContent('AK');

    // User without status has plain name aria-label and no status dot
    const blakeBtn = screen.getByRole('button', { name: 'Blake Lin' });
    expect(blakeBtn.querySelector('[data-status-dot]')).toBeNull();

    // Deterministic 5-tone cycle across omitted tones
    expect(screen.getByRole('button', { name: 'Avery Kim (Online)' })).toHaveAttribute('data-tone', 'primary');
    expect(blakeBtn).toHaveAttribute('data-tone', 'info');
    expect(screen.getByRole('button', { name: 'Casey Ortiz (Away)' })).toHaveAttribute('data-tone', 'emerald');
    expect(screen.getByRole('button', { name: 'Drew Patel (Busy)' })).toHaveAttribute('data-tone', 'secondary');
    expect(screen.getByRole('button', { name: 'Ellis Wu (Offline)' })).toHaveAttribute('data-tone', 'amber');
  });

  it('supports size variants (sm, md, lg), clamps maxVisible (1..12), and respects custom aria-label', () => {
    const { rerender } = render(
      <AvatarStack
        users={TEAM_USERS}
        size="sm"
        maxVisible={0}
        label="   "
        aria-label="Custom reviewer stack"
      />
    );

    const group = screen.getByRole('group', { name: 'Custom reviewer stack' });
    expect(group).toHaveAttribute('data-size', 'sm');
    // maxVisible=0 clamps to 1 -> 1 visible + "+5"
    expect(screen.getByRole('button', { name: 'Clara Vance (Online)' })).toHaveClass('w-7', 'h-7');
    expect(screen.getByRole('button', { name: 'Show 5 more users' })).toHaveClass('h-7');

    // Open popover and verify whitespace label fell back to 'Active collaborators'
    fireEvent.click(screen.getByRole('button', { name: 'Show 5 more users' }));
    expect(screen.getByRole('dialog', { name: 'Active collaborators' })).toBeInTheDocument();

    // Increasing maxVisible above users.length closes popover and removes overflow pill
    rerender(<AvatarStack users={TEAM_USERS} size="lg" maxVisible={25} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Show .* more users/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clara Vance (Online)' })).toHaveClass('w-11', 'h-11');

    // NaN / Infinity maxVisible falls back to 4
    rerender(<AvatarStack users={TEAM_USERS} maxVisible={Number.NaN} />);
    expect(screen.getByRole('button', { name: 'Show 2 more users' })).toBeInTheDocument();
  });

  it('renders a clean role="status" empty state when users is an empty array while preserving host ref and BaseProps', () => {
    const callbackRef = vi.fn();

    render(
      <AvatarStack
        ref={callbackRef}
        users={[]}
        label="Online editors"
        data-testid="empty-stack"
      />
    );

    const root = screen.getByTestId('empty-stack');
    expect(callbackRef).toHaveBeenCalledWith(root);
    expect(root).toHaveAttribute('data-empty', 'true');
    expect(root).toHaveAttribute('data-count', '0');

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('No active collaborators');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('defends against adversarial inputs: unsafe URL schemes, duplicate IDs, prototype-polluting keys, blank names, and XSS payloads', () => {
    const xss = '<script>window.__avatarStackXss=1</script><img src=x onerror=alert(1)>';
    const adversarialUsers: ReadonlyArray<AvatarStackUser> = [
      {
        id: '__proto__',
        name: xss,
        role: xss,
        src: 'javascript:alert(1)',
        status: 'online',
      },
      {
        id: '__proto__',
        name: 'Duplicate Entry Should Be Dropped',
        status: 'busy',
      },
      {
        id: 'constructor',
        name: '   ',
        src: 'data:text/html,<script>alert(1)</script>',
        status: 'away',
      },
      {
        id: 'prototype',
        name: 'Svg Protocol Test',
        src: 'data:image/svg+xml;base64,PHN2Zy8+',
        status: 'offline',
      },
      {
        id: 'proto-rel',
        name: 'Protocol Relative',
        src: '//evil.example/tracker.png',
      },
    ];

    render(
      <AvatarStack
        users={adversarialUsers}
        maxVisible={2}
        label={xss}
        data-testid="adversarial-stack"
      />
    );

    // No script injection
    expect(document.querySelector('script')).toBeNull();
    // Duplicate ID dropped => count is 4, not 5
    const root = screen.getByTestId('adversarial-stack');
    expect(root).toHaveAttribute('data-count', '4');
    expect(screen.queryByText('Duplicate Entry Should Be Dropped')).not.toBeInTheDocument();

    // Unsafe URLs stripped => zero <img> tags
    expect(document.querySelectorAll('img')).toHaveLength(0);

    // Blank name falls back to '?' initials and 'Collaborator' label
    expect(screen.getByRole('button', { name: 'Collaborator (Away)' })).toHaveTextContent('?');

    // Open popover to inspect escaped XSS text across all entries
    fireEvent.click(screen.getByRole('button', { name: 'Show 2 more users' }));
    const dialog = screen.getByRole('dialog', { name: xss });
    expect(within(dialog).getAllByText(xss).length).toBeGreaterThanOrEqual(3);
    expect(within(dialog).getByText('Svg Protocol Test')).toBeInTheDocument();
    expect(within(dialog).getByText('Protocol Relative')).toBeInTheDocument();

    // Prototype was never polluted
    expect(({} as Record<string, string>)['__proto__']).not.toBe(xss);
  });
});
