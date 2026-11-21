export const docs = {
  name: 'DateTimePicker',
  displayName: 'Date & Time Picker',
  group: 'Form Inputs & Selection Controls',
  category: 'form-inputs',
  keywords: ['date', 'time', 'calendar', 'picker', 'schedule', 'slot'],
  usage: {
    description:
      'Interactive calendar month grid and time-slot selector inside an expandable optical crystal slab.',
    bestPractices: [
      { guidance: true, description: 'Pass ISO 8601 date strings (YYYY-MM-DD) to keep date state unambiguous across locales.' },
      { guidance: true, description: 'Always surface the active timezone alongside selectable time slots.' },
      { guidance: false, description: 'Use DateTimePicker for distant historical dates such as birth years without a year selector.' },
    ],
    accessibility: [
      {
        name: 'Expandable dialog disclosure',
        criterion: '4.1.2 Name, Role, Value',
        requirement: 'Trigger exposes aria-expanded/aria-haspopup and supports Escape dismissal',
        description: 'Each calendar day and time slot exposes explicit aria-label/aria-pressed states with keyboard-only focus rings.',
      },
    ],
  },
  props: [
    { name: 'dateIso', type: 'string', defaultValue: 'required', description: 'ISO 8601 date string (YYYY-MM-DD).' },
    { name: 'timeSlot', type: 'string', defaultValue: 'required', description: 'Formatted active time slot label.' },
    { name: 'onChangeDate', type: '(dateIso: string) => void', defaultValue: 'required', description: 'Invoked when a calendar day is clicked.' },
    { name: 'onChangeTime', type: '(timeSlot: string) => void', defaultValue: 'required', description: 'Invoked when a time slot pill is clicked.' },
    { name: 'year', type: 'number', defaultValue: '2026', description: 'Calendar year used to construct the month grid.' },
    { name: 'month', type: 'number', defaultValue: '10', description: 'Zero-indexed calendar month (10 = November).' },
    { name: 'monthLabel', type: 'string', defaultValue: "'November 2026'", description: 'Header text displayed above the weekday row.' },
    { name: 'timezoneLabel', type: 'string', defaultValue: "'UTC-8'", description: 'Timezone caption displayed opposite the month heading.' },
    { name: 'timeSlots', type: 'ReadonlyArray<string>', defaultValue: "['09:00 AM', ...]", description: 'Selectable time slot buttons.' },
    { name: 'disabled', type: 'boolean', defaultValue: 'false', description: 'Disables opening the calendar slab.' },
    { name: 'xstyle', type: 'OpticalStyleTokens', defaultValue: 'undefined', description: 'Typed CSS custom properties and style overrides.' },
  ],
  examples: [
    `<DateTimePicker\n  dateIso={date}\n  timeSlot={time}\n  onChangeDate={setDate}\n  onChangeTime={setTime}\n/>`,
  ],
};
