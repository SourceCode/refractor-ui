export const docs = {
  name: 'MotionStudio',
  displayName: 'Motion Studio',
  group: 'Animated Media & Motion Tooling',
  category: 'animated-media-tooling',
  keywords: ['motion-studio', 'spring', 'easing', 'linear()', 'timeline', 'editor', 'tokens'],
  usage: {
    description:
      'Visual timeline and spring transition editor for tuning `stiffness`, `damping`, `mass`, and semantic `motion.theme.ts` tokens live with an SVG curve graph and compiled CSS `linear()` code export.',
    bestPractices: [
      {
        guidance: true,
        description: 'Use `onConfigChange` to persist tuned spring values straight back into your application `createMotionTheme()` overrides.',
      },
      {
        guidance: false,
        description: 'Avoid shipping `MotionStudio` inside customer-facing production forms unless gated behind a developer tools drawer.',
      },
    ],
    accessibility: [
      {
        name: 'Labeled Range Sliders & Semantic Region',
        criterion: '1.3.1 Info and Relationships',
        requirement:
          'Every physics slider exposes explicit accessible labels and numeric readouts, and the SVG curve graph carries `role="img"`.',
        description: 'Supports full keyboard-driven curve tuning.',
      },
    ],
  },
  props: [
    { name: 'initialToken', type: "'snap' | 'ui' | 'gentle' | 'lively' | 'ambient'", defaultValue: "'ui'", description: 'Initial semantic motion preset.' },
    { name: 'onConfigChange', type: '(config: SpringPhysicsConfig, cssLinear: string) => void', defaultValue: 'undefined', description: 'Callback fired when spring parameters change.' },
  ],
};
