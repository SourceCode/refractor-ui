export const docs = {
  name: 'CalendarView',
  displayName: 'Calendar View',
  group: 'Data Display & Content',
  category: 'data-display',
  keywords: ['calendar', 'month', 'schedule', 'events', 'milestones', 'dates'],
  usage: {
    description:
      'Interactive optical month grid displaying scheduled milestones with inline date inspection and IME-safe quick event creation.',
    bestPractices: [
      { guidance: true, description: 'Use ISO 8601 date strings (YYYY-MM-DD) for event dateIso fields and initialSelectedDate.' },
      { guidance: true, description: 'Provide onAddEvent when users should schedule new milestones directly in the calendar footer.' },
      { guidance: false, description: 'Use CalendarView as a compact form date picker; use DateTimePicker instead.' },
    ],
    accessibility: [
      {
        name: 'Date selection and IME-safe input',
        criterion: '2.1.1 Keyboard',
        requirement: 'Keyboard-only focus rings, aria-pressed on date cells, and IME composition guard on milestone input',
        description: 'Each date cell is a native button with aria-pressed state and prism-focus-ring, while milestone input guards Enter during IME composition.',
      },
    ],
  },
  props: [
    { name: 'events', type: 'ReadonlyArray<CalendarEventItem>', defaultValue: 'required', description: 'Scheduled date entries.' },
    { name: 'onAddEvent', type: '(dateIso: string, title: string) => void', defaultValue: 'undefined', description: 'Invoked when a new milestone is submitted for the selected day.' },
    { name: 'year', type: 'number', defaultValue: '2026', description: 'Year rendered in the month grid.' },
    { name: 'month', type: 'number', defaultValue: '10', description: 'Zero-indexed month (0 = January, 10 = November).' },
    { name: 'initialSelectedDate', type: 'string', defaultValue: "'2026-11-20'", description: 'Initially selected ISO date.' },
  ],
  examples: [
    `<CalendarView\n  events={[{ id: '1', title: 'Accessibility Signoff', dateIso: '2026-11-20', timeLabel: '09:30 AM', category: 'Review' }]}\n  onAddEvent={scheduleMilestone}\n/>`,
  ],
};
