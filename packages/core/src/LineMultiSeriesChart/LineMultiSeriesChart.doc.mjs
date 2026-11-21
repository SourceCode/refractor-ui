export const docs = {
  name: 'LineMultiSeriesChart',
  displayName: 'Line Multi-Series Chart',
  group: 'Core & Trend Charts',
  category: 'core-trend-charts',
  keywords: [
    'line',
    'chart',
    'multi-series',
    'trend',
    'telemetry',
    'bezier',
    'polyline',
    'timeseries',
    'svg',
    'analytics',
  ],
  usage: {
    description:
      'Optical-glass multi-series trend line chart featuring smooth monotone cubic-bezier or crisp polyline rendering, dashed benchmark support, interactive series visibility pills, keyboard-focusable data point markers, sanitized finite Y-domain scaling, and a recessed live readout bar powered exclusively by --prism-* tokens.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Assign stable unique series IDs and semantic tones (primary, secondary, emerald, amber, rose) so legend toggles and point selection callbacks remain predictable.',
      },
      {
        guidance: true,
        description:
          'Use dashed: true on secondary baseline or SLA target series to differentiate projections from observed metrics without relying on color alone.',
      },
      {
        guidance: false,
        description:
          'Pass unguarded NaN or Infinity telemetry directly into custom math; LineMultiSeriesChart sanitizes non-finite points to 0 and guards zero-span domains automatically.',
      },
    ],
    accessibility: [
      {
        name: 'Interactive Series Legend & Keyboard Point Inspection',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement: 'Legend buttons expose aria-pressed and SVG point circles expose role="button", tabIndex={0}, IME-safe Enter/Space activation, and descriptive aria-labels',
        description:
          'Keyboard and assistive-technology users can toggle individual series visibility, traverse plotted data points, and hear live readout updates via aria-live="polite".',
      },
      {
        name: 'Non-Color Visual Differentiation',
        criterion: '1.4.1 Use of Color',
        requirement: 'Supports dashed line patterns, recessed active point readouts, and explicit aria-pressed state pills',
        description:
          'Ensures hidden series, active selections, and dashed target trajectories remain distinguishable across color-vision profiles and optical themes.',
      },
    ],
  },
  props: [
    {
      name: 'labels',
      type: 'string[]',
      defaultValue: 'required',
      description: 'Ordered X-axis category or timestamp labels aligned to each series values array.',
    },
    {
      name: 'series',
      type: 'LineSeries[]',
      defaultValue: 'required',
      description: 'Multi-series definitions ({ id, label, tone?, values, dashed? }) plotted on the shared Y axis.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Trend Series'",
      description: 'Heading displayed in the optical card header and linked to the SVG graphic.',
    },
    {
      name: 'smooth',
      type: 'boolean',
      defaultValue: 'true',
      description: 'Renders smooth monotone cubic-bezier SVG paths when true, or linear polylines when false.',
    },
    {
      name: 'showPoints',
      type: 'boolean',
      defaultValue: 'true',
      description: 'Displays interactive focusable data point circles along each visible line.',
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
      description: 'Optional unit suffix appended to point readouts and accessible labels (e.g. "ms", "req/s").',
    },
    {
      name: 'onSelectPoint',
      type: '(seriesId: string, index: number, value: number) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked when a plotted point is clicked or activated with Enter/Space.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<LineMultiSeriesChart\n  title="API Latency Percentiles"\n  labels={['Mon', 'Tue', 'Wed', 'Thu', 'Fri']}\n  valueUnit="ms"\n  series={[\n    { id: 'p50', label: 'P50 Median', tone: 'emerald', values: [42, 39, 44, 38, 36] },\n    { id: 'p95', label: 'P95 Tail', tone: 'primary', values: [118, 126, 110, 104, 98] },\n    { id: 'sla', label: 'SLA Target', tone: 'amber', dashed: true, values: [120, 120, 120, 120, 120] },\n  ]}\n/>`,
    `<LineMultiSeriesChart\n  title="Throughput Comparison"\n  smooth={false}\n  showPoints={false}\n  height={180}\n  labels={['Q1', 'Q2', 'Q3', 'Q4']}\n  valueUnit="k"\n  series={[\n    { id: 'east', label: 'US-East', tone: 'secondary', values: [14, 18, 22, 27] },\n    { id: 'eu', label: 'EU-West', tone: 'rose', values: [10, 13, 15, 19] },\n  ]}\n/>`,
  ],
};
