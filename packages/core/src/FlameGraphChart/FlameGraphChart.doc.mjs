export const docs = {
  name: 'FlameGraphChart',
  displayName: 'Flame Graph Chart',
  group: 'System, DevOps & Observability Widgets',
  category: 'observability-widgets',
  keywords: [
    'flamegraph',
    'flame',
    'icicle',
    'profiler',
    'cpu',
    'stack',
    'trace',
    'observability',
    'performance',
    'v8',
    'node',
    'devops',
  ],
  usage: {
    description:
      'Optical-glass CPU stack profiler visualization supporting Flame (root at bottom growing upward) and Icicle (root at top growing downward) orientations, subtree click-to-zoom with clickable breadcrumbs and Reset Zoom, literal case-insensitive stack search highlighting with non-overlapping match share percentage, depth-capped cycle-safe tree sanitization (MAX_DEPTH = 12), and a recessed aria-live="polite" profiler readout powered exclusively by --prism-* tokens.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Provide realistic module names (e.g. "node:http", "db/planner.ts", "v8:gc") alongside frame names so engineers can filter entire subsystems in the search bar and inspect accurate merged CPU match share.',
      },
      {
        guidance: true,
        description:
          'Use Flame orientation for bottom-up hot-path stack inspection and switch to Icicle orientation when comparing top-down request fan-out from an entry point.',
      },
      {
        guidance: false,
        description:
          'Pass cyclic graphs or unbounded call trees deeper than 12 levels expecting infinite expansion; traversal safely drops back-edges and caps recursion at MAX_DEPTH = 12.',
      },
    ],
    accessibility: [
      {
        name: 'Keyboard-Navigable Stack Frames, Orientation Toggle & Escape Reset',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Every stack frame declares role="button", tabIndex={0}, aria-pressed, and descriptive aria-label with IME-safe Enter/Space zoom activation and Escape zoom reset; Flame/Icicle buttons expose aria-pressed and search input declares aria-label="Filter stack frames"',
        description:
          'Enables complete keyboard-only profiling workflows without mouse dependency while honoring IME composition events and keyboard-only prism-focus-ring outlines.',
      },
      {
        name: 'Polite Live Profiler Readout & Semantic Status Empty State',
        criterion: '4.1.3 Status Messages & 1.4.1 Use of Color',
        requirement:
          'Updates a recessed prism-well aria-live="polite" readout with Frame, Module, Total CPU, Self CPU, % of Root, and Search Match %, and emits role="status" when the profile root is null or non-positive',
        description:
          'Ensures all CPU metrics and search match percentages are surfaced textually across light, dark, and custom Refractor themes without relying solely on color.',
      },
    ],
  },
  props: [
    {
      name: 'root',
      type: 'FlameFrameNode | null',
      defaultValue: 'Built-in Node/V8 server CPU profile tree',
      description:
        'Hierarchical CPU stack tree ({ id, name, module?, value, tone?, children? }); pass null or a non-positive root value to render an accessible status empty state.',
    },
    {
      name: 'orientation',
      type: "'flame' | 'icicle'",
      defaultValue: 'undefined',
      description:
        'Controlled orientation mode: "flame" anchors root at the bottom growing upward; "icicle" anchors root at the top growing downward.',
    },
    {
      name: 'defaultOrientation',
      type: "'flame' | 'icicle'",
      defaultValue: "'flame'",
      description: 'Initial orientation when running in uncontrolled mode.',
    },
    {
      name: 'onOrientationChange',
      type: '(orientation: FlameGraphOrientation) => void',
      defaultValue: 'undefined',
      description: 'Callback fired whenever the Flame / Icicle toggle switches orientation.',
    },
    {
      name: 'unit',
      type: 'string',
      defaultValue: "'ms'",
      description: 'Measurement unit suffix appended to Total CPU and Self CPU readouts.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'CPU Flame / Icicle Graph'",
      description: 'Heading rendered in the optical slab header and linked to the chart region.',
    },
    {
      name: 'onSelectFrame',
      type: '(metrics: FlameFrameMetrics) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked with computed { id, name, module, totalValue, selfValue, rootSharePct, depth } whenever a stack frame is clicked or keyboard-activated.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<FlameGraphChart title="Node API Server CPU Profile" unit="ms" />`,
    `<FlameGraphChart\n  title="Worker Span Icicle"\n  defaultOrientation="icicle"\n  unit="ms"\n  root={{\n    id: 'root',\n    name: 'handleJob',\n    module: 'worker/index.ts',\n    value: 400,\n    tone: 'info',\n    children: [\n      { id: 'decode', name: 'decodePayload', module: 'codec/json.ts', value: 140, tone: 'amber' },\n      { id: 'infer', name: 'runInference', module: 'ml/runtime.ts', value: 230, tone: 'rose' },\n    ],\n  }}\n/>`,
  ],
};

export default docs;
