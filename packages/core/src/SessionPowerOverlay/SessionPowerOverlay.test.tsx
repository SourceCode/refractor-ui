import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  SessionPowerOverlay,
  type SessionPowerActionId,
  type SessionPowerActionIdMap,
  type SessionPowerDisplayMode,
  type SessionPowerDisplayModeMap,
} from './index';

function dispatchComposingKeyDown(
  target: Element | Node | Document | Window,
  key: string
): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
  });
  Object.defineProperty(event, 'isComposing', { value: true });
  fireEvent(target, event);
  return event;
}

describe('SessionPowerOverlay', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders inline prism-slab defaults, 4 tactile power action cards, ref passthrough, optical tokens, and theme overrides', () => {
    const actionMap: SessionPowerActionIdMap = {
      sleep: true,
      restart: true,
      shutdown: true,
      logout: true,
    };
    const allActions: ReadonlyArray<SessionPowerActionId> = [
      'sleep',
      'restart',
      'shutdown',
      'logout',
    ];
    for (const action of allActions) {
      expect(actionMap[action]).toBe(true);
    }

    const modeMap: SessionPowerDisplayModeMap = { inline: true, modal: true };
    const allModes: ReadonlyArray<SessionPowerDisplayMode> = ['inline', 'modal'];
    for (const mode of allModes) {
      expect(modeMap[mode]).toBe(true);
    }

    expect(SessionPowerOverlay.displayName).toBe('SessionPowerOverlay');

    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            SessionPowerOverlay: {
              className: 'theme-power-override',
              style: { opacity: '0.96' },
            },
          },
        }}
      >
        <SessionPowerOverlay
          ref={ref}
          className="local-power-class"
          style={{ letterSpacing: '0.01em' }}
          xstyle={{ '--prism-blur-px': '20px' }}
          data-testid="power-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('power-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveAttribute('role', 'region');
    expect(root).toHaveClass(
      'refractor-session-power-overlay',
      'prism-slab',
      'theme-power-override',
      'local-power-class'
    );
    expect(root).toHaveAttribute('data-mode', 'inline');
    expect(root).toHaveAttribute('data-open', 'true');
    expect(root).toHaveAttribute('data-action', 'shutdown');
    expect(root).toHaveAttribute('data-reopen-windows', 'true');
    expect(root).not.toHaveAttribute('data-countdown-active');
    expect(root).not.toHaveAttribute('data-disabled');
    expect(root).toHaveStyle({ opacity: '0.96' });
    expect(root.style.letterSpacing).toBe('0.01em');
    expect(root.style.getPropertyValue('--prism-blur-px')).toBe('20px');

    expect(
      screen.getByRole('heading', { name: 'Power & Session' })
    ).toBeInTheDocument();

    const radioGroup = screen.getByRole('radiogroup', {
      name: 'Power and session actions',
    });
    expect(radioGroup).toHaveClass('grid-cols-2', 'sm:grid-cols-4', 'gap-2.5');

    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(4);
    expect(screen.getByTestId('session-power-action-sleep')).toHaveAttribute(
      'aria-checked',
      'false'
    );
    expect(screen.getByTestId('session-power-action-restart')).toHaveAttribute(
      'aria-checked',
      'false'
    );
    expect(screen.getByTestId('session-power-action-shutdown')).toHaveAttribute(
      'aria-checked',
      'true'
    );
    expect(screen.getByTestId('session-power-action-shutdown')).toHaveAttribute(
      'tabindex',
      '0'
    );
    expect(screen.getByTestId('session-power-action-logout')).toHaveAttribute(
      'aria-checked',
      'false'
    );

    const reopenCheckbox = screen.getByRole('checkbox', {
      name: 'Reopen windows when logging back in',
    });
    expect(reopenCheckbox).toBeEnabled();
    expect(reopenCheckbox).toBeChecked();

    expect(screen.getByTestId('session-power-countdown-value')).toHaveTextContent(
      '60s'
    );
    expect(
      screen.getByRole('button', { name: 'Start Timer' })
    ).toBeEnabled();
    expect(
      screen.getByRole('button', { name: 'Confirm Shut Down' })
    ).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled();

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent('Ready to shut down · reopen windows on.');
  });

  it('switches across all 4 power actions via click and IME-safe Arrow/Home/End keyboard navigation, confirming each action accurately', () => {
    const onConfirmAction = vi.fn();

    render(<SessionPowerOverlay onConfirmAction={onConfirmAction} />);

    const sleepRadio = screen.getByTestId('session-power-action-sleep');
    const restartRadio = screen.getByTestId('session-power-action-restart');
    const shutdownRadio = screen.getByTestId('session-power-action-shutdown');
    const logoutRadio = screen.getByTestId('session-power-action-logout');

    // Click each card & verify confirm button + callback
    fireEvent.click(restartRadio);
    expect(restartRadio).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('Selected Restart.');
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Restart' }));
    expect(onConfirmAction).toHaveBeenLastCalledWith('restart', true);

    fireEvent.click(logoutRadio);
    expect(logoutRadio).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Log Out' }));
    expect(onConfirmAction).toHaveBeenLastCalledWith('logout', true);

    fireEvent.click(sleepRadio);
    expect(sleepRadio).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Sleep' }));
    expect(onConfirmAction).toHaveBeenLastCalledWith('sleep', false);

    // Keyboard switching with wraparound & roving focus
    sleepRadio.focus();
    fireEvent.keyDown(sleepRadio, { key: 'ArrowRight' });
    expect(restartRadio).toHaveAttribute('aria-checked', 'true');
    expect(document.activeElement).toBe(restartRadio);

    fireEvent.keyDown(restartRadio, { key: 'ArrowDown' });
    expect(shutdownRadio).toHaveAttribute('aria-checked', 'true');
    expect(document.activeElement).toBe(shutdownRadio);

    fireEvent.keyDown(shutdownRadio, { key: 'End' });
    expect(logoutRadio).toHaveAttribute('aria-checked', 'true');
    expect(document.activeElement).toBe(logoutRadio);

    // ArrowRight from last wraps to first ('sleep')
    fireEvent.keyDown(logoutRadio, { key: 'ArrowRight' });
    expect(sleepRadio).toHaveAttribute('aria-checked', 'true');
    expect(document.activeElement).toBe(sleepRadio);

    // ArrowLeft from first wraps to last ('logout')
    fireEvent.keyDown(sleepRadio, { key: 'ArrowLeft' });
    expect(logoutRadio).toHaveAttribute('aria-checked', 'true');
    expect(document.activeElement).toBe(logoutRadio);

    // ArrowUp moves backward to 'shutdown'
    fireEvent.keyDown(logoutRadio, { key: 'ArrowUp' });
    expect(shutdownRadio).toHaveAttribute('aria-checked', 'true');
    expect(document.activeElement).toBe(shutdownRadio);

    // Home jumps to first ('sleep')
    fireEvent.keyDown(shutdownRadio, { key: 'Home' });
    expect(sleepRadio).toHaveAttribute('aria-checked', 'true');
    expect(document.activeElement).toBe(sleepRadio);

    // Unhandled key leaves selection unchanged
    fireEvent.keyDown(sleepRadio, { key: 'a' });
    expect(sleepRadio).toHaveAttribute('aria-checked', 'true');
  });

  it('manages the Reopen Windows checkbox state and disables it with explanatory note when Sleep is selected', () => {
    const onConfirmAction = vi.fn();

    const { rerender } = render(
      <SessionPowerOverlay
        defaultSelectedAction="shutdown"
        defaultReopenWindows={false}
        onConfirmAction={onConfirmAction}
      />
    );

    const checkbox = screen.getByRole('checkbox', {
      name: 'Reopen windows when logging back in',
    });
    expect(checkbox).toBeEnabled();
    expect(checkbox).not.toBeChecked();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Ready to shut down · reopen windows off.'
    );

    // Toggle checkbox ON
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Reopen windows when logging back in enabled.'
    );

    // Toggle checkbox OFF
    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Reopen windows when logging back in disabled.'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Shut Down' }));
    expect(onConfirmAction).toHaveBeenLastCalledWith('shutdown', false);

    // Toggle back ON, then switch to Sleep -> checkbox unchecked & disabled with note
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();

    fireEvent.click(screen.getByTestId('session-power-action-sleep'));
    expect(checkbox).toBeDisabled();
    expect(checkbox).not.toBeChecked();
    expect(screen.getByTestId('session-power-reopen-note')).toHaveTextContent(
      'Not applicable to Sleep'
    );

    // Clicking disabled checkbox while Sleep is active is safely ignored
    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();

    // Non-composing keydown on checkbox is not prevented
    const nonComposingEvent = new KeyboardEvent('keydown', {
      key: ' ',
      bubbles: true,
      cancelable: true,
    });
    fireEvent(checkbox, nonComposingEvent);
    expect(nonComposingEvent.defaultPrevented).toBe(false);

    // Switching back to Restart restores user's preserved preference (checked)
    fireEvent.click(screen.getByTestId('session-power-action-restart'));
    expect(checkbox).toBeEnabled();
    expect(checkbox).toBeChecked();

    // Verify defaultSelectedAction="sleep" initial idle status
    rerender(<SessionPowerOverlay key="sleep-init" defaultSelectedAction="sleep" />);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Ready to sleep · preserves open windows in memory.'
    );
  });

  it('runs a live 1-second countdown via Start/Stop Timer and autoStartCountdown, firing onConfirmAction once at 0 and cleaning up intervals', () => {
    vi.useFakeTimers();
    const onConfirmAction = vi.fn();
    const onCancel = vi.fn();

    render(
      <SessionPowerOverlay
        countdownSeconds={3}
        onConfirmAction={onConfirmAction}
        onCancel={onCancel}
      />
    );

    // Start countdown manually
    fireEvent.click(screen.getByRole('button', { name: 'Start Timer' }));
    expect(screen.getByRole('button', { name: 'Stop Timer' })).toBeInTheDocument();
    expect(screen.getByTestId('session-power-countdown')).toHaveAttribute(
      'data-running',
      'true'
    );
    expect(screen.getByTestId('session-power-active-pill')).toHaveTextContent(
      'Shut Down · 3s'
    );

    // Advance 1 second -> 2s remaining
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByTestId('session-power-countdown-value')).toHaveTextContent(
      '2s'
    );

    // Stop timer mid-countdown -> cancels interval and resets to 3s
    fireEvent.click(screen.getByRole('button', { name: 'Stop Timer' }));
    expect(screen.getByRole('button', { name: 'Start Timer' })).toBeInTheDocument();
    expect(screen.getByTestId('session-power-countdown-value')).toHaveTextContent(
      '3s'
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'Stopped auto-action countdown.'
    );

    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(onConfirmAction).not.toHaveBeenCalled();

    // Start again, switch action to Restart mid-countdown, let it hit 0 -> executes Restart once
    fireEvent.click(screen.getByRole('button', { name: 'Start Timer' }));
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByTestId('session-power-countdown-value')).toHaveTextContent(
      '1s'
    );

    fireEvent.click(screen.getByTestId('session-power-action-restart'));
    fireEvent.click(
      screen.getByRole('checkbox', {
        name: 'Reopen windows when logging back in',
      })
    ); // reopen = false

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onConfirmAction).toHaveBeenCalledTimes(1);
    expect(onConfirmAction).toHaveBeenLastCalledWith('restart', false);
    expect(screen.getByTestId('session-power-countdown-value')).toHaveTextContent(
      '0s'
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'Countdown complete. Executing Restart (reopen windows disabled).'
    );

    // Extra elapsed time never double-fires onConfirmAction
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(onConfirmAction).toHaveBeenCalledTimes(1);

    // Restarting after reaching 0 resets cleanly back to 3s; clicking Confirm stops interval
    fireEvent.click(screen.getByRole('button', { name: 'Start Timer' }));
    expect(screen.getByTestId('session-power-countdown-value')).toHaveTextContent(
      '3s'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Restart' }));
    expect(onConfirmAction).toHaveBeenCalledTimes(2);

    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(onConfirmAction).toHaveBeenCalledTimes(2);

    // Clicking Cancel while running stops interval & calls onCancel
    fireEvent.click(screen.getByRole('button', { name: 'Start Timer' }));
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(onConfirmAction).toHaveBeenCalledTimes(2);
  });

  it('auto-starts countdown, handles Sleep/Shutdown auto-fire announcements, cleans up interval on unmount, disable, and prop duration change', () => {
    vi.useFakeTimers();
    const clearIntervalSpy = vi.spyOn(window, 'clearInterval');
    const onConfirmAction = vi.fn();

    const { rerender, unmount } = render(
      <SessionPowerOverlay
        countdownSeconds={2}
        autoStartCountdown
        defaultSelectedAction="sleep"
        onConfirmAction={onConfirmAction}
      />
    );

    // Idle auto-started live status before any user action
    expect(screen.getByRole('status')).toHaveTextContent('Sleep scheduled in 2s.');

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(onConfirmAction).toHaveBeenCalledTimes(1);
    expect(onConfirmAction).toHaveBeenLastCalledWith('sleep', false);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Countdown complete. Executing Sleep.'
    );

    // Dynamically updating countdownSeconds prop resets & restarts when autoStartCountdown is true
    rerender(
      <SessionPowerOverlay
        countdownSeconds={4}
        autoStartCountdown
        defaultSelectedAction="sleep"
        onConfirmAction={onConfirmAction}
      />
    );
    expect(screen.getByTestId('session-power-countdown-value')).toHaveTextContent(
      '4s'
    );

    // Disabling mid-countdown halts timer immediately
    rerender(
      <SessionPowerOverlay
        countdownSeconds={4}
        autoStartCountdown
        disabled
        defaultSelectedAction="sleep"
        onConfirmAction={onConfirmAction}
      />
    );
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(onConfirmAction).toHaveBeenCalledTimes(1);

    // Re-enable, start timer, and unmount mid-countdown -> interval strictly cleared
    rerender(
      <SessionPowerOverlay
        countdownSeconds={5}
        autoStartCountdown
        disabled={false}
        defaultSelectedAction="sleep"
        onConfirmAction={onConfirmAction}
      />
    );
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    const clearCountBeforeUnmount = clearIntervalSpy.mock.calls.length;
    unmount();
    expect(clearIntervalSpy.mock.calls.length).toBeGreaterThan(
      clearCountBeforeUnmount
    );

    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(onConfirmAction).toHaveBeenCalledTimes(1);
  });

  it('sanitizes countdownSeconds for 0, negative, NaN, Infinity, fractional, and oversized values', () => {
    vi.useFakeTimers();
    const onConfirmAction = vi.fn();

    const { rerender } = render(
      <SessionPowerOverlay
        countdownSeconds={0}
        autoStartCountdown
        onConfirmAction={onConfirmAction}
      />
    );
    expect(screen.queryByTestId('session-power-countdown')).toBeNull();
    expect(screen.queryByRole('button', { name: /Timer/i })).toBeNull();
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(onConfirmAction).not.toHaveBeenCalled();

    for (const invalidValue of [
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      -42,
    ]) {
      rerender(
        <SessionPowerOverlay
          countdownSeconds={invalidValue}
          autoStartCountdown
          onConfirmAction={onConfirmAction}
        />
      );
      expect(screen.queryByTestId('session-power-countdown')).toBeNull();
      expect(document.body.textContent).not.toContain('NaN');
      expect(document.body.textContent).not.toContain('Infinity');
    }

    // Fractional duration floors cleanly; huge values cap at 3600s
    rerender(<SessionPowerOverlay countdownSeconds={7.9} />);
    expect(screen.getByTestId('session-power-countdown-value')).toHaveTextContent(
      '7s'
    );

    rerender(<SessionPowerOverlay countdownSeconds={99999} />);
    expect(screen.getByTestId('session-power-countdown-value')).toHaveTextContent(
      '3600s'
    );
  });

  it('handles modal mode visibility, dimmed backdrop click, close button, Escape dismissal, and clean window listener removal on unmount', () => {
    vi.useFakeTimers();
    const removeListenerSpy = vi.spyOn(window, 'removeEventListener');
    const onCancel = vi.fn();
    const onConfirmAction = vi.fn();
    const ref = createRef<HTMLDivElement>();

    const { container, rerender, unmount } = render(
      <SessionPowerOverlay
        mode="modal"
        open={false}
        countdownSeconds={2}
        autoStartCountdown
        onCancel={onCancel}
        onConfirmAction={onConfirmAction}
      />
    );

    // Closed modal returns null, does not fire Escape or run countdown
    expect(container.firstChild).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCancel).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(onConfirmAction).not.toHaveBeenCalled();

    // Open modal -> renders dimmed backdrop, role="dialog" aria-modal="true", and auto-starts countdown
    rerender(
      <SessionPowerOverlay
        ref={ref}
        mode="modal"
        open={true}
        countdownSeconds={2}
        autoStartCountdown
        onCancel={onCancel}
        onConfirmAction={onConfirmAction}
        className="modal-custom"
      />
    );

    const backdrop = screen.getByTestId('session-power-backdrop');
    expect(ref.current).toBe(backdrop);
    expect(backdrop).toHaveClass(
      'refractor-session-power-overlay',
      'fixed',
      'inset-0',
      'modal-custom'
    );
    expect(backdrop).toHaveAttribute('data-mode', 'modal');

    const dialog = screen.getByRole('dialog', { name: 'Power & Session' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveClass('prism-slab');

    // Auto-started countdown fires onConfirmAction with reopenWindows=true when reaching 0
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(onConfirmAction).toHaveBeenCalledTimes(1);
    expect(onConfirmAction).toHaveBeenLastCalledWith('shutdown', true);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Countdown complete. Executing Shut Down (reopen windows enabled).'
    );

    // Clicking inside dialog panel does NOT dismiss
    fireEvent.click(dialog);
    expect(onCancel).not.toHaveBeenCalled();

    // Clicking dimmed backdrop dismisses
    fireEvent.click(backdrop);
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Canceled power overlay via backdrop.'
    );

    // Clicking modal close button dismisses
    fireEvent.click(
      screen.getByRole('button', { name: 'Close power overlay' })
    );
    expect(onCancel).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Canceled power overlay.'
    );

    // Escape on dialog calls onCancel once (not double-fired with window listener)
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(3);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Canceled power overlay via Escape.'
    );

    // Non-Escape key on dialog & window does nothing
    fireEvent.keyDown(dialog, { key: 'x' });
    fireEvent.keyDown(window, { key: 'x' });
    expect(onCancel).toHaveBeenCalledTimes(3);

    // Escape directly on window calls onCancel once
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(4);

    // Closing modal stops running timer and removes window Escape listener
    rerender(
      <SessionPowerOverlay
        mode="modal"
        open={false}
        countdownSeconds={2}
        autoStartCountdown
        onCancel={onCancel}
        onConfirmAction={onConfirmAction}
      />
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(4);

    // Reopen without autoStartCountdown -> remains idle, then unmount cleanly removes window listener
    rerender(
      <SessionPowerOverlay
        mode="modal"
        open={true}
        countdownSeconds={5}
        autoStartCountdown={false}
        onCancel={onCancel}
        onConfirmAction={onConfirmAction}
      />
    );
    expect(screen.getByTestId('session-power-countdown')).not.toHaveAttribute(
      'data-running'
    );

    const removeCountBeforeUnmount = removeListenerSpy.mock.calls.filter(
      (call) => call[0] === 'keydown'
    ).length;
    unmount();
    const removeCountAfterUnmount = removeListenerSpy.mock.calls.filter(
      (call) => call[0] === 'keydown'
    ).length;
    expect(removeCountAfterUnmount).toBeGreaterThan(removeCountBeforeUnmount);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(4);
  });

  it('guards radio switching, checkbox keydown, and Escape dismissal during active IME composition', () => {
    const onCancel = vi.fn();

    render(
      <SessionPowerOverlay
        mode="modal"
        open={true}
        onCancel={onCancel}
      />
    );

    const shutdownRadio = screen.getByTestId('session-power-action-shutdown');
    const checkbox = screen.getByRole('checkbox', {
      name: 'Reopen windows when logging back in',
    });
    const dialog = screen.getByRole('dialog');

    dispatchComposingKeyDown(shutdownRadio, 'ArrowRight');
    dispatchComposingKeyDown(shutdownRadio, 'ArrowLeft');
    dispatchComposingKeyDown(shutdownRadio, 'Home');
    dispatchComposingKeyDown(shutdownRadio, 'End');
    dispatchComposingKeyDown(dialog, 'Escape');
    dispatchComposingKeyDown(window, 'Escape');

    const checkboxEvent = dispatchComposingKeyDown(checkbox, ' ');
    expect(checkboxEvent.defaultPrevented).toBe(true);

    expect(shutdownRadio).toHaveAttribute('aria-checked', 'true');
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('respects disabled state across action cards, checkbox, timer, buttons, backdrop click, and Escape', () => {
    const onConfirmAction = vi.fn();
    const onCancel = vi.fn();

    render(
      <SessionPowerOverlay
        mode="modal"
        open={true}
        disabled
        onConfirmAction={onConfirmAction}
        onCancel={onCancel}
      />
    );

    const backdrop = screen.getByTestId('session-power-backdrop');
    expect(backdrop).toHaveAttribute('data-disabled', 'true');

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-disabled', 'true');

    const radioGroup = screen.getByRole('radiogroup', {
      name: 'Power and session actions',
    });
    expect(radioGroup).toHaveAttribute('aria-disabled', 'true');

    const shutdownRadio = screen.getByTestId('session-power-action-shutdown');
    const sleepRadio = screen.getByTestId('session-power-action-sleep');
    expect(shutdownRadio).toBeDisabled();
    expect(shutdownRadio).toHaveAttribute('tabindex', '-1');

    const checkbox = screen.getByRole('checkbox', {
      name: 'Reopen windows when logging back in',
    });
    expect(checkbox).toBeDisabled();

    expect(screen.getByRole('button', { name: 'Start Timer' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Confirm Shut Down' })
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Close power overlay' })
    ).toBeDisabled();

    // Attempt direct interactions while disabled
    fireEvent.click(sleepRadio);
    fireEvent.keyDown(shutdownRadio, { key: 'ArrowRight' });
    fireEvent.click(checkbox);
    fireEvent.click(backdrop);
    fireEvent.keyDown(dialog, { key: 'Escape' });
    fireEvent.keyDown(window, { key: 'Escape' });

    expect(shutdownRadio).toHaveAttribute('aria-checked', 'true');
    expect(checkbox).toBeChecked();
    expect(onConfirmAction).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('handles blank title/aria-label fallbacks, adversarial XSS payloads, omitted callbacks, and composed handlers safely', () => {
    const xssPayload =
      '<script>window.__powerXss=1</script><img src=x onerror=alert(1)>';
    const customOnClick = vi.fn((event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
    });
    const customOnKeyDown = vi.fn(
      (event: React.KeyboardEvent<HTMLDivElement>) => {
        event.preventDefault();
      }
    );
    const onCancel = vi.fn();

    const { rerender } = render(
      <SessionPowerOverlay
        mode="modal"
        open={true}
        title="   "
        aria-label="Custom power dialog"
        onClick={customOnClick}
        onKeyDown={customOnKeyDown}
        onCancel={onCancel}
      />
    );

    expect(
      screen.getByRole('heading', { name: 'Power & Session' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('dialog', { name: 'Custom power dialog' })
    ).toBeInTheDocument();

    // Caller preventDefault suppresses backdrop click & Escape cancel via composeEventHandlers
    fireEvent.click(screen.getByTestId('session-power-backdrop'));
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(customOnClick).toHaveBeenCalledTimes(1);
    expect(customOnKeyDown).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();

    // Adversarial XSS string in title & omitted callbacks never execute or throw
    rerender(
      <SessionPowerOverlay
        mode="inline"
        title={xssPayload}
        aria-label="   "
      />
    );

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(
      screen.getByRole('heading', { name: xssPayload })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: xssPayload })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Confirm Shut Down' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    // Custom explicit aria-label in inline mode overrides aria-labelledby
    rerender(
      <SessionPowerOverlay
        mode="inline"
        aria-label="Inline system power region"
      />
    );
    expect(
      screen.getByRole('region', { name: 'Inline system power region' })
    ).not.toHaveAttribute('aria-labelledby');
  });
});
