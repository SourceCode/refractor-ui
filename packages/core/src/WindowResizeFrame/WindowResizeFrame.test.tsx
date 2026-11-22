import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  WindowResizeFrame,
  type WindowFrameRect,
  type WindowResizeEdge,
  type WindowResizeEdgeMap,
} from './index';

describe('WindowResizeFrame', () => {
  it('renders prism-slab defaults, telemetry bar, 8 handles, ref passthrough, and theme overrides', () => {
    const ref = createRef<HTMLDivElement>();
    const edgeMapCheck: WindowResizeEdgeMap = {
      n: true,
      s: true,
      e: true,
      w: true,
      ne: true,
      nw: true,
      se: true,
      sw: true,
    };
    const sampleEdge: WindowResizeEdge = 'se';
    expect(edgeMapCheck[sampleEdge]).toBe(true);
    expect(WindowResizeFrame.displayName).toBe('WindowResizeFrame');

    render(
      <PrismThemeProvider
        theme={{
          components: {
            WindowResizeFrame: {
              className: 'theme-resize-frame',
              style: { opacity: '0.96' },
            },
          },
        }}
      >
        <WindowResizeFrame
          ref={ref}
          className="local-resize-frame"
          xstyle={{ '--prism-blur-px': '14px' }}
          data-testid="resize-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('resize-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveAttribute('role', 'region');
    expect(root).toHaveClass(
      'refractor-window-resize-frame',
      'prism-slab',
      'theme-resize-frame',
      'local-resize-frame'
    );
    expect(root).toHaveAttribute('data-snap', 'true');
    expect(root).not.toHaveAttribute('data-resizing');
    expect(root).not.toHaveAttribute('data-disabled');
    expect(root).toHaveStyle({ opacity: '0.96' });

    const region = screen.getByRole('region', {
      name: 'Optical Viewport Window',
    });
    expect(region).toBe(root);

    expect(screen.getByTestId('resize-dimension-badge')).toHaveTextContent(
      '360 × 220 px'
    );

    const snapToggle = screen.getByRole('button', {
      name: 'Grid Snap (16px)',
    });
    expect(snapToggle).toHaveAttribute('aria-pressed', 'true');
    expect(snapToggle).not.toBeDisabled();

    const resetBtn = screen.getByRole('button', { name: 'Reset Frame' });
    expect(resetBtn).not.toBeDisabled();

    // Responsive scrollable wrapper protects narrow viewports
    const scroller = screen.getByTestId('resize-stage-scroller');
    expect(scroller).toHaveClass('overflow-x-auto', 'min-w-0', 'w-full');

    const windowFrame = screen.getByTestId('resize-window-frame');
    expect(windowFrame).toHaveAttribute('data-x', '64');
    expect(windowFrame).toHaveAttribute('data-y', '48');
    expect(windowFrame).toHaveAttribute('data-width', '360');
    expect(windowFrame).toHaveAttribute('data-height', '220');

    // Ghost preview outline is hidden when idle
    expect(screen.queryByTestId('resize-ghost-frame')).toBeNull();

    // All 8 directional resize hitboxes rendered with accessible labels and keyboard-only focus rings
    const expectedHandles: ReadonlyArray<{ edge: WindowResizeEdge; label: string }> = [
      { edge: 'n', label: 'Resize North edge' },
      { edge: 's', label: 'Resize South edge' },
      { edge: 'e', label: 'Resize East edge' },
      { edge: 'w', label: 'Resize West edge' },
      { edge: 'nw', label: 'Resize North-West corner' },
      { edge: 'ne', label: 'Resize North-East corner' },
      { edge: 'se', label: 'Resize South-East corner' },
      { edge: 'sw', label: 'Resize South-West corner' },
    ];
    for (const item of expectedHandles) {
      const btn = screen.getByRole('button', { name: item.label });
      expect(btn).toHaveAttribute('data-edge', item.edge);
      expect(btn).toHaveClass('prism-focus-ring');
    }

    // Polite status strip
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent('360 × 220 px');
    expect(status).toHaveTextContent('Snap 16px');
  });

  it('shows translucent snapped ghost frame during pointer drag on all 8 handles and commits on pointerup', () => {
    const onResizeCommit = vi.fn();

    render(
      <WindowResizeFrame
        defaultRect={{ x: 64, y: 48, width: 360, height: 220 }}
        snapGridPx={16}
        onResizeCommit={onResizeCommit}
        data-testid="drag-root"
      />
    );

    const root = screen.getByTestId('drag-root');
    const seHandle = screen.getByRole('button', {
      name: 'Resize South-East corner',
    });

    // Secondary mouse button is ignored
    fireEvent.pointerDown(seHandle, {
      button: 2,
      pointerId: 1,
      clientX: 100,
      clientY: 100,
    });
    expect(screen.queryByTestId('resize-ghost-frame')).toBeNull();

    // Drag South-East corner (+38, +18) -> 398x238 snaps to 400x240
    fireEvent.pointerDown(seHandle, {
      button: 0,
      pointerId: 5,
      clientX: 100,
      clientY: 100,
    });
    expect(root).toHaveAttribute('data-resizing', 'true');
    expect(root).toHaveAttribute('data-active-edge', 'se');

    // Mismatched pointerId is ignored on move and up
    fireEvent.pointerMove(window, { pointerId: 99, clientX: 250, clientY: 250 });
    fireEvent.pointerUp(window, { pointerId: 99 });
    expect(onResizeCommit).not.toHaveBeenCalled();

    // Zero-delta pointerMove keeps hasMoved false initially, then actual drag updates ghost
    fireEvent.pointerMove(window, { pointerId: 5, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(window, { pointerId: 5, clientX: 138, clientY: 118 });

    const ghost = screen.getByTestId('resize-ghost-frame');
    expect(ghost).toHaveAttribute('data-edge', 'se');
    expect(ghost).toHaveAttribute('data-snapped', 'true');
    expect(ghost).toHaveAttribute('data-width', '400');
    expect(ghost).toHaveAttribute('data-height', '240');
    expect(ghost.style.borderColor).toBe('var(--prism-primary-main)');
    expect(ghost.style.backgroundColor).toContain('--prism-primary-main');
    expect(screen.getByTestId('resize-ghost-pill')).toHaveTextContent(
      '400 × 240 px · Snapped 16px'
    );
    expect(screen.getByTestId('resize-dimension-badge')).toHaveTextContent(
      '400 × 240 px'
    );
    // Active window stays at original size until pointerup commit
    expect(screen.getByTestId('resize-window-frame')).toHaveAttribute(
      'data-width',
      '360'
    );

    fireEvent.pointerUp(window, { pointerId: 5 });
    expect(screen.queryByTestId('resize-ghost-frame')).toBeNull();
    expect(onResizeCommit).toHaveBeenCalledTimes(1);
    expect(onResizeCommit).toHaveBeenLastCalledWith(
      { x: 64, y: 48, width: 400, height: 240 },
      'se'
    );
    expect(screen.getByTestId('resize-window-frame')).toHaveAttribute(
      'data-width',
      '400'
    );
    expect(screen.getByTestId('resize-window-frame')).toHaveAttribute(
      'data-height',
      '240'
    );

    // Clicking handle without pointer movement does not commit
    fireEvent.pointerDown(seHandle, {
      button: 0,
      pointerId: 6,
      clientX: 120,
      clientY: 120,
    });
    fireEvent.pointerUp(window, { pointerId: 6 });
    expect(onResizeCommit).toHaveBeenCalledTimes(1);

    // Test remaining 7 handles sequentially from known state (x: 64, y: 48, w: 400, h: 240)
    const dragCase = (
      edge: WindowResizeEdge,
      dx: number,
      dy: number,
      expectedRect: WindowFrameRect
    ) => {
      const handle = screen.getByTestId(`resize-handle-${edge}`);
      fireEvent.pointerDown(handle, {
        button: 0,
        pointerId: 10,
        clientX: 200,
        clientY: 200,
      });
      fireEvent.pointerMove(window, {
        pointerId: 10,
        clientX: 200 + dx,
        clientY: 200 + dy,
      });
      fireEvent.pointerUp(window, { pointerId: 10 });
      expect(onResizeCommit).toHaveBeenLastCalledWith(expectedRect, edge);
    };

    // East (+32 width -> 432)
    dragCase('e', 30, 50, { x: 64, y: 48, width: 432, height: 240 });
    // West (-32 left -> x=32, w=464, right stays 496)
    dragCase('w', -30, 50, { x: 32, y: 48, width: 464, height: 240 });
    // South (+16 height -> h=256)
    dragCase('s', 50, 15, { x: 32, y: 48, width: 464, height: 256 });
    // North (-16 top -> y=32, h=272, bottom stays 304)
    dragCase('n', 50, -15, { x: 32, y: 32, width: 464, height: 272 });
    // North-East (-16 width -> 448, +16 top -> y=48, h=256)
    dragCase('ne', -16, 16, { x: 32, y: 48, width: 448, height: 256 });
    // North-West (+16 left -> x=48, w=432, -16 top -> y=32, h=272)
    dragCase('nw', 16, -16, { x: 48, y: 32, width: 432, height: 272 });
    // South-West (+16 left -> x=64, w=416, -32 height -> h=240)
    dragCase('sw', 16, -32, { x: 64, y: 32, width: 416, height: 240 });
  });

  it('toggles Grid Snap off for free pixel resizing and respects snapGridPx={0}', () => {
    const onResizeCommit = vi.fn();

    const { rerender } = render(
      <WindowResizeFrame
        snapGridPx={16}
        onResizeCommit={onResizeCommit}
        data-testid="snap-root"
      />
    );

    const root = screen.getByTestId('snap-root');
    const snapToggle = screen.getByTestId('resize-snap-toggle');
    expect(snapToggle).toHaveAttribute('aria-pressed', 'true');

    // Toggle snap OFF
    fireEvent.click(snapToggle);
    expect(snapToggle).toHaveAttribute('aria-pressed', 'false');
    expect(root).not.toHaveAttribute('data-snap');
    expect(screen.getByRole('status')).toHaveTextContent('Grid snap disabled');

    // Drag South-East by (+13, +9) -> exact free dimensions 373 × 229
    const seHandle = screen.getByTestId('resize-handle-se');
    fireEvent.pointerDown(seHandle, {
      button: 0,
      pointerId: 2,
      clientX: 100,
      clientY: 100,
    });
    fireEvent.pointerMove(window, { pointerId: 2, clientX: 113, clientY: 109 });

    const ghost = screen.getByTestId('resize-ghost-frame');
    expect(ghost).toHaveAttribute('data-snapped', 'false');
    expect(screen.getByTestId('resize-ghost-pill')).toHaveTextContent(
      '373 × 229 px · Free'
    );

    fireEvent.pointerUp(window, { pointerId: 2 });
    expect(onResizeCommit).toHaveBeenLastCalledWith(
      { x: 64, y: 48, width: 373, height: 229 },
      'se'
    );

    // Toggle snap back ON
    fireEvent.click(snapToggle);
    expect(snapToggle).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('Grid snap enabled (16px)');

    // Passing snapGridPx={0} disables snapping and disables toggle button
    rerender(
      <WindowResizeFrame
        snapGridPx={0}
        onResizeCommit={onResizeCommit}
        data-testid="snap-root"
      />
    );
    expect(snapToggle).toHaveTextContent('Grid Snap (Off)');
    expect(snapToggle).toHaveAttribute('aria-pressed', 'false');
    expect(snapToggle).toBeDisabled();
    fireEvent.click(snapToggle);
    expect(snapToggle).toHaveAttribute('aria-pressed', 'false');
  });

  it('cancels cleanly on pointercancel and Escape and cleans up window listeners on end, disable, and unmount', () => {
    const onResizeCommit = vi.fn();
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const { rerender, unmount } = render(
      <WindowResizeFrame onResizeCommit={onResizeCommit} data-testid="cancel-root" />
    );

    const eHandle = screen.getByTestId('resize-handle-e');

    // 1. Cancel via pointercancel (with mismatched pointerId ignored first)
    fireEvent.pointerDown(eHandle, {
      button: 0,
      pointerId: 21,
      clientX: 100,
      clientY: 100,
    });
    expect(addSpy).toHaveBeenCalledWith('pointermove', expect.any(Function));
    expect(addSpy).toHaveBeenCalledWith('pointerup', expect.any(Function));
    expect(addSpy).toHaveBeenCalledWith('pointercancel', expect.any(Function));
    expect(addSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

    fireEvent.pointerMove(window, { pointerId: 21, clientX: 164, clientY: 100 });
    expect(screen.getByTestId('resize-ghost-frame')).toBeInTheDocument();

    fireEvent.pointerCancel(window, { pointerId: 999 });
    expect(screen.getByTestId('resize-ghost-frame')).toBeInTheDocument();

    fireEvent.pointerCancel(window, { pointerId: 21 });
    expect(screen.queryByTestId('resize-ghost-frame')).toBeNull();
    expect(onResizeCommit).not.toHaveBeenCalled();
    expect(screen.getByTestId('resize-window-frame')).toHaveAttribute(
      'data-width',
      '360'
    );
    expect(screen.getByRole('status')).toHaveTextContent('Resize cancelled');

    // 2. Cancel via Escape (ignoring IME-composing Escape & non-Escape keys)
    fireEvent.pointerDown(eHandle, {
      button: 0,
      pointerId: 22,
      clientX: 100,
      clientY: 100,
    });
    fireEvent.pointerMove(window, { pointerId: 22, clientX: 180, clientY: 100 });
    expect(screen.getByTestId('resize-ghost-frame')).toBeInTheDocument();

    const composingEsc = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(composingEsc, 'isComposing', { value: true });
    fireEvent(window, composingEsc);
    expect(screen.getByTestId('resize-ghost-frame')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'a' });
    expect(screen.getByTestId('resize-ghost-frame')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByTestId('resize-ghost-frame')).toBeNull();
    expect(onResizeCommit).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent('Resize cancelled');

    // 3. Switching disabled={true} mid-drag aborts drag & removes all 4 listeners
    const removeCountBeforeDisable = removeSpy.mock.calls.length;
    fireEvent.pointerDown(eHandle, {
      button: 0,
      pointerId: 23,
      clientX: 100,
      clientY: 100,
    });
    expect(screen.getByTestId('resize-ghost-frame')).toBeInTheDocument();

    rerender(
      <WindowResizeFrame
        disabled
        onResizeCommit={onResizeCommit}
        data-testid="cancel-root"
      />
    );
    expect(screen.queryByTestId('resize-ghost-frame')).toBeNull();
    expect(removeSpy.mock.calls.length).toBeGreaterThanOrEqual(
      removeCountBeforeDisable + 4
    );

    // 4. Unmounting mid-drag removes all 4 listeners cleanly
    rerender(
      <WindowResizeFrame
        disabled={false}
        onResizeCommit={onResizeCommit}
        data-testid="cancel-root"
      />
    );
    const removeCountBeforeUnmount = removeSpy.mock.calls.length;
    fireEvent.pointerDown(screen.getByTestId('resize-handle-e'), {
      button: 0,
      pointerId: 24,
      clientX: 100,
      clientY: 100,
    });
    unmount();
    expect(removeSpy.mock.calls.length).toBeGreaterThanOrEqual(
      removeCountBeforeUnmount + 4
    );

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('supports IME-safe Arrow and Shift+Arrow keyboard resizing across edges and corners', () => {
    const onResizeCommit = vi.fn();

    render(
      <WindowResizeFrame
        defaultRect={{ x: 64, y: 48, width: 352, height: 224 }}
        snapGridPx={16}
        onResizeCommit={onResizeCommit}
      />
    );

    const eHandle = screen.getByTestId('resize-handle-e');
    const nHandle = screen.getByTestId('resize-handle-n');
    const swHandle = screen.getByTestId('resize-handle-sw');

    // IME-composing ArrowRight MUST be ignored
    const composingArrow = new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(composingArrow, 'isComposing', { value: true });
    fireEvent(eHandle, composingArrow);
    expect(onResizeCommit).not.toHaveBeenCalled();

    // Orthogonal key on East edge (ArrowUp) and non-arrow key (Enter) are ignored
    fireEvent.keyDown(eHandle, { key: 'ArrowUp' });
    fireEvent.keyDown(eHandle, { key: 'Enter' });
    expect(onResizeCommit).not.toHaveBeenCalled();

    // East ArrowRight steps by snapGridPx (16px): 352 -> 368
    fireEvent.keyDown(eHandle, { key: 'ArrowRight' });
    expect(onResizeCommit).toHaveBeenLastCalledWith(
      { x: 64, y: 48, width: 368, height: 224 },
      'e'
    );

    // East ArrowLeft steps back: 368 -> 352
    fireEvent.keyDown(eHandle, { key: 'ArrowLeft' });
    expect(onResizeCommit).toHaveBeenLastCalledWith(
      { x: 64, y: 48, width: 352, height: 224 },
      'e'
    );

    // North edge ignores horizontal arrows, handles ArrowUp/ArrowDown
    fireEvent.keyDown(nHandle, { key: 'ArrowLeft' });
    expect(onResizeCommit).toHaveBeenCalledTimes(2);

    fireEvent.keyDown(nHandle, { key: 'ArrowUp' });
    expect(onResizeCommit).toHaveBeenLastCalledWith(
      { x: 64, y: 32, width: 352, height: 240 },
      'n'
    );

    // Corner Shift+Arrow steps by fine 4px bypassing grid snap
    fireEvent.keyDown(swHandle, { key: 'ArrowLeft', shiftKey: true });
    expect(onResizeCommit).toHaveBeenLastCalledWith(
      { x: 60, y: 32, width: 356, height: 240 },
      'sw'
    );

    fireEvent.keyDown(swHandle, { key: 'ArrowDown', shiftKey: true });
    expect(onResizeCommit).toHaveBeenLastCalledWith(
      { x: 60, y: 32, width: 356, height: 244 },
      'sw'
    );
    expect(screen.getByRole('status')).toHaveTextContent('Free alignment');

    // Toggle Grid Snap OFF -> normal Arrow uses 16px free step without grid snap
    fireEvent.click(screen.getByTestId('resize-snap-toggle'));
    fireEvent.keyDown(eHandle, { key: 'ArrowRight' });
    expect(onResizeCommit).toHaveBeenLastCalledWith(
      { x: 60, y: 32, width: 372, height: 244 },
      'e'
    );
  });

  it('resets frame to defaultRect via Reset Frame button in both snapped and free modes', () => {
    const onResizeCommit = vi.fn();

    render(
      <WindowResizeFrame
        defaultRect={{ x: 48, y: 32, width: 320, height: 192 }}
        onResizeCommit={onResizeCommit}
      />
    );

    const eHandle = screen.getByTestId('resize-handle-e');
    fireEvent.keyDown(eHandle, { key: 'ArrowRight' });
    expect(screen.getByTestId('resize-dimension-badge')).toHaveTextContent(
      '336 × 192 px'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Reset Frame' }));
    expect(screen.getByTestId('resize-dimension-badge')).toHaveTextContent(
      '320 × 192 px'
    );
    expect(onResizeCommit).toHaveBeenLastCalledWith(
      { x: 48, y: 32, width: 320, height: 192 },
      'se'
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'Frame reset to 320 × 192 px · Snap 16px'
    );

    // Also test Reset Frame announcement when snap is toggled off
    fireEvent.click(screen.getByTestId('resize-snap-toggle'));
    fireEvent.click(screen.getByRole('button', { name: 'Reset Frame' }));
    expect(screen.getByRole('status')).toHaveTextContent(
      'Frame reset to 320 × 192 px · Free alignment'
    );
  });

  it('clamps min/max bounds and sanitizes NaN, Infinity, negative snapGridPx, and inverted bounds', () => {
    const onResizeCommit = vi.fn();

    const { rerender } = render(
      <WindowResizeFrame
        minWidth={Number.NaN}
        minHeight={Number.NEGATIVE_INFINITY}
        maxWidth={Number.POSITIVE_INFINITY}
        maxHeight={Number.NaN}
        snapGridPx={Number.NaN}
        defaultRect={{
          x: Number.NaN,
          y: Number.POSITIVE_INFINITY,
          width: Number.NaN,
          height: -500,
        }}
        onResizeCommit={onResizeCommit}
      />
    );

    // Falls back cleanly to defaults [180..560] x [120..340], snap 16px
    const win = screen.getByTestId('resize-window-frame');
    expect(win).toHaveAttribute('data-x', '64');
    expect(win).toHaveAttribute('data-y', '48');
    expect(win).toHaveAttribute('data-width', '360');
    expect(win).toHaveAttribute('data-height', '120');
    expect(screen.getByTestId('resize-snap-toggle')).toHaveTextContent(
      'Grid Snap (16px)'
    );

    // Extreme drag beyond maxWidth and below minWidth clamps cleanly
    const seHandle = screen.getByTestId('resize-handle-se');
    fireEvent.pointerDown(seHandle, {
      button: 0,
      pointerId: 31,
      clientX: 100,
      clientY: 100,
    });
    fireEvent.pointerMove(window, { pointerId: 31, clientX: 900, clientY: 900 });
    fireEvent.pointerUp(window, { pointerId: 31 });
    expect(onResizeCommit).toHaveBeenLastCalledWith(
      { x: 64, y: 48, width: 560, height: 340 },
      'se'
    );

    fireEvent.pointerDown(seHandle, {
      button: 0,
      pointerId: 32,
      clientX: 500,
      clientY: 500,
    });
    fireEvent.pointerMove(window, { pointerId: 32, clientX: 0, clientY: 0 });
    fireEvent.pointerUp(window, { pointerId: 32 });
    expect(onResizeCommit).toHaveBeenLastCalledWith(
      { x: 64, y: 48, width: 180, height: 120 },
      'se'
    );

    // Inverted bounds (minWidth > maxWidth, minHeight > maxHeight) and negative snapGridPx
    rerender(
      <WindowResizeFrame
        minWidth={420}
        maxWidth={240}
        minHeight={280}
        maxHeight={160}
        snapGridPx={-12}
        rect={{ x: 500, y: 500, width: 100, height: 900 }}
        onResizeCommit={onResizeCommit}
      />
    );

    const invertedWin = screen.getByTestId('resize-window-frame');
    expect(invertedWin).toHaveAttribute('data-width', '240');
    expect(invertedWin).toHaveAttribute('data-height', '280');
    expect(Number(invertedWin.getAttribute('data-x'))).toBeGreaterThanOrEqual(0);
    expect(Number(invertedWin.getAttribute('data-y'))).toBeGreaterThanOrEqual(0);
    expect(screen.getByTestId('resize-snap-toggle')).toHaveTextContent(
      'Grid Snap (Off)'
    );
  });

  it('supports controlled rect, disabled state, aria-label override, blank title fallback, and XSS-safe rendering', () => {
    const onResizeCommit = vi.fn();
    const controlledRect: WindowFrameRect = { x: 48, y: 32, width: 320, height: 208 };

    const { rerender } = render(
      <WindowResizeFrame
        title="   "
        aria-label="Custom viewport resizer"
        rect={controlledRect}
        onResizeCommit={onResizeCommit}
        data-testid="ctrl-root"
      />
    );

    const root = screen.getByTestId('ctrl-root');
    expect(root).toHaveAttribute('aria-label', 'Custom viewport resizer');
    expect(root).not.toHaveAttribute('aria-labelledby');
    expect(
      screen.getByRole('heading', { name: 'Optical Viewport Window' })
    ).toBeInTheDocument();

    // Keyboard resize emits commit but controlled rect remains unchanged until parent updates prop
    fireEvent.keyDown(screen.getByTestId('resize-handle-e'), {
      key: 'ArrowRight',
    });
    expect(onResizeCommit).toHaveBeenCalledWith(
      { x: 48, y: 32, width: 336, height: 208 },
      'e'
    );
    expect(screen.getByTestId('resize-window-frame')).toHaveAttribute(
      'data-width',
      '320'
    );

    // Parent updates controlled rect
    rerender(
      <WindowResizeFrame
        title="Controlled Viewport"
        rect={{ x: 48, y: 32, width: 336, height: 208 }}
        onResizeCommit={onResizeCommit}
        data-testid="ctrl-root"
      />
    );
    expect(screen.getByTestId('resize-window-frame')).toHaveAttribute(
      'data-width',
      '336'
    );

    // Clicking Reset Frame in controlled mode emits baseline commit while preserving controlled rect
    fireEvent.click(screen.getByTestId('resize-reset-button'));
    expect(onResizeCommit).toHaveBeenLastCalledWith(
      { x: 64, y: 48, width: 360, height: 220 },
      'se'
    );
    expect(screen.getByTestId('resize-window-frame')).toHaveAttribute(
      'data-width',
      '336'
    );

    // Disabled state blocks all pointer, keyboard, toggle, and reset interactions
    onResizeCommit.mockClear();
    rerender(
      <WindowResizeFrame
        title="<script>window.__resizeXss=1</script><img src=x onerror=alert(1)>"
        rect={{ x: 48, y: 32, width: 336, height: 208 }}
        disabled
        onResizeCommit={onResizeCommit}
        data-testid="ctrl-root"
      />
    );

    expect(root).toHaveAttribute('data-disabled', 'true');
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(
      screen.getAllByText(
        '<script>window.__resizeXss=1</script><img src=x onerror=alert(1)>'
      )
    ).toHaveLength(2);

    const disabledHandle = screen.getByTestId('resize-handle-se');
    expect(disabledHandle).toBeDisabled();
    expect(screen.getByTestId('resize-snap-toggle')).toBeDisabled();
    expect(screen.getByTestId('resize-reset-button')).toBeDisabled();

    fireEvent.pointerDown(disabledHandle, {
      button: 0,
      pointerId: 40,
      clientX: 100,
      clientY: 100,
    });
    fireEvent.keyDown(disabledHandle, { key: 'ArrowRight' });
    fireEvent.click(screen.getByTestId('resize-snap-toggle'));
    fireEvent.click(screen.getByTestId('resize-reset-button'));

    expect(screen.queryByTestId('resize-ghost-frame')).toBeNull();
    expect(onResizeCommit).not.toHaveBeenCalled();
  });
});
