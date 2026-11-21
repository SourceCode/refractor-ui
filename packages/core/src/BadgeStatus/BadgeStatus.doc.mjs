export const docs = {
  name: 'BadgeStatus',
  displayName: 'Badge / Status Dot',
  group: 'Data Display & Content',
  category: 'data-display',
  keywords: ['badge', 'status', 'dot', 'counter', 'indicator', 'pill', 'notification'],
  usage: {
    description:
      'Numerical notification counter or semantic status indicator inside a clear optical crystal capsule, always paired with an explicit accessible label.',
    bestPractices: [
      { guidance: true, description: 'Always pair status colors with explicit descriptive labels so state is not conveyed by color alone.' },
      { guidance: true, description: 'Pass count for unread or queue totals, including 0 when zero items should remain visible.' },
      { guidance: false, description: 'Use BadgeStatus as a clickable filter toggle; use TagChip instead.' },
    ],
    accessibility: [
      {
        name: 'Use of color',
        criterion: '1.4.1 Use of Color',
        requirement: 'Text label paired with decorative status dot',
        description: 'Status dots carry aria-hidden="true" while the required label prop provides clear text context for all users.',
      },
    ],
  },
  props: [
    { name: 'label', type: 'string', defaultValue: 'required', description: 'Accessible text describing the status or counter.' },
    { name: 'count', type: 'number', defaultValue: 'undefined', description: 'Displays a tangerine tabular counter pill when defined.' },
    { name: 'tone', type: "'online' | 'warning' | 'offline' | 'counter'", defaultValue: "'online'", description: 'Semantic dot accent tone when count is omitted.' },
  ],
  examples: [
    `<BadgeStatus count={12} label="Unread reviews" />`,
    `<BadgeStatus tone="online" label="Storage synced" />`,
  ],
};
