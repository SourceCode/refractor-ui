import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  DEFAULT_EDITABLE_PATH,
  DEFAULT_EDITABLE_PATH_SUGGESTIONS,
  EditablePathBar,
  normalizeEditablePath,
  type EditablePathSuggestion,
  type EditablePathSuggestionKindMap,
} from './index';

function dispatchKeyDownWithComposition(
  target: HTMLElement,
  init: KeyboardEventInit & { isComposing: boolean }
): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    ...init,
  });
  Object.defineProperty(event, 'isComposing', { value: init.isComposing });
  target.dispatchEvent(event);
  return event;
}

describe('normalizeEditablePath', () => {
  it('normalizes repeated slashes, backslashes, dot segments, traversal above root, missing leading slash, and empty inputs in linear time', () => {
    expect(normalizeEditablePath('')).toBe('/');
    expect(normalizeEditablePath('   ')).toBe('/');
    expect(normalizeEditablePath('/')).toBe('/');
    expect(normalizeEditablePath('////')).toBe('/');
    expect(normalizeEditablePath('\\\\\\')).toBe('/');
    expect(normalizeEditablePath('Users/clara/Projects')).toBe('/Users/clara/Projects');
    expect(normalizeEditablePath('///Users////clara//Projects///')).toBe(
      '/Users/clara/Projects'
    );
    expect(normalizeEditablePath('\\Users\\clara\\Documents\\DesignSpecs')).toBe(
      '/Users/clara/Documents/DesignSpecs'
    );
    expect(normalizeEditablePath('/Users/clara/./Projects/../Downloads')).toBe(
      '/Users/clara/Downloads'
    );
    expect(normalizeEditablePath('/../../../../etc/passwd')).toBe('/etc/passwd');
    expect(normalizeEditablePath('/a/b/../../..')).toBe('/');
    expect(normalizeEditablePath('.')).toBe('/');
    expect(normalizeEditablePath('..')).toBe('/');

    // Adversarial long repeated-slash input stays strictly linear-time
    const adversarial = `${'/'.repeat(10000)}Users${'\\'.repeat(10000)}clara`;
    expect(normalizeEditablePath(adversarial)).toBe('/Users/clara');
  });
});

describe('EditablePathBar', () => {
  it('renders Astryx contracts, default path breadcrumbs, theme overrides, xstyle, and React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();
    const kindMap: EditablePathSuggestionKindMap = {
      folder: true,
      mount: true,
      recent: true,
    };
    expect(Object.values(kindMap).every(Boolean)).toBe(true);
    expect(DEFAULT_EDITABLE_PATH).toBe('/Users/clara/Projects/refractor-ui/packages/core');
    expect(DEFAULT_EDITABLE_PATH_SUGGESTIONS).toHaveLength(5);

    render(
      <PrismThemeProvider
        theme={{
          components: {
            EditablePathBar: {
              className: 'theme-path-bar',
              style: { maxWidth: '840px' },
            },
          },
        }}
      >
        <EditablePathBar
          ref={ref}
          className="local-path-bar"
          xstyle={{ '--prism-blur-px': '20px' }}
          style={{ marginTop: '6px' }}
          data-testid="path-bar-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('path-bar-root');
    expect(ref.current).toBe(root);
    expect(EditablePathBar.displayName).toBe('EditablePathBar');
    expect(root).toHaveAttribute('role', 'region');
    expect(root).toHaveAttribute('aria-label', 'Directory path navigation');
    expect(root).toHaveClass(
      'refractor-editable-path-bar',
      'prism-slab',
      'min-w-0',
      'max-w-full',
      'theme-path-bar',
      'local-path-bar'
    );
    expect(root).toHaveAttribute('data-mode', 'breadcrumb');
    expect(root).toHaveAttribute('data-can-go-up', 'true');
    expect(root).toHaveAttribute('data-depth', '6');
    expect(root).not.toHaveAttribute('data-can-go-back');
    expect(root).not.toHaveAttribute('data-can-go-forward');
    expect(root).not.toHaveAttribute('data-disabled');
    expect(root).toHaveStyle({ maxWidth: '840px', marginTop: '6px' });

    const toolbar = screen.getByRole('toolbar', { name: 'Path navigation controls' });
    expect(toolbar).toHaveClass('flex-wrap', 'min-w-0');

    expect(screen.getByRole('button', { name: 'Go back' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Go forward' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Go up one folder' })).toBeEnabled();

    expect(screen.getByRole('button', { name: 'Root directory /' })).toBeInTheDocument();
    for (const seg of ['Users', 'clara', 'Projects', 'refractor-ui', 'packages', 'core']) {
      expect(screen.getByRole('button', { name: seg })).toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: 'core' })).toHaveAttribute(
      'aria-current',
      'location'
    );

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent(
      'Current path /Users/clara/Projects/refractor-ui/packages/core'
    );
  });

  it('navigates via breadcrumbs, root button, and Back/Forward/Up history controls', () => {
    const onNavigate = vi.fn<(nextPath: string) => void>();
    render(<EditablePathBar onNavigate={onNavigate} />);

    const backBtn = screen.getByRole('button', { name: 'Go back' });
    const forwardBtn = screen.getByRole('button', { name: 'Go forward' });
    const upBtn = screen.getByRole('button', { name: 'Go up one folder' });

    // Click ancestor folder breadcrumb segment
    fireEvent.click(screen.getByRole('button', { name: 'Projects' }));
    expect(onNavigate).toHaveBeenLastCalledWith('/Users/clara/Projects');
    expect(screen.getByRole('button', { name: 'Projects' })).toHaveAttribute(
      'aria-current',
      'location'
    );
    expect(screen.queryByRole('button', { name: 'core' })).toBeNull();
    expect(backBtn).toBeEnabled();
    expect(forwardBtn).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Navigated to /Users/clara/Projects');

    // Clicking the current segment does not duplicate history or re-fire onNavigate
    fireEvent.click(screen.getByRole('button', { name: 'Projects' }));
    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status')).toHaveTextContent('Current path /Users/clara/Projects');

    // Step Up repeatedly to root '/'
    fireEvent.click(upBtn);
    expect(onNavigate).toHaveBeenLastCalledWith('/Users/clara');
    expect(screen.getByRole('status')).toHaveTextContent('Navigated up to /Users/clara');

    fireEvent.click(upBtn);
    expect(onNavigate).toHaveBeenLastCalledWith('/Users');

    fireEvent.click(upBtn);
    expect(onNavigate).toHaveBeenLastCalledWith('/');
    expect(upBtn).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Root directory /' })).toHaveAttribute(
      'aria-current',
      'location'
    );

    // Traverse Back through history stack
    fireEvent.click(backBtn);
    expect(onNavigate).toHaveBeenLastCalledWith('/Users');
    expect(forwardBtn).toBeEnabled();
    expect(upBtn).toBeEnabled();
    expect(screen.getByRole('status')).toHaveTextContent('Navigated back to /Users');

    fireEvent.click(backBtn);
    expect(onNavigate).toHaveBeenLastCalledWith('/Users/clara');

    // Traverse Forward
    fireEvent.click(forwardBtn);
    expect(onNavigate).toHaveBeenLastCalledWith('/Users');
    expect(screen.getByRole('status')).toHaveTextContent('Navigated forward to /Users');

    // Branching via Root button truncates forward history
    fireEvent.click(screen.getByRole('button', { name: 'Root directory /' }));
    expect(onNavigate).toHaveBeenLastCalledWith('/');
    expect(forwardBtn).toBeDisabled();
    expect(upBtn).toBeDisabled();
  });

  it('enters and exits edit mode via Edit path button, empty well click, outside click, Ctrl+L, Cmd+L, and Alt+D', () => {
    const customKeyDown = vi.fn();
    render(
      <EditablePathBar
        defaultPath="/Users/clara/Projects"
        onKeyDown={customKeyDown}
        data-testid="path-bar"
      />
    );

    // 1. Explicit Edit path button
    fireEvent.click(screen.getByRole('button', { name: 'Edit path' }));
    const input = screen.getByRole('combobox', { name: 'Edit directory path' });
    expect(input).toHaveValue('/Users/clara/Projects');
    expect(input).toHaveFocus();
    expect(screen.getByTestId('path-bar')).toHaveAttribute('data-mode', 'edit');

    // Cancel button closes edit mode and restores focus to Edit path button
    fireEvent.click(screen.getByRole('button', { name: 'Cancel path editing' }));
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.getByRole('button', { name: 'Edit path' })).toHaveFocus();

    // 2. Clicking empty well space enters edit mode
    fireEvent.click(screen.getByTestId('editable-path-well'));
    expect(screen.getByRole('combobox', { name: 'Edit directory path' })).toBeInTheDocument();

    // Mouse down inside component keeps edit mode open; outside closes it
    fireEvent.mouseDown(screen.getByTestId('editable-path-edit-well'));
    expect(screen.getByRole('combobox', { name: 'Edit directory path' })).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('combobox')).toBeNull();

    // 3. Ctrl+L on container enters edit mode
    const root = screen.getByTestId('path-bar');
    fireEvent.keyDown(root, { key: 'l', ctrlKey: true });
    expect(customKeyDown).toHaveBeenCalled();
    expect(screen.getByRole('combobox', { name: 'Edit directory path' })).toBeInTheDocument();

    // Escape cancels and reverts
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape' });
    expect(screen.queryByRole('combobox')).toBeNull();

    // 4. Alt+D enters edit mode
    fireEvent.keyDown(root, { key: 'D', altKey: true });
    expect(screen.getByRole('combobox', { name: 'Edit directory path' })).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape' });

    // 5. Meta+L enters edit mode
    fireEvent.keyDown(root, { key: 'l', metaKey: true });
    expect(screen.getByRole('combobox', { name: 'Edit directory path' })).toBeInTheDocument();
  });

  it('respects consumer onKeyDown calling preventDefault on Ctrl+L', () => {
    render(
      <EditablePathBar
        data-testid="prevented-bar"
        onKeyDown={(e) => {
          e.preventDefault();
        }}
      />
    );

    fireEvent.keyDown(screen.getByTestId('prevented-bar'), { key: 'l', ctrlKey: true });
    expect(screen.queryByRole('combobox')).toBeNull();
  });

  it('supports autocomplete filtering, ArrowDown/ArrowUp wraparound, hover highlight, Tab completion, Enter commit, and click selection', () => {
    const onNavigate = vi.fn<(nextPath: string) => void>();
    render(<EditablePathBar onNavigate={onNavigate} />);

    fireEvent.click(screen.getByRole('button', { name: 'Edit path' }));
    const input = screen.getByRole('combobox', { name: 'Edit directory path' });
    expect(input).toHaveAttribute('aria-autocomplete', 'list');
    expect(input).toHaveAttribute('aria-expanded', 'true');

    const listbox = screen.getByRole('listbox', { name: 'Path suggestions' });
    expect(listbox).toHaveClass('w-full', 'max-w-[calc(100vw-2rem)]');

    // Clear input to show all 5 default suggestions
    fireEvent.change(input, { target: { value: '' } });
    const allOptions = screen.getAllByRole('option');
    expect(allOptions).toHaveLength(5);

    // ArrowDown cycles forward and wraps around; ArrowUp cycles backward and wraps
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(allOptions[0]).toHaveAttribute('aria-selected', 'true');
    expect(input).toHaveAttribute('aria-activedescendant', allOptions[0]?.id);

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(allOptions[1]).toHaveAttribute('aria-selected', 'true');

    // Tab completes highlighted suggestion into input without committing navigation
    fireEvent.keyDown(input, { key: 'Tab' });
    expect(input).toHaveValue('/Users/clara/Projects/refractor-ui/apps/docs');
    expect(onNavigate).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Completed path /Users/clara/Projects/refractor-ui/apps/docs'
    );

    // Pressing Tab again when draft already matches the sole suggestion does not preventDefault
    const passthroughTab = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    });
    input.dispatchEvent(passthroughTab);
    expect(passthroughTab.defaultPrevented).toBe(false);

    // Clear again, test ArrowUp wrapping from -1 to last item and decrementing
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    let currentOptions = screen.getAllByRole('option');
    expect(currentOptions[4]).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(currentOptions[3]).toHaveAttribute('aria-selected', 'true');

    // ArrowDown from last wraps to 0
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(currentOptions[4]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(currentOptions[0]).toHaveAttribute('aria-selected', 'true');

    // ArrowUp from 0 wraps to last
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(currentOptions[4]).toHaveAttribute('aria-selected', 'true');

    // Enter with highlighted suggestion commits that suggestion
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onNavigate).toHaveBeenLastCalledWith('/Users/clara/Downloads');
    expect(screen.queryByRole('combobox')).toBeNull();

    // Filter by label and backslash path query, test Tab without prior ArrowDown, hover, and click
    fireEvent.click(screen.getByRole('button', { name: 'Edit path' }));
    const input2 = screen.getByRole('combobox', { name: 'Edit directory path' });
    fireEvent.change(input2, { target: { value: '\\Volumes\\Studio' } });
    currentOptions = screen.getAllByRole('option');
    expect(currentOptions).toHaveLength(1);
    expect(currentOptions[0]).toHaveAttribute('data-kind', 'mount');

    // Tab completes top match when none highlighted
    fireEvent.keyDown(input2, { key: 'Tab' });
    expect(input2).toHaveValue('/Volumes/StudioNVMe/Renders');

    // Hovering option highlights it and clicking commits
    const mountOption = screen.getByRole('option');
    fireEvent.mouseEnter(mountOption);
    expect(mountOption).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(mountOption);
    expect(onNavigate).toHaveBeenLastCalledWith('/Volumes/StudioNVMe/Renders');
    expect(screen.queryByRole('combobox')).toBeNull();

    // Non-matching filter hides listbox and safely ignores ArrowDown/ArrowUp/Tab
    fireEvent.click(screen.getByRole('button', { name: 'Edit path' }));
    const input3 = screen.getByRole('combobox', { name: 'Edit directory path' });
    fireEvent.change(input3, { target: { value: '/no/such/path/xyz' } });
    expect(input3).toHaveAttribute('aria-expanded', 'false');
    expect(input3).not.toHaveAttribute('aria-controls');
    expect(screen.queryByRole('listbox')).toBeNull();

    fireEvent.keyDown(input3, { key: 'ArrowDown' });
    fireEvent.keyDown(input3, { key: 'ArrowUp' });
    fireEvent.keyDown(input3, { key: 'Tab' });
    expect(input3).toHaveValue('/no/such/path/xyz');

    // Commit via Go button
    fireEvent.click(screen.getByRole('button', { name: 'Go to path' }));
    expect(onNavigate).toHaveBeenLastCalledWith('/no/such/path/xyz');
  });

  it('deduplicates custom suggestions and handles omitted kind and label gracefully', () => {
    const customSuggestions: ReadonlyArray<EditablePathSuggestion> = [
      { path: '/workspace//alpha/' },
      { path: '\\workspace\\alpha' },
      { path: '/workspace/beta', label: 'Beta Branch' },
    ];

    render(<EditablePathBar defaultPath="/" suggestions={customSuggestions} />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit path' }));
    const input = screen.getByRole('combobox', { name: 'Edit directory path' });
    fireEvent.change(input, { target: { value: 'Beta Branch' } });

    const matched = screen.getAllByRole('option');
    expect(matched).toHaveLength(1);
    expect(matched[0]).toHaveTextContent('/workspace/beta');
    expect(matched[0]).toHaveAttribute('data-kind', 'folder');

    fireEvent.change(input, { target: { value: '' } });
    const deduped = screen.getAllByRole('option');
    expect(deduped).toHaveLength(2);
    expect(deduped[0]).toHaveTextContent('/workspace/alpha');
  });

  it('normalizes raw input on Enter, falls back to root for empty draft, and reverts on Escape', () => {
    const onNavigate = vi.fn<(nextPath: string) => void>();
    render(<EditablePathBar defaultPath="/Users/clara/Projects" onNavigate={onNavigate} />);

    // Enter messy path with backslashes, double slashes, and parent traversal
    fireEvent.click(screen.getByRole('button', { name: 'Edit path' }));
    const input = screen.getByRole('combobox', { name: 'Edit directory path' });
    fireEvent.change(input, {
      target: { value: '\\\\Users//clara\\.\\Projects\\..\\Downloads//' },
    });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onNavigate).toHaveBeenLastCalledWith('/Users/clara/Downloads');
    expect(screen.getByRole('button', { name: 'Downloads' })).toHaveAttribute(
      'aria-current',
      'location'
    );

    // Empty input normalizes to root '/'
    fireEvent.click(screen.getByRole('button', { name: 'Edit path' }));
    const input2 = screen.getByRole('combobox', { name: 'Edit directory path' });
    fireEvent.change(input2, { target: { value: '   ' } });
    fireEvent.keyDown(input2, { key: 'Enter' });

    expect(onNavigate).toHaveBeenLastCalledWith('/');
    expect(screen.getByRole('button', { name: 'Root directory /' })).toHaveAttribute(
      'aria-current',
      'location'
    );

    // Escape discards draft edits and does not fire onNavigate
    const callCountBeforeEscape = onNavigate.mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Edit path' }));
    const input3 = screen.getByRole('combobox', { name: 'Edit directory path' });
    fireEvent.change(input3, { target: { value: '/discarded/path' } });
    fireEvent.keyDown(input3, { key: 'Escape' });

    expect(onNavigate).toHaveBeenCalledTimes(callCountBeforeEscape);
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('Canceled editing. Current path /');
  });

  it('guards all keyboard actions against active IME composition', () => {
    const onNavigate = vi.fn<(nextPath: string) => void>();
    render(
      <EditablePathBar
        defaultPath="/Users/clara/Projects"
        onNavigate={onNavigate}
        data-testid="ime-bar"
      />
    );

    // Container Ctrl+L ignored during IME composition
    dispatchKeyDownWithComposition(screen.getByTestId('ime-bar'), {
      key: 'l',
      ctrlKey: true,
      isComposing: true,
    });
    expect(screen.queryByRole('combobox')).toBeNull();

    // Enter edit mode normally, then test composing Enter/Escape/Tab/ArrowDown
    fireEvent.click(screen.getByRole('button', { name: 'Edit path' }));
    const input = screen.getByRole('combobox', { name: 'Edit directory path' });
    fireEvent.change(input, { target: { value: '/Users/clara/Downloads' } });

    dispatchKeyDownWithComposition(input, { key: 'ArrowDown', isComposing: true });
    dispatchKeyDownWithComposition(input, { key: 'Tab', isComposing: true });
    dispatchKeyDownWithComposition(input, { key: 'Enter', isComposing: true });
    dispatchKeyDownWithComposition(input, { key: 'Escape', isComposing: true });

    expect(screen.getByRole('combobox', { name: 'Edit directory path' })).toBeInTheDocument();
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('renders adversarial XSS payloads strictly as literal text nodes', () => {
    const xssPath = '/Users/<script>alert(1)</script>/<img src=x onerror=alert(2)>';
    const { container } = render(<EditablePathBar defaultPath={xssPath} />);

    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByRole('button', { name: '<script>alert(1)<' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'script>' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '<img src=x onerror=alert(2)>' })
    ).toBeInTheDocument();

    // Submit XSS string via edit mode
    fireEvent.click(screen.getByRole('button', { name: 'Edit path' }));
    const input = screen.getByRole('combobox', { name: 'Edit directory path' });
    fireEvent.change(input, { target: { value: '/<svg onload=alert(3)>/safe' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(container.querySelector('[onload]')).toBeNull();
    expect(screen.getByRole('button', { name: '<svg onload=alert(3)>' })).toBeInTheDocument();
  });

  it('supports controlled mode with stateful parent history sync and locked read-only parent', () => {
    function ControlledHarness() {
      const [currentPath, setCurrentPath] = useState('/Users/clara/Projects');
      return (
        <div>
          <EditablePathBar
            path={currentPath}
            onNavigate={setCurrentPath}
            data-testid="controlled-bar"
          />
          <button
            type="button"
            onClick={() => setCurrentPath('/Volumes/StudioNVMe/Renders')}
          >
            External Jump
          </button>
        </div>
      );
    }

    render(<ControlledHarness />);

    const backBtn = screen.getByRole('button', { name: 'Go back' });
    const forwardBtn = screen.getByRole('button', { name: 'Go forward' });

    expect(backBtn).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'clara' }));
    expect(screen.getByRole('button', { name: 'clara' })).toHaveAttribute(
      'aria-current',
      'location'
    );
    expect(backBtn).toBeEnabled();

    // Back in controlled mode
    fireEvent.click(backBtn);
    expect(screen.getByRole('button', { name: 'Projects' })).toHaveAttribute(
      'aria-current',
      'location'
    );
    expect(forwardBtn).toBeEnabled();

    // Forward in controlled mode
    fireEvent.click(forwardBtn);
    expect(screen.getByRole('button', { name: 'clara' })).toHaveAttribute(
      'aria-current',
      'location'
    );

    // External parent prop update pushes onto controlled history
    fireEvent.click(screen.getByRole('button', { name: 'External Jump' }));
    expect(screen.getByRole('button', { name: 'Renders' })).toHaveAttribute(
      'aria-current',
      'location'
    );
    expect(backBtn).toBeEnabled();

    // Locked controlled parent (ignores onNavigate) keeps path & Back unchanged
    const lockedSpy = vi.fn<(nextPath: string) => void>();
    render(<EditablePathBar path="/locked/workspace" onNavigate={lockedSpy} />);
    const lockedWorkspaceBtn = screen.getByRole('button', { name: 'locked' });
    fireEvent.click(lockedWorkspaceBtn);
    expect(lockedSpy).toHaveBeenCalledWith('/locked');
    expect(screen.getByRole('button', { name: 'workspace' })).toHaveAttribute(
      'aria-current',
      'location'
    );
  });

  it('enforces disabled state across all controls, well clicks, keyboard shortcuts, and live disabled transitions', () => {
    const onNavigate = vi.fn<(nextPath: string) => void>();
    const { rerender } = render(
      <EditablePathBar
        defaultPath="/Users/clara/Projects"
        onNavigate={onNavigate}
        disabled
        data-testid="disabled-bar"
      />
    );

    const root = screen.getByTestId('disabled-bar');
    expect(root).toHaveAttribute('data-disabled', 'true');
    expect(root).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('button', { name: 'Go back' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Go forward' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Go up one folder' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Root directory /' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Users' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Edit path' })).toBeDisabled();

    // Clicking empty well space or pressing Ctrl+L / Alt+D does not enter edit mode
    fireEvent.click(screen.getByTestId('editable-path-well'));
    fireEvent.keyDown(root, { key: 'l', ctrlKey: true });
    fireEvent.keyDown(root, { key: 'd', altKey: true });
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(onNavigate).not.toHaveBeenCalled();

    // Re-enable, open edit mode, then disable again -> immediately exits edit mode
    rerender(
      <EditablePathBar
        defaultPath="/Users/clara/Projects"
        onNavigate={onNavigate}
        disabled={false}
        data-testid="disabled-bar"
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Edit path' }));
    expect(screen.getByRole('combobox', { name: 'Edit directory path' })).toBeInTheDocument();

    rerender(
      <EditablePathBar
        defaultPath="/Users/clara/Projects"
        onNavigate={onNavigate}
        disabled
        data-testid="disabled-bar"
      />
    );
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.queryByRole('listbox')).toBeNull();
  });
});
