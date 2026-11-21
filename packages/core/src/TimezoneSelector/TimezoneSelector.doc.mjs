export const docs = {
  name: 'TimezoneSelector',
  displayName: 'Timezone Selector',
  group: 'Date, Time & Scheduling Fields',
  category: 'date-time-scheduling',
  keywords: [
    'timezone',
    'iana',
    'utc',
    'offset',
    'clock',
    'region',
    'schedule',
    'selector',
    'combobox',
    'time',
  ],
  usage: {
    description:
      'Optical-glass IANA timezone selector featuring a crystal trigger displaying the active zone label, UTC offset pill, and live 24-hour local clock alongside a searchable prism-slab dropdown listbox with case-insensitive filtering across IANA ID, label, region, and UTC offset.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Store canonical IANA timezone identifiers (such as "America/Los_Angeles" or "Europe/London") rather than fixed UTC offsets so daylight saving transitions remain accurate year-round.',
      },
      {
        guidance: true,
        description:
          'Pass referenceTimestamp in scheduling workflows or snapshot tests to render deterministic synchronized clocks across every listed region.',
      },
      {
        guidance: false,
        description:
          'Throw unhandled RangeError exceptions when displaying external user timezone strings; rely on formatTimezoneNow() which gracefully returns "--:--" for unrecognized zones.',
      },
    ],
    accessibility: [
      {
        name: 'Expandable Listbox & Search Combobox Semantics',
        criterion: '4.1.2 Name, Role, Value & 1.3.1 Info and Relationships',
        requirement:
          'Trigger declares aria-expanded, aria-haspopup="listbox", and aria-controls; search input exposes role="combobox" and aria-activedescendant linked to role="option" buttons',
        description:
          'Communicates expansion, active keyboard focus, and selected timezone state clearly across screen readers and keyboard-only sessions.',
      },
      {
        name: 'IME-Safe Keyboard Navigation & Dismissal',
        criterion: '2.1.1 Keyboard & 2.4.7 Focus Visible',
        requirement:
          'ArrowDown/ArrowUp cycling, !e.nativeEvent.isComposing Enter selection, non-composing Escape & outside-click dismissal, and keyboard-only focus outlines',
        description:
          'Lets users search and select any global timezone entirely from the keyboard without interfering with IME text composition.',
      },
    ],
  },
  props: [
    {
      name: 'value',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Controlled IANA timezone identifier.',
    },
    {
      name: 'defaultValue',
      type: 'string',
      defaultValue: "'America/Los_Angeles'",
      description: 'Initial IANA timezone identifier in uncontrolled mode.',
    },
    {
      name: 'onChange',
      type: '(tzId: string, entry: TimezoneEntry) => void',
      defaultValue: 'undefined',
      description: 'Callback fired with the selected timezone ID and full TimezoneEntry record.',
    },
    {
      name: 'timezones',
      type: 'TimezoneEntry[]',
      defaultValue: 'DEFAULT_TIMEZONES (15 global zones)',
      description: 'Selectable timezone catalog containing id, label, region, and offsetLabel.',
    },
    {
      name: 'referenceTimestamp',
      type: 'number',
      defaultValue: 'undefined',
      description: 'Optional epoch timestamp in milliseconds used to compute live local times.',
    },
    {
      name: 'defaultOpen',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Controls whether the timezone dropdown starts expanded.',
    },
    {
      name: 'label',
      type: 'string',
      defaultValue: "'Timezone'",
      description: 'Visible field label rendered above the crystal trigger.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables opening the dropdown and selecting a timezone.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and style overrides.',
    },
  ],
  examples: [
    `<TimezoneSelector\n  label="Meeting Timezone"\n  defaultValue="America/Los_Angeles"\n  onChange={(tzId, entry) => console.warn(tzId, entry.offsetLabel)}\n/>`,
  ],
};
