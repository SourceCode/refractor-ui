import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  RadialContextMenu,
  type RadialContextMenuProps,
  type RadialMenuAction,
  type RadialMenuDisplayMode,
  type RadialMenuDisplayModeMap,
  type RadialMenuTone,
  type RadialMenuToneMap,
} from './index';

function createDomRect(left: number, top: number, width: number, height: number): DOMRect {
  return {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON: () => ({ left, top, width, height }),
  };
}

describe('RadialContextMenu', () => {
  it('renders inline optical wheel with 6 default creative actions, semantic --prism-* tokens, central hub, React 19 ref, and theme overrides', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            RadialContextMenu: {
              className: 'theme-radial-menu',
              style: { maxWidth: '520px' },
            },
          },
        }}
      >
        <RadialContextMenu
          ref={ref}
          mode="inline"
          className="local-radial-menu"
          xstyle={{ '--prism-blur-px': '20px' }}
          style={{ padding: '18px' }}
          data-testid="radial-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('radial-root');
    const svg = screen.getByTestId('radial-menu-svg');
    const menu = screen.getByRole('menu', { name: 'Radial actions' });
    const status = screen.getByTestId('radial-menu-status');

    expect(RadialContextMenu.displayName).toBe('RadialContextMenu');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'refractor-radial-context-menu',
      'prism-slab',
      'theme-radial-menu',
      'local-radial-menu'
    );
    expect(root).toHaveStyle({ maxWidth: '520px', padding: '18px' });
    expect(root).toHaveAttribute('role', 'region');
    expect(root).toHaveAttribute('data-mode', 'inline');
    expect(root).toHaveAttribute('data-open', 'true');
    expect(root).toHaveAttribute('data-active-action', 'duplicate');

    expect(svg).toHaveAttribute('viewBox', '0 0 280 280');
    expect(svg).toHaveClass('w-full', 'max-w-[280px]', 'h-auto', 'select-none', 'mx-auto');
    expect(screen.getByTestId('radial-menu-mode-badge')).toHaveTextContent('inline');

    const menuItems = screen.getAllByRole('menuitem');
    expect(menuItems).toHaveLength(6);
    expect(screen.getByTestId('radial-slice-duplicate')).toHaveAttribute('data-tone', 'primary');
    expect(screen.getByTestId('radial-slice-transform')).toHaveAttribute('data-tone', 'secondary');
    expect(screen.getByTestId('radial-slice-group')).toHaveAttribute('data-tone', 'emerald');
    expect(screen.getByTestId('radial-slice-inspect')).toHaveAttribute('data-tone', 'info');
    expect(screen.getByTestId('radial-slice-export')).toHaveAttribute('data-tone', 'amber');
    expect(screen.getByTestId('radial-slice-delete')).toHaveAttribute('data-tone', 'rose');

    // Every shaded path/circle strictly uses semantic --prism-* CSS variables (zero raw color literals)
    const rawColorRe = /(?:#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\s*\()/;
    expect(svg.innerHTML).not.toMatch(rawColorRe);
    expect(svg.innerHTML).toContain('var(--prism-primary-main)');
    expect(svg.innerHTML).toContain('var(--prism-secondary-main)');
    expect(svg.innerHTML).toContain('var(--prism-success-main)');
    expect(svg.innerHTML).toContain('var(--prism-info-main)');
    expect(svg.innerHTML).toContain('var(--prism-warning-main)');
    expect(svg.innerHTML).toContain('var(--prism-error-main)');

    // Active descendant & central crystal hub default to first enabled action
    expect(menu).toHaveAttribute(
      'aria-activedescendant',
      screen.getByTestId('radial-slice-duplicate').id
    );
    expect(screen.getByTestId('radial-menu-hub-label')).toHaveTextContent('Duplicate');
    expect(screen.getByTestId('radial-menu-hub-shortcut')).toHaveTextContent('⌘D');
    expect(screen.getByTestId('radial-menu-hub-pointer')).toBeInTheDocument();

    // Polite status pill starts ready
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent('Ready · Select a radial action');
  });

  it('starts closed in default trigger mode, blooms on right-click with clamped pointer offset, repositions on contextmenu, and dismisses via close/outside/Escape', () => {
    const onOpenChange = vi.fn<(open: boolean) => void>();
    const onSelectAction = vi.fn<(action: RadialMenuAction) => void>();

    render(
      <div>
        <button type="button" data-testid="outside-target">
          Outside
        </button>
        <RadialContextMenu
          surfaceLabel="Right-click stage for Tools"
          onOpenChange={onOpenChange}
          onSelectAction={onSelectAction}
          data-testid="trigger-root"
        />
      </div>
    );

    const surface = screen.getByTestId('radial-menu-surface');
    expect(surface).toHaveTextContent('Right-click stage for Tools');
    expect(surface).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    // Mock wide desktop bounding rect to verify clamped pointer-bloom offsets
    vi.spyOn(surface, 'getBoundingClientRect').mockReturnValue(createDomRect(100, 100, 480, 400));

    // Right-click far right-bottom clamps smoothly to MAX_BLOOM_OFFSET_PX (44)
    fireEvent.contextMenu(surface, { clientX: 540, clientY: 480 });
    expect(onOpenChange).toHaveBeenCalledWith(true);

    const wheel = screen.getByTestId('radial-menu-wheel');
    expect(wheel).toHaveAttribute('data-bloom-x', '44');
    expect(wheel).toHaveAttribute('data-bloom-y', '44');
    expect(wheel).toHaveStyle({ transform: 'translate(44px, 44px)' });
    expect(document.activeElement).toBe(wheel);

    // Right-clicking inside open canvas repositions wheel toward new pointer without duplicate onOpenChange
    const canvas = screen.getByTestId('radial-menu-canvas');
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue(createDomRect(0, 0, 400, 400));
    fireEvent.contextMenu(canvas, { clientX: 185, clientY: 190 });
    expect(onOpenChange).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('radial-menu-wheel')).toHaveAttribute('data-bloom-x', '-15');
    expect(screen.getByTestId('radial-menu-wheel')).toHaveAttribute('data-bloom-y', '-10');

    // Inside mousedown does NOT dismiss the wheel
    fireEvent.mouseDown(wheel);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    // Outside mousedown dismisses the wheel
    fireEvent.mouseDown(screen.getByTestId('outside-target'));
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    // Left-click with zero-size default JSDOM rect falls back safely to centered (0, 0)
    fireEvent.click(screen.getByTestId('radial-menu-surface'), { clientX: 50, clientY: 50 });
    expect(screen.getByTestId('radial-menu-wheel')).toHaveAttribute('data-bloom-x', '0');
    expect(screen.getByTestId('radial-menu-wheel')).toHaveAttribute('data-bloom-y', '0');

    // Explicit Close button dismisses and restores focus to trigger surface
    fireEvent.click(screen.getByTestId('radial-menu-dismiss'));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(screen.getByTestId('radial-menu-surface'));

    // Open via keyboard Space on surface, then dismiss via window Escape
    fireEvent.keyDown(screen.getByTestId('radial-menu-surface'), { key: ' ' });
    expect(screen.getByRole('menu')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'a' });
    expect(screen.getByRole('menu')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(screen.getByTestId('radial-menu-surface'));

    // Open via Enter, click a sector -> selects action, updates polite pill, and auto-closes in trigger mode
    fireEvent.keyDown(screen.getByTestId('radial-menu-surface'), { key: 'Enter' });
    fireEvent.click(screen.getByTestId('radial-slice-export'));
    expect(onSelectAction).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'export', label: 'Export', shortcut: '⇧⌘E' })
    );
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(screen.getByTestId('radial-menu-status')).toHaveTextContent('Last action: Export⇧⌘E');
  });

  it('supports mouse/pointer hover, click selection, and ArrowLeft/ArrowRight spin skipping disabled slices in inline mode', () => {
    const onSelectAction = vi.fn<(action: RadialMenuAction) => void>();
    const onOpenChange = vi.fn<(open: boolean) => void>();
    const customActions: ReadonlyArray<RadialMenuAction> = [
      { id: 'copy', label: 'Copy', shortcut: '⌘C', tone: 'primary' },
      { id: 'locked', label: 'Locked', shortcut: '⌘L', tone: 'amber', disabled: true },
      { id: 'paste', label: 'Paste', shortcut: '⌘V', tone: 'emerald' },
      { id: 'erase', label: 'Erase', tone: 'rose' },
    ];

    render(
      <RadialContextMenu
        mode="inline"
        actions={customActions}
        onSelectAction={onSelectAction}
        onOpenChange={onOpenChange}
      />
    );

    const menu = screen.getByRole('menu');
    const copySlice = screen.getByTestId('radial-slice-copy');
    const lockedSlice = screen.getByTestId('radial-slice-locked');
    const pasteSlice = screen.getByTestId('radial-slice-paste');
    const eraseSlice = screen.getByTestId('radial-slice-erase');

    expect(copySlice).toHaveAttribute('data-active', 'true');
    expect(lockedSlice).toHaveAttribute('aria-disabled', 'true');
    expect(lockedSlice).toHaveAttribute('data-disabled', 'true');

    // Hovering or clicking a disabled slice does nothing
    fireEvent.mouseEnter(lockedSlice);
    fireEvent.pointerEnter(lockedSlice);
    fireEvent.click(lockedSlice);
    expect(screen.getByTestId('radial-menu-hub-label')).toHaveTextContent('Copy');
    expect(onSelectAction).not.toHaveBeenCalled();

    // ArrowRight spins clockwise from Copy (0) -> skips Locked (1) -> Paste (2)
    fireEvent.keyDown(menu, { key: 'ArrowRight' });
    expect(pasteSlice).toHaveAttribute('data-active', 'true');
    expect(screen.getByTestId('radial-menu-hub-label')).toHaveTextContent('Paste');
    expect(screen.getByTestId('radial-menu-hub-shortcut')).toHaveTextContent('⌘V');

    // ArrowRight again -> Erase (3), no shortcut falls back to 'Enter' hint in hub
    fireEvent.keyDown(menu, { key: 'ArrowRight' });
    expect(eraseSlice).toHaveAttribute('data-active', 'true');
    expect(screen.getByTestId('radial-menu-hub-label')).toHaveTextContent('Erase');
    expect(screen.getByTestId('radial-menu-hub-shortcut')).toHaveTextContent('Enter');

    // ArrowRight wraps around -> Copy (0)
    fireEvent.keyDown(menu, { key: 'ArrowRight' });
    expect(copySlice).toHaveAttribute('data-active', 'true');

    // ArrowLeft spins counterclockwise -> Erase (3) -> Paste (2) -> skips Locked (1) -> Copy (0)
    fireEvent.keyDown(menu, { key: 'ArrowLeft' });
    expect(eraseSlice).toHaveAttribute('data-active', 'true');
    fireEvent.keyDown(menu, { key: 'ArrowLeft' });
    expect(pasteSlice).toHaveAttribute('data-active', 'true');
    fireEvent.keyDown(menu, { key: 'ArrowLeft' });
    expect(copySlice).toHaveAttribute('data-active', 'true');

    // Hovering with pointerEnter/mouseEnter updates hub immediately
    fireEvent.pointerEnter(pasteSlice);
    expect(screen.getByTestId('radial-menu-hub-label')).toHaveTextContent('Paste');
    fireEvent.mouseEnter(eraseSlice);
    expect(screen.getByTestId('radial-menu-hub-label')).toHaveTextContent('Erase');

    // Enter activates Erase (no shortcut), inline mode stays open!
    fireEvent.keyDown(menu, { key: 'Enter' });
    expect(onSelectAction).toHaveBeenLastCalledWith(customActions[3]);
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByTestId('radial-menu-status')).toHaveTextContent('Last action: Erase');

    // Space activates Copy after clicking/hovering
    fireEvent.mouseEnter(copySlice);
    fireEvent.keyDown(menu, { key: ' ' });
    expect(onSelectAction).toHaveBeenLastCalledWith(customActions[0]);
    expect(screen.getByTestId('radial-menu-status')).toHaveTextContent('Last action: Copy⌘C');

    // Unrelated key does nothing
    fireEvent.keyDown(menu, { key: 'Tab' });
    expect(screen.getByRole('menu')).toBeInTheDocument();

    // Outside click does NOT close inline mode
    fireEvent.mouseDown(document.body);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    // Escape on menu dismisses even in inline mode and reveals reopen surface
    fireEvent.keyDown(menu, { key: 'Escape' });
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(screen.getByTestId('radial-menu-surface')).toBeInTheDocument();
  });

  it('guards all keyboard handlers during active IME composition', () => {
    const onSelectAction = vi.fn<(action: RadialMenuAction) => void>();
    const onOpenChange = vi.fn<(open: boolean) => void>();

    render(
      <RadialContextMenu
        mode="trigger"
        onSelectAction={onSelectAction}
        onOpenChange={onOpenChange}
      />
    );

    const surface = screen.getByTestId('radial-menu-surface');

    // Composing Space/Enter on surface does not open
    const composingSurfaceSpace = new KeyboardEvent('keydown', {
      key: ' ',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(composingSurfaceSpace, 'isComposing', { value: true });
    surface.dispatchEvent(composingSurfaceSpace);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    // Non-activation key on surface does not open
    fireEvent.keyDown(surface, { key: 'a' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    // Open menu normally
    fireEvent.click(surface);
    const menu = screen.getByRole('menu');

    // Composing ArrowRight, Enter, and Escape on menu are ignored
    for (const key of ['ArrowRight', 'Enter', 'Escape']) {
      const ev = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      Object.defineProperty(ev, 'isComposing', { value: true });
      menu.dispatchEvent(ev);
    }

    // Composing Escape on window is also ignored
    const windowEsc = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    Object.defineProperty(windowEsc, 'isComposing', { value: true });
    window.dispatchEvent(windowEsc);

    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByTestId('radial-menu-hub-label')).toHaveTextContent('Duplicate');
    expect(onSelectAction).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledTimes(1);
  });

  it('renders clean role="status" empty state when actions is explicitly []', () => {
    render(<RadialContextMenu actions={[]} data-testid="empty-root" />);

    const root = screen.getByTestId('empty-root');
    const emptyStatus = screen.getByRole('status');

    expect(root).toHaveAttribute('data-empty', 'true');
    expect(emptyStatus).toHaveTextContent('No radial actions available');
    expect(screen.queryByTestId('radial-menu-svg')).not.toBeInTheDocument();
    expect(screen.queryByTestId('radial-menu-surface')).not.toBeInTheDocument();
    expect(screen.queryByTestId('radial-menu-status')).not.toBeInTheDocument();
  });

  it('handles single-action full annulus, all-disabled wheels, duplicate IDs, long label truncation, and tone cycling', () => {
    const onSelectAction = vi.fn<(action: RadialMenuAction) => void>();

    // 1. Single action full-circle annulus
    const { rerender } = render(
      <RadialContextMenu
        mode="inline"
        actions={[{ id: 'solo', label: 'Solo Action With Long Title' }]}
        onSelectAction={onSelectAction}
      />
    );

    const soloSlice = screen.getByTestId('radial-slice-solo');
    expect(soloSlice).toHaveAttribute('data-tone', 'primary');
    expect(soloSlice.querySelector('path')).toHaveAttribute('fill-rule', 'evenodd');
    expect(soloSlice.querySelector('circle[fill="none"]')).toBeInTheDocument();
    expect(screen.getByTestId('radial-menu-hub-label')).toHaveTextContent('Solo Action…');
    expect(screen.getByTestId('radial-menu-hub-shortcut')).toHaveTextContent('Enter');

    // 2. All-disabled actions wheel
    rerender(
      <RadialContextMenu
        mode="inline"
        actions={[
          { id: 'd1', label: 'Lock A', disabled: true },
          { id: 'd2', label: 'Lock B', disabled: true },
        ]}
        onSelectAction={onSelectAction}
      />
    );

    const menu = screen.getByRole('menu');
    expect(menu).not.toHaveAttribute('aria-activedescendant');
    expect(screen.getByTestId('radial-menu-hub-label')).toHaveTextContent('Unavailable');
    expect(screen.getByTestId('radial-menu-hub-shortcut')).toHaveTextContent('All disabled');
    expect(screen.queryByTestId('radial-menu-hub-pointer')).not.toBeInTheDocument();

    fireEvent.keyDown(menu, { key: 'ArrowRight' });
    fireEvent.keyDown(menu, { key: 'ArrowLeft' });
    fireEvent.keyDown(menu, { key: 'Enter' });
    fireEvent.keyDown(menu, { key: ' ' });
    expect(onSelectAction).not.toHaveBeenCalled();

    // 3. Tone cycling across 7 actions with duplicate IDs + dynamic active slice disabling fallback
    const cycledActions: ReadonlyArray<RadialMenuAction> = [
      { id: 'dup', label: 'One' },
      { id: 'dup', label: 'Two' },
      { id: 'three', label: 'Three' },
      { id: 'four', label: 'Four' },
      { id: 'five', label: 'Five' },
      { id: 'six', label: 'Six' },
      { id: 'seven', label: 'Seven' },
    ];
    rerender(<RadialContextMenu mode="inline" actions={cycledActions} />);

    const items = screen.getAllByRole('menuitem');
    expect(items).toHaveLength(7);
    expect(items.map((el) => el.getAttribute('data-tone'))).toEqual([
      'primary',
      'secondary',
      'emerald',
      'info',
      'amber',
      'rose',
      'primary',
    ]);

    // Hover index 2 ('Three'), then disable index 2 -> gracefully falls back to first enabled index 0 ('One')
    fireEvent.mouseEnter(screen.getByTestId('radial-slice-three'));
    expect(screen.getByTestId('radial-menu-hub-label')).toHaveTextContent('Three');

    rerender(
      <RadialContextMenu
        mode="inline"
        actions={cycledActions.map((act) =>
          act.id === 'three' ? { ...act, disabled: true } : act
        )}
      />
    );
    expect(screen.getByTestId('radial-menu-hub-label')).toHaveTextContent('One');
  });

  it('supports controlled open state and explicit defaultOpen overrides in both modes', () => {
    const onOpenChange = vi.fn<(open: boolean) => void>();

    function ControlledHarness() {
      const [open, setOpen] = useState(false);
      return (
        <div>
          <button type="button" data-testid="toggle-controlled" onClick={() => setOpen((v) => !v)}>
            Toggle
          </button>
          <RadialContextMenu
            mode="trigger"
            open={open}
            onOpenChange={(next) => {
              onOpenChange(next);
              setOpen(next);
            }}
          />
        </div>
      );
    }

    const { unmount } = render(<ControlledHarness />);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('toggle-controlled'));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    unmount();

    // Uncontrolled defaultOpen overrides defaults in both modes
    const { rerender } = render(<RadialContextMenu mode="trigger" defaultOpen={true} />);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    rerender(<RadialContextMenu key="inline-closed" mode="inline" defaultOpen={false} />);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(screen.getByTestId('radial-menu-surface')).toBeInTheDocument();
  });

  it('exports extensible variant maps and strict typed props contract', () => {
    const modeMap: RadialMenuDisplayModeMap = { trigger: true, inline: true };
    const toneMap: RadialMenuToneMap = {
      primary: true,
      secondary: true,
      emerald: true,
      amber: true,
      rose: true,
      info: true,
    };
    const mode: RadialMenuDisplayMode = 'inline';
    const tone: RadialMenuTone = 'emerald';
    const props: RadialContextMenuProps = {
      mode,
      actions: [{ id: 'check', label: 'Check', tone }],
    };

    expect(Object.keys(modeMap)).toEqual(['trigger', 'inline']);
    expect(Object.keys(toneMap)).toEqual([
      'primary',
      'secondary',
      'emerald',
      'amber',
      'rose',
      'info',
    ]);
    expect(props.mode).toBe('inline');
  });
});
