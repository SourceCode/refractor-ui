import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { createEvent, fireEvent, render, screen, within } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { LivePresenceIndicator, type PresenceUser } from './index';

const SAMPLE_USERS: readonly PresenceUser[] = [
  {
    id: 'clara',
    name: 'Clara Vance',
    role: 'Design Lead',
    avatarSrc: 'https://example.com/clara.png',
    status: 'editing',
    color: '#E75C24',
    activity: 'Refining optical slab shadows',
    cursor: { x: 24, y: 38, label: 'Clara · Slab' },
  },
  {
    id: 'marcus',
    name: 'Marcus Chen',
    role: 'Staff Engineer',
    status: 'online',
    color: 'rgb(16, 185, 129)',
    activity: 'Auditing token cascade',
    cursor: { x: 68, y: 52 },
  },
  {
    id: 'elena',
    name: 'Elena Rostova',
    role: 'Accessibility Lead',
    status: 'viewing',
    color: '#0af',
  },
  {
    id: 'devon',
    name: 'Devon Park',
    status: 'editing',
    activity: 'Editing header contrast',
  },
  {
    id: 'sora',
    name: 'Sora Takahashi',
    role: 'Motion Designer',
    status: 'idle',
    activity: 'Idle 4m',
  },
  {
    id: 'aria',
    name: 'Aria',
    role: 'PM',
    status: 'online',
    activity: 'Reviewing v1.6 release notes',
  },
];

describe('LivePresenceIndicator', () => {
  it('renders overlapping crystal avatars, status dots, summary counts, theme overrides, and React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            LivePresenceIndicator: { className: 'theme-presence', style: { padding: '8px' } },
          },
        }}
      >
        <LivePresenceIndicator
          ref={ref}
          users={SAMPLE_USERS}
          maxVisible={4}
          className="custom-presence"
          xstyle={{ '--prism-blur-px': '20px' }}
          data-testid="presence-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('presence-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'refractor-live-presence-indicator',
      'theme-presence',
      'custom-presence'
    );
    expect(root).toHaveAttribute('data-size', 'md');
    expect(root).toHaveAttribute('data-count', '6');
    expect(root).toHaveStyle({ padding: '8px' });

    // 4 visible avatars + "+2" overflow trigger
    expect(screen.getByRole('button', { name: 'Clara Vance (Editing)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Marcus Chen (Online)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Elena Rostova (Viewing)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Devon Park (Editing)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show 2 more collaborators' })).toHaveTextContent(
      '+2'
    );

    // 5 non-idle active collaborators, 2 editing
    expect(screen.getByText('5 active')).toBeInTheDocument();
    expect(screen.getByText('2 editing')).toBeInTheDocument();

    // Valid portrait renders with no-referrer
    const claraImg = screen.getByAltText('Clara Vance');
    expect(claraImg).toHaveAttribute('src', 'https://example.com/clara.png');
    expect(claraImg).toHaveAttribute('referrerpolicy', 'no-referrer');

    // Initials fallback when avatarSrc omitted
    expect(screen.getByRole('button', { name: 'Marcus Chen (Online)' })).toHaveTextContent('MC');
  });

  it('falls back to crisp uppercase initials when an avatar image errors', () => {
    render(
      <LivePresenceIndicator
        users={[
          {
            id: 'broken',
            name: 'Nadia Alvarez',
            avatarSrc: 'https://example.com/broken.png',
            status: 'online',
          },
        ]}
      />
    );

    const img = screen.getByAltText('Nadia Alvarez');
    fireEvent.error(img);
    expect(screen.queryByAltText('Nadia Alvarez')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nadia Alvarez (Online)' })).toHaveTextContent('NA');
  });

  it('toggles optical user detail pill and invokes onUserSelect on avatar click and dismiss', () => {
    const onUserSelect = vi.fn();

    render(<LivePresenceIndicator users={SAMPLE_USERS.slice(0, 3)} onUserSelect={onUserSelect} />);

    const claraBtn = screen.getByRole('button', { name: 'Clara Vance (Editing)' });
    fireEvent.click(claraBtn);

    expect(onUserSelect).toHaveBeenCalledTimes(1);
    expect(onUserSelect).toHaveBeenCalledWith(SAMPLE_USERS[0]);
    expect(claraBtn).toHaveAttribute('aria-pressed', 'true');

    const detailPill = screen.getByRole('status');
    expect(within(detailPill).getByText('Clara Vance')).toBeInTheDocument();
    expect(within(detailPill).getByText('Design Lead')).toBeInTheDocument();
    expect(within(detailPill).getByText('Editing')).toBeInTheDocument();
    expect(within(detailPill).getByText('Refining optical slab shadows')).toBeInTheDocument();

    // Dismiss via Close button
    fireEvent.click(screen.getByRole('button', { name: 'Close collaborator details' }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    // Re-open and toggle off via re-clicking same avatar
    fireEvent.click(claraBtn);
    expect(screen.getByRole('status')).toBeInTheDocument();
    fireEvent.click(claraBtn);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('opens +N overflow prism-slab popover and closes via Escape, outside click, close button, re-click, or selection', () => {
    const onUserSelect = vi.fn();

    render(
      <div>
        <button type="button">Outside Area</button>
        <LivePresenceIndicator
          users={SAMPLE_USERS}
          maxVisible={4}
          onUserSelect={onUserSelect}
        />
      </div>
    );

    const trigger = screen.getByRole('button', { name: 'Show 2 more collaborators' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    // Open popover
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const dialog = screen.getByRole('dialog', { name: 'Additional collaborators' });
    expect(within(dialog).getByText('2 more collaborators')).toBeInTheDocument();
    expect(within(dialog).getByText('Sora Takahashi')).toBeInTheDocument();
    expect(within(dialog).getByText('Motion Designer')).toBeInTheDocument();
    expect(within(dialog).getByText('Idle 4m')).toBeInTheDocument();
    expect(within(dialog).getByText('Aria')).toBeInTheDocument();
    expect(within(dialog).getByText('AR')).toBeInTheDocument();

    // Composing Escape does NOT close popover
    const composingEsc = createEvent.keyDown(window, { key: 'Escape' });
    Object.defineProperty(composingEsc, 'isComposing', { value: true });
    fireEvent(window, composingEsc);
    expect(screen.getByRole('dialog', { name: 'Additional collaborators' })).toBeInTheDocument();

    // Non-Escape key keeps popover open
    fireEvent.keyDown(window, { key: 'a' });
    expect(screen.getByRole('dialog', { name: 'Additional collaborators' })).toBeInTheDocument();

    // Escape closes popover
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Additional collaborators' })).not.toBeInTheDocument();

    // Re-open and close via outside mousedown (mousedown inside keeps popover open)
    fireEvent.click(trigger);
    const openDialog = screen.getByRole('dialog', { name: 'Additional collaborators' });
    fireEvent.mouseDown(openDialog);
    expect(screen.getByRole('dialog', { name: 'Additional collaborators' })).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole('button', { name: 'Outside Area' }));
    expect(screen.queryByRole('dialog', { name: 'Additional collaborators' })).not.toBeInTheDocument();

    // Re-open and close via trigger re-click
    fireEvent.click(trigger);
    expect(screen.getByRole('dialog', { name: 'Additional collaborators' })).toBeInTheDocument();
    fireEvent.click(trigger);
    expect(screen.queryByRole('dialog', { name: 'Additional collaborators' })).not.toBeInTheDocument();

    // Re-open and close via explicit popover X button
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('button', { name: 'Close collaborators list' }));
    expect(screen.queryByRole('dialog', { name: 'Additional collaborators' })).not.toBeInTheDocument();

    // Re-open and select an overflow user
    fireEvent.click(trigger);
    fireEvent.click(screen.getByText('Sora Takahashi'));
    expect(screen.queryByRole('dialog', { name: 'Additional collaborators' })).not.toBeInTheDocument();
    expect(onUserSelect).toHaveBeenCalledWith(SAMPLE_USERS[4]);
    expect(screen.getByRole('status')).toHaveTextContent('Sora Takahashi');
  });

  it('renders singular overflow heading and handles minimal collaborators without role or activity', () => {
    const minimalUsers: readonly PresenceUser[] = [
      { id: 'min-1', name: 'Alex Morgan', status: 'online' },
      { id: 'min-2', name: 'Jordan Lee', status: 'viewing' },
    ];

    const { rerender } = render(<LivePresenceIndicator users={minimalUsers} maxVisible={1} />);

    // Click visible minimal user (no role, no activity)
    fireEvent.click(screen.getByRole('button', { name: 'Alex Morgan (Online)' }));
    const pill = screen.getByRole('status');
    expect(within(pill).getByText('Alex Morgan')).toBeInTheDocument();
    expect(within(pill).getByText('Online')).toBeInTheDocument();

    // Open singular overflow popover containing minimal user (no role, no activity)
    fireEvent.click(screen.getByRole('button', { name: 'Show 1 more collaborators' }));
    expect(screen.getByText('1 more collaborator')).toBeInTheDocument();
    expect(screen.getByText('Jordan Lee')).toBeInTheDocument();

    // Removing selected user from users list clears detail pill cleanly
    rerender(<LivePresenceIndicator users={minimalUsers.slice(1)} maxVisible={4} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('supports size variants (sm, md, lg), showCountLabel=false, and all-idle summary', () => {
    const { rerender } = render(
      <LivePresenceIndicator
        users={[{ id: 'idle-1', name: 'Quiet Observer', status: 'idle' }]}
        size="sm"
      />
    );

    expect(screen.getByText('1 idle')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Quiet Observer (Idle)' })).toHaveClass('w-7', 'h-7');

    rerender(
      <LivePresenceIndicator
        users={SAMPLE_USERS.slice(0, 2)}
        size="lg"
        showCountLabel={false}
      />
    );

    expect(screen.queryByText(/active/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clara Vance (Editing)' })).toHaveClass(
      'w-11',
      'h-11'
    );
  });

  it('renders live cursor studio-grid stage with clamped coordinates and empty cursor placeholder', () => {
    const { rerender } = render(
      <LivePresenceIndicator
        users={SAMPLE_USERS.slice(0, 3)}
        showCursors
        cursorStageLabel="Design Studio Stage"
      />
    );

    const stage = screen.getByRole('region', { name: 'Design Studio Stage' });
    expect(stage).toHaveClass('prism-well', 'prism-studio-grid');
    expect(within(stage).getByText('2 cursors')).toBeInTheDocument();
    expect(within(stage).getByText('Clara · Slab')).toBeInTheDocument();
    expect(within(stage).getByText('Marcus Chen')).toBeInTheDocument();

    const claraCursor = stage.querySelector('[data-cursor-user="clara"]');
    expect(claraCursor).toHaveAttribute('data-cursor-x', '24');
    expect(claraCursor).toHaveAttribute('data-cursor-y', '38');
    expect(claraCursor).toHaveStyle({ left: '24%', top: '38%' });

    // Single cursor pluralization check
    rerender(<LivePresenceIndicator users={SAMPLE_USERS.slice(0, 1)} showCursors />);
    expect(screen.getByText('1 cursor')).toBeInTheDocument();

    // No cursors state
    rerender(
      <LivePresenceIndicator
        users={[{ id: 'no-cur', name: 'No Cursor', status: 'viewing' }]}
        showCursors
      />
    );
    expect(screen.getByText('No live cursors active')).toBeInTheDocument();
  });

  it('renders graceful empty pill when users array is empty', () => {
    render(<LivePresenceIndicator users={[]} />);

    expect(screen.getByText('No active collaborators')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('defends against adversarial inputs: duplicate IDs, javascript: URLs, invalid CSS colors, NaN/Infinity coords, extreme maxVisible, prototype keys, and XSS', () => {
    const xss = '<script>window.__presenceXss=1</script><img src=x onerror=alert(1)>';
    const adversarialUsers: readonly PresenceUser[] = [
      {
        id: '__proto__',
        name: xss,
        role: xss,
        activity: xss,
        avatarSrc: 'javascript:alert(1)',
        status: 'editing',
        color: 'red; background-image: url(javascript:alert(1))',
        cursor: { x: Number.NaN, y: Number.POSITIVE_INFINITY, label: xss },
      },
      {
        id: '__proto__',
        name: 'Duplicate Should Be Dropped',
        status: 'online',
      },
      {
        id: 'constructor',
        name: '   ',
        avatarSrc: 'data:text/html,<script>alert(1)</script>',
        status: 'online',
        color: 'rgb(999, 0, 0)',
        cursor: { x: -45, y: 240 },
      },
      {
        id: 'prototype',
        name: 'Safe Hex User',
        status: 'viewing',
        color: '#12345',
      },
    ];

    render(
      <LivePresenceIndicator
        users={adversarialUsers}
        maxVisible={Number.NaN}
        showCursors
        cursorStageLabel={xss}
      />
    );

    // No script elements injected
    expect(document.querySelector('script')).toBeNull();
    // Duplicate ID dropped -> count is 3, not 4
    expect(screen.getByRole('group')).toHaveAttribute('data-count', '3');
    expect(screen.queryByText('Duplicate Should Be Dropped')).not.toBeInTheDocument();

    // Unsafe avatar URLs stripped -> no <img> tags rendered
    expect(document.querySelectorAll('img')).toHaveLength(0);

    // Blank name safely falls back to '?' initials and 'Collaborator' accessible label
    expect(screen.getByRole('button', { name: 'Collaborator (Online)' })).toHaveTextContent('?');

    // Invalid CSS colors rejected -> fallback hex applied instead of injection string
    const protoBtn = screen.getByRole('button', { name: `${xss} (Editing)` });
    expect(protoBtn.getAttribute('style')).not.toContain('javascript:');
    expect(protoBtn.getAttribute('style')).not.toContain('background-image');

    // NaN / Infinity / out-of-range cursor coordinates clamped safely to 0..100
    const protoCursor = document.querySelector('[data-cursor-user="__proto__"]');
    expect(protoCursor).toHaveAttribute('data-cursor-x', '0');
    expect(protoCursor).toHaveAttribute('data-cursor-y', '0');

    const ctorCursor = document.querySelector('[data-cursor-user="constructor"]');
    expect(ctorCursor).toHaveAttribute('data-cursor-x', '0');
    expect(ctorCursor).toHaveAttribute('data-cursor-y', '100');

    // XSS rendered strictly as literal text when selected
    fireEvent.click(protoBtn);
    expect(screen.getAllByText(xss).length).toBeGreaterThanOrEqual(4);
    expect(({} as Record<string, string>)['__proto__']).not.toBe(xss);
  });
});
