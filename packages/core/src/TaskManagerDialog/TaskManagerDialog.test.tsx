import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  TaskManagerDialog,
  type TaskProcessItem,
  type TaskProcessSortKeyMap,
  type TaskProcessStatusMap,
} from './index';

function getDisplayedPids(): string[] {
  const table = screen.getByTestId('task-manager-table');
  const rows = within(table).getAllByRole('row').slice(1);
  return rows.map((row) => row.getAttribute('data-pid') ?? '');
}

describe('TaskManagerDialog', () => {
  it('renders 6 default processes, aggregate CPU/memory pills, direct overflow-x-auto table wrapper, semantic badges/meters, ref, theme overrides, and zero raw colors', () => {
    const ref = createRef<HTMLDivElement>();
    const statusMapKeys: ReadonlyArray<keyof TaskProcessStatusMap> = [
      'running',
      'unresponsive',
      'sleeping',
    ];
    const sortMapKeys: ReadonlyArray<keyof TaskProcessSortKeyMap> = [
      'cpu',
      'memory',
      'name',
    ];
    expect(statusMapKeys).toHaveLength(3);
    expect(sortMapKeys).toHaveLength(3);

    const { container } = render(
      <PrismThemeProvider
        theme={{
          components: {
            TaskManagerDialog: {
              className: 'theme-task-manager',
              style: { maxWidth: '680px' },
            },
          },
        }}
      >
        <TaskManagerDialog
          ref={ref}
          className="consumer-task-manager"
          xstyle={{ '--prism-blur-px': '20px' }}
          data-testid="tm-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('tm-root');
    expect(ref.current).toBe(root);
    expect(TaskManagerDialog.displayName).toBe('TaskManagerDialog');
    expect(root).toHaveAttribute('role', 'region');
    expect(root).toHaveAttribute('aria-labelledby');
    expect(root).toHaveClass(
      'refractor-task-manager-dialog',
      'prism-slab',
      'min-w-0',
      'max-w-full',
      'theme-task-manager',
      'consumer-task-manager'
    );
    expect(root).toHaveStyle({ maxWidth: '680px' });
    expect(root).toHaveAttribute('data-has-unresponsive', 'true');
    expect(root).toHaveAttribute('data-sort-by', 'cpu');

    expect(screen.getByTestId('task-manager-title')).toHaveTextContent(
      'Task Manager'
    );
    expect(screen.getByTestId('task-manager-process-count')).toHaveTextContent(
      '6 processes'
    );
    // 61.4 + 25.6 + 6.8 + 3.2 + 1.2 + 0.4 = 98.6%
    expect(screen.getByTestId('task-manager-total-cpu')).toHaveTextContent(
      'CPU 98.6%'
    );
    // 3072 + 1920 + 1480 + 768 + 384 + 192 = 7816 MB => 7.63 GB
    expect(screen.getByTestId('task-manager-total-memory')).toHaveTextContent(
      'Mem 7.63 GB'
    );

    // <table> wrapped DIRECTLY inside <div className="overflow-x-auto"> with <thead> + <tbody>
    const table = screen.getByTestId('task-manager-table');
    expect(table.parentElement).toHaveClass('overflow-x-auto');
    expect(table.querySelector(':scope > thead')).not.toBeNull();
    expect(table.querySelector(':scope > tbody')).not.toBeNull();
    expect(table.querySelector(':scope > tr')).toBeNull();

    // Default 6 rows ordered by CPU descending
    expect(getDisplayedPids()).toEqual([
      '4108',
      '1842',
      '2290',
      '3014',
      '904',
      '612',
    ]);

    // Unresponsive process pre-selected for immediate Force Quit
    expect(screen.getByTestId('task-manager-row-4108')).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByTestId('task-manager-select-4108')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(
      screen.getByTestId('task-manager-selected-summary')
    ).toHaveTextContent(
      'Selected: Legacy Exporter (Not Responding) (PID 4108)'
    );
    expect(screen.getByTestId('task-manager-force-quit')).toBeEnabled();

    // Semantic status badge token colors
    expect(
      screen.getByTestId('task-manager-status-4108')
    ).toHaveTextContent('Not Responding');
    expect(
      screen.getByTestId('task-manager-status-4108').style.color
    ).toBe('var(--prism-error-main)');

    expect(
      screen.getByTestId('task-manager-status-1842')
    ).toHaveTextContent('Running');
    expect(
      screen.getByTestId('task-manager-status-1842').style.color
    ).toBe('var(--prism-success-main)');

    expect(
      screen.getByTestId('task-manager-status-904')
    ).toHaveTextContent('Sleeping');
    expect(
      screen.getByTestId('task-manager-status-904').style.color
    ).toBe('var(--prism-text-secondary)');

    // Semantic CPU & Memory progress meter token colors
    expect(
      screen.getByTestId('task-manager-cpu-bar-4108').style.backgroundColor
    ).toBe('var(--prism-error-main)');
    expect(
      screen.getByTestId('task-manager-cpu-bar-1842').style.backgroundColor
    ).toBe('var(--prism-warning-main)');
    expect(
      screen.getByTestId('task-manager-cpu-bar-2290').style.backgroundColor
    ).toBe('var(--prism-success-main)');

    expect(
      screen.getByTestId('task-manager-mem-bar-4108').style.backgroundColor
    ).toBe('var(--prism-warning-main)');
    expect(
      screen.getByTestId('task-manager-mem-bar-1842').style.backgroundColor
    ).toBe('var(--prism-info-main)');

    // Polite live status
    const liveStatus = screen.getByTestId('task-manager-live-status');
    expect(liveStatus).toHaveAttribute('aria-live', 'polite');
    expect(liveStatus).toHaveTextContent(
      '6 processes, total CPU 98.6%, total memory 7.63 GB'
    );

    // Zero raw hex/rgb/hsl color literals in rendered DOM
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(container.innerHTML).not.toMatch(/\b(?:rgba?|hsla?)\s*\(/);
  });

  it('filters by process name and PID with linear substring matching, clear button, and IME-safe Escape clear', () => {
    render(<TaskManagerDialog />);

    const searchInput = screen.getByLabelText(
      'Filter running processes'
    ) as HTMLInputElement;

    // Name substring filter including regex metacharacters
    fireEvent.change(searchInput, { target: { value: '(not responding)' } });
    expect(getDisplayedPids()).toEqual(['4108']);

    // IME composition guards Escape from clearing
    fireEvent.keyDown(searchInput, { key: 'Escape', isComposing: true });
    expect(searchInput.value).toBe('(not responding)');

    // Non-Escape keys do not clear
    fireEvent.keyDown(searchInput, { key: 'Enter' });
    expect(searchInput.value).toBe('(not responding)');

    // Non-composing Escape clears search and announces politely
    fireEvent.keyDown(searchInput, { key: 'Escape' });
    expect(searchInput.value).toBe('');
    expect(getDisplayedPids()).toHaveLength(6);
    expect(screen.getByTestId('task-manager-live-status')).toHaveTextContent(
      'Process filter cleared'
    );

    // Escape on already-empty search is a harmless no-op
    fireEvent.keyDown(searchInput, { key: 'Escape' });
    expect(searchInput.value).toBe('');

    // Filter by PID substring
    fireEvent.change(searchInput, { target: { value: '3014' } });
    expect(getDisplayedPids()).toEqual(['3014']);
    expect(screen.getByText('Shader Compiler')).toBeInTheDocument();

    // Clear button clears filter
    fireEvent.click(screen.getByRole('button', { name: 'Clear process filter' }));
    expect(searchInput.value).toBe('');
    expect(getDisplayedPids()).toHaveLength(6);
  });

  it('toggles Unresponsive Only filter and renders clean role="status" empty state with Reset Filters on zero matches', () => {
    render(<TaskManagerDialog />);

    const toggleBtn = screen.getByRole('button', { name: 'Unresponsive Only' });
    expect(toggleBtn).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute('aria-pressed', 'true');
    expect(getDisplayedPids()).toEqual(['4108']);
    expect(screen.getByTestId('task-manager-live-status')).toHaveTextContent(
      'Showing unresponsive processes only'
    );

    // Combine with non-matching search query -> single role="status" empty state
    const searchInput = screen.getByLabelText('Filter running processes');
    fireEvent.change(searchInput, { target: { value: 'Refractor Studio' } });

    const emptyStatus = screen.getByRole('status');
    expect(emptyStatus).toHaveTextContent('No matching processes');
    expect(screen.queryByTestId('task-manager-table')).toBeNull();
    // Selected process hidden by filter -> Force Quit disabled safely
    expect(screen.getByTestId('task-manager-force-quit')).toBeDisabled();
    expect(
      screen.getByTestId('task-manager-selected-summary')
    ).toHaveTextContent('No process selected');

    // Reset Filters restores all processes
    fireEvent.click(screen.getByRole('button', { name: 'Reset Filters' }));
    expect(toggleBtn).toHaveAttribute('aria-pressed', 'false');
    expect(getDisplayedPids()).toHaveLength(6);
    expect(screen.getByTestId('task-manager-live-status')).toHaveTextContent(
      'Process filters reset'
    );

    // Toggle on then off directly
    fireEvent.click(toggleBtn);
    fireEvent.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('task-manager-live-status')).toHaveTextContent(
      'Showing all running processes'
    );
  });

  it('sorts processes by CPU %, Memory MB, and Name with deterministic PID tie-breakers', () => {
    const tieBreakProcesses: ReadonlyArray<TaskProcessItem> = [
      {
        pid: 500,
        name: 'Worker',
        kind: 'background',
        status: 'running',
        cpuPct: 10,
        memoryMb: 512,
      },
      {
        pid: 200,
        name: 'Worker',
        kind: 'background',
        status: 'running',
        cpuPct: 10,
        memoryMb: 512,
      },
      {
        pid: 300,
        name: 'Alpha App',
        kind: 'app',
        status: 'running',
        cpuPct: 45,
        memoryMb: 256,
      },
      {
        pid: 400,
        name: 'Zeta Renderer',
        kind: 'app',
        status: 'sleeping',
        cpuPct: 5,
        memoryMb: 2048,
      },
    ];

    render(<TaskManagerDialog defaultProcesses={tieBreakProcesses} />);

    // No unresponsive processes -> starts with no selection and Force Quit disabled
    expect(
      screen.getByTestId('task-manager-selected-summary')
    ).toHaveTextContent('No process selected');
    expect(screen.getByTestId('task-manager-force-quit')).toBeDisabled();

    // Default CPU sort: 300 (45%), 200 (10%, pid 200), 500 (10%, pid 500), 400 (5%)
    expect(getDisplayedPids()).toEqual(['300', '200', '500', '400']);

    const sortSelect = screen.getByLabelText(
      'Sort processes by'
    ) as HTMLSelectElement;

    // Sort by Memory MB descending (tie-break 200 before 500)
    fireEvent.change(sortSelect, { target: { value: 'memory' } });
    expect(getDisplayedPids()).toEqual(['400', '200', '500', '300']);
    expect(screen.getByTestId('task-manager-live-status')).toHaveTextContent(
      'Processes sorted by Memory MB'
    );

    // Sort by Name ascending (tie-break 200 before 500)
    fireEvent.change(sortSelect, { target: { value: 'name' } });
    expect(getDisplayedPids()).toEqual(['300', '200', '500', '400']);
    expect(screen.getByTestId('task-manager-live-status')).toHaveTextContent(
      'Processes sorted by Name'
    );

    // Sort back by CPU %
    fireEvent.change(sortSelect, { target: { value: 'cpu' } });
    expect(getDisplayedPids()).toEqual(['300', '200', '500', '400']);
    expect(screen.getByTestId('task-manager-live-status')).toHaveTextContent(
      'Processes sorted by CPU %'
    );

    // Invalid programmatic sort value is ignored cleanly
    fireEvent.change(sortSelect, { target: { value: 'invalid-sort' } });
    expect(sortSelect.value).toBe('cpu');
  });

  it('selects/deselects rows via row click or Select button, force-quits processes in uncontrolled mode, and transitions to empty state', () => {
    const onForceQuit = vi.fn();
    render(<TaskManagerDialog onForceQuit={onForceQuit} />);

    // Click pre-selected row to deselect it
    fireEvent.click(screen.getByTestId('task-manager-row-4108'));
    expect(screen.getByTestId('task-manager-row-4108')).toHaveAttribute(
      'aria-selected',
      'false'
    );
    expect(
      screen.getByTestId('task-manager-selected-summary')
    ).toHaveTextContent('No process selected');
    expect(screen.getByTestId('task-manager-force-quit')).toBeDisabled();
    expect(screen.getByTestId('task-manager-live-status')).toHaveTextContent(
      'Deselected Legacy Exporter (Not Responding) (PID 4108)'
    );

    // Click Select button on Refractor Studio (stopPropagation avoids double-toggle)
    const selectStudioBtn = screen.getByRole('button', {
      name: 'Select Refractor Studio',
    });
    fireEvent.click(selectStudioBtn);
    expect(
      screen.getByRole('button', { name: 'Deselect Refractor Studio' })
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByTestId('task-manager-selected-summary')
    ).toHaveTextContent('Selected: Refractor Studio (PID 1842)');

    // Force Quit removes Refractor Studio and updates totals
    fireEvent.click(screen.getByTestId('task-manager-force-quit'));
    expect(onForceQuit).toHaveBeenCalledTimes(1);
    expect(onForceQuit).toHaveBeenCalledWith({
      pid: 1842,
      name: 'Refractor Studio',
      kind: 'app',
      status: 'running',
      cpuPct: 25.6,
      memoryMb: 1920,
    });
    expect(screen.queryByTestId('task-manager-row-1842')).toBeNull();
    expect(screen.getByTestId('task-manager-process-count')).toHaveTextContent(
      '5 processes'
    );
    expect(screen.getByTestId('task-manager-total-cpu')).toHaveTextContent(
      'CPU 73.0%'
    );
    expect(screen.getByTestId('task-manager-total-memory')).toHaveTextContent(
      'Mem 5.76 GB'
    );
    expect(screen.getByTestId('task-manager-force-quit')).toBeDisabled();
    expect(screen.getByTestId('task-manager-live-status')).toHaveTextContent(
      'Force quit Refractor Studio (PID 1842)'
    );
  });

  it('transitions to role="status" empty state when the final process is force-quit and renders singular count cleanly', () => {
    const onForceQuit = vi.fn();
    render(
      <TaskManagerDialog
        defaultProcesses={[
          {
            pid: 777,
            name: 'Solo Daemon',
            kind: 'background',
            status: 'unresponsive',
            cpuPct: 12.5,
            memoryMb: 1024,
          },
        ]}
        onForceQuit={onForceQuit}
        data-testid="tm-solo"
      />
    );

    expect(screen.getByTestId('task-manager-process-count')).toHaveTextContent(
      '1 process'
    );
    expect(screen.getByTestId('task-manager-live-status')).toHaveTextContent(
      '1 process, total CPU 12.5%, total memory 1.00 GB'
    );

    fireEvent.click(screen.getByTestId('task-manager-force-quit'));
    expect(onForceQuit).toHaveBeenCalledWith(
      expect.objectContaining({ pid: 777, name: 'Solo Daemon' })
    );
    expect(screen.getByTestId('tm-solo')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByTestId('task-manager-process-count')).toHaveTextContent(
      '0 processes'
    );
    expect(screen.getByTestId('task-manager-total-cpu')).toHaveTextContent(
      'CPU 0.0%'
    );
    expect(screen.getByTestId('task-manager-total-memory')).toHaveTextContent(
      'Mem 0.00 GB'
    );
    const emptyStatus = screen.getByRole('status');
    expect(emptyStatus).toHaveTextContent('No active processes');
    expect(screen.queryByTestId('task-manager-reset-filters')).toBeNull();
  });

  it('supports controlled processes prop and empty processes={[]} cleanly', () => {
    const onForceQuitLocked = vi.fn();
    const initialControlled: ReadonlyArray<TaskProcessItem> = [
      {
        pid: 4108,
        name: 'Legacy Exporter',
        kind: 'app',
        status: 'unresponsive',
        cpuPct: 88.5,
        memoryMb: 2048,
      },
      {
        pid: 1024,
        name: 'Audio Engine',
        kind: 'background',
        status: 'running',
        cpuPct: 4.5,
        memoryMb: 512,
      },
    ];

    // Locked controlled instance fires callback without internal mutation
    const { unmount } = render(
      <TaskManagerDialog
        processes={initialControlled}
        onForceQuit={onForceQuitLocked}
      />
    );
    expect(
      screen.getByTestId('task-manager-selected-summary')
    ).toHaveTextContent('Selected: Legacy Exporter (PID 4108)');

    fireEvent.click(screen.getByTestId('task-manager-force-quit'));
    expect(onForceQuitLocked).toHaveBeenCalledWith(
      expect.objectContaining({ pid: 4108, name: 'Legacy Exporter' })
    );
    // Still rendered because parent did not update controlled processes
    expect(screen.getByTestId('task-manager-row-4108')).toBeInTheDocument();
    unmount();

    // Stateful controlled harness updates cleanly
    const onForceQuitHarness = vi.fn();
    function ControlledHarness() {
      const [items, setItems] =
        useState<ReadonlyArray<TaskProcessItem>>(initialControlled);
      return (
        <TaskManagerDialog
          processes={items}
          onForceQuit={(proc) => {
            onForceQuitHarness(proc);
            setItems((prev) => prev.filter((item) => item.pid !== proc.pid));
          }}
        />
      );
    }

    const { unmount: unmountHarness } = render(<ControlledHarness />);
    fireEvent.click(screen.getByTestId('task-manager-force-quit'));
    expect(onForceQuitHarness).toHaveBeenCalledWith(
      expect.objectContaining({ pid: 4108 })
    );
    expect(screen.queryByTestId('task-manager-row-4108')).toBeNull();
    expect(screen.getByTestId('task-manager-process-count')).toHaveTextContent(
      '1 process'
    );
    unmountHarness();

    // Empty controlled processes={[]}
    render(<TaskManagerDialog processes={[]} data-testid="tm-empty-ctrl" />);
    expect(screen.getByTestId('tm-empty-ctrl')).toHaveAttribute(
      'data-empty',
      'true'
    );
    expect(screen.getByRole('status')).toHaveTextContent('No active processes');
    expect(screen.getByTestId('task-manager-force-quit')).toBeDisabled();
  });

  it('sanitizes NaN, Infinity, negative CPU/memory/PID, duplicate PIDs, whitespace strings, and renders XSS payloads literally', () => {
    const adversarialProcesses: ReadonlyArray<TaskProcessItem> = [
      {
        pid: Number.NaN,
        name: '<script>alert("xss")</script>',
        kind: 'app',
        status: 'running',
        cpuPct: Number.NaN,
        memoryMb: Number.NaN,
      },
      {
        pid: -99,
        name: '<img src=x onerror=alert(1)>',
        kind: 'background',
        status: 'sleeping',
        cpuPct: -42.5,
        memoryMb: -1024,
      },
      {
        pid: 100,
        name: '   ',
        kind: 'app',
        status: 'unresponsive',
        cpuPct: 245,
        memoryMb: Number.POSITIVE_INFINITY,
      },
      {
        pid: 100,
        name: 'Duplicate PID Worker',
        kind: 'background',
        status: 'running',
        cpuPct: Number.POSITIVE_INFINITY,
        memoryMb: 6144,
      },
    ];

    const onForceQuit = vi.fn();
    const { container } = render(
      <TaskManagerDialog
        title="   "
        defaultProcesses={adversarialProcesses}
        onForceQuit={onForceQuit}
      />
    );

    // Whitespace title falls back to Task Manager
    expect(screen.getByTestId('task-manager-title')).toHaveTextContent(
      'Task Manager'
    );

    // Aggregate CPU: 0 + 0 + 100 + 0 = 100.0%; Memory: 0 + 0 + 0 + 6144 = 6.00 GB
    expect(screen.getByTestId('task-manager-total-cpu')).toHaveTextContent(
      'CPU 100.0%'
    );
    expect(screen.getByTestId('task-manager-total-memory')).toHaveTextContent(
      'Mem 6.00 GB'
    );

    // Sanitized per-row values
    expect(screen.getByTestId('task-manager-pid-1')).toHaveTextContent('1');
    expect(screen.getByTestId('task-manager-cpu-1')).toHaveTextContent('0.0%');
    expect(screen.getByTestId('task-manager-mem-1')).toHaveTextContent('0 MB');

    expect(screen.getByTestId('task-manager-pid-2')).toHaveTextContent('2');
    expect(screen.getByTestId('task-manager-cpu-2')).toHaveTextContent('0.0%');
    expect(screen.getByTestId('task-manager-mem-2')).toHaveTextContent('0 MB');

    expect(screen.getByTestId('task-manager-name-100')).toHaveTextContent(
      'Unnamed Process'
    );
    expect(screen.getByTestId('task-manager-cpu-100')).toHaveTextContent(
      '100.0%'
    );
    expect(screen.getByTestId('task-manager-mem-100')).toHaveTextContent(
      '0 MB'
    );

    // Duplicate PID gets distinct rowKey 100#2
    expect(screen.getByTestId('task-manager-name-100#2')).toHaveTextContent(
      'Duplicate PID Worker'
    );
    expect(screen.getByTestId('task-manager-mem-100#2')).toHaveTextContent(
      '6,144 MB'
    );

    // Force Quitting the first PID 100 row leaves duplicate row 100#2 intact
    fireEvent.click(screen.getByTestId('task-manager-force-quit'));
    expect(onForceQuit).toHaveBeenCalledWith(
      expect.objectContaining({
        pid: 100,
        name: 'Unnamed Process',
        cpuPct: 100,
        memoryMb: 0,
      })
    );
    expect(screen.queryByTestId('task-manager-row-100')).toBeNull();
    expect(screen.getByTestId('task-manager-row-100#2')).toBeInTheDocument();

    // XSS payloads rendered strictly as literal text
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByTestId('task-manager-name-1')).toHaveTextContent(
      '<script>alert("xss")</script>'
    );
    expect(screen.getByTestId('task-manager-name-2')).toHaveTextContent(
      '<img src=x onerror=alert(1)>'
    );
  });

  it('enforces disabled state across all interactive controls, blocks programmatic events, and supports explicit aria-label', () => {
    const onForceQuit = vi.fn();
    const { rerender } = render(
      <TaskManagerDialog
        aria-label="System Force Quit Monitor"
        onForceQuit={onForceQuit}
        data-testid="tm-disabled"
      />
    );

    const root = screen.getByTestId('tm-disabled');
    expect(root).toHaveAttribute('aria-label', 'System Force Quit Monitor');
    expect(root).not.toHaveAttribute('aria-labelledby');

    // Type a search query before disabling so clear button & Reset Filters paths can also be verified disabled
    const searchInput = screen.getByLabelText('Filter running processes');
    fireEvent.change(searchInput, { target: { value: 'zzzz-no-match' } });
    expect(screen.getByTestId('task-manager-search-clear')).toBeInTheDocument();
    expect(screen.getByTestId('task-manager-reset-filters')).toBeInTheDocument();

    // Rerender disabled with active filter empty state
    rerender(
      <TaskManagerDialog
        disabled
        aria-label="System Force Quit Monitor"
        onForceQuit={onForceQuit}
        data-testid="tm-disabled"
      />
    );

    expect(root).toHaveAttribute('aria-disabled', 'true');
    expect(root).toHaveAttribute('data-disabled', 'true');
    expect(searchInput).toBeDisabled();
    expect(screen.getByTestId('task-manager-search-clear')).toBeDisabled();
    expect(screen.getByTestId('task-manager-reset-filters')).toBeDisabled();
    expect(screen.getByTestId('task-manager-unresponsive-toggle')).toBeDisabled();
    expect(screen.getByTestId('task-manager-sort')).toBeDisabled();
    expect(screen.getByTestId('task-manager-force-quit')).toBeDisabled();

    // Programmatic events blocked while disabled
    fireEvent.change(searchInput, { target: { value: 'Refractor' } });
    fireEvent.keyDown(searchInput, { key: 'Escape' });
    fireEvent.click(screen.getByTestId('task-manager-search-clear'));
    fireEvent.click(screen.getByTestId('task-manager-reset-filters'));
    fireEvent.click(screen.getByTestId('task-manager-unresponsive-toggle'));
    fireEvent.change(screen.getByTestId('task-manager-sort'), {
      target: { value: 'name' },
    });
    expect((searchInput as HTMLInputElement).value).toBe('zzzz-no-match');

    // Separate disabled render with visible table rows
    const { unmount } = render(
      <TaskManagerDialog
        disabled
        onForceQuit={onForceQuit}
        data-testid="tm-disabled-rows"
      />
    );

    const disabledScope = within(screen.getByTestId('tm-disabled-rows'));
    const row4108 = disabledScope.getByTestId('task-manager-row-4108');
    const selectBtn4108 = disabledScope.getByTestId('task-manager-select-4108');
    const forceQuitBtn = disabledScope.getByTestId('task-manager-force-quit');

    expect(selectBtn4108).toBeDisabled();
    expect(forceQuitBtn).toBeDisabled();

    fireEvent.click(row4108);
    fireEvent.click(selectBtn4108);
    fireEvent.click(forceQuitBtn);

    expect(row4108).toHaveAttribute('aria-selected', 'true');
    expect(onForceQuit).not.toHaveBeenCalled();
    unmount();
  });
});
