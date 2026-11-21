export const docs = {
  name: 'DateRangePicker',
  displayName: 'Date Range Picker',
  group: 'Date, Time & Scheduling Fields',
  category: 'date-time-scheduling',
  keywords: [
    'date',
    'range',
    'calendar',
    'picker',
    'dual-month',
    'presets',
    'schedule',
    'interval',
    'period',
  ],
  usage: {
    description:
      'Dual-month optical-glass calendar slab with quick-select range presets, automatic start/end ordering, translucent in-range day tinting, formatted summary pill, and one-click clear control.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Pass unambiguous ISO 8601 date strings (YYYY-MM-DD) for value, defaultValue, presets, and referenceDate so range comparisons remain timezone-safe.',
      },
      {
        guidance: true,
        description:
          'Provide a deterministic referenceDate in analytical dashboards and tests so default presets (Last 7 Days, Last 30 Days, Month to Date, Last Quarter) align with your reporting clock.',
      },
      {
        guidance: false,
        description:
          'Force users to click dates strictly in chronological order; DateRangePicker automatically swaps out-of-order clicks so start is always less than or equal to end.',
      },
    ],
    accessibility: [
      {
        name: 'Unique Day Labels & Keyboard Navigation',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement: 'Each in-month day exposes an ISO aria-label and aria-pressed state with prism-focus-ring',
        description:
          'Out-of-month filler cells in dual-month grids are marked aria-hidden so every selectable date has a single unambiguous accessible name, while PageUp/PageDown (IME-guarded) and prev/next buttons shift months cleanly.',
      },
      {
        name: 'Polite Range Status Announcements',
        criterion: '4.1.3 Status Messages',
        requirement: 'role="status" aria-live="polite" aria-atomic="true" live region',
        description:
          'Announces start/end selections, preset applications, and range clearing politely without stealing keyboard focus.',
      },
    ],
  },
  props: [
    {
      name: 'value',
      type: 'DateRangeValue',
      defaultValue: 'undefined',
      description: 'Controlled `{ start: string | null; end: string | null }` ISO range value.',
    },
    {
      name: 'defaultValue',
      type: 'DateRangeValue',
      defaultValue: '{ start: null, end: null }',
      description: 'Initial range value when operating in uncontrolled mode.',
    },
    {
      name: 'onChange',
      type: '(next: DateRangeValue) => void',
      defaultValue: 'undefined',
      description: 'Invoked whenever the range changes via day click, preset click, or Clear.',
    },
    {
      name: 'presets',
      type: 'ReadonlyArray<DateRangePreset>',
      defaultValue: 'Last 7 Days, Last 30 Days, Month to Date, Last Quarter',
      description: 'Quick-select preset ranges rendered in the left rail.',
    },
    {
      name: 'referenceDate',
      type: 'string',
      defaultValue: "'2026-11-21'",
      description: 'ISO date (YYYY-MM-DD) used to derive default presets and initial calendar view.',
    },
    {
      name: 'label',
      type: 'string',
      defaultValue: "'Date Range'",
      description: 'Heading label rendered in the optical slab header.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables presets, month navigation, calendar day cells, and Clear button.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and style overrides.',
    },
  ],
  examples: [
    `<DateRangePicker\n  label="Telemetry Window"\n  referenceDate="2026-11-21"\n  defaultValue={{ start: '2026-11-15', end: '2026-11-21' }}\n  onChange={(next) => setRange(next)}\n/>`,
  ],
};
