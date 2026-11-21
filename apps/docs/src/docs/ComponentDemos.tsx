import { AiConversationalDemos } from './demos/AiConversationalDemos';
import { CollaborationDemos } from './demos/CollaborationDemos';
import { CommerceBillingDemos } from './demos/CommerceBillingDemos';
import { CoreDemos } from './demos/CoreDemos';
import { DataVizDemos } from './demos/DataVizDemos';
import { DragDropDemos } from './demos/DragDropDemos';
import { LayoutDemos } from './demos/LayoutDemos';
import { MediaSpatialDemos } from './demos/MediaSpatialDemos';
import { RichInputDemos } from './demos/RichInputDemos';
import { SearchDemos } from './demos/SearchDemos';
import { SecurityAuthDemos } from './demos/SecurityAuthDemos';

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

const MEDIA_SPATIAL_IDS = new Set([
  'custom-video-player',
  'audio-waveform-player',
  'media-lightbox',
  'before-after-slider',
  'interactive-map-viewer',
  'product-360-viewer',
]);

const SECURITY_AUTH_IDS = new Set([
  'otp-code-input',
  'password-strength-meter',
  'secret-key-field',
  'role-permissions-matrix',
  'active-sessions-list',
]);

const COMMERCE_BILLING_IDS = new Set([
  'pricing-tier-matrix',
  'product-variant-selector',
  'shopping-cart-drawer',
  'payment-card-input',
  'promo-coupon-input',
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
  if (MEDIA_SPATIAL_IDS.has(componentId)) {
    return <MediaSpatialDemos componentId={componentId} />;
  }
  if (SECURITY_AUTH_IDS.has(componentId)) {
    return <SecurityAuthDemos componentId={componentId} />;
  }
  if (COMMERCE_BILLING_IDS.has(componentId)) {
    return <CommerceBillingDemos componentId={componentId} />;
  }
  return <CoreDemos componentId={componentId} />;
}
