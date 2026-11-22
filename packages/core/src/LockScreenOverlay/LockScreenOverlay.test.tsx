import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  LockScreenOverlay,
  type LockScreenDisplayMode,
  type LockScreenDisplayModeMap,
  type LockScreenOverlayProps,
  type LockScreenPowerAction,
  type LockScreenPowerActionMap,
  type LockScreenUserAccount,
} from './index';

function dispatchComposingKeyDown(target: Element, key: string): void {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
  });
  Object.defineProperty(event, 'isComposing', { value: true });
  fireEvent(target, event);
}

describe('LockScreenOverlay', () => {
  it('renders default locked view with tabular clock, date, 3 accounts, password form, power controls, ref, optical tokens, and theme override', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            LockScreenOverlay: {
              className: 'theme-lock-override',
              style: { opacity: '0.96' },
            },
          },
        }}
      >
        <LockScreenOverlay
          ref={ref}
          className="local-lock-class"
          style={{ letterSpacing: '0.01em' }}
          xstyle={{ '--prism-blur-px': '24px' }}
          aria-label="Workstation lock barrier"
          data-testid="lock-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('lock-root');
    expect(LockScreenOverlay.displayName).toBe('LockScreenOverlay');
    expect(ref.current).toBe(root);
    expect(root).toHaveAttribute('role', 'region');
    expect(root).toHaveAttribute('aria-label', 'Workstation lock barrier');
    expect(root).toHaveClass(
      'refractor-lock-screen-overlay',
      'prism-slab',
      'theme-lock-override',
      'local-lock-class'
    );
    expect(root).toHaveAttribute('data-mode', 'inline');
    expect(root).toHaveAttribute('data-locked', 'true');
    expect(root).toHaveAttribute('data-requires-password', 'true');
    expect(root).not.toHaveAttribute('data-unlocked');
    expect(root).not.toHaveAttribute('data-disabled');
    expect(root).toHaveStyle({ opacity: '0.96' });
    expect(root.style.letterSpacing).toBe('0.01em');
    expect(root.style.getPropertyValue('--prism-blur-px')).toBe('24px');

    // Tabular clock & date defaults
    const timeEl = screen.getByTestId('lock-screen-time');
    expect(timeEl).toHaveTextContent('10:42');
    expect(timeEl).toHaveClass('tabular-nums');
    expect(screen.getByTestId('lock-screen-date')).toHaveTextContent(
      'Sunday, November 22'
    );

    // User avatar switcher radiogroup
    const radiogroup = screen.getByRole('radiogroup', {
      name: 'Select user account',
    });
    expect(radiogroup).toBeInTheDocument();

    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(3);
    expect(radios[0]).toHaveTextContent('Clara Vance');
    expect(radios[0]).toHaveAttribute('aria-checked', 'true');
    expect(radios[0]).toHaveAttribute('tabindex', '0');
    expect(radios[1]).toHaveTextContent('Marcus Chen');
    expect(radios[1]).toHaveAttribute('aria-checked', 'false');
    expect(radios[1]).toHaveAttribute('tabindex', '-1');
    expect(radios[2]).toHaveTextContent('Guest Session');
    expect(radios[2]).toHaveAttribute('aria-checked', 'false');

    // Active avatar halo uses --prism-primary-main token
    const activeHalo = radios[0]?.querySelector('[data-part="avatar-halo"]');
    expect(activeHalo).not.toBeNull();
    expect((activeHalo as HTMLElement).style.borderColor).toBe(
      'var(--prism-primary-main)'
    );

    // Password input & actions
    const passwordInput = screen.getByLabelText('Password or PIN');
    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: 'Show' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Unlock' })).toBeEnabled();

    // Quick power cluster
    expect(
      screen.getByRole('group', { name: 'Power controls' })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sleep' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Restart' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Shut Down' })).toBeEnabled();

    // Polite live status
    const status = screen.getByTestId('lock-screen-status');
    expect(status).toHaveAttribute('role', 'status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent('Locked — Clara Vance selected.');
  });

  it('clears typed password and resets password visibility immediately when switching accounts via click or keyboard', () => {
    render(<LockScreenOverlay />);

    const passwordInput = screen.getByLabelText(
      'Password or PIN'
    ) as HTMLInputElement;
    fireEvent.change(passwordInput, { target: { value: 'top-secret-42' } });
    expect(passwordInput.value).toBe('top-secret-42');

    // Reveal password first
    fireEvent.click(screen.getByRole('button', { name: 'Show' }));
    expect(passwordInput).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Hide' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByTestId('lock-screen-status')).toHaveTextContent(
      'Password visible.'
    );

    // Clicking already-selected Clara Vance keeps current input intact
    const claraRadio = screen.getByRole('radio', { name: /Clara Vance/i });
    fireEvent.click(claraRadio);
    expect(passwordInput.value).toBe('top-secret-42');

    // Switch to Marcus Chen -> clears password and resets visibility to hidden
    const marcusRadio = screen.getByRole('radio', { name: /Marcus Chen/i });
    fireEvent.click(marcusRadio);

    expect(marcusRadio).toHaveAttribute('aria-checked', 'true');
    expect(claraRadio).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByTestId('lock-screen-active-user-name')).toHaveTextContent(
      'Marcus Chen'
    );
    expect(screen.getByTestId('lock-screen-status')).toHaveTextContent(
      'Selected account Marcus Chen.'
    );

    const refreshedInput = screen.getByLabelText(
      'Password or PIN'
    ) as HTMLInputElement;
    expect(refreshedInput.value).toBe('');
    expect(refreshedInput).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: 'Show' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );

    // Toggle hide back explicitly to cover both toggle branches
    fireEvent.click(screen.getByRole('button', { name: 'Show' }));
    expect(refreshedInput).toHaveAttribute('type', 'text');
    fireEvent.click(screen.getByRole('button', { name: 'Hide' }));
    expect(refreshedInput).toHaveAttribute('type', 'password');
    expect(screen.getByTestId('lock-screen-status')).toHaveTextContent(
      'Password hidden.'
    );

    // Keyboard navigation in radiogroup: ArrowRight, ArrowDown, ArrowLeft, ArrowUp, Home, End + IME guard
    dispatchComposingKeyDown(marcusRadio, 'ArrowRight');
    expect(marcusRadio).toHaveAttribute('aria-checked', 'true');

    fireEvent.keyDown(marcusRadio, { key: 'ArrowRight' });
    const guestRadio = screen.getByRole('radio', { name: /Guest Session/i });
    expect(guestRadio).toHaveAttribute('aria-checked', 'true');
    expect(document.activeElement).toBe(guestRadio);

    fireEvent.keyDown(guestRadio, { key: 'ArrowDown' });
    expect(claraRadio).toHaveAttribute('aria-checked', 'true');
    expect(document.activeElement).toBe(claraRadio);

    fireEvent.keyDown(claraRadio, { key: 'ArrowLeft' });
    expect(guestRadio).toHaveAttribute('aria-checked', 'true');

    fireEvent.keyDown(guestRadio, { key: 'ArrowUp' });
    expect(marcusRadio).toHaveAttribute('aria-checked', 'true');

    fireEvent.keyDown(marcusRadio, { key: 'Home' });
    expect(claraRadio).toHaveAttribute('aria-checked', 'true');

    fireEvent.keyDown(claraRadio, { key: 'End' });
    expect(guestRadio).toHaveAttribute('aria-checked', 'true');

    // Unrelated key in radiogroup does not move selection
    fireEvent.keyDown(guestRadio, { key: 'Escape' });
    expect(guestRadio).toHaveAttribute('aria-checked', 'true');
  });

  it('renders instant Enter Guest Session button for passwordless accounts and supports rejection or unlock', () => {
    const onUnlock = vi
      .fn<(user: LockScreenUserAccount, credential: string) => boolean>()
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    const onLockChange = vi.fn<(locked: boolean) => void>();

    render(
      <LockScreenOverlay
        defaultSelectedUserId="guest-session"
        onUnlock={onUnlock}
        onLockChange={onLockChange}
      />
    );

    expect(screen.queryByLabelText('Password or PIN')).toBeNull();
    const guestBtn = screen.getByRole('button', {
      name: 'Enter Guest Session',
    });
    expect(guestBtn).toBeEnabled();

    // First click rejected by onUnlock returning false
    fireEvent.click(guestBtn);
    expect(onUnlock).toHaveBeenCalledTimes(1);
    expect(onUnlock.mock.calls[0]?.[0].id).toBe('guest-session');
    expect(onUnlock.mock.calls[0]?.[1]).toBe('');
    expect(onLockChange).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Unable to enter Guest Session.'
    );

    // Second click succeeds and reveals inline unlocked bar
    fireEvent.click(guestBtn);
    expect(onUnlock).toHaveBeenCalledTimes(2);
    expect(onLockChange).toHaveBeenCalledWith(false);
    expect(screen.getByTestId('lock-screen-unlocked-bar')).toBeInTheDocument();
    expect(screen.getByTestId('lock-screen-unlocked-user')).toHaveTextContent(
      'Guest Session · Temporary Sandbox'
    );
    expect(screen.getByTestId('lock-screen-status')).toHaveTextContent(
      'Entered Guest Session.'
    );
  });

  it('validates empty/whitespace passwords and rejected onUnlock attempts without unlocking', () => {
    const onUnlock = vi.fn<
      (user: LockScreenUserAccount, credential: string) => boolean
    >(() => false);
    const onLockChange = vi.fn<(locked: boolean) => void>();

    render(
      <LockScreenOverlay onUnlock={onUnlock} onLockChange={onLockChange} />
    );

    const passwordInput = screen.getByLabelText('Password or PIN');
    const unlockBtn = screen.getByRole('button', { name: 'Unlock' });

    // Empty submission
    fireEvent.click(unlockBtn);
    expect(onUnlock).not.toHaveBeenCalled();
    expect(onLockChange).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Enter your password or PIN to unlock.'
    );
    expect(passwordInput).toHaveAttribute('aria-invalid', 'true');
    expect(passwordInput.getAttribute('aria-describedby')).toBe(
      screen.getByRole('alert').id
    );

    // Whitespace-only password rejected
    fireEvent.change(passwordInput, { target: { value: '   ' } });
    expect(screen.queryByRole('alert')).toBeNull();
    fireEvent.click(unlockBtn);
    expect(onUnlock).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Enter your password or PIN to unlock.'
    );

    // Invalid credential rejected by onUnlock returning false
    fireEvent.change(passwordInput, { target: { value: 'wrong-pass' } });
    fireEvent.click(unlockBtn);
    expect(onUnlock).toHaveBeenCalledTimes(1);
    expect(onUnlock.mock.calls[0]?.[0].id).toBe('clara-vance');
    expect(onUnlock.mock.calls[0]?.[1]).toBe('wrong-pass');
    expect(onLockChange).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Incorrect password or PIN. Please try again.'
    );
    expect(screen.getByTestId('lock-screen-status')).toHaveTextContent(
      'Incorrect password or PIN. Please try again.'
    );
  });

  it('unlocks cleanly on valid password, clears credentials immediately, never leaks secrets, and re-locks interactively', () => {
    const onUnlock = vi.fn<
      (user: LockScreenUserAccount, credential: string) => boolean
    >((_user, credential) => credential === 'prism-9942');
    const onLockChange = vi.fn<(locked: boolean) => void>();

    render(
      <LockScreenOverlay
        onUnlock={onUnlock}
        onLockChange={onLockChange}
        data-testid="lock-root"
      />
    );

    const passwordInput = screen.getByLabelText(
      'Password or PIN'
    ) as HTMLInputElement;
    fireEvent.change(passwordInput, { target: { value: 'prism-9942' } });
    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }));

    expect(onUnlock).toHaveBeenCalledTimes(1);
    expect(onLockChange).toHaveBeenCalledWith(false);

    const root = screen.getByTestId('lock-root');
    expect(root).toHaveAttribute('data-unlocked', 'true');
    expect(root).not.toHaveAttribute('data-locked');
    expect(screen.getByTestId('lock-screen-unlocked-bar')).toBeInTheDocument();
    expect(screen.getByTestId('lock-screen-unlocked-user')).toHaveTextContent(
      'Clara Vance · Lead Optical Architect'
    );
    expect(screen.getByTestId('lock-screen-status')).toHaveTextContent(
      'Unlocked session for Clara Vance.'
    );

    // Credential is never leaked into DOM text
    expect(document.body.textContent).not.toContain('prism-9942');

    // Re-lock via Lock Screen button -> password input is clean and hidden
    fireEvent.click(screen.getByRole('button', { name: 'Lock Screen' }));
    expect(onLockChange).toHaveBeenCalledWith(true);
    expect(root).toHaveAttribute('data-locked', 'true');
    expect(screen.getByTestId('lock-screen-status')).toHaveTextContent(
      'Screen locked.'
    );
    const relockedInput = screen.getByLabelText(
      'Password or PIN'
    ) as HTMLInputElement;
    expect(relockedInput.value).toBe('');
    expect(relockedInput).toHaveAttribute('type', 'password');
  });

  it('supports IME-safe Enter submission in password input', () => {
    const onUnlock = vi.fn<
      (user: LockScreenUserAccount, credential: string) => void
    >();

    render(<LockScreenOverlay onUnlock={onUnlock} />);

    const passwordInput = screen.getByLabelText('Password or PIN');
    fireEvent.change(passwordInput, { target: { value: 'ime-pin-1234' } });

    // IME composing Enter must NOT submit
    dispatchComposingKeyDown(passwordInput, 'Enter');
    expect(onUnlock).not.toHaveBeenCalled();
    expect(screen.queryByTestId('lock-screen-unlocked-bar')).toBeNull();

    // Non-Enter key does not submit
    fireEvent.keyDown(passwordInput, { key: 'Escape' });
    expect(onUnlock).not.toHaveBeenCalled();

    // Standard Enter submits and unlocks
    fireEvent.keyDown(passwordInput, { key: 'Enter' });
    expect(onUnlock).toHaveBeenCalledTimes(1);
    expect(onUnlock.mock.calls[0]?.[1]).toBe('ime-pin-1234');
    expect(screen.getByTestId('lock-screen-unlocked-bar')).toBeInTheDocument();
  });

  it('renders a modal dialog backdrop in fullscreen mode when locked and returns null when unlocked', () => {
    const ref = createRef<HTMLDivElement>();
    const onLockChange = vi.fn<(locked: boolean) => void>();

    const { container } = render(
      <LockScreenOverlay
        ref={ref}
        mode="fullscreen"
        defaultSelectedUserId="guest-session"
        onLockChange={onLockChange}
        className="fullscreen-custom"
      />
    );

    const backdrop = screen.getByTestId('lock-screen-backdrop');
    expect(ref.current).toBe(backdrop);
    expect(backdrop).toHaveClass(
      'refractor-lock-screen-overlay',
      'fixed',
      'inset-0',
      'fullscreen-custom'
    );
    expect(backdrop).toHaveAttribute('data-mode', 'fullscreen');
    expect(backdrop).toHaveAttribute('data-locked', 'true');

    const dialog = screen.getByRole('dialog', { name: 'Lock screen' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveClass('prism-slab');

    // Unlocking in fullscreen mode returns null
    fireEvent.click(
      screen.getByRole('button', { name: 'Enter Guest Session' })
    );
    expect(onLockChange).toHaveBeenCalledWith(false);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('fires all 3 quick power controls and updates polite status announcements', () => {
    const onPowerAction = vi.fn<(action: LockScreenPowerAction) => void>();

    render(<LockScreenOverlay onPowerAction={onPowerAction} />);

    fireEvent.click(screen.getByRole('button', { name: 'Sleep' }));
    expect(onPowerAction).toHaveBeenNthCalledWith(1, 'sleep');
    expect(screen.getByTestId('lock-screen-status')).toHaveTextContent(
      'Sleep requested.'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Restart' }));
    expect(onPowerAction).toHaveBeenNthCalledWith(2, 'restart');
    expect(screen.getByTestId('lock-screen-status')).toHaveTextContent(
      'Restart requested.'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Shut Down' }));
    expect(onPowerAction).toHaveBeenNthCalledWith(3, 'shutdown');
    expect(screen.getByTestId('lock-screen-status')).toHaveTextContent(
      'Shut down requested.'
    );
  });

  it('respects controlled locked prop and defaultLocked={false}', () => {
    const onUnlock = vi.fn<
      (user: LockScreenUserAccount, credential: string) => boolean
    >(() => true);
    const onLockChange = vi.fn<(locked: boolean) => void>();

    const { rerender, unmount } = render(
      <LockScreenOverlay
        locked={true}
        onUnlock={onUnlock}
        onLockChange={onLockChange}
      />
    );

    const passwordInput = screen.getByLabelText(
      'Password or PIN'
    ) as HTMLInputElement;
    fireEvent.change(passwordInput, { target: { value: 'controlled-pass' } });
    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }));

    // Parent owns locked state, so overlay stays locked while clearing password & notifying parent
    expect(onUnlock).toHaveBeenCalledTimes(1);
    expect(onLockChange).toHaveBeenCalledWith(false);
    expect(passwordInput.value).toBe('');
    expect(screen.queryByTestId('lock-screen-unlocked-bar')).toBeNull();

    // Parent sets locked={false} -> renders unlocked bar
    rerender(
      <LockScreenOverlay
        locked={false}
        onUnlock={onUnlock}
        onLockChange={onLockChange}
      />
    );
    expect(screen.getByTestId('lock-screen-unlocked-bar')).toBeInTheDocument();

    // Clicking Lock Screen notifies parent but remains unlocked until parent updates locked={true}
    fireEvent.click(screen.getByRole('button', { name: 'Lock Screen' }));
    expect(onLockChange).toHaveBeenCalledWith(true);
    expect(screen.getByTestId('lock-screen-unlocked-bar')).toBeInTheDocument();

    rerender(
      <LockScreenOverlay
        locked={true}
        onUnlock={onUnlock}
        onLockChange={onLockChange}
      />
    );
    expect(screen.getByLabelText('Password or PIN')).toBeInTheDocument();

    // Controlled guest unlock notifies parent without mutating controlled locked state
    fireEvent.click(screen.getByRole('radio', { name: /Guest Session/i }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Enter Guest Session' })
    );
    expect(onLockChange).toHaveBeenLastCalledWith(false);
    expect(screen.queryByTestId('lock-screen-unlocked-bar')).toBeNull();

    // Uncontrolled defaultLocked={false} on fresh mount
    unmount();
    render(<LockScreenOverlay defaultLocked={false} />);
    expect(screen.getByTestId('lock-screen-unlocked-bar')).toBeInTheDocument();
    expect(screen.getByTestId('lock-screen-status')).toHaveTextContent(
      'Unlocked — signed in as Clara Vance.'
    );
  });

  it('blocks all interactions cleanly when disabled in locked, fullscreen, and unlocked states', () => {
    const onUnlock = vi.fn<
      (user: LockScreenUserAccount, credential: string) => boolean
    >(() => true);
    const onLockChange = vi.fn<(locked: boolean) => void>();
    const onPowerAction = vi.fn<(action: LockScreenPowerAction) => void>();

    const { rerender } = render(
      <LockScreenOverlay
        disabled={true}
        onUnlock={onUnlock}
        onLockChange={onLockChange}
        onPowerAction={onPowerAction}
        data-testid="disabled-root"
      />
    );

    const root = screen.getByTestId('disabled-root');
    expect(root).toHaveAttribute('aria-disabled', 'true');
    expect(root).toHaveAttribute('data-disabled', 'true');

    const radiogroup = screen.getByRole('radiogroup', {
      name: 'Select user account',
    });
    expect(radiogroup).toHaveAttribute('aria-disabled', 'true');

    const radios = screen.getAllByRole('radio');
    for (const radio of radios) {
      expect(radio).toBeDisabled();
      expect(radio).toHaveAttribute('tabindex', '-1');
    }

    const passwordInput = screen.getByLabelText('Password or PIN');
    expect(passwordInput).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Show' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Unlock' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Sleep' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Restart' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Shut Down' })).toBeDisabled();

    // Synthetic events while disabled are ignored
    fireEvent.click(radios[1] as HTMLElement);
    fireEvent.keyDown(radios[0] as HTMLElement, { key: 'ArrowRight' });
    fireEvent.keyDown(passwordInput, { key: 'Enter' });
    fireEvent.submit(passwordInput.closest('form') as HTMLFormElement);
    fireEvent.click(screen.getByRole('button', { name: 'Show' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sleep' }));

    expect(radios[0]).toHaveAttribute('aria-checked', 'true');
    expect(onUnlock).not.toHaveBeenCalled();
    expect(onLockChange).not.toHaveBeenCalled();
    expect(onPowerAction).not.toHaveBeenCalled();

    // Disabled in fullscreen locked mode reflects aria-disabled on dialog
    rerender(
      <LockScreenOverlay
        mode="fullscreen"
        locked={true}
        disabled={true}
        onLockChange={onLockChange}
      />
    );
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-disabled', 'true');

    // Disabled in inline unlocked mode prevents re-lock
    rerender(
      <LockScreenOverlay
        mode="inline"
        locked={false}
        disabled={true}
        onLockChange={onLockChange}
        data-testid="disabled-unlocked"
      />
    );
    expect(screen.getByTestId('disabled-unlocked')).toHaveAttribute(
      'aria-disabled',
      'true'
    );
    const lockBtn = screen.getByRole('button', { name: 'Lock Screen' });
    expect(lockBtn).toBeDisabled();
    fireEvent.click(lockBtn);
    expect(onLockChange).not.toHaveBeenCalled();
  });

  it('handles XSS literal names, duplicate users, blank fields, single user, and empty user arrays safely', () => {
    const xssUsers: ReadonlyArray<LockScreenUserAccount> = [
      {
        id: 'xss-1',
        name: '<script>alert("xss")</script>',
        role: '<img src=x onerror=alert(1)>',
        initials: '',
        requiresPassword: true,
      },
      {
        id: 'xss-1',
        name: 'Duplicate Should Be Ignored',
        role: 'Duplicate',
        initials: 'DP',
        requiresPassword: false,
      },
      {
        id: 'blank-user',
        name: '   ',
        role: '   ',
        initials: '   ',
        requiresPassword: false,
      },
      {
        id: 'multi-word',
        name: 'Ada Lovelace',
        role: 'Principal Scientist',
        initials: '',
        requiresPassword: false,
      },
    ];

    const { container, rerender, unmount } = render(
      <LockScreenOverlay
        timeLabel="   "
        dateLabel="   "
        users={xssUsers}
        defaultSelectedUserId="non-existent-id"
      />
    );

    // Blank time/date fall back cleanly
    expect(screen.getByTestId('lock-screen-time')).toHaveTextContent('10:42');
    expect(screen.getByTestId('lock-screen-date')).toHaveTextContent(
      'Sunday, November 22'
    );

    // Duplicate user ID deduplicated (3 unique accounts)
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(3);
    expect(screen.queryByText('Duplicate Should Be Ignored')).toBeNull();

    // XSS strings rendered strictly as literal text, never injected as HTML elements
    expect(screen.getByTestId('lock-screen-active-user-name')).toHaveTextContent(
      '<script>alert("xss")</script>'
    );
    expect(screen.getByTestId('lock-screen-active-user-role')).toHaveTextContent(
      '<img src=x onerror=alert(1)>'
    );
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();

    // Blank user falls back cleanly to 'User Account', 'Local Account', and 'UA'
    fireEvent.click(radios[1] as HTMLElement);
    expect(screen.getByTestId('lock-screen-active-user-name')).toHaveTextContent(
      'User Account'
    );
    expect(screen.getByTestId('lock-screen-active-user-role')).toHaveTextContent(
      'Local Account'
    );
    expect(radios[1]).toHaveTextContent('UA');

    // Multi-word name with empty initials derives 'AL'
    fireEvent.click(radios[2] as HTMLElement);
    expect(radios[2]).toHaveTextContent('AL');

    // Single user: arrow key safely no-ops
    rerender(
      <LockScreenOverlay
        users={[
          {
            id: 'solo',
            name: 'Solo User',
            role: 'Admin',
            initials: 'SU',
            requiresPassword: true,
          },
        ]}
      />
    );
    const soloRadio = screen.getByRole('radio', { name: /Solo User/i });
    fireEvent.keyDown(soloRadio, { key: 'ArrowRight' });
    expect(soloRadio).toHaveAttribute('aria-checked', 'true');

    // Empty users array on fresh mount: renders graceful fallback in both locked and unlocked inline states
    unmount();
    const { rerender: rerenderEmpty } = render(
      <LockScreenOverlay users={[]} locked={true} />
    );
    expect(screen.getByTestId('lock-screen-no-users')).toHaveTextContent(
      'No user accounts available.'
    );
    expect(screen.getByTestId('lock-screen-status')).toHaveTextContent(
      'Locked — no user accounts configured.'
    );

    rerenderEmpty(<LockScreenOverlay users={[]} locked={false} />);
    expect(screen.getByTestId('lock-screen-unlocked-user')).toHaveTextContent(
      'Active Session · Unlocked Workspace'
    );
    expect(screen.getByTestId('lock-screen-status')).toHaveTextContent(
      'Unlocked — signed in as Active Session.'
    );
  });

  it('exports strongly typed display modes, power actions, user accounts, and extensible maps', () => {
    const modeMap: LockScreenDisplayModeMap = {
      inline: true,
      fullscreen: true,
    };
    const powerMap: LockScreenPowerActionMap = {
      sleep: true,
      restart: true,
      shutdown: true,
    };
    const mode: LockScreenDisplayMode = 'inline';
    const powerAction: LockScreenPowerAction = 'sleep';
    const sampleProps: LockScreenOverlayProps = {
      mode,
      defaultLocked: true,
      timeLabel: '09:15',
      dateLabel: 'Monday, November 23',
    };

    expect(modeMap[mode]).toBe(true);
    expect(powerMap[powerAction]).toBe(true);
    expect(sampleProps.timeLabel).toBe('09:15');
  });
});
