'use client';

import { useMemo, useState } from 'react';
import { Users } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { themeProps } from '../utils/themeProps';

export type GanttScale = 'days' | 'weeks' | 'months';

export interface GanttTaskItem {
  id: string;
  title: string;
  assignee: string;
  startDate: string;
  endDate: string;
  progress?: number;
  dependencies?: ReadonlyArray<string>;
  tone?: 'primary' | 'emerald' | 'cobalt';
}

export interface GanttChartProps extends BaseProps<HTMLDivElement> {
  /** Scheduled tasks plotted along the refractive timeline. */
  tasks: ReadonlyArray<GanttTaskItem>;
  /** Controlled timeline scale ('days' | 'weeks' | 'months'). */
  scale?: GanttScale;
  /** Initial timeline scale when uncontrolled (defaults to 'days'). */
  defaultScale?: GanttScale;
  /** Invoked when the active timeline scale changes. */
  onScaleChange?: (scale: GanttScale) => void;
  /** Groups timeline rows by assignee resource lanes (defaults to false; toggleable in toolbar). */
  groupByResource?: boolean;
  /** Controlled selected task ID. */
  selectedTaskId?: string | null;
  /** Invoked when a task row or refractive bar is clicked. */
  onSelectTask?: (task: GanttTaskItem) => void;
  /** Optional YYYY-MM-DD ISO date rendered as a vertical today hairline marker. */
  todayIso?: string;
  /** Message displayed when tasks is empty. */
  emptyMessage?: string;
}

const MS_PER_DAY = 86_400_000;
const FALLBACK_DAY_INDEX = Math.floor(Date.UTC(2026, 10, 1) / MS_PER_DAY);
const TASK_ROW_HEIGHT = 48;
const GROUP_ROW_HEIGHT = 32;
const MAX_CANVAS_WIDTH_PX = 4800;

const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

const SCALE_OPTIONS: ReadonlyArray<{ value: GanttScale; label: string }> = [
  { value: 'days', label: 'Days' },
  { value: 'weeks', label: 'Weeks' },
  { value: 'months', label: 'Months' },
];

interface NormalizedGanttTask {
  raw: GanttTaskItem;
  id: string;
  title: string;
  assigneeLabel: string;
  startDay: number;
  endDay: number;
  durationDays: number;
  progress: number;
  tone: 'primary' | 'emerald' | 'cobalt';
}

interface TimelineTick {
  key: string;
  label: string;
  spanDays: number;
}

interface TaskGeometry {
  startX: number;
  endX: number;
  widthPx: number;
  centerY: number;
}

interface DependencyEdge {
  key: string;
  fromId: string;
  toId: string;
  path: string;
  endX: number;
  endY: number;
}

type GanttVisualRow =
  | {
      kind: 'group';
      key: string;
      assignee: string;
      count: number;
      topPx: number;
      heightPx: number;
    }
  | {
      kind: 'task';
      key: string;
      task: NormalizedGanttTask;
      topPx: number;
      heightPx: number;
    };

function parseIsoDay(raw: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const ms = Date.UTC(year, month - 1, day);
  const check = new Date(ms);
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return null;
  }
  return Math.floor(ms / MS_PER_DAY);
}

function formatIsoDay(dayIndex: number): string {
  return new Date(dayIndex * MS_PER_DAY).toISOString().slice(0, 10);
}

function getToneClass(tone: 'primary' | 'emerald' | 'cobalt'): string {
  if (tone === 'emerald') return 'prism-emerald';
  if (tone === 'cobalt') return 'prism-btn-cobalt';
  return 'prism-btn-primary';
}

function buildTimelineTicks(startDay: number, endDay: number, scale: GanttScale): TimelineTick[] {
  const ticks: TimelineTick[] = [];
  const totalDays = Math.max(1, endDay - startDay + 1);

  if (scale === 'days') {
    const step = Math.max(1, Math.ceil(totalDays / 180));
    for (let day = startDay; day <= endDay; day += step) {
      const d = new Date(day * MS_PER_DAY);
      const spanDays = Math.min(step, endDay - day + 1);
      ticks.push({
        key: `day-${day}`,
        label: `${MONTH_SHORT[d.getUTCMonth()]} ${d.getUTCDate()}`,
        spanDays,
      });
    }
    return ticks;
  }

  if (scale === 'weeks') {
    const step = Math.max(7, Math.ceil(totalDays / 120) * 7);
    for (let day = startDay; day <= endDay; day += step) {
      const d = new Date(day * MS_PER_DAY);
      const spanDays = Math.min(step, endDay - day + 1);
      ticks.push({
        key: `week-${day}`,
        label: `Wk ${MONTH_SHORT[d.getUTCMonth()]} ${d.getUTCDate()}`,
        spanDays,
      });
    }
    return ticks;
  }

  let cursor = startDay;
  let guard = 0;
  while (cursor <= endDay && guard < 240) {
    const d = new Date(cursor * MS_PER_DAY);
    const year = d.getUTCFullYear();
    const month = d.getUTCMonth();
    const monthEndMs = Date.UTC(year, month + 1, 0);
    const monthEndDay = Math.floor(monthEndMs / MS_PER_DAY);
    const bucketEnd = Math.min(endDay, monthEndDay);
    ticks.push({
      key: `month-${year}-${month}-${cursor}`,
      label: `${MONTH_SHORT[month]} ${year}`,
      spanDays: bucketEnd - cursor + 1,
    });
    cursor = bucketEnd + 1;
    guard += 1;
  }
  return ticks;
}

function buildConnectorPath(from: TaskGeometry, to: TaskGeometry): string {
  const x1 = from.endX;
  const y1 = from.centerY;
  const x2 = to.startX;
  const y2 = to.centerY;

  if (x2 >= x1 + 12) {
    const midX = Math.round(x1 + (x2 - x1) / 2);
    return `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
  }

  const exitX = x1 + 10;
  const entryX = Math.max(4, x2 - 10);
  const midY = Math.round(y1 + (y2 - y1) / 2);
  return `M ${x1} ${y1} L ${exitX} ${y1} L ${exitX} ${midY} L ${entryX} ${midY} L ${entryX} ${y2} L ${x2} ${y2}`;
}

export function GanttChart({
  tasks,
  scale,
  defaultScale = 'days',
  onScaleChange,
  groupByResource = false,
  selectedTaskId,
  onSelectTask,
  todayIso,
  emptyMessage = 'No scheduled tasks to display.',
  className,
  style,
  xstyle,
  'aria-label': ariaLabel = 'Gantt timeline chart',
  ref,
  ...rest
}: GanttChartProps) {
  const override = useComponentOverride('GanttChart');
  const [activeScale, setActiveScale] = useControllableState<GanttScale>({
    value: scale,
    defaultValue: defaultScale,
    onChange: onScaleChange,
  });

  const [grouped, setGrouped] = useState<boolean>(groupByResource);
  const [prevGroupProp, setPrevGroupProp] = useState<boolean>(groupByResource);
  if (groupByResource !== prevGroupProp) {
    setPrevGroupProp(groupByResource);
    setGrouped(groupByResource);
  }

  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);
  const activeSelectedId = selectedTaskId !== undefined ? selectedTaskId : internalSelectedId;

  const todayDay = useMemo(() => (todayIso ? parseIsoDay(todayIso) : null), [todayIso]);

  const normalizedTasks = useMemo<NormalizedGanttTask[]>(() => {
    const deduped: GanttTaskItem[] = [];
    const seenIds = new Set<string>();
    for (const task of tasks) {
      if (!seenIds.has(task.id)) {
        seenIds.add(task.id);
        deduped.push(task);
      }
    }

    let anchorDay: number | null = null;
    for (const task of deduped) {
      const parsedStart = parseIsoDay(task.startDate);
      const parsedEnd = parseIsoDay(task.endDate);
      if (parsedStart !== null) {
        anchorDay = anchorDay === null ? parsedStart : Math.min(anchorDay, parsedStart);
      }
      if (parsedEnd !== null) {
        anchorDay = anchorDay === null ? parsedEnd : Math.min(anchorDay, parsedEnd);
      }
    }
    const fallbackDay = anchorDay ?? todayDay ?? FALLBACK_DAY_INDEX;

    return deduped.map((task) => {
      const parsedStart = parseIsoDay(task.startDate);
      const parsedEnd = parseIsoDay(task.endDate);

      let startDay: number;
      let endDay: number;
      if (parsedStart !== null && parsedEnd !== null) {
        if (parsedEnd < parsedStart) {
          startDay = parsedEnd;
          endDay = parsedStart;
        } else {
          startDay = parsedStart;
          endDay = parsedEnd;
        }
      } else if (parsedStart !== null) {
        startDay = parsedStart;
        endDay = parsedStart;
      } else if (parsedEnd !== null) {
        startDay = parsedEnd;
        endDay = parsedEnd;
      } else {
        startDay = fallbackDay;
        endDay = fallbackDay;
      }

      const durationDays = Math.max(1, endDay - startDay + 1);
      const progress = Math.round(clampNumber(task.progress ?? 0, 0, 100, 0));
      const assigneeLabel = task.assignee.trim() || 'Unassigned';
      const tone = task.tone ?? 'primary';

      return {
        raw: task,
        id: task.id,
        title: task.title,
        assigneeLabel,
        startDay,
        endDay,
        durationDays,
        progress,
        tone,
      };
    });
  }, [tasks, todayDay]);

  const timelineRange = useMemo(() => {
    if (normalizedTasks.length === 0) {
      return {
        startDay: FALLBACK_DAY_INDEX,
        endDay: FALLBACK_DAY_INDEX,
        totalDays: 1,
        pxPerDay: 44,
        widthPx: 360,
        ticks: [] as TimelineTick[],
      };
    }

    let minDay = normalizedTasks[0]!.startDay;
    let maxDay = normalizedTasks[0]!.endDay;
    for (const task of normalizedTasks) {
      if (task.startDay < minDay) minDay = task.startDay;
      if (task.endDay > maxDay) maxDay = task.endDay;
    }

    const totalDays = Math.max(1, maxDay - minDay + 1);
    const basePxPerDay = activeScale === 'days' ? 44 : activeScale === 'weeks' ? 20 : 10;
    const pxPerDay =
      totalDays * basePxPerDay > MAX_CANVAS_WIDTH_PX
        ? MAX_CANVAS_WIDTH_PX / totalDays
        : basePxPerDay;
    const widthPx = Math.max(360, Math.round(totalDays * pxPerDay));
    const ticks = buildTimelineTicks(minDay, maxDay, activeScale);

    return {
      startDay: minDay,
      endDay: maxDay,
      totalDays,
      pxPerDay,
      widthPx,
      ticks,
    };
  }, [normalizedTasks, activeScale]);

  const { visualRows, totalBodyHeightPx, geometryMap, dependencyEdges } = useMemo(() => {
    const rows: GanttVisualRow[] = [];
    const geom = new Map<string, TaskGeometry>();
    let cursorTop = 0;

    if (grouped) {
      const byResource = new Map<string, NormalizedGanttTask[]>();
      for (const task of normalizedTasks) {
        const list = byResource.get(task.assigneeLabel);
        if (list) {
          list.push(task);
        } else {
          byResource.set(task.assigneeLabel, [task]);
        }
      }

      for (const [assignee, laneTasks] of byResource.entries()) {
        rows.push({
          kind: 'group',
          key: `group-${assignee}`,
          assignee,
          count: laneTasks.length,
          topPx: cursorTop,
          heightPx: GROUP_ROW_HEIGHT,
        });
        cursorTop += GROUP_ROW_HEIGHT;

        for (const task of laneTasks) {
          const startX = Math.round((task.startDay - timelineRange.startDay) * timelineRange.pxPerDay);
          const widthPx = Math.max(28, Math.round(task.durationDays * timelineRange.pxPerDay));
          geom.set(task.id, {
            startX,
            endX: startX + widthPx,
            widthPx,
            centerY: cursorTop + TASK_ROW_HEIGHT / 2,
          });
          rows.push({
            kind: 'task',
            key: `task-${task.id}`,
            task,
            topPx: cursorTop,
            heightPx: TASK_ROW_HEIGHT,
          });
          cursorTop += TASK_ROW_HEIGHT;
        }
      }
    } else {
      for (const task of normalizedTasks) {
        const startX = Math.round((task.startDay - timelineRange.startDay) * timelineRange.pxPerDay);
        const widthPx = Math.max(28, Math.round(task.durationDays * timelineRange.pxPerDay));
        geom.set(task.id, {
          startX,
          endX: startX + widthPx,
          widthPx,
          centerY: cursorTop + TASK_ROW_HEIGHT / 2,
        });
        rows.push({
          kind: 'task',
          key: `task-${task.id}`,
          task,
          topPx: cursorTop,
          heightPx: TASK_ROW_HEIGHT,
        });
        cursorTop += TASK_ROW_HEIGHT;
      }
    }

    const edges: DependencyEdge[] = [];
    const seenEdges = new Set<string>();
    for (const task of normalizedTasks) {
      const deps = task.raw.dependencies;
      if (!deps || deps.length === 0) continue;
      const toGeom = geom.get(task.id);
      if (!toGeom) continue;

      for (const depId of deps) {
        if (depId === task.id) continue;
        const edgeKey = `${depId}->${task.id}`;
        if (seenEdges.has(edgeKey)) continue;
        const fromGeom = geom.get(depId);
        if (!fromGeom) continue;

        seenEdges.add(edgeKey);
        edges.push({
          key: edgeKey,
          fromId: depId,
          toId: task.id,
          path: buildConnectorPath(fromGeom, toGeom),
          endX: toGeom.startX,
          endY: toGeom.centerY,
        });
      }
    }

    return {
      visualRows: rows,
      totalBodyHeightPx: Math.max(TASK_ROW_HEIGHT, cursorTop),
      geometryMap: geom,
      dependencyEdges: edges,
    };
  }, [grouped, normalizedTasks, timelineRange]);

  const todayOffsetPx =
    todayDay !== null &&
    normalizedTasks.length > 0 &&
    todayDay >= timelineRange.startDay &&
    todayDay <= timelineRange.endDay
      ? Math.round((todayDay - timelineRange.startDay) * timelineRange.pxPerDay + timelineRange.pxPerDay / 2)
      : null;

  const handleSelectTask = (task: GanttTaskItem) => {
    if (selectedTaskId === undefined) {
      setInternalSelectedId(task.id);
    }
    onSelectTask?.(task);
  };

  const merged = mergeProps({
    themeTarget: themeProps('gantt-chart', {
      scale: activeScale,
      grouped,
      empty: normalizedTasks.length === 0,
    }),
    baseClassName: 'prism-slab p-4 space-y-4 overflow-hidden',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div ref={ref} role="region" aria-label={ariaLabel} {...rest} {...merged}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
            Schedule Timeline
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {normalizedTasks.length > 0
              ? `${normalizedTasks.length} tasks · ${formatIsoDay(timelineRange.startDay)} → ${formatIsoDay(timelineRange.endDay)}`
              : '0 scheduled tasks'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="Timeline scale"
            className="prism-crystal p-1 rounded-full inline-flex items-center gap-1"
          >
            {SCALE_OPTIONS.map((opt) => {
              const isSelected = activeScale === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setActiveScale(opt.value)}
                  className={`prism-focus-ring px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                    isSelected
                      ? 'prism-well text-slate-900 dark:text-white font-semibold'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            aria-pressed={grouped}
            onClick={() => setGrouped((prev) => !prev)}
            className={`prism-crystal prism-focus-ring px-3 py-1.5 rounded-full text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
              grouped
                ? 'prism-well text-slate-900 dark:text-white font-semibold'
                : 'text-slate-700 dark:text-slate-200'
            }`}
          >
            <Users aria-hidden="true" className="w-3.5 h-3.5" />
            <span>Resource Lanes</span>
          </button>
        </div>
      </div>

      {normalizedTasks.length === 0 ? (
        <div className="prism-well rounded-2xl px-4 py-8 text-center text-xs text-slate-500 dark:text-slate-400">
          {emptyMessage}
        </div>
      ) : (
        <div className="prism-well rounded-2xl overflow-hidden flex border border-slate-300/45 dark:border-slate-700/50">
          <div className="w-32 sm:w-48 md:w-56 shrink-0 border-r border-slate-300/50 dark:border-slate-700/60 bg-white/30 dark:bg-white/[0.02]">
            <div className="h-10 px-2.5 sm:px-3 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 border-b border-slate-300/50 dark:border-slate-700/60">
              <span>Task</span>
              <span className="hidden sm:inline">Assignee</span>
            </div>

            <div>
              {visualRows.map((row) => {
                if (row.kind === 'group') {
                  return (
                    <div
                      key={row.key}
                      data-resource-group={row.assignee}
                      style={{ height: `${row.heightPx}px` }}
                      className="px-2.5 sm:px-3 flex items-center justify-between gap-2 bg-white/45 dark:bg-white/[0.04] border-b border-slate-200/60 dark:border-slate-700/50"
                    >
                      <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-100 truncate">
                        {row.assignee}
                      </span>
                      <span className="font-mono text-[10px] tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
                        {row.count}
                      </span>
                    </div>
                  );
                }

                const isSelected = activeSelectedId === row.task.id;
                return (
                  <button
                    key={row.key}
                    type="button"
                    aria-pressed={isSelected}
                    data-task-row={row.task.id}
                    onClick={() => handleSelectTask(row.task.raw)}
                    style={{ height: `${row.heightPx}px` }}
                    className={`prism-focus-ring w-full px-2.5 sm:px-3 flex items-center justify-between gap-2 text-left border-b border-slate-200/50 dark:border-slate-700/40 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-sky-500/15 text-slate-900 dark:text-white'
                        : 'hover:bg-white/40 dark:hover:bg-white/[0.04]'
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-semibold text-slate-900 dark:text-white truncate">
                        {row.task.title}
                      </span>
                      <span className="block text-[10px] font-mono tabular-nums text-slate-500 dark:text-slate-400 truncate">
                        {formatIsoDay(row.task.startDay)} · {row.task.durationDays}d
                      </span>
                    </span>
                    <span className="hidden sm:inline text-[11px] text-slate-600 dark:text-slate-300 truncate max-w-[76px] shrink-0">
                      {row.task.assigneeLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 min-w-0 overflow-x-auto">
            <div style={{ width: `${timelineRange.widthPx}px` }}>
              <div className="h-10 flex border-b border-slate-300/50 dark:border-slate-700/60 bg-white/25 dark:bg-white/[0.02]">
                {timelineRange.ticks.map((tick) => (
                  <div
                    key={tick.key}
                    data-timeline-tick={tick.key}
                    style={{ width: `${Math.round(tick.spanDays * timelineRange.pxPerDay)}px` }}
                    className="px-2 flex items-center text-[11px] font-mono tabular-nums text-slate-600 dark:text-slate-300 border-r border-slate-300/40 dark:border-slate-700/40 shrink-0 truncate"
                  >
                    {tick.label}
                  </div>
                ))}
              </div>

              <div
                className="relative"
                style={{ height: `${totalBodyHeightPx}px` }}
              >
                <div
                  aria-hidden="true"
                  className="absolute inset-0 flex pointer-events-none"
                >
                  {timelineRange.ticks.map((tick) => (
                    <div
                      key={`grid-${tick.key}`}
                      style={{ width: `${Math.round(tick.spanDays * timelineRange.pxPerDay)}px` }}
                      className="h-full border-r border-slate-300/30 dark:border-slate-700/30 shrink-0"
                    />
                  ))}
                </div>

                {visualRows.map((row) => (
                  <div
                    key={`lane-${row.key}`}
                    aria-hidden="true"
                    style={{ top: `${row.topPx}px`, height: `${row.heightPx}px` }}
                    className={`absolute inset-x-0 border-b border-slate-200/50 dark:border-slate-700/40 pointer-events-none ${
                      row.kind === 'group' ? 'bg-white/30 dark:bg-white/[0.03]' : ''
                    }`}
                  />
                ))}

                {dependencyEdges.length > 0 ? (
                  <svg
                    aria-hidden="true"
                    data-dependency-layer="true"
                    width={timelineRange.widthPx}
                    height={totalBodyHeightPx}
                    className="absolute inset-0 pointer-events-none overflow-visible z-[5]"
                  >
                    {dependencyEdges.map((edge) => (
                      <g key={edge.key}>
                        <path
                          d={edge.path}
                          fill="none"
                          stroke="var(--prism-secondary-main)"
                          strokeWidth="1.75"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          data-dependency-from={edge.fromId}
                          data-dependency-to={edge.toId}
                        />
                        <circle
                          cx={edge.endX}
                          cy={edge.endY}
                          r="3"
                          fill="var(--prism-secondary-main)"
                        />
                      </g>
                    ))}
                  </svg>
                ) : null}

                {todayOffsetPx !== null && todayIso ? (
                  <div
                    data-today-marker={todayIso}
                    aria-hidden="true"
                    style={{
                      left: `${todayOffsetPx}px`,
                      backgroundColor: 'var(--prism-primary-main)',
                    }}
                    className="absolute top-0 bottom-0 w-0.5 pointer-events-none z-10"
                  >
                    <span
                      style={{
                        backgroundColor: 'var(--prism-primary-main)',
                        color: 'var(--prism-primary-contrast)',
                      }}
                      className="absolute -top-0.5 -translate-x-1/2 px-1.5 py-0.5 rounded-full text-[9px] font-mono font-semibold uppercase tracking-wide whitespace-nowrap"
                    >
                      Today
                    </span>
                  </div>
                ) : null}

                {visualRows.map((row) => {
                  if (row.kind !== 'task') return null;
                  const geom = geometryMap.get(row.task.id);
                  if (!geom) return null;
                  const isSelected = activeSelectedId === row.task.id;
                  const barTarget = themeProps(
                    'gantt-chart',
                    {
                      taskId: row.task.id,
                      tone: row.task.tone,
                      selected: isSelected,
                    },
                    'bar'
                  );

                  return (
                    <button
                      key={`bar-${row.task.id}`}
                      type="button"
                      aria-pressed={isSelected}
                      aria-label={`${row.task.title} (${row.task.assigneeLabel}, ${row.task.progress}%)`}
                      data-progress={String(row.task.progress)}
                      onClick={() => handleSelectTask(row.task.raw)}
                      {...mergeProps({
                        themeTarget: barTarget,
                        baseClassName: `${getToneClass(row.task.tone)} prism-focus-ring absolute rounded-full overflow-hidden flex items-center px-2.5 text-left cursor-pointer z-[6] transition-shadow ${
                          isSelected ? 'ring-2 ring-sky-400 dark:ring-sky-300 ring-offset-1' : ''
                        }`,
                        baseStyle: {
                          left: `${geom.startX}px`,
                          top: `${row.topPx + 8}px`,
                          width: `${geom.widthPx}px`,
                          height: `${TASK_ROW_HEIGHT - 16}px`,
                        },
                      })}
                    >
                      <span
                        aria-hidden="true"
                        data-progress-bar="true"
                        style={{
                          width: `${row.task.progress}%`,
                          backgroundColor: 'var(--prism-primary-contrast)',
                        }}
                        className="absolute inset-y-0 left-0 opacity-25 pointer-events-none rounded-full"
                      />
                      <span className="relative z-10 truncate text-[11px] font-semibold leading-none">
                        {row.task.title}
                      </span>
                      <span className="relative z-10 ml-auto pl-1.5 text-[10px] font-mono tabular-nums opacity-90 shrink-0">
                        {row.task.progress}%
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

GanttChart.displayName = 'GanttChart';
