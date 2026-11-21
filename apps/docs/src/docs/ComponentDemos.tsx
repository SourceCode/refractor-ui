import { AiConversationalDemos } from './demos/AiConversationalDemos';
import { CollaborationDemos } from './demos/CollaborationDemos';
import { CoreDemos } from './demos/CoreDemos';
import { DataVizDemos } from './demos/DataVizDemos';
import { DragDropDemos } from './demos/DragDropDemos';
import { LayoutDemos } from './demos/LayoutDemos';
import { RichInputDemos } from './demos/RichInputDemos';
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

const RICH_INPUT_IDS = new Set([
  'rich-text-editor',
  'code-editor',
  'color-picker',
  'inline-editable-field',
  'image-cropper',
  'signature-pad',
]);

const DRAG_DROP_IDS = new Set([
  'transfer-list',
  'sortable-list',
  'node-graph-canvas',
]);

const COLLABORATION_IDS = new Set([
  'notification-center',
  'comment-thread',
  'live-presence-indicator',
  'product-tour',
]);

const AI_CONVERSATIONAL_IDS = new Set([
  'chat-message-stream',
  'prompt-composer',
  'thinking-accordion',
  'citation-chip',
  'response-action-bar',
  'split-artifact-canvas',
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
  if (RICH_INPUT_IDS.has(componentId)) {
    return <RichInputDemos componentId={componentId} />;
  }
  if (DRAG_DROP_IDS.has(componentId)) {
    return <DragDropDemos componentId={componentId} />;
  }
  if (COLLABORATION_IDS.has(componentId)) {
    return <CollaborationDemos componentId={componentId} />;
  }
  if (AI_CONVERSATIONAL_IDS.has(componentId)) {
    return <AiConversationalDemos componentId={componentId} />;
  }
  return <CoreDemos componentId={componentId} />;
}
