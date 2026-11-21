export const docs = {
  name: 'ScatterBubblePlot',
  displayName: 'Scatter & Bubble Plot',
  group: 'Statistical & Distribution Visuals',
  category: 'statistical-charts',
  keywords: [
    'scatter',
    'bubble',
    'plot',
    'correlation',
    'quadrant',
    'cluster',
    'statistical',
    'distribution',
    'multivariate',
    'svg',
  ],
  usage: {
    description:
      'Optical-glass 2D scatter and proportional bubble plot with finite-coordinate sanitization, proportional radius scaling ([6..20]), interactive group filter pills, optional dashed midpoint quadrant guides, keyboard-focusable bubbles with active selection rings, and a recessed live readout bar powered exclusively by --prism-* tokens.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Provide clear xLabel, yLabel, and sizeLabel props whenever plotting a third bubble magnitude dimension so the recessed live readout and accessible bubble labels remain self-explanatory.',
      },
      {
        guidance: true,
        description:
          'Use group values to organize clusters into toggleable header filter pills and enable showQuadrants when highlighting high/low performance quadrants around domain midpoints.',
      },
      {
        guidance: false,
        description:
          'Pre-clamp radii manually or rely on raw hex colors; ScatterBubblePlot automatically filters non-finite coordinates, maps positive sizes cleanly into 6..20px circles, and reads all fills from --prism-* semantic tokens.',
      },
    ],
    accessibility: [
      {
        name: 'Group Filter Pills & Keyboard Bubble Inspection',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Group filter buttons expose aria-pressed and every SVG bubble exposes role="button", tabIndex={0}, IME-safe Enter/Space activation, and descriptive coordinate aria-labels',
        description:
          'Keyboard and screen-reader users can filter clusters, traverse bubbles in the scatter plane, and hear live coordinate/size announcements via aria-live="polite".',
      },
      {
        name: 'Non-Color Selection & Cluster Indicators',
        criterion: '1.4.1 Use of Color',
        requirement:
          'Combines translucent --prism-* bubble fills with outer selection rings, explicit group pills, dashed quadrant dividers, and textual readout summaries',
        description:
          'Keeps active bubbles and hidden groups distinguishable across color-vision profiles and light/dark Refractor optical themes.',
      },
    ],
  },
  props: [
    {
      name: 'points',
      type: 'ScatterPoint[]',
      defaultValue: 'required',
      description:
        'Coordinate observations ({ id, label, x, y, size?, group?, tone? }) with non-finite x/y points safely filtered out.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Scatter & Bubble Plot'",
      description: 'Card heading rendered in the header and linked to the SVG graphic.',
    },
    {
      name: 'xLabel',
      type: 'string',
      defaultValue: "'X Axis'",
      description: 'Horizontal axis label displayed beneath the plot and in the live readout.',
    },
    {
      name: 'yLabel',
      type: 'string',
      defaultValue: "'Y Axis'",
      description: 'Vertical axis label rotated along the left edge and included in the live readout.',
    },
    {
      name: 'sizeLabel',
      type: 'string',
      defaultValue: 'undefined',
      description:
        'Optional label for the bubble size metric shown in readouts and aria-labels when a point has a positive size.',
    },
    {
      name: 'height',
      type: 'number',
      defaultValue: '260',
      description: 'SVG height in pixels, safely clamped to [160, 520].',
    },
    {
      name: 'showQuadrants',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Renders dashed horizontal and vertical midpoint quadrant lines across the plot.',
    },
    {
      name: 'onSelectPoint',
      type: '(point: ScatterPoint) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked when a bubble is clicked or activated with Enter/Space.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<ScatterBubblePlot\n  title="Latency vs. Throughput"\n  xLabel="Throughput (req/s)"\n  yLabel="P95 Latency (ms)"\n  sizeLabel="Error Budget"\n  showQuadrants\n  points={[\n    { id: 'svc-a', label: 'Auth Edge', x: 420, y: 38, size: 120, group: 'Core', tone: 'emerald' },\n    { id: 'svc-b', label: 'Search Ranker', x: 260, y: 112, size: 340, group: 'ML', tone: 'primary' },\n    { id: 'svc-c', label: 'Billing Sync', x: 180, y: 74, size: 80, group: 'Core', tone: 'secondary' },\n  ]}\n/>`,
    `<ScatterBubblePlot\n  title="Model Accuracy vs. Cost"\n  xLabel="Cost ($/1M tokens)"\n  yLabel="Eval Score (%)"\n  height={220}\n  points={[\n    { id: 'm1', label: 'Prism-Small', x: 0.4, y: 81.2 },\n    { id: 'm2', label: 'Prism-Pro', x: 2.1, y: 92.8 },\n    { id: 'm3', label: 'Prism-Ultra', x: 6.5, y: 95.4 },\n  ]}\n/>`,
  ],
};
