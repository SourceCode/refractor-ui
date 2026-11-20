import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { GanttChart, type GanttTaskItem } from './index';

const BASE_TASKS: ReadonlyArray<GanttTaskItem> = [
  {
    id: 't1',
    title: 'Optical Token Spec',
    assignee: 'Ava',
    startDate: '2026-11-01',
    endDate: '2026-11-04',
    progress: 100,
    tone: 'emerald',
  },
  {
    id: 't2',
    title: 'Core Refraction Engine',
    assignee: 'Marcus',
    startDate: '2026-11-06',
    endDate: '2026-11-10',
    progress: 65,
    dependencies: ['t1'],
    tone: 'primary',
  },
  {
    id: 't3',
    title: 'Docs Workbench Integration',
    assignee: 'Ava',
    startDate: '2026-11-08',
    endDate: '2026-11-14',
    progress: 30,
    dependencies: ['t2'],
    tone: 'cobalt',
  },
];

describe('GanttChart', () => {
  it('renders tasks, tones, progress bars, today marker, SVG connectors, overrides, and forwards React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();
    const onSelectTask = vi.fn();

    const { container } = render(
      <PrismThemeProvider
        theme={{
          components: {
            GanttChart: { className: 'theme-gantt', style: { marginTop: '4px' } },
          },
        }}
      >
        <GanttChart
          ref={ref}
          tasks={BASE_TASKS}
          todayIso="2026-11-06"
          onSelectTask={onSelectTask}
          className="custom-gantt"
          xstyle={{ '--prism-blur-px': '20px' }}
          data-testid="gantt"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('gantt');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass('refractor-gantt-chart', 'prism-slab', 'theme-gantt', 'custom-gantt');
    expect(root).toHaveAttribute('data-scale', 'days');
    expect(root).toHaveStyle({ marginTop: '4px' });

    const bar1 = screen.getByRole('button', { name: 'Optical Token Spec (Ava, 100%)' });
    const bar2 = screen.getByRole('button', { name: 'Core Refraction Engine (Marcus, 65%)' });
    const bar3 = screen.getByRole('button', { name: 'Docs Workbench Integration (Ava, 30%)' });

    expect(bar1).toHaveClass('prism-emerald');
    expect(bar2).toHaveClass('prism-btn-primary');
    expect(bar3).toHaveClass('prism-btn-cobalt');

    const todayMarker = container.querySelector('[data-today-marker="2026-11-06"]');
    expect(todayMarker).not.toBeNull();

    // SVG dependency connectors use semantic token stroke and zero raw hex colors
    const depSvg = container.querySelector('svg[data-dependency-layer="true"]');
    expect(depSvg).not.toBeNull();
    const paths = depSvg!.querySelectorAll('path[data-dependency-from]');
    expect(paths).toHaveLength(2);
    for (const path of paths) {
      expect(path).toHaveAttribute('stroke', 'var(--prism-secondary-main)');
    }
    expect(depSvg!.outerHTML).not.toMatch(/#[0-9a-fA-F]{3,6}/);

    // Selecting bar updates internal selection and fires callback
    fireEvent.click(bar2);
    expect(onSelectTask).toHaveBeenCalledWith(BASE_TASKS[1]);
    expect(bar2).toHaveAttribute('aria-pressed', 'true');
    expect(bar2).toHaveAttribute('data-selected', 'true');

    // Selecting left pane task row also fires callback
    const row3 = container.querySelector('[data-task-row="t3"]') as HTMLButtonElement;
    fireEvent.click(row3);
    expect(onSelectTask).toHaveBeenLastCalledWith(BASE_TASKS[2]);
    expect(bar3).toHaveAttribute('aria-pressed', 'true');
  });

  it('switches across Days, Weeks, and Months scales in uncontrolled and controlled modes', () => {
    const onScaleChange = vi.fn();
    const multiMonthTasks: GanttTaskItem[] = [
      {
        id: 'm1',
        title: 'Phase 1',
        assignee: 'Ava',
        startDate: '2026-11-15',
        endDate: '2026-12-20',
        progress: 50,
      },
    ];

    const { rerender } = render(
      <GanttChart
        tasks={multiMonthTasks}
        defaultScale="days"
        onScaleChange={onScaleChange}
        data-testid="gantt-scale"
      />
    );

    const root = screen.getByTestId('gantt-scale');
    expect(root).toHaveAttribute('data-scale', 'days');

    fireEvent.click(screen.getByRole('button', { name: 'Weeks' }));
    expect(root).toHaveAttribute('data-scale', 'weeks');
    expect(onScaleChange).toHaveBeenCalledWith('weeks');
    expect(screen.getByText('Wk Nov 15')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Months' }));
    expect(root).toHaveAttribute('data-scale', 'months');
    expect(onScaleChange).toHaveBeenCalledWith('months');
    expect(screen.getByText('Nov 2026')).toBeInTheDocument();
    expect(screen.getByText('Dec 2026')).toBeInTheDocument();

    // Controlled scale does not mutate until prop updates
    rerender(
      <GanttChart
        tasks={multiMonthTasks}
        scale="weeks"
        onScaleChange={onScaleChange}
        data-testid="gantt-scale"
      />
    );
    expect(root).toHaveAttribute('data-scale', 'weeks');
    fireEvent.click(screen.getByRole('button', { name: 'Days' }));
    expect(onScaleChange).toHaveBeenCalledWith('days');
    expect(root).toHaveAttribute('data-scale', 'weeks');
  });

  it('toggles Resource Lanes grouping by assignee and syncs prop updates and controlled selection', () => {
    const tasksWithBlankAssignee: GanttTaskItem[] = [
      ...BASE_TASKS,
      {
        id: 't4',
        title: 'Unassigned QA Sweep',
        assignee: '   ',
        startDate: '2026-11-12',
        endDate: '2026-11-13',
      },
    ];

    const { container, rerender } = render(
      <GanttChart
        tasks={tasksWithBlankAssignee}
        selectedTaskId="t1"
        data-testid="gantt-group"
      />
    );

    const root = screen.getByTestId('gantt-group');
    expect(root).not.toHaveAttribute('data-grouped');
    expect(container.querySelectorAll('[data-resource-group]')).toHaveLength(0);

    const toggle = screen.getByRole('button', { name: 'Resource Lanes' });
    fireEvent.click(toggle);
    expect(root).toHaveAttribute('data-grouped', 'true');
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(container.querySelector('[data-resource-group="Ava"]')).not.toBeNull();
    expect(container.querySelector('[data-resource-group="Marcus"]')).not.toBeNull();
    expect(container.querySelector('[data-resource-group="Unassigned"]')).not.toBeNull();

    // Controlled selectedTaskId stays pinned even when clicking another bar
    fireEvent.click(screen.getByRole('button', { name: 'Core Refraction Engine (Marcus, 65%)' }));
    expect(
      screen.getByRole('button', { name: 'Optical Token Spec (Ava, 100%)' })
    ).toHaveAttribute('aria-pressed', 'true');

    // Syncing groupByResource prop updates grouped state cleanly
    rerender(
      <GanttChart
        tasks={tasksWithBlankAssignee}
        groupByResource
        selectedTaskId={null}
        data-testid="gantt-group"
      />
    );
    expect(root).toHaveAttribute('data-grouped', 'true');

    rerender(
      <GanttChart
        tasks={tasksWithBlankAssignee}
        groupByResource={false}
        selectedTaskId={null}
        data-testid="gantt-group"
      />
    );
    expect(root).not.toHaveAttribute('data-grouped');
  });

  it('handles inverted dates, invalid date strings, progress clamping, and out-of-range todayIso (adversarial)', () => {
    const adversarialTasks: GanttTaskItem[] = [
      {
        id: 'inv',
        title: 'Inverted Task',
        assignee: 'Ava',
        startDate: '2026-11-15',
        endDate: '2026-11-10',
        progress: 185,
      },
      {
        id: 'bad-end',
        title: 'Bad End Date',
        assignee: 'Ben',
        startDate: '2026-11-12',
        endDate: '2026-02-31',
        progress: -42,
      },
      {
        id: 'bad-start',
        title: 'Bad Start Date',
        assignee: 'Cara',
        startDate: 'not-a-date',
        endDate: '2026-11-13',
        progress: Number.NaN,
      },
      {
        id: 'both-bad',
        title: 'Both Invalid Dates',
        assignee: 'Dev',
        startDate: 'invalid',
        endDate: 'also-invalid',
        progress: Number.POSITIVE_INFINITY,
      },
      // Duplicate ID should be deduplicated safely
      {
        id: 'inv',
        title: 'Duplicate Ignored',
        assignee: 'Ghost',
        startDate: '2026-11-01',
        endDate: '2026-11-02',
      },
    ];

    const { container, rerender } = render(
      <GanttChart tasks={adversarialTasks} todayIso="invalid-today" />
    );

    expect(screen.queryByText('Duplicate Ignored')).not.toBeInTheDocument();
    expect(container.querySelector('[data-today-marker]')).toBeNull();

    // Inverted task swapped to 2026-11-10..2026-11-15 (6d) and progress clamped to 100%
    expect(screen.getByText('2026-11-10 · 6d')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Inverted Task (Ava, 100%)' })
    ).toHaveAttribute('data-progress', '100');

    // Negative and NaN/Infinity progress clamped to 0%
    expect(
      screen.getByRole('button', { name: 'Bad End Date (Ben, 0%)' })
    ).toHaveAttribute('data-progress', '0');
    expect(
      screen.getByRole('button', { name: 'Bad Start Date (Cara, 0%)' })
    ).toHaveAttribute('data-progress', '0');
    expect(
      screen.getByRole('button', { name: 'Both Invalid Dates (Dev, 0%)' })
    ).toHaveAttribute('data-progress', '0');

    // Out-of-range todayIso hides marker without blowing up range
    rerender(<GanttChart tasks={BASE_TASKS} todayIso="2099-01-01" />);
    expect(container.querySelector('[data-today-marker]')).toBeNull();

    // All-invalid tasks fall back gracefully to default anchor date
    rerender(
      <GanttChart
        tasks={[
          {
            id: 'all-bad',
            title: 'Fallback Task',
            assignee: 'Sam',
            startDate: 'bad',
            endDate: 'bad',
          },
        ]}
      />
    );
    expect(
      screen.getByRole('button', { name: 'Fallback Task (Sam, 0%)' })
    ).toBeInTheDocument();
    expect(screen.getByText('2026-11-01 · 1d')).toBeInTheDocument();
  });

  it('handles cyclic dependencies, self-loops, duplicates, missing IDs, and extreme date ranges safely', () => {
    const cyclicTasks: GanttTaskItem[] = [
      {
        id: 'a',
        title: 'Cycle Node A',
        assignee: 'Ava',
        startDate: '2026-11-01',
        endDate: '2026-11-04',
        dependencies: ['b', 'b', 'a', 'nonexistent'],
      },
      {
        id: 'b',
        title: 'Cycle Node B',
        assignee: 'Ben',
        startDate: '2026-11-03',
        endDate: '2026-11-07',
        dependencies: ['a'],
      },
    ];

    const { container, rerender } = render(<GanttChart tasks={cyclicTasks} />);
    const paths = container.querySelectorAll('path[data-dependency-from]');
    // Exactly 2 finite connectors: b->a and a->b (duplicates, self-loop, missing ID skipped)
    expect(paths).toHaveLength(2);
    expect(container.querySelector('[data-dependency-from="b"][data-dependency-to="a"]')).not.toBeNull();
    expect(container.querySelector('[data-dependency-from="a"][data-dependency-to="b"]')).not.toBeNull();

    // Extreme multi-year span caps canvas width and tick counts across all scales without hanging
    const wideSpanTasks: GanttTaskItem[] = [
      {
        id: 'wide',
        title: 'Multi-Year Program',
        assignee: 'Lead',
        startDate: '2020-01-01',
        endDate: '2026-12-31',
        progress: 55,
      },
    ];
    rerender(<GanttChart tasks={wideSpanTasks} scale="days" />);
    expect(container.querySelectorAll('[data-timeline-tick]').length).toBeLessThanOrEqual(180);

    rerender(<GanttChart tasks={wideSpanTasks} scale="weeks" />);
    expect(container.querySelectorAll('[data-timeline-tick]').length).toBeLessThanOrEqual(120);

    rerender(<GanttChart tasks={wideSpanTasks} scale="months" />);
    expect(container.querySelectorAll('[data-timeline-tick]').length).toBeLessThanOrEqual(240);
  });

  it('renders empty state message and safely renders adversarial XSS payloads as literal text', () => {
    const xss = '<script>window.__ganttXss=1</script><img src=x onerror=alert(1)>';
    const { rerender } = render(
      <GanttChart tasks={[]} emptyMessage="No sprint items queued." data-testid="empty-gantt" />
    );

    const root = screen.getByTestId('empty-gantt');
    expect(root).toHaveAttribute('data-empty', 'true');
    expect(screen.getByText('No sprint items queued.')).toBeInTheDocument();

    // Default empty message
    rerender(<GanttChart tasks={[]} />);
    expect(screen.getByText('No scheduled tasks to display.')).toBeInTheDocument();

    // XSS payload renders as literal text
    rerender(
      <GanttChart
        tasks={[
          {
            id: 'xss',
            title: xss,
            assignee: xss,
            startDate: '2026-11-01',
            endDate: '2026-11-03',
          },
        ]}
      />
    );
    expect(document.querySelector('script')).toBeNull();
    expect(screen.getAllByText(xss).length).toBeGreaterThanOrEqual(2);
  });
});
