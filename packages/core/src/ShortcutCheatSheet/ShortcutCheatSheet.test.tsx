import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  DEFAULT_SHORTCUT_GROUPS,
  ShortcutCheatSheet,
  type ShortcutCategoryGroup,
} from './index';

describe('ShortcutCheatSheet', () => {
  it('renders closed modal trigger by default, opens dialog with 3 default groups, supports Escape/backdrop/Close dismissal, and applies ref and theme overrides', () => {
    const ref = createRef<HTMLDivElement>();
    const onOpenChange = vi.fn();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            ShortcutCheatSheet: {
              className: 'theme-cheat-sheet',
              style: { opacity: '0.98' },
            },
          },
        }}
      >
        <ShortcutCheatSheet
          ref={ref}
          onOpenChange={onOpenChange}
          className="local-cheat-sheet"
          xstyle={{ '--prism-blur-px': '14px' }}
          data-testid="shortcut-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('shortcut-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'refractor-shortcut-cheat-sheet',
      'theme-cheat-sheet',
      'local-cheat-sheet'
    );
    expect(root).toHaveAttribute('data-mode', 'modal');
    expect(root).not.toHaveAttribute('data-open');
    expect(root).toHaveStyle({ opacity: '0.98' });

    // Closed by default: no dialog, Escape while closed is ignored
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onOpenChange).not.toHaveBeenCalled();

    // Crystal trigger button
    const trigger = screen.getByRole('button', { name: /Shortcuts/i });
    expect(trigger).toHaveClass('prism-crystal', 'refractor-shortcut-cheat-sheet__trigger');
    expect(trigger).toHaveTextContent('Shortcuts · ?');
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    // Open via trigger click
    fireEvent.click(trigger);
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(root).toHaveAttribute('data-open', 'true');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    const dialog = screen.getByRole('dialog', { name: 'Keyboard Shortcuts' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveClass('prism-slab', 'refractor-shortcut-cheat-sheet__panel');
    expect(document.activeElement).toBe(dialog);

    // Default 3 categorized groups rendered in 2-column grid
    expect(DEFAULT_SHORTCUT_GROUPS).toHaveLength(3);
    expect(screen.getByRole('region', { name: 'Navigation' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Editing & Canvas' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Playback & View' })).toBeInTheDocument();

    const grid = dialog.querySelector('.refractor-shortcut-cheat-sheet__grid');
    expect(grid).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'gap-4');

    // Tactile embossed optical <kbd> keycaps
    const kbds = dialog.querySelectorAll('kbd');
    expect(kbds.length).toBeGreaterThanOrEqual(12);
    expect(kbds[0]).toHaveClass('prism-crystal', 'refractor-shortcut-cheat-sheet__keycap');

    // Clicking inside the dialog slab does NOT dismiss
    fireEvent.click(dialog);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Composing Escape MUST NOT dismiss modal
    const composingEsc = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
      isComposing: true,
    });
    window.dispatchEvent(composingEsc);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Close via Close button restores focus to trigger
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(trigger);

    // Reopen and dismiss via backdrop click
    fireEvent.click(trigger);
    const backdrop = root.querySelector('[data-part="backdrop"]');
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop as HTMLElement);
    expect(screen.queryByRole('dialog')).toBeNull();

    // Reopen and dismiss via Escape key
    fireEvent.click(trigger);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('toggles modal with ? hotkey outside editable inputs and ignores editable targets, modifiers, IME composition, or disabled hotkey', () => {
    const { rerender } = render(
      <div>
        <input aria-label="External text input" />
        <textarea aria-label="External textarea" />
        <select aria-label="External select">
          <option value="a">A</option>
        </select>
        <div data-testid="editable-div" contentEditable="true" suppressContentEditableWarning>
          <span data-testid="editable-child">Editable span</span>
        </div>
        <div
          data-testid="non-editable-div"
          contentEditable="false"
          suppressContentEditableWarning
        >
          Static text
        </div>
        <ShortcutCheatSheet />
      </div>
    );

    // Ignored when fired inside <input>, <textarea>, <select>, or contentEditable
    fireEvent.keyDown(screen.getByLabelText('External text input'), { key: '?' });
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.keyDown(screen.getByLabelText('External textarea'), { key: '?' });
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.keyDown(screen.getByLabelText('External select'), { key: '?' });
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.keyDown(screen.getByTestId('editable-div'), { key: '?' });
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.keyDown(screen.getByTestId('editable-child'), { key: '?' });
    expect(screen.queryByRole('dialog')).toBeNull();

    // Ignored when document.activeElement is an <input> even if dispatched on window
    const extInput = screen.getByLabelText('External text input');
    extInput.focus();
    fireEvent.keyDown(window, { key: '?' });
    expect(screen.queryByRole('dialog')).toBeNull();
    extInput.blur();

    // Ignored when target has isContentEditable = true
    const simulatedEditable = document.createElement('div');
    Object.defineProperty(simulatedEditable, 'isContentEditable', { value: true });
    document.body.appendChild(simulatedEditable);
    fireEvent.keyDown(simulatedEditable, { key: '?' });
    expect(screen.queryByRole('dialog')).toBeNull();
    document.body.removeChild(simulatedEditable);

    // Ignored when IME is composing or modifier keys are held
    const composingQuestion = new KeyboardEvent('keydown', {
      key: '?',
      bubbles: true,
      cancelable: true,
      isComposing: true,
    });
    window.dispatchEvent(composingQuestion);
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.keyDown(window, { key: '?', ctrlKey: true });
    fireEvent.keyDown(window, { key: '?', metaKey: true });
    fireEvent.keyDown(window, { key: '?', altKey: true });
    expect(screen.queryByRole('dialog')).toBeNull();

    // contentEditable="false" is NOT editable -> ? opens modal!
    fireEvent.keyDown(screen.getByTestId('non-editable-div'), { key: '?' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Typing ? inside modal search input must NOT toggle modal closed
    const searchInput = screen.getByLabelText('Filter keyboard shortcuts');
    searchInput.focus();
    fireEvent.keyDown(searchInput, { key: '?' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Blurring search input and pressing ? on window toggles modal closed
    searchInput.blur();
    fireEvent.keyDown(window, { key: '?' });
    expect(screen.queryByRole('dialog')).toBeNull();

    // Disabling enableQuestionMarkHotkey blocks ? opening and updates footer hint
    rerender(<ShortcutCheatSheet enableQuestionMarkHotkey={false} defaultOpen={false} />);
    fireEvent.keyDown(window, { key: '?' });
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Shortcuts/i }));
    expect(screen.getByText('Press Esc to close')).toBeInTheDocument();
  });

  it('supports controlled open/onOpenChange and dynamic modal-to-inline mode transitions', () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <ShortcutCheatSheet open={false} onOpenChange={onOpenChange} title="Studio Keys" />
    );

    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Shortcuts/i }));
    expect(onOpenChange).toHaveBeenCalledWith(true);
    // Still controlled as false
    expect(screen.queryByRole('dialog')).toBeNull();

    rerender(<ShortcutCheatSheet open onOpenChange={onOpenChange} title="Studio Keys" />);
    expect(screen.getByRole('dialog', { name: 'Studio Keys' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);

    // Transition to inline mode
    rerender(<ShortcutCheatSheet mode="inline" title="Studio Keys" />);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('region', { name: 'Studio Keys' })).toHaveAttribute(
      'data-mode',
      'inline'
    );
  });

  it('renders inline mode directly and filters across group titles, shortcut labels, descriptions, and key tokens with empty search status', () => {
    const ref = createRef<HTMLDivElement>();
    render(<ShortcutCheatSheet ref={ref} mode="inline" data-testid="inline-sheet" />);

    const region = screen.getByTestId('inline-sheet');
    expect(ref.current).toBe(region);
    expect(region).toHaveAttribute('role', 'region');
    expect(region).toHaveAttribute('data-mode', 'inline');
    expect(region).toHaveAttribute('data-open', 'true');
    expect(region).toHaveClass('prism-slab', 'refractor-shortcut-cheat-sheet');
    expect(screen.queryByRole('button', { name: /Shortcuts/i })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
    expect(screen.getByText('12 total')).toBeInTheDocument();

    const searchInput = screen.getByLabelText('Filter keyboard shortcuts');
    expect(searchInput).toHaveAttribute('type', 'search');

    // Filter by category title
    fireEvent.change(searchInput, { target: { value: 'Navigation' } });
    expect(screen.getByRole('region', { name: 'Navigation' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Editing & Canvas' })).toBeNull();
    expect(screen.getByText('Showing 4 of 12')).toBeInTheDocument();

    // Filter by shortcut label (singular count phrasing)
    fireEvent.change(searchInput, { target: { value: 'Undo Last' } });
    expect(screen.getByText('1 shortcut across 1 category')).toBeInTheDocument();
    expect(screen.getByText('Undo Last Action')).toBeInTheDocument();

    // Filter by description
    fireEvent.change(searchInput, { target: { value: 'artboard' } });
    expect(screen.getByText('Zoom to Fit Canvas')).toBeInTheDocument();

    // Filter by key token and joined chord
    fireEvent.change(searchInput, { target: { value: 'Space' } });
    expect(screen.getByText('Play / Pause Timeline')).toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: '⌘+K' } });
    expect(screen.getByText('Open Command Palette')).toBeInTheDocument();

    // Clear button inside search well clears query
    fireEvent.click(screen.getByRole('button', { name: 'Clear search filter' }));
    expect(searchInput).toHaveValue('');
    expect(screen.getByText('12 total')).toBeInTheDocument();

    // Escape in inline mode clears active search query
    fireEvent.change(searchInput, { target: { value: 'Zoom' } });
    fireEvent.keyDown(searchInput, { key: 'Escape' });
    expect(searchInput).toHaveValue('');

    // Unmatched query shows role="status" empty search state with Clear search button
    fireEvent.change(searchInput, { target: { value: 'zzzz-unmatched' } });
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('No shortcuts matching "zzzz-unmatched"');
    fireEvent.click(within(status).getByRole('button', { name: 'Clear search' }));
    expect(searchInput).toHaveValue('');
    expect(screen.queryByRole('status')).toBeNull();

    // Pressing Enter without onSelectShortcut safely does nothing
    fireEvent.keyDown(searchInput, { key: 'Enter' });
  });

  it('invokes onSelectShortcut via click and IME-safe Enter in search input', () => {
    const onSelectShortcut = vi.fn();
    render(<ShortcutCheatSheet mode="inline" onSelectShortcut={onSelectShortcut} />);

    // Click shortcut row button
    fireEvent.click(screen.getByRole('button', { name: /Duplicate Selection/i }));
    expect(onSelectShortcut).toHaveBeenCalledTimes(1);
    expect(onSelectShortcut).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'edit-duplicate', label: 'Duplicate Selection' })
    );

    // Filter and press Enter -> selects first visible shortcut
    const searchInput = screen.getByLabelText('Filter keyboard shortcuts');
    fireEvent.change(searchInput, { target: { value: 'Focus Mode' } });

    // Composing Enter MUST NOT fire onSelectShortcut
    const composingEnter = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(composingEnter, 'isComposing', { value: true });
    fireEvent(searchInput, composingEnter);
    expect(onSelectShortcut).toHaveBeenCalledTimes(1);

    // Regular Enter fires onSelectShortcut
    fireEvent.keyDown(searchInput, { key: 'Enter' });
    expect(onSelectShortcut).toHaveBeenCalledTimes(2);
    expect(onSelectShortcut).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'view-focus-mode', label: 'Toggle Focus Mode' })
    );

    // Unmatched query -> Enter does nothing
    fireEvent.change(searchInput, { target: { value: 'no-match-here' } });
    fireEvent.keyDown(searchInput, { key: 'Enter' });
    expect(onSelectShortcut).toHaveBeenCalledTimes(2);
  });

  it('handles empty groups, blank title fallback, duplicate IDs/keys, blank keys, regex queries, prototype keys, and adversarial XSS safely', () => {
    const { rerender } = render(
      <ShortcutCheatSheet
        mode="inline"
        title="   "
        groups={[{ id: 'empty-group', title: 'Empty', shortcuts: [] }]}
      />
    );

    expect(screen.getByRole('heading', { name: 'Keyboard Shortcuts' })).toBeInTheDocument();
    const emptyStatus = screen.getByRole('status');
    expect(emptyStatus).toHaveTextContent('No keyboard shortcuts configured.');
    expect(screen.queryByRole('button', { name: 'Clear search' })).toBeNull();

    const regexPattern = '[a-z]+(foo).*';
    const xssPayload = '<script>window.__shortcutXss=1</script><img src=x onerror=alert(1)>';
    const adversarialGroups: ShortcutCategoryGroup[] = [
      {
        id: '__proto__',
        title: '__proto__',
        shortcuts: [
          {
            id: 'dup-id',
            label: `Regex ${regexPattern} command`,
            keys: ['g', 'g', '', '  '],
          },
          {
            id: 'dup-id',
            label: xssPayload,
            keys: ['   '],
            description: xssPayload,
          },
        ],
      },
      {
        id: '__proto__',
        title: 'constructor',
        shortcuts: [
          {
            id: 'proto-shortcut',
            label: 'Prototype Safe Action',
            keys: ['prototype', 'constructor'],
          },
        ],
      },
    ];

    rerender(<ShortcutCheatSheet mode="inline" groups={adversarialGroups} />);

    // Zero script/img injection and Object.prototype untouched
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(({} as Record<string, string>).polluted).toBeUndefined();

    // Duplicate keycaps rendered with '+' joiner and blank keys filtered out
    const kbds = screen.getAllByText('g');
    expect(kbds).toHaveLength(2);
    expect(screen.getAllByText(xssPayload)).toHaveLength(2);

    // Regex metacharacters matched literally without throwing
    const searchInput = screen.getByLabelText('Filter keyboard shortcuts');
    fireEvent.change(searchInput, { target: { value: regexPattern } });
    expect(screen.getByText(`Regex ${regexPattern} command`)).toBeInTheDocument();
    expect(screen.queryByText('Prototype Safe Action')).toBeNull();
  });
});
