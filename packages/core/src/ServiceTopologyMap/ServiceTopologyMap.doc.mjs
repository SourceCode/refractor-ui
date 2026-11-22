export const docs = {
  name: 'ServiceTopologyMap',
  displayName: 'Service Topology Map',
  group: 'System, DevOps & Observability Widgets',
  category: 'observability-widgets',
  keywords: [
    'service',
    'topology',
    'map',
    'dependency',
    'architecture',
    'microservices',
    'observability',
    'devops',
    'latency',
    'telemetry',
    'health',
    'svg',
  ],
  usage: {
    description:
      'Optical-glass layered service dependency topology map built on a sculpted prism-slab shell with cluster health summary pills (Healthy, Degraded, Error), an Errors & Degraded Only highlight toggle, a responsive deterministic 540×280 architectural SVG inside a recessed prism-well arranging Gateway, Microservices, and Data/Async tiers left-to-right with curved directional arrows and live mid-edge latency + error-rate pills, keyboard-navigable upstream/downstream highlighting, and an aria-live="polite" telemetry inspector.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Assign nodes across tier 0 (Edge/Gateway), tier 1 (Microservices), and tier 2 (Databases, Caches, Queues) so traffic flows cleanly left-to-right with curved dependency arrows and non-overlapping mid-edge telemetry pills.',
      },
      {
        guidance: true,
        description:
          'Wire onSelectNode and onSelectEdge to open distributed traces, service logs, or incident runbooks directly when operators click or keyboard-focus an unhealthy service or high-error link.',
      },
      {
        guidance: false,
        description:
          'Hardcode status hex colors or rely on color alone for failure signals; ServiceTopologyMap derives all health accents from --prism-success-main, --prism-warning-main, and --prism-error-main paired with dashed degraded paths, thicker error strokes, and explicit textual status badges.',
      },
    ],
    accessibility: [
      {
        name: 'Keyboard-Navigable Service Nodes & Dependency Edges',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Every SVG service node and dependency edge exposes role="button", tabIndex={0}, aria-pressed, descriptive telemetry aria-labels, and IME-safe Enter, Space, ArrowLeft, ArrowRight, and Escape handling',
        description:
          'Keyboard users can traverse services and links directly with ArrowLeft/ArrowRight, inspect upstream/downstream blast radius with Enter/Space, toggle Errors & Degraded Only via aria-pressed, and clear selection with Escape.',
      },
      {
        name: 'Polite Live Telemetry Inspector & Empty Status Landmark',
        criterion: '1.4.1 Use of Color & 4.1.3 Status Messages',
        requirement:
          'Announces selected service kind, health, RPS, P95 latency, error rate %, and upstream/downstream counts (or edge telemetry) inside an aria-live="polite" recessed inspector, and renders an explicit role="status" empty state when nodes is empty',
        description:
          'Ensures assistive technologies receive structured telemetry updates without disrupting focus, while keeping degraded and error links legible across all Refractor light and dark optical themes.',
      },
    ],
  },
  props: [
    {
      name: 'nodes',
      type: 'ReadonlyArray<TopologyServiceNode>',
      defaultValue: '6-node cloud topology',
      description:
        'Service nodes ({ id, label, kind, tier, health, rps, p95Ms, errorRatePct }) laid out left-to-right by tier; omit for the built-in 6-node architecture or pass [] for a role="status" empty state.',
    },
    {
      name: 'edges',
      type: 'ReadonlyArray<TopologyServiceEdge>',
      defaultValue: '7 live telemetry edges',
      description:
        'Directed dependency links ({ id, source, target, latencyMs, errorRatePct, rps }) with automatic healthy/degraded/error highlighting and mid-edge pills; dangling or duplicate edges are safely filtered.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Service Dependency Topology'",
      description: 'Heading rendered in the sculpted prism-slab header and linked to the SVG graphic.',
    },
    {
      name: 'onSelectNode',
      type: '(node: TopologyServiceNode) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked when a service node is selected by pointer click or keyboard navigation.',
    },
    {
      name: 'onSelectEdge',
      type: '(edge: TopologyServiceEdge) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked when a dependency edge is selected by pointer click or keyboard navigation.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom properties and inline optical style overrides.',
    },
  ],
  examples: [
    `<ServiceTopologyMap\n  title="Production Checkout Mesh"\n  onSelectNode={(node) => console.warn('Node:', node.id)}\n  onSelectEdge={(edge) => console.warn('Edge:', edge.id)}\n/>`,
    `<ServiceTopologyMap\n  title="Auth Pipeline"\n  nodes={[\n    { id: 'gw', label: 'Edge Proxy', kind: 'gateway', tier: 0, health: 'healthy', rps: 1800, p95Ms: 12, errorRatePct: 0.1 },\n    { id: 'auth', label: 'Token Issuer', kind: 'service', tier: 1, health: 'degraded', rps: 1200, p95Ms: 118, errorRatePct: 1.4 },\n    { id: 'pg', label: 'Identity DB', kind: 'database', tier: 2, health: 'error', rps: 420, p95Ms: 260, errorRatePct: 3.8 },\n  ]}\n  edges={[\n    { id: 'e1', source: 'gw', target: 'auth', latencyMs: 18, errorRatePct: 0.1, rps: 1200 },\n    { id: 'e2', source: 'auth', target: 'pg', latencyMs: 240, errorRatePct: 3.4, rps: 420 },\n  ]}\n/>`,
  ],
};

export default docs;
