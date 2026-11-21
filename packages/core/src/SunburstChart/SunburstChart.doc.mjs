export const docs = {
  name: 'SunburstChart',
  displayName: 'Sunburst Chart',
  group: 'Part-to-Whole & Hierarchical Visuals',
  category: 'part-to-whole-charts',
  keywords: [
    'sunburst',
    'hierarchy',
    'part-to-whole',
    'radial',
    'zoomable',
    'rings',
    'tree',
    'chart',
    'svg',
    'analytics',
  ],
  usage: {
    description:
      'Zoomable optical-glass hierarchical sunburst chart rendering up to 3 concentric descendant SVG arc rings from the active focus node, with bounded recursion (max depth 6), full-360° single-child ring geometry, interactive breadcrumb pills, center zoom-out disc, and --prism-* semantic token coloring with progressively lighter ring opacity.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Assign distinct SunburstNode ids within each branch and place positive numeric values on leaf nodes so branch totals aggregate predictably across zoom levels.',
      },
      {
        guidance: true,
        description:
          'Use semantic SunburstTone tokens (primary, secondary, emerald, amber, rose) on top-level branches so descendant rings automatically inherit cohesive optical families across themes.',
      },
      {
        guidance: false,
        description:
          'Depend on cyclic object graphs or hierarchies deeper than 6 levels; traversal is safely capped at depth 6 and cyclic back-edges are ignored to prevent stack overflows.',
      },
    ],
    accessibility: [
      {
        name: 'Keyboard-Navigable Arcs, Center Disc & Breadcrumbs',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Every SVG arc exposes role="button", tabIndex={0}, descriptive aria-label, and IME-safe Enter/Space zoom activation alongside breadcrumb buttons and a Reset Zoom control',
        description:
          'Keyboard and screen-reader users can drill into any visible ring arc, inspect values via the polite live readout, and return up the hierarchy through the center disc, breadcrumb pills, or Reset Zoom button.',
      },
      {
        name: 'Accessible SVG Labeling & Empty State Status',
        criterion: '1.1.1 Non-text Content',
        requirement: 'SVG sunburst declares role="img" reflecting active focus context and renders a polite status block when total hierarchy value is zero',
        description:
          'Maintains clear structural semantics without hardcoded color literals so contrast adapts cleanly to light, dark, and custom Refractor themes.',
      },
    ],
  },
  props: [
    {
      name: 'root',
      type: 'SunburstNode',
      defaultValue: 'required',
      description: 'Root node ({ id, label, value?, tone?, children? }) of the hierarchical sunburst dataset.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Hierarchical Sunburst'",
      description: 'Heading displayed in the optical card header and linked to the chart region.',
    },
    {
      name: 'size',
      type: 'number',
      defaultValue: '260',
      description: 'Square SVG viewport dimension in pixels, safely clamped to [180, 400].',
    },
    {
      name: 'valueUnit',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Optional unit suffix appended to values in the center disc, arc labels, and live readout.',
    },
    {
      name: 'onZoomNode',
      type: '(node: SunburstNode, breadcrumb: SunburstNode[]) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked with the newly focused node and active breadcrumb trail whenever zoom changes.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<SunburstChart\n  title="Cloud Storage Footprint"\n  valueUnit="GB"\n  root={{\n    id: 'root',\n    label: 'Cluster',\n    children: [\n      {\n        id: 'models',\n        label: 'Models',\n        tone: 'primary',\n        children: [\n          { id: 'llm', label: 'LLM Weights', value: 180 },\n          { id: 'vision', label: 'Vision', value: 95 },\n        ],\n      },\n      {\n        id: 'datasets',\n        label: 'Datasets',\n        tone: 'emerald',\n        children: [\n          { id: 'train', label: 'Training', value: 140 },\n          { id: 'eval', label: 'Eval', value: 60 },\n        ],\n      },\n    ],\n  }}\n/>`,
  ],
};
