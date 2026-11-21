import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { GlobalSearchModal, type GlobalSearchItem } from './GlobalSearchModal';

const SEARCH_ITEMS: GlobalSearchItem[] = [
  {
    id: 'comp-1',
    title: 'PrimaryButton',
    subtitle: 'High-emphasis refractive capsule CTA',
    type: 'Components',
    shortcut: '⌘1',
    meta: 'Core',
  },
  {
    id: 'file-1',
    title: 'refractor.css',
    subtitle: 'Optical refraction physics tokens',
    type: 'Files',
    meta: 'packages/core',
  },
  {
    id: 'comp-2',
    title: 'MultiSelectCombobox',
    subtitle: 'Token input with emerald pills',
    type: 'Components',
    shortcut: '⌘2',
  },
  {
    id: 'person-1',
    title: 'Ada Lovelace',
    subtitle: 'Design Systems Architect',
    type: 'People',
    meta: 'Online',
  },
];

describe('GlobalSearchModal', () => {
  it('returns null when closed and ignores Escape while closed (negative test)', () => {
    const onClose = vi.fn();
    const { container } = render(
      <GlobalSearchModal
        open={false}
        onClose={onClose}
        items={SEARCH_ITEMS}
        onSelectItem={vi.fn()}
      />
    );

    expect(container.firstChild).toBeNull();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('renders dialog semantics, grouped sections, category tabs with counts, recent query quick-fill, literal highlights, and ref/className passthrough', () => {
    vi.useFakeTimers();
    const ref = createRef<HTMLDivElement>();
    const onClose = vi.fn();
    const onSelectItem = vi.fn();

    render(
      <GlobalSearchModal
        ref={ref}
        open
        onClose={onClose}
        items={SEARCH_ITEMS}
        onSelectItem={onSelectItem}
        recentQueries={['PrimaryButton', '  ', 'PrimaryButton', 'Tokens']}
        className="custom-global-search"
        xstyle={{ '--prism-slab-blur-px': '20px' }}
        data-testid="global-search"
      />
    );

    vi.advanceTimersByTime(25);

    const dialog = screen.getByTestId('global-search');
    const input = screen.getByLabelText('Global search query');
    expect(ref.current).toBe(dialog);
    expect(dialog).toHaveAttribute('role', 'dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-label', 'Global Search');
    expect(dialog).toHaveClass('refractor-global-search-modal', 'custom-global-search');
    expect(dialog).toHaveAttribute('data-open', 'true');
    expect(document.activeElement).toBe(input);

    // Category filter tabs reflect dynamic item.type counts
    const tablist = screen.getByRole('tablist', { name: 'Filter results by category' });
    expect(within(tablist).getByRole('tab', { name: /All\s*4/ })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(within(tablist).getByRole('tab', { name: /Components\s*2/ })).toBeInTheDocument();
    expect(within(tablist).getByRole('tab', { name: /Files\s*1/ })).toBeInTheDocument();
    expect(within(tablist).getByRole('tab', { name: /People\s*1/ })).toBeInTheDocument();

    // Footer legend and count
    expect(screen.getByText('↑↓ Navigate · ↵ Open · Esc Close')).toBeInTheDocument();
    expect(screen.getByText('4 results')).toBeInTheDocument();

    // Deduplicated recent query chips appear while query is empty
    const recentBtn = screen.getByRole('button', { name: 'Tokens' });
    expect(screen.getByRole('button', { name: 'PrimaryButton' })).toBeInTheDocument();
    fireEvent.click(recentBtn);
    expect(input).toHaveValue('Tokens');
    // Recent bar hides once query is non-empty
    expect(screen.queryByText('Recent')).not.toBeInTheDocument();

    // Literal match highlighting uses <mark> elements
    const marks = dialog.querySelectorAll('mark');
    expect(marks.length).toBeGreaterThan(0);
    expect(marks[0]?.textContent?.toLowerCase()).toBe('tokens');
    expect(screen.getByText('1 result')).toBeInTheDocument();

    // Clear query button resets search and restores recent chips
    fireEvent.click(screen.getByRole('button', { name: 'Clear search query' }));
    expect(input).toHaveValue('');
    expect(screen.getByText('Recent')).toBeInTheDocument();

    // Switch category tab to Components
    fireEvent.click(within(tablist).getByRole('tab', { name: /Components\s*2/ }));
    expect(screen.getByText('2 results')).toBeInTheDocument();
    expect(screen.queryByText('refractor.css')).not.toBeInTheDocument();

    // Switch back to All
    fireEvent.click(within(tablist).getByRole('tab', { name: /All\s*4/ }));
    expect(screen.getByText('4 results')).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('cycles flattened grouped items with ArrowDown/ArrowUp, enforces IME-safe Enter, and supports click/Escape/backdrop dismissal', () => {
    const onClose = vi.fn();
    const onSelectItem = vi.fn();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            GlobalSearchModal: { className: 'theme-global-search', style: { zIndex: 88 } },
          },
        }}
      >
        <GlobalSearchModal
          open
          onClose={onClose}
          items={SEARCH_ITEMS}
          onSelectItem={onSelectItem}
          className="local-global-search"
        />
      </PrismThemeProvider>
    );

    const dialog = screen.getByRole('dialog', { name: 'Global Search' });
    expect(dialog).toHaveClass(
      'refractor-global-search-modal',
      'theme-global-search',
      'local-global-search'
    );
    expect(dialog).toHaveStyle({ zIndex: 88 });

    const input = screen.getByLabelText('Global search query');

    // Grouped order: Components (comp-1, comp-2), Files (file-1), People (person-1)
    // ArrowDown -> comp-2, ArrowDown -> file-1, ArrowUp -> comp-2
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowUp' });

    // IME composing Enter MUST NOT trigger selection
    const composingEnter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    Object.defineProperty(composingEnter, 'isComposing', { value: true });
    fireEvent(input, composingEnter);
    expect(onSelectItem).not.toHaveBeenCalled();

    // Normal Enter selects active item (comp-2) and closes
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSelectItem).toHaveBeenCalledWith(SEARCH_ITEMS[2]);
    expect(onClose).toHaveBeenCalledTimes(1);

    // Mouse enter highlights and click selects
    const personBtn = screen.getByRole('button', { name: /Ada Lovelace/ });
    fireEvent.mouseEnter(personBtn);
    expect(personBtn).toHaveAttribute('data-highlighted', 'true');
    fireEvent.click(personBtn);
    expect(onSelectItem).toHaveBeenCalledWith(SEARCH_ITEMS[3]);
    expect(onClose).toHaveBeenCalledTimes(2);

    // Clicking inside modal slab does NOT dismiss
    fireEvent.click(input);
    expect(onClose).toHaveBeenCalledTimes(2);

    // Clicking ESC button dismisses
    fireEvent.click(screen.getByRole('button', { name: 'ESC' }));
    expect(onClose).toHaveBeenCalledTimes(3);

    // Pressing Escape dismisses
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(4);

    // Clicking backdrop dismisses
    fireEvent.click(dialog);
    expect(onClose).toHaveBeenCalledTimes(5);
  });

  it('handles empty items, custom emptyMessage, unmatched queries, and dynamic item removal cleanly', () => {
    const onSelectItem = vi.fn();
    const { rerender } = render(
      <GlobalSearchModal
        open
        onClose={vi.fn()}
        items={[]}
        onSelectItem={onSelectItem}
        emptyMessage="Nothing indexed yet."
      />
    );

    expect(screen.getByText('Nothing indexed yet.')).toBeInTheDocument();
    const input = screen.getByLabelText('Global search query');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSelectItem).not.toHaveBeenCalled();

    // Default empty states (empty array vs unmatched query)
    rerender(<GlobalSearchModal open onClose={vi.fn()} items={[]} onSelectItem={onSelectItem} />);
    expect(screen.getByText('No searchable items available.')).toBeInTheDocument();

    rerender(
      <GlobalSearchModal open onClose={vi.fn()} items={SEARCH_ITEMS} onSelectItem={onSelectItem} />
    );
    fireEvent.click(screen.getByRole('tab', { name: /People/ }));
    // Rerender without People category -> safely falls back to All
    rerender(
      <GlobalSearchModal
        open
        onClose={vi.fn()}
        items={[SEARCH_ITEMS[0] as GlobalSearchItem]}
        onSelectItem={onSelectItem}
      />
    );
    expect(screen.getByText('PrimaryButton')).toBeInTheDocument();

    // Unmatched search query
    fireEvent.change(input, { target: { value: 'zzzz-unmatched' } });
    expect(screen.getByText('No results matching "zzzz-unmatched"')).toBeInTheDocument();

    // Match by meta and type
    fireEvent.change(input, { target: { value: 'Core' } });
    expect(screen.getByText('PrimaryButton')).toBeInTheDocument();
    fireEvent.change(input, { target: { value: 'Components' } });
    expect(screen.getByText('PrimaryButton')).toBeInTheDocument();
  });

  it('handles regex metacharacters, prototype-pollution types, and XSS payloads safely (adversarial)', () => {
    const regexQuery = '[a-z]+(foo).*';
    const xssPayload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';

    const adversarialItems: GlobalSearchItem[] = [
      {
        id: 'regex-item',
        title: `Pattern ${regexQuery} matcher`,
        subtitle: `Literal ${regexQuery} check`,
        type: '__proto__',
      },
      {
        id: 'ctor-item',
        title: xssPayload,
        subtitle: xssPayload,
        type: 'constructor',
      },
      {
        id: 'proto-item',
        title: 'Safe Entry',
        type: 'prototype',
      },
    ];

    render(
      <GlobalSearchModal
        open
        onClose={vi.fn()}
        items={adversarialItems}
        onSelectItem={vi.fn()}
      />
    );

    const dialog = screen.getByRole('dialog');
    const input = screen.getByLabelText('Global search query');

    // No scripts injected & Object.prototype untouched
    expect(document.querySelector('script')).toBeNull();
    expect(({} as Record<string, string>).polluted).toBeUndefined();
    expect(screen.getByRole('tab', { name: /__proto__/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /constructor/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /prototype/ })).toBeInTheDocument();

    // Regex metacharacters matched literally without throwing or ReDoS
    fireEvent.change(input, { target: { value: regexQuery } });
    const marks = dialog.querySelectorAll('mark');
    expect(marks.length).toBe(2);
    expect(marks[0]?.textContent).toBe(regexQuery);
    expect(marks[1]?.textContent).toBe(regexQuery);
    expect(screen.getByText('1 result')).toBeInTheDocument();
  });
});
