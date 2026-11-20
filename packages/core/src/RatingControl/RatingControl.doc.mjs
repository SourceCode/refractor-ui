export const docs = {
  name: 'RatingControl',
  displayName: 'Rating Control',
  group: 'Form Inputs & Selection Controls',
  category: 'form-inputs',
  keywords: ['rating', 'stars', 'score', 'review', 'feedback', 'clarity'],
  usage: {
    description:
      'Selectable row of warm amber optical stars inside a crystal pill with hover preview and tabular score readout.',
    bestPractices: [
      { guidance: true, description: 'Use a 5-star scale by default for intuitive optical clarity and quality scoring.' },
      { guidance: true, description: 'Keep the tabular numeric readout visible alongside icons for immediate precision.' },
      { guidance: false, description: 'Exceed 10 stars in a single pill; use RangeSlider for wide numeric ranges.' },
    ],
    accessibility: [
      {
        name: 'Accessible star buttons',
        criterion: '4.1.2 Name, Role, Value',
        requirement: 'Each star button exposes "Rate N out of M stars" and aria-pressed state',
        description: 'Grouped with role="group" and keyboard-only focus rings via prism-focus-ring.',
      },
    ],
  },
  props: [
    { name: 'value', type: 'number', defaultValue: 'required', description: 'Current score clamped between 0 and max.' },
    { name: 'max', type: 'number', defaultValue: '5', description: 'Total number of selectable stars (clamped 1 to 20).' },
    { name: 'onChange', type: '(rating: number) => void', defaultValue: 'required', description: 'Callback fired when a star is pressed.' },
    { name: 'label', type: 'string', defaultValue: "'Optical Clarity Score'", description: 'Visible caption rendered above the star pill.' },
    { name: 'disabled', type: 'boolean', defaultValue: 'false', description: 'Disables hover previews and clicks.' },
    { name: 'xstyle', type: 'OpticalStyleTokens', defaultValue: 'undefined', description: 'Typed CSS custom properties and style overrides.' },
  ],
  examples: [
    `<RatingControl value={score} onChange={setScore} />`,
  ],
};
