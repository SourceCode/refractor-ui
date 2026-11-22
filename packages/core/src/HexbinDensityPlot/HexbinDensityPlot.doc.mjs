export const docs = {
  name: 'HexbinDensityPlot',
  displayName: 'Hexbin Density Plot',
  group: 'Scientific, Statistical & High-Dimensional Visuals',
  category: 'scientific-charts',
  keywords: [
    'hexbin',
    'hexagon',
    'honeycomb',
    'density',
    'spatial',
    'aggregation',
    'bivariate',
    'scatter',
    'histogram',
    'scientific',
    'statistics',
    'heatmap',
    'svg',
  ],
  usage: {
    description:
      'Optical-glass bivariate hexagonal binning density plot that aggregates dense 2D scatter datasets into a responsive staggered honeycomb SVG lattice (440×250) using axial cube-rounded nearest-hex assignment. Features a sculpted prism-slab header with total points & populated bin telemetry pill, a 5-step Low..Peak --prism-* intensity scale legend, interactive count-shaded hexagon cells with keyboard stepping (Enter/Space/ArrowLeft/ArrowRight), and a recessed aria-live="polite" cluster inspector.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use HexbinDensityPlot instead of raw scatter plots whenever overplotting obscures dense clusters; tune columns (5..16) to balance spatial resolution against per-bin sample counts.',
      },
      {
        guidance: true,
        description:
          'Provide descriptive unit-bearing xLabel and yLabel strings (such as "Request Size (KB)" and "Response Time (ms)") and pair onSelectHex with downstream trace or record drill-down views.',
      },
      {
        guidance: false,
        description:
          'Pre-filter NaN or Infinity coordinates manually or supply hardcoded hex colors; HexbinDensityPlot drops non-finite points safely, handles degenerate single-value domains, and derives all honeycomb shading from --prism-* CSS custom properties.',
      },
    ],
    accessibility: [
      {
        name: 'Keyboard-Navigable Populated Hexagons & Live Inspector',
        criterion: '2.1.1 Keyboard, 2.4.7 Focus Visible, 4.1.2 Name, Role, Value & 4.1.3 Status Messages',
        requirement:
          'Populated hexagon bins expose role="button", tabIndex={0}, aria-pressed, descriptive coordinate/count/share aria-labels, IME-safe Enter/Space/ArrowLeft/ArrowRight handling (!e.nativeEvent.isComposing), keyboard-only prism-focus-ring outlines, and an aria-live="polite" recessed inspector',
        description:
          'Keyboard and assistive-technology users can step sequentially across populated hexagons, hear exact bin coordinates, centroid values, point counts, and share percentages, and inspect dense hotspots without requiring a pointer.',
      },
      {
        name: 'Non-Color Density Encoding & Responsive Honeycomb Reflow',
        criterion: '1.1.1 Non-text Content, 1.4.1 Use of Color & 1.4.10 Reflow',
        requirement:
          'Pairs 5-step --prism-* intensity shading with numeric count labels inside multi-point bins, high-contrast selection rings, role="img" SVG summary, and responsive w-full h-auto viewBox scaling inside flex-wrap/min-w-0 containers',
        description:
          'Keeps density hotspots legible across color-vision profiles, light and dark Refractor themes, and narrow mobile viewports without horizontal overflow.',
      },
    ],
  },
  props: [
    {
      name: 'points',
      type: 'ReadonlyArray<HexbinPoint>',
      defaultValue: '64-point bi-cluster optical dataset (DEFAULT_HEXBIN_POINTS)',
      description:
        'Raw 2D numeric observations ({ x, y }) aggregated into staggered hexagonal bins; non-finite coordinates are safely skipped. Pass [] to render the role="status" empty state.',
    },
    {
      name: 'columns',
      type: 'number',
      defaultValue: '10',
      description:
        'Number of horizontal hexagon columns across the honeycomb grid, safely clamped to 5..16.',
    },
    {
      name: 'tone',
      type: "'primary' | 'secondary' | 'emerald' | 'info'",
      defaultValue: "'emerald'",
      description:
        'Semantic --prism-* optical tone ramp applied to populated hexagon fills, legend steps, and inspector share accent.',
    },
    {
      name: 'xLabel',
      type: 'string',
      defaultValue: "'Request Size (KB)'",
      description: 'Horizontal X-axis caption rendered cleanly as literal SVG text.',
    },
    {
      name: 'yLabel',
      type: 'string',
      defaultValue: "'Response Time (ms)'",
      description: 'Vertical Y-axis caption rendered cleanly as literal rotated SVG text.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Hexbin Spatial Aggregation'",
      description: 'Heading displayed in the sculpted prism-slab header and linked via aria-labelledby.',
    },
    {
      name: 'onSelectHex',
      type: '(bin: HexbinCluster) => void',
      defaultValue: 'undefined',
      description:
        'Callback fired with the selected HexbinCluster ({ id, col, row, centerX, centerY, count, sharePct }) when a populated bin is clicked or activated/stepped via keyboard.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom properties and inline optical style overrides.',
    },
  ],
  examples: [
    `<HexbinDensityPlot\n  title="API Request Size vs. Latency"\n  tone="emerald"\n  columns={10}\n  onSelectHex={(bin) => console.warn(bin.id, bin.count, bin.sharePct)}\n/>`,
    `<HexbinDensityPlot\n  title="Embedding Cluster Density"\n  tone="info"\n  columns={12}\n  xLabel="UMAP Dim 1"\n  yLabel="UMAP Dim 2"\n  points={[\n    { x: 1.2, y: 2.4 }, { x: 1.4, y: 2.6 }, { x: 1.3, y: 2.5 },\n    { x: 6.1, y: 7.2 }, { x: 6.3, y: 7.4 }, { x: 6.2, y: 7.1 },\n  ]}\n/>`,
  ],
};

export default docs;
