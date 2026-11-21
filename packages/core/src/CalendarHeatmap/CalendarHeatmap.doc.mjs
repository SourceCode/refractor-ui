export const docs = {
  name: 'CalendarHeatmap',
  displayName: 'Calendar Heatmap',
  group: 'KPI, Progress & Telemetry Visuals',
  category: 'kpi-telemetry-charts',
  keywords: [
    'calendar',
    'heatmap',
    'activity',
    'contributions',
    'streak',
    'telemetry',
    'kpi',
    'timeline',
    'density',
    'daily',
  ],
  usage: {
    description:
      'Deterministic UTC optical-glass calendar activity heatmap backed by a prototype-safe Map<string, CalendarHeatmapEntry> store, 5-level optical opacity quantization (0 empty recessed well; levels 1..4 at 0.24..0.95 on --prism-* tones), Total/Active Days/Best Streak summary pills, weekday and month markers, and an interactive recessed prism-well readout.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Provide ISO YYYY-MM-DD dates and an explicit endDate when pinning historical reporting windows so multi-timezone teams see identical UTC grids.',
      },
      {
        guidance: true,
        description:
          'Attach concise detail strings to notable activity entries so selecting a day cell reveals deployment notes, release tags, or incident summaries in the recessed readout.',
      },
      {
        guidance: false,
        description:
          'Pass localized date strings or negative counts expecting silent coercion; malformed dates and negative or non-finite counts are safely ignored to preserve calendar integrity.',
      },
    ],
    accessibility: [
      {
        name: 'Semantic Calendar Grid & Axis Headers',
        criterion: '1.3.1 Info and Relationships',
        requirement:
          'Hydration-safe <table> with <thead> week/month column headers (scope="col"), <tbody> weekday row headers (scope="row") with visible Mon/Wed/Fri labels, and aria-labelledby heading binding',
        description:
          'Screen readers can navigate across weeks and weekdays while preserving a compact visual layout.',
      },
      {
        name: 'Interactive Day Cells & Live Selection Readout',
        criterion: '2.1.1 Keyboard, 4.1.2 Name, Role, Value & 4.1.3 Status Messages',
        requirement:
          'Native <button type="button"> day cells with aria-label="{date}: {count} {valueUnit}", aria-pressed, data-level="0..4", IME-safe Enter/Space activation, keyboard-only prism-focus-ring, and aria-live="polite" prism-well readout',
        description:
          'Clicking or activating any day highlights the cell, fires onSelectDay, and announces the date, count, intensity level, and optional detail.',
      },
    ],
  },
  props: [
    {
      name: 'entries',
      type: 'CalendarHeatmapEntry[]',
      defaultValue: 'required',
      description:
        'Array of { date, count, detail? } daily activity entries aggregated via a prototype-safe Map<string, CalendarHeatmapEntry>.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Activity Calendar Heatmap'",
      description: 'Heading rendered in the optical slab header above the summary pills.',
    },
    {
      name: 'weeks',
      type: 'number',
      defaultValue: '12',
      description: 'Number of week columns displayed in the grid, clamped between 4 and 26.',
    },
    {
      name: 'endDate',
      type: 'string',
      defaultValue: 'latest valid entry date or "2026-11-21"',
      description:
        'Optional ISO YYYY-MM-DD anchor date determining the final UTC week column rendered.',
    },
    {
      name: 'valueUnit',
      type: 'string',
      defaultValue: "'events'",
      description: 'Unit suffix displayed alongside daily counts, aria-labels, and total pill.',
    },
    {
      name: 'tone',
      type: "'emerald' | 'primary' | 'secondary' | 'rose'",
      defaultValue: "'emerald'",
      description: 'Semantic --prism-* optical tone applied to active day cells and legend swatches.',
    },
    {
      name: 'onSelectDay',
      type: '(entry: CalendarHeatmapEntry) => void',
      defaultValue: 'undefined',
      description: 'Callback fired whenever a user clicks or keyboard-activates a day cell.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and optical style overrides.',
    },
  ],
  examples: [
    `<CalendarHeatmap\n  title="Production Deployments"\n  tone="emerald"\n  weeks={12}\n  endDate="2026-11-21"\n  valueUnit="deploys"\n  entries={[\n    { date: '2026-11-17', count: 2, detail: 'Canary rollout' },\n    { date: '2026-11-18', count: 5, detail: 'v1.18.0 release' },\n    { date: '2026-11-19', count: 8, detail: 'Edge cache refresh' },\n    { date: '2026-11-20', count: 12, detail: 'Global promotion' },\n    { date: '2026-11-21', count: 3 },\n  ]}\n/>`,
  ],
};
