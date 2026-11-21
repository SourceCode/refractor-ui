export const docs = {
  name: 'TreemapChart',
  displayName: 'Treemap Chart',
  group: 'Part-to-Whole & Hierarchical Visuals',
  category: 'part-to-whole-charts',
  keywords: [
    'treemap',
    'hierarchy',
    'hierarchical',
    'partition',
    'area',
    'portfolio',
    'disk',
    'heatmap',
    'part-to-whole',
    'svg',
    'analytics',
  ],
  usage: {
    description:
      'Optical-glass hierarchical treemap chart that sanitizes positive finite tile values, recursively partitions a 600×H SVG viewport via balanced aspect-ratio binary splits, tints tiles semantically by changePct (--prism-success-main, --prism-error-main, or alternating --prism-primary-main/--prism-secondary-main), and exposes keyboard-accessible SVG tiles paired with a recessed prism-well inspector strip.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Provide concise tile labels and optional parent group names so nested portfolio, storage, or cost breakdowns remain legible inside adaptive clipped tile labels and the inspector strip.',
      },
      {
        guidance: true,
        description:
          'Supply changePct when tracking period-over-period growth or contraction so tiles automatically tint with --prism-success-main or --prism-error-main across all Refractor themes.',
      },
      {
        guidance: false,
        description:
          'Include zero, negative, or NaN values expecting visible rectangles; non-positive and non-finite tiles are safely excluded, and empty datasets render an accessible status notice.',
      },
    ],
    accessibility: [
      {
        name: 'Keyboard-Focusable SVG Tiles & Live Inspector Strip',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Each SVG tile <g> declares role="button", tabIndex={0}, aria-pressed, and complete aria-label with IME-safe Enter/Space selection updating an aria-live="polite" prism-well inspector strip',
        description:
          'Allows full keyboard traversal across hierarchical tiles with keyboard-only prism-focus-ring outlines while surfacing exact label, group, value, percentage of total, and formatted delta even for compact tiles.',
      },
      {
        name: 'Non-Color Semantic Delta Signaling',
        criterion: '1.4.1 Use of Color & 1.1.1 Non-text Content',
        requirement:
          'Pairs semantic --prism-* fills and borders with explicit +/- signed percentage formatting and an accessible role="img" SVG container',
        description:
          'Guarantees growth, decline, and neutral holdings stay distinguishable across light, dark, and color-vision-adapted themes.',
      },
    ],
  },
  props: [
    {
      name: 'tiles',
      type: 'TreemapTile[]',
      defaultValue: 'required',
      description:
        'Array of { id, label, group?, value, changePct? } tiles; only finite values > 0 are partitioned and displayed.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Hierarchical Treemap'",
      description: 'Heading displayed in the optical card header and linked to the SVG graphic.',
    },
    {
      name: 'height',
      type: 'number',
      defaultValue: '240',
      description: 'SVG viewport height in pixels, safely clamped between 160 and 480.',
    },
    {
      name: 'valueUnit',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Optional unit suffix appended to tile values and total readouts (e.g. "GB", "k").',
    },
    {
      name: 'onSelectTile',
      type: '(tile: TreemapTile) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked with the selected TreemapTile on click or IME-safe Enter/Space.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<TreemapChart\n  title="Cluster Storage Allocation"\n  valueUnit="TB"\n  tiles={[\n    { id: 'warehouse', label: 'Warehouse', group: 'Analytics', value: 42, changePct: 12.4 },\n    { id: 'logs', label: 'Telemetry Logs', group: 'Observability', value: 28, changePct: -4.8 },\n    { id: 'models', label: 'Model Weights', group: 'AI', value: 18, changePct: 0 },\n    { id: 'backups', label: 'Snapshots', group: 'Infra', value: 12 },\n  ]}\n/>`,
  ],
};
