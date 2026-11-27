export const docs = {
  name: 'OpticalCard',
  displayName: 'Optical Card (Compound API)',
  group: 'Optical Material, A11y & Composition',
  category: 'optical-material-a11y-dx',
  keywords: ['compound', 'card', 'prism-edge', 'header', 'footer', 'material', 'density'],
  usage: {
    description:
      'Structured compound component API (`<OpticalCard.Root>`, `<OpticalCard.PrismEdge>`, `<OpticalCard.Header>`, `<OpticalCard.Body>`, `<OpticalCard.Footer>`) sharing material tier and density context cleanly without 40-prop mega-components.',
    bestPractices: [
      {
        guidance: true,
        description: 'Compose only the sub-parts needed for your layout; `PrismEdge`, `Header`, `Body`, and `Footer` automatically inherit `material` and `density` from `Root`.',
      },
      {
        guidance: false,
        description: 'Keep `PrismEdge` decorative (`aria-hidden="true"`) and place headings inside `OpticalCard.Header`.',
      },
    ],
    accessibility: [
      {
        name: 'Semantic Article Landmark & Decorative Edge',
        criterion: '1.3.1 Info and Relationships',
        requirement:
          'Renders `<article>` at the root and marks `OpticalCard.PrismEdge` `aria-hidden="true"`.',
        description: 'Gives screen readers clean document structure.',
      },
    ],
  },
  props: [
    { name: 'material', type: "'wafer' | 'lens' | 'prism'", defaultValue: "'lens'", description: 'Shared optical glass grade inherited by sub-parts.' },
    { name: 'density', type: "'compact' | 'comfortable' | 'touch'", defaultValue: "'comfortable'", description: 'Shared padding and typography density mode.' },
  ],
};
