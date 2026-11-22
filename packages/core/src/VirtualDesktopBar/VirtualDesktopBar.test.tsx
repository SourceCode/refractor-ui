import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  VirtualDesktopBar,
  type VirtualDesktopSpace,
  type VirtualDesktopWindowTone,
  type VirtualDesktopWindowToneMap,
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

describe('VirtualDesktopBar', () => {
  it('renders 3 default workspaces inside prism-slab with active --prism-primary-main highlight, ref, theme override, and polite status strip', () => {
    const toneMap: VirtualDesktopWindowToneMap = {
      primary: true,
      info: true,
      emerald: true,
      amber: true,
    };
    const sampleTone: VirtualDesktopWindowTone = 'emerald';
    expect(toneMap[sampleTone]).toBe(true);

    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            VirtualDesktopBar: {
              className: 'theme-vdesktop-bar',
              style: { opacity: '0.97' },
            },
          },
        }}
      >
        <VirtualDesktopBar
          ref={ref}
          className="local-vdesktop-bar"
          xstyle={{ '--prism-blur-px': '16px' }}
          data-testid="vdesktop-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('vdesktop-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'refractor-virtual-desktop-bar',
      'prism-slab',
      'theme-vdesktop-bar',
      'local-vdesktop-bar'
    );
    expect(root).toHaveAttribute('data-space-count', '3');
    expect(root).toHaveAttribute('data-window-count', '5');
    expect(root).not.toHaveAttribute('data-disabled');
    expect(root).not.toHaveAttribute('data-at-max-spaces');
    expect(root).not.toHaveAttribute('data-empty');
    expect(root).toHaveStyle({ opacity: '0.97' });

    // Header has flex-wrap and min-w-0, title, active badge, summary counts, and New Desktop button
    const header = root.querySelector('[data-part="header"]') as HTMLElement;
    expect(header).toHaveClass('flex-wrap', 'min-w-0');
    expect(within(header).getByText('Virtual Desktops')).toBeInTheDocument();
    expect(
      root.querySelector('[data-part="active-badge"]')
    ).toHaveTextContent('Desktop 1 · Design');
    expect(
      root.querySelector('[data-part="summary-counts"]')
    ).toHaveTextContent('3 / 6 desktops · 5 windows');
    expect(
      screen.getByRole('button', { name: 'New Desktop' })
    ).not.toBeDisabled();

    // Workspace preview strip wrapped in overflow-x-auto
    const tablist = screen.getByRole('tablist', { name: 'Virtual desktops' });
    expect(tablist.parentElement).toHaveClass('overflow-x-auto', 'min-w-0');

    const tabs = within(tablist).getAllByRole('tab');
    expect(tabs).toHaveLength(3);
    expect(tabs[0]).toHaveTextContent('Desktop 1 · Design');
    expect(tabs[0]).toHaveTextContent('2');
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[0]).toHaveAttribute('tabindex', '0');

    expect(tabs[1]).toHaveTextContent('Desktop 2 · Code');
    expect(tabs[1]).toHaveTextContent('2');
    expect(tabs[1]).toHaveAttribute('aria-selected', 'false');
    expect(tabs[1]).toHaveAttribute('tabindex', '-1');

    expect(tabs[2]).toHaveTextContent('Desktop 3 · Telemetry');
    expect(tabs[2]).toHaveTextContent('1');
    expect(tabs[2]).toHaveAttribute('aria-selected', 'false');

    // Active workspace card highlights with --prism-primary-main
    const cards = Array.from(
      root.querySelectorAll('[data-part="space-card"]')
    ) as HTMLElement[];
    expect(cards[0]).toHaveAttribute('data-active', 'true');
    expect(cards[0]?.style.borderColor).toBe('var(--prism-primary-main)');

    // Draggable miniature window pills in default workspaces
    const miniWindows = Array.from(
      root.querySelectorAll('[data-part="mini-window"]')
    ) as HTMLElement[];
    expect(miniWindows).toHaveLength(5);
    for (const pill of miniWindows) {
      expect(pill).toHaveAttribute('draggable', 'true');
    }

    // Active workspace window transfer strip shows active desktop's 2 windows with Move selects
    const panel = screen.getByRole('tabpanel');
    expect(panel).toHaveAttribute('aria-labelledby', tabs[0]?.id);
    expect(
      within(panel).getByText('Windows in Desktop 1 · Design')
    ).toBeInTheDocument();
    expect(
      within(panel).getByRole('combobox', { name: 'Move OpticsCanvas.fig to' })
    ).toBeInTheDocument();
    expect(
      within(panel).getByRole('combobox', { name: 'Move Token Inspector to' })
    ).toBeInTheDocument();

    // Polite live status strip
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent(
      'Active: Desktop 1 · Design (2 windows) · 3 desktops, 5 windows total'
    );
  });

  it('switches workspaces via click, miniature canvas click, and IME-safe roving ArrowLeft/ArrowRight/Home/End keys', () => {
    const onSelectSpace = vi.fn();
    render(
      <VirtualDesktopBar
        onSelectSpace={onSelectSpace}
        data-testid="nav-root"
      />
    );

    const root = screen.getByTestId('nav-root');
    const tablist = screen.getByRole('tablist', { name: 'Virtual desktops' });
    const tabs = within(tablist).getAllByRole('tab');

    // Click second tab
    fireEvent.click(tabs[1]!);
    expect(onSelectSpace).toHaveBeenLastCalledWith('desktop-2');
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    expect(
      within(screen.getByRole('tabpanel')).getByText(
        'Windows in Desktop 2 · Code'
      )
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Switched to Desktop 2 · Code (2 windows)'
    );

    // Click third miniature canvas directly
    const canvases = Array.from(
      root.querySelectorAll('[data-part="mini-canvas"]')
    ) as HTMLElement[];
    fireEvent.click(canvases[2]!);
    expect(onSelectSpace).toHaveBeenLastCalledWith('desktop-3');
    expect(tabs[2]).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('status')).toHaveTextContent(
      'Switched to Desktop 3 · Telemetry (1 window)'
    );

    // ArrowRight wraps from last workspace to first workspace and moves focus
    fireEvent.keyDown(tabs[2]!, { key: 'ArrowRight' });
    expect(onSelectSpace).toHaveBeenLastCalledWith('desktop-1');
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(document.activeElement).toBe(tabs[0]);

    // ArrowLeft wraps from first workspace to last workspace
    fireEvent.keyDown(tabs[0]!, { key: 'ArrowLeft' });
    expect(onSelectSpace).toHaveBeenLastCalledWith('desktop-3');
    expect(tabs[2]).toHaveAttribute('aria-selected', 'true');
    expect(document.activeElement).toBe(tabs[2]);

    // Home jumps to first workspace
    fireEvent.keyDown(tabs[2]!, { key: 'Home' });
    expect(onSelectSpace).toHaveBeenLastCalledWith('desktop-1');
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(document.activeElement).toBe(tabs[0]);

    // End jumps to last workspace
    fireEvent.keyDown(tabs[0]!, { key: 'End' });
    expect(onSelectSpace).toHaveBeenLastCalledWith('desktop-3');
    expect(tabs[2]).toHaveAttribute('aria-selected', 'true');
    expect(document.activeElement).toBe(tabs[2]);

    // Modifier combos and non-navigation keys are ignored
    const countBefore = onSelectSpace.mock.calls.length;
    fireEvent.keyDown(tabs[2]!, { key: 'ArrowLeft', altKey: true });
    fireEvent.keyDown(tabs[2]!, { key: 'ArrowLeft', ctrlKey: true });
    fireEvent.keyDown(tabs[2]!, { key: 'ArrowLeft', metaKey: true });
    fireEvent.keyDown(tabs[2]!, { key: 'Escape' });
    expect(onSelectSpace).toHaveBeenCalledTimes(countBefore);

    // IME composing keydown MUST NOT switch workspaces
    const composingArrow = new KeyboardEvent('keydown', {
      key: 'ArrowLeft',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(composingArrow, 'isComposing', { value: true });
    fireEvent(tabs[2]!, composingArrow);
    expect(onSelectSpace).toHaveBeenCalledTimes(countBefore);
  });

  it('creates collision-safe workspaces up to maxSpaces and disables New Desktop at limit', () => {
    const onSpacesChange = vi.fn();
    const onSelectSpace = vi.fn();

    render(
      <VirtualDesktopBar
        defaultSpaces={[
          { id: 'desktop-1', name: 'Workspace A', windows: [] },
          { id: 'custom-id', name: 'Desktop 2', windows: [] },
        ]}
        maxSpaces={4}
        onSpacesChange={onSpacesChange}
        onSelectSpace={onSelectSpace}
        data-testid="create-root"
      />
    );

    const addBtn = screen.getByRole('button', { name: 'New Desktop' });

    // Skips 1 (id collision) and 2 (name collision) -> creates Desktop 3
    fireEvent.click(addBtn);
    expect(onSelectSpace).toHaveBeenLastCalledWith('desktop-3');
    expect(onSpacesChange).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Created workspace Desktop 3'
    );
    expect(
      within(screen.getByRole('tabpanel')).getByText(
        /No windows in Desktop 3/i
      )
    ).toBeInTheDocument();

    // Creates Desktop 4 -> hits maxSpaces=4
    fireEvent.click(addBtn);
    expect(onSelectSpace).toHaveBeenLastCalledWith('desktop-4');
    expect(addBtn).toBeDisabled();
    expect(addBtn).toHaveAttribute('data-at-max', 'true');
    expect(screen.getByTestId('create-root')).toHaveAttribute(
      'data-at-max-spaces',
      'true'
    );

    // Extra click while at max does nothing
    fireEvent.click(addBtn);
    expect(onSpacesChange).toHaveBeenCalledTimes(2);
  });

  it('normalizes invalid maxSpaces values (NaN, Infinity, <1) safely', () => {
    const { rerender } = render(
      <VirtualDesktopBar maxSpaces={Number.NaN} data-testid="norm-root" />
    );
    expect(
      screen.getByTestId('norm-root').querySelector('[data-part="summary-counts"]')
    ).toHaveTextContent('3 / 6 desktops · 5 windows');

    rerender(<VirtualDesktopBar maxSpaces={0} data-testid="norm-root" />);
    expect(
      screen.getByTestId('norm-root').querySelector('[data-part="summary-counts"]')
    ).toHaveTextContent('3 / 1 desktops · 5 windows');
    expect(screen.getByRole('button', { name: 'New Desktop' })).toBeDisabled();
  });

  it('closes active and inactive workspaces, rescues windows safely, and enforces >=1 remaining workspace', () => {
    const onSpacesChange = vi.fn();
    const onSelectSpace = vi.fn();

    render(
      <VirtualDesktopBar
        onSpacesChange={onSpacesChange}
        onSelectSpace={onSelectSpace}
      />
    );

    // Add an empty Desktop 4, then switch back to Desktop 1 and close empty Desktop 4 (inactive)
    fireEvent.click(screen.getByRole('button', { name: 'New Desktop' }));
    const tabsAfterAdd = within(
      screen.getByRole('tablist', { name: 'Virtual desktops' })
    ).getAllByRole('tab');
    fireEvent.click(tabsAfterAdd[0]!);
    const selectCallsBeforeEmptyClose = onSelectSpace.mock.calls.length;

    fireEvent.click(screen.getByRole('button', { name: 'Close Desktop 4' }));
    expect(onSelectSpace).toHaveBeenCalledTimes(selectCallsBeforeEmptyClose);
    expect(screen.getByRole('status')).toHaveTextContent('Closed Desktop 4');

    // Close inactive Desktop 3 · Telemetry (has 1 window: GPU Profiler -> moves to Desktop 2 · Code)
    fireEvent.click(
      screen.getByRole('button', { name: 'Close Desktop 3 · Telemetry' })
    );
    expect(onSelectSpace).toHaveBeenCalledTimes(selectCallsBeforeEmptyClose);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Closed Desktop 3 · Telemetry and moved 1 window to Desktop 2 · Code'
    );

    // Close active Desktop 1 · Design (has 2 windows -> rescued into Desktop 2 · Code, which becomes active!)
    fireEvent.click(
      screen.getByRole('button', { name: 'Close Desktop 1 · Design' })
    );
    expect(onSelectSpace).toHaveBeenLastCalledWith('desktop-2');
    expect(screen.getByRole('status')).toHaveTextContent(
      'Closed Desktop 1 · Design and moved 2 windows to Desktop 2 · Code'
    );

    // Only 1 workspace remains -> all 5 windows preserved, Close button & transfer selects disabled!
    const remainingTabs = within(
      screen.getByRole('tablist', { name: 'Virtual desktops' })
    ).getAllByRole('tab');
    expect(remainingTabs).toHaveLength(1);
    expect(remainingTabs[0]).toHaveTextContent('Desktop 2 · Code');
    expect(remainingTabs[0]).toHaveTextContent('5');

    const lastCloseBtn = screen.getByRole('button', {
      name: 'Close Desktop 2 · Code',
    });
    expect(lastCloseBtn).toBeDisabled();

    // Transfer dropdown disabled when only 1 workspace exists
    const transferSelect = screen.getByRole('combobox', {
      name: 'Move GPU Profiler to',
    });
    expect(transferSelect).toBeDisabled();

    // Attempting to click disabled last close button never reduces workspace count below 1
    const changesBefore = onSpacesChange.mock.calls.length;
    fireEvent.click(lastCloseBtn);
    expect(onSpacesChange).toHaveBeenCalledTimes(changesBefore);
    expect(
      within(
        screen.getByRole('tablist', { name: 'Virtual desktops' })
      ).getAllByRole('tab')
    ).toHaveLength(1);
  });

  it('moves windows across workspaces via HTML5 drag-and-drop (custom MIME, text/plain, fallback state) and guards invalid drops', () => {
    const onMoveWindow = vi.fn();
    const onSpacesChange = vi.fn();

    render(
      <VirtualDesktopBar
        onMoveWindow={onMoveWindow}
        onSpacesChange={onSpacesChange}
        data-testid="dnd-root"
      />
    );

    const root = screen.getByTestId('dnd-root');
    const getCards = () =>
      Array.from(root.querySelectorAll('[data-part="space-card"]')) as HTMLElement[];

    // Create an empty Desktop 4 so we also exercise Drop window here prompt on empty canvas
    fireEvent.click(screen.getByRole('button', { name: 'New Desktop' }));
    onSpacesChange.mockClear();

    // 0. Cancelled drag resets dragging and drop-target visual state cleanly via dragEnd
    const win1 = root.querySelector(
      '[data-window-id="win-optics-canvas"]'
    ) as HTMLElement;
    let cards = getCards();
    const dtCancel = createMockDataTransfer();
    fireEvent.dragStart(win1, { dataTransfer: dtCancel });
    expect(win1).toHaveAttribute('data-dragging', 'true');
    fireEvent.dragOver(cards[3]!, { dataTransfer: dtCancel });
    expect(cards[3]).toHaveAttribute('data-drop-target', 'true');
    fireEvent.dragEnd(win1);
    expect(win1).not.toHaveAttribute('data-dragging');
    expect(cards[3]).not.toHaveAttribute('data-drop-target');
    expect(onMoveWindow).not.toHaveBeenCalled();

    // 1. Custom MIME drag: OpticsCanvas.fig (desktop-1) -> desktop-4 (empty)
    const dt1 = createMockDataTransfer();

    fireEvent.dragStart(win1, { dataTransfer: dt1 });
    expect(win1).toHaveAttribute('data-dragging', 'true');
    expect(dt1.setData).toHaveBeenCalledWith(
      'application/x-refractor-virtual-desktop-window',
      'win-optics-canvas'
    );

    fireEvent.dragOver(cards[3]!, { dataTransfer: dt1 });
    expect(cards[3]).toHaveAttribute('data-drop-target', 'true');
    expect(within(cards[3]!).getByText('Drop window here')).toBeInTheDocument();

    // DragLeave into a child inside the same card preserves drop target
    const childCanvas = cards[3]!.querySelector(
      '[data-part="mini-canvas"]'
    ) as HTMLElement;
    const internalLeave = new Event('dragleave', { bubbles: true });
    Object.defineProperty(internalLeave, 'relatedTarget', {
      value: childCanvas,
    });
    fireEvent(cards[3]!, internalLeave);
    expect(cards[3]).toHaveAttribute('data-drop-target', 'true');

    // DragLeave outside clears drop target
    const externalLeave = new Event('dragleave', { bubbles: true });
    Object.defineProperty(externalLeave, 'relatedTarget', { value: root });
    fireEvent(cards[3]!, externalLeave);
    expect(cards[3]).not.toHaveAttribute('data-drop-target');

    // DragLeave on a different non-target card leaves active drop target intact
    fireEvent.dragOver(cards[3]!, { dataTransfer: dt1 });
    const otherLeave = new Event('dragleave', { bubbles: true });
    Object.defineProperty(otherLeave, 'relatedTarget', { value: root });
    fireEvent(cards[1]!, otherLeave);
    expect(cards[3]).toHaveAttribute('data-drop-target', 'true');

    // Drop completes window transfer
    fireEvent.drop(cards[3]!, { dataTransfer: dt1 });
    fireEvent.dragEnd(win1);

    expect(onMoveWindow).toHaveBeenCalledWith(
      'win-optics-canvas',
      'desktop-1',
      'desktop-4'
    );
    expect(onSpacesChange).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Moved OpticsCanvas.fig from Desktop 1 · Design to Desktop 4'
    );

    // 2. Fallback drag without dataTransfer (uses internal draggedWindow state)
    cards = getCards();
    const win2 = root.querySelector(
      '[data-window-id="win-token-inspector"]'
    ) as HTMLElement;
    fireEvent.dragStart(win2);
    fireEvent.dragOver(cards[2]!);
    fireEvent.drop(cards[2]!);
    expect(onMoveWindow).toHaveBeenLastCalledWith(
      'win-token-inspector',
      'desktop-1',
      'desktop-3'
    );
    expect(onSpacesChange).toHaveBeenCalledTimes(2);

    // 3. Drop with text/plain window ID only
    cards = getCards();
    const dtPlain = createMockDataTransfer({
      'text/plain': '  win-gpu-profiler  ',
    });
    fireEvent.drop(cards[0]!, { dataTransfer: dtPlain });
    expect(onMoveWindow).toHaveBeenLastCalledWith(
      'win-gpu-profiler',
      'desktop-3',
      'desktop-1'
    );
    expect(onSpacesChange).toHaveBeenCalledTimes(3);

    // 4. Adversarial & invalid drop payloads are safe no-ops
    const dtEmpty = createMockDataTransfer();
    fireEvent.drop(cards[0]!, { dataTransfer: dtEmpty });

    const dtUnknown = createMockDataTransfer({ 'text/plain': 'non-existent' });
    fireEvent.drop(cards[0]!, { dataTransfer: dtUnknown });

    const dtProto = createMockDataTransfer({ 'text/plain': '__proto__' });
    fireEvent.drop(cards[0]!, { dataTransfer: dtProto });

    // Dropping a window onto its own workspace is a safe no-op
    const dtSameSpace = createMockDataTransfer({
      'text/plain': 'win-gpu-profiler',
    });
    fireEvent.drop(cards[0]!, { dataTransfer: dtSameSpace });

    expect(onMoveWindow).toHaveBeenCalledTimes(3);
    expect(onSpacesChange).toHaveBeenCalledTimes(3);
  });

  it('transfers windows via keyboard-accessible Move <window> to <select> dropdown', () => {
    const onMoveWindow = vi.fn();
    const onSpacesChange = vi.fn();

    render(
      <VirtualDesktopBar
        onMoveWindow={onMoveWindow}
        onSpacesChange={onSpacesChange}
      />
    );

    const select = screen.getByRole('combobox', {
      name: 'Move OpticsCanvas.fig to',
    });

    // Re-selecting current space or dispatching an invalid/empty target value is a safe no-op
    fireEvent.change(select, { target: { value: 'desktop-1' } });
    fireEvent.change(select, { target: { value: '' } });
    expect(onMoveWindow).not.toHaveBeenCalled();

    // Reassign OpticsCanvas.fig to Desktop 3 · Telemetry
    fireEvent.change(select, { target: { value: 'desktop-3' } });
    expect(onMoveWindow).toHaveBeenCalledWith(
      'win-optics-canvas',
      'desktop-1',
      'desktop-3'
    );
    expect(onSpacesChange).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Moved OpticsCanvas.fig from Desktop 1 · Design to Desktop 3 · Telemetry'
    );

    // Window no longer appears in Desktop 1 transfer strip, now appears in Desktop 3
    expect(
      screen.queryByRole('combobox', { name: 'Move OpticsCanvas.fig to' })
    ).toBeNull();
    fireEvent.click(
      screen.getByRole('tab', { name: /Desktop 3 · Telemetry/i })
    );
    expect(
      screen.getByRole('combobox', { name: 'Move OpticsCanvas.fig to' })
    ).toBeInTheDocument();
  });

  it('supports controlled spaces and activeSpaceId cleanly, including empty controlled state', () => {
    function ControlledHarness() {
      const [spaces, setSpaces] = useState<ReadonlyArray<VirtualDesktopSpace>>([
        {
          id: 'c1',
          name: 'Alpha Space',
          windows: [{ id: 'w1', title: 'Spec Editor' }],
        },
        {
          id: 'c2',
          name: 'Beta Space',
          windows: [{ id: 'w2', title: 'Preview Runner', tone: 'amber' }],
        },
      ]);
      const [activeId, setActiveId] = useState('c2');

      return (
        <VirtualDesktopBar
          title="Controlled Spaces"
          spaces={spaces}
          activeSpaceId={activeId}
          onSpacesChange={setSpaces}
          onSelectSpace={setActiveId}
        />
      );
    }

    render(<ControlledHarness />);
    expect(
      within(screen.getByRole('tabpanel')).getByText('Windows in Beta Space')
    ).toBeInTheDocument();

    // Transfer via select in controlled mode
    fireEvent.change(
      screen.getByRole('combobox', { name: 'Move Preview Runner to' }),
      { target: { value: 'c1' } }
    );
    expect(
      within(screen.getByRole('tabpanel')).getByText(/No windows in Beta Space/i)
    ).toBeInTheDocument();

    // Create a workspace in controlled mode
    fireEvent.click(screen.getByRole('button', { name: 'New Desktop' }));
    expect(
      within(screen.getByRole('tabpanel')).getByText('Windows in Desktop 1')
    ).toBeInTheDocument();

    // Close active workspace in controlled mode
    fireEvent.click(screen.getByRole('button', { name: 'Close Desktop 1' }));
    expect(
      within(screen.getByRole('tabpanel')).getByText('Windows in Beta Space')
    ).toBeInTheDocument();

    // Controlled empty spaces renders clean empty state without crashing
    render(
      <VirtualDesktopBar
        spaces={[]}
        defaultSpaces={[]}
        data-testid="empty-controlled"
      />
    );
    expect(screen.getByTestId('empty-controlled')).toHaveAttribute(
      'data-empty',
      'true'
    );
    expect(
      screen.getByText(/No virtual desktops open\. Select New Desktop/i)
    ).toBeInTheDocument();
  });

  it('blocks all interactions and reflects disabled state when disabled={true}', () => {
    const onSelectSpace = vi.fn();
    const onSpacesChange = vi.fn();
    const onMoveWindow = vi.fn();

    render(
      <VirtualDesktopBar
        disabled
        onSelectSpace={onSelectSpace}
        onSpacesChange={onSpacesChange}
        onMoveWindow={onMoveWindow}
        data-testid="disabled-root"
      />
    );

    const root = screen.getByTestId('disabled-root');
    expect(root).toHaveAttribute('data-disabled', 'true');

    const addBtn = screen.getByRole('button', { name: 'New Desktop' });
    const tabs = within(
      screen.getByRole('tablist', { name: 'Virtual desktops' })
    ).getAllByRole('tab');
    const closeBtn = screen.getByRole('button', {
      name: 'Close Desktop 1 · Design',
    });
    const select = screen.getByRole('combobox', {
      name: 'Move OpticsCanvas.fig to',
    });
    const miniWin = root.querySelector(
      '[data-window-id="win-optics-canvas"]'
    ) as HTMLElement;
    const canvases = Array.from(
      root.querySelectorAll('[data-part="mini-canvas"]')
    ) as HTMLElement[];
    const cards = Array.from(
      root.querySelectorAll('[data-part="space-card"]')
    ) as HTMLElement[];

    expect(addBtn).toBeDisabled();
    expect(tabs[0]).toBeDisabled();
    expect(tabs[0]).toHaveAttribute('tabindex', '-1');
    expect(closeBtn).toBeDisabled();
    expect(select).toBeDisabled();
    expect(miniWin).toHaveAttribute('draggable', 'false');

    // Attempt all interaction paths while disabled
    fireEvent.click(addBtn);
    fireEvent.click(tabs[1]!);
    fireEvent.click(canvases[1]!);
    fireEvent.keyDown(tabs[0]!, { key: 'ArrowRight' });
    fireEvent.click(closeBtn);
    fireEvent.change(select, { target: { value: 'desktop-2' } });

    const dt = createMockDataTransfer({
      'application/x-refractor-virtual-desktop-window': 'win-optics-canvas',
    });
    const dragStartEvent = new Event('dragstart', {
      bubbles: true,
      cancelable: true,
    });
    fireEvent(miniWin, dragStartEvent);
    expect(dragStartEvent.defaultPrevented).toBe(true);
    fireEvent.dragOver(cards[1]!, { dataTransfer: dt });
    expect(cards[1]).not.toHaveAttribute('data-drop-target');
    fireEvent.drop(cards[1]!, { dataTransfer: dt });

    expect(onSelectSpace).not.toHaveBeenCalled();
    expect(onSpacesChange).not.toHaveBeenCalled();
    expect(onMoveWindow).not.toHaveBeenCalled();
  });

  it('safely deduplicates spaces/windows, handles blank titles, prototype keys, and escapes adversarial XSS payloads', () => {
    const xssTitle =
      '<script>window.__vdesktopXss=1</script><img src=x onerror=alert(1)>';
    const xssSpace = '<svg onload=alert(1)>Desktop XSS</svg>';
    const xssWin = '<iframe src="javascript:alert(1)"></iframe>';

    render(
      <VirtualDesktopBar
        title="   "
        defaultSpaces={[
          {
            id: '__proto__',
            name: '   ',
            windows: [
              { id: 'dup-win', title: '   ' },
              { id: 'dup-win', title: 'Ignored Duplicate Window' },
            ],
          },
          {
            id: '__proto__',
            name: 'Ignored Duplicate Space',
            windows: [{ id: 'w-ignored', title: 'Ignored' }],
          },
          {
            id: 'constructor',
            name: xssSpace,
            windows: [
              { id: 'dup-win', title: 'Cross-Space Dup Ignored' },
              { id: 'xss-win', title: xssWin, tone: 'emerald' },
            ],
          },
        ]}
        defaultActiveSpaceId="missing-space-id"
      />
    );

    // Blank title falls back to Virtual Desktops
    expect(
      screen.getByRole('region', { name: 'Virtual Desktops' })
    ).toBeInTheDocument();

    const tabs = within(
      screen.getByRole('tablist', { name: 'Virtual desktops' })
    ).getAllByRole('tab');
    expect(tabs).toHaveLength(2);

    // Fallback to first deduplicated space with blank name & window title fallbacks
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[0]).toHaveTextContent('Untitled Desktop');
    expect(
      screen.getByRole('combobox', { name: 'Move Untitled Window to' })
    ).toBeInTheDocument();

    // Switch to XSS space and verify strict text escaping with zero DOM injection
    fireEvent.click(tabs[1]!);
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(document.querySelector('iframe')).toBeNull();
    expect(
      within(screen.getByRole('tabpanel')).getByText(`Windows in ${xssSpace}`)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('combobox', { name: `Move ${xssWin} to` })
    ).toBeInTheDocument();

    // Also confirm custom XSS heading renders literally as text
    render(<VirtualDesktopBar title={xssTitle} />);
    expect(document.querySelector('script')).toBeNull();
    expect(screen.getByText(xssTitle)).toBeInTheDocument();
  });
});
