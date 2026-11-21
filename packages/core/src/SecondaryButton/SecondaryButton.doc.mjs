export const docs = {
  name: 'SecondaryButton',
  displayName: 'Secondary Action Button',
  group: 'Buttons & Actions',
  category: 'buttons-actions',
  keywords: ['button', 'secondary', 'crystal', 'cobalt', 'action', 'refractive'],
  usage: {
    description:
      'A medium-emphasis optical glass capsule button available in cool frosted crystal or cobalt sapphire tones to complement PrimaryButton actions.',
    bestPractices: [
      { guidance: true, description: 'Pair SecondaryButton alongside PrimaryButton for supporting actions like "Cancel", "Preview", or "Export".' },
      { guidance: true, description: 'Use the cobalt tone for high-clarity informational or secondary navigation calls to action.' },
      { guidance: false, description: 'Use SecondaryButton without visible text; use IconButton with an aria-label for icon-only controls.' },
    ],
    accessibility: [
      {
        name: 'Text contrast',
        criterion: '1.4.3 Contrast (Minimum)',
        requirement: '4.5:1',
        description: 'Crystal and cobalt surfaces derive text colors from --prism-secondary-contrast and --prism-info-contrast for >= 4.5:1 readability.',
      },
      {
        name: 'Keyboard focus indicator',
        criterion: '2.4.7 Focus Visible',
        requirement: 'Visible focus ring on keyboard navigation',
        description: 'Uses prism-focus-ring (:focus-visible) so pointer clicks remain clean while keyboard focus is clearly outlined.',
      },
    ],
  },
  props: [
    { name: 'size', type: "'sm' | 'md' | 'lg'", defaultValue: "'md'", description: 'Controls capsule height and horizontal padding.' },
    { name: 'tone', type: "'crystal' | 'cobalt'", defaultValue: "'crystal'", description: 'Switches between cool crystal glass and cobalt sapphire surfaces.' },
    { name: 'leadingIcon', type: 'ReactNode', defaultValue: 'undefined', description: 'Optional icon rendered before the label.' },
    { name: 'trailingIcon', type: 'ReactNode', defaultValue: 'undefined', description: 'Optional icon rendered after the label.' },
    { name: 'disabled', type: 'boolean', defaultValue: 'false', description: 'Disables pointer interaction and reduces optical prominence.' },
    { name: 'xstyle', type: 'OpticalStyleTokens', defaultValue: 'undefined', description: 'Typed CSS custom properties and style overrides.' },
  ],
  examples: [
    `<SecondaryButton size="md" tone="crystal" onClick={handlePreview}>\n  Preview glass\n</SecondaryButton>`,
    `<SecondaryButton size="sm" tone="cobalt" onClick={handleExport}>\n  Export tokens\n</SecondaryButton>`,
  ],
};
