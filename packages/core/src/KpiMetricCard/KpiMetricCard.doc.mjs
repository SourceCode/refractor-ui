export const docs = {
  name: 'KpiMetricCard',
  displayName: 'KPI Metric Card',
  group: 'Advanced Data & Visualization',
  category: 'advanced-data',
  keywords: ['kpi', 'metric', 'card', 'sparkline', 'delta', 'telemetry', 'analytics', 'dashboard'],
  usage: {
    description:
      'Compact optical glass dashboard KPI slab featuring a top specular refraction accent, tabular headline metric, semantic delta trend pill with optional inverse semantics, and an interactive token-driven SVG sparkline.',
    bestPractices: [
      {
        guidance: true,
        description: 'Set invertDeltaSemantics={true} for metrics where decreases are desirable, such as P99 latency or error rate.',
      },
      {
        guidance: true,
        description: 'Pass labeled KpiSparklinePoint entries when timestamps or period labels improve hover and keyboard inspection.',
      },
      {
        guidance: false,
        description: 'Hardcode hex colors in sparkline strokes; KpiMetricCard derives all SVG strokes and gradients from --prism-* CSS variables.',
      },
    ],
    accessibility: [
      {
        name: 'Interactive sparkline point inspection',
        criterion: '2.1.1 Keyboard',
        requirement: 'Focusable sparkline points with ArrowLeft/ArrowRight/Home/End navigation and polite live readout',
        description: 'Each sparkline point exposes a descriptive aria-label and supports pointer hover and keyboard focus to update the aria-live="polite" readout.',
      },
    ],
  },
  props: [
    { name: 'label', type: 'string', defaultValue: 'required', description: 'Kicker metric label rendered at the top of the slab.' },
    { name: 'value', type: 'string | number', defaultValue: 'required', description: 'Primary tabular headline value.' },
    { name: 'unit', type: 'string', defaultValue: 'undefined', description: 'Optional trailing unit suffix such as "ms" or "%".' },
    { name: 'prefix', type: 'string', defaultValue: 'undefined', description: 'Optional leading symbol such as "$".' },
    { name: 'deltaPercent', type: 'number', defaultValue: 'undefined', description: 'Signed percentage change displayed inside the directional delta badge.' },
    { name: 'deltaLabel', type: 'string', defaultValue: 'undefined', description: 'Comparison window label (e.g. "vs last 30d").' },
    { name: 'invertDeltaSemantics', type: 'boolean', defaultValue: 'false', description: 'Treats negative deltas as positive tone and positive deltas as negative tone.' },
    { name: 'sparkline', type: 'ReadonlyArray<number | KpiSparklinePoint>', defaultValue: 'required', description: 'Series rendered in the interactive optical SVG sparkline.' },
    { name: 'icon', type: 'ReactNode', defaultValue: 'undefined', description: 'Optional icon rendered inside a top-right crystal bezel.' },
    { name: 'footer', type: 'ReactNode', defaultValue: 'undefined', description: 'Optional footer content below a translucent divider.' },
  ],
  examples: [
    `<KpiMetricCard\n  label="P99 API Latency"\n  value={42}\n  unit="ms"\n  deltaPercent={-14.5}\n  deltaLabel="vs last 7d"\n  invertDeltaSemantics\n  sparkline={[58, 55, 51, 49, 46, 44, 42]}\n/>`,
  ],
};
