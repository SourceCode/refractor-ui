export const docs = {
  name: 'RecurrenceBuilder',
  displayName: 'Recurrence Builder',
  group: 'Date, Time & Scheduling Fields',
  category: 'date-time-scheduling',
  keywords: [
    'recurrence',
    'schedule',
    'cron',
    'rrule',
    'repeat',
    'interval',
    'weekdays',
    'calendar',
    'automation',
    'jobs',
    'cadence',
  ],
  usage: {
    description:
      'Optical-glass recurrence schedule builder with frequency selector pills (Daily, Weekly, Monthly, Yearly), clamped 1..99 interval stepper, Sun..Sat weekday toggle group, conditional day-of-month control, 24-hour time inputs, Never/Until/Count end selectors, a live natural-language summary callout, and an optional monospace 5-field cron preview badge.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Consume all three onChange arguments (rule, cron, summary) to persist structured recurrence metadata alongside standard 5-field cron expressions and readable audit summaries.',
      },
      {
        guidance: true,
        description:
          'Hide the cron preview with showCronPreview={false} in non-technical end-user scheduling forms while retaining the human-readable summary callout.',
      },
      {
        guidance: false,
        description:
          'Allow weekly schedules to have zero selected weekdays; RecurrenceBuilder enforces at least one active weekday when toggling buttons.',
      },
    ],
    accessibility: [
      {
        name: 'Grouped Toggle Controls & Pressed Semantics',
        criterion: '4.1.2 Name, Role, Value & 1.3.1 Info and Relationships',
        requirement: 'role="group" with descriptive aria-label and explicit aria-pressed states on frequency, weekday, and end-condition pills',
        description:
          'Exposes frequency, weekday, and end-condition selectors as labeled button groups with accurate aria-pressed state and keyboard-only prism-focus-ring focus indicators.',
      },
      {
        name: 'Live Natural-Language Schedule Feedback',
        criterion: '4.1.3 Status Messages',
        requirement: 'Polite role="status" summary container announcing schedule changes',
        description:
          'Announces the updated human-readable cadence summary via role="status" with aria-live="polite" whenever any schedule parameter changes.',
      },
    ],
  },
  props: [
    {
      name: 'value',
      type: 'RecurrenceRule',
      defaultValue: 'undefined',
      description: 'Controlled recurrence rule configuration object.',
    },
    {
      name: 'defaultValue',
      type: 'RecurrenceRule',
      defaultValue: "{ frequency: 'weekly', interval: 1, weekdays: [1, 3, 5], monthDay: 1, hour: 9, minute: 0, endKind: 'never' }",
      description: 'Initial recurrence rule used when operating in uncontrolled mode.',
    },
    {
      name: 'onChange',
      type: '(rule: RecurrenceRule, cron: string, summary: string) => void',
      defaultValue: 'undefined',
      description:
        'Callback fired whenever any rule field updates with the normalized RecurrenceRule, 5-field cron string, and human-readable summary.',
    },
    {
      name: 'showCronPreview',
      type: 'boolean',
      defaultValue: 'true',
      description: 'Displays the monospace 5-field cron expression badge beside the human-readable summary.',
    },
    {
      name: 'label',
      type: 'string',
      defaultValue: "'Recurrence Schedule'",
      description: 'Visible title rendered in the optical slab header.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables all interactive schedule controls.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and inline optical style overrides.',
    },
  ],
  examples: [
    `<RecurrenceBuilder\n  onChange={(rule, cron, summary) => console.warn(rule, cron, summary)}\n/>`,
    `<RecurrenceBuilder\n  label="Digest Delivery"\n  showCronPreview={false}\n  defaultValue={{\n    frequency: 'weekly',\n    interval: 2,\n    weekdays: [2, 4],\n    monthDay: 1,\n    hour: 9,\n    minute: 0,\n    endKind: 'until',\n    untilDate: '2026-12-31',\n  }}\n/>`,
  ],
};
