import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  MinimizedWindowTray,
  type MinimizedTrayDisplayMode,
  type MinimizedTrayDisplayModeMap,
  type MinimizedWindowItem,
  type MinimizedWindowTone,
} from './index';

const ALL_TONES_WINDOWS: ReadonlyArray<MinimizedWindowItem> = [
  {
    id: 'w-primary',
    appName: 'Studio',
    title: 'PrimaryCanvas.prism',
    minimizedAt: '1m ago',
    tone: 'primary',
  },
  {
    id: 'w-info',
    appName: 'Terminal',
    title: 'ClusterTail — zsh',
    minimizedAt: '3m ago',
    tone: 'info',
  },
  {
    id: 'w-emerald',
    appName: 'Sheets',
    title: 'Forecast_Q4.xlsx',
    minimizedAt: '7m ago',
    tone: 'emerald',
  },
  {
    id: 'w-amber',
    appName: 'Preview',
    title: 'LightingGuide.pdf',
    minimizedAt: '12m ago',
    tone: 'amber',
  },
  {
    id: 'w-rose',
    appName: 'Debugger',
    title: 'CrashDump.log',
    minimizedAt: '19m ago',
    tone: 'rose',
  },
];

describe('MinimizedWindowTray', () => {
  it('renders 4 default minimized windows in thumbnails mode with ref, theme override, responsive shelf, live count, and zero raw colors', () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <PrismThemeProvider
        theme={{
          components: {
            MinimizedWindowTray: {
              className: 'theme-minimized-tray',
              style: { maxWidth: '720px' },
            },
          },
        }}
      >
        <MinimizedWindowTray
          ref={ref}
          className="consumer-minimized-tray"
          xstyle={{ '--prism-blur-px': '16px' }}
          data-testid="tray-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('tray-root');
    expect(ref.current).toBe(root);
    expect(MinimizedWindowTray.displayName).toBe('MinimizedWindowTray');
    expect(root).toHaveClass(
      'refractor-minimized-window-tray',
      'prism-slab',
      'max-w-full',
      'min-w-0',
      'theme-minimized-tray',
      'consumer-minimized-tray'
    );
    expect(root).toHaveStyle({ maxWidth: '720px' });
    expect(root).toHaveAttribute('role', 'region');
    expect(root).toHaveAttribute('data-display-mode', 'thumbnails');
    expect(root).toHaveAttribute('data-count', '4');
    expect(root).not.toHaveAttribute('data-disabled');
    expect(root).not.toHaveAttribute('data-empty');

    // Header has title, live count badge, mode toggles, and Restore All
    expect(
      screen.getByRole('heading', { name: 'Minimized Windows' })
    ).toBeInTheDocument();
    const header = root.querySelector('[data-part="header"]');
    expect(header).toHaveClass('flex-wrap', 'min-w-0');

    const countBadge = screen.getByTestId('minimized-tray-count');
    expect(countBadge).toHaveTextContent('4');
    expect(countBadge).toHaveAttribute('aria-label', '4 minimized windows');

    const thumbnailsBtn = screen.getByRole('button', { name: 'Thumbnails' });
    const pillsBtn = screen.getByRole('button', { name: 'Glass Pills' });
    expect(thumbnailsBtn).toHaveAttribute('aria-pressed', 'true');
    expect(pillsBtn).toHaveAttribute('aria-pressed', 'false');

    const restoreAllBtn = screen.getByRole('button', { name: 'Restore All' });
    expect(restoreAllBtn).toBeEnabled();

    // Shelf has role="list" and overflow-x-auto with 4 realistic defaults
    const shelf = screen.getByRole('list', { name: 'Minimized windows' });
    expect(shelf).toHaveClass('overflow-x-auto', 'min-w-0');
    const listItems = within(shelf).getAllByRole('listitem');
    expect(listItems).toHaveLength(4);

    const expectedTitles = [
      'ShaderGraph_v3.prism',
      'ReleaseLogs — zsh',
      'Q4_Budget.xlsx',
      'BrandSpec.pdf',
    ];
    expectedTitles.forEach((expectedTitle, idx) => {
      const card = screen.getByTestId(`minimized-window-item-${idx}`);
      expect(card).toHaveAttribute('data-part', 'tray-thumbnail');
      expect(within(card).getByText(expectedTitle)).toBeInTheDocument();
      expect(
        within(card).getByRole('button', { name: `Close ${expectedTitle}` })
      ).toBeInTheDocument();
      expect(card.querySelector('[data-part="mini-titlebar"]')).not.toBeNull();
      expect(card.querySelector('[data-part="mini-viewport"]')).not.toBeNull();
    });

    // Live polite status bar
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent('4 minimized windows · Thumbnails view');

    // Zero raw hex/rgb/hsl color literals in rendered DOM
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(container.innerHTML).not.toMatch(/\b(?:rgba?|hsla?)\s*\(/);
  });

  it('switches between thumbnails and glass pills in both uncontrolled and controlled displayMode', () => {
    const modeMapKeys: ReadonlyArray<keyof MinimizedTrayDisplayModeMap> = [
      'thumbnails',
      'pills',
    ];
    expect(modeMapKeys).toHaveLength(2);

    const onDisplayModeChange = vi.fn<(mode: MinimizedTrayDisplayMode) => void>();

    const { rerender } = render(
      <MinimizedWindowTray
        defaultDisplayMode="thumbnails"
        onDisplayModeChange={onDisplayModeChange}
        data-testid="tray-mode"
      />
    );

    const root = screen.getByTestId('tray-mode');
    const thumbnailsBtn = screen.getByRole('button', { name: 'Thumbnails' });
    const pillsBtn = screen.getByRole('button', { name: 'Glass Pills' });

    // Clicking already-active Thumbnails mode is a clean no-op
    fireEvent.click(thumbnailsBtn);
    expect(onDisplayModeChange).not.toHaveBeenCalled();

    // Switch to Glass Pills
    fireEvent.click(pillsBtn);
    expect(onDisplayModeChange).toHaveBeenCalledTimes(1);
    expect(onDisplayModeChange).toHaveBeenLastCalledWith('pills');
    expect(root).toHaveAttribute('data-display-mode', 'pills');
    expect(pillsBtn).toHaveAttribute('aria-pressed', 'true');
    expect(thumbnailsBtn).toHaveAttribute('aria-pressed', 'false');

    const pill0 = screen.getByTestId('minimized-window-item-0');
    expect(pill0).toHaveAttribute('data-part', 'tray-pill');
    expect(pill0).toHaveClass('prism-crystal', 'rounded-full');
    expect(within(pill0).getByText('ShaderGraph_v3.prism')).toBeInTheDocument();
    expect(within(pill0).getByText('Prism Studio')).toBeInTheDocument();
    expect(
      within(pill0).getByRole('button', { name: 'Close ShaderGraph_v3.prism' })
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Switched minimized tray to Glass Pills view'
    );

    // Switch back to Thumbnails
    fireEvent.click(thumbnailsBtn);
    expect(onDisplayModeChange).toHaveBeenCalledTimes(2);
    expect(onDisplayModeChange).toHaveBeenLastCalledWith('thumbnails');
    expect(root).toHaveAttribute('data-display-mode', 'thumbnails');
    expect(screen.getByRole('status')).toHaveTextContent(
      'Switched minimized tray to Thumbnails view'
    );

    // Controlled displayMode stays synced to parent prop
    const controlledChange = vi.fn<(mode: MinimizedTrayDisplayMode) => void>();
    rerender(
      <MinimizedWindowTray
        displayMode="pills"
        onDisplayModeChange={controlledChange}
        data-testid="tray-mode"
      />
    );
    expect(screen.getByTestId('tray-mode')).toHaveAttribute(
      'data-display-mode',
      'pills'
    );
    expect(screen.getByRole('button', { name: 'Glass Pills' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Thumbnails' }));
    expect(controlledChange).toHaveBeenCalledTimes(1);
    expect(controlledChange).toHaveBeenLastCalledWith('thumbnails');
    // Still 'pills' until parent updates displayMode prop
    expect(screen.getByTestId('tray-mode')).toHaveAttribute(
      'data-display-mode',
      'pills'
    );
  });

  it('restores individual windows via click and IME-safe Enter/Space and handles Restore All cleanly', () => {
    const onRestoreWindow = vi.fn<(item: MinimizedWindowItem) => void>();
    const onRestoreAll =
      vi.fn<(items: ReadonlyArray<MinimizedWindowItem>) => void>();

    render(
      <MinimizedWindowTray
        onRestoreWindow={onRestoreWindow}
        onRestoreAll={onRestoreAll}
        data-testid="tray-restore"
      />
    );

    // Click restores first window (ShaderGraph_v3.prism)
    const firstRestore = screen.getByRole('button', {
      name: 'Restore ShaderGraph_v3.prism (Prism Studio)',
    });
    fireEvent.click(firstRestore);
    expect(onRestoreWindow).toHaveBeenCalledTimes(1);
    expect(onRestoreWindow.mock.calls[0]?.[0]?.id).toBe('shader-graph-v3');
    expect(screen.getByTestId('minimized-tray-count')).toHaveTextContent('3');
    expect(screen.getByRole('status')).toHaveTextContent(
      'Restored ShaderGraph_v3.prism'
    );

    // IME composing Enter/Space MUST NOT restore
    const secondRestore = screen.getByRole('button', {
      name: 'Restore ReleaseLogs — zsh (Terminal)',
    });
    const composingEnter = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(composingEnter, 'isComposing', { value: true });
    fireEvent(secondRestore, composingEnter);

    const composingSpace = new KeyboardEvent('keydown', {
      key: ' ',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(composingSpace, 'isComposing', { value: true });
    fireEvent(secondRestore, composingSpace);
    expect(onRestoreWindow).toHaveBeenCalledTimes(1);

    // Keyboard Enter restores ReleaseLogs — zsh and shifts focus to next neighbor (Q4_Budget.xlsx)
    act(() => {
      secondRestore.focus();
    });
    fireEvent.keyDown(secondRestore, { key: 'Enter' });
    expect(onRestoreWindow).toHaveBeenCalledTimes(2);
    expect(onRestoreWindow.mock.calls[1]?.[0]?.id).toBe('release-logs-zsh');
    const budgetTrigger = screen.getByRole('button', {
      name: 'Restore Q4_Budget.xlsx (Sheets)',
    });
    expect(document.activeElement).toBe(budgetTrigger);

    // Keyboard Space restores Q4_Budget.xlsx leaving 1 window (singular badge label)
    fireEvent.keyDown(budgetTrigger, { key: ' ' });
    expect(onRestoreWindow).toHaveBeenCalledTimes(3);
    expect(onRestoreWindow.mock.calls[2]?.[0]?.id).toBe('q4-budget-xlsx');
    expect(screen.getByTestId('minimized-tray-count')).toHaveAttribute(
      'aria-label',
      '1 minimized window'
    );

    // Restore All clears the remaining window cleanly and renders role="status" empty state
    const restoreAllBtn = screen.getByRole('button', { name: 'Restore All' });
    fireEvent.click(restoreAllBtn);
    expect(onRestoreAll).toHaveBeenCalledTimes(1);
    expect(onRestoreAll.mock.calls[0]?.[0]).toHaveLength(1);
    expect(onRestoreAll.mock.calls[0]?.[0]?.[0]?.id).toBe('brand-spec-pdf');

    expect(screen.getByTestId('minimized-tray-count')).toHaveTextContent('0');
    expect(restoreAllBtn).toBeDisabled();
    expect(screen.getByTestId('tray-restore')).toHaveAttribute(
      'data-empty',
      'true'
    );
    const emptyStatus = screen.getByRole('status');
    expect(emptyStatus).toBe(screen.getByTestId('minimized-tray-empty'));
    expect(emptyStatus).toHaveTextContent('No minimized windows');
    expect(screen.getByTestId('minimized-tray-status')).toHaveTextContent(
      'Restored all 1 minimized window'
    );
  });

  it('restores the final item via keyboard Enter without crashing and supports closing individual windows in both modes', () => {
    const onRestoreWindow = vi.fn<(item: MinimizedWindowItem) => void>();
    const onCloseWindow = vi.fn<(windowId: string) => void>();

    render(
      <MinimizedWindowTray
        defaultDisplayMode="pills"
        defaultItems={[
          {
            id: 'solo-1',
            appName: 'Studio',
            title: 'SoloCanvas.prism',
            minimizedAt: '1m ago',
            tone: 'primary',
          },
          {
            id: 'solo-2',
            appName: 'Preview',
            title: 'Brief.pdf',
            minimizedAt: '4m ago',
            tone: 'info',
          },
        ]}
        onRestoreWindow={onRestoreWindow}
        onCloseWindow={onCloseWindow}
      />
    );

    // Close second window in pills mode
    fireEvent.click(screen.getByRole('button', { name: 'Close Brief.pdf' }));
    expect(onCloseWindow).toHaveBeenCalledTimes(1);
    expect(onCloseWindow).toHaveBeenLastCalledWith('solo-2');
    expect(screen.getByTestId('minimized-tray-count')).toHaveTextContent('1');
    expect(screen.getByRole('status')).toHaveTextContent('Closed Brief.pdf');

    // Keyboard Enter restores the last remaining window -> empty state
    const lastTrigger = screen.getByRole('button', {
      name: 'Restore SoloCanvas.prism (Studio)',
    });
    act(() => {
      lastTrigger.focus();
    });
    fireEvent.keyDown(lastTrigger, { key: 'Enter' });
    expect(onRestoreWindow).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('minimized-tray-empty')).toBeInTheDocument();
  });

  it('supports clicking and closing individual windows in thumbnails mode and multi-item Restore All', () => {
    const onCloseWindow = vi.fn<(windowId: string) => void>();
    const onRestoreAll =
      vi.fn<(items: ReadonlyArray<MinimizedWindowItem>) => void>();

    render(
      <MinimizedWindowTray
        onCloseWindow={onCloseWindow}
        onRestoreAll={onRestoreAll}
      />
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Close Q4_Budget.xlsx' })
    );
    expect(onCloseWindow).toHaveBeenCalledWith('q4-budget-xlsx');
    expect(screen.getByTestId('minimized-tray-count')).toHaveTextContent('3');

    fireEvent.click(screen.getByRole('button', { name: 'Restore All' }));
    expect(onRestoreAll).toHaveBeenCalledTimes(1);
    expect(onRestoreAll.mock.calls[0]?.[0]).toHaveLength(3);
    expect(screen.getByTestId('minimized-tray-status')).toHaveTextContent(
      'Restored all 3 minimized windows'
    );
  });

  it('supports roving ArrowLeft/ArrowRight/Home/End keyboard navigation across tray items in both modes', () => {
    render(<MinimizedWindowTray data-testid="tray-nav" />);

    const getTriggers = () => [
      screen.getByRole('button', {
        name: 'Restore ShaderGraph_v3.prism (Prism Studio)',
      }),
      screen.getByRole('button', {
        name: 'Restore ReleaseLogs — zsh (Terminal)',
      }),
      screen.getByRole('button', {
        name: 'Restore Q4_Budget.xlsx (Sheets)',
      }),
      screen.getByRole('button', {
        name: 'Restore BrandSpec.pdf (Preview)',
      }),
    ];

    const [t0, t1, t2, t3] = getTriggers();
    expect(t0).toHaveAttribute('tabindex', '0');
    expect(t1).toHaveAttribute('tabindex', '-1');
    expect(t2).toHaveAttribute('tabindex', '-1');
    expect(t3).toHaveAttribute('tabindex', '-1');

    act(() => {
      t0!.focus();
    });

    // ArrowRight moves sequentially
    fireEvent.keyDown(t0!, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(t1);
    expect(t1).toHaveAttribute('tabindex', '0');

    // End jumps to last
    fireEvent.keyDown(t1!, { key: 'End' });
    expect(document.activeElement).toBe(t3);

    // ArrowRight wraps to first
    fireEvent.keyDown(t3!, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(t0);

    // ArrowLeft wraps to last
    fireEvent.keyDown(t0!, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(t3);

    // Home jumps to first
    fireEvent.keyDown(t3!, { key: 'Home' });
    expect(document.activeElement).toBe(t0);

    // Modifier combos and unrelated keys are ignored safely
    fireEvent.keyDown(t0!, { key: 'ArrowRight', ctrlKey: true });
    fireEvent.keyDown(t0!, { key: 'ArrowRight', altKey: true });
    fireEvent.keyDown(t0!, { key: 'ArrowRight', metaKey: true });
    fireEvent.keyDown(t0!, { key: 'Escape' });
    expect(document.activeElement).toBe(t0);

    // Switch to Glass Pills and verify roving keyboard navigation works identically
    fireEvent.click(screen.getByRole('button', { name: 'Glass Pills' }));
    const [p0, p1] = getTriggers();
    act(() => {
      p0!.focus();
    });
    fireEvent.keyDown(p0!, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(p1);
    fireEvent.keyDown(p1!, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(p0);

    // Click restore in pills mode works cleanly
    fireEvent.click(p1!);
    expect(screen.getByTestId('minimized-tray-count')).toHaveTextContent('3');
  });

  it('supports controlled items prop, empty items={[]}, and all 5 semantic tones mapped strictly to --prism-* tokens', () => {
    const onRestoreWindow = vi.fn<(item: MinimizedWindowItem) => void>();
    const onRestoreAll =
      vi.fn<(items: ReadonlyArray<MinimizedWindowItem>) => void>();
    const onCloseWindow = vi.fn<(windowId: string) => void>();

    function ControlledHarness() {
      const [windows, setWindows] =
        useState<ReadonlyArray<MinimizedWindowItem>>(ALL_TONES_WINDOWS);

      return (
        <div>
          <button
            type="button"
            onClick={() => setWindows([])}
            data-testid="clear-controlled"
          >
            Clear
          </button>
          <MinimizedWindowTray
            title="Controlled Dock"
            items={windows}
            onRestoreWindow={onRestoreWindow}
            onRestoreAll={onRestoreAll}
            onCloseWindow={onCloseWindow}
            data-testid="tray-controlled"
          />
        </div>
      );
    }

    render(<ControlledHarness />);

    const expectedToneVars: ReadonlyArray<[MinimizedWindowTone, string]> = [
      ['primary', 'var(--prism-primary-main)'],
      ['info', 'var(--prism-info-main)'],
      ['emerald', 'var(--prism-success-main)'],
      ['amber', 'var(--prism-warning-main)'],
      ['rose', 'var(--prism-error-main)'],
    ];

    expectedToneVars.forEach(([tone, cssVar], idx) => {
      const itemEl = screen.getByTestId(`minimized-window-item-${idx}`);
      expect(itemEl).toHaveAttribute('data-tone', tone);
      const dot = itemEl.querySelector('[data-part="tone-dot"]') as HTMLElement;
      expect(dot.style.backgroundColor).toBe(cssVar);
    });

    // Controlled actions fire callbacks without mutating controlled list
    fireEvent.click(
      screen.getByRole('button', { name: 'Restore PrimaryCanvas.prism (Studio)' })
    );
    expect(onRestoreWindow).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('minimized-tray-count')).toHaveTextContent('5');

    fireEvent.click(
      screen.getByRole('button', { name: 'Close CrashDump.log' })
    );
    expect(onCloseWindow).toHaveBeenCalledWith('w-rose');
    expect(screen.getByTestId('minimized-tray-count')).toHaveTextContent('5');

    fireEvent.click(screen.getByRole('button', { name: 'Restore All' }));
    expect(onRestoreAll).toHaveBeenCalledTimes(1);
    expect(onRestoreAll.mock.calls[0]?.[0]).toHaveLength(5);
    expect(screen.getByTestId('minimized-tray-count')).toHaveTextContent('5');

    // Updating controlled items to [] renders role="status" empty state
    fireEvent.click(screen.getByTestId('clear-controlled'));
    expect(screen.getByTestId('tray-controlled')).toHaveAttribute(
      'data-empty',
      'true'
    );
    expect(screen.getByRole('status')).toHaveTextContent('No minimized windows');
    expect(screen.getByRole('button', { name: 'Restore All' })).toBeDisabled();
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('renders clean empty state immediately when initialized with items={[]}', () => {
    render(<MinimizedWindowTray items={[]} data-testid="tray-empty-init" />);

    const root = screen.getByTestId('tray-empty-init');
    expect(root).toHaveAttribute('data-empty', 'true');
    expect(root).toHaveAttribute('data-count', '0');
    expect(screen.getByRole('status')).toHaveTextContent('No minimized windows');
    expect(screen.getByTestId('minimized-tray-status')).toHaveTextContent(
      'All windows restored · Tray empty'
    );
    expect(screen.getByRole('button', { name: 'Restore All' })).toBeDisabled();
  });

  it('blocks all interactions cleanly when disabled={true}', () => {
    const onDisplayModeChange = vi.fn();
    const onRestoreWindow = vi.fn();
    const onRestoreAll = vi.fn();
    const onCloseWindow = vi.fn();

    const { rerender } = render(
      <MinimizedWindowTray
        disabled
        onDisplayModeChange={onDisplayModeChange}
        onRestoreWindow={onRestoreWindow}
        onRestoreAll={onRestoreAll}
        onCloseWindow={onCloseWindow}
        data-testid="tray-disabled"
      />
    );

    const root = screen.getByTestId('tray-disabled');
    expect(root).toHaveAttribute('data-disabled', 'true');

    const thumbnailsBtn = screen.getByRole('button', { name: 'Thumbnails' });
    const pillsBtn = screen.getByRole('button', { name: 'Glass Pills' });
    const restoreAllBtn = screen.getByRole('button', { name: 'Restore All' });
    const trigger0 = screen.getByRole('button', {
      name: 'Restore ShaderGraph_v3.prism (Prism Studio)',
    });
    const close0 = screen.getByRole('button', {
      name: 'Close ShaderGraph_v3.prism',
    });

    expect(thumbnailsBtn).toBeDisabled();
    expect(pillsBtn).toBeDisabled();
    expect(restoreAllBtn).toBeDisabled();
    expect(trigger0).toBeDisabled();
    expect(trigger0).toHaveAttribute('tabindex', '-1');
    expect(close0).toBeDisabled();

    fireEvent.click(pillsBtn);
    fireEvent.click(restoreAllBtn);
    fireEvent.click(trigger0);
    fireEvent.click(close0);
    fireEvent.keyDown(trigger0, { key: 'Enter' });
    fireEvent.keyDown(trigger0, { key: 'ArrowRight' });

    expect(onDisplayModeChange).not.toHaveBeenCalled();
    expect(onRestoreWindow).not.toHaveBeenCalled();
    expect(onRestoreAll).not.toHaveBeenCalled();
    expect(onCloseWindow).not.toHaveBeenCalled();

    // Disabled state in Glass Pills mode also disables triggers and sets tabIndex=-1
    rerender(
      <MinimizedWindowTray
        disabled
        displayMode="pills"
        onDisplayModeChange={onDisplayModeChange}
        onRestoreWindow={onRestoreWindow}
        onRestoreAll={onRestoreAll}
        onCloseWindow={onCloseWindow}
        data-testid="tray-disabled"
      />
    );
    const pillTrigger0 = screen.getByRole('button', {
      name: 'Restore ShaderGraph_v3.prism (Prism Studio)',
    });
    expect(pillTrigger0).toBeDisabled();
    expect(pillTrigger0).toHaveAttribute('tabindex', '-1');
    expect(
      screen.getByRole('button', { name: 'Close ShaderGraph_v3.prism' })
    ).toBeDisabled();
  });

  it('defends against adversarial inputs: XSS literal titles, duplicate/prototype IDs, blank strings, and omitted tones', () => {
    const adversarialItems: ReadonlyArray<MinimizedWindowItem> = [
      {
        id: '__proto__',
        appName: 'SecApp',
        title: '<script>alert("xss")</script>',
        minimizedAt: '1m ago',
      },
      {
        id: '__proto__',
        appName: 'DuplicateApp',
        title: 'Duplicate Should Dedupe',
        minimizedAt: '2m ago',
      },
      {
        id: 'constructor',
        appName: '   ',
        title: '   ',
        minimizedAt: '   ',
      },
    ];

    const { container } = render(
      <MinimizedWindowTray
        title="   "
        items={adversarialItems}
        defaultDisplayMode="pills"
        data-testid="tray-adversarial"
      />
    );

    // Blank title falls back to 'Minimized Windows'
    expect(
      screen.getByRole('heading', { name: 'Minimized Windows' })
    ).toBeInTheDocument();

    // Duplicate '__proto__' deduplicated cleanly -> 2 items
    expect(screen.getByTestId('tray-adversarial')).toHaveAttribute(
      'data-count',
      '2'
    );
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.queryByText('Duplicate Should Dedupe')).toBeNull();

    // XSS payload rendered strictly as literal text, zero injected <script> nodes
    expect(
      screen.getByText('<script>alert("xss")</script>')
    ).toBeInTheDocument();
    expect(container.querySelector('script')).toBeNull();

    // Omitted tone falls back to 'primary'
    const firstItem = screen.getByTestId('minimized-window-item-0');
    expect(firstItem).toHaveAttribute('data-tone', 'primary');

    // Blank fields fall back cleanly ('Untitled window', 'App', 'Just now')
    const secondItem = screen.getByTestId('minimized-window-item-1');
    expect(within(secondItem).getByText('Untitled window')).toBeInTheDocument();
    expect(within(secondItem).getByText('App')).toBeInTheDocument();

    // Switch to thumbnails to verify 'Just now' timestamp fallback is rendered
    fireEvent.click(screen.getByRole('button', { name: 'Thumbnails' }));
    expect(screen.getByText('Just now')).toBeInTheDocument();
    expect(
      screen.getByTestId('minimized-tray-status')
    ).toBeInTheDocument();

    // Also verify idle status bar text in pills mode without prior announcement
    render(
      <MinimizedWindowTray
        defaultDisplayMode="pills"
        items={[adversarialItems[0]!]}
      />
    );
    expect(
      screen.getByText('1 minimized window · Glass Pills view')
    ).toBeInTheDocument();
  });
});
