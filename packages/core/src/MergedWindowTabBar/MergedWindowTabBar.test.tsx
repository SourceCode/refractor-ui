import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  MergedWindowTabBar,
  type MergedWindowAction,
  type MergedWindowActionMap,
  type MergedWindowTabItem,
} from './index';

function createMockDataTransfer(initial?: Record<string, string>) {
  const store = new Map<string, string>(Object.entries(initial ?? {}));
  return {
    effectAllowed: 'none',
    dropEffect: 'none',
    setData: vi.fn((type: string, value: string) => {
      store.set(type, value);
    }),
    getData: vi.fn((type: string) => store.get(type) ?? ''),
  };
}

describe('MergedWindowTabBar', () => {
  it('renders 3 default tabs, semantic window chrome tokens, scrollable tablist, active preview pane, ref, and theme override', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            MergedWindowTabBar: {
              className: 'theme-merged-bar',
              style: { opacity: '0.96' },
            },
          },
        }}
      >
        <MergedWindowTabBar
          ref={ref}
          className="local-merged-bar"
          xstyle={{ '--prism-blur-px': '14px' }}
          data-testid="merged-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('merged-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'refractor-merged-window-tab-bar',
      'prism-slab',
      'theme-merged-bar',
      'local-merged-bar'
    );
    expect(root).toHaveAttribute('data-tab-count', '3');
    expect(root).toHaveAttribute('data-detached-count', '0');
    expect(root).not.toHaveAttribute('data-disabled');
    expect(root).not.toHaveAttribute('data-empty');
    expect(root).toHaveStyle({ opacity: '0.96' });

    // Leading window chrome controls strictly tinted with --prism-* semantic tokens
    const closeWin = screen.getByRole('button', { name: 'Close window' });
    const minWin = screen.getByRole('button', { name: 'Minimize window' });
    const maxWin = screen.getByRole('button', { name: 'Maximize window' });
    expect(closeWin.style.backgroundColor).toBe('var(--prism-error-main)');
    expect(minWin.style.backgroundColor).toBe('var(--prism-warning-main)');
    expect(maxWin.style.backgroundColor).toBe('var(--prism-success-main)');

    // Scrollable tab strip wrapped in overflow-x-auto
    const tablist = screen.getByRole('tablist', {
      name: 'Merged window tabs',
    });
    expect(tablist.parentElement).toHaveClass('overflow-x-auto', 'min-w-0');

    const tabs = within(tablist).getAllByRole('tab');
    expect(tabs).toHaveLength(3);
    expect(tabs[0]).toHaveTextContent('DesignSystem.fig');
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[0]).toHaveAttribute('tabindex', '0');
    expect(tabs[0]).toHaveAttribute('draggable', 'true');
    expect(tabs[1]).toHaveTextContent('TokenEngine.ts');
    expect(tabs[1]).toHaveAttribute('aria-selected', 'false');
    expect(tabs[1]).toHaveAttribute('tabindex', '-1');
    expect(tabs[2]).toHaveTextContent('ReleaseNotes.md');
    expect(tabs[2]).toHaveAttribute('aria-selected', 'false');

    // Dirty indicator dot on DesignSystem.fig uses --prism-primary-main
    const dirtyDot = root.querySelector('[data-part="dirty-dot"]') as HTMLElement;
    expect(dirtyDot).not.toBeNull();
    expect(dirtyDot.style.backgroundColor).toBe('var(--prism-primary-main)');

    // Compact active tab preview pane shows active tab title & subtitle
    const preview = screen.getByRole('tabpanel');
    expect(preview).toHaveAttribute('aria-labelledby', tabs[0]?.id);
    expect(within(preview).getByText('DesignSystem.fig')).toBeInTheDocument();
    expect(
      within(preview).getByText('packages/tokens · Canvas · Unsaved optical edits')
    ).toBeInTheDocument();
    expect(within(preview).getByText('Unsaved')).toBeInTheDocument();
    expect(within(preview).getByText('Tab 1 / 3')).toBeInTheDocument();

    // Live status bar
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent('Active: DesignSystem.fig (1 of 3)');

    // No Detached Windows shelf initially
    expect(
      screen.queryByRole('region', { name: 'Detached Windows' })
    ).toBeNull();
  });

  it('switches tabs via click and IME-safe roving ArrowLeft/ArrowRight/Home/End keys', () => {
    const onSelectTab = vi.fn();
    render(<MergedWindowTabBar onSelectTab={onSelectTab} />);

    const tablist = screen.getByRole('tablist', {
      name: 'Merged window tabs',
    });
    const tabs = within(tablist).getAllByRole('tab');

    // Click second tab
    fireEvent.click(tabs[1]!);
    expect(onSelectTab).toHaveBeenLastCalledWith('token-engine-ts');
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    expect(within(screen.getByRole('tabpanel')).getByText('TokenEngine.ts')).toBeInTheDocument();

    // ArrowRight moves to third tab and focuses it
    fireEvent.keyDown(tabs[1]!, { key: 'ArrowRight' });
    expect(onSelectTab).toHaveBeenLastCalledWith('release-notes-md');
    expect(tabs[2]).toHaveAttribute('aria-selected', 'true');
    expect(document.activeElement).toBe(tabs[2]);

    // ArrowRight wraps to first tab
    fireEvent.keyDown(tabs[2]!, { key: 'ArrowRight' });
    expect(onSelectTab).toHaveBeenLastCalledWith('design-system-fig');
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(document.activeElement).toBe(tabs[0]);

    // ArrowLeft wraps to last tab
    fireEvent.keyDown(tabs[0]!, { key: 'ArrowLeft' });
    expect(onSelectTab).toHaveBeenLastCalledWith('release-notes-md');
    expect(tabs[2]).toHaveAttribute('aria-selected', 'true');
    expect(document.activeElement).toBe(tabs[2]);

    // Home jumps to first tab
    fireEvent.keyDown(tabs[2]!, { key: 'Home' });
    expect(onSelectTab).toHaveBeenLastCalledWith('design-system-fig');
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');

    // End jumps to last tab
    fireEvent.keyDown(tabs[0]!, { key: 'End' });
    expect(onSelectTab).toHaveBeenLastCalledWith('release-notes-md');
    expect(tabs[2]).toHaveAttribute('aria-selected', 'true');

    // Ctrl/Meta combos and non-navigation keys are ignored
    const callsBefore = onSelectTab.mock.calls.length;
    fireEvent.keyDown(tabs[2]!, { key: 'ArrowLeft', ctrlKey: true });
    fireEvent.keyDown(tabs[2]!, { key: 'ArrowLeft', metaKey: true });
    fireEvent.keyDown(tabs[2]!, { key: 'Escape' });
    expect(onSelectTab).toHaveBeenCalledTimes(callsBefore);

    // IME composing keydown MUST NOT switch tabs
    const composingArrow = new KeyboardEvent('keydown', {
      key: 'ArrowLeft',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(composingArrow, 'isComposing', { value: true });
    fireEvent(tabs[2]!, composingArrow);
    expect(onSelectTab).toHaveBeenCalledTimes(callsBefore);
  });

  it('reorders tabs via Alt+ArrowLeft / Alt+ArrowRight keyboard shortcuts with bounds safety', () => {
    const onTabsChange = vi.fn();
    render(<MergedWindowTabBar onTabsChange={onTabsChange} />);

    const getOrder = () =>
      within(
        screen.getByRole('tablist', { name: 'Merged window tabs' })
      )
        .getAllByRole('tab')
        .map((tab) => tab.textContent);

    // Alt+ArrowLeft on first tab is a safe boundary no-op
    let tabs = within(
      screen.getByRole('tablist', { name: 'Merged window tabs' })
    ).getAllByRole('tab');
    fireEvent.keyDown(tabs[0]!, { key: 'ArrowLeft', altKey: true });
    expect(onTabsChange).not.toHaveBeenCalled();

    // Alt+ArrowRight on first tab moves DesignSystem.fig to index 1
    fireEvent.keyDown(tabs[0]!, { key: 'ArrowRight', altKey: true });
    expect(onTabsChange).toHaveBeenCalledTimes(1);
    expect(getOrder()).toEqual([
      'TokenEngine.ts',
      'Unsaved changesDesignSystem.fig',
      'ReleaseNotes.md',
    ]);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Moved DesignSystem.fig to tab position 2 of 3'
    );

    // Focus stays on moved tab
    tabs = within(
      screen.getByRole('tablist', { name: 'Merged window tabs' })
    ).getAllByRole('tab');
    expect(document.activeElement).toBe(tabs[1]);

    // Alt+ArrowLeft on index 1 moves it back to index 0
    fireEvent.keyDown(tabs[1]!, { key: 'ArrowLeft', altKey: true });
    expect(onTabsChange).toHaveBeenCalledTimes(2);
    expect(getOrder()).toEqual([
      'Unsaved changesDesignSystem.fig',
      'TokenEngine.ts',
      'ReleaseNotes.md',
    ]);

    // Alt+ArrowRight on last tab is a safe boundary no-op
    tabs = within(
      screen.getByRole('tablist', { name: 'Merged window tabs' })
    ).getAllByRole('tab');
    fireEvent.keyDown(tabs[2]!, { key: 'ArrowRight', altKey: true });
    expect(onTabsChange).toHaveBeenCalledTimes(2);
  });

  it('reorders tabs via HTML5 drag-and-drop (custom MIME, text/plain id & index, fallback state) and guards invalid drops', () => {
    const onTabsChange = vi.fn();
    render(
      <MergedWindowTabBar
        onTabsChange={onTabsChange}
        data-testid="dnd-root"
      />
    );

    const root = screen.getByTestId('dnd-root');
    const getItems = () =>
      Array.from(root.querySelectorAll('[data-part="tab-item"]')) as HTMLElement[];

    // 1. Custom MIME dataTransfer drag from index 0 -> index 2
    let items = getItems();
    const dt1 = createMockDataTransfer();
    fireEvent.dragStart(items[0]!, { dataTransfer: dt1 });
    expect(items[0]).toHaveAttribute('data-dragging', 'true');
    expect(dt1.setData).toHaveBeenCalledWith(
      'application/x-refractor-merged-window-tab',
      'design-system-fig'
    );

    fireEvent.dragOver(items[2]!, { dataTransfer: dt1 });
    expect(items[2]).toHaveAttribute('data-drop-target', 'true');

    // DragLeave into a child inside the same tab item keeps drop target active
    const childBtn = within(items[2]!).getByRole('tab');
    const internalLeave = new Event('dragleave', { bubbles: true });
    Object.defineProperty(internalLeave, 'relatedTarget', { value: childBtn });
    fireEvent(items[2]!, internalLeave);
    expect(items[2]).toHaveAttribute('data-drop-target', 'true');

    // DragLeave outside clears drop target
    const externalLeave = new Event('dragleave', { bubbles: true });
    Object.defineProperty(externalLeave, 'relatedTarget', { value: root });
    fireEvent(items[2]!, externalLeave);
    expect(items[2]).not.toHaveAttribute('data-drop-target');

    // DragLeave on a non-drop-target tab preserves current drop target cleanly
    fireEvent.dragOver(items[2]!, { dataTransfer: dt1 });
    const otherLeave = new Event('dragleave', { bubbles: true });
    Object.defineProperty(otherLeave, 'relatedTarget', { value: root });
    fireEvent(items[1]!, otherLeave);
    expect(items[2]).toHaveAttribute('data-drop-target', 'true');

    // Drop completes reorder
    fireEvent.drop(items[2]!, { dataTransfer: dt1 });
    fireEvent.dragEnd(items[0]!);

    expect(onTabsChange).toHaveBeenCalledTimes(1);
    expect(getItems().map((el) => el.getAttribute('data-tab-id'))).toEqual([
      'token-engine-ts',
      'release-notes-md',
      'design-system-fig',
    ]);

    // 2. Fallback drag without dataTransfer (uses internal draggedTabId)
    items = getItems();
    fireEvent.dragStart(items[2]!);
    fireEvent.dragOver(items[0]!);
    fireEvent.drop(items[0]!);
    expect(onTabsChange).toHaveBeenCalledTimes(2);
    expect(getItems().map((el) => el.getAttribute('data-tab-id'))).toEqual([
      'design-system-fig',
      'token-engine-ts',
      'release-notes-md',
    ]);

    // 3. Drop with text/plain tab ID
    items = getItems();
    const dtById = createMockDataTransfer({ 'text/plain': 'release-notes-md' });
    fireEvent.drop(items[0]!, { dataTransfer: dtById });
    expect(onTabsChange).toHaveBeenCalledTimes(3);
    expect(getItems().map((el) => el.getAttribute('data-tab-id'))).toEqual([
      'release-notes-md',
      'design-system-fig',
      'token-engine-ts',
    ]);

    // 4. Drop with text/plain numeric index
    items = getItems();
    const dtByIndex = createMockDataTransfer({ 'text/plain': '2' });
    fireEvent.drop(items[0]!, { dataTransfer: dtByIndex });
    expect(onTabsChange).toHaveBeenCalledTimes(4);
    expect(getItems().map((el) => el.getAttribute('data-tab-id'))).toEqual([
      'token-engine-ts',
      'release-notes-md',
      'design-system-fig',
    ]);

    // 5. Drag starting from detach action button is blocked
    const detachBtn = screen.getByRole('button', {
      name: 'Detach TokenEngine.ts',
    });
    const blockedDrag = new Event('dragstart', {
      bubbles: true,
      cancelable: true,
    });
    fireEvent(detachBtn, blockedDrag);
    expect(blockedDrag.defaultPrevented).toBe(true);

    // 6. Adversarial / invalid drop payloads do nothing
    items = getItems();
    const dtEmpty = createMockDataTransfer();
    fireEvent.drop(items[0]!, { dataTransfer: dtEmpty });
    const dtInvalid = createMockDataTransfer({ 'text/plain': 'not-an-id-or-idx' });
    fireEvent.drop(items[0]!, { dataTransfer: dtInvalid });
    const dtOutOfRange = createMockDataTransfer({ 'text/plain': '99' });
    fireEvent.drop(items[0]!, { dataTransfer: dtOutOfRange });
    const dtSame = createMockDataTransfer({ 'text/plain': '0' });
    fireEvent.drop(items[0]!, { dataTransfer: dtSame });
    expect(onTabsChange).toHaveBeenCalledTimes(4);
  });

  it('tears off tabs into the Detached Windows shelf, updates live status, handles last-tab tear-off, and merges back', () => {
    const onTearOffTab = vi.fn();
    const onTabsChange = vi.fn();
    const onSelectTab = vi.fn();

    render(
      <MergedWindowTabBar
        onTearOffTab={onTearOffTab}
        onTabsChange={onTabsChange}
        onSelectTab={onSelectTab}
      />
    );

    // Tear off active first tab (DesignSystem.fig, dirty)
    fireEvent.click(
      screen.getByRole('button', { name: 'Detach DesignSystem.fig' })
    );

    expect(onTearOffTab).toHaveBeenCalledTimes(1);
    expect(onTearOffTab).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'design-system-fig',
        title: 'DesignSystem.fig',
        dirty: true,
      })
    );
    expect(onSelectTab).toHaveBeenLastCalledWith('token-engine-ts');

    // Detached Windows shelf appears with Merge Back button
    const shelf = screen.getByRole('region', { name: 'Detached Windows' });
    expect(within(shelf).getByText('DesignSystem.fig')).toBeInTheDocument();
    expect(
      within(shelf).getByText('packages/tokens · Canvas · Unsaved optical edits')
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Detached DesignSystem.fig into standalone window'
    );

    // Tear off inactive tab (ReleaseNotes.md) — active remains TokenEngine.ts
    fireEvent.click(
      screen.getByRole('button', { name: 'Detach ReleaseNotes.md' })
    );
    expect(onTearOffTab).toHaveBeenCalledTimes(2);
    expect(
      within(screen.getByRole('tabpanel')).getByText('TokenEngine.ts')
    ).toBeInTheDocument();

    // Tear off final remaining tab (TokenEngine.ts) -> empty state shown while all 3 sit in Detached Windows
    fireEvent.click(
      screen.getByRole('button', { name: 'Detach TokenEngine.ts' })
    );
    expect(screen.getByRole('status')).toHaveTextContent('No open window tabs');
    expect(within(shelf).getAllByRole('button', { name: 'Merge Back' })).toHaveLength(3);

    // Merge Back DesignSystem.fig restores it and activates it
    const mergeButtons = within(shelf).getAllByRole('button', {
      name: 'Merge Back',
    });
    fireEvent.click(mergeButtons[0]!);

    expect(onSelectTab).toHaveBeenLastCalledWith('design-system-fig');
    expect(
      within(screen.getByRole('tabpanel')).getByText('DesignSystem.fig')
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Merged DesignSystem.fig back into window tab bar'
    );
    expect(within(shelf).getAllByRole('button', { name: 'Merge Back' })).toHaveLength(2);
  });

  it('closes active and inactive tabs cleanly, selects adjacent tabs, respects closable=false, and shows empty state', () => {
    const onSelectTab = vi.fn();
    const onTabsChange = vi.fn();

    const customTabs: MergedWindowTabItem[] = [
      { id: 'a', title: 'Alpha.ts', subtitle: 'src/a.ts', closable: true },
      { id: 'b', title: 'Beta.ts', closable: false },
      { id: 'c', title: 'Gamma.ts', subtitle: 'src/c.ts' },
    ];

    const { rerender } = render(
      <MergedWindowTabBar
        defaultTabs={customTabs}
        defaultActiveTabId="c"
        onSelectTab={onSelectTab}
        onTabsChange={onTabsChange}
      />
    );

    // Non-closable tab has no Close button
    expect(screen.queryByRole('button', { name: 'Close Beta.ts' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Close Alpha.ts' })).toBeInTheDocument();

    // Closing active last tab ('c') falls back to adjacent tab ('b')
    fireEvent.click(screen.getByRole('button', { name: 'Close Gamma.ts' }));
    expect(onSelectTab).toHaveBeenLastCalledWith('b');
    expect(within(screen.getByRole('tabpanel')).getByText('Beta.ts')).toBeInTheDocument();

    // Closing inactive first tab ('a') preserves active tab ('b')
    const selectCallsBefore = onSelectTab.mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Close Alpha.ts' }));
    expect(onSelectTab).toHaveBeenCalledTimes(selectCallsBefore);
    expect(screen.getByRole('status')).toHaveTextContent('Closed tab Alpha.ts');

    // Render single closable tab and close it -> clean role="status" empty state
    rerender(
      <MergedWindowTabBar
        tabs={[]}
        data-testid="empty-bar"
      />
    );
    expect(screen.getByTestId('empty-bar')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('No open window tabs');
  });

  it('closes the final remaining uncontrolled tab into the empty state cleanly', () => {
    render(
      <MergedWindowTabBar
        defaultTabs={[{ id: 'only', title: 'Solo.md' }]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Close Solo.md' }));
    expect(screen.getByRole('status')).toHaveTextContent('No open window tabs');
    expect(
      within(
        screen.getByRole('tablist', { name: 'Merged window tabs' })
      ).queryAllByRole('tab')
    ).toHaveLength(0);
  });

  it('creates collision-safe new tabs (avoiding merged and detached collisions) or delegates to custom onAddTab', () => {
    const onTabsChange = vi.fn();
    const onSelectTab = vi.fn();

    render(
      <MergedWindowTabBar
        defaultTabs={[
          { id: 'untitled-tab-1', title: 'Custom.ts' },
          { id: 'custom-2', title: 'Untitled-2.tsx' },
        ]}
        onTabsChange={onTabsChange}
        onSelectTab={onSelectTab}
      />
    );

    // Detach Untitled-2.tsx so collision checker also checks detachedTabs
    fireEvent.click(
      screen.getByRole('button', { name: 'Detach Untitled-2.tsx' })
    );

    // Adding a tab skips 1 (id collision in merged) and 2 (title collision in detached) -> Untitled-3.tsx
    fireEvent.click(screen.getByRole('button', { name: 'New window tab' }));
    expect(onSelectTab).toHaveBeenLastCalledWith('untitled-tab-3');
    expect(
      within(screen.getByRole('tabpanel')).getByText('Untitled-3.tsx')
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Opened tab Untitled-3.tsx'
    );

    // Custom onAddTab delegates without mutating tabs directly
    const onAddTab = vi.fn();
    render(<MergedWindowTabBar onAddTab={onAddTab} />);
    const addButtons = screen.getAllByRole('button', {
      name: 'New window tab',
    });
    fireEvent.click(addButtons[1]!);
    expect(onAddTab).toHaveBeenCalledTimes(1);
  });

  it('handles window chrome close/minimize/maximize clicks, keyboard activation, and IME guard', () => {
    const actionMap: MergedWindowActionMap = {
      close: true,
      minimize: true,
      maximize: true,
    };
    const sampleAction: MergedWindowAction = 'maximize';
    expect(actionMap[sampleAction]).toBe(true);

    const onWindowAction = vi.fn();
    render(<MergedWindowTabBar onWindowAction={onWindowAction} />);

    const closeBtn = screen.getByRole('button', { name: 'Close window' });
    const minBtn = screen.getByRole('button', { name: 'Minimize window' });
    const maxBtn = screen.getByRole('button', { name: 'Maximize window' });

    fireEvent.click(closeBtn);
    expect(onWindowAction).toHaveBeenLastCalledWith('close');
    expect(screen.getByRole('status')).toHaveTextContent(
      'Window close requested'
    );

    fireEvent.click(minBtn);
    expect(onWindowAction).toHaveBeenLastCalledWith('minimize');
    fireEvent.click(maxBtn);
    expect(onWindowAction).toHaveBeenLastCalledWith('maximize');

    fireEvent.keyDown(minBtn, { key: 'Enter' });
    expect(onWindowAction).toHaveBeenLastCalledWith('minimize');

    fireEvent.keyDown(maxBtn, { key: ' ' });
    expect(onWindowAction).toHaveBeenLastCalledWith('maximize');

    // Non-activation key ignored
    fireEvent.keyDown(closeBtn, { key: 'Escape' });
    expect(onWindowAction).toHaveBeenCalledTimes(5);

    // IME composing Enter ignored
    const composingEnter = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(composingEnter, 'isComposing', { value: true });
    fireEvent(closeBtn, composingEnter);
    expect(onWindowAction).toHaveBeenCalledTimes(5);
  });

  it('supports controlled tabs and activeTabId accurately', () => {
    function ControlledHarness() {
      const [tabs, setTabs] = useState<ReadonlyArray<MergedWindowTabItem>>([
        { id: 'c1', title: 'Spec.md', subtitle: 'docs/spec.md' },
        { id: 'c2', title: 'Schema.ts', subtitle: 'src/schema.ts' },
      ]);
      const [activeId, setActiveId] = useState('c2');
      return (
        <MergedWindowTabBar
          tabs={tabs}
          activeTabId={activeId}
          onTabsChange={setTabs}
          onSelectTab={setActiveId}
        />
      );
    }

    render(<ControlledHarness />);
    expect(
      within(screen.getByRole('tabpanel')).getByText('Schema.ts')
    ).toBeInTheDocument();

    // Close active controlled tab updates controlled state cleanly
    fireEvent.click(screen.getByRole('button', { name: 'Close Schema.ts' }));
    expect(
      within(screen.getByRole('tabpanel')).getByText('Spec.md')
    ).toBeInTheDocument();

    // Tear off last controlled tab & merge back
    fireEvent.click(screen.getByRole('button', { name: 'Detach Spec.md' }));
    expect(screen.getByRole('status')).toHaveTextContent('No open window tabs');

    fireEvent.click(screen.getByRole('button', { name: 'Merge Back' }));
    expect(
      within(screen.getByRole('tabpanel')).getByText('Spec.md')
    ).toBeInTheDocument();

    // Closing final remaining controlled tab shows empty state
    fireEvent.click(screen.getByRole('button', { name: 'Close Spec.md' }));
    expect(screen.getByRole('status')).toHaveTextContent('No open window tabs');
  });

  it('renders clean role="status" empty state when initialized with defaultTabs={[]}', () => {
    render(<MergedWindowTabBar defaultTabs={[]} data-testid="init-empty" />);
    expect(screen.getByTestId('init-empty')).toHaveAttribute(
      'data-empty',
      'true'
    );
    expect(screen.getByRole('status')).toHaveTextContent('No open window tabs');
  });

  it('blocks all interactions and marks controls disabled when disabled={true}', () => {
    const onSelectTab = vi.fn();
    const onTabsChange = vi.fn();
    const onTearOffTab = vi.fn();
    const onAddTab = vi.fn();
    const onWindowAction = vi.fn();

    const { rerender } = render(
      <MergedWindowTabBar
        onSelectTab={onSelectTab}
        onTabsChange={onTabsChange}
        onTearOffTab={onTearOffTab}
        onWindowAction={onWindowAction}
        data-testid="dis-root"
      />
    );

    // Tear off one tab first so Detached Windows shelf is visible when disabled turns true
    fireEvent.click(
      screen.getByRole('button', { name: 'Detach ReleaseNotes.md' })
    );
    onSelectTab.mockClear();
    onTabsChange.mockClear();
    onTearOffTab.mockClear();

    rerender(
      <MergedWindowTabBar
        disabled
        onSelectTab={onSelectTab}
        onTabsChange={onTabsChange}
        onTearOffTab={onTearOffTab}
        onAddTab={onAddTab}
        onWindowAction={onWindowAction}
        data-testid="dis-root"
      />
    );

    const root = screen.getByTestId('dis-root');
    expect(root).toHaveAttribute('data-disabled', 'true');

    const closeWin = screen.getByRole('button', { name: 'Close window' });
    const addBtn = screen.getByRole('button', { name: 'New window tab' });
    const mergeBtn = screen.getByRole('button', { name: 'Merge Back' });
    const tabs = within(
      screen.getByRole('tablist', { name: 'Merged window tabs' })
    ).getAllByRole('tab');

    expect(closeWin).toBeDisabled();
    expect(addBtn).toBeDisabled();
    expect(mergeBtn).toBeDisabled();
    expect(tabs[0]).toBeDisabled();
    expect(tabs[0]).toHaveAttribute('draggable', 'false');
    expect(tabs[0]).toHaveAttribute('tabindex', '-1');

    // Attempt direct events while disabled
    fireEvent.click(closeWin);
    fireEvent.keyDown(closeWin, { key: 'Enter' });
    fireEvent.click(tabs[1]!);
    fireEvent.keyDown(tabs[0]!, { key: 'ArrowRight' });
    fireEvent.keyDown(tabs[0]!, { key: 'ArrowRight', altKey: true });
    fireEvent.click(addBtn);
    fireEvent.click(mergeBtn);
    fireEvent.click(
      screen.getByRole('button', { name: 'Detach DesignSystem.fig' })
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Close DesignSystem.fig' })
    );

    const items = root.querySelectorAll('[data-part="tab-item"]');
    const dt = createMockDataTransfer({ 'text/plain': '0' });
    fireEvent.dragStart(items[0]!, { dataTransfer: dt });
    fireEvent.dragOver(items[1]!, { dataTransfer: dt });
    fireEvent.drop(items[1]!, { dataTransfer: dt });

    expect(onWindowAction).not.toHaveBeenCalled();
    expect(onSelectTab).not.toHaveBeenCalled();
    expect(onTabsChange).not.toHaveBeenCalled();
    expect(onTearOffTab).not.toHaveBeenCalled();
    expect(onAddTab).not.toHaveBeenCalled();
  });

  it('deduplicates tabs, falls back on blank titles/subtitles, and safely escapes adversarial XSS & prototype-key IDs', () => {
    const xssTitle =
      '<script>window.__mergedTabXss=1</script><img src=x onerror=alert(1)>';
    const xssSubtitle = '<svg onload=alert(1)>';

    render(
      <MergedWindowTabBar
        defaultTabs={[
          { id: '__proto__', title: '   ', subtitle: '   ' },
          { id: '__proto__', title: 'Duplicate Ignored' },
          { id: 'constructor', title: xssTitle, subtitle: xssSubtitle },
        ]}
        defaultActiveTabId="non-existent-id"
      />
    );

    const tablist = screen.getByRole('tablist', {
      name: 'Merged window tabs',
    });
    const tabs = within(tablist).getAllByRole('tab');
    expect(tabs).toHaveLength(2);

    // Fallback to first deduplicated tab with blank title fallback
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[0]).toHaveTextContent('Untitled tab');
    expect(
      within(screen.getByRole('tabpanel')).queryByText('   ')
    ).toBeNull();

    // Switch to XSS tab and ensure strict text escaping
    fireEvent.click(tabs[1]!);
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(within(screen.getByRole('tabpanel')).getByText(xssTitle)).toBeInTheDocument();
    expect(
      within(screen.getByRole('tabpanel')).getByText(xssSubtitle)
    ).toBeInTheDocument();
  });
});
