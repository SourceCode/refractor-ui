import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { ContextMenuDropdown } from './ContextMenuDropdown';

const sampleActions = [
  { id: 'duplicate', label: 'Duplicate Layer', shortcut: '⌘D' },
  { id: 'inspect', label: 'Inspect Optics' },
  { id: 'delete', label: 'Delete Layer', shortcut: '⌫', destructive: true },
];

describe('ContextMenuDropdown', () => {
  it('opens from trigger and contextmenu, selects items, closes on Escape/outside click, and forwards ref/className', () => {
    const ref = createRef<HTMLDivElement>();
    const onSelect = vi.fn();

    render(
      <ContextMenuDropdown
        ref={ref}
        actions={sampleActions}
        onSelect={onSelect}
        className="custom-menu"
        data-testid="menu-root"
      />
    );

    const root = screen.getByTestId('menu-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass('refractor-context-menu-dropdown', 'custom-menu');

    const trigger = screen.getByRole('button', { name: 'Actions Menu' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('menu')).toBeNull();

    // Open via click trigger
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(root).toHaveAttribute('data-open', 'true');
    expect(screen.getByRole('menu')).toBeInTheDocument();

    // Select a standard item
    fireEvent.click(screen.getByRole('menuitem', { name: /Duplicate Layer/ }));
    expect(onSelect).toHaveBeenCalledWith(sampleActions[0]);
    expect(screen.queryByRole('menu')).toBeNull();

    // Open via right-click on crystal zone
    const zone = screen.getByText('Right-click anywhere inside this crystal zone');
    fireEvent.contextMenu(zone, { clientX: 80, clientY: 20 });
    const menu = screen.getByRole('menu');
    expect(menu).toHaveStyle({ marginLeft: '80px' });

    const destructiveItem = screen.getByRole('menuitem', { name: /Delete Layer/ });
    expect(destructiveItem).toHaveClass('text-red-600');

    // Mousedown inside wrapper keeps menu open
    fireEvent.mouseDown(zone);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    // Mousedown outside closes menu
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('menu')).toBeNull();

    // Reopen and close with Escape
    fireEvent.click(trigger);
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('applies theme overrides and handles empty actions + adversarial XSS labels safely', () => {
    const payload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';
    const { rerender } = render(
      <PrismThemeProvider
        theme={{
          components: { ContextMenuDropdown: { className: 'theme-menu', style: { maxWidth: '480px' } } },
        }}
      >
        <ContextMenuDropdown
          actions={[]}
          onSelect={vi.fn()}
          className="local-menu"
          data-testid="empty-menu"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('empty-menu');
    expect(root).toHaveClass('refractor-context-menu-dropdown', 'theme-menu', 'local-menu');
    expect(root).toHaveStyle({ maxWidth: '480px' });

    fireEvent.click(screen.getByRole('button', { name: 'Actions Menu' }));
    expect(screen.getByText('No actions available')).toBeInTheDocument();

    rerender(
      <PrismThemeProvider>
        <ContextMenuDropdown
          actions={[{ id: 'xss', label: payload, shortcut: payload }]}
          onSelect={vi.fn()}
        />
      </PrismThemeProvider>
    );

    expect(screen.getByRole('menuitem')).toHaveTextContent(payload);
    expect(document.querySelector('script')).toBeNull();
  });
});
