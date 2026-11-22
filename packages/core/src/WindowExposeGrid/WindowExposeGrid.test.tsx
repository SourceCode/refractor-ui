import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  WindowExposeGrid,
  type ExposeWindowCard,
  type ExposeWindowTone,
  type ExposeWindowToneMap,
} from './index';

describe('WindowExposeGrid', () => {
  it('renders prism-slab defaults, 6 realistic windows across 4 apps and 2 workspaces, ref passthrough, and theme overrides', () => {
    const ref = createRef<HTMLDivElement>();
    const toneMapCheck: ExposeWindowToneMap = {
      primary: true,
      info: true,
      emerald: true,
      amber: true,
      rose: true,
    };
    const sampleTone: ExposeWindowTone = 'emerald';
    expect(toneMapCheck[sampleTone]).toBe(true);
    expect(WindowExposeGrid.displayName).toBe('WindowExposeGrid');

    render(
      <PrismThemeProvider
        theme={{
          components: {
            WindowExposeGrid: {
              className: 'theme-expose-grid',
              style: { opacity: '0.97' },
            },
          },
        }}
      >
        <WindowExposeGrid
          ref={ref}
          className="local-expose-grid"
          xstyle={{ '--prism-blur-px': '16px' }}
          data-testid="expose-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('expose-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveAttribute('role', 'region');
    expect(root).toHaveClass(
      'refractor-window-expose-grid',
      'prism-slab',
      'theme-expose-grid',
      'local-expose-grid'
    );
    expect(root).toHaveStyle({ opacity: '0.97' });
    expect(root).not.toHaveAttribute('data-grouped');
    expect(root).not.toHaveAttribute('data-filtered');
    expect(root).not.toHaveAttribute('data-empty');
    expect(root).not.toHaveAttribute('data-disabled');

    const region = screen.getByRole('region', { name: 'Window Exposé' });
    expect(region).toBe(root);

    // Live open count pill shows 6 of 6 windows
    const countPill = screen.getByTestId('window-expose-count');
    expect(countPill).toHaveTextContent('Showing 6 of 6 windows');
    expect(countPill).toHaveAttribute('data-visible-count', '6');
    expect(countPill).toHaveAttribute('data-total-count', '6');

    // Non-overlapping responsive grid layout
    const grid = screen.getByTestId('window-expose-grid');
    expect(grid).toHaveClass('grid-cols-1', 'sm:grid-cols-2', 'lg:grid-cols-3', 'gap-4');
    expect(grid.querySelectorAll('article')).toHaveLength(6);

    // 4 dynamic app filter pills + All Apps
    const filterGroup = screen.getByTestId('window-expose-app-filters');
    const allAppsPill = within(filterGroup).getByRole('button', { name: 'All Apps' });
    expect(allAppsPill).toHaveAttribute('aria-pressed', 'true');
    expect(allAppsPill).toHaveClass('prism-focus-ring');

    const expectedApps: ReadonlyArray<string> = [
      'Refractor IDE',
      'Optical Studio',
      'Terminal',
      'Documentation Browser',
    ];
    for (const appName of expectedApps) {
      const pill = within(filterGroup).getByRole('button', { name: appName });
      expect(pill).toHaveAttribute('aria-pressed', 'false');
      expect(pill).toHaveClass('prism-focus-ring');
    }

    // Both workspaces rendered across cards
    expect(screen.getAllByText('Workspace 1 · Dev')).toHaveLength(3);
    expect(screen.getAllByText('Workspace 2 · Design')).toHaveLength(3);

    // First default window is active with ring highlight and aria-pressed="true"
    const activeCard = screen.getByTestId('expose-window-card-win-ide-core');
    expect(activeCard).toHaveAttribute('data-active', 'true');
    expect(activeCard).toHaveAttribute('data-tone', 'primary');
    expect(screen.getByTestId('expose-window-active-pill-win-ide-core')).toHaveTextContent(
      'Active'
    );

    const activeFocusBtn = screen.getByTestId('expose-window-focus-win-ide-core');
    expect(activeFocusBtn).toHaveAttribute('aria-pressed', 'true');
    expect(activeFocusBtn).toHaveAttribute('data-active', 'true');
    expect(activeFocusBtn).toHaveClass('prism-focus-ring');

    // Inactive window has aria-pressed="false"
    const inactiveFocusBtn = screen.getByTestId('expose-window-focus-win-terminal-tests');
    expect(inactiveFocusBtn).toHaveAttribute('aria-pressed', 'false');
    expect(inactiveFocusBtn).not.toHaveAttribute('data-active');

    // Procedural miniature glass UI preview exists and uses --prism-* tokens strictly
    const preview = screen.getByTestId('expose-window-preview-win-studio-palette');
    expect(preview).toHaveAttribute('aria-hidden', 'true');
    expect(preview.style.borderColor).toContain('--prism-error-main');

    // Group by App toggle starts unpressed
    const groupToggle = screen.getByRole('button', { name: 'Group by App' });
    expect(groupToggle).toHaveAttribute('aria-pressed', 'false');
    expect(groupToggle).toHaveClass('prism-focus-ring');

    // Polite live status region
    const liveStatus = screen.getByTestId('window-expose-live-status');
    expect(liveStatus).toHaveAttribute('aria-live', 'polite');
    expect(liveStatus).toHaveTextContent('Showing 6 of 6 windows');
  });

  it('focuses windows via click and IME-safe Enter/Space while ignoring IME composition and unrelated keys', () => {
    const onFocusWindow = vi.fn<(windowCard: ExposeWindowCard) => void>();

    render(<WindowExposeGrid onFocusWindow={onFocusWindow} />);

    const terminalFocusBtn = screen.getByTestId('expose-window-focus-win-terminal-tests');
    const studioFocusBtn = screen.getByTestId('expose-window-focus-win-studio-caustics');
    const docsFocusBtn = screen.getByTestId('expose-window-focus-win-docs-tiling');

    // Click focuses Terminal window
    fireEvent.click(terminalFocusBtn);
    expect(onFocusWindow).toHaveBeenCalledTimes(1);
    expect(onFocusWindow).toHaveBeenLastCalledWith(
      expect.objectContaining({
        id: 'win-terminal-tests',
        appName: 'Terminal',
        title: 'pnpm test:coverage — vitest',
      })
    );
    expect(terminalFocusBtn).toHaveAttribute('aria-pressed', 'true');
    expect(terminalFocusBtn).toHaveAttribute('data-active', 'true');
    expect(screen.getByTestId('expose-window-focus-win-ide-core')).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(screen.getByTestId('window-expose-live-status')).toHaveTextContent(
      'Focused pnpm test:coverage — vitest (Terminal · Workspace 1 · Dev).'
    );

    // IME-composing Enter and Space are ignored
    const composingEnter = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(composingEnter, 'isComposing', { value: true });
    fireEvent(studioFocusBtn, composingEnter);

    const composingSpace = new KeyboardEvent('keydown', {
      key: ' ',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(composingSpace, 'isComposing', { value: true });
    fireEvent(studioFocusBtn, composingSpace);
    expect(onFocusWindow).toHaveBeenCalledTimes(1);

    // Unrelated keys do not focus
    fireEvent.keyDown(studioFocusBtn, { key: 'ArrowRight' });
    fireEvent.keyDown(studioFocusBtn, { key: 'Escape' });
    expect(onFocusWindow).toHaveBeenCalledTimes(1);

    // Non-composing Enter focuses Optical Studio window
    fireEvent.keyDown(studioFocusBtn, { key: 'Enter' });
    expect(onFocusWindow).toHaveBeenCalledTimes(2);
    expect(onFocusWindow).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'win-studio-caustics' })
    );
    expect(studioFocusBtn).toHaveAttribute('aria-pressed', 'true');
    expect(terminalFocusBtn).toHaveAttribute('aria-pressed', 'false');

    // Non-composing Space focuses Documentation Browser window
    fireEvent.keyDown(docsFocusBtn, { key: ' ' });
    expect(onFocusWindow).toHaveBeenCalledTimes(3);
    expect(onFocusWindow).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'win-docs-tiling' })
    );
    expect(docsFocusBtn).toHaveAttribute('aria-pressed', 'true');
    expect(studioFocusBtn).toHaveAttribute('aria-pressed', 'false');
  });

  it('closes individual windows down to the role="status" empty state and recovers app filter when last app window closes', () => {
    const onCloseWindow = vi.fn<(windowId: string) => void>();
    const onFocusWindow = vi.fn<(windowCard: ExposeWindowCard) => void>();

    render(
      <WindowExposeGrid
        onCloseWindow={onCloseWindow}
        onFocusWindow={onFocusWindow}
        data-testid="close-root"
      />
    );

    // Filter to Terminal (1 window), then close it -> gracefully falls back to All Apps showing remaining 5
    const filterGroup = screen.getByTestId('window-expose-app-filters');
    fireEvent.click(within(filterGroup).getByRole('button', { name: 'Terminal' }));
    expect(screen.getByTestId('window-expose-count')).toHaveTextContent('Showing 1 of 6 windows');

    const closeTerminalBtn = screen.getByRole('button', {
      name: 'Close pnpm test:coverage — vitest',
    });
    expect(closeTerminalBtn).toHaveClass('prism-focus-ring');
    fireEvent.click(closeTerminalBtn);

    expect(onCloseWindow).toHaveBeenCalledTimes(1);
    expect(onCloseWindow).toHaveBeenLastCalledWith('win-terminal-tests');
    expect(onFocusWindow).not.toHaveBeenCalled();
    expect(screen.getByTestId('window-expose-count')).toHaveTextContent('Showing 5 of 5 windows');
    expect(within(filterGroup).queryByRole('button', { name: 'Terminal' })).toBeNull();
    expect(within(filterGroup).getByRole('button', { name: 'All Apps' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByTestId('window-expose-live-status')).toHaveTextContent(
      'Closed pnpm test:coverage — vitest (Terminal).'
    );

    // Close the remaining 5 windows
    const remainingIds: ReadonlyArray<string> = [
      'win-ide-core',
      'win-ide-tokens',
      'win-studio-caustics',
      'win-studio-palette',
      'win-docs-tiling',
    ];
    for (const id of remainingIds) {
      fireEvent.click(screen.getByTestId(`expose-window-close-${id}`));
    }

    expect(onCloseWindow).toHaveBeenCalledTimes(6);
    expect(screen.getByTestId('window-expose-count')).toHaveTextContent('Showing 0 of 0 windows');
    expect(screen.getByTestId('close-root')).toHaveAttribute('data-empty', 'true');

    const emptyStatus = screen.getByRole('status');
    expect(emptyStatus).toHaveTextContent('No open windows');
    expect(emptyStatus).toHaveTextContent(
      'All application windows have been closed in this workspace overview.'
    );
    expect(screen.queryByTestId('window-expose-reset-filters')).toBeNull();
  });

  it('filters linearly across title, appName, and workspaceName with IME-safe Escape clear, clear button, and ReDoS safety', () => {
    render(<WindowExposeGrid data-testid="search-root" />);

    const searchInput = screen.getByRole('searchbox', { name: 'Filter open windows' });
    expect(searchInput).toHaveAttribute('type', 'search');
    expect(searchInput).toHaveClass('prism-focus-ring');

    // Escape on empty search is a no-op
    fireEvent.keyDown(searchInput, { key: 'Escape' });
    expect(screen.getByTestId('window-expose-count')).toHaveTextContent('Showing 6 of 6 windows');

    // Substring match by title
    fireEvent.change(searchInput, { target: { value: 'caustics' } });
    expect(screen.getByTestId('search-root')).toHaveAttribute('data-filtered', 'true');
    expect(screen.getByTestId('window-expose-count')).toHaveTextContent('Showing 1 of 6 windows');
    expect(screen.getByTestId('expose-window-card-win-studio-caustics')).toBeInTheDocument();

    // IME-composing Escape MUST NOT clear search
    const composingEsc = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(composingEsc, 'isComposing', { value: true });
    fireEvent(searchInput, composingEsc);
    expect(searchInput).toHaveValue('caustics');
    expect(screen.getByTestId('window-expose-count')).toHaveTextContent('Showing 1 of 6 windows');

    // Non-Escape key does not clear search
    fireEvent.keyDown(searchInput, { key: 'a' });
    expect(searchInput).toHaveValue('caustics');

    // Regular Escape clears search query
    fireEvent.keyDown(searchInput, { key: 'Escape' });
    expect(searchInput).toHaveValue('');
    expect(screen.getByTestId('window-expose-count')).toHaveTextContent('Showing 6 of 6 windows');
    expect(screen.getByTestId('window-expose-live-status')).toHaveTextContent(
      'Cleared window search filter.'
    );

    // Substring match by workspaceName
    fireEvent.change(searchInput, { target: { value: 'workspace 2' } });
    expect(screen.getByTestId('window-expose-count')).toHaveTextContent('Showing 3 of 6 windows');

    // Clear search button resets query
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(searchInput).toHaveValue('');
    expect(screen.getByTestId('window-expose-count')).toHaveTextContent('Showing 6 of 6 windows');

    // Substring match by appName
    fireEvent.change(searchInput, { target: { value: 'documentation' } });
    expect(screen.getByTestId('window-expose-count')).toHaveTextContent('Showing 1 of 6 windows');

    // Adversarial ReDoS catastrophic-backtracking string executes linearly without throwing or stalling
    const redosPayload = '((((((((((a+)+)+)+)+)+)+)+)+)+$' + 'a'.repeat(4000);
    const startMs = performance.now();
    fireEvent.change(searchInput, { target: { value: redosPayload } });
    const elapsedMs = performance.now() - startMs;
    expect(elapsedMs).toBeLessThan(200);

    const emptyStatus = screen.getByRole('status');
    expect(emptyStatus).toHaveTextContent('No matching windows');

    // Reset Filters button restores all windows
    fireEvent.click(screen.getByTestId('window-expose-reset-filters'));
    expect(searchInput).toHaveValue('');
    expect(screen.getByTestId('window-expose-count')).toHaveTextContent('Showing 6 of 6 windows');
    expect(screen.getByTestId('window-expose-live-status')).toHaveTextContent(
      'Cleared window search and application filters.'
    );
  });

  it('filters by dynamic app pills and groups safely by app including adversarial __proto__/constructor app names', () => {
    const adversarialWindows: ReadonlyArray<ExposeWindowCard> = [
      {
        id: 'proto-1',
        appName: '__proto__',
        title: 'Kernel Inspector',
        workspaceName: 'Workspace A',
        tone: 'primary',
      },
      {
        id: 'proto-2',
        appName: '__proto__',
        title: 'Heap Snapshot',
        workspaceName: 'Workspace A',
        tone: 'amber',
      },
      {
        id: 'ctor-1',
        appName: 'constructor',
        title: 'Prototype Guard',
        workspaceName: 'Workspace B',
        tone: 'emerald',
      },
      {
        id: 'ctor-1',
        appName: 'constructor',
        title: 'Duplicate ID Should Be Deduplicated',
        workspaceName: 'Workspace B',
      },
      {
        id: 'blank-1',
        appName: '   ',
        title: '   ',
        workspaceName: '   ',
      },
    ];

    render(<WindowExposeGrid defaultWindows={adversarialWindows} data-testid="proto-root" />);

    // Duplicate ID deduplicated -> 4 unique windows
    expect(screen.getByTestId('window-expose-count')).toHaveTextContent('Showing 4 of 4 windows');
    expect(screen.queryByText('Duplicate ID Should Be Deduplicated')).toBeNull();

    // Blank fallbacks + omitted tone fallback ('primary')
    const blankCard = screen.getByTestId('expose-window-card-blank-1');
    expect(blankCard).toHaveAttribute('data-tone', 'primary');
    expect(within(blankCard).getByText('Untitled Window')).toBeInTheDocument();
    expect(within(blankCard).getByText('Untitled App')).toBeInTheDocument();
    expect(within(blankCard).getByText('Workspace')).toBeInTheDocument();

    // App filter pills safely list __proto__, constructor, Untitled App
    const filterGroup = screen.getByTestId('window-expose-app-filters');
    const protoPill = within(filterGroup).getByRole('button', { name: '__proto__' });
    const ctorPill = within(filterGroup).getByRole('button', { name: 'constructor' });
    const untitledPill = within(filterGroup).getByRole('button', { name: 'Untitled App' });
    expect(protoPill).toBeInTheDocument();
    expect(ctorPill).toBeInTheDocument();
    expect(untitledPill).toBeInTheDocument();

    // Filter to __proto__
    fireEvent.click(protoPill);
    expect(protoPill).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('window-expose-count')).toHaveTextContent('Showing 2 of 4 windows');
    expect(screen.getByTestId('window-expose-live-status')).toHaveTextContent(
      'Filtered to __proto__ windows.'
    );

    // Clicking active pill again toggles back to All Apps
    fireEvent.click(protoPill);
    expect(protoPill).toHaveAttribute('aria-pressed', 'false');
    expect(within(filterGroup).getByRole('button', { name: 'All Apps' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByTestId('window-expose-count')).toHaveTextContent('Showing 4 of 4 windows');
    expect(screen.getByTestId('window-expose-live-status')).toHaveTextContent(
      'Showing windows from all applications.'
    );

    // Click constructor then explicitly click All Apps
    fireEvent.click(ctorPill);
    expect(screen.getByTestId('window-expose-count')).toHaveTextContent('Showing 1 of 4 windows');
    fireEvent.click(within(filterGroup).getByRole('button', { name: 'All Apps' }));
    expect(screen.getByTestId('window-expose-count')).toHaveTextContent('Showing 4 of 4 windows');

    // Toggle Group by App ON -> ES Map groups __proto__, constructor, Untitled App safely
    const groupToggle = screen.getByTestId('window-expose-group-toggle');
    fireEvent.click(groupToggle);
    expect(groupToggle).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('proto-root')).toHaveAttribute('data-grouped', 'true');
    expect(screen.getByTestId('window-expose-live-status')).toHaveTextContent(
      'Grouped open windows by application.'
    );

    const protoGroup = screen.getByTestId('expose-app-group-__proto__');
    expect(protoGroup).toHaveAttribute('aria-label', '__proto__ windows');
    expect(protoGroup.querySelectorAll('article')).toHaveLength(2);

    const ctorGroup = screen.getByTestId('expose-app-group-constructor');
    expect(ctorGroup.querySelectorAll('article')).toHaveLength(1);

    const untitledGroup = screen.getByTestId('expose-app-group-Untitled App');
    expect(untitledGroup.querySelectorAll('article')).toHaveLength(1);

    // Confirm Object.prototype was never polluted
    expect(Object.prototype.hasOwnProperty.call(Object.prototype, 'Kernel Inspector')).toBe(false);

    // Toggle Group by App OFF
    fireEvent.click(groupToggle);
    expect(groupToggle).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('proto-root')).not.toHaveAttribute('data-grouped');
    expect(screen.getByTestId('window-expose-grid')).toBeInTheDocument();
    expect(screen.getByTestId('window-expose-live-status')).toHaveTextContent(
      'Showing ungrouped spatial window grid.'
    );
  });

  it('supports controlled windows, empty defaultWindows, custom aria-label, XSS literal titles, and disabled state', () => {
    const onFocusWindow = vi.fn<(windowCard: ExposeWindowCard) => void>();
    const onCloseWindow = vi.fn<(windowId: string) => void>();

    // Empty defaultWindows renders empty state immediately
    const { unmount } = render(<WindowExposeGrid defaultWindows={[]} />);
    expect(screen.getByRole('status')).toHaveTextContent('No open windows');
    unmount();

    const controlledWindows: ReadonlyArray<ExposeWindowCard> = [
      {
        id: 'ctrl-1',
        appName: 'Refractor IDE',
        title: 'main.tsx',
        workspaceName: 'Workspace 1',
        tone: 'primary',
        active: true,
      },
      {
        id: 'ctrl-2',
        appName: 'Terminal',
        title: 'build.log',
        workspaceName: 'Workspace 1',
        tone: 'emerald',
        active: false,
      },
    ];

    const { rerender } = render(
      <WindowExposeGrid
        title="   "
        aria-label="Desktop Exposé Region"
        windows={controlledWindows}
        onFocusWindow={onFocusWindow}
        onCloseWindow={onCloseWindow}
        data-testid="ctrl-root"
      />
    );

    const root = screen.getByTestId('ctrl-root');
    expect(root).toHaveAttribute('aria-label', 'Desktop Exposé Region');
    expect(root).not.toHaveAttribute('aria-labelledby');
    expect(screen.getByRole('heading', { name: 'Window Exposé' })).toBeInTheDocument();

    // Focusing emits callback without mutating controlled active state until parent updates prop
    fireEvent.click(screen.getByTestId('expose-window-focus-ctrl-2'));
    expect(onFocusWindow).toHaveBeenCalledWith(controlledWindows[1]);
    expect(screen.getByTestId('expose-window-focus-ctrl-1')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByTestId('expose-window-focus-ctrl-2')).toHaveAttribute(
      'aria-pressed',
      'false'
    );

    // Closing emits callback without removing window until parent updates prop
    fireEvent.click(screen.getByTestId('expose-window-close-ctrl-2'));
    expect(onCloseWindow).toHaveBeenCalledWith('ctrl-2');
    expect(screen.getByTestId('window-expose-count')).toHaveTextContent('Showing 2 of 2 windows');

    // Parent updates controlled windows
    const updatedWindows: ReadonlyArray<ExposeWindowCard> = [
      {
        id: 'ctrl-1',
        appName: '<img src=x onerror=alert(1)>',
        title: '<script>window.__exposeXss=1</script>',
        workspaceName: '<b>Desk</b>',
        tone: 'rose',
        active: true,
      },
    ];

    onFocusWindow.mockClear();
    onCloseWindow.mockClear();

    rerender(
      <WindowExposeGrid
        title="<script>window.__titleXss=1</script>"
        windows={updatedWindows}
        disabled
        onFocusWindow={onFocusWindow}
        onCloseWindow={onCloseWindow}
        data-testid="ctrl-root"
      />
    );

    // XSS payloads rendered strictly as literal text, never executable nodes
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(
      screen.getByRole('heading', { name: '<script>window.__titleXss=1</script>' })
    ).toBeInTheDocument();
    expect(screen.getByText('<script>window.__exposeXss=1</script>')).toBeInTheDocument();
    expect(screen.getAllByText('<img src=x onerror=alert(1)>')).toHaveLength(2);
    expect(screen.getByText('<b>Desk</b>')).toBeInTheDocument();

    // Disabled state blocks all controls and events
    expect(root).toHaveAttribute('data-disabled', 'true');
    const searchInput = screen.getByRole('searchbox', { name: 'Filter open windows' });
    const groupToggle = screen.getByTestId('window-expose-group-toggle');
    const allAppsBtn = screen.getByTestId('window-expose-filter-all');
    const focusBtn = screen.getByTestId('expose-window-focus-ctrl-1');
    const closeBtn = screen.getByTestId('expose-window-close-ctrl-1');

    expect(searchInput).toBeDisabled();
    expect(groupToggle).toBeDisabled();
    expect(allAppsBtn).toBeDisabled();
    expect(focusBtn).toBeDisabled();
    expect(closeBtn).toBeDisabled();

    fireEvent.change(searchInput, { target: { value: 'blocked' } });
    expect(searchInput).toHaveValue('');
    fireEvent.keyDown(searchInput, { key: 'Escape' });
    fireEvent.click(groupToggle);
    expect(groupToggle).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(focusBtn);
    fireEvent.keyDown(focusBtn, { key: 'Enter' });
    fireEvent.keyDown(focusBtn, { key: ' ' });
    fireEvent.click(closeBtn);

    expect(onFocusWindow).not.toHaveBeenCalled();
    expect(onCloseWindow).not.toHaveBeenCalled();
  });
});
