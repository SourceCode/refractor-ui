import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  DEFAULT_TEAR_OFF_MENU_ITEMS,
  TearOffMenu,
  type TearOffMenuItem,
} from './index';

function dispatchComposingKeyDown(target: Element | Window, key: string) {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    isComposing: true,
  });
  Object.defineProperty(event, 'isComposing', { value: true });
  target.dispatchEvent(event);
}

describe('TearOffMenu', () => {
  it('renders parent menu bar with default label, Docked status pill, theme override, xstyle, and ref passthrough', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            TearOffMenu: {
              className: 'theme-tear-off-override',
              style: { opacity: '0.97' },
            },
          },
        }}
      >
        <TearOffMenu
          ref={ref}
          className="local-tear-off"
          xstyle={{ '--prism-blur-px': '20px' }}
          data-testid="tear-off-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('tear-off-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'refractor-tear-off-menu',
      'theme-tear-off-override',
      'local-tear-off'
    );
    expect(root).toHaveStyle({ opacity: '0.97' });
    expect(root).not.toHaveAttribute('data-open');
    expect(root).not.toHaveAttribute('data-detached');
    expect(root).not.toHaveAttribute('data-disabled');

    const trigger = screen.getByRole('button', { name: 'View & Guides' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).not.toHaveAttribute('aria-controls');

    expect(screen.getByText('Docked')).toBeInTheDocument();
    expect(screen.queryByRole('menu')).toBeNull();
    expect(screen.queryByRole('region')).toBeNull();
    expect(DEFAULT_TEAR_OFF_MENU_ITEMS).toHaveLength(5);
  });

  it('opens and closes docked dropdown, toggles checkable items, closes on item select, and ignores disabled items', () => {
    const onOpenChange = vi.fn();
    const onSelectItem = vi.fn();

    render(
      <TearOffMenu
        onOpenChange={onOpenChange}
        onSelectItem={onSelectItem}
        data-testid="docked-root"
      />
    );

    const trigger = screen.getByRole('button', { name: 'View & Guides' });

    // Open docked dropdown
    fireEvent.click(trigger);
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('docked-root')).toHaveAttribute(
      'data-open',
      'true'
    );

    const menu = screen.getByRole('menu', { name: 'View & Guides' });
    expect(menu).toHaveClass('prism-slab', 'w-[min(19rem,calc(100vw-2rem))]');

    const grip = screen.getByRole('button', {
      name: 'Tear off menu into floating palette',
    });
    expect(grip).toBeInTheDocument();

    const snapItem = screen.getByRole('menuitemcheckbox', {
      name: 'Snap to Optical Grid',
    });
    const guidesItem = screen.getByRole('menuitemcheckbox', {
      name: 'Show Specular Guides',
    });
    const alignItem = screen.getByRole('menuitem', {
      name: 'Align to Pixel Bounds',
    });
    const resetItem = screen.getByRole('menuitem', {
      name: 'Reset Viewport',
    });
    const disabledItem = screen.getByRole('menuitem', {
      name: 'Disabled Tool',
    });

    expect(snapItem).toHaveAttribute('aria-checked', 'true');
    expect(guidesItem).toHaveAttribute('aria-checked', 'true');
    expect(alignItem).not.toHaveAttribute('aria-checked');
    expect(resetItem).toHaveTextContent('⌘0');
    expect(disabledItem).toBeDisabled();
    expect(disabledItem).toHaveAttribute('aria-disabled', 'true');

    // Disabled item click and keydown do not trigger selection or close menu
    fireEvent.click(disabledItem);
    fireEvent.keyDown(disabledItem, { key: 'Enter' });
    expect(onSelectItem).not.toHaveBeenCalled();
    expect(screen.getByRole('menu')).toBeInTheDocument();

    // Selecting checkable item toggles checked state and closes docked dropdown
    fireEvent.click(snapItem);
    expect(onSelectItem).toHaveBeenCalledTimes(1);
    expect(onSelectItem).toHaveBeenLastCalledWith({
      id: 'snap-optical-grid',
      label: 'Snap to Optical Grid',
      checked: false,
    });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(document.activeElement).toBe(trigger);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Snap to Optical Grid disabled'
    );

    // Reopen and verify checked state persisted as false, then toggle back to true
    fireEvent.click(trigger);
    const snapItemAfter = screen.getByRole('menuitemcheckbox', {
      name: 'Snap to Optical Grid',
    });
    expect(snapItemAfter).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(snapItemAfter);
    expect(onSelectItem).toHaveBeenLastCalledWith({
      id: 'snap-optical-grid',
      label: 'Snap to Optical Grid',
      checked: true,
    });
    expect(screen.getByRole('status')).toHaveTextContent(
      'Snap to Optical Grid enabled'
    );

    // Reopen and click a regular non-checkable item
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Reset Viewport' }));
    expect(onSelectItem).toHaveBeenLastCalledWith({
      id: 'reset-viewport',
      label: 'Reset Viewport',
      shortcut: '⌘0',
    });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Selected Reset Viewport'
    );

    // Reopen and toggle closed by clicking trigger again
    fireEvent.click(trigger);
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.click(trigger);
    expect(screen.queryByRole('menu')).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent(
      'View & Guides menu closed'
    );
  });

  it('closes docked dropdown on outside mousedown and IME-safe window Escape', () => {
    render(<TearOffMenu defaultOpen data-testid="outside-root" />);

    const trigger = screen.getByRole('button', { name: 'View & Guides' });
    expect(screen.getByRole('menu')).toBeInTheDocument();

    // Inside mousedown does NOT close dropdown
    fireEvent.mouseDown(screen.getByTestId('outside-root'));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    // Outside mousedown closes dropdown
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('menu')).toBeNull();

    // Reopen and test window Escape with IME composition guard
    fireEvent.click(trigger);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    dispatchComposingKeyDown(window, 'Escape');
    expect(screen.getByRole('menu')).toBeInTheDocument();

    // Non-Escape window key does not close
    fireEvent.keyDown(window, { key: 'a' });
    expect(screen.getByRole('menu')).toBeInTheDocument();

    // Plain Escape on window closes dropdown and restores focus to trigger
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('tears off into a persistent floating palette via click, Enter, and Space while guarding IME composition', () => {
    const onDetachedChange = vi.fn();

    render(
      <TearOffMenu
        defaultOpen
        onDetachedChange={onDetachedChange}
        data-testid="grip-root"
      />
    );

    const grip = screen.getByRole('button', {
      name: 'Tear off menu into floating palette',
    });

    // IME composing Enter/Space on grip must NOT detach
    dispatchComposingKeyDown(grip, 'Enter');
    dispatchComposingKeyDown(grip, ' ');
    expect(onDetachedChange).not.toHaveBeenCalled();
    expect(screen.queryByRole('region')).toBeNull();

    // Clicking grip detaches immediately
    fireEvent.click(grip);
    expect(onDetachedChange).toHaveBeenCalledTimes(1);
    expect(onDetachedChange).toHaveBeenLastCalledWith(true);
    expect(screen.getByTestId('grip-root')).toHaveAttribute(
      'data-detached',
      'true'
    );
    expect(screen.queryByRole('menu')).toBeNull();
    expect(screen.getByText('Floating Palette')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'View & Guides' })
    ).toHaveAttribute('aria-expanded', 'false');

    const palette = screen.getByRole('region', {
      name: 'View & Guides floating palette',
    });
    expect(palette).toHaveClass('prism-slab');

    const dockBack = screen.getByRole('button', {
      name: 'Dock palette back to menu bar',
    });
    expect(document.activeElement).toBe(dockBack);
    expect(screen.getByRole('status')).toHaveTextContent(
      'View & Guides detached into floating palette'
    );

    // Dock back, then tear off with Enter key
    fireEvent.click(dockBack);
    expect(onDetachedChange).toHaveBeenLastCalledWith(false);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    const gripForEnter = screen.getByRole('button', {
      name: 'Tear off menu into floating palette',
    });
    fireEvent.keyDown(gripForEnter, { key: 'Enter' });
    expect(onDetachedChange).toHaveBeenLastCalledWith(true);
    expect(
      screen.getByRole('region', { name: 'View & Guides floating palette' })
    ).toBeInTheDocument();

    // Dock back again, then tear off with Space key
    fireEvent.click(
      screen.getByRole('button', { name: 'Dock palette back to menu bar' })
    );
    const gripForSpace = screen.getByRole('button', {
      name: 'Tear off menu into floating palette',
    });
    fireEvent.keyDown(gripForSpace, { key: ' ' });
    expect(onDetachedChange).toHaveBeenLastCalledWith(true);
    expect(
      screen.getByRole('region', { name: 'View & Guides floating palette' })
    ).toBeInTheDocument();
  });

  it('detaches on pointer drag >= 24px, stays docked on drag < 24px, ignores secondary button, and cleans up listeners on release, cancel, disable, and unmount', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const onDetachedChange = vi.fn();

    const { rerender, unmount } = render(
      <TearOffMenu
        defaultOpen
        onDetachedChange={onDetachedChange}
        data-testid="drag-root"
      />
    );

    const grip = screen.getByRole('button', {
      name: 'Tear off menu into floating palette',
    });

    // Secondary button (right-click) must be ignored
    fireEvent.pointerDown(grip, { button: 2, clientX: 100, clientY: 100 });
    expect(grip).not.toHaveAttribute('data-dragging');

    // Drag < 24px (12, 10 => ~15.6px) shows drag progress then stays docked on release
    fireEvent.pointerDown(grip, { button: 0, clientX: 100, clientY: 100 });
    expect(grip).toHaveAttribute('data-dragging', 'true');
    fireEvent.pointerMove(window, { clientX: 112, clientY: 110 });
    expect(grip).toHaveTextContent('Detaching');
    fireEvent.pointerUp(window, { clientX: 112, clientY: 110 });

    expect(grip).not.toHaveAttribute('data-dragging');
    expect(onDetachedChange).not.toHaveBeenCalled();
    expect(screen.queryByRole('region')).toBeNull();
    expect(screen.getByRole('menu')).toBeInTheDocument();

    // Pointer move AFTER release must do nothing (listeners cleaned up)
    fireEvent.pointerMove(window, { clientX: 300, clientY: 300 });
    expect(onDetachedChange).not.toHaveBeenCalled();

    // Pointer cancel cleans up listeners cleanly and stays docked
    fireEvent.pointerDown(grip, { button: 0, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(window, { clientX: 108, clientY: 104 });
    fireEvent.pointerCancel(window);
    expect(grip).not.toHaveAttribute('data-dragging');
    fireEvent.pointerMove(window, { clientX: 400, clientY: 400 });
    expect(onDetachedChange).not.toHaveBeenCalled();

    // Drag >= 24px (18, 18 => ~25.46px) detaches seamlessly and cleans up listeners
    fireEvent.pointerDown(grip, { button: 0, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(window, { clientX: 118, clientY: 118 });
    expect(onDetachedChange).toHaveBeenCalledTimes(1);
    expect(onDetachedChange).toHaveBeenLastCalledWith(true);
    expect(
      screen.getByRole('region', { name: 'View & Guides floating palette' })
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'View & Guides torn off by drag into floating palette'
    );

    // Dock back to verify disable mid-drag cleanup
    fireEvent.click(
      screen.getByRole('button', { name: 'Dock palette back to menu bar' })
    );
    const redockedGrip = screen.getByRole('button', {
      name: 'Tear off menu into floating palette',
    });
    onDetachedChange.mockClear();

    fireEvent.pointerDown(redockedGrip, {
      button: 0,
      clientX: 50,
      clientY: 50,
    });
    expect(redockedGrip).toHaveAttribute('data-dragging', 'true');

    rerender(
      <TearOffMenu
        defaultOpen
        disabled
        onDetachedChange={onDetachedChange}
        data-testid="drag-root"
      />
    );
    fireEvent.pointerMove(window, { clientX: 250, clientY: 250 });
    expect(onDetachedChange).not.toHaveBeenCalled();

    // Re-enable, start a drag, and unmount mid-drag to verify unmount listener cleanup
    rerender(
      <TearOffMenu
        defaultOpen
        disabled={false}
        onDetachedChange={onDetachedChange}
        data-testid="drag-root"
      />
    );
    const gripBeforeUnmount = screen.getByRole('button', {
      name: 'Tear off menu into floating palette',
    });
    fireEvent.pointerDown(gripBeforeUnmount, {
      button: 0,
      clientX: 20,
      clientY: 20,
    });
    unmount();

    fireEvent.pointerMove(window, { clientX: 220, clientY: 220 });
    expect(onDetachedChange).not.toHaveBeenCalled();

    const addedPointerMoves = addSpy.mock.calls.filter(
      (call) => call[0] === 'pointermove'
    ).length;
    const removedPointerMoves = removeSpy.mock.calls.filter(
      (call) => call[0] === 'pointermove'
    ).length;
    expect(addedPointerMoves).toBeGreaterThanOrEqual(5);
    expect(removedPointerMoves).toBe(addedPointerMoves);

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('keeps floating palette open when clicking items, preserves toggled state across dock/detach, and distinguishes Dock Back from Close', () => {
    const onOpenChange = vi.fn();
    const onDetachedChange = vi.fn();
    const onSelectItem = vi.fn();

    render(
      <TearOffMenu
        menuLabel="Canvas Tools"
        defaultDetached
        onOpenChange={onOpenChange}
        onDetachedChange={onDetachedChange}
        onSelectItem={onSelectItem}
      />
    );

    const palette = screen.getByRole('region', {
      name: 'Canvas Tools floating palette',
    });
    expect(palette).toBeInTheDocument();
    expect(screen.getByText('Floating Palette')).toBeInTheDocument();

    // Clicking outside does NOT dismiss persistent floating palette
    fireEvent.mouseDown(document.body);
    expect(
      screen.getByRole('region', { name: 'Canvas Tools floating palette' })
    ).toBeInTheDocument();

    // Clicking checkable item inside palette fires onSelectItem and toggles aria-pressed WITHOUT dismissing
    const guidesBtn = screen.getByRole('button', {
      name: 'Show Specular Guides',
    });
    expect(guidesBtn).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(guidesBtn);
    expect(onSelectItem).toHaveBeenCalledWith({
      id: 'show-specular-guides',
      label: 'Show Specular Guides',
      checked: false,
    });
    expect(guidesBtn).toHaveAttribute('aria-pressed', 'false');
    expect(
      screen.getByRole('region', { name: 'Canvas Tools floating palette' })
    ).toBeInTheDocument();

    // Clicking non-checkable action item inside palette ALSO keeps palette open
    const alignBtn = screen.getByRole('button', {
      name: 'Align to Pixel Bounds',
    });
    fireEvent.click(alignBtn);
    expect(onSelectItem).toHaveBeenLastCalledWith({
      id: 'align-pixel-bounds',
      label: 'Align to Pixel Bounds',
    });
    expect(
      screen.getByRole('region', { name: 'Canvas Tools floating palette' })
    ).toBeInTheDocument();

    // Dock Back closes floating palette, opens docked dropdown, and preserves toggled checked state
    fireEvent.click(
      screen.getByRole('button', { name: 'Dock palette back to menu bar' })
    );
    expect(onDetachedChange).toHaveBeenLastCalledWith(false);
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    expect(screen.queryByRole('region')).toBeNull();
    expect(screen.getByText('Docked')).toBeInTheDocument();
    expect(screen.getByRole('menu', { name: 'Canvas Tools' })).toBeInTheDocument();
    expect(
      screen.getByRole('menuitemcheckbox', { name: 'Show Specular Guides' })
    ).toHaveAttribute('aria-checked', 'false');

    // Tear off again and click Close -> closes BOTH floating palette and dropdown
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Tear off menu into floating palette',
      })
    );
    expect(
      screen.getByRole('region', { name: 'Canvas Tools floating palette' })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onDetachedChange).toHaveBeenLastCalledWith(false);
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(screen.queryByRole('region')).toBeNull();
    expect(screen.queryByRole('menu')).toBeNull();
    expect(screen.getByText('Docked')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Canvas Tools floating palette closed'
    );

    // Tear off again, then click parent menu trigger button directly -> re-docks cleanly
    const trigger = screen.getByRole('button', { name: 'Canvas Tools' });
    fireEvent.click(trigger);
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Tear off menu into floating palette',
      })
    );
    expect(
      screen.getByRole('region', { name: 'Canvas Tools floating palette' })
    ).toBeInTheDocument();

    fireEvent.click(trigger);
    expect(screen.queryByRole('region')).toBeNull();
    expect(screen.getByRole('menu', { name: 'Canvas Tools' })).toBeInTheDocument();
  });

  it('supports IME-safe ArrowDown/ArrowUp/Home/End skipping disabled items, Escape, and Tab across trigger, grip, docked items, and floating palette items', () => {
    const onSelectItem = vi.fn();
    const customItems: ReadonlyArray<TearOffMenuItem> = [
      { id: 'first', label: 'First Tool', checked: false },
      { id: 'mid-disabled', label: 'Locked Tool', disabled: true },
      { id: 'third', label: 'Third Tool' },
      { id: 'last-disabled', label: 'Unavailable Tool', disabled: true },
    ];

    render(<TearOffMenu items={customItems} onSelectItem={onSelectItem} />);

    const trigger = screen.getByRole('button', { name: 'View & Guides' });

    // Composing key and unhandled key on trigger are ignored
    dispatchComposingKeyDown(trigger, 'ArrowDown');
    fireEvent.keyDown(trigger, { key: 'a' });
    expect(screen.queryByRole('menu')).toBeNull();

    // ArrowDown on trigger opens docked dropdown and focuses first enabled item
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    const firstItem = screen.getByRole('menuitemcheckbox', {
      name: 'First Tool',
    });
    expect(document.activeElement).toBe(firstItem);

    // Escape on trigger while open closes docked dropdown
    fireEvent.keyDown(trigger, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();

    // ArrowUp on trigger opens docked dropdown and focuses last enabled item (skipping last-disabled)
    fireEvent.keyDown(trigger, { key: 'ArrowUp' });
    const thirdAfterUp = screen.getByRole('menuitem', { name: 'Third Tool' });
    expect(document.activeElement).toBe(thirdAfterUp);

    // ArrowDown wraps from last enabled back to first enabled (skipping disabled)
    fireEvent.keyDown(thirdAfterUp, { key: 'ArrowDown' });
    const firstAfterWrap = screen.getByRole('menuitemcheckbox', {
      name: 'First Tool',
    });
    expect(document.activeElement).toBe(firstAfterWrap);

    // ArrowDown from first skips mid-disabled and lands on third
    fireEvent.keyDown(firstAfterWrap, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(thirdAfterUp);

    // ArrowUp from third skips mid-disabled back to first
    fireEvent.keyDown(thirdAfterUp, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(firstAfterWrap);

    // ArrowUp from first wraps around to third
    fireEvent.keyDown(firstAfterWrap, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(thirdAfterUp);

    // Home and End move directly to boundary enabled items
    fireEvent.keyDown(thirdAfterUp, { key: 'Home' });
    expect(document.activeElement).toBe(firstAfterWrap);
    fireEvent.keyDown(firstAfterWrap, { key: 'End' });
    expect(document.activeElement).toBe(thirdAfterUp);

    // Unhandled key & IME composing Enter on docked item are safe no-ops
    fireEvent.keyDown(thirdAfterUp, { key: 'x' });
    dispatchComposingKeyDown(thirdAfterUp, 'Enter');
    expect(onSelectItem).not.toHaveBeenCalled();

    // Grip unhandled key, ArrowDown, ArrowUp, and Escape keyboard navigation
    const grip = screen.getByRole('button', {
      name: 'Tear off menu into floating palette',
    });
    fireEvent.keyDown(grip, { key: 'q' });
    fireEvent.keyDown(grip, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(firstAfterWrap);
    fireEvent.keyDown(grip, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(thirdAfterUp);
    fireEvent.keyDown(grip, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(trigger);

    // Reopen, test Enter on docked item activates & closes
    fireEvent.click(trigger);
    fireEvent.keyDown(
      screen.getByRole('menuitemcheckbox', { name: 'First Tool' }),
      { key: 'Enter' }
    );
    expect(onSelectItem).toHaveBeenCalledWith({
      id: 'first',
      label: 'First Tool',
      checked: true,
    });
    expect(screen.queryByRole('menu')).toBeNull();

    // Reopen, test Escape and Tab on docked item
    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole('menuitem', { name: 'Third Tool' }), {
      key: 'Escape',
    });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(trigger);

    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole('menuitem', { name: 'Third Tool' }), {
      key: 'Tab',
    });
    expect(screen.queryByRole('menu')).toBeNull();

    // Reopen, detach, and test keyboard navigation inside persistent floating palette
    fireEvent.click(trigger);
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Tear off menu into floating palette',
      })
    );

    const paletteFirst = screen.getByRole('button', { name: 'First Tool' });
    const paletteThird = screen.getByRole('button', { name: 'Third Tool' });

    fireEvent.keyDown(paletteFirst, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(paletteThird);
    fireEvent.keyDown(paletteThird, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(paletteFirst);
    fireEvent.keyDown(paletteFirst, { key: 'End' });
    expect(document.activeElement).toBe(paletteThird);
    fireEvent.keyDown(paletteThird, { key: 'Home' });
    expect(document.activeElement).toBe(paletteFirst);

    // Unhandled key & IME composing on palette item are safe no-ops
    fireEvent.keyDown(paletteFirst, { key: 'z' });
    dispatchComposingKeyDown(paletteFirst, 'Enter');

    // Space and Enter on palette items activate WITHOUT dismissing palette
    onSelectItem.mockClear();
    fireEvent.keyDown(paletteFirst, { key: ' ' });
    expect(onSelectItem).toHaveBeenCalledWith({
      id: 'first',
      label: 'First Tool',
      checked: false,
    });
    fireEvent.keyDown(paletteThird, { key: 'Enter' });
    expect(onSelectItem).toHaveBeenLastCalledWith({
      id: 'third',
      label: 'Third Tool',
    });
    expect(
      screen.getByRole('region', { name: 'View & Guides floating palette' })
    ).toBeInTheDocument();

    // ArrowDown on trigger while detached docks back and focuses first enabled docked item
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    expect(screen.queryByRole('region')).toBeNull();
    expect(
      document.activeElement
    ).toBe(screen.getByRole('menuitemcheckbox', { name: 'First Tool' }));
  });

  it('respects controlled open and detached props accurately', () => {
    const onOpenChange = vi.fn();
    const onDetachedChange = vi.fn();

    const { rerender } = render(
      <TearOffMenu
        open={false}
        detached={false}
        onOpenChange={onOpenChange}
        onDetachedChange={onDetachedChange}
      />
    );

    const trigger = screen.getByRole('button', { name: 'View & Guides' });
    fireEvent.click(trigger);
    expect(onOpenChange).toHaveBeenCalledWith(true);
    // Still closed because controlled open is false
    expect(screen.queryByRole('menu')).toBeNull();

    // Parent updates open to true
    rerender(
      <TearOffMenu
        open
        detached={false}
        onOpenChange={onOpenChange}
        onDetachedChange={onDetachedChange}
      />
    );
    expect(screen.getByRole('menu')).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Tear off menu into floating palette',
      })
    );
    expect(onDetachedChange).toHaveBeenCalledWith(true);
    // Still docked until parent updates detached
    expect(screen.queryByRole('region')).toBeNull();

    // Parent updates detached=true while open=false
    onOpenChange.mockClear();
    onDetachedChange.mockClear();
    rerender(
      <TearOffMenu
        open={false}
        detached
        onOpenChange={onOpenChange}
        onDetachedChange={onDetachedChange}
      />
    );
    expect(
      screen.getByRole('region', { name: 'View & Guides floating palette' })
    ).toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    // Close when open is already false should only emit onDetachedChange(false)
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onDetachedChange).toHaveBeenCalledWith(false);
    expect(onOpenChange).not.toHaveBeenCalled();

    // Trigger click while detached and open=false emits both onDetachedChange(false) and onOpenChange(true)
    onDetachedChange.mockClear();
    fireEvent.click(trigger);
    expect(onDetachedChange).toHaveBeenCalledWith(false);
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it('handles disabled state, empty items, whitespace labels, duplicate IDs, and external checked prop updates', () => {
    const onOpenChange = vi.fn();
    const onDetachedChange = vi.fn();
    const onSelectItem = vi.fn();

    const { rerender } = render(
      <TearOffMenu
        menuLabel="   "
        items={[]}
        defaultOpen
        disabled
        onOpenChange={onOpenChange}
        onDetachedChange={onDetachedChange}
        onSelectItem={onSelectItem}
        data-testid="edge-root"
      />
    );

    const root = screen.getByTestId('edge-root');
    expect(root).toHaveAttribute('data-disabled', 'true');

    const trigger = screen.getByRole('button', { name: 'View & Guides' });
    expect(trigger).toBeDisabled();
    const grip = screen.getByRole('button', {
      name: 'Tear off menu into floating palette',
    });
    expect(grip).toBeDisabled();
    expect(screen.getByText('No actions available')).toBeInTheDocument();

    // Disabled keyboard and pointer events are ignored
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    fireEvent.keyDown(grip, { key: 'Enter' });
    fireEvent.pointerDown(grip, { button: 0, clientX: 0, clientY: 0 });
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(onDetachedChange).not.toHaveBeenCalled();

    // Empty items when enabled + ArrowDown on grip/trigger safely no-ops without throwing
    rerender(
      <TearOffMenu
        menuLabel="   "
        items={[]}
        defaultOpen
        onOpenChange={onOpenChange}
        onDetachedChange={onDetachedChange}
      />
    );
    const enabledGrip = screen.getByRole('button', {
      name: 'Tear off menu into floating palette',
    });
    fireEvent.keyDown(enabledGrip, { key: 'ArrowDown' });
    fireEvent.click(enabledGrip);
    expect(screen.getByText('No actions available')).toBeInTheDocument();

    // Disabled floating palette controls
    rerender(
      <TearOffMenu
        items={[]}
        detached
        disabled
        onDetachedChange={onDetachedChange}
      />
    );
    expect(
      screen.getByRole('button', { name: 'Dock palette back to menu bar' })
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Close' })).toBeDisabled();

    // Duplicate IDs, blank ID/label normalization, and external checked prop reset
    const duplicateItems: ReadonlyArray<TearOffMenuItem> = [
      { id: 'dup', label: 'Primary Grid', checked: true, shortcut: '  ⌘G  ' },
      { id: 'dup', label: 'Secondary Grid', checked: false },
      { id: '   ', label: '   ' },
    ];

    rerender(
      <TearOffMenu
        items={duplicateItems}
        open
        detached={false}
        onSelectItem={onSelectItem}
      />
    );

    const primaryGrid = screen.getByRole('menuitemcheckbox', {
      name: 'Primary Grid',
    });
    expect(primaryGrid).toHaveAttribute('aria-checked', 'true');
    expect(primaryGrid).toHaveTextContent('⌘G');
    expect(
      screen.getByRole('menuitem', { name: 'item-3' })
    ).toBeInTheDocument();

    // Toggle locally from true -> false
    fireEvent.click(primaryGrid);
    expect(
      screen.getByRole('menuitemcheckbox', { name: 'Primary Grid' })
    ).toHaveAttribute('aria-checked', 'false');

    // Consumer updates base checked prop from true -> false then back to true: override resets cleanly
    rerender(
      <TearOffMenu
        items={[
          { id: 'dup', label: 'Primary Grid', checked: false, shortcut: '⌘G' },
          { id: 'dup', label: 'Secondary Grid', checked: false },
        ]}
        open
        detached={false}
        onSelectItem={onSelectItem}
      />
    );
    expect(
      screen.getByRole('menuitemcheckbox', { name: 'Primary Grid' })
    ).toHaveAttribute('aria-checked', 'false');
  });
});
