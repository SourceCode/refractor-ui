export const docs = {
  name: 'Timeline',
  displayName: 'Timeline',
  group: 'Data Display & Content',
  category: 'data-display',
  keywords: ['timeline', 'history', 'audit', 'milestones', 'chronological', 'steps'],
  usage: {
    description:
      'Chronological vertical sequence of release, audit, or workflow milestones rendered with numbered refractive glass markers and subtle connecting rules.',
    bestPractices: [
      { guidance: true, description: 'Order entries consistently in chronological or reverse-chronological sequence.' },
      { guidance: true, description: 'Use tone ("emerald" | "cobalt" | "amber") to visually distinguish milestone categories.' },
      { guidance: false, description: 'Use Timeline for interactive multi-step forms; use Stepper instead.' },
    ],
    accessibility: [
      {
        name: 'Ordered list semantics',
        criterion: '1.3.1 Info and Relationships',
        requirement: 'Semantic <ol> / <li> sequence with decorative rules hidden from assistive tech',
        description: 'Timeline renders as a semantic ordered list while vertical connector hairlines and dot separators use aria-hidden="true".',
      },
    ],
  },
  props: [
    { name: 'entries', type: 'ReadonlyArray<TimelineEntry>', defaultValue: 'required', description: 'Ordered array of timeline milestone entries.' },
    { name: 'xstyle', type: 'OpticalStyleTokens', defaultValue: 'undefined', description: 'Typed CSS custom properties and style overrides.' },
  ],
  examples: [
    `<Timeline\n  entries={[\n    { id: 't1', timestamp: '09:15 AM', title: 'Token Calibration', detail: 'Established specular curves.', tone: 'emerald' },\n  ]}\n/>`,
  ],
};
