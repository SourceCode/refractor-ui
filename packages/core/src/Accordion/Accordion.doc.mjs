export const docs = {
  name: 'Accordion',
  displayName: 'Accordion / Collapsible Panel',
  group: 'Data Display & Content',
  category: 'data-display',
  keywords: ['accordion', 'collapse', 'disclosure', 'faq', 'panel', 'expand'],
  usage: {
    description:
      'Vertically stacked optical crystal headers that expand or collapse to reveal detailed specifications while conserving vertical viewport space.',
    bestPractices: [
      { guidance: true, description: 'Use allowMultiple when users frequently compare adjacent sections such as FAQs or token specs.' },
      { guidance: true, description: 'Keep trigger titles scannable and self-explanatory.' },
      { guidance: false, description: 'Hide critical error messages inside collapsed accordion panels.' },
    ],
    accessibility: [
      {
        name: 'Disclosure pattern',
        criterion: '4.1.2 Name, Role, Value',
        requirement: 'aria-expanded, aria-controls, and labelled region panel',
        description: 'Each header renders a native button exposing aria-expanded and aria-controls linked to its role="region" content panel.',
      },
    ],
  },
  props: [
    { name: 'items', type: 'ReadonlyArray<AccordionItem>', defaultValue: 'required', description: 'Ordered array of collapsible section definitions.' },
    { name: 'allowMultiple', type: 'boolean', defaultValue: 'false', description: 'Permits multiple panels to remain expanded at the same time.' },
    { name: 'xstyle', type: 'OpticalStyleTokens', defaultValue: 'undefined', description: 'Typed CSS custom properties and style overrides.' },
  ],
  examples: [
    `<Accordion\n  allowMultiple\n  items={[\n    { id: '1', title: 'Optical Legibility', body: 'Paired frosted wells exceed 4.5:1 WCAG AA contrast.' },\n  ]}\n/>`,
  ],
};
