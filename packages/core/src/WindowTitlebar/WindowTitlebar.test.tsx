import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  WindowTitlebar,
  type WindowChromeStyle,
  type WindowChromeStyleMap,
  type WindowStateMode,
} from './index';

describe('WindowTitlebar', () => {
  it('renders macOS chrome by default with semantic optical tokens, ref passthrough, and theme overrides', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            WindowTitlebar: {
              className: 'theme-window-titlebar',
              style: { opacity: '0.97' },
            },
          },
        }}
      >
        <WindowTitlebar
          ref={ref}
          className="local-window-shell"
          xstyle={{ '--prism-blur-px': '16px' }}
          data-testid="window-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('window-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveAttribute('role', 'region');
    expect(root).toHaveClass(
      'refractor-window-titlebar',
      'prism-slab',
      'theme-window-titlebar',
      'local-window-shell'
    );
    expect(root).toHaveAttribute('data-chrome-style', 'macos');
    expect(root).toHaveAttribute('data-window-state', 'normal');
    expect(root).toHaveAttribute('data-active', 'true');
    expect(root).toHaveAttribute('data-draggable', 'true');
    expect(root).not.toHaveAttribute('data-modified');
    expect(root).not.toHaveAttribute('data-dragging');
    expect(root).not.toHaveAttribute('aria-describedby');
    expect(root).toHaveStyle({ opacity: '0.97' });

    const region = screen.getByRole('region', {
      name: 'Refractor Studio — Main.tsx',
    });
    expect(region).toBe(root);
    expect(
      screen.getByRole('heading', { name: 'Refractor Studio — Main.tsx' })
    ).toBeInTheDocument();

    const header = root.querySelector('[data-part="header"]');
    expect(header).toHaveClass(
      'refractor-window-titlebar__header',
      'prism-crystal',
      'cursor-grab'
    );
    expect(header).toHaveAttribute('data-dragging', 'false');

    // No body rendered when children omitted
    expect(root.querySelector('[data-part="body"]')).toBeNull();

    // Semantic macOS traffic lights using --prism-* tokens
    const controlsGroup = screen.getByRole('group', {
      name: 'Window controls',
    });
    const buttons = controlsGroup.querySelectorAll('button');
    expect(buttons).toHaveLength(3);

    const closeBtn = screen.getByRole('button', { name: 'Close window' });
    const minBtn = screen.getByRole('button', { name: 'Minimize window' });
    const maxBtn = screen.getByRole('button', { name: 'Maximize window' });

    expect(buttons[0]).toBe(closeBtn);
    expect(buttons[1]).toBe(minBtn);
    expect(buttons[2]).toBe(maxBtn);

    expect(closeBtn.style.backgroundColor).toBe('var(--prism-error-main)');
    expect(minBtn.style.backgroundColor).toBe('var(--prism-warning-main)');
    expect(maxBtn.style.backgroundColor).toBe('var(--prism-success-main)');

    expect(minBtn).toHaveAttribute('aria-pressed', 'false');
    expect(minBtn).not.toHaveAttribute('aria-expanded');
    expect(minBtn).not.toHaveAttribute('aria-controls');
    expect(maxBtn).toHaveAttribute('aria-pressed', 'false');

    // Live status region exists and starts empty
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent('');
  });

  it('renders subtitle, modified indicator dot, trailingSlot, children body, and unfocused specular dimming', () => {
    const { rerender } = render(
      <WindowTitlebar
        title="Optical Shader — Lens.glsl"
        subtitle="~/projects/refractor-ui"
        modified
        active
        trailingSlot={<span data-testid="branch-pill">main · 60fps</span>}
        data-testid="active-win"
      >
        <p>Viewport shader buffer active</p>
      </WindowTitlebar>
    );

    const root = screen.getByTestId('active-win');
    expect(root).toHaveAttribute('data-modified', 'true');
    expect(root).toHaveAttribute('data-active', 'true');
    expect(root).toHaveAttribute('aria-describedby');

    const subtitleEl = screen.getByText('~/projects/refractor-ui');
    expect(root.getAttribute('aria-describedby')).toBe(subtitleEl.id);

    const dot = root.querySelector('[data-part="modified-dot"]') as HTMLElement;
    expect(dot).not.toBeNull();
    expect(dot.style.backgroundColor).toBe('var(--prism-primary-main)');
    expect(dot.style.opacity).toBe('1');
    expect(screen.getByText('Unsaved changes')).toHaveClass('sr-only');

    expect(screen.getByTestId('branch-pill')).toHaveTextContent('main · 60fps');
    expect(
      screen.getByText('Viewport shader buffer active')
    ).toBeInTheDocument();

    const minBtn = screen.getByRole('button', { name: 'Minimize window' });
    const body = root.querySelector('[data-part="body"]') as HTMLElement;
    expect(minBtn).toHaveAttribute('aria-expanded', 'true');
    expect(minBtn).toHaveAttribute('aria-controls', body.id);

    const sheen = root.querySelector('[data-part="sheen"]') as HTMLElement;
    expect(sheen.style.opacity).toBe('0.9');

    // Switch to unfocused (active={false}) -> dims optical specular sheen & chrome dots
    rerender(
      <WindowTitlebar
        title="Optical Shader — Lens.glsl"
        subtitle="~/projects/refractor-ui"
        modified
        active={false}
        trailingSlot={<span data-testid="branch-pill">main · 60fps</span>}
        data-testid="active-win"
      >
        <p>Viewport shader buffer active</p>
      </WindowTitlebar>
    );

    expect(root).not.toHaveAttribute('data-active');
    expect(root.style.getPropertyValue('--prism-specular-opacity')).toBe(
      '0.28'
    );
    expect(root.style.getPropertyValue('--prism-caustic-opacity')).toBe('0.35');
    expect(sheen.style.opacity).toBe('0.2');
    expect(dot.style.opacity).toBe('0.55');
    expect(
      screen.getByRole('button', { name: 'Close window' }).style.opacity
    ).toBe('0.45');
  });

  it('renders Windows chrome style with right-aligned Minimize, Maximize/Restore, and Close icon buttons', () => {
    const styleMapCheck: WindowChromeStyleMap = { macos: true, windows: true };
    const chrome: WindowChromeStyle = 'windows';
    expect(styleMapCheck[chrome]).toBe(true);

    const onMinimize = vi.fn();
    const onMaximizeToggle = vi.fn();
    const onClose = vi.fn();

    const { rerender } = render(
      <WindowTitlebar
        chromeStyle="windows"
        title="Diagnostics Console"
        subtitle="win32-x64"
        active
        trailingSlot={<span data-testid="win-pill">Connected</span>}
        onMinimize={onMinimize}
        onMaximizeToggle={onMaximizeToggle}
        onClose={onClose}
        data-testid="win-chrome"
      >
        <div>Windows body content</div>
      </WindowTitlebar>
    );

    const root = screen.getByTestId('win-chrome');
    expect(root).toHaveAttribute('data-chrome-style', 'windows');

    const controlsGroup = screen.getByRole('group', {
      name: 'Window controls',
    });
    const buttons = controlsGroup.querySelectorAll('button');
    expect(buttons).toHaveLength(3);

    // Windows order: Minimize, Maximize, Close
    const minBtn = screen.getByRole('button', { name: 'Minimize window' });
    const maxBtn = screen.getByRole('button', { name: 'Maximize window' });
    const closeBtn = screen.getByRole('button', { name: 'Close window' });

    expect(buttons[0]).toBe(minBtn);
    expect(buttons[1]).toBe(maxBtn);
    expect(buttons[2]).toBe(closeBtn);
    expect(closeBtn.style.color).toBe('var(--prism-error-main)');
    expect(minBtn.style.color).toBe('var(--prism-text-primary)');
    expect(screen.getByTestId('win-pill')).toBeInTheDocument();

    // Activate Windows controls via click & keyboard
    fireEvent.click(maxBtn);
    expect(onMaximizeToggle).toHaveBeenCalledWith('maximized');
    expect(
      screen.getByRole('button', { name: 'Restore window' })
    ).toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole('button', { name: 'Restore window' }), {
      key: 'Enter',
    });
    expect(onMaximizeToggle).toHaveBeenLastCalledWith('normal');

    fireEvent.keyDown(minBtn, { key: ' ' });
    expect(onMinimize).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Windows body content')).toBeNull();

    fireEvent.keyDown(closeBtn, { key: 'Enter' });
    expect(onClose).toHaveBeenCalledTimes(1);

    // Unfocused Windows chrome dims button text colors
    rerender(
      <WindowTitlebar
        chromeStyle="windows"
        title="Diagnostics Console"
        active={false}
        data-testid="win-chrome"
      />
    );
    expect(
      screen.getByRole('button', { name: 'Minimize window' }).style.color
    ).toBe('var(--prism-text-secondary)');
    expect(
      screen.getByRole('button', { name: 'Maximize window' }).style.color
    ).toBe('var(--prism-text-secondary)');
  });

  it('toggles minimize collapse, maximize/restore via button and header double-click, close, and polite live announcements', () => {
    const onMinimize = vi.fn();
    const onMaximizeToggle = vi.fn();
    const onClose = vi.fn();
    const onPillClick = vi.fn();

    render(
      <WindowTitlebar
        title="Workspace.tsx"
        onMinimize={onMinimize}
        onMaximizeToggle={onMaximizeToggle}
        onClose={onClose}
        trailingSlot={
          <button type="button" onClick={onPillClick}>
            Format
          </button>
        }
        data-testid="state-win"
      >
        <div>Editable canvas body</div>
      </WindowTitlebar>
    );

    const root = screen.getByTestId('state-win');
    const header = root.querySelector('[data-part="header"]') as HTMLElement;
    const status = screen.getByRole('status');

    // Body visible initially
    expect(screen.getByText('Editable canvas body')).toBeInTheDocument();

    // Minimize collapses body cleanly
    fireEvent.click(screen.getByRole('button', { name: 'Minimize window' }));
    expect(onMinimize).toHaveBeenCalledTimes(1);
    expect(root).toHaveAttribute('data-window-state', 'minimized');
    expect(screen.queryByText('Editable canvas body')).toBeNull();
    expect(status).toHaveTextContent('Workspace.tsx minimized');

    // Clicking Minimize again restores normal window and expands body
    fireEvent.click(screen.getByRole('button', { name: 'Minimize window' }));
    expect(onMinimize).toHaveBeenCalledTimes(2);
    expect(root).toHaveAttribute('data-window-state', 'normal');
    expect(screen.getByText('Editable canvas body')).toBeInTheDocument();
    expect(status).toHaveTextContent('Workspace.tsx restored');

    // Double-click titlebar header maximizes
    fireEvent.doubleClick(header);
    expect(onMaximizeToggle).toHaveBeenCalledWith('maximized');
    expect(root).toHaveAttribute('data-window-state', 'maximized');
    expect(root.style.getPropertyValue('--prism-radius-slab')).toBe('12px');
    expect(
      screen.getByRole('button', { name: 'Restore window' })
    ).toHaveAttribute('aria-pressed', 'true');
    expect(status).toHaveTextContent('Workspace.tsx maximized');

    // Double-click on an interactive button inside titlebar MUST NOT toggle maximize
    fireEvent.doubleClick(screen.getByRole('button', { name: 'Format' }));
    expect(onMaximizeToggle).toHaveBeenCalledTimes(1);
    expect(root).toHaveAttribute('data-window-state', 'maximized');

    // Double-click on title heading restores normal state
    fireEvent.doubleClick(
      screen.getByRole('heading', { name: 'Workspace.tsx' })
    );
    expect(onMaximizeToggle).toHaveBeenLastCalledWith('normal');
    expect(root).toHaveAttribute('data-window-state', 'normal');
    expect(status).toHaveTextContent('Workspace.tsx restored');

    // Close button invokes callback and updates live announcement
    fireEvent.click(screen.getByRole('button', { name: 'Close window' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(status).toHaveTextContent('Workspace.tsx closed');
  });

  it('supports controlled windowState and defaultWindowState="minimized"', () => {
    const onMaximizeToggle = vi.fn();
    const initialMode: WindowStateMode = 'normal';

    const { rerender } = render(
      <WindowTitlebar
        windowState={initialMode}
        onMaximizeToggle={onMaximizeToggle}
        data-testid="ctrl-win"
      >
        <div>Controlled body</div>
      </WindowTitlebar>
    );

    const root = screen.getByTestId('ctrl-win');
    fireEvent.click(screen.getByRole('button', { name: 'Maximize window' }));
    expect(onMaximizeToggle).toHaveBeenCalledWith('maximized');
    // Still controlled at 'normal'
    expect(root).toHaveAttribute('data-window-state', 'normal');

    rerender(
      <WindowTitlebar
        windowState="maximized"
        onMaximizeToggle={onMaximizeToggle}
        data-testid="ctrl-win"
      >
        <div>Controlled body</div>
      </WindowTitlebar>
    );
    expect(root).toHaveAttribute('data-window-state', 'maximized');
    expect(
      screen.getByRole('button', { name: 'Restore window' })
    ).toBeInTheDocument();

    // Uncontrolled starting minimized collapses body immediately
    rerender(
      <WindowTitlebar
        defaultWindowState="minimized"
        windowState="minimized"
        data-testid="ctrl-win"
      >
        <div>Hidden while minimized</div>
      </WindowTitlebar>
    );
    expect(screen.queryByText('Hidden while minimized')).toBeNull();
  });

  it('supports IME-safe keyboard activation on macOS controls and ignores composing or non-activation keys', () => {
    const onClose = vi.fn();
    const onMinimize = vi.fn();
    const onMaximizeToggle = vi.fn();

    render(
      <WindowTitlebar
        onClose={onClose}
        onMinimize={onMinimize}
        onMaximizeToggle={onMaximizeToggle}
      />
    );

    const closeBtn = screen.getByRole('button', { name: 'Close window' });
    const minBtn = screen.getByRole('button', { name: 'Minimize window' });
    const maxBtn = screen.getByRole('button', { name: 'Maximize window' });

    // IME composing Enter MUST NOT trigger actions
    const composingEnter = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(composingEnter, 'isComposing', { value: true });
    fireEvent(closeBtn, composingEnter);
    expect(onClose).not.toHaveBeenCalled();

    // Non-activation key ignored
    fireEvent.keyDown(minBtn, { key: 'Escape' });
    expect(onMinimize).not.toHaveBeenCalled();

    // Standard Enter / Space activate macOS traffic lights
    fireEvent.keyDown(closeBtn, { key: 'Enter' });
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(minBtn, { key: ' ' });
    expect(onMinimize).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(maxBtn, { key: 'Enter' });
    expect(onMaximizeToggle).toHaveBeenCalledWith('maximized');
  });

  it('tracks pointer dragging deltas, isolates pointerId, cleans up window listeners on end/cancel/draggable=false/unmount', () => {
    const onDragMove = vi.fn();
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const { rerender, unmount } = render(
      <WindowTitlebar
        draggable
        onDragMove={onDragMove}
        trailingSlot={<button type="button">Action</button>}
        data-testid="drag-win"
      />
    );

    const root = screen.getByTestId('drag-win');
    const header = root.querySelector('[data-part="header"]') as HTMLElement;

    // Secondary mouse button ignored
    fireEvent.pointerDown(header, {
      button: 2,
      pointerId: 1,
      clientX: 50,
      clientY: 50,
    });
    expect(root).not.toHaveAttribute('data-dragging');

    // Interactive descendants do not initiate drag
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Action' }), {
      button: 0,
      pointerId: 1,
      clientX: 50,
      clientY: 50,
    });
    expect(root).not.toHaveAttribute('data-dragging');

    // Start primary pointer drag
    fireEvent.pointerDown(header, {
      button: 0,
      pointerId: 7,
      clientX: 100,
      clientY: 60,
    });
    expect(root).toHaveAttribute('data-dragging', 'true');
    expect(header).toHaveAttribute('data-dragging', 'true');
    expect(header).toHaveClass('cursor-grabbing');
    expect(addSpy).toHaveBeenCalledWith('pointermove', expect.any(Function));
    expect(addSpy).toHaveBeenCalledWith('pointerup', expect.any(Function));
    expect(addSpy).toHaveBeenCalledWith('pointercancel', expect.any(Function));

    // Mismatched pointerId move and up are ignored
    fireEvent.pointerMove(window, { pointerId: 99, clientX: 250, clientY: 200 });
    fireEvent.pointerUp(window, { pointerId: 99 });
    expect(onDragMove).not.toHaveBeenCalled();
    expect(root).toHaveAttribute('data-dragging', 'true');

    // Matching pointer moves emit incremental deltas
    fireEvent.pointerMove(window, { pointerId: 7, clientX: 135, clientY: 85 });
    expect(onDragMove).toHaveBeenCalledTimes(1);
    expect(onDragMove).toHaveBeenLastCalledWith(35, 25);

    // Zero-delta duplicate move emits nothing
    fireEvent.pointerMove(window, { pointerId: 7, clientX: 135, clientY: 85 });
    expect(onDragMove).toHaveBeenCalledTimes(1);

    // Subsequent move emits incremental delta from previous position
    fireEvent.pointerMove(window, { pointerId: 7, clientX: 125, clientY: 95 });
    expect(onDragMove).toHaveBeenCalledTimes(2);
    expect(onDragMove).toHaveBeenLastCalledWith(-10, 10);

    // Pointer up ends drag and removes window listeners
    fireEvent.pointerUp(window, { pointerId: 7 });
    expect(root).not.toHaveAttribute('data-dragging');
    expect(header).toHaveAttribute('data-dragging', 'false');
    expect(removeSpy).toHaveBeenCalledWith('pointermove', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('pointerup', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith(
      'pointercancel',
      expect.any(Function)
    );

    // Post-up moves are ignored
    fireEvent.pointerMove(window, { pointerId: 7, clientX: 300, clientY: 300 });
    expect(onDragMove).toHaveBeenCalledTimes(2);

    // Drag cancelled by pointercancel cleans up listeners
    fireEvent.pointerDown(header, {
      button: 0,
      pointerId: 8,
      clientX: 10,
      clientY: 10,
    });
    expect(root).toHaveAttribute('data-dragging', 'true');
    fireEvent.pointerCancel(window, { pointerId: 8 });
    expect(root).not.toHaveAttribute('data-dragging');

    // Switching draggable={false} mid-drag immediately cancels drag & cleans up listeners
    fireEvent.pointerDown(header, {
      button: 0,
      pointerId: 9,
      clientX: 20,
      clientY: 20,
    });
    expect(root).toHaveAttribute('data-dragging', 'true');

    rerender(
      <WindowTitlebar
        draggable={false}
        onDragMove={onDragMove}
        data-testid="drag-win"
      />
    );
    expect(root).not.toHaveAttribute('data-dragging');
    expect(root).not.toHaveAttribute('data-draggable');
    expect(header).toHaveClass('cursor-default');

    // Pointer down when draggable={false} does nothing
    fireEvent.pointerDown(header, {
      button: 0,
      pointerId: 10,
      clientX: 40,
      clientY: 40,
    });
    expect(root).not.toHaveAttribute('data-dragging');

    // Unmounting mid-drag removes listeners cleanly
    rerender(
      <WindowTitlebar
        draggable
        onDragMove={onDragMove}
        data-testid="drag-win"
      />
    );
    const removeCallsBeforeUnmount = removeSpy.mock.calls.length;
    fireEvent.pointerDown(header, {
      button: 0,
      pointerId: 11,
      clientX: 50,
      clientY: 50,
    });
    unmount();
    expect(removeSpy.mock.calls.length).toBeGreaterThanOrEqual(
      removeCallsBeforeUnmount + 3
    );

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('handles blank title/subtitle fallbacks, omitted callbacks, and adversarial XSS strings safely', () => {
    const { rerender } = render(
      <WindowTitlebar title="   " subtitle="   " data-testid="fallback-win" />
    );

    const root = screen.getByTestId('fallback-win');
    expect(
      screen.getByRole('heading', { name: 'Refractor Studio — Main.tsx' })
    ).toBeInTheDocument();
    expect(root).not.toHaveAttribute('aria-describedby');

    // Interactions without callbacks never throw
    const header = root.querySelector('[data-part="header"]') as HTMLElement;
    fireEvent.pointerDown(header, {
      button: 0,
      pointerId: 1,
      clientX: 0,
      clientY: 0,
    });
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 25, clientY: 15 });
    fireEvent.pointerUp(window, { pointerId: 1 });
    fireEvent.click(screen.getByRole('button', { name: 'Minimize window' }));
    fireEvent.click(screen.getByRole('button', { name: 'Maximize window' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close window' }));

    // Adversarial XSS payload rendered strictly as escaped text
    const xssPayload =
      '<script>window.__windowTitlebarXss=1</script><img src=x onerror=alert(1)>';
    rerender(
      <WindowTitlebar
        title={xssPayload}
        subtitle={xssPayload}
        data-testid="fallback-win"
      />
    );

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getAllByText(xssPayload)).toHaveLength(2);
  });
});
