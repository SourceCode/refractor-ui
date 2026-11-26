import { useState } from 'react';
import { Activity, DollarSign, Zap } from 'lucide-react';
import {
  AdvancedDataGrid,
  DiffViewer,
  GanttChart,
  type GridRowRecord,
  KanbanBoard,
  type KanbanCardItem,
  KpiMetricCard,
  PivotTable,
} from '@refractor-ui/core';
import { pushToast, useAppDispatch } from '../../system/store';

export interface DataVizDemosProps {
  componentId: string;
}

const INITIAL_GRID_ROWS: GridRowRecord[] = [
  { id: 'r1', values: { component: 'PrimaryButton', category: 'Actions', coverage: 100, status: 'Stable' } },
  { id: 'r2', values: { component: 'WindowSplitter', category: 'Layout', coverage: 99, status: 'Stable' } },
  { id: 'r3', values: { component: 'AdvancedDataGrid', category: 'Data Viz', coverage: 98, status: 'Beta' } },
  { id: 'r4', values: { component: 'PivotTable', category: 'Data Viz', coverage: 97, status: 'Stable' } },
  { id: 'r5', values: { component: 'KanbanBoard', category: 'Data Viz', coverage: 99, status: 'Stable' } },
];

const PIVOT_DATA = [
  { region: 'North America', category: 'Buttons', quarter: 'Q1', revenue: 42000 },
  { region: 'North America', category: 'Data Viz', quarter: 'Q1', revenue: 68000 },
  { region: 'North America', category: 'Buttons', quarter: 'Q2', revenue: 49500 },
  { region: 'Europe', category: 'Buttons', quarter: 'Q1', revenue: 31000 },
  { region: 'Europe', category: 'Data Viz', quarter: 'Q2', revenue: 54000 },
  { region: 'APAC', category: 'Data Viz', quarter: 'Q1', revenue: 39000 },
  { region: 'APAC', category: 'Buttons', quarter: 'Q2', revenue: 28500 },
];

const INITIAL_KANBAN: KanbanCardItem[] = [
  { id: 'k1', columnId: 'todo', title: 'Audit caustic dark-mode contrast', assignee: 'Clara', priority: 'high', tags: ['A11y', 'Optics'] },
  { id: 'k2', columnId: 'progress', title: 'Implement PivotTable Map aggregator', assignee: 'Marcus', priority: 'critical', tags: ['Security', 'Data'] },
  { id: 'k3', columnId: 'review', title: 'Verify CSV formula injection sanitizer', assignee: 'Elena', priority: 'medium', tags: ['OWASP'] },
  { id: 'k4', columnId: 'done', title: 'Ship v1.1.0 Layout Workspace controls', assignee: 'David', priority: 'low', tags: ['Release'] },
];

const GANTT_TASKS = [
  { id: 't1', title: 'Token Architecture & CSS Cascade', assignee: 'Clara Vance', startDate: '2026-11-01', endDate: '2026-11-06', progress: 100, tone: 'emerald' as const },
  { id: 't2', title: 'Core 75 Open-Internals Components', assignee: 'Marcus Chen', startDate: '2026-11-05', endDate: '2026-11-12', progress: 100, dependencies: ['t1'], tone: 'cobalt' as const },
  { id: 't3', title: 'Enterprise Data Viz Suite', assignee: 'Elena Rostova', startDate: '2026-11-11', endDate: '2026-11-19', progress: 82, dependencies: ['t2'], tone: 'primary' as const },
  { id: 't4', title: 'UX/UI Director 9.8+ Polish', assignee: 'Clara Vance', startDate: '2026-11-18', endDate: '2026-11-24', progress: 45, dependencies: ['t3'], tone: 'emerald' as const },
];

const OLD_THEME_SNIPPET = `export const theme = createPrismTheme({
  palette: {
    mode: 'light',
    primary: { main: '#E75C24' },
  },
  optics: { refraction: 'standard' },
});`;

const NEW_THEME_SNIPPET = `export const theme = createPrismTheme({
  palette: {
    mode: 'light',
    primary: { main: '#7C3AED' },
    secondary: { main: '#06B6D4' },
  },
  optics: { refraction: 'vivid', blurPx: 22 },
});`;

export function DataVizDemos({ componentId }: DataVizDemosProps) {
  const dispatch = useAppDispatch();
  const [gridRows, setGridRows] = useState<GridRowRecord[]>(INITIAL_GRID_ROWS);
  const [kanbanCards, setKanbanCards] = useState<KanbanCardItem[]>(INITIAL_KANBAN);

  switch (componentId) {
    case 'advanced-data-grid':
      return (
        <div className="w-full">
          <AdvancedDataGrid
            columns={[
              { key: 'component', header: 'Component', width: 170, pinned: 'left', editable: true, sortable: true },
              { key: 'category', header: 'Category', width: 130, editable: true, sortable: true },
              { key: 'coverage', header: 'Coverage %', width: 120, align: 'right', editable: true, sortable: true },
              { key: 'status', header: 'Status', width: 120, editable: true, sortable: true },
            ]}
            rows={gridRows}
            onCellEdit={(rowId, colKey, nextVal) => {
              setGridRows((prev) =>
                prev.map((r) =>
                  r.id === rowId ? { ...r, values: { ...r.values, [colKey]: nextVal } } : r
                )
              );
              dispatch(
                pushToast({
                  title: `Updated ${colKey}`,
                  description: `Row ${rowId} -> ${String(nextVal)}`,
                  tone: 'emerald',
                })
              );
            }}
            onExportCsv={(_csv, filename) =>
              dispatch(
                pushToast({
                  title: `Exported formula-safe ${filename}`,
                  description: 'OWASP CSV formula neutralization applied.',
                  tone: 'info',
                })
              )
            }
          />
        </div>
      );

    case 'pivot-table':
      return (
        <div className="w-full">
          <PivotTable
            data={PIVOT_DATA}
            fields={[
              { key: 'region', label: 'Region' },
              { key: 'category', label: 'Category' },
              { key: 'quarter', label: 'Quarter' },
              { key: 'revenue', label: 'Revenue ($)', numeric: true },
            ]}
            defaultRowField="region"
            defaultColumnField="quarter"
            defaultValueField="revenue"
            defaultAggregation="sum"
          />
        </div>
      );

    case 'kanban-board':
      return (
        <div className="w-full">
          <KanbanBoard
            columns={[
              { id: 'todo', title: 'To Do', wipLimit: 4 },
              { id: 'progress', title: 'In Progress', wipLimit: 2 },
              { id: 'review', title: 'Review', wipLimit: 2 },
              { id: 'done', title: 'Done' },
            ]}
            cards={kanbanCards}
            onCardsChange={setKanbanCards}
            onCardMove={(cardId, from, to) =>
              dispatch(
                pushToast({
                  title: `Moved ${cardId}`,
                  description: `${from} -> ${to}`,
                  tone: 'emerald',
                })
              )
            }
          />
        </div>
      );

    case 'gantt-chart':
      return (
        <div className="w-full">
          <GanttChart
            tasks={GANTT_TASKS}
            todayIso="2026-11-15"
            onSelectTask={(task) =>
              dispatch(
                pushToast({
                  title: task.title,
                  description: `${task.assignee} · ${task.startDate} to ${task.endDate}`,
                  tone: 'info',
                })
              )
            }
          />
        </div>
      );

    case 'diff-viewer':
      return (
        <div className="w-full">
          <DiffViewer
            title="opticalTheme.ts"
            originalLabel="Alabaster v1.0"
            modifiedLabel="Amethyst v1.2"
            original={OLD_THEME_SNIPPET}
            modified={NEW_THEME_SNIPPET}
          />
        </div>
      );

    case 'kpi-metric-card':
      return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
          <KpiMetricCard
            label="Weekly Package Downloads"
            value="148.2K"
            deltaPercent={18.6}
            deltaLabel="vs last 30d"
            icon={<Activity className="w-4 h-4" />}
            sparkline={[82, 91, 96, 108, 119, 134, 148]}
          />
          <KpiMetricCard
            label="Enterprise ARR"
            prefix="$"
            value="1.42M"
            deltaPercent={11.2}
            deltaLabel="QoQ"
            icon={<DollarSign className="w-4 h-4" />}
            sparkline={[1.02, 1.09, 1.15, 1.24, 1.31, 1.42]}
          />
          <KpiMetricCard
            label="P95 Paint Latency"
            value="4.8"
            unit="ms"
            deltaPercent={-14.3}
            invertDeltaSemantics
            deltaLabel="faster"
            icon={<Zap className="w-4 h-4" />}
            sparkline={[6.4, 6.1, 5.8, 5.4, 5.1, 4.8]}
          />
        </div>
      );

    default:
      return null;
  }
}
