export const docs = {
  name: 'ChartCrosshairTooltip',
  displayName: 'Chart Crosshair Tooltip',
  group: 'Chart Chrome & Interactive Controls',
  category: 'chart-chrome-controls',
  keywords: [
    'crosshair',
    'tooltip',
    'chart',
    'inspector',
    'multi-series',
    'pin',
    'delta',
    'hover',
    'keyboard',
    'chrome',
    'svg',
    'analytics',
  ],
  usage: {
    description:
      'Optical-glass multi-series crosshair and floating glassmorphic tooltip inspector featuring pointer-snapped vertical and optional horizontal crosshair guides, per-series glowing active halos, click/Enter pin locking with a header Unpin pill, dynamic left/right edge-safe tooltip flipping, tabular value + signed delta readouts, and full IME-safe keyboard navigation powered exclusively by --prism-* tokens.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Assign distinct semantic tones (primary, secondary, emerald, amber, rose) and explicit units to each CrosshairSeries so multi-series tooltip rows remain scannable across optical themes.',
      },
      {
        guidance: true,
        description:
          'Use controlled activeIndex alongside onActiveIndexChange to synchronize crosshair inspection across sibling dashboard panels or telemetry tables.',
      },
      {
        guidance: false,
        description:
          'Assume every series array contains clean finite numbers; ChartCrosshairTooltip automatically renders a status empty state when no finite values exist and sanitizes isolated non-finite points safely.',
      },
    ],
    accessibility: [
      {
        name: 'Keyboard Column Traversal & Pin Locking',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Column hit targets expose role="button", tabIndex={0}, aria-label="Inspect {label}", aria-pressed for pinned state, prism-focus-ring keyboard focus outlines, and IME-safe ArrowLeft/ArrowRight/Home/End/Enter/Space/Escape navigation',
        description:
          'Keyboard users can sweep across every X-axis column, lock a column for inspection, jump to start or end boundaries, and dismiss the crosshair cleanly without pointer interaction.',
      },
      {
        name: 'Live Multi-Series Readout & Empty Status',
        criterion: '4.1.3 Status Messages',
        requirement:
          'Floating tooltip card announces active multi-series snapshots via role="status" and aria-live="polite", and empty/non-finite datasets render a role="status" fallback message',
        description:
          'Assistive technologies receive concise live updates for the active timestamp, series values, units, and signed deltas without stealing keyboard focus.',
      },
    ],
  },
  props: [
    {
      name: 'labels',
      type: 'string[]',
      defaultValue: 'required',
      description: 'Ordered X-axis tick labels aligned to each series values array.',
    },
    {
      name: 'series',
      type: 'CrosshairSeries[]',
      defaultValue: 'required',
      description:
        'One or more numeric data series ({ id, label, values, tone?, unit? }) plotted on the shared Y axis.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Crosshair Multi-Series Inspector'",
      description: 'Card heading rendered in the optical slab header and linked to the SVG graphic.',
    },
    {
      name: 'activeIndex',
      type: 'number | null',
      defaultValue: 'undefined',
      description: 'Controlled active hovered or focused column index; pass null to clear.',
    },
    {
      name: 'defaultActiveIndex',
      type: 'number | null',
      defaultValue: 'null',
      description: 'Initial active column index when running in uncontrolled mode.',
    },
    {
      name: 'showHorizontalGuide',
      type: 'boolean',
      defaultValue: 'true',
      description:
        'Renders a horizontal dashed crosshair guide snapped to the primary series Y coordinate alongside the vertical guide.',
    },
    {
      name: 'height',
      type: 'number',
      defaultValue: '240',
      description: 'SVG height in pixels, clamped safely to [160, 460].',
    },
    {
      name: 'onActiveIndexChange',
      type: '(snapshot: CrosshairSnapshot | null) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked whenever the active column changes or clears, delivering per-series values, units, tones, and signed deltas.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<ChartCrosshairTooltip\n  title="Gateway Latency & Throughput"\n  labels={['09:00', '10:00', '11:00', '12:00', '13:00']}\n  series={[\n    { id: 'p95', label: 'P95 Latency', tone: 'primary', unit: 'ms', values: [48.2, 52.4, 50.6, 56.1, 49.8] },\n    { id: 'p50', label: 'P50 Median', tone: 'emerald', unit: 'ms', values: [21.0, 22.5, 20.7, 23.1, 21.4] },\n  ]}\n/>`,
    `<ChartCrosshairTooltip\n  title="Regional Error Budget"\n  defaultActiveIndex={2}\n  showHorizontalGuide={false}\n  height={200}\n  labels={['Mon', 'Tue', 'Wed', 'Thu']}\n  series={[\n    { id: 'us', label: 'US-East', tone: 'secondary', unit: '%', values: [99.9, 99.85, 99.92, 99.95] },\n    { id: 'eu', label: 'EU-West', tone: 'amber', unit: '%', values: [99.8, 99.82, 99.78, 99.91] },\n  ]}\n/>`,
  ],
};
