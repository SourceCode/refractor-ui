export const docs = {
  name: 'LiveTelemetryChart',
  displayName: 'Live Telemetry Chart',
  group: 'KPI, Progress & Telemetry Visuals',
  category: 'kpi-telemetry-charts',
  keywords: [
    'telemetry',
    'live',
    'streaming',
    'chart',
    'timeseries',
    'monitoring',
    'observability',
    'metrics',
    'threshold',
    'pause',
    'window',
    'svg',
  ],
  usage: {
    description:
      'Optical-glass real-time streaming telemetry chart with a LIVE/PAUSED status header, selectable rolling window pills (20, 40, 60), controlled or uncontrolled pause snapshots with buffered-sample tracking, optional interval streaming and deterministic Step trigger, 4-stat Current/Min/Avg/Max strip, warning threshold line, linear-gradient area fill, keyboard-inspectable SVG points, and a recessed prism-well inspector bar powered exclusively by --prism-* tokens.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Configure warningThreshold to highlight SLA or latency breaches directly on the chart canvas, Current stat tile, and sample inspector using --prism-error-main without hardcoding colors.',
      },
      {
        guidance: true,
        description:
          'Provide onGenerateSample alongside streamingIntervalMs for autonomous live telemetry polling, or leave streamingIntervalMs at 0 to allow deterministic manual stepping via the Step button.',
      },
      {
        guidance: false,
        description:
          'Mutate the samples array in place or rely on raw unguarded NaN values; pass immutable sample updates so React detects changes and LiveTelemetryChart filters out non-finite readings safely.',
      },
    ],
    accessibility: [
      {
        name: 'Interactive Controls & Keyboard Point Inspection',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Window size pills and Pause/Resume controls expose aria-pressed with keyboard-only prism-focus-ring; SVG sample points expose role="button", tabIndex={0}, IME-safe Enter/Space activation, and descriptive aria-labels',
        description:
          'Keyboard and assistive-technology users can switch rolling window lengths, pause or resume live streaming, step deterministic samples, inspect individual data points, and hear readout updates via aria-live="polite".',
      },
      {
        name: 'Non-Color Threshold & Stream State Indicators',
        criterion: '1.4.1 Use of Color',
        requirement:
          'Pairs color tokens with explicit LIVE/PAUSED text badges, buffered sample counters, dashed WARN threshold labels, and textual Warning pills',
        description:
          'Ensures streaming status, buffered backlog, and threshold breaches remain legible across all optical glass themes and color-vision profiles.',
      },
    ],
  },
  props: [
    {
      name: 'samples',
      type: 'TelemetrySample[]',
      defaultValue: 'required',
      description:
        'Initial or externally updated streaming telemetry samples ({ id?, timestamp, value }); non-finite values are safely filtered out.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Live Telemetry Stream'",
      description: 'Heading rendered in the optical slab header and linked to the SVG graphic.',
    },
    {
      name: 'unit',
      type: 'string',
      defaultValue: "'ms'",
      description: 'Unit suffix appended to stat tiles, threshold labels, and inspector readouts.',
    },
    {
      name: 'tone',
      type: "'primary' | 'secondary' | 'emerald' | 'amber' | 'rose'",
      defaultValue: "'primary'",
      description: 'Semantic --prism-* optical color token applied to the polyline, area gradient, and active markers.',
    },
    {
      name: 'defaultWindowSize',
      type: '20 | 40 | 60',
      defaultValue: '40',
      description: 'Initial rolling sample window tail length selectable via header pills.',
    },
    {
      name: 'warningThreshold',
      type: 'number',
      defaultValue: 'undefined',
      description:
        'Optional horizontal dashed threshold line; flags samples >= threshold and highlights the Current stat using var(--prism-error-main).',
    },
    {
      name: 'paused',
      type: 'boolean',
      defaultValue: 'undefined',
      description:
        'Controlled pause state; freezes the rendered window snapshot and tracks buffered samples arriving while paused.',
    },
    {
      name: 'defaultPaused',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Initial pause state when running in uncontrolled mode.',
    },
    {
      name: 'onPausedChange',
      type: '(paused: boolean) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked whenever the Pause/Resume toggle button is activated.',
    },
    {
      name: 'streamingIntervalMs',
      type: 'number',
      defaultValue: '0',
      description:
        'Polling interval in milliseconds; when > 0, not paused, and onGenerateSample is provided, appends generated samples automatically and cleans up via clearInterval.',
    },
    {
      name: 'onGenerateSample',
      type: '(sequence: number) => TelemetrySample',
      defaultValue: 'undefined',
      description:
        'Optional sample factory invoked with a 1-based sequence counter on each interval tick and whenever the manual Step button is clicked.',
    },
    {
      name: 'height',
      type: 'number',
      defaultValue: '200',
      description: 'SVG viewport height in pixels, clamped to [140, 360].',
    },
    {
      name: 'onSelectSample',
      type: '(sample: TelemetrySample, index: number) => void',
      defaultValue: 'undefined',
      description:
        'Callback fired when a plotted sample point is clicked or activated with Enter/Space.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<LiveTelemetryChart\n  title="Edge Gateway Latency"\n  unit="ms"\n  tone="primary"\n  warningThreshold={120}\n  defaultWindowSize={40}\n  samples={[\n    { id: 's1', timestamp: '12:00:01', value: 44 },\n    { id: 's2', timestamp: '12:00:02', value: 58 },\n    { id: 's3', timestamp: '12:00:03', value: 92 },\n    { id: 's4', timestamp: '12:00:04', value: 128 },\n  ]}\n/>`,
    `<LiveTelemetryChart\n  title="Worker Queue Throughput"\n  unit="ops/s"\n  tone="emerald"\n  streamingIntervalMs={1000}\n  onGenerateSample={(seq) => ({\n    id: \`tick-\${seq}\`,\n    timestamp: \`00:00:\${String(seq % 60).padStart(2, '0')}\`,\n    value: 60 + ((seq * 13) % 45),\n  })}\n  samples={[{ id: 'seed-0', timestamp: '00:00:00', value: 64 }]}\n/>`,
  ],
};
