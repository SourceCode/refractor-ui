import { CoreDemos } from './demos/CoreDemos';
import { DataVizDemos } from './demos/DataVizDemos';
import { LayoutDemos } from './demos/LayoutDemos';
import { SearchDemos } from './demos/SearchDemos';

export interface ComponentLiveDemoProps {
  componentId: string;
}

const LAYOUT_IDS = new Set([
  'window-splitter',
  'dockable-panel',
  'master-detail-view',
  'virtualized-list',
  'masonry-grid',
  'sticky-action-bar',
]);

const DATAVIZ_IDS = new Set([
  'advanced-data-grid',
  'pivot-table',
  'kanban-board',
  'gantt-chart',
  'diff-viewer',
  'kpi-metric-card',
]);

const SEARCH_IDS = new Set([
  'faceted-filter-bar',
  'visual-query-builder',
  'multi-select-combobox',
  'global-search-modal',
]);

export function ComponentLiveDemo({ componentId }: ComponentLiveDemoProps) {
  if (LAYOUT_IDS.has(componentId)) {
    return <LayoutDemos componentId={componentId} />;
  }
  if (DATAVIZ_IDS.has(componentId)) {
    return <DataVizDemos componentId={componentId} />;
  }
  if (SEARCH_IDS.has(componentId)) {
    return <SearchDemos componentId={componentId} />;
  }
  return <CoreDemos componentId={componentId} />;
}
