export const docs = {
  name: 'RefractiveSkeleton',
  displayName: 'Refractive Glass Skeleton',
  group: 'Loaders, Skeletons & Data Transitions',
  category: 'loaders-skeletons-transitions',
  keywords: ['skeleton', 'loader', 'placeholder', 'shimmer', 'prismatic', 'glass', 'loading'],
  usage: {
    description:
      'Layout-matching frosted glass placeholder swept by an angled prismatic light wave across `card`, `profile`, `article`, `media`, and `metrics` presets, transitioning seamlessly to real children once `loading` completes.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Match `preset` and `lines` closely to the resolved content layout to prevent Cumulative Layout Shift (CLS) when data arrives.',
      },
      {
        guidance: false,
        description:
          'Avoid displaying raw empty containers while fetching; provide a descriptive `label` for assistive technology.',
      },
    ],
    accessibility: [
      {
        name: 'ARIA Busy Status & Reduced-Motion Wave',
        criterion: '4.1.3 Status Messages & 2.3.3 Animation from Interactions',
        requirement:
          'Announces loading via `role="status"`, `aria-busy="true"`, and `aria-label`, while decorative shimmer blocks remain `aria-hidden="true"` and pause automatically under `prefers-reduced-motion: reduce`.',
        description:
          'Communicates pending load state cleanly without flooding screen readers with empty nodes.',
      },
    ],
  },
  props: [
    { name: 'loading', type: 'boolean', defaultValue: 'true', description: 'Shows frosted skeleton placeholder when true, or renders children when false.' },
    { name: 'preset', type: "'card' | 'profile' | 'article' | 'media' | 'metrics'", defaultValue: "'card'", description: 'Structural placeholder geometry preset.' },
    { name: 'lines', type: 'number', defaultValue: '3', description: 'Number of placeholder text lines (clamped 1–8).' },
    { name: 'animated', type: 'boolean', defaultValue: 'true', description: 'Enables angled prismatic shimmer wave.' },
    { name: 'speedSeconds', type: 'number', defaultValue: '1.85', description: 'Light wave sweep duration in seconds (0.8–5).' },
  ],
};
