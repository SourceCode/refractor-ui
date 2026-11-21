export const docs = {
  name: 'SkeletonLoader',
  displayName: 'Skeleton Loader',
  group: 'Feedback & System Status',
  category: 'feedback-status',
  keywords: ['skeleton', 'loader', 'placeholder', 'shimmer', 'pulse', 'loading'],
  usage: {
    description:
      'Animated frosted placeholder shapes matching upcoming card layout geometry until asynchronous data resolves.',
    bestPractices: [
      { guidance: true, description: 'Wrap resolved card content with SkeletonLoader so layout geometry stays stable on load.' },
      { guidance: true, description: 'Use SkeletonLoader for structured content previews rather than blocking spinners.' },
      { guidance: false, description: 'Keep aria-busy placeholders displayed indefinitely without an error or timeout fallback.' },
    ],
    accessibility: [
      {
        name: 'Busy region state',
        criterion: '4.1.3 Status Messages',
        requirement: 'aria-busy="true" and descriptive aria-label during placeholder rendering',
        description: 'Signals active asynchronous loading and clears aria-busy automatically once resolved children appear.',
      },
    ],
  },
  props: [
    { name: 'loading', type: 'boolean', defaultValue: 'required', description: 'Toggles between animated optical placeholder and resolved children.' },
    { name: 'children', type: 'ReactNode', defaultValue: 'undefined', description: 'Content rendered when loading is false.' },
    { name: 'xstyle', type: 'OpticalStyleTokens', defaultValue: 'undefined', description: 'Typed CSS custom properties and style overrides.' },
  ],
  examples: [
    `<SkeletonLoader loading={isLoading}>\n  <ResolvedProfileCard />\n</SkeletonLoader>`,
  ],
};
