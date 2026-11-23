'use client';

import {
  useCallback,
  useId,
  useMemo,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react';
import {
  Activity,
  AlertTriangle,
  ChevronDown,
  Cpu,
  HardDrive,
  Power,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { STYLE_BADGE_ERROR, STYLE_BADGE_PRIMARY, STYLE_BG_DIVIDER, STYLE_BORDER_DIVIDER, STYLE_ERROR_MAIN, STYLE_INFO_MAIN, STYLE_PRIMARY_MAIN, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY, compareNaturalStrings, formatUsNumber } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export type TaskProcessStatus = 'running' | 'unresponsive' | 'sleeping';

export type TaskProcessSortKey = 'cpu' | 'memory' | 'name';

export interface TaskProcessItem {
  /** Numeric operating-system process identifier. */
  pid: number;
  /** Display name of the application or background process. */
  name: string;
  /** Process execution category ('app' | 'background'). */
  kind: 'app' | 'background';
  /** Current execution state ('running' | 'unresponsive' | 'sleeping'). */
  status: TaskProcessStatus;
  /** Instantaneous CPU utilization percentage (sanitized to [0..100]). */
  cpuPct: number;
  /** Resident memory footprint in megabytes (sanitized to >= 0). */
  memoryMb: number;
}

type TaskManagerDialogBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface TaskManagerDialogProps extends TaskManagerDialogBaseProps {
  /** Heading displayed in the Task Manager header (defaults to 'Task Manager'). */
  title?: string;
  /** Controlled list of active processes. */
  processes?: ReadonlyArray<TaskProcessItem>;
  /** Initial uncontrolled process list (defaults to 6 realistic system processes). */
  defaultProcesses?: ReadonlyArray<TaskProcessItem>;
  /** Callback fired with the terminated process when Force Quit is clicked. */
  onForceQuit?: (process: TaskProcessItem) => void;
  /** Disables search, filters, sorting, row selection, and Force Quit actions. */
  disabled?: boolean;
}

interface NormalizedProcessEntry {
  rowKey: string;
  item: TaskProcessItem;
}

interface StatusBadgeMeta {
  label: string;
  color: string;
}

const DEFAULT_TITLE = 'Task Manager';
const MIN_MEMORY_CEILING_MB = 4096;

const DEFAULT_PROCESSES: ReadonlyArray<TaskProcessItem> = [
  {
    pid: 4108,
    name: 'Legacy Exporter (Not Responding)',
    kind: 'app',
    status: 'unresponsive',
    cpuPct: 61.4,
    memoryMb: 3072,
  },
  {
    pid: 1842,
    name: 'Refractor Studio',
    kind: 'app',
    status: 'running',
    cpuPct: 25.6,
    memoryMb: 1920,
  },
  {
    pid: 2290,
    name: 'Optical Browser',
    kind: 'app',
    status: 'running',
    cpuPct: 6.8,
    memoryMb: 1480,
  },
  {
    pid: 3014,
    name: 'Shader Compiler',
    kind: 'background',
    status: 'running',
    cpuPct: 3.2,
    memoryMb: 768,
  },
  {
    pid: 904,
    name: 'Window Compositor',
    kind: 'background',
    status: 'sleeping',
    cpuPct: 1.2,
    memoryMb: 384,
  },
  {
    pid: 612,
    name: 'Cloud Sync Daemon',
    kind: 'background',
    status: 'sleeping',
    cpuPct: 0.4,
    memoryMb: 192,
  },
];

function sanitizePid(rawPid: number, fallbackIndex: number): number {
  if (!Number.isFinite(rawPid) || rawPid < 0) {
    return fallbackIndex + 1;
  }
  return Math.trunc(rawPid);
}

function sanitizeCpuPct(rawCpu: number): number {
  const clamped = clampNumber(rawCpu, 0, 100, 0);
  return Math.round(clamped * 10) / 10;
}

function sanitizeMemoryMb(rawMemoryMb: number): number {
  if (!Number.isFinite(rawMemoryMb) || rawMemoryMb < 0) {
    return 0;
  }
  return Math.round(rawMemoryMb);
}

function normalizeProcesses(
  list: ReadonlyArray<TaskProcessItem>
): ReadonlyArray<NormalizedProcessEntry> {
  const seenPids = new Map<number, number>();
  return list.map((raw, index) => {
    const pid = sanitizePid(raw.pid, index);
    const count = seenPids.get(pid) ?? 0;
    seenPids.set(pid, count + 1);
    const rowKey = count === 0 ? String(pid) : `${pid}#${count + 1}`;
    const trimmedName = raw.name.trim();

    return {
      rowKey,
      item: {
        pid,
        name: trimmedName || 'Unnamed Process',
        kind: raw.kind === 'app' ? 'app' : 'background',
        status: raw.status,
        cpuPct: sanitizeCpuPct(raw.cpuPct),
        memoryMb: sanitizeMemoryMb(raw.memoryMb),
      },
    };
  });
}

function findInitialSelectedKey(
  entries: ReadonlyArray<NormalizedProcessEntry>
): string | null {
  const unresponsive = entries.find(
    (entry) => entry.item.status === 'unresponsive'
  );
  return unresponsive ? unresponsive.rowKey : null;
}

function isTaskProcessSortKey(value: string): value is TaskProcessSortKey {
  return value === 'cpu' || value === 'memory' || value === 'name';
}

function getStatusBadgeMeta(status: TaskProcessStatus): StatusBadgeMeta {
  switch (status) {
    case 'running':
      return {
        label: 'Running',
        color: 'var(--prism-success-main)',
      };
    case 'unresponsive':
      return {
        label: 'Not Responding',
        color: 'var(--prism-error-main)',
      };
    case 'sleeping':
      return {
        label: 'Sleeping',
        color: 'var(--prism-text-secondary)',
      };
  }
}

function getCpuMeterColor(cpuPct: number): string {
  if (cpuPct >= 60) {
    return 'var(--prism-error-main)';
  }
  if (cpuPct >= 25) {
    return 'var(--prism-warning-main)';
  }
  return 'var(--prism-success-main)';
}

function getMemoryMeterColor(memoryFillPct: number): string {
  if (memoryFillPct >= 70) {
    return 'var(--prism-warning-main)';
  }
  return 'var(--prism-info-main)';
}

function compareProcessEntries(
  a: NormalizedProcessEntry,
  b: NormalizedProcessEntry,
  sortBy: TaskProcessSortKey
): number {
  switch (sortBy) {
    case 'cpu':
      return b.item.cpuPct - a.item.cpuPct || a.item.pid - b.item.pid;
    case 'memory':
      return b.item.memoryMb - a.item.memoryMb || a.item.pid - b.item.pid;
    case 'name':
      return (
        compareNaturalStrings(a.item.name, b.item.name) ||
        a.item.pid - b.item.pid
      );
  }
}

function formatMemoryGb(totalMemoryMb: number): string {
  return `${(totalMemoryMb / 1024).toFixed(2)} GB`;
}

const headerClass = /*#__PURE__*/ stableClassName('task-manager-dialog', 'header');
const controlsClass = /*#__PURE__*/ stableClassName('task-manager-dialog', 'controls');
const tableWrapClass = /*#__PURE__*/ stableClassName('task-manager-dialog', 'table-wrap');
const tableClass = /*#__PURE__*/ stableClassName('task-manager-dialog', 'table');
const footerClass = /*#__PURE__*/ stableClassName('task-manager-dialog', 'footer');
const emptyClass = /*#__PURE__*/ stableClassName('task-manager-dialog', 'empty');

function TaskManagerDialogInner({
  title = DEFAULT_TITLE,
  processes,
  defaultProcesses,
  onForceQuit,
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: TaskManagerDialogProps) {
  const override = useComponentOverride('TaskManagerDialog');
  const titleId = useId();
  const sortSelectId = useId();

  const resolvedTitle = title.trim() || DEFAULT_TITLE;
  const isControlled = processes !== undefined;

  const [uncontrolledEntries, setUncontrolledEntries] = useState<
    ReadonlyArray<NormalizedProcessEntry>
  >(() => normalizeProcesses(defaultProcesses ?? DEFAULT_PROCESSES));

  const activeEntries = useMemo<ReadonlyArray<NormalizedProcessEntry>>(
    () => (isControlled ? normalizeProcesses(processes) : uncontrolledEntries),
    [isControlled, processes, uncontrolledEntries]
  );

  const [selectedRowKey, setSelectedRowKey] = useState<string | null>(() =>
    findInitialSelectedKey(
      isControlled
        ? normalizeProcesses(processes)
        : normalizeProcesses(defaultProcesses ?? DEFAULT_PROCESSES)
    )
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [unresponsiveOnly, setUnresponsiveOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<TaskProcessSortKey>('cpu');
  const [liveStatus, setLiveStatus] = useState<string>('');

  const { totalCpuPct, totalMemoryMb, unresponsiveCount, memoryCeilingMb } =
    useMemo(() => {
      let cpuSum = 0;
      let memSum = 0;
      let hungCount = 0;
      let maxMem = 0;

      for (const entry of activeEntries) {
        cpuSum += entry.item.cpuPct;
        memSum += entry.item.memoryMb;
        if (entry.item.status === 'unresponsive') {
          hungCount += 1;
        }
        if (entry.item.memoryMb > maxMem) {
          maxMem = entry.item.memoryMb;
        }
      }

      return {
        totalCpuPct: Math.round(cpuSum * 10) / 10,
        totalMemoryMb: memSum,
        unresponsiveCount: hungCount,
        memoryCeilingMb: Math.max(MIN_MEMORY_CEILING_MB, maxMem),
      };
    }, [activeEntries]);

  const visibleEntries = useMemo<ReadonlyArray<NormalizedProcessEntry>>(() => {
    const needle = searchQuery.trim().toLowerCase();
    const filtered = activeEntries.filter((entry) => {
      if (unresponsiveOnly && entry.item.status !== 'unresponsive') {
        return false;
      }
      if (!needle) {
        return true;
      }
      return (
        entry.item.name.toLowerCase().includes(needle) ||
        String(entry.item.pid).includes(needle)
      );
    });

    return [...filtered].sort((a, b) => compareProcessEntries(a, b, sortBy));
  }, [activeEntries, searchQuery, sortBy, unresponsiveOnly]);

  const selectedEntry = useMemo<NormalizedProcessEntry | null>(() => {
    if (selectedRowKey === null) {
      return null;
    }
    return (
      visibleEntries.find((entry) => entry.rowKey === selectedRowKey) ?? null
    );
  }, [selectedRowKey, visibleEntries]);

  const hasFiltersActive = searchQuery.trim().length > 0 || unresponsiveOnly;
  const isEmpty = activeEntries.length === 0;
  const isFilterEmpty = !isEmpty && visibleEntries.length === 0;

  const defaultLiveSummary = useMemo(() => {
    const processNoun = activeEntries.length === 1 ? 'process' : 'processes';
    return `${activeEntries.length} ${processNoun}, total CPU ${totalCpuPct.toFixed(1)}%, total memory ${formatMemoryGb(totalMemoryMb)}`;
  }, [activeEntries.length, totalCpuPct, totalMemoryMb]);

  const handleSearchChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (disabled) {
        return;
      }
      setSearchQuery(event.target.value);
    },
    [disabled]
  );

  const handleSearchKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (disabled || event.nativeEvent.isComposing) {
        return;
      }
      if (event.key === 'Escape' && searchQuery.length > 0) {
        event.preventDefault();
        setSearchQuery('');
        setLiveStatus('Process filter cleared');
      }
    },
    [disabled, searchQuery.length]
  );

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setLiveStatus('Process filter cleared');
  }, []);

  const handleToggleUnresponsiveOnly = useCallback(() => {
    setUnresponsiveOnly((prev) => {
      const next = !prev;
      setLiveStatus(
        next
          ? 'Showing unresponsive processes only'
          : 'Showing all running processes'
      );
      return next;
    });
  }, []);

  const handleSortChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      if (disabled) {
        return;
      }
      const nextValue = event.target.value;
      if (!isTaskProcessSortKey(nextValue)) {
        return;
      }
      setSortBy(nextValue);
      const sortLabel =
        nextValue === 'cpu'
          ? 'CPU %'
          : nextValue === 'memory'
            ? 'Memory MB'
            : 'Name';
      setLiveStatus(`Processes sorted by ${sortLabel}`);
    },
    [disabled]
  );

  const handleResetFilters = useCallback(() => {
    setSearchQuery('');
    setUnresponsiveOnly(false);
    setLiveStatus('Process filters reset');
  }, []);

  const handleSelectEntry = useCallback(
    (entry: NormalizedProcessEntry) => {
      if (disabled) {
        return;
      }
      setSelectedRowKey((prev) => {
        const next = prev === entry.rowKey ? null : entry.rowKey;
        setLiveStatus(
          next === null
            ? `Deselected ${entry.item.name} (PID ${entry.item.pid})`
            : `Selected ${entry.item.name} (PID ${entry.item.pid})`
        );
        return next;
      });
    },
    [disabled]
  );

  const handleForceQuit = useCallback(
    (entry: NormalizedProcessEntry) => {
      const target = entry.item;
      const targetRowKey = entry.rowKey;
      if (!isControlled) {
        setUncontrolledEntries((prev) =>
          prev.filter((item) => item.rowKey !== targetRowKey)
        );
      }
      setSelectedRowKey(null);
      setLiveStatus(`Force quit ${target.name} (PID ${target.pid})`);
      onForceQuit?.(target);
    },
    [isControlled, onForceQuit]
  );

  const merged = mergeProps({
    themeTarget: themeProps('task-manager-dialog', {
      empty: isEmpty,
      hasUnresponsive: unresponsiveCount > 0,
      unresponsiveOnly,
      sortBy,
      disabled,
    }),
    baseClassName: cx(
      'prism-slab w-full max-w-full min-w-0 p-4 flex flex-col gap-3.5 transition-[color,background-color,border-color,opacity,transform]',
      disabled ? 'opacity-60' : ''
    ),
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });


  const processCountLabel =
    activeEntries.length === 1
      ? '1 process'
      : `${activeEntries.length} processes`;

  return (
    <div
      ref={ref}
      role="region"
      aria-labelledby={!rest['aria-label'] ? titleId : undefined}
      aria-disabled={disabled || undefined}
      {...rest}
      {...merged}
    >
      {/* Header: Title + Aggregate CPU % & Memory GB Pills */}
      <div
        className={cx(
          headerClass,
          'flex flex-wrap items-center justify-between gap-2.5 min-w-0'
        )}
      >
        <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
          <span
            aria-hidden="true"
            className="prism-well w-8 h-8 rounded-full inline-flex items-center justify-center shrink-0"
            style={STYLE_PRIMARY_MAIN}
          >
            <Activity aria-hidden="true" className="w-4 h-4 shrink-0" />
          </span>

          <h2
            id={titleId}
            data-testid="task-manager-title"
            className="text-sm font-semibold tracking-tight truncate min-w-0"
            style={STYLE_TEXT_PRIMARY}
          >
            {resolvedTitle}
          </h2>

          <span
            data-testid="task-manager-process-count"
            className="prism-well inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-[11px] font-medium tabular-nums whitespace-nowrap shrink-0"
            style={STYLE_TEXT_SECONDARY}
          >
            {processCountLabel}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          <span
            data-testid="task-manager-total-cpu"
            className="prism-crystal inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[11px] font-semibold tabular-nums whitespace-nowrap shrink-0"
            style={STYLE_TEXT_PRIMARY}
          >
            <Cpu
              aria-hidden="true"
              className="w-3.5 h-3.5 shrink-0"
              style={{ color: getCpuMeterColor(totalCpuPct) }}
            />
            <span>CPU {totalCpuPct.toFixed(1)}%</span>
          </span>

          <span
            data-testid="task-manager-total-memory"
            className="prism-crystal inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[11px] font-semibold tabular-nums whitespace-nowrap shrink-0"
            style={STYLE_TEXT_PRIMARY}
          >
            <HardDrive
              aria-hidden="true"
              className="w-3.5 h-3.5 shrink-0"
              style={STYLE_INFO_MAIN}
            />
            <span>Mem {formatMemoryGb(totalMemoryMb)}</span>
          </span>
        </div>
      </div>

      {/* Filters & Sorting Toolbar */}
      <div
        className={cx(
          controlsClass,
          'flex flex-wrap items-center gap-2 min-w-0'
        )}
      >
        <div className="prism-well relative flex-1 min-w-[180px] rounded-full flex items-center">
          <Search
            aria-hidden="true"
            className="w-3.5 h-3.5 pointer-events-none absolute left-3 shrink-0"
            style={STYLE_TEXT_SECONDARY}
          />
          <input
            type="search"
            aria-label="Filter running processes"
            data-testid="task-manager-search"
            value={searchQuery}
            disabled={disabled}
            placeholder="Filter by process name or PID..."
            onChange={handleSearchChange}
            onKeyDown={handleSearchKeyDown}
            className="prism-focus-ring w-full min-w-0 bg-transparent rounded-full pl-8 pr-8 py-1.5 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            style={STYLE_TEXT_PRIMARY}
          />
          {searchQuery.length > 0 ? (
            <button
              type="button"
              disabled={disabled}
              aria-label="Clear process filter"
              data-testid="task-manager-search-clear"
              onClick={handleClearSearch}
              className="prism-focus-ring absolute right-1.5 w-5 h-5 rounded-full inline-flex items-center justify-center cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
              style={STYLE_TEXT_SECONDARY}
            >
              <X aria-hidden="true" className="w-3 h-3 shrink-0" />
            </button>
          ) : null}
        </div>

        <button
          type="button"
          disabled={disabled}
          aria-pressed={unresponsiveOnly}
          data-testid="task-manager-unresponsive-toggle"
          onClick={handleToggleUnresponsiveOnly}
          className={cx(
            'prism-focus-ring inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]',
            unresponsiveOnly ? '' : 'prism-crystal'
          )}
          style={
            unresponsiveOnly
              ? STYLE_BADGE_ERROR
              : STYLE_TEXT_PRIMARY
          }
        >
          <AlertTriangle
            aria-hidden="true"
            className="w-3.5 h-3.5 shrink-0"
            style={
              unresponsiveOnly
                ? undefined
                : STYLE_ERROR_MAIN
            }
          />
          <span>Unresponsive Only</span>
          {unresponsiveCount > 0 ? (
            <span
              aria-hidden="true"
              className="font-mono text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded-full"
              style={
                unresponsiveOnly
                  ? {
                      backgroundColor:
                        'color-mix(in srgb, var(--prism-error-contrast) 22%, transparent)',
                      color: 'var(--prism-error-contrast)',
                    }
                  : {
                      backgroundColor:
                        'color-mix(in srgb, var(--prism-error-main) 14%, transparent)',
                      color: 'var(--prism-error-main)',
                    }
              }
            >
              {unresponsiveCount}
            </span>
          ) : null}
        </button>

        <div className="flex items-center gap-1.5 min-w-0 shrink-0">
          <label
            htmlFor={sortSelectId}
            className="text-[11px] font-semibold whitespace-nowrap"
            style={STYLE_TEXT_SECONDARY}
          >
            Sort by
          </label>
          <div className="prism-well relative rounded-full flex items-center min-w-0">
            <select
              id={sortSelectId}
              aria-label="Sort processes by"
              data-testid="task-manager-sort"
              value={sortBy}
              disabled={disabled}
              onChange={handleSortChange}
              className="prism-focus-ring appearance-none bg-transparent rounded-full pl-3 pr-7 py-1.5 text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={STYLE_TEXT_PRIMARY}
            >
              <option value="cpu">CPU %</option>
              <option value="memory">Memory MB</option>
              <option value="name">Name</option>
            </select>
            <ChevronDown
              aria-hidden="true"
              className="w-3.5 h-3.5 pointer-events-none absolute right-2 shrink-0"
              style={STYLE_TEXT_SECONDARY}
            />
          </div>
        </div>
      </div>

      {/* Process Table or Empty State */}
      {isEmpty || isFilterEmpty ? (
        <div
          role="status"
          data-testid="task-manager-empty"
          className={cx(
            emptyClass,
            'prism-well rounded-2xl px-4 py-7 text-center flex flex-col items-center gap-2 min-w-0'
          )}
        >
          <p
            className="text-sm font-semibold"
            style={STYLE_TEXT_PRIMARY}
          >
            {isEmpty ? 'No active processes' : 'No matching processes'}
          </p>
          <p
            className="text-xs max-w-md"
            style={STYLE_TEXT_SECONDARY}
          >
            {isEmpty
              ? 'All applications and background processes have been terminated.'
              : 'Adjust the search filter or turn off Unresponsive Only to inspect running processes.'}
          </p>
          {isFilterEmpty && hasFiltersActive ? (
            <button
              type="button"
              disabled={disabled}
              data-testid="task-manager-reset-filters"
              onClick={handleResetFilters}
              className="prism-crystal prism-focus-ring mt-1 inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-xs font-semibold cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]"
              style={STYLE_TEXT_PRIMARY}
            >
              <RotateCcw aria-hidden="true" className="w-3 h-3 shrink-0" />
              <span>Reset Filters</span>
            </button>
          ) : null}
        </div>
      ) : (
        <div
          className={cx(
            tableWrapClass,
            'prism-well rounded-2xl overflow-hidden min-w-0'
          )}
        >
          <div className="overflow-x-auto">
            <table
              aria-labelledby={titleId}
              data-testid="task-manager-table"
              className={cx(tableClass, 'w-full border-collapse text-xs')}
            >
              <thead>
                <tr
                  className="border-b"
                  style={STYLE_BORDER_DIVIDER}
                >
                  <th
                    scope="col"
                    className="px-3.5 py-2.5 text-left font-semibold uppercase tracking-wider text-[10px] min-w-[200px]"
                    style={STYLE_TEXT_SECONDARY}
                  >
                    Process
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2.5 text-right font-semibold uppercase tracking-wider text-[10px] whitespace-nowrap"
                    style={STYLE_TEXT_SECONDARY}
                  >
                    PID
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2.5 text-right font-semibold uppercase tracking-wider text-[10px] whitespace-nowrap min-w-[120px]"
                    style={STYLE_TEXT_SECONDARY}
                  >
                    CPU %
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2.5 text-right font-semibold uppercase tracking-wider text-[10px] whitespace-nowrap min-w-[132px]"
                    style={STYLE_TEXT_SECONDARY}
                  >
                    Memory
                  </th>
                  <th
                    scope="col"
                    className="px-3.5 py-2.5 text-right font-semibold uppercase tracking-wider text-[10px] whitespace-nowrap"
                    style={STYLE_TEXT_SECONDARY}
                  >
                    Select
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleEntries.map((entry) => {
                  const proc = entry.item;
                  const isSelected = selectedEntry?.rowKey === entry.rowKey;
                  const statusMeta = getStatusBadgeMeta(proc.status);
                  const cpuColor = getCpuMeterColor(proc.cpuPct);
                  const memoryFillPct = Math.round(
                    clampNumber(
                      (proc.memoryMb / memoryCeilingMb) * 100,
                      0,
                      100,
                      0
                    )
                  );
                  const memoryColor = getMemoryMeterColor(memoryFillPct);
                  const formattedMemory = `${formatUsNumber(proc.memoryMb)} MB`;

                  return (
                    <tr
                      key={entry.rowKey}
                      aria-selected={isSelected}
                      data-testid={`task-manager-row-${entry.rowKey}`}
                      data-pid={String(proc.pid)}
                      data-status={proc.status}
                      data-selected={isSelected ? 'true' : undefined}
                      onClick={() => handleSelectEntry(entry)}
                      className={cx(
                        'border-b last:border-b-0 transition-colors',
                        disabled ? 'cursor-not-allowed' : 'cursor-pointer'
                      )}
                      style={{
                        borderColor: 'var(--prism-divider)',
                        backgroundColor: isSelected
                          ? 'color-mix(in srgb, var(--prism-primary-main) 12%, transparent)'
                          : undefined,
                      }}
                    >
                      <td className="px-3.5 py-2.5 align-middle">
                        <div className="flex flex-col gap-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                            <span
                              data-testid={`task-manager-name-${entry.rowKey}`}
                              className="font-semibold break-words"
                              style={STYLE_TEXT_PRIMARY}
                            >
                              {proc.name}
                            </span>
                            <span
                              className="prism-crystal inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap shrink-0"
                              style={STYLE_TEXT_SECONDARY}
                            >
                              {proc.kind === 'app' ? 'App' : 'Background'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              data-testid={`task-manager-status-${entry.rowKey}`}
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap"
                              style={{
                                color: statusMeta.color,
                                backgroundColor: `color-mix(in srgb, ${statusMeta.color} 13%, transparent)`,
                              }}
                            >
                              <span
                                aria-hidden="true"
                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: statusMeta.color }}
                              />
                              <span>{statusMeta.label}</span>
                            </span>
                          </div>
                        </div>
                      </td>

                      <td
                        data-testid={`task-manager-pid-${entry.rowKey}`}
                        className="px-3 py-2.5 text-right align-middle font-mono tabular-nums whitespace-nowrap"
                        style={STYLE_TEXT_SECONDARY}
                      >
                        {proc.pid}
                      </td>

                      <td className="px-3 py-2.5 text-right align-middle whitespace-nowrap">
                        <div className="inline-flex flex-col items-end gap-1 w-24">
                          <span
                            data-testid={`task-manager-cpu-${entry.rowKey}`}
                            className="font-mono font-semibold tabular-nums"
                            style={STYLE_TEXT_PRIMARY}
                          >
                            {proc.cpuPct.toFixed(1)}%
                          </span>
                          <div
                            role="meter"
                            aria-label={`${proc.name} CPU usage`}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={proc.cpuPct}
                            aria-valuetext={`${proc.cpuPct.toFixed(1)}%`}
                            data-testid={`task-manager-cpu-meter-${entry.rowKey}`}
                            className="w-full h-1.5 rounded-full overflow-hidden"
                            style={STYLE_BG_DIVIDER}
                          >
                            <div
                              data-testid={`task-manager-cpu-bar-${entry.rowKey}`}
                              className="h-full rounded-full transition-[color,background-color,border-color,opacity,transform]"
                              style={{
                                width: `${proc.cpuPct}%`,
                                backgroundColor: cpuColor,
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-2.5 text-right align-middle whitespace-nowrap">
                        <div className="inline-flex flex-col items-end gap-1 w-28">
                          <span
                            data-testid={`task-manager-mem-${entry.rowKey}`}
                            className="font-mono font-semibold tabular-nums"
                            style={STYLE_TEXT_PRIMARY}
                          >
                            {formattedMemory}
                          </span>
                          <div
                            role="meter"
                            aria-label={`${proc.name} memory usage`}
                            aria-valuemin={0}
                            aria-valuemax={memoryCeilingMb}
                            aria-valuenow={proc.memoryMb}
                            aria-valuetext={formattedMemory}
                            data-testid={`task-manager-mem-meter-${entry.rowKey}`}
                            className="w-full h-1.5 rounded-full overflow-hidden"
                            style={STYLE_BG_DIVIDER}
                          >
                            <div
                              data-testid={`task-manager-mem-bar-${entry.rowKey}`}
                              className="h-full rounded-full transition-[color,background-color,border-color,opacity,transform]"
                              style={{
                                width: `${memoryFillPct}%`,
                                backgroundColor: memoryColor,
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="px-3.5 py-2.5 text-right align-middle whitespace-nowrap">
                        <button
                          type="button"
                          disabled={disabled}
                          aria-pressed={isSelected}
                          aria-label={
                            isSelected
                              ? `Deselect ${proc.name}`
                              : `Select ${proc.name}`
                          }
                          data-testid={`task-manager-select-${entry.rowKey}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleSelectEntry(entry);
                          }}
                          className={cx(
                            'prism-focus-ring inline-flex items-center justify-center h-7 px-2.5 rounded-full text-[11px] font-semibold whitespace-nowrap cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]',
                            isSelected ? '' : 'prism-crystal'
                          )}
                          style={
                            isSelected
                              ? STYLE_BADGE_PRIMARY
                              : STYLE_TEXT_PRIMARY
                          }
                        >
                          {isSelected ? 'Selected' : 'Select'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer: Selected Process Summary & Force Quit Action */}
      <div
        className={cx(
          footerClass,
          'pt-2.5 border-t flex flex-wrap items-center justify-between gap-2.5 min-w-0'
        )}
        style={STYLE_BORDER_DIVIDER}
      >
        <p
          data-testid="task-manager-selected-summary"
          className="text-xs font-medium min-w-0 flex-1 break-words"
          style={{
            color: selectedEntry
              ? 'var(--prism-text-primary)'
              : 'var(--prism-text-secondary)',
          }}
        >
          {selectedEntry
            ? `Selected: ${selectedEntry.item.name} (PID ${selectedEntry.item.pid})`
            : 'No process selected'}
        </p>

        <button
          type="button"
          disabled={disabled || selectedEntry === null}
          data-testid="task-manager-force-quit"
          onClick={
            selectedEntry ? () => handleForceQuit(selectedEntry) : undefined
          }
          className={cx(
            'prism-focus-ring inline-flex items-center justify-center gap-1.5 h-8 px-3.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]',
            disabled || selectedEntry === null ? 'prism-well' : ''
          )}
          style={
            disabled || selectedEntry === null
              ? STYLE_TEXT_SECONDARY
              : STYLE_BADGE_ERROR
          }
        >
          <Power aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
          <span>Force Quit</span>
        </button>
      </div>

      {/* Polite live announcements */}
      <div
        aria-live="polite"
        aria-atomic="true"
        data-testid="task-manager-live-status"
        className="sr-only"
      >
        {liveStatus || defaultLiveSummary}
      </div>
    </div>
  );
}

export const TaskManagerDialog = /*#__PURE__*/ memoWithDisplayName(TaskManagerDialogInner, 'TaskManagerDialog');
