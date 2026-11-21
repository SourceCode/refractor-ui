export const docs = {
  name: 'RadarSpiderChart',
  displayName: 'Radar / Spider Chart',
  group: 'Statistical & Distribution Visuals',
  category: 'statistical-charts',
  keywords: [
    'radar',
    'spider',
    'web',
    'polygon',
    'multi-axis',
    'profile',
    'comparison',
    'statistical',
    'chart',
    'svg',
  ],
  usage: {
    description:
      'Optical-glass multi-axis radar / spider chart rendering 4 concentric radar web polygons (25%, 50%, 75%, 100%), radial spoke lines, interactive outer axis labels, and translucent overlaid series polygons with vertex dots, series visibility toggle pills, and a recessed prism-well axis comparison bar driven exclusively by semantic --prism-* tokens.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Plot 3 to 8 concise, comparable dimensions on a shared numeric scale (maxValue) and overlay 1 to 4 series so translucent polygons remain easy to distinguish.',
      },
      {
        guidance: true,
        description:
          'Assign distinct semantic RadarTone values (primary, secondary, emerald, amber, rose) or let the chart auto-cycle tones, and pair with onSelectAxis to synchronize detail views.',
      },
      {
        guidance: false,
        description:
          'Pass fewer than 3 axes or unscaled metrics with wildly different units; charts with < 3 axes or 0 series automatically render an accessible empty state, and non-finite or out-of-range values are sanitized to [0, maxValue].',
      },
    ],
    accessibility: [
      {
        name: 'Interactive Series Toggles & Axis Selection',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Legend toggle pills and outer SVG axis labels expose aria-pressed with IME-safe Enter/Space activation and keyboard-only prism-focus-ring outlines',
        description:
          'Activating any axis updates the polite aria-live prism-well comparison bar with exact numeric scores for every visible series, while hiding all series announces an explicit recovery prompt.',
      },
      {
        name: 'Accessible SVG Labeling & Non-Color Encoding',
        criterion: '1.1.1 Non-text Content & 1.4.1 Use of Color',
        requirement:
          'SVG declares role="img" while the comparison bar pairs semantic --prism-* swatches with exact numeric values and proportional bars',
        description:
          'Ensures multi-dimensional profiles remain readable across light, dark, and custom Refractor optical themes without relying on color alone.',
      },
    ],
  },
  props: [
    {
      name: 'axes',
      type: 'string[]',
      defaultValue: 'required',
      description: 'Ordered axis labels positioned around the radar web perimeter (requires >= 3 axes).',
    },
    {
      name: 'series',
      type: 'RadarSeries[]',
      defaultValue: 'required',
      description:
        'Array of { id, label, values, tone? } series polygons (requires >= 1 series); values are sanitized to [0, maxValue].',
    },
    {
      name: 'maxValue',
      type: 'number',
      defaultValue: '100',
      description: 'Positive finite upper bound used to scale all axes; non-finite or <= 0 values fall back to 100.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Multi-Axis Profile'",
      description: 'Heading displayed in the optical slab header and linked to the chart region and SVG.',
    },
    {
      name: 'size',
      type: 'number',
      defaultValue: '260',
      description: 'Square SVG viewport dimension in pixels, safely clamped between 180 and 400.',
    },
    {
      name: 'onSelectAxis',
      type: '(axisIndex: number, axisLabel: string) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked with the selected axis index and label on click or IME-safe Enter/Space.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<RadarSpiderChart\n  title="Model Benchmark Profile"\n  axes={['Accuracy', 'Latency', 'Throughput', 'Memory', 'Safety']}\n  series={[\n    { id: 'v2', label: 'Refractor v2', values: [92, 84, 88, 76, 95], tone: 'primary' },\n    { id: 'v1', label: 'Baseline v1', values: [78, 70, 74, 82, 81], tone: 'secondary' },\n  ]}\n/>`,
    `<RadarSpiderChart\n  title="Team Capability Matrix"\n  maxValue={10}\n  size={300}\n  axes={['Architecture', 'Testing', 'Security', 'A11y', 'Observability', 'UX']}\n  series={[\n    { id: 'core', label: 'Core Platform', values: [9, 8.5, 9.2, 8.8, 7.5, 8.2], tone: 'emerald' },\n    { id: 'target', label: 'Q4 Target', values: [9.5, 9, 9.5, 9.5, 9, 9], tone: 'amber' },\n  ]}\n/>`,
  ],
};
