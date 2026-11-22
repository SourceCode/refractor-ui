import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  WindowLayoutPopover,
  type WindowLayoutSlotSelection,
} from './index';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('WindowLayoutPopover', () => {
  it('renders defaults, semantic tokens, ref passthrough, responsive classes, and theme overrides', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            WindowLayoutPopover: {
              className: 'theme-window-layout-popover',
              style: { opacity: '0.96' },
            },
          },
        }}
      >
        <WindowLayoutPopover
          ref={ref}
          className="local-layout-shell"
          xstyle={{ '--prism-blur-px': '20px' }}
          data-testid="layout-root"
        />
      </PrismThemeProvider>
    );

    expect(WindowLayoutPopover.displayName).toBe('WindowLayoutPopover');

    const root = screen.getByTestId('layout-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveAttribute('role', 'region');
    expect(root).toHaveClass(
      'refractor-window-layout-popover',
      'prism-slab',
      'theme-window-layout-popover',
      'local-layout-shell'
    );
    expect(root).toHaveStyle({ opacity: '0.96' });
    expect(root).not.toHaveAttribute('data-open');
    expect(root).not.toHaveAttribute('data-disabled');
    expect(root).not.toHaveAttribute('aria-disabled');

    const header = root.querySelector('[data-part="header"]');
    expect(header).toHaveClass('flex-wrap', 'min-w-0');

    expect(
      screen.getByRole('heading', { name: 'Refractor Studio — Main Canvas' })
    ).toBeInTheDocument();
    expect(screen.queryByTestId('window-layout-active-badge')).toBeNull();

    const trigger = screen.getByRole('button', {
      name: 'Window layout presets',
    });
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).not.toHaveAttribute('aria-controls');
    expect(trigger).toHaveClass('prism-focus-ring');

    expect(screen.queryByRole('menu')).toBeNull();

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent(
      'No tiling layout selected for Refractor Studio — Main Canvas.'
    );
    expect(screen.getByTestId('window-layout-zone-tag')).toHaveTextContent(
      'Floating'
    );
  });

  it('opens on click and hover, renders viewport-clamped popover, previews slots on hover/focus, and handles mouse leave timer teardown', () => {
    vi.useFakeTimers();
    const onOpenChange = vi.fn<(open: boolean) => void>();

    const { unmount } = render(
      <WindowLayoutPopover
        windowTitle="Scene Viewport"
        onOpenChange={onOpenChange}
        data-testid="hover-root"
      />
    );

    const trigger = screen.getByRole('button', {
      name: 'Window layout presets',
    });
    const anchor = screen.getByTestId('window-layout-anchor');

    // Mouse leave while closed is a safe no-op
    fireEvent.mouseLeave(anchor);
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(onOpenChange).not.toHaveBeenCalled();

    // Click opens popover
    fireEvent.click(trigger);
    expect(onOpenChange).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    const menu = screen.getByRole('menu', { name: 'Window layout presets' });
    expect(trigger).toHaveAttribute('aria-controls', menu.id);
    expect(menu).toHaveClass('w-[min(21rem,calc(100vw-2rem))]');

    // Clicking trigger again toggles closed
    fireEvent.click(trigger);
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(screen.queryByRole('menu')).toBeNull();

    // Hovering trigger opens popover
    fireEvent.mouseEnter(trigger);
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    // Hovering trigger again while already open does not fire duplicate onOpenChange
    const callCountAfterOpen = onOpenChange.mock.calls.length;
    fireEvent.mouseEnter(trigger);
    expect(onOpenChange).toHaveBeenCalledTimes(callCountAfterOpen);

    // Hovering and focusing a pane updates --prism-primary-main tinting and preview footer
    const leftHalf = screen.getByRole('menuitem', {
      name: '50 / 50 Split: Left Half',
    });
    const previewFooter = screen.getByTestId('window-layout-preview-footer');
    expect(previewFooter).toHaveTextContent(
      'Select a tiling zone to snap window'
    );

    fireEvent.mouseEnter(leftHalf);
    expect(leftHalf.style.borderColor).toBe('var(--prism-primary-main)');
    expect(previewFooter).toHaveTextContent('50 / 50 Split · Left Half');

    fireEvent.mouseLeave(leftHalf);
    expect(previewFooter).toHaveTextContent(
      'Select a tiling zone to snap window'
    );

    fireEvent.focus(leftHalf);
    expect(leftHalf.style.borderColor).toBe('var(--prism-primary-main)');
    expect(previewFooter).toHaveTextContent('50 / 50 Split · Left Half');

    fireEvent.blur(leftHalf);
    expect(previewFooter).toHaveTextContent(
      'Select a tiling zone to snap window'
    );

    // Mouse leave schedules delayed close; re-entering menu cancels close timer
    const openMenu = screen.getByRole('menu');
    fireEvent.mouseLeave(anchor);
    act(() => {
      vi.advanceTimersByTime(80);
    });
    fireEvent.mouseEnter(openMenu);
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(screen.getByRole('menu')).toBeInTheDocument();

    // Leaving anchor and allowing timer to complete closes popover
    fireEvent.mouseLeave(anchor);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(onOpenChange).toHaveBeenLastCalledWith(false);

    // Leaving anchor and unmounting before timer fires tears down cleanly without callbacks
    fireEvent.mouseEnter(trigger);
    expect(screen.getByRole('menu')).toBeInTheDocument();
    const callsBeforeUnmount = onOpenChange.mock.calls.length;
    fireEvent.mouseLeave(anchor);
    unmount();
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(onOpenChange).toHaveBeenCalledTimes(callsBeforeUnmount);
  });

  it('exposes all 4 miniature tiling schematics with 12 accessible menuitem panes and selects slots across every template', () => {
    const onSelectLayout =
      vi.fn<(selection: WindowLayoutSlotSelection) => void>();

    render(
      <WindowLayoutPopover
        windowTitle="Color Grading Monitor"
        defaultOpen
        onSelectLayout={onSelectLayout}
        data-testid="templates-root"
      />
    );

    const expectedMenuItems = [
      '50 / 50 Split: Left Half',
      '50 / 50 Split: Right Half',
      '70 / 30 Main & Stack: Main (70%)',
      '70 / 30 Main & Stack: Top-Right Stack (30%)',
      '70 / 30 Main & Stack: Bottom-Right Stack (30%)',
      '3-Column Studio: Left Column',
      '3-Column Studio: Center Column',
      '3-Column Studio: Right Column',
      '2×2 Quad Grid: Top-Left',
      '2×2 Quad Grid: Top-Right',
      '2×2 Quad Grid: Bottom-Left',
      '2×2 Quad Grid: Bottom-Right',
    ];

    const allMenuItems = screen.getAllByRole('menuitem');
    expect(allMenuItems).toHaveLength(12);
    for (const label of expectedMenuItems) {
      expect(screen.getByRole('menuitem', { name: label })).toBeInTheDocument();
    }

    const trigger = screen.getByRole('button', {
      name: 'Window layout presets',
    });
    const status = screen.getByRole('status');
    const root = screen.getByTestId('templates-root');

    const selectionsToTest: ReadonlyArray<{
      ariaLabel: string;
      expected: WindowLayoutSlotSelection;
    }> = [
      {
        ariaLabel: '50 / 50 Split: Right Half',
        expected: {
          templateId: 'split-50-50',
          templateLabel: '50 / 50 Split',
          slotId: 'right-half',
          slotLabel: 'Right Half',
        },
      },
      {
        ariaLabel: '70 / 30 Main & Stack: Bottom-Right Stack (30%)',
        expected: {
          templateId: 'main-stack-70-30',
          templateLabel: '70 / 30 Main & Stack',
          slotId: 'bottom-right-30',
          slotLabel: 'Bottom-Right Stack (30%)',
        },
      },
      {
        ariaLabel: '3-Column Studio: Center Column',
        expected: {
          templateId: 'three-columns',
          templateLabel: '3-Column Studio',
          slotId: 'center-column',
          slotLabel: 'Center Column',
        },
      },
      {
        ariaLabel: '2×2 Quad Grid: Bottom-Left',
        expected: {
          templateId: 'quad-grid',
          templateLabel: '2×2 Quad Grid',
          slotId: 'bottom-left',
          slotLabel: 'Bottom-Left',
        },
      },
    ];

    for (const { ariaLabel, expected } of selectionsToTest) {
      if (screen.queryByRole('menu') === null) {
        fireEvent.click(trigger);
      }

      const pane = screen.getByRole('menuitem', { name: ariaLabel });
      fireEvent.click(pane);

      expect(onSelectLayout).toHaveBeenLastCalledWith(expected);
      expect(screen.queryByRole('menu')).toBeNull();
      expect(root).toHaveAttribute('data-template', expected.templateId);
      expect(root).toHaveAttribute('data-slot', expected.slotId);
      expect(screen.getByTestId('window-layout-active-badge')).toHaveTextContent(
        `${expected.templateLabel} · ${expected.slotLabel}`
      );
      expect(status).toHaveTextContent(
        `Color Grading Monitor snapped to ${expected.templateLabel}: ${expected.slotLabel}`
      );
      expect(screen.getByTestId('window-layout-zone-tag')).toHaveTextContent(
        expected.slotLabel
      );

      // Reopen to confirm selected pane retains --prism-primary-main selected styling
      fireEvent.click(trigger);
      const selectedPane = screen.getByRole('menuitem', { name: ariaLabel });
      expect(selectedPane).toHaveAttribute('data-selected', 'true');
      expect(selectedPane.style.borderColor).toBe('var(--prism-primary-main)');
      expect(selectedPane.style.backgroundColor).toContain(
        'var(--prism-primary-main)'
      );
      expect(screen.getByTestId('window-layout-preview-footer')).toHaveTextContent(
        `${expected.templateLabel} · ${expected.slotLabel}`
      );
    }
  });

  it('dismisses on outside pointerdown and Escape with focus restoration, and strictly cleans up window listeners on close and unmount', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = render(
      <div>
        <button type="button" data-testid="outside-btn">
          Outside Target
        </button>
        <WindowLayoutPopover windowTitle="Inspector Dock" />
      </div>
    );

    const countListenerCalls = (
      spy: typeof addSpy,
      eventType: 'pointerdown' | 'keydown'
    ) => spy.mock.calls.filter(([type]) => type === eventType).length;

    // Closed initially -> zero window listeners attached
    expect(countListenerCalls(addSpy, 'pointerdown')).toBe(0);
    expect(countListenerCalls(addSpy, 'keydown')).toBe(0);

    const trigger = screen.getByRole('button', {
      name: 'Window layout presets',
    });

    // Open popover -> attaches both pointerdown and keydown listeners
    fireEvent.click(trigger);
    expect(countListenerCalls(addSpy, 'pointerdown')).toBe(1);
    expect(countListenerCalls(addSpy, 'keydown')).toBe(1);

    // Pointerdown inside popover does NOT close
    const popover = screen.getByRole('menu');
    fireEvent.pointerDown(popover);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    // Pointerdown outside anchor closes popover and cleans up both listeners
    fireEvent.pointerDown(screen.getByTestId('outside-btn'));
    expect(screen.queryByRole('menu')).toBeNull();
    expect(countListenerCalls(removeSpy, 'pointerdown')).toBe(1);
    expect(countListenerCalls(removeSpy, 'keydown')).toBe(1);

    // Reopen, focus a slot item, verify non-Escape key is ignored, then Escape dismisses and restores focus to trigger
    fireEvent.click(trigger);
    expect(countListenerCalls(addSpy, 'pointerdown')).toBe(2);
    expect(countListenerCalls(addSpy, 'keydown')).toBe(2);

    const quadTopLeft = screen.getByRole('menuitem', {
      name: '2×2 Quad Grid: Top-Left',
    });
    act(() => {
      quadTopLeft.focus();
    });
    expect(document.activeElement).toBe(quadTopLeft);

    fireEvent.keyDown(window, { key: 'a' });
    expect(screen.getByRole('menu')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(countListenerCalls(removeSpy, 'pointerdown')).toBe(2);
    expect(countListenerCalls(removeSpy, 'keydown')).toBe(2);

    // Open again and unmount while open -> strictly cleans up listeners
    fireEvent.click(trigger);
    expect(countListenerCalls(addSpy, 'pointerdown')).toBe(3);
    expect(countListenerCalls(addSpy, 'keydown')).toBe(3);

    unmount();
    expect(countListenerCalls(removeSpy, 'pointerdown')).toBe(3);
    expect(countListenerCalls(removeSpy, 'keydown')).toBe(3);
  });

  it('guards IME composition on trigger, menuitem slots, and Escape while supporting keyboard activation', () => {
    const onSelectLayout =
      vi.fn<(selection: WindowLayoutSlotSelection) => void>();

    render(
      <WindowLayoutPopover
        windowTitle="Keyboard Deck"
        onSelectLayout={onSelectLayout}
      />
    );

    const trigger = screen.getByRole('button', {
      name: 'Window layout presets',
    });

    // Composing Enter on trigger is ignored
    const composingTriggerEnter = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(composingTriggerEnter, 'isComposing', {
      value: true,
    });
    fireEvent(trigger, composingTriggerEnter);
    expect(screen.queryByRole('menu')).toBeNull();

    // Non-activation key on trigger is ignored
    fireEvent.keyDown(trigger, { key: 'a' });
    expect(screen.queryByRole('menu')).toBeNull();

    // ArrowDown opens closed popover; ArrowDown while open does nothing
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    expect(screen.getByRole('menu')).toBeInTheDocument();

    // Composing Escape on window MUST be ignored
    const composingEscape = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(composingEscape, 'isComposing', { value: true });
    window.dispatchEvent(composingEscape);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    // Space on trigger toggles closed; Enter toggles back open
    fireEvent.keyDown(trigger, { key: ' ' });
    expect(screen.queryByRole('menu')).toBeNull();
    fireEvent.keyDown(trigger, { key: 'Enter' });
    expect(screen.getByRole('menu')).toBeInTheDocument();

    const main70 = screen.getByRole('menuitem', {
      name: '70 / 30 Main & Stack: Main (70%)',
    });

    // Composing Enter on menuitem is ignored
    const composingSlotEnter = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(composingSlotEnter, 'isComposing', { value: true });
    fireEvent(main70, composingSlotEnter);
    expect(onSelectLayout).not.toHaveBeenCalled();
    expect(screen.getByRole('menu')).toBeInTheDocument();

    // Non-activation key on menuitem is ignored
    fireEvent.keyDown(main70, { key: 'Tab' });
    expect(onSelectLayout).not.toHaveBeenCalled();

    // Enter selects slot and closes popover
    fireEvent.keyDown(main70, { key: 'Enter' });
    expect(onSelectLayout).toHaveBeenCalledWith({
      templateId: 'main-stack-70-30',
      templateLabel: '70 / 30 Main & Stack',
      slotId: 'main-70',
      slotLabel: 'Main (70%)',
    });
    expect(screen.queryByRole('menu')).toBeNull();

    // Space also activates a menuitem slot
    fireEvent.click(trigger);
    const rightCol = screen.getByRole('menuitem', {
      name: '3-Column Studio: Right Column',
    });
    fireEvent.keyDown(rightCol, { key: ' ' });
    expect(onSelectLayout).toHaveBeenLastCalledWith({
      templateId: 'three-columns',
      templateLabel: '3-Column Studio',
      slotId: 'right-column',
      slotLabel: 'Right Column',
    });
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('supports controlled open and selectedSelection props without mutating internal state until parent updates', () => {
    const onOpenChange = vi.fn<(open: boolean) => void>();
    const onSelectLayout =
      vi.fn<(selection: WindowLayoutSlotSelection) => void>();

    const initialSelection: WindowLayoutSlotSelection = {
      templateId: 'split-50-50',
      templateLabel: '50 / 50 Split',
      slotId: 'left-half',
      slotLabel: 'Left Half',
    };

    const nextSelection: WindowLayoutSlotSelection = {
      templateId: 'quad-grid',
      templateLabel: '2×2 Quad Grid',
      slotId: 'top-right',
      slotLabel: 'Top-Right',
    };

    const { rerender } = render(
      <WindowLayoutPopover
        windowTitle="Controlled Canvas"
        open={false}
        selectedSelection={initialSelection}
        onOpenChange={onOpenChange}
        onSelectLayout={onSelectLayout}
      />
    );

    expect(screen.getByTestId('window-layout-active-badge')).toHaveTextContent(
      '50 / 50 Split · Left Half'
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'Controlled Canvas snapped to 50 / 50 Split: Left Half'
    );

    const trigger = screen.getByRole('button', {
      name: 'Window layout presets',
    });
    fireEvent.click(trigger);
    expect(onOpenChange).toHaveBeenCalledWith(true);
    // Remains closed because parent controls open=false
    expect(screen.queryByRole('menu')).toBeNull();

    // Parent opens popover
    rerender(
      <WindowLayoutPopover
        windowTitle="Controlled Canvas"
        open
        selectedSelection={initialSelection}
        onOpenChange={onOpenChange}
        onSelectLayout={onSelectLayout}
      />
    );
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: '50 / 50 Split: Left Half' })
    ).toHaveAttribute('data-selected', 'true');

    // Selecting a new slot invokes callbacks without mutating parent-controlled selection or open prop
    fireEvent.click(
      screen.getByRole('menuitem', { name: '2×2 Quad Grid: Top-Right' })
    );
    expect(onSelectLayout).toHaveBeenCalledWith(nextSelection);
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(screen.getByTestId('window-layout-active-badge')).toHaveTextContent(
      '50 / 50 Split · Left Half'
    );

    // Parent commits nextSelection and closes popover
    rerender(
      <WindowLayoutPopover
        windowTitle="Controlled Canvas"
        open={false}
        selectedSelection={nextSelection}
        onOpenChange={onOpenChange}
        onSelectLayout={onSelectLayout}
      />
    );
    expect(screen.queryByRole('menu')).toBeNull();
    expect(screen.getByTestId('window-layout-active-badge')).toHaveTextContent(
      '2×2 Quad Grid · Top-Right'
    );

    // Parent clears controlled selection to null
    rerender(
      <WindowLayoutPopover
        windowTitle="Controlled Canvas"
        open={false}
        selectedSelection={null}
        onOpenChange={onOpenChange}
        onSelectLayout={onSelectLayout}
      />
    );
    expect(screen.queryByTestId('window-layout-active-badge')).toBeNull();
  });

  it('blocks all opening and selection interactions when disabled and cleans up if disabled while open', () => {
    vi.useFakeTimers();
    const onOpenChange = vi.fn<(open: boolean) => void>();
    const onSelectLayout =
      vi.fn<(selection: WindowLayoutSlotSelection) => void>();

    const { rerender } = render(
      <WindowLayoutPopover
        disabled
        defaultOpen
        onOpenChange={onOpenChange}
        onSelectLayout={onSelectLayout}
        data-testid="disabled-root"
      />
    );

    const root = screen.getByTestId('disabled-root');
    const trigger = screen.getByRole('button', {
      name: 'Window layout presets',
    });

    expect(root).toHaveAttribute('data-disabled', 'true');
    expect(root).toHaveAttribute('aria-disabled', 'true');
    expect(trigger).toBeDisabled();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('menu')).toBeNull();

    fireEvent.mouseEnter(trigger);
    fireEvent.click(trigger);
    fireEvent.keyDown(trigger, { key: 'Enter' });
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });

    expect(onOpenChange).not.toHaveBeenCalled();
    expect(onSelectLayout).not.toHaveBeenCalled();
    expect(screen.queryByRole('menu')).toBeNull();

    // Enable -> open -> schedule mouseLeave -> disable -> timer cleared & menu closed
    rerender(
      <WindowLayoutPopover
        disabled={false}
        onOpenChange={onOpenChange}
        onSelectLayout={onSelectLayout}
        data-testid="disabled-root"
      />
    );
    fireEvent.mouseEnter(trigger);
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.mouseLeave(screen.getByTestId('window-layout-anchor'));

    const callsBeforeDisable = onOpenChange.mock.calls.length;
    rerender(
      <WindowLayoutPopover
        disabled
        onOpenChange={onOpenChange}
        onSelectLayout={onSelectLayout}
        data-testid="disabled-root"
      />
    );
    expect(screen.queryByRole('menu')).toBeNull();
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(onOpenChange).toHaveBeenCalledTimes(callsBeforeDisable);
  });

  it('handles blank title fallback, omitted callbacks, and adversarial XSS window titles safely', () => {
    const { rerender } = render(
      <WindowLayoutPopover windowTitle="   " data-testid="safe-root" />
    );

    expect(
      screen.getByRole('heading', { name: 'Refractor Studio — Main Canvas' })
    ).toBeInTheDocument();

    // Full interaction cycle without callbacks never throws
    const trigger = screen.getByRole('button', {
      name: 'Window layout presets',
    });
    fireEvent.click(trigger);
    fireEvent.click(
      screen.getByRole('menuitem', { name: '50 / 50 Split: Left Half' })
    );
    expect(screen.getByTestId('window-layout-active-badge')).toHaveTextContent(
      '50 / 50 Split · Left Half'
    );

    // Adversarial XSS payload rendered strictly as escaped text
    const xssPayload =
      '<script>window.__windowLayoutXss=1</script><img src=x onerror=alert(1)>';
    rerender(
      <WindowLayoutPopover windowTitle={xssPayload} data-testid="safe-root" />
    );

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(
      screen.getByRole('heading', { name: xssPayload })
    ).toBeInTheDocument();
  });
});
