export const docs = {
  name: 'AreaStackedChart',
  displayName: 'Area Stacked Chart',
  group: 'Core & Trend Charts',
  category: 'core-trend-charts',
  keywords: [
    'area',
    'stacked',
    'overlay',
    'volume',
    'chart',
    'gradient',
    'cumulative',
    'timeseries',
    'svg',
    'analytics',
  ],
  usage: {
    description:
      'Optical-glass stacked and overlay area volume chart rendered with token-driven SVG linear gradients (--prism-* stopColor), crisp top-edge curves, live Stacked/Overlay mode switching, series legend visibility toggles, and interactive X-slice inspection readouts displaying cumulative totals and per-series contributions.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use stacked mode (default) when comparing part-to-whole cumulative throughput or resource volume over time, and toggle to overlay mode when comparing independent magnitudes against the zero baseline.',
      },
      {
        guidance: true,
        description:
          'Provide concise X-axis labels and a meaningful valueUnit (e.g. "GB", "req/s") so the recessed slice breakdown readout communicates exact quantities clearly.',
      },
      {
        guidance: false,
        description:
          'Rely on negative values for stacked areas; negative, NaN, and Infinity readings are sanitized to 0 to keep cumulative bands non-overlapping and visually coherent.',
      },
    ],
    accessibility: [
      {
        name: 'Mode Switcher, Legend Toggles & Keyboard Slice Inspection',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement: 'Stacked/Overlay buttons, series legend pills, and X-slice buttons expose aria-pressed with IME-safe ArrowLeft/ArrowRight navigation and aria-live="polite" breakdown readouts',
        description:
          'Users can switch stacking modes, toggle series, and step through every X-axis slice by keyboard or pointer while receiving live total and per-series announcements.',
      },
      {
        name: 'Token-Driven Luminous Contrast & Non-Color Structure',
        criterion: '1.4.1 Use of Color & 1.4.11 Non-text Contrast',
        requirement: 'Pairs semi-transparent --prism-* gradient fills with high-contrast top strokes, active cursor line, and textual breakdown chips',
        description:
          'Keeps stacked optical bands legible across light, dark, and custom Refractor themes without hardcoded color literals.',
      },
    ],
  },
  props: [
    {
      name: 'labels',
      type: 'string[]',
      defaultValue: 'required',
      description: 'Ordered X-axis category or timestamp labels.',
    },
    {
      name: 'series',
      type: 'AreaSeries[]',
      defaultValue: 'required',
      description: 'Multi-series area definitions ({ id, label, tone?, values }) sanitized to non-negative finite numbers.',
    },
    {
      name: 'stacked',
      type: 'boolean',
      defaultValue: 'true',
      description: 'Initial stacking mode: true for cumulative stacked bands, false for zero-baseline overlay areas.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Area Volume'",
      description: 'Heading displayed in the optical card header and linked to the SVG graphic.',
    },
    {
      name: 'height',
      type: 'number',
      defaultValue: '220',
      description: 'SVG height in pixels, safely clamped to [120, 520].',
    },
    {
      name: 'valueUnit',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Optional unit suffix appended to total and per-series readout values (e.g. "GB", "k").',
    },
    {
      name: 'onSelectIndex',
      type: '(index: number) => void',
      defaultValue: 'undefined',
      description: 'Callback fired whenever an X-axis slice button or chart region is selected.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<AreaStackedChart\n  title="Cluster Compute Volume"\n  labels={['00:00', '06:00', '12:00', '18:00', '24:00']}\n  valueUnit="vCPU"\n  series={[\n    { id: 'inference', label: 'Inference', tone: 'primary', values: [40, 62, 85, 74, 52] },\n    { id: 'training', label: 'Training', tone: 'secondary', values: [30, 34, 42, 48, 36] },\n    { id: 'ingest', label: 'Ingest', tone: 'emerald', values: [12, 18, 24, 21, 16] },\n  ]}\n/>`,
    `<AreaStackedChart\n  title="Regional Traffic Overlay"\n  stacked={false}\n  height={200}\n  labels={['Mon', 'Tue', 'Wed', 'Thu']}\n  valueUnit="req/s"\n  series={[\n    { id: 'na', label: 'North America', tone: 'amber', values: [220, 260, 245, 290] },\n    { id: 'apac', label: 'APAC', tone: 'rose', values: [140, 175, 195, 210] },\n  ]}\n/>`,
  ],
};
