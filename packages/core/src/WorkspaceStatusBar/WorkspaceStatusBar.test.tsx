import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  WorkspaceStatusBar,
  type StatusBarTone,
  type StatusSyncState,
  type StatusSyncStateMap,
  type WorkspaceStatusItem,
} from './index';

describe('WorkspaceStatusBar', () => {
  it('renders defaults, React 19 ref, PrismThemeProvider overrides, responsive classes, and zero raw color literals', () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <PrismThemeProvider
        theme={{
          components: {
            WorkspaceStatusBar: {
              className: 'theme-status-bar',
              style: { maxWidth: '1024px' },
            },
          },
        }}
      >
        <WorkspaceStatusBar
          ref={ref}
          className="consumer-status-bar"
          xstyle={{ '--prism-blur-px': '14px' }}
          data-testid="wsb-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('wsb-root');
    expect(ref.current).toBe(root);
    expect(WorkspaceStatusBar.displayName).toBe('WorkspaceStatusBar');
    expect(root).toHaveAttribute('role', 'status');
    expect(root).toHaveAttribute('aria-label', 'Workspace status bar');
    expect(root).toHaveClass(
      'refractor-workspace-status-bar',
      'prism-slab',
      'flex-wrap',
      'min-w-0',
      'max-w-full',
      'theme-status-bar',
      'consumer-status-bar'
    );
    expect(root).toHaveStyle({ maxWidth: '1024px' });
    expect(root).toHaveAttribute('data-sync-state', 'synced');
    expect(root).not.toHaveAttribute('data-has-errors');
    expect(root).toHaveAttribute('data-has-warnings', 'true');
    expect(root).not.toHaveAttribute('data-has-task');

    const leftZone = screen.getByTestId('workspace-status-left');
    const rightZone = screen.getByTestId('workspace-status-right');

    const branchBtn = within(leftZone).getByTestId('workspace-status-branch');
    expect(branchBtn).toHaveTextContent('main');
    expect(branchBtn).toHaveAttribute('aria-label', 'Git branch: main');

    const syncBtn = within(leftZone).getByTestId('workspace-status-sync');
    expect(syncBtn).toHaveTextContent('Synced');
    expect(syncBtn).toHaveAttribute('data-sync-state', 'synced');
    expect(syncBtn.style.color).toBe('var(--prism-success-main)');

    const diagnosticsBtn = within(leftZone).getByTestId(
      'workspace-status-diagnostics'
    );
    expect(diagnosticsBtn).toHaveAttribute(
      'aria-label',
      '0 errors, 2 warnings'
    );
    expect(screen.getByTestId('workspace-status-errors')).toHaveTextContent(
      '0'
    );
    expect(screen.getByTestId('workspace-status-errors').style.color).toBe(
      'var(--prism-text-secondary)'
    );
    expect(screen.getByTestId('workspace-status-warnings')).toHaveTextContent(
      '2'
    );
    expect(screen.getByTestId('workspace-status-warnings').style.color).toBe(
      'var(--prism-warning-main)'
    );

    expect(screen.queryByTestId('workspace-status-task')).toBeNull();

    const cursorBtn = within(rightZone).getByTestId('workspace-status-cursor');
    expect(cursorBtn).toHaveTextContent('Ln 142, Col 28');
    expect(cursorBtn).toHaveAttribute(
      'aria-label',
      'Cursor position: Line 142, Column 28'
    );

    const encodingBtn = within(rightZone).getByTestId(
      'workspace-status-encoding'
    );
    expect(encodingBtn).toHaveTextContent('UTF-8');
    expect(encodingBtn).toHaveAttribute('aria-label', 'File encoding: UTF-8');

    const languageBtn = within(rightZone).getByTestId(
      'workspace-status-language'
    );
    expect(languageBtn).toHaveTextContent('TypeScript React');
    expect(languageBtn).toHaveAttribute(
      'aria-label',
      'Language mode: TypeScript React'
    );

    // Zero raw hex/rgb/hsl color literals in rendered DOM
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(container.innerHTML).not.toMatch(/\b(?:rgba?|hsla?)\s*\(/);
  });

  it('renders all four StatusSyncState variants with semantic --prism-* colors and animation', () => {
    const mapKeys: ReadonlyArray<keyof StatusSyncStateMap> = [
      'synced',
      'syncing',
      'dirty',
      'offline',
    ];
    expect(mapKeys).toHaveLength(4);

    const states: ReadonlyArray<{
      state: StatusSyncState;
      label: string;
      ariaLabel: string;
      colorVar: string;
      spinning: boolean;
    }> = [
      {
        state: 'synced',
        label: 'Synced',
        ariaLabel: 'Sync state: Synced',
        colorVar: 'var(--prism-success-main)',
        spinning: false,
      },
      {
        state: 'syncing',
        label: 'Syncing',
        ariaLabel: 'Sync state: Syncing',
        colorVar: 'var(--prism-info-main)',
        spinning: true,
      },
      {
        state: 'dirty',
        label: 'Dirty',
        ariaLabel: 'Sync state: Uncommitted changes',
        colorVar: 'var(--prism-warning-main)',
        spinning: false,
      },
      {
        state: 'offline',
        label: 'Offline',
        ariaLabel: 'Sync state: Offline',
        colorVar: 'var(--prism-error-main)',
        spinning: false,
      },
    ];

    const { rerender } = render(
      <WorkspaceStatusBar syncState="synced" data-testid="wsb-sync-root" />
    );

    for (const spec of states) {
      rerender(
        <WorkspaceStatusBar
          syncState={spec.state}
          data-testid="wsb-sync-root"
        />
      );
      expect(screen.getByTestId('wsb-sync-root')).toHaveAttribute(
        'data-sync-state',
        spec.state
      );

      const syncBtn = screen.getByTestId('workspace-status-sync');
      expect(syncBtn).toHaveTextContent(spec.label);
      expect(syncBtn).toHaveAttribute('aria-label', spec.ariaLabel);
      expect(syncBtn.style.color).toBe(spec.colorVar);

      const syncIcon = screen.getByTestId('workspace-status-sync-icon');
      expect(syncIcon.style.color).toBe(spec.colorVar);
      if (spec.spinning) {
        expect(syncIcon).toHaveClass('animate-spin');
      } else {
        expect(syncIcon).not.toHaveClass('animate-spin');
      }
    }
  });

  it('formats singular/plural diagnostics counts and highlights errors and zero-warning states', () => {
    const { rerender } = render(
      <WorkspaceStatusBar
        errorsCount={1}
        warningsCount={1}
        data-testid="wsb-diag-root"
      />
    );

    const root = screen.getByTestId('wsb-diag-root');
    expect(root).toHaveAttribute('data-has-errors', 'true');
    expect(root).toHaveAttribute('data-has-warnings', 'true');
    expect(screen.getByTestId('workspace-status-diagnostics')).toHaveAttribute(
      'aria-label',
      '1 error, 1 warning'
    );
    expect(screen.getByTestId('workspace-status-errors').style.color).toBe(
      'var(--prism-error-main)'
    );
    expect(screen.getByTestId('workspace-status-warnings').style.color).toBe(
      'var(--prism-warning-main)'
    );

    rerender(
      <WorkspaceStatusBar
        errorsCount={4}
        warningsCount={0}
        data-testid="wsb-diag-root"
      />
    );

    expect(root).toHaveAttribute('data-has-errors', 'true');
    expect(root).not.toHaveAttribute('data-has-warnings');
    expect(screen.getByTestId('workspace-status-diagnostics')).toHaveAttribute(
      'aria-label',
      '4 errors, 0 warnings'
    );
    expect(screen.getByTestId('workspace-status-warnings').style.color).toBe(
      'var(--prism-text-secondary)'
    );
  });

  it('renders background task label and compact inline role="progressbar" across running, complete, progress-only, and clamped states', () => {
    const { rerender } = render(
      <WorkspaceStatusBar
        backgroundTaskLabel="Indexing 238 symbols"
        data-testid="wsb-task-root"
      />
    );

    expect(screen.getByTestId('wsb-task-root')).toHaveAttribute(
      'data-has-task',
      'true'
    );
    const taskBtn = screen.getByTestId('workspace-status-task');
    expect(taskBtn).toHaveAttribute('aria-label', 'Indexing 238 symbols');
    expect(screen.getByTestId('workspace-status-task-label')).toHaveTextContent(
      'Indexing 238 symbols'
    );
    expect(screen.getByTestId('workspace-status-task-icon')).toHaveClass(
      'animate-spin'
    );
    expect(screen.queryByRole('progressbar')).toBeNull();

    // Label + in-progress percentage
    rerender(
      <WorkspaceStatusBar
        backgroundTaskLabel="Indexing 238 symbols"
        backgroundTaskProgressPct={64}
        data-testid="wsb-task-root"
      />
    );

    expect(screen.getByTestId('workspace-status-task')).toHaveAttribute(
      'aria-label',
      'Indexing 238 symbols (64%)'
    );
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-label', 'Indexing 238 symbols');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
    expect(bar).toHaveAttribute('aria-valuenow', '64');
    expect(bar).toHaveAttribute('aria-valuetext', '64%');

    const fill = screen.getByTestId('workspace-status-task-progress-fill');
    expect(fill.style.width).toBe('64%');
    expect(fill.style.backgroundColor).toBe('var(--prism-info-main)');
    expect(screen.getByTestId('workspace-status-task-pct')).toHaveTextContent(
      '64%'
    );

    // Completed 100% progress switches icon and fill to success token
    rerender(
      <WorkspaceStatusBar
        backgroundTaskLabel="Typecheck complete"
        backgroundTaskProgressPct={100}
        data-testid="wsb-task-root"
      />
    );
    const completeIcon = screen.getByTestId('workspace-status-task-icon');
    expect(completeIcon).not.toHaveClass('animate-spin');
    expect(completeIcon.style.color).toBe('var(--prism-success-main)');
    expect(
      screen.getByTestId('workspace-status-task-progress-fill').style
        .backgroundColor
    ).toBe('var(--prism-success-main)');

    // Progress without label uses fallback accessible label
    rerender(
      <WorkspaceStatusBar
        backgroundTaskProgressPct={37.6}
        data-testid="wsb-task-root"
      />
    );
    expect(screen.queryByTestId('workspace-status-task-label')).toBeNull();
    expect(screen.getByTestId('workspace-status-task')).toHaveAttribute(
      'aria-label',
      'Background task progress (38%)'
    );
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-label',
      'Background task progress'
    );
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '38'
    );

    // Out-of-bounds clamping (-15 -> 0, 145 -> 100) and non-finite ignored
    rerender(<WorkspaceStatusBar backgroundTaskProgressPct={-15} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '0'
    );

    rerender(<WorkspaceStatusBar backgroundTaskProgressPct={145} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '100'
    );

    rerender(<WorkspaceStatusBar backgroundTaskProgressPct={Number.NaN} />);
    expect(screen.queryByTestId('workspace-status-task')).toBeNull();

    rerender(
      <WorkspaceStatusBar backgroundTaskProgressPct={Number.POSITIVE_INFINITY} />
    );
    expect(screen.queryByTestId('workspace-status-task')).toBeNull();
  });

  it('invokes onSelectSegment for all built-in segments and handles omitted handler safely', () => {
    const onSelectSegment = vi.fn();
    const { rerender } = render(
      <WorkspaceStatusBar
        branch="release/v1.33"
        backgroundTaskLabel="Bundling core"
        backgroundTaskProgressPct={52}
        onSelectSegment={onSelectSegment}
      />
    );

    fireEvent.click(screen.getByTestId('workspace-status-branch'));
    fireEvent.click(screen.getByTestId('workspace-status-sync'));
    fireEvent.click(screen.getByTestId('workspace-status-diagnostics'));
    fireEvent.click(screen.getByTestId('workspace-status-task'));
    fireEvent.click(screen.getByTestId('workspace-status-cursor'));
    fireEvent.click(screen.getByTestId('workspace-status-encoding'));
    fireEvent.click(screen.getByTestId('workspace-status-language'));

    expect(onSelectSegment.mock.calls.map((c) => c[0])).toEqual([
      'branch',
      'sync',
      'diagnostics',
      'background-task',
      'cursor',
      'encoding',
      'language',
    ]);

    // Safe no-op when onSelectSegment is undefined
    rerender(<WorkspaceStatusBar />);
    expect(() =>
      fireEvent.click(screen.getByTestId('workspace-status-branch'))
    ).not.toThrow();
  });

  it('renders custom left/right extraItems across all six StatusBarTone values, tooltips, and interactive vs non-interactive states', () => {
    const onSelectSegment = vi.fn();
    const tones: ReadonlyArray<{
      tone: StatusBarTone;
      colorVar: string;
      hasDot: boolean;
    }> = [
      { tone: 'neutral', colorVar: 'var(--prism-text-primary)', hasDot: false },
      { tone: 'primary', colorVar: 'var(--prism-primary-main)', hasDot: true },
      { tone: 'emerald', colorVar: 'var(--prism-success-main)', hasDot: true },
      { tone: 'amber', colorVar: 'var(--prism-warning-main)', hasDot: true },
      { tone: 'rose', colorVar: 'var(--prism-error-main)', hasDot: true },
      { tone: 'info', colorVar: 'var(--prism-info-main)', hasDot: true },
    ];

    const extraItems: ReadonlyArray<WorkspaceStatusItem> = [
      {
        id: 'tone-neutral',
        label: 'Spaces',
        value: '2',
        align: 'left',
        tone: 'neutral',
        tooltip: 'Indentation width',
      },
      {
        id: 'tone-primary',
        label: 'Prism',
        align: 'left',
        tone: 'primary',
        interactive: true,
      },
      {
        id: 'tone-emerald',
        label: 'LSP',
        value: 'Ready',
        align: 'right',
        tone: 'emerald',
        tooltip: 'Language server online',
      },
      {
        id: 'tone-amber',
        label: 'Cache',
        value: 'Warm',
        tone: 'amber',
      },
      {
        id: 'tone-rose',
        label: 'Audit',
        value: '1 alert',
        align: 'right',
        tone: 'rose',
      },
      {
        id: 'tone-info',
        label: 'Region',
        value: 'us-west-2',
        align: 'right',
        tone: 'info',
        tooltip: 'Static telemetry badge',
        interactive: false,
      },
    ];

    const { container } = render(
      <WorkspaceStatusBar
        extraItems={extraItems}
        onSelectSegment={onSelectSegment}
      />
    );

    const leftZone = screen.getByTestId('workspace-status-left');
    const rightZone = screen.getByTestId('workspace-status-right');

    // Verify zone placement
    expect(
      within(leftZone).getByTestId('workspace-status-item-tone-neutral')
    ).toBeInTheDocument();
    expect(
      within(leftZone).getByTestId('workspace-status-item-tone-primary')
    ).toBeInTheDocument();
    expect(
      within(rightZone).getByTestId('workspace-status-item-tone-emerald')
    ).toBeInTheDocument();
    expect(
      within(rightZone).getByTestId('workspace-status-item-tone-amber')
    ).toBeInTheDocument();
    expect(
      within(rightZone).getByTestId('workspace-status-item-tone-rose')
    ).toBeInTheDocument();
    expect(
      within(rightZone).getByTestId('workspace-status-item-tone-info')
    ).toBeInTheDocument();

    // Verify tones, dots, tooltips, and accessible labels
    for (const spec of tones) {
      const id = `tone-${spec.tone}`;
      const el = screen.getByTestId(`workspace-status-item-${id}`);
      expect(el).toHaveAttribute('data-tone', spec.tone);

      const dot = screen.queryByTestId(`workspace-status-item-dot-${id}`);
      if (spec.hasDot) {
        expect(dot).not.toBeNull();
        expect(dot?.style.backgroundColor).toBe(spec.colorVar);
      } else {
        expect(dot).toBeNull();
      }
    }

    const neutralBtn = screen.getByTestId('workspace-status-item-tone-neutral');
    expect(neutralBtn.tagName).toBe('BUTTON');
    expect(neutralBtn).toHaveAttribute('title', 'Indentation width');
    expect(neutralBtn).toHaveAttribute('aria-label', 'Spaces: 2');
    expect(neutralBtn).toHaveAttribute('data-interactive', 'true');

    const primaryBtn = screen.getByTestId('workspace-status-item-tone-primary');
    expect(primaryBtn).toHaveAttribute('aria-label', 'Prism');

    const staticInfo = screen.getByTestId('workspace-status-item-tone-info');
    expect(staticInfo.tagName).toBe('SPAN');
    expect(staticInfo).toHaveAttribute('data-interactive', 'false');
    expect(staticInfo).toHaveAttribute('title', 'Static telemetry badge');

    // Interactive items invoke onSelectSegment; interactive: false does not
    fireEvent.click(neutralBtn);
    fireEvent.click(primaryBtn);
    fireEvent.click(screen.getByTestId('workspace-status-item-tone-emerald'));
    fireEvent.click(staticInfo);

    expect(onSelectSegment.mock.calls.map((c) => c[0])).toEqual([
      'tone-neutral',
      'tone-primary',
      'tone-emerald',
    ]);

    // Zero raw hex/rgb/hsl color literals
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(container.innerHTML).not.toMatch(/\b(?:rgba?|hsla?)\s*\(/);
  });

  it('defends against adversarial props, negative/non-finite numbers, prototype keys, duplicate IDs, empty labels, and XSS payloads', () => {
    const onSelectSegment = vi.fn();
    const adversarialItems: ReadonlyArray<WorkspaceStatusItem> = [
      { id: '__proto__', label: 'Proto A', align: 'left' },
      { id: '__proto__', label: 'Proto B', align: 'right' },
      { id: 'constructor', label: '<script>alert("xss")</script>' },
      { id: '   ', label: 'Fallback Label' },
      { id: '', label: '   ', value: '  <img src=x onerror=alert(1)>  ' },
    ];

    const { container } = render(
      <WorkspaceStatusBar
        branch="   "
        errorsCount={-4}
        warningsCount={Number.NaN}
        cursorLine={0}
        cursorColumn={Number.POSITIVE_INFINITY}
        encoding="   "
        language="   "
        backgroundTaskLabel="   "
        extraItems={adversarialItems}
        onSelectSegment={onSelectSegment}
      />
    );

    // Whitespace string props fall back cleanly; invalid numbers sanitize safely
    expect(screen.getByTestId('workspace-status-branch')).toHaveTextContent(
      'main'
    );
    expect(screen.getByTestId('workspace-status-errors')).toHaveTextContent(
      '0'
    );
    expect(screen.getByTestId('workspace-status-warnings')).toHaveTextContent(
      '0'
    );
    expect(screen.getByTestId('workspace-status-cursor')).toHaveTextContent(
      'Ln 1, Col 1'
    );
    expect(screen.getByTestId('workspace-status-encoding')).toHaveTextContent(
      'UTF-8'
    );
    expect(screen.getByTestId('workspace-status-language')).toHaveTextContent(
      'TypeScript React'
    );
    expect(screen.queryByTestId('workspace-status-task')).toBeNull();

    // Duplicate prototype-polluting IDs render safely in both zones
    const protoItems = screen.getAllByTestId('workspace-status-item-__proto__');
    expect(protoItems).toHaveLength(2);
    const firstProtoItem = protoItems[0];
    expect(firstProtoItem).toBeDefined();
    if (firstProtoItem) {
      fireEvent.click(firstProtoItem);
    }
    expect(onSelectSegment).toHaveBeenLastCalledWith('__proto__');

    // Empty id fell back to label; empty id + label fell back to 'item'
    expect(
      screen.getByTestId('workspace-status-item-Fallback Label')
    ).toBeInTheDocument();
    expect(screen.getByTestId('workspace-status-item-item')).toHaveTextContent(
      '<img src=x onerror=alert(1)>'
    );

    // XSS payloads rendered strictly as text nodes, never injected as active elements
    expect(
      screen.getByTestId('workspace-status-item-constructor')
    ).toHaveTextContent('<script>alert("xss")</script>');
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
  });
});
