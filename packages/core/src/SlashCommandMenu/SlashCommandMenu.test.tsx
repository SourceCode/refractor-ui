import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  DEFAULT_SLASH_COMMANDS,
  SlashCommandMenu,
  type SlashCommandGroup,
  type SlashCommandGroupMap,
  type SlashCommandOption,
} from './index';

describe('SlashCommandMenu', () => {
  it('renders prism-slab editor, immediately open viewport-clamped floating slash palette, all 8 grouped commands, React 19 ref, and theme overrides', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            SlashCommandMenu: {
              className: 'theme-slash-editor',
              style: { maxWidth: '640px' },
            },
          },
        }}
      >
        <SlashCommandMenu
          ref={ref}
          className="local-slash-editor"
          xstyle={{ '--prism-blur-px': '20px' }}
          style={{ padding: '20px' }}
          data-testid="slash-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('slash-root');
    const textarea = screen.getByRole('textbox', { name: 'Document editor' });
    const listbox = screen.getByRole('listbox', { name: 'Slash commands' });
    const feedback = screen.getByTestId('slash-command-feedback');

    expect(SlashCommandMenu.displayName).toBe('SlashCommandMenu');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'refractor-slash-command-menu',
      'prism-slab',
      'theme-slash-editor',
      'local-slash-editor'
    );
    expect(root).toHaveStyle({ maxWidth: '640px', padding: '20px' });
    expect(root).toHaveAttribute('role', 'region');
    expect(root).toHaveAttribute('aria-label', 'Document Editor with Slash Commands');
    expect(root).toHaveAttribute('data-menu-open', 'true');
    expect(screen.getByTestId('slash-command-title')).toHaveTextContent(
      'Document Editor with Slash Commands'
    );

    // Editor ARIA combobox wiring
    expect(textarea).toHaveAttribute('aria-expanded', 'true');
    expect(textarea).toHaveAttribute('aria-haspopup', 'listbox');
    expect(textarea).toHaveAttribute('aria-controls', listbox.id);
    expect(textarea).toHaveAttribute('aria-activedescendant');

    // Viewport-clamped floating prism-slab palette
    expect(listbox).toHaveClass('prism-slab', 'refractor-slash-command-menu__palette');
    expect(listbox.className).toContain('w-[min(22rem,calc(100vw-2rem))]');

    // All 4 semantic groups present with all 8 default commands
    expect(within(listbox).getByRole('group', { name: /Blocks/i })).toBeInTheDocument();
    expect(within(listbox).getByRole('group', { name: /Media/i })).toBeInTheDocument();
    expect(within(listbox).getByRole('group', { name: /Data/i })).toBeInTheDocument();
    expect(within(listbox).getByRole('group', { name: /AI/i })).toBeInTheDocument();

    const options = within(listbox).getAllByRole('option');
    expect(options).toHaveLength(8);
    expect(DEFAULT_SLASH_COMMANDS).toHaveLength(8);
    expect(screen.getByTestId('slash-match-count')).toHaveTextContent('8 commands');

    const expectedLabels = [
      'Heading 2',
      'Callout Admonition',
      'Checklist',
      'Code Block',
      'Optical Divider',
      'Embed Link',
      'Data Table',
      'AI Summary',
    ];
    for (const label of expectedLabels) {
      expect(within(listbox).getByText(label)).toBeInTheDocument();
    }

    // First option highlighted by default
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    expect(options[0]).toHaveAttribute('data-highlighted', 'true');

    // Polite feedback pill present
    expect(feedback).toHaveAttribute('aria-live', 'polite');
    expect(feedback).toHaveTextContent('Type / for commands');
  });

  it('opens on typing /, live-filters /tab and /call with literal <mark> highlights, and closes when / is removed', () => {
    render(<SlashCommandMenu defaultMenuOpen={false} data-testid="slash-root" />);

    const root = screen.getByTestId('slash-root');
    const textarea = screen.getByRole('textbox', { name: 'Document editor' });

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(textarea).toHaveAttribute('aria-expanded', 'false');

    // Typing `/` opens the palette showing all 8 commands
    fireEvent.change(textarea, { target: { value: '/', selectionStart: 1 } });
    expect(screen.getByRole('listbox', { name: 'Slash commands' })).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(8);
    expect(screen.getByTestId('slash-active-query-chip')).toHaveTextContent('/');

    // Live filter `/tab` matches Data Table and highlights literal match
    fireEvent.change(textarea, { target: { value: '/tab', selectionStart: 4 } });
    expect(root).toHaveAttribute('data-filtering', 'true');
    const tabOptions = screen.getAllByRole('option');
    expect(tabOptions).toHaveLength(1);
    expect(tabOptions[0]).toHaveAttribute('data-command-id', 'data-table');
    expect(screen.getByTestId('slash-match-count')).toHaveTextContent('1 command');
    const tabMarks = tabOptions[0]?.querySelectorAll('mark') ?? [];
    expect(tabMarks.length).toBeGreaterThan(0);
    expect(tabMarks[0]).toHaveTextContent(/tab/i);

    // Live filter `/call` matches Callout Admonition and highlights literal match
    fireEvent.change(textarea, { target: { value: '/call', selectionStart: 5 } });
    const callOptions = screen.getAllByRole('option');
    expect(callOptions).toHaveLength(1);
    expect(callOptions[0]).toHaveAttribute('data-command-id', 'callout-admonition');
    const callMarks = callOptions[0]?.querySelectorAll('mark') ?? [];
    expect(callMarks.length).toBeGreaterThan(0);
    expect(callMarks[0]).toHaveTextContent(/call/i);

    // Matching by description, group label, and keywords
    fireEvent.change(textarea, { target: { value: '/refractive', selectionStart: 11 } });
    expect(screen.getAllByRole('option')[0]).toHaveAttribute('data-command-id', 'optical-divider');

    fireEvent.change(textarea, { target: { value: '/blocks', selectionStart: 7 } });
    expect(screen.getAllByRole('option')).toHaveLength(5);

    fireEvent.change(textarea, { target: { value: '/tldr', selectionStart: 5 } });
    expect(screen.getAllByRole('option')[0]).toHaveAttribute('data-command-id', 'ai-summary');

    // Clearing `/` closes the palette cleanly
    fireEvent.change(textarea, { target: { value: 'Plain prose', selectionStart: 11 } });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('supports ArrowDown/ArrowUp circular navigation, IME-safe Enter insertion replacing /query cleanly, and Escape dismissal', () => {
    const onInsertCommand = vi.fn<(command: SlashCommandOption, nextDocumentText: string) => void>();

    render(
      <SlashCommandMenu
        defaultValue={'Architecture brief\n'}
        defaultMenuOpen={false}
        onInsertCommand={onInsertCommand}
      />
    );

    const textarea = screen.getByRole('textbox', { name: 'Document editor' }) as HTMLTextAreaElement;

    // Keys while menu is closed do not insert or hijack editing
    fireEvent.keyDown(textarea, { key: 'Enter' });
    expect(onInsertCommand).not.toHaveBeenCalled();

    // Trigger `/` on line 2 after newline
    fireEvent.change(textarea, {
      target: { value: 'Architecture brief\n/', selectionStart: 20 },
    });

    const initialOptions = screen.getAllByRole('option');
    expect(initialOptions[0]).toHaveAttribute('aria-selected', 'true');

    // ArrowUp from index 0 wraps to last option (AI Summary, index 7)
    fireEvent.keyDown(textarea, { key: 'ArrowUp' });
    expect(screen.getAllByRole('option')[7]).toHaveAttribute('aria-selected', 'true');

    // ArrowDown wraps back to index 0, then moves to index 1 (Callout Admonition)
    fireEvent.keyDown(textarea, { key: 'ArrowDown' });
    expect(screen.getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(textarea, { key: 'ArrowDown' });
    expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true');

    // Unrelated key does not alter highlight or close
    fireEvent.keyDown(textarea, { key: 'a' });
    expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true');

    // IME composition Enter MUST be ignored
    fireEvent.keyDown(textarea, { key: 'Enter', isComposing: true });
    expect(onInsertCommand).not.toHaveBeenCalled();
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    // Non-composing Enter inserts Callout Admonition, replacing `/` cleanly and closing menu
    fireEvent.keyDown(textarea, { key: 'Enter' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(onInsertCommand).toHaveBeenCalledTimes(1);

    const expectedTemplate = DEFAULT_SLASH_COMMANDS[1]?.insertTemplate ?? '';
    const expectedDoc = `Architecture brief\n${expectedTemplate}`;
    expect(onInsertCommand).toHaveBeenLastCalledWith(DEFAULT_SLASH_COMMANDS[1], expectedDoc);
    expect(textarea.value).toBe(expectedDoc);
    expect(screen.getByTestId('slash-command-feedback')).toHaveTextContent(
      'Inserted Callout Admonition'
    );

    // Mid-document `/tab` trigger with trailing text is cleanly replaced without losing surrounding text
    const midDoc = 'Intro /tab\nClosing note';
    fireEvent.change(textarea, { target: { value: midDoc, selectionStart: 10 } });
    const listbox = screen.getByRole('listbox');
    expect(listbox).toHaveAttribute('data-anchor-line', '1');
    expect(listbox).toHaveAttribute('data-anchor-col', '7');
    expect(listbox.style.marginLeft).toContain('min(42px');

    fireEvent.keyDown(textarea, { key: 'Enter' });
    const tableTemplate = DEFAULT_SLASH_COMMANDS[6]?.insertTemplate ?? '';
    expect(textarea.value).toBe(`Intro ${tableTemplate}\nClosing note`);
    expect(screen.getByTestId('slash-command-feedback')).toHaveTextContent('Inserted Data Table');

    // Escape closes open menu without altering editor text
    const withTrailingSlash = `${textarea.value}\n/code`;
    fireEvent.change(textarea, {
      target: { value: withTrailingSlash, selectionStart: withTrailingSlash.length },
    });
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    fireEvent.keyDown(textarea, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(textarea.value).toBe(withTrailingSlash);
  });

  it('supports pointer hover, click insertion without slash trigger, toggle button, and outside click dismissal', () => {
    const onInsertCommand = vi.fn<(command: SlashCommandOption, nextDocumentText: string) => void>();

    render(
      <div>
        <button type="button" data-testid="outside-btn">
          Outside
        </button>
        <SlashCommandMenu onInsertCommand={onInsertCommand} />
      </div>
    );

    const textarea = screen.getByRole('textbox', { name: 'Document editor' }) as HTMLTextAreaElement;
    const toggleBtn = screen.getByTestId('slash-command-toggle');

    // Hover highlights Embed Link (index 5)
    const embedOption = screen
      .getAllByRole('option')
      .find((el) => el.getAttribute('data-command-id') === 'embed-link');
    expect(embedOption).toBeDefined();
    if (embedOption) {
      fireEvent.mouseEnter(embedOption);
      expect(embedOption).toHaveAttribute('aria-selected', 'true');

      // mouseDown prevents default focus blur; click inserts command at cursor
      const mouseDownEvent = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
      embedOption.dispatchEvent(mouseDownEvent);
      expect(mouseDownEvent.defaultPrevented).toBe(true);

      fireEvent.click(embedOption);
    }

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(onInsertCommand).toHaveBeenCalledTimes(1);
    expect(textarea.value).toBe(DEFAULT_SLASH_COMMANDS[5]?.insertTemplate);
    expect(screen.getByTestId('slash-command-feedback')).toHaveTextContent('Inserted Embed Link');

    // Toggle button opens and closes palette
    fireEvent.click(toggleBtn);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');

    // Clicking inside does not dismiss via outside listener
    fireEvent.mouseDown(textarea);
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    // Clicking outside closes palette
    fireEvent.mouseDown(screen.getByTestId('outside-btn'));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');

    // Re-open and close via toggle button
    fireEvent.click(toggleBtn);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    fireEvent.click(toggleBtn);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('renders clean role="status" empty states for zero-match queries and empty commands list, and ignores Arrow/Enter on empty results', () => {
    const { unmount } = render(<SlashCommandMenu />);
    const textarea = screen.getByRole('textbox', { name: 'Document editor' });

    fireEvent.change(textarea, { target: { value: '/zzzz-nomatch', selectionStart: 13 } });
    const emptyStatus = screen.getByRole('status');
    expect(emptyStatus).toHaveTextContent('No commands matching "/zzzz-nomatch"');
    expect(screen.getByTestId('slash-match-count')).toHaveTextContent('0 commands');

    // ArrowDown and Enter do not crash when 0 commands match; Escape still dismisses
    fireEvent.keyDown(textarea, { key: 'ArrowDown' });
    fireEvent.keyDown(textarea, { key: 'Enter' });
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    // Fresh mount with empty commands array renders empty-commands status state
    unmount();
    render(<SlashCommandMenu commands={[]} />);
    expect(screen.getByRole('status')).toHaveTextContent('No slash commands available');
  });

  it('renders custom commands across all 4 groups, matches by shortcut, deduplicates duplicate IDs, and defends against adversarial queries & non-trigger slashes', () => {
    const customCommands: SlashCommandOption[] = [
      {
        id: 'custom-block',
        label: 'Quote Block',
        description: 'Insert a clean pull quote',
        group: 'blocks',
        insertTemplate: '> Pull quote\n',
        shortcut: '⌘Q',
      },
      {
        id: 'custom-block',
        label: 'Media Frame',
        description: 'Embed interactive diagram',
        group: 'media',
        insertTemplate: '![Diagram](https://example.com/diagram.png)\n',
      },
      {
        id: 'custom-sheet',
        label: 'Pivot Grid',
        description: 'Insert structured matrix',
        group: 'data',
        insertTemplate: '| Metric | Value |\n',
      },
      {
        id: 'custom-ai',
        label: 'AI Rewrite',
        description: 'Polish prose clarity',
        group: 'ai',
        insertTemplate: '<!-- AI Rewrite -->\n',
      },
    ];

    render(<SlashCommandMenu title="Custom Knowledge Editor" commands={customCommands} />);

    const textarea = screen.getByRole('textbox', { name: 'Document editor' });
    expect(screen.getByTestId('slash-command-title')).toHaveTextContent('Custom Knowledge Editor');
    expect(screen.getAllByRole('option')).toHaveLength(4);

    // Filter by shortcut token only (`⌘Q`)
    fireEvent.change(textarea, { target: { value: '/⌘Q', selectionStart: 3 } });
    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(screen.getAllByRole('option')[0]).toHaveTextContent('Quote Block');

    // Adversarial regex metacharacters + XSS payload stay safe literal text
    const xssQuery = '/(.*)+[a-z<script>alert(1)</script>';
    fireEvent.change(textarea, { target: { value: xssQuery, selectionStart: xssQuery.length } });
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent(`No commands matching "${xssQuery}"`);
    expect(document.querySelector('script')).toBeNull();

    // Non-trigger slashes must NOT open the palette:
    // 1. URLs with slashes preceded by non-whitespace
    fireEvent.change(textarea, {
      target: { value: 'https://example.com/docs', selectionStart: 24 },
    });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    // 2. Slash followed immediately by space (`/ `)
    fireEvent.change(textarea, { target: { value: '/ ', selectionStart: 2 } });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    // 3. Slash followed by newline (`/tab\nnext`)
    fireEvent.change(textarea, { target: { value: '/tab\nnext', selectionStart: 9 } });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    // 4. Overly long slash query (> 40 chars)
    const longQuery = `/${'x'.repeat(45)}`;
    fireEvent.change(textarea, { target: { value: longQuery, selectionStart: longQuery.length } });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    // Verify SlashCommandGroupMap extensible map keys align with SlashCommandGroup
    const groupCheck: Record<keyof SlashCommandGroupMap, SlashCommandGroup> = {
      blocks: 'blocks',
      media: 'media',
      data: 'data',
      ai: 'ai',
    };
    expect(Object.keys(groupCheck)).toHaveLength(4);
  });
});
