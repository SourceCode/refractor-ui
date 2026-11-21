export const docs = {
  name: 'RadialGauge',
  displayName: 'Radial Gauge',
  group: 'KPI, Progress & Telemetry Visuals',
  category: 'kpi-telemetry-charts',
  keywords: [
    'radial',
    'gauge',
    'kpi',
    'meter',
    'speedometer',
    'arc',
    'threshold',
    'target',
    'telemetry',
    'progress',
  ],
  usage: {
    description:
      'Optical-glass radial KPI meter supporting 180-degree semi-circular and 270-degree speedometer arc sweeps, interactive semantic threshold bands, live active progress arc, optional target tick marker with signed delta, crisp optical needle and hub, and recessed prism-well status readouts driven solely by --prism-* CSS custom properties.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Define 2–4 ordered semantic thresholds covering [min, max] (or rely on the built-in Optimal / Elevated / Critical bands) so operational state transitions are immediately legible.',
      },
      {
        guidance: true,
        description:
          'Pair a concise label (such as Throughput or CPU Load) with an explicit target benchmark when monitoring SLA or capacity objectives.',
      },
      {
        guidance: false,
        description:
          'Rely on unsorted, unbounded, or non-finite inputs to crash or render NaN paths; RadialGauge automatically sanitizes min/max inversions, clamps out-of-range values, and falls back to default semantic bands when thresholds are empty or invalid.',
      },
    ],
    accessibility: [
      {
        name: 'ARIA Meter Semantics',
        criterion: '4.1.2 Name, Role, Value',
        requirement:
          'The SVG gauge exposes role="meter" with aria-valuenow, aria-valuemin, aria-valuemax, aria-valuetext, and aria-labelledby linked to the card heading',
        description:
          'Screen readers announce exact metric readings, scale boundaries, and active threshold status without requiring visual needle interpretation.',
      },
      {
        name: 'Interactive Threshold Bands & Live Footer Readout',
        criterion: '2.1.1 Keyboard & 1.4.1 Use of Color',
        requirement:
          'Each threshold arc path exposes role="button", tabIndex={0}, aria-pressed, IME-safe Enter/Space activation, Escape reset, and prism-focus-ring outlines',
        description:
          'Focusing or activating a band updates the aria-live="polite" recessed prism-well footer with exact numeric ranges alongside the header status pill so status never depends on color alone.',
      },
    ],
  },
  props: [
    {
      name: 'value',
      type: 'number',
      defaultValue: 'required',
      description: 'Current numeric reading plotted along the arc; non-finite inputs safely fall back to min.',
    },
    {
      name: 'min',
      type: 'number',
      defaultValue: '0',
      description: 'Lower scale boundary of the gauge; non-finite inputs fall back to 0.',
    },
    {
      name: 'max',
      type: 'number',
      defaultValue: '100',
      description: 'Upper scale boundary of the gauge; falls back to min + 100 when <= min or non-finite.',
    },
    {
      name: 'unit',
      type: 'string',
      defaultValue: "'%'",
      description: 'Unit suffix appended to the center headline value, endpoint ticks, target marker, and footer.',
    },
    {
      name: 'label',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Optional metric caption displayed beneath the tabular-nums headline value.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'KPI Radial Gauge'",
      description: 'Card heading rendered in the header and referenced by aria-labelledby on the meter.',
    },
    {
      name: 'target',
      type: 'number',
      defaultValue: 'undefined',
      description: 'Optional target benchmark rendered as a radial tick marker along the arc with a signed delta in the footer.',
    },
    {
      name: 'sweep',
      type: '180 | 270',
      defaultValue: '180',
      description: 'Arc sweep angle in degrees: 180 for a semi-circular meter or 270 for a 3/4 speedometer dial.',
    },
    {
      name: 'thresholds',
      type: 'RadialGaugeThreshold[]',
      defaultValue: 'Optimal (60%) / Elevated (85%) / Critical (100%)',
      description: 'Semantic threshold bands sorted ascending and clamped to [min, max].',
    },
    {
      name: 'size',
      type: 'number',
      defaultValue: '240',
      description: 'SVG viewport width in pixels, clamped safely between 160 and 360.',
    },
    {
      name: 'onSelectBand',
      type: '(threshold: RadialGaugeThreshold) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked with the normalized threshold band when clicked or activated via IME-safe Enter/Space.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<RadialGauge\n  title="Cluster Utilization"\n  label="Throughput"\n  value={74}\n  target={80}\n  unit="%"\n/>`,
    `<RadialGauge\n  title="API Latency Budget"\n  label="P95 Latency"\n  value={142}\n  min={0}\n  max={250}\n  target={120}\n  unit="ms"\n  sweep={270}\n  size={260}\n  thresholds={[\n    { upTo: 100, label: 'Fast', tone: 'emerald' },\n    { upTo: 175, label: 'Nominal', tone: 'primary' },\n    { upTo: 220, label: 'Degraded', tone: 'amber' },\n    { upTo: 250, label: 'Breach', tone: 'rose' },\n  ]}\n/>`,
  ],
};
