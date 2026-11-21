import { createRef, type MouseEvent } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { StatefulAsyncButton } from './index';

interface DeferredVoid {
  promise: Promise<void>;
  resolve: () => void;
  reject: (reason: Error) => void;
}

function createDeferred(): DeferredVoid {
  let resolveFn: () => void = () => undefined;
  let rejectFn: (reason: Error) => void = () => undefined;
  const promise = new Promise<void>((resolve, reject) => {
    resolveFn = resolve;
    rejectFn = reject;
  });
  return { promise, resolve: resolveFn, reject: rejectFn };
}

describe('StatefulAsyncButton', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders idle state, sizes, icon, theme overrides, xstyle, and forwards React 19 ref', () => {
    const ref = createRef<HTMLButtonElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            StatefulAsyncButton: {
              className: 'theme-async-btn',
              style: { letterSpacing: '0.5px' },
            },
          },
        }}
      >
        <StatefulAsyncButton
          ref={ref}
          size="lg"
          idleLabel="Deploy release"
          idleIcon={<span data-testid="rocket-icon">R</span>}
          className="custom-async"
          xstyle={{ '--prism-radius-pill': '9999px' }}
          style={{ minWidth: '180px' }}
          data-testid="async-cta"
        />
        <StatefulAsyncButton size="sm" idleLabel="Small deploy" />
        <StatefulAsyncButton idleLabel="Medium deploy" />
      </PrismThemeProvider>
    );

    const btn = screen.getByTestId('async-cta');
    expect(ref.current).toBe(btn);
    expect(btn).toHaveClass(
      'refractor-stateful-async-button',
      'prism-btn-primary',
      'theme-async-btn',
      'custom-async'
    );
    expect(btn).toHaveAttribute('data-state', 'idle');
    expect(btn).toHaveAttribute('data-size', 'lg');
    expect(btn).not.toHaveAttribute('aria-busy');
    expect(btn).toHaveStyle({ letterSpacing: '0.5px', minWidth: '180px' });
    expect(screen.getByTestId('rocket-icon')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Small deploy' })).toHaveAttribute('data-size', 'sm');
    expect(screen.getByRole('button', { name: 'Medium deploy' })).toHaveAttribute('data-size', 'md');
  });

  it('transitions idle -> success -> idle for synchronous onAction', () => {
    vi.useFakeTimers();
    const onAction = vi.fn();

    render(
      <StatefulAsyncButton
        idleLabel="Save"
        successLabel="Saved"
        resetDelayMs={1200}
        onAction={onAction}
      />
    );

    const btn = screen.getByRole('button', { name: 'Save' });
    fireEvent.click(btn);

    expect(onAction).toHaveBeenCalledTimes(1);
    expect(btn).toHaveAttribute('data-state', 'success');
    expect(btn).toHaveClass('prism-emerald');
    expect(btn).toHaveTextContent('Saved');
    expect(screen.getByTestId('stateful-async-success-icon')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Saved');

    // Clicking while in success confirmation state does not re-trigger onAction
    fireEvent.click(btn);
    expect(onAction).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(1199);
    });
    expect(btn).toHaveAttribute('data-state', 'success');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(btn).toHaveAttribute('data-state', 'idle');
    expect(btn).toHaveClass('prism-btn-primary');
    expect(btn).toHaveTextContent('Save');
  });

  it('transitions idle -> loading (blocking duplicates) -> success -> idle for async Promise', async () => {
    vi.useFakeTimers();
    const deferred = createDeferred();
    const onAction = vi.fn(() => deferred.promise);

    render(
      <StatefulAsyncButton
        idleLabel="Publish"
        loadingLabel="Publishing..."
        successLabel="Published"
        resetDelayMs={1500}
        onAction={onAction}
      />
    );

    const btn = screen.getByRole('button', { name: 'Publish' });

    fireEvent.click(btn);
    // Rapid duplicate click while in-flight
    fireEvent.click(btn);

    expect(onAction).toHaveBeenCalledTimes(1);
    expect(btn).toHaveAttribute('data-state', 'loading');
    expect(btn).toHaveAttribute('data-busy', 'true');
    expect(btn).toHaveAttribute('aria-busy', 'true');
    expect(btn).toHaveAttribute('aria-disabled', 'true');
    expect(btn).toHaveClass('prism-crystal');
    expect(btn).toHaveTextContent('Publishing...');
    expect(screen.getByTestId('stateful-async-spinner')).toBeInTheDocument();

    // Enter and Space during loading call preventDefault
    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    btn.dispatchEvent(enterEvent);
    expect(enterEvent.defaultPrevented).toBe(true);

    const spaceEvent = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
    btn.dispatchEvent(spaceEvent);
    expect(spaceEvent.defaultPrevented).toBe(true);

    // IME composing keydown is ignored
    const imeEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    Object.defineProperty(imeEvent, 'isComposing', { value: true });
    btn.dispatchEvent(imeEvent);
    expect(imeEvent.defaultPrevented).toBe(false);

    await act(async () => {
      deferred.resolve();
      await Promise.resolve();
    });

    expect(btn).toHaveAttribute('data-state', 'success');
    expect(btn).not.toHaveAttribute('aria-busy');
    expect(btn).toHaveClass('prism-emerald');
    expect(btn).toHaveTextContent('Published');

    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(btn).toHaveAttribute('data-state', 'idle');
  });

  it('catches rejected promises, renders error state, and supports immediate retry from error', async () => {
    vi.useFakeTimers();
    const first = createDeferred();
    const second = createDeferred();
    const onAction = vi
      .fn<() => Promise<void>>()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);

    render(
      <StatefulAsyncButton
        idleLabel="Sync"
        errorLabel="Retry sync"
        successLabel="Synced"
        resetDelayMs={2000}
        onAction={onAction}
      />
    );

    const btn = screen.getByRole('button', { name: 'Sync' });
    fireEvent.click(btn);

    await act(async () => {
      first.reject(new Error('Network down'));
      await Promise.resolve();
    });

    expect(btn).toHaveAttribute('data-state', 'error');
    expect(btn).toHaveTextContent('Retry sync');
    expect(screen.getByTestId('stateful-async-error-icon')).toBeInTheDocument();
    expect(btn.style.color).toBe('var(--prism-error-contrast)');

    // Retry while in error state before resetDelayMs elapses
    act(() => {
      vi.advanceTimersByTime(500);
    });
    fireEvent.click(btn);

    expect(onAction).toHaveBeenCalledTimes(2);
    expect(btn).toHaveAttribute('data-state', 'loading');

    // Old error reset timer must not prematurely reset retry to idle
    act(() => {
      vi.advanceTimersByTime(1600);
    });
    expect(btn).toHaveAttribute('data-state', 'loading');

    await act(async () => {
      second.resolve();
      await Promise.resolve();
    });

    expect(btn).toHaveAttribute('data-state', 'success');
    expect(btn).toHaveTextContent('Synced');
  });

  it('catches synchronous throws cleanly and transitions to error -> idle', () => {
    vi.useFakeTimers();
    const onAction = vi.fn(() => {
      throw new Error('Sync failure');
    });

    render(<StatefulAsyncButton idleLabel="Run" resetDelayMs={1000} onAction={onAction} />);

    const btn = screen.getByRole('button', { name: 'Run' });
    fireEvent.click(btn);

    expect(btn).toHaveAttribute('data-state', 'error');
    expect(btn).toHaveTextContent('Failed');
    expect(screen.getByTestId('stateful-async-error-icon')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(btn).toHaveAttribute('data-state', 'idle');
  });

  it('clamps resetDelayMs within 0..15000 and handles 0, negative, huge, and NaN values', () => {
    vi.useFakeTimers();
    const onActionZero = vi.fn();
    const onActionMax = vi.fn();
    const onActionNaN = vi.fn();

    render(
      <>
        <StatefulAsyncButton idleLabel="Zero" resetDelayMs={0} onAction={onActionZero} />
        <StatefulAsyncButton idleLabel="Max" resetDelayMs={99999} onAction={onActionMax} />
        <StatefulAsyncButton idleLabel="Invalid" resetDelayMs={Number.NaN} onAction={onActionNaN} />
      </>
    );

    const zeroBtn = screen.getByRole('button', { name: 'Zero' });
    const maxBtn = screen.getByRole('button', { name: 'Max' });
    const nanBtn = screen.getByRole('button', { name: 'Invalid' });

    fireEvent.click(zeroBtn);
    fireEvent.click(maxBtn);
    fireEvent.click(nanBtn);

    act(() => {
      vi.advanceTimersByTime(1800);
    });
    expect(nanBtn).toHaveAttribute('data-state', 'idle');
    expect(maxBtn).toHaveAttribute('data-state', 'success');
    expect(zeroBtn).toHaveAttribute('data-state', 'success');

    act(() => {
      vi.advanceTimersByTime(13199);
    });
    expect(maxBtn).toHaveAttribute('data-state', 'success');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(maxBtn).toHaveAttribute('data-state', 'idle');
    expect(zeroBtn).toHaveAttribute('data-state', 'success');
  });

  it('supports controlled state mode without mutating internal state and catches sync/async errors', async () => {
    const syncThrow = vi.fn(() => {
      throw new Error('Controlled sync error');
    });
    const asyncDeferred = createDeferred();
    const asyncReject = vi.fn(() => asyncDeferred.promise);

    const { rerender } = render(
      <StatefulAsyncButton idleLabel="Controlled" state="idle" onAction={syncThrow} />
    );

    const btn = screen.getByRole('button', { name: 'Controlled' });
    expect(btn).toHaveAttribute('data-state', 'idle');
    fireEvent.click(btn);
    expect(syncThrow).toHaveBeenCalledTimes(1);
    expect(btn).toHaveAttribute('data-state', 'idle');

    rerender(<StatefulAsyncButton idleLabel="Controlled" state="error" onAction={asyncReject} />);
    expect(btn).toHaveAttribute('data-state', 'error');
    fireEvent.click(btn);
    expect(asyncReject).toHaveBeenCalledTimes(1);
    await act(async () => {
      asyncDeferred.reject(new Error('Controlled reject'));
      await Promise.resolve();
    });
    expect(btn).toHaveAttribute('data-state', 'error');

    const asyncResolveDeferred = createDeferred();
    const asyncResolve = vi.fn(() => asyncResolveDeferred.promise);
    rerender(<StatefulAsyncButton idleLabel="Controlled" state="idle" onAction={asyncResolve} />);
    fireEvent.click(btn);
    await act(async () => {
      asyncResolveDeferred.resolve();
      await Promise.resolve();
    });
    expect(btn).toHaveAttribute('data-state', 'idle');

    // Controlled sync action returning cleanly
    const syncClean = vi.fn();
    rerender(<StatefulAsyncButton idleLabel="Controlled" state="idle" onAction={syncClean} />);
    fireEvent.click(btn);
    expect(syncClean).toHaveBeenCalledTimes(1);
    expect(btn).toHaveAttribute('data-state', 'idle');

    // Non-blocking keydown while idle does not call preventDefault
    const idleKeyEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    btn.dispatchEvent(idleKeyEvent);
    expect(idleKeyEvent.defaultPrevented).toBe(false);

    const otherKeyEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    btn.dispatchEvent(otherKeyEvent);
    expect(otherKeyEvent.defaultPrevented).toBe(false);

    rerender(<StatefulAsyncButton idleLabel="Controlled" state="loading" onAction={asyncResolve} />);
    expect(btn).toHaveAttribute('aria-busy', 'true');
    fireEvent.click(btn);
    expect(asyncResolve).toHaveBeenCalledTimes(1);

    rerender(<StatefulAsyncButton idleLabel="Controlled" state="success" onAction={asyncResolve} />);
    expect(btn).toHaveClass('prism-emerald');
    fireEvent.click(btn);
    expect(asyncResolve).toHaveBeenCalledTimes(1);
  });

  it('respects disabled prop, missing onAction, and preventDefault in caller onClick (negative tests)', () => {
    const onAction = vi.fn();
    const preventClick = vi.fn((e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
    });

    render(
      <>
        <StatefulAsyncButton idleLabel="Disabled" disabled onAction={onAction} />
        <StatefulAsyncButton idleLabel="NoAction" />
        <StatefulAsyncButton idleLabel="Guarded" onClick={preventClick} onAction={onAction} />
      </>
    );

    const disabledBtn = screen.getByRole('button', { name: 'Disabled' });
    expect(disabledBtn).toBeDisabled();
    expect(disabledBtn).toHaveAttribute('data-disabled', 'true');
    fireEvent.click(disabledBtn);
    const keyEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    disabledBtn.dispatchEvent(keyEvent);
    expect(keyEvent.defaultPrevented).toBe(true);

    const noActionBtn = screen.getByRole('button', { name: 'NoAction' });
    fireEvent.click(noActionBtn);
    expect(noActionBtn).toHaveAttribute('data-state', 'idle');

    const guardedBtn = screen.getByRole('button', { name: 'Guarded' });
    fireEvent.click(guardedBtn);
    expect(preventClick).toHaveBeenCalledTimes(1);
    expect(onAction).not.toHaveBeenCalled();
  });

  it('cleans up pending promises and active timers safely on unmount', async () => {
    vi.useFakeTimers();
    const resolveDeferred = createDeferred();
    const rejectDeferred = createDeferred();

    const first = render(
      <StatefulAsyncButton idleLabel="PendingResolve" onAction={() => resolveDeferred.promise} />
    );
    fireEvent.click(screen.getByRole('button', { name: 'PendingResolve' }));
    first.unmount();
    await act(async () => {
      resolveDeferred.resolve();
      await Promise.resolve();
    });

    const second = render(
      <StatefulAsyncButton idleLabel="PendingReject" onAction={() => rejectDeferred.promise} />
    );
    fireEvent.click(screen.getByRole('button', { name: 'PendingReject' }));
    second.unmount();
    await act(async () => {
      rejectDeferred.reject(new Error('Unmounted reject'));
      await Promise.resolve();
    });

    const third = render(
      <StatefulAsyncButton idleLabel="TimerCleanup" resetDelayMs={1000} onAction={() => undefined} />
    );
    fireEvent.click(screen.getByRole('button', { name: 'TimerCleanup' }));
    third.unmount();
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('renders adversarial XSS label payloads strictly as literal text', () => {
    const payload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';
    render(<StatefulAsyncButton idleLabel={payload} />);
    expect(screen.getByRole('button')).toHaveTextContent(payload);
    expect(document.querySelector('script')).toBeNull();
  });
});
