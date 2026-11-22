export const docs = {
  name: 'AnomalyForecastChart',
  displayName: 'Anomaly Forecast Chart',
  group: 'System, DevOps & Observability Widgets',
  category: 'observability-widgets',
  keywords: [
    'anomaly',
    'forecast',
    'observability',
    'telemetry',
    'time-series',
    'confidence-band',
    'corridor',
    'breach',
    'upper-breach',
    'lower-breach',
    'devops',
    'monitoring',
    'svg',
    'chart',
  ],
  usage: {
    description:
      'Optical-glass anomaly detection and forecasting chart inside a sculpted prism-slab card with an automatic Anomaly Count status pill (N Anomalies in --prism-error-main or Nominal in --prism-success-main), a Show Forecast Horizon toggle, a responsive 460x220 SVG inside a recessed prism-well rendering a translucent [lower, upper] confidence corridor polygon, dashed expected baseline, vertical "Now" divider separating historical observations from future forecast intervals (actual === null), crisp actual polyline, glowing out-of-band breach rings, keyboard-navigable checkpoints, a Detected Anomalies pill jump bar, and a recessed aria-live="polite" telemetry readout powered exclusively by --prism-* CSS custom properties.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Represent future forecast intervals by setting actual: null after the latest historical observation so the vertical "Now" boundary, translucent forecast zone, and Show Forecast Horizon toggle align automatically.',
      },
      {
        guidance: true,
        description:
          'Provide stable checkpoint IDs, concise timestamp labels (e.g. "09:00"), and a clear measurement unit ("req/s", "ms", or "err/m") so Detected Anomalies jump pills and the recessed telemetry readout stay compact on narrow viewports.',
      },
      {
        guidance: false,
        description:
          'Pre-sort or drop reversed confidence intervals or non-finite numeric fields manually; AnomalyForecastChart normalizes [lower, upper] ordering and sanitizes non-finite inputs automatically without emitting NaN SVG coordinates.',
      },
    ],
    accessibility: [
      {
        name: 'Keyboard-Navigable Checkpoints & Anomaly Jump Pills',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Every SVG checkpoint exposes role="button", tabIndex={0}, descriptive aria-label, keyboard-only prism-focus-ring styling, IME-safe Enter/Space activation, and ArrowLeft/ArrowRight/Home/End traversal; header toggle and Detected Anomalies jump pills expose aria-pressed',
        description:
          'Keyboard and assistive-technology users can step across historical and forecast checkpoints or jump straight to out-of-band breaches while hearing Timestamp, Actual vs Expected, Confidence Band, Deviation, and Status updates in the aria-live="polite" readout.',
      },
      {
        name: 'Non-Color Anomaly Classification & Empty Status Region',
        criterion: '1.4.1 Use of Color & 4.1.3 Status Messages',
        requirement:
          'Pairs semantic --prism-* tokens with explicit Nominal / Upper Breach / Lower Breach / Forecast text labels, directional arrows (↑ / ↓), and a clean role="status" empty state when data is []',
        description:
          'Ensures upper and lower confidence corridor breaches remain unambiguous across all Refractor themes and color-vision profiles.',
      },
    ],
  },
  props: [
    {
      name: 'data',
      type: 'ReadonlyArray<AnomalyForecastPoint>',
      defaultValue:
        'DEFAULT_ANOMALY_FORECAST_DATA (16 checkpoints: 12 historical with 2 upper/lower anomalies + 4 forecast intervals)',
      description:
        'Ordered time-series checkpoints ({ id, label, actual, expected, lower, upper }) where actual === null marks future forecast horizon intervals. Pass [] to display the role="status" empty state.',
    },
    {
      name: 'unit',
      type: 'string',
      defaultValue: "'req/s'",
      description: 'Unit suffix appended to formatted telemetry readouts, anomaly jump pills, and accessible labels.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Anomaly Detection & Forecast'",
      description: 'Heading displayed in the sculpted prism-slab header and linked to the chart region.',
    },
    {
      name: 'onSelectPoint',
      type: '(summary: AnomalyDetectionSummary) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked with { point, index, direction, deviation } whenever a checkpoint marker or Detected Anomalies jump pill is activated.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<AnomalyForecastChart
  title="Edge API Request Throughput"
  unit="req/s"
  onSelectPoint={(summary) => {
    void summary;
  }}
/>`,
    `<AnomalyForecastChart
  title="Checkout Latency Forecast"
  unit="ms"
  data={[
    { id: 'p1', label: '10:00', actual: 84, expected: 82, lower: 72, upper: 92 },
    { id: 'p2', label: '10:15', actual: 118, expected: 85, lower: 74, upper: 96 },
    { id: 'p3', label: '10:30', actual: 88, expected: 86, lower: 75, upper: 97 },
    { id: 'p4', label: '10:45', actual: null, expected: 89, lower: 76, upper: 102 },
    { id: 'p5', label: '11:00', actual: null, expected: 92, lower: 76, upper: 108 },
  ]}
/>`,
  ],
};

export default docs;
