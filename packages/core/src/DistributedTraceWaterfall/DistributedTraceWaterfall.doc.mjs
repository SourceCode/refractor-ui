export const docs = {
  name: 'DistributedTraceWaterfall',
  displayName: 'Distributed Trace Waterfall',
  group: 'System, DevOps & Observability Widgets',
  category: 'observability-widgets',
  keywords: [
    'trace',
    'waterfall',
    'opentelemetry',
    'otel',
    'spans',
    'distributed-tracing',
    'latency',
    'critical-path',
    'observability',
    'apm',
    'devops',
    'jaeger',
    'tempo',
  ],
  usage: {
    description:
      'Sculpted optical-glass OpenTelemetry distributed trace waterfall featuring a prism-slab header with traceId monospace pill, total trace duration (420.0 ms default), live span counter, semantic error badge, and toggleable Errors Only / Critical Path filters; a responsive prism-well timeline viewport with a shared 0ms/25%/50%/75%/100% ruler, cycle-safe nested parent-child span rows (depth capped at 8) with expand/collapse chevrons, semantic --prism-* service pills, proportional horizontal latency bars highlighting critical-path, slow, and error spans; and a recessed aria-live="polite" span inspector displaying timing metadata and literal key=value OpenTelemetry tag chips.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Provide stable span id and parentId references from your OpenTelemetry collector or backend so parent-child latency trees and collapse controls remain deterministic.',
      },
      {
        guidance: true,
        description:
          'Annotate latency-determining spans with criticalPath: true and structured tags (such as http.status_code, db.system, and error.type) to accelerate root-cause triage.',
      },
      {
        guidance: false,
        description:
          'Rely on HTML formatting inside service, operation, or tag values; DistributedTraceWaterfall renders all span metadata strictly as literal text for XSS safety.',
      },
    ],
    accessibility: [
      {
        name: 'Expandable Hierarchy, Toggle Filters & IME-Safe Selection',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Exposes aria-pressed on Errors Only / Critical Path filters and selectable span rows, aria-expanded on parent collapse chevrons, keyboard-only .prism-focus-ring outlines, and IME-guarded Enter/Space span selection',
        description:
          'Enables full keyboard navigation across filter pills, collapsible parent nodes, and individual span rows without hijacking active IME composition.',
      },
      {
        name: 'Polite Live Span Inspector & Empty Status Announcements',
        criterion: '4.1.3 Status Messages',
        requirement:
          'Renders the recessed span inspector with aria-live="polite" and empty/filtered states with role="status"',
        description:
          'Announces updated span metadata and OpenTelemetry tags politely when operators inspect different spans, and communicates empty or zero-match filter states cleanly.',
      },
    ],
  },
  props: [
    {
      name: 'spans',
      type: 'ReadonlyArray<TraceSpanItem>',
      defaultValue: '8 realistic OpenTelemetry checkout spans (420.0 ms total)',
      description:
        'Distributed trace spans across microservices; defaults to an 8-span checkout trace when omitted, or renders a role="status" empty state when passed [].',
    },
    {
      name: 'traceId',
      type: 'string',
      defaultValue: "'tr-9f4a-8c21'",
      description: 'Monospace distributed trace correlation ID displayed in the header pill.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Distributed Trace Waterfall'",
      description: 'Visible slab heading linked to the region via aria-labelledby.',
    },
    {
      name: 'onSelectSpan',
      type: '(span: TraceSpanItem) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked with the selected TraceSpanItem whenever a span row is clicked or activated via Enter/Space.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<DistributedTraceWaterfall\n  traceId="tr-9f4a-8c21"\n  title="Checkout Request Waterfall"\n  onSelectSpan={(span) => console.warn(span.id, span.durationMs)}\n/>`,
    `<DistributedTraceWaterfall\n  traceId="tr-edge-204"\n  spans={[\n    { id: 'root', parentId: null, service: 'api-gateway', operation: 'GET /orders', startMs: 0, durationMs: 145, status: 'ok', criticalPath: true, tags: [{ key: 'http.status_code', value: '200' }] },\n    { id: 'db', parentId: 'root', service: 'postgres-primary', operation: 'SELECT orders', startMs: 22, durationMs: 96, status: 'slow', criticalPath: true, tags: [{ key: 'db.system', value: 'postgresql' }] },\n  ]}\n/>`,
  ],
};

export default docs;
