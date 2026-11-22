export const docs = {
  name: 'BurndownBurnupChart',
  displayName: 'Burndown / Burnup Chart',
  group: 'Financial & Market Visualizations',
  category: 'financial-market-charts',
  keywords: [
    'burndown',
    'burnup',
    'sprint',
    'velocity',
    'agile',
    'scope',
    'scope-creep',
    'forecast',
    'pace',
    'ideal-trend',
    'delivery',
    'svg',
    'chart',
  ],
  usage: {
    description:
      'Optical-glass sprint burn-down and burn-up visualization inside a sculpted prism-slab card with controlled/uncontrolled Burn-Down / Burn-Up mode switching, a live Pace / Forecast status pill (On Track, At Risk, Behind Ideal), a responsive 460x210 SVG inside a recessed prism-well showing horizontal gridlines, a dashed Ideal Pace trendline, a Scope Ceiling polyline in Burn-Up mode, a glowing actual polyline with translucent gradient fill, keyboard-navigable day markers with crosshair highlight, and a recessed aria-live="polite" telemetry inspector powered exclusively by --prism-* tokens.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Switch to Burn-Up mode whenever scope changes mid-sprint so stakeholders can clearly separate team delivery velocity (Actual Completed) from scope expansion (Scope Ceiling).',
      },
      {
        guidance: true,
        description:
          'Provide stable checkpoint IDs and concise day labels (e.g. "Day 1" .. "Day 10") alongside a meaningful unit ("pts", "hrs", or "issues") so axis labels and the recessed inspector stay compact on narrow viewports.',
      },
      {
        guidance: false,
        description:
          'Pre-compute negative remaining counts or pass unguarded NaN metrics; BurndownBurnupChart sanitizes non-finite and negative inputs to 0 and computes remaining = max(0, scope - completed) automatically.',
      },
    ],
    accessibility: [
      {
        name: 'Keyboard-Navigable Day Markers & Live Inspector',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Every plotted day marker exposes role="button", tabIndex={0}, descriptive aria-label, keyboard-only prism-focus-ring styling, IME-safe Enter/Space activation, and ArrowLeft/ArrowRight/Home/End navigation',
        description:
          'Keyboard and assistive-technology users can traverse every sprint checkpoint, follow the vertical crosshair highlight, and hear updated Day, Remaining, Completed, Scope, and Ideal Delta metrics announced via the aria-live="polite" inspector.',
      },
      {
        name: 'Mode Toggle Semantics & Empty Status Region',
        criterion: '4.1.2 Name, Role, Value & 4.1.3 Status Messages',
        requirement:
          'Burn-Down / Burn-Up toggle buttons expose aria-pressed inside a labeled group, and empty datasets render a clean role="status" notice',
        description:
          'Preserves deterministic screen-reader announcements across controlled and uncontrolled mode transitions as well as empty sprint states.',
      },
    ],
  },
  props: [
    {
      name: 'data',
      type: 'ReadonlyArray<SprintBurnPoint>',
      defaultValue: 'DEFAULT_SPRINT_BURN_DATA (10-day sprint with mid-sprint scope increase)',
      description:
        'Ordered sprint checkpoints ({ id, label, scope, completed }). Omit for the built-in 10-day trajectory; pass [] to render the role="status" empty state.',
    },
    {
      name: 'mode',
      type: "'burndown' | 'burnup'",
      defaultValue: 'undefined',
      description:
        'Controlled chart visualization mode. Pair with onModeChange to synchronize mode externally.',
    },
    {
      name: 'defaultMode',
      type: "'burndown' | 'burnup'",
      defaultValue: "'burndown'",
      description: 'Initial visualization mode when uncontrolled.',
    },
    {
      name: 'onModeChange',
      type: '(mode: BurnChartMode) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked when the user switches between Burn-Down and Burn-Up modes.',
    },
    {
      name: 'unit',
      type: 'string',
      defaultValue: "'pts'",
      description: 'Unit suffix appended to formatted inspector readouts and accessible labels.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Sprint Burn-Down / Burn-Up'",
      description: 'Heading displayed in the sculpted optical card header and linked to the chart region.',
    },
    {
      name: 'onSelectPoint',
      type: '(point: SprintBurnPoint, index: number) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked with the selected SprintBurnPoint and its index whenever a day marker is clicked or activated/navigated via keyboard.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<BurndownBurnupChart\n  title="Sprint 24 Delivery Trajectory"\n  unit="pts"\n  onSelectPoint={(point, index) => {\n    void point;\n    void index;\n  }}\n/>`,
    `<BurndownBurnupChart\n  title="Q3 Release Burn-Up"\n  defaultMode="burnup"\n  unit="hrs"\n  data={[\n    { id: 'w1', label: 'W1', scope: 120, completed: 18 },\n    { id: 'w2', label: 'W2', scope: 120, completed: 44 },\n    { id: 'w3', label: 'W3', scope: 140, completed: 76 },\n    { id: 'w4', label: 'W4', scope: 140, completed: 112 },\n    { id: 'w5', label: 'W5', scope: 140, completed: 136 },\n  ]}\n/>`,
  ],
};

export default docs;
