export const docs = {
  name: 'PrimaryButton',
  displayName: 'Primary Action Button',
  group: 'Buttons & Actions',
  category: 'buttons-actions',
  keywords: ['button', 'primary', 'cta', 'action', 'submit', 'refractive'],
  usage: {
    description:
      'The highest-emphasis optical glass capsule button used to trigger primary goals such as starting a project or saving changes.',
    bestPractices: [
      { guidance: true, description: 'Reserve PrimaryButton for the single primary call to action in a view.' },
      { guidance: true, description: 'Use action-oriented verbs ("Start project", "Save changes").' },
      { guidance: false, description: 'Place multiple competing PrimaryButtons side-by-side in the same toolbar.' },
    ],
    accessibility: [
      {
        name: 'Text contrast',
        criterion: '1.4.3 Contrast (Minimum)',
        requirement: '4.5:1',
        description: 'Foreground text uses --prism-primary-contrast derived automatically for >= 4.5:1 contrast.',
      },
    ],
  },
  props: [
    { name: 'size', type: "'sm' | 'md' | 'lg'", defaultValue: "'md'", description: 'Controls capsule height and horizontal padding.' },
    { name: 'leadingIcon', type: 'ReactNode', defaultValue: 'undefined', description: 'Optional icon rendered before the label.' },
    { name: 'trailingIcon', type: 'ReactNode', defaultValue: 'undefined', description: 'Optional icon rendered after the label.' },
    { name: 'disabled', type: 'boolean', defaultValue: 'false', description: 'Disables pointer interaction and dims optical glow.' },
    { name: 'xstyle', type: 'OpticalStyleTokens', defaultValue: 'undefined', description: 'Typed CSS custom properties and style overrides.' },
  ],
  examples: [
    `<PrimaryButton size="md" onClick={handleStart}>\n  Start project\n</PrimaryButton>`,
  ],
};
