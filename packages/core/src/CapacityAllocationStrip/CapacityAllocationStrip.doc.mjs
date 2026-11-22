export const docs = {
  name: 'CapacityAllocationStrip',
  displayName: 'Capacity Allocation Strip',
  group: 'System, DevOps & Observability Widgets',
  category: 'observability-widgets',
  keywords: [
    'capacity',
    'allocation',
    'storage',
    'quota',
    'disk',
    'memory',
    'cluster',
    'observability',
    'devops',
    'segmented',
    'bar',
    'threshold',
    'telemetry',
    'usage',
  ],
  usage: {
    description:
      'Sculpted optical-glass prism-slab storage and resource quota visualizer featuring a header with live formatted usage telemetry and semantic --prism-* quota health badge (Healthy, Near Capacity, Critical Quota), a segmented horizontal optical bar with proportional clickable category slices, hatched Free Space remainder, and a crisp vertical dashed Warning Threshold Marker, interactive category breakdown pills synchronized with the bar via click and IME-safe keyboard activation, a recessed aria-live="polite" telemetry footer, and a clean role="status" empty state.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Provide distinct semantic tones (primary, secondary, emerald, info, amber, rose) and concise descriptions per CapacitySegment so operators can immediately correlate bar slices, breakdown pills, and footer inspection readouts.',
      },
      {
        guidance: true,
        description:
          'Align warningThresholdPct and criticalThresholdPct with cluster alerting policies (such as 80% warning and 92% critical) so the dashed threshold marker and semantic badge match PagerDuty/Prometheus alerts.',
      },
      {
        guidance: false,
        description:
          'Pass raw hex or rgb colors or unvalidated division denominators; CapacityAllocationStrip resolves all tones through --prism-* CSS variables, clamps thresholds cleanly, and falls back to a role="status" empty state when no positive quota or segments exist.',
      },
    ],
    accessibility: [
      {
        name: 'Synchronized Interactive Bar Slices & Category Pills',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Native button controls with aria-pressed state, descriptive aria-labels, keyboard-only .prism-focus-ring outlines, IME-safe Enter/Space activation (!e.nativeEvent.isComposing), and Escape/Clear deselection',
        description:
          'Allows keyboard and pointer users to inspect individual storage categories from either the segmented optical bar or the wrapped breakdown pills without losing context.',
      },
      {
        name: 'Progress Semantics, Non-Color Quota Status & Live Footer Readout',
        criterion: '1.4.1 Use of Color & 4.1.3 Status Messages',
        requirement:
          'role="region" linked via aria-labelledby, role="progressbar" with aria-valuemin/max/now/valuetext, icon + text quota alert badge, role="status" empty state, and aria-live="polite" telemetry footer',
        description:
          'Communicates storage utilization, warning/critical threshold crossings, and selected category breakdowns clearly to screen readers without relying on color alone.',
      },
    ],
  },
  props: [
    {
      name: 'segments',
      type: 'ReadonlyArray<CapacitySegment>',
      defaultValue:
        '5 cluster storage segments (Postgres Volumes, Vector Index, Media Assets, Container Layers, Logs & Traces)',
      description:
        'Categorized capacity allocations rendered as proportional horizontal bar slices and interactive breakdown pills.',
    },
    {
      name: 'total',
      type: 'number',
      defaultValue: '1000 (or sum of segments if higher)',
      description:
        'Total capacity quota in the configured unit; triggers a clean role="status" empty state when segments is [] and total <= 0.',
    },
    {
      name: 'unit',
      type: 'string',
      defaultValue: "'GB'",
      description: 'Unit suffix appended to formatted capacity amounts in badges, pills, and footer.',
    },
    {
      name: 'warningThresholdPct',
      type: 'number',
      defaultValue: '80',
      description:
        'Utilization percentage (clamped 1..100) for the dashed Warning Threshold Marker and Near Capacity badge.',
    },
    {
      name: 'criticalThresholdPct',
      type: 'number',
      defaultValue: '92',
      description:
        'Utilization percentage (clamped warningThresholdPct..100) at which the Critical Quota badge activates.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Cluster Storage Quota'",
      description: 'Visible heading rendered in the prism-slab header and linked via aria-labelledby.',
    },
    {
      name: 'onSelectSegment',
      type: '(segment: CapacitySegment, sharePct: number) => void',
      defaultValue: 'undefined',
      description:
        'Callback fired when a user clicks or keyboard-activates a bar segment or breakdown pill.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<CapacityAllocationStrip\n  onSelectSegment={(segment, sharePct) => console.warn(segment.id, sharePct)}\n/>`,
    `<CapacityAllocationStrip\n  title="Production NVMe Pool"\n  total={2000}\n  unit="TB"\n  warningThresholdPct={75}\n  criticalThresholdPct={90}\n  segments={[\n    { id: 'oltp', label: 'Postgres Volumes', value: 780, tone: 'primary', description: 'Primary WAL + snapshots' },\n    { id: 'vectors', label: 'Vector Index', value: 520, tone: 'secondary' },\n    { id: 'blobs', label: 'Media Assets', value: 360, tone: 'emerald' },\n  ]}\n/>`,
  ],
};

export default docs;
