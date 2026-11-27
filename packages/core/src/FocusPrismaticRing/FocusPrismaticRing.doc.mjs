export const docs = {
  name: 'FocusPrismaticRing',
  displayName: 'Focus Prismatic Ring',
  group: 'Optical Material, A11y & Composition',
  category: 'optical-material-a11y-dx',
  keywords: ['focus-visible', 'a11y', 'keyboard', 'prismatic-ring', 'double-ring', 'contrast'],
  usage: {
    description:
      'High-contrast double-ring keyboard `:focus-visible` indicator (inner dark keyline + outer luminous prismatic halo) guaranteed to remain visible over both bright and dark glass backgrounds.',
    bestPractices: [
      {
        guidance: true,
        description: 'Apply `.prism-focus-prismatic` or wrap custom focusable surfaces in `<FocusPrismaticRing>` for consistent WCAG 2.4.11 Focus Appearance.',
      },
      {
        guidance: false,
        description: 'Leave `forceVisible` false in production so pointer clicks never show distracting keyboard focus rings.',
      },
    ],
    accessibility: [
      {
        name: 'Dual-Polarity Keyboard Focus Ring',
        criterion: '2.4.7 Focus Visible & 2.4.11 Focus Appearance',
        requirement:
          'Pairs a 2px dark inner keyline with a 4.5px luminous outer halo exclusively on `:focus-visible`.',
        description: 'Guarantees >= 3:1 focus indicator contrast over any wallpaper or glass surface.',
      },
    ],
  },
  props: [
    { name: 'radius', type: "'md' | 'lg' | 'xl' | 'full'", defaultValue: "'lg'", description: 'Corner radius matching the wrapped interactive element.' },
    { name: 'forceVisible', type: 'boolean', defaultValue: 'false', description: 'Forces the double ring visible for visual verification.' },
  ],
};
