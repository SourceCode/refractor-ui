export const docs = {
  name: 'CombinedDateTimePicker',
  displayName: 'Combined Date & Time Picker',
  group: 'Date, Time & Scheduling Fields',
  category: 'date-time-scheduling',
  keywords: [
    'date',
    'time',
    'datetime',
    'combined',
    'calendar',
    'clock',
    '12h',
    '24h',
    'schedule',
    'timestamp',
  ],
  usage: {
    description:
      'Unified optical-glass slab combining a navigable calendar month grid with tabular hour/minute steppers, optional 12-hour AM/PM toggle, quick time presets, and a live formatted timestamp readout badge.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Store and pass values in ISO local date-time format (YYYY-MM-DDTHH:mm) so date selection and time stepping compose deterministically.',
      },
      {
        guidance: true,
        description:
          'Configure minuteStep (1..30) to match booking intervals such as 5, 10, or 15 minutes for faster keyboard and pointer scheduling.',
      },
      {
        guidance: false,
        description:
          'Assume consumer input strings are always well-formed; CombinedDateTimePicker safely falls back to 2026-11-21T09:30 on malformed timestamps without throwing.',
      },
    ],
    accessibility: [
      {
        name: 'Accessible Calendar & Stepper Controls',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement: 'Explicit aria-label on navigation/stepper controls, aria-pressed on active day/meridiem/presets, prism-focus-ring',
        description:
          'Every day button, month arrow, hour/minute stepper, AM/PM toggle, and quick preset exposes clear accessible names, keyboard-only focus rings, and disabled cursor parity.',
      },
      {
        name: 'Polite Timestamp Announcements',
        criterion: '4.1.3 Status Messages',
        requirement: 'role="status" aria-live="polite" aria-atomic="true" live region',
        description:
          'Announces updated date and time values in the active 12h or 24h clock format without moving keyboard focus.',
      },
    ],
  },
  props: [
    {
      name: 'value',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Controlled ISO local date-time string (`YYYY-MM-DDTHH:mm`).',
    },
    {
      name: 'defaultValue',
      type: 'string',
      defaultValue: "'2026-11-21T09:30'",
      description: 'Initial date-time string when operating in uncontrolled mode.',
    },
    {
      name: 'onChange',
      type: '(iso: string) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked with the new `YYYY-MM-DDTHH:mm` string on every change.',
    },
    {
      name: 'clockFormat',
      type: "'12h' | '24h'",
      defaultValue: "'24h'",
      description: 'Displays either 24-hour (`09:30`) or 12-hour (`9:30 AM`) formatting with AM/PM toggle.',
    },
    {
      name: 'minuteStep',
      type: 'number',
      defaultValue: '5',
      description: 'Minute increment/decrement step clamped between 1 and 30.',
    },
    {
      name: 'label',
      type: 'string',
      defaultValue: "'Date & Time'",
      description: 'Visible heading label rendered in the optical slab header.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables calendar navigation, day cells, steppers, AM/PM toggle, and quick presets.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and style overrides.',
    },
  ],
  examples: [
    `<CombinedDateTimePicker\n  label="Release Window"\n  defaultValue="2026-11-21T09:30"\n  clockFormat="12h"\n  minuteStep={15}\n  onChange={(iso) => setReleaseAt(iso)}\n/>`,
  ],
};
