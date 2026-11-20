import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { CommandPalette } from './CommandPalette';

const makeItems = () => [
  { id: 'theme-dark', label: 'Switch to Obsidian', group: 'Theme', shortcut: '⌘D', onSelect: vi.fn() },
  { id: 'nav-tokens', label: 'Open Tokens', group: 'Navigation', onSelect: vi.fn() },
  { id: 'act-export', label: 'Export Preset', group: 'Actions', shortcut: '⌘E', onSelect: vi.fn() },
];

describe('CommandPalette', () => {
  it('returns null when closed and ignores Escape while closed (negative test)', () => {
    const onClose = vi.fn();
    const { container } = render(
      <CommandPalette open={false} onClose={onClose} items={makeItems()} />
    );

    expect(container.firstChild).toBeNull();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('filters commands, executes selection via click and keyboard arrows/Enter, and forwards ref/className', () => {
    vi.useFakeTimers();
    const ref = createRef<HTMLDivElement>();
    const onClose = vi.fn();
    const items = makeItems();

    render(
      <CommandPalette
        ref={ref}
        open
        onClose={onClose}
        items={items}
        className="custom-palette"
        data-testid="palette"
      />
    );

    vi.advanceTimersByTime(25);
    const dialog = screen.getByTestId('palette');
    const input = screen.getByLabelText('Filter commands');
    expect(ref.current).toBe(dialog);
    expect(dialog).toHaveClass('refractor-command-palette', 'custom-palette');
    expect(dialog).toHaveAttribute('data-open', 'true');
    expect(document.activeElement).toBe(input);

    // Arrow navigation + Enter selection
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(items[1]?.onSelect).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);

    // Mouse enter highlights and click selects
    const exportBtn = screen.getByRole('button', { name: /Export Preset/ });
    fireEvent.mouseEnter(exportBtn);
    expect(exportBtn).toHaveAttribute('data-highlighted', 'true');
    fireEvent.click(exportBtn);
    expect(items[2]?.onSelect).toHaveBeenCalledTimes(1);

    // Filtering by group
    fireEvent.change(input, { target: { value: 'Theme' } });
    expect(screen.getByText('Switch to Obsidian')).toBeInTheDocument();
    expect(screen.queryByText('Open Tokens')).toBeNull();

    // Unmatched query empty state + Enter/other keys are safely ignored
    fireEvent.change(input, { target: { value: 'zzznomatch' } });
    expect(screen.getByText(/No matching components or commands/)).toBeInTheDocument();
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.keyDown(input, { key: 'Tab' });

    vi.useRealTimers();
  });

  it('guards Enter during IME composition and supports Escape, ESC button, and backdrop dismissal', () => {
    const onClose = vi.fn();
    const items = makeItems();

    render(
      <PrismThemeProvider
        theme={{
          components: { CommandPalette: { className: 'theme-palette', style: { zIndex: 99 } } },
        }}
      >
        <CommandPalette open onClose={onClose} items={items} className="local-palette" />
      </PrismThemeProvider>
    );

    const dialog = screen.getByRole('dialog', { name: 'Command Palette' });
    expect(dialog).toHaveClass('refractor-command-palette', 'theme-palette', 'local-palette');
    expect(dialog).toHaveStyle({ zIndex: 99 });

    const input = screen.getByLabelText('Filter commands');
    const composingEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
      isComposing: true,
    });
    input.dispatchEvent(composingEvent);
    expect(items[0]?.onSelect).not.toHaveBeenCalled();

    // Clicking inside the slab must NOT close
    fireEvent.click(input);
    expect(onClose).not.toHaveBeenCalled();

    // Clicking ESC button closes
    fireEvent.click(screen.getByRole('button', { name: 'ESC' }));
    expect(onClose).toHaveBeenCalledTimes(1);

    // Pressing Escape on window closes
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);

    // Clicking backdrop closes
    fireEvent.click(dialog);
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it('handles empty items array and adversarial XSS labels safely', () => {
    const payload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';
    const { rerender } = render(<CommandPalette open onClose={vi.fn()} items={[]} />);
    expect(screen.getByText(/No matching components or commands/)).toBeInTheDocument();

    rerender(
      <CommandPalette
        open
        onClose={vi.fn()}
        items={[{ id: 'xss', label: payload, group: payload, onSelect: vi.fn() }]}
      />
    );
    expect(screen.getByRole('button', { name: new RegExp(payload.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) })).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
  });
});
