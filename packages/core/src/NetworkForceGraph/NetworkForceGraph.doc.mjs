export const docs = {
  name: 'NetworkForceGraph',
  displayName: 'Network Force Graph',
  group: 'Relational & Flow Visuals',
  category: 'relational-flow-charts',
  keywords: [
    'network',
    'force',
    'graph',
    'topology',
    'relational',
    'cluster',
    'nodes',
    'edges',
    'neighbors',
    'svg',
  ],
  usage: {
    description:
      'Optical-glass deterministic force-directed network topology diagram featuring seeded circular initialization, 40 bounded Coulomb-repulsion / Hooke-spring / center-gravity relaxation iterations inside a 600×H viewport, cluster group filter pills, zoom controls (0.75x..2x), interactive direct-neighbor & incident-edge highlighting, and a recessed prism-well node inspector powered exclusively by --prism-* tokens.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Assign meaningful group names and semantic NetworkNodeTone values to separate service clusters, enabling interactive header filter pills and clear neighborhood inspection.',
      },
      {
        guidance: true,
        description:
          'Provide positive finite node and edge weights when relative importance or traffic volume should scale node radii and link stroke widths; otherwise node degree automatically scales circle sizes.',
      },
      {
        guidance: false,
        description:
          'Depend on non-deterministic layouts or raw hex colors; NetworkForceGraph computes a 100% deterministic relaxation from node IDs without Math.random() and reads every color from --prism-* CSS custom properties.',
      },
    ],
    accessibility: [
      {
        name: 'Keyboard Node Inspection & Cluster Filtering',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Cluster filter pills expose aria-pressed, zoom controls enforce disabled boundaries, and every SVG node exposes role="button", tabIndex={0}, IME-safe Enter/Space selection, Escape clearing, and descriptive degree/group aria-labels',
        description:
          'Keyboard and screen-reader users can toggle clusters, zoom or reset the canvas, inspect any node, navigate directly to connected neighbors, and hear updates through the aria-live="polite" inspector.',
      },
      {
        name: 'Non-Color Neighborhood Emphasis',
        criterion: '1.4.1 Use of Color',
        requirement:
          'Combines --prism-* stroke/fill tokens with outer active rings, increased edge stroke widths, non-neighbor opacity dimming, bold active labels, and a textual neighbor list in the recessed inspector',
        description:
          'Ensures selected nodes, incident edges, and connected neighbors remain clearly distinguishable across color-vision profiles and light/dark Refractor optical themes.',
      },
    ],
  },
  props: [
    {
      name: 'nodes',
      type: 'NetworkNode[]',
      defaultValue: 'required',
      description:
        'Topology nodes ({ id, label, group?, weight?, tone? }) positioned via deterministic force-directed relaxation; blank and duplicate IDs are safely filtered.',
    },
    {
      name: 'edges',
      type: 'NetworkEdge[]',
      defaultValue: 'required',
      description:
        'Topology links ({ id, source, target, label?, weight? }) connecting visible nodes; self-loops, duplicates, and dangling edges are automatically filtered.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Topology Network Graph'",
      description: 'Card heading displayed in the header and linked to the SVG graphic.',
    },
    {
      name: 'height',
      type: 'number',
      defaultValue: '280',
      description: 'SVG viewport height in pixels, safely clamped to [180, 520].',
    },
    {
      name: 'onSelectNode',
      type: '(node: NetworkNode, degree: number) => void',
      defaultValue: 'undefined',
      description:
        'Callback fired when a node is clicked, activated via Enter/Space, or jumped to from the inspector neighbor list.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<NetworkForceGraph\n  title="Service Mesh Topology"\n  height={300}\n  nodes={[\n    { id: 'gw', label: 'API Gateway', group: 'Edge', weight: 10, tone: 'primary' },\n    { id: 'auth', label: 'Auth Core', group: 'Core', weight: 7, tone: 'emerald' },\n    { id: 'ml', label: 'Inference Pool', group: 'Compute', weight: 8, tone: 'secondary' },\n    { id: 'db', label: 'Primary Store', group: 'Data', weight: 6, tone: 'amber' },\n  ]}\n  edges={[\n    { id: 'e1', source: 'gw', target: 'auth', label: 'gRPC', weight: 3 },\n    { id: 'e2', source: 'gw', target: 'ml', label: 'HTTP/3', weight: 4 },\n    { id: 'e3', source: 'auth', target: 'db', label: 'TLS', weight: 2 },\n  ]}\n/>`,
  ],
};
