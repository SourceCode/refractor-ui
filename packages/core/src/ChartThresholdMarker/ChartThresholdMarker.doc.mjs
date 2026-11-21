export const docs = {
  name: 'ChartThresholdMarker',
  displayName: 'Chart Threshold Marker',
  group: 'Chart Chrome & Interactive Controls',
  category: 'chart-chrome-controls',
  keywords: [
    'threshold',
    'marker',
    'annotation',
    'sla',
    'budget-cap',
    'target-band',
    'reference-line',
    'event-flag',
    'breach',
    'chart-chrome',
    'interactive-controls',
    'svg',
    'chart',
  ],
  usage: {
    description:
      'Optical-glass trend plot with layered horizontal threshold reference lines, shaded target bands, vertical pinned event callout flags, layer visibility toggle pills, breach highlighting, and a recessed polite live inspector rendered exclusively with semantic --prism-* CSS custom properties.',
    bestPractices: [
      {
        guidance: true,
        description:
          "Assign semantic tones ('emerald' for nominal target bands, 'amber' for warning caps, 'rose' for hard SLA ceilings) so breach-highlighted data dots automatically surface observations exceeding the highest rose or amber threshold.",
      },
      {
        guidance: true,
        description:
          'Provide concise event flag labels (e.g. "v2.4 Deploy", "Cache Flush") paired with richer detail descriptions so the plot canvas stays uncluttered while the recessed prism-well inspector reveals full operational context on focus.',
      },
      {
        guidance: false,
        description:
          'Stack dozens of overlapping threshold lines without toggling layers; keep reference lines focused on actionable SLA, SLO, or budget boundaries and rely on the built-in Bands, Thresholds, and Events toggles to isolate layers.',
      },
    ],
    accessibility: [
      {
        name: 'Keyboard-Operable Threshold Badges & Event Callout Flags',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Focusable SVG threshold pills and vertical event flags supporting IME-safe Enter/Space activation, Escape dismissal, aria-pressed state, and keyboard-only prism-focus-ring outlines',
        description:
          'Every threshold pill and event flag declares role="button", tabIndex={0}, aria-pressed, and a descriptive aria-label announcing exact values, breach counts, or event details while ignoring IME composition commits.',
      },
      {
        name: 'Polite Live Annotation Inspector & Accessible Empty Region',
        criterion: '4.1.3 Status Messages & 1.1.1 Non-text Content',
        requirement:
          'aria-live="polite" prism-well readout with Clear reset button plus role="status" empty state and aria-pressed layer toggle pills',
        description:
          'Clicking or keyboard-activating any threshold badge or event flag announces breach summaries or event details in a polite live region, while empty or non-finite datasets render a clean role="status" message.',
      },
    ],
  },
  props: [
    {
      name: 'data',
      type: 'ThresholdDataPoint[]',
      defaultValue: 'required',
      description:
        'Ordered array of { label, value } observations forming the base optical trend line; non-finite values are automatically filtered out.',
    },
    {
      name: 'thresholds',
      type: 'ChartThresholdLine[]',
      defaultValue: '[]',
      description:
        'Optional horizontal reference lines ({ id, label, value, tone?, dashed? }) with interactive clickable/focusable badge pills showing live breach counts.',
    },
    {
      name: 'bands',
      type: 'ChartTargetBand[]',
      defaultValue: '[]',
      description:
        'Optional shaded horizontal target zones ({ id, label, from, to, tone? }) rendered at 0.12 fill opacity with right-aligned labels.',
    },
    {
      name: 'events',
      type: 'ChartEventMarker[]',
      defaultValue: '[]',
      description:
        'Optional vertical pinned event callout flags ({ id, index, label, detail?, tone? }) anchored to valid zero-based data indices.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Threshold & Event Annotations'",
      description: 'Heading displayed in the optical prism-slab card header and linked to the SVG via aria-labelledby.',
    },
    {
      name: 'valueUnit',
      type: 'string',
      defaultValue: "''",
      description: 'Optional unit suffix appended to formatted threshold values, event readouts, and aria labels (e.g. "ms", "%").',
    },
    {
      name: 'height',
      type: 'number',
      defaultValue: '250',
      description: 'SVG chart viewport height in pixels, safely clamped between 170 and 480.',
    },
    {
      name: 'onSelectThreshold',
      type: '(threshold: ChartThresholdLine, breaches: number) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked with the selected ChartThresholdLine and the count of finite data points strictly exceeding its value.',
    },
    {
      name: 'onSelectEvent',
      type: '(event: ChartEventMarker, point: ThresholdDataPoint) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked with the selected ChartEventMarker and its anchored ThresholdDataPoint when an event flag is activated.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and inline style overrides merged onto the root prism-slab container.',
    },
  ],
  examples: [
    `<ChartThresholdMarker
  title="Gateway Latency & Release Markers"
  valueUnit="ms"
  data={[
    { label: '09:00', value: 88 },
    { label: '10:00', value: 112 },
    { label: '11:00', value: 164 },
    { label: '12:00', value: 138 },
    { label: '13:00', value: 96 },
  ]}
  bands={[
    { id: 'slo-zone', label: 'Nominal SLO', from: 70, to: 120, tone: 'emerald' },
  ]}
  thresholds={[
    { id: 'warn-cap', label: 'Warn Cap', value: 130, tone: 'amber' },
    { id: 'sla-max', label: 'SLA Max', value: 150, tone: 'rose', dashed: true },
  ]}
  events={[
    { id: 'deploy', index: 2, label: 'v2.4 Deploy', detail: 'Canary rollout triggered spike', tone: 'primary' },
    { id: 'rollback', index: 4, label: 'Cache Warm', detail: 'Edge warm-up restored p95', tone: 'secondary' },
  ]}
/>`,
  ],
};
