export const docs = {
  name: 'ParallelCoordinatesPlot',
  displayName: 'Parallel Coordinates Plot',
  group: 'Scientific, Statistical & High-Dimensional Visuals',
  category: 'scientific-charts',
  keywords: [
    'parallel-coordinates',
    'multivariate',
    'high-dimensional',
    'ml-benchmark',
    'scientific',
    'statistical',
    'axes',
    'trajectories',
    'polyline',
    'comparison',
    'svg',
  ],
  usage: {
    description:
      'Optical-glass high-dimensional parallel coordinates plot inside a sculpted prism-slab container with record/axis count badges, interactive group filter pills (All + unique groups), a responsive 480×230 multi-axis SVG inside a recessed prism-well featuring normalized vertical axis rails with top/midpoint/bottom ticks, interactive polylines shaded strictly via --prism-* tokens with active elevation (strokeWidth=3) and vertex dots, and a recessed aria-live="polite" dimension badge inspector.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Align each ParallelRecord.values array strictly by positional index to the axes array to guarantee prototype-safe multivariate rendering and clear cross-dimension comparisons.',
      },
      {
        guidance: true,
        description:
          'Assign concise axis labels, explicit units (such as "%", "ms", "GB", "$/1M"), and record group names to activate interactive group filter pills and self-explanatory inspector badges.',
      },
      {
        guidance: false,
        description:
          'Pass raw hex/rgb color values or pre-normalize metrics manually; ParallelCoordinatesPlot infers or respects explicit per-axis min/max bounds, handles constant/inverted domains safely, and maps every trajectory tone strictly to --prism-* semantic tokens.',
      },
    ],
    accessibility: [
      {
        name: 'Focusable Trajectory Paths & Keyboard Traversal',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Every trajectory exposes role="button", tabIndex={0}, aria-pressed, and a complete dimension summary aria-label with IME-safe Enter/Space selection, ArrowUp/ArrowDown trajectory stepping, Escape clear, and keyboard-only prism-focus-ring outlines',
        description:
          'Keyboard and screen-reader users can step smoothly across visible model trajectories, elevating the active polyline with vertex dots while dimming sibling paths cleanly.',
      },
      {
        name: 'Interactive Group Filtering & Live Dimension Inspector',
        criterion: '1.4.1 Use of Color & 4.1.3 Status Messages',
        requirement:
          'Group filter pills expose aria-pressed alongside an aria-live="polite" recessed prism-well inspector rendering the active Record Name and exact Axis: Value Unit badges across every dimension',
        description:
          'Communicates high-dimensional telemetry quantitatively without relying solely on polyline color or visual height estimation, and falls back gracefully to a role="status" empty notice when fewer than 2 axes or 0 valid records are supplied.',
      },
    ],
  },
  props: [
    {
      name: 'axes',
      type: 'ReadonlyArray<ParallelAxisSpec>',
      defaultValue:
        '5 default ML benchmark axes (Accuracy %, Latency ms, VRAM GB, Throughput, Cost $/1M)',
      description:
        'Vertical dimension axis specs ({ id, label, unit?, min?, max? }). Requires at least 2 axes; passing fewer renders a clean role="status" empty state.',
    },
    {
      name: 'records',
      type: 'ReadonlyArray<ParallelRecord>',
      defaultValue: '7 default ML benchmark models across Frontier, Balanced, and Edge groups',
      description:
        'Multivariate records ({ id, label, group?, tone?, values }) whose values align by index to axes. Passing [] or non-finite-only records renders a role="status" empty state.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Parallel Coordinates Analysis'",
      description:
        'Heading rendered in the sculpted prism-slab header and linked via aria-labelledby.',
    },
    {
      name: 'onSelectRecord',
      type: '(record: ParallelRecord) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked with the original ParallelRecord when a trajectory is clicked, activated with Enter/Space, or stepped onto via ArrowUp/ArrowDown.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<ParallelCoordinatesPlot\n  title="LLM Benchmark Trade-offs"\n  onSelectRecord={(record) => {\n    void record;\n  }}\n/>`,
    `<ParallelCoordinatesPlot\n  title="Material Stress Profiles"\n  axes={[\n    { id: 'tensile', label: 'Tensile', unit: 'MPa', min: 100, max: 900 },\n    { id: 'density', label: 'Density', unit: 'g/cm³', min: 1, max: 9 },\n    { id: 'thermal', label: 'Thermal', unit: 'W/mK', min: 10, max: 400 },\n  ]}\n  records={[\n    { id: 'ti-6al', label: 'Ti-6Al-4V', group: 'Alloy', tone: 'primary', values: [880, 4.43, 18] },\n    { id: 'al-7075', label: 'Al-7075', group: 'Alloy', tone: 'secondary', values: [572, 2.81, 130] },\n    { id: 'cf-epoxy', label: 'Carbon Fiber', group: 'Composite', tone: 'emerald', values: [600, 1.6, 24] },\n  ]}\n/>`,
  ],
};

export default docs;
