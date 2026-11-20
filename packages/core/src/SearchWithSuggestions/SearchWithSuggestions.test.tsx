import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { SearchWithSuggestions, type SearchSuggestion } from './SearchWithSuggestions';

const SUGGESTIONS: SearchSuggestion[] = [
  { id: '1', label: 'Alabaster Light', category: 'Theme' },
  { id: '2', label: 'Obsidian Dark', category: 'Theme' },
  { id: '3', label: 'Optical Blur' },
];

describe('SearchWithSuggestions', () => {
  it('filters suggestions on focus/input, selects via click or Enter, clears query, and forwards ref', () => {
    const ref = createRef<HTMLDivElement>();
    const onChange = vi.fn();
    const onSelectSuggestion = vi.fn();
    const onQuickAdd = vi.fn();

    render(
      <SearchWithSuggestions
        ref={ref}
        value="Alabaster"
        onChange={onChange}
        suggestions={SUGGESTIONS}
        onSelectSuggestion={onSelectSuggestion}
        onQuickAdd={onQuickAdd}
        placeholder="Find tokens"
        className="custom-search"
        xstyle={{ '--prism-blur-px': '14px' }}
        data-testid="search-root"
      />
    );

    const root = screen.getByTestId('search-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass('refractor-search-with-suggestions', 'custom-search');

    const input = screen.getByRole('combobox', { name: 'Search with suggestions' });
    fireEvent.focus(input);
    expect(root).toHaveAttribute('data-open', 'true');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByText('Theme')).toBeInTheDocument();
    expect(screen.queryByText('Obsidian Dark')).not.toBeInTheDocument();

    // Clicking option selects it and closes dropdown
    fireEvent.click(screen.getByRole('option', { name: /Alabaster Light/ }));
    expect(onSelectSuggestion).toHaveBeenCalledWith(SUGGESTIONS[0]);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    // Clear query button invokes onChange('')
    fireEvent.click(screen.getByRole('button', { name: 'Clear search query' }));
    expect(onChange).toHaveBeenCalledWith('');

    // Typing triggers onChange and opens dropdown
    fireEvent.change(input, { target: { value: 'Optical' } });
    expect(onChange).toHaveBeenCalledWith('Optical');

    // Quick add button invokes onQuickAdd with current query
    fireEvent.click(screen.getByRole('button', { name: 'Add search item' }));
    expect(onQuickAdd).toHaveBeenCalledWith('Alabaster');
  });

  it('supports keyboard Enter/Escape, IME composition guard, outside click, and theme overrides', () => {
    const onSelectSuggestion = vi.fn();
    const onQuickAdd = vi.fn();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            SearchWithSuggestions: { className: 'theme-search', style: { maxWidth: '420px' } },
          },
        }}
      >
        <div data-testid="outside">Outside</div>
        <SearchWithSuggestions
          value=""
          onChange={vi.fn()}
          suggestions={SUGGESTIONS}
          onSelectSuggestion={onSelectSuggestion}
          onQuickAdd={onQuickAdd}
          aria-label="Global token search"
          className="local-search"
          data-testid="themed-search"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('themed-search');
    expect(root).toHaveClass('refractor-search-with-suggestions', 'theme-search', 'local-search');
    expect(root).toHaveStyle({ maxWidth: '420px' });

    const input = screen.getByRole('combobox', { name: 'Global token search' });
    fireEvent.focus(input);
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    // IME composing Enter does NOT trigger selection
    const composingEnter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    Object.defineProperty(composingEnter, 'isComposing', { value: true });
    fireEvent(input, composingEnter);
    expect(onSelectSuggestion).not.toHaveBeenCalled();

    // Normal Enter selects first matching suggestion
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSelectSuggestion).toHaveBeenCalledWith(SUGGESTIONS[0]);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    // Enter when dropdown is closed triggers onQuickAdd
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onQuickAdd).toHaveBeenCalledWith('');

    // Reopen, click inside (remains open), Escape closes
    fireEvent.focus(input);
    fireEvent.mouseDown(root);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    // Reopen and mousedown outside closes
    fireEvent.focus(input);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('blocks interactions when disabled and handles empty suggestions safely (negative/adversarial)', () => {
    const onQuickAdd = vi.fn();
    render(
      <>
        <SearchWithSuggestions
          value="locked"
          onChange={vi.fn()}
          suggestions={SUGGESTIONS}
          onSelectSuggestion={vi.fn()}
          onQuickAdd={onQuickAdd}
          disabled
          ariaLabel="Disabled search"
          data-testid="disabled-search"
        />
        <SearchWithSuggestions
          value="none"
          onChange={vi.fn()}
          suggestions={[]}
          onSelectSuggestion={vi.fn()}
          ariaLabel="Empty search"
        />
      </>
    );

    const disabledRoot = screen.getByTestId('disabled-search');
    expect(disabledRoot).toHaveAttribute('data-disabled', 'true');
    const disabledInput = screen.getByRole('combobox', { name: 'Disabled search' });
    expect(disabledInput).toBeDisabled();
    fireEvent.focus(disabledInput);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(within(disabledRoot).queryByRole('button', { name: 'Clear search query' })).toBeNull();

    const disabledAddBtn = within(disabledRoot).getByRole('button', { name: 'Add search item' });
    expect(disabledAddBtn).toBeDisabled();
    fireEvent.click(disabledAddBtn);
    expect(onQuickAdd).not.toHaveBeenCalled();

    // Empty suggestions list never opens listbox
    const emptyInput = screen.getByRole('combobox', { name: 'Empty search' });
    fireEvent.focus(emptyInput);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('safely renders adversarial XSS strings in suggestions and categories', () => {
    const payload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';
    render(
      <SearchWithSuggestions
        value=""
        onChange={vi.fn()}
        suggestions={[{ id: 'xss', label: payload, category: payload }]}
        onSelectSuggestion={vi.fn()}
      />
    );
    fireEvent.focus(screen.getByRole('combobox'));
    expect(screen.getByRole('option')).toHaveTextContent(payload);
    expect(document.querySelector('script')).toBeNull();
  });
});
