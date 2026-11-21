export const docs = {
  name: 'ComboDualAxisChart',
  displayName: 'Combo Dual-Axis Chart',
  group: 'Core & Trend Charts',
  category: 'core-trend-charts',
  keywords: [
    'combo',
    'dual-axis',
    'bar',
    'line',
    'volume',
    'rate',
    'correlation',
    'chart',
    'svg',
    'analytics',
  ],
  usage: {
    description:
      'Dual-axis optical-glass combination chart pairing translucent --prism-secondary-main volume bars on the left Y-axis with a glowing --prism-primary-main trend line and interactive markers on an independent right Y-axis, synchronized with a recessed prism-well correlation readout.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use clearly differentiated units (e.g. barUnit="k" for volume and lineUnit="%" for conversion or error rate) so readers distinguish the left and right Y-axis scales at a glance.',
      },
      {
        guidance: true,
        description:
          'Align barValues and lineValues index-for-index with labels; missing or non-finite values safely fall back to 0 without producing NaN coordinates.',
      },
      {
        guidance: false,
        description:
          'Plot two series with identical units on a dual-axis chart when a grouped BarColumnChart provides direct visual comparison.',
      },
    ],
    accessibility: [
      {
        name: 'Interactive Bars, Markers & Correlation Readout',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Keyboard-focusable bars and circular markers with IME-safe Enter/Space selection and polite live correlation readout',
        description:
          'Every bar and line marker exposes role="button", tabIndex={0}, descriptive aria-label, and keyboard-only prism-focus-ring outlines while keeping the recessed prism-well readout synced.',
      },
      {
        name: 'Dual-Axis Semantic Labeling',
        criterion: '1.1.1 Non-text Content',
        requirement: 'role="img" SVG with distinct left and right axis headings and tick readouts',
        description:
          'Pairs the SVG chart with explicit legend chips, axis labels, and a clean status message when labels is empty.',
      },
    ],
  },
  props: [
    {
      name: 'labels',
      type: 'string[]',
      defaultValue: 'required',
      description: 'Ordered X-axis labels aligned across bar and line series.',
    },
    {
      name: 'barLabel',
      type: 'string',
      defaultValue: 'required',
      description: 'Metric label for the left Y-axis bar series.',
    },
    {
      name: 'barValues',
      type: 'number[]',
      defaultValue: 'required',
      description: 'Numeric values for the bar series (negative or non-finite entries safely clamped to 0).',
    },
    {
      name: 'barUnit',
      type: 'string',
      defaultValue: "''",
      description: 'Optional unit suffix appended to left Y-axis ticks and bar correlation readout.',
    },
    {
      name: 'lineLabel',
      type: 'string',
      defaultValue: 'required',
      description: 'Metric label for the right Y-axis line series.',
    },
    {
      name: 'lineValues',
      type: 'number[]',
      defaultValue: 'required',
      description: 'Numeric values for the line series (finite positive or negative values supported; non-finite entries default to 0).',
    },
    {
      name: 'lineUnit',
      type: 'string',
      defaultValue: "'%'",
      description: 'Unit suffix appended to right Y-axis ticks and line correlation readout.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Volume vs. Rate'",
      description: 'Heading displayed in the chart card header.',
    },
    {
      name: 'height',
      type: 'number',
      defaultValue: '240',
      description: 'SVG chart height in pixels, safely clamped between 140 and 520.',
    },
    {
      name: 'onSelectIndex',
      type: '(index: number) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked with the selected X index when a bar or marker is clicked or activated via keyboard.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and style overrides.',
    },
  ],
  examples: [
    `<ComboDualAxisChart\n  title="API Requests vs. Conversion Rate"\n  labels={['Mon', 'Tue', 'Wed', 'Thu', 'Fri']}\n  barLabel="Requests"\n  barValues={[120, 185, 210, 165, 240]}\n  barUnit="k"\n  lineLabel="Conversion"\n  lineValues={[3.2, 4.1, 4.8, 3.9, 5.4]}\n  lineUnit="%"\n/>`,
  ],
};
