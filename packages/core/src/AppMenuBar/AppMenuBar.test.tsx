import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { AppMenuBar, DEFAULT_APP_MENUS, type AppMenuGroup } from './index';

function dispatchComposingKeyDown(target: EventTarget, key: string) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  Object.defineProperty(event, 'isComposing', { value: true });
  target.dispatchEvent(event);
}

describe('AppMenuBar', () => {
  it('renders canonical OS menus, brand badge, prism-slab bar, theme overrides, xstyle, and React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            AppMenuBar: { className: 'theme-menubar', style: { letterSpacing: '0.5px' } },
          },
        }}
      >
        <AppMenuBar
          ref={ref}
          className="local-menubar"
          xstyle={{ '--prism-blur-px': '20px' }}
          style={{ marginTop: '4px' }}
          data-testid="menubar-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('menubar-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass('refractor-app-menu-bar', 'theme-menubar', 'local-menubar');
    expect(root).toHaveStyle({ letterSpacing: '0.5px', marginTop: '4px' });
    expect(root).not.toHaveAttribute('data-open');

    const menubar = screen.getByRole('menubar', { name: 'Application menu bar' });
    expect(menubar).toBeInTheDocument();
    expect(screen.getByText('Refractor')).toBeInTheDocument();
    expect(DEFAULT_APP_MENUS).toHaveLength(5);

    for (const label of ['File', 'Edit', 'View', 'Window', 'Help']) {
      const trigger = within(menubar).getByRole('menuitem', { name: label });
      expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    }

    expect(within(menubar).getByRole('menuitem', { name: 'File' })).toHaveAttribute('tabindex', '0');
    expect(within(menubar).getByRole('menuitem', { name: 'Edit' })).toHaveAttribute('tabindex', '-1');

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent('Ready');
  });

  it('opens on click, switches smoothly across top-level menus on hover only while open, and closes on re-click or outside click', () => {
    render(
      <div>
        <AppMenuBar data-testid="menubar-root" />
        <button type="button">Outside target</button>
      </div>
    );

    const menubar = screen.getByRole('menubar');
    const fileBtn = within(menubar).getByRole('menuitem', { name: 'File' });
    const editBtn = within(menubar).getByRole('menuitem', { name: 'Edit' });
    const viewBtn = within(menubar).getByRole('menuitem', { name: 'View' });

    // Hovering while closed does not open any menu
    fireEvent.mouseEnter(editBtn);
    expect(screen.queryByRole('menu')).toBeNull();

    // Clicking File opens File dropdown with viewport clamping
    fireEvent.click(fileBtn);
    expect(screen.getByTestId('menubar-root')).toHaveAttribute('data-open', 'true');
    expect(screen.getByTestId('menubar-root')).toHaveAttribute('data-active-menu', 'file');
    const fileMenu = screen.getByRole('menu', { name: 'File' });
    expect(fileMenu).toHaveClass('prism-slab', 'max-w-[calc(100vw-2rem)]');
    expect(fileBtn).toHaveAttribute('aria-expanded', 'true');
    expect(fileBtn).toHaveAttribute('aria-controls', fileMenu.id);
    expect(within(fileMenu).getByText('⌘S')).toBeInTheDocument();
    expect(within(fileMenu).getAllByRole('separator').length).toBeGreaterThanOrEqual(2);

    // Hovering same open menu is a no-op; hovering Edit switches smoothly
    fireEvent.mouseEnter(fileBtn);
    expect(screen.getByRole('menu', { name: 'File' })).toBeInTheDocument();
    fireEvent.mouseEnter(editBtn);
    expect(screen.queryByRole('menu', { name: 'File' })).toBeNull();
    const editMenu = screen.getByRole('menu', { name: 'Edit' });
    expect(within(editMenu).getByText('⇧⌘P')).toBeInTheDocument();

    // Hovering View switches again
    fireEvent.mouseEnter(viewBtn);
    expect(screen.getByRole('menu', { name: 'View' })).toBeInTheDocument();

    // Mousedown inside menubar keeps menu open
    fireEvent.mouseDown(viewBtn);
    expect(screen.getByRole('menu', { name: 'View' })).toBeInTheDocument();

    // Mousedown outside closes the open menu
    fireEvent.mouseDown(screen.getByRole('button', { name: 'Outside target' }));
    expect(screen.queryByRole('menu')).toBeNull();
    expect(viewBtn).toHaveAttribute('aria-expanded', 'false');

    // Re-click toggles closed
    fireEvent.click(fileBtn);
    expect(screen.getByRole('menu', { name: 'File' })).toBeInTheDocument();
    fireEvent.click(fileBtn);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('invokes action callbacks, toggles checkmarks with live status updates, and supports cascading nested submenus', () => {
    const onSelectAction = vi.fn();
    const onToggleCheck = vi.fn();

    render(
      <AppMenuBar
        onSelectAction={onSelectAction}
        onToggleCheck={onToggleCheck}
        data-testid="menubar-root"
      />
    );

    const menubar = screen.getByRole('menubar');
    const fileBtn = within(menubar).getByRole('menuitem', { name: 'File' });
    const viewBtn = within(menubar).getByRole('menuitem', { name: 'View' });

    // Select regular action item
    fireEvent.click(fileBtn);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Save' }));
    expect(onSelectAction).toHaveBeenCalledTimes(1);
    expect(onSelectAction).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'save', label: 'Save', shortcut: '⌘S' }),
      'file'
    );
    expect(screen.queryByRole('menu')).toBeNull();
    expect(screen.getByTestId('app-menu-status')).toHaveTextContent('File › Save');
    expect(document.activeElement).toBe(fileBtn);

    // Open File -> Export As cascading submenu via hover and toggle nested checkbox + select nested action
    fireEvent.click(fileBtn);
    const exportTrigger = screen.getByRole('menuitem', { name: 'Export As' });
    expect(exportTrigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(exportTrigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.mouseEnter(exportTrigger);
    expect(exportTrigger).toHaveAttribute('aria-expanded', 'true');
    const submenu = screen.getByRole('menu', { name: 'Export As' });
    expect(submenu).toHaveClass('prism-slab', 'max-w-[calc(100vw-2rem)]');
    expect(screen.getByTestId('menubar-root')).toHaveAttribute('data-active-submenu', 'export-as');

    // Toggle checkbox inside cascading submenu
    const embedCaustics = within(submenu).getByRole('menuitemcheckbox', {
      name: 'Embed Caustic Metadata',
    });
    expect(embedCaustics).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(embedCaustics);
    expect(embedCaustics).toHaveAttribute('aria-checked', 'false');
    expect(onToggleCheck).toHaveBeenLastCalledWith('export-caustics', false, 'file');
    expect(screen.getByTestId('app-menu-status')).toHaveTextContent(
      'File › Embed Caustic Metadata: Off'
    );

    // Clicking Export As trigger toggles submenu closed and open again
    fireEvent.click(exportTrigger);
    expect(screen.queryByRole('menu', { name: 'Export As' })).toBeNull();
    fireEvent.click(exportTrigger);
    expect(screen.getByRole('menu', { name: 'Export As' })).toBeInTheDocument();

    // Hovering a sibling non-submenu item closes the open submenu; hovering another when closed is a no-op
    fireEvent.mouseEnter(screen.getByRole('menuitem', { name: 'Save' }));
    expect(screen.queryByRole('menu', { name: 'Export As' })).toBeNull();
    fireEvent.mouseEnter(screen.getByRole('menuitem', { name: 'Open Project…' }));
    expect(screen.queryByRole('menu', { name: 'Export As' })).toBeNull();

    // Select nested action from Export As submenu
    fireEvent.mouseEnter(exportTrigger);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Refracted PNG (2×)' }));
    expect(onSelectAction).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'export-png', label: 'Refracted PNG (2×)' }),
      'file'
    );
    expect(screen.queryByRole('menu')).toBeNull();
    expect(screen.getByTestId('app-menu-status')).toHaveTextContent('File › Refracted PNG (2×)');

    // Toggle top-level View checkboxes (On -> Off -> On)
    fireEvent.click(viewBtn);
    const gridCheckbox = screen.getByRole('menuitemcheckbox', { name: 'Show Optical Grid' });
    const rulersCheckbox = screen.getByRole('menuitemcheckbox', { name: 'Show Rulers' });
    expect(gridCheckbox).toHaveAttribute('aria-checked', 'true');
    expect(rulersCheckbox).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(gridCheckbox);
    expect(gridCheckbox).toHaveAttribute('aria-checked', 'false');
    expect(onToggleCheck).toHaveBeenLastCalledWith('show-optical-grid', false, 'view');
    expect(screen.getByTestId('app-menu-status')).toHaveTextContent('View › Show Optical Grid: Off');

    fireEvent.click(rulersCheckbox);
    expect(rulersCheckbox).toHaveAttribute('aria-checked', 'true');
    expect(onToggleCheck).toHaveBeenLastCalledWith('show-rulers', true, 'view');
    expect(screen.getByTestId('app-menu-status')).toHaveTextContent('View › Show Rulers: On');
  });

  it('supports full WAI-ARIA keyboard navigation across top-level triggers, dropdown items, and cascading submenus', () => {
    const onSelectAction = vi.fn();
    const onToggleCheck = vi.fn();

    render(<AppMenuBar onSelectAction={onSelectAction} onToggleCheck={onToggleCheck} />);

    const menubar = screen.getByRole('menubar');
    const fileBtn = within(menubar).getByRole('menuitem', { name: 'File' });
    const editBtn = within(menubar).getByRole('menuitem', { name: 'Edit' });
    const helpBtn = within(menubar).getByRole('menuitem', { name: 'Help' });

    // Top-level closed navigation: ArrowRight, ArrowLeft, End, Home, unrelated key, Escape while closed
    fileBtn.focus();
    fireEvent.keyDown(fileBtn, { key: 'Escape' });
    fireEvent.keyDown(fileBtn, { key: 'a' });
    fireEvent.keyDown(fileBtn, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(editBtn);
    expect(screen.queryByRole('menu')).toBeNull();

    fireEvent.keyDown(editBtn, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(fileBtn);

    fireEvent.keyDown(fileBtn, { key: 'End' });
    expect(document.activeElement).toBe(helpBtn);

    fireEvent.keyDown(helpBtn, { key: 'Home' });
    expect(document.activeElement).toBe(fileBtn);

    // Open via ArrowDown -> focuses first enabled item; ArrowUp from trigger opens and focuses last enabled item
    fireEvent.keyDown(fileBtn, { key: 'ArrowDown' });
    const newCanvas = screen.getByRole('menuitem', { name: 'New Optical Canvas' });
    expect(document.activeElement).toBe(newCanvas);

    // Dropdown item navigation: ArrowDown, ArrowUp wrap, End, Home, unrelated key
    fireEvent.keyDown(newCanvas, { key: 'x' });
    fireEvent.keyDown(newCanvas, { key: 'ArrowDown' });
    const openProject = screen.getByRole('menuitem', { name: 'Open Project…' });
    expect(document.activeElement).toBe(openProject);

    fireEvent.keyDown(openProject, { key: 'End' });
    const closeWorkspace = screen.getByRole('menuitem', { name: 'Close Workspace' });
    expect(document.activeElement).toBe(closeWorkspace);

    fireEvent.keyDown(closeWorkspace, { key: 'Home' });
    expect(document.activeElement).toBe(newCanvas);

    fireEvent.keyDown(newCanvas, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(closeWorkspace);

    // Open submenu with ArrowRight from Export As item
    fireEvent.keyDown(closeWorkspace, { key: 'ArrowUp' });
    const exportItem = screen.getByRole('menuitem', { name: 'Export As' });
    expect(document.activeElement).toBe(exportItem);

    fireEvent.keyDown(exportItem, { key: 'ArrowRight' });
    const exportPng = screen.getByRole('menuitem', { name: 'Refracted PNG (2×)' });
    expect(document.activeElement).toBe(exportPng);

    // Submenu item navigation: ArrowDown, ArrowUp, End, Home, unrelated key
    fireEvent.keyDown(exportPng, { key: 'z' });
    fireEvent.keyDown(exportPng, { key: 'ArrowDown' });
    const exportSvg = screen.getByRole('menuitem', { name: 'Vector Tokens SVG' });
    expect(document.activeElement).toBe(exportSvg);

    fireEvent.keyDown(exportSvg, { key: 'End' });
    const embedCaustics = screen.getByRole('menuitemcheckbox', { name: 'Embed Caustic Metadata' });
    expect(document.activeElement).toBe(embedCaustics);

    fireEvent.keyDown(embedCaustics, { key: 'Home' });
    expect(document.activeElement).toBe(exportPng);

    fireEvent.keyDown(exportPng, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(embedCaustics);

    // Toggle submenu checkbox with Space
    fireEvent.keyDown(embedCaustics, { key: ' ' });
    expect(onToggleCheck).toHaveBeenLastCalledWith('export-caustics', false, 'file');

    // ArrowLeft inside submenu closes submenu and returns focus to parent submenu trigger
    fireEvent.keyDown(embedCaustics, { key: 'ArrowLeft' });
    expect(screen.queryByRole('menu', { name: 'Export As' })).toBeNull();
    expect(document.activeElement).toBe(exportItem);

    // Re-open submenu via Enter and jump to next top-level menu (Edit) via ArrowRight
    fireEvent.keyDown(exportItem, { key: 'Enter' });
    const exportPngAgain = screen.getByRole('menuitem', { name: 'Refracted PNG (2×)' });
    expect(document.activeElement).toBe(exportPngAgain);
    fireEvent.keyDown(exportPngAgain, { key: 'ArrowRight' });
    const undoItem = screen.getByRole('menuitem', { name: 'Undo' });
    expect(document.activeElement).toBe(undoItem);

    // ArrowLeft from dropdown switches back to File; ArrowRight switches to Edit; Enter activates Undo
    fireEvent.keyDown(undoItem, { key: 'ArrowLeft' });
    expect(screen.getByRole('menu', { name: 'File' })).toBeInTheDocument();
    const firstFile = screen.getByRole('menuitem', { name: 'New Optical Canvas' });
    fireEvent.keyDown(firstFile, { key: 'ArrowRight' });
    const undoAgain = screen.getByRole('menuitem', { name: 'Undo' });
    fireEvent.keyDown(undoAgain, { key: 'Enter' });
    expect(onSelectAction).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'undo', label: 'Undo' }),
      'edit'
    );
    expect(screen.queryByRole('menu')).toBeNull();

    // Open via Space, close via Enter on trigger, open via ArrowUp, close via Escape on trigger
    fireEvent.keyDown(editBtn, { key: ' ' });
    expect(screen.getByRole('menu', { name: 'Edit' })).toBeInTheDocument();
    fireEvent.keyDown(editBtn, { key: 'Enter' });
    expect(screen.queryByRole('menu')).toBeNull();

    // Activate submenu action via Enter
    fireEvent.keyDown(fileBtn, { key: 'Enter' });
    fireEvent.mouseEnter(screen.getByRole('menuitem', { name: 'Export As' }));
    fireEvent.keyDown(screen.getByRole('menuitem', { name: 'Vector Tokens SVG' }), {
      key: 'Enter',
    });
    expect(onSelectAction).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'export-svg', label: 'Vector Tokens SVG' }),
      'file'
    );
    expect(screen.queryByRole('menu')).toBeNull();

    fireEvent.keyDown(editBtn, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(
      screen.getByRole('menuitem', { name: 'Command Palette…' })
    );
    fireEvent.keyDown(editBtn, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();

    // Open and switch top-level triggers while open via ArrowRight
    fireEvent.click(fileBtn);
    fireEvent.keyDown(fileBtn, { key: 'ArrowRight' });
    expect(screen.getByRole('menu', { name: 'Edit' })).toBeInTheDocument();

    // Escape on dropdown item closes and restores focus to Edit trigger
    const editUndo = screen.getByRole('menuitem', { name: 'Undo' });
    fireEvent.keyDown(editUndo, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(editBtn);

    // Global window Escape closes open menu and restores trigger focus
    fireEvent.click(fileBtn);
    fireEvent.keyDown(window, { key: 'a' });
    expect(screen.getByRole('menu', { name: 'File' })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(fileBtn);

    // Tab closes from dropdown and from submenu; Escape closes from submenu
    fireEvent.click(fileBtn);
    fireEvent.keyDown(screen.getByRole('menuitem', { name: 'Save' }), { key: 'Tab' });
    expect(screen.queryByRole('menu')).toBeNull();

    fireEvent.click(fileBtn);
    fireEvent.mouseEnter(screen.getByRole('menuitem', { name: 'Export As' }));
    fireEvent.keyDown(screen.getByRole('menuitem', { name: 'Refracted PNG (2×)' }), {
      key: 'Escape',
    });
    expect(screen.queryByRole('menu')).toBeNull();

    fireEvent.click(fileBtn);
    fireEvent.mouseEnter(screen.getByRole('menuitem', { name: 'Export As' }));
    fireEvent.keyDown(screen.getByRole('menuitem', { name: 'Refracted PNG (2×)' }), { key: 'Tab' });
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('guards all keyboard handlers against IME composition and skips disabled entries', () => {
    const onSelectAction = vi.fn();
    render(<AppMenuBar onSelectAction={onSelectAction} />);

    const menubar = screen.getByRole('menubar');
    const fileBtn = within(menubar).getByRole('menuitem', { name: 'File' });
    const windowBtn = within(menubar).getByRole('menuitem', { name: 'Window' });

    // Composing Enter on trigger does not open menu
    dispatchComposingKeyDown(fileBtn, 'Enter');
    expect(screen.queryByRole('menu')).toBeNull();

    // Open File, composing Enter on Save does not activate, composing Escape on window does not close
    fireEvent.click(fileBtn);
    const saveItem = screen.getByRole('menuitem', { name: 'Save' });
    dispatchComposingKeyDown(saveItem, 'Enter');
    expect(onSelectAction).not.toHaveBeenCalled();

    // Open submenu, composing Enter on subitem does not activate
    fireEvent.mouseEnter(screen.getByRole('menuitem', { name: 'Export As' }));
    const exportPng = screen.getByRole('menuitem', { name: 'Refracted PNG (2×)' });
    dispatchComposingKeyDown(exportPng, 'Enter');
    expect(onSelectAction).not.toHaveBeenCalled();

    dispatchComposingKeyDown(window, 'Escape');
    expect(screen.getByRole('menu', { name: 'File' })).toBeInTheDocument();

    // Window menu disabled item cannot be clicked and is skipped by End/Arrow navigation
    fireEvent.mouseEnter(windowBtn);
    const locked = screen.getByRole('menuitem', { name: 'Detach Inspector (Locked)' });
    expect(locked).toBeDisabled();
    expect(locked).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(locked);
    expect(onSelectAction).not.toHaveBeenCalled();

    const minimize = screen.getByRole('menuitem', { name: 'Minimize' });
    fireEvent.keyDown(minimize, { key: 'End' });
    expect(document.activeElement).toBe(
      screen.getByRole('menuitem', { name: 'Bring All to Front' })
    );
  });

  it('handles custom menus, inferred kinds, empty/disabled states, hidden brand, controlled check sync, and adversarial XSS/prototype-key inputs', () => {
    const onSelectAction = vi.fn();
    const xssPayload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';

    const customMenus: AppMenuGroup[] = [
      {
        id: '__proto__',
        label: xssPayload,
        items: [
          { id: 'inferred-action', label: 'Implicit Action' },
          {
            id: 'inferred-sub',
            label: 'Implicit Submenu',
            children: [
              { id: 'sub-danger', label: 'Purge Cache', shortcut: '⌫', danger: true },
              { id: 'sub-disabled', label: 'Disabled Sub', disabled: true },
            ],
          },
          { id: 'empty-sub', kind: 'submenu', label: 'Empty Submenu' },
          {
            id: 'disabled-sub',
            kind: 'submenu',
            label: 'Locked Submenu',
            disabled: true,
            children: [{ id: 'unreachable', label: 'Hidden' }],
          },
          { id: 'sync-check', kind: 'checkbox', label: 'Synced Flag', checked: true },
        ],
      },
      {
        id: 'empty-group',
        label: 'Empty',
        items: [],
      },
    ];

    const { rerender } = render(
      <AppMenuBar
        brandLabel=""
        menus={customMenus}
        onSelectAction={onSelectAction}
        data-testid="custom-root"
      />
    );

    // Brand badge omitted when brandLabel=""
    expect(screen.queryByText('Refractor')).toBeNull();

    // XSS payload rendered safely as text, zero script injection
    const menubar = screen.getByRole('menubar');
    const protoTrigger = within(menubar).getByRole('menuitem', { name: xssPayload });
    expect(document.querySelector('script')).toBeNull();

    // Open menu and verify inferred submenu, danger submenu item, empty submenu, and disabled submenu hover guard
    fireEvent.click(protoTrigger);
    const implicitSub = screen.getByRole('menuitem', { name: 'Implicit Submenu' });
    fireEvent.mouseEnter(implicitSub);
    const dangerSubItem = screen.getByRole('menuitem', { name: 'Purge Cache' });
    expect(dangerSubItem).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Disabled Sub' })).toBeDisabled();

    // Hovering disabled submenu closes previous submenu without opening disabled one
    fireEvent.mouseEnter(screen.getByRole('menuitem', { name: 'Locked Submenu' }));
    expect(screen.queryByRole('menu', { name: 'Locked Submenu' })).toBeNull();

    // Opening empty submenu (undefined children) renders graceful No items placeholder
    const emptySub = screen.getByRole('menuitem', { name: 'Empty Submenu' });
    fireEvent.keyDown(emptySub, { key: 'ArrowRight' });
    const emptySubMenu = screen.getByRole('menu', { name: 'Empty Submenu' });
    expect(within(emptySubMenu).getByText('No items')).toBeInTheDocument();

    // Toggle Synced Flag locally, then verify external prop change resets/syncs checked state
    const syncedCheck = screen.getByRole('menuitemcheckbox', { name: 'Synced Flag' });
    expect(syncedCheck).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(syncedCheck);
    expect(syncedCheck).toHaveAttribute('aria-checked', 'false');

    // Switch via ArrowRight into Empty group (no enabled items -> focuses Empty trigger and shows No items)
    const implicitAction = screen.getByRole('menuitem', { name: 'Implicit Action' });
    fireEvent.keyDown(implicitAction, { key: 'ArrowRight' });
    const emptyTrigger = within(menubar).getByRole('menuitem', { name: 'Empty' });
    expect(document.activeElement).toBe(emptyTrigger);
    expect(within(screen.getByRole('menu', { name: 'Empty' })).getByText('No items')).toBeInTheDocument();

    // ArrowDown on Empty trigger handles empty enabled list gracefully
    fireEvent.keyDown(emptyTrigger, { key: 'ArrowDown' });
    expect(screen.getByRole('menu', { name: 'Empty' })).toBeInTheDocument();

    // Rerender with updated checked value and dropped open menu id -> closes cleanly & syncs checked prop
    const updatedMenus: AppMenuGroup[] = [
      {
        id: '__proto__',
        label: 'Updated',
        items: [{ id: 'sync-check', kind: 'checkbox', label: 'Synced Flag', checked: false }],
      },
    ];
    rerender(<AppMenuBar brandLabel="Studio" menus={updatedMenus} />);
    expect(screen.queryByRole('menu')).toBeNull();
    fireEvent.click(within(screen.getByRole('menubar')).getByRole('menuitem', { name: 'Updated' }));
    expect(screen.getByRole('menuitemcheckbox', { name: 'Synced Flag' })).toHaveAttribute(
      'aria-checked',
      'false'
    );

    // Rerender with empty menus array -> renders graceful "No menus" fallback
    rerender(<AppMenuBar menus={[]} />);
    expect(screen.getByText('No menus')).toBeInTheDocument();
  });
});
