export const docs = {
  name: 'ClockCalendarPopover',
  displayName: 'Clock Calendar Popover',
  group: 'System Tray & Control Center',
  category: 'system-tray-control-center',
  keywords: [
    'clock',
    'calendar',
    'popover',
    'system-tray',
    'control-center',
    'agenda',
    'world-clock',
    'timezone',
    'utc',
    'schedule',
    'date-picker',
    'time',
  ],
  usage: {
    description:
      'Optical-glass system clock anchor and popover combining a deterministic UTC 42-day monthly calendar grid, selected-day agenda list, and secondary world-clock timezone readouts inside a `prism-slab` container. Features a responsive `flex-wrap` clock trigger pill (`aria-haspopup="dialog"`, `aria-expanded`) displaying a host-timezone-independent day and UTC time readout, Previous/Next month navigation across year boundaries, a Today reset shortcut, event indicator dots, IME-safe Arrow key date traversal, world-clock offset arithmetic with `Today`/`+1d`/`-1d` rollover badges and `UTC±HH:MM` pills, IME-safe `Escape` dismissal with focus restoration, and polite `aria-live="polite"` announcements.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use `ClockCalendarPopover` in desktop-style system bars, control centers, and global operations consoles where users inspect dates, daily agendas, and distributed team timezones simultaneously.',
      },
      {
        guidance: true,
        description:
          'Pass a deterministic UTC ISO timestamp via `referenceUtcIso` in SSR, snapshots, and multi-region dashboards to eliminate host-timezone rendering drift.',
      },
      {
        guidance: false,
        description:
          'Do not rely on local host `Date` formatting when supplying `agendaItems` — always provide canonical `YYYY-MM-DD` `dateIso` keys so calendar dots and agenda panels remain aligned across timezones.',
      },
    ],
    accessibility: [
      {
        name: 'Dialog Trigger, Pressed Day Buttons & Empty Agenda Status',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Exposes `aria-haspopup="dialog"`, `aria-expanded`, and `aria-controls` on the system clock trigger button, renders calendar dates as `<button>` elements with `aria-pressed`, `aria-current="date"` on today, descriptive `aria-label` values, and uses `role="status"` for empty-agenda feedback',
        description:
          'Ensures screen-reader and keyboard users understand popover state, active date selection, today indicator, event counts per date, and empty-day agenda state.',
      },
      {
        name: 'IME-Safe Arrow Traversal, Escape Focus Restoration & Live Announcements',
        criterion: '2.4.7 Focus Visible & 4.1.3 Status Messages',
        requirement:
          'Guards Arrow key calendar navigation and `Escape` dismissal against IME composition (`isComposing`), restores focus to the clock trigger button on `Escape`, applies `.prism-focus-ring` (`:focus-visible`) to every interactive control, and announces month/date/popover updates via `aria-live="polite"`',
        description:
          'Prevents accidental dismissal or navigation during IME input while maintaining predictable keyboard focus and screen-reader feedback.',
      },
    ],
  },
  props: [
    {
      name: 'referenceUtcIso',
      type: 'string',
      defaultValue: "'2026-11-22T18:30:00Z'",
      description:
        'Deterministic UTC ISO 8601 reference timestamp used for the clock trigger pill, Today highlight, and world-clock offset arithmetic. Falls back safely to the default if invalid.',
    },
    {
      name: 'worldClocks',
      type: 'ReadonlyArray<WorldClockZoneSpec>',
      defaultValue: 'San Francisco (-480), London (0), Tokyo (+540)',
      description:
        'Secondary world-clock zones formatted strictly via UTC offset arithmetic with local `HH:MM`, day delta (`Today`, `+1d`, `-1d`), and `UTC±HH:MM` offset pills.',
    },
    {
      name: 'agendaItems',
      type: 'ReadonlyArray<ClockAgendaItem>',
      defaultValue: '4 sample events across 2026-11-22 and 2026-11-23',
      description:
        'Scheduled events matched by `dateIso` (`YYYY-MM-DD`) to render calendar dot indicators and the selected-day agenda list.',
    },
    {
      name: 'open',
      type: 'boolean',
      defaultValue: 'undefined',
      description:
        'Controlled open state of the calendar and world-clock popover; pair with `onOpenChange`.',
    },
    {
      name: 'defaultOpen',
      type: 'boolean',
      defaultValue: 'true',
      description:
        'Initial uncontrolled open state of the popover when `open` is omitted.',
    },
    {
      name: 'selectedDateIso',
      type: 'string',
      defaultValue: 'undefined',
      description:
        'Controlled selected calendar date in `YYYY-MM-DD` format; pair with `onSelectDate`.',
    },
    {
      name: 'defaultSelectedDateIso',
      type: 'string',
      defaultValue: 'UTC date of referenceUtcIso',
      description:
        'Initial uncontrolled selected calendar date in `YYYY-MM-DD` format.',
    },
    {
      name: 'onOpenChange',
      type: '(open: boolean) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked whenever the popover opens or closes via trigger toggle or Escape dismissal.',
    },
    {
      name: 'onSelectDate',
      type: '(dateIso: string) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked with the selected `YYYY-MM-DD` ISO date string whenever a day cell, arrow key, or Today button changes selection.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Disables the system clock trigger button and suppresses opening the popover panel.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description:
        'Typed `--prism-*` CSS custom property and optical style overrides.',
    },
  ],
  examples: [
    `<ClockCalendarPopover\n  referenceUtcIso="2026-11-22T18:30:00Z"\n  onSelectDate={(dateIso) => console.warn(dateIso)}\n/>`,
    `<ClockCalendarPopover\n  referenceUtcIso="2026-11-22T02:15:00Z"\n  defaultOpen\n  worldClocks={[\n    { id: 'sf', city: 'San Francisco', abbr: 'PST', utcOffsetMinutes: -480 },\n    { id: 'kolkata', city: 'Kolkata', abbr: 'IST', utcOffsetMinutes: 330 },\n    { id: 'tokyo', city: 'Tokyo', abbr: 'JST', utcOffsetMinutes: 540 },\n  ]}\n/>`,
  ],
};

export default docs;
