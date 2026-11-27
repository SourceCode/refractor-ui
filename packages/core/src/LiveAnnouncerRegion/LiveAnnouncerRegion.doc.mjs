export const docs = {
  name: 'LiveAnnouncerRegion',
  displayName: 'Live Announcer Region',
  group: 'Optical Material, A11y & Composition',
  category: 'optical-material-a11y-dx',
  keywords: ['a11y', 'aria-live', 'screen-reader', 'polite', 'assertive', 'announcer'],
  usage: {
    description:
      'Dedicated `polite` and `assertive` screen-reader ARIA live regions with duplicate-message nudging for streaming AI tokens, toast notifications, file transfer completions, and validation errors.',
    bestPractices: [
      {
        guidance: true,
        description: 'Mount `<LiveAnnouncerProvider>` once near your app root and call `useLiveAnnouncer().announce(...)` from async handlers.',
      },
      {
        guidance: false,
        description: 'Reserve `assertive` strictly for urgent blocking errors so polite announcements are not interrupted.',
      },
    ],
    accessibility: [
      {
        name: 'Dual Polite & Assertive Live Channels',
        criterion: '4.1.3 Status Messages',
        requirement:
          'Renders `role="status" aria-live="polite" aria-atomic="true"` and `role="alert" aria-live="assertive" aria-atomic="true"` regions.',
        description: 'Communicates dynamic UI changes reliably across NVDA, VoiceOver, and JAWS.',
      },
    ],
  },
  props: [
    { name: 'politeMessage', type: 'string', defaultValue: "''", description: 'Current polite announcement text.' },
    { name: 'assertiveMessage', type: 'string', defaultValue: "''", description: 'Current assertive alert text.' },
    { name: 'visible', type: 'boolean', defaultValue: 'false', description: 'Renders visible preview instead of sr-only.' },
  ],
};
