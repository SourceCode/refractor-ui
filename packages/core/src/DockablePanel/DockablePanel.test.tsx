import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { DockablePanel } from './DockablePanel';

const originalInnerWidth = window.innerWidth;
const originalInnerHeight = window.innerHeight;

afterEach(() => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: originalInnerWidth });
  Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: originalInnerHeight });
});

describe('DockablePanel', () => {
  it('renders title, subtitle, headerActions, optical glass surfaces, theme overrides, and React 19 ref', () => {
    const ref = createRef<HTMLElement>();
    const onClose = vi.fn();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            DockablePanel: { className: 'theme-dock', style: { letterSpacing: '1px' } },
          },
        }}
      >
        <DockablePanel
          ref={ref}
          title="Optical Inspector"
          subtitle="Dispersion tokens"
          headerActions={<button type="button">Reset</button>}
          onClose={onClose}
          className="local-dock"
          xstyle={{ '--prism-blur-px': '20px' }}
          style={{ minWidth: '280px' }}
          data-testid="panel"
        >
          <p>Inspector controls</p>
        </DockablePanel>
      </PrismThemeProvider>
    );

    const panel = screen.getByTestId('panel');
    expect(ref.current).toBe(panel);
    expect(panel).toHaveClass('refractor-dockable-panel', 'prism-slab', 'theme-dock', 'local-dock');
    expect(panel).toHaveAttribute('data-dock-position', 'right');
    expect(panel).toHaveStyle({ letterSpacing: '1px', minWidth: '280px' });
    expect(screen.getByRole('heading', { name: 'Optical Inspector' })).toBeInTheDocument();
    expect(screen.getByText('Dispersion tokens')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument();
    expect(screen.getByText('Inspector controls')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Move floating panel' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Close panel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('switches across dock positions (left, bottom, right, float) and supports center layout', () => {
    const onDockPositionChange = vi.fn();
    const { rerender } = render(
      <DockablePanel
        title="Console"
        defaultDockPosition="center"
        onDockPositionChange={onDockPositionChange}
        data-testid="panel"
      >
        <p>Logs</p>
      </DockablePanel>
    );

    const panel = screen.getByTestId('panel');
    expect(panel).toHaveAttribute('data-dock-position', 'center');
    expect(screen.queryByRole('button', { name: 'Close panel' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Dock left' }));
    expect(panel).toHaveAttribute('data-dock-position', 'left');
    expect(screen.getByRole('button', { name: 'Dock left' })).toHaveAttribute('aria-pressed', 'true');
    expect(onDockPositionChange).toHaveBeenLastCalledWith('left');

    fireEvent.click(screen.getByRole('button', { name: 'Dock bottom' }));
    expect(panel).toHaveAttribute('data-dock-position', 'bottom');
    expect(onDockPositionChange).toHaveBeenLastCalledWith('bottom');

    fireEvent.click(screen.getByRole('button', { name: 'Dock right' }));
    expect(panel).toHaveAttribute('data-dock-position', 'right');
    expect(onDockPositionChange).toHaveBeenLastCalledWith('right');

    fireEvent.click(screen.getByRole('button', { name: 'Float panel' }));
    expect(panel).toHaveAttribute('data-dock-position', 'floating');
    expect(panel).toHaveAttribute('data-floating', 'true');
    expect(panel).toHaveStyle({ left: '40px', top: '40px' });
    expect(screen.getByRole('button', { name: 'Move floating panel' })).toBeInTheDocument();

    // Controlled dockPosition
    rerender(
      <DockablePanel title="Console" dockPosition="left" onDockPositionChange={onDockPositionChange} data-testid="panel">
        <p>Logs</p>
      </DockablePanel>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Dock right' }));
    expect(onDockPositionChange).toHaveBeenLastCalledWith('right');
    expect(panel).toHaveAttribute('data-dock-position', 'left');
  });

  it('toggles collapse/expand cleanly and reflects aria-expanded in uncontrolled and controlled modes', () => {
    const onCollapsedChange = vi.fn();
    const { rerender } = render(
      <DockablePanel title="Layers" onCollapsedChange={onCollapsedChange} data-testid="panel">
        <p>Layer tree</p>
      </DockablePanel>
    );

    const toggle = screen.getByRole('button', { name: 'Collapse panel' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Layer tree')).toBeInTheDocument();

    fireEvent.click(toggle);
    expect(onCollapsedChange).toHaveBeenLastCalledWith(true);
    expect(screen.queryByText('Layer tree')).toBeNull();
    const expandBtn = screen.getByRole('button', { name: 'Expand panel' });
    expect(expandBtn).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(expandBtn);
    expect(onCollapsedChange).toHaveBeenLastCalledWith(false);
    expect(screen.getByText('Layer tree')).toBeInTheDocument();

    // Controlled collapsed
    rerender(
      <DockablePanel title="Layers" collapsed={true} onCollapsedChange={onCollapsedChange}>
        <p>Layer tree</p>
      </DockablePanel>
    );
    expect(screen.queryByText('Layer tree')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Expand panel' }));
    expect(onCollapsedChange).toHaveBeenLastCalledWith(false);
    expect(screen.queryByText('Layer tree')).toBeNull();
  });

  it('supports keyboard Arrow movement (16px step) on drag handle in floating mode with non-negative clamping', () => {
    const onFloatingPositionChange = vi.fn();
    render(
      <DockablePanel
        title="Palette"
        defaultDockPosition="floating"
        defaultFloatingPosition={{ x: 10, y: 10 }}
        onFloatingPositionChange={onFloatingPositionChange}
        data-testid="panel"
      >
        <p>Swatches</p>
      </DockablePanel>
    );

    const handle = screen.getByRole('button', { name: 'Move floating panel' });
    const panel = screen.getByTestId('panel');

    fireEvent.keyDown(handle, { key: 'ArrowRight' });
    expect(onFloatingPositionChange).toHaveBeenLastCalledWith({ x: 26, y: 10 });
    expect(panel).toHaveStyle({ left: '26px', top: '10px' });

    fireEvent.keyDown(handle, { key: 'ArrowDown' });
    expect(onFloatingPositionChange).toHaveBeenLastCalledWith({ x: 26, y: 26 });

    // Clamps strictly to >= 0
    fireEvent.keyDown(handle, { key: 'ArrowLeft' });
    fireEvent.keyDown(handle, { key: 'ArrowLeft' });
    expect(onFloatingPositionChange).toHaveBeenLastCalledWith({ x: 0, y: 26 });

    fireEvent.keyDown(handle, { key: 'ArrowUp' });
    fireEvent.keyDown(handle, { key: 'ArrowUp' });
    expect(onFloatingPositionChange).toHaveBeenLastCalledWith({ x: 0, y: 0 });

    // Ignores unrelated keys & IME composing
    const callsBefore = onFloatingPositionChange.mock.calls.length;
    fireEvent.keyDown(handle, { key: 'Enter' });
    const composing = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true });
    Object.defineProperty(composing, 'isComposing', { value: true });
    handle.dispatchEvent(composing);
    expect(onFloatingPositionChange).toHaveBeenCalledTimes(callsBefore);
  });

  it('drags floating header with pointer events, clamps bounds, and snaps to left/right/bottom edges', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 1024 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: 768 });

    const onDockPositionChange = vi.fn();
    const onFloatingPositionChange = vi.fn();

    render(
      <DockablePanel
        title="Floating Tool"
        defaultDockPosition="floating"
        defaultFloatingPosition={{ x: 200, y: 150 }}
        onDockPositionChange={onDockPositionChange}
        onFloatingPositionChange={onFloatingPositionChange}
        data-testid="panel"
      >
        <p>Tool body</p>
      </DockablePanel>
    );

    const panel = screen.getByTestId('panel');
    const header = panel.querySelector('header');
    expect(header).not.toBeNull();
    if (!header) return;

    // Right-click does not initiate drag
    fireEvent.pointerDown(header, { button: 2, clientX: 200, clientY: 150 });
    expect(panel).not.toHaveAttribute('data-dragging', 'true');

    // Clicking button inside header does not initiate drag
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Collapse panel' }), {
      button: 0,
      clientX: 300,
      clientY: 150,
    });
    expect(panel).not.toHaveAttribute('data-dragging', 'true');

    // Normal mid-screen drag stays floating
    fireEvent.pointerDown(header, { button: 0, clientX: 220, clientY: 160 });
    expect(panel).toHaveAttribute('data-dragging', 'true');
    fireEvent.pointerMove(window, { clientX: 300, clientY: 210 });
    expect(onFloatingPositionChange).toHaveBeenLastCalledWith({ x: 280, y: 200 });
    fireEvent.pointerUp(window);
    expect(panel).not.toHaveAttribute('data-dragging');
    expect(panel).toHaveAttribute('data-dock-position', 'floating');

    // Drag to left edge (x < 24) clamps to 0 and snaps to 'left'
    fireEvent.pointerDown(header, { button: 0, clientX: 300, clientY: 210 });
    fireEvent.pointerMove(window, { clientX: -100, clientY: 210 });
    expect(onFloatingPositionChange).toHaveBeenLastCalledWith({ x: 0, y: 200 });
    expect(screen.getByRole('status')).toHaveTextContent('Release to dock left');
    expect(panel).toHaveAttribute('data-snap-preview', 'left');
    fireEvent.pointerUp(window);
    expect(panel).toHaveAttribute('data-dock-position', 'left');
    expect(onDockPositionChange).toHaveBeenLastCalledWith('left');

    // Re-float and drag near right edge -> snaps to 'right'
    fireEvent.click(screen.getByRole('button', { name: 'Float panel' }));
    vi.spyOn(panel, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 320,
      bottom: 240,
      width: 320,
      height: 240,
      toJSON: () => ({}),
    });
    fireEvent.pointerDown(header, { button: 0, clientX: 100, clientY: 200 });
    fireEvent.pointerMove(window, { clientX: 800, clientY: 200 });
    expect(screen.getByRole('status')).toHaveTextContent('Release to dock right');
    fireEvent.pointerUp(window);
    expect(panel).toHaveAttribute('data-dock-position', 'right');

    // Re-float and drag near bottom edge -> snaps to 'bottom'
    fireEvent.click(screen.getByRole('button', { name: 'Float panel' }));
    fireEvent.pointerDown(header, { button: 0, clientX: 700, clientY: 200 });
    fireEvent.pointerMove(window, { clientX: 300, clientY: 700 });
    expect(screen.getByRole('status')).toHaveTextContent('Release to dock bottom');
    fireEvent.pointerUp(window);
    expect(panel).toHaveAttribute('data-dock-position', 'bottom');
  });

  it('respects edgeSnap={false}, zero-movement click, pointercancel, docked non-drag, and unmount cleanup', () => {
    const onDockPositionChange = vi.fn();
    const onFloatingPositionChange = vi.fn();

    const { rerender, unmount } = render(
      <DockablePanel
        title="Free Float"
        defaultDockPosition="floating"
        defaultFloatingPosition={{ x: 10, y: 10 }}
        edgeSnap={false}
        onDockPositionChange={onDockPositionChange}
        onFloatingPositionChange={onFloatingPositionChange}
        data-testid="panel"
      >
        <p>Body</p>
      </DockablePanel>
    );

    const panel = screen.getByTestId('panel');
    const header = panel.querySelector('header');
    expect(header).not.toBeNull();
    if (!header) return;

    // Drag to x=0 with edgeSnap=false stays floating
    fireEvent.pointerDown(header, { button: 0, clientX: 20, clientY: 20 });
    fireEvent.pointerMove(window, { clientX: 5, clientY: 20 });
    expect(screen.queryByRole('status')).toBeNull();
    fireEvent.pointerUp(window);
    expect(panel).toHaveAttribute('data-dock-position', 'floating');
    expect(onDockPositionChange).not.toHaveBeenCalled();

    // Pointer cancel aborts drag cleanly even when edgeSnap is re-enabled
    rerender(
      <DockablePanel
        title="Free Float"
        defaultDockPosition="floating"
        edgeSnap={true}
        onDockPositionChange={onDockPositionChange}
        onFloatingPositionChange={onFloatingPositionChange}
        data-testid="panel"
      >
        <p>Body</p>
      </DockablePanel>
    );
    fireEvent.pointerDown(header, { button: 0, clientX: 20, clientY: 20 });
    fireEvent.pointerMove(window, { clientX: 10, clientY: 20 });
    expect(screen.getByRole('status')).toHaveTextContent('Release to dock left');
    fireEvent.pointerCancel(window);
    expect(panel).not.toHaveAttribute('data-dragging');
    expect(panel).toHaveAttribute('data-dock-position', 'floating');

    // Zero-movement pointerdown + pointermove(same) + pointerup does not snap
    fireEvent.pointerDown(header, { button: 0, clientX: 20, clientY: 20 });
    fireEvent.pointerMove(window, { clientX: 20, clientY: 20 });
    fireEvent.pointerUp(window);
    expect(panel).toHaveAttribute('data-dock-position', 'floating');

    // Docked header pointerdown is a no-op
    fireEvent.click(screen.getByRole('button', { name: 'Dock left' }));
    fireEvent.pointerDown(header, { button: 0, clientX: 20, clientY: 20 });
    expect(panel).not.toHaveAttribute('data-dragging');

    // Float again, start drag, unmount mid-drag -> cleans up window listeners
    fireEvent.click(screen.getByRole('button', { name: 'Float panel' }));
    fireEvent.pointerDown(header, { button: 0, clientX: 20, clientY: 20 });
    unmount();
    const callsBefore = onFloatingPositionChange.mock.calls.length;
    fireEvent.pointerMove(window, { clientX: 100, clientY: 100 });
    expect(onFloatingPositionChange).toHaveBeenCalledTimes(callsBefore);
  });

  it('clamps adversarial NaN/negative floating coordinates, handles zero viewport, and neutralizes XSS strings', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 0 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: 0 });

    const payload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';
    render(
      <DockablePanel
        title={payload}
        subtitle={payload}
        defaultDockPosition="floating"
        defaultFloatingPosition={{ x: Number.NaN, y: -999 }}
        data-testid="panel"
      >
        {payload}
      </DockablePanel>
    );

    const panel = screen.getByTestId('panel');
    expect(panel).toHaveStyle({ left: '0px', top: '0px' });
    expect(screen.getByRole('heading', { name: payload })).toBeInTheDocument();
    expect(panel).toHaveTextContent(payload);
    expect(document.querySelector('script')).toBeNull();
  });
});
