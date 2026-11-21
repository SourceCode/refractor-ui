import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { PullToRefresh } from './index';

function setScrollTop(element: HTMLElement, value: number) {
  Object.defineProperty(element, 'scrollTop', {
    value,
    writable: true,
    configurable: true,
  });
}

describe('PullToRefresh', () => {
  it('renders optical container, ref, theme override, status region, progress bar, and manual refresh button', () => {
    const ref = createRef<HTMLDivElement>();
    const onRefresh = vi.fn<() => void>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            PullToRefresh: { className: 'theme-ptr', style: { maxHeight: '420px' } },
          },
        }}
      >
        <PullToRefresh
          ref={ref}
          onRefresh={onRefresh}
          pullLabel="Pull to sync"
          releaseLabel="Let go to sync"
          refreshingLabel="Syncing..."
          className="local-ptr"
          xstyle={{ '--prism-blur-px': '22px' }}
          data-testid="ptr-root"
        >
          <p>Feed Item 1</p>
        </PullToRefresh>
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('ptr-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass('refractor-pull-to-refresh', 'prism-slab', 'theme-ptr', 'local-ptr');
    expect(root).toHaveAttribute('data-status', 'idle');
    expect(root).not.toHaveAttribute('data-refreshing');
    expect(root).not.toHaveAttribute('data-disabled');
    expect(root).toHaveStyle({ maxHeight: '420px' });

    expect(screen.getByText('Feed Item 1')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Pull to sync');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');

    const manualBtn = screen.getByRole('button', { name: 'Refresh' });
    expect(manualBtn).toBeEnabled();
    fireEvent.pointerDown(manualBtn, { clientY: 10 });
    fireEvent.click(manualBtn);
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(root).toHaveAttribute('data-status', 'idle');
  });

  it('transitions idle -> pulling -> ready -> refreshing -> idle on async pull gesture', async () => {
    let resolveRefresh: (() => void) | null = null;
    const onRefresh = vi.fn<() => Promise<void>>(
      () =>
        new Promise<void>((resolve) => {
          resolveRefresh = resolve;
        })
    );

    render(
      <PullToRefresh onRefresh={onRefresh} threshold={64} data-testid="ptr-async">
        <div>Async Content</div>
      </PullToRefresh>
    );

    const root = screen.getByTestId('ptr-async');
    setScrollTop(root, 0);

    // Move/up/cancel before pointerDown are no-ops
    fireEvent.pointerMove(root, { clientY: 100 });
    fireEvent.pointerUp(root);
    fireEvent.pointerCancel(root);
    expect(root).toHaveAttribute('data-status', 'idle');

    // Secondary button click does not start pull
    fireEvent.pointerDown(root, { clientY: 20, button: 2 });
    fireEvent.pointerMove(root, { clientY: 200 });
    fireEvent.pointerUp(root);
    expect(onRefresh).not.toHaveBeenCalled();

    // Drag down partially (deltaY=60 -> damped 33 < 64) enters 'pulling'
    fireEvent.pointerDown(root, { clientY: 20, button: 0 });
    fireEvent.pointerMove(root, { clientY: 80 });
    expect(root).toHaveAttribute('data-status', 'pulling');
    expect(screen.getByRole('status')).toHaveTextContent('Pull to refresh');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '52');

    // Drag upward (deltaY <= 0) returns distance to 0 -> 'idle'
    fireEvent.pointerMove(root, { clientY: 10 });
    expect(root).toHaveAttribute('data-status', 'idle');

    // Drag down past threshold (deltaY=140 -> damped 77 >= 64) enters 'ready'
    fireEvent.pointerMove(root, { clientY: 160 });
    expect(root).toHaveAttribute('data-status', 'ready');
    expect(screen.getByRole('status')).toHaveTextContent('Release to refresh');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');

    // Releasing in 'ready' state triggers async onRefresh
    fireEvent.pointerUp(root);
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(root).toHaveAttribute('data-status', 'refreshing');
    expect(root).toHaveAttribute('data-refreshing', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('Refreshing...');
    expect(screen.getByTestId('pull-to-refresh-icon')).toHaveClass('animate-spin');
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeDisabled();

    // Subsequent pulls while refreshing are ignored
    fireEvent.pointerDown(root, { clientY: 0, button: 0 });
    fireEvent.pointerMove(root, { clientY: 300 });
    fireEvent.pointerUp(root);
    expect(onRefresh).toHaveBeenCalledTimes(1);

    // Resolve promise -> resets cleanly to 'idle'
    await act(async () => {
      resolveRefresh?.();
    });

    await waitFor(() => {
      expect(root).toHaveAttribute('data-status', 'idle');
    });
    expect(root).not.toHaveAttribute('data-refreshing');
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeEnabled();
  });

  it('does not trigger refresh when released below threshold, cancelled, or when scrollTop > 0 (negative tests)', () => {
    const onRefresh = vi.fn<() => void>();

    render(
      <PullToRefresh onRefresh={onRefresh} threshold={64} showManualButton={false} data-testid="ptr-neg">
        <div>Scrollable Body</div>
      </PullToRefresh>
    );

    const root = screen.getByTestId('ptr-neg');
    expect(screen.queryByTestId('pull-to-refresh-toolbar')).not.toBeInTheDocument();

    // Release below threshold
    setScrollTop(root, 0);
    fireEvent.pointerDown(root, { clientY: 0, button: 0 });
    fireEvent.pointerMove(root, { clientY: 50 }); // 27.5 < 64
    expect(root).toHaveAttribute('data-status', 'pulling');
    fireEvent.pointerUp(root);
    expect(root).toHaveAttribute('data-status', 'idle');
    expect(onRefresh).not.toHaveBeenCalled();

    // Pointer cancel while ready does not trigger refresh
    fireEvent.pointerDown(root, { clientY: 0, button: 0 });
    fireEvent.pointerMove(root, { clientY: 200 });
    expect(root).toHaveAttribute('data-status', 'ready');
    fireEvent.pointerCancel(root);
    expect(root).toHaveAttribute('data-status', 'idle');
    expect(onRefresh).not.toHaveBeenCalled();

    // When scrollTop > 0 at pointerDown, pull is blocked
    setScrollTop(root, 45);
    fireEvent.pointerDown(root, { clientY: 0, button: 0 });
    fireEvent.pointerMove(root, { clientY: 200 });
    expect(root).toHaveAttribute('data-status', 'idle');
    fireEvent.pointerUp(root);
    expect(onRefresh).not.toHaveBeenCalled();

    // When scrollTop becomes > 0 mid-pull, pull aborts cleanly
    setScrollTop(root, 0);
    fireEvent.pointerDown(root, { clientY: 0, button: 0 });
    fireEvent.pointerMove(root, { clientY: 60 });
    expect(root).toHaveAttribute('data-status', 'pulling');
    setScrollTop(root, 20);
    fireEvent.pointerMove(root, { clientY: 160 });
    expect(root).toHaveAttribute('data-status', 'idle');
    fireEvent.pointerUp(root);
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('gracefully absorbs rejected async promises, sync throws, and unmounts during pending refresh', async () => {
    const rejectingRefresh = vi.fn<() => Promise<void>>(() =>
      Promise.reject(new Error('Network unavailable'))
    );

    const { rerender, unmount } = render(
      <PullToRefresh onRefresh={rejectingRefresh} data-testid="ptr-error">
        <div>Error Recovery Feed</div>
      </PullToRefresh>
    );

    const root = screen.getByTestId('ptr-error');
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(rejectingRefresh).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(root).toHaveAttribute('data-status', 'idle');
    });

    // Synchronous throw is also absorbed cleanly
    const throwingRefresh = vi.fn<() => void>(() => {
      throw new Error('Sync failure');
    });
    rerender(
      <PullToRefresh onRefresh={throwingRefresh} data-testid="ptr-error">
        <div>Error Recovery Feed</div>
      </PullToRefresh>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(throwingRefresh).toHaveBeenCalledTimes(1);
    expect(root).toHaveAttribute('data-status', 'idle');

    // Unmount while promise is pending does not update unmounted state
    let finishPending: (() => void) | null = null;
    const slowRefresh = vi.fn<() => Promise<void>>(
      () =>
        new Promise<void>((resolve) => {
          finishPending = resolve;
        })
    );
    rerender(
      <PullToRefresh onRefresh={slowRefresh} data-testid="ptr-error">
        <div>Pending Feed</div>
      </PullToRefresh>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(root).toHaveAttribute('data-status', 'refreshing');
    unmount();

    await act(async () => {
      finishPending?.();
    });
    expect(slowRefresh).toHaveBeenCalledTimes(1);
  });

  it('supports controlled refreshing prop, disabled state, threshold clamping, and XSS-safe labels', () => {
    const onRefresh = vi.fn<() => void>();
    const payload = '<script>window.__ptrXss=1</script><img src=x onerror=alert(1)>';

    const { rerender } = render(
      <PullToRefresh
        onRefresh={onRefresh}
        refreshing
        pullLabel={payload}
        refreshingLabel={payload}
        data-testid="ptr-ctrl"
      >
        <div>Controlled Feed</div>
      </PullToRefresh>
    );

    const root = screen.getByTestId('ptr-ctrl');
    expect(root).toHaveAttribute('data-status', 'refreshing');
    expect(root).toHaveAttribute('data-refreshing', 'true');
    expect(screen.getByRole('status')).toHaveTextContent(payload);
    expect(document.querySelector('script')).toBeNull();
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeDisabled();

    // Switch controlled refreshing to false -> idle, clicking calls onRefresh without flipping internal state
    rerender(
      <PullToRefresh
        onRefresh={onRefresh}
        refreshing={false}
        threshold={Number.NaN}
        data-testid="ptr-ctrl"
      >
        <div>Controlled Feed</div>
      </PullToRefresh>
    );
    expect(root).toHaveAttribute('data-status', 'idle');
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(root).toHaveAttribute('data-status', 'idle');

    // Disabled state blocks manual button and pointer drag
    rerender(
      <PullToRefresh
        onRefresh={onRefresh}
        disabled
        threshold={10}
        data-testid="ptr-ctrl"
      >
        <div>Disabled Feed</div>
      </PullToRefresh>
    );
    expect(root).toHaveAttribute('data-disabled', 'true');
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeDisabled();

    fireEvent.pointerDown(root, { clientY: 0, button: 0 });
    fireEvent.pointerMove(root, { clientY: 200 });
    fireEvent.pointerUp(root);
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(root).toHaveAttribute('data-status', 'idle');

    // Clamped min threshold=32 (10 clamped to 32): deltaY=60 -> damped 33 >= 32 -> ready
    rerender(
      <PullToRefresh
        onRefresh={onRefresh}
        threshold={10}
        data-testid="ptr-ctrl"
      >
        <div>Clamped Feed</div>
      </PullToRefresh>
    );
    fireEvent.pointerDown(root, { clientY: 0, button: 0 });
    fireEvent.pointerMove(root, { clientY: 60 });
    expect(root).toHaveAttribute('data-status', 'ready');
    fireEvent.pointerUp(root);
    expect(onRefresh).toHaveBeenCalledTimes(2);
  });

  it('composes external pointer event handlers and prevents duplicate concurrent refreshes in controlled mode', async () => {
    let finishControlled: (() => void) | null = null;
    const onRefresh = vi.fn<() => Promise<void>>(
      () =>
        new Promise<void>((resolve) => {
          finishControlled = resolve;
        })
    );
    const onExternalPointerDown = vi.fn<() => void>();

    render(
      <PullToRefresh
        refreshing={false}
        onRefresh={onRefresh}
        onPointerDown={onExternalPointerDown}
        data-testid="ptr-compose"
      >
        <div>Composed Feed</div>
      </PullToRefresh>
    );

    const root = screen.getByTestId('ptr-compose');
    fireEvent.pointerDown(root, { clientY: 0, button: 0 });
    expect(onExternalPointerDown).toHaveBeenCalledTimes(1);

    const manualBtn = screen.getByRole('button', { name: 'Refresh' });
    fireEvent.click(manualBtn);
    fireEvent.click(manualBtn);
    expect(onRefresh).toHaveBeenCalledTimes(1);

    await act(async () => {
      finishControlled?.();
    });
  });
});
