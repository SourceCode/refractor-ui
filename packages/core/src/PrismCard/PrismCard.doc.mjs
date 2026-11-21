export const docs = {
  name: 'PrismCard',
  displayName: 'Card',
  group: 'Data Display & Content',
  category: 'data-display',
  keywords: ['card', 'slab', 'surface', 'container', 'panel', 'optical', 'crystal'],
  usage: {
    description:
      'Self-contained thick optical crystal slab with diagonal specular reflection and edge dispersion for grouping related content or rendering a sculptural specimen.',
    bestPractices: [
      { guidance: true, description: 'Use kicker, title, body, and footer slots to maintain predictable card rhythm.' },
      { guidance: true, description: 'Use specimenSlab for decorative material swatches or surface showcase cards.' },
      { guidance: false, description: 'Nest multiple full-elevation PrismCards deeply inside one another.' },
    ],
    accessibility: [
      {
        name: 'Semantic landmark structure',
        criterion: '1.3.1 Info and Relationships',
        requirement: 'Article container & decorative exclusions',
        description: 'Structured cards render as <article> elements while purely decorative specular overlays carry aria-hidden="true".',
      },
    ],
  },
  props: [
    { name: 'title', type: 'string', defaultValue: 'undefined', description: 'Optional card heading or specimen corner label.' },
    { name: 'kicker', type: 'string', defaultValue: 'undefined', description: 'Optional metadata eyebrow displayed above the title.' },
    { name: 'children', type: 'ReactNode', defaultValue: 'undefined', description: 'Primary body content inside the optical slab.' },
    { name: 'footer', type: 'ReactNode', defaultValue: 'undefined', description: 'Optional bottom action bar below a subtle divider.' },
    { name: 'specimenSlab', type: 'boolean', defaultValue: 'false', description: 'Renders the sculptural optical glass slab specimen.' },
    { name: 'xstyle', type: 'OpticalStyleTokens', defaultValue: 'undefined', description: 'Typed CSS custom properties and style overrides.' },
  ],
  examples: [
    `<PrismCard title="Optical Surface Architecture" kicker="Design Token">\n  Multi-layered refractive glass container with 24px radius.\n</PrismCard>`,
    `<PrismCard specimenSlab title="Card" />`,
  ],
};
