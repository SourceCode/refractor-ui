import { AiAgentControlDemos } from './demos/AiAgentControlDemos';
import { AiContextMemoryDemos } from './demos/AiContextMemoryDemos';
import { AiConversationalDemos } from './demos/AiConversationalDemos';
import { CliTerminalDemos } from './demos/CliTerminalDemos';
import { CollaborationDemos } from './demos/CollaborationDemos';
import { CommerceBillingDemos } from './demos/CommerceBillingDemos';
import { ComplexButtonsDemos } from './demos/ComplexButtonsDemos';
import { ComplexControlsDemos } from './demos/ComplexControlsDemos';
import { CoreDemos } from './demos/CoreDemos';
import { CoreTrendChartsDemos } from './demos/CoreTrendChartsDemos';
import { DataVizDemos } from './demos/DataVizDemos';
import { DateTimeSchedulingDemos } from './demos/DateTimeSchedulingDemos';
import { DragDropDemos } from './demos/DragDropDemos';
import { KpiTelemetryChartsDemos } from './demos/KpiTelemetryChartsDemos';
import { LayoutDemos } from './demos/LayoutDemos';
import { MediaSpatialDemos } from './demos/MediaSpatialDemos';
import { MobileUtilitiesDemos } from './demos/MobileUtilitiesDemos';
import { MultiAgentDemos } from './demos/MultiAgentDemos';
import { NumberCurrencyDemos } from './demos/NumberCurrencyDemos';
import { PartToWholeChartsDemos } from './demos/PartToWholeChartsDemos';
import { RelationalFlowChartsDemos } from './demos/RelationalFlowChartsDemos';
import { RichInputDemos } from './demos/RichInputDemos';
import { SearchDemos } from './demos/SearchDemos';
import { SecurityAuthDemos } from './demos/SecurityAuthDemos';
import { StatisticalChartsDemos } from './demos/StatisticalChartsDemos';

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

const MOBILE_UTILITIES_IDS = new Set([
  'bottom-navigation-bar',
  'swipeable-action-row',
  'pull-to-refresh',
  'keycap-badge',
  'cookie-consent-banner',
]);

const CLI_TERMINAL_IDS = new Set([
  'terminal-emulator',
  'command-input-bar',
  'live-log-streamer',
  'copyable-command-block',
  'process-status-pill',
  'structured-output-viewer',
  'terminal-multiplexer',
]);

const AI_AGENT_CONTROL_IDS = new Set([
  'agent-plan-list',
  'tool-call-card',
  'approval-gate-card',
  'agent-control-bar',
  'checkpoint-rollback-strip',
  'inline-diff-reviewer',
  'recovery-routing-card',
]);

const AI_CONTEXT_MEMORY_IDS = new Set([
  'context-token-meter',
  'attached-context-bar',
  'model-parameter-switcher',
  'memory-persona-inspector',
  'connected-tools-drawer',
  'confidence-indicator',
]);

const MULTI_AGENT_IDS = new Set([
  'agent-roster-rail',
  'agent-execution-trace',
  'handoff-divider',
  'parallel-comparison-view',
]);

const DATE_TIME_SCHEDULING_IDS = new Set([
  'date-range-picker',
  'combined-date-time-picker',
  'duration-input',
  'recurrence-builder',
  'month-quarter-year-picker',
  'timezone-selector',
]);

const NUMBER_CURRENCY_IDS = new Set([
  'numeric-stepper',
  'scrubbable-number-field',
  'currency-input',
  'measurement-unit-input',
  'international-phone-input',
  'masked-pattern-input',
]);

const COMPLEX_BUTTONS_IDS = new Set([
  'combo-split-button',
  'hold-to-confirm-button',
  'stateful-async-button',
  'multi-state-cycle-button',
  'speed-dial-button',
]);

const COMPLEX_CONTROLS_IDS = new Set([
  'tri-state-checkbox',
  'dual-thumb-slider',
  'histogram-range-slider',
  'cascading-select',
  'creatable-combobox',
  'rich-selection-cards',
  'rotary-dial',
]);

const CORE_TREND_CHARTS_IDS = new Set([
  'line-multi-series-chart',
  'area-stacked-chart',
  'bar-column-chart',
  'combo-dual-axis-chart',
  'sparkline-chart',
]);

const PART_TO_WHOLE_CHARTS_IDS = new Set([
  'donut-pie-chart',
  'treemap-chart',
  'sunburst-chart',
  'funnel-chart',
  'waterfall-chart',
]);

const STATISTICAL_CHARTS_IDS = new Set([
  'scatter-bubble-plot',
  'histogram-chart',
  'box-whisker-plot',
  'matrix-heatmap',
  'radar-spider-chart',
]);

const RELATIONAL_FLOW_CHARTS_IDS = new Set([
  'sankey-diagram',
  'network-force-graph',
  'chord-diagram',
]);

const KPI_TELEMETRY_CHARTS_IDS = new Set([
  'radial-gauge',
  'bullet-chart',
  'calendar-heatmap',
  'live-telemetry-chart',
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
  if (MOBILE_UTILITIES_IDS.has(componentId)) {
    return <MobileUtilitiesDemos componentId={componentId} />;
  }
  if (CLI_TERMINAL_IDS.has(componentId)) {
    return <CliTerminalDemos componentId={componentId} />;
  }
  if (AI_AGENT_CONTROL_IDS.has(componentId)) {
    return <AiAgentControlDemos componentId={componentId} />;
  }
  if (AI_CONTEXT_MEMORY_IDS.has(componentId)) {
    return <AiContextMemoryDemos componentId={componentId} />;
  }
  if (MULTI_AGENT_IDS.has(componentId)) {
    return <MultiAgentDemos componentId={componentId} />;
  }
  if (DATE_TIME_SCHEDULING_IDS.has(componentId)) {
    return <DateTimeSchedulingDemos componentId={componentId} />;
  }
  if (NUMBER_CURRENCY_IDS.has(componentId)) {
    return <NumberCurrencyDemos componentId={componentId} />;
  }
  if (COMPLEX_BUTTONS_IDS.has(componentId)) {
    return <ComplexButtonsDemos componentId={componentId} />;
  }
  if (COMPLEX_CONTROLS_IDS.has(componentId)) {
    return <ComplexControlsDemos componentId={componentId} />;
  }
  if (CORE_TREND_CHARTS_IDS.has(componentId)) {
    return <CoreTrendChartsDemos componentId={componentId} />;
  }
  if (PART_TO_WHOLE_CHARTS_IDS.has(componentId)) {
    return <PartToWholeChartsDemos componentId={componentId} />;
  }
  if (STATISTICAL_CHARTS_IDS.has(componentId)) {
    return <StatisticalChartsDemos componentId={componentId} />;
  }
  if (RELATIONAL_FLOW_CHARTS_IDS.has(componentId)) {
    return <RelationalFlowChartsDemos componentId={componentId} />;
  }
  if (KPI_TELEMETRY_CHARTS_IDS.has(componentId)) {
    return <KpiTelemetryChartsDemos componentId={componentId} />;
  }
  return <CoreDemos componentId={componentId} />;
}
